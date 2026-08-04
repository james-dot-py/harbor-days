// tmp-130-verify-spawn — /verify step 3 done safely: shot.mjs defaults to port
// 5173, which is either dead or someone else's app (the standing canary trap).
// Spawn our OWN vite, read the port off its stdout, canary-check the page, and
// write tools/shots/v130-spawn.png under a NEW name so the previous session's
// verify-spawn.png survives as the determinism reference to diff against.
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { shot } from './shot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: root });
const port = await new Promise((res, rej) => {
  let buf = '';
  const to = setTimeout(() => rej(new Error('no port in 40s:\n' + buf)), 40000);
  vite.stdout.on('data', d => {
    buf += d.toString();
    const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/);
    if (m) { clearTimeout(to); res(+m[1]); }
  });
  vite.stderr.on('data', d => { buf += d.toString(); });
  vite.on('exit', c => rej(new Error('vite exited early (' + c + ')\n' + buf)));
});
console.log('vite on port', port);
const r = await shot({ name: 'v130-spawn', query: 'play=1&canary=v130', waitMs: 3000, port });
console.log('errors:', r.errors.length ? r.errors.join(' | ') : 'none');
console.log('canary:', r.canary.length ? r.canary.join('|') : 'SILENT — DO NOT TRUST THIS SHOT');
process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill();
