# Issue 040 — you fall in the water walking to the end of the dock at Montrose harbor

- **STATUS: CLOSED by task 128.**
- **Actual cause: suspect 1, but at the ROOT, not the tip — and nobody guessed
  the mechanism.** `MT_FINGER_DOCKS.x0` was 186 because that is what
  `mtBasinWestLine`'s CONTROL POINTS read (`[186,−681] [185,−724] [185,−788]
  [186,−850]`). The LAND polygon is built from the crChain-**SMOOTHED** chain,
  which at the four dock rows passes x **185.14 / 184.87 / 185.03 / 185.55** —
  so every deck rooted **0.45–1.13 m out over open water**, with a non-walkable
  moat between the lawn and the first plank. Walking east you stalled at the
  moat (a point-test step of ~0.07 m can never jump it), `jsk.wadeT` banked for
  0.35 s, and the wade rule walked you into the basin: a 2.4 m drop. The deck
  was **never reachable on foot at all**. Reproduced before any fix
  (`tools/tmp-128-repro.mjs`): engine profile `x176.0-184.8 WALK · x184.9-185.9
  no · x186.0-201.0 WALK`, and a real steering walk that stalls at x=184.87 and
  drops to y=−1.51 by x=185.67.
- **Suspect 4 was also true, in its silent form:** `tools/walkprobe.mjs` built
  its walk rects by MIRRORING the props.js formulas and simply **omitted
  MT_FINGER_DOCKS**. 1729/0 green never once asked whether these planks held the
  player. Both sides now read `CH.deckRects()`.
- **Fix:** root moved to x183.4 (inland of the smoothed edge at every row, ≥1.4 m
  of deck resting on the grass), `len` 15 → 17.6 so the tip stays at x201; the
  piling gate now keys on the measured shore (`MD.shoreX`) instead of the literal
  186, and knob+rail run the full length so the handrail no longer starts a third
  of the way out. Plus an engine rule: **you never wade off a deck** — standing
  on a walk rect no longer banks `wadeT`, so a deck edge stops you and SPACE off
  the end is the deliberate, survivable way in.
- **The permanent guard:** `tools/deck-coverage.mjs`, walkprobe's 6th shell-out.
  It raycasts every RENDERED walkable plank in the live game (15 tagged decks)
  and asserts (A) every interior plank cell is walkable, (B) surfaceY matches the
  rendered top face within 0.3 m, (C) the deck is reachable from real ground by a
  0.2 m BFS. 040 would have failed A *and* C.
- **Reported by:** owner playtest 2026-08-02 (screenshot)
- **Area:** montrose
- **Severity:** HIGH — a walkable structure that dumps the player into the lake.
  This is the fall-through class the owner already ruled on ("shouldn't be able to
  get stuck anywhere", task 097) and the issue-017 class ("hard cells must never
  reach jetski fallback").
- **Owner's words:** *"at the dock approaching montrose harbor I fall in when I try
  to walk to end."*
- **Evidence:** `refs/inbox/owner-2026-08-02-montrose-dock-fallthrough.png`
- **Routed to:** task 128.

## What the screenshot shows

A timber dock — orange plank deck, round-topped railing posts, a handrail — running
out over harbor water, meeting the stepped sheet-pile/block seawall with the lawn
and gulls behind it and a black mooring bollard on the wall edge. The player is at
the junction end. Walking out toward the end of the deck drops him in.

The deck is *rendered* out to its full length; the **walkable surface evidently is
not**. Classic mismatch between rendered geometry and the walk data.

## Ranked suspects (diagnose, do not guess)

1. **The walk rect is shorter than the rendered deck** — an off-by-a-few-metres on
   the far end, so the last stretch of visible planking has no walk surface under it.
2. **Segmented deck, partial coverage** — the dock is built from several pieces and
   only some carry walk rects (the seam near the seawall junction is the likely gap,
   and it is exactly where the owner is standing).
3. **surfaceY mismatch** — walk surface exists but at the wrong height, so the player
   steps off the deck's top face and falls past it.
4. **Fork between engine and walkprobe** — the deck's walkability is defined in one
   place and the probe checks another, so the probe "passes" a surface the engine
   never provides. **This is a named pitfall: walkability must live in the DATA
   module shared by the engine and `tools/walkprobe.mjs`.**

## Why the gates missed it

walkprobe passes at 1729/0 and the 097 audit closed the *stuck* class (colliders,
islands, reachability). None of that covers **"the rendered deck extends past its
own walk surface."** A player walking a pier to its end is the most natural thing in
the world and no gate asserts that the deck holds him the whole way. That is the
measurement gap task 128 has to close, not just this one dock.
