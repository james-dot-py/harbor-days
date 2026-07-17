// tmp (078): TENNIS BALL (no-dog throw + pickup) and BUCKET HAT (4 fit poses +
// unequip + reload auto-worn). Own vite + canary. Camera framing via
// __hd.input.cam (freeT held) after a brief move sets the mayor's facing.
// Usage: node tools/tmp-078-verify-tennis-hat.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, 'shots', '078');
mkdirSync(outDir, { recursive: true });
const port = +(process.argv[2] || 5314);
const canary = 'th' + Math.floor(Math.random() * 1e6);
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

const key = async (k, ms) => { await page.evaluate(kk => window.dispatchEvent(new KeyboardEvent('keydown', { key: kk })), k); await sleep(ms); await page.evaluate(kk => window.dispatchEvent(new KeyboardEvent('keyup', { key: kk })), k); };
// find the thrown/held tennis ball group (unique: a SMALL Group with a Torus seam
// + r0.09 sphere — the <=4 child gate excludes the huge cell-lakefront root, which
// also happens to contain a torus + an r0.09 sphere among its thousands of kids).
const ballWorld = () => page.evaluate(() => {
  const s = window.__hd.scene, THREE = window.__hd.THREE, v = new THREE.Vector3(); let r = null;
  s.traverse(o => { if (r || o.type !== 'Group' || o.children.length > 4) return; let torus = false, sph = false;
    o.children.forEach(c => { if (c.geometry) { if (c.geometry.type === 'TorusGeometry') torus = true; if (c.geometry.type === 'SphereGeometry' && Math.abs((c.geometry.parameters.radius || 0) - 0.09) < 0.001) sph = true; } });
    if (torus && sph) { o.getWorldPosition(v); r = { x: v.x, y: v.y, z: v.z, parent: o.parent && o.parent.type }; } });
  return r;
});
// the bucket-hat crown (Cylinder radiusTop 0.42) parented under the mayor's head Mesh
const hatOnHead = () => page.evaluate(() => {
  const s = window.__hd.scene; let found = false;
  s.traverse(o => { if (o.geometry && o.geometry.type === 'CylinderGeometry' && Math.abs((o.geometry.parameters.radiusTop || 0) - 0.42) < 0.001) {
    if (o.parent && o.parent.parent && o.parent.parent.type === 'Mesh') found = true; } });   // crown < hatGroup < head(Mesh)
  return found;
});

