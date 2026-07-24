# BUILD-117 NOTES — South Pond Nature Boardwalk (shared executor brief)

Read this WHOLE file before editing. The DATA spine is already written + validated
in `src/data/chicago.js` (`LP_CAFE_BRAUER`, `LP_HONEYCOMB`, `LP_BOARDWALK`,
`LP_BOARDWALK_HALF`, `LP_BOARDWALK_STYLE`, `LP_POND_BRIDGE`, `LP_SOUTHPOND`,
`LP_SOUTHPOND_WATER`, `lpBoardwalkHit`, `lpLandHit`/`lpWaterHit` wiring, re-sited
`LP_TREES`). DO NOT edit chicago.js — read from it. `node tools/tmp-117-datacheck.mjs`
green proves the walkability + coords.

## The place (what must READ — from refs/lincoln-park/)
A NATURALIZED prairie pond (algae-green shallow water, cattail/reed + lily margins,
magenta/purple/gold wildflower drifts). A low wood BOARDWALK on pilings with a dark
mesh rail rings the E/S margin. The honeycomb PAVILION (Studio Gang) is a curved
laminated-timber lattice TUNNEL-ARCH over the water — you walk under it. CAFÉ BRAUER
(1908 Prairie refectory) on the NW shoulder: red brick, broad GREEN-tile hip roof
with a green-glazed geometric Prairie frieze band, tall arched windows w/ sage frames,
a facade clock, TWO open loggia arms, twin roof lanterns; GREEN + white-swan
paddleboats on the water below. Pond life: black-crowned NIGHT HERONS (the endangered
rookery — the delight hook), turtles on a half-log, teal dragonflies.

## SKYLINE PHYSICS RULING (binding): the game CANNOT render the downtown skyline
(far plane 900, fog 210 m). NO waypoint string promises it. Money read = pavilion arch
+ pond + Café Brauer + paddleboats.

## HARD LAWS (every executor)
- **Determinism**: ZERO `rng()`/`rand()` (the shared world stream). Packs + scatter use
  LOCAL seeds (`mkrng`/xorshift). `Math.random()` only for runtime timers/jitter.
- **ZERO new InstancedMesh buckets** (r128 instanced = drawn in EVERY view). Fold
  hand geometry into the static merge pool (accumulate per-material geometry arrays →
  ONE merged mesh per material; `mergeCellStatic` in main.js collapses same-material
  meshes). Rails reuse the 2 world POSTS/RAILS instanced meshes (tail-append). Grow the
  EXISTING tuft/flower buckets (never a new one).
- **Cached toon color = +0 draws ONLY if the hex is already consumed by a MERGED mesh**
  (not only an InstancedMesh). Reuse pooled hexes: brick `0x8e4f3c`, trim `0xd9ccb2`,
  green tile `0x527a58`, glow `0xffe2ae`, door `0x5c4632`, base `0x9a9282` (Theater/Lion
  House), dock wood `0x8a6a44`/`0x9c6a3a` (Diversey docks). All in `chicago.js` data.
- **NO colliders** on any pond geometry (anti-trap law). Walkability is pure data
  (`lpBoardwalkHit` + the pond subtraction in `lpLandHit`), shared engine + walkprobe.
- **Glass/glow/water = self-lit `bmat`** (the 044 green-ground-bounce law), never toon.
- All meshes via `toon()`/`bmat()`/`curveMat()` (core.js) so they bend with the world.
- No per-frame allocations in update loops. Cache vectors.

## DATA (read these from chicago.js — do not hardcode)
- Pond water polygon: `LP_SOUTHPOND_WATER` (crChain oval, x −47…−13.5, z 896…1002).
- Boardwalk: `LP_BOARDWALK` (dense crChain), `LP_BOARDWALK_HALF` 1.35, `LP_BOARDWALK_STYLE`
  (deckY 0.12, deckTh 0.22, wood 0x8a6a44 / 0x9c6a3a, railColor 0x2f3430, railH 1.0,
  railSpace 2.6, pileEvery 3.2). Welds to `ZOO.spur` at NW (−48.5,905) + SW (−49,1004).
- Pavilion: `LP_HONEYCOMB` {x −30, z 958, ry −1.1 (align to the boardwalk tangent),
  len 12, spanW 5.6, crownH 4.2, ribs 7, cells 4, timber 0x9c6a3a/0x8a6a44, deckY 0.12}.
- Café Brauer: `LP_CAFE_BRAUER` {x −61, z 908, w 14, d 24; palette; wallH 6.4, roofH 3.4,
  eave 1.25; nLong 5, nShort 3, archW 1.9, archH 3.0; towers {w2.6,h2.2,roofH1.5,dx4.6};
  clock {r0.85,y3.7}; loggia {depth3.6,postH3.2,roofH1.3,nBay4,armLen12}; terrace;
  frieze 0x2e4f38, friezeTile 0x6fa08a, frame 0x8a9a7a; sign 'CAFÉ BRAUER'}.
