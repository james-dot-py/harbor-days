// Millennium arrival — CTA RED LINE subway stair kiosk on the Michigan spine.
// This is downtown's Red Line: a State-St SUBWAY, not an 'L'. A street stair
// descends WEST from an EAST-facing mouth down into a dim tiled landing that
// DEAD-ENDS POLITELY (tiled back wall, NO "future"/"coming soon" signage —
// owner rule). Above grade: steel head-house railings, a low steel-and-glass
// canopy, and the RED LINE pylon that gives the arrival its identity.
//
// EXCLUSIVE OWNER of this file. Everything attaches to millenniumRoot. All
// randomness is LOCAL (mulberry32 0x4d2000) — never the shared world rng
// (determinism hard constraint: this must not move a single lakefront towel).
import * as THREE from 'three';
import { millenniumRoot, emitInstanced } from './index.js';
import { toon, bmat, mulberry32 } from '../core.js';
import { collide } from '../props.js';
import * as M from '../data/millennium.js';

const R = mulberry32(0x4d2000);
const rr = (a, b) => a + (b - a) * R();

// ---- dim, cool subway wall-tile patch (self-lit; reads as the shadowed
// bottom of the stair). 4x4 pale-cool tiles + dark grout, tiny per-tile
// brightness jitter from the LOCAL rng. Reused (fresh CanvasTexture per
// surface so each gets its own repeat, i.e. consistent tile scale).
function tileCanvas() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#454e59'; g.fillRect(0, 0, 128, 128);              // grout (dim blue-grey)
  const n = 4, s = 128 / n, gap = 2.5;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const b = 150 + rr(-10, 12);                                    // dim off-white, cool cast
    g.fillStyle = `rgb(${Math.round(b * 0.9)},${Math.round(b * 0.95)},${Math.round(b * 1.02)})`;
    g.fillRect(i * s + gap, j * s + gap, s - gap * 2, s - gap * 2);
  }
  return cv;
}
const TILE_CV = tileCanvas();
function tiledPlane(w, h, patchM = 1.5) {
  const t = new THREE.CanvasTexture(TILE_CV);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / patchM, h / patchM); t.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), bmat(0xffffff, { map: t, side: THREE.DoubleSide }));
}

// ---- RED LINE pylon panel: CTA red field, white transit disc, bold "RED LINE".
function pylonPanelTex() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 360;
  const g = cv.getContext('2d');
  g.fillStyle = '#c9252c'; g.fillRect(0, 0, 512, 360);              // CTA red field
  g.strokeStyle = '#7d1519'; g.lineWidth = 14; g.strokeRect(7, 7, 498, 346);
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(256, 96, 62, 0, 7); g.fill();   // white transit disc
  g.fillStyle = '#c9252c'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 92px Arial, sans-serif'; g.fillText('M', 256, 102);             // 'M'-ish transit mark
  g.fillStyle = '#ffffff';
  let fs = 104; g.font = `900 ${fs}px Arial, sans-serif`;
  while (g.measureText('RED LINE').width > 460 && fs > 40) { fs -= 3; g.font = `900 ${fs}px Arial, sans-serif`; }
  g.fillText('RED LINE', 256, 262);
  const t = new THREE.CanvasTexture(cv);
  t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.anisotropy = 4; return t;
}

