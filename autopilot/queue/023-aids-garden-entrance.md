---
id: 023
area: lakefront
type: feedback
model: fable
title: AIDS Garden entrance — real monument sign, corrected paths, spawn at the front
acceptance: >
  Owner direction (2026-07-09) with two references in refs/aids-garden/ —
  LOOK at both images. (1) MONUMENT SIGN (entrance-monument-sign.jpg): build
  the real entrance monument at the front of the park — a low wide grey
  concrete/granite wall with 'AIDS Garden Chicago' in gold letters, scattered
  bronze ginkgo-leaf plaques (one merged geometry or one InstancedMesh — not
  per-leaf draws), a rough granite boulder leaning against the wall mid-span,
  two white limestone sitting blocks on a decomposed-granite forecourt, and
  prairie-grass planting flanking it; globe lamps already exist nearby —
  reuse, don't duplicate. Hand-modeled toon via toon()/curveMat; no texture
  maps. (2) SIGNAGE DEDUPE: the monument becomes the ONLY 'AIDS Garden'
  signage in the game — remove the standard SIGNS entry (chicago.js ~L364,
  {text:'AIDS GARDEN', x:95, z:60}) and any other generic plate naming the
  garden. (3) PATH STRUCTURE (aerial-path-structure.jpg; owner: "the correct
  structure for the path leading to the lake from the entrance, and the path
  around the green statue"): the game today draws a CLEAN r=16 circle centred
  on the Haring statue (chicago.js ~L233) — the aerial shows the real shape:
  an elongated loop around the statue lawn plus the entrance path running
  down to meet the shoreline trail. Judge the aerial and reshape via
  DATA-ONLY changes in the chicago.js path tables; derive coords from
  existing anchors (Haring 95,120; garden x60-130 z60-180); if
  refs/belmont-harbor has osm.json path geometry, prefer it; update walkprobe
  expects for every changed surface; keep the Belmont-connector junction
  (paths.js ~L54) welded. (4) SPAWN AT THE FRONT: the player now spawns on
  the entrance forecourt by the monument, facing into the park along the
  statue axis. Move CH.SPAWN.player AND CH.SPAWN.camera together (chicago.js)
  so the title swoop frames the monument + garden well, and fix the matching
  hardcoded mayor position (character.js ~L320, mayor.position.set(38.5,0,58))
  — cross-file stale-coordinate protocol: grep for other spawn-adjacent
  literals before calling it done. MEASUREMENT FIRST: add judged ag-*
  waypoints (tools/gen-waypoints.mjs + waypoints.expect.json, coords derived
  from data so they survive reworks) for (a) the spawn/entrance read facing
  the monument and (b) the statue-loop read; then build until honest
  expectations pass. Draw budget: tools/budgets.json is a ceiling.
  Determinism: no import-time rng; world scatter must not drift beyond the
  legitimately moved paths. Single-file build passes; desktop + mobile fine.
refs:
  - refs/aids-garden/entrance-monument-sign.jpg (the real monument — the ONE sign)
  - refs/aids-garden/aerial-path-structure.jpg (drone aerial - entrance-to-lake path + statue loop)
  - refs/aids-garden/README.md
  - src/data/chicago.js (SIGNS ~L364, garden loop ~L233, SPAWN, flower beds ~L314, Haring 95,120)
  - src/paths.js (~L54 Belmont connector), src/props.js (garden tribute L222, edging boulders L282)
  - src/character.js ~L320 (hardcoded spawn duplicate — stale-coordinate protocol)
---

This IS the former Belmont Rocks site — and with this task it becomes the
game's front door: the spawn moves here, so the monument is the first thing
every player ever sees. Spend fidelity accordingly. The ginkgo-leaf wall is a
memorial: model it with care — the leaves read as a quiet bronze scatter;
names not being legible at toon scale is fine and right. If the aerial's
exact curvature fights walkprobe or the Belmont connector, preserve the READ
(elongated loop around the statue, entrance path reaching the lake) over
exact curve fidelity. Spawn-flow check before sign-off: title -> swoop ->
walk off the forecourt toward the statue and toward the lake, both on
desktop keys and touch.
