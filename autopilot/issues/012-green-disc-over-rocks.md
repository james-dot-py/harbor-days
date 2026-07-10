# 012 — big green circle runs over the start of the steps/rocks (x≈151, z≈115)

- severity: medium (it defaces the signature stepped-revetment read, right in
  the soon-to-be spawn neighborhood)
- evidence: owner report with exact coords, 2026-07-09: "x=151 z=115 has a
  big green circle that runs over the beginning of the steps/rocks — should
  not be there or cut off at the rocks start." Reproduce with
  tools/shot.mjs "play=1&x=151&z=115" and LOOK.
- observed/suspects: a large green ground disc overlaps the coast
  terraces. Candidate A: the 'The Belmont Rocks' zone entry (chicago.js
  ~L259, x:150 z:150 r:36) — the owner's coord sits EXACTLY on that rim
  (distance 35≈36), so if zones tint the ground, this is it. Candidate B:
  the scattered mottled-grass circles (chicago.js ~L181 comment / props.js
  scatter) — one disc landed across the revetment. Identify which by
  toggling before fixing.
- expected: ground discs (grass mottling, lawn tints, zone shading — all of
  them) must clip at the coast/terrace boundary: either test disc coverage
  against coastQuery/LAND and skip/shrink offenders (the tree POST-filter
  analog for ground discs, determinism-safe), or clip the disc geometry at
  the terrace top edge. The rocks read as stone from their very first step.
- route: task 023 (AIDS Garden entrance — same neighborhood, touches this
  exact ground), item 5.
