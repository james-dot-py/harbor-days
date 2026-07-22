---
id: 115
area: lincolnpark
type: build
turns: 120
title: Zoo HABITATS — the supporting cast: 4-6 more habitats that read, farm barns, habitat plates
acceptance: >
  The zoo fills out from armature to alive, per the BRIEF's ranked animal
  cast (110's ruling — do not re-derive the cast). (1) Build 4-6 more
  habitats from the ranking, each a small readable diorama on the campus
  loop: strong candidates per the refs — penguin cove (huddle + one
  mid-waddle), the polar bear tundra (white chunky bear on pale rockwork
  + a plunge pool), the snow-monkey forest (rockwork + one grooming
  pair), flamingo lagoon (pink cluster, one-legged), and FARM-IN-THE-ZOO
  at the campus south per 111's coords (the red gambrel BARN is the read
  — cow/goat/chickens in a paddock, split-rail fence). Every animal
  chibi-chunky (PITFALLS: small toon animals don't read at zone
  distance), placed CLUSTERED at each habitat's viewing edge, pack-owned
  meshes on the NPC cull register (>145 m) — never global instanced
  buckets. Idle motion per habitat (a waddle, a head turn, a tail flick —
  cheap transforms, no per-frame allocation). (2) Each habitat gets its
  name plate (back-to-back FrontSide pairs; de-branded names per
  RENAMES.md — donor person names stay real) and honest fencing/rails
  reusing POSTS/RAILS + existing fence vocab (zero new InstancedMesh
  buckets). (3) The campus loop path connects all of them with no dead
  ends; walkability + walkprobe rules/expects exit 0; yards carved per
  the anti-trap law. (4) DETERMINISM: spawn shot ≈noise vs baseline;
  LOCAL seeds; no shared-rng draws. (5) PERF: draws ≤480 at every zoo
  waypoint (re-check lp-seal-pool and lp-zoo-gate too — this task adds
  the most meshes of the pipeline; if a view busts, thin the herd, never
  the fences). (6) WAYPOINTS: lp-zoo-loop (a habitat-lined stretch of the
  loop) + lp-farm (the red barn + paddock) wired with the BRIEF's
  authored strings; `node tools/walkthrough.mjs --ids <affected>` green,
  every PNG personally Read and judged against expectation + refs.
  (7) `npm run build` one artifact; zero console/page errors; canary
  echoes.
refs:
  - refs/lincoln-park/BRIEF.md (the animal-cast ranking + habitat coords)
    + refs/lincoln-park/ imagery (barns, penguins, tundra, flamingos)
  - GEOGRAPHY.md Lincoln Park section (111 finals)
  - The 114 campus build (the armature + the animal-rig register this
    task extends — reuse its animal helper, don't fork a second one)
  - RENAMES.md, PITFALLS.md (animals read chunky + clustered; distance-
    cull sign flip — sanity-check every pl.z cull against GEOGRAPHY signs;
    instrument live counts BEFORE tuning when content won't render)
---

Volume task with one taste rule: each habitat is a POSTCARD, not a
checklist row. One strong silhouette + one motion beat per habitat beats
species count. The farm's red barn is the second-biggest architectural
read of the zoo after the Lion House — give it the full gambrel profile.
Budget discipline matters most here: this is the meshiest task of the
pipeline, and the seal-pool view must not regress.
