---
id: 045
area: millennium
type: build
turns: 100
title: Crown Fountain — glass-block face towers + the wet plaza spout
acceptance: >
  The SW corner (Michigan & Monroe per 040) reads as Crown Fountain: (1) Two
  glass-block towers (~5 m square, ~15 m tall, 1:1 objects) facing each
  other N-S across the shallow black-granite reflecting pool; tower shells =
  stacked translucent block texture (canvas grid + emissive glow tint —
  they are the park's dusk lanterns), inner LED face = a canvas-texture
  CHIBI face in the house character style (homage register: Plensa's video
  faces are art, ours are toon citizens — absolutely NO real-person
  likenesses), one face per tower, slow blink/gaze idle cycle via canvas
  swap or uv offset on a registerUpdate throttle (no per-frame canvas
  redraws, no per-frame allocations). (2) The POOL: the walkable wet plaza
  between the towers — near-black reflective slab with a skim highlight,
  judged against the issue-003 precedent: NO z-fighting flicker (reuse the
  Gallagher splash-pad layering fix from src/packs/wrigley-vendors.js).
  walkableM covers it (040); walkprobe expects pass. (3) THE SPOUT: on a
  ~40 s local-seed cycle a tower's face purses and a water ARC spouts from
  the lips into the pool — arc mesh/particles + splash ring + synthesized
  splash audio (getAudioCtx, null-guarded); standing in the arc's landing
  zone soaks the player: screenFx + a toast gag (single toast, PITFALLS —
  never queue per-frame). A couple of kid NPCs shriek-and-scatter on the
  spout (simple scripted dash, reuse makeNPC bump machinery). (4) The mp
  fountain waypoints judge GREEN against their 040 expectations from a
  fresh scoped walkthrough (the money shot: both lit towers + their pool
  reflections + a spout mid-arc — use an act.mjs wait to catch the cycle),
  every PNG personally Read. (5) Draws <= 480 at every mp waypoint (towers
  = few meshes; face + blocks are textures, not geometry); zero console
  errors; baseline intact (local seed only); walkprobe exit 0; single-file
  build; desktop + touch both fine (no new input claims).
refs:
  - refs/millennium-park/BRIEF.md + osm.json (corner position truth)
  - GEOGRAPHY.md MILLENNIUM_GEOGRAPHY
  - src/packs/wrigley-vendors.js splash pad (the layering/flicker fix to
    reuse), autopilot/issues — closed issue 003 (the anti-pattern)
  - src/character.js (the chibi face vocabulary the tower faces should echo)
  - PITFALLS.md (toast queue; audio null guard; per-frame allocation ban)
---

The park's most playful landmark and the one kids remember. The build is
two lanterns and a puddle — the LIFE is the spout cycle. Get the dusk read
right: the glass-block glow is what makes the corner (screenshot at the
default dusk palette and check the towers read as lit from within, not as
grey boxes).

Scope guard: the full Plensa piece cycles a thousand Chicagoans' faces;
ours cycles 3-4 hand-drawn chibi faces (rotate on the spout cycle). That is
the right amount — do not build a face pipeline.
