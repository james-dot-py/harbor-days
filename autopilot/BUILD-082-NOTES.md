# BUILD-082 working notes (economy arc close-out)

## Inherited state (CRITICAL)
- 081 (favors at scale) was PARKED after 3 failures, but its ~1900 lines of
  implementation are UNCOMMITTED in the tree (favors-core/-lakefront/-wrigley/
  -downtown/-montrose.js, mayor-for-real.js + hooks in characters/lolla/
  montrose-point/skating/wrigley-bowl/wrigley-game/index.js). It BUILDS clean.
- result.json still reads 080 (last green). The parking commit only moved the
  task file to queue/parked/.
- 082 CANNOT close the arc while favors are unverified. Decision: verify the
  whole arc adversarially, fix real bugs, ship 081 favors + 082 close-out
  together as one green arc (or file honestly if unfixable in budget).

## The 081 master verify (tools/tmp-081-master-verify.mjs) — 11 "failures" TRIAGED
Ran it. Failures are MOSTLY TEST ARTIFACTS, not game bugs:
- **C1 oldstyle delivery WORKS** — proven in isolation (tools/tmp/082-c1-iso.mjs):
  at (156,90) with fav=active/step1 + bag.has('old-style'), press E => st='done',
  dibs +12. The master-verify FAILED because after the L ride back, the player is
  deposited at the Belmont board and the arrival sequence FIGHTS an immediate
  tele(156,90); pressing E rode the L again ("RED LINE — 95TH BOUND"). A real
  player WALKS from board to guy — no teleport-lock. Test needs a settle/re-tele
  after L arrival before delivering.
- **C2 divvyangel turn-in WORKS** — +12 reward paid (dibs 27->39). The 'DIVVY
  ANGEL / three bikes home' toast assert lost to a coincident 'DIVVY DOCK N/8'
  discovery toast (docking a stray at a real Divvy dock also discovers it).
  REAL UX NIT: the favor turn-in celebration should win over the payout toast.
- **C3 stamp** cascaded from C1 not completing IN THE TEST (only 1 of 2 lakefront
  favors done). Need to verify the stamp fires when 2 favors genuinely complete.
- **B zone-discovery on stationary spawn** (dibs=0 after 10s at a stationary
  AIDS-Garden spawn) — likely needs movement into a zone; real players move.
  Verify it's real-play-fine (first dib within seconds of walking).
- E: zero console errors, zero [framework]/[econ] warns, all canaries echoed.

## 082 deliverables (from task acceptance)
1. BALANCE — simulate fresh player's 3 sessions; can they afford bucket hat (25) in
   session 1; favor reward feels generous; no repeat-grind. Tune ECONOMY.md rates/
   prices; record final table. Rule: err generous (halve price / double smile).
2. SAVE INTEGRITY — corrupt-save guard (bad JSON/wrong version -> fresh + gentle
   toast, never crash); schema-migration stub proven with a v0->v1 test; save/load
   round-trip in a NEW walkprobe section (economy state, worn hat, favor progress,
   stamps); private-browsing + artifact silent-fallback verified (no nag/console err).
   NOTE store.js today: bad JSON + unknown v already -> fresh blob SILENTLY (no
   toast, NO migration path — any v!=1 discarded). Must ADD: migrations map,
   corrupt-recovery flag -> post-boot gentle toast, round-trip test.
3. UI POLISH — tote/shop/favor UI at 390px + 1280px (READ shots); coin toast never
   stacks over the interaction pill; journal economy + to-do sections read clean.
4. REGRESSION SWEEP — full walkthrough/walkprobe/gridsweeps/budgets; zero console err.
5. PITFALLS + ECONOMY.md updated; sign-off addendum appended (arc = reviewed feature).

## File ownership (avoid executor collisions)
- store.js + framework.js (save core + corrupt toast + turn-in banner) => MAIN THREAD
- index.html CSS (HUD/tote/shop polish) => one executor
- tools/walkprobe.mjs (round-trip section) => one executor (after save core lands)
- ECONOMY.md / PITFALLS.md (docs + balance table) => MAIN THREAD
- favor packs => touch only for real polish, verify in real play