- Bridge: `LP_POND_BRIDGE` {x −40, z 1004, w 16, h 1.5, d 1.4, faceZ 1003.2, stone
  0x9a988c, sign 'NATURE BOARDWALK', sub 'LINCOLN PARK ZOO'} — lettering faces N.
- `LP_SOUTHPOND` {waterY −0.5, water 0x5f7d4a/water2 0x4e6a3e, mud 0xa89468, rimY −0.08,
  banks {…}, lily {…}, paddleboats {…}, herons {…}, turtles {…}, dragonflies {…},
  plates[3], cull {x −30,z 952,r 150}}.

## PER-PIECE RECIPES (file:line precedents — verified HEAD)
### Café Brauer + honeycomb pavilion + boardwalk deck + rails + plates + bridge  →  structures.js
- **Brick hall**: copy the Kovler Lion House block `structures.js:1705-1782` (accumulator
  arrays `gBrick/gTrim/gRoof/gGlow/gDoor/gBase/gPost/gBack` + `box()`/`emit()` skeleton
  from `1548-1554`; `.toNonIndexed()` mandatory; emit one merged mesh per material at the
  end). Arcade `wallGeo(len,n)` `1281-1291`; √2 hip-roof frustum `1336-1342`/`1751-1752`;
  glow arcade merged panes `1298-1314`; limestone `band(y,t)` `1316-1334`; name sign
  `sign()`/`plate()` `1561-1570`/`1905-1921` (own canvas, `fit()` font, solid backing box
  → merge pool, FrontSide plane 0.045 proud). **Twin lantern cupolas** = the clerestory
  MONITOR recipe `1753-1761` run TWICE at ±dx on the ridge (glowing box + small √2 hip
  cap sunk 0.06 into the main hip). **Loggia arms** = `wallGeo` arcade with sill at 0 (no
  spandrel) + brick piers + a low green hip band over an offset plinth, one arm N + one S
  off the east face embracing the terrace. **Green Prairie frieze** = a dark-green band
  (`frieze`) under the eave with small square `friezeTile` inset accents. **Clock** = a
  small round disc + hands on the east face over the doors. Faces East (toward pond).
- **Honeycomb pavilion** = curved lattice tunnel-arch. Copy the Pritzker trellis
  `millennium/pritzker.js:279-309` (two diagonal families of `QuadraticBezierCurve3` →
  `TubeGeometry(curve,~14,0.14,6,false)`, all pushed to one array → ONE merged
  `toon(timber)` mesh). Build ~7 arch RIBS across the 12 m length (semicircle/parabola
  ribs of radius ~spanW/2, springing from pilings at ±spanW/2 in the water) + diagonal
  cross-members forming stylized hex/diamond CELLS between ribs. Long-axis along the
  boardwalk tangent at (−30,958) ≈ ry −1.1 — VERIFY the lp-boardwalk camera looks DOWN
  the arch (down-the-length interior framing). Crown ≥3.5 m clear over the deck. NO
  colliders; walk-through on the deck.
- **Boardwalk deck on pilings**: copy the Diversey east-bank dock `props.js:1059-1082`
  BUT sweep the deck as quads from the DENSE `LP_BOARDWALK` samples (the coast.js
  seawall/rim-cap per-edge-quad pattern `coast.js:751-770`, `mkGeo` w/ uv). Per sample:
  a deck-top quad at `deckY` offset ±HALF along the segment normal + a thin fascia skirt
  down to ~−0.35 + a piling `CylinderGeometry(0.13,0.13,deckY+3,6)` + sphere cap every
  `pileEvery` m on the WATER side. Merge → deck-wood mesh + piling mesh (2 merged). Deck
  top ≈ 0.12 (player walks y0, culvert precedent — DO NOT add walkRects; walkability is
  `lpBoardwalkHit`, already wired). Over the bridge causeway zone the deck sits on the
  abutment.
- **Post-and-cable water-side rail**: `fenceRun(railLine,{spacing:railSpace, postH:railH,
  color:railColor, collide:false},POSTS,RAILS)` `structures.js:57-78` — build the rail
  line from `LP_BOARDWALK` offset +HALF toward the WATER side (a parallel polyline), so
  the rail runs the pond edge of the deck. Tail-append (call inside the new
  `buildSouthPond(POSTS,RAILS)` BEFORE `emitFences`). +0 buckets.
- **Interpretive plates**: `LP_SOUTHPOND.plates[]` via the `plate()`/`sign()` helper
  (own canvas, backing box → merge, FrontSide plane). 3 plates, frustum-culled.
- **Bridge**: `LP_POND_BRIDGE` low stone box (w×h×d) at (x,z); lettering on the NORTH
  face (own canvas, FrontSide, faces the pond/boardwalk) via the sign helper.
