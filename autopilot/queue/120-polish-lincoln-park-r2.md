---
id: 120
area: lincolnpark
type: polish
model: fable
turns: 140
title: Lincoln Park POLISH R2 — owner playtest burn-down (issues 032–036) + AAA pass
acceptance: >
  Owner playtest 2026-07-24 found real breakage; fix ALL of it to the AAA bar.
  The owner's standing rule: the four shipped neighborhoods must read AAA before
  the loop expands — treat NONE of these as cosmetic. Every fix gets a JUDGED
  WAYPOINT at the owner's coords (fix-the-measurement-first), and where noted a
  PERMANENT gate so it cannot regress. Burn down autopilot/issues/ 032–036:
  (1) ISSUE 032 (18.4, 233.3): close the water-gap seen past the RIGHT of the
  trail bushes AND get every Belmont L platform column out of the lake onto solid
  ground. Judged waypoint looking east from the trail; fold the columns into the
  no-solid-in-water guard (see 5).
  (2) ISSUE 033 (29.1, 403.7): weld the disjointed paths at the Diversey corner —
  continuous seams, no offsets/gaps (pathSamples2, miter welds). Add the seam to
  the permanent path-continuity gate (102/104 precedent) + judged waypoint.
  (3) ISSUE 034: the distant backdrop must stop fading/popping as you walk SOUTH —
  extend/soften the backdrop band + fog far-plane to cover the full south reach;
  draws still ≤480 at every affected waypoint (MEASURE). Judged walk-south
  waypoint that catches the pop.
  (4) ISSUE 035 (marquee — the front door to the whole neighborhood): a REAL
  walkable crossing over/under Lake Shore Drive into Lincoln Park. buildLSD's
  berm/road becomes a SOLID collider the player cannot pass through; the player is
  NEVER rendered inside the highway mass; the crossing (finish the Fullerton
  underpass ~x6,z661 as walkable + screened with LSD solid above, OR a pedestrian
  bridge deck) is the intended route. GEOGRAPHY.md updated FIRST; walkprobe expects
  + judged waypoint at the crossing; anti-clip walk rule routes the player to it
  (065 anti-trap precedent). If the full bridge STRUCTURE is too big for one pass,
  the MINIMUM here is LSD-solid + no clip-through + routed to the existing
  underpass, and you FILE a dedicated NNN build task for the full bridge (renumber
  the sign-off after it) — do not fake it and do not silently drop it.
  (5) ISSUE 036: no NPC or prop EVER sits in the water. Clamp the zoo/lakefront
  NPC scatter to walkable land (coastQuery/tierAt land test on every seeded
  position) and add ONE shared PERMANENT guard (a tool + gate) that fails if any
  NPC / prop / structural column is inside the water polygon or below the
  waterline — covers 032, 036, and future regressions. Judged waypoint from the
  zoo looking east over the water.
  (6) AAA PASS while you are in here: node tools/walkthrough.mjs --area
  lincolnpark — judge every lp-* waypoint against refs at the /art-director bar,
  fix framing/palette/prop-gap misses, re-shoot, re-judge; every PNG personally
  Read (NPC-on-camera-point trap 061/080). One uncut continuity walk Belmont
  Rocks → South Pond boardwalk, zero stalls/traps, desktop AND mobile input paths.
  (7) GATES: walkprobe + shoreline-simple + prop-clearance + path-layers + the new
  no-solid-in-water guard all exit 0; determinism spawn-shot ≈ noise vs baseline;
  npm run build one artifact; zero console/page errors; canary echoes; record the
  area's worst-view draw count in the close-out.
  (8) NO NEW SCOPE beyond the burn-down + AAA framing/perf/continuity fixes;
  anything bigger (e.g. a full LSD bridge structure) is FILED as a task, not
  crammed here.
refs:
  - autopilot/issues/032, 033, 034, 035, 036 (the burn-down list — every one
    resolved or explicitly re-filed with rationale)
  - refs/lincoln-park/BRIEF.md + imagery (the judgment standard); GEOGRAPHY.md
    Lincoln Park section (update FIRST for the LSD crossing)
  - src/data/chicago.js (COAST/LAND polygon, buildLSD berm/road + underpasses +
    fullertonUnderpass ~x6,z661, Belmont stop stub, zoo/lakefront NPC scatter),
    src/coast.js (coastQuery/tierAt land test), src/paths.js (path welds /
    continuity), src/structures.js (LSD, platform, bridge decks)
  - PITFALLS.md (NPC-keeper camera trap; path-continuity gate; anti-trap walk rule
    065; own-vite; PNG-read gate); Montrose 075 polish close-out precedent
---

Owner's words (2026-07-24 playtest): "you can see water past the right of the
bushes… the L platform columns go into the water"; "paths disjointed, looks
bad"; "the buildings that are supposed to be in the distance just fade away";
"there's not a real bridge over lakeshore drive… you have to pass through the
highway and you're obscured by it; solids shouldn't pass through solids"; "lots
of people just sitting out in the water east of the zoo."

And the standing bar (owner, same session): the four shipped neighborhoods must
be AAA before the loop moves on — this is the quality it takes to make a local
say "they nailed it," not a checklist to green. The LSD crossing is the one that
changes how the place FEELS: it is the front door to the whole neighborhood.
Make it real.

## WIP NOTE — a previous attempt left real work in the tree (supervisor, 2026-07-26)

An earlier 120 session ran ~26 h and was killed by a machine restart BEFORE it
could commit. Its work is still in the working tree, uncommitted — do NOT
`git checkout`/revert it blind, and do not rebuild it from scratch:

- modified: `GEOGRAPHY.md`, `src/cells.js`, `src/coast.js`, `src/data/chicago.js`,
  `src/framework.js`, `src/main.js`, `src/paths.js`, `src/sky.js`,
  `src/structures.js`, `src/packs/{ambient,artinstitute,millennium-lawnlife,
  parklife,watertoys}.js`, `tools/{gen-waypoints,path-continuity,walkprobe}.mjs`,
  `tools/waypoints.json`, `tools/waypoints.expect.json`
- new: `tools/no-solid-in-water.mjs` (the permanent guard this task asks for)
- scratch to delete before close-out: `tools/tmp-120-*.mjs`

**First**, survey what is actually there (`git diff --stat`, read the new guard,
run the gates) and judge it on its merits: keep what holds, finish what is
half-done, discard only what you can show is wrong. Then carry the task to green
normally. Treat the state as a head start, not as truth — it was never verified.
