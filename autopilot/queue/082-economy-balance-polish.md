---
id: 082
area: global
type: polish
model: opus
turns: 100
title: THE FUN LAYER, part 5 — balance, save integrity, polish
acceptance: >
  The economy arc's 048-style close-out. (1) BALANCE: simulate a fresh
  player's first three sessions (bot-driven where possible, hand-walked
  where not): can they afford the bucket hat in session one, a favor
  reward should feel generous, nothing requires repeat-grinding one
  activity; tune ECONOMY.md rates and prices to match and record the
  final table. (2) SAVE INTEGRITY: corrupt-save guard (bad JSON/wrong
  version → fresh start + gentle toast, never a crash), schema-migration
  stub proven with a v0→v1 test, save/load round-trip asserted in a new
  walkprobe section (economy state, worn hat, favor progress, stamps);
  private-browsing + artifact contexts verified silent-fallback (no nag,
  no console error). (3) UI POLISH: tote/shop/favor UI at 390px and
  1280px, READ the shots; coin toast never stacks over the interaction
  pill; journal economy + to-do sections read clean. (4) REGRESSION
  SWEEP: all prior systems untouched by the economy hooks — run the full
  walkthrough, walkprobe, gridsweeps, budgets at the standard waypoints;
  zero console errors. (5) PITFALLS + ECONOMY.md updated with what the
  arc learned; the sign-off addendum appended (this arc ships as a
  reviewed feature, same bar as a neighborhood). Single-file build
  passes; both inputs.
refs:
  - ECONOMY.md (rates table to finalize)
  - the 078-081 close-outs (deferred items to burn down)
  - tools/walkprobe.mjs (new save round-trip section), tools/budgets.json
---

Balance rule of thumb for a cozy game: err generous. Nobody ever quit
Animal Crossing because the bells came too easy — they quit when it felt
like a job. If in doubt, halve the price and double the smile.
