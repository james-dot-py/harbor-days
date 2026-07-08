# GEOGRAPHY.md — the real Belmont Harbor, at explorer scale

**This file is the canonical layout.** Every builder and pack takes its coordinates
from here. When the map grows (Diversey south, Montrose north, inland neighborhoods),
extend this document first.

## Scale & orientation

- **1 game unit = 1 m. The map is 1:2 of real-world distances** (buildings, props,
  and people stay 1:1 human scale — only the land stretches). 1:2 keeps real
  proportion and "I'm walking through Chicago" pacing: brisk walk 3.4 m/s ≈ a real
  6.8 m/s ground speed, so the full map is a pleasant ~6-minute stroll, ~2.5-minute
  run, less on a Divvy.
- +z = south, −z = north, lake = east (+x). Water y −2.3, park y 0.
- **Anchors:** z = 0 at the Belmont Ave (3200 N) line. x = 0 at Lake Shore Drive's
  east edge (west map boundary). Chicago grid: 800 address units = 1 mile, so
  400 N-units = 805 m real = **402 m in-game**.

| Street line | Real | In-game z |
|---|---|---|
| Irving Park Rd (4000 N) | +1 mi | **−800** |
| Waveland Ave (3700 N) | +0.625 mi | **−500** |
| Addison St (3600 N) | +0.5 mi | **−400** |
| Roscoe St (3400 N) | +0.25 mi | **−200** |
| Belmont Ave (3200 N) | 0 | **0** |
| Briar Pl (~3100 N) | −0.125 mi | **+100** |
| Diversey/Fullerton point (~2800 N) | −0.2 mi | **+340…+403** (the corner wrap) |
| South map edge (~2750 N) | | **+415** |

Map bounds: **x −10…245, z −850…+415** (≈ 255 × 1,265 m). Player clamp a few m
inside (WORLD_CLAMP.zMax = 408). Minimap aspect follows (MAP.h = 1275).

## The strip, west → east (constant for the whole map)

1. **x 0–14 — Lake Shore Drive embankment** (NOT walkable): low berm, stylized
   8-lane ribbon, sparse toon cars whooshing both ways (ambient, like the L today).
   The L track/gag moves BEHIND it (x ≈ −8, backdrop only). **Behind the L
   (x < −12): the LAKEVIEW BAND** — a low-rise backdrop strip of vintage brick
   flats/greystones/small pre-war apartment blocks (2–6 stories, occasional
   taller vintage block; per LSD-at-Belmont photo references, e.g. the 1924
   Neo-Georgian 3520 N LSD type) — distant and modest, never towering over the
   park. Instanced boxes like the skyline treatment, but nearer/lower
   (`LAKEVIEW_BAND` in chicago.js, built in sky.js).
   **Underpasses** (future neighborhood gates + Divvy/foot entrances) at
   Belmont z +105, Addison z −400, Irving Park z −800: short tunnels through the
   berm, fenced dead-end doors for now ("FUTURE ENTRANCE" gag relocates here).
   The Belmont stop moved from z 0 to z +105 to sit on the AIDS-garden/Keith-Haring
   axis; a short paved connector links its mouth (~x 14, z 105) east to the loop.
2. **x 14–~85 — inner parkland**: lawns, meadows, tree groves, the inner branch of
   the Lakefront Trail.
3. **East of that, by section (see below): harbor, golf, garden — then open lake.**

## Sections, north → south

### Golf: Sydney R. Marovitz, z −800…−440 (real: 71 ac, 9 holes, 3,265 yd)
- Fenced course **x 60–205, z −790…−440** (≈ 145 × 350 m): east edge pulled in
  from x 230 so the DUAL Lakefront Trail runs the lake-side strip EAST of the
  golf fence (x 205 → revetment x 232), never crossing the fence line. South edge
  pulled north to z −440 so the Bird Sanctuary sits south of it, with a trail
  corridor (z −440…−420) between the two fences.
- **9 holes** (real routing is a N–S out-and-back): tees/greens alternate along the
  strip; keep the 3 playable holes as holes 1–3 near the south entrance, holes 4–9
  as visual dressing (greens, flags, bunkers) — all inside the fence.
