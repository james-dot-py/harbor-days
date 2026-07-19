// tmp (task 103): canary-verified spawn shot on an OWN vite (PITFALLS: the :5173
// stale/foreign-server trap). Reports console errors + draw calls + fps.
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { shot } from './shot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const port = +(process.argv[2] || 5376);
const canary = 'spawn103_' + Math.floor(Math.random() * 1e6);

const vite = spawn(process.execPath,
  [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'],
  { cwd: root });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite start timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});

const r = await shot({ name: 'verify-spawn', query: 'play=1&quiet=1&canary=' + canary, waitMs: 3000, port, perf: true });
console.log('SHOT ' + r.file + ' (' + r.started + ')');
console.log('CANARY ' + (r.canary.join(' | ') || '(NONE — foreign server?)'));
console.log('PERF ' + JSON.stringify(r.perf));
console.log('ERRORS ' + (r.errors.length ? '\n' + r.errors.join('\n') : '(none)'));
vite.kill();
process.exit(0);
