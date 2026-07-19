---
id: 094
area: global
type: feedback
model: fable
turns: 120
title: DE-BRAND SWEEP — proprietary names become evocative puns
acceptance: >
  Owner (2026-07-18): "any brand names or direct proprietary references
  should be changed to evoke the original name as a pun to avoid copyright
  stuff." Inventory FIRST: grep every player-visible string (signs, canvas
  textures, toasts, journal, shop labels, NPC lines, minimap/citymap labels)
  for proprietary marks — e.g. Divvy, Old Style, Malört, Pequod's, Sluggers,
  Lollapalooza, Cubs/Wrigley Field marks, Topgolf, Ko-fi(?), CTA/L branding,
  Brown/Red Line, Art Institute — and produce a RENAME TABLE in the result:
  mark -> pun (evokes the original, one obvious wink, e.g. Divvy->Dibsy,
  Old Style->Olde Stylo, Pequod's->Pequilod's, Lollapalooza->Lallapawlooza —
  taste per /art-director register). SCOPE LINES: geographic/park/street
  names and honorary-way people stay (public names, the recognizability
  law); the Ko-fi support surfaces stay (owner's own rail); trademarks on
  REAL landmark geometry (marquee, scoreboard) get pun text, not removal.
  Apply via the sign/canvas builders and string tables — no layout moves,
  no rng call-order changes; word-sign law holds (own canvas, measureText
  fit — long puns must not clip, the 'NI GO' pitfall). Re-shoot and READ
  every sign waypoint whose text changed (the 088 sign waypoint rail covers
  most); update expectation strings to the new names in the same commit;
  baseline/QR/decoder tooling still green (kofi QR untouched). Journal/
  favors/save keys: ids stay stable (save whitelist law) — only display
  strings change.
refs:
  - autopilot/feedback/processed/feedback-2026-07-18T03-37-00-278Z.md (verbatim)
  - tools/waypoints.expect.json (sign expectations to update in lockstep)
  - PITFALLS.md (word-sign canvas law; 088 sign depth clause)
---

A policy sweep, not an art rework: same places, winking names. The rename
table in the result is the artifact the owner signs off on.
