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
  - **INSIDE WRIGLEY — the bowl** (task 055, owner green-light 2026-07-11,
    SHIPPED): ticket at the box office → the Marquee Gate is an honest door →
    the 'wrigley-bowl' pocket cell (empty open-house register): walkable
    warning track + concourse ring, two climbable seating wedges with sit
    spots, the ivy wall + foul poles + hand-turned scoreboard + rooftop
    silhouettes — and the field-trespass REF CHASE (grass → the ump chases at
    6.9 m/s; tagged → EJECTED outside, ticket gone; cozy re-entry loop).

- **Millennium Park + Grant Park** ("millennium") — hard cell via the ridable
  Red Line (Belmont ⇄ Addison ⇄ Monroe; downtown Red Line is the State St
  subway, the kiosk-at-the-park-edge compression a recorded standing
  liberty). Queue 039–049 + 050-056 polish: Cloud Gate homage, Pritzker
  ribbons + Great Lawn + trellis, Crown Fountain face-towers + splash play,
  Lurie Garden, BP bridge serpentine, Michigan Ave streetwall. **SIGNED OFF
  2026-07-11** (task 053, refs/millennium-park/SIGNOFF.md). Grant Park EXPANSION
  (owner-directed 2026-07-11, queue 057-062): Art Institute (lions + Nichols
  Bridgeway), Butler Field with Lollapalooza live, all of Maggie Daley Park
  (play garden, climbing walls, skating ribbon), BP bridge across Columbus.
  **SHIPPED + SIGNED OFF 2026-07-12** (task 062 — SIGNOFF.md addendum;
  22-waypoint walkthrough green, worst view 478/480). Polish continues only
  on owner report.

## In progress

- **Montrose Harbor and the Magic Hedge** ("montrose") — OWNER-PICKED
  2026-07-11; planner pipeline generated 2026-07-13 as queue 067–076
  (SCOUT 067 → LAYOUT 068 → BUILD 069 map-extension shell / 070 harbor +
  the hook / 071 Magic Hedge hero / 072 beach + dunes + plovers /
  073 Cricket Hill → DELIGHT 074 → POLISH 075 → SIGNOFF 076). CONTIGUOUS
  1:2 growth per the owner directive — no hard cell: the lakefront map
  itself extends north past the z −812 fence line toward Montrose Ave
  (4400 N ≈ z −1200). Anchor set: the Magic Hedge on Montrose Point
  (hero — hedgerow + birders + scopes + open-lake horizon), Montrose
  Harbor with its south mouth + the curling fishing HOOK pier, Cricket
  Hill (the first walkable hill), Montrose Beach + beach house + The Dock
  + the dunes natural area (the real piping-plover home — the shipped
  dog-beach Monty & Rose liberty gets ruled on in 068). Determinism law
  for the growth: own coast pieces out of shared COAST_SEGS, new ribbons
  via pathSamples2, local seeds, zero new instanced buckets (millennium's
  worst view sits at 478/480 and instanced buckets draw globally).
  Sources per standing rules: refs/montrose/ osm.json + Wikimedia in the
  WORLD frame; Google imagery banned; owner photos gold when supplied.

## Candidates (famous Chicago spots, seeded per §5.3)
- North Avenue Beach — adjacent south; the chess pavilion + boat-shaped
  beach house silhouette.
- Lincoln Park Zoo and conservatory — adjacent south-west; free zoo, iconic
  to every Chicago kid.
- The 606 and Wicker Park — elevated trail, distinct texture; likely hard cell.
- Logan Square — the eagle column + boulevards; hard cell via Blue Line motif.
- Andersonville — water tower + Swedish flag stripe; hard cell.
- The Riverwalk — downtown river canyon; strong silhouette; hard cell.
- Chinatown — gate + Ping Tom pagoda; hard cell.
- Pilsen — murals + 18th St; hard cell.
- Museum Campus — Field/Shedd/Adler skyline sweep; hard cell.
- Promontory Point — Caldwell council rings + limestone steps; hard cell.
