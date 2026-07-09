# Wrigleyville — §5.2 SIGN-OFF

- Date: 2026-07-09 (task 006, autopilot)
- Walkthrough of record: ONE fresh full run `node tools/walkthrough.mjs --area wrigleyville`
  → run `mrcrrn8u` (own vite, canary echoed), 23 waypoints × 3 framings = **69 shots,
  0 console/page errors, 0 canary misses**.
- Contact sheet: `tools/shots/run-mrcrrn8u/contact-sheet.png`
- World state signed off: commit `3ddbe70` content (rounded marquee corner from 4063791
  + real-sign marquee face; stadium.js unmodified since before the run started).

## §5.2 checklist

1. **Every waypoint's authored expectation judged met** — yes; per-waypoint verdicts below,
   every PNG personally read in the orchestrator transcript.
2. **Standing gate green** — walkprobe 215/215; single-file build `dist/index.html`
   1,069.86 kB (gzip 319.18 kB), exactly one artifact; spawn shot matches `baseline.png`
   composition; **max 777 draw calls** at wv-rooftop-view, within the operational budget
   1050 (`tools/budgets.json`; the 480 target is the standing ratchet, queue task 007,
   tracked in `autopilot/issues/000-draw-call-budget.md`).
3. **Walkprobe covers every walkable surface** — every `WALK_W` family has a probe group:
   street corridors, park/lots negative, barricade mouths, Addison platform + stair,
   climbable rooftop + stair + landing, Gallagher plaza, rounded-corner sidewalk apron.
   215 assertions, 0 failures, no gaps.
4. **≥3 shipped delight moments logged** (DELIGHT-SHIPPED.md): EAMUS CATULI + AC counter ·
   ball-hawk Gus racing you · Go Cubs Go from bar doors · 7th-inning-stretch singalong ·
   W-flag hoist · marquee text easter eggs · ivy-ate-the-ball gag · rooftop binoculars ·
   rounded art-deco marquee corner (4063791) · dot-matrix marquee sign face (3ddbe70).
5. **Evocation review PASSED** — fresh-eyes agent (no build context; given only the
   contact sheet, then `refs/wrigley-field/`) answered from the game shots alone:
   *"Chicago — Wrigleyville (Lakeview), built around Wrigley Field, home of the Chicago
   Cubs, at Clark & Addison. There is zero ambiguity."* Cited evidence: the marquee +
   1060 W. ADDISON plaque, Addison Red Line platform, hand-turned scoreboard silhouette
   with pennant masts, ivy at the knothole, Murphy's Bleachers at Sheffield & Waveland,
   the real Clark St bar row (Cubby Bear/Sluggers/Sports Corner/Casey's/The Dugout),
   Gallagher Way + statue row with Banks "LET'S PLAY TWO", Engine Co. 78, correct
   street-blade coordinates, game-day CPD barricades. Grade: **PASS — "not merely
   plausible — unmistakable."** Its picky list is filed as polish (see below).

## Per-waypoint verdicts (run mrcrrn8u)

| Waypoint | Verdict | Notes |
|---|---|---|
| wv-spawn | MET | f0/f1 clean down-the-platform (train arriving in f1); f2 lands behind the station sign board — weak third candidate framing, world fine |
| wv-marquee | MET | All five owner deltas visible: arched crown w/ arc-set WRIGLEY FIELD, HOME OF / CHICAGO CUBS, scroll volutes, pinstripe trim, dot-matrix live board; curved cream facade behind. Streetlamp head grazes right shoulder in f0/f1 (cosmetic) |
| wv-scoreboard | MET | Green mass + pennants high atop bleachers, no video boards; line-score grid confirmed in code on the field-facing face (correctly invisible from street) |
| wv-gate-marquee | MET | Gate recess on the arc apex, queue + TICKETS booth on walkable apron |
| wv-gate-gallagher | MET | Gate + plaza screen + booth on plaza's east side |
| wv-gate-bleacher | MET | BLEACHERS corner gate, Sheffield/Waveland blades, Caray statue, Murphy's opposite |
| wv-knothole | MET | f2 is the money shot (peeking NPCs, ivy/field through the screen); f0 weak elevated framing |
| wv-station-door | MET | Arched glowing ADDISON/RED LINE stair door under the girder bridge |
| wv-murphys | MET | Fascia + sandwich boards + awning; real-building likeness upgrade owned by task 010 |
| wv-engine78 | MET | ENGINE CO. 78 + engine in bay at Kenmore/Waveland corner (005 camera fix holds) |
| wv-cubby-bear | MET | Bear-face logo, sign band, OLD STYLE / ON TAP neon opposite the marquee corner |
| wv-bar-sluggers | MET | Neon + crossed bats; whole glowing row in f0; fast-pitch hut (task 009 upgrades it) |
| wv-bar-sports-corner | MET | Lit sign readable in row |
| wv-bar-casey-s | MET | Green front, shamrock neon |
| wv-bar-the-dugout | MET | Lit band + red/white/blue swash |
| wv-stall-0 | MET | Cap stand by the station; W flags only read in bunting (minor) |
| wv-stall-1 | MET | Stand correct mid-block Addison; all 3 candidates face away from the stadium so the "facade context" clause sits behind camera — framing note |
| wv-stall-2 | MET | Stand at Sheffield/Waveland by Murphy's |
| wv-statue-row | MET | Jenkins/Williams/Santo/Banks on labeled pedestals fronting the office block |
| wv-caray-statue | MET | Exuberant wave + glasses + HARRY CARAY plaque outside Bleacher Gate |
| wv-gallagher-way | MET | Lawn, splash pad, chairs, screen, gate; f2 low angle shows roof-ring slabs floating over the plaza notch (invisible at play angles — polish note) |
| wv-rooftop-view | MET | Rooftop rows y 9.6, fans + peanut shells, view INTO the park (bleachers, light towers) |
| wv-barricade-addison-e | MET | POLICE LINE A-frames + officer; Lakeview backdrop continues beyond (diegetic wall) |

## Known cosmetic notes (non-blocking, filed)

- Double-sided canvas signs show mirrored text from behind (Murphy's blade, street
  blades) — polish with task 010's likeness pass.
- Grandstand roof-ring slabs read as floating steps from one low plaza angle
  (wv-gallagher-way f2).
- Evocation picky list (stadium skin: green steel trusses/arched windows/pent roofs/
  Friendly Confines banner; statue likenesses + real placement; scoreboard clock/grid
  visibility; foul poles + distance markers + ivy legibility from bleacher angles;
  matchup line in MARQ; brick three-flat infill; rooftop-club theming) → queue task 012.

## Provenance note

The marquee sign-face work (3ddbe70) was implemented and pushed by the resumed 005
session running concurrently in this worktree while task 006 orchestrated the same
owner note; the 006 session independently reviewed the diff, re-verified on its own
fresh full-area walkthrough (mrcrrn8u), and personally read all 69 + working PNGs.
Hazard recorded in PITFALLS.md.

**Wrigleyville is signed off. This file unlocks §5.3 planner self-expansion once the
queue (007–012) drains.**
