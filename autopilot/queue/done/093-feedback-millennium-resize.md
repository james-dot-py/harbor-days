---
id: 093
area: millennium
type: feedback
model: fable
turns: 120
title: MILLENNIUM RESIZE — bigger skating rink, shorter BP bridge
acceptance: >
  Two owner notes (2026-07-18), both Millennium-cell layout liberties:
  (1) "Make the skating rink at millenium park bigger so there's more space
  to skate around and do tricks" — grow the McCormick Tribune rink sheet
  meaningfully (target roughly 1.5-2x skateable area, whatever the block
  honestly allows against the Michigan spine / Park Grill band / Bean plaza),
  keeping the sunken-pit read (041 carve law: the grade carpet must be carved
  around the enlarged pit — verify with a down-pitched framing INTO it), the
  Park Grill band on the exposed face (049 law), rentals/entry intact, and
  the ribbon-skaters/skating packs working across the whole new sheet (their
  loops/waypoints derive from the rink data, not constants). Tricks need
  ROOM: verify by driving the skate loop and doing a trick far from the old
  bounds.
  (2) "maggie daley bridge should be a bit shorter even if that's
  unrealistic" — compress the BP bridge crossing (the serpentine deck) by
  shortening its span/hairpin while keeping both landings, the parapet walk
  law (down-deck framings), and the CatmullRom tread orientation (048/0c
  law: treads by getTangentAt, no jacknifing at nodes). Walk time across
  drops noticeably (measure before/after with the input bot and report the
  seconds). GEOGRAPHY.md FIRST for both (documented liberties, the 084
  precedent), then data; walkability via the shared band/curve definitions
  (062 chord law — no rect-chord slivers); mp-rink-* and mp-bp-crossing
  waypoints re-derived/re-framed and re-judged; determinism contained (cell-
  local); draw budget holds at the census views; standard gates green.
refs:
  - autopilot/feedback/processed/feedback-2026-07-18T03-32-01-305Z.md (verbatim)
  - autopilot/feedback/processed/feedback-2026-07-18T03-32-30-449Z.md (verbatim)
  - src/data/millennium.js, src/millennium/ (rink + bridge builders)
  - PITFALLS.md (041 carve, 049 rink band, 048 treads, 062 walk-curve laws)
---

Both are "make play feel better than realism" calls — the owner has granted
the liberty explicitly. Measure the bridge walk; skate the whole new sheet.
