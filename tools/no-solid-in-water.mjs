// =====================================================================
// no-solid-in-water.mjs — THE PERMANENT "nothing solid stands in the lake"
// GATE (task 120; owner playtest 2026-07-24, issues 032 + 036).
//
// Two owner reports were the same class of bug:
//   032  "the L platform columns go into the water" / "you can see water past
//        the right of the bushes" — every viaduct bent, the Belmont platform
//        and the whole Lakeview backdrop stood in the lake, because the map
//        simply had no ground west of the Drive.
//   036  "lots of people just sitting out in the water east of the zoo" — the
//        Millennium cell's park visitors are makeNPC rigs hung off the SCENE
//        root, and Lincoln Park's growth to z 1020 put the player 60 m from
//        them, inside the 145 m NPC cull, so they rendered on the open lake.
//
// This gate covers both, plus the leak class that caused 036, so neither can
// come back. It NEVER mirrors engine geometry (the task-102 law — a probe that
// reimplements the engine measures a fiction): the structural half reads the
// data module directly, and the live half asks the ENGINE through
// `__hd.solidProbe` / `__hd.cellsDbg`.
//
//   CHECK A  structural anchors (node, data-only): every Brown Line bent, the
//            Belmont platform, both Lakeview backdrop fronts and the LSD berm
//            stand on CH.isDryGround.
//   CHECK B  live rigs (browser): every chibi / zooanim rig that is visible on
//            the lakefront stands on ground the engine calls walkable or dry.
//   CHECK C  cell leaks (browser): nothing positioned inside a HARD cell's
//            clamp may hang outside that cell's root — the 036 root cause.
//
// Usage:  node tools/no-solid-in-water.mjs [--quiet]
// Exit 0 clean, 1 on any offender. Spawns its OWN vite (never the foreign
// 5173 — PITFALLS.md) and canary-checks the page before trusting it.
// =====================================================================
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import * as CH from '../src/data/chicago.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const QUIET = process.argv.includes('--quiet');
let fails = 0;
const log = (...a) => { if (!QUIET) console.log(...a); };
function expect(label, ok, detail) {
  if (ok) log('PASS  ' + label);
  else { console.log('FAIL  ' + label + (detail ? '\n      ' + detail : '')); fails++; }
}

// ---------------------------------------------------------------- CHECK A
log('--- A: structural anchors stand on dry ground (issue 032) ---');
{
  const bents = CH.lTrackBents();
  const wet = bents.filter(([x, z]) => !CH.isDryGround(x, z));
  expect(`all ${bents.length} Brown Line viaduct bents on dry ground`, wet.length === 0,
    wet.slice(0, 6).map(p => `(${p[0]},${p[1]})`).join(' '));

  // the Belmont platform stub: deck corners + canopy posts
  const P = CH.L_TRACK.platform, px = CH.L_TRACK.x + P.dx, pwet = [];
  for (const dx of [-1.7, 0, 1.7]) for (const dz of [-P.len / 2, 0, P.len / 2])
    if (!CH.isDryGround(px + dx, P.z + dz)) pwet.push([px + dx, P.z + dz]);
  expect('Belmont platform deck + canopy posts on dry ground', pwet.length === 0,
    pwet.slice(0, 6).map(p => `(${p[0].toFixed(1)},${p[1]})`).join(' '));

  // the Lakeview backdrop: front line AND the deepest block face (depth max),
  // sampled along each span. Blocks extend WEST from the front.
  const B = CH.LAKEVIEW_BAND, dMax = B.depth[1], bad = [];
  const spans = [[B.front, B.zr], [B.front, B.zrN], [B.frontS, B.zrS]];
  for (const [fx, zr] of spans) {
    if (!zr) continue;
    for (let z = zr[0]; z <= zr[1]; z += 20)
      for (const x of [fx, fx - dMax]) if (!CH.isDryGround(x, z)) bad.push([x, z]);
  }
  if (B.southRow) {   // the 120 south city edge marches along X, bodies extending SOUTH
    const S = B.southRow;
    for (let x = S.x0; x <= S.x1; x += 20)
      for (const z of [S.z, S.z + dMax]) if (!CH.isDryGround(x, z)) bad.push([x, z]);
  }
  expect('every Lakeview backdrop block footprint on dry ground', bad.length === 0,
    bad.slice(0, 6).map(p => `(${p[0]},${p[1]})`).join(' '));

  // the Drive's own embankment, end to end
  const Bm = CH.LSD.berm, bbad = [];
  for (let z = Bm.z0; z <= Bm.z1; z += 25)
    for (const x of [Bm.x0 + 0.5, (Bm.x0 + Bm.x1) / 2, Bm.x1 - 0.5])
      if (!CH.isDryGround(x, z)) bbad.push([x, z]);
  expect('the LSD berm is dry ground end to end', bbad.length === 0,
    bbad.slice(0, 6).join(' '));

  // and the guard's own premise: the west grade must never CAP a park water
  // body (the 041 grade-carpet law) — a green lid over the lagoon or South Pond
  // would read exactly as badly as water under the L.
  const capped = [];
  for (const poly of [CH.LP_DIVERSEY_WATER, CH.LP_SOUTHPOND_WATER])
    for (const [x, z] of poly) if (CH.onWestGrade(x, z)) capped.push([x, z]);
  expect('the west grade never caps a park water body', capped.length === 0,
    capped.slice(0, 6).map(p => `(${p[0]},${p[1]})`).join(' '));
}

