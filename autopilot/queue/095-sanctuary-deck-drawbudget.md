---
id: 095
area: lakefront
type: fix
model: fable
turns: 60
title: sanctuary-deck-f2 draw budget — the NW canopy frustum is 499/480 with nothing new in frame
acceptance: >
  Task 090 discovered (and measured, census run mrqxyqz7 + tools/tmp-090-census.mjs)
  that the PRE-EXISTING sanctuary-deck waypoint's f2 framing (stand 171,-396.25,
  yaw -0.99, pitch 0.36, dist 9 — "W-NW up into the canopy") draws 499/480 on a
  clean tree with no mood active. Attribution: a LONG TAIL, led by ~96 draws of
  live vertex-colored rigs (56 unnamed vc BufferGeometry meshes — the sanctuary
  chibi songbirds — plus 40 named chibi meshes: birders/NPC rigs), then dozens
  of 2-6-draw one-off props (feeders, scopes, perches). No single offender.
  FIX HONESTLY: a draw diet for the sanctuary interior at this frustum — e.g.
  bake the perched songbirds' rigs (bakeChibiRig folds a posed rig to 1 draw;
  the lawnlife/048 law: live rigs near, baked twins far), fold one-off feeder/
  scope props into the static merge or an instanced bucket, WITHOUT changing
  the composed look (the 025 "reads busy" bird-hero view must survive — judge
  before/after PNGs at all three sanctuary-deck framings). sanctuary-deck-f2
  back under 480 with ~15 headroom; walkthrough --ids sanctuary-deck,mood-firefly
  green; determinism unchanged (baked swaps must not consume shared rng);
  no visual regression in the READ shots.
refs:
  - tools/tmp-090-census.mjs (attribution probe, reusable)
  - src/packs/sanctuary.js + the 071/025 bird content (props.js sanctuary blocks)
  - PITFALLS.md lawnlife REGISTER entry (bake-with-bumpable precedent)
---

Found by 090 (lake moods): the firefly waypoint initially reused this framing
and failed the gate at 500 — with the mood contributing exactly +1 (its surge
Points). The everyday view is over budget by itself; every future full-area
walkthrough will trip on it until dieted.
