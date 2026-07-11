---
id: 055
area: wrigleyville
type: feedback
model: fable
turns: 140
title: INSIDE WRIGLEY — get a ticket, roam the bowl, and the field-trespass ref chase
acceptance: >
  OWNER GREEN-LIGHT (2026-07-11) for the deferred LOCATIONS.md candidate:
  "let's let the user get a ticket and enter wrigley and run around the
  stadium, but not on the field, meaning they CAN go on the field. But a
  ref chases them and if they catch you, you get kicked out." (1) TICKET:
  an interaction at the box-office mass (wrigleyville.js notchS/clark
  ticket-office) — 'get a ticket' (free, cozy; holdItem ticket stub) —
  then the Clark/Addison gate becomes an honest door: walk in → fade →
  the 'wrigley-bowl' POCKET CELL (the redline-car pattern: own root,
  clamp, walkable, surfaceY, spawn — cells.js contract; issue-017 class
  rules apply: walkable() answers definitively EVERYWHERE in-clamp, a
  pocket cell can never reach the jetski fallback). (2) THE BOWL: empty
  open-house Wrigley (no game-day crowd this task — quiet cathedral
  register): concourse ring walkable, a couple of seating sections
  climbable with sit spots, the scoreboard readable across the bowl, the
  IVY on the outfield wall (the most Wrigley thing there is), foul poles,
  the field itself real grass with the infield diamond. WebSearch interior
  references first (refs/wrigley-field has construction-era Commons shots;
  get bowl/ivy/scoreboard views) — reference-photo mandate applies.
  (3) THE CHASE — the owner's design, implement it exactly: the field is
  physically enterable (no invisible wall); stepping onto the grass
  triggers a REF/security NPC (makeNPC, whistle SFX) who pursues at a pace
  between walk and sprint (catchable if you dawdle, escapable if you
  hustle); pursuit steering with no per-frame allocations; if he TAGS you
  (radius): whistle + screen fade + 'EJECTED' toast → you're deposited
  OUTSIDE the gate (cell swap back), ticket gone — get another and walk
  right back in (cozy consequence, zero meanness); if you make it OFF the
  grass back into the stands, he pulls up, dusts his cap, returns to post
  (bump line: "and STAY off the grass"); state counter (state.ejections)
  + a journal line at 3+ ("banned? never. persistent? yes"). (4) BOTH
  inputs end-to-end (enter, roam, trespass, escape AND get caught, desktop
  + touch, shots READ); draw budget: the bowl is big — instance
  seats/structure aggressively, budgets.json ceiling HOLDS at every new
  waypoint; determinism (cell-local seeds); judged waypoints: gate entry,
  concourse read, bowl read from the seats, ivy wall, chase moment;
  minimap: in-cell dark card per the redline-car precedent; walkprobe
  green; single-file build passes. Update LOCATIONS.md: interior moves
  from Candidates to Shipped-scope under Wrigleyville when green.
refs:
  - LOCATIONS.md (the deferred-candidate entry — hold lifted 2026-07-11)
  - src/packs/wrigley-ride.js (pocket-cell precedent: cell def, spawn, fades, dev-spawn override)
  - src/cells.js (cell contract), autopilot/issues/017-millennium-walkability-holes.md (walkability class rules)
  - src/wrigley/stadium.js (exterior masses, gates, scoreboard — the interior must agree with them)
  - refs/wrigley-field/ (Commons set; ADD interior/ivy/scoreboard refs via WebSearch+Wikimedia)
  - src/packs/gameday + badminton state machines (NPC behavior precedents)
---

This is the game's biggest promise since the ridable L: the gates were
built as teasers (017) precisely so this day could come. Two design notes
from the owner's phrasing worth honoring: the rule is "not on the field,
MEANING THEY CAN" — the fun is the transgression and the chase, so tune
the ref like a playground tag partner, not a cop; and ejection is the
punchline, not a punishment — the walk of shame past the box office where
you buy another ticket IS the joke. If the bowl fights the draw budget,
cut seat detail before you cut the ivy.
