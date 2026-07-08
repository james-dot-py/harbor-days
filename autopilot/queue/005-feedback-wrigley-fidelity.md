---
id: 005
area: wrigleyville
type: feedback
title: Wrigley Field fidelity — rounded marquee corner, truer Gallagher Way placement
acceptance: >
  Owner feedback (2026-07-08): "make the corner of wrigley with the sign on it
  rounded, and make the placement of gallagher way better. whole area around
  the field should be higher fidelity and closer to reality if possible."
  Concretely: (1) the Clark & Addison corner of the stadium — the one carrying
  the marquee — becomes a ROUNDED corner like the real art-deco curve (the
  marquee hangs on a curved facade, not a box edge); (2) Gallagher Way sits in
  its true relation to the park (real place: the plaza hugs the stadium's WEST
  side along Clark, north of the Addison corner, bounded by the office/hotel
  block at Waveland & Clark) — re-derive from refs/wrigley/osm.json and fix
  GEOGRAPHY.md FIRST, then src/data/wrigleyville.js, remembering the
  cell-local x-frame (PITFALLS.md: never validate cell x against true
  projection); (3) one more fidelity pass on the immediate blocks around the
  park guided by reference photos (refs/wrigley/, fetch more if thin) —
  e.g. facade rhythm, bleacher wall, gate positions — hand-modeled in the
  house toon style, never imported geometry. Walkability rules + walkprobe
  expects updated with any footprint change (shared data module, never
  forked). Verified: /verify green, walkthrough --area wrigleyville READ
  against refs, draw budget respected (see 004's ratchet — do not regress),
  determinism (wrand local seeds only).
refs:
  - autopilot/feedback/processed/feedback-2026-07-08T17-00-46-200Z.md (the note)
  - refs/wrigley/ (photos + osm.json; refs-fetch/osm-fetch if thin)
  - GEOGRAPHY.md (law: update FIRST), src/data/wrigleyville.js
  - PITFALLS.md (cell-local x-frames; village.js add() snapshot rule)
---

Owner's playtest direction — treat as high-signal. The marquee corner is the
postcard shot of the whole cell; the curve is what makes it read as Wrigley.
Scope honestly: geometry fidelity first, set dressing second; split into more
tasks if the "whole area" pass grows.