- **Waveland fieldhouse + clock tower** lakeside, just inside the golf's SE corner:
  **(x 186, z −478)**, ry +π/2 so the tower corner is presented NE, toward the trail.
- **Waveland tennis courts** (BUILT): a 2×2 block of 4 courts on the inland lawn
  SOUTH of the golf (fence z −440) and WEST of the Bird Sanctuary (fence x 100),
  **fenced x 59–84, z −432…−406** (one gate on the south side). Green court
  slabs with painted lines, net posts + a sagging net per court. The block sits
  WEST of the Lakefront Trail's sanctuary-side run (bike x 90 + walk ribbon x 94)
  — its east fence (x 84) clears the bike ribbon's corner bow by ≈3.9 m. Data:
  `TENNIS`; builder `buildTennis()` in structures.js.
- **Lakefront Trail runs along the LAKE side of the golf**: a DUAL path (asphalt
  bike ribbon ~x 211 + crushed-limestone walking ribbon just east of it), between
  the golf fence (x 205) and the revetment terraces (x ~218–232), open lake beyond.
- Golf entrance off the trail at z ≈ −470 (by the lakeside fieldhouse).

### Sanctuary + Addison, z −430…−330
- **Bill Jarvis Migratory Bird Sanctuary** (real 7.84 ac): woodland on the
  lakefront strip **x 100–200, z −420…−357** (100 × 63 m), south of the golf
  (fence z −440) and north of the harbor. **HERO REWORK (2026-07-07, per the
  Addison aerial): the fence is an ORGANIC loop** (crChain outline, gate + wooden
  arch on the WEST run by the trail), and the interior is the map's
  secret-garden ROOM: a winding crushed-limestone WALKING LOOP, dense layered
  native planting (understory + prairie grasses + purple/yellow wildflowers)
  kept off the path, three dappled clearings, and an **ELEVATED WOODEN DECK**
  (x ~169–175, z ~−398…−394, h 2.3, stairs west) — the bird-watching perch,
  sittable, overlooking a clearing. Entering grades the world (denser greener
  fog, ducked exterior ambience, boosted birdsong) via the shared
  `definePlace` cell pattern in framework.js — the same machinery Wrigleyville
  adopts for its neighborhood cell. Bird-bingo pen and plover pen stay
  inside/adjacent.
- The DUAL Lakefront Trail comes down the golf lake side (x ≈ 211) to z ≈ −425,
  bends SW across the golf/sanctuary corridor and down the sanctuary's WEST fence
  (passing x ≈ 91), then continues south to the harbor west shore — the real
  "jog west around the sanctuary".
- **Kwanusila totem pole** on the inner lawn: **(x 30, z −370)** (real: Addison &
  the Drive).
- Addison underpass at (x 0–14, z −400).

### Belmont Harbor, z −350…0 (real: ~600 m long, 818 slips)
- **Basin water: x 85–160, z −330…−20** (75 × 310 m = 1:2 ✓ — a REAL harbor).
- **West shore x 78–85**: continuous seawall + **star docks / finger docks** in
  4 groups (z −300…−60), nameplate boats stay here. **Yacht club** on the west
  shore lawn: **(x 70, z −180)**, burgee pole seaward.
- **Mooring field**: 4 N–S rows of cans mid-basin (x 105–140), **~90 boats** at the
  new scale (instanced — budget is fine).
