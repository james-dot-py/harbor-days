// =====================================================================
//  SLUGGERS — the batting-cage minigame on the Clark St bar row.
//  A netted fast-pitch tunnel sits beside the SLUGGERS storefront on the
//  west edge of the Clark corridor (VILLAGE_W.clarkBars[0], z −488…−472).
//  Step onto the plate and time your swing to the machine's wind-up light:
//  5 pitches, a CRACK for every ball you catch in the last sliver of flight.
//
//  Rules honoured (owner's cell contract):
//   · ALL setup in onWorldReady; own mulberry32(1985) (never the world rng).
//   · toon()/bmat() materials only; meshes attach to wrigleyRoot (hidden when
//     the cell is inactive); everything gates on activeCell()==='wrigleyville'.
//   · 100% synthesized WebAudio via getAudioCtx(), guarded on actx + ramped.
//   · The cage sits on the corridor's west lip: its frame posts + the machine
//     are collided; the tunnel intrudes ≤ ~1.5 m into the walkable Clark ±8.
//   · Control is SOFT-held: input is never disabled — stepping in snaps the
//     mayor onto the plate once; walking away (or E outside a pitch) cancels.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, registerUpdate, addInteraction, toast, state, getAudioCtx } from '../framework.js';
import { toon, bmat, mulberry32, lerp, clamp } from '../core.js';
import { keys, joy } from '../input.js';
import { activeCell } from '../cells.js';
import { wrigleyRoot } from '../wrigley/index.js';
import { clarkX } from '../data/wrigleyville.js';
import { collide } from '../props.js';

// -------------------------- determinism --------------------------------
const R = mulberry32(1985);
const rr = (a, b) => a + (b - a) * R();

// ------------------------------ geometry -------------------------------
const TH = Math.atan(0.28);                         // Clark diagonal heading
const CS = Math.cos(TH), SN = Math.sin(TH);
const CAGE_X = clarkX(-480) - 8.5;                  // tunnel centre, just west of the curb
const CAGE_Z = -480;
// local(lx,lz) under the cage's Y-rotation -> world [x,z]
const L2W = (lx, lz) => [CAGE_X + lx * CS + lz * SN, CAGE_Z - lx * SN + lz * CS];

// ball lane (local): from the machine muzzle to the plate
const MACH = [1.0, 1.15, 2.35], PLATE = [1.0, 1.05, -1.6];
const PAD = L2W(1.0, -1.8);                         // where the mayor stands (offset ≈ clarkX−7.46)

// ------------------------------ tuning ---------------------------------
const N_PITCH = 5;
const WIND = 0.5;        // wind-up tell (glow brightens) before each pitch
const HITWIN = 0.22;     // a swing lands only in the LAST 0.22 s of flight
const HITFLY = 0.4;      // ball rocketing back into the net after a hit
const MISSFLY = 0.18;    // ball tucking into the mitt after a miss
const GAP = 0.55;        // beat between pitches

// =====================================================================
//  synthesized audio (all guarded on getAudioCtx().actx, all ramped)
// =====================================================================
function sThunk() {                                 // machine wind-up clunk
  const { actx, sfxBus, noiseBuf } = getAudioCtx(); if (!actx) return; const t = actx.currentTime;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(58, t + 0.12);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.13, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.18);
  if (noiseBuf) {
    const s = actx.createBufferSource(); s.buffer = noiseBuf;
    const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.8;
    const ng = actx.createGain();
    ng.gain.setValueAtTime(0.11, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    s.connect(f); f.connect(ng); ng.connect(sfxBus); s.start(t); s.stop(t + 0.12);
  }
}
function sWhoosh() {                                 // ball leaving the machine
  const { actx, sfxBus, noiseBuf } = getAudioCtx(); if (!actx || !noiseBuf) return; const t = actx.currentTime;
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type = 'bandpass';
  f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(1750, t + 0.3); f.Q.value = 0.7;
  const g = actx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + 0.42);
}
function sCrack() {                                  // bat CRACK (gameday recipe: noise transient + woody knock)
  const { actx, sfxBus, noiseBuf } = getAudioCtx(); if (!actx) return; const t = actx.currentTime;
  if (noiseBuf) {
    const s = actx.createBufferSource(); s.buffer = noiseBuf;
    const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 1.1;
    const g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + 0.12);
  }
  const o = actx.createOscillator(), og = actx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.08);
  og.gain.setValueAtTime(0.13, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(og); og.connect(sfxBus); o.start(t); o.stop(t + 0.12);
}
function sNet() {                                    // net-rustle tap after a hit
  const { actx, sfxBus, noiseBuf } = getAudioCtx(); if (!actx || !noiseBuf) return; const t = actx.currentTime;
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3000;
  const g = actx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + 0.2);
}
function sTick() {                                   // little "you got it" blip
  const { actx, sfxBus, mf } = getAudioCtx(); if (!actx) return; const t = actx.currentTime;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(mf ? mf(84) : 880, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.14);
}
function sMitt() {                                   // catcher's mitt thump on a miss
  const { actx, sfxBus, noiseHit } = getAudioCtx(); if (!actx) return; const t = actx.currentTime;
  if (noiseHit) noiseHit(t, 0.12, 'lowpass', 280, 0.9, 0.14);
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
  g.gain.setValueAtTime(0.11, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.18);
}

