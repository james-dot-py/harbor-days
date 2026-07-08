# AUTOPILOT.md — Harbor Days autonomous build system

Handoff spec for Claude Code. Execute the phases in §9 in order. This document is
built on the existing repo (shot.mjs, act.mjs, walkprobe.mjs, URL-param debug
surface, /verify, baseline.png, the working doctrine). Extend those components.
Do not duplicate them. Owner decisions in §1 are binding and override anything else.

*(v2 — reviewed against the repo by the session that built Wrigleyville; the
material fixes vs the draft: §4.4 projection validation, §6.2 baseline flake
calibration + PNG-ledger scoping, §6.1 path exceptions, §6.3 install perms,
§1(a) worktree command, §4.1 module export names, §7 turn budgets.)*

---

## 1. Binding owner decisions

(a) **Branching.** `wrigleyville` is already merged into `main` (origin/main =
    the full game including Wrigleyville, as of 02aa933); no development is in
    flight anywhere. Autopilot runs in its own fresh worktree:
    `git worktree add -b autopilot ..\harbor-days-autopilot main`
    (run from any existing checkout of the repo; `-b` creates the branch).
    Autopilot pushes ONLY to `autopilot`. Owner merges to main manually after
    reviewing notifications. A PreToolUse hook mechanically denies any
    `git push` whose refspec is not `autopilot` (§6).

(b) **Google is prohibited.** No Street View key, no Google Maps or Street View
    data of any kind: no fetching, no referencing, no screenshots of it. Derivative
    works from it are not licensable for this project. Enforced mechanically: the
    network PreToolUse hook denies any URL matching google domains (§6).

(c) **Notifications: ntfy.sh.** POST per green iteration to a private topic:
    task name, commit hash, one-line result, contact-sheet path. Topic lives in
    `autopilot/.env` (gitignored). Also notify on: limit-sleep begin/end, gate
    failure loop (same task fails 3x), STOP honored, loop crash.

(d) **Limit resilience.** The outer loop catches rate/session-limit errors,
    sleeps until the stated reset (or backs off 15 min doubling to 2 h cap if no
    reset time is parseable), then RESUMES the same session via
    `claude --resume <session-id>`. Never restart a task blind. (§7)

(e) **waypoints.json is generated,** by `tools/gen-waypoints.mjs`, from
    `src/data/chicago.js` and `src/data/wrigleyville.js`. Only the per-POI
    plain-language expectation strings are hand-written, in
    `tools/waypoints.expect.json`, merged by id. Hand-editing waypoints.json is
    a doctrine violation. (§4.1)

(f) **Stop-hook acceptance gate** (all mechanical, node script, exit 2 on fail):
    walkprobe exit 0; single-file build succeeds; zero console/page errors in all
    shot reports since last code edit; spawn shot matches baseline.png within the
    calibrated flake threshold (or the commit contains `[baseline-regen]` and
    regenerates baseline.png in the same commit); every PNG created this session
    was actually Read in the MAIN session's transcript. (§6.2)

(g) **Geography sourcing policy.** Per target area: query Overpass for OSM vector
    geometry (shorelines, roads and paths including separated bike/ped alignments,
    park boundaries, building footprints, named landmarks), project into the game
    coordinate system, and emit as REFERENCE DATA ONLY: coordinates and outlines
    written into GEOGRAPHY.md and the `src/data/*.js` modules by builders. OSM
    geometry is never extruded or imported as game geometry; everything is
    hand-modeled in the house toon style. Supplement heights/vegetation/civic
    features from the Chicago Data Portal where OSM is thin; verify currency
    against public-domain NAIP aerials. Mapillary, Wikimedia, and owner-supplied
    photos are visual reference only, never extracted geometry or textures.
    Attribute OpenStreetMap per ODbL: README credits plus the in-game journal's
    about section. (§4.4)

(h) **Self-directed expansion.** When a location reaches sign-off, the agent
    itself selects the next famous Chicago spot and builds that neighborhood end
    to end, taking creative liberties while staying faithful: the build must
    evoke the real place strongly enough that someone who knows the city knows
    exactly where they are. Lifecycle, sign-off, site selection, and the
    faithfulness standard are §5.

