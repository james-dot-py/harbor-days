---
id: 014
area: engine
type: bug
model: opus
title: Mobile audio — make sound actually play on phones (+ visible audio-state probe)
acceptance: >
  Owner report (2026-07-09, issue 007): no sound on mobile. The game is LIVE
  at playope.com — treat as a defect, not polish. Root-cause first, fix
  second, and give the owner a way to SEE the audio state on their phone.
  Known architecture: src/audio.js initAudio() (L7-19) creates the
  AudioContext ONCE — `if(actx)return` + a single resume() attempt at
  creation — and NOTHING ever calls resume() again (grep: no other resume()
  in src/). If the context comes up suspended (iOS Safari when creation
  isn't synchronously inside the tap gesture) or gets re-suspended by the OS
  (backgrounding, call/interruption), the game is silent forever. Steps:
  (1) find where initAudio() is invoked (main.js start wiring) and verify
  the MOBILE start path calls it synchronously inside the touch handler —
  no await/requestAnimationFrame between tap and `new AudioContext()`;
  (2) reproduce headlessly: drive tools/act.mjs with chrome flag
  --autoplay-policy=user-gesture-required (add the flag to the tool if
  absent) and log actx.state after the start flow — demonstrate the
  suspension; (3) fix with a persistent safety net: on pointerdown /
  touchend / keydown / visibilitychange, if actx exists and state !==
  'running', call actx.resume() — cheap, idempotent, forever; (4)
  MEASUREMENT (the fix-the-measurement pattern): add ?audiodbg=1 — a small
  HUD line showing live actx state ('none' / 'suspended' / 'running') and a
  resume-attempt count, so the owner can open
  playope.com/?play=1&audiodbg=1 on the phone and read the truth directly;
  (5) verify: the act.mjs run under the strict autoplay policy shows
  'running' after a simulated tap; desktop keyboard start unaffected; all
  packs keep the actx-null-until-start contract (initAudio still fires only
  from user start). HONEST CAVEATS in the result: if the probe reads
  'running' but the phone is silent, it's the iOS hardware ringer switch or
  media volume — say so, don't churn code; and rule out
  quiet-not-suspended (musicBus gain 0.16 through a lowpass can be near-
  inaudible on phone speakers next to wind/wave noise — if state is
  'running' on-device, consider a modest mobile mix bump as a follow-up
  note, not a silent scope-grow). Single-file build passes.
refs:
  - src/audio.js (initAudio L7-19; getAudioCtx L24 — the actx-null contract)
  - src/main.js (start wiring; ?play=1 skip-title path — check whether it ever inits audio)
  - src/input.js (touch handlers L42-66 — natural home for the resume net)
  - tools/act.mjs (headless driver — needs the autoplay-policy flag for the repro)
  - autopilot/issues/007-mobile-no-audio.md
---

This is the first live-site bug report since launch, and it silences the
whole synthesized soundscape for phone players — half the point of the cozy
build. The fix itself is small; the value is in the repro (prove the
suspension headlessly before fixing) and the probe (the owner should never
have to guess again whether audio is off, muted, or broken).
