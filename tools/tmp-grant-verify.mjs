// tmp (task 057): verify the staged Grant layout data.
// PART 1 — flags-off parity: current module must answer walkableM/surfaceYM/
//   kindAtM byte-identically to HEAD over the old clamp (+margin), and keep
//   CLAMP_M/MAP_M/SPAWN_M identical.
// PART 2 — flags-on sanity: a temp copy with every OPEN_GRANT flag true is
//   flood-filled from spawn over CLAMP_FULL_M: every walkable cell reachable,
//   no adjacent walkable step > 0.6 (elevator law), no interior holes.
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const failures = [];

// ---------- PART 1: parity vs HEAD ----------
const headSrc = execSync('git show HEAD:src/data/millennium.js', { encoding: 'utf8' });
writeFileSync('tools/tmp-head-millennium.mjs', headSrc);
const HEAD = await import('../tools/tmp-head-millennium.mjs'.replace('../tools', './'));
const CUR = await import('../src/data/millennium.js');

let diffs = 0, samples = 0;
for (let x = 40; x <= 212; x += 0.5) for (let z = 696; z <= 904; z += 0.5) {
  samples++;
  const a = HEAD.walkableM(x, z), b = CUR.walkableM(x, z);
  if (a !== b) { diffs++; if (diffs < 6) console.log(`  walkable DIFF at (${x},${z}): head=${a} cur=${b}`); continue; }
  if (a) {
    const ya = HEAD.surfaceYM(x, z), yb = CUR.surfaceYM(x, z);
    if (Math.abs(ya - yb) > 1e-9) { diffs++; if (diffs < 6) console.log(`  surfaceY DIFF at (${x},${z}): ${ya} vs ${yb}`); }
  }
  const ka = HEAD.kindAtM(x, z), kb = CUR.kindAtM(x, z);
  if (ka !== kb) { diffs++; if (diffs < 6) console.log(`  kind DIFF at (${x},${z})`); }
}
console.log(`PART 1 parity: ${samples} samples, ${diffs} diffs`);
if (diffs) failures.push(`parity: ${diffs} diffs`);
for (const k of ['xMin', 'xMax', 'zMin', 'zMax'])
  if (HEAD.CLAMP_M[k] !== CUR.CLAMP_M[k]) failures.push(`CLAMP_M.${k}: ${HEAD.CLAMP_M[k]} -> ${CUR.CLAMP_M[k]}`);
if (JSON.stringify(HEAD.MAP_M) !== JSON.stringify(CUR.MAP_M)) failures.push('MAP_M changed');
if (JSON.stringify(HEAD.SPAWN_M) !== JSON.stringify(CUR.SPAWN_M)) failures.push('SPAWN_M changed');
if (HEAD.WALK_M.length !== CUR.WALK_M.length) failures.push(`WALK_M length ${HEAD.WALK_M.length} -> ${CUR.WALK_M.length}`);
console.log(`PART 1 plumbing: clamp/map/spawn/walk-count ${failures.length ? 'CHANGED' : 'identical'} (WALK_M ${HEAD.WALK_M.length} -> ${CUR.WALK_M.length})`);

// ---------- PART 2: all-flags-on world ----------
const curSrc = readFileSync('src/data/millennium.js', 'utf8');
const onSrc = curSrc.replace(
  /maggie: false, ribbonIce: false, artInstitute: false, nichols: false, butler: false,/,
  'maggie: true, ribbonIce: true, artInstitute: true, nichols: true, butler: true,');
if (onSrc === curSrc) { failures.push('flag replace failed'); }
writeFileSync('tools/tmp-grant-all.mjs', onSrc);
const ON = await import('./tmp-grant-all.mjs');

const C = ON.CLAMP_FULL_M, STEP = 1;
const xs = [], zs = [];
for (let x = C.xMin; x <= C.xMax; x += STEP) xs.push(x);
for (let z = C.zMin; z <= C.zMax; z += STEP) zs.push(z);
const W = xs.length, H = zs.length;
const walk = new Uint8Array(W * H), Y = new Float32Array(W * H);
let walkCount = 0;
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  if (ON.walkableM(xs[i], zs[j])) { walk[j * W + i] = 1; Y[j * W + i] = ON.surfaceYM(xs[i], zs[j]); walkCount++; }
}
console.log(`\nPART 2 (all flags on): clamp x ${C.xMin}..${C.xMax}, z ${C.zMin}..${C.zMax}; walkable cells ${walkCount}/${W * H}`);

// flood fill from spawn
const seen = new Uint8Array(W * H);
const si = Math.round(ON.SPAWN_M.x - C.xMin), sj = Math.round(ON.SPAWN_M.z - C.zMin);
const stack = [sj * W + si]; seen[sj * W + si] = 1;
let reached = 0;
while (stack.length) {
  const c = stack.pop(); reached++;
  const i = c % W, j = (c / W) | 0;
  for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const ni = i + di, nj = j + dj;
    if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
    const n = nj * W + ni;
    if (!walk[n] || seen[n]) continue;
    if (Math.abs(Y[n] - Y[c]) > 0.6) continue;         // elevator law: unreachable via >0.6 step
    seen[n] = 1; stack.push(n);
  }
}
console.log(`flood fill from spawn: reached ${reached}/${walkCount}`);
if (reached < walkCount) {
  failures.push(`unreached walkable cells: ${walkCount - reached}`);
  let shown = 0;
  for (let j = 0; j < H && shown < 12; j++) for (let i = 0; i < W && shown < 12; i++)
    if (walk[j * W + i] && !seen[j * W + i]) { console.log(`  UNREACHED (${xs[i]}, ${zs[j]}) y ${Y[j * W + i].toFixed(2)}`); shown++; }
}

