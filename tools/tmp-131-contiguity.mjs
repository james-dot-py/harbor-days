// tmp (131 re-sign-off): the CONTIGUITY promise re-verified after the 129
// RESERVE EXPANSION — ONE uncut run Belmont Rocks -> Montrose Beach in a
// single page load, now DETOURING through the reserve (076's route predates
// the 084/088 north-shore rework AND the reserve; every coord here is
// re-derived from the CURRENT chicago.js polylines). The detour: trail bend
// (146,-638) -> the 129 SPUR (welds at 150.5,-639.3) north through the south
// gate -> corridor mid (104,-768.5) -> WEST to the west gate / underpass
// mouth (24,-771) -> back EAST the full corridor -> east gate (~153,-764) ->
// weld onto TRAIL_MONTROSE (158,-764) -> north to the beach, ending on the
// sand at THE DOCK (216,-1040). The corridor centerline clears nest Cell A
// (x62-90, z-802..-780) by >=6.5 m and the spur clears Cell B (x114-140,
// z-740..-716) by >=12 m — the bot routes AROUND the data carves per
// PITFALLS (a path THROUGH one logs a false stall, not a walkability bug).
// Asserts: reaches the end, zero stalls, jetski never mounts, sane y, zero
// console/page errors, canary echoed. End shot 131-contiguity-end.png.
// Usage: node tools/tmp-131-contiguity.mjs [port]
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
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'], protocolTimeout: 590000 });   // the uncut run is ~3-6 min of real time inside ONE evaluate
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = []; let sawCanary = false;
const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !isNoise(m.text())) errors.push('[console.error] ' + m.text()); if (m.text().startsWith('[canary] ctg131')) sawCanary = true; });

// Belmont Rocks lawn -> TRAIL_MAIN (west of the basin, around the sanctuary,
// corridor east run, golf lake side to the 084 handoff) -> TRAIL_MONTROSE bay
// bend -> THE RESERVE DETOUR (spur -> south gate -> corridor -> west gate ->
// back east -> east gate) -> TRAIL_MONTROSE north -> the beach sand at The
// Dock. Trail points verbatim from chicago.js TRAIL_MAIN/TRAIL_MONTROSE;
// spur/corridor points verbatim from MONTROSE_RESERVE.paths.
const ROUTE = [
  [150, 90],                                       // the Belmont Rocks hangout lawn
  [130, 100], [112, 106], [104, 55], [90, 15], [75, -5],
  [58, -45], [48, -95], [44, -150],                // trail west of the basin
  [45, -205], [48, -258], [54, -300],
  [62, -325], [74, -340], [86, -352], [90, -366],  // skirting the sanctuary west side
  [90, -388], [90, -410], [91, -427],
  [106, -433], [145, -433], [182, -432], [205, -431], // corridor east run
  [211, -448], [211, -540], [210, -560], [208, -572], // golf lake side to the 084 handoff
  [206, -580], [196, -598], [178, -608], [160, -616], [148, -626], [146, -638], // TRAIL_MONTROSE bay bend
  [150.5, -639.3],                                 // the 129 spur weld
  [144, -643.2], [138, -644], [126, -646], [114, -654], [107, -664], // spur reversed, SE curve
  [105, -678],                                     // through the SOUTH GATE (gap x100-108)
  [104, -692], [102, -710], [101, -730], [102, -750], // spur north run (Cell B x114-140 stays >=12 m east)
  [104, -768.5],                                   // corridor mid junction
  [90, -770.5], [76, -773], [62, -773.5], [48, -772], [36, -771], // corridor WEST (Cell A z-780 stays >=6.5 m south)
  [24, -771],                                      // out the WEST GATE to the underpass mouth lawn
  [36, -771], [48, -772], [62, -773.5], [76, -773], [90, -770.5], // back EAST the full corridor
  [104, -768.5], [118, -767], [132, -766], [144, -765], [152, -764.2], // corridor east half
  [158, -764],                                     // out the EAST GATE onto the trail weld
  [160, -829], [180, -876], [186, -914], [188, -960], [188, -1012], // TRAIL_MONTROSE north (dune x210-233 stays east)
  [200, -1024], [208, -1032],                      // cut east onto the sand (north of the beach-house foot x194-204/z-1016..-992)
  [216, -1040],                                    // end on the sand at THE DOCK
];

await page.goto(`http://localhost:${port}/?play=1&x=${ROUTE[0][0]}&z=${ROUTE[0][1]}&canary=ctg131`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
await new Promise(r => setTimeout(r, 900));

const res = await page.evaluate(async ({ ROUTE }) => {
  const hd = window.__hd, P = hd.player, { joy, cam } = hd.input;
  const look = 2.5;
  const out = { frames: 0, stalls: 0, stallAt: [], done: false, minY: 1e9, maxY: -1e9, maxDY: 0, jetski: false, westGate: false, eastGate: false };
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
      if (P.x < 30 && Math.abs(P.z + 771) < 4) out.westGate = true;           // proof the detour reached the underpass mouth
      if (P.x > 150 && P.x < 162 && Math.abs(P.z + 764) < 4) out.eastGate = true;
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

await page.screenshot({ path: join(here, 'shots', '131-contiguity-end.png') });
await browser.close();
process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill();

const pass = res.done && res.stalls === 0 && !res.jetski && res.westGate && res.eastGate;
console.log(`${pass ? 'PASS' : 'FAIL'} Belmont Rocks -> reserve corridor -> Montrose Beach UNCUT: done=${res.done} westGate=${res.westGate} eastGate=${res.eastGate} frames=${res.frames} stalls=${res.stalls}${res.stalls ? ' at ' + JSON.stringify(res.stallAt) : ''} jetski=${res.jetski} y[${res.minY.toFixed(2)}..${res.maxY.toFixed(2)}] maxDy/frame=${res.maxDY.toFixed(3)} end(${res.endX},${res.endZ})`);
if (!sawCanary) { console.log('CANARY MISSING - wrong server?'); }
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); }
process.exit(pass && sawCanary && !errors.length ? 0 : 1);
