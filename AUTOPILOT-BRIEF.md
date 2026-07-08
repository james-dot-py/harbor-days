# AUTOPILOT-BRIEF.md — build the development-automation system from THIS

**What this is (owner, 2026-07-07):** the complete briefing for designing Harbor
Days' autopilot: an unattended loop where Claude Code researches a real Chicago
location, builds it in the house style, verifies the player experience with
screenshots, and pushes — owner just gets ntfy.sh notifications. The session
reading this should produce (then implement) the automation spec/MD. Ground
truth below overrides any generic architecture ideas.

## OWNER DECISIONS (override everything below)
(a) Branching: `wrigleyville` is already merged into `main` (origin/main = the
    full game incl. Wrigleyville, as of 02aa933) — no development in flight.
    Autopilot runs in its OWN fresh git worktree on branch `autopilot` cut from
    main, pushing only to that branch; owner merges to main manually after
    reviewing notifications.
(b) Street View: NO key, and Google Maps/Street View data is prohibited
    outright — no derivative works legally. Don't fetch it, don't reference it.
(c) Notifications: ntfy.sh — post per green iteration (task, commit hash,
    one-line result, contact-sheet path) to a private topic; topic name lives in
    gitignored autopilot/.env, never in the repo.
(d) Limit resilience: the loop must catch rate/session-limit errors, sleep until
    the stated reset, and RESUME the same session/task (never restart blind).
