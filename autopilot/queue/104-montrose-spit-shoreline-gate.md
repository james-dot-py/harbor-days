---
id: 104
area: montrose
type: fix
model: kimi
turns: 110
title: Montrose spit extends INTO the lake + shoreline self-intersection gate
acceptance: >
  Owner (2026-07-19, bug-reports/montrose-spit.png): the lakefront shoreline
  touches/overlaps itself; the spit with the lighthouse at Montrose Harbor
  curls back toward shore — in reality it extends OUT into the lake
  (eastward). Fix: (1) correct the spit geometry so it projects lakeward per
  the OSM source data (refs/montrose/osm.json if present; GOOGLE
  MAPS/IMAGERY BANNED — decision b; 084 granted geometric liberty but the
  owner has now stated the intent explicitly: lakeward). GEOGRAPHY.md FIRST
  per the standing rule. (2) Add a PERMANENT validation pass to the gate:
  the shoreline polyline must be simple (no self-intersections) — fail the
  build/gate if it isn't. Accept: self-intersection check passes on the full
  shoreline; screenshot from the spit shows it extending into open water
  with the lighthouse at the end. NOTE: this moves coastline — expect the
  determinism gate to flag relocated scatter; regen baseline.png and update
  affected waypoints in the same commit. The listed fixes are the must-haves; beyond them the owner grants judgment (2026-07-19: 'you can change things not listed if you see fit') — adjacent improvements are allowed where clearly right, with determinism + all gates green. Standard gates (the new check becomes one of them).
refs:
  - owner description only (2026-07-19: no screenshot exists — verify the
    self-intersection + spit orientation with tools/shot.mjs and the shoreline
    data BEFORE fixing)
  - refs/montrose/osm.json (if present)
  - GEOGRAPHY.md, src/data/chicago.js, src/coast.js
  - autopilot/queue/done/ (084 Montrose compression context)
---
