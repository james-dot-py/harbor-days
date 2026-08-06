// tmp-132-cmp — is the converted kite flight the SAME flight? Resamples both
// tmp-132-kitecam traces onto a common launch-relative time grid and reports the
// worst camera position delta (m) and aim delta (deg / px at the live fov) per
// phase. Position is power-independent (the framing point is a constant), so it
// must match tightly; the AIM rides the kite column, so it carries the small
// launch-power difference between the two runs — reported alongside.
// The mid-ease phases move at tens of m/s, so a nearest-sample grid is worth
// metres of pure alignment error: samples are INTERPOLATED between the two
// bracketing frames, and the run-to-run NOISE FLOOR is measured by diffing two
// same-code runs (`node tools/tmp-132-cmp.mjs after after2`).
//
// A FIXED tolerance cannot judge the transients: measured here, two runs of the
// SAME code differ by up to 2.3 m mid-release purely from which frame processed
// the keyup, so any constant tight enough to catch a real regression is one the
// noise floor blows through on its own. Pass a floor pair and each phase is
// judged against ITS OWN measured same-code spread instead:
//   node tools/tmp-132-cmp.mjs before2 after --floor after after2
// The STEADY phases (pre-launch / aloft / reel-in / post) hold still in both
// worlds and are still judged on the tight constant — that is where a camera
// fight would actually show up.
//   node tools/tmp-132-cmp.mjs [labelA] [labelB] [--floor labelC labelD]
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const fi = argv.indexOf('--floor');
const FLOOR = fi >= 0 ? argv.slice(fi + 1, fi + 3) : null;
const pos = fi >= 0 ? argv.slice(0, fi) : argv;
const LA = pos[0] || 'before', LB = pos[1] || 'after';
const trace = L => JSON.parse(readFileSync(join(here, `tmp-132-trace-${L}.json`), 'utf8'));
const A = trace(LA), B = trace(LB);

const rel = T => T.samples.map(s => ({ ...s, r: s.t - T.marks.launch })).filter(s => s.r >= -200);
const at = (S, r) => {                        // linear interpolation at a launch-relative ms
  if (r <= S[0].r || r >= S[S.length - 1].r) return null;
  let i = 1; while (i < S.length && S[i].r < r) i++;
  const a = S[i - 1], b = S[i], u = (r - a.r) / Math.max(1e-6, b.r - a.r);
  const L = (p, q) => p + (q - p) * u;
  const o = { x: L(a.x, b.x), y: L(a.y, b.y), z: L(a.z, b.z), fov: L(a.fov, b.fov) };
  const dot = a.qx * b.qx + a.qy * b.qy + a.qz * b.qz + a.qw * b.qw, s = dot < 0 ? -1 : 1;
  const q = [L(a.qx, s * b.qx), L(a.qy, s * b.qy), L(a.qz, s * b.qz), L(a.qw, s * b.qw)];
  const n = Math.hypot(...q) || 1;
  o.qx = q[0] / n; o.qy = q[1] / n; o.qz = q[2] / n; o.qw = q[3] / n;
  return o;
};
const qang = (a, b) => { const d = Math.abs(a.qx * b.qx + a.qy * b.qy + a.qz * b.qz + a.qw * b.qw); return 2 * Math.acos(Math.min(1, d)); };
const POS_TOL = 0.05, AIM_PX_TOL = 6;

const SA = rel(A), SB = rel(B);
const reelA = A.marks.reel - A.marks.launch, reelB = B.marks.reel - B.marks.launch;
console.log(`${LA.padEnd(7)}: power ${A.power}%  owner-aloft ${A.heldOwn}  reel@${reelA.toFixed(0)}ms  ${SA.length} samples`);
console.log(`${LB.padEnd(7)}: power ${B.power}%  owner-aloft ${B.heldOwn}  reel@${reelB.toFixed(0)}ms  ${SB.length} samples`);
console.log(`(reel marks differ by ${Math.abs(reelA - reelB).toFixed(0)} ms — the post-reel grid is aligned on the REEL mark)`);

function sweep(name, from, to, step, offA, offB, sa = SA, sb = SB, quiet = false) {
  let mp = 0, ma = 0, n = 0, worst = 0;
  for (let r = from; r <= to; r += step) {
    const a = at(sa, r + offA), b = at(sb, r + offB);
    if (!a || !b) continue;
    n++;
    const dp = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    const da = qang(a, b);
    if (dp > mp) { mp = dp; }
    if (da > ma) { ma = da; worst = r; }
  }
  const fov = 50, px = ma / (fov * Math.PI / 180) * 720;
  if (!quiet) console.log(`${name.padEnd(24)} n=${String(n).padStart(3)}  max d-pos ${mp.toFixed(4)} m   max d-aim ${(ma * 180 / Math.PI).toFixed(3)} deg (${px.toFixed(1)} px @fov50, worst t=${worst}ms)`);
  return { name, mp, ma, px };
}
// the same six phases for any pair of traces (used for the measured noise floor)
function sixPhases(sa, sb, ra, rb, quiet) {
  return {
    pre:  sweep('pre-launch (chase)', -200, -20, 20, 0, 0, sa, sb, quiet),
    asc:  sweep('ascend  L+0.1..2.0s', 100, 2000, 50, 0, 0, sa, sb, quiet),
    alo:  sweep('aloft   L+2.2..' + ((ra - 100) / 1000).toFixed(1) + 's', 2200, ra - 100, 50, 0, 0, sa, sb, quiet),
    rl:   sweep('reel    R+0.05..1.0s', 50, 1000, 50, ra, rb, sa, sb, quiet),
    rel2: sweep('release R+1.05..1.9s', 1050, 1900, 50, ra, rb, sa, sb, quiet),
    post: sweep('post    R+2.2..2.8s', 2200, 2800, 50, ra, rb, sa, sb, quiet),
  };
}

