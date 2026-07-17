// tmp (078 INTEGRATION, orchestrator pass): the seams no single executor could
// test, plus the touch-shop backdrop fix.
//   A. REAL tennis ball -> REAL dog fetch: buy-path ball held via the tote,
//      charge-thrown into the dog-beach cove; a registered dog runs it down,
//      carries it back (ball at the mouth), drops it at the player's feet and
//      the 'pick up the ball' prompt appears. Screenshots of land / carry / drop.
//   B. TOUCH shop guard (framework fix this session): a pill TAP that opens the
//      kiosk shop must NOT self-close on the tap's release (the synthesized
//      click lands on the backdrop); a deliberate backdrop TAP must still close.
//   C. DESKTOP backdrop click still closes the shop (guard didn't break it).
// Usage: node tools/tmp-078-integration.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const shotsDir = join(here, 'shots');
mkdirSync(shotsDir, { recursive: true });
const port = +(process.argv[2] || 5361);
const canary = 'int078_' + Math.floor(Math.random() * 1e6);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const vite = spawn(process.execPath,
  [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'],
  { cwd: root });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite start timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});

const results = [];
const ok = (name, pass, extra = '') => { results.push({ name, pass }); console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}${extra ? '  — ' + extra : ''}`); };

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const errors = [], canaries = [];
const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)') || t.includes('manifest') || t.includes('sw.js') || t.includes('goatcounter') || t.includes('gc.zgo.at');
function wirePage(page) {
  page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !isNoise(t)) errors.push('[console.error] ' + t); else if (t.startsWith('[canary]')) canaries.push(t); });
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
}
function url(x, z, extra = '') {
  const q = new URLSearchParams('play=1&quiet=1');
  if (x != null) q.set('x', x); if (z != null) q.set('z', z);
  q.set('canary', canary);
  for (const [k, v] of new URLSearchParams(extra)) q.set(k, v);
  return `http://localhost:${port}/?${q}`;
}

// ============================ A. real dog fetch ==========================
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
wirePage(page);
await page.goto(url(95, -338, 'yaw=1.5708&dibs=40'), { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.econ && window.__hd.fetchDogs && window.__hd.fetchDogs.length >= 5, { timeout: 15000 });
ok('canary echoed', canaries.some(c => c.includes(canary)), canaries.join('|'));
await sleep(600);

// own the ball via the real tote path: add -> open tote -> tap the tile
await page.evaluate(() => { window.__hd.econ.bag.add('tennis-ball'); window.__hd.econ.bag.open(); });
await sleep(250);
await page.click('.ttile[data-id="tennis-ball"]');
await sleep(250);
const held = await page.evaluate(() => window.__hd.econ.bag.heldId());
ok('A ball held via tote tap', held === 'tennis-ball', 'heldId=' + held);

// prompt should be the player-following throw interaction (nothing else nearby)
const lbl0 = await page.evaluate(() => ({ shown: document.getElementById('prompt').style.display !== 'none', t: document.getElementById('promptlabel').textContent }));
ok('A throw prompt follows the player', lbl0.shown && /throw the ball/.test(lbl0.t), JSON.stringify(lbl0));

// charge-throw east into the cove (short hold -> gentle toss stays in-clamp)
await page.keyboard.down('e'); await sleep(170); await page.keyboard.up('e');
await sleep(900);
await page.screenshot({ path: join(shotsDir, '078-int-a1-thrown.png') });

// a dog should claim it: wait for the carry (prompt disappears while the ball
// travels), then the drop = 'pick up the ball' prompt near the player.
let picked = null;
for (let i = 0; i < 60; i++) {   // up to ~15 s for run + carry + drop
  await sleep(250);
  picked = await page.evaluate(() => ({ shown: document.getElementById('prompt').style.display !== 'none', t: document.getElementById('promptlabel').textContent }));
  if (i === 14) await page.screenshot({ path: join(shotsDir, '078-int-a2-carry.png') });   // ~3.75 s in: mid-run/carry
  if (picked.shown && /pick up the ball/.test(picked.t)) break;
}
ok('A dog round trip -> pick-up prompt at the player', picked && picked.shown && /pick up the ball/.test(picked.t), JSON.stringify(picked));
await page.screenshot({ path: join(shotsDir, '078-int-a3-dropped.png') });

// pick it back up -> the ball is in hand and THROWABLE again (the pack tracks
// possession via its own tennisState/mesh-parent, not bag.heldId — the tote's
// "in hand" badge is cosmetic and intentionally unset on an interaction re-hold)
await page.keyboard.down('e'); await sleep(60); await page.keyboard.up('e');
await sleep(600);
const rethrow = await page.evaluate(() => ({ shown: document.getElementById('prompt').style.display !== 'none', t: document.getElementById('promptlabel').textContent }));
ok('A pickup re-holds the ball (throw prompt back)', rethrow.shown && /throw the ball/.test(rethrow.t), JSON.stringify(rethrow));

// ===================== C. desktop backdrop still closes ==================
await page.evaluate(() => window.__hd.econ.shop.open({ title: 'probe', keeper: '', items: [{ id: 'tennis-ball', price: 8 }] }));
await sleep(150);
const openC = await page.evaluate(() => document.getElementById('shop').classList.contains('show'));
await page.mouse.click(60, 60);   // top-left = backdrop (card is centred)
await sleep(150);
const closedC = await page.evaluate(() => !document.getElementById('shop').classList.contains('show'));
ok('C desktop backdrop click closes the shop', openC && closedC, `open=${openC} closedAfter=${closedC}`);

// ========================= B. touch shop guard ===========================
const tpage = await browser.newPage();
await tpage.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
wirePage(tpage);
await tpage.goto(url(100, -350.8, 'dibs=40'), { waitUntil: 'networkidle0', timeout: 60000 });
await tpage.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
await sleep(800);
const isTouch = await tpage.evaluate(() => document.body.classList.contains('touch'));
const pill = await tpage.evaluate(() => {
  const p = document.getElementById('prompt');
  if (!p || p.style.display === 'none') return null;
  const r = p.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, t: document.getElementById('promptlabel').textContent };
});
ok('B touch boot at the kiosk shows the pill', isTouch && !!pill && /browse the kiosk/.test(pill.t), JSON.stringify(pill));
// the 160 ms held tap (PITFALLS: an instant tap misses the rising-edge latch)
await tpage.touchscreen.touchStart(pill.x, pill.y);
await sleep(170);
await tpage.touchscreen.touchEnd();
await sleep(700);   // past the synthesized click + a few frames
const shopStays = await tpage.evaluate(() => document.getElementById('shop').classList.contains('show'));
ok('B pill TAP opens the shop and it STAYS open', shopStays === true, 'show=' + shopStays);
await tpage.screenshot({ path: join(shotsDir, '078-int-b1-touch-shop.png') });
// a deliberate backdrop tap (top-left, outside the card) must still close it
await tpage.touchscreen.touchStart(30, 120);
await sleep(120);
await tpage.touchscreen.touchEnd();
await sleep(500);
const shopClosed = await tpage.evaluate(() => !document.getElementById('shop').classList.contains('show'));
ok('B backdrop TAP still closes the shop', shopClosed === true, 'closed=' + shopClosed);

// =====================================================================
console.log('\n--- console errors / pageerrors ---');
console.log(errors.length ? errors.join('\n') : '(none)');
const fails = results.filter(r => !r.pass).length + (errors.length ? 1 : 0);
console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL INTEGRATION CHECKS PASSED') + (errors.length ? ' (+console errors)' : ''));
await browser.close();
vite.kill();
process.exit(fails ? 1 : 0);