// =====================================================================
//  canvas sign  'SLUGGERS — FAST PITCH 25¢'
// =====================================================================
function signTex() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#0e0b13'; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 4; g.strokeRect(6, 6, 500, 116);
  g.textAlign = 'center';
  g.shadowColor = '#ff5545'; g.shadowBlur = 22; g.fillStyle = '#ff5545';
  g.font = '800 52px "Trebuchet MS",Arial,sans-serif';
  g.fillText('SLUGGERS', 256, 54); g.fillText('SLUGGERS', 256, 54);
  g.shadowBlur = 0; g.fillStyle = '#fff8e6';
  g.font = '700 30px "Trebuchet MS",Arial,sans-serif';
  g.fillText('FAST PITCH · 25¢', 256, 98);
  const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4; return tex;
}

// small instanced-mesh helper: items = [{p:[x,y,z], s?:[x,y,z], r?:[rx,ry,rz]}]
function inst(geo, mat, items) {
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
  items.forEach((it, i) => {
    E.set(it.r ? it.r[0] : 0, it.r ? it.r[1] : 0, it.r ? it.r[2] : 0); Q.setFromEuler(E);
    V.set(it.p[0], it.p[1], it.p[2]);
    S.set(it.s ? it.s[0] : 1, it.s ? it.s[1] : 1, it.s ? it.s[2] : 1);
    M.compose(V, Q, S); m.setMatrixAt(i, M);
  });
  m.instanceMatrix.needsUpdate = true; return m;
}

// =====================================================================
//  minigame state
// =====================================================================
let ball = null, glow = null, glowMat = null, inter = null;
const hitFrom = new THREE.Vector3();
const round = { on: false, idx: 0, phase: '', tmr: 0, dur: 0, hits: 0, resolved: false, prevE: false };

function glowSet(v) {                                // dim red -> hot yellow-white
  glowMat.color.setRGB(0.33 + 0.67 * v, 0.07 + 0.88 * v, 0.07 + 0.55 * v);
  glow.scale.setScalar(0.8 + 0.9 * v);
}
function ballSetK(k) {                               // machine -> plate, with a shallow arc
  ball.position.set(
    lerp(MACH[0], PLATE[0], k),
    lerp(MACH[1], PLATE[1], k) + Math.sin(k * Math.PI) * 0.12,
    lerp(MACH[2], PLATE[2], k));
}
function ballHitK(k) {                               // reversed up into the top/far net
  ball.position.set(
    lerp(hitFrom.x, 1.4, k),
    lerp(hitFrom.y, 2.3, k) + Math.sin(k * Math.PI) * 0.3,
    lerp(hitFrom.z, 2.2, k));
}
function movementPressed() {
  return keys.has('w') || keys.has('a') || keys.has('s') || keys.has('d') ||
    keys.has('arrowup') || keys.has('arrowdown') || keys.has('arrowleft') || keys.has('arrowright') || joy.len > 0.2;
}

