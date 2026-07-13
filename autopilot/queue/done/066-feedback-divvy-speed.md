---
id: 066
area: lakefront
type: feedback
model: opus
turns: 50
title: Divvy bikes ride FASTER than walking, and SHIFT sprints them harder
acceptance: >
  Owner (2026-07-12): "Divvy bikes should go faster than walking and speed
  up more when holding shift." (1) Mounted Divvy base speed comfortably
  beats walking (walk 4.2 — target ~1.6-1.9x; tune by feel, cozy not
  twitchy) and clearly beats the walking SHIFT-run too, so riding always
  wins on pace. (2) SHIFT while riding adds a further sprint tier (target
  ~1.4-1.6x the riding base) with a gentle spin-up/spin-down (no instant
  velocity step; the bell/handling stay usable). (3) Mobile parity: the
  joystick full-deflection run gesture (joy.len>0.92, the existing run
  mapping) gets the same riding sprint tier — test both inputs. (4) The
  speed change must not break walkability/collision feel (no wall
  clipping at sprint, jetski/water rules unchanged) or the camera (FOV/
  follow feel at the new top speed — the existing runF FOV kick may need
  a matching bike tier). (5) Determinism untouched (movement is runtime
  only); walkprobe green; single-file build passes; a short act.mjs E2E
  measuring m/s walking vs riding vs riding+shift proves the ordering,
  plus one riding screenshot READ. Update the journal/help copy if any
  states bike speed.
refs:
  - src/packs/progression.js (the Divvy pack — mount/dismount, speedMult)
  - src/framework.js state.speedMult (main.js consults it)
  - src/main.js movement + runF/FOV kick
  - autopilot/feedback/processed/feedback-2026-07-12T23-57-14-900Z.md (the owner note)
---

Owner playtest note, small and pure quality-of-life: the bike should FEEL
like a bike. Walking pace on two wheels reads as a bug even when nothing
is broken — speed is the whole fantasy of grabbing a Divvy. Keep the cozy
register (spin-up, bell, no drift physics), just make it quick.
