# WRIGLEYVILLE.md — neighborhood two (build brief, not yet started)

**The mandate (user, 2026-07-06):** ride the RED LINE from Belmont to Addison and
step out into a Wrigleyville built with the same care as the Belmont Rocks. It can
be smaller than the lakefront. Chicago Police NPCs with their blue wooden
barricades block the streets you can't walk down. Spend real time making the
stadium look amazing. Invent quirks + fun features specific to Wrigleyville and
Cubs vibes, the way the lakefront got its own. NPCs still say "ope" a lot, plus
Cubs dialogue. Fable reviews everything and decides the Fable-vs-Opus split.

## Architecture proposal (decide fresh next session, but start here)
- Wrigleyville is a SECOND CELL in the same scene, far west of the lakefront
  (suggest x ≈ −380…−120, z ≈ −80…+160 — behind the L backdrop, unreachable on
  foot; the LSD berm + clamp already wall it off). Same engine, new data module
  `src/data/wrigleyville.js` (the city-kit pattern's first real test) + builders
  keyed per-cell, + `src/packs/` additions gated by cell.
- THE RIDE: board at the Belmont platform (z≈105, aligned with the underpass) →
  short scripted train interior/passing-cityscape transition (the L track already
  runs the full map) → arrive at an ADDISON platform in the Wrigleyville cell.
  Player clamp/zone switches per cell; minimap swaps per cell.
- Perf: cell-based visibility (hide the other cell's meshes entirely when away —
  the NPC-culling pattern generalizes). Budgets per CLAUDE.md.

## Hero build: Wrigley Field (research references FIRST — user mandate)
Marquee (red, 'WRIGLEY FIELD — HOME OF CHICAGO CUBS') at Clark & Addison ·
ivy-covered brick outfield wall · hand-turned green scoreboard w/ pennants ·
light towers · red-brick arches/gates · bleacher decks · W flag · rooftop-
bleacher brownstones across Waveland/Sheffield · Captain Morgan/Gallagher Way
plaza · statues (Ernie Banks, Harry Caray — Caray sign already exists at the
lakefront; keep both, they honor him twice like Chicago does).

## Street fabric
Clark St diagonal + Addison/Waveland/Sheffield grid (small, stylized) · Murphy's
Bleachers · Engine 78 firehouse (the famous one beside the park) · souvenir/cap
stands · bar fronts w/ neon (synth glow) · the Addison Red Line stop (player
arrival point) · CPD officers + BLUE WOODEN BARRICADES ('POLICE LINE — CPD'
canvas) closing non-walkable streets — the game's soft walls, diegetic.

## Quirk/feature seed list (pick the best, add better ones)
7th-inning-stretch singalong event (crowd hum + 'take me out to the ball game'
synth organ, join in with E) · W-flag raising after a 'win' · ball-hawk NPC on
Waveland with a glove ('62 career balls') waiting for a homer to clear the wall
(occasionally one DOES — chase it!) · marquee text easter eggs · ivy-ate-the-ball
gag at the wall · bleacher-bum NPCs · organist riffs · a scorecard vendor ·
'go cubs go' plays from bar doorways after wins (radio station #4?) · hot-dog
vendor reprise (no-ketchup house rules travel) · rooftop watchers with binoculars.

## Rules that carry over
GEOGRAPHY-doc-first for layout (make WRIGLEY_GEOGRAPHY section or extend this
file with researched real positions + Chicago grid z-anchors) · reference photos
before building anything real (user mandate — WebSearch liberally + user's own
photos) · determinism/single-file/60fps/synth-audio constraints (CLAUDE.md) ·
walkprobe categories for every new walkable surface · Fable does hero pieces +
shared engine files + all reviews; Opus executes well-specified parallel work.

## Work method (MANDATORY — use the tools this repo already has)
- START IN PLAN MODE: design the cell architecture + L-ride transition + street
  grid on paper first, get user approval, then execute in waves.
- REFERENCE PHOTOS FIRST, always: WebSearch every real thing before building it
  (marquee, ivy, scoreboard, rooftops, barricades, Engine 78, Murphy's). Google
  image references + verify the build against them by READING screenshots.
  Quality bar: a Chicagoan should recognize it instantly.
- `/verify` after every landed chunk (walkprobe + build + spawn shot).
  `/lookat x z [yaw pitch dist]` to inspect spots. `?dbg=1` = live coordinate
  HUD in-game. `tools/act.mjs` for interaction tests (~900 ms settle; 'w' +
  yaw param for straight-line movement — strafe keys spiral with the follow-cam).
- READ every verification PNG; never trust an unviewed screenshot.
- Executor doctrine: exclusive file ownership per agent; packs add one import
  line each (re-read packs/index.js before editing, retry on conflict); resume
  stalled/killed agents from their transcript (SendMessage) instead of
  respawning; agents report tersely w/ PNGs-read lists; Fable spot-checks
  every agent's screenshots personally.
- Determinism: packs use Math.random/local m32 only; world-builder rng-order
  changes need explicit acknowledgment + baseline regen. Commit + push after
  each verified chunk. Keep GEOGRAPHY.md truthful when boundaries move.

---
## STATUS: BUILT (2026-07-07, wrigleyville branch)
All waves landed + origin/main (sanctuary-room era) merged back in.
- CELL PATTERN: src/cells.js (separate places: root visibility + per-cell
  walkable/surfaceY/clamp/minimap/spawn) — complementary to main's
  definePlace (atmosphere grading); the train interior is a third cell.
- THE RIDE: Belmont stop cluster pylon → train-car pocket cell (strip-map
  minimap, scrolling window lights, synth rumble/chime, 'This is Addison.')
  → Addison island platform. Round-trip, act.mjs-verified.
- THE PLACE: stadium (marquee w/ live message line, facade ring, ivy bowl
  + crowd, hand-turned scoreboard + raiseW rig, knothole, gates, towers) ·
  Addison station (embankment/girder bridge/canopy) · streets w/ CPD
  barricades + Lakeview backdrop · 6 rooftop brownstones (1 climbable) ·
  Murphy's/Cubby Bear/Clark neon row/Engine 78/souvenir stands/Gallagher
  Way + Statue Row + Caray.
- THE LIFE: 450s game-day cycle (crowd bed, 7th-inning stretch singalong,
  homers onto Waveland w/ ball-hawk Gus race, CUBS WIN w/ W-flag hoist +
  Go Cubs Go from bar doorways, marquee easter eggs, ivy gag) · 24 NPCs ·
  journal 'wrigleyville' · radio station #4 'WGN · GO CUBS GO' (R key) ·
  fake lakefront Wrigley backdrop auto-hides in-cell.
- Verified: walkprobe 206/206 · single-file build 928 kB · baseline
  pixel-stable · every screenshot read. Geography: GEOGRAPHY.md
  WRIGLEY_GEOGRAPHY (true latitude, Clark diagonal 0.28).
