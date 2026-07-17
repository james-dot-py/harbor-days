// =====================================================================
//  GUARDED STORAGE + SAVE ADAPTER — the one place this game is allowed to
//  touch localStorage (task 078 grows the 077 flag door into the save blob).
//
//  History: constraint 5 ("no localStorage/sessionStorage") existed because
//  the game shipped as a claude.ai artifact, where localStorage ACCESS ITSELF
//  throws a SecurityError inside the sandboxed iframe. The owner's 2026-07-16
//  directive (persist progress; task 078) relaxes the constraint — but only
//  through this door, so the artifact context still degrades instead of dying.
//
//  THE CONTRACT (unchanged, now covering the save blob too):
//    * Feature-detect exactly ONCE, with a real write+read+remove probe —
//      `'localStorage' in window` is not enough (Safari private mode used to
//      expose the object and throw on setItem).
//    * NEVER throw. Every entry point is try/catch'd; a failure silently falls
//      back to the in-memory blob for the rest of the session.
//    * NEVER nag. A player with storage disabled gets a session-only game and
//      is told nothing — losing progress just means it does not carry over,
//      which is the friendly failure.
//
//  THE SAVE (one versioned JSON blob under `ope.save.v1`):
//    { v:1, dibs, bag, worn, favors, zones, counters, flags }
//    * getSave()   -> the live blob object (loaded lazily-once, synchronously).
//    * markDirty() -> debounced (~600 ms) JSON write through the guarded probe.
//    * flushSave() -> immediate write; also fired on pagehide / hidden.
//    * Bad JSON or an unknown `v` => a FRESH blob, silently.
//    * getFlag/setFlag are now VIEWS over save.flags[k] (077's onboarding keys
//      keep working unchanged); a fresh blob migrates the legacy raw flag keys
//      `ope.onboard.v1` / `ope.a2hs.v1` in (and removes them) once.
//
//  WHAT THE BLOB MAY NEVER HOLD: coordinates, world-layout anything, rng state,
//  session scratch (speedMult, the held item). ONLY names, ids and numbers —
//  so a save survives a map rework (084 moves the whole north shore). Packs
//  never touch storage directly; they go through the framework wallet/bag/
//  favors or the whitelisted state-counter snapshot.
// =====================================================================

let _ls = null, _probed = false;

// probe() -> the live Storage, or null if unavailable for ANY reason.
function probe() {
  if (_probed) return _ls;
  _probed = true;
  try {
    const k = '__ope_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    _ls = localStorage;
  } catch (e) { _ls = null; }   // sandboxed iframe / private mode / cookies off
  return _ls;
}

// raw guarded storage primitives — never throw.
function rawGet(k)    { try { const s = probe(); if (s) return s.getItem(k); } catch (e) { } return null; }
function rawSet(k, v) { try { const s = probe(); if (s) s.setItem(k, v); }    catch (e) { } }
function rawRemove(k) { try { const s = probe(); if (s) s.removeItem(k); }     catch (e) { } }

// ------------------------------- the save ------------------------------
const SAVE_KEY = 'ope.save.v1';               // storage key (constant; blob.v carries the SCHEMA version)
const SAVE_V = 2;                             // current schema version — bump + add a MIGRATIONS rung, never mutate live fields
                                              //   v2 (task 085): + settings{} (audio/camera/accessibility/low-power prefs)
const LEGACY_FLAG_KEYS = ['ope.onboard.v1', 'ope.a2hs.v1'];   // 077 raw flag keys, absorbed on first load

// schema migrations (task 082): MIGRATIONS[n] upgrades a v-n blob to v-(n+1).
// The contract for a future schema bump is "add a rung here, never rewrite live
// fields in place" — so an OLD save opens forward-compatibly instead of being
// silently discarded (which is what any v!=SAVE_V used to do). A blob whose
// version can't be walked all the way up to SAVE_V (a gap, or a FUTURE version a
// stale build can't understand) is treated as unrecoverable -> a fresh start.
const MIGRATIONS = {
  // 0 -> 1: the pre-versioned pilot shape. Nothing structural changed between the
  // unversioned draft and v1, so carry every field forward and stamp the version.
  // This is the proven STUB (tools/tmp-082-save.mjs exercises a v0 blob end to
  // end); a real future bump replaces the body with the actual field moves.
  0: (o) => { o.v = 1; return o; },
  // 1 -> 2 (task 085): add the settings bag. A v1 save (an existing player) opens
  // forward with an empty settings{} — so it inherits today's defaults, exactly
  // as intended; the settings card fills it in on first use.
  1: (o) => { o.v = 2; if (!o.settings || typeof o.settings !== 'object') o.settings = {}; return o; },
};

let _recovered = false;   // a save EXISTED but was unusable (bad JSON / a version
                          // we can't reach) and we started fresh — the framework
                          // shows ONE gentle toast on boot. A brand-new player
                          // (no save at all) never trips this: no save, no toast.

