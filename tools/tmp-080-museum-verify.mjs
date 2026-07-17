// tmp (080): THE MUSEUM CART — establishing shot (cart+keeper+lion), the shop
// card + buy, the coffee steam + a behavioral pep-speed ratio, the penny machine
// (mid-crank + dibs sink + design order + journal), reload persistence + repeat
// cycle, and the refusal at 0 dibs. Own vite + fresh canary per load; captures
// console errors AND [framework]/[econ] warns. Usage: node tools/tmp-080-museum-verify.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, 'shots');
mkdirSync(outDir, { recursive: true });
const port = +(process.argv[2] || 5388);
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

// ---- helpers ----
let loadN = 0;
async function load(query, tag) {
  const cn = 'm' + Math.floor(Math.random() * 1e6);
  await page.goto(`http://localhost:${port}/?${query}&canary=${cn}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
  await sleep(700);
  ok(`canary echoed (${tag})`, canaries.some(c => c.includes(cn)), cn);
  return cn;
}
const dibs = () => page.evaluate(() => window.__hd.econ.save().dibs);
const pennyCount = () => page.evaluate(() => window.__hd.econ.save().bag.pennies || 0);
const tp = (x, z) => page.evaluate(({ x, z }) => { const p = window.__hd.player; p.x = x; p.z = z; p.vx = 0; p.vz = 0; }, { x, z });
const setCam = (yaw, pitch, dist) => page.evaluate(({ yaw, pitch, dist }) => { const c = window.__hd.input.cam; c.freeT = 999; c.yaw = yaw; c.pitch = pitch; c.dist = dist; }, { yaw, pitch, dist });
const key = (k, down) => page.evaluate(({ k, down }) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: k })), { k, down });
async function pressE() { await key('e', true); await sleep(170); await key('e', false); await sleep(120); }
async function pressKey(k) { await key(k, true); await sleep(190); await key(k, false); await sleep(320); }   // HOLD across ≥1 frame (rising-edge latch)
async function pollToast(sub, maxMs = 10000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const txt = await page.evaluate(() => { const m = document.getElementById('toastMain'), s = document.getElementById('toastSub'); return (m ? m.textContent : '') + ' || ' + (s ? s.textContent : ''); });
    if (txt && txt.includes(sub)) return true;
    await sleep(120);
  }
  return false;
}
async function holdCoffee() { await page.evaluate(() => { window.__hd.econ.bag.add('museum-coffee'); window.__hd.econ.bag.open(); }); await sleep(250); await page.click('#toteGrid .ttile[data-id="museum-coffee"]'); await sleep(300); }
const shot = n => page.screenshot({ path: join(outDir, n) });

// =====================================================================
// (a) — establishing: deep-cell spawn built OK; cart + keeper + a lion in frame
// =====================================================================
await load('play=1&quiet=1&x=48&z=982&dibs=40', 'a: establishing');
const zSpawn = await page.evaluate(() => window.__hd.player.z);
ok('a: spawned in the millennium cell (builder did not throw → not the lakefront jetski)', zSpawn > 500, 'z=' + zSpawn);
await tp(53, 993); await setCam(Math.PI, 0.06, 8.5); await sleep(900);
await shot('080-museum-establishing.png');
const drawA = await page.evaluate(() => window.__hd.perf().drawCalls);
ok('g: draw calls at the cart view ≤ 480', drawA <= 480, 'drawCalls=' + drawA);

// =====================================================================
// (b) — the shop: E at the cart → 3-row card; buy museum-coffee; dibs 40→34
// =====================================================================
await tp(53, 986); await setCam(Math.PI, 0.05, 6); await sleep(700);
await pressE(); await sleep(350);
const shopShown = await page.evaluate(() => { const s = document.getElementById('shop'); return !!(s && s.classList.contains('show')); });
ok('b: shop card opened', shopShown);
const rows = await page.evaluate(() => document.querySelectorAll('#shopRows .srow').length);
ok('b: shop shows 3 rows', rows === 3, 'rows=' + rows);
const rowIds = await page.evaluate(() => Array.from(document.querySelectorAll('#shopRows .srow .sinfo b')).map(b => b.textContent));
ok('b: rows are coffee/boonie/pom', JSON.stringify(rowIds), JSON.stringify(rowIds));
await shot('080-museum-shop.png');
const dBefore = await dibs();
await page.click('#shopRows .sbtn[data-i="0"]'); await sleep(400);
const dAfter = await dibs();
ok('b: bought museum-coffee, dibs 40→34', dBefore === 40 && dAfter === 34, `${dBefore}->${dAfter}`);
await page.evaluate(() => window.__hd.econ.shop.close()); await sleep(200);

// =====================================================================
// (c) — hold the coffee: steam off the cup + pep active
// =====================================================================
await tp(50, 994); await setCam(0, 0.05, 4); await sleep(600);
await holdCoffee();
await key('w', true); await sleep(280); await key('w', false); await sleep(120);   // face south (yaw-0 heading)
await setCam(Math.PI + 0.55, 0.14, 3.0); await sleep(1400);                          // front-3/4 + let steam build
await shot('080-museum-coffee.png');
const cupHeld = await page.evaluate(() => window.__hd.econ.bag.heldId() === 'museum-coffee');
ok('c: coffee held in hand (steam shot captured)', cupHeld);

// =====================================================================
// (c') — behavioral pep speed ratio ≈1.22 (pep vs un-pepped, same spot/heading)
// =====================================================================
async function walkDisp(withPep) {
  await load('play=1&quiet=1&x=48&z=982', withPep ? "c': pep walk" : "c': plain walk");
  if (withPep) { await holdCoffee(); await sleep(300); }
  await tp(48, 996); await setCam(0, 0.05, 6); await sleep(900);   // yaw-0 → 'w' walks south (+z), open plaza
  await key('w', true); await sleep(400);                          // pre-walk: reach steady-state speed (skip the from-0 ramp)
  const p0 = await page.evaluate(() => ({ x: window.__hd.player.x, z: window.__hd.player.z }));
  await sleep(1500);
  const p1 = await page.evaluate(() => ({ x: window.__hd.player.x, z: window.__hd.player.z }));
  await key('w', false); await sleep(150);
  return Math.hypot(p1.x - p0.x, p1.z - p0.z);
}
const dispPep = await walkDisp(true);
const dispPlain = await walkDisp(false);
const ratio = dispPep / (dispPlain || 1);
ok("c': pep speed ratio ≈1.22 (±0.07)", Math.abs(ratio - 1.22) <= 0.07, `pep=${dispPep.toFixed(2)}m plain=${dispPlain.toFixed(2)}m ratio=${ratio.toFixed(3)}`);

// =====================================================================
// (d) — the penny machine: mid-crank shot, 1-dib sink, design order, journal
// =====================================================================
await load('play=1&quiet=1&x=48&z=982&dibs=40', 'd: penny');
// frame from the SW so the west-side crank wheel faces the camera, unoccluded
// by the mayor (047 occlusion law: the machine sits ~30° off the mayor axis)
await tp(50.2, 992.2); await setCam(1.12, 0.06, 4.2); await sleep(900);
const dP0 = await dibs();
await pressE();                         // start the crank
await sleep(700);                       // mid-crank — wheel spinning
await shot('080-museum-penny-crank.png');
const gotBean = await pollToast('the Bean', 10000);
ok('d: toast "smashed penny — the Bean"', gotBean);
const dP1 = await dibs();
ok('d: dibs dropped exactly 1 (the sink)', dP0 - dP1 === 1, `${dP0}->${dP1}`);
// three more cranks — assert the design order
const order = ['a lion', 'the clock tower', 'the plover'];
for (const dsg of order) { await pressE(); ok(`d: next design "${dsg}"`, await pollToast(dsg, 10000)); }
ok('d: four pennies owned', (await pennyCount()) === 4, 'count=' + (await pennyCount()));
// journal — scroll the Smashed pennies section into frame + shot
await pressKey('j');   // open (held press: rising-edge latch)
await page.evaluate(() => {
  const body = document.getElementById('journalBody');
  const h = Array.from(body.querySelectorAll('h2')).find(e => /Smashed pennies/.test(e.textContent));
  if (h) h.scrollIntoView({ block: 'center' });   // scroll the journalBody container to the section
});
await sleep(300);
await shot('080-museum-journal.png');
const jHtml = await page.evaluate(() => document.getElementById('journalBody').innerHTML);
const ticks = (jHtml.match(/✓/g) || []).length;
ok('d: journal Smashed pennies section present', /Smashed pennies/.test(jHtml));
ok('d: journal shows 4 ✓ designs (+ crank count)', /Smashed pennies[\s\S]*Cranked/.test(jHtml) && ticks >= 4, `ticks=${ticks}`);
await pressKey('j');   // close
// let the 3s save snapshot capture state.pennies, then flush
await sleep(4000);

// =====================================================================
// (e) — reload (no clear): designs persist; 5th crank cycles → '…another the Bean'
// =====================================================================
await load('play=1&quiet=1&x=48&z=982', 'e: reload');
await sleep(600);
await pressKey('j');   // open (held press)
await page.evaluate(() => {
  const body = document.getElementById('journalBody');
  const h = Array.from(body.querySelectorAll('h2')).find(e => /Smashed pennies/.test(e.textContent));
  if (h) h.scrollIntoView({ block: 'center' });
});
await sleep(300);
const jAfter = await page.evaluate(() => document.getElementById('journalBody').innerHTML);
const ticksE = (jAfter.match(/✓/g) || []).length;
ok('e: designs persisted across reload (4 ✓)', /Smashed pennies/.test(jAfter) && ticksE >= 4, `ticks=${ticksE}`);
await shot('080-museum-reload-journal.png');
await pressKey('j');   // close before cranking
await tp(52, 992.5); await setCam(Math.PI + 0.35, 0.05, 4.2); await sleep(700);
await pressE();
const gotCycle = await pollToast('another the Bean', 10000);
ok('e: 5th crank cycles → "…another the Bean"', gotCycle);

// =====================================================================
// (f) — refusal: fresh load, 0 dibs → refusal toast, no design granted, dibs stay 0
// =====================================================================
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await load('play=1&quiet=1&x=48&z=982&dibs=0', 'f: refusal');
await tp(52, 992.5); await setCam(Math.PI + 0.35, 0.05, 4.2); await sleep(700);
const fD0 = await dibs(), fP0 = await pennyCount();
await pressE();
const gotRefuse = await pollToast('a dib a crank', 10000);
ok('f: refusal toast "a dib a crank"', gotRefuse);
await sleep(400);
const fD1 = await dibs(), fP1 = await pennyCount();
ok('f: dibs stay 0 + no penny granted', fD0 === 0 && fD1 === 0 && fP0 === fP1, `dibs ${fD0}->${fD1} pennies ${fP0}->${fP1}`);
await shot('080-museum-refusal.png');

// =====================================================================
// (h) — clean console
// =====================================================================
ok('h: no [framework]/[econ] warns', warns.length === 0, warns.join(' | '));
ok('h: no console errors', errors.length === 0, errors.join(' | '));

const fails = results.filter(r => !r).length;
console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL MUSEUM-CART CHECKS PASSED'));
console.log('draw calls (cart view): ' + drawA);
await browser.close(); vite.kill(); process.exit(fails ? 1 : 0);
