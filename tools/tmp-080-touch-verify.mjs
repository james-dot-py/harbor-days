// tmp (080): TOUCH input pass — buy / equip / use each via the touch HUD on a
// 390x844 phone viewport (body.touch). The ✋ action button needs a HELD tap
// (touchStart · ~170 ms · touchEnd) so the rAF edge-latch sees the press
// (PITFALLS: a same-frame tap is invisible). Card buttons are DOM-click path.
// Usage: node tools/tmp-080-touch-verify.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, 'shots');
mkdirSync(outDir, { recursive: true });
const port = +(process.argv[2] || 5392);
const canary = 't' + Math.floor(Math.random() * 1e6);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'], { cwd: root });
await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('vite timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d)); });

const results = []; const ok = (n, p, x = '') => { results.push(p); console.log(`${p ? 'ok  ' : 'FAIL'} ${n}${x ? '  — ' + x : ''}`); };
const browser = await puppeteer.launch({ headless: 'new', args: ['--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const warns = [], errors = [], canaries = [];
const isNoise = t => t.includes('favicon') || t.includes('404') || t.includes('manifest') || t.includes('sw.js') || t.includes('goatcounter');
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !isNoise(t)) errors.push(t); else if (t.startsWith('[canary]')) canaries.push(t); if (t.includes('[framework]') || t.includes('[econ]')) warns.push(t); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

// held touch tap at an element's center (the ✋ path — rAF edge-latch safe)
const heldTap = async (sel, ms = 170) => {
  const c = await page.evaluate(s => { const el = document.querySelector(s); if (!el) return null;
    const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
  if (!c) return false;
  await page.touchscreen.touchStart(c.x, c.y); await sleep(ms); await page.touchscreen.touchEnd();
  return true;
};
const bodyHas = async (re, ms = 9000) => { const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await page.evaluate(r => new RegExp(r, 'i').test(document.body.innerText), re.source || re)) return true; await sleep(250); } return false; };
// prompt matcher reads ONLY the pill (#prompt) — body text false-positives on
// tote captions (e.g. the boombox caption contains 'changes the station')
const promptHas = async (re, ms = 6000) => { const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await page.evaluate(r => { const el = document.getElementById('prompt');
    return !!el && el.style.display !== 'none' && new RegExp(r, 'i').test(el.textContent); }, re.source || re)) return true; await sleep(250); } return false; };
const dibs = () => page.evaluate(() => window.__hd.econ.wallet.dibs);

// spawn AT the kiosk browse spot (100, -352 + FRONT offset ≈ z -351.6, r 2.6)
await page.goto(`http://localhost:${port}/?play=1&quiet=1&coach=0&x=100&z=-350.5&dibs=60&canary=${canary}`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
await sleep(1000);
ok('canary echoed', canaries.some(c => c.includes(canary)));
ok('touch HUD on (body.touch)', await page.evaluate(() => document.body.classList.contains('touch')));

// ---- BUY on touch: ✋ opens the kiosk card, tap buy on the pirate hat ----
ok('kiosk prompt in range', await bodyHas(/browse the kiosk/, 5000));
await heldTap('#btnAct');
await sleep(400);
ok('shop card opened via ✋', await page.evaluate(() => document.getElementById('shop').classList.contains('show')));
await page.screenshot({ path: join(outDir, '080-touch-shop.png') });
const d0 = await dibs();
const bi = await page.evaluate(() => { const rows = [...document.querySelectorAll('#shopRows .srow')];
  const i = rows.findIndex(r => /pirate/i.test(r.textContent)); const b = rows[i] && rows[i].querySelector('.sbtn'); return b ? +b.getAttribute('data-i') : -1; });
ok('pirate hat row has a buy button', bi >= 0, 'i=' + bi);
const bb = await page.$(`.sbtn[data-i="${bi}"]`);
if (bb) await bb.tap();
await sleep(350);
ok('bought paper pirate hat (-12)', d0 - (await dibs()) === 12, `${d0}->${await dibs()}`);
await page.evaluate(() => window.__hd.econ.shop.close());

// ---- EQUIP on touch: 🧺 opens the tote, tap the hat tile -> 'wearing' ----
await heldTap('#btnTote');
await sleep(400);
ok('tote opened via its button', await page.evaluate(() => document.getElementById('tote').classList.contains('show')));
const tile = await page.$('.ttile[data-id="pirate-hat"]');
ok('pirate-hat tile present', !!tile);
if (tile) await tile.tap();
await sleep(400);
ok("tile shows 'wearing'", await page.evaluate(() => { const t = document.querySelector('.ttile[data-id="pirate-hat"]'); return !!t && /wearing/.test(t.textContent); }));
ok('save.worn = pirate-hat', (await page.evaluate(() => window.__hd.econ.save().worn)) === 'pirate-hat');
await page.screenshot({ path: join(outDir, '080-touch-wearing.png') });
await page.evaluate(() => window.__hd.econ.bag.close());
await sleep(300);

// ---- USE on touch: hold the Chicago dog from the tote, ✋ takes a bite ----
// FIRST leave the kiosk: its browse prompt (priority 0, r 2.6) outranks every
// priority -1 follow prompt while we stand at the counter.
await page.evaluate(() => { const p = window.__hd.player; p.x = 82; p.z = -300; });
await sleep(700);
await page.evaluate(() => window.__hd.econ.bag.add('hot-dog', 1));
await heldTap('#btnTote'); await sleep(350);
const dog = await page.$('.ttile[data-id="hot-dog"]');
ok('hot-dog tile present', !!dog);
if (dog) await dog.tap();                      // holdable: holds + closes the card
await sleep(500);
ok("bite prompt live ('take a bite')", await promptHas(/take a bite/));
await heldTap('#btnAct'); await sleep(500);    // bite 1
await page.screenshot({ path: join(outDir, '080-touch-bite.png') });
await heldTap('#btnAct'); await sleep(500);    // bite 2
await heldTap('#btnAct');                      // bite 3
ok("'no ketchup. obviously.' after 3 touch bites", await bodyHas(/no ketchup/));

// ---- R-parity on touch: hold the boombox, ✋ = change the station ----
await page.evaluate(() => window.__hd.econ.bag.add('boombox', 1));
await heldTap('#btnTote'); await sleep(350);
const bx = await page.$('.ttile[data-id="boombox"]');
ok('boombox tile present', !!bx);
if (bx) await bx.tap();
await sleep(500);
ok("'change the station' prompt on touch", await promptHas(/change the station/));
await heldTap('#btnAct');
ok('station toast after ✋ (WBMX · HOUSE)', await bodyHas(/WBMX/));
await page.screenshot({ path: join(outDir, '080-touch-station.png') });

ok('no [framework]/[econ] warns', warns.length === 0, warns.join(' | '));
ok('no console errors', errors.length === 0, errors.join(' | '));
const fails = results.filter(r => !r).length;
console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL TOUCH CHECKS PASSED'));
await browser.close(); vite.kill(); process.exit(fails ? 1 : 0);
