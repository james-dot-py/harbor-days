---
id: 080
area: global
type: build
model: fable
turns: 130
title: THE FUN LAYER, part 3 — shops, the item catalog, and HATS
acceptance: >
  Per ECONOMY.md. (1) SHOPS — four, each diegetic (a counter + keeper NPC,
  the framework `shop` UI listing items/prices/owned): the beach kiosk
  (078's pilot, expand), the Sluggers counter (Wrigleyville), the Lolla
  merch tent (Butler Field), a Michigan-Ave museum cart (by the lions).
  (2) ITEM CATALOG (tote items, each DOES something): hot dog (hold+eat,
  crumbs gag, "no ketchup" toast), Old Style (the favor prop + rooftop
  drink-rail toast unlock), coffee cup (brief walk-speed pep + steam),
  kite (fly it on Cricket Hill — wind minigame-lite, string + sway),
  boombox-to-go (radio stations anywhere, R-key integration), skip-stone
  pouch (skip anywhere on the water's edge), popcorn (bird lure),
  tennis ball (universal fetch), sea glass + smashed pennies
  (collectibles with journal pages — the penny machine at the museum cart
  MAKES the pennies: insert 1 dib, crank, souvenir). (3) HATS — the
  cosmetics system: mayor-only rig attachment point (022 rules: shared
  createChibi untouched; hat parents to the head, survives squash/sit/
  skate), 5-6 hats sold across shops: bucket hat, Cubs-coded cap, winter
  pom hat (the rink!), flower crown (Lolla), birder's boonie, paper
  pirate hat (kids' kiosk). Tote equips/unequips; save persists the worn
  hat. (4) Budget: shops are small builds (merge/instance), hats 1-2
  draws worn; determinism (shops at fixed data coords); walkability
  around counters (no new pinches — 065's reachability sweep must stay
  green); both inputs (buy/equip/use each item class once, shots READ);
  single-file build passes.
refs:
  - ECONOMY.md + 078 framework (wallet/bag/shop APIs)
  - src/character.js (mayor rig — the hat attachment per 022's mayor-only pattern)
  - src/packs/progression.js (radio/R-key for the boombox), watertoys (skip stones)
  - refs/ per-POI dirs for shop-siting reads
---

Hats are the retention system disguised as a joke — nobody logs off wearing
a paper pirate hat. Every item must DO a thing, not sit in a menu: the
catalog rule is "toy, not trophy." And the penny machine should feel like
the real ones: the crank matters more than the penny.
