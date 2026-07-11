---
id: 051
area: engine
type: feedback
model: opus
title: Red Line stop picker — choose your destination before boarding
acceptance: >
  Owner (2026-07-11): "we should allow the user to pick their redline stop
  before going." With three stops (Belmont / Addison / Monroe) the old
  fixed-pair boarding no longer scales. (1) At EVERY platform, boarding
  offers a clear choice among the OTHER stops. Prefer the simplest pattern
  that reads on touch: separate interaction points on the platform, one per
  destination, 3-4 m apart, each with a small destination board ("RED LINE →
  ADDISON / Wrigley Field", "RED LINE → MONROE / Millennium Park") — the
  two-binocular-spots precedent; a label-cycling single point is acceptable
  ONLY if it's unmistakable on a phone (the pill shows the current pick and
  tapping cycles is NOT obvious — judge honestly). (2) rideTo generalizes
  to any origin→destination pair (fades, arrival announcement, rider-NPC
  line variety per route — a downtown rider says downtown things). (3)
  Signage follows the 032/036 rules (no mirrored backs, no post-bisected
  text) and the platform read stays uncluttered. (4) Verify end-to-end:
  every ordered pair of stops ridden in an act.mjs run, desktop + touch,
  shots READ; walkprobe green; draw budget; determinism; single-file build.
refs:
  - src/packs/wrigley-ride.js (rideTo, platform interactions — extended by 042)
  - the 042 close-out notes (downtown extension shape)
  - autopilot/issues/ (none open on this — owner direction, not a defect)
---

Three stops today, more forever — the picker should be a pattern the next
neighborhood inherits for free, not a bespoke pair of buttons. Keep the
boarding ritual cozy: pick, board, fade, clack-clack, arrive.
