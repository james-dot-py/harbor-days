---
id: 038
area: lakefront
type: feedback
model: opus
title: Dock-to-ground continuity — every dock roots flush on its shore (issue 016)
acceptance: >
  Owner (2026-07-10): "docks don't appear continuous with the rest of the
  ground." No coords given — audit EVERY dock↔shore junction: the Belmont
  Harbor star docks (src/packs/moorings.js + chicago.js dock data) and the
  harbor-mouth finger docks by the Diversey apron. Shot each junction from
  player eye height on the land side, READ them, and fix the CLASS, not
  instances: (1) the landward root of each dock derives its deck y from the
  shore surface it meets (sample coastQuery/tierAt — or the apron/promenade
  height — at the junction point; never a hardcoded y that drifts from the
  coast data); (2) no daylight gap between deck root and shore edge — the
  deck overlaps or meets the edge with a closed seam, no water sliver, no
  z-fighting; (3) where the grades genuinely differ, a small threshold/
  gangway/curb piece makes the transition read intentional (real docks have
  them); (4) ground truth: the owner's own photos —
  refs/diversey-corner/harbor-mouth-IMG_0399.jpeg (docks meeting a
  continuous concrete apron at grade) and steps-to-pier-IMG_0395.jpeg (the
  pier junction) — match that read. If any dock deck is walkable, its
  walkable rules/expects still hold (walkprobe green); world rng untouched
  (geometry-only fixes, or data-derived placement after all rand draws);
  draw budget unchanged; single-file build passes; verify with before/after
  junction shots for every dock site touched.
refs:
  - src/packs/moorings.js (star docks), src/data/chicago.js (dock/slip data)
  - src/coast.js (coastQuery/tierAt — the shore surface truth)
  - refs/diversey-corner/harbor-mouth-IMG_0399.jpeg, steps-to-pier-IMG_0395.jpeg
  - autopilot/issues/016-docks-not-continuous-with-ground.md
---

Junction seams are where handmade worlds give themselves away — the eye
forgives a simple dock but not a floating one. The rule that prevents
regression: dock roots SAMPLE the shore surface rather than assuming it, so
future coast reshapes carry the docks along automatically.
