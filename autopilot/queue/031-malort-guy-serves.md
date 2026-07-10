---
id: 031
area: lakefront
type: feedback
model: opus
title: The Malört guy actually serves — drink interaction + Jeppson's bottle + Old Style case
acceptance: >
  Owner (2026-07-09, issue 013): can't drink Malört from the Malört guy —
  root cause: he has NO interaction at all (characters.js ~L56-61, bump
  lines only; the drinkable Chicago Handshake is a different NPC in npcs.js
  ~L455-479). Also: "give him a bottle of malort and a case of old style
  next to him." (1) DRINK: add a standard addInteraction on the Malört guy
  (~r 2.4, label in his voice — e.g. 'burnt band-aid?') that pours a Malört
  swig: reuse the existing flow pieces from the Handshake (holdItem shot
  glass, sMalort wobble, screenFx desaturate+shake, a toast in the
  established register, state counter shared or parallel to
  state.handshakes, short cooldown with a label swap) — EXTRACT/share the
  swig routine rather than copy-pasting npcs.js internals; keep the
  Handshake regular's full can-then-shot ritual distinct (he's the
  ceremonial one; the Malört guy is straight to business). (2) PROPS next
  to him on the rocks: a recognizable Jeppson's Malört bottle (tall amber
  bottle, cream/yellow label band — WebSearch the label, hand-model toon,
  echo the palette not the artwork) and a CASE of Old Style (cardboard
  24-pack with the blue/red/white livery, reuse oldStyleTex conventions
  from npcs.js ~L131; a loose can or two on top reads generous) — placed on
  his terrace step so they don't float or clip the revetment (surface-query
  the terrace height, terraces are analytic via coastQuery). (3) TOUCH
  VERIFY both Malört NPCs: act.mjs at a 390px touch viewport — approach,
  trigger, drink completes with the screen effect; if the pill-occlusion
  fix (task 026) hasn't landed yet and blocks the tap, verify via the hand
  button and note the dependency honestly in the result rather than
  reimplementing 026 here. Draw budget (bottle + case + can ≤ a handful of
  draws, merge where trivial); determinism (props placed with fixed coords,
  no rng); walkprobe untouched unless a collider is added (props this small
  should not collide the walking line on the steps); single-file build
  passes.
refs:
  - src/packs/characters.js (~L7 cast comment, ~L56-61 Malört guy at 156,90)
  - src/packs/npcs.js (~L87 sCrack, ~L97 sMalort, ~L131 oldStyleTex, ~L455-479 Handshake flow)
  - src/framework.js (addInteraction, holdItem, screenFx, toast, state)
  - src/coast.js (coastQuery — terrace height for prop placement)
  - autopilot/issues/013-malort-guy-not-drinkable.md
---

The joke only lands if you can say yes: he's been offering a taste since
Round 5 with no way to accept. Keep the two NPCs distinct in personality —
the Handshake regular has the ceremony (can first, then the shot), the
Malört guy IS the shot. The props are set dressing for Chicago's actual
handshake pairing, so the Old Style case doubles as a wink toward his
colleague down the rocks.
