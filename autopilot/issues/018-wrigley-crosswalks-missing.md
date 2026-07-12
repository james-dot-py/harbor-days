# 018 — Wrigleyville crosswalks are just sidewalks

- severity: medium (street-truth item — intersections are the most-walked
  geometry in the cell)
- evidence: owner playtest, 2026-07-11 ("In wrigley the crosswalks are just
  sidewalks, they should be actual crosswalks").
- observed: intersection crossings render as plain sidewalk-colored strips —
  no crosswalk markings.
- expected: Chicago-standard continental/zebra bar markings on the asphalt
  at every real crossing, axes derived from the wrigleyville.js street
  tables, subtle wear so they read painted-on-asphalt; whole set instanced/
  merged (~1-2 draws).
- route: task 052, item 2.
- REOPENED (2026-07-12, owner screenshot
  refs/inbox/owner-issue-018-reopen-crosswalk-sidewalk-slabs.png): 052's
  crosswalks render as raised SIDEWALK-material slabs laid across the road
  (pink/cream sidewalk tiles with dark joints) — "there are still
  sidewalks on top of where there should be crosswalks." A crosswalk is
  PAINT: flat white bars flush on the asphalt, asphalt visible between
  bars, no slab edges, no sidewalk material. Re-route: task 063.
