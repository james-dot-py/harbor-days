// =====================================================================
//  FAVORS — LAKEFRONT (task 081): three neighbors on Belmont's water.
//  Built on the 078 favors/bag/wallet economy + the 081 daily rotation
//  (favors-core.js). Chicago voice, zero fail states, never the word "quest".
//
//   * loveletter — "a letter for Rita." SAL (a boater on the Belmont slip
//     dock) hands you a cream envelope for RITA, who moors up at Montrose now.
//     Carry it north (trail or jetski, out the harbor mouth), get her answer,
//     carry it back. Water-proof — she laminates. Reward 15.
//   * divvyangel — "be a Divvy angel." REGGIE the rebalancer's strays wandered
//     off three docks. Wheel each one (it follows at your right hip) to ANY
//     lakefront Divvy dock, then tell Reggie. Reward 12.
//   * lakeglass — "blue for the window lady." SHELLEY makes windows out of
//     lake glass; cobalt only washes up at Montrose. Find a blue piece (the
//     sea-glass pack's rare Montrose spot), bring it back — she takes a
//     rubbing, you keep the glass. Reward 10.
//
//  Only-my-file rules honoured: this module + ONE import line in index.js
//  (wired by the orchestrator — NOT here). All setup inside onWorldReady.
//  Placement = data-const derivations + fixed literals; Math.random only for
//  nothing that matters (no session jitter needed) — the world rng is NEVER
//  touched. New draws are one-off frustum-culled meshes (three NPCs + a couple
//  of face props + three stray bikes) — ZERO new InstancedMesh buckets, cached
//  toon() materials. Persistence rides the framework favor/bag save; sub-step
//  counts (bikes docked) DERIVE from the favor step — no coords in the save.
//
//  DEBUG / E2E: window.__hd.f081.{loveletter,divvyangel,lakeglass} + probe().
// =====================================================================
import * as THREE from 'three';
import { scene, toon, pip, lerpAngle } from '../core.js';
import { onWorldReady, registerUpdate, addInteraction, makeNPC, holdItem,
         toast, favors, bag, state } from '../framework.js';
import { rotation } from './favors-core.js';
import { beachH, LAND, coastQuery, tierAt, profileTotal } from '../coast.js';
import { mayor } from '../character.js';
import * as CH from '../data/chicago.js';

// =====================================================================
//  PLACEMENTS (all DERIVED from data consts where the map owns them, so
//  084's north-shore rework carries the neighbors with it)
// =====================================================================
const FD = CH.FINGER_DOCKS, MD = CH.MT_FINGER_DOCKS, DECK_Y = CH.SEAWALL_Y.top + 0.08;   // finger-dock deck height (~0.12)
// SAL — on the SOUTHERNMOST Belmont finger dock (walkRect x FD.x0..FD.x0+len,
// z FD.rows[last]±halfW; verified walkable). The brief's guess (124,-273..-303)
// is open harbor WATER (basin spans x85..160) — moved onto the real dock arm,
// the only walkable Belmont slip deck, and noted.
const SAL  = { x: FD.x0 + 7, z: FD.rows[FD.rows.length - 1], y: DECK_Y };   // (85, -275)
// RITA — on the NORTHERNMOST Montrose finger dock (same walkRect family).
const RITA = { x: MD.x0 + 7, z: MD.rows[0], y: DECK_Y };                    // (193, -714)
// REGGIE — clear of the tight Belmont-underpass Divvy cluster: departure
// boards (16,100)/(16,111) r3, Divvy grab (24,110) r2.6, sax busker (18,108),
// pylon (15.4,107) — (30,116) sits >=8 m from all of them (verify ≥3.7 m).
const REGGIE = { x: 30, z: 116, ry: -2.2 };
// SHELLEY — on the dog-beach sand edge (beachH!==null, dog-beach cove), >=3.7 m
// from the kiosk counter (100,-351.5), the three sea-glass pickups
// (94,-339)/(100,-337)/(107,-339), the lifeguard chair (108,-341). The brief's
// (91,-346) is grass NORTH of the DOG_BEACH z0=-341 bound; nudged onto the sand.
const SHELLEY = { x: 90, z: -340, ry: 2.4 };

