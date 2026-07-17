// 084: timed Belmont->Montrose walk on the COMPRESSED map. Drives the real
// input path (__hd.input joy, camera-relative like main.js) from the spawn up
// the Lakefront Trail to the Montrose beach arrival, at WALK speed
// (joy.len 0.9 < the 0.92 run threshold). Reports: walked path length, stalls,
// effective walk time (dist/4.2) + brisk-model time (dist/3.4), y-range.
// Spawns its OWN strict-port vite. Usage: node tools/tmp-084-walkbot.mjs [port]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as CH from '../src/data/chicago.js';

const here = dirname(fileURLToPath(import.meta.url));
const port = +(process.argv[2] || 5237);
const vite = spawn(process.execPath,
  [join(here, '..', 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'],
  { cwd: join(here, '..') });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite start timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});
const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 900000, args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = []; let sawCanary = false;
const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !isNoise(m.text())) errors.push('[console.error] ' + m.text()); if (m.text().startsWith('[canary] wb084')) sawCanary = true; });

// route: spawn -> trail join -> MAIN north run -> MONTROSE trail -> beach stand
const MAIN = CH.TRAIL_MAIN, MON = CH.TRAIL_MONTROSE;
const route = [[109.5, 156.6], [96, 152], ...MAIN.slice(14), ...MON.slice(1), [212, -1000], [215, -1016]];
// nudge the hot-dog-cart point (cart at 45,-150 rides the bike centerline)
for (const p of route) if (p[0] === 44 && p[1] === -150) { p[0] = 42.5; }

await page.goto(`http://localhost:${port}/?play=1&canary=wb084`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
await new Promise(r => setTimeout(r, 1200));

const res = await page.evaluate(async ({ route }) => {
  const hd = window.__hd, P = hd.player, { joy, cam } = hd.input;
  const out = { frames: 0, stalls: 0, stallAt: [], done: false, dist: 0, minY: 1e9, maxY: -1e9, maxDY: 0, end: null };
  let pi = 0, prev = null, stallRun = 0, lastY = null;
  const nearest = () => {
    let bx = route[0][0], bz = route[0][1], bd = 1e18;
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i], b = route[i + 1], dx = b[0] - a[0], dz = b[1] - a[1];
      const L2 = dx * dx + dz * dz || 1; let t = ((P.x - a[0]) * dx + (P.z - a[1]) * dz) / L2;
      t = t < 0 ? 0 : t > 1 ? 1 : t; const px = a[0] + dx * t, pz = a[1] + dz * t;
      const d = (P.x - px) ** 2 + (P.z - pz) ** 2; if (d < bd) { bd = d; bx = px; bz = pz; }
    }
    return [bx, bz];
  };
  await new Promise(resolve => {
    const step = () => {
      while (pi < route.length - 1 && Math.hypot(route[pi][0] - P.x, route[pi][1] - P.z) < 2.4) pi++;
      let T = route[pi]; if (stallRun >= 4) T = nearest();
      let dx = T[0] - P.x, dz = T[1] - P.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const Fx = Math.sin(cam.yaw), Fz = Math.cos(cam.yaw), Rx = -Math.cos(cam.yaw), Rz = Math.sin(cam.yaw);
      joy.z = -(dx * Fx + dz * Fz); joy.x = dx * Rx + dz * Rz; joy.len = 0.9;   // WALK, not run
      out.frames++;
      if (prev) {
        const sp = Math.hypot(P.x - prev.x, P.z - prev.z);
        out.dist += sp;
        if (out.frames > 40) {
          if (sp < 0.012) { if (++stallRun === 8) { out.stalls++; out.stallAt.push([+P.x.toFixed(1), +P.z.toFixed(1)]); } } else stallRun = 0;
        }
      }
      if (lastY !== null) out.maxDY = Math.max(out.maxDY, Math.abs(P.y - lastY));
      lastY = P.y; out.minY = Math.min(out.minY, P.y); out.maxY = Math.max(out.maxY, P.y);
      prev = { x: P.x, z: P.z };
      const dEnd = Math.hypot(route[route.length - 1][0] - P.x, route[route.length - 1][1] - P.z);
      if ((pi >= route.length - 1 && dEnd < 2.5) || out.frames > 36000) {
        out.done = dEnd < 2.5; out.end = [+P.x.toFixed(1), +P.z.toFixed(1)];
        joy.z = 0; joy.x = 0; joy.len = 0; resolve(); return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  return out;
}, { route });

console.log('canary:', sawCanary, ' errors:', errors.length ? errors : 'none');
console.log(JSON.stringify(res, null, 1));
console.log(`walked ${res.dist.toFixed(0)} m -> game-walk (4.2 m/s) ${(res.dist / 4.2).toFixed(0)} s = ${(res.dist / 4.2 / 60).toFixed(2)} min · brisk model (3.4) ${(res.dist / 3.4 / 60).toFixed(2)} min`);
await browser.close();
if (process.platform === 'win32') spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']); else vite.kill();
process.exit(res.done && !errors.length ? 0 : 1);
