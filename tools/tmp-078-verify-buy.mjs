// tmp (078): BUY FLOW at the beach kiosk. Own vite + canary. Spawns at the
// counter, presses E to open the shop (the kiosk interaction), buys via DOM
// clicks, asserts save().bag + dibs, reopens to confirm owned states.
// Usage: node tools/tmp-078-verify-buy.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, 'shots', '078');
mkdirSync(outDir, { recursive: true });
const port = +(process.argv[2] || 5311);
const canary = 'buy' + Math.floor(Math.random() * 1e6);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'], { cwd: root });
await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('vite timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d)); });

const results = []; const ok = (n, p, x = '') => { results.push(p); console.log(`${p ? 'ok  ' : 'FAIL'} ${n}${x ? '  — ' + x : ''}`); };
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const errors = [], warns = [], canaries = [];
const isNoise = t => t.includes('favicon') || t.includes('404') || t.includes('manifest') || t.includes('sw.js') || t.includes('goatcounter');
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !isNoise(t)) errors.push(t); else if (t.startsWith('[canary]')) canaries.push(t); if (t.includes('[framework]')) warns.push(t); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

// clean origin first, then spawn at the kiosk counter with 40 dibs
await page.goto(`http://localhost:${port}/?play=1&quiet=1&canary=${canary}`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await page.goto(`http://localhost:${port}/?play=1&quiet=1&dibs=40&x=100&z=-350&yaw=3.14&canary=${canary}`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
await sleep(1500);
ok('canary echoed', canaries.some(c => c.includes(canary)));

const pressE = async () => { await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))); await sleep(140); await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'e' }))); await sleep(200); };

// open the shop via the counter interaction
await pressE();
const shopOpen = await page.evaluate(() => { const s = document.getElementById('shop'); return { show: s.classList.contains('show'), rows: document.querySelectorAll('#shopRows .srow').length, html: document.getElementById('shopRows').innerText }; });
ok('E opened the shop', shopOpen.show, 'show=' + shopOpen.show);
ok('shop shows 3 items', shopOpen.rows === 3, 'rows=' + shopOpen.rows);
ok('shop lists the 3 pilot items', /popcorn/i.test(shopOpen.html) && /tennis/i.test(shopOpen.html) && /bucket/i.test(shopOpen.html));
await page.screenshot({ path: join(outDir, 'buy-1-shop.png') });

// buy popcorn (DOM click on the first buy button)
const dibs0 = await page.evaluate(() => window.__hd.econ.save().dibs);
await page.evaluate(() => document.querySelector('#shopRows .srow[data-i="0"] .sbtn').click());
await sleep(200);
const afterPop = await page.evaluate(() => ({ dibs: window.__hd.econ.save().dibs, pop: window.__hd.econ.save().bag.popcorn }));
ok('popcorn: bag.popcorn===1', afterPop.pop === 1, 'bag.popcorn=' + afterPop.pop);
ok('popcorn: dibs dropped by 5', afterPop.dibs === dibs0 - 5, dibs0 + '->' + afterPop.dibs);

// buy the rest
await page.evaluate(() => { document.querySelector('#shopRows .srow[data-i="1"] .sbtn').click(); });
await sleep(150);
await page.evaluate(() => { document.querySelector('#shopRows .srow[data-i="2"] .sbtn').click(); });
await sleep(200);
const afterAll = await page.evaluate(() => { const s = window.__hd.econ.save(); return { dibs: s.dibs, bag: s.bag }; });
ok('tennis-ball owned', afterAll.bag['tennis-ball'] === 1, JSON.stringify(afterAll.bag));
ok('bucket-hat owned', afterAll.bag['bucket-hat'] === 1, JSON.stringify(afterAll.bag));
ok('dibs = 40-5-8-25 = 2', afterAll.dibs === 2, 'dibs=' + afterAll.dibs);

// close + reopen the shop → all three read "in your tote ✓"
await page.evaluate(() => window.__hd.econ.shop.close());
await sleep(150);
await pressE();
const reopened = await page.evaluate(() => ({ show: document.getElementById('shop').classList.contains('show'), owned: document.querySelectorAll('#shopRows .sowned').length, html: document.getElementById('shopRows').innerText }));
ok('reopened shop shows 3 owned ✓', reopened.owned === 3, 'owned=' + reopened.owned + ' | ' + reopened.html.replace(/\n/g, ' '));
await page.screenshot({ path: join(outDir, 'buy-2-owned.png') });

ok('no [framework] warns', warns.length === 0, warns.join(' | '));
ok('no console errors', errors.length === 0, errors.join(' | '));

const fails = results.filter(r => !r).length;
console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL BUY CHECKS PASSED'));
await browser.close(); vite.kill(); process.exit(fails ? 1 : 0);
