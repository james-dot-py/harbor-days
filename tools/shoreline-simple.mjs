// =====================================================================
//  tools/shoreline-simple.mjs — SHORELINE-SIMPLE GATE (task 104, PERMANENT)
//  Pure Node. Rebuilds the LAND polygon EXACTLY as coast.js/walkprobe.mjs do
//  (same chicago.js data, same genCoast/crChain recipe) and FAILS on any
//  malformed shoreline map-wide:
//
//    SIMPLE      the LAND polygon must be simple — no proper segment-pair
//                crossing, no non-adjacent near-touch (< 0.05 m). A crossing
//                means the shoreline overlaps itself: water renders inside
//                land (or vice versa) and pip()-based walkability lies.
//    PAVE        MT_MOLE_PAVE (any walk-cap polygon fed to ShapeGeometry)
//                must be simple — a self-intersecting outline triangulates
//                into folded wings floating over water (seen live, 104).
//    PINCH       two shoreline stretches that are geodesically FAR APART
//                along the shore (> 120 m of perimeter) must not face each
//                other across less water than their terraced APRONS reach
//                (profileTotal per side; flush seawalls 0.6 m) plus a
//                VISIBLE-WATER floor. This is the class the owner reported
//                (2026-07-19, task 104): the Montrose mouth corner sat at the
//                hook mole's own x, both TIER_DEFAULT aprons (12.2 m) met
//                across the ~25 m gap, and "the shoreline touches/overlaps
//                itself". Geodesically NEAR facing pairs (a cove's rounded
//                west end, the dog-beach cove) are one continuous wrap of
//                shoreline — exempt by the perimeter-distance test.
//
//  FLOOR calibration (measured, this commit): pre-104 Montrose mouth worst
//  clear water = -2.73 m (aprons OVERLAP, 131 pinch pairs); post-104 map's
//  narrowest legitimate far-pair is the Belmont mouth channel at +15.19 m —
//  printed on every run. Floor 4.0 m sits well between them.
//
//  Run: node tools/shoreline-simple.mjs [--report] [--data <path>]
//  (--data: alternate chicago.js module, calibration only; exit 1 on FAIL)
// =====================================================================
const dataArg = process.argv.indexOf('--data');
const CH = await import(dataArg > 0 ? process.argv[dataArg + 1] : '../src/data/chicago.js');
const REPORT = process.argv.includes('--report');

let pass = 0, fail = 0; const fails = [];
function expect(label, ok) {
  if (ok) { pass++; if (REPORT) console.log(`  ok    ${label}`); }
  else { fail++; fails.push(label); console.log(`  FAIL  ${label}`); }
}

// ---- the coast.js/walkprobe.mjs rebuild recipe (never fork) ---------------
function genCoast(z0, z1, fx) { const C = []; for (let z = z0; z >= z1; z -= 3) C.push([fx(z), z]); return C; }
const COAST_MAIN = genCoast(CH.COAST_MAIN_PARAMS.z0, CH.COAST_MAIN_PARAMS.z1, CH.COAST_MAIN_PARAMS.fx);
const COAST_PEN = genCoast(CH.COAST_PEN_PARAMS.z0, CH.COAST_PEN_PARAMS.z1, CH.COAST_PEN_PARAMS.fx);
const COAST_GOLF = genCoast(CH.COAST_GOLF_PARAMS.z0, CH.COAST_GOLF_PARAMS.z1, CH.COAST_GOLF_PARAMS.fx);
const COAST_MOUTH = genCoast(CH.COAST_MOUTH_PARAMS.z0, CH.COAST_MOUTH_PARAMS.z1, CH.COAST_MOUTH_PARAMS.fx);
const COAST_CORNER = genCoast(CH.COAST_CORNER_PARAMS.z0, CH.COAST_CORNER_PARAMS.z1, CH.COAST_CORNER_PARAMS.fx);
const BASIN_W = []; for (let z = CH.BASIN_W_PARAMS.z0; z >= CH.BASIN_W_PARAMS.z1; z -= CH.BASIN_W_PARAMS.step) BASIN_W.push([CH.BASIN_W_PARAMS.fx(z), z]);
const COAST_MTR_BEACH = genCoast(CH.COAST_MTR_BEACH_PARAMS.z0, CH.COAST_MTR_BEACH_PARAMS.z1, CH.COAST_MTR_BEACH_PARAMS.fx);
const LAND = CH.buildLAND({
  COAST_CORNER, COAST_MAIN, COAST_PEN, COAST_GOLF, COAST_MOUTH, BASIN_W,
  COAST_BAY: CH.COAST_BAY_PTS, COAST_MTR_HARBOR: CH.COAST_MTR_HARBOR_PTS,
  COAST_MTR_POINT: CH.COAST_MTR_POINT_PTS, COAST_MTR_BEACH, COAST_MTR_CLOSE: CH.COAST_MTR_CLOSE_PTS,
});

