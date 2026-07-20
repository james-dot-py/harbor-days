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
- A HARD-STUCK player ("can't move at all") can be a COLLIDER WEDGE, not a walk
  islet — and the flood-fill reachability sweep CAN'T catch it (reachability sees
  only walk data, never colliders). The Lolla Columbus arch (issue 025 / task 065)
  had two leg colliders (r0.6 → player-radius 0.94) sitting 0.14 m past the
  walkable Columbus strip (x190-200) into flanking non-walk seams (the lawn's
  x0 202 left a 2 m curb seam); the collider ring pushed the player into the seam
  and every ~0.07 m micro-step out was blocked → frozen. Rule: a collider whose
  ring (r + 0.34) can reach non-walkable ground is a latent trap — keep colliders
  inboard on walkable ground OR close the seam. Reproduce collider traps by
  SIMULATING the movement gate + the specific colliders (tools/tmp-arch-trap.mjs),
  not by reachability (which passed green while the owner was pinned).
- The permanent fix for stuck-anywhere is the ANTI-TRAP ESCAPE in main.js's
  movement gate (issue 025): after the slide + collider push, in HARD cells only
  (gate on `cellWalk()` — the SAME condition as the issue-017 water guard, so the
  lakefront jetski/wade path is untouched), if the spot is unwalkable OR all 8
  probe dirs are blocked, crawl toward the nearest open ground (8 dirs × expanding
  rings, module-const arrays = zero per-frame alloc). It converts any future
  placement/collider trap from a reload into a shrug. Verify it in-engine with a
  synthetic non-walk block: `window.__hd.setTrap({x0,x1,z0,z1})` → the player must
  escape even with ZERO input (tools/tmp-trapbot.mjs). Don't gate it on the
  lakefront — "surrounded by non-walkable" is NORMAL there (wade into the water).
