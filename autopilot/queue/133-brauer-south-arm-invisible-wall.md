---
id: 133
area: lincoln-park
type: fix
model: opus
turns: 30
title: Cafe Brauer's south loggia arm — 11 m2 of rendered brick quay that stops holding you 3.2 m early
acceptance: >
  Found by task 130's walkable-surface census and CONFIRMED against the live
  engine (tools/tmp-130-probe.mjs, __hd.solidProbe — not a node-side mirror).

  THE FACTS, measured:
  · structures.js builds Cafe Brauer's terrace court and BOTH loggia arm floors
    into the shared `gPave` pool at top face y 0.13. The south arm floor spans
    x -54..-42 (BoxGeometry(12,0.88,3.6)), z 916.4..920.
  · Walkability there is neither a rect nor a carve — the terrace is walkable
    purely by being LP LAND (CH.lpLandHit), and lpLandHit SUBTRACTS
    LP_SOUTHPOND_WATER. That pond edge crosses the arm: walkable() goes false at
    x -45.00 (z 918) and x -45.25 (z 920).
  · So ~3.2 m x 3.6 m = ~11 m2 of visible brick quay does not hold the player.
    It is an INVISIBLE WALL, not a fall (isWater's x>20 west-wade gate blocks the
    pond), and it sits on a real route: ZOO.spur runs through the court at x~-50.
  · The NORTH arm clears the pond by 1.36 m (pond north edge z 900.96 at x -42
    vs the arm's south edge z 899.6). Only the south arm is exposed.
  · structures.js's own comment says the south arm tip "reaches over the pond,
    reads as a solid quay" — the read was deliberate; nobody checked the walk
    side.

  PICK ONE AND SHIP IT (both are cheap; the choice is a taste call):
  (a) MAKE IT TRUE — carve the terrace + arm footprints walkable BEFORE the pond
      subtraction in lpLandHit, exactly as CH.lpBoardwalkHit does for the Nature
      Boardwalk (the precedent for walking out over the pond on a rendered deck).
      Derive the rects from LP_CAFE_BRAUER so render and walk cannot fork. NOTE
      the cost: the floors are merged into `gPave`, so deck-coverage CANNOT tag
      them and the new surface would be ungated — if you take this route, say so
      in the tool header's exclusion census and keep the rects in the data module.
  (b) MAKE IT HONEST — shorten the south arm (loggia.armLen 12 -> ~8.8, south
      only) so the rendered quay ends where the ground does. Cheaper to gate,
      but it costs the postcard read of the quay over the water; re-judge the
      Brauer framings against refs/lincoln-park/ before accepting.

  Whichever ships: re-probe with tools/tmp-130-probe.mjs's brauer scans (or an
  equivalent) and show walkable == rendered along z 918 and z 920; walkprobe,
  deck-coverage and no-solid-in-water stay green; PNGs of the terrace personally
  Read and judged against the refs.
refs:
  - autopilot/done/130-deck-ledges-and-coverage-sweep.md (the census that found it)
  - src/structures.js (Cafe Brauer: terrace court + loggia arm floors -> gPave)
  - src/data/chicago.js LP_CAFE_BRAUER / lpLandHit / LP_SOUTHPOND_WATER / lpBoardwalkHit
  - tools/deck-coverage.mjs header (the exclusion census records this gap)
---

128 promised every plank you can see holds you. Brauer's south arm is the
counter-example the gate cannot see: a quay drawn 3.2 m past the ground under
it, in a merged pool no tag can reach, on the walk to the zoo.