- **East peninsula (the SPIT) x 160–~202, z −330…−25**: treed, walkable via its
  north root (z −325). **Aerial-canonical shape + route (addison harbor.png,
  2026-07-07)**: the spit is a gentle TEARDROP — narrow at the root, swelling
  ~+4 m mid-length (lake edge fx peaks ≈ x200 near z −177) before the tip curl.
  The trail SPUR leaves MAIN at the basin north shore, skirts north of the
  dog-beach cove, then runs SET-INLAND (~6–9 m north of the basin shore, z
  −333…−342 — never hugging the seawall) to the root, and down the spit's
  SPINE (x ≈ 178–186) with the treed strip flanking it on both sides, ending
  just above the south-tip terraces (~186,−32) — the aerial's spine road.
  - **West edge x ≈ 160 (basin side) STAYS a flush sheet-pile bulkhead** down to the
    SW turn (~z −24) — docks/moorings INSIDE the harbor, per the aerial.
  - **THE SOUTH-TIP WRAP** (`COAST_TIP`): the tip's horseshoe (SW turn ~x166,z−24 →
    south point ~x176,z−17 → SE join with `COAST_PEN`'s start ~x196,z−25) is its OWN
    terraced coast piece — `TIER_DEFAULT` (4 steps) wrapping the point like the
    Diversey corner in miniature, steps OUTSIDE / stepping DOWN seaward the whole way
    around. It's a polyline coast piece (the tip isn't single-valued in z), fed to
    `coastQuery`/terraces exactly like the fitted-fx pieces. Kept OUT of the shared
    `COAST_SEGS` (its own deterministic terrace mesh + `TIP_SEGS` for walkability) so
    the addition shifts NO world rng — every towel/flower downstream stays put.
  - **Harbor entrance light** (`HARBOR_LIGHT`, x 176, z −20) on the tip's top step:
    short white tower, red cap, warm glow bulb — the aerial's entrance marker.
