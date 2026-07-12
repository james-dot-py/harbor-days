// =====================================================================
// WRIGLEY BOWL — the stadium INTERIOR builder (task 055). A pocket cell
// (the redline-car pattern): own root, own clamp/walk/spawn/minimap from
// src/data/wrigley-bowl.js (THE shared definition — never forked). The
// register is QUIET CATHEDRAL: an empty open-house Wrigley — no game-day
// crowd, just the ivy, the hand-turned scoreboard, the rooftops over the
// wall and the mow lines. All geometry hand-modeled in the house toon
// style; every mesh uses toon()/bmat() (world-curve contract).
// Determinism: ONE local mulberry32 — never the shared world rng.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { scene, toon, bmat, mulberry32, pointsMat } from '../core.js';
import { registerCell, mergeCellStatic } from '../cells.js';
import {
  CELL_ID_B, POLY_B, HP_B, AXIS_B, BACK_B, SCOREBOARD_B, rWallB, polyRadiusB,
  TRACK_W_B, WALL_T_B, CONC_W_B, S_CONC_B, ROWS_B, GATES_B, WEDGES_B, VOM_S_B,
  walkableB, surfaceYB, kindAtB, CLAMP_B, SPAWN_B, MAP_B,
} from '../data/wrigley-bowl.js';
import { STADIUM_W } from '../data/wrigleyville.js';

const R = mulberry32(19160420);            // first Cubs game at Weeghman Park
const wrap = a => ((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
const dirX = a => Math.sin(a), dirZ = a => Math.cos(a);
const at = (r, th) => [HP_B[0] + dirX(th) * r, HP_B[1] + dirZ(th) * r];
const mergeGeos = arr => BufferGeometryUtils.mergeBufferGeometries(arr.map(g => g.index ? g.toNonIndexed() : g), false);

// palette — the stadium.js hues so inside and outside read as one building
const PALE = 0xd9d2c4, BRICK = 0x8a4a3a, GREEN = 0x1e4d38, DARKROOF = 0x3c4038;
const CREAM = 0xbfb7a6, CONCRETE = 0x8f8a82, SEATG = 0x2f5544, DIRT = 0xa8794a;

let bowlRoot = null;
const add = m => { bowlRoot.add(m); return m; };
function inst(geo, mat, items) {
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
  items.forEach((it, i) => {
    E.set(it.rx || 0, it.yaw || 0, 0); Q.setFromEuler(E);
    V.set(it.pos[0], it.pos[1], it.pos[2]);
    S.set(it.scale ? it.scale[0] : 1, it.scale ? it.scale[1] : 1, it.scale ? it.scale[2] : 1);
    M.compose(V, Q, S); m.setMatrixAt(i, M);
  });
  m.instanceMatrix.needsUpdate = true;
  return add(m);
}

// ---------------------------- canvases ---------------------------------
// field: 1024 px = 176 m about HP — mow arcs, diamond, mound, foul lines.
// Finer than the exterior's (you STAND on this one).
function fieldTexB() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 1024;
  const g = cv.getContext('2d');
  const M = 1024 / 176, cx = 512, cz = 512;                      // m → px, HP at centre
  g.fillStyle = '#3f7d46'; g.fillRect(0, 0, 1024, 1024);
  g.strokeStyle = 'rgba(255,255,255,0.075)'; g.lineWidth = 4.2 * M;   // mow arcs (up = CF)
  for (let r = 14; r < 78; r += 8) { g.beginPath(); g.arc(cx, cz, r * M, -Math.PI * 0.92, -Math.PI * 0.08); g.stroke(); }
  g.fillStyle = '#b98a52';                                      // infield dirt (diamond up)
  g.save(); g.translate(cx, cz); g.rotate(Math.PI / 4);
  g.fillRect(-2 * M, -29 * M, 31 * M, 31 * M); g.restore();
  g.fillStyle = '#3f7d46'; g.save(); g.translate(cx, cz); g.rotate(Math.PI / 4);
  g.fillRect(2.5 * M, -24.5 * M, 22 * M, 22 * M); g.restore();  // infield grass
  g.fillStyle = '#b98a52'; g.beginPath(); g.arc(cx, cz - 12.9 * M, 2.8 * M, 0, 7); g.fill(); // mound
  g.fillStyle = '#c9985e'; g.beginPath(); g.arc(cx, cz, 4 * M, 0, 7); g.fill();              // plate circle
  g.strokeStyle = '#f2ece0'; g.lineWidth = 1.1 * M;             // foul lines to the poles
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(cx, cz);
    g.lineTo(cx + s * 80 * M * Math.sin(0.72), cz - 80 * M * Math.cos(0.72)); g.stroke();
  }
  g.fillStyle = '#f2ece0';                                       // the three bags + plate
  g.save(); g.translate(cx, cz); g.rotate(Math.PI / 4);
  g.fillRect(-1 * M, -20.4 * M, 2 * M, 2 * M);                   // 2B
  g.fillRect(-1 * M - 13.7 * M, -6.7 * M - 1 * M, 2 * M, 2 * M); // hmm: keep simple corner bags
  g.fillRect(13.7 * M - 1 * M, -6.7 * M - 1 * M, 2 * M, 2 * M);
  g.restore();
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
// ivy: leaf clusters, densest low — the stadium.js recipe with its OWN rng
function ivyTexB() {
  const cv = document.createElement('canvas'); cv.width = 192; cv.height = 160;
  const g = cv.getContext('2d');
  const IR = mulberry32(19370701);                               // ivy planted 1937
  g.fillStyle = '#5a382f'; g.fillRect(0, 0, 192, 160);
  const gs = ['#204a26', '#2f6b35', '#1c5127', '#489048', '#376f3b', '#5aa356'];
  for (let i = 0; i < 260; i++) {
    const cx = IR() * 192, cy = 10 + Math.pow(IR(), 0.5) * 150;
    const n = 4 + IR() * 3 | 0;
    for (let k = 0; k < n; k++) {
      g.fillStyle = gs[IR() * gs.length | 0];
      g.beginPath(); g.arc(cx + (IR() - 0.5) * 16, cy + (IR() - 0.5) * 12, 4 + IR() * 7, 0, 7); g.fill();
    }
  }
  return new THREE.CanvasTexture(cv);
}
function scoreboardTexB() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512;
  const g = cv.getContext('2d');
  g.fillStyle = '#1c4534'; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = '#0f2b20'; g.lineWidth = 12; g.strokeRect(6, 6, 1012, 500);
  g.fillStyle = '#f2ece0'; g.textAlign = 'center';
  g.strokeStyle = '#f2ece0'; g.lineWidth = 6;                    // dot clock
  g.beginPath(); g.arc(512, 104, 68, 0, 7); g.stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.arc(512 + Math.sin(a) * 54, 104 - Math.cos(a) * 54, 4.4, 0, 7); g.fill(); }
  g.lineWidth = 8; g.beginPath(); g.moveTo(512, 104); g.lineTo(512 + Math.sin(3.85) * 32, 104 - Math.cos(3.85) * 32); g.stroke();
  g.lineWidth = 6; g.beginPath(); g.moveTo(512, 104); g.lineTo(512 + Math.sin(1.15) * 48, 104 - Math.cos(1.15) * 48); g.stroke();
  g.font = '700 34px "Courier New",monospace'; g.textAlign = 'left';
  g.fillText('VISITORS  · · · · · · ·', 60, 248);
  g.fillText('CUBS      · · · · · ·', 60, 308);
  g.strokeStyle = '#f2ece0'; g.lineWidth = 2;
  for (let i = 0; i < 10; i++) { g.strokeRect(392 + i * 44, 212, 40, 44); g.strokeRect(392 + i * 44, 272, 40, 44); }
  g.textAlign = 'center';
  g.font = '700 30px "Courier New",monospace';
  g.fillText('R  H  E', 924, 192);
  g.font = '700 38px "Courier New",monospace';
  g.fillText('OPEN HOUSE — NO GAME TODAY', 512, 398);
  g.font = '700 30px "Courier New",monospace';
  g.fillText('THE FRIENDLY CONFINES WELCOME YOU', 512, 452);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
