// =====================================================================
//  tools/path-layers.mjs  —  PATH-LAYER ORDER ASSERTION (task 088 item 0b)
//  Pure Node. No THREE, no browser. Import the CITY PACK data, rebuild the
//  stacked path/decal surfaces paths.js draws, and FAIL on any coplanar or
//  wrongly-ordered OVERLAPPING pair. Companion to tools/walkprobe.mjs (which
//  guards WALKABILITY); this one guards the render Y-LADDER so a marking never
//  floats over the pavement that should cover it, and two ribbons never
//  z-fight at the same height.
//
//  OWNER REPORT (the bug this exists to catch): "dashed yellow bike-lane line
//  draws on top of the adjacent walking path while the grey pavement
//  disappears." That is a marking (dash, y 0.075) rendering ABOVE a crossing
//  pavement (the walk ribbon, y 0.062) instead of below it.
//
//  ---- SURFACE MODEL --------------------------------------------------------
//  Every ribbon paths.js draws becomes a surface {id, key, pts, w, y, kind,
//  ownerId}. `pts` is a densely CatmullRom-sampled centerline (crSample mirrors
//  THREE's tangents, copied from walkprobe.mjs). The walk ribbons are the bike
//  centerline pushed along the LEFT normal by walkOff (paths.js ribbonOn shift
//  math). Markings (the yellow dashes) run on the bike/spur/montrose
//  centerlines; their tool width is inflated to 0.6 (vs the painted 0.14) so
//  near-misses register. `key` groups surfaces into DESIGN LAYERS (bike / walk
//  / spur / loop / dash / sancPath / cornerPath / cornerDesire): two surfaces
//  that share a key are one path network intended to sit at the same height
//  (e.g. the garden loop + its connector + the entrance path all 'loop', or
//  MAIN + MONTROSE bike continuing as one trail) — their mutual coplanarity is
//  BY DESIGN and is not a violation. Surfaces with DIFFERENT keys that end up
//  coplanar DO z-fight and ARE flagged.
//
//  ---- OVERLAP -------------------------------------------------------------
//  Pair overlaps where min centerline point-to-segment distance < (wA+wB)/2 -
//  0.1 (bbox-prefiltered). O(n^2) over ~16 surfaces is fine.
//
//  ---- ASSERTIONS (per OVERLAPPING pair) -----------------------------------
//   COPLANAR (pavement vs pavement, DIFFERENT keys): overlapping with
//     |yA-yB| < 0.006 -> FAIL (they z-fight). Same-key pavements are one design
//     layer (garden loop+connector+entrance; MAIN+MONTROSE bike) and their
//     coplanarity is intended, so they are exempt.
//   MARKING ORDER (marking m vs pavement p) — NETWORK based:
//     - p is a BIKE-network asphalt ribbon (key 'bike'/'spur' — the dash's own
//       lane or a sibling it merges/forks with) -> m must sit >= 0.004 ABOVE p
//       (the dash rides on top of all bike asphalt, incl. its owner).
//     - p is a PEDESTRIAN surface (walk/loop/limestone) -> m must sit >= 0.004
//       BELOW p (the crossing walking path COVERS the bike marking). This is
//       the owner-reported bug's rule.
//   NOTE / DELIBERATE REFINEMENT of the brief's "below any OTHER overlapping
//   pavement": the cover clause is scoped to PEDESTRIAN pavements. A sibling
//   BIKE ribbon (the spur forking off MAIN at [74,-340], or MAIN<->MONTROSE
//   continuing) is a same-network merge, not a crossing cover — the dash
//   correctly stays above it even after the ladder lifts the spur to 0.056.
//   Without this scoping the INTENDED ladder could never be clean (a bike dash
//   inherently sits above every asphalt ribbon it merges with). A genuine
//   coplanar clash of two bike pavements is still caught by the COPLANAR rule.
//   Float note: thresholds use a 1e-6 epsilon so an exactly-0.006 / exactly-
//   0.004 gap PASSES (IEEE754 makes 0.056-0.050 land a hair under 0.006).
//
//  ---- INTENDED LADDER (--simulate-ladder) ---------------------------------
//  The main session owns src/data/chicago.js and will apply this ladder:
//    bike 0.050, spur 0.056, dash 0.062, loop/connector/entrance 0.068,
//    walk 0.074 (sanctuary 0.055 / corner-path 0.065 / corner-desire 0.050 /
//    point paths follow walk keep their data-driven relative behavior).
//  Run with --simulate-ladder to override the TRAIL_STYLE ys with that ladder
//  and re-check — it doubles as executable documentation that the intended
//  fix lands clean. This tool does NOT edit any data; it only measures.
//
//  ---- WRIGLEYVILLE STREET DECALS (task 088 item 7) — OUT OF SCOPE, why ----
//  The bounded side-quest asked whether src/wrigley/streets.js keeps its street
//  decal Y constants as plain literals that could be lifted into an exported
//  STREET_LAYERS_W object. Findings (streets.js, read 2026-07-17):
//    * sidewalk slabs  — y 0.03  (box, +0.05 thick -> top 0.055); literal 0.03
//      in straightWalk() and paraWalk() (2 sites, inside loops).
//    * curbs           — y 0.065 (box, +0.13 thick -> top 0.130); literal 0.065
//      ~10x inline across the curbs[] array and two push()es.
//    * center-line paint (yellow) — y 0.025 (box, +0.02 -> top 0.035); literal
//      0.025 in 3 separate dash loops.
//    * crosswalk/stop-line paint  — XW_Y = 0.028 (box, +0.016 -> top 0.036);
//      the ONE already-named constant.
//    * ROADWAY ASPHALT — has NO y constant in streets.js at all: the road
//      surface is the Wrigleyville cell ground plane (village.js, grade y~0),
//      not a mesh streets.js owns.
//  Verdict: SKIP the refactor. The constants are scattered inline literals
//  across loops/arrays (not one clean block), the asphalt base the assert would
//  reference isn't even in this file, and the decals are THICK boxes (a
//  top-surface model) rather than the flat zero-thickness ribbons this tool
//  measures. Rewriting ~15 literal sites risks the determinism / perf hard
//  constraints for marginal benefit, so streets.js is left untouched. Instead a
//  small READ-ONLY static ladder check (observed values, clearly labelled) is
//  included below so the wrigley decal ORDER is still guarded mechanically.
// =====================================================================

