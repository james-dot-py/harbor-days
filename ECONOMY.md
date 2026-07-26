# ECONOMY.md — dibs, the tote, favors (the fun layer)

Design doc for Harbor Days' economy. Authored by task 078 (framework + pilot);
grown by 079 (every activity pays), 080 (shops/catalog/hats), 081 (favors at
scale), 082 (balance + save integrity — the rates table below gets FINALIZED
there against real play). Owner directive 2026-07-16: "make this fun by adding
currency/inventory/quests."

The design bar (from the 078 brief, binding): **everything earns a smile
before it earns dibs.** If any part feels like an MMO, cut it. No grind
walls, no fail states, no nags, no numbers going up for their own sake.

---

## 1. dibs — the currency

- **Always lowercase.** It's the parking-chair joke: in Chicago you claim a
  shoveled spot with a folding lawn chair. Here you claim little joys.
- **Icon:** a tiny folding lawn chair (webbed, avocado-and-white — the one
  from every Chicago alley). Inline SVG in the HUD chip; never an emoji coin.
- **Register:** small and dry. The coin toast reads `+3 dibs` with a one-line
  reason in the sub-line (`+5 dibs · skipped a beauty`). Big gold banners are
  reserved for firsts, purchases, and favor turn-ins; repeat payouts only
  pulse the HUD chip. NEVER interrupt an activity mid-flow with UI.
- **HUD:** a dibs chip (lawn chair + count) sits with the right-side buttons.
  Hidden until the player has ever earned a dib — a fresh boot shows a game,
  not an economy.

### Earn-rate philosophy

- **Activities pay at the moment of delight,** not the checkbox — the +2
  lands on the third splash of the skip, on the clunk of the bag in the hole.
- **First-time bonus + small repeats.** First time an activity pays: +5..+10
  (feels like a gift). Repeats: +1..+3, diminishing within a session
  (079 wires the throttle; the wallet API carries the reason string).
- **Honest prices.** Everything in a shop is affordable inside 1–3 casual
  play-sessions. A casual session should earn **~20–40 dibs** without trying.
  Rule of thumb from 082's brief: err generous — nobody quit Animal Crossing
  because the bells came too easy.
- **No sinks that reset fun.** Nothing consumable costs enough to regret.
  Cosmetics are the long-saver tier, and even those are 1–3 sessions.

### The rate table (079 — every activity pays; 082 finalizes vs real play)

Every payout goes through `wallet.pay` (§5) and rides the line that ALREADY
celebrates the moment. `first` is the once-ever gift; `repeat` is the trickle.

