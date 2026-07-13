// MILLENNIUM PARK — walkability HOLE sweep (issue 017, task 048 item 0a).
// Samples the whole cell on a 2 m grid and flags INTERIOR holes: a non-walkable
// cell that is surrounded by walkable neighbours (i.e. reads as a gap in the
// pavement/lawn, not an intended planting bed / road / building edge along the
// cell boundary). Also reports the two owner-reported coords explicitly and the
// worst adjacent elevation step (the elevator guard). Pure JS — imports the same
// walkableM/surfaceYM the engine uses.
//
// BLESSED CANDIDATE CENSUS (task 062, walls-as-islands + BP/Nichols BANDS):
// the sweep reports 74 interior-hole candidates and every one is an INTENDED
// non-walk pocket, audited in 060 and re-audited in 062 — the rink/cafe rim
// set (x=58 column) blessed in 059; the Nichols slot ledge columns (x=116/
// 122 plus (124,922)) per the 057 walk contract; the BP-bridge flank buffers
// at (184,810/812), (180,832) and — shifted by the 062 band hw 2.35 —
// (232,792), (234,802); and ONE new cell (242,758): the mouth of the west-
// hairpin PLANTED pocket (the warming-hut lawn, intentionally non-walk —
// extending plaza further just moves the boundary cell westward into it).
// The "worst adjacent step 13.00 at (126,908)" is a 2 m-grid ARTIFACT: the
// grid straddles the 1.5 m non-walk strip between closed Monroe (y0) and the
// Bluhm terrace (y13) — no walkable 1 m path crosses that edge. Re-audit
// only holes that appear BEYOND this census.
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

// ============================ CONNECTIVITY (issue 025) =====================
// Flood-fill reachability from the cell SPAWN: EVERY walkable cell must be
// reachable, or it is a disconnected walkable ISLET — a hard-stuck trap in
// waiting (you can only get there by clipping in, then you can't leave). This
// catches the whole trap CLASS after any placement change. 4-connected (the
// engine moves x/z independently, so a diagonal corner-touch is NOT passable)
// on a 1 m grid (fine enough that a 3.2 m-wide bridge deck stays connected).
console.log('\n=== connectivity: flood-fill reachability from spawn (1 m grid, 4-conn) ===');
{
  const RS = 1;                                            // reachability grid step
  const rxs = [], rzs = [];
  for (let x = Math.floor(C.xMin); x <= Math.ceil(C.xMax); x += RS) rxs.push(x);
  for (let z = Math.floor(C.zMin); z <= Math.ceil(C.zMax); z += RS) rzs.push(z);
  const RW = rxs.length, RH = rzs.length;
  const rwalk = new Uint8Array(RW * RH);
  let total = 0;
  for (let gz = 0; gz < RH; gz++) for (let gx = 0; gx < RW; gx++)
    if (MP.walkableM(rxs[gx], rzs[gz])) { rwalk[gz * RW + gx] = 1; total++; }
  const sgx = Math.round(MP.SPAWN_M.x) - rxs[0], sgz = Math.round(MP.SPAWN_M.z) - rzs[0];
  const seen = new Uint8Array(RW * RH), stack = [];
  if (rwalk[sgz * RW + sgx]) { seen[sgz * RW + sgx] = 1; stack.push(sgz * RW + sgx); }
  let reach = 0;
  while (stack.length) {
    const i = stack.pop(); reach++;
    const gx = i % RW, gz = (i - gx) / RW;
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = gx + dx, nz = gz + dz;
      if (nx < 0 || nz < 0 || nx >= RW || nz >= RH) continue;
      const j = nz * RW + nx;
      if (rwalk[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
    }
  }
  const islets = [];
  for (let gz = 0; gz < RH; gz++) for (let gx = 0; gx < RW; gx++)
    if (rwalk[gz * RW + gx] && !seen[gz * RW + gx]) islets.push([rxs[gx], rzs[gz]]);
  console.log(`spawn (${MP.SPAWN_M.x}, ${MP.SPAWN_M.z}) walkable=${!!rwalk[sgz * RW + sgx]}  reachable ${reach}/${total} walkable cells`);
  if (islets.length) {
    // cluster-report: print each islet's bbox + a sample coord (not 1000 rows)
    console.log(`UNREACHABLE walkable cells (disconnected islets): ${islets.length}`);
    const shown = islets.slice(0, 60);
    for (const [x, z] of shown) console.log(`  ISLET (${x}, ${z})`);
    if (islets.length > shown.length) console.log(`  ... and ${islets.length - shown.length} more`);
  } else {
    console.log('every walkable cell is reachable from spawn — no islets');
  }
  console.log(islets.length ? `\nRESULT(connectivity): ${islets.length} unreachable islet cell(s) — FAIL`
                            : `\nRESULT(connectivity): fully connected — PASS`);
  console.log(holes.length ? `RESULT(holes): ${holes.length} candidate hole(s) to review`
                           : `RESULT(holes): no interior holes`);
  process.exit(islets.length ? 1 : 0);
}
