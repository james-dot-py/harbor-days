// decode-qr.mjs — the MECHANICAL ORACLE for the Ko-fi QR (task 011).
// devDependencies only: 'sharp' (PNG -> raw RGBA) + 'jsqr' (decode). An
// unscannable QR is a failed task, so this asserts the decoded payload equals
// KOFI_URL EXACTLY, straight off the real walkthrough screenshots.
//
// Usage:
//   node tools/decode-qr.mjs --selftest              # matrix round-trips (no game)
//   node tools/decode-qr.mjs <shot.png> [more.png…]  # every PNG must decode to KOFI_URL
//   node tools/decode-qr.mjs --any <shot.png> […]    # AT LEAST ONE must decode
// --any is the honest per-placement gate: a diegetic QR is "scannable" if any of
// its walkthrough framings decodes (the follow-cam can't always frame it head-on,
// but a real scanner walking up to it would). Exit 0 iff the requested condition
// (all, or --any) held and every --selftest passed.
import sharp from 'sharp';
import jsQR from 'jsqr';
import { KOFI_URL, QR } from '../src/data/kofi-qr.js';

// Pure-JS raster of the matrix into an RGBA buffer (no canvas dep) — used by
// --selftest to prove the emitted constant is itself decodable.
function rasterMatrix(mod = 10, quiet = 4) {
  const n = QR.size, dim = (n + quiet * 2) * mod;
  const data = new Uint8ClampedArray(dim * dim * 4).fill(255);   // white field
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (QR.rows[y][x] !== '1') continue;
    for (let dy = 0; dy < mod; dy++) for (let dx = 0; dx < mod; dx++) {
      const px = (quiet + x) * mod + dx, py = (quiet + y) * mod + dy;
      const i = (py * dim + px) * 4;
      data[i] = data[i + 1] = data[i + 2] = 0;                    // black module
    }
  }
  return { data, width: dim, height: dim };
}

// A real scanner isn't handed one fixed resolution — it refocuses/zooms. jsQR is
// single-pass and scans the WHOLE frame for finder patterns, so a small-ish QR in
// a 1280×720 screenshot can slip past it at native scale. Try a few resolutions
// (down- and up-sampled) and take the first hit — standard multi-scale scanning,
// not oracle-gaming: the payload still must equal KOFI_URL.
async function decodeAt(path, scale) {
  const base = sharp(path).ensureAlpha();
  const meta = await base.metadata();
  const w = Math.round(meta.width * scale), h = Math.round(meta.height * scale);
  const pipe = scale === 1 ? base : sharp(path).ensureAlpha().resize(w, h, { kernel: 'lanczos3' });
  const { data, info } = await pipe.raw().toBuffer({ resolveWithObject: true });
  const img = new Uint8ClampedArray(data.buffer, data.byteOffset, data.length);
  return jsQR(img, info.width, info.height, { inversionAttempts: 'attemptBoth' });
}
async function decodePng(path) {
  for (const scale of [1, 0.5, 0.75, 1.5, 0.6, 2]) {
    const r = await decodeAt(path, scale);
    if (r && r.data) return r;
  }
  return null;
}

const args = process.argv.slice(2);
let ok = true;

if (args.includes('--selftest')) {
  const r = rasterMatrix();
  const decoded = jsQR(r.data, r.width, r.height);
  const good = decoded && decoded.data === KOFI_URL;
  console.log(`selftest: ${good ? 'PASS' : 'FAIL'}  decoded=${decoded ? JSON.stringify(decoded.data) : 'null'}`);
  if (!good) ok = false;
}

const anyMode = args.includes('--any');
const pngs = args.filter(a => !a.startsWith('--'));
let anyGood = false;
for (const p of pngs) {
  let decoded = null;
  try { decoded = await decodePng(p); } catch (e) { console.log(`${p}: ERROR ${e.message.split('\n')[0]}`); if (!anyMode) ok = false; continue; }
  const good = decoded && decoded.data === KOFI_URL;
  console.log(`${p}: ${good ? 'PASS' : 'FAIL'}  decoded=${decoded ? JSON.stringify(decoded.data) : 'null (no QR found)'}`);
  if (good) anyGood = true;
  if (!good && !anyMode) ok = false;
}
if (anyMode && pngs.length) { console.log(`--any: ${anyGood ? 'PASS (≥1 decoded)' : 'FAIL (none decoded)'}`); if (!anyGood) ok = false; }

if (!args.includes('--selftest') && pngs.length === 0) {
  console.log('nothing to do — pass --selftest and/or PNG paths');
  process.exit(2);
}
console.log(ok ? 'ALL PASS' : 'FAILURES PRESENT');
process.exit(ok ? 0 : 1);