- **Build-order**: add `buildSouthPond(POSTS,RAILS)` at `structures.js:2148` (right after
  `buildZooHabitats`, BEFORE `emitFences`). Fold Café Brauer into it (shared accumulators)
  or a no-arg `buildCafeBrauer()` after `buildTheaterOnTheLake()` — either is fine; ONE
  merged mesh per material across both is best. ZERO rng.

### Pond water surface + mud rim + bank scatter + minimap  →  coast.js, props.js, minimap.js
- **Water** (coast.js): (1) punch a HOLE in the `lpGreen` west-park ShapeGeometry at
  `LP_SOUTHPOND_WATER` — a 2nd `ws.holes.push(...)` next to the lagoon hole `coast.js:682`
  (note the −z negation). (2) Add a SHALLOW self-lit water surface = a `flatShape`/
  ShapeGeometry of `LP_SOUTHPOND_WATER` at y `LP_SOUTHPOND.waterY` (−0.5) in
  `bmat(LP_SOUTHPOND.water)` (the 044 self-lit register, like the habitat pools
  `structures.js:1656-1657` / `:1949`). A subtle darker center tone optional. (3) A mud
  RIM skirt: a thin band around the pond edge at `rimY` in `bmat(mud)` to mask the
  land-hole vertical edge (reeds mask the rest). Do NOT use the deep teal `WATER_S`
  living-water plane. No shared main.js touch.
- **Bank scatter** (props.js): index-gated 2nd-seed grow of the EXISTING tuft + flower
  buckets (`props.js:372-451` tufts, `:454-499` flowers). Append the counts to the two
  allocation lines (tuft += `LP_SOUTHPOND.banks.tufts + .reeds`; flower += `drifts.length
  * perDrift`). Grow AFTER the frozen shared-rng fill, LOCAL seeds (`mkrng(seed)`),
  rejection-sampled to the pond-bank ANNULUS: distance to `LP_SOUTHPOND_WATER` edge in
  [`edgeMin` 0.8, `ringR` 9], `pip(x,z,LAND)`, NOT `lpBoardwalkHit` and >~0.6 off it, off
  the pavilion + plates. Reeds = taller `reedScaleY` tufts nearer the water. Wildflower
  heads use `setColorAt` per drift (liatris/ironweed/goldenrod). Push grown buckets to
  `RUSTLE_MESHES` if not already. Verify the SPAWN shot is ≈baseline (rng untouched).
- **Minimap** (minimap.js): add the `LP_SOUTHPOND_WATER` fill (`#2f9fb1`-ish or an
  algae-green) next to the lagoon fill `minimap.js:40-49`.

### Pond life pack  →  packs/lp-pond-life.js (NEW) + packs/index.js (ONE import line)
- Pack skeleton: `import * as THREE`, `BufferGeometryUtils`, `{ onWorldReady,
  registerUpdate, getAudioCtx }` from framework, `{ scene, toon, bmat }` core, `{ sph, box }`
  from `./zoo.js`, `* as CH` from data. ALL setup inside `onWorldReady`. LOCAL seeds only.
- ONE culled group `grp.name='zooanim'` (fogcull-exempt); 0.4 s throttle distance cull at
  `LP_SOUTHPOND.cull` (150 m); `if(!near)return` early-out in registerUpdate.
- **Night herons** (chibi-chunky): body recipe like `flamGeos` `zoo-habitats.js:57` but
  grey-blue body + white belly + BLACK crown cap + yellow legs + dark down-beak; 2 perched
  (merged per color) at `LP_SOUTHPOND.herons.perched`; 1 HUNCHED at the bank
  (`.hunched`) = the DIPPER group `zoo-habitats.js:216-234` (merged body + pivoting-neck
  mesh + beak child) with the strike/stare state machine `:434-447`. Optional soft
  synth "quawk" via getAudioCtx (guard null).
- **Turtles on a half-log**: `LP_SOUTHPOND.turtles` — a `CylinderGeometry` half-log
  (toon `log`) partly in the water + `count` chunky turtle shells (merged `sph`/`box`,
  toon `shell`/`shell2`). Gentle idle bob.
- **Dragonflies**: `pointsGeo(n)` + `pointsMat()` (core.js) + `xs32(seed)`; `LP_SOUTHPOND
  .dragonflies` (n 12, teal color, y in [yLo,yHi] over the water — sample inside
  `LP_SOUTHPOND_WATER`); darting drift + blink in registerUpdate. ONE draw, NOT a bucket.
  Add as a child of the pond group (frustum-culled + distance-culled).
