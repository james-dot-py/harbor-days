---
id: 107
area: lakefront
type: delight
model: opus
turns: 100
title: Trail micro-discovery pass — something worth noticing every ~50 m (B3)
acceptance: >
  From the 2026-07-19 design audit: dense cores hold the 30–60 s discovery
  rule, but the Belmont↔Montrose connectors, harbor rim, and Montrose beach
  back-edge degrade to just-walking. MEASUREMENT FIRST (the standing
  doctrine): add judged waypoints along the connectors BEFORE placing
  anything (tools/gen-waypoints.mjs + waypoints.expect.json, coords derived
  from data modules so they survive layout rework), then close the gaps.
  Budget: 1 noticeable thing per ~50 m on those stretches, from the existing
  palette only — honorary signs, bench + sitSpot, gull clusters, painted
  rocks, deadpan historical plaques ("on this spot in 1974, a guy named Ray
  saw a really big fish"), shell/feather +1-dibs micro-picks (through
  wallet.pay, reason string, repeat-throttled per ECONOMY.md). All placement
  via src/data/chicago.js data, prop-clearance sweep (088 machinery) clean,
  determinism gate green (append placements; never reorder rng consumers).
  Runs AFTER 102/104 by queue order — their geometry fixes land first.
  Accept: the new waypoints' before/after shots show a noticeable thing in
  each; walkprobe + clearance + determinism gates green; draw calls ≤ 480.
refs:
  - src/data/chicago.js, src/props.js
  - tools/gen-waypoints.mjs, tools/walkprobe.mjs
  - ECONOMY.md (payout register), PITFALLS.md
  - autopilot/queue/done/ (088 visual-truth guards)
---

Owner license (2026-07-19): 'you can change things not listed if you see
fit' — adjacent improvements beyond this spec are allowed where clearly
right, with determinism + all gates green.
