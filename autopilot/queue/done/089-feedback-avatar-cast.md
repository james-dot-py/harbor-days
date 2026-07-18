---
id: 089
area: global
type: feedback
model: fable
turns: 140
title: AVATAR CAST — first-play character select + hats that actually replace hair
acceptance: >
  Owner (2026-07-18, playtesting live): "Hats don't replace the mayor's afro.
  when you play the game for the first time, you should be able to choose your
  avatar. Make some fun avatars you'd be as a chicagoan." Two halves:
  (1) HATS FIX FIRST (the reported bug): wearing any hat must read correctly —
  the hat REPLACES/compresses the hair volume (no afro poking through the
  bucket hat / ballcap); verify per-hat per-hairstyle with close shots.
  (2) AVATAR SELECT: on FIRST play (and later via settings), a diegetic picker
  to choose your chibi from a Chicago cast built on createChibi palettes/
  accessories — the owner's list verbatim: a biker guy, a high-adiposity
  sports fan, a River-North yuppie consultant, a pilates girl, a chef (white
  short-sleeve shirt under a blue apron, black pants, light-brunette hair,
  arm tattoos), KEEP the black mayor (default), an old black taxi driver, a
  viva-Mexico guy — plus a few more good ones in the same register (e.g. an
  L conductor, a bears-jersey superfan, a dibs-lawn-chair native). Each
  reads distinctly at chase-cam distance; choice persists via store.js
  (names/ids only, the save-blob law); NPC "ope" bump lines and favors keep
  working regardless of avatar. Rig law: nested createChibi rig only (shoes
  children of legs — never re-add manual swing); worn cosmetics (hats) fit
  every avatar. Title-flow law: the picker must not break ?play=1 tooling
  (headless defaults to the mayor; picker suppressed under play=1 unless
  ?avatar=1, the 087 idle-gate precedent). Determinism gates + walkthrough
  spot-checks (spawn + one waypoint per area) green; both inputs.
refs:
  - autopilot/feedback/processed/feedback-2026-07-18T03-28-51-248Z.md (verbatim)
  - src/character.js (createChibi), src/packs/hats.js, src/store.js
  - autopilot/queue/done/087-name-and-idle-charm.md (title-flow + play=1 gating precedent)
---

The owner's first-listed note and the biggest identity feature the game has
asked for: you should get to BE a Chicagoan, not just meet them. The hats bug
is the trust-repair half — fix it first, prove it with close shots.
