---
id: 112
area: lincolnpark
type: build
turns: 140
title: Lincoln Park SHELL — the map grows south-west: bounds/clamp/minimap flip, the west panel, LSD becomes interior, Fullerton underpass opens, trail + backdrop continuation, waypoints live
acceptance: >
  The contiguous world extends past the old z +415 fence and — for the first
  time — west of x −10, per the 111 finals, with zero determinism fallout
  elsewhere. (1) APPLY the 111 finals in src/data/chicago.js + builders:
  LAND polygon grows south and west to the new lines, FENCES relocate,
  WORLD_CLAMP + minimap MAP update, ground/lawn/meadow carpets for the new
  panel, the LSD berm + road continue south as an INTERIOR ribbon (park on
  both sides), the L backdrop + Lakeview band relocate to the new west edge
  for the southern band per 111's ruling, and the FULLERTON UNDERPASS opens
  as the map's first working crossing of the Drive (walkable tunnel, honest
  walkability both ends; the old fenced-gate register stays everywhere
  else). The old "future Diversey-Lincoln Park gate" fence at the SW
  terminus opens into the new stretch. (2) COAST/WATER: the Diversey
  Harbor inlet mouth + channel and any lakefront continuation south of the
  corner ship as their OWN deterministic pieces per the 111 plan (out of
  shared COAST_SEGS, own walkability SEGS); the zoo / conservatory / South
  Pond patches are STUBBED as honest lawn or interim shore clearly marked
  for 113-117 replacement (each a separate piece so replacing one shifts
  nothing else). (3) TRAIL: the Lakefront Trail continues south from
  (30,406) as a NEW ribbon registered via pathSamples2 — TRAIL_MAIN
  untouched; interior park paths per the 111 plan (miter welds, no
  double-pave). (4) DETERMINISM GATE: before the minimap flip, a canonical
  spawn shot proves towels/flowers/trees unmoved (≈noise vs baseline.png);
  after the flip (HUD minimap aspect changes), regenerate baseline.png via
  the canonical recipe ONLY (flake-calibration.json query+waitMs, own port
  + canary, pill-free crop check, [baseline-regen] commit). Spot-check 3-4
  existing rocks/harbor/montrose waypoints judge unchanged. (5) PERF: ZERO
  new InstancedMesh buckets (reuse existing buckets; statics through the
  merge pool with in-pool colors); draw calls ≤480 at every new AND
  existing waypoint checked, including the millennium worst view (478/480
  must not move). (6) WALKABILITY: the new lawns/trail/underpass/coast tops
  walk per the shared data (engine + walkprobe from the same definitions,
  never forked); walkprobe rules + expects live and exit 0; no collider
  whose ring (r + 0.34) can reach non-walkable ground (the anti-trap law).
  (7) WAYPOINTS: the first lp-* waypoints wired into gen-waypoints +
  tools/waypoints.expect.json from the BRIEF's authored strings (at minimum
  lp-arrival at the old fence line looking south, lp-underpass at the
  Fullerton crossing — axis-aligned framing, and lp-westpanel on the new
  parkland); `node tools/walkthrough.mjs --ids <new>` green, every PNG
  personally Read and judged against its expectation + refs. (8) `npm run
  build` one artifact; zero console/page errors; canary echoes.
refs:
  - refs/lincoln-park/BRIEF.md BUILD-PLAN + GEOGRAPHY.md Lincoln Park
    section (111 output — the finals this task applies verbatim; do not
    re-derive)
  - src/data/chicago.js (LAND south/west edges, FENCES, WORLD_CLAMP,
    MAP), src/coast.js, src/paths.js (ribbon + pathSamples2 + miter-weld
    pattern), src/sky.js (Lakeview band / L backdrop relocation)
  - PITFALLS.md (pathSamples phase; baseline-regen recipe + pill crop;
    instanced buckets global; stale-cache/own-vite; anti-trap escape)
  - tools/shots/baseline.png + tools/flake-calibration.json (the recipe)
---

Application task: 111 already made the judgment calls — this task's craft is
executing the first WESTWARD map growth without moving a single shipped
towel. Work in two commits if it helps triage: (a) world growth with minimap
untouched + determinism proof, (b) the minimap/clamp flip + baseline regen.
The stubbed zoo/conservatory/pond patches should read as honest parkland
from the trail (interim lawn, not holes); 113-117 replace them
piece-for-piece. The Fullerton underpass is the first tunnel players can
actually walk through — make both mouths read as invitations, not the old
dead-end register.
