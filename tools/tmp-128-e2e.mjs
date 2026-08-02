// =====================================================================
// tmp-128-e2e.mjs — task 128 / issue 040 LIVE PROOF.
//
// Owner playtest 2026-08-02: "at the dock approaching montrose harbor I fall
// in when I try to walk to end."  Two changes must be proven by DRIVING THE
// REAL INPUT PATH (window.__hd.input joy, the exact camera-relative mapping
// main.js uses), never by reading code:
//
//   (A) DATA   CH.MT_FINGER_DOCKS x0 186 -> 183.4 (len 17.6): the deck now
//              roots on the GRASS, inland of the crChain-smoothed LAND edge
//              (x 184.8-185.6 at the four rows) instead of 0.4-1.2 m out over
//              open water with a non-walkable moat in between.
//   (B) ENGINE main.js movement block: you never WADE off a DECK. Standing on
//              a walkRect no longer banks jsk.wadeT, so leaning on a pier edge
//              STOPS you instead of walking you off a 2.4 m drop after 0.35 s.
//              SPACE (jphys.air) off the end still works. Shores/sand/lawns
//              carry no walk rect -> wading in from them must be UNCHANGED,
//              and that is the regression this file hunts hardest.
//
// Spawns its OWN strict-port vite (never 5173 — PITFALLS: a foreign app may
// own it) and canary-checks the page before trusting a single number.
//
// Usage:  node tools/tmp-128-e2e.mjs [port]
// Exit 0 = every assertion passed, 1 = at least one failed.
// =====================================================================
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const port = +(process.argv[2] || 5247);
const CANARY = 't128';

