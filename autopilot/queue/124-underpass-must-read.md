---
id: 124
area: lincolnpark
type: polish
model: fable
turns: 120
title: The Fullerton underpass must READ as an underpass — both approaches (issue 037)
acceptance: >
  Owner playtest 2026-07-26: "neither side of the fullerton underpass looks like
  there's an underpass there." Task 120 made the underpass WORK (real sunken walk
  surface, solid berm, cam ducks the soffit); this task makes it READ. The bar is
  the owner walking toward it from either direction and knowing, without being
  told, that the path goes under the road.
  (0) REPRODUCE FIRST. Owner screenshot: refs/inbox/owner-2026-07-26-fullerton-
  underpass.png (file it to refs/lincoln-park/ with source: "owner"). Stand where
  he stood — the approach walk on the berm's near side, roughly the Fullerton
  underpass at ~x6,z661 — via tools/shot.mjs, and Read the PNG. You must be able
  to see the same wall-not-tunnel reading before you change anything.
  (1) DIAGNOSE THE CYAN. Two turquoise patches sit at the base of the berm left
  and right in the owner's shot, in a palette matching nothing else in frame.
  Suspect the water plane showing through where the portal cheeks should be: 120
  clipped WATER_S out of the trench via a livingWaterMat clip +
  customProgramCacheKey, and the clip may not hold at this angle, or the cheeks
  may lack inner faces. Find the real cause, state it, fix it.
  (2) THE PORTAL MUST READ AT APPROACH DISTANCE, BOTH SIDES (north and south).
  What is missing is depth and threshold, not detail: a genuine mouth with visible
  recess; a lintel / headwall band above it; cheek walls with real thickness so the
  opening has jambs; interior falloff that goes dark but never black (a lit throat
  reading deeper than the mouth); and enough tonal contrast against the berm face
  that the opening is obvious at 30-40 m, not just at the threshold. Match the
  Belmont/Addison underpass portal vocabulary already in the game (arched portals
  with lanterns, structures.js) — this is the same city, do not invent a new idiom.
  (3) THE APPROACH FRAMES IT. The walk should aim the player at the mouth rather
  than at a blank slab: check the path alignment on both sides and correct it if
  the walk meets the berm off-axis. Retaining walls / wing walls flaring out from
  the portal are the honest device — they funnel the eye in.
  (4) MEASUREMENT FIRST, THEN CONTENT — and this is the point of the task.
  120 passed because its four lp-underpass framings all looked at the interior and
  the west ramp; NONE framed the approach, which is the only view the player gets
  first (the 080 blind-spot precedent). Add judged waypoints at APPROACH distance
  on BOTH sides (lp-underpass-approach-n, lp-underpass-approach-s), authored to
  expect a legible opening, and keep the existing interior framings. A future
  session must not be able to green this from inside the tunnel again.
  (5) The permanent guards from 120 stay green: no-solid-in-water, path-continuity,
  the berm solid end to end, anti-trap. walkprobe exits 0.
  (6) DETERMINISM + PERF: local seeds only, zero new instanced buckets unless named
  and justified, draws <= 480 at every affected waypoint, spawn diff within gate.
  (7) npm run build one artifact, zero console errors, EVERY PNG personally Read.
  Lincoln Park is already SIGNED OFF (123) — update the signoff waypoint set and
  expectations rather than re-running a full §5.2 sign-off.
refs:
  - autopilot/issues/037-fullerton-underpass-does-not-read.md (the report + the
    coverage-gap analysis — read it first)
  - refs/inbox/owner-2026-07-26-fullerton-underpass.png (owner screenshot)
  - task 120's issue-035 work (commit d020364): analytic lpUnderpassH walk surface
    shared engine+walkprobe, bridge deck + parapets + portals + lanterns, the
    WATER_S trench clip, the chase-cam soffit duck
  - src/structures.js (LSD, portals, bridge decks — the Belmont/Addison portal
    vocabulary to match), src/data/chicago.js (berm/underpass data, west-fence gaps
    at the underpasses), src/paths.js (approach alignment)
  - GEOGRAPHY.md Lincoln Park section (update FIRST if the alignment moves)
  - PITFALLS.md (camera-in-geometry framing traps; r128 program-cache trap that 120
    hit on the water clip)
---

The owner's exact words: *"neither side of the fullerton underpass looks like
there's an underpass there."*

He is right, and the screenshot proves it — from the walk it reads as a low wall or
a loading dock, three flat slabs stacked, with no opening anywhere in the frame. The
tunnel you built in 120 is real and walkable and none of that is visible until you
are standing in it.

This is the front door to Lincoln Park. It is the piece that decides whether the
neighborhood feels connected to the lakefront or fenced off from it. A player who
cannot see the way through will turn around, and everything behind it — the zoo, the
pond, the conservatory you just built — never gets found.

Fix the reading, then fix the measurement so it stays fixed.