| activity | key | first | repeat | reason |
|---|---|---|---|---|
| skip stones (≥3 skips) | `stones` | 5 | 2 (3 if ≥6) | a good skip / skipped a beauty |
| cornhole: call a bago | `cornhole` | 5 | 2 | called it — bago! |
| driving range: a new best | `range.best` | 5 | 2 | driving range: new best |
| driving range: bucket done | `range.bucket` | 6 | 3 | driving range: bucket done |
| mini golf: hole at par or better | `golf.hole` | 5 | 2 | mini golf: par or better |
| mini golf: course complete | `golf.course` | 8 | 3 | mini golf: course complete |
| Marovitz: sank it | `marovitz.hole` | 5 | 2 | chip-and-putt: sank it |
| Marovitz: round done | `marovitz.round` | 8 | 3 | chip-and-putt: round done |
| badminton: a nice rally | `badminton` | 5 | 2 (cd 6) | badminton: nice rally |
| birdwatch: a new species | `bingo.species` | 5 | 2 | birdwatch: new friend |
| birdwatch: BINGO | `bingo.full` | 10 | **0** | birdwatch: BINGO |
| the plover | `plover` | 8 | 2 | birdwatch: the rarest guy |
| fishing: reeled one in | `fish` | 5 | 2 | fishing: reeled one in |
| jetski: a ride | `jetski.ride` | 6 | 2 (cd 20) | jetski: out on the lake |
| jetski: every 300 m out | `jetski.dist` | 5 | 2 | jetski: went the distance |
| skating: a hop-spin | `ice.hop` | 5 | 1 (cd 3) | skating: landed a hop-spin |
| skating: a whole ribbon lap | `ice.loop` | 8 | 3 | skating: the whole ribbon |
| Divvy: a new dock | `divvy.dock` | 5 | 2 | Divvy: a new dock |
| Divvy: the whole network | `divvy.all` | 10 | **0** | Divvy: the whole network |
| an honorary sign | `honorary.sign` | 5 | 2 | found an honorary sign |
| every honorary sign | `honorary.all` | 10 | **0** | honorary Chicagoan |
| the L: a new stop | `l.stop.<stop>` | 5 | 2 | the L: \<stop\> |
| the L: the whole line | `l.all` | 10 | **0** | the L: the whole line |
| the Handshake, survived | `handshake` | 8 | 2 (cd 8) | the Handshake: survived it |
| a straight Malört, survived | `malort` | 5 | 2 (cd 8) | Malört: survived it |
| Wrigley: a ticket | `wrigley.ticket` | 6 | 1 | Wrigley: got a ticket |
| Wrigley: the whole half-inning | `wrigley.half` | 8 | 3 | Wrigley: the whole half-inning |
| Wrigley: **ejected** | `wrigley.eject` | 10 | 3 | Wrigley: ejected — worth it |
| rooftop bleachers: a sit | `rooftop` | 6 | 2 (cd 20) | rooftop: best seat outside |
| Lolla: the dance circle | `lolla.dance` | 6 | 2 (cd 10) | Lolla: the dance circle |
| Lolla: a totem | `lolla.totem.<kind>` | 5 | 2 | Lolla: the \<kind\> totem |
| fetch: a dog brings it back | `fetch` | 5 | 2 (cd 4) | fetch: good dog |
| sanctuary: a deck sit | `sanctuary.sit` | 5 | 1 (cd 20) | sanctuary: sat a while |
| the fireworks finale (3 in 4 s) | `fireworks` | 6 | 2 (cd 8) | fireworks: the finale |
| a kite flight (Cricket Hill) | `kite` | 5 | 2 (cd 10) | flew a kite (080) |
| sea glass, pocketed | `seaglass` | 5 | 2 | lake glass, pocketed (080) |
| an Old Style at the drink rail | `rooftop.rail` | 5 | 2 (cd 20) | the drink rail (080) |
| a zone, first found (×11) | `zone.<name>` | 3 | **0** | found \<name\> |
| trail micro-find (shell/feather, 121) | `trailfind` | 3 | 1 (cd 6) | pocketed a little find |
| favor: an Old Style for the Malört guy | (favors) | 12 | — | the Malört guy |

**The biggest single payout in the park is getting EJECTED from Wrigley (+10).**
Comedy pays. That is the whole design bar in one row.

#### Two laws the table encodes

1. **A COLLECTION completes once; a ROUND completes every time.** `repeat: 0`
   on BINGO / the whole network / every sign / the whole line — a collection
   can never un-complete, so a repeat there is standing tax-free income (and
   the per-item session flags reset each load, so it would re-pay the whole
   card every session). `golf.course` / `marovitz.round` / `range.bucket` keep
   their repeats: you actually played it again.
2. **`cd` on anything that can fire in a fast loop.** The first-ever payout is
   never throttled — that gift always lands.

Cornhole note (078 reality check): today's cornhole is an ambient NPC-vs-NPC
match — the player doesn't throw. The payout is a SPECTATOR beat: be
within ~12 m when a bago drops and you "called it" (+2, first +5). If a
later task makes cornhole playable, the rates upgrade to thrown-bag payouts;
until then, paying the watcher is the cozy read (you cheered, you get a dib).

Per-session repeat throttle (079 formalized it; verified in-engine —
`[9,2,2,2,2,2,2,2,2,2,2,1,1]`): an activity's repeat payouts halve after ~10
paid repeats in a session (min +1). Never zero — a trickle still smiles.

#### FINALIZED against real play (082 balance pass)

Measured a fresh player's session-1 income sources in-engine
(`tools/tmp/082-balance-sim.mjs`):

- **Zone discovery**: all 11 lakefront zones = **+30** dibs (10 credited ×3; two
  zones overlap). A realistic session-1 wanderer hits ~6–8 = **+18…+24**.
