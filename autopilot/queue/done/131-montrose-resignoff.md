---
id: 131
area: montrose
type: signoff
model: fable
turns: 90
title: Montrose §5.2 RE-SIGN-OFF after the 129 reserve expansion
acceptance: >
  Task 129 (owner directive 2026-08-02, issue 041) re-laid the largest open ground
  in the game: the Montrose Beach Dunes Natural Area now has an inland dune-and-
  swale unit occupying the old dead lawn west of the bike path (x ~33-171,
  z ~-834..-672), with nest cells, a corridor + spur route, a viewing platform +
  scope beat, monitors, and plover pairs. That is a large enough layout change
  that the 076 sign-off of record no longer fully describes the place. Re-run the
  §5.2 sign-off for the montrose area END TO END: (1) ONE fresh full
  `node tools/walkthrough.mjs --area montrose` run of record (own vite + canary),
  every waypoint expectation judged MET with every PNG personally read — the set
  now includes mt-lawn-fill / mt-reserve / mt-exclosure / mt-overlook and the
  re-authored mt-gate; (2) standing gates green (walkprobe incl. deck-coverage
  with the new reserve-platform deck, single-file build, spawn determinism diff,
  draw budgets <= 480 at every mt waypoint); (3) a fresh CONTIGUITY walk
  Belmont Rocks -> Montrose Beach that now ALSO detours through the reserve
  corridor (west gate -> east gate) with 0 stalls — the steering bot must route
  AROUND the two nest-cell data carves (PITFALLS: area carves need routed-around
  bot paths, not through); (4) a fresh-eyes EVOCATION review (evoc-prep.mjs
  anonymized contact sheet, blind phase 1 then refs comparison) — the reserve
  should surface as "the Montrose Beach Dunes / the plover area" unprompted;
  (5) update refs/montrose/SIGNOFF.md as the new record (keep the 076 record as
  a superseded section), LOCATIONS.md stays Shipped with the new date. If any
  129 content fails its expectation honestly, file the polish gap and renumber
  this task after it per the standing rule.
refs:
  - refs/montrose/SIGNOFF.md (the 076 record this supersedes)
  - GEOGRAPHY.md §The RESERVE EXPANSION (129) + §Montrose
  - autopilot/issues/041-montrose-negative-space.md (closed by 129)
  - tools/waypoints.expect.json mt-* entries
---

129 rebuilt the biggest open space at Montrose into the reserve's inland unit.
The 076 sign-off (14 waypoints, "barren-shell emptiness is by design" at
mt-arrival) predates it. Re-certify the whole area against the new truth: the
walkthrough set grew by four waypoints, the corridor is a new route players will
actually take between the underpass and the trail, and the platform scope is a
new camera-owning beat that must not regress the 126 ownership law.
