---
id: 009
area: wrigleyville
type: feedback
title: Sluggers batting cage becomes a real destination; bleachers become visitable
acceptance: >
  Owner feedback (2026-07-08): "if we're gonna spend time making the bleachers
  at wrigley, we should ensure the user can visit them. Also, sluggers batting
  cage is sadly small and it's on the street. Make a way to enter sluggers and
  walk to the batting cage to start playing. Maybe put the batting cage on top
  of sluggers and lets you bat the ball into the park? If that's not a good
  idea don't do it, but make the batting cage something more than just a hut
  on the street." Concretely: (1) the batting cage stops being a street hut —
  the real Sluggers has upstairs cages, so the owner's rooftop-cage idea is
  historically grounded: prefer a rooftop cage on the Sluggers bar (VILLAGE_W
  clarkBars 'SLUGGERS' lot) reached by a visible stair/entry the player can
  WALK (walkable rules + walkprobe expects for every new surface, defined in
  src/data/wrigleyville.js — the shared module, never forked; enclose the
  elevated rect so streets don't act as elevators, PITFALLS.md); (2) the cage
  activity (chargeThrow-style swing via the existing interaction API) works ON
  the rooftop; batting a ball toward the park is a delight-bonus if the arc
  reads well from the rooftop — skip it honestly if it doesn't; (3) bleacher
  access: player can reach a bleacher vantage (the CF bleachers under the
  scoreboard or a Sheffield/ Waveland bleacher row) via a walkable route with
  expects, and the view INTO the park from there reads (screenshot + READ);
  (4) walkthrough waypoints added/updated for the cage and the bleacher
  vantage with honest expectation strings; draw budget respected
  (tools/budgets.json — never raise); determinism (local seeds only).
refs:
  - autopilot/feedback/processed/feedback-2026-07-08T21-36-33-140Z.md (the note)
  - src/data/wrigleyville.js (VILLAGE_W.clarkBars, STADIUM_W, WALK_W)
  - src/wrigley/village.js (buildBars), src/wrigley/stadium.js (bleachers)
  - PITFALLS.md (elevated walk rects; village.js add() snapshot rule)
  - the existing rooftop stair pattern (ROOFTOPS_W stair/stairLanding) as the
    walkability template for the Sluggers stair
---

Owner playtest direction — treat as high-signal. Two connected asks: elevated
places we model should be REACHABLE (bleachers), and the batting cage should
be a destination with an approach, not street furniture. The rooftop-cage idea
is the owner's suggested shape, endorsed "if it's a good idea" — the real
Sluggers' claim to fame IS its upstairs batting cages, so it fits. Keep the
current cage prop wherever it aids the street read, but the playable cage
moves to the destination. Scope honestly; if bleacher access wants real
stadium-interior work, split it out rather than faking an interior.
