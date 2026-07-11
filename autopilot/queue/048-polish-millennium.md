---
id: 048
area: millennium
type: polish
turns: 120
title: Millennium Park POLISH — art-director pass, issue burn-down, budgets, both inputs
acceptance: >
  OWNER PUNCH LIST FIRST (2026-07-11 playtest, exact coords via the dbg HUD;
  refs/millennium-park/OWNER-PHOTOS.md logs them): (0a) WALKABILITY HOLES —
  issue 017, TOP PRIORITY: fall-through-to-jetski at (168.0, 866.0), the
  Pritzker STAGE falls through at (144.7, 758.0), and the owner says "quite
  a few places" — fix the CLASS per the issue: the cell's walkable() answers
  definitively everywhere inside its clamp; hard cells must NEVER reach the
  jetski/water fallback in main.js (guard the class, not the spots); then a
  ~2 m grid sweep of the entire cell to enumerate and close EVERY hole, not
  just the two reported. (0b) INVISIBLE BENCH: sitting by the rill at
  (155.8, 864.7) seats the mayor on nothing — give that sit spot real seat
  geometry (the Lurie boardwalk-edge bench) or move it onto existing
  furniture. (0c) BP BRIDGE STAIRS at (188.5, 798.0): the tread rectangles
  are jacknifed straight boxes — each tread must follow the serpentine
  (derive tread yaw from the bridge curve's tangent at its station; nothing
  clips the balustrade). (0d) the Great Lawn crowd at (138.4, 824.2) must be
  REAL PEOPLE — full chibi NPCs in the lawnlife register (picnics,
  sunbathers, loungers) that bump and ope up close; baked LOD twins only at
  distance; budget-aware. THEN the standard pass: (1) A FULL fresh
  `node tools/walkthrough.mjs --area millennium` run; personally READ every
  PNG; judge every mp-* waypoint against its expectation + /art-director +
  refs/millennium-park/; fix everything short of green — framing traps
  (cameras inside trellis arcs/hedges/towers; hand framings bypass
  camBlockedW, and new mass since the framings were authored invalidates
  them per the task-034 lesson), palette drift, unreadable signage, bare
  patches that read as anywhere-filler. (2) SIGN AUDIT on every sign this
  pipeline added (kiosk pylon, bean plate, journal boards, any vendor
  boards): the two systemic failures from PITFALLS — mirrored back-reads
  (lone DoubleSide) and post-bisected text — plus canvas clipping on long
  words (task 028). Screenshot each sign from front AND back approach
  lines. (3) ISSUE BURN-DOWN: every open autopilot/issues/*.md that touches
  the millennium area is fixed or explicitly re-filed with a reason; sweep
  the 041-046 close-out notes for deferred items. (4) PERF: census() report;
  draws <= 480 at EVERY mp waypoint with worst-view named; no per-frame
  allocations added by the new packs (spot-check registerUpdate bodies);
  fps recorded (advisory). (5) BOTH INPUTS: desktop keys AND touch (act.mjs
  --mobile with held taps per the task-026 latch pitfall) exercise the
  ride boarding, the fountain soak, and one delight interaction; shots
  Read. (6) The evocation DRY-RUN: one fresh-eyes subagent Reads only the
  new contact sheet + refs/millennium-park/ and names the place + what
  gives it away — if it hesitates or misses a signature landmark, fix THAT
  read before 049 runs the real review. (7) walkprobe exit 0; zero console
  errors; baseline intact; single-file build; PITFALLS.md appended with
  anything this pipeline learned the hard way.
refs:
  - tools/waypoints.expect.json mp-* entries (the bar)
  - .claude/commands/art-director.md
  - autopilot/issues/ (open items), autopilot/queue/done/048.. n/a —
    the 041-046 result summaries in git log for deferred notes
  - PITFALLS.md (sign audits; framing traps; touch latch; budgets)
---

The difference between "built" and "signed off" is this task. Wrigleyville's
equivalent took three polish rounds (issues 001/004/014, tasks 016/032/036)
— spend the turns here so 049 passes first try.

Priority order if turns run short: evocation-critical reads first (bean
silhouette, fountain glow, ribbons+trellis, streetwall), then walkability/
interaction correctness, then sign hygiene, then dressing. File honest
issues for anything left and resequence per the retry rule rather than
rubber-stamping.
