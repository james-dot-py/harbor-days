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
