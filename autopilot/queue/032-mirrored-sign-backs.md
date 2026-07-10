---
id: 032
area: lakefront
type: polish
model: opus
title: Sign-quality sweep — mirrored backs + posts blocking sign faces
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
  west (tools/shots/before-sax.png);
  (4) owner-reported (2026-07-10): the KEITH HARING honorary sign at the
  garden statue loop reads mirrored from the path at (110.8, 123.8) —
  refs/inbox/owner-032-mirrored-keith-haring-x110.8-z123.8.png.
  Fix with the same pattern PITFALLS.md records for village.js free-standing
  signs: back-to-back FrontSide plane pairs (or a solid back panel), NOT
  DoubleSide single planes. Sweep ALL canvas-texture sign builders (props.js
  honorary/park signs, the pier sign, npcs.js/divvy pack station signs, any
  pack-local ones) and fix every instance, not just the ones observed.
  SECOND DEFECT, same sweep (issue 014, owner 2026-07-10): sign POSTS
  planted in front of the panel, blocking the text — the CHICAGO PARK
  DISTRICT sign at (14.6, 107.2) has both posts covering letters
  (refs/inbox/owner-issue-014-sign-posts-block-text-x14.6-z107.2.png), and
  the owner says it "applies to all signs with that issue". While sweeping
  the builders: posts attach BEHIND the panel (real park signs mount the
  panel on the posts' front face) or fully outside the text band — audit
  post offset vs panel z in every sign builder and re-shot each fixed sign
  from the reading side. Zero
  rng impact (geometry/material only). Verify each fixed sign with shots from
  BOTH faces; draw-call delta stays ~0 (a second plane per sign is fine, or
  reuse the sign atlas). Single-file build passes.
refs:
  - PITFALLS.md (free-standing sign back-to-back FrontSide pattern)
  - tools/shots/run-mrez3vx8/sign-waveland-fieldhouse-f1.png
  - tools/shots/run-mrez3vx8/sign-yacht-club-f2.png
  - tools/shots/run-mrez3vx8/zone-harbor-pier-f2.png
  - tools/shots/before-sax.png (Divvy "YVVID")
  - refs/inbox/owner-032-mirrored-keith-haring-x110.8-z123.8.png (owner, 2026-07-10)
  - refs/inbox/owner-issue-014-sign-posts-block-text-x14.6-z107.2.png (owner, 2026-07-10)
  - autopilot/issues/014-sign-posts-block-text.md
---

Small but immersion-breaking: mirrored text is exactly the kind of thing a
local notices in a game that promises "recognizable to locals." All four
observed cases are honorary/wayfinding signage the player walks past on the
main trail.
