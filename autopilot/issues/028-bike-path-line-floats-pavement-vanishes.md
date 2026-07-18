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
