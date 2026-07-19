// =====================================================================
//  tools/path-continuity.mjs  —  PATH-CONTINUITY GATE (task 102, PERMANENT)
//  Pure Node. No THREE, no browser. Rebuilds EVERY ribbon paths.js draws —
//  EXACTLY (centripetal CatmullRom + r128 finite-difference tangents + the
//  n=max(60,round(len/2)) stationing + trailFrame left normals + the same
//  shifts/widths) — and FAILS on any malformed path geometry map-wide:
//
//    INTRA-RIBBON
//      DEGENERATE  consecutive stations < 0.02 m apart (collapsed quad)
//      BOWTIE      a quad whose two triangles disagree in orientation
//                  (self-intersecting fold — curvature radius < half-width)
//      SAWTOOTH    an edge that oscillates station-to-station (tangent noise):
//                  chord deviation sign-alternating run, or any dev > 0.25 m
//    JOINS (two ribbons of one network meeting end-to-end / at a weld)
//      OVERLAP     > 0.5 m of one ribbon's stations inside the other's strip
//                  at the same y (double-paving: z-fight + doubled paint)
//      STEP        lateral misalignment of the two centerlines > 0.15 m
//      GAP         along-track crack > 0.20 m of unpaved ground at the meet
//      CAP         end-cap corners displaced > 0.25 m (wedge gap / pinch)
//    DASHES        two center dashes from different curves < 1.4 m apart
//                  (dash spacing is 2.8 — a nearer pair is a seam doubling)
//
//  OWNER REPORT this exists for (2026-07-19, task 102): "where the white
//  fence ends near Montrose Harbor the path geometry is malformed — jagged/
//  misaligned segments." ROOT CAUSE: TRAIL_MONTROSE's first point [209,-562]
//  sat 10 m BEHIND TRAIL_MAIN's end [208,-572] ("overlap so the ribbons join
//  with no gap", 069 comment) — two full bike ribbons + two full walk ribbons
//  coexisted for ~10 m, laterally offset ~1 m, at IDENTICAL y: a double-wide
//  pavement with a z-fight band, rectangular edge notches where MAIN's end
//  cap chopped off, and doubled yellow dashes. The golf course's white north
//  fence (x60->205 at z-580) ends its east end right beside the seam.
//  Fix idiom (the 071 Point-paths precedent): continuing ribbons SHARE the
//  exact endpoint, and ribbonOn splices the first station frame to the
//  predecessor's last frame bit-exactly — the seam is clean BY CONSTRUCTION.
//
//  Deliberately NOT re-checked here (owned by sibling gates):
//    - cross-NETWORK coplanar overlaps + marking order: tools/path-layers.mjs
//    - the spur's T-fork off MAIN (stacked y 0.056 vs 0.050 by design)
//    - props/trees on ribbons: tools/prop-clearance.mjs
//  Scope: paths.js ribbons (the lakefront). Cell builders (millennium etc.)
//  have their own lane math (062 bandQ) and are out of scope.
//
//  Run: node tools/path-continuity.mjs [--report]   (exit 1 on any FAIL)
// =====================================================================
import * as CH from '../src/data/chicago.js';

const REPORT = process.argv.includes('--report');
let pass = 0, fail = 0;
const fails = [];
function expect(label, actual, wanted) {
  const ok = actual === wanted;
  if (ok) { pass++; if (REPORT) console.log(`  ok    ${label}`); }
  else { fail++; fails.push(label); console.log(`  FAIL  ${label}  (got ${actual}, want ${wanted})`); }
}

