---
id: 075
area: montrose
type: polish
turns: 120
title: Montrose POLISH — art-director pass, issue burn-down, budgets, traps, both inputs
acceptance: >
  The stretch is sign-off-ready: (1) OWNER FEEDBACK FIRST: read
  autopilot/feedback/ (skip processed/) and fold anything Montrose-bearing
  into this pass ahead of self-found work; move handled notes to
  processed/. (2) ART-DIRECTOR PASS: run the full mt-* walkthrough, judge
  every PNG via the /art-director skill against refs/montrose/ — fix what
  fails (composition, palette drift, scale reads, signage legibility,
  anything that reads "any city" instead of Montrose); re-shoot and
  re-judge after each fix. (3) ISSUE BURN-DOWN: close every open
  autopilot/issues/ item touching the montrose area; file honest new ones
  found during the pass and fix what fits the session. (4) PERF LEDGER:
  draw calls measured + recorded at every mt-* waypoint AND the standing
  worst views (millennium 478/480 class) — all ≤480; if any new global
  cost crept in from 069-074, fold it back (merge-pool + atlas + bucket
  reuse) before sign-off. (5) TRAPS + CONTINUITY: the 065-class sweep on
  the whole new stretch — no collider ring reaching non-walkable ground,
  anti-trap escape verified with a synthetic trap (tools/tmp-trapbot.mjs
  pattern), trail/coast/hill seams walkable end-to-end (a steering-bot
  walk from the Irving Park line to the beach's far end without stalls,
  routing beside point colliders); jump/step behavior sane at every
  elevation seam (pier root, hill base, beach edge). (6) BOTH INPUTS:
  desktop WASD/E/SPACE and mobile joystick + buttons exercised on the new
  interactions (act.mjs --mobile taps hold ≥160 ms). (7) DETERMINISM:
  canonical spawn shot ≈noise vs baseline; walkprobe exit 0; `npm run
  build` one artifact; zero console/page errors; canary echoes; every PNG
  personally Read.
refs:
  - refs/montrose/BRIEF.md + SIGNOFF criteria (AUTOPILOT.md §5.2 — this
    task clears the runway for 076)
  - autopilot/issues/ (open items), autopilot/feedback/ (owner notes)
  - PITFALLS.md (collider traps; steering bots; headless timing; budgets)
  - tools/walkthrough.mjs, tools/act.mjs, .claude art-director skill
---

Verification-heavy by design: the point of this task is that 076's sign-off
walkthrough finds nothing new. Fix causes, not screenshots — a sink report
is a walk-data bug, a stall is a collider-ring bug, a flat read is a
composition bug. Anything too big for the session becomes an honest issue +
a queue task filed ahead of 076.
