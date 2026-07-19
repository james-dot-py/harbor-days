// 093: rink E2E — walk in via the stairs/gate, skate a full perimeter loop of
// the GROWN sheet (61-74.5 x 775.5-822), then land a hop-spin trick FAR from
// the 049 bounds (old sheet 61.5-72.5 x 780-818): the trick spot (73.8,819.8)
// is outside the old x1 AND the old z1. Asserts: glide on (state.onIce),
// no stalls, iceHops increments on the SPACE trick, zero console errors.
// Spawns its OWN vite (strict port). Usage: node tools/tmp-093-rinkbot.mjs [port]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const port = +(process.argv[2] || 5312);
const vite = spawn(process.execPath,
  [join(here, '..', 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'],
  { cwd: join(here, '..') });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite start timeout')), 30000);
  vite.stdout.on('data', d => {
    if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); }
  });
  vite.stderr.on('data', d => process.stderr.write(d));
});
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
page.on('console', m => { if (m.type() === 'error' && !isNoise(m.text())) errors.push('[console.error] ' + m.text()); });
let sawCanary = false;
page.on('console', m => { if (m.text().startsWith('[canary] rinkbot')) sawCanary = true; });

// walk in from the spine, through the gate, then the big perimeter loop
// (inset ~0.8 off the boards), ending at the trick spot in the NEW SE room.
const PATH = [
  [55, 800], [58, 800], [60.4, 800], [62, 800],           // stairs -> landing -> gate
  [64, 792], [63, 782], [66, 777.5], [71, 777.2],         // up the west lane, across the N end
  [73.6, 782], [73.7, 795], [73.7, 808],                  // down the new EAST lane (x > old 72.5)
  [72, 817], [66, 820.8], [62.4, 816],                    // across the S end (z > old 818)
  [62.2, 800], [62.4, 788],                               // back up the west lane
  [68, 786], [73, 792], [73.8, 806], [73.8, 819.8],       // diagonal out to the trick spot (NEW SE room)
];
await page.goto(`http://localhost:${port}/?play=1&x=55&z=800&canary=rinkbot`,
  { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise(r => setTimeout(r, 900));
const res = await page.evaluate(async ({ path }) => {
  const hd = window.__hd, P = hd.player, { joy, cam } = hd.input;
  const out = { frames: 0, stalls: 0, stallAt: [], done: false, onIceFrames: 0, everOnIce: false,
                maxSpeed: 0, end: null };
  let pi = 0, prev = null, stallRun = 0;
  await new Promise(resolve => {
    const step = () => {
      while (pi < path.length - 1 && Math.hypot(path[pi][0] - P.x, path[pi][1] - P.z) < 2.6) pi++;
      const T = path[pi];
      let dx = T[0] - P.x, dz = T[1] - P.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const Fx = Math.sin(cam.yaw), Fz = Math.cos(cam.yaw), Rx = -Math.cos(cam.yaw), Rz = Math.sin(cam.yaw);
      joy.z = -(dx * Fx + dz * Fz); joy.x = dx * Rx + dz * Rz; joy.len = 1;
      out.frames++;
      const st = hd.gstate;
      if (st && st.onIce) { out.onIceFrames++; out.everOnIce = true; }
      if (prev && out.frames > 40) {
        const sp = Math.hypot(P.x - prev.x, P.z - prev.z);
        out.maxSpeed = Math.max(out.maxSpeed, sp * 60);
        if (sp < 0.012) { if (++stallRun === 10) { out.stalls++; out.stallAt.push([+P.x.toFixed(1), +P.z.toFixed(1)]); stallRun = 0; } }
        else stallRun = 0;
      }
      prev = { x: P.x, z: P.z };
      const end = path[path.length - 1];
      if (pi >= path.length - 1 && Math.hypot(end[0] - P.x, end[1] - P.z) < 1.4) out.done = true;
      if (out.done || out.frames > 5400) { joy.x = joy.z = 0; joy.len = 0; out.end = [+P.x.toFixed(1), +P.z.toFixed(1)]; resolve(); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  return out;
}, { path: PATH });
console.log(`skate loop: done=${res.done} frames=${res.frames} stalls=${res.stalls}${res.stalls ? ' at ' + JSON.stringify(res.stallAt) : ''} onIceFrames=${res.onIceFrames} end=${JSON.stringify(res.end)}`);

// the TRICK: hop-spin (SPACE) at the spot outside the 049 bounds
const pre = await page.evaluate(() => ({ hops: window.__hd.gstate?.iceHops || 0,
  x: +window.__hd.player.x.toFixed(2), z: +window.__hd.player.z.toFixed(2),
  onIce: !!window.__hd.gstate?.onIce }));
console.log(`pre-trick: at (${pre.x},${pre.z}) onIce=${pre.onIce} hops=${pre.hops}`);
await page.keyboard.down('Space');
await new Promise(r => setTimeout(r, 200));
await page.keyboard.up('Space');
let post = pre, tries = 0;
while (tries++ < 30) {
  await new Promise(r => setTimeout(r, 100));
  post = await page.evaluate(() => ({ hops: window.__hd.gstate?.iceHops || 0 }));
  if (post.hops > pre.hops) break;
}
console.log(`post-trick: hops=${post.hops} (was ${pre.hops})`);
await page.screenshot({ path: join(here, 'shots', '093-rink-trick.png') });

const outsideOld = pre.x > 72.5 && pre.z > 818;
const ok = res.done && res.stalls === 0 && res.everOnIce && pre.onIce && outsideOld
  && post.hops > pre.hops && sawCanary && errors.length === 0;
if (!sawCanary) console.log('CANARY MISSING — wrong server?');
if (!outsideOld) console.log(`TRICK SPOT NOT OUTSIDE OLD BOUNDS: (${pre.x},${pre.z})`);
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
await browser.close(); vite.kill();
console.log(ok ? 'RINKBOT GREEN' : 'RINKBOT FAILED');
process.exit(ok ? 0 : 1);
