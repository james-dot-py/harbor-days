# 007 — no audio on mobile (live site)

- severity: high (playope.com is live — every mobile player gets a silent
  game, and the synthesized soundscape is a big part of the cozy read)
- evidence: owner report, 2026-07-09 ("make sure we got sound on mobile,
  can't seem to hear it"). Not yet reproduced in-repo — reproduce headlessly
  with chrome --autoplay-policy=user-gesture-required.
- observed/suspected: src/audio.js initAudio() L7-8 — one-shot AudioContext
  creation with a single resume() attempt and an `if(actx)return` re-entry
  guard; grep confirms NO other resume() anywhere in src/. Any context that
  comes up (or later becomes) suspended stays suspended forever — classic
  iOS Safari pattern when creation isn't synchronously inside a tap gesture,
  and also happens when the OS re-suspends on tab background/interruption.
- expected: sound after the start tap on iOS Safari and Android Chrome; a
  ?audiodbg=1 probe shows actx.state === 'running' on-device; the iOS
  hardware ringer-switch caveat documented so silent-by-OS isn't chased as
  a code bug.
- route: task 014 (owner-bumped to run next, 2026-07-09 — live-site defect).

## RESOLVED — task 014 (2026-07-09)

- root cause: src/audio.js created the AudioContext once and resumed it once;
  nothing ever resumed it again. On iOS the first-gesture context can come up
  'suspended', and any OS interruption (backgrounding, a call, screen lock)
  re-suspends it — silent forever after that.
- fix: a persistent, idempotent resume net (src/audio.js resumeAudio /
  installAudioResumeNet, wired in src/main.js after initInput) fires actx.resume()
  on every pointerdown / touchend / keydown and on tab-refocus (visibilitychange),
  but only when actx exists AND state !== 'running'. It never CREATES a context,
  so the actx-null-until-start contract packs depend on is preserved.
- probe: ?audiodbg=1 paints a live HUD (bottom-right) — 'none' / 'suspended' /
  'running' + a resume-attempt count. Owner can open
  playope.com/?play=1&audiodbg=1 on the phone and read the truth directly.
- repro: tools/act.mjs gained --strict-autoplay (adds
  --autoplay-policy=user-gesture-required), --audio-log, and an ["eval",...] step.
  NOTE: headless Chromium does NOT enforce the autoplay gate (a fresh no-gesture
  context reports 'running' even with the flag) — so the flag alone can't
  reproduce iOS' suspended-forever state headlessly. Instead the repro
  force-suspends the live context (window.__hd.audioCtx().suspend(), simulating
  the OS interruption that IS the real cause), confirms 'suspended · resumes 0',
  then a single trusted keypress recovers it to 'running · resumes 1'. Shots:
  tools/shots/audio014_{suspended,running}.png.
- CAVEATS still open (do NOT churn code — read the on-device probe first):
  * if the probe reads 'running' but the phone is silent → iOS hardware ringer
    (silent) switch or media volume down. WebAudio obeys the ringer switch unless
    routed through a played HTMLMediaElement. Not a code bug.
  * quiet-not-suspended: musicBus gain 0.16 through a 2200 Hz lowpass can be
    near-inaudible on tiny phone speakers next to wind/wave SFX. If the on-device
    probe reads 'running' but it's just too quiet, a modest mobile-only mix bump
    is the follow-up — file it then, don't scope-grow now.
