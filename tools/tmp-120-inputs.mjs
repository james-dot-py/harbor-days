// tmp-120: BOTH real input paths cross the rebuilt Fullerton underpass (issue
// 035 acceptance: "desktop AND mobile input paths"). The continuity bot drives
// __hd.input.joy directly, so this harness exercises the true edges instead:
//   A. desktop — a held 'w' KEYBOARD walk (camera pre-yawed west) from the east
//      trail head, down the ramp, under the Drive, up into the park.
//   B. mobile  — a held TOUCH drag on the on-screen joystick (390x844, hasTouch,
//      coach=0 per PITFALLS) over the same route, with an in-tunnel screenshot.
// Each asserts: ended west of the berm (x <= -6), actually DIPPED through the
// tunnel (minY <= -2.9), never mounted the jetski, zero console/page errors,
// canary echoed. Own vite (never the foreign 5173).
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const port = 5263;
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'], { cwd: root });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().match(/localhost:\d+/)) { clearTimeout(to); res(); } });
  vite.on('exit', c => rej(new Error('vite exited ' + c)));
});
const kill = () => process.platform === 'win32'
  ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f'])
  : vite.kill();

let fails = 0;
const expect = (label, ok, detail) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + label + (ok ? '' : '  -> ' + detail));
  if (!ok) fails++;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

// sample player state each frame for `ms` while the caller holds input
const track = (page, ms) => page.evaluate(async (ms) => {
  const P = window.__hd.player;
  const out = { minY: 1e9, endX: 0, endZ: 0, jetski: false };
  const t0 = performance.now();
  while (performance.now() - t0 < ms) {
    await new Promise(r => requestAnimationFrame(r));
    out.minY = Math.min(out.minY, P.y);
    if (window.__hd.jsk && window.__hd.jsk.on) out.jetski = true;
  }
  out.endX = P.x; out.endZ = P.z;
  return out;
}, ms);

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
try {
  // ---------------- A. DESKTOP: held 'w' key ----------------
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    const errors = [], canary = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !t.includes('favicon') && !t.includes('404 (Not Found)')) errors.push(t); if (t.startsWith('[canary]')) canary.push(t); });
    await page.goto(`http://localhost:${port}/?play=1&quiet=1&x=30&z=661&yaw=-1.57&canary=in120d`, { waitUntil: 'networkidle0', timeout: 60000 });
    await sleep(1200);
    await page.keyboard.down('w');
    const r = await track(page, 20000);
    await page.keyboard.up('w');
    expect('desktop canary echoed', canary.some(c => c.includes('in120d')), canary.join('|'));
    expect('desktop zero errors', errors.length === 0, errors.join(' | '));
    expect(`desktop W-walk crossed the Drive (end x ${r.endX.toFixed(1)} <= -6)`, r.endX <= -6, JSON.stringify(r));
    expect(`desktop walk DIPPED through the tunnel (minY ${r.minY.toFixed(2)} <= -2.9)`, r.minY <= -2.9, '');
    expect('desktop never mounted the jetski', !r.jetski, '');
    await page.close();
  }
  // ---------------- B. MOBILE: on-screen joystick drag ----------------
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const errors = [], canary = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !t.includes('favicon') && !t.includes('404 (Not Found)')) errors.push(t); if (t.startsWith('[canary]')) canary.push(t); });
    await page.goto(`http://localhost:${port}/?play=1&quiet=1&coach=0&x=30&z=661&yaw=-1.57&canary=in120m`, { waitUntil: 'networkidle0', timeout: 60000 });
    await sleep(1200);
    const jz = await page.evaluate(() => { const r = document.getElementById('jzone').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    // held joystick drag: touch down at the stick centre, deflect UP (forward —
    // the camera is pre-yawed west), hold deflected while the walk runs.
    await page.touchscreen.touchStart(jz.x, jz.y);
    for (let i = 1; i <= 8; i++) { await page.touchscreen.touchMove(jz.x, jz.y - i * 8); await sleep(16); }
    const mid = track(page, 22000);
    await sleep(5200);                       // ~mid-tunnel (walk ~4.2 m/s from x30: tunnel x14..0 spans ~3.8-7.1 s)
    await page.screenshot({ path: join(here, 'shots', 'tmp-120-mobile-tunnel.png') });
    const r = await mid;
    await page.touchscreen.touchEnd();
    expect('mobile canary echoed', canary.some(c => c.includes('in120m')), canary.join('|'));
    expect('mobile zero errors', errors.length === 0, errors.join(' | '));
    expect(`mobile joystick crossed the Drive (end x ${r.endX.toFixed(1)} <= -6)`, r.endX <= -6, JSON.stringify(r));
    expect(`mobile walk DIPPED through the tunnel (minY ${r.minY.toFixed(2)} <= -2.9)`, r.minY <= -2.9, '');
    expect('mobile never mounted the jetski', !r.jetski, '');
    await page.close();
  }
  // ---------------- C. MOBILE FRAMING: mid-tunnel portrait read ----------------
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://localhost:${port}/?play=1&quiet=1&coach=0&x=7&z=661&yaw=-1.57&canary=in120s`, { waitUntil: 'networkidle0', timeout: 60000 });
    await sleep(2600);
    await page.screenshot({ path: join(here, 'shots', 'tmp-120-mobile-tunnel.png') });
    expect('mobile mid-tunnel framing shot, zero errors', errors.length === 0, errors.join(' | '));
    await page.close();
  }
} finally {
  await browser.close();
  kill();
}
console.log(fails ? `tmp-120-inputs: ${fails} FAIL` : 'tmp-120-inputs: clean');
process.exit(fails ? 1 : 0);
