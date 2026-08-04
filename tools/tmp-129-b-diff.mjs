// tmp-129-b-diff.mjs — pixelmatch the fresh spawn shot against baseline.png
// node tools/tmp-129-b-diff.mjs
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';
const here = dirname(fileURLToPath(import.meta.url));
const S = join(here, 'shots');
const load = async f => {
  const { data, info } = await sharp(join(S, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};
const a = await load('129-b-spawn.png');
const b = await load('baseline.png');
console.log('sizes', a.w + 'x' + a.h, b.w + 'x' + b.h);
if (a.w !== b.w || a.h !== b.h) { console.log('SIZE MISMATCH'); process.exit(0); }
for (const t of [0.1, 0.15, 0.2]) {
  const n = pixelmatch(a.data, b.data, null, a.w, a.h, { threshold: t });
  console.log('threshold', t, 'diffpx', n, 'ratio', (n / (a.w * a.h) * 100).toFixed(3) + '%');
}
const calib = JSON.parse(readFileSync(join(here, 'flake-calibration.json'), 'utf8'));
console.log('gateRatio', (calib.gateRatio * 100).toFixed(3) + '% at per-pixel threshold', calib.perPixelThreshold);
// masked: exclude the minimap panel (x>=1095, y<=245) — new path pixels are expected there
const mask = (buf, w) => { const c = Buffer.from(buf); for (let y = 0; y <= 245; y++) for (let x = 1095; x < w; x++) { const i = (y * w + x) * 4; c[i] = c[i + 1] = c[i + 2] = 0; c[i + 3] = 255; } return c; };
const n2 = pixelmatch(mask(a.data, a.w), mask(b.data, b.w), null, a.w, a.h, { threshold: calib.perPixelThreshold });
console.log('minimap-masked diffpx', n2, 'ratio', (n2 / (a.w * a.h) * 100).toFixed(3) + '%');
