// =====================================================================
//  TRAILLIFE — the Lakefront Trail, USED. Chicago's trail is never empty:
//  joggers pounding out the miles, cyclists whooshing past ("on your left!"),
//  people walking their dogs at dusk. This pack fills the whole trail ribbon
//  with movers so every stretch feels alive.
//
//    * 6 JOGGERS  — makeNPC chibis in bright running kit, each patrolling one
//      sixth of the main trail (back-and-forth), 2.6–3.4 m/s, manual run gait.
//      Bump lines: "on your left!", "ope", "nice night for it", "six more miles".
//    * 2 CYCLISTS — instanced tube bikes (spinning wheels) with a chibi rider
//      posed pedalling + leaning, 5.5–7 m/s on long segments, weaving gently
//      around the centerline. Bell "ding-ding" + "on your left!" within 2.5 m.
//    * 2 DOG-WALKERS — chibi + a small instanced-parts dog on a thin leash
//      cylinder (re-posed each frame). 1.5 m/s on the south-garden and harbor
//      stretches; the dog stops to sniff now and then (walker waits, tugs).
//
//  Every mover rides the MAIN trail curve: at setup we bake an arc-length
//  sample table of mainCurve; movers advance by metres along it and read back
//  position + tangent, so they stay glued to the ribbon and keep constant
//  ground speed. Zero per-frame allocation — all matrices/vectors are hoisted
//  scratch and recomposed each frame (the moorings.js pattern). No core rng is
//  ever touched (Math.random / a local m32 only), so world determinism is safe.
//
//  Draw calls added (chibis are individual by design; these are the extras):
//    bikes: frames(1) + wheels(1) + spokes(1) + seats(1) = 4
//    dogs:  body(1)+head(1)+ears(1)+legs(1)+tail(1)        = 5
//    leashes(1)                                            = 1   -> 10 total.
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, registerUpdate, makeNPC, getAudioCtx } from '../framework.js';
import { scene, toon } from '../core.js';
import { mainCurve } from '../paths.js';

// ---- local deterministic rng (unused for layout, kept for parity) ----
function m32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// =====================================================================
//  arc-length sample table of the MAIN trail curve
// =====================================================================
let XS, ZS, CUM, SEGN = 0, TOT = 0;
function buildTable(){
  const N = 700;
  XS = new Float32Array(N + 1); ZS = new Float32Array(N + 1); CUM = new Float32Array(N + 1);
  const p = new THREE.Vector3();
  mainCurve.getPoint(0, p); XS[0] = p.x; ZS[0] = p.z; CUM[0] = 0;
  let px = p.x, pz = p.z, cum = 0;
  for (let i = 1; i <= N; i++){
    mainCurve.getPoint(i / N, p);
    cum += Math.hypot(p.x - px, p.z - pz);
    XS[i] = p.x; ZS[i] = p.z; CUM[i] = cum; px = p.x; pz = p.z;
  }
  SEGN = N; TOT = cum;
}
// write curve position (out) + unit tangent (tan) at arc-length d (metres)
function sampleAt(d, out, tan){
  if (d < 0) d = 0; else if (d > TOT) d = TOT;
  let lo = 0, hi = SEGN;
  while (lo < hi){ const mid = (lo + hi + 1) >> 1; if (CUM[mid] <= d) lo = mid; else hi = mid - 1; }
  let i = lo; if (i >= SEGN) i = SEGN - 1;
  const seg = (CUM[i + 1] - CUM[i]) || 1e-6, f = (d - CUM[i]) / seg;
  const x0 = XS[i], z0 = ZS[i], x1 = XS[i + 1], z1 = ZS[i + 1];
  out.set(x0 + (x1 - x0) * f, 0, z0 + (z1 - z0) * f);
  let tx = x1 - x0, tz = z1 - z0; const tl = Math.hypot(tx, tz) || 1e-6;
  tan.set(tx / tl, 0, tz / tl);
}
// nearest arc-length d to a target world point (setup-time anchor helper)
function findD(tx, tz){
  let best = 0, bd = Infinity;
  for (let i = 0; i <= SEGN; i++){
    const dx = XS[i] - tx, dz = ZS[i] - tz, d2 = dx * dx + dz * dz;
    if (d2 < bd){ bd = d2; best = CUM[i]; }
  }
  return best;
}

