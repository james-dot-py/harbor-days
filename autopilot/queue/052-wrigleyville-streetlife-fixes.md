---
id: 052
area: wrigleyville
type: feedback
model: opus
title: Wrigleyville street pass — Divvy docks, REAL crosswalks, cornhole boards re-fixed
acceptance: >
  Three owner asks (2026-07-11), one street-level session. (1) DIVVY IN
  WRIGLEYVILLE: "add divvy stations to wrigley" — extend the Divvy network
  (src/packs/progression.js owns the dock net + nearest-dock return) into
  the Wrigleyville cell: 2-3 docks at honest spots (the Addison stop plaza,
  the Gallagher Way edge, a Clark St corner), rideable within the cell,
  network made CELL-AWARE: nearest-dock return only considers docks in the
  active cell, and boarding the Red Line (or any cell exit) auto-docks the
  bike first; journal dock count updates (n/total); kiosk colliders per
  PITFALLS; dock placement clear of the 033 Clark right-of-way. (2) REAL
  CROSSWALKS (issue 018): "the crosswalks are just sidewalks" — at every
  Wrigleyville intersection, marked crosswalks where the real ones are:
  Chicago-standard continental/zebra bars (white bar stripes flush on the
  asphalt, slight wear variation so they don't read stamped), aligned to
  each crossing's actual axis, data-derived from the street tables in
  wrigleyville.js (never freehand); instanced/merged — the whole set should
  cost ~1-2 draws. (3) CORNHOLE RE-FIX (issue 019 — regression on task
  029): the incline boards STILL face the wrong way at both sites (Gallagher
  and the rocks). Owner's exact recipe: "you can literally just SWAP the two
  boards without rotating them — the downward slant should face the
  opposite one." Do exactly that: exchange board positions, zero rotation
  change, then screenshot BOTH pairs from a player's throwing position and
  verify the low edge of each board faces its thrower across the gap; bags
  still land/score correctly (cornhole.js scoring unchanged). (4) ORPHAN
  BLACK PLATFORM (issue 020): at (-311.5, -523.0) near Gallagher Way a dark
  plinth mass sinks the mayor waist-deep — no surface, no collider, absent
  from the minimap (owner screenshot
  refs/inbox/owner-issue-020-black-platform-x-311.5-z-523.0.png). Likely
  debris from 033's building rehoming: find the orphan in the build tables
  and either remove it clean or restore the intended building there,
  consistent with 033's plan; minimap syncs; nothing a player can sink
  into remains. All four:
  determinism (data-derived placement, post-rng or fixed coords), draw
  budget ceiling, walkprobe green, desktop + touch verified, single-file
  build passes.
refs:
  - src/packs/progression.js (Divvy net: DOCKS, nearest-dock return, journal)
  - src/data/wrigleyville.js (street tables — crosswalk axes derive from these)
  - src/wrigley/streets.js (asphalt/markings builder)
  - src/packs/cornhole.js (board build + scoring; task 029's tilt work)
  - autopilot/issues/018-wrigley-crosswalks-missing.md, 019-cornhole-boards-still-backwards.md
---

Three small things a Chicagoan notices in the first five minutes: you grab
a Divvy where there's a dock, you cross at the zebra, and a cornhole board
slants TOWARD the person throwing at it. The cornhole fix is deliberately
mechanical — the owner already solved it; execute the swap literally and
prove it with the two screenshots.
