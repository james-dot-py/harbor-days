// =====================================================================
// MILLENNIUM PARK · Chase Promenade allee + scenery objects (task 041 D).
// The signature "broad paved allee between DOUBLE ROWS OF TREES, past a
// curved inscribed limestone PLINTH" (mp-promenade), plus the corner reads:
// Exelon black-glass cubes, Monroe food trucks over the fence, Nichols
// Bridgeway leaving the frame, McDonald's Cycle Center in the NE pocket.
//
// DETERMINISM: LOCAL mulberry32 only (never the shared world rng — moving a
// single lakefront towel is a hard-constraint regression). Everything is
// attached to millenniumRoot. Trees = exactly 2 instanced buckets (all
// trunks / all canopies); Exelon adds 2 more (cube bodies / lit windows).
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { millenniumRoot, emitInstanced } from './index.js';
import { toon, bmat, mulberry32 } from '../core.js';
import { collide } from '../props.js';
import * as M from '../data/millennium.js';

// Inscribed-limestone signage face (engraved dark serif on a limestone ground).
function inscribedTex(text) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 232;
  const g = cv.getContext('2d');
  g.fillStyle = '#d8cfb8'; g.fillRect(0, 0, 512, 232);
  g.strokeStyle = '#c3b99e'; g.lineWidth = 6; g.strokeRect(14, 14, 484, 204);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 66; g.font = `600 ${fs}px Georgia,serif`;
  while (g.measureText(text).width > 452 && fs > 26) { fs -= 2; g.font = `600 ${fs}px Georgia,serif`; }
  g.fillStyle = '#efe8d4'; g.fillText(text, 256, 118 + 2);   // highlight lip (engraved feel)
  g.fillStyle = '#544b39'; g.fillText(text, 256, 118);       // incised dark fill
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
// Shared red/cream striped food-truck awning (symmetric — DoubleSide safe).
function awningTex() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
  const g = cv.getContext('2d'); const n = 8, w = 128 / n;
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#f3ede0' : '#d94f3d'; g.fillRect(i * w, 0, w + 1, 64); }
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}

