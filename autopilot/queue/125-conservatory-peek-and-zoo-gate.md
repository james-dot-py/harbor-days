---
id: 125
area: lincolnpark
type: polish
model: opus
turns: 100
title: Conservatory peek-inside on E actually works + a zoo entrance on the conservatory side (issue 038)
acceptance: >
  Two owner asks from the 2026-07-26 playtest, both on the conservatory side of
  Lincoln Park.
  (A) ISSUE 038 — "Doesn't look like you can peak inside the conservatory when you
  press E." Task 122 shipped a peek-inside door beat in src/packs/lp-conservatory.js
  and it is not landing for the player.
  (A0) REPRODUCE FIRST, do not guess: drive tools/act.mjs to the conservatory doors,
  press E, screenshot, and Read the PNG. Confirm what actually happens today —
  nothing at all, a bare toast, a prompt that never appears, or an interaction
  shadowed by another claiming E at the same spot.
  (A1) DIAGNOSE the real cause among: wrong anchor coords / radius too small for
  where a player naturally stands (framework.scanInteractions carries a +1.1 grace
  radius); fires but has no visible payload; shadowed by a neighbouring interaction;
  never registered at all. State the cause in your result summary.
  (A2) FIX so the beat is unmistakable: the E prompt appears on approach at the
  doors, and pressing it delivers something the player can SEE inside the glass —
  warm interior glow, palm silhouettes reading through the door, a framed look into
  the palm house. A toast alone is not a fix. 122 deliberately built no walkable
  interior and that stands: this is a look-in, not a room, and it must not promise a
  door that opens (the artinstitute.js precedent — no door-opening promise).
  (B) A ZOO ENTRANCE ON THE CONSERVATORY SIDE. Owner: "Add an entrance to the zoo
  from the conservatory side." Today the campus is reachable from the east/south; a
  player who walks the garden has to go around. Add a real gate on the conservatory
  (north/west) side and connect it: gate structure matching the existing zoo fence
  and gate vocabulary from 114, a welded path from the garden walks through to the
  campus interior (pathSamples2, mitre welds, no dead ends into beds), walkable end
  to end, colliders anti-trap clean (052/065 laws), and the fence gap cut in DATA so
  fence and gap can never disagree. The zoo is free and open in real life — the gate
  should read welcoming, not controlled.
  (C) MEASUREMENT: judged waypoints for both — the conservatory door beat and the
  new zoo gate approach — added to tools/waypoints.expect.json with authored
  expectations, walkthrough green on those ids, every PNG personally Read.
  (D) walkprobe covers the new gate path and exits 0; permanent guards stay green
  (no-solid-in-water, path-continuity, anti-trap).
  (E) DETERMINISM + PERF: local seeds, zero new instanced buckets unless named and
  justified, draws <= 480 at every affected waypoint, spawn diff within gate.
  (F) npm run build one artifact, zero console errors. Lincoln Park is SIGNED OFF
  (123) — extend its waypoint set, do not re-run a full §5.2 sign-off.
refs:
  - autopilot/issues/038-conservatory-peek-inside-e-missing.md (the report + ranked
    causes — read it first)
  - src/packs/lp-conservatory.js (the 122 pack: garden place cell, Bates mist,
    guarded burble, the peek-inside door beat that is not landing)
  - src/framework.js (addInteraction, scanInteractions + the +1.1 grace radius,
    holdItem/toast) — how interactions register and how they are scanned
  - src/packs/artinstitute.js (the "interior explicitly out of scope, no
    door-opening promise" precedent — same treatment here)
  - task 114 zoo campus (commit for the fence + gate vocabulary), src/data/chicago.js
    (zoo fence data + the west/north fence line), src/paths.js (garden walks from 122)
  - refs/lincoln-park/ imagery incl. Lincoln_Park_Conservatory_(9719113515).jpg
  - PITFALLS.md
---

Two things the owner tried to do and could not.

He walked up to the glasshouse you just built, pressed E because the game had taught
him E means "something happens here," and nothing he recognised happened. That is
worse than having no interaction at all — it teaches the player that this building is
scenery. The conservatory is one of the four signature landmarks of the stretch; the
door beat is how it stops being a facade.

And he wanted to walk from the garden into the zoo, which is exactly what a real
person does at that spot — the conservatory and the zoo are neighbours across
Stockton, both free, both open. Make that walk exist.
