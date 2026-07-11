// =====================================================================
// MILLENNIUM PARK cell — orchestrator + ground layer + minimap base.
// Sub-builders (streets/arrival/streetwall/promenade) each own a file and
// attach everything to millenniumRoot. ALL randomness is LOCAL (per-file
// mulberry32 seeds) — never the shared world rng (determinism hard
// constraint: this cell must not move a single lakefront towel).
//
// See GEOGRAPHY.md · MILLENNIUM_GEOGRAPHY (the coordinate law) and
// src/data/millennium.js (WALK_M is THE shared walkability definition —
// the engine and tools/walkprobe.mjs both import it, no mirror to drift).
// =====================================================================
import * as THREE from 'three';
import { scene, toon, bmat, mulberry32 } from '../core.js';
import { registerCell, mergeCellStatic } from '../cells.js';
import * as M from '../data/millennium.js';
import { buildStreets } from './streets.js';
import { buildArrival } from './arrival.js';
import { buildStreetwall } from './streetwall.js';
import { buildPromenade } from './promenade.js';
import { buildCloudGate } from './cloudgate.js';
import { buildPritzker } from './pritzker.js';
import { buildCrown } from './crown.js';
import { buildLurie } from './lurie.js';
import { buildBridge } from './bridge.js';

const _r = mulberry32(0x4d0000 ^ M.SEED_M);
export const grand = (a = 0, b = 1) => a + (b - a) * _r();
export const millenniumRoot = new THREE.Group();
millenniumRoot.name = 'cell-millennium';

// ---- shared helpers for the sub-builders -----------------------------
// dense flat plane so the world-curve vertex shader bends it smoothly;
// caller positions/rotates it. (segW/segD default to ~1 seg / 5 m.)
export function flatGrid(w, d, y, color, cx = 0, cz = 0) {
  const segW = Math.max(1, Math.round(w / 5)), segD = Math.max(1, Math.round(d / 5));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d, segW, segD), toon(color));
  m.rotation.x = -Math.PI / 2; m.position.set(cx, y, cz);
  return m;
}
// place records as per-COLOR InstancedMesh(es) under the cell root — r128
// toon/basic ignore setColorAt reliably only for cached toon(), so per-color
// buckets are the safe law for cell instancing (PITFALLS). records:
// {pos:[x,y,z], yaw?, scale?[x,y,z], color, rx?}. basic=true → bmat (self-lit).
export function emitInstanced(geo, records, { basic = false } = {}) {
  const groups = new Map();
  for (const it of records) { const k = it.color ?? 0xffffff; let g = groups.get(k); if (!g) groups.set(k, g = []); g.push(it); }
  const Mx = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
  for (const [c, group] of groups) {
    const mesh = new THREE.InstancedMesh(geo, basic ? bmat(c) : toon(c), group.length);
    group.forEach((it, i) => {
      E.set(it.rx || 0, it.yaw || 0, 0, 'YXZ'); Q.setFromEuler(E);
      V.set(it.pos[0], it.pos[1], it.pos[2]);
      S.set(it.scale ? it.scale[0] : 1, it.scale ? it.scale[1] : 1, it.scale ? it.scale[2] : 1);
      Mx.compose(V, Q, S); mesh.setMatrixAt(i, Mx);
    });
    mesh.instanceMatrix.needsUpdate = true;
    millenniumRoot.add(mesh);
  }
}

// ---------------------------- ground ----------------------------------
// Honest ground for every WALK_M surface + the view-only surfaces (cafe,
// planting plates, roads-are-in-streets.js). NO landmark geometry — the
// bean/pavilion/fountain/lurie/bridge pads read as dressed ground; their
// hero objects arrive in tasks 043-046.
const COL = {
  base:   0x6f6a5f,   // neutral urban fill under everything (no voids)
  lawn:   0x5f8a48,   // park green
  lawnDk: 0x527a3d,   // shaded lawn (bosque understory, planting borders)
  pave:   0xb0a996,   // concrete sidewalk / bowl paving
  plaza:  0xc7c0ad,   // limestone plaza pavers (Wrigley Sq, Bean, promenade)
  gran:   0x34383f,   // Crown wet black-granite plaza
  pool:   0x232830,   // Crown pool (wet mirror, darker)
  wood:   0x8a6b46,   // BP deck + Seam boardwalk planks
  cafe:   0x8f8576,   // McCormick sunken terrace paving
  soil:   0x4b4034,   // Lurie planting plates
  wall:   0x777063,   // sunken-terrace retaining wall
};