// ---- exact r128 mirrors --------------------------------------------------
// CatmullRomCurve3(ctrl, closed=false, 'centripetal', 0.5) over Vector3(x,0,z).
// Phantom endpoints extrapolated (p0 = 2P0-P1, p3 = 2Pl-Pl-1), centripetal
// dt = |d|^0.5 (pow(distanceToSquared, 0.25)), Hermite via CubicPoly.init.
function crPoint(ctrl, t) {
  const l = ctrl.length;
  const p = (l - 1) * t;
  let ip = Math.floor(p), w = p - ip;
  if (w === 0 && ip === l - 1) { ip = l - 2; w = 1; }
  const P = i => ctrl[Math.max(0, Math.min(l - 1, i))];
  const p0 = ip > 0 ? P(ip - 1) : [2 * ctrl[0][0] - ctrl[1][0], 2 * ctrl[0][1] - ctrl[1][1]];
  const p1 = P(ip), p2 = P(ip + 1);
  const p3 = ip + 2 < l ? P(ip + 2) : [2 * ctrl[l - 1][0] - ctrl[l - 2][0], 2 * ctrl[l - 1][1] - ctrl[l - 2][1]];
  return crSpan(p0, p1, p2, p3, w);
}
// The REAL r128 span evaluation: dt0/dt1/dt2 are 2D distances (pow(dSquared,0.25)),
// tangents computed per axis from them; zero-guard: if dt1 < 1e-4 dt1 = 1,
// dt0/dt2 derived (r128 lines 154-178). Mirrored bit-for-bit.
function crSpan(p0, p1, p2, p3, t) {
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  let dt0 = Math.pow(d2(p0, p1), 0.25), dt1 = Math.pow(d2(p1, p2), 0.25), dt2 = Math.pow(d2(p2, p3), 0.25);
  if (dt1 < 1e-4) dt1 = 1.0;
  if (dt0 < 1e-4) dt0 = dt1;
  if (dt2 < 1e-4) dt2 = dt1;
  const out = [0, 0];
  for (let c = 0; c < 2; c++) {
    let t1 = (p1[c] - p0[c]) / dt0 - (p2[c] - p0[c]) / (dt0 + dt1) + (p2[c] - p1[c]) / dt1;
    let t2 = (p2[c] - p1[c]) / dt1 - (p3[c] - p1[c]) / (dt1 + dt2) + (p3[c] - p2[c]) / dt2;
    t1 *= dt1; t2 *= dt1;
    const c0 = p1[c], c1 = t1, c2 = -3 * p1[c] + 3 * p2[c] - 2 * t1 - t2, c3 = 2 * p1[c] - 2 * p2[c] + t1 + t2;
    out[c] = c0 + c1 * t + c2 * t * t + c3 * t * t * t;
  }
  return out;
}
// r128 Curve.getTangent: central finite difference, delta 0.0001, clamped.
function crTangent(ctrl, t) {
  const d = 0.0001;
  const a = crPoint(ctrl, Math.max(0, t - d)), b = crPoint(ctrl, Math.min(1, t + d));
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
  return [dx / L, dz / L];
}
// r128 Curve.getLength: 200-division chord sum.
function crLength(ctrl) {
  let sum = 0, last = crPoint(ctrl, 0);
  for (let i = 1; i <= 200; i++) { const p = crPoint(ctrl, i / 200); sum += Math.hypot(p[0] - last[0], p[1] - last[1]); last = p; }
  return sum;
}

// ---- ribbonOn mirror (paths.js) -------------------------------------------
// Stations u=i/n over n=max(60,round(len/2)); left normal (-t.z, t.x);
// centerline shifted by `shift`; edges at +/- width/2. The seam/edge math
// (radiusClamp, joinSeam, weldSeam) is IMPORTED from src/pathgeom.js — the
// SAME functions paths.js executes, so the checks measure the FINAL shipped
// geometry and the two sides can never fork (the 052 shared-definition law).
import { dirOf, radiusClamp, joinSeam, weldSeam } from '../src/pathgeom.js';
function ribbon(ctrl, width, shift) {
  const n = Math.max(60, Math.round(crLength(ctrl) / 2));
  const cl = [], L = [], R = [], w = width / 2;
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = crPoint(ctrl, u), t = crTangent(ctrl, u);
    const nx = -t[1], nz = t[0];
    const cx = p[0] + nx * shift, cz = p[1] + nz * shift;
    cl.push([cx, cz]); L.push([cx + nx * w, cz + nz * w]); R.push([cx - nx * w, cz - nz * w]);
  }
  radiusClamp(cl, L, +1); radiusClamp(cl, R, -1);   // paths.js: no inner-edge darts
  return { ctrl, cl, L, R, n, w: width };
}
const DISCS = [];      // junction dots {x,z,r,forId} (paths.js junctions[] mirror)
function applyJoin(B, join, id) {
  const res = joinSeam(join, B.cl, B.L, B.R, B.w / 2);
  if (res.disc) { DISCS.push({ ...res.disc, forId: id }); B.discStart = true; }
  else B.joined = true;
}
function endFrame(r) { return { c: r.cl[r.cl.length - 1], pc: r.cl[r.cl.length - 2], pl: r.L[r.L.length - 2], pr: r.R[r.R.length - 2], l: r.L[r.L.length - 1], r: r.R[r.R.length - 1], dir: dirOf(r.cl[r.cl.length - 2], r.cl[r.cl.length - 1]) }; }
function applyWeld(r) {
  const P0 = r.ctrl[0], P1 = r.ctrl[r.ctrl.length - 1], n = r.n;
  if (Math.hypot(P0[0] - P1[0], P0[1] - P1[1]) >= 1e-6 || n < 4) return;
  const res = weldSeam(r.cl, r.L, r.R, r.w / 2);
  if (res.disc) { DISCS.push({ ...res.disc, forId: r.id + '(weld)' }); r.discWeld = true; }
  else r.welded = true;
}

