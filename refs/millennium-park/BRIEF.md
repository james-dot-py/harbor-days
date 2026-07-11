# Millennium Park — location brief (SCOUT, task 039, 2026-07-11)

## ⚖️ COPYRIGHT REGISTER — READ FIRST (owner rule, LOCATIONS.md)

Cloud Gate (Anish Kapoor), Crown Fountain (Jaume Plensa) and the Gehry works
(Pritzker Pavilion, BP bridge) are **copyrighted artworks**. The game ships
**playful toon HOMAGES — evoke, never replicate** (same register as the bar
likenesses). Every build task downstream (043 bean, 044 pavilion, 045
fountain, 046 bridge) inherits this: chunky house-style caricature, invented
detail where it helps, no traced geometry, no photo textures. The US has no
freedom of panorama for sculptures, so Commons close-up coverage is thin by
design — massing/context refs suffice for the homage register (see Gaps).

## Sources & provenance

- `osm.json` — fetched 2026-07-11 via `node tools/osm-fetch.mjs millennium-park`
  (named area added to the tool this task). 1,679 elements; lakefront anchor
  asserts all PASS. © OpenStreetMap contributors, ODbL (README + journal
  credits shipped in queue 001). REFERENCE ONLY — hand-model everything.
- **PARK-LOCAL displaced frame** (this cell is displaced like Wrigleyville,
  on BOTH axes): auto-calibrated on South Michigan Avenue ∩ East Monroe
  Street → target (x 40, z 900), per queue 040's suggested cell region
  x +40..+200, z +640..+920. Applied offset **dx −468.8, dz −2369.6**
  (recorded in osm.json provenance). The intersection's TRUE lakefront
  projection is (508.8, 3269.6) — i.e. true z ≈ +3200. **Never validate this
  cell against the true lakefront projection; the lakefront anchor asserts
  validate only the projection math** (PITFALLS.md, AUTOPILOT.md §4.4).
- `manifest.json` — 41 Wikimedia Commons images, all CC BY / CC BY-SA / GFDL-
  compatible licenses with author + license + fetch date per image; every
  image personally Read this session. Junk culled (4 Pontiac-MI false hits,
  1 COVID sign, 1 mislabeled DuSable Harbor shot, 1 case-collision duplicate
  — see PITFALLS on Windows case-insensitive filename merges).
- `refs/inbox/` checked 2026-07-11: **empty** — no owner photos yet. Owner
  photos remain the gold channel; file with `source: "owner"` when they land.
- No Google data in any form (mechanically denied; nothing was fetched).

## Frame: measured street landings (park-local game coords)

Measured from osm.json (medians of the named ways inside the bbox):

| Street | Landing | Note |
|---|---|---|
| Michigan Ave (W frame) | **x ≈ 40** | calibrated exactly at Monroe; N section curves to ~48 |
| Columbus Dr (E frame) | **x ≈ 195** | multi-deck (Upper/Lower) in reality; game: one scenery level |
| Randolph St (N frame) | **z ≈ 698** | multi-deck east of Michigan in reality (Upper/Lower Randolph) |
| Washington St axis | **z ≈ 766** | no vehicles inside the park — promenade break line |
| Madison St axis | **z ≈ 831** | ditto |
| Monroe St (S frame) | **z ≈ 901** | calibrated |
| Park boundary (osm relation 23888253) | x 51–191, z 707–896 | the park proper inside the street frame |

**⚠ Correction for task 040:** the planner's estimate "Randolph→Monroe = 250
address units ≈ 251 game units" **overstates the park's N–S depth**. Loop
blocks are tighter than the standard grid: measured OSM truth is
**Randolph→Monroe ≈ 203 game units** (≈ 406 m real; blocks Randolph→Washington
68, Washington→Madison 64, Madison→Monroe 71). Michigan→Columbus E–W is
**≈ 155 units**. The suggested cell region x +40..+200, z +640..+920 still
fits with margin (Randolph z 698 vs region top 640 leaves room for the
Randolph streetwall + towers band).

## Physical inventory (osm-cited coords, described from the refs)

