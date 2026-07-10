---
id: 034
area: wrigleyville
type: feedback
model: fable
title: Wrigleyville fidelity round 2 — judge the build against the owner's 9-photo ground truth
acceptance: >
  Owner walked the real Wrigley block (2026-07-10) and shot 9 vantages —
  refs/wrigleyville/owner-photoset-2026-07-10/ with a README mapping each
  file to GPS + compass heading + subject. LOOK at all nine. OWNER
  INSTRUCTION: ignore road construction in the photos — judge the permanent
  city only. Method (the 021 Diversey pattern, Wrigleyville edition): (1)
  for each vantage, derive the in-game camera equivalent (GPS+heading →
  cell coords via the wrigleyville anchors/osm.json) and capture the
  matching shot; (2) compare honestly pair by pair — call out where the
  build already reads TRUE (say so in the waypoint expectation; don't churn)
  and where it diverges in ways a local would notice: facade
  materials/colors, signage presence and register, massing at the two
  stadium corners (Clark/Addison marquee corner + Addison/Sheffield),
  Cubby Bear likeness detail (refs/cubby-bear has Commons material too),
  the Hotel Zachary/Swift & Sons block read, Gallagher Way's north view,
  the Addison arrival walk from the Red Line, and the viaduct underside
  (steel column rhythm, shadow, grime register — src/wrigley/station.js);
  (3) fix the divergences that matter for the read, hand-modeled toon,
  respecting all prior green work (010 likenesses, 012 stadium skin, 016
  streetscape recipes, 019 wedge, 020 corners — refine, don't rebuild);
  (4) MEASUREMENT: add/refresh judged wv-photo-* waypoints, one per photo
  vantage, coords derived from data anchors, honest expectations quoting
  what the photo shows — this makes the owner's ground truth permanent;
  (5) coordinate with 033 (Clark right-of-way, runs first): the
  clark-addison shots are its corner context — don't fight its relocations.
  Constraints: draw budget ceiling (tools/budgets.json); signs follow the
  032 rules (no mirrored backs, posts never over text) for anything
  touched; determinism (local seeds only, document scatter shifts);
  walkprobe green; single-file build passes; desktop + touch.
refs:
  - refs/wrigleyville/owner-photoset-2026-07-10/README.md (the 9-photo map — START HERE)
  - refs/cubby-bear/, refs/wrigley-field/, refs/wrigleyville/ (existing Commons + owner material)
  - refs/wrigleyville/osm.json + refs/_anchor-cache.json (GPS → cell-coordinate anchoring)
  - src/wrigley/ (stadium.js, village.js, corners.js, dressing.js, station.js, streets.js)
  - autopilot/queue/033-clark-right-of-way.md (runs before this; shares the Clark/Addison corner)
---

This is the first owner ground-truth set shot specifically for Wrigleyville
since sign-off — treat it as the new fidelity bar. The photos say what no
Commons image can: exactly what the owner sees when they stand there. The
deliverable is as much the nine judged waypoints as the fixes — after this
task, "does Wrigleyville look right" has a measured answer from the owner's
own vantage points.
