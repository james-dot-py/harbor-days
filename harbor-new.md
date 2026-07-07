# harbor-new.md — Belmont Harbor additions (new-session brief)

**User mandate (2026-07-06).** Read CLAUDE.md + GEOGRAPHY.md first, then this.
Work method is at the bottom — follow it for every job.

## Jobs

### 1. Badminton — playable, ongoing, everywhere it's empty
- Fill the map's blank lawn spots with badminton games (a volleyball tableau
  exists in parklife.js at (95,215) — badminton = lighter net, racquets,
  shuttlecock; convert or complement it).
- Games are ONGOING, not static: NPCs rally continuously (shuttle arcs back and
  forth with hang time, players shuffle + swing — the frisbee pair's animated
  disc-loop in npcs.js is the pattern).
- THE PLAYER CAN JOIN: E-prompt at an open spot ("join the rally") → the mayor
  takes a side; timed E presses return the shuttle (chargeThrow or a timing
  window like skip-stones); missed returns = "ope"; a rally counter → journal
  ("longest rally"). Politely leave with E again.

### 2. Controls always discoverable
- A small "?" button pinned to a screen corner (desktop AND touch), always
  visible, that toggles a controls overlay (the current hint-bar content,
  formatted as a card: move/jump/run/interact/journal/fireworks/bell-radio/
  jetski/Divvy). The hint bar still auto-shows at start; this button is the
  permanent way back to it. index.html + a small framework or main.js hook.

### 3. Diversey Driving Range — elevated bays + perimeter net
- Reference photo: `Downloads/diversey driving range.jpg` (Topgolf-style
  two-tier bays: elevated deck rows, bay dividers, screens glowing, big net).
  The REAL renovated Diversey range has double-decker bays — Google
  "Diversey Driving Range Chicago double decker" and study images first.
- Rebuild the range structure: a two-story bay building along the south/tee
  edge (ground bays + upper deck with railings, dividers, warm glowing bay
  interiors at dusk), a handful of NPC golfers mid-swing on both levels, and a
  TALL perimeter NET on poles wrapping the downrange field (thin dark posts +
  translucent net material — big vertical presence like the photo).
- Keep the mini-golf corner. Data-driven (DIVERSEY in chicago.js), instanced,
  budgets per CLAUDE.md.

### 4. Kill the dead space (the grass isn't pretty enough to be empty)
- Audit pass: take aerials of every lawn region; anywhere bigger than ~40 m of
  empty grass gets life. Mix (get creative, these are seeds):
  - PICNICS everywhere — the most common real sight. Vary blankets, coolers,
    groups of 2-5, a birthday cluster with balloons.
  - A YOGA CLASS on a lawn (instructor + 5-6 mats, synchronized pose cycling —
    slow per-frame pose lerps, very cozy).
  - PEQUOD'S ON THE GROUND — a deep-dish delivery picnic: the black-and-red
    Pequod's box open on a blanket, caramelized-crust pizza, happy eaters
    (Google "Pequod's pizza box" for the look; keep the name on the box).
  - More: a reading circle, a guitar strummer, cornhole boards, a toddler
    chasing the geese (the goose event tie-in), a farmers-market-style cart.
- Rule: nothing within 6 m of ribbons/fences; runtime-probe pathSamples like
  parkcharm does; every group gets bump lines (registerBumpable if the shared
  framework mechanism landed, else the parklife pattern).

### 5a. CANONICAL AERIAL REFERENCES (added 2026-07-06 — study before ANY layout work)
- `Downloads/harbor aerial.png` — Diversey→Belmont stretch. **ALWAYS reference
  this image for the placement of the trail and every west-side feature.**
  Key correction it shows: the LAKEFRONT TRAIL along this stretch hugs LAKE
  SHORE DRIVE (the west side), NOT the beach — it does that at Fullerton in
  our build but not at Belmont. Rework TRAIL_MAIN between the AIDS Garden and
  Diversey to run beside the LSD berm, with the wide lawns/rocks between trail
  and water (people cross the grass to the revetment).
- `Downloads/addison harbor.png` — the SPIT (east peninsula), circled. Match:
  the spit's real teardrop shape, the trail that runs INSIDE the spit
  (down its spine with the treed strip around it), and where it sits relative
  to the harbor mouth. At x=150 z=-326 our path rounds too close to the water —
  the aerial shows the trail set inland at the spit root.
- WEST-SIDE BUILDINGS past the L: add a low-rise band of Lakeview buildings
  behind the L track (flats/brownstones/small apartment blocks) — distant and
  modest, NOT towering over the park. Google "Lake Shore Drive Belmont
  lakefront apartments" photos first; render as a simple instanced backdrop
  band (like the skyline treatment but nearer/lower, behind the L at x < -12).