let fails = 0;
const results = [];
function expect(label, ok, detail) {
  results.push({ label, ok });
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '\n        ' + detail : ''}`);
}
const f2 = n => (n === null || n === undefined ? 'n/a' : (+n).toFixed(2));
const f3 = n => (n === null || n === undefined ? 'n/a' : (+n).toFixed(3));

// ------------------------------------------------------------- own vite
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
console.log(`[setup] own vite on :${port} (never 5173)`);

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });

const errors = [];
let sawCanary = false;
const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
page.on('console', m => {
  const t = m.text();
  if (m.type() === 'error' && !isNoise(t)) errors.push('[console.error] ' + t);
  if (m.type() === 'warning' && /onWorldReady|Cannot|undefined is not/.test(t)) errors.push('[console.warn] ' + t);
  if (t.startsWith('[canary] ' + CANARY)) sawCanary = true;
});

// --------------------------------------------------- the in-page driver
// Installed fresh after every load. Drives the REAL input path: writes
// __hd.input.joy each rAF using main.js's own camera-relative mapping, samples
// the live player every frame, and reports minima / transitions / stall
// episodes. cfg:
//   dirX,dirZ   world-space push direction
//   targetZ     hold this z (proportional steer, +-0.6 authority)
//   maxSec      game-time budget (dt clamped 0..0.05 exactly like main.js)
//   stopXge/stopXle/stopOnWater/stopOffWater   early-out conditions
//   sidestep    walk AROUND a point collider after 0.9 s of no progress
//               (the 065 law: a post you step around is not a trap)
function installDrive() {
  window.__t128drive = function (cfg) {
    const hd = window.__hd, P = hd.player, joy = hd.input.joy, cam = hd.input.cam;
    return new Promise(resolve => {
      const out = {
        frames: 0, gt: 0, minY: 1e9, minYAt: null, maxY: -1e9,
        minX: P.x, maxX: P.x,
        start: [+P.x.toFixed(2), +P.y.toFixed(3), +P.z.toFixed(2)],
        startWater: !!hd.gstate.onWater,
        trace: [], tail: [], stalls: [], sidesteps: 0,
        waterEnter: null, waterExit: null, stop: 'maxSec'
      };
      if (out.startWater) out.waterEnter = { x: out.start[0], y: out.start[1], z: out.start[2], t: 0 };
      const warm = cfg.warm === undefined ? 0.6 : cfg.warm;
      let last = performance.now(), sampleT = 0, warmed = false;
      let aX = P.x, aZ = P.z, aT = warm, sideT = 0, sideSign = 1;
      const snap = () => ({ x: +P.x.toFixed(2), y: +P.y.toFixed(2), z: +P.z.toFixed(2), t: +out.gt.toFixed(2) });
      const step = () => {
        const now = performance.now();
        const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; out.gt += dt;

        // ---- steer (world dir -> camera-relative joystick, main.js's mapping)
        let dx = cfg.dirX || 0, dz = cfg.dirZ || 0;
        if (cfg.targetZ !== undefined && cfg.targetZ !== null) {
          const c = (cfg.targetZ - P.z) * 0.5;
          dz = c > 0.6 ? 0.6 : c < -0.6 ? -0.6 : c;
        }
        if (sideT > 0) { sideT -= dt; dz = sideSign * 1.2; }
        const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const Fx = Math.sin(cam.yaw), Fz = Math.cos(cam.yaw), Rx = -Math.cos(cam.yaw), Rz = Math.sin(cam.yaw);
        joy.z = -(dx * Fx + dz * Fz); joy.x = dx * Rx + dz * Rz; joy.len = 1;

        out.frames++;
        const w = !!hd.gstate.onWater;
        if (P.y < out.minY) { out.minY = P.y; out.minYAt = snap(); }
        if (P.y > out.maxY) out.maxY = P.y;
        if (P.x < out.minX) out.minX = P.x;
        if (P.x > out.maxX) out.maxX = P.x;
        if (w && out.waterEnter === null) out.waterEnter = snap();
        if (!w && out.waterEnter !== null && out.waterExit === null) out.waterExit = snap();

        sampleT -= dt;
        if (sampleT <= 0) { sampleT = 0.5; out.trace.push([+out.gt.toFixed(2), +P.x.toFixed(2), +P.y.toFixed(2), +P.z.toFixed(2), w ? 1 : 0]); }
        out.tail.push([+P.x.toFixed(2), +P.y.toFixed(3), +P.z.toFixed(2)]);
        if (out.tail.length > 60) out.tail.shift();

        // ---- stall episodes (input is held the whole time)
        if (out.gt > warm) {
          if (!warmed) { warmed = true; aX = P.x; aZ = P.z; aT = out.gt; }
          if (Math.hypot(P.x - aX, P.z - aZ) > 0.10) {
            if (out.gt - aT >= 0.5) out.stalls.push({ x: +aX.toFixed(2), z: +aZ.toFixed(2), dur: +(out.gt - aT).toFixed(2), ended: 1 });
            aX = P.x; aZ = P.z; aT = out.gt; sideT = 0;
          } else if (cfg.sidestep && out.gt - aT >= 0.9 && sideT <= 0) {
            sideSign = -sideSign; sideT = 0.7; out.sidesteps++;
          }
        }

        // ---- stop conditions
        let stop = null;
        if (cfg.stopXge !== undefined && P.x >= cfg.stopXge) stop = 'x>=' + cfg.stopXge;
        else if (cfg.stopXle !== undefined && P.x <= cfg.stopXle) stop = 'x<=' + cfg.stopXle;
        else if (cfg.stopOnWater && w) stop = 'onWater';
        else if (cfg.stopOffWater && out.waterEnter !== null && !w) stop = 'offWater';
        else if (out.gt >= cfg.maxSec) stop = 'maxSec';
        else if (out.frames > 60000) stop = 'frameCap';
        if (stop) {
          if (out.gt - aT >= 0.5) out.stalls.push({ x: +aX.toFixed(2), z: +aZ.toFixed(2), dur: +(out.gt - aT).toFixed(2), ended: 0 });
          joy.x = 0; joy.z = 0; joy.len = 0;
          out.stop = stop;
          out.end = { x: +P.x.toFixed(2), y: +P.y.toFixed(3), z: +P.z.toFixed(2) };
          out.endWater = !!hd.gstate.onWater;
          out.endProbe = hd.solidProbe(P.x, P.z);
          out.gt = +out.gt.toFixed(2);
          out.minY = +out.minY.toFixed(3); out.maxY = +out.maxY.toFixed(3);
          out.minX = +out.minX.toFixed(2); out.maxX = +out.maxX.toFixed(2);
          resolve(out);
          return;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };
}

// ------------------------------------------------------------- harness
const allDrives = [];   // {label, edgeAt, stalls[]} — assertion 6 aggregates these
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function load(x, z) {
  await page.goto(`http://localhost:${port}/?play=1&canary=${CANARY}&x=${x}&z=${z}`,
    { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => {
    const t = document.getElementById('title');
    if (t && !t.classList.contains('hide')) document.getElementById('start')?.click();
  });
  await sleep(900);
  await page.evaluate(installDrive);
  const st = await page.evaluate(() => ({
    p: { x: +window.__hd.player.x.toFixed(2), y: +window.__hd.player.y.toFixed(3), z: +window.__hd.player.z.toFixed(2) },
    probe: window.__hd.solidProbe(window.__hd.player.x, window.__hd.player.z),
    surf: window.__hd.stepSurf(),
    running: !!window.__hd.gstate && true
  }));
  console.log(`  [load] spawn (${x},${z}) -> player(${st.p.x},${st.p.y},${st.p.z}) walk=${st.probe.walk} water=${st.probe.water} surfaceY=${f2(st.probe.y)} footing='${st.surf}'`);
  return st;
}

