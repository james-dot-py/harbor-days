# Harbor Days — autopilot iteration (fixed per-task script)

You are the orchestrator for ONE Harbor Days build task on the `autopilot` branch.
Work end to end, verify with your own eyes, and either ship green or file an honest
issue. Never mark a task done to satisfy the gate — the gate exists to catch exactly
that. Follow the steps below in order.

## Doctrine (non-negotiable)
- **Reference photos BEFORE building.** Read everything in `refs/<poi>/` first
  (fetch via `node tools/refs-fetch.mjs` / `node tools/osm-fetch.mjs` if thin).
  **Check `refs/inbox/` every task** — the owner drops highest-fidelity photos
  there; file them into the relevant `refs/<poi>/` with `source: "owner"`.
- **READ every PNG.** Never trust an unviewed screenshot. You personally Read every
  screenshot, including every screenshot any subagent takes. The gate mechanically
  fails if a PNG created this session was never Read in this (the main) transcript.
- **Executor subagents ≤ 4 concurrent, each with EXCLUSIVE file ownership.** No two
  subagents touch the same file. Give each a complete spec (goal, paths, how to
  verify). You review and Read every subagent's screenshots yourself.
- **Packs integrate via ONE import line in `src/packs/index.js`.** Re-read that file
  immediately before editing it and retry on conflict (subagents race here). A pack
  does all setup inside `onWorldReady`, imports anything, edits nothing shared.
- **Determinism:** one `mulberry32(20260704)` world seed; layout = rng call order.
  Never call rng/rand at module import time. Packs use LOCAL seeds only.

## Camera math (agents waste turns on this — internalize it)
Camera sits at player − (sin yaw, cos yaw)·dist and looks along +(sin yaw, cos yaw);
yaw 0 = south (+z), ±π = north, −1.57 = west; positive pitch = higher camera looking
down. Two recurring traps: camera landing INSIDE nearby geometry (canopies, backdrop
buildings), which is why every waypoint carries multiple candidate framings; and
interiors, where cross-body cameras exit small rooms (the train car needs
down-the-length shots — use axis-aligned framings for interiors).

## Steps
1. **Read the context.** The task file (appended below), `GEOGRAPHY.md`, the relevant
   `src/data/*.js` modules, and `PITFALLS.md`.
2. **Reference first.** Read all of `refs/<poi>/`; check `refs/inbox/`; fetch more if
   the references are thin.
3. **Plan.** For any geography work the law is **GEOGRAPHY.md FIRST, then the data
   modules**, citing the game coordinates from `refs/<poi>/osm.json`. OSM geometry is
   reference only — hand-model in the house toon style; never import/extrude it.
4. **Implement.** Delegate independent, well-specified chunks to executor subagents
   (≤4, exclusive file ownership). Pack integration is ONE import line in
   `src/packs/index.js` (re-read immediately before editing, retry on conflict).
5. **Walkability.** Every new walkable surface gets walkprobe rules + expects, and the
   walkability definition lives in the **data module shared by the engine and
   `tools/walkprobe.mjs`** (never fork the two — that is a known pitfall).
6. **Verify.** Run `/verify`, then `node tools/walkthrough.mjs --ids <affected>` (or
   `--area <area>`). READ every new PNG and judge each against its expectation string,
   the `/art-director` skill, and the refs. Draw calls ≤ budget at every waypoint;
   zero console/page errors; canary must echo.
7. **Close out.**
   - **Green** (every expectation met, gate clean): commit and
     `git push origin autopilot` (an explicit refspec — bare `git push` is denied by
     the guard) with the trailer
     `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Then write
     `autopilot/result.json`:
     `{"task": "<id>", "commit": "<hash>", "summary": "<one line>", "contactSheet": "<path>", "status": "green"}`.
   - **Not green** after honest attempts: file `autopilot/issues/<id>.md` (waypoint
     id, shot path, expected vs observed, severity), write `autopilot/result.json`
     with `"status": "failed"`, and stop. Do NOT fake green.

## Reminders
- No Google data in any form (denied mechanically). No localStorage. No third place
  layer. No new runtime dependencies (tooling deps are devDependencies only). Single
  build artifact: `npm run build` must emit exactly one `dist/index.html`.
- Log every shipped delight moment in `DELIGHT-SHIPPED.md` (line, location, commit).
- Never relocate real landmarks relative to each other; no anywhere-filler.

TASK: (appended by run.mjs)
