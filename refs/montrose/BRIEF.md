# Montrose — BUILD-PLAN (v0.6 north growth)

Authored during **task 069** (the SHELL build). Tasks 067 (scout) and 068 (layout)
were parked after 3 failures each, so their finals never shipped; 069 derived the
layout inline (GEOGRAPHY.md § "Montrose" is the canonical output — read it first)
and this file is the determinism/build plan binding 070–076. `osm.json` (this dir)
is the geometry reference; `tmp-montrose-inspect.mjs` (repo tools/) dumps it in game
coords (`node tools/tmp-montrose-inspect.mjs summary|find <re>|geom <ids>|trace <id>`).

## Frame / anchors (cite these, don't re-derive)

osm **z IS the game z** (fetched 1:2, anchored to Belmont) — use it directly:

| Feature | osm z | game z |
|---|---|---|
| Irving Park Rd (golf's north / old map edge) | −800 | −800 |
| Montrose Ave (underpass gate) | −1208 | **−1207** |
| Montrose Harbor basin | −1090…−1304 | ~−1090…−1300 |
| Montrose Point Bird Sanctuary (Magic Hedge) | −1200…−1345 | ~−1200…−1345 |
| Wilson Ave | −1409 | −1409 |
| Montrose Beach Dunes Natural Area | −1308…−1506 | ~−1308…−1500 |
| Cricket Hill (comfort station) | −1312…−1326 | ~−1315 |
| Map north edge / north-cap hedge | | **−1516** (WORLD_CLAMP.zMin −1520) |

**x-frame — EAST-REACH COMPRESSION (standing liberty; 070–073 MUST honor).** osm x
is NOT the game x. In osm, LSD (N. DuSable LSD) drifts WEST going north (x ≈ −347 at
Irving → −393 at Montrose/Wilson) and the real east reach (harbor east breakwater,
Montrose Point) pushes past osm x 200 — which will NOT fit 1:2 inside `xMax` 244. So:
- Hold **LSD at game x 0–14** (the berm), as everywhere else on the map.
- Place each Montrose feature by **topological ORDER** (GEOGRAPHY.md §Montrose
  arrangement), COMPRESSING east–west distance to fit x 14…244. Do NOT map raw osm x.
- The 069 stub shore holds **x ≈ 231–237** (`montroseFx`, a smooth continuation of
  the golf revetment). 070 (harbor basin, WEST of the shore) and 071 (Point, pushed
  EAST toward xMax) reshape it; keep the Point's true east extent a recorded
  compression (order survives, distance squeezed).

## Determinism plan (bound into every Montrose build — the whole point)

069 grew the map with a proven-clean spawn shot (0.336% vs baseline ≈ 0.242% noise
floor). The rules that kept it clean, which 070–076 MUST follow:

1. **Coast pieces stay OUT of the shared `COAST_SEGS`** (props.js beach-life iterates
   it with the world rng — appending there moves every towel). New shore geometry is
   its OWN piece added to `QUERY_SEGS` (walkability) + `SHORE_SEGS` (water color), and
   rendered by FOLDING into the existing terrace/pile/face/wet-band buckets with a
   **LOCAL xorshift** (see coast.js `COAST_MTR_*`, the Montrose terrace fold, and the
   `openRuns` append — the COAST_TIP precedent generalized to 5 pieces).
2. **New ribbons via `pathSamples2` only** (merged after buildProps) — never reshape
   `TRAIL_MAIN`/`TRAIL_MONTROSE`'s existing points (pathSamples is phase-sensitive).
3. **All new scatter uses a LOCAL seed** (mulberry32/xorshift), never `rng`/`rand`.
4. **ZERO new InstancedMesh buckets.** They draw in EVERY view (frustumCull off) so
   each new bucket busts the game-wide ≤480 gate. Reuse existing buckets (terraces,
   piles, tufts, trees, towels, boats, fence posts/rails, globe lamps) whose counts
   may grow; fold one-off statics into the merge pool with colors already in it.
   069's stub added **+0 buckets** (folds) and **+0 draws to any existing view** (the
   north water plane is a lone frustum-culled Mesh, drawn only when the far north is
   framed). Any exception must be named + justified with its global draw cost.
