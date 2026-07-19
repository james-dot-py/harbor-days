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
import { buildRink } from './rink.js';
import { buildWrigleyMonument } from './wrigleymonument.js';
import { buildMaggie } from './maggie.js';
import { buildPlayGarden } from './playgarden.js';
import { buildArtInstitute } from './artinstitute.js';
import { buildLions } from './lions.js';
import { buildNichols } from './nichols.js';
import { buildButler } from './butler.js';

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

// Shared INSTANCED POOL (P2, task 058 perf plan — refs/millennium-park/BRIEF.md).
// Sub-builders ENQUEUE instance records keyed by a stable (geoKey × basic)
// bucket; index emits ONE emitInstanced per key AFTER every builder runs, so
// the SAME geometry+color repeated across zones/builders (trees, lamps,
// X-masts, holds, flags, crowd bodies…) folds into ONE InstancedMesh instead
// of one-per-builder. Reuse cached toon() color hexes on the records so
// cross-zone repeats share a color sub-bucket (emitInstanced splits by color).
// geoKey MUST map 1:1 to a distinct geometry — the FIRST geo registered under
// a key is the one used. Flushed in buildMillennium(), before the static merge.
const _pool = new Map();   // key -> { geo, basic, records }
export function poolInstanced(geoKey, geo, records, { basic = false } = {}) {
  const key = geoKey + (basic ? '|b' : '');
  let e = _pool.get(key);
  if (!e) _pool.set(key, e = { geo, basic, records: [] });
  for (const r of records) e.records.push(r);
}
function flushPool() {
  for (const e of _pool.values()) if (e.records.length) emitInstanced(e.geo, e.records, { basic: e.basic });
  _pool.clear();
}

// ---------------------------- ground ----------------------------------
// Honest ground for every WALK_M surface + the view-only surfaces (cafe,
// planting plates, roads-are-in-streets.js). NO landmark geometry — the
// bean/pavilion/fountain/lurie/bridge pads read as dressed ground; their
// hero objects arrive in tasks 043-046.
export const COL = {
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
const CHOLE  = { x0: M.RINK_M.x0, x1: M.RINK_M.x1, z0: M.RINK_M.z0, z1: M.RINK_M.z1 };   // McCormick sunken rink pit (derives — 093 resize)
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
// Exported so bridge.js/maggie.js sweep matching ground strips (deck, ramps).
export function segStrip(a, b, halfW, y0, y1, color) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  const yaw = Math.atan2(dx, dz), pitch = Math.atan2(y1 - y0, len);
  const g = new THREE.PlaneGeometry(halfW * 2, len, 2, Math.max(1, Math.round(len / 4)));
  const m = new THREE.Mesh(g, toon(color));
  m.rotation.set(-Math.PI / 2 + pitch, yaw, 0, 'YXZ');
  m.position.set((a[0] + b[0]) / 2, (y0 + y1) / 2, (a[1] + b[1]) / 2);
  millenniumRoot.add(m);
}

