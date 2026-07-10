# 006 — sax busker's saxophone faces the wrong direction

- severity: low-medium (single-prop orientation, but it sits at the Belmont
  stop — every player who rides the L walks right past it)
- evidence: owner verbal report, 2026-07-09 ("make sure the guy's saxophone
  next to the belmont stop is facing the right direction"). No screenshot —
  verify with tools/shot.mjs from the player's approach before fixing.
- observed: the alto sax held by the busker at (18,108)
  (src/packs/characters.js ~L121-160) reads wrong-way-round in game. The code
  comment at L156 ("bell -> forward, mouthpiece -> mouth") claims it's
  correct, so the rotation composition (NPC ry:1.2 × saxGrp.rotation.y =
  Math.PI/2 × lean 0.16) likely nets out sideways/backwards — trust the
  screenshot, not the comment.
- expected: bell points forward-out from his hands, mouthpiece up to the
  chin/mouth, as seen from the player's approach along the Belmont connector.
- route: task 022 (mayor fidelity + sax orientation), part B.
