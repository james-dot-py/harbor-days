// =====================================================================
//  DELIGHT — small ambient life that makes Belmont Harbor feel lovingly
//  crafted. Three cozy, purely-decorative effects, all per-frame:
//
//   1) DRIFTING PETALS  — ~36 instanced soft-pink cherry-blossom petals
//      that drift on a northwest breeze over the LAND (park lawns) in a
//      moving box around the player. Slow fall (~0.5 m/s) + a sideways
//      sine sway, a gentle 3-axis tumble, and a shrink-to-nothing in the
//      last half-metre before they respawn up top. Petals rolled over
//      water (not on LAND) simply stay invisible that cycle, so they read
//      as sparse & dreamy near the shore. 1 draw call (InstancedMesh).
//
//   2) BUTTERFLIES      — 5 pastel butterflies (peach / lavender / pale
//      yellow): 3 in the AIDS Garden (x92..98, z115..124), 2 on the Bird
//      Sanctuary lawn (x60..75, z-390..-400). Two hinged wings flap
//      about the body axis; a lazy sum-of-sines wander with a small y bob
//      (0.6..1.4 m). Walk within ~1.2 m and one flutters up & ~1.8 m away
//      (repulsion with hysteresis), then resumes. 2 draw calls (bodies +
//      wings, both instanced).
//
//   3) GEESE FLYOVER    — every 100..170 s a V of 7 dark goose silhouettes
//      glides high (y~36) across the whole (tall) map, N->S or reverse, in
//      ~40 s with a slow deep wing flap, then despawns. One soft distant 2-note
//      honk on entry IF audio is running (synth, sfxBus, actx null-guard).
//      2 draw calls (bodies + wings, both instanced).
//
//  Budget: 5 added draw calls total. Everything is set up inside
//  onWorldReady and driven by a single registerUpdate with fully HOISTED
//  scratch objects — ZERO per-frame allocation (this pack is per-frame
//  heavy, so that is a hard requirement). No shared world rng is touched;
//  these are transient ambient effects so Math.random / per-load variation
//  is intentional. Coords: 1u=1m, +z south, -z north, +x east (lake).
//
//  DEV: ?geesetest=1 forces the first goose flyover 2 s after load, spawning
//  in the southern sky and heading north so it lands in-view for the default
//  (150,150) spawn camera (which looks south). Harmless in prod; kept for
//  regression screenshots.
// =====================================================================
import { onWorldReady, registerUpdate, getAudioCtx } from '../framework.js';
import * as THREE from 'three';
import { scene, toon, pip } from '../core.js';
import { LAND } from '../coast.js';

// ---------------------------------------------------------------------
//  hoisted scratch — reused every frame, never allocated in the loop
// ---------------------------------------------------------------------
const _m = new THREE.Matrix4(), _mW = new THREE.Matrix4(), _mL = new THREE.Matrix4();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3(), _s = new THREE.Vector3(), _off = new THREE.Vector3();
const _col = new THREE.Color();
const _one = new THREE.Vector3(1, 1, 1), _zero = new THREE.Vector3(0, 0, 0);
const _mirror = new THREE.Vector3(-1, 1, 1);   // mirror geometry across local X (right wing)

// =====================================================================
//  1) PETALS
// =====================================================================
const NPET = 36, PBOX = 18, PTOP = 4.3, PGND = 0.05;   // count, half-box, top, ground
const WIND_X = 0.18, WIND_Z = 0.14, SWAY = 0.28;        // NW breeze -> drift toward +x/+z
const petalState = [];
let petals = null;

function respawnPetal(p, player) {
  p.y = PTOP + Math.random() * 0.6;
  p.x = player.x + (Math.random() * 2 - 1) * PBOX;
  p.z = player.z + (Math.random() * 2 - 1) * PBOX;
  p.vis = pip(p.x, p.z, LAND);                 // only over land (park lawns)
  p.sp = 0.4 + Math.random() * 0.25;
}

// =====================================================================
//  2) BUTTERFLIES
// =====================================================================
const BFLY_HOMES = [
  [95, 118], [98, 124], [92, 115],             // AIDS Garden (beds x60-130, z60-180)
  [60, -390], [75, -400],                      // Bird Sanctuary lawn
];
const WING_COLS = [0xffd6b0, 0xdcc7ff, 0xfff2ac, 0xffd6b0, 0xdcc7ff]; // peach / lavender / pale yellow
const BODY_S = new THREE.Vector3(0.03, 0.03, 0.12);
const BFLY = [];
let bBodies = null, bWings = null;

