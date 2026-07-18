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
