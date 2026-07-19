// tmp (095): verify-spawn shot via OWN vite + canary (shot.mjs :5173 trap).
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { shot } from './shot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: root });
const port = await new Promise((res, rej) => {
  let buf = '';
  const to = setTimeout(() => rej(new Error('vite silent:\n' + buf)), 30000);
  vite.stdout.on('data', d => {
    buf += d.toString();
    const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/);
    if (m) { clearTimeout(to); res(+m[1]); }
  });
  vite.on('exit', c => rej(new Error('vite exited ' + c)));
});
console.log('vite on ' + port);
try {
  const name = process.argv[2] || 'verify-spawn-095';
  const query = process.argv[3] || 'play=1&canary=sp095';
  const waitMs = +(process.argv[4] || 3000);
  const r = await shot({ name, query, waitMs, port });
  console.log('SHOT', r.file, r.started);
  console.log('CANARY', r.canary.join(' | ') || 'NONE');
  console.log(r.errors.length ? 'ERRORS:\n' + r.errors.join('\n') : 'no errors');
} finally {
  process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill();
}
