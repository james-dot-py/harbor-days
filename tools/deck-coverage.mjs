// =====================================================================
// deck-coverage.mjs — THE PERMANENT "every plank you can see holds you,
// and you can walk onto it from shore" GATE (task 128; owner playtest
// 2026-08-02, issue 040).
//
//   "at the dock approaching montrose harbor I fall in when I try to
//    walk to end."
//
// A Montrose finger dock was RENDERED rooted ~1 m further out over the
// basin than the surface that holds you: MT_FINGER_DOCKS.x0 was 186 (the
// CONTROL POINTS of mtBasinWestLine) while the LAND polygon uses the
// crChain-SMOOTHED line at x 184.8-185.6. A non-walkable moat sat between
// the lawn and the first plank: walking east you stalled, the wade rule
// fired after 0.35 s, and you dropped 2.4 m into the harbor. The deck was
// never reachable on foot at all.
//
// Everything was green while that shipped — walkprobe 1729/0, the task-097
// stuck audit, the anti-trap gate. NOTHING had ever asserted the simplest
// promise a walkable surface makes: IF YOU CAN SEE YOURSELF STANDING ON IT,
// IT HOLDS YOU. This tool makes that promise mechanical, forever.
//
// It never reimplements the engine (the task-102 law — a probe that mirrors
// engine geometry measures a fiction). It raycasts the REAL rendered plank
// meshes (window.__hd.deckMeshes, tagged where each deck is built) and asks
// the ENGINE's own walkable()/surfaceY() about every plank cell through
// window.__hd.solidProbe.
//
// THE TAG CONTRACT — deckMeshes entries are {id, mesh} plus an OPTIONAL {inst}:
//   id    a stable name for the summary table.
//   mesh  the RENDERED walk-surface slab. Slabs only: rails, posts, rims,
//         fascia and aprons are not promises, and a wrongly-tagged one makes
//         the gate lie. An InstancedMesh is gridded PER INSTANCE, so one tag
//         covers all N planks in the bucket (belmont-fingers, diversey-fingers).
//   inst  OPTIONAL instance index. When it is a number and the mesh is an
//         InstancedMesh, ONLY that instance is measured: its box alone seeds
//         the sampling grid, and a ray hit counts only when its `instanceId`
//         matches. Omit it and behaviour is exactly as before (all instances).
//         It exists because a shared bucket can hold BOTH a walkable floor and
//         a decorative slab, and the no-new-InstancedMesh-buckets perf rule
//         (CLAUDE.md constraint 3) forbids splitting them apart — so the
//         distinction has to travel on the tag. The live case is the Diversey
//         bays (structures.js): instance 0 is the ground hitting deck (top y
//         0.4 = B.deckRect.h, walkable) and instance 1 is the decorative upper
//         tier (top y 3.4, deliberately NOT walkable) in ONE 2-instance
//         `deckM`. They share an x/z footprint, so an unfiltered sweep lets the
//         upper slab's rays overwrite every ground cell and CHECK B fails with
//         a ~3.0 m dy against a deck that is perfectly fine. Reach for `inst`
//         only for that shape — a bucket whose instances are ALL walkable stays
//         one untagged-by-instance entry.
//
//   CHECK R  RENDERED — the tagged mesh really is drawn where we measured it
//            (see the detached-mesh note below); the premise of the other three.
//   CHECK A  COVERAGE — every INTERIOR plank cell is walkable. A miss is a
//            plank you can see yourself standing on that does not hold you.
//   CHECK B  HEIGHT   — |solidProbe.y - rendered top face| <= 0.30 m, so you
//            can never step past the surface you are looking at.
//   CHECK C  REACH    — from its own planks, a BFS over walkable ground finds
//            REAL GROUND (a walkable cell with no plank over it, and at least
//            CLEAR m clear of every plank) within 40 m. A deck that holds you
//            but that you cannot walk onto is still a hole in the world — that
//            is literally what issue 040 was.
//
// Plus, as WARN lines that do NOT fail the gate, the reverse direction: cells
// inside a CH.deckRects() rect with NO rendered plank under them (an invisible
// ledge). Two are pre-existing and known — see the WARN note; sweeping them is
// task 130, so they are printed, never silently swallowed.
//
// Notes for whoever edits this next:
//  - "INTERIOR" = the cell AND all four orthogonal neighbours produced a ray
//    hit. That kills edge aliasing at the plank rim so the tool cannot cry
//    wolf at every deck edge; a deck whose interior count is 0 is itself a
//    failure.
//  - The world-curve is a VERTEX SHADER (core.js toon/bmat/curveMat) — the CPU
//    geometry raycasts flat, in true world coords, which is exactly the frame
//    walkable() answers in. Both sides agree by construction.
//  - r128's Raycaster does NOT test object.visible, so fog-culled / LOD-hidden
//    decks still measure correctly.
//  - MOST tagged deck meshes are DETACHED from the scene graph: the static merge
//    (mergeCellStatic) bakes each source mesh's geometry x its matrixWorld into a
//    merged pool and drops the original, so 10 of 14 decks have parent === null
//    and are never touched by scene.updateMatrixWorld(). Measuring them is still
//    exactly right — an orphan keeps the geometry and the matrixWorld that were
//    baked — but it is NOT self-evidently right, so CHECK R samples the LIVE
//    scene under a few interior cells and asserts something is actually drawn
//    there. (It is also why a teeth test must call mesh.updateMatrixWorld(true)
//    itself: setting .position on an orphan moves nothing.)
//  - CHECK C's escape must be CLEAR m clear of every plank, not merely
//    plank-free: several walk rects overhang their own deck (the pier rects by
//    0.5 m in z — see the WARN block), and a deck stranded in the lake would
//    otherwise "reach" its own invisible ledge and pass.
//
// Usage:  node tools/deck-coverage.mjs [--quiet]
// Exit 0 clean, 1 on any failure. Spawns its OWN vite (never the foreign 5173
// — PITFALLS.md) and canary-checks the page before trusting it.
//
// TEST HOOK (task-128 verification only; the gate never passes it):
//   --inject=<file.js>  evaluates that file in the page after load and BEFORE
//   measuring, so the bug can be reintroduced to prove the gate has teeth
//   (an untested guard is not a guard). It prints a loud banner and marks the
//   run as NOT a clean gate run. The two snippets 128 verified with — keep them,
//   re-proving this gate must never take more than a minute:
//
//   (1) CHECK A — plank rendered past the walk surface. Caught 15/345 interior
//       cells (4.3%) on each of the 4 Montrose docks, at x 201.25..201.75:
//         (()=>{for(const d of window.__hd.deckMeshes)if(d.id.startsWith('montrose-finger'))
//           {d.mesh.position.x+=1;d.mesh.updateMatrixWorld(true);}
//           window.__hd.scene.updateMatrixWorld(true);return 'shifted';})()
//   (2) CHECK C — issue 040 itself: a non-walkable MOAT between lawn and plank.
//       Caught all 4 docks "stranded on a walkable island of 693 cells (27.7 m2)"
//       (plus the A misses at the root):
//         (()=>{const P=window.__hd.solidProbe;window.__hd.solidProbe=(x,z)=>{const p=P(x,z);
//           return (x>=183.4&&x<=185.7&&z>=-830&&z<=-710)?{walk:false,water:p.water,dry:p.dry,y:p.y}:p;};
//           return 'moat';})()
// =====================================================================
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import puppeteer from 'puppeteer';
import * as CH from '../src/data/chicago.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const QUIET = process.argv.includes('--quiet');
const INJECT = (process.argv.find(a => a.startsWith('--inject=')) || '').slice(9);

