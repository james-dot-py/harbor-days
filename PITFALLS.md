# PITFALLS.md — hard-won gotchas (all cost real debugging time)

Read this before every task. Append new entries when a bug costs more than a
few turns to find; keep each to one line of symptom + fix.

- r128 toon/basic materials IGNORE InstancedMesh.setColorAt: bucket instances
  into one InstancedMesh per color.
- Teleports swoosh the follow-cam across the map: set the exported camCtl.snap
  flag (main.js).
- Pocket sets outside the active cell's clamp eject the player: make pockets
  their own cell.
- Elevated walk rects adjacent to streets act as elevators via the 0.5 step-up
  threshold: enclose them so only ramps connect levels.
- chargeThrow releases on KEYUP, not second press.
- Framework toasts hold ~3 s each: never queue per-event toasts in fast loops.
- NPC culling: makeNPC hides >145 m; free perf, and why far NPC clusters are cheap.
- walkprobe + main.js must share walkability definitions: put them in the data
  module.
- Tools default to PORT 5173 and will screenshot the wrong session's game:
  always pass the parsed port; always canary-check first.
- Headless WebGL may run on SwiftShader: fps is advisory, draw calls are the gate.
- Displaced hard cells have cell-local x-frames (Wrigleyville: x = −140 −
  (Waddr − 950), true projection ≈ −600): never validate a cell's x against the
  true projection; record per-area offsets in osm.json provenance.
- village.js add() SNAPSHOTS a Group's meshes into the static merge pool at
  call time: add(g) BEFORE populating g renders nothing (bar facades/neon and
  stall structures were invisible for two full runs — only their instanced/
  direct-add parts showed, floating against the backdrop band).
- Stale-cache variant of the 5173 trap: a long-lived dev server serves stale
  HMR-cached module transforms (main.js missing freshly added exports while
  world content looked current) — probe tools must spawn their own vite.