- **The pilot favor** (oldstyle, the Malört guy): **+12**, delivered end to end.
- **Activity firsts**: +5…+10 each; a session-1 player tries ~2–4 = **+10…+30**.
- So an engaged session-1 lands **~40–55 dibs**; a light "just wandered" session
  **~18–24** — matching 079's ~20–40 target.

**The one tuning change: bucket hat 25 → 20.** It is the MILESTONE first hat and
the retention hook; at 25 a light session-1 fell just short of it. At 20 a
normally-engaged session-1 clears it comfortably while it stays a real
save-toward goal — "err generous," the first hat should feel earned, not
withheld. No other price moved; nothing requires grinding ONE activity (repeats
diminish after ~10/session, so variety always beats farming — by design).

**Two known payout leaks, DELIBERATELY kept (a call, not an oversight):**
- `range.best` pays the first ball of every session (`rangeBest` unpersisted →
  any carry ties 0). +5/session of harmless free income; the toast reads "new
  best!" as it has since before dibs. Kept — it's a tiny returning-player gift,
  not a grind or a wall.
- `honorary.sign` / `divvy.dock` re-pay their per-item REPEAT each session (the
  discovered flags are session-scoped; the completion beats stay `repeat:0` and
  never re-pay). A returning player earns a little passive income re-spotting the
  docks/signs — a cozy "oh right, the Divvy network" beat. Kept under the same
  err-generous rule; the once-ever FIRST bonus still fires exactly once
  (persisted via `paidFirsts`).

### The shops (080 — four, each diegetic: a counter, a keeper, the framework card)

Prices honor the 1–3-casual-sessions bar; cosmetics are the saver tier. The
penny machine is the game's one deliberate SINK, and it costs exactly 1 dib
because the crank is the souvenir.

