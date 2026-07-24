---
id: 118
area: lincolnpark
type: delight
turns: 100
title: Lincoln Park DELIGHT — ship at least three moments that pass the taste bar
acceptance: >
  At least THREE delight moments shipped in the lincolnpark area, each
  logged in DELIGHT-SHIPPED.md (line, location, commit) — §5.2 requires 3+
  for sign-off, so this task is load-bearing. (1) Implement from
  delight-backlog.md [proposed] lincolnpark lines (110 seeded them) and/or
  own ideas — no approval wait needed, but EVERY moment must pass the §5.4
  Chicago-plausible bar. Strong candidates from the seeds: SEAL FEEDING
  TIME (an interaction or timed beat at the pool — keeper + fish bucket,
  seals converge, barks via synthesized WebAudio, journal line), RIDE THE
  CAROUSEL (mount an animal, the platform actually turns — a session
  camera per the bay-swing precedent ONLY if the chase cam genuinely can't
  frame it; de-branded name per RENAMES.md), the NIGHT-HERON moment on
  the boardwalk (spot the hunched rookery bird through a scope/press —
  the real endangered-colony story, journal line), South Pond DUSK CHORUS
  (frog/cricket layer near the pond, mood-gated, actx guarded), a FARM
  beat (chicken scatter / goat headbutt on approach). (2) Implementation
  discipline: ONE pack module (or a small set) under src/packs/, ONE
  import line each in src/packs/index.js (re-read immediately before
  editing, retry on conflict); all setup inside onWorldReady; LOCAL seeds
  only; no per-frame allocations; interactions via addInteraction/makeNPC/
  journalSection; mobile + desktop both work (DOM-input isolation law for
  any text/UI). Zero new InstancedMesh buckets; draws ≤480 at affected
  waypoints. (3) Each moment verified with a scripted interaction test
  (tools/act.mjs) or judged waypoint shot — every PNG personally Read;
  toasts/journal verified; no toast-queue spam in loops (the feeding-time
  converge is a loop — one toast, not one per seal). (4) DETERMINISM:
  canonical spawn shot ≈noise vs baseline. walkprobe exit 0; `npm run
  build` one artifact; zero console/page errors; canary echoes.
refs:
  - delight-backlog.md (110's [proposed] lincolnpark lines),
    DELIGHT-SHIPPED.md
  - AUTOPILOT.md §5.4/§5.5 (the bar + the ledger),
    refs/lincoln-park/BRIEF.md
  - src/framework.js (addInteraction, makeNPC, journalSection, getAudioCtx
    guard, screenFx), src/packs/ (register precedents: the Montrose
    rare-bird alert + kite, the sea-lion/seal rigs from 114)
  - PITFALLS.md (toast pacing; headless shot timing — no terminal state
    that strands a waypoint; session-camera precedent; DOM input
    isolation; chargeThrow keyup)
---

Pick the three-to-five that make people tell someone else about the game.
Feeding time is the marquee candidate (the whole map converges on one
minute of chaos), the carousel is the one kids will ask for, and the
night heron is the heart — a real endangered-species story the city
mostly walks past. Log every shipped line in DELIGHT-SHIPPED.md and name
them in the close-out.
