# 025 — player gets STUCK (fully immobile) in Millennium/Grant spots

- severity: HIGH (a hard-stuck player has no recovery except reload — worst
  possible playtest moment)
- evidence: owner playtest 2026-07-12 — "I tried walking to lolla and I got
  stuck right here, can't move at all" — screenshot
  refs/inbox/owner-issue-025-stuck-lolla-arch.png: the mayor pinned against
  the north face of the maroon Lolla ENTRY ARCH at Butler Field's west
  edge, by the Michigan Ave streetwall gap; stage + crowd visible west.
  (The owner's bridge-stutter report from the same session was the
  pre-062-deploy build — re-verify with them post-refresh; the arch trap
  is the NEW item.)
- observed: complete immobilization — every direction blocked. This is a
  different CLASS than issue-017 holes: either a walkable ISLET (a pocket
  of walkable cells disconnected from the park's walkable graph) or a
  collider wedge (arch post colliders pinching a walkable sliver).
- expected, three layers: (1) fix the arch spot itself (collider matches
  the arch's actual posts, gap between posts genuinely passable or
  genuinely closed); (2) CONNECTIVITY SWEEP: extend the gridsweep with a
  flood-fill from the cell spawn — every walkable cell must be REACHABLE;
  disconnected islets fail the sweep (this catches every trap of this
  class, everywhere, forever); (3) ANTI-TRAP ENGINE RULE (main.js): if the
  player's current position tests unwalkable or fully enclosed (all 8
  probe directions blocked), permit movement toward the nearest open
  ground instead of freezing — the game may never hard-stick the player,
  even on top of a future bug. That rule alone converts every future trap
  from a reload into a shrug.
- route: task 065.
- OWNER UPDATE (same session): "actually I got out, just took some doing" —
  so the arch is a severe PINCH, not a sealed islet (065's three layers all
  still apply; the escape rule turns pinches into non-events). NEW symptom:
  "i'm seeing i can't move onto the grass in all places" — Butler Field /
  expansion lawns have PATCHY walkability: some grass edges blocked. Prime
  suspect: 061's crowd zones shipped as blocked rects over the lawn — but
  a festival lawn is FOR walking; you wade through the crowd (bump-ope!).
  065 gains a lawn-walkability audit.
