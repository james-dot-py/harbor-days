# 021 — Millennium skyline/streetwall reads generic (fresh-eyes fidelity note)

- severity: LOW (evocation still passes; this is a fidelity ceiling, not a
  regression — the place is named instantly from the Bean/Crown/Pritzker/BP)
- evidence: task 048 evocation dry-run (fresh-eyes subagent, 2026-07-11) named
  "Millennium Park, Chicago" with NO hesitation and recognized every signature
  landmark, but flagged: the Michigan Ave streetwall + the north Randolph giants
  read as "flat tan/beige boxes" — a local could not name the Prudential white
  slab, the Aon white shaft, or Two Pru's diamond top from the game.
- observed: STREETWALL_M (task 041) reads as a continuous downtown canyon face
  (its mp-streetwall expectation IS met), and BACKDROP_M.giants (task 044) DO
  carry distinct styles (sign-slab / diamond-spire / white-fins / glass) — but at
  the deliberate ~0.55-0.6x "skyline-billboard register" (a RECORDED LIBERTY per
  the data comment), and in the promenade framings the giants are largely
  tree-occluded. Net: recognizable as "a downtown backdrop," not as named towers.
- expected (if pursued): nudge the 3-4 hero giants toward readable silhouettes —
  the PRUDENTIAL letterform on One Pru, a taller/whiter Aon shaft, a crisper
  diamond crown on Two Pru — and/or thin the promenade tree line so the north
  dead-end view showcases them. Keep the billboard-register scale (1:1 downtown
  towers would dwarf the park); this is about SILHOUETTE legibility, not size.
- route: NOT a 048 blocker (intentional liberty + evocation passed). For the
  Millennium sign-off (task 053) to weigh, or a dedicated backdrop-polish task.
  NB: the peristyle gap the same critic flagged is already owned by task 050
  (Wrigley Square Monument).
- 053 SIGN-OFF WEIGHED IT (2026-07-11): confirmed against two authored
  expectations (mp-promenade / mp-great-lawn named-tower clauses read only as
  generic pale giants from the allee/lawn — tree occlusion + frame crop; the
  content EXISTS: PRUDENTIAL signTex + diamond-spire cone + Aon fins in
  src/millennium/streetwall.js, and the diamond top reads from the BP bridge
  f1). The independent 053 evocation reviewer corroborated ("skyline is
  generic... none of the rooflines Chicagoans navigate by") while still
  grading the area unmistakable/yes-instantly. Ruled NON-BLOCKING per this
  issue's own analysis; actionable fix now owned by queue task 056
  (millennium-evocation-polish, items 3-4).
- 056 ADDRESSED + ROOT-CAUSED THE NAMING CEILING (2026-07-12, autopilot): the
  giant silhouettes are now materially individuated at the billboard register —
  ONE PRU carries a bold dark PRUDENTIAL crown band, TWO PRU a big BOLD DARK
  4-sided diamond spire (0x6f7a8e, r18 h54) + tall antenna, AON a COOL-white
  DEEP-fluted monolith (4 wide fins + bold ACC reveals, cool white so it
  separates from the warm skyline billboard behind it). Verified up close all
  three rooflines read unmistakably. The Chase allee's 2 northernmost trees were
  thinned so mp-promenade f0 opens onto the skyline band. **AON now reads as a
  nameable fluted white monolith from the great lawn (best in mp-great-lawn f1).**
  RESIDUAL CEILING (now diagnosed, still LOW/non-blocking): the two authored
  *near-level* framings can't present the tall crowns big-and-clear — (a) the
  WORLD CURVE sinks the promenade dead-end giants below the horizon (a low band,
  no tall towers — confirmed by a pitched diagnostic), and (b) mp-great-lawn /
  pritzker f0 are near-level (pitch ~0.05) so the tall giant CROWNS (diamond at
  y≈166-220) sit above the frame; only the full-height Aon fluting survives, and
  only faintly at ~150 m. Neither the billboard-register silhouette nudge nor
  tree-thinning (this issue's prescribed levers) can lift the crowns into those
  framings — that needs a framing pitch-up (out of scope) or shorter giants
  (breaks winsZ rng-order determinism). Net: the skyline is no longer "flat pale
  boxes" and now carries the rooflines Chicagoans navigate by; full
  name-at-a-glance from f0 remains a structural ceiling. The diamond additionally
  reads from BP-bridge-crest f1 (053 SIGNOFF).
