---
id: 096
area: framework
type: feedback
model: fable
turns: 90
title: MOBILE CAMERA — stop the avatar filling the portrait frame
acceptance: >
  Owner (2026-07-19): "perspective is too zoomed in on mobile, too much of
  the screen is the avatar, we should ensure the frame is proportioned
  ideally." Root-cause first: the chase camera's dist/pitch/FOV are tuned
  for a 16:9 landscape desktop viewport; a 390x844 portrait phone crops the
  horizontal FOV hard, so the mayor occupies a much larger fraction of the
  frame. Fix the CLASS in main.js's camera (one aspect-aware rule — e.g.
  scale default/min chase dist and/or vertical FOV off camera.aspect below
  a threshold), not per-scene nudges. The mayor should read clearly but
  leave generous world context — compare against Animal Crossing portrait
  framing: character roughly 1/6-1/8 of frame height, not 1/3. Wheel/pinch
  zoom limits and pack camera overrides (binoculars, Topgolf bay, L-car)
  must still work: packs own the camera AFTER main.js (pack-camera-override
  law), so verify at least one session camera on mobile. Measure, don't
  eyeball: dump the mayor's projected screen-height fraction via a probe at
  several stands, portrait AND landscape (--mobile / --mobile --landscape),
  before + after. Desktop framing must stay bit-identical: baseline spawn
  diff within gate with NO baseline regen. Coach marks/HUD untouched. READ
  every PNG; standard gates green.
refs:
  - autopilot/feedback/processed/feedback-2026-07-19T00-35-40-241Z.md (verbatim)
  - src/main.js (chase camera + jphys), src/core.js (camera/renderer)
  - PITFALLS.md (pack camera override point; 077 dt/camera lerp law)
---

The first thing every phone player sees. One aspect-aware rule in the
chase camera, measured by projected avatar fraction — not taste-nudged
per spot.
