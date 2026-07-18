// =====================================================================
//  PACK: museum-cart — THE MICHIGAN-AVE MUSEUM CART (task 080). A tiny
//  museum-green coffee-and-souvenir cart on the sidewalk by the Art Institute
//  lions (the millennium cell), plus MUSEUM COFFEE (a 25 s pep in your step)
//  and THE PENNY MACHINE (1 dib a crank — the game's one deliberate sink; the
//  crank matters more than the penny).
//
//  Site (pre-probed, tools/tmp-080-museum-*): the CART at (51,986) sits just
//  south of the south AI lion (54.4,979.4), on the Michigan-Ave sidewalk west
//  of the museum steps (x53.2-57.2). The PENNY MACHINE at (52,990.5). This is
//  near the map's WORST draw view (~401/480 at the AI campus), so the build is
//  TINY: the static cart merges to ONE vertex-color toon mesh (the hats.js
//  paint()+mergeBufferGeometries pattern) + its own textured sign mesh; the
//  penny machine merges to a body mesh + a separate spinning crank wheel.
//  ~11 added draws worst case (keeper live rig included).
//
//  DETERMINISM: FIXED coords, ZERO world rng (Math.random only for FX jitter).
//  The static cart/penny meshes PARENT to getCell('millennium').root (so they
//  hide with the cell); the keeper is a framework NPC (distance-culled). All
//  setup inside onWorldReady; storage only via bag/wallet + the state
//  whitelist (state.pennies is whitelisted by the framework snapshot). Audio is
//  synth-only + actx-guarded. Colliders sit INBOARD on walkable ground (052/065).
//
//  Only-my-file rules honoured: this module + ONE import line in index.js.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, registerUpdate, addInteraction, makeNPC, toast,
         journalSection, bag, wallet, shop, state, holdItem, getAudioCtx } from '../framework.js';
import { scene, toon, bmat } from '../core.js';
import { getCell } from '../cells.js';
import { collide } from '../props.js';
import { mparts } from '../character.js';   // 022/held-prop: the cup rides the mayor's right hand
import { FX } from '../fx.js';

// ------------------------------ fixed coords -------------------------------
const CART = { x: 51, z: 986 };        // cart centre (pre-probed walkable-clean)
const PENNY = { x: 52, z: 990.5 };     // penny machine (pre-probed clean)
const KEEPER = { x: 50, z: 984.5 };    // docent, NW of the cart facing it — 088: was (49.6,986), 0.6 m DEAD IN FRONT of the west-facing 'COFFEE · SOUVENIRS' sign; every read of the sign was keeper-blocked (the 061/080 NPC-blocks-the-frame law)
const BROWSE = { x: 53, z: 986 };      // shop interaction anchor (east of cart)
const DESIGNS = ['the Bean', 'a lion', 'the clock tower', 'the plover'];
const CRANK_DUR = 1.8;                  // seconds of ratchet + wiggle before the ding

// ---- ONE shared white vertex-color toon material for all merged parts ----
// toon() with opts is uncached, so we cache it once and reuse it — white ×
// vertex-color == a per-color toon material under r128's LinearEncoding (the
// hats/character trick), so a whole merged part-tree stays ONE draw call.
let _vc = null;
const vc = () => _vc || (_vc = toon(0xffffff, { mat: { vertexColors: true } }));

// paint(geo,hex): non-index + stamp a solid 'color' attribute so the part can
// merge under vc() (mirrors hats.js paint; every primitive keeps position/
// normal/uv, so mergeBufferGeometries never drops a part).
const _pc = new THREE.Color();
function paint(geo, hex) {
  geo = geo.toNonIndexed();
  _pc.set(hex);
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = _pc.r; a[i * 3 + 1] = _pc.g; a[i * 3 + 2] = _pc.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
const mergedMesh = (parts) => new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(parts, false), vc());

// own canvas + measureText-FITTED font (028/050 word-sign law) so the board
// reads on a FrontSide plane (a solid backing panel hides the mirrored back).
function signTex(text) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = '#efe6cf'; g.fillRect(0, 0, 512, 128);                       // cream canvas
  g.strokeStyle = '#2f6b58'; g.lineWidth = 8; g.strokeRect(7, 7, 498, 114);  // museum-green frame
  g.fillStyle = '#274c40'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 46; g.font = `800 ${fs}px "Trebuchet MS",sans-serif`;
  while (g.measureText(text).width > 462 && fs > 12) { fs -= 2; g.font = `800 ${fs}px "Trebuchet MS",sans-serif`; }
  g.fillText(text, 256, 66);
  const tx = new THREE.CanvasTexture(cv); tx.anisotropy = 4; return tx;
}