| shop | where | stock (dibs) |
|---|---|---|
| **the beach kiosk** (078's pilot, expanded) | dog-beach approach (100,−353) | popcorn 5 · tennis ball 8 · skip-stone pouch 10 · kite 15 · paper pirate hat 12 · bucket hat **20** (082: 25→20, the milestone first hat) |
| **Sluggers to-go** | the Sluggers storefront, Clark St (by the favor door) | Chicago dog 6 · Old Style 6 · ballcap (blue) 25 |
| **LOLLA MERCH** | Butler Field entry, Grant Park | boombox-to-go 35 (festival price — that's the joke) · flower crown 20 |
| **the museum cart** | Michigan Ave sidewalk, by the lions | museum coffee 6 · birder's boonie 22 · winter pom hat 25 · **penny machine: 1 dib a crank** |

Sluggers note: buying an Old Style while the Malört-guy favor's first step is
open counts as step 1 (the counter pack watches the bag) — the favor door's
free can still works and still wins its own spot.

---

## 2. the tote — inventory

Every actual park-goer carries a canvas tote. So does the mayor.

- **UI:** a tote-bag button beside the journal button (desktop key **B**,
  touch tap). Opens a card in the journal's visual family: canvas-colored,
  a grid of item tiles (icon, name, count badge). Tap a tile to use it —
  holdables go to the hand (`holdItem`), cosmetics equip/unequip, gear
  toggles. A one-line caption under the grid describes the tapped item.
- **Never a menu maze.** One card, one grid, tap = the obvious verb.
  Empty state: "just sand in here" + a hint the kiosk sells stuff.

### Item taxonomy

| class            | what it is                                | examples (pilot in bold)                          |
|------------------|-------------------------------------------|---------------------------------------------------|
| **holdables**    | toys/food held in hand via holdItem; the verb is throw/eat/pour | **tennis ball**, **popcorn bag**, hot dog, Old Style (favor prop), coffee |
| **gear**         | reusable tools that unlock a verb anywhere | skip-stone pouch, boombox-to-go, kite (all 080)   |
| **collectibles** | found/made things with journal pages       | sea glass, smashed pennies (080)                  |
| **cosmetics**    | worn; mayor-only rig additions (022 rules) | **bucket hat** (first!), more hats + regalia (080/081) |

Rules: every item **does** something ("toy, not trophy" — 080's law).
Holdables are infinite-use toys, not consumables with counts to babysit —
the popcorn bag refills itself by the next visit (count exists in the schema
for future collectibles, but the pilot never decrements a toy).

### The catalog (080 — what each item DOES)

- **hot dog** (Sluggers) — hold a Chicago dog, eat it in three bites: munch,
  crumbs at your feet, "no ketchup. obviously." A fresh one appears next hold.
- **Old Style** (Sluggers) — the favor prop, now buyable; carry one up to the
  Sheffield rooftop and rest it on the DRINK RAIL for the toast beat (pays).
- **museum coffee** (the cart) — hold it and steam curls off; a 25 s pep in
  your step (speedMult 1.22, never stomping a Divvy/vehicle multiplier).
- **kite** (the kiosk) — your OWN kite; Cricket Hill's summit flight flies it
  (montrose-kite reads the bag), and launches now pay.
- **boombox-to-go** (LOLLA MERCH) — the beach boombox's radio engine, in your
  hand, anywhere; R cycles the same six stations (progression `radioApi`).
- **skip-stone pouch** (the kiosk) — skip stones at ANY water's edge, not just
  the Rocks piles; same `stones` payout, infinite flat ones.
- **popcorn / tennis ball** — the 078 pilots, unchanged (bird lure / universal
  fetch).
- **sea glass** (found, never sold) — beachcombing spots on the dog beach and
  Montrose Beach sand; four colors, a journal page, colors persist.
- **smashed pennies** (MADE at the museum cart) — insert 1 dib, crank the
  wheel (the crank matters more than the penny), keep the souvenir; four
  designs (the Bean · a lion · the clock tower · the plover), journal page,
  designs persist.

### Hats (080 — the cosmetics tier, i.e. the retention system)

Six, sold across the four shops, each a ONE-DRAW merged mesh parented to the
mayor's head (022 mayor-only rules — shared createChibi untouched; survives
sit/squash/skate). The tote equips/unequips; `save.worn` persists the look.
bucket hat 20 (kiosk; 082 lowered 25→20) · paper pirate hat 12 (the kids'
kiosk) · ballcap, Cubs-coded 25 (Sluggers) · flower crown 20 (LOLLA) ·
birder's boonie 22 + winter pom hat 25 (the museum cart — yes, a winter hat
in July; the rink misses you).

### Pilot item behaviors

- **tennis ball** — hold, charge-throw (chargeThrow); ANY dog in the world
  chases the throw and brings it back, tail all the way up. Works at the dog
  beach, works on a trail dog, works anywhere a dog exists.
- **popcorn bag** — hold it and crumbs fall as you walk; bingo-able birds
  flutter in close (the bird-bingo cast) for a few beats. Birder heresy,
  player joy.
- **bucket hat** — the mayor actually WEARS it (parents to the head per the
  022 mayor-only rules; survives sit/squash/walk). Tap again to take it off.

---

## 3. favors — never called quests

Neighbors being neighbors. Named NPCs ask for small helps. In-game copy
NEVER says quest/mission/objective — it says *favor*, *errand*, *help a
neighbor out*.

### Structure: offer → steps → turn-in

- **offer** — a named NPC you talk to (the interaction label makes it human:
  "what's up?" not "accept quest"). Saying yes adds a line to the journal's
  **to-do** section, written as the neighbor said it — directions in Chicago
  voice ("Sluggers. Up at Wrigley. Take the Belmont L."), never a map marker.
- **steps** — 1–3 small verbs using systems the game already has (ride,
  carry, throw, find). Each step flips the to-do line's hint. No timers, no
  fail states — drop the beer and the guy laughs.
- **turn-in** — return to the giver; a little celebrate beat (toast + dibs +
  sometimes an item/line unlock). The to-do line moves to a quiet "done"
  state with a ✓ (it stays one session, then retires from the journal).

### The pilot favor (078): "an Old Style for the Malört guy"

The Malört guy — a man who drinks paint thinner recreationally — asks you to
fetch him a CHASER. From Sluggers. In Wrigleyville. You ride the L holding a
beer for him. That's the whole game in one errand: cross-neighborhood travel,
a held prop, a named neighbor, a punchline.

- offer: at the Malört guy. steps: (1) get an Old Style at Sluggers (the
  counter has it "for HIM? …tell him he still owes me"), (2) bring it back.
- reward: +12 dibs, his "burnt band-aid" toast, and a **duet line** unlock —
  from then on he'll occasionally offer to split one WITH you (a new
  interaction line in his pool; the handshake, reversed).