// walk a parsed blob up to SAVE_V through the MIGRATIONS chain; null if it can't
// get there (missing rung / future version / runaway).
function migrate(o) {
  let guard = 0;
  while (o && o.v < SAVE_V) {
    const step = MIGRATIONS[o.v];
    if (!step) return null;
    o = step(o);
    if (++guard > 64) return null;
  }
  return (o && o.v === SAVE_V) ? o : null;
}

function freshBlob() {
  return { v: SAVE_V, dibs: 0, bag: {}, worn: null, favors: {}, zones: [], counters: {}, flags: {}, settings: {} };
}

// coerce a parsed object into a well-formed blob (defends against a partial or
// hand-edited save without letting anything unexpected through).
function normalize(o) {
  const b = freshBlob();
  if (typeof o.dibs === 'number') b.dibs = o.dibs;
  if (o.bag && typeof o.bag === 'object') b.bag = o.bag;
  if (typeof o.worn === 'string' || o.worn === null) b.worn = o.worn;
  if (o.favors && typeof o.favors === 'object') b.favors = o.favors;
  if (Array.isArray(o.zones)) b.zones = o.zones;
  if (o.counters && typeof o.counters === 'object') b.counters = o.counters;
  if (o.flags && typeof o.flags === 'object') b.flags = o.flags;
  if (o.settings && typeof o.settings === 'object') b.settings = o.settings;   // task 085
  return b;
}

// first-load migration: pull 077's raw flag keys into save.flags, then remove
// them so this only ever happens once. All inside the never-throw guards.
function migrateLegacyFlags(b) {
  for (const k of LEGACY_FLAG_KEYS) {
    const v = rawGet(k);
    if (v !== null) { b.flags[k] = String(v); rawRemove(k); }
  }
}

let _save = null;

function load() {
  const raw = rawGet(SAVE_KEY);
  if (raw) {
    let o = null, badJson = false;
    try { o = JSON.parse(raw); } catch (e) { badJson = true; }   // bad JSON -> unrecoverable
    if (!badJson && o && typeof o === 'object' && Number.isInteger(o.v)) {
      if (o.v === SAVE_V) { _save = normalize(o); return; }
      if (o.v >= 0 && o.v < SAVE_V) {
        const up = migrate(o);
        if (up) { _save = normalize(up); writeNow(); return; }   // upgraded -> persist the new shape
      }
      // a FUTURE version or a gap in the chain: can't be trusted -> fresh start.
    }
    // a save was present but unusable (bad JSON / bad shape / bad version): the
    // framework will show one gentle toast; NEVER a crash, NEVER a nag beyond it.
    _recovered = true;
  }
  // missing / corrupt / unknown version: a fresh blob, migrating 077's flags in.
  _save = freshBlob();
  migrateLegacyFlags(_save);
  writeNow();         // persist the fresh (possibly migrated) blob best-effort
}

// wasSaveRecovered() -> true exactly once per boot when a stored save had to be
// discarded (bad JSON / unreachable version). The framework reads it after boot
// to show a single gentle "starting fresh" toast; a fresh player never sees it.
export function wasSaveRecovered() { return _recovered; }

// getSave() -> the live blob object. Loaded lazily-once, synchronously, on the
// first access (framework.js reads it at import time, before any pack runs).
export function getSave() { if (!_save) load(); return _save; }

// ------------------------------ persistence ----------------------------
let _dirtyTO = null;

function writeNow() {
  if (!_save) return;
  if (_dirtyTO) { clearTimeout(_dirtyTO); _dirtyTO = null; }
  rawSet(SAVE_KEY, JSON.stringify(_save));
}

// markDirty() : coalescing debounce — schedule one write ~600 ms out. Under a
// burst of changes this still guarantees a write within the window (a resetting
// debounce could starve). flushSave() forces it out immediately.
export function markDirty() {
  if (_dirtyTO || !_save) return;
  _dirtyTO = setTimeout(() => { _dirtyTO = null; writeNow(); }, 600);
}
export function flushSave() { writeNow(); }

// best-effort flush when the tab is backgrounded / torn down (mobile especially
// never fires a clean unload). Guarded — addEventListener always exists here,
// but a paranoid try keeps the module import itself unbreakable.
try {
  addEventListener('pagehide', flushSave);
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });
} catch (e) { }

// ------------------------------- flags ---------------------------------
// getFlag/setFlag are VIEWS over save.flags — 077's onboarding passes the same
// string keys (e.g. 'ope.onboard.v1') and keeps working unchanged.

// getFlag(key) -> string | null
export function getFlag(k) {
  const f = getSave().flags;
  return (k in f) ? String(f[k]) : null;
}

// setFlag(key, value) : writes into the blob and marks it dirty (the blob is the
// in-memory fallback too, so a same-session read is always correct).
export function setFlag(k, v) {
  getSave().flags[k] = String(v);
  markDirty();
}

// storageAvailable() -> bool. Debug/tooling only (the game never branches on
// it — that would be a nag with extra steps).
export function storageAvailable() { return !!probe(); }