**The Michigan Ave streetwall — "the cliff"** (west of x 40, the whole cell
backdrop): a continuous 10–25 storey wall of limestone/terra-cotta/brick
frontages. Named anchors with footprints in osm.json: Chicago Cultural
Center (16, 760 — long classical colonnade block, "PUBLIC LIBRARY" cornice
inscription), Chicago Athletic Association (5, 836 — Venetian-Gothic tracery
front + gothic-arch crown), Gage Building (32, 861 — Sullivan facade),
University Club (19, 896 — gothic tower at Monroe), Monroe Building (7, 919
— gabled top), Willoughby Tower (32, 846), Six North Michigan (31, 824 —
Montgomery Ward tower base). North of Randolph the wall becomes GIANTS that
close every north view: One Prudential Plaza (79, 657 — the white-sign
PRUDENTIAL slab), Two Prudential (102, 647 — the diamond-spired "Two Pru"),
Aon Center (172, 640 — white vertical-fin monolith), Blue Cross tower (245,
670). SE beyond Monroe: the Art Institute (123, 927) + Chicago Stock
Exchange Arch (175, 908 — freestanding stone arch, a lovely scenery cameo).
Fixture language: quad-globe black cast-iron lamps + triangular red/yellow/blue
park pennants + "Millennium Park" lightbox banners (refs: rainy-night pair,
Michigan-skyline pair).

**Wrigley Square + Millennium Monument (NW)** — peristyle footprint
(61–73, 721–727), lawn south of it, entrance at Michigan & Randolph over the
Metra Millennium Station honeycomb: a semicircle of PAIRED Doric limestone
columns on a raised plinth with a fountain basin at its foot (refs:
9181701936, 171547031, upward view), open side facing SE across its own
lawn. Curved low limestone wall inscribed "WRIGLEY SQUARE" at the lawn's
walk corner (9179486203) — the park's signature signage form (see Chase
plinths). The peristyle-against-glass-towers contrast IS the shot.

**McCormick Tribune Plaza (Michigan edge, Washington→Madison, ~x 50–75,
z ~770–825)** — THE SUMMER CAFE (game is perpetual summer dusk: **no ice
rink, ever**): a sunken terrace one level below the Bean plaza, packed grid
of blue/yellow/green market umbrellas over cafe tables, a long cream
bar-tent ("the Plaza"), Park Grill under the AT&T Plaza overlook, planter
hedges, banner-boxes on floodlight posts (refs: McCormick pair, 9181704444).
The balustraded overlook rail between it and the Bean plaza is real and
photogenic.

**Cloud Gate on AT&T Plaza** — footprint (83.1–90.5 × 792.8–802.6), h 10 m,
long axis N–S, OSM tags: Kapoor / stainless / loc_name "The Bean". Sits
between Washington and Madison just EAST of the McCormick cafe terrace, on
big square pavers. Continuous walkable UNDER the arch (the "omphalos"). The
043 build is a playful toon bean with a PAINTED reflection (homage register;
no real reflections — perf + copyright both say so). West edge of the plaza
has the classical white balustrade overlooking the cafe (rainy-night refs).