// ---- tuning. Everything that could ever be capped is a named constant, and a
// cap that BITES prints a CAPPED line: a silent cap reads as "covered
// everything" when it wasn't.
const CFG = {
  G: 0.25,          // plank sampling lattice (m) — one ray down per cell
  B: 0.2,           // reach-BFS lattice (m); the player's per-frame stride is ~0.07 m
  TOL_Y: 0.30,      // CHECK B tolerance (m)
  REACH: 40,        // CHECK C search radius (m of BFS depth)
  CLEAR: 0.75,      // CHECK C: an escape cell must be this clear of EVERY plank
                    // (a walk rect that overhangs its own deck is not shore)
  MAX_CELLS: 400000,// per-deck ray budget (never reached in practice; hang guard)
  MAX_VISIT: 60000, // per-deck BFS visited-cell cap
};

// ---- the DEFERRAL allowlist. deck id -> {note, task}. A future failing deck
// can be deferred LOUDLY (it prints a DEFERRED line every run and is counted in
// the summary) instead of being silently dropped from the gate. Ships EMPTY:
// nothing is deferred today.
const KNOWN = {};

let fails = 0;
const log = (...a) => { if (!QUIET) console.log(...a); };
function expect(label, ok, detail) {
  if (ok) log('PASS  ' + label);
  else { console.log('FAIL  ' + label + (detail ? '\n      ' + detail : '')); fails++; }
}
const fmt = (p) => `(${p[0]},${p[1]})`;

