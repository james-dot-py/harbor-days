# Millennium Park — §5.2 SIGN-OFF

- Date: 2026-07-11 (task 053, autopilot)
- Walkthrough of record: ONE fresh full run `node tools/walkthrough.mjs --area millennium`
  → run `mrh2bc0r` (own vite, canary echoed), 14 waypoints (13 mp-* + redline-monroe-boards)
  × 3–4 framings = **43 shots, 0 console/page errors, 0 canary misses**.
- Contact sheet: `tools/shots/run-mrh2bc0r/contact-sheet.png`
- World state signed off: commit `c66d5e3` content (no millennium code changed since 051;
  052 touched Wrigleyville only).

## §5.2 checklist

1. **Every waypoint's authored expectation judged MET** — yes; per-waypoint verdicts
   below, every PNG personally read in the orchestrator transcript (43 run shots +
   canary + contact sheet + 4 supplemental shots + 4 connector shots).
2. **Standing gate green** — walkprobe **446/446**; single-file build `dist/index.html`
   1,288.16 kB (gzip 398.91 kB), exactly one artifact; spawn shot matches `baseline.png`
   composition (canary `v053`, no errors); **max 363 draw calls** (mp-crown-fountain-f1),
   every mp waypoint ≤ 480 (`tools/budgets.json`). The one `[mp-clearance]` advisory
   (mp-bp-bridge-crest-f1) is the documented false-warn for on-deck cameras between
   parapets (PITFALLS) — the shot is clean.
3. **Walkprobe covers every walkable surface** — every `WALK_M` family has probes,
   checked against GEOGRAPHY.md MILLENNIUM_GEOGRAPHY's walkability list: Michigan
   spine (3 + stair-head surfaceY), Randolph/Monroe sidewalks, split Columbus rims,
   Wrigley Square plaza + exedra interior + owner vantage, Chase Promenade N/mid/S,
   Washington + Madison cross walks, Bean plaza + UNDER-ARCH (5 probes through the
   omphalos line), Crown wet pool + dry pavers, seating bowl, Great Lawn W/SE, Lurie
   NE gate + Seam boardwalk (+ 2 sit spots + 048 corner link) + SW link + south rim,
   the SUNKEN RINK group (ramp surfaceY ×2, landing, 6 apron quads, 4 ice probes,
   boards/rim/cheek negatives), BP deck (approach ramp rising, seg→crest seam
   continuity, crest y5 over the roadway, flank-buffer negatives) — plus the
   flood-fill connectivity sweep (every region reached from spawn, no elevators)
   and the issue-017 closures. **Kiosk stair resolution**: per GEOGRAPHY the kiosk
   is a builder COLLIDER standing ON the spine walk (asserted), its subway stair is
   visual-only inside the collider — there is no kiosk-stair walk surface to probe;
   the walkable stair in the cell is the RINK entry stair-ramp, fully probed. Any
   residual hole class is sealed by the 048 `isWater()` hard-cell guard + 2 m grid
   sweep. No gaps.
4. **≥3 shipped delight moments logged** (DELIGHT-SHIPPED.md, exact lines) — 13 for
   the area; the four from task 047 per the acceptance: **the Bean keeper**
   (squeegee scaffold, lines 217–222), **the wedding shoot** (lines 223–227),
   **the Pritzker soundcheck conductor** (lines 228–233), **the Millennium Station
   grate** (lines 234–237). Also shipped-and-verified this run: omphalos Bean
   (194–200), Crown spout+soak (202–208), rill sit (210–215), Great Lawn real
   people (238–243), rill bench (244–247), ice skating (248–252), wobbly beginner
   (253–256), purple-on-gold monument (257–263), Red Line stop picker (264–273).
5. **Evocation review PASSED** — ONE fresh-eyes subagent, no build context, staged:
   phase 1 = ONLY the anonymized contact sheet (`tools/evoc-prep.mjs` neutral
   labels, no refs), committed verbatim before phase 2: *"Millennium Park in
   downtown Chicago, Illinois"* — named Cloud Gate, Pritzker Pavilion + trellis,
   Crown Fountain's projected faces, McCormick rink + Park Grill, Lurie Garden's
   Shoulder Hedge + boardwalk, BP bridge, with per-shot citations. Confidence:
   **"UNMISTAKABLE — a combination that can only be Millennium Park, Chicago."**
   Phase 2 (refs/millennium-park/ comparison): **"YES — INSTANTLY. Cloud Gate
   alone settles it… the tour even follows plausible real adjacencies."** Its
   picky list is filed as queue task 056 (+ issue 021 corroboration); its
   misreads are documented below, not chased.

## CONNECTOR — Belmont → Monroe ride (scripted, act.mjs, canary `v053ride`, 0 errors)