// ---- the ribbon universe (buildPaths order, same data) --------------------
const st = CH.TRAIL_STYLE;
const walkOff = st.bike.width / 2 + st.gap + st.walk.width / 2;      // 4.0
const MP = CH.MONTROSE_POINT;
const R = [
  { id: 'walk:main',  net: 'walk',   ctrl: CH.TRAIL_MAIN,      w: st.walk.width, y: st.walk.y, shift: walkOff },
  { id: 'bike:main',  net: 'bike',   ctrl: CH.TRAIL_MAIN,      w: st.bike.width, y: st.bike.y, shift: 0 },
  { id: 'spur',       net: 'spur',   ctrl: CH.TRAIL_SPUR,      w: st.spur.width, y: st.spur.y, shift: 0 },
  { id: 'connector',  net: 'loop',   ctrl: CH.TRAIL_CONNECTOR, w: st.loop.width, y: st.loop.y, shift: 0 },
  { id: 'sanctuary',  net: 'sanc',   ctrl: CH.sanctuaryLoop(), w: CH.SANCTUARY.path.width, y: CH.SANCTUARY.path.y, shift: 0 },
  { id: 'corner:desire', net: 'corner', ctrl: CH.CORNER_PARK.desire.pts, w: CH.CORNER_PARK.desire.width, y: CH.CORNER_PARK.desire.y, shift: 0 },
  { id: 'corner:path',   net: 'corner', ctrl: CH.CORNER_PARK.path.pts,   w: CH.CORNER_PARK.path.width,   y: CH.CORNER_PARK.path.y, shift: 0 },
  { id: 'loop',       net: 'loop',   ctrl: CH.TRAIL_LOOP,      w: st.loop.width, y: st.loop.y, shift: 0 },
  { id: 'entrance',   net: 'loop',   ctrl: CH.TRAIL_ENTRANCE,  w: st.loop.width, y: st.loop.y, shift: 0 },
  { id: 'walk:mtr',   net: 'walk',   ctrl: CH.TRAIL_MONTROSE,  w: st.walk.width, y: st.walk.y, shift: walkOff },
  { id: 'bike:mtr',   net: 'bike',   ctrl: CH.TRAIL_MONTROSE,  w: st.bike.width, y: st.bike.y, shift: 0 },
  { id: 'point:ent',  net: 'point',  ctrl: MP.paths.entrance,  w: MP.paths.width, y: st.walk.y, shift: 0 },
  { id: 'point:loop', net: 'point',  ctrl: MP.paths.loop,      w: MP.paths.width, y: st.walk.y, shift: 0 },
];
for (const r of R) Object.assign(r, ribbon(r.ctrl, r.w, r.shift));
// buildPaths order: welds first (closed outlines self-miter inside ribbonOn),
// then the declared continuation joins (102): mtr<-main (walk + bike),
// point:loop<-point:ent.
for (const r of R) applyWeld(r);
applyJoin(R.find(r => r.id === 'walk:mtr'), endFrame(R.find(r => r.id === 'walk:main')), 'walk:main x walk:mtr');
applyJoin(R.find(r => r.id === 'bike:mtr'), endFrame(R.find(r => r.id === 'bike:main')), 'bike:main x bike:mtr');
applyJoin(R.find(r => r.id === 'point:loop'), endFrame(R.find(r => r.id === 'point:ent')), 'point:ent x point:loop');

