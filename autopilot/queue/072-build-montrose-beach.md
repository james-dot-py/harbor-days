---
id: 072
area: montrose
type: build
turns: 130
title: Montrose Beach — the big sand, the dunes + plovers, beach house, The Dock
acceptance: >
  The beach stretch reads as the city's big wild beach per refs/montrose/:
  (1) SAND: the beach cove's coast piece replaces its 069 stub — a broad
  walkable sand sweep off the Point's north side per the 068 geometry,
  using the established beach machinery (coast.js beachH-style data slope,
  shared by engine + walkprobe); towels/umbrellas/beach life REUSE the
  existing instanced prop buckets with local-seeded scatter (zero new
  InstancedMesh buckets). (2) THE DUNES: the natural area at the beach's SE
  end abutting the Point — dune grasses (existing tuft buckets), sand
  rises, a low rope/post fence line (fenceRun buckets) with the interior
  NOT walkable, and the PLOVER story per the 068 ruling (roped nest area,
  plover pair + chick props/NPCs, honest small signage — Great Lakes
  Piping Plover register; implement exactly what 068 recorded, including
  any dog-beach reconciliation it ruled). (3) BEACH HOUSE: the Montrose
  beach house likeness per refs (massing + palette honest to the photos,
  merged statics, atlas-folded signage). (4) THE DOCK AT MONTROSE BEACH:
  the beach bar likeness at its real end of the beach (bar-likeness
  register — canvas signage, umbrellas, no interior required); plausible
  beach NPCs (makeNPC ope lines). (5) DETERMINISM: only this stretch's own
  pieces + local seeds; canonical spawn shot ≈noise vs baseline.
  (6) WALKABILITY: sand + paths walk per shared data; dune interior +
  roped plover area blocked without collider-ring traps (065 law);
  walkprobe rules + expects, exit 0. (7) WAYPOINTS: mt-beach (the sand
  sweep + beach house), mt-dunes (grasses + rope line + plover read),
  mt-dock or equivalent per the BRIEF's authored strings, wired + expects;
  walkthrough green, draws ≤480 everywhere checked, every PNG personally
  Read and judged vs expectation + refs. (8) `npm run build` one artifact;
  zero console/page errors; canary echoes.
refs:
  - refs/montrose/BRIEF.md + osm.json + fetched beach/dunes/plover imagery
  - GEOGRAPHY.md Montrose section (068 — including the plover ruling and
    the dog-beach reconciliation, binding here)
  - src/data/chicago.js + src/coast.js (dog-beach beachH precedent — the
    machinery to reuse at scale), src/structures.js (likeness patterns)
  - PITFALLS.md (own-piece determinism; collider-trap law; word-sign laws;
    instanced buckets global)
---

The beach's job in the composition is BREADTH — after the harbor's masts and
the Point's intimacy, mt-beach should open up: long sand, low horizon, the
beach house anchoring the far end. Keep the dunes corner quiet and
protective (the plover story is cozy, not a zoo exhibit): rope, grasses, two
small birds, one honest sign.
