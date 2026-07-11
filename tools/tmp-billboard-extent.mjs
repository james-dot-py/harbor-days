// Replicates sky.js's skyline-billboard LOCAL mulberry32 sequence to find the
// exact world-space z extents (center + depth/2, after the 2.2x group scale),
// especially inside the millennium cell's x-range. Read-only diagnostic.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const S = mulberry32(0x5c1000);
const rnd = (a, b) => a + (b - a) * S();
const SC = 2.2;
const boxes = [];
function band(n, za, zb, ha, hb, name) {
  for (let i = 0; i < n; i++) {
    const w = rnd(8, 20), h = rnd(ha, hb), d = rnd(8, 14);
    const x = rnd(-120, 135), z = rnd(za, zb);
    boxes.push({ name: name + i, x: x * SC, z: z * SC, w: w * SC, h: h * SC, d: d * SC });
  }
}
band(16, 280, 304, 16, 48, 'back');
band(20, 229, 244, 13, 40, 'front');
let globalMax = -1e9, inRangeMax = -1e9, worst = null;
for (const b of boxes) {
  const zMax = b.z + b.d / 2;
  const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2;
  if (zMax > globalMax) globalMax = zMax;
  if (x1 > 25 && x0 < 220 && zMax > inRangeMax) { inRangeMax = zMax; worst = b; }
}
console.log('band boxes:', boxes.length);
console.log('global zMax (center+d/2):', globalMax.toFixed(1));
console.log('zMax within x 25..220 :', inRangeMax.toFixed(1), JSON.stringify(worst));
const tall = boxes.filter(b => b.x + b.w / 2 > 25 && b.x - b.w / 2 < 220 && b.z + b.d / 2 > 640);
console.log('in-range boxes reaching z>640:', JSON.stringify(tall, null, 1));
