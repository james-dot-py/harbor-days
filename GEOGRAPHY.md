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
   berm, fenced dead-end doors for now (the "FUTURE ENTRANCE →" gag signs were
   removed in task 030 per owner feedback — the portals stay, the signs are gone).
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
  **The plaza LOOP is a TWO-LOBE PEANUT** (task 023, per the owner drone aerial
  refs/aids-garden/aerial-path-structure.jpg — the real loop is NOT a clean
  circle): the statue ring (r 16 about 95,120) unioned with a larger SW lawn
  lobe (r 12 about 78,134), drawn as one continuous outline (`TRAIL_LOOP`).
  The paved CONNECTOR from the Belmont underpass still T-junctions at (79,120)
  (now on the waist's north arc); MAIN still skims the east point (111,120)
  tangentially — both welds unchanged. (`TRAIL_LOOP_GHOST` keeps the retired
  r-16 circle registered in pathSamples as determinism ballast — see chicago.js.)
- **THE ENTRANCE MONUMENT is the park's FRONT DOOR** (task 023, per
  refs/aids-garden/entrance-monument-sign.jpg; SITED BY OWNER LIVE DIRECTION
  2026-07-10): at the garden's SOUTH, on the lawn just SE of MAIN's bend,
  ~15 m from the garden Divvy dock (95,145) — a low wide grey
  concrete/granite wall (`ENTRANCE.wall`, x 102.8…116, z 160.2, long axis
  E–W, lettered face NORTH toward the lawn/trail approach) with gold 'AIDS
  Garden Chicago' letters EAST-biased, scattered bronze ginkgo-leaf memorial
  plaques (one merged geometry), the rough granite boulder leaning mid-span
  WEST of the letter band (owner: it must never cover the 'A'), two white
  limestone sitting blocks on a decomposed-granite forecourt pad north of the
  wall, prairie-grass flanks, and a reused instanced globe lamp behind.
  **This is the ONLY 'AIDS Garden' signage in the game** — the standard
  wooden SIGNS plate was removed. STANDING LIBERTY: the real monument stands
  at the garden's NORTH entrance off the trail junction; the owner directive
  (2026-07-10, watching live) places it by the garden Divvy dock with the
  spawn facing the water — deliberate, like the Waveland knothole.
- **ENTRANCE→LAKE PATH** (`TRAIL_ENTRANCE`, the aerial's shore arm): a crushed-
  limestone ribbon leaving the forecourt pad's east edge (115,155.6) and
  running ENE down to the revetment top at (150.9,146.8) — the entrance path
  reaching the lake.
- **PLAYER SPAWN moved here** (task 023 + owner direction): player
  (109.5, 156.6) on the forecourt, yaw 1.57 — **FACING THE WATER** (east,
  open lawn to the Belmont Rocks steps); camera starts due west at
  (87.5, 4.5, 156.6). Monument front-right, upsized WHERE-NEXT suggestion box
  (relocated from the Belmont underpass, `SUGGESTION_BOX`) ahead-right,
  Divvy dock behind-left. The monument is the first thing every player sees.
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
  - **John Henry's 'Chevron'** — a ~9.6 m BLUE steel sculpture (`CHEVRON`, x 96,
    z 372), reworked 2026-07-10 against the owner's on-site photo set
    (refs/diversey-corner/, task 021): **TWO-TONE** — a tapered main BLADE mast
    (narrow at the base, flaring to a beveled chisel tip) in pale powder blue
    over a darker steel-blue base, a second shorter leaning blade, and five
    slender square-section straight beams CROSSING the masts like pick-up
    sticks (beams pass through; not a radial fan). Low concrete pad. Reads
    instantly against the sky from the steps to the SE.
  - **The corner PIER** (`DECKS[1]`, x 116–126, z 373–406): juts SOUTH over the
    water toward the skyline; its north root sits on the revetment top/lawn (so
    it connects to walkable land), a lamp at its tip (z 406, just inside the
    clamp). **Restyled 2026-07-10 (owner photos 0395/0399): a pale CONCRETE
    APRON deck** — white bollard posts inset along its long edges + tip, two
    red life rings on white posts, no wooden rails; water beyond its flanks.
  - **Corner park dressing** (`CORNER_PARK`, task 021, per IMG_0396/0398): a
    curving pale concrete PATH sweeps the lawn from (63,392) NE to the pier
    root, a worn dirt DESIRE PATH parallels it on the seaward side, three
    benches sit on the path's inland edge FACING THE WATER, and limestone
    sitting-stone blocks scatter the grass. WHITE PIPE RAILING (posts + two
    thin rails) runs the revetment's top lip in two spans — east of the pier
    (z 347–368) and along the SW tail (z 388–402) — leaving the steps between
    them open for play. On the steps themselves: green GROWTH tufts in the
    block joints (z 342–401) and a rubble RIPRAP toe at the waterline plus the
    pier-slip lip — the cove read from steps-cove-IMG_0394.