- **Harbor mouth: the gap z −20…0, x 120–200** opening SOUTH into the open lake
  (real: entrance at the south end, red light marker). Du Sable honorary sign here.
  The SW shore of the mouth is now its OWN terraced coast piece (`COAST_MOUTH`,
  z 16…−20, from the rocks' north tip ~x151 to the basin SW ~x85) — a south-facing
  stepped revetment like the real Belmont shore, not a flush seawall.
- **Dog beach** (real 0.15 ac, north tip): rounded sand cove **x 88–112, z −341…−327**
  (landward edge pulled south to clear the dual trail), fenced, gates on BOTH its
  west and east sides so people enter on foot. **NO paved ribbon crosses the sand:**
  the trail spur skirts NORTH of the cove. Fetch + Monty & Rose here.
- Inner park between LSD and the harbor (x 14–78) carries: trail (inner branch),
  Divvy dock (x 40, z −40), hot-dog cart (x 45, z −150), softball diamond
  (x 30–55, z −260…−225, backstop to the NW), goose patrol lawn (x 50, z −120).

### Belmont & south — AIDS Garden + the Rocks, z 0…+300
- **Belmont underpass moved to z +105** (on the AIDS-garden/statue axis) + its
  **stop cluster** (x 18–26, z 98–112): platform stub, harbor office kiosk, CPD
  entrance sign, Divvy dock, Harry Caray sign, busker. A short paved CONNECTOR
  links the underpass mouth (~x 14, z 105) east to the AIDS-garden loop's west edge.
- **AIDS Garden Chicago** lawn+beds **x 60–130, z +60…+180**; **Keith Haring
  sculpture (30 ft, green)** at **(x 95, z +120)**; Haring honorary sign beside it.
  The garden **plaza LOOP** is a clean circle (r 16) centred on the sculpture:
  the paved CONNECTOR from the Belmont underpass T-junctions its WEST point
  (79,120); MAIN skims its EAST point (111,120) tangentially — a Y where riders
  can peel onto the loop, never slicing its interior.
- **The Belmont Rocks**: stepped revetment along the open lake, **7 terrace steps**
  (reads broader). The east-facing rocks (`COAST_MAIN`, x ≈ 150) run to **z 340**;
  the same 7-step profile then WRAPS the south-facing **corner** (see below). The
  tier profile holds to z ≈ 404 (`TIER_ROCKS.zMax = 404`) so the steps never
  revert to the 4-step default anywhere on the arc. The hangout (towels, umbrellas,
  boombox towel, skip-stones, paint-a-rock, Frankie Knuckles sign live here).
- **THE CORNER WRAP** (Diversey/Fullerton point): a fitted-quadratic terraced
  revetment (`COAST_CORNER`, z 340 → 403) that curves the SAME 7-step profile from
  east-facing at the SE join with the rocks (≈ x152, z340) around to south-facing
  at the SW terminus (≈ x55, z403 — the shore exits the map toward Diversey
  Harbor). The seaward terrace normal rotates continuously from due-east to nearly
  due-south, so the steps step down seaward the whole way around; a smooth tangent
  join to the vertical east-facing rocks (the parabola's vertex sits at z340).
  Behind the curve is a **big south lawn** carrying two landmarks:
  - **John Henry's 'Chevron'** — a ~9.5 m BLUE steel sculpture (`CHEVRON`, x 96,
    z 372): a low concrete pad, 3 slender square-section columns leaning into a
    tripod mast, and 5 flat blade arms bursting from the masthead like a windmill
    sail. Reads instantly against the sky from the steps to the SE.
  - **The corner PIER** (`DECKS[1]`, plank deck x 116–126, z 373–406): juts SOUTH
    over the water toward the skyline; its north root sits on the revetment top/
    lawn (so it connects to walkable land), a lamp at its tip (z 406, just inside
    the clamp). Water beyond its rails.
- **MAIN trail south section HUGS LAKE SHORE DRIVE (aerial-canonical, 2026-07-07)**:
  per `Downloads/harbor aerial.png`, the real Lakefront Trail on the whole
  Diversey→Belmont stretch runs BESIDE the Drive, not the shore. From the
  AIDS-garden east tangent (112,120) it angles SW across the lawn and runs south
  along the berm (bike centerline x ≈ 20–24; walk ribbon +4 on the park side),
  past the Diversey range's west fence (≥2.8 m clear), ending at the south map
  edge ≈ (30,406) — the future Diversey-Lincoln Park gate now sits beside the
  Drive. The WIDE south lawns + the corner revetment, Chevron and pier lie EAST
  of the trail — people cross the grass to the rocks, as in the aerial.
- **Diversey Driving Range & Mini Golf** (BUILT, inland, west of the trail):
  a fenced green range strip **x 28–88, z +242…+283** (fenced W/N/E, open at the
  south tee line) with 4 tee mats, 3 distance boards, ~30 scattered balls and a
  ball bucket; a **mini-golf corner x 70–88, z +286…+306** with 3 whimsical holes
  (a STATIC windmill, a loop ramp, a tiny Waveland clock-tower replica) on felt
  fairways with wood rails. Data: `DIVERSEY`; builder `buildDiversey()`.

### Open lake (east of everything)
- Water from the revetment/peninsula line to the horizon. Drifting sailboat lane
  x > 240. Skyline due south (unchanged, uncurved backdrop).

## Standing liberties (deliberate, keep)
- The L as a *backdrop* west of LSD (real Brown Line is ~1.5 km inland) — it's the
  game's charm + future ridable-L hook.
- Wrigley glow/W-flag on the west horizon (real: ~1.6 km inland).
- Rat Hole relocated to the inner park path (real one was in Roscoe Village).
- Everything whimsical (boat puns, ope-NPCs, Malört) — style, not geography.

## Future growth (do not build yet, leave room)
- North: Montrose Harbor + bird hill beyond z −850.
- South: the Diversey range + mini golf are BUILT inland at z +242…+306; the
  south lawn, corner-wrap revetment, Chevron and pier are BUILT to z +415. Further
  Diversey/Lincoln Park growth beyond the SW terminus (the trail ends at a future
  Diversey-Lincoln Park gate ~x55, z395) is still open.
- West: neighborhoods behind LSD via the underpasses; ridable L.

## WRIGLEY_GEOGRAPHY — neighborhood two (the Wrigleyville cell)

**A separate CELL** (src/cells.js pattern): far west of the lakefront, behind the
L backdrop, reached only by riding the Red Line from the Belmont stop cluster.
Cells are mutually invisible (root-group visibility swap + per-cell walkability/
clamp/minimap). Data: `src/data/wrigleyville.js`; builders: `src/wrigley/*`.

### Anchors (Chicago grid carries over, true latitude)
- Same z-scale as the lakefront: **Addison = z −400, Waveland = z −500** — the
  cell sits at its real latitude (the lakefront's Addison underpass stays an
  honest future on-foot gate). The ride Belmont (z +105) → Addison (z −400)
  matches the real northbound Red Line.
- E–W: 1 W-address unit = 1 game unit, anchored so the Red Line embankment
  (real ~950 W) is **x −140**: `x = −140 − (Waddr − 950)`.
- **Clark St diagonal**: centerline `x = −290 + 0.28·(z + 400)` (x −290 at
  Addison → x −318 at Waveland, the real ~16° cant).
- Cell bounds ~x −390…−110, z −590…−300; clamp x −365…−115, z −580…−310.

| Feature | Position |
|---|---|
| Red Line embankment | x −148…−132 (solid berm, N–S full cell; bridge over Addison z −407…−393) |
| Addison island platform | x −143…−137, z −444…−426, y 7.6; stair inside the north mass to the Addison sidewalk |
| Sheffield Ave | x −190 (corridor −196…−184) |
| Kenmore Ave stub | x −230, z −544…−494 (ball-hawk corner) |
| Stadium block | Clark/Addison/Waveland/Sheffield; footprint poly in STADIUM_W |
| **The marquee corner is ROUND** | the Clark & Addison corner is the real art-deco curve: fillet r 14 about (−273.36, −421), tangent to the Clark wall at (−286.85, −417.25) and the Addison wall at (−273.36, −407); curve apex (−281.83, −409.85). The fillet opens a walkable sidewalk APRON (triangle Clark-edge/Addison-edge minus the circle) — the corner entry court |
| Marquee | on the curve apex, proud of the wall: (−282.7, −408.7), facing the Clark & Addison intersection (2026-07-08 fidelity pass; owner feedback — was a box corner at (−284.5, −409.5)) |
| Home plate → center field | (−262,−424) → (−214,−476); LF wall on Waveland, RF on Sheffield |
| Scoreboard | (−212, −480), top y 26.5 (published 87 ft), atop the CF bleachers |
| Gallagher Way plaza | east of Clark, **z −466…−430** — hugs the WEST stands, north of the Addison corner, and does NOT reach Waveland: its north bound is the Gallagher office block (per refs/wrigleyville/osm.json: plaza true z −433…−470, office 1101 W Waveland true z −469…−496). Statue Row + video board at its north edge |
| Gallagher office block | the notch's north end, z −492…−467.5, Clark corridor → west-stands wall (the office/hotel mass at Waveland & Clark that bounds the real plaza) |
| Murphy's Bleachers | SE corner Sheffield & Waveland (x −184…−168, z −494…−480) |
| Engine 78 | 1052 W Waveland → x −250…−234, z −524…−508 |
| Rooftop brownstones | N of Waveland x −226…−199 (middle one climbable, roof y 9.6) + E of Sheffield z −478…−430 |
| Cubby Bear + Clark bar row | opposite the marquee + west of Clark z −488…−418 |

### Walkability (game-day street closure = the clamp, diegetically)
Walkable = corridor quads only (WALK_W in wrigleyville.js — the single
definition, shared verbatim by main.js and walkprobe): Addison (station→Clark),
Waveland (Sheffield→Clark + Kenmore stub), Sheffield (Addison→Waveland), Clark
(Addison→Waveland), Gallagher Way (z −466…−430), the marquee-corner apron
(the crescent the rounded corner opens at Clark & Addison), the station
platform + stair, one climbable rooftop + its outdoor stair. Every corridor mouth ends at a **CPD blue wooden
barricade** (BARRICADES_W) with an officer NPC; streets visually continue into
a low-rise Lakeview backdrop band (BACKDROP_W).

### Standing liberties (deliberate, keep)
- The cell sits ~x −140 rather than the true ~x −800 (1.6 km inland) — the L
  ride is a scripted transition, not literal track distance.
- Stadium at land-scale footprint (1:2) with TRUE 1:1 verticals (v2, Wave 4):
  facade 16.5, rim ~23, towers ~29, scoreboard base 18.3 / top 26.5 — the
  published 60 ft / 87 ft. The NE bleacher crown stays ~8.1 on purpose: any
  higher blinds the Waveland rooftop views (the 2015-videoboard effect).
- **Classic postcard Wrigley: no 2015+ video boards**, so the rooftop views
  work. Hand-turned scoreboard only.
- Perpetual game day (crowd inside, barricades out, bars loud). The lakefront's
  Wrigley-glow backdrop gag stays for the lakefront; it hides while the
  Wrigleyville cell is active (Wave-3 wiring).
