// =====================================================================
//  GUARDED STORAGE — the one place this game is allowed to touch
//  localStorage, and the contract task 078's save adapter absorbs.
//
//  History: constraint 5 ("no localStorage/sessionStorage") existed because
//  the game shipped as a claude.ai artifact, where localStorage ACCESS ITSELF
//  throws a SecurityError inside the sandboxed iframe. The owner's 2026-07-16
//  directive (persist progress; task 078) relaxes the constraint — but only
//  through this door, so the artifact context still degrades instead of dying.
//
//  THE CONTRACT (078 keeps it when it grows this into the save adapter):
//    * Feature-detect exactly ONCE, with a real write+read+remove probe —
//      `'localStorage' in window` is not enough (Safari private mode used to
//      expose the object and throw on setItem).
//    * NEVER throw. Every entry point is try/catch'd; a failure silently falls
//      back to an in-memory Map for the rest of the session.
//    * NEVER nag. A player with storage disabled gets a session-only game and
//      is told nothing — losing a "seen the coach marks" flag just means the
//      thumbs get taught again next load, which is the friendly failure.
//    * Keys are namespaced `ope.<thing>.v<n>`; bump the version rather than
//      migrating a flag in place.
// =====================================================================

const _mem = new Map();      // fallback store: session-only, always works
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

// getFlag(key) -> string | null
export function getFlag(k) {
  try { const s = probe(); if (s) return s.getItem(k); } catch (e) { }
  return _mem.has(k) ? _mem.get(k) : null;
}

// setFlag(key, value) : writes through to localStorage when it works, and
// always to the in-memory map (so a same-session read is correct even when
// persistence is unavailable).
export function setFlag(k, v) {
  _mem.set(k, String(v));
  try { const s = probe(); if (s) s.setItem(k, String(v)); } catch (e) { }
}

// storageAvailable() -> bool. Debug/tooling only (the game never branches on
// it — that would be a nag with extra steps).
export function storageAvailable() { return !!probe(); }
