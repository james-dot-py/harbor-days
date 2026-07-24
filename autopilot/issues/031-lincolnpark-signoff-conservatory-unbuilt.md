# Issue 031 — Lincoln Park sign-off blocked: the conservatory is unbuilt

- **Task:** 120 (Lincoln Park sign-off §5.2)
- **Area:** lincolnpark
- **Severity:** BLOCKER (a planned signature landmark of the stretch is not built)
- **Status:** filed; sign-off renumbered 120 → 123 to run after the conservatory
  build (new task 122). Not-green result recorded honestly.

## What the sign-off found

The Lincoln Park pipeline was planned as queue 110–120 with the **conservatory +
formal garden + Bates fountain** as task **116**. Task 116 was auto-parked after
3 failures (commit `64cc10e`, `queue/parked/116-build-conservatory.md`) and never
shipped. The conservatory is therefore **absent from the built world**:

- `src/data/chicago.js` defines `LP_CONSERVATORY` (lines ~1782+) and a
  `Lincoln Park Conservatory` MAP_LANDMARK entry, but a repo-wide grep for
  `LP_CONSERVATORY` / `LP_GARDEN` / `LP_BATES` / `conservatory` / `bates` /
  `Grandmother` across `src/` (excluding the data definition) and across
  `src/packs/` returns **nothing** — no builder or pack consumes it. It renders
  no geometry. It is orphaned data (walkability/landmark stub only).
- No `lp-conservatory` or `lp-bates` waypoint exists in
  `tools/waypoints.expect.json` (only the 11 zoo/harbor/pond waypoints).

## Why this blocks sign-off (not a deferrable liberty)

- The conservatory is one of Lincoln Park's **3–5 signature landmarks** (§5.4
  faithfulness standard: signature landmarks must be PRESERVED).
- It is named in the **owner's vision line** — "Lincoln Park + conservatory +
  ponds" (CLAUDE.md) — so it is not the loop's own taste call to drop.
- It is named in **LOCATIONS.md**'s in-progress description of the stretch.
- It is named in **task 120's own note**: *"if it can't say 'Lincoln Park — the
  zoo, the seal pool, THE CONSERVATORY, the honeycomb boardwalk' unprompted, the
  stretch isn't done, no matter how green the mechanics are."*
- The task-120 acceptance itself assumes 116 shipped: item (3) requires walkprobe
  to cover **"garden walks"** (conservatory-only surfaces that do not yet exist),
  and item (8) treats lp-conservatory/lp-bates framings as part of the run.

The park was **mechanical** (run.mjs parks any task after 3 failures) — no merit
issue was ever written for 116, so there is no owner decision to defer it. The
Montrose precedent signed off only once its *entire* planned pipeline (harbor,
Point, beach, Cricket Hill, Magic Hedge) was built. Signing off Lincoln Park with
a planned signature landmark parked-unbuilt would be exactly the "wishful green"
the gate exists to catch.

## Everything else is green (the conservatory is the sole blocker)

- **walkprobe: 1554 passed / 0 failed** — incl. path-continuity (99/0),
  shoreline-simple (5/0). Baseline walkability intact.
- **Single-file build:** one `dist/index.html`, 1,839.58 kB (gzip 595.31 kB).
- **Delight:** the four task-118 lines are present at commit `4a3fc3e`
  (FEEDING TIME / SPOT THE NIGHT-HERON / TOSS THE FEED / SOUTH POND DUSK CHORUS),
  and 114/115/117 add more — the ≥3-shipped bar is far exceeded.
- **No pending owner feedback** (`autopilot/feedback/` holds only processed/),
  **no lincolnpark issues** (issues 000–030 are all pre-LP Wrigley/Millennium/
  Montrose/Diversey).
- The zoo/harbor/pond stretch was verified green at task 119 three days ago
  (walkthrough `run-mrzfcgw6`, worst LP view 368/480, continuity + mobile 096
  proof) and the content tree is unchanged since.

## Disposition

- Filed **task 122** `autopilot/queue/122-build-conservatory.md` (fresh retry of
  116 with the staged head-start patch and a refined spec).
- **Renumbered** the sign-off task 120 → 123 so the loop builds the conservatory
  first (queue order: 121 trail · 122 conservatory · 123 sign-off retry).
- Deliberately did **not** run the full sign-off walkthrough/evocation now: the
  §5.2 walkthrough of record must be ONE fresh full run that *includes* the
  conservatory, so a walkthrough of the incomplete stretch would be throwaway and
  would itself be a wishful-green artifact. The mechanical baseline above is the
  honest evidence that the conservatory is the only thing standing between Lincoln
  Park and sign-off.

Owner override: delete task 122 / reorder the queue to redirect; the autopilot
branch protects main regardless.
