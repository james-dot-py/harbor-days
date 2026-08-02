---
id: 128
area: montrose
type: polish
model: opus
turns: 90
title: You fall in the water walking to the end of the Montrose dock (issue 040) + a permanent deck-coverage guard
acceptance: >
  Owner playtest 2026-08-02: "at the dock approaching montrose harbor I fall in when
  I try to walk to end." A walkable timber dock is rendered longer than its walk
  surface, so the player walks off the end of the world and into the lake. This is
  the fall-through class the owner already ruled on ("shouldn't be able to get stuck
  anywhere", 097) and the issue-017 class (hard cells must never reach the jetski
  fallback).
  (1) REPRODUCE FIRST. Owner screenshot:
  refs/inbox/owner-2026-08-02-montrose-dock-fallthrough.png (file it to
  refs/montrose/ with source: "owner"). It shows a timber dock — orange plank deck,
  round-topped railing posts, handrail — running out over harbor water and meeting
  the stepped block seawall, lawn and gulls behind, a black mooring bollard on the
  wall edge. Identify WHICH dock that is in the data, drive tools/act.mjs out along
  it to the end, and capture the fall. You must have the drop on disk before fixing.
  (2) ROOT-CAUSE IT, do not guess. Ranked suspects in the issue: walk rect shorter
  than the rendered deck; a segmented deck where only some pieces carry walk rects
  (the seawall-junction seam is where the owner stood); surfaceY mismatch so he steps
  past the top face; or an engine/walkprobe FORK where the probe checks a different
  definition than the engine provides. State the actual cause in your result summary.
  (3) FIX IT AT THE DATA LAYER. The walkability definition lives in the data module
  shared by the engine and tools/walkprobe.mjs — never fork the two (named pitfall).
  The deck must hold the player over its whole rendered extent, with the railing
  doing the stopping at the end, not a hole. If the player CAN reach the end and
  step off deliberately at an open edge, that must be a survivable, sensible fall
  (the water is right there) — never a surprise mid-deck drop.
  (4) THE PERMANENT GUARD — this is the real deliverable. Author a mechanical check
  (tools/deck-coverage.mjs or an added walkprobe category, your call) asserting that
  EVERY rendered walkable deck/pier/boardwalk's walk surface covers its full rendered
  footprint minus authored railings/parapets — i.e. no rendered plank you can stand
  on visually but not physically. Wire it into the standing gate so it runs every
  task. walkprobe 1729/0 and the 097 audit both passed while this dock was broken
  because nothing asserted "the deck holds you all the way to its end"; close that
  measurement gap for good.
  (5) JUDGED WAYPOINT at the dock end (mt-dock-end) with an authored expectation,
  framings that show the deck end and the water beyond, PNGs personally Read.
  (6) walkprobe exits 0 including the new category; permanent guards stay green
  (no-solid-in-water, path-continuity, anti-trap); local seeds; zero new instanced
  buckets; draws <= 480 at affected waypoints; npm run build one artifact, zero
  console errors. Montrose is SIGNED OFF (076) — extend its waypoint set rather than
  re-running a full §5.2 sign-off.
  (7) If the new guard finds OTHER decks failing citywide, do NOT fix them all here:
  fix this dock, ship the guard, and file the sweep as its own task (130) with the
  failing list attached.
refs:
  - autopilot/issues/040-montrose-dock-fall-through-at-end.md (report + ranked
    suspects — read first)
  - refs/inbox/owner-2026-08-02-montrose-dock-fallthrough.png
  - src/data/chicago.js (Montrose harbor basin + finger docks; mtBasinWestLine, the
    flush sheet-pile seawall note "docks INSIDE the harbor", THE_DOCK beach bar is a
    DIFFERENT thing — do not confuse them), src/structures.js (dock/pier geometry),
    tools/walkprobe.mjs (the shared walkability contract)
  - task 097 walkability/stuck audit (the engine-level stuck fix + flood-fill
    reachability) and issue 017 (fall-through-to-jetski holes)
  - PITFALLS.md (walkability must not fork between engine and walkprobe)
---

The owner walked out on a dock — the single most inviting thing you can do at a
harbor — and the game dropped him in the lake.

Everything green: walkprobe 1729/0, the stuck class closed at the engine, a
citywide audit passed. And a rendered deck still had nothing under its far end,
because no gate has ever asserted the simplest promise a walkable surface makes:
**if you can see yourself standing on it, it holds you.**

Fix the dock. Then make that promise mechanical.