- A straight-line steering BOT walked dead into a 1.2 m gateway POST collider and
  logged a "stall" (task 065): a solid post you step AROUND is not a trap — route
  bot paths BESIDE point colliders (or ±1 the post's z), and read the stall coord
  before believing a walkability regression (the player there was free N/S/W).
- A pack bird PERCHED ON A STRUCTURE (sign, beam) needs PINNED spots, not random
  air-jitter alternates: jitter floats the bird in front of the face, and a perch
  y is the chibi's BODY CENTER (±0.37·size m of body) — y at "the top edge" parks
  the body ACROSS the letter band (071: the Cardinal covered 'SANCTUARY', the
  goldfinch the panel title). Perch at surface + ~0.37·size, alternates on other
  structure points; reserve jitter for foliage/ground birds.
- Prop clearance vs a CatmullRom ribbon must be measured against the SAMPLED
  curve, not the control polyline: the CR bulge put the staged tip scope 0.8 m
  off the loop centerline while control-point math said ~1.4 (071). walkprobe's
  071 (k) block does it right (crSample) — copy that, and expect staged coords
  authored by control-point math to need a nudge.
- A shore-distance water-COLOR field SATURATES in a narrow bulkhead basin: the
  ~31 m Montrose basin sat entirely in the 0-14 m "beach shallows" band (+1.4x
  glint boost) and read as a garish cyan pond with foam blobs (issue 026 / 076).
  Flush bulkheads should NOT feed the color field (beach/revetment shores only —
  coast.js SHORE_SEGS slices seawallLines); and a boat hull floated flush with
  the water (centre y~0.05) reads as a white LILY-PAD side-on — give hulls real
  freeboard + a dark waterline band as a 2nd instance in the SAME InstancedMesh
  (+0 draws, rng untouched). Also: a "frozen" copy of an animated shader
  (uTime never ticked) turns its glint interference into STATIC white patches.
- The lakefront (incl. all of Montrose) has NO anti-trap CRAWL escape — that is
  HARD-cell-only (main.js gates BOTH the crawl AND `__hd.setTrap`'s effect on
  `cellWalk()`, line 145/259). On the lakefront `setTrap` is a NO-OP and any
  non-walkable spot reads as WATER (wade/jetski), so a Montrose trap test asserts
  "never FROZEN" = displacement > ~1 m with input held, NOT the crawl escape
  (task 075 tmp-montrose-bot). The only true FREEZE risk on the lakefront is a
  non-water, non-walkable LAND island (a `pip(LAND)` interior carve — building
  hall, etc.) a collider could push you into; keep colliders inboard (the 052/065
  laws still apply). And a steering bot must ROUTE AROUND data-carved non-walk
  blocks (the roped plover DUNE x210-233 / z-1362..-1414; beach-house hall) — a
  bot path THROUGH one logs a false "incomplete/stall", not a walkability bug
  (065's "route beside point colliders" extends to area carves; the real
  Montrose harbor→beach route goes up the west sand strip x~205 around the dune).
- main.js's per-frame `dt` is clamped at BOTH ends now — it used to be capped
  only ABOVE (`Math.min(0.05, ...)`). The first rAF timestamp PREDATES the world
  build, so frame 1 delivered `now-last` = -(build time): measured at **-3.7 s**
  headless (077). Two consequences, one invisible and one not. Invisible:
  `game.tNow` started seconds in the past — harmless, because every consumer
  reads DIFFERENCES. Not invisible: `camPos.lerp(camTarget, 1-Math.exp(-8*dt))`
  got an alpha of **-7e12** and hurled the chase camera to a garbage coordinate
  it then crawled back from for seconds — an intermittent underground/rolled view
  as the first thing a new player saw. It read as a rare flake because
  `camCtl.snap` masks it whenever it lands on frame 1 exactly (camPos==camTarget
  makes ANY alpha a no-op). If you add a `dt` ACCUMULATOR anywhere, remember this
  class: a single negative frame silently puts your timer in the past and your
  beats never fire (exactly how 077's coach marks failed — `t` sat at -1.6 and
  climbed). Fixing it moved the spawn shot only 0.320% vs baseline (gate 0.828%)
  — no regen needed.
- A running CSS `animation` BEATS a plain `opacity` declaration AND an inline
  `style.opacity` — so a fade-out on an element that also breathes/pulses is
  silently ignored (077's idle stick ghost: `#jghost.gone{opacity:0}` did nothing
  while `jBreathe` looped). Do NOT reach for `!important` or `animation:none`
  (which fights the transition): put the looping animation on a CHILD and leave
  the root's opacity free for the fade.
- `max-width` on a HUD element is a CONTENT-box cap unless you say otherwise: a
  165px cap + `padding:10px 17px` renders 199px and still overlapped the very
  thing the cap existed to clear (077, twice — the prompt pill and the a2hs
  card). Any touch-HUD width computed to clear another zone needs
  `box-sizing:border-box`, and should key off a CSS var shared with the thing it
  clears (`--jzw`) so it cannot drift back.
- TOUCH ZONE ARBITRATION IS NOT ONLY ABOUT THE LOOK-CAMERA. #jzone being a real
  element stacked over the canvas already protects walking from the orbit drag —
  but ANY tappable HUD element sitting over the stick beats it (higher z-index
  wins the hit test; #jzone is only z 15). The interaction pill (z 20,
  `pointer-events:auto` on touch since 026) was CENTRED, so a long label
  ("suggest a neighborhood") spanned x 79-311 against a joystick zone of x 0-195:
  a 116px overlap in the left thumb's arc, where reaching down to WALK fired the
  interaction and threw a full-screen modal over the game (077). On touch keep
  every tap target on the RIGHT with the ✋, and MEASURE it
  (`getBoundingClientRect` of the pill vs #jzone) — a drag coordinate that looks
  safely bottom-left is inside the pill the moment a label gets long.
- PERSISTENCE DECISION (owner directive 2026-07-16, tasks 077/078): the old flat
  "no localStorage" constraint is RELAXED through exactly one door — src/store.js.
  The artifact-sandbox reality is unchanged (bare localStorage ACCESS throws), so
  the adapter contract is: feature-detect ONCE with a real write+read+remove
  probe, NEVER throw (every entry try/catch'd, silent in-memory Map fallback),
  NEVER nag or branch gameplay on availability. The save is ONE versioned JSON
  blob (`ope.save.v1` — dibs/bag/worn/favors/zones/counters/flags), loaded once
  at boot, debounce-written (~600 ms) + flushed on pagehide. It may NEVER
  contain coords or derived world state — only names, ids, numbers — so saves
  survive map reworks (084 moves the whole north shore). Bad JSON / unknown
  version → fresh save, silently. Packs never touch storage directly; they go
  through framework wallet/bag/favors or the whitelisted state-counter snapshot.
- A modal opened by a touch INTERACTION closes ITSELF on the tap's release: the
  pill/✋ path fires onUse in the rAF loop BETWEEN touchstart and touchend, so
  the modal is already covering the screen when the release's synthesized click
  fires — the click lands on the BACKDROP, and a naive backdrop-click-closes
  handler shuts the card the same gesture that opened it (078's kiosk shop;
  repro'd headless at 80/200 ms into the hold). Guard tap-outside-closes on the
  gesture's ORIGIN: close only when pointerdown AND click both hit the backdrop
  (framework.js initDom). Modals opened by a BUTTON's click are immune (the
  open happens on the click itself, so no second click follows).
- A MEDIA QUERY ADDS NO SPECIFICITY, so a two-class rule outside it silently beats
  the one-class rule inside it: `body.touch.hasdibs #hint{top:152px}` (portrait
  intent) overrode `@media (orientation:landscape){body.touch #hint{top:12px}}` and
  stranded the coach hint MID-SCREEN on a 390px-tall landscape phone (079, caught
  only by measuring). Any new `body.touch.<state>` rule that sets a property an
  orientation query also sets must live INSIDE its own orientation query — and be
  measured in BOTH (`--mobile` and `--mobile --landscape`).
- Two HUD elements can occupy the same box for a whole version and nobody sees it,
  because one of them is conditionally revealed: 078 pinned the dibs chip at
  top-left (60/14) exactly where 077 had put the touch coach hint (58/12) and, in
  landscape, exactly on the 📖 button of the relocated utility row — invisible
  until you'd EARNED a dib, which 078's stones payout made rare and 079's
  zone-discovery payout made instant (first seconds of every session). Don't
  eyeball HUD layout: dump `getBoundingClientRect` for every HUD id and run an
  ALL-PAIRS overlap check in both orientations (079's `tmp-079-hud.json` is the
  copyable probe). A rect sweep finds what a screenshot's translucency hides.
- A `.tempty`-style EMPTY STATE inside a `display:grid` container is a GRID ITEM:
  the tote's "just sand in here" sat in ONE 64px column and broke one word per
  line, on every viewport, since 078 — the first thing a new player sees when
  they open an empty tote. 078 only ever shot the tote WITH items. Any placeholder
  in a grid needs `grid-column:1/-1`; and screenshot every card in its EMPTY state,
  not just its populated one.
- Framework TOASTS QUEUE (~3 s each) and wallet's "your first dibs!" gold toast
  lands IN FRONT of the pack's own line on any fresh save's first earn — an E2E
  assert that samples the toast right after the press reads the WRONG toast
  (three separate 080 verify scripts hit this). POLL toast text ≤10 s; and match
  PROMPTS against #prompt's textContent only — body.innerText false-positives on
  tote captions (the boombox caption contains "changes the station").
- An "anywhere" toy with an ABSOLUTE-coordinate safety box is a one-neighborhood
  toy: the skip-pouch's stray-stone net (x 88..262, z 340..-880 — the kiosk's
  neighborhood) silently resolved every throw at the harbor, Montrose, and the
  cells as 'gone' on frame one, with no toast to notice (task 080). Bound flight
  RELATIVE to the launch point. Corollary: ground BELOW the waterline is
  visually water — the dog-beach pond's submerged sand is inside LAND/beachH, so
  an overWaterAt()-only test made stones "clack" invisibly underwater; treat
  gy <= WATER_Y as wet.
- Priority −1 player-FOLLOWING prompts (skip a stone, take a bite, change the
  station) lose the pill to ANY priority ≥0 interaction in range — shop counters
  (r 2.6 at the anchor you spawn on) and WANDERING dogs ('play fetch' walks into
  range between your assert and your keypress). E2E: arm presses ATOMICALLY
  (verify the live pill + dispatch keydown inside one evaluate) and test item
  use from clear ground, not at the counter you bought it from.
- The on-screen joystick VISUAL was never once visible on a real phone until 077.
  `#stick` was `position:absolute` inside `#jzone`, but input.js assigns it raw
  `clientX/clientY` — and #jzone is anchored `bottom:0`, so its top edge sits
  ~42vh down: `top:650px` rendered the stick at y≈1004 on an 844px phone. You
  touched, the mayor walked, and NOTHING appeared under your thumb — the single
  biggest reason walking did not read as discoverable. Fixed with
  `position:fixed` (viewport coords = what the handler already means). A HUD
  element positioned from JS with client coords must be `fixed`, or its offset
  parent silently eats the difference — and no desktop test can ever see it.
- Framework TOASTS QUEUE (~3 s each), so a payoff banner buries behind incidental
  toasts a favor's own STEPS trigger: the Divvy-angel favor wheels 3 strays to 3
  real Divvy docks, each firing a 'DIVVY DOCK N/8' discovery toast, so the 'three
  bikes home safe' turn-in celebration surfaced ~15 s AFTER the moment (082, and it
  read as a failing test for 3 parked sessions). Fix the CLASS: `toast(main,sub,jump)`
  — a turn-in/payoff clears the pending queue and shows NOW (`favors.complete` passes
  jump=true); the incidental toasts already popped the chip, so dropping their banner
  is free. Any "important beat lands late" is a queue-depth symptom, not a missing beat.
- An L-arrival RE-SEATS the player at the boarding board and FIGHTS an immediate
  teleport: an E2E that rides the L then `tele(guy)` + presses E rode the L AGAIN
  ("RED LINE — 95TH BOUND") because the arrival re-asserted the player at the board
  for ~1 s (082 — read as "the pilot favor's delivery is broken" for 3 sessions; it
  works perfectly in isolation, tools/tmp/082-c1-iso.mjs). A real player WALKS from
  board to giver; a teleport test must settle ~1.5 s then POLL the giver's own prompt
  (re-teleporting) before pressing. Never trust a teleport landing right after a cell
  transition — confirm the intended interaction is the ACTIVE prompt first.
- `wallet.pay` EARLY-RETURNS on a zero amount (`if(!(amount>0))return 0`) BEFORE
  setting `paidFirsts` — so `pay({key,first:0})` does NOT register the first (082
  burned a test assert on it). To mark a "signature/first-done" flag you must pay a
  real (>0) `first`. And seeding a signature by writing `save.counters.paidFirsts`
  directly gets CLOBBERED within 3 s: `buildSnap` rebuilds `counters.paidFirsts` from
  `state.paidFirsts` (which the direct write never touched). Set it through the state
  path (`wallet.pay`), never the save blob — the snapshot is one-directional.
- pathSamples2 is NOT a free parking lot for reshaped ribbons: props' tree
  POST-filter (near2) scans ALL of pathSamples2 during buildProps, so pushing a
  reshaped MAIN trail there re-filtered trees its ghost had already cleared —
  removals shifted every later tree's per-tree m32 INDEX and canopies
  reshuffled map-wide (084's spawn diff showed a pink/green canopy swap at a
  tree that "didn't move"). A reshaped ribbon whose GHOST already feeds the
  frozen scans must merge its real samples via a THIRD array
  (paths.js pathSamplesMain) that main.js appends AFTER buildProps.
- store.js flushes the live in-memory save on `pagehide`, so NORMAL navigation can
  never leave a corrupt save behind — a planted-corruption E2E must neutralize the
  outgoing page's `localStorage.setItem` after planting, or the pagehide flush
  overwrites the corrupt value with the still-valid in-memory blob (082 save-integrity
  test). Reassuring property: the corrupt-recovery path only ever triggers on genuine
  external tampering / storage faults, exactly what it exists for.
  FRESH-SAVE corollary (081 re-verify): `localStorage.clear()` on a live page is
  ALSO undone by that page's pagehide flush — the next load quietly inherits the
  "cleared" save (the 081b ceremony ran with a mid-favor to-do it never asked for).
  An E2E that needs a genuinely fresh save must use a fresh browser context
  (puppeteer ≥22: `browser.createBrowserContext()` — `createIncognitoBrowserContext`
  is gone), not clear-and-reload.
- SOURCE-ORDER corollary to the 079 "media query adds no specificity" law: a NEW
  base rule appended AFTER an `@media` block still BEATS an equal-specificity rule
  INSIDE that earlier media query — a media query adds no specificity, so the tie
  breaks by document order and the later (base) rule wins even when the query
  matches. Task 085 appended `body.touch #btnSettings` (portrait: right/top434)
  in a block placed after the landscape `@media`, whose `body.touch #btnSettings`
  (left214) sat earlier — so in LANDSCAPE the portrait rule won and parked the gear
  off-screen at top434 on a 390-tall phone. The E2E's overlap check PASSED (the gear
  was far-right, clear of the left chip) — only READING the rail PNG revealed the
  missing gear. Fix: any orientation override must come AFTER its base rule in source
  order (put a fresh trailing `@media` at the end). And assert HUD elements are
  WITHIN the viewport, not just non-overlapping — an off-screen element trivially
  clears every overlap test.
