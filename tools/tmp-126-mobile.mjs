// tmp (126 verify): the eyepiece on a PORTRAIT phone. The 126 fix sized the
// scope mask off the SHORT side (min(27vh,34vw)) because pure vh made the hole
// wider than a 390 px portrait viewport — the "scope" read as a letterbox, not
// an eyepiece. That is a mobile-only CSS claim no desktop shot can verify, so
// this spawns its own vite, loads ?scope=1 at 390x844 and 844x390, and measures
// the rendered hole against the viewport as well as shooting it.
//   node tools/tmp-126-mobile.mjs [port]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const PORT = +(process.argv[2] || 5273);

const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PORT), '--strictPort'], { cwd: root });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite did not start')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').includes('localhost:' + PORT)) { clearTimeout(t); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});

const sleep = ms => new Promise(r => setTimeout(r, ms));
const VIEWS = [
  { id: 'tmp126-scope-portrait', w: 390, h: 844 },
  { id: 'tmp126-scope-landscape', w: 844, h: 390 },
];
let bad = 0;
const browser = await puppeteer.launch({ headless: 'new', args: ['--mute-audio'] });
for (const V of VIEWS) {
  const page = await browser.newPage();
  await page.setViewport({ width: V.w, height: V.h, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const errors = [], canary = [];
  const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
  page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !isNoise(t)) errors.push('[console.error] ' + t); else if (t.startsWith('[canary]')) canary.push(t); });
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

  await page.goto(`http://localhost:${PORT}/?play=1&x=-20.5&z=983.2&yaw=2.78&pitch=0.06&dist=8&scope=1&coach=0&canary=t126m`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start').click(); });
  await sleep(3600);

  // The eyepiece hole: resolve the mask's inner radius the way the browser did.
  const m = await page.evaluate(() => {
    const vh = innerHeight / 100, vw = innerWidth / 100;
    return { inner: Math.min(27 * vh, 34 * vw), outer: Math.min(41 * vh, 52 * vw), w: innerWidth, h: innerHeight,
             fov: window.__hd.camDbg().fov, own: window.__hd.camDbg().own };
  });
  await page.screenshot({ path: join(here, 'shots', V.id + '.png') });
  await page.close();

  // "Reads as a circle" is a claim about the TRANSPARENT hole: its diameter has
  // to fit inside the short side, so the eyepiece closes on all four sides. The
  // pre-126 27vh gave a 228 px radius against a 390 px width — a hole wider than
  // the screen, i.e. a letterbox. The OUTER fade radius is allowed to run past
  // the frame (that just means the vignette is fully black by the corners, which
  // is what a vignette is for) so it is reported, not asserted.
  const shortSide = Math.min(m.w, m.h);
  const fits = m.inner * 2 <= shortSide * 0.95;
  const held = m.own === 'lp-heron-scope';
  const ok = fits && held && !errors.length && canary.some(c => c.includes('t126m'));
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${V.id.padEnd(24)} viewport ${m.w}x${m.h}  hole r=${m.inner.toFixed(0)}/${m.outer.toFixed(0)}px  (2*outer ${(m.outer * 2).toFixed(0)} vs short side ${shortSide})  fov ${m.fov.toFixed(2)}  own=${m.own}`);
  for (const e of errors) console.log('   ' + e);
}
await browser.close(); vite.kill();
console.log(bad === 0 ? '\nEYEPIECE READS AS A CIRCLE ON BOTH PHONE ORIENTATIONS' : `\n${bad} MOBILE VIEW(S) BAD`);
process.exit(bad === 0 ? 0 : 1);
