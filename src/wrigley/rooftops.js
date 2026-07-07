// Rooftop brownstones — Waveland + Sheffield rows, rooftop bleachers,
// the ONE climbable roof + its outdoor stair. Data: ROOFTOPS_W.
// Attach everything to wrigleyRoot. LOCAL rng only (R, seed 3700) — never
// the shared world rng, never wrand (keeps this file order-independent).
//
// Draw-call discipline (budget <=35): every repeated part is one InstancedMesh
// BUCKETED BY COLOR (r128's toon shader ignores InstancedMesh.setColorAt, so
// per-instance color must be per-material). One shared unit-BOX geometry drives
// bodies/parapets/cornices/dentils/stoops/bleachers/treads/rails/wires; one
// unit-PLANE drives windows; unit CYL/CONE drive posts+poles / umbrellas;
// glow bulbs ride a single Points (pointsMat — same world-curve shader).
import * as THREE from 'three';
import { toon, bmat, mulberry32, pointsMat } from '../core.js';
import { collide } from '../props.js';
import { wrigleyRoot } from './index.js';
import { ROOFTOPS_W } from '../data/wrigleyville.js';

const R = mulberry32(3700);
const rr = (a, b) => a + (b - a) * R();

// --------------------------- palette ----------------------------------
const COL = {
  grey: 0x9a968c, brick: 0x9d4b39, brown: 0x6f4a34,   // 3 body archetypes
  lime: 0xc7c0b0,                                       // limestone trim (cornice/parapet/dentil/stoop)
  tar: 0x51535b,                                        // flat-roof deck
  dark: 0x2a2622,                                       // doors / chairs / string-wire
  steel: 0x8b93a0,                                      // bleacher/stair steel, railings
  green: 0x2f6046,                                      // bleacher frames (ivy green)
  tan: 0xc9a86b,                                        // bleacher planks / peanut shells
  red: 0xc23a2b,                                        // coolers
  silver: 0x93a8c6,                                     // coin-op binocular head
  umbrella: 0xd0573a,                                   // market umbrella
};

const ROOF_Y = ROOFTOPS_W.roofY;                        // 9.6 — walkable deck top
const BODY_H = 9.5;
const FLOORS = [1.9, 4.6, 7.3];                         // 3 storeys
const ST = ROOFTOPS_W.stair;                            // x -208..-205, z -520(top)..-508(bottom)
const rampY = z => ST.yTop + (ST.yBot - ST.yTop) * (z - ST.z0) / (ST.z1 - ST.z0);

// --------------------- shared geometry primitives ---------------------
const BOX = new THREE.BoxGeometry(1, 1, 1);
const PLANE = new THREE.PlaneGeometry(1, 1);
const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
const CONE = new THREE.ConeGeometry(0.5, 1, 12);

// --------------------------- accumulators -----------------------------
const boxes = [];        // {pos,scale,color,yaw?/rot?/quat?}  bucketed by color
const winU = [], winL = []; // window planes (unlit / warm-lit)
const cyls = [];         // steel/grey cylinders (posts, poles, eyepieces)
const cones = [];        // umbrella canopies
const bulbs = [];        // [x,y,z] string-light glow points

const zAxis = new THREE.Vector3(0, 0, 1), _v = new THREE.Vector3();
// a linear member (rail / stringer / wire) between two 3-D points
function seg(ax, ay, az, bx, by, bz, r, color) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.hypot(dx, dy, dz);
  const q = new THREE.Quaternion().setFromUnitVectors(zAxis, _v.set(dx, dy, dz).normalize());
  boxes.push({ pos: [(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2], scale: [r, r, len], quat: q, color });
}

