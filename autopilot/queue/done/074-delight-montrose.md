---
id: 074
area: montrose
type: delight
turns: 100
title: Montrose DELIGHT — ship at least three moments that pass the taste bar
acceptance: >
  At least THREE delight moments shipped in the montrose area, each logged in
  DELIGHT-SHIPPED.md (line, location, commit) — §5.2 requires 3+ for
  sign-off, so this task is load-bearing. (1) Implement from
  delight-backlog.md [proposed] montrose lines (067 seeded them) and/or own
  ideas — no approval wait needed, but EVERY moment must pass the §5.4
  Chicago-plausible bar (the shipped taste bar: Malört guy, EAMUS CATULI,
  ball-hawk Gus). Strong candidates from the seeds: FLY A KITE on Cricket
  Hill (hold-to-launch via chargeThrow — releases on KEYUP — wind takes it,
  line from the hand, reel-in to end; a session camera per the bay-swing
  precedent ONLY if the chase cam genuinely can't frame it), the RARE-BIRD
  ALERT at the Magic Hedge (scope interaction → a rarity lands → nearby
  birders hustle over, journal line; timing must survive the headless
  shot-window pitfall — no terminal state that strands a waypoint), a
  PLOVER moment at the dunes (chick peek-out, naming nod to the real
  lineage), the hook FISHERMAN's catch (bucket, wriggle, "dinner"), Park
  Bait's cricket chirp on approach (WebAudio synth, actx guarded).
  (2) Implementation discipline: ONE pack module (or a small set) under
  src/packs/, ONE import line each in src/packs/index.js (re-read
  immediately before editing, retry on conflict); all setup inside
  onWorldReady; LOCAL seeds only; no per-frame allocations; interactions
  via addInteraction/makeNPC/journalSection; mobile + desktop both work
  (touch buttons per the DOM-input isolation law if any text/UI). Zero new
  InstancedMesh buckets; draws ≤480 at affected waypoints. (3) Each moment
  verified with a scripted interaction test (tools/act.mjs) or judged
  waypoint shot — every PNG personally Read; toasts/journal verified; no
  toast-queue spam in loops. (4) DETERMINISM: canonical spawn shot ≈noise
  vs baseline. walkprobe exit 0; `npm run build` one artifact; zero
  console/page errors; canary echoes.
refs:
  - delight-backlog.md (067's [proposed] montrose lines), DELIGHT-SHIPPED.md
  - AUTOPILOT.md §5.4/§5.5 (the bar + the ledger), refs/montrose/BRIEF.md
  - src/framework.js (chargeThrow, addInteraction, makeNPC, journalSection,
    getAudioCtx guard), src/packs/ (register precedents: diversey.js
    chargeThrow games, nature.js binoculars)
  - PITFALLS.md (chargeThrow keyup; toast pacing; headless shot timing;
    session-camera precedent; DOM input isolation)
---

Pick the three-to-five that make people tell someone else about the game.
The kite is the marquee candidate (nothing else in the game flies), the
rare-bird alert is the most Montrose thing that can happen, and the plover
chick is the heart. Log every shipped line in DELIGHT-SHIPPED.md and name
them in the close-out.
