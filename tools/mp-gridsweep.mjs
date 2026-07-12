// MILLENNIUM PARK — walkability HOLE sweep (issue 017, task 048 item 0a).
// Samples the whole cell on a 2 m grid and flags INTERIOR holes: a non-walkable
// cell that is surrounded by walkable neighbours (i.e. reads as a gap in the
// pavement/lawn, not an intended planting bed / road / building edge along the
// cell boundary). Also reports the two owner-reported coords explicitly and the
// worst adjacent elevation step (the elevator guard). Pure JS — imports the same
// walkableM/surfaceYM the engine uses.
import * as MP from '../src/data/millennium.js';

const STEP = 2;
// Sweep the FULL Grant-expansion box (task 057): pre-flip the staged area is
// uniformly non-walkable (zero holes by construction); once builders flip
// OPEN_GRANT flags the same sweep audits the real net.
const C = MP.CLAMP_FULL_M || MP.CLAMP_M;
const xs = [], zs = [];
for (let x = Math.floor(C.xMin); x <= Math.ceil(C.xMax); x += STEP) xs.push(x);
for (let z = Math.floor(C.zMin); z <= Math.ceil(C.zMax); z += STEP) zs.push(z);

const W = xs.length, H = zs.length;
const walk = (gx, gz) => (gx < 0 || gz < 0 || gx >= W || gz >= H) ? false : MP.walkableM(xs[gx], zs[gz]);

// An interior hole: NOT walkable, but >= T of its 8 neighbours ARE walkable.
// A genuine pavement gap is nearly ringed by walkable ground; an intended
// non-walkable region (planting/road/building) borders lots of non-walkable.
const N8 = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const holes = [];
for (let gz = 0; gz < H; gz++) for (let gx = 0; gx < W; gx++) {
  if (walk(gx, gz)) continue;
  let n = 0; for (const [dx, dz] of N8) if (walk(gx + dx, gz + dz)) n++;
  if (n >= 6) holes.push({ x: xs[gx], z: zs[gz], n });   // >=6/8 walkable ring = suspicious gap
}

console.log(`=== Millennium walkability hole sweep (${STEP} m grid, ${W}x${H} cells) ===`);
console.log(`interior holes (non-walkable cell with >=6/8 walkable neighbours): ${holes.length}`);
for (const h of holes) console.log(`  HOLE (${h.x}, ${h.z})  ${h.n}/8 walkable neighbours`);

// Owner-reported coords — after the main.js class guard these must be BLOCKED
// (not walkable) but must never be able to reach the water fallback. Here we
// just report their walkable state + whether they sit in an intended region.
console.log('\n=== owner-reported coords ===');
for (const [label, x, z] of [
  ['jetski-fallback hole', 168.0, 866.0],
  ['Pritzker stage fall-through', 144.7, 758.0],
  ['invisible rill bench', 155.8, 864.7],
]) {
  console.log(`  ${label} (${x}, ${z}) walkableM=${MP.walkableM(x, z)} surfaceYM=${MP.surfaceYM(x, z).toFixed(2)}`);
}

// Worst adjacent elevation step across all walkable cells (elevator guard).
let worst = 0, worstAt = '';
for (let gz = 0; gz < H; gz++) for (let gx = 0; gx < W; gx++) {
  if (!walk(gx, gz)) continue;
  const y0 = MP.surfaceYM(xs[gx], zs[gz]);
  for (const [dx, dz] of [[1,0],[0,1]]) {
    if (!walk(gx + dx, gz + dz)) continue;
    const d = Math.abs(y0 - MP.surfaceYM(xs[gx + dx], zs[gz + dz]));
    if (d > worst) { worst = d; worstAt = `(${xs[gx]},${zs[gz]})`; }
  }
}
console.log(`\nworst adjacent elevation step: ${worst.toFixed(2)} at ${worstAt} (2 m grid; ramp ~0.42/2m ok)`);
console.log(holes.length ? `\nRESULT: ${holes.length} candidate hole(s) to review` : '\nRESULT: no interior holes');
process.exit(0);
