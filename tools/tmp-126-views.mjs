// tmp-126-views — the JUDGED through-the-optic views after the 126 camera-
// ownership fix. Each beat: walk-up stand, press E, let the (now single-writer)
// fov ease settle, shoot. Desktop 1280x720 and portrait phone 390x844.
//   node tools/tmp-126-views.mjs [port]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const OUT = join(here, 'shots');
const PORT = +(process.argv[2] || 5268);

const VIEWS = [
  { id: 'scope-south', x: -20.5, z: 983.2, mobile: false },
  { id: 'scope-north', x: -19.3, z: 979.2, mobile: false },
  { id: 'scope-west', x: -22.6, z: 980.6, mobile: false },
  { id: 'scope-mobile', x: -20.5, z: 983.2, mobile: true },
  // the binoculars are AIMED by the look stick (yaw +1.57 = east), so every
  // binoc stand carries one: the sanctuary gate looking into the room, and the
  // dog-beach vantage looking out over the water at the plover.
  { id: 'binoc', x: 100.5, z: -381, yaw: 1.57, mobile: false },
  { id: 'binoc-beach', x: 100, z: -344, yaw: 1.57, mobile: false },
  { id: 'binoc-deck', x: 172.25, z: -396.25, yaw: -1.46, mobile: false },   // the HERO perch: the elevated Jarvis watching deck, aimed WSW across the clearings
  { id: 'scope-idle', x: -20.5, z: 983.2, mobile: false, press: false },    // NOT pressed: the tripod must be back on the deck (the session hides it)
  { id: 'doors', x: -70, z: 711.2, mobile: false },
  { id: 'doors-mobile', x: -70, z: 711.2, mobile: true },
];

const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PORT), '--strictPort'], { cwd: root });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite did not start')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').includes('localhost:' + PORT)) { clearTimeout(t); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
let bad = 0;
for (const V of VIEWS) {
  if (ONLY.length && !ONLY.includes(V.id)) continue;
  const page = await browser.newPage();
  await page.setViewport(V.mobile ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1280, height: 720 });
  const errors = [], canary = [];
  const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
  page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !isNoise(t)) errors.push('[console.error] ' + t); else if (t.startsWith('[canary]')) canary.push(t); });
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
  await page.goto(`http://localhost:${PORT}/?play=1&coach=0&x=${V.x}&z=${V.z}${V.yaw !== undefined ? '&yaw=' + V.yaw : ''}&canary=t126view`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start').click(); });
  await sleep(3200);
  if (V.press === false) { /* no press: judge the un-fired state */ }
  else if (V.mobile) {   // touch: the ✋ hand button is the E key
    const r = await page.evaluate(() => { const el = document.getElementById('btnAct'); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
    if (r) { await page.touchscreen.touchStart(r.x, r.y); await sleep(180); await page.touchscreen.touchEnd(); }
    else { await page.keyboard.down('e'); await sleep(160); await page.keyboard.up('e'); }
  } else { await page.keyboard.down('e'); await sleep(160); await page.keyboard.up('e'); }
  await sleep(1300);   // the fov ease settles (rate 9 -> ~0.5 s), toast still up
  const st = await page.evaluate(() => ({ own: window.__hd.camDbg().own, fov: +window.__hd.camDbg().fov.toFixed(2), perf: window.__hd.perf ? window.__hd.perf().drawCalls : null }));
  const f = join(OUT, 'tmp126-view-' + V.id + '.png');
  await page.screenshot({ path: f });
  await page.close();
  const ok = (V.press === false ? st.own === null : st.own !== null) && (!errors.length) && canary.some(c => c.includes('t126view'));
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'BAD '} ${V.id.padEnd(14)} own=${st.own} fov=${st.fov} draws=${st.perf}${errors.length ? '  ERRORS ' + errors.join(' | ') : ''}${canary.length ? '' : '  CANARY MISSING'}`);
}
await browser.close(); vite.kill();
console.log(bad === 0 ? 'ALL VIEWS CAPTURED IN-SESSION' : bad + ' VIEW(S) NOT IN-SESSION');
