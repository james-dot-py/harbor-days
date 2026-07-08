---
id: 006
area: wrigleyville
type: signoff
turns: 120
title: Wrigleyville sign-off (§5.2) — formalize the shipped neighborhood, unlock the planner
acceptance: >
  Run the full §5.2 sign-off on the Wrigleyville area in ONE fresh walkthrough
  (node tools/walkthrough.mjs --area wrigleyville): (1) every waypoint's
  authored expectation judged met from the PNGs with a per-waypoint verdict
  logged; (2) the standing gate green including draw calls within budget at
  every waypoint; (3) walkprobe covers every walkable surface (206+ already
  pass — confirm no gaps); (4) at least 3 shipped delight moments logged for
  the area (DELIGHT-SHIPPED.md already lists several pre-autopilot — cite
  them); (5) the EVOCATION REVIEW: spawn ONE fresh-eyes subagent that has NOT
  seen the build tasks, give it ONLY the contact sheet and refs/wrigley-field/,
  and it must name where it is and cite what gives it away — a wrong or vague
  answer fails; file polish tasks and retry after fixes. Write
  refs/wrigleyville/SIGNOFF.md (verdicts + contact-sheet path), commit, push.
  This SIGNOFF.md is what unlocks §5.3 planner self-expansion.
refs:
  - AUTOPILOT.md §5.2 (sign-off), §5.4 (faithfulness standard)
  - tools/waypoints.expect.json (the authored expectations)
  - DELIGHT-SHIPPED.md (pre-autopilot Wrigleyville moments)
  - refs/wrigley-field/ (reference photos for the evocation review)
---

Wrigleyville shipped pre-autopilot and never got a formal SIGNOFF.md — the
planner (queue-empty → pick next site) stays locked until one exists. This
task formalizes what's already built, at the §5.2 bar, honestly: if the
walkthrough or evocation review finds real gaps, file polish tasks and fail
rather than rubber-stamping.
