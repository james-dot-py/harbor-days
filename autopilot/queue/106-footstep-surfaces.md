---
id: 106
area: feel
type: delight
model: kimi
turns: 60
title: Footsteps — real surface coverage + de-repetition (design audit B2)
acceptance: >
  From the 2026-07-19 design audit: sStep knows only wood/stone/grass
  (audio.js:147) and the classifier (main.js, the stepT block) sends sand,
  asphalt trail, and ALL Wrigleyville/Millennium pavement to the 'grass'
  timbre; fixed frequency per surface reads machine-gun at 0.26s stride.
  Fix: (1) extend the classifier — 'sand' (beachH non-null), 'asphalt'
  (inside the trail corridor per path data), 'paver' (hard-cell sidewalk/
  promenade via the cell tag), keep wood (walkRects) / stone (terrace) /
  grass (fallback); (2) two new synthesized timbres in sStep (sand: soft
  lowpass ~300 Hz short thud, low gain; asphalt: quiet high bandpass click)
  — 100% synth, no assets; (3) ±8% frequency jitter per step + alternating
  L/R gain skew ~15% to kill repetition. No per-frame allocations (module
  constants only — perf constraint 3). Accept: act.mjs walk across
  beach → trail → Wrigleyville sidewalk → a dock with a debug surface
  readout shows the right surface per leg and varying step params; zero
  console errors; draw calls unchanged. Standard gates.
refs:
  - src/audio.js (sStep)
  - src/main.js (footstep block, stride timer)
  - src/coast.js (beachH), src/data/chicago.js (trail), src/cells.js
---

Owner license (2026-07-19): 'you can change things not listed if you see
fit' — adjacent improvements beyond this spec are allowed where clearly
right, with determinism + all gates green.
