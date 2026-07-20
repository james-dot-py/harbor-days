// =====================================================================
//  FIRST INTERACTION — teach the E / tap press, once, ever (task 108)
//
//  The gap this closes (2026-07-19 design audit): a first-time player can walk
//  13 s from the spawn plaza straight to the water and never press anything —
//  yet EVERY downstream system (favors, shops, activities, the suggestion box)
//  is gated behind that one press. The 077 coach marks teach walk + look on
//  TOUCH; nothing on desktop, and nothing teaches the press itself as a
//  persistent nudge tied to a real interaction site.
//
//  DOCTRINE (mirrors 077's "teach by doing, dismiss by doing"):
//    * DESKTOP + TOUCH. The interaction pill already exists on both (E / ✋,
//      task 026); this decorates it — a gently pulsing pill + one coach caption
//      ("say hi — press E" / "say hi — tap ✋") — while the player stands inside
//      an interaction's grace radius (the pill is up) and has NEVER pressed.
//    * The first site on the natural spawn→Rocks line is the suggestion-box
//      kiosk (x115.5) a couple of steps east of spawn (x109.5); walking the
//      line brings the pill up and the teach with it. Any interaction counts —
//      whichever they reach first gets the nudge.
//    * Dies FOREVER on the first-ever fired interaction (flag ope.firste.v1 via
//      store.js). Never shown again; a returning player sees a plain pill.
//    * Never blocks movement (pure DOM decoration; the caption is
//      pointer-events:none), never a modal, never nags.
//    * prefersCalm() -> the caption still shows but the pill does NOT pulse
//      (static ring instead) — the 085 reduced-motion contract.
//    * While the 077 touch walk/look marks are still teaching
//      (onboardingActive()), we stay quiet so the two never double up — those
//      marks own the interact beat during the initial thumb lesson; we take
//      over only once they retire.
//
//  Debug params (like 087 idle / 091 affordance):
//    ?firste=1  force ENABLED even under ?play=1 (still respects the flag) — how
//               the walkthrough/act shots capture it.
//    ?firste=0  force off.
//    (default: on for a real player; off under ?play=1 so headless waypoint
//     shots standing near an interaction don't sprout a coach caption.)
// =====================================================================
import { $, game } from './core.js';
import { state, prefersCalm } from './framework.js';
import { onboardingActive } from './onboard.js';
import { getFlag, setFlag } from './store.js';

const FIRSTE_KEY = 'ope.firste.v1';            // '1' once they've ever pressed E / tapped ✋
const DBG = new URLSearchParams(location.search);
const IS_TOUCH = () => document.body.classList.contains('touch');

let elPrompt = null, elCoach = null;
let ENABLED = false, done = false, acts0 = 0, teaching = false;

// initFirstPress() : called from main.js runStart(), after initInput() set
// body.touch and after the player pressed "let's walk" (so the caption picks the
// right gesture word). Above any early return so a returning player's state is
// inspectable via the debug hook too.
export function initFirstPress() {
  elPrompt = $('prompt');
  elCoach = $('coachPress');
  if (elCoach) elCoach.textContent = IS_TOUCH() ? 'say hi — tap ✋' : 'say hi — press E';

  const play = DBG.get('play') === '1';
  const p = DBG.get('firste');
  ENABLED = p === '0' ? false : (play ? p === '1' : true);

  done = getFlag(FIRSTE_KEY) === '1';
  acts0 = state.interactionsUsed || 0;

  // debug/tools only: live teach state. Installed here (not at module scope) —
  // main.js assigns window.__hd wholesale after its imports, so an import-time
  // hook is clobbered before the first frame (the 077/091 econ-clobber law).
  window.__hd = window.__hd || {};
  window.__hd.firste = () => ({
    enabled: ENABLED, done, teaching,
    up: !!(elPrompt && elPrompt.style.display === 'flex'),
    flag: getFlag(FIRSTE_KEY),
  });
}

function setTeach() {
  elPrompt.classList.add('teach');
  elPrompt.classList.toggle('teachpulse', !prefersCalm());   // static under reduced-motion
  teaching = true;
}
function clearTeach() {
  if (!teaching) return;
  elPrompt.classList.remove('teach', 'teachpulse');
  teaching = false;
}

// updateFirstPress(dt) : every frame from main.js, AFTER runUpdates so the pill's
// display + state.interactionsUsed are current for this frame.
export function updateFirstPress() {
  if (!ENABLED || !elPrompt) return;
  // the first-ever fired interaction (E or ✋) retires the lesson for good —
  // even if it fired while we were deferring to the coach marks or the pill
  // wasn't ours to decorate this frame.
  if (!done && (state.interactionsUsed || 0) > acts0) { done = true; setFlag(FIRSTE_KEY, '1'); }
  if (done || !game.running || onboardingActive()) { clearTeach(); return; }
  if (elPrompt.style.display === 'flex') setTeach(); else clearTeach();
}
