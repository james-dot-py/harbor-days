---
id: 010
area: wrigleyville
type: feedback
model: fable
title: Legendary Wrigleyville bars/spots get their real-building likenesses
acceptance: >
  Owner feedback (2026-07-08): "More detail on the buildings -- they're all
  legendary bars/spots so should look like the real buildings." Each named
  spot reads as ITS real building to someone who has stood outside it, in the
  house toon style (hand-modeled; reference photos first, never imported
  geometry): Murphy's Bleachers (white two-storey with the big red-letter
  fascia, rooftop deck, sidewalk beer garden), Cubby Bear (dark red-brick
  corner block, arched second-storey windows, black fascia + neon), Sluggers
  (party-wall storefront, yellow/red sign band — coordinate with task 009's
  rooftop cage), Sports Corner (glassy corner bar, banner band), The Dugout,
  Casey Moran's, Engine 78 firehouse (already close — verify against photos),
  and the Addison CTA station head-house. Process: fetch references FIRST
  (node tools/refs-fetch.mjs per spot into refs/<slug>/, wikimedia/flickr-CC
  only, no Google anything), READ them, then reshape VILLAGE_W lots /
  builders; per-building acceptance is "a Chicagoan names it unprompted from
  the walkthrough shot". Footprint changes update GEOGRAPHY.md FIRST, then
  wrigleyville.js, then walkprobe expects (shared data module). Draw budget
  respected (instanced/merged dressing; tools/budgets.json is a ceiling —
  never raise); determinism (local seeds only); walkthrough --area
  wrigleyville green with every PNG READ.
refs:
  - autopilot/feedback/processed/feedback-2026-07-08T21-37-06-293Z.md (the note)
  - refs/wrigleyville/osm.json (true footprints/addresses of every spot)
  - src/data/wrigleyville.js (VILLAGE_W), src/wrigley/village.js (builders)
  - PITFALLS.md (village.js add() snapshot rule — facades went invisible twice)
---

Owner playtest direction — the bars are pilgrimage sites, not filler; likeness
is the point ("recognizable to locals — mirror real geography, no guessing").
This is set-dressing scope split out of task 005's fidelity pass so it gets a
full reference-first treatment per building instead of a rushed generic pass.
Budget note: facade detail should ride the existing instanced batches
(A.win/A.awn/A.base buckets and the cell static merge) — new per-building
one-off meshes are the draw-call trap that 004/007 are ratcheting down.

## Amendment (owner playtest 2026-07-09)
The existing bar-row awning/bulb assemblies FLOAT (issue 002 + screenshot in
refs/inbox). Rebuild them as part of the facade work: attached to the wall,
bulbs flush to the awning fascia, continuous per storefront. No floating
geometry survives this task.
