---
id: 064
area: wrigleyville
type: feedback
model: fable
turns: 140
title: GAME DAY inside Wrigley — take a seat and watch the Cubbies play
acceptance: >
  Owner (2026-07-12): "allowing the user to go into wrigley field to watch
  the game now." 055 shipped the empty open-house bowl; this task turns the
  lights on. (1) THE GAME: a stylized, time-compressed baseball vignette
  loop on the field — home team in Cubs-coded home whites (pinstripe +
  blue-suggestion, C-evoking cap in the bar-likeness register, NO MLB logo
  replication) vs a grey road team; pitch → swing → outcome loop with
  weighted variety (take, foul, groundout with fielders moving, a single
  with a runner, and the occasional HOMER: ball sails toward the
  scoreboard, crowd eruption, fireworks tie-in with the existing W/win
  cycle); chibi fielders at their positions, base runners that actually
  run the bases; all state-machine driven (badminton/bingo-bird pattern),
  cell-local seeds, no per-frame allocs. (2) WATCHING IS THE ACTIVITY: sit
  in any 055 seat → the camera settles into a comfortable spectator frame
  (sit-spot camera precedent) and the game plays out in front of you;
  scoreboard hand-turns to match outcomes (inning + runs); stay seated a
  full half-inning → journal moment. (3) THE SOUNDSCAPE, 100% synth: organ
  riffs (the charge call!), bat crack (sPop-family), crowd murmur that
  swells on contact and erupts on the homer, vendor calls; SEVENTH-INNING
  STRETCH: every Nth cycle the crowd hums 'Take Me Out to the Ball Game'
  (1908, public domain) while the crowd sways — the single coziest moment
  available to this game, spend care here. (4) THE CROWD: stands populated
  via the instanced-crowd tech (061's Lolla crowd — this task runs AFTER
  061; reuse, don't fork), wave support, nearest rows real bumpable NPCs
  incl. a hot-dog vendor working the aisle ("no ketchup"); budget per
  census at the seated view ≤480 — the bowl + crowd + game is the hardest
  frame in the project, name its cost in the result. (5) THE CHASE GETS
  BETTER: field trespass during a game keeps 055's ump chase but the crowd
  REACTS (ooooh swell, laughter on escape, mock cheer on ejection) — the
  streaker gag, cozy edition. (6) Ticket flow unchanged; both inputs
  end-to-end (enter, sit, watch a full loop incl. one homer, stretch
  moment, trespass + ejection); judged waypoints: the seated view, the
  scoreboard read, the stretch moment; walkprobe green; determinism;
  single-file build passes.
refs:
  - autopilot/queue/done/055-wrigley-interior-ticket-chase.md (the bowl + chase this builds on)
  - autopilot/queue/061-build-butler-lollapalooza.md (instanced-crowd tech — hard dependency, runs first)
  - src/packs/wrigley-gameday.js (exterior game-day cycle + W flag/win tie-in — sync, don't duplicate)
  - src/audio.js (music bus; organ + crowd synthesis)
---

The promise of the whole Wrigleyville arc lands here: ride the L, buy a
ticket, find your seat, and watch the Cubbies turn a double play while the
organ noodles. Keep the game LOOPING and legible rather than simulated —
it's a diorama that breathes, not a baseball engine. And the
seventh-inning stretch is the shot that ends up in every review; treat it
like the hero build it is.
