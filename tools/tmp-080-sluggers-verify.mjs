// tmp (080): SLUGGERS TO-GO verify. Own vite + fresh canary per load. Covers:
//   a. window+keeper+sign shot from the street  b. shop card + buy (dibs down, rows flip)
//   c. hold the dog via the tote tile, bite ×3 (mid-eat shot + 'no ketchup' toast)
//   d. rooftop drink rail: teleport onto the deck, rest the can, pay 5 (first)
//   e. favor: buy at the counter counts as step 1; door regression still works
//   f. draw calls at the street view   g. zero errors / [framework]/[econ] warns / canary
// Usage: node tools/tmp-080-sluggers-verify.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, 'shots');
mkdirSync(outDir, { recursive: true });
const port = +(process.argv[2] || 5384);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'], { cwd: root });
await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('vite timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d)); });

const results = []; const ok = (n, p, x = '') => { results.push(p); console.log(`${p ? 'ok  ' : 'FAIL'} ${n}${x ? '  — ' + x : ''}`); };
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const warns = [], errors = [], canaries = [], wantCanaries = [];
const isNoise = t => t.includes('favicon') || t.includes('404') || t.includes('manifest') || t.includes('sw.js') || t.includes('goatcounter');
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !isNoise(t)) errors.push(t); else if (t.startsWith('[canary]')) canaries.push(t); if (t.includes('[framework]') || t.includes('[econ]')) warns.push(t); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

