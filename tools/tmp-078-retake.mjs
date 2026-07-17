// tmp (078): clean retakes — the mayor holding popcorn WITH the bucket hat
// (front 3/4), and the tennis ball resting on the ground with the pickup prompt.
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import puppeteer from 'puppeteer';
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, 'shots', '078');
mkdirSync(outDir, { recursive: true });
const port = +(process.argv[2] || 5319);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'], { cwd: root });
await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('vite timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } }); vite.stderr.on('data', d => process.stderr.write(d)); });
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const key = async (k, ms) => { await page.evaluate(kk => window.dispatchEvent(new KeyboardEvent('keydown', { key: kk })), k); await sleep(ms); await page.evaluate(kk => window.dispatchEvent(new KeyboardEvent('keyup', { key: kk })), k); };

// ---- hat + popcorn front 3/4 ----
await page.goto(`http://localhost:${port}/?play=1&quiet=1&x=60&z=250&yaw=0&pitch=0.1&dist=4.4&canary=retake`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await sleep(700);
await page.evaluate(() => { window.__hd.econ.bag.add('bucket-hat', 1); window.__hd.econ.bag.equip('bucket-hat'); window.__hd.econ.bag.add('popcorn', 1); window.__hd.econ.bag.open(); });
await sleep(150);
await page.evaluate(() => document.querySelector('#toteGrid .ttile[data-id="popcorn"]').click());
await sleep(250);
await key('w', 350);   // mayor faces the move dir (= cam.yaw = 0, i.e. +z)
await page.evaluate(() => { const c = window.__hd.input.cam; c.freeT = 999; c.yaw = Math.PI + 0.7; c.pitch = 0.03; c.dist = 4.0; });
await sleep(600);
await page.screenshot({ path: join(outDir, 'hat-4-popcorn.png') });

// ---- tennis ball resting on the ground + pickup prompt (clean down-view) ----
await page.goto(`http://localhost:${port}/?play=1&quiet=1&x=60&z=250&yaw=3.14&pitch=0.2&dist=8&canary=retake`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
await sleep(700);
await page.evaluate(() => { window.__hd.econ.bag.add('tennis-ball', 1); window.__hd.econ.bag.open(); });
await sleep(150);
await page.evaluate(() => document.querySelector('#toteGrid .ttile[data-id="tennis-ball"]').click());
await sleep(250);
await key('e', 520);   // charge-throw
await sleep(2600);
// find the resting ball, stand the player just south of it, look north-down at it
const ball = await page.evaluate(() => {
  const s = window.__hd.scene, THREE = window.__hd.THREE, v = new THREE.Vector3(); let r = null;
  s.traverse(o => { if (r || o.type !== 'Group' || o.children.length > 4) return; let t = false, sp = false;
    o.children.forEach(c => { if (c.geometry) { if (c.geometry.type === 'TorusGeometry') t = true; if (c.geometry.type === 'SphereGeometry' && Math.abs((c.geometry.parameters.radius || 0) - 0.09) < 0.001) sp = true; } });
    if (t && sp) { o.getWorldPosition(v); r = { x: v.x, y: v.y, z: v.z }; } });
  return r;
});
await page.evaluate(b => { window.__hd.player.x = b.x; window.__hd.player.z = b.z + 2.4; const c = window.__hd.input.cam; c.freeT = 999; c.yaw = Math.PI; c.pitch = 0.42; c.dist = 4.2; }, ball);
await sleep(700);
await page.screenshot({ path: join(outDir, 'tennis-1-rest.png') });
console.log('retakes done; ball at', JSON.stringify(ball));
await browser.close(); vite.kill(); process.exit(0);
