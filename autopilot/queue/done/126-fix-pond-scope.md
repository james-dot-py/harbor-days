---
id: 126
area: lincolnpark
type: polish
model: opus
turns: 80
title: The South Pond night-heron scope vibrates instead of showing you anything (issue 039)
acceptance: >
  Owner playtest 2026-07-26: "scope on the path on the pond in lincoln park doesn't
  seem to work right, just vibrates when you look in it." This is the night-heron
  scope on the South Pond boardwalk, shipped by task 118 ("SPOT THE NIGHT-HERON").
  (1) REPRODUCE FIRST. Drive tools/act.mjs along the boardwalk to the scope, trigger
  the look-through, capture SEVERAL consecutive frames, and Read them — a vibration
  shows up as frame-to-frame jitter between otherwise identical shots. Do not start
  editing until you have the jitter on disk.
  (2) ROOT-CAUSE IT. "Vibrates" is the signature of a camera fight: two writers
  moving the camera transform in the same frame, each undoing the other. Rank and
  check: the scope camera vs. the normal follow/chase cam still updating; a lerp
  toward a target that is itself recomputed from the already-moved camera; a missing
  camCtl.snap on entry (the documented teleport/lerp trap); yaw/pitch re-derived
  each frame from a value the scope just wrote. Name the actual cause in your result
  summary — a fix without a stated cause is not a fix.
  (3) CHECK THE MONTROSE SCOPE TOO (MONTROSE_POINT.scope, referenced in
  src/packs/favors-montrose.js). If the two share a scope mechanism they share the
  bug — fix it ONCE in the shared path and assert both, rather than patching the
  Lincoln Park instance and leaving a twin broken.
  (4) THE FIX: exactly ONE writer owns the camera while the scope is active, and it
  restores cleanly on exit — no drift, no snap-back lurch, no residual yaw. Looking
  through it should be still, framed, and worth doing: the heron actually findable
  in the view, the framing steady enough to enjoy.
  (5) MEASUREMENT: a judged waypoint for the through-scope view, plus a stability
  assertion if you can express one cheaply (e.g. consecutive-frame camera delta
  under threshold while the scope is held) so a re-regression is caught mechanically
  and not by the owner.
  (6) PITFALLS.md gets the lesson — camera-ownership during any look-through beat —
  so the next scope/binocular/telescope idea does not re-learn it. Note the 118
  binoculars/birdwatch-deck precedents.
  (7) walkprobe exits 0; permanent guards green; local seeds; zero new buckets;
  draws <= 480; npm run build one artifact, zero console errors; every PNG Read.
  Lincoln Park is SIGNED OFF (123) — extend the waypoint set, do not re-run §5.2.
refs:
  - autopilot/issues/039-south-pond-scope-vibrates.md (the report + ranked causes)
  - task 118 delight (commit 4a3fc3e, "SPOT THE NIGHT-HERON") — where the scope
    shipped; task 117 South Pond boardwalk for the surrounding geometry
  - src/packs/favors-montrose.js + MONTROSE_POINT.scope (the possible twin)
  - src/main.js (camera/follow-cam update order), src/framework.js (registerUpdate,
    addInteraction), src/core.js (camera + the world-curve vertex shader)
  - PITFALLS.md (camCtl.snap on teleports; camera-in-geometry traps)
  - harbor-days-cell-pattern lesson: the follow-cam lerp swooshes across the map on
    teleports unless camCtl.snap is set — same class of bug
---

The owner leaned into a telescope on a quiet boardwalk expecting to find a heron and
got a shaking screen. That is the kind of thing that makes a cozy game feel cheap —
the beat is *supposed* to be the calmest moment in the neighborhood.

Fix the camera ownership, not the symptom. And if Montrose has the same scope
mechanism, fix them together — shipping a fix for one and leaving its twin broken is
how this comes back as another playtest note.
