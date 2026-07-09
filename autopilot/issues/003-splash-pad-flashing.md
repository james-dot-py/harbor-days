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
Owner screenshot refs/inbox/"bag toss looks bad and spot is not solid
color.png" shows the wet-ring DITHERING in a still frame — confirms surface
z-fight, not just animation flicker.
