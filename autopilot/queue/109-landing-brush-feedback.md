---
id: 109
area: feel
type: delight
model: kimi
turns: 60
title: Landing thump + brush rustle — the ground answers back (B5)
acceptance: >
  From the 2026-07-19 design audit: the world responds to water (splash,
  sPop, particles) but not to touch on land. Two micro-feedbacks, both
  synthesized and allocation-free: (1) JUMP LANDING — soft thud (noiseHit
  lowpass, gain scaled by fall height, capped small) + a DUST burst ~2× the
  footfall puff (main.js:401 pattern) + a 60 ms camera pitch settle
  (~0.02 rad; skipped under prefersCalm like the firework sway, task 085);
  (2) BRUSH RUSTLE — passing within r≈0.6 of flower/grass tufts fires a
  lowpass rustle one-shot, throttled ≥300 ms, no geometry change, no
  per-frame allocation (precompute candidate tuft positions into a static
  spatial grid at world-ready; rng untouched at runtime). Accept: act.mjs
  jump + a walk through the peony bed with a debug audio readout shows
  thud-on-landing and rustle-on-brush with correct throttles; zero console
  errors; draw calls unchanged; determinism gate green. Standard gates.
refs:
  - src/main.js (jphys landing, DUST footfall block)
  - src/audio.js (noiseHit), src/fx.js (DUST)
  - src/props.js (tuft/flower instance data)
---
