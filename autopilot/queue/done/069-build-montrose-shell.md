---
id: 069
area: montrose
type: build
turns: 140
title: Montrose SHELL — the map grows north: bounds/clamp/minimap flip, ground, coast stretches, trail + backdrop continuation, gate, waypoints live
acceptance: >
  The contiguous world extends past the old z −812 fence per the 068 plan,
  with zero determinism fallout south of it. (1) APPLY the 068 finals in
  src/data/chicago.js + builders: LAND polygon north edge moves to the new
  line, FENCES.north relocates, WORLD_CLAMP.zMin + minimap MAP update,
  ground/lawn/meadow carpets for the new stretch, the LSD embankment +
  Lakeview band + backdrop bands continue north, and the Montrose Ave
  underpass gate (x 0-14, z ≈ −1200) matches the Belmont/Addison/Irving
  register (fenced dead-end door, no gag sign). (2) COAST: the plain
  revetment stretches + the north map-edge closure ship as their OWN
  deterministic pieces per the 068 plan (out of shared COAST_SEGS, own
  walkability SEGS); the harbor/Point/beach stretches are STUBBED as
  interim revetment pieces clearly marked for 070-072 replacement (each a
  separate piece so replacing one shifts nothing else). (3) TRAIL: the dual
  Lakefront Trail continues from its current north end to the Montrose
  area as a NEW ribbon registered via pathSamples2 — TRAIL_MAIN untouched.
  (4) DETERMINISM GATE: before the minimap flip, a canonical spawn shot
  proves towels/flowers/trees unmoved (≈noise vs baseline.png); after the
  flip (HUD minimap aspect changes), regenerate baseline.png via the
  canonical recipe ONLY (flake-calibration.json query+waitMs, own port +
  canary, pill-free crop check, [baseline-regen] commit) — a defective
  baseline taxes every future session. Spot-check 3-4 existing harbor/rocks
  waypoints judge unchanged. (5) PERF: ZERO new InstancedMesh buckets
  (reuse existing buckets; statics through the merge pool with in-pool
  colors); draw calls ≤480 at every new AND existing waypoint checked,
  including one millennium waypoint (the 478/480 worst view must not move).
  (6) WALKABILITY: the new lawns/trail/coast tops walk per the shared data
  (engine + walkprobe from the same definitions, never forked); walkprobe
  rules + expects live and exit 0; no collider whose ring (r + 0.34) can
  reach non-walkable ground (the 065 anti-trap law). (7) WAYPOINTS: the
  first mt-* waypoints wired into gen-waypoints + tools/waypoints.expect.json
  from the BRIEF's authored strings (at minimum mt-arrival at the old fence
  line looking north, mt-trail on the new stretch, mt-gate at the Montrose
  underpass); `node tools/walkthrough.mjs --ids <new>` green, every PNG
  personally Read and judged against its expectation + refs. (8) `npm run
  build` one artifact; zero console/page errors; canary echoes.
refs:
  - refs/montrose/BRIEF.md BUILD-PLAN + GEOGRAPHY.md Montrose section (068
    output — the finals this task applies verbatim; do not re-derive)
  - src/data/chicago.js (LAND P.push north edge [232,-812],[14,-812];
    FENCES.north; WORLD_CLAMP; MAP), src/coast.js, src/paths.js (ribbon +
    pathSamples2 pattern), src/sky.js (Lakeview band/backdrop)
  - PITFALLS.md (pathSamples phase; baseline-regen recipe + pill crop;
    instanced buckets global; stale-cache/own-vite; anti-trap escape)
  - tools/shots/baseline.png + tools/flake-calibration.json (the recipe)
---

Application task: 068 already made the judgment calls — this task's craft is
executing the first map growth without moving a single shipped towel. Work
in two commits if it helps triage: (a) world growth with minimap untouched +
determinism proof, (b) the minimap/clamp flip + baseline regen. The stubbed
harbor/Point/beach coast pieces should read as plain stepped revetment from
the trail (honest interim shoreline, not holes); 070-072 replace them
piece-for-piece.
