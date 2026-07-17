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

### Pilot rates (078 — the seed table; 079/082 extend + tune)

| moment                                       | dibs |
|----------------------------------------------|------|
| skip stones: first good skip ever (≥3)       | +5   |
| skip stones: a good skip (≥3 skips)          | +2   |
| skip stones: a beauty (≥6 skips)             | +3   |
| cornhole: first bago you witness up close    | +5   |
| cornhole: call a bago from the rail          | +2   |
| favor: an Old Style for the Malört guy       | +12  |

Cornhole note (078 reality check): today's cornhole is an ambient NPC-vs-NPC
match — the player doesn't throw. The pilot payout is a SPECTATOR beat: be
within ~12 m when a bago drops and you "called it" (+2, first +5). If a
later task makes cornhole playable, the rates upgrade to thrown-bag payouts;
until then, paying the watcher is the cozy read (you cheered, you get a dib).

Per-session repeat throttle (079 formalizes; pilot uses it for stones +
cornhole): an activity's repeat payouts halve after ~10 paid repeats in a
session (min +1). Never zero — a trickle still smiles.

### Pilot prices (beach kiosk)

| item        | dibs | why this price                                    |
|-------------|------|---------------------------------------------------|
| popcorn bag | 5    | first purchase — buy it the session you find it   |
| tennis ball | 8    | a toy you keep forever; still session-one money   |
| bucket hat  | 25   | the saver item — one good session, per 082's bar  |

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
  bingo's seen-species count/state fields once 079 wires payouts). The
  framework snapshots whitelisted `state` fields on a slow throttle; packs
  never touch the save directly.
- `flags` — small seen-it bits (077 coach marks, first-dibs, etc.).

**What never goes in:** positions, world-layout anything, rng state, session
scratch (speedMult, held item), anything a pack derives at runtime.

---

## 5. framework API (078 ships; later tasks consume)

- `wallet.dibs` · `wallet.earnDibs(n, reason)` · `wallet.spendDibs(n, reason) -> bool`
  — earn pulses the chip (`+3 dibs · reason`); first-ever earn gets the big
  toast; spend refuses (gentle shake, no toast spam) when short.
- `wallet.pay({key, first, repeat, reason, firstReason}) -> paid` — the shared
  payout helper 078 shipped: first time for `key` pays `first` (persisted via
  `state.paidFirsts`); repeats pay `repeat`, halving (min 1) after ~10 paid
  repeats of that key per session. Activities call THIS, not earnDibs.
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
