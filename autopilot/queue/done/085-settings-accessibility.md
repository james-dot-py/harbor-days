---
id: 085
area: shell
type: build
model: opus
turns: 110
title: BASICS — a settings card (audio, camera, accessibility, low-power)
acceptance: >
  The game has zero settings — the most obvious missing fundamental.
  Build a SETTINGS CARD in the journal/controls card style (gear button
  bottom-left by "?", Esc also opens it on desktop; game keeps running
  behind it, cozy not modal): (1) AUDIO: separate Music and SFX volume
  sliders (the buses already exist in audio.js — musicBus/sfxBus gains)
  + a master mute toggle; changes apply live. (2) CAMERA: drag/look
  sensitivity slider + invert-Y toggle (respect in both mouse and touch
  paths). (3) ACCESSIBILITY: reduced-motion toggle (disables camera
  sway/bob, tones squash-stretch, softens firework flashes — route
  through one `prefersCalm` flag packs can read; also honor the OS-level
  prefers-reduced-motion media query as the default), UI text scale
  (S/M/L multiplier on the HUD font sizes). (4) LOW-POWER MODE for old
  phones: caps devicePixelRatio at 1 + more aggressive fog-cull distance
  — label it honestly ("smoother on older phones"). (5) All settings
  persist via the guarded save adapter (078's; if 078 hasn't landed yet,
  implement the same try/catch localStorage contract standalone and let
  078 absorb it). Defaults = today's behavior exactly. VERIFY both
  inputs at 390px + desktop: every control changes the thing it claims
  (assert bus gain values, DPR, flag states via __hd), settings survive
  reload, the 014 audio-gesture chain untouched; shots READ; walkprobe
  green; single-file build passes.
refs:
  - index.html (journal/ctl card patterns), src/audio.js (buses), src/input.js (look sensitivity), src/core.js (renderer/DPR)
  - autopilot/queue/078-economy-framework.md (save adapter contract)
---

A cozy game that can't turn its music down is asking phones in quiet
rooms to close the tab. Reduced-motion matters double here: the camera
sway that reads charming on a monitor reads seasick on a bus.
