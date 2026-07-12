import * as M from '../src/data/millennium.js';
const L = M.RIBBON_M.loop, HW = M.RIBBON_M.halfW, N = 65, U = L.slice(0, N);
const pipU = (x, z) => { let c = false; for (let i = 0, j = N - 1; i < N; j = i++) { const xi = U[i][0], zi = U[i][1], xj = U[j][0], zj = U[j][1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const distToLoop = (x, z) => { let best = Infinity; for (let i = 0; i < N; i++) { const a = U[i], b = U[(i + 1) % N]; const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1; let t = ((x - a[0]) * dx + (z - a[1]) * dz) / L2; t = Math.max(0, Math.min(1, t)); best = Math.min(best, Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t))); } return best; };
const wallA = { x0: 254, x1: 266, z0: 745, z1: 751 }, wallB = { x0: 263, x1: 270, z0: 758, z1: 763 };
const rectClr = (x, z, r) => { const ddx = x < r.x0 ? r.x0 - x : x > r.x1 ? x - r.x1 : 0; const ddz = z < r.z0 ? r.z0 - z : z > r.z1 ? z - r.z1 : 0; return Math.hypot(ddx, ddz); };
const onPlaza = (x, z) => (x >= 246 && x <= 274.5 && z >= 736.5 && z <= 758) || (x >= 255.5 && x <= 276 && z >= 758 && z <= 767);
// 5 spread, non-overlapping target boxes; pick the max-min-clearance cell in each
const boxes = [
  ['NW', 248, 258, 737, 744], ['NE', 266, 274, 737, 744],
  ['W', 244, 251, 748, 758], ['E', 270, 276, 750, 758], ['S', 255, 264, 759, 766],
];
const chosen = [];
for (const [tag, x0, x1, z0, z1] of boxes) {
  let best = null, bs = -1;
  for (let x = x0; x <= x1; x += 0.5) for (let z = z0; z <= z1; z += 0.5) {
    if (!pipU(x, z) || !onPlaza(x, z)) continue;
    const dl = distToLoop(x, z), cA = rectClr(x, z, wallA), cB = rectClr(x, z, wallB);
    if (dl < 4.6 || cA < 1.5 || cB < 1.5) continue;
    const score = Math.min(dl - 4.6, cA - 1.5, cB - 1.5);   // maximize the tightest margin
    if (score > bs) { bs = score; best = [x, z, dl, cA, cB]; }
  }
  if (best) { chosen.push([best[0], best[1]]); console.log(`${tag}: [${best[0]},${best[1]}] dl=${best[2].toFixed(2)} wA=${best[3].toFixed(2)} wB=${best[4].toFixed(2)} minMargin=${bs.toFixed(2)}`); }
  else console.log(`${tag}: none`);
}
console.log('CHOSEN =', JSON.stringify(chosen));
