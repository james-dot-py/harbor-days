// 062 data-level verification: wall clearances, island coverage, band continuity.
import * as M from '../src/data/millennium.js';

const L = M.RIBBON_M.loop, HW = M.RIBBON_M.halfW;
const N = 65, U = L.slice(0, N);
let fails = 0;
const ok = (label, cond) => { console.log(`${cond ? 'ok ' : 'FAIL'} ${label}`); if (!cond) fails++; };

function distToLoop(x, z) {
  let best = Infinity;
  for (let i = 0; i < N; i++) {
    const a = U[i], b = U[(i + 1) % N];
    const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1;
    let t = ((x - a[0]) * dx + (z - a[1]) * dz) / L2;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t)));
  }
  return best;
}
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

console.log('--- 0a: wall envelopes vs ice band ---');
const OPTS = [
  { thick: 4.5, foldAmp: 0.85, bulge: 1.9, lean: 0.6 },
  { thick: 3.2, foldAmp: 0.7, bulge: 1.2, lean: -0.5 },
];
M.MAGGIE_M.walls.forEach((w, i) => {
  const cz = (w.z0 + w.z1) / 2, o = OPTS[i];
  const e = { x0: w.x0, x1: w.x1, z0: cz - o.foldAmp - o.thick - 0.35, z1: cz + o.foldAmp + o.bulge + Math.max(o.lean, 0) + 0.45 };
  const d = rectClearance(e.x0, e.x1, e.z0, e.z1);
  ok(`wall${i} envelope clearance ${d.toFixed(2)} >= ${(HW + 0.8).toFixed(1)}`, d >= HW + 0.8);
  // envelope fully inside the loop
  const cs = [[e.x0, e.z0], [e.x1, e.z0], [e.x0, e.z1], [e.x1, e.z1]];
  ok(`wall${i} envelope inside the loop`, cs.every(([px, pz]) => inLoop(px, pz)));
  // footprint sealed
  ok(`wall${i} footprint center NOT walkable`, !M.walkableM((w.x0 + w.x1) / 2, (w.z0 + w.z1) / 2));
});
console.log('--- 0a: x-masts clear the band ---');
for (const [mx, mz] of M.MAGGIE_M.xmasts)
  ok(`mast (${mx},${mz}) dist ${distToLoop(mx, mz).toFixed(2)} >= ${(HW + 0.55).toFixed(2)}`, distToLoop(mx, mz) >= HW + 0.55);

console.log('--- 0a: hut roof rect ---');
{ const h = M.MAGGIE_M.hut;
  const d = rectClearance(h.x - 2.25, h.x + 2.25, h.z - 1.85, h.z + 1.85);
  ok(`hut roof clearance ${d.toFixed(2)} >= ${HW.toFixed(1)} + 0.4`, d >= HW + 0.4); }

console.log('--- 0a: island interior coverage (walkable or wall or W-hairpin pocket) ---');
{ const holes = [];
  for (let x = 222; x <= 279; x += 0.5) for (let z = 731; z <= 771; z += 0.5) {
    if (!inLoop(x, z)) continue;
    if (M.walkableM(x, z)) continue;
    if (M.MAGGIE_M.walls.some(w => x >= w.x0 && x <= w.x1 && z >= w.z0 && z <= w.z1)) continue;
    if (x < 246.5) continue;                     // the W-hairpin planted pocket (hut) — intentionally non-walk
    holes.push([x, z]);
  }
  ok(`no uncovered interior pockets east of the hut pocket (${holes.length})`, holes.length === 0);
  if (holes.length) console.log('   e.g.', holes.slice(0, 12).map(p => `(${p[0]},${p[1]})`).join(' '));
}

