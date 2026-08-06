---
id: 136
area: montrose
type: polish
model: opus
turns: 60
title: Reserve likeness polish — the 131 evocation reviewer's three ranked gaps
acceptance: >
  Task 131's re-sign-off evocation review (fresh-eyes, refs/montrose plover
  photos) passed phase 1 at "Unmistakable" but ranked three ref-likeness gaps
  in the 129 inland reserve unit worth fixing. Close all three, each proven by
  a re-shot of its owning waypoint judged against the SAME refs:
  (1) VEGETATION DRIFT — the unit currently reads "fenced lawn with scattered
  cones": ground between clumps is the same bright park green as the mown lawn,
  no dead/brown thatch component, tufts are discrete ankle-high spikes. Make
  the roped interior read as a distinct plant community per ref
  2021,_Piping_Plover_Monitoring_...51351634568.jpg: denser/taller straw-blond
  marram mass mixed with last-year's brown tussock over green bases, bare sand
  showing through in irregular gaps, and a visibly different ground tone from
  the mown park outside the rope (a ground-tone patch INSIDE the perimeter is
  the likely lever — mind the 041 grade-carpet law and keep it walkable visual-
  only, the panne recipe). Determinism: grass/straw growth is local-seeded
  (0x129a11/0x129a22) so count/height/color changes are safe; do NOT touch
  GRASS_PATCHES (shared world rng — filtering its draws inside the reserve
  would shift the global call order; occlude, don't filter). +0 new
  InstancedMesh buckets; spawn diff must stay under the floor.
  (2) ROPE REGISTER — swap the reserve perimeter's chunky two-rail split-rail
  fenceRun for the signature Montrose barrier: slender stakes carrying 1-2
  SAGGING catenary ropes at waist height (the 072 dune rope is already closer —
  reuse its vocabulary), and shrink the billboard-scale keep-out panels to
  letter-size laminated placards zip-tied to the rope (blue-on-white), repeated
  along the corridor. The big MONTROSE BEACH DUNES NATURAL AREA gate signs may
  stay at the two gates (wayfinding earns scale); the cell-A PIPING PLOVER
  sign shrinks to the laminated register. Keep collide:false everywhere.
  (3) PLOVER LEGIBILITY — the birds' black collar + brow band and orange
  bill/legs must RESOLVE at the mt-exclosure framings (the pack consts exist;
  the marks under-resolve at current size/distance). Either scale the pair up
  toward the 072 plover scale (1.6 near the rope precedent) and/or site one
  bird within ~4-6 m of the cell-A rope on the corridor side, without
  violating the >=8-10 m monitor-exclusion rule relative to M1 — check the
  084 rule against BOTH monitors before siting. The scope beat's close-up
  payoff stays the hero read.
  Verify: walkprobe green, +0 buckets proven by an A/B census, spawn
  determinism diff clean, and mt-lawn-fill / mt-reserve / mt-exclosure /
  mt-overlook re-shot with every PNG read and judged against the refs — the
  goal is that a fresh look at mt-reserve answers "dunes", not "fenced lawn".
refs:
  - refs/montrose/SIGNOFF.md (131 record, evocation phase-2 verbatim)
  - refs/montrose/2021,_Piping_Plover_Monitoring,_Montrose_Beach_Dunes,_Chicago,_IL_(51351634568).jpg
  - refs/montrose/2021,_Early_Morning_Piping_Plover_Monitoring_at_Montrose_Beach_Dunes,_Chicago,_IL_(51352427705).jpg
  - GEOGRAPHY.md §The RESERVE EXPANSION (129)
  - src/data/chicago.js MONTROSE_RESERVE · src/packs/montrose-reserve.js
---

The 131 evocation reviewer (blind phase 1: "Unmistakable — Montrose
Harbor/Montrose Beach", the plover reserve named unprompted) ranked exactly
three likeness gaps worth fixing in phase 2 and explicitly waved off the rest
(flat topography, dome exclosure silhouette, invented platform, toon
saturation — acceptable stylization, do NOT chase those). A related phase-1
note to fold into gap 1: the GRASS_PATCHES lawn-mottle circles inside the
reserve read as "golf fairway greens" in the mt-lawn-fill frames — a distinct
interior ground tone kills that misread for free. Also noted for the record,
NOT in scope: the reviewer called the mt-gate portal "unfinished-looking"
(it matches the shipped Belmont/Addison/Irving sealed-portal register — an
idiom a blind reviewer can't know) and flagged the missing Montrose dog beach
(a standing scope/geography ruling — the game's dog beach is the Belmont
homage; the map's plover story lives at the dunes).