// =====================================================================
//  hoisted scratch (no per-frame allocation)
// =====================================================================
const _pos = new THREE.Vector3(), _tan = new THREE.Vector3();
const _pos2 = new THREE.Vector3(), _tan2 = new THREE.Vector3();
const _m = new THREE.Matrix4(), _mp = new THREE.Matrix4(), _ml = new THREE.Matrix4();
const _q = new THREE.Quaternion(), _qh = new THREE.Quaternion(), _qr = new THREE.Quaternion(), _qs = new THREE.Quaternion();
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3();
const _one = new THREE.Vector3(1, 1, 1);
const _yAxis = new THREE.Vector3(0, 1, 0), _zAxis = new THREE.Vector3(0, 0, 1), _xAxis = new THREE.Vector3(1, 0, 0);
const _IDENT = new THREE.Quaternion();
const _col = new THREE.Color();
const _qWheelBase = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)); // torus hole -> bike X

// world matrix from (x,z on ground) + heading yaw + optional bank roll -> out
function composeWorld(x, z, yaw, roll, out){
  _qh.setFromAxisAngle(_yAxis, yaw);
  if (roll){ _qr.setFromAxisAngle(_zAxis, roll); _q.copy(_qh).multiply(_qr); }
  else _q.copy(_qh);
  out.compose(_v.set(x, 0, z), _q, _one);
}

// =====================================================================
//  chibi gaits (driven manually per frame; same swing math as the NPC walk)
// =====================================================================
function runGait(p, walkT, amt, lean){
  const sw = Math.sin(walkT) * amt;
  p.legL.rotation.x = sw * 0.95;  p.legR.rotation.x = -sw * 0.95;
  p.armL.rotation.x = -sw * 0.9;  p.armR.rotation.x = sw * 0.9;
  const bob = Math.abs(Math.sin(walkT)) * 0.08 * amt;
  p.body.position.y = 1.18 + bob; p.head.position.y = 2.22 + bob * 1.1;   // hair baked into head — rides the head bob
  p.body.rotation.x = lean;
}
function pedalPose(p, ang){
  const s = Math.sin(ang);
  p.legL.rotation.x = 0.9 + s * 0.32; p.legR.rotation.x = 0.9 - s * 0.32;
  p.armL.rotation.x = -1.02; p.armR.rotation.x = -1.02;
  p.armL.rotation.z = -0.05; p.armR.rotation.z = 0.05;
  p.body.rotation.x = 0.34;
  p.body.position.y = 1.18; p.head.position.y = 2.22;   // hair baked into head
}

