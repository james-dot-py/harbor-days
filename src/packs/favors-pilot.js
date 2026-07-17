// =====================================================================
//  FAVORS — PILOT (task 078): "an Old Style for the Malört guy"
//  The whole game in one errand: cross-neighborhood travel (ride the L up to
//  Wrigley), a held prop (a cold Old Style), a named neighbor (the Malört guy
//  on the Belmont Rocks), and a punchline. This is the FIRST favor built on
//  the framework's favors/bag/wallet economy (ECONOMY.md §3): offer → steps →
//  turn-in, Chicago voice, zero fail states, never the word "quest".
//
//  Flow:
//   1. drink a Malört WITH the guy (the shared straight shot) → he asks a favor.
//   2. ride the Belmont L to Addison, duck into SLUGGERS on Clark, grab a cold
//      Old Style ("for HIM? …tell him he still owes me"). It rides in your hand
//      on the L back.
//   3. hand it to him on the Rocks → BURNT BAND-AID toast, +12 dibs, and he
//      unlocks a DUET: from then on he'll occasionally offer to split one WITH
//      you (the handshake, reversed — Old Style AND Malört in his two hands).
//
//  Only-my-file rules: this pack owns favors-pilot.js, minimal hooks in
//  characters.js (malortHooks), and one import line in packs/index.js. ALL
//  setup inside onWorldReady; Math.random only (never the world rng). New draws
//  are exactly the delivered can on the guy (+1 frustum-culled mesh) and the
//  held can (holdItem) — no others. Persistence rides the framework save
//  (favors/bag); store.js is never touched here.
//
//  DEBUG (tools / E2E only): window.__hd.oldstyle.forceDuet = true forces the
//  "split one?" duet on the next Malört-guy press once the favor is done.
// =====================================================================
import * as THREE from 'three';
import { bmat } from '../core.js';
import { onWorldReady, registerUpdate, addInteraction, holdItem, toast, favors, bag, wallet } from '../framework.js';
import { pourMalort, oldStyleTex } from './malort.js';   // shared swig + Old Style label (task 031)
import { malortHooks } from './characters.js';            // set in characters.js's onWorldReady (runs earlier in import order)

const canGeo = () => new THREE.CylinderGeometry(0.055, 0.055, 0.16, 12);
const newCan = () => new THREE.Mesh(canGeo(), bmat(0xffffff, { map: oldStyleTex() }));

