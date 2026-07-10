---
id: 013
area: lakefront
type: build
turns: 100
title: Neighborhood suggestion box — diegetic at the Belmont FUTURE ENTRANCE
suggestions_topic: ope-suggestions-47f05eb0
owner_email: jfriedman847@gmail.com
acceptance: >
  (1) DIEGETIC PROP: a park-district-style suggestion box (house toon style,
  canvas-texture label like "WHERE NEXT? — drop a suggestion") beside the
  FUTURE ENTRANCE doors at the Belmont underpass (sign at ~(15,113); place the
  box on walkable ground nearby, small collider, no new walkable surface).
  (2) INTERACTION: E at the box opens a DOM card (style-match the existing ctl
  card): prompt "Where should Ope! go next?", a textarea (cap 500 chars), a
  Send button, and a small "or email Jimbo" mailto link
  (mailto:jfriedman847@gmail.com?subject=Ope!%20neighborhood%20suggestion).
  Send POSTs the text to https://ntfy.sh/ope-suggestions-47f05eb0 with Title
  "Ope! player suggestion". RULES for the game's FIRST runtime network call:
  fire ONLY on explicit user action; wrap in try/catch; on failure show a
  graceful toast pointing at the mailto fallback; the game must remain fully
  playable offline; no localStorage; disable the button while sending; toast
  success ("Ope! Suggestion sent — thanks ♥").
  (3) JOURNAL: one line in the about section pointing players to the box.
  (4) VERIFICATION: mechanically confirm the pipeline — send a test suggestion
  through the ntfy POST path and poll https://ntfy.sh/ope-suggestions-47f05eb0/json?poll=1
  to assert receipt; screenshot the box AND the open card (READ both; label
  text legible); act.mjs the E-interaction open/close; /verify + scoped
  walkthrough green. Baseline: prop is near spawn's north view — if the pixel
  diff trips the gate, [baseline-regen] in the same commit.
refs:
  - src/framework.js addInteraction / toast; index.html ctl card styling
  - GEOGRAPHY.md (Belmont stop cluster / future-entrance placement)
  - AUTOPILOT.md §5.4 (plausible-for-the-neighborhood inventions)
---

Owner directive (2026-07-09): players should be able to ask for their
neighborhoods. The FUTURE ENTRANCE doors are the perfect diegetic spot — the
game already winks at expansion there; now the wink takes requests. The
suggestions topic is public-by-design (it ships in the client); the owner
subscribes to it like the ops topic. Planner note: future planner runs should
weigh recurring player suggestions the owner relays via feedback.
