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
