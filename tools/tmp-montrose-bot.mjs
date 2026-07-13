// tmp (075): Montrose continuity + trap bot. Drives the REAL input path
// (__hd.input joy, camera-relative mapping identical to main.js) along the whole
// new stretch — the Irving Park line down the trail, around the harbor, up the
// Point stub, and down the beach to its far north end — asserting continuous
// displacement (no stall = no wedge/collider freeze), routing BESIDE point
// colliders. Also drops a synthetic trap and asserts the player is NEVER frozen
// (the lakefront's wade-not-freeze property: setTrap is a no-op there, so the
// assertion is "displacement > 0 with input", i.e. the mayor is never pinned).
// Spawns its OWN strict-port vite. Usage: node tools/tmp-montrose-bot.mjs [port]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const port = +(process.argv[2] || 5233);
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
page.on('console', m => { if (m.type() === 'error' && !isNoise(m.text())) errors.push('[console.error] ' + m.text()); if (m.text().startsWith('[canary] mtbot')) sawCanary = true; });

async function load(x, z) {
  await page.goto(`http://localhost:${port}/?play=1&x=${x}&z=${z}&canary=mtbot`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
  await new Promise(r => setTimeout(r, 900));
}

// steering walk with nearest-lane recovery (crossbot pattern): a REAL blocker
// re-stalls repeatedly; an open lane recovers. Reports stalls with coords + the
// player y-range (elevation-seam sanity: no wild jumps at pier root/hill/beach).
async function run(label, path, shotName, look = 2.2) {
  await load(path[0][0], path[0][1]);
  const res = await page.evaluate(async ({ path, look }) => {
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
        if (out.done || out.frames > 4000) { joy.x = joy.z = 0; joy.len = 0; out.endX = +P.x.toFixed(1); out.endZ = +P.z.toFixed(1); resolve(); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    return out;
  }, { path, look });
  if (shotName) await page.screenshot({ path: join(here, 'shots', shotName + '.png') });
  const pass = res.done && res.stalls === 0;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label}: done=${res.done} frames=${res.frames} stalls=${res.stalls}${res.stalls ? ' at ' + JSON.stringify(res.stallAt) : ''} y[${res.minY.toFixed(2)}..${res.maxY.toFixed(2)}] maxΔy/frame=${res.maxDY.toFixed(3)} end(${res.endX},${res.endZ})`);
  return pass;
}

// synthetic trap on the lakefront: setTrap is hard-cell-only (no-op here), so the
// guarantee is the wade-not-freeze property — with input held the player must
// NEVER be pinned (net displacement over 150 frames > 1 m). Also confirms no
// console/page error from the debug hook.
async function trapNotFrozen(label, tx, tz) {
  await load(tx, tz);
  const res = await page.evaluate(async ({ tx, tz }) => {
    const hd = window.__hd, P = hd.player, { joy, cam } = hd.input;
    P.x = tx; P.z = tz; P.vx = 0; P.vz = 0; await new Promise(r => requestAnimationFrame(r));
    hd.setTrap({ x0: tx - 1.5, x1: tx + 1.5, z0: tz - 1.5, z1: tz + 1.5 });
    const x0 = P.x, z0 = P.z;
    // push WEST (inland, toward walkable lawn) so "not frozen" means real progress
    const inX = -1, inZ = 0;
    const Fx = Math.sin(cam.yaw), Fz = Math.cos(cam.yaw), Rx = -Math.cos(cam.yaw), Rz = Math.sin(cam.yaw);
    joy.z = -(inX * Fx + inZ * Fz); joy.x = inX * Rx + inZ * Rz; joy.len = 1;
    await new Promise(resolve => { let f = 0; const s = () => { if (++f >= 150) { joy.x = joy.z = 0; joy.len = 0; resolve(); return; } requestAnimationFrame(s); }; requestAnimationFrame(s); });
    hd.setTrap(null);
    return { disp: +Math.hypot(P.x - x0, P.z - z0).toFixed(2), endX: +P.x.toFixed(1), endZ: +P.z.toFixed(1) };
  }, { tx, tz });
  const pass = res.disp > 1.0;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label}: displacement=${res.disp}m end(${res.endX},${res.endZ}) (not frozen)`);
  return pass;
}

let ok = true;
// ---- the full stretch, in seams (each leg validated on walkable ground) ----
// A. trail: Irving Park line down toward the harbor approach (east lawn)
ok = await run('trail Irving Park->harbor approach', [[205, -812], [205, -950], [202, -1060], [195, -1100]], 'mt-bot-trail', 2.5) && ok;
// B. around the basin: west of the mouth, down the west promenade, to the NW corner
ok = await run('west promenade (around basin)', [[185, -1110], [182, -1180], [182, -1260], [188, -1286]], 'mt-bot-promenade') && ok;
// C. the hook mole, north root down the pier and back (pier-root elevation seam)
ok = await run('hook mole down the pier', [[221, -1285], [226, -1230], [229, -1180], [231, -1140]], 'mt-bot-hook') && ok;
// D+E. Point stub -> beach far north end, ROUTING WEST of the roped dune
// (x210-233,z-1362..-1414 is non-walkable by design — the plover nest). The
// walkable route is the west sand strip x~205, then NE up the long beach.
ok = await run('Point stub -> beach far north end (around the dune)',
  [[212, -1305], [208, -1340], [205, -1366], [205, -1396], [206, -1418], [209, -1450], [213, -1480], [214, -1496]],
  'mt-bot-beach') && ok;
// F. Cricket Hill: base -> summit -> down (the hill elevation seam, both ways)
ok = await run('Cricket Hill base->summit->base', [[112, -1272], [112, -1300], [112, -1315], [112, -1330], [112, -1360]], 'mt-bot-hill', 1.6) && ok;
// ---- lakefront wade-not-freeze at three seams ----
ok = await trapNotFrozen('trap@west promenade', 182, -1200) && ok;
ok = await trapNotFrozen('trap@beach', 216, -1450) && ok;
ok = await trapNotFrozen('trap@hook mole', 229, -1200) && ok;

await browser.close(); vite.kill();
if (!sawCanary) { console.log('CANARY MISSING — wrong server?'); ok = false; }
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); ok = false; }
console.log(ok ? 'MTBOT GREEN' : 'MTBOT FAILED');
process.exit(ok ? 0 : 1);
