---
id: 022
area: lakefront
type: feedback
model: fable
title: Mayor high-fidelity pass + sax busker faces the right way
acceptance: >
  Two owner asks (2026-07-09). (A) MAYOR LIKENESS + FIDELITY: the owner
  supplied a reference portrait — refs/mayor/owner-mayor-reference.jpg,
  "make the mayor look close to this" — match it in chibi-toon miniature.
  LOOK at the image. Locked from before and confirmed by the reference: warm
  dark brown skin 0x6e4632, small grey afro, big beady eyes with white glints
  (single basic mesh, never animated), warm cheeks, scale 0.74. New targets
  from the reference: (1) hair — short natural grey afro with a slightly
  irregular textured top silhouette, not a smooth cap (still never crossing
  the face plane at eye height); (2) face — thin arched brows and a composed,
  no-nonsense expression, as far as the chibi read allows; (3) OUTFIT
  SUPERSEDED by the reference: charcoal-grey suit jacket with notched lapels
  over a white collared shirt, small round gold lapel pin on the left lapel —
  this REPLACES the light-blue sash + red star + tie regalia (pinstripes only
  if they read at chibi scale without texture maps; otherwise plain grey is
  right). Plus general fidelity: silhouette/proportion refinement, better
  hands, shoe detail, lapel/collar modeling — all hand-modeled toon; NO
  texture maps, NO style break from the chibi NPCs (the mayor should look
  like the best-made citizen in town, not a different art style). Constraints: createChibi is SHARED by every NPC —
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
  - refs/mayor/owner-mayor-reference.jpg (owner-supplied portrait, 2026-07-09 — THE look target)
  - src/character.js (createChibi; buildMayor ~L308; glint / afro / Bug 2 comments)
  - src/main.js (MSCL squash/stretch ~L90, mayor follow ~L259-263)
  - src/framework.js (holdItem ~L160, CITIZEN scale L209, sit warp ~L507)
  - src/packs/characters.js (sax busker ~L121-160, arm pose ~L200)
  - autopilot/issues/006-sax-facing-wrong-direction.md
---

The mayor is the face of the game — the one character in every screenshot —
so fidelity spent here pays everywhere. The owner's reference portrait is the
target: the current design was already pointed this way (skin, grey afro, big
eyes all match), so this is convergence, not a redesign — the outfit swap
(suit + white shirt + gold pin replacing sash/star/tie) is the one deliberate
break with the old regalia, owner-directed. If a likeness detail fights the
toon/chibi read (uncanny face detail, noisy geometry), skip it honestly and
say so in the result; a confident chibi beats a compromised realistic one.
The sax fix is small but visual — verify with your eyes from the player's
actual approach path.
