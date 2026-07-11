---
id: 049
area: millennium
type: feedback
model: fable
title: McCormick Tribune Ice Rink — real rink per owner refs, and ICE SKATING becomes a thing
acceptance: >
  Owner (2026-07-11): the rink spot at (64.4, 800.1) "should be a real ice
  skating rink" and "let's make ice skating a thing." References are
  owner-supplied gold in refs/millennium-park/ (see OWNER-PHOTOS.md — LOOK
  at all three): owner-aerial-use-this.jpg ("use this for sure" — layout
  truth for rink footprint and surroundings), owner-mccormick-ice-skating.jpg
  (the read: boards with ads-free cream caps, white ice sheet, skater
  traffic, Michigan Ave streetwall looming behind), and
  owner-skating-ribbon-northeast.webp (the Maggie Daley ribbon NE of the
  main rink — STRETCH GOAL ONLY: note it in the close-out as a candidate if
  budget/turns don't allow; never half-ship it). (1) THE RINK: rebuild the
  (64.4, 800.1) area as the McCormick rink per the aerial — sunken sheet
  with surrounding rail/boards, entry gate, benches at the edge; the ice
  reads as ICE (pale sheet, subtle skate-line scratches via geometry/vertex
  color, no textures); perpetual-dusk seasonal liberty: the game is endless
  summer evening and the rink is open anyway — record as a documented
  liberty in the BRIEF. (2) SKATING: walk through the entry gate → skates
  on: movement becomes a GLIDE (momentum + gentle drift, jetski-lite feel
  but tighter; leaning turns; SPACE = a little hop-spin flourish with
  squash/stretch), synthesized blade-carve audio (filtered noise swells on
  speed, guard actx null), step off the ice → normal movement returns
  seamlessly. Desktop + touch both. (3) LIFE: 4-6 NPC skaters looping at
  varied speeds/styles (state machine per the badminton/bingo-bird
  precedents), one wobbly beginner hugging the boards (delight), bumps ope.
  (4) CONTRACT: the rink surface is definitively walkable-glidable (issue
  017 class rules — no fall-through, no jetski), draw budget ceiling holds,
  determinism (local seeds), mp-rink-* judged waypoints minted against the
  owner photos, walkprobe green, single-file build passes.
refs:
  - refs/millennium-park/OWNER-PHOTOS.md + the three owner-* skating/aerial files
  - src/packs/badminton.js (joinable-activity + NPC state machine precedent)
  - src/main.js (movement gate canMove/jsk — the glide integrates HERE, carefully)
  - src/packs/diversey.js (activity-session pattern), src/audio.js (getAudioCtx)
  - autopilot/issues/017-millennium-walkability-holes.md (the walkability contract)
---

The owner picked this spot personally and supplied the references — treat
the aerial as layout law. Skating is the first new MOVEMENT feel since the
jetski: tune the glide until it's a toy you don't want to step off of
(momentum you can carve, not soap). If the ribbon fits honestly, it's a
crown jewel; if not, say so and leave it seeded.
