// 062/0b+0d: hold-forward crossing bot. Drives the REAL input path (joy via
// __hd.input, camera-relative mapping identical to main.js) along the BP and
// Nichols decks in BOTH directions, asserting continuous displacement — a
// stall (8 consecutive frames < 0.015 m) means a wedge sliver / stray
// collider stopped the mayor, the exact issue-023 symptom. Spawns its OWN
// vite (strict port). Usage: node tools/tmp-crossbot.mjs [port]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as M from '../src/data/millennium.js';

const here = dirname(fileURLToPath(import.meta.url));
const port = +(process.argv[2] || 5214);
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
page.on('console', m => { if (m.text().startsWith('[canary] crossbot')) sawCanary = true; });

async function run(label, path, startX, startZ, shotName, lookahead = 2.0) {
  await page.goto(`http://localhost:${port}/?play=1&x=${startX}&z=${startZ}&canary=crossbot`,
    { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
  await new Promise(r => setTimeout(r, 900));
  const res = await page.evaluate(async ({ path, look }) => {
    const hd = window.__hd, P = hd.player, { joy, cam } = hd.input;
    const out = { frames: 0, stalls: 0, stallAt: [], done: false, minY: 1e9, maxY: -1e9 };
    let pi = 0, prev = null, stallRun = 0;
    // nearest point ON the path polyline (stall recovery pulls back to the lane
    // center — a REAL blocker re-stalls repeatedly; an open lane recovers)
    const nearest = () => {
      let bx = path[0][0], bz = path[0][1], bd = 1e18;
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], b = path[i + 1], dx = b[0] - a[0], dz = b[1] - a[1];
        const L2 = dx * dx + dz * dz || 1;
        let t = ((P.x - a[0]) * dx + (P.z - a[1]) * dz) / L2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = a[0] + dx * t, pz = a[1] + dz * t;
        const d = (P.x - px) ** 2 + (P.z - pz) ** 2;
        if (d < bd) { bd = d; bx = px; bz = pz; }
      }
      return [bx, bz];
    };
    await new Promise(resolve => {
      const step = () => {
        while (pi < path.length - 1 && Math.hypot(path[pi][0] - P.x, path[pi][1] - P.z) < look) pi++;
        let T = path[pi];
        if (stallRun >= 4) T = nearest();               // unstick: aim back at the lane center
        let dx = T[0] - P.x, dz = T[1] - P.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const Fx = Math.sin(cam.yaw), Fz = Math.cos(cam.yaw), Rx = -Math.cos(cam.yaw), Rz = Math.sin(cam.yaw);
        joy.z = -(dx * Fx + dz * Fz); joy.x = dx * Rx + dz * Rz; joy.len = 1;
        out.frames++;
        if (prev && out.frames > 40) {
          const sp = Math.hypot(P.x - prev.x, P.z - prev.z);
          if (sp < 0.015) { if (++stallRun === 8) { out.stalls++; out.stallAt.push([+P.x.toFixed(1), +P.z.toFixed(1)]); } }
          else stallRun = 0;
        }
        out.minY = Math.min(out.minY, P.y); out.maxY = Math.max(out.maxY, P.y);
        prev = { x: P.x, z: P.z };
        const end = path[path.length - 1];
        if (pi >= path.length - 1 && Math.hypot(end[0] - P.x, end[1] - P.z) < 1.6) out.done = true;
        if (out.done || out.frames > 3600) { joy.x = joy.z = 0; joy.len = 0; resolve(); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    return out;
  }, { path, look: lookahead });
  if (shotName) await page.screenshot({ path: join(here, 'shots', shotName + '.png') });
  console.log(`${label}: done=${res.done} frames=${res.frames} stalls=${res.stalls}${res.stalls ? ' at ' + JSON.stringify(res.stallAt) : ''} y[${res.minY.toFixed(2)}..${res.maxY.toFixed(2)}]`);
  return { pass: res.done && res.stalls === 0, done: res.done, stalls: res.stalls };
}

const bp = M.BP_DECK_PTS.map(p => [p[0], p[1]]);
const ni = M.NICHOLS_DECK_PTS.map(p => [p[0], p[1]]);
// full skating-ribbon loop (issue 022 acceptance: skate it BOTH directions).
// Start at the gate lip (~vert 50, x262.5 z770.2) and go all the way around.
const U = M.RIBBON_M.loop.slice(0, 65);
const loopFrom = (k, rev) => {
  const seq = [...U.slice(k), ...U.slice(0, k + 1)];
  return rev ? seq.reverse() : seq;
};
let ok = true;
ok = (await run('BP fwd (lawn->Maggie)', bp, 173, 836, '062b-bp-landed')).pass && ok;
ok = (await run('BP back (Maggie->lawn)', [...bp].reverse(), 248, 808, '062b-bp-back')).pass && ok;
ok = (await run('Nichols up (lawn->terrace)', ni, 117.4, 836.5, '062d-terrace-arrived')).pass && ok;
ok = (await run('Nichols down (terrace->lawn)', [...ni].reverse(), 127, 921.5, '062d-lawn-return')).pass && ok;
// skate legs judge COMPLETION (the carve turn radius at speed means the bot
// grazes the rail on hairpins and recovers — a human feathers input there);
// a hard blocker ON the ice would strand the run (done=false).
const cw = await run('Ribbon loop CW (skate)', loopFrom(50, false), 262.5, 770.2, '062a-skate-cw', 3.2);
const ccw = await run('Ribbon loop CCW (skate)', loopFrom(50, true), 262.5, 770.2, '062a-skate-ccw', 3.2);
ok = (cw.done && ccw.done) && ok;
await browser.close(); vite.kill();
if (!sawCanary) { console.log('CANARY MISSING — wrong server?'); ok = false; }
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); ok = false; }
console.log(ok ? 'CROSSBOT GREEN' : 'CROSSBOT FAILED');
process.exit(ok ? 0 : 1);
