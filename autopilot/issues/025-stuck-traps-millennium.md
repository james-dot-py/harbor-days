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
- RESOLVED (task 065): the arch trap was a COLLIDER WEDGE, not an islet — the
  Columbus entry arch's two leg colliders (butler.js §11, x 190.8/199.2, r0.6 →
  player-radius 0.94) poked ~0.14 m past the walkable Columbus strip (x 190–200)
  into flanking non-walk seams (west x189–190 curb, east x200–202 vs the lawn
  x0 202); the ring push pinned the player in the seam with every micro-step
  blocked (reproduced deterministically in tools/tmp-arch-trap.mjs). Reachability
  can NEVER catch this class — it sees only walk data, never colliders. Fixes,
  all four layers: (1) THE SPOT — closed the east seam (millennium.js BUTLER_WALK
  Columbus x1 200→202, field walks edge to edge onto the grass) + pulled the arch
  legs inboard to 191.4/198.6 so both rings sit on walkable ground; (2) THE CLASS
  — extended tools/mp-gridsweep.mjs with a 1 m flood-fill reachability pass from
  spawn (prints islet coords, exit 1 on any); walkprobe's reachability now lists
  islet coords on failure — both green (60658/60658, zero islets); (3) THE
  GUARANTEE — anti-trap ESCAPE in main.js's movement gate (HARD cells only, same
  cellWalk() gate as the issue-017 water guard, so jetski/wade untouched): if the
  spot is unwalkable OR all 8 probe dirs are blocked, crawl toward the nearest
  open ground — zero per-frame alloc; verified in-engine (window.__hd.setTrap
  synthetic block → player escapes in 6–11 frames even with ZERO input); (4) THE
  GRASS — the instanced crowd is collider-FREE (makeCrowd adds none) and the lawn
  rects already cover the crowd zone, so the field was walkable crowd-and-all; the
  only "can't get on grass" was the west-edge Columbus↔lawn seam, now closed. The
  "061 crowd-zone-as-blocked-rect" prime suspect was a false lead (recorded).
- OWNER UPDATE (same session): "actually I got out, just took some doing" —
  so the arch is a severe PINCH, not a sealed islet (065's three layers all
  still apply; the escape rule turns pinches into non-events). NEW symptom:
  "i'm seeing i can't move onto the grass in all places" — Butler Field /
  expansion lawns have PATCHY walkability: some grass edges blocked. Prime
  suspect: 061's crowd zones shipped as blocked rects over the lawn — but
  a festival lawn is FOR walking; you wade through the crowd (bump-ope!).
  065 gains a lawn-walkability audit.