// ============================ TENNIS (no-dog) ============================
await page.goto(`http://localhost:${port}/?play=1&quiet=1&x=60&z=250&yaw=3.14&pitch=0.28&dist=8&canary=${canary}`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await sleep(800);
ok('canary echoed', canaries.some(c => c.includes(canary)));

await page.evaluate(() => { window.__hd.econ.bag.add('tennis-ball', 1); window.__hd.econ.bag.open(); });
await sleep(150);
await page.evaluate(() => document.querySelector('#toteGrid .ttile[data-id="tennis-ball"]').click());
await sleep(200);
ok('tennis-ball held', await page.evaluate(() => window.__hd.econ.bag.heldId()) === 'tennis-ball');

// charge-throw: hold E ~0.5 s then release
await key('e', 520);
await sleep(2600);   // let it fly + settle
const rest = await ballWorld();
ok('ball landed on the ground (low, in scene)', !!rest && rest.parent === 'Scene' && rest.y < 0.6, JSON.stringify(rest));
// pickup prompt appears when we stand at the ball
await page.evaluate(b => { window.__hd.player.x = b.x; window.__hd.player.z = b.z + 1.2; }, rest);
await sleep(500);
const prompt = await page.evaluate(() => { const p = document.getElementById('prompt'); return { show: p.style.display !== 'none', label: document.getElementById('promptlabel').textContent }; });
ok("'pick up the ball' prompt shows at the ball", prompt.show && /pick up the ball/i.test(prompt.label), JSON.stringify(prompt));
await page.screenshot({ path: join(outDir, 'tennis-1-rest.png') });
await key('e', 140);   // pick it up
await sleep(400);
const inHand = await ballWorld();
ok('ball returned to hand (in the hand rig, off the ground, near player)', !!inHand && inHand.parent === 'Group' && inHand.y > 0.4 && Math.hypot(inHand.x - rest.x, inHand.z - (rest.z + 1.2)) < 2.5, JSON.stringify(inHand));
await page.screenshot({ path: join(outDir, 'tennis-2-rehold.png') });

// ============================== BUCKET HAT ==============================
// front 3/4 framing helper: move briefly (mayor faces the move dir), then hold
// a free-orbit camera in FRONT of the mayor.
const frontCam = async (moveKey, yaw, pitch, dist) => {
  await key(moveKey, 350);
  await page.evaluate(([y, p, d]) => { const c = window.__hd.input.cam; c.freeT = 999; c.yaw = y; c.pitch = p; c.dist = d; }, [yaw, pitch, dist]);
  await sleep(500);
};

await page.goto(`http://localhost:${port}/?play=1&quiet=1&x=60&z=250&yaw=0&pitch=0.1&dist=4.4&canary=${canary}`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
await sleep(800);
await page.evaluate(() => { window.__hd.econ.bag.add('bucket-hat', 1); window.__hd.econ.bag.equip('bucket-hat'); });
await sleep(300);
ok('hat equipped (worn)', await page.evaluate(() => window.__hd.econ.save().worn) === 'bucket-hat');
ok('hat mesh parented to the mayor head', await hatOnHead());

// (1) stand close 3/4
await frontCam('w', 0 + Math.PI + 0.6, 0.04, 4.2);
await page.screenshot({ path: join(outDir, 'hat-1-stand.png') });
// (2) mid-jump
await page.evaluate(() => { const c = window.__hd.input.cam; c.freeT = 999; });
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })));
await sleep(230);   // ~apex
await page.screenshot({ path: join(outDir, 'hat-2-jump.png') });
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' })));
await sleep(900);
// (3) sitting on a bench (teleport to the south-lawn bench, press E to sit)
await page.evaluate(() => { window.__hd.player.x = 55; window.__hd.player.z = 230; });
await sleep(400);
await key('e', 140);   // sit
await sleep(900);
await page.evaluate(() => { const c = window.__hd.input.cam; c.freeT = 999; c.yaw = Math.PI - 0.5; c.pitch = 0.05; c.dist = 4.4; });
await sleep(400);
await page.screenshot({ path: join(outDir, 'hat-3-sit.png') });
// (4) holding popcorn (stand + hat + popcorn)
await page.evaluate(() => { window.__hd.player.x = 60; window.__hd.player.z = 250; window.__hd.econ.bag.add('popcorn', 1); window.__hd.econ.bag.open(); });
await sleep(150);
await page.evaluate(() => document.querySelector('#toteGrid .ttile[data-id="popcorn"]').click());
await sleep(200);
await frontCam('d', -Math.PI / 2 + Math.PI + 0.6, 0.03, 4.2);
await page.screenshot({ path: join(outDir, 'hat-4-popcorn.png') });

// unequip → gone
await page.evaluate(() => window.__hd.econ.bag.unequip());
await sleep(200);
ok('unequip → worn null', await page.evaluate(() => window.__hd.econ.save().worn) === null);
ok('hat mesh detached from head', !(await hatOnHead()));

// re-equip + reload same origin → auto-worn restored
await page.evaluate(() => { window.__hd.econ.bag.equip('bucket-hat'); });
await sleep(800);   // > 600 ms save debounce
await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
await sleep(1200);
ok('reload: worn persisted', await page.evaluate(() => window.__hd.econ.save().worn) === 'bucket-hat');
ok('reload: hat auto re-parented to head', await hatOnHead());
await frontCam('w', 0 + Math.PI + 0.6, 0.04, 4.2);
await page.screenshot({ path: join(outDir, 'hat-5-reload.png') });

ok('no [framework] warns', warns.length === 0, warns.join(' | '));
ok('no console errors', errors.length === 0, errors.join(' | '));

const fails = results.filter(r => !r).length;
console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL TENNIS+HAT CHECKS PASSED'));
await browser.close(); vite.kill(); process.exit(fails ? 1 : 0);
