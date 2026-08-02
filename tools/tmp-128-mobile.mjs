// =====================================================================
// tmp-128-mobile.mjs — task 128 / issue 040, THE TOUCH BUILD.
//
// tmp-128-e2e.mjs proved the fixed Montrose finger dock on DESKTOP by writing
// __hd.input.joy directly. CLAUDE.md rule 7 says desktop AND mobile both work,
// so this file re-proves the same walk with NOTHING but the on-screen joystick:
// a real page.touchscreen gesture on #jzone, held deflected across frames, on a
// 390x844 hasTouch viewport where body.touch is on and the HUD stick renders.
//
// What it proves
//   0  the touch HUD is actually live and the stick is actually reachable
//      (body.touch, #jzone visible, elementFromPoint at the thumb spot == the
//      joystick zone, joy.len ramps to full deflection under the held drag)
//   1  lawn x180,z-754 -> the stick alone walks him EAST to the dock tip
//      (x >= 200) and his y NEVER drops below -0.5 (issue 040's fall)
//   2  3 more seconds of held stick at the tip leaves him ON the planks
//      (y >= 0, gstate.onWater === false, |x - 201| <= 0.8)
//   3  two portrait screenshots for the orchestrator to read
//   4  draw calls at both shots against the 480 budget
//
// Driving notes (the established touch pattern — tools/act.mjs `drag`):
//   * The joystick is a FLOATING stick: input.js sets jOrigin at touchstart to
//     wherever the thumb lands inside #jzone, so the "centre" is read from the
//     DOM (#jghost, the idle stick ghost that shows the player where to put the
//     thumb — pointer-events:none, inside #jzone) and confirmed with
//     document.elementFromPoint. Nothing is guessed.
//   * A tap is swallowed between frames (PITFALLS: the rising-edge latch), so
//     the gesture is touchStart -> touchMove out to 60 px (JOY_R is 48, so that
//     is full deflection, c == 1) -> HELD, re-aimed every ~90 ms, -> touchEnd.
//   * WHICH WAY IS EAST: both belts. The URL sets &yaw=1.5708, which makes
//     straight-UP on the stick due east at t0 (main.js: F=(sin yaw,cos yaw)),
//     AND every re-aim recomputes the deflection from the LIVE __hd.input.cam
//     .yaw — main.js's chase cam auto-follows the walk heading (line 487), so a
//     thumb frozen at 12 o'clock would drift with it. A real thumb corrects;
//     this one corrects at 11 Hz.
//
// Spawns its OWN strict-port vite (NEVER 5173 — PITFALLS: a foreign app may own
// it) and canary-checks the page before trusting a single number.
//
// Usage:  node tools/tmp-128-mobile.mjs [port]
// Exit 0 = every assertion passed, 1 = at least one failed.
// =====================================================================
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const port = +(process.argv[2] || 5251);
const CANARY = 't128m';
const SHOTS = join(here, 'shots');
mkdirSync(SHOTS, { recursive: true });

const VW = 390, VH = 844;      // portrait phone, CSS px
const DEFL = 60;               // px of stick throw — JOY_R is 48, so this is full tilt
const REAIM_MS = 90;           // thumb correction cadence
const P1_MS = 6000;            // proof 1: hold EAST ~6 s
const P2_MS = 3000;            // proof 2: ~3 s more at the tip
const TARGET_Z = -754;         // the middle finger dock row
const TIP_X = 201;             // CH.MT_FINGER_DOCKS: x0 183.4 + len 17.6

