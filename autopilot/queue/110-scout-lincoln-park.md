---
id: 110
area: lincolnpark
type: scout
model: fable
turns: 100
title: Lincoln Park SCOUT — refs, osm.json (WORLD frame), BRIEF.md, the west-reach numbers, delight candidates, draft expectations
acceptance: >
  refs/lincoln-park/ exists and is honest. (1) `node tools/osm-fetch.mjs
  lincoln-park --bbox <s,w,n,e>` run for the Lincoln Park core (Diversey Pkwy
  south to ~Armitage Ave, Clark St east to the lake — roughly lat
  41.9150..41.9340, lng -87.6460..-87.6240; verify and widen if the zoo's west
  fence, the conservatory, or South Pond clips) emitting
  refs/lincoln-park/osm.json in the WORLD frame — this is CONTIGUOUS 1:2
  growth, NOT a displaced cell: reuse the established lakefront projection
  (x 0 at LSD's east edge, z 0 at Belmont Ave, 1:2 distances; the lakefront
  anchor asserts APPLY, no --offset). Grid sanity: Diversey (2800 N) ≈ z +402
  (the shipped corner wrap sits at +340…+403), Fullerton (2400 N) ≈ z +805,
  Armitage (2000 N) ≈ z +1207. Record in provenance the MEASURED WEST REACH:
  this is the map's first growth WEST of Lake Shore Drive (today's xMin −10),
  so measure LSD east edge → Cannon Dr → the zoo's east and west fences →
  Stockton Dr → the conservatory, at Fullerton latitude — 111 needs the true
  numbers to rule a WEST-REACH editorial compression (the mirror of the
  Montrose east-reach standing liberty). Also measure: the Diversey Harbor
  inlet + the lagoon channel running south under Fullerton along the zoo's
  east flank, Theater on the Lake's footprint at the Fullerton lakefront, the
  zoo campus interior (gates, the central Seal Pool, Kovler Lion House,
  Regenstein ape house, Farm-in-the-Zoo, the carousel), the conservatory +
  its formal garden + the Bates "Storks at Play" fountain, South Pond + the
  Nature Boardwalk ring + Café Brauer + the honeycomb Education Pavilion.
  Dump ORDERED way point-lists for anything you cite (endpoints are
  first/last NODES, never bbox corners — PITFALLS). (2) `node
  tools/refs-fetch.mjs` pulled Wikimedia imagery with a clean manifest.json
  (source, author, license, fetch date per image) covering: the zoo east
  gate + free-admission entry, the Seal Pool, the Kovler Lion House (1912
  brick hall), the conservatory glass domes (Palm House), Café Brauer, the
  Nature Boardwalk + honeycomb pavilion, South Pond (herons/turtles),
  Farm-in-the-Zoo barns, Diversey Harbor, Theater on the Lake, the Bates
  fountain — take what is cleanly licensed, note gaps in BRIEF.md. Check
  refs/inbox/ for owner photos and file them with source: "owner". After any
  fetch, count files vs manifest entries (case-collision overwrite pitfall)
  and prune stale entries. (3) refs/lincoln-park/BRIEF.md written per §5.1:
  physical inventory + the 3-5 signature landmarks RANKED (expect: the zoo
  campus + Seal Pool, the conservatory, the Nature Boardwalk pavilion +
  Café Brauer, Diversey Harbor as the connective water), topology (the
  harbor channel west of LSD running south under Fullerton; the zoo between
  Cannon and Stockton south of Fullerton; the conservatory + garden NW of
  the zoo at Fullerton/Stockton; South Pond hanging off the zoo's south end;
  Theater on the Lake alone on the lakefront east of LSD), palette
  (red brick + limestone trim, glasshouse white-green, lagoon green water,
  zoo planting), and DRAFT lp-* waypoint expectation strings authored
  deliberately from the refs as final judgeable sentences, one per signature
  landmark + arrival + gate + pool + pavilion at minimum — remember the
  DOWNTOWN-SKYLINE PHYSICS RULING (far plane 900, fog opaque 210 m): the
  real South Pond postcard has the skyline behind the pavilion; the game
  CANNOT show it, so no expectation string may promise it. (4) VERIFY THE
  ANIMAL CAST against sources and rank it for 114/115 (the real zoo's
  residents — seals at the historic pool, lions at the Kovler house, apes,
  snow monkeys, polar bear, penguins, flamingos, farm animals — pick what
  READS chibi-chunky at zone distance; small toon animals don't read,
  PITFALLS). Document the FREE-ZOO fact (open gates, no ticket) — it shapes
  114's entry design. (5) DE-BRAND AUDIT for RENAMES.md: donor/person names
  (Kovler, Regenstein, Brauer, Bates, Pepper) stay real per the RENAMES
  precedent; commercial marks in zoo fixture names (the Peoples Gas
  pavilion, the AT&T carousel) need pun/generic in-game names — document,
  111 records the ledger lines. (6) 4-8 delight candidates appended to
  delight-backlog.md tagged [proposed] with source refs (seeds to consider:
  seal feeding time with a keeper + fish bucket, the carousel actually
  ridable, a night-heron rookery moment on the boardwalk, cricket/frog
  chorus at South Pond dusk, a paddleboat or rowboat on the lagoon, the
  farm's chicken chase, conservatory humidity fog on entry — only what
  passes the §5.4 Chicago-plausible bar). (7) Every fetched image personally
  Read. No Google data in any form. No game code, no GEOGRAPHY.md edits —
  that is 111's job, citing this task's osm.json.
refs:
  - AUTOPILOT.md §5.1 (SCOUT), §4.4 (osm-fetch), §4.5, §5.4
  - LOCATIONS.md Lincoln Park entry (planner pick 2026-07-19 — contiguous
    south-west growth through the staged Diversey-Lincoln Park gate; do not
    re-litigate)
  - GEOGRAPHY.md header (the grid: 400 N-units = 402 in-game; the corner
    wrap +340…+403 and south edge +415; "Future growth: South" note names
    the gate at ~x55, z395) + the 084-compression section (the precedent 111
    will cite for any south/west squeeze)
  - refs/montrose/osm.json + BRIEF.md (the contiguous-growth scout
    precedent — mirror its provenance rigor), refs/_anchor-cache.json
  - RENAMES.md (the de-brand law + the person-name KEEP precedent)
  - refs/inbox/ (owner photo channel — check every task)
---

First task of the Lincoln Park pipeline (planner 2026-07-19, §5.3 pick:
recognizability + contiguity + variety — the map's first animals). REFERENCE
ONLY: deliverables are files under refs/lincoln-park/, delight-backlog
additions, and honest license bookkeeping. The BRIEF's waypoint-expectation
drafts become the authored strings the build tasks paste into
tools/waypoints.expect.json, so write them as final judgeable sentences
("a round stone-rimmed pool in front of red-brick arches; dark seal shapes
arc through the water; a rail of onlookers leans in"), not vibes.

This is the map's first growth WEST of Lake Shore Drive — the scout's
measured west-reach numbers are what makes 111's compression ruling honest.
Measure the things that will hurt later: how far west Stockton really is,
the harbor channel's width, the zoo's fenced footprint, where the boardwalk
ring actually runs.
