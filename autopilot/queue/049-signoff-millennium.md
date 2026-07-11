---
id: 049
area: millennium
type: signoff
turns: 120
title: Millennium Park sign-off (§5.2) — formalize the neighborhood, unlock the planner
acceptance: >
  Run the full §5.2 sign-off on the millennium area in ONE fresh walkthrough
  (node tools/walkthrough.mjs --area millennium): (1) every mp-* waypoint
  has an authored expectation and every expectation is judged MET from the
  PNGs with a per-waypoint verdict logged — every PNG personally Read;
  (2) the standing gate green including draw calls <= 480 at every mp
  waypoint; (3) walkprobe covers every walkable surface this pipeline added
  (park plazas, under-bean arch, wet pool plaza, Great Lawn, Lurie
  boardwalk, BP bridge deck + ramps, kiosk stair) — confirm no gaps against
  GEOGRAPHY.md MILLENNIUM_GEOGRAPHY; (4) at least 3 shipped delight moments
  logged for the area in DELIGHT-SHIPPED.md (047's work — cite lines);
  (5) the EVOCATION REVIEW: spawn ONE fresh-eyes subagent that has NOT seen
  the build tasks, give it ONLY the contact sheet and refs/millennium-park/,
  and it must name where it is and cite what gives it away — a wrong or
  vague answer fails; file polish tasks and retry after fixes. Also verify
  the CONNECTOR: one scripted Belmont -> Monroe ride lands at the kiosk
  with correct toasts/minimap (the neighborhood is only real if you can
  ride to it). Write refs/millennium-park/SIGNOFF.md (verdicts +
  contact-sheet path), commit, push. This SIGNOFF.md is what unlocks §5.3
  planner self-expansion.
refs:
  - AUTOPILOT.md §5.2 (sign-off), §5.4 (faithfulness standard)
  - tools/waypoints.expect.json mp-* entries (the authored expectations)
  - DELIGHT-SHIPPED.md (the millennium moments)
  - refs/millennium-park/ (reference photos for the evocation review)
  - refs/wrigleyville/SIGNOFF.md (the format precedent, task 006)
---

Honest bar, same as task 006: if the walkthrough or the evocation review
finds real gaps, file polish tasks and FAIL rather than rubber-stamping —
the gate exists to catch exactly that.

## Retry sequencing (supervisor note)
If you fail and file polish tasks: git mv THIS file to the next free NNN
after them so the fixes run before the sign-off retries (queue executes in
number order).
