---
id: 119
area: lincolnpark
type: polish
turns: 120
title: Lincoln Park POLISH — art-director pass, perf budget, continuity walk, issue burn-down
acceptance: >
  The lincolnpark area is sign-off ready. (1) FULL WALKTHROUGH: `node
  tools/walkthrough.mjs --area lincolnpark` — every lp-* waypoint judged
  against its expectation string + the refs at the /art-director standard;
  every PNG personally Read; fix what misses (framing, palette, prop
  gaps), re-shoot, re-judge. Recheck framings against NPC/animal
  placements (a keeper sited on a framing's camera point passes the
  walkthrough while the shot shows a head — the 061/080/NPC-keeper trap).
  (2) CONTINUITY: one uncut walk from the Belmont Rocks corner through the
  Diversey gate, down the harbor channel, under Fullerton, through the zoo
  gate, around the boardwalk ring — input-driven bot or scripted act.mjs
  run, zero stalls, zero walkability traps; both desktop AND mobile input
  paths spot-checked (touch coach + camera framing per the 096 laws).
  (3) PERF: draw calls ≤480 at EVERY lp-* waypoint and the standing worst
  views (millennium 478/480 must not move); record the area's worst view
  in the close-out. (4) DETERMINISM: canonical spawn shot ≈noise vs
  baseline; walkprobe + shoreline-simple + prop-clearance + path-layers
  all exit 0. (5) ISSUE BURN-DOWN: every autopilot/issues/ entry touching
  lincolnpark resolved or explicitly re-filed with rationale; owner
  feedback notes touching the area folded in. (6) NO NEW SCOPE: this task
  fixes what exists to the bar; anything bigger gets filed as a queue
  task, not built here. (7) `npm run build` one artifact; zero
  console/page errors; canary echoes.
refs:
  - refs/lincoln-park/BRIEF.md WAYPOINTS (final) + refs/lincoln-park/
    imagery (the judgment standard)
  - The /art-director skill (run it on the contact sheet)
  - autopilot/issues/ + autopilot/feedback/ (the burn-down list)
  - PITFALLS.md (NPC-keeper camera trap; own-vite; PNG-read gate)
  - Montrose 075 close-out (the polish-precedent: continuity walk +
    both-inputs + worst-view ledger)
---

Judge the area as if someone else built it — the sign-off's evocation
reviewer follows immediately after, and 076/Montrose proved the polish
pass is where "mechanically green" becomes "reads like the place." The
likeliest misses, from precedent: animal habitats that read empty at
waypoint distance (cluster tighter, scale up), the conservatory framing
buried in garden canopy, boardwalk deck seams acting as elevators, and
the Fullerton underpass mouths reading as the old dead-end register.