- **MAIN trail south section HUGS LAKE SHORE DRIVE (aerial-canonical, 2026-07-07)**:
  per `Downloads/harbor aerial.png`, the real Lakefront Trail on the whole
  Diversey→Belmont stretch runs BESIDE the Drive, not the shore. From the
  AIDS-garden east tangent (112,120) it angles SW across the lawn and runs south
  along the berm (bike centerline x ≈ 20–24; walk ribbon +4 on the park side),
  past the Diversey range's west fence (≥2.8 m clear), ending at the south map
  edge ≈ (30,406) — the future Diversey-Lincoln Park gate now sits beside the
  Drive. The WIDE south lawns + the corner revetment, Chevron and pier lie EAST
  of the trail — people cross the grass to the rocks, as in the aerial.
- **Diversey Driving Range & Mini Golf** (BUILT + PLAYABLE, inland, west of the
  trail): a fenced green range strip **x 28–88, z +242…+283** (fenced W/N/E, open
  at the south tee line) hitting NORTH (−z) downrange under a 12 m perimeter net,
  with distance boards + scattered balls. The **two-tier bay building on the south
  tee edge (x 30–66, z +280…+285.5)** has an ENTERABLE ground tier: a walkable
  hitting deck (`DIVERSEY.bays.deck`, h 0.4, one walk rect, enclosed by
  divider/end-wall colliders — enter from the park/back side into a bay) where the
  "hit a bucket" activity (pack `diversey.js`, chargeThrow) launches balls north,
  arc + bounce + distance-in-yards. The UPPER tier is VISUALLY GATED (decorative
  posed golfers; no stair invites the player up — the old dead stair is gone). A
  **playable 3-hole mini-golf course x 70–88, z +286…+306**: hole 1 dogleg, hole 2
  loop-ramp, hole 3 windmill — each felt fairway a data polygon with wood rails
  DERIVED from the felt edges (they cannot cross), a tee pad + cup + flag; putt via
  chargeThrow with strokes/par (pack `diversey.js`). The windmill TOWER is static
  (structures.js); its BLADES are owned + slowly rotated by the pack (decorative
  gate). Data: `DIVERSEY` (`bays.deck`, `bays.hit`, `mini.holes[].fair/tee/cup`);
  builder `buildDiversey()`; play in `src/packs/diversey.js`.

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