**Crown Fountain (SW, Michigan edge, Madison→Monroe)** — reflecting pool
multipolygon (66.3–73.2 × 847–880.8: ~7 × 34 units — a long, THIN wet plaza,
real 15 × 71 m ✓ at 1:2), with TWO glass-block tower footprints as its inner
islands: north tower (68–71.4 × 850.1–852.5), south tower (68.8–72.1 ×
875.7–877.9), h 15.24 m, facing each other N–S down the pool's long axis.
Black granite pool, millimeters deep — a walkable WET MIRROR full of kids.
Tower faces are LED mosaics showing giant slowly-smiling Chicagoan faces;
periodically the face purses its lips and an arc of water SPOUTS from the
mouth onto the crowd (refs: 9181717698 spout view; night shot = towers as
amber glass lanterns, the game's dusk state). Wood-beam benches line the
east rim; elm bosques flank both long sides. Globe lamps + pipe rail along
the Monroe drop (Dec-2023 ref).

**Jay Pritzker Pavilion (NE)** — stage mass (123.5–170.2 × 746.9–757.6),
stage mouth facing SOUTH onto the seating bowl + Great Lawn. The read, per
refs DD_04/DD_05: an exploding crown of brushed-stainless RIBBON PETALS
around a proscenium; glass curtain-wall behind the stage mouth mirroring the
park; warm Douglas-fir wood interior with a dark-red stage curtain and a
spotted acoustic ceiling (28507845187 — orchestra + chorus rehearsing);
flanking black speaker-array towers. FIXED RED SEATS fill the bowl south of
the stage (~z 758–790), then the GREAT LAWN (~x 115–185, z ~790–840) under
the **TRELLIS**: a dome-like lattice of criss-crossing steel pipe arcs on
slim cylindrical columns around the lawn perimeter, hanging paired black
speaker pods at the crossings (trellis-2022, DD_02/08/09). At dusk the stage
gets magenta/violet color washes and the trellis pipes catch warm light —
the signature evening image (DD_07/08/09). Harris Theater flybox adjoins
the stage's north (129–163 × 715–747, Randolph edge).

**Lurie Garden (SE)** — boundary (127.6–178.7 × 841.7–892.1). Enclosed on N
and W by the **SHOULDER HEDGE**: a 4.5 m clipped evergreen wall grown inside
a visible dark-steel armature cage (IMG_20181101 shows the frame edges —
build the frame lips proud of the hedge, it reads great in toon). Interior:
the LIGHT PLATE (153.6, 852.5) and DARK PLATE (167.7, 870.7) perennial
tapestries — salvia river purple, amsonia gold, prairie grasses, red
daylilies (closeup ref) — split by **THE SEAM**: a diagonal water rill
(159.2, 859.5) with a low wood BOARDWALK (osm "The Boardwalk", 159.1, 852.6)
where feet dangle over the water. Steps N up toward the lawn (unnamed
bridge=yes steps at 173–178 × 883–889 in osm.json).

**BP bridge (E)** — osm way **25026666** (unnamed pedestrian bridge, 64 pts):
serpentine deck snaking from the Great Lawn's SE corner (172.6, 787.9) east
over Columbus (x≈195, on concrete drum piers) to (242.1, 834.9) toward
Maggie Daley Park. Brushed-stainless SHINGLE parapets (horizontal
overlapping plate bands, chest-high, flaring wider at curves), wood-plank
deck, gentle crest over the road (closeup + The-Loop deck refs). Maggie
Daley (climbing wall visible in 29521562318's top corner) is OUT OF SCOPE —
the far portal dead-ends politely at the cell edge (no "future" signage,
task-030 owner rule; 046 decides the exact treatment).

**Chase Promenade** — tree-lined allee in three blocks (osm: North 100.7,
756.1 / Central 108.6, 777.4; South unnamed), broad central walk with
flanking tree rows, paired curved inscribed limestone plinths at entrances
("CHASE PROMENADE" / "MILLENNIUM PARK" — Dec-2017 dusk ref), globe lamps
with pennants, long wood benches. Boeing Gallery North terrace at (81, 724)
(+ South counterpart ~z 890). "Extrusion Plaza" (120, 772) sits between
promenade and lawn.

**Exelon Pavilions** — four black glass cubes: NW (125, 716 — doubles as
the park info center), NE (168, 720), SW (129, 888), SE (170, 891). The
north pair flanks Harris Theater on Randolph; the south pair flanks the
Lurie approaches on Monroe. Simple, instanced-friendly masses.

**Millennium Station / Pedway beneath (NW)** — commuter rail concourse under
Wrigley Square (osm: station 71.7, 687.5; pedway walk 83, 708). Surface
flavor only: sidewalk grates, warm air, a rumble every few minutes (delight
seed). McDonald's Cycle Center (182, 730) on Randolph — glassy bike depot,
scenery.

**Nichols Bridgeway** — (117.5, 839.7→925.9): the Renzo Piano white curved
footbridge rising from the lawn SW over Monroe to the Art Institute's Modern
Wing roof. Beyond the cell's south walkability — model as scenery leaving
the frame (liberty), it sells the Monroe edge.

**Food trucks** line Monroe at (84, 902) (osm "Food Trucks") — perpetual
summer street-food row, delight-adjacent.

## Signature landmarks, ranked (the 3–5 that make the evocation review pass)

1. **Cloud Gate** — the most recognizable object in the city (owner's words).
   The silver bean + its crowd + the cliff behind = instant Chicago.
2. **Crown Fountain** — two glowing face-towers spitting on a wet black
   mirror full of kids; nothing else on earth reads like it.
3. **Pritzker Pavilion + trellis + Great Lawn** — the steel flower + pipe
   dome over green; the dusk color-wash state is the money view.
4. **The Michigan Ave cliff** — not a landmark, THE landmark-holder: every
   in-park view west or north terminates in that limestone-and-glass wall
   (Pru/Two Pru/Aon close the north). Without it the park is anywhere.
5. **BP bridge serpentine** (with Lurie's shoulder hedge and the Wrigley
   Square peristyle as strong supporting cast).

## Street topology & arrival

- Frame: **Michigan Ave W** (the cliff + quad-globe lamps + pennant banners,
  6-lane scenery street), **Randolph N** (Harris Theater + Exelon cubes +
  the Pru/Aon giants over the trees), **Columbus mid/E** (passes UNDER the
  BP bridge; Pritzker's east flank; in reality multi-deck — game: one
  scenery level, a recorded liberty), **Monroe S** (food-truck curb, Art
  Institute + Nichols Bridgeway beyond). Washington & Madison do not enter
  the park — they survive as promenade break-lines in the paving.
- **Red Line arrival is the Monroe/State SUBWAY a block WEST** of Michigan.
  Connector liberty (record in 040's STANDING LIBERTIES exactly like the
  Wrigleyville x-frame): the State→Michigan block is compressed to zero — a
  CTA SUBWAY STAIR KIOSK stands at the park's Michigan Ave edge; stairs down
  = the 042 boarding point. Downtown Red Line is a SUBWAY (State St tube),
  so the ride arrives THROUGH DARKNESS into a tiled stair — a totally
  different flavor from Wrigleyville's elevated arrival, and that contrast
  is the point.
- Compass is TRUE: north up, lake east — the lake itself is beyond Grant
  Park's harbor (out of frame east); downtown genuinely lies SOUTH of the
  lakefront map, matching the cell's positive-z placement.

## Palette (perpetual summer dusk — fog 0xf6ab84 register)

- **Silver stainless** (bean, pavilion ribbons, bridge shingles) catching
  warm amber dusk on the west faces, cool violet in shade.
- **Lawn green** (Great Lawn, Wrigley lawn) + elm bosque green-black masses.
- **Glass-block amber GLOW** — Crown towers as lanterns at dusk (night ref),
  LED face in warm tones; wet black granite MIRROR pool doubling the light.
- **Limestone cliff** warm grey/cream with punched lit windows; gothic
  white terra-cotta (CAA, People's Gas columns); Aon's bone-white fins.
- **Red accents**: pavilion seat field, Millennium Park vendor tents,
  banner pennants (red/yellow/blue triangles), daylilies.
- **Lurie**: salvia-river purple + amsonia gold + prairie russet.
- Sky: peach→violet dusk with the first window-lights on (DD_07/08/09,
  rainy-night pair are the tone refs).

## Housing/business texture

No housing inside the park. The texture IS the institutional cliff (hotels,
clubs, the Cultural Center) + the visitor layer: cafe umbrellas, vendor
tents (red "Millennium Park" canopies — 28507852437), food trucks on
Monroe, wedding parties + tourists at the Bean, commuters surfacing from
Millennium Station, buskers/bucket drummers on the Michigan sidewalk,
gardeners in Lurie. NPCs should read as downtown-mixed (office wear +
tourists + kids in swimsuits at the fountain), unlike the lakefront's
athleisure or Wrigleyville's game-day blue.

## DRAFT waypoints + expectation strings (mp-*)

DRAFT ONLY — 040 fixes the stands/features and stages the FINAL list under
"WAYPOINTS (final)"; 041 pastes the strings into tools/waypoints.expect.json
in the same commit that wires the module into gen-waypoints (never earlier —
gen-waypoints fails loudly on unmatched expect ids). Positions below are
osm-cited landmark anchors, not final stands; interiors/tight courts need
axis-aligned framings per the camera doctrine.

- **mp-arrival** (subway kiosk, Michigan edge ~x 45, z ~800): "A red-pyloned
  CTA subway stair kiosk stands on the Michigan Avenue sidewalk with stairs
  leading down into a tiled landing; behind it the limestone streetwall
  rises like a cliff, and park lawns with globe lamps and pennant banners
  open east."
- **mp-streetwall** (mid-park looking west, ~x 90, z ~820): "West across
  the park, a continuous wall of limestone and terra-cotta towers closes the
  entire view — arched gothic fronts, lit windows, one classical colonnade
  block — reading as a downtown canyon face, not scattered buildings."
- **mp-peristyle** (Wrigley Square, stand SE of 67, 724): "A semicircular
  peristyle of paired pale Doric columns on a raised plinth curves around a
  fountain basin at the lawn's north-west corner, framed against glass
  office giants; a low curved limestone wall nearby reads WRIGLEY SQUARE."
- **mp-mccormick-cafe** (overlook or terrace, ~x 60, z ~795): "A sunken
  cafe terrace packed with blue and yellow market umbrellas over bistro
  tables sits one level below the Bean's plaza, edged by a white balustrade
  and planter hedges, with diners under a long cream bar canopy — summer
  al fresco, no ice."
- **mp-bean** (AT&T Plaza, stand SE of 87, 798): "A giant silver toon bean
  sits on square pavers with a painted skyline-and-crowd reflection wrapped
  around its belly; its arch opens walkably beneath, small figures cluster
  at its base, and the limestone cliff rises behind."
- **mp-crown-fountain** (pool south end looking north, ~x 70, z ~885):
  "Two glass-block towers face each other across a long, wet black
  reflecting pool that mirrors their amber glow; the near tower shows a
  giant face, and a water arc spouts from its mouth into the pool where
  figures splash."
- **mp-promenade** (Chase Promenade Central looking north, ~x 105, z ~800):
  "A broad paved allee runs north between double rows of trees with globe
  lamps and colorful pennant banners, past a curved inscribed limestone
  plinth, and dead-ends visually at the white PRUDENTIAL slab and its
  diamond-topped twin."
- **mp-pritzker-stage** (seating bowl, stand ~x 147, z ~775, axis-aligned
  north): "A crown of curled stainless ribbon petals bursts around a glass
  stage mouth with a warm wood interior and dark red curtain; ranks of red
  folding seats fill the bowl in front, and the Aon monolith towers directly
  behind."
- **mp-great-lawn** (lawn south end looking north, ~x 150, z ~835): "Steel
  pipe arcs criss-cross overhead in a dome-like lattice hung with paired
  speaker pods, converging toward a lit silver stage at the lawn's far end,
  with the north skyline wall — Prudential sign, diamond spire, white
  monolith — standing beyond."
- **mp-lurie** (boardwalk at The Seam, ~x 159, z ~856, axis-aligned along
  the rill): "A low wood boardwalk runs beside a thin water rill through
  drifts of purple and gold planting, all enclosed by a tall clipped hedge
  wall growing inside a dark steel frame, with the Gehry ribbons and towers
  peeking over its shoulder."
- **mp-bp-bridge-crest** (deck crest over Columbus ~x 195, z ~800,
  axis-aligned down-the-deck — parapets block cross-body shots): "A
  wood-plank deck curves ahead between chest-high brushed-steel shingle
  parapets, snaking over a road below and back toward the stainless
  pavilion ribbons and the skyline wall."

Minimum judged set per task acceptance: one per signature landmark +
arrival + streetwall + bridge crest — the 11 above cover it with margin.

## WAYPOINTS (final) — task 040 (supersedes the DRAFT list above)

Stands verified against WALK_M (src/data/millennium.js) and the walkprobe
flood-fill; coordinates cite GEOGRAPHY.md MILLENNIUM_GEOGRAPHY. 041 pastes
the expectation strings into tools/waypoints.expect.json in the SAME commit
that wires the module into gen-waypoints.mjs (never earlier — gen-waypoints
fails loudly on unmatched expect ids). Camera math: camera = stand −
(sin yaw, cos yaw)·dist; every camera position below was hand-checked to
land on open walkable ground or open air — the two camera traps in this
cell are (a) the SUNKEN CAFE VOID (x 57–76, z 772–826: cameras south/east
of the kiosk must hug the spine x ≤ 57) and (b) the CROWN ELM BOSQUES
(x 58–65 / 75–84, z 846–882: prefer the pool's two axis framings).

- **mp-arrival** — stand (55, 812), feature KIOSK_M (50.3, 800.3).
  f0 yaw π dist 7 (N up the sidewalk: kiosk front-left, cliff left, lawns
  right); f1 stand (54, 788) yaw 0 dist 7 (reverse); f2 stand (55, 810)
  yaw −2.9 dist 7 (three-quarter; camera hugs the spine, clear of the cafe
  void). Expect: "A red-pyloned CTA subway stair kiosk stands on the
  Michigan Avenue sidewalk with stairs leading down into a tiled landing;
  behind it the limestone streetwall rises like a cliff, and park lawns
  with globe lamps and pennant banners open east."
- **mp-streetwall** — stand (90, 820), feature the cliff face (30, 820).
  f0 yaw −π/2 dist 8; f1 stand (108, 812) yaw −π/2 dist 6; f2 stand
  (66, 766) yaw −π/2 dist 7 (Cultural Center colonnade close-up, z 760).
  Expect: "West across the park, a continuous wall of limestone and
  terra-cotta towers closes the entire view — arched gothic fronts, lit
  windows, one classical colonnade block — reading as a downtown canyon
  face, not scattered buildings."
- **mp-peristyle** — stand (78, 736), feature peristyle (67, 724).
  f0 yaw −2.40 dist 7; f1 stand (84, 744) yaw −2.35 dist 9 (wide: the
  peristyle-against-glass-giants contrast IS the shot); f2 stand (67, 738)
  yaw π dist 7 (head-on symmetric). Expect: "A semicircular peristyle of
  paired pale Doric columns on a raised plinth curves around a fountain
  basin at the lawn's north-west corner, framed against glass office
  giants; a low curved limestone wall nearby reads WRIGLEY SQUARE."
- **mp-mccormick-cafe** — stand (78, 812) at the balustrade, feature cafe
  center (66, 800, y −1.6). f0 yaw −2.36 dist 7 pitch ~0.5 (down into the
  terrace); f1 stand (78, 790) yaw −0.79 dist 7 pitch ~0.45; f2 stand
  (76.5, 820) yaw −2.0 dist 5 (along the rail). Expect: "A sunken cafe
  terrace packed with blue and yellow market umbrellas over bistro tables
  sits one level below the Bean's plaza, edged by a white balustrade and
  planter hedges, with diners under a long cream bar canopy — summer al
  fresco, no ice."
- **mp-bean** — stand (92, 806), feature CLOUD_GATE_M (86.8, 797.7).
  f0 yaw −2.58 dist 8 (three-quarter + cliff behind); f1 stand (87, 812)
  yaw π dist 7 (head-on, painted reflection); f2 stand (87, 797.7) yaw
  −π/2 dist 6 (UNDER the arch, looking west through it to the balustrade
  and cliff); f3 stand (82, 790) yaw 0.72 dist 7. Expect: "A giant silver
  toon bean sits on square pavers with a painted skyline-and-crowd
  reflection wrapped around its belly; its arch opens walkably beneath,
  small figures cluster at its base, and the limestone cliff rises behind."
- **mp-crown-fountain** — stand (69.8, 884), feature N tower (69.8, 851.5).
  f0 yaw π dist 7 (down-the-pool axis, both towers); f1 stand (69.8, 842)
  yaw 0 dist 7 (reverse axis); f2 stand (80, 862) yaw −π/2 dist 5 (E-rim
  cross shot — fights the bosque, lowest priority). Expect: "Two
  glass-block towers face each other across a long, wet black reflecting
  pool that mirrors their amber glow; the near tower shows a giant face,
  and a water arc spouts from its mouth into the pool where figures
  splash."
- **mp-promenade** — stand (108, 806), feature the allee axis north
  (108, 716). f0 yaw π dist 7 (tree tunnel dead-ending at the Pru slab +
  diamond twin); f1 stand (108, 726) yaw π dist 6 (plinth pair close);
  f2 stand (108, 790) yaw 0 dist 7 (reverse, south). Expect: "A broad
  paved allee runs north between double rows of trees with globe lamps
  and colorful pennant banners, past a curved inscribed limestone plinth,
  and dead-ends visually at the white PRUDENTIAL slab and its
  diamond-topped twin."
- **mp-pritzker-stage** — stand (147, 777), feature stage mouth
  (146.5, 758). f0 yaw π dist 8 (stage + ribbon crown + Aon behind);
  f1 stand (135, 782) yaw −2.9 dist 9 (three-quarter w/ speaker tower);
  f2 stand (147, 768) yaw π dist 5 (mouth interior: wood + red curtain).
  Expect: "A crown of curled stainless ribbon petals bursts around a
  glass stage mouth with a warm wood interior and dark red curtain; ranks
  of red folding seats fill the bowl in front, and the Aon monolith towers
  directly behind."
- **mp-great-lawn** — stand (150, 834), feature stage through the trellis
  (146.5, 758). f0 yaw π dist 8; f1 stand (130, 838) yaw −2.95 dist 8
  (SW diagonal); f2 stand (150, 810) yaw π dist 6 (mid-lawn, arcs
  overhead). Expect: "Steel pipe arcs criss-cross overhead in a dome-like
  lattice hung with paired speaker pods, converging toward a lit silver
  stage at the lawn's far end, with the north skyline wall — Prudential
  sign, diamond spire, white monolith — standing beyond."
- **mp-lurie** — stand (159.5, 862) ON the Seam boardwalk, feature the
  rill axis NE (175, 849.5). AXIS-ALIGNED ALONG THE RILL ONLY (the hedge
  cage blocks cross-body lines): f0 yaw 2.25 dist 6 (NE along the water);
  f1 yaw −0.91 dist 6 (reverse, SW); f2 stand (174, 848) at the NE gate,
  yaw −0.80 dist 6 (down into the garden from the entry). Expect: "A low
  wood boardwalk runs beside a thin water rill through drifts of purple
  and gold planting, all enclosed by a tall clipped hedge wall growing
  inside a dark steel frame, with the Gehry ribbons and towers peeking
  over its shoulder."
- **mp-bp-bridge-crest** — stand (199, 806.5) on the crest, feature
  deck-west (186, 796). DOWN-THE-DECK ONLY, dist ≤ 6, near-level pitch
  (chest-high shingle parapets block every cross-body line — the L-car
  interior doctrine): f0 yaw −2.07 dist 5.5 (west: deck curve, pavilion
  ribbons, skyline wall); f1 stand (193, 802) yaw −1.93 dist 5 (back down
  the ramp); f2 stand (198, 806) yaw 1.07 dist 5.5 (east to the polite
  dead-end + lower Loop band). Expect: "A wood-plank deck curves ahead
  between chest-high brushed-steel shingle parapets, snaking over a road
  below and back toward the stainless pavilion ribbons and the skyline
  wall."

## Gaps & caveats (honest bookkeeping)

- **No freedom of panorama (US)**: Commons close-up coverage of Cloud Gate's
  surface detail and Crown Fountain's LED faces is deliberately thin; what's
  here is context/massing (clean licenses, verified per-image in
  manifest.json). That is SUFFICIENT — the build register is homage, not
  replica. Do not go hunting for closer copyrighted imagery.
- **Unnamed in OSM**: the Great Lawn, Wrigley Square, McCormick Plaza, AT&T
  Plaza and the BP bridge carry no name tags — positions above are cited
  from adjacent named geometry (pavilion mass, monument footprint, Cloud
  Gate footprint, Crown pool, bridge way 25026666). The trellis is not in
  OSM at all; build from the photo refs (arcs + perimeter columns).
- **Multi-deck streets**: Randolph east of Michigan and Columbus are
  Upper/Lower stacks in reality (the park sits on garages/rail). The game
  cell keeps ONE grade per street (scenery), a liberty 040 must record; the
  BP bridge still crests OVER Columbus (its whole point).
- **Randolph→Monroe depth correction** for 040 — see Frame table (203 units
  measured, not 251).
- Duplicate-case Commons filename collision on Windows cost one aerial (see
  PITFALLS.md); the bridge S-curve geometry survives in osm.json.
- refs/inbox was empty this task; re-check every task per doctrine.

## Delight candidates

8 proposed lines appended to delight-backlog.md (2026-07-11, tagged
[proposed], source refs cited there): bean polisher, fountain spout soak,
Pritzker soundcheck, wedding shoot, bucket drummers, lawn picnic culture,
Lurie gardener's "Big Shoulder", Millennium Station rumble grate.
