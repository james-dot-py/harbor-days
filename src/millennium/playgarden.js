// =====================================================================
// MAGGIE DALEY PLAY GARDEN (task 058) — CHIBI-HEAVEN. The park's most
// endearing acre, at the SE corner of Maggie Daley across the BP crossing.
// Owns ONLY the play-garden zone meshes (the ground/ribbon/walls/CSG are
// maggie.js). Refs (refs/millennium-park/): the red-and-white striped
// LIGHTHOUSE + curling stainless TUBE SLIDE on blue-green wave rubber; the
// navy play SHIP with rope nets + wind-vane mast; the timber FORT + orange
// rope SUSPENSION bridge; string-lit enchanted mini-forest; slide crater;
// swings; a splash pad. Perpetual summer DUSK.
//
// DETERMINISM: LOCAL mulberry32(0x504c4159 'PLAY') only, called INSIDE the
// build fn — never the shared world rng; positions FIXED, rng = cosmetic
// jitter (speckles, bulb tint) only.
//
// DRAW-CALL DISCIPLINE: plain toon Meshes FOLD FREE via mergeCellStatic
// (baked per cached-color material). Repeats/masses reuse cached toon()
// colors; ALL stainless shares ONE self-lit bmat instance (folds to 1 draw
// — self-lit so it never picks up the green ground-bounce PITFALLS warns
// bites toon steel). Self-lit/unique-map buckets (5): rubber-speckle ground,
// striped-lighthouse map, the shared stainless bmat, the splash-pad wet
// quad, and ONE THREE.Points for every warm string-light bulb + the beacon.
//
// Geometry law: src/data/millennium.js MAGGIE_M.play + GEOGRAPHY.md Zone B.
// =====================================================================
import * as THREE from 'three';
import { millenniumRoot } from './index.js';
import { toon, bmat, mulberry32, pointsMat } from '../core.js';
import { collide } from '../props.js';
import * as M from '../data/millennium.js';

// ------------------------------ palette --------------------------------
const C = {
  navy:   0x243a6b,   // ship hull
  red:    0xe23b2e,   // gunwale, lighthouse roof, rope nets, slide cheeks
  rope:   0xc0392b,   // ship rope net (warmer red)
  wood:   0x8a6b46,   // decks, bridge planks, stepping logs (COL.wood — folds)
  timber: 0x6b4a30,   // fort posts, tree trunks, cradle-nest weave
  dark:   0x15171d,   // portholes / glass
  orange: 0xe8752a,   // suspension-bridge ropes
  green:  0x3f6f3a,   // chibi-tree canopy
  greenLt:0x5f9a44,
  blue:   0x3a72c4,   // swing frame, slide chute
  teal:   0x246b66,   // crater bowl tint
  cream:  0xeae3d0,   // nest eggs, ship deck
};

// -------------------------- geometry helpers ---------------------------
const add = m => (millenniumRoot.add(m), m);
function box(w, h, d, x, y, z, mat, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); if (ry) m.rotation.y = ry; return add(m);
}
function cyl(rt, rb, h, x, y, z, mat, ry = 0, seg = 14) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z); if (ry) m.rotation.y = ry; return add(m);
}
// a solid tube between two 3-space points (stainless rails/slide/ropes/chains)
const _U = new THREE.Vector3(0, 1, 0), _D = new THREE.Vector3();
function tube(a, b, rad, mat, seg = 8) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz) || 1e-4;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, seg), mat);
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  m.quaternion.setFromUnitVectors(_U, _D.set(dx / len, dy / len, dz / len));
  return add(m);
}
// a flat dark porthole disc laid tangent on a vertical cylinder wall
function porthole(cx, cz, wallR, y, ang, rad, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.12, 12), mat);
  m.position.set(cx + Math.cos(ang) * wallR, y, cz + Math.sin(ang) * wallR);
  m.rotation.set(Math.PI / 2, 0, 0);            // face outward (round face radial)
  m.rotation.z = ang - Math.PI / 2;
  return add(m);
}