// ---- small geometry helpers ----------------------------------------------
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function ptSeg(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1e-9;
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2; t = Math.max(0, Math.min(1, t));
  return { d: Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dz * t)), t };
}
function ptPoly(p, poly) {
  let best = { d: 1e9, t: 0, i: 0 };
  for (let i = 0; i < poly.length - 1; i++) {
    const r = ptSeg(p, poly[i], poly[i + 1]);
    if (r.d < best.d) best = { d: r.d, t: r.t, i };
  }
  return best;
}
function segsCross(a, b, c, d) {
  const s1 = cross(a, b, c), s2 = cross(a, b, d), s3 = cross(c, d, a), s4 = cross(c, d, b);
  return (s1 * s2 < 0) && (s3 * s4 < 0);
}

// ---- 1. INTRA-RIBBON ------------------------------------------------------
console.log('--- intra-ribbon: degenerate quads / bowties / sawtooth edges ---');
for (const r of R) {
  // degenerate stations
  let deg = 0, worstDeg = 1e9;
  for (let i = 0; i < r.cl.length - 1; i++) { const d = dist(r.cl[i], r.cl[i + 1]); if (d < worstDeg) worstDeg = d; if (d < 0.02) deg++; }
  expect(`${r.id}: no degenerate stations (min spacing ${worstDeg.toFixed(3)} m over ${r.n} stations)`, deg, 0);
  // bowtie quads: triangles (Li,Li+1,Ri) and (Ri,Li+1,Ri+1) must share orientation
  let bow = 0, bowAt = '';
  for (let i = 0; i < r.cl.length - 1; i++) {
    const o1 = Math.sign(cross(r.L[i], r.L[i + 1], r.R[i])), o2 = Math.sign(cross(r.R[i], r.L[i + 1], r.R[i + 1]));
    if (o1 !== 0 && o2 !== 0 && o1 !== o2) { bow++; bowAt = ` st${i}@${r.cl[i][0].toFixed(1)},${r.cl[i][1].toFixed(1)}`; }
  }
  expect(`${r.id}: no bowtie/folded quads${bow ? ' (' + bow + ')' + bowAt : ''}`, bow, 0);
  // edge malformation, three detectors (stations adjacent to a mitered
  // join/weld are exempt: the miter corner is intentional seam geometry):
  //   REVERSAL  an edge segment running AGAINST its centerline segment — a
  //             dart/doubled-back fold (radiusClamp makes these impossible
  //             by construction; assert that stays true map-wide)
  //   SAWTOOTH  alternating-sign chord-deviation runs >= 3 (tangent noise —
  //             a true curve deviates one-signed)
  //   SPIKE     chord deviation the CENTERLINE's own local curvature cannot
  //             explain (edge dev tracks centerline dev scaled by the offset
  //             ratio; allowance 3x + 0.25 m keeps deliberate tight bends —
  //             the peanut waist's clamped neck — exempt while a lone jagged
  //             station, whose centerline is straight, still fails)
  const miterSkip = new Set();
  if (r.joined) { miterSkip.add(1); miterSkip.add(2); }
  if (r.welded) { miterSkip.add(1); miterSkip.add(2); miterSkip.add(r.cl.length - 2); miterSkip.add(r.cl.length - 3); }
  for (const [ename, E] of [['left', r.L], ['right', r.R]]) {
    let rev = 0, revAt = '';
    for (let i = 1; i < E.length - 2; i++) {
      if (miterSkip.has(i) || miterSkip.has(i + 1)) continue;
      const ex = E[i + 1][0] - E[i][0], ez = E[i + 1][1] - E[i][1];
      const cx = r.cl[i + 1][0] - r.cl[i][0], cz = r.cl[i + 1][1] - r.cl[i][1];
      if (ex * cx + ez * cz < 0) { rev++; revAt = ` seg${i}@${E[i][0].toFixed(1)},${E[i][1].toFixed(1)}`; }
    }
    expect(`${r.id} ${ename} edge: no reversed segments${rev ? ' (' + rev + ')' + revAt : ''}`, rev, 0);
    let worst = 0, worstAt = '', altWorst = 0;
    let runStart = 0;
    for (let i = 1; i < E.length - 1; i++) {
      if (miterSkip.has(i)) { runStart = i; continue; }
      const de = ptSeg(E[i], E[i - 1], E[i + 1]).d;
      const dc = ptSeg(r.cl[i], r.cl[i - 1], r.cl[i + 1]).d;
      const excess = de - 3 * dc;
      const side = Math.sign(cross(E[i - 1], E[i + 1], E[i])) || 1;
      if (excess > worst) { worst = excess; worstAt = ` st${i}@${E[i][0].toFixed(1)},${E[i][1].toFixed(1)} (dev ${de.toFixed(2)} cl ${dc.toFixed(2)})`; }
      // alternating-sign run detection (deviation > 0.03 to count as a tooth)
      if (i > 1 && de > 0.03) {
        const prevSide = Math.sign(cross(E[i - 2], E[i], E[i - 1])) || 1;
        if (side !== prevSide) { const rl = i - runStart; if (rl > altWorst) altWorst = rl; }
        else runStart = i;
      } else if (de <= 0.03) runStart = i;
    }
    expect(`${r.id} ${ename} edge: no sawtooth (worst unexplained dev ${worst.toFixed(3)}${worstAt}, alt-run ${altWorst})`,
      (worst > 0.25 || altWorst >= 3) ? 1 : 0, 0);
  }
}

