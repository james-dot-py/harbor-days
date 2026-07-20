// tmp: task 109 verification — landing thud + brush rustle (design audit B5).
// Self-contained: spawns its OWN vite (tools default to 5173 which a session may
// own — PITFALLS), canary-gates, runs every scenario, kills vite, exits.
//   node tools/tmp-109-verify.mjs
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

// ---- own vite; parse the ACTUAL port ----
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: root });
const port = await new Promise((res, rej) => {
  let buf = '';
  const to = setTimeout(() => rej(new Error('vite no port in 30s:\n' + buf)), 30000);
  vite.stdout.on('data', d => { buf += d.toString(); const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/); if (m) { clearTimeout(to); res(m[1]); } });
  vite.stderr.on('data', d => { buf += d.toString(); });
  vite.on('exit', c => rej(new Error('vite exited early (' + c + '):\n' + buf)));
});
const killVite = () => { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill(); };
const base = `http://localhost:${port}/`;
console.log('vite on port ' + port);

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720'] });   // NOT --mute-audio: headless ignores autoplay policy, ctx runs
const wait = ms => new Promise(r => setTimeout(r, ms));
const errs = [], canary = [];
function watch(page, tag) {
  page.on('pageerror', e => errs.push(`[${tag} pageerror] ` + e.message));
  page.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' && !t.includes('favicon') && !t.includes('404')) errs.push(`[${tag} console.error] ` + t);
    else if (t.startsWith('[canary]')) canary.push(t);
  });
}
async function load(page, query) {
  await page.goto(base + '?' + query, { waitUntil: 'networkidle0', timeout: 60000 });
}
const results = {};

// ===================== A. CANARY + grid census =====================
{
  const page = await browser.newPage(); watch(page, 'canary');
  await load(page, 'play=1&canary=c109');
  await wait(1200);
  const stats = await page.evaluate(() => window.__hd.rustleStats());
  const draws = await page.evaluate(() => window.__hd.perf().drawCalls);
  results.A = { canary: canary.slice(), grid: stats, drawCalls: draws };
  console.log('A canary=%j grid=%j drawCalls=%d', canary, stats, draws);
  await page.close();
}