function addQuad(x0, x1, z0, z1, y, color) {
  millenniumRoot.add(flatGrid(x1 - x0, z1 - z0, y, color, (x0 + x1) / 2, (z0 + z1) / 2));
}
// Two ground surfaces are SUNKEN pits (the subway stair, y −3.2; the McCormick
// cafe terrace, y −1.6): the grade carpet (fill/lawn) must be cut AROUND them or
// it occludes the pit from above. paveRegion tiles a rect into quads that skip
// any hole (a z-band scanline split — handles several disjoint holes cleanly).
const KHOLE  = { x0: 47, x1: 53, z0: 794.5, z1: 806.5 };   // subway stair pit
const CHOLE  = { x0: 57, x1: 76, z0: 772,   z1: 826 };     // McCormick sunken cafe
const HOLES  = [KHOLE, CHOLE];
function paveRegion(x0, x1, z0, z1, y, color, holes) {
  const zc = new Set([z0, z1]);
  for (const h of holes) { if (h.z0 > z0 && h.z0 < z1) zc.add(h.z0); if (h.z1 > z0 && h.z1 < z1) zc.add(h.z1); }
  const zs = [...zc].sort((a, b) => a - b);
  for (let i = 0; i < zs.length - 1; i++) {
    const za = zs[i], zb = zs[i + 1], zm = (za + zb) / 2;
    const xc = new Set([x0, x1]);
    for (const h of holes) if (h.z0 < zm && h.z1 > zm) { if (h.x0 > x0 && h.x0 < x1) xc.add(h.x0); if (h.x1 > x0 && h.x1 < x1) xc.add(h.x1); }
    const xs = [...xc].sort((a, b) => a - b);
    for (let j = 0; j < xs.length - 1; j++) {
      const xa = xs[j], xb = xs[j + 1], xm = (xa + xb) / 2;
      if (holes.some(h => xm >= h.x0 && xm <= h.x1 && zm >= h.z0 && zm <= h.z1)) continue;
      addQuad(xa, xb, za, zb, y, color);
    }
  }
}
// rotated / sloped deck quad along a centre-line a->b (halfW lateral), y
// lerps a->b; built as a flat strip then tilted so both ends hit y0/y1.
function segStrip(a, b, halfW, y0, y1, color) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  const yaw = Math.atan2(dx, dz), pitch = Math.atan2(y1 - y0, len);
  const g = new THREE.PlaneGeometry(halfW * 2, len, 2, Math.max(1, Math.round(len / 4)));
  const m = new THREE.Mesh(g, toon(color));
  m.rotation.set(-Math.PI / 2 + pitch, yaw, 0, 'YXZ');
  m.position.set((a[0] + b[0]) / 2, (y0 + y1) / 2, (a[1] + b[1]) / 2);
  millenniumRoot.add(m);
}

