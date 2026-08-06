// tmp-126-camstab — THE STABILITY ASSERTION for every look-through beat
// (issue 039). Samples __hd.camDbg() once per rAF while the session is held and
// asserts the RENDERED camera is still: consecutive-frame fov delta, position
// delta and angular delta all under threshold, and the fov actually REACHES the
// session's zoom (a camera fight settles at a midpoint and never arrives).
// Also proves the release restores the chase cam (owner back to null, fov home).
//   node tools/tmp-126-camstab.mjs [port]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const PORT = +(process.argv[2] || 5267);

// A beat: where to stand, how to trigger, the fov it promises, and the pixel
// budget for one frame of drift at that fov on a 720-tall viewport.
const BEATS = [
  { id: 'heron-scope-south', x: -20.5, z: 983.2, zoom: 26, note: 'approach from the deck south of the tripod' },
  { id: 'heron-scope-north', x: -19.3, z: 979.2, zoom: 26, note: 'approach from the heron side — the player used to sit across the lens' },
  { id: 'jarvis-binoc', x: 100.5, z: -381, zoom: 24, note: 'the Bill Jarvis sanctuary-gate binoculars (issue 039 twin)' },
  { id: 'conservatory-doors', x: -70, z: 711.2, zoom: 34, note: 'the glasshouse doors peek (issue 039 twin)' },
  { id: 'reserve-scope', x: 56, z: -778, zoom: 26, note: 'the 129 reserve platform scope (131 re-sign-off — stand on the deck, anchor 57.2,-779.5 r2.2; deliberate tripod sway stays under the px budget)' },
];
const MAX_FOV_D = 0.02;      // deg / frame — a fov fight pumps every frame
const MAX_POS_D = 0.004;     // m / frame
const MAX_ANG_PX = 1.2;      // px / frame of angular drift at the session fov

const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PORT), '--strictPort'], { cwd: root });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite did not start')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').includes('localhost:' + PORT)) { clearTimeout(t); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const qang = (a, b) => {   // angle between two quaternions, radians
  let d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return 2 * Math.acos(Math.min(1, d));
};
let bad = 0;
for (const B of BEATS) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errors = [], canary = [];
  const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
  page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !isNoise(t)) errors.push('[console.error] ' + t); else if (t.startsWith('[canary]')) canary.push(t); });
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

  await page.goto(`http://localhost:${PORT}/?play=1&x=${B.x}&z=${B.z}&canary=t126stab`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start').click(); });
  await sleep(3200);
  await page.evaluate(() => {
    window.__t = [];
    (function s() { window.__t.push(window.__hd.camDbg()); if (window.__t.length < 1200) requestAnimationFrame(s); })();
  });
  await page.keyboard.down('e'); await sleep(160); await page.keyboard.up('e');
  await sleep(2600);                                   // hold the session (all beats time out later than this)
  const held = await page.evaluate(() => { window.__mark = window.__t.length; return window.__hd.camDbg().own; });
  await page.keyboard.down('s'); await sleep(200); await page.keyboard.up('s');   // walk out: every beat releases on movement
  await sleep(1400);
  const after = await page.evaluate(() => ({ own: window.__hd.camDbg().own, fov: +window.__hd.camDbg().fov.toFixed(2), base: 50 }));
  const S = await page.evaluate(() => window.__t);
  const MARK = await page.evaluate(() => window.__mark);
  await page.close();

  // The SETTLED window: the 45 frames the session was held right before the
  // walk-out key. Blend-in/blend-out frames are motion by design and would
  // swamp the jitter measurement.
  const seg = S.slice(Math.max(0, MARK - 45), MARK).filter(s => s.own);
  let ok = true, msg = [];
  if (!held) { ok = false; msg.push('session never took the camera (own=' + held + ')'); }
  if (seg.length < 25) { ok = false; msg.push('only ' + seg.length + ' settled owned frames sampled'); }
  else {
    let mf = 0, mp = 0, ma = 0;
    for (let i = 1; i < seg.length; i++) {
      const a = seg[i - 1], b = seg[i];
      mf = Math.max(mf, Math.abs(b.fov - a.fov));
      mp = Math.max(mp, Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
      ma = Math.max(ma, qang([a.qx, a.qy, a.qz, a.qw], [b.qx, b.qy, b.qz, b.qw]));
    }
    const fov = seg[seg.length - 1].fov;
    const angPx = ma / (fov * Math.PI / 180) * 720;
    const zoomHit = Math.abs(fov - B.zoom) < 0.6;
    if (mf > MAX_FOV_D) { ok = false; msg.push(`fov pumps ${mf.toFixed(3)}deg/frame (>${MAX_FOV_D})`); }
    if (mp > MAX_POS_D) { ok = false; msg.push(`camera position jitters ${mp.toFixed(4)}m/frame`); }
    if (angPx > MAX_ANG_PX) { ok = false; msg.push(`angular drift ${angPx.toFixed(2)}px/frame (>${MAX_ANG_PX})`); }
    if (!zoomHit) { ok = false; msg.push(`fov settled at ${fov.toFixed(2)} — never reached the ${B.zoom} zoom`); }
    msg.unshift(`fov ${fov.toFixed(2)}/${B.zoom}  d-fov ${mf.toFixed(4)}  d-pos ${mp.toFixed(5)}m  d-ang ${angPx.toFixed(2)}px  frames ${seg.length}`);
  }
  if (after.own !== null) { ok = false; msg.push('camera NOT released after walking out (own=' + after.own + ')'); }
  if (Math.abs(after.fov - after.base) > 1.5) { ok = false; msg.push('fov did not return home after release (' + after.fov + ')'); }
  if (!canary.some(c => c.includes('t126stab'))) { ok = false; msg.push('CANARY MISSING'); }
  if (errors.length) { ok = false; msg.push('ERRORS ' + errors.join(' | ')); }
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${B.id.padEnd(20)} ${msg.join('  |  ')}`);
  if (!ok) console.log(`        (${B.note})`);
}
await browser.close(); vite.kill();
console.log(bad === 0 ? '\nALL LOOK-THROUGH BEATS STABLE' : `\n${bad} BEAT(S) UNSTABLE`);
process.exit(bad === 0 ? 0 : 1);