081 scales this to ~10 favors + date-seeded rotation + the Mayor-for-Real
stamp questline; this framework (register/offer/advance/complete + journal
to-do + persistence by favor id) is what it rides on.

---

## 4. persistence — the save

**Constraint 5 relaxed by owner directive (2026-07-16, recorded in PITFALLS
and store.js):** progress persists via ONE guarded adapter in `src/store.js`.
Try localStorage; feature-detect ONCE with a real write probe; on any
failure fall back silently to in-memory (claude.ai artifact context degrades
to session-only). Never throw, never branch gameplay on it, never nag.

- **Key:** `ope.save.v1` (one JSON blob; flags from 077's onboarding
  absorbed into it — legacy `ope.coach.v1`-era keys migrate in on first load).
- **Write:** debounced (~600 ms) on change + a best-effort flush on
  `visibilitychange`/`pagehide`. **Read:** once on boot, before packs run.
- **Corrupt/versioned:** bad JSON or unknown `v` → fresh save, silently
  (082 adds the migration stub + tests). Schema version bumps, never
  in-place migrations of live fields.

### Schema v1 — no coords, no derived world state, ever

Saves must survive map reworks (084 will move the whole north shore) — so
the blob holds only names, ids and numbers:

```json
{
  "v": 1,
  "dibs": 23,
  "bag": { "tennis-ball": 1, "popcorn": 1 },
  "worn": "bucket-hat",
  "favors": { "oldstyle": { "st": "done", "step": 2 } },
  "zones": ["Belmont Harbor", "Dog Beach"],
  "counters": { "dogsEaten": 2, "bests.discRally": 7 },
  "flags": { "coach": 1, "hat": 1 }
}
```

- `bag` — item id → count (cosmetics owned live here too; `worn` is which
  cosmetic is equipped).
- `favors` — favor id → `{st: "active"|"done", step}`.
- `zones` — zone NAMES visited (journal progress; names are stable, coords
  are not).
