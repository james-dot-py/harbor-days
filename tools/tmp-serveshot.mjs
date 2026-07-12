// tmp (062): spawn an OWN vite (strict port) + take a batch of shots + kill it.
// Usage: node tools/tmp-serveshot.mjs <port> <shotsJsonFile>
//   shots file: [ {"name":"x","query":"play=1&x=..","waitMs":2500}, ... ]
// &canary=<name> is appended to every query and the echo asserted (the
// foreign-:5173 trap — PITFALLS).
import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { shot } from './shot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const [portArg, file] = process.argv.slice(2);
const port = +portArg;
const shots = JSON.parse(readFileSync(file, 'utf8'));
const vite = spawn(process.execPath,
  [join(here, '..', 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'],
  { cwd: join(here, '..') });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite start timeout')), 30000);
  vite.stdout.on('data', d => {
    if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); }
  });
  vite.stderr.on('data', d => process.stderr.write(d));
});
let fails = 0;
for (const s of shots) {
  const canary = 'c' + s.name.replace(/[^a-z0-9]/gi, '');
  const r = await shot({ name: s.name, query: s.query + '&canary=' + canary, waitMs: s.waitMs || 3000, port });
  const okCanary = (r.canary || []).some(c => c.includes(canary));
  const okErr = !(r.errors || []).length;
  console.log(`${okCanary && okErr ? 'ok ' : 'FAIL'} ${s.name} canary=${okCanary} errors=${(r.errors || []).length}`);
  if (!okCanary || !okErr) { fails++; for (const e of r.errors || []) console.log('   ' + e); }
}
vite.kill();
console.log(fails ? fails + ' FAILURES' : 'ALL SHOTS OK');
process.exit(fails ? 1 : 0);
