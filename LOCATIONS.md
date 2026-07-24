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

- **Montrose Harbor and the Magic Hedge** ("montrose") — OWNER-PICKED
  2026-07-11; pipeline 067–076 (shell 069, harbor + the HOOK 070, Magic
  Hedge hero 071, beach + dunes + plovers 072, Cricket Hill 073, delight
  074, polish 075). CONTIGUOUS 1:2 growth, no hard cell: the lakefront map
  extends north past z −812 to the map edge at z −1516 — one uncut walk
  Belmont Rocks → Montrose Beach, verified literally at sign-off (single
  page load, 0 stalls, jetski never mounted). **SIGNED OFF 2026-07-16**
  (task 076, refs/montrose/SIGNOFF.md; evocation blind-named "Montrose
  Harbor / Montrose Point, Chicago" with confidence "Unmistakable";
  12 delight moments logged; worst mt view 348/480 draws). Standing
  liberties worth knowing (GEOGRAPHY.md consolidated block): EAST-REACH
  COMPRESSION (LSD held at x 0–14, the real east reach compressed inside
  xMax 244 — topological order preserved, distance squeezed); the
  DOWNTOWN-SKYLINE PHYSICS RULING (far plane 900 m + fog opaque at 210 m
  → no skyline renders from Montrose; the Point's money view is the
  hook's stone arm + open-lake horizon instead); the dog-beach
  "Monty & Rose" pen at Belmont stays a recorded local homage while the
  Montrose DUNES hold the canonical plover story; issue 026 (basin water
  foam-blobs) root-caused and fixed at sign-off (e4a4d55).

## In progress

- **Lincoln Park Zoo and the conservatory** ("lincolnpark") — PLANNER PICK
  2026-07-19 (§5.3, queue 110–120). Contiguous 1:2 growth SOUTH-WEST
  through the staged Diversey-Lincoln Park gate (GEOGRAPHY.md's SW
  terminus, trail end ~(30,406)): Diversey Harbor channel + Theater on
  the Lake as connective tissue (112/113), then the free zoo — open
  gates, the Seal Pool, the Kovler Lion House, the habitat cast,
  Farm-in-the-Zoo (114/115) — the conservatory + Bates fountain + formal
  garden (116), and South Pond's Nature Boardwalk + honeycomb pavilion +
  Café Brauer (117); delight 118, polish 119, sign-off 120. Rationale
  vs criteria: recognizability (iconic to every Chicago kid, four
  distinct silhouettes), connectivity (adjacent growth, no hard cell —
  and it serves the owner's vision line "Lincoln Park + conservatory +
  ponds" directly), variety (the map's FIRST ANIMALS; a glasshouse and a
  channel harbor are new registers; North Ave Beach deferred — a third
  beach scores lowest on variety), feasibility (staged narrow like
  Montrose 067–076). Structural firsts for the layout task to rule with
  the 084/east-reach precedents: land WEST of LSD (the L backdrop +
  Lakeview band relocate) and the map's first WORKING underpass at
  Fullerton.
  - **SIGN-OFF BLOCKED 2026-07-24** (task 120 attempt, issue 031): the
    stretch is one signature landmark short — the **conservatory** (planned
    116) is parked-unbuilt (`LP_CONSERVATORY` data orphaned, consumed by no
    builder). It is named in the owner's vision line and task 120's evocation
    note, so it is required, not deferrable. Everything else verified green
    (walkprobe 1554/0, single-file build, 118+ delight, no LP issues/feedback).
    Filed task **122** (build conservatory, staged 116 head-start) and
    renumbered the sign-off **120 → 123** to run after it. NOT shipped yet.

## Candidates (famous Chicago spots, seeded per §5.3)
- North Avenue Beach — adjacent south; the chess pavilion + boat-shaped
  beach house silhouette. (Deferred at the 2026-07-19 pick on variety —
  third beach; the Lincoln Park growth walks the map toward it.)
- The 606 and Wicker Park — elevated trail, distinct texture; likely hard cell.
- Logan Square — the eagle column + boulevards; hard cell via Blue Line motif.
- Andersonville — water tower + Swedish flag stripe; hard cell.
- The Riverwalk — downtown river canyon; strong silhouette; hard cell.
- Chinatown — gate + Ping Tom pagoda; hard cell.
- Pilsen — murals + 18th St; hard cell.
- Museum Campus — Field/Shedd/Adler skyline sweep; hard cell.
- Promontory Point — Caldwell council rings + limestone steps; hard cell.