// -------------------------- canvas textures ---------------------------
function winTex(lit) {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 96; const g = cv.getContext('2d');
  g.fillStyle = '#2b2b30'; g.fillRect(0, 0, 64, 96);                     // dark frame
  g.fillStyle = lit ? '#ffcf87' : '#5c6b78'; g.fillRect(8, 8, 48, 36);   // upper sash glass
  g.fillStyle = lit ? '#ffe1aa' : '#6c7c89'; g.fillRect(8, 52, 48, 36);  // lower sash glass
  g.fillStyle = '#1f1f1e'; g.fillRect(8, 46, 48, 5); g.fillRect(30, 8, 3, 80); // meeting rail + muntin
  g.fillStyle = lit ? 'rgba(255,238,196,0.45)' : 'rgba(210,225,235,0.14)';
  g.fillRect(12, lit ? 54 : 10, 34, 30);                                 // glow / reflection
  return new THREE.CanvasTexture(cv);
}
function sandwichTex() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 190; const g = cv.getContext('2d');
  g.fillStyle = '#20140c'; g.fillRect(0, 0, 256, 190);                   // wood frame
  g.fillStyle = '#14201a'; g.fillRect(12, 12, 232, 166);                 // chalkboard
  g.strokeStyle = '#3a5c3f'; g.lineWidth = 3; g.strokeRect(12, 12, 232, 166);
  g.fillStyle = '#f4efe2'; g.textAlign = 'center';
  g.font = '700 40px "Trebuchet MS",Arial,sans-serif'; g.fillText('ROOFTOP', 128, 64);
  g.strokeStyle = '#d8b24a'; g.lineWidth = 2; g.beginPath(); g.moveTo(44, 84); g.lineTo(212, 84); g.stroke();
  g.fillStyle = '#ffe08a'; g.font = '700 46px "Trebuchet MS",Arial,sans-serif'; g.fillText('GAME DAY', 128, 136);
  g.fillStyle = '#cfe6d0'; g.font = '16px Arial'; g.fillText('· climb up ·', 128, 166);
  return new THREE.CanvasTexture(cv);
}

