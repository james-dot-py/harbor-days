// issue 025 verification bot. Drives the REAL input path (__hd.input, same
// camera-relative mapping as main.js) to:
//   A. reproduce the owner's arch approach + walk ONTO the grass (no stall)
//   B. verify the ANTI-TRAP escape: inject a synthetic non-walk block under the
//      player (__hd.setTrap) and assert the player escapes it — even with ZERO
//      input (the guarantee), and while holding input (composes with control).
// Spawns its OWN strict-port vite. Usage: node tools/tmp-trapbot.mjs [port]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as M from '../src/data/millennium.js';

const here = dirname(fileURLToPath(import.meta.url));
const port = +(process.argv[2] || 5219);
const vite = spawn(process.execPath,
  [join(here, '..', 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'],
  { cwd: join(here, '..') });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite start timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = []; let sawCanary = false;
const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !isNoise(m.text())) errors.push('[console.error] ' + m.text()); if (m.text().startsWith('[canary] trapbot')) sawCanary = true; });

async function load(x, z) {
  await page.goto(`http://localhost:${port}/?play=1&x=${x}&z=${z}&canary=trapbot`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
  await new Promise(r => setTimeout(r, 900));
}

// ---- A. walk a path, detect stalls (a wedge/collider that freezes the mayor) ----
async function walk(label, path, shotName) {
  await load(path[0][0], path[0][1]);
  const res = await page.evaluate(async ({ path }) => {
    const hd = window.__hd, P = hd.player, { joy, cam } = hd.input;
    const out = { frames: 0, stalls: 0, stallAt: [], done: false, cell: !!(hd.player) };
    let pi = 0, prev = null, stallRun = 0;
    await new Promise(resolve => {
      const step = () => {
        while (pi < path.length - 1 && Math.hypot(path[pi][0] - P.x, path[pi][1] - P.z) < 2.0) pi++;
        const T = path[pi];
        let dx = T[0] - P.x, dz = T[1] - P.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const Fx = Math.sin(cam.yaw), Fz = Math.cos(cam.yaw), Rx = -Math.cos(cam.yaw), Rz = Math.sin(cam.yaw);
        joy.z = -(dx * Fx + dz * Fz); joy.x = dx * Rx + dz * Rz; joy.len = 1;
        out.frames++;
        if (prev && out.frames > 40) {
          const sp = Math.hypot(P.x - prev.x, P.z - prev.z);
          if (sp < 0.015) { if (++stallRun === 8) { out.stalls++; out.stallAt.push([+P.x.toFixed(1), +P.z.toFixed(1)]); } } else stallRun = 0;
        }
        prev = { x: P.x, z: P.z };
        const end = path[path.length - 1];
        if (pi >= path.length - 1 && Math.hypot(end[0] - P.x, end[1] - P.z) < 1.8) out.done = true;
        if (out.done || out.frames > 1200) { joy.x = joy.z = 0; joy.len = 0; out.endX = +P.x.toFixed(1); out.endZ = +P.z.toFixed(1); resolve(); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    return out;
  }, { path });
  if (shotName) await page.screenshot({ path: join(here, 'shots', shotName + '.png') });
  const pass = res.done && res.stalls === 0;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label}: done=${res.done} frames=${res.frames} stalls=${res.stalls}${res.stalls ? ' at ' + JSON.stringify(res.stallAt) : ''} end(${res.endX},${res.endZ})`);
  return pass;
}

// ---- B. synthetic trap escape ----
async function trapTest(label, tx, tz, half, inX, inZ, shotName) {
  await load(tx, tz);
  const res = await page.evaluate(async ({ tx, tz, half, inX, inZ }) => {
    const hd = window.__hd, P = hd.player, { joy, cam } = hd.input;
    P.x = tx; P.z = tz; P.vx = 0; P.vz = 0;
    await new Promise(r => requestAnimationFrame(r));
    const box = { x0: tx - half, x1: tx + half, z0: tz - half, z1: tz + half };
    hd.setTrap(box);
    const inside = () => P.x >= box.x0 && P.x <= box.x1 && P.z >= box.z0 && P.z <= box.z1;
    const startInside = inside();
    if (inX || inZ) {   // hold a world-space input dir (map to joy like main.js)
      const Fx = Math.sin(cam.yaw), Fz = Math.cos(cam.yaw), Rx = -Math.cos(cam.yaw), Rz = Math.sin(cam.yaw);
      joy.z = -(inX * Fx + inZ * Fz); joy.x = inX * Rx + inZ * Rz; joy.len = Math.hypot(inX, inZ);
    } else { joy.x = 0; joy.z = 0; joy.len = 0; }   // ZERO input — the escape must still fire
    let frames = 0, escaped = false, escFrame = -1;
    await new Promise(resolve => {
      const step = () => {
        frames++;
        if (!escaped && !inside()) { escaped = true; escFrame = frames; }
        if (frames >= 150) { joy.x = joy.z = 0; joy.len = 0; resolve(); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    hd.setTrap(null);
    return { startInside, escaped, escFrame, endX: +P.x.toFixed(2), endZ: +P.z.toFixed(2) };
  }, { tx, tz, half, inX, inZ });
  if (shotName) await page.screenshot({ path: join(here, 'shots', shotName + '.png') });
  const endWalk = M.walkableM(res.endX, res.endZ);   // outside the (now-cleared) box → real walkability
  const pass = res.startInside && res.escaped && endWalk;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label}: startInside=${res.startInside} escaped=${res.escaped}@f${res.escFrame} end(${res.endX},${res.endZ}) endWalkable=${endWalk}`);
  return pass;
}

let ok = true;
// A — owner approach: N down the closed Columbus strip, under the arch, ONTO the grass
ok = await walk('owner approach N->S under arch onto grass', [[196, 905], [196, 923], [205, 930], [220, 945]], '025-owner-approach') && ok;
ok = await walk('arch S->N (other side)', [[210, 945], [196, 928], [196, 908]], '025-arch-northbound') && ok;
// grass access from the closed street at 3 latitudes (the closed east seam)
// beside the arch (z922, clear of the z925 leg posts): the closed street opens onto the grass
ok = await walk('street->grass E beside arch (z922)', [[194, 922], [206, 922], [216, 922]], '025-grass-beside-arch') && ok;
ok = await walk('street->grass E @z975', [[196, 975], [208, 975], [218, 975]]) && ok;
ok = await walk('street->grass E @z1000', [[196, 1000], [208, 1000], [218, 1000]]) && ok;
// B — synthetic trap escape (the GUARANTEE)
ok = await trapTest('trap escape, ZERO input, box +-1.5', 290, 985, 1.5, 0, 0, '025-trap-escape') && ok;
ok = await trapTest('trap escape, input +x, box +-1.5', 290, 985, 1.5, 1, 0) && ok;
ok = await trapTest('trap escape, ZERO input, BIG box +-2.8', 250, 990, 2.8, 0, 0) && ok;

await browser.close(); vite.kill();
if (!sawCanary) { console.log('CANARY MISSING — wrong server?'); ok = false; }
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); ok = false; }
console.log(ok ? 'TRAPBOT GREEN' : 'TRAPBOT FAILED');
process.exit(ok ? 0 : 1);
