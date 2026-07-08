---
id: 007
area: global
type: polish
title: Draw-call ratchet, pass 2 — chibi crowd + pack-prop consolidation toward 480
acceptance: >
  Full walkthrough (node tools/walkthrough.mjs) maxDrawCalls measurably lower
  than the pass-1 result (see tools/budgets.json "measured"), verified with
  before/after shots of every touched view (READ them), determinism intact.
  Then LOWER tools/budgets.json drawCalls to sit just above the new measured
  max (never raise it). Repeat until the max is <= 480 and budgets.json says
  480. fps is advisory (SwiftShader) — draws are the gate.
refs:
  - autopilot/issues/000-draw-call-budget.md (pass-1 census attribution)
  - tools/census.mjs (per-view draw attribution; rank mode for reports)
  - PITFALLS.md (setColorAt bucket rule; r128 toon ignores instance colors)
---

Pass 1 (task 004) took the max from 1298 to ~900-970 by merging each cell's
static builder meshes (src/cells.js mergeCellStatic) and consolidating the
chibi rig (13+ meshes -> 10: merged leg+shoe, arm+hand, head+cheeks, folded
hair extras). What remains, per tools/census.mjs on the hot views (deck-1-f1,
zone-diversey-point-f1 ~900-970; each chibi = 10 draws, ~34 chibis in frustum
at deck-1 = ~350 draws):

1. **Chibi rig, next 3 draws** (biggest lever, ~1/3 of hot views):
   - eyes: merge L+R into ONE mesh (setFace scales both identically; note
     'surprised' 1.3x would widen eye spacing ~0.057 m — either accept or
     scale around per-eye centers by rebuilding the two-sphere geometry).
   - hair -> head merge: head and hair bob in LOCKSTEP (both +bob*1.1) so they
     can be one vcMat mesh, BUT framework.js gait, traillife.js and any pack
     that sets parts.hair.position.y must stop writing hair (audit all
     `.hair.` sites first).
   - shadow: per-chibi CircleGeometry -> one InstancedMesh shadow manager
     updated per frame (transform-only; setColorAt not needed - all one color).
2. **Pack-added statics escape the cell merge** (they land on scene AFTER
   endCellCapture): at deck-1, 27x skin spheres (swimmer heads), 22x white
   planes (towels?), 18x gray spheres — find them with node tools/census.mjs
   (unnamed rows), then either instance them per color inside their packs or
   give packs a shared merge helper. Audit each pack for animation before
   merging (bobbing swimmers are NOT static).
3. **Statue chibis** (cell-lakefront/chibi and cell-wrigleyville/chibi rows):
   statues built via createChibi are fully static — safe to bake each whole
   statue into 1-2 meshes (they are exempted from mergeCellStatic only by the
   'chibi' name guard; give statues a dedicated static build path or rename).
4. **Startup cost of the pass-1 merges** (found by gate check 4 after pass 1):
   mergeCellStatic + per-chibi rig merges add ~1.5-2.5 s to world build
   (SwiftShader measurement; the merge work is CPU-bound so real hardware pays
   most of it too). Shots are insulated now (?play=1 snaps the camera to rest,
   main.js runStart), but players still wait. Levers: run the cell merges in
   requestIdleCallback after first paint, reuse merged geometry across chibis
   (the rig merges rebuild identical limb geometry per NPC), or cache by
   geometry signature. Measure before/after with performance.now around the
   merge calls; keep first-frame time in the note here.
