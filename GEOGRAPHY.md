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
   The L track/gag moves BEHIND it (x ≈ −8, backdrop only).
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
- **Bill Jarvis Migratory Bird Sanctuary** (real 7.84 ac): fenced woodland on the
  lakefront strip **x 100–200, z −420…−357** (100 × 63 m), south of the golf
  (fence z −440) and north of the harbor, dense understory, one gate on the WEST
  fence by the trail. Bird-bingo pen and plover pen relocate inside/adjacent.
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
- **East peninsula x 160–200, z −330…−25**: treed, walkable via a small bridge/spit
  at its north root (z −325). The trail SPUR is its access route: it leaves MAIN at
  the basin north shore, skirts north of the dog-beach cove, and runs out the
  peninsula to the pier.
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
- **MAIN trail south section HUGS the shoreline**: from the AIDS-garden circle it
  bows EAST and runs ~8–12 m inland of the revetment top around the Belmont point,
  continues around the CORNER (passing ~8 m NE of the Chevron), and ends at the
  SW terminus / south map edge (≈ x55, z395 — future Diversey-Lincoln Park gate).
  Bike centerline x ≈ 137 on the east-facing stretch; walk ribbon +4 to the lake
  side. Not the old straight inland run at x ≈ 105.
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