// ------------------------------ emit ----------------------------------
function instMesh(geo, mat, items) {
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
  items.forEach((it, i) => {
    if (it.quat) Q.copy(it.quat);
    else { E.set(it.rot ? it.rot[0] : 0, it.rot ? it.rot[1] : (it.yaw || 0), it.rot ? it.rot[2] : 0); Q.setFromEuler(E); }
    V.set(it.pos[0], it.pos[1], it.pos[2]);
    const s = it.scale; S.set(s ? s[0] : 1, s ? s[1] : 1, s ? s[2] : 1);
    M.compose(V, Q, S); m.setMatrixAt(i, M);
  });
  m.instanceMatrix.needsUpdate = true; wrigleyRoot.add(m); return m;
}
function emit() {
  const groups = new Map();                                              // boxes -> one InstancedMesh per distinct color
  for (const it of boxes) { let g = groups.get(it.color); if (!g) { g = []; groups.set(it.color, g); } g.push(it); }
  for (const [c, g] of groups) instMesh(BOX, toon(c), g);
  if (winU.length) instMesh(PLANE, bmat(0xffffff, { map: winTex(false) }), winU);
  if (winL.length) instMesh(PLANE, bmat(0xffffff, { map: winTex(true) }), winL);
  if (cyls.length) instMesh(CYL, toon(COL.steel), cyls);
  if (cones.length) instMesh(CONE, toon(COL.umbrella), cones);
  if (bulbs.length) {                                                    // string-light glow (world-curve pointsMat)
    const gp = new Float32Array(bulbs.length * 3), aC = new Float32Array(bulbs.length * 3), aS = new Float32Array(bulbs.length);
    bulbs.forEach((b, i) => { gp.set(b, i * 3); aC.set([1, 0.86, 0.55], i * 3); aS[i] = 3.4; });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(gp, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(aC, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(aS, 1));
    wrigleyRoot.add(new THREE.Points(g, pointsMat()));
  }
}

// ------------------------ facade placement ----------------------------
// face 'S' fronts +z (Waveland, toward the park south); 'W' fronts -x
// (Sheffield, toward the park west). u = lateral offset along the facade.
function facadeW(b) { return b.face === 'S' ? (b.x1 - b.x0) : (b.z1 - b.z0); }
function frontXf(b, u, y, off) {
  return b.face === 'S'
    ? { pos: [(b.x0 + b.x1) / 2 + u, y, b.z1 + off], yaw: 0 }
    : { pos: [b.x0 - off, y, (b.z0 + b.z1) / 2 + u], yaw: -Math.PI / 2 };
}
function addWin(xf, lit, w = 1.0, h = 1.5) {
  (lit ? winL : winU).push({ pos: xf.pos, yaw: xf.yaw, scale: [w, h, 1] });
}

// world-edge strips (cornice band / parapet) — only on EXPOSED edges so
// attached party walls don't double up (z-fight + wasted instances).
function corniceEdge(b, e) {
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, y = 9.25;
  if (e === 'S') boxes.push({ pos: [cx, y, b.z1 + 0.1], scale: [b.x1 - b.x0, 0.3, 0.5], color: COL.lime });
  else if (e === 'N') boxes.push({ pos: [cx, y, b.z0 - 0.1], scale: [b.x1 - b.x0, 0.3, 0.5], color: COL.lime });
  else if (e === 'W') boxes.push({ pos: [b.x0 - 0.1, y, cz], scale: [0.5, 0.3, b.z1 - b.z0], color: COL.lime });
  else boxes.push({ pos: [b.x1 + 0.1, y, cz], scale: [0.5, 0.3, b.z1 - b.z0], color: COL.lime });
}
function parapetEdge(b, e) {
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, y = 9.85, t = 0.3;
  if (e === 'S') boxes.push({ pos: [cx, y, b.z1 - t / 2], scale: [b.x1 - b.x0, 0.5, t], color: COL.lime });
  else if (e === 'N') boxes.push({ pos: [cx, y, b.z0 + t / 2], scale: [b.x1 - b.x0, 0.5, t], color: COL.lime });
  else if (e === 'W') boxes.push({ pos: [b.x0 + t / 2, y, cz], scale: [t, 0.5, b.z1 - b.z0], color: COL.lime });
  else boxes.push({ pos: [b.x1 - t / 2, y, cz], scale: [t, 0.5, b.z1 - b.z0], color: COL.lime });
}

// wall colliders ringing a footprint, inset INSIDE so the sidewalk/lamps
// stay clear and the facades can't be walked through.
function wallColliders(b, h) {
  const inset = 0.35, sp = 1.8, r = 0.7;
  const edges = [[b.x0 + inset, b.z0 + inset, b.x1 - inset, b.z0 + inset],
                 [b.x0 + inset, b.z1 - inset, b.x1 - inset, b.z1 - inset],
                 [b.x0 + inset, b.z0 + inset, b.x0 + inset, b.z1 - inset],
                 [b.x1 - inset, b.z0 + inset, b.x1 - inset, b.z1 - inset]];
  for (const [ax, az, bx, bz] of edges) {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / sp));
    for (let k = 0; k <= n; k++) { const t = k / n; collide(ax + (bx - ax) * t, az + (bz - az) * t, r, h); }
  }
}

// =====================================================================
// building archetypes — 3 storeys, flat parapet roof, per-arch features.
//   grey  : limestone greystone, carved lintels, central door
//   brick : red 3-flat with a full-height projecting bay-window stack
//   brown : brown-brick with a raised limestone stoop
const BLD = [
  { x0: -226, x1: -217, z0: -522, z1: -508, face: 'S', arch: 'brick', cap: ['S', 'N', 'W'] },              // W0
  { x0: -217, x1: -208, z0: -522, z1: -508, face: 'S', arch: 'grey', cap: ['S', 'N'], climb: true },       // W1 — climbable
  { x0: -208, x1: -199, z0: -522, z1: -508, face: 'S', arch: 'brown', cap: ['S', 'N', 'E'] },              // W2
  { x0: -184, x1: -170, z0: -478, z1: -462, face: 'W', arch: 'grey', cap: ['W', 'E', 'N'] },               // S0
  { x0: -184, x1: -170, z0: -462, z1: -446, face: 'W', arch: 'brick', cap: ['W', 'E'] },                   // S1
  { x0: -184, x1: -170, z0: -446, z1: -430, face: 'W', arch: 'brown', cap: ['W', 'E', 'S'] },              // S2
];
const bodyColor = a => a === 'grey' ? COL.grey : a === 'brick' ? COL.brick : COL.brown;

