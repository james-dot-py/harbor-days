// tmp: crop the same region from two PNGs, save crops, and pixel-diff them
// (task 060 gate triage). node tools/tmp-cropdiff.mjs a.png b.png left top w h out-prefix
import fs from 'fs';
import sharp from 'sharp';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
const [pa, pb, l, t, w, h, pre] = process.argv.slice(2);
const box = { left: +l, top: +t, width: +w, height: +h };
async function crop(p, out) {
  await sharp(p).extract(box).png().toFile(out);
  const png = PNG.sync.read(fs.readFileSync(out));
  return png;
}
const a = await crop(pa, pre + '-a.png');
const b = await crop(pb, pre + '-b.png');
const d = new PNG({ width: a.width, height: a.height });
const n = pixelmatch(a.data, b.data, d.data, a.width, a.height, { threshold: 0.1 });
fs.writeFileSync(pre + '-d.png', PNG.sync.write(d));
console.log('crop diff px ' + n + ' of ' + a.width * a.height + ' = ' + (100 * n / (a.width * a.height)).toFixed(2) + '%');
