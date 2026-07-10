---
id: 033
area: wrigleyville
type: feedback
model: fable
title: Clark St right-of-way — clear the alignment north of the barricade, rehome the buildings
acceptance: >
  Owner (2026-07-10, coords via dbg HUD): "Cops at x=-286.3 z=-386.5 have a
  barricade where there was a street, and that street should be there, we'll
  want to build it eventually (it's clark, legendary), but right now it's
  buildings where the street should continue on. Let's put those buildings
  somewhere else they'll look good since we don't want to lose the work."
  The spot is exactly Clark's centerline at the corridor's north end
  (wrigleyville.js: clarkX(z) L22, clark corridor z1:-386 L34) — the CPD
  barricade there is correct event-day Chicago and STAYS as the soft wall,
  but the city must read like Clark continues beyond it. (1) RESERVE the
  alignment: no building mass may sit on clarkX(z)±halfW for z north of
  -386 up to the cell edge — audit the BLDG lots (L253-266), the
  ticket-office/notch masses, and the LAKEVIEW band volumes (L302+, "flat
  instanced volumes past every barricade") against the alignment; (2) STREET
  STUB TEASER (the 017 gate-teaser pattern): visible Clark pavement +
  centerline continuing past the barricade, fading into the low-rise
  backdrop — plus a small teaser read in the 017 register (street blade
  'N CLARK ST' or similar) so the promise is legible; verify the future
  continuation direction against refs/wrigleyville/osm.json (Clark's real
  diagonal), since this alignment becomes the gate to the next neighborhood
  north; (3) REHOME, don't delete: the owner explicitly wants the displaced
  building work KEPT — move those lots/masses to spots where they
  strengthen the streetscape (thin blocks, gaps behind bars, corners the
  016/020 passes left plain); judge each placement by eye with shots, and
  keep lot yaw/storefront-facing rules from the BLDG table conventions; (4)
  walkability: barricade soft-wall behavior unchanged (players cannot walk
  past; the stub is scenery), walkprobe green; add/refresh a judged
  waypoint at the Clark-north barricade whose expectation honestly demands:
  street continues visually, CPD barricade reads, NO building in the
  right-of-way. Update the layout doc the cell treats as canonical (the
  wrigleyville brief/GEOGRAPHY section) FIRST, then data; data-only
  geometry moves; determinism (document any local scatter shifts); draw
  budget ceiling; single-file build passes.
refs:
  - src/data/wrigleyville.js (clarkX L22, STREETS_W.clark L34, BLDG lots L253-266, BARRICADES_W L289, LAKEVIEW band L302)
  - src/wrigley/streets.js, src/wrigley/village.js (builders that consume those tables)
  - refs/wrigleyville/osm.json (Clark's real alignment north of Addison)
  - autopilot/queue/done/017-gate-teaser-signs.md (the teaser register/pattern)
---

Clark is THE street — the owner called it legendary and it's the future
gate to the next neighborhood north, exactly like the lakefront's LSD
underpasses. The barricade was always right; the sin is buildings squatting
on a right-of-way the city plans to use. Treat the relocation as a design
opportunity, not cleanup: each rehomed building should make some weak block
read better, and the result should feel like the city was always laid out
this way. When the planner eventually picks the northern neighborhood, this
alignment is where it connects.
