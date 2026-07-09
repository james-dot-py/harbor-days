---
id: 012
area: wrigleyville
type: polish
title: Wrigley architecture polish — the STRUCTURES as recognizable as the signage
acceptance: >
  From the 006 sign-off evocation review (PASS, but picky list): the signage
  carries the evocation; make the buildings carry it too. (1) Stadium skin:
  green steel truss/column rhythm and the band of arched upper windows on the
  grandstand exterior, red-tile pent roofs where the refs show them, and a
  'WELCOME TO THE FRIENDLY CONFINES' banner over a gate — hand-modeled toon,
  instanced/merged into the existing facade batches (budgets.json is a
  ceiling, never raise). (2) Statues: Caray reads as CARAY (mic aloft) and
  the HOF statues get distinguishing poses/props (bat, glove); consider
  scattering them to their real spots (Banks near the marquee corner,
  Williams/Santo/Jenkins by the bleacher gate) — GEOGRAPHY.md FIRST if moved,
  and don't duplicate Banks. (3) Bowl dressing legible from public vantages:
  round clock + line-score face visible from the rooftop view, yellow foul
  poles readable, ivy legible from bleacher/rooftop angles, a yellow distance
  marker on the brick. (4) Add a matchup line to the gameday MARQ rotation
  (e.g. 'CUBS VS SOX · 7:05'). (5) Mirrored-text fix or slat-back for the
  double-sided canvas blade signs (Murphy's, street blades) if cheap. (6) Fix
  the floating roof-ring slabs seen from Gallagher plaza low angle
  (wv-gallagher-way f2). (7) Retune wv-stall-1's candidate framings so the
  authored "stadium facade context behind" clause actually reads (all three
  current candidates face away from the park); verify with
  walkthrough --ids wv-stall-1. Verify: walkthrough --area wrigleyville, READ
  every PNG, draws within budgets.json, determinism (local seeds only),
  walkprobe green. Murphy's/bar likenesses stay in task 010; Sluggers cage in 009 —
  don't duplicate their scope.
refs:
  - refs/wrigleyville/SIGNOFF.md (evocation picky list, verbatim source)
  - refs/wrigley-field/ (IMG_2333, 65902 aerial: trusses, arches, pent roofs)
  - src/wrigley/stadium.js (facade batches, scoreboardTex, buildMarquee)
  - autopilot/issues/000-draw-call-budget.md + tools/budgets.json (ceiling)
  - PITFALLS.md (setColorAt bucketing; village add() snapshot rule)
---

Fresh-eyes reviewer's verdict: "the evocation lands hard and passes cleanly;
the polish list is about deepening the ballpark's own architecture and the
statues so the STRUCTURES are as recognizable as the (already excellent)
signage." Also sanity-check Engine 78's corner blades against GEOGRAPHY.md
(real house fronts Waveland at ~1052 W; Kenmore is the cross street — the
current blade may already be right).

A second, independent evocation review (006 corroboration run mrcsulf4, using
an ANONYMIZED-label contact sheet and a no-refs first phase; see SIGNOFF.md)
reached the same PASS and adds three prioritized architecture cues for item
(1): the grandstand's VERTICAL BULK is the biggest miss — at Clark & Addison
the marquee reads as bolted to a squat 2-story storefront with open sky
behind, where the real sign sits at the base of a looming 4-5 story
green-steel grandstand (refs IMG_2333/IMG_2339); a rooftop flagpole ring
above the marquee (Illinois flag, CHICAGO CITY FLAG — a signature local cue
currently absent everywhere — and retired-number pennants); and the
street-side outfield wall on Sheffield/Waveland should read RED BRICK rather
than smooth stucco. Same reviewer confirmed knothole-only ivy is the
faithful choice — do NOT add exterior ivy.

## OWNER PLACEMENT CORRECTIONS (2026-07-09) — apply GEOGRAPHY.md FIRST, then data
(8) GATE DOORS read on the WEST face (Clark / Gallagher Way) and the SOUTH
face (Addison) — the real main entries. Ensure no door/gate visuals sit on
the east face. The NE bleacher-corner entrance (Sheffield & Waveland) is
real-world faithful and STAYS as the bleacher gate unless a follow-up owner
note removes it.
(9) MOVE THE KNOTHOLE to the NORTH side (Waveland / left-field wall, near
the ball-hawk corner) per owner directive. Note honestly in GEOGRAPHY.md:
refs place the real knothole on Sheffield (right field) — the owner chooses
Waveland; record it under standing liberties. Update STADIUM_W.knothole,
the builder, walkprobe expects if any, and the wv-knothole waypoint will
follow the data automatically (gen-waypoints reads it).
