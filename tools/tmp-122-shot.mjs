// tmp: task 122 conservatory/Bates shot set. Owns its OWN vite (strict port
// 5211 — never attach to a stale/foreign :5173, the shot.mjs port law), waits
// for the port, shoots the framings through shot.mjs's exported shot() with a
// &canary=c122a echo, then kills the server. ONE foreground node process.
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import net from 'net';
import { shot } from './shot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const PORT = 5211;

const only = process.argv.slice(2);
const SHOTS = [
  ['s122-cons-axis',  'play=1&quiet=1&x=-70&z=733.5&yaw=2.85&pitch=0.08&dist=6'],
  ['s122-cons-side',  'play=1&quiet=1&x=-95&z=688&yaw=1.57&pitch=0.10&dist=8'],
  ['s122-bates',      'play=1&quiet=1&x=-67.3&z=731.6&yaw=-2.85&pitch=0.10&dist=4.5'],
  ['s122-bates-close','play=1&quiet=1&x=-70&z=731.9&yaw=2.95&pitch=0.06&dist=3.5'],
  ['s122-cons-north', 'play=1&quiet=1&x=-70&z=660&yaw=0.35&pitch=0.12&dist=8'],
  // -- diagnostics (the chase cam parks the avatar dead centre; a long dist
  //    shrinks it, and an off-axis stand clears the subject) --
  ['s122-vestibule',  'play=1&quiet=1&x=-71.4&z=714.75&yaw=2.418&pitch=0.10&dist=7'],
  ['s122-bates-east', 'play=1&quiet=1&x=-65.6&z=730.2&yaw=3.42&pitch=0.08&dist=6'],
  ['s122-axis-wide',  'play=1&quiet=1&x=-70&z=736&yaw=3.02&pitch=0.02&dist=17'],
  // a long chase dist parks the CAMERA 5 m off the basin (camera = player -
  // dist*(sin yaw, cos yaw)) so the bronzes fill the frame and the avatar is
  // a small silhouette 12 m behind them.
  ['s122-bates-figs', 'play=1&quiet=1&x=-74.98&z=721.02&yaw=3.927&pitch=0.06&dist=12'],
].filter(s => !only.length || only.includes(s[0]));

const vite = spawn(process.execPath,
  [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PORT), '--strictPort'],
  { cwd: root });
let vbuf = '';
vite.stdout.on('data', d => { vbuf += d; });
vite.stderr.on('data', d => { vbuf += d; });
const killVite = () => process.platform === 'win32'
  ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f'])
  : vite.kill();

// vite binds "localhost" (may be ::1 only on Windows), so poll the banner it
// prints rather than a raw 127.0.0.1 socket, then confirm with an HTTP GET.
const waitPort = () => new Promise((res, rej) => {
  const t0 = Date.now();
  const tick = async () => {
    if (vbuf.replace(/\x1b\[[0-9;]*m/g, '').includes('localhost:' + PORT)) {
      try { await fetch('http://localhost:' + PORT + '/'); return res(); } catch (e) { /* not serving yet */ }
    }
    if (Date.now() - t0 > 40000) return rej(new Error('vite never opened ' + PORT + ':\n' + vbuf));
    setTimeout(tick, 250);
  };
  tick();
});

let bad = 0;
try {
  await waitPort();
  console.log('vite up on strict port ' + PORT);
  for (const [name, q] of SHOTS) {
    const r = await shot({ name, query: q + '&canary=c122a', waitMs: 3800, port: PORT, perf: true });
    console.log('--- ' + name + ' -> ' + r.file + ' (' + r.started + ')');
    console.log('    canary: ' + (r.canary.join(' | ') || 'NONE'));
    if (r.perf) console.log('    perf: ' + JSON.stringify(r.perf));
    if (!r.canary.length) { bad++; console.log('    !! NO CANARY — the shot may not be this tree'); }
    if (r.errors.length) { bad++; console.log('    ERRORS:\n      ' + r.errors.join('\n      ')); }
    else console.log('    NO ERRORS');
  }
} finally {
  killVite();
}
console.log(bad ? 'SHOTS FAIL (' + bad + ')' : 'SHOTS OK');
process.exit(bad ? 1 : 0);
