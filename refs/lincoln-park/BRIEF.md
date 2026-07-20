# Lincoln Park (Zoo + Conservatory + the ponds) — SCOUT BRIEF

Authored **task 110** (SCOUT, 2026-07-19). REFERENCE ONLY — no game code, no
GEOGRAPHY.md edits (that is 111's job, citing this dir's `osm.json`). This file +
`osm.json` (with `provenance.scout110`) + the delight-backlog additions + the
36→34-image manifest are the deliverables.

`osm.json` is the geometry reference, in the **TRUE game projection** (offset none —
`x=0` at LSD's east edge, `z=0` at Belmont, 1:2 distances). Survey it with
`node tools/tmp-110-inspect.mjs summary|prov|find <re>|geom <ids>|trace <id> [N]|westreach <z> <re>`.

---

## 0. Frame / anchors (cite these; don't re-derive)

The fetch reused the established lakefront projection with **no `--offset`**: this is
CONTIGUOUS 1:2 growth south of the Diversey corner (trail end ~(30,406)), not a
displaced cell. The four lakefront asserts pass (Belmont z0 Δ0, Addison z−400 Δ−5,
Irving z−800 Δ−6.8, LSD east edge x0 Δ0). **osm z IS game z; osm x IS true game x**
(unlike a hard cell — no per-area x-offset).

**Grid sanity (measured centerlines vs the acceptance's expected z):**

| Street (N addr) | expected game z | measured | Δ |
|---|---|---|---|
| Diversey Pkwy (2800N) | +402 | **+396** (Pkwy) / +369 (Dr) | −6 |
| Fullerton Pkwy (2400N) | +805 | **+794** (Pkwy) / +765 (Ave) | −11 |
| Armitage Ave (2000N) | +1207 | **+1201** | −6 |

Deltas are the same −5…−7 systemic offset the lakefront asserts already carry (the
diagonal drift of the real grid vs the game's square z). **The osm.json is honest and
grid-sane.** Webster (2200N) z~999, Dickens (2100N) z~1100 also land clean.

---

## 1. THE WEST-REACH RULING KIT (the crux — 111 rules this)

This is the map's first growth structurally implicating **land west of Lake Shore
Drive**, and the mirror of Montrose's east-reach liberty. The scout's job is the
honest numbers; the ruling is 111's. Full data in `osm.json → provenance.scout110`.

### 1a. The measured west→east order at Fullerton (z 794, true projection)

```
Clark St  Lincoln Park West  Stockton Dr   [ ZOO ]   Cannon Dr   [ lagoon ]   DuSable LSD   [Theater]   lake
 x−154.5      x+7.4            x+29.7      x30..132     x132.3    x132..167     x230..238    x236..270    x270+
```

The **built park core** (zoo halls x48–208, conservatory x48–93, Café Brauer
x108–130, farm x108–149, South Pond x101–244) sits almost entirely in **positive x,
inside today's map band (x −10…245)**. Only **DuSable LSD (x230–238), Theater on the
Lake (x236–270) and the open lake beyond** push toward/past today's `xMax` 244.

### 1b. THE STRUCTURAL FACT that makes "west of LSD" confusing — and the ruling 111 owes

**DuSable Lake Shore Drive drifts EAST going south** (the mirror of Montrose, where it
drifts west going north). Measured east-edge x by latitude (true projection):

| z (≈street) | DuSable LSD east-edge x |
|---|---|
| z200 | +131…141 |
| z400 (Diversey) | +192…201 |
| z600 | +191…200 |
| z794 (Fullerton) | +230…238 |
| z1000 | +279…287 |
| z1200 (Armitage) | +320…329 |

So in the true projection the Drive is **far east** at Lincoln Park, and the park sits
WEST of it — but still at **positive** game x, because the Drive itself has marched to
x230–329. The park is geographically west of the Drive yet numerically east of the
game's `x0` berm line.

**Two framings 111 must choose between** (either is honest; the osm.json supports
both — it is the true projection):

- **(A) Keep the true projection.** Park at x30–210, DuSable LSD at x230–329, Theater
  + lake past x244. Consequence: `xMax` grows east to ~275 (Theater + a lake sliver);
  the game's `x0–14` berm continues south as the park's **inland/west edge** (near
  Stockton/Lincoln Park West), and the existing L-track + Lakeview backdrop (today at
  x<−12) keeps representing the **Clark St / Lincoln Ave residential wall** west of the
  park (Clark at x−154). This is the cleaner geographic read: berm morphs from
  "DuSable LSD @ Belmont" into "the park's west frontage @ Lincoln Park." Feasible —
  the built core already fits x −10…244 with only a small east growth.

- **(B) Re-anchor DuSable LSD to the usual x0–14 berm in the Lincoln Park block**
  (an east-reach compression, the Montrose precedent). Then every feature slides WEST
  by the LSD-east value; measured LSD-relative offsets (feature_x − 238.4):

  | feature | west of LSD (game x if LSD held at ~0) |
  |---|---|
  | DuSable LSD east edge | 0 |
  | Cannon Dr | **−106** |
  | Stockton Dr (zoo west edge) | **−209** |
  | Lincoln Park West | −231 |
  | Clark St | −393 |

  Consequence: the park extends ~**210 units WEST** of the berm into negative x, so the
  map grows west to `xMin` ≈ −230 (or −393 to include the Clark residential edge), and
  the L-backdrop/Lakeview band must **relocate** (as LOCATIONS.md flagged). This mirrors
  Montrose exactly but on the west side, and the ~102 m zoo (Stockton→Cannon) can then
  be **west-reach compressed** to fit however wide 111 wants the negative-x band.

**Scout recommendation (111 to decide, not binding):** framing (A) needs the least
new bounds, keeps the backdrop-band where it already is, and matches the real read
(park west of the Drive, city west of the park). The **channel→Theater east reach**
(Cannon x132 → Theater x270 = ~138 m of harbor+drive+theater+lake) is the piece that
overruns `xMax` and is the natural place for a modest EAST-reach squeeze (the standing
Montrose liberty), NOT the zoo. Either way, the zoo/conservatory **fit the current
width**; the only forced growth is a ~25–30 m east nudge for Theater-on-the-Lake + a
lake sliver. **The 084-compression section is the precedent to cite.**

### 1c. Map's first WORKING underpass (LOCATIONS.md structural first)

Fullerton Ave crosses the lakefront; the Lakefront Trail passes UNDER it — osm has a
`tunnel:yes` path segment at x167–170, z772–786 (`Lincoln Park Fitness Course`
id 404738667) and the `Fullerton Avenue Access Path` bridging over at z768–773. This
is the natural site of the map's first walkable underpass (a 112/113 concern) — the
Belmont/Addison/Irving/Montrose portals are dead-end doors; this one opens.

---

## 2. Physical inventory (what is physically there — game coords, true projection)

Ordered north→south. All coords from `osm.json`; ordered-way endpoints (not bbox
corners) recorded in `provenance.scout110.orderedEndpoints`.

### Diversey Harbor + the north approach (z ~380–780, the connective water)
- **Diversey Harbor** (osm 17750786, `leisure=marina`, capacity **719**, Chicago
  Harbors): a long narrow **lagoon** carved into the land, running from the Diversey
  basin (N end ~(235.5, 411), where it meets the Belmont-corner lakefront) SOUTH along
  the zoo's east flank to Fullerton (S end ~(167, 742)). Water x ≈ 163–236 near
  Diversey, narrowing to x ≈ 167–192 at Fullerton. Rows of **wooden finger docks +
  moored white sailboats + dock-box lamps** (night refs); stone-block revetment edge;
  residential-highrise wall to its west. This is "the connective water that threads
  the park."
- **Cannon Drive** (x~132 at Fullerton) runs the lagoon's **west** bank = the zoo's
  east flank; a wide multi-lane park drive + lakefront parking (aerial).
- **Theater on the Lake** (osm 23989552): compact ~35×30 footprint x235.6–270.2,
  z693.1–732.6, center ~(252, 713), **EAST of DuSable LSD on the Fullerton lakefront**
  (the historic 1920 Prairie-brick "Fresh Air Sanitarium", now a theater/venue).
  *Imagery gap — see §9.*
- **Peggy Notebaert Nature Museum** (osm 23986958) x42–88, z700–760 — modern; not a
  signature, a texture building at Fullerton/Cannon (west side).
- Statuary at Diversey: **A Signal of Peace** (equestrian Native American, Dallin) @
  (221.8, 375.9); **Goethe Monument** @ (−76.9, 408, west).

### The Conservatory + formal gardens (z ~830–990, x ~15–95)
- **Lincoln Park Conservatory** (osm 23986733) x48.4–93.4, z829.9–893.4 — the
  copper-green glass glasshouse. Interior rooms tagged: **Palm House** (x48.7–74.3,
  z875–890), **Fern Room**, **Show House**, **Orchid House**.
- **Eli Bates Fountain ("Storks at Play")** (osm 210686594) center ~(64, 952) —
  Saint-Gaudens/MacMonnies bronze: cranes with spread wings + boys wrestling fish, on
  the formal-garden axis south of the glasshouse. *(Bates = person; STAYS real.)*
- **Formal gardens** flanking: **Grandmother's Garden** (x15–36, z826–990, informal
  perennial beds, west), **Lincoln Park Conservatory Garden** (the French/formal beds,
  x49–78, z919–985).
- **Alfred Caldwell Lily Pool** (osm 116740882) x103–123, z805–858 — the hidden
  Prairie-style lily pool (Caldwell/Jensen), a lagoon-and-council-ring gem just NE of
  the conservatory; landmarked. *(Caldwell = person; STAYS.)*

### The ZOO campus (z ~890–1300, x ~48–210 — between Stockton x30 and Cannon x132+)
Free, open-gate. Historic core around the Sea Lion Pool at z~1020:
- **Sea Lion / "Seal" Pool** (osm 758343800, `attraction=animal`, operator Lincoln
  Park Zoo) center ~(98, 1021), round pool x91.9–103.8, z1015–1028 — the historic
  naturalistic **craggy-limestone-rockwork** pool with a "SEA LIONS" sign (B&W ref);
  the zoo's central landmark.
- **Kovler Lion House** (osm 210686223) x125.3–158.5, z1025.8–1038 — the **1912
  red-brick hall** (the signature historic zoo building); renovated 2024 as the
  **Pepper Family Wildlife Center** (osm 992815961, x131–147, z1011–1026, the lion
  habitat). *(Kovler, Pepper = donors; STAY real.)*
- **Regenstein Center for African Apes** (x179.8–208.9, z1082–1107 — gorillas),
  **Regenstein African Journey** (x95–130, z899–963), **Regenstein Small Mammal &
  Reptile House** (x84–108, z1047–1081), **Regenstein Macaque Forest** (snow monkeys,
  x103–108, z974–982). *(Regenstein = donor; STAYS.)*
- **Helen Brach Primate House** (x168–186, z1045–1075), **Antelope & Zebra House**
  (x172–188, z1132–1163), **McCormick Bird House** (x135–156, z934–963), **Kovler Sea
  Lion**/**Walter Family Arctic Tundra** (polar bear, x125–142, z888–903),
  **Pritzker Penguin Cove** (x132–140, z925–934), **Pritzker Family Children's Zoo**
  (osm 760586278, `tourism=zoo`, x49–84, z1010–1082). *(Brach, McCormick, Walter,
  Pritzker = donors; STAY.)*
- **Searle Visitor Center** (x163–180, z980–998, modern glass + a tall historic
  **red-brick smokestack** landmark behind), **Judy Keller Education Center**,
  **Foreman Pavilion**, **Park Pavilion**.
- **AT&T Endangered Species Carousel** (osm 210686222, x172.8–188.6, z1014–1030) —
  **commercial mark, needs de-brand** (§8).
- **Lionel Train Adventure** (osm 524245313, x88–97, z1000–1010) — **brand, needs
  de-brand** (§8).
- Zoo entrance identity (ref): bronze **lion pair** on a granite **"LINCOLN PARK ZOO"**
  plinth before the Beaux-Arts limestone **Laflin/Academy hall** (the west/Stockton
  entrance).

### Farm-in-the-Zoo (z ~1225–1296, x ~108–149 — south end)
- **Main Barn** (x119–135, z1265–1284), **Dairy Barn** (x121–137, z1225–1236),
  **Farm House** (x108–118, z1244–1255), **Livestock Barn** (x141–149, z1267–1278),
  **Holding Barn** (x131–139, z1287–1296). Ref sign: red hip-roof barns + yellow
  clapboard + white picket fences + windmill; cow / goat / chicken / pig / horse.

### South Pond + Nature Boardwalk + Café Brauer (z ~1131–1310, x ~101–244)
- **South Pond Natural Area** (osm 758462738, `nature_reserve`, Chicago Park District)
  x101.6–244.2, z1131.3–1309.7 — a rounded restored pond, naturalized prairie-grass /
  cattail / lily-pad margins (Nature Boardwalk restoration).
- **Café Brauer (South Pond Refectory)** (osm 24826112, 1908 Prairie School, NRHP)
  x108–129.6, z1137.8–1172 — the hero building on the **north shore**: central red-brick
  2-storey hall, broad green-tiled hip roof, green-glazed Prairie frieze, **two open
  loggia arms** embracing the pond terrace, a clock. Green + swan paddleboats on the
  water. *(Brauer = person; STAYS.)*
- **People's Gas Education Pavilion** (osm 186667195, x178.6–185.2, z1220.7–1228.5) —
  the **Studio Gang honeycomb** open timber pavilion on the boardwalk's SE peninsula.
  **Commercial mark, needs de-brand** (§8).
- **Nature Boardwalk**: a low wood boardwalk on pilings (black mesh rail) zigzagging
  the pond, x137–234, z1141–1310; **Bridge Over South Pond** (x140–163, z1198–1209)
  carries "NATURE BOARDWALK / LINCOLN PARK ZOO" lettering.
- **Hans Christian Andersen Monument** @ (86.8, 1127), **Garibaldi** @ (228, 1315),
  **Ulysses S. Grant Memorial** (equestrian on a stone Romanesque arcade, on the ridge
  N of the pond — visible from the boardwalk; a north-end landmark).

---

## 3. Signature landmarks, RANKED (the 3–5 that must read)

1. **The ZOO campus — the historic Sea Lion Pool + Kovler Lion House** *(the map's
   FIRST ANIMALS; the hero).* The round rock-rimmed sea-lion pool in front of the 1912
   red-brick lion hall is THE Lincoln Park Zoo postcard and the reason to build here.
2. **Lincoln Park Conservatory** — the copper-green vaulted glasshouse + white pyramid
   vestibule over a formal garden of clipped beds and ornamental grasses. A wholly new
   register for the map (a glasshouse). FREE ADMISSION on the doors.
3. **South Pond — the Nature Boardwalk honeycomb pavilion + Café Brauer.** The Prairie
   red-brick refectory with its two loggia arms + green/swan paddleboats, across a
   naturalized reed-and-lily pond crossed by the zigzag boardwalk and its honeycomb
   pavilion. (The real postcard puts the skyline behind — the game CANNOT; see §7.)
4. **Diversey Harbor** — the connective sailboat lagoon threading the whole park
   north–south; the water that ties Belmont's harbors to Lincoln Park.
5. *(texture)* **Farm-in-the-Zoo** (red barns + farm animals) and the **Bates "Storks
   at Play" fountain** — secondary silhouettes that reward exploration.

---

## 4. Topology (the arrangement law — 111 preserves; §5.4)

- The **Diversey Harbor lagoon** runs N→S along the park's EAST side (Cannon Dr its
  west bank), from the Diversey basin down under Fullerton.
- **Theater on the Lake** sits ALONE on the lakefront EAST of DuSable LSD at Fullerton.
- The **zoo** occupies the block **between Stockton Dr (west) and Cannon Dr (east),
  SOUTH of Fullerton** (z~890–1300), historic core (Sea Lion Pool + Lion House) at the
  north-center (z~1020).
- The **conservatory + formal gardens + Bates fountain + Lily Pool** cluster NW of the
  zoo at Fullerton/Stockton (z~830–990, x~15–120).
- **South Pond** hangs off the zoo's SOUTH end (z~1131–1310); **Café Brauer** on its
  north shore, the **honeycomb pavilion** on its SE boardwalk peninsula, **Farm-in-the-
  Zoo** just NW of the pond (z~1225–1296).
- WEST of the park: the **Clark St / Lincoln Ave** residential + business wall
  (backdrop only — Clark at x−154; the L/Lakeview band represents it, per §1b-A).

---

## 5. Palette (authored from the refs)

- **Zoo halls:** warm **red brick** + limestone trim, **green-tiled hip roofs**, arched
  windows; a tall historic **red-brick smokestack**. Naturalistic exhibits = grey
  **craggy faux-limestone rockwork** + muddy earth + cable/mesh fencing.
- **Conservatory:** **copper-green** glazed-glass roofs + copper ridges, a **white
  pyramid** vestibule roof, red-brick base, dark evergreen conifers; interiors =
  **terracotta-red flagstone** paths winding through deep-green tree ferns/cycads/palms,
  **mossy grey tufa rockwork** borders, hanging orchid baskets, dark koi pools.
  Formal garden: green lawn + **feathery straw ornamental grasses** + red/orange/purple
  massed flower beds + low stone fountain rims.
- **Café Brauer / Prairie:** warm red brick, **green-glazed geometric frieze tile**,
  green-tiled roof, sage window frames, warm wood doors, white globe lamps.
- **South Pond / Nature Boardwalk:** **algae-green / lily-pad** water, golden prairie
  grasses + cattails + **magenta liatris / purple ironweed / goldenrod** drifts, brown
  wood boardwalk + black mesh rail, honeycomb pale-timber pavilion.
- **Diversey Harbor:** dark lagoon-green water, white sailboat hulls, wood/steel finger
  docks, stone-block revetment, dock-box lamps.
- **Farm:** red barns, white picket fences, yellow clapboard, green tractor, straw.
- **Statuary:** verdigris-green bronze + grey granite plinths, under big canopy elms.

---

## 6. Housing / business texture (backdrop, west; build minimal — mostly the L band)

West of the park (negative x) is dense Lincoln Park neighborhood: **Clark St** low-rise
commercial (the Wiener Circle @ x−300 z539, cafés, churches, Hotel Lincoln), the
**vintage brick + greystone** flats and pre-war apartment blocks along Lincoln Park
West / Lakeview / Stockton (Belden-Stratford, the Elks National Memorial dome @ x−135
z424, Midwest Buddhist Temple @ x−140 z1416), and residential **highrise towers** on
the lakefront frontage (Commonwealth Plaza, 2500 N Lakeview) that wall the harbor. Per
§1b-A this reads as the existing **L-track + Lakeview backdrop band**, extended and
raised slightly for the lakefront towers behind the harbor — NOT a built street grid.
Real commercial marks here are backdrop-only (never player-visible signage): Trader
Joe's, McDonald's, 7-Eleven, Wiener Circle, Equinox — no de-brand needed unless a sign
becomes legible.

---

## 7. THE DOWNTOWN-SKYLINE PHYSICS RULING (binding on the expectation strings)

Every real South Pond / Nature Boardwalk / Café Brauer / Diversey-Harbor postcard puts
the **downtown skyline** (Hancock, Willis) behind the water. The game **CANNOT render
it**: camera far plane 900 m (core.js) + fog opaque at ~210 m — the fog:false skyline
billboard sits far south and Lincoln Park's own content is 1,100–1,500 m north of it.
This is the exact Montrose Point ruling. **No lp-* expectation string below promises
the skyline.** Each hero view's money read is the near content (pavilion, pond, brick
hall, glasshouse) — which is plenty.

---

## 8. FREE-ZOO fact + ANIMAL CAST (verified; ranked for 114/115)

**FREE ZOO (build law for 114's entry):** Lincoln Park Zoo is one of the last free,
open-admission zoos in the US — **open gates, no ticket booth, no turnstile.** The
conservatory refs show "**FREE ADMISSION**" on the doors; the entrance is a plinth +
lions + an open path, not a gate with a box office. 114's arrival must read as "walk
right in" — the OPPOSITE of the Wrigley box-office/ticket gate. This is a signature
Chicago civic fact and a delight in itself.

**Animal cast — ranked by chibi-chunky readability at zone distance** (PITFALLS: small
toon animals don't read; go chunky, cluster, seat a few eye-level):

READS GREAT (build these):
1. **Sea lions / seals** — dark sleek shapes arcing through the pool; motion + the
   historic pool = the hero. (Kovler Sea Lion Pool.)
2. **Lions** — big tawny mass on a warm rock ledge + the bronze-lion entrance pair.
   (Kovler Lion House / Pepper Wildlife Center.)
3. **Polar bear** — chunky white against grey rock; reads at any distance. (Walter
   Arctic Tundra.)
4. **Flamingos** — vivid pink/salmon, tall, clustered flock (the single most colorful
   read; ref shows a dense flock). Cluster them.
5. **Giraffes** — tall silhouette (Regenstein African Journey has them) — the tallest,
   best distance-read of the hoofstock.
6. **Gorillas / apes** — big dark mass, expressive up close (Regenstein African Apes).
7. **Farm animals** — cow / goat / pig / chicken / horse, chunky and familiar
   (Farm-in-the-Zoo); the pettable register.

READS OK (secondary): zebras (stripes help), rhino (chunky grey), penguins (small but
clustered + b/w contrast), snow monkeys (Macaque Forest — cluster on rocks), camels.

DON'T READ at zone distance (skip or up-close-only): **meerkats** (tiny), small
mammals/reptiles, most **songbirds** (McCormick Bird House) — reserve for near-rail
eye-level props if used at all.

Cast recommendation for 114/115: build the **Sea Lion Pool + Lion House** as the
central hero pair, ring the campus with **flamingos, polar bear, giraffe, gorilla**,
and give **Farm-in-the-Zoo** the pettable cow/goat/chicken set. Snow monkeys + penguins
as clustered secondary reads.

---

## 9. DE-BRAND AUDIT (for RENAMES.md — 111 records the ledger lines)

Per the RENAMES person-name KEEP precedent, **donor/person names STAY real** (they read
as honorary/philanthropic, like the honorary-way people): **Kovler, Regenstein, Brauer,
Bates, Pepper, Pritzker, Walter, Helen Brach, McCormick, Foreman, Searle, Judy Keller,
Hurvis, Lester Fisher, Peggy Notebaert, Alfred Caldwell, Laflin, Eli Bates.** Also KEEP
(geographic/civic): Lincoln Park, Diversey Harbor, South/North Pond, Stockton/Cannon,
Chicago Park District, Chicago Harbors.

**Commercial marks that would appear as fixture NAMES → need pun/generic (111 adds to
RENAMES.md):**

| Real mark (osm fixture) | proposed in-game | where it shows |
|---|---|---|
| **People's Gas** Education Pavilion | e.g. **"People's Glass Pavilion"** / "Prairie Gas Pavilion" / generic "Honeycomb Pavilion" | boardwalk pavilion sign/journal |
| **AT&T** Endangered Species Carousel | e.g. **"A&T Carousel"** / "Endangered Species Carousel" (drop the brand) | carousel sign/prompt |
| **Lionel** Train Adventure | e.g. **"Loco Train Adventure"** / generic "Zoo Train" | mini-train ride sign |

*(Bird's Eye Bar & Grill — a zoo restaurant named for the bird's-eye view — reads as a
generic pun already; note but likely fine. "Wild Things / Wild Gifts" gift shops =
generic.)* 111 picks the final puns per the word-sign-fit law.

---

## 10. DRAFT lp-* WAYPOINT EXPECTATION STRINGS (authored from refs; physics-compliant)

Final judgeable sentences the build tasks paste into `tools/waypoints.expect.json`
(114–117 site the stands + framings; 111/112/113 may reword the connective ones). **No
string promises the skyline (§7).**

- **lp-arrival** *(entering Lincoln Park from the north/harbor)* — "The lakefront path
  crosses under a low stone underpass and opens into broad old parkland: a long lagoon
  of moored white sailboats runs south on the left, red-brick and limestone park halls
  stand among big elms ahead, and the way splits toward a green-glass glasshouse and an
  open zoo gate."
- **lp-diversey-harbor** — "A long narrow lagoon runs south between grassy banks, lined
  with wooden finger docks and rows of moored white-hulled sailboats; a low park bridge
  crosses it ahead and old shade trees lean over the calm green water — the inner harbor
  that threads the park."
- **lp-zoo-gate** *(the free entrance)* — "An open, ungated zoo entrance with no ticket
  booth: a bronze pair of lions lounges on a granite LINCOLN PARK ZOO plinth on a
  brick-paved plaza, a grand columned limestone hall stands behind among the trees, and
  visitors stream freely in."
- **lp-seal-pool** *(the hero)* — "A round pool rimmed with craggy grey limestone
  rockwork sits before red-brick hall arches; dark sleek sea-lion shapes arc and roll
  through the green water, and a rail of onlookers leans in to watch."
- **lp-lion-house** — "A long 1912 red-brick hall with tall arched windows under a
  green-tiled roof faces a planted terrace; in the rockwork habitat a big tawny lion
  lies on a warm ledge, and a chunky bronze lion sits by the door."
- **lp-conservatory** *(the glasshouse hero)* — "A great copper-green glasshouse of
  vaulted glass roofs rises behind a formal garden of clipped flower beds and feathery
  straw-colored grasses; a small white pyramid-roofed vestibule marks the FREE
  ADMISSION doors, framed by dark evergreens."
- **lp-conservatory-interior** *(optional, if an interior room is built)* — "Inside the
  humid glasshouse a terracotta flagstone path winds between towering tree ferns and
  palms over mossy grey rockwork, hanging orchid baskets overhead and a dark koi pool
  beside the path, the glass roof trusses bright above."
- **lp-bates-fountain** — "A low round garden pool holds a dark-bronze fountain — tall
  cranes with spread wings and small figures wrestling fish, jets of water arcing over
  them — set on the axis between the formal flower beds and the green glasshouse behind."
- **lp-cafe-brauer** — "A grand Prairie-style pavilion of warm red brick under a broad
  green-tiled hip roof, its green-glazed geometric frieze and two open loggia arms
  embracing a terrace above the pond; green and white swan-shaped paddleboats cluster on
  the dark-green water below."
- **lp-boardwalk** *(honeycomb pavilion + naturalized pond)* — "A low wood boardwalk on
  pilings zigzags across a naturalized pond thick with cattails, reeds and lily pads; an
  open honeycomb-latticed timber pavilion curves over the water at the far bend, and
  herons and turtles work the green shallows."
- **lp-farm** *(Farm-in-the-Zoo)* — "A cluster of red hip-roofed barns and a yellow
  clapboard farmhouse behind white picket fences; a brown-and-white cow, a white goat
  and red hens stand in a straw-strewn yard with a windmill turning slowly behind — a
  working farm in the middle of the city zoo."

---

## 11. Imagery manifest + honest gaps

`manifest.json`: **34 images**, all Wikimedia Commons (clean licenses: CC0, CC BY 2.0,
CC BY 4.0, CC BY-SA 2.0/3.0/4.0, Public domain, "No restrictions") + provenance per
image. All **34 personally Read** this session. Files-on-disk == manifest entries (34),
no orphans, no case-collision overwrites (`tmp-110-prune.mjs` audit).

Coverage: zoo entrance lion-plinth + Laflin hall; the historic Sea Lion Pool (B&W
rockwork); conservatory exterior (glasshouse + pyramid vestibule + FREE ADMISSION doors
+ formal garden, incl. a vintage B&W) ×2 + interiors (Fern Room, Orchid House, palm
house) ×4; Café Brauer (Prairie frieze closeup, loggia + paddleboats, pond frontal)
×4; Nature Boardwalk (bridge inscription, prairie berm, ecological pond, low-deck +
Grant Monument, aerial honeycomb pavilion) + South Pond (dusk ×2, day); Diversey
Harbor (marina docks night ×3); Farm-in-the-Zoo folk sign; Bates "Storks at Play"
fountain (in the conservatory-garden shots); zoo aerial (campus + smokestack) ×2;
Searle Visitor Center + smokestack; cast: sea lions, polar bear, rhino, gorilla ×2,
flamingos ×2, meerkats.

**Honest gaps (Commons has nothing cleanly usable):**
- **Theater on the Lake** — 0 usable results (the "Theatre on the Lake"/"Fresh Air
  Sanitarium" queries returned nothing; "Theater on the Lake Chicago" returned the
  downtown **State-Lake movie theater**, which was PRUNED as junk). 112/113 should
  re-fetch (try Mapillary at the Fullerton lakefront, or owner inbox) or hand-model
  from the known Prairie-brick 1920 building type.
- **Kovler Lion House** as a building (only the animal + entrance refs; no clean
  facade shot) — hand-model the 1912 red-brick arched hall from the aerial + type.
- **Farm-in-the-Zoo barns** as buildings (only the entrance sign) — the folk-sign +
  the red-barn type carry it.
- **Modern Sea Lion Pool** (2015 renovation, underwater viewing) — only the historic
  B&W; the rockwork read is what matters, so the gap is cosmetic.
- **The honeycomb pavilion** close-up (only aerial + distant) — Studio Gang lattice
  type is documented enough to model.
- No `refs/inbox/` owner photos this task (checked; only `.gitkeep`).

---

## 12. Notes for 111 (LAYOUT) and 112–117 (BUILD)

- **111**: rule the west-reach framing (§1) in GEOGRAPHY.md FIRST, then chicago.js;
  cite `provenance.scout110` and the 084-compression precedent. Record the standing
  liberty (whichever framing) exactly as Montrose's east-reach block is recorded.
  Record the RENAMES lines (§9). Stage the pieces the way Montrose 069 staged coast
  consts (separate consts so 112–117 each swap one).
- **112/113**: Diversey Harbor lagoon + Theater on the Lake + the FIRST working
  Fullerton underpass; the harbor is a Belmont-basin sibling (reuse dock/mooring/boat
  buckets, LOCAL seeds, +0 InstancedMesh buckets — the Montrose determinism plan).
- **114/115**: the free zoo — open gate (§8), Sea Lion Pool + Lion House hero pair,
  the chibi-chunky cast (§8), Farm-in-the-Zoo. The map's first animals: reuse a shared
  animal-instancing approach (the crowd.js / baked-LOD-twin precedent) so N animals =
  few draws.
- **116**: conservatory (a glasshouse is a NEW register — self-lit `bmat` glass to
  dodge the toon green-ground-bounce pitfall, like the Bean/Crown glass) + formal
  garden + Bates fountain + Lily Pool.
- **117**: South Pond + Nature Boardwalk (walkable low deck — the millennium
  band-polyline walkability precedent) + honeycomb pavilion + Café Brauer.
- **Determinism**: all scatter caps at z ≥ −800 today; Lincoln Park is z +380…+1500, so
  it is scatter-free virgin ground — but 111 must confirm no shared-rng consumer keys
  off the new south bounds, and every new ribbon goes via `pathSamples2` / every new
  coast piece stays OUT of `COAST_SEGS` (the Montrose laws).
