---
id: 009
area: wrigleyville
type: build
model: fable
turns: 140
title: Wrigleyville layout rework — bigger field, double-wide streets, set-back gates, red-brick aprons
acceptance: >
  Owner directive (2026-07-09, screenshots in refs/inbox/"Several issues with
  this.png" + refs/wrigley-field/caray-owner-reference.jpg — READ both first).
  GEOGRAPHY.md FIRST, then src/data/wrigleyville.js, then builders.
  (1) STREETS DOUBLE-WIDE: every corridor (Addison, Waveland, Sheffield,
  Kenmore, Clark) roughly doubles its current road+sidewalk width. (2) STADIUM
  LARGER: grow the footprint poly and the field (HP->CF distance) so the bowl
  reads big-league from the street. (3) SET-BACK GATES WITH APRONS: the stadium
  face pulls back from the sidewalk at the gates — most importantly the
  Bleacher Gate, where the Caray statue gets a proper plaza apron like the
  reference (statue centered, off the pedestrian through-line, gate behind).
  (4) RED-BRICK GROUND: the gate aprons pave in red brick (canvas-texture brick
  pattern, instanced/merged, walkable, same y as sidewalk) — make it the
  signature Wrigley ground treatment at Marquee, Gallagher and Bleacher gates.
  GEOMETRIC TENSION, resolve explicitly: the cell's z anchors (Addison −400,
  Waveland −500) are true latitudes; double streets + bigger stadium + aprons
  cannot all fit in that fixed block. Owner priority is the SPACE — if needed,
  STRETCH the cell north-south and document the new cell-local z frame as a
  standing liberty in GEOGRAPHY.md (the x frame already is one; the ride is a
  scripted transition, so nothing else depends on true cell latitude). Update
  ALL dependents in the same pass: WALK_W quads, CLAMP_W, BARRICADES_W,
  BACKDROP_W bands, VILLAGE_W lots (they front the new corridors), STATION_W
  relation to Addison, minimap MAP_W, walkprobe rules+expects (walkability
  stays data-module-shared), and camera-clearance volumes in
  tools/gen-waypoints.mjs. Waypoints follow the data automatically — update
  expectation strings only where the scene description genuinely changed.
  Verify: /verify green; FULL wrigleyville walkthrough (node
  tools/walkthrough.mjs --area wrigleyville), every canyon + gate expectation
  judged from the PNGs; draws <= budgets.json (480 — the ratchet is done, do
  not regress it); determinism (cell uses SEED_W local rng only).
refs:
  - refs/inbox/"Several issues with this.png" (owner verdict: cramped corner)
  - refs/wrigley-field/caray-owner-reference.jpg (the target: brick plaza,
    set-back statue, gate behind)
  - GEOGRAPHY.md WRIGLEY_GEOGRAPHY (anchors + standing liberties — extend it)
  - src/data/wrigleyville.js (STREETS_W/STADIUM_W/WALK_W and friends)
  - autopilot/queue/012 + 016 + 017 run AFTER this and mount on the new
    geometry — get the bones right, they add the skin
---

The block should breathe like the real corner does: wide game-day streets, the
stadium mass set back where crowds gather, Caray on his own brick plaza. This
is the bones pass — 012 (architecture), 010 (bar likenesses), 016
(streetscape) dress whatever this task leaves, so err toward generous space.
