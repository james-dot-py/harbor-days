---
id: 030
area: lakefront
type: feedback
model: opus
turns: 30
title: Remove the FUTURE ENTRANCE signs (owner feedback 2026-07-10)
acceptance: >
  The "FUTURE ENTRANCE →" signs are gone. Owner note (2026-07-10, verbatim):
  "get rid of the future entrance sign". There are three sign entries in
  src/data/chicago.js (~line 372: Belmont x=15,z=113; Addison x=16,z=-394;
  Irving Park x=16,z=-794) — the owner played at Belmont (the suggestion box
  lives there) but the three are one repeated gag, so remove all three unless
  a sweep shows a reason not to. Keep the underpass portal structures
  (structures.js) and the task-013 suggestion box fully working — only the
  signs go. Update src/packs/about.js (~line 16), which directs players to the
  "Belmont Future Entrance" to find the suggestion box: reword so the box is
  still findable ("west end of the harbor, by the underpass doors" or
  similar). Check src/packs/ambient.js:124 comment and any journal/toast copy
  referencing FUTURE ENTRANCE. Determinism: removing sign entries must not
  reorder rng consumption for unrelated props — verify against
  tools/shots/baseline.png (signs themselves disappearing is the expected
  diff; regen baseline with a canary-verified own-vite shot per PITFALLS.md
  if the spawn frame changes). Walkthrough the Belmont underpass waypoint and
  READ the shots.
refs:
  - autopilot/feedback/processed/feedback-2026-07-10T02-27-21-189Z.md
---

Owner playtest note, 2026-07-10: "get rid of the future entrance sign."
Filed by task 015 (urban kit), which the note does not bear on.
