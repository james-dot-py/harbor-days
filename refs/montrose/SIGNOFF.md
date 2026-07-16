# Montrose (harbor · Point · beach · Cricket Hill) — §5.2 SIGN-OFF

- Date: 2026-07-16 (task 076, autopilot)
- Walkthrough of record: ONE fresh full run `node tools/walkthrough.mjs --area montrose`
  → run `mro0rpja` (own vite, canary echoed on every shot): **14 waypoints × 3
  framings = 42 shots, 0 console/page errors, 0 canary misses, 0 mechanical
  failures.**
- Contact sheet: `tools/shots/run-mro0rpja/contact-sheet.png`
- World state signed off: the 067–075 stretch plus this task's issue-026 fix
  (commit `e4a4d55` — basin marina read; see below). No other Montrose code
  changed since 075.

## §5.2 checklist

1. **Every waypoint's authored expectation judged MET** — yes; per-waypoint
   verdicts below, every PNG personally read in the orchestrator transcript
   (42 run shots + canary + contact sheet + 7 fix/diag shots + the contiguity
   end shot + verify-spawn).
2. **Standing gate green** — walkprobe **720/720**; single-file build
   `dist/index.html` 1,496.10 kB (gzip 473.41 kB), exactly one artifact;
   canonical spawn shot diffs **0.238%** vs baseline.png (gate 0.828%, noise
   floor ~0.24%) — world determinism held through the 026 fix; **max 348 draw
   calls** (mt-hedge-f2), every mt waypoint ≤ 480.
3. **Walkprobe covers every new walkable surface** — named sections per piece:
   the trail extension + new lawn + revetment top (069 ×5, incl. berm/map-edge
   negatives), the harbor basin carve + the HOOK mole end-to-end + the west
   shore (070 ×3), the Point (071 a–l: live bulge, neighbor joins, waypoint
   stands, both sanctuary ribbons, bulge terraces stepping down seaward,
   open-water negatives, join seams, hedge gaps + loop connectivity, birder
   spots, CR-sampled prop-vs-ribbon clearances, meadow interior), the beach
   sand + roped dune interior negative + waterline slope + beach-house block +
   Dock deck (072 ×3), Cricket Hill slope/summit monotone dome + trail
   clearance (073 ×3). Exit 0.
4. **≥3 shipped delight moments logged** (DELIGHT-SHIPPED.md, verified present
   at their commits) — **12 for the area**: WALK OUT ON THE HOOK (070 at
   `e80a879`), BIG SAND / PLOVER DUNES / THE DOCK (072 at
   `66ec1b6`), CLIMB CRICKET HILL (073 at `cbbc956`), FLY A KITE / OFF THE
   HOOK fisherman / PARK BAIT CRICKETS / MONTY & ROSE (074 at `6c5b188`),
   MAGIC HEDGE GREETS YOU / BIRDERS ON THE HEDGE / INTO THE MAGIC (071 at
   `d60daae`). The four 074 lines verified verbatim via
   `git show 6c5b188:DELIGHT-SHIPPED.md`.
5. **Evocation review PASSED** — ONE fresh-eyes subagent, no build context,
   staged: phase 1 = ONLY the anonymized contact sheet (`tools/evoc-prep.mjs`
   neutral shot-NN labels, no refs, no waypoint ids). Full transcript below.
   Phase-1 blind answer: *"Chicago, Illinois — the Montrose Harbor / Montrose
   Point area of the north lakefront"*, naming unprompted: Montrose Harbor +
   its breakwater, **Park Bait**, Montrose Beach + beach house, **The Dock**,
   **Cricket Hill**, and **the Montrose Point Bird Sanctuary, a.k.a. "The
   Magic Hedge"**. Confidence: **"Unmistakable."** Phase 2 (refs/montrose/
   comparison): *"Yes — the match is strong and my Phase 1 identification was
   correct in full … the sequence Harbor → Park Bait → Beach/The Dock →
   Cricket Hill → Magic Hedge mirrors the real geography."*

## Issue 026 resolved this task (the basin marina read)

075 deferred "foam-blob" patches on the basin water. Root-caused and fixed
here (commit `e4a4d55`), three stacked causes: (1) sailboat hulls floated
flush with the water (centre y 0.05) and read as white lily-pads — freeboard
raised + a dark waterline band added as a second instance in the SAME
InstancedMesh (+0 draw calls, rng order untouched); (2) the ~31 m basin sat
entirely in the 0–14 m beach-shallows color band because its three bulkheads
fed SHORE_SEGS — excluded from the water-COLOR field only (Belmont's
deliberate greener-harbor walls kept; walkability untouched); (3) the north
water plane shipped frozen (uTime never ticked, a 069 shell holdover) — now
ticked beside the main plane. Verified at mt-harbor f0–f2 in the run of
record; Belmont field re-checked (076-belmont-moor.png), no regression.

