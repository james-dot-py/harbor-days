// TASK 097 — citywide walkability audit, HARD-CELL slice (Wrigleyville + Wrigley
// Bowl). REPORT ONLY. Imports the SHARED walk data modules the engine uses (no
// re-derived walk logic). Two scans per cell, both copied from the mp-gridsweep.mjs
// construction so results are apples-to-apples with Millennium:
//   (a) 2 m INTERIOR-HOLE scan: a non-walkable grid cell with >=6/8 walkable
//       8-neighbours (out-of-bounds counts as non-walkable, so boundary row/col
//       cells can never reach 6 -> they are excluded by construction, exactly as
//       mp-gridsweep does).
//   (b) 1 m 4-CONNECTED flood fill from round(spawn): the engine moves x/z
//       independently so a diagonal corner-touch is NOT passable. Every walkable
//       cell must be reachable; unreachable walkable cells are disconnected
//       ISLETS (hard-stuck traps). Islets are clustered into 4-conn components
//       and reported as bbox + count, not thousands of rows.
// Interpretation: an interior hole is only a BUG if it is an unintended pavement
// gap; intended planting beds / buildings / road edges are fine. This tool does
// NOT classify Wrigleyville/bowl holes — it prints the raw list with coords and
// each hole's 8-neighbour count for the main session to judge.
// Millennium is swept by its own tool (tools/mp-gridsweep.mjs); run separately.
// Pure node — NO puppeteer, NO three imports.
//
// 097 BLESSED CENSUS (judged in the 097 close-out; re-audit only NEW holes):
// - WRIGLEYVILLE, 7 holes, all intended non-walk slivers between corridors and
//   builder masses: the (-209..-215,-573) row is the 1-2 m curb seam between
//   Waveland's south edge (z-572) and the Waveland rooftop block (z-573.x);
//   (-317,-547)/(-331,-487)/(-329,-481) sit against the Waveland-west /
//   Clark-bar / plaza-office edges. Note the Murphy's forecourt seam quad
//   (added by 097) may absorb/shift holes near x-172..-178, z-534..-548.
// - BOWL, 8 holes, all 2 m-grid pinholes on the analytic radial boundaries
//   (wall band/gate arcs near home plate); the bowl has ZERO colliders, so
//   nothing can push a player into them, and the cell crawl covers the rest.
// - Player-capture risk for ALL of these is closed at the ENGINE since 097:
//   the collider push is walk-gated (see PITFALLS, ring-wedge guard), so no
//   collider can shove anyone into a non-walk sliver anywhere.
import * as WV from '../src/data/wrigleyville.js';
import * as WB from '../src/data/wrigley-bowl.js';

