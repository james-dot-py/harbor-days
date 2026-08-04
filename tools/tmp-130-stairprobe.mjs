// =====================================================================
// tmp-130-stairprobe.mjs — task 130 item (3): CAN THE PLAYER CLIMB THE
// SANCTUARY DECK STAIRS?  Empirical only — no code reading, no opinions.
//
// SANCTUARY.deck (src/data/chicago.js ~1419):
//   platform walk rect x 169.5..175, z -398.5..-394, h 2.30
//   treads (WEST side, all z -397.5..-395.5):
//     x 168.3..169.5  h 1.72
//     x 167.1..168.3  h 1.15
//     x 165.9..167.1  h 0.57
//   => rises grade->0.57->1.15->1.72->deck 2.30 (~0.575 m each; the TOP one 0.58).
//   PITFALLS.md cites 0.5 m as the "elevator" threshold.
//
// Method (all of it live, none of it inferred):
//   A) window.__hd.solidProbe(x,z) swept along the stair centreline and the
//      off-centre lanes — the ENGINE's own {walk, surfaceY} answer per point.
//   B) real-input drives: window.__hd.input.joy written every rAF with main.js's
//      exact camera-relative mapping (the 062/101 steering-bot pattern), player
//      sampled every frame. No teleports mid-walk; spawn is ?play=1&x=&z=.
//
// Spawns its OWN vite and reads the port from vite's stdout (PITFALLS: :5173 may
// be a foreign app), and refuses to trust a page whose &canary= never echoed.
//
// Usage:  node tools/tmp-130-stairprobe.mjs
// Read-only: this script measures, it never asserts a verdict for you.
// =====================================================================
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const CANARY = 't130stair';
const CZ = -396.5;               // stair centreline
const f2 = n => (n === null || n === undefined ? ' n/a' : (+n).toFixed(2));
const f3 = n => (n === null || n === undefined ? '  n/a' : (+n).toFixed(3));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

// ------------------------------------------------------------- own vite
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: root });
const port = await new Promise((res, rej) => {
  let buf = '';
  const to = setTimeout(() => rej(new Error('vite reported no port in 40s:\n' + buf)), 40000);
  vite.stdout.on('data', d => {
    buf += d.toString();
    const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/);
    if (m) { clearTimeout(to); res(+m[1]); }
  });
  vite.stderr.on('data', d => { buf += d.toString(); });
  vite.on('exit', c => rej(new Error('vite exited early (' + c + '):\n' + buf)));
});
const kill = () => process.platform === 'win32'
  ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f'])
  : vite.kill();
log(`[setup] own vite on :${port} — WE spawned it and read the port off its stdout (never attached to a pre-existing server); the &canary= echo below is the proof it is our build`);

