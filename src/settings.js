// =====================================================================
//  SETTINGS (task 085) — the settings card: audio · camera · accessibility ·
//  low-power. Cozy, NOT modal: the world keeps running behind it (like the "?"
//  card), opened by the gear button bottom-left or Esc on desktop.
//
//  Every control persists through the ONE guarded door (store.js save blob,
//  save.settings — schema v2) and applies LIVE. Defaults reproduce today's
//  behavior EXACTLY: sliders at max, toggles off, text size M, reduced-motion
//  = follow the OS. So a fresh install is audio/pixel-identical to pre-085 and
//  the only spawn-view change is the new gear button itself.
//
//  Ownership: this module OWNS the settings state and card DOM. It PUSHES each
//  value into the system that owns the behavior (audio buses, input look feel,
//  renderer DPR, fog-cull margin, the game.calm flag, the --uiscale property) —
//  it never reaches into those systems' internals.
// =====================================================================
import { $, game, clamp, renderer, setLowPowerDPR } from './core.js';
import { getSave, markDirty } from './store.js';
import { setMusicVol, setSfxVol, setMuted, audioLevels } from './audio.js';
import { setLookScale, setInvertY } from './input.js';
import { setLowPowerCull } from './fogcull.js';
import { openAvatarPicker } from './avatarselect.js';

// text-size multipliers (S / M / L). M = 1 → the --uiscale override rules all
// compute calc(base * 1) = base, i.e. a byte-identical no-op (index.html gates
// the whole block on html.uiscaled, which M never adds — see applySettings).
const TEXT_SCALE = { s: 0.9, m: 1, l: 1.15 };

// defaults = the live behavior before this card existed.
//   reducedMotion: null = follow the OS prefers-reduced-motion query; an explicit
//   toggle stores true/false and wins over the OS from then on.
const DEFAULTS = { music: 1, sfx: 1, muted: false, look: 1, invertY: false,
  reducedMotion: null, text: 'm', lowPower: false };

function osCalm() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

let S = null;   // the live settings object (DEFAULTS with the saved bag merged over)

function load() {
  const raw = (getSave().settings && typeof getSave().settings === 'object') ? getSave().settings : {};
  S = Object.assign({}, DEFAULTS, raw);
  // coerce the ranges so a hand-edited / partial save can never poison a system
  S.music = clamp(+S.music || 0, 0, 1);
  S.sfx = clamp(+S.sfx || 0, 0, 1);
  S.look = clamp(+S.look || 1, 0.2, 3);
  S.muted = !!S.muted; S.invertY = !!S.invertY; S.lowPower = !!S.lowPower;
  if (S.reducedMotion !== true && S.reducedMotion !== false) S.reducedMotion = null;
  if (!(S.text in TEXT_SCALE)) S.text = 'm';
  return S;
}

function persist() {
  getSave().settings = Object.assign({}, S);
  markDirty();
}

// effective reduced-motion: an explicit choice wins; otherwise the OS query.
function calmEffective() { return S.reducedMotion == null ? osCalm() : !!S.reducedMotion; }

// applySettings() — push every setting into the system that owns it. Called at
// boot (persisted values take effect from the first frame) and after any change.
export function applySettings() {
  if (!S) load();
  setMusicVol(S.music); setSfxVol(S.sfx); setMuted(S.muted);
  setLookScale(S.look); setInvertY(S.invertY);
  game.calm = calmEffective();
  setLowPowerDPR(S.lowPower); setLowPowerCull(S.lowPower);
  const m = TEXT_SCALE[S.text] || 1;
  document.documentElement.style.setProperty('--uiscale', String(m));
  document.documentElement.classList.toggle('uiscaled', m !== 1);
}

// snapshot for tools / E2E (window.__hd.settings) — the stored prefs AND the
// live effects (bus gains, DPR, calm) so a headless run can assert the wiring.
function snapshot() {
  const a = audioLevels();
  return { music: S.music, sfx: S.sfx, muted: S.muted, look: S.look, invertY: S.invertY,
    reducedMotion: S.reducedMotion, calm: game.calm, text: S.text, lowPower: S.lowPower,
    musicGain: a.musicGain, sfxGain: a.sfxGain, dpr: renderer.getPixelRatio() };
}

// ------------------------------ the card -------------------------------
function isOpen() { const c = $('settings'); return !!(c && c.classList.contains('show')); }
function anyCardOpen() {
  for (const id of ['journal', 'ctl', 'tote', 'shop', 'citymap', 'avpick']) { const e = $(id); if (e && e.classList.contains('show')) return true; }
  return false;
}
export function openSettings() {
  const card = $('settings'); if (!card) return;
  // one card at a time — hide the sibling modals (they hide us on their open too)
  for (const id of ['journal', 'ctl', 'tote', 'shop', 'citymap', 'avpick']) { const e = $(id); if (e) e.classList.remove('show'); }
  syncControls();
  card.classList.add('show');
}
export function closeSettings() { const c = $('settings'); if (c) c.classList.remove('show'); }

