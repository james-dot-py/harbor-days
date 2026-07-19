// task 097: citywide steering-bot corridor runs. Drives the REAL input path
// (__hd.input joy, camera-relative mapping identical to main.js) through the
// busiest corridor of every area, asserting continuous displacement — a stall
// (8 consecutive frames < 0.015 m) is a wedge/collider freeze candidate. Routes
// follow the CURRENT data polylines (TRAIL_MAIN / TRAIL_MONTROSE incl. the 088
// reroute) and route AROUND data-carved blocks per the 075 law (plover dune,
// beach-house hall, the Monroe/Nichols slot). Nearest-lane recovery from
// tmp-montrose-bot.mjs. Spawns its OWN strict-port vite.
// Usage: node tools/tmp-097-bot.mjs [port]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as CH from '../src/data/chicago.js';

const here = dirname(fileURLToPath(import.meta.url));
const port = +(process.argv[2] || 5303);
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
page.on('console', m => { if (m.type() === 'error' && !isNoise(m.text())) errors.push('[console.error] ' + m.text()); if (m.text().startsWith('[canary] bot097')) sawCanary = true; });

async function load(x, z) {
  await page.goto(`http://localhost:${port}/?play=1&x=${x}&z=${z}&canary=bot097`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
  await new Promise(r => setTimeout(r, 900));
}

// steering walk with nearest-lane recovery (a REAL blocker re-stalls
// repeatedly; an open lane recovers). Reports stalls with coords + y-range.
async function run(label, path, opts = {}) {
  const look = opts.look ?? 2.2, cap = opts.cap ?? 4000;
  await load(path[0][0], path[0][1]);
  const res = await page.evaluate(async ({ path, look, cap }) => {
    const hd = window.__hd, P = hd.player, { joy, cam } = hd.input;
    const out = { frames: 0, stalls: 0, stallAt: [], done: false, minY: 1e9, maxY: -1e9, maxDY: 0 };
    let pi = 0, prev = null, stallRun = 0, lastY = null;
    const nearest = () => {
      let bx = path[0][0], bz = path[0][1], bd = 1e18;
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], b = path[i + 1], dx = b[0] - a[0], dz = b[1] - a[1];
        const L2 = dx * dx + dz * dz || 1; let t = ((P.x - a[0]) * dx + (P.z - a[1]) * dz) / L2;
        t = t < 0 ? 0 : t > 1 ? 1 : t; const px = a[0] + dx * t, pz = a[1] + dz * t;
        const d = (P.x - px) ** 2 + (P.z - pz) ** 2; if (d < bd) { bd = d; bx = px; bz = pz; }
      }
      return [bx, bz];
    };
    await new Promise(resolve => {
      const step = () => {
        while (pi < path.length - 1 && Math.hypot(path[pi][0] - P.x, path[pi][1] - P.z) < look) pi++;
        let T = path[pi]; if (stallRun >= 4) T = nearest();
        let dx = T[0] - P.x, dz = T[1] - P.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const Fx = Math.sin(cam.yaw), Fz = Math.cos(cam.yaw), Rx = -Math.cos(cam.yaw), Rz = Math.sin(cam.yaw);
        joy.z = -(dx * Fx + dz * Fz); joy.x = dx * Rx + dz * Rz; joy.len = 1;
        out.frames++;
        if (prev && out.frames > 40) {
          const sp = Math.hypot(P.x - prev.x, P.z - prev.z);
          if (sp < 0.015) { if (++stallRun === 8) { out.stalls++; out.stallAt.push([+P.x.toFixed(1), +P.z.toFixed(1)]); } } else stallRun = 0;
        }
        if (lastY !== null) out.maxDY = Math.max(out.maxDY, Math.abs(P.y - lastY));
        lastY = P.y; out.minY = Math.min(out.minY, P.y); out.maxY = Math.max(out.maxY, P.y);
        prev = { x: P.x, z: P.z };
        const end = path[path.length - 1];
        if (pi >= path.length - 1 && Math.hypot(end[0] - P.x, end[1] - P.z) < 1.8) out.done = true;
        if (out.done || out.frames > cap) { joy.x = joy.z = 0; joy.len = 0; out.endX = +P.x.toFixed(1); out.endZ = +P.z.toFixed(1); resolve(); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    return out;
  }, { path, look, cap });
  const pass = res.done && res.stalls === 0;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label}: done=${res.done} frames=${res.frames} stalls=${res.stalls}${res.stalls ? ' at ' + JSON.stringify(res.stallAt) : ''} y[${res.minY.toFixed(2)}..${res.maxY.toFixed(2)}] maxDy=${res.maxDY.toFixed(3)} end(${res.endX},${res.endZ})`);
  return pass;
}

let ok = true;
const TM = CH.TRAIL_MAIN, TMO = CH.TRAIL_MONTROSE;
// 1+2. the Lakefront Trail end to end (the map's busiest corridor), in halves
ok = await run('lf-trail south half (Diversey->harbor NW)', TM.slice(0, 20), { cap: 8000, look: 2.6 }) && ok;
ok = await run('lf-trail north half (harbor->golf handoff)', TM.slice(19), { cap: 8000, look: 2.6 }) && ok;
// 3. the Montrose stretch incl. the 088 shoreline reroute west of the beach house
ok = await run('mt-trail (golf->north cap, 088 reroute)', TMO, { cap: 8000, look: 2.6 }) && ok;
// 4. Belmont beach<->harbor: dog beach -> out the WEST GATE (DOG_FENCE gates
// x87-89 z-338.5..-327.5; the north fence line z-341 is intended, 075 law) ->
// spur -> spit spine -> tip
ok = await run('belmont dogbeach->spit tip', [
  [100, -334], [94, -333], [88, -336], [84, -338], [86, -344], [100, -346],
  [128, -342], [157, -333], [166, -323], [173, -305],
  [178, -260], [181, -200], [183, -150], [185, -105], [188, -70], [190, -48], [186, -32],
], { cap: 6000 }) && ok;
// 5. Montrose beach<->harbor: The Dock -> south sand (east of the beach house,
// WEST of the roped dune per the 075 routing law) -> WEST of the Magic Hedge
// (MONTROSE_POINT.hedge pts x194+ — an intended collider wall; the sanctuary
// paths/gate are the way through) -> around the basin north -> down the west
// promenade to the mouth lawn
ok = await run('mt beach->harbor (around dune + hedge + basin)', [
  [208, -1046], [207, -1020], [207, -1000], [207, -982], [206, -960], [206, -935],
  [205, -920], [200, -908], [193, -897], [188, -886], [186, -876], [184, -862],
  [183, -845], [182, -810], [182, -770], [182, -730], [184, -700], [186, -680], [189, -668],
], { cap: 8000 }) && ok;
// 6. the hook mole end to end (narrow walkable corridor, 070)
ok = await run('mt hook mole (root->tip light)', [
  [228, -845], [228, -810], [229, -770], [230, -735], [231, -710], [232, -692],
], { cap: 5000, look: 1.8 }) && ok;
// 7. Wrigleyville street circuit: Addison E -> Sheffield S -> Waveland W -> Clark N
ok = await run('wv streets circuit', [
  [-330, -400], [-250, -400], [-185, -400], [-190, -420], [-190, -480], [-190, -540],
  [-195, -560], [-250, -560], [-330, -558], [-320, -520], [-306, -470], [-296, -430], [-290, -405],
], { cap: 8000 }) && ok;
// 8. Gallagher Way wedge (Clark curb -> bowl wall pocket)
ok = await run('wv gallagher wedge', [
  [-302, -515], [-298, -495], [-294, -475], [-291, -460], [-289, -450],
], { cap: 3000, look: 1.8 }) && ok;
// 9. Millennium promenade circuit: Michigan spine -> Randolph -> Chase allee ->
// Bean plaza -> Madison crosswalk -> Crown plaza -> Monroe west
ok = await run('mp promenade circuit', [
  [55, 800], [52, 770], [52, 720], [60, 709], [100, 709], [108, 715], [108, 760],
  [108, 800], [97, 805], [88, 800], [88, 820], [80, 832], [70, 834], [70, 860],
  [70, 880], [60, 890], [52, 888], [52, 855],
], { cap: 8000 }) && ok;

await browser.close(); vite.kill();
if (!sawCanary) { console.log('CANARY MISSING — wrong server?'); ok = false; }
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); ok = false; }
console.log(ok ? 'BOT097 GREEN' : 'BOT097 FAILED');
process.exit(ok ? 0 : 1);
