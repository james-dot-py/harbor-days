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
