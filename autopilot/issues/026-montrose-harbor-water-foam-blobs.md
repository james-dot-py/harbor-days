# 026 — Montrose Harbor basin water reads with white "foam-blob" patches

- area: montrose
- severity: LOW (cosmetic; the harbor still reads clearly as a marina — boats,
  docks, seawall, entrance light all present and correct)
- found: 2026-07-13, task 075 art-director pass (run mrj3vluq)
- waypoints: mt-harbor-f1, mt-harbor-f2 (and faintly mt-hook f0/f1)
- evidence: tools/shots/run-mrj3vluq/mt-harbor-f1.png, mt-harbor-f2.png
- observed: the sheltered BASIN water (WATER_N plane, cyan) carries several
  large, irregular WHITE patches that read like lily-pads / foam floating on the
  surface, plus one dark navy oval mid-basin. They are specific to the basin
  water — the open lake (main WATER plane) is a smooth blue gradient without
  them. Slightly undercuts the "big north harbor" read (reads a touch pond-like).
- expected: sheltered blue-green water with moorings + docks reading as a marina.
- disposition: DEFERRED, not fixed in 075. Root cause not confirmed (likely the
  WATER_N toon highlight banding, or foam/mooring-float geometry). Touching the
  shared water rendering in a polish pass risks a determinism / cross-view
  regression for a minor cosmetic; 070 shipped green with this. A future harbor
  polish should identify the blob geometry (tmp probe on the WATER_N mesh +
  moorings.js float meshes) and either remove/retint them or make them read as
  deliberate glints. Not a sign-off blocker: the marina reads correctly.

## RESOLVED — task 076 (2026-07-16)

Root cause was THREE stacked effects, all confirmed by eye at the mt-harbor
framings (tools/shots/076-harbor-diag.png → 076-harbor-fix2/fix2b.png):
1. **The white "lily pads" were the sailboat HULLS**: moorings.js floated each
   ellipsoid hull at centre y 0.05 — a 0.6 m white dome flush with the water,
   which side-on reads as a flat white patch. The "dark navy oval" was a
   DARK-palette hull. Fix: freeboard raised (centre y 0.34, y-scale 0.60) plus
   a dark waterline band under each boat as a SECOND instance in the SAME
   InstancedMesh (2N instances, +0 draw calls, rng call order untouched).
2. **The basin water was beach-bright cyan**: the basin's three bulkhead lines
   (seawallLines[3..5]) fed SHORE_SEGS, and the basin is only ~31 m
   wall-to-wall, so ALL basin water sat in the 0-14 m "beach shallows" band
   with the 1.4x shore-glint boost. Fix: coast.js excludes the Montrose basin
   bulkheads from the water-COLOR field only (walkability/QUERY_SEGS
   untouched; Belmont's deliberate greener-harbor walls kept) — the basin now
   measures to the mole's outer lake face and reads sheltered aqua/teal.
3. **The north water plane was FROZEN** (uTime never ticked, a 069 shell
   holdover), so the glint interference pattern stood still as static white
   patches. Fix: coast.js exports waterN; main.js ticks its uTime beside the
   main plane.

Determinism verified: canonical spawn shot diffs 0.238% vs baseline.png
(gate 0.828%, noise floor ~0.24%). Belmont mooring field re-checked
(076-belmont-moor.png): same chunky-toon boats, now with waterline shadows —
no regression. Basin reads as a sheltered blue-green marina.