console.log('--- 0a: island rects never leak OUTSIDE the loop past the band (onto the planted rim) ---');
{ // keep in sync with MAGGIE_WALK island rects
  const rects = [
    [249, 274.5, 736.5, 745], [246, 254, 745, 751], [266, 273.5, 745, 751],
    [243.5, 271.5, 751, 758], [255.5, 263, 758, 767], [243.5, 256.5, 758, 760.5],
    [270, 274.5, 751, 767], [273.5, 276, 753, 763], [263, 270, 763, 768],
  ];
  const leaks = [];
  for (const [x0, x1, z0, z1] of rects)
    for (let x = x0; x <= x1; x += 0.5) for (let z = z0; z <= z1; z += 0.5)
      if (!inLoop(x, z) && distToLoop(x, z) > HW + 0.01) leaks.push([x, z]);
  ok(`island rects stay inside loop+band (${leaks.length} leaks)`, leaks.length === 0);
  if (leaks.length) console.log('   e.g.', leaks.slice(0, 10).map(p => `(${p[0]},${p[1]})`).join(' '));
}

console.log('--- 0b: BP band continuously walkable (centerline + outer lanes) ---');
{ let bad = 0, ybad = 0, prevY = null;
  for (let i = 0; i < M.BP_DECK_PTS.length; i++) {
    const p = M.BP_DECK_PTS[i];
    if (!M.walkableM(p[0], p[1])) { bad++; console.log('   centerline NOT walkable at', p); }
    const y = M.surfaceYM(p[0], p[1]);
    if (prevY !== null && Math.abs(y - prevY) > 0.35) { ybad++; console.log(`   y jump ${prevY.toFixed(2)}->${y.toFixed(2)} at`, p); }
    prevY = y;
    // lateral lanes at +/-1.9 (inside hw 2.35): the wedge-sliver regression test
    if (i > 0) {
      const q = M.BP_DECK_PTS[i - 1];
      let tx = p[0] - q[0], tz = p[1] - q[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      for (const s of [1.9, -1.9])
        if (!M.walkableM(p[0] - tz * s, p[1] + tx * s)) { bad++; console.log(`   lane ${s} NOT walkable at`, p); }
    }
  }
  ok(`BP band: 0 unwalkable samples (${bad})`, bad === 0);
  ok(`BP band: 0 y jumps > 0.35 (${ybad})`, ybad === 0);
}
console.log('--- 0b: Nichols band continuously walkable ---');
{ let bad = 0;
  for (let i = 1; i < M.NICHOLS_DECK_PTS.length; i++) {
    const p = M.NICHOLS_DECK_PTS[i], q = M.NICHOLS_DECK_PTS[i - 1];
    let tx = p[0] - q[0], tz = p[1] - q[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    for (const s of [0, 1.0, -1.0])
      if (!M.walkableM(p[0] - tz * s, p[1] + tx * s)) { bad++; console.log(`   lane ${s} NOT walkable at`, p); }
    // y pinned to node lerp (never floats off the visible deck)
  }
  ok(`Nichols band: 0 unwalkable samples (${bad})`, bad === 0);
}
console.log('--- catmullChain vs THREE parity spot-check (hand Hermite) ---');
{ // segment 12->13 of BP at t=0.5: compute by hand with the same formula
  const nd = M.BP_CROSSING_M.nodes, i = 12, T = 0.5, t = 0.5;
  const p0 = nd[11], p1 = nd[12], p2 = nd[13], p3 = nd[14], out = [];
  for (let c = 0; c < 3; c++) {
    const m1 = T * (p2[c] - p0[c]), m2 = T * (p3[c] - p1[c]);
    out[c] = p1[c] + m1 * t + (-3 * p1[c] + 3 * p2[c] - 2 * m1 - m2) * t * t + (2 * p1[c] - 2 * p2[c] + m1 + m2) * t * t * t;
  }
  const s = M.BP_DECK_PTS[12 * 6 + 3];
  ok(`sample[75] matches hand Hermite (${s.map(v => v.toFixed(3))} vs ${out.map(v => v.toFixed(3))})`,
     Math.abs(s[0] - out[0]) < 1e-9 && Math.abs(s[1] - out[1]) < 1e-9);
}
console.log(fails ? `\n${fails} FAILURES` : '\nALL GREEN');
process.exit(fails ? 1 : 0);