function buildBuilding(b) {
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, wx = b.x1 - b.x0, wz = b.z1 - b.z0;
  const bc = bodyColor(b.arch);
  boxes.push({ pos: [cx, BODY_H / 2, cz], scale: [wx, BODY_H, wz], color: bc });                    // body
  boxes.push({ pos: [cx, ROOF_Y - 0.06, cz], scale: [wx - 0.1, 0.12, wz - 0.1], color: COL.tar });  // deck
  for (const e of b.cap) { corniceEdge(b, e); parapetEdge(b, e); }

  // dentil course under the front cornice
  const fw = facadeW(b);
  for (let d = -fw / 2 + 0.4; d <= fw / 2 - 0.4; d += 0.52) {
    const xf = frontXf(b, d, 8.95, 0.28);
    boxes.push({ pos: xf.pos, yaw: xf.yaw, scale: [0.16, 0.18, 0.22], color: COL.lime });
  }

  // window grid on the front face
  const nCol = Math.max(2, Math.round((fw - 1.4) / 2.4));
  const cols = []; for (let c = 0; c < nCol; c++) cols.push(-fw / 2 + fw * (c + 0.5) / nCol);
  const ci = Math.round((nCol - 1) / 2);
  for (let c = 0; c < nCol; c++) for (let f = 0; f < FLOORS.length; f++) {
    if (b.arch === 'brick' && c === ci) continue;             // bay owns the centre column
    if (c === ci && f === 0) continue;                        // door owns centre ground
    addWin(frontXf(b, cols[c], FLOORS[f], 0.06), R() < 0.22);
  }
  // central door (all archetypes)
  { const xf = frontXf(b, cols[ci], 1.15, 0.05); boxes.push({ pos: xf.pos, yaw: xf.yaw, scale: [1.2, 2.1, 0.12], color: COL.dark }); }

  // projecting bay stack (brick)
  if (b.arch === 'brick') {
    const u = cols[ci], proj = b.face === 'S' ? 0.7 : 0.5, bw = 2.0;
    if (b.face === 'S') boxes.push({ pos: [cx + u, 4.2, b.z1 + proj / 2], scale: [bw, 8, proj], color: bc });
    else boxes.push({ pos: [b.x0 - proj / 2, 4.2, cz + u], scale: [proj, 8, bw], color: bc });
    for (const f of FLOORS) addWin(frontXf(b, u, f, proj + 0.05), R() < 0.3, 1.15, 1.6);
    if (b.face === 'W') collide(b.x0 - proj, cz + u, 0.5, 12);
  }
  // raised limestone stoop (brown)
  if (b.arch === 'brown') {
    const u = cols[ci];
    for (let s = 0; s < 4; s++) {
      const top = 0.2 * (s + 1), out = 0.95 - s * 0.22;
      if (b.face === 'S') boxes.push({ pos: [cx + u, top / 2, b.z1 + out], scale: [1.7, top, 0.34], color: COL.lime });
      else boxes.push({ pos: [b.x0 - out, top / 2, cz + u], scale: [0.34, top, 1.7], color: COL.lime });
    }
    if (b.face === 'W') collide(b.x0 - 0.8, cz + u, 0.6, 12);
  }

  if (!b.climb) wallColliders(b, 12);                         // climbable one is walled by its roof railing
}

