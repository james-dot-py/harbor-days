---
id: 101
area: lakefront
type: fix
model: kimi
turns: 80
title: NPC path discipline — walkers on the walk path, riders on the bike path
acceptance: >
  Owner (2026-07-19): "NPCs mix up the walking path and biking path." The
  dual trail (asphalt bike + limestone walk) routes trail life
  (src/packs/traillife.js — joggers/cyclists/dog-walkers). Enforce at spawn
  AND during pathfinding: walking NPCs exclusively on the pedestrian path,
  cycling NPCs exclusively on the bike path — no crossover, including at
  junctions. Accept: add a walkprobe-style test that samples NPC positions
  over N seconds and asserts 0 walker positions on the bike-path polyline
  and 0 cyclist positions on the walk-path polyline (within path-width
  tolerance); the test joins the standard gate permanently. Do not change
  anything not listed here. Standard gates.
refs:
  - src/packs/traillife.js
  - src/paths.js (dual trail data)
  - tools/walkprobe.mjs
---
