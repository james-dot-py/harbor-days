// =====================================================================
//  ONBOARDING — teach the thumbs (task 077)
//
//  The owner: "It's not super obvious to people right now how to walk or
//  change perspective on iphone." The QR campaign is live, so every scan is a
//  phone meeting this game cold, with nobody standing there to explain it.
//
//  DOCTRINE — teach by doing, dismiss by doing:
//    * TOUCH ONLY. A keyboard never sees a coach mark (desktop is untouched,
//      which is also why baseline.png does not move).
//    * No modal, no "tap to continue", no reading. The world stays live behind
//      the marks and the player can ignore them completely.
//    * Each mark dies the INSTANT the player performs its gesture — the mark
//      exists to be destroyed. A mark that outstays its welcome is a bug, so
//      every mark also self-retires on a timer even if never performed.
//    * Shown once ever, via the guarded-storage flag (store.js). If storage is
//      unavailable the marks simply teach again next load — the friendly
//      failure, never an error.
//
//  Beats:
//    1. WALK  — a ghost thumb circles the joystick ghost.   dies on joy input.
//    2. LOOK  — a ghost thumb swipes on the open right side. dies on a drag.
//    3. ACT   — a ghost thumb taps the hand button, introduced only when the
//               player is first in range of something.       dies on a use.
//  Plus the idle stick ghost (where to put the thumb at rest) and the iOS
//  add-to-home-screen hint.
//
//  Debug params: ?coach=1 force the marks (ignore the seen flag) · ?coach=0
//  suppress them · ?a2hs=1 force the iOS install hint (it is invisible to
//  headless Chrome otherwise, so this is how it gets screenshotted).
// =====================================================================
import { $, game } from './core.js';
import { cam, joy } from './input.js';
import { state } from './framework.js';
import { getFlag, setFlag } from './store.js';

const SEEN_KEY = 'ope.onboard.v1';   // '1' once the walk+look beats are done
const A2HS_KEY = 'ope.a2hs.v1';      // '1' once the install hint is dismissed

// --- tuning (all seconds / metres / px) ---
const LOOK_DELAY = 0.9;    // stagger: the eye reads the left mark first
const RETIRE_MOVE = 22;    // walk/look marks give up after this long unperformed
const RETIRE_ACT = 10;     // the act mark is the pushiest, so it gives up soonest
const JOY_DONE = 0.15;     // stick deflection that counts as "they walked"
const LOOK_DONE = 28;      // px of touch drag that counts as "they looked"
const GHOST_M = 20;        // metres walked after which the idle stick ghost retires
const A2HS_AT = 180;       // seconds of play before the install hint is offered
const A2HS_FOR = 18;       // ...and how long it hangs around if simply ignored

const DBG = new URLSearchParams(location.search);
const IS_TOUCH = () => document.body.classList.contains('touch');

let el = null, on = false;
const beat = { walk: 0, look: 0, act: 0 };   // 0 = pending, 1 = showing, 2 = done
const shown = { walk: 0, look: 0, act: 0 };  // seconds each mark has been visible
let t = 0, ghostGone = false, lookPx0 = 0, acts0 = 0;
let a2hsT = 0, a2hsUp = 0, a2hsState = 0;   // a2hsState: 0 pending · 1 showing · 2 done

function show(m) { if (el[m]) { el[m].classList.add('on'); el[m].classList.remove('gone'); } }
// dismiss: the poof. `.gone` fades + scales up; the node stays display:block for
// the transition, then goes fully out of the layer.
function dismiss(m) {
  if (!el[m]) return;
  el[m].classList.add('gone');
  setTimeout(() => { if (el[m]) el[m].classList.remove('on'); }, 520);
}

// initOnboarding() : called from main.js runStart(), i.e. after body.touch is
// set by initInput() and after the player pressed "let's walk".
export function initOnboarding() {
  el = {
    walk: $('coachWalk'), look: $('coachLook'), act: $('coachAct'),
    ghost: $('jghost'), prompt: $('prompt'), a2hs: $('a2hs'),
  };

  // the iOS install hint runs independently of the coach marks (a returning
  // player who has seen the marks may still not have installed the game)
  const x = $('a2x');
  if (x) x.addEventListener('click', () => { hideA2hs(); setFlag(A2HS_KEY, '1'); });

  // debug/tools only: live onboarding state. Installed HERE, not at module
  // scope — main.js assigns window.__hd wholesale after its imports run, so a
  // hook installed at import time is clobbered before the first frame. Above
  // the early return so a RETURNING player's state is inspectable too.
  window.__hd = window.__hd || {};
  window.__hd.onboard = () => ({ on, t, beat: { ...beat }, shown: { ...shown }, drag: cam.lookPx - lookPx0 });

  const force = DBG.get('coach') === '1';
  const off = DBG.get('coach') === '0';
  // "first session" gates BOTH the coach marks and the idle stick ghost: a
  // returning player already knows where the stick is, and a permanent ghost
  // would just be clutter on a HUD we work hard to keep quiet.
  const first = !off && (force || (IS_TOUCH() && getFlag(SEEN_KEY) !== '1'));
  if (!first) { ghostGone = true; if (el.ghost) el.ghost.classList.add('gone'); return; }

  on = true;
  lookPx0 = cam.lookPx; acts0 = state.interactionsUsed || 0;
  show('walk');
  beat.walk = 1;
  if (el.ghost) el.ghost.classList.remove('gone');
}