// ---- 2. MEETINGS -------------------------------------------------------------
// Inside one network, classify every ribbon-endpoint meeting:
//   BUTT   B's endpoint coincides with A's endpoint (a continuation join) —
//          the mitered seam must share its edge: cap corners coincide (<=0.05,
//          bit-exact by construction), no overlap, no gap.
//   T      B's endpoint lands on A's INTERIOR (a merge) — it must reach the
//          host strip (no dead-end short of the path) and must NOT run
//          near-parallel inside the host's strip (that is double-paving, the
//          069 Montrose seam class), regardless of how short it is.
//   WELD   a ribbon whose ends coincide (closed outline) — its mitered weld
//          corners must coincide too.
console.log('--- meetings: butt joins / T merges / welds ---');
const nets = {};
for (const r of R) (nets[r.net] = nets[r.net] || []).push(r);
let buttCount = 0;
// quad-area overlap (proper edge crossing or containment) between two ribbons.
// With `disc`, quad pairs whose corners ALL lie inside the disc footprint are
// skipped (the paved dot covers the junction by design).
function quadsOverlap(A, B, disc = null) {
  const quad = (r, i) => [r.L[i], r.L[i + 1], r.R[i + 1], r.R[i]];
  const covered = q => disc && q.every(p => Math.hypot(p[0] - disc.x, p[1] - disc.z) <= disc.r);
  for (let i = 0; i < A.cl.length - 1; i++) {
    const qa = quad(A, i);
    const abx = [Math.min(...qa.map(p => p[0])), Math.max(...qa.map(p => p[0]))];
    const abz = [Math.min(...qa.map(p => p[1])), Math.max(...qa.map(p => p[1]))];
    for (let j = 0; j < B.cl.length - 1; j++) {
      const qb = quad(B, j);
      if (covered(qa) && covered(qb)) continue;
      if (Math.min(...qb.map(p => p[0])) > abx[1] || Math.max(...qb.map(p => p[0])) < abx[0]) continue;
      if (Math.min(...qb.map(p => p[1])) > abz[1] || Math.max(...qb.map(p => p[1])) < abz[0]) continue;
      for (let e = 0; e < 4; e++) for (let f = 0; f < 4; f++)
        if (segsCross(qa[e], qa[(e + 1) % 4], qb[f], qb[(f + 1) % 4])) return [i, j];
      if (cross(qa[0], qa[1], qa[2]) !== 0 &&
        Math.sign(cross(qa[0], qa[1], qb[0])) === Math.sign(cross(qa[1], qa[2], qb[0])) &&
        Math.sign(cross(qa[1], qa[2], qb[0])) === Math.sign(cross(qa[2], qa[0], qb[0]))) return [i, j];   // qb inside qa
    }
  }
  return null;
}
for (const net of Object.values(nets)) {
  for (let a = 0; a < net.length; a++) for (let b = 0; b < net.length; b++) {
    if (a === b) continue;
    const A = net[a], B = net[b];
    for (const [endName, bIdx] of [['start', 0], ['end', B.cl.length - 1]]) {
      const P = B.cl[bIdx];
      const q = ptPoly(P, A.cl);
      const aAtEnd = q.i === 0 || q.i >= A.cl.length - 2;
      const aIdx = q.i === 0 ? 0 : A.cl.length - 1;
      const tag = `${A.id} x ${B.id}(${endName}) @ ${P[0].toFixed(1)},${P[1].toFixed(1)}`;
      if (aAtEnd && dist(P, A.cl[aIdx]) < 0.6) {
        buttCount++;
        // disc lookup by POSITION (not B.discStart): the meeting is visited
        // from BOTH directions (A x B and B x A) and the disc flag lives on
        // only one of the pair — the paved dot covers the junction either way.
        const disc = DISCS.find(d => Math.hypot(d.x - P[0], d.z - P[1]) < 0.01);
        if (disc) {
          // DISC junction (hard kink): natural caps under a paved dot. The dot
          // must COVER the junction: all four cap corners inside r - 0.4, and
          // quad overlaps are allowed only inside the dot's footprint.
          expect(`${tag}: joint shared under the disc (${dist(P, A.cl[aIdx]).toFixed(3)} m <= 0.05)`, dist(P, A.cl[aIdx]) > 0.05 ? 1 : 0, 0);
          const corners = [A.L[aIdx], A.R[aIdx], B.L[bIdx], B.R[bIdx]];
          const reach = Math.max(...corners.map(c => Math.hypot(c[0] - disc.x, c[1] - disc.z)));
          expect(`${tag}: disc covers the junction (reach ${reach.toFixed(2)} <= r ${disc.r.toFixed(2)} - 0.4)`, reach > disc.r - 0.4 ? 1 : 0, 0);
          if (Math.abs(A.y - B.y) < 0.006) {
            const ov = quadsOverlap(A, B, disc);
            expect(`${tag}: no quad-area overlap OUTSIDE the disc${ov ? ` (quads ${ov[0]}x${ov[1]})` : ''}`, ov ? 1 : 0, 0);
          }
        } else {
          // BUTT join (declared continuation): seam edges must coincide post-miter
          const caps = [
            Math.min(dist(A.L[aIdx], B.L[bIdx]), dist(A.L[aIdx], B.R[bIdx])),
            Math.min(dist(A.R[aIdx], B.R[bIdx]), dist(A.R[aIdx], B.L[bIdx])),
          ];
          expect(`${tag}: BUTT seam edges coincide (worst cap ${Math.max(...caps).toFixed(3)} m <= 0.05)`, Math.max(...caps) > 0.05 ? 1 : 0, 0);
          // no quad-area overlap anywhere between the two (same-y double paving)
          if (Math.abs(A.y - B.y) < 0.006) {
            const ov = quadsOverlap(A, B);
            expect(`${tag}: no quad-area overlap${ov ? ` (quads ${ov[0]}x${ov[1]})` : ''}`, ov ? 1 : 0, 0);
          }
        }
      } else if (!aAtEnd && q.d < (A.w + B.w) / 2 - 0.15) {
        // T merge (endpoint INSIDE the host strip): no near-parallel double-pave
        let run = 0, worst = 0, worstAt = '';
        for (let s = 0; s < B.cl.length - 1; s++) {
          const mid = [(B.cl[s][0] + B.cl[s + 1][0]) / 2, (B.cl[s][1] + B.cl[s + 1][1]) / 2];
          const qq = ptPoly(mid, A.cl);
          if (qq.d < (A.w + B.w) / 2 - 0.15) {
            const dB = dirOf(B.cl[s], B.cl[s + 1]);
            const dA = dirOf(A.cl[qq.i], A.cl[qq.i + 1]);
            const ang = Math.acos(Math.min(1, Math.abs(dB[0] * dA[0] + dB[1] * dA[1]))) * 180 / Math.PI;
            if (ang < 20) { run++; if (run > worst) { worst = run; worstAt = ` st${s}`; } }
            else run = 0;
          } else run = 0;
        }
        expect(`${tag}: no near-parallel double-pave (${worst} consecutive <20 deg${worstAt})`, worst >= 3 ? 1 : 0, 0);
      }
    }
  }
}
expect(`butt joins detected (sanity: the declared joins exist)`, buttCount >= 3, true);
// WELDS: closed outlines (loop, sanctuary) — mitered weld corners coincide,
// or (hard kink) a paved dot covers the weld
console.log('--- welds: closed-outline seams ---');
for (const r of R) {
  const n = r.n;
  if (dist(r.cl[0], r.cl[n]) > 0.02) continue;
  if (r.discWeld) {
    const disc = DISCS.find(d => Math.hypot(d.x - r.cl[n][0], d.z - r.cl[n][1]) < 0.01);
    expect(`${r.id}: weld covered by a junction dot`, disc ? 0 : 1, 0);
    continue;
  }
  const caps = [
    Math.min(dist(r.L[0], r.L[n]), dist(r.L[0], r.R[n])),
    Math.min(dist(r.R[0], r.R[n]), dist(r.R[0], r.L[n])),
  ];
  expect(`${r.id}: weld seam edges coincide (worst cap ${Math.max(...caps).toFixed(3)} m <= 0.05)`, Math.max(...caps) > 0.05 ? 1 : 0, 0);
  expect(`${r.id}: weld is mitered in paths.js (welded flag)`, r.welded ? 0 : 1, 0);
}

