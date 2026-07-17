// =====================================================================
//  FAVORS — DOWNTOWN (task 081): three neighbors in the Millennium cell.
//    * chalkbag  — Theo dropped his chalk off the skating ribbon; FIND it
//      (a small white bag out past the ribbon's north lobe) and bring it back
//      to the climbing wall.
//    * drumstick — the Lolla drummer chucked his LUCKY stick into the crowd;
//      find it in the field, then THROW it back up onto the Petrillo deck —
//      the drummer catches it (arm-up + rimshot). Reward: the 'drumstick' toy.
//    * recipeglide — Bev (the Malört guy's cousin) hands you Gram's laminated
//      recipe on the McCormick ice; SKATE it across to her sister Dot at the
//      far end. Skate too close to a rink skater mid-carry and it skitters —
//      Bev laughs, you pick it up, no fail, ever.
//
//  Structure copies the pilot (favors-pilot.js): register + rotation.join in
//  onWorldReady regardless (saves mid-favor always work), gate the OFFER on
//  rotation.offerable, gate mid-favor interactions on favors.at. Directions
//  live in DIALOGUE + the journal to-do — never a map marker. No timers, no
//  fail states, never the word "quest". Math.random only (never the world rng).
//
//  Only-my-file rules: this pack + tiny ADDITIVE hooks (lolla.js `bandHooks`,
//  skating.js `skaterHooks` — exported handles, zero behavior change) + one
//  import line in packs/index.js (the orchestrator wires it). Props are one-off
//  frustum-culled meshes on millenniumRoot (cell-culled for free); ZERO new
//  InstancedMesh buckets. Audio synthesized + getAudioCtx()-guarded.
//
//  DEBUG (tools / E2E): window.__hd.f081.{chalkbag,drumstick,recipeglide}.
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, registerUpdate, addInteraction, makeNPC, holdItem,
         chargeThrow, camForward, toast, favors, bag, wallet, getAudioCtx, state } from '../framework.js';
import { toon, bmat, clamp } from '../core.js';
import { mayor, mparts } from '../character.js';
import { activeCell } from '../cells.js';
import { millenniumRoot } from '../millennium/index.js';
import { rotation } from './favors-core.js';
import { RINK_M } from '../data/millennium.js';
import { bandHooks } from './lolla.js';       // the drummer rig (set in lolla's onWorldReady, runs earlier)
import { skaterHooks } from './skating.js';   // the rink skater groups (set earlier)

const ICE_Y = RINK_M.ice.y;                   // −1.6

// ---- fixed placements (verified walkable + clear of waypoint stands) ------
const THEO      = { x: 260, z: 753 };         // south face of climbing Wall A (mid-plaza walk)
const CHALK_BAG = { x: 264, z: 729.5 };       // fieldhouse esplanade, just N of the ribbon's north lobe
const DRUM_OFFER = { x: 224, z: 998 };        // crowd side of the rail, on the stage-mouth axis
const STICK0    = { x: 240, z: 990 };         // out in the Lolla crowd field (walkable)
const STAGE     = { x0: 212, x1: 232, z0: 1002, z1: 1018, deckY: 1.6, catchZ: 1004 }; // Petrillo deck footprint (generous)
const BEV       = { x: 67, z: 782.3 };        // rink NORTH end (best clearance off looper tops + beginner edge)
const DOT       = { x: 72, z: 816.5 };        // rink SE corner (clear of the mp-rink-overlook f2 camera cone)

// ================================ props ================================
// small one-off meshes (cached toon materials; each is +1 frustum-culled draw)
function makeChalkBag() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 9, 8), toon(0xf6f4ee)); body.scale.set(1, 0.92, 1);
  g.add(body);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.093, 0.093, 0.028, 12), toon(0x6b4a2e)); belt.position.y = -0.01;
  g.add(belt);
  return g;
}
function makeStick() {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.016, 0.34, 8), toon(0xceb083)); g.add(shaft);
  const tape = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 10), toon(0xe8e0cf)); tape.position.y = -0.12; g.add(tape);
  return g;
}
function makeCard() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.19, 0.008), bmat(0xf1e6c8)));
  return g;
}

