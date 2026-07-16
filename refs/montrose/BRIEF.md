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

---

# SCOUT ADDENDUM (task 067, 2026-07-16)

067 ran AFTER the Fable outage unparked it, i.e. after 069–075 shipped. This
addendum fills what the emergency 069 mini-scout skipped: **fetched imagery with
a license manifest (was entirely missing), the measured east-reach provenance
(now in `osm.json` → `provenance.scout067`), the plover record, and the DRAFT
expectation strings for 071's two unauthored waypoints** (`mt-hedge`, `mt-point`
— the only planned mt-* ids absent from tools/waypoints.expect.json).

## Imagery (manifest.json, 26 images, all personally Read; Wikimedia, clean licenses)

Coverage: sanctuary entrance gateway (winter + summer), the Magic Hedge
interpretive sign + path, Point meadow-to-skyline views (summer/autumn), harbor
mooring field + docks + sailing class, the breakwater pier + the harbor entrance
light, Montrose Beach (dusk + panorama), dunes (fog morning, rope signs), piping
plovers (Monty ×4, Rose ×2, monitoring ×2), hedge birds (yellow-breasted chat ×2,
downy woodpecker, warbling vireo, grackle).
**Honest gaps (Commons has nothing usable):** Cricket Hill (any angle), the
beach house building, The Dock bar, Park Bait's storefront, aerial of the hook
curl. One junk result (Montrose SCOTLAND dunes, geograph.org.uk) was pruned from
disk + manifest. refs/inbox/ was empty this task.

## What the refs correct/teach (071 + 076 must know)

- **The sanctuary entrance is NOT a small brown plaque** (the 067 task text
  guessed wrong): it is a weathered **timber gateway** — two posts + a header
  beam with **MONTROSE POINT BIRD SANCTUARY routed in chunky YELLOW letters**,
  flanked by split-rail fence, plus a dark rules board ("Open from dawn to
  dusk") on the right jamb. Winter and summer photos agree.
- **"The Magic Hedge" text lives on a separate cream interpretive panel**
  ("The Magic Hedge — A migrant magnet", Chicago Park District) on a single
  wood post beside a **crushed-limestone path with white-rope-and-post
  fencing**. Its history text: honeysuckle row planted along a U.S. Army
  barracks fence (1950s missile/radar site); the Army left ~1970, the
  honeysuckles stayed; birders watched migrants diving in and out "like magic".
  The hedge was later enlarged with serviceberry, chokeberry, sumac, viburnum.
  071's sign work should use BOTH: gateway = entrance hero, panel = the name.
- **The harbor entrance light is white with RED HORIZONTAL BANDS + red lantern
  cap** on a dark stone plinth (not plain white/red-cap); it stands at the end
  of a pier edged in **rusted steel sheet-pile under a pale concrete cap** with
  rope-and-stanchion railing. (Shipped 070 light is close; the band is the
  missing likeness note if 076 wants one.)
- **Marina texture:** rust-red steel gangways with grated decks to floating
  docks (not wood); mooring cans in white/blue; Canada geese paddle the basin
  between hulls. Seawall = dark steel bulkhead with lawn straight to the edge.
- **Meadow palette:** straw + green prairie grasses, goldenrod/yellow composite
  drifts, purple asters (autumn), against deep-blue open lake; the downtown
  skyline reads SOUTH across the water from every Point clearing; the
  **north backdrop is the Edgewater/Uptown high-rise wall** rising over the
  beach (fog photo shows it floating above the lake fog).
- **Dune rope lines carry small laminated placards** ("Fragile dune habitat —
  Please stay on paths", blue on white, Park District seal) zip-tied at posts —
  a cheap likeness prop 076 could note for polish.

## DRAFT waypoint expectations (final judgeable strings — 071 pastes these)

- `mt-hedge` (stand ON the Point, camera into the hedge clearing): "A long
  dense hedgerow runs the meadow like a green wall, with birders at its gaps —
  tripod scopes and binoculars aimed into the shrubs; chunky bright songbirds
  perch in the near clearing; a cream interpretive sign on a wood post stands
  beside a pale crushed-stone path with white rope-and-post lines; past the
  meadow, open lake to the horizon."
- `mt-point` (the Point tip meadow, camera SE over the water): "An open prairie
  meadow on a point over the lake: tall straw-and-green grasses with yellow
  wildflower drifts inside rope-and-post lines, scattered low tree clusters,
  and the downtown skyline rising far to the south across open water; below to
  the southwest, the hook's stone arm and its red-banded entrance light."
- Optional third (071's call): `mt-hedge-gate` (the timber entrance): "A
  weathered timber gateway spans the sanctuary path — MONTROSE POINT BIRD
  SANCTUARY in chunky yellow letters on the header beam, split-rail fence at
  its flanks and a dark rules board at the jamb; beyond it the path curves
  into meadow and hedge."
- The other nine mt-* strings shipped with 069/070/072/073 and already live in
  tools/waypoints.expect.json (arrival, trail, gate, harbor, baitshop, hook,
  beach, dunes, dock, crickethill-base/-summit); 075 judged them met.

## REGISTER: the Hedge must read DISTINCT from Jarvis (071 acceptance)

Jarvis (shipped) = an ENCLOSED secret-garden room: hedge walls around you,
intimate clearings, bird bingo, soft interior scale. Montrose = the OPPOSITE
composition: **open sky and lake horizon with ONE hedge line as the focal
wall**; the energy is scopes-and-rarities (devotees clustered at gaps, sprint-in
buzz), not quiet discovery; scale is prairie-open with the skyline far south.
No bingo duplication; the Nike missile-site history is one sign/NPC aside.

## PLOVER RECORD (the real story, for the permanent file)

Monty & Rose (named for Montrose) nested at the **Montrose Beach Dunes**
2019–2021 — the first piping plovers to nest in Chicago in ~70 years; the 2019
nest famously canceled the Mamby on the Beach festival. Chicks fledged 2019–2021
include **Imani**, who returned to the dunes from 2021 on and, with **Searocket**
(hand-reared, released at Montrose 2023), fledged chicks from 2023 onward
(Nagamo et al.) — an ongoing multi-generation Chicago story with volunteer
monitors on morning watch (see the two monitoring photos). Ruling already made
and shipped (069 §PLOVER TENSION, GEOGRAPHY.md standing liberty, 072 build):
the canonical pen is the DUNES; the Belmont dog-beach "Monty & Rose" pen stays
a recorded local homage. 067 concurs; nothing to relitigate.

## Signature landmarks, RANKED (unchanged from the 069 plan; refs confirm)

1. **The Magic Hedge + Montrose Point** (071, the one still unbuilt) — hero.
2. **Montrose Harbor + the HOOK + entrance light** (070, shipped).
3. **Cricket Hill** (073, shipped).
4. **Montrose Beach + dunes + beach house + The Dock** (072, shipped).
5. Park Bait (070/074, shipped) — texture, not silhouette.
