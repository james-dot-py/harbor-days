# 029 — Trees planted in the middle of pathways

- area: global (props vs trails; owner did not give coords — sweep everywhere)
- severity: MEDIUM (live on playope.com; breaks the "real place" read and
  walkability feel)
- found: 2026-07-17, owner playtest (verbal report)
- observed: trees standing in the middle of walking paths.
- expected: no tree trunk (or other blocking prop base) within a clearance
  radius of any trail/path centerline, city-wide.
- note: this is mechanically checkable — tree/prop placements and trail
  polylines both live in src/data/chicago.js (and cell data). A clearance
  sweep in the gridsweep/walkprobe family finds every offender with coords;
  no eyeballing required. That guard should be permanent so regressions
  can't ship again.
- fix routed to: task 088 visual-truth pass (builds the clearance sweep, then
  relocates every offender via data edits; determinism constraint — data
  coordinate edits only, no rng call-order changes).

## RESOLVED — task 088 (2026-07-17)

The NEW permanent guard `tools/prop-clearance.mjs` (headless page ->
`__hd.propAudit()`: final tree spots + colliders + every REAL ribbon centerline
from the new `ribbonLanes` registry in paths.js) found 9 violations
(tools/shots/088-propclear-before.txt): 8 trees + 1 sign post. Roots:
- The 92 north-grove trees were placed with NO path rejection at all, and the
  Bird Sanctuary walking loop runs through that grove (5 offenders); 2 more on
  the south main trail; 1 hand-placed TREES.fixed spit tree stood 0.6 m off the
  SPUR centerline (in the path).
- The tree-rejection scan (props.js nearPath) reads the GHOST arrays by design
  (determinism), so post-084 reshapes can never be covered by it.
Fixes: a DETERMINISTIC CLEARANCE NUDGE in props.js (pure geometry after all rng
consumption — offender trees MOVE to w/2+0.75 m off the lane, count/indices
unchanged, so per-tree colors never reshuffle); the fixed tree moved in data
([182,-160] -> [176,-160]); the honorary-sign post at (85,-352) moved off the
trail (parkcharm). prop-clearance now runs inside walkprobe (the standard
verify gate) — tree-on-path cannot ship silently again. Spawn diff 0.118%
post-nudge, 0.189% with all 088 changes (gate 0.828%).
