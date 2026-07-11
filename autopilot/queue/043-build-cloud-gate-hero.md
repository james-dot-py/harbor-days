---
id: 043
area: millennium
type: build
model: fable
title: THE BEAN — Cloud Gate homage on AT&T Plaza (the signature-landmark hero build)
acceptance: >
  The single most recognizable object in Chicago reads instantly, in house
  toon style, as a playful HOMAGE (owner register: evoke, never replicate —
  Cloud Gate is a copyrighted artwork; same register as the bar likenesses):
  (1) A chunky toon bean at the 040 AT&T Plaza position — 1:1 object scale
  in the real ballpark (~20 m long, ~13 m wide, ~10 m tall), a squashed
  torus-ish lozenge with the walk-under OMPHALOS arch; hand-modeled
  (lathe/sphere-derived BufferGeometry through toon()/bmat() so the world
  curve applies — NEVER an imported mesh). (2) The mirror finish is PAINTED,
  not computed: a canvas-texture wrap of stylized reflection — sky gradient
  above, an upside-down Michigan Ave streetwall silhouette band at the
  waist, warm plaza + tiny toon figures below, following the house
  art-director palette (dusk fog 0xf6ab84). No CubeCamera/envMap (perf; and
  the painted read IS the homage register). If the canvas wrap fights the
  toon ramp, bmat with a lightened palette is acceptable — judge by the
  screenshot. (3) The plaza stays walkable UNDER the arch (walkableM already
  covers it per 040 — verify walkprobe expects pass THROUGH the arch line);
  the bean's two ground-contact lobes get colliders so the player walks
  under the arch, never through the shell. (4) Dressing: the AT&T Plaza
  pavers, a modest 'THE BEAN' etched ground plate or low plinth sign (the
  journal owns the "Cloud Gate — everyone calls it the Bean" blurb; keep
  in-world signage minimal like the real thing), 3-5 posing NPC visitors
  (makeNPC, phone-up selfie poses, bump lines in voice — the CROWD gag
  itself belongs to 047). (5) Waypoints: the mp bean waypoints (north
  approach with the streetwall behind, the under-arch shot, the
  McCormick-terrace read) judge GREEN against their 040 expectations from a
  fresh scoped walkthrough, every PNG personally Read, judged against
  refs/millennium-park/ and the /art-director bar ("would a Chicagoan
  recognize this instantly?" — for this object the honest answer must be an
  unqualified yes). (6) Draw calls <= 480 at every mp waypoint (the bean
  shell is ONE mesh + one or two dressing meshes); zero console errors;
  baseline.png intact (local seed only); single-file build.
refs:
  - refs/millennium-park/BRIEF.md + osm.json (position truth) + any owner
    photos in refs/millennium-park/ (gold standard if present)
  - GEOGRAPHY.md MILLENNIUM_GEOGRAPHY (AT&T Plaza coords, homage register)
  - .claude/commands/art-director.md (the acceptance question)
  - src/wrigley/stadium.js (precedent for a hand-built hero BufferGeometry
    with uv attribute — PITFALLS: hand-built strips need uv or the merge
    pool silently drops the color bucket)
  - PITFALLS.md (close/low framings for vertical reads; camera-inside-
    geometry trap — the arch shot needs a SHORT dist framing)
---

The hero build — this is why Fable is on it. The bean must be the park's
gravity: every waypoint that can see it should want to look at it. Get the
SILHOUETTE right first (the low fat lozenge with the pinched underbelly
arch — screenshot it against the dusk sky and squint), then the painted
reflection band, then the plaza life. The reflection is the joke and the
love letter: an upside-down toon Chicago painted onto a toon Chicago object.

Taste guardrails: no photoreal chrome, no player reflection (impossible and
off-register), no plaque calling it Cloud Gate (the journal does the
honest naming). If a first pass reads as "grey blob", the fix is silhouette
and reflection-band CONTRAST, not more geometry.
