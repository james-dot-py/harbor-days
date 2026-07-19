---
id: 100
area: lakefront
type: fix
model: kimi
turns: 70
title: Malört bottle lives on the NPC's hand, not the player's
acceptance: >
  Owner (2026-07-19): "The bottle is attached to the player avatar instead of
  the Malört NPC, and it clips behind the arm so it's barely visible." Fix:
  (1) the PLAYER avatar carries no bottle (undo the 091 holdItem affordance
  for this item); (2) parent the bottle to the Malört-guy NPC's hand with a
  grip offset/rotation that reads clearly from typical viewing angles and
  does not intersect the arm mesh. Keep the 031 drink-interaction behavior —
  this is a parenting/visibility fix only. Accept: player avatar has no
  bottle attached; screenshot of the Malört NPC shows the bottle
  unobstructed. The listed fixes are the must-haves; beyond them the owner grants judgment (2026-07-19: 'you can change things not listed if you see fit') — adjacent improvements are allowed where clearly right, with determinism + all gates green. Standard gates.
refs:
  - src/packs/characters.js (the Malört guy)
  - src/framework.js (holdItem)
  - autopilot/queue/done/ (031 drink interaction, 091 interact affordance — history)
---
