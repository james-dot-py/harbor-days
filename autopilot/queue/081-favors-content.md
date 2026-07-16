---
id: 081
area: global
type: build
model: fable
turns: 140
title: THE FUN LAYER, part 4 — favors across the city + the Mayor-for-Real questline
acceptance: >
  Per ECONOMY.md + the 078 favors framework. (1) TEN-ISH hand-authored
  FAVORS spread across all four neighborhoods, each a small funny errand
  with named cast, using existing systems as verbs (ride/skate/throw/
  carry/find). Seeds — refine freely, keep the register: the birder lost
  her field notes near the Magic Hedge (find 3 pages, wind scattered);
  a Maggie Daley kid dropped his climbing chalk off the ribbon; the ump
  lost his whistle TO A GULL (chase the gull through the concourse); the
  hot-dog vendor needs poppy buns from the beach kiosk before the 7th
  inning; deliver a love letter between two boaters (harbor → Montrose —
  jetski encouraged); the Lolla drummer flung a stick into the crowd and
  wants it back mid-set; the Malört guy's cousin at the rink wants "the
  family recipe" carried over ice without falling (glide challenge); a
  Divvy angel: return 3 stray bikes to docks. Each: journal to-do line,
  clear waypointing via dialogue (never a map marker — directions in
  Chicago voice: "past the rocks, by the totem"), dibs + occasionally an
  item/hat reward, completable in 3-8 minutes, no fail states (dropping
  the beer = the guy laughs). (2) DATE-SEEDED ROTATION: 3-4 favors active
  per real-world day (deterministic from the date — no server), the rest
  dormant; the journal hints tomorrow brings new ones (the return-visit
  hook). (3) THE QUESTLINE — "MAYOR FOR REAL": each neighborhood grants a
  CITY STAMP for completing its favors + signature activity; collect all
  four → ceremony at the AIDS Garden monument (the crowd gathers, the
  sax guy plays) → reward: the MAYORAL REGALIA returns — the retired
  sash + star (022's redesign removed them) as an equippable cosmetic
  over the suit; journal page: the certificate. (4) Persistence via the
  078 save (favor + stamp state); determinism (favor cast at fixed
  coords, date-seed isolated from world rng — NEVER touches mulberry32);
  budget ~0 (cast reuses makeNPC); both inputs; verify 3 favors + one
  full stamp end-to-end with shots; single-file build; walkprobe green.
refs:
  - ECONOMY.md + 078 favors API
  - src/packs/ casts (birder, ump, vendors, Malört guy, boaters — reuse, don't duplicate)
  - autopilot/queue/done/022-mayor-fidelity-sax-orientation.md (the retired regalia — the questline's crown)
---

The questline's punchline is canon: the mayor earned the suit, now they
earn the sash BACK. Favors are the game teaching itself — each one drags
the player through a system they haven't touched (the L, the glide, the
jetski) disguised as helping a neighbor. Write dialogue like the bump
lines: midwestern, warm, five words too honest.