async function drive(label, cfg, edgeAt) {
  const res = await page.evaluate(c => window.__t128drive(c), cfg);
  allDrives.push({ label, edgeAt, stalls: res.stalls, gt: res.gt });
  return res;
}
// start a drive WITHOUT awaiting, so node can press real keys during it
async function driveStart(cfg) { await page.evaluate(c => { window.__t128p = window.__t128drive(c); }, cfg); }
async function driveEnd(label, edgeAt) {
  const res = await page.evaluate(() => window.__t128p);
  allDrives.push({ label, edgeAt, stalls: res.stalls, gt: res.gt });
  return res;
}

const pt = s => `t${s[0]}(${s[1]},y${s[2]},${s[3]})${s[4] ? 'W' : ''}`;
const traceStr = t => (t.length <= 14 ? t.map(pt).join(' ')
  : t.slice(0, 8).map(pt).join(' ') + `  …[${t.length - 12} samples]…  ` + t.slice(-4).map(pt).join(' '));
function tailStr(tail) {
  const lines = [];
  for (let i = 0; i < tail.length; i += 10)
    lines.push('        ' + tail.slice(i, i + 10).map(p => `x${p[0]}/y${p[1]}`).join(' '));
  return lines.join('\n');
}
// every point collider within `rad` of a spot — the 065 law's diagnostic: "a
// solid post you step AROUND is not a trap", so a bot stall must be attributed
// to a collider or to walkability before it counts as a defect.
async function collidersNear(x, z, rad) {
  return page.evaluate(({ x, z, rad }) => window.__hd.propAudit().colliders
    .filter(c => Math.hypot(c.x - x, c.z - z) <= rad)
    .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))
    .map(c => `(${c.x.toFixed(1)},${c.z.toFixed(1)}) r=${c.r} h=${c.h} d=${Math.hypot(c.x - x, c.z - z).toFixed(2)}m`),
    { x, z, rad });
}
// walk the engine's own probe east from a point: where does land end, water start?
async function shoreScan(x0, z, span = 110, step = 0.5) {
  return page.evaluate(({ x0, z, span, step }) => {
    const P = window.__hd.solidProbe;
    let lastWalk = null, firstNonWalk = null, firstWater = null;
    for (let d = 0; d <= span; d += step) {
      const x = x0 + d, r = P(x, z);
      if (r.walk) lastWalk = +x.toFixed(2);
      else if (firstNonWalk === null) firstNonWalk = +x.toFixed(2);
      if (r.water && firstWater === null) firstWater = +x.toFixed(2);
      if (firstWater !== null && lastWalk !== null && firstWater > lastWalk) break;
    }
    return { lastWalk, firstNonWalk, firstWater };
  }, { x0, z, span, step });
}

