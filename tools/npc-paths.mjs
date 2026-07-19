// npc-paths.mjs — LIVE NPC path-discipline probe (task 101, acceptance gate).
// The Lakefront Trail is a DUAL ribbon: asphalt bike path (mainCurve) +
// crushed-limestone walking path (offset one grass-strip). The owner:
// "NPCs mix up the walking path and biking path." traillife.js now glues
// pedestrians (joggers, dog-walkers) to the WALK ribbon and cyclists to the
// BIKE ribbon; this probe proves it in the running game:
//
//   * loads the page on its OWN vite (never the foreign :5173 — PITFALLS),
//     canary-checked;
//   * reads the DRAWN lane polylines from __hd.trailLanes() (the real ribbons
//     paths.js built — no node-side curve mirror to drift);
//   * samples __hd.trail() every --interval ms for --secs seconds and asserts:
//       - every WALKER sample sits on the walk lane (within half-width + slop)
//         AND never on the bike lane (beyond half-width + margin);
//       - every CYCLIST sample sits on the bike lane AND never on the walk lane;
//       - the two lanes themselves keep their separation envelope (a future
//         trail reroute that pinches them would make discipline impossible);
//       - the mover cast is complete (8 pedestrians + 2 cyclists — a traillife
//         onWorldReady throw would surface here, not as silent green).
//
// Exit 0 = discipline holds. Exit 1 = any violation (details dumped).
// Runs in the standard gate via autopilot/hooks/gate.mjs (check 1b).
//
// Usage: node tools/npc-paths.mjs [--secs 12] [--interval 250]
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import * as CH from '../src/data/chicago.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const argV = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] : d; };
const SECS = argV('--secs', 12), INTERVAL = argV('--interval', 250);

const WALK_HALF = CH.TRAIL_STYLE.walk.width / 2;   // 1.2 m
const BIKE_HALF = CH.TRAIL_STYLE.bike.width / 2;   // 1.6 m
const SLOP = 0.35;      // table-vs-ribbon interpolation + body radius
const MARGIN = 0.25;    // "off the other path" margin beyond its half-width

/* ------------------------- geometry helpers ------------------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function ptSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9;
  let t = ((px - ax) * dx + (pz - az) * dz) / L2; t = clamp(t, 0, 1);
  const cx = ax + dx * t, cz = az + dz * t; return Math.hypot(px - cx, pz - cz);
}
function minToPoly(px, pz, pts) {
  let b = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = ptSeg(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (d < b) b = d;
  }
  return b;
}
function minSep(a, b) { let m = 1e9; for (const p of a) { const d = minToPoly(p[0], p[1], b); if (d < m) m = d; } return m; }

/* ----------------------------- own vite ----------------------------- */
async function spawnVite() {
  const vite = spawn(process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: ROOT });
  const port = await new Promise((res, rej) => {
    let buf = '';
    const to = setTimeout(() => rej(new Error('vite did not report a port in 30s')), 30000);
    vite.stdout.on('data', d => {
      buf += d.toString();
      const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/);
      if (m) { clearTimeout(to); res(+m[1]); }
    });
    vite.stderr.on('data', d => { buf += d.toString(); });
    vite.on('exit', c => rej(new Error('vite exited early (' + c + ')')));
  });
  const kill = () => { try { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill(); } catch { } };
  process.on('SIGTERM', kill); process.on('SIGINT', kill);
  return { port, kill };
}