// ---- 3. DASH RHYTHM ---------------------------------------------------------
// paths.js (102): dashes placed by ARC LENGTH along each curve, and a curve
// that continues the previous one (shares its exact endpoint — MAIN->MONTROSE)
// keeps the dash PHASE across the seam. Assert the rhythm: no two dashes
// anywhere nearer than spacing/2 (a seam doubling), and the cross-seam gap
// lands within the normal spacing window.
console.log('--- dashes: network-phase paint rhythm ---');
{
  // r128 getUtoTmapping mirror: arc-length s -> [point, curve parameter t]
  function pointAtArc(ctrl, s) {
    const cache = [0]; let sum = 0, last = crPoint(ctrl, 0);
    for (let i = 1; i <= 200; i++) { const p = crPoint(ctrl, i / 200); sum += Math.hypot(p[0] - last[0], p[1] - last[1]); cache.push(sum); last = p; }
    let i = 1; while (i < 200 && cache[i] < s) i++;
    const c0 = cache[i - 1], c1 = cache[i];
    const w = c1 === c0 ? 0 : (s - c0) / (c1 - c0);
    const t = (i - 1 + w) / 200;
    return [crPoint(ctrl, t), t];
  }
  const series = [];
  let carry = null, prevEnd = null;
  // ORDER mirrors paths.js: montrose directly AFTER main (the carry compares
  // each curve's start against the PREVIOUS entry's end).
  for (const [name, ctrl] of [['main', CH.TRAIL_MAIN], ['mtr', CH.TRAIL_MONTROSE], ['spur', CH.TRAIL_SPUR]]) {
    const L = crLength(ctrl);
    const cont = carry !== null && dist(crPoint(ctrl, 0), prevEnd) < 1e-3;
    const s0 = cont ? st.dash.spacing - carry : st.dash.spacing / 2;
    let last = -1;
    for (let s = s0; s < L; s += st.dash.spacing) {
      const [p, t] = pointAtArc(ctrl, s);
      const tg = crTangent(ctrl, t);
      series.push({ name, p, s, rot: Math.atan2(tg[0], tg[1]) }); last = s;
    }
    carry = last < 0 ? (cont ? carry : 0) + L : L - last; prevEnd = crPoint(ctrl, 1);
  }
  // a seam DOUBLING is a near pair on nearly the same heading (collinear paint);
  // a fork's dashes cross at a real angle on different ribbons — not a defect.
  let dbl = 0, at = '';
  for (let i = 0; i < series.length; i++) for (let j = i + 1; j < series.length; j++) {
    if (series[i].name === series[j].name) continue;
    if (dist(series[i].p, series[j].p) >= st.dash.spacing / 2) continue;
    let dr = Math.abs(series[i].rot - series[j].rot) % Math.PI;
    if (dr > Math.PI / 2) dr = Math.PI - dr;
    if (dr < 25 * Math.PI / 180) { dbl++; at = ` ${series[i].name}@${series[i].p[0].toFixed(1)},${series[i].p[1].toFixed(1)}`; }
  }
  expect(`no collinear cross-curve dash pair < ${(st.dash.spacing / 2).toFixed(1)} m${dbl ? ' (' + dbl + ')' + at : ''}`, dbl, 0);
  // the cross-seam MAIN->MONTROSE gap reads as a normal interval (0.5..1.5x spacing)
  const lastMain = series.filter(d => d.name === 'main').pop();
  const firstMtr = series.find(d => d.name === 'mtr');
  const seamGap = dist(lastMain.p, firstMtr.p);
  expect(`MAIN->MONTROSE dash gap across the seam ${seamGap.toFixed(2)} m in [1.4, 4.2]`,
    (seamGap < st.dash.spacing / 2 || seamGap > st.dash.spacing * 1.5) ? seamGap.toFixed(2) : 0, 0);
}

console.log(`\n==== path-continuity: ${pass} passed, ${fail} failed ====`);
if (fails.length && !REPORT) console.log('failures:\n  ' + fails.join('\n  '));
process.exit(fail ? 1 : 0);