// ------------------------------------------------------- CHECK B + C (live)
log('\n--- B/C: live scene (own vite) ---');
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

const browser = await puppeteer.launch({ headless: 'new', args: ['--mute-audio'] });
try {
  const page = await browser.newPage();
  const errors = [], canary = [];
  page.on('console', m => { const t = m.text(); if (t.startsWith('[canary]')) canary.push(t); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${port}/?play=1&quiet=1&canary=nosolid`,
    { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3500));
  expect('canary echoed (we are looking at OUR build)', canary.some(c => c.includes('nosolid')), canary.join('|'));
  expect('no page errors', errors.length === 0, errors.join(' | '));

  const report = await page.evaluate(() => {
    const S = window.__hd.scene, T = window.__hd.THREE;
    S.updateMatrixWorld(true);
    const cells = window.__hd.cellsDbg();
    const hard = cells.filter(c => c.clamp);
    const v = new T.Vector3();
    const cellOf = o => { for (let p = o; p; p = p.parent) if (p.name && p.name.startsWith('cell-')) return p.name.slice(5); return null; };
    // DELIBERATELY afloat: a rig (or an ancestor rig) tagged userData.overWater —
    // the watertoys tubers in their inner tubes and the paddleboarder. The flag
    // makes the exception explicit in the source rather than leaving an
    // unexplained hole in the gate.
    const afloat = o => { for (let p = o; p; p = p.parent) if (p.userData && p.userData.overWater) return true; return false; };
    const rigs = [], leaks = [], allowed = [];
    S.traverse(o => {
      v.setFromMatrixPosition(o.matrixWorld);
      const home = cellOf(o);
      if (o.name === 'chibi' || o.name === 'zooanim') {
        // only rigs that can actually be SEEN on the lakefront
        if (home === null || home === 'lakefront') {
          const p = window.__hd.solidProbe(v.x, v.z);
          if (!p.walk && !p.dry) {
            if (afloat(o)) allowed.push([+v.x.toFixed(1), +v.z.toFixed(1)]);
            // provenance: a rig standing in the lake is otherwise an anonymous
            // 'chibi' among ~30 packs. Packs that pose their own rigs stamp
            // userData.src (parklife does, with the seed) — the 120 pier-slip
            // reader took one run to find because of it.
            else rigs.push([(o.userData && o.userData.src) || o.name, +v.x.toFixed(1), +v.z.toFixed(1)]);
          }
        }
      }
      // CHECK C — the 036 ROOT CAUSE. Pack content is added with a bare
      // scene.add(), which cells.js assumed was safe because every hard cell sat
      // 300+ m from walkable ground. Lincoln Park's growth broke that: Millennium's
      // park visitors are DIRECT children of the scene sitting at z 700-1000, i.e.
      // right where the lakefront player now sees open lake. Report only TOPMOST
      // offenders (direct scene children with no cell ancestor) so one leaking
      // group doesn't spam a line per limb. World-spanning meshes anchored at the
      // origin self-exclude — the origin is in no hard clamp.
      if (o.parent !== S || home !== null) return;
      for (const c of hard) {
        const cl = c.clamp;
        if (v.x >= cl.xMin && v.x <= cl.xMax && v.z >= cl.zMin && v.z <= cl.zMax) {
          leaks.push([o.name || o.type, c.id, +v.x.toFixed(1), +v.z.toFixed(1)]);
          break;
        }
      }
    });
    return { rigs, leaks, allowed, cells: cells.map(c => c.id) };
  });

  log('cells: ' + report.cells.join(', '));
  log(`deliberately afloat (userData.overWater, allowlisted): ${report.allowed.length}`);
  expect(`no NPC/animal rig stands in the water (${report.rigs.length} offenders)`,
    report.rigs.length === 0,
    report.rigs.slice(0, 12).map(r => `${r[0]} (${r[1]},${r[2]})`).join('  '));
  expect(`no pack content leaks out of its hard cell (${report.leaks.length} offenders)`,
    report.leaks.length === 0,
    report.leaks.slice(0, 12).map(r => `"${r[0]}" sits inside cell ${r[1]} @(${r[2]},${r[3]}) but hangs off the scene root`).join('\n      '));
} finally {
  await browser.close();
  kill();
}

console.log(fails ? `\nno-solid-in-water: ${fails} FAIL` : '\nno-solid-in-water: clean');
process.exit(fails ? 1 : 0);