// ------------------------------------------------- the in-page driver
// Writes __hd.input.joy every rAF using main.js's own camera-relative mapping
// (Fx=sin(yaw),Fz=cos(yaw),Rx=-cos(yaw),Rz=sin(yaw); inF=-joy.z, inR=+joy.x),
// which reduces the world push (dirX,dirZ) to exactly itself. Samples the LIVE
// player every frame. cfg: {dirX,dirZ,maxSec,targetZ?,run?}
function installDrive() {
  window.__t130 = function (cfg) {
    const hd = window.__hd, P = hd.player, joy = hd.input.joy, cam = hd.input.cam;
    return new Promise(resolve => {
      const out = {
        start: { x: +P.x.toFixed(3), y: +P.y.toFixed(3), z: +P.z.toFixed(3) },
        frames: 0, gt: 0, trace: [], minY: 1e9, maxY: -1e9, minX: P.x, maxX: P.x,
        minZ: P.z, maxZ: P.z, maxDrop: 0, maxDropAt: null, stalls: []
      };
      let last = performance.now(), prevY = P.y, aX = P.x, aZ = P.z, aT = 0;
      const step = () => {
        const now = performance.now();
        const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; out.gt += dt;
        let dx = cfg.dirX || 0, dz = cfg.dirZ || 0;
        if (cfg.targetZ !== undefined && cfg.targetZ !== null) {
          const c = (cfg.targetZ - P.z) * 0.5;
          dz = c > 0.6 ? 0.6 : c < -0.6 ? -0.6 : c;
        }
        const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const Fx = Math.sin(cam.yaw), Fz = Math.cos(cam.yaw), Rx = -Math.cos(cam.yaw), Rz = Math.sin(cam.yaw);
        joy.z = -(dx * Fx + dz * Fz); joy.x = dx * Rx + dz * Rz; joy.len = cfg.run ? 1 : 0.8;

        out.frames++;
        if (P.y < out.minY) out.minY = P.y;
        if (P.y > out.maxY) out.maxY = P.y;
        if (P.x < out.minX) out.minX = P.x;
        if (P.x > out.maxX) out.maxX = P.x;
        if (P.z < out.minZ) out.minZ = P.z;
        if (P.z > out.maxZ) out.maxZ = P.z;
        const drop = prevY - P.y;
        if (drop > out.maxDrop) { out.maxDrop = drop; out.maxDropAt = { x: +P.x.toFixed(2), z: +P.z.toFixed(2), y: +P.y.toFixed(3) }; }
        prevY = P.y;
        // EVERY frame (this is the whole point — a 50 ms sampler can miss a hop)
        out.trace.push([+out.gt.toFixed(3), +P.x.toFixed(3), +P.y.toFixed(3), +P.z.toFixed(3)]);
        // stall episodes: input held, < 0.10 m of travel
        if (Math.hypot(P.x - aX, P.z - aZ) > 0.10) {
          if (out.gt - aT >= 0.4) out.stalls.push({ x: +aX.toFixed(2), z: +aZ.toFixed(2), y: +P.y.toFixed(2), dur: +(out.gt - aT).toFixed(2), ended: 1 });
          aX = P.x; aZ = P.z; aT = out.gt;
        }
        if (out.gt >= cfg.maxSec || out.frames > 60000) {
          if (out.gt - aT >= 0.4) out.stalls.push({ x: +aX.toFixed(2), z: +aZ.toFixed(2), y: +P.y.toFixed(2), dur: +(out.gt - aT).toFixed(2), ended: 0 });
          joy.x = 0; joy.z = 0; joy.len = 0;
          out.end = { x: +P.x.toFixed(3), y: +P.y.toFixed(3), z: +P.z.toFixed(3) };
          out.endProbe = hd.solidProbe(P.x, P.z);
          out.gt = +out.gt.toFixed(2);
          out.minY = +out.minY.toFixed(3); out.maxY = +out.maxY.toFixed(3);
          out.minX = +out.minX.toFixed(2); out.maxX = +out.maxX.toFixed(2);
          out.minZ = +out.minZ.toFixed(2); out.maxZ = +out.maxZ.toFixed(2);
          out.maxDrop = +out.maxDrop.toFixed(3);
          resolve(out); return;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };
}

// ------------------------------------------------------------- node side
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'], protocolTimeout: 300000 });
let fatal = null;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errors = []; let sawCanary = false;
  const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
  page.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' && !isNoise(t)) errors.push('[console.error] ' + t);
    if (t.startsWith('[canary] ' + CANARY)) sawCanary = true;
  });

  async function load(x, z) {
    await page.goto(`http://localhost:${port}/?play=1&quiet=1&canary=${CANARY}&x=${x}&z=${z}`,
      { waitUntil: 'networkidle0', timeout: 60000 });
    await page.evaluate(() => {
      const t = document.getElementById('title');
      if (t && !t.classList.contains('hide')) document.getElementById('start')?.click();
    });
    await sleep(1100);
    await page.evaluate(installDrive);
    const st = await page.evaluate(() => ({
      p: { x: +window.__hd.player.x.toFixed(2), y: +window.__hd.player.y.toFixed(3), z: +window.__hd.player.z.toFixed(2) },
      probe: window.__hd.solidProbe(window.__hd.player.x, window.__hd.player.z),
      running: !!(window.__hd.gstate)
    }));
    log(`  [load] asked (${x},${z}) -> player(${st.p.x}, y${st.p.y}, ${st.p.z})  walk=${st.probe.walk} surfaceY=${f2(st.probe.y)}`);
    return st;
  }
  // sampled print of a per-frame trace
  const sampleTrace = (tr, every = 0.25) => {
    const out = []; let nextT = 0;
    for (const s of tr) { if (s[0] >= nextT) { out.push(s); nextT = s[0] + every; } }
    if (tr.length && out[out.length - 1] !== tr[tr.length - 1]) out.push(tr[tr.length - 1]);
    return out.map(s => `t${s[0].toFixed(2)} x${s[1].toFixed(2)} y${s[2].toFixed(2)} z${s[3].toFixed(2)}`);
  };
  // constant-y plateaus (the "which tread am I standing on" summary)
  function levels(tr, tol = 0.05, minDur = 0.15) {
    const out = []; let cur = null;
    for (const [t, x, y, z] of tr) {
      if (cur && Math.abs(y - cur.yRef) <= tol) { cur.t1 = t; cur.x1 = x; cur.z1 = z; cur.yLo = Math.min(cur.yLo, y); cur.yHi = Math.max(cur.yHi, y); }
      else { if (cur && cur.t1 - cur.t0 >= minDur) out.push(cur); cur = { yRef: y, yLo: y, yHi: y, t0: t, t1: t, x0: x, x1: x, z0: z, z1: z }; }
    }
    if (cur && cur.t1 - cur.t0 >= minDur) out.push(cur);
    return out.map(l => `y${l.yLo.toFixed(2)}-${l.yHi.toFixed(2)} for ${(l.t1 - l.t0).toFixed(2)}s (x ${l.x0.toFixed(2)}->${l.x1.toFixed(2)}, z ${l.z1.toFixed(2)})`);
  }
  // vertical behaviour, straight off the per-frame trace: peak descent RATE and
  // the fall episodes (a step-down you can walk is a lerp; a drop > 0.5 m flips
  // main.js jphys.air and becomes real gravity, which is what "falling off the
  // stairs" would look like).
  function fallStats(tr) {
    let peak = 0, peakAt = null, epi = [], cur = null;
    for (let i = 1; i < tr.length; i++) {
      const dt = tr[i][0] - tr[i - 1][0], dy = tr[i][2] - tr[i - 1][2];
      if (dt <= 0) continue;
      const rate = -dy / dt;                       // m/s downward
      if (rate > peak) { peak = rate; peakAt = { x: tr[i][1], y: tr[i][2], z: tr[i][3], t: tr[i][0] }; }
      if (rate > 0.4) { if (!cur) cur = { t0: tr[i - 1][0], y0: tr[i - 1][2], x0: tr[i - 1][1], peak: 0 }; cur.t1 = tr[i][0]; cur.y1 = tr[i][2]; cur.x1 = tr[i][1]; cur.peak = Math.max(cur.peak, rate); }
      else if (cur) { epi.push(cur); cur = null; }
    }
    if (cur) epi.push(cur);
    return { peak, peakAt, epi };
  }
  async function drive(label, cfg) {
    log(`  [drive] ${label}  dir=(${cfg.dirX || 0},${cfg.dirZ || 0}) ${cfg.targetZ !== undefined ? 'laneZ=' + cfg.targetZ : 'NO lane steering'} ${cfg.run ? 'RUN' : 'walk'} ${cfg.maxSec}s`);
    const r = await page.evaluate(c => window.__t130(c), cfg);
    log(`          start (${r.start.x}, y${r.start.y}, ${r.start.z})  ->  END (${r.end.x}, y${r.end.y}, ${r.end.z})`);
    log(`          x ${r.minX}..${r.maxX}   z ${r.minZ}..${r.maxZ}   y ${f3(r.minY)}..${f3(r.maxY)}   frames=${r.frames} gameTime=${r.gt}s`);
    log(`          end probe: walk=${r.endProbe.walk} water=${r.endProbe.water} surfaceY=${f2(r.endProbe.y)}   |player.y - surfaceY| = ${f3(Math.abs(r.end.y - r.endProbe.y))}`);
    log(`          biggest single-frame y DROP: ${f3(r.maxDrop)} m${r.maxDropAt ? ` at (${r.maxDropAt.x},${r.maxDropAt.z}) y${r.maxDropAt.y}` : ''}`);
    const fs = fallStats(r.trace);
    log(`          peak DESCENT rate: ${f2(fs.peak)} m/s${fs.peakAt ? ` at (x${fs.peakAt.x.toFixed(2)}, y${fs.peakAt.y.toFixed(2)}) t${fs.peakAt.t.toFixed(2)}` : ''}   (main.js counts impact>3 m/s as a real FALL: thud + dust ring)`);
    log(`          descent episodes (>0.4 m/s): ${fs.epi.length ? fs.epi.map(e => `x${e.x0.toFixed(2)}->${e.x1.toFixed(2)} y${e.y0.toFixed(2)}->${e.y1.toFixed(2)} in ${(e.t1 - e.t0).toFixed(2)}s peak ${e.peak.toFixed(2)}m/s`).join(' · ') : 'none'}`);
    log(`          y levels: ${levels(r.trace).join('  |  ') || '(none held 0.15 s)'}`);
    log(`          stalls >=0.4 s: ${r.stalls.length ? r.stalls.map(s => `${s.dur}s at (${s.x},${s.z}) y${s.y}`).join(' · ') : 'none'}`);
    log(`          trace: ${sampleTrace(r.trace).join('  ')}`);
    return r;
  }

  // ---------------------------------------------------------------- 0
  log('\n=========== 130 (3) — SANCTUARY DECK STAIR CLIMB, EMPIRICAL ===========\n');
  const first = await load(164.5, CZ);
  if (!sawCanary) { fatal = 'CANARY NEVER ECHOED — the page under test is not our build; every number below would be fiction.'; throw new Error(fatal); }
  log(`  [canary] "[canary] ${CANARY}" echoed — we are measuring OUR vite on :${port}`);
  if (errors.length) log(`  [WARN] page errors already: ${errors.join(' | ')}`);
  if (!first.running) log('  [WARN] __hd.gstate missing — game may not be running');

  // ---------------------------------------------------------------- 1
  log('\n--- 1. solidProbe sweep: the ENGINE\'s surface height along the stair run ---');
  const rows = await page.evaluate(({ zs }) => {
    const P = window.__hd.solidProbe, out = {};
    for (const z of zs) {
      const arr = [];
      for (let i = 0; i <= 120; i++) {
        const x = +(164 + i * 0.1).toFixed(1), r = P(x, z);
        arr.push([x, !!r.walk, +r.y.toFixed(3)]);
      }
      out[z] = arr;
    }
    return out;
  }, { zs: [CZ, -395.9, -397.1, -393.0, -399.5, -394.5, -398.0] });

  function runsOf(arr) {
    const out = []; let cur = null;
    for (const [x, w, y] of arr) {
      const key = w + '|' + y.toFixed(2);
      if (cur && cur.key === key) cur.x1 = x;
      else { if (cur) out.push(cur); cur = { key, x0: x, x1: x, w, y }; }
    }
    if (cur) out.push(cur);
    return out;
  }
  for (const z of [CZ, -395.9, -397.1, -393.0, -399.5, -394.5, -398.0]) {
    const rs = runsOf(rows[z]);
    log(`  z=${z}:`);
    for (const r of rs) log(`     x ${r.x0.toFixed(1)}..${r.x1.toFixed(1)}  walk=${r.w ? 'YES' : 'no '}  surfaceY=${r.y.toFixed(3)}`);
    const bad = rows[z].filter(r => !r[1]);
    log(`     -> ${bad.length ? `NOT WALKABLE at ${bad.length}/121 samples (e.g. x ${bad.slice(0, 6).map(b => b[0]).join(', ')})` : 'every one of the 121 samples (x 164.0..176.0) is WALKABLE'}`);
  }
  // full centreline table (the raw thing, 0.1 m, so nothing is taken on trust)
  log(`\n  raw centreline table z=${CZ} (x: walk/surfaceY):`);
  {
    const arr = rows[CZ]; const lines = [];
    for (let i = 0; i < arr.length; i += 6)
      lines.push('     ' + arr.slice(i, i + 6).map(([x, w, y]) => `${x.toFixed(1)}:${w ? 'W' : '-'}${y.toFixed(2)}`).join('  '));
    log(lines.join('\n'));
  }

  // ---------------------------------------------------------------- 2
  log('\n--- 2. LIVE CLIMB: spawn (164.5,-396.5), hold EAST 8 s (lane-steered to z=-396.5) ---');
  const up1 = await drive('climb, centreline, lane-held', { dirX: 1, dirZ: 0, targetZ: CZ, maxSec: 8 });
  log('\n--- 2b. same climb with NO lane steering (pure +x push) ---');
  await load(164.5, CZ);
  const up2 = await drive('climb, centreline, free', { dirX: 1, dirZ: 0, maxSec: 8 });
  log('\n--- 2c. same climb at RUN speed (joy.len=1), lane-held ---');
  await load(164.5, CZ);
  const up3 = await drive('climb, centreline, RUN', { dirX: 1, dirZ: 0, targetZ: CZ, maxSec: 8, run: true });

  // ---------------------------------------------------------------- 3
  log('\n--- 3. REVERSE: spawn ON the deck (172,-396.5), hold WEST 8 s ---');
  await load(172, CZ);
  const dn1 = await drive('descend, lane-held', { dirX: -1, dirZ: 0, targetZ: CZ, maxSec: 8 });
  log('\n--- 3b. descend with NO lane steering ---');
  await load(172, CZ);
  const dn2 = await drive('descend, free', { dirX: -1, dirZ: 0, maxSec: 8 });

  // ---------------------------------------------------------------- 4
  log('\n--- 4. OFF-CENTRE APPROACHES (stair mouth width) ---');
  log('  (a) z = -395.9 (0.6 m south of centre; tread rect z -397.5..-395.5)');
  await load(164.5, -395.9);
  const off1 = await drive('climb, z-395.9, free', { dirX: 1, dirZ: 0, maxSec: 8 });
  log('  (a2) same lane, HELD at z=-395.9 (player refuses to drift)');
  await load(164.5, -395.9);
  const off1b = await drive('climb, z-395.9, lane-held', { dirX: 1, dirZ: 0, targetZ: -395.9, maxSec: 8 });
  log('  (b) z = -397.1 (0.6 m north of centre)');
  await load(164.5, -397.1);
  const off2 = await drive('climb, z-397.1, free', { dirX: 1, dirZ: 0, maxSec: 8 });
  log('  (b2) same lane, HELD at z=-397.1');
  await load(164.5, -397.1);
  const off2b = await drive('climb, z-397.1, lane-held', { dirX: 1, dirZ: 0, targetZ: -397.1, maxSec: 8 });

  // ---------------------------------------------------------------- 5
  log('\n--- 5. CAN YOU GET UP WITHOUT THE STAIRS? (hold EAST from x168 on the grass) ---');
  log('  (a) z = -393.0 (south of the deck footprint, deck z1=-394)');
  await load(168, -393.0);
  const g1 = await drive('grass climb attempt z-393.0', { dirX: 1, dirZ: 0, targetZ: -393.0, maxSec: 8 });
  log('  (b) z = -399.5 (north of the deck footprint, deck z0=-398.5)');
  await load(168, -399.5);
  const g2 = await drive('grass climb attempt z-399.5', { dirX: 1, dirZ: 0, targetZ: -399.5, maxSec: 8 });
  log('  (c) control: straight at the deck\'s SOUTH rim, z = -394.5 (inside the footprint, no stairs)');
  await load(168, -394.5);
  const g3 = await drive('grass climb attempt z-394.5 (under the deck)', { dirX: 1, dirZ: 0, targetZ: -394.5, maxSec: 8 });

  // ---------------------------------------------------------------- 6
  // Run 2c showed the RUN-speed climb did not stop at the deck's east rail. If
  // that is real it is the inverse defect (a 2.3 m fall THROUGH a rendered
  // railing), so it gets repeated and probed on all four rims.
  log('\n--- 6. RUN-SPEED RAIL PROBE (does the guard rail hold at 9.5 m/s?) ---');
  const cens = await page.evaluate(() => window.__hd.propAudit().colliders
    .filter(c => Math.abs(c.x - 172.25) <= 8 && Math.abs(c.z + 396.25) <= 8)
    .map(c => `(${c.x.toFixed(2)},${c.z.toFixed(2)}) r=${c.r} h=${c.h}`));
  log(`  [census] colliders within the deck block (x 164..180, z -404..-388): ${cens.length}`);
  log('     ' + cens.join('  '));
  const rail = [];
  for (let k = 0; k < 6; k++) {
    await load(164.5, CZ);
    rail.push(['east rim, RUN from the stairs #' + (k + 1), await drive('RUN east off the deck, rep ' + (k + 1), { dirX: 1, dirZ: 0, targetZ: CZ, maxSec: 6, run: true })]);
  }
  for (let k = 0; k < 2; k++) {
    await load(164.5, CZ);
    rail.push(['east rim, WALK from the stairs (control) #' + (k + 1), await drive('walk east into the east rail (control) ' + (k + 1), { dirX: 1, dirZ: 0, targetZ: CZ, maxSec: 6 })]);
  }
  log('  (b) from the deck centre, RUN at the NORTH rim (-z)');
  await load(172, CZ);
  rail.push(['north rim, run from deck centre', await drive('RUN north off the deck', { dirX: 0, dirZ: -1, maxSec: 6, run: true })]);
  log('  (c) from the deck centre, RUN at the SOUTH rim (+z)');
  await load(172, CZ);
  rail.push(['south rim, run from deck centre', await drive('RUN south off the deck', { dirX: 0, dirZ: 1, maxSec: 6, run: true })]);
  log('  (d) from the deck centre, RUN WEST down the stairs');
  await load(172, CZ);
  rail.push(['west stairs, run down', await drive('RUN west down the stairs', { dirX: -1, dirZ: 0, targetZ: CZ, maxSec: 6, run: true })]);

  // ---------------------------------------------------------------- summary
  const onDeck = r => r.end.y >= 2.2;
  log('\n=========== SUMMARY (numbers only) ===========');
  const line = (n, r, want) => log(`  ${n.padEnd(34)} end=(${r.end.x.toFixed(2)}, y${r.end.y.toFixed(2)}, ${r.end.z.toFixed(2)})  maxY=${r.maxY.toFixed(2)}  maxX=${r.maxX.toFixed(2)}  ${want}`);
  line('2  climb centre lane-held', up1, onDeck(up1) ? 'ON THE DECK' : 'NOT on the deck');
  line('2b climb centre free', up2, onDeck(up2) ? 'ON THE DECK' : 'NOT on the deck');
  line('2c climb centre RUN', up3, onDeck(up3) ? 'ON THE DECK' : 'NOT on the deck');
  line('3  descend lane-held', dn1, dn1.end.y <= 0.15 ? 'back at grade' : 'still elevated');
  line('3b descend free', dn2, dn2.end.y <= 0.15 ? 'back at grade' : 'still elevated');
  line('4a climb z-395.9 free', off1, onDeck(off1) ? 'ON THE DECK' : 'NOT on the deck');
  line('4a2 climb z-395.9 held', off1b, onDeck(off1b) ? 'ON THE DECK' : 'NOT on the deck');
  line('4b climb z-397.1 free', off2, onDeck(off2) ? 'ON THE DECK' : 'NOT on the deck');
  line('4b2 climb z-397.1 held', off2b, onDeck(off2b) ? 'ON THE DECK' : 'NOT on the deck');
  line('5a grass z-393.0', g1, onDeck(g1) ? 'ON THE DECK (unintended!)' : 'stayed at grade');
  line('5b grass z-399.5', g2, onDeck(g2) ? 'ON THE DECK (unintended!)' : 'stayed at grade');
  line('5c under-deck z-394.5', g3, onDeck(g3) ? 'ON THE DECK (unintended!)' : 'stayed at grade');
  log('  --- 6 rail probe (deck rect x 169.5..175, z -398.5..-394; rails on N/E/S) ---');
  for (const [n, r] of rail)
    log(`  ${n.padEnd(40)} end=(${r.end.x.toFixed(2)}, y${r.end.y.toFixed(2)}, ${r.end.z.toFixed(2)})  ${r.end.y >= 2.2 ? 'HELD on the deck' : 'LEFT the deck (y ' + r.end.y.toFixed(2) + ')'}`);
  log(`\n  canary seen: ${sawCanary}`);
  log(`  page/console errors: ${errors.length ? errors.join(' | ') : 'none'}`);
} catch (e) {
  log('\nHARNESS FAILURE: ' + (fatal || e.message));
  log(e.stack || '');
} finally {
  await browser.close();
  kill();
}
