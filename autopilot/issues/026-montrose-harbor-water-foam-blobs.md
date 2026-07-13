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
