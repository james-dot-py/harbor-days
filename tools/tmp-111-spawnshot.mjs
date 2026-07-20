// tmp (task 111): canary-verified spawn shot on an OWN vite (PITFALLS: the :5173
// stale/foreign-server trap), then pixel-diff vs baseline.png at CANONICAL params
// to prove the staged Lincoln Park consts left the world BIT-IDENTICAL.
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { shot } from './shot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const port = +(process.argv[2] || 5411);
const canary = 'spawn111_' + Math.floor(Math.random() * 1e6);

const vite = spawn(process.execPath,
  [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'],
  { cwd: root });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite start timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});

// canonical flake-calibration recipe: play=1&quiet=1 at 3500 ms
const r = await shot({ name: 'lp111-spawn', query: 'play=1&quiet=1&canary=' + canary, waitMs: 3500, port, perf: true });
console.log('SHOT ' + r.file + ' (started ' + r.started + ')');
console.log('CANARY ' + (r.canary.join(' | ') || '(NONE — foreign server?)'));
console.log('PERF ' + JSON.stringify(r.perf));
console.log('ERRORS ' + (r.errors.length ? '\n' + r.errors.join('\n') : '(none)'));

const a = PNG.sync.read(fs.readFileSync(r.file));
const b = PNG.sync.read(fs.readFileSync(join(root, 'tools', 'shots', 'baseline.png')));
if (a.width !== b.width || a.height !== b.height) { console.log('DIFF SIZE MISMATCH ' + a.width + 'x' + a.height + ' vs ' + b.width + 'x' + b.height); }
else {
  const n = pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0.1 });
  const ratio = n / (a.width * a.height);
  console.log('DIFF vs baseline.png: ' + n + ' px = ' + (100 * ratio).toFixed(3) + '%  (gate 0.828%)  -> ' + (ratio < 0.008275824652777777 ? 'PASS (noise)' : 'FAIL'));
}
vite.kill();
process.exit(0);
