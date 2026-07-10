---
id: 029
area: props
type: feedback
model: opus
title: Cornhole boards — tilt them toward the opposing player (owner feedback)
acceptance: >
  Owner playtest (2026-07-10): "cornhole in wrigley and belmont rocks area —
  the [incline] boards should be switched so they're tilted towards the other
  player." Today EVERY cornhole board raises its far end OUTWARD (away from the
  opponent) and drops the near lip toward the center gap — so from across the
  pitch each board reads as leaning AWAY from the thrower who's aiming at it.
  The owner wants the incline flipped: each board's RAISED (hole) end should
  face the opposing board/player, so the two boards lean toward each other and
  present their sloped playing faces to the incoming throw. This is the owner's
  call and outranks the regulation layout — note but do not "correct" it back.
  THREE implementations must all change in lockstep (a local would notice one
  odd board):
  (1) src/packs/cornhole.js — the flagship south-lawn match near the Belmont
      Rocks (SITE ~130,272; TILT=0.23, boards at yaw 0 / PI). Flipping the tilt
      also moves the hole decal, the star decal and the two rear legs, which are
      all keyed to the raised end — keep them consistent so the hole still sits
      at the (now inward) high edge and the legs stay under it. The bag-landing
      math (b.top/right/fwd/up, hole/star matrices, pile spots) is derived from
      the same basis: re-derive, don't hand-patch, and confirm the NPC toss arc
      still lands bags ON the deck and the bago still drops in the hole.
  (2) src/packs/lawnlife.js — the two background cornhole sites (~36,-160 and
      ~100,315); angled boards + looping toss arms. Same flip.
  (3) src/wrigley/village.js — the Gallagher Way pair (cornhole(), tilts 0.35 /
      -0.35, near clarkX(-455)+20,-455). Same flip; keep the yellow hole decal
      on the raised end.
  VERIFY with your own eyes: screenshot the Belmont-Rocks flagship and the
  Gallagher Way pair from a side/oblique camera that shows BOTH boards, and
  confirm each board now visibly leans toward the other (raised ends meeting in
  the middle, holes facing the throw). Draw calls unchanged (geometry counts are
  identical — only orientation moves); determinism preserved (no rng call-order
  change); walkprobe still green; single-file build passes. If flipping makes a
  bag visibly float off a deck or a leg poke through the top, that's a
  basis-derivation miss — fix it before shipping.
refs:
  - src/packs/cornhole.js (flagship; TILT/board basis, hole+star+leg matrices, toss math)
  - src/packs/lawnlife.js (two background sites)
  - src/wrigley/village.js (cornhole() — Gallagher Way pair)
  - autopilot/feedback/processed/feedback-2026-07-10T02-22-22-223Z.md (source note)
---

Small, high-signal geometry fix from a local playtester: the boards read
"backwards" from across the pitch. It's a taste/authenticity call, so match the
owner's mental model exactly and confirm visually from a camera that frames both
boards — a single flipped board would be more jarring than none.
