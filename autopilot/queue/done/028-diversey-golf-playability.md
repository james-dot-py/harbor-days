---
id: 028
area: lakefront
type: feedback
model: opus
title: Diversey golf complex — enter the bays and PLAY; mini golf becomes a real course
acceptance: >
  Owner screenshots (2026-07-09; issues 010 + 011, evidence in
  refs/diversey-golf/ — LOOK at both). The 018 Sluggers doctrine, lakefront
  edition: elevated places we model must be REACHABLE, and game-shaped
  corners must be PLAYABLE. Zone: chicago.js DIVERSEY (x28-88 z242-308),
  builder structures.js ~L573-745. (A) TOPGOLF BAYS (issue 010): the
  two-tier bay building's stub stair dead-ends into a wall. (1) Real entry:
  a stair/door path onto the GROUND-tier bay deck as enclosed elevated walk
  rects — sanctuary-deck precedent for elevated walkability, walkprobe
  expects for every new surface, enclosed so the surrounding grass doesn't
  act as an elevator; (2) Play: stand in a bay → interaction 'hit a bucket'
  → chargeThrow-style swing (cornhole pack precedent) aimed NORTH downrange:
  charged power, ball arc + bounce on the range slab, distance toast in
  yards, a ~10-ball bucket with a wrap-up line; balls recycle/despawn
  (bounded meshes — reuse the existing instanced downrange-ball mesh if
  practical); (3) the UPPER tier is bonus: only if the chase camera reads
  inside it honestly (remember the redline-car camera constraint) —
  otherwise gate it visually (rope/planter) so it doesn't promise what it
  can't deliver. Never ship a dead stair. (B) MINI GOLF (issue 011): rails
  currently overshoot their felt pads and cross like pick-up sticks. (1)
  Layout: rebuild the 3 holes as coherent mini-golf holes — rail geometry
  DERIVED from the felt fairway outlines (never freehand), one
  straight/dogleg hole, the loop-ramp hole, the windmill hole; tee pad, cup
  + flag on each; a small entry sign and low boundary fence so the course
  reads as a place; (2) Play: putt via chargeThrow at putt-scale power —
  ball rolls with friction, rails deflect, cup captures, stroke counter +
  par per hole, holes advance 1→2→3, completion toast + journalSection
  entry; (3) the 'STATIC windmill' is a builder limitation, not a game one:
  keep the tower static in structures.js but let THIS pack own the blade
  mesh and registerUpdate a slow rotation so the gate matters for putt
  timing — and if gate timing feels unfair at putt speed, keep the blades
  slow-decorative and say so. Both parts: touch parity (chargeThrow's
  hand-button flow); NPC garnish only AFTER the core loops work; draw
  budget ceiling (tools/budgets.json); determinism — local seeds only, and
  structure changes here legitimately move local scatter (document in the
  result, verify nothing OUTSIDE the zone drifted); walkprobe green
  including the new elevated rects; add/refresh judged waypoints for (a)
  the bay-deck read downrange and (b) the course read; single-file build
  passes.
refs:
  - refs/diversey-golf/owner-issue-010-topgolf-steps.png
  - refs/diversey-golf/owner-issue-011-minigolf-layout.png
  - src/structures.js (~L573-745: range L586-616, mini golf L636+, bays+net L652-739)
  - src/data/chicago.js (DIVERSEY — range/bays/net/holes data)
  - src/packs/cornhole.js (chargeThrow activity precedent), src/framework.js (chargeThrow, addInteraction, journalSection)
  - chicago.js SANCTUARY.deck + its walk rects (elevated-walkability precedent)
  - autopilot/issues/010-topgolf-steps-dead-end.md, 011-minigolf-incoherent-unplayable.md
---

Two asks, one theme: this corner LOOKS like fun and delivers none — that's
worse than empty lawn. The bar is a playable ground-tier bay session and a
coherent, puttable 3-hole course; spectacle is second. The deep fix on the
mini golf is methodological: rails derived from the felt geometry, so the
course CANNOT read as crossed sticks again. Scope honestly — if the upper
bay tier or the animated windmill gate fights the camera or fairness, gate
it or simplify and say so in the result.
