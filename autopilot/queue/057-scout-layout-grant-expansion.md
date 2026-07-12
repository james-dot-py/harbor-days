---
id: 057
area: millennium
type: build
model: fable
turns: 120
title: SCOUT + LAYOUT — Grant Park expansion (Art Institute · Butler/Lolla · Maggie Daley · BP bridge crossing)
acceptance: >
  OWNER DIRECTIVE (2026-07-11): "expand millennium park to include the art
  institute, butler field with lollapalooza going on, and all of maggie
  daley park, with the bridge from millennium park fully built out." This
  task is the scout+layout for the whole expansion (one session — the 039/
  040 pattern compressed; builders are 058-061). (1) SOURCES: OSM extracts
  for the four zones (Art Institute block Michigan→Columbus south of
  Monroe; Butler Field east of Columbus Monroe→Jackson; Maggie Daley
  Randolph→Monroe east of Columbus; the BP bridge crossing) into
  refs/millennium-park/ (extend osm.json or sibling files) + Wikimedia
  imagery per POI (lions/facade, Lolla stage shots for the read,
  Maggie Daley play garden + climbing walls); the owner ribbon aerial
  (owner-skating-ribbon-northeast.webp) is already gold for Maggie Daley's
  NE quadrant. Google imagery banned as always. (2) GEOGRAPHY/BRIEF FIRST:
  extend the millennium sections with the researched layout at the cell's
  established scale + recorded liberties (the kiosk compression precedent);
  the BP bridge's real S-curve alignment is the connective tissue — get it
  from OSM, not eyeball. (3) LAYOUT DATA: extend src/data/millennium.js
  tables (zones, paths, masses, walk rules) for all four zones so builders
  058-061 are data-driven; the cell clamp grows east+south accordingly.
  (4) PERF STRATEGY — this doubles the cell: a written plan in the BRIEF
  for staying ≤480 draws with a festival crowd in the cell (zone/distance
  culling via the fogcull precedent, instanced crowds, merged statics per
  mergeCellStatic); name the worst-case sightline and its budget. (5)
  WALKABILITY: the issue-017 contract extends to the new footprint
  (definitive walkable() everywhere in the grown clamp; gridsweep tool
  covers the new area). (6) Waypoint plan listed for the builders (lions
  read, bridge crossing read, ribbon read, stage read). No world geometry
  ships in this task beyond data/doc/refs — builders own the meshes.
refs:
  - refs/millennium-park/ (BRIEF.md, OWNER-PHOTOS.md, osm.json, _anchor pattern)
  - autopilot/queue/done/039-scout-millennium-park.md + 040-layout (the pattern)
  - src/data/millennium.js, src/millennium/ (the cell to extend)
  - tools/mp-gridsweep.mjs (extend coverage), tools/budgets.json
---

Measure twice: four famous zones land in one cell, and the perf plan is the
difference between a festival and a slideshow. The BP bridge is the spine —
everything east hangs off getting its crossing right.
