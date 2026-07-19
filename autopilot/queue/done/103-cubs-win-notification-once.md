---
id: 103
area: wrigleyville
type: fix
model: opus
turns: 60
title: Chubs-win notification fires at most once per session
acceptance: >
  Owner (2026-07-19): "Cubs win notification can fire multiple times." Gate
  it with a SESSION-SCOPED flag (module-level variable, NOT store.js —
  session = page load/app launch, deliberately not persisted). Accept:
  triggering the win condition repeatedly in one session shows the
  notification exactly once; after reload it can fire again. The listed fixes are the must-haves; beyond them the owner grants judgment (2026-07-19: 'you can change things not listed if you see fit') — adjacent improvements are allowed where clearly right, with determinism + all gates green. Standard gates.
refs:
  - src/packs/wrigley-gameday.js
  - src/packs/wrigley-game.js
---