// =====================================================================
// PAGE SIDE — installed once, then driven one deck at a time (short protocol
// calls + per-deck progress). All state lives on window.__dc.
// =====================================================================
function pageBoot(cfg) {
  const T = window.__hd.THREE, S = window.__hd.scene;
  S.updateMatrixWorld(true);
  const G = cfg.G, B = cfg.B;
  const dc = window.__dc = { cfg, plank: new Set(), items: [] };
  const ray = new T.Raycaster(), down = new T.Vector3(0, -1, 0), org = new T.Vector3();
  ray.camera = window.__hd.camera;   // r128 Sprite.raycast/LOD.raycast dereference raycaster.camera; the
                                     // scene has sprites, so a whole-scene ray (CHECK R) throws without it

  // 1) instance boxes: one world AABB for a plain Mesh, one per instance for an
  // InstancedMesh — localises the grid so we never sweep 200 m of open water
  // between the Belmont fingers. A tag carrying {inst} contributes ONLY that
  // instance's box (see the tag contract in the header).
  for (const d of (window.__hd.deckMeshes || [])) {
    const m = d && d.mesh; if (!m) continue;
    const geo = m.geometry; if (!geo.boundingBox) geo.computeBoundingBox();
    const boxes = [];
    const only = (m.isInstancedMesh && typeof d.inst === 'number' && d.inst >= 0 && d.inst < m.count)
      ? d.inst : null;
    if (m.isInstancedMesh) {
      const im = new T.Matrix4(), full = new T.Matrix4();
      for (let i = 0; i < m.count; i++) {
        if (only !== null && i !== only) continue;
        m.getMatrixAt(i, im); full.multiplyMatrices(m.matrixWorld, im);
        boxes.push(geo.boundingBox.clone().applyMatrix4(full));
      }
    } else boxes.push(geo.boundingBox.clone().applyMatrix4(m.matrixWorld));
    dc.items.push({ id: d.id, mesh: m, only, boxes });
  }

  // 2) grid each box and cast one ray straight DOWN per cell, against THIS mesh
  // only. Cells with no hit are simply not plank.
  dc.measure = (i) => {
    const it = dc.items[i], cells = new Map();
    let planned = 0, measured = 0, capped = 0;
    for (const bb of it.boxes) {
      const ix0 = Math.ceil(bb.min.x / G), ix1 = Math.floor(bb.max.x / G);
      const iz0 = Math.ceil(bb.min.z / G), iz1 = Math.floor(bb.max.z / G);
      const n = Math.max(0, ix1 - ix0 + 1) * Math.max(0, iz1 - iz0 + 1);
      planned += n;
      if (measured + n > cfg.MAX_CELLS) { capped += n; continue; }
      const y0 = bb.max.y + 0.5, far = y0 - (bb.min.y - 0.5);
      for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) {
        org.set(ix * G, y0, iz * G);
        ray.set(org, down); ray.near = 0; ray.far = far;
        const hits = ray.intersectObject(it.mesh, false);   // InstancedMesh.raycast works in r128
        measured++;
        // hits are distance-sorted; an {inst} tag takes the nearest hit ON THAT
        // INSTANCE (r128 puts instanceId on the intersection) and ignores its
        // bucket-mates, so a decorative slab overhead can never claim the cell.
        let hy = null;
        for (const h of hits) if (it.only === null || h.instanceId === it.only) { hy = h.point.y; break; }
        if (hy !== null) { const k = ix + ',' + iz; cells.set(k, hy); dc.plank.add(k); }
      }
    }
    // INTERIOR: the cell and all four orthogonal neighbours hit plank.
    const interior = [];
    for (const k of cells.keys()) {
      const c = k.split(','), ix = +c[0], iz = +c[1];
      if (cells.has((ix + 1) + ',' + iz) && cells.has((ix - 1) + ',' + iz) &&
          cells.has(ix + ',' + (iz + 1)) && cells.has(ix + ',' + (iz - 1))) interior.push(k);
    }
    it.cells = cells; it.interior = interior;
    return { id: it.id, boxes: it.boxes.length, planned, measured, capped, hits: cells.size, interior: interior.length };
  };

  // 2b) CHECK R — is the tagged mesh actually DRAWN where we just measured it?
  // Most deck meshes are orphans whose geometry lives on inside a merged static
  // pool, so this samples a few interior cells against the WHOLE live scene and
  // asserts some rendered surface sits within 0.10 m of the measured top face.
  // Without it the tool could measure a phantom deck that renders nowhere.
  dc.rendered = (i, n) => {
    const it = dc.items[i], S2 = window.__hd.scene, N = it.interior.length;
    if (!N) return { samples: 0, missing: [] };
    const missing = [];
    for (let s = 0; s < n; s++) {
      const k = it.interior[Math.min(N - 1, Math.floor(s * N / n))];
      const c = k.split(','), x = (+c[0]) * G, z = (+c[1]) * G, hy = it.cells.get(k);
      org.set(x, hy + 0.5, z); ray.set(org, down); ray.near = 0; ray.far = 1.5;
      const hits = ray.intersectObject(S2, true);
      let ok = false;
      for (const h of hits) if (Math.abs(h.point.y - hy) <= 0.1) { ok = true; break; }
      if (!ok) missing.push([+x.toFixed(2), +z.toFixed(2)]);
    }
    return { samples: n, missing };
  };

  // 3) CHECK A + CHECK B, asking the ENGINE about every interior cell.
  dc.checks = (i) => {
    const it = dc.items[i], P = window.__hd.solidProbe;
    const miss = []; let missN = 0, worst = 0, worstAt = null, hiN = 0; const hi = [];
    for (const k of it.interior) {
      const c = k.split(','), x = (+c[0]) * G, z = (+c[1]) * G, hy = it.cells.get(k);
      const p = P(x, z);
      if (!p.walk) { missN++; if (miss.length < 6) miss.push([+x.toFixed(2), +z.toFixed(2)]); continue; }
      const dy = Math.abs(p.y - hy);                 // height is only meaningful where you are held
      if (dy > worst) { worst = dy; worstAt = [+x.toFixed(2), +z.toFixed(2)]; }
      if (dy > cfg.TOL_Y) { hiN++; if (hi.length < 6) hi.push([+x.toFixed(2), +z.toFixed(2), +dy.toFixed(2)]); }
    }
    return { missN, miss, hiN, hi, worst: +worst.toFixed(3), worstAt, interior: it.interior.length };
  };

  // 4) CHECK C — reachable from real ground. BFS over the engine's own
  // walkability from this deck's planks; success = a walkable cell with NO
  // tagged plank over it AND cfg.CLEAR m clear of every plank (a walk rect that
  // overhangs its own deck is an invisible ledge, not shore — it must never
  // count as an escape). Probes are memoised in `seen` (one probe per cell,
  // blocked cells remembered as -1) and the visited set is capped.
  dc.reach = (i) => {
    const it = dc.items[i], P = window.__hd.solidProbe;
    const seen = new Map(), qk = [], qd = [];
    const R = Math.ceil(cfg.CLEAR / G);
    const isGround = (x, z) => {                       // exact cell first (island cells reject in 1 lookup)
      const cx = Math.round(x / G), cz = Math.round(z / G);
      if (dc.plank.has(cx + ',' + cz)) return false;
      for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++)
        if (dc.plank.has((cx + a) + ',' + (cz + b))) return false;
      return true;
    };
    for (const k of it.interior) {
      const c = k.split(','), x = (+c[0]) * G, z = (+c[1]) * G;
      if (!P(x, z).walk) continue;
      const key = Math.round(x / B) + ',' + Math.round(z / B);
      if (seen.has(key)) continue;
      seen.set(key, 0); qk.push(key); qd.push(0);
    }
    if (!qk.length) return { ok: false, why: 'no walkable interior cell to stand on', island: 0, visited: 0, capped: false, truncated: false };
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]], maxDepth = Math.ceil(cfg.REACH / B);
    let head = 0, capped = false, truncated = false, exit = null, steps = 0;
    while (head < qk.length) {
      const key = qk[head], depth = qd[head]; head++;
      if (depth >= maxDepth) { truncated = true; continue; }
      const c = key.split(','), bx = +c[0], bz = +c[1];
      for (const [dx, dz] of DIRS) {
        const nx = bx + dx, nz = bz + dz, nk = nx + ',' + nz;
        if (seen.has(nk)) continue;
        const x = nx * B, z = nz * B, p = P(x, z);
        if (!p.walk) { seen.set(nk, -1); continue; }
        seen.set(nk, depth + 1);
        if (isGround(x, z)) { exit = [+x.toFixed(2), +z.toFixed(2)]; steps = depth + 1; break; }
        qk.push(nk); qd.push(depth + 1);
      }
      if (exit) break;
      if (seen.size > cfg.MAX_VISIT) { capped = true; break; }
    }
    let island = 0; for (const v of seen.values()) if (v >= 0) island++;
    return { ok: !!exit, exit, steps, island, visited: seen.size, capped, truncated, why: exit ? '' : 'walked a closed island' };
  };

  // 5) the REVERSE direction (WARN only): a data walk rect with no plank under
  // it — an invisible ledge. Rect INTERIOR only (cell + 4 neighbours inside the
  // rect), same anti-aliasing rule as the plank side.
  dc.ledger = (rects) => {
    const out = [];
    for (const r of rects) {
      const ix0 = Math.ceil(r.x1 / G), ix1 = Math.floor(r.x2 / G);
      const iz0 = Math.ceil(r.z1 / G), iz1 = Math.floor(r.z2 / G);
      let n = 0; const holes = [];
      for (let ix = ix0 + 1; ix < ix1; ix++) for (let iz = iz0 + 1; iz < iz1; iz++)
        if (!dc.plank.has(ix + ',' + iz)) { n++; if (holes.length < 3) holes.push([+(ix * G).toFixed(2), +(iz * G).toFixed(2)]); }
      if (n) out.push({ id: r.id, n, holes, m2: +(n * G * G).toFixed(1) });
    }
    return out;
  };

  return dc.items.map(it => ({
    id: it.id, boxes: it.boxes.length, instanced: !!it.mesh.isInstancedMesh, only: it.only,
    tris: Math.round((it.mesh.geometry.index ? it.mesh.geometry.index.count : it.mesh.geometry.attributes.position.count) / 3),
  }));
}

