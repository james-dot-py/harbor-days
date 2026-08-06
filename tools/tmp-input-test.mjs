// tmp (075): BOTH-INPUTS test for the Montrose interactions. Spawns its OWN
// strict-port vite, then drives the marquee 'fly a kite' (chargeThrow: hold to
// wind up, release to launch) + 'meet the plovers' (toast) on BOTH input paths:
//   * DESKTOP — real key events (keydown E · hold · keyup E)
//   * MOBILE  — 390px hasTouch viewport, held taps on the ✋ #btnAct hand button
//     (>=160ms so the rising-edge action latch is observed; PITFALLS task 026)
// Success signal = the interaction's toast (#toastMain) fires. Screenshots each.
// Usage: node tools/tmp-input-test.mjs [port]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const port = +(process.argv[2] || 5242);
const vite = spawn(process.execPath,
  [join(here, '..', 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'],
  { cwd: join(here, '..') });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite start timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});

const browser = await puppeteer.launch({ headless: 'new', args: ['--mute-audio'] });
const errors = []; let sawCanary = false;
const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];

function wire(page) {
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !isNoise(m.text())) errors.push('[console.error] ' + m.text()); if (m.text().startsWith('[canary] inputtest')) sawCanary = true; });
}
async function loadAt(page, x, z) {
  await page.goto(`http://localhost:${port}/?play=1&x=${x}&z=${z}&canary=inputtest`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
  await sleep(800);
}
const readToast = page => page.evaluate(() => ({
  show: document.getElementById('toast')?.classList.contains('show') || false,
  main: (document.getElementById('toastMain')?.textContent || '').trim(),
}));
async function holdTapSel(page, sel, ms = 220) {
  const r = await page.evaluate(s => { const el = document.querySelector(s); if (!el) return null; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return null; const b = el.getBoundingClientRect(); if (!b.width && !b.height) return null; return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, sel);
  if (!r) return { tapped: false };
  await page.touchscreen.touchStart(r.x, r.y); await sleep(ms); await page.touchscreen.touchEnd();
  return { tapped: true, at: r };
}
function record(label, toast, want, extra = '') {
  const ok = toast.show && toast.main.includes(want);
  results.push({ label, ok, got: toast.main, want });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: toast="${toast.main}" (want "${want}")${extra}`);
}

// ------------------------------- DESKTOP -------------------------------
{
  const page = await browser.newPage(); wire(page);
  await page.setViewport({ width: 1280, height: 720 });
  // fly a kite — chargeThrow: press E, hold to wind up, release to launch
  // 132: both spawns here were PRE-084 ("+436 block shift"): the summit moved to
  // z=-880 and the dune sign to (218,-979.5). Stale since 084 — a harness with a
  // hard-coded world coordinate does not fail loudly when the map moves, it just
  // stands somewhere else and reports the interaction missing.
  await loadAt(page, 108, -880);
  await page.keyboard.down('e'); await sleep(700); await page.keyboard.up('e'); await sleep(1500);
  await page.screenshot({ path: join(here, 'shots', 'mt-input-kite-desktop.png') });
  record('desktop fly-a-kite (E hold/release)', await readToast(page), 'UP SHE GOES');
  // meet the plovers — simple E tap toast
  await loadAt(page, 220, -981.5);   // 132: MONTROSE_DUNE.sign (218,-979.5) + the interaction's (+2,-2)
  await page.keyboard.down('e'); await sleep(160); await page.keyboard.up('e'); await sleep(700);
  await page.screenshot({ path: join(here, 'shots', 'mt-input-plover-desktop.png') });
  record('desktop meet-the-plovers (E)', await readToast(page), 'MONTY & ROSE');
  await page.close();
}
// ------------------------------- MOBILE --------------------------------
{
  const page = await browser.newPage(); wire(page);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await loadAt(page, 108, -880);
  const touchOn = await page.evaluate(() => document.body.classList.contains('touch'));
  const t1 = await holdTapSel(page, '#btnAct', 260); await sleep(1500);
  await page.screenshot({ path: join(here, 'shots', 'mt-input-kite-mobile.png') });
  record('mobile fly-a-kite (✋ #btnAct hold)', await readToast(page), 'UP SHE GOES', ` [body.touch=${touchOn} btnAct=${t1.tapped}]`);
  await loadAt(page, 220, -981.5);
  const t2 = await holdTapSel(page, '#btnAct', 200); await sleep(700);
  await page.screenshot({ path: join(here, 'shots', 'mt-input-plover-mobile.png') });
  record('mobile meet-the-plovers (✋ #btnAct)', await readToast(page), 'MONTY & ROSE', ` [btnAct=${t2.tapped}]`);
  await page.close();
}

await browser.close(); vite.kill();
if (!sawCanary) { console.log('CANARY MISSING — wrong server?'); }
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
const allOk = results.every(r => r.ok) && sawCanary && !errors.length;
console.log(allOk ? 'INPUT-TEST GREEN' : 'INPUT-TEST FAILED');
process.exit(allOk ? 0 : 1);