function markerTex(txt) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 96;
  const g = cv.getContext('2d');
  g.fillStyle = '#f2d24a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 62px Arial,sans-serif'; g.fillText(txt, 64, 50);
  return new THREE.CanvasTexture(cv);
}
function tunnelSignTex() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96;
  const g = cv.getContext('2d');
  g.fillStyle = '#1c4a35'; g.fillRect(0, 0, 512, 96);
  g.strokeStyle = '#f2ece0'; g.lineWidth = 5; g.strokeRect(8, 8, 496, 80);
  g.fillStyle = '#f6f1e6'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const fit = (t, y, cap) => { let fs = cap; g.font = `800 ${fs}px Georgia,serif`; while (g.measureText(t).width > 464 && fs > 14) { fs -= 2; g.font = `800 ${fs}px Georgia,serif`; } g.fillText(t, 256, y); };
  fit('MARQUEE GATE', 34, 38); fit('→ CLARK & ADDISON', 68, 26);
  return new THREE.CanvasTexture(cv);
}
function eamusTex() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#f4efe2'; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#1c3f6e'; g.lineWidth = 8; g.strokeRect(6, 6, 500, 116);
  g.fillStyle = '#1c3f6e'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 58px Georgia,serif'; g.fillText('EAMUS CATULI!', 256, 46);
  g.font = '700 34px "Courier New",monospace'; g.fillText('AC 01 08 111', 256, 96);
  return new THREE.CanvasTexture(cv);
}