let fails = 0;
const results = [];
function expect(label, ok, detail) {
  results.push({ label, ok });
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '\n        ' + detail : ''}`);
}
const f2 = n => (n === null || n === undefined ? 'n/a' : (+n).toFixed(2));
const f3 = n => (n === null || n === undefined ? 'n/a' : (+n).toFixed(3));
const sleep = ms => new Promise(r => setTimeout(r, ms));

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

// ------------------------------------------------------------- browser
const browser = await puppeteer.launch({
  headless: 'new',
  args: [`--window-size=${VW},${VH}`, '--mute-audio']
});
const page = await browser.newPage();
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

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

// --------------------------------------------------- the in-page probe
// Pure OBSERVER: it never writes joy (the touchscreen does that through the real
// input path). Per-frame log so a sub-100 ms dip into the basin cannot hide
// between node's polls.
function installProbe() {
  window.__m128 = { rows: [], marks: [], run: false, gt: 0 };
  window.__m128start = function () {
    const hd = window.__hd, P = hd.player, S = window.__m128;
    S.rows.length = 0; S.marks.length = 0; S.run = true; S.gt = 0;
    let last = performance.now(), gt = 0;
    const step = () => {
      if (!S.run) return;
      const now = performance.now();
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; gt += dt;
      S.gt = gt;
      const j = hd.input.joy;
      // [ gt, x, y, z, onWater, joy.len, cam.yaw ]
      S.rows.push([+gt.toFixed(3), +P.x.toFixed(3), +P.y.toFixed(3), +P.z.toFixed(3),
        (hd.gstate && hd.gstate.onWater) ? 1 : 0, +(j.len || 0).toFixed(3), +hd.input.cam.yaw.toFixed(4)]);
      if (S.rows.length > 8000) { S.run = false; return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  window.__m128mark = n => { const S = window.__m128; S.marks.push([n, +S.gt.toFixed(3), S.rows.length]); return S.marks[S.marks.length - 1]; };
  window.__m128stop = () => { const S = window.__m128; S.run = false; return { rows: S.rows, marks: S.marks }; };
  window.__m128peek = () => {
    const hd = window.__hd, P = hd.player, j = hd.input.joy;
    return {
      x: P.x, y: P.y, z: P.z, yaw: hd.input.cam.yaw,
      onWater: !!(hd.gstate && hd.gstate.onWater),
      joy: { x: +j.x.toFixed(3), z: +j.z.toFixed(3), len: +j.len.toFixed(3), id: j.id },
      probe: hd.solidProbe(P.x, P.z)
    };
  };
}

// ------------------------------------------------------------- helpers
async function load(extraQuery) {
  const url = `http://localhost:${port}/?play=1&coach=0&canary=${CANARY}&${extraQuery}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  // title card: tap #start with a REAL touch if it is still up (play=1 normally
  // starts for us; this is the belt).
  const startRect = await page.evaluate(() => {
    const t = document.getElementById('title');
    if (!t || t.classList.contains('hide')) return null;
    const s = document.getElementById('start'); if (!s) return null;
    const b = s.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  });
  if (startRect) {
    await page.touchscreen.touchStart(startRect.x, startRect.y);
    await sleep(160);
    await page.touchscreen.touchEnd();
    console.log(`  [load] title was up -> tapped #start @${startRect.x.toFixed(0)},${startRect.y.toFixed(0)}`);
  }
  await sleep(1200);
  await page.evaluate(installProbe);
  const st = await page.evaluate(() => window.__m128peek());
  console.log(`  [load] ${url}`);
  console.log(`  [load] player(${f2(st.x)},${f3(st.y)},${f2(st.z)})  walk=${st.probe.walk} water=${st.probe.water} surfaceY=${f2(st.probe.y)}  camYaw=${f3(st.yaw)}`);
  return st;
}

// Read the touch HUD out of the DOM — never guess a coordinate.
async function hudProbe() {
  return page.evaluate(() => {
    const r = id => {
      const el = document.getElementById(id); if (!el) return null;
      const b = el.getBoundingClientRect(), cs = getComputedStyle(el);
      return {
        id, x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1),
        cx: +(b.x + b.width / 2).toFixed(1), cy: +(b.y + b.height / 2).toFixed(1),
        display: cs.display, vis: cs.visibility, z: cs.zIndex, pe: cs.pointerEvents
      };
    };
    return {
      touchClass: document.body.classList.contains('touch'),
      maxTouchPoints: navigator.maxTouchPoints,
      vw: innerWidth, vh: innerHeight,
      jzone: r('jzone'), jghost: r('jghost'), stick: r('stick'), nub: r('nub'),
      prompt: r('prompt'), hint: r('hint'), btnJump: r('btnJump'),
      promptText: (document.getElementById('prompt') || {}).textContent || ''
    };
  });
}
// Topmost element at a viewport point — the 077 law: any tappable HUD element
// stacked over the stick beats it in the hit test.
async function topAt(x, y) {
  return page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    let inJzone = false, p = el;
    while (p) { if (p.id === 'jzone') { inJzone = true; break; } p = p.parentElement; }
    return { id: el.id || '', tag: el.tagName, cls: el.className || '', inJzone };
  }, { x, y });
}

