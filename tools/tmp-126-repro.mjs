// tmp-126-repro — REPRODUCE issue 039: the South Pond night-heron scope "just
// vibrates". Spawns its OWN vite (never the foreign 5173), walks up to the
// scope, presses E, samples the camera every frame, and grabs consecutive
// screenshots so frame-to-frame jitter lands on disk.
//   node tools/tmp-126-repro.mjs [port]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const OUT = join(here, 'shots');
const PORT = +(process.argv[2] || 5266);

// ---- own vite ----------------------------------------------------------
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PORT), '--strictPort'], { cwd: root });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite did not start')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').includes('localhost:' + PORT)) { clearTimeout(t); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});
console.log('vite up on ' + PORT);

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [], canary = [];
const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !isNoise(t)) errors.push('[console.error] ' + t); else if (t.startsWith('[canary]')) canary.push(t); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

const sleep = ms => new Promise(r => setTimeout(r, ms));
await page.goto(`http://localhost:${PORT}/?play=1&x=-20.5&z=983.2&canary=t126repro`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start').click(); });
await sleep(3000);

console.log('GROUND ' + JSON.stringify(await page.evaluate(() => ({
  player: { x: +__hd.player.x.toFixed(2), y: +__hd.player.y.toFixed(2), z: +__hd.player.z.toFixed(2) },
  at: __hd.solidProbe(-20.5, 983.2), scope: __hd.solidProbe(-20.5, 981),
}))));

// ---- per-frame sampler (runs alongside the game's rAF loop) --------------
await page.evaluate(() => {
  window.__t126 = [];
  (function s() {
    const a = window.__hd.avatarFrac();
    window.__t126.push([+performance.now().toFixed(1), +a.fov.toFixed(4), +a.camDist.toFixed(4), +a.hFrac.toFixed(4), +a.wFrac.toFixed(4)]);
    if (window.__t126.length < 900) requestAnimationFrame(s);
  })();
});
await sleep(500);
const before = await page.evaluate(() => window.__t126.length);

// ---- press E: look through the scope ------------------------------------
await page.keyboard.down('e'); await sleep(160); await page.keyboard.up('e');
await sleep(250);
console.log('SESSION ' + JSON.stringify(await page.evaluate(() => ({
  overlay: document.getElementById('heronScope') ? getComputedStyle(document.getElementById('heronScope')).display : 'MISSING',
  scoped: window.__hd.gstate.heronScoped, idleBusy: window.__hd.gstate.idleBusy,
}))));

// ---- consecutive frames while the scope is held -------------------------
const shots = [];
for (let i = 0; i < 6; i++) { const f = join(OUT, `tmp126-repro-f${i}.png`); await page.screenshot({ path: f }); shots.push(f); await sleep(90); }
console.log('SHOTS ' + shots.map(s => s.split(/[\\/]/).pop()).join(' '));

const samples = await page.evaluate(() => window.__t126);
await browser.close(); vite.kill();

// ---- report -------------------------------------------------------------
const during = samples.slice(before, before + 90);
const fovs = during.map(s => s[1]), cds = during.map(s => s[2]), hs = during.map(s => s[3]);
const stat = a => a.length ? { min: +Math.min(...a).toFixed(3), max: +Math.max(...a).toFixed(3), last: a[a.length - 1] } : null;
let maxD = 0; for (let i = 1; i < fovs.length; i++) maxD = Math.max(maxD, Math.abs(fovs[i] - fovs[i - 1]));
let maxCD = 0; for (let i = 1; i < cds.length; i++) maxCD = Math.max(maxCD, Math.abs(cds[i] - cds[i - 1]));
console.log('\nframes sampled before/during: ' + before + '/' + during.length);
console.log('fov      ' + JSON.stringify(stat(fovs)) + '  max frame-to-frame delta ' + maxD.toFixed(3));
console.log('camDist  ' + JSON.stringify(stat(cds)) + '  max frame-to-frame delta ' + maxCD.toFixed(4));
console.log('mayor hFrac (screen half-height fraction) ' + JSON.stringify(stat(hs)));
console.log('fov series: ' + fovs.slice(0, 40).join(' '));

for (let i = 1; i < shots.length; i++) {
  const a = PNG.sync.read(fs.readFileSync(shots[i - 1])), b = PNG.sync.read(fs.readFileSync(shots[i]));
  const n = pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0.1 });
  console.log(`diff f${i - 1}->f${i}: ${n} px = ${(100 * n / (a.width * a.height)).toFixed(2)}%`);
}
console.log(canary.length ? 'CANARY ' + canary.join(' | ') : 'CANARY MISSING');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
