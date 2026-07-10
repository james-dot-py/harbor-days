---
id: 024
area: shell
type: feedback
model: opus
title: Title card — "by Jimbo" author credit
acceptance: >
  Owner note (autopilot/feedback/processed/feedback-2026-07-10T01-24-24-133Z.md):
  add "by Jimbo" for author creds on the homescreen. Put it on the title card
  (index.html — CSS/DOM shell, no game logic) near the game title, styled with
  the card's existing type (same family/weight scale, subordinate to the title;
  think movie-poster byline, not a watermark). Must not collide with the
  task-011 Ko-fi 'Support development' element or the start button at phone
  widths (test 390px and 1280px viewports). Verify with a title-screen
  shot.mjs capture (NO play=1) at both widths, READ the PNGs; spawn
  baseline.png is untouched (credit lives on the title card only — if any
  in-game HUD pixel changes, that's a regression, not this task).
refs:
  - index.html (title card markup/styles)
  - autopilot/feedback/processed/feedback-2026-07-10T01-24-24-133Z.md (verbatim owner note)
---

Owner playtest 2026-07-10: "On the homescreen, let's add 'by Jimbo' for
author creds." Smallest honest scope: one byline element on the title card,
responsive at phone + desktop, verified visually at both widths.
