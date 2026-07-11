# LOCATIONS.md — the roster

The planner (§5.3 of AUTOPILOT.md) reads and updates this file. When the queue
is empty AND the current location has a SIGNOFF.md, the planner picks ONE
candidate, moves it to "In progress", and generates its full SCOUT → LAYOUT →
BUILD → DELIGHT → POLISH → SIGNOFF pipeline into autopilot/queue/.

Selection criteria, in order: recognizability · connectivity (prefer extending
the contiguous 1:2 world; distant sites become hard cells reached via the
ridable L — never a third place layer) · variety vs what's shipped ·
feasibility inside perf + single-file constraints.

## Shipped

- **Belmont Harbor lakefront** ("harbor") — Belmont-to-Irving-Park, 1:2
  contiguous world: Belmont Rocks, AIDS Garden, harbor + spit, dog beach,
  Bill Jarvis sanctuary, Marovitz golf, Diversey range, Waveland clock tower.
- **Wrigleyville** — hard cell via the ridable Red Line (Belmont → Addison):
  stadium, marquee, scoreboard, rooftops, Gallagher Way, Clark St fabric,
  game-day cycle. (Merged to main at 02aa933. **SIGNED OFF** 2026-07-09 —
  refs/wrigleyville/SIGNOFF.md; polish continues in queue 007/009/010/012.)

## In progress

- (none — **OWNER DIRECTIVE, 2026-07-11: the next planner run picks
  MILLENNIUM PARK.** The selection is made; do not re-litigate the roster —
  move it to In progress and generate its SCOUT → SIGNOFF pipeline per §5.3.)

## Candidates (famous Chicago spots, seeded per §5.3)

- **Wrigley Field INTERIOR (the bowl)** — owner-flagged future content
  (2026-07-09): a hard cell entered through the existing stadium gates
  (the train-interior pocket-cell pattern); teased in-world by the gate signs
  (queue 017). Design deferred by owner — do NOT scout/build until the owner
  green-lights; keep the gates honest doors when it happens.

- Montrose Harbor and the Magic Hedge — adjacent north; extends the contiguous
  lakefront world; birding + harbor variety.
- North Avenue Beach — adjacent south; the chess pavilion + boat-shaped
  beach house silhouette.
- Lincoln Park Zoo and conservatory — adjacent south-west; free zoo, iconic
  to every Chicago kid.
- The 606 and Wicker Park — elevated trail, distinct texture; likely hard cell.
- Logan Square — the eagle column + boulevards; hard cell via Blue Line motif.
- Andersonville — water tower + Swedish flag stripe; hard cell.
- The Riverwalk — downtown river canyon; strong silhouette; hard cell.
- Millennium Park — the Bean is the single most recognizable object in the
  city; hard cell. OWNER-PICKED 2026-07-11 (see In progress). Planning notes:
  reached via the ridable Red Line — extend the existing two-destination ride
  (wrigley-ride pocket-cell pattern) with a downtown stop (real Red Line:
  Monroe/Lake, a block west of the park). Anchor set: Cloud Gate (evoke as a
  playful toon "bean" — it is a copyrighted artwork, homage not replica, same
  register as the bar likenesses), Pritzker Pavilion ribbons + Great Lawn +
  trellis, Crown Fountain face-towers + splash play, Lurie Garden, the BP
  bridge serpentine, Michigan Ave streetwall as the west backdrop wall.
  Sources per standing rules: refs/millennium-park/ osm.json + Wikimedia;
  Google imagery banned; owner photos gold when supplied.
- Chinatown — gate + Ping Tom pagoda; hard cell.
- Pilsen — murals + 18th St; hard cell.
- Museum Campus — Field/Shedd/Adler skyline sweep; hard cell.
- Promontory Point — Caldwell council rings + limestone steps; hard cell.