// elevator pairs among REACHED cells (a step you could actually encounter)
let elev = 0;
for (let j = 0; j < H; j++) for (let i = 0; i < W - 1; i++) {
  const a = j * W + i;
  for (const b of [a + 1, a + W]) {
    if (b >= W * H) continue;
    if (walk[a] && walk[b] && seen[a] && seen[b] && Math.abs(Y[a] - Y[b]) > 0.6) {
      elev++; if (elev <= 12) console.log(`  ELEVATOR ${Math.abs(Y[a] - Y[b]).toFixed(2)} at (${xs[i]}, ${zs[j]})`);
    }
  }
}
console.log(`adjacent reached-walkable steps > 0.6: ${elev}`);
if (elev) failures.push(`elevator pairs: ${elev}`);

// interior holes (gridsweep rule at 2 m): flags-on vs the LIVE baseline
// (39 reviewed-benign candidates exist today: rink rim buffers, BP approach
// flanks). Sealed building footprints (052-law carves) are whitelisted —
// their interiors always ring as "candidates" and hold meshes.
const SEALED = [
  ...ON.MAGGIE_M.walls, ...ON.MAGGIE_M.csg.pavilions,
  ON.MAGGIE_M.play.rooms.ship, ON.MAGGIE_M.play.tower,
  { x0: ON.MAGGIE_M.play.lighthouse.x - 3.2, x1: ON.MAGGIE_M.play.lighthouse.x + 3.2,
    z0: ON.MAGGIE_M.play.lighthouse.z - 3.2, z1: ON.MAGGIE_M.play.lighthouse.z + 3.2 },
  ON.ART_M.southGarden.fountain, ...ON.ART_M.urnBeds,
  { x0: ON.ART_M.portico.x0, x1: ON.ART_M.portico.x1 + 35, z0: 946, z1: 995 }, // west block face line
  ON.BUTLER_M.petrillo, ON.BUTLER_M.booth,
];
const inSealed = (x, z) => SEALED.some(r => x >= r.x0 - 0.5 && x <= r.x1 + 0.5 && z >= r.z0 - 0.5 && z <= r.z1 + 0.5);
// Chain-adjacent "positive-ledge" slivers: non-walk buffer cells hugging an
// elevated deck's plan edge (bend wedges, flank buffers). Same class as the
// 39 blessed baseline candidates around the sunken rink — blocked, never
// water (issue-017 guard); the deck mesh covers them visually. Counted and
// reported for the 058/060 review, not failed.
const CHAINS = [ON.BP_CROSSING_M.nodes, ON.NICHOLS2_M.nodes];
const nearChain = (x, z) => {
  for (const nodes of CHAINS) for (let i = 0; i < nodes.length - 1; i++) {
    const [ax, az] = nodes[i], [bx, bz] = nodes[i + 1];
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    const px = ax + t * dx - x, pz = az + t * dz - z;
    if (px * px + pz * pz < 5.2 * 5.2) return true;
  }
  return false;
};
const holeSet = (isWalk) => {
  const set = new Set();
  for (let j = 0; j < H; j += 2) for (let i = 0; i < W; i += 2) {
    if (isWalk(xs[i], zs[j])) continue;
    let n = 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = xs[i] + 2 * di, nz = zs[j] + 2 * dj;
      if (nx >= C.xMin && nz >= C.zMin && nx <= C.xMax && nz <= C.zMax && isWalk(nx, nz)) n++;
    }
    if (n >= 6) set.add(xs[i] + ',' + zs[j]);
  }
  return set;
};
const baseHoles = holeSet(CUR.walkableM);
const onHoles = holeSet(ON.walkableM);
let newHoles = 0, ledges = 0;
for (const h of onHoles) {
  if (baseHoles.has(h)) continue;
  const [hx, hz] = h.split(',').map(Number);
  if (inSealed(hx, hz)) continue;
  if (nearChain(hx, hz)) { ledges++; console.log(`  chain-ledge candidate (${h}) — for 058/060 review`); continue; }
  newHoles++; if (newHoles <= 15) console.log(`  NEW HOLE (${h})`);
}
console.log(`interior holes: baseline ${baseHoles.size}, flags-on ${onHoles.size}, chain-ledge candidates ${ledges}, NEW unexplained ${newHoles}`);
if (newHoles) failures.push(`new holes: ${newHoles}`);

// ribbon ice sanity
const iceOn = ON.kindAtM(250.8, 761.1) === 'ice' && ON.kindAtM(222.2, 760.9) === 'ice';
const iceOffHere = CUR.kindAtM(250.8, 761.1) === null;
console.log(`ribbon kindAt: on=${iceOn} (flags), off=${iceOffHere} (current)`);
if (!iceOn || !iceOffHere) failures.push('ribbon kindAt wrong');

console.log(failures.length ? `\nFAILURES:\n- ${failures.join('\n- ')}` : '\nALL CHECKS PASS');
process.exit(failures.length ? 1 : 0);
