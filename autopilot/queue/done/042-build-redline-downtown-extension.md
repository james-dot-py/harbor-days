---
id: 042
area: millennium
type: build
turns: 100
title: Red Line downtown extension — Belmont ⇄ Addison ⇄ Monroe, three-destination ride
acceptance: >
  The ridable L reaches Millennium Park: (1) src/packs/wrigley-ride.js
  extended from two destinations to three (Belmont lakefront, Addison
  Wrigleyville, Monroe millennium). Each boarding point offers the OTHER two
  destinations as separate addInteraction zones with distinct labels ("ride
  the Red Line — Monroe / Millennium Park" etc.), zones spaced so prompts
  never overlap. Boarding points: the Belmont pylon (update its canvas to
  list both destinations — keep the back-to-back FrontSide pair), the Addison
  platform, and the 041 subway stair kiosk at the park. (2) The ride reuses
  the existing car pocket + timeline verbatim (fade, cell swap, rumble,
  chime, say(), toast, camCtl.snap — do NOT touch carBody or its local-pivot
  sway; PITFALLS issue 009). Downtown leg flavor: the window streaming
  lights shift to subway amber/dark for a Monroe-bound ride (the State St
  tube), announced "This is Monroe."; arrival places the player at the top
  of the park kiosk stair facing the Bean axis, camCtl.snap set. Addison
  boarding keeps its forceApproach pull-in; Monroe needs NO visible train
  (it is a subway — the fade covers it). (3) The in-car minimap card gains
  MONROE below BELMONT with a broken-line gap (the express-run wink) —
  redraw the canvas, keep the red line style. (4) The car rider NPC gains
  one downtown line (e.g. "millennium park? locals just say the bean").
  (5) state.redlineRides still increments; no walkability or lakefront
  world-rng changes (baseline.png intact). (6) Verify with scripted rides:
  node tools/act.mjs sequences covering Belmont→Monroe and Monroe→Addison
  (goto/key/wait/shot), plus walkthrough of the kiosk + in-car waypoints;
  READ every PNG; the toasts/labels/signage all name real stops; zero
  console errors; draws <= 480; single-file build.
refs:
  - src/packs/wrigley-ride.js (the pattern — read fully before editing)
  - src/wrigley/train.js (forceApproach/forceDwell — Addison only)
  - GEOGRAPHY.md MILLENNIUM_GEOGRAPHY arrival section (kiosk position)
  - PITFALLS.md (pocket pivot heave; toast queuing; interior camera
    framings are axis-aligned down-the-length; touch tap latch for act.mjs)
  - tools/act.mjs (interaction test harness)
---

Mechanical extension of a proven pack — the judgment (where the kiosk sits,
what the arrival frames) was fixed by 040/041. Real-world truth to honor:
Red Line downtown is the State St SUBWAY; Monroe and Lake are the stops that
serve the park; the game's kiosk-at-the-park-edge is a recorded standing
liberty. Keep the ride sequence timings close to the existing ones — the
8-9 s ride with one rider quip is the shipped, owner-approved feel.

Regression watch: this file is the ONLY file that owns the ride; no other
task touches it. The Belmont pylon canvas redraw must keep 'game day
service' or replace it with something equally in-voice; do not let the sign
grow past its 1.7 x 0.85 plane legibly (measureText shrink-to-fit).