// =====================================================================
//  bikes — one instanced mesh per part-type (both bikes share it)
// =====================================================================
const R_WHEEL = 0.32;
const BIKE_PTS = {
  BB:   [0, 0.34, -0.02], seat: [0, 0.94, -0.22], head: [0, 0.62, 0.5], bar: [0, 0.9, 0.44],
  wF:   [0, R_WHEEL, 0.55], wB: [0, R_WHEEL, -0.55],
  hbL:  [-0.2, 0.92, 0.44], hbR: [0.2, 0.92, 0.44],
};
const BIKE_TUBES = [ // [a, b, radius]
  ['BB', 'seat', 0.03], ['BB', 'head', 0.03], ['seat', 'bar', 0.028],
  ['head', 'wF', 0.026], ['BB', 'wB', 0.024], ['seat', 'wB', 0.024],
  ['head', 'bar', 0.026], ['hbL', 'hbR', 0.02],
];
const NT = BIKE_TUBES.length;
const _tubeLocal = [];   // baked local matrices (setup)
function bakeTubes(){
  for (const [a, b, rad] of BIKE_TUBES){
    const A = BIKE_PTS[a], B = BIKE_PTS[b];
    _v2.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
    const len = _v2.length() || 1e-6; _v3.copy(_v2).divideScalar(len);
    _qr.setFromUnitVectors(_yAxis, _v3);
    const M = new THREE.Matrix4().compose(
      _v.set((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2), _qr, _v4.set(rad, len, rad));
    _tubeLocal.push(M);
  }
}
let bikeFrames, bikeWheels, bikeSpokes, bikeSeats;
function buildBikes(colors){
  bakeTubes();
  bikeFrames = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), toon(0x2b6f9c, {}), 2 * NT);
  bikeWheels = new THREE.InstancedMesh(new THREE.TorusGeometry(R_WHEEL, 0.045, 6, 14), toon(0x23262b), 4);
  bikeSpokes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon(0x9aa0a6), 4);
  bikeSeats  = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon(0x1a1a1f), 2);
  // colour each bike's frame tubes (also creates the instanceColor buffer)
  for (let b = 0; b < 2; b++){ _col.setHex(colors[b]); for (let k = 0; k < NT; k++) bikeFrames.setColorAt(b * NT + k, _col); }
  for (const im of [bikeFrames, bikeWheels, bikeSpokes, bikeSeats]){
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; scene.add(im);
  }
  if (bikeFrames.instanceColor) bikeFrames.instanceColor.needsUpdate = true;
}
// place bike b in the world (matrix _m already = bikeWorld); spin from wheelA
function drawBike(b, wheelA){
  for (let k = 0; k < NT; k++){ _mp.multiplyMatrices(_m, _tubeLocal[k]); bikeFrames.setMatrixAt(b * NT + k, _mp); }
  _qs.setFromAxisAngle(_zAxis, wheelA); _q.copy(_qWheelBase).multiply(_qs); // spin about hole axis
  const axles = [BIKE_PTS.wF, BIKE_PTS.wB];
  for (let w = 0; w < 2; w++){
    _ml.compose(_v.set(axles[w][0], axles[w][1], axles[w][2]), _q, _one);
    _mp.multiplyMatrices(_m, _ml); bikeWheels.setMatrixAt(b * 2 + w, _mp);
    _ml.compose(_v.set(axles[w][0], axles[w][1], axles[w][2]), _q, _v2.set(0.02, 2 * R_WHEEL, 0.02));
    _mp.multiplyMatrices(_m, _ml); bikeSpokes.setMatrixAt(b * 2 + w, _mp);
  }
  _mp.compose(_v.set(0, 0.955, -0.22), _IDENT, _v2.set(0.14, 0.06, 0.28));
  _mp.premultiply(_m); bikeSeats.setMatrixAt(b, _mp);   // = bikeWorld * seatLocal
}