console.log('\n================ 128 / issue 040 — live E2E ================\n');

// =====================================================================
// 1 + 2 + 3 — the owner's exact action, at the middle Montrose finger dock
// (row z=-754; deck rect x 183.4..201, halfW 0.95, h~0.12)
// =====================================================================
console.log('--- 1. THE OWNER\'S EXACT ACTION: lawn x180,z-754 -> walk EAST to the dock tip ---');
await load(180, -754);
console.log(`        [diag] colliders within 4 m of the walked dock lane (192,-754): ${(await collidersNear(192, -754, 4)).join(' · ') || 'none'}`);
const r1 = await drive('1 montrose dock: lawn -> tip (EAST held)',
  { dirX: 1, dirZ: 0, targetZ: -754, maxSec: 15, stopXge: 200.9 }, 201);
console.log(`        trace: ${traceStr(r1.trace)}`);
expect('1a  player reaches the dock tip (x >= 200.5)',
  r1.maxX >= 200.5,
  `maxX=${r1.maxX}  end=(${r1.end.x},y${r1.end.y},${r1.end.z})  stop=${r1.stop}  gameTime=${r1.gt}s  frames=${r1.frames}`);
expect('1b  y NEVER drops below -0.5 on the way out (no fall into the basin)',
  r1.minY >= -0.5,
  `minY=${f3(r1.minY)} at (x${r1.minYAt ? r1.minYAt.x : '?'},z${r1.minYAt ? r1.minYAt.z : '?'}) t=${r1.minYAt ? r1.minYAt.t : '?'}s · maxY=${f3(r1.maxY)} · onWater ever=${r1.waterEnter ? 'YES @' + JSON.stringify(r1.waterEnter) : 'no'}`);
console.log(`        (pre-fix symptom was: stall at x~184.9 then y -> ~-2.3)`);

console.log('\n--- 2. THE TIP STOPS HIM: keep holding EAST for 4 more seconds ---');
const r2 = await drive('2 montrose dock: 4 s of EAST at the tip', { dirX: 1, dirZ: 0, targetZ: -754, maxSec: 4 }, 201);
console.log(`        last 60 frames (x / y):\n${tailStr(r2.tail)}`);
expect('2a  still standing on the planks (y >= 0)', r2.end.y >= 0,
  `end y=${f3(r2.end.y)} (deck h=0.12) · minY over the 4 s=${f3(r2.minY)}`);
expect('2b  NOT in the water (gstate.onWater === false)', r2.endWater === false,
  `endWater=${r2.endWater}  waterEnter=${r2.waterEnter ? JSON.stringify(r2.waterEnter) : 'never'}`);
expect('2c  final x within 0.6 m of the tip (201)', Math.abs(r2.end.x - 201) <= 0.6,
  `end x=${r2.end.x} (|dx|=${f2(Math.abs(r2.end.x - 201))})  probe: walk=${r2.endProbe.walk} water=${r2.endProbe.water} surfaceY=${f2(r2.endProbe.y)}`);

console.log('\n--- 3. DELIBERATE EXIT: SPACE off the tip, then try to get back on ---');
await driveStart({ dirX: 1, dirZ: 0, targetZ: -754, maxSec: 6, stopOnWater: true });
await sleep(350);
await page.keyboard.down(' ');
await sleep(90);
await page.keyboard.up(' ');
const r3 = await driveEnd('3a montrose dock: SPACE off the tip (EAST held)', 201);
console.log(`        trace: ${traceStr(r3.trace)}`);
expect('3a  SPACE off the tip DOES put him in the water (the deck is not a cage)',
  r3.waterEnter !== null && r3.waterEnter.t <= 4.0,
  `waterEnter=${r3.waterEnter ? `(x${r3.waterEnter.x},y${r3.waterEnter.y},z${r3.waterEnter.z}) t=${r3.waterEnter.t}s after drive start (SPACE ~0.35 s in)` : 'NEVER — he never left the deck'} · maxY=${f3(r3.maxY)} minY=${f3(r3.minY)} · end=(${r3.end.x},y${r3.end.y},${r3.end.z}) onWater=${r3.endWater}`);

