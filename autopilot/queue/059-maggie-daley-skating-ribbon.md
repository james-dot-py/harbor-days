---
id: 059
area: millennium
type: build
model: fable
title: Maggie Daley Skating Ribbon — the serpentine crown jewel NE of the BP bridge
acceptance: >
  UNPARKED 2026-07-11 (renumbered 056→059): the owner directed the Grant Park
  expansion, so the eastward growth this task was waiting on arrives in 058
  (BP bridge crossing + Maggie Daley terrain incl. the ribbon BED) — this
  task runs AFTER 058 and activates skating on the ribbon, reusing 049's
  glide verbatim.
  SEEDED BY TASK 049 (stretch goal deliberately NOT half-shipped — the main
  McCormick rink + the glide movement shipped there; this is the second act).
  Owner reference is gold: refs/millennium-park/owner-skating-ribbon-northeast.webp
  — an aerial of the Maggie Daley ribbon: a ~400 m serpentine ice PATH (not a
  sheet) looping around the climbing-wall sculptures, with rounded switchbacks,
  rockwork islands, and skater traffic strung out along it. Scope honestly
  before building: (1) GEOGRAPHY FIRST — the ribbon lies EAST of Columbus
  beyond the BP bridge's polite dead-end at the cell clamp (xMax 208); shipping
  it means either growing the millennium clamp/backdrop east (billboard-floor
  and BACKDROP_M.east interactions!) or a new pocket cell reached over the
  bridge — decide and record in GEOGRAPHY.md MILLENNIUM_GEOGRAPHY. (2) The
  ribbon surface reuses the task-049 contract exactly: WALK_M seg quads (the
  ribbon is a chain of segQ strips — banked gentle y-drift optional), kindAtM
  'ice' over the strip so the main.js glide just works, walkprobe rules +
  expects + elevator guard, no jetski class-leak. (3) The 049 skater-NPC state
  machine generalizes: string loopers ALONG the ribbon arclength instead of
  ellipses; keep the wobbly-beginner archetype. (4) mm-ribbon minimap, judged
  mp-ribbon-* waypoints against the owner aerial, draw budget, determinism,
  single-file build. If the eastward scope proves dishonest at 1:2 (the ribbon
  wants ~60x40 m of new land), say so and park again rather than shrinking it
  to a nub.
refs:
  - refs/millennium-park/owner-skating-ribbon-northeast.webp (owner gold)
  - src/data/millennium.js RINK_M + kindAtM (the 049 ice contract to extend)
  - src/main.js skate glide; src/packs/skating.js (looper/beginner machines)
  - src/millennium/bridge.js (the dead-end the ribbon would open)
---

049 shipped the McCormick rink and made skating a real movement toy; the
ribbon is the crown-jewel encore — a glide you STEER down a winding path
instead of a loop you carve on a sheet. It only works if the map grows
honestly toward it; do not fake it inside the current clamp.
