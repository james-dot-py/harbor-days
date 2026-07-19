// 093: BP-crossing WALK TIME measurement (before/after the shortening).
// Drives the real input path (crossbot pattern) along BP_DECK_PTS both ways
// and reports GAME seconds (sum of main.js-clamped dt) + polyline length.
// Spawns its OWN vite (strict port). Usage: node tools/tmp-093-bridgetime.mjs [port]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as M from '../src/data/millennium.js';

const here = dirname(fileURLToPath(import.meta.url));
const port = +(process.argv[2] || 5311);
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
let sawCanary = false;
page.on('console', m => { if (m.text().startsWith('[canary] bridgetime')) sawCanary = true; });

const bp = M.BP_DECK_PTS.map(p => [p[0], p[1]]);
let len = 0;
for (let i = 1; i < bp.length; i++) len += Math.hypot(bp[i][0] - bp[i - 1][0], bp[i][1] - bp[i - 1][1]);
console.log(`BP_DECK_PTS polyline length: ${len.toFixed(1)} m (${M.BP_CROSSING_M.nodes.length} nodes)`);

async function run(label, path, startX, startZ) {
  await page.goto(`http://localhost:${port}/?play=1&x=${startX}&z=${startZ}&canary=bridgetime`,
    { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 900));
  const res = await page.evaluate(async ({ path }) => {
    const hd = window.__hd, P = hd.player, { joy, cam } = hd.input;
    const out = { frames: 0, gameT: 0, done: false, stalls: 0 };
    let pi = 0, prev = null, stallRun = 0, last = performance.now();
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
      const step = (now) => {
        const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;   // main.js clamp
        out.gameT += dt;
        while (pi < path.length - 1 && Math.hypot(path[pi][0] - P.x, path[pi][1] - P.z) < 2.0) pi++;
        let T = path[pi];
        if (stallRun >= 4) T = nearest();
        let dx = T[0] - P.x, dz = T[1] - P.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const Fx = Math.sin(cam.yaw), Fz = Math.cos(cam.yaw), Rx = -Math.cos(cam.yaw), Rz = Math.sin(cam.yaw);
        joy.z = -(dx * Fx + dz * Fz); joy.x = dx * Rx + dz * Rz; joy.len = 1;
        out.frames++;
        if (prev && out.frames > 40) {
          const sp = Math.hypot(P.x - prev.x, P.z - prev.z);
          if (sp < 0.015) { if (++stallRun === 8) out.stalls++; }
          else stallRun = 0;
        }
        prev = { x: P.x, z: P.z };
        const end = path[path.length - 1];
        if (pi >= path.length - 1 && Math.hypot(end[0] - P.x, end[1] - P.z) < 1.6) out.done = true;
        if (out.done || out.frames > 7200) { joy.x = joy.z = 0; joy.len = 0; resolve(); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    return out;
  }, { path });
  console.log(`${label}: done=${res.done} gameTime=${res.gameT.toFixed(1)}s frames=${res.frames} stalls=${res.stalls}`);
  return res;
}

const f = await run('BP fwd (lawn->Maggie)', bp, 173, 836);
const b = await run('BP back (Maggie->lawn)', [...bp].reverse(), 248, 808);
await browser.close(); vite.kill();
if (!sawCanary) { console.log('CANARY MISSING — wrong server?'); process.exit(1); }
process.exit(f.done && b.done ? 0 : 1);
