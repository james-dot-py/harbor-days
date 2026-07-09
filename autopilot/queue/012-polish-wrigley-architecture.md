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
  (wv-gallagher-way f2). Verify: walkthrough --area wrigleyville, READ every
  PNG, draws within budgets.json, determinism (local seeds only), walkprobe
  green. Murphy's/bar likenesses stay in task 010; Sluggers cage in 009 —
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
