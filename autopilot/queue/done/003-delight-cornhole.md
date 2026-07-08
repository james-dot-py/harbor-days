---
id: 003
area: lakefront
type: delight
title: Cornhole match on a south lawn (from the approved delight backlog)
acceptance: >
  An ongoing NPC cornhole match on an empty lakefront lawn spot (respect the
  dead-space rules: nothing within 6 m of ribbons/fences; probe walkable() at
  runtime like parklife does): two boards facing each other ~8 m apart, two
  posed-chibi players who alternate slow underhand tosses, a bag that ARCS
  with hang time board to board, occasional celebratory "bago!" toast/bump
  line (never queued in fast loops — PITFALLS.md toast rule), players ope on
  bump (registerBumpable). Pack module (local rng only, no shared-rng calls),
  ONE import line in src/packs/index.js (re-read immediately before editing).
  No new walkable surfaces (props only). Verified: /verify green, scoped
  walkthrough of the nearest waypoints READ, delight line moved from
  delight-backlog.md to DELIGHT-SHIPPED.md with the commit hash, gate green.
refs:
  - delight-backlog.md ("Cornhole boards with an ongoing NPC match")
  - src/packs/parklife.js posed-chibi + bump patterns; framework.js
    registerBumpable/toast
  - PITFALLS.md (toasts ~3 s; r128 instancing color buckets)
---

Small, self-contained, pure-delight pack: the Midwest yard game on the
lakefront, with the arc-and-thunk rhythm readable from the trail.
