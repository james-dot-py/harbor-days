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

## RESOLVED (062, 2026-07-12)

Fixed the CLASS, exactly as scoped. The suspicion was right: the deck's walk
data was a union of stride-2 rotated segment rects, which leaves wedge-shaped
blocked slivers on the OUTSIDE of every bend — each one a "stopped for no
reason" moment. Walkability now derives from the SAME curve as the geometry:
`catmullChain()` in src/data/millennium.js replicates the deck's
THREE.CatmullRomCurve3 sampling exactly (verified to 1e-9 against a hand
Hermite), and the new `band` walk kind is point-to-polyline distance ≤ 2.35 m
over the dense samples with circular caps at joints — one continuous lane over
the full arc, no rect union at all. Balustrade colliders keep 0.25 m off the
lane edge (parapet inner face at 2.6). Nichols Bridgeway got the same band law
(hw 1.4, y pinned to node segments). Verified with a steering bot
(tools/tmp-crossbot.mjs) holding forward across the full crossing BOTH
directions: done=true, stalls=0 both ways, y rising 0→5.04 continuously
(y-continuity < 0.35 asserted per sample); same green for Nichols up/down.
Walkprobe now asserts centerline + ±1.9 m walkable at every dense sample,
permanently.
