// =====================================================================
// BP PEDESTRIAN BRIDGE — the FULL CROSSING (task 058, flag `maggie`).
// Gehry's snaking stainless ribbon that hops Columbus Drive out of the
// Great Lawn's SE corner and lands, end to end, in Maggie Daley Park. The
// pre-057 dead-end deck is retired: the crossing now carries you the whole
// way over the real serpentine (BP_CROSSING_M's 28 hand-fit nodes) — launch
// at the lawn esplanade (172.6, 834.9) → north along the lawn rim → east
// over the Columbus TRENCH at z≈790 (deck y5) → the double-hairpin S-hook →
// grade at the Maggie landing (247, 807.5). No gate, no treetops — it lands.
//
// COPYRIGHT REGISTER (BRIEF/LOCATIONS owner rule): the Gehry bridge is a
// copyrighted work — chunky toon HOMAGE only. The parapet captures the
// SERPENTINE brushed-shingle SKIN silhouette, never a plate-for-plate
// replica; no traced/imported geometry, no photo textures.
//
// CONTOUR LAW (PITFALLS "piecewise-per-NODE deck planks JACKNIFE", 048): the
// deck ground, the shingle parapets and the plank treads are ALL swept along
// ONE THREE.CatmullRomCurve3 through the 28 nodes and oriented by the local
// curve tangent — NEVER per-node constant-yaw rectangles (that snaps the yaw
// at every node and jacknifes). The nodes are dense (~4-6 m apart) so the
// 0.5-tension CatmullRom's y stays within a few cm of the walkability's
// linear-between-nodes surface (WALK_M chainQ) — well inside the walkprobe
// 0.15 seam tolerance.
//
// DRAW-CALL DISCIPLINE (PITFALLS "toon SILVER reads GREEN"): the stainless
// parapet is SELF-LIT (bmat + a painted brushed-steel map, the Bean's
// sanctioned escape from the toon ramp) — toon steel here catches the
// hemisphere's GREEN ground-bounce on its many down/near-horizontal shingle
// faces and reads as a hedge. ALL parapet geometry (both flanks, every band,
// every cap, whole run) is baked to world space and self-merged into ONE
// mesh with ONE shared bmat = exactly ONE new draw call. Everything else
// reuses colours already seeded in the static pool so mergeCellStatic folds
// them +0: deck ground + ramps (COL.wood 0x8a6b46, index/Lurie boardwalk),
// treads (0x8f6836, pritzker firDk), trench road (0x45454d, streets asphalt),
// trench walls (COL.wall 0x777063, rink retaining walls).
//
// DETERMINISM: LOCAL mulberry32 only (never the shared world rng — moving a
// single lakefront towel is a hard-constraint regression). Only a subtle
// hand-laid tread-spacing jitter consumes the local rng.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { millenniumRoot, flatGrid, COL } from './index.js';
import { toon, bmat, mulberry32 } from '../core.js';
import * as M from '../data/millennium.js';

const _r = mulberry32(0x42504252);              // 'BPBR' — local, never the world rng
const rr = (a, b) => a + (b - a) * _r();

// ------------------------- brushed-steel map ---------------------------
// One warm-silver brushed map shared by the whole parapet. Fine brushed
// streaks run ALONG the plate length (the box face u-axis = band length),
// with a few stronger HORIZONTAL seam lines so the courses read as
// overlapping shingle PLATES rather than a smooth wall.
function brushTex() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 32;
  const g = cv.getContext('2d');
  g.fillStyle = '#cdc8bf'; g.fillRect(0, 0, 128, 32);            // warm-silver stainless base (catches the dusk)
  for (let y = 0; y < 32; y += 2) {                              // fine brushed streaks along the plate
    g.fillStyle = (y / 2) % 2 ? 'rgba(255,255,255,0.10)' : 'rgba(120,124,132,0.10)';
    g.fillRect(0, y, 128, 1);
  }
  g.strokeStyle = 'rgba(110,114,122,0.34)'; g.lineWidth = 1;     // shingle-course seams (horizontal)
  for (const y of [7, 16, 25]) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(128, y + 0.5); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,0.40)'; g.lineWidth = 1;     // bright catch-light just above each seam
  for (const y of [6, 15, 24]) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(128, y + 0.5); g.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}