// ------------------------------ builders --------------------------------
// the grass disc (radial fan to rWall−3) + the warning-track ring
function buildField() {
  const N = 128, RINGS = [0, 0.3, 0.6, 0.85, 1];
  const pos = [], uv = [], idx = [];
  for (let ri = 0; ri < RINGS.length; ri++) for (let i = 0; i <= N; i++) {
    const th = -Math.PI + (i / N) * Math.PI * 2;
    const r = (rWallB(th) - TRACK_W_B) * RINGS[ri];
    const [x, z] = at(r, th);
    pos.push(x, 0.05, z);
    // texture space: up (+v) = AXIS, right (+u) = AXIS+90°; 176 m canvas span
    const dx = x - HP_B[0], dz = z - HP_B[1];
    const ux = Math.sin(AXIS_B), uz = Math.cos(AXIS_B), vx = uz, vz = -ux;
    uv.push(0.5 + (dx * vx + dz * vz) / 176, 0.5 + (dx * ux + dz * uz) / 176);
  }
  for (let ri = 0; ri < RINGS.length - 1; ri++) for (let i = 0; i < N; i++) {
    const a = ri * (N + 1) + i, b = a + 1, c = a + (N + 1), d = c + 1;
    idx.push(a, d, b, a, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  add(new THREE.Mesh(geo, toon(0xffffff, { mat: { map: fieldTexB() } })));
  // warning track: dirt ring rWall−3 → rWall (uv'd for merge safety)
  const tp = [], tuv = [], tidx = [];
  for (let i = 0; i <= N; i++) {
    const th = -Math.PI + (i / N) * Math.PI * 2, rw = rWallB(th);
    const [ax, az] = at(rw - TRACK_W_B, th), [bx, bz] = at(rw - 0.1, th);
    tp.push(ax, 0.07, az, bx, 0.07, bz);
    tuv.push(i / N, 0, i / N, 1);
    if (i) { const k = i * 2; tidx.push(k - 2, k + 1, k, k - 2, k - 1, k + 1); }
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
  tg.setAttribute('uv', new THREE.Float32BufferAttribute(tuv, 2));
  tg.setIndex(tidx); tg.computeVertexNormals();
  add(new THREE.Mesh(tg, toon(DIRT)));
}

// the field wall ring: ivy (outfield) / brick (down the lines) / green fence
// (corners), with the three OPEN field gates. Gate leaves park flat against
// the wall — an OPEN door, not a hole (the honest open-house read).
function buildWallRing() {
  const ivy = [], brick = [], caps = [], fence = [], gatePosts = [], gateLeaf = [];
  const STEP = 0.052;                                            // ~3.4 m chords at r 66
  const inGateArc = th => GATES_B.some(gs => Math.abs(wrap(th - (BACK_B + gs))) < 1.7 / Math.max(8, rWallB(th)));
  for (let th0 = -Math.PI; th0 < Math.PI; th0 += STEP) {
    const th = th0 + STEP / 2, rw = rWallB(th);
    const chord = 2 * rw * Math.sin(STEP / 2) + 0.25;            // overlap seals the fan
    const [x, z] = at(rw + 0.35, th);
    const ady = Math.abs(wrap(th - AXIS_B)), s = Math.abs(wrap(th - BACK_B));
    if (inGateArc(th)) continue;                                 // open gate — no wall here
    // NB rotation convention: rotY(ψ) maps local +X → (cosψ, 0, −sinψ), so a
    // box whose LENGTH is along X lies TANGENT at bearing θ with ψ = θ
    // (ψ = θ+π/2 runs it RADIAL — the first-run "green pillars" bug)
    if (ady <= 0.80) {                                           // IVY (the most Wrigley thing there is)
      ivy.push({ pos: [x, 1.75, z], yaw: th, scale: [chord / 4.3, 1, 1] });
      caps.push({ pos: [x, 3.62, z], yaw: th, scale: [chord / 4.35, 1, 1] });
    } else if (s <= 1.62) {                                      // brick box wall down the lines
      const g = new THREE.BoxGeometry(chord, 1.1, 0.7);
      g.rotateY(th); g.translate(x, 0.55, z); brick.push(g);
      const c = new THREE.BoxGeometry(chord + 0.06, 0.14, 0.8);
      c.rotateY(th); c.translate(x, 1.17, z); caps.push({ geo: c });
    } else {                                                     // corner fence (green)
      const g = new THREE.BoxGeometry(chord, 2.3, 0.5);
      g.rotateY(th); g.translate(x, 1.15, z); fence.push(g);
    }
  }
  const capItems = caps.filter(c => !c.geo);
  inst(new THREE.BoxGeometry(4.3, 3.5, 0.8), toon(0xffffff, { mat: { map: ivyTexB() } }), ivy);
  inst(new THREE.BoxGeometry(4.35, 0.24, 0.9), toon(0x6b7d5a), capItems);
  const brickCaps = caps.filter(c => c.geo).map(c => c.geo);
  if (brick.length) add(new THREE.Mesh(mergeGeos(brick), toon(BRICK)));
  if (brickCaps.length) add(new THREE.Mesh(mergeGeos(brickCaps), toon(CREAM)));
  if (fence.length) add(new THREE.Mesh(mergeGeos(fence), toon(GREEN)));
  // gate posts + the swung-open leaf parked along the wall
  for (const gs of GATES_B) {
    const gth = BACK_B + gs, rw = rWallB(gth), half = 1.7 / Math.max(8, rw);
    for (const sgn of [-1, 1]) {
      const th = gth + sgn * half;
      const [px, pz] = at(rw + 0.35, th);
      const p = new THREE.BoxGeometry(0.28, 1.45, 0.28); p.rotateY(th); p.translate(px, 0.72, pz);
      gatePosts.push(p);
    }
    const lth = gth + half * 1.9, [lx, lz] = at(rw + 0.35, lth);  // leaf parked open
    const leaf = new THREE.BoxGeometry(1.6, 1.05, 0.09);
    leaf.rotateY(lth); leaf.translate(lx, 0.6, lz);               // tangent (see rotation NB)
    gateLeaf.push(leaf);
  }
  add(new THREE.Mesh(mergeGeos(gatePosts), toon(GREEN)));
  add(new THREE.Mesh(mergeGeos(gateLeaf), toon(0x2a4438)));
  // foul poles: yellow, AT the wall on each line (short RF by construction)
  const fp = [];
  for (const da of [-0.72, 0.72]) {
    const th = AXIS_B + da, rw = rWallB(th);
    const [x, z] = at(rw - 0.35, th);
    fp.push({ pos: [x, 5.5, z] });
  }
  inst(new THREE.CylinderGeometry(0.18, 0.20, 11, 7), toon(0xf2d24a), fp);
  // yellow distance markers on the ivy, facing home
  const mk = (da, txt) => {
    const th = AXIS_B + da, rw = rWallB(th);
    const [x, z] = at(rw - 0.15, th);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5),
      bmat(0xffffff, { map: markerTex(txt), transparent: true }));
    m.position.set(x, 2.7, z); m.rotation.y = th + Math.PI;
    add(m);
  };
  mk(0.5, '355'); mk(0, '400'); mk(-0.5, '353');
}

// concourse ring + seating bowl + upper deck + roof + enclosure walls
function buildStands() {
  const N = 96;
  // concourse floor: ring strip rWall+WALL_T → rS0, |s| ≤ S_CONC
  const cp = [], cuv = [], cidx = []; let ci = 0;
  for (let i = 0; i <= N; i++) {
    const s = -S_CONC_B + (i / N) * 2 * S_CONC_B, th = BACK_B + s, rw = rWallB(th);
    const [ax, az] = at(rw + WALL_T_B - 0.15, th), [bx, bz] = at(rw + WALL_T_B + CONC_W_B + 0.35, th);
    cp.push(ax, 0.06, az, bx, 0.06, bz);
    cuv.push(i / N, 0, i / N, 1);
    if (i) { const k = ci * 2; cidx.push(k - 2, k + 1, k, k - 2, k - 1, k + 1); }
    ci++;
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
  cg.setAttribute('uv', new THREE.Float32BufferAttribute(cuv, 2));
  cg.setIndex(cidx); cg.computeVertexNormals();
  add(new THREE.Mesh(cg, toon(CONCRETE)));

  // seating bowl: 8 rows as CONTINUOUS riser+tread ring strips that follow
  // rS0(θ) exactly (per-chord boxes left lit end-face shards where the row
  // radius drifts with the wall curve — the first-run floating triangles).
  // The strip heights ARE the data ROWS_B walk surface — one source.
  {
    const pos = [], uvs = [], idx = [];
    let vi = 0;
    const strip = (pts) => {                                     // pts: [[x,y,z,x2,y2,z2],…]
      const base = vi;
      for (let i = 0; i < pts.length; i++) {
        pos.push(...pts[i]); uvs.push(i / pts.length, 0, i / pts.length, 1); vi += 2;
      }
      for (let i = 1; i < pts.length; i++) {
        const k = base + i * 2;                                  // current pair start (vertex index)
        idx.push(k - 2, k + 1, k, k - 2, k - 1, k + 1);
      }
    };
    for (let k = 0; k < ROWS_B.n; k++) {
      const ranges = k < 5 ? [[-1.62, -VOM_S_B], [VOM_S_B, 1.62]] : [[-1.62, 1.62]];
      const yTop = ROWS_B.y0 + k * ROWS_B.dy, yBot = k ? yTop - ROWS_B.dy : 0;
      for (const [sA, sB] of ranges) {
        const n = Math.ceil((sB - sA) / 0.045);
        const riser = [], tread = [];
        for (let i = 0; i <= n; i++) {
          const th = BACK_B + sA + (sB - sA) * i / n;
          const rr0 = Math.min(rWallB(th) + WALL_T_B + CONC_W_B + k * ROWS_B.dr, polyRadiusB(th) - 1.2);
          const rr1 = Math.min(rr0 + ROWS_B.dr, polyRadiusB(th) - 1.1);
          const [ax, az] = at(rr0, th), [bx, bz] = at(rr1, th);
          riser.push([ax, yBot, az, ax, yTop, az]);
          tread.push([ax, yTop, az, bx, yTop, bz]);
        }
        strip(riser); strip(tread);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx); g.computeVertexNormals();
    add(new THREE.Mesh(g, toon(CONCRETE, { mat: { side: THREE.DoubleSide } })));
  }
  // benches ride the tread tops (instanced, green — gaps read as footwells)
  const benches = [], rails = [];
  const SSTEP = 0.10;
  for (let s = -1.62 + SSTEP / 2; s <= 1.62; s += SSTEP) {
    const th = BACK_B + s, rw = rWallB(th), rS0 = rw + WALL_T_B + CONC_W_B;
    for (let k = 0; k < ROWS_B.n; k++) {
      if (Math.abs(s) < VOM_S_B && k < 5) continue;             // entry vomitory gap
      const r = rS0 + k * ROWS_B.dr + ROWS_B.dr / 2 + 0.42, y = ROWS_B.y0 + k * ROWS_B.dy;
      if (r > polyRadiusB(th) - 1.6) continue;                   // clip to the enclosure
      const chord = 2 * r * Math.sin(SSTEP / 2) + 0.22;
      const [bx, bz] = at(r, th);
      benches.push({ pos: [bx, y + 0.2, bz], yaw: th, scale: [chord / 3.05, 1, 1] });
    }
  }
  inst(new THREE.BoxGeometry(3.05, 0.4, 0.52), toon(SEATG), benches);
  // climbable-wedge handrails (the "you can climb HERE" read)
  for (const w of WEDGES_B) {
    const th = BACK_B + (w.s0 + w.s1) / 2, rw = rWallB(th), rS0 = rw + WALL_T_B + CONC_W_B;
    for (let k = 0; k < ROWS_B.n; k += 2) {
      const r = rS0 + k * ROWS_B.dr + 0.7, y = ROWS_B.y0 + k * ROWS_B.dy;
      if (r > polyRadiusB(th) - 1.6) continue;
      const [x, z] = at(r, th);
      const g = new THREE.BoxGeometry(0.07, 0.95, 0.07); g.translate(x, y + 0.45, z);
      rails.push(g);
    }
  }
  if (rails.length) add(new THREE.Mesh(mergeGeos(rails), toon(0xd8d5cf)));

  // upper deck (scenery): fascia, risers, columns, roof — behind-home arc
  const fascia = [], uprows = [], cols = [], roof = [];
  for (let s = -1.5 + 0.14 / 2; s <= 1.5; s += 0.14) {
    const th = BACK_B + s, pr = polyRadiusB(th);
    const rF = Math.min(26.5, pr - 4.5);
    const chord = 2 * rF * Math.sin(0.07) + 0.3;
    const [fx, fz] = at(rF, th);
    fascia.push({ pos: [fx, 9.6, fz], yaw: th, scale: [chord / 3, 1, 1] });
    for (let k = 0; k < 5; k++) {
      const r = rF + 0.8 + k * 1.35, y = 10.4 + k * 0.78;
      if (r > pr - 1.4) continue;
      const [x, z] = at(r, th);
      uprows.push({ pos: [x, y, z], yaw: th, scale: [chord / 3, 1, 1] });
    }
  }
  // green steel columns hold the deck — kept OUT of the climbable wedges
  for (const s of [-1.35, -1.05, -0.25, 0.25, 1.05, 1.35]) {
    const th = BACK_B + s, pr = polyRadiusB(th);
    const r = Math.min(25.6, pr - 5.2), [x, z] = at(r, th);
    cols.push({ pos: [x, 5.1, z], yaw: th });
  }
  // roof slabs over the upper deck, tilted like the exterior ring
  for (let s = -1.45 + 0.24 / 2; s <= 1.45; s += 0.24) {
    const th = BACK_B + s, pr = polyRadiusB(th);
    const r = Math.min(30.5, pr - 3.4), [x, z] = at(r, th);
    const chord = 2 * r * Math.sin(0.12) + 0.4;
    roof.push({ pos: [x, 15.9, z], yaw: th, rx: 0.16, scale: [chord / 3.6, 1, 1] });
  }
  inst(new THREE.BoxGeometry(3, 1.5, 0.4), toon(0x24443a), fascia);
  inst(new THREE.BoxGeometry(3, 0.5, 1.4), toon(PALE), uprows);
  inst(new THREE.BoxGeometry(0.34, 10.2, 0.55), toon(GREEN), cols);
  inst(new THREE.BoxGeometry(3.6, 0.35, 9.0), toon(DARKROOF), roof);

  // enclosure: the footprint walls seen from INSIDE (brick base, pale upper,
  // cornice) at the exterior heights per edge kind — one building, two faces
  const HMAP = { addison: 16.5, secorner: 16.5, sheffield: 12, waveland: 6.5, gate: 8.2, plazaN: 16.5, plazaE: 16.5, notchS: 16.5, clark: 16.5, arc: 16.5 };
  const KINDS = STADIUM_W.edgeKinds;
  const pale = [], brick = [], cornice = [];
  for (let i = 0; i < POLY_B.length; i++) {
    const a = POLY_B[i], b = POLY_B[(i + 1) % POLY_B.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
    const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
    const h = HMAP[KINDS[i]] || 12;
    const mk = (arr, w, hh, d, oy) => {
      const g = new THREE.BoxGeometry(w, hh, d);
      g.rotateY(yaw); g.translate(cx, oy, cz); arr.push(g);
    };
    mk(brick, 1.2, 3.6, len + 0.35, 1.8);
    mk(pale, 1.2, h - 3.6, len + 0.35, 3.6 + (h - 3.6) / 2);
    mk(cornice, 1.5, 0.5, len + 0.5, h + 0.25);
  }
  add(new THREE.Mesh(mergeGeos(brick), toon(BRICK)));
  add(new THREE.Mesh(mergeGeos(pale), toon(PALE)));
  add(new THREE.Mesh(mergeGeos(cornice), toon(CREAM)));
}

// bleachers behind the ivy + batter's eye + centerfield scoreboard
function buildOutfield() {
  // continuous bench arcs (the exterior's checkered slabs read as loose
  // boxes in an EMPTY bowl — quiet cathedral wants unbroken green rows)
  const bl = [];
  for (let ri = 0; ri < 7; ri++) {
    const r = 75.5 + ri * 1.75, y = 3.9 + ri * 0.62;
    const n = Math.round(r * 1.32 / 3.0);
    const chord = r * 1.32 / n + 0.25;
    for (let k = 0; k <= n; k++) {
      const th = AXIS_B - 0.66 + (k / n) * 1.32;
      if (r > polyRadiusB(th) - 1.2) continue;
      const [x, z] = at(r, th);
      bl.push({ pos: [x, y, z], yaw: th, scale: [chord / 3.2, 1, 1] });
    }
  }
  inst(new THREE.BoxGeometry(3.2, 0.5, 1), toon(0x4a6b52), bl);
  { // batter's eye: dark juniper panel dead-centre (the hitter's backdrop)
    const [x, z] = at(76.8, AXIS_B);
    const g = new THREE.BoxGeometry(9, 4.6, 1.2); g.rotateY(AXIS_B); g.translate(x, 5.6, z);   // tangent
    add(new THREE.Mesh(g, toon(0x1b3a24)));
  }
  // the hand-turned scoreboard: same bearing/height as the exterior board
  const grp = new THREE.Group();
  const W = 15, H = 8.2, topY = SCOREBOARD_B.topY;
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, 1.6), toon(GREEN));
  body.position.y = topY - H / 2; grp.add(body);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.6, H - 0.5), bmat(0xffffff, { map: scoreboardTexB() }));
  face.position.set(0, topY - H / 2, 0.85); grp.add(face);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(W - 4, 10.4, 1.1), toon(0x173a2c));
  legs.position.y = topY - H - 5.2; grp.add(legs);
  const mastG = new THREE.CylinderGeometry(0.07, 0.09, 5.4, 6);
  const masts = new THREE.InstancedMesh(mastG, toon(0xd9d2c4), 3);
  { const M = new THREE.Matrix4(); [-4.6, 0, 4.6].forEach((mx, i) => { M.setPosition(mx, topY + 2.7, 0); masts.setMatrixAt(i, M); }); }
  masts.instanceMatrix.needsUpdate = true; grp.add(masts);
  const pen = { blue: [], red: [] };
  [-4.6, 0, 4.6].forEach((mx, mi) => {
    for (let i = 0; i < 4; i++) ((i + mi) % 2 ? pen.red : pen.blue).push([mx + 0.55, topY + 4.9 - i * 1.05]);
  });
  const penG = new THREE.PlaneGeometry(1.0, 0.42).translate(0.5, 0, 0);
  for (const [col, items] of [[0x2a5a9c, pen.blue], [0xb03a2e, pen.red]]) {
    const m = new THREE.InstancedMesh(penG, bmat(col, { side: THREE.DoubleSide }), items.length);
    const M = new THREE.Matrix4();
    items.forEach((p, i) => { M.setPosition(p[0], p[1], 0); m.setMatrixAt(i, M); });
    m.instanceMatrix.needsUpdate = true; grp.add(m);
  }
  grp.position.set(SCOREBOARD_B.x, 0, SCOREBOARD_B.z);
  grp.rotation.y = BACK_B;                                       // face looks back at home
  add(grp);
}

