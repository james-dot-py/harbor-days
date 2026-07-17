---
id: 086
area: shell
type: build
model: fable
turns: 130
title: BASICS — the full city map + a compass breadcrumb (never lost, never teleported)
acceptance: >
  Four neighborhoods and a train, and the only navigation is a corner
  minimap — players don't know what exists or how far it is. (1) THE CITY
  MAP: tapping the minimap (or M) expands it to a full-screen stylized
  map card — the whole world: the lakefront strip at its true shape plus
  the hard cells (Wrigleyville, Millennium/Grant) drawn as connected
  insets with the Red Line as the drawn thread between them (transit-map
  register — this is Chicago, make the L line iconic); landmark icons +
  lowercase names for every signature place (the Bean, the rink, Wrigley,
  the hedge, the harbor, Lolla…), "you are here" pulse, discovered-zone
  states if the data exists (else all shown). Reuse the minimap
  renderer's data/canvas approach — do NOT hand-paint a bitmap; it must
  update as the city grows (derive from the same data the minimaps use).
  (2) THE BREADCRUMB: tap any landmark → a soft compass chevron sits at
  the screen edge pointing toward it (world-space bearing, cozy not
  HUD-noisy: small, cream/coral, fades when you face the target within
  ~20°), with distance in honest meters that tick down. NO teleport —
  walking IS the game. Cross-cell smarts: a destination in another cell
  points you to the correct L platform first with a tiny train glyph
  (the map teaches transit). Clear/replace by tapping again; persists
  across the ride. (3) Both inputs (M key, minimap tap, landmark tap at
  390px); draw budget ~0 (DOM/canvas card + one HUD chevron); shots
  READ at both widths; walkprobe green; single-file build passes.
refs:
  - src/minimap.js (renderer + data — the seed), src/data/*.js (zone/landmark tables), index.html (card style)
  - src/packs/wrigley-ride.js (stop metadata for the cross-cell pointer)
---

The map is the love letter: one screen that says "look how much city
there is now." The breadcrumb is the anti-lost mechanic that respects
the game's soul — it points, it never drags. If the transit-map read of
the Red Line thread is good enough, players will screenshot the MAP.
