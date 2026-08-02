# Issue 040 — you fall in the water walking to the end of the dock at Montrose harbor

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
