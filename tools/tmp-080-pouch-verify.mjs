// tmp (080): SKIP-STONE POUCH + expanded kiosk (inherited from the prior
// session UNVERIFIED — this is its first E2E). Buy at the kiosk, skip on open
// water from the dog beach, clack on land, payout on a good skip. Own vite +
// canary. Usage: node tools/tmp-080-pouch-verify.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, 'shots');
mkdirSync(outDir, { recursive: true });
const port = +(process.argv[2] || 5383);
const canary = 'p' + Math.floor(Math.random() * 1e6);
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

// spawn ON the dog-beach sand near the waterline; open lake is EAST (+x)
await page.goto(`http://localhost:${port}/?play=1&quiet=1&x=106&z=-334&dibs=40&canary=${canary}`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
await sleep(900);
ok('canary echoed', canaries.some(c => c.includes(canary)));

const dibs = () => page.evaluate(() => window.__hd.econ.wallet.dibs);
const key = async (k, hold) => { await page.evaluate(kk => window.dispatchEvent(new KeyboardEvent('keydown', { key: kk })), k);
  await sleep(hold); await page.evaluate(kk => window.dispatchEvent(new KeyboardEvent('keyup', { key: kk })), k); };
// ATOMIC charge press: only put E down while the pouch prompt is the LIVE pill
// (wandering dogs' 'play fetch' outranks the priority -1 follow prompt and can
// steal the press between an assert and a later keydown). Retries ~5 s.
const throwStone = async (hold) => {
  for (let i = 0; i < 10; i++) {
    const armed = await page.evaluate(() => {
      const el = document.getElementById('prompt');
      if (!el || el.style.display === 'none' || !/skip a stone/.test(el.textContent)) return false;
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' })); return true;
    });
    if (armed) { await sleep(hold); await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'e' }))); return true; }
    await sleep(500);
  }
  return false;
};
const bodyHas = async (re, ms = 9000) => { const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await page.evaluate(r => new RegExp(r, 'i').test(document.body.innerText), re.source || re)) return true; await sleep(250); } return false; };

// ---- kiosk shop rows: all six 080 items listed ----
await page.evaluate(() => window.__hd.econ.shop.open({ title: 'the beach kiosk', keeper: 'x',
  items: [{ id: 'popcorn', price: 5 }, { id: 'tennis-ball', price: 8 }, { id: 'skip-pouch', price: 10 }, { id: 'kite', price: 15 }, { id: 'pirate-hat', price: 12 }, { id: 'bucket-hat', price: 25 }] }));
await sleep(250);
const rows = await page.evaluate(() => document.querySelectorAll('#shopRows .srow').length);
ok('kiosk card renders 6 rows', rows === 6, 'rows=' + rows);
// buy the pouch via the real buy button (row 3, index 2); price 10 exactly
// (delta-based: the dog-beach zone discovery pays +3 on top of the seed)
const dPre = await dibs();
await page.evaluate(() => { const b = document.querySelector('.sbtn[data-i="2"]'); if (b) b.click(); });
await sleep(250);
ok('bought skip-pouch (-10)', dPre - (await dibs()) === 10, `dibs ${dPre}->${await dibs()}`);
await page.evaluate(() => window.__hd.econ.shop.close());

// ---- move to a CLEAR spot at OPEN water: the shallows off the Rocks at
// (132,-80) — ankle-deep at the water's edge, open lake east. (The dog-beach
// fetch prompt outranks the pouch's priority -1 follow prompt elsewhere.) ----
await page.evaluate(() => { const p = window.__hd.player; p.x = 132; p.z = -80; });
await sleep(600);

// ---- hold a pebble; the throw prompt follows ----
await page.evaluate(() => { const d = window.__hd.econ.bag.defs.get('skip-pouch'); d.onUse(); });
await sleep(400);
await page.screenshot({ path: join(outDir, '080-pouch-hand.png') });
ok("pouch toast: 'a pocketful of flat ones'", await bodyHas(/pocketful of flat ones/));
ok("throw prompt: 'skip a stone'", await bodyHas(/skip a stone/));

// ---- throw EAST at the open lake (cam yaw pi/2 -> camForward = +x) ----
await page.evaluate(() => { const c = window.__hd.input.cam; c.yaw = Math.PI / 2; c.pitch = 0.12; });
await sleep(300);
const d0 = await dibs(), thrown0 = await page.evaluate(() => 0 + (window.__hd.econ.save().counters ? 0 : 0));
ok('throw armed (pouch prompt live)', await throwStone(620));
await sleep(700);
await page.screenshot({ path: join(outDir, '080-pouch-flight.png') });
const water = await bodyHas(/skip(s)?!|plonk!/);
ok('water throw resolved (skips! or plonk!)', water);
await sleep(1500);
const d1 = await dibs();
console.log(`     water throw: dibs ${d0} -> ${d1} (pays only on >=3 skips)`);

// a second and third throw raise the odds of a 3+ skip payout; assert at least one pays
let paid = d1 - d0 > 0;
for (let i = 0; i < 2 && !paid; i++) {
  await sleep(400);
  const b = await dibs();
  await throwStone(620); await sleep(2400);
  paid = (await dibs()) - b > 0;
}
ok('at least one throw paid the stones key (>=3 skips)', paid);

// ---- the dog-beach POND (110,-332, aim west along it): submerged sand now
// counts as WATER (the wet fix) — a skim or plonk, never an underwater clack ----
await page.evaluate(() => { const p = window.__hd.player; p.x = 110; p.z = -332; });
await sleep(600);
await page.evaluate(() => { const c = window.__hd.input.cam; c.yaw = -Math.PI / 2; c.pitch = 0.12; });
await sleep(300);
ok('pond throw armed', await throwStone(560));
ok('pond throw resolves WET (skips!/plonk!, not clack)', await bodyHas(/skip(s)?!|plonk!/));

// ---- the harbor lawn (30,108): solid LAND — face WEST and throw: dry 'clack.'
// (also re-proves the relative safety net: a fixed x>=88 box ate this throw) ----
await page.evaluate(() => { const p = window.__hd.player; p.x = 30; p.z = 108; });
await sleep(600);
await page.evaluate(() => { const c = window.__hd.input.cam; c.yaw = -Math.PI / 2; c.pitch = 0.12; });
await sleep(300);
ok('inland throw armed', await throwStone(500));
ok("land throw resolved: 'clack.'", await bodyHas(/clack\./));
await sleep(800);
// gear items never set the tote's _heldId — auto-refill shows as the follow
// prompt coming right back with a fresh pebble in hand
ok('pebble auto-refilled (throw prompt back)', await bodyHas(/skip a stone/, 4000));

ok('no [framework]/[econ] warns', warns.length === 0, warns.join(' | '));
ok('no console errors', errors.length === 0, errors.join(' | '));
const fails = results.filter(r => !r).length;
console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL POUCH CHECKS PASSED'));
await browser.close(); vite.kill(); process.exit(fails ? 1 : 0);