// =====================================================================
// NODE SIDE
// =====================================================================
const t0 = Date.now();
log('--- deck-coverage: every rendered plank must hold you (issue 040) ---');
if (INJECT) console.log(`\n!!!! INJECT: ${INJECT} — this run is a TEETH TEST, NOT a clean gate run !!!!\n`);

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

const rows = [];                 // per-deck table
const warns = [];
const deferred = [];
let totalInterior = 0, totalRays = 0, cappedDecks = 0;
let worstDy = 0, worstDyAt = null, worstDyDeck = '';
const badR = [], badA = [], badB = [], badC = [];
const R_SAMPLES = 3;     // CHECK R: live-scene rays per deck (a full-scene ray is ~10 ms)

const browser = await puppeteer.launch({ headless: 'new', args: ['--mute-audio'], protocolTimeout: 300000 });
try {
  const page = await browser.newPage();
  const errors = [], canary = [];
  page.on('console', m => { const t = m.text(); if (t.startsWith('[canary]')) canary.push(t); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${port}/?play=1&quiet=1&canary=deckcov`,
    { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));
  // a guard that measured a BROKEN page is worse than no guard.
  expect('canary echoed (we are looking at OUR build)', canary.some(c => c.includes('deckcov')), canary.join('|'));
  expect('no page errors', errors.length === 0, errors.join(' | '));
  const haveHandles = await page.evaluate(() => !!(window.__hd && window.__hd.deckMeshes && window.__hd.solidProbe && window.__hd.THREE));
  expect('page exposes __hd.deckMeshes + solidProbe + THREE', haveHandles);
  if (!haveHandles) throw new Error('missing __hd handles — nothing to measure');

  if (INJECT) await page.evaluate(readFileSync(INJECT, 'utf8'));

  const decks = await page.evaluate(pageBoot, CFG);
  expect(`decks tagged in the live scene (${decks.length})`, decks.length > 0,
    'window.__hd.deckMeshes is empty — no walkable plank is being asserted at all');

  log(`\ntagged decks: ${decks.map(d => d.id + (d.instanced ? (d.only !== null ? `[inst ${d.only}]` : `[${d.boxes}x]`) : '')).join(', ')}`);
  log('');

  // ---- pass 1: measure every deck (fills the GLOBAL plank set that CHECK C
  // and the invisible-ledge warn both read) ----
  const meas = [];
  for (let i = 0; i < decks.length; i++) {
    const m = await page.evaluate(i => window.__dc.measure(i), i);
    meas.push(m); totalRays += m.measured; totalInterior += m.interior;
    if (m.capped) { cappedDecks++; console.log(`CAPPED  ${m.id}: measured ${m.measured} of ${m.planned} cells (MAX_CELLS ${CFG.MAX_CELLS}) — ${m.capped} cells NOT swept`); }
  }

  // ---- pass 2: the three checks, per deck ----
  for (let i = 0; i < decks.length; i++) {
    const id = decks[i].id, m = meas[i];
    // the inject deliberately desyncs the source mesh from the rendered pool, so
    // CHECK R is meaningless (and would always fail) on a teeth-test run.
    const d = INJECT ? { samples: 0, missing: [] } : await page.evaluate((i, n) => window.__dc.rendered(i, n), i, R_SAMPLES);
    const c = await page.evaluate(i => window.__dc.checks(i), i);
    const r = await page.evaluate(i => window.__dc.reach(i), i);
    const okI = m.interior > 0;
    const okR = INJECT ? true : (okI && d.missing.length === 0);
    const okA = okI && c.missN === 0;
    const okB = okI && c.hiN === 0;
    const okC = okI && r.ok;
    const known = KNOWN[id];
    if (!okR && !known) badR.push(`${id}: ${d.missing.length}/${d.samples} sampled interior cells have NOTHING rendered at the measured plank height  e.g. ${d.missing.map(fmt).join(' ')}`);
    if (!(okA && okB && okC) && known) {
      deferred.push(id);
      console.log(`DEFERRED: ${id} — ${known.note} (task ${known.task})`);
    } else {
      if (!okI) badA.push(`${id}: 0 INTERIOR cells (${m.hits} plank hits) — nothing to stand on`);
      else {
        if (!okA) badA.push(`${id}: ${c.missN}/${c.interior} interior cells (${(100 * c.missN / c.interior).toFixed(1)}%) not walkable  e.g. ${c.miss.map(fmt).join(' ')}`);
        if (!okB) badB.push(`${id}: ${c.hiN} cells over ${CFG.TOL_Y} m  e.g. ${c.hi.map(p => `(${p[0]},${p[1]}) dy ${p[2]}`).join(' ')}`);
        if (!okC) badC.push(`${id}: ${r.why} — stranded on a walkable island of ${r.island} cells (${(r.island * CFG.B * CFG.B).toFixed(1)} m2)${r.capped ? ' [BFS CAPPED]' : ''}${r.truncated ? ' [40 m radius reached]' : ''}`);
      }
    }
    if (c.worst > worstDy) { worstDy = c.worst; worstDyAt = c.worstAt; worstDyDeck = id; }
    rows.push(`  ${id.padEnd(22)} box ${String(m.boxes).padStart(2)}  cells ${String(m.measured).padStart(6)}  plank ${String(m.hits).padStart(6)}  interior ${String(m.interior).padStart(6)}` +
      `  R ${INJECT ? '--' : (okR ? 'ok' : 'NO')}  A ${okA ? 'ok  ' : 'MISS'}  B dy ${c.worst.toFixed(2)}  C ${okC ? (r.steps <= 1 ? 'ok' : 'ok ' + r.steps + ' steps') : 'STRANDED'}`);
  }
  log('\n--- per-deck ---');
  for (const r of rows) log(r);

  // ---- the reverse direction: WARN only ----
  const led = await page.evaluate(rects => window.__dc.ledger(rects), CH.deckRects());
  for (const w of led) warns.push(w);
  if (warns.length) {
    console.log('\n--- WARN: walk rect with no rendered plank under it (invisible ledge) ---');
    for (const w of warns) console.log(`WARN  ${w.id}: ${w.n} interior rect cells (${w.m2} m2) have no plank  e.g. ${w.holes.map(fmt).join(' ')}`);
    console.log('      Known + pre-existing: the CH.DECKS pier walk rects overhang their slab by 0.5 m in z at');
    console.log('      both ends, and the Diversey rects run 0.3 m past the plank at the landward root (a');
    console.log('      deliberate flush root, over walkable promenade anyway). Sweeping these is TASK 130 —');
    console.log('      they are warnings, not gate failures, so nothing is silently swallowed.');
  }

  expect(`CHECK R — every tagged deck is really drawn where we measured it (${INJECT ? 'SKIPPED under --inject' : `${R_SAMPLES} samples/deck`})`,
    badR.length === 0, badR.join('\n      '));
  expect(`CHECK A — every interior plank cell holds you (${decks.length - badA.length}/${decks.length} decks)`,
    badA.length === 0, badA.join('\n      '));
  expect(`CHECK B — rendered top face within ${CFG.TOL_Y} m of the walk surface (worst ${worstDy.toFixed(3)} m)`,
    badB.length === 0, badB.join('\n      '));
  expect(`CHECK C — every deck is walkable onto from real ground (${decks.length - badC.length}/${decks.length} decks)`,
    badC.length === 0, badC.join('\n      '));
} finally {
  await browser.close();
  kill();
}

// ---- walkprobe prints only the LAST 6 LINES of this tool, so the tail is
// exactly 6 lines of summary (the blank separator is the 7th and gets dropped):
// header, then one line per check, then the verdict. ----
const secs = ((Date.now() - t0) / 1000).toFixed(1);
const ids = (b) => b.map(s => s.split(':')[0]).join(', ');
console.log(`\ndeck-coverage · ${rows.length} decks · ${totalInterior} interior cells · ${totalRays} rays · grid ${CFG.G} m · BFS ${CFG.B} m · ${secs}s`
  + ` · ${deferred.length} deferred · ${warns.length} ledge-warn (task 130) · ${cappedDecks} capped${INJECT ? ' · INJECTED (NOT a gate run)' : ''}`);
console.log(`  R drawn    : ${INJECT ? 'skipped under --inject' : (badR.length ? 'FAIL — ' + ids(badR) : `all ${rows.length} decks render where they measure`)}`);
console.log(`  A coverage : ${badA.length ? 'FAIL — ' + ids(badA) : `all ${rows.length} decks hold you on every interior plank cell`}`);
console.log(`  B height   : ${badB.length ? 'FAIL — ' + ids(badB) : `worst |dy| ${worstDy.toFixed(2)} m at ${worstDyDeck} ${worstDyAt ? fmt(worstDyAt) : ''} (tol ${CFG.TOL_Y})`}`);
console.log(`  C reach    : ${badC.length ? 'FAIL — ' + ids(badC) : `all ${rows.length} decks reachable on foot from real ground`}`);
console.log(fails ? `deck-coverage: ${fails} FAIL` : 'deck-coverage: clean');
process.exit(fails ? 1 : 0);
