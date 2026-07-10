# 013 — can't drink Malört from the Malört guy (mobile report; actually everywhere)

- severity: medium (he literally offers you some — "tastes like a burnt
  band-aid — want some?" — and there is no way to say yes)
- evidence: owner report, 2026-07-09 ("can't drink mallort from the mallort
  guy on mobile I think").
- observed: two Malört-adjacent NPCs exist. The MALÖRT GUY
  (src/packs/characters.js ~L56-61, at 156,90 on the rocks, holds an amber
  bottle) has BUMP LINES ONLY — no addInteraction, so no drink on any
  platform; the owner's "on mobile I think" reads as discovering this while
  playing on the phone. The actually-drinkable Malört is the CHICAGO
  HANDSHAKE regular (src/packs/npcs.js ~L455-479, at 150,195 with the
  cooler) — a different NPC. Secondary: the touch pill-occlusion bug
  (issue-free, task 026) may additionally block the Handshake trigger on
  phones — 026 now names it as a test case.
- expected: the Malört guy serves a drink via a standard interaction, and
  both Malört NPCs fire correctly on touch.
- route: task 029 (drink interaction + bottle/Old Style case props); task
  026 verifies the Handshake on touch.