(e) waypoints.json is GENERATED from src/data/*.js by a node script; only the
    per-POI plain-language expectation strings are hand-written.
(f) Acceptance gate (Stop hook): walkprobe exit 0 + single-file build succeeds +
    zero console errors in shot reports + baseline.png unchanged (or explicitly
    acknowledged + regenerated in the same commit) + every new PNG actually Read.
(g) Geography sourcing: query Overpass for OSM vector geometry (shorelines,
    roads/paths incl. separated bike/ped alignments, park boundaries, building
    footprints, named landmarks), project into the game's coordinate system
    (1:2 real distance, 1:1 object scale; z=0 at Belmont Ave, x=0 at LSD east
    edge, +z south, lake east — per GEOGRAPHY.md), and emit as REFERENCE DATA:
    coordinates/outlines written into GEOGRAPHY.md and src/data/*.js. NEVER
    extruded or imported as game geometry — builders hand-model everything in
    the house toon style. Supplement heights/vegetation/civic features from the
    Chicago Data Portal; verify currency against public-domain NAIP aerials.
    Mapillary/Wikimedia/owner-supplied photos are visual reference only — never
    extracted geometry or textures. Attribute OpenStreetMap per ODbL (README
    credits + the in-game journal's about section).

## 1. Already built — extend, don't duplicate
- **`tools/shot.mjs` + `tools/act.mjs`** (Playwright): headless screenshot +
  console-error report; scripted [goto/key/keydown/keyup/wait/shot] sequences
  (~900 ms settle after goto; 'w' + yaw param for straight movement — strafe
  keys spiral with the follow-cam). Both honor `PORT` env (default 5173).
  Missing only: a waypoint ITERATOR + contact-sheet summarizer on top.
- **Debug URL params** (main.js): `?play=1`, `?x=&z=` (spawns into any cell),
  `?yaw=&pitch=&dist=`, `?dbg=1` (coordinate HUD), `?gd=stretch|homer|win`
  (jump the Wrigleyville game-day clock), `?ambientfast=1`. Worth adding:
  perf stats (renderer.info) + a console-error ring buffer. NO seed param
  needed — the world is fully deterministic (mulberry32(20260704); layout =
  rng call order).
- **waypoints.json: generate, don't hand-write** — placement truth is
  `src/data/chicago.js` + `src/data/wrigleyville.js` (MAP_LANDMARKS, SIGNS,
  gates, zones); prose canon is `GEOGRAPHY.md` ("GEOGRAPHY.md FIRST, then
  data" is standing law).
- **Walkability oracle**: `node tools/walkprobe.mjs` — 206 assertions, exit
  code = failures. Every new walkable surface adds rules+expects. Prefer the
  Wrigleyville pattern: walkable/surfaceY functions live IN the data module so
  engine + probe share one definition.
- **Project skills**: `.claude/commands/verify.md` (walkprobe → build →
  spawn-shot → READ PNG) and `lookat.md`. Iteration prompts should invoke
  /verify, not respecify it.
- **Regression anchor**: `tools/shots/baseline.png` (canonical spawn view).
  Unintended world diffs (moved towels) = rng-order regression. Packs use
  LOCAL mulberry32 seeds only; world-builder rng-order changes require
  acknowledgment + baseline regen in the same commit.
- **Working doctrine** (why quality held): reference photos BEFORE building;
  READ every PNG; executor subagents get exclusive file ownership; packs
  integrate via ONE import line in src/packs/index.js (re-read immediately
  before editing; retry on conflict); commit+push per verified chunk with
  trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`;
  orchestrator personally spot-checks every subagent's screenshots.

## 2. Hard constraints to ENFORCE mechanically (CLAUDE.md)
Determinism · single-file build (`npm run build` → one dist/index.html, ~960 kB
now — fail the iteration if broken) · 60fps mid-phone, draw calls ≤ ~480 worst
case (instance repeats) · audio 100% synth WebAudio, zero assets, guard null
actx · no localStorage/sessionStorage · Three r128 pinned (exact shader anchor
strings; no CapsuleGeometry/OrbitControls) · desktop + touch · toon()/bmat()
on EVERY mesh (world-curve shader). Place layers: `src/cells.js` (hard cells —
own walkability/clamp/minimap; Wrigleyville + the train interior) vs framework
`definePlace` (atmosphere grading; the sanctuary). New areas pick one; never
invent a third.

## 3. Environment + operations (where naive automation breaks)
- **Windows 11**, default shell PowerShell 5.1 (no `&&`, UTF-16 default file
  writes) — write hooks/loop scripts as `node` scripts, not shell one-liners.
  Git Bash exists.
- **Ports**: interactive sessions have owned 5173/5174. Autopilot must start
  its own Vite, parse the ACTUAL port from stdout, pass `PORT=<n>` to every
  tool call, and canary-shot an autopilot-only landmark (tools silently
  screenshot the WRONG server otherwise — this burned us).
- **Rate/session limits WILL interrupt runs** (4 concurrent subagents were
  killed mid-task by a session cap during Wave 1; resume-from-transcript
  recovered all of them). Cap subagent parallelism at ≤4.
- **Start/stop**: start = one script; stop = STOP sentinel file or Ctrl-C,
  checked between iterations, never mid-commit. Interface = `queue/` of task
  .md files + `issues/` of structured failures + ntfy per green iteration.

## 4. Perception loop
- **Fetch-to-disk-then-Read works**: curl any image URL to `refs/<poi>/` and
  Read it natively — this already powers the screenshot doctrine. Fetchers:
  Wikimedia Commons + Mapillary (free token) + Overpass (per decision g).
  Owner-supplied photos land in Downloads/ or chat — highest fidelity, keep.
- **Camera math** (agents waste turns): camera sits at player − (sin yaw,
  cos yaw)·dist, looks along +(sin yaw, cos yaw); yaw 0 = south(+z), ±π =
  north, −1.57 = west; positive pitch = higher camera looking down. Traps:
  cameras landing inside nearby geometry (canopies, backdrop buildings) —
  provide several candidate framings per waypoint; interiors need
  down-the-length framings (cross-body cameras exit small rooms).

## 5. PITFALLS.md seeds (each cost real debugging time)
r128 toon/basic materials IGNORE InstancedMesh.setColorAt — bucket instances
per color · teleports swoosh the follow-cam — set camCtl.snap (main.js) ·
pockets outside the active cell's clamp eject the player — make pockets their
own cell · elevated walk rects beside streets act as elevators via the 0.5
step-up threshold — enclose them so only ramps connect levels · chargeThrow
releases on KEYUP · toasts hold ~3 s (never queue per-event toasts in fast
loops) · makeNPC culls >145 m (far clusters are cheap) · walkprobe + engine
must share walkability definitions (put them in the data module).

## 6. Delight + taste
Curated-not-generated. Seed `delight-backlog.md` from the seed lists in
WRIGLEYVILLE.md / harbor-new.md (format: one-line quirk + location + what makes
it Chicago). Shipped and beloved: no-ketchup house rules, Malört guy, EAMUS
CATULI + AC counter, ball-hawk Gus, Go Cubs Go from bar doorways, the Wrigley's
Spearmint ad in the L car. Art-director skill encodes: dusk palette (fog
0xf6ab84, 55–210), chunky toon silhouettes, canvas signage with measureText
shrink-to-fit, "a Chicagoan should recognize it instantly."

## 7. The MD must specify explicitly
The autopilot worktree/branch bootstrap · the Overpass→game-coords fetcher ·
waypoints generation · the iteration prompt (research → GEOGRAPHY/data →
build → /verify → screenshot review vs refs → commit or file issue) · the
Stop-hook acceptance gate (decision f) · limit-resume logic (decision d) ·
ntfy wiring (decision c) · ODbL attribution (decision g).
