// =====================================================================
//  FAVORS AT SCALE — the daily rotation core (task 081)
//  ECONOMY.md §3 grown city-wide: ~10 hand-authored favors live in the four
//  neighborhood packs (favors-lakefront/-wrigley/-downtown/-montrose); THIS
//  module owns the DATE-SEEDED ROTATION that keeps 3–4 of them active per
//  real-world day and the journal's "around the neighborhood" surface that
//  tells the player who could use a hand today — and that tomorrow brings
//  new neighbors (the return-visit hook).
//
//  THE ROTATION LAW:
//   * Deterministic from the LOCAL calendar date only — a private xorshift32
//     seeded by YYYYMMDD. It NEVER touches the world rng (mulberry32) and
//     never calls Math.random: same date, same actives, every load, no server.
//   * A favor already STARTED (active) or FINISHED (done) in the save is
//     always live — rotation only gates the OFFER. Nobody's errand vanishes
//     overnight half-done.
//   * The pilot favor ('oldstyle', 078) is NOT pooled — the Malört guy is
//     the tutorial and he is always thirsty.
//
//  API (consumed by the neighborhood favor packs, which import this module):
//   rotation.join({id, giver, where, hood})  — add a favor to the daily pool
//     (call during onWorldReady, before the first gate query). `giver`/`where`
//     feed the journal listing; `hood` feeds the stamp pack's bookkeeping.
//   rotation.activeToday(id) -> bool         — is it in today's 3–4?
//   rotation.offerable(id)  -> bool          — activeToday OR already started/
//     done in the save (the only check an offer interaction needs).
//   rotation.todayIds()     -> [id,...]      — today's picks (journal/debug).
//   rotation.pool()         -> [entry,...]   — the whole pool (stamp pack).
//
//  DEBUG (tools/E2E only): ?favday=YYYYMMDD overrides the date;
//  window.__hd.favors081 = {day, today(), pool(), offerable(id)}.
// =====================================================================
import { onWorldReady, journalSection, favors } from '../framework.js';
import { getFlag } from '../store.js';   // the one storage door — read-only peek at the first-dib flag

// ---- the date seed (local calendar day; ?favday=YYYYMMDD override) ----
function dayNumber() {
  try {
    const m = /[?&]favday=(\d{8})/.exec(location.search);
    if (m) return +m[1];
  } catch (e) { }
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// a private xorshift32 — NEVER the shared world rng (hard constraint 1).
function xs32(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const _pool = [];            // [{id,giver,where,hood}] — join() order is import
                             // order, but the pick sorts by id so it can't matter
let _today = null;           // computed lazily (pool complete after every
                             // pack's onWorldReady has run)
let _todayPoolN = -1;        // pool size the cache was built from: an EAGER
                             // query during onWorldReady (before every pack
                             // joined) self-heals on the next query instead of
                             // freezing a partial-pool pick for the session
let _day = 0;

function computeToday() {
  if (_today && _todayPoolN === _pool.length) return _today;
  _todayPoolN = _pool.length;
  _day = dayNumber();
  const r = xs32(_day * 2654435761 >>> 0 || 1);
  const ids = _pool.map(e => e.id).sort();
  // Fisher–Yates on the sorted ids, then take 3 or 4 — both from the same
  // deterministic stream, so a given date always deals the same hand.
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = ids[i]; ids[i] = ids[j]; ids[j] = t;
  }
  const k = Math.min(ids.length, r() < 0.5 ? 3 : 4);
  _today = new Set(ids.slice(0, k));
  return _today;
}

export const rotation = {
  join(entry) { if (entry && entry.id && !_pool.some(e => e.id === entry.id)) _pool.push(entry); },
  activeToday(id) { return computeToday().has(id); },
  // rotation gates the OFFER only: anything the player already started (or
  // finished — turn-ins, duet lines) stays live regardless of the calendar.
  offerable(id) { return computeToday().has(id) || favors.at(id).st !== 'none'; },
  todayIds() { return [...computeToday()]; },
  pool() { return _pool.slice(); },
};

// ---- the journal surface: who could use a hand TODAY -------------------
// Registered during onWorldReady like every pack section (fixed sort slot);
// renders '' (hides its own header) until the player has ever met the economy
// at all — a fresh boot shows a game, not an errand board. Never a map marker:
// each line is the giver + where, in the neighbor's own voice.
onWorldReady(() => {
  journalSection('neighbors', 'Around the neighborhood', () => {
    // same law as the dibs chip: invisible until the player has ever earned a
    // dib (which zone discovery hands out in the first minute of any session)
    // — a fresh boot shows a game, not an errand board.
    if (getFlag('ope.dibs') !== '1') return '';
    const today = computeToday();
    if (!today.size) return '';
    const rows = [];
    for (const e of _pool) {
      if (!today.has(e.id)) continue;
      const st = favors.at(e.id).st;
      if (st !== 'none') continue;               // started/done ones live in To-do
      rows.push(`<div class="jrow"><span>· ${e.giver} — ${e.where}</span></div>`);
    }
    if (!rows.length) rows.push('<div class="jrow"><span>everybody’s squared away today</span></div>');
    rows.push('<div class="jrow jdone"><span>different neighbors tomorrow. that’s how blocks work.</span></div>');
    return rows.join('');
  });

  // debug/E2E sibling (tools only; inert in play)
  try {
    window.__hd = window.__hd || {};
    window.__hd.favors081 = {
      get day() { computeToday(); return _day; },
      today: () => rotation.todayIds(),
      pool: () => rotation.pool(),
      offerable: (id) => rotation.offerable(id),
    };
  } catch (e) { }
});