// Aim the held thumb so the WORLD push is (dirX, toward targetZ), given the LIVE
// camera yaw. Mirrors main.js exactly:
//   F=(sin yaw, cos yaw)  R=(-cos yaw, sin yaw)  inF=-joy.z  inR=+joy.x
async function reaim(yaw, px, pz, dirX, targetZ, origin) {
  let dx = dirX;
  let dz = Math.max(-0.6, Math.min(0.6, (targetZ - pz) * 0.5));
  const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  const Fx = Math.sin(yaw), Fz = Math.cos(yaw), Rx = -Math.cos(yaw), Rz = Math.sin(yaw);
  const inF = dx * Fx + dz * Fz, inR = dx * Rx + dz * Rz;
  const ux = inR, uy = -inF;                       // screen: +x right, +y DOWN
  await page.touchscreen.touchMove(origin.x + ux * DEFL, origin.y + uy * DEFL);
  return { ux: +ux.toFixed(3), uy: +uy.toFixed(3) };
}

// Hold the stick for ms of REAL time, re-aiming every REAIM_MS.
async function holdEast(ms, origin, label) {
  const t0 = Date.now();
  let n = 0, lastAim = null, lastPeek = null;
  while (Date.now() - t0 < ms) {
    const s = await page.evaluate(() => window.__m128peek());
    lastPeek = s;
    lastAim = await reaim(s.yaw, s.x, s.z, 1, TARGET_Z, origin);
    n++;
    await sleep(REAIM_MS);
  }
  console.log(`        [${label}] ${n} thumb re-aims over ${((Date.now() - t0) / 1000).toFixed(1)} s real · last deflection (${lastAim.ux},${lastAim.uy})·${DEFL}px from origin (${origin.x},${origin.y})`
    + ` · live joy=${JSON.stringify(lastPeek.joy)} camYaw=${f3(lastPeek.yaw)}`);
  return lastPeek;
}

// ---- row analysis (rows: [gt,x,y,z,onWater,joyLen,yaw])
const slice = (rows, gt0, gt1) => rows.filter(r => r[0] >= gt0 && r[0] <= gt1);
function stats(rows) {
  if (!rows.length) return null;
  const o = { n: rows.length, t0: rows[0][0], t1: rows[rows.length - 1][0], minY: 1e9, minYAt: null, maxY: -1e9, minX: 1e9, maxX: -1e9, maxJoy: 0, water: 0, yawMin: 1e9, yawMax: -1e9 };
  for (const r of rows) {
    if (r[2] < o.minY) { o.minY = r[2]; o.minYAt = r; }
    if (r[2] > o.maxY) o.maxY = r[2];
    if (r[1] < o.minX) o.minX = r[1];
    if (r[1] > o.maxX) o.maxX = r[1];
    if (r[5] > o.maxJoy) o.maxJoy = r[5];
    if (r[4]) o.water++;
    if (r[6] < o.yawMin) o.yawMin = r[6];
    if (r[6] > o.yawMax) o.yawMax = r[6];
  }
  o.end = rows[rows.length - 1];
  return o;
}
function traceStr(rows, every = 0.5) {
  const out = []; let next = 0;
  for (const r of rows) {
    if (r[0] >= next) { out.push(`t${r[0].toFixed(1)}(x${r[1].toFixed(2)},y${r[2].toFixed(2)},z${r[3].toFixed(1)})${r[4] ? 'W' : ''}j${r[5].toFixed(2)}`); next = r[0] + every; }
  }
  if (rows.length) { const r = rows[rows.length - 1]; out.push(`t${r[0].toFixed(1)}(x${r[1].toFixed(2)},y${r[2].toFixed(2)},z${r[3].toFixed(1)})${r[4] ? 'W' : ''}j${r[5].toFixed(2)}`); }
  const lines = [];
  for (let i = 0; i < out.length; i += 5) lines.push('        ' + out.slice(i, i + 5).join('  '));
  return lines.join('\n');
}