5. **After the SHELL, baseline.png is FRESH** (069 regenerated it once via the
   canonical recipe — flake-calibration.json `play=1&quiet=1`/3500 ms, own port +
   canary, pill-free crop check, `[baseline-regen]` commit). 070–073 diff against the
   fresh baseline; they must NOT move bounds/minimap again (069 set the FINAL extent).

## Piece-swap contract (069 stubs → 070–073 replace, one at a time)

The stub shore is 5 SEPARATE consts in chicago.js so each build swaps one array
without touching the others (all local-xorshift → world determinism holds regardless):

| const (chicago.js `*_PARAMS`) | z range | Replaced by |
|---|---|---|
| `COAST_MTR_LAWN` | −800…−1088 | ships as the honest shore SOUTH of the harbor mouth (keep) |
| `COAST_MTR_HARBOR` | −1088…−1300 | **070** — carve the Montrose Harbor basin (a south-opening concave inlet WEST of x≈234; west-shore docks/launch + Park Bait). Model the basin as its OWN piece(s) out of COAST_SEGS, like the Belmont basin (BASIN_W seawall + finger docks). |
| `COAST_MTR_POINT` | −1300…−1362 | **071** — push Montrose Point EAST (toward xMax 244, compressed) and wrap the Magic Hedge / sanctuary onto it; the HOOK pier curls off the tip (a COAST_TIP-style horseshoe). |
| `COAST_MTR_BEACH` | −1362…−1500 | **072** — lay Montrose Beach sand (a beachH-style sloped cove) + the DUNES natural area at the SE, beach house, The Dock. |
| `COAST_MTR_CLOSE` | NE corner | the map-edge closure; keep unless the beach/Point reshape the corner. |

To replace one: edit its `*_PARAMS` (or swap the piece for a basin/beach builder),
keep it OUT of `COAST_SEGS`, re-add its segs to `QUERY_SEGS`/`openRuns`, mirror the
change in `tools/walkprobe.mjs` (the lakefront walkability is a hand-copied mirror —
keep it lockstep), and diff the spawn shot to confirm no world drift.

## PLOVER TENSION — RULING (068 question, resolved by 069)

The canonical Monty & Rose / Imani-generation piping-plover story lives at the
**Montrose DUNES** (072: a roped nest area at the beach SE, per the real reserve).
The already-shipped dog-beach "Monty & Rose" pen at the Belmont basin **STAYS as a
recorded liberty** (a local homage) — do NOT relocate or retire it, and do NOT
duplicate the dunes plovers onto the dog beach. Recorded under GEOGRAPHY.md standing
liberties.

## WAYPOINTS

**Shipped in 069** (gen-waypoints.mjs lakefront section + waypoints.expect.json):
`mt-arrival` (x175,z-812, north — "the map grew"), `mt-trail` (x205,z-1000, the dual
trail), `mt-gate` (x34,z-1207, the underpass portal). All lakefront lawn stands
(walkable via LAND); framings validated by 069's diagnostic shots.

**Planned for 070–073** (author the stand + expect together — gen-waypoints exits 1
on an expect id with no waypoint):
- 070: `mt-harbor` (the basin + moored boats), `mt-parkbait` (the shop), `mt-hook`
  (the hook pier off the Point).
- 071: `mt-hedge` (the Magic Hedge hero — birders + hedgerow; a stand ON the Point
  looking into the meadow), `mt-point` (the Point tip + hook + harbor light).
- 072: `mt-beach` (the cove + beach house), `mt-dock` (The Dock bar), `mt-dunes`
  (the dunes + roped plover area).
- 073: `mt-crickethill` (from the summit — the map's first walkable hill; a stand
  ON the mound, camera math per the beachH/analytic-surface precedent).

## Perf ledger (069)

Stub shell: +0 InstancedMesh buckets (Montrose terraces folded into the main coast
bucket; piles/faces/wet-band grow via `openRuns`; Lakeview band 2-pass keeps its 3
buckets; underpass portal + berm reuse the existing LSD meshes). North water = 1
frustum-culled Mesh (0 draws unless the far north is framed). The millennium worst
view is unchanged. 070–073 each have this same +0-bucket obligation; census the
worst view before adding any instanced content.
