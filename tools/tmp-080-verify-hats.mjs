// tmp (080): THE HATS — reload per hat for a deterministic front-3/4 framing,
// equip, assert each worn hat is exactly ONE BufferGeometry Mesh child of the
// mayor head (1 draw), then a mid-walk shot, a tote 'wearing' shot, and reload
// persistence. Own vite + canary. Usage: node tools/tmp-080-verify-hats.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, 'shots');
mkdirSync(outDir, { recursive: true });
const port = +(process.argv[2] || 5380);
const canary = 'h' + Math.floor(Math.random() * 1e6);
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
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !isNoise(t)) errors.push(t); else if (t.startsWith('[canary]')) canaries.push(t); if (t.includes('[framework]') || t.includes('[econ]')) warns.push(t); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

// hatStat: find the mayor GROUP (the Group at the player's x/z), grab its head
// Mesh (a child Mesh at local y≈2.22), and count that head's Mesh children — the
// worn hat. Reports whether each is a single childless BufferGeometry Mesh (1 draw).
const hatStat = () => page.evaluate(() => {
  const s = window.__hd.scene, THREE = window.__hd.THREE, p = window.__hd.player, v = new THREE.Vector3();
  let head = null, best = 0.6;
  s.traverse(o => {
    if (o.type !== 'Group') return;
    o.getWorldPosition(v);
    const d = Math.hypot(v.x - p.x, v.z - p.z);
    if (d >= best) return;
    const h = o.children.find(c => c.isMesh && c.position.y > 2.1 && c.position.y < 2.35);
    if (h) { head = h; best = d; }
  });
  if (!head) return { found: false, count: 0 };
  const hats = head.children.filter(c => c.isMesh);
  return { found: true, count: hats.length,
    single: hats.every(h => h.type === 'Mesh' && h.geometry.isBufferGeometry && h.children.length === 0 && h.material.vertexColors === true) };
});

// front-3/4 framing from a FRESH load (deterministic — the 078 recipe): press 'w'
// once so the mayor faces the yaw-0 heading, then hold a free cam in front.
const frontCam = async () => {
  await page.evaluate(k => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), 'w');
  await sleep(330);
  await page.evaluate(k => window.dispatchEvent(new KeyboardEvent('keyup', { key: k })), 'w');
  await page.evaluate(() => { const c = window.__hd.input.cam; c.freeT = 999; c.yaw = Math.PI + 0.6; c.pitch = 0.05; c.dist = 4.0; });
  await sleep(500);
};

const HATS = ['bucket-hat', 'cubs-cap', 'pom-hat', 'flower-crown', 'boonie-hat', 'pirate-hat'];
const SPAWN = `play=1&quiet=1&x=100&z=-345&yaw=0&pitch=0.1&dist=4.2&canary=${canary}`;
const load = async () => { await page.goto(`http://localhost:${port}/?${SPAWN}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 }); await sleep(600); };

// ---- each hat: fresh load, equip, structural 1-draw check, front-3/4 shot ----
for (const id of HATS) {
  await load();
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.evaluate(i => { window.__hd.econ.bag.add(i, 1); window.__hd.econ.bag.equip(i); }, id);
  await sleep(250);
  if (id === HATS[0]) ok('canary echoed', canaries.some(c => c.includes(canary)));
  ok(`${id}: worn`, (await page.evaluate(() => window.__hd.econ.save().worn)) === id);
  const st = await hatStat();
  ok(`${id}: exactly one hat mesh under head`, st.found && st.count === 1, JSON.stringify(st));
  ok(`${id}: single childless vc BufferGeometry Mesh (1 draw)`, st.single, JSON.stringify(st));
  await frontCam();
  if (id === 'pirate-hat') {   // paper-white hat: pitch the cam up so the head reads against GRASS, not the white tree
    await page.evaluate(() => { const c = window.__hd.input.cam; c.freeT = 999; c.pitch = 0.34; c.dist = 3.6; });
    await sleep(400);
  }
  await page.screenshot({ path: join(outDir, `hats-${id}.png`) });
}

// ---- mid-walk: the hat rides the head transform ----
// Settle the SAME clear framing the static shots use FIRST, then shoot ~170 ms
// into a walk — the earlier recipe walked 280 ms from an unsettled cam and the
// orbit followed the mayor into the DOG BEACH sign board (beige filled the frame).
await load();
await page.evaluate(() => { window.__hd.econ.bag.add('boonie-hat'); window.__hd.econ.bag.equip('boonie-hat'); });
await frontCam();
await page.evaluate(k => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), 'w');
await sleep(170);
await page.screenshot({ path: join(outDir, 'hats-walk.png') });
ok('mid-walk: hat still one mesh under head', (await hatStat()).count === 1);
await page.evaluate(k => window.dispatchEvent(new KeyboardEvent('keyup', { key: k })), 'w');
await sleep(300);

// ---- tote card: all six owned, one worn -> 'wearing' marker ----
await load();
await page.evaluate(hats => { for (const i of hats) window.__hd.econ.bag.add(i, 1); window.__hd.econ.bag.equip('flower-crown'); window.__hd.econ.bag.open(); }, HATS);
await sleep(300);
ok('tote: shows a "wearing" marker', await page.evaluate(() => /wearing/i.test(document.getElementById('toteGrid').innerHTML)));
ok('tote: all six hat tiles present', await page.evaluate(h => h.every(id => document.querySelector(`#toteGrid .ttile[data-id="${id}"]`)), HATS));
await page.screenshot({ path: join(outDir, 'hats-tote.png') });
await page.evaluate(() => window.__hd.econ.bag.close());

// ---- persistence: equip -> wait > save debounce -> reload -> auto-worn ----
await page.evaluate(() => window.__hd.econ.bag.equip('pirate-hat'));
await sleep(900);
await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
await sleep(1200);
ok('reload: worn persisted', (await page.evaluate(() => window.__hd.econ.save().worn)) === 'pirate-hat');
ok('reload: hat auto re-parented (one mesh under head)', (await hatStat()).count === 1);
await frontCam();
// the reload hat is the PIRATE — same white-on-white trap as its static shot
await page.evaluate(() => { const c = window.__hd.input.cam; c.freeT = 999; c.pitch = 0.34; c.dist = 3.6; });
await sleep(400);
await page.screenshot({ path: join(outDir, 'hats-reload.png') });

ok('no [framework]/[econ] warns', warns.length === 0, warns.join(' | '));
ok('no console errors', errors.length === 0, errors.join(' | '));

const fails = results.filter(r => !r).length;
console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL HAT CHECKS PASSED'));
await browser.close(); vite.kill(); process.exit(fails ? 1 : 0);
