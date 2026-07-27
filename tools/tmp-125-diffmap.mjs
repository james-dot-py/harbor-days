// tmp-125-diffmap — write a visible diff image + a coarse 8x8 block report so I
// can SEE which region of the spawn view moved, instead of guessing from a %.
import fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const [pa, pb, out] = process.argv.slice(2);
const a = PNG.sync.read(fs.readFileSync(pa)), b = PNG.sync.read(fs.readFileSync(pb));
const diff = new PNG({ width: a.width, height: a.height });
const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
fs.writeFileSync(out, PNG.sync.write(diff));
console.log(`diff ${n} px -> ${out}`);

// coarse block map: which 8x8 grid cells carry the diff
const GX = 8, GY = 8, cw = Math.ceil(a.width / GX), ch = Math.ceil(a.height / GY);
const grid = Array.from({ length: GY }, () => new Array(GX).fill(0));
for (let y = 0; y < a.height; y++)
  for (let x = 0; x < a.width; x++) {
    const i = (a.width * y + x) << 2;
    if (diff.data[i] > 200 && diff.data[i + 1] < 120) grid[(y / ch) | 0][(x / cw) | 0]++;
  }
console.log('\nblock map (diff px per ' + cw + 'x' + ch + ' cell):');
for (let r = 0; r < GY; r++)
  console.log('  y' + String(r * ch).padStart(4) + ' | ' + grid[r].map(v => String(v).padStart(6)).join(''));