// The lakefront Divvy docks (progression.js DOCKS, lakefront rows — that const
// is NOT exported, so the five coords are copied here with this note; if the
// network moves, update both).
const DOCKS = [
  { x: 40,  z: -40  },   // Belmont Harbor west inner park
  { x: 24,  z: 110  },   // Belmont underpass plaza
  { x: 80,  z: -330 },   // dog beach (grass west of the cove)
  { x: 150, z: -436 },   // golf / sanctuary corridor
  { x: 95,  z: 145  },   // AIDS Garden south lawn
];
// three strays, each at a NAMED walkable spot near a dock (Reggie's ask cites them)
const STRAYS = [
  { x: 98, z: 128,  ry:  2.3, dock: DOCKS[4], where: 'up by the AIDS Garden' },     // -> AIDS Garden dock (95,145)
  { x: 78, z: -318, ry: -1.1, dock: DOCKS[2], where: 'down at the dog beach' },      // -> dog-beach dock (80,-330)
  { x: 46, z: -52,  ry:  0.7, dock: DOCKS[0], where: 'over on the harbor lawn' },     // -> harbor dock (40,-40)
];

const nearestDockTo = (x, z) => {
  let best = DOCKS[0], bd = Infinity;
  for (const d of DOCKS) { const dx = d.x - x, dz = d.z - z, d2 = dx * dx + dz * dz; if (d2 < bd) { bd = d2; best = d; } }
  return best;
};

// =====================================================================
//  small prop factories (one-off meshes, cached materials)
// =====================================================================
function makeEnvelope() {                                   // cream envelope w/ a flap + wax seal (~0.22 m, reads in-hand)
  const g = new THREE.Group();
  const cream = toon(0xf3e7cf), ink = toon(0x9c6a3a);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.15, 0.025), cream); g.add(body);
  const flap = new THREE.Mesh(new THREE.ConeGeometry(0.125, 0.075, 4), toon(0xe9dcc0));   // 4-sided cone = a shallow flap pyramid
  flap.rotation.x = Math.PI / 2; flap.rotation.y = Math.PI / 4; flap.position.set(0, 0.038, 0.016); g.add(flap);
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.008, 8), toon(0xc23b45)); seal.rotation.x = Math.PI / 2; seal.position.set(0, 0, 0.017); g.add(seal);
  const line = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.01, 0.004), ink); line.position.set(0, -0.03, 0.014); g.add(line);   // an address line
  return g;
}

// bike factory — a chunky Divvy step-through (echoing the DIVVY blue), built as
// one-off toon meshes with the pack's shared cached materials. NOT the instanced
// racks. Wheels roll (spin groups). ~9 meshes; frustum-culled.
function bikeFactory() {
  const blue = toon(0x2b9fd4), blueDk = toon(0x2b6f9c), dark = toon(0x23262b), grey = toon(0x9aa0a6);
  const rimGeo = new THREE.TorusGeometry(0.30, 0.05, 6, 14);   // shared across all three bikes + both wheels
  const seatGeo = new THREE.BoxGeometry(0.12, 0.055, 0.22);
  const basketGeo = new THREE.BoxGeometry(0.24, 0.18, 0.16);
  const barGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.40, 6);
  const tube = (a, b, rad, mat) => {
    const A = new THREE.Vector3(a[0], a[1], a[2]), B = new THREE.Vector3(b[0], b[1], b[2]);
    const d = new THREE.Vector3().subVectors(B, A), len = d.length() || 0.01;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, 6), mat);
    m.position.copy(A).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    return m;
  };
  const wheel = (dz) => {
    const orient = new THREE.Group(); orient.rotation.y = Math.PI / 2; orient.position.set(0, 0.30, dz);   // hole axis -> bike X (rolls in Z)
    const spin = new THREE.Group(); orient.add(spin);
    spin.add(new THREE.Mesh(rimGeo, dark));
    return { orient, spin };
  };
  return function makeBike() {
    const g = new THREE.Group();
    const wF = wheel(0.55), wB = wheel(-0.55);
    g.add(wF.orient, wB.orient);
    g.add(tube([0, 0.32, -0.55], [0, 0.48, 0.30], 0.030, blue));      // low step-through spine
    g.add(tube([0, 0.32, -0.55], [0, 0.78, -0.42], 0.028, blue));     // seat post (up + back)
    g.add(tube([0, 0.48, 0.30],  [0, 0.30, 0.55], 0.024, grey));      // fork to the front hub
    g.add(tube([0, 0.48, 0.30],  [0, 0.80, 0.44], 0.024, grey));      // steerer
    const bar = new THREE.Mesh(barGeo, dark); bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.82, 0.44); g.add(bar);
    const seat = new THREE.Mesh(seatGeo, dark); seat.position.set(0, 0.81, -0.42); g.add(seat);
    const basket = new THREE.Mesh(basketGeo, blueDk); basket.position.set(0, 0.60, 0.60); g.add(basket);
    scene.add(g);
    return { group: g, spins: [wF.spin, wB.spin] };
  };
}