// ---------------------------- canvas maps ------------------------------
// diagonal RED/WHITE barber stripes (seamless: S multiple of 2*bw both axes)
function stripeTex() {
  const S = 128, bw = 16, P = 2 * bw;
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.fillStyle = '#f3eee2'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#e23b2e';
  for (let y = 0; y < S; y++) {                 // shift 1px/row -> 45° diagonal
    let x = ((P - (y % P)) % P) - P;
    for (; x < S; x += P) g.fillRect(x, y, bw, 1);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 2); t.anisotropy = 4;
  return t;
}
// blue-green speckled WAVE rubber
function rubberTex(rng) {
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.fillStyle = '#2f7f7a'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 4; i++) {                 // gentle tonal wave bands
    g.fillStyle = i % 2 ? 'rgba(46,140,132,0.25)' : 'rgba(24,96,96,0.22)';
    g.beginPath(); g.moveTo(0, i * 32);
    for (let x = 0; x <= S; x += 16) g.lineTo(x, i * 32 + Math.sin(x * 0.13 + i) * 6 + 16);
    g.lineTo(S, i * 32 + 32); g.lineTo(0, i * 32 + 32); g.fill();
  }
  for (let i = 0; i < 90; i++) {                // speckle grit (teal + a few blue)
    const x = rng() * S, y = rng() * S, r = 0.7 + rng() * 1.9, k = rng();
    g.fillStyle = k < 0.45 ? 'rgba(150,214,200,0.5)' : k < 0.8 ? 'rgba(20,88,90,0.5)' : 'rgba(96,160,208,0.45)';
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(9, 8); t.anisotropy = 4;
  return t;
}

