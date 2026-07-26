---
id: 123
area: lincolnpark
type: signoff
model: fable
turns: 120
title: Lincoln Park sign-off (§5.2) — formalize the stretch, unlock the planner
acceptance: >
  Run the full §5.2 sign-off on the lincolnpark area in ONE fresh
  walkthrough (node tools/walkthrough.mjs --area lincolnpark): (1) every
  lp-* waypoint has an authored expectation and every expectation is
  judged MET from the PNGs with a per-waypoint verdict logged — every PNG
  personally Read; (2) the standing gate green including draw calls ≤480
  at every lp waypoint; (3) walkprobe covers every new walkable surface
  (the west panel, the Fullerton underpass, harbor promenades, zoo paths,
  the boardwalk ring, garden walks) and exits 0, plus shoreline-simple /
  prop-clearance / path-layers green; (4) at least 3 delight moments
  shipped and logged in DELIGHT-SHIPPED.md for this area (118's ledger
  lines verified present at their commits); (5) the EVOCATION REVIEW
  passes: a fresh-eyes subagent that has NOT seen the build tasks Reads
  the contact sheet against refs/lincoln-park/ and must name where it is
  and cite what gives it away — a wrong or vague answer FAILS the review;
  file polish tasks, renumber this task after them per the iteration
  script, and stop honestly. (6) Verify the CONTIGUITY promise held: one
  uncut walk from the Belmont Rocks to the South Pond boardwalk with no
  seam — and the map's first west-of-LSD panel + working underpass read
  as one world, with the minimap sane at the new aspect. (7) Write
  refs/lincoln-park/SIGNOFF.md (per-waypoint verdicts + contact-sheet
  path + the evocation transcript), update LOCATIONS.md (Lincoln Park →
  Shipped, with the sign-off date and the standing liberties worth
  surfacing — the west-reach compression, the L-backdrop relocation, the
  skyline physics ruling at South Pond), commit, push. Only a green
  sign-off unlocks planning the next location.
refs:
  - AUTOPILOT.md §5.2 (the sign-off contract — follow it mechanically)
  - refs/lincoln-park/ (BRIEF.md, refs, osm.json), refs/montrose/
    SIGNOFF.md + refs/millennium-park/SIGNOFF.md (format precedents)
  - DELIGHT-SHIPPED.md, autopilot/issues/ (must be lincolnpark-clean)
---

The gate exists to catch wishful green — judge the walkthrough as if
someone else built it. The evocation reviewer is the owner's proxy: if it
can't say "Lincoln Park — the zoo, the seal pool, the conservatory, the
honeycomb boardwalk" unprompted, the stretch isn't done, no matter how
green the mechanics are.

---
RENUMBERED 120 → 123 by the 2026-07-24 sign-off attempt (iteration script
step 8): the sign-off found the pipeline INCOMPLETE — the conservatory
(parked 116) is unbuilt (orphaned data, consumed by no builder), and it is
named in this very note and the owner's vision line as part of "done". Filed
task 122 to build it and issue 031 documenting the blocker. This retry runs
AFTER 122 lands. When it does: the §5.2 walkthrough of record must be ONE
fresh full run that INCLUDES lp-conservatory + lp-bates; everything else was
already verified green here (walkprobe 1554/0, single-file build, 118+ delight
lines present, no LP issues/feedback) so this retry is mostly the conservatory
waypoints + the contiguity/evocation/minimap passes + writing SIGNOFF.md.