## CONTIGUITY — one uncut walk, Belmont Rocks → Montrose Beach

`tools/tmp-contiguity-bot.mjs` (single page load, real input path, joy.len 1
= RUN): **PASS** — the whole tall map south→north in one go, following
TRAIL_MAIN → TRAIL_MONTROSE → the beach's west sand strip around the roped
dune. 9,553 frames, **0 stalls** (no seam, wedge, or collider freeze
anywhere on the ~1.7 km route), **jetski never mounted** (no hidden water
gap), y flat (no elevator pops), 0 errors, canary echoed. End shot
`tools/shots/076-contiguity-end.png`: the mayor on the beach sand at THE
DOCK, the minimap showing the FULL tall map with the marker at the far
north — the minimap reads the whole v0.6 map sanely.

## Per-waypoint verdicts (run mro0rpja)

| Waypoint | Verdict | Notes |
|---|---|---|
| mt-arrival | MET | Lawn unbroken north from the old z-812 fence line — no hole/seam/wall; dual trail east, hazy Lakeview backdrop west; barren-shell emptiness is by design |
| mt-trail | MET | Both ribbons (asphalt + yellow dashes, crushed limestone beside) continuous to the horizon both directions; lawn flanks, lake east; distant entrance light reads through the haze |
| mt-gate | MET | Voussoir arch over the dark recessed door, lantern jambs, hedge gap aligned to the mouth, berm fence, brick backdrop; no gag sign |
| mt-harbor | MET | Post-026-fix: sheltered blue water contained by the sheet-pile walls, white hulls riding proud with waterline shadows + masts, star-dock rosettes, finger docks, the hook + red-capped light (f1), the mole fisherman silhouette |
| mt-hook | MET | Mid-pier looking south: stone promenade, fishing rail on the harbor side, terraces stepping down to open lake east, the curl reaching the red-capped light; walkable, not a floating slab |
| mt-baitshop | MET | Pitched-roof shack, legible PARK BAIT sign (not mirrored), warm windows, the cricket cooler + "peek in the cooler" prompt live |
| mt-beach | MET | Broad pale sand opens down the length, gentle waterline, umbrellas/towels/beachgoers, Beach House with rounded solarium prow + terracotta roof + rooftop rail + legible sign |
| mt-dunes | MET | Rope-and-post line, legible PIPING PLOVER NESTING AREA sign (+ "please keep out"), tufted mounds set apart, plovers read as small pale birds; Cricket Hill kites in f1's background |
| mt-dock | MET | Raised wood deck grounded on sand, teal awning, legible THE DOCK sign, string-light glow, L-bar counter, umbrellas + milling NPCs |
| mt-crickethill-summit | MET | Genuinely elevated: basin + mooring field + mole + Park Bait's roof lie below; kite strings rise out of frame; camera in clear air |
| mt-crickethill-base | MET | Mound blends seamlessly into the lawn (no cliff/terrace); three crest flyers, red/yellow/blue diamond kites aloft with bow tails; slope tufts |
| mt-hedge | MET | The hero: continuous hedge WALL with birder windows, devotees at the gaps (binocs + tripod scopes), chunky songbirds (goldfinch, oriole, cardinal, jay), legible cream "The Magic Hedge — a migrant magnet" panel, crushed-stone path + white rope lines, open sky + lake horizon — distinct from Jarvis's enclosed room |
| mt-point | MET | Prairie texture (straw cones, goldenrod drifts, purple asters) inside the low rope line, low tree clusters, open-lake horizon; the hook's stone arm reads through the haze in f1 (near half, per the far-plane physics ruling) |
| mt-hedge-gate | MET | Two heavy timber posts + header beam, MONTROSE POINT BIRD SANCTUARY legible in yellow, Cardinal greeter on the beam, dark "Open from dawn to dusk" rules board, split-rail flanks, path passing under. (f0 carries one transient drifting blossom petal near the lens — ambient particle, not a world defect) |

## Evocation transcript (fresh-eyes subagent, 2026-07-16)

### Phase 1 — blind, anonymized contact sheet only (verbatim)

