// tmp (080): LOLLA MERCH tent + the boombox-to-go. Own vite + per-load canary.
//   a. millennium deep-spawn (not the lakefront fallback) → tent+keeper+sign shot
//   b. browse → shop card (2 rows) → buy the boombox (dibs 60→25, row owned)
//   c. hold from the tote → heldId; R×2 rotate the station toasts; hold shot
//   d. walk ~15 m → R still cycles (radio works anywhere); ✋ prompt + E cycle
//   e. lakefront: seed+hold, R once, borrow the TOWEL box (our box leaves the
//      hand), put it back — proves the takeover/borrow interplay both ways
//   f. draw calls at the tent view   g. zero errors / [framework]/[econ] warns
// Usage: node tools/tmp-080-lolla-verify.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, 'shots');
mkdirSync(outDir, { recursive: true });
const port = +(process.argv[2] || 5386);
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
page.on('console', m => { const t = m.text();
  if (m.type() === 'error' && !isNoise(t)) errors.push(t);
  else if (t.startsWith('[canary]')) canaries.push(t);
  if (t.includes('[framework]') || t.includes('[econ]')) warns.push(t); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

// ---- helpers ----
const load = async (query, canary) => {
  await page.goto(`http://localhost:${port}/?${query}&canary=${canary}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
  await sleep(700);
  ok(`canary echoed (${canary})`, canaries.some(c => c.includes(canary)));
};
const key = async (k, hold = 150) => {
  await page.evaluate(k => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), k);
  await sleep(hold);
  await page.evaluate(k => window.dispatchEvent(new KeyboardEvent('keyup', { key: k })), k);
  await sleep(140);
};
const waitToast = async (match, ms = 10000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const cur = await page.evaluate(() => { const el = document.getElementById('toast'), m = document.getElementById('toastMain');
      return el && el.classList.contains('show') && m ? m.textContent : ''; });
    if (cur && cur.includes(match)) return cur;
    await sleep(120);
  }
  return null;
};
const promptLabel = () => page.evaluate(() => { const el = document.getElementById('prompt');
  return el && el.style.display !== 'none' ? (document.getElementById('promptlabel') || {}).textContent : ''; });
const frame = async (x, z, yaw, pitch, dist) => {
  await page.evaluate(({ x, z, yaw, pitch, dist }) => {
    const p = window.__hd.player; p.x = x; p.z = z; p.vx = 0; p.vz = 0;
    const c = window.__hd.input.cam; c.freeT = 999; c.yaw = yaw; c.pitch = pitch; c.dist = dist;
  }, { x, z, yaw, pitch, dist });
  await sleep(700);
};
const clickSel = sel => page.evaluate(s => { const el = document.querySelector(s); if (el) el.click(); return !!el; }, sel);

// =====================================================================
// LOAD 1 — MILLENNIUM (Butler Field). a/b/c/d/f
// =====================================================================
await load('play=1&quiet=1&x=205&z=920&dibs=60', 'lm' + Math.floor(Math.random() * 1e6));

// (a) deep-cell spawn landed in Grant Park, not the lakefront jetski fallback
const spawnZ = await page.evaluate(() => window.__hd.player.z);
ok('a: deep-cell spawn in the millennium cell (z>700)', spawnZ > 700, 'player.z=' + spawnZ.toFixed(1));

// tent + keeper + sign from the field approach (near-due-west so the +x MERCH
// sign reads head-on; mayor offset north so it falls clear of the tent)
await frame(222, 922, -1.52, 0.15, 8.0);
const drawTent = await page.evaluate(() => window.__hd.perf().drawCalls);
await page.screenshot({ path: join(outDir, '080-lolla-tent.png') });
ok('f: draw calls at the tent view <= 480', drawTent <= 480, 'drawCalls=' + drawTent);

// (b) browse -> shop card, 2 rows, buy the boombox
await frame(217, 926, -Math.PI / 2, 0.12, 7);
await key('e');
await sleep(300);
const shopRows = await page.evaluate(() => { const el = document.getElementById('shop');
  return el && el.classList.contains('show') ? document.querySelectorAll('#shopRows .srow').length : -1; });
ok('b: shop card open with 2 rows', shopRows === 2, 'rows=' + shopRows);
await page.screenshot({ path: join(outDir, '080-lolla-shop.png') });
const dibs0 = await page.evaluate(() => window.__hd.econ.wallet.dibs);
await clickSel('#shopRows .sbtn[data-i="0"]');
await sleep(300);
const dibs1 = await page.evaluate(() => window.__hd.econ.wallet.dibs);
ok('b: dibs 60 -> 25 after buying the boombox (35)', dibs0 === 60 && dibs1 === 25, `${dibs0}->${dibs1}`);
const rowOwned = await page.evaluate(() => { const r = document.querySelector('#shopRows .srow[data-i="0"]');
  return r ? /in your tote/i.test(r.innerHTML) : false; });
ok('b: boombox row flips to owned', rowOwned);

// (c) hold from the tote
await page.evaluate(() => window.__hd.econ.bag.open());
await sleep(250);
await clickSel('#toteGrid .ttile[data-id="boombox"]');
await sleep(300);
const heldId = await page.evaluate(() => window.__hd.econ.bag.heldId());
ok('c: heldId === boombox after tapping the tote tile', heldId === 'boombox', 'heldId=' + heldId);

// front-3/4 so the held box reads; face the mayor +z first
await page.evaluate(() => { const c = window.__hd.input.cam; c.freeT = 999; c.yaw = 0; });
await key('w', 420);
await frame(216, 931, Math.PI + 0.4, 0.05, 3.9);
await waitToast('BOOMBOX TO-GO');                       // drain the hold toast
await key('r');
const tHouse = await waitToast('WBMX');
ok('c: R#1 -> WBMX · HOUSE station toast', !!tHouse, tHouse || 'no toast');
await page.screenshot({ path: join(outDir, '080-lolla-hold.png') });
await key('r');
const tBlues = await waitToast('CHECKERBOARD');
ok('c: R#2 -> CHECKERBOARD · BLUES station toast', !!tBlues, tBlues || 'no toast');

// (d) walk ~15 m, then R still cycles (radio works anywhere)
await page.evaluate(() => { const c = window.__hd.input.cam; c.freeT = 999; c.yaw = 0; });
await page.evaluate(k => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), 'w');
await sleep(3000);
await page.evaluate(k => window.dispatchEvent(new KeyboardEvent('keyup', { key: k })), 'w');
await sleep(200);
const movedZ = await page.evaluate(() => window.__hd.player.z);
ok('d: walked ~15 m from the tent', movedZ - 926 > 10, 'z=' + movedZ.toFixed(1));
await key('r');
const tCubs = await waitToast('CUBS');
ok('d: R after the walk -> next station toast (radio works anywhere)', !!tCubs, tCubs || 'no toast');
const pl = await promptLabel();
ok("d: '✋ change the station' prompt present while held", pl === 'change the station', 'prompt="' + pl + '"');
await key('e');
const tLolla = await waitToast('LOLLA FM');
ok('d: pressing E fires a station change too', !!tLolla, tLolla || 'no toast');

// =====================================================================
// LOAD 2 — LAKEFRONT: the takeover/borrow interplay both directions. (e)
// =====================================================================
await load('play=1&quiet=1&x=147&z=158&dibs=10', 'lm' + Math.floor(Math.random() * 1e6));
await page.evaluate(() => window.__hd.econ.bag.add('boombox'));
await page.evaluate(() => window.__hd.econ.bag.open());
await sleep(250);
await clickSel('#toteGrid .ttile[data-id="boombox"]');
await sleep(300);
const heldE = await page.evaluate(() => window.__hd.econ.bag.heldId());
ok('e: boombox held on the lakefront', heldE === 'boombox', 'heldId=' + heldE);
await waitToast('BOOMBOX TO-GO');
await key('r');
const tHouseE = await waitToast('WBMX');
ok('e: R cycles on the lakefront too', !!tHouseE, tHouseE || 'no toast');
// walk to the towel (145,162) and borrow the TOWEL box
await page.evaluate(() => { const p = window.__hd.player; p.x = 146; p.z = 162; p.vx = 0; p.vz = 0; });
await sleep(300);
await key('e');
const tBorrow = await waitToast('BORROWED');
ok('e: borrow the towel box -> its toast', !!tBorrow, tBorrow || 'no toast');
const heldAfterBorrow = await page.evaluate(() => window.__hd.econ.bag.heldId());
ok('e: our box left the hand on borrow', heldAfterBorrow !== 'boombox', 'heldId=' + heldAfterBorrow);
await key('e');
const tPut = await waitToast('put it back');
ok('e: put it back -> its toast', !!tPut, tPut || 'no toast');

// =====================================================================
// g. gates
// =====================================================================
ok('g: no [framework]/[econ] warns', warns.length === 0, warns.join(' | '));
ok('g: no console errors', errors.length === 0, errors.join(' | '));

console.log('\nDRAW CALLS at the tent view: ' + drawTent);
const fails = results.filter(r => !r).length;
console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL LOLLA-MERCH CHECKS PASSED'));
await browser.close(); vite.kill(); process.exit(fails ? 1 : 0);
