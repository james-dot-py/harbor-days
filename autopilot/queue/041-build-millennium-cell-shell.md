---
id: 041
area: millennium
type: build
turns: 140
title: Millennium cell SHELL — registration, ground, streets, Michigan Ave cliff, arrival kiosk, waypoints live
acceptance: >
  The millennium cell exists in-engine and its shell waypoints judge green:
  (1) src/packs/millennium.js pack (ONE import line added to
  src/packs/index.js — re-read that file immediately before editing, retry on
  conflict) + builders under src/millennium/* + registerCell (src/cells.js
  pattern) with id 'millennium': root group, walkable/surfaceY delegating to
  walkableM from src/data/millennium.js (the SHARED definition — never fork
  engine vs walkprobe), clamp, spawn, minimap card (canvas base + bounds,
  like the wrigleyville card). Dev spawns inside the cell region activate it
  (the wrigleyville.js `player.x < -100` precedent; use the 040-documented
  z>500 check). ALL of it built with a LOCAL mulberry32 seed inside
  onWorldReady — zero shared-rng calls, so the lakefront world stays
  bit-identical (spawn shot matches baseline.png, no [baseline-regen]).
  (2) Ground + streets: park lawns/paving per WALK_M, the Michigan Ave
  sidewalk spine, Chase Promenade allee (instanced trees), scenery edge
  streets (Randolph/Monroe/Columbus with curbs, planters, park fence — sparse
  toon cars fine) and the arrival: a CTA SUBWAY STAIR KIOSK on the Michigan
  Ave edge (stair down to a fenced landing, red RED LINE pylon signage in the
  042 register — back-to-back FrontSide sign faces, post ends at the panel's
  bottom edge, both per PITFALLS). The stair is the 042 boarding point; it
  dead-ends politely until then (no "future" signage — task 030 owner rule).
  (3) The MICHIGAN AVE STREETWALL backdrop: the west cliff — a band of
  instanced/merged limestone-and-brick tower masses with lit-window texture
  (sky.js skyline / BACKDROP_W register) rising just west of Michigan Ave,
  tall enough to read as downtown canyon from anywhere in the park; NOT
  enterable, camera-safe (add VOLS_M volumes). Beyond the other edges: a
  lower Loop backdrop band east (across Columbus) and north. (4) Instanced
  buckets live under the CELL ROOT only (r128 InstancedMesh sets
  frustumCulled=false — anything at scene level draws in EVERY view,
  including the lakefront; budget instanced adds as global-while-active).
  (5) gen-waypoints.mjs imports the module: mp-* waypoints (the 040 stand
  list) with 3+ spread framings + VOLS_M camera clearance; the 040-authored
  expectation strings land in tools/waypoints.expect.json in the SAME commit.
  (6) walkprobe: engine-parity rules for every shell surface, exit 0.
  (7) Verify: /verify green; `node tools/walkthrough.mjs --area millennium`
  with canary echo; READ every PNG personally; the shell waypoints (arrival,
  streetwall, promenade, edge streets) judge green against their
  expectations; landmark-pad waypoints (bean/pavilion/fountain/lurie/bridge)
  are EXPECTED to show dressed empty pads — judge only "ground + backdrop
  read correctly" there and note the rest for 043-046; draw calls <= 480
  (tools/budgets.json) at every mp waypoint; zero console/page errors;
  single-file build.
refs:
  - GEOGRAPHY.md MILLENNIUM_GEOGRAPHY (task 040 — the coordinate law)
  - src/data/millennium.js + refs/millennium-park/BRIEF.md "WAYPOINTS (final)"
  - src/packs/wrigleyville.js + src/wrigley/index.js + src/cells.js (the
    cell-pack pattern to copy), src/wrigley/streets.js (curb/backdrop kit)
  - src/urbankit.js (task 015 street furniture — reuse, don't duplicate)
  - PITFALLS.md (merge-pool add() snapshot; BACKDROP band/dir index coupling;
    cached-toon-color bucket rules; sign pitfalls; gen-waypoints featW stands)
---

The bring-up task: after this lands, the park is a real place you can stand
in — walkable, framed by the Michigan Ave cliff, minimapped, measured by
waypoints — with clean pads where the landmarks go. Keep the landmark pads
honest ground (paving/lawn per the layout), never placeholder geometry.

Perf note: this cell's draw-call ceiling is shared with everything global
(HUD, sky). Wrigleyville's worst view is 477/480 — but that is with ITS cell
active; the millennium cell starts near the sky-plus-HUD floor. Still, spend
draws deliberately: the streetwall is the place for one big merged mesh, not
per-window geometry. Report census() before/after.