export function buildBridge() {
  const C = M.BP_CROSSING_M, root = millenniumRoot;
  const halfW = C.halfW;                          // 2.6 — walkable strip half-width (parapet inner rail)
  const parapetH = C.parapetH;                    // 1.4 — chest-high, frames between the flanks
  const deckHalf = halfW + 0.2;                   // 2.8 — deck ground over-covers the walk + seats the walls
  const worldUp = new THREE.Vector3(0, 1, 0);

  // The crossing CENTERLINE: one CatmullRom through all 28 nodes (x, y, z).
  // Smooth XZ curvature; y ≈ the linear-between-nodes walk surface (dense
  // nodes → cm-scale deviation). Everything below is swept along it.
  const pts = C.nodes.map(n => new THREE.Vector3(n[0], n[2], n[1]));   // node [x,z,y] -> Vector3(x,y,z)
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const curveLen = curve.getLength();

  // right-handed frame at arc-param t: ex along the (pitched) travel dir,
  // ey the deck-normal "up" (world-up projected perp to ex — tilts on the
  // ramps), ez the horizontal lateral (across the deck). p = curve point.
  function frameAt(t) {
    const p = curve.getPointAt(t);
    const ex = curve.getTangentAt(t).normalize();
    const ey = worldUp.clone().addScaledVector(ex, -worldUp.dot(ex)).normalize();
    const ez = new THREE.Vector3().crossVectors(ex, ey);              // horizontal lateral, right-handed
    return { p, ex, ey, ez };
  }

  // ==================== 1. THE DECK GROUND ============================
  // A CONTINUOUS swept WOOD-plank ribbon (halfW ~2.8) — the visible walkable
  // surface of the whole crossing, ramps included (nodes 0 and 27 sit at
  // grade y0, so the ribbon descends to grade at both ends by itself). Built
  // as one gap-free BufferGeometry: a cross-section at each arc-station,
  // triangulated to its neighbour, each oriented by the curve tangent (no
  // jacknife, no seams). uv is planar (unused by the matte toon COL.wood, but
  // it matches the pool's plane/box attribute signature so it folds +0).
  const nDeck = Math.max(2, Math.round(curveLen / 1.4));
  const dpos = [], duv = [];
  let pL = null, pR = null;
  for (let i = 0; i <= nDeck; i++) {
    const fr = frameAt(i / nDeck);
    const c = fr.p.clone().addScaledVector(fr.ey, 0.02);             // just proud of grade (clears the lawn carpet)
    const L = c.clone().addScaledVector(fr.ez, -deckHalf);
    const R = c.clone().addScaledVector(fr.ez,  deckHalf);
    if (pL) {                                                        // two up-facing triangles bridging the sections
      dpos.push(pL.x, pL.y, pL.z,  pR.x, pR.y, pR.z,  L.x, L.y, L.z);
      dpos.push(pR.x, pR.y, pR.z,  R.x, R.y, R.z,  L.x, L.y, L.z);
      duv.push(0, 0, 1, 0, 0, 1,  1, 0, 1, 1, 0, 1);
    }
    pL = L; pR = R;
  }
  const deckGeo = new THREE.BufferGeometry();
  deckGeo.setAttribute('position', new THREE.Float32BufferAttribute(dpos, 3));
  deckGeo.setAttribute('uv', new THREE.Float32BufferAttribute(duv, 2));
  deckGeo.computeVertexNormals();
  root.add(new THREE.Mesh(deckGeo, toon(COL.wood)));                 // folds into the wood static bucket (+0)

  // ==================== 2. THE SHINGLE PARAPET ========================
  // Brushed-stainless self-lit walls enclosing BOTH flanks of the whole run,
  // chest-high (parapetH 1.4 above the deck) with a rounded coping cap. Swept
  // along the curve in short tangent-oriented segments (the 048 contour law —
  // NOT per-node rectangles): 4 stacked overlapping BANDS per flank per
  // segment (each higher band steps `proud` outboard = lapped shingle read)
  // + a coping cap. Inner face at exactly halfW so a down-deck camera frames
  // BETWEEN the flanks (the L-car interior doctrine). Every box is baked to
  // world space and self-merged into ONE mesh with ONE self-lit bmat = ONE
  // new draw call.
  const nBands = 4, stepH = parapetH / nBands, bandH = 0.46, bandDepth = 0.14, proud = 0.03;
  const capH = 0.15, capDepth = 0.24;
  const nWall = Math.max(2, Math.round(curveLen / 1.6));
  const segLen = curveLen / nWall;
  const bandLen = segLen + 0.6;                   // overlap so corners close on the turns
  const parapetGeos = [];
  for (let i = 0; i < nWall; i++) {
    const fr = frameAt((i + 0.5) / nWall);
    const rot = new THREE.Matrix4().makeBasis(fr.ex, fr.ey, fr.ez);  // X=length, Y=deck-up, Z=lateral
    for (const s of [-1, 1]) {
      for (let k = 0; k < nBands; k++) {
        const g = new THREE.BoxGeometry(bandLen, bandH, bandDepth);
        const off = fr.p.clone()
          .addScaledVector(fr.ey, stepH * k + stepH / 2)             // band height above the deck
          .addScaledVector(fr.ez, s * (halfW + bandDepth / 2 + proud * k)); // inner face at halfW, stepping proud
        parapetGeos.push(g.applyMatrix4(rot.clone().setPosition(off)));
      }
      const cg = new THREE.BoxGeometry(bandLen, capH, capDepth);     // rounded coping cap
      const coff = fr.p.clone()
        .addScaledVector(fr.ey, parapetH + capH / 2)
        .addScaledVector(fr.ez, s * (halfW + bandDepth / 2 + proud * nBands));
      parapetGeos.push(cg.applyMatrix4(rot.clone().setPosition(coff)));
    }
  }
  const parapetMat = bmat(0xc6c2b9, { map: brushTex(), side: THREE.DoubleSide });
  root.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(parapetGeos, false), parapetMat));

  // ==================== 3. WOOD-PLANK TREADS ==========================
  // Thin dark cross-seams across the deck following the serpentine end to
  // end: placed at ~1.3 m arc-length intervals (subtle hand-laid jitter from
  // the local rng), each oriented by the curve tangent, span ≤ the parapet
  // inner lateral so no tread clips the balustrade on the turns. 0x8f6836
  // (pritzker firDk) reads a shade darker than the deck and folds +0.
  const treadGeo = new THREE.BoxGeometry(0.1, 0.06, 2 * (halfW - 0.1));  // X thin (travel), Z span (across deck)
  const treadMat = toon(0x8f6836);
  const nT = Math.max(2, Math.round(curveLen / 1.3));
  for (let i = 0; i < nT; i++) {
    const t = Math.min(1, Math.max(0, (i + 0.5 + rr(-0.12, 0.12)) / nT)); // subtle hand-laid spacing
    const fr = frameAt(t);
    const q = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(fr.ex, fr.ey, fr.ez));           // X->fwd(thin), Y->up, Z->lat(span)
    const plank = new THREE.Mesh(treadGeo, treadMat);
    plank.position.copy(fr.p.clone().addScaledVector(fr.ey, 0.02 + 0.04)); // proud of the deck (deck at +0.02)
    plank.quaternion.copy(q); root.add(plank);
  }

  // ==================== 4. THE COLUMBUS TRENCH ========================
  // The road passes BENEATH the crossing in a CUT (visual only — never
  // walkable; walkability is all in data). A dark asphalt floor at floorY,
  // short retaining walls along the two curb lines (x0/x1) rising floorY->0,
  // and end walls at z0/z1. The grade carpet was already carved and the
  // Columbus road plane split around this rect (index.js/streets.js), so the
  // cut shows from the crest above. Road folds into the streets asphalt
  // bucket, walls into the rink retaining-wall bucket (+0 each).
  const T = C.trench;                             // {x0,x1,z0,z1,floorY}
  const spanX = T.x1 - T.x0, spanZ = T.z1 - T.z0;
  const midX = (T.x0 + T.x1) / 2, midZ = (T.z0 + T.z1) / 2;
  root.add(flatGrid(spanX, spanZ, T.floorY, 0x45454d, midX, midZ));  // sunken roadbed (streets RD asphalt)
  const wallH = -T.floorY, wallY = T.floorY + wallH / 2;             // floorY .. 0
  const wallMat = toon(COL.wall);
  const wbox = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z); root.add(m);
  };
  wbox(0.5, wallH, spanZ, T.x0, wallY, midZ);     // west curb retaining wall
  wbox(0.5, wallH, spanZ, T.x1, wallY, midZ);     // east curb retaining wall
  wbox(spanX, wallH, 0.5, midX, wallY, T.z0);     // north end wall
  wbox(spanX, wallH, 0.5, midX, wallY, T.z1);     // south end wall
}
