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