// attempt 1: just push WEST at the planks.
const r3b = await drive('3b montrose dock: WEST back at the planks from the water',
  { dirX: -1, dirZ: 0, targetZ: -754, maxSec: 10, stopOffWater: true }, 201);
console.log(`        trace: ${traceStr(r3b.trace)}`);
console.log(`        [attempt 1 — hold WEST ${r3b.gt}s] waterExit=${r3b.waterExit ? JSON.stringify(r3b.waterExit) : 'NEVER'} end=(${r3b.end.x},y${r3b.end.y},${r3b.end.z}) onWater=${r3b.endWater} net dx=${f2(r3b.end.x - r3b.start[0])}m`);
// attempt 2: give the game every legitimate chance — hold WEST *and* press
// SPACE (the jetski hop, main.js jsk branch) three times.
let r3b2 = null;
if (r3b.endWater !== false) {
  await driveStart({ dirX: -1, dirZ: 0, targetZ: -754, maxSec: 6, stopOffWater: true });
  for (let k = 0; k < 3; k++) {
    await sleep(500);
    await page.keyboard.down(' '); await sleep(90); await page.keyboard.up(' ');
  }
  r3b2 = await driveEnd('3b2 montrose dock: WEST + SPACE hops back at the planks', 201);
  console.log(`        [attempt 2 — hold WEST + 3x SPACE hop ${r3b2.gt}s] waterExit=${r3b2.waterExit ? JSON.stringify(r3b2.waterExit) : 'NEVER'} end=(${r3b2.end.x},y${r3b2.end.y},${r3b2.end.z}) onWater=${r3b2.endWater} maxY=${f3(r3b2.maxY)} net dx=${f2(r3b2.end.x - r3b2.start[0])}m`);
}
// The drive stops the INSTANT onWater flips false, which is mid-climb-out: the
// player's y is still lerping up from the water toward the deck (−0.66 → 0.12),
// so reading end.y one frame after the exit measures the lerp, not the outcome.
// Settle for a second with the stick released and assert the STRONGER thing —
// he is standing ON a plank: engine says walkable, and his y has arrived at the
// deck's own surfaceY.
const settled = await (async () => {
  await sleep(1000);
  return page.evaluate(() => { const P = window.__hd.player, pr = window.__hd.solidProbe(P.x, P.z);
    return { x: +P.x.toFixed(2), y: +P.y.toFixed(2), z: +P.z.toFixed(2), walk: pr.walk, water: pr.water, surfaceY: +pr.y.toFixed(2), onWater: !!window.__hd.gstate.onWater }; });
})();
const onPlank = s => s && s.walk === true && s.onWater === false && Math.abs(s.y - s.surfaceY) <= 0.2 && s.surfaceY > 0;
const back = (r3b.waterExit !== null || (r3b2 && r3b2.waterExit !== null)) && onPlank(settled);
console.log(`        [settled +1.0 s, stick released] (${settled.x},y${settled.y},${settled.z}) walk=${settled.walk} onWater=${settled.onWater} surfaceY=${settled.surfaceY} -> onPlank=${onPlank(settled)}`);
expect('3b  he can climb BACK ONTO the planks within 10 s (fall-off must not be a one-way trap)',
  back,
  `attempt1 (WEST ${r3b.gt}s): waterExit=${r3b.waterExit ? JSON.stringify(r3b.waterExit) : 'NEVER'} end=(${r3b.end.x},y${r3b.end.y},${r3b.end.z}) onWater=${r3b.endWater} netdx=${f2(r3b.end.x - r3b.start[0])}m probe{walk=${r3b.endProbe.walk} water=${r3b.endProbe.water} surfaceY=${f2(r3b.endProbe.y)}}`
  + (r3b2 ? `\n        attempt2 (WEST+SPACE ${r3b2.gt}s): waterExit=${r3b2.waterExit ? JSON.stringify(r3b2.waterExit) : 'NEVER'} end=(${r3b2.end.x},y${r3b2.end.y},${r3b2.end.z}) onWater=${r3b2.endWater} netdx=${f2(r3b2.end.x - r3b2.start[0])}m` : ''));