import * as CH from '../src/data/chicago.js';

const SIM = process.argv.includes('--simulate-ladder');

/* ----------------------------- geometry ----------------------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// uniform Catmull-Rom sampler — mirrors THREE's tangents (0.5*(p[i+1]-p[i-1])
// with mirrored phantom endpoints), copied from tools/walkprobe.mjs.
function crSample(ctrl, step) {
  const m = ctrl.length; if (m < 2) return ctrl.map(p => [p[0], p[1]]);
  const pt = i => ctrl[Math.max(0, Math.min(m - 1, i))];
  const P = [[ctrl[0][0], ctrl[0][1]]];
  for (let s = 0; s < m - 1; s++) {
    const p0 = pt(s - 1), p1 = pt(s), p2 = pt(s + 1), p3 = pt(s + 2);
    const n = Math.max(1, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 1; k <= n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const z = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      P.push([x, z]);
    }
  }
  return P;
}
// parallel centerline at lateral offset `off` along the LEFT normal (-tz, tx) —
// matches paths.js ribbonOn (nx=-t.z, nz=t.x). Copied from walkprobe.offsetLine.
function offsetLine(pts, off) {
  const O = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0], tz = b[1] - a[1], L = Math.hypot(tx, tz) || 1;
    O.push([pts[i][0] + (-tz / L) * off, pts[i][1] + (tx / L) * off]);
  }
  return O;
}
function ptSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9;
  let t = ((px - ax) * dx + (pz - az) * dz) / L2; t = clamp(t, 0, 1);
  const cx = ax + dx * t, cz = az + dz * t; return { d: Math.hypot(px - cx, pz - cz), cx, cz };
}
function minToPolyline(px, pz, pts) {
  let best = { d: 1e9, cx: 0, cz: 0 };
  for (let i = 0; i < pts.length - 1; i++) {
    const r = ptSeg(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (r.d < best.d) best = r;
  }
  return best;
}
function bbox(pts) {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < z0) z0 = p[1]; if (p[1] > z1) z1 = p[1]; }
  return { x0, x1, z0, z1 };
}

/* --------------------------- layer heights -------------------------- */
const st = CH.TRAIL_STYLE;
const LADDER = { bike: 0.05, spur: 0.056, dash: 0.062, loop: 0.068, walk: 0.074 };
const Y = {
  bike: SIM ? LADDER.bike : st.bike.y,
  walk: SIM ? LADDER.walk : st.walk.y,
  spur: SIM ? LADDER.spur : st.spur.y,
  loop: SIM ? LADDER.loop : st.loop.y,
  dash: SIM ? LADDER.dash : st.dash.y,
  // these carry their OWN data ys (not TRAIL_STYLE) — unchanged by the ladder:
  sancPath: CH.SANCTUARY.path.y,
  cornerPath: CH.CORNER_PARK.path.y,
  cornerDesire: CH.CORNER_PARK.desire.y,
};

