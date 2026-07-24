---
id: 117
area: lincolnpark
type: build
turns: 120
title: South Pond NATURE BOARDWALK — the honeycomb pavilion, Café Brauer, herons + turtles
acceptance: >
  South Pond + its boardwalk ring ship per the 111 coords and read as the
  real place. (1) SOUTH POND: the water body (own deterministic piece per
  the 111 plan, out of shared COAST_SEGS), naturalized banks — prairie
  grass + wildflower drifts (existing tuft/flower buckets, LOCAL seeds),
  lily pads near the edges. (2) THE BOARDWALK: the walkable wooden ring
  around the pond (deck-plank ribbon per the 111 plan — the walkable
  deckRect/dock vocabulary at path scale, pathSamples2 for any paved
  approaches), post-and-cable rail on the water side (POSTS/RAILS reuse),
  interpretive plates. No dead ends — the ring closes and welds to the
  campus paths per the miter law. (3) THE HONEYCOMB PAVILION (the
  Education Pavilion): the laminated-wood lattice arch on the boardwalk's
  east side per the refs — the curved shell with its hexagonal cell
  openings, hand-modeled toon (merge-pool statics; keep the cell count
  stylized, not literal — the READ is a wooden honeycomb tunnel-arch you
  can walk under). Walkable through, colliders anti-trap-clean.
  (4) CAFÉ BRAUER at the pond's NW shoulder: the Prairie School brick
  hall — long two-storey mass, arched loggia band facing the water,
  green-tile hip roof + twin lantern towers per the refs, glow windows,
  name sign (person name — real, per RENAMES.md). (5) POND LIFE:
  black-crowned NIGHT HERONS (the real endangered rookery — chibi-chunky,
  a couple perched + one hunched at the bank), turtles on a half-log,
  dragonflies via existing particle/glow vocab; all pack-owned, culled,
  LOCAL seeds. (6) EXPECTATION HONESTY: the real postcard puts the
  skyline behind the pavilion — the DOWNTOWN-SKYLINE PHYSICS RULING (far
  plane 900, fog 210 m) means the game CANNOT show it; the waypoint
  strings promise the pavilion arch + pond + Café Brauer instead (111
  staged them — use those, verbatim). (7) WALKABILITY: boardwalk +
  pavilion + banks walk per shared data; walkprobe rules + expects exit
  0; no walkable water shelf. (8) DETERMINISM: spawn shot ≈noise vs
  baseline; zero new InstancedMesh buckets; no shared-rng draws.
  (9) PERF: draws ≤480 at every affected waypoint. (10) WAYPOINTS:
  lp-boardwalk (down-the-ring framing — deck + rail + pond + pavilion
  arch) and lp-brauer (the loggia band across the water) wired; `node
  tools/walkthrough.mjs --ids <affected>` green, every PNG personally
  Read and judged against expectation + refs, art-director standard.
  (11) `npm run build` one artifact; zero console/page errors; canary
  echoes.
refs:
  - refs/lincoln-park/BRIEF.md (§South Pond / Nature Boardwalk — the
    pavilion + Brauer reads, the heron story) + refs/lincoln-park/
    imagery
  - GEOGRAPHY.md Lincoln Park section (111 finals) + the Montrose
    PHYSICS RULING precedent (the skyline-cannot-render law this task's
    expectations obey)
  - src/structures.js (deckRect walkable-deck + POSTS/RAILS vocab),
    src/coast.js (own-piece water precedent), the sanctuary/Montrose
    bird precedents in src/packs/ (chibi-chunky, clustered)
  - PITFALLS.md (walkable deck + step thresholds — elevated rects
    adjacent to ground act as elevators, enclose them; camera-in-
    geometry at the pavilion — down-the-length framings)
---

The pond is the pipeline's quiet finale — the wild counterpoint to the
zoo's dioramas, the same register Montrose's dunes played against its
harbor. Two architectural reads carry it: the honeycomb arch (nothing
else in the game is curved wood lattice) and Café Brauer's loggia
reflected across the water. The herons are the delight hook — the real
rookery is a Chicago story (an endangered colony that chose the zoo),
and 118 will want an interaction here, so leave the perches accessible.
