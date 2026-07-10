---
id: 026
area: shell
type: feedback
model: opus
title: Mobile — tap the action popup itself to act (it hides the hand button)
acceptance: >
  Owner (2026-07-09): "when mobile suggests the hand emoji to act on
  something, you should be able to just click the popup rather than needing
  to find the hand button that's hiding behind the popup, e.g. 'grab a
  divvy'." Concretely, the interaction pill/hint that framework.js shows for
  the nearest addInteraction target must itself be a first-class tap target
  on touch devices: (1) tapping the pill fires the SAME code path as the
  hand button (framework.js ~L84, elBtnAct pointerdown → _touchAct) —
  exactly one action per tap, no double-fire when the tap lands where pill
  and button overlap; (2) fix the occlusion itself too: at phone widths the
  pill should not sit on top of the hand button (index.html touch-layout
  CSS — move one of them; the pill text must stay readable above the
  joystick/buttons); (3) touch affordance: the pill reads tappable (subtle
  pressed state on touch); (4) desktop unchanged: E key still primary; if
  the pill becomes clickable there too, give it a pointer cursor —
  otherwise leave it inert; (5) verify with act.mjs at a 390px touch
  viewport on real interactions (Divvy dock 'grab a divvy', a sit spot, the
  birdwatch scope): tap the pill rect → interaction fires; walk away → pill
  clears and dead pill-rect taps do nothing (no ghost tap zone that eats
  joystick input). index.html stays logic-free — wiring lives in
  framework.js / input.js. Single-file build passes; desktop keyboard flow
  untouched.
refs:
  - src/framework.js (~L84 elBtnAct pointerdown; addInteraction pill/label logic)
  - src/input.js (touch handlers L42-66; 'touch' body class L42)
  - index.html (pill/hint DOM + touch layout CSS)
---

Small fix, big mobile feel: on a phone the pill IS the interaction's
announcement, so it should be its acceptance too — see it, tap it. Watch the
edge cases: the pill must not become an input-stealing overlay when no
interaction is near, and a pill tap while moving shouldn't also register as
a joystick touch.
