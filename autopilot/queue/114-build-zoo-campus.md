---
id: 114
area: lincolnpark
type: build
model: opus
turns: 140
title: Lincoln Park Zoo CAMPUS — the hero build: open gates, the Seal Pool, the Lion House, the brick armature
acceptance: >
  The zoo campus armature ships and is unmistakably Lincoln Park Zoo,
  replacing the 112 stub per the 111 coords. (1) PERIMETER + GATES: the
  fenced-but-FREE campus — ornamental perimeter fence (instanced
  posts/rails reuse), the EAST GATE off Cannon as the front door (arch /
  gate piers per the refs, honest "LINCOLN PARK ZOO · FREE SINCE 1868"
  register — park names stay real per RENAMES.md), at least one secondary
  gate per the 111 plan; gates OPEN — walk in, no ticket. (2) THE SEAL
  POOL: the historic central pool — stone-rimmed round/oval pool, rockwork
  haul-out, viewing rail (fenceRun), and SWIMMING SEALS: dark chibi-chunky
  bodies arcing through the water (pack-owned animated meshes, culled by
  distance — the NPC register, never a global instanced bucket), one
  hauled out. This is the postcard; frame it against the Lion House brick
  behind. (3) THE KOVLER LION HOUSE: the 1912 brick hall — long
  red-brick facade with arched entries + limestone trim per the refs,
  hand-modeled toon, glow windows; the lion YARD on its flank with a
  chibi-chunky lion visible (PITFALLS: small toon animals don't read — go
  chunky, cluster at the viewing edge). (4) CAMPUS FABRIC: brick/paver
  main loop path (pathSamples2 ribbons per the 111 plan, miter welds),
  planted beds, benches, a zoo directory board, habitat name plates
  (back-to-back FrontSide sign pairs); definePlace grading for
  inside-the-zoo ambience per the 111 plan (ducked lakefront ambience,
  distant animal calls — 100% synthesized, actx guarded). (5) WALKABILITY:
  paths/lawns walk, pool + yards carved honestly (data carve, anti-trap
  law); walkprobe rules + expects exit 0. (6) DETERMINISM: spawn shot
  ≈noise vs baseline; LOCAL seeds only; zero new InstancedMesh buckets;
  no shared-rng draws. (7) PERF: draws ≤480 at every zoo waypoint; NPC/
  animal meshes cull >145 m. (8) WAYPOINTS: lp-zoo-gate (the east gate
  arch, path leading in), lp-seal-pool (pool + rail + seals + brick hall
  behind), lp-lion-house (facade + yard) wired with the BRIEF's authored
  strings; `node tools/walkthrough.mjs --ids <affected>` green, every PNG
  personally Read and judged against expectation + refs, art-director
  standard. (9) `npm run build` one artifact; zero console/page errors;
  canary echoes.
refs:
  - refs/lincoln-park/BRIEF.md (§zoo campus — the ranked signature reads +
    animal-cast ruling) + refs/lincoln-park/ imagery (gate, pool, Lion
    House)
  - GEOGRAPHY.md Lincoln Park section (111 finals — campus coords, gates,
    building footprints)
  - src/character.js + src/framework.js (makeNPC/cull register — the
    pattern animal rigs follow), src/packs/ (plover/bird chibi precedents:
    chunky scale, clustered placement), src/structures.js (brick building
    + fenceRun vocab), RENAMES.md (person/park names real; no commercial
    marks)
  - PITFALLS.md (small toon animals don't read; village.js add() snapshot;
    camera-in-geometry — check gate/pool framings after siting; DoubleSide
    signs)
---

THE hero build — the moment the game gets animals. The Seal Pool is the
signature: every Chicago kid has leaned on that rail. Get three reads
right and the campus is unmistakable: the open gate (free zoo — walking
in is the point), dark seal bodies moving in water in front of red brick,
and the Lion House's arch rhythm. Chibi-chunky over realistic; motion
over count (two seals that ARC beat six that float). Leave the rest of
the cast to 115 — this task is the armature plus the two marquee
habitats, done to the art-director bar.
