---
id: 087
area: global
type: build
model: opus
turns: 100
title: BASICS — the neighbors learn your name + idle charm
acceptance: >
  (1) NAME YOUR MAYOR: once, after first start (and after 077's coach
  marks if present): a small cream card — "what should the neighbors
  call ya?" — text input, 12 chars, letters/spaces/apostrophes only,
  default placeholder "Mayor" (enter-through keeps it); light-touch
  filter (a small denylist; when in doubt allow — it's their own
  screen). Persist via the save adapter. USE IT warmly but sparingly:
  a rotating minority of bump lines get a name variant ("ope — my
  fault, {name}"), the journal title page signs it ("the honorable
  {name}"), favor turn-ins thank you by name, the Wrigley ejection
  toast uses it ("{name}, OUT!" — comedy). Never every line — a name
  overused reads robotic; ~1 in 4 feels like being known. Desktop
  keyboard + mobile OS keyboard both work (the input must not fight
  the game's key handlers — suspend them while typing; the 014 audio
  chain untouched). (2) IDLE CHARM: when input is still ~20 s the
  mayor stretches/yawns/checks the sky (small state machine on the
  existing rig — no manual shoe/hand animation, Bug 2 rules); ~60 s
  and on safe flat ground, sits down right there (reuse the sit warp);
  nearby ambient life drifts closer (a butterfly, a sparrow) — any
  input stands back up instantly, never fights control. No idle during
  rides/activities/chases. (3) Determinism untouched (idle uses local
  time, not world rng); both inputs verified with shots (idle sequence
  captured, name flow at 390px); walkprobe green; single-file build.
refs:
  - src/framework.js (makeNPC bump lines, sit warp, state), src/character.js (rig rules)
  - the save adapter contract (078/085), index.html (card style)
---

Two oldest tricks in the cozy book: say the player's name once at the
right moment and they're yours; let the character breathe when idle and
the world reads alive even when the player leaves to make coffee. Both
are cheap; both compound with everything else the game already does.