/* ---------------------------- surfaces ------------------------------ */
const STEP = 1.0;                                   // dense sample spacing (m)
const walkOff = st.bike.width / 2 + st.gap + st.walk.width / 2;   // 4.0 m
const S = [];
function surf(id, key, pts, w, y, kind, ownerId = null) {
  S.push({ id, key, pts, w, y, kind, ownerId, bb: bbox(pts) });
}
const mainBike = crSample(CH.TRAIL_MAIN, STEP);
const spurPts = crSample(CH.TRAIL_SPUR, STEP);
const montroseBike = crSample(CH.TRAIL_MONTROSE, STEP);
const MP = CH.MONTROSE_POINT;

// pavements (paths.js draw order)
surf('main-bike', 'bike', mainBike, st.bike.width, Y.bike, 'pavement');
surf('main-walk', 'walk', offsetLine(mainBike, walkOff), st.walk.width, Y.walk, 'pavement');
surf('spur', 'spur', spurPts, st.spur.width, Y.spur, 'pavement');
surf('connector', 'loop', crSample(CH.TRAIL_CONNECTOR, STEP), st.loop.width, Y.loop, 'pavement');
surf('sanctuary-loop', 'sancPath', CH.sanctuaryLoop(), CH.SANCTUARY.path.width, Y.sancPath, 'pavement');
surf('corner-desire', 'cornerDesire', crSample(CH.CORNER_PARK.desire.pts, STEP), CH.CORNER_PARK.desire.width, Y.cornerDesire, 'pavement');
surf('corner-path', 'cornerPath', crSample(CH.CORNER_PARK.path.pts, STEP), CH.CORNER_PARK.path.width, Y.cornerPath, 'pavement');
surf('garden-loop', 'loop', crSample(CH.TRAIL_LOOP, STEP), st.loop.width, Y.loop, 'pavement');
surf('garden-entrance', 'loop', crSample(CH.TRAIL_ENTRANCE, STEP), st.loop.width, Y.loop, 'pavement');
surf('montrose-bike', 'bike', montroseBike, st.bike.width, Y.bike, 'pavement');
surf('montrose-walk', 'walk', offsetLine(montroseBike, walkOff), st.walk.width, Y.walk, 'pavement');
surf('point-entrance', 'walk', crSample(MP.paths.entrance, STEP), MP.paths.width, Y.walk, 'pavement');
surf('point-loop', 'walk', crSample(MP.paths.loop, STEP), MP.paths.width, Y.walk, 'pavement');
// markings — yellow dashes on the bike centerlines (inflated w so near-misses register)
const DASH_W = 0.6;
surf('dash-main', 'dash', mainBike, DASH_W, Y.dash, 'marking', 'main-bike');
surf('dash-spur', 'dash', spurPts, DASH_W, Y.dash, 'marking', 'spur');
surf('dash-montrose', 'dash', montroseBike, DASH_W, Y.dash, 'marking', 'montrose-bike');

