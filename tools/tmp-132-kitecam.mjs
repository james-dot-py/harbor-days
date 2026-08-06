// tmp-132-kitecam — BEFORE/AFTER evidence for converting the Cricket Hill kite
// session cam to the 126 ownership API. A screenshot pair cannot show a camera
// fight (PITFALLS "two easers"), so this samples the RENDERED camera once per
// rAF through a SCRIPTED flight and writes the trace to JSON:
//   * charge is released on the power METER's own peak (in-page rAF watcher, so
//     both runs launch at power >= 0.995) — the flight targets are power-driven,
//     so this is what makes the two traces comparable at all;
//   * marks: launch (charge keyup) and reel (the second E tap);
//   * shots at fixed offsets from those marks: ascend / aloft / reel / release.
// Assertions here are only the ones that hold in BOTH worlds (canary, no
// errors, the flight actually ran, settled-aloft stillness). The before/after
// EQUALITY is tools/tmp-132-cmp.mjs.
//   node tools/tmp-132-kitecam.mjs <before|after> [port]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync } from 'fs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, 'shots');
mkdirSync(outDir, { recursive: true });
const LABEL = (process.argv[2] || 'before').replace(/[^a-z0-9]/gi, '');
const PORT = +(process.argv[3] || 5332);
const CANARY = 'k132' + LABEL;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PORT), '--strictPort'], { cwd: root });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite did not start')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').includes('localhost:' + PORT)) { clearTimeout(t); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});

const results = [];
const ok = (n, p, x = '') => { results.push(p); console.log(`${p ? 'ok  ' : 'FAIL'} ${n}${x ? '  — ' + x : ''}`); };

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [], warns = [], canaries = [];
const isNoise = t => t.includes('favicon') || t.includes('404') || t.includes('manifest') || t.includes('sw.js') || t.includes('goatcounter');
page.on('console', m => { const t = m.text();
  if (m.type() === 'error' && !isNoise(t)) errors.push('[console.error] ' + t);
  else if (t.startsWith('[canary]')) canaries.push(t);
  if (t.includes('[framework]') || t.includes('[econ]')) warns.push(t); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

// stand 2.5 m west of the summit anchor (108,-880), inside the r3.4 fly ring
await page.goto(`http://localhost:${PORT}/?play=1&x=105.5&z=-880&canary=${CANARY}`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start').click(); });
await page.waitForFunction(() => window.__hd && window.__hd.camDbg, { timeout: 20000 });
await sleep(3200);   // let the chase cam converge before we touch anything

// per-rAF sampler + in-game marks
await page.evaluate(() => {
  window.__t = []; window.__mk = {};
  (function s() { const c = window.__hd.camDbg();
    window.__t.push({ t: performance.now(), own: c.own, fov: c.fov, x: c.x, y: c.y, z: c.z, qx: c.qx, qy: c.qy, qz: c.qz, qw: c.qw });
    if (window.__t.length < 3000) requestAnimationFrame(s); })();
});
const pnow = () => page.evaluate(() => performance.now());
const shotAt = async (markKey, offMs, name) => {   // fire a shot offMs after an in-page mark
  const [mark, now] = await page.evaluate(k => [window.__mk[k], performance.now()], markKey);
  const wait = mark + offMs - now;
  if (wait > 0) await sleep(wait);
  await page.screenshot({ path: join(outDir, `132-kite-${LABEL}-${name}.png`) });
  const d = await page.evaluate(k => ({ dt: performance.now() - window.__mk[k], c: window.__hd.camDbg() }), markKey);
  console.log(`   shot ${name.padEnd(8)} @ ${markKey}+${d.dt.toFixed(0)}ms  own=${d.c.own} fov=${d.c.fov.toFixed(2)}`);
  return d.dt;
};

// ---- charge + launch: release on the meter's own peak (both runs ~1.00) ----
await page.evaluate(() => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }));
  const fill = document.getElementById('pwrfill');
  (function w() {
    const p = parseFloat(fill.style.width) || 0;
    if (p >= 99.5) { window.dispatchEvent(new KeyboardEvent('keyup', { key: 'e' })); window.__mk.launch = performance.now(); }
    else requestAnimationFrame(w);
  })();
});
await page.waitForFunction(() => window.__mk.launch !== undefined, { timeout: 5000 });
const flew = await page.waitForFunction(() => window.__hd.gstate.kitesFlown > 0, { timeout: 5000 }).then(() => true, () => false);
ok('the flight launched', flew);
const power = await page.evaluate(() => window.__hd.gstate.kiteBest);
console.log(`   release power ${power}%`);

await shotAt('launch', 1200, 'ascend');
await shotAt('launch', 3600, 'aloft');

// settled-aloft stillness window, then reel in
await sleep(900);
const heldOwn = await page.evaluate(() => { window.__mk.settled = window.__t.length; return window.__hd.camDbg().own; });
await sleep(700);
await page.evaluate(() => { window.__mk.settledEnd = window.__t.length; });

await page.evaluate(() => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }));
  window.__mk.reel = performance.now();
  setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'e' })), 80);
});
await shotAt('reel', 600, 'reel');
await shotAt('reel', 1250, 'release');
await sleep(1600);
const after = await page.evaluate(() => ({ own: window.__hd.camDbg().own, fov: +window.__hd.camDbg().fov.toFixed(2), flying: window.__hd.gstate.idleBusy }));

const S = await page.evaluate(() => window.__t);
const MK = await page.evaluate(() => window.__mk);
await page.close();

// ---- settled-aloft stillness (camstab thresholds, issue 039) ----
const seg = S.slice(MK.settled, MK.settledEnd);
const qang = (a, b) => { const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]); return 2 * Math.acos(Math.min(1, d)); };
let mf = 0, mp = 0, ma = 0;
for (let i = 1; i < seg.length; i++) { const a = seg[i - 1], b = seg[i];
  mf = Math.max(mf, Math.abs(b.fov - a.fov));
  mp = Math.max(mp, Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
  ma = Math.max(ma, qang([a.qx, a.qy, a.qz, a.qw], [b.qx, b.qy, b.qz, b.qw])); }
const angPx = seg.length ? ma / (seg[seg.length - 1].fov * Math.PI / 180) * 720 : 999;
ok('settled-aloft frames sampled', seg.length >= 25, seg.length + ' frames');
ok('fov still while aloft', mf <= 0.02, `d-fov ${mf.toFixed(4)} deg/frame`);
ok('camera position still while aloft', mp <= 0.004, `d-pos ${mp.toFixed(5)} m/frame`);
ok('camera aim still while aloft', angPx <= 1.2, `d-ang ${angPx.toFixed(2)} px/frame`);
ok('camera released to the chase cam', after.own === null, 'own=' + after.own);
ok('fov home after the flight', Math.abs(after.fov - 50) < 1.5, 'fov=' + after.fov);
ok('canary echoed', canaries.some(c => c.includes(CANARY)));
ok('no [framework]/[econ] warns', warns.length === 0, warns.join(' | '));
ok('no console/page errors', errors.length === 0, errors.join(' | '));
console.log(`   owner while aloft: ${heldOwn}`);

writeFileSync(join(here, `tmp-132-trace-${LABEL}.json`), JSON.stringify({ label: LABEL, power, marks: MK, heldOwn, after, samples: S }));
console.log(`   trace -> tools/tmp-132-trace-${LABEL}.json (${S.length} samples)`);

await browser.close(); vite.kill();
const fails = results.filter(r => !r).length;
console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'KITE CAM RUN OK (' + LABEL + ')'));
process.exit(fails ? 1 : 0);
