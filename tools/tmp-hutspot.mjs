import * as M from '../src/data/millennium.js';
const L = M.RIBBON_M.loop, N = 65, U = L.slice(0, N);
function inLoop(x, z) {
  let c = false;
  for (let i = 0, j = N - 1; i < N; j = i++) {
    const [xi, zi] = U[i], [xj, zj] = U[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c;
  }
  return c;
}
function rectClearance(x0, x1, z0, z1) {
  let best = Infinity;
  for (let i = 0; i < N; i++) {
    const a = U[i], b = U[(i + 1) % N];
    const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.25);
    for (let s = 0; s <= steps; s++) {
      const px = a[0] + (b[0] - a[0]) * s / steps, pz = a[1] + (b[1] - a[1]) * s / steps;
      const ddx = px < x0 ? x0 - px : px > x1 ? px - x1 : 0;
      const ddz = pz < z0 ? z0 - pz : pz > z1 ? pz - z1 : 0;
      best = Math.min(best, Math.hypot(ddx, ddz));
    }
  }
  return best;
}
let best = null;
for (let x = 227; x <= 235; x += 0.25) for (let z = 757; z <= 764; z += 0.25) {
  const cs = [[x - 2.25, z - 1.85], [x + 2.25, z - 1.85], [x - 2.25, z + 1.85], [x + 2.25, z + 1.85]];
  if (!cs.every(([px, pz]) => inLoop(px, pz))) continue;
  const d = rectClearance(x - 2.25, x + 2.25, z - 1.85, z + 1.85);
  if (!best || d > best.d) best = { x, z, d };
}
console.log('best hut spot:', best);