---

## 2. What already exists (extend, never duplicate)

| Need | Existing component | Autopilot's job |
|---|---|---|
| Screenshot + console report | `tools/shot.mjs` | Wrap, don't rewrite. Light refactor to export a function while preserving the CLI. |
| Interaction sequences | `tools/act.mjs` | Use for interaction waypoints ('w' + yaw for movement; strafe spirals with follow-cam; ~900 ms settle after goto). |
| Debug surface | URL params in main.js: `?play=1&x=&z=&yaw=&pitch=&dist=&dbg=1&gd=&ambientfast=1` | Add `?canary=`, perf stats, error ring buffer (§4.2). No seed param: world is fully deterministic (one mulberry32(20260704); layout = rng call order). |
| Walkability oracle | `tools/walkprobe.mjs`, 206 assertions, exit code = failures | Gate on it. Every new walkable surface adds rules+expects. Walkability definitions live in the data module, shared by engine and probe (the Wrigleyville pattern); require this for all new areas. |
| Verification workflow | `.claude/commands/verify.md`, `lookat.md` | iteration.md invokes /verify; never respecify its steps. |
| Regression anchor | `tools/shots/baseline.png` (canonical spawn view) | Compare in the gate (§6.2 item 4, calibrated). Packs use LOCAL mulberry32 seeds only; world-builder rng-order changes require `[baseline-regen]` + regenerated baseline in the same commit. |
| Placement truth | `src/data/chicago.js`, `src/data/wrigleyville.js`, `GEOGRAPHY.md` | Standing law: update GEOGRAPHY.md FIRST, then data. waypoints.json generates from the data modules. |

Doctrine that survives into every prompt and skill:
reference photos BEFORE building; READ every PNG (never trust an unviewed
screenshot); executor subagents get exclusive file ownership; packs integrate via
ONE import line in `src/packs/index.js` (re-read immediately before editing,
retry on conflict); commit+push per verified chunk with trailer
`Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`; orchestrator personally
spot-checks every subagent's screenshots; subagent parallelism capped at 4.

---

## 3. Hard constraints (fail the iteration if violated)

- Determinism: single mulberry32(20260704) world seed; layout = rng call order.
- Single-file build: `npm run build` emits exactly one `dist/index.html`
  (~960 kB today). Gate fails if the build emits additional chunk/asset files.
  Log size; warn (advisory, non-gating) if size grows >15% in one iteration.
  New tooling deps (pixelmatch, sharp) are devDependencies ONLY — they must
  never enter the game bundle.
- Perf: 60 fps target mid-phone; scene draw calls ≤ ~480 worst case, per-cell
  accounting; instance everything repeated. Draw calls are a mechanical gate at
  every waypoint. Headless-Chromium fps is advisory only: Playwright often
  renders WebGL via SwiftShader, so fps numbers are pessimistic and unreliable.
  Record fps, gate on draw calls.
- Audio: 100% synthesized WebAudio, zero assets, every call guarded on null actx.
- No localStorage/sessionStorage.
- Three r128 pinned. Exact shader anchor strings. No CapsuleGeometry, no
  OrbitControls.
- Desktop + touch both work.
- `toon()`/`bmat()` material helpers on EVERY mesh (they inject the world-curve
  shader).
- Two place layers only: `src/cells.js` hard cells (own walkability/clamp/minimap:
  Wrigleyville, ridable train interior) and framework `definePlace` (atmosphere
  grading: sanctuary). New areas pick one. Never invent a third.

---

## 4. Components to build

New code lives in `autopilot/` and `tools/`. All scripts are node (`.mjs`).
Environment is Windows 11 with PowerShell 5.1 as default shell: no `&&`, UTF-16
default writes. Therefore NOTHING is a shell one-liner; hooks and loop steps all
invoke node scripts, and node does all file writing (UTF-8).