export function buildPromenade() {
  const R = mulberry32(0x4d4000);
  const rr = (a, b) => a + (b - a) * R();
  const root = millenniumRoot;

  // ---- 1. CHASE PROMENADE ALLEE — double rows of chunky toon trees --------
  // Trunk (one cylinder, base at y0) + canopy (4 sphere lobes MERGED once,
  // instanced with per-tree scale/yaw jitter). Two buckets total.
  const trunkGeo = new THREE.CylinderGeometry(0.28, 0.4, 3.2, 7);
  trunkGeo.translate(0, 1.6, 0);
  const canopyGeo = BufferGeometryUtils.mergeBufferGeometries(
    [[0, 0.15, 0, 1.75], [0.95, 0.2, 0.2, 1.25], [-0.85, 0.1, -0.3, 1.2], [0.15, 0.6, -0.55, 1.1]]
      .map(([x, y, z, r]) => { const s = new THREE.SphereGeometry(r, 8, 6); s.translate(x, y, z); return s; }),
    false);

  const trunks = [], canopies = [];
  const NT = 15;                                     // ~11 m spacing over z 720..880
  for (const rowX of M.CHASE_M.treeRowsX) {
    for (let i = 0; i < NT; i++) {
      const z = 720 + i * (160 / (NT - 1));
      const x = rowX + rr(-0.5, 0.5);
      const s = rr(0.9, 1.2);
      trunks.push({ pos: [x, 0, z], yaw: rr(0, 6.283), color: 0x6b4a30 });
      canopies.push({ pos: [x, 4.2 + rr(-0.2, 0.35), z], yaw: rr(0, 6.283), scale: [s, s, s], color: 0x3f7d3a });
      collide(x, z, 0.4);                             // allee trunks are colliders (statue pattern)
    }
  }
  emitInstanced(trunkGeo, trunks);
  emitInstanced(canopyGeo, canopies);

  // ---- 2. INSCRIBED LIMESTONE PLINTHS (the park's signage form) ------------
  // Low curbed limestone block; back-to-back FrontSide text on both broad
  // (±z) faces. N pair reads CHASE PROMENADE, S pair reads MILLENNIUM PARK.
  // One shared material per text → the 4 like faces merge to a single draw.
  const chaseMat = bmat(0xffffff, { map: inscribedTex('CHASE PROMENADE') });
  const millMat = bmat(0xffffff, { map: inscribedTex('MILLENNIUM PARK') });
  for (const p of M.CHASE_M.plinths) {
    const mat = p.z < 800 ? chaseMat : millMat;
    const curb = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.18, 0.95), toon(0xcfc6ad));
    curb.position.set(p.x, 0.09, p.z); root.add(curb);
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 0.75), toon(0xd8cfb8));
    body.position.set(p.x, 0.63, p.z); root.add(body);
    for (const s of [1, -1]) {                        // back-to-back FrontSide (no DoubleSide mirror)
      const face = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.9), mat);
      face.position.set(p.x, 0.66, p.z + s * 0.39);
      face.rotation.y = s === 1 ? 0 : Math.PI;
      root.add(face);
    }
    collide(p.x, p.z, 1.1);
  }

  // ---- 3. BOEING GALLERY paving patches + low planters (minor) -------------
  const patchMat = toon(0xb8b0a0), planterMat = toon(0x63754a);
  for (const b of M.CHASE_M.boeing) {
    const patch = new THREE.Mesh(new THREE.BoxGeometry(10, 0.05, 10), patchMat);
    patch.position.set(b.x, 0.02, b.z); root.add(patch);
    for (const [ox, oz] of [[-4, -4], [4, 4]]) {
      const pl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.6), planterMat);
      pl.position.set(b.x + ox, 0.4, b.z + oz); root.add(pl);
      collide(b.x + ox, b.z + oz, 0.9);
    }
  }

  // ---- 4. EXELON PAVILIONS — 4 black-glass cubes + lit window grid ---------
  // Cube bodies = 1 instanced bucket; window planes = 1 instanced basic
  // bucket. Cubes stand on the walks as colliders (Wrigleyville pattern).
  const EX = M.EXELON_M, half = EX.sz / 2, eps = 0.05;
  const cubeGeo = new THREE.BoxGeometry(EX.sz, EX.h, EX.sz);
  const winGeo = new THREE.PlaneGeometry(1.1, 1.2);
  const faces = [
    { n: [-1, 0, 0], yaw: -Math.PI / 2 }, { n: [1, 0, 0], yaw: Math.PI / 2 },
    { n: [0, 0, 1], yaw: 0 }, { n: [0, 0, -1], yaw: Math.PI },
  ];
  const cubes = [], wins = [];
  for (const c of EX.cubes) {
    cubes.push({ pos: [c.x, EX.h / 2, c.z], color: 0x1c2228 });
    for (const f of faces) {
      const isX = f.n[0] !== 0;
      for (const col of [-1.7, 1.7]) for (const y of [1.6, 3.0, 4.4]) {
        const px = c.x + f.n[0] * (half + eps) + (isX ? 0 : col);
        const pz = c.z + f.n[2] * (half + eps) + (isX ? col : 0);
        wins.push({ pos: [px, y, pz], yaw: f.yaw, color: 0x9fb4c8 });
      }
    }
    collide(c.x, c.z, half);
  }
  emitInstanced(cubeGeo, cubes);
  emitInstanced(winGeo, wins, { basic: true });

  // ---- 5. FOOD TRUCKS on the Monroe roadway (read over the fence) ----------
  // Serving side faces NORTH (-z) toward the park. z 897 sits in the road
  // outside the z894 fence — correct: perpetual-summer street food.
  const truckCols = [0xd94f3d, 0x3d9d6b, 0xe6b83a, 0x4a7fc0];
  const awnMat = bmat(0xffffff, { map: awningTex(), side: THREE.DoubleSide });
  const servMat = toon(0x2b3036);
  for (let i = 0; i < M.FOODTRUCKS_M.xs.length; i++) {
    const x = M.FOODTRUCKS_M.xs[i], z = M.FOODTRUCKS_M.z;
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.4, 2.0), toon(truckCols[i]));
    body.position.set(x, 1.7, z); root.add(body);
    const win = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.0, 0.06), servMat);
    win.position.set(x, 1.9, z - 1.0 - 0.04); root.add(win);           // proud of the north face
    const aw = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.3), awnMat);
    aw.position.set(x, 2.75, z - 1.5); aw.rotation.x = -Math.PI / 2 + 0.55;
    root.add(aw);
    collide(x, z, 2.2);
  }

  // ---- 6. NICHOLS BRIDGEWAY — white ribbon rising off the south edge -------
  // Scenery only (no walkability): a few segment boxes stepping up in y along
  // a->b, leaving the frame over Monroe toward the Art Institute.
  const na = M.NICHOLS_M.a, nb = M.NICHOLS_M.b;      // [x, z, y]
  const nMat = toon(0xeceae4), NSEG = 8;
  const Z1 = new THREE.Vector3(0, 0, 1), dir = new THREE.Vector3();
  for (let i = 0; i < NSEG; i++) {
    const t0 = i / NSEG, t1 = (i + 1) / NSEG;
    const p = (t) => [na[0] + (nb[0] - na[0]) * t, na[2] + (nb[2] - na[2]) * t, na[1] + (nb[1] - na[1]) * t]; // [x,y,z]
    const a = p(t0), b = p(t1);
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const seg = new THREE.Mesh(new THREE.BoxGeometry(M.NICHOLS_M.w, 0.35, Math.hypot(dx, dy, dz)), nMat);
    seg.quaternion.setFromUnitVectors(Z1, dir.set(dx, dy, dz).normalize());
    seg.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    root.add(seg);
  }

  // ---- 7. McDONALD'S CYCLE CENTER — glassy bike depot in the NE pocket -----
  const cy = M.CYCLE_M;
  const glass = new THREE.Mesh(new THREE.BoxGeometry(cy.w, 4, cy.d), toon(0x7fa9b8));
  glass.position.set(cy.x, 2, cy.z); root.add(glass);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(cy.w + 0.6, 0.3, cy.d + 0.6), toon(0x9aa0a4));
  roof.position.set(cy.x, 4.15, cy.z); root.add(roof);
  collide(cy.x, cy.z, 5);
}
