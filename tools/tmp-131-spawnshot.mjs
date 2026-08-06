// tmp (131 sign-off): canonical determinism spawn shot on an OWN vite —
// flake-calibration.json recipe (play=1&quiet=1, waitMs 3500) + canary echo.
// Writes tools/shots/verify-spawn.png for tmp-125-detdiff vs baseline.png.
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { shot } from './shot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const port = 5271;
const vite = spawn(process.execPath,
  [join(here, '..', 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'],
  { cwd: join(here, '..') });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite start timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});
const r = await shot({ name: 'verify-spawn', query: 'play=1&quiet=1&canary=spawn131', waitMs: 3500, port });
console.log('errors:', r.errors?.length ? r.errors : 0, 'canary:', r.canary);
vite.kill(); process.platform === 'win32' && spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']);
process.exit(r.errors?.length ? 1 : 0);
