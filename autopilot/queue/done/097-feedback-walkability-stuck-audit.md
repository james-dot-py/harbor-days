---
id: 097
area: citywide
type: feedback
model: fable
turns: 120
title: WALKABILITY AUDIT — nowhere on the map can trap the player
acceptance: >
  Owner (2026-07-19): "Can you make sure all the right spots are walkable?
  Shouldn't be able to get 'stuck' anywhere. That's important." This is a
  citywide AUDIT task, not a single fix. Sweep every walkable region with
  the existing machinery and close every trap the sweep surfaces:
  (1) grid sweeps — tools/mp-gridsweep.mjs over every hard cell
  (wrigleyville, millennium, and any registered since) at <=2 m: zero
  non-walkable interior islands with >=6/8 walkable neighbours; run an
  equivalent sweep over the lakefront LAND (incl. Montrose/Cricket Hill/
  beaches) for non-water, non-walkable islands a collider could pin you
  into (the 076 law: lakefront has NO crawl escape, so islands there are
  real freezes). (2) collider-ring audit — enumerate colliders whose ring
  (r + 0.34 player radius) overlaps non-walkable ground (the 065 arch-trap
  class); relocate/shrink offenders or close the seam in data. (3) bot
  runs — steering-bot routes through the busiest corridors of each area
  (lakefront trail incl. Montrose reroute, Wrigleyville streets, Millennium
  promenades + BP bridge, beach<->harbor) asserting displacement never
  freezes (>1 m per held-input second; route AROUND data-carved blocks per
  the 075 law). (4) anti-trap escape still armed — __hd.setTrap trapbot
  check in one hard cell. Fix every confirmed trap in the SHARED walk data
  (052 law: engine + walkprobe never fork), with walkprobe expects added
  for each fix so it stays closed. Report the sweep numbers (islands found/
  closed, collider offenders, bot stall coords) in the result. Determinism
  gate + standard gates green.
refs:
  - autopilot/feedback/processed/feedback-2026-07-19T00-36-33-298Z.md (verbatim)
  - tools/mp-gridsweep.mjs, tools/walkprobe.mjs, main.js movement gate (anti-trap crawl)
  - PITFALLS.md (052 footprint probe, 065 collider ring, 076 lakefront no-crawl, 048 water guard)
---

The owner has hit a stuck spot at least twice (issues 017, 025). This
pass makes "can't get stuck" a swept, expect-guarded invariant instead
of a per-report whack-a-mole.