- A rising-edge keyboard toggle (main.js `keys.has('b')` tote, journal 'j', etc.)
  MISSES a `page.keyboard.press(k)` in a headless E2E: press = keydown+keyup within
  one frame gap, so the frame's rising-edge check sees the key already released and
  the toggle never fires (the keyboard twin of the touch-tap-misses-the-latch
  pitfall). HOLD it: `keyboard.down(k)` · wait ≥1 frame (~150ms) · `keyboard.up(k)`.
- Any feature that animates the mayor or spawns content on a TIMER (idle charm's
  stretch/yawn/sit + ambient critter, task 087) MUST be gated OFF under `?play=1`
  — walkthrough.mjs AND the baseline both load every shot with `play=1`, and
  headless pages run FAR more game time than waitMs (2.6–15 s+, PITFALLS above),
  so an un-gated 20 s idle would pose or SEAT the mayor in waypoint shots at the
  long end and read as world drift everywhere. 087 gates it
  `_idleParam==='0'?false:(play?!!_idleParam:true)` — real players (who click
  start, no ?play) always get it; tooling opts in with `?idle=stretch|yawn|sit|
  fast|1`. Same law as the 087 naming card (hidden under play unless `?name=1`).
  Corollary: to CAPTURE a timed pose deterministically, add a debug HOLD mode
  (`?idle=yawn` freezes the peak) — a cycling animation + unpredictable headless
  game-time means a single shot lands on a random beat (087's first stretch shot
  caught the settle beat, arms down, and read as "no stretch").
