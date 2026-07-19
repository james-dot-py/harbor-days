---
id: 092
area: lakefront
type: feedback
model: fable
turns: 70
title: DOG BEACH — no floating stagnant balls (and a floating-prop sweep)
acceptance: >
  Owner (2026-07-18): "balls at the dog beach shouldn't be floating mid-air
  stagnant." Find every ball at/near the dog beach (fetch balls, kiosk tennis
  balls, watertoys) and make each one either SIT on a surface (sand/water
  line/counter — resting y derived from beachH/water, not a constant) or MOVE
  (in-flight during a fetch arc, bobbing on the water with the living-water
  phase). No ball may hover in air while idle. Root-cause first: screenshot
  the reported state (multiple angles), identify which system leaves them
  airborne (fetch resting state? spawn y? cull/respawn timing?), fix the
  CLASS in that system, not per-ball nudges. Then a cheap city-wide sweep:
  grep prop spawns for constant-y placements over sloping surfaces (beachH /
  cricketHillH / terraces) and fix any other visibly floating idle prop the
  sweep surfaces (evidence shots in the result). Determinism law: no shared
  rng call-order changes; verify with the baseline spawn diff. Walkthrough
  the dog-beach-adjacent waypoints + read every PNG; both inputs unaffected;
  standard gates green.
refs:
  - autopilot/feedback/processed/feedback-2026-07-18T03-29-21-452Z.md (verbatim)
  - src/packs/activities1.js (fetch), src/packs/watertoys.js, src/packs/economy-pilot.js (kiosk stock)
  - src/data/chicago.js DOG_BEACH + beachH (the resting-height source of truth)
---

Small, visible, and exactly the "does the model look at what it builds"
class task 088 exists for — the guard here is deriving idle rest heights
from the surface helpers instead of constants.