function buildGround() {
  const S = M.STREETS_M;
  // 0. base fill over the whole cell footprint (kills any seam void) — carved
  //    around the subway pit + the sunken cafe so both read as real openings.
  paveRegion(6, 238, 680, 938, -0.06, COL.base, HOLES);
  // 1. park lawn carpet (interior inside the frame sidewalks)
  paveRegion(48, 189, 705, 894, -0.02, COL.lawn, HOLES);

  // 2. Michigan spine + frame sidewalks (concrete) — only the stair pit overlaps
  paveRegion(48, 57, 705, 894, 0.0, COL.pave, [KHOLE]);   // Michigan spine
  addQuad(48, 189, 705, 713, 0.0, COL.pave);  // Randolph S sidewalk
  addQuad(48, 189, 886, 894, 0.0, COL.pave);  // Monroe N sidewalk
  addQuad(181, 189, 713, 788, 0.0, COL.pave); // Columbus rim N
  addQuad(181, 189, 818, 886, 0.0, COL.pave); // Columbus rim S

  // 3. Wrigley Square plaza (limestone) + its lawn inset
  const WQ = M.WRIGLEY_SQ_M;
  addQuad(WQ.plaza.x0, WQ.plaza.x1, WQ.plaza.z0, WQ.plaza.z1, 0.0, COL.plaza);
  addQuad(WQ.lawn.x0, WQ.lawn.x1, WQ.lawn.z0, WQ.lawn.z1, 0.008, COL.lawn);

  // 4. Chase Promenade allee (paved)
  addQuad(M.CHASE_M.walk.x0, M.CHASE_M.walk.x1, M.CHASE_M.walk.z0, M.CHASE_M.walk.z1, 0.0, COL.plaza);

  // 5. Washington + Madison cross walks (paved break-lines) + Bean plaza
  addQuad(57, 96, 758, 770, 0.0, COL.pave);   // Washington axis 766
  addQuad(57, 96, 826, 838, 0.0, COL.pave);   // Madison axis 831
  addQuad(M.CLOUD_GATE_M.plaza.x0, M.CLOUD_GATE_M.plaza.x1, M.CLOUD_GATE_M.plaza.z0, M.CLOUD_GATE_M.plaza.z1, 0.0, COL.plaza);

  // 6. Crown Fountain wet plaza + pool (granite/mirror; towers = 045)
  const CR = M.CROWN_M;
  addQuad(CR.plaza.x0, CR.plaza.x1, CR.plaza.z0, CR.plaza.z1, 0.0, COL.gran);
  addQuad(CR.pool.x0, CR.pool.x1, CR.pool.z0, CR.pool.z1, 0.01, COL.pool);
  addQuad(CR.bosques[0].x0, CR.bosques[0].x1, CR.bosques[0].z0, CR.bosques[0].z1, 0.004, COL.lawnDk);
  addQuad(CR.bosques[1].x0, CR.bosques[1].x1, CR.bosques[1].z0, CR.bosques[1].z1, 0.004, COL.lawnDk);

  // 7. Pritzker seating bowl (paved; red seat field = 044) + Great Lawn (green)
  addQuad(118, 186, 758, 788, 0.0, COL.pave);   // bowl
  addQuad(118, 186, 788, 846, -0.01, COL.lawn); // Great Lawn (under the trellis, 046)

  // 8. Lurie — soil plates + Seam boardwalk + rim/gate paving (hedges = 046)
  const LU = M.LURIE_M;
  addQuad(126, 178, 852, 892, -0.01, COL.lawnDk);                 // garden floor
  addQuad(LU.plates.light[0] - 7, LU.plates.light[0] + 7, LU.plates.light[1] - 6, LU.plates.light[1] + 6, 0.004, COL.soil);
  addQuad(LU.plates.dark[0] - 7, LU.plates.dark[0] + 7, LU.plates.dark[1] - 6, LU.plates.dark[1] + 6, 0.004, COL.soil);
  addQuad(LU.gateNE.x0, LU.gateNE.x1, LU.gateNE.z0, LU.gateNE.z1, 0.0, COL.pave);
  addQuad(LU.southRim.x0, LU.southRim.x1, LU.southRim.z0, LU.southRim.z1, 0.0, COL.pave);
  addQuad(LU.linkSW.x0, LU.linkSW.x1, LU.linkSW.z0, LU.linkSW.z1, 0.0, COL.pave);
  segStrip(LU.seam.a, LU.seam.b, LU.seam.halfW, 0.02, 0.02, COL.wood);   // the boardwalk

  // 9. McCormick sunken cafe terrace (view-only, y -1.6) + retaining walls
  const MC = M.MCCORMICK_M;
  addQuad(MC.x0, MC.x1, MC.z0, MC.z1, MC.y, COL.cafe);
  for (const w of [                                                 // four retaining walls grade->sunken
    [MC.x0, MC.x0 + 0.4, MC.z0, MC.z1], [MC.x1 - 0.4, MC.x1, MC.z0, MC.z1],
    [MC.x0, MC.x1, MC.z0, MC.z0 + 0.4], [MC.x0, MC.x1, MC.z1 - 0.4, MC.z1],
  ]) {
    const g = new THREE.BoxGeometry(w[1] - w[0], -MC.y, w[3] - w[2]);
    const m = new THREE.Mesh(g, toon(COL.wall));
    m.position.set((w[0] + w[1]) / 2, MC.y / 2, (w[2] + w[3]) / 2);
    millenniumRoot.add(m);
  }

  // 10. BP bridge deck as honest raised WOOD ground (parapets/shingles = 046)
  const B = M.BP_BRIDGE_M;
  { const a = B.approach;                                           // ramp lawn-edge, y0->y1 along x
    const g = new THREE.PlaneGeometry(a.x1 - a.x0, a.z1 - a.z0, 6, 2);
    const m = new THREE.Mesh(g, toon(COL.wood));
    m.rotation.set(-Math.PI / 2, 0, 0);
    m.rotation.z = -Math.atan2(a.y1 - a.y0, a.x1 - a.x0);           // tilt up toward +x
    m.position.set((a.x0 + a.x1) / 2, (a.y0 + a.y1) / 2, (a.z0 + a.z1) / 2);
    millenniumRoot.add(m); }
  segStrip(B.segs[0].a, B.segs[0].b, B.segs[0].halfW, B.segs[0].y0, B.segs[0].y1, COL.wood);
  segStrip(B.segs[1].a, B.segs[1].b, B.segs[1].halfW, B.segs[1].y0, B.segs[1].y1, COL.wood);
  for (let i = 0; i < B.scenery.length - 1; i++)                    // scenery run beyond the clamp (dead-ends politely)
    segStrip(B.scenery[i], B.scenery[i + 1], B.deckW / 2, 5 - i * 0.35, 5 - (i + 1) * 0.35, COL.wood);

  // 11. McCormick overlook BALUSTRADE (the shell read per BRIEF) — white
  // posts + rail along the Bean-plaza edge at railX; back to the cafe void.
  { const rx = MC.railX, posts = [];
    for (let z = MC.z0 + 1; z <= MC.z1 - 1; z += 2.2) posts.push({ pos: [rx, 0.55, z], scale: [0.18, 1.1, 0.18], color: 0xe9e4d8 });
    emitInstanced(new THREE.BoxGeometry(1, 1, 1), posts);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, MC.z1 - MC.z0 - 1), toon(0xe9e4d8));
    rail.position.set(rx, 1.06, (MC.z0 + MC.z1) / 2); millenniumRoot.add(rail);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, MC.z1 - MC.z0 - 1), toon(0xf2eee4));
    cap.position.set(rx, 1.16, (MC.z0 + MC.z1) / 2); millenniumRoot.add(cap); }

  // 12. Wrigley Square inscribed WALL (the park's signature signage form) —
  // a low curved limestone wall reading WRIGLEY SQUARE at the lawn corner.
  { const w = WQ.wall, tex = wrigleyWallTex(w.text);
    const body = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.2, 0.7), toon(0xd8cfb8));
    body.position.set(w.x, 0.6, w.z); millenniumRoot.add(body);
    for (const s of [1, -1]) {                                      // back-to-back FrontSide faces (no mirror artifact)
      const face = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.0), bmat(0xffffff, { map: tex }));
      face.position.set(w.x, 0.62, w.z + s * 0.37); face.rotation.y = s === 1 ? 0 : Math.PI;
      millenniumRoot.add(face);
    } }
}

