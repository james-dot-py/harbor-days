---
id: 102
area: montrose
type: fix
model: fable
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
  the cause, not hidden. The listed fixes are the must-haves; beyond them the owner grants judgment (2026-07-19: 'you can change things not listed if you see fit') — adjacent improvements are allowed where clearly right, with determinism + all gates green. Standard
  gates (the new check becomes one of them).
refs:
  - owner description only (2026-07-19: no screenshot exists — REPRODUCE the
    jank with tools/shot.mjs around the white-fence end at Montrose Harbor and
    find the bug from the description BEFORE fixing)
  - src/paths.js
  - tools/walkprobe.mjs, tools/mp-gridsweep.mjs
  - PITFALLS.md
---

Supervisor note (2026-07-19): this task was previously attempted on kimi-k3.
Attempt 1 did ~68 min of real work, then died on a resume rejection; retries
2-3 failed instantly because the kimi provider account is suspended (billing)
— the park was NOT a merit failure. Attempt 1's work is UNCOMMITTED in the
tree: modified GEOGRAPHY.md, src/data/chicago.js, src/paths.js; new
tools/path-continuity.mjs (a draft of the permanent gate check) and
tools/tmp-102-*.mjs debug scripts. Evaluate that work first — keep what
holds, revert what doesn't, and delete the tmp-102-* scratch scripts before
finishing. tools/path-continuity.mjs may be a usable head start on
acceptance item (2).
