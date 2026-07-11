---
id: 039
area: millennium
type: scout
model: fable
title: Millennium Park SCOUT — refs, osm.json, BRIEF.md, delight candidates, draft expectations
acceptance: >
  refs/millennium-park/ exists and is honest: (1) `node tools/osm-fetch.mjs` run
  for the Millennium Park area (bounded by Michigan Ave W / Randolph St N /
  Columbus Dr E / Monroe St S, roughly lat 41.8802..41.8860, lng
  -87.6250..-87.6185) emitting refs/millennium-park/osm.json in a documented
  PARK-LOCAL frame with the applied offset recorded in provenance — this is a
  DISPLACED cell like Wrigleyville, so never validate against the true
  lakefront projection (true z would be ~+3200); the lakefront anchor asserts
  do not apply, document that in the provenance note. Note: the park's big
  footprints (pavilion, monument) may be OSM relations, not ways — the fetcher
  handles relations since task 020; confirm the pavilion actually landed.
  (2) `node tools/refs-fetch.mjs` pulled Wikimedia photos with a clean
  manifest.json (source, author, license, fetch date per image) covering: the
  Michigan Ave streetwall ("the cliff"), Pritzker Pavilion + Great Lawn +
  trellis, BP bridge, Crown Fountain context, Cloud Gate context, Lurie
  Garden, Wrigley Square peristyle, McCormick Tribune Plaza. CAVEAT: the US
  has no freedom of panorama for sculptures, so Commons may be thin on close
  Cloud Gate / Crown Fountain imagery — take what is cleanly licensed, note
  gaps in BRIEF.md, and remember the build register is HOMAGE NOT REPLICA
  (owner rule, same register as the bar likenesses), so massing/context refs
  suffice. Check refs/inbox/ for owner photos and file them with
  source: "owner". (3) refs/millennium-park/BRIEF.md written per §5.1:
  physical inventory (Cloud Gate on AT&T Plaza, Pritzker + Great Lawn +
  trellis, Crown Fountain reflecting pool, Lurie Garden shoulder hedge +
  salvia river + boardwalk/rill, BP bridge serpentine, Wrigley Square
  peristyle + Millennium Monument, Chase Promenade allee, McCormick Tribune
  Plaza as the SUMMER cafe — the game is perpetual summer dusk, no ice rink,
  Exelon pavilions, Metra Millennium Station beneath, the Michigan Ave
  streetwall), the 3-5 signature landmarks ranked, street topology
  (Michigan/Randolph/Columbus/Monroe frame; Red Line arrival is the
  Monroe/State SUBWAY a block west — the connector liberty to document),
  palette (silver bean + green lawn + white-grey Gehry steel + glass-block
  glow + Michigan Ave limestone cliff at dusk), housing/business texture, and
  DRAFT waypoint expectation strings for a named mp-* waypoint list (one per
  signature landmark + arrival + streetwall + bridge crest at minimum —
  authored deliberately from the refs, never auto-generated). (4) 4-8 delight
  candidates appended to delight-backlog.md tagged [proposed] with source
  refs (seeds to consider: a Bean polisher NPC with a squeegee, Crown
  Fountain spout soak gag, a Pritzker synth-orchestra soundcheck, a wedding
  photo shoot at the Bean — only what passes the §5.4 Chicago-plausible bar).
  (5) Every fetched PNG personally Read. No Google data in any form.
refs:
  - AUTOPILOT.md §5.1 (SCOUT), §4.4 (osm-fetch, displaced-cell offsets), §4.5
  - LOCATIONS.md Millennium Park planning notes (anchor set, homage register)
  - refs/wrigleyville/BRIEF.md if present, else refs/wrigley-field/ as the
    format precedent for a location brief
  - refs/inbox/ (owner photo channel — check every task)
---

First task of the Millennium Park pipeline (planner pick 2026-07-11, owner
directive). This is a REFERENCE-ONLY task: no game code, no GEOGRAPHY.md edits
yet — that is 040's job, citing this task's osm.json. Deliverables are files
under refs/millennium-park/, the delight-backlog additions, and honest
license bookkeeping. The BRIEF's waypoint-expectation drafts become the
authored strings 041 pastes into tools/waypoints.expect.json, so write them
as final judgeable sentences ("two glass-block towers face each other across
a wet black reflecting pool; a water arc spouts from the near tower's face"),
not vibes.

Copyright register (owner rule, LOCATIONS.md): Cloud Gate, Crown Fountain and
the Gehry works are copyrighted artworks. The game ships playful toon HOMAGES
— evoke, never replicate. Record this at the top of BRIEF.md so every build
task downstream inherits it.
