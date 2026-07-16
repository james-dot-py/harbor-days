---
id: 067
area: montrose
type: scout
model: fable
turns: 100
title: Montrose SCOUT — refs, osm.json (WORLD frame), BRIEF.md, delight candidates, draft expectations
acceptance: >
  refs/montrose/ exists and is honest. (1) `node tools/osm-fetch.mjs` run for
  the Montrose lakefront (Irving Park Rd north to ~Wilson Ave, LSD east to the
  lake — roughly lat 41.9535..41.9700, lng -87.6500..-87.6230; verify and
  widen if the Point's tip or the beach clips) emitting refs/montrose/osm.json
  in the WORLD frame — this is CONTIGUOUS 1:2 growth, NOT a displaced cell:
  reuse the established lakefront projection (x 0 at LSD's east edge, z 0 at
  Belmont Ave, 1:2 distances — the same anchor machinery the harbor extracts
  used; the lakefront-anchor asserts APPLY here, unlike Wrigleyville and
  Millennium). Grid sanity: Montrose Ave (4400 N) should land ≈ z −1206,
  Wilson (4600 N) ≈ z −1407. Record in provenance the MEASURED east reach of
  Montrose Point's tip and the harbor basin vs LSD — the real point juts far
  east of the current map's xMax 245, and 068 needs the true numbers to rule
  on an editorial compression. Dump ORDERED way point-lists for anything you
  cite (endpoints are first/last NODES, never bbox corners — PITFALLS).
  (2) `node tools/refs-fetch.mjs` pulled Wikimedia imagery with a clean
  manifest.json (source, author, license, fetch date per image) covering:
  Cricket Hill (the kite/sledding mound), Montrose Harbor (aerials if
  possible — basin shape, docks, boat launch), the fishing HOOK pier
  (the curved breakwater), Montrose Point + the Magic Hedge (the hedgerow
  itself, the brown 'Montrose Point Bird Sanctuary' sign, birders with
  scopes), Montrose Beach + the beach house, the Montrose Beach DUNES
  natural area, The Dock at Montrose Beach (beach bar), Park Bait
  (the harbor bait shop) — take what is cleanly licensed, note gaps in
  BRIEF.md. Check refs/inbox/ for owner photos and file them with
  source: "owner". After any fetch, count files vs manifest entries
  (case-collision overwrite pitfall) and prune stale entries.
  (3) refs/montrose/BRIEF.md written per §5.1: physical inventory + the 3-5
  signature landmarks RANKED (expect: the Magic Hedge + Point, the harbor +
  hook, Cricket Hill, the beach + dunes), topology (hill inland-west, harbor
  center-south with its mouth at the SOUTH, Point east/NE of the basin, beach
  running NW off the Point's north side, dunes at the beach's SE end abutting
  the Point, bait shop + launch on the harbor's west/NW, beach house at the
  beach), palette (prairie meadow + honeysuckle hedge greens, riprap grey,
  open-lake horizon, sand), and DRAFT mt-* waypoint expectation strings
  authored deliberately from the refs as final judgeable sentences, one per
  signature landmark + arrival + hook + summit at minimum. (4) RESEARCH THE
  PLOVER TENSION and write it up for 068 to rule on: the real Monty & Rose
  (2019-2021, then Imani, Searocket and their chicks) nested at the MONTROSE
  BEACH DUNES, but the game already stages "Fetch + Monty & Rose" at the
  Belmont dog beach (GEOGRAPHY.md, shipped) — document the real story +
  options (relocate the pen to the real dunes vs a recorded liberty) without
  deciding. Also note how Magic Hedge birding must read DISTINCT from the
  shipped Jarvis sanctuary register (Jarvis = enclosed secret-garden room +
  bird bingo; Montrose = open point, scopes, rare-bird energy, the Nike
  missile-site hedge history). (5) 4-8 delight candidates appended to
  delight-backlog.md tagged [proposed] with source refs (seeds to consider:
  fly a kite on Cricket Hill, a rare-bird alert at the Hedge with birders
  sprinting in, a plover chick + roped nest, smelt-netting or a bucket
  fisherman on the hook, Park Bait's cricket chirp, The Dock's beach-bar
  radio — only what passes the §5.4 Chicago-plausible bar). (6) Every
  fetched image personally Read. No Google data in any form. No game code,
  no GEOGRAPHY.md edits — that is 068's job, citing this task's osm.json.
refs:
  - AUTOPILOT.md §5.1 (SCOUT), §4.4 (osm-fetch), §4.5, §5.4
  - LOCATIONS.md Montrose entry (owner pick 2026-07-11 — contiguous growth,
    no hard cell; do not re-litigate)
  - GEOGRAPHY.md header (the grid: 400 N-units = 402 in-game; Irving Park =
    z −800; map bounds + "Future growth: North" note)
  - refs/belmont-harbor/ + refs/_anchor-cache.json (the WORLD-frame
    projection precedent), refs/millennium-park/BRIEF.md (brief format)
  - refs/inbox/ (owner photo channel — check every task)
---

First task of the Montrose pipeline (planner 2026-07-12, executing the owner
pick of 2026-07-11). REFERENCE-ONLY: deliverables are files under
refs/montrose/, delight-backlog additions, and honest license bookkeeping.
The BRIEF's waypoint-expectation drafts become the authored strings the build
tasks paste into tools/waypoints.expect.json, so write them as final
judgeable sentences ("a long dense hedgerow runs the meadow's spine; birders
with tripod scopes face it; beyond, open lake to the horizon"), not vibes.

This is the FIRST contiguous map growth since the v0.5 tall map — the scout's
measured coordinates (in the WORLD frame) are what makes 068's GEOGRAPHY.md
extension honest. Measure the things that will hurt later: the Point's east
reach, the basin's width, where the hook roots and curls, how far north the
beach runs.