// light towers on the roof rim + outfield wings (exterior placements, so the
// inside silhouette matches what the street promised)
function buildTowers() {
  const towers = [];
  for (const da of [-1.35, -0.9, -0.35, 0.35, 1.1]) {
    const th = BACK_B + da, pr = polyRadiusB(th);
    const r = Math.min(30.5, pr - 3.2), [x, z] = at(r, th);
    towers.push({ x, z, base: 16.2, yaw: th - Math.PI });
  }
  for (const da of [-0.52, 0.52]) {
    const th = AXIS_B + da, pr = polyRadiusB(th);
    const r = Math.min(80, pr - 2.4), [x, z] = at(r, th);
    towers.push({ x, z, base: 8.6, mast: 12, yaw: th - Math.PI });
  }
  const mastG = new THREE.CylinderGeometry(0.2, 0.38, 7.6, 6).translate(0, 3.8, 0);
  const wingMastG = new THREE.CylinderGeometry(0.24, 0.46, 12, 6).translate(0, 6, 0);
  const bank = [];
  bank.push(new THREE.BoxGeometry(7.0, 0.22, 0.24).translate(0, 1.25, 0));
  bank.push(new THREE.BoxGeometry(7.0, 0.22, 0.24).translate(0, -1.25, 0));
  for (const vx of [-3.4, -1.7, 0, 1.7, 3.4]) bank.push(new THREE.BoxGeometry(0.18, 2.5, 0.18).translate(vx, 0, 0));
  for (const bx of [-2.55, -0.85, 0.85, 2.55]) {
    bank.push(new THREE.BoxGeometry(0.13, 2.9, 0.13).rotateZ(0.6).translate(bx, 0, 0));
    bank.push(new THREE.BoxGeometry(0.13, 2.9, 0.13).rotateZ(-0.6).translate(bx, 0, 0));
  }
  bank.push(new THREE.BoxGeometry(6.6, 0.34, 0.34).translate(0, 1.62, 0));
  const headG = mergeGeos(bank).translate(0, 0.55, 0);
  inst(mastG, toon(0xdad5c8), towers.filter(t => !t.mast).map(t => ({ pos: [t.x, t.base, t.z], yaw: t.yaw })));
  inst(wingMastG, toon(0xdad5c8), towers.filter(t => t.mast).map(t => ({ pos: [t.x, t.base, t.z], yaw: t.yaw })));
  inst(headG, toon(0xc9c4b6), towers.map(t => ({ pos: [t.x, t.base + (t.mast || 7.6) + 0.6, t.z], yaw: t.yaw })));
  const pts = [];
  towers.forEach(t => {
    const hy = t.base + (t.mast || 7.6) + 0.6;
    for (let i = -2; i <= 2; i++) {
      const ox = Math.cos(t.yaw) * i * 1.3, oz = -Math.sin(t.yaw) * i * 1.3;
      pts.push([t.x + ox, hy, t.z + oz]);
    }
  });
  const gp = new Float32Array(pts.length * 3), aC = new Float32Array(pts.length * 3), aS = new Float32Array(pts.length);
  pts.forEach((p, i) => { gp.set(p, i * 3); aC.set([1, 0.93, 0.78], i * 3); aS[i] = 7.5; });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(gp, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(aC, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(aS, 1));
  add(new THREE.Points(g, pointsMat()));
}

// the rooftops over the wall — the view the bleacher bums built (beyond
// Waveland to the N/NW, beyond short Sheffield to the E), + EAMUS CATULI
function buildRooftops() {
  const mass = [], parapet = [];
  const box = (x, z, w, d, h, yaw = 0) => {
    const g = new THREE.BoxGeometry(w, h, d); g.rotateY(yaw); g.translate(x, h / 2, z); mass.push(g);
    const p = new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4); p.rotateY(yaw); p.translate(x, h + 0.2, z); parapet.push(p);
  };
  // beyond the Waveland face (z −968): the LF rooftop row
  box(-276, -976, 11, 9, 10.5); box(-263, -977, 10, 9, 12.2); box(-250, -976, 11, 9, 11.0);
  box(-236, -977.5, 12, 9, 12.8); box(-222, -976, 10, 9, 10.2);
  // beyond the short Sheffield face (x −202): the RF rooftop pair
  box(-194.5, -892, 9, 12, 11.4); box(-194.5, -906, 9, 12, 12.6);
  add(new THREE.Mesh(mergeGeos(mass), toon(0x63594e)));
  add(new THREE.Mesh(mergeGeos(parapet), toon(0x9a8f80)));
  // tiny bleacher racks on two of them (the rooftop-club silhouette)
  const racks = [];
  for (const [bx, bz, yaw] of [[-263, -975.5, 0], [-194.2, -906, -Math.PI / 2]]) {
    for (let k = 0; k < 3; k++) {
      const g = new THREE.BoxGeometry(7, 0.4, 0.9);
      g.rotateY(yaw);
      g.translate(bx - Math.sin(yaw) * (k * 1.1), 12.9 + k * 0.5, bz - Math.cos(yaw) * (k * 1.1));
      racks.push(g);
    }
  }
  add(new THREE.Mesh(mergeGeos(racks), toon(0x4a6b52)));
  // EAMUS CATULI board on the LF row (readable from home plate)
  const b = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 2.1), bmat(0xffffff, { map: eamusTex() }));
  b.position.set(-236, 14.6, -972.8); b.rotation.y = wrap(AXIS_B + Math.PI);
  add(b);
}