- A live-sanitize `input` handler that `.trim()`s each keystroke makes INTERNAL
  spaces impossible: "Sam " → trim → "Sam", so the next letter appends with no
  space and you can never type "Sam O'Brien" (task 087 name field). Keep a single
  TRAILING space while typing (strip invalid chars, collapse doubles, drop
  leading, cap length — but no trim); do the final trim only at SUBMIT.
- A window keydown handler registered in the CAPTURE phase (`addEventListener('keydown',
  fn, true)`) fires BEFORE all bubble-phase window handlers, so it reads the true
  pre-state before another handler mutates the DOM. Task 085's settings-card Esc
  toggle needed this: the framework's bubble-phase Esc closes the tote/shop, so a
  bubble-phase settings handler would then see "nothing open" and pop settings up in
  the same keypress. Capture-phase lets it correctly defer to a card that IS open.
- The 041 grade-carpet law has a COASTAL edition: any surface that dips below y0
  INSIDE the LAND polygon gets capped by the y0 lawn fill — MONTROSE beach's
  slope.ref sat west of the coast line, so a lawn-green strip ran between the sand
  and the water at the EXACT waterline for five shipped tasks (072-087). Nobody saw
  it because every mt-beach framing faced AWAY from the lake — judge waterlines by
  a framing that looks INTO them (088's mt-shore-waterline), and keep beach slope
  refs east of the land edge (walkprobe asserts it).
- r128 setColorAt sizes the LAZILY-created instanceColor from the CURRENT
  count: a pool-style InstancedMesh parked at count=0 before its first
  setColorAt gets a ZERO-LENGTH color buffer and renders BLACK forever — which
  reads exactly like "toon ignores instanceColor" (090 umbrellas, a diagnose
  cycle). Allocate colors while count == capacity (the constructor default),
  THEN park count at 0. Related overlay law from the same task: a translucent
  effect COLORED LIKE ITS BACKGROUND is invisible — fog-bank puffs tinted the
  fog color vanished in front of the fog wall; contrast an overlay against the
  NEAR field (cream over blue water), not the far haze it imitates.
- A canvas SIGN plane EXACTLY coplanar with its backing face z-fights and "flashes
  in and out" while playing (088/issue 027: the kiosk board at apron-face depth,
  0 mm proud). The 032 sign law gains a depth clause: a sign plane sits 0.012-0.03 m
  PROUD of its backing along the normal — and a backing box's dims must PARALLEL
  the sign face (lolla MERCH transposed 2.5 m of backing THROUGH the banner).
  Whole-map layer ordering is now mechanical: tools/path-layers.mjs (y-ladder:
  overlapping pavements >=0.006 apart; markings above their own asphalt, BELOW
  crossing pavements) + tools/prop-clearance.mjs (no tree/prop base on any ribbon)
  both run inside walkprobe — fix data, never silence the tools.
