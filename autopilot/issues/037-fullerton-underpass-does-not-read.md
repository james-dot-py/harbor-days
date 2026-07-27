# Issue 037 — the Fullerton underpass does not read as an underpass from either side

- **Reported by:** owner playtest 2026-07-26 (with screenshot)
- **Area:** lincolnpark
- **Severity:** HIGH — this is the front door to the neighborhood and the marquee
  fix of task 120 (issue 035). The mechanic works; the *reading* does not.
- **Owner's words:** *"neither side of the fullerton underpass looks like there's
  an underpass there."*
- **Evidence:** `refs/inbox/owner-2026-07-26-fullerton-underpass.png`
- **Routed to:** task 124.

## What the screenshot shows

The player stands on the approach walk facing the berm. What is visible is a stack
of flat slabs — a grey slab in front, two tan/beige slabs stepping back and up —
reading as a **low wall or loading dock, not a tunnel**. There is no legible portal
mouth: no dark opening, no arch or lintel, no depth cue, no lit interior, nothing
that says "the path continues under the road." The walk simply meets a wall.

Two turquoise/cyan patches sit at the base of the berm on the left and right, at
ground level, in a palette that matches nothing else in frame — suspected water
plane or an unlit face showing through where the portal cheeks should be.
**Check this first:** task 120 clipped `WATER_S` out of the trench with a
`livingWaterMat` clip + `customProgramCacheKey`; the clip may not hold at this
view/angle, or the portal cheeks may be missing their inner faces and showing the
water plane behind.

## Why 120 passed anyway

120's judged waypoint set (`lp-underpass`, 4 framings) was authored around the
underpass *interior and the west ramp* — it proved you can walk through, that the
berm is solid end to end, and that the chase cam ducks under the soffit. Nothing in
the set framed **the approach from a distance on either side**, which is the only
view the player actually gets first. Classic coverage gap (the 080 blind-spot
precedent): the fix was verified from inside the thing being fixed.

## Fix direction (details in task 124)

The portal must read as an opening from a normal walking approach on **both** the
north and south sides: a real mouth with depth, a lintel/headwall above it, cheek
walls with visible thickness, interior falloff that is dark but not black, and
enough contrast against the berm face that it reads at distance. Then add judged
waypoints at the *approach* distance on both sides so this can never pass blind again.

## RESOLVED — task 124 (2026-07-26)

Two root causes, both found by standing where the owner stood (both sides
reproduced first):

1. **The cyan patches** were the `WATER_S` plane showing through the two
   berm-gap corner slots (z 653–654.3 / 667.7–669, x 0–14) where no ground
   exists: the berm splits at z 653/669 but the trench walls start at z ~654.3
   and 120's water clip stopped at z 653.8/668.2 — 0.8 m short on each side.
   Fixed twice over: the clip now covers the full berm gap (z 652.6–669.4) and
   the new headwall shoulders physically seal the slots to y −0.8.
2. **The no-read was the LAWN, not the portal detail**: both LP land
   ShapeGeometries rendered at y0 straight OVER the sunken cut (the 041
   grade-carpet law, lawn edition), so from any approach the ramps and mouth
   sat under unbroken turf — 120's framings all stood inside the cut and never
   saw it. The trench is now NOTCHED out of both LAND polygons (data module, so
   engine + walkprobe + render inherit), and both faces carry above-grade
   portal furniture in the Belmont/Addison idiom: headwall + pale coping,
   corner pylons with lantern globes, outward-canting tapered wing walls, warm
   jamb lamps, and a dark throat (under-deck walls/floor + a header collar
   inside each mouth) so the opening reads as a shadowed, lantern-lit mouth.

Sides note: the passage runs E–W (the berm/Drive run N–S here), so the two
approaches are EAST (lakefront) and WEST (park) — the judged waypoints are
`lp-underpass-approach-e` / `lp-underpass-approach-w` (the issue's "north and
south" wording named the same two sides). Each has a DEFAULT-chase-camera f0 at
walking distance plus oblique and 35–40 m framings, expectations authored —
the underpass can no longer green from inside the tunnel. Run of record
`tools/shots/run-ms2iv2j2` (10/10 met, 0 errors, max 308/480 draws).
