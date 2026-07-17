// tmp (080): SEA GLASS beachcombing verify. (a) plain-node beachH/dune check of
// the 6 spots; then own vite + canary + console capture: (b) dog-beach glint
// framing shot; (c) pocket two colors (dibs +5 first, +2 repeat, meshes hidden);
// (d) journal Sea glass section w/ 2 color rows; (e) reload → colors persist +
// spots respawn; (f) fresh Montrose load → the rare BLUE, pocket it → 3 colors;
// (h) draw calls at each beach view. Usage: node tools/tmp-080-seaglass-verify.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import puppeteer from 'puppeteer';
import * as CH from '../src/data/chicago.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, 'shots');
mkdirSync(outDir, { recursive: true });
const port = +(process.argv[2] || 5390);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const results = [];
const ok = (n, p, x = '') => { results.push(p); console.log(`${p ? 'ok  ' : 'FAIL'} ${n}${x ? '  — ' + x : ''}`); };

// ---------- (a) plain node: the 6 spots are on sand, none in the plover dune ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = t => t * t * (3 - 2 * t);
function beachH(x, z) { const b = CH.DOG_BEACH.bounds, s = CH.DOG_BEACH.slope;
  if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) { const t = clamp((z - s.ref) / s.span, 0, 1); return s.depth * smooth(t); }
  return CH.montroseBeachH(x, z); }
const SPOTS = [
  { x: 94, z: -339, color: 'green', beach: 'dog' }, { x: 100, z: -337, color: 'brown', beach: 'dog' },
  { x: 107, z: -339, color: 'white', beach: 'dog' }, { x: 216, z: -1430, color: 'green', beach: 'mtr' },
  { x: 222, z: -1444, color: 'white', beach: 'mtr' }, { x: 212, z: -1468, color: 'blue', beach: 'mtr' },
];
console.log('--- (a) the 6 sea-glass spots: on sand + outside the roped plover dune ---');
let allSand = true, noneDune = true;
for (const s of SPOTS) {
  const h = beachH(s.x, s.z), dune = CH.inMontroseDune(s.x, s.z), carved = CH.beachCarved(s.x, s.z);
  if (h === null) allSand = false; if (dune || carved) noneDune = false;
  console.log(`  ${s.beach} ${s.color} (${s.x},${s.z}): beachH=${h === null ? 'NULL' : h.toFixed(3)}  inDune=${dune}  carved=${carved}`);
}
ok('(a) all 6 spots on sand (beachH !== null)', allSand);
ok('(a) no spot inside the plover dune / carve', noneDune);

// ---------- boot vite ----------
const canary = () => 'sg' + Math.floor(Math.random() * 1e6);
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'], { cwd: root });
await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('vite timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d)); });

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const warns = [], errors = [], canaries = [];
const isNoise = t => t.includes('favicon') || t.includes('404') || t.includes('manifest') || t.includes('sw.js') || t.includes('goatcounter');
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !isNoise(t)) errors.push(t); else if (t.startsWith('[canary]')) canaries.push(t); if (t.includes('[framework]') || t.includes('[econ]')) warns.push(t); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

const waitReady = async () => { await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 }); await sleep(700); };
const tele = (x, z) => page.evaluate((x, z) => { const p = window.__hd.player; p.x = x; p.z = z; p.vx = p.vz = 0; }, x, z);
const pressE = async () => { await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' })));
  await sleep(160); await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'e' }))); await sleep(260); };
const dibs = () => page.evaluate(() => window.__hd.econ.save().dibs);
const bagN = () => page.evaluate(() => window.__hd.econ.bag.count('sea-glass'));
const toastMain = () => page.evaluate(() => document.getElementById('toastMain').textContent);
const draws = () => page.evaluate(() => window.__hd.perf().drawCalls);
const promptLbl = () => page.evaluate(() => document.getElementById('promptlabel').textContent);
// visible glass lumps (flattened Icosahedron) whose x is in a beach's x-range
const visLumps = (x0, x1) => page.evaluate((x0, x1) => { let n = 0;
  window.__hd.scene.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === 'IcosahedronGeometry'
    && o.visible && o.position.x >= x0 && o.position.x <= x1) n++; }); return n; }, x0, x1);