// mirror S into the controls (on open + when the OS query flips us in auto mode)
function pct(v) { return Math.round(v * 100) + '%'; }
function setText(id, s) { const e = $(id); if (e) e.textContent = s; }
function syncControls() {
  const m = $('setMusic'); if (m) m.value = Math.round(S.music * 100);
  const sx = $('setSfx'); if (sx) sx.value = Math.round(S.sfx * 100);
  const lk = $('setLook'); if (lk) lk.value = Math.round(S.look * 100);
  const mu = $('setMute'); if (mu) mu.checked = S.muted;
  const iv = $('setInvert'); if (iv) iv.checked = S.invertY;
  const cm = $('setCalm'); if (cm) cm.checked = calmEffective();
  const lp = $('setLow'); if (lp) lp.checked = S.lowPower;
  for (const k of ['s', 'm', 'l']) { const b = $('setText-' + k); if (b) b.classList.toggle('on', S.text === k); }
  setText('setMusicV', S.muted ? 'muted' : pct(S.music));
  setText('setSfxV', S.muted ? 'muted' : pct(S.sfx));
  setText('setLookV', pct(S.look));
}

function commit() { persist(); applySettings(); syncControls(); }

let _wired = false;
function wire() {
  if (_wired) return; _wired = true;
  const on = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); };

  // sliders (live on 'input')
  on('setMusic', 'input', e => { S.music = clamp((+e.target.value || 0) / 100, 0, 1); commit(); });
  on('setSfx', 'input', e => { S.sfx = clamp((+e.target.value || 0) / 100, 0, 1); commit(); });
  on('setLook', 'input', e => { S.look = clamp((+e.target.value || 0) / 100, 0.2, 3); commit(); });
  // toggles
  on('setMute', 'change', e => { S.muted = !!e.target.checked; commit(); });
  on('setInvert', 'change', e => { S.invertY = !!e.target.checked; commit(); });
  on('setCalm', 'change', e => { S.reducedMotion = !!e.target.checked; commit(); });   // explicit choice overrides the OS
  on('setLow', 'change', e => { S.lowPower = !!e.target.checked; commit(); });
  // text-size segmented buttons
  for (const k of ['s', 'm', 'l']) on('setText-' + k, 'click', () => { S.text = k; commit(); });
  // change-your-look row → the avatar cast picker (task 089)
  on('setAvatar', 'click', () => { closeSettings(); openAvatarPicker(); });

  // open / close
  on('btnSettings', 'click', () => { if (isOpen()) closeSettings(); else openSettings(); });
  on('setClose', 'click', () => closeSettings());
  // tap-outside-to-close, but only when the gesture STARTED on the backdrop too
  // (the touch-interaction modal-close trap, PITFALLS / task 078). The gear is a
  // button so it opens on a click and no stray release closes us — but the guard
  // is cheap insurance.
  const card = $('settings');
  if (card) {
    let downOnBackdrop = false;
    card.addEventListener('pointerdown', e => { downOnBackdrop = (e.target === card); });
    card.addEventListener('click', e => { if (e.target === card && downOnBackdrop) closeSettings(); });
  }
  // Esc: toggle. CAPTURE phase so this runs BEFORE the framework's bubble-phase
  // Esc handler (which closes the tote/shop) — otherwise Esc-to-close-a-card would
  // find "nothing open" a beat later and pop settings up in the same keypress. In
  // capture we see the true pre-state: if any other card is up, we defer to its
  // own Esc; else we toggle settings.
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (isOpen()) { closeSettings(); return; }
    if (anyCardOpen()) return;
    openSettings();
  }, true);

  // auto-follow the OS reduced-motion query while the player hasn't chosen
  try {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const onch = () => { if (S.reducedMotion == null) { applySettings(); if (isOpen()) syncControls(); } };
    if (mq.addEventListener) mq.addEventListener('change', onch); else if (mq.addListener) mq.addListener(onch);
  } catch (e) { }
}

// initSettings() — main.js calls this once, before the first frame: load the
// saved prefs, apply them (so DPR / audio / look feel are correct from frame 1),
// wire the card, and expose the debug snapshot.
export function initSettings() {
  load();
  applySettings();
  wire();
  try { window.__hd = window.__hd || {}; window.__hd.settings = snapshot; } catch (e) { }
}