```
autopilot/
  run.mjs              outer loop
  iteration.md         the per-task prompt
  notify.mjs           ntfy poster
  .env                 NTFY_TOPIC=..., MAPILLARY_TOKEN=... (gitignored)
  hooks/
    session-start.mjs  records session start timestamp
    ledger.mjs         PostToolUse: logs Read paths + shot invocations
    gate.mjs           Stop: acceptance gate (§6.2)
    guard.mjs          PreToolUse: network/git/path guardrails (§6.1)
  queue/               NNN-slug.md task files (frontmatter: id, area,
                       type: scout|layout|build|delight|polish|signoff|fix,
                       acceptance, refs); done tasks move to queue/done/;
                       parked tasks to queue/parked/
  issues/              structured failures (one .md per issue: waypoint id,
                       shot path, expected vs observed, severity)
  session-state.json   ledger + timestamps, rewritten per session
PITFALLS.md            seeded from §8
delight-backlog.md     seeded from WRIGLEYVILLE.md / harbor-new.md (§5)
tools/
  gen-waypoints.mjs    data modules -> waypoints.json
  waypoints.expect.json  hand-written expectation strings, merged by id
  walkthrough.mjs      waypoint iterator over shot.mjs
  contactsheet.mjs     composite grid PNG (sharp; fallback: HTML index)
  osm-fetch.mjs        Overpass -> refs/<poi>/osm.json in GAME coords
  refs-fetch.mjs       Wikimedia/Mapillary -> refs/<poi>/ + manifest.json
refs/<poi>/            cached reference material (committed)
refs/inbox/            owner drops his own photos here; highest-fidelity channel
```

### 4.1 gen-waypoints.mjs
Imports the data modules and reads each module's ACTUAL exports — they differ:
chicago.js exposes MAP_LANDMARKS, SIGNS, ZONES, SPAWN, DECKS, etc.;
wrigleyville.js exposes STADIUM_W (.gates/.marquee/.scoreboard/.knothole),
STATION_W, VILLAGE_W, ROOFTOPS_W, GALLAGHER_W, SPAWN_W, MAP_W. Both are pure
data, node-importable (walkprobe already imports both). Emit `tools/waypoints.json`.
Per waypoint: `id`, `area`, `cell`, `x`, `z`, `framings[]` (3+ candidate
`{yaw, pitch, dist}` per waypoint; interiors get axis-aligned down-the-length
framings only), `expectation` (merged from waypoints.expect.json by id; empty
string if unauthored), `interactive` (optional act.mjs script reference).
Regenerate on every run of walkthrough.mjs so it can never drift from the data
modules. Fail loudly if an expect entry's id matches nothing (stale expectation
= probable rename regression).

Camera math (put this verbatim in iteration.md too; agents waste turns on it):
camera sits at player − (sin yaw, cos yaw)·dist and looks along +(sin yaw, cos yaw);
yaw 0 = south (+z), ±π = north, −1.57 = west; positive pitch = higher camera
looking down. Two recurring traps: camera landing INSIDE nearby geometry
(canopies, backdrop buildings), which is why every waypoint carries multiple
candidate framings; and interiors, where cross-body cameras exit small rooms
(the train car needs down-the-length shots).

### 4.2 main.js instrumentation (small, additive)
- `?canary=<runId>`: console.log `[canary] <runId>` on boot. Mechanical, no
  vision needed: shot.mjs already captures console, so the runner asserts the
  echo programmatically.
- `window.__hd.perf()`: `{drawCalls: renderer.info.render.calls, fps}` (fps
  sampled over ~60 frames).
- `window.__hd.errs`: ring buffer (last 50) of console.error + window.onerror +
  unhandledrejection, readable by the harness in addition to shot.mjs capture.

### 4.3 walkthrough.mjs (the thin missing layer)
1. Regenerate waypoints.json (§4.1).
2. Spawn its own Vite (`node` child_process), parse the ACTUAL port from stdout,
   pass `PORT=<n>` to every tool call. Tools default to 5173, which is owned by
   interactive sessions; without this you silently screenshot the wrong session's
   game. This has happened.
3. Canary check: load `?play=1&canary=<runId>`, assert the console echo in the
   shot report before anything else. Abort the run if absent.