- TWO Claude sessions can share this worktree (a resumed prior-task session
  overlapping the next task's session): files change under your executors,
  commits/pushes/result.json land mid-task, and each session attributes the
  work to itself. Before close-out, re-check git log + result.json provenance
  and re-verify tree state against what you actually reviewed.
- gen-waypoints feat() does NOT clearance-filter: a feature ON a corridor edge
  (knothole, wall signs) snaps the stand onto itself and parks cameras inside
  the wall — use featW with an explicit stand out in the street.
- insidePoly(x,z,inset) tests the point MOVED inset toward home plate: a big
  inset (3.0) accepts points ~inset outside the wall (the RF foul pole landed
  in the Sheffield sidewalk). Bound placement overshoot with inset ≤ 0.5 —
  or better (task 012, seats floated over the Gallagher notch at inset 2.2):
  require STRICT containment AND the clearance, pip(x,z,POLY) && insidePoly(x,z,c).
- A lone DoubleSide canvas plane shows MIRRORED text from behind; light
  textures hide it, and a dark retexture surfaces it (Addison platform signs,
  task 010). Free-standing signs = back-to-back FrontSide pairs (village.js
  twoSided(); pairs inside one InstancedMesh cost no extra draw).
- Hand-authored waypoint framings bypass gen-waypoints' camBlockedW clearance
  filter: to shoot a Waveland ROOFTOP the follow-cam sits `dist` SOUTH of the
  player, which parks the camera INSIDE the stadium (its cream Waveland face
  fills the frame). Stand NORTH near the brownstones (z≈−566, not −550) so the
  camera clears the stadium, then tilt up (task 011). Prefer featW/pickW.
- A wall-mounted QR inside the L car cannot be shot head-on by the follow-cam:
  the mayor is pinned to frame-centre (occludes a centred QR) and the centre
  grab-pole column blocks any off-centre head-on line. jsQR also FLAKES at ~20°
  oblique in the toon+world-curve render (identical configs decoded then didn't,
  run to run — the mayor's idle sway tips a marginal QR). Fix that shipped
  (task 011): a big QR (canvas mod ≥12), the camera just NORTH of the pole row
  so poles fall behind the lens, SIX framings, and a MULTI-SCALE decoder
  (tools/decode-qr.mjs resizes 0.5–2× — jsQR scans the whole frame and misses a
  small QR at native res). A billboard framed near-normal decodes trivially;
  reserve the fight for interiors.
- Any HUD addition shifts the canonical spawn (baseline.png): the task-011 ♥
  button adds ~0.12%, under the 0.68% gate, but regen anyway with a
  canary-verified OWN-vite shot (never the foreign :5173 server — it served a
  stale "harbor days · v0.9" build with no ♥) + commit [baseline-regen] +
  the baseline.png change so future diffs stay clean.
- r128 InstancedMesh sets frustumCulled=false IN ITS CONSTRUCTOR (and fogcull
  exempts it): every instanced bucket is drawn in EVERY view, everywhere on
  the map. Budget instanced draw calls as GLOBAL adds, not per-view — which
  also makes bucket-count == draw-call-add exactly (task 015 measured 39/39).
- The "empty" lakefront lawns are not empty: TRAIL_MAIN runs x≈44-58 through
  z −45…−300, and packs pin fixed tableaux (volleyball net 95,215; market cart
  32,−70; toddler zone 46..60×−126..−110; badminton courts 105/255, 55/60,
  38/−290). Grep pack coords AND trail polylines before placing anything —
  task 015's demo row landed on all three before finding clear ground at
  x 48-127, z 193-220.
- BACKDROP_W.bands (data) and streets.js bandDir are INDEX-COUPLED: adding a
  band without appending its facing dir crashes buildStreets (dir undefined) —
  change them in the same edit.
- OSM stadium/arena footprints are often RELATIONS, not ways: osm-fetch's way
  queries miss them silently (Wrigley Field absent from 747 fetched buildings,
  task 020). The fetcher now pulls leisure=stadium + building relations and
  clips outer members like water bodies.
- village.js emitStatic buckets by MATERIAL ONLY and mergeBufferGeometries
  aborts the whole bucket on mixed attribute sets: a hand-built position+normal
  BufferGeometry sharing a toon color with UV'd BoxGeometry silently dropped
  ALL of that color's geometry (task 019 banding). Give hand-built strips a uv
  attribute; mergeCellStatic (cells.js) is tolerant — it sub-buckets by
  attribute signature.
- Held-prop group orientation: rotation.y=+PI/2 maps local +X to -Z (BACKWARD
  relative to a +Z-facing rig) — the sax busker's "bell -> forward" comment
  claimed the opposite for a full version (issue 006). Never trust a builder
  comment for a yawed prop frame; screenshot from the character's facing side
  and LOOK.
- A pack's distance-CULL sign flip hides its content everywhere and reads as
  "nothing renders": the north-lakefront POIs sit at NEGATIVE z, so a cull
  `(pl.z - 388)**2` (instead of `+ 388`) makes d2 always huge → every bird was
  culled at the deck, yet draw calls looked plausible (they were the true
  no-bird baseline) and NO console error fired (task 025 — cost ~an hour chasing
  "invisible birds"). When new content won't render but the code "looks right",
  instrument the live count (`window.__x = ...` + page.evaluate) BEFORE tuning
  geometry/size/density; and sanity-check every `pl.z ± <z0>` against the POI's
  actual sign in GEOGRAPHY.md.
- Small toon birds/props DON'T READ at zone distance (deck→clearing ~15–50 m):
  a realistic 0.15 m songbird is a few pixels lost among wildflowers. For "reads
  busy" hero views, go chibi-chunky (BIRD_SCALE ~2.5), CLUSTER perches into the
  view's focal clearings (weighted, not uniform over the whole room), and seat a
  couple eye-level on the near rail — count alone at true scale never reads.
- pathSamples is PHASE-sensitive, not just content-sensitive: trees scan it at
  stride 3, so reshaping/reordering/deleting ANY ribbon shifts every later
  ribbon's sample indices -> different subset checked -> tree-rejection rng
  cascade -> global scatter drift. Reshaping a ribbon = keep the OLD ribbon's
  samples as a byte-identical GHOST at its original build slot (task 023:
  TRAIL_LOOP_GHOST + paths.js sampleGhost) and register the new shape in
  pathSamples2 (merged into pathSamples in main.js only AFTER buildProps).
- Rotating a cell/pocket root whose children sit at ABSOLUTE world coords pivots
  about the WORLD origin, not the geometry: a child at world x heaves vertically by
  |x|·sinθ. The Red Line car (children built at CAR.x=-250) turned a 0.004 rad
  "gentle sway" into ±1 m of cabin heave — measured 2.011 m peak-to-peak — read by
  the fixed player as bouncing (issue 009 / task 027). Fix: put an inner pivot
  group POSITIONED at the geometry centre and build children in LOCAL coords, then
  rotate the inner group (heave dropped to 0.023 m). Any sway/roll on a displaced
  cell must rotate a locally-centred group, never the far-from-origin root.
- A short-label canvas sign helper CLIPS a long word to its middle: reusing
  diverseyBoardTex (96px canvas, 34px font, built for '50'/'100') for 'MINI GOLF'
  rendered as 'NI GO' (task 028). Word-signs need their OWN wider canvas + a
  fitted font; make them FrontSide facing their approach so the back never shows
  the mirrored-text artifact.
- Bay/pocket INTERIOR chase-cam framing (task 028): looking OUT the open front
  reads best at SHORT dist (~4) + near-LEVEL pitch — the camera stays inside the
  pocket and frames the mayor + the opening. Longer dist parks the camera
  OUTSIDE/behind the shell staring THROUGH stacked deck slabs + frame beams
  (banded yellow/gray), and low positive pitch stares down at the deck floor (a
  flat yellow wall). Axis-aligned yaw, short, level — like the L-car interior.
- Headless touch taps MISS the rising-edge action latch: page.touchscreen.tap
  fires touchStart+touchEnd within one frame gap, so framework `_touchAct` flips
  true->false before any rAF samples it -> the interaction's actPressed edge never
  fires and onUse never runs (the tap looks dead). act.mjs `tap`/`tapSel` HOLD
  ~160ms (touchStart · wait · touchEnd) so >=1 frame observes the press; also pass
  `--mobile` (390px hasTouch viewport) or body.touch never turns on (task 026).
- "+0 draw calls by cached toon color" requires the color to already be in the
  STATIC merge pool — a color consumed ONLY by an InstancedMesh (mergeCellStatic
  excludes those) opens a NEW merged bucket (task 033: the placard back reused
  the blade-pole 0x2b2b30 = +1 draw; switching to the dressing downspout
  0x2c2620 folded to +0). Check the color's consumer TYPE, not just its
  presence. Also: teaser/sign boards at a barricade mouth must sit OFF the
  centerline — every mouth has a CPD officer NPC standing there who blocks the
  head-on read.
- Free-standing SIGNS have TWO systemic quality failures — audit BOTH on every new
  sign builder (task 032 swept all of them): (a) a lone DoubleSide canvas plane reads
  MIRRORED from behind — fix with back-to-back FrontSide planes. To keep draw calls
  flat: for an InstancedMesh DOUBLE the instances (half rotated PI) — still 1 call
  (Divvy sign); individual meshes just add a second FrontSide mesh (frustum-culled);
  where one side backs a wall/tracks use FrontSide + a solid rear (BackSide same
  transform works for any tilt — PEQUOD'S lid). (b) a support POST at the panel's
  center-depth + full height BISECTS the text (honorary blades, RED LINE pylon,
  Diversey boards — issue 014): END the post at the panel's BOTTOM edge (lollipop),
  or offset it behind a single-faced FrontSide panel (makeSign, mini-golf, CPD).
  Two-sided readable signs can't hide a central post "behind" — shorten it instead.
- An enclosed pocket that hides its own gameplay payoff needs a SESSION camera,
  not a chase tweak (task 037 / issue 015, Topgolf bay swing): a pack OWNS the
  camera inside its registerUpdate (which runs AFTER main.js positions the chase
  cam — the nature.js binocular precedent), overriding camera.position/lookAt for
  the duration. The non-obvious trap is the upper-deck ceiling SLAB (y≈3.1,
  spanning the whole bay depth z 279.8–285.6): a camera SOUTH of the slab's north
  edge looking UP at a high ball has its sightline cross y=3.1 UNDERNEATH the slab
  → the ball is occluded by the ceiling. Keep the anchor FORWARD (camZ ≈ hit.z+1,
  ~1 m south of the tee) and LOW (y≈2.0) so every arc's sightline crosses y=3.1
  NORTH of z=279.8 (clear air). The bay's front SCREEN + the mayor both sit at
  bay-centre x, so a lateral offset can't separate them — accept the OTS shoulder.
  Release cleanly by reconstructing main.js's chase pos (player − (sin,cos)yaw ·
  cos(pitch)·dist, height (py+1.6)+sin(pitch)·dist) and lerping onto it over ~0.5 s
  before dropping the override — main.js's camPos has tracked there all along, so
  the handoff has no snap-pop.
- NEW street-level mass invalidates previously-clear hand-authored framings: the
  034 viaduct bent column (x −146.6, z −408) landed exactly where wv-photo-arrival
  f0's pull-back camera sat — maroon steel filled the whole frame. After adding
  any curb-line/roadway structure, re-walk every waypoint whose camera pulls back
  through that block (hand framings bypass camBlockedW, and camBlockedW's VOLS_W
  doesn't model new builder geometry anyway).
- Wikimedia filenames differing ONLY BY CASE (Bp_bridge.JPG vs BP_Bridge.jpg)
  silently merge on Windows's case-insensitive filesystem: refs-fetch's second
  download OVERWRITES the first file while the manifest keeps both entries —
  files-on-disk < manifest entries, and the surviving content is whichever
  downloaded LAST (task 039). After any fetch, count files vs manifest entries
  and prune the stale entry (tools/mp-manifest-prune.mjs).
- The lakefront SKYLINE BILLBOARD is GLOBAL: sky.js adds it at scene level BEFORE
  beginCellCapture (never hidden on cell swap), its materials are fog:false (never
  fog-culled) and its fill bands are InstancedMesh (drawn in EVERY view). After its
  2.2x group scale it occupies world z 504..676.8, x −264..297 (exact extents replay
  its local mulberry32(0x5c1000): tools/tmp-billboard-extent.mjs). Any southern
  (downtown) cell must keep ALL its geometry at z >= 680 or towers interpenetrate
  the billboard boxes — the millennium cell region was finalized z 680+ for exactly
  this (task 040, GEOGRAPHY.md MILLENNIUM_GEOGRAPHY liberties).
- A cell's GRADE-LEVEL ground carpet (a big y≈0 lawn/fill plane) OCCLUDES any
  SUNKEN feature beneath it from above: the Millennium subway stair pit (floor
  y −3.2) AND the McCormick sunken cafe terrace (floor y −1.6) both rendered as
  plain lawn until the carpet was CARVED around their footprints (task 041 — cost
  a fix cycle; the cafe bug hid behind the balustrade, which read fine, so it
  looked done). Retaining walls at the rim don't help — the top plane still
  covers the void. Fix: tile the carpet as quads that skip the hole rects
  (index.js `paveRegion` scanline split handles several disjoint holes). Any
  sub-grade pad (Crown pool, Lurie rill, future areaways) needs the same carve;
  verify with a DOWN-pitched framing that looks INTO the void, not a level one.
- A SMALL vertical geometry change is invisible in a distant side view: lowering a
  deck ~0.3 m to sit flush on grade moved it only ~20 px at ~13 m, reading as
  "unchanged" — task 038 nearly re-chased a phantom HMR-staleness bug over it (a
  fresh vite confirmed the code WAS live: the corner-pier fascia had appeared, only
  the finger deck's height looked the same). Verify height/vertical edits with a
  CLOSE, LOW, near-level framing (dist ≤ 6, pitch ≈ 0) where the deck-vs-grade
  seam fills the frame; a wide zone overview won't show a sub-metre drop.
- baseline.png goes STALE as accepted tasks accumulate: by 043 the spawn view
  diffed 2.1% against the task-023 capture with NO regression present — inherited
  drift reads identically to a fresh one. Triage without git stash (blocked on this
  host): two same-code shots give the temporal noise floor (~0.1%); comment out the
  new feature's wiring lines and diff WITH vs WITHOUT (043 measured 0.135% ≈ noise).
  Then regen the baseline from a canary-verified own-vite shot + [baseline-regen]
  commit so the next task diffs clean.
- Extending a MULTI-destination ride (Red Line 2→3 stops, task 042): arrival
  flavor keys off the DESTINATION, but the boarding pull-in keys off the
  ORIGIN — the 2-stop code conflated them (`dest==='lakefront'` was a stand-in
  for origin===Addison, the only Belmont-bound board). With 3+ stops read
  origin = `activeCell()` at boarding and gate `forceApproach` on it; gate the
  arrival train / `say` / toast on dest. Boarding zones are pure-distance
  interactions and the three cells are coordinate-disjoint, so one stop's zones
  never fire in another cell — but space same-stop zones ≥ r+1.1 apart or two
  prompts fight. (The stated "ride the L to other neighborhoods" future re-hits
  this.) Aside: never identify a cell from a screenshot — a lakefront lawn read
  as Millennium; confirm via `__hd.scene` cell-root `.visible`.
- Toon SILVER/steel reads GREEN as foliage at grazing/underside angles: a
  MeshToonMaterial curved shell picks up the hemisphere light's GREEN
  ground-bounce (core.js `amb` groundColor 0x8fc98e, intensity 0.9) on its many
  down/near-horizontal faces, so a stainless form (the Pritzker ribbon petals,
  task 044) reads as an aloe/agave plant no matter how warm you push the base
  color — the light, not the color, is green. Fix: render copyright-homage
  STAINLESS self-lit (`bmat`, the Bean's sanctioned escape from the toon ramp)
  with a painted brushed-steel map + two-tone tints — no lighting means no green
  and a consistent metal read at every angle; the SOLID (thick, capped) shell
  geometry carries the form that the lost toon shading would have. Reserve toon
  for matte/vertical faces that mostly see sky+sun. Crown Fountain's glass-block
  towers (045) and the BP bridge stainless shingles (046) inherit this exactly.
- A pair of tall towers at the ENDS of a short pool breaks the down-axis money
  shot two ways (Crown Fountain, task 045): (a) a camera on the tower centerline
  looking down the pool has the NEAR tower FILL the frame (blocks the pool, the
  far face, everything) — the 040 stands sat SOUTH of the pad and stared into
  the near tower's back once it was built; and (b) a spout arc that travels
  ALONG the view axis foreshortens to a vertical DRIBBLE (the z-travel projects
  to nothing head-on). Fixes: frame the axial FACE shots from IN the open pool
  BETWEEN the towers (near tower behind the camera); make the "two towers +
  arc" establishing shot an OBLIQUE 3/4 from a pool corner (big amber near
  tower + far face tower — the reference night-photo composition), where the
  arc reads side-on and curves. And make BOTH towers spout SIMULTANEOUSLY so
  every fresh-load framing (walkthrough reloads per shot, clock from 0) catches
  a spitting face at one wait — alternating left half the framings looking at
  an idle tower while the other's arc smeared confusingly across it.
- gen-waypoints camWarnM/camPosM models camera y as an ABSOLUTE ~1.7
  (1.6 + sin(pitch)·dist), NOT surface-relative — so any VOLS_M volume whose
  yMax is above ~1.7 FALSE-WARNS "[mp-clearance] may sit inside a volume" for a
  camera standing ON an elevated deck (BP crest y5, task 046) looking down the
  deck BETWEEN flanking parapets: the camera is genuinely on-deck and clear,
  but the model thinks it's at y1.7 below the parapet top. Advisory only
  (non-fatal, gen-waypoints still writes). Model elevated parapets as OUTBOARD
  boxes off the deck centerline and VERIFY the actual down-deck shot rather than
  tuning the coarse volume to silence a truthful proximity flag.
- A held prop parented to a chibi's parts.handR uses handR's LOCAL frame, so a
  positional offset authored as if it were GROUP-local flings the prop far: a
  wedding camera at handR-local (0,1.95,0.42) landed on the plaza a body-length
  away (task 047). Rule: attach a FIXED-pose prop to the NPC GROUP at ~face/hand
  height (bean-visitors precedent — the group tracks the mover's position+facing
  so the prop stays put); reserve handR ONLY for a prop that must follow an
  ANIMATED hand, and keep its offset SMALL (a conductor's baton at handR-local
  (0,0.24,0) rides the hand fine; a large offset does not). Also: makeNPC's
  setFace (happy/surprised squint) is a NO-OP without palette face:true — the
  eyes fold into the head merge otherwise (+1 draw buys a live eye mesh).
- Chase-cam framings occlude the SUBJECT behind the mayor whenever yaw points
  straight AT it (the player sits dead-centre at `dist` ahead of the camera):
  aiming a shot at the Pritzker conductor / the station grate / a small NPC put
  the mayor exactly in front and hid it (task 047, cost a whole framing pass).
  Fix: stand BESIDE the subject and aim yaw at a background point so the subject
  falls ~25-40° off the view axis — the mayor stays centred on empty ground and
  the subject reads clear to one side.
- A HARD CELL leaks into the lakefront WATER fallback: main.js isWater() knows
  only LAND/walkRects/beach, so ANY non-walkable spot in a hard cell (Wrigleyville/
  Millennium planting, the Pritzker stage apron) reads as open water and MOUNTS
  THE JETSKI — the owner "sank through downtown and rode a jetski" (issue 017,
  task 048). Don't chase individual holes: guard the CLASS — `isWater()` returns
  false whenever `cellWalk()` is non-null, so a hard cell's non-walkable = BLOCKED,
  never water. A cell then answers walkability definitively everywhere in its
  clamp; a 2 m grid sweep (tools/mp-gridsweep.mjs, non-walkable cell with ≥6/8
  walkable neighbours) enumerates any remaining interior gaps to close by data.
- Baked "reclining figure" crowds read as JELLYBEANS, not people: pritzker's
  merged sphere-lump loungers (torso+head+knees spheres per clothing color) looked
  like colored capsules on a blanket — the owner flagged "must be REAL PEOPLE"
  (task 048/0d). The lawnlife REGISTER is the fix and it's cheap: createChibi →
  poseSeated (copy the helper) → registerBumpable(group,parts,lines) → bakeChibiRig
  = a posed chibi that reads as a person, opes up close, and folds to ONE draw.
  A few makeNPC(staticLod) standees add live rigs near + 1-draw baked twins far
  ("baked LOD twins only at distance"). Register the bumpable BEFORE baking (the
  anchor is captured at registration, then reads only group.matrixWorld).
- Piecewise-per-NODE deck planks JACKNIFE at the segment joints (BP bridge
  "treads not following the serpentine", task 048/0c): placing planks with each
  straight piece's constant quaternion snaps their yaw at every node. Fix: sample
  a THREE.CatmullRomCurve3 through the nodes and orient each tread by
  getTangentAt(t) (basis: tangent, world-up-projected-perp, their cross) — the
  treads sweep smoothly around the curve. Keep the plank half-span ≤ inner-parapet
  lateral so no tread clips the balustrade on the turns.
- Facade dressing hung on a pit wall by PLAN coordinates can land INSIDE the
  wall box (the rink's Park Grill awnings/windows/sign at x 75.33-75.58 sat
  buried in the 75.1-75.6 cream wall — only sloped awning tips peeked out, task
  049); and even once outboard, anything below rim-height MINUS the boards
  height is invisible from the pit floor (the 1.05 m boards hide the wall's
  lower band from every on-ice view). Hang facade detail off the wall's exposed
  FACE plane, put the must-read band in the top strip, and verify with a low
  from-the-floor framing, not plan math.
- A pack's onWorldReady that resolves ANOTHER cell's root via getCell() can run
  BEFORE that cell is registered: cells are registered inside their OWN pack's
  onWorldReady (packs/wrigleyville.js → buildWrigleyville → registerCell), and
  callbacks fire in packs/index.js IMPORT ORDER. wrigley-ride (line 27) runs
  before millennium (line 37), so `getCell('millennium').root` was undefined →
  threw. And onWorldReady wraps each callback in try/catch → console.WARN (not
  console.error), so the throw is INVISIBLE to the canary/NO-ERRORS gate — the
  Belmont pylon built (before the throw) while the departure boards + the whole
  registerUpdate silently never ran (task 051, cost a diagnosis cycle; the eval
  `__hd.scene` traverse found only the pylon panels). Two fixes: (a) don't
  eagerly getCell() a later-registered cell at onWorldReady — DEFER the work to
  the first update frame (registerUpdate one-shot flag), by when every pack's
  onWorldReady has run and all cells exist; (b) when new content won't render
  but the code looks right and NO error fired, suspect a swallowed onWorldReady
  throw — grep console.warn output or traverse the scene graph to confirm the
  meshes exist BEFORE tuning geometry.
- NEVER put canvas TEXT in a shared texture ATLAS next to live regions: headless
  Chromium lacks Georgia and its serif fallback measures ~35% wider, so a
  centered fillText spilled past its region into the gold strip — every
  base/pier face wore a "TO T" hat while the uv math was provably correct
  (task 050 burned a full diagnose loop; tools/tmp-atlas-dump.mjs-style canvas
  dump settled it instantly). Text gets its OWN canvas + measureText-FITTED
  font (the 028 word-sign law), atlases stay letter-free with padded regions,
  and when a texture bug defies uv math, DUMP THE CANVAS to a PNG and look.
- A "mayor SINKS INTO it" report is a WALKABILITY bug, not a geometry-cosmetics
  bug — fix the walk data, never just nudge the mesh (issue 020 / task 052).
  A prior pass "fixed" the Gallagher office black base band by ROTATING it to
  the building frame; that cleared the OWNER'S ONE reported coordinate but a
  footprint-vs-walkableW grid probe still found 36 walkable points UNDER the
  band. Cause: the building's CIRCULAR collide(cx,cz,11)
  never covered the 24×24 SQUARE footprint's corners (~17 m out), and walkableW's
  plaza wedge + Clark para both extended UNDER the rotated south corner (which
  pokes ~2 m past the z=-520 walk boundary). Real fix: carve the rotated
  footprint OUT of walkableW in the shared data module (inOfficeBlock → false),
  so engine + walkprobe stay lockstep and the building reads SOLID. Rule: a
  circular collider can't seal a rectangular building; when a report says "sink"
  or "clip through," probe the whole footprint against walkableW, don't trust a
  screenshot of the single reported spot. (Also: never close a sink report by
  reproducing only the owner's exact x,z — sweep a grid.)
- Arc-chord boxes on a radial ring: rotY(ψ) maps local +X → (cosψ,0,−sinψ), so
  a box whose LENGTH is along X lies TANGENT at bearing θ with ψ=θ — ψ=θ+π/2
  runs it RADIAL (task 055: the ivy wall rendered as green PILLARS on brick and
  the low wall saw-toothed; stadium.js's exterior wallSegs carry the same +π/2
  and hide it inside the bleachers). And per-chord boxes whose radius tracks a
  VARYING ring (rWall(θ)) expose lit END-FACE slivers that read as floating
  shards — build rows/floors as continuous riser+tread ring STRIPS sampled from
  the same data functions the walk surface uses (bowl.js seat strips).
- A dev-spawned SHOT of a pursuit NPC is timing-coupled: page-load game time
  varies ~2.6–5.5 s (cold vite loads run longest), so a chase-trigger stand too
  near the pursuer gets TAGGED pre-screenshot and the frame is post-eject BLACK
  (task 055 wb-chase v1 stood 26 m out; tag ≈4.2 s). Stand ≥~40 m of chase path
  (tag ≥6 s) so every load catches mid-pursuit — and aim the yaw ~0.4 rad OFF
  the pursuer's bearing or the mayor pins dead-center in front of him (the 047
  occlusion pitfall applies to MOVING subjects too).
- A cell sub-builder that reads an index.js EXPORT at MODULE TOP LEVEL hits a
  circular-import TDZ and crashes the WHOLE app at load: index.js imports the
  sub-builder (maggie.js) BEFORE its own `export const COL = {...}` initializes,
  so maggie.js's module-scope `const C = { lawn: COL.lawn }` threw "Cannot access
  'COL' before initialization" (task 058). The crash aborts main.js before its
  canary echo — so it masquerades as the foreign-:5173 canary trap (walkthrough
  reported "canary FAILED"); `npm run build` and walkprobe both PASS (neither
  executes the builder). Diagnose by loading the page on an OWN strict clean port
  and reading page.on('pageerror'). Fix: only reference an index.js export INSIDE
  the build function (runs at onWorldReady, after init), or inline the literal
  values. Rule: sub-builders touch shared index exports at CALL time, never at
  module scope.
- An OSM way's ENDPOINTS are its ordered first/last NODES, never its bbox
  corners: the 039 brief cited the BP bridge "launch (172.6, 787.9)" — a
  bbox min/min corner — and the 046 deck shipped on that wrong line; the
  real way STARTS at (172.6, 834.9), runs north, and crosses Columbus at
  z≈790 (47 units off). Dump the ordered point list (tmp-grant-inspect geom)
  before citing any endpoint or bearing from an extract.
- `Object.assign(new THREE.Mesh(...), { position: v })` THROWS in r128 —
  Object3D.position is a getter-only accessor — and framework.js's onWorldReady
  try/catch downgrades the throw to console.warn, so ONE bad line killed the
  whole millennium cell build while every error gate stayed green (task 060:
  the z>700 dev spawn quietly fell back to the lakefront jetski; shot.mjs saw
  zero console.errors). Symptom to trust: a deep-cell spawn landing on the
  lakefront = the cell builder threw. Diagnose with tools/tmp-warnprobe.mjs
  (own-port load, captures console.warn + pageerror); set transforms via
  .position.set()/.copy(), never Object.assign onto an Object3D.
- tools/shots/baseline.png only compares under its CANONICAL capture params —
  `play=1&quiet=1` at 3500 ms (flake-calibrate.mjs): a title-CLICK start shot
  diffs ~34% against it (intro camera pose + HUD state) and reads exactly like
  catastrophic world drift (task 060 burned a false determinism alarm on it;
  flags-off triage showed the identical 34%, proving it inherited). At canonical
  params the same tree diffed 2.31% — all HUD hint bar, wandering beach NPCs,
  flower AA. tools/tmp-diffmap.mjs writes the diff MAP: read WHERE the pixels
  are before concluding drift. Rule: reproduce baseline.png's exact query
  params before comparing anything against it. SEQUEL: that 2.1% residual was
  itself a DEFECTIVE BASELINE — 059's [baseline-regen] was captured without
  quiet=1, baking the "WASD move ·..." hint pill into baseline.png (the pill
  alone = 95% of the diff, 18,521 of 19,513 px — the exact ~2.1% bimodality
  quiet=1 exists to kill; the non-pill residue was 0.108%, at the 0.117%
  noise floor), and gate check 4 then hard-blocks EVERY later session. 060
  re-regenerated it (fresh-vs-fresh 0.072%). Rule: a [baseline-regen] must be
  captured via the gate's own recipe (flake-calibration.json query+waitMs, own
  port + canary) and crop-checked PILL-FREE (tools/tmp-cropdiff.mjs, band
  ~300,665 680x50) before committing — a defective baseline taxes every
  future session, not the one that made it.
- Union-of-rotated-RECTS walkability on a CURVING deck leaves blocked wedge
  slivers on the OUTSIDE of every bend (the chord cuts the corner) — the owner
  feels it as "stopped every few meters" (issue 023 / task 062). Fix the CLASS:
  walkable = point-to-POLYLINE distance ≤ half-width over DENSE samples of the
  SAME curve the geometry uses (millennium.js `bandQ` + `catmullChain`, circular
  caps at joints, bbox prefilter) — one lane, zero joints. catmullChain must
  replicate THREE.CatmullRomCurve3's tangents exactly (0.5·(p[i+1]−p[i−1]),
  mirrored phantom endpoints) or walk and visuals diverge by the model error.
- Same chord disease in PLAN: walk rects sized to a ribbon's stride-2 SEGS
  chords sit inside the true sampled polyline by the SAGITTA, so the visual ice
  edge overhangs blocked ground (26 gridsweep holes that "shouldn't exist",
  task 062). When walk data and visuals sample the same curve at DIFFERENT
  strides, cover the sagitta with explicit shim rects — or sample both at the
  same stride.
- collide() is NOT y-aware by default: ground-level colliders (Nichols piers,
  trench balustrade feet) block the player walking the ELEVATED lane above
  them — free-floating "stopped by nothing" on bridges. Pass the height param
  (collide(x,z,r,h) ignores the collider once player.y > h) for anything that
  lives UNDER a deck (task 062).
- Centroid-RADIAL "outward" scatter on a NON-CONVEX loop runs ALONG the curve
  at concave stretches (the centroid direction is tangent there), piling rim
  rocks onto the ice (37 offenders on the ribbon, task 062). Outward = the
  polyline's per-segment NORMAL (flipped by point-in-poly test), and gate every
  placement on clearance against the FULL polyline, not the nearest segment.
- The chase camera needs ~3.5 m+ headroom over an ELEVATED floor: a canopy
  ~0.6 m above head height buries the cam inside the slab (the owner: "ceiling
  too low to see anything", issue 024). And any BIG toon slab seen from BELOW
  reads pea-GREEN (hemisphere ground-bounce, the 044 stainless pitfall's
  ceiling variant) — raised canopies go self-lit bmat. Both bit the Modern Wing
  terrace in one feature (task 062).
- The canvas-plate ATLAS fold (one CanvasTexture, drawImage each sign's canvas
  into a dest rect, merge PlaneGeometries with remapped UVs, ONE
  bmat(0xffffff,{map}) mesh) collapses N one-off sign/banner draws to 1 with
  zero visual change (task 062: AI facade 9 plates + Nichols 3 plates; the
  wrigley sign-atlas precedent generalized — artinstitute.js `plate()/
  flushPlates()` is the copyable pattern). Keep letter-bearing regions PADDED
  and per-sign (the 050 shared-atlas font-spill law still applies), apply
  rotateY/tiltX to the GEOMETRY before translate, and call flushPlates()
  before the pool flush so the mesh joins the cell root.
- Headless shot pages run FAR more game time than waitMs suggests: shot.mjs
  waits networkidle0 + waitMs, but cold-vite transforms + SwiftShader
  contention stretch the pre-shot window past 15 s (055 measured 2.6–5.5 s;
  064 measured worse) — so ANY time-coupled actor can finish its arc before
  the frame: the ump TAGGED every wb-chase shot (post-eject 400-draw exterior
  frames), and the patrolling hot-dog vendor parked INSIDE a concourse framing.
  Fix the CLASS, not the timing: give pursuit NPCs a shot knob that disables
  the TERMINAL transition (?slowref=1 → the ump sprints full speed but pulls
  up 2.2 m short and never tags — every load timing yields a pursuit frame),
  and keep patrol ARCS clear of waypoint stands. Slowing the pursuer and
  deepening the stands both lost to a 16 s page (task 064).
- A "crosswalks are just sidewalks" report can be a SIDEWALK-OVERLAP bug, NOT a
  crosswalk-material bug (issue 018 reopened / task 063): the white crosswalk
  bars were already correct paint, but streets.js's sidewalk slab rows
  (straightWalk/paraWalk) ran the FULL frontage, so at every intersection they
  paved the perpendicular ROADWAY with cream slabs (top y 0.055) that sat ABOVE
  and buried the paint (top y 0.04) — "sidewalks on top of where there should be
  crosswalks." The task brief mis-attributed it to the crosswalk builder's
  material/height; trust the SCREENSHOT and a TOP-DOWN over the brief — the
  top-down showed one street as clean asphalt and the crossing street slab-paved,
  pinpointing the sidewalk rows. Fix the CLASS: carve sidewalk slabs OUT of every
  drivable lane (inRoadLane center test — axis roads ±road/2, Clark diagonal
  ±8 curb-half) so the corridor asphalt (drawn full-width in wrigley/index.js
  buildGround, so no void appears) shows at intersections and the paint reads
  on-road; sidewalks stay only on the corners. Center-point slab filtering leaves
  ~1 m stair-step slop at the curb lines — acceptable at a corner. Keep the whole
  white set (bars + stop lines) in ONE InstancedMesh (draw budget unchanged) and
  do all per-bar wear deterministically (no rng — streets.js's local R lays the
  lamps/hydrants/backdrop and must not shift).
