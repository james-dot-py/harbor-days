// =====================================================================
//  AVATAR SELECT (task 089) — the first-play "who are ya, anyway?" picker.
//
//  On FIRST play (once, after the touch coach marks, before the naming card)
//  a small cream card offers the Chicago cast; the LIVE player rig in the
//  world is the preview — tapping a tile swaps it on the spot and the rig
//  turntables slowly so you see all sides. Any close path confirms the
//  current selection. Reopen later from the ⚙ settings card.
//
//  PERSISTENCE: the chosen id (names/ids only — the save-blob law) through
//  the ONE guarded door as the `ope.avatar.v1` flag. SEEN = the flag is set.
//
//  TITLE-FLOW LAW (the 087 idle-gate precedent): under ?play=1 the picker
//  stays HIDDEN and the rig defaults to the mayor, so no walkthrough /
//  baseline capture ever changes. Debug:
//    ?avatar=1      force the picker (even under play=1)
//    ?avatar=<id>   force that rig, session-only, no card, no persist
//    ?avatar=0      suppress entirely
// =====================================================================
import { $, game } from './core.js';
import { getFlag, setFlag } from './store.js';
import { AVATARS, applyAvatar, currentAvatar, avatarById } from './avatars.js';
import { onboardingActive } from './onboard.js';
import { state } from './framework.js';
import { mayor } from './character.js';
import { keys } from './input.js';

const KEY = 'ope.avatar.v1';
const DBG = new URLSearchParams(location.search);

let _forced = false, _done = false, _shown = false, _t = 0, _sel = 'mayor';

// initAvatarSelect() — main.js calls this once at boot, after buildMayor and
// before the first frame: apply the saved (or ?avatar=-forced) rig so frame 1
// and the framework's worn-restore both see the right head, then decide
// whether the picker is armed for this session.
export function initAvatarSelect() {
  const p = DBG.get('avatar');
  _forced = p === '1';
  if (p && p !== '1' && p !== '0') { applyAvatar(p); _done = true; }   // forced rig for shots — session-only
  else {
    const saved = getFlag(KEY);
    if (saved) applyAvatar(saved);
    const suppressed = p === '0' || (DBG.get('play') === '1' && !_forced);
    if (!_forced && (suppressed || saved !== null)) _done = true;
  }
  _sel = currentAvatar();
  try {
    window.__hd = window.__hd || {};
    window.__hd.avatars = { list: AVATARS.map(a => a.id), apply: applyAvatar, current: currentAvatar, pickActive: avatarPickActive };
  } catch (e) { }
  wire();
}

// avatarPickActive() — true while the card is up (naming.js waits on this).
export function avatarPickActive() { return _shown; }

// openAvatarPicker() — reopen the cast card (the ⚙ settings row calls this).
export function openAvatarPicker() { open(); }

// updateAvatarSelect(dt) — main.js calls this each frame, after updateNaming.
// Shows the card exactly once on first play (after the coach marks), and owns
// the slow turntable while the card is up (this runs AFTER main.js stamps
// mayor.rotation, so the write wins the frame).
export function updateAvatarSelect(dt) {
  if (_shown) {
    mayor.rotation.y += dt * 0.55;
    return;
  }
  if (_done) return;
  if (!game.running) return;
  if (onboardingActive()) return;
  _t += Math.max(0, dt);
  // Open a hair BEFORE naming's own first-play delay (naming.js minDelay: touch
  // 0.6 / desktop 1.1) so avatarPickActive() is already true when naming next
  // checks it — otherwise, on a boundary frame, updateNaming (which runs first
  // in main.js's loop) could open the name card the same frame the picker opens
  // and the two would stack. Naming resets its timer while we're up, then runs.
  if (_t < (document.body.classList.contains('touch') ? 0.5 : 1.0)) return;
  open();
}

// ------------------------------ the card -------------------------------
// (UI built against #avpick / #avRail / #avBlurb / #avOk in index.html.)
let _wired = false;
function wire() {
  if (_wired) return; _wired = true;
  const card = $('avpick'); if (!card) return;
  const ok = $('avOk'); if (ok) ok.addEventListener('click', confirm);
  // tap-outside confirms too — guarded on the gesture's ORIGIN (the 078
  // touch-interaction modal-close trap): only when pointerdown AND click both
  // landed on the backdrop.
  let downOnBackdrop = false;
  card.addEventListener('pointerdown', e => { downOnBackdrop = (e.target === card); });
  card.addEventListener('click', e => { if (e.target === card && downOnBackdrop) confirm(); });
  addEventListener('keydown', e => {
    if (!_shown) return;
    if (e.key === 'Enter' || e.key === 'Escape') { e.stopPropagation(); confirm(); }
  }, true);   // capture: beat the settings card's own capture-phase Esc
}

// build the tiles once (on open) — selection changes then only toggle the `on`
// class via refreshSel(), so re-selecting never rebuilds the rail (no flicker,
// and the horizontal scroll position is preserved).
function renderRail() {
  const rail = $('avRail'); if (!rail) return;
  rail.innerHTML = AVATARS.map(a =>
    `<button class="avtile" data-id="${a.id}"><span class="avico">${a.icon}</span><span class="avname">${a.name}</span></button>`).join('');
  for (const b of rail.querySelectorAll('.avtile'))
    b.addEventListener('click', () => select(b.dataset.id));
  refreshSel();
}

// mark the current selection, refresh the blurb, and slide the chosen tile into
// view. The scroll is rail-LOCAL (scrollLeft, never scrollIntoView) so it can
// never nudge the page/world layout.
function refreshSel() {
  const rail = $('avRail'); if (!rail) return;
  let onTile = null;
  for (const b of rail.querySelectorAll('.avtile')) {
    const sel = b.dataset.id === _sel;
    b.classList.toggle('on', sel);
    if (sel) onTile = b;
  }
  const blurb = $('avBlurb'), a = avatarById(_sel);
  if (blurb && a) blurb.textContent = a.blurb;
  if (onTile) {
    const rr = rail.getBoundingClientRect(), tr = onTile.getBoundingClientRect();
    if (rr.width) rail.scrollLeft += (tr.left - rr.left) - (rr.width - tr.width) / 2;
  }
}

function select(id) {
  if (!avatarById(id)) return;
  _sel = id;
  applyAvatar(id);                       // the world rig IS the preview
  refreshSel();
}

function open() {
  const card = $('avpick'); if (!card) { _done = true; return; }
  _sel = currentAvatar();
  // one card at a time (the 085 law) — hide sibling modals directly
  for (const id of ['journal', 'ctl', 'tote', 'shop', 'citymap', 'settings']) { const e = $(id); if (e) e.classList.remove('show'); }
  card.classList.add('show');
  renderRail();                          // after .show so the rail can measure for scroll-into-view
  _shown = true;
  state.idleBusy = true;                 // no idle stretch/sit mid-fitting
}

function confirm() {
  const card = $('avpick'); if (card) card.classList.remove('show');
  _shown = false; _done = true;
  state.idleBusy = false;
  keys.clear();
  setFlag(KEY, _sel);                    // names/ids only — the save-blob law
}
