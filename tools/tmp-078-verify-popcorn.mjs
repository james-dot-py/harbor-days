// tmp (078): POPCORN crumb-lure near the sanctuary gate. Own vite + canary.
// Holds popcorn via the tote, walks small circles ~10 s, screenshots birds
// pecking at the mayor's feet, then stows + waits and screenshots them gone.
// Asserts a live count of ground-birds near the player, and zero [framework] warns.
// Usage: node tools/tmp-078-verify-popcorn.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, 'shots', '078');
mkdirSync(outDir, { recursive: true });
const port = +(process.argv[2] || 5312);
const canary = 'pop' + Math.floor(Math.random() * 1e6);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'], { cwd: root });
await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('vite timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d)); });

const results = []; const ok = (n, p, x = '') => { results.push(p); console.log(`${p ? 'ok  ' : 'FAIL'} ${n}${x ? '  — ' + x : ''}`); };
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const warns = [], errors = [], canaries = [];
const isNoise = t => t.includes('favicon') || t.includes('404') || t.includes('manifest') || t.includes('sw.js') || t.includes('goatcounter');
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !isNoise(t)) errors.push(t); else if (t.startsWith('[canary]')) canaries.push(t); if (t.includes('[framework]')) warns.push(t); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

await page.goto(`http://localhost:${port}/?play=1&quiet=1&x=95&z=-347&yaw=3.0&pitch=0.3&dist=7.5&canary=${canary}`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
await sleep(2000);   // let the flock seed on approach
ok('canary echoed', canaries.some(c => c.includes(canary)));

// hold popcorn via the tote (bag.add → open → click the tile)
await page.evaluate(() => { window.__hd.econ.bag.add('popcorn', 1); window.__hd.econ.bag.open(); });
await sleep(150);
await page.evaluate(() => document.querySelector('#toteGrid .ttile[data-id="popcorn"]').click());
await sleep(200);
const held = await page.evaluate(() => window.__hd.econ.bag.heldId());
ok('popcorn held (heldId)', held === 'popcorn', 'heldId=' + held);

// walk small circles ~10 s (alternate wasd in short bursts so the player stays put-ish)
const dirs = ['w', 'd', 's', 'a'];
const countNearBirds = () => page.evaluate(() => {
  const s = window.__hd.scene, p = window.__hd.player; let near = 0, lowfar = 0;
  s.traverse(o => {
    if (o.userData && o.userData.spec && o.visible !== false) {
      o.updateWorldMatrix && o.updateWorldMatrix(true, false);
      const wx = o.matrixWorld.elements[12], wy = o.matrixWorld.elements[13], wz = o.matrixWorld.elements[14];
      const d = Math.hypot(wx - p.x, wz - p.z);
      if (d < 3.2 && wy < 0.7) near++;
      if (wy < 0.7) lowfar++;
    }
  });
  return { near, lowfar };
});
let peak = 0;
for (let i = 0; i < 16; i++) {
  const k = dirs[i % 4];
  await page.evaluate(kk => window.dispatchEvent(new KeyboardEvent('keydown', { key: kk })), k);
  await sleep(600);
  await page.evaluate(kk => window.dispatchEvent(new KeyboardEvent('keyup', { key: kk })), k);
  const c = await countNearBirds(); if (c.near > peak) peak = c.near;
}
const feedCount = await countNearBirds();
ok('birds pecking near the feet (<3.2 m, on ground)', peak >= 1, 'peak=' + peak + ' final=' + JSON.stringify(feedCount));
await page.screenshot({ path: join(outDir, 'popcorn-1-feed.png') });

// stow the popcorn (tote tile again → bagStow) and wait for the flock to disperse
await page.evaluate(() => { window.__hd.econ.bag.open(); });
await sleep(150);
await page.evaluate(() => document.querySelector('#toteGrid .ttile[data-id="popcorn"]').click());
await sleep(200);
const heldAfter = await page.evaluate(() => window.__hd.econ.bag.heldId());
ok('popcorn stowed', heldAfter === null, 'heldId=' + heldAfter);
await sleep(16000);   // > the 8-12 s lure timeout + the release flight home
const disperse = await countNearBirds();
ok('birds dispersed after stow (<3.2 m count back near 0)', disperse.near <= 1, 'near=' + disperse.near);
await page.screenshot({ path: join(outDir, 'popcorn-2-disperse.png') });

ok('no [framework] warns', warns.length === 0, warns.join(' | '));
ok('no console errors', errors.length === 0, errors.join(' | '));

const fails = results.filter(r => !r).length;
console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL POPCORN CHECKS PASSED'));
await browser.close(); vite.kill(); process.exit(fails ? 1 : 0);