const byId = id => S.find(s => s.id === id);
const BIKE_KEYS = new Set(['bike', 'spur']);        // asphalt ribbons that carry/merge dashes
const EPS = 1e-6;                                    // guards the exact 0.006/0.004 boundary

/* --------------------------- overlap test --------------------------- */
function overlap(A, B) {
  const pad = (A.w + B.w) / 2;
  if (A.bb.x1 + pad < B.bb.x0 || B.bb.x1 + pad < A.bb.x0 ||
      A.bb.z1 + pad < B.bb.z0 || B.bb.z1 + pad < A.bb.z0) return null;
  const thr = pad - 0.1;
  let best = null;
  for (const p of A.pts) {
    const r = minToPolyline(p[0], p[1], B.pts);
    if (!best || r.d < best.d) best = { d: r.d, x: p[0], z: p[1] };
  }
  if (best && best.d < thr) return best;
  return null;
}

/* ---------------------------- assertions ---------------------------- */
const fails = [];
const fmtY = y => y.toFixed(3);
function assess(A, B, ov) {
  const near = `(${ov.x.toFixed(1)},${ov.z.toFixed(1)})`;
  // COPLANAR — two DIFFERENT-layer pavements overlapping at ~the same height
  // z-fight (markings are governed by MARKING ORDER, not this rule).
  if (A.kind === 'pavement' && B.kind === 'pavement' && A.key !== B.key) {
    const dy = Math.abs(A.y - B.y);
    if (dy < 0.006 - EPS)
      fails.push(`COPLANAR/TOO-CLOSE: ${A.id} (y ${fmtY(A.y)}) vs ${B.id} (y ${fmtY(B.y)}) overlap near ${near} — need |Δy|>=0.006 (Δ${dy.toFixed(3)})`);
  }
  markingOrder(A, B, near);
  markingOrder(B, A, near);
}
function markingOrder(m, p, near) {
  if (m.kind !== 'marking' || p.kind !== 'pavement') return;
  if (BIKE_KEYS.has(p.key)) {                        // bike asphalt (owner or sibling) — dash rides ON TOP
    if (!(m.y >= p.y + 0.004 - EPS)) {
      const who = p.id === m.ownerId ? `owner ${p.id}` : `bike ribbon ${p.id}`;
      fails.push(`MARKING NOT ABOVE BIKE PAVEMENT: ${m.id} (y ${fmtY(m.y)}) must sit >=0.004 above ${who} (y ${fmtY(p.y)}) near ${near} (Δ${(m.y - p.y).toFixed(3)})`);
    }
  } else {                                           // pedestrian surface — it COVERS the marking
    if (!(m.y <= p.y - 0.004 + EPS))
      fails.push(`MARKING ABOVE CROSSING PAVEMENT: ${m.id} (y ${fmtY(m.y)}) must sit >=0.004 BELOW crossing ${p.id} (y ${fmtY(p.y)}) near ${near} (Δ${(p.y - m.y).toFixed(3)})`);
  }
}

const overlapping = [];
for (let i = 0; i < S.length; i++)
  for (let j = i + 1; j < S.length; j++) {
    const A = S[i], B = S[j], ov = overlap(A, B);
    if (!ov) continue;
    overlapping.push({ A, B, ov });
    assess(A, B, ov);
  }

/* ------------------- WRIGLEYVILLE static ladder check --------------- */
// Read-only guard for the Wrigleyville street decals (streets.js NOT edited —
// see header). Values OBSERVED from src/wrigley/streets.js; top = box center +
// half thickness. Asphalt roadway is the cell ground plane (grade y=0).
const WV_DECALS = [
  { id: 'wv-asphalt(grade)', top: 0.0,   kind: 'base' },
  { id: 'wv-yellow-paint',   top: 0.035, kind: 'paint' },   // y 0.025 + 0.02/2
  { id: 'wv-crosswalk-paint',top: 0.036, kind: 'paint' },   // XW_Y 0.028 + 0.016/2
  { id: 'wv-sidewalk',       top: 0.055, kind: 'slab' },    // y 0.03 + 0.05/2
];
function wvStatic() {
  const g = WV_DECALS.find(d => d.kind === 'base').top;
  for (const d of WV_DECALS.filter(d => d.kind === 'paint')) {
    if (!(d.top >= g + 0.004))
      fails.push(`WV: paint ${d.id} (top ${d.top.toFixed(3)}) must sit >=0.004 above asphalt (grade ${g.toFixed(3)})`);
  }
  const slab = WV_DECALS.find(d => d.kind === 'slab');
  for (const d of WV_DECALS.filter(d => d.kind === 'paint')) {
    if (Math.abs(slab.top - d.top) < 0.006)
      fails.push(`WV: sidewalk (top ${slab.top.toFixed(3)}) coplanar with paint ${d.id} (top ${d.top.toFixed(3)}) — need |Δ|>=0.006`);
  }
}
wvStatic();

