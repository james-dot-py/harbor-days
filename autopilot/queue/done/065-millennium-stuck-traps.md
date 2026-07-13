---
id: 065
area: millennium
type: bug
model: opus
turns: 80
title: Never stuck again — Lolla arch trap + connectivity sweep + anti-trap rule (issue 025)
acceptance: >
  Owner got HARD-STUCK ("can't move at all") at the Lolla entry arch —
  screenshot refs/inbox/owner-issue-025-stuck-lolla-arch.png, north face
  of the maroon arch at Butler Field's west edge by the streetwall gap.
  Three layers, all required: (1) THE SPOT: reproduce it (walk the owner's
  approach from the streetwall side), diagnose islet-vs-collider-wedge,
  fix the arch's colliders/walk data so the passage is honestly passable
  or honestly closed, re-walk it clean. (2) THE CLASS — CONNECTIVITY:
  extend tools/mp-gridsweep.mjs with a flood-fill reachability pass from
  the cell spawn: every walkable cell in the sweep must be REACHABLE from
  spawn; disconnected walkable islets are failures with coordinates
  printed. Run it over the full Millennium/Grant footprint and fix every
  islet it finds (the arch will not be the only one after a 4-zone
  expansion). Wire the reachability pass into walkprobe so it gates
  forever. (3) THE GUARANTEE — anti-trap rule in main.js movement: if the
  player's current position tests unwalkable OR all 8 probe directions
  are blocked (trapped), permit movement toward open ground (accept the
  candidate step whose destination is walkable, ignoring the blocked
  current cell) — the game must never hard-stick the player again, even
  on top of a future placement bug; implement in the shared movement
  gate so ALL cells inherit it, no per-frame allocations, jetski/water
  gates unaffected (the issue-017 guard stays intact). (4) THE GRASS
  (owner, same session: "i can't move onto the grass in all places"):
  audit lawn walkability across Butler Field and every expansion lawn —
  the flood-fill will enumerate blocked-grass patches; open them unless a
  solid prop genuinely stands there. Prime suspect: 061's crowd zones as
  blocked rects — WRONG for a festival lawn: you wade through a crowd
  (instanced crowd stays collider-free; real NPC rows bump-ope; only the
  stage structure + sound booth + trucks are solid). The whole field
  should walk edge to edge, crowd and all. Verify: bot-walk
  the owner's exact approach, the fixed arch both sides, plus a synthetic
  trap test (temporarily blocked cell → player still escapes). Zero rng
  impact; walkprobe green incl. new reachability section; draw budget
  unchanged; single-file build.
refs:
  - refs/inbox/owner-issue-025-stuck-lolla-arch.png (the spot, owner-supplied)
  - autopilot/issues/025-stuck-traps-millennium.md
  - tools/mp-gridsweep.mjs (extend), tools/tmp-crossbot.mjs pattern from 062 (steering-bot verification)
  - src/main.js (movement gate canMove/walkable — the anti-trap rule lives here)
  - autopilot/issues/017-millennium-walkability-holes.md (the sibling class, already fixed — don't regress its guard)
---

Two class fixes in one small task: reachability turns "the owner found a
trap" into "the sweep finds every trap first," and the anti-trap rule
means even the traps nobody finds can't hold anyone. After this, stuck
is a bug the player never experiences — only the test suite does.