- **Lily pads**: merged ONE-mesh disc scatter (`cricket-hill.js:106-137` pattern) —
  `CircleGeometry(r,9)` rotateX(−π/2) at `waterY+0.02`, ~`lily.pads` near the pond EDGE
  (dist to `LP_SOUTHPOND_WATER` edge < `lily.edgeMax`, inside the polygon), local
  `mkrng(lily.seed)`, toon `lily.color`/`color2`. +1 draw.
- **Paddleboats**: `LP_SOUTHPOND.paddleboats` — green pedal-boat hulls (merged box/prism,
  toon `green`) + one white SWAN (a rounded body + curved neck, toon `swan`) at `spots`,
  each with FREEBOARD + a dark waterline band (`dark`) as a 2nd instance (the 076 law —
  a flush hull reads as a lily-pad side-on). Sit at `waterY`. Static or a tiny bob.
- Import line after `packs/index.js:55`:
  `import './lp-pond-life.js';   // SOUTH POND LIFE — night herons + turtles + dragonflies + paddleboats + lily pads (task 117)`

### Walkability expects + waypoints  →  walkprobe.mjs, waypoints.json
- walkprobe: extend the LP pond block (`~:1799-1809`) — assert: boardwalk control points
  WALK (`lpLandHit && !lpBlockedHit`); pond interior (−30,949)/(−30,930) NOT walkable +
  IS `lpWaterHit`; banks (−49,915)/(−13,948)/(−30,1008) WALK; boardwalk welds continuous
  to the spur (nearest-spur dist < 2.55); no LP_TREES inside the pond; the pavilion
  centre INSIDE the pond (existing guard). Mirror `lpBoardwalkHit`'s use exactly — the
  functions are imported from chicago.js, so just call them. Exit 0.
- waypoints.json: ADD `lp-cafe-brauer` + `lp-boardwalk` (id, area 'lincolnpark', cell
  'lakefront', stand x/z, framings[3], expectation). Stands + candidate framings below;
  the orchestrator will refine framings from shots. Expectation strings below (verbatim-
  grounded in the BRIEF, expanded with the "must read / NOT empty" honesty + the physics
  ruling — NO skyline).

## WAYPOINTS (add to waypoints.json)
- `lp-cafe-brauer` stand (−49, 920). Framings: {yaw −2.3, pitch 0.12, dist 8} hero
  (Brauer E/S face + loggia + green hip + towers + clock, paddleboats right); {x −18,
  z 940, yaw −2.25, pitch 0.08, dist 10} across the water (paddleboats + loggia + reeds);
  {x −47, z 900, yaw 3.0, pitch 0.1, dist 7} the north loggia arm along the shore.
  Expectation: "CAFÉ BRAUER on the pond's north shoulder (task 117): a grand two-storey
  Prairie-School refectory of warm red brick under a broad GREEN-tiled hip roof with
  twin roof lanterns, a green-glazed geometric frieze band below the deep eaves, tall
  arched sage-framed windows glowing warm, a round clock on the pond face, and TWO open
  brick-pier loggia arms embracing a terrace above the water; GREEN and white swan-shaped
  paddleboats cluster on the dark algae-green pond below. Reads as a grand civic pavilion
  (brick mass + green roof + loggia), NOT a shed; paddleboats sit ON the water with
  freeboard. (No downtown skyline — the physics ruling.)"
- `lp-boardwalk` stand (−18, 938). Framings: {yaw −0.5, pitch 0.05, dist 8} down the deck
  toward the pavilion (deck + dark rail + reeds + pond + pavilion arch — aim ~20° off so
  the mayor doesn't occlude the arch); {x −20, z 950, yaw −1.2, pitch 0.06, dist 7} the
  pavilion arch closer; {x −16, z 962, yaw −2.4, pitch 0.05, dist 9} back N up the deck
  (rail + reeds + a heron + Brauer far). Expectation: "THE NATURE BOARDWALK (task 117): a
  low wood boardwalk on pilings, dark cable rail on the water side, runs across a
  naturalized pond thick with golden prairie grass, cattails and lily pads; an open
  laminated-timber HONEYCOMB PAVILION — a curved wooden lattice tunnel-arch of stylized
  hexagonal cells — curves over the water at the bend (you can walk under it); chunky
  black-crowned NIGHT HERONS work the green shallows (a couple perched, one hunched at
  the bank) and turtles bask on a half-log. Reads as a living restored wetland — the deck
  + rail lead the eye to the pavilion arch, the herons READ chibi-chunky — NOT an empty
  pond. (No downtown skyline — the physics ruling.)"

## VERIFY (orchestrator runs; every executor self-checks first)
`node tools/tmp-117-datacheck.mjs` green · `/verify` (build one artifact, walkprobe exit
0, path-layers, det spawn ≈ baseline) · `node tools/walkthrough.mjs --ids lp-cafe-brauer
lp-boardwalk lp-farm lp-zoo-loop` · READ every PNG · draws ≤480 each · canary echoes ·
zero console/page errors.
