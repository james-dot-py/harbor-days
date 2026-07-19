# Harbor Days — Claude guide

Cozy Three.js (r128) walking game of Chicago's north lakefront (Belmont Harbor, the
Belmont Rocks, AIDS Garden, dog beach, Bill Jarvis sanctuary, Marovitz golf, Waveland
clock tower). Animal Crossing vibe: toon shading, curved world, chibi mayor, 100%
synthesized WebAudio. 1 unit = 1 m. +z = south, −z = north, the lake is east (+x).
Water y = −2.3, park y = 0.

## Vision (owner's)

"The ultimate Chicago video game" — playground version of the city, endearing,
potentially addictive. Recognizable to locals — mirror real geography, no guessing.
Map grows toward the whole Lakefront Trail + Lincoln Park + conservatory + ponds;
eventually other American cities as data packs. **Future requirement: ride the L to
other neighborhoods** (a Belmont platform stub + passing Brown Line trains exist as
the hook). Long-term: port to Godot 4 once the fun is proven ("playtesters return
unprompted"); until then everything stays in this repo. Photo mode: explicitly rejected.

## Architecture

- `GEOGRAPHY.md` — THE canonical map layout (v0.4+): real Belmont-to-Irving-Park
  geography at 1:2 distance scale, 1:1 object scale (map x −10…245, z −850…+320;
  z=0 at Belmont Ave, x=0 at Lake Shore Drive). Researched against the real place.
  When the map grows or anything moves, update GEOGRAPHY.md FIRST, then data.
- `index.html` — CSS/DOM shell (title card, pill, hint, banners, minimap, journal,
  touch controls). No game logic.
- `src/core.js` — renderer/scene/camera, shared rng, toon()/bmat()/curveMat()
  material helpers (they inject the world-curve vertex shader — use them for every
  mesh), glow/points helpers, `game` state object.
- `src/data/chicago.js` — THE CITY PACK. All placement data: coasts, LAND polygon,
  terraces, trails, zones, props, landmarks, minimap bounds. The rule: another city
  ships a different file of this shape and no builder changes. Add layout here, not
  in builders.
- `src/coast.js` — analytic terraces: `coastQuery`/`tierAt` drive BOTH rendering and
  walkability. Reshape coasts only via data; both stay lockstep automatically.
- `src/sky.js`, `src/paths.js`, `src/props.js`, `src/structures.js` — world builders.
- `src/character.js` — `createChibi()` (mayor + NPCs share it). Rig is nested: shoes
  are children of legs, hands of arms — swing is inherited; never re-add manual
  shoe/hand position animation (that was Bug 2).
- `src/framework.js` — gameplay API: `onWorldReady`, `registerUpdate`,
  `addInteraction` (E / hand button), `chargeThrow`, `makeNPC` (+bump "ope" lines),
  `toast`, `journalSection`, `state`, `screenFx`, `holdItem`, `getAudioCtx`.
- `src/packs/*.js` — content packs (activities, ambience). One module per pack, one
  import line in `src/packs/index.js`. Packs do all setup inside `onWorldReady`,
  import anything, edit nothing shared.
- `src/main.js` — build order, player/walkability, main loop, start wiring.
- `src/fx.js`, `src/audio.js`, `src/input.js`, `src/minimap.js` — as named.

## Hard constraints (do not regress)

1. **Determinism**: one mulberry32 rng (seed 20260704); world layout = rng call
   order. Builders run top-to-bottom from main.js; never call rng()/rand() at module
   import time. Any unintended world change shows up as moved towels/flowers.
2. **Single-file build**: `npm run build` → one self-contained dist/index.html
   (vite-plugin-singlefile). Must stay shareable as one artifact.
3. **Perf**: 60fps on a mid-range phone. Instance repeated geometry; current scale
   (v0.5 tall map): terraces ~2,800, piles ~1,800, tufts ~1,600, trees ~220 (4-lobe
   canopies) — each a single InstancedMesh. Scene draw calls ≤ ~480 worst-case.
   No per-frame allocations in update loops.
4. **Audio**: 100% synthesized WebAudio, zero assets. `getAudioCtx().actx` is null
   until the user clicks start — always guard.
5. **Storage goes through `src/store.js` — nowhere else.** The old rule was a
   flat "no localStorage/sessionStorage": in the claude.ai artifact sandbox the
   ACCESS ITSELF throws, so a bare `localStorage.getItem` killed the game. The
   owner's 2026-07-16 directive (persist progress; tasks 077/078) relaxes it
   through one guarded door: `getFlag`/`setFlag` probe once, never throw, and
   silently fall back to an in-memory map — so the artifact context degrades to
   session-only instead of dying. Never touch `localStorage` directly, never
   branch on whether it worked, never nag the player about it. Task 078's save
   adapter grows this module; keys are `ope.<thing>.v<n>`.
6. **Three r128 gotchas**: shader patches match exact anchor strings
   (`gl_Position = projectionMatrix * mvPosition;`, `#include <common>`,
   `#include <begin_vertex>`); RGBFormat DataTexture toon ramp; no CapsuleGeometry/
   OrbitControls. If upgrading three, migrate all of these at once — never mix.
7. **Desktop + mobile** both work: WASD/SPACE/E/J/R/F/Z/C/wheel and touch joystick +
   buttons. R is claimed by the progression pack (Divvy bell / radio station cycle).
   SPACE = jump (main.js jphys), F = firework launch.
   Test both on every change.
8. **De-brand law (owner 2026-07-18, task 094):** no real commercial mark as
   player-visible text — display strings use the pun ledger in **RENAMES.md**
   (Wiggly Field, Chubs, Dibsy, Olde Stylo, Malörp, Lallapawlooza…). Geographic/
   street/park names, honorary ways, person names, and the Ko-fi rail stay real.
   Ids/save keys never change for a rename. Extend RENAMES.md when new brands
   would otherwise appear.

## Dev workflow

- `npm run dev` → http://localhost:5173 (often already running; check before starting).
- Debug URL params: `?play=1` skips title; `?x=&z=` spawn; `?yaw=&pitch=&dist=` camera;
  `?coach=1` force the touch coach marks (ignore the seen flag) / `?coach=0` suppress;
  `?a2hs=1` force the iOS install hint (invisible to headless Chrome otherwise).
  Touch shots need `node tools/act.mjs … --mobile` (390x844) or `--mobile --landscape`
  (844x390); `--file=` takes an actions JSON (`swipe`/`drag` ops drive the look + stick).
- `node tools/shot.mjs <name> "play=1&x=..&z=.." [waitMs]` — headless screenshot to
  tools/shots/<name>.png + console-error report. READ the PNG and look at it.
- `node tools/act.mjs` — scripted actions (goto/key/wait/shot) for interaction tests.
- `tools/shots/baseline.png` — the reference Belmont Rocks view; compare after any
  world-affecting change.

## Original artifacts

`..\harbor-days.html` (v0.2 single-file original) and `..\HANDOFF.md` (v0.2→v0.3
spec) — read-only history; do not edit.
