---
id: 070
area: montrose
type: build
turns: 120
title: Montrose Harbor + the HOOK — basin, docks, launch, Park Bait, the curling fishing pier
acceptance: >
  The harbor stretch reads as Chicago's big north harbor per refs/montrose/:
  (1) BASIN: the harbor's coast piece(s) replace their 069 stubs at the 068
  coords — basin water at y −2.3, mouth open at the SOUTH, seawall/bulkhead
  and terraced edges per the plan; entrance light or marker at the mouth if
  the refs support one. (2) WEST SHORE: dock fingers/star docks + moored
  boats (REUSE the Belmont dock + boat instanced buckets/geometry — zero
  new InstancedMesh buckets, the binding 068 perf law), the public boat
  LAUNCH ramp, and a PARK BAIT likeness (the real bait shop — small, signed,
  the bar-likeness register; sign via the canvas-plate atlas fold so it
  costs +0 draws). Mooring cans mid-basin per the plan. (3) THE HOOK: the
  curved breakwater fishing pier roots and curls per the 068/osm geometry —
  WALKABLE end to end via its own SEGS (the COAST_TIP precedent), lamp or
  light at the tip, riprap toe; its walk surface + any rails come from the
  shared data module (engine + walkprobe lockstep), rail posts through the
  existing fenceRun buckets. No collider ring reaching non-walkable ground.
  (4) DETERMINISM: only this stretch's own pieces change — canonical spawn
  shot ≈noise vs baseline; no shared rng consumed; scatter local-seeded.
  (5) WAYPOINTS: mt-harbor (basin + masts read), mt-hook (down-the-pier
  toward open lake), mt-baitshop or equivalent per the BRIEF's authored
  strings, wired + expects; `node tools/walkthrough.mjs --ids <new + 069's
  mt-*>` green; draw calls ≤480 everywhere checked; every PNG personally
  Read and judged vs expectation + refs. (6) walkprobe exit 0; `npm run
  build` one artifact; zero console/page errors; canary echoes.
refs:
  - refs/montrose/BRIEF.md + osm.json (hook root/curl geometry — use the
    ORDERED node list, never bbox corners) + GEOGRAPHY.md Montrose section
  - src/data/chicago.js (Belmont harbor consts to mirror: DOCKS, mooring
    field, COAST_TIP own-piece pattern), src/structures.js
  - PITFALLS.md (own-piece determinism; instanced buckets global; sign
    atlas/word-sign laws; collider-trap law)
---

The harbor is a bigger sibling of shipped Belmont Harbor — lean hard on the
existing dock/boat/seawall vocabulary and spend the novelty budget on the
HOOK, which is the stretch's signature silhouette (a long low arc of stone
curling into open water, fisherfolk-ready). Frame mt-hook down the pier's
length per the interior/axis camera doctrine — the curl means a mid-pier
stand, not a root stand.
