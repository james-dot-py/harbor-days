// tmp (062 / issue 022): replicate maggie.js section-C rockwork scatter EXACTLY
// (same LOCAL seed 0x4d414747 mulberry32, same call order up through the scatter
// blocks I changed) and assert every KEPT rock/shrub/island clears the ice loop
// centerline by its bound. Kept in sync BY HAND with src/millennium/maggie.js
// section C (maggie is a THREE module, won't import in node). Exit 1 on any
// violation. Prints worst clearance + how many rocks/shrubs the gates skipped.
import * as M from '../src/data/millennium.js';

// --- mulberry32 verbatim from src/core.js -------------------------------
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

const L = M.RIBBON_M.loop, HW = M.RIBBON_M.halfW;
const N = 65, U = L.slice(0, N);
const rnd = mulberry32(0x4d414747);
const rr = (a, b) => a + (b - a) * rnd();

// centroid (still computed in maggie though no longer used for the scatter dir)
let cx = 0, cz = 0; for (const p of U) { cx += p[0]; cz += p[1]; } cx /= N; cz /= N;

const nrm = i => {
  const a = U[(i - 1 + N) % N], b = U[(i + 1) % N];
  let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
  return [-tz, tx];
};
const pipU = (x, z) => { let c = false; for (let i = 0, j = N - 1; i < N; j = i++) { const xi = U[i][0], zi = U[i][1], xj = U[j][0], zj = U[j][1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const distToLoop = (x, z) => { let best = Infinity; for (let i = 0; i < N; i++) { const a = U[i], b = U[(i + 1) % N]; const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1; let t = ((x - a[0]) * dx + (z - a[1]) * dz) / L2; t = Math.max(0, Math.min(1, t)); best = Math.min(best, Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t))); } return best; };

let fails = 0, rockSkip = 0, shrubSkip = 0, worst = Infinity, worstWhat = '';
const note = (d, bound, what) => { const m = d - bound; if (m < worst) { worst = m; worstWhat = what; } if (d < bound - 1e-9) { fails++; console.log(`FAIL ${what} dist ${d.toFixed(3)} < bound ${bound.toFixed(3)}`); } };

// ===== outer-rim rock/shrub scatter (maggie section C) ==================
for (let i = 0; i < N; i++) {
  if (i % 2 !== 0) continue;
  // DRAW ALL randoms first (identical local-rng consumption regardless of gates)
  const dd = rr(0, 2.2), s = rr(0.55, 1.5), ry = rr(0, 6.28), sy = rr(0.6, 0.9);
  const isShrub = i % 4 === 0;
  const shY = isShrub ? rr(0, 6.28) : 0, shX2 = isShrub ? rr(1, 1.5) : 0, shY2 = isShrub ? rr(0.65, 0.95) : 0, shZ2 = isShrub ? rr(1, 1.5) : 0;
  void ry; void sy; void shY; void shX2; void shY2; void shZ2;
  const p = U[i];
  let [nx, nz] = nrm(i);
  if (pipU(p[0] + nx * 0.5, p[1] + nz * 0.5)) { nx = -nx; nz = -nz; }
  const d = HW + 1.4 + dd, rx = p[0] + nx * d, rz = p[1] + nz * d;
  if (distToLoop(rx, rz) >= HW + s + 0.4) note(distToLoop(rx, rz), HW + s + 0.4, `rock i=${i} (${rx.toFixed(1)},${rz.toFixed(1)})`);
  else rockSkip++;
  if (isShrub) {
    const sx = p[0] + nx * (d + 1.6), sz = p[1] + nz * (d + 1.6);
    if (distToLoop(sx, sz) >= HW + 1.8) note(distToLoop(sx, sz), HW + 1.8, `shrub i=${i} (${sx.toFixed(1)},${sz.toFixed(1)})`);
    else shrubSkip++;
  }
}

// ===== interior rock islands (maggie section C) =========================
const wallA = { x0: 254, x1: 266, z0: 745, z1: 751 }, wallB = { x0: 263, x1: 270, z0: 758, z1: 763 };
const rectClr = (x, z, r) => { const ddx = x < r.x0 ? r.x0 - x : x > r.x1 ? x - r.x1 : 0; const ddz = z < r.z0 ? r.z0 - z : z > r.z1 ? z - r.z1 : 0; return Math.hypot(ddx, ddz); };
const ISLANDS = [[255.5, 741], [266.5, 741.5], [251, 754], [270, 755], [260, 759]];
for (const [ix, iz] of ISLANDS) {
  const s = rr(0.7, 1.4); void rr(0, 6.28); void rr(0.6, 0.9);       // yaw + scale.y (kept for call-order parity)
  const dl = distToLoop(ix, iz), inside = pipU(ix, iz), cA = rectClr(ix, iz, wallA), cB = rectClr(ix, iz, wallB);
  note(dl, HW + 1.4 + 0.5, `island (${ix},${iz}) loop`);              // s_max=1.4 bound = 4.6
  if (!inside) { fails++; console.log(`FAIL island (${ix},${iz}) NOT inside loop`); }
  if (cA < 1.5 - 1e-9) { fails++; console.log(`FAIL island (${ix},${iz}) wallA clr ${cA.toFixed(2)} < 1.5`); }
  if (cB < 1.5 - 1e-9) { fails++; console.log(`FAIL island (${ix},${iz}) wallB clr ${cB.toFixed(2)} < 1.5`); }
  console.log(`island (${ix},${iz}) inside=${inside} distLoop=${dl.toFixed(2)} (>=4.6) wallA=${cA.toFixed(2)} wallB=${cB.toFixed(2)} (>=1.5) s=${s.toFixed(2)}`);
}

console.log(`\nworst kept clearance margin ${worst.toFixed(3)} m at ${worstWhat}`);
console.log(`rocks skipped by gate: ${rockSkip}  shrubs skipped: ${shrubSkip}`);
console.log(fails ? `\n${fails} VIOLATIONS` : '\nALL ROCKCHECK GREEN');
process.exit(fails ? 1 : 0);