onWorldReady(() => {
  // ---- 1) register the favor (journal to-do + turn-in celebrate live here) ----
  favors.register({
    id: 'oldstyle',
    title: 'an Old Style for the Malört guy',
    giver: 'the Malört guy',
    reward: 12,
    todo: [
      "grab a cold Old Style at Sluggers — up at Wrigley. take the Belmont L.",
      "bring the cold one back to the Malört guy on the Rocks.",
    ],
    doneToast: { main: 'BURNT BAND-AID', sub: 'a cold Old Style, delivered' },
  });

  // ---- 2) the held prop: a cold Old Style can ----
  const oldStyleDef = bag.define({
    id: 'old-style', name: 'Old Style (cold)', icon: '🍺', kind: 'holdable',
    caption: 'for the Malört guy — still cold',
    onUse() {
      const can = newCan();
      can.position.set(0, 0.05, 0);
      holdItem(can);
    },
    onStow() {},
  });

  // ---- 3) OFFER: the first shared shot earns the errand ----
  malortHooks.onSwigDone = () => {
    if (favors.at('oldstyle').st === 'none') {
      if (malortHooks.guy) malortHooks.guy.say("do me a solid? a COLD Old Style — from Sluggers, up at Wrigley. take the L.", 4.5);
      favors.offer('oldstyle');   // shows its OWN toast + journal to-do (don't duplicate)
    }
  };

  // ---- 4) SLUGGERS STEP (Wrigleyville — Clark St storefront) ----
  // The Sluggers bar's street door, on the west lip of the walkable Clark
  // corridor (anchor verified street-level y=0 via walkableW). The rooftop
  // batting-cage PAD sits ~11 m away AND up on the roof, so this street prompt
  // never fights it; the plaza / marquee / box-office prompts are all 50 m+ east.
  const DOOR = { x: -325.5, z: -481.5 };
  const sluggersInter = addInteraction({
    x: DOOR.x, z: DOOR.z, r: 2.4,
    label: 'duck in — a cold Old Style (for the Malört guy)',
    onUse() {
      const f = favors.at('oldstyle');
      if (f.st !== 'active' || f.step !== 0) return;   // belt + suspenders (the throttle also gates enabled)
      bag.add('old-style');
      oldStyleDef.onUse();                             // the can rides home in your hand
      toast('"for HIM? …tell him he still owes me"', 'Sluggers, on Clark');
      favors.advance('oldstyle');                      // step 0 → 1 (bring it back)
    },
  });
  sluggersInter.enabled = false;

  // keep the door prompt live only while the errand's FIRST step is open (~0.5 s throttle)
  let doorAcc = 0;
  registerUpdate((dt) => {
    doorAcc -= dt;
    if (doorAcc <= 0) {
      doorAcc = 0.5;
      const f = favors.at('oldstyle');
      sluggersInter.enabled = (f.st === 'active' && f.step === 0);
    }
  });

  // ---- 5) TURN-IN + DUET: intercept the Malört-guy press ----
  const DUET_LINE = "we split one, you and me. a real one.";
  let duetNext = false, duetArmT = 0, prevCool = 0;
  const forceDuet = () => { try { return !!(window.__hd && window.__hd.oldstyle && window.__hd.oldstyle.forceDuet); } catch (e) { return false; } };
  const rollDuet = () => { duetNext = Math.random() < 0.34; };            // ~1/3, decided on cooldown RESET
  const doneLabel = () => ((duetNext || forceDuet()) ? 'split one?' : 'burnt band-aid?');

  // the completed-favor look: the Old Style rides in HIS left hand (handR still
  // holds his Malört bottle) — the handshake, reversed. Idempotent so it's exactly
  // +1 mesh whether it arrives via delivery or a fresh 'done' reload.
  function giveGuyCan() {
    const guy = malortHooks.guy;
    if (!guy || guy.__oldStyleCan) return;
    const can = newCan();
    can.position.set(0, 0.06, 0.04);   // small handL-local offset, mirroring his bottle in handR (keep it SMALL — PITFALLS held-prop)
    guy.parts.handL.add(can);
    guy.__oldStyleCan = can;
  }

  function deliver() {
    const guy = malortHooks.guy, inter = malortHooks.inter, swig = malortHooks.swig;
    bag.remove('old-style');
    holdItem(null);                    // the can leaves your hand (no-op if it was stowed in the tote)
    giveGuyCan();                      // ...and into HIS left hand
    if (guy) {
      guy.setFace('happy');
      guy.say("attaboy. Old Style AND Malört — that's the handshake, reversed.", 4.5);
      if (guy.lines.indexOf(DUET_LINE) < 0) guy.lines.push(DUET_LINE);   // new bump line in his pool
    }
    favors.complete('oldstyle');       // BURNT BAND-AID gold toast + +12 dibs
    rollDuet();
    if (inter) inter.setLabel(swig && swig.cool > 0 ? '...one more?' : doneLabel());
  }

  malortHooks.intercept = (player) => {
    const guy = malortHooks.guy, swig = malortHooks.swig, inter = malortHooks.inter;
    if (!guy || !swig || !inter) return false;         // hooks not wired (shouldn't happen post-worldReady)
    const f = favors.at('oldstyle');
    // TURN-IN — carrying the cold one back on step 1
    if (f.st === 'active' && f.step === 1 && bag.has('old-style')) { deliver(); return true; }
    // DUET — favor done, an occasional "split one WITH me"
    if (f.st === 'done' && !swig.busy && swig.cool <= 0 && (duetNext || forceDuet())) {
      swig.busy = true; duetArmT = 2.2;
      pourMalort({ npc: guy, react: 'to the lake.', toastMain: 'CHICAGO HANDSHAKE', toastSub: 'split one with the Malört guy',
        // the dib lands on the RECOVERY beat (onDone, ~1.3 s after the toast) —
        // the punchline of the duet, not the button press
        onDone() { swig.busy = false; swig.cool = 28; inter.setLabel('...one more?');
          wallet.pay({ key: 'handshake', first: 8, repeat: 2, reason: 'the Handshake: survived it',
            firstReason: 'you survived the Handshake', label: 'the Handshake', cd: 8 }); } });
      return true;
    }
    return false;                                       // otherwise the default straight shot runs
  };

  // per-frame hook — runs at the END of the guy's rePose (after his default label
  // logic), so it can refine the 'done' label + raise the can arm during a duet.
  malortHooks.rePose = (dt, t) => {
    const guy = malortHooks.guy, swig = malortHooks.swig, inter = malortHooks.inter;
    if (!guy || !swig || !inter) return;
    if (prevCool > 0 && swig.cool <= 0 && favors.at('oldstyle').st === 'done') {   // cooldown just reset → re-decide
      rollDuet(); inter.setLabel(doneLabel());
    }
    prevCool = swig.cool;
    if (duetArmT > 0) {                                 // lift his left (can) arm during a duet swig (~2 s)
      duetArmT -= dt;
      guy.parts.armL.rotation.x = -1.15;
      guy.parts.armL.rotation.z = 0.14;
    }
  };

  // ---- persistence: a fresh session ALREADY 'done' → duet + line + his can live now ----
  const f0 = favors.at('oldstyle');
  if (f0.st === 'done') {
    giveGuyCan();
    if (malortHooks.guy && malortHooks.guy.lines.indexOf(DUET_LINE) < 0) malortHooks.guy.lines.push(DUET_LINE);
    rollDuet();
    if (malortHooks.inter) malortHooks.inter.setLabel(doneLabel());
  }

  // ---- debug knob (tools / E2E only; harmless in play — defaults false) ----
  try {
    window.__hd = window.__hd || {};
    window.__hd.oldstyle = {
      forceDuet: false,                                    // force the "split one?" duet on the next done-press
      at: () => favors.at('oldstyle'),
      lines: () => (malortHooks.guy ? malortHooks.guy.lines.slice() : []),
      guyHasCan: () => !!(malortHooks.guy && malortHooks.guy.__oldStyleCan),
    };
  } catch (e) {}
});