// ===================== B. LANDING THUD + camera settle (non-calm) =====================
{
  const page = await browser.newPage(); watch(page, 'land');
  await page.setViewport({ width: 1280, height: 720 });
  await load(page, 'play=1&x=109.5&z=156.6');
  await wait(700);
  // in-page rAF tracker: capture the PEAK landing-pitch across the whole arc
  await page.evaluate(() => { window.__mlp = 0; const loop = () => { window.__mlp = Math.max(window.__mlp, window.__hd.landPitch()); requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
  const before = await page.evaluate(() => window.__hd.landDbg().n);
  await page.keyboard.down(' '); await wait(80); await page.keyboard.up(' ');   // jump
  await wait(1300);                                                              // let the arc land
  const land = await page.evaluate(() => ({ ...window.__hd.landDbg() }));
  const peakPitch = await page.evaluate(() => window.__mlp);
  results.B = { before, land, peakPitch };
  console.log('B before=%d land=%j peakPitch=%s', before, land, peakPitch.toFixed(4));
  await page.close();
}

// ===================== C. LANDING under CALM — settle skipped =====================
{
  const page = await browser.newPage(); watch(page, 'land-calm');
  await page.setViewport({ width: 1280, height: 720 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await load(page, 'play=1&x=109.5&z=156.6');
  await wait(700);
  await page.evaluate(() => { window.__mlp = 0; const loop = () => { window.__mlp = Math.max(window.__mlp, window.__hd.landPitch()); requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
  const before = await page.evaluate(() => window.__hd.landDbg().n);
  await page.keyboard.down(' '); await wait(80); await page.keyboard.up(' ');
  await wait(1300);
  const land = await page.evaluate(() => ({ ...window.__hd.landDbg() }));
  const peakPitch = await page.evaluate(() => window.__mlp);
  results.C = { thudFired: land.n > before, peakPitch };
  console.log('C calm thudFired=%s peakPitch=%s (expect ~0)', land.n > before, peakPitch.toFixed(5));
  await page.close();
}

// ===================== D. BRUSH RUSTLE — walk through the flower beds =====================
{
  const page = await browser.newPage(); watch(page, 'rustle');
  await page.setViewport({ width: 1280, height: 720 });
  // spawn just SOUTH of garden bed [90,110] (radius 3.2), yaw 0 = walk +z through it
  await load(page, 'play=1&x=90&z=98&yaw=0');
  await wait(600);
  // record every distinct rustle event (timestamp from actx.currentTime via rustleDbg.t)
  await page.evaluate(() => {
    window.__rt = []; let last = -1;
    const loop = () => { const d = window.__hd.rustleDbg(); if (d.t !== last) { last = d.t; window.__rt.push(d.t); } requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  const beforeN = await page.evaluate(() => window.__hd.rustleDbg().n);
  // 1) STAND STILL in/near the bed for 1.5s — no movement => no rustle
  await page.evaluate(() => { window.__hd.player.x = 90; window.__hd.player.z = 110; window.__hd.camCtl.snap = true; });
  await wait(1600);
  const standN = await page.evaluate(() => window.__hd.rustleDbg().n);
  // 2) WALK north through the beds
  await page.evaluate(() => { window.__hd.player.x = 90; window.__hd.player.z = 96; window.__hd.camCtl.snap = true; });
  await wait(200);
  await page.keyboard.down('w');
  await wait(4200);
  await page.keyboard.up('w');
  await wait(200);
  const walkN = await page.evaluate(() => window.__hd.rustleDbg().n);
  const times = await page.evaluate(() => window.__rt.slice());
  const endPos = await page.evaluate(() => ({ x: +window.__hd.player.x.toFixed(1), z: +window.__hd.player.z.toFixed(1) }));
  // consecutive-event gaps (actx seconds)
  const gaps = [];
  for (let i = 1; i < times.length; i++) if (times[i] > 0 && times[i - 1] > 0) gaps.push(+(times[i] - times[i - 1]).toFixed(3));
  const minGap = gaps.length ? Math.min(...gaps) : null;
  results.D = { beforeN, standN, standDelta: standN - beforeN, walkN, walkDelta: walkN - standN, endPos, gaps, minGap };
  console.log('D standDelta=%d (expect 0) walkDelta=%d (expect >0) endPos=%j minGap=%s gaps=%j', standN - beforeN, walkN - standN, endPos, minGap, gaps);
  await page.close();
}

await browser.close();
killVite();

console.log('\n================ SUMMARY ================');
console.log(JSON.stringify(results, null, 2));
console.log('errors:', errs.length, errs);

// verdict
const A = results.A, B = results.B, C = results.C, D = results.D;
const checks = [
  ['no console/page errors', errs.length === 0],
  ['canary echoed', A.canary.length > 0],
  ['rustle grid populated (>500 pts)', A.grid.pts > 500],
  ['landing thud fired', B.land.n > B.before],
  ['thud peak in [0.045,0.135]', B.land.peak >= 0.045 && B.land.peak <= 0.135],
  ['thud fall in (0,1]', B.land.fall > 0 && B.land.fall <= 1],
  ['camera settle occurred (non-calm, peak>0.008)', B.peakPitch > 0.008],
  ['calm: thud still fired', C.thudFired],
  ['calm: camera settle SKIPPED (peak<1e-4)', C.peakPitch < 1e-4],
  ['standing still fires NO rustle', D.standDelta === 0],
  ['walking through beds fires rustle', D.walkDelta > 0],
  ['rustle throttle >=0.29s (min gap)', D.minGap === null || D.minGap >= 0.29],
];
let ok = true;
for (const [name, pass] of checks) { console.log((pass ? 'PASS ' : 'FAIL ') + name); if (!pass) ok = false; }
console.log('\n' + (ok ? 'ALL GREEN' : 'FAILURES PRESENT'));
process.exit(ok ? 0 : 1);
