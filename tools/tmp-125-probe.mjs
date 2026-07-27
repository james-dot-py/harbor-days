// tmp-125-probe — prove the new north gate + northWalk corridor is walkable end
// to end in the SHARED data (engine + walkprobe read these same functions).
import * as CH from '../src/data/chicago.js';

const blocked = (x, z) => CH.lpBlockedHit(x, z);

// 1. sample the northWalk centerline + a half-width band each side
const C = CH.ZOO.northWalk;          // crChain -> array of [x,z] samples
const pts = C.map(p => [p[0], p[1]]);
let bad = [];
for (const [x, z] of pts) {
  for (const off of [-1.0, -0.5, 0, 0.5, 1.0]) {
    if (blocked(x + off, z)) bad.push([+(x + off).toFixed(2), +z.toFixed(2)]);
  }
}
console.log('northWalk centerline+-1.0m samples:', pts.length * 5, 'blocked:', bad.length);
if (bad.length) console.log('  first blocked:', bad.slice(0, 12));

// 2. the gate throat: a dense grid across the gap
const GN = CH.ZOO.gates.north;
let throatBad = 0, throatOpen = 0;
for (let x = GN.x0 + 0.7; x <= GN.x1 - 0.7; x += 0.1)
  for (let z = GN.z - 2; z <= GN.z + 2; z += 0.1)
    (blocked(x, z) ? throatBad++ : throatOpen++);
console.log('gate throat (x', (GN.x0 + 0.7).toFixed(1), '..', (GN.x1 - 0.7).toFixed(1), '): open', throatOpen, 'blocked', throatBad);

// 3. the piers MUST still block (a gate with no piers is a hole in the fence)
console.log('pier W blocked:', blocked(GN.x0, GN.z), ' pier E blocked:', blocked(GN.x1, GN.z));

// 4. the fence either side of the gate must still block (gap did not widen)
console.log('fence just W of gate (-76,740.5) blocked:', blocked(-76, 740.5));
console.log('fence just E of gate (-64,740.1) blocked:', blocked(-64, 740.1));
console.log('fence far W (-84,740.8) blocked:', blocked(-84, 740.8));

// 5. endpoints weld to the exact control points they claim
const p0 = C[0], p1 = C[C.length - 1];
console.log('start', [+p0[0].toFixed(2), +p0[1].toFixed(2)], 'expect -70,735');
console.log('end  ', [+p1[0].toFixed(2), +p1[1].toFixed(2)], 'expect -71,791.5');

// 6. habitat clearance along the threaded stretch
const HB = CH.ZOO.habitats;
let minPolar = 9e9, minPeng = 9e9;
for (const [x, z] of pts) {
  if (z > 770 && z < 796) {
    minPolar = Math.min(minPolar, x - HB.polar.x1);        // walk must stay EAST of polar's x1
    minPeng = Math.min(minPeng, HB.penguin.x0 - x);        // and WEST of penguin's x0
  }
}
console.log('clearance to polar x1(-74.5):', minPolar.toFixed(2), 'm; to penguin x0(-68.5):', minPeng.toFixed(2), 'm');
console.log(bad.length === 0 && throatBad === 0 && blocked(GN.x0, GN.z) && blocked(GN.x1, GN.z) && blocked(-76, 740.5) && blocked(-64, 740.1) ? 'PROBE OK' : 'PROBE FAIL');
