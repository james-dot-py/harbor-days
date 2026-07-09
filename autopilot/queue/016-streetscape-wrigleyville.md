---
id: 016
area: wrigleyville
type: build
turns: 140
title: Wrigleyville streetscape — apply the urban kit until the canyons judge green
acceptance: >
  The four wv-street-* canyon waypoints (Addison, Sheffield, Waveland, Clark)
  judge GREEN against their enclosure expectations from a fresh scoped
  walkthrough, every PNG READ: (1) per-lot FACADE RECIPES in
  src/data/wrigleyville.js (data, not builder hardcode) so every street-facing
  building gets a distinct storefront/dressing composition — doors, glazing,
  awnings, cornices, window grids; no blank single-color wall > ~8 m on any
  face the player walks past; coordinate with 010 (named-bar likenesses from
  photos own the hero bars — this task owns the fabric between them) and fix
  issue 001 (sign plates clamp to face bounds) wherever touched. (2) FURNITURE
  RHYTHM on every sidewalk: lamps, meters, hydrants, newsboxes, bike racks,
  trash cans, tree grates from the 015 kit; parked cars along legal curb
  stretches (not in crosswalks/hydrant zones — the details ARE the joke).
  (3) SIGNALS: Chicago mast-arm stoplights + crosswalks at Clark/Addison and
  Sheffield/Addison; static or slow-cycling, no gameplay effect. (4) Backdrop
  boxes remain ONLY beyond the barricades. (5) Draw calls: full-map max stays
  <= budgets.json (1050) — use the kit's instancing; report census() before/
  after. (6) No walkability changes (props get colliders, streets stay
  walkable curb to curb). NPC bump lines still work near new props.
refs:
  - autopilot/queue/015-urban-kit.md (the vocabulary — MUST land first; if 015
    is not in done/, fail honestly and resequence behind it)
  - tools/waypoints.expect.json wv-street-* entries (the bar being judged)
  - refs/inbox owner screenshots ("sad.png", "sad and unremarkable.png",
    "neon sign cut off.png" verdicts)
  - .claude/commands/art-director.md street-canyon checklist
---

The measurement now exists (wv-street-* waypoints judge enclosure); this task
makes Wrigleyville pass it. Editorial bar: stand at any midblock point and
slowly orbit — everywhere you look should be SOMETHING with intent: a door, a
meter, a cornice line, a parked Honda with a Cubs sticker. That last one is
allowed.
