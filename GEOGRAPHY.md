# GEOGRAPHY.md — the real Belmont Harbor, at explorer scale

**This file is the canonical layout.** Every builder and pack takes its coordinates
from here. When the map grows (Diversey south, Montrose north, inland neighborhoods),
extend this document first.

**Display names (task 094):** real commercial marks never appear as player-visible
text — branded signs/toasts/lines use the pun ledger in **RENAMES.md** (Wiggly
Field, Dibsy, Olde Stylo, Lallapawlooza…). Geographic/street/park names, honorary
ways, person names, and the Ko-fi rail keep their real names. This file keeps
using real names for geography truth; builders translate via RENAMES.md.

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
| Wilson Ave (4600 N) | +1.75 mi | **−973** (Montrose beach/dunes latitude; pre-084 −1409) |
| Montrose Ave (4400 N) | +1.5 mi | **−771** (Montrose underpass gate; osm West Montrose Ave z −1208 at raw 1:2 — the 084 compression pulls the whole Montrose block +436) |
| Irving Park Rd (4000 N) | +1 mi | **−600** (pre-084 −800; the golf vignette ends at −580 and Irving rides just north of it) |
| Waveland Ave (3700 N) | +0.625 mi | **−500** |
| Addison St (3600 N) | +0.5 mi | **−400** |
| Roscoe St (3400 N) | +0.25 mi | **−200** |
| Belmont Ave (3200 N) | 0 | **0** |
| Briar Pl (~3100 N) | −0.125 mi | **+100** |
| Diversey/Fullerton point (~2800 N) | −0.2 mi | **+340…+403** (the corner wrap) |
| South map edge (~2750 N) | | **+415** |

Map bounds: **x −10…245, z −1084…+415** (≈ 255 × 1,499 m) as of the 084
compression (v0.7). Player clamp a few m inside (WORLD_CLAMP.zMin = −1084,
zMax = 408). Minimap aspect follows (MAP.z0 = −1124, MAP.h = 1549 — the
compression reshapes the HUD minimap; a [baseline-regen] task, like the v0.6
growth was).

## THE 084 COMPRESSION (owner-granted liberty, 2026-07-16 — v0.7)

Owner playtest, verbatim: *"It's way way too far away from the beaches south of
it, make the golf course that separates them way smaller. … Way too much blank
space, bring the shoreline in, fine if the whole map curves or whatever."* The
1:2 rule was always a means to "feels like being there"; north of Addison it
produced a ~640 m blank walk. This section is the law for the compressed frame
(the 009 Wrigleyville ×1.6 stretch is the precedent for documented liberties):

