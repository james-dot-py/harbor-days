// tmp: pixel-diff two PNGs and WRITE the diff map (task 060 baseline triage).
// node tools/tmp-diffmap.mjs a.png b.png out.png
import fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
const [pa, pb, out] = process.argv.slice(2);
const a = PNG.sync.read(fs.readFileSync(pa)), b = PNG.sync.read(fs.readFileSync(pb));
const d = new PNG({ width: a.width, height: a.height });
const n = pixelmatch(a.data, b.data, d.data, a.width, a.height, { threshold: 0.1 });
fs.writeFileSync(out, PNG.sync.write(d));
console.log('diff px ' + n + ' = ' + (100 * n / (a.width * a.height)).toFixed(3) + '% -> ' + out);
