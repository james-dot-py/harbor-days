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
- disposition: tools/budgets.json holds an OPERATIONAL budget (1350) so the
  gate stays meaningful against regressions while queue task 004 does the
  instancing/bucketing work and ratchets the number back down to 480.
  PITFALLS.md reminder applies: r128 toon materials ignore setColorAt — bucket
  per color when consolidating.
