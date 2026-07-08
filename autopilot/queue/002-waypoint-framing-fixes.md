---
id: 002
area: global
type: polish
title: Waypoint framing fixes — every waypoint gets at least one framing that shows its subject
acceptance: >
  For every waypoint in tools/waypoints.json, at least one framing's PNG
  clearly shows the subject named in its expectation string (judged by READING
  the PNGs of a fresh scoped walkthrough). Known bad: wv-scoreboard (camera
  jammed against a light-tower mast — view it from the Waveland/Sheffield
  corner or from the rooftop instead), landmark-0 / harbor house (building
  fills the frame — increase dist and/or view from the water side). Review the
  run-mrbjrqz2 contact sheet for other subject-less framings (several
  wv-gate-* and zone-yacht-club framings are wall-heavy). Fix by improving the
  per-feature heuristics IN tools/gen-waypoints.mjs (dist/pitch/view-position
  rules) — NEVER by hand-editing waypoints.json (doctrine). Then run
  node tools/walkthrough.mjs --ids <fixed ids>, READ every new PNG, and judge
  each against its expectation. Gate green.
refs:
  - tools/shots/run-mrbjrqz2/contact-sheet.png and report.json
  - AUTOPILOT.md §4.1 camera math (verbatim in iteration.md)
  - tools/waypoints.expect.json (the expectations being framed)
---

The Phase 2 bring-up run proved the harness but exposed framings where the
camera lands inside or against geometry. This is expectation-authoring-adjacent
work: tune generator heuristics until every expectation is visibly judgeable.
