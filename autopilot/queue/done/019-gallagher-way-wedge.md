---
id: 019
area: wrigleyville
type: build
model: fable
turns: 120
title: Gallagher Way as the real wedge — pizza-slice plaza, closed south end, worthy content
acceptance: >
  Owner directive (2026-07-09): Gallagher Way is a triangular WEDGE — Clark St
  diagonal on the west, the stadium bowl curve on the east, WIDE at the north
  (Waveland side) and NARROWING south to the Gallagher building/box-office
  mass at Addison, which CLOSES the south end (today there is no wall south of
  the plaza — an open void; owner screenshot in refs/inbox). GEOMETRY SOURCE:
  refs/wrigleyville/osm.json footprints + Clark centerline (ODbL — we already
  have the real outline; GOOGLE IMAGERY IS BANNED, decision b, do not fetch or
  reference it). GEOGRAPHY.md FIRST: reshape GALLAGHER_W from a constant band
  to a wedge (off1 or bounds varying with z), update WALK_W para quad,
  OFFICE_W placement so the block reads as ONE lot: stadium + plaza + office
  contiguous. CONTENT at the new bar: fix issue 005 (flat blue bag-toss slabs
  become proper angled cornhole boards on legs per the lakefront delight
  pattern, or go); no orphaned furniture (stray chair); tree planters and
  paver banding per non-Google refs (Wikimedia Gallagher Way photos via
  refs-fetch); keep the splash pad (012 fixes its z-fight) and the video
  board. Walkability: wedge walkable curb to bowl; walkprobe rules+expects
  updated; camera-clearance volumes in gen-waypoints follow OFFICE_W/statue
  moves. Verify: /verify green, walkthrough --area wrigleyville with the
  wv-gallagher-way + canyon expectations judged from PNGs, draws <= 480.
refs:
  - refs/wrigleyville/osm.json (the legal wedge outline)
  - refs/inbox/"bag toss looks bad and spot is not solid color.png"
  - autopilot/issues/005 (bag toss), 003 (splash pad — owned by 012)
  - AUTOPILOT.md decision (b): no Google Maps data in any form
---

The plaza should feel like the real wedge: Clark rushing past on the diagonal,
the bowl curving over it, the office anchoring the point of the slice. 015/016
furniture vocabulary applies if already landed; otherwise hand-model sparingly.
