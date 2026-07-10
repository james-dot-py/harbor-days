# 003 — Gallagher Way splash pad flashes/flickers when the player walks by

- severity: medium (plaza centerpiece; constant flicker reads as broken)
- evidence: owner screenshot refs/inbox/"this thing in gallagher way doesnt
  stop flashing when you walk by it.png" (2026-07-09) + owner report.
- likely cause: wet-ring decal coplanar with the plaza slab -> z-fight flicker
  with camera movement (same class as the dog-beach ribbon overlap). Secondary
  suspect: proximity jet animation re-arming every frame.
- note: 009 repaved the plaza (cc4ff52) WITHOUT touching the pad — verify its
  state on the new plaza first; it may sit off-grade now.
- expected: stable surface from every angle (decal at distinct y-offset or
  merged into slab); jets trigger with hysteresis.
- route: task 012 (Wrigley architecture polish — already touches the Gallagher
  plaza view). Verify with an act.mjs walk-past.

## Evidence update (2026-07-09)
Owner screenshot refs/wrigleyville/owner-issue-005-bag-toss-and-splash-dither.png
(filed from refs/inbox/) shows the wet-ring DITHERING in a still frame —
confirms surface z-fight, not just animation flicker.

## RESOLVED (task 012, 2026-07-09)
- Root cause confirmed: the RingGeometry wet ring sat at y 0.08, EXACTLY
  coplanar with the pad cylinder's top face (0.05 + 0.06/2 = 0.08) → z-fight
  dither that shimmered as the camera moved. There is NO proximity trigger —
  the jets run on a fixed ~20 s timer in wrigley-vendors.js (grow 0.5 s /
  hold 2 s / shrink 0.5 s), so no hysteresis was needed; the "flashing" was
  entirely the decal fight.
- Fix (village.js buildGallagher): pad rebuilt with top at y 0.10 (bottom
  tucked under the lawn strip), wet ring floated 15 mm proud at y 0.115,
  jet nozzles re-seated on the new top. Same footprint/radii/positions, so
  the vendors-pack water columns still line up.
- Verified with an act.mjs walk-past from four camera positions (canary
  echoed, 0 errors): tools/shots/splash-pass-a/b/c/d.png — solid clean
  annulus from every angle, no dither.
- Bonus find from splash-pass-d: grandstand seat rows floated over the plaza
  at the Gallagher notch (insidePoly inset trap) — fixed in stadium.js with
  strict pip + slab-extent tests (see PITFALLS.md update, task 012).
