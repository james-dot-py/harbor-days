# 030 — Montrose reads badly overall — shoreline placement is off

- area: montrose (post-084 compression re-cut)
- severity: MEDIUM-HIGH (whole-neighborhood read; owner: "montrose looks
  pretty bad too with shoreline placement")
- found: 2026-07-17, owner playtest (verbal report), AFTER 084 Montrose
  compression shipped its coast re-curve today
- observed: the shoreline placement looks wrong / unnatural after the
  compact re-cut — the coast, beach, and harbor don't sit right relative to
  each other.
- expected: Montrose reads like the real place at a glance — beach south of
  the hook, harbor basin sheltered inside it, Magic Hedge on the point —
  per refs/montrose OSM geometry, even at the compressed scale (geometric
  liberty granted by owner 2026-07-16 covers curving/compressing, not
  misplacement).
- related: issue 026 (basin water foam blobs) — same neighborhood, check
  whether one root explains both.
- fix routed to: task 088 visual-truth pass (fresh judged waypoint shots of
  the shoreline arc, re-judge against refs/montrose/osm.json, fix placement
  via data).

## RESOLVED — task 088 (2026-07-17)

The macro arrangement (bay -> harbor/hook -> Point -> dunes -> beach -> north
cap) checks out against the osm anchors under the 084 rigid shift — the
"placement" jank was three concrete shoreline reads, all found by LOOKING
(the 072-075 framings never faced the waterline):
1. **A lawn-green strip capped the beach at the exact waterline**
   (088-mt-waterline.png): MONTROSE_BEACH.slope.ref (227) sat WEST of the LAND
   edge (montroseFx <= 237.5), so the sand dipped below y0 while the y0 lawn
   fill ran to the coast line — sand never touched the water. Fixed in data:
   ref 237.6 / span 5 / bounds x1 242.5 — dry sand to the land edge, short wet
   band, underwater by x~242 (088-mt-waterline2.png).
2. **The asphalt trail + yellow dashes ran ACROSS the beach sand** east of the
   beach house (088-mt-beach.png): TRAIL_MONTROSE's tail rerouted INLAND
   (bike x<=188, west of BEACH_HOUSE, on lawn to the north cap) — the real
   alignment. Determinism via TRAIL_MONTROSE_GHOST088 (the 084 TRAIL_MAIN
   ghost law). Verified: 088-mt-beach3/-trail-house/-trail-point/-trail-north/
   -house-pass/-hillview (trail on grass everywhere, sand clean, sanctuary
   gate + north-cap junctions read).
3. **Towels sat ON the walking ribbon**: Montrose beach-life now rejects spots
   within w/2+1.3 m of any REAL ribbon (ribbonLanes; local rng only).
New judged waypoints `mt-shore-waterline` + `mt-shore-mouth` keep the
waterline + mouth arc under permanent judgment. GEOGRAPHY.md carries the 088
shoreline-truth amendments. Issue 026 (basin foam): compared today's basin
against the accepted 076 evidence (076-harbor-fix2.png) — same read, NO
regression; stays closed.
