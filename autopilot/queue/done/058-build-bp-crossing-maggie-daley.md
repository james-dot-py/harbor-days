---
id: 058
area: millennium
type: build
model: opus
turns: 140
title: BUILD — BP bridge full crossing + all of Maggie Daley Park
acceptance: >
  Per the 057 layout data. (1) THE BP BRIDGE, FULLY BUILT OUT (the owner's
  words): the serpentine deck completes its real S-curve crossing over
  Columbus Dr into Maggie Daley — the current dead-end is gone; Columbus
  reads as a road trench passing beneath (visual road, not walkable);
  deck/balustrade/treads FOLLOW THE CURVE per the 048 contour rule (every
  segment's yaw from the curve tangent — no jacknifed rectangles, that was
  issue-fixed once already); walkable end to end with enclosed elevated
  rects (no street-elevator). (2) MAGGIE DALEY PARK, all of it at the
  cell's register: the PLAY GARDEN (the fantastical toon playground —
  lighthouse tower, the ship, big slides, enchanted-forest planting; this
  is chibi-heaven, spend the charm here), the TWO CLIMBING WALLS (sculpted
  rock towers — climbable via the sanctuary-deck elevated pattern if it
  reads honestly, otherwise visual with a base path), the rolling
  landforms, lawns + trees, and the RIBBON BED — the ~400 m serpentine
  path looping the climbing walls per the owner's aerial (terrain +
  rails/rockwork only; task 059 activates skating on it). (3) Walkability:
  issue-017 contract + gridsweep green over the whole new footprint;
  playground pieces climbable-or-solid, never sink-through. (4) Budget per
  the 057 perf plan (instance the playground repeats, merge statics);
  determinism (cell-local seeds); judged waypoints for the bridge crossing
  + play garden + ribbon overview; both inputs; single-file build passes.
refs:
  - the 057 layout tables + BRIEF perf plan (run after 057 — hard dependency)
  - refs/millennium-park/owner-skating-ribbon-northeast.webp (ribbon + walls aerial)
  - autopilot/queue/059-maggie-daley-skating-ribbon.md (the ribbon's activation contract — build the bed IT expects)
  - src/millennium/ builders; tools/mp-gridsweep.mjs
---

Two icons in one task: the bridge that finally goes somewhere, and the
playground every Chicago kid begs to visit. Read 059 before laying the
ribbon bed so the skating task inherits exactly the loop it was promised.
