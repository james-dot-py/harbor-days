// tmp-115-diag.mjs — one-shot diagnostic shots for task 115 (flamingos /
// monkey ledge / penguin waddler grounding). Own vite + parsed port + canary
// (the shot-mjs-port-canary law). Foreground; kills vite on exit.
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { shot } from './shot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: root });
const port = await new Promise((res, rej) => {
  let buf = '';
  const to = setTimeout(() => rej(new Error('vite no port in 30s:\n' + buf)), 30000);
  vite.stdout.on('data', d => {
    buf += d.toString();
    const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/);
    if (m) { clearTimeout(to); res(+m[1]); }
  });
  vite.stderr.on('data', d => { buf += d.toString(); });
  vite.on('exit', c => rej(new Error('vite exited ' + c + '\n' + buf)));
});
console.log('vite on ' + port);

const runId = 'diag115';
const SHOTS = [
  ['d115-monkeys2', 'play=1&x=-51.5&z=801&yaw=-2.8&pitch=0.2&dist=5.5&canary=' + runId],
];
let fail = 0;
for (const [name, q] of SHOTS) {
  const r = await shot({ name, query: q, waitMs: 2500, port });
  const ok = r.canary.some(c => c.includes(runId));
  console.log(name, 'canary=' + ok, 'errors=' + r.errors.length, r.errors.slice(0, 3).join(' | '));
  if (!ok || r.errors.length) fail = 1;
}
if (process.platform === 'win32') spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']);
else vite.kill();
await new Promise(r => setTimeout(r, 1500));
process.exit(fail);
