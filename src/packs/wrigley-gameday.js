// =====================================================================
//  WRIGLEY GAME-DAY — the event cycle that makes the Wrigleyville cell
//  feel like a live ballgame. ONE deterministic ~7.5-minute loop, driven
//  by a pack-local clock that only advances while the player stands in the
//  cell (activeCell()==='wrigleyville'). The lakefront hears NOTHING.
//
//    · ambient bed        crowd murmur + distant organ + bat cracks,
//                         volume by distance from the stadium center
//    · minute ~2  STRETCH  7th-inning stretch (sing-along, organ melody)
//    · minute ~4  HOMER    a ball onto Waveland — first come, first grab
//    · minute ~6.5 WIN     roar → the W flag hoists → 'Go Cubs Go'
//    · marquee rotation    all cycle long (suspended during the WIN)
//    · ivy gag             random, near the Sheffield knothole / a rooftop
//
//  ALL audio is 100% synthesized WebAudio via getAudioCtx(); every call
//  guards on actx (null until the game starts). No per-frame allocations.
//  Own seed (1908 — the last Cubs title before 2016); never the core rng.
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, registerUpdate, addInteraction, toast, journalSection,
         state, screenFx, holdItem, getAudioCtx, createChibi, bakeChibiRig } from '../framework.js';
import { toon, bmat, mulberry32, pointsMat, clamp, game } from '../core.js';
import { activeCell } from '../cells.js';
import { wrigleyRoot } from '../wrigley/index.js';
import { marqueeSetText, raiseW } from '../wrigley/stadium.js';
import { swing, PLATE } from '../wrigley/fieldplay.js';
import { clarkX } from '../data/wrigleyville.js';

// -------------------------- determinism --------------------------------
const R = mulberry32(1908);
const rr = (a, b) => a + (b - a) * R();

// ------------------------------ tuning ---------------------------------
const CENTER = { x: -240, z: -481 };      // stadium center (audio distance ref)
const CYCLE = 450;                        // full game-day loop (~7.5 min)
const T_STRETCH = 120, T_HOMER = 240, T_WIN = 390;
const BALL_G = 20, BALL_GROUND = 0.18;    // ball gravity + resting height
const MARQ = ['GAME IN PROGRESS', 'WELCOME MAYOR', 'THIS IS THE YEAR',
              'CHUBS VS SOCKS · 7:05',   // matchup line per the real board (IMG_2339), task 012
              'OPE', 'HOT DOGS · NO KETCHUP', 'FLY THE DUB'];

// volume scale by player distance from the stadium center:
// full within 60 m, easing to 0.25x beyond 130 m.
function distScale(px, pz) {
  const d = Math.hypot(px - CENTER.x, pz - CENTER.z);
  if (d <= 60) return 1;
  if (d >= 130) return 0.25;
  return 1 - 0.75 * (d - 60) / 70;
}