// =====================================================================
//  dogs — small instanced-parts dog (both dogs share each part mesh)
// =====================================================================
let dogBody, dogHead, dogEars, dogLegs, dogTail, leashes;
const DOG_LEG = [ // [x, z, diagPhase]  shoulders; y baked below
  [-0.13, 0.2, 0], [0.13, 0.2, Math.PI], [-0.13, -0.2, Math.PI], [0.13, -0.2, 0],
];
function buildDogs(colors){
  const legGeo = new THREE.CylinderGeometry(0.045, 0.04, 1, 5); legGeo.translate(0, -0.5, 0); // top-pivot
  dogBody = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 7), toon(0xffffff, {}), 2);
  dogHead = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 7), toon(0xffffff, {}), 2);
  dogEars = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 5), toon(0xffffff, {}), 4);
  dogLegs = new THREE.InstancedMesh(legGeo, toon(0xffffff, {}), 8);
  dogTail = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.03, 1, 5), toon(0xffffff, {}), 2);
  for (let d = 0; d < 2; d++){
    _col.setHex(colors[d]);
    dogBody.setColorAt(d, _col); dogHead.setColorAt(d, _col); dogTail.setColorAt(d, _col);
    dogEars.setColorAt(d * 2, _col); dogEars.setColorAt(d * 2 + 1, _col);
    for (let l = 0; l < 4; l++) dogLegs.setColorAt(d * 4 + l, _col);
  }
  leashes = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 4), toon(0x3a3630, {}), 2);
  for (const im of [dogBody, dogHead, dogEars, dogLegs, dogTail, leashes]){
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false;
    if (im.instanceColor) im.instanceColor.needsUpdate = true; scene.add(im);
  }
}
// draw dog d: world matrix _m = dogWorld; sniff 0..1 lowers head; trot phase
function drawDog(d, trotT, moving, sniff){
  // body
  _ml.compose(_v.set(0, 0.3 + 0.01 * Math.sin(trotT * 2) * moving, 0), _IDENT, _v2.set(0.26, 0.24, 0.38));
  _mp.multiplyMatrices(_m, _ml); dogBody.setMatrixAt(d, _mp);
  // head (drops + pitches down when sniffing)
  const hy = 0.5 - 0.22 * sniff, hz = 0.34 + 0.06 * sniff;
  _qr.setFromAxisAngle(_xAxis, 0.7 * sniff);
  _ml.compose(_v.set(0, hy, hz), _qr, _v2.set(0.2, 0.2, 0.22));
  _mp.multiplyMatrices(_m, _ml); dogHead.setMatrixAt(d, _mp);
  // ears
  for (let e = 0; e < 2; e++){
    _ml.compose(_v.set((e ? 0.11 : -0.11), hy + 0.16, hz - 0.04), _IDENT, _v2.set(0.07, 0.14, 0.07));
    _mp.multiplyMatrices(_m, _ml); dogEars.setMatrixAt(d * 2 + e, _mp);
  }
  // legs (trot; still when sniffing) — top-pivot geometry, scale Y = leg length
  for (let l = 0; l < 4; l++){
    const sw = moving ? Math.sin(trotT + DOG_LEG[l][2]) * 0.45 : 0;
    _qr.setFromAxisAngle(_xAxis, sw);
    _ml.compose(_v.set(DOG_LEG[l][0], 0.3, DOG_LEG[l][1]), _qr, _v2.set(1, 0.3, 1));
    _mp.multiplyMatrices(_m, _ml); dogLegs.setMatrixAt(d * 4 + l, _mp);
  }
  // tail (up, gentle wag)
  _qr.setFromAxisAngle(_xAxis, -0.9 + Math.sin(trotT * 1.7) * 0.25 * (moving ? 1 : 0.4));
  _ml.compose(_v.set(0, 0.42, -0.34), _qr, _v2.set(0.05, 0.3, 0.05));
  _mp.multiplyMatrices(_m, _ml); dogTail.setMatrixAt(d, _mp);
}
// thin leash cylinder between world points A(ax..) and B(bx..)
function drawLeash(idx, ax, ay, az, bx, by, bz){
  _v2.set(bx - ax, by - ay, bz - az); const len = _v2.length() || 1e-6; _v3.copy(_v2).divideScalar(len);
  _qr.setFromUnitVectors(_yAxis, _v3);
  _mp.compose(_v.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2), _qr, _v4.set(0.012, len, 0.012));
  leashes.setMatrixAt(idx, _mp);
}

