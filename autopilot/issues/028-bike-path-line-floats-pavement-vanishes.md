# 028 — Bike-path dashed yellow line renders ABOVE the walking path; grey pavement disappears

- area: trails/paths (global layering, not one spot — Lakefront Trail seam most
  visible)
- severity: MEDIUM-HIGH (live on playope.com; owner: "looks unnatural")
- found: 2026-07-17, owner playtest (verbal report)
- observed: the dashed yellow bike-lane line draws on top of the adjacent
  walking path while the grey pavement under/behind it disappears at certain
  angles. Classic depth-order/z-fight between stacked path decals.
- expected: pavement always solid; markings always sit ON their own pavement,
  never floating over a neighboring surface; no surface dropout at any camera
  angle.
- likely root cause: path layers (grey pavement, bike lane, dashed markings)
  at identical or near-identical y with unordered renderOrder/polygonOffset —
  depth-buffer ties resolve differently per angle.
- fix routed to: task 088 visual-truth pass (adds a mechanical layer-order
  assertion for ALL path/decal layers, then fixes ordering globally).

## RESOLVED — task 088 (2026-07-17)

Two deterministic ordering bugs, not (only) z-fights — both caught mechanically
by the NEW `tools/path-layers.mjs` guard (evidence: tools/shots/088-layers-before.txt):
1. TRAIL_SPUR (y 0.05) was EXACTLY coplanar with TRAIL_MAIN's bike ribbon
   (y 0.05) where they overlap at the [74,-340] branch — angle-dependent
   pavement dropout ("grey pavement disappears").
2. The yellow dashes (y 0.075) sat ABOVE every pavement, so where the spur cuts
   through the MAIN walking ribbon (y 0.062) the dashes drew ON the limestone
   while their own asphalt was covered — exactly the owner's report. Bonus find
   by the guard: the same float where TRAIL_MAIN skims the AIDS-garden loop
   tangentially at (111,120).
Fix (global, data-only): a STRICT Y-LADDER in `TRAIL_STYLE` — bike .050 < spur
.056 < dash .062 < loop/connector .068 < walk .074 (every overlapping pair
>=0.006 apart; a marking sits above its own asphalt and BELOW any crossing
pedestrian pavement, so crossings cover paint — the real-world read).
`path-layers.mjs` now runs inside walkprobe (the standard verify gate) and
fails on any coplanar/wrong-order overlapping pair. Verified by eye at the
junction + the trail seam (088-junction-after.png, 088-graze-after.png) and by
the new judged `trail-seam` waypoint. Spawn diff 0.189% (gate 0.828%).