// -------------------------------- the CUP ----------------------------------
// held-prop coffee: white cup + kraft sleeve + lid (a small group parented into
// the mayor's right hand by holdItem).
let _cup = null;
function makeCup() {
  const g = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.036, 0.11, 12), toon(0xf3f1ea)); cup.position.y = 0.055; g.add(cup);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.049, 0.045, 0.045, 12), toon(0xb98a54)); sleeve.position.y = 0.05; g.add(sleeve);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.048, 0.02, 12), toon(0xe9e5db)); lid.position.y = 0.12; g.add(lid);
  return g;
}
const cupMesh = () => (_cup || (_cup = makeCup()));

// ============================================================================
onWorldReady(() => {
  // ---- pep state (composition law: never stomp a stronger buff) ----
  let pepT = 0, steamT = 0;
  const _cupW = new THREE.Vector3();   // hoisted scratch — no per-frame alloc

  // ---- MUSEUM COFFEE — holdable; onUse holds the cup + starts/refreshes pep ----
  bag.define({ id: 'museum-coffee', name: 'museum coffee', icon: '☕', kind: 'holdable',
    caption: 'notes of gift shop. 25 seconds of pep.',
    onUse() {
      const m = cupMesh();
      if (m.parent) m.parent.remove(m);
      m.position.set(0, 0.02, 0.05); m.rotation.set(0, 0, 0);
      holdItem(m);                                   // -> mparts.handR (steam reads cup.parent)
      const wasActive = pepT > 0;
      pepT = 25;                                     // toys never decrement; re-tap refreshes
      if (!wasActive) toast('PEP IN YOUR STEP', 'museum coffee — 25 s');
    } });
    // no onStow needed: bagStow() calls holdItem(null) after it, dropping the cup
    // from the hand — steam stops (cup.parent!==handR) but the pep keeps running
    // (you drank it); pepT decays on its own below.

  // ---- SMASHED PENNIES — collectible; onUse toasts the designs owned n/4 ----
  bag.define({ id: 'pennies', name: 'smashed pennies', icon: '🪙', kind: 'collectible',
    caption: 'a dib a crank, a souvenir forever',
    onUse() {
      const n = state.pennies ? state.pennies.size : 0;
      toast('smashed pennies', n + ' of ' + DESIGNS.length + ' designs');
    } });

  // ---- pennies journal page — registered EAGERLY (fixed slot); '' until the
  //      first penny (the framework hides an empty render's header). ----
  journalSection('pennies', 'Smashed pennies 🪙', () => {
    const owned = state.pennies;
    if (!owned || !owned.size) return '';
    let rows = '';
    for (const d of DESIGNS) if (owned.has(d)) rows += `<div class="jrow"><span>${d}</span><b>✓</b></div>`;
    const n = bag.count('pennies');   // total cranks — PERSISTS via save.bag (state.penniesCranked is session-only)
    return rows + `<div class="jrow"><span>Cranked</span><b>${n} time${n === 1 ? '' : 's'}</b></div>`;
  });

  // ---- grant a penny (first-not-owned; once all 4 owned, cycle a repeat) ----
  function grantPenny() {
    state.pennies = state.pennies || new Set();          // whitelisted by the framework snapshot
    const next = DESIGNS.find(d => !state.pennies.has(d));
    bag.add('pennies');                                  // count = pennies made (persists in save.bag)
    if (next) {
      state.pennies.add(next);
      state.penniesCranked = (state.penniesCranked || 0) + 1;
      toast('smashed penny — ' + next, 'still warm');
    } else {
      // all four owned: the deliberate sink still works — cycle a repeat. Index
      // reads penniesCranked BEFORE the bump so the FIRST repeat is designs[0]
      // ('the Bean'), even after a reload (penniesCranked is session-only, so it
      // resets to 0 and the first post-reload repeat is 'the Bean' too).
      const rep = DESIGNS[(state.penniesCranked || 0) % DESIGNS.length];
      state.penniesCranked = (state.penniesCranked || 0) + 1;
      toast('…another ' + rep + '. the crank’s the point.');
    }
  }

  // ---- pep + steam per-frame (always runs; the coffee holds from any cell) ----
  registerUpdate((dt, t) => {
    if (pepT > 0) {
      pepT -= dt;
      // COMPOSITION: only raise to 1.22 if nothing stronger holds it (the 1.35
      // ENCASED MEATS buff writes speedMult every frame while active — never stomp it).
      if ((state.speedMult || 1) <= 1.22) state.speedMult = 1.22;
      if (pepT <= 0) {
        pepT = 0;
        if (state.speedMult === 1.22) state.speedMult = 1;   // only clear OUR buff
        toast('pep’s worn off', 'decaf now');
      }
    }
    // steam curls off the cup while it's in hand (~0.5 s cadence)
    steamT -= dt;
    if (steamT <= 0 && _cup && _cup.parent === mparts.handR) {
      steamT = 0.5;
      _cup.getWorldPosition(_cupW);
      const n = 2 + ((Math.random() * 2) | 0);
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2, r = 0.02 + Math.random() * 0.02;
        FX.spawn(_cupW.x + Math.cos(a) * r, _cupW.y + 0.14, _cupW.z + Math.sin(a) * r,
          Math.cos(a) * 0.12, 0.35 + Math.random() * 0.2, Math.sin(a) * 0.12,
          0.95, 0.95, 0.98, 0.8 + Math.random() * 0.3, 1.3, -1.1, 0.7);   // rises + curls (negative grav)
      }
    }
  });

  // ===================== the cart / penny build (cell root) =================
  // Parent the static meshes to the millennium cell root so they hide with the
  // cell. My pack imports LAST, so the cell exists by now; if not (PITFALLS
  // 051), defer the build to the first update frame.
  let built = false;
  function build(root) {
    // ---------------------------- THE CART ---------------------------------
    const GREEN = 0x2f6b58, GREEN_DK = 0x24503f, BRASS = 0xc9a227, WOOD = 0x8a6a44,
      CREAM = 0xf1e6ca, WHITE = 0xf2f0ea, IRON = 0x35373b;
    const cartParts = [];
    const P = (geo, hex) => cartParts.push(paint(geo, hex));
    // body cabinet + counter + brass trim
    P(new THREE.BoxGeometry(1.4, 0.95, 0.66).translate(0, 0.55, 0), GREEN);
    P(new THREE.BoxGeometry(1.42, 0.14, 0.68).translate(0, 0.28, 0), GREEN_DK);       // kick panel band
    P(new THREE.BoxGeometry(1.5, 0.08, 0.74).translate(0, 1.06, 0), CREAM);           // countertop
    P(new THREE.BoxGeometry(1.46, 0.05, 0.7).translate(0, 1.0, 0), BRASS);            // brass trim under the top
    P(new THREE.BoxGeometry(1.46, 0.05, 0.7).translate(0, 0.12, 0), BRASS);           // brass trim at the toe
    // two little cart wheels (axle along x -> rotateZ)
    for (const s of [-1, 1]) P(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12).rotateZ(Math.PI / 2).translate(s * 0.6, 0.16, 0.22), IRON);
    // parasol: pole + cream canopy cone + a green scalloped rim
    P(new THREE.CylinderGeometry(0.028, 0.028, 2.35, 8).translate(0, 1.2, -0.08), BRASS);
    P(new THREE.ConeGeometry(0.86, 0.44, 10).translate(0, 2.45, -0.08), CREAM);
    P(new THREE.TorusGeometry(0.84, 0.05, 6, 12).rotateX(Math.PI / 2).translate(0, 2.29, -0.08), GREEN);
    // cup pyramid on the counter (west end)
    for (const [dx, dy, dz] of [[-0.5, 0.16, 0.12], [-0.4, 0.16, 0.12], [-0.45, 0.28, 0.12]])
      P(new THREE.CylinderGeometry(0.045, 0.038, 0.1, 10).translate(dx, 1.06 + dy, dz), WHITE);
    // a small postcard rack (east end): frame + three cards
    P(new THREE.BoxGeometry(0.03, 0.34, 0.03).translate(0.5, 1.28, 0.1), WOOD);
    P(new THREE.BoxGeometry(0.03, 0.34, 0.03).translate(0.32, 1.28, 0.1), WOOD);
    P(new THREE.BoxGeometry(0.2, 0.03, 0.03).translate(0.41, 1.42, 0.1), WOOD);
    const cards = [0xd98a5a, 0x5a8ad9, 0x8ad95a];
    for (let i = 0; i < 3; i++) P(new THREE.BoxGeometry(0.13, 0.16, 0.01).translate(0.32 + i * 0.09, 1.3, 0.12), cards[i]);
    // sign backing panel on the WEST face (its solid body IS the sign's backing)
    P(new THREE.BoxGeometry(0.06, 0.5, 0.94).translate(-0.73, 0.62, 0), CREAM);

    const cartGroup = new THREE.Group();
    cartGroup.add(mergedMesh(cartParts));
    // 'COFFEE · SOUVENIRS' — FrontSide plane facing WEST (−x) toward Michigan
    // Ave; the cream backing panel behind it hides the mirrored back.
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.44),
      bmat(0xffffff, { map: signTex('COFFEE · SOUVENIRS'), side: THREE.FrontSide }));
    sign.position.set(-0.775, 0.62, 0); sign.rotation.y = -Math.PI / 2;   // face −x (west); 15 mm proud of the −0.76 backing face (anti z-fight)
    cartGroup.add(sign);
    cartGroup.position.set(CART.x, 0, CART.z);
    root.add(cartGroup);

    // ------------------------- THE PENNY MACHINE ---------------------------
    const RED = 0xb02a1f, RED_DK = 0x8a1f16, COPPER = 0xb87333, DARK = 0x201510, STEEL = 0x53565c;
    const bodyParts = [];
    const B = (geo, hex) => bodyParts.push(paint(geo, hex));
    for (const sx of [-1, 1]) for (const sz of [-1, 1])                                 // 4 legs
      B(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6).translate(sx * 0.17, 0.3, sz * 0.12), STEEL);
    B(new THREE.BoxGeometry(0.44, 0.7, 0.34).translate(0, 0.95, 0), RED);               // enamel body
    B(new THREE.BoxGeometry(0.46, 0.14, 0.36).translate(0, 1.34, 0), RED_DK);           // hood
    B(new THREE.BoxGeometry(0.4, 0.05, 0.02).translate(0, 1.2, 0.18), BRASS);           // display header
    for (let i = 0; i < 4; i++)                                                         // penny-design strip (4 copper discs, front face +z)
      B(new THREE.CylinderGeometry(0.045, 0.045, 0.018, 14).rotateX(Math.PI / 2).translate(-0.15 + i * 0.1, 1.06, 0.18), COPPER);
    B(new THREE.BoxGeometry(0.1, 0.035, 0.02).translate(0, 0.74, 0.18), DARK);          // the slot

    // the crank WHEEL — its own mesh so it can spin (axle along x, west side)
    const wheelParts = [];
    const W = (geo, hex) => wheelParts.push(paint(geo, hex));
    W(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 18).rotateZ(Math.PI / 2), IRON);     // big dark disc (face ±x)
    W(new THREE.TorusGeometry(0.26, 0.03, 6, 20).rotateY(Math.PI / 2), BRASS);          // rim
    // CREAM spokes on the dark disc + a proud RED handle read the rotation at a distance
    for (const rot of [0, Math.PI / 2]) W(new THREE.BoxGeometry(0.04, 0.5, 0.04).rotateX(rot), CREAM);   // two crossed spokes (y-z plane)
    W(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12).rotateZ(Math.PI / 2).translate(0.03, 0, 0), BRASS);   // hub
    W(new THREE.CylinderGeometry(0.025, 0.025, 0.11, 8).rotateZ(Math.PI / 2).translate(0.08, 0.19, 0), WHITE);   // handle grip (proud in +x, offset up)
    W(new THREE.SphereGeometry(0.055, 8, 6).translate(0.13, 0.19, 0), RED);             // handle knob

    const machineGroup = new THREE.Group();
    const bodyMesh = mergedMesh(bodyParts);
    const wheelMesh = mergedMesh(wheelParts);
    wheelMesh.position.set(-0.28, 0.95, 0);            // west side, at body-mid height
    machineGroup.add(bodyMesh, wheelMesh);
    machineGroup.position.set(PENNY.x, 0, PENNY.z);
    root.add(machineGroup);
    const SLOT = { x: PENNY.x, y: 0.74, z: PENNY.z + 0.2 };   // where the copper pop lands

    // colliders INBOARD on walkable ground (052/065): the cart ring (r+0.94≈1.94)
    // and the penny ring stay on the pre-probed sidewalk.
    collide(CART.x, CART.z, 1.0);
    collide(PENNY.x, PENNY.z, 0.6);

    // -------------------------------- KEEPER -------------------------------
    const keeper = makeNPC({ x: KEEPER.x, z: KEEPER.z, ry: Math.PI / 2, name: 'docent',   // ry=PI/2 faces east (+x)
      palette: { suit: 0x2f4a40, pants: 0x30353b, skin: 0xcaa079, hair: 0x241a12 },        // docent apron palette
      lines: ["the lions have names. I'm not telling.", 'museum price. the lions get a cut.',
        "crank's a dib. the penny's forever."] });
    keeper.group.position.y = 0;

    // ------------------------------- the SHOP ------------------------------
    addInteraction({ x: BROWSE.x, z: BROWSE.z, r: 2.2, label: 'browse the museum cart', onUse: () =>
      shop.open({ title: 'the museum cart', keeper: 'the lions are older than the coffee. barely.',
        items: [{ id: 'museum-coffee', price: 6 }, { id: 'boonie-hat', price: 22 }, { id: 'pom-hat', price: 25 }] }) });

    // -------------------------- THE PENNY MACHINE crank --------------------
    let crankT = 0, clickAcc = 0;
    addInteraction({ x: PENNY.x, z: PENNY.z, r: 2.0, label: 'smash a penny (1 dib)', onUse: () => {
      if (crankT > 0) return;                                   // already cranking
      if (!wallet.spendDibs(1, 'penny machine')) { toast('a dib a crank', 'the machine is firm on this'); return; }
      crankT = CRANK_DUR; clickAcc = 0;
    } });
    registerUpdate((dt, t) => {
      if (crankT <= 0) return;
      crankT -= dt;
      const prog = Math.min(1, 1 - crankT / CRANK_DUR);        // 0..1
      wheelMesh.rotation.x -= (5 + 22 * prog) * dt;            // accelerating spin
      machineGroup.rotation.z = Math.sin(t * 38) * 0.017 * (0.35 + 0.65 * prog);   // ~1° wiggle
      clickAcc -= dt;
      const interval = Math.max(0.04, 0.16 - 0.12 * prog);     // ratchet clicks accelerate
      if (clickAcc <= 0) { clickAcc = interval; ratchetClick(prog); }
      if (crankT <= 0) {
        machineGroup.rotation.z = 0;
        pennyDing();
        copperPop(SLOT.x, SLOT.y, SLOT.z);
        grantPenny();
      }
    });

    built = true;
  }

  // build now if the cell exists, else defer one-shot to the first frame (051)
  function tryBuild() {
    if (built) return true;
    const cell = getCell('millennium');
    if (!cell || !cell.root) return false;
    build(cell.root);
    return true;
  }
  if (!tryBuild()) {
    let h; h = registerUpdate(() => { if (tryBuild()) h.remove(); });
  }

  // ------------------------------- synth SFX ------------------------------
  // accelerating ratchet: a short band-passed square blip, quiet + actx-guarded.
  function ratchetClick(prog) {
    const a = getAudioCtx(); if (!a || !a.actx) return;
    const { actx, sfxBus } = a, dest = sfxBus || actx.destination, t = actx.currentTime;
    const o = actx.createOscillator(), g = actx.createGain(), f = actx.createBiquadFilter();
    o.type = 'square'; o.frequency.value = 170 + prog * 130;
    f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 7;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.028, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0006, t + 0.05);
    o.connect(f); f.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.06);
  }
  // the finish ding: two soft sine partials.
  function pennyDing() {
    const a = getAudioCtx(); if (!a || !a.actx) return;
    const { actx, sfxBus } = a, dest = sfxBus || actx.destination, t = actx.currentTime;
    [1568, 2093].forEach((fr, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), t0 = t + i * 0.015;
      o.type = 'sine'; o.frequency.value = fr;
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.5);
      o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + 0.55);
    });
  }
  // a small copper spark pop at the slot.
  function copperPop(x, y, z) {
    for (let k = 0; k < 10; k++) {
      const a = Math.random() * Math.PI * 2, sp = 1.2 * (0.5 + Math.random());
      FX.spawn(x + Math.cos(a) * 0.04, y, z + Math.sin(a) * 0.04, Math.cos(a) * sp, 1.0 + Math.random() * 1.3, Math.sin(a) * sp,
        0.72, 0.45, 0.2, 0.55, 2.2, 5, 0.5);
    }
  }
});
