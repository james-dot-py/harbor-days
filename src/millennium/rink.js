// =====================================================================
// McCORMICK TRIBUNE ICE RINK (task 049 — owner override of the 040 cafe).
// Layout law: GEOGRAPHY.md MILLENNIUM_GEOGRAPHY + data RINK_M; the read is
// the owner photos (refs/millennium-park/owner-aerial-use-this.jpg for the
// footprint, owner-mccormick-ice-skating.jpg for boards / cream caps /
// white sheet / PARK GRILL band behind). Perpetual-dusk seasonal liberty:
// endless summer evening, rink open anyway (GEOGRAPHY + BRIEF).
//
// Draw discipline: everything static is a plain toon() mesh in a color the
// millennium merge pool already holds (pave/gran/wood/plaza/wall/balustrade
// creams) -> folds to +0; the NEW buckets are the awning green (+1), the
// ice bmat (sheet + scratches share ONE material+attribute sig -> +1) and
// two canvas signs (+2). The ice reads as ICE via geometry/vertex color
// only — no textures (acceptance rule).
//
// Walkability is DATA (WALK_M quads in data/millennium.js): the boards are
// a 0.8 m non-walk gap; this file only adds the matching VISUAL wall +
// the 45° corner-cut boards with their r 1.5 circle colliders (a glide
// slides off a circle nicely), plus colliders for masts and benches that
// stand on the walkable apron (statue pattern).
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon, bmat, mulberry32 } from '../core.js';
import { collide } from '../props.js';
import * as M from '../data/millennium.js';
import { millenniumRoot, flatGrid } from './index.js';

const COL = {
  pave:  0xb0a996,   // apron concrete + stair treads (pool)
  wall:  0x777063,   // retaining walls + stair cheeks (pool)
  plaza: 0xc7c0ad,   // Park Grill cream wall (pool)
  gran:  0x34383f,   // mast poles / flood heads (pool)
  wood:  0x8a6b46,   // benches (pool)
  board: 0xe9e4d8,   // boards body — the balustrade white (pool)
  cap:   0xf2eee4,   // boards cap cream — the balustrade cap (pool)
  hedge: 0x527a3d,   // rim planters (pool: lawnDk)
  awn:   0x2e6047,   // Park Grill awning green (NEW bucket, merged to 1)
};

const _r = mulberry32(0x1ce2049 ^ M.SEED_M);   // local — never the world rng
const rr = (a, b) => a + (b - a) * _r();

function box(w, h, d, color, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));
  m.position.set(x, y, z); m.rotation.y = ry;
  millenniumRoot.add(m); return m;
}

// ------------------------------ signs ---------------------------------
function signTex(text, w, h, fg, bg, font) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = font; g.fillText(text, w / 2, h / 2 + 1);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}

