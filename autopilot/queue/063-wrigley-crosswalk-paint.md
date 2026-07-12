---
id: 063
area: wrigleyville
type: bug
model: opus
turns: 50
title: Crosswalks are PAINT, not sidewalk slabs (issue 018 reopened)
acceptance: >
  Owner screenshot (2026-07-12,
  refs/inbox/owner-issue-018-reopen-crosswalk-sidewalk-slabs.png — LOOK at
  it): 052's crosswalks came out as raised sidewalk-material slabs laid
  across the asphalt — pink/cream tiles with dark joints, reading exactly
  like "sidewalks on top of where there should be crosswalks" (the owner's
  words, twice now). Rebuild the crosswalk rendering at every Wrigleyville
  crossing as PAINT: flat WHITE bars (continental style) lying flush on
  the asphalt (tiny y-offset only against z-fighting), asphalt clearly
  visible between bars, no slab thickness, no sidewalk palette, subtle
  per-bar wear variation; axes still data-derived from the street tables
  (052 got the geometry right — the material/height/palette is what's
  wrong). Keep the stop lines. The whole set stays instanced (~1-2 draws).
  Verify with shots at street level AND the owner's screenshot angle at
  the same crossing — the read must be "painted crosswalk on asphalt";
  compare against the refs/streetscape crossing photos from 016's
  collection. Zero rng impact; walkprobe green; draw budget unchanged;
  single-file build passes.
refs:
  - refs/inbox/owner-issue-018-reopen-crosswalk-sidewalk-slabs.png (the anti-pattern)
  - refs/streetscape/ (016's Commons set includes real crossings — e.g. the Clark/Waveland Raising Cane's corner shots)
  - src/wrigley/streets.js (052's crosswalk builder — fix in place)
  - autopilot/issues/018-wrigley-crosswalks-missing.md (REOPENED note)
---

Second owner report on the same defect — read 052's close-out to see what
it thought it shipped, then trust the screenshot over the close-out. The
test that settles it: from the owner's exact angle, does the crossing read
as paint on a road or tiles on the ground?