export function buildPlayGarden() {
  const rng = mulberry32(0x504c4159);           // 'PLAY' — local, cosmetic only
  const P = M.MAGGIE_M.play, R = P.rooms;
  const steel = bmat(0xc2c7cf);                 // ONE shared stainless (folds to 1 draw)
  const bulbs = [];                             // {p:[x,y,z], c:[r,g,b], s} -> ONE Points

  // === A. BLUE-GREEN WAVE-RUBBER GROUND (the only ground here) ==========
  { const Z = P.zone, w = Z.x1 - Z.x0 + 2, d = Z.z1 - Z.z0 + 2;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d, 1, 1),
      toon(0xffffff, { mat: { map: rubberTex(rng) } }));
    m.rotation.x = -Math.PI / 2;
    m.position.set((Z.x0 + Z.x1) / 2, 0.006, (Z.z0 + Z.z1) / 2);
    add(m); }

  // === F. SLIDE CRATER BOWL (visual dish; walk grade stays y0) ==========
  // shallow darker-teal disc around the lighthouse foot + a rim lip ring
  { const cx = 304, cz = 851;
    const dish = new THREE.Mesh(new THREE.CircleGeometry(9.5, 40), toon(C.teal));
    dish.rotation.x = -Math.PI / 2; dish.position.set(cx, 0.012, cz); add(dish);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(9.6, 0.35, 6, 44), toon(C.teal));
    lip.rotation.x = -Math.PI / 2; lip.position.set(cx, 0.14, cz); add(lip); }

  // === B. THE LIGHTHOUSE — the hero (303,849,r3.2,h11) =================
  const LH = P.lighthouse, lx = LH.x, lz = LH.z;
  // striped body (toon+stripe map -> keeps dusk form, reads as a beacon)
  { const body = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 3.2, 6.9, 22),
      toon(0xffffff, { mat: { map: stripeTex() } }));
    body.position.set(lx, 3.45, lz); add(body); }
  for (const [ang, y] of [[-0.5, 2.2], [2.4, 2.4], [1.1, 4.6], [4.0, 4.5]])
    porthole(lx, lz, 3.0, y, ang, 0.45, toon(C.dark));
  // observation deck (wood disc, overhangs the body)
  cyl(4.4, 4.4, 0.34, lx, 7.0, lz, toon(C.wood), 0, 28);
  // metal-mesh railing ring: stainless balusters + top rail (shared steel)
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2;
    tube([lx + Math.cos(a) * 4.2, 7.15, lz + Math.sin(a) * 4.2],
         [lx + Math.cos(a) * 4.2, 8.25, lz + Math.sin(a) * 4.2], 0.045, steel, 5);
  }
  { const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.07, 5, 32), steel);
    ring.rotation.x = -Math.PI / 2; ring.position.set(lx, 8.2, lz); add(ring); }
  // red roof rim on stainless posts + a small finial (beacon rides the Points)
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    tube([lx + Math.cos(a) * 4.0, 8.25, lz + Math.sin(a) * 4.0],
         [lx + Math.cos(a) * 3.9, 9.3, lz + Math.sin(a) * 3.9], 0.06, steel, 5);
  }
  cyl(3.9, 5.0, 0.5, lx, 9.55, lz, toon(C.red), 0, 26);   // shallow red cap roof
  cyl(0.16, 0.16, 0.9, lx, 10.2, lz, steel);              // finial mast
  bulbs.push({ p: [lx, 10.7, lz], c: [1.0, 0.86, 0.5], s: 46 });  // the beacon lamp
  // curling STAINLESS TUBE SLIDE spiralling deck -> rubber
  { let prev = null;
    for (let i = 0; i <= 30; i++) {
      const t = i / 30, e = t * t * (3 - 2 * t);
      const ang = -0.35 - 1.65 * Math.PI * 2 * t;
      const r = 4.35 + 0.75 * t;
      const p = [lx + Math.cos(ang) * r, 6.9 - 6.35 * e, lz + Math.sin(ang) * r];
      if (prev) tube(prev, p, 0.55, steel, 9);
      prev = p;
    }
    // slide exit mouth ring on the rubber
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 6, 14), steel);
    mouth.position.set(prev[0], prev[1], prev[2]);
    mouth.rotation.x = Math.PI / 2; add(mouth); }
  collide(lx, lz, 3.4);

  // === C. THE PLAY SHIP (267-277 x 840-849; prow to the north) =========
  { const cx = 272, cz = 844.5;
    // navy hull: chunky body + rounded prow ellipsoid + tapered stern
    box(8, 3.0, 6.4, cx, 1.7, cz, toon(C.navy));
    { const prow = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), toon(C.navy));
      prow.scale.set(4.0, 1.55, 2.7); prow.position.set(cx, 1.7, 841.0); add(prow); }
    box(6.0, 2.6, 1.0, cx, 1.7, 848.6, toon(C.navy));      // squared stern
    // cream deck sole
    box(6.6, 0.2, 5.6, cx, 3.15, cz, toon(C.cream));
    // RED gunwale/top rail (a raised rim frame)
    box(8.2, 0.5, 0.6, cx, 3.35, 841.4, toon(C.red));      // bow rail
    box(8.2, 0.5, 0.6, cx, 3.35, 848.2, toon(C.red));      // stern rail
    box(0.6, 0.5, 7.4, 268.0, 3.35, cz, toon(C.red));      // port rail
    box(0.6, 0.5, 7.4, 276.0, 3.35, cz, toon(C.red));      // starboard rail
    // SILVER tubular railings around the deck (posts + a curved top rail)
    for (const [px, pz] of [[268.4, 841.6], [275.6, 841.6], [268.4, 844.5],
                            [275.6, 844.5], [268.4, 847.6], [275.6, 847.6]])
      tube([px, 3.4, pz], [px, 4.9, pz], 0.06, steel, 6);
    tube([268.4, 4.85, 841.6], [275.6, 4.85, 841.6], 0.06, steel, 6);
    tube([268.4, 4.85, 847.6], [275.6, 4.85, 847.6], 0.06, steel, 6);
    tube([268.4, 4.85, 841.6], [268.4, 4.85, 847.6], 0.06, steel, 6);
    tube([275.6, 4.85, 841.6], [275.6, 4.85, 847.6], 0.06, steel, 6);
    // central MAST + wind-vane (anemometer cups)
    tube([cx, 3.2, cz], [cx, 8.4, cz], 0.11, steel, 8);
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2;
      tube([cx, 8.2, cz], [cx + Math.cos(a) * 0.7, 8.35, cz + Math.sin(a) * 0.7], 0.03, steel, 5);
      const cup = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), steel);
      cup.position.set(cx + Math.cos(a) * 0.75, 8.37, cz + Math.sin(a) * 0.75); add(cup);
    }
    // RED rope NETS draped on both hull sides (diamond criss-cross)
    for (const sx of [267.9, 276.1]) {
      for (let k = -3; k <= 3; k++) {
        tube([sx, 3.3, cz + k * 0.9], [sx, 1.0, cz + k * 0.9 + 1.6], 0.05, toon(C.rope), 4);
        tube([sx, 3.3, cz + k * 0.9], [sx, 1.0, cz + k * 0.9 - 1.6], 0.05, toon(C.rope), 4);
      }
    }
    // black PORTHOLES low on both hull sides
    for (const pz of [842.5, 844.5, 846.5]) {
      box(0.12, 0.84, 0.84, 267.95, 1.4, pz, toon(C.dark));
      box(0.12, 0.84, 0.84, 276.05, 1.4, pz, toon(C.dark));
    }
    collide(cx, 843, 3.2); collide(cx, 847, 2.6); }

  // === D. TIMBER FORT TOWER (286-292 x 819-825 h8) + ROPE BRIDGE =======
  { const T = P.tower, cx = (T.x0 + T.x1) / 2, cz = (T.z0 + T.z1) / 2, h = T.h;
    const hw = (T.x1 - T.x0) / 2 - 0.15, hd = (T.z1 - T.z0) / 2 - 0.15;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])   // 4 timber corner posts
      cyl(0.28, 0.32, h, cx + sx * hw, h / 2, cz + sz * hd, toon(C.timber), 0, 8);
    box(T.x1 - T.x0, 0.35, T.z1 - T.z0, cx, 4.0, cz, toon(C.wood));   // mid deck
    for (const z of [cz - hd, cz + hd])                            // slat rails (two levels)
      for (const y of [4.7, 5.6]) box(T.x1 - T.x0, 0.16, 0.16, cx, y, z, toon(C.timber));
    for (const x of [cx - hw, cx + hw])
      for (const y of [4.7, 5.6]) box(0.16, 0.16, T.z1 - T.z0, x, y, cz, toon(C.timber));
    // hipped timber roof (two sloped caps + ridge)
    { const r1 = box(T.x1 - T.x0 + 1.0, 0.28, (T.z1 - T.z0) / 2 + 0.8, cx, h + 0.7, cz - hd / 2, toon(C.timber));
      r1.rotation.x = 0.5;
      const r2 = box(T.x1 - T.x0 + 1.0, 0.28, (T.z1 - T.z0) / 2 + 0.8, cx, h + 0.7, cz + hd / 2, toon(C.timber));
      r2.rotation.x = -0.5;
      box(T.x1 - T.x0 + 1.2, 0.2, 0.2, cx, h + 1.35, cz, toon(C.timber)); }
    collide(cx, cz, 3.4);

    // ORANGE rope SUSPENSION BRIDGE heading north to a landing post
    const A = [cx, 4.5, T.z0], Bp = [cx, 4.0, 809];             // tower N face -> post
    cyl(0.16, 0.2, 5.2, Bp[0], 2.6, Bp[2], toon(C.timber), 0, 8);   // far post
    const nseg = 12, droop = 1.15;
    const deckPt = t => {
      const z = A[2] + (Bp[2] - A[2]) * t;
      const y = A[1] + (Bp[1] - A[1]) * t - droop * 4 * t * (1 - t);
      return [cx, y, z];
    };
    let prev = null;
    for (let i = 0; i <= nseg; i++) {
      const t = i / nseg, p = deckPt(t);
      // side ropes (orange) both edges + plank + a vertical hanger
      for (const ox of [-1.0, 1.0]) {
        if (prev) tube([prev[0] + ox, prev[1] + 0.55, prev[2]], [p[0] + ox, p[1] + 0.55, p[2]], 0.05, toon(C.orange), 4);
      }
      box(2.3, 0.12, 0.55, p[0], p[1], p[2], toon(C.wood));   // deck plank
      for (const ox of [-1.0, 1.0]) tube([p[0] + ox, p[1] + 0.02, p[2]], [p[0] + ox, p[1] + 0.55, p[2]], 0.03, toon(C.orange), 4);
      prev = p;
    }
    collide(Bp[0], Bp[2], 0.5); }

  // === G. SWINGS (279-286 x 836-842) — A-frame + two swings ============
  { const S = R.swings, cx = (S.x0 + S.x1) / 2, cz = (S.z0 + S.z1) / 2;
    const beamY = 3.1, span = 3.4;
    for (const sz of [cz - 1.7, cz + 1.7]) {                    // two blue A-frames
      tube([cx - span / 2, 0, sz], [cx, beamY, sz], 0.11, toon(C.blue), 7);
      tube([cx + span / 2, 0, sz], [cx, beamY, sz], 0.11, toon(C.blue), 7);
    }
    box(0.16, 0.16, 3.4, cx, beamY, cz, toon(C.blue));          // top beam
    for (const sz of [cz - 0.9, cz + 0.9]) {                    // two swings
      for (const ox of [-0.35, 0.35]) tube([cx + ox, beamY, sz], [cx + ox, 1.1, sz], 0.03, steel, 4);
      box(0.8, 0.12, 0.4, cx, 1.05, sz, toon(C.dark));          // seat
    }
    collide(cx - span / 2, cz - 1.7, 0.4); collide(cx + span / 2, cz - 1.7, 0.4);
    collide(cx - span / 2, cz + 1.7, 0.4); collide(cx + span / 2, cz + 1.7, 0.4); }

  // === H. WATERING HOLE splash pad (277.8-282.2 x 815-819) =============
  { const W = R.wateringHole, cx = (W.x0 + W.x1) / 2, cz = (W.z0 + W.z1) / 2;
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(W.x1 - W.x0 + 0.6, W.z1 - W.z0 + 0.6),
      bmat(0x16344f, { transparent: true, opacity: 0.85, depthWrite: false }));
    pad.rotation.x = -Math.PI / 2; pad.position.set(cx, 0.02, cz); pad.renderOrder = 2; add(pad);
    // low spray hint: a ring of thin stainless jets
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2, r = 1.1;
      cyl(0.02, 0.08, 0.5 + (i % 2) * 0.4, cx + Math.cos(a) * r, 0.28, cz + Math.sin(a) * r, steel, 0, 5);
    }
    cyl(0.03, 0.1, 0.9, cx, 0.45, cz, steel, 0, 6); }

  // === E. ENCHANTED FOREST (295-313 x 808-829) — string-lit at dusk ====
  { const poles = [                                            // fixed slim light-poles
      [296.5, 810.5, 4.2], [301.5, 815.5, 3.8], [307, 810.5, 4.4],
      [311, 819, 4.0], [305.5, 824.5, 4.1], [298, 825, 3.9], [310, 827, 4.3]];
    for (const [x, z, h] of poles) {
      cyl(0.11, 0.14, h, x, h / 2, z, toon(C.timber), 0, 7);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), steel);
      cap.position.set(x, h + 0.05, z); add(cap);
    }
    // three chibi trees tucked between the poles
    for (const [x, z, s] of [[300, 812, 1.0], [308.5, 815, 1.15], [303, 822, 0.95]]) {
      cyl(0.22, 0.3, 2.4 * s, x, 1.2 * s, z, toon(C.timber), 0, 8);
      const cn = new THREE.Mesh(new THREE.SphereGeometry(1.5 * s, 10, 8), toon(rng() < 0.5 ? C.green : C.greenLt));
      cn.position.set(x, 2.9 * s, z); cn.scale.y = 0.85; add(cn);
      collide(x, z, 0.35);
    }
    // ONE Points: warm-amber bulbs strung along catenaries between pole tops
    const chain = [0, 2, 1, 3, 4, 5, 6, 4];       // zig-zag stringing order
    for (let s = 0; s < chain.length - 1; s++) {
      const A = poles[chain[s]], B = poles[chain[s + 1]];
      const seg = 7, droop = 0.8;
      for (let i = 0; i <= seg; i++) {
        const t = i / seg;
        const x = A[0] + (B[0] - A[0]) * t, z = A[1] + (B[1] - A[1]) * t;
        const y = A[2] + (B[2] - A[2]) * t - droop * 4 * t * (1 - t);
        const warm = 0.82 + rng() * 0.18;
        bulbs.push({ p: [x, y, z], c: [1.0, warm * 0.85, warm * 0.42], s: 15 + rng() * 10 });
      }
    } }

  // === OPTIONAL chibi accents: cradle nest + stepping logs =============
  { const N = R.cradleNest, cx = (N.x0 + N.x1) / 2, cz = (N.z0 + N.z1) / 2;
    const nest = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.55, 7, 22), toon(C.timber));
    nest.rotation.x = -Math.PI / 2; nest.position.set(cx, 0.5, cz); add(nest);
    for (const [ex, ez] of [[cx - 0.6, cz], [cx + 0.7, cz - 0.5], [cx, cz + 0.7]]) {
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), toon(C.cream));
      egg.scale.y = 1.2; egg.position.set(ex, 0.75, ez); add(egg);
    }
    collide(cx, cz, 2.4);
    // stepping logs across The Sea room
    for (const [x, z] of [[284, 828], [287, 826], [290, 828.5], [282, 831]]) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.8, 10), toon(C.wood));
      log.rotation.z = Math.PI / 2; log.rotation.y = rng() * 6.28;
      log.position.set(x, 0.5, z); add(log); collide(x, z, 0.7);
    } }

  // === flush the single string-light / beacon Points cloud =============
  { const n = bulbs.length;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), sz = new Float32Array(n);
    bulbs.forEach((b, i) => {
      pos[i * 3] = b.p[0]; pos[i * 3 + 1] = b.p[1]; pos[i * 3 + 2] = b.p[2];
      col[i * 3] = b.c[0]; col[i * 3 + 1] = b.c[1]; col[i * 3 + 2] = b.c[2]; sz[i] = b.s;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    add(new THREE.Points(g, pointsMat())); }
}