// exposed END-face windows on the four row-end buildings (seen down-street)
function endWindows(base, yaw) {
  for (let f = 0; f < FLOORS.length; f++) for (const u of [-3.4, 3.4]) winU.push({ pos: base(u, FLOORS[f]), yaw, scale: [0.95, 1.5, 1] });
}

// ---------------------- rooftop bleachers -----------------------------
// 3–4 rising benches on a steel frame, oriented toward the park.
function buildBleachers(b, rows) {
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, wx = b.x1 - b.x0, wz = b.z1 - b.z0;
  const seat0 = ROOF_Y + 0.55;
  if (b.face === 'S') {                                       // rows step NORTH, viewers face +z
    const span = wx - 1.8, frontZ = b.z1;
    for (let i = 0; i < rows; i++) {
      const rz = frontZ - 1.9 - i * 1.25, sy = seat0 + i * 0.5, legH = sy - ROOF_Y;
      boxes.push({ pos: [cx, sy, rz], scale: [span, 0.12, 0.42], color: COL.tan });
      boxes.push({ pos: [cx, sy - 0.28, rz + 0.22], scale: [span, 0.1, 0.28], color: COL.tan });
      for (const sx of [-1, 1]) boxes.push({ pos: [cx + sx * (span / 2 - 0.1), ROOF_Y + legH / 2, rz], scale: [0.12, legH, 0.12], color: COL.green });
    }
  } else {                                                    // Sheffield: rows step EAST, viewers face -x
    const span = wz - 1.8, frontX = b.x0;
    for (let i = 0; i < rows; i++) {
      const rx = frontX + 1.9 + i * 1.25, sy = seat0 + i * 0.5, legH = sy - ROOF_Y;
      boxes.push({ pos: [rx, sy, cz], scale: [0.42, 0.12, span], color: COL.tan });
      boxes.push({ pos: [rx - 0.22, sy - 0.28, cz], scale: [0.28, 0.1, span], color: COL.tan });
      for (const sz of [-1, 1]) boxes.push({ pos: [rx, ROOF_Y + legH / 2, cz + sz * (span / 2 - 0.1)], scale: [0.12, legH, 0.12], color: COL.green });
    }
  }
}

// string-light strand between two roof points, with sag + glow bulbs + wire
function strand(ax, ay, az, bx, by, bz, n, sag) {
  let px = ax, py = ay, pz = az;
  for (let i = 1; i <= n; i++) {
    const t = i / n, s = Math.sin(Math.PI * t) * sag;
    const x = ax + (bx - ax) * t, y = ay + (by - ay) * t - s, z = az + (bz - az) * t;
    bulbs.push([x, y, z]);
    seg(px, py, pz, x, y, z, 0.03, COL.dark);
    px = x; py = y; pz = z;
  }
}

// generic rooftop clutter
function cooler(x, z, roofCollide) {
  boxes.push({ pos: [x, ROOF_Y + 0.26, z], scale: [0.7, 0.5, 0.46], color: COL.red });
  boxes.push({ pos: [x, ROOF_Y + 0.53, z], scale: [0.74, 0.06, 0.5], color: COL.dark });
  if (roofCollide) collide(x, z, 0.45, 12);
}
function chair(x, z, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  boxes.push({ pos: [x, ROOF_Y + 0.44, z], yaw, scale: [0.42, 0.06, 0.42], color: COL.dark });
  boxes.push({ pos: [x - s * 0.2, ROOF_Y + 0.68, z - c * 0.2], yaw, scale: [0.42, 0.42, 0.05], color: COL.dark });
}
function umbrella(x, z) {
  cyls.push({ pos: [x, ROOF_Y + 1.3, z], scale: [0.1, 2.6, 0.1] });
  cones.push({ pos: [x, ROOF_Y + 2.9, z], scale: [2.8, 1.2, 2.8] });
}

