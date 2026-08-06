// tmp-132-spawnshot — /verify step 3 with its OWN vite on a private port.
// shot.mjs defaults to :5173, which in this sandbox is either dead (connection
// refused) or, worse, a FOREIGN app (PITFALLS: "the canary caught it"). Spawn
// our own server, echo a canary through the URL, take the shot, kill the server.
//   node tools/tmp-132-spawnshot.mjs [name] [query] [waitMs] [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { shot } from './shot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const NAME = process.argv[2] || 'verify-spawn';
const QUERY = process.argv[3] || 'play=1';
const WAIT = +(process.argv[4] || 3000);
const PORT = +(process.argv[5] || 5391);
const CANARY = 'v132spawn';

const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PORT), '--strictPort'], { cwd: root });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite did not start')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').includes('localhost:' + PORT)) { clearTimeout(t); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});

const r = await shot({ name: NAME, query: `${QUERY}&canary=${CANARY}`, waitMs: WAIT, port: PORT });
console.log('SHOT ' + r.file);
console.log('CANARY ' + (r.canary.join(' | ') || '(none)'));
console.log(r.errors.length ? 'ERRORS:\n' + r.errors.join('\n') : 'no console/page errors');
vite.kill();
const bad = r.errors.length || !r.canary.some(c => c.includes(CANARY));
console.log(bad ? 'SPAWN SHOT FAILED' : 'SPAWN SHOT OK');
process.exit(bad ? 1 : 0);