4. Iterate waypoints (all, or `--area <a>` / `--ids a,b,c` for scoped runs):
   for each framing, shot.mjs; for `interactive`, act.mjs. Collect per-shot
   console/page errors and `__hd.perf()` (evaluate after settle).
5. Write `tools/shots/run-<runId>/report.json`: per waypoint per framing, shot
   path, errors, draw calls, fps (advisory).
6. contactsheet.mjs: composite grid PNG (sharp, prebuilt win32 binaries; if
   sharp install fails, emit an HTML index instead and note it in the report).
7. Kill Vite. Exit code reflects mechanical failures only (canary, load errors,
   console errors, draw-call budget). Aesthetic judgment is the agent's job,
   done by READING the PNGs.

### 4.4 osm-fetch.mjs (highest-leverage new artifact)
- Overpass API (no key). Per POI/area (bbox or named): shorelines/water edges,
  `highway=*` including separated `footway`/`cycleway` alignments, `leisure=park`
  boundaries, building footprints, named nodes/landmarks.
- Projection to game coords. Anchor: real-world Belmont Ave centerline at the
  east edge of Lake Shore Drive = game (x=0, z=0). Derive the anchor lat/lng from
  OSM itself (Belmont Ave way ∩ LSD east edge), then local equirectangular:
  meters_east = Δlng·cos(lat₀)·111320, meters_north = Δlat·110540. Game scale is
  1:2 real distance (1:1 object scale), +z = south, lake = east = +x, so:
  `x = meters_east / 2`, `z = −meters_north / 2`.
- **Validation asserts — LAKEFRONT anchors only** (run on every fetch, require
  agreement within ±10 game units): Belmont Ave → z=0; Addison St → z=−400;
  Irving Park Rd → z=−800 (the N-S grid: 400 address units = 402 game units);
  plus one E-W check on the lakefront strip (LSD east edge → x≈0). On failure,
  halt and file an issue; do not emit osm.json from a miscalibrated projection.
- **Displaced cells are a documented liberty, NOT a validation target.**
  Wrigleyville's true projected x would be ≈−600; the cell deliberately sits at
  x −140 − (Waddr − 950) (GEOGRAPHY.md "standing liberties"). Its LATITUDE
  anchors are true (Addison z=−400) but its x-frame is cell-local. Therefore
  osm-fetch supports a per-area `offset` (dx, and optionally a shear for
  diagonals like Clark) recorded in the emitted osm.json provenance, and any
  future far-flung site built as a hard cell defines its own local frame the
  same way. Never assert a displaced cell's x against the true projection.
- Output `refs/<poi>/osm.json`: game-coord polylines/polygons + provenance (OSM
  element ids, fetch timestamp, applied offset). REFERENCE ONLY per decision (g):
  builders hand-write coordinates into GEOGRAPHY.md (first) and the data modules,
  citing osm.json; nothing imports it at runtime or build time.
- Supplements: Chicago Data Portal (Socrata SODA API, no key for modest use) for
  heights/vegetation/civic features where OSM is thin; NAIP public-domain aerials
  (USDA/USGS) to verify currency. Same reference-only rule.
- ODbL attribution task: README credits + in-game journal about section. Seed it
  as queue task 001 so it ships before any OSM-derived layout lands.

### 4.5 refs-fetch.mjs
- Wikimedia Commons API (no key) and Mapillary (token from .env; skip gracefully
  if unset). curl-to-disk into `refs/<poi>/`, then Read: this already powers the
  screenshot doctrine.
- `refs/<poi>/manifest.json`: per image, source URL, author, license string,
  fetch date. Visual reference only for hand-modeled stylized assets.
- `refs/inbox/`: owner-supplied photos. iteration.md checks it every task and
  files them into the relevant `refs/<poi>/` with `source: "owner"`.
- Guard (also enforced by the network hook): never fetch google domains.

