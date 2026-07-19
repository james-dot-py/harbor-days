---
id: 108
area: onboarding
type: delight
model: kimi
turns: 50
title: Guided first interaction — one pulsing hand-pill, one time, ever (B4)
acceptance: >
  From the 2026-07-19 design audit: a first-time player can walk 13 seconds
  to the water and never press anything; every downstream system (favors,
  shops, activities) requires the E press. Teach it once: the first
  interaction site on the natural spawn→Rocks walk line (the suggestion-box
  kiosk or the nearest flower) gets a gently pulsing hand-pill + one coach
  line ("say hi — E / tap") when the player is inside the interaction grace
  radius, UNTIL the first-ever E press (flag ope.firste.v1 via store.js).
  Never shown again after that; never blocks movement; desktop + touch (the
  pill exists — 026); prefersCalm = static pill, no pulse. Accept: fresh
  profile act.mjs run walks the line and shows the pill + line near the
  site; after any E press a reload shows neither; zero console errors.
  Standard gates.
refs:
  - src/framework.js (addInteraction grace radius, pill)
  - src/packs/suggestions.js (kiosk on the walk line)
  - src/onboard.js (077 coach-mark pattern), src/store.js
---

Owner license (2026-07-19): 'you can change things not listed if you see
fit' — adjacent improvements beyond this spec are allowed where clearly
right, with determinism + all gates green.
