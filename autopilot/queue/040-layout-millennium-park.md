---
id: 040
area: millennium
type: layout
model: fable
turns: 100
title: Millennium Park LAYOUT — GEOGRAPHY.md first, then src/data/millennium.js + walkprobe
acceptance: >
  (1) GEOGRAPHY.md gains a MILLENNIUM_GEOGRAPHY section (the law: GEOGRAPHY.md
  FIRST, then data), citing game coords from refs/millennium-park/osm.json:
  the cell frame and bounds/clamp; street topology (Michigan Ave west edge,
  Randolph north, Monroe south, Columbus mid/east); positions for the anchor
  set (Cloud Gate on AT&T Plaza, Pritzker Pavilion + Great Lawn + trellis,
  Crown Fountain at the Michigan & Monroe corner, Lurie Garden SE, BP bridge
  serpentine east, Wrigley Square peristyle NW, McCormick Tribune Plaza cafe,
  Chase Promenade allee, the Michigan Ave streetwall backdrop); the arrival
  point (Red Line = the State St SUBWAY: a CTA subway stair kiosk placed at
  the park's Michigan Ave edge — the State-to-Michigan block is compressed, a
  standing liberty recorded exactly like the Wrigleyville x-frame); and a
  STANDING LIBERTIES list (displaced cell-local frame both axes; block
  compression; perpetual-summer staging — McCormick plaza is the cafe, no ice
  rink; homage register for the copyrighted artworks; TRUE compass
  orientation kept — north up, lakeward east). (2) src/data/millennium.js
  created: PURE DATA, node-importable, no THREE import, no rng at import
  time; exports the cell bounds/clamp, WALK_M walk quads/rects, a shared
  walkableM(x,z) (THE single walkability definition the engine AND
  tools/walkprobe.mjs will both import — never fork them), landmark anchors,
  backdrop-band data, SPAWN_M, minimap bounds MAP_M — the same export
  discipline as wrigleyville.js. Real proportions at 1:2 land / 1:1 objects:
  Randolph-to-Monroe is 250 address units = ~503 m real = ~251 game units N-S;
  Michigan-to-Columbus ~160 game units E-W. SUGGESTED cell region (verify and
  finalize): x +40..+200, z +640..+920 — south of the lakefront map
  (WORLD_CLAMP.zMax 408, downtown really is south), disjoint from the
  wrigleyville clamp (x -365..-115, z -615..-310), the redline-car pocket
  (-250,-650), and safely clear of wrigleyville.js's `player.x < -100`
  dev-spawn activation check (a z>500 check can disambiguate millennium
  spawns cleanly). (3) tools/walkprobe.mjs gains millennium rules + expects
  (pure data mirror; the cell is not in the engine yet — that is 041), and
  exits 0. (4) The final mp-* waypoint STAND list (positions, feature
  targets, framing hints) + the final expectation strings are staged in
  refs/millennium-park/BRIEF.md under a "WAYPOINTS (final)" heading — do NOT
  write tools/waypoints.expect.json yet: gen-waypoints fails loudly on expect
  ids that match no waypoint, and the waypoints only exist once 041 wires the
  module into gen-waypoints.mjs. (5) Verify: `node tools/walkprobe.mjs` exit
  0; `npm run build` emits exactly one dist/index.html; the world is
  bit-identical (data-only change, no builder touched — spawn shot matches
  baseline.png); zero console errors on a canary-verified spawn shot, PNG
  personally Read.
refs:
  - refs/millennium-park/osm.json + BRIEF.md (task 039 output — read first)
  - GEOGRAPHY.md WRIGLEY_GEOGRAPHY section (the displaced-cell precedent:
    frame liberties, clamp, corridor tables — mirror its rigor)
  - src/data/wrigleyville.js (the data-module export discipline to copy)
  - AUTOPILOT.md §4.4 (displaced cells), §5.4 (faithfulness standard)
  - PITFALLS.md (displaced x-frames; walkprobe/engine sharing; pathSamples
    phase sensitivity — do not touch lakefront ribbons)
---

Judgment task: this file fixes the coordinate truth every build task
downstream cites. Get the RELATIVE arrangement exactly right (§5.4 —
never relocate landmarks relative to each other): peristyle NW, pavilion NE
with the Great Lawn and trellis south of its stage, the Bean between
Washington and Madison just east of the McCormick cafe terrace on Michigan,
Crown Fountain SW at Monroe, Lurie SE behind its shoulder hedge, BP bridge
snaking east from the lawn's SE corner. Editorial compression is allowed
(drop redundant lawn panels; the park may read slightly tighter than 1:2) so
long as topological ORDER survives.

Walkability topology to define in WALK_M: the Michigan Ave sidewalk spine,
Chase Promenade, the plaza around the Bean (continuous UNDER the sculpture's
arch), Crown Fountain's reflecting pool (a walkable wet plaza), the Great
Lawn, Lurie's boardwalk loop, and the BP bridge deck as elevated quads with
ramp-only access (PITFALLS: elevated rects adjacent to walkable ground act
as elevators via the 0.5 step-up threshold — enclose the deck edges so only
the ramps connect levels). The cell edge treatment: Randolph/Monroe/Columbus
are scenery streets behind low fences/hedges (the Wrigleyville barricade
register, but quieter — planters and park fence, no CPD theatrics downtown).