function startRound(pl) {
  round.on = true; round.idx = 0; round.hits = 0;
  round.phase = 'wind'; round.tmr = 0; round.resolved = false;
  round.prevE = true;                               // the E that started us is HELD — not a swing edge
  ball.visible = false;
  inter.enabled = false;                            // suppress the prompt + re-fire while playing
  pl.vx = pl.vz = 0; pl.x = PAD[0]; pl.z = PAD[1];  // soft-snap onto the plate (once)
  glowSet(0);
  toast('FAST PITCH', 'E to swing — watch the machine light');
  sThunk();
}
function endRound() {
  round.on = false; round.phase = '';
  ball.visible = false; glowSet(0);
  inter.enabled = true;
}
function beginWind() { round.phase = 'wind'; round.tmr = 0; round.resolved = false; sThunk(); }
function beginFlight() {
  round.phase = 'flight'; round.tmr = 0; round.resolved = false;
  round.dur = 0.55 + rr(-0.12, 0.12);
  ball.visible = true; ballSetK(0); glowSet(1);
  sWhoosh();
}
function onHit() {
  round.resolved = true; round.hits++;
  sCrack(); sNet(); sTick();
  hitFrom.copy(ball.position);
  round.phase = 'hit'; round.tmr = 0; glowSet(0);
}
function onMiss() {
  round.resolved = true;
  sMitt(); ballSetK(1);
  round.phase = 'miss'; round.tmr = 0; glowSet(0);
}
function nextPitch() {
  round.idx++;
  if (round.idx >= N_PITCH) finishRound();
  else { round.phase = 'gap'; round.tmr = 0; }
}
function finishRound() {
  const h = round.hits;
  const tier = h >= 5 ? 'CUB FOR A DAY' : h === 4 ? 'bleacher power!' : h >= 2 ? 'season ticket holder' : "ope — pitcher's duel";
  toast(`${h} / 5`, tier);
  state.sluggersBest = Math.max(state.sluggersBest || 0, h);
  state.sluggersRounds = (state.sluggersRounds || 0) + 1;
  endRound();
}