- Rerouting an ELEVATED band (bridge deck) near grade walks: the walkprobe 0.55
  elevator guard measures the band EDGE (±hw, plus the CR curve's bulge past the
  node polyline), not the centerline — a tail that reaches y0.45 ON-centerline at
  the plaza edge still cliffed 1.1 m where the band's side lapped the plaza 3 m
  north (093; a 0.8-threshold datacheck missed it twice). Descend to <=0.6 BEFORE
  the band comes within 1 m of any walkable grade, approach along the grade
  quad's edge (not across its corner), and keep data ramps <=0.55 y per meter
  (the 093 rink ramp at 1.6/2.7 = 0.59 failed; 1.6/3.0 passes).
- fogcull's restore path re-shows ANY mesh carrying a stale `_fogHidden` tag —
  including one a pack ALSO hid in between (task 095: the bird live/baked LOD
  hid a far rig fogcull had tagged during the early camera-settle frames; when
  the graded sanctuary fog eased, fogcull "restored what it hid" and the live
  rig rendered NEXT TO its baked twin, +4 draws/bird, while the pack's state
  said hidden). Any pack that toggles child-mesh `.visible` itself must be
  EXEMPTED in fogcull's selfManaged (name the group — 'chibi', 'bird') — the
  userData.noFogCull flag exists but a name rule covers every child at once.
  Symptom signature: probe shows lodLive=false + BOTH twin and rig visible.
