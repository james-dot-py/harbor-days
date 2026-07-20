---
id: 111
area: lincolnpark
type: layout
model: fable
turns: 120
title: Lincoln Park LAYOUT — GEOGRAPHY.md first: the west crossing + compression rulings, then staged chicago.js data + the plan for 112-117
acceptance: >
  (1) GEOGRAPHY.md gains a "Lincoln Park, z +403…≈south edge" section (the
  law: GEOGRAPHY.md FIRST, then data), citing game coords from
  refs/lincoln-park/osm.json: extend the street table south (Wrightwood
  2600 N ≈ +603, Fullerton 2400 N ≈ +805, Webster 2200 N ≈ +1006, Armitage
  2000 N ≈ +1207 — raw values; the compression ruling below may pull them
  in), new map bounds + WORLD_CLAMP + minimap MAP values (documented as
  FINAL numbers 112 applies ONCE), and positions for the anchor set —
  Diversey Harbor inlet + its lagoon channel running south under Fullerton
  along the zoo's east flank, Theater on the Lake at the Fullerton
  lakefront, the zoo campus (perimeter, gates, the Seal Pool, Kovler Lion
  House, ape house, Farm-in-the-Zoo, carousel), the conservatory + formal
  garden + Bates fountain at Fullerton/Stockton, South Pond + the Nature
  Boardwalk ring + Café Brauer + the honeycomb pavilion, and the Lakefront
  Trail continuation south from its current end (30,406). (2) RULE ON THE
  TWO STRUCTURAL FIRSTS and record both as standing liberties with measured
  numbers: (a) THE WEST CROSSING — the map's first land west of LSD: the
  berm/road strip stays x 0–14 running south, the park panel opens at
  negative x, the L backdrop + Lakeview band RELOCATE to the new west edge
  for the southern band (the L is already a recorded liberty — rule where
  it runs), and the FULLERTON UNDERPASS becomes the map's first WORKING
  crossing of the Drive (the Belmont/Addison/Irving/Montrose gates stay
  fenced dead-ends; this one opens — rule whether Diversey gets a second
  crossing). (b) THE SOUTH/WEST COMPRESSION — cite the 084 precedent and
  the Montrose east-reach liberty: the raw west reach (LSD → Stockton,
  measured by 110) and the raw south reach (corner → Armitage ≈ +1210)
  will likely not fit a sane frame at 1:2; compress distance, keep
  topological ORDER (lake — trail — LSD — channel/lagoon — Cannon — zoo —
  Stockton — conservatory), and keep the walk Diversey→zoo→South Pond free
  of 084-class blank stretches. (3) RULE THE RENAMES: add ledger lines for
  any commercial marks 110 flagged (the Peoples Gas pavilion, the AT&T
  carousel → generic/pun in-game names); person/donor names (Kovler,
  Regenstein, Brauer, Bates) recorded as KEPT. (4) STAGED DATA in
  src/data/chicago.js: new exported consts only (LINCOLN zones/props
  tables, the harbor-channel + pond coast/water polylines, zoo perimeter +
  gate + building-footprint tables, trail + interior-path polylines, the
  boardwalk ring) — NOTHING consumed by builders yet, so the world stays
  BIT-IDENTICAL this task (spawn shot at canonical params ≈noise vs
  baseline.png — that gate proves no rng/layout drift). Data pure,
  node-importable, no rng at import time. (5) THE DETERMINISM/BUILD PLAN
  written into the GEOGRAPHY section or a BUILD-PLAN block in
  refs/lincoln-park/BRIEF.md, binding 112-117: (a) every new coast/water
  piece (harbor channel, lagoon, South Pond, any lakefront re-cut south of
  the corner) is its OWN deterministic piece KEPT OUT of shared COAST_SEGS
  with its own walkability SEGS (COAST_TIP / Montrose-stub precedent) — NO
  shared world rng shifts; (b) all trail/path extensions are NEW ribbons
  registered via pathSamples2 — never reshape TRAIL_MAIN (pathSamples is
  PHASE-sensitive, PITFALLS); (c) all new scatter uses LOCAL seeds; (d)
  ZERO new InstancedMesh buckets (r128 instanced buckets draw in EVERY
  view; the millennium worst view sits at 478/480): reuse existing buckets
  and fold one-off geometry into the static merge pool — any exception
  named + justified with its global cost; (e) ANIMALS use the NPC/pack
  register (per-mesh, culled >145 m — the makeNPC precedent), never global
  instanced buckets; plan the zoo's definePlace grading (ambience cell)
  here if used. (6) tools/walkprobe.mjs gains staged lincolnpark rules +
  expects (pure data mirror, exits 0) where testable pre-build; the final
  lp-* waypoint STAND list (positions, feature targets, framing hints per
  the camera-math doctrine — interiors and the underpass need axis-aligned
  framings) + final expectation strings staged in refs/lincoln-park/
  BRIEF.md under "WAYPOINTS (final)" — do NOT write
  tools/waypoints.expect.json yet (112 wires them). (7) Verify: `node
  tools/walkprobe.mjs` exit 0; `npm run build` emits exactly one
  dist/index.html; canary-verified own-vite spawn shot at canonical params
  diffs ≈noise vs baseline.png; zero console errors; every PNG personally
  Read.
refs:
  - refs/lincoln-park/osm.json + BRIEF.md (110 output — read first)
  - GEOGRAPHY.md (header grid; the corner-wrap + south-lawn section this
    extends; the 084 COMPRESSION section — the compression precedent; the
    Montrose x-frame/east-reach block — the mirror liberty; "Future
    growth: South" gate note)
  - src/data/chicago.js (LAND south edge, FENCES, WORLD_CLAMP zMax 408,
    minimap MAP — the constants whose FINAL values this task fixes and 112
    applies), src/coast.js (tier machinery), src/sky.js (Lakeview band /
    L backdrop — the strip that must relocate west)
  - RENAMES.md (the ledger this task extends)
  - PITFALLS.md (pathSamples phase sensitivity; instanced buckets are
    GLOBAL draws; walkprobe/engine sharing; small toon animals don't read)
---

Judgment task: this file fixes the coordinate truth every Lincoln Park build
cites, and it carries TWO structural firsts — land west of the Drive, and a
working underpass. Get the RELATIVE arrangement right (§5.4): the channel
harbor west of LSD with Theater on the Lake alone on the lakefront; the zoo
a fenced-but-open campus between Cannon and Stockton; the conservatory NW
of it across Fullerton; South Pond hanging off the zoo's south end with the
boardwalk ring around it and Café Brauer at its NW shoulder. Editorial
compression of both reaches is allowed so long as that order survives.

Sequencing note for the plan: 112 applies the bounds/clamp/minimap flip and
regenerates baseline.png ONCE (canonical recipe, pill-free crop check);
113-117 then diff against the fresh baseline. Lay the water bodies and the
zoo out as named independent pieces so each build task owns its patch
without touching the others' rng.
