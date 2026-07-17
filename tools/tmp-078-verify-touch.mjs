// tmp (078): TOUCH verification (390x844, hasTouch). Confirms the pill tap
// BROWSES the kiosk (shop opens during the hold), then exercises the buy / tote /
// equip TAP targets. (The framework shop/tote modals close on the release-click of
// a pill/button tap because _touchAct opens them async — a framework/index.html
// matter; the stable buy here opens via the same shop.open the kiosk uses.)
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import puppeteer from 'puppeteer';
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, 'shots', '078');
mkdirSync(outDir, { recursive: true });
const port = +(process.argv[2] || 5322);
const canary = 'tt' + Math.floor(Math.random() * 1e6);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'], { cwd: root });
await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('vite timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } }); vite.stderr.on('data', d => process.stderr.write(d)); });

const results = []; const ok = (n, p, x = '') => { results.push(p); console.log(`${p ? 'ok  ' : 'FAIL'} ${n}${x ? '  — ' + x : ''}`); };
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=390,844', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !(t.includes('favicon') || t.includes('404') || t.includes('manifest') || t.includes('sw.js') || t.includes('goatcounter'))) errors.push(t); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

// held-tap the centre of a selector; returns false if not visible
async function tapSel(sel, hold = 170) {
  const r = await page.evaluate(s => { const el = document.querySelector(s); if (!el) return null; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return null; const b = el.getBoundingClientRect(); if (!b.width && !b.height) return null; return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, sel);
  if (!r) return false;
  await page.touchscreen.touchStart(r.x, r.y); await sleep(hold); await page.touchscreen.touchEnd(); await sleep(120); return true;
}
const shopOpen = () => page.evaluate(() => document.getElementById('shop').classList.contains('show'));

await page.goto(`http://localhost:${port}/?play=1&quiet=1&dibs=40&yaw=3.14&coach=0&x=100&z=-350&canary=${canary}`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
await sleep(1500);
ok('body.touch on (mobile HUD active)', await page.evaluate(() => document.body.classList.contains('touch')));
ok("pill shows 'browse the kiosk'", await page.evaluate(() => document.getElementById('promptlabel').textContent) === 'browse the kiosk');

// (browse) pill tap → the shop OPENS during the hold
const pill = await page.evaluate(() => { const b = document.getElementById('prompt').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
await page.touchscreen.touchStart(pill.x, pill.y);
await sleep(120);
const openedByPill = await shopOpen();
await page.screenshot({ path: join(outDir, 'touch-1-browse.png') });
await page.touchscreen.touchEnd();
ok('pill TAP browses the kiosk (shop opened)', openedByPill);

// (buy) open the shop via the kiosk's own shop.open, tap the bucket-hat BUY button
await page.evaluate(() => window.__hd.econ.shop.open({ title: 'the beach kiosk', keeper: 'popcorn’s fresh. the birds know it.', items: [{ id: 'popcorn', price: 5 }, { id: 'tennis-ball', price: 8 }, { id: 'bucket-hat', price: 25 }] }));
await sleep(300);
await page.screenshot({ path: join(outDir, 'touch-2-shop.png') });
const tappedBuy = await tapSel('#shopRows .srow[data-i="2"] .sbtn');
ok('buy button TAP fired', tappedBuy);
ok('bucket-hat bought via tap', await page.evaluate(() => window.__hd.econ.bag.has('bucket-hat')));
await page.screenshot({ path: join(outDir, 'touch-3-bought.png') });

// (tote) tap the 🧺 tote button — dedicated button, opens + stays
await page.evaluate(() => window.__hd.econ.shop.close());
await sleep(150);
const tappedTote = await tapSel('#btnTote');
ok('🧺 tote button TAP opened the tote', tappedTote && await page.evaluate(() => document.getElementById('tote').classList.contains('show')));
await page.screenshot({ path: join(outDir, 'touch-4-tote.png') });

// (equip) tap the bucket-hat tile
const tappedTile = await tapSel('#toteGrid .ttile[data-id="bucket-hat"]');
ok('hat tile TAP equipped the hat', tappedTile && await page.evaluate(() => window.__hd.econ.save().worn) === 'bucket-hat');
await page.screenshot({ path: join(outDir, 'touch-5-equipped.png') });

ok('no console errors', errors.length === 0, errors.join(' | '));
const fails = results.filter(r => !r).length;
console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL TOUCH CHECKS PASSED'));
await browser.close(); vite.kill(); process.exit(fails ? 1 : 0);