- `cx-1`: at Belmont (16,113), the "RED LINE → MONROE / Millennium Park /
  95th / Dan Ryan-bound" departure board + prompt pill "ride the Red Line —
  Monroe / Millennium Park"; lakefront minimap.
- `cx-2` (E pressed): the dark State St tube — sodium-amber car, toast asserted
  via DOM eval: **"RED LINE — 95TH BOUND / next stop: Monroe"**; minimap swapped
  to the ride strip map (ADDISON · SHERIDAN · BELMONT · MONROE).
- `cx-3`: in-car, rider + Ko-fi placard, lights back up for arrival.
- `cx-4`: surfaced at the kiosk mouth (54.5, 800) facing east DOWN THE BEAN AXIS —
  Bean dead ahead over the rink (SKATE RENTAL + skaters below), the two Monroe
  boards flanking as the station portal (→ BELMONT and → ADDISON, both correctly
  Howard-bound from downtown), toast asserted: **"MILLENNIUM PARK / downtown —
  the Bean is that way"**, minimap now the millennium cell map with the player
  marker at the west edge. The neighborhood is rideable both ways (return prompt
  visible in frame).

## Per-waypoint verdicts (run mrh2bc0r)

| Waypoint | Verdict | Notes |
|---|---|---|
| mp-arrival | MET | Kiosk + railed stair pit + red RED LINE pylon on the Michigan sidewalk; cliff behind, lawns/globe lamps/pennants east; rink + peristyle + WRIGLEY SQUARE wall in frame |
| redline-monroe-boards | MET | Both boards upright/legible on lollipop posts flanking the pylon ("→ ADDISON / Wrigley Field", "→ BELMONT / the lakefront", both Howard-bound); portal composition over the stair. Framing note: boards face west so the Bean-east clause sits behind camera (rink reads in f1/f2) |
| mp-streetwall | MET | Continuous lit-window canyon face closes the whole view; Cultural Center colonnade close-up in f2. Gothic-front individuation = issue 021's recorded ceiling → task 056 item 4 |
| mp-peristyle | MET | Purple paired-column exedra on the warm gold base, dedication band, basin, urns, quad-globe lamps; f2 interior wrap framing with the lit jet |
| mp-wrigley-square | MET | The owner night-photo read: purple-on-gold, "TO THE FOUNDERS OF MILLENNIUM PARK" fully legible (f2), lit fountain jet, flanking urns + twin-globe lamps, towers behind |
| mp-rink-overlook | MET | Sunken scratched sheet, cream-capped boards, corner masts, gliding skaters + the pink wobbly beginner at the boards (f1), PARK GRILL band (f2), Bean over the balustrade (f0 = the owner skating-photo composition), keeper's scaffold in frame |
| mp-rink-entry | MET | SKATE RENTAL at the stair head, cheek walls, landing + boards gate, scratched ice toward the Park Grill wall; kiosk + cliff in the reverse (f1). Notes: west-apron benches not in any framing (unframed, not contradicted); transient NPC photobomb near the lens in f1 |
| mp-bean | MET | Painted skyline-and-crowd reflection, figures + keeper cart at the base, cliff behind; f2 under-arch omphalos vortex with inverted crowd — the money shot. Transient NPC photobomb eats part of f1 (wandering crowd, not a world defect) |
| mp-crown-fountain | MET | Towers face each other down the wet pool, amber lantern glow, giant blinking face, kids on the plaza (run framings); the SPOUT + splash + "SPLASH! soaked head to toe" toast verified by supplemental `tools/shots/crown-soak/soak.png` (first spout holds ~7 s after load; run wait is 2.6 s). Stale 041-SHELL parenthetical removed from the expect string this commit |
| mp-promenade | MET | Allee between double tree rows, globe lamps, pennants, both CHASE PROMENADE plinths legible (f1), view dead-ends at the giants band. The PRUDENTIAL/diamond identification does not read from the allee (tree occlusion + crop) — content exists (streetwall.js signTex + spire cone; diamond reads from the bridge) → issue 021 / task 056 item 3 |
| mp-pritzker-stage | MET | Ribbon-petal crown, glass mouth + dark-red curtain + warm fir interior, timpani + music stands, canted buttresses, speaker tower, red seat ranks; the 047 conductor on the podium (f1); finned monolith behind (unlabeled — 056) |
| mp-great-lawn | MET | Criss-cross pipe arcs + paired speaker pods over REAL seated picnickers, converging on the lit stage; north wall stands beyond but reads generic (021/056) |
| mp-lurie | MET | Boardwalk through purple/gold drifts, shoulder hedge in its proud dark-steel armature, enclosure read, 048 sit-edge bench (f2), Exelon cube + towers over the hedge. Notes: rill water subtle under the plank lip (real-Lurie-consistent); Gehry-ribbon peek faint (f0 corner only) |
| mp-bp-bridge-crest | MET | Plank deck sweeps smoothly between solid shingle parapets (048 CatmullRom fix holds), west view lands stage ribbons + Bean + skyline, east view the polite dead-end + lower Loop band; Two Pru's diamond crown reads from f1. Clearance advisory = documented false-warn |

