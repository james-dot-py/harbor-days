// tmp-120 (LP burn-down): the 119 continuity bot, re-routed for the REBUILT
// Fullerton crossing (task 120 / issue 035 — the path now RAMPS DOWN under the
// Drive instead of crossing at grade) and the WELDED Diversey corner (issue 033).
// ONE uncut run, no teleports: Belmont Rocks corner -> the welded corner seam ->
// the dual lakefront trail south -> DOWN the east ramp, UNDER Lake Shore Drive,
// UP the west ramp -> the Diversey promenade and back -> the zoo flank ->
// through the east gate -> the loop -> the pond spur -> the Nature Boardwalk ring.
// Asserts: reaches the end, zero stalls, never mounts the jetski, zero console/
// page errors, canary echoed. The y check is per-METRE-TRAVELLED (<= 0.55, the
// walkprobe elevator rule), NOT per frame: the 119 0.040/frame bar assumed flat
// ground and the new ramps are a deliberate 0.28 m/m grade.
// Usage: node tools/tmp-120-continuity.mjs [port]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const port = +(process.argv[2] || 5244);
const vite = spawn(process.execPath,
  [join(here, '..', 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'],
  { cwd: join(here, '..') });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite start timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'], protocolTimeout: 590000 });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = []; let sawCanary = false;
const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !isNoise(m.text())) errors.push('[console.error] ' + m.text()); if (m.text().startsWith('[canary] lpctg120')) sawCanary = true; });

const ROUTE = [
  [140, 330], [110, 350], [80, 368], [50, 385],                                  // from the BELMONT ROCKS corner terraces, across the corner lawn (clear of the 96,372 sculpture pad)
  [30, 400], [30, 406],                                                          // onto TRAIL_MAIN at the corner weld (issue 033 seam)
  [28, 436], [27, 500], [26, 560], [26, 614], [26, 644], [25.5, 661],            // the welded LP_TRAIL_LAKE dual trail south
  [22, 661], [16, 661], [8, 661], [0, 661], [-6, 661], [-11, 661], [-12.5, 661], // DOWN the east ramp, UNDER the Drive, UP the west ramp (issue 035)
  [-11.6, 650], [-9, 640], [-6, 620], [-6, 588], [-6, 574], [-5, 500],           // UP the Diversey harbor promenade (the channel)
  [-6, 574], [-6, 620], [-9, 640], [-11.6, 650], [-12.5, 661],                   // back SOUTH to the crossing's west head
  [-13, 668], [-13, 684], [-10, 700], [-8, 714], [-8.2, 752], [-8, 788], [-8, 810], [-8.6, 824], [-11.5, 830],  // LP_TRAIL_PARK down the zoo flank
  [-13, 837], [-20, 845], [-31, 849], [-44, 847],                                // through the zoo gate + loop (south side) to the spur T
  [-46, 866], [-50, 905], [-52, 962], [-48.9, 1005.5],                           // ZOO.spur south to the pond / boardwalk SW weld
  [-49, 1004], [-36, 1001], [-22, 996], [-18, 984], [-25, 974], [-33, 966],      // boardwalk ring (SW weld around...
  [-30, 958], [-21, 960], [-15, 952], [-14.5, 932], [-16, 910], [-24, 901], [-38, 903], [-48.5, 905], // ...to the NW weld)
];

await page.goto(`http://localhost:${port}/?play=1&x=${ROUTE[0][0]}&z=${ROUTE[0][1]}&canary=lpctg120`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
await new Promise(r => setTimeout(r, 900));

const res = await page.evaluate(async ({ ROUTE }) => {
  const hd = window.__hd, P = hd.player, { joy, cam } = hd.input;
  const look = 1.6;
  const out = { frames: 0, stalls: 0, stallAt: [], done: false, minY: 1e9, maxY: -1e9, maxGrade: 0, gradeAt: null, jetski: false };
  let pi = 0, prev = null, stallRun = 0, lastY = null;
  const nearest = () => {
    let bx = ROUTE[0][0], bz = ROUTE[0][1], bd = 1e18;
    for (let i = 0; i < ROUTE.length - 1; i++) {
      const a = ROUTE[i], b = ROUTE[i + 1], dx = b[0] - a[0], dz = b[1] - a[1];
      const L2 = dx * dx + dz * dz || 1; let t = ((P.x - a[0]) * dx + (P.z - a[1]) * dz) / L2;
      t = t < 0 ? 0 : t > 1 ? 1 : t; const px = a[0] + dx * t, pz = a[1] + dz * t;
      const d = (P.x - px) ** 2 + (P.z - pz) ** 2; if (d < bd) { bd = d; bx = px; bz = pz; }
    }
    return [bx, bz];
  };
  await new Promise(resolve => {
    const step = () => {
      while (pi < ROUTE.length - 1 && Math.hypot(ROUTE[pi][0] - P.x, ROUTE[pi][1] - P.z) < look) pi++;
      let T = ROUTE[pi]; if (stallRun >= 4) T = nearest();
      let dx = T[0] - P.x, dz = T[1] - P.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const Fx = Math.sin(cam.yaw), Fz = Math.cos(cam.yaw), Rx = -Math.cos(cam.yaw), Rz = Math.sin(cam.yaw);
      joy.z = -(dx * Fx + dz * Fz); joy.x = dx * Rx + dz * Rz; joy.len = 0.85;   // WALK
      out.frames++;
      if (prev && out.frames > 40) {
        const sp = Math.hypot(P.x - prev.x, P.z - prev.z);
        if (sp < 0.012) { if (++stallRun === 10) { out.stalls++; out.stallAt.push([+P.x.toFixed(1), +P.z.toFixed(1), 'pi' + pi]); } } else stallRun = 0;
        // grade = rise per metre actually travelled (the walkprobe elevator rule)
        if (sp > 0.03 && lastY !== null) {
          const g = Math.abs(P.y - lastY) / sp;
          if (g > out.maxGrade) { out.maxGrade = g; out.gradeAt = [+P.x.toFixed(1), +P.z.toFixed(1)]; }
        }
      }
      lastY = P.y; out.minY = Math.min(out.minY, P.y); out.maxY = Math.max(out.maxY, P.y);
      if (hd.jsk && hd.jsk.on) out.jetski = true;
      prev = { x: P.x, z: P.z };
      const end = ROUTE[ROUTE.length - 1];
      if (pi >= ROUTE.length - 1 && Math.hypot(end[0] - P.x, end[1] - P.z) < 2.0) out.done = true;
      if (out.done || out.frames > 60000) { joy.x = joy.z = 0; joy.len = 0; out.endX = +P.x.toFixed(1); out.endZ = +P.z.toFixed(1); resolve(); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  return out;
}, { ROUTE });

await page.screenshot({ path: join(here, 'shots', 'lp120-continuity-end.png') });
await browser.close(); vite.kill();

const pass = res.done && res.stalls === 0 && !res.jetski && res.maxGrade <= 0.55;
console.log(`${pass ? 'PASS' : 'CHECK'} LP corner -> crossing -> boardwalk ring UNCUT: done=${res.done} frames=${res.frames} stalls=${res.stalls}${res.stalls ? ' at ' + JSON.stringify(res.stallAt) : ''} jetski=${res.jetski} y[${res.minY.toFixed(2)}..${res.maxY.toFixed(2)}] maxGrade=${res.maxGrade.toFixed(3)}/m at ${JSON.stringify(res.gradeAt)} end(${res.endX},${res.endZ})`);
if (!sawCanary) console.log('CANARY MISSING - wrong server?');
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
process.exit(pass && sawCanary && !errors.length ? 0 : 1);