### 5b. BUG LIST (user-reported with coordinates — verify each with /lookat
###     before and after; screenshots referenced live in Downloads/)
- x=150 z=11.5 — a mystery CONE sitting in the water (probably a stray buoy or
  golf-flag instance). Identify and remove/relocate.
- x=201 z=-22 — jagged terrace edge at the peninsula tip (seam smoothing missed
  this arc segment). x=160 z=14 — very messed-up jagged edge at the mouth.
  The per-vertex-tangent smoothing pass exists in coast.js — extend/fix it here.
- x=45 z=-45 (see 'facing edge of harbor transparent concrete.png'): the basin
  WEST seawall shows grass THROUGH the gaps between sheet-pile posts when viewed
  from the water — there is no continuous opaque wall face behind the pile nubs.
  Add a continuous face strip (top→below waterline) behind the piles on ALL
  seawall runs. GENERAL RULE the user stated: the ground must read smooth with
  no unintentional awkward walls, and every opaque surface must render opaque
  from every angle (audit backfaces/gaps map-wide, esp. terrace outer faces).
- 'npc floats into concrete -- make solid and make the grey band make sense.png':
  a tuber drifts INTO the promenade edge band; the grey stain band floats/reads
  detached. Fix: (a) clamp watertoys drift zones away from the new wider
  promenade aprons (probe walkable/coastQuery at runtime, keep ≥2 m clear);
  (b) make the stain band flush with the promenade slab (same mesh or exact
  overlay), and give the promenade outer edge a solid face down to the water.
- x=83 z=-343 — two path ribbons overlap and z-fight (flashing colors) near the
  dog-beach west gate. De-overlap the ribbons or set distinct y-offsets.
- DOG BEACH: the sign sits at the wrong end — move it onto the grass NORTH of
  the beach. The beach foot has a walkable upward slant you can walk THROUGH at
  x=84→112 z=-327, and at x=120 z=-332 you can see straight through the wall —
  seal the cove's ground/wall seams (beach mesh ↔ seawall ↔ basin junction).

### 5c. BIRD SANCTUARY — hero feature rework (per addison harbor.png + user)
Reshape/replace the current fenced box to match the aerial's real sanctuary
placement + organic shape, then make it a DESTINATION:
- A lush, vibrant WALKING LOOP inside: winding path, dense native planting
  (prairie grasses, purple/yellow wildflowers, layered understory), dappled
  clearings, birdsong everywhere (the audio zone exists — enrich it inside).
- An ELEVATED WOODEN DECK/platform you can climb and SIT on (sittable like
  benches) overlooking a clearing — the bird-watching perch; bingo birds
  visible from it; maybe the binocular interaction lives up here.
- Make entering feel like a NEW ENVIRONMENT, 'walking into a room': consider a
  gated threshold + interior-only content, denser fog/greener light grade
  inside, exterior noise ducked. It MAY even load as a separate place (cell
  pattern from WRIGLEYVILLE.md) if that reads better than an open fence —
  designer's call next session, prototype both if cheap. Get creative — this
  should be the map's secret-garden moment.

### 5. Carry-overs from the last session (small, do early)
- BUMP UNIFICATION: parklife.js has a working bump-line system for posed chibis
  (registry + one projected bubble + re-arm — see its `bumpables`). Promote it
  into framework.js as `registerBumpable(group,parts,lines)`, refactor parklife
  onto it, and wire the watertoys tubers + paddleboarder ("ope — watch the
  wake!") and a "boof!" for the fetch dogs. EVERY NPC on the map opes on bump
  (user mandate).
- TREE DENSITY: the real area is much more heavily wooded (check aerials).
  Raise TREES.count (~150→260) + the north grove in chicago.js; verify draw
  calls stay sane (trees are 5 instanced archetypes) and no trees violate the
  post-filters (tennis/Diversey/paths).
- Any unfinished items the last session's wrap notes flag (check the project
  memory + recent git log).

## Work method (MANDATORY — use the tools this repo already has)
- REFERENCE PHOTOS FIRST for anything real-world: WebSearch + user's Downloads
  images. Match reality before styling. (Standing user mandate.)
- `/verify` after every landed chunk (walkprobe all-pass + build + spawn shot).
  `/lookat x z [yaw pitch dist]` to inspect any spot. `?dbg=1` shows live
  player coordinates in-game. `tools/act.mjs` for interaction tests
  (~900 ms settle after goto; use 'w' + a yaw param for straight movement —
  strafe keys spiral with the follow-cam).
- READ every verification PNG — never trust a shot you haven't looked at.
- Executor doctrine: Fable plans/reviews + hero pieces + shared engine files;
  Opus executors take well-specified parallel work with exclusive file
  ownership; re-read packs/index.js before adding import lines; resume stalled
  agents via their transcript instead of respawning.
- Determinism (CLAUDE.md hard constraint #1): packs never touch the shared
  rng; world-builder changes that shift rng order need explicit acknowledgment
  + a baseline regen. Commit + push after each verified chunk.
