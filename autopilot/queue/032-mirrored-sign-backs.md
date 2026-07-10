---
id: 032
area: lakefront
type: polish
model: opus
title: Sign backs show mirrored text — pier honorary signs + Divvy station
acceptance: >
  Several canvas-texture signs are single DoubleSide planes, so their BACKS
  render the texture mirror-flipped — players read backwards text in normal
  play. Observed during task 022's walkthrough (all pre-existing):
  (1) "WAX TRAX RECORDS" honorary sign on the harbor pier — mirrored from the
  pier's north side (run shot: harbor-pier-f2 of run-mrez3vx8);
  (2) honorary brown street signs "ANN SATHER" (near Waveland fieldhouse,
  sign-waveland-fieldhouse-f1) and "STUDS TERKEL" (yacht club lawn,
  sign-yacht-club-f2) — mirrored from behind;
  (3) the Divvy station sign at the Belmont connector reads "YVVID" from the
  west (tools/shots/before-sax.png).
  Fix with the same pattern PITFALLS.md records for village.js free-standing
  signs: back-to-back FrontSide plane pairs (or a solid back panel), NOT
  DoubleSide single planes. Sweep ALL canvas-texture sign builders (props.js
  honorary/park signs, the pier sign, npcs.js/divvy pack station signs, any
  pack-local ones) and fix every instance, not just the four observed. Zero
  rng impact (geometry/material only). Verify each fixed sign with shots from
  BOTH faces; draw-call delta stays ~0 (a second plane per sign is fine, or
  reuse the sign atlas). Single-file build passes.
refs:
  - PITFALLS.md (free-standing sign back-to-back FrontSide pattern)
  - tools/shots/run-mrez3vx8/sign-waveland-fieldhouse-f1.png
  - tools/shots/run-mrez3vx8/sign-yacht-club-f2.png
  - tools/shots/run-mrez3vx8/zone-harbor-pier-f2.png
  - tools/shots/before-sax.png (Divvy "YVVID")
---

Small but immersion-breaking: mirrored text is exactly the kind of thing a
local notices in a game that promises "recognizable to locals." All four
observed cases are honorary/wayfinding signage the player walks past on the
main trail.