## Evocation misreads (documented, NOT chased)

- "BP bridge sides are open metal arches" — those are the TRELLIS arcs beyond the
  deck; full-size parapets are solid shingle bands.
- Treated the OWNER-PHOTOS.md punch list as live bugs — it is 048 history; the file
  now says so explicitly.
- "Peristyle purple in daytime" — the game is perpetual dusk (recorded liberty).
- "Missing Maggie Daley ribbon / Nichols Bridgeway" — owned by queue 058–059;
  Nichols exists as scenery leaving the south frame.
- Phase-1 label swap (called the peristyle shots "Pritzker") — self-corrected in
  phase 2; both are real Millennium Park landmarks, identification unaffected.

## Known cosmetic notes (non-blocking, filed)

- Crown pool wet-mirror legibility at thumbnail scale; Pritzker ribbon/sky contrast;
  named-tower silhouettes + streetwall relief → **queue task 056** (evocation picky
  list, the Wrigleyville task-012 precedent), corroborating **issue 021**.
  - **056 SHIPPED (2026-07-12):** Crown pool now reads as an amber-lantern-
    reflecting WATER sheet (cool blue-black skim + bold painted amber wet-mirror
    doubling + lit rim) at thumbnail; Pritzker ribbon burst reads against the pale
    sky (cool/warm two-tone + rim-darkened petal edges); Cultural Center colonnade
    is a deep classical PORTICO and CAA gains gothic tracery + pinnacles (historic
    Michigan Blvd, not flat slabs); the Randolph giants are individuated (bold dark
    diamond crown, cool-white fluted Aon monolith, dark-capped Prudential slab) with
    **Aon nameable from the great lawn (mp-great-lawn f1)**. RESIDUAL (issue 021,
    LOW): the *near-level f0* framings + world curve keep the tall giant crowns from
    reading name-at-a-glance from the promenade dead-end / great-lawn f0 — now
    root-caused (crown crop + curve-sink), not a lack of silhouette work.
- Chase-cam central occlusion covers sign centers when the mayor stands dead-on
  (dedication band f0/f1; PARK GRILL f0) — each has a clean framing elsewhere in
  the same run.
- Transient NPC photobombs near the lens (mp-bean-f1, mp-rink-entry-f1) — the plaza
  crowd wandering; re-shoot yields clean frames.

**Millennium Park is signed off. This file + refs/wrigleyville/SIGNOFF.md unlock
§5.3 planner self-expansion; polish 054–056 and the owner's Grant pipeline 057–062
queue behind it.**

---

# ADDENDUM — Grant Park expansion (tasks 057–062, signed off 2026-07-12)

- Scope: the cell grew into Grant Park proper — Art Institute west facade +
  lions + Nichols Bridgeway (058), McCormick ice + AI campus (059), Nichols
  Modern Wing + Cancer Survivors/play garden (060), LOLLAPALOOZA on Butler
  Field (061), owner punch-list polish + this addendum (062).
- Walkthrough of record: ONE fresh full run `node tools/walkthrough.mjs --area
  millennium` → run `mri5puyn` (own vite, canary echoed): **22 waypoints × 2–4
  framings = 68 shots, 0 console/page errors, 0 canary misses**, every PNG
  personally read. Contact sheet: `tools/shots/run-mri5puyn/contact-sheet.png`.
- Standing gate: walkprobe **600/600** (incl. the new "Millennium 062" section:
  wall-envelope/mast/hut clearances off the ribbon polyline, BP + Nichols band
  lane continuity + y-continuity); single-file build 1,418.92 kB (gzip
  445.78 kB); spawn matches baseline (diff = HUD pill fade + NPC/AA noise,
  structural zero); **max 478 draw calls (mp-bean-f3)** — every waypoint ≤ 480.
- Gridsweep: entire footprint at 2 m, **zero holes, zero jetski cells**; 74
  blessed boundary candidates (census in tools/mp-gridsweep.mjs), incl. the
  intentional hut-pocket mouth at (242,758).

## Owner punch list (all four closed; details in autopilot/issues/022–024)