1. **Golf vignette.** Marovitz compresses from z −440…−790 to **z −440…−580**
   (140 m — evocation over acreage). Same fence x 60–205, same starter kiosk,
   the Waveland fieldhouse unchanged at (186,−478); 6 pins (1–3 playable near
   the south entrance, 4–6 dressing) + 6 bunkers (count FROZEN — the bunker
   loop is structures.js's only shared-rng draw) inside the new fence.
2. **The BAY (shoreline-in), z −580…−655.** The blank golf-to-Montrose lawn is
   replaced by a curved cove: the shore sweeps WEST from the golf revetment end
   (~x 232, z −580) to a waist at **~x 198, z −625**, then back out to meet the
   Montrose harbor-mouth lawn (~x 231, z −655). The Lakefront Trail bends with
   it (bay routing, then the harbor promenade); revetment terraces wrap the
   cove (TIER_DEFAULT); bay planting + benches face the water. Data:
   `COAST_BAY_PTS` (chicago.js). Across the cove the hook mole + entrance
   light read to the NE — the visual handshake between golf and harbor.
3. **Montrose block: RIGID +436 z-shift.** Every Montrose feature (harbor,
   hook, Point/Magic Hedge, beach, dunes, Cricket Hill, underpass, trail
   alignment from the harbor north) keeps its internal geometry EXACTLY and
   slides south by **Δz = +436**: old game z − new game z = −436. Anchors:
   harbor-mouth lawn end −1091→**−655**, basin −1113…−1288→**−677…−852**,
   Point apex (243,−1330)→**(243,−894)**, beach −1365…−1500→**−929…−1064**,
   Cricket Hill cz −1315→**−879**, Montrose underpass −1207→**−771**, north
   edge −1516→**−1080** (clamp −1084). `montroseFx` is PHASE-SHIFTED by the
   same Δ (`z−436` inside the sines) so the shore meander translates rigidly
   and every hand-matched junction value survives.
4. **Determinism containment.** The world-rng stream is preserved bit-for-bit
   via ghosts: the OLD golf coast (`COAST_GOLF_GHOST_PARAMS`, z −400…−800)
   stays in `COAST_SEGS[2]` as rng ballast (slab loop consumes, never pushes;
   foam draws a fixed old-count phase ballast), the OLD `TRAIL_MAIN` polyline
   ghosts its dual-ribbon samples into `pathSamples`
   (`TRAIL_MAIN_GHOST084`), and the tuft/grass-patch accept tests sample a
   frozen `LAND_GHOST084` with a post-filter against the real LAND (zero-scale
   / skip — draws already consumed). New coast (golf re-cut + bay) renders via
   the local-xorshift fold like every Montrose piece. Trees are untouched by
   proof: pip is an x-ray at constant z and no polygon edge at z > −440 moved.
5. **Frame note for the sections below.** The Montrose sections (069–075
   close-outs) are kept in their as-built prose: **all game-z coordinates
   quoted there are in the PRE-084 frame — add +436 for the shipped map.**
   osm z references remain raw 1:2 truth. New work cites the NEW frame.

The walk is the acceptance (measured): spawn→Montrose-beach trail arc was
**1,736 m** pre-084 (~6.9 min at the 4.2 m/s walk); compressed it is
**1,300 m** by arc, **1,405 m / 334 s ≈ 5.6 min actually walked** by the
input-driving bot (zero stalls) — and the golf/blank separation itself
(sanctuary fence → harbor mouth) fell from **651 m to 215 m (3×)**. The
removed distance is almost entirely the blank golf/lawn stretch.

### 088 shoreline-truth amendments (owner playtest 2026-07-17, issue 030)

1. **The beach WATERLINE law.** `MONTROSE_BEACH.slope.ref` must sit EAST of the
   LAND edge (`montroseFx` peaks at x 237.5): with ref 227 the sand dipped
   below y0 from x≈227.5 while the y0 LAND lawn ran to the coast line, so a
   lawn-green strip capped the beach at the exact waterline (the 041
   grade-carpet class). Shipped: ref 237.6, span 5, bounds x1 242.5 — dry sand
   to the land edge, a short wet band, underwater by x≈242. Any future coast
   move re-checks `sand ~grade at the LAND edge` (walkprobe 072 block).
2. **Trail INLAND of the beach house.** `TRAIL_MONTROSE`'s tail no longer
   crosses the sand: bike stays x ≤ 188 (walk ribbon +4 east clears
   `BEACH_HOUSE.footRect` x0 194 by ~0.8 m) and the trail runs to the north
   cap (~z −1058) instead of dead-ending mid-beach — matching the real
   alignment (trail landward of the beach house; sand touches only beach
   things). Determinism: the pre-088 line ghosts its dual samples into
   `pathSamples2` (`TRAIL_MONTROSE_GHOST088`, the 084 TRAIL_MAIN law); the
   real ribbons sample into `pathSamplesMain`.
3. **Beach life keeps off pavements.** Montrose towels reject any spot within
   w/2+1.3 m of a REAL ribbon centerline (`ribbonLanes`); city-wide,
   `tools/prop-clearance.mjs` (run by walkprobe) asserts no tree/blocking prop
   base on any ribbon, and `tools/path-layers.mjs` asserts the path/decal
   y-ladder (`TRAIL_STYLE`: bike .050 < spur .056 < dash .062 < loop .068 <
   walk .074) — both permanent gates.

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
   Belmont z +105, Addison z −400, Irving Park z −800, **Montrose z −1207**: short
   tunnels through the berm, fenced dead-end doors for now (the "FUTURE ENTRANCE →"
   gag signs were removed in task 030 per owner feedback — the portals stay, the
   signs are gone). The berm, road, L-track backdrop and Lakeview band all run the
   full new map length (z −1520…+418).
   The Belmont stop moved from z 0 to z +105 to sit on the AIDS-garden/Keith-Haring
   axis; a short paved connector links its mouth (~x 14, z 105) east to the loop.
2. **x 14–~85 — inner parkland**: lawns, meadows, tree groves, the inner branch of
   the Lakefront Trail.
3. **East of that, by section (see below): harbor, golf, garden — then open lake.**

## Sections, north → south

### Montrose, z −655…−1084 as shipped (v0.7) — prose below in the PRE-084 frame (z −800…−1520; add +436)

The map's first contiguous growth since v0.5. Everything here sits NORTH of the
Marovitz golf (which ends at z −800 / Irving Park). Coordinates cite
`refs/montrose/osm.json` (fetched at 1:2, z anchored to Belmont; see the z table
above — West Montrose Ave osm z −1208 lands on the game's Montrose line −1207).
**069 ships this as a walkable SHELL** — the whole stretch is lawn/meadow + a
plain stepped-revetment shore + the trail + backdrop; the named features below
are STUBBED as interim revetment and carved in by 070–073.

**Relative arrangement (the law — §the aerial, do not reorder).** North from the
golf: open Montrose lawn → **Montrose Harbor basin** (a big south-opening basin cut
into the land, z −1090…−1300, west of the shore; west-shore docks/launch + **Park
Bait** shop) with **Cricket Hill** inland-WEST of it (the map's first walkable
hill, an analytic mound, ≈ z −1315) → **Montrose Point** jutting NE with **the
Magic Hedge** (the Montrose Point Bird Sanctuary hedgerow + meadow + sanctuary
paths, osm z −1200…−1345) ON it and the curling **HOOK pier** off its tip →
**Montrose Beach** running north (z −1300…−1500) with the **DUNES** natural area
pinched between the beach and the Point at the beach's SE, a **beach house** + **The
Dock** bar. Mouth at the harbor's SOUTH; hill WEST of the harbor; Point NE; hook
off the Point; beach north-running; dunes between beach and Point. **070** builds
the harbor + hook + Park Bait (SHIPPED), **071** the Magic Hedge hero (SHIPPED —
piece flipped, sanctuary built per the coords below), **072** the beach + dunes +
beach house + The Dock (SHIPPED), **073** Cricket Hill (SHIPPED; 074 delight +
075 polish also shipped — everything built, the 076 sign-off remains).

#### Montrose Harbor + the HOOK (070) — canonical game coords

Chicago's big north harbor, laid as a **bigger sibling of Belmont Harbor**: the same
basin + peninsula + terraced-tip + south-mouth topology (chicago.js `BASIN_W` /
`peninsulaWestLine` / `COAST_TIP` / `COAST_MOUTH`), just with Montrose coords and a
**stone breakwater** where Belmont has a grassy spit. It replaces the 069
`COAST_MTR_HARBOR` stub (z −1091…−1300). East–west distance is COMPRESSED to fit
`xMax` 244 (the standing liberty); the topological arrangement is the law, not raw
osm x (osm harbor water spans x −230…75, breakwater to osm x 243 — squeezed here).

- **BASIN** (a south-opening inlet carved into the land; water y −2.3 via `WATER_N`):
  - **West seawall / promenade** (`MT_BASIN_W`, bulkhead) x ≈ 186, z −1113…−1286 —
    the mainland harbor edge; finger docks + the launch root here.
  - **North seawall** (`MT_BASIN_N`) z ≈ −1288, x 186→216.
  - **Mouth**: the SOUTH opening (z ≈ −1120), between the basin SW jamb (186,−1113)
    and the hook tip (~231,−1118); the mouth-entrance shore (`MTR_HARBOR_MOUTH`,
    terraced) sweeps NW from the LAWN end (~234,−1091) to the SW jamb.
  - Basin water region ≈ x 186…218, z −1120…−1288 (mooring field + slips).
- **THE HOOK** (the signature silhouette — a long stone breakwater/fishing pier,
  the east barrier of the basin, WALKABLE end to end): a peninsula-pattern **mole**
  (part of LAND, flat stone-paved top) rooted at the NORTH (basin-N z −1287 and the
  Point-bound shore z −1300), reaching SOUTH with a hooked, curling TIP:
  - Mole basin (inner/west) face `MT_MOLE_W` seawall x ≈ 219, z −1287→−1142.
  - **Hook TIP** `MTR_HOOK_TIP` — a terraced horseshoe curl at the south tip
    (COAST_TIP precedent), x 220→237 around z −1118, the tip apex carrying the
    **harbor entrance light** (`MT_HARBOR_LIGHT` ≈ 236,−1128, white tower / red cap /
    warm bulb, the Belmont-mouth-light register).
  - Mole lake (outer/east) terraced face `COAST_MTR_HARBOR` (the swapped 070 piece)
    x ≈ 237, z −1150→−1300, stepping down to the open lake (riprap toe = the folded
    pile/face/wet-band + revetment steps). Rail run along the inner walk edge
    (structures.js `fenceRun`, through the shared POSTS/RAILS buckets).
  - mt-hook stands **mid-mole** (~z −1215) looking SOUTH down the pier toward the
    curling tip + light + open lake past the mouth (down-the-length axis camera).
- **WEST SHORE**: finger docks (`MT_FINGER_DOCKS`, x0 186, reaching east into the
  basin — REUSE the Belmont dock deck/post + boat vocabulary, zero new InstancedMesh
  buckets), the public boat **LAUNCH** ramp (a wide slab sloping into the water,
  ~x186 z −1250), and **Park Bait** (`PARK_BAIT`, the real bait/tackle shop — small,
  signed, on the mainland ~176,−1180, facing the basin). **Mooring cans + rows +
  star docks** mid-basin (moorings.js Montrose field, the existing hull/mast/can
  buckets grown; LOCAL seed).
- **Trail**: `TRAIL_MONTROSE` re-routes locally WEST of the basin (x ≈ 168–182) so
  the harbor promenade never crosses basin water; determinism-safe (`pathSamples2`).
- **Determinism**: all scatter (tufts/trees/grass) caps at z ≥ −800, so the LAND
  carve here is scatter-free (069 proved it, 0.34% spawn). Mole terraces fold via
  the LOCAL xorshift; moorings/docks/launch/bait use LOCAL seeds; no shared rng.

#### Montrose Point + the Magic Hedge (071) — canonical game coords (SHIPPED)

The sanctuary peninsula NE of the harbor (osm way 23946659: real z −1200…−1345,
east tip x 229.8 osm ≈ 623 game-x east of LSD — `osm.json` provenance.scout067).
Two recorded compressions place it in-game: the east reach squeezes ~2.8× (the
standing liberty), and the sanctuary band slides NORTH to sit beyond the hook
mole (game z −1296…−1362) instead of beside the basin — side-by-side will not
fit inside xMax 244; the ORDER survives (harbor, then the Point NE of it, dunes
+ beach north of that). Data: chicago.js `COAST_MTR_POINT_PTS` +
`MONTROSE_POINT` — CONSUMED as of 071 (piece flipped in coast.js +
walkprobe.mjs in one commit; sanctuary built from the const; never fork the two).
Note the apex terraces: TIER_DEFAULT's ~12 m apron reaches past WORLD_CLAMP.xMax
into the lake at the tip (players clamp at x244 on the upper steps) — recorded
071 liberty; the real Point IS stepped limestone into the water.

- **COAST piece** (the piece-swap slot idx 2, z −1300…−1362): starts at the mole
  lake-face end (236,−1300), bulges EAST to the tip apex **(243,−1330)** — the
  map's eastmost land, 1 m inside WORLD_CLAMP.xMax 244 — and returns to
  (234.9,−1362) to meet the beach stub (montroseFx(−1365) = 234.92).
  TIER_DEFAULT terraces face the open lake; own piece OUT of COAST_SEGS
  (COAST_TIP precedent), folded via the LOCAL xorshift like its neighbors.
- **SANCTUARY wedge** east of the trail (the trail crosses x 180→199 over
  z −1312…−1360): meadow region x 188…241, z −1358…−1296 — prairie-grass carpet
  + goldenrod/wildflower drifts (LOCAL seed), clipped to LAND and ≥2 m clear of
  every ribbon (the trail cuts the region's NW corner).
- **THE HEDGE**: polyline (194,−1326)→(206,−1329)→(220,−1332)→(231,−1336) — a
  ~38 m green wall, h ≈ 2.6 — with birder GAPS at (207,−1329) + (222,−1332.5);
  birders/scopes cluster on the gaps' SOUTH (path) side. Built from existing
  instanced shrub/tuft buckets + merged statics (zero new InstancedMesh buckets).
- **Timber GATEWAY** (191,−1318) just east of the trail's walk ribbon (~x 187) —
  the scout likeness: two posts + header beam, MONTROSE POINT BIRD SANCTUARY in
  chunky YELLOW routed letters, split-rail flanks, dark rules board. The name
  panel is SEPARATE: the cream 'The Magic Hedge — A migrant magnet' interpretive
  panel at (200,−1320.5) beside the entrance path.
- **PATHS** (both NEW crushed-limestone ribbons via pathSamples2): the entrance
  path gate → along the hedge's south flank → around its east end (232,−1338);
  the tip loop (232,−1338) → the tip clearing (scope spot (238.1,−1336.4) on
  the 071 bulge, EAST of the loop's tip arc — the CR-sampled loop passes ~0.8 m
  from the staged (235.5,−1335), so the scope moved clear of the ribbon) → back
  SW along the south shore edge to the mole-root walk (~206,−1299.5)
  — one continuous trail→gate→hedge→tip→hook connectivity loop, no dead ends.
  Tree-cluster anchors (210,−1344)/(211,−1352)/(236,−1326): the middle anchor
  sits WEST of the staged (223,−1349) because mt-point's pull-back cameras land
  at (221.9,−1348)/(224.7,−1350) — a canopy there is the 034/047 camera trap.
- **PHYSICS RULING (waypoint expectations)**: the downtown skyline canNOT render
  from the Point — the camera far plane is 900 (core.js) and the fog:false
  skyline backdrop sits ≥ 1,600 m away; likewise the harbor entrance light
  (239,−1130) is 208 m from the tip stand with fog fully opaque at 210 m.
  mt-point's final string promises the hook's stone ARM (its near half, 40–190 m,
  reads through the haze) + the open-lake horizon — NOT the skyline or the light
  (mt-hook owns the light read at 85 m). Final strings: refs/montrose/BRIEF.md
  §WAYPOINTS (final).
- **Waypoints**: `mt-hedge` stand (203,−1319) — hedge + gaps + birders to the NE,
  lake horizon past the wall; `mt-point` stand (229,−1341) — tip meadow SE over
  open water, the arm reaching south; optional `mt-hedge-gate` (186,−1316) —
  east through the gateway. All three stands are lawn TODAY (staged walkprobe
  expects lock them in).

#### Montrose Beach + the DUNES + The Dock (072) — canonical game coords

The city's big wild beach NORTH of the Point (replaces the 069 `COAST_MTR_BEACH`
revetment stub, z −1360…−1500). Built with the DOG_BEACH `beachH` machinery at
SCALE: a walkable SAND sweep, dry inland and sloping DOWN in +x (east) to the
waterline via `montroseBeachH` (chicago.js, shared by engine + `walkprobe.mjs`).
East–west COMPRESSED per the standing liberty; the beach's job in the composition
is BREADTH after the harbor's masts + the Point's intimacy.

- **SAND** (`MONTROSE_BEACH`): footprint x 200…240, z −1360…−1500; slope ref x227
  span 14 depth −2.7 (grade inland → tucks under the lake ≈ x241). A LONE
  frustum-culled sand Mesh (coast.js). `COAST_MTR_BEACH` stays the LAND/SHORE
  boundary but is EXCLUDED from `QUERY_SEGS` + the terrace/pile/face fold (no
  concrete). Towels/umbrellas/coolers REUSE the rocks beach-life buckets
  (local-seeded, +0 InstancedMesh buckets).
- **THE DUNES** (`MONTROSE_DUNE`, the SE natural area abutting the Point): a roped
  block x 210…233, z −1362…−1414 — INTERIOR NON-WALKABLE (data carve, NO collider
  — 065 law). Low sand mounds + dune grasses (tuft-bucket grow, local seed) + a
  rope-and-post line (`fence`, `fenceRun` collide:false) + the PLOVER story: 2
  adults + 1 chick (chibi-chunky so they read) near the north rope + ONE honest
  'PIPING PLOVER NESTING AREA' sign. The canonical Monty & Rose home (068 ruling);
  the Belmont dog-beach pen stays a recorded local homage.
- **BEACH HOUSE** (`BEACH_HOUSE`, x199, z−1440, faces E): the historic ship-like
  bathing pavilion — a long two-storey cream hall, a rounded solarium "prow" east,
  terracotta hip roof + rooftop deck rail, glow-window band, atlas name sign.
  Anchors the south-central end. Hall footprint carved from walk; prow collider.
- **THE DOCK** (`THE_DOCK`, x216, z−1484, faces S): the seasonal open-air beach BAR
  (bar-likeness register) — a raised WALKABLE wood deck (`deckRect`) + L bar counter
  + teal canvas awning + umbrellas + a 'THE DOCK' canvas sign; beachgoer NPCs +
  a plover-fact interaction (`packs/montrose-beach.js`).
- **Waypoints**: `mt-beach` (215,−1456 — long sand + beach house), `mt-dunes`
  (222,−1421 — roped dune + plovers + sign), `mt-dock` (216,−1473 — the bar).
- **Determinism**: +0 InstancedMesh buckets, +0 draws to any non-beach view; all
  scatter local-seeded; spawn shot 0.29% vs baseline (noise). Beach views ≤ 272 draws.

#### Cricket Hill (073) — canonical game coords (SHIPPED)

The kite mound inland-WEST of the harbor (the landform is unmapped in OSM — only
its comfort station, osm z −1312…−1326). An ANALYTIC walkable dome, the map's
first hill: `CRICKET_HILL` cx 112, cz −1315, rx 31, rz 27 (footprint x 81…143,
z −1342…−1288), height 7.0. `cricketHillH` (chicago.js) is a radial smoothstep
with a FLAT standable summit and a ZERO-SLOPE rim — no cliff seam, no false
airborne (max grade ≈ 0.39; no 0.475 m stride drops > 0.5 m) — SHARED by the
engine (main.js surfaceY) and tools/walkprobe.mjs, the beachH lineage. The whole
footprint sits on LAND, so only HEIGHT is added (no walk rects). Clear WEST of
the trail (x 160–180 there) and EAST of the LSD berm. Dome mesh + kites +
kite-flyer NPCs: packs/cricket-hill.js (073/074). Waypoints:
`mt-crickethill-summit` (112,−1315), `mt-crickethill-base` (112,−1272).

#### Standing liberties (Montrose — deliberate, keep)

- **East-reach compression ~2.8×** beyond the 1:2 base: the real Point tip /
  breakwater need ~623–636 game-x east of LSD; the map has ~230 (x-frame
  paragraph below + `osm.json` provenance.scout067 for the measured numbers).
  Topological order preserved; distance squeezed.
- **The hook curl relocated**: the real breakwater's terminal hook curls at the
  beach's NORTH end (~z −1577, past the map cap −1516); the game curls it at the
  harbor MOUTH (070) so the signature silhouette survives inside the bounds.
- **The sanctuary band slides north** (beside-the-basin → beyond-the-mole,
  z −1296…−1362) — see the Point subsection (071).
- **Plovers in two places**: the canonical Monty & Rose / Imani story lives at
  the DUNES (072); the Belmont dog-beach pen stays a recorded local homage —
  the PLOVER TENSION ruling below.

**The stub shore (069, `COAST_MTR_*` — the COAST_TIP determinism precedent).** The
Montrose shore is FIVE separate revetment pieces, each kept OUT of the shared
`COAST_SEGS` (props.js beach-life iterates that with the world rng — appending
there moves every towel) and added only to `QUERY_SEGS` (walkability) + rendered
by folding into the EXISTING terrace/pile/face/wet-band buckets with a LOCAL
xorshift (zero new InstancedMesh buckets, zero shared-rng draws). Each is its own
const so 070–072 replace one without touching the others:
`COAST_MTR_LAWN` (z −800…−1088, ships as the honest south-of-harbor shore),
`COAST_MTR_HARBOR` (−1088…−1300 → 070 carves the basin here),
`COAST_MTR_POINT` (−1300…−1362 → 071 pushes the Point east),
`COAST_MTR_BEACH` (−1362…−1500 → 072 lays the sand), and `COAST_MTR_CLOSE`
(the NE-corner map-edge closure). All use `TIER_DEFAULT` (4-step) — z outside the
Rocks band. The stubs read as plain stepped revetment from the trail (honest
interim shoreline, not holes).

**The strip continues.** LSD berm + road + the L-track backdrop + the Lakeview
band all extend north to the new edge (data: `LSD.berm.z0`, `LAKEVIEW_BAND.zr`;
ambient.js `Z_N`). The dual **Lakefront Trail** continues from its golf-lakeside
north end as a NEW ribbon (`TRAIL_MONTROSE`, registered via `pathSamples2` — never
reshape `TRAIL_MAIN`) running the lawn up toward the Point. **Trail hand-off law
(task 102):** `TRAIL_MONTROSE[0]` IS `TRAIL_MAIN`'s last point `[208,-572]` and
`paths.js` splices the two ribbons with a MITERED join (shared seam edge, no
gap/overlap/step by construction) — the 069-era "overlap the ribbons ~10 m so
they join" double-pave is forbidden anywhere on the map (it z-fights, notches
the edges, and doubles the dashes; the garden-peanut + sanctuary closed loops
miter their own welds the same way). The **Montrose Ave
underpass gate** (x 0–14, z −1207) matches the Belmont/Addison/Irving register
(fenced dead-end door, no gag sign). North map edge z −1516 with the north-cap
hedge; `WATER` plane grown so the far-north lake never runs out.

**x-frame / EAST-REACH compression (STANDING LIBERTY).** osm z is the game z
(1:2, Belmont origin — clean). osm x is NOT: LSD drifts west going north (osm
DuSable-LSD x −393 at Montrose vs −347 at Irving), and the real east reach (the
Point + breakwater push past osm x 200) will not fit 1:2 inside `xMax` 244. So the
game holds LSD at x 0–14 and COMPRESSES the east reach to fit; the stub shore
holds x ≈ 231–237 (a smooth continuation of the golf revetment). 070–073 finalize
each feature's game x by topological order (§5.4 arrangement above), NOT by raw
osm x. The Point's true east extent is a recorded compression — order survives,
distance is squeezed.

**PLOVER TENSION (068 ruling, recorded liberty).** The real Monty & Rose /
Imani-generation piping-plover story lives at the **Montrose dunes** (072: a roped
nest area at the beach SE). The already-shipped dog-beach "Monty & Rose" pen at
the Belmont basin stays as a recorded liberty (it reads as a local homage; the
canonical plovers are the dunes ones). Do not relocate the dunes plovers to the
dog beach or vice-versa.

### Golf: Sydney R. Marovitz, z −580…−440 (084 COMPACT VIGNETTE; real: 71 ac, 9 holes)
- Fenced course **x 60–205, z −580…−440** (≈ 145 × 140 m): the 084 compression
  re-cuts the full-1:2 course (was z −790…−440) to a postcard of itself — the
  signature reads survive (fence, starter kiosk, tees/pins/flags, bunkers, the
  lakeside fieldhouse), the acreage does not. East edge x 205 so the DUAL
  Lakefront Trail runs the lake-side strip EAST of the fence; south edge z −440
  keeps the Bird Sanctuary corridor (z −440…−420).
- **6 holes read**: holes 1–3 playable-register near the south entrance
  (pins ~z −448…−468), 3 dressing pins to ~z −570 — all inside the fence.
  Bunker COUNT stays 6 (structures.js's only shared-rng draws — frozen).
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
  entrance sign, Divvy dock, Harry Caray sign, busker, + the Red Line
  **RED LINE · BELMONT** identity pylon (~15.4, 107) with a DEPARTURE BOARD at
  each boarding point — (16, 100) → Addison, (16, 111) → Monroe (task 051's
  stop picker; the Addison board sits N of the CPD harbor sign's z-span to keep
  the read clear). A short paved CONNECTOR links the underpass mouth (~x 14,
  z 105) east to the AIDS-garden loop's west edge.
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
- North: Montrose is FULLY BUILT as of v0.6 (069 shell, 070 harbor + hook, 072
  beach + dunes, 073 Cricket Hill, 074 delight, 075 polish, **071 the Magic
  Hedge hero — SHIPPED**; the 076 sign-off remains).
  Beyond the north edge (z −1520 / ~Wilson Ave), the real Lakefront Trail
  continues to Foster/Ardmore — the next north growth.
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

### The INTERIOR — the 'wrigley-bowl' pocket cell (task 055, owner green-light 2026-07-11)
A pocket cell through the **Marquee Gate** (the redline-car pattern: own root,
clamp, walkable, surfaceY, kindAt, spawn, dark minimap card). The whole
footprint is **STADIUM_W displaced z −420** (poly, HP→CF axis, scoreboard
bearing identical plus the offset) so interior and exterior agree **by
construction**; the displacement keeps every bowl point ≥180 m from all
scene-level pack content (NPC cull 145 m, fog bubble ~220 m). Data:
`src/data/wrigley-bowl.js` (THE walkability definition, shared verbatim by the
engine and tools/walkprobe.mjs); builder `src/wrigley/bowl.js`; gameplay
`src/packs/wrigley-bowl.js`.

- **Ticket**: 'get a ticket' at the box-office mass (the notchS face closing
  Gallagher Way's south end, ~(−284, −448)); free, cozy, holdItem stub. The
  Marquee Gate is an **honest door**: E → fade → the bowl (spawn on the
  warning track behind home, facing center field). Exit at the entry tunnel;
  ejection deposits you on the marquee apron outside, ticket gone.
- **Radial model about HP (−252, −864)** (θ from HP, s = signed angle from
  BACK): GRASS (r < rWall−3 — the ref-chase trigger) · **warning track** (3 m,
  walkable, SAFE — ships the Gallagher teaser's 'walk the warning track') ·
  wall band 0.8 m (blocked; **ivy** |dθ|≤0.80 h 3.5 / **brick** h 1.1 down the
  lines / green corner fences) with **three open field gates** (behind home +
  both dugouts, ~3.4 m — the field is physically enterable, no invisible
  walls) · **field-level concourse ring** 3.8 m (|s| ≤ 1.55) · 8 stepped seat
  rows (0.62 rise, 1.4 run), **climbable in two wedges** (s ±0.40…0.95, sit
  spots) — everything else scenery.
- **rWall(θ) = min(target curve [74 m at the foul poles → 14.5 backstop],
  polyRadius(θ) − 2.2)** via a 256-entry LUT — deep LF (74) vs **short RF
  (~53.5, hugging the Sheffield face)** happens by construction, matching the
  exterior foul poles.
- Scenery ringing the walkable bowl: upper deck + tilted roof + green steel
  columns behind home, CF bleachers + juniper batter's eye + the hand-turned
  scoreboard (OPEN HOUSE line, clock, pennants), light towers on the rim, and
  the **rooftop-club silhouettes over the Waveland/Sheffield walls** (bleacher
  racks + EAMUS CATULI board) — the view the bleacher bums built.
- **The ref chase** (owner's design, exact): stepping on the GRASS wakes the
  ump at his track-side post — whistle, chase at 6.9 m/s (walk 4.2 < ump <
  run 9.5). Tag (r 1.05) → whistle + fade + EJECTED + ticket gone; off the
  grass in time → he pulls up, dusts his cap ("...and STAY off the grass"),
  returns to post. state.ejections counts; journal line at 3+.

### Standing liberties (deliberate, keep)
- The cell sits ~x −140 rather than the true ~x −800 (1.6 km inland) — the L
  ride is a scripted transition, not literal track distance.
- **The interior bowl is GENEROUS vs the exterior peek-over silhouette** (task
  055): the walkable lower bowl reaches r ~30 with its upper deck above
  r ~26.5, while the exterior's over-the-wall bowl visual sits at r 13–25.
  The two are never seen in one frame (separate cells) and the inside must
  hold a playable chase — same class as the 009 big-league footprint liberty.
- **Open house inside vs perpetual game day outside** (task 055): the street
  keeps its crowd-noise game-day register; through the gate it is the empty
  quiet cathedral (owner's ask — "no game-day crowd this task"). The fade is
  the day-dream seam; the scoreboard reads OPEN HOUSE — NO GAME TODAY.
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
| **Wrigley Square + Millennium Monument (NW)** | peristyle = semicircular arc, center (68, 724.5), OPEN SIDE SE over its lawn; paired Doric rings R 9.0 outer / 7.6 inner, 12 columns each; curved base h 2.2 + columns 8.0 + entablature ≈ 1.3 → crown ~11.5; built bbox 57.9–75.8 × 714.4–732.3 = **1:1 object scale** (the 040 plinth rect 61–73 × 721–727 was the raw 1:2 osm plan — Cloud Gate precedent, center kept) | BUILT task 050 from the owner night photo (refs/millennium-park/owner-wrigley-square-night.webp = ground truth for structure AND lighting): columns washed PURPLE by uplights over a WARM GOLD base band (self-lit `bmat` atlas — the Crown-lantern register, no dynamic lights; perpetual dusk IS the photo's hour), dark dedication band "TO THE FOUNDERS OF MILLENNIUM PARK" across the base front (sign register), fountain basin r 2.4 at (70.8, 727.3) with a single warm-lit jet, planter urns on the chord-end piers (73.9, 718.6) / (62.1, 730.4), twin quad-globe period lamps at the lawn approach (77.1, 721.8) / (65.3, 733.6); lawn SE (58–90 × 730–750) = the photo's foreground apron, owner vantage (85.4, 734.5) minted as waypoint mp-wrigley-square; low inscribed WRIGLEY SQUARE wall at (78, 749); plaza walk 57–96 × 713–752; base arc + piers + basin + lamps are builder colliders (statue pattern), the exedra interior stays walkable through the open SE side |
| **McCormick Tribune Plaza (ICE RINK)** | 57–78 × 770–826, **sunken y −1.6** | THE ICE RINK (owner override 2026-07-11, task 049 — supersedes the 040 "cafe, no rink ever" call; refs owner-aerial-use-this.jpg + owner-mccormick-ice-skating.jpg). **GROWN ~1.5× (093, owner note 2026-07-18 "more space to skate around and do tricks"): the pit takes the 2 m lawn strip up to the Washington walk (z0 770) and 2 m of the Bean plaza (railX 78)** — a recorded play-over-realism liberty. A white ice SHEET 61–74.5 × 775.5–822 (13.5 × 46.5 ≈ 628 m²; kind `ice` — skates-on glide movement) ringed by chunky white boards w/ cream caps (0.8 non-walk gap; 45° corner-cut boards + r 1.5 corner colliders), a rubber apron ring at y −1.6, ENTRY = stair-ramp from the Michigan spine x 57→60 at z 798.5–801.5 (y 0→−1.6 over 3.0 m, slope ≤ the 0.55 walk guard, enclosed cheeks — elevator rule) → landing 60–61 × 797.5–802.5 → the 5 m boards GATE. Non-walk rim buffer ~1.1–1.6 all around (W planter rim 57–58.6, N 770–771.6, S 824.4–826, E 76.9–78 = the PARK GRILL facade band under the Bean-plaza balustrade at railX 78 — cream wall + green awnings + warm windows, per the owner skating photo) |
| **Cloud Gate / AT&T Plaza** | bean 80.3–93.3 × 787.7–807.7 = **1:1 object scale 13 × 20, h 10** (center (86.8, 797.7) kept from osm; the 040 rect 83.1–90.5 × 792.8–802.6 was the raw 1:2-compressed osm plan — enlarged per the map-wide 1:1 object-scale law, task 043), long axis N–S | toon HOMAGE w/ PAINTED reflection wrap (copyright register; never a computed envMap); plaza walk 78–98 × 776–826 (x0 78 since 093 — the rink balustrade overlook took 2 m of the west strip), **continuous UNDER the E–W omphalos arch** (soffit ~3.7 rising to ~4.9 at the navel; ground-contact lobes (86.8, 792.2) / (86.8, 803.2) r 2.2 are the only colliders) |
| **Crown Fountain (SW)** | pool 66–73.5 × 847–881; towers 68–71.5 × 850–853 and 68.5–72 × 875.5–878.5, h 15.2 | walkable WET plaza (walk 57–86 × 838–886, y 0, wet film is visual); glass-block LED-face towers = colliders; homage register. BUILT task 045: two SELF-LIT amber glass-block tower shells (`bmat` + painted block-glow map — the Bean's escape from the toon ramp, so they read as lit-from-within lanterns at dusk, no green ground-bounce), inner LED faces = canvas-texture toon CITIZENS (blink idle, rotate 4 faces, purse on the spout), a wet-mirror pool skim + PAINTED amber reflections + amber glow pooling at each tower foot (layered at distinct y — issue-003 discipline, no z-fight). LIVE layer in `src/packs/crown-fountain.js`: BOTH towers purse + SPOUT arcs into pool centre on a ~40 s local-seed cycle (instanced droplets + splash ring + synth audio); standing in the landing zone soaks the player (screenFx + single toast); kid NPCs shriek-and-scatter. Flanking elm bosques hug the strip OUTER edges (x 58–62 / 80–84) to keep the pool framings clear |
| **Pritzker Pavilion (NE)** | stage 123–170 × 747–758, mouth faces SOUTH | ribbon-petal crown homage; Harris Theater flybox adjoins north (129–163 × 715–747); speaker towers flank (118, 752) / (175, 752). BUILT task 044: exploding stainless RIBBON headdress (14 hand-modeled curved shells, two-tone silver/warm merged to 2 tone meshes — burst silhouette, not panel-accurate), open proscenium showing a warm-fir interior + dark-red curtain + music-stand/timpani silhouettes (the soundcheck GAG is 047), canted steel buttresses, flanking black line-array speaker towers |
| **Seating bowl + Great Lawn** | bowl 118–186 × 758–788 (red seat field, walkable); lawn 118–186 × 788–846 | **trellis** pipe-arc dome over the lawn on perimeter columns, 120–166 × 792–844 (east edge stops at the BP approach). BUILT task 044: instanced red folding seats fill the bowl (decorative, no colliders — the bowl stays walkable per WALK_M, with a centre + two side aisles); the trellis = two diagonal criss-cross arc families (`bays` 6 paired posts per long edge at x0/x1, arcs spring from post tops `colH` 9 to `apexH` 14) merged to one steel mesh, paired speaker pods hung at the crossings; mowed-stripe lawn tint + a low lawn-edge hedge/planter line (W + S + SE runs — the south run is the **pad 046's Lurie shoulder hedge rises from**) + scattered picnic blankets & lounging figures (local seed). Stage is a solid visual mass, NOT enterable (walkableM ends at z758; no dead stair — Diversey rule) |
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
843–852) + Seam boardwalk + SW link (138–149 × 870–880) + south rim, and the
SUNKEN RINK GROUP at y −1.6 (task 049; grown 093; ordered ramp → landing/gate
→ apron ring → ice): entry ramp 57→59.7 × 798.5–801.5 (y 0→−1.6), landing
59.7–61 × 797.5–802.5, apron W 58.6–60.2 × 771.6–797.5 + 802.5–824.4 (split
at the entry), apron E 75.3–76.9 × 771.6–824.4, apron N/S 60.2–75.3 ×
771.6–774.7 / 822.8–824.4, ICE 61–74.5 × 775.5–822 (`kindAtM` = 'ice' → the
main.js glide).
The boards line (0.8), the rink rim buffers, all planting plates, hedges,
backstage pockets and every road
stay non-walkable; buildings standing on walks (Exelon cubes, Crown towers,
kiosk) are builder colliders, exactly like Wrigleyville statues.

### Standing liberties (deliberate, keep)
- **PARK-LOCAL displaced frame on BOTH axes** (dx −468.8, dz −2369.6, recorded
  in osm.json provenance): the ride is a scripted transition. True projection
  z ≈ +3200 is never a validation target.
- **State→Michigan block compressed to zero**: the Red Line subway kiosk stands
  at the park's Michigan Ave edge (the Wrigleyville x-frame register).
- **Perpetual-dusk ice rink** (owner override 2026-07-11, task 049 — replaces
  the 040 "cafe, no rink ever" liberty): the game stays endless summer evening
  and the McCormick rink is OPEN ANYWAY — a knowing seasonal liberty, recorded
  in refs/millennium-park/BRIEF.md. Fog 0xf6ab84 register, first
  window-lights on, unchanged.
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
- **Skateable sunken rink**: the McCormick terrace is fully walkable-glidable
  (049; supersedes "view-only cafe") — the Bean-plaza balustrade (railX,
  x 78 since 093) stays as the overlook above the toon PARK GRILL band
  (1.6 m facade compression of the real full-storey grill front — recorded
  liberty). **093 growth liberty (owner 2026-07-18): the sheet is ~1.5× the
  real rink's proportion to its block — trick room beats plan fidelity.**
- Editorial compression: bowl/lawn spans trimmed to drop redundant panels
  (§5.4 — topological ORDER preserved everywhere: peristyle NW → cafe/bean →
  Crown SW → Lurie SE behind its hedge → bridge snaking E from the lawn's SE).
- BP launch pulled ~6 units south of the osm way start; Exelon south pair
  pulled ~6 north off the Monroe walk; Stock Exchange Arch sits in the south
  backdrop band (osm 175, 908 is inside the Monroe roadway). **(BOTH SUPERSEDED
  by the Grant expansion when its flags flip: the bridge takes its REAL
  lawn-SE launch, and the Arch moves to its REAL spot — see below.)**

## GRANT PARK EXPANSION (task 057 layout; builders 058–061; flags in millennium.js)

**Owner directive 2026-07-11: the cell grows into Grant Park proper — the Art
Institute, Butler Field with Lollapalooza live, ALL of Maggie Daley Park, and
the BP bridge fully built out.** Same park-local frame; every coordinate below
cites `refs/millennium-park/osm-grant.json` (fetched with the EXPLICIT
millennium offsets dx −468.8 / dz −2369.6, so the two extracts share one frame
exactly — provenance in that file).

**STAGING LAW: nothing below is live until its builder flips its flag** in
`src/data/millennium.js` `OPEN_GRANT` (`maggie` → 058, `ribbonIce` → 059,
`artInstitute` [+`nichols`] → 060, `butler` → 061). With all flags false the
cell is byte-identical to the pre-057 world: same WALK_M order, same clamp,
same minimap. Clamp/map growth is computed from the flags (east needs maggie
or butler; south needs artInstitute or butler). Data tables ship in 057;
meshes ship with the flag flip; walkprobe/gridsweep read the same flags.

### Frame additions (osm-grant.json street medians)
| Street line | In-game | Note |
|---|---|---|
| Adams St axis (the lions) | **z 972** | E Adams dead-ends at Michigan (osm x 47.5); AI portico centers here — a paving break-line on the spine like Washington/Madison |
| Jackson Dr (new S frame) | **z 1038** | road band z 1032–1044; scenery, never walkable |
| Monroe Dr east of Michigan | z 897 | road band z 894–908 continues east to x 340 (real east-end bend to meet LSD trimmed — liberty) |
| Randolph Dr east of Columbus | z 701 | scenery band extends to x 352 |
| DuSable Lake Shore Dr (new E frame) | **x 340** | road band x 332–346, z 694–1044; measured x 339–342 for z 770–1300; STRAIGHTENED north of z 770 (the NE-wedge fold, liberty below) |
| Columbus south | x 195 | road band extends z 908 → 1044 (to Jackson) |

Grown extents when fully open: geometry ≈ x 6…362, z 680…1080; player clamp
x 44…340, z 700…1040. z 680 hard floor unchanged (billboard law). Minimap
bounds MAP_FULL x0 28, z0 676, 336 × 412.

### THE CROSSING LAW (how zones connect — festival street closure)
Roads stay scenery and uncrossable EXCEPT: **Lollapalooza closes E Monroe Dr
(Michigan → LSD) and S Columbus Dr (Monroe → Jackson)** — real festival-week
truth; the closed streets are walkable curb-to-curb (the Wrigleyville game-day
register, festival crowd-fence + branded arches instead of CPD barricades).
The Michigan spine crosses closed Monroe at grade (x 48–57) to reach the Art
Institute; Maggie Daley's south rim gates onto closed Monroe; Butler Field
fronts both closed streets. **Columbus NORTH of Monroe stays open scenery — the
BP bridge remains the only way into Maggie Daley from the park (its whole
point).** Closure segments gate: x 48–189 of Monroe with `artInstitute`;
x 200–336 of Monroe, all of closed Columbus, and the south-rim gate knits with
`butler`. Diegesis pre-061: "LOLLA LOAD-IN" (cones, a pallet, the fence going
up — 060 dresses its segment).

### Zone A — BP CROSSING, fully built out (058; flag `maggie`; SHORTENED 093)
- **The SHORTENED serpentine (093 owner liberty, 2026-07-18: "maggie daley
  bridge should be a bit shorter even if that's unrealistic")**: both landings
  keep — launches at the Great Lawn's SE corner **(172.6, 834.9)**, ONE rim
  wiggle north (out to x 179.4 at z 824.9, back to x 178.3 at z 819.5),
  snakes NE and crosses Columbus at **z ≈ 801** (deck y 5 over the road; the
  osm line crossed at z ≈ 790 — the crossing moved ~11 south, closer to the
  straight launch→landing chord), then **ONE hairpin** (the famous S-hook
  compressed to a single curl: out to x 223.7 z 799 → apex (233, 795.6) →
  back south through (239, 802.6)) descends into Maggie Daley, curling in
  from the west at z ≥ 805 (so the deck edge only meets the grade landing
  plaza where deck y ≤ ~0.4 — never a side cliff), landing at **grade apron
  (247, 807.5)**. Polyline ~104 m vs the 058 osm-verbatim ~144 m — **the
  crossing walk is ~28% shorter**. Hand-fit 21-node curve + y profile in
  `BP_CROSSING_M` (millennium.js); bridge.js sweeps treads/parapets by
  CatmullRom tangent (the 048 contour law). The 058 osm-verbatim 28-node
  alignment is retired (git history holds it).
- Walkable = a continuous half-width BAND over the SAME CatmullRom the
  geometry sweeps (062/issue 023: the old per-segment segQ chain left
  outside-of-bend wedge slivers at every joint — "stopped every few meters").
  The data module samples the curve densely (plain Hermite, THREE-matching,
  tension 0.5) and tests point-to-polyline distance ≤ 2.35 (0.25 lane margin
  off the parapet inner face at 2.6), circular caps at joints. Ramp-only at
  both ends; flank rules: lawn SE quad shrinks to the launch esplanade
  (168–186 × 833–846), a planted non-walk buffer under the rising north run,
  Columbus rim walks re-split for the 093 overflight (N: 713–784; S:
  x 185.8–189 z 813–846 then full-width 846–886; the E-rim promenade splits
  706–795.5 / 808–888). Slope ≤ ~10% everywhere (gentler than the pre-057
  approach ramp's 21%).
- Columbus below reads as a road TRENCH passing under (visual only), moved
  with the crossing: x 190–200, z 793–809, floor −1.7.

### Zone B — MAGGIE DALEY PARK, all of it (058 terrain/park + 059 ice; flags `maggie`, `ribbonIce`)
Bounds x 198–338, z 699.5–892 (osm relation 224231352, west of straightened
LSD). The rooftop-park's rolling topography reads as planted landform MOUNDS;
walkable ground stays park grade y 0 (liberty).
| Feature | Position (osm-cited) | Read |
|---|---|---|
| Fieldhouse | mass x 243–285, z 712–727.5 (osm 764227071 anchors the Randolph front) | long low glassy park-district building; entry lawn south |
| **Skating Ribbon** | closed 66-pt loop x 222.2–279, z 731.7–770.9 (osm way 524270342, VERBATIM in RIBBON_M) | ~250 m serpentine path, halfW 2.7, looping the climbing walls; 058 built the BED (rockwork rims + rails + X-mast lights); **059 SHIPPED: `ribbonIce` on** — the strip renders as ICE (rink recipe), kindAt 'ice' end to end (049 glide verbatim), NPC skaters strung along the loop (packs/ribbon-skaters.js) |
| **Climbing walls** (not in OSM; owner aerial + 20151008 ref; REPOSITIONED 062/issue 022 — the 058 spots overlapped the ice) | wall A x 254–266, z 745–751, h 12 (faceted crescent); wall B x 263–270, z 758–763, h 9 (prow) | gray faceted panels + candy-colored holds + steel truss backs; TRUE ISLANDS the ribbon loops AROUND — every shell envelope clears the ice band (centerline ±2.7) by ≥ 3.5 m (rail/curb margin, walkprobe-asserted); stand on the island plaza (walkable, 9 rects sealing both walls — 052 law); climbable only if it reads honestly (058's call) |
| **Play Garden** (osm rooms, real names) | zone x 252–316, z 806–864: Cradle Nest 254.5–267 × 840–848 · Harbor SHIP 267.6–276 × 841–849 · The Sea 270.6–293 × 812.5–835 · Lagoon 278–285 × 820–827 · Watering Hole splash pad 278–282 × 815–819 · Enchanted Forest 295–313 × 808–829 · Swings 279–286 × 836–842 · **Slide Crater 294.5–314 × 838–862 w/ the LIGHTHOUSE (303, 849)** | chibi-heaven: red/blue play ship + rope nets, rope suspension bridge + timber fort tower (286–292 × 819–825), red-striped lighthouse + curling steel tube slide + crater bowl, string-lit mini-forest, blue-green wave rubber ground; 11 walk rects seal ship/lighthouse/tower |
| **Cancer Survivors' Garden** | x 321.7–338.8, z 710.8–789 (osm 10601819) | terraced formal garden on the LSD overlook rim: the two real **Federal Building Columns** (327.4, 714.5) / (331.9, 714.5), two black steel PAVILION frames (~(329.5, 746) / (329.5, 772), carved from the walk), crabapple bosque, beds |
| Tennis pair (RELOCATED — NE-wedge fold) | pads x 296–318, z 713–727 | real courts sit in the folded wedge (osm x 393–414); moved to the north lawn between fieldhouse and CSG, north-rim program order preserved (fieldhouse → tennis → columns → CSG) |
| Landing plaza + paths | plaza 243–258 × 800–816 at the bridge apron; E-rim promenade x 201–209 full height; fieldhouse esplanade x 209–323 × 728–736; south rim x 201–338 × 878–888; meadow connectors | the aerial's path net simplified to rects/chains in WALK_GRANT |
| Signature fixtures | white X-crossed floodlight masts (owner aerial + 2022 lights ref) | Maggie's lamp register — NOT the park's quad-globes |

### Zone C — ART INSTITUTE block (060; flag `artInstitute`, sub-flag `nichols`)
Masses simplified from osm relation 1870546 (105-pt outline):
| Mass | Rect | Read |
|---|---|---|
| **West block (1893 Allerton)** | x 59–94, z 946–995, h 17 (pediment 19) | beaux-arts: rusticated base, arched loggia w/ hanging exhibition banners (invented shows), THE ART INSTITVTE OF CHICAGO frieze, artist-name band |
| Portico + grand steps | portico proud x 57.2–59.5 × z 963.5–978 (Adams axis 972); steps x 54.2–57.2 rampX y 0→1.9; forecourt apron x 50–54.2 × 958–984; urn beds (non-walk) flank the steps | steps SITTABLE (lunch pair); doors honest non-doors + sandwich board |
| **THE LIONS** | plinth centers **(54.4, 962.4)** north "on the prowl" and **(54.4, 979.4)** south "in an attitude of defiance" (r 1.9 colliders sealing the plinths) | verdigris green-bronze, Caray-care meshes, subtly different stances — the single most-checked detail |
| North Garden | x 53–81, z 906–941 (osm 235227858) | hedged sculpture garden: Flying Dragon (71.8, 930.2) red Calder · Large Interior Form (61.4, 914) · Cubi VII (67.6, 919.4) — mini-cameo register |
| South Garden | x 55–95, z 999–1032 (osm 235216579) | sunken hawthorn bosque grid + **Fountain of the Great Lakes** basin (81.9–86.5 × 1009–1015.5, carved 4-rect) against the south annex wall |
| Rail trench | x 96–124, z 909–1032, floor y −3 | open Metra cut (catenary, a parked silver EMU ~z 1000); THE GRADE CARPET MUST BE CARVED (041 pit law); crossed by the Gunsaulus waist x 94–125 × z 964.5–974 (h 12) and the Modern Wing |
| **Modern Wing** | x 121–171, z 909–930, h 14 (+ flying-carpet canopy) | white limestone + glass; Bluhm terrace x 124.8–132.4 × 909.5–922 at y 13 = the Nichols landing |
| East campus | McKinlock x 125–147 × 973–1031 · SE block x 147–175 × 980–1027 · Columbus pavilion x 168–180.3 × 942–980 + pool strip x 177.4–183 × 954–985 | quieter masses; east rim walk x 181–189 z 908–1032 |
| **Stock Exchange Arch — MOVED TO ITS REAL SPOT** | freestanding at **(184, 935)**, facing Columbus | supersedes the south-backdrop cameo (BACKDROP_M.south retires when the flag flips — the real zone replaces it) |
| **Nichols Bridgeway** (sub-flag `nichols`) | osm way 90707301: (117.4, 839.7) → (122.7, 925.9); deck y 0→13 — walkable = continuous BAND (hw 1.4) over the same smoothed alignment the deck sweeps, y pinned to the node-linear lerp (062 band law, kills the terrace-swing wedge sliver) — landing on the Bluhm terrace (walkable pad, honest door) | white boat-hull belly over a river-stone bed; walkable ONLY with the recorded carve-outs (Monroe sidewalk slot x 115.8–122.2 + bypass, allee SE trim, lawnW west trim) — 060 flips or ships scenery and says which |
| Michigan cliff extension | band x 6–30 grows z 935 → 1080: BORG-WARNER z 984 (glass) · **SYMPHONY CENTER z 1002** (ORCHESTRA HALL) · **RAILWAY EXCHANGE z 1023** (white terra-cotta, rooftop SANTA FE sign, self-lit) · McCORMICK BLDG z 1072 (edge) | the cliff faces the lions |
| Route 66 | BEGIN sign at the spine near (48.5, 968) (osm 33.4, 967.5 across Michigan — pulled to the park curb, liberty) | delight seed: "ROUTE 66 BEGINS HERE" |

### Zone D — BUTLER FIELD + LOLLAPALOOZA (061; flag `butler`)
Field x 198.6–326, z 900.7–1032.6 (osm 139013800).
- **The stage IS Petrillo** (osm 210671695: x 214.4–229.7, z 1002–1017, mouth
  facing NE — real bearing): the permanent shell wearing festival dress
  (banner truss frame, line arrays, side video boards) — RECORDED FUSION
  LIBERTY (real Lolla erects temp stages; the game hangs the festival on the
  field's real shell — geographically honest, evocation-stronger).
- Crowd field fans NE of the mouth (~x 225–300, z 940–1005): instanced swaying
  crowd, real bumpables at the rail (048 law); sound booth (258–266 × 968–976,
  carved) + dance circle; Serra's **Reading Cones** stay at their real
  (262.7, 912.7). 061 data-pins the festival kit inside the field: stage deck
  y 1.6, the joinable dance circle at (272, 971.5) r 3 beside the booth, the
  front-of-stage barricade rail x 218–262 at z 1000.2, two mid-crowd delay/
  light towers (250, 960) / (288, 966), and three crowd totems — a hand-made
  star, a foam EL car, a disco ball — at (262, 981) / (246, 956) / (283, 950)
  (the inflatable alligator crowd-surfs live in packs/lolla.js). All stand as
  colliders in the walkable field (statue pattern).
- Dressing per the NEMA-aerial kit: white tent rows east edge, food-truck row
  on closed Monroe, the honest port-a-potty row on closed Columbus's east
  curb, perimeter flag garlands, entry arches on both closed streets, LINEUP
  POSTER at the Monroe/Columbus corner (~(206, 910); all-Chicago pun lineup,
  no real artists).
- LSD scenery road x 332–346 with a **lake-glint + sail-silhouette backdrop
  band beyond (x 348–362)** — downtown finally shows its lake (Monroe Harbor).
- Walks: field lawn (Petrillo + booth carved), closed Monroe + Columbus, LSD
  rim walk x 324–331, three fence-gate knits from Maggie's south rim. The
  festival grounds walk **edge to edge** — the closed Columbus strip (x 190–202)
  meets the lawn (x0 202) with no curb seam, so you cross from street to grass
  anywhere; the entry-arch leg colliders sit inboard on walkable ground (the old
  seam + poking legs hard-stuck the player at the Columbus arch — issue 025).

### Backdrop growth
- **Giants band extends EAST over Maggie's north rim** (flag maggie), z 680–692,
  order preserved, register heights (~0.55×): 340 ON THE PARK x 274 ·
  THE BUCKINGHAM x 308 · OUTER DRIVE EAST x 352 (white scalloped curve) ·
  HARBOR POINT x 385 (dark rounded; osm x 440, pulled in-frame). Aqua stays
  out (real z ≈ 596 — under the billboard floor, recorded).
- **East of LSD = the LAKE**, not towers (flag maggie/butler): harbor-glint
  band x 348–362, moored-sail silhouettes; Peanut Park strip compressed into
  it (recorded).
- **South backdrop** (flag artInstitute/butler) z 1050–1080: quiet South Loop
  band (trees + low streetwall hints). **Buckingham Fountain is measured at
  (246–289, 1157–1200) and deliberately OUT — future growth south**, never a
  squished cameo.

### Walkability (extends the WALK_M law; all in millennium.js, flag-gated)
Elevated first: the BP_CROSSING chain (replaces the three shipped deck quads
when maggie flips) and the Nichols chain (nichols). Then y-0: Maggie's rect
net (rim promenades, esplanades, ribbon strip + island, play-garden 11-rect
set, CSG 7-rect set, landing plaza, connectors, tennis pad), the AI set
(spine extension z 908–1032, Monroe crossing, forecourt apron + steps ramp +
portico landing [flanked by non-walk urn beds — no open stair sides], North/
South Gardens with data carves, east rim), the Butler set (field minus
Petrillo/booth, closed streets, LSD rim, gate knits). Every new building
footprint in a walk area is CARVED IN DATA (052 law — no circular-collider
sealing); small statues/urns/lions stay collider-pattern. kindAtM: 'ice' on
the ribbon strip only when `ribbonIce`. mp-gridsweep sweeps CLAMP_FULL_M.

### Standing liberties (Grant expansion — deliberate, keep)
- **LSD straightened to x 340 north of z 770** and the park's NE wedge folded
  west (the real boundary flares to x ~450 at Randolph; the wedge's tennis
  pair relocates to the north lawn) — the Michigan-straightening register.
- **Festival street closure as the crossing mechanism** (Monroe Michigan→LSD +
  Columbus Monroe→Jackson walkable; fence + arches, no CPD theatrics) — and
  Columbus north of Monroe never crossable at grade: the bridge is the way in.
- **Petrillo-as-Lolla-stage fusion**; grounds free to wander (no wristband).
- **Rooftop-park topography as visual mounds**; walkable ground stays y 0.
- **Bridge slope compressed** (real ~5% → game ramp register); the real launch
  curl and double-hairpin kept.
- **Monroe Dr's east-end northward bend trimmed** (road band stays straight).
- **Route 66 BEGIN sign pulled to the park curb** (real sign hangs across
  Michigan at Adams).
- **Buckingham Fountain, Hutchinson Field, Peanut Park = FUTURE GROWTH south/
  east** — explicitly out of the expansion, no cameo compression.
