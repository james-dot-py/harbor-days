---
id: 135
area: citywide
type: fix
model: opus
turns: 40
title: A RUNNING player punches straight through guard rails — and every 0.575 m stair tread descends as a free-fall
acceptance: >
  Both found by task 130's live stair probe (tools/tmp-130-stairprobe.mjs,
  steering-bot E2E against the real input path — not a data reading).

  (1) RAILS DO NOT HOLD A RUNNER. On the sanctuary viewing deck (h 2.30) the east
  rim's 8 colliders are live and correct (x 175.00, z -398.5..-394.0, spacing
  0.75, r 0.22, h 3.40 vs the player at y 2.30). At WALK speed the player is held
  at x 174.58 in 4/4 reps. At RUN speed (SHIFT / joy.len>0.92, ~9.5 m/s =
  0.21-0.28 m per frame) he punched clean through in 12 of 13 reps and fell 2.3 m
  to the grass — north and south rims too, 1 rep each, both through.
  MECHANISM (measured, not guessed): the collider push is RADIAL and clamped to
  0.3 m/frame, so a runner nearly aligned with a post is pushed mostly sideways,
  slips between posts, and once past a post centre the radial push ejects him out
  the FAR side. It is the resolution that fails, not a missing collider — so
  adding posts will not fix it.
  FIX DIRECTION: give rail RUNS a segment (capsule) collision test rather than a
  ring of point colliders, or resolve against the segment normal with the
  penetration measured along it. Whatever ships must (a) hold at run speed from
  every approach angle, (b) never trap (the 065 anti-trap law / issue 025 escape),
  (c) leave the deliberate gaps — stair mouths, gate gaps — passable.
  THIS IS CITYWIDE: every railed edge in the game uses the same primitive — the
  sanctuary deck, the reserve platform, the Montrose hook rail, the dock rails,
  the L platform, the Millennium terraces. Audit them with one shared E2E, not
  one at a time.

  (2) STAIRS DESCEND AS FREE-FALLS. main.js has no step-up limit at all
  (canMove tests only walkable(); the grounded branch lerps y to surf), so the
  0.5 m threshold is DOWN-only. The sanctuary's rises are 0.575 m, so walking
  DOWN the stairs flips jphys.air on every single tread: 4 discrete airborne
  episodes per trip, peak descent 4.8-16.0 m/s, several over the impact>3 line
  that fires sLand + the dust ring + the camera settle. Going UP is smooth.
  FIX: bring the sanctuary treads under the threshold (4 treads at 0.46 instead
  of 3 at 0.575 keeps the deck at h 2.30 and the same footprint — 129's reserve
  platform already uses 0.375), and sweep every other stair in the game for the
  same thing: CH.SANCTUARY.deck.stairs, MONTROSE_RESERVE.platform.stairs, the
  Millennium rink + Art Institute grand steps, the Wrigleyville station and
  rooftop stairs. Any tread rise >= 0.5 m is a stumble.
  A tread under 0.5 m ALSO fixes a gate blind spot: treads shallower than ~0.6 m
  deep produce 0 INTERIOR cells in tools/deck-coverage.mjs (grid 0.25 m), so
  several stairs are tagged but barely measured.

  (3) Verify with a steering bot at BOTH speeds, PNGs personally Read, and keep
  walkprobe + all six shell-out guards green.
refs:
  - autopilot/done/130-deck-ledges-and-coverage-sweep.md
  - tools/tmp-130-stairprobe.mjs (if pruned, the recipe is in the 130 close-out)
  - src/main.js (canMove collider resolution; the jphys.air 0.5 m threshold)
  - PITFALLS.md (the 130 block: there is no step-up limit in the engine)
---

The railing is the promise that the edge is safe. It keeps that promise at a
walk and breaks it at a run, which is the speed you take a lakefront deck at.
