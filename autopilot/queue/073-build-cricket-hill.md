---
id: 073
area: montrose
type: build
turns: 100
title: Cricket Hill — the walkable kite mound and its summit view
acceptance: >
  The city's kite hill rises inland-west of the harbor and you can walk up
  it: (1) THE MOUND: built exactly from the 068 analytic model in the shared
  data module — surfaceY + walkability from ONE definition imported by both
  the engine and tools/walkprobe.mjs (never forked); grassy toon slopes that
  blend into the surrounding lawn carpet, height per the 068 finals (~7 m
  class), no cliff seams. Player physics hold on the slope: walk up/down all
  8 directions, jump lands correctly, no step-up elevator exploits at the
  base, chase camera keeps ≥3.5 m headroom logic intact on the summit (no
  ground clipping looking downhill). (2) DRESSING: kite-flyer NPCs on the
  summit/windward slope with kites aloft (existing NPC + prop vocabulary;
  kite lines are cheap merged geometry; INTERACTIVE kite flying belongs to
  074 — this task ships the tableau), a worn desire-path to the top if the
  refs support it, scatter local-seeded. Zero new InstancedMesh buckets.
  (3) DETERMINISM: canonical spawn shot ≈noise vs baseline; no shared rng.
  (4) WAYPOINTS: mt-crickethill-summit (the earned view — harbor masts +
  the Point + open lake from the top; stand/framing per the BRIEF, mind
  that a summit camera pulls back DOWNHILL into clear air, not into the
  slope) + mt-crickethill-base (the mound's silhouette against the sky with
  kites), wired + expects; walkthrough green including a re-check of any
  earlier mt-* waypoint whose frame now contains the hill (new mass
  invalidates old framings, PITFALLS); draws ≤480 everywhere checked; every
  PNG personally Read and judged vs expectation + refs. (5) walkprobe
  covers the slope + summit (grid of expects at several radii/bearings,
  exit 0); `npm run build` one artifact; zero console/page errors; canary
  echoes.
refs:
  - refs/montrose/BRIEF.md + fetched Cricket Hill imagery + GEOGRAPHY.md
    Montrose section (the 068 mound model — apply, don't re-derive)
  - src/coast.js (beachH/tierAt — the analytic-surface precedent the mound
    model follows), src/main.js (player ground/step physics)
  - PITFALLS.md (elevated-rect elevator threshold; camera headroom; new
    mass invalidates framings)
---

The first walkable HILL in the game — the risk is all in the surface model
(one analytic definition, engine + walkprobe lockstep) and the player/camera
feel on slopes, which is why the mound is its own task. The payoff waypoint
is the summit: Chicagoans climb Cricket Hill for exactly this view, so
mt-crickethill-summit is the stretch's postcard — judge it against the
art-director bar, not just "renders".