### 4.6 iteration.md (the fixed per-task script)
1. Read the task file, GEOGRAPHY.md, the relevant data modules, PITFALLS.md.
2. Reference photos BEFORE building: Read everything in `refs/<poi>/` (fetch via
   refs-fetch.mjs/osm-fetch.mjs if thin; check refs/inbox/).
3. Plan. For geography work: GEOGRAPHY.md first, then data modules, citing
   osm.json coordinates.
4. Implement. Pack integration is ONE import line in `src/packs/index.js`:
   re-read the file immediately before editing, retry on conflict. Executor
   subagents (≤4 concurrent) get exclusive file ownership; orchestrator
   personally Reads every subagent screenshot.
5. Every new walkable surface: add walkprobe rules+expects; walkability
   definition lives in the data module, shared by engine and probe.
6. Verify: run /verify, then `node tools/walkthrough.mjs --ids <affected>`.
   READ every new PNG. Judge against the expectation strings, the art-director
   skill, and the refs.
7. Green: commit+push to `autopilot` with the Co-Authored-By trailer, write
   `autopilot/result.json` `{task, commit, summary, contactSheet}`. Not green
   after honest attempts: file an issue in `autopilot/issues/`, write result.json
   with `status: failed`, stop. Never mark a task done to satisfy the gate; the
   gate exists to catch exactly that.

### 4.7 Art-director skill (`.claude/commands/art-director.md`)
Encode: dusk palette (fog 0xf6ab84, 55–210); chunky toon silhouettes readable at
follow-cam distance; canvas-texture signage with measureText shrink-to-fit;
rounded, instanced, low-draw-call geometry; and the acceptance question asked of
every shot: "would a Chicagoan recognize this instantly?"

---

## 5. Location lifecycle, self-expansion, and delight

### 5.1 Lifecycle
Every location moves through a fixed pipeline, expressed as queue tasks the
planner generates (§5.3): SCOUT → LAYOUT → BUILD → DELIGHT → POLISH → SIGNOFF.
- SCOUT: osm-fetch + refs-fetch + refs/inbox. Write the location brief
  (`refs/<poi>/BRIEF.md`): what is physically there, the 3 to 5 signature
  landmarks, street topology, palette, housing/business texture, delight
  candidates (appended to delight-backlog.md as `[proposed]`), and DRAFT the
  waypoint expectation strings (decision (e): authored deliberately from refs,
  never auto-generated from data).
- LAYOUT: GEOGRAPHY.md first, then data modules, citing osm.json game coords.
  Pick the place layer (§3) and the connection per the connectivity rule (§5.3).
- BUILD: structures, walkability (+walkprobe rules in the data module), NPCs,
  signage, audio.
- DELIGHT: implement moments per §5.5.
- POLISH: art-director pass fixes, perf budget work, issue burn-down.
- SIGNOFF: §5.2. Only a green sign-off unlocks planning the next location.

### 5.2 Sign-off (what "satisfied" means, mechanically)
A location is signed off when, in one fresh full walkthrough of its waypoints:
1. Every waypoint has an authored expectation, and every expectation is judged
   met from the PNGs, with a per-waypoint verdict logged.
2. The standing gate (§6.2) is green, including the draw-call budget at every
   waypoint in the area.
3. Walkprobe covers every new walkable surface.
4. At least 3 delight moments are shipped and logged (§5.5).
5. The evocation review passes: a fresh-eyes subagent that has NOT seen the
   build tasks Reads the contact sheet against `refs/<poi>/` and must answer
   "name where you are and cite what gives it away." A wrong or vague answer
   fails the review; file polish tasks and retry after fixes.
Write `refs/<poi>/SIGNOFF.md` (verdicts + contact-sheet path), commit, notify
("X signed off"). Then and only then run the planner.