// ---- geometry helpers -----------------------------------------------------
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const segsCross = (a, b, c, d) => {
  const s1 = cross(a, b, c), s2 = cross(a, b, d), s3 = cross(c, d, a), s4 = cross(c, d, b);
  return (s1 * s2 < 0) && (s3 * s4 < 0);
};
function segDist(a, b, c, d) {
  const pt = (p, u, v) => {
    const dx = v[0] - u[0], dz = v[1] - u[1], L2 = dx * dx + dz * dz || 1e-12;
    let t = ((p[0] - u[0]) * dx + (p[1] - u[1]) * dz) / L2; t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (u[0] + dx * t), p[1] - (u[1] + dz * t));
  };
  return Math.min(pt(a, c, d), pt(b, c, d), pt(c, a, b), pt(d, a, b));
}
function polySegs(pts, closed) {
  const P = pts.slice(); if (closed) P.push(P[0]);
  const S = [];
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-9) continue;
    S.push({ a, b, len, i });
  }
  return S;
}
// simplicity: proper crossings + non-adjacent near-touches on a polygon/polyline
function simpleCheck(name, pts, closed, touchTol) {
  const S = polySegs(pts, closed);
  let crossings = 0, touches = 0, at = '';
  for (let i = 0; i < S.length; i++) {
    const A = S[i];
    const x0 = Math.min(A.a[0], A.b[0]) - 1, x1 = Math.max(A.a[0], A.b[0]) + 1;
    const z0 = Math.min(A.a[1], A.b[1]) - 1, z1 = Math.max(A.a[1], A.b[1]) + 1;
    for (let j = i + 2; j < S.length; j++) {
      if (closed && i === 0 && j === S.length - 1) continue;
      const B = S[j];
      if (Math.min(B.a[0], B.b[0]) > x1 || Math.max(B.a[0], B.b[0]) < x0) continue;
      if (Math.min(B.a[1], B.b[1]) > z1 || Math.max(B.a[1], B.b[1]) < z0) continue;
      if (segsCross(A.a, A.b, B.a, B.b)) { crossings++; at = ` @${A.a[0].toFixed(1)},${A.a[1].toFixed(1)}`; }
      else if (j - i > 2 && segDist(A.a, A.b, B.a, B.b) < touchTol) { touches++; at = ` @${A.a[0].toFixed(1)},${A.a[1].toFixed(1)}`; }
    }
  }
  expect(`${name}: simple polygon — 0 crossings (got ${crossings}${crossings ? at : ''})`, crossings === 0);
  expect(`${name}: no non-adjacent touch < ${touchTol} m (got ${touches}${touches ? at : ''})`, touches === 0);
}

// ---- 1. SIMPLE: the full LAND shoreline -----------------------------------
console.log('--- shoreline simple: LAND polygon ---');
simpleCheck('LAND', LAND, true, 0.05);

// ---- 2. PAVE: walk-cap polygons fed to ShapeGeometry ----------------------
console.log('--- walk caps: ShapeGeometry outlines must be simple ---');
simpleCheck('MT_MOLE_PAVE', CH.MT_MOLE_PAVE, true, 0.02);

