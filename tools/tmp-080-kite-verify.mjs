// tmp (080): KITE integration — the Cricket Hill flight pays, and owning the
// kiosk's kite bundle turns the flight teal + the prompt personal. Own vite +
// canary. Usage: node tools/tmp-080-kite-verify.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, 'shots');
mkdirSync(outDir, { recursive: true });
const port = +(process.argv[2] || 5382);
const canary = 'k' + Math.floor(Math.random() * 1e6);
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

// summit stand (108,-1316), r3.4 — spawn just west of it
const SPAWN = `play=1&quiet=1&x=105.5&z=-1316&dibs=30&canary=${canary}`;
const load = async () => { await page.goto(`http://localhost:${port}/?${SPAWN}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 }); await sleep(800); };
const key = async (k, hold) => { await page.evaluate(kk => window.dispatchEvent(new KeyboardEvent('keydown', { key: kk })), k);
  await sleep(hold); await page.evaluate(kk => window.dispatchEvent(new KeyboardEvent('keyup', { key: kk })), k); };
const promptLabel = () => page.evaluate(() => { const el = document.querySelector('#prompt span:last-child') || document.querySelector('#prompt'); return el ? el.textContent : ''; });
const dibs = () => page.evaluate(() => window.__hd.econ.wallet.dibs);

await load();
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 }); await sleep(1600);
ok('canary echoed', canaries.some(c => c.includes(canary)));

// ---- flight 1: NO kite owned -> 'fly a kite', red sail, first pay +5 ----
const lbl1 = await promptLabel();
ok("prompt reads 'fly a kite' (no kite owned)", /fly a kite/i.test(lbl1), lbl1);
const d0 = await dibs();
await key('e', 650);                       // chargeThrow releases on KEYUP
await sleep(2200);                         // ascend
await page.screenshot({ path: join(outDir, '080-kite-red.png') });
const d1 = await dibs();
ok('first flight paid +5', d1 - d0 === 5, `${d0}->${d1}`);

// ---- own the kite; label flips within the 1.2 s poll ----
await page.evaluate(() => window.__hd.econ.bag.add('kite', 1));
// reel in (E again, r40 reel prompt), wait for release + label poll
await key('e', 80);
await sleep(4000);
const lbl2 = await promptLabel();
ok("prompt reads 'fly YOUR kite' (kite owned)", /fly YOUR kite/i.test(lbl2), lbl2);

// ---- flight 2: teal sail; repeat pay +2 (cd 10 has elapsed by aloft+reel) ----
await sleep(7000);                         // ensure cd 10 s since pay 1
const d2 = await dibs();
await key('e', 650);
await sleep(2200);
await page.screenshot({ path: join(outDir, '080-kite-teal.png') });
const d3 = await dibs();
ok('second flight paid +2 (repeat, cd elapsed)', d3 - d2 === 2, `${d2}->${d3}`);

// ---- the kiosk bundle hint: tote-use near the hill says "this is the spot" ----
await key('e', 80); await sleep(4000);     // reel + release
await page.evaluate(() => { const d = window.__hd.econ.bag.defs.get('kite'); d.onUse(); });
// toasts queue ~3 s each — poll until the hint rotates in behind the flight toasts
let hintSeen = false;
for (let i = 0; i < 40 && !hintSeen; i++) { hintSeen = await page.evaluate(() => /this is the spot/i.test(document.body.innerText)); if (!hintSeen) await sleep(300); }
ok("bundle hint: 'this is the spot' near the summit", hintSeen);

ok('no [framework]/[econ] warns', warns.length === 0, warns.join(' | '));
ok('no console errors', errors.length === 0, errors.join(' | '));
const fails = results.filter(r => !r).length;
console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL KITE CHECKS PASSED'));
await browser.close(); vite.kill(); process.exit(fails ? 1 : 0);