// =====================================================================
//  audio — soft synthesized bike bell (getAudioCtx null-guarded)
// =====================================================================
function bikeBell(){
  const c = getAudioCtx(); if (!c.actx) return; const t = c.actx.currentTime;
  [0, 0.16].forEach((dl, i) => {
    const o = c.actx.createOscillator(), g = c.actx.createGain();
    o.type = 'sine'; o.frequency.value = i ? 2637 : 2093;
    g.gain.setValueAtTime(0.0001, t + dl); g.gain.linearRampToValueAtTime(0.13, t + dl + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dl + 0.4);
    o.connect(g); g.connect(c.sfxBus); o.start(t + dl); o.stop(t + dl + 0.45);
  });
}

// =====================================================================
//  palettes
// =====================================================================
const JOG_PAL = [
  { suit: 0xff5a3c, pants: 0x1f2933, skin: 0xf1c9a5, hair: 0x2b2b2b, shoe: 0xffffff },
  { suit: 0x18c29c, pants: 0x11314a, skin: 0x8d5a3b, hair: 0x1a1a1a, shoe: 0xffffff, hairStyle: 'bun' },
  { suit: 0xffd23f, pants: 0x2b3a67, skin: 0xe8b088, hair: 0x5a3a1a, shoe: 0xff5a5a },
  { suit: 0xff4fa3, pants: 0x222831, skin: 0x6e4632, hair: 0x111111, shoe: 0xffffff, hairStyle: 'afro' },
  { suit: 0x4fc3ff, pants: 0x27313d, skin: 0xf1c9a5, hair: 0x8a5a2b, shoe: 0xffd23f, hairStyle: 'tall' },
  { suit: 0x9b5de5, pants: 0x1c2333, skin: 0xc98a5e, hair: 0x2b2b2b, shoe: 0xffffff },
];
const CYC_PAL = [
  { suit: 0xe63946, pants: 0x1d3557, skin: 0xe8b088, hair: 0x1a1a1a, shoe: 0x111111 },
  { suit: 0x2a9d8f, pants: 0x264653, skin: 0x8d5a3b, hair: 0x111111, shoe: 0x111111 },
];
const WALK_PAL = [
  { suit: 0x6d9dc5, pants: 0x3a4a5a, skin: 0xe8b088, hair: 0x3a2a1a },
  { suit: 0xcaa15a, pants: 0x2f2a3a, skin: 0x6e4632, hair: 0x111111, hairStyle: 'bun' },
];
const BIKE_COL = [0xe63946, 0x2a9d8f];
const DOG_COL = [0xd8b48a, 0x8a8f96];
const JOG_LINES = ['on your left!', 'ope', 'nice night for it', 'this humidity, though', 'six more miles'];
const CYC_LINES = ['on your left!', "ope — comin' through!"];
const WALK_LINES = ['ope', 'nice night for a walk', "say hi to your ma", "that's a real nice pup, eh"];

// =====================================================================
//  movers
// =====================================================================
const joggers = [];   // {npc, d, dir, d0, d1, sp, walkT}
const cyclists = [];  // {rider, d, dir, d0, d1, sp, wheelA, pedal, wf, wph, bellArmed}
const walkers = [];   // {npc, d, dir, d0, d1, sp, spCur, walkT, dogTrot, sniff, sniffing, timer, side, lead}