// =====================================================================
//  3) GEESE
// =====================================================================
const GEESE_TEST = /[?&]geesetest=1/.test(location.search);
const GEESE_Y = 36;
const GBODY_S = new THREE.Vector3(0.16, 0.13, 0.6);
const GFORM = [                                // V formation, local (+z = forward)
  [0, 0, 0],
  [1.4, 0.15, -1.6], [-1.4, 0.15, -1.6],
  [2.8, 0.30, -3.2], [-2.8, 0.30, -3.2],
  [4.2, 0.45, -4.8], [-4.2, 0.45, -4.8],
];
const geese = { active: false, timer: 0, z: 0, zEnd: 0, dir: 1, speed: 12, baseX: 0, firstTest: GEESE_TEST };
let gBodies = null, gWings = null;

function geeseHonk() {
  const ac = getAudioCtx(); if (!ac.actx) return;   // silent until the user starts audio
  const { actx, sfxBus } = ac, t = actx.currentTime;
  [[0, 300], [0.42, 360]].forEach(([dl, f]) => {    // two soft nasal honks, distant + quiet
    const o = actx.createOscillator(), g = actx.createGain(), lp = actx.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f * 1.05, t + dl);
    o.frequency.exponentialRampToValueAtTime(f * 0.88, t + dl + 0.2);
    lp.type = 'lowpass'; lp.frequency.value = 850;  // distance = muffled
    g.gain.setValueAtTime(0.0001, t + dl);
    g.gain.linearRampToValueAtTime(0.05, t + dl + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dl + 0.34);
    o.connect(lp); lp.connect(g); g.connect(sfxBus);
    o.start(t + dl); o.stop(t + dl + 0.4);
  });
}

function startGeese(player) {
  const test = geese.firstTest;
  geese.firstTest = false;
  geese.dir = test ? -1 : (Math.random() < 0.5 ? 1 : -1);
  if (test) { geese.z = 250; geese.zEnd = -840; }            // southern sky -> off the north edge (in view of spawn)
  else if (geese.dir > 0) { geese.z = -840; geese.zEnd = 412; }  // north edge -> south edge (Diversey corner)
  else { geese.z = 412; geese.zEnd = -840; }                 // south edge -> north edge
  geese.speed = Math.abs(geese.zEnd - geese.z) / 42;         // whole (tall) map in ~40 s
  geese.baseX = Math.max(40, Math.min(200, player.x));       // pass roughly overhead
  geese.active = true;
  gBodies.visible = gWings.visible = true;
  geese.timer = 100 + Math.random() * 70;                    // next natural flyover
  geeseHonk();
}

// ---------------------------------------------------------------------
//  shape geometry helpers
// ---------------------------------------------------------------------
function bflyWingGeo() {          // one wing hinged at origin, extends +x
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.02, 0.11, 0.16, 0.15, 0.21, 0.05);
  s.bezierCurveTo(0.25, -0.02, 0.20, -0.11, 0.12, -0.11);
  s.bezierCurveTo(0.05, -0.11, 0.02, -0.05, 0, 0);
  return new THREE.ShapeGeometry(s);
}
function gooseWingGeo() {         // one swept goose wing hinged at origin, extends +x
  const s = new THREE.Shape();
  s.moveTo(0, 0.06);
  s.lineTo(0.55, 0.14);
  s.lineTo(1.15, 0.05);
  s.lineTo(0.9, -0.04);
  s.lineTo(0, -0.06);
  s.closePath();
  return new THREE.ShapeGeometry(s);
}