let _cn = 0;
const load = async (extra = '') => {
  const canary = 's' + (_cn++) + Math.floor(Math.random() * 1e5); wantCanaries.push(canary);
  const q = `play=1&quiet=1&x=-322&z=-478&dibs=60&canary=${canary}${extra}`;
  await page.goto(`http://localhost:${port}/?${q}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
  await sleep(700);
  return canary;
};
const tele = (x, z, y) => page.evaluate(o => { const p = window.__hd.player; p.x = o.x; p.z = o.z; if (o.y !== undefined) p.y = o.y; p.vx = p.vz = 0; }, { x, z, y });
const setCam = (yaw, pitch, dist) => page.evaluate(o => { const c = window.__hd.input.cam; c.freeT = 999; c.yaw = o.yaw; c.pitch = o.pitch; c.dist = o.dist; }, { yaw, pitch, dist });
const press = async (key, ms = 80) => { await page.evaluate(k => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), key); await sleep(ms); await page.evaluate(k => window.dispatchEvent(new KeyboardEvent('keyup', { key: k })), key); await sleep(70); };
const promptTxt = () => page.evaluate(() => { const e = document.getElementById('promptlabel'); return e ? e.textContent : ''; });
const dibs = () => page.evaluate(() => window.__hd.econ.save().dibs);
const toastNow = () => page.evaluate(() => (document.getElementById('toastMain').textContent + ' | ' + document.getElementById('toastSub').textContent));
const pollToast = async (sub, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const t = await toastNow(); if (t.toLowerCase().includes(sub.toLowerCase())) return true; await sleep(200); } return false; };

// ------------------------------- a. street shot -------------------------------
const c0 = await load();
ok('canary echoed (load 0)', canaries.some(c => c.includes(c0)));
// confirm we are in Wrigleyville (the counter installed under wrigleyRoot)
const cellOk = await page.evaluate(() => { let vis = false; window.__hd.scene.traverse(o => { if (o.name === 'cell-wrigleyville' && o.visible) vis = true; }); return vis; });
ok('a: Wrigleyville cell active at spawn', cellOk);
// hero: stand beside the window so the mayor doesn't occlude the keeper (047)
await tele(-324, -478.5); await sleep(250);
await setCam(-1.62, 0.08, 4.6);
await sleep(500);
await page.screenshot({ path: join(outDir, '080-slug-window.png') });
const drawStreet = await page.evaluate(() => window.__hd.perf().drawCalls);
ok('f: draw calls <= 480 at the street view', drawStreet <= 480, 'drawCalls=' + drawStreet);

// ------------------------------- b. shop + buy --------------------------------
const pl = await promptTxt();
ok('b: window prompt present', /grab a dog/.test(pl), JSON.stringify(pl));
await press('e');
await sleep(500);
const rows0 = await page.evaluate(() => document.querySelectorAll('#shopRows .srow').length);
ok('b: shop card shows 3 rows', rows0 === 3, 'rows=' + rows0);
await page.screenshot({ path: join(outDir, '080-slug-shop.png') });
const d0 = await dibs();
await page.evaluate(() => { const b = document.querySelector('#shopRows .srow[data-i="0"] .sbtn'); if (b) b.click(); });   // hot-dog
await sleep(250);
await page.evaluate(() => { const b = document.querySelector('#shopRows .srow[data-i="1"] .sbtn'); if (b) b.click(); });   // old-style
await sleep(300);
const d1 = await dibs();
ok('b: dibs decremented by 12 (2×6)', d1 === d0 - 12, `${d0} -> ${d1}`);
const owned = await page.evaluate(() => ({
  dog: !!document.querySelector('#shopRows .srow[data-i="0"] .sowned'),
  os: !!document.querySelector('#shopRows .srow[data-i="1"] .sowned'),
}));
ok('b: hot-dog + old-style rows flipped to "in your tote"', owned.dog && owned.os, JSON.stringify(owned));
await page.evaluate(() => window.__hd.econ.shop.close());

// ------------------------------- c. eat the dog -------------------------------
await load();
await page.evaluate(() => { window.__hd.econ.bag.add('hot-dog', 1); window.__hd.econ.bag.open(); });
await sleep(300);
await page.evaluate(() => { const t = document.querySelector('#toteGrid .ttile[data-id="hot-dog"]'); if (t) t.click(); });   // tote tile click path
await sleep(300);
const held = await page.evaluate(() => window.__hd.econ.bag.heldId());
ok('c: dog held via tote tile', held === 'hot-dog', JSON.stringify(held));
// teleport to a clear spot so 'take a bite' (priority -1) is the only prompt
let bitePlace = null;
for (const spot of [[-231, -580], [-160, -400], [-250, -560]]) {
  await tele(spot[0], spot[1]); await sleep(400);
  const p = await promptTxt();
  if (/take a bite/.test(p)) { bitePlace = spot; break; }
}
ok('c: reached a clear spot showing "take a bite"', !!bitePlace, JSON.stringify(await promptTxt()));
await page.evaluate(() => { window.__hd.econ.bag.close(); });
// orient the mayor +z, then a close FRONT-3/4 cam so the held dog + feet-crumbs read
await page.evaluate(() => { const c = window.__hd.input.cam; c.freeT = 999; c.yaw = 0; c.pitch = 0.05; c.dist = 3; });
await sleep(150);
await press('w', 140);                       // face the mayor north (+z), a step onto clear ground
await page.evaluate(() => { const c = window.__hd.input.cam; c.freeT = 999; c.yaw = Math.PI + 0.5; c.pitch = 0.46; c.dist = 3.2; });
await sleep(400);
await press('e'); await sleep(140);          // bite 1
await press('e'); await sleep(45);           // bite 2 — shoot mid-eat (segment gone + feet-crumbs still up)
await page.screenshot({ path: join(outDir, '080-slug-eat.png') });
await press('e');                            // bite 3 -> empty hand + toast
const noKetchup = await pollToast('no ketchup', 10000);
ok('c: "no ketchup. obviously." toast fired', noKetchup, await toastNow());
const emptied = await page.evaluate(() => window.__hd.econ.bag.heldId());
ok('c: hand emptied after 3 bites', emptied === null, JSON.stringify(emptied));

// ------------------------------- d. the drink rail ----------------------------
await load();
await page.evaluate(() => window.__hd.econ.bag.add('old-style', 1));
// teleport onto the Sheffield rooftop deck (x -178..-164, z -534..-518, y 9.6)
await tele(-176.5, -526, 9.7); await sleep(700);
let py = await page.evaluate(() => window.__hd.player.y);
if (py < 8) {   // teleport didn't elevate — nudge again with y set and settle
  await tele(-175, -524, 9.7); await sleep(500); py = await page.evaluate(() => window.__hd.player.y);
}
ok('d: player elevated onto the deck (y >= 8)', py >= 8, 'y=' + py.toFixed(2));
await tele(-177.4, -526, 9.7); await sleep(700);
const railPrompt = await promptTxt();
ok('d: drink-rail prompt appears with an Old Style owned', /rest the Old Style/.test(railPrompt), JSON.stringify(railPrompt));
const dr0 = await dibs();
await press('e');
const railToast = await pollToast('drink rail', 10000);
ok('d: "an Old Style at the drink rail" toast', railToast, await toastNow());
const dr1 = await dibs();
ok('d: wallet paid 5 (first drink rail)', dr1 === dr0 + 5, `${dr0} -> ${dr1}`);
// close, low framing of the can ON the rail
await setCam(1.35, 0.02, 3.0);
await sleep(500);
await page.screenshot({ path: join(outDir, '080-slug-rail.png') });

// ------------------------------- e. favor watch -------------------------------
// e1: buying at the counter counts as step 1
await load();
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await load();   // fresh save
await page.evaluate(() => window.__hd.econ.favors.offer('oldstyle'));
await sleep(300);
const pE = await promptTxt();
// buy old-style at the window (E -> shop -> buy row 1)
if (!/grab a dog/.test(pE)) await tele(-323.5, -477.6);
await sleep(300);
await press('e'); await sleep(400);
await page.evaluate(() => { const b = document.querySelector('#shopRows .srow[data-i="1"] .sbtn'); if (b) b.click(); });
await sleep(300);
await page.evaluate(() => window.__hd.econ.shop.close());
await sleep(800);   // favor watch throttle (~0.5s)
const stepBuy = await page.evaluate(() => window.__hd.econ.favors.at('oldstyle'));
ok('e1: counter buy advanced the favor to step 1', stepBuy.st === 'active' && stepBuy.step === 1, JSON.stringify(stepBuy));

// e2: door regression — fresh save, offer, press E at the door, id still works
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await load();
await page.evaluate(() => window.__hd.econ.favors.offer('oldstyle'));
await sleep(700);   // door poll throttle
await tele(-325.5, -481.5); await sleep(500);
const doorPrompt = await promptTxt();
await press('e'); await sleep(400);
const doorRes = await page.evaluate(() => ({ has: window.__hd.econ.bag.has('old-style'), f: window.__hd.econ.favors.at('oldstyle') }));
ok('e2: door still works with the re-defined id (bag.has + step 1)',
  doorRes.has && doorRes.f.step === 1, JSON.stringify({ doorPrompt, ...doorRes }));

// ------------------------------- g. gates -------------------------------------
ok('g: every load canary echoed', wantCanaries.every(w => canaries.some(c => c.includes(w))), `${canaries.length} echoes / ${wantCanaries.length} loads`);
ok('g: no [framework]/[econ] warns', warns.length === 0, warns.slice(0, 6).join(' | '));
ok('g: no console errors', errors.length === 0, errors.slice(0, 6).join(' | '));

console.log('\nSTREET DRAW CALLS: ' + drawStreet);
const fails = results.filter(r => !r).length;
console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL SLUGGERS CHECKS PASSED'));
await browser.close(); vite.kill(); process.exit(fails ? 1 : 0);
