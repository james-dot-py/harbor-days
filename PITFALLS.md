# PITFALLS.md — hard-won gotchas (all cost real debugging time)

Read this before every task. Append new entries when a bug costs more than a
few turns to find; keep each to one line of symptom + fix.

- r128 toon/basic materials IGNORE InstancedMesh.setColorAt: bucket instances
  into one InstancedMesh per color.
- Teleports swoosh the follow-cam across the map: set the exported camCtl.snap
  flag (main.js).
- Pocket sets outside the active cell's clamp eject the player: make pockets
  their own cell.
- Elevated walk rects adjacent to streets act as elevators via the 0.5 step-up
  threshold: enclose them so only ramps connect levels.
- chargeThrow releases on KEYUP, not second press.
- Framework toasts hold ~3 s each: never queue per-event toasts in fast loops.
- NPC culling: makeNPC hides >145 m; free perf, and why far NPC clusters are cheap.
- walkprobe + main.js must share walkability definitions: put them in the data
  module.
- Tools default to PORT 5173 and will screenshot the wrong session's game:
  always pass the parsed port; always canary-check first.
- Headless WebGL may run on SwiftShader: fps is advisory, draw calls are the gate.
- Displaced hard cells have cell-local x-frames (Wrigleyville: x = −140 −
  (Waddr − 950), true projection ≈ −600): never validate a cell's x against the
  true projection; record per-area offsets in osm.json provenance.
- village.js add() SNAPSHOTS a Group's meshes into the static merge pool at
  call time: add(g) BEFORE populating g renders nothing (bar facades/neon and
  stall structures were invisible for two full runs — only their instanced/
  direct-add parts showed, floating against the backdrop band).
- Stale-cache variant of the 5173 trap: a long-lived dev server serves stale
  HMR-cached module transforms (main.js missing freshly added exports while
  world content looked current) — probe tools must spawn their own vite.
- TWO Claude sessions can share this worktree (a resumed prior-task session
  overlapping the next task's session): files change under your executors,
  commits/pushes/result.json land mid-task, and each session attributes the
  work to itself. Before close-out, re-check git log + result.json provenance
  and re-verify tree state against what you actually reviewed.
- gen-waypoints feat() does NOT clearance-filter: a feature ON a corridor edge
  (knothole, wall signs) snaps the stand onto itself and parks cameras inside
  the wall — use featW with an explicit stand out in the street.
- insidePoly(x,z,inset) tests the point MOVED inset toward home plate: a big
  inset (3.0) accepts points ~inset outside the wall (the RF foul pole landed
  in the Sheffield sidewalk). Bound placement overshoot with inset ≤ 0.5.
- A lone DoubleSide canvas plane shows MIRRORED text from behind; light
  textures hide it, and a dark retexture surfaces it (Addison platform signs,
  task 010). Free-standing signs = back-to-back FrontSide pairs (village.js
  twoSided(); pairs inside one InstancedMesh cost no extra draw).