- The chase camera's dist/pitch/FOV are desktop-tuned: a portrait phone keeps
  the vertical FOV, so the horizontal FOV crops to ~24° and the mayor fills 1/3
  of frame height / 42% of width (096 — measure with `__hd.avatarFrac()`, never
  eyeball). The fix is ONE aspect rule in core.js (portraitK/chaseDistK/baseFov,
  exactly 0/1/50 at aspect>=1 so desktop stays bit-identical) — but TWO
  couplings bite: (a) any pack comparing camera.fov to the LITERAL 50 (nature
  binoculars exit) fights main.js's fov lerp forever on portrait — compare to
  baseFov(); (b) a multiplicative dist scale betrays deliberately TIGHT
  framings: the L-car ride (cam.dist 4.5) landed the camera 2.8 m OUTSIDE the
  car's end wall — a cream seat-back wash filled the phone. chaseDistK(d) ramps
  OUT below the wheel-zoom floor (<=5 keeps the exact desktop distance; 5→8.2
  eases to full ×1.65), and packs reconstructing the chase pos multiply
  cam.dist by chaseDistK(cam.dist). Verify every session/tight camera on
  PORTRAIT (--mobile), not just desktop.
- The anti-trap CRAWL does NOT beat a collider RING (097): the crawl picks a
  walkable target and steps 0.28 m/frame; the (previously unconditional) ring
  push (r+0.34) shoved it straight back — a stable oscillation that pinned the
  LIVE player at all 24 seam-post wedges the ring audit confirmed (barricade
  mouths, the beer-garden fence corners, rooftop rails), and the r8 Murphy's
  circle push-CHAINED a sim player 4.6 m into blocked ground — past ESC_RINGS'
  4.2 m ceiling, where the crawl finds nothing. The 065 trapbot never saw any
  of this (it injects a synthetic DATA block, no colliders). SIBLING class the
  live approach-bot then surfaced: ADJACENT posts with interlocking rings (the
  CPD barricade lines: spacing 2.33, ring 1.54) teleport-yank the player
  alternately to each ring's edge — a ping-pong pin on fully WALKABLE ground
  that held input can never beat. Permanent fix, BOTH classes: the push is
  WALK-GATED (pushed-to point must be walkable/water or it is skipped) and
  STEP-CLAMPED (min(penetration, 0.3 m)/frame — above the 0.21 max per-frame
  penetration at top speed, so single-collider feel is identical, but opposing
  overlap pushes cancel and the slide walks free). Closes every cell AND the
  no-crawl lakefront. Re-audit any time with tools/tmp-097-colliders.mjs (ring
  dump + gate-mirroring sim; expect 0 confirmed) + tools/tmp-097-wedgebot.mjs
  (live drive-into-the-wedge approach test, expect all FREE).
- The 091 interact affordance (framework.js: NPC glance + object glints) has a
  probe — `window.__hd.aff()` -> {enabled, glints, ptsVisible, glances[]} — USE
  IT before tuning visuals: both halves were "invisible" on first shots while
  provably running (the glance was a correct-but-subtle 0.55 rad the full-frame
  eye missed — crop-diff the head to see it; the glint was rendering at ~10 px).
  Glint lessons: one additive cream point washes out over bright toon lawns (the
  090 overlay law) — it took a 2-point HALO+CORE (amber halo ~0.85 aSize + warm
  white core ~0.3) to read; and the glint hovers at anchor+0.8 m with depthTest
  ON, so an anchor INSIDE tall geometry (a Divvy dock pylon) buries its sparkle
  — diegetically fine (docks are sign-posted), but don't pick such a spot as the
  demo shot. Glance ownership: applied in updateNPC order BEFORE pack updates,
  so a pack that re-poses heads still wins its frame. Gating is the 087 idle law
  (OFF under ?play=1 unless ?affordance=1) — a waypoint shot can never catch it.
- A modal that previews the CENTER-SCREEN rig may never cover screen center
  (098, owner 2026-07-19): the avatar picker's bottom card cropped the mayor at
  the chest on desktop and swallowed all but the hair on touch landscape. Law:
  side panel (vertical rail, rows = icon+full name) on desktop + touch
  landscape; bottom sheet ONLY on touch portrait, where the 096 framing keeps
  the rig small and high. Also: never ellipsis-truncate card text — wrap
  (white-space:normal + overflow-wrap:break-word); and when a rail can go
  vertical, scroll the selected tile into view on BOTH axes (scrollLeft AND
  scrollTop — the no-overflow axis is a harmless no-op). act.mjs note:
  puppeteer's click auto-scrolls a flex rail to an off-view tile, but the
  landscape rail's 11th row defeated it (CLICK logged at y>viewport, a silent
  no-op — the tile never selected): click a row that's actually visible, or
  pre-scroll the rail in the action script first.
