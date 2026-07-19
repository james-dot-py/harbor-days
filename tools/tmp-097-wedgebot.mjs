// task 097: LIVE in-engine wedge check (post ring-wedge-guard). For each of
// the colliders the ring audit confirmed as (pre-fix) traps: spawn on walkable
// ground beside the wedge seam, DRIVE INTO the collider/seam for 150 frames
// (the push-gated engine must keep the player on walkable ground), then walk
// back out for 150 frames. PASS = the player returns to the approach point and
// ends on walkable ground — i.e. pressing into a former wedge can no longer
// stick anyone. (The pre-fix run of the old spawn-in-the-pocket variant of
// this tool is what PROVED the crawl loses to collider rings — all 24 spots
// pinned live. See PITFALLS.) Usage: node tools/tmp-097-wedgebot.mjs [port]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { walkableW } from '../src/data/wrigleyville.js';

const here = dirname(fileURLToPath(import.meta.url));
const port = +(process.argv[2] || 5304);

// unique confirmed wedge colliders + the blocked END the pre-fix sim recorded
const report = JSON.parse(readFileSync(join(here, 'tmp', '097-collider-report.json'), 'utf8'));
const spots = [];
{
  const seen = new Set();
  for (const t of report.confirmedTraps) {
    const c = t.collider, k = c.x + ',' + c.z;
    if (seen.has(k)) continue; seen.add(k);
    spots.push({ c, end: t.end });
  }
}
// approach point: walkable ground at R+1.3 from the collider, at the ring
// angle nearest the seam (the end coord's azimuth) — max wedge pressure.
for (const s of spots) {
  const R = s.c.r + 0.34;
  const az = Math.atan2(s.end[1] - s.c.z, s.end[0] - s.c.x);
  let best = null, bestDa = 1e9;
  for (let rr = R + 1.3; rr <= R + 4 && !best; rr += 0.5)
    for (let a = 0; a < 48; a++) {
      const th = az + (a % 2 ? 1 : -1) * Math.ceil(a / 2) * (Math.PI / 24);
      const x = s.c.x + rr * Math.cos(th), z = s.c.z + rr * Math.sin(th);
      if (walkableW(x, z)) { const da = Math.abs(th - az); if (da < bestDa) { bestDa = da; best = [x, z]; } if (a > 8) break; }
    }
  s.start = best;
  s.label = `(${s.c.x},${s.c.z}) r${s.c.r}`;
  if (!best) console.log(`SKIP ${s.label}: no walkable approach within R+4 — unreachable collider`);
}

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
page.on('console', m => { if (m.type() === 'error' && !isNoise(m.text())) errors.push('[console.error] ' + m.text()); if (m.text().startsWith('[canary] wedge097')) sawCanary = true; });

let ok = true;
for (const s of spots) {
  if (!s.start) { ok = false; continue; }
  await page.goto(`http://localhost:${port}/?play=1&x=${s.start[0].toFixed(2)}&z=${s.start[1].toFixed(2)}&canary=wedge097`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
  await new Promise(r => setTimeout(r, 700));
  const res = await page.evaluate(async ({ cx, cz, sx, sz }) => {
    const hd = window.__hd, P = hd.player, { joy, cam } = hd.input;
    const steer = (tx, tz) => {
      let dx = tx - P.x, dz = tz - P.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const Fx = Math.sin(cam.yaw), Fz = Math.cos(cam.yaw), Rx = -Math.cos(cam.yaw), Rz = Math.sin(cam.yaw);
      joy.z = -(dx * Fx + dz * Fz); joy.x = dx * Rx + dz * Rz; joy.len = 1;
    };
    const phase = (tx, tz, n) => new Promise(res2 => {
      let f = 0; const st = () => { steer(tx, tz); if (++f >= n) return res2(); requestAnimationFrame(st); };
      requestAnimationFrame(st);
    });
    let maxIn = 0;
    await phase(cx, cz, 150);                        // A: press INTO the wedge
    maxIn = Math.hypot(P.x - sx, P.z - sz);
    await phase(sx, sz, 150);                        // B: walk back out
    joy.x = 0; joy.z = 0; joy.len = 0;
    return { maxIn: +maxIn.toFixed(2), backDist: +Math.hypot(P.x - sx, P.z - sz).toFixed(2), endX: +P.x.toFixed(2), endZ: +P.z.toFixed(2), endY: +P.y.toFixed(2) };
  }, { cx: s.c.x, cz: s.c.z, sx: s.start[0], sz: s.start[1] });
  const endWalk = walkableW(res.endX, res.endZ);
  const pass = res.backDist < 1.5 && endWalk;
  if (!pass) ok = false;
  console.log(`${pass ? 'FREE  ' : 'STUCK '} ${s.label} start(${s.start[0].toFixed(1)},${s.start[1].toFixed(1)}) pressedTo=${res.maxIn}m backDist=${res.backDist}m end(${res.endX},${res.endZ},y${res.endY}) endWalkable=${endWalk}`);
}

await browser.close(); vite.kill();
if (!sawCanary) { console.log('CANARY MISSING — wrong server?'); ok = false; }
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); ok = false; }
console.log(ok ? 'WEDGEBOT: all approaches FREE' : 'WEDGEBOT: STUCK SPOT(S)');
process.exit(ok ? 0 : 1);
