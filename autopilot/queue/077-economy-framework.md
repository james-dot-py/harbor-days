---
id: 077
area: global
type: build
model: fable
turns: 140
title: THE FUN LAYER, part 1 — dibs, the tote, favors: economy framework + pilot loop
acceptance: >
  OWNER DIRECTIVE (2026-07-16): "make this fun by adding currency/inventory/
  quests." Design seed (supervisor + owner intent; refine in ECONOMY.md,
  authored FIRST): currency = DIBS (lowercase, the parking-chair joke; coin
  icon = a tiny folding lawn chair; toast register: "+3 dibs"); inventory =
  THE TOTE (canvas tote bag UI — a bag button beside the journal, DOM grid
  of item icons, tap to hold/use via holdItem); quests = FAVORS (never call
  them quests in-game: named NPCs ask for small helps; a journal 'to-do'
  section tracks them; cozy, funny, zero fail-states). (1) ECONOMY.md: the
  design doc — earn rates philosophy (activities pay; first-time bonus +
  small repeats; NO grind walls, prices are 1-3 play-sessions honest),
  item taxonomy (holdables / gear / collectibles / cosmetics), favor
  structure (offer → steps → turn-in), and the save schema. (2) PERSISTENCE
  (constraint 5 RELAXED by owner directive's implication, supervisor call
  2026-07-16, recorded here + PITFALLS): a versioned save blob (dibs, bag,
  cosmetics, favor + bingo + journal progress) written through a guarded
  adapter — try localStorage, silently fall back to in-memory when
  unavailable (claude.ai artifact context) — feature-detect ONCE, never
  throw, never nag; save on change (debounced), load on boot, schema
  version field for future migration. (3) FRAMEWORK (framework.js +
  index.html shell): `wallet` (earnDibs/spendDibs + coin toast), `bag`
  (add/remove/has + tote UI, desktop key B + touch button), `favors`
  (register/offer/advance/complete + journal to-do wiring + turn-in
  celebrate). (4) PILOT LOOP, end to end, to prove it's fun before 078-080
  scale it: skip-stones and cornhole pay dibs; a BEACH KIOSK shop at the
  dog beach sells 3 items (tennis ball — throw fetch for ANY dog anywhere;
  popcorn bag — crumbs attract bingo birds close; a bucket hat the mayor
  actually WEARS — first cosmetic, mayor-only rig addition per the 022
  rules); ONE full favor: the Malört guy asks you to fetch him an Old Style
  from Sluggers (rides the L! cross-neighborhood!) → reward: dibs + his
  'burnt band-aid' toast unlocks a duet line. (5) Constraints: UI in the
  shell (no game logic in index.html — wiring in framework), draw budget
  ~0 (DOM UI + existing holdItem meshes), determinism untouched, save
  never contains coords/derived world state (survives layout reworks),
  both inputs end-to-end (buy, hold, favor round trip), single-file build
  passes, walkprobe green.
refs:
  - src/framework.js (state/journal/holdItem/addInteraction/toast — extend, don't fork)
  - index.html (journal/ctl card patterns — the tote UI matches them)
  - src/packs/npcs.js (Malört guy + Handshake — the pilot favor's cast)
  - autopilot/queue/done/011-kofi-support.md (shell-UI precedent)
  - PITFALLS.md (append the persistence decision + adapter contract)
---

The design bar: everything earns a smile before it earns dibs. "Dibs" is
the funniest word in Chicago; the tote is what every actual park-goer
carries; favors are neighbors being neighbors. If any part feels like an
MMO, cut it. The pilot loop is the proof — a playtester should grin at the
lawn-chair coin, buy the popcorn, get mobbed by bingo birds, and ride the
L holding a beer for a guy who drinks paint thinner. That's the game.
