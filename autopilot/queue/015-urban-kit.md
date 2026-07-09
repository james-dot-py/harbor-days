---
id: 015
area: global
type: build
turns: 120
title: Urban streetscape kit — the vocabulary for streets that surround you
acceptance: >
  A new src/wrigley/urbankit.js (or src/urbankit.js if genuinely city-generic)
  exporting data-driven, INSTANCED assembly builders, all toon()/bmat(), all
  bucketed per color (r128 setColorAt pitfall): (1) storefront assembly —
  recessed door + glazing panels + transom + optional awning (canvas-texture
  stripes) parameterized by width/palette; (2) facade dressing — cornice caps,
  parapet steps, window grids with lintels/sills, AC units, downspouts, fire
  escapes; (3) street furniture — Chicago-style stoplight (mast arm + signal
  heads), parking meter, hydrant, USPS mailbox, newsbox, bike rack, tree in
  grate, trash can; (4) parked-car archetypes (2-3 chunky toon sedans/SUVs,
  per-color buckets). Draw-call budget: the kit must be instancing-first —
  demonstrate a full test row (10 storefronts + furniture rhythm + 4 cars)
  adding <= 40 draw calls, measured with __hd.census() and reported. Nothing
  placed in the world yet beyond a temporary test row that is REMOVED before
  close-out (this task ships vocabulary, 016 ships placement). Unit shots of
  each assembly READ against refs (fetch Chicago street furniture refs via
  refs-fetch; owner screenshots in refs/inbox count).
refs:
  - autopilot/issues/001-neon-sign-clipping.md (plate-fits-face rule for any
    signage helpers)
  - PITFALLS.md (setColorAt buckets; village.js add()-before-populate)
  - tools/budgets.json (current operational budget 1050, target 480 — the kit
    must not blow the ratchet work)
---

Owner playtest verdict (2026-07-09, screenshots in refs/inbox/): "it's not an
open walkspace like the lakefront — features have to surround you." The
lakefront's kit is parkland; streets need architecture. This task builds the
LEGO box; 016 builds the street.
