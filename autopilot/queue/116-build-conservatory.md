---
id: 116
area: lincolnpark
type: build
turns: 120
title: The CONSERVATORY + formal garden — Victorian glass, Storks at Play, Grandmother's Garden
acceptance: >
  The conservatory block at Fullerton/Stockton ships per the 111 coords and
  reads as the real place. (1) THE CONSERVATORY: the Victorian glasshouse —
  the tall arched PALM HOUSE front-and-center with its curved glass
  profile, flanking lower wings per the refs, hand-modeled toon: pale
  green-white ironwork frame, glass panes with a warm green-tinted glow
  (interior palms READ as silhouettes through/above the glass — canopy
  shapes inside the ridge line; no walkable interior this task, door glow
  only, recorded as a 111-plan decision), name lettering per RENAMES.md
  (park names real). Footprint carved, colliders anti-trap-clean.
  (2) THE FORMAL GARDEN south of it: the axial bed layout per the refs —
  clipped lawn panels, ribbon flower beds (reuse existing flower/tuft
  buckets, LOCAL seeds), and the BATES FOUNTAIN ("Storks at Play"): round
  basin, the bronze-green herons/boys group as a chunky toon silhouette,
  spray via the existing fountain/particle vocabulary (Crown Fountain /
  Millennium precedents — reuse, don't fork). (3) GRANDMOTHER'S GARDEN
  west across Stockton per the 111 plan: looser cottage-style beds in
  lawn — a palette contrast with the formal side. (4) PATHS: garden
  walks + the Stockton crossing per the 111 plan, pathSamples2, miter
  welds, no dead ends into the beds. (5) WALKABILITY: walkprobe rules +
  expects exit 0; fountain basin carved. (6) DETERMINISM: spawn shot
  ≈noise vs baseline; LOCAL seeds; ZERO new InstancedMesh buckets
  (glasshouse framing folds into the static merge pool; any exception
  named + justified per the 111 plan). (7) PERF: draws ≤480 at every
  affected waypoint. (8) WAYPOINTS: lp-conservatory (the Palm House
  arch + garden axis foreground — check the framing puts the glass
  against sky, not buried in canopy) and lp-bates (the fountain + beds,
  glasshouse behind) wired with the BRIEF's authored strings; `node
  tools/walkthrough.mjs --ids <affected>` green, every PNG personally
  Read and judged against expectation + refs, art-director standard.
  (9) `npm run build` one artifact; zero console/page errors; canary
  echoes.
refs:
  - refs/lincoln-park/BRIEF.md (§conservatory — the glass profile +
    garden axis reads) + refs/lincoln-park/ imagery (Palm House, Bates
    fountain, garden beds)
  - GEOGRAPHY.md Lincoln Park section (111 finals — footprints + the
    Stockton line)
  - src/structures.js + src/villages/merge pool (glass/frame statics),
    the Millennium fountain/spray vocabulary (reuse precedent),
    src/data/chicago.js flower-bed vocab
  - PITFALLS.md (mixed attribute sets silently drop merge buckets — give
    hand-built strips a uv attribute; camera-in-canopy trap — verify the
    lp-conservatory framing clears the garden trees)
---

The conservatory is the pipeline's most architectural read: a GLASS
building in a game whose vocabulary is brick and clapboard. The win
condition is the Palm House profile against sky — the tall arched
center with palm silhouettes inside the glass. Warm glow at the panes,
green-white frame, and the fountain's spray animating the garden axis.
If the interior-palms-through-glass read fights the toon shader, palms
ABOVE the ridge line (poking through an open lantern) is an honest
fallback the real building supports.