### 5.3 Site selection (the planner)
`LOCATIONS.md` is the roster: shipped (harbor, Wrigleyville), in progress, and
a seeded candidate list of famous Chicago spots (e.g. Montrose Harbor and the
Magic Hedge, North Avenue Beach, Lincoln Park Zoo and conservatory, the 606 and
Wicker Park, Logan Square, Andersonville, the Riverwalk, Millennium Park,
Chinatown, Pilsen, Museum Campus, Promontory Point). When the queue is empty
AND the current location is signed off, run.mjs invokes a planner iteration:
pick ONE next site and generate its full §5.1 pipeline into queue/.
Selection criteria, in order:
1. Recognizability: iconic to Chicagoans, distinct silhouette and texture.
2. Connectivity: prefer sites adjacent to the built map, extending the
   contiguous 1:2 coordinate world. Distant sites become hard cells reached via
   the ridable L, which is the established pattern (Wrigleyville and the train
   interior are cells). Never a third place layer.
3. Variety against what's shipped (beach vs park vs street grid vs interior).
4. Feasibility inside the perf and single-file build constraints.
The planner's first commit IS the proposal: the LOCATIONS.md update plus the new
queue tasks, and the notification names the pick ("signed off X, scouting Y;
edit queue/ or drop STOP to redirect"). The owner vetoes asynchronously by
deleting or reordering queue tasks; the autopilot branch protects main
regardless.

### 5.4 Faithfulness standard and creative liberties (decision (h))
The bar for every shipped area: someone who knows Chicago knows exactly where
they are. Concretely:
- PRESERVE: real street topology and the relative arrangement of landmarks
  (from the OSM projection); the 3 to 5 signature landmarks; the neighborhood's
  actual texture (housing stock era and style, the kinds of businesses really
  there).
- LIBERTIES ALLOWED: editorial compression beyond the 1:2 scale (drop redundant
  blocks so long as topological ORDER is preserved); caricature in the house
  toon style; invented minor businesses, NPCs, and jokes that are plausible for
  THAT neighborhood; season and time-of-day staging.
- NEVER: relocating landmarks relative to each other; wrong street
  relationships; anywhere-filler that could be any city.
The evocation review (§5.2 item 5) is the enforcement mechanism.

### 5.5 Delight (curated ledger, review at merge)
`delight-backlog.md` is the idea ledger, seeded from the standing lists in
WRIGLEYVILLE.md and harbor-new.md. Format per line: one-line quirk + location +
what makes it Chicago. The taste bar, shipped and beloved: no-ketchup house
rules, Malört guy, EAMUS CATULI + AC counter, ball-hawk Gus racing you, Go Cubs
Go from bar doors, Wrigley's Spearmint ad inside the L car.
SCOUT tasks append candidates tagged `[proposed]` with a source ref. The DELIGHT
task may implement backlog lines, including its own proposals, WITHOUT waiting
for approval, provided each passes the faithfulness standard (§5.4). Every
shipped moment is logged in `DELIGHT-SHIPPED.md` (line, location, commit) and
named in the iteration's notification. Owner review happens where it already
lives: at merge to main; anything cut becomes a revert task. Weekly, the owner
prunes the backlog and tunes the art-director skill.

---

## 6. Hooks and permissions (worktree `.claude/settings.json`)
All hook handlers are `node autopilot/hooks/<x>.mjs` (handlers run in the project
directory). Remember: exit 2 blocks with stderr fed back to Claude; exit 1 does
NOT block. PermissionRequest hooks do not fire in non-interactive mode, so every
automated decision lives in PreToolUse + settings rules.

### 6.1 guard.mjs (PreToolUse)
- Deny Bash containing destructive patterns (rm -rf equivalents, del /s,
  Remove-Item -Recurse against repo roots), and `git push` unless every refspec
  targets `autopilot`.
- Write/Edit path policy: allow the worktree, PLUS the harness's own homes —
  `%USERPROFILE%\.claude\**` (persistent memory, plans) and the session
  scratchpad under `%LOCALAPPDATA%\Temp\claude\**`. Deny everything else
  (in particular the sibling harbor-days checkouts).
- Deny any tool input containing google.com / googleapis.com / gstatic.com /
  maps or streetview URLs (decision (b), enforced mechanically).
- Network allowlist for fetch commands: overpass-api.de, *.wikimedia.org,
  graph.mapillary.com, data.cityofchicago.org, ntfy.sh, plus npm registry.

### 6.2 gate.mjs (Stop) — the acceptance gate, decision (f)
Runs only if code changed this session (ledger knows). All checks mechanical:
1. `node tools/walkprobe.mjs` exit 0.
2. `npm run build` succeeds; dist contains exactly `index.html`; log size.
3. Every shot report generated since the last code edit: zero console/page errors;
   draw calls ≤ 480 at every waypoint.
4. Fresh spawn shot with canonical params, pixelmatch vs `tools/shots/baseline.png`.
   **Calibrated, not naive**: the world layout is deterministic but cosmetic
   animation is not frame-exact (some pack cosmetics use Math.random; load time
   shifts the animation clock, so water shimmer/clouds/NPC pose differ slightly
   between runs). In Phase 2, take 5 repeated spawn shots and set the per-pixel
   tolerance + diff-ratio threshold just above the observed flake ceiling
   (expect ~1–2%, not 0.1%). If flake cannot be bounded reliably, demote this
   check to advisory and REQUIRE instead that the session Read both PNGs and
   record an explicit verdict (the eyeball comparison that caught every real
   regression to date). Diff over threshold ⇒ fail, unless HEAD commit message
   contains `[baseline-regen]` AND baseline.png changed in that commit.
5. PNG-read completeness: SessionStart hook recorded t₀; ledger.mjs (PostToolUse)
   recorded every Read file_path and every shot/act invocation. Every PNG under
   tools/shots/ with mtime ≥ t₀ must appear in the Read set. **Scoping note:**
   whether subagent tool calls appear in the ledger depends on hook scoping —
   and that is fine either way, because the doctrine REQUIRES the main session
   (orchestrator) to personally Read every PNG, including subagents' shots.
   The gate enforcing main-transcript Reads is the doctrine made mechanical,
   not an oversight.
Any failure: exit 2, stderr = numbered list of exactly what failed. The session
continues and must fix or file an issue; it cannot end silently red.

### 6.3 Settings allowlist (headless runs with these, no bypass mode)
Allow: Read; Edit/Write per the guard's path policy; Bash(node tools/*),
Bash(node autopilot/*), Bash(npm run build), Bash(npm install *)/Bash(npm ci)
(needed for Phase 0 dev-deps and lockfile repair; guard still applies),
Bash(git status/diff/add/commit/push/log/show/worktree), Bash(curl ...) subject
to guard.mjs. There is no `npm test` in this repo — do not allowlist or invoke
it; walkprobe is the test suite. Deny everything else.

---

## 7. run.mjs (outer loop)
Per iteration:
1. Between-iteration checks only (never mid-commit): if `STOP` sentinel file
   exists, notify and exit cleanly.
2. Pick lowest-numbered task in `autopilot/queue/` not in done/. If the queue
   is empty AND the current location has a SIGNOFF.md, run a planner iteration
   (§5.3) to generate the next location's pipeline. If the queue is empty
   WITHOUT a sign-off, notify and halt: something is wrong.
3. Spawn `claude -p "<iteration.md contents + TASK: file>" --output-format
   stream-json` with the worktree as cwd. Turn budget by task type:
   `--max-turns 80` default; 120 for `build` tasks (Wrigleyville-scale build
   chunks ran 30–70 tool uses PER SUBAGENT plus orchestration). Parse the
   stream: capture `session_id` from init; watch for result/error.
4. On rate/session-limit error: parse the stated reset time from the message if
   present, else back off (15 min, doubling, 2 h cap); notify "sleeping until
   <t>"; then `claude --resume <session_id>` to continue the SAME task in the
   same session. Never restart blind. (Precedent: 4 concurrent subagents were
   killed mid-task by a session cap during the Wrigleyville build and resumed
   cleanly afterward.)
5. On completion, read `autopilot/result.json`. Green: move task to done/,
   notify (task, commit hash, one-line result, contact-sheet path). Failed:
   leave the issue in issues/, notify, move to the next task; if the SAME task
   fails 3 times, park it (`queue/parked/`) and notify loudly.
6. Loop. All output appended to `autopilot/logs/run-<date>.jsonl`.

Start: `node autopilot/run.mjs`. Stop: create `STOP` or Ctrl-C. The owner
reviews asynchronously; `queue/` + `issues/` + ntfy is the whole interface.
Weekly human ritual (not automated): review contact sheets, approve `[proposed]`
delight lines, adjust the art-director skill, reorder the queue, merge
`autopilot` → main.

---

## 8. PITFALLS.md seed (verbatim; all cost real debugging time)
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

---

## 9. Build phases (execute in order; each ends with its own verification)

**Phase 0 — Preflight.** Verify origin/main contains 02aa933 (the full game
including Wrigleyville); halt and ask the owner if not. Create the `autopilot`
worktree (`git worktree add -b autopilot ..\harbor-days-autopilot main`).
`npm install` there; add devDependencies pixelmatch + sharp (devDeps ONLY — the
game bundle must not grow; playwright is already present). Create autopilot/
skeleton, .env template, .gitignore entries (autopilot/.env, autopilot/logs/,
autopilot/session-state.json, tools/shots/run-*), seed PITFALLS.md (§8),
delight-backlog.md (§5.5), and LOCATIONS.md (§5.3, marking harbor and
Wrigleyville shipped). Commit.

**Phase 1 — Instrumentation.** main.js additions (§4.2). Light refactor of
shot.mjs to export a function, CLI preserved. Verify: existing /verify still
passes; a manual shot with ?canary= shows the console echo in the report.

**Phase 2 — Harness.** gen-waypoints.mjs + waypoints.expect.json (author
expectations for existing harbor + Wrigleyville POIs as part of this phase),
walkthrough.mjs, contactsheet.mjs. **Flake calibration**: 5 repeated spawn
shots; set the §6.2 item-4 thresholds from the observed ceiling. Verify: full
run on the current world; every waypoint shot READ; report.json clean; contact
sheet renders; canary and wrong-port behaviors demonstrated (run with a decoy
Vite on 5173).

**Phase 3 — Reference pipeline.** osm-fetch.mjs with projection + LAKEFRONT
anchor asserts (§4.4), refs-fetch.mjs (§4.5), refs/inbox flow. Queue task 001 =
ODbL attribution. Verify: Belmont Harbor osm.json projects correctly (anchor
asserts pass); the Wrigleyville offset case is exercised (fetch its bbox with
the documented offset and confirm Clark/Addison land on the cell's data
coordinates); a Wikimedia fetch lands with manifest; google URLs are denied by
guard.

**Phase 4 — Loop, hooks, notify.** settings.json, all four hooks, iteration.md,
art-director skill, notify.mjs, run.mjs. Verify each gate check by forcing it to
fail once (broken walkprobe expect, injected console.error, moved flower vs
baseline, an un-Read PNG) and confirming exit-2 behavior; verify ntfy posts;
verify STOP sentinel; verify push-to-main is denied; verify a memory write to
`%USERPROFILE%\.claude` is ALLOWED (guard path policy).

**Phase 5 — Supervised dry run.** Two small real tasks from the queue with the
owner watching notifications (suggested: one expectation-authoring task, one
small polish task from the approved delight backlog). Owner reviews contact
sheets and the commits on `autopilot`.

**Phase 6 — Unattended.** Only after Phase 5 is clean. Cap: subagents ≤4.
Once the current location signs off (§5.2), the planner self-expands per §5.3;
the first planner run should happen while the owner is watching notifications.

---

## 10. What NOT to do
No duplicating shot/act/walkprobe. No hand-writing waypoints.json. No Google
data in any form. No OSM geometry imported as game geometry. No third place
layer. No localStorage. No pushes to main. No shell one-liner hooks (PowerShell
5.1). No trusting an unviewed screenshot. No unlogged delight (everything ships
through DELIGHT-SHIPPED.md for merge review). No relocating real landmarks
relative to each other, and no anywhere-filler. No starting a new location
before the current one's SIGNOFF.md exists. No marking a task green that isn't.
No validating a displaced cell's x-frame against the true projection. No new
runtime dependencies — tooling deps are devDependencies only.