// ---- 3. PINCH: far-apart shoreline stretches facing across thin water -----
// Pieces tagged with their seaward APRON reach: terraced revetments project
// profileTotal(z) of walkable steps past the top edge; flush seawalls ~0.6 m
// (sheet-pile lip); beaches slope underwater (no stone shelf) and are exempt.
console.log('--- pinch: facing aprons must keep visible water between them ---');
function tierTotal(zc) {
  const R = CH.TIER_ROCKS;
  if (zc > R.zMin && zc < R.zMax) {
    if (zc < R.mouthZ0) {
      const f = Math.max(0, Math.min(1, (R.mouthZ0 - zc) / (R.mouthZ0 - R.mouthZ1)));
      return R.w.reduce((s, v, i) => s + v + (R.mouthW[i] - v) * f, 0);
    }
    return R.w.reduce((s, v) => s + v, 0);
  }
  return CH.TIER_DEFAULT.w.reduce((s, v) => s + v, 0);
}
const P_START = COAST_PEN[0];
const pieces = [
  ['corner', COAST_CORNER, 'tier'], ['rocks', COAST_MAIN, 'tier'], ['bel-mouth', COAST_MOUTH, 'tier'],
  ['bel-tip', CH.peninsulaTipLine(P_START), 'tier'], ['pen', COAST_PEN, 'tier'], ['golf', COAST_GOLF, 'tier'],
  ['bay', CH.COAST_BAY_PTS, 'tier'], ['mtr-mouth', CH.MTR_HARBOR_MOUTH, 'tier'],
  ['hook-tip', CH.MTR_HOOK_TIP, 'tier'], ['mole-face', CH.COAST_MTR_HARBOR_PTS, 'tier'],
  ['point', CH.COAST_MTR_POINT_PTS, 'tier'], ['close', CH.COAST_MTR_CLOSE_PTS, 'tier'],
  ...CH.seawallLines({ P_START, BASIN_W }).map((pts, i) => [`wall${i}`, pts, 'wall']),
];
// segments with seaward normals (buildSegs convention: n = (-tz, tx))
const segsAll = [];
for (const [name, pts, kind] of pieces) {
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0], az = pts[i][1], bx = pts[i + 1][0], bz = pts[i + 1][1];
    const len = Math.hypot(bx - ax, bz - az); if (len < 1e-9) continue;
    const tx = (bx - ax) / len, tz = (bz - az) / len;
    segsAll.push({ name, kind, a: pts[i], b: pts[i + 1], mx: (ax + bx) / 2, mz: (az + bz) / 2, nx: -tz, nz: tx, len });
  }
}
// geodesic separation proxy: distance along the LAND perimeter between the
// nearest LAND vertices to each segment midpoint (the pieces trace LAND).
const perim = [0];
for (let i = 1; i < LAND.length; i++) perim.push(perim[i - 1] + Math.hypot(LAND[i][0] - LAND[i - 1][0], LAND[i][1] - LAND[i - 1][1]));
const PERIM = perim[perim.length - 1];
function landStation(x, z) {
  let bd = 1e18, bi = 0;
  for (let i = 0; i < LAND.length; i++) {
    const d = (LAND[i][0] - x) ** 2 + (LAND[i][1] - z) ** 2;
    if (d < bd) { bd = d; bi = i; }
  }
  return perim[bi];
}
const apronOf = s => s.kind === 'wall' ? 0.6 : tierTotal(s.mz);
const MIN_VISIBLE_WATER = 4.0;   // floor of clear water between facing apron toes
const FAR = 120;                 // along-shore separation that makes a pair "distant"
let worst = 1e9, worstAt = '', pinches = 0;
for (let i = 0; i < segsAll.length; i++) {
  const A = segsAll[i], stA = landStation(A.mx, A.mz);
  for (let j = i + 1; j < segsAll.length; j++) {
    const B = segsAll[j];
    const dx = B.mx - A.mx, dz = B.mz - A.mz;
    const d2 = dx * dx + dz * dz; if (d2 > 3600) continue;             // > 60 m apart: no apron pair can pinch
    if (A.nx * dx + A.nz * dz <= 0) continue;                          // B not on A's water side
    if (B.nx * -dx + B.nz * -dz <= 0) continue;                        // A not on B's water side
    const dPer = Math.abs(landStation(B.mx, B.mz) - stA);
    if (Math.min(dPer, PERIM - dPer) < FAR) continue;                  // one continuous wrap of shore — exempt
    const clear = segDist(A.a, A.b, B.a, B.b) - apronOf(A) - apronOf(B);
    if (clear < worst) { worst = clear; worstAt = `${A.name}@${A.mx.toFixed(0)},${A.mz.toFixed(0)} x ${B.name}@${B.mx.toFixed(0)},${B.mz.toFixed(0)}`; }
    if (clear < MIN_VISIBLE_WATER) pinches++;
  }
}
console.log(`  worst far-pair clear water: ${worst === 1e9 ? 'none in range' : worst.toFixed(2) + ' m'} (${worstAt || '-'})`);
expect(`no far-apart facing shores with < ${MIN_VISIBLE_WATER} m clear water (got ${pinches} pinch pairs, worst ${worst === 1e9 ? 'n/a' : worst.toFixed(2) + ' m'})`, pinches === 0);

console.log(`\n==== shoreline-simple: ${pass} passed, ${fail} failed ====`);
if (fails.length && !REPORT) console.log('failures:\n  ' + fails.join('\n  '));
process.exit(fail ? 1 : 0);