### Anchors (Chicago grid carries over — with ONE deliberate stretch)
- **Addison = z −400** (true latitude — the station, the ride arrival and the
  lakefront's Addison underpass gate all anchor here).
- **Waveland = z −560 (STANDING LIBERTY, 2026-07-09 owner layout rework, task
  009): true latitude is −500, but the cell is STRETCHED ×1.6 north–south
  between Addison and Waveland.** Double-wide game-day streets + a
  big-league stadium bowl + set-back gate plazas cannot fit the true 100 m
  block; the owner's priority is the SPACE. The ride is a scripted
  transition and the cell is reached no other way, so nothing else depends
  on true cell latitude. Everything north of Waveland rides with it.
- E–W: 1 W-address unit = 1 game unit, anchored so the Red Line embankment
  (real ~950 W) is **x −140**: `x = −140 − (Waddr − 950)` (the x frame was
  already a standing liberty).
- **Clark St diagonal**: centerline `x = −290 + 0.28·(z + 400)` (x −290 at
  Addison → x −334.8 at Waveland, the real ~16° cant).
- Cell bounds ~x −400…−100, z −660…−250; clamp x −365…−115, z −615…−310.

### Streets (game-day corridors, DOUBLE-WIDE per owner directive 2026-07-09)
Corridor = road + both sidewalks, walkable curb to curb.

| Street | Centerline | Road | Corridor |
|---|---|---|---|
| Addison | z −400 | 16 m (z −408…−392) | z −414…−386, x −332…−124 |
| Waveland | z −560 | 12 m (z −566…−554) | z −572…−548, x −352…−178 |
| Sheffield | x −190 | 12 m (x −196…−184) | x −202…−178, z −572…−386 |
| Kenmore stub | x −231 | 8 m (x −235…−227) | x −237…−225, z −604…−548 |
| Clark | clarkX(z) | 16 m (±8) | ±14 off clarkX, z −572…−386 |
| **Clark STUB (scenery, task 033)** | clarkX(z) | 16 m (±8) | z −386…−338 past the CPD line — NOT walkable; pavement/centerline/curbs/lamps continue so Clark reads as a real street beyond the closure (detail ends ~z −352, bare asphalt fades to −338) |

| Feature | Position |
|---|---|
| Red Line embankment | x −148…−132 (solid berm, N–S full cell; bridge over Addison z −414…−386) |
| Addison island platform | x −143…−137, z −451…−433, y 7.6; stair (z −433…−417) inside the north mass to the Addison sidewalk (landing z −417…−411). Head-house (task 010, per refs/addison-station/): limestone portal frame proud ~1 m of the abutment around the doorway (jambs OUTSIDE the x −142…−138 walk path, colliders), crowned by the real dark CTA sign band "Addison 3600 N / 940 W" + red Elevator tab + white Cubs-logo square; platform signs use the same dark CTA style |
| Stadium block | Clark/Addison/Waveland/Sheffield; footprint poly in STADIUM_W; faces on Addison z −414 (arc → x −238), Sheffield x −202 (z −440…−528), Waveland z −548 |
| **The SE (Sheffield & Addison) corner is the ANGLED BOWL** (task 020, per refs/wrigleyville/osm.json relation 17379974 outer ring — the real footprint pulls back from the corner on a convex diagonal, NOT a box edge) | the Addison face ends at (−238,−414); the wall then runs a 4-chord convex diagonal (−238,−414)→(−229,−418)→(−220,−423.6)→(−211,−431)→(−202,−440) — the grandstand crown WRAPS this corner (full grandstand treatment: brick band, green columns, pressbox crown, bunting, per the Wildcat-Way ref where the upper deck visibly curves) — and the red-brick Sheffield wall starts at z −440. The triangle it opens is the **SE CORNER COURT**: red-brick apron (APRONS_W.secorner), walkable (4-tri fan from (−202,−414) in WALK_W), holding **GATE D** mid-diagonal (green gate sign, faces the intersection — the real right-field gate; the flat EAST face stays gateless per the 012 owner correction) and a TICKETS board near the Addison end |
| **Sports World corner store** (task 020 owner directive: a souvenir-store corner across Addison at Sheffield; Sports World-style likeness, canvas signage — invented-minor-fill under SS4.4, the real store sits at Clark) | SW corner of Sheffield & Addison, lot x −220…−204, z −384…−371 (fronting the Addison S sidewalk line z −384, east wall lining the closed Sheffield mouth): 2-storey cream/white mass, CHAMFERED NE corner with the door facing the intersection (massing per the real buff-brick corner building in the Addison-and-Sheffield ref), red fascia band SPORTS WORLD on both street faces, red awnings, canvas souvenir banners (CUBS SOUVENIRS · T-SHIRTS · CAPS) |
| **940-W station corner** (task 020: the station-entrance relationship east of Sheffield) | NE corner of Sheffield & Addison, lot x −176…−162, z −430…−415: 3-storey blonde-brick corner block (retail ground floor) with a dark CTA-style wayfinding blade 'CTA · ADDISON →' on its Addison face pointing east to the head-house; the fabric row north of it (FACADES_W sheffield-e) now STOPS at z −432 — task 016's span ran to z −388, standing lots INSIDE the Addison corridor and walling off the view east to the embankment/bridge/head-house |
| Sheffield-mouth backdrop | the Sheffield S mouth (x −202…−178 past the z −385.5 barricade) gets its own BACKDROP_W band (x −202…−178, z −378…−340, facing north) so the closed street reads as continuing city like every other mouth (it was bare ground) |
| **Clark right-of-way RESERVED** (task 033, owner 2026-07-10: "it's clark, legendary... right now it's buildings where the street should continue on") | **No building mass may sit on clarkX(z)±14 beyond EITHER Clark barricade out to the cell edges** — this alignment is the future gate to the next neighborhood. South of the z −385.5 CPD line: the FACADES_W addison-s row now starts at x −268 (was −298; three lots stood in the alignment), BACKDROP_W's S-of-Addison band is SPLIT into west (x −326…−307) + east (x −248…−212) halves flanking the alignment, and the **CLARK STUB** (CLARK_STUB_W) carries visible street south to z −338. North of the z −572.5 line: the west band's east edge pulled to x −358 (was −353, clipping the alignment ≤4 m near z −590). The CPD barricade + officer STAY as the soft wall — closure is event-day truth; the street beyond is scenery |
| **Clark stub streetwall (the task-033 REHOME — owner: "put those buildings somewhere else they'll look good")** | the three displaced Addison-S fabric lots return as TWO new FACADES_W frontages LINING the stub (off ±16 like every Clark frontage, storefronts facing the alignment): **clark-se** (east side, z −374…−346, fronting west) and **clark-sw** (west side, z −370…−344, fronting east, clear of the Cubby Bear lot z ≥ −372). Net fabric is preserved (~35 m removed, ~48 m re-laid); the flanked stub reads as a street the city always had. Teaser reads at the line (017 register): a 4th green blade 'N CLARK ST' at the ROW's east curb (≈ −271, −387) + a small green COMING-SOON placard on the closure centerline (clarkX(−384.6), −384.6) facing the intersection |
| Rooftop corner house | NE corner of Sheffield & Waveland, x −178…−163, z −588…−574: a 4th Waveland rooftop brownstone (ROOFTOPS_W.waveland[3] + rooftops.js BLD) closing the bare backdrop-grade corner; its west end walls the closed Sheffield N mouth |
| Gallagher office corner dressing (task 020; the office is 019's mass) | the office block's WEST (Clark) and NORTH (Waveland) faces get windows/entry/sign-band dressing so the Clark & Waveland SE corner stops reading as a blank cream backdrop; 'GALLAGHER WAY' band at the NW corner |
| **The marquee corner is ROUND** | the Clark & Addison corner is the real art-deco curve: fillet **r 18** about (−266.27, −432), tangent to the Clark wall at (−283.60, −427.15) and the Addison wall at (−266.27, −414); curve apex (−277.09, −417.62). The fillet opens the marquee-corner APRON (triangle Clark-edge/Addison-edge minus the circle) — RED BRICK, the corner entry court |
| Marquee | on the curve apex, proud of the wall: (−277.94, −416.50), facing the Clark & Addison intersection |
| **Bleacher Gate corner is CHAMFERED** | the NE (Sheffield & Waveland) corner is cut 45°: chamfer from (−202, −528) on the Sheffield face to (−222, −548) on the Waveland face; the BLEACHERS gate sits on the chamfer mid (−212, −538) facing the intersection. The triangle it opens is the **CARAY PLAZA apron** — red brick, walkable, statue centered at (−206.5, −543.5) OFF the sidewalk through-lines, gate behind (per refs/wrigley-field/caray-owner-reference.jpg) |
| Gate aprons pave in RED BRICK | marquee crescent, Caray plaza triangle, and a brick pad on Gallagher Way in front of its gate (an axis-aligned rect x −289.9…−282.4, z −496…−484, tucked under the near-vertical wedge wall) — the signature Wrigley ground treatment (APRONS_W) |
| Home plate → center field | (−252,−444) → (−218,−526), HP→CF 88.8 m (grown from 70.8 so the bowl reads big-league); LF wall on Waveland, RF on Sheffield |
| Scoreboard | (−216, −533), top y 26.5 (published 87 ft), atop the CF bleachers directly behind/above the Bleacher Gate (as in the owner ref) |
| **Gates** | Marquee Gate on the rounded-corner apex (Clark & Addison), Gallagher Way Gate on the west-stands BOWL WALL (the wedge's east edge: x = wall line ≈ −282.7 at z −490), **Addison Gate on the south face (x −252, z −414** — moved west from −234 when task 020 shortened the Addison face to x −238; still mid-block, banner rides above it**)**, **GATE D on the SE-corner diagonal (≈ −217.5, −425.5, facing the Sheffield & Addison intersection — task 020, the real right-field corner gate)** — the real main entries face WEST (Clark/Gallagher) and SOUTH (Addison/corner) per owner placement correction 2026-07-09; the NE Bleacher Gate (Sheffield & Waveland chamfer) is real-world faithful and stays. NO gate/door visuals on the flat east (Sheffield) face |
| **Knothole** | screened opening in the WAVELAND (left-field) wall at the ball-hawk corner: **x −234…−228 at z −548**, by the Kenmore axis. OWNER DIRECTIVE 2026-07-09 — the real knothole is on Sheffield (right field); the owner chooses Waveland. Recorded under standing liberties |
| **Gallagher Way plaza is a WEDGE** (owner directive 2026-07-09, task 019; per refs/wrigleyville/osm.json park 1265774541 + the finished-plaza refs) | east of Clark, **z −520…−446**: west edge = the Clark sidewalk line (off +14, the diagonal rushing past), east edge = **the west-stands BOWL WALL, a near-N–S polyline bulging gently west** — `GALLAGHER_W.wall` (−283.6,−520)→(−283.0,−500)→(−282.4,−478)→(−280.6,−458)→(−278.9,−446), i.e. **WIDE at the north (26 m at the office) narrowing south to 10 m at the box-office mass** (real: ~30→10; our 26 follows the Clark-slope liberty). North bound = the Gallagher office block; **south bound CLOSED by the ticket-office/box-office mass** (the stadium poly's notchS face at z −446, x −288.9…−278.9 — full-height red brick, distinct from the grandstand: no green grille/pressbox crown, WRIGLEY FIELD TICKET OFFICE sign). Floor: warm pavers with **dark banding panels** (finished-plaza refs), wedge-shaped lawn z −512…−476 (west of the pad), splash pad ON pavers at (clarkX(−470)+20, −470), Statue Row (z −516.5, xs −293…−305) + video board (z −516, off 35) at the north edge, tree planters along Clark, bistro sets + proper cornhole pair (raised ends facing each other — owner feedback 2026-07-10) on/at the lawn |
| Gallagher office block | the notch's north end, z −546…−520, Clark corridor → the west-stands lot line (off 14…40); its east face is COPLANAR with the stadium's plazaN wall (the off-40 line z −548→−520), so stadium + plaza + office read as ONE lot |
| Murphy's Bleachers | SE corner Sheffield & Waveland (x −178…−162, z −548…−534). Likeness (task 010, per refs/murphys-bleachers/): 2-storey blonde-brick main mass (rooftop deck) + 1-storey red-brick corner ANNEX at the NW quarter carrying the verdigris bronze MURPHY'S sign band + sage-green awnings; changeable-letter marquee board on a pole at the annex SW corner; fenced SIDEWALK BEER GARDEN strip x −178.6…−174, z −539…−534 (decorative, colliders, NOT walkable — no WALK_W change) |
| Engine 78 | 1052 W Waveland → x −250…−234, z −590…−574. Likeness (task 010, per refs/engine-78/ head-on photo): tan/olive-brown brick (NOT red), limestone pilasters/cornice/crown cartouche, one red-framed apparatus bay w/ carved CITY OF CHICAGO FIRE DEPARTMENT lintel, red 2nd-floor awning, red side door, red planters + hydrant + bench on the apron, US + Chicago flags |
| Rooftop brownstones | N of Waveland x −226…−199, z −588…−574 (middle one climbable, roof y 9.6) + E of Sheffield x −178…−164, z −534…−486 |
| Cubby Bear + Clark bar row | Cubby x −316…−300, z −386…−372 (SW corner, opposite the marquee) + bar row west of Clark z −488…−418 (lots at clarkX−22…−10). Likenesses (task 010): Cubby = BLONDE-brick corner block (per refs/cubby-bear/ 2018 photo — not red), black storefront fascia + window neon, maroon corner door, diamond THE CUBBY BEAR logo both faces, dark-green cornice, rooftop billboard truss. Bar row: Sluggers cream w/ yellow-red sign bands (no CC photo — hand-modeled to type); Sports Corner cream 3-storey, vertical blue blade sign, navy awnings, glassy 2nd floor, roof-deck rail (refs/sports-corner/); Casey Moran's white classical, arched 2nd-floor windows, green-gold sign band (sign text CASEY MORAN'S; data name stays CASEY'S for waypoint-id stability; no CC photo); The Dugout dark-brick + black storefront, white hand-lettered band (no CC photo) |
| Sluggers rooftop cage | clarkBars[0] ('SLUGGERS', z −488…−472) is a LOW 2-storey bar (roof y 6.8) whose ROOF is the batting-cage destination (owner note 2026-07-08 → task 009): an exterior stair up the street (east) face → a rooftop deck holding the fast-pitch cage. Anchors + walkability in SLUGGERS_W (rotated-rect quads in the building's LOCAL frame, shared by the engine + walkprobe) |
| **Owner photo-fidelity dressing (task 034**, per refs/wrigleyville/owner-photoset-2026-07-10/ — nine judged `wv-photo-*` waypoints make the owner's nine vantages permanent measurements) | (a) the stadium light towers carry wide WHITE LATTICE BANKS (merged lattice head geometry on the existing 8 masts — the photos' street-visible skyline signature; bare masts never read); (b) the Addison bridge UNDERSIDE is dressed steel (stringers + flat X-bracing under the deck, braced column bents at both curb lines z −408/−392 with colliders, grime streaks on the abutment faces) per the under-redline photo; (c) a rooftop AD BILLBOARD (house-style NO CURVEBALLS baseball ad) rides the SE Clark/Addison corner fabric lot roof (~−263.5, −380.5, greystone lot, h 13) angled at the intersection — with Cubby's board the two bracket the corner like the real pair; (d) a round LUCKY STRIKE disc blade (the real bowling anchor of the Addison & Clark block) projects from the whitegrill addison-s lot at ~x −231.5 over the south sidewalk — the arrival-walk register |

### Walkability (game-day street closure = the clamp, diegetically)
Walkable = corridor quads only (WALK_W in wrigleyville.js — the single
definition, shared verbatim by main.js and walkprobe): Addison (station→Clark),
Waveland (Sheffield→Clark + Kenmore stub), Sheffield (Addison→Waveland), Clark
(Addison→Waveland), the Gallagher Way WEDGE (z −520…−446, Clark curb off +14 to
the bowl wall `gallagherWallX(z)` — walkable curb to bowl), the marquee-corner apron
(the crescent the rounded corner opens at Clark & Addison), the Caray plaza
apron (the triangle the chamfered Bleacher-Gate corner opens at Sheffield &
Waveland), the SE CORNER COURT (the 4-tri fan the angled bowl corner opens at
Sheffield & Addison — task 020), the station platform + stair, one climbable Waveland rooftop + its
outdoor stair, and the Sluggers rooftop cage (exterior stair + deck,
SLUGGERS_W). Every corridor mouth ends at a **CPD blue wooden barricade**
(BARRICADES_W) with an officer NPC; streets visually continue into a low-rise
Lakeview backdrop band (BACKDROP_W).

### Standing liberties (deliberate, keep)
- The cell sits ~x −140 rather than the true ~x −800 (1.6 km inland) — the L
  ride is a scripted transition, not literal track distance.
- **The cell-local z frame is STRETCHED ×1.6 between Addison (z −400, true)
  and Waveland (z −560, true −500)** — owner layout rework 2026-07-09 (task
  009): the space for double-wide streets, the big-league bowl and the gate
  plazas outranks true block depth. Addison keeps its true latitude; never
  validate anything north of Addison in this cell against true latitude.
- Stadium at a GENEROUS footprint (HP→CF 88.8 m ≈ 0.73:1 of the real 122 m —
  deliberately larger than the 1:2 land scale so the bowl reads big-league
  from the street; owner rework 2026-07-09) with TRUE 1:1 verticals:
  facade 16.5, rim ~23, towers ~29, scoreboard base 18.3 / top 26.5 — the
  published 60 ft / 87 ft. The NE bleacher crown stays ~8.1 on purpose: any
  higher blinds the Waveland rooftop views (the 2015-videoboard effect).
- **Classic postcard Wrigley: no 2015+ video boards**, so the rooftop views
  work. Hand-turned scoreboard only.
- **The knothole is on WAVELAND (left field), not Sheffield (right field)** —
  owner directive 2026-07-09 (task 012). Refs place the real knothole on
  Sheffield; the owner chooses the Waveland ball-hawk corner. Deliberate.
- **Clark's cant is 0.28 dx/dz; the REAL diagonal is ~0.61** (task 033, verified
  against refs/wrigleyville/osm.json ways 435370995/486869977: south of Addison
  real Clark runs (−290,−398.7)→(−266.1,−358.8)→(−240.2,−316.6), no bend at
  Addison). The shipped 0.28 slope is the cell's standing cant; the task-033
  Clark stub CONTINUES clarkX(z) at 0.28 so the street reads unbroken at the
  barricade. When the next neighborhood cell is planned, its connector
  recalibrates to the true diagonal at the cell seam exactly like the
  displaced x-frame — never validate the stub against true OSM bearing.
- **Statue Row stays gathered on Gallagher Way** (Banks/Williams/Santo/Jenkins
  fronting the office block) — this is the real modern (2021+) arrangement;
  the 006 reviewer's suggestion to scatter them to their historic corners was
  considered and declined (task 012). Caray stays at the Bleacher Gate, which
  both arrangements agree on.
- **Scoreboard back-face dressing** (clock + compact line-score + WRIGLEY
  FIELD lettering, task 012): the real board's back is plain green with ad
  boards; ours is dressed so the score reads from the Waveland rooftops —
  legibility liberty, echoing the real back-side ad panels.
- **Clark bar-row TENANCY vs the owner photoset (2026-07-10, task 034)**: the
  real NW Clark & Addison corner is Hotel Zachary / Swift & Sons, and the real
  Sports Corner + The Dugout sit at Sheffield & Addison / beside the Red Line;
  the game keeps them gathered on the Clark bar row (006/010 sign-off — the
  evocation panel recognized the row instantly). `wv-photo-swift-and-sons` and
  `wv-photo-arrival` judge the corner-ANCHOR read, never the tenancy.
- Perpetual game day (crowd inside, barricades out, bars loud). The lakefront's
  Wrigley-glow backdrop gag stays for the lakefront; it hides while the
  Wrigleyville cell is active (Wave-3 wiring).

## MILLENNIUM_GEOGRAPHY — neighborhood three (the Millennium Park cell)

**A separate CELL** (src/cells.js pattern), reached by riding the Red Line SOUTH
from Addison — downtown genuinely lies south of the lakefront map, so the cell
sits at positive z. Data: `src/data/millennium.js`; builders: `src/millennium/*`
(task 041+). Compass is TRUE: north up, lake east (the lake itself is beyond
Grant Park, out of frame east).

### Frame (PARK-LOCAL, displaced on BOTH axes — the Wrigleyville precedent)
- Calibration (refs/millennium-park/osm.json provenance, task 039): South
  Michigan Ave ∩ East Monroe St → game **(x 40, z 900)**; applied offset
  dx −468.8, dz −2369.6. The TRUE lakefront projection of that corner is
  (508.8, 3269.6) — **never validate this cell against the true projection**
  (PITFALLS.md, AUTOPILOT.md §4.4); the osm.json lakefront-anchor asserts
  validate only the projection math.
- Measured street landings (osm.json medians, park-local frame):

| Street line | In-game | Note |
|---|---|---|
| Michigan Ave (W frame) | **x 40** centerline | straightened (real curves to ~48 north of Washington — liberty) |
| Columbus Dr (mid/E) | **x 195** centerline | one grade (real Upper/Lower stack — liberty); BP bridge crests OVER it |
| Randolph St (N frame) | **z 698** centerline | one grade (real Upper/Lower east of Michigan — liberty) |
| Washington St axis | **z 766** | no vehicles in the park — a promenade break-line in the paving |
| Madison St axis | **z 831** | ditto |
| Monroe St (S frame) | **z 901** centerline | calibrated exactly |

- **Randolph→Monroe = 203 game units** (measured ≈406 m real — Loop blocks run
  tighter than the standard grid; the planner's 251 estimate was corrected by
  the 039 scout). Michigan→Columbus ≈ **155 units**. Blocks: Randolph→Washington
  68, Washington→Madison 65, Madison→Monroe 70.
- **Cell region (FINALIZED from the queue-040 suggestion x 40..200, z 640..920):
  geometry bounds ≈ x 6…238, z 680…938 (incl. backdrop bands); player clamp
  x 44…208, z 700…900.** The north edge moved 640 → 680: the lakefront's GLOBAL
  skyline billboard (sky.js, scene-level — it never hides on cell swap, and its
  instanced bands draw in every view) reaches world z 676.8 at x 181–209 after
  its 2.2× scale (computed from its deterministic mulberry32(0x5c1000) layout).
  Nothing of this cell may sit at z < 680 or it interpenetrates the billboard.
  Disjoint from the Wrigleyville clamp (x −365…−115, z −615…−310), the
  redline-car pocket (−250, −650) and WORLD_CLAMP (zMax 408); millennium is the
  only place with z > 500, so a `player.z > 500` dev-spawn check activates it
  unambiguously (wrigleyville.js's `player.x < -100` check can never match a
  millennium spawn — all cell x are positive).

### Streets & edges (scenery streets behind park fence — the quiet register)
Roads are SCENERY (planters + low park fence, no CPD theatrics downtown);
walkable ground is the park network + its frame sidewalks (WALK_M).

| Street | Road (scenery) | Walkable sidewalk |
|---|---|---|
| Michigan | x 32…48, z 684…935 | **the spine**: x 48…57, z 705…894 (park side) |
| Randolph | z 692…704, x 32…216 | z 705…713, x 48…189 (south side) |
| Monroe | z 894…908, x 32…216 | z 886…894, x 48…189 (north side) |
| Columbus | x 190…200, z 692…908 | west side x 181…189, z 713…788 + z 818…886 (split where the BP deck flies over — its approach/deck zone z ~788…818 is the elevator-guard buffer, PITFALLS) |

Park fence + planter lines (BARRIER_M): x 48 along Michigan (gap only at the
arrival kiosk z 795–805), z 705 along Randolph, z 894 along Monroe, x 189 along
Columbus (gap under the bridge z 792–814).

### Arrival (Red Line = the State St SUBWAY — recorded standing liberty)
The real Monroe/State Red Line is a block WEST of Michigan; the State→Michigan
block is **compressed to zero** (exactly the register of the Wrigleyville
x-frame liberty): a **CTA subway stair kiosk stands ON the Michigan Ave
sidewalk at x 48…52.5, z 796…804.5** (KIOSK_M), stairs down into a tiled
landing — the 042 boarding point (dead-ends politely until then, task-030 owner
rule). Downtown Red Line is a subway, so the ride arrives through DARKNESS into
a tiled stair — deliberately the opposite flavor of Wrigleyville's elevated
arrival. Dev spawn SPAWN_M = (55, 800), on the sidewalk beside the kiosk.

### Anchors (osm-cited; game rects in millennium.js)
| Feature | Position | Note |
|---|---|---|
| **Wrigley Square peristyle (NW)** | plinth 61–73 × 721–727, open side SE | paired Doric columns + fountain basin; lawn SE of it (58–90 × 730–750); low inscribed WRIGLEY SQUARE wall at (78, 749); plaza walk 57–96 × 713–752 |
| **McCormick Tribune Plaza (cafe)** | 57–76 × 772–826, **sunken y −1.6** | THE summer cafe (perpetual summer: no ice rink, ever) — umbrella grid + cream bar-tent; **view-only** (decorative, NOT walkable — seen from the Bean plaza's white balustrade overlook rail at x 76) |
| **Cloud Gate / AT&T Plaza** | bean footprint 83.1–90.5 × 792.8–802.6, h 10, long axis N–S | toon HOMAGE w/ painted reflection (copyright register); plaza walk 76–98 × 776–826, **continuous UNDER the arch** (legs at the z ends are the only colliders) |
| **Crown Fountain (SW)** | pool 66–73.5 × 847–881; towers 68–71.5 × 850–853 and 68.5–72 × 875.5–878.5, h 15.2 | walkable WET plaza (walk 57–86 × 838–886, y 0, wet film is visual); glass-block LED-face towers = colliders; homage register |
| **Pritzker Pavilion (NE)** | stage 123–170 × 747–758, mouth faces SOUTH | ribbon-petal crown homage; Harris Theater flybox adjoins north (129–163 × 715–747); speaker towers flank (118, 752) / (175, 752) |
| **Seating bowl + Great Lawn** | bowl 118–186 × 758–788 (red seat field, walkable); lawn 118–186 × 788–846 | **trellis** pipe-arc dome over the lawn on perimeter columns, 120–166 × 792–844 (east edge stops at the BP approach) |
| **Lurie Garden (SE)** | 124–179 × 842–892 | shoulder hedge N 128–170 × 846–851 + W 124–129 × 846–876 (4.5 h, dark-steel armature lips proud); NE entry gap x 170–179; **the Seam boardwalk** = the only interior walk, diagonal (175, 849.5) → (144, 874), halfW 2.5, over the rill (cites osm rill 159.2, 859.5; boardwalk 159.1, 852.6); light plate (153.6, 852.5) NW / dark plate (167.7, 870.7) SE, both planting (not walkable); south rim walk 130–182 × 878–886 |
| **BP bridge (E)** | walkable deck: ramp x 168→186 (z 792–800, y 0→3.8) → seg (186,796)→(196,804) y→5 → crest seg (196,804)→(205,810) y 5 OVER Columbus; scenery run continues (205,810)→(242,833) descending beyond the clamp toward Maggie Daley (dead-ends politely — 046 decides treatment) | stainless shingle parapets, wood deck (homage); osm way 25026666 launches (172.6, 787.9)→(242.1, 834.9) — game launch sits ~6 south (z 792+) to buffer the bowl/lawn seam. **Ramp-only access: the deck's flanks are enclosed by non-walkable buffer (z 788–818 at x 168+), never adjacent to y-0 walks** (PITFALLS elevator rule) |
| **Chase Promenade** | allee walk 96–120 × 713–886 (full Randolph→Monroe, three blocks) | tree rows x 100 / 116; paired curved inscribed plinths at z 716 + 883; Boeing galleries (81, 724) / (81, 884) |
| **Exelon pavilions** | black glass cubes (125, 718) NW · (168, 720) NE · (125, 882) SW · (170, 882) SE | osm S pair (129, 888) / (170, 891) pulled ~6 north off the Monroe walk |
| **Michigan streetwall — "the cliff"** | band x 6–30 (faces at x 30), z 684–935 | osm-cited anchors: Cultural Center z 760 (colonnade, PUBLIC LIBRARY cornice), Six N Michigan 824, CAA 836 (gothic tracery), Willoughby 846, Gage 861 (Sullivan), University Club 896 (gothic tower), Monroe Bldg 919 (gable); 1:1 verticals (10–25 storeys ≈ 35–80) |
| **Randolph giants band** | z 680–692, x 44–214: One Pru x 79 (white sign slab, h ~130) → Two Pru x 102 (diamond spire ~165) → Aon x 172 (white fins ~200) → Blue Cross x ~206 (~95) | E–W ORDER preserved; z pulled south from osm centers (657/647/640/670) to clear the billboard — see liberties |
| **South backdrop** | z 914–938: Art Institute mass x 123; Stock Exchange Arch cameo x 175 | beyond the Monroe scenery road |
| **East backdrop** | x 214–238, z 700–908 | lower Loop band across Columbus |
| Millennium Station flavor | sidewalk grate (72, 709) on the Randolph walk | warm air + rumble every few minutes (delight seed; station itself is subsurface, osm 71.7, 687.5) |
| McDonald's Cycle Center | (176, 722), NE pocket | glassy bike depot, scenery |
| Nichols Bridgeway | scenery ribbon (122, 846, y 1.5) → (112, 930, y 13) | Renzo Piano white curve leaving the frame over Monroe (liberty: launch pulled east of the promenade into the x 120–128 pocket); sells the S edge |
| Food trucks | Monroe curb z 897, xs 72/84/96/108 (osm 84, 902) | perpetual-summer street-food row, read over the fence |

### Walkability (WALK_M in millennium.js — THE single definition, engine + walkprobe)
Ordered quads, elevated first: the three BP-deck quads (ramp/seg/seg), then the
y-0 network — Michigan spine, Randolph/Monroe sidewalks, split Columbus rim
walks, Wrigley Square plaza, Chase Promenade, Washington (57–96 × 758–770) +
Madison (57–96 × 826–838) cross walks, Bean plaza, Crown wet plaza, the
bowl (118–186 × 758–788), the lawn carved around the BP approach (lawnW
118–168 × 788–846, lawnSE 168–186 × 812–846), Lurie NE gate (170–179 ×
843–852) + Seam boardwalk + SW link (138–149 × 870–880) + south rim. The
McCormick cafe, all planting plates, hedges, backstage pockets and every road
stay non-walkable; buildings standing on walks (Exelon cubes, Crown towers,
kiosk) are builder colliders, exactly like Wrigleyville statues.

### Standing liberties (deliberate, keep)
- **PARK-LOCAL displaced frame on BOTH axes** (dx −468.8, dz −2369.6, recorded
  in osm.json provenance): the ride is a scripted transition. True projection
  z ≈ +3200 is never a validation target.
- **State→Michigan block compressed to zero**: the Red Line subway kiosk stands
  at the park's Michigan Ave edge (the Wrigleyville x-frame register).
- **Perpetual summer dusk staging**: McCormick plaza is THE CAFE — no ice rink,
  ever. Fog 0xf6ab84 register, first window-lights on.
- **Homage register for the copyrighted artworks** (Cloud Gate, Crown Fountain,
  the Gehry works): chunky toon caricature, invented detail, painted (never
  computed) reflections, no traced geometry, no photo textures (039 brief,
  LOCATIONS.md owner rule).
- **TRUE compass kept**: north up, lakeward east; downtown south of the
  lakefront map — matching real geography, unlike no cell before it.
- **Nothing at z < 680** (billboard clearance, computed max 676.8): the
  Randolph giants stand as a flat backdrop slab band z 680–692 fronting the
  road, pulled south from their osm footprint centers; E–W order preserved.
  The global billboard boxes beyond read as "more Loop" through the gaps —
  acceptable; their arrangement is never judged from this cell.
- **Giants' verticals at the skyline-billboard register (~0.55–0.6×), not 1:1**
  (billboard Willis = 242 for the real 442 m): two adjacent tower fields must
  share one scale logic. The in-park cliff stays 1:1 (35–80 m).
- **One grade per street** (real Randolph-east and Columbus are Upper/Lower
  stacks over the garages/rail); the BP bridge still crests over Columbus.
- **Michigan Ave straightened to x 40** (real centerline drifts to ~48 north of
  Washington).
- **View-only sunken cafe**: McCormick terrace is decorative (Murphy's
  beer-garden register) — the overlook balustrade is the read, not the seating.
- Editorial compression: bowl/lawn spans trimmed to drop redundant panels
  (§5.4 — topological ORDER preserved everywhere: peristyle NW → cafe/bean →
  Crown SW → Lurie SE behind its hedge → bridge snaking E from the lawn's SE).
- BP launch pulled ~6 units south of the osm way start; Exelon south pair
  pulled ~6 north off the Monroe walk; Stock Exchange Arch sits in the south
  backdrop band (osm 175, 908 is inside the Monroe roadway).