export function buildRink() {
  const R = M.RINK_M, I = R.ice, y = R.y;
  const icx = (I.x0 + I.x1) / 2, icz = (I.z0 + I.z1) / 2;
  const iw = I.x1 - I.x0, id = I.z1 - I.z0;

  // ---- 1. pit floor: concrete apron pad under everything ----
  millenniumRoot.add(flatGrid(R.x1 - R.x0, R.z1 - R.z0, y - 0.012, COL.pave,
    (R.x0 + R.x1) / 2, (R.z0 + R.z1) / 2));

  // ---- 2. THE ICE — sheet + skate scratches, ONE merged bmat mesh ------
  // Sheet: pale blue-white vertex mottle + a slightly polished darker
  // traffic ring where the loops run. Scratches: thin strips in two whites
  // scattered along the ring. Same attribute signature -> merges to 1 draw.
  {
    const geos = [];
    const sheet = new THREE.PlaneGeometry(iw, id, Math.round(iw * 2), Math.round(id * 2));
    sheet.rotateX(-Math.PI / 2);
    const pos = sheet.attributes.position, n = pos.count;
    const col = new Float32Array(n * 3);
    const cA = { r: 0.918, g: 0.945, b: 0.961 };  // #eaf1f5 base ice
    const cB = { r: 0.847, g: 0.895, b: 0.922 };  // #d8e4eb mottle
    const cC = { r: 0.796, g: 0.859, b: 0.898 };  // #cbdbe5 traffic ring
    for (let i = 0; i < n; i++) {
      const px = pos.getX(i), pz = pos.getZ(i);            // local, centered
      const m = 0.5 + 0.5 * Math.sin(px * 2.1 + pz * 0.7) * Math.sin(pz * 1.3 - px * 0.9);
      // elliptical traffic ring at ~70% of the half-spans
      const er = Math.hypot(px / (iw * 0.36), pz / (id * 0.38));
      const ring = Math.max(0, 1 - Math.abs(er - 1) * 2.4);
      let r0 = cA.r + (cB.r - cA.r) * m * 0.55, g0 = cA.g + (cB.g - cA.g) * m * 0.55, b0 = cA.b + (cB.b - cA.b) * m * 0.55;
      r0 += (cC.r - r0) * ring * 0.6; g0 += (cC.g - g0) * ring * 0.6; b0 += (cC.b - b0) * ring * 0.6;
      col[i * 3] = r0; col[i * 3 + 1] = g0; col[i * 3 + 2] = b0;
    }
    sheet.setAttribute('color', new THREE.BufferAttribute(col, 3));
    sheet.translate(icx, y + 0.008, icz);
    geos.push(sheet);
    // scratches — short thin strips, heaviest on the traffic ring
    for (let i = 0; i < 135; i++) {
      const onRing = i % 3 !== 0;
      const a = rr(0, Math.PI * 2);
      const ex = Math.cos(a) * iw * (onRing ? rr(0.3, 0.42) : rr(0.05, 0.3));
      const ez = Math.sin(a) * id * (onRing ? rr(0.32, 0.44) : rr(0.05, 0.32));
      const len = rr(0.7, 2.6);
      const s = new THREE.PlaneGeometry(0.045, len, 1, 1);
      s.rotateX(-Math.PI / 2);
      // scratches follow the flow around the ring (tangent) with jitter
      s.rotateY((onRing ? Math.atan2(-Math.cos(a) * iw, Math.sin(a) * id) : rr(0, Math.PI)) + rr(-0.35, 0.35));
      const sc = s.attributes.position.count, scol = new Float32Array(sc * 3);
      const white = _r() < 0.55;
      for (let k = 0; k < sc; k++) {
        scol[k * 3] = white ? 0.973 : 0.784; scol[k * 3 + 1] = white ? 0.984 : 0.851; scol[k * 3 + 2] = white ? 0.992 : 0.895;
      }
      s.setAttribute('color', new THREE.BufferAttribute(scol, 3));
      s.translate(icx + ex, y + 0.016 + (i % 4) * 0.003, icz + ez);   // layered y — no z-fight
      geos.push(s);
    }
    const merged = BufferGeometryUtils.mergeBufferGeometries(geos, false);
    const ice = new THREE.Mesh(merged, bmat(0xffffff, { vertexColors: true }));
    millenniumRoot.add(ice);
  }

  // ---- 3. retaining walls (west split at the stair) + rim planters -----
  const wallH = -y, wY = y / 2;
  const wall = (x0, x1, z0, z1) => box(x1 - x0, wallH, z1 - z0, COL.wall, (x0 + x1) / 2, wY, (z0 + z1) / 2);
  wall(R.x0, R.x0 + 0.4, R.z0, R.ramp.z0 - 1);          // W wall N of the stair mouth
  wall(R.x0, R.x0 + 0.4, R.ramp.z1 + 1, R.z1);          // W wall S of the stair mouth
  wall(R.x0, R.x1, R.z0, R.z0 + 0.4);                   // N wall
  wall(R.x0, R.x1, R.z1 - 0.4, R.z1);                   // S wall
  wall(R.x1 - 0.4, R.x1, R.z0, R.z1);                   // E wall (Park Grill band fronts it)
  // low clipped planters along the grade rim (W/N/S; E has the balustrade)
  const planter = (x0, x1, z0, z1) => {
    box(x1 - x0, 0.34, z1 - z0, COL.wall, (x0 + x1) / 2, 0.17, (z0 + z1) / 2);
    box(x1 - x0 - 0.16, 0.3, z1 - z0 - 0.16, COL.hedge, (x0 + x1) / 2, 0.44, (z0 + z1) / 2);
  };
  // (planters sit ON the rim walls, fully inside the pit rect — never
  // overhanging the spine / Madison walk quads)
  planter(R.x0, R.x0 + 0.6, R.z0, R.ramp.z0 - 1.2);
  planter(R.x0, R.x0 + 0.6, R.ramp.z1 + 1.2, R.z1);
  planter(R.x0 + 0.6, R.x1 - 0.4, R.z0, R.z0 + 0.6);
  planter(R.x0 + 0.6, R.x1 - 0.4, R.z1 - 0.6, R.z1);

  // ---- 4. BOARDS ring: white body + cream cap, 45° corner cuts, gate ---
  const bH = R.boardH, bY = y + bH / 2;
  const capY = y + bH + 0.055;
  const run = (cx, cz, len, ry) => {
    box(0.55, bH, len, COL.board, cx, bY, cz, ry);
    box(0.72, 0.13, len + 0.17, COL.cap, cx, capY, cz, ry);
  };
  const wbx = I.x0 - R.boardW / 2, ebx = I.x1 + R.boardW / 2;   // board centerlines
  const nbz = I.z0 - R.boardW / 2, sbz = I.z1 + R.boardW / 2;
  const cut = 2.2;                                              // corner-cut leg length
  run(wbx, (I.z0 + R.gate.z0) / 2 + cut / 4, R.gate.z0 - I.z0 - cut / 2, 0);       // W boards N of gate
  run(wbx, (R.gate.z1 + I.z1) / 2 - cut / 4, I.z1 - R.gate.z1 - cut / 2, 0);       // W boards S of gate
  run(ebx, icz, id - cut, 0);                                                       // E boards
  run(icx, nbz, iw - cut, Math.PI / 2);                                             // N boards
  run(icx, sbz, iw - cut, Math.PI / 2);                                             // S boards
  // corner cuts: diagonal boards across each ice corner + circle colliders
  for (const [cx, cz, sx, sz] of [
    [I.x0, I.z0, 1, 1], [I.x1, I.z0, -1, 1], [I.x0, I.z1, 1, -1], [I.x1, I.z1, -1, -1],
  ]) {
    const ry = -Math.PI / 4 * sx * sz;   // chord perpendicular to the corner bisector
    box(0.55, bH, cut * 1.42, COL.board, cx + sx * cut * 0.32, bY, cz + sz * cut * 0.32, ry);
    box(0.72, 0.13, cut * 1.42 + 0.17, COL.cap, cx + sx * cut * 0.32, capY, cz + sz * cut * 0.32, ry);
    collide(cx, cz, R.cornerR);                                 // glide slides off the circle
  }
  // gate posts flanking the opening (slightly taller, cream-capped)
  for (const gz of [R.gate.z0 - 0.15, R.gate.z1 + 0.15]) {
    box(0.6, bH + 0.3, 0.6, COL.board, wbx, y + (bH + 0.3) / 2, gz);
    box(0.74, 0.12, 0.74, COL.cap, wbx, y + bH + 0.36, gz);
  }

  // ---- 5. entry stairs (visual; the walk quad is the data ramp) --------
  {
    const rp = R.ramp, span = rp.x1 - rp.x0, steps = 8;
    const tw = span / steps, zc = (rp.z0 + rp.z1) / 2, zw = rp.z1 - rp.z0;
    for (let i = 0; i < steps; i++) {
      const tx = rp.x0 + tw * (i + 0.5);
      const ty = -((i + 0.5) / steps) * 1.6;
      box(tw + 0.02, 0.22, zw, COL.pave, tx, ty - 0.05, zc);
    }
    // chunky cheek walls (they enclose the non-walk strips beside the ramp)
    for (const cz of [rp.z0 - 0.5, rp.z1 + 0.5]) {
      box(span + 0.5, 2.1, 1.0, COL.wall, rp.x0 + span / 2 + 0.1, -0.55, cz);
      box(span + 0.7, 0.14, 1.12, COL.cap, rp.x0 + span / 2 + 0.1, 0.56, cz);  // cream rail cap
    }
  }

  // ---- 6. PARK GRILL band on the east wall (under the balustrade) ------
  // 1.6 m toon compression of the real full-storey grill front (recorded
  // liberty): cream wall + dark bulkhead + green awnings + warm windows +
  // the sign, all hung WEST of the wall face so they read from the ice.
  const warm = bmat(0xffd98a);                    // ONE shared self-lit material
  {
    box(0.6, wallH, R.z1 - R.z0, COL.plaza, R.x1 - 0.5, wY, (R.z0 + R.z1) / 2);      // cream grill front (derives from R.x1)
    box(0.7, 0.28, R.z1 - R.z0, COL.gran, R.x1 - 0.52, -0.14, (R.z0 + R.z1) / 2);    // dark bulkhead under the balustrade
    const fx = R.x1 - 0.83;                       // facade face plane (west of the wall)
    // 4 bays each side of the sign (at z 800) — explicit centers on the 770-826
    // wall, all clear of the sign backer (z 796.85-803.15) and the wall ends.
    for (const bz of [774, 780.2, 786.4, 792.6, 806, 811.3, 816.6, 821.9]) {
      const awn = box(0.55, 0.09, 4.6, COL.awn, fx - 0.2, y + 1.38, bz);       // sloped green awning
      awn.rotation.z = -0.5;
      const win = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.72), warm);    // warm lit window band
      win.position.set(fx - 0.02, y + 0.66, bz); win.rotation.y = -Math.PI / 2;
      millenniumRoot.add(win);
    }
    // LARK GRILL sign centered on the gate axis (faces the ice, west)
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 0.78),
      bmat(0xffffff, { map: signTex('LARK GRILL', 512, 72, '#f2eadb', '#243428', '600 44px Georgia,serif') }));
    sg.position.set(fx - 0.06, y + 1.18, 800); sg.rotation.y = -Math.PI / 2;
    millenniumRoot.add(sg);
    box(0.14, 0.86, 6.3, COL.awn, fx + 0.04, y + 1.18, 800);   // sign backer board
  }

  // ---- 7. benches on the west apron (face the ice) + colliders ---------
  for (const bz of [784, 790.5, 808.5, 815]) {
    const bx = R.x0 + 1.55;
    box(0.5, 0.09, 2.3, COL.wood, bx, y + 0.42, bz);
    for (const s of [-0.85, 0.85]) box(0.4, 0.42, 0.14, COL.wood, bx, y + 0.21, bz + s);
    collide(bx, bz, 0.95);
  }

  // ---- 8. corner light MASTS with banner boxes (the photo's fixture) ---
  const A = R.apron;   // masts stand ON the walkable apron ring, one per corner
  for (const [mx, mz] of [[A.x0 + 0.8, A.z0 + 1.6], [A.x0 + 0.8, A.z1 - 0.8], [A.x1 - 0.8, A.z0 + 1.6], [A.x1 - 0.8, A.z1 - 0.8]]) {
    const mh = 7.2;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, mh, 7), toon(COL.gran));
    pole.position.set(mx, y + mh / 2, mz); millenniumRoot.add(pole);
    for (let f = 0; f < 4; f++) {                 // 4 flood heads, angled down, lenses LIT (dusk rink)
      const a = f * Math.PI / 2 + Math.PI / 4;
      const hx = mx + Math.sin(a) * 0.36, hz = mz + Math.cos(a) * 0.36;
      const fl = box(0.4, 0.2, 0.26, COL.gran, hx, y + mh - 0.18, hz, a);
      fl.rotation.x = 0.5;
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.22), warm);
      lens.position.set(hx, y + mh - 0.27, hz); lens.rotation.set(0.5, a, 0, 'YXZ');
      millenniumRoot.add(lens);
    }
    box(0.9, 0.06, 0.06, COL.gran, mx, y + mh - 0.8, mz);         // banner cross-arm
    box(0.06, 1.6, 0.7, COL.cap, mx + 0.42, y + mh - 1.7, mz);    // hanging cream banner
    collide(mx, mz, 0.38);
  }

  // ---- 9. SKATE RENTAL board at the stair head (faces the spine) -------
  {
    const st = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.5),
      bmat(0xffffff, { map: signTex('SKATE RENTAL', 256, 64, '#2b3a4a', '#e8eef2', '700 30px Georgia,serif') }));
    st.position.set(R.x0 + 0.15, 0.92, R.ramp.z0 - 0.5); st.rotation.y = -Math.PI / 2;
    millenniumRoot.add(st);
    box(0.1, 0.62, 1.85, COL.board, R.x0 + 0.24, 0.9, R.ramp.z0 - 0.5);  // solid backer (no mirror read)
  }
}
