---
id: 084
area: lakefront
type: feedback
model: fable
turns: 140
title: Montrose compression — shrink the golf gap, pull the shoreline in, back the birds off
acceptance: >
  Owner playtest (2026-07-16, verbatim): "It's way way too far away from
  the beaches south of it, make the golf course that separates them way
  smaller. Birdwatchers at montrose have birds like right on top of them.
  Way too much blank space, bring the shoreline in, fine if the whole map
  curves or whatever." Three moves, all layout-truth: (1) SHRINK THE GAP:
  Marovitz golf currently separates the old map's north end from Montrose
  at full 1:2 scale — re-cut it to a COMPACT VIGNETTE that still reads
  unmistakably as the golf course (a few signature holes, the starter
  kiosk, tees/pins/fence — evocation over acreage) and pull Montrose
  south accordingly; the owner has explicitly granted the geometric
  liberty ("fine if the whole map curves or whatever") — record it in
  GEOGRAPHY.md FIRST as a documented compression (the 009 Wrigleyville
  stretch precedent), then reshape via DATA ONLY (coast tables, zone
  rects, trail chain — coastQuery keeps render+walk lockstep). (2) BRING
  THE SHORELINE IN: the compressed stretch loses its blank interior — 
  narrow the land band, let the coast curve to close the visual distance,
  and make what remains earn its place (trail, revetment, planting — no
  anywhere-filler). The walk Belmont→Montrose should FEEL like one
  continuous lakefront: time it before/after and report the change.
  (3) BACK THE BIRDS OFF (Magic Hedge): birds currently perch on top of
  the birdwatcher NPCs — real birding is distance: exclude a radius
  (~8-10 m) around every watcher from the perch table, bias perches into
  the hedge thickets, watchers hold binocular poses AIMED at the actual
  perch zones (the read: people watching birds, not wearing them).
  CARE: this reworks signed-off original-map territory — determinism
  discipline at its strictest: data-driven reshapes, world-rng call order
  preserved or changes contained + documented, baseline regenerated
  [baseline-regen], every affected waypoint re-derived from data and
  re-judged (golf vignette read, hedge birding read, the new
  coast-curve read, Montrose beach arrival), walkprobe + gridsweep green
  over the reshaped band, zones/berm/underpass gates stay continuous,
  minimap + MAP bounds updated, draw budget holds. Both inputs; deploy
  proves the walk.
refs:
  - the owner feedback note (feedback/processed, 2026-07-16 — verbatim source)
  - GEOGRAPHY.md (amend FIRST — the compression liberty)
  - src/data/chicago.js (golf/coast/trail/zone tables), src/coast.js
  - the 069-075 Montrose close-outs + refs/montrose-* (what was built where)
  - autopilot/queue/done/009-layout-widen-wrigley.md (documented-liberty precedent)
---

The owner just granted the most valuable currency a map can get: license
to bend geography in service of feel. Spend it well — the 1:2 rule was
always a means to "feels like really being there," and a twenty-minute
walk of blank grass is the opposite of that. Golf compresses to a
postcard of itself; the coast curves; the beaches become neighbors.
Measure the before/after walk time and put it in the result — that
number IS the acceptance.