- updateCharacter re-stamps chibi arm/leg rotation.X every frame but NEVER
  rotation.Z (and the rig's rest splay is armR.z=+0.25, not 0): a pack that
  poses a mayor arm z for a timed moment (the 100 Malört toast) OWNS the
  restore on release (the badminton/lolla leave convention), or the arm stays
  twisted for the rest of the session. And +z is OUTBOARD for the +x arm — a
  negative z-roll on a raised right arm swings the fist INBOARD into the
  face/hair (the 100 first cut posed z=−0.5 believing it outboard and buried
  the toast glass in the mayor's afro; the comment's claimed fist coords
  actually matched +0.5). Verify a raised-arm pose by Euler math from the
  template's hl AND a front screenshot — never trust the pose comment.
- `window.__hd.player` is a PLAIN {x,z,y,vx,vz} state object, not an Object3D:
  a tools/ teleport is `__hd.player.x=..; __hd.player.z=..` (+ `__hd.camCtl.snap=true`
  so the chase cam doesn't swoosh — camCtl is on __hd since 101). `.position.set`
  throws undefined. Live camera aim = `__hd.input.cam.{yaw,pitch,dist}`.
- The Edit tool can fail to match a LONG old_string (30+ lines) that is byte-
  identical to the file (verified via od -c) — split replacements into ≤~15-line
  chunks and they match instantly (101, cost ~6 turns on one function swap).
- Movers on a DUAL trail ride offset arc-length tables built from the SAME frame
  helper the ribbons are drawn with (paths.js trailFrame; traillife makeTable
  shift 0 = bike, shift walkOff = walk) — never a re-derived curve (walkCurve's
  stride-8 CR can sag off the drawn centerline on bends). Discipline is gate-
  probed LIVE: __hd.trail positions + __hd.trailLanes drawn-ribbon polylines,
  sampled over N seconds by tools/npc-paths.mjs (gate check 1b) — no node-side
  curve mirror to drift.
- NEVER join two ribbons by OVERLAPPING them ("start B ~10 m before A ends so
  they join with no gap", the 069 Montrose line): two full ribbons at identical
  y double-pave the strip — z-fight band, rectangular edge notches where the
  caps chop off, doubled center dashes (the owner's 2026-07-19 white-fence
  report, task 102). A continuation ribbon SHARES the predecessor's exact
  endpoint in data and ribbonOn splices it via pathgeom.joinSeam (mitered
  shared seam edge; hard kinks fall back to a paved junction disc sized to
  cover the overlap wedge). tools/path-continuity.mjs asserts all of this
  map-wide inside walkprobe — fix data/geometry, never widen its tolerances.
- A gate tool that MIRRORS engine geometry with its own reimplementation
  measures fiction the moment the engine changes: 102's draft gate carried a
  foldClamp edge-repair while paths.js shipped radiusClamp — 5 of its 7 FAILs
  were artifacts of the fork, and a real green could have hidden real jank the
  same way. The 052 walkability law generalizes: shared math lives in ONE
  module BOTH import (src/pathgeom.js for ribbon seams/edges); a probe may
  mirror only what it provably locks bit-exact (the r128 CR evaluator, checked
  by the butt-join 0.000-cap expectations).
- A CYCLE-driven celebration re-fires its HUD toast every loop, so a long session
  spams it (owner: "Cubs win notification can fire multiple times", task 103): the
  gameday win cycle repeats every ~7.5 min in-cell and the lakefront ambient gag
  every ~4-7 min, each `toast('CHUBS WIN...')` on the cycle's own fired-flag (which
  RESETS per loop by design). Gate a one-shot NOTIFICATION with a separate
  MODULE-LEVEL session flag (`let winToastShown=false`, NOT store.js — a reload
  re-greets a returning fan), and gate ONLY the toast: keep the counter increment
  (state.cubsWinsSeen/cubsWins) and the visual/audio celebration firing every cycle,
  because downstream consumers key off the counter (deepcuts.js hoists the rooftop
  W flags per tick; wrigley-vendors.js hushes the peanut hawker 60 s per tick). An
  IN-WORLD display is NOT a notification — the bowl scoreboard's "CHUBS WIN!"
  (wrigley-game.js repaint) shows the result of the diorama you're watching and is
  correct to repeat; don't gate it. To E2E a toast-count, install a MutationObserver
  on #toastMain via evaluateOnNewDocument (before frame 1 — WRIG.winT:0 fires the
  ambient win immediately) and separate the two by EXACT text ('CHUBS WIN!' vs
  'CHUBS WIN'); the reload re-fire needs a long-enough wait because the negative
  frame-1 dt (PITFALLS) pushes WRIG.winT positive and delays the first ambient win
  ~4 s (tools/tmp-103-winonce.mjs).
- Two shoreline stretches at the SAME x with terraced aprons (12.2 m each) MERGE
  visually across any <25 m water gap — the owner reads it as "the shoreline
  touches itself / the spit curls back toward shore" (task 104, the Montrose
  mouth: the bay corner sat at the mole's own x 236). Keep facing shores' clear
  water ≥ 4 m past both aprons; tools/shoreline-simple.mjs now gates this
  mechanically (LAND simplicity + facing-apron pinch, far-pairs only — cove
  ends are exempt by along-shore distance). Corollaries from the same fix: a
  terraced piece whose first segments' seaward normals point INTO a basin/mouth
  builds a floating step-shelf on the channel (wrap the flush seawall around
  the curl to where normals face open water); a ShapeGeometry walk-cap outline
  that self-intersects (raw concatenated crChain ends) triangulates into folded
  wings over water (gate checks pave simplicity); and a tight terraced curl
  (r≈4-5 m) gaps its outer tiers at the shared 2.2 fold stride — densify the
  stride for that piece only (local xorshift, +0 draws).
- A task spec that says "persist the player's POSITION" collides with the store.js
  contract (the save blob may NEVER hold coordinates — hard constraint 5 / task 078
  — so a save survives a map rework). Reconcile by persisting the RESOLVED NAME, not
  the raw coords: task 105's welcome-back "where you left off" tracks the nearest
  ZONES *name* live (a throttled per-frame min-distance scan, written on change via
  setFlag `ope.lastzone.v1`) and reads that name back next session — identical player
  intent, constraint honored, and it stays meaningful after a north-shore rework
  (084) that would strand a raw x,z. Read the prior value in onWorldReady BEFORE the
  tracker's first frame overwrites it.
- A "pulse" on the interaction pill (#prompt) must NEVER animate `transform`: the
  DESKTOP pill is centred with `transform:translateX(-50%)` and the TOUCH pill is
  right-aligned with `transform:none` (+ a `.pressed` scale) — a transform-based
  scale/breathe keyframe fights both (the pill jumps to screen-left on desktop, and
  clobbers the press feedback on touch). Pulse with a breathing BOX-SHADOW halo
  instead (`0 0 0 0 → 0 0 0 10px rgba(...,0)`, the 078 toteNudge pattern), which is
  transform-free and layers over the existing drop shadow (task 108). And the
  static calm-mode ring needs specificity above `body.touch #prompt` (1id/1class/
  1type) — `body #prompt.teach:not(.teachpulse)` clears it without `!important`; a
  running keyframe already overrides any static box-shadow regardless of specificity.
- A first-run TEACHING decoration hung on a SHARED HUD element (task 108 pulses the
  pill + adds a caption while the flag `ope.firste.v1` is unset) must default OFF
  under `?play=1`, forced on with its own `?firste=1` — exactly the 087 idle / 091
  affordance play-gate law. Otherwise every FRESH-profile headless waypoint shot
  that happens to stand inside an interaction's grace radius sprouts the coach
  caption (each shot is a clean browser context → the flag is never set), silently
  polluting unrelated shots and the baseline. Gate: `ENABLED = firste==='0'?false:
  (play?firste==='1':true)`. Crucially the FLAG check (done) must still win over the
  force param, so the "reload shows neither after the press" test loads with
  `firste=1` on BOTH loads yet reads clean on the second (localStorage persists the
  flag across a same-context puppeteer reload; wait out the 600 ms save debounce
  before reloading). Verified via an OWN-vite self-contained harness
  (tools/tmp-108-verify.mjs) using incognito browser contexts for per-scenario
  storage isolation + `emulateMediaFeatures` reduced-motion for the calm path.
- To make dense vegetation "brushable" (task 109 rustle) WITHOUT touching the
  determinism-frozen placement loops, read the positions BACK from the finished
  InstancedMeshes at world-ready: props.js just pushes the brushable meshes onto
  an exported `RUSTLE_MESHES` array (no rng, no logic change), and rustle.js
  decomposes every instance matrix into a static hash grid ONCE — zero shared-rng
  draws, so world layout stays byte-identical (spawn diff 0.128%). Decompose
  skips zero-scaled instances for free (the tuft on-pad/off-land hides in props.js
  stamp at scale 0), so only real vegetation rustles. The per-frame query is
  alloc-free: CELL>=R so the 3x3 cells around the player fully cover the R disc,
  keyed by a packed integer `(cx+OFF)*MUL+(cz+OFF)` (Map.get on a number, no
  strings). And the general rule the task clarified: RUNTIME rand()/rng() in the
  frame loop (footfall puffs, the landing dust, sparkles) is determinism-SAFE —
  the gate compares BUILD-time layout, fixed before frame 1; only MODULE-IMPORT /
  build-time rng shifts the world. Throttle clocks: the rustle throttle counts
  game.tNow (dt-based), while rustleDbg.t stamps actx.currentTime — both advance
  ~real-time, and dt's 0.05 cap can only STRETCH a gap, never shrink it, so a
  ">= throttle" assertion on actx-time gaps is safe.

