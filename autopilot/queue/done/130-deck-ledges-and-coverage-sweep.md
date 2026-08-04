---
id: 130
area: citywide
type: polish
model: opus
turns: 60
title: The deck-coverage sweep — invisible ledges, untagged decks, and the surfaces the new gate cannot see yet
acceptance: >
  Task 128 shipped `tools/deck-coverage.mjs` (walkprobe's 6th shell-out guard):
  it raycasts every RENDERED walkable plank in the live game and asserts (A) every
  interior plank cell is walkable, (B) surfaceY matches the rendered top face
  within 0.3 m, (C) the deck is reachable from real ground. 15 decks are tagged
  and all three checks are GREEN. Per 128's acceptance (7), the leftovers were
  filed rather than fixed in-flight. They are:
  (1) THE INVISIBLE LEDGES (the reverse of issue 040 — walk surface with no plank
  under it). The tool already prints these every run as WARN lines labelled task
  130, and they do not fail the gate:
      - `pier-0` (peninsula pier, CH.DECKS[0]): 126 interior rect cells, ~7.9 m2 —
        the walk rect is z -120.5..-89.5 while the slab is z -120..-90, i.e. a
        0.5 m lip of standable AIR at BOTH ends, hanging over the lake.
      - `pier-1` (corner pier, CH.DECKS[1]): 78 cells, ~4.9 m2 — same 0.5 m lip.
      - `diversey-finger-492` and `diversey-finger-612`: 5 cells each (~0.3 m2) —
        the rects derive from the sampled bank and extend 0.3 m past the plank at
        the landward root. That 0.3 m is over the walkable promenade, so it is
        cosmetically harmless; confirm and either keep-with-a-note or trim.
      Decide each: trim the rect to the plank, or extend the plank to the rect
      (the piers are the ones that matter — a player CAN stand on 0.5 m of
      nothing over open water at both ends of both piers). Fix at the DATA layer
      (`CH.DECKS[].walk` vs `.deck`) so engine and walkprobe move together, then
      make the reverse check a HARD FAIL in deck-coverage.mjs and delete the WARN
      escape hatch. That is the real deliverable: the gate should assert BOTH
      directions, not one and a half.
  (2) SURFACES THE GATE CANNOT SEE YET. Census every walkable surface in the game
  against the 15 tagged decks and report the gap honestly:
      - HARD-CELL decks (Millennium BP bridge, Nichols Bridgeway, the Wrigleyville
        rooftops) are built by the cell modules and are excluded by construction.
        Millennium has its own band/elevator checks (093) but nothing asserting
        rendered-plank-vs-walk-surface. Decide whether `deckMeshes` tagging should
        reach into cells (the cell owns `walkable()`, so the guard's solidProbe
        path already works) and either tag them or record the exclusion in the
        tool header with a reason.
      - `Cafe Brauer`'s terrace + loggia arm floors are merged into the `gPave`
        pool and cannot be tagged individually; the south arm's tip reaches over
        the pond. Judge whether that is a real exposure.
      - Anything else the census turns up.
  (3) SANCTUARY DECK STEP RISE (found in passing, unverified): the top stair tread
  sits at h 1.72 and the deck at 2.30 — a 0.58 m rise, above the 0.5 m step-up
  threshold PITFALLS cites for the elevator class. Probe it; if the player cannot
  climb it, or can climb something they should not, fix the tread heights in
  `CH.SANCTUARY.deck.stairs`.
  (4) Everything stays green: walkprobe exits 0 including deck-coverage,
  no-solid-in-water, path-continuity, prop-clearance, shoreline-simple; zero new
  instanced buckets; draws <= 480 at affected waypoints; determinism unmoved;
  npm run build one artifact.
  (5) Judge the pier ends visually if you change their geometry — mt-dock-end and
  the Belmont pier waypoints, PNGs personally Read.
refs:
  - tools/deck-coverage.mjs (read the header first — the WARN block, the KNOWN
    allowlist, and the two inject snippets that re-prove the gate's teeth)
  - autopilot/issues/040-montrose-dock-fall-through-at-end.md (the class this
    closes the other half of)
  - src/data/chicago.js `deckRects()` / `DECKS` / `SANCTUARY.deck`
  - PITFALLS.md (the 128 block: three assertions, not one)
---

128 made the promise mechanical in one direction: every plank you can see
yourself standing on holds you. The other direction is still unguarded — and at
both ends of both piers there is half a metre of standable nothing hanging over
the lake.

Close the loop, then delete the escape hatch.
