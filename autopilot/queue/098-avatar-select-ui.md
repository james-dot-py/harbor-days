---
id: 098
area: ui
type: fix
model: kimi
turns: 60
title: Avatar select — stop occluding the preview, render full names
acceptance: >
  Owner (2026-07-19): "The selection panel occludes the avatar preview it's
  selecting, and avatar names are truncated with ellipses." Fix BOTH:
  (1) Reposition or resize the character-select panel (src/avatarselect.js +
  its CSS in index.html) so the previewed avatar is FULLY visible while the
  player is choosing — the panel must not cover the model it's switching.
  (2) Render full avatar names — widen the label container, allow wrapping,
  or reduce font size; NO ellipsis truncation anywhere on the card (an audit
  screenshot shows "the consult…" and "the ca…" today). Accept: tools/shot.mjs
  capture of the selection screen (desktop AND --mobile) shows the full
  avatar model and the complete name text for the longest avatar name in the
  roster. Do not change anything not listed here — the pick flow, timing,
  ope.avatar key, and roster contents all stay. Standard gates (walkprobe,
  screenshot regression, zero console errors).
refs:
  - src/avatarselect.js
  - index.html (card CSS)
  - tools/act.mjs (--mobile viewport must be checked too)
---