// =====================================================================
// climbable roof (W1) — external EAST stair, perimeter railing, bleachers,
// coin-op binocular, cooler, peanut shells, sidewalk sandwich board.
function buildClimbable(b) {
  const cx = (b.x0 + b.x1) / 2, e = 0.25;
  const xIn = ST.x0 + 0.3, xOut = ST.x1 - 0.3, mid = (ST.x0 + ST.x1) / 2;   // -207.7, -205.3, -206.5
  const zTop = ST.z0, zBot = ST.z1;                                          // -520, -508

  // --- external steel stair (2 stringers + 14 treads + risers) ---
  seg(xIn, ST.yBot, zBot, xIn, ST.yTop, zTop, 0.22, COL.steel);
  seg(xOut, ST.yBot, zBot, xOut, ST.yTop, zTop, 0.22, COL.steel);
  const nT = 14;
  for (let i = 0; i < nT; i++) {
    const z = (zBot - 1) + ((zTop + 0.5) - (zBot - 1)) * i / (nT - 1), y = rampY(z);
    boxes.push({ pos: [mid, y - 0.06, z], scale: [2.5, 0.12, 0.78], color: COL.steel });         // tread
    boxes.push({ pos: [mid, y - 0.4, z + 0.36], scale: [2.5, 0.62, 0.08], color: COL.steel });   // riser
  }
  // --- stair handrails both sides (posts + sloped rail) + colliders ---
  for (const [x, inner] of [[xIn, true], [xOut, false]]) {
    for (let z = zBot - 0.6; z >= zTop + 0.6; z -= 1.45) {
      const y = rampY(z);
      cyls.push({ pos: [x, y + 0.5, z], scale: [0.09, 1.0, 0.09] });
      const topMouth = inner && z <= zTop + 2.4;               // where the inner rail meets the roof
      const atBottom = z >= zBot - 1.6;                        // sidewalk mouth
      if (!topMouth && !atBottom) collide(x, z, 0.4, 12);
    }
    seg(x, rampY(zBot - 0.6) + 1.0, zBot - 0.6, x, rampY(zTop + 0.6) + 1.0, zTop + 0.6, 0.05, COL.steel);
  }

  // --- perimeter railing + colliders on ALL roof edges except the stair mouth ---
  const railEdges = [
    ['S', b.x0 + e, b.z1 - e, b.x1 - e, b.z1 - e],
    ['N', b.x0 + e, b.z0 + e, b.x1 - e, b.z0 + e],
    ['W', b.x0 + e, b.z0 + e, b.x0 + e, b.z1 - e],
    ['E', b.x1 - e, b.z0 + e, b.x1 - e, b.z1 - e],
  ];
  for (const [id, ax, az, bx, bz] of railEdges) {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 1.5));
    let sax = ax, saz = az, run = true;
    for (let k = 0; k <= n; k++) {
      const t = k / n, px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
      const mouth = id === 'E' && pz >= zTop - 0.5 && pz <= zTop + 2.5;      // stair top mouth
      if (!mouth) { cyls.push({ pos: [px, ROOF_Y + 0.55, pz], scale: [0.08, 1.1, 0.08] }); collide(px, pz, 0.4, 12); }
      if (id === 'E' && mouth && run) { seg(sax, ROOF_Y + 1.05, saz, px, ROOF_Y + 1.05, pz, 0.05, COL.steel); run = false; }
      else if (id === 'E' && !mouth && !run) { sax = px; saz = pz; run = true; }
    }
    if (id !== 'E') seg(ax, ROOF_Y + 1.05, az, bx, ROOF_Y + 1.05, bz, 0.05, COL.steel);
    else if (run) seg(sax, ROOF_Y + 1.05, saz, bx, ROOF_Y + 1.05, bz, 0.05, COL.steel);
  }

  buildBleachers(b, 4);                                        // south-half benches face the park

  // --- coin-op BINOCULAR viewer at the south railing ---
  const bx = cx + 1.4, bz = b.z1 - 0.9;
  cyls.push({ pos: [bx, ROOF_Y + 0.6, bz], scale: [0.17, 1.2, 0.17] });                          // pole
  boxes.push({ pos: [bx, ROOF_Y + 1.35, bz], rot: [0.18, 0, 0], scale: [0.5, 0.34, 0.66], color: COL.silver }); // head
  for (const sx of [-0.12, 0.12]) cyls.push({ pos: [bx + sx, ROOF_Y + 1.28, bz - 0.34], rot: [Math.PI / 2, 0, 0], scale: [0.09, 0.26, 0.09] }); // eyepieces (face the viewer, north)
  collide(bx, bz, 0.45, 12);

  // --- cooler, folding chairs, peanut shells ---
  cooler(cx - 2.6, b.z0 + 2.2, true);
  chair(cx - 2.9, b.z1 - 4.2, 0.2); chair(cx - 1.9, b.z1 - 4.8, -0.3);
  for (let i = 0; i < 16; i++)
    boxes.push({ pos: [rr(b.x0 + 1, b.x1 - 1), ROOF_Y + 0.05, rr(b.z0 + 1, b.z1 - 1)], yaw: rr(0, 6.28), scale: [0.1, 0.03, 0.06], color: COL.tan });

  // string lights strung along the front + back eaves (taut, above the parapet)
  strand(b.x0 + 0.4, 10.5, b.z1 - 0.3, b.x1 - 0.4, 10.5, b.z1 - 0.3, 9, 0.26);
  strand(b.x0 + 0.4, 10.5, b.z0 + 0.35, b.x1 - 0.4, 10.5, b.z0 + 0.35, 7, 0.22);

  // --- sandwich board at the sidewalk stair gate ---
  const sX = -204, sZ = -506.4;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.66), bmat(0xffffff, { map: sandwichTex(), side: THREE.DoubleSide }));
  panel.position.set(sX, 0.62, sZ); panel.rotation.x = 0.1; wrigleyRoot.add(panel);
  seg(sX - 0.34, 0.98, sZ - 0.02, sX - 0.4, 0, sZ + 0.28, 0.05, COL.dark);
  seg(sX + 0.34, 0.98, sZ - 0.02, sX + 0.4, 0, sZ + 0.28, 0.05, COL.dark);
  collide(sX, sZ, 0.45);
}

