# 000 — draw calls exceed the 480 budget across today's world (pre-autopilot)

- severity: medium (perf debt; 60fps mid-phone target at risk in the hot views)
- found: 2026-07-07, Phase 2 harness bring-up — the FIRST per-waypoint draw-call
  measurement ever taken (the __hd.perf() probe is new)
- evidence: tools/shots/run-mrbjrqz2/report.json — 59 of 144 framings over 480;
  max 1298. Worst offenders: wv-marquee (all framings ~1100–1298), wv-scoreboard,
  wv-gate-* (~900–1100), wv-rooftop-view (700–947), wv-statue-row (704/838),
  wv-gallagher-way (560–751); lakefront: spawn north-facing 752, garden/rocks
  views 500–700. Headless fps (SwiftShader, advisory) sags to 36–55 in those.
- expected: CLAUDE.md hard constraint 3 — scene draw calls ≤ ~480 worst case.
- observed: the Wrigleyville cell and the grown lakefront both exceed it; the
  budget predates Wave 4 content and was never re-measured per-view.
- disposition: tools/budgets.json holds an OPERATIONAL budget so the
  gate stays meaningful against regressions while the ratchet tasks do the
  instancing/bucketing work and walk the number back down to 480.
  PITFALLS.md reminder applies: r128 toon materials ignore setColorAt — bucket
  per color when consolidating.

## Ratchet pass 1 (task 004, 2026-07-08)

Max dropped 1298 → ~964 (deck-1-f1; run in tools/shots/, see budgets.json
"measured"). What did it: `mergeCellStatic()` (src/cells.js) bakes each cell's
static builder meshes into per-material × 120 m z-band merges (lakefront +
wrigleyville roots), and the chibi rig went 13+ meshes → 10 (merged leg+shoe,
arm+hand, head+cheeks, hair extras folded into one hair mesh; hands stay live
empty Groups for held props). Animated builder content is exempted via
userData.live / material.userData.timeAnim (water, bobbers, dog, fielders,
W flag, trains).

Remaining offenders, attributed with `node tools/census.mjs` (hot views
deck-1-f1 / zone-diversey-point-f1 ≈ 900–970):
- chibi crowds: 10 draws × ~34 rigs in frustum ≈ 350 draws (next: merge eyes,
  fold hair into head — they bob in lockstep, instance the shadows).
- pack-added statics that land on scene AFTER endCellCapture and so escape the
  cell merge: 27× skin spheres (swimmer heads), 22× white planes, 18× gray
  spheres at deck-1.
- statue chibis (cell-*/chibi rows) are fully static but exempted by the
  'chibi' name guard.
Queue task 007-draw-call-ratchet-2.md carries these levers.
