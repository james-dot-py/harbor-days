---
id: 061
area: millennium
type: build
model: fable
turns: 140
title: BUILD — Butler Field with LOLLAPALOOZA live
acceptance: >
  Per the 057 layout data. Owner: "butler field with lollapalooza going
  on" — a live festival, not a parked stage. (1) THE GROUNDS: Butler Field
  east of Columbus — festival lawn, perimeter flag garlands, totems
  scattered in the crowd (a hand-made star, an inflatable alligator — the
  delight register), food-truck row (extend the 048 trucks), the honest
  port-a-potty row (Chicago truth, comedy included), entry arches; grounds
  are FREE to wander (cozy liberty, recorded — no wristband gate). (2) THE
  STAGE: main-stage truss + speaker stacks + a suggestion of a video board
  (toon masses, no textures), performer chibis ON stage (a little band —
  drummer bobs, guitarist sways, frontman works the crowd — state-machine
  animation, no rng drift). (3) THE MUSIC: 100% synthesized (constraint 4)
  — a looping festival set on its own bus (audio.js pattern): a driving
  synth-rock number alternating with a four-on-the-floor one, POSITIONAL
  (loud at the rail, ducks toward Pritzker so the two venues never fight);
  add a LOLLA station to the boombox radio cycle if the radio pack
  cooperates. (4) THE CROWD at budget: instanced chibi crowd facing the
  stage (the gameday-crowd tech precedent), swaying/bouncing in waves via
  the instance matrix re-stamp pattern (no per-frame allocs), density per
  the 057 perf plan; nearest rows are REAL bumpable NPCs (the 048 lawn
  rule: real up close, baked at distance). (5) JOINABLE: a dance circle
  near the sound booth (badminton-join precedent — step in, E/tap to bust
  a move, mayor dance anim, NPCs cheer). (6) THE LINEUP POSTER: a big
  board at the entry with a punny all-Chicago fake lineup (the boat-name
  register — e.g. 'Malört Face', 'Deep Dish Mode', 'The Lake Effects'; NO
  real artist names). (7) issue-017 walkability + gridsweep; budget at the
  worst festival sightline per 057's plan; determinism; judged waypoints
  (stage read from the lawn, crowd read, entry read); both inputs;
  single-file build passes.
refs:
  - the 057 layout tables + perf plan (hard dependency)
  - src/packs/wrigley-gameday.js (crowd tech), src/packs/badminton.js (joinable), src/audio.js (music bus)
  - src/packs/progression.js (boombox radio stations — the LOLLA FM candidate)
---

This is the loudest thing the game has ever attempted — and it has to stay
cozy: a festival at golden dusk, heard from a picnic blanket, is the
target read. The crowd is a perf boss fight; win it with instances, not
with fewer people. And the fake lineup poster is a gift to whoever writes
it — Chicago puns only, make the owner laugh.