// =====================================================================
export function buildRooftops() {
  for (const b of BLD) buildBuilding(b);

  // end-face windows on the four exposed row-ends
  endWindows((u, y) => [-226.06, y, -515 + u], -Math.PI / 2);   // W0 west
  endWindows((u, y) => [-198.94, y, -515 + u], Math.PI / 2);    // W2 east
  endWindows((u, y) => [-177 + u, y, -478.06], Math.PI);        // S0 north
  endWindows((u, y) => [-177 + u, y, -429.94], 0);              // S2 south

  for (const b of BLD) {
    if (b.climb) { buildClimbable(b); continue; }
    buildBleachers(b, 3 + (R() < 0.5 ? 1 : 0));
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    if (b.face === 'S') { cooler(cx + 2.4, b.z0 + 2.0); chair(cx - 2.6, b.z0 + 2.4, 0.4); }
    else { cooler(b.x1 - 2.2, cz + 3.0); chair(b.x1 - 2.4, cz - 3.4, -1.2); }
    if (R() < 0.6) umbrella(b.face === 'S' ? cx - 2.6 : b.x1 - 2.4, b.face === 'S' ? b.z0 + 2.6 : cz - 2.6);
    if (b.face === 'S') strand(b.x0 + 0.4, 10.5, b.z1 - 0.3, b.x1 - 0.4, 10.5, b.z1 - 0.3, 7, 0.26);
    else strand(b.x0 + 0.4, 10.5, b.z0 + 0.3, b.x0 + 0.4, 10.5, b.z1 - 0.3, 8, 0.26);
  }

  emit();
}