// =====================================================================
//  synthesized audio (all guarded on getAudioCtx().actx)
// =====================================================================
let bed = null;                           // persistent crowd-murmur bed
function ensureBed() {
  if (bed) return;
  const A = getAudioCtx(); if (!A.actx) return;
  const src = A.actx.createBufferSource(); src.buffer = A.noiseBuf; src.loop = true;
  const lp = A.actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 205; lp.Q.value = 0.5;
  const g = A.actx.createGain(); g.gain.value = 0.0001;
  src.connect(lp); lp.connect(g); g.connect(A.sfxBus); src.start();
  bed = { g };
}
function roar(dur, peak) {
  const A = getAudioCtx(); if (!A.actx) return; const t = A.actx.currentTime;
  const src = A.actx.createBufferSource(); src.buffer = A.noiseBuf; src.loop = true;
  const f = A.actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.4;
  const g = A.actx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + dur * 0.35);
  g.gain.linearRampToValueAtTime(peak * 0.8, t + dur * 0.62);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(A.sfxBus); src.start(t); src.stop(t + dur + 0.1);
}
function crack(vol, bigRoar) {
  swing();                                                   // the bat connects on the field (fieldplay)
  const A = getAudioCtx(); if (!A.actx) return; const t = A.actx.currentTime;
  // sharp bat crack — quick high noise transient
  const src = A.actx.createBufferSource(); src.buffer = A.noiseBuf;
  const f = A.actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 1.1;
  const g = A.actx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.2 * vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  src.connect(f); f.connect(g); g.connect(A.sfxBus); src.start(t); src.stop(t + 0.12);
  // woody knock underneath
  const o = A.actx.createOscillator(), og = A.actx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.08);
  og.gain.setValueAtTime(0.12 * vol, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(og); og.connect(A.sfxBus); o.start(t); o.stop(t + 0.12);
  // crowd swell in response
  if (bigRoar) roar(3.6, 0.16 * vol); else roar(1.3, 0.045 * vol);
}
function thud() {  // soft ground-bounce
  const A = getAudioCtx(); if (!A.actx) return;
  A.noiseHit(A.actx.currentTime, 0.08, 'lowpass', 300, 0.8, 0.06);
}
// distant organ arpeggio (ambient) — triangle + square, quiet, on musicBus
function organArp(vol) {
  const A = getAudioCtx(); if (!A.actx) return; const t0 = A.actx.currentTime;
  const mel = [62, 66, 69, 74, 69], dur = 0.22;
  mel.forEach((m, i) => {
    const f = A.mf(m), t = t0 + i * dur;
    for (const [type, det, g0] of [['triangle', 0, 0.05 * vol], ['square', 6, 0.02 * vol]]) {
      const o = A.actx.createOscillator(), g = A.actx.createGain();
      o.type = type; o.frequency.value = f; o.detune.value = det;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(g0, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.4);
      o.connect(g); g.connect(A.musicBus); o.start(t); o.stop(t + dur * 1.5);
    }
  });
}
// full first phrase of "Take Me Out to the Ball Game" (public domain, 1908),
// ending on D4 — triangle+square organ voices like the ride pack's organSting.
function organMelody() {
  const A = getAudioCtx(); if (!A.actx) return; const t0 = A.actx.currentTime;
  const mel = [60, 60, 69, 67, 64, 67, 62];               // C C A G E G D
  const dur = [0.34, 0.34, 0.52, 0.34, 0.34, 0.34, 0.85];
  let t = t0;
  for (let i = 0; i < mel.length; i++) {
    const f = A.mf(mel[i]), d = dur[i];
    for (const [type, det, g0] of [['triangle', 0, 0.14], ['square', 4, 0.035], ['triangle', -6, 0.05]]) {
      const o = A.actx.createOscillator(), g = A.actx.createGain();
      o.type = type; o.frequency.value = f; o.detune.value = det;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(g0, t + 0.03);
      g.gain.setValueAtTime(g0, t + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(A.musicBus); o.start(t); o.stop(t + d + 0.05);
    }
    t += d;
  }
}
// "Go, Cubs, go!  Go, Cubs, go!" (G G E G, G G E G) — 8 warm notes with light
// chorus doubling from the nearest Clark-St bar doorway; pan/volume by distance,
// bandpassed-noise crowd singing pulsing at the note rhythm underneath.
function goCubsGo(px, pz) {
  const A = getAudioCtx(); if (!A.actx) return; const t0 = A.actx.currentTime;
  let barX = clarkX(-450) - 16, barZ = -450, bd = 1e9;
  for (const z of [-480, -460, -440, -420]) {
    const bx = clarkX(z) - 16, d = Math.hypot(bx - px, z - pz);
    if (d < bd) { bd = d; barX = bx; barZ = z; }
  }
  const vol = clamp(1 - bd / 70, 0.2, 1);
  let dest = A.sfxBus;
  const panner = A.actx.createStereoPanner ? A.actx.createStereoPanner() : null;
  if (panner) { panner.pan.value = clamp((barX - px) / 28, -1, 1); panner.connect(A.sfxBus); dest = panner; }
  const mel = [67, 67, 64, 67, 67, 67, 64, 67];
  const dur = [0.3, 0.3, 0.36, 0.5, 0.3, 0.3, 0.36, 0.7];
  let t = t0;
  for (let i = 0; i < mel.length; i++) {
    const f = A.mf(mel[i]), d = dur[i];
    for (const [type, det, g0] of [['triangle', 0, 0.12 * vol], ['triangle', 7, 0.06 * vol], ['square', 3, 0.03 * vol]]) {
      const o = A.actx.createOscillator(), g = A.actx.createGain();
      o.type = type; o.frequency.value = f; o.detune.value = det;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(g0, t + 0.03);
      g.gain.setValueAtTime(g0, t + d * 0.65); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + 0.05);
    }
    // crowd singing pulse under the note
    const src = A.actx.createBufferSource(); src.buffer = A.noiseBuf;
    const nf = A.actx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 620; nf.Q.value = 0.8;
    const ng = A.actx.createGain();
    ng.gain.setValueAtTime(0.0001, t); ng.gain.linearRampToValueAtTime(0.05 * vol, t + 0.05);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + d * 0.95);
    src.connect(nf); nf.connect(ng); ng.connect(dest); src.start(t, 0, d);
    t += d;
  }
}

