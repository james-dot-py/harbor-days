---
id: 129
area: montrose
type: build
model: fable
turns: 140
title: Expand the piping plover reserve to absorb Montrose's negative space, and re-lay the harbor features around it (issue 041)
acceptance: >
  OWNER DIRECTIVE 2026-08-02, in his words: "too much space in this area, let's
  minimize 'negative space'" and then, asked how: "expand the piping plover reserve
  so we use more of the negative space, adjust the other features in montrose harbor
  so it makes sense with it." This is a LAYOUT task on a signed-off neighborhood —
  the largest open ground in the game reads as a blank fairway and gets a reason to
  exist instead.
  (0) REPRODUCE THE COMPLAINT. The owner's screenshot was not saved to disk —
  recreate his view with tools/shot.mjs per issue 041: standing on the lakefront bike
  path where it crosses the Montrose lawns, facing north/north-west toward Cricket
  Hill, three kite flyers on the crest, the LSD viaduct on the horizon, and two
  thirds of the frame unbroken empty grass. Read the PNG. That emptiness is the
  before-shot and the acceptance measure — the same framing must read as a used park
  afterward.
  (1) GEOGRAPHY.md FIRST, then data. The map is changing: extend the Montrose Beach
  Dunes Natural Area / piping plover reserve inland and along the shore to take in
  the dead lawn. The owner has already granted GEOMETRIC LIBERTY here (task 084,
  "fine if the whole map curves or whatever") — use it honestly and record the ruling
  in GEOGRAPHY.md the way 116/115 recorded theirs.
  (2) THE RESERVE ITSELF — build the real thing, from refs/montrose/ (which already
  holds Monty/Rose piping-plover photography, the dunes-monitoring shots, and the
  beach/dune imagery; read them ALL first): drifting marram/dune grass in uneven
  swales rather than a flat lawn (reuse the existing tuft instancing — this is a
  BUCKET REUSE job, not a new bucket), low cottonwood saplings and beach pea, sand
  blowing into the grass at the edges, and the symbolic PERIMETER — post-and-rope or
  snow fencing, never a wall — with interpretive signage at the gates. The wire nest
  EXCLOSURE is the signature object: build it, it is the thing people photograph.
  (3) IT MUST BE SOMETHING YOU DO, NOT A FENCED-OFF HOLE. A reserve the player can
  only walk around is a bigger negative space than the lawn was. Give it: a
  perimeter/edge walk with a real route through the area, a viewing platform or
  two with a scope (REUSE the 126 takeCamera/releaseCamera look-through ownership —
  do NOT write a fourth camera-fighting beat), plover pairs working the sand with the
  existing bird state machine, and volunteer monitors as NPCs. Feed sightings into
  the existing bird-bingo/journal vocabulary rather than inventing a new system.
  Per task 084, keep an 8-10 m perch exclusion around watcher NPCs so birds are never
  standing ON the birders.
  (4) ADJUST THE OTHER MONTROSE FEATURES so the whole still makes sense — this half
  of the directive is not optional. Cricket Hill, the kite crest, the sports lawn,
  the beach approach and beach house, the harbor edge and its docks, the Magic Hedge
  at the Point, the bike path and trail alignment: re-site and re-proportion whatever
  the bigger reserve now crowds or orphans, and keep the real adjacency order intact
  (never relocate real landmarks relative to each other). The bike path should
  READ as skirting the reserve, not be bisected by it.
  (5) WALKABILITY IS THE RISK. A large new soft-bounded area is exactly where players
  get stuck: anti-trap movement rule (065) armed, flood-fill reachability clean, no
  walkable islands, gates obvious and generous, fences never a trap. walkprobe rules
  + expects in the SHARED data module exit 0. Task 128's new deck-coverage guard must
  also stay green.
  (6) MEASUREMENT: judged waypoints across the formerly-empty ground — at minimum the
  owner's bike-path framing (mt-lawn-fill), the reserve interior, the exclosure, and
  a viewing platform — authored expectations, walkthrough green, EVERY PNG personally
  Read and judged against the refs and the art-director standard.
  (7) PERF IS THE OTHER RISK: this is a big area seen across long sightlines. Instance
  everything repeated, zero new buckets unless named and justified, draws <= 480 at
  every affected waypoint INCLUDING the long looks across the reserve, and measure —
  do not assume.
  (8) DETERMINISM: local seeds only, append rng consumers never reorder, spawn diff
  within gate. Single-file build, zero console errors.
  (9) Montrose is SIGNED OFF (076). Update GEOGRAPHY.md, LOCATIONS.md, the montrose
  waypoint set and refs/montrose/SIGNOFF.md to match what you built. If the layout
  change is large enough that the sign-off of record no longer describes the place,
  file a Montrose re-sign-off task rather than quietly leaving a stale sign-off.
refs:
  - autopilot/issues/041-montrose-negative-space.md (the complaint, the view to
    reproduce, and the owner's ruling — read first)
  - refs/montrose/ — Monty and Rose piping-plover photos, the Montrose Beach Dunes
    monitoring shots, Montrose_beach/Montrose_Point imagery, the Magic Hedge set,
    BRIEF.md, SIGNOFF.md, osm.json (ODbL geometry source)
  - GEOGRAPHY.md Montrose section + the task 084 compression ruling (the owner's
    granted geometric liberty)
  - src/data/chicago.js (Montrose coast, beach, dunes, harbor basin, Cricket Hill,
    trail/bike-path alignment), src/coast.js, src/paths.js, src/props.js (tuft/tree
    instancing to REUSE)
  - task 071 Magic Hedge + the Jarvis sanctuary build (definePlace atmosphere grading
    and the birdwatch-deck/binocular precedent), task 126 (camera ownership for any
    look-through scope — reuse, do not re-implement)
  - PITFALLS.md; CLAUDE.md §8 de-brand law (geographic and civic names stay REAL —
    "Montrose Beach Dunes Natural Area" is a place name, not a brand)
---

The owner stood on the bike path, looked at the biggest open space in the game, and
said it was too much nothing. Then he answered his own question better than a props
pass would have: **give the space to the plovers.**

That is the right instinct and it is true to the place. Montrose Beach Dunes is a
real protected natural area that has genuinely grown over the years, and the piping
plovers that nested there — Monty and Rose — are the most-loved thing on this stretch
of lakefront. It converts an empty fairway into somewhere with a reason to exist: low
dune grass moving in the wind, a rope line you respect, a wire exclosure with a nest
in it, volunteers with scopes who will tell you what they are looking at.

Do both halves of the directive. Expanding the reserve is the easy half; making the
rest of Montrose still make sense around it is the half that decides whether this
reads as a real park or a patch.