- `counters` — a WHITELIST of journal numbers (counts + bests, incl. bird
  bingo's seen species). The framework snapshots whitelisted `state` fields on
  a slow throttle; packs never touch the save directly. 079 added `dibsBy` (the
  label→total ledger) alongside `paidFirsts` (the once-ever payout set). A pack
  needing a new persisted counter must extend framework `buildSnap()` AND the
  module-scope restore list — there is no pack-side persistence.
- `flags` — small seen-it bits (077 coach marks, first-dibs, etc.).

**What never goes in:** positions, world-layout anything, rng state, session
scratch (speedMult, held item), anything a pack derives at runtime.

---

## 5. framework API (078 ships; later tasks consume)

- `wallet.dibs` · `wallet.earnDibs(n, reason, label)` · `wallet.spendDibs(n, reason) -> bool`
  — earn pulses the chip (`+3 dibs · reason`); first-ever earn gets the big
  toast; spend refuses (gentle shake, no toast spam) when short. `label` (079)
  buckets the earn in the `state.dibsBy` ledger.
- `wallet.pay({key, first, repeat, reason, firstReason, label, cd}) -> paid` — the
  shared payout helper. First time for `key` pays `first` (persisted via
  `state.paidFirsts`); repeats pay `repeat`, halving (min 1) after ~10 paid
  repeats of that key per session. Activities call THIS, not earnDibs.
  - `label` (079) — ledger bucket for the journal's biggest-earner line
    (defaults to `key`). Short, human, lowercase: `birdwatch`, `mini golf`.
  - `cd` (079) — min seconds between PAID REPEATS of this key; the anti-spam
    valve. The first-ever payout is never throttled.
  - Returns the amount paid, or **0** when throttled or when `repeat` is 0/absent
    — which is how a once-ever beat (a zone, a collection) goes quiet forever
    instead of trickling.
- **The register coalesces** (079): two payouts inside 0.4 s of game time sum
  into ONE pop and keep the LATER reason. Completion beats almost always pay on
  the same frame as the increment that completed them (last bird + BINGO, last
  dock + the network), and two raw pops in a frame would show the first for
  ~0 ms. Packs need do nothing — just pay both.
- `addSitSpot({x,z,ry,y?,r?,label?,onSit?})` — `onSit(player)` (079) fires after
  the sit lands, for packs hanging a beat off it. Use it instead of patching the
  returned handle's `onUse`.
- **Journal sections may return `''`** (079) to hide their own header, which lets
  a section register EAGERLY (holding a fixed slot in the journal's order) while
  staying invisible until it has something to say. The `dibs` section is the
  first user: it sits directly under `Ope!` and renders nothing until the first
  dib is earned. Lazily-registering a section instead sorts it differently on a
  fresh boot than on a returning one — packs register during `onWorldReady`.
- `bag.define(item)` · `bag.add(id)` · `bag.has(id)` · `bag.count(id)` ·
  `bag.remove(id)` · `bag.equip(id)/unequip()` — items are defined by packs
  (icon, caption, onUse); the tote renders whatever's defined + owned.
- `shop.open({title, keeper, items:[{id, price}]})` — the framework shop
  card (list, prices, owned states, buy = spendDibs + bag.add). The beach
  kiosk is the pilot; 080 reuses it for all four shops.
- `favors.register(def)` · `favors.offer(id)` · `favors.advance(id)` ·
  `favors.complete(id)` — journal to-do wiring + turn-in celebrate included.
- `registerFetchDog(adapter)` / `fetchDogs` — the dog registry the tennis ball
  scans (adapter contract documented in framework.js). 078 registered five:
  the hero beach dog, both dog-park dogs (real fetches), and both leashed
  trail dogs (they lunge to the leash end and give up — that's the joke).
  The pilot kiosk stands at (100,−353) on the dog-beach approach.

Determinism: none of this touches the world rng. Draw budget: DOM UI +
holdItem meshes only (~0). Both inputs, always.

---

## 6. SIGN-OFF — the fun layer ships as a reviewed feature (082)

The economy arc (078 framework/pilot → 079 every-activity-pays → 080 shops/
catalog/hats → 081 favors+questline → 082 balance/save/polish) is CLOSED and
ships to the same bar as a neighborhood. 082 verified the whole arc end to end
this session (081's favors had never been committed — parked after 3 sessions
fought a set of TEST artifacts, not game bugs; the mechanics were sound):

- **The favors + Mayor-for-Real questline WORK, verified end to end**
  (`tools/tmp-081-master-verify.mjs`, ALL PASS): date-seeded rotation matches the
  offline replica across sample days; zone discovery + the "Around the
  neighborhood" board (Sal/Reggie/Gus + the tomorrow hook); the pilot favor
  (swig → the L up → Sluggers → the L back → deliver, +12); the Divvy-angel
  favor (offer → wheel 3 strays → dock 3 → turn-in, +12); the lakefront CITY
  STAMP (2 favors + the skipped-stone signature → +8) and the Mayor-for-Real row
  flipping to "✓ stamped". Zero console errors; the gull close-up ≤ 480 draws.
- **Turn-in celebrations no longer bury**: `toast(main,sub,jump)` — a favor
  turn-in clears the incidental-toast backlog and lands NOW (`favors.complete`).
- **Save integrity** (`tools/walkprobe.mjs` save section + `tools/tmp-082-save.mjs`):
  a schema-migration mechanism (v0→v1 proven; a gap / future version → fresh),
  corrupt JSON / unknown version → a fresh save + ONE gentle "starting fresh"
  toast (never a crash, never a nag); economy state + worn hat + favor progress +
  stamps round-trip through a real reload; private-browsing / artifact contexts
  degrade silently to in-memory (no console error, no nag).
- **Balance FINALIZED** (§1): measured session-1 income; the milestone bucket hat
  lowered 25→20 so a normally-engaged first session earns its first hat; two known
  payout leaks kept as deliberate err-generous calls.
- **UI polish**: tote (empty + full), the four shops, and the journal economy/
  to-do/neighbors sections read clean at 390 px and 1280 px; the coin pop never
  overlaps the interaction pill (all-pairs rect sweep, both orientations); the
  shop close-× no longer crowds a long title.
- **No regression**: walkprobe 737/737, single-file build 1,640 kB, worst
  standing view 428/480, determinism 0.309 % vs baseline (gate 0.828 %), zero
  console errors. The world rng is untouched; every change is DOM/save/data only.

The arc is done. Nobody logs off wearing a bucket hat they didn't earn.
