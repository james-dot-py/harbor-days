// 084: self-contained canonical shot — spawn OWN vite, parse the real port,
// canary-check, shoot, kill vite. Usage:
//   node tools/tmp-084-spawnshot.mjs <name> [query] [waitMs]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { shot } from './shot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const name = process.argv[2] || '084-spawn';
const query = process.argv[3] ?? 'play=1&quiet=1&canary=084spawn';
const waitMs = +(process.argv[4] || 3500);

const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: root });
const port = await new Promise((res, rej) => {
  let buf = '';
  const to = setTimeout(() => rej(new Error('vite no port in 30s:\n' + buf)), 30000);
  vite.stdout.on('data', d => {
    buf += d.toString();
    const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/);
    if (m) { clearTimeout(to); res(+m[1]); }
  });
  vite.on('exit', c => rej(new Error('vite exited early (' + c + '):\n' + buf)));
});
console.log('vite port', port);
try {
  const r = await shot({ name, query, waitMs, port });
  console.log('SHOT', r.file, r.started);
  console.log('CANARY', r.canary.join(' | ') || '(none!)');
  if (r.errors.length) { console.log('ERRORS:\n' + r.errors.join('\n')); process.exitCode = 1; }
  else console.log('NO ERRORS');
} finally {
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']);
  else vite.kill();
}