// small cap (crown + brim) for a face NPC — parented to parts.head
function addCap(npc, crownHex, brimHex) {
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.33, 0.20, 12), toon(crownHex));
  crown.position.set(0, 0.30, 0); npc.parts.head.add(crown);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 16, 1, false, 0, Math.PI), toon(brimHex));
  brim.rotation.x = -Math.PI / 2; brim.position.set(0, 0.22, 0.30); npc.parts.head.add(brim);
}

// =====================================================================
onWorldReady(() => {
  const HOOD = 'lakefront';

  // ---- register + join the rotation for all three (regardless of today's
  //      picks, so saves mid-favor always resume) ----
  favors.register({ id: 'loveletter', title: 'a letter for Rita', giver: 'Sal', reward: 15,
    todo: [
      "take Sal's letter to Rita — she moors at Montrose now, the big basin. up the trail, or a jetski out the harbor mouth and straight north.",
      "carry Rita's answer back to Sal, down on the Belmont slips.",
    ],
    doneToast: { main: 'SEALED WITH SPRAY', sub: 'a letter across the water, both ways' } });
  rotation.join({ id: 'loveletter', giver: 'Sal', where: 'down on the Belmont slips', hood: HOOD });

  favors.register({ id: 'divvyangel', title: 'be a Dibsy angel', giver: 'Reggie', reward: 12,
    todo: [
      "three Dibsy strays wandered off — wheel each one home to ANY lakefront dock.",
      "one home, two still out there. wheel the next stray to a dock.",
      "two home, one stray left. wheel it home.",
      "all three docked — go tell Reggie by the Belmont underpass.",
    ],
    doneToast: { main: 'DIBSY ANGEL', sub: 'three bikes home safe' } });
  rotation.join({ id: 'divvyangel', giver: 'Reggie', where: 'by the Belmont-underpass Dibsy dock', hood: HOOD });

  favors.register({ id: 'lakeglass', title: 'blue for the window lady', giver: 'Shelley', reward: 10,
    todo: [
      "find a piece of cobalt-blue lake glass — the rare one only washes up at the big beach, Montrose, up past the point.",
      "bring the blue back to Shelley, on the dog-beach sand.",
    ],
    doneToast: { main: 'WINDOW BLUE', sub: 'the rare one, for the pane' } });
  rotation.join({ id: 'lakeglass', giver: 'Shelley', where: 'out on the dog-beach sand', hood: HOOD });

  // =================================================================== //
  //  the neighbors (makeNPC, wander:0, distinct palettes, house-voice bumps)
  // =================================================================== //
  const sal = makeNPC({ x: SAL.x, z: SAL.z, ry: -Math.PI / 2, wander: 0, staticLod: true, name: 'sal',   // 095: 1-draw twin at distance
    palette: { suit: 0x2f5d8a, pants: 0xcdbf99, skin: 0xc9976a, hair: 0xb4b0a8, face: true },
    lines: ["twenty years I've had this slip.", "the lake's flat as glass today.", "Rita moors up at Montrose now.", "she laminates everything. everything."] });
  sal.group.position.y = SAL.y;
  addCap(sal, 0x223b52, 0x1a2c3d);

  const rita = makeNPC({ x: RITA.x, z: RITA.z, ry: -Math.PI / 2, wander: 0, staticLod: true, name: 'rita',   // 095: 1-draw twin at distance
    palette: { suit: 0xb5473f, pants: 0x37414c, skin: 0xd8a878, hair: 0x3a2a1a, hairStyle: 'bun', face: true },
    lines: ["Montrose has the room. Belmont's a shoebox.", "he spelled 'buoy' wrong, you know.", "tell Sal the varnish held up fine."] });
  rita.group.position.y = RITA.y;

  const reggie = makeNPC({ x: REGGIE.x, z: REGGIE.z, ry: REGGIE.ry, wander: 0, staticLod: true, name: 'reggie',   // 095: 1-draw twin at distance
    palette: { suit: 0x1f7fb8, pants: 0x2b3138, skin: 0x6b4a2f, hair: 0x1a130c, face: true },
    lines: ["I rebalance the whole north side.", "these bikes got a mind of their own.", "one rolls off, three roll off — go figure.", "you'd be amazed where they end up."] });
  // hi-vis stripe across the vest (reads as a rebalancer)
  { const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.11, 0.02), toon(0xf2e14a)); stripe.position.set(0, 1.30, 0.30); reggie.group.add(stripe); }
  addCap(reggie, 0x1f7fb8, 0x18628f);

  const sheY = (beachH(SHELLEY.x, SHELLEY.z) ?? 0);
  const shelley = makeNPC({ x: SHELLEY.x, z: SHELLEY.z, ry: SHELLEY.ry, wander: 0, staticLod: true, name: 'shelley',   // 095: 1-draw twin at distance
    palette: { suit: 0x6a9b8a, pants: 0x7a6a58, skin: 0xe0b088, hair: 0x8a5a34, hairStyle: 'bun', face: true },
    lines: ["blue's the rare one, you know.", "the lake gives it back, polished.", "cobalt only comes up at the big beach.", "frosted white's pretty, but blue pays the rent."] });
  shelley.group.position.y = sheY;
  { // wide beachcomber sun hat + a little pail in hand
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.03, 18), toon(0xe7d9b0)); brim.position.set(0, 0.24, 0); shelley.parts.head.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.33, 0.16, 12), toon(0xe7d9b0)); crown.position.set(0, 0.33, 0); shelley.parts.head.add(crown);
    const pail = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.08, 0.16, 10), toon(0x3aa0c4)); pail.position.set(0, 0.02, 0.05); shelley.parts.handR.add(pail);
  }

  // =================================================================== //
  //  LOVELETTER — the held envelope + Sal offer/turn-in + Rita advance
  // =================================================================== //
  const envelope = makeEnvelope();
  const holdEnvelope = () => { if (envelope.parent) envelope.parent.remove(envelope); envelope.position.set(0, 0.05, 0.08); envelope.rotation.set(-0.6, 0, 0); holdItem(envelope); };   // tilt the face up-forward so it reads in-hand
  const loveDef = bag.define({ id: 'love-letter', name: 'a letter for Rita', icon: '✉️', kind: 'holdable',
    caption: "for Rita — don't read it", onUse() { holdEnvelope(); }, onStow() {} });
  const SAL_DONE_LINE = "she said 'tell him yes'. that's a YES, in Sal.";

  function giveLetter() { if (!bag.has('love-letter')) bag.add('love-letter'); loveDef.caption = "for Rita — don't read it"; holdEnvelope(); }
  function completeLove() {
    holdItem(null); bag.remove('love-letter');
    sal.setFace('happy');
    sal.say("she said YES. well — she said 'tell him yes'. same thing. probably.", 5);
    if (sal.lines.indexOf(SAL_DONE_LINE) < 0) sal.lines.push(SAL_DONE_LINE);
    favors.complete('loveletter');   // SEALED WITH SPRAY + 15 dibs
  }

  const salInter = addInteraction({ x: SAL.x, z: SAL.z, r: 2.2, label: "what's up, Sal?", onUse() {
    const f = favors.at('loveletter');
    if (f.st === 'none') {
      if (!rotation.offerable('loveletter')) return;
      sal.say("Rita moors up at Montrose now — the big basin. HAND her this, don't read it. take the trail, or a jetski if you're romantic about it: out the harbor mouth, straight north.", 6);
      favors.offer('loveletter'); giveLetter();
    } else if (f.st === 'active' && f.step === 0) {
      sal.say("she's up at Montrose — the big basin. north up the lake. the letter survives the spray, she laminates.", 4.5);
    } else if (f.st === 'active' && f.step === 1) {
      if (bag.has('love-letter')) completeLove(); else sal.say("...you still got her note, right?", 3);
    }
  } });
  salInter.enabled = false;   // the ~0.6 s poll enables it only when offerable (dormant days show nothing)

  const ritaInter = addInteraction({ x: RITA.x, z: RITA.z, r: 2.0, label: "Sal sent a letter", onUse() {
    const f = favors.at('loveletter');
    if (!(f.st === 'active' && f.step === 0)) return;
    if (!bag.has('love-letter')) { rita.say("empty-handed? he do that a lot.", 3); return; }
    rita.say("he spelled 'buoy' wrong. tell him yes.", 4);
    loveDef.caption = "Rita's answer — for Sal"; holdEnvelope();
    favors.advance('loveletter');   // step 0 -> 1
  } });
  ritaInter.enabled = false;

  // =================================================================== //
  //  DIVVYANGEL — Reggie + three wheelable strays + roaming "dock it"
  // =================================================================== //
  const makeBike = bikeFactory();
  const bikes = STRAYS.map((s) => {
    const bk = makeBike();
    bk.group.position.set(s.x, 0, s.z);
    bk.group.rotation.set(0, s.ry, 0.09);   // parked, leaning slightly (a stray)
    bk.spot = { x: s.x, z: s.z }; bk.dock = s.dock; bk.where = s.where; bk.state = 'parked'; bk.lastX = s.x; bk.lastZ = s.z;
    bk.pick = addInteraction({ x: s.x, z: s.z, r: 1.6, label: 'wheel this one home', onUse() {
      const f = favors.at('divvyangel');
      if (!(f.st === 'active' && f.step < 3) || wheeling || bk.state !== 'parked') return;
      wheeling = bk; bk.state = 'wheeling'; bk.pick.enabled = false; bk.group.rotation.z = 0;
      if (!wheelHinted) { wheelHinted = true; toast('rolling it home', 'walk it to any Dibsy dock — E to dock it'); }
    } });
    bk.pick.enabled = false;
    return bk;
  });
  let wheeling = null, wheelHinted = false;

  function dockBikeAt(bk, d) {                               // snap a bike upright by a dock's rack
    bk.group.position.set(d.x - 2.6, 0, d.z); bk.group.rotation.set(0, Math.PI / 2, 0);
    bk.state = 'docked'; bk.pick.enabled = false;
  }

  // ONE roaming "dock it" — priority 1 so it WINS the pill over a dock's r2.6
  // 'grab a Divvy' while wheeling; follows the player; only live near a dock.
  const dockIt = addInteraction({ x: 0, z: 0, r: 1.5, priority: 1, label: 'dock it', onUse() {
    if (!wheeling) return;
    const b = wheeling; wheeling = null;
    const d = nearestDockTo(b.group.position.x, b.group.position.z);
    dockBikeAt(b, d);
    favors.advance('divvyangel');
    const step = favors.at('divvyangel').step;
    dockIt.enabled = false;
    if (step === 1) toast('one home', 'two still out there');
    else if (step === 2) toast('two home', 'one stray left');
    else if (step === 3) toast('all three docked', 'go tell Reggie');
  } });
  dockIt.enabled = false;

  const reggieInter = addInteraction({ x: REGGIE.x, z: REGGIE.z, r: 2.2, label: "what's up, Reggie?", onUse() {
    const f = favors.at('divvyangel');
    if (f.st === 'none') {
      if (!rotation.offerable('divvyangel')) return;
      reggie.say("three bikes wandered off my docks — one's " + STRAYS[0].where + ", one's " + STRAYS[1].where + ", one rolled " + STRAYS[2].where + ". happens every summer. walk 'em home, angel?", 6);
      favors.offer('divvyangel');
    } else if (f.st === 'active' && f.step < 3) {
      reggie.say("still got strays out there. any Dibsy dock'll do.", 4);
    } else if (f.st === 'active' && f.step === 3) {
      reggie.setFace('happy');
      reggie.say("attaboy. three bikes, home safe — you're a Dibsy angel.", 5);
      favors.complete('divvyangel');   // DIVVY ANGEL + 12 dibs
    }
  } });
  reggieInter.enabled = false;   // poll-gated on offerable

  // =================================================================== //
  //  LAKEGLASS — Shelley offer/turn-in + a poll on state.seaGlass
  // =================================================================== //
  let blueAtOffer = false;
  const shelleyInter = addInteraction({ x: SHELLEY.x, z: SHELLEY.z, r: 2.2, label: 'blue for the window lady?', onUse() {
    const f = favors.at('lakeglass');
    if (f.st === 'none') {
      if (!rotation.offerable('lakeglass')) return;
      blueAtOffer = !!(state.seaGlass && state.seaGlass.has('blue'));
      shelley.say("I make windows out of lake glass. blue's the rare one — only place cobalt washes up is the BIG beach, Montrose, up past the point.", 6);
      favors.offer('lakeglass');
    } else if (f.st === 'active' && f.step === 0) {
      shelley.say("cobalt only comes up at Montrose — the big beach, up past the point. green and white you'll find anywhere.", 4.5);
    } else if (f.st === 'active' && f.step === 1) {
      shelley.setFace('happy');
      shelley.say("just a rubbing — you keep the glass, the window keeps the light.", 5);
      favors.complete('lakeglass');   // WINDOW BLUE + 10 dibs
    }
  } });
  shelleyInter.enabled = false;   // poll-gated on offerable

  // =================================================================== //
  //  boot resume — mid-favor sessions must reconstruct correctly
  // =================================================================== //
  {
    const fl = favors.at('loveletter');
    if (fl.st === 'active') { if (!bag.has('love-letter')) bag.add('love-letter'); loveDef.caption = fl.step === 0 ? "for Rita — don't read it" : "Rita's answer — for Sal"; holdEnvelope(); }
    else if (fl.st === 'done' && sal.lines.indexOf(SAL_DONE_LINE) < 0) sal.lines.push(SAL_DONE_LINE);

    const fd = favors.at('divvyangel');
    const docked = fd.st === 'done' ? bikes.length : (fd.st === 'active' ? Math.min(fd.step, bikes.length) : 0);
    for (let i = 0; i < docked; i++) dockBikeAt(bikes[i], bikes[i].dock);   // the first `docked` strays are already home
  }

  // =================================================================== //
  //  per-frame — offer gating (throttled) + wheeling follow + blue poll
  // =================================================================== //
  let pollAcc = 0;
  registerUpdate((dt, t, pl) => {
    // ---- throttled ~0.6 s: enabled/label gating for every interaction ----
    pollAcc -= dt;
    if (pollAcc <= 0) {
      pollAcc = 0.6;

      // Sal — offer (dormant days: offerable() false -> no prompt) + turn-in
      const fl = favors.at('loveletter');
      salInter.enabled = rotation.offerable('loveletter') && fl.st !== 'done';
      salInter.setLabel(fl.st === 'none' ? "what's up, Sal?" : fl.step === 1 ? 'hand Sal the answer' : 'about the letter, Sal');
      ritaInter.enabled = fl.st === 'active' && fl.step === 0;   // mid-favor: gate on favors.at only

      // Reggie — offer + turn-in
      const fd = favors.at('divvyangel');
      reggieInter.enabled = rotation.offerable('divvyangel') && fd.st !== 'done';
      reggieInter.setLabel(fd.st === 'none' ? "what's up, Reggie?" : fd.step === 3 ? "they're all docked, Reggie" : 'Reggie');
      const wheelable = fd.st === 'active' && fd.step < 3;       // strays become wheelable only while the favor runs
      for (const bk of bikes) bk.pick.enabled = wheelable && bk.state === 'parked';

      // Shelley — offer + turn-in + the blue poll
      const fg = favors.at('lakeglass');
      shelleyInter.enabled = rotation.offerable('lakeglass') && fg.st !== 'done';
      shelleyInter.setLabel(fg.st === 'none' ? 'blue for the window lady?' : fg.step === 1 ? 'show Shelley the blue' : 'Shelley');
      if (fg.st === 'active' && fg.step === 0 && state.seaGlass && state.seaGlass.has('blue')) {
        favors.advance('lakeglass');
        shelley.say(blueAtOffer ? "you HAD one? kid." : "cobalt — the rare one. bring it here.", 4);
      }
    }

    // ---- per-frame: wheel the stray beside the player (~0.9 m to the right) ----
    if (wheeling) {
      if (state.rideSpeed > 0) {   // mounted a real Divvy (or the jetski path clears rideSpeed>0 too): the stray just stops + waits
        wheeling.state = 'parked'; wheeling.pick.x = wheeling.group.position.x; wheeling.pick.z = wheeling.group.position.z;
        wheeling.pick.enabled = favors.at('divvyangel').step < 3; wheeling = null; dockIt.enabled = false;
      } else {
        const b = wheeling, yaw = mayor.rotation.y;
        const tx = pl.x + Math.cos(yaw) * 0.9, tz = pl.z - Math.sin(yaw) * 0.9;   // 0.9 m to the player's right
        const k = 1 - Math.exp(-6 * dt);
        b.group.position.x += (tx - b.group.position.x) * k;
        b.group.position.z += (tz - b.group.position.z) * k;
        b.group.position.y = pl.y;
        const dx = b.group.position.x - b.lastX, dz = b.group.position.z - b.lastZ, md = Math.hypot(dx, dz);
        if (md > 0.0008) { b.group.rotation.y = lerpAngle(b.group.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-8 * dt)); b.group.rotation.z = 0;
          b.spins[0].rotation.z -= md / 0.30; b.spins[1].rotation.z -= md / 0.30; }
        b.lastX = b.group.position.x; b.lastZ = b.group.position.z;
        // "dock it" lights up within 6 m of ANY lakefront dock, follows the player
        const nd = nearestDockTo(b.group.position.x, b.group.position.z);
        if (Math.hypot(nd.x - b.group.position.x, nd.z - b.group.position.z) < 6) { dockIt.enabled = true; dockIt.x = pl.x; dockIt.z = pl.z; }
        else dockIt.enabled = false;
      }
    } else if (dockIt.enabled) dockIt.enabled = false;
  });

  // =================================================================== //
  //  DEBUG / E2E hooks (tools only; inert in play). Merge, never overwrite.
  // =================================================================== //
  try {
    const dockRects = [];
    for (const zc of FD.rows) dockRects.push({ x1: FD.x0, x2: FD.x0 + FD.len, z1: zc - FD.halfW, z2: zc + FD.halfW });
    for (const zc of MD.rows) dockRects.push({ x1: MD.x0, x2: MD.x0 + MD.len, z1: zc - MD.halfW, z2: zc + MD.halfW });
    const inR = (x, z, r) => x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2;
    const lfWalkable = (x, z) => {
      for (const r of dockRects) if (inR(x, z, r)) return true;
      if (CH.beachCarved(x, z)) return false;
      if (beachH(x, z) !== null) return CH.beachWalkable(x, z);
      if (pip(x, z, LAND)) return true;
      const q = coastQuery(x, z);
      if (q && q.ae < 0.9 && q.lat > -0.6) { const ti = tierAt(q.lat, q.z); if (ti && q.lat < profileTotal(q.z) - 0.3) return true; }
      return false;
    };
    window.__hd = window.__hd || {};
    window.__hd.f081 = Object.assign(window.__hd.f081 || {}, {
      loveletter: { at: () => favors.at('loveletter'), salPos: { x: SAL.x, z: SAL.z }, ritaPos: { x: RITA.x, z: RITA.z } },
      divvyangel: {
        at: () => favors.at('divvyangel'),
        bikes: () => bikes.map(b => ({ x: +b.group.position.x.toFixed(2), z: +b.group.position.z.toFixed(2), state: b.state })),
        docked: () => bikes.filter(b => b.state === 'docked').length,
        docks: DOCKS.slice(),
        wheeling: () => (wheeling ? bikes.indexOf(wheeling) : -1),
      },
      lakeglass: { at: () => favors.at('lakeglass'), shelleyPos: { x: SHELLEY.x, z: SHELLEY.z }, blueAtOffer: () => blueAtOffer },
      probe: (x, z) => ({ beachH: beachH(x, z), inLand: pip(x, z, LAND), walk: lfWalkable(x, z) }),
    });
  } catch (e) {}
});