// diagnostic: where CAN the jetski put him ashore? (engine rule: dismount needs
// walkable ground with surfaceY <= -0.55 — main.js canMove, jsk.on branch)
const exits = await page.evaluate(() => {
  const P = window.__hd.solidProbe, out = [];
  for (let x = 150; x <= 244; x += 2) for (let z = -1084; z <= -600; z += 2) {
    const r = P(x, z);
    if (r.walk && r.y <= -0.55) out.push([x, z, +r.y.toFixed(2)]);
  }
  const tip = [201, -754];
  out.sort((a, b) => Math.hypot(a[0] - tip[0], a[1] - tip[1]) - Math.hypot(b[0] - tip[0], b[1] - tip[1]));
  return { n: out.length, nearest: out.slice(0, 4).map(p => `(${p[0]},${p[1]}) y${p[2]} d=${Math.round(Math.hypot(p[0] - tip[0], p[1] - tip[1]))}m`) };
});
console.log(`        [diag] legal jetski dismounts (walkable && surfaceY<=-0.55) in x150..244 / z-1084..-600: ${exits.n} spots; nearest to the tip: ${exits.nearest.join(' · ') || 'NONE'}`);

// =====================================================================
// 4 — WADE REGRESSION: the no-wade-off-a-deck rule must NOT reach the shore
// =====================================================================
console.log('\n--- 4. WADE REGRESSION (the rule must not reach shores/sand/lawn) ---');

console.log('  (a) Montrose beach sand, x220,z-1040, walking EAST into the lake');
const s4a = await load(220, -1040);
const scan4a = await shoreScan(220, -1040, 30, 0.5);
console.log(`        [scan] east of the spawn: last walkable x=${scan4a.lastWalk}  first non-walk x=${scan4a.firstNonWalk}  first water x=${scan4a.firstWater}`);
const r4a = await drive('4a beach sand: wade EAST', { dirX: 1, dirZ: 0, targetZ: -1040, maxSec: 14, stopOnWater: true }, null);
console.log(`        trace: ${traceStr(r4a.trace)}`);
expect('4a  WADING IN FROM SAND STILL WORKS (onWater === true)', r4a.endWater === true,
  `footing at spawn='${s4a.surf}' · waterEnter=${r4a.waterEnter ? JSON.stringify(r4a.waterEnter) : 'NEVER'} · end=(${r4a.end.x},y${r4a.end.y},${r4a.end.z}) onWater=${r4a.endWater} stop=${r4a.stop} gameTime=${r4a.gt}s · minY=${f3(r4a.minY)}`);

console.log('  (b) plain lawn/revetment shore, x150,z-500, walking EAST into the lake');
const s4b = await load(150, -500);
const scan4b = await shoreScan(150, -500, 110, 0.5);
console.log(`        [scan] east of the spawn: last walkable x=${scan4b.lastWalk}  first non-walk x=${scan4b.firstNonWalk}  first water x=${scan4b.firstWater}`);
// the revetment is ~82 m east of x150, so the budget is time-to-reach, not the
// assertion: the assertion is still "he ends up in the water".
const r4b = await drive('4b lawn+revetment: wade EAST', { dirX: 1, dirZ: 0, targetZ: -500, maxSec: 30, stopOnWater: true, sidestep: true }, null);
console.log(`        trace: ${traceStr(r4b.trace)}`);
expect('4b  WADING IN FROM LAWN/REVETMENT STILL WORKS (onWater === true)', r4b.endWater === true,
  `footing at spawn='${s4b.surf}' · waterEnter=${r4b.waterEnter ? JSON.stringify(r4b.waterEnter) : 'NEVER'} · end=(${r4b.end.x},y${r4b.end.y},${r4b.end.z}) onWater=${r4b.endWater} stop=${r4b.stop} gameTime=${r4b.gt}s · sidesteps=${r4b.sidesteps} · minY=${f3(r4b.minY)}`);