const freeCam = (yaw, pitch, dist) => page.evaluate((yaw, pitch, dist) => {
  const c = window.__hd.input.cam; c.freeT = 999; c.yaw = yaw; c.pitch = pitch; c.dist = dist; }, yaw, pitch, dist);
const openJournal = async () => { await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' })));
  await sleep(120); await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'j' }))); await sleep(250); };
const journalHTML = () => page.evaluate(() => document.getElementById('journalBody').innerHTML);

// ---------- clean-slate boot at the dog beach ----------
const c1 = canary();
await page.goto(`http://localhost:${port}/?play=1&quiet=1&x=100&z=-356&canary=${c1}`, { waitUntil: 'networkidle0', timeout: 60000 });
await waitReady();
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle0', timeout: 60000 }); await waitReady();
ok('(i) canary echoed (dog load)', canaries.some(c => c.includes(c1)));
ok('(c) fresh save: dibs 0', (await dibs()) === 0);
ok('(e-pre) all 3 dog-beach lumps present', (await visLumps(85, 115)) === 3, 'lumps=' + (await visLumps(85, 115)));

// ---------- (b) dog-beach glint framing shot ----------
await tele(98, -336); await sleep(300);
await freeCam(Math.PI + 0.35, 0.42, 5.2); await sleep(600);
const dogDraws = await draws();
await page.screenshot({ path: join(outDir, '080-glass-dogbeach.png') });
ok('(h) dog-beach draw calls <= 480', dogDraws <= 480, 'drawCalls=' + dogDraws);

// ---------- (c) pocket GREEN (first, +5) then BROWN (+2) ----------
// toasts QUEUE ~3 s each (wallet's "your first dibs!" gold toast lands in front
// of the pack's own line on the first-ever earn) — poll until the expected
// toast rotates in instead of sampling the instant after the press.
const toastEventually = async (sub, ms = 11000) => { const t0 = Date.now();
  while (Date.now() - t0 < ms) { if ((await toastMain()).includes(sub)) return true; await sleep(250); } return false; };
await tele(94, -339); await sleep(300);
ok('(c) prompt reads "pocket the sea glass" at the green spot', (await promptLbl()) === 'pocket the sea glass', 'label=' + (await promptLbl()));
const d0 = await dibs();
await pressE();
const dAfterGreen = await dibs();
ok('(c) green pocket paid +5 (first)', dAfterGreen - d0 === 5, `${d0} -> ${dAfterGreen}`);
ok('(c) green toast shows "sea glass — green"', await toastEventually('sea glass — green'), await toastMain());
ok('(c) bag has 1 sea glass', (await bagN()) === 1, 'count=' + (await bagN()));
ok('(c) green lump hidden (2 of 3 dog lumps left)', (await visLumps(85, 115)) === 2, 'lumps=' + (await visLumps(85, 115)));
await tele(100, -337); await sleep(300);
await pressE();
const dAfterBrown = await dibs();
ok('(c) brown pocket paid +2 (repeat)', dAfterBrown - dAfterGreen === 2, `${dAfterGreen} -> ${dAfterBrown}`);
ok('(c) brown toast shows "sea glass — brown"', await toastEventually('sea glass — brown'), await toastMain());
ok('(c) 2 pieces pocketed', (await bagN()) === 2, 'count=' + (await bagN()));
ok('(c) brown lump hidden (1 of 3 dog lumps left)', (await visLumps(85, 115)) === 1, 'lumps=' + (await visLumps(85, 115)));
// SHOT: the toast + dibs pop
const popTxt = await page.evaluate(() => document.getElementById('dibsPop').textContent);
await page.screenshot({ path: join(outDir, '080-glass-pocket.png') });
ok('(c) dibs pop shows dibs', /dibs/.test(popTxt), 'pop=' + popTxt);

