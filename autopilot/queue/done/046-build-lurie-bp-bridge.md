---
id: 046
area: millennium
type: build
turns: 130
title: Lurie Garden + BP bridge — the secret garden and the serpentine overlook
acceptance: >
  The park's SE quadrant reads green and the bridge snakes east: (1) LURIE
  GARDEN per 040: the SHOULDER HEDGE — the big dark clipped hedge wall
  guarding the N + W edges (merged chunky topiary masses, the "big
  shoulders" wink recorded in the journal blurb), the SALVIA RIVER (a
  purple planting band sweeping the light plate), prairie/perennial masses
  (instanced tufts/wildflowers in 2-3 color buckets — one InstancedMesh per
  color, PITFALLS), the diagonal BOARDWALK with its water RILL seam
  (walkable per WALK_M; sittable edge like the sanctuary deck), entrances
  where the hedge breaks. Grade the interior quiet like the sanctuary if
  cheap (definePlace is the LAKEFRONT pattern; inside a hard cell just tint
  planting denser — do NOT invent a third place layer). (2) BP BRIDGE: the
  serpentine elevated deck leaving the Great Lawn's SE corner, S-curving
  east over the sunken Columbus Dr scenery cut — wooden deck plank ribbon +
  brushed-metal shingle PARAPETS (the Gehry skin — merged band geometry,
  not per-shingle), ramp-only access at both ends, deck edges fully
  enclosed by the parapets (PITFALLS: elevated walk rects adjacent to
  ground act as elevators via the 0.5 step-up threshold — only the ramps
  may connect levels; walkprobe expects prove on-deck, under-deck and
  edge-of-deck behavior). The east end lands at a hedge-and-gate overlook
  (Maggie Daley treetops painted into the east backdrop band) and turns
  back — a quiet closed gate, NO "future entrance" signage (task 030 owner
  rule). Columbus Dr below is scenery: roadway ribbon + sparse toon cars,
  never walkable. (3) The bridge CREST waypoint frames the money shot —
  pavilion ribbons + trellis + Michigan Ave cliff from above the parapet
  line (verify the parapet does not fill the frame; adjust stand/framings
  via gen-waypoints, add parapet volumes to VOLS_M). (4) The mp lurie +
  bridge waypoints judge GREEN against their 040 expectations from a fresh
  scoped walkthrough, every PNG personally Read. (5) Walkprobe exit 0;
  draws <= 480 at every mp waypoint (report census() — the parapet merge
  and planting buckets are the risk); zero console errors; baseline intact;
  single-file build.
refs:
  - refs/millennium-park/BRIEF.md + osm.json (bridge alignment, garden plot)
  - GEOGRAPHY.md MILLENNIUM_GEOGRAPHY
  - GEOGRAPHY.md sanctuary section + src/structures.js buildSanctuary (the
    planted-room + elevated-deck precedents to reuse)
  - PITFALLS.md (elevated-rect elevator bug; one InstancedMesh per color;
    instanced buckets under the cell root; close low framings for height
    changes)
---

Two builds that share a seam (the bridge springs from beside the garden),
one file owner each if delegating: garden vs bridge, with the seam
coordinates fixed by 040 before either starts.

The bridge is the walkability risk of the whole neighborhood — treat the
probe expects as the deliverable, not an afterthought: assert points ON the
deck at its crest height, OFF the parapet edges (not walkable), on both
ramps, and on the ground beneath the span (walkable ground, not deck
height). The garden is the atmosphere risk: if it reads as "flower bed",
raise the hedge walls and thicken the planting clusters around the
boardwalk sightlines first (the task-025 lesson: clustered reads beat
uniform density).
