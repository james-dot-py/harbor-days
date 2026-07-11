# 017 — Millennium Park: fall-through-the-floor holes drop you onto the jetski

- severity: HIGH (immersion-shattering: the player sinks through downtown
  pavement and finds themselves riding a jetski — the lakefront water
  fallback is leaking into the hard cell)
- evidence: owner playtest 2026-07-11 — "quite a few places in millennium
  park where you sink/fall through the floor and appear to be on the jetski
  again." Reported coords: (168.0, 866.0) erroneous jetski; the Pritzker
  STAGE (144.7, 758.0) falls through. Owner emphasizes these are examples,
  not the full set.
- observed/suspected: wherever the millennium cell's walkable()/surfaceY()
  has a gap, movement falls through to the LAKEFRONT rules — main.js
  isWater() treats not-land as open water and the jetski mounts. Two-layer
  bug: (a) the cell has coverage holes (stage, rill edges, etc.), and (b)
  the global fallback lets a hard cell reach water logic AT ALL.
- expected: fix the CLASS both ways — (1) the millennium cell's walkable()
  answers definitively everywhere inside its clamp (no silent fall-through),
  with every elevated surface (stage!) properly enclosed per the elevated
  walk-rect rules; (2) guard the jetski/water path against active hard
  cells in main.js (a pocket cell should never mount the jetski, full
  stop); (3) then a systematic GRID SWEEP of the whole cell (walkprobe-
  style, every ~2 m) to enumerate every hole — fix all of them, not just
  the two reported.
- route: task 048 (polish), owner punch-list item (a) — top priority of the
  pass.

- RESOLVED (task 048): fixed the CLASS in `src/main.js` — `isWater()` now
  returns false whenever a hard cell is active (`cellWalk()` non-null), so a
  downtown coverage gap is BLOCKED, never open water; a pocket cell can never
  mount the jetski regardless of which spot has a hole. Added `tools/mp-gridsweep.mjs`
  (2 m grid sweep of the whole cell): after the guard the only interior "holes"
  are the intended BP-ramp buffer (already asserted non-walkable in walkprobe;
  closing them would create an elevator). Closed the one genuine 2 m seam at the
  Lurie NE gate↔Columbus-rim corner with a connector walk quad. walkprobe gained
  assertions for the two owner-reported spots (blocked, not water) + the closed
  seam (411 pass / 0 fail). Verified both owner coords: (168,866) planting =
  blocked; (144.7,758) bowl edge = walkable; stage apron north of it = blocked.
