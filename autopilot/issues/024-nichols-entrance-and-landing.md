# 024 — Nichols Bridgeway: blocked entrance + blind low-ceiling landing

- severity: high (both ends of the new bridge fail: you can barely get on,
  and at the top you can't see or find your way back)
- evidence: owner playtest 2026-07-12: "Nichols bridge has the hedges of
  the pavilion lawn overlapping with the beginning of it. Should be a
  clear entrance to the bridge. And at the top of bridge whatever platform
  that is, the ceiling is too low for me to see anything or even know how
  to get back down since i can't see where to get back onto the bridge
  again."
- observed: (a) Great Lawn hedge line runs across the bridgeway mouth;
  (b) the Modern Wing terrace landing has a roof/canopy so low the chase
  camera is buried — no view, no visible route back onto the bridge.
- expected: (a) the hedge line BREAKS at the bridge mouth with a clear
  paved approach (the real bridgeway rises off the Great Lawn's edge —
  check the 057 refs); (b) the landing opens up: raise/remove the low
  canopy so the camera has headroom (the bay-swing-camera lesson: never
  leave the chase camera inside geometry), give the terrace a sightline
  back to the bridge deck and a small wayfinding cue (railing gap, arrow
  plate) so the return route is legible at a glance; walk the full round
  trip lawn→terrace→lawn in act.mjs with shots READ at both ends.
- route: task 062, owner punch-list items (0c)/(0d).

## RESOLVED (062, 2026-07-12)

(a) The Great Lawn hedge now BREAKS at the bridge mouth: the west hedge run
stops at z=831 and the south run starts at x=120.5, leaving a clear gap with
a paved curb apron (x 118–121.3, z 827–833) leading onto the ramp. Decisive
shot 062-mouth-decisive2 read: open mouth, apron, deck rising beyond.
(b) The Modern Wing terrace canopy was raised from y14.9 to y18.1 (~3.7 m of
chase-cam headroom over the y≈14.3 terrace — the bay-swing-camera lesson),
posts re-lengthened to match, and the slab switched to self-lit bmat(0xe6e4dc)
after the raised toon slab read pea-green from below (ground-bounce pitfall).
Wayfinding: a 'BRIDGE TO THE PARK' plate with a drawn arrow at the terrace
rail gap (130.2, y14.35, 921.2) facing the arriving player; the railing gap +
deck sightline read in mp-nichols-f2. Round trip lawn→terrace→lawn verified by
the steering bot (up and down runs, done=true stalls=0) with shots READ at
both ends. Pier colliders under the deck are now height-gated
(collide(...,h=2.0)) so they can't pinch the elevated lane.