// =====================================================================
//  build (onWorldReady — safe to touch wrigleyRoot / rng here)
// =====================================================================
onWorldReady(() => {
  state.sluggersBest = state.sluggersBest || 0;
  state.sluggersRounds = state.sluggersRounds || 0;

  const grp = new THREE.Group();
  grp.position.set(CAGE_X, 0, CAGE_Z); grp.rotation.y = TH;
  wrigleyRoot.add(grp);

  const dark = toon(0x1e1f24);

  // ---- frame: 6 posts (cylinders) + 4 top rails (boxes), 2 instanced draws ----
  grp.add(inst(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), dark, [
    { p: [-1.5, 1.3, -3] }, { p: [1.5, 1.3, -3] },
    { p: [-1.5, 1.3, 3] }, { p: [1.5, 1.3, 3] },
    { p: [-1.5, 1.3, 0] }, { p: [1.5, 1.3, 0] },
  ]));
  grp.add(inst(new THREE.BoxGeometry(1, 1, 1), dark, [
    { p: [-1.5, 2.6, 0], s: [0.09, 0.09, 6] }, { p: [1.5, 2.6, 0], s: [0.09, 0.09, 6] },
    { p: [0, 2.6, -3], s: [3, 0.09, 0.09] }, { p: [0, 2.6, 3], s: [3, 0.09, 0.09] },
  ]));

  // ---- netting: top + both sides + far end, merged to ONE translucent draw ----
  const netG = [];
  { const g = new THREE.PlaneGeometry(3, 6); g.rotateX(-Math.PI / 2); g.translate(0, 2.6, 0); netG.push(g); }      // roof
  { const g = new THREE.PlaneGeometry(6, 2.6); g.rotateY(Math.PI / 2); g.translate(1.5, 1.3, 0); netG.push(g); }   // east wall (street)
  { const g = new THREE.PlaneGeometry(6, 2.6); g.rotateY(Math.PI / 2); g.translate(-1.5, 1.3, 0); netG.push(g); }  // west wall (lot)
  { const g = new THREE.PlaneGeometry(3, 2.6); g.translate(0, 1.3, 3); netG.push(g); }                             // far end (behind machine)
  const net = new THREE.Mesh(
    BufferGeometryUtils.mergeBufferGeometries(netG, false),
    bmat(0xdfe6e6, { transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
  grp.add(net);

  // ---- pitching MACHINE at the far end (red box + angled barrel + glow) ----
  grp.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.8), toon(0xb0302a))
    .translateX(1.0).translateY(0.75).translateZ(2.9));
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 1.0, 10), toon(0x2a2c33));
  barrel.position.set(1.0, 1.12, 2.4); barrel.rotation.x = Math.PI / 2 - 0.16; grp.add(barrel);
  glowMat = bmat(0x551111);
  glow = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), glowMat);
  glow.position.set(1.0, 1.16, 2.1); grp.add(glow); glowSet(0);

  // ---- home-plate pad at the near end ----
  const shp = new THREE.Shape();
  shp.moveTo(-0.22, -0.18); shp.lineTo(0.22, -0.18); shp.lineTo(0.22, 0.06);
  shp.lineTo(0, 0.26); shp.lineTo(-0.22, 0.06); shp.closePath();
  const plate = new THREE.Mesh(new THREE.ShapeGeometry(shp), toon(0xf0f0f0));
  plate.rotation.x = -Math.PI / 2; plate.position.set(1.0, 0.02, -1.6); grp.add(plate);

  // ---- leaning bat rack, OUTSIDE the tunnel on the lot side ----
  const rack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.7), toon(0x5c4327));
  rack.position.set(-1.95, 0.55, -1.5); rack.rotation.z = 0.12; grp.add(rack);
  grp.add(inst(new THREE.CylinderGeometry(0.03, 0.05, 1.0, 6), toon(0xb98a52), [
    { p: [-1.98, 0.55, -1.75], r: [0.28, 0, 0.16] },
    { p: [-1.9, 0.55, -1.5], r: [0.22, 0, -0.1] },
    { p: [-2.03, 0.55, -1.28], r: [0.32, 0, 0.06] },
  ]));

  // ---- signboard on the street-facing frame ----
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.75), bmat(0xffffff, { map: signTex() }));
  sign.position.set(1.5, 2.86, -2.1); sign.rotation.y = Math.PI / 2; grp.add(sign);

  // ---- the ball (child of the cage; animated in LOCAL coords) ----
  ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), bmat(0xf6f4ee));
  ball.visible = false; grp.add(ball);

  // ---- colliders: 4 corner posts (r 0.5) + machine (r 0.8) ----
  for (const lx of [-1.5, 1.5]) for (const lz of [-3, 3]) { const [wx, wz] = L2W(lx, lz); collide(wx, wz, 0.5); }
  { const [mx, mz] = L2W(1.0, 2.9); collide(mx, mz, 0.8); }

  // ---- the plate interaction ----
  inter = addInteraction({ x: PAD[0], z: PAD[1], r: 2.2, label: 'step in — fast pitch, 5 balls', onUse: startRound });

  // ------------------------------ per frame --------------------------- //
  registerUpdate((dt, t, pl) => {
    if (activeCell() !== 'wrigleyville') { if (round.on) endRound(); return; }
    if (!round.on) return;
    if (dt < 0) dt = 0;

    const eDown = keys.has('e');
    const eEdge = eDown && !round.prevE;
    round.prevE = eDown;

    if (movementPressed()) { endRound(); return; }                                  // walked away → quiet cancel

    round.tmr += dt;

    if (round.phase === 'wind') {
      glowSet(clamp(round.tmr / WIND, 0, 1));
      if (eEdge) { endRound(); return; }                                            // E outside a pitch → cancel
      if (round.tmr >= WIND) beginFlight();
      return;
    }
    if (round.phase === 'flight') {
      ballSetK(clamp(round.tmr / round.dur, 0, 1));
      const inWin = round.tmr >= round.dur - HITWIN;
      if (eEdge && !round.resolved) { inWin ? onHit() : onMiss(); return; }          // press: in-window = hit, early = miss
      if (!round.resolved && round.tmr >= round.dur) onMiss();                       // no press = miss
      return;
    }
    if (round.phase === 'hit') {
      ballHitK(clamp(round.tmr / HITFLY, 0, 1));
      if (round.tmr >= HITFLY) { ball.visible = false; nextPitch(); }
      return;
    }
    if (round.phase === 'miss') {
      if (round.tmr >= MISSFLY) { ball.visible = false; nextPitch(); }
      return;
    }
    if (round.phase === 'gap') {
      if (eEdge) { endRound(); return; }                                            // E between pitches → cancel
      if (round.tmr >= GAP) beginWind();
      return;
    }
  });
});
