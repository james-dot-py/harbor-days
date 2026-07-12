// =====================================================================
// NICHOLS BRIDGEWAY — the white boat-hull footbridge (task 060, flag nichols).
// Renzo Piano's slim white span leaving the Great Lawn's SE launch pad, rising
// in one long graceful curve SOUTH over Monroe + the open Metra rail cut, and
// landing on the Modern Wing's Bluhm terrace. Built end to end on the REAL
// alignment (NICHOLS2_M's 7 hand-fit nodes, osm way 90707301) so the visuals
// match the shared walk data (WALK_M chainQ over the same nodes).
//
// THE SIGNATURE (refs/millennium-park/Nichols_Bridgeway_*.JPG): the underside
// is a smooth BOAT-HULL BELLY — a rounded V/U cross-section like an upturned
// rowing shell — not a plank with walls. Thin mesh side-parapets carry a warm
// bronze cap rail with a dusk LED glow strip on the outer face; a river-stone
// bed runs under the low end; slender steel trestle piers cradle the hull.
//
// Y-PIN LAW (brief GEOMETRY LAW): the walk deck y is LINEAR per segment
// (surfaceYM lerps node-to-node). The horizontal alignment is smoothed by a
// CatmullRom (no jacknifed corners, 048 contour law) but every deck sample's y
// is RE-PINNED to the walk-data value — computed by projecting the smoothed
// (x,z) onto the straight node segment and lerping exactly as surfaceYM does —
// so feet never float/sink (a >0.15 drift would). deck half-width 1.5 ≤ walk
// halfW 1.6, so the tiny lateral smoothing stays over the walkable strip.
//
// DRAW-CALL / GREEN-STEEL DISCIPLINE (PITFALLS "toon SILVER reads GREEN"): the
// curved under-shell would pick up the hemisphere's green ground-bounce on its
// down-facing faces if toon — so the HULL is SELF-LIT (bmat cream, the Bean's
// sanctioned escape); its SOLID capped silhouette carries the form. All silver
// (posts, wires, pier legs, saddles, bench legs) bakes into ONE merged bmat
// mesh = 1 draw; the dusk glow strip into ONE bmat mesh; the bronze cap rail +
// bench seats reuse the cached wood toon (0x8a6b46) so they fold into the
// existing wood bucket (+0). Soil bed reuses COL.soil, launch pad COL.plaza,
// river stones the maggie 'mg-rock' pool bucket — all +0.
//
// DETERMINISM: LOCAL mulberry32 only (never the shared world rng — one moved
// lakefront towel is a hard-constraint regression). Only stone-scatter jitter
// consumes it. Index exports are touched ONLY inside the build function (the
// circular-import TDZ law, task 058); shared hexes are copied as literals.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { millenniumRoot, flatGrid, poolInstanced } from './index.js';
import { toon, bmat, mulberry32 } from '../core.js';
import { collide } from '../props.js';
import * as M from '../data/millennium.js';

const R = mulberry32(0x4e494348);               // 'NICH' — local, never the world rng
const rr = (a, b) => a + (b - a) * R();

// shared hexes (literals — no index.js COL reference at module scope, TDZ law)
const WOOD = 0x8a6b46, SOIL = 0x4b4034, PLAZA = 0xc7c0ad;

// ------------------------- canvas text (2 total) -----------------------
function fitFont(g, text, maxW, base) {
  let fs = base; g.font = `700 ${fs}px Georgia,serif`;
  while (g.measureText(text).width > maxW && fs > 10) { fs -= 2; g.font = `700 ${fs}px Georgia,serif`; }
  return fs;
}
function plateTex(text, w, h, pad) {                 // dark serif letters on a warm-white plate
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  g.fillStyle = '#ecebe3'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#b7b2a4'; g.lineWidth = 3; g.strokeRect(3, 3, w - 6, h - 6);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFont(g, text, w - pad, Math.round(h * 0.6));
  g.fillStyle = '#39372e'; g.fillText(text, w / 2, h / 2 + 1);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}

