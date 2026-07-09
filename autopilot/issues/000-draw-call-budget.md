# 000 — draw calls exceed the 480 budget across today's world (pre-autopilot)

- severity: medium (perf debt; 60fps mid-phone target at risk in the hot views)
- found: 2026-07-07, Phase 2 harness bring-up — the FIRST per-waypoint draw-call
  measurement ever taken (the __hd.perf() probe is new)
- evidence: tools/shots/run-mrbjrqz2/report.json — 59 of 144 framings over 480;
  max 1298. Worst offenders: wv-marquee (all framings ~1100–1298), wv-scoreboard,
  wv-gate-* (~900–1100), wv-rooftop-view (700–947), wv-statue-row (704/838),
  wv-gallagher-way (560–751); lakefront: spawn north-facing 752, garden/rocks
  views 500–700. Headless fps (SwiftShader, advisory) sags to 36–55 in those.
- expected: CLAUDE.md hard constraint 3 — scene draw calls ≤ ~480 worst case.
- observed: the Wrigleyville cell and the grown lakefront both exceed it; the
  budget predates Wave 4 content and was never re-measured per-view.
- disposition: tools/budgets.json holds an OPERATIONAL budget so the
  gate stays meaningful against regressions while the ratchet tasks do the
  instancing/bucketing work and walk the number back down to 480.
  PITFALLS.md reminder applies: r128 toon materials ignore setColorAt — bucket
  per color when consolidating.

## Ratchet pass 1 (task 004, 2026-07-08)

Max dropped 1298 → ~964 (deck-1-f1; run in tools/shots/, see budgets.json
"measured"). What did it: `mergeCellStatic()` (src/cells.js) bakes each cell's
static builder meshes into per-material × 120 m z-band merges (lakefront +
wrigleyville roots), and the chibi rig went 13+ meshes → 10 (merged leg+shoe,
arm+hand, head+cheeks, hair extras folded into one hair mesh; hands stay live
empty Groups for held props). Animated builder content is exempted via
userData.live / material.userData.timeAnim (water, bobbers, dog, fielders,
W flag, trains).

Remaining offenders, attributed with `node tools/census.mjs` (hot views
deck-1-f1 / zone-diversey-point-f1 ≈ 900–970):
- chibi crowds: 10 draws × ~34 rigs in frustum ≈ 350 draws (next: merge eyes,
  fold hair into head — they bob in lockstep, instance the shadows).
- pack-added statics that land on scene AFTER endCellCapture and so escape the
  cell merge: 27× skin spheres (swimmer heads), 22× white planes, 18× gray
  spheres at deck-1.
- statue chibis (cell-*/chibi rows) are fully static but exempted by the
  'chibi' name guard.
Queue task 007-draw-call-ratchet-2.md carries these levers.

Side effect found by gate check 4: the build-time merges (mergeCellStatic +
per-chibi rig merges) add roughly 1.5–2.5 s to world startup under SwiftShader
— at the gate's fixed 3.5 s wait the camera settle-lerp was caught mid-flight
(36.7% spawn diff; at 6 s / 9 s waits the view is pixel-identical to baseline,
so no visual regression). Fixed the shot-stability half by snapping the camera
to its rest position on ?play=1 starts (main.js runStart, existing camCtl.snap
mechanism). The startup cost itself is a 007 lever: cache or defer the merges.

## Ratchet pass 2 (task 007, 2026-07-09) — CLOSED at target

Max dropped 964 → 477 (wv-gate-bleacher-f1; run-mrcywh3s, 156 shots, 0 errors,
0 framings over 480). budgets.json now says 480 == target. Levers, in order of
effect:
- chibi rig 10 → 6 draws (src/character.js): eyes + hair fold into the head
  mesh, leg+shoe / arm+hand / head+cheeks share one white vertex-colored toon
  material; geometry templates cached per hairStyle|bigEyes|face so a rig is a
  clone + color stamp. `face:true` keeps a live eye mesh (7 draws) for
  setFace/squint users (mayor, vendors). Shadows: one global 256-cap
  InstancedMesh (updateChibiShadows) — 0 draws per rig.
- bakeChibiRig(): rigs that never re-pose after setup collapse to ONE mesh
  (69 pack rigs across watertoys/parklife/lawnlife/wrigley-gameday; statue
  chibis get baked despite the 'chibi' merge guard).
- LOD twins (src/framework.js makeNPC): staticLod (swap at 58/62 m) and
  moverLod (87/93 m, position/rotation synced per tick) give distant NPCs a
  1-draw baked twin; 21 standers + 7 movers in Wrigleyville. Packs hide rigs
  via npc._lodActive so visibility writes don't fight the swap.
- fog-depth culling (src/fogcull.js, new): linear fog ends at ~210 m, so any
  mesh whose whole bounding sphere sits past fog.far+8 m in view depth is pure
  fog color — hidden pixel-neutrally. Exempt: fog:false materials, additive
  blending, InstancedMesh, chibi subtrees, userData.noFogCull.
- wrigley sign atlas (village.js atlasPlane/emitAtlas): 34 canvas-texture
  planes → 1 opaque + 1 alpha mesh; runtime-redrawn textures (marquee, W flag)
  excluded.
- misc: per-cloud lobe merges in sky.js (27→~6), skip-stone piles instanced,
  merge bands widened 120→240 m (fog culling made fine bands useless; the
  wrigley cell merges as a single band).

Startup cost (the pass-1 concern): template caching + fewer meshes to merge
eliminated it. run-mrcywh3s first framing reports buildMs = { build: 155,
merge: 12, packs: 225 } — ~0.4 s total vs pass-1's 1.5–2.5 s. window.__hd.perf()
now includes buildMs so future runs keep measuring it.

Accepted visual deltas (all reviewed in the 158-PNG read of run-mrcywh3s):
eyes ride the head bob mid-gait (was: fixed offset), distant LOD twins are
prop-less default-pose (invisible in stills beyond 58/90 m), and face:true
rigs read slightly wider-eyed at close range.
