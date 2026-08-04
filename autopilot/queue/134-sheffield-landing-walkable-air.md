---
id: 134
area: wrigleyville
type: fix
model: opus
turns: 40
title: The Sheffield rooftop landing is 6 m2 of walkable AIR, 9.6 m up — and the deck gate cannot see it
acceptance: >
  Found by task 130's walkable-surface census and CONFIRMED live
  (tools/tmp-130-probe2.mjs, via __hd.cellProbe('wrigleyville',...) — the cell's
  OWN walkable()/surfaceY(), never a mirror).

  THE FACTS, measured:
  · WALK_W carries a `sheffLanding` quad (src/data/wrigleyville.js, R.sheffLanding)
    at x -181..-178, z -534..-532, walk height y 9.6.
  · Every sample inside it returns walk=true, surfaceY=9.6.
  · Raycasting the live scene straight down from 1 m above that height finds
    NOTHING until y 0.05 / 0 — the sidewalk. 42 of the sampled cells (~6 m2) have
    no rendered surface within 0.35 m of the height they hold you at.
  · buildSheffieldExtras (src/wrigley/rooftops.js) builds no landing slab; the
    quad lies entirely WEST of the S0 building, over the sidewalk.
  This is issue 040's exact class, inverted and 9.6 m up: a walk surface with no
  plank under it. If it abuts the S0 rooftop deck, a player who walks off the
  roof's west edge stands on thin air in plain sight.

  DO:
  (1) Establish the INTENT first — is the quad the top landing of the Sheffield
      roof stair (in which case RENDER the landing slab, tag it into deckMeshes
      with {cell:'wrigleyville'}, and let deck-coverage assert it), or is it dead
      scaffolding from an earlier rooftop layout (in which case DELETE it from
      WALK_W and confirm the S0 roof is still reachable by its stair)? Do not
      guess — read the stair geometry and take PNGs from the roof and from
      Sheffield below.
  (2) Whichever way it goes, prove reachability: can the player actually walk
      onto those cells today? A steering-bot E2E from the S0 roof deck westward,
      sampling __hd.player.y, settles it.
  (3) THE STRUCTURAL FOLLOW-UP (the real prize): tools/deck-coverage.mjs CHECK L
      sweeps CH.allWalkRects() + the one data carve, so it sees every walk
      surface OUTSIDE the hard cells and none inside them. Cell walk data is
      already tabular (WALK_M in src/data/millennium.js, WALK_W in
      src/data/wrigleyville.js: rects, bands and quads) and 130 added
      __hd.cellProbe so cell surfaces are measurable without activating the cell.
      Extend CHECK L over the cell walk tables — every interior cell of every
      cell walk quad must have something RENDERED at its walk height. That is the
      last unguarded direction in the game, and this bug is the proof it needs
      guarding. Ship it as a hard fail with a teeth test (the inject-snippet
      pattern in the tool header).
  (4) Everything stays green: walkprobe exit 0 including all six shell-out
      guards, draws <= 480 at affected waypoints, determinism unmoved.
refs:
  - autopilot/done/130-deck-ledges-and-coverage-sweep.md (the census + the probe)
  - src/data/wrigleyville.js (WALK_W, R.sheffLanding), src/wrigley/rooftops.js
  - tools/deck-coverage.mjs (CHECK L, the tag contract, the `cell` field)
  - PITFALLS.md (the 128/130 blocks: a walkable surface needs assertions in BOTH
    directions)
---

130 closed the reverse direction everywhere the rect ledger reaches. The hard
cells are where it does not reach — and the first place anyone looked, there was
six square metres of nothing to stand on, nine metres above Sheffield.
