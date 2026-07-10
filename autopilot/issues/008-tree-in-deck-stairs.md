# 008 — tree grows through the sanctuary birdwatch-deck stairs

- severity: low-medium (hero-room polish — the deck is the sanctuary's
  payoff and its approach reads broken)
- evidence: owner report, 2026-07-09 ("there's a tree right in the middle of
  the stairs on the bird sanctuary platform"). Screenshot the stair approach
  before/after (tools/shot.mjs near the deck, ~x172 z−390 area).
- observed: a scatter-placed tree intersects the deck stair run (deck +
  stairs are world structure in structures.js buildSanctuary; trees are
  rng-scattered in src/props.js).
- expected: stair run and landing clear of trunks and canopy; fix via the
  props.js POST-rng tree filter (the tennis/Diversey-clear precedent —
  filters after rng draws, so zero determinism impact), with the clear-rect
  DERIVED from the SANCTUARY deck/stair data in chicago.js, not hardcoded.
- route: task 025, item 5.
- RESOLVED (task 025): props.js POST-rng tree filter now clears a rect DERIVED
  from SANCTUARY.deck (stair min-x−5 … deck.x1+8, deck.z0−3.5 … deck.z1+4 ≈
  x161–183, z−402…−390), covering the stair run, west approach and the east
  camera lane. Zero determinism impact (post-filter, same pattern as
  tennis/Diversey). Verified up the stairs in sanctuary-deck-f2: stair run and
  landing clear of trunks/canopy; the deck now reads as sited in a clearing.
