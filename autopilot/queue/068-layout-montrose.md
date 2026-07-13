---
id: 068
area: montrose
type: layout
model: fable
turns: 120
title: Montrose LAYOUT — GEOGRAPHY.md first, then staged chicago.js data + the determinism/build plan for 069-073
acceptance: >
  (1) GEOGRAPHY.md gains a "Montrose, z −850…≈−1400" section (the law:
  GEOGRAPHY.md FIRST, then data), citing game coords from
  refs/montrose/osm.json: extend the street table (Montrose Ave 4400 N ≈
  z −1200; Wilson 4600 N ≈ z −1400 if the beach needs it), new map bounds +
  WORLD_CLAMP + minimap MAP values (documented as FINAL numbers 069 applies),
  and positions for the anchor set — Cricket Hill (inland west, an analytic
  MOUND), Montrose Harbor basin + its SOUTH mouth + west-shore docks/launch +
  Park Bait, the HOOK pier curling off the Point, Montrose Point + the Magic
  Hedge hedgerow + meadow + sanctuary paths, Montrose Beach cove + beach
  house + The Dock + the DUNES natural area at the beach's SE end, the
  LSD/Lakeview-band/backdrop continuation, the Montrose Ave underpass gate,
  and the dual Lakefront Trail routing north from its current end. RULE ON
  THE PLOVER TENSION from the 067 brief and record it (recommend: the real
  story lives at the dunes — Imani-generation plovers + roped nest area —
  while the shipped dog-beach Monty & Rose pen stays as a recorded liberty
  or is retired; either way write it under standing liberties). Record the
  EAST-REACH editorial compression as a standing liberty with the measured
  real numbers (the Point's tip may not fit 1:2 within a sane xMax — keep
  topological ORDER per §5.4, compress distance). (2) STAGED DATA in
  src/data/chicago.js: new exported consts only (MONTROSE zones/props
  tables, the new coast PIECES' polylines + tier profiles, trail-extension
  polylines, the Cricket Hill mound model, fence/gate data) — NOTHING
  consumed by builders yet, so the world stays BIT-IDENTICAL this task
  (spawn shot at canonical params matches baseline.png; that is the gate
  that proves no rng/layout drift). Data must be pure, node-importable, no
  rng at import time. (3) THE DETERMINISM PLAN, written into the GEOGRAPHY
  section or a BUILD-PLAN block in refs/montrose/BRIEF.md, binding 069-073:
  (a) every new coast piece (revetment stretches, harbor basin + mouth,
  Point wrap, beach cove, north closure) is its OWN deterministic piece
  KEPT OUT of shared COAST_SEGS with its own walkability SEGS — the
  COAST_TIP precedent — so NO shared world rng shifts; (b) the Lakefront
  Trail extension is a NEW ribbon starting where the old ends, registered
  via pathSamples2 (merged after buildProps) — NEVER reshape/extend
  TRAIL_MAIN's polyline (pathSamples is PHASE-sensitive, PITFALLS); (c) all
  new scatter uses a LOCAL xorshift/mulberry seed, never the shared rng;
  (d) ZERO new InstancedMesh buckets — r128 instanced buckets draw in EVERY
  view and the millennium worst view sits at 478/480, so each new global
  bucket busts the game-wide gate: reuse existing buckets (terraces, piles,
  tufts, trees, towels, boats, fence posts/rails, globe lamps) whose
  instance counts may grow, and fold new one-off geometry into the static
  merge pool with colors already in the pool (the lakefront draw-call
  folding pattern); any exception must be named + justified in the plan
  with its global cost. (4) CRICKET HILL's analytic surface: design the
  shared mound model (center, radius, height ~7, profile function) as data
  + a surfaceY/walkability rule that BOTH the engine and tools/walkprobe.mjs
  will import from chicago.js/coast.js (never fork the two) — the beachH
  slope precedent, but a walkable summit. (5) tools/walkprobe.mjs gains
  staged montrose rules + expects (pure data mirror, exits 0) where testable
  pre-build; the final mt-* waypoint STAND list (positions, feature targets,
  framing hints per the camera-math doctrine) + final expectation strings
  staged in refs/montrose/BRIEF.md under "WAYPOINTS (final)" — do NOT write
  tools/waypoints.expect.json yet (gen-waypoints fails loudly on expect ids
  matching no waypoint; 069 wires them). (6) Verify: `node
  tools/walkprobe.mjs` exit 0; `npm run build` emits exactly one
  dist/index.html; canary-verified own-vite spawn shot at canonical params
  diffs ≈noise vs baseline.png (bit-identical world); zero console errors;
  every PNG personally Read.
refs:
  - refs/montrose/osm.json + BRIEF.md (067 output — read first)
  - GEOGRAPHY.md (header grid + golf/sanctuary sections — the strip this
    extends; "Future growth" note; the COAST_TIP + TRAIL_LOOP_GHOST
    determinism precedents are documented in the harbor sections)
  - src/data/chicago.js (LAND north edge z −812, FENCES.north z −812,
    WORLD_CLAMP zMin −822, minimap MAP — the constants whose FINAL values
    this task fixes and 069 applies), src/coast.js (tier/beachH machinery)
  - PITFALLS.md (pathSamples phase sensitivity; instanced buckets are
    GLOBAL draws; walkprobe/engine sharing)
  - Memory notes in the session context: lakefront draw-call folding,
    cell-content draw-call folding
---

Judgment task: this file fixes the coordinate truth every Montrose build
cites, and — because this is the first contiguous map growth since v0.5 —
the determinism plan is the difference between "the map grew" and "every
towel on the Rocks moved." Get the RELATIVE arrangement right (§5.4): hill
west of the harbor, mouth at the harbor's SOUTH, Point NE with the Hedge on
it, hook off the Point, beach north-running with the dunes pinched between
beach and Point. Editorial compression of the Point's east reach is allowed
so long as that order survives.

Sequencing note for the plan: 069 applies the bounds/clamp/minimap flip and
regenerates baseline.png ONCE (canonical recipe, pill-free crop check);
070-073 then diff against the fresh baseline. Lay out the coast as named
independent pieces so each build task owns its stretch without touching the
others' rng.