| Item | Verdict |
|---|---|
| 0a walls × ribbon (issue 022) | RESOLVED — walls re-cut (12×6 crescent h12, 7×5 prow h9; recorded liberty, not in OSM) as TRUE ISLANDS; envelope clearance 6.30/6.49 m off the ice (gate ≥3.5, walkprobe-asserted); full loop skated both directions by steering bot, no strands |
| 0b BP stutter (issue 023) | RESOLVED — walk data now a point-to-polyline BAND from the same CatmullRom samples as the geometry (hw 2.35, caps at joints); bot hold-forward both ways: 0 stalls, continuous y |
| 0c Nichols entrance (issue 024a) | RESOLVED — hedge breaks at the mouth (runs end z831 / start x120.5) + paved curb apron; decisive shot clean |
| 0d Nichols landing (issue 024b) | RESOLVED — canopy raised y14.9→18.1 (self-lit bmat after the toon slab read green from below), 'BRIDGE TO THE PARK' arrow plate at the rail gap; round trip verified both ways |

## Per-waypoint verdicts (run mri5puyn — expansion waypoints)

| Waypoint | Verdict | Notes |
|---|---|---|
| mp-lions | MET | AI west facade: bronze lions flanking the steps, banner row + frieze + museum name plates all legible in f1 (the sign-audit frame; the 062 canvas-plate ATLAS renders identically at 1 draw) |
| mp-south-garden | MET | Sunken hedged garden south of the AI, fountain court read |
| mp-nichols | MET | White deck rises off the lawn through the hedge break; f2 = Modern Wing terrace overlook with raised warm-white canopy, rail gap + wayfinding plate, deck sightline back down |
| mp-bp-crossing | MET | Serpentine shingle-parapet deck over the Columbus trench; smooth plank sweep, no joint kinks; trench walls + roadway below |
| mp-monroe-crossing | MET | Monroe boundary seam: continuous pavement Millennium → Maggie Daley, no gap/step artifact |
| mp-climbing-walls | MET | Re-aimed framings: faceted crescent + prow read as sculpted islands IN the loop, ice flowing around them with rail margin |
| mp-ribbon | MET | Ribbon loop: banked ice, rails, skaters, warming hut, interior rock islands; f1 known cosmetic note below |
| mp-play-garden | MET | Play garden mounds/slides/watchful parents east of the ribbon |
| mp-cancer-survivors | MET | Pavilion + garden walk at the NE corner |
| mp-lolla-rail | MET | Rail crowd pressed to the barricade, stage beyond, flag props |
| mp-lolla-crowd | MET | Butler Field bowl: dense crowd, stage wash, sound tower |

All 11 pre-expansion waypoints (mp-arrival … mp-bp-crossing's predecessor set,
redline-monroe-boards) re-verified MET in the same run — no regressions from
the 062 draw folds (AI/nichols plate atlases, bean-polisher vertex-color
merges, ribbon-skaters distance-hide).

## E2E (both inputs, scripted, PNGs read)

Desktop: Belmont board → real Red Line ride → arrived (54.5, 800) → Bean →
BP crest → Maggie landing → ribbon skate (displacement verified) → play
garden → lion luck toast → Lolla rail → dance circle. Mobile (--mobile,
tapSel): same ride + ribbon + dance tap, all green (m3 retake = portrait
chase-cam artifact at one goto, not geometry).

## Evocation dry-run (fresh-eyes, contact sheet first, then refs)

- Phase 1 (ONLY tools/shots/run-mri5puyn/contact-sheet.png): *"Millennium Park
  (and the adjoining Maggie Daley Park) in downtown Chicago"* — confidence
  **UNMISTAKABLE**. Named unprompted: Cloud Gate + omphalos, Crown Fountain,
  Pritzker + trellis, the peristyle, BP bridge, Lurie, McCormick rink, **and
  every expansion piece**: Maggie Daley's climbing walls / play garden /
  Skating Ribbon, the Art Institute lions, Nichols Bridgeway to the Modern
  Wing, LOLLAPALOOZA, Cancer Survivors' Garden, the Red Line/Monroe tiles.
- Phase 2 (refs/millennium-park/ comparison): **"YES — every reference photo
  maps to a game tile on sight"**, incl. the ribbon figure-eight aerial and
  the play-garden winter photo; relative layout called correct against the
  owner aerial.
- Picky list (cosmetic, documented not chased; several are thumbnail-scale
  artifacts of the contact sheet — Crown faces and BP plank striping exist
  and read in the full-size run frames): BP metallic sheen, Bean skyline hint
  in the reflection, trellis member density, lion patina desaturation.
- Misreads: none substantive (hedged the purple-lit walls' attribution;
  called the mayor "elderly" — inference, not error).

## Known cosmetic notes (non-blocking)

- mp-ribbon-f1: the warming hut's west wall reads blank at very close range.
- mp-bean-f1: transient NPC photobomb near the lens (wandering crowd).
- Issue 021 (skyline crown individuation from near-level park framings)
  CLOSED as structural residual — crown crop + world-curve sink at the
  billboard register; levers exhausted, reopen only if the owner names it.

**The Grant Park expansion is signed off. Next per LOCATIONS.md: Montrose
(owner-picked, contiguous northward growth).**
