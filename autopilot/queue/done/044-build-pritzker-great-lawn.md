---
id: 044
area: millennium
type: build
title: Pritzker Pavilion + Great Lawn + trellis — the Gehry ribbons over the lawn room
acceptance: >
  The park's NE quadrant reads as the concert room: (1) Pritzker Pavilion at
  the 040 position — the stage house with its exploding RIBBON headdress:
  8-12 curved brushed-steel petals fanning around the proscenium mouth,
  hand-modeled curved shells (merged into few meshes, uv attributes per
  PITFALLS, toon two-tone silver/warm-white so the dusk light reads), stage
  interior visible from the lawn (wood-toned shell, a few music stands /
  timpani silhouettes — the soundcheck GAG belongs to 047). The pavilion is
  a homage in the house register: capture the burst silhouette, do not chase
  panel-for-panel accuracy. (2) The GREAT LAWN south of the stage: walkable
  per WALK_M, mowed-stripe tint bands, scattered picnic blankets/towels +
  lounging NPCs (local seed), and the fixed-seating rows nearest the stage
  (instanced benches). (3) The TRELLIS: the criss-cross arc lattice over the
  lawn — thin tube arcs springing from paired posts, merged into ONE mesh
  (or one instanced set) — the overhead signature that makes the lawn a
  room. Verify no waypoint framing parks the camera inside an arc (PITFALLS
  hand-framing trap; add trellis posts to VOLS_M if needed). (4) The lawn's
  edge treatment per 040 (hedge/planter line, Lurie's shoulder hedge rising
  to the south — the pad for 046). (5) The mp pavilion/lawn waypoints judge
  GREEN against their 040 expectations from a fresh scoped walkthrough,
  every PNG personally Read, art-director judged (the money shot: from
  mid-lawn, ribbons + trellis arcs + streetwall behind — all three layers
  legible). (6) Walkprobe exit 0 (lawn + seating rows walkable, stage NOT
  enterable — visually gated, no dead stairs per the Diversey precedent);
  draws <= 480 at every mp waypoint; zero console errors; baseline intact;
  single-file build.
refs:
  - refs/millennium-park/BRIEF.md + osm.json (footprint truth — the pavilion
    may be an OSM relation; 039 confirmed it landed)
  - GEOGRAPHY.md MILLENNIUM_GEOGRAPHY (positions, lawn bounds)
  - refs/millennium-park/ Wikimedia photos of the pavilion + trellis
  - PITFALLS.md (merge-pool uv rule; instanced buckets under the cell root;
    camera clearance; small-geometry reads need close low framings)
  - .claude/commands/art-director.md
---

The second-biggest silhouette in the park. Build order that works: stage box
→ ribbons (get the burst silhouette against the sky from mid-lawn before
detailing) → trellis arcs → lawn life. The ribbons are the draw-call risk:
budget them as a handful of merged shells, not per-petal meshes; report
census() before/after.

The trellis is what sells the space — a lawn with an overhead lattice reads
as Pritzker even if the ribbons are imperfect. Do not skip it or fake it
with fog.
