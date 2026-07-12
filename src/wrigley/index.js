// =====================================================================
// WRIGLEYVILLE cell — orchestrator + ground layer + minimap base.
// Sub-builders (stadium/streets/station/rooftops/village) each own a file
// and attach everything to wrigleyRoot. ALL randomness comes from wrand
// (local m32, seed 19140423) — never the shared world rng (determinism
// hard-constraint: this cell must not move a single lakefront towel).
// =====================================================================
import * as THREE from 'three';
import { scene, toon, mulberry32 } from '../core.js';
import { registerCell, mergeCellStatic } from '../cells.js';
import * as WV from '../data/wrigleyville.js';
import { buildStreets } from './streets.js';
import { buildStation } from './station.js';
import { buildStadium } from './stadium.js';
import { buildRooftops } from './rooftops.js';
import { buildVillage } from './village.js';
import { buildDressing } from './dressing.js';
import { buildCorners } from './corners.js';
import { buildFieldplay } from './fieldplay.js';

const _r = mulberry32(WV.SEED_W);
export const wrand = (a = 0, b = 1) => a + (b - a) * _r();
export const wrigleyRoot = new THREE.Group();
wrigleyRoot.name = 'cell-wrigleyville';

// dense grids so the world-curve vertex shader bends them smoothly
function flatGrid(w, d, segW, segD, y, color) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d, segW, segD), toon(color));
  m.rotation.x = -Math.PI / 2; m.position.y = y;
  return m;
}
// sheared strip following clarkX(z) between lateral offsets off0..off1
function paraStrip(off0, off1, z0, z1, y, color, step = 6) {
  const pos = [], idx = [];
  const n = Math.max(2, Math.ceil((z1 - z0) / step) + 1);
  for (let i = 0; i < n; i++) {
    const z = z0 + (z1 - z0) * i / (n - 1), c = WV.clarkX(z);
    pos.push(c + off0, y, z, c + off1, y, z);
    if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k, k + 1, k - 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, toon(color));
}
// wedge strip: per-row x from the Clark curb (clarkX(z)+off0) to the bowl wall
// (gallagherWallX(z)) — the triangular Gallagher plaza floor
function wedgeStrip(off0, z0, z1, y, color, step = 4) {
  const pos = [], idx = [];
  const n = Math.max(2, Math.ceil((z1 - z0) / step) + 1);
  for (let i = 0; i < n; i++) {
    const z = z0 + (z1 - z0) * i / (n - 1);
    pos.push(WV.clarkX(z) + off0, y, z, WV.gallagherWallX(z), y, z);
    if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k, k + 1, k - 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, toon(color));
}

const ASPHALT = 0x4a4a52, GROUND = 0x63594e;

function buildGround() {
  const g = flatGrid(320, 430, 42, 56, -0.04, GROUND);
  g.position.set(-240, -0.04, -470);
  wrigleyRoot.add(g);
  // street asphalt (base layer; streets.js adds curbs/markings/furniture)
  const T = WV.STREETS_W;
  for (const s of [T.addison, T.waveland]) {
    const m = flatGrid(s.x1 - s.x0, s.z1 - s.z0, 24, 3, 0.0, ASPHALT);
    m.position.set((s.x0 + s.x1) / 2, 0.0, (s.z0 + s.z1) / 2);
    wrigleyRoot.add(m);
  }
  for (const s of [T.sheffield, T.kenmore]) {
    const m = flatGrid(s.x1 - s.x0, s.z1 - s.z0, 3, 16, 0.0, ASPHALT);
    m.position.set((s.x0 + s.x1) / 2, 0.0, (s.z0 + s.z1) / 2);
    wrigleyRoot.add(m);
  }
  wrigleyRoot.add(paraStrip(-T.clark.halfW, T.clark.halfW, T.clark.z0, T.clark.z1, 0.0, ASPHALT));
  // task 033: the Clark STUB — the reserved right-of-way continuing past the
  // z −385.5 CPD line as scenery (CLARK_STUB_W). Same cached ASPHALT material
  // → folds into the existing merge bucket, +0 draw calls.
  const CS = WV.CLARK_STUB_W;
  wrigleyRoot.add(paraStrip(-T.clark.halfW, T.clark.halfW, CS.z0, CS.z1, 0.0, ASPHALT));
  const G = WV.GALLAGHER_W;                        // plaza pavers, slightly warm
  wrigleyRoot.add(wedgeStrip(G.off0, G.z0, G.z1, 0.01, 0x8b7f6d));
}

