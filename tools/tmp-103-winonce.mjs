// tmp (task 103): prove the CUBS-WIN notification fires AT MOST ONCE per session
// (page load), yet fires AGAIN after a reload — while the underlying win events
// keep happening (counters climb, celebration repeats).
//
// Two notifications share the bug class and both are gated with a module-level
// session flag (NOT store.js):
//   · gameday  (Wrigleyville cell)  toast('CHUBS WIN!', 'fly the dub')
//   · ambient  (lakefront gag)      toast('CHUBS WIN', 'somewhere west, ...')
// The bowl's scoreboard "CHUBS WIN!" is an IN-WORLD display of the live diorama
// and is intentionally NOT gated (it must read the result of the game you watch).
//
// Method: install a MutationObserver on #toastMain BEFORE any script runs
// (evaluateOnNewDocument), logging every (main,sub) the banner shows. The exact
// text separates the two toasts ('CHUBS WIN!' vs 'CHUBS WIN'). Force the gameday
// win 3x out-of-band via window.__hd.gameday.forceWin(); let the fast ambient
// timer fire ≥2 real wins. Assert each toast text logged exactly once while the
// counters (window.__hd.gstate.cubs*) climb past 1. Then reload → each fires once
// more. Own vite + canary (PITFALLS: the :5173 stale-server trap).
// Usage: node tools/tmp-103-winonce.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const shotsDir = join(here, 'shots');
mkdirSync(shotsDir, { recursive: true });
const port = +(process.argv[2] || 5373);
const canary = 'win103_' + Math.floor(Math.random() * 1e6);
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

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !isNoise(t)) errors.push('[console.error] ' + t); else if (t.startsWith('[canary]')) canaries.push(t); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

// install the toast recorder BEFORE any page script → nothing is missed, not even
// the ambient frame-1 win (WRIG.winT starts at 0 on the lakefront).
await page.evaluateOnNewDocument(() => {
  window.__toastLog = [];
  const attach = () => {
    const m = document.getElementById('toastMain'), s = document.getElementById('toastSub');
    if (!m || !s) { setTimeout(attach, 8); return; }
    const rec = () => window.__toastLog.push({ main: m.textContent, sub: s.textContent, t: Date.now() });
    new MutationObserver(rec).observe(m, { childList: true, characterData: true, subtree: true });
  };
  if (document.readyState !== 'loading') attach();
  else document.addEventListener('DOMContentLoaded', attach);
});

const q = new URLSearchParams('play=1&quiet=1&ambientfast=1');
q.set('canary', canary);
const boot = `http://localhost:${port}/?${q}`;

const gamedayCount = log => log.filter(e => e.main === 'CHUBS WIN!').length;
const ambientCount = log => log.filter(e => e.main === 'CHUBS WIN').length;   // exact — no trailing '!'

// ============================ session 1 ============================
await page.goto(boot, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.gameday && window.__hd.gstate, { timeout: 15000 });
ok('canary echoed', canaries.some(c => c.includes(canary)), canaries.join('|') || '(none)');

// force the gameday win THREE times — only the first may toast
await page.evaluate(() => { for (let i = 0; i < 3; i++) window.__hd.gameday.forceWin(); });
await sleep(400);

// grab a screenshot while a CUBS-WIN banner is actually on screen (proof it renders)
let shot = false;
for (let i = 0; i < 40 && !shot; i++) {
  const vis = await page.evaluate(() => {
    const t = document.getElementById('toast'), m = document.getElementById('toastMain');
    return t && t.classList.contains('show') && /CHUBS WIN/.test(m.textContent) ? m.textContent : null;
  });
  if (vis) { await page.screenshot({ path: join(shotsDir, '103-win-toast.png') }); shot = true; }
  else await sleep(150);
}
ok('a CUBS-WIN banner rendered (screenshot)', shot);

// let the fast ambient timer fire several real wins (winT 0 → then 25-45 s each)
console.log('  … waiting ~95 s for repeated ambient wins …');
await sleep(95000);

const s1 = await page.evaluate(() => ({
  log: window.__toastLog.slice(),
  cubsWins: (window.__hd.gstate.cubsWins || 0),          // ambient counter
  cubsWinsSeen: (window.__hd.gstate.cubsWinsSeen || 0),  // gameday/bowl counter
  winToastShown: window.__hd.gameday.winToastShown,
}));
const g1 = gamedayCount(s1.log), a1 = ambientCount(s1.log);
ok('gameday win FORCED 3× (counter climbed ≥3)', s1.cubsWinsSeen >= 3, 'cubsWinsSeen=' + s1.cubsWinsSeen);
ok('gameday toast fired EXACTLY once', g1 === 1, 'count=' + g1);
ok('gameday session flag latched', s1.winToastShown === true, 'flag=' + s1.winToastShown);
ok('ambient win fired MULTIPLE times (counter ≥2)', s1.cubsWins >= 2, 'cubsWins=' + s1.cubsWins);
ok('ambient toast fired EXACTLY once', a1 === 1, 'count=' + a1);

// ============================ session 2 (reload) ============================
// A reload re-inits every module → both session flags reset to false, so both
// notifications must be able to fire again. Let the ambient timer fire its own
// first win (delayed ~4 s by main.js's negative frame-1 dt, PITFALLS), THEN
// force a gameday win and poll for its render — avoids the 3 s toast-queue race.
await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.gameday && window.__hd.gstate && Array.isArray(window.__toastLog), { timeout: 15000 });
let a2 = 0;
for (let i = 0; i < 40 && a2 < 1; i++) { await sleep(500); a2 = ambientCount(await page.evaluate(() => window.__toastLog)); }
ok('after RELOAD ambient toast fires again (≥1)', a2 >= 1, 'count=' + a2);

await page.evaluate(() => { window.__hd.gameday.forceWin(); });   // one gameday win this session
let g2 = 0;
for (let i = 0; i < 24 && g2 < 1; i++) { await sleep(500); g2 = gamedayCount(await page.evaluate(() => window.__toastLog)); }
const s2 = await page.evaluate(() => ({
  log: window.__toastLog.slice(),
  cubsWins: (window.__hd.gstate.cubsWins || 0),
  cubsWinsSeen: (window.__hd.gstate.cubsWinsSeen || 0),
}));
ok('after RELOAD gameday counter fresh (single forced win)', s2.cubsWinsSeen === 1, 'cubsWinsSeen=' + s2.cubsWinsSeen);
ok('after RELOAD gameday toast fires again (once)', g2 === 1, 'count=' + g2);

// =====================================================================
console.log('\n--- toast log (session 2) ---');
console.log(JSON.stringify(s2.log.map(e => e.main + ' / ' + e.sub)));
console.log('\n--- console errors / pageerrors ---');
console.log(errors.length ? errors.join('\n') : '(none)');
const fails = results.filter(r => !r.pass).length + (errors.length ? 1 : 0);
console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL WIN-ONCE CHECKS PASSED') + (errors.length ? ' (+console errors)' : ''));
await browser.close();
vite.kill();
process.exit(fails ? 1 : 0);
