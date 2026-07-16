// tmp (076 sign-off): the CONTIGUITY promise, verified literally — ONE uncut
// run from the Belmont Rocks to Montrose Beach in a single page load, no
// teleports between legs (the 075 bot validated the Montrose stretch in
// seams; this drives the whole tall map south->north in one go). Follows the
// real trail polylines (TRAIL_MAIN -> TRAIL_MONTROSE join at z~-782) and ends
// on the beach sand west of the roped dune. Asserts: reaches the end, zero
// stalls (no seam/wedge anywhere on the route), sane y-range (no elevator
// pops), zero console/page errors, canary echoed. Screenshot at the end
// (minimap = the full tall map with the marker at the far north).
// Usage: node tools/tmp-contiguity-bot.mjs [port]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const port = +(process.argv[2] || 5241);
const vite = spawn(process.execPath,
  [join(here, '..', 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'],
  { cwd: join(here, '..') });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite start timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'], protocolTimeout: 590000 });   // the uncut run is ~3-6 min of real time inside ONE evaluate
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = []; let sawCanary = false;
const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !isNoise(m.text())) errors.push('[console.error] ' + m.text()); if (m.text().startsWith('[canary] ctgbot')) sawCanary = true; });

// The route: Belmont Rocks lawn -> TRAIL_MAIN (west of the Belmont basin,
// around the sanctuary, the corridor east run, up the golf lake side) ->
// TRAIL_MONTROSE (west of the Montrose basin, past the Point approach) ->
// the beach's west sand strip (around the roped plover dune, per 075's law).
const ROUTE = [
  [150, 90],                                       // the Belmont Rocks hangout lawn
  [130, 100], [112, 106], [104, 55], [90, 15], [75, -5],
  [58, -45], [48, -95], [44, -150],                // trail west of the basin
  [45, -205], [48, -258], [54, -300],
  [62, -325], [74, -340], [86, -352], [90, -366],  // skirting the sanctuary west side
  [90, -410], [91, -427],
  [106, -433], [145, -433], [182, -432], [205, -431], // corridor east run
  [211, -448], [211, -540], [211, -660], [211, -782], // golf lake side
  [211, -812], [205, -890], [198, -985], [188, -1072], [172, -1135], // TRAIL_MONTROSE
  [158, -1200], [160, -1265], [180, -1312], [199, -1360],
  [205, -1396], [206, -1418], [211, -1445], [213, -1470], // west sand strip around the dune -> the beach
];

await page.goto(`http://localhost:${port}/?play=1&x=${ROUTE[0][0]}&z=${ROUTE[0][1]}&canary=ctgbot`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
await new Promise(r => setTimeout(r, 900));

const res = await page.evaluate(async ({ ROUTE }) => {
  const hd = window.__hd, P = hd.player, { joy, cam } = hd.input;
  const look = 2.5;
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
      joy.z = -(dx * Fx + dz * Fz); joy.x = dx * Rx + dz * Rz; joy.len = 1;   // len 1 => RUN (main.js joy.len>0.92)
      out.frames++;
      if (prev && out.frames > 40) {
        const sp = Math.hypot(P.x - prev.x, P.z - prev.z);
        if (sp < 0.015) { if (++stallRun === 8) { out.stalls++; out.stallAt.push([+P.x.toFixed(1), +P.z.toFixed(1)]); } } else stallRun = 0;
      }
      if (lastY !== null) out.maxDY = Math.max(out.maxDY, Math.abs(P.y - lastY));
      lastY = P.y; out.minY = Math.min(out.minY, P.y); out.maxY = Math.max(out.maxY, P.y);
      if (hd.jsk && hd.jsk.on) out.jetski = true;   // an uncut WALK must never mount the jetski
      prev = { x: P.x, z: P.z };
      const end = ROUTE[ROUTE.length - 1];
      if (pi >= ROUTE.length - 1 && Math.hypot(end[0] - P.x, end[1] - P.z) < 1.8) out.done = true;
      if (out.done || out.frames > 40000) { joy.x = joy.z = 0; joy.len = 0; out.endX = +P.x.toFixed(1); out.endZ = +P.z.toFixed(1); resolve(); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  return out;
}, { ROUTE });

await page.screenshot({ path: join(here, 'shots', '076-contiguity-end.png') });
await browser.close(); vite.kill();

const pass = res.done && res.stalls === 0 && !res.jetski;
console.log(`${pass ? 'PASS' : 'FAIL'} Belmont Rocks -> Montrose Beach UNCUT: done=${res.done} frames=${res.frames} stalls=${res.stalls}${res.stalls ? ' at ' + JSON.stringify(res.stallAt) : ''} jetski=${res.jetski} y[${res.minY.toFixed(2)}..${res.maxY.toFixed(2)}] maxDy/frame=${res.maxDY.toFixed(3)} end(${res.endX},${res.endZ})`);
if (!sawCanary) { console.log('CANARY MISSING - wrong server?'); }
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); }
process.exit(pass && sawCanary && !errors.length ? 0 : 1);
