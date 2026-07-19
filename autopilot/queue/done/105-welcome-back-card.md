---
id: 105
area: meta
type: delight
model: opus
turns: 70
title: "Back already?" — the welcome-back card (design audit B1)
acceptance: >
  From the 2026-07-19 design audit: the daily systems (date-seeded favors,
  lake moods) are invisible at load — the session loop is closed in data and
  open in UX. On load, when a save exists (store.js) AND the local calendar
  date differs from the last played date, show ONE cream card (the naming.js
  card pattern) in the Ope! voice: "back already? the lake missed you." +
  up to three lines: (1) today's lake mood if one is seeded ("fog off the
  lake this morning" — read the lake-moods date seed, don't recompute it);
  (2) today's favors in giver voice from rotation.todayIds() ("the Malört
  guy's thirsty again"); (3) where you left off (nearest ZONES name to the
  persisted ope.position). Then set ope.lastplayed.v1 (store.js, the guarded
  door). HARD RULES: no streak/scarcity language, no "you missed X" — this
  is the ethical hook, never FOMO; dismiss on any input; never blocks
  movement; first-ever boot shows the game, not this card; prefersCalm
  skips any entrance animation. Accept: with a backdated last-played flag,
  act.mjs load shows the card with correct mood + favor names; same-day
  reload shows nothing; fresh profile shows nothing. Standard gates.
refs:
  - src/naming.js (card pattern + input isolation)
  - src/packs/favors-core.js (rotation.todayIds)
  - src/packs/lake-moods.js (date-seeded mood)
  - src/store.js, src/data/chicago.js (ZONES)
---

Owner license (2026-07-19): 'you can change things not listed if you see
fit' — adjacent improvements beyond this spec are allowed where clearly
right, with determinism + all gates green.