// ------------------------- minimap base -------------------------------
function buildMinimapBase() {
  const M = WV.MAP_W;
  const cv = document.createElement('canvas'); cv.width = M.cw; cv.height = M.ch;
  const g = cv.getContext('2d');
  const wm = (x, z) => [(x - M.x0) / M.w * M.cw, (z - M.z0) / M.h * M.ch];
  g.fillStyle = '#3d3a45'; g.fillRect(0, 0, M.cw, M.ch);          // night city
  // streets
  g.strokeStyle = '#8d8798'; g.lineCap = 'round';
  const T = WV.STREETS_W;
  const line = (a, b, w) => { g.lineWidth = w; g.beginPath(); g.moveTo(...wm(a[0], a[1])); g.lineTo(...wm(b[0], b[1])); g.stroke(); };
  line([T.addison.x0, T.addison.z], [T.addison.x1, T.addison.z], 8);
  line([T.waveland.x0, T.waveland.z], [T.waveland.x1, T.waveland.z], 7);
  line([T.sheffield.x, T.sheffield.z0], [T.sheffield.x, T.sheffield.z1], 7);
  line([T.kenmore.x, T.kenmore.z0], [T.kenmore.x, T.kenmore.z1], 4);
  line([WV.clarkX(T.clark.z0), T.clark.z0], [WV.clarkX(T.clark.z1), T.clark.z1], 9);
  { // task 033: Clark continues past the closure — dimmer, thinner stub line
    const CS = WV.CLARK_STUB_W;
    g.strokeStyle = '#6f6a7a';
    line([WV.clarkX(CS.z0), CS.z0], [WV.clarkX(CS.z1), CS.z1], 6);
    g.strokeStyle = '#8d8798';
  }
  // the park
  g.fillStyle = '#2e7d4f'; g.beginPath();
  WV.STADIUM_W.poly.forEach((p, i) => { const [mx, my] = wm(p[0], p[1]); i ? g.lineTo(mx, my) : g.moveTo(mx, my); });
  g.closePath(); g.fill();
  { // infield diamond wink
    const [hx, hy] = wm(...WV.STADIUM_W.homePlate);
    g.fillStyle = '#c9a36a'; g.save(); g.translate(hx, hy); g.rotate(Math.PI / 4);
    g.fillRect(-4, -4, 8, 8); g.restore();
  }
  { // Gallagher Way lawn (the WEDGE: Clark curb west, bowl wall east)
    const G = WV.GALLAGHER_W;
    g.fillStyle = '#5da06a'; g.beginPath();
    const p = [[WV.clarkX(G.z0) + G.off0, G.z0], ...G.wall, [WV.clarkX(G.z1) + G.off0, G.z1]];
    p.forEach((q, i) => { const [mx, my] = wm(q[0], q[1]); i ? g.lineTo(mx, my) : g.moveTo(mx, my); });
    g.closePath(); g.fill();
  }
  { // Gallagher office block (task 052 / issue 020) — the limestone mass closing
    // the plaza's NW corner; without it the minimap read as a void where the
    // player stood (they'd sunk into the office's stray base band). Rotated
    // rect on the Clark-sheared frame, matching buildGallagherOffice.
    const O = WV.OFFICE_W, zc = (O.z0 + O.z1) / 2, cx = WV.clarkX(zc) + 27;
    const co = Math.cos(WV.clarkYaw), si = Math.sin(WV.clarkYaw), h = 12;   // half dep/wid
    g.fillStyle = '#8f8a86'; g.beginPath();
    [[-h, -h], [h, -h], [h, h], [-h, h]].forEach(([lx, lz], i) => {
      const [mx, my] = wm(cx + lx * co + lz * si, zc - lx * si + lz * co);
      i ? g.lineTo(mx, my) : g.moveTo(mx, my);
    });
    g.closePath(); g.fill();
  }
  { // Red Line embankment
    const S = WV.STATION_W.embank;
    const [ax, ay] = wm(S.x0, S.z0), [bx, by] = wm(S.x1, S.z1);
    g.fillStyle = '#6d4a4a'; g.fillRect(ax, ay, bx - ax, by - ay);
  }
  // landmarks
  const dot = (x, z, c, r = 5) => { const [mx, my] = wm(x, z); g.fillStyle = c; g.beginPath(); g.arc(mx, my, r, 0, 7); g.fill(); };
  dot(WV.STADIUM_W.marquee.x, WV.STADIUM_W.marquee.z, '#e0574a', 6);   // marquee
  dot(-140, WV.STATION_W.signZ, '#c62828', 5);                         // Addison stop
  dot(-170, -541, '#e8b64c', 4);                                       // Murphy's
  dot(-242, -582, '#d05a3a', 4);                                       // Engine 78
  return cv;
}

let built = false;
export function buildWrigleyville() {
  if (built) return; built = true;
  buildGround();
  // each builder owns a private m32 seed — files stay order-independent
  buildStreets();
  buildStation();
  buildStadium();
  buildRooftops();
  buildDressing();   // streetscape fabric (task 016) — before buildVillage so its atlas signs land in the shared atlas
  buildCorners();    // task 020 corner truth — after dressing, before village so its atlas signs land before emitAtlas
  buildVillage();
  buildFieldplay();
  mergeCellStatic(wrigleyRoot, 1e6);   // collapse static builder meshes; ONE z-band — the cell is ~200 m deep, always fully inside the fog bubble, and invisible from elsewhere
  scene.add(wrigleyRoot);
  registerCell({
    id: WV.CELL_ID, root: wrigleyRoot,
    walkable: WV.walkableW, surfaceY: WV.surfaceYW,
    clamp: WV.CLAMP_W, spawn: WV.SPAWN_W,
    minimapBase: buildMinimapBase(), minimapBounds: WV.MAP_W,
  });
}
