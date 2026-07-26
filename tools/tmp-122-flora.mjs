// tmp (122): conservatory garden shots — the six gravel garden walks (paths.js)
// + the parterre-bed / Grandmother's flowers and straw tufts (props.js).
// Own vite on STRICT port 5212 (never attaches to 5173 — the foreign-server
// trap), canary c122b on every load, server killed in-script.
// Writes tools/shots/s122-*.png and reports console errors + draw calls.
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const PORT = 5212;

const vite = spawn(process.execPath,
  [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PORT), '--strictPort'], { cwd: root });
await new Promise((res, rej) => {
  let buf = ''; const to = setTimeout(() => rej(new Error('vite no port:\n' + buf)), 30000);
  vite.stdout.on('data', d => { buf += d; const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/); if (m) { clearTimeout(to); res(m[1]); } });
  vite.stderr.on('data', d => { buf += d; });
});
const killVite = () => process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill();
process.on('exit', killVite);
console.log('vite on STRICT port ' + PORT);

const SHOTS = [
  ['s122-beds', 'play=1&x=-67&z=734&yaw=-2.9&pitch=0.30&dist=9'],
  ['s122-gm', 'play=1&x=-93&z=716&yaw=-1.85&pitch=0.15&dist=7'],
  ['s122-east-conn', 'play=1&x=-30&z=712&yaw=2.6&pitch=0.18&dist=8'],
  // added: the orchestrator's east-conn framing looks NE, away from the ribbon
  // (dir=(sin yaw,cos yaw) -> (0.52,-0.86)). These two look AT the work.
  ['s122-east-conn-b', 'play=1&x=-20&z=715&yaw=1.57&pitch=0.38&dist=12'],   // along the connector east, into the LP_TRAIL_PARK T at (-8,714)
  ['s122-garden-top', 'play=1&x=-70&z=723&yaw=-3.14&pitch=0.95&dist=34'],   // whole garden from above — weld/continuity/z-fighting audit
  ['s122-cross-top', 'play=1&x=-86&z=719&yaw=-3.14&pitch=0.95&dist=26'],    // loop west point -> Stockton crossing -> LP_TRAIL_STOCKTON T
];

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1300,760'] });
let fail = 0;
for (const [name, q] of SHOTS) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const canary = [], errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => {
    const t = m.text();
    if (t.startsWith('[canary]')) canary.push(t);
    else if (m.type() === 'error' && !t.includes('favicon') && !t.includes('404')) errs.push(t);
  });
  await page.goto(`http://localhost:${PORT}/?${q}&quiet=1&canary=c122b`, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3200));
  const info = await page.evaluate(() => {
    const r = window.__hd && window.__hd.renderer;
    return r ? { calls: r.info.render.calls, tris: r.info.render.triangles } : null;
  }).catch(() => null);
  const out = join(here, 'shots', name + '.png');
  await page.screenshot({ path: out });
  await page.close();
  if (!canary.length) fail++;
  console.log(`${name}: canary=${canary.length ? 'OK' : 'MISSING'} errors=${errs.length}${errs.length ? ' ' + JSON.stringify(errs.slice(0, 4)) : ''}` +
    (info ? ` draws=${info.calls} tris=${info.tris}` : ' draws=n/a') + `  -> ${out}`);
  if (errs.length) fail++;
}
await browser.close(); killVite();
console.log(fail ? 'FLORA SHOTS FAIL' : 'FLORA SHOTS OK');
process.exit(fail ? 1 : 0);
