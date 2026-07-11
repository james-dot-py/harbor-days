---
id: 036
area: wrigleyville
type: polish
model: opus
title: Sign-quality sweep — Wrigleyville hard-cell mirrored backs
acceptance: >
  Sister task to 032 (which fixed every MAIN-LAKEFRONT sign). A full audit
  during 032 found seven lone-DoubleSide canvas-text signs still living in the
  Wrigleyville hard cell whose BACKS render mirror-flipped. All of Wrigleyville's
  other signage is already safe (village.js twoSided()/signPlane, station.js
  back-to-back InstancedMesh, streets.js blade(), corners.js CTA blade,
  stadium.js FrontSide+solid-body) — only these remain. Convert each to the
  back-to-back FrontSide pattern (or FrontSide + solid rear), matching 032's fixes.
  Instances observed (file:line, label):
    (1) src/wrigley/deepcuts.js:170 — EAMUS CATULI! banner (board() DoubleSide,
        posts, back over open rooftop);
    (2) src/wrigley/deepcuts.js:171 — AC drought counter (same board() DoubleSide,
        digits);
    (3) src/wrigley/deepcuts.js:211 — HIT IT HERE bullseye (CircleGeometry
        DoubleSide, arced text, parapet-mounted back over rooftop);
    (4) src/wrigley/rooftops.js:358 — ROOFTOP BLEACHERS sandwich board (single
        tilted atlas panel; A-frame with only ONE panel → mirrored back);
    (5) src/wrigley/corners.js:230,233 — CUBS HATS $10 / TEES $20 merch signs
        (plane()→DoubleSide atlas, FREESTANDING ~2 m north of the store wall so
        the mirrored back is exposed on the sidewalk);
    (6) src/packs/wrigley-vendors.js:175 — OFFICIAL PROGRAM 25¢ (held, waved, both
        sides seen);
    (7) src/packs/wrigley-npcs.js:229 — RED HOTS cart sign (lone DoubleSide
        transparent plane; pole is safely behind, only the mirror needs fixing).
  Borderline (fix only if normalizing all board() calls): deepcuts.js:174
  "1060 W. ADDISON" plate — DoubleSide but flush on the stadium wall (back
  occluded).
  DEFECT B (post covering text) was NOT found in Wrigleyville — all these have
  posts behind/at-edge or no post; this task is mirror-only.
  CAUTION: the Wrigleyville global draw-call max is razor-thin (wv-gate-bleacher-f1
  = 477/480 per tools/budgets.json). board()/#1-3 are individual meshes → a
  back-to-back conversion adds up to +1 draw each ONLY when in-frustum; verify
  with the FULL wrigleyville walkthrough + tools/census.mjs that no view crosses
  480. Prefer merged/atlas back-to-back (village.js twoSided) or FrontSide+solid
  rear where the back faces a wall. Zero rng impact (geometry/material only).
  Verify each fixed sign from BOTH faces; single-file build passes.
refs:
  - autopilot/queue/032-mirrored-sign-backs.md (the lakefront sister task)
  - PITFALLS.md (lone DoubleSide canvas plane mirrors from behind)
  - src/wrigley/village.js (twoSided() reference pattern)
  - tools/budgets.json (480 cap; wv-gate-bleacher-f1 measured 477)
---

Found while doing task 032's exhaustive sign audit. Split out because
Wrigleyville is a separate hard cell reached via the L — it needs its own
Wrigleyville walkthrough + draw-call census to verify safely, and its budget
headroom is only 3 draw calls. The main-lakefront signs (honorary blades, Divvy,
CPD entrance, RED LINE pylon, RED HOTS, Diversey boards, boat transoms, BELMONT
L, PEQUOD'S) are all fixed and verified in 032.
