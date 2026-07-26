---
id: 122
area: lincolnpark
type: build
model: fable
turns: 120
title: The CONSERVATORY + formal garden — Victorian glass, Storks at Play, Grandmother's Garden (retry of parked 116, sign-off prerequisite)
acceptance: >
  The Lincoln Park sign-off (task 123) is BLOCKED on this: the conservatory
  is the pipeline's fourth signature landmark and it is not built. The 111/116
  data is STAGED but consumed by no builder (LP_CONSERVATORY / LP_GARDEN_* /
  LP_BATES in src/data/chicago.js render nothing today — orphaned walkability/
  landmark only). Build it and wire it, then the sign-off can run one fresh
  full walkthrough that includes it.
  HEAD-START: the 116 data + the GEOGRAPHY 116 ruling (conservatory re-sited
  N of the built zoo fence, vestibule flipped to the SOUTH face over the garden
  axis, Grandmother's bulge, Bates on-axis) are preserved as
  autopilot/queue/parked/116-orphaned-data.patch. FIRST verify it still applies
  against the current tree (`git apply --check`); if it does not, hand-reconcile
  against the current src/data/chicago.js LP_CONSERVATORY block (lines ~1782+,
  already partly present) and GEOGRAPHY.md — do NOT blindly force it. Whatever
  lands, the data must be internally consistent (footprint carve, colliders,
  garden walk consts) before any geometry consumes it.
  (1) THE CONSERVATORY: the Victorian glasshouse — the tall arched PALM HOUSE
  center mass with its curved glass profile against SKY (the win condition),
  lower flanking glass wings E/W, hand-modeled toon: pale green-white ironwork
  frame, verdigris copper ridges, warm rusticated-stone base, glass panes with a
  warm green-tinted glow, dark palm silhouettes read inside/above the ridge line
  (palms poking through an open lantern is the honest fallback if through-glass
  fights the toon shader — no walkable interior this task, door glow only, a
  111-plan decision). White pyramid VESTIBULE on the SOUTH face with the
  green awning band lettered LINCOLN PARK CONSERVATORY (geographic/civic — REAL
  per RENAMES.md) over FREE ADMISSION doors. Footprint carved, colliders
  anti-trap-clean (052/065 laws).
  (2) THE FORMAL GARDEN on the axis south of the vestibule: clipped lawn panels
  + ribbon flower beds (reuse existing flower/tuft buckets, LOCAL seeds), and the
  BATES FOUNTAIN "Storks at Play": round grey basin (carved), the bronze-green
  cranes/boys-with-fish group as a chunky toon silhouette, spray via the existing
  Crown Fountain / Millennium fountain-spray vocabulary (REUSE, don't fork).
  (3) GRANDMOTHER'S GARDEN west across Stockton per the 111/116 plan: looser
  cottage-style beds in lawn — a palette contrast with the formal side.
  (4) PATHS: garden walks + the Stockton crossing per the plan, pathSamples2,
  miter welds, no dead ends into the beds. The garden walks are named in the
  sign-off's walkprobe-coverage list — they must exist and be walkable.
  (5) WALKABILITY: walkprobe rules + expects in the shared data module exit 0;
  fountain basin + glasshouse footprint carved; garden loop reachable.
  (6) DETERMINISM: LOCAL seeds only; ZERO new InstancedMesh buckets (glass framing
  folds into the static merge pool — give hand-built strips a uv attribute per the
  019/mergeCellStatic pitfall; any exception named + justified); spawn shot ≈ noise
  vs baseline (append rng consumers, never reorder).
  (7) PERF: draws ≤ 480 at every affected waypoint (LP worst view is ~368/480
  today — headroom exists, but the glasshouse is the area's most geometry; budget
  it and MEASURE).
  (8) WAYPOINTS: add lp-conservatory (Palm House arch + garden axis foreground —
  framing MUST put the glass against sky, not buried in canopy; camera-in-canopy
  trap) and lp-bates (fountain + beds, glasshouse behind) to
  tools/waypoints.expect.json with authored strings from BRIEF.md §conservatory;
  `node tools/walkthrough.mjs --ids lp-conservatory,lp-bates` green, EVERY PNG
  personally Read and judged against expectation + refs + the art-director
  standard.
  (9) `npm run build` one artifact; zero console/page errors; canary echoes.
  On green: DELETE the superseded parked/116 files in the close-out commit;
  Lincoln Park then has all four signature landmarks and task 123 (sign-off)
  can run.
refs:
  - autopilot/queue/parked/116-orphaned-data.patch (the STAGED data + GEOGRAPHY
    116 ruling — verify-then-apply, do not blind-force). SUPERVISOR VERIFIED
    2026-07-26: `git apply --check` FAILS — GEOGRAPHY.md hunk 2 no longer matches
    (the file drifted through 117/118/119/120). Hand-reconcile as the task says;
    do not force it. The patch is data + documentation ONLY (GEOGRAPHY.md 33 lines,
    src/data/chicago.js 66 lines) — NO geometry was ever written by 116, so treat
    this as a full build, not a finish-the-last-mile.
  - autopilot/queue/parked/116-build-conservatory.md (the original full spec +
    its session-117 orphaned-data note)
  - **refs/lincoln-park/BATES-FOUNTAIN.md** — NEW (supervisor, 2026-07-26, from an
    owner-supplied source): the Commons gap is CLOSED. Authoritative composition
    (circular granite basin; two bronze storks/herons, wings out, water from the
    beaks; three half-boy/half-fish figures each wrestling a fish; bronze reeds and
    cattails at center; Saint-Gaudens + MacMonnies, 1887) plus form notes read off
    the photo. READ IT FIRST — it contains the build's win condition.
  - refs/lincoln-park/BRIEF.md (§conservatory — glass profile + garden axis) +
    refs/lincoln-park/ imagery. **The key shot is
    `Lincoln_Park_Conservatory_(9719113515).jpg`** — it frames the fountain AND the
    glasshouse south face in one image, i.e. both waypoints of this task.
  - GEOGRAPHY.md Lincoln Park section (111 finals + the 116 ruling if applied)
  - src/structures.js + the static merge pool (glass/frame statics), the
    Millennium fountain/spray vocabulary (reuse precedent), src/data/chicago.js
    flower-bed vocab, src/data/chicago.js LP_CONSERVATORY (already present)
  - PITFALLS.md (merge buckets drop on mixed attribute sets → uv on hand-built
    strips; camera-in-canopy framing trap; self-lit bmat for big toon slabs seen
    from below / green-ground-bounce; sub-builder must not read index exports at
    module top level)
---

Filed by the task-120 sign-off attempt (2026-07-24): the sign-off found the
Lincoln Park pipeline INCOMPLETE — the conservatory (parked 116) is a genuine
Chicago signature landmark, named in the owner's vision line ("Lincoln Park +
conservatory + ponds"), in LOCATIONS.md's in-progress description, and in task
120's own note ("if it can't say 'Lincoln Park — the zoo, the seal pool, THE
CONSERVATORY, the honeycomb boardwalk' unprompted, the stretch isn't done").
Everything else in the stretch is verified green (walkprobe 1554/0, single-file
build, 119's contact sheet worst view 368/480, continuity + mobile). This is the
one missing piece. 116 was auto-parked after 3 failures (mechanical park — no
merit issue file was ever written; the failures may have been transient, cf. the
2026-07-20 Fable-limit 429 cascade that parked other tasks); this retry starts
with the staged data and a clear, refined spec. Owner can veto by deleting this
task or reordering the queue; the sign-off (123) is renumbered to run AFTER it.

## Supervisor addendum 2026-07-26 — why 116 died, and an OWNER RULING

**The three 116 failures were pure infrastructure, zero merit.** Verified in the
session logs: attempt 1 ran 15 h / 47 turns / $6.46 and ended
`API Error: Response stalled mid-stream`; attempt 2 ran 56 min / 48 turns / $7.14
and ended with the *same* stall; attempt 3 ran 3 min / 1 turn / $0 and ended
`API Error: Unable to connect to API (ENOTFOUND)` after 10 retries. Nothing about
the conservatory itself failed. **Watch the 47–48 turn mark** — two independent
stalls at nearly the same turn count smells like one oversized write rather than
coincidence. Prefer several moderate edits over one enormous geometry blob, and
commit progressively so a stall costs one step, not the session.

**OWNER RULING (2026-07-26): the re-siting is APPROVED.** The owner was shown the
116 ruling — glasshouse moved to x −70, z 688 (22 × 30) clear of the built zoo
fence, and the entry vestibule flipped from the 111 plan's north face to the
**SOUTH** face over the garden axis — and said: *"You can change where the
building sits."* Build it there; this is settled, not an open question. The
reference photo independently confirms the south-face vestibule.

Two form corrections the photo forces, both of which outrank the earlier spec text:

1. **The vestibule is a GLASS pyramid, not a white one** — pale silver-green glass
   with light framing and a **dark green awning band** over the doors at its base.
2. **The Palm House profile is an OGEE, not a plain arch** — it sweeps up in a soft
   double curve to a flat copper ridge cap, with lower glass wings stepping down
   east and west, over a warm rusticated stone base band. A single round arch will
   read wrong to anyone who knows the building.

And for the fountain: the win condition is the **low, broad grey granite ring**
(a sitting ledge, people perch on it) with the **tall near-black bronze reed/cattail
thicket** at its center. From player distance the reeds dominate and the birds and
merboys read as rim-height silhouettes — get those two masses right before
detailing the figures. Water is a modest low plume plus beak spouts, not a jet.