// ---- screenshot + sanity (not an art judgement — just "not blank/black/errored")
async function shoot(name) {
  const file = join(SHOTS, name + '.png');
  await page.screenshot({ path: file });
  const overlay = await page.evaluate(() => ({
    viteOverlay: !!document.querySelector('vite-error-overlay'),
    errs: (window.__hd && window.__hd.errs) ? window.__hd.errs.slice(-3) : [],
    draws: (window.__hd && window.__hd.perf) ? window.__hd.perf().drawCalls : null,
    fps: (window.__hd && window.__hd.perf) ? window.__hd.perf().fps : null,
    jzoneVisible: (() => { const e = document.getElementById('jzone'); return !!e && getComputedStyle(e).display !== 'none'; })(),
    stickVisible: (() => { const e = document.getElementById('stick'); return !!e && getComputedStyle(e).display !== 'none'; })()
  }));
  const md = await sharp(file).metadata();
  const st = await sharp(file).stats();
  const mean = st.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3;
  const sd = Math.max(...st.channels.slice(0, 3).map(c => c.stdev));
  return { file, name, w: md.width, h: md.height, mean: +mean.toFixed(1), sd: +sd.toFixed(1), ...overlay };
}
function reportShot(s) {
  console.log(`        SHOT ${s.file}`);
  console.log(`             ${s.w}x${s.h} device px (= ${s.w / 2}x${s.h / 2} CSS, dsf 2) · mean luma ${s.mean} · max stdev ${s.sd}`
    + ` · drawCalls ${s.draws} · fps ${s.fps} (advisory: SwiftShader)`);
  console.log(`             #jzone visible=${s.jzoneVisible}  #stick visible=${s.stickVisible}  vite-error-overlay=${s.viteOverlay}  __hd.errs=${s.errs.length ? JSON.stringify(s.errs) : 'none'}`);
}

console.log('\n============ 128 / issue 040 — THE TOUCH BUILD (on-screen joystick) ============\n');

// =====================================================================
// 0 — the touch HUD is live and the stick is reachable
// =====================================================================
console.log('--- 0. TOUCH HUD: body.touch, the joystick zone, and where the thumb goes ---');
await load(`x=180&z=${TARGET_Z}&yaw=1.5708`);
const hud = await hudProbe();
console.log(`        viewport ${hud.vw}x${hud.vh} CSS · body.touch=${hud.touchClass} · navigator.maxTouchPoints=${hud.maxTouchPoints}`);
for (const k of ['jzone', 'jghost', 'stick', 'prompt', 'hint', 'btnJump']) {
  const r = hud[k];
  console.log(`        #${k.padEnd(8)} ${r ? `x${r.x} y${r.y} ${r.w}x${r.h}  centre(${r.cx},${r.cy})  display=${r.display} z=${r.z} pointer-events=${r.pe}` : 'MISSING'}`);
}
if (hud.promptText) console.log(`        #prompt text: "${hud.promptText.trim()}"`);

// the thumb spot: #jghost is the idle stick ghost — it is literally the HUD's
// own "put your thumb here" marker, pointer-events:none, inside #jzone.
const jz = hud.jzone;
let origin = (hud.jghost && hud.jghost.display !== 'none')
  ? { x: hud.jghost.cx, y: hud.jghost.cy, from: '#jghost centre (the idle stick ghost)' }
  : { x: jz.cx, y: jz.cy, from: '#jzone centre' };
let top = await topAt(origin.x, origin.y);
if (!top || !top.inJzone) {
  // something is stacked over the ghost — scan #jzone for a clear thumb spot
  // rather than tapping through a pill (the 077 arbitration law).
  const cands = [];
  for (let fy = 0.75; fy <= 0.92; fy += 0.06)
    for (let fx = 0.25; fx <= 0.75; fx += 0.12)
      cands.push({ x: +(jz.x + jz.w * fx).toFixed(1), y: +(jz.y + jz.h * fy).toFixed(1) });
  for (const c of cands) {
    const t = await topAt(c.x, c.y);
    if (t && t.inJzone) { origin = { ...c, from: 'scanned #jzone point (ghost was covered)' }; top = t; break; }
  }
}
console.log(`        thumb spot (${origin.x},${origin.y}) from ${origin.from} · elementFromPoint -> <${top ? top.tag : '?'} id="${top ? top.id : ''}"> inJzone=${top ? top.inJzone : false}`);
expect('0a  body.touch is ON and #jzone renders (the HUD joystick exists at all)',
  hud.touchClass === true && !!jz && jz.display !== 'none' && jz.w > 0,
  `body.touch=${hud.touchClass} · #jzone display=${jz ? jz.display : 'MISSING'} rect=${jz ? `x${jz.x} y${jz.y} ${jz.w}x${jz.h}` : 'n/a'} z-index=${jz ? jz.z : 'n/a'} · viewport ${hud.vw}x${hud.vh}`);
expect('0b  the thumb spot hit-tests to the joystick zone (nothing stacked over it)',
  !!top && top.inJzone === true,
  `elementFromPoint(${origin.x},${origin.y}) = <${top ? top.tag : '?'} id="${top ? top.id : ''}" class="${top ? top.cls : ''}"> inJzone=${top ? top.inJzone : false}`);

