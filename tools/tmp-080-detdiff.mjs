// tmp (080): determinism diff — pixelmatch det-spawn.png (fresh canonical spawn
// from tmp-perf-det.mjs) vs the reference baseline.png. Gate per AUTOPILOT §6.2
// item 4 / flake-calibration.json: per-pixel threshold 0.1; 079 shipped at 0.303%
// with the gate at 0.828%.
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const a = PNG.sync.read(readFileSync(join(here, 'shots', 'baseline.png')));
const b = PNG.sync.read(readFileSync(join(here, 'shots', 'det-spawn.png')));
if (a.width !== b.width || a.height !== b.height) {
  console.log('SIZE MISMATCH', a.width, a.height, 'vs', b.width, b.height);
  process.exit(1);
}
const n = pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0.1 });
const ratio = 100 * n / (a.width * a.height);
console.log('diff pixels:', n, ' ratio:', ratio.toFixed(3) + '%', ' gate: 0.828%');
process.exit(ratio <= 0.828 ? 0 : 1);