// =====================================================================
//  meshes (all attached to wrigleyRoot — hidden when the cell is inactive)
// =====================================================================
let ballGrp = null, heldBall = null, fielder = null;
function buildBall() {
  ballGrp = new THREE.Group();
  ballGrp.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), bmat(0xffffff)));
  // a small warm glow point rides along with the ball
  const gp = new Float32Array([0, 0, 0]), aC = new Float32Array([1, 0.96, 0.85]), aS = new Float32Array([6.5]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(gp, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(aC, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(aS, 1));
  ballGrp.add(new THREE.Points(geo, pointsMat()));
  ballGrp.visible = false;
  wrigleyRoot.add(ballGrp);
}
function buildHeldBall() {
  heldBall = new THREE.Mesh(new THREE.SphereGeometry(0.12, 9, 7), bmat(0xffffff));
}
function buildFielder() {   // posed outfielder, visible through the knothole
  const { group, parts } = createChibi({ suit: 0x2452a0, pants: 0x20242b, skin: 0xcaa07a, hair: 0x2a2018, scale: 0.9 });
  group.position.set(-212, 0, -470); group.rotation.y = Math.PI / 2;
  parts.armL.rotation.x = -2.5; parts.armR.rotation.x = -2.5;    // both arms up (shrug/appeal)
  bakeChibiRig(group, parts);                                    // static (only .visible toggles) — baked → 1 draw
  group.visible = false;
  wrigleyRoot.add(group);
  fielder = group;
}

// =====================================================================
//  cycle state
// =====================================================================
let cyc = 0;
const fired = { stretch: false, homer: false, win: false };
let marqIdx = 0, marqT = 0;
let organT = 20, crackT = 8;
let ivyT = 60, ivyShrugT = 0;
// stretch
let stretchOn = false, stretchT = 0, stretchUsed = false, singZone = null;
// homer / ball
const ball = { active: false, phase: '', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, bounces: 0, life: 0 };
let ballInter = null, heldClearT = 0;
// win
let winOn = false, winT = 0, winHook = false;
// SESSION-SCOPED (task 103): the win notification (HUD toast) fires at most
// once per page load. The win CYCLE still repeats every ~7.5 min in-cell — flag,
// marquee, roar all celebrate each time — but the toast is a one-time beat. A
// plain module-level flag (NOT store.js): deliberately not persisted, so a
// reload greets a returning fan with the banner again.
let winToastShown = false;

// ---------------------------- 7th-inning stretch -----------------------
function startStretch() {
  organArp(1);
  toast('7TH INNING STRETCH', 'join in near the park — E');
  stretchOn = true; stretchT = 0; stretchUsed = false;
  singZone = addInteraction({ x: CENTER.x, z: CENTER.z, r: 60, label: 'sing along', priority: 6, onUse: onSing });
}
function onSing() {
  if (stretchUsed) return; stretchUsed = true;
  screenFx.flash('#ffe1a8', 550);          // soft warm flash — the mayor joins in
  organMelody();
  state.stretchesSung = (state.stretchesSung || 0) + 1;
  toast('♪ TAKE me out to the BALL game');
  toast('♪ take me out with the crowd');
  toast('♪ buy me some peanuts & cracker jack');
  toast('♪ root, root, root for the CHUBBIES', "one, two, three strikes — you're out!");
  if (singZone) { singZone.remove(); singZone = null; }
}
function endStretch() { stretchOn = false; if (singZone) { singZone.remove(); singZone = null; } }

// -------------------------------- homer --------------------------------
function startHomer() {
  crack(1, true);
  toast('HOMER!', 'onto Waveland — get the ball!');
  state.wrigleyHomers = (state.wrigleyHomers || 0) + 1;
  const sx = PLATE.x, sy = PLATE.y, sz = PLATE.z;            // off the bat at the plate (fieldplay)
  const tx = -237 + rr(-2, 2), tz = -557.5 + rr(-1.5, 1.5);  // deterministic Waveland target
  const T = 3.0;                                             // deeper bowl — arc clears the wall + bleacher crown (apex ~23)
  ball.x = sx; ball.y = sy; ball.z = sz;
  ball.vx = (tx - sx) / T; ball.vz = (tz - sz) / T;
  ball.vy = (BALL_GROUND - sy + 0.5 * BALL_G * T * T) / T;
  ball.bounces = 0; ball.life = 0; ball.phase = 'flight'; ball.active = true;
  ballGrp.visible = true; ballGrp.position.set(sx, sy, sz);
  state.wrigleyBall = { live: true, x: sx, z: sz, t: game.tNow };
}
function onBallRest() {
  ball.life = 0;
  ballInter = addInteraction({ x: ball.x, z: ball.z, r: 2.5, label: 'grab the ball', priority: 7, onUse: onGrab });
}
function onGrab() {
  state.wrigleyBallsCaught = (state.wrigleyBallsCaught || 0) + 1;
  toast('BALL!', 'a Waveland souvenir');
  holdItem(heldBall); heldClearT = game.tNow + 3;
  finishBall();
}
function finishBall() {
  ball.active = false; ball.phase = 'done'; if (ballGrp) ballGrp.visible = false;
  if (ballInter) { ballInter.remove(); ballInter = null; }
  if (state.wrigleyBall) state.wrigleyBall.live = false;
}
function updBall(dt) {
  if (!ball.active) return;
  // another pack (a ball-hawk NPC) grabbed it first → clean up quietly
  if (state.wrigleyBall && !state.wrigleyBall.live) { finishBall(); return; }
  if (ball.phase === 'rest') {
    ball.life += dt;
    if (ball.life >= 35) {                                   // the ivy keeps what it takes
      toast('THE IVY KEEPS WHAT IT TAKES', 'the ball rolled into the vines');
      finishBall();
    }
    return;
  }
  // flight + bounces + roll
  ball.vy -= BALL_G * dt;
  ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.z += ball.vz * dt;
  if (ball.y <= BALL_GROUND) {
    ball.y = BALL_GROUND;
    if (ball.vy < 0) {
      const hs = Math.hypot(ball.vx, ball.vz);
      if (ball.bounces < 3 && (ball.vy < -2.0 || hs > 1.3)) {
        ball.vy = -ball.vy * 0.42; ball.vx *= 0.5; ball.vz *= 0.5; ball.bounces++; thud();
      } else { ball.vy = 0; }
    }
    // rolling friction once on the ground
    const fr = Math.exp(-3.0 * dt); ball.vx *= fr; ball.vz *= fr;
    if (Math.hypot(ball.vx, ball.vz) < 0.4) { ball.vx = ball.vz = 0; ball.phase = 'rest'; onBallRest(); }
  }
  ballGrp.position.set(ball.x, ball.y, ball.z);
  if (state.wrigleyBall) { state.wrigleyBall.x = ball.x; state.wrigleyBall.z = ball.z; }
}

// -------------------------------- cubs win -----------------------------
function startWin() {
  winOn = true; winT = 0; winHook = false;
  state.cubsWinsSeen = (state.cubsWinsSeen || 0) + 1;
  roar(5.0, 0.2);
  marqueeSetText('CHUBS WIN! CHUBS WIN!');
  if (!winToastShown) { winToastShown = true; toast('CHUBS WIN!', 'fly the dub'); }
}

// ------------------------------ cycle reset ----------------------------
function onCycleReset() {
  fired.stretch = fired.homer = fired.win = false;
  winOn = false; winHook = false; raiseW(0);                 // flag lowers the morning after
  marqueeSetText(MARQ[marqIdx]);
  if (stretchOn) endStretch();
  if (ball.active) finishBall();
}

// dev cycle-jump: ?gd=stretch|homer|win drops the clock right at an event
// (earlier events are marked already-fired so they don't all trigger at once).
function jumpTo(T) {
  cyc = T;
  if (T_STRETCH < T) fired.stretch = true;
  if (T_HOMER < T) fired.homer = true;
  if (T_WIN < T) fired.win = true;
}

// =====================================================================
//  wire it up
// =====================================================================
onWorldReady(() => {
  buildBall(); buildHeldBall(); buildFielder();
  state.wrigleyHomers = state.wrigleyHomers || 0;
  state.wrigleyBallsCaught = state.wrigleyBallsCaught || 0;
  state.stretchesSung = state.stretchesSung || 0;
  state.cubsWinsSeen = state.cubsWinsSeen || 0;
  journalSection('wrigleyville', 'Wrigleyville', () => `
    <div class="jrow"><span>Red Line rides</span><b>${state.redlineRides || 0}</b></div>
    <div class="jrow"><span>Homers chased</span><b>${state.wrigleyHomers || 0}</b></div>
    <div class="jrow"><span>Balls caught</span><b>${state.wrigleyBallsCaught || 0}</b></div>
    <div class="jrow"><span>Stretches sung</span><b>${state.stretchesSung || 0}</b></div>
    <div class="jrow"><span>Chubs wins seen</span><b>${state.cubsWinsSeen || 0}</b></div>
    <div class="jrow"><span>Fast-pitch best</span><b>${state.sluggersBest != null ? state.sluggersBest + ' / 5' : '—'}</b></div>
    <div class="jrow"><span>Peanut bags</span><b>${state.peanutBags || 0}</b></div>`);

  const gd = new URLSearchParams(location.search).get('gd');
  if (gd === 'stretch') jumpTo(T_STRETCH);
  else if (gd === 'homer') jumpTo(T_HOMER);
  else if (gd === 'win') jumpTo(T_WIN);

  registerUpdate((dt, t, pl) => {
    // gate EVERYTHING on being in the cell — the lakefront must hear nothing
    if (activeCell() !== 'wrigleyville') {
      if (bed) bed.g.gain.value += (0 - bed.g.gain.value) * Math.min(1, dt * 4);
      return;
    }
    if (dt < 0) dt = 0;

    // --- master cycle clock (advances only in-cell) ---
    cyc += dt;
    if (cyc >= CYCLE) { cyc -= CYCLE; onCycleReset(); }
    if (!fired.stretch && cyc >= T_STRETCH) { fired.stretch = true; startStretch(); }
    if (!fired.homer && cyc >= T_HOMER) { fired.homer = true; startHomer(); }
    if (!fired.win && cyc >= T_WIN) { fired.win = true; startWin(); }

    // --- ambient crowd bed (murmur, swelling ~every 20 s, by distance) ---
    ensureBed();
    if (bed) {
      const tgt = 0.055 * distScale(pl.x, pl.z) * (0.65 + 0.35 * Math.sin(t * (2 * Math.PI / 20)));
      bed.g.gain.value += (tgt - bed.g.gain.value) * Math.min(1, dt * 3);
    }
    // --- ambient one-shots ---
    organT -= dt; if (organT <= 0) { organArp(distScale(pl.x, pl.z)); organT = 42 + rr(0, 10); }
    crackT -= dt; if (crackT <= 0) { crack(0.5 * distScale(pl.x, pl.z), false); crackT = 12 + rr(0, 13); }

    // --- marquee rotation (held during the WIN window) ---
    if (!winOn) {
      marqT += dt;
      if (marqT >= 35) { marqT -= 35; marqIdx = (marqIdx + 1) % MARQ.length; marqueeSetText(MARQ[marqIdx]); }
    }

    // --- stretch window ---
    if (stretchOn) { stretchT += dt; if (stretchT >= 40) endStretch(); }

    // --- ball physics ---
    updBall(dt);

    // --- cubs win: hoist the W over 4 s, then the Go Cubs Go hook ---
    if (winOn) {
      winT += dt;
      raiseW(clamp(winT / 4, 0, 1));
      if (!winHook && winT >= 1.6) { winHook = true; goCubsGo(pl.x, pl.z); }
    }

    // --- ivy gag (random, near the knothole or up on a rooftop) ---
    ivyT -= dt;
    if (ivyT <= 0) {
      ivyT = 90 + rr(0, 30);
      if (Math.hypot(pl.x + 200, pl.z + 469) < 25 || pl.y > 5) {
        toast('ground-rule double', 'the ivy keeps what it takes');
        if (fielder) { fielder.visible = true; ivyShrugT = 3.2; }
      }
    }
    if (ivyShrugT > 0) { ivyShrugT -= dt; if (ivyShrugT <= 0 && fielder) fielder.visible = false; }

    // --- clear the briefly-held souvenir ball ---
    if (heldClearT && game.tNow >= heldClearT) { holdItem(null); heldClearT = 0; }
  });

  // debug/tools only (task 103 gate E2E): fire a WIN out-of-band to prove the
  // notification is one-per-session. The real cycle repeats every ~7.5 min.
  try {
    window.__hd = window.__hd || {};
    window.__hd.gameday = { forceWin: () => startWin(), get winToastShown() { return winToastShown; } };
  } catch (e) { }
});
