---
id: 025
area: lakefront
type: feedback
model: opus
title: Sanctuary bird life — way more interesting birds to watch (+ clear the deck stairs)
acceptance: >
  Owner (2026-07-09): "Need way more birds, interesting birds, to watch in
  the sanctuary." Current state (src/packs/nature.js): a 7-species roster
  (~L160), ONE bird per species, only a subset visible between relocates
  (~L230-252; SANC perch bounds x32-180 z-420..-356), perch→hop→circle
  state machine, bingo CORE + secret plover. Build ON that pattern — never
  fork it. (1) ROSTER: grow to ~16-20 species real to Bill Jarvis / Magic
  Hedge birding — e.g. Baltimore oriole, indigo bunting, scarlet tanager,
  rose-breasted grosbeak, cedar waxwing, yellow-rumped + palm warbler,
  American goldfinch, ruby-throated hummingbird, downy woodpecker,
  white-throated sparrow, black-crowned night-heron, great blue heron, wood
  duck, Cooper's hawk — chibi-toon bodies from shared geometry + palette
  params exactly like SPECIES does today (WebSearch plumage refs; the
  reference-photo mandate applies to birds too). (2) DENSITY: multiple
  individuals visible at once (flocking species perch in twos and threes) so
  the sanctuary reads BUSY from the deck and the interior loop — target
  roughly 3x today's simultaneous birds, distance-culled per the NPC-culling
  precedent, repeated geometry instanced/merged (tools/budgets.json is a
  ceiling, never raise). (3) INTERESTING means behavior, not just count — at
  least three new behavior flavors true to the species: heron statue-still
  at a clearing edge then one slow strike; woodpecker clinging to a trunk
  with a synthesized knock; hummingbird hover-darts; a waxwing flock pass —
  each built on the existing state-machine shape, each with a short
  synthesized call via getAudioCtx (guard actx null; audio may be
  init-gated). Cadence note: real birding comes in waves — pulse the
  relocate rhythm busy/calm rather than constant swarm. (4) BINGO CONTRACT:
  the CORE-six win condition stays exactly winnable as-is; new species are
  bonus sightings through the existing 'checked off the list' toast path
  (it already handles any species); the journal section lists them.
  (5) DECK-STAIRS TREE (issue 008): a scattered tree sits mid-stair on the
  birdwatch deck — clear it via the props.js POST-rng tree filter (the
  tennis/Diversey-clear precedent; runs after rng draws, zero determinism
  impact), clear-rect DERIVED from the SANCTUARY deck/stair data in
  chicago.js, then screenshot up the stairs to verify. Add/refresh a judged
  waypoint from the deck looking into the sanctuary whose expectation
  honestly demands visible bird activity. Determinism (post-filter only, no
  import-time rng); walkprobe stays green; single-file build passes.
refs:
  - src/packs/nature.js (SPECIES ~L160; bird build + state machine ~L230-300; bingo ~L360-414)
  - src/packs/sanctuary.js (deck sit spots; SANCTUARY data pointer)
  - src/data/chicago.js (SANCTUARY place data — deck/stair rects, room outline)
  - src/structures.js (buildSanctuary — deck + stair geometry)
  - src/props.js (tree POST-rng filter — tennis/Diversey precedent)
  - autopilot/issues/008-tree-in-deck-stairs.md
---

The sanctuary is the designated hero room and the deck is its payoff — the
owner sat up there and wanted more to watch. Count is the headline but
WATCHING is the product: vary the layer (canopy vs shrub vs ground vs
clearing edge), vary the tempo (a heron's stillness is as watchable as a
warbler's flit), and keep the binocular sighting loop rewarding as the
roster grows. Chicago credibility bonus: the black-crowned night-heron is a
locally famous endangered resident — locals will notice it.