// =====================================================================
// 5 — the OTHER decks behave
// =====================================================================
console.log('\n--- 5. THE OTHER DECKS ---');

console.log('  (a) Belmont finger dock (rect x78..91, z-140)');
await load(74, -140);
const r5a = await drive('5a belmont finger: lawn -> tip (EAST held)',
  { dirX: 1, dirZ: 0, targetZ: -140, maxSec: 12, stopXge: 90.9 }, 91);
console.log(`        trace: ${traceStr(r5a.trace)}`);
expect('5a1 reaches the Belmont finger tip (x >= 90.5) with y never below -0.5',
  r5a.maxX >= 90.5 && r5a.minY >= -0.5,
  `maxX=${r5a.maxX} minY=${f3(r5a.minY)} at (x${r5a.minYAt ? r5a.minYAt.x : '?'},z${r5a.minYAt ? r5a.minYAt.z : '?'}) · end=(${r5a.end.x},y${r5a.end.y},${r5a.end.z}) stop=${r5a.stop} gameTime=${r5a.gt}s`);
const r5a2 = await drive('5a belmont finger: 4 s of EAST at the tip', { dirX: 1, dirZ: 0, targetZ: -140, maxSec: 4 }, 91);
expect('5a2 4 s more of EAST leaves him ON the deck, not in the water',
  r5a2.endWater === false && r5a2.end.y >= 0,
  `end=(${r5a2.end.x},y${r5a2.end.y},${r5a2.end.z}) onWater=${r5a2.endWater} minY=${f3(r5a2.minY)} · probe walk=${r5a2.endProbe.walk} water=${r5a2.endProbe.water} surfaceY=${f2(r5a2.endProbe.y)}`);

// CONTROL for 3b: is "can't remount from the water" a Montrose-dock defect or a
// property of the jetski rule everywhere? Same experiment at Belmont.
{
  await driveStart({ dirX: 1, dirZ: 0, targetZ: -140, maxSec: 6, stopOnWater: true });
  await sleep(350); await page.keyboard.down(' '); await sleep(90); await page.keyboard.up(' ');
  const j = await driveEnd('diag belmont: SPACE off the tip', 91);
  const b = await drive('diag belmont: WEST back at the planks', { dirX: -1, dirZ: 0, targetZ: -140, maxSec: 8, stopOffWater: true }, 91);
  console.log(`        [diag 3c CONTROL — Belmont finger, same experiment] off the tip: onWater=${j.endWater} at (${j.end.x},y${j.end.y},${j.end.z}) t=${j.waterEnter ? j.waterEnter.t : 'n/a'}s`
    + ` | back WEST ${b.gt}s: waterExit=${b.waterExit ? JSON.stringify(b.waterExit) : 'NEVER'} end=(${b.end.x},y${b.end.y},${b.end.z}) onWater=${b.endWater} netdx=${f2(b.end.x - b.start[0])}m`);
}

console.log('  (b) peninsula pier (rect x200..216, z-120.5..-89.5)');
// ROUTE BESIDE THE CENTRELINE FURNITURE (065 law): the pier's z=-105 centreline
// carries the lamp (LAMPS.extra 205,-105), the parkcharm pier sign, the nature
// rod rack (208,-105) and the WAX TRAX plaque (209,-104) — a bot driven straight
// down it walks into a post and logs a false "walkability" stall. The deck is
// 31 m wide (z -120.5..-89.5); lane z=-111 is clear plank.
console.log(`        [diag] colliders within 4 m of the pier centreline (205,-105): ${(await collidersNear(205, -105, 4)).join(' · ') || 'none'}`);
console.log(`        [diag] colliders within 4 m of the walked lane   (205,-111): ${(await collidersNear(205, -111, 4)).join(' · ') || 'none'}`);
await load(198, -111);
const r5b = await drive('5b peninsula pier: land -> tip (EAST held)',
  { dirX: 1, dirZ: 0, targetZ: -111, maxSec: 12, stopXge: 215.5 }, 216);
