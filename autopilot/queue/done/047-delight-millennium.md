---
id: 047
area: millennium
type: delight
turns: 100
title: Millennium Park DELIGHT — ship at least three moments that pass the taste bar
acceptance: >
  At least THREE delight moments shipped in the millennium cell, each logged
  in DELIGHT-SHIPPED.md (line, location, commit) — §5.2 requires 3+ for
  sign-off, so this task is load-bearing: (1) Implement from
  delight-backlog.md [proposed] millennium lines (039 seeded them) and/or
  own ideas — no approval wait needed, but EVERY moment must pass the §5.4
  faithfulness bar (plausible for THIS park, Chicago-specific, in the
  shipped taste register: no-ketchup rules / Malort guy / EAMUS CATULI).
  Strong candidates from the scout seeds: the BEAN POLISHER (an NPC with a
  squeegee on a pole working the underbelly, grumbling about fingerprints —
  bump lines in voice), the CROWN FOUNTAIN SOAK (already spouting per 045 —
  the delight cut is the reward: a 'soaked' screenFx + journal stamp +
  the kid NPCs rating your dodge), the PRITZKER SOUNDCHECK (a synthesized
  rehearsal fragment — warm organ/string swells from the stage on a long
  local-seed cycle, ~20 s, ducked with distance; 100% WebAudio synthesis,
  actx null-guarded, routed via musicBus like the ride's organSting), a
  WEDDING SHOOT at the bean (posed couple + photographer NPC circling for
  angles, "one more, pretend you like each other"). (2) All moments live in
  ONE pack module src/packs/millennium-delight.js (one import line in
  src/packs/index.js — re-read immediately before editing, retry on
  conflict), LOCAL mulberry32 seed, all setup inside onWorldReady, zero
  shared files edited beyond the import line. (3) NPC/interaction hygiene:
  makeNPC for characters (culling is free), addInteraction only where the
  player acts, single toasts (never queued in loops), R/F/Z/C/SPACE/E/J
  key claims untouched (R belongs to progression). (4) Verify: /verify;
  walkthrough of the affected mp waypoints + act.mjs interaction scripts
  where a moment is interactive; READ every PNG personally; each shipped
  moment visibly present in at least one Read screenshot (or console-
  verified for audio — assert the soundcheck scheduling via window.__hd
  instrumentation rather than trusting silence); draws <= 480; zero console
  errors; baseline intact; single-file build. (5) DELIGHT-SHIPPED.md +
  delight-backlog.md updated in the close-out commit ([proposed] lines
  implemented here get moved, not duplicated).
refs:
  - delight-backlog.md (the millennium [proposed] lines from 039)
  - DELIGHT-SHIPPED.md (format + the taste bar exemplars)
  - AUTOPILOT.md §5.4, §5.5 (the faithfulness + delight law)
  - src/packs/wrigley-ride.js organSting (synth-music precedent),
    src/packs/malort.js + src/packs/parkcharm.js (NPC-gag register)
  - PITFALLS.md (toast queue; audio guard; distance-cull sign errors —
    sanity-check every pl.z cull against the cell's positive z)
---

The moments are the memory. Pick the three-to-five that are the most
MILLENNIUM PARK — the bean's fingerprint economy, the fountain's soak
ritual, the pavilion that is always almost-rehearsing — over anything
generic-park. A tourist gag is allowed (this is the one neighborhood where
tourists ARE the local color) but at least one moment should be for the
locals (the polisher's opinions about smudges, or the soundcheck that only
plays deep cuts).

Watch the z-sign pitfall specifically: this is the first POSITIVE-z cell,
and task 025 lost an hour to a flipped cull sign at negative z. Every
distance check gets sanity-tested against GEOGRAPHY.md coordinates.
