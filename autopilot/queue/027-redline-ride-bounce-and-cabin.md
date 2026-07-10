---
id: 027
area: wrigleyville
type: feedback
model: opus
title: Red Line ride — kill the bounce, grow the cabin so walls stop blocking the view
acceptance: >
  Owner (2026-07-09): the mayor bounces up and down during the ride, and the
  car is "exactly as tall as the user" so the walls block the view too
  often — car should be bigger/taller. (A) BOUNCE (issue 009): prime suspect
  already identified by inspection — src/packs/wrigley-ride.js ~L311 sways
  the car with carRoot.rotation.z = sin(t*1.7)*0.004, but the children are
  built at ABSOLUTE coords (CAR.x = −250), so the rotation pivots about the
  WORLD origin: sin(0.004)×250 ≈ ±1.0 m of vertical heave on the whole
  cabin while the player holds y = CAR.y = 0.25. Confirm with one logged
  frame (a window-sill mesh world-y over time), then fix by re-pivoting: a
  parent group POSITIONED at the car centre with children in car-local
  coords (or translate-rotate-translate), so the sway becomes a true subtle
  roll about the car's own long axis. Verify with an act.mjs ride capture —
  the cabin's screen position should hold steady within a few px all ride.
  (B) CABIN SIZE: it's a pocket cell — no real-world footprint binds it.
  Scale the interior so the chase camera rides comfortably INSIDE: raise the
  roof to ~2.6-3 m interior, enlarge window openings with LOWER sills so the
  streaming window lights stay visible past the walls from the ride camera,
  widen modestly if it helps the camera (the rideTo comment at ~L233-235
  notes cross-car cameras landing outside the 3.4 m body — re-derive that
  constraint for the new shell). Keep it cozy CTA, bigger not barren: seats,
  poles, the Wrigley's Spearmint ad card, the Ko-fi placard all reposition
  onto the resized walls. MUST move together with the shell: cell
  walkable/clamp bounds (~L181-185), spawn point, rider NPC seat (~L279),
  ride camera line-up, and the in-car Ko-fi walkthrough waypoint (it reads
  the placard from very close — re-run and re-judge its expectation, never
  delete it to pass). Ride verified end-to-end BOTH directions (platform →
  fade → car → fade → platform), desktop + touch. Draw budget ceiling
  respected; determinism untouched; single-file build passes.
refs:
  - src/packs/wrigley-ride.js (CAR L16, car build L79-185, cell def L181-185, rideTo L217-240, rider L279, sway L311)
  - src/cells.js (pocket-cell pattern — clamp/walkable/surfaceY contract)
  - tools/walkthrough.mjs + waypoints.expect.json (in-car Ko-fi placard read)
  - autopilot/issues/009-ride-bounce.md
---

The ridable L is the game's promise feature — the first thing the owner ever
asked us to remember. The ride should feel like sitting in a real CTA car
watching the city stream past: steady floor, big windows, a gentle roll you
feel more than see. Confirm the origin-pivot heave with one measurement
before fixing (it's a one-liner to log and satisfying to see), but don't turn
confirmation into archaeology — the re-pivot is the right fix either way.
