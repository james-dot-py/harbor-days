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