function wrigleyWallTex(text) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 72; const g = cv.getContext('2d');
  g.fillStyle = '#d8cfb8'; g.fillRect(0, 0, 512, 72);
  g.fillStyle = '#4a4335'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '600 34px Georgia,serif'; g.fillText(text, 256, 40);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}

// ------------------------- minimap base -------------------------------
function buildMinimapBase() {
  const A = M.MAP_M;
  const cv = document.createElement('canvas'); cv.width = A.cw; cv.height = A.ch;
  const g = cv.getContext('2d');
  const wm = (x, z) => [(x - A.x0) / A.w * A.cw, (z - A.z0) / A.h * A.ch];
  const rect = (x0, x1, z0, z1, c) => { g.fillStyle = c; const [ax, ay] = wm(x0, z0), [bx, by] = wm(x1, z1); g.fillRect(ax, ay, bx - ax, by - ay); };
  g.fillStyle = '#3f4a38'; g.fillRect(0, 0, A.cw, A.ch);                     // park green ground
  rect(48, 189, 705, 894, '#4f6a3e');                                        // park interior
  // scenery roads (grey)
  g.fillStyle = '#5a5750';
  rect(32, 48, 684, 935, '#5a5750'); rect(32, 216, 692, 704, '#5a5750');
  rect(32, 216, 894, 908, '#5a5750'); rect(190, 200, 692, 908, '#5a5750');
  // the cliff band (west) + giants (north)
  rect(6, 30, 684, 935, '#6d6a63'); rect(44, 214, 680, 692, '#6d6a63');
  // spine + promenade + rim walks (paving)
  g.fillStyle = '#9a9384';
  rect(48, 57, 705, 894, '#9a9384'); rect(96, 120, 713, 886, '#9a9384');
  rect(48, 189, 705, 713, '#9a9384'); rect(48, 189, 886, 894, '#9a9384');
  // signature pads
  rect(M.CLOUD_GATE_M.plaza.x0, M.CLOUD_GATE_M.plaza.x1, M.CLOUD_GATE_M.plaza.z0, M.CLOUD_GATE_M.plaza.z1, '#b7b0a0'); // Bean plaza
  rect(M.CROWN_M.pool.x0, M.CROWN_M.pool.x1, M.CROWN_M.pool.z0, M.CROWN_M.pool.z1, '#2b3038');                        // Crown pool
  rect(118, 186, 788, 846, '#5b7a44');                                       // Great Lawn
  // landmark dots
  const dot = (x, z, c, r = 4) => { const [mx, my] = wm(x, z); g.fillStyle = c; g.beginPath(); g.arc(mx, my, r, 0, 7); g.fill(); };
  dot(M.CLOUD_GATE_M.bean.cx, M.CLOUD_GATE_M.bean.cz, '#d8dde4', 5);         // the Bean
  dot(69.8, 864, '#e8b64c', 4);                                             // Crown
  dot(146.5, 752, '#d8d2c4', 4);                                           // Pritzker
  dot(67, 724, '#e6ddc8', 4);                                             // Wrigley Sq
  dot((M.KIOSK_M.x0 + M.KIOSK_M.x1) / 2, M.KIOSK_M.pylonZ, '#c62828', 4);   // subway kiosk
  return cv;
}

