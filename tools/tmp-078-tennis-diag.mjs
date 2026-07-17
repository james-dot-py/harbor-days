// tmp (078): diagnose the tennis throw. Dumps player pos, the power meter, and
// every torus+sphere group (world pos, local pos, parent chain) at each step.
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const port = +(process.argv[2] || 5316);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'], { cwd: root });
await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('vite timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } }); vite.stderr.on('data', d => process.stderr.write(d)); });
const browser = await puppeteer.launch({ headless: 'new', args: ['--mute-audio'] });
const page = await browser.newPage();
page.on('console', m => { const t = m.text(); if (t.includes('[framework]') || t.includes('[kiosk]')) console.log('PAGE:', t); });
page.on('pageerror', e => console.log('PAGEERR:', e.message));
const key = async (k, ms) => { await page.evaluate(kk => window.dispatchEvent(new KeyboardEvent('keydown', { key: kk })), k); await sleep(ms); await page.evaluate(kk => window.dispatchEvent(new KeyboardEvent('keyup', { key: kk })), k); };
const dump = (tag) => page.evaluate((tg) => {
  const s = window.__hd.scene, THREE = window.__hd.THREE, v = new THREE.Vector3(), out = [];
  s.traverse(o => { if (o.type !== 'Group') return; let torus = false, sph = false;
    o.children.forEach(c => { if (c.geometry) { if (c.geometry.type === 'TorusGeometry') torus = true; if (c.geometry.type === 'SphereGeometry' && Math.abs((c.geometry.parameters.radius || 0) - 0.09) < 0.001) sph = true; } });
    if (torus && sph) { o.getWorldPosition(v); const chain = []; let p = o; while (p) { chain.push(p.type + (p.name ? ':' + p.name : '')); p = p.parent; }
      out.push({ world: [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)], local: [+o.position.x.toFixed(2), +o.position.y.toFixed(2), +o.position.z.toFixed(2)], chain: chain.join('<') }); } });
  const pm = document.getElementById('pwrmeter');
  return { tag: tg, player: { x: +window.__hd.player.x.toFixed(2), z: +window.__hd.player.z.toFixed(2), y: +(window.__hd.player.y || 0).toFixed(2) }, held: window.__hd.econ.bag.heldId(), meter: pm ? pm.style.display : '?', balls: out };
}, tag);

await page.goto(`http://localhost:${port}/?play=1&quiet=1&x=60&z=250&yaw=3.14&canary=diag`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
await sleep(1000);
console.log('after spawn:', JSON.stringify(await dump('spawn')));
await page.evaluate(() => { window.__hd.econ.bag.add('tennis-ball', 1); window.__hd.econ.bag.open(); });
await sleep(150);
await page.evaluate(() => document.querySelector('#toteGrid .ttile[data-id="tennis-ball"]').click());
await sleep(300);
console.log('after hold:', JSON.stringify(await dump('hold')));
// press e, check meter mid-charge
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' })));
await sleep(250);
console.log('mid-charge:', JSON.stringify(await dump('charge')));
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'e' })));
await sleep(300);
console.log('post-release:', JSON.stringify(await dump('release')));
await sleep(2500);
console.log('after settle:', JSON.stringify(await dump('settle')));
await browser.close(); vite.kill(); process.exit(0);
