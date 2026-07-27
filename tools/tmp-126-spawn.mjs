// tmp-126-spawn — the /verify spawn shot against MY OWN vite (never the
// foreign 5173), plus the masked determinism diff vs the committed baseline.
//   node tools/tmp-126-spawn.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { shot } from './shot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const PORT = +(process.argv[2] || 5274);
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PORT), '--strictPort'], { cwd: root });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite did not start')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').includes('localhost:' + PORT)) { clearTimeout(t); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});
const r = await shot({ name: 'verify-spawn', query: 'play=1&canary=t126spawn', waitMs: 3000, port: PORT });
vite.kill();
console.log('SHOT ' + r.file + ' (' + r.started + ')');
console.log(r.canary.length ? 'CANARY ' + r.canary.join(' | ') : 'CANARY MISSING');
console.log(r.errors.length ? 'ERRORS:\n' + r.errors.join('\n') : 'NO ERRORS');
process.exit(r.errors.length || !r.canary.length ? 1 : 0);
