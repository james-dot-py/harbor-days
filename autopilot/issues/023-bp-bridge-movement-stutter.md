# 023 — stopped every few meters crossing the BP bridge to Maggie Daley

- severity: high (the brand-new crossing is barely usable — movement halts
  repeatedly along the deck)
- evidence: owner playtest 2026-07-12 ("I'm also being stopped every few
  meters on the bridge to maggie daley").
- observed/suspected: the serpentine deck is built as curve-following
  segments; the walk rects/colliders per segment likely leave sliver gaps
  at the joints (blocked slivers between adjacent rects) or the balustrade
  colliders pinch into the walkable lane on the curve's inside edge —
  either reads as "stopped every few meters."
- expected: fix the CLASS — deck walkability derives from the SAME curve
  the geometry uses (one source of truth: walkable = within half-width of
  the curve for the full arc-length, not a union of rectangles), and
  balustrade colliders stay outside that lane by a margin; verify with an
  act.mjs hold-forward run across the full crossing BOTH directions
  asserting continuous displacement (no frame where speed drops to zero).
- route: task 062, owner punch-list item (0b).
