---
id: 128
area: lincolnpark
type: content
model: opus
turns: 60
title: The Buddha heads on the Lincoln Park lawn (owner ref drop 2026-07-26)
acceptance: >
  The owner dropped a photo of his own into refs/inbox on 2026-07-26 with no
  covering note: refs/lincoln-park/owner-2026-07-26-buddha-heads.jpg (filed there
  by task 125, manifest entry source "owner"). A ref drop with no note is a build
  request — he photographed something he wants in the game.
  (A) READ THE PHOTO FIRST. Big white sculpted BUDDHA HEADS sitting directly on
  open sunlit lawn — no plinths, no pedestals — smooth domed skulls with deeply
  carved snail-curl hair and half-lidded serene faces, roughly chest-to-head
  height on a person. Scattered LOOSELY across the grass under big shade trees,
  not in a row, with Lake Shore Drive traffic and the north-lakefront high-rises
  behind. A temporary outdoor art installation on plain lawn.
  (B) SITE IT HONESTLY. This is a real installation on real ground and the
  photo's own background is the evidence: open lawn with LSD and the high-rise
  wall behind means the EAST-facing park lawn near the Drive, north of the zoo —
  NOT the formal garden, NOT inside the campus. Establish the game coords from
  the photo's sightlines + refs/lincoln-park/osm.json, write them into
  GEOGRAPHY.md FIRST, then the data module. Do not drop them on an existing
  tableau — grep pack coords and every LP walk polyline before placing.
  (C) BUILD IN THE HOUSE STYLE. Hand-modelled toon, never an import. The read is
  the SILHOUETTE: dome + curl texture + serene face at toon scale, chunky and
  cozy. One shared InstancedMesh for the heads if the count justifies it,
  otherwise a merged bucket — state the draw-call cost and keep it +0/+1. They
  sit ON the lawn (no plinth) so they need walkability carves in the shared data
  module, engine + walkprobe, and they must not trap the player (052/065 laws).
  (D) IT IS ART, SO LET THE PLAYER LOOK. At minimum they read from the trail. A
  small beat (a plaque, a sit-and-look spot, a journal line) is welcome but must
  not promise more than an installation gives — and no photo mode (rejected).
  (E) MEASUREMENT: a judged lp-* waypoint with an authored expectation in
  tools/waypoints.expect.json, walkthrough green, every PNG personally Read,
  draws <= 480, determinism gate clean, npm run build one artifact.
  (F) Lincoln Park is SIGNED OFF (123) — extend its waypoint set, do not re-run a
  full sign-off.
refs:
  - refs/lincoln-park/owner-2026-07-26-buddha-heads.jpg (the owner's own photo — READ IT FIRST)
  - refs/lincoln-park/manifest.json (the filed entry, source "owner")
  - refs/lincoln-park/osm.json, GEOGRAPHY.md (Lincoln Park section)
  - PITFALLS.md
---

The owner has been playing and taking pictures of things he wants. He dropped
this one in `refs/inbox/` with no note, which task 125 filed into
`refs/lincoln-park/`. Task 125's own scope was the conservatory door and the zoo
gate, so the heads were queued here rather than built off-brief.

Treat the photo as the spec. He stood on the grass and took a picture of a row of
serene white heads sitting in the sun with the city behind them — that image is
the win condition. If a player walks the lawn north of the zoo and does not go
"oh, the buddha heads," it is not done.

Note the honest uncertainty to resolve while siting: real outdoor installations
in Lincoln Park move and are often temporary. Do not invent a permanent plinth or
signage that claims more permanence than the reference shows. Lawn, heads, sun.