console.log('');
const P = sixPhases(SA, SB, reelA, reelB, false);
const { pre, asc, alo, rl, rel2, post } = P;

// The ascend/release eases run at tens of m/s, so a few ms of difference in WHICH
// FRAME the game processed the keyup is worth metres — and that jitter exists
// between two runs of the same code. Detect the real session start (first frame
// the camera leaves the chase pos) and re-diff the ease on a best-fit time shift:
// if a small shift collapses the curves, the TRAJECTORY is the same and only the
// launch instant moved.
const startOf = S => { const p0 = S.find(s => s.r > -150); for (const s of S) if (s.r > -150 && Math.hypot(s.x - p0.x, s.y - p0.y, s.z - p0.z) > 0.01) return s.r; return null; };
console.log(`\nsession start (camera leaves the chase pos): ${LA} L+${startOf(SA)}ms   ${LB} L+${startOf(SB)}ms`);
function bestShift(name, from, to, offA, offB) {
  let best = { d: 1e9, tau: 0 };
  for (let tau = -150; tau <= 150; tau += 2) {
    let m = 0;
    for (let r = from; r <= to; r += 10) {
      const a = at(SA, r + offA), b = at(SB, r + offB + tau);
      if (!a || !b) { m = 1e9; break; }
      m = Math.max(m, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z));
    }
    if (m < best.d) best = { d: m, tau };
  }
  let ma = 0;
  for (let r = from; r <= to; r += 10) {
    const a = at(SA, r + offA), b = at(SB, r + offB + best.tau);
    if (a && b) ma = Math.max(ma, qang(a, b));
  }
  console.log(`${name.padEnd(24)} best shift ${String(best.tau).padStart(4)} ms -> residual max d-pos ${best.d.toFixed(4)} m, d-aim ${(ma * 180 / Math.PI).toFixed(3)} deg (${(ma / (50 * Math.PI / 180) * 720).toFixed(1)} px)`);
  return best;
}
bestShift('ascend  L+0.1..2.0s', 100, 2000, 0, 0);
bestShift('release R+1.05..1.9s', 1050, 1900, reelA, reelB);

const fovA = SA.filter(s => s.r > 200 && s.r < reelA).map(s => s.fov);
const fovB = SB.filter(s => s.r > 200 && s.r < reelB).map(s => s.fov);
const rng = a => `${Math.min(...a).toFixed(3)}..${Math.max(...a).toFixed(3)}`;
console.log(`\nfov during flight   ${LA} ${rng(fovA)}   ${LB} ${rng(fovB)}`);

// ---- verdict ----
// STEADY phases (the camera is parked: pre-launch chase, settled aloft, the
// reel-in hold, post-release chase) must match on the tight constant — a second
// writer or a fight shows up HERE, as jitter, at any timing.
// TRANSIENT phases (ascend, release ease) are judged against the measured
// same-code floor when a --floor pair is supplied; without one they are only
// reported, because a fixed constant cannot tell a regression from frame jitter.
const STEADY = ['pre', 'alo', 'rl', 'post'], TRANS = ['asc', 'rel2'];
let floor = null;
if (FLOOR) {
  const [FA, FB] = FLOOR.map(trace);
  floor = sixPhases(rel(FA), rel(FB), FA.marks.reel - FA.marks.launch, FB.marks.reel - FB.marks.launch, true);
  console.log(`\nnoise floor (same code, ${FLOOR[0]} vs ${FLOOR[1]}):`);
  for (const k of TRANS) console.log(`${floor[k].name.padEnd(24)} floor d-pos ${floor[k].mp.toFixed(4)} m / d-aim ${floor[k].px.toFixed(1)} px   this pair ${P[k].mp.toFixed(4)} m / ${P[k].px.toFixed(1)} px`);
}
const bad = [];
for (const k of STEADY) if (P[k].mp > POS_TOL || P[k].px > AIM_PX_TOL)
  bad.push(`${P[k].name.trim()} (steady: ${P[k].mp.toFixed(4)} m / ${P[k].px.toFixed(1)} px vs tol ${POS_TOL} m / ${AIM_PX_TOL} px)`);
if (floor) for (const k of TRANS) {
  const fp = Math.max(floor[k].mp, POS_TOL), fa = Math.max(floor[k].px, AIM_PX_TOL);
  if (P[k].mp > fp || P[k].px > fa)
    bad.push(`${P[k].name.trim()} (transient: ${P[k].mp.toFixed(4)} m / ${P[k].px.toFixed(1)} px EXCEEDS the same-code floor ${fp.toFixed(4)} m / ${fa.toFixed(1)} px)`);
}
console.log(bad.length
  ? `\n${bad.length} PHASE(S) DIFFER:\n  ` + bad.join('\n  ')
  : floor
    ? `\nFLIGHT IDENTICAL — every steady phase within ${POS_TOL} m / ${AIM_PX_TOL} px, and both transients at or below the same-code noise floor.`
    : `\nSteady phases within tol; transients reported only (pass --floor <labelC> <labelD> to judge them).`);
process.exit(bad.length ? 1 : 0);