console.log(`        trace: ${traceStr(r5b.trace)}`);
expect('5b1 reaches the peninsula pier tip (x >= 215) with y never below -0.5',
  r5b.maxX >= 215 && r5b.minY >= -0.5,
  `maxX=${r5b.maxX} minY=${f3(r5b.minY)} at (x${r5b.minYAt ? r5b.minYAt.x : '?'},z${r5b.minYAt ? r5b.minYAt.z : '?'}) · end=(${r5b.end.x},y${r5b.end.y},${r5b.end.z}) stop=${r5b.stop} gameTime=${r5b.gt}s`);
const r5b2 = await drive('5b peninsula pier: 4 s of EAST at the tip', { dirX: 1, dirZ: 0, targetZ: -111, maxSec: 4 }, 216);
expect('5b2 4 s more of EAST leaves him ON the pier, not in the water',
  r5b2.endWater === false && r5b2.end.y >= 0,
  `end=(${r5b2.end.x},y${r5b2.end.y},${r5b2.end.z}) onWater=${r5b2.endWater} minY=${f3(r5b2.minY)} · probe walk=${r5b2.endProbe.walk} water=${r5b2.endProbe.water} surfaceY=${f2(r5b2.endProbe.y)}`);

// =====================================================================
// 6 — NEVER FROZEN: every stall episode, classified
// =====================================================================
console.log('\n--- 6. NEVER FROZEN: every stall episode across every walk above ---');
const LONG = 1.5;   // s of input held with < 0.10 m of movement
let unexplained = 0, edgeStops = 0, listed = 0;
for (const d of allDrives) {
  for (const s of d.stalls) {
    listed++;
    const atEdge = d.edgeAt !== null && d.edgeAt !== undefined && Math.abs(s.x - d.edgeAt) <= 1.2;
    const inWaterAtDeck = /3b/.test(d.label);       // pressed WEST against the deck's east face
    const kind = atEdge ? 'INTENDED deck-edge stop' : inWaterAtDeck ? 'INTENDED (jetski held against the deck face)' : 'UNEXPLAINED';
    if (s.dur > LONG && kind === 'UNEXPLAINED') unexplained++;
    if (kind !== 'UNEXPLAINED') edgeStops++;
    console.log(`        ${s.dur > LONG ? '>1.5s' : ' <1.5s'}  ${String(s.dur).padStart(5)}s at (${s.x},${s.z})  [${d.label}]  -> ${kind}`);
  }
}
if (!listed) console.log('        (no stall episode >= 0.5 s anywhere)');
expect('6   no UNEXPLAINED stall longer than 1.5 s while input was held',
  unexplained === 0,
  `${listed} stall episode(s) >= 0.5 s total; ${edgeStops} are intended edge/deck-face stops; ${unexplained} unexplained > ${LONG}s`);

// ------------------------------------------------------------- close out
await browser.close();
vite.kill();

console.log('\n================ summary ================');
if (!sawCanary) { console.log('CANARY MISSING — wrong server, numbers untrustworthy'); fails++; }
else console.log(`canary [${CANARY}] seen — the numbers came from OUR vite on :${port}`);
if (errors.length) { console.log('CONSOLE/PAGE ERRORS:\n  ' + errors.join('\n  ')); fails++; }
else console.log('no console.error / pageerror');
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.label}`);
console.log(fails ? `128 E2E FAILED (${fails})` : '128 E2E GREEN');
process.exit(fails ? 1 : 0);
