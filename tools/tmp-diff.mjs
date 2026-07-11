// tmp: pixel-diff two PNGs (task 035 baseline check). node tools/tmp-diff.mjs a.png b.png
import fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
const [a, b] = process.argv.slice(2).map(p => PNG.sync.read(fs.readFileSync(p)));
if (a.width !== b.width || a.height !== b.height) { console.log('SIZE MISMATCH'); process.exit(1); }
const n = pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0.1 });
console.log('diff px ' + n + ' of ' + a.width * a.height + ' = ' + (100 * n / (a.width * a.height)).toFixed(3) + '%');