// =====================================================================
//  setup
// =====================================================================
onWorldReady(player => {
  // ---- petals: 1 InstancedMesh ----
  const petalMat = toon(0xffd0e6, { mat: { side: THREE.DoubleSide, emissive: 0xff9dc4, emissiveIntensity: 0.3 } });
  petals = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.7, 1), petalMat, NPET);
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  petals.frustumCulled = false;
  scene.add(petals);
  for (let i = 0; i < NPET; i++) {
    const p = {
      x: 0, y: 0, z: 0, vis: false,
      size: 0.07 + Math.random() * 0.03, sp: 0.4 + Math.random() * 0.25,
      swPh: Math.random() * 6.283, swFq: 0.6 + Math.random() * 0.7,
      rx: Math.random() * 6.283, ry: Math.random() * 6.283, rz: Math.random() * 6.283,
      sx: (Math.random() * 2 - 1) * 1.4, sy: (Math.random() * 2 - 1) * 1.4, sz: (Math.random() * 2 - 1) * 1.4,
    };
    respawnPetal(p, player);
    p.y = PGND + Math.random() * (PTOP - PGND);   // spread up the column so they don't fade in unison
    petalState.push(p);
  }

  // ---- butterflies: 2 InstancedMeshes (bodies + wings) ----
  bBodies = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 5), toon(0x39323f), BFLY_HOMES.length);
  bWings = new THREE.InstancedMesh(bflyWingGeo(), toon(0xffffff, { mat: { side: THREE.DoubleSide } }), BFLY_HOMES.length * 2);
  bBodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bWings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bBodies.frustumCulled = bWings.frustumCulled = false;
  BFLY_HOMES.forEach(([hx, hz], i) => {
    BFLY.push({
      hx, hz, by: 1.0, bob: 0.4,
      ax1: 0.9, ax2: 0.5, az1: 0.9, az2: 0.45,
      w1: 0.45 + Math.random() * 0.2, w2: 0.85 + Math.random() * 0.25,
      w3: 0.5 + Math.random() * 0.2, w4: 0.9 + Math.random() * 0.25, wb: 1.1 + Math.random() * 0.5,
      p1: Math.random() * 6.283, p2: Math.random() * 6.283, p3: Math.random() * 6.283,
      p4: Math.random() * 6.283, pb: Math.random() * 6.283,
      flapW: 13 + Math.random() * 4, flapPh: Math.random() * 6.283,
      ex: 0, ey: 0, ez: 0, spook: false,
    });
    _col.setHex(WING_COLS[i % WING_COLS.length]);
    bWings.setColorAt(i * 2, _col); bWings.setColorAt(i * 2 + 1, _col);
  });
  bWings.instanceColor.needsUpdate = true;
  scene.add(bBodies, bWings);

  // ---- geese: 2 InstancedMeshes (bodies + wings), hidden until a flyover ----
  gBodies = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), toon(0x2b2b33), GFORM.length);
  gWings = new THREE.InstancedMesh(gooseWingGeo(), toon(0x30303a, { mat: { side: THREE.DoubleSide } }), GFORM.length * 2);
  gBodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  gWings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  gBodies.frustumCulled = gWings.frustumCulled = false;
  gBodies.visible = gWings.visible = false;
  scene.add(gBodies, gWings);
  geese.timer = GEESE_TEST ? 2 : 100 + Math.random() * 70;

  // ===================================================================
  //  per-frame
  // ===================================================================
  registerUpdate((dt, t, pl) => {
    // ---- petals ----
    for (let i = 0; i < NPET; i++) {
      const p = petalState[i];
      p.y -= p.sp * dt;
      const sway = Math.sin(t * p.swFq + p.swPh);
      p.x += (WIND_X + sway * SWAY) * dt;
      p.z += WIND_Z * dt;
      p.rx += p.sx * dt; p.ry += p.sy * dt; p.rz += p.sz * dt;
      if (p.y <= PGND) respawnPetal(p, pl);
      const fade = p.y < PGND + 0.5 ? (p.y - PGND) / 0.5 : 1;   // shrink out over the last 0.5 m
      const sc = p.vis ? p.size * (fade < 0 ? 0 : fade) : 0;
      _e.set(p.rx, p.ry, p.rz); _q.setFromEuler(_e);
      _v.set(p.x, p.y, p.z); _s.set(sc, sc, sc);
      _m.compose(_v, _q, _s); petals.setMatrixAt(i, _m);
    }
    petals.instanceMatrix.needsUpdate = true;

    // ---- butterflies ----
    for (let i = 0; i < BFLY.length; i++) {
      const b = BFLY[i];
      const wx = b.hx + b.ax1 * Math.sin(t * b.w1 + b.p1) + b.ax2 * Math.sin(t * b.w2 + b.p2);
      const wz = b.hz + b.az1 * Math.sin(t * b.w3 + b.p3) + b.az2 * Math.sin(t * b.w4 + b.p4);
      const wy = b.by + b.bob * Math.sin(t * b.wb + b.pb);
      const vx = b.ax1 * b.w1 * Math.cos(t * b.w1 + b.p1) + b.ax2 * b.w2 * Math.cos(t * b.w2 + b.p2);
      const vz = b.az1 * b.w3 * Math.cos(t * b.w3 + b.p3) + b.az2 * b.w4 * Math.cos(t * b.w4 + b.p4);
      // repulsion (spook) with hysteresis: flee at 1.2 m, calm again past 2.5 m
      const px = wx + b.ex, pz = wz + b.ez, d2 = (px - pl.x) * (px - pl.x) + (pz - pl.z) * (pz - pl.z);
      if (!b.spook && d2 < 1.44) b.spook = true;
      else if (b.spook && d2 > 6.25) b.spook = false;
      let tex = 0, tey = 0, tez = 0;
      if (b.spook) { const d = Math.sqrt(d2) || 0.001; tex = (px - pl.x) / d * 1.8; tez = (pz - pl.z) / d * 1.8; tey = 1.0; }
      const k = 1 - Math.exp(-3 * dt);
      b.ex += (tex - b.ex) * k; b.ey += (tey - b.ey) * k; b.ez += (tez - b.ez) * k;
      const fx = wx + b.ex, fy = wy + b.ey, fz = wz + b.ez;
      const heading = Math.atan2(vx, vz);
      b.flapPh += (b.spook ? b.flapW * 1.8 : b.flapW) * dt;
      const ang = 0.35 + Math.sin(b.flapPh) * 0.62;
      _e.set(0, heading, 0); _q.setFromEuler(_e);
      _v.set(fx, fy, fz);
      _m.compose(_v, _q, BODY_S); bBodies.setMatrixAt(i, _m);
      _mW.compose(_v, _q, _one);
      _e.set(0, 0, ang); _q2.setFromEuler(_e); _mL.compose(_zero, _q2, _one);
      _m.multiplyMatrices(_mW, _mL); bWings.setMatrixAt(i * 2, _m);
      _e.set(0, 0, -ang); _q2.setFromEuler(_e); _mL.compose(_zero, _q2, _mirror);
      _m.multiplyMatrices(_mW, _mL); bWings.setMatrixAt(i * 2 + 1, _m);
    }
    bBodies.instanceMatrix.needsUpdate = true;
    bWings.instanceMatrix.needsUpdate = true;

    // ---- geese ----
    geese.timer -= dt;
    if (!geese.active && geese.timer <= 0) startGeese(pl);
    if (geese.active) {
      geese.z += geese.dir * geese.speed * dt;
      const heading = geese.dir > 0 ? 0 : Math.PI;
      _e.set(0, heading, 0); _q.setFromEuler(_e);
      const bob = Math.sin(t * 0.6) * 0.4;
      for (let i = 0; i < GFORM.length; i++) {
        const f = GFORM[i];
        _off.set(f[0], f[1], f[2]).applyQuaternion(_q);
        _v.set(geese.baseX + _off.x, GEESE_Y + bob + _off.y, geese.z + _off.z);
        _m.compose(_v, _q, GBODY_S); gBodies.setMatrixAt(i, _m);
        _mW.compose(_v, _q, _one);
        const ang = 0.15 + Math.sin(t * 2.6 + i * 0.5) * 0.6;   // slow deep flap, rippling down the V
        _e.set(0, 0, ang); _q2.setFromEuler(_e); _mL.compose(_zero, _q2, _one);
        _m.multiplyMatrices(_mW, _mL); gWings.setMatrixAt(i * 2, _m);
        _e.set(0, 0, -ang); _q2.setFromEuler(_e); _mL.compose(_zero, _q2, _mirror);
        _m.multiplyMatrices(_mW, _mL); gWings.setMatrixAt(i * 2 + 1, _m);
      }
      gBodies.instanceMatrix.needsUpdate = true;
      gWings.instanceMatrix.needsUpdate = true;
      const past = geese.dir > 0 ? geese.z > geese.zEnd : geese.z < geese.zEnd;
      if (past) { geese.active = false; gBodies.visible = gWings.visible = false; }
    }
  });
});
