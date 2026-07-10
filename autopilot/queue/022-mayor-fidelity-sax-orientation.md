---
id: 022
area: lakefront
type: feedback
model: fable
title: Mayor high-fidelity pass + sax busker faces the right way
acceptance: >
  Two owner asks (2026-07-09). (A) MAYOR FIDELITY: make the mayor read as a
  higher-fidelity hero within the LOCKED design — warm dark brown skin
  0x6e4632, small grey afro (compact cap; hair never crosses the face plane at
  eye height), big beady eyes with white glints (single basic mesh, never
  animated), warm cheeks, light-blue sash + red star + tie regalia, scale
  0.74. Upgrade candidates: silhouette/proportion refinement, better hands,
  afro cap shape, shoe detail, regalia modeling (sash drape, star facets),
  subtle face detail — all hand-modeled toon; NO texture maps, NO style break
  from the chibi NPCs (he should look like the best-made citizen, not a
  different art style). Constraints: createChibi is SHARED by every NPC —
  express upgrades as mayor-only params or post-build additions in
  buildMayor(); never change the NPC path's output (world scatter + NPC look
  must be bit-identical). Rig stays nested (shoes children of legs, hands of
  arms — no manual shoe/hand position animation, Bug 2). buildMayor keeps the
  flat reparent onto `mayor` and stays rng-free. Jump squash/stretch (main.js
  MSCL), holdItem() right-hand parenting, and sit warp (framework.js) must all
  still work — verify each with act.mjs. Added meshes stay modest: mayor is
  one character; keep the delta under ~10 draws (budgets.json is a ceiling).
  (B) SAX ORIENTATION (issue 006): the sax busker next to the Belmont stop
  holds his saxophone facing the wrong direction. src/packs/characters.js
  ~L121-160: NPC at (18,108) ry:1.2, saxGrp.rotation.y = Math.PI/2 — the
  comment claims bell→forward, but the owner sees otherwise, so trust the
  screenshot, not the comment. Shot the busker from the player's approach
  (node tools/shot.mjs sax "play=1&x=14&z=100" facing him), LOOK at the PNG,
  fix the rotation so the bell points forward-out from his hands and the
  mouthpiece reaches his mouth, and re-shot to verify (arm-pose overrides at
  L200-201 still have to line up with the horn). Both parts: rng untouched,
  single-file build passes.
refs:
  - src/character.js (createChibi; buildMayor ~L308; glint / afro / Bug 2 comments)
  - src/main.js (MSCL squash/stretch ~L90, mayor follow ~L259-263)
  - src/framework.js (holdItem ~L160, CITIZEN scale L209, sit warp ~L507)
  - src/packs/characters.js (sax busker ~L121-160, arm pose ~L200)
  - autopilot/issues/006-sax-facing-wrong-direction.md
---

The mayor is the face of the game — the one character in every screenshot —
so fidelity spent here pays everywhere. "If possible" is the owner's phrasing:
if a candidate upgrade fights the toon/chibi read (uncanny face detail, noisy
geometry), skip it honestly and say so in the result; a confident chibi beats
a compromised realistic one. The sax fix is small but visual — verify with
your eyes from the player's actual approach path.
