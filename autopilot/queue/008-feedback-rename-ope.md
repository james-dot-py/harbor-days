---
id: 008
area: global
type: feedback
title: Rename the game to "Ope!" (owner directive, 2026-07-08)
acceptance: >
  Every player-facing surface says "Ope!" instead of "Harbor Days": the <title>
  tag, the title-card <h1>, the HUD watermark (#mark), the journal section
  header (src/framework.js journalSection('harbor-days','Harbor Days',...)),
  and the about pack (src/packs/about.js). Screenshot the title card and the
  journal and READ both to confirm. Internal identifiers (package.json name,
  code comments, repo/dir names, GEOGRAPHY.md prose) may stay as-is — this is
  a display-name change, not a repo rename. Keep the version string. No
  regression to the start-gesture flow (title card must still dismiss and
  unlock audio on click).
refs:
  - autopilot/feedback/processed/feedback-2026-07-08T20-27-46-408Z.md (the note)
---

Owner playtest note (2026-07-08): `Rename the game "Ope!"` — the name riffs on
the midwestern "ope" the NPCs already say when bumped (framework.js makeNPC bump
lines), so it is on-brand for the chibi Chicago vibe.

Known display-name sites (grep for more before calling it done):
- index.html:6 `<title>Harbor Days — north side, chicago</title>`
- index.html:158-162 title card (h1 + sub/tiny lines mention the stroll, keep
  those unless they read oddly next to the new name)
- index.html:170 `<div id="mark">harbor days · v0.9</div>`
- src/framework.js:552 `journalSection('harbor-days','Harbor Days',...)` — the
  section KEY 'harbor-days' can stay (session-only state, but packs may
  reference the key; audit before renaming it).
- src/packs/about.js:9 `<p>Harbor Days — a toy Chicago lakefront.</p>`

Punctuation care: the name includes the exclamation point — "Ope!" — check it
renders well in the title card font and the <title> tag.
