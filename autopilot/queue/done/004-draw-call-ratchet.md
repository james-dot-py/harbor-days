---
id: 004
area: global
type: polish
title: Draw-call ratchet — instance/bucket the hot views back toward the 480 target
acceptance: >
  Full walkthrough (node tools/walkthrough.mjs) maxDrawCalls measurably lower
  than the current 1298, with the biggest offenders addressed first
  (wv-marquee/gates ~1100-1298, wv-scoreboard, wv-rooftop-view 947,
  wv-statue-row 838, lakefront spawn-north 752 — see
  autopilot/issues/000-draw-call-budget.md). Consolidate repeated meshes into
  InstancedMesh buckets (ONE per color — r128 toon ignores setColorAt, see
  PITFALLS.md), merge static small props per cell, verify NO visual regression
  by READING before/after shots of every touched view, and keep determinism
  (no shared-rng order changes without [baseline-regen]). Then LOWER
  tools/budgets.json drawCalls to sit just above the new measured max (never
  raise it) — repeat this task until the max is ≤ 480 and budgets.json says
  480. fps is advisory (SwiftShader) — draws are the gate.
refs:
  - autopilot/issues/000-draw-call-budget.md
  - tools/shots/run-mrbjrqz2/report.json (per-framing numbers)
  - PITFALLS.md (setColorAt bucket rule; NPC culling >145 m precedent)
---

Large but incremental: each pass shaves the max and ratchets the budget. Split
across multiple iterations freely; the acceptance is "measurably lower +
ratcheted", not "done in one shot".
