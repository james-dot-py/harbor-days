// Task 082 SAVE INTEGRITY — real-browser proof (own vite + puppeteer).
// Scenarios: (1) reload round-trip through the public econ/flags API,
// (2) corrupt-save recovery shows the ONE gentle "starting fresh" toast +
// starts fresh, (3) private-browsing / artifact fallback boots clean with
// ZERO errors and earning still works in-session. Models tools/tmp/082-c1-iso.mjs
// for the spawn+puppeteer boilerplate. Run: node tools/tmp-082-save.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdir } from 'fs/promises';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const port = +(process.argv[2] || 5440);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const isNoise = t => /favicon|goatcounter|404|net::|ERR_|Failed to load resource/i.test(t);

const shotDir = join(root, 'tools', 'shots', '082-save');
const shotPath = join(shotDir, 'corrupt-toast.png');

let failures = 0;
function report(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failures++; console.log('FAIL ' + name + '  ' + JSON.stringify(detail)); }
}

// ---- own vite (strictPort so we never attach to a stale/foreign :5173) ----
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'], { cwd: root });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});

const browser = await puppeteer.launch({ headless: 'new', args: ['--mute-audio'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });

const errors = [], allMsgs = [];
page.on('console', m => { const t = m.text(); allMsgs.push(t); if (m.type() === 'error' && !isNoise(t)) errors.push(t); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

let canarySeq = 0;
async function load(query = '', pg = page) {
  const cid = 'save082-' + (++canarySeq);
  await pg.goto(`http://localhost:${port}/?play=1&quiet=1&canary=${cid}${query}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await pg.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
  return cid;
}

try {
  // ---- canary echo (mechanical wrong-port/foreign-server guard) ----
  const cid1 = await load();
  report('canary echo', allMsgs.some(t => t.includes('[canary] ' + cid1)), { looked: cid1 });

  // ---- Scenario 1: REAL reload round-trip through the public API ----
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await load();                                     // reload: fresh boot on empty storage
  await page.evaluate(() => {
    const s = __hd.econ.save();
    s.dibs = 17; s.bag['bucket-hat'] = 1;
    __hd.econ.bag.equip('bucket-hat');
    __hd.econ.favors.offer('oldstyle');
    __hd.econ.favors.complete('oldstyle');
    __hd.flags.set('ope.stamp.lakefront', '1');
  });
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));   // store.js flushes on pagehide
  await sleep(200);
  await load();                                     // reload: read the persisted save back
  const r1 = await page.evaluate(() => {
    const s = __hd.econ.save();
    return { dibs: s.dibs, bucket: (s.bag['bucket-hat'] || 0), worn: s.worn,
             oldstyle: (s.favors.oldstyle && s.favors.oldstyle.st) || null,
             stamp: __hd.flags.get('ope.stamp.lakefront') };
  });
  report('reload round-trip',
    r1.dibs >= 17 && r1.bucket >= 1 && r1.worn === 'bucket-hat' && r1.oldstyle === 'done' && r1.stamp === '1',
    r1);

  // ---- Scenario 2: corrupt save -> ONE gentle "starting fresh" toast + fresh ----
  await load();                                     // a clean page to seed from
  await page.evaluate(() => {
    try {
      localStorage.setItem('ope.save.v1', '{bad json');   // plant a corrupt blob
      localStorage.setItem = () => {};                    // ...and neutralize this page's
    } catch (e) {}                                        // outgoing pagehide flush so it
  });                                                     // can't overwrite the corrupt blob
  await load();                                     // reload: store.js discards the bad blob, recovered=true
  await mkdir(shotDir, { recursive: true });
  let toastText = '', seen = false;
  for (let i = 0; i < 40; i++) {                    // poll ~4.8s for the boot toast
    toastText = await page.evaluate(() => { const e = document.getElementById('toastMain'); return e ? e.textContent : ''; });
    if (/starting fresh/i.test(toastText)) { seen = true; await page.screenshot({ path: shotPath }); break; }
    await sleep(120);
  }
  if (!seen) await page.screenshot({ path: shotPath });   // still capture something on failure
  const dibs2 = await page.evaluate(() => __hd.econ.save().dibs);
  report('corrupt-recovery toast', seen && dibs2 === 0, { toastText, dibs: dibs2, shot: shotPath });

  // ---- Scenario 3: private-browsing / artifact fallback (localStorage throws) ----
  const errors3 = [], all3 = [];
  const page3 = await browser.newPage(); await page3.setViewport({ width: 1280, height: 720 });
  page3.on('console', m => { const t = m.text(); all3.push(t); if (m.type() === 'error' && !isNoise(t)) errors3.push(t); });
  page3.on('pageerror', e => errors3.push('[pageerror] ' + e.message));
  await page3.evaluateOnNewDocument(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('SecurityError: denied'); } });
  });
  const cid3 = 'save082-priv';
  await page3.goto(`http://localhost:${port}/?play=1&quiet=1&canary=${cid3}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page3.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
  const booted = await page3.evaluate(() => !!(window.__hd && window.__hd.econ));
  const earned = await page3.evaluate(() => { __hd.econ.wallet.earnDibs(3, 'test', 'test'); return __hd.econ.save().dibs; });
  const canary3 = all3.some(t => t.includes('[canary] ' + cid3));
  report('private-browsing fallback',
    booted && earned >= 3 && errors3.length === 0 && canary3,
    { booted, earned, errors3, canary3 });
  await page3.close();

  // ---- final: zero console errors on the main page across scenarios 1-2 ----
  report('zero console errors (main page)', errors.length === 0, { errors });
} catch (e) {
  failures++;
  console.log('FAIL harness  ' + (e && e.stack || e));
}

console.log(`\n==== ${failures ? failures + ' FAILED' : 'all scenarios ok'} ====`);
console.log('screenshot: ' + shotPath);
await browser.close(); vite.kill();
process.exit(failures ? 1 : 0);