function retireAll() {
  on = false;
  setFlag(SEEN_KEY, '1');
}

// onboardingActive() — true while the touch coach marks are still teaching. The
// naming card (task 087) waits this out so the two never stack on screen.
export function onboardingActive() { return on; }

// updateOnboarding(dt) : called every frame from main.js's loop (after the
// input is sampled, so a gesture is dismissed on the same frame it happens).
export function updateOnboarding(dt) {
  if (!el) return;
  // main.js's dt is Math.min(0.05, (now-last)/1000) — capped above, NOT below,
  // and the first rAF timestamp predates the world build, so frame 1 delivers a
  // dt of roughly -(build time): measured at -3.7 s headless. Every accumulator
  // below would start that far in the past and the beats would silently never
  // fire. Harmless for game.tNow (every consumer reads differences), fatal here.
  // See PITFALLS.md.
  dt = Math.max(0, dt);
  t += dt;

  // ---- idle stick ghost: where to put the thumb, until they clearly know ----
  // Hidden while a real stick is on screen (the live #stick draws at the touch
  // point — two sticks at once reads as a bug), and retired for good at 20 m.
  if (el.ghost && !ghostGone) {
    if ((state.distanceWalked || 0) > GHOST_M) {
      ghostGone = true;
      el.ghost.classList.add('gone');
    } else {
      const touching = joy.id !== null;
      if (touching !== el.ghost._hid) { el.ghost._hid = touching; el.ghost.style.opacity = touching ? '0' : ''; }
    }
  }

  if (on) {
    // ---- beat 1: WALK ----
    if (beat.walk === 1) {
      shown.walk += dt;
      if (joy.len > JOY_DONE || shown.walk > RETIRE_MOVE) { beat.walk = 2; dismiss('walk'); }
    }
    // ---- beat 2: LOOK (staggered in behind the walk mark) ----
    if (beat.look === 0 && t > LOOK_DELAY) { beat.look = 1; show('look'); }
    if (beat.look === 1) {
      shown.look += dt;
      if (cam.lookPx - lookPx0 > LOOK_DONE || shown.look > RETIRE_MOVE) { beat.look = 2; dismiss('look'); }
    }
    // ---- beat 3: ACT — only once they can walk, and only in range of something ----
    const promptUp = el.prompt && el.prompt.style.display === 'flex';
    if (beat.act === 0 && beat.walk === 2 && promptUp) { beat.act = 1; show('act'); }
    if (beat.act === 1) {
      shown.act += dt;
      // out of range again: pull the mark, but leave the beat armed for the
      // next thing they walk up to
      if (!promptUp) { beat.act = 0; dismiss('act'); }
      else if ((state.interactionsUsed || 0) > acts0 || shown.act > RETIRE_ACT) { beat.act = 2; dismiss('act'); }
    }
    // the thumbs are taught once walking and looking have both landed; the act
    // mark is a bonus beat and never holds the flag hostage
    if (beat.walk === 2 && beat.look === 2) retireAll();
  }

  updateA2hs(dt);
}

// ------------------------- iOS: add to home screen ---------------------
// iOS Safari has no beforeinstallprompt — the ONLY way onto the home screen is
// the share sheet, and nobody finds it unaided. So: one gentle, dismissable
// nudge, only on iOS Safari, only when not already installed, only after the
// player has stuck around a while (A2HS_AT), and never twice.
function isIOS() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);   // iPadOS lies about being a Mac
}
function isSafari() {
  const ua = navigator.userAgent;
  // Chrome/Firefox/Edge on iOS are all WebKit but cannot add to the home
  // screen from their share sheets the same way — do not send them there.
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/.test(ua);
}
function isInstalled() {
  return navigator.standalone === true ||
    (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
}
function hideA2hs() {
  a2hsState = 2;
  if (el.a2hs) el.a2hs.classList.remove('show');
}
function updateA2hs(dt) {
  if (a2hsState === 2 || !el.a2hs) return;
  const force = DBG.get('a2hs') === '1';
  // showing: hold for A2HS_FOR, then withdraw it. Ignoring the hint IS an
  // answer — it just does not persist the flag, so a later session may offer
  // once more. Tapping ✕ is the answer that sticks.
  if (a2hsState === 1) {
    a2hsUp += dt;
    if (a2hsUp > A2HS_FOR) hideA2hs();
    return;
  }
  if (!force) {
    if (!IS_TOUCH() || !isIOS() || !isSafari() || isInstalled()) { a2hsState = 2; return; }
    if (getFlag(A2HS_KEY) === '1') { a2hsState = 2; return; }
  }
  if (!game.running) return;
  a2hsT += dt;
  if (a2hsT < (force ? 0 : A2HS_AT)) return;
  el.a2hs.classList.add('show');
  a2hsState = 1;
}
