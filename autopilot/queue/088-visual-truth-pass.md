---
id: 088
area: global
type: build
model: fable
turns: 130
title: VISUAL TRUTH PASS — owner jank list + make the pipeline SEE (issues 027-030)
acceptance: >
  Owner (2026-07-17, playtesting the live site): "I'm not convinced the model
  is taking screenshots of what it's building and confirming it doesn't look
  fucked up." Four concrete reports, verbal, no coords — issues 027-030. This
  task is HALF measurement, HALF fixes, in that order (the wv-street-*/wv-x-*
  precedent: fix the measurement first, then the content).
  (0) FIX THE MEASUREMENT FIRST — permanent guards, not one-off checks:
  (0a) PROP-CLEARANCE SWEEP in the gridsweep/walkprobe family (new
  tools/prop-clearance.mjs or extend gridsweep): assert no tree trunk or
  blocking-prop base within a sane clearance radius of any trail/path
  centerline, city-wide, deriving BOTH prop positions and path polylines from
  the data modules (src/data/chicago.js + cell data) so the check survives
  layout reworks. Every violation prints coords. Wire it into the standard
  verify gate alongside gridsweep so tree-on-path can never ship again.
  (0b) PATH-LAYER ORDER ASSERTION: enumerate stacked path/decal surfaces
  (pavement, bike lane, painted markings, crosswalks) and assert strict
  y-offset/renderOrder separation — no coplanar pair that can z-fight. Run it
  in the same gate.
  (0c) JUDGED WAYPOINTS (tools/gen-waypoints.mjs + waypoints.expect.json,
  coords derived from data modules): add coverage for every SHOP sign from 080
  (beach kiosk first — framed close enough to READ the sign), the bike/walk
  path seam along the Lakefront Trail, and a Montrose shoreline arc (beach →
  hook → harbor mouth). Framing rule per the 080 mp-lions-f0 blind-spot fix:
  subject visible and unoccluded or the shot is invalid. Shots must be READ
  and judged (CLAUDE.md: "READ the PNG and look at it") — result notes carry
  a one-line verdict per waypoint.
  (1) KIOSK SIGN FLICKER (issue 027): root-cause the flashing — likely
  coplanar sign planes z-fighting or a small mesh at the cull boundary. Check
  ALL 080 shop signs, not just the one the owner happened to see. Verify
  stable from multiple angles/distances via the new waypoints.
  (2) BIKE-PATH LAYERING (issue 028): dashed yellow line sits ON its own
  pavement; grey pavement never drops out. Fix the ordering GLOBALLY via 0b's
  assertion, not by nudging one spot.
  (3) TREES OUT OF PATHS (issue 029): run 0a, relocate every offender via
  data coordinate edits only — DETERMINISM: no rng call-order changes, moved
  coords only. Re-run 0a clean.
  (4) MONTROSE SHORELINE (issue 030): post-084 the shoreline placement reads
  wrong. Re-judge the compressed coast against refs/montrose osm.json with
  the new waypoint shots; fix beach/hook/harbor placement via data until the
  arc reads like the real place at the compressed scale. Check issue 026
  (basin foam blobs) while in there — fix if the root is shared, otherwise
  leave it documented.
  Standard gates all green (draw budget, determinism baseline, gridsweep,
  walkprobe + the two NEW guards). Web deploy unaffected.
refs:
  - autopilot/issues/027-kiosk-shop-sign-flickers.md
  - autopilot/issues/028-bike-path-line-floats-pavement-vanishes.md
  - autopilot/issues/029-trees-in-the-middle-of-pathways.md
  - autopilot/issues/030-montrose-shoreline-placement.md
  - autopilot/issues/026-montrose-harbor-water-foam-blobs.md (related, area)
  - autopilot/queue/done/084-montrose-compression.md (the re-cut under review)
  - tools/gen-waypoints.mjs + waypoints.expect.json (the measurement rail)
---

Why this jumps ahead of lake-moods (renumbered 090): all four reports are
live on playope.com right now, and the owner's trust in the loop's visual
verification is the actual thing at stake. The permanent guards (0a/0b) are
the point — the specific fixes are just the first proof they work.
