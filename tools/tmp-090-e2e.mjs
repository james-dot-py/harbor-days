// tmp (090): lake-mood both-inputs E2E smoke. Spawns its OWN vite (never attach to
// :5173 — a foreign/stale server there is a known trap), parses the ACTUAL port from
// vite stdout (stripping ANSI codes), canary-gates each page, kills vite on exit. NO
// screenshots (the repo PNG gate requires every shot be read by the main session) —
// every assertion is a page.evaluate / DOM read.
//
// DESKTOP leg (1280x720, mood=rain&rainon=1): rain mood is live, drizzle phase ON,
//   >=1 NPC umbrella up, keyboard WASD walks the player, and the journal shows the
//   'drizzle' mood line.
// TOUCH leg (390x844 mobile, mood=fog): fog mood is live with a deepened fog.far,
//   and the on-screen joystick walks the player.
// Usage: node tools/tmp-090-e2e.mjs [port]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const runid = 'e2e090-' + Date.now().toString(36);

let fails = 0;
function check(name, cond, detail) {
  const ok = !!cond;
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail != null ? '  (' + detail + ')' : ''));
  if (!ok) fails++;
  return ok;
}

// 1. own vite; parse the ACTUAL port from stdout (strip ANSI color codes).
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: root });
const port = await new Promise((res, rej) => {
  let buf = '';
  const to = setTimeout(() => rej(new Error('vite did not report a port in 30s:\n' + buf)), 30000);
  vite.stdout.on('data', d => {
    buf += d.toString();
    const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/);
    if (m) { clearTimeout(to); res(+m[1]); }
  });
  vite.stderr.on('data', d => { buf += d.toString(); });
  vite.on('exit', c => rej(new Error('vite exited early (' + c + '):\n' + buf)));
});
const killVite = () => { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill(); };
console.log('tmp-090-e2e: vite on port ' + port + ' · run ' + runid);

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });

// build a page with its own error + canary tracking
const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
async function trackedPage() {
  const page = await browser.newPage();
  const errors = [];
  const canaries = new Set();
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
  page.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' && !isNoise(t)) errors.push('[console.error] ' + t);
    const cm = t.match(/\[canary\]\s+(\S+)/);
    if (cm) canaries.add(cm[1]);
  });
  return { page, errors, canaries };
}
const pos = page => page.evaluate(() => ({ x: window.__hd.player.x, z: window.__hd.player.z }));

try {
  // ---------- DESKTOP leg ----------
  {
    const id = runid + '-desk';
    const { page, errors, canaries } = await trackedPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(`http://localhost:${port}/?play=1&quiet=1&mood=rain&rainon=1&canary=${id}`, { waitUntil: 'networkidle0', timeout: 60000 });
    await sleep(4000);

    check('desktop canary echoed', canaries.has(id), id);
    const m = await page.evaluate(() => {
      const md = window.__hd.mood090;
      return { mood: md.mood, raining: md.raining(), umbrellas: md.umbrellas() };
    });
    check("desktop mood === 'rain'", m.mood === 'rain', m.mood);
    check('desktop raining() === true', m.raining === true, String(m.raining));
    check('desktop umbrellas() >= 1', m.umbrellas >= 1, String(m.umbrellas));
    check('desktop no console/page errors', errors.length === 0, errors.join(' | ') || 'none');

    // WALK: hold W across many frames (a rising-edge tap can miss headless).
    const before = await pos(page);
    await page.keyboard.down('w');
    await sleep(1200);
    await page.keyboard.up('w');
    await sleep(200);
    const after = await pos(page);
    const dist = Math.hypot(after.x - before.x, after.z - before.z);
    check('desktop WASD walk > 1.5 m under rain', dist > 1.5, dist.toFixed(2) + ' m');

    // JOURNAL: HOLD J (a plain press misses the rising-edge latch headless).
    await page.keyboard.down('j');
    await sleep(180);
    await page.keyboard.up('j');
    await sleep(300);
    const jtext = await page.evaluate(() => (document.getElementById('journalBody')?.innerText || '').toLowerCase());
    check("desktop journal mentions 'drizzle'", jtext.includes('drizzle'));

    await page.close();
  }

  // ---------- TOUCH leg ----------
  {
    const id = runid + '-touch';
    const { page, errors, canaries } = await trackedPage();
    await page.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true });
    await page.goto(`http://localhost:${port}/?play=1&quiet=1&mood=fog&canary=${id}`, { waitUntil: 'networkidle0', timeout: 60000 });
    await sleep(4000);

    check('touch canary echoed', canaries.has(id), id);
    const f = await page.evaluate(() => {
      const md = window.__hd.mood090;
      return { mood: md.mood, fogFar: md.fogFar() };
    });
    check("touch mood === 'fog'", f.mood === 'fog', f.mood);
    check('touch fogFar() < 200 (deepened from 210)', f.fogFar < 200, String(f.fogFar));
    check('touch no console/page errors', errors.length === 0, errors.join(' | ') || 'none');

    // JOYSTICK walk: the joystick zone is the lower-LEFT of the screen. A headless
    // tap can start+end inside one frame gap and miss the input latch — so start the
    // touch, MOVE it up across several frames, then HOLD the deflection (~900ms total
    // touch-down) before releasing.
    const before = await pos(page);
    await page.touchscreen.touchStart(80, 760);
    const steps = [750, 740, 725, 710, 700];   // drive the stick upward over ~500ms
    for (const y of steps) { await page.touchscreen.touchMove(80, y); await sleep(100); }
    await sleep(400);                            // hold deflected (~900ms total down)
    await page.touchscreen.touchEnd();
    await sleep(200);
    const after = await pos(page);
    const dist = Math.hypot(after.x - before.x, after.z - before.z);
    check('touch joystick walk > 1 m', dist > 1, dist.toFixed(2) + ' m');

    await page.close();
  }
} finally {
  await browser.close();
  killVite();
}

console.log(fails ? `\nTMP-090-E2E FAILED (${fails} check(s))` : '\nTMP-090-E2E GREEN');
process.exit(fails ? 1 : 0);
