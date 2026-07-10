# 011 — mini golf reads as crossed sticks; not playable

- severity: medium-high (owner verdict: "makes no sense — can't play and
  course is strange")
- evidence: refs/diversey-golf/owner-issue-011-minigolf-layout.png
  (owner, 2026-07-09)
- observed: the wooden rails extend far past their felt fairway pads and
  cross one another like pick-up sticks; the windmill and tower obstacles
  sit at rail intersections rather than on holes; no tee/cup/flag reads
  anywhere; there is no putt activity. The builder comment (structures.js
  ~L573-577) already describes the intended design — 3 whimsical holes,
  felt fairways, wood rails — but the rail geometry is freehand instead of
  derived from the felt shapes.
- expected: 3 coherent holes (rails hugging the felt edges, tee pad + cup +
  flag each, obstacles ON their holes), a playable putt loop with strokes
  and par, and windmill blades either animated by a pack or honestly
  decorative.
- route: task 028, part B.