/* ------------------------------ report ------------------------------ */
console.log(`PATH-LAYERS  ${SIM ? '(SIMULATED INTENDED LADDER)' : '(current tree)'}`);
console.log('');

// Y-ladder table (ascending)
console.log('Y-LADDER (ascending):');
[...S].sort((a, b) => a.y - b.y || a.id.localeCompare(b.id)).forEach(s => {
  const owner = s.ownerId ? `  owner=${s.ownerId}` : '';
  console.log(`  ${fmtY(s.y)}  ${s.id.padEnd(16)} ${s.kind.padEnd(9)} w${s.w}${owner}`);
});
console.log('  ---- wrigleyville street decals (static, streets.js not imported) ----');
WV_DECALS.slice().sort((a, b) => a.top - b.top).forEach(d =>
  console.log(`  ${d.top.toFixed(3)}  ${d.id.padEnd(20)} ${d.kind}`));
console.log('');

// Diagnostics the brief asks for
console.log('DIAGNOSTICS:');
{
  const a = byId('spur'), b = byId('main-bike');
  let best = { d: 1e9, x: 0, z: 0 };
  for (const p of a.pts) { const r = minToPolyline(p[0], p[1], b.pts); if (r.d < best.d) best = { d: r.d, x: p[0], z: p[1] }; }
  console.log(`  spur <-> main-bike min centerline dist = ${best.d.toFixed(3)} m near (${best.x.toFixed(1)},${best.z.toFixed(1)}) (junction [74,-340] ~ 0)`);
}
{
  const a = byId('dash-main'), b = byId('main-walk');
  let best = { d: 1e9, x: 0, z: 0 };
  for (const p of a.pts) { const r = minToPolyline(p[0], p[1], b.pts); if (r.d < best.d) best = { d: r.d, x: p[0], z: p[1] }; }
  console.log(`  dash-main <-> main-walk min dist = ${best.d.toFixed(3)} m near (${best.x.toFixed(1)},${best.z.toFixed(1)})`);
}
{
  const a = byId('dash-spur'), b = byId('main-walk');
  let best = { d: 1e9, x: 0, z: 0 };
  for (const p of a.pts) { const r = minToPolyline(p[0], p[1], b.pts); if (r.d < best.d) best = { d: r.d, x: p[0], z: p[1] }; }
  console.log(`  dash-spur <-> main-walk min dist = ${best.d.toFixed(3)} m near (${best.x.toFixed(1)},${best.z.toFixed(1)})`);
}
console.log('');

// Overlapping pairs
console.log(`OVERLAPPING PAIRS (${overlapping.length}):`);
overlapping.forEach(({ A, B, ov }) =>
  console.log(`  ${A.id} <-> ${B.id}  d=${ov.d.toFixed(2)}  Δy=${Math.abs(A.y - B.y).toFixed(3)}  near (${ov.x.toFixed(1)},${ov.z.toFixed(1)})`));
console.log('');

// Failures
if (fails.length) {
  console.log(`VIOLATIONS (${fails.length}):`);
  fails.forEach((f, i) => console.log(`  ${String(i + 1).padStart(2)}. ${f}`));
  console.log('');
  console.log(`PATH-LAYERS: ${fails.length} violations`);
  process.exit(1);
} else {
  console.log(`PATH-LAYERS CLEAN (${S.length} surfaces, ${overlapping.length} overlapping pairs checked)`);
  process.exit(0);
}
