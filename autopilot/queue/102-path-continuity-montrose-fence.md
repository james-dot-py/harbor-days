---
id: 102
area: montrose
type: fix
model: kimi
turns: 100
title: Path-continuity root cause at the white fence + permanent gate check
acceptance: >
  Owner (2026-07-19, bug-reports/montrose-fence.png): where the white fence
  ends near Montrose Harbor the path geometry is malformed — jagged/
  misaligned segments. Find the ROOT CAUSE (likely a bad segment join, width
  interpolation, or terrace-clipping issue where fence and path terminate)
  and fix it GENERALLY — "malformed path seams should be impossible, not
  patched." Accept: (1) the fence-end spot renders clean; (2) add a
  path-continuity check to the standard gate PERMANENTLY (adjacent segment
  edges align within tolerance, no degenerate/overlapping quads) and it
  passes map-wide; (3) any other seams the new check surfaces are fixed at
  the cause, not hidden. Do not change anything not listed here. Standard
  gates (the new check becomes one of them).
refs:
  - bug-reports/montrose-fence.png (owner screenshot, repo root — if absent,
    proceed from the description; the owner has been asked to drop it in)
  - src/paths.js
  - tools/walkprobe.mjs, tools/mp-gridsweep.mjs
  - PITFALLS.md
---