/* ------------------------------ main -------------------------------- */
const failures = [];
let browser = null, killVite = null;
try {
  const { port, kill } = await spawnVite(); killVite = kill;
  const puppeteer = (await import('puppeteer')).default;
  browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const canary = 'npcpaths-' + Math.random().toString(36).slice(2, 8);
  const canaryHits = [], pageErrors = [];
  const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');   // shot.mjs convention
  page.on('console', m => { const t = m.text(); if (t.startsWith('[canary]')) canaryHits.push(t); if (m.type() === 'error' && !isNoise(t)) pageErrors.push('[console.error] ' + t); });
  page.on('pageerror', e => pageErrors.push('[pageerror] ' + e.message));
  page.on('response', r => { if (r.status() >= 400 && !r.url().includes('favicon')) pageErrors.push('[http ' + r.status() + '] ' + r.url()); });
  await page.goto(`http://localhost:${port}/?play=1&quiet=1&canary=${canary}`, { waitUntil: 'networkidle0', timeout: 120000 });
  if (!canaryHits.some(c => c.includes(canary))) failures.push('canary not echoed on port ' + port + ' — wrong server or dead build');
  await page.waitForFunction(
    () => window.__hd && typeof window.__hd.trail === 'function' && typeof window.__hd.trailLanes === 'function'
      && window.__hd.trailLanes().walk && window.__hd.trailLanes().walk.length > 100,
    { timeout: 90000 });

  // ---- lane truth: the DRAWN ribbons, straight from the engine ----
  const lanes = await page.evaluate(() => window.__hd.trailLanes());
  const sep = minSep(lanes.walk, lanes.bike);
  const sepOk = sep >= 3.5;
  console.log(`lanes: walk ${lanes.walk.length} pts, bike ${lanes.bike.length} pts, min separation ${sep.toFixed(2)} m`);
  if (!sepOk) failures.push(`walk/bike lane separation ${sep.toFixed(2)} < 3.5 — a trail reroute pinched the dual path; discipline tolerances cannot hold`);

  // ---- live sampling over N seconds ----
  const samples = Math.max(4, Math.round((SECS * 1000) / INTERVAL));
  let nW = 0, nC = 0;
  let wOnMin = 1e9, wOnMax = 0, cOnMin = 1e9, cOnMax = 0;   // distance to OWN path
  let wOffMin = 1e9, cOffMin = 1e9;                          // distance to OTHER path
  const viol = [];
  let cast0 = null;
  for (let i = 0; i < samples; i++) {
    const s = await page.evaluate(() => window.__hd.trail());
    if (!cast0) cast0 = { walkers: s.walkers.length, cyclists: s.cyclists.length };
    for (const [x, z] of s.walkers) {
      nW++;
      const dWalk = minToPoly(x, z, lanes.walk), dBike = minToPoly(x, z, lanes.bike);
      if (dWalk < wOnMin) wOnMin = dWalk; if (dWalk > wOnMax) wOnMax = dWalk;
      if (dBike < wOffMin) wOffMin = dBike;
      if (dWalk > WALK_HALF + SLOP) viol.push(`walker OFF walk path: (${x},${z}) dWalk=${dWalk.toFixed(2)} > ${(WALK_HALF + SLOP).toFixed(2)}`);
      if (dBike <= BIKE_HALF + MARGIN) viol.push(`walker ON bike path: (${x},${z}) dBike=${dBike.toFixed(2)} <= ${(BIKE_HALF + MARGIN).toFixed(2)}`);
    }
    for (const [x, z] of s.cyclists) {
      nC++;
      const dBike = minToPoly(x, z, lanes.bike), dWalk = minToPoly(x, z, lanes.walk);
      if (dBike < cOnMin) cOnMin = dBike; if (dBike > cOnMax) cOnMax = dBike;
      if (dWalk < cOffMin) cOffMin = dWalk;
      if (dBike > BIKE_HALF + SLOP) viol.push(`cyclist OFF bike path: (${x},${z}) dBike=${dBike.toFixed(2)} > ${(BIKE_HALF + SLOP).toFixed(2)}`);
      if (dWalk <= WALK_HALF + MARGIN) viol.push(`cyclist ON walk path: (${x},${z}) dWalk=${dWalk.toFixed(2)} <= ${(WALK_HALF + MARGIN).toFixed(2)}`);
    }
    if (i < samples - 1) await new Promise(r => setTimeout(r, INTERVAL));
  }

  // ---- cast completeness (8 pedestrians + 2 cyclists) ----
  if (!cast0 || cast0.walkers !== 8 || cast0.cyclists !== 2)
    failures.push('mover cast wrong: ' + JSON.stringify(cast0) + ' (want {walkers:8,cyclists:2}) — traillife onWorldReady may have thrown');

  console.log(`sampled ${samples} ticks over ~${SECS}s: ${nW} walker positions, ${nC} cyclist positions`);
  console.log(`walkers: own-path dist ${wOnMin.toFixed(2)}..${wOnMax.toFixed(2)} (limit ${(WALK_HALF + SLOP).toFixed(2)}), nearest to bike path ${wOffMin.toFixed(2)} (must exceed ${(BIKE_HALF + MARGIN).toFixed(2)})`);
  console.log(`cyclists: own-path dist ${cOnMin.toFixed(2)}..${cOnMax.toFixed(2)} (limit ${(BIKE_HALF + SLOP).toFixed(2)}), nearest to walk path ${cOffMin.toFixed(2)} (must exceed ${(WALK_HALF + MARGIN).toFixed(2)})`);
  if (pageErrors.length) failures.push('page errors during probe:\n  ' + pageErrors.slice(0, 5).join('\n  '));
  if (viol.length) failures.push(viol.length + ' path-discipline violation(s):\n  ' + viol.slice(0, 10).join('\n  '));
} catch (e) {
  failures.push('probe errored: ' + (e && e.message ? e.message : e));
} finally {
  if (browser) await browser.close().catch(() => { });
  if (killVite) killVite();
}

if (failures.length) {
  console.error('\n[npc-paths] FAIL — ' + failures.length + ' problem(s):');
  failures.forEach((f, i) => console.error((i + 1) + '. ' + f));
  process.exit(1);
}
console.log('\n[npc-paths] PASS — pedestrians glued to the walk path, cyclists to the bike path');
process.exit(0);