export function buildNichols() {
  const root = millenniumRoot;
  const nodes = M.NICHOLS2_M.nodes;               // [x, z, y]
  const nSeg = nodes.length - 1;                  // 6
  const halfW = 1.5;                              // deck / parapet half-width (≤ walk halfW 1.6)
  const parapetH = 1.1;                           // rail height above the deck
  const worldUp = new THREE.Vector3(0, 1, 0);

  // ---- horizontal alignment: index-parameterized CatmullRom in the XZ plane;
  //      y RE-PINNED to the walk-data linear lerp (see Y-PIN LAW above) --------
  const curve = new THREE.CatmullRomCurve3(
    nodes.map(n => new THREE.Vector3(n[0], 0, n[1])), false, 'catmullrom', 0.5);
  function sampleAt(t) {
    const p = curve.getPoint(t);                  // smooth (x, 0, z) — index-uniform t
    const si = Math.min(nSeg - 1, Math.floor(t * nSeg));
    const a = nodes[si], b = nodes[si + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1;
    const f = Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.z - a[1]) * dz) / L2));
    return new THREE.Vector3(p.x, a[2] + (b[2] - a[2]) * f, p.z);  // y = surfaceYM's value
  }
  // deck y at an arbitrary z on the monotonic-z run (for the piers)
  function deckAtZ(zc) {
    for (let i = 0; i < nSeg; i++) {
      const a = nodes[i], b = nodes[i + 1];
      if ((zc >= a[1] && zc <= b[1]) || (zc <= a[1] && zc >= b[1])) {
        const f = (zc - a[1]) / (b[1] - a[1]);
        return { x: a[0] + (b[0] - a[0]) * f, y: a[2] + (b[2] - a[2]) * f };
      }
    }
    const l = nodes[nSeg]; return { x: l[0], y: l[2] };
  }

  const nSamp = 60;
  const P = [], EX = [], EY = [], EZ = [];
  for (let k = 0; k <= nSamp; k++) P.push(sampleAt(k / nSamp));
  for (let k = 0; k <= nSamp; k++) {
    const a = P[Math.max(0, k - 1)], b = P[Math.min(nSamp, k + 1)];
    const ex = b.clone().sub(a).normalize();                       // true travel dir (incl. slope)
    const ez = new THREE.Vector3().crossVectors(ex, worldUp).normalize();  // horizontal lateral (+ez = west)
    const ey = new THREE.Vector3().crossVectors(ez, ex).normalize();       // deck-up (tilts on the slope)
    EX.push(ex); EY.push(ey); EZ.push(ez);
  }

  // ==================== 1. THE DECK RIBBON ============================
  // Pale warm-grey up-face + a thin 0.12 fascia lip on each edge (the hull
  // covers the rest of the underside). One hand-built BufferGeometry with uv.
  const dpos = [], duv = [];
  const pushTri = (a, b, c) => { dpos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); duv.push(0, 0, 1, 0, 0, 1); };
  for (let k = 0; k < nSamp; k++) {
    const Lw0 = P[k].clone().addScaledVector(EZ[k], halfW), Le0 = P[k].clone().addScaledVector(EZ[k], -halfW);
    const Lw1 = P[k + 1].clone().addScaledVector(EZ[k + 1], halfW), Le1 = P[k + 1].clone().addScaledVector(EZ[k + 1], -halfW);
    pushTri(Lw0, Le0, Lw1); pushTri(Le0, Le1, Lw1);              // top faces up
    const dw0 = Lw0.clone().addScaledVector(EY[k], -0.12), de0 = Le0.clone().addScaledVector(EY[k], -0.12);
    const dw1 = Lw1.clone().addScaledVector(EY[k + 1], -0.12), de1 = Le1.clone().addScaledVector(EY[k + 1], -0.12);
    pushTri(Lw0, Lw1, dw0); pushTri(Lw1, dw1, dw0);             // west fascia
    pushTri(Le0, de0, Le1); pushTri(Le1, de0, de1);             // east fascia
  }
  const deckGeo = new THREE.BufferGeometry();
  deckGeo.setAttribute('position', new THREE.Float32BufferAttribute(dpos, 3));
  deckGeo.setAttribute('uv', new THREE.Float32BufferAttribute(duv, 2));
  deckGeo.computeVertexNormals();
  root.add(new THREE.Mesh(deckGeo, toon(0xd6d3c9)));

  // ==================== 2. THE HULL BELLY (the signature) =============
  // Smooth rounded hull under-shell: rim at the deck edge (±1.5) curving down to
  // a keel ~1.35 below deck mid, tapering shallow (~0.4) over the first/last 15%
  // of length. A half-ellipse beam (holds width across the section before
  // rounding to the keel — a truer boat-hull than a plain bell). Self-lit cream
  // so no green ground-bounce; DoubleSide + full caps so the underside reads
  // solid from the allee below. Ends before the terrace edge (x≈124.3) so it
  // doesn't bury into the Bluhm slab; the landing is deck.
  const nProf = 11, halfHull = halfW;             // 5 chord strips per side
  const keelDepth = t => {                        // smooth end-taper 0.4 → 1.35
    const e = 0.15, mid = 1.35, end = 0.4;
    let f;
    if (t < e) f = t / e; else if (t > 1 - e) f = (1 - t) / e; else return mid;
    return end + (mid - end) * (f * f * (3 - 2 * f));
  };
  const hullVert = (k, j) => {
    const u = -halfHull + (2 * halfHull) * (j / (nProf - 1));
    const s = Math.sqrt(Math.max(0, 1 - (Math.abs(u) / halfHull) ** 2));  // half-ellipse: 1 at keel, 0 at rim
    const yOff = 0.12 + (keelDepth(k / nSamp) - 0.12) * s;        // below P (rim = deck bottom)
    return P[k].clone().addScaledVector(EZ[k], u).addScaledVector(EY[k], -yOff);
  };
  let kEnd = nSamp;
  while (kEnd > 1 && P[kEnd].x > 124.3) kEnd--;                   // stop just west of the terrace
  const hpos = [], huv = [];
  const hTri = (a, b, c) => { hpos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); huv.push(0, 0, 1, 0, 0, 1); };
  for (let k = 0; k < kEnd; k++)                                  // longitudinal strips
    for (let j = 0; j < nProf - 1; j++) {
      const a = hullVert(k, j), b = hullVert(k, j + 1), c = hullVert(k + 1, j), d = hullVert(k + 1, j + 1);
      hTri(a, b, c); hTri(b, d, c);
    }
  for (const k of [0, kEnd]) {                                    // end caps (fan from the top-centre)
    const top = P[k].clone().addScaledVector(EY[k], -0.12);
    for (let j = 0; j < nProf - 1; j++) hTri(top, hullVert(k, j), hullVert(k, j + 1));
  }
  const hullGeo = new THREE.BufferGeometry();
  hullGeo.setAttribute('position', new THREE.Float32BufferAttribute(hpos, 3));
  hullGeo.setAttribute('uv', new THREE.Float32BufferAttribute(huv, 2));
  hullGeo.computeVertexNormals();
  root.add(new THREE.Mesh(hullGeo, bmat(0xe6e4dc, { side: THREE.DoubleSide })));

  // ==================== merge buckets =================================
  const silverGeos = [], glowGeos = [], woodGeos = [], railGeos = [];
  const boxOriented = (w, h, d, pos, ex, ey, ez) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.applyMatrix4(new THREE.Matrix4().makeBasis(ex, ey, ez).setPosition(pos));
    return g;
  };
  const boxWorld = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
  const boxBetween = (a, b, thick) => {                          // slim strut a→b (local Y = length)
    const dir = b.clone().sub(a), len = dir.length(); dir.normalize();
    const up = Math.abs(dir.y) > 0.99 ? new THREE.Vector3(1, 0, 0) : worldUp;
    const ez = new THREE.Vector3().crossVectors(dir, up).normalize();
    const ex = new THREE.Vector3().crossVectors(ez, dir).normalize();
    return boxOriented(thick, len, thick, a.clone().add(b).multiplyScalar(0.5), ex, dir, ez);
  };

  // ==================== 3. THE PARAPETS ===============================
  // Cap rail (bronze wood, folds into the wood bucket) + slim silver posts
  // (every 2nd sample) + two silver wires + a warm dusk LED strip on the outer
  // face — the thin mesh flank of the refs in the chunky house style.
  for (let k = 0; k < nSamp; k++) {
    const mid = P[k].clone().add(P[k + 1]).multiplyScalar(0.5);
    const ex = EX[k], ey = EY[k], ez = EZ[k];
    const len = P[k].distanceTo(P[k + 1]) + 0.05;
    for (const s of [-1, 1]) {
      const rail = mid.clone().addScaledVector(ey, parapetH).addScaledVector(ez, s * halfW);
      woodGeos.push(boxOriented(len, 0.09, 0.14, rail, ex, ey, ez));            // bronze cap rail
      for (const wy of [0.42, 0.82])                                            // two thin wires
        silverGeos.push(boxOriented(len, 0.03, 0.03, mid.clone().addScaledVector(ey, wy).addScaledVector(ez, s * halfW), ex, ey, ez));
      const glow = mid.clone().addScaledVector(ey, parapetH - 0.14).addScaledVector(ez, s * (halfW + 0.045));
      glowGeos.push(boxOriented(len, 0.04, 0.02, glow, ex, ey, ez));            // dusk LED strip (outer face)
      if (k % 2 === 0) {                                                        // slim posts, every 2nd sample
        const post = P[k].clone().addScaledVector(ey, parapetH / 2).addScaledVector(ez, s * halfW);
        silverGeos.push(boxOriented(0.05, parapetH, 0.05, post, ex, ey, ez));
      }
    }
  }

  // ==================== 4. THE TRESTLE PIERS ==========================
  // Slender A-frames (wide base → narrow top) cradling the keel on a saddle
  // box. Two at grade (colliders) + one standing on the rail-trench floor
  // (y −3) as the bridge flies the open Metra cut.
  const pier = (zc, baseY, doCollide) => {
    const d = deckAtZ(zc), keelY = d.y - 1.35;
    const lat = new THREE.Vector3(1, 0, 0);                       // travel ≈ +z here → lateral = x
    for (const s of [-1, 1]) {
      const base = new THREE.Vector3(d.x + s * 0.9, baseY, zc);
      const top = new THREE.Vector3(d.x + s * 0.35, keelY - 0.12, zc);
      silverGeos.push(boxBetween(base, top, 0.17));
    }
    silverGeos.push(boxWorld(1.9, 0.2, 0.6, d.x, keelY - 0.14, zc));            // saddle cradle
    silverGeos.push(boxWorld(0.7, 0.18, 0.5, d.x, keelY - 0.03, zc));           // keel seat
    if (doCollide) collide(d.x, zc, 0.5);
  };
  pier(872, 0, true);                              // grade, in the allee-trim buffer
  pier(897, 0, true);                              // grade, inside the Monroe slot (non-walk)
  pier(912, -3, false);                            // down in the rail trench (floor y −3)

  // ==================== 5. RIVER-STONE BED ===========================
  // A soil swale under the low run (inside the non-walk carve slots — starts at
  // x114.5 where the trimmed allee walk ends) + ~40 chunky stones folded into
  // the maggie 'mg-rock' pool bucket (+0). COL.soil folds too.
  root.add(flatGrid(7, 27, 0.012, SOIL, 118, 852.5));
  const stones = [], rockGeo = new THREE.IcosahedronGeometry(1, 0);
  for (let i = 0; i < 40; i++) {
    const s = rr(0.16, 0.4);
    stones.push({ pos: [114.7 + rr(0, 6.6), s * 0.35, 840 + rr(0, 25)],
      yaw: rr(0, 6.28), scale: [s, s * rr(0.6, 0.9), s], color: 0x8b9098 });
  }
  poolInstanced('mg-rock', rockGeo, stones);

  // ==================== 6. LAUNCH PAD + approach lip ==================
  root.add(flatGrid(8, 6, 0.0, PLAZA, 117, 836));                 // N2.pad x113–121 × z833–839
  { const lip = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.16, 2.4), toon(PLAZA));
    lip.position.set(117.5, 0.08, 840); root.add(lip); }          // seats the deck onto grade

  // ==================== 7. NAMEPLATE (west flank) =====================
  // "NICHOLS BRIDGEWAY" facing WEST toward the Chase allee; the hull is the
  // solid rear (FrontSide, no mirror artifact).
  { const np = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.55),
      bmat(0xffffff, { map: plateTex('NICHOLS BRIDGEWAY', 512, 64, 40), side: THREE.FrontSide }));
    np.position.set(115.9, 1.1, 846); np.rotation.y = -Math.PI / 2; root.add(np); }

  // ==================== 8. BLUHM TERRACE FURNITURE ====================
  // (terrace slab is executor A's; y13, walkable.) White guard rails on N/W/S
  // (gap where the deck lands, none on the wing wall), an honest non-door on
  // the wing wall, and two west-facing benches.
  const B = M.ART_M.modernWing.bluhm;              // x124.8–132.4 × z909.5–922 y13
  const railPost = (x, z) => railGeos.push(boxWorld(0.09, 1.05, 0.09, x, B.y + 0.525, z));
  const railCap = (x0, x1, z0, z1) => {            // cap along an edge (axis-aligned run)
    const horiz = (x1 - x0) > (z1 - z0);
    railGeos.push(boxWorld(horiz ? (x1 - x0) : 0.12, 0.1, horiz ? 0.12 : (z1 - z0),
      (x0 + x1) / 2, B.y + 1.08, (z0 + z1) / 2));
  };
  for (let x = B.x0; x <= B.x1 + 0.01; x += 1.9) railPost(x, B.z0);          // N edge z909.5
  railCap(B.x0, B.x1, B.z0, B.z0);
  for (let z = B.z0; z <= B.z1 + 0.01; z += 1.9) railPost(B.x0, z);          // W edge x124.8
  railCap(B.x0, B.x0, B.z0, B.z1);
  for (let x = 128.5; x <= B.x1 + 0.01; x += 1.9) railPost(x, B.z1);         // S edge (gap x123.5–128.5)
  railCap(128.5, B.x1, B.z1, B.z1);

  // honest NON-DOOR on the wing wall (x132.4) facing the terrace (west)
  { const gx = B.x1;                               // 132.4
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.0, 2.4), bmat(0x86a2b6));
    glass.position.set(gx - 0.06, B.y + 1.6, 915); root.add(glass);           // dark glass slot y13.1→16.1
    for (const [dz, w] of [[-1.35, 0.16], [1.35, 0.16]])                      // white side frames
      railGeos.push(boxWorld(0.16, 3.3, w, gx - 0.14, B.y + 1.65, 915 + dz));
    railGeos.push(boxWorld(0.16, 0.16, 2.86, gx - 0.14, B.y + 3.25, 915));    // frame head
    railGeos.push(boxWorld(0.16, 0.16, 2.86, gx - 0.14, B.y + 0.05, 915));    // frame sill
    const mw = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.52),
      bmat(0xffffff, { map: plateTex('MODERN WING', 256, 64, 26), side: THREE.FrontSide }));
    mw.position.set(gx - 0.15, B.y + 3.62, 915); mw.rotation.y = -Math.PI / 2; root.add(mw); }

  // two simple west-facing benches (seat = wood bucket, legs = silver bucket)
  for (const [bx, bz] of [[127, 911], [130.5, 918]]) {
    woodGeos.push(boxWorld(0.5, 0.12, 1.4, bx, B.y + 0.46, bz));              // seat (faces west)
    woodGeos.push(boxWorld(0.12, 0.5, 1.4, bx + 0.19, B.y + 0.7, bz));        // low back (east side)
    for (const [ox, oz] of [[-0.18, -0.6], [-0.18, 0.6], [0.18, -0.6], [0.18, 0.6]])
      silverGeos.push(boxBetween(new THREE.Vector3(bx + ox, B.y, bz + oz),
        new THREE.Vector3(bx + ox, B.y + 0.46, bz + oz), 0.06));
    collide(bx, bz, 0.7);
  }

  // ==================== emit the merged buckets =======================
  root.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(silverGeos, false), bmat(0x9aa0a6)));
  root.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(glowGeos, false), bmat(0xfff2c8)));
  root.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(woodGeos, false), toon(WOOD)));   // folds into wood bucket
  root.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(railGeos, false), toon(0xdad6ca)));
}