export function buildArrival() {
  const add = m => millenniumRoot.add(m);
  const K = M.KIOSK_M;                                             // x48..52.5, z796..804.5, pylonZ 800

  // ---- stair-shaft constants (descends WEST from the EAST mouth to a landing)
  const MOUTHX = 52.5, BACKX = 48.45, SZ0 = 798.6, SZ1 = 801.4;
  const SZC = (SZ0 + SZ1) / 2, SZW = SZ1 - SZ0;
  const BOT = -3.2, N = 8, riser = -BOT / N, tread = 0.30;

  // 1a. STAIR STEPS — instanced concrete boxes marching west + down.
  const steps = [];
  for (let i = 1; i <= N; i++) {
    const treadTop = -riser * i, cx = MOUTHX - tread * (i - 0.5);
    steps.push({ pos: [cx, treadTop - 0.25, SZC], scale: [tread + 0.06, 0.5, SZW], color: 0x8a8f96 });
  }
  emitInstanced(new THREE.BoxGeometry(1, 1, 1), steps);

  // 1b. TILED landing floor + dark dead-end back wall + side walls (in shadow).
  const LX1 = MOUTHX - tread * N;                                  // landing x-run under the last step
  const floor = tiledPlane(LX1 - BACKX, SZW);
  floor.rotation.x = -Math.PI / 2; floor.position.set((BACKX + LX1) / 2, BOT + 0.01, SZC); add(floor);
  const back = tiledPlane(SZW, -BOT);                              // west dead-end (faces east)
  back.rotation.y = Math.PI / 2; back.position.set(BACKX, BOT / 2, SZC); add(back);
  for (const z of [SZ0, SZ1]) {                                    // N & S stairwell walls
    const wall = tiledPlane(MOUTHX - BACKX, -BOT);
    wall.position.set((BACKX + MOUTHX) / 2, BOT / 2, z); add(wall);
  }

  // 1c. dark concrete retaining COPING framing the opening (3 non-entry sides).
  const cop = toon(0x54585e);
  for (const b of [
    [BACKX - 0.35, MOUTHX + 0.2, SZ0 - 0.55, SZ0 - 0.05],          // north lip
    [BACKX - 0.35, MOUTHX + 0.2, SZ1 + 0.05, SZ1 + 0.55],          // south lip
    [BACKX - 0.35, BACKX + 0.05, SZ0 - 0.55, SZ1 + 0.55],          // west lip
  ]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b[1] - b[0], 0.2, b[3] - b[2]), cop);
    m.position.set((b[0] + b[1]) / 2, 0.05, (b[2] + b[3]) / 2); add(m);
  }

  // 2. HEAD-HOUSE railings (stainless pipe): posts (instanced) + top rails (merged)
  const steel = 0x8f959c;
  const NZ = SZ0 - 0.45, SZr = SZ1 + 0.45, WX = BACKX - 0.4, EX = MOUTHX + 0.15;
  const posts = [];
  for (let x = WX; x <= EX + 1e-6; x += (EX - WX) / 4) {           // N & S runs of posts
    posts.push({ pos: [x, 0.5, NZ], color: steel });
    posts.push({ pos: [x, 0.5, SZr], color: steel });
  }
  for (const z of [SZ0, SZC, SZ1]) posts.push({ pos: [WX, 0.5, z], color: steel });  // W run
  emitInstanced(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), posts);
  const railGeo = new THREE.CylinderGeometry(0.045, 0.045, 1, 8);
  const mkRail = (len, pos, rot) => {
    const m = new THREE.Mesh(railGeo, toon(steel)); m.scale.y = len;
    m.position.set(pos[0], pos[1], pos[2]); Object.assign(m.rotation, rot); add(m);
  };
  mkRail(EX - WX, [(WX + EX) / 2, 1.0, NZ], { z: Math.PI / 2 });   // north top rail (axis X)
  mkRail(EX - WX, [(WX + EX) / 2, 1.0, SZr], { z: Math.PI / 2 });  // south top rail
  mkRail(SZr - NZ, [WX, 1.0, (NZ + SZr) / 2], { x: Math.PI / 2 }); // west top rail (axis Z)

  // low steel-and-glass entrance canopy over the east mouth (thin + high)
  const canGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8);
  for (const z of [NZ, SZr]) { const p = new THREE.Mesh(canGeo, toon(steel)); p.position.set(EX, 1.3, z); add(p); }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, (SZr - NZ) + 0.4), toon(0xbcc6cc));
  roof.position.set(EX - 0.1, 2.62, SZC); add(roof);

  // 3. RED LINE PYLON — slim blade + lollipop panel at the stair head (street side)
  const PX = 50, PZ = K.z0 + 1.3;                                 // (50, 797.3) — solid north lip
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.5, 0.2), toon(0x33343a));
  blade.position.set(PX, 1.25, PZ); add(blade);                  // post ENDS at panel bottom (lollipop)
  const panelMat = bmat(0xffffff, { map: pylonPanelTex() });
  for (const s of [1, -1]) {                                      // back-to-back FrontSide (no mirror)
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.95), panelMat);
    face.position.set(PX + s * 0.04, 2.98, PZ);
    face.rotation.y = Math.PI / 2 + (s === 1 ? 0 : Math.PI);
    add(face);
  }

  // 4. COLLIDERS — the player walks AROUND the kiosk (the pit is visual-only).
  for (const xc of [49.3, 51.6]) for (const zc of [797.5, 799.5, 801.5, 803.5]) collide(xc, zc, 1.2);
  collide(PX, PZ, 0.35);                                          // the pylon post
}
