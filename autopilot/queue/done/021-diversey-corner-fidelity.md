---
id: 021
area: lakefront
type: feedback
model: fable
title: Diversey corner fidelity — match the owner's on-site photo set (Chevron, rocks, harbor mouth)
acceptance: >
  Owner shot a 6-photo on-site reference set (2026-07-08/09, GPS cluster
  41.9330 -87.6306 → game z≈372 south-corner lawn — exactly the CHEVRON
  landmark dot). Photos live in refs/diversey-corner/ with a README mapping
  each file to GPS / compass heading / subject; three subjects shot from
  multiple angles — triangulate, don't treat as six spots. Judge the existing
  build against them and close the gaps: (1) Chevron (data/chicago.js CHEVRON,
  structures.js buildChevron): the real sculpture is TWO-TONE — pale
  powder-blue tapered upper mast over a darker steel-blue base — with slender
  square-section crossing arms; verify proportions and color vs
  chevron-closeup-IMG_0389. (2) The limestone step revetment ("the rocks"):
  broad weathered blocks with green growth in the joints, a rubble/riprap toe
  at the waterline, and the small cove inlet (steps-cove-IMG_0394,
  steps-to-pier-IMG_0395) — reshape via coast DATA only (coast.js coastQuery/
  tierAt keep render + walkability lockstep; never fork geometry). (3) Seawall
  furniture: white pipe railing along the promenade edge, red life-ring posts
  on the harbor-mouth pier (0395/0398/0399). (4) The lawn: curving concrete
  path with benches FACING THE WATER plus the worn dirt desire path beside it
  (lawn-path-IMG_0398), scattered sitting-stone blocks (0396). (5) The
  harbor-mouth apron + finger docks read vs harbor-mouth-IMG_0399 (star docks
  exist — verify from this angle). MEASUREMENT FIRST: before content work, add
  judged dv-corner-* waypoints (tools/gen-waypoints.mjs +
  waypoints.expect.json) framing these five reads, coords DERIVED from
  chicago.js data (CHEVRON, COAST_CORNER_PARAMS) so they survive layout
  reworks, honest expectation strings; then build until they pass. Where the
  game already reads true, say so in the expectation rather than churning
  geometry. Draw budget: tools/budgets.json is a ceiling — instance/merge (the
  railing must be one instanced/merged mesh, not per-post draws). Determinism
  (no import-time rng; world scatter unmoved); walkprobe expects for any
  walkable-surface change; single-file build passes.
refs:
  - refs/diversey-corner/README.md (photo → GPS/heading/subject map; owner's own photos)
  - src/data/chicago.js (CHEVRON ~L501, COAST_CORNER_PARAMS L49, landmark dot x96 z372)
  - src/structures.js (buildChevron ~L336)
  - src/coast.js (coastQuery/tierAt — data-driven, render + walk lockstep)
  - tools/gen-waypoints.mjs + waypoints.expect.json (wv-street-* judged-waypoint precedent)
---

Owner walked the real place ("back to Belmont Rocks" in their words — the
stepped-stone shoreline character; GPS pins the set at the Diversey corner,
the south end of the map) and shot it specifically so we can tighten this
area. This is the south neighbor of the signature baseline view. The area
already exists in game (Chevron, terraces, pier, star docks), so this is a
fidelity pass, not new construction — judge honestly against the photos.