// =====================================================================
// 1 — WALK THE DOCK WITH THE STICK
// =====================================================================
console.log(`\n--- 1. THE OWNER'S ACTION ON TOUCH: lawn x180,z${TARGET_Z} -> stick EAST for ${P1_MS / 1000} s ---`);
await page.evaluate(() => window.__m128start());
await sleep(250);
await page.evaluate(() => window.__m128mark('pre'));

await page.touchscreen.touchStart(origin.x, origin.y);
await sleep(60);                       // the drag handler needs a start sample to diff
await page.evaluate(() => window.__m128mark('down'));
const p1last = await holdEast(P1_MS, origin, 'phase 1');
const mkP1 = await page.evaluate(() => window.__m128mark('p1end'));

// =====================================================================
// 2 — 3 MORE SECONDS OF HELD STICK AT THE TIP
// =====================================================================
console.log(`\n--- 2. THE TIP STOPS HIM ON TOUCH TOO: keep the stick held ${P2_MS / 1000} s more ---`);
const p2last = await holdEast(P2_MS, origin, 'phase 2');
const mkP2 = await page.evaluate(() => window.__m128mark('p2end'));
const atTip = await page.evaluate(() => window.__m128peek());

// ------- shot 1: at the tip, STICK STILL HELD (HUD joystick visible)
console.log('\n--- 3a. SCREENSHOT at the dock tip, stick still held ---');
const shot1 = await shoot('tmp128-mob-dockwalk');
reportShot(shot1);

// release
await page.touchscreen.touchEnd();
await sleep(400);
const released = await page.evaluate(() => window.__m128peek());
const log = await page.evaluate(() => window.__m128stop());

// ---- analysis
const rows = log.rows, marks = Object.fromEntries(log.marks.map(m => [m[0], { gt: m[1], i: m[2] }]));
const gtDown = marks.down ? marks.down.gt : 0, gtP1 = marks.p1end ? marks.p1end.gt : 0, gtP2 = marks.p2end ? marks.p2end.gt : 1e9;
const rPre = slice(rows, 0, gtDown), r1 = slice(rows, gtDown, gtP1), r2 = slice(rows, gtP1, gtP2);
const s1 = stats(r1), s2 = stats(r2), sAll = stats(slice(rows, gtDown, gtP2));
console.log(`\n        [probe] ${rows.length} sampled frames · marks ${JSON.stringify(log.marks)}`);
console.log(`        [probe] pre-touch (${rPre.length} frames): x${rPre.length ? rPre[rPre.length - 1][1].toFixed(2) : '?'} joy.len max ${rPre.length ? Math.max(...rPre.map(r => r[5])).toFixed(2) : '?'} (must be 0 — nothing is driving him yet)`);
console.log(`\n        phase-1 trace (stick held EAST):\n${traceStr(r1)}`);
console.log(`\n        phase-2 trace (stick still held at the tip):\n${traceStr(r2, 0.5)}`);

expect('0c  the HELD drag actually deflects the stick (joy.len reaches full tilt)',
  sAll && sAll.maxJoy >= 0.92,
  `max joy.len over the whole gesture = ${sAll ? f2(sAll.maxJoy) : 'n/a'} (JOY_R 48 px, thrown ${DEFL} px -> c clamps to 1)`
  + ` · joy at release-time peek = ${JSON.stringify(atTip.joy)} · pre-touch max = ${rPre.length ? Math.max(...rPre.map(r => r[5])).toFixed(2) : 'n/a'}`);

expect('1a  the STICK ALONE walks him to the dock tip (x >= 200)',
  !!s1 && s1.maxX >= 200,
  `maxX=${f2(s1.maxX)} over ${(s1.t1 - s1.t0).toFixed(1)} s of game time / ${s1.n} frames`
  + ` · start x${f2(r1[0][1])} -> end x${f2(s1.end[1])} (net ${f2(s1.end[1] - r1[0][1])} m)`
  + ` · z held ${f2(Math.min(...r1.map(r => r[3])))}..${f2(Math.max(...r1.map(r => r[3])))} (target ${TARGET_Z})`
  + ` · camYaw ${f3(s1.yawMin)}..${f3(s1.yawMax)}`);

expect('1b  y NEVER drops below -0.5 on the way out (issue 040: "I fall in")',
  !!s1 && s1.minY >= -0.5,
  `minY=${f3(s1.minY)} at (x${f2(s1.minYAt[1])},z${f2(s1.minYAt[3])}) t=${s1.minYAt[0].toFixed(2)}s · maxY=${f3(s1.maxY)}`
  + ` · frames with gstate.onWater during phase 1: ${s1.water}/${s1.n}`
  + `\n        (pre-fix symptom was: stall at x~184.9, then y -> ~-2.3)`);