// the entry tunnel at the vomitory (behind home) — where you came in
function buildTunnel() {
  const th = BACK_B, rS0 = rWallB(th) + WALL_T_B + CONC_W_B;
  const [x, z] = at(rS0 + 3.2, th);
  const grp = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(4.6, 4.2, 2.2), toon(BRICK));
  frame.position.y = 2.1; grp.add(frame);
  const recess = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.3, 1.9), toon(0x241f1c));
  recess.position.set(0, 1.65, -0.35); grp.add(recess);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.68), bmat(0xffffff, { map: tunnelSignTex() }));
  sign.position.set(0, 3.62, -1.18); grp.add(sign);
  grp.position.set(x, 0, z);
  grp.rotation.y = th;                                           // recess+sign face home plate
  add(grp);
}

// ------------------------------ minimap --------------------------------
function buildMinimapBase() {
  const M = MAP_B;
  const cv = document.createElement('canvas'); cv.width = M.cw; cv.height = M.ch;
  const g = cv.getContext('2d');
  const wm = (x, z) => [(x - M.x0) / M.w * M.cw, (z - M.z0) / M.h * M.ch];
  g.fillStyle = '#2b2833'; g.fillRect(0, 0, M.cw, M.ch);         // in-cell dark card
  g.fillStyle = '#3a3745'; g.beginPath();                        // the footprint
  POLY_B.forEach((p, i) => { const [mx, my] = wm(p[0], p[1]); i ? g.lineTo(mx, my) : g.moveTo(mx, my); });
  g.closePath(); g.fill();
  g.fillStyle = '#2e7d4f'; g.beginPath();                        // the field (LUT outline)
  for (let i = 0; i <= 72; i++) {
    const th = -Math.PI + (i / 72) * Math.PI * 2;
    const [x, z] = at(rWallB(th), th);
    const [mx, my] = wm(x, z); i ? g.lineTo(mx, my) : g.moveTo(mx, my);
  }
  g.closePath(); g.fill();
  { // warning track ring
    g.strokeStyle = '#8a6b45'; g.lineWidth = 5; g.beginPath();
    for (let i = 0; i <= 72; i++) {
      const th = -Math.PI + (i / 72) * Math.PI * 2;
      const [x, z] = at(rWallB(th) - 1.5, th);
      const [mx, my] = wm(x, z); i ? g.lineTo(mx, my) : g.moveTo(mx, my);
    }
    g.closePath(); g.stroke();
  }
  { // infield diamond wink
    const [hx, hy] = wm(HP_B[0], HP_B[1]);
    g.fillStyle = '#c9a36a'; g.save(); g.translate(hx, hy);
    g.rotate(Math.PI / 4 + (AXIS_B - Math.PI));                  // diamond opens up the axis
    g.fillRect(-7, -7, 14, 14); g.restore();
  }
  const dot = (x, z, c, r = 5) => { const [mx, my] = wm(x, z); g.fillStyle = c; g.beginPath(); g.arc(mx, my, r, 0, 7); g.fill(); };
  dot(SCOREBOARD_B.x, SCOREBOARD_B.z, '#e8b64c', 6);             // scoreboard
  { const [x, z] = at(rWallB(BACK_B) + CONC_W_B + 3.4, BACK_B); dot(x, z, '#e0574a', 5); } // the gate out
  g.fillStyle = '#f4efe6'; g.textAlign = 'center';
  g.font = '700 18px "Trebuchet MS",sans-serif';
  g.fillText('WRIGLEY FIELD', M.cw / 2, 30);
  g.font = 'italic 600 14px Georgia,serif';
  g.fillText('open house — stay off the grass', M.cw / 2, 52);
  return cv;
}

// ------------------------------- build ---------------------------------
let built = false, cellDef = null;
export function buildWrigleyBowl() {
  if (built) return cellDef; built = true;
  bowlRoot = new THREE.Group(); bowlRoot.name = 'cell-wrigley-bowl';
  buildField();
  buildWallRing();
  buildStands();
  buildOutfield();
  buildTowers();
  buildRooftops();
  buildTunnel();
  mergeCellStatic(bowlRoot, 1e6);          // compact pocket: one bucket per material
  scene.add(bowlRoot);
  cellDef = {
    id: CELL_ID_B, root: bowlRoot,
    walkable: walkableB, surfaceY: surfaceYB, kindAt: kindAtB,
    clamp: CLAMP_B, spawn: SPAWN_B,
    minimapBase: buildMinimapBase(), minimapBounds: MAP_B,
  };
  registerCell(cellDef);
  return cellDef;
}
