---
id: 113
area: lincolnpark
type: build
turns: 120
title: Diversey Harbor + Theater on the Lake — the connective water: channel harbor, moored boats, the Fullerton point pavilion
acceptance: >
  The Diversey→Fullerton stretch reads as the real place, replacing the 112
  stubs piece-for-piece per the 111 plan. (1) DIVERSEY HARBOR: the narrow
  inland channel harbor west of LSD — mouth at the corner per 111's coords,
  the channel running south toward Fullerton, seawall/bulkhead edges with
  walkable promenade tops, finger docks + moored small boats (REUSE the
  Belmont/Montrose dock deck/post + hull/mast vocabulary — zero new
  InstancedMesh buckets, LOCAL seeds), and the lagoon continuation under
  Fullerton per the plan (a low bridge/culvert read is fine; players cross
  above, water reads through). (2) THEATER ON THE LAKE at the Fullerton
  lakefront (east of LSD): the 1920 brick pavilion with its open-arch
  arcade band — hand-modeled in house toon style against the refs,
  glow-window band, honest name signage per RENAMES.md (geographic/park
  names stay real), sited so the trail sweeps past it; footprint carved
  from walk, colliders per the anti-trap law. (3) The Lakefront Trail
  section past the point + any harbor-edge paths from the 111 plan, welded
  per the miter law, pathSamples2 only. (4) WALKABILITY: promenade tops +
  bridge/crossing walk per the shared data (engine + walkprobe, never
  forked); walkprobe rules + expects exit 0; no walkable water-shelf at
  any channel end (wrap the seawall to the apex — the Montrose
  terraced-tip lesson); tools/shoreline-simple.mjs stays green (no LAND
  self-intersection, no facing-apron pinch). (5) DETERMINISM: canonical
  spawn shot ≈noise vs the fresh 112 baseline; all scatter LOCAL-seeded;
  zero shared-rng draws added. (6) PERF: zero new InstancedMesh buckets;
  draws ≤480 at every affected waypoint. (7) WAYPOINTS: lp-diversey-harbor
  (down-the-channel framing — masts + docks + both banks) and lp-theater
  (the arcade band + the lake beyond) wired with the BRIEF's authored
  strings; `node tools/walkthrough.mjs --ids <affected>` green, every PNG
  personally Read and judged against expectation + refs. (8) `npm run
  build` one artifact; zero console/page errors; canary echoes.
refs:
  - refs/lincoln-park/BRIEF.md (§Diversey Harbor + §Theater on the Lake,
    110 refs + 111 finals), refs/lincoln-park/ imagery
  - GEOGRAPHY.md Lincoln Park section (111 — the coords this task builds)
  - src/structures.js (fenceRun POSTS/RAILS; dock/deck precedents),
    src/data/chicago.js (BASIN/dock/mooring vocab to reuse — Belmont +
    Montrose harbor blocks), src/coast.js
  - PITFALLS.md (own-vite; anti-trap; village.js add() snapshot; DoubleSide
    mirrored text — signs are back-to-back FrontSide pairs)
  - tools/shoreline-simple.mjs (the permanent gate)
---

The connective-tissue task: this stretch is what makes the zoo feel
CONTIGUOUS instead of teleported. Diversey Harbor is deliberately a third
kind of harbor — Belmont is a basin, Montrose is a basin with a hook; this
one is a narrow CHANNEL you walk beside, boats nose-to-tail. Theater on
the Lake is the landmark that anchors the Fullerton point from the trail;
its arcade band is the read — get the arch rhythm from the refs, not from
imagination.