expect('2a  3 s more of held stick and he is STILL standing on the planks (y >= 0)',
  !!s2 && s2.end[2] >= 0,
  `end y=${f3(s2.end[2])} (deck top h=0.12) · phase-2 minY=${f3(s2.minY)} maxY=${f3(s2.maxY)}`
  + ` · settled +0.4 s after release: y=${f3(released.y)} probe{walk=${released.probe.walk} water=${released.probe.water} surfaceY=${f2(released.probe.y)}}`);

expect('2b  NOT in the water (gstate.onWater === false)',
  atTip.onWater === false && (!s2 || s2.water === 0),
  `onWater at the tip = ${atTip.onWater} · frames with onWater during phase 2: ${s2 ? s2.water : '?'}/${s2 ? s2.n : '?'}`
  + ` · anywhere in the whole gesture: ${sAll ? sAll.water : '?'}/${sAll ? sAll.n : '?'}`);

expect(`2c  final x within 0.8 m of the tip (${TIP_X})`,
  Math.abs(atTip.x - TIP_X) <= 0.8,
  `final x=${f2(atTip.x)} (|dx|=${f2(Math.abs(atTip.x - TIP_X))}) z=${f2(atTip.z)}`
  + ` · probe walk=${atTip.probe.walk} water=${atTip.probe.water} surfaceY=${f2(atTip.probe.y)}`);

expect('3a  the tip shot is a real rendered frame (not blank/black, no error overlay)',
  shot1.mean > 8 && shot1.sd > 5 && !shot1.viteOverlay && shot1.errs.length === 0 && shot1.jzoneVisible,
  `mean luma ${shot1.mean} · max stdev ${shot1.sd} · vite-error-overlay=${shot1.viteOverlay} · __hd.errs=${shot1.errs.length} · #stick visible=${shot1.stickVisible}`);
expect('4a  draw calls at the tip shot are within the 480 budget',
  shot1.draws !== null && shot1.draws <= 480,
  `drawCalls=${shot1.draws} / 480`);

// =====================================================================
// 3b — the deck's ON-GRASS ROOT, looking east down the dock
// =====================================================================
console.log('\n--- 3b. SCREENSHOT at the deck root on the grass (x184.5), looking EAST down the dock ---');
await load(`x=184.5&z=${TARGET_Z}&yaw=1.57&pitch=0.06&dist=7`);
await sleep(1200);
const rootState = await page.evaluate(() => window.__m128peek());
console.log(`        root stand: player(${f2(rootState.x)},${f3(rootState.y)},${f2(rootState.z)}) probe{walk=${rootState.probe.walk} water=${rootState.probe.water} surfaceY=${f2(rootState.probe.y)}}`);
const shot2 = await shoot('tmp128-mob-dockroot');
reportShot(shot2);
expect('3b  the deck-root shot is a real rendered frame (not blank/black, no error overlay)',
  shot2.mean > 8 && shot2.sd > 5 && !shot2.viteOverlay && shot2.errs.length === 0,
  `mean luma ${shot2.mean} · max stdev ${shot2.sd} · vite-error-overlay=${shot2.viteOverlay} · __hd.errs=${shot2.errs.length}`);
expect('4b  draw calls at the deck-root shot are within the 480 budget',
  shot2.draws !== null && shot2.draws <= 480,
  `drawCalls=${shot2.draws} / 480`);

// ------------------------------------------------------------- close out
await browser.close();
vite.kill();

console.log('\n================ summary ================');
console.log(`draw calls: tmp128-mob-dockwalk ${shot1.draws}/480 · tmp128-mob-dockroot ${shot2.draws}/480`);
console.log(`shots: ${shot1.file}`);
console.log(`       ${shot2.file}`);
if (!sawCanary) { console.log('CANARY MISSING — wrong server, numbers untrustworthy'); fails++; }
else console.log(`canary [${CANARY}] seen — the numbers came from OUR vite on :${port}`);
if (errors.length) { console.log('CONSOLE/PAGE ERRORS:\n  ' + errors.join('\n  ')); fails++; }
else console.log('no console.error / pageerror');
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.label}`);
console.log(fails ? `128 MOBILE FAILED (${fails})` : '128 MOBILE GREEN');
process.exit(fails ? 1 : 0);