const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function sweepCell(name, walkable, clamp, spawn) {
  console.log(`\n================= ${name} =================`);
  const C = clamp;

  // ---------- (a) 2 m interior-hole scan (mp-gridsweep rule) ----------
  const STEP = 2;
  const xs = [], zs = [];
  for (let x = Math.floor(C.xMin); x <= Math.ceil(C.xMax); x += STEP) xs.push(x);
  for (let z = Math.floor(C.zMin); z <= Math.ceil(C.zMax); z += STEP) zs.push(z);
  const W = xs.length, H = zs.length;
  const walk = (gx, gz) => (gx < 0 || gz < 0 || gx >= W || gz >= H) ? false : walkable(xs[gx], zs[gz]);
  const holes = [];
  for (let gz = 0; gz < H; gz++) for (let gx = 0; gx < W; gx++) {
    if (walk(gx, gz)) continue;
    let n = 0; for (const [dx, dz] of N8) if (walk(gx + dx, gz + dz)) n++;
    if (n >= 6) holes.push({ x: xs[gx], z: zs[gz], n });
  }
  console.log(`--- interior holes (2 m grid, ${W}x${H} cells; non-walkable with >=6/8 walkable neighbours) ---`);
  console.log(`interior hole count: ${holes.length}`);
  if (holes.length) for (const h of holes) console.log(`  HOLE (${h.x}, ${h.z})  ${h.n}/8 walkable neighbours`);
  else console.log('  none');

  // ---------- (b) 1 m 4-connected flood fill from spawn ----------
  const RS = 1;
  const rxs = [], rzs = [];
  for (let x = Math.floor(C.xMin); x <= Math.ceil(C.xMax); x += RS) rxs.push(x);
  for (let z = Math.floor(C.zMin); z <= Math.ceil(C.zMax); z += RS) rzs.push(z);
  const RW = rxs.length, RH = rzs.length;
  const rwalk = new Uint8Array(RW * RH);
  let total = 0;
  for (let gz = 0; gz < RH; gz++) for (let gx = 0; gx < RW; gx++)
    if (walkable(rxs[gx], rzs[gz])) { rwalk[gz * RW + gx] = 1; total++; }

  const sgx = Math.round(spawn.x) - rxs[0], sgz = Math.round(spawn.z) - rzs[0];
  const inGrid = sgx >= 0 && sgz >= 0 && sgx < RW && sgz < RH;
  const spawnWalkable = inGrid && !!rwalk[sgz * RW + sgx];
  const seen = new Uint8Array(RW * RH), stack = [];
  if (spawnWalkable) { seen[sgz * RW + sgx] = 1; stack.push(sgz * RW + sgx); }
  let reach = 0;
  while (stack.length) {
    const i = stack.pop(); reach++;
    const gx = i % RW, gz = (i - gx) / RW;
    for (const [dx, dz] of N4) {
      const nx = gx + dx, nz = gz + dz;
      if (nx < 0 || nz < 0 || nx >= RW || nz >= RH) continue;
      const j = nz * RW + nx;
      if (rwalk[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
    }
  }

  // cluster the unreachable walkable cells into 4-conn components
  const comp = new Int32Array(RW * RH).fill(-1);
  const clusters = [];
  for (let gz = 0; gz < RH; gz++) for (let gx = 0; gx < RW; gx++) {
    const start = gz * RW + gx;
    if (!rwalk[start] || seen[start] || comp[start] !== -1) continue;
    // BFS this island
    let count = 0, xMin = Infinity, xMax = -Infinity, zMin = Infinity, zMax = -Infinity;
    const q = [start]; comp[start] = clusters.length;
    while (q.length) {
      const i = q.pop(); count++;
      const cx = i % RW, cz = (i - cx) / RW;
      const wx = rxs[cx], wz = rzs[cz];
      if (wx < xMin) xMin = wx; if (wx > xMax) xMax = wx;
      if (wz < zMin) zMin = wz; if (wz > zMax) zMax = wz;
      for (const [dx, dz] of N4) {
        const nx = cx + dx, nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= RW || nz >= RH) continue;
        const j = nz * RW + nx;
        if (rwalk[j] && !seen[j] && comp[j] === -1) { comp[j] = clusters.length; q.push(j); }
      }
    }
    clusters.push({ count, xMin, xMax, zMin, zMax });
  }
  clusters.sort((a, b) => b.count - a.count);
  const unreach = total - reach;

  console.log(`--- connectivity: flood fill from spawn (1 m grid, 4-conn, ${RW}x${RH} cells) ---`);
  console.log(`spawn (${spawn.x}, ${spawn.z}) -> grid-round (${Math.round(spawn.x)}, ${Math.round(spawn.z)})  walkable=${spawnWalkable}`);
  console.log(`reachable ${reach}/${total} walkable cells  (unreachable ${unreach})`);
  if (clusters.length) {
    console.log(`UNREACHABLE walkable islet clusters: ${clusters.length} (total ${unreach} cells)`);
    for (const c of clusters)
      console.log(`  ISLET x[${c.xMin}..${c.xMax}] z[${c.zMin}..${c.zMax}]  ${c.count} cell(s)`);
  } else {
    console.log('fully connected — no islets');
  }
  console.log(`RESULT(${name}): holes=${holes.length}  islets=${clusters.length}(${unreach} cells)  ${clusters.length ? 'CONNECTIVITY FAIL' : 'CONNECTIVITY PASS'}`);
  return { name, holes: holes.length, islets: clusters.length, unreach };
}

console.log('=== TASK 097 hard-cell walkability sweep (Wrigleyville, Wrigley Bowl) ===');
const results = [];
results.push(sweepCell('WRIGLEYVILLE', WV.walkableW, WV.CLAMP_W, WV.SPAWN_W));
results.push(sweepCell('WRIGLEY BOWL', WB.walkableB, WB.CLAMP_B, WB.SPAWN_B));

// ---------- L-CAR pocket (analytic note; the pack imports three, so no import) ----------
console.log('\n================= L-CAR pocket (analytic) =================');
const CAR = { x: -250, z: -650 };  // src/packs/wrigley-ride.js CAR (y 0.25 irrelevant to x/z)
console.log(`CAR center (${CAR.x}, ${CAR.z})`);
console.log('walkable rect: |x-CAR.x| < 1.7  AND  |z-CAR.z| < 6.4   (strict <)');
console.log('clamp rect:    |x-CAR.x| <= 1.8  AND  |z-CAR.z| <= 6.3');
console.log('NOTE: clamp allows |x-CAR.x| up to 1.8 while walkable requires < 1.7 ->');
console.log('      a ~0.1 m non-walk sliver inside the clamp on each x side (x in');
console.log('      [-251.8,-251.7] and [-248.3,-248.2]). The z axis is the reverse:');
console.log('      walkable to 6.4 but clamp only 6.3, so no z sliver. Informational');
console.log('      only — the anti-trap crawl covers hard cells (per task brief).');
console.log('colliders inside the car: NONE — grep of src/packs/wrigley-ride.js finds');
console.log('      no collide( calls; the redline-car exposes only walkable/surfaceY/');
console.log('      clamp/spawn (no collider registration).');

console.log('\n=== SUMMARY ===');
for (const r of results)
  console.log(`  ${r.name}: holes=${r.holes}  islets=${r.islets}(${r.unreach} cells)`);
console.log('  L-CAR: 0 colliders; 0.1 m clamp>walk x-sliver each side (informational)');
console.log('  MILLENNIUM: run tools/mp-gridsweep.mjs separately (blessed 74-hole census).');

// exit 1 if any hard cell has islets (so this fails loudly like mp-gridsweep)
process.exit(results.some(r => r.islets > 0) ? 1 : 0);
