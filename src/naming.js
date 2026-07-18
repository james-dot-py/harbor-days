// =====================================================================
//  NAME YOUR MAYOR (task 087) — the neighbors learn your name.
//
//  Two oldest tricks in the cozy book: say the player's name once at the right
//  moment and they're yours. Once, after first start (and after 077's coach
//  marks on touch), a small cream card asks what to call the mayor. The answer
//  persists through the ONE guarded door (store.js, via framework.setMayorName)
//  and is used warmly-but-sparingly across the game (bump lines, the journal
//  signature, favor turn-ins, the Wrigley ejection).
//
//  RULES (from the acceptance):
//    * 12 chars, letters / spaces / apostrophes only (live-sanitized).
//    * default placeholder "Mayor" — enter-through keeps it (stores '').
//    * a light-touch denylist; when in doubt ALLOW — it's their own screen.
//    * desktop keyboard + the mobile OS keyboard both work (a real <input>).
//
//  KEY ISOLATION: the game's key handlers are on window with no focus check
//  (input.js), so while the field is focused every key event is stopped from
//  reaching them AND the movement key set is cleared each stroke (the DOM-input
//  isolation pitfall). The 014 audio chain is never touched — no audio here.
//
//  Debug: ?name=1 forces the card (ignoring the seen flag) · ?name=0 suppresses.
//  Under ?play=1 (tooling / baseline shots) the card stays HIDDEN unless
//  ?name=1, so no automated capture ever changes.
// =====================================================================
import { $, game } from './core.js';
import { keys } from './input.js';
import { getFlag, setFlag } from './store.js';
import { setMayorName, sanitizeName } from './framework.js';
import { onboardingActive } from './onboard.js';

const SEEN_KEY = 'ope.named.v1';
const DBG = new URLSearchParams(location.search);
const IS_TOUCH = () => document.body.classList.contains('touch');

// A deliberately TINY denylist — the whole of it. The card is the player's own
// screen, so we only turn away the handful of names nobody wants a neighbor to
// shout across the park; when in doubt we allow. Matched against the name with
// everything but letters stripped, lowercased (so spacing/apostrophes can't slip
// one past). This is a light touch, not a moderation system.
const DENY = ['fuck', 'shit', 'cunt', 'bitch', 'nigger', 'nigga', 'faggot', 'retard', 'slut', 'whore', 'asshole', 'dickhead'];
// live-clean for the field WHILE typing: strip invalid chars, collapse double
// spaces, drop a LEADING space, cap 12 — but keep a single trailing space so a
// mid-name space can be typed (the final trim is at submit).
function liveClean(v) {
  return String(v || '').replace(/[^A-Za-z '’]/g, '').replace(/ {2,}/g, ' ').replace(/^ +/, '').slice(0, 12);
}
function allowed(name) {
  const s = name.toLowerCase().replace(/[^a-z]/g, '');
  if (!s) return true;                       // empty (enter-through) is fine
  return !DENY.some(w => s.includes(w));
}

let el = null, done = false, shown = false, t = 0, minDelay = 0;

// initNaming() — main.js calls this from runStart(), after initOnboarding().
export function initNaming() {
  const suppressed = DBG.get('name') === '0' || (DBG.get('play') === '1' && DBG.get('name') !== '1');
  const force = DBG.get('name') === '1';
  if (!force && (suppressed || getFlag(SEEN_KEY) === '1')) { done = true; return; }
  el = { card: $('naming'), input: $('nameInput'), ok: $('nameOk') };
  if (!el.card || !el.input || !el.ok) { done = true; return; }
  minDelay = IS_TOUCH() ? 0.6 : 1.1;         // let the title fade / the world settle first
  wire();
}

function wire() {
  // stop every key from reaching the window-level game handlers, and drop any
  // movement key that leaked in before focus. Enter submits.
  el.input.addEventListener('keydown', e => { e.stopPropagation(); keys.clear(); if (e.key === 'Enter') { e.preventDefault(); submit(); } });
  el.input.addEventListener('keyup', e => { e.stopPropagation(); keys.clear(); });
  el.input.addEventListener('keypress', e => { e.stopPropagation(); });
  // live-sanitize to letters/spaces/apostrophes, ≤12. NB: keep any TRAILING space
  // (don't trim while typing, or "Sam " → "Sam" kills the space before the next
  // letter and internal spaces become impossible); the final trim happens at
  // submit (setMayorName → sanitizeName).
  el.input.addEventListener('input', () => { const c = liveClean(el.input.value); if (c !== el.input.value) el.input.value = c; });
  el.ok.addEventListener('click', submit);
}

function open() {
  shown = true;
  el.card.classList.add('show');
  // focus AFTER the show so mobile Safari raises the OS keyboard on this gesture
  setTimeout(() => { try { el.input.focus(); } catch (e) { } }, 30);
}
function close() { el.card.classList.remove('show'); keys.clear(); }

function submit() {
  const val = sanitizeName(el.input.value);
  if (val && !allowed(val)) {                 // gentle refusal: shake, clear, let them retry
    el.card.classList.remove('nope'); void el.card.offsetWidth; el.card.classList.add('nope');
    el.input.value = '';
    return;
  }
  setMayorName(val);                          // '' on enter-through → the default "Mayor" stands
  setFlag(SEEN_KEY, '1');
  done = true;
  close();
}

// updateNaming(dt) — main.js calls this each frame. Shows the card exactly once,
// after the world is running and (on touch) after the coach marks are finished.
export function updateNaming(dt) {
  if (done || shown || !el) return;
  if (!game.running) return;
  if (onboardingActive()) return;             // wait out the touch coach marks
  t += Math.max(0, dt);
  if (t < minDelay) return;
  open();
}