> **WHERE IS THIS?** This is **Chicago, Illinois — the Montrose Harbor /
> Montrose Point area of the north lakefront** (Uptown/Lincoln Park, at the
> foot of Montrose Avenue on Lake Michigan). More specifically the game walks
> you north-to-south through the whole Montrose recreational complex:
> **Montrose Harbor** and its long breakwater/fishing pier; **Park Bait Co.**
> (the harbor's bait shack); **Montrose Beach** and its beach house /
> concession; **"The Dock" at Montrose Beach** (the seasonal beach
> bar/restaurant); **Cricket Hill** (the kite-flying mound); **Montrose Point
> Bird Sanctuary, a.k.a. "The Magic Hedge"** (the wildflower/hedge natural
> area at the point).
>
> Evidence cited per landmark (shot numbers): harbor + breakwater (10–15,
> "walk out along a skinny pier over the harbor"), PARK BAIT label (16–18,
> "the single most decisive clue"), beach + beach house (19–27), THE DOCK
> label (25–27), Cricket Hill (28–33, kite strings + kites + the hint text),
> the Magic Hedge sanctuary (34–42, hedge + wildflowers + songbirds).
>
> **CONFIDENCE: Unmistakable.** "The game itself hands over three named
> signs/hints — 'PARK BAIT,' 'THE DOCK,' and 'Cricket Hill' — and those
> three names co-occur in exactly one place on Earth: Montrose in Chicago."

### Phase 2 — against refs/montrose/ (condensed; misreads + picky list in full)

> "Yes — the match is strong and my Phase 1 identification was correct in
> full." Ref-to-shot mapping given for the harbor photos (→ 10–15), the
> skyline/lighthouse photo (→ 16–18), both beach photos (→ 19–27), the
> plover photos (→ the dunes), the Magic Hedge photos (→ 37–42), and the
> sanctuary-gateway photos (→ 34–36). "The sequence Harbor → Park Bait →
> Beach/The Dock → Cricket Hill → Magic Hedge mirrors the real geography."

Misreads (documented, NOT chased — each checked against the full-size run
frames):

- "White shapes might be ice floes" (phase 1 hedge) — self-corrected in
  phase 2 to summer moorings; the boat read was right.
- Shots 7–9 (mt-gate, the Montrose Ave underpass portal) read as "a harbor
  building over water" at thumbnail scale — the sunset glint band behind the
  berm reads as water in a 280-px thumbnail; full-size frames read as the
  gate register (arch, lanterns, hedge gap) matching the shipped
  Belmont/Addison/Irving portals.
- "The timber gateway arch is missing" — it is NOT: shots 40–42 ARE the
  gateway (posts + header beam + routed yellow letters + the Cardinal
  greeter); at thumbnail scale the beam reads as "a marker on a post."
- "Plovers not foregrounded" — the roped dune + PIPING PLOVER NESTING AREA
  sign + plover pair + chick are shots 22–24 (mt-dunes), thumbnail-lost.

Picky list dispositions (thumbnail-scale artifacts vs real gaps):

1. "Add the candy-striped breakwater lighthouse" — EXISTS (mt-hook f0–f2,
   mt-harbor f1: white tower, red bands + cap on the tip). Thumbnail-lost.
2. "Recognizable downtown skyline" — PHYSICS RULING (GEOGRAPHY.md §Point):
   far plane 900 m + fog opaque at 210 m; downtown is ≥1,600 m from Montrose
   and cannot render. The horizon band behind Park Bait is the Lakeview
   backdrop. Recorded liberty, not chased.
3. "Tall sailboat masts" — EXIST (4.5 m masts + booms on every hull; read in
   every full-size harbor frame). Thumbnail-lost.
4. "Timber archway" — exists, see misreads above.
5. "Roped plover dunes" — exist, see misreads above.
6. "Denser hedge corridor" — the ~38 m hedge WALL with birder gap windows is
   mt-hedge f0–f2; the register is deliberately open-sky-one-hedge-line
   (BRIEF: distinct from Jarvis). Reads at full size.
7. "More prairie character" — mt-point f0–f2 carry the straw + goldenrod +
   aster drifts. Reads at full size.
8. "Beach-house architectural flavor" — the prow/roof/rail/sign register is
   shipped; noted as LOW cosmetic headroom, not filed (the real building is
   a long cream pavilion; the game's read matches the refs at game scale).

No polish tasks filed from the evocation: every substantive item is either
present at full size or a recorded physics liberty. The review PASSES on the
blind phase-1 naming alone.

## Known cosmetic notes (non-blocking)

- Drifting blossom petals near the lens read as white quads in stills
  (mt-hedge-gate f0 this run) — transient ambient particle, map-wide since
  v0.2.
- The contact-sheet thumbnails lose sub-10-px landmarks (entrance-light
  stripes, masts, plovers, gateway letters) — judge those from the
  full-size frames, as above.
- Beach towels are flat color quads (shipped style since v0.5, consistent
  with Belmont).

**Montrose is signed off.** The contiguous 1:2 world now runs Belmont →
Irving Park → Montrose in one uncut walk; this file + LOCATIONS.md unlock
the §5.3 planner for the next location.
