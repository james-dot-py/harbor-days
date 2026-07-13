// tmp (075): perf-ledger regression + determinism probe. Spawns own strict-port
// vite. (a) Screenshots the canonical spawn (play=1&quiet=1, 3500ms) for the
// baseline determinism diff. (b) Measures __hd.perf().drawCalls at the heaviest
// STANDING millennium views (the 478/480 class) + a couple mt-* worst views —
// NO screenshots (pure perf reads), asserting every view <= 480. Confirms the
// 075 sand/area edits + the 069-074 montrose content added no global draw cost.
// Usage: node tools/tmp-perf-det.mjs [port]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const port = +(process.argv[2] || 5243);
const PI = Math.PI;
const vite = spawn(process.execPath,
  [join(here, '..', 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'],
  { cwd: join(here, '..') });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite start timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = []; let sawCanary = false;
const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !isNoise(m.text())) errors.push('[console.error] ' + m.text()); if (m.text().startsWith('[canary] perfdet')) sawCanary = true; });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function view(label, q, waitMs, shotName) {
  await page.goto(`http://localhost:${port}/?${q}&canary=perfdet`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
  await sleep(waitMs);
  if (shotName) await page.screenshot({ path: join(here, 'shots', shotName + '.png') });
  const perf = await page.evaluate(() => window.__hd ? window.__hd.perf() : null).catch(() => null);
  return { label, draws: perf ? perf.drawCalls : null };
}

const fr = (x, z, yaw, pitch, dist) => `play=1&x=${x}&z=${z}&yaw=${yaw}&pitch=${pitch}&dist=${dist}`;
const out = [];
// (a) canonical spawn for determinism (the ONLY screenshot)
out.push(await view('spawn(det)', 'play=1&quiet=1', 3500, 'det-spawn'));
// (b) heaviest STANDING millennium views — no screenshots
const MP = [
  ['mp-great-lawn-f0', fr(150, 834, PI, 0.05, 8)],
  ['mp-great-lawn-f1', fr(130, 838, -2.95, 0.05, 8)],
  ['mp-lolla-crowd-f0', fr(271, 960, -0.70, 0.10, 7)],
  ['mp-lolla-crowd-f1', fr(228, 905, 1.3, 0.04, 5.2)],
  ['mp-lolla-rail-f0', fr(252, 990, -0.78, 0.02, 7)],
  ['mp-bp-crossing-f0', fr(231.5, 800, 2.8, 0.02, 5)],
  ['mp-bp-crossing-f1', fr(203, 791, -1.35, 0.02, 5.5)],
  ['mp-nichols-f2', fr(128, 916, -2.51, 0.05, 5)],
  ['mp-promenade-f0', fr(108, 806, PI, 0.04, 7)],
  ['mp-bean-f0', fr(92, 806, -2.58, 0.06, 11)],
  ['mp-pritzker-stage', fr(150, 862, PI, 0.05, 9)],
];
for (const [label, q] of MP) out.push(await view(label, q, 2600));
// mt-* worst (already measured in the walkthrough; a re-confirm here)
out.push(await view('mt-beach-f1', fr(215, -1456, 0.0, 0.05, 14), 2600));
out.push(await view('mt-crickethill-base-f0', fr(112, -1272, PI, 0.06, 16), 2600));

await browser.close(); vite.kill();
let worst = 0, over = [];
for (const r of out) { console.log(`${String(r.draws).padStart(4)} draws  ${r.label}`); if (r.draws > worst) worst = r.draws; if (r.draws > 480) over.push(r.label); }
console.log(`WORST ${worst}/480` + (over.length ? '  OVER: ' + over.join(',') : '  (all <=480)'));
if (!sawCanary) console.log('CANARY MISSING — wrong server?');
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
const ok = !over.length && sawCanary && !errors.length;
console.log(ok ? 'PERF-DET GREEN' : 'PERF-DET FAILED');
process.exit(ok ? 0 : 1);