// ============================== audio ==================================
function rimshot() {   // the drummer's catch — a snappy snare + tick (guarded)
  const A = getAudioCtx(); if (!A.actx) return; const c = A.actx, t = c.currentTime;
  if (A.noiseBuf) {
    const s = c.createBufferSource(); s.buffer = A.noiseBuf;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.9;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    s.connect(bp); bp.connect(g); g.connect(A.sfxBus); s.start(t); s.stop(t + 0.16);
  }
  const o = c.createOscillator(), og = c.createGain(); o.type = 'square'; o.frequency.value = 320;
  og.gain.setValueAtTime(0.12, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  o.connect(og); og.connect(A.sfxBus); o.start(t); o.stop(t + 0.1);
}
function drumTicks() {   // the air-drum toy — two woodblock ticks (guarded)
  const A = getAudioCtx(); if (!A.actx) return; const c = A.actx, t = c.currentTime;
  [0, 0.17].forEach((dl, i) => {
    const o = c.createOscillator(), g = c.createGain(), t0 = t + dl;
    o.type = 'square'; o.frequency.setValueAtTime(i ? 1500 : 1250, t0); o.frequency.exponentialRampToValueAtTime(i ? 900 : 760, t0 + 0.05);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.1, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
    o.connect(g); g.connect(A.sfxBus); o.start(t0); o.stop(t0 + 0.09);
  });
}

// =====================================================================
onWorldReady(player => {
  let PLAYER = player;

  // ---- register the three favors + join the daily rotation (always) ----
  favors.register({ id: 'chalkbag', title: 'the ribbon ate my chalk', giver: 'Theo', reward: 10,
    todo: ["find Theo's chalk bag — it bounced off the ribbon, out past the north lobe",
           "bring the chalk bag back to Theo at the climbing wall"],
    doneToast: { main: 'CHALKED UP', sub: 'the snowball with a belt, recovered' } });
  rotation.join({ id: 'chalkbag', giver: 'Theo', where: 'by the climbing wall, Maggie Daley', hood: 'downtown' });

  favors.register({ id: 'drumstick', title: 'the lucky stick', giver: 'the drummer', reward: 12,
    todo: ["find the drummer's lucky stick — the crowd kept it, out in the field",
           "throw the stick back up onto the stage"],
    doneToast: { main: 'LUCKY STICK', sub: 'back mid-set, no dropped beat' } });
  rotation.join({ id: 'drumstick', giver: 'the drummer', where: 'stage-front at Lolla, Butler Field', hood: 'downtown' });

  favors.register({ id: 'recipeglide', title: 'the family recipe, on ice', giver: 'Bev', reward: 12,
    todo: ["skate Gram's recipe across to Dot at the far end of the rink",
           "glide the recipe back to Bev"],
    doneToast: { main: 'FAMILY RECIPE', sub: 'delivered. still illegible.' } });
  rotation.join({ id: 'recipeglide', giver: 'Bev', where: 'out on the McCormick rink ice', hood: 'downtown' });

  // =====================================================================
  //  NPCs — Theo (kid), Bev + Dot (on the ice)
  // =====================================================================
  const theo = makeNPC({ x: THEO.x, z: THEO.z, ry: 0.4, scale: 0.58, name: 'Theo',
    palette: { suit: 0x4db3e0, pants: 0x2f6f4a, skin: 0xe8b48c, hair: 0x3a2416, face: true },
    lines: ['is my chalk down there?', 'the wall guys pretend not to see me', 'I can do the crescent, almost'] });

  const bev = makeNPC({ x: BEV.x, z: BEV.z, ry: 0, name: 'Bev',
    palette: { suit: 0x6a8f3a, pants: 0x2b2b31, skin: 0xe0a878, hair: 0x2a1c12, face: true },
    lines: ['my cousin drinks the paint thinner, not me', "it's laminated, it'll be FINE", 'Gram skated til she was 90'] });
  bev.group.position.y = ICE_Y;                       // stand on the sunken ice (like the skating rigs)

  const dot = makeNPC({ x: DOT.x, z: DOT.z, ry: Math.PI, name: 'Dot',
    palette: { suit: 0x9a4b6e, pants: 0x33272b, skin: 0xdca07a, hair: 0x241610, hairStyle: 'bun', face: true },
    lines: ["did Bev send you? of course she did", 'three parts Malört, one part regret', 'careful on the ice, hon'] });
  dot.group.position.y = ICE_Y;

  const THEO_BUMP = "I mostly eat the chalk. don't tell the wall guys.";

  // =====================================================================
  //  world props (cell-culled on millenniumRoot; toggled by favor state)
  // =====================================================================
  const bagWorld = makeChalkBag(); bagWorld.position.set(CHALK_BAG.x, 0.1, CHALK_BAG.z); bagWorld.visible = false; millenniumRoot.add(bagWorld);
  const stickWorld = makeStick(); stickWorld.rotation.z = Math.PI / 2; stickWorld.position.set(STICK0.x, 0.08, STICK0.z); stickWorld.visible = false; millenniumRoot.add(stickWorld);
  const cardWorld = makeCard(); cardWorld.rotation.x = -Math.PI / 2; cardWorld.position.set(DOT.x, ICE_Y + 0.05, DOT.z); cardWorld.visible = false; millenniumRoot.add(cardWorld);

  // ---- live prop state (session scratch — never persisted) ----
  let stickState = 'none';                  // none | crowd | held | flying | landed | caught
  const stickPos = { x: STICK0.x, z: STICK0.z };
  const fly = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
  let cardState = 'none';                    // none | inhand | sliding | landed
  const cardPos = { x: DOT.x, z: DOT.z };
  const cardVel = { x: 0, z: 0 };
  let fumbleCount = 0, fumbleGrace = 0, airDrumCount = 0;
  let catchArmT = 0, airDrumT = 0;
  const AIR_DUR = 0.5, CATCH_DUR = 1.6;
  let lastHeckleT = -99, lastLaughT = -99;

  // =====================================================================
  //  CHALKBAG
  // =====================================================================
  function grabBag() {
    const f = favors.at('chalkbag'); if (f.st !== 'active' || f.step !== 0) return;
    bag.add('chalk-bag');
    const m = makeChalkBag(); m.position.set(0, 0.02, 0.03); holdItem(m);
    bagWorld.visible = false;
    favors.advance('chalkbag');                     // step 0 -> 1 (bring it back)
    theo.say('YES. you found it! bring it up here.', 4);
  }
  bag.define({ id: 'chalk-bag', name: "Theo's chalk bag", icon: '🧗', kind: 'holdable',
    caption: 'a snowball with a belt — for the kid at the wall',
    onUse() { const m = makeChalkBag(); m.position.set(0, 0.02, 0.03); holdItem(m); }, onStow() {} });

  function turnInChalk() {
    bag.remove('chalk-bag'); holdItem(null);
    theo.setFace('happy');
    theo.say("that's the one. you're alright.", 4);
    if (theo.lines.indexOf(THEO_BUMP) < 0) theo.lines.push(THEO_BUMP);
    favors.complete('chalkbag');                     // CHALKED UP + 10 dibs
  }

  const theoInter = addInteraction({ x: THEO.x, z: THEO.z, r: 1.6, label: "what's up, Theo?", onUse() {
    const f = favors.at('chalkbag');
    if (f.st === 'none' && rotation.offerable('chalkbag')) {
      theo.say("dropped my chalk bag off the ribbon. it's down SOMEWHERE — white bag, looks like a snowball with a belt.", 5.5);
      favors.offer('chalkbag');                      // offer shows its own toast + to-do
      bagWorld.visible = true;
    } else if (f.st === 'active' && f.step === 1 && bag.has('chalk-bag')) turnInChalk();
  } });
  const bagInter = addInteraction({ x: CHALK_BAG.x, z: CHALK_BAG.z, r: 1.4, label: 'grab the chalk bag', onUse() { grabBag(); } });

  // =====================================================================
  //  DRUMSTICK
  // =====================================================================
  function placeStickWorld(x, z) { stickPos.x = x; stickPos.z = z; stickWorld.position.set(x, 0.08, z); stickWorld.visible = true; stickWorld.rotation.z = Math.PI / 2; }
  function grabStick() {
    const f = favors.at('drumstick');
    if (f.st !== 'active' || (stickState !== 'crowd' && stickState !== 'landed')) return;
    stickState = 'held'; stickWorld.visible = false;
    const m = makeStick(); m.position.set(0, 0.02, 0.13); m.rotation.set(0.2, 0, -0.35); holdItem(m);
    if (f.step === 0) favors.advance('drumstick');   // step 0 -> 1 (throw it back)
  }
  function launchStick(power) {
    const fwd = camForward();
    const hs = 6 + 7 * power, vy = 3.6 + 3 * power;
    fly.x = PLAYER.x; fly.y = 1.4; fly.z = PLAYER.z;
    fly.vx = fwd.x * hs; fly.vy = vy; fly.vz = fwd.z * hs;
    stickState = 'flying'; holdItem(null);
    placeStickWorld(fly.x, fly.z); stickWorld.position.y = fly.y; stickWorld.rotation.z = 0;
  }
  function stepFly(dt) {
    fly.vy -= 9 * dt;
    fly.x += fly.vx * dt; fly.y += fly.vy * dt; fly.z += fly.vz * dt;
    stickWorld.position.set(fly.x, fly.y, fly.z); stickWorld.rotation.x += 16 * dt;
    const overDeck = fly.x >= STAGE.x0 && fly.x <= STAGE.x1 && fly.z >= STAGE.z0 && fly.z <= STAGE.z1;
    const groundY = overDeck ? STAGE.deckY : 0;
    if (fly.y <= groundY || fly.z > 1024 || fly.z < 970) {
      if (overDeck && fly.z >= STAGE.catchZ) catchStick();
      else missStick(fly.x, fly.z);
    }
  }
  function catchStick() {
    stickState = 'caught'; stickWorld.visible = false;
    catchArmT = CATCH_DUR; rimshot();
    toast('"still got it."');
    bag.add('drumstick');
    favors.complete('drumstick');                    // LUCKY STICK + 12 dibs + doneToast
  }
  function missStick(x, z) {
    stickState = 'landed';
    placeStickWorld(clamp(x, 226, 300), clamp(z, 942, 1004)); stickWorld.position.y = 0.08;
  }
  bag.define({ id: 'drumstick', name: 'the lucky stick', icon: '🥁', kind: 'holdable',
    caption: 'the spare. taped, lucky, yours', onUse() { holdDrumToy(); }, onStow() {} });
  function holdDrumToy() { const m = makeStick(); m.position.set(0, 0.02, 0.14); m.rotation.set(0.15, 0, -0.35); holdItem(m); }

  const drumInter = addInteraction({ x: DRUM_OFFER.x, z: DRUM_OFFER.z, r: 2.0, label: "you're the drummer?", onUse() {
    const f = favors.at('drumstick');
    if (f.st === 'none' && rotation.offerable('drumstick')) {
      toast('the drummer', '"chucked a stick into the crowd. crowd KEPT it — it\'s my lucky one, got the tape."');
      favors.offer('drumstick');
      stickState = 'crowd'; placeStickWorld(STICK0.x, STICK0.z);
    } else if (f.st === 'active' && f.step === 1 && stickState === 'held') {
      chargeThrow({ onRelease: p => launchStick(p) });
    }
  } });
  const stickInter = addInteraction({ x: STICK0.x, z: STICK0.z, r: 1.4, label: 'grab the lucky stick', onUse() { grabStick(); } });

  // the air-drum toy verb — a priority −1 prompt that FOLLOWS the player while
  // the reward stick is in hand (like "take a bite"); E does a two-hit air-drum.
  const airInter = addInteraction({ x: PLAYER.x, z: PLAYER.z, r: 1.0, priority: -1, label: 'air-drum', onUse() { airDrumT = AIR_DUR; drumTicks(); airDrumCount++; } });

  // =====================================================================
  //  RECIPEGLIDE
  // =====================================================================
  function holdCard() { const m = makeCard(); m.position.set(0, 0.03, 0.05); m.rotation.set(-0.35, 0, 0); holdItem(m); cardState = 'inhand'; cardWorld.visible = false; }
  bag.define({ id: 'family-recipe', name: "Gram's recipe", icon: '📜', kind: 'holdable',
    caption: 'laminated. three parts Malört, one part apology.',
    onUse() { holdCard(); }, onStow() { cardState = 'none'; } });

  function deliverToDot() {
    const f = favors.at('recipeglide');
    if (f.st !== 'active' || f.step !== 0 || !bag.has('family-recipe')) return;
    bag.remove('family-recipe'); holdItem(null); cardState = 'none';
    dot.setFace('happy'); dot.say('three parts Malört, one part apology. checks out.', 4.5);
    favors.advance('recipeglide');                   // step 0 -> 1 (glide back to Bev)
  }
  function fumbleCard(pl) {
    holdItem(null); cardState = 'sliding'; fumbleCount++; fumbleGrace = 1.2;
    cardPos.x = pl.x; cardPos.z = pl.z;
    const a = Math.random() * Math.PI * 2, sp = 2.5 + Math.random() * 2.0;   // 2–4 m skitter
    cardVel.x = Math.cos(a) * sp; cardVel.z = Math.sin(a) * sp;
    cardWorld.position.set(cardPos.x, ICE_Y + 0.05, cardPos.z); cardWorld.visible = true;
  }
  function stepSlide(dt, t) {
    cardPos.x = clamp(cardPos.x + cardVel.x * dt, 62, 72); cardPos.z = clamp(cardPos.z + cardVel.z * dt, 781, 817);
    const k = Math.exp(-1.3 * dt); cardVel.x *= k; cardVel.z *= k;
    cardWorld.position.set(cardPos.x, ICE_Y + 0.05, cardPos.z); cardWorld.rotation.z += 6 * dt;
    if (Math.hypot(cardVel.x, cardVel.z) < 0.18) { cardVel.x = cardVel.z = 0; cardState = 'landed'; }
  }
  function grabCard() {
    const f = favors.at('recipeglide');
    if (f.st !== 'active' || f.step !== 0) return;
    if (cardState !== 'sliding' && cardState !== 'landed') return;
    holdCard();
  }
  function checkFumble(t, pl) {
    if (cardState !== 'inhand' || fumbleGrace > 0 || !state.onIce) return;
    if (!bag.has('family-recipe')) return;
    const f = favors.at('recipeglide'); if (f.st !== 'active' || f.step !== 0) return;
    if (Math.hypot(pl.x - BEV.x, pl.z - BEV.z) < 1.6 || Math.hypot(pl.x - DOT.x, pl.z - DOT.z) < 1.6) return;  // safe at the hand-offs
    const rigs = skaterHooks.rigs; if (!rigs) return;
    for (let i = 0; i < rigs.length; i++) {
      const g = rigs[i]; if (Math.hypot(pl.x - g.position.x, pl.z - g.position.z) < 0.8) {
        fumbleCard(pl);
        if (t - lastLaughT > 4) { lastLaughT = t; bev.say("HA. it's laminated."); toast('Bev', "\"HA. it's laminated.\""); }
        return;
      }
    }
  }

  const bevInter = addInteraction({ x: BEV.x, z: BEV.z, r: 1.6, label: 'you know my cousin?', onUse() {
    const f = favors.at('recipeglide');
    if (f.st === 'none' && rotation.offerable('recipeglide')) {
      bev.say("you know my cousin. rocks guy. this is Gram's recipe — THE recipe. get it across to my sister Dot, far end. skates on. don't overthink it.", 6);
      favors.offer('recipeglide'); bag.add('family-recipe'); holdCard();
    } else if (f.st === 'active' && f.step === 1) {
      bev.setFace('happy'); bev.say('knew you could. still illegible, right?', 4);
      favors.complete('recipeglide');               // FAMILY RECIPE + 12 dibs
    }
  } });
  const dotInter = addInteraction({ x: DOT.x, z: DOT.z, r: 1.6, label: 'hand Dot the recipe', onUse() { deliverToDot(); } });
  const cardInter = addInteraction({ x: DOT.x, z: DOT.z, r: 1.3, label: 'grab the recipe', onUse() { grabCard(); } });

  // =====================================================================
  //  gating — enable/label each interaction from favor state (throttled).
  //  NEVER call rotation.offerable() in onWorldReady (computeToday would cache
  //  before every pack has joined the pool); defer it to the first frame.
  // =====================================================================
  for (const it of [theoInter, bagInter, drumInter, stickInter, airInter, bevInter, dotInter, cardInter]) it.enabled = false;

  function updateGates() {
    // chalkbag
    const c = favors.at('chalkbag');
    theoInter.enabled = (c.st === 'none' && rotation.offerable('chalkbag')) || (c.st === 'active' && c.step === 1 && bag.has('chalk-bag'));
    theoInter.setLabel(c.st === 'active' && c.step === 1 ? "here's your chalk bag" : "what's up, Theo?");
    bagInter.enabled = (c.st === 'active' && c.step === 0);
    bagWorld.visible = (c.st === 'active' && c.step === 0);
    // drumstick
    const d = favors.at('drumstick');
    drumInter.enabled = (d.st === 'none' && rotation.offerable('drumstick')) || (d.st === 'active' && d.step === 1 && stickState === 'held');
    drumInter.setLabel(d.st === 'active' && d.step === 1 && stickState === 'held' ? 'throw it back up' : "you're the drummer?");
    stickInter.enabled = (d.st === 'active' && (stickState === 'crowd' || stickState === 'landed'));
    stickInter.setLabel(stickState === 'landed' ? 'pick the stick back up' : 'grab the lucky stick');
    airInter.enabled = (bag.heldId() === 'drumstick');
    // recipeglide
    const r = favors.at('recipeglide');
    bevInter.enabled = (r.st === 'none' && rotation.offerable('recipeglide')) || (r.st === 'active' && r.step === 1);
    bevInter.setLabel(r.st === 'active' && r.step === 1 ? 'back with the recipe' : 'you know my cousin?');
    dotInter.enabled = (r.st === 'active' && r.step === 0 && bag.has('family-recipe'));
    cardInter.enabled = (r.st === 'active' && r.step === 0 && (cardState === 'sliding' || cardState === 'landed'));
  }

  // ---- persistence-at-boot: resume mid-step correctly (no coords in the save) ----
  {
    const c = favors.at('chalkbag');
    if (c.st === 'done' && theo.lines.indexOf(THEO_BUMP) < 0) theo.lines.push(THEO_BUMP);
    if (c.st === 'active' && c.step === 1 && bag.has('chalk-bag')) { const m = makeChalkBag(); m.position.set(0, 0.02, 0.03); holdItem(m); }

    const d = favors.at('drumstick');
    if (d.st === 'active') { stickState = 'crowd'; placeStickWorld(STICK0.x, STICK0.z); }   // re-drop the stick to find/throw

    const r = favors.at('recipeglide');
    if (r.st === 'active' && r.step === 0 && bag.has('family-recipe')) holdCard();
  }

  // =====================================================================
  //  per-frame — prop glint, projectile, card slide, fumble, drummer catch,
  //  air-drum. Registered here so it runs AFTER lolla's updateBand + main.js's
  //  mayor pose (import order + registration order) — the overrides win.
  // =====================================================================
  let gate = 0;
  registerUpdate((dt, t, pl) => {
    if (dt < 0) dt = 0;
    PLAYER = pl;
    gate -= dt; if (gate <= 0) { gate = 0.35; updateGates(); }

    // interactions that follow a moving anchor
    stickInter.x = stickPos.x; stickInter.z = stickPos.z;
    cardInter.x = cardPos.x; cardInter.z = cardPos.z;
    airInter.x = pl.x; airInter.z = pl.z;

    const inCell = activeCell() === 'millennium';
    if (inCell) {
      if ((stickState === 'crowd' || stickState === 'landed')) { stickWorld.position.y = 0.08 + 0.04 * Math.sin(t * 2); stickWorld.rotation.y = t * 0.6; }
      if (favors.at('chalkbag').step === 0 && bagWorld.visible) { bagWorld.position.y = 0.1 + 0.03 * Math.sin(t * 2.2); bagWorld.rotation.y = t * 0.5; }
      checkFumble(t, pl);
    }
    if (fumbleGrace > 0) fumbleGrace -= dt;
    if (stickState === 'flying') stepFly(dt);
    if (cardState === 'sliding') stepSlide(dt, t);

    // drummer catch: arm up for ~1.5 s (after lolla's live updateBand)
    if (catchArmT > 0) { catchArmT -= dt; const dr = bandHooks.drummer;
      if (dr) { dr.parts.armR.rotation.x = -2.7; dr.parts.armR.rotation.z = -0.2; dr.parts.armL.rotation.x = -0.5; dr.parts.head.rotation.x = -0.15; } }

    // air-drum toy: two hits (after main.js poses the mayor)
    if (airDrumT > 0) { airDrumT -= dt; const ph = (AIR_DUR - airDrumT) / AIR_DUR;
      const hit = Math.abs(Math.sin(ph * Math.PI * 2));
      mparts.armR.rotation.x = -0.5 - 1.3 * hit; mparts.armR.rotation.z = -0.1;
      mayor.rotation.z = 0.03 * Math.sin(ph * Math.PI * 4); }
  });

  // ---- debug / E2E (merge, don't overwrite — packs race) ----
  try {
    window.__hd = window.__hd || {};
    window.__hd.f081 = Object.assign(window.__hd.f081 || {}, {
      chalkbag: { at: () => favors.at('chalkbag'), theoPos: { ...THEO }, bagPos: { ...CHALK_BAG } },
      drumstick: {
        at: () => favors.at('drumstick'), offerPos: { ...DRUM_OFFER },
        stickPos: () => ({ ...stickPos }), state: () => stickState,
        thrown: () => (stickState === 'flying' || stickState === 'landed' || stickState === 'caught'),
        airDrums: () => airDrumCount,
      },
      recipeglide: {
        at: () => favors.at('recipeglide'), bevPos: { ...BEV }, dotPos: { ...DOT },
        fumbles: () => fumbleCount, cardState: () => cardState, cardPos: () => ({ ...cardPos }),
        rigs: () => ((skaterHooks.rigs || []).map(g => ({ x: +g.position.x.toFixed(2), z: +g.position.z.toFixed(2) }))),
      },
    });
  } catch (e) {}
});