function buildGround() {
  const S = M.STREETS_M, G = M.OPEN_GRANT;
  // The Columbus TRENCH (058): a sunken road cut under the BP overflight reads
  // as a road passing beneath. The grade carpet must be cut around it (041 pit
  // law) or it occludes the cut from the crest above (bridge.js builds the
  // sunken roadbed + retaining walls; streets.js splits the Columbus plane).
  const TR = M.BP_CROSSING_M.trench;
  // The AI RAIL TRENCH (060): the open Metra cut (floor y −3) must be carved
  // out of the grade carpet (041 pit law) or the fill occludes it from above
  // (artinstitute.js builds the sunken roadbed, walls, catenary + parked EMU).
  const baseHoles = [...HOLES,
    ...(G.maggie ? [TR] : []),
    ...(G.artInstitute ? [M.ART_M.trench] : [])];
  // 0. base fill over the whole cell footprint (kills any seam void) — carved
  //    around the subway pit + the sunken cafe (+ the Columbus trench when
  //    Maggie is live, + the AI rail trench when the Art Institute is live) so
  //    each reads as a real opening. Grown east to the LSD frame (x 346) when
  //    the Grant expansion is open, south to the South Loop band (z 1080) when
  //    the Art Institute block is open.
  paveRegion(6, G.maggie ? 346 : 238, 680, G.artInstitute ? 1080 : 938, -0.06, COL.base, baseHoles);
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

  // 9. McCormick sunken pit: floor, walls, ice, boards, stairs and all
  // dressing are rink.js (task 049 — the cafe became THE ICE RINK).
  const MC = M.RINK_M;

  // 10. BP bridge deck as honest raised WOOD ground (parapets/shingles = 046).
  // ONLY the pre-057 simplified deck: when Maggie is live (058) bridge.js
  // rebuilds the whole deck GROUND on the real serpentine (BP_CROSSING_M),
  // so skip this here to avoid two overlapping decks.
  if (!G.maggie) {
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
  }

  // 11. McCormick overlook BALUSTRADE (the shell read per BRIEF) — white
  // posts + rail along the Bean-plaza edge at railX; the rink reads below
  // it exactly like the owner skating photo (balustrade over PARK GRILL).
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
  rect(M.RINK_M.ice.x0, M.RINK_M.ice.x1, M.RINK_M.ice.z0, M.RINK_M.ice.z1, '#e6eef4');                                 // McCormick ice sheet
  rect(M.CROWN_M.pool.x0, M.CROWN_M.pool.x1, M.CROWN_M.pool.z0, M.CROWN_M.pool.z1, '#2b3038');                        // Crown pool
  rect(118, 186, 788, 846, '#5b7a44');                                       // Great Lawn
  // landmark dots
  const dot = (x, z, c, r = 4) => { const [mx, my] = wm(x, z); g.fillStyle = c; g.beginPath(); g.arc(mx, my, r, 0, 7); g.fill(); };
  dot(M.CLOUD_GATE_M.bean.cx, M.CLOUD_GATE_M.bean.cz, '#d8dde4', 5);         // the Bean
  dot(69.8, 864, '#e8b64c', 4);                                             // Crown
  dot(146.5, 752, '#d8d2c4', 4);                                           // Pritzker
  dot(68, 724.5, '#e6ddc8', 4);                                           // Wrigley Sq monument
  dot((M.KIOSK_M.x0 + M.KIOSK_M.x1) / 2, M.KIOSK_M.pylonZ, '#c62828', 4);   // subway kiosk

  // ---- Maggie Daley expansion (058, flag maggie) ----
  if (M.OPEN_GRANT.maggie) {
    const MG = M.MAGGIE_M;
    rect(198, 338, 700, 892, '#4f6a3e');                     // Maggie park green
    g.fillStyle = '#9a9384';
    rect(201, 209, 706, 888, '#9a9384');                    // E-rim promenade
    rect(201, 338, 705, 712, '#9a9384');                    // Randolph-side north walk
    rect(201, 338, 878, 888, '#9a9384');                    // Monroe-side south rim
    rect(209, 323, 728, 736, '#9a9384');                    // fieldhouse esplanade
    rect(MG.fieldhouse.x0, MG.fieldhouse.x1, MG.fieldhouse.z0, MG.fieldhouse.z1, '#8a857a'); // fieldhouse
    rect(MG.csg.bounds.x0, MG.csg.bounds.x1, MG.csg.bounds.z0, MG.csg.bounds.z1, '#5b7a44'); // Cancer Survivors' Garden
    rect(MG.play.zone.x0, MG.play.zone.x1, MG.play.zone.z0, MG.play.zone.z1, '#6f6a55');      // play garden rubber
    rect(MG.landing.x0, MG.landing.x1, MG.landing.z0, MG.landing.z1, '#b7b0a0');              // bridge-landing plaza
    // the skating ribbon loop (pale ice-white) + climbing island inside it
    g.strokeStyle = '#e6eef4'; g.lineWidth = 3; g.beginPath();
    M.RIBBON_M.loop.forEach((p, i) => { const [mx, my] = wm(p[0], p[1]); i ? g.lineTo(mx, my) : g.moveTo(mx, my); });
    g.closePath(); g.stroke();
    { const [ax, ay] = wm(242, 744), [bx, by] = wm(268, 764); g.fillStyle = '#8b9098'; g.fillRect(ax, ay, bx - ax, by - ay); }
    // the BP crossing serpentine (wood)
    g.strokeStyle = '#8a6b46'; g.lineWidth = 2.5; g.beginPath();
    M.BP_CROSSING_M.nodes.forEach((n, i) => { const [mx, my] = wm(n[0], n[1]); i ? g.lineTo(mx, my) : g.moveTo(mx, my); });
    g.stroke();
    dot(MG.play.lighthouse.x, MG.play.lighthouse.z, '#e23b2e', 3);   // lighthouse
    dot(272, 845, '#3a72c4', 3);                            // play ship
    dot(250, 752, '#8b9098', 3);                            // climbing walls
  }

  // ---- Art Institute block (060, flag artInstitute) ----
  if (M.OPEN_GRANT.artInstitute) {
    const AI = M.ART_M;
    // scenery roads south: Michigan extension + Jackson band
    rect(32, 48, 935, 1044, '#5a5750'); rect(32, 346, 1032, 1044, '#5a5750');
    // closed Monroe (festival street, walkable curb to curb)
    rect(48, 190, 894, 908, '#9a9384');
    // spine extension + east rim + forecourt paving
    g.fillStyle = '#9a9384';
    rect(48, 57, 908, 1032, '#9a9384'); rect(181, 189, 908, 1032, '#9a9384');
    rect(48, 57.2, 958, 984, '#b7b0a0');                    // forecourt + grand steps
    // gardens
    rect(AI.northGarden.x0, AI.northGarden.x1, AI.northGarden.z0, AI.northGarden.z1, '#5b7a44');
    rect(AI.southGarden.x0, AI.southGarden.x1, AI.southGarden.z0, AI.southGarden.z1, '#5b7a44');
    // the open rail trench (dark cut), then the masses that bridge it
    rect(AI.trench.x0, AI.trench.x1, AI.trench.z0, AI.trench.z1, '#2c2e33');
    // museum masses (warm stone) + Modern Wing (pale) + east pool strip
    rect(AI.westBlock.x0, AI.westBlock.x1, AI.westBlock.z0, AI.westBlock.z1, '#a89a82');
    rect(AI.waist.x0, AI.waist.x1, AI.waist.z0, AI.waist.z1, '#a89a82');
    for (const e of AI.eastCampus) rect(e.x0, e.x1, e.z0, e.z1, '#a89a82');
    rect(AI.modernWing.x0, AI.modernWing.x1, AI.modernWing.z0, AI.modernWing.z1, '#cfcabb');
    rect(AI.pool.x0, AI.pool.x1, AI.pool.z0, AI.pool.z1, '#3d5a6e');
    // south loop backdrop band
    rect(48, 330, 1050, 1080, '#6d6a63');
    // Nichols Bridgeway (white ribbon over Monroe)
    if (M.OPEN_GRANT.nichols) {
      g.strokeStyle = '#e8e6de'; g.lineWidth = 2.5; g.beginPath();
      M.NICHOLS2_M.nodes.forEach((n, i) => { const [mx, my] = wm(n[0], n[1]); i ? g.lineTo(mx, my) : g.moveTo(mx, my); });
      g.stroke();
    }
    // THE LIONS — verdigris dots at the steps
    for (const l of AI.lions) dot(l.x, l.z, '#4da28c', 3);
  }

  // ---- Butler Field + LOLLA (061, flag butler) ----
  if (M.OPEN_GRANT.butler) {
    const BU = M.BUTLER_M;
    rect(BU.field.x0, BU.field.x1, 908, BU.field.z1, '#4f6a3e');      // festival field green
    // closed festival streets = WALKABLE pave color (distinct from scenery road)
    g.fillStyle = '#9a9384';
    rect(200, 336, 894, 908, '#9a9384');                             // closed Monroe east
    rect(190, 200, 894, 1042, '#9a9384');                            // closed Columbus
    rect(BU.lsdRim.x0, BU.lsdRim.x1, BU.lsdRim.z0, BU.lsdRim.z1, '#9a9384');   // LSD rim walk
    rect(332, 346, 908, 1044, '#5a5750');                            // LSD scenery road
    rect(BU.tents.x0, BU.tents.x1, BU.tents.z0, BU.tents.z1, '#b7b0a0');       // tent rows
    rect(BU.petrillo.x0, BU.petrillo.x1, BU.petrillo.z0, BU.petrillo.z1, '#8a857a');   // Petrillo mass
    rect(348, 362, 894, 1040, '#3d5a6e');                            // Monroe Harbor lake glint
    dot((BU.petrillo.x0 + BU.petrillo.x1) / 2, (BU.petrillo.z0 + BU.petrillo.z1) / 2, '#c62828', 4);   // stage dot
    dot((BU.booth.x0 + BU.booth.x1) / 2, (BU.booth.z0 + BU.booth.z1) / 2, '#d8d2c4', 2);               // sound booth
  }
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
  buildRink();         // McCORMICK ICE RINK — sunken sheet, boards, stairs, Park Grill band (task 049; glide/NPCs in packs/skating.js)
  buildWrigleyMonument(); // MILLENNIUM MONUMENT — purple-lit peristyle + fountain + urns + lamps (task 050, owner night photo)
  if (M.OPEN_GRANT.maggie) {
    buildMaggie();     // MAGGIE DALEY — ribbon bed, climbing walls, fieldhouse, tennis, CSG, landforms, X-masts, backdrop east (task 058)
    buildPlayGarden(); // THE PLAY GARDEN — lighthouse+tube slide, ship, fort+rope bridge, enchanted forest, slide crater, swings, splash (task 058)
  }
  if (M.OPEN_GRANT.artInstitute) {
    buildArtInstitute(); // THE ART INSTITUTE — beaux-arts west block, grand steps, banners, gardens, rail trench, Modern Wing, arch (task 060)
    buildLions();        // THE LIONS — the two bronze guardians flanking the steps (task 060, the hero meshes)
    buildNichols();      // NICHOLS BRIDGEWAY — white boat-hull span, lawn → Bluhm terrace (task 060, flag nichols = walkable)
  }
  if (M.OPEN_GRANT.butler) buildButler();   // BUTLER FIELD + LOLLA — Petrillo shell in festival dress, crowd rail, tents, potties, trucks, arches, lineup poster, lake band (task 061; live crowd/music in packs/lolla.js)
  flushPool();         // emit the shared instanced pool (P2) — cross-zone repeats fold to one bucket each
  // Grown Grant-expansion cell (~300×340 m): merge into ≤240×240 m TILES per
  // material so far tiles fog-cull (P1). Pre-expansion the cell was compact and
  // used one bucket per material (1e6); the tiling keeps every in-cell view's
  // in-frustum tile count small. mergeCellStatic bakes world transforms → zero
  // visual change.
  mergeCellStatic(millenniumRoot, M.OPEN_GRANT.maggie ? 240 : 1e6, M.OPEN_GRANT.maggie ? 240 : Infinity);
  scene.add(millenniumRoot);
  registerCell({
    id: M.CELL_ID, root: millenniumRoot,
    walkable: M.walkableM, surfaceY: M.surfaceYM, kindAt: M.kindAtM,
    clamp: M.CLAMP_M, spawn: M.SPAWN_M,
    minimapBase: buildMinimapBase(), minimapBounds: M.MAP_M,
  });
}
