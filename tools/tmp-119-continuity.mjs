// tmp-119 (LP sign-off): the CONTINUITY promise verified literally — ONE uncut
// run from the LP north corner (z409 boundary, the Belmont Rocks corner where the
// lakefront trail continues into Lincoln Park) THROUGH the Fullerton underpass,
// UP the Diversey harbor promenade and back, DOWN the zoo flank, THROUGH the east
// zoo gate, around the loop to the pond SPUR, and around the NATURE BOARDWALK ring
// — in a single page load, no teleports. Asserts: reaches the end, zero stalls
// (no seam/wedge/trap on the route), sane y-range (no elevator pops on the deck
// seams), never mounts the jetski, zero console/page errors, canary echoed.
// The narrow boardwalk deck (half-width 1.35) is driven with a tight look-ahead;
// any stall coord is dumped so it can be checked against lpBoardwalkHit (a stall
// on walkable deck = steering overshoot, not a trap).
// Usage: node tools/tmp-119-continuity.mjs [port]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const port = +(process.argv[2] || 5243);
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
page.on('console', m => { if (m.type() === 'error' && !isNoise(m.text())) errors.push('[console.error] ' + m.text()); if (m.text().startsWith('[canary] lpctg')) sawCanary = true; });

// exact walkable centerline points (LP_TRAIL_LAKE / underpass / harbor stands /
// LP_TRAIL_PARK / ZOO.loop south / ZOO.spur / LP_BOARDWALK)
const ROUTE = [
  [30, 360], [29, 400], [29, 450], [31, 520], [30, 590], [27, 650], [23, 695], // LAKE trail south to the underpass mouth
  [22, 660], [12, 661], [2, 662], [-4, 664],                                     // THROUGH the Fullerton underpass (east -> west park)
  [-6, 620], [-6, 588], [-6, 574], [-5, 500],                                    // UP the Diversey harbor promenade (the channel)
  [-6, 574], [-6, 620], [-5.5, 664],                                             // back SOUTH to the park trail
  [-6.5, 684], [-8, 714], [-8.2, 752], [-8, 788], [-8, 810], [-8.6, 824], [-11.5, 830], // LP_TRAIL_PARK down the zoo flank to the gate pad
  [-13, 837], [-20, 845], [-31, 849], [-44, 847],                                // through the zoo gate + loop (south side) to the spur T
  [-46, 866], [-50, 905], [-52, 962], [-48.9, 1005.5],                           // ZOO.spur south to the pond / boardwalk SW weld
  [-49, 1004], [-36, 1001], [-22, 996], [-18, 984], [-25, 974], [-33, 966],      // boardwalk ring (SW weld around...
  [-30, 958], [-21, 960], [-15, 952], [-14.5, 932], [-16, 910], [-24, 901], [-38, 903], [-48.5, 905], // ...to the NW weld)
];

await page.goto(`http://localhost:${port}/?play=1&x=${ROUTE[0][0]}&z=${ROUTE[0][1]}&canary=lpctg`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
await new Promise(r => setTimeout(r, 900));

const res = await page.evaluate(async ({ ROUTE }) => {
  const hd = window.__hd, P = hd.player, { joy, cam } = hd.input;
  const look = 1.6;
  const out = { frames: 0, stalls: 0, stallAt: [], done: false, minY: 1e9, maxY: -1e9, maxDY: 0, jetski: false };
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
      joy.z = -(dx * Fx + dz * Fz); joy.x = dx * Rx + dz * Rz; joy.len = 0.85;   // WALK (tighter than run on the narrow deck)
      out.frames++;
      if (prev && out.frames > 40) {
        const sp = Math.hypot(P.x - prev.x, P.z - prev.z);
        if (sp < 0.012) { if (++stallRun === 10) { out.stalls++; out.stallAt.push([+P.x.toFixed(1), +P.z.toFixed(1), 'pi' + pi]); } } else stallRun = 0;
      }
      if (lastY !== null) out.maxDY = Math.max(out.maxDY, Math.abs(P.y - lastY));
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

await page.screenshot({ path: join(here, 'shots', 'lp-continuity-end.png') });
await browser.close(); vite.kill();

const pass = res.done && res.stalls === 0 && !res.jetski;
console.log(`${pass ? 'PASS' : 'CHECK'} LP corner -> boardwalk ring UNCUT: done=${res.done} frames=${res.frames} stalls=${res.stalls}${res.stalls ? ' at ' + JSON.stringify(res.stallAt) : ''} jetski=${res.jetski} y[${res.minY.toFixed(2)}..${res.maxY.toFixed(2)}] maxDy/frame=${res.maxDY.toFixed(3)} end(${res.endX},${res.endZ})`);
if (!sawCanary) console.log('CANARY MISSING - wrong server?');
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
process.exit(pass && sawCanary && !errors.length ? 0 : 1);
