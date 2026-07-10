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
