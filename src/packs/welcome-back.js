// =====================================================================
//  "BACK ALREADY?" — the welcome-back card (task 105, design audit B1)
//
//  The daily systems (date-seeded favors, lake moods) are closed in DATA but
//  were invisible in UX: a returning player never learned that today has its
//  own weather and its own neighbors. This card closes the session loop — ONCE,
//  at load, when a save exists AND the calendar date has rolled over since the
//  last play — in the Ope! voice: "back already? the lake missed you." plus up
//  to three quiet lines:
//    (1) today's lake mood, READ from lake-moods' date seed (window.__hd.mood090
//        — never recomputed here), so the card and the sky always agree;
//    (2) one of today's favors in the giver's voice (rotation.todayIds());
//    (3) where you left off — the nearest ZONES name to last session.
//
//  THE ETHICAL HOOK (hard rule): this is a warm welcome, NEVER a FOMO trap.
//  No streaks, no scarcity, no "you missed X". It is a PASSIVE banner, not a
//  modal — pointer-events:none, so it never eats a tap and NEVER blocks a step;
//  the game runs underneath and ANY input dismisses it. First-ever boot shows
//  the GAME, not this card (prior date is null → nothing). prefersCalm shows it
//  with no entrance motion.
//
//  PERSISTENCE (through the ONE guarded door, store.js):
//    ope.lastplayed.v1 — the last-played calendar date (YYYYMMDD). Read BEFORE
//      it is advanced to today; the read/today diff is the whole trigger.
//    ope.lastzone.v1   — the nearest ZONES *name* at save time (a NAME, never a
//      coordinate — the blob may never hold coords, so a save survives a map
//      rework). Tracked live and rewritten only when the nearest zone changes.
//
//  TOOLING (the play=1 idle-charm law, mirrors naming.js): under ?play=1 the
//  card stays hidden so baseline/walkthrough never catch it — UNLESS the test
//  opts in. ?welcome=1 forces it · ?welcome=0 suppresses · ?lastplayed=YYYYMMDD
//  seeds the prior date (simulate a returning player) · ?lastzone=<name> seeds
//  where-you-left-off. window.__hd.welcome105 exposes the decision + rows.
// =====================================================================
import { $, game } from '../core.js';
import { onWorldReady, registerUpdate, prefersCalm, favors } from '../framework.js';
import { getFlag, setFlag } from '../store.js';
import { rotation } from './favors-core.js';
import { ZONES } from '../data/chicago.js';

const LAST_KEY = 'ope.lastplayed.v1';
const ZONE_KEY = 'ope.lastzone.v1';

const Q = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(''); } })();
const PLAY = Q.get('play') === '1';
const FORCE = Q.get('welcome') === '1';
const OFF = Q.get('welcome') === '0';
const LP_PARAM = /^\d{8}$/.test(Q.get('lastplayed') || '') ? Q.get('lastplayed') : null;
const LZ_PARAM = Q.get('lastzone');

// today's LOCAL calendar date as YYYYMMDD (the favors/lake-moods convention).
function todayNum() {
  const d = new Date();
  return String(d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate());
}

// one warm quip per pooled favor id, in the GIVER's voice. Keyed by id so a
// rename never breaks it; falls back to a generic giver line for any future
// favor without a quip here. (The pilot 'oldstyle' is always-thirsty and not
// pooled, so it only ever surfaces via the fallback path — kept for tone.)
const QUIP = {
  oldstyle:    "the Malörp guy’s thirsty again",
  loveletter:  "<b>Sal</b>’s got another letter for Rita",
  divvyangel:  "<b>Reggie</b> says a few Dibsy bikes wandered off",
  lakeglass:   "<b>Shelley</b>’s after blue sea glass again",
  fieldnotes:  "<b>Lois</b> lost her field notes to the wind",
  baitphoto:   "<b>Gus</b> wants one more for the Park Bait wall",
  chalkbag:    "<b>Theo</b>’s chalk bag went over the wall again",
  drumstick:   "the <b>drummer</b>’s down a lucky stick",
  recipeglide: "<b>Bev</b>’s got a recipe to run out on the ice",
  umpwhistle:  "the <b>ump</b> lost his whistle to a gull",
  poppybuns:   "the <b>hot dog guy</b> needs buns by the seventh",
};