// ---------- (d) journal: Sea glass section with 2 color rows ----------
await openJournal();
let jh = await journalHTML();
ok('(d) journal has a Sea glass section', /Sea glass/.test(jh));
ok('(d) journal shows green + brown, not blue', jh.includes('>green<') && jh.includes('>brown<') && !jh.includes('cobalt'), 'rows');
ok('(d) journal shows "2 pieces"', /2 pieces/.test(jh), 'pocket-total');
await page.screenshot({ path: join(outDir, '080-glass-journal.png') });
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' })));   // close
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'j' })));
await sleep(200);

// ---------- (e) reload: colors persist + spots respawn ----------
await sleep(3900);   // let the ~3s counter snapshot + ~600ms save debounce persist state.seaGlass
await page.reload({ waitUntil: 'networkidle0', timeout: 60000 }); await waitReady();
ok('(i) canary re-echoed (reload)', canaries.some(c => c.includes(c1)));
// 10 = +3 zone first-discovery (dog beach) + 5 green + 2 brown, ALL persisted
ok('(e) colors persisted: dibs still 10', (await dibs()) === 10, 'dibs=' + (await dibs()));
await openJournal();
jh = await journalHTML();
ok('(e) journal still shows green + brown after reload', /Sea glass/.test(jh) && jh.includes('>green<') && jh.includes('>brown<'));
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' })));
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'j' })));
await sleep(200);
ok('(e) all 3 dog-beach lumps respawned', (await visLumps(85, 115)) === 3, 'lumps=' + (await visLumps(85, 115)));

// ---------- (f) fresh Montrose load: the rare BLUE, pocket it → 3 colors ----------
const c2 = canary();
await page.goto(`http://localhost:${port}/?play=1&quiet=1&x=214&z=-1445&canary=${c2}`, { waitUntil: 'networkidle0', timeout: 60000 });
await waitReady();
ok('(i) canary echoed (Montrose load)', canaries.some(c => c.includes(c2)));
ok('(f) 3 Montrose lumps present', (await visLumps(200, 240)) === 3, 'lumps=' + (await visLumps(200, 240)));
// frame the blue spot
await tele(212, -1465); await sleep(300);
await freeCam(Math.PI + 0.35, 0.42, 5.2); await sleep(600);
const mtrDraws = await draws();
await page.screenshot({ path: join(outDir, '080-glass-montrose-blue.png') });
ok('(h) Montrose-beach draw calls <= 480', mtrDraws <= 480, 'drawCalls=' + mtrDraws);
// pocket blue
await tele(212, -1468); await sleep(300);
const dPre = await dibs();
await pressE();
ok('(f) blue toast shows "the rare one. cobalt."', (await toastMain()).includes('sea glass — cobalt blue'), await toastMain());
ok('(f) blue pocket paid +2 (seaglass key already firsted)', (await dibs()) - dPre === 2, `${dPre} -> ${await dibs()}`);
await openJournal();
jh = await journalHTML();
const colorRows = (jh.match(/border-radius:50%/g) || []).length;
ok('(f) journal now shows 3 colors (green, brown, blue)', colorRows === 3 && jh.includes('cobalt'), 'rows=' + colorRows);
await page.screenshot({ path: join(outDir, '080-glass-montrose-journal.png') });

// ---------- (i) no errors / no econ warns ----------
ok('(i) no [framework]/[econ] warns', warns.length === 0, warns.join(' | '));
ok('(i) no console errors', errors.length === 0, errors.join(' | '));

console.log('\n--- DRAW CALLS ---');
console.log('  dog beach view:      ' + dogDraws + ' / 480');
console.log('  Montrose beach view: ' + mtrDraws + ' / 480');

const fails = results.filter(r => !r).length;
console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL SEA-GLASS CHECKS PASSED'));
await browser.close(); vite.kill(); process.exit(fails ? 1 : 0);
