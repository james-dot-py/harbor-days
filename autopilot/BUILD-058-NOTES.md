# BUILD 058 — BP crossing + all of Maggie Daley: shared executor notes

The FOUNDATION (data flag flip, perf infra, ground carve, minimap, walkprobe,
wiring) is DONE by the orchestrator. Flag `OPEN_GRANT.maggie` is LIVE. Your job
is the MESHES in your one file. Do NOT touch any other file (exclusive
ownership). All coords are game units (1u=1m); +z=south, +x=east(lake), park
grade y=0. Perpetual summer DUSK (fog 0xf6ab84 warm).

## The index.js API you attach to (import from './index.js')
- `millenniumRoot` — add(mesh) here (the cell root).
- `emitInstanced(geo, records, {basic})` — per-COLOR InstancedMesh buckets.
  records: `{pos:[x,y,z], yaw?, rx?, scale?:[x,y,z], color}`. basic:true → self-lit bmat.
- `poolInstanced(geoKey, geo, records, {basic})` — SHARED cross-builder instanced
  pool (P2). USE THIS for any repeated geometry (trees, lamps, X-masts, rocks,
  holds, flags): enqueue records; index emits ONE InstancedMesh per (geoKey×color)
  after all builders run. geoKey must map 1:1 to a distinct geometry. Reuse
  cached `toon()` color hexes so cross-zone repeats fold to one bucket.
- `flatGrid(w,d,y,color,cx,cz)` — a curve-shaded ground plane (mesh, not added).
- `segStrip(a,b,halfW,y0,y1,color)` — a rotated/sloped ground strip a→b (added).
- `COL` — the ground palette: {base,lawn,lawnDk,pave,plaza,gran,pool,wood,cafe,soil,wall}.
- from '../core.js': `toon(hex)`, `bmat(hex,{map,side})` (SELF-LIT — no toon ramp),
  `mulberry32(seed)`. from '../props.js': `collide(x,z,r,h?)`.
- from 'three/examples/jsm/utils/BufferGeometryUtils.js': `BufferGeometryUtils.mergeBufferGeometries(geos,false)`.

## HARD RULES (regressions = task failure)
1. DETERMINISM: LOCAL `mulberry32(<your unique seed>)` only — NEVER the shared
   world rng, NEVER rng at module top-level (call it inside your build fn).
2. DRAW-CALL DISCIPLINE (budget 480, current max ~363; 058 gets ≤22 NEW instanced
   buckets total across all three files). Plain solid Meshes added to
   millenniumRoot FOLD FREE via mergeCellStatic (bake per material) — prefer them
   for one-off masses; reuse `toon()`/`COL` hexes already in the pool so they fold
   into existing buckets (+0). Use poolInstanced for repeats. Self-lit metal
   (steel, stainless) uses `bmat` (toon steel reads GREEN at grazing angles —
   PITFALLS). A `bmat` with a UNIQUE canvas map = its own bucket (+1).
3. SIGNS/TEXT: back-to-back FrontSide planes (a lone DoubleSide plane reads
   MIRRORED from behind); text gets its OWN measureText-fitted canvas.
4. Toon SILVER/steel → self-lit bmat (see rule 2).

## ART READS (from refs/millennium-park/ — studied by the orchestrator)
- **Skating ribbon (owner aerial + 2014 winter)**: a serpentine PALE path (not a
  sheet), white PIPE RAILINGS on BOTH edges, rockwork + planting-bed rims,
  X-mast floodlights. Loops around the central climbing-wall island. A faceted
  gray metallic WARMING HUT (standing-seam roof) sits at the SW lobe (232,762).
- **Climbing walls (20151008)**: GRAY FACETED angular panels (crystalline
  origami folds), candy-colored HOLDS scattered (red/yellow/blue/green small
  studs), exposed STEEL TRUSS on the backs/undersides. Wall A = tall faceted
  crescent (h12); wall B = lower prow (h9) with visible truss.
- **Lighthouse + slide (20151008)**: RED-and-WHITE diagonal-STRIPED cylinder,
  round observation deck on top (wood deck + metal-mesh railing + RED roof rim),
  round PORTHOLE windows; a curling STAINLESS TUBE SLIDE spirals down onto
  BLUE-GREEN speckled WAVE-RUBBER ground.
- **Play ship (Gabriel photo)**: NAVY-BLUE hull, rounded prow, RED gunwale/top
  rail, SILVER tubular railings around the top deck, central silver MAST with a
  wind-vane (anemometer cups), RED rope NETS draped down the hull, black portholes.
- **Fort + rope bridge (winter photo)**: timber FORT tower + an ORANGE rope
  SUSPENSION bridge (vertical rope hangers, a catenary droop); steel arch tunnels.
- **X-mast floodlight (2022 lights)**: WHITE tubular steel poles crossing in an X,
  cylindrical spotlight cans clustered at the crossing + a flat LED area light.
  This is Maggie's SIGNATURE fixture (NOT the park's quad-globe lamps).
- **CSG pavilion (ref)**: two tall WHITE Corinthian COLUMNS (ornate capitals),
  two BLACK STEEL open-LATTICE pavilion frames (wireframe gabled pergolas),
  lush PURPLE/green planting beds, crabapple trees, limestone paver path.
- **Fieldhouse**: long low GLASSY park-district building (Randolph front).
- **Backdrop east**: giants-east band z680-692 (340 On The Park green-glass,
  The Buckingham, Outer Drive East white-scalloped-curve, Harbor Point dark-round);
  beyond LSD = the LAKE (harbor glint + moored-sail silhouettes).

## VERIFY before you report (foreground, synchronous — do NOT background):
- `npm run build` → must succeed, exactly one dist/index.html.
- `node tools/walkprobe.mjs` → must stay `517 passed, 0 failed` (data unchanged
  by you — this just confirms you didn't break an import).
Report a concise summary of what you built (per feature), any deviations, and
your instanced-bucket count. The orchestrator screenshots + judges the visuals.
