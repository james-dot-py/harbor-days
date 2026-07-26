---
id: 036
area: lincolnpark
severity: high
source: owner-playtest-2026-07-24
---
# NPCs sitting out in the water east of the zoo

**Where:** the lake EAST of the zoo (zoo at x ~-5…-58, z ~790–848; east = +x, toward the water).

**Observed (owner):** lots of people (NPCs) are sitting / placed out in the water east of the zoo.

**Expected:** NPCs sit on land / beach / lawn only — none in the lake. Placement must respect the water / LAND polygon.

**Fix direction:** the zoo / lakefront NPC scatter is seeding into the water polygon east of the zoo; clamp the scatter to walkable land (coastQuery/tierAt land test on every seeded position). Add a PERMANENT guard: no NPC or prop spawns below the waterline / inside the water polygon (same class as issue 032 L-columns and issue 033 continuity — one shared gate). Judged waypoint from the zoo looking east over the water.

---
**RESOLVED (task 120, 2026-07-26).** Root cause was not a seeding bug: the Millennium cell's park visitors hang off the SCENE root, and Lincoln Park's growth put the lakefront player inside their 145 m cull — they rendered standing on the open lake. Fix: hard-cell ADOPTION (framework.js `_cellAdopt`/`addAtWorld` + cells.js `cellAt`) — any rig spawned inside a hard cell's clamp is re-parented to that cell's root on the first update frame, so it hides with the cell; a parklife corner reader marching into the pier slip was also caught and re-snapped, and the watertoys tubers/paddleboarder carry an explicit `userData.overWater` allowlist flag. Judged waypoint `lp-zoo-lakeview` (3 framings): empty water east of the zoo (tools/shots/run-ms20cpwm/). Permanent guard: tools/no-solid-in-water.mjs (live rig sweep + cell-leak check B/C) runs inside walkprobe.
