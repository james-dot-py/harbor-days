// 062/0a analysis: ribbon ice band vs climbing walls / rocks / masts / hut.
// The ice band = RIBBON_M.loop centerline +/- halfW (2.7). Walls must be
// ISLANDS the ribbon loops around, with a rail/curb margin.
import * as M from '../src/data/millennium.js';

const L = M.RIBBON_M.loop, HW = M.RIBBON_M.halfW;
const N = 65, U = L.slice(0, N);

// min distance from point to the closed centerline polyline
function distToLoop(x, z) {
  let best = Infinity, bi = -1, bt = 0;
  for (let i = 0; i < N; i++) {
    const a = U[i], b = U[(i + 1) % N];
    const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1;
    let t = ((x - a[0]) * dx + (z - a[1]) * dz) / L2;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t));
    if (d < best) { best = d; bi = i; bt = t; }
  }
  return { d: best, i: bi, t: bt };
}
// point in closed loop polygon
function inLoop(x, z) {
  let c = false;
  for (let i = 0, j = N - 1; i < N; j = i++) {
    const [xi, zi] = U[i], [xj, zj] = U[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c;
  }
  return c;
}
// min distance from an axis-aligned rect to the loop centerline (sampled loop)
function rectClearance(x0, x1, z0, z1) {
  let best = Infinity, at = null;
  for (let i = 0; i < N; i++) {
    const a = U[i], b = U[(i + 1) % N];
    const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.25);
    for (let s = 0; s <= steps; s++) {
      const px = a[0] + (b[0] - a[0]) * s / steps, pz = a[1] + (b[1] - a[1]) * s / steps;
      const ddx = px < x0 ? x0 - px : px > x1 ? px - x1 : 0;
      const ddz = pz < z0 ? z0 - pz : pz > z1 ? pz - z1 : 0;
      const d = Math.hypot(ddx, ddz);
      if (d < best) { best = d; at = [px.toFixed(1), pz.toFixed(1)]; }
    }
  }
  return { d: best, at };
}

// ---- wall shell envelopes (climbWall opts, maggie.js) ----
const OPTS = [
  { thick: 4.5, foldAmp: 0.85, bulge: 1.9, lean: 0.6 },
  { thick: 3.2, foldAmp: 0.7, bulge: 1.2, lean: -0.5 },
];
function envelope(fp, o) {
  const cz = (fp.z0 + fp.z1) / 2;
  return { x0: fp.x0, x1: fp.x1,
           z0: cz - o.foldAmp - o.thick - 0.35,
           z1: cz + o.foldAmp + o.bulge + Math.max(o.lean, 0) + 0.45 }; // +holds
}

console.log('=== CURRENT WALLS vs ICE BAND (need >= ' + (HW + 1.0).toFixed(1) + ' incl 1.0 margin) ===');
M.MAGGIE_M.walls.forEach((w, i) => {
  const e = envelope(w, OPTS[i]);
  const r = rectClearance(e.x0, e.x1, e.z0, e.z1);
  console.log(`wall${i} rect x${w.x0}-${w.x1} z${w.z0}-${w.z1} env z${e.z0.toFixed(1)}-${e.z1.toFixed(1)}: clearance ${r.d.toFixed(2)} at loop pt (${r.at})  ${r.d < HW ? '<<< ICE OVERLAP' : r.d < HW + 1.0 ? '< margin' : 'ok'}`);
});

console.log('\n=== X-MASTS ===');
for (const [mx, mz] of M.MAGGIE_M.xmasts) {
  const r = distToLoop(mx, mz);
  console.log(`mast (${mx},${mz}): dist ${r.d.toFixed(2)} ${r.d < HW + 0.6 ? '<<< ON/NEAR ICE (band ' + HW + ' + pole)' : 'ok'} inLoop=${inLoop(mx, mz)}`);
}

console.log('\n=== INTERIOR ROCK ISLANDS (maggie.js hardcoded) ===');
for (const [ix, iz] of [[231, 748], [269, 743], [272, 766], [238, 762], [263, 749]]) {
  const r = distToLoop(ix, iz);
  console.log(`island (${ix},${iz}): dist ${r.d.toFixed(2)} (rock r up to 1.5) ${r.d < HW + 1.5 ? '<<< OVERLAP RISK' : 'ok'} inLoop=${inLoop(ix, iz)}`);
}

console.log('\n=== HUT (232,762) r~3.4 ===');
{ const r = distToLoop(232, 762);
  console.log(`hut: dist ${r.d.toFixed(2)} need >= ${(HW + 2.6).toFixed(1)} (half-diag+margin): ${r.d < HW + 2.6 ? 'TIGHT/overlap' : 'ok'}`); }