onWorldReady((player) => {
  buildTable();

  // ---- 6 joggers: one sixth of the trail each (whole-map coverage) ----
  const span = 0.96, base = 0.02;
  for (let i = 0; i < 6; i++){
    const pal = JOG_PAL[i];
    const npc = makeNPC({ x: XS[0], z: ZS[0], palette: pal, name: '', lines: JOG_LINES, wander: 0 });
    const d0 = (base + span * (i / 6)) * TOT, d1 = (base + span * ((i + 1) / 6)) * TOT;
    joggers.push({ npc, d0, d1, d: d0 + Math.random() * (d1 - d0), dir: Math.random() < 0.5 ? 1 : -1,
      sp: 2.6 + Math.random() * 0.8, walkT: Math.random() * 6.28 });
  }

  // ---- 2 cyclists on long segments ----
  buildBikes(BIKE_COL);
  const cSeg = [[0.05, 0.6], [0.4, 0.95]];
  for (let i = 0; i < 2; i++){
    const rider = makeNPC({ x: XS[0], z: ZS[0], palette: CYC_PAL[i], name: '', lines: CYC_LINES, wander: 0 });
    cyclists.push({ rider, d0: cSeg[i][0] * TOT, d1: cSeg[i][1] * TOT,
      d: (cSeg[i][0] + Math.random() * (cSeg[i][1] - cSeg[i][0])) * TOT, dir: i === 0 ? 1 : -1,
      sp: 5.5 + Math.random() * 1.5, wheelA: 0, pedal: 0, wf: 0.6 + Math.random() * 0.3,
      wph: Math.random() * 6.28, bellArmed: true });
  }

  // ---- 2 dog-walkers: anchored to the south garden + the harbor stretch ----
  buildDogs(DOG_COL);
  const dGarden = findD(112, 120);   // AIDS Garden stretch (south)
  const dHarbor = findD(48, -150);   // harbor-west stretch
  const anchors = [{ c: dGarden, half: 42, side: 1 }, { c: dHarbor, half: 46, side: -1 }];
  for (let i = 0; i < 2; i++){
    const a = anchors[i];
    const npc = makeNPC({ x: XS[0], z: ZS[0], palette: WALK_PAL[i], name: '', lines: WALK_LINES, wander: 0 });
    walkers.push({ npc, d0: Math.max(4, a.c - a.half), d1: Math.min(TOT - 4, a.c + a.half),
      d: a.c, dir: Math.random() < 0.5 ? 1 : -1, sp: 1.5, spCur: 1.5, walkT: Math.random() * 6.28,
      dogTrot: Math.random() * 6.28, sniff: 0, sniffing: false, timer: 4 + Math.random() * 4,
      side: a.side, lead: 1.4 });
  }

  // =============================== per-frame ============================
  registerUpdate((dt, t, pl) => {
    // ---- joggers ----
    for (const j of joggers){
      j.d += j.dir * j.sp * dt;
      if (j.d >= j.d1){ j.d = j.d1; j.dir = -1; } else if (j.d <= j.d0){ j.d = j.d0; j.dir = 1; }
      sampleAt(j.d, _pos, _tan);
      const g = j.npc.group;
      g.position.set(_pos.x, 0, _pos.z);
      g.rotation.y = Math.atan2(_tan.x * j.dir, _tan.z * j.dir);
      g.rotation.z = 0;
      j.walkT += j.sp * dt * 2.7;
      const amt = Math.min(1.2, Math.max(0.6, j.sp / 3.0));
      runGait(j.npc.parts, j.walkT, amt, 0.16);
    }

    // ---- cyclists ----
    for (let i = 0; i < cyclists.length; i++){
      const c = cyclists[i];
      c.d += c.dir * c.sp * dt;
      if (c.d >= c.d1){ c.d = c.d1; c.dir = -1; } else if (c.d <= c.d0){ c.d = c.d0; c.dir = 1; }
      sampleAt(c.d, _pos, _tan);
      const nx = -_tan.z, nz = _tan.x;                    // left normal
      const ph = t * c.wf + c.wph;
      const off = Math.sin(ph) * 0.75;                    // gentle weave
      const wx = _pos.x + nx * off, wz = _pos.z + nz * off;
      const yaw = Math.atan2(_tan.x * c.dir, _tan.z * c.dir);
      const lean = -Math.cos(ph) * c.wf * 0.32 * c.dir;   // bank into the weave
      composeWorld(wx, wz, yaw, lean, _m);
      // rider posed on the seat, banked with the bike — capture _q (yaw*roll)
      // BEFORE drawBike reuses it for wheel spin.
      const rg = c.rider.group;
      rg.position.set(wx, 0.42, wz);
      rg.quaternion.copy(_q);
      c.wheelA -= c.sp * dt / R_WHEEL;
      c.pedal += c.sp * dt * 1.1;
      pedalPose(c.rider.parts, c.pedal);
      drawBike(i, c.wheelA);
      // bell + "on your left!" within 2.5 m
      const dx = pl.x - wx, dz = pl.z - wz, d2 = dx * dx + dz * dz;
      if (c.bellArmed && d2 < 6.25){ bikeBell(); c.rider.say('on your left!'); c.bellArmed = false; }
      else if (!c.bellArmed && d2 > 16){ c.bellArmed = true; }
    }
    bikeFrames.instanceMatrix.needsUpdate = true;
    bikeWheels.instanceMatrix.needsUpdate = true;
    bikeSpokes.instanceMatrix.needsUpdate = true;
    bikeSeats.instanceMatrix.needsUpdate = true;

    // ---- dog-walkers ----
    for (let i = 0; i < walkers.length; i++){
      const w = walkers[i];
      // sniff cadence
      w.timer -= dt;
      if (w.timer <= 0){
        w.sniffing = !w.sniffing;
        w.timer = w.sniffing ? (1.8 + Math.random() * 2.2) : (5 + Math.random() * 5);
      }
      const tgt = w.sniffing ? 0 : w.sp;
      w.spCur += (tgt - w.spCur) * Math.min(1, dt * 3);
      w.sniff += ((w.sniffing ? 1 : 0) - w.sniff) * Math.min(1, dt * 4);
      w.d += w.dir * w.spCur * dt;
      if (w.d >= w.d1){ w.d = w.d1; w.dir = -1; } else if (w.d <= w.d0){ w.d = w.d0; w.dir = 1; }
      sampleAt(w.d, _pos, _tan);
      const nx = -_tan.z, nz = _tan.x;
      const yaw = Math.atan2(_tan.x * w.dir, _tan.z * w.dir);
      // walker walks a touch to one side of the centerline
      const wx = _pos.x + nx * 0.5 * w.side, wz = _pos.z + nz * 0.5 * w.side;
      const g = w.npc.group;
      g.position.set(wx, 0, wz);
      g.rotation.y = yaw; g.rotation.z = 0;
      w.walkT += w.spCur * dt * 2.7;
      const wamt = Math.min(0.7, w.spCur / 2.2);
      runGait(w.npc.parts, w.walkT, wamt, 0.05 - 0.06 * w.sniff);   // slight lean-back tug when sniffing
      // dog: ahead along travel, other side of the walker
      const dogD = w.d + w.dir * w.lead;
      sampleAt(dogD, _pos2, _tan2);
      const dnx = -_tan2.z, dnz = _tan2.x;
      const dx0 = _pos2.x - dnx * 0.5 * w.side, dz0 = _pos2.z - dnz * 0.5 * w.side;
      const dyaw = Math.atan2(_tan2.x * w.dir, _tan2.z * w.dir) + (w.sniff > 0.5 ? 0.5 : 0); // sniff turns aside
      composeWorld(dx0, dz0, dyaw, 0, _m);
      w.dogTrot += w.spCur * dt * 4.5;
      drawDog(i, w.dogTrot, w.spCur > 0.3 ? 1 : 0, w.sniff);
      // leash: walker's leading hand -> dog collar
      const hx = wx + Math.sin(yaw) * 0.25, hy = 1.02, hz = wz + Math.cos(yaw) * 0.25;
      drawLeash(i, hx, hy, hz, dx0, 0.5 - 0.2 * w.sniff, dz0);
    }
    dogBody.instanceMatrix.needsUpdate = true;
    dogHead.instanceMatrix.needsUpdate = true;
    dogEars.instanceMatrix.needsUpdate = true;
    dogLegs.instanceMatrix.needsUpdate = true;
    dogTail.instanceMatrix.needsUpdate = true;
    leashes.instanceMatrix.needsUpdate = true;
  });
});