let built = false;
export function buildMillennium() {
  if (built) return; built = true;
  buildGround();
  buildStreets();      // scenery roads, curbs, planters, park fence, lamps, pennants, cars
  buildArrival();      // CTA subway stair kiosk + RED LINE pylon + station grate
  buildStreetwall();   // Michigan Ave cliff + Randolph giants + east/south backdrops
  buildPromenade();    // Chase allee trees + plinths + Exelon cubes + scenery
  buildCloudGate();    // THE BEAN — Cloud Gate homage on AT&T Plaza (task 043)
  buildPritzker();     // PRITZKER PAVILION — ribbon crown + red bowl + trellis + lawn life (task 044)
  buildCrown();        // CROWN FOUNTAIN — glass-block face-towers + wet pool + painted reflections (task 045; live faces/spout in packs/crown-fountain.js)
  buildLurie();        // LURIE GARDEN — shoulder hedge + steel armature + salvia/prairie planting + Seam boardwalk detail (task 046)
  buildBridge();       // BP BRIDGE — brushed-shingle parapets + wood deck + closed east gate + Maggie Daley treetops (task 046)
  mergeCellStatic(millenniumRoot, 1e6);   // collapse static builder meshes; ONE z-band (compact, always fog-fully-inside, invisible from elsewhere)
  scene.add(millenniumRoot);
  registerCell({
    id: M.CELL_ID, root: millenniumRoot,
    walkable: M.walkableM, surfaceY: M.surfaceYM,
    clamp: M.CLAMP_M, spawn: M.SPAWN_M,
    minimapBase: buildMinimapBase(), minimapBounds: M.MAP_M,
  });
}