onWorldReady(() => {
  // --- read the prior session's state BEFORE we advance anything ---------
  const today = todayNum();
  const prior = LP_PARAM !== null ? LP_PARAM : getFlag(LAST_KEY);   // null => never played
  const rawZone = LZ_PARAM != null ? LZ_PARAM : getFlag(ZONE_KEY);
  const priorZone = ZONES.some(z => z.n === rawZone) ? rawZone : null;   // validate (also blocks any injected param)

  const differs = prior !== null && String(prior) !== String(today);
  // suppressed under tooling unless the test explicitly opts in (naming.js law)
  const playSuppress = PLAY && !FORCE && LP_PARAM === null;
  const willShow = !OFF && (FORCE || (differs && !playSuppress));

  // advance the last-played stamp every boot (the guarded door). Done AFTER the
  // read above, so today never clobbers the diff that decides the card.
  setFlag(LAST_KEY, today);

  // --- card copy (built lazily at open, when every pack has surely run) ---
  function moodLine() {
    let mood = null;
    try { mood = window.__hd && window.__hd.mood090 && window.__hd.mood090.mood; } catch (e) { }
    if (mood === 'fog') return 'a little <b>fog</b> off the lake this morning';
    if (mood === 'rain') return 'warm <b>drizzle</b>, on and off today';
    if (mood === 'firefly') return 'clear and golden — the <b>fireflies</b> tonight';
    return null;   // clear / unknown: no weather line
  }
  function favorLine() {
    let ids = [];
    try { ids = rotation.todayIds() || []; } catch (e) { }
    for (const id of ids) {
      let st = 'none';
      try { st = favors.at(id).st; } catch (e) { }
      if (st !== 'none') continue;                 // already started/done: not a "today" nudge
      if (QUIP[id]) return QUIP[id];
      let giver = null;
      try { const e = rotation.pool().find(p => p.id === id); giver = e && e.giver; } catch (e) { }
      if (giver) return `<b>${giver}</b> could use a hand today`;
    }
    return null;
  }
  function placeLine() {
    return priorZone ? `you left off near <b>${priorZone}</b>` : null;
  }

  // --- the passive banner: open once, dismiss on any input ---------------
  let opened = false, closed = false, t = 0;
  const DELAY = 0.9;   // let the title fade / world settle first (same beat as naming)
  let dismissers = null;

  function open() {
    if (opened || closed) return;
    opened = true;
    const card = $('welcomeback'); if (!card) return;
    const rows = [moodLine(), favorLine(), placeLine()].filter(Boolean);
    const box = $('wbRows');
    if (box) box.innerHTML = rows.map(r => `<div class="wbrow">${r}</div>`).join('');
    if (prefersCalm()) card.classList.add('calm');
    card.classList.add('show');
    // dismiss on ANY input — keyboard, mouse, wheel, or touch. capture:true so a
    // tap that lands on the (pointer-events:none) card still reaches us, and we
    // never preventDefault so the same key/tap also drives the game underneath.
    const go = () => dismiss();
    const evs = ['keydown', 'pointerdown', 'wheel', 'touchstart'];
    evs.forEach(e => window.addEventListener(e, go, { capture: true, passive: true }));
    dismissers = () => evs.forEach(e => window.removeEventListener(e, go, true));
    // gentle safety auto-dismiss for an idle player (well past any shot window)
    setTimeout(() => dismiss(), 9000);
  }
  function dismiss() {
    if (closed) return;
    closed = true;
    if (dismissers) { dismissers(); dismissers = null; }
    const card = $('welcomeback'); if (!card) return;
    if (prefersCalm()) { card.classList.remove('show', 'calm'); return; }
    card.classList.add('gone');
    setTimeout(() => card.classList.remove('show', 'gone'), 320);
  }

  // --- per-frame: persist where-you-left-off + trip the one-time open -----
  let zoneAcc = 0, lastZoneWritten = '';
  registerUpdate((dt, tt, pl) => {
    // (1) nearest ZONES name → the guarded door (throttled; a NAME, no coords).
    // Runs every session regardless of the card, so NEXT visit knows the spot.
    zoneAcc -= dt;
    if (zoneAcc <= 0) {
      zoneAcc = 1.2;
      let best = null, bd = 1e18;
      for (const z of ZONES) { const dx = pl.x - z.x, dz = pl.z - z.z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = z.n; } }
      if (best && best !== lastZoneWritten) { lastZoneWritten = best; setFlag(ZONE_KEY, best); }
    }
    // (2) show the card once, a beat after the world starts running.
    if (willShow && !opened && !closed && game.running) {
      t += Math.max(0, dt);
      if (t >= DELAY) open();
    }
  });

  // --- debug/E2E surface (tools only; inert in play) ---------------------
  try {
    window.__hd = window.__hd || {};
    window.__hd.welcome105 = {
      willShow, today, prior, priorZone,
      isOpen: () => { const c = $('welcomeback'); return !!(c && c.classList.contains('show') && !c.classList.contains('gone')); },
      rows: () => { const b = $('wbRows'); return b ? b.innerText : ''; },
      html: () => { const b = $('wbRows'); return b ? b.innerHTML : ''; },
      mood: () => { try { return window.__hd.mood090 && window.__hd.mood090.mood; } catch (e) { return null; } },
      forceOpen: () => open(),
    };
  } catch (e) { }
});