// ---- outer-rim rock exposure: centroid-radial vs true normal --------------
let cx = 0, cz = 0; for (const p of U) { cx += p[0]; cz += p[1]; } cx /= N; cz /= N;
console.log(`\ncentroid: (${cx.toFixed(1)}, ${cz.toFixed(1)})`);
console.log('=== OUTER-RIM ROCK SCATTER (every 2nd vert, d = HW+1.4..HW+3.6 along centroid-radial) ===');
let bad = 0;
for (let i = 0; i < N; i += 2) {
  const p = U[i]; let ox = p[0] - cx, oz = p[1] - cz; const l = Math.hypot(ox, oz) || 1; ox /= l; oz /= l;
  for (const d of [HW + 1.4, HW + 2.5, HW + 3.6]) {
    const rx = p[0] + ox * d, rz = p[1] + oz * d;
    const r = distToLoop(rx, rz);
    if (r.d < HW + 0.9) { bad++; console.log(`  vert ${i} (${p[0]},${p[1]}) d=${d.toFixed(1)} -> rock at (${rx.toFixed(1)},${rz.toFixed(1)}) dist ${r.d.toFixed(2)} ${r.d < HW ? 'ON ICE' : 'kisses rail'} inLoop=${inLoop(rx, rz)}`); }
  }
}
console.log(`outer-rim offenders: ${bad}`);

// ---- placement search for the two walls (envelope-based) ------------------
console.log('\n=== PLACEMENT SEARCH (envelope clearance >= ' + (HW + 1.0).toFixed(1) + ', fully in-loop) ===');
function search(iw, sizes) {
  const o = OPTS[iw];
  const out = [];
  for (const [W, D] of sizes) {
    // envelope depth for footprint depth D: env spans depth-independent offsets
    for (let x = 220; x <= 280; x += 0.5) for (let z = 730; z <= 775; z += 0.5) {
      // candidate footprint centered (x,z): x0=x-W/2... envelope from cz=z
      const fp = { x0: x - W / 2, x1: x + W / 2, z0: z - D / 2, z1: z + D / 2 };
      const e = envelope(fp, o);
      // all envelope corners + edge midpoints must be in the loop
      const cs = [[e.x0, e.z0], [e.x1, e.z0], [e.x0, e.z1], [e.x1, e.z1],
                  [(e.x0 + e.x1) / 2, e.z0], [(e.x0 + e.x1) / 2, e.z1],
                  [e.x0, (e.z0 + e.z1) / 2], [e.x1, (e.z0 + e.z1) / 2],
                  [(e.x0 + e.x1) / 2, (e.z0 + e.z1) / 2]];
      if (!cs.every(([px, pz]) => inLoop(px, pz))) continue;
      const r = rectClearance(e.x0, e.x1, e.z0, e.z1);
      if (r.d >= HW + 1.0) out.push({ x, z, W, D, clr: r.d });
    }
  }
  out.sort((a, b) => b.clr - a.clr);
  console.log(`wall${iw}: ${out.length} candidates; best:`);
  for (const c of out.slice(0, 8))
    console.log(`  center (${c.x},${c.z}) fp ${c.W}x${c.D} -> x${(c.x - c.W / 2).toFixed(1)}-${(c.x + c.W / 2).toFixed(1)} z${(c.z - c.D / 2).toFixed(1)}-${(c.z + c.D / 2).toFixed(1)} clr ${c.clr.toFixed(2)}`);
  return out;
}
const s0 = search(0, [[16, 8], [14, 7], [12, 6]]);
const s1 = search(1, [[9.5, 7], [8, 6], [7, 5]]);

// pick a compatible pair (envelopes >= 3 apart)
console.log('\n=== COMPATIBLE PAIRS (best few) ===');
let found = 0;
outer:
for (const a of s0) {
  const ea = envelope({ x0: a.x - a.W / 2, x1: a.x + a.W / 2, z0: a.z - a.D / 2, z1: a.z + a.D / 2 }, OPTS[0]);
  for (const b of s1) {
    const eb = envelope({ x0: b.x - b.W / 2, x1: b.x + b.W / 2, z0: b.z - b.D / 2, z1: b.z + b.D / 2 }, OPTS[1]);
    const gapX = Math.max(ea.x0, eb.x0) - Math.min(ea.x1, eb.x1);
    const gapZ = Math.max(ea.z0, eb.z0) - Math.min(ea.z1, eb.z1);
    if (Math.max(-gapX, 0) > 0 && Math.max(-gapZ, 0) > 0) continue;      // overlap
    if (Math.max(gapX, gapZ) < 3) continue;                              // too close
    console.log(`  wall0 ${a.W}x${a.D} @(${a.x},${a.z}) clr ${a.clr.toFixed(2)} | wall1 ${b.W}x${b.D} @(${b.x},${b.z}) clr ${b.clr.toFixed(2)} | gap ${Math.max(gapX, gapZ).toFixed(1)}`);
    if (++found >= 6) break outer;
  }
}
if (!found) console.log('  NONE — need smaller footprints or relaxed margin');
