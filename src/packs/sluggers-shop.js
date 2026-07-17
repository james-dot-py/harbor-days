// =====================================================================
//  PACK: sluggers-shop — "SLUGGERS TO-GO" walk-up window (task 080).
//  A diegetic to-go counter built into the SLUGGERS storefront on Clark St
//  (VILLAGE_W.clarkBars[0]), ~5 m north of the favor door so the two prompts
//  never fight. Sells a Chicago dog, an Old Style, and the Cubs-coded ballcap
//  (hats.js owns that def — we just list it).
//
//  The gags:
//    * hot dog  — hold a tiny Chicago dog (three SEGMENT groups); a player-
//                 following 'take a bite' eats it in three crunches + crumb
//                 puffs, then "no ketchup. obviously." A toy, not a trophy —
//                 no payout (the BUFFED lakefront dog in npcs.js is the trophy).
//    * Old Style — we RE-DEFINE the 'old-style' bag id (our def wins because we
//                 import after favors-pilot; favors-pilot keeps its OWN captured
//                 def for the door, so the favor still works). Carry one up to
//                 the Sheffield rooftop and rest it on the DRINK RAIL: a toast +
//                 the `rooftop.rail` payout.
//    * favor watch — buying an Old Style here (or already owning one) counts as
//                 step 1 of the Malört-guy favor (the door advances itself).
//
//  DIEGETIC BUILD: all static parts merge into ≤3 draw calls (hats.js paint()+
//  mergeBufferGeometries pattern) — ONE shared vertexColors toon mesh (ledge /
//  window frame / awning / a deco dog), ONE Old-Style-labelled can stack, and
//  ONE own-canvas menu board (measure-fitted, FrontSide — the sign law). Every
//  static mesh parents to wrigleyRoot (hides with the cell). No village.js add()
//  (it snapshots — PITFALLS). No collider: the batting-cage stair walls the
//  ledge off at ground level (probe tmp-080-slug-probe.mjs — the elevated ramp
//  occupies the frontage, so ground is unreachable there; a collider ring would
//  also cross non-walkable, violating the 065 law — so we add none).
//
//  Only-my-file rules: this module + ONE import line in packs/index.js. All
//  setup inside onWorldReady; Math.random only (never the world rng); toon()/
//  bmat() for every mesh; audio actx-guarded; storage only via bag/wallet/
//  favors; no DOM; scratch hoisted (no per-frame allocation).
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, registerUpdate, addInteraction, makeNPC, holdItem,
         toast, bag, shop, wallet, favors, getAudioCtx } from '../framework.js';
import { toon, bmat } from '../core.js';
import { mparts } from '../character.js';          // held-item theft check (framework doesn't re-export mparts)
import { FX } from '../fx.js';
import { oldStyleTex } from './malort.js';         // the shared Old Style can label (task 031)
import { wrigleyRoot } from '../wrigley/index.js'; // parent every static mesh here → hides with the cell
import { SLUGGERS_W, ROOFTOPS_W } from '../data/wrigleyville.js';

// ---- ONE shared white vertex-color toon material for the merged counter ----
// (hats.js law: white × per-vertex color == a per-color toon under r128's
// LinearEncoding; cache it ourselves so toon()'s uncached-with-opts path stays
// one material → the whole merge is one draw.)
let _vc = null;
const vc = () => _vc || (_vc = toon(0xffffff, { mat: { vertexColors: true } }));
const _col = new THREE.Color();
function paint(geo, hex) {                          // non-index + stamp a solid 'color' attr so parts merge under vc()
  geo = geo.toNonIndexed();
  _col.set(hex);
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = _col.r; a[i * 3 + 1] = _col.g; a[i * 3 + 2] = _col.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}

// ---------------------------- menu board texture ---------------------------
// own canvas + measureText-FITTED font (the 028/050 word-sign law) so a chalk
// menu reads on a FrontSide plane facing the street.
function menuTex() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 340; const g = cv.getContext('2d');
  g.fillStyle = '#6b4a2a'; g.fillRect(0, 0, 256, 340);                   // wood frame
  g.fillStyle = '#182a1d'; g.fillRect(12, 12, 232, 316);                 // chalkboard
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const line = (txt, y, size, col) => { g.fillStyle = col; let fs = size; g.font = `800 ${fs}px "Trebuchet MS",sans-serif`;
    while (g.measureText(txt).width > 210 && fs > 10) { fs -= 2; g.font = `800 ${fs}px "Trebuchet MS",sans-serif`; } g.fillText(txt, 128, y); };
  line('SLUGGERS', 54, 42, '#ffd24a');
  line('TO-GO', 94, 34, '#ffd24a');
  g.strokeStyle = '#d8b24a'; g.lineWidth = 3; g.beginPath(); g.moveTo(38, 122); g.lineTo(218, 122); g.stroke();
  line('Chicago dog · 6', 162, 26, '#f4efe2');
  line('Old Style · 6', 206, 26, '#f4efe2');
  line('ballcap · 25', 250, 26, '#f4efe2');
  line('no ketchup.', 302, 24, '#8fd0a0');
  const tx = new THREE.CanvasTexture(cv); tx.anisotropy = 4; return tx;
}

// ---------------------------- the held Chicago dog -------------------------
// three SEGMENT groups (thirds along the frank) so each bite can HIDE a segment:
// poppy bun · frank · yellow mustard · NEON relish · tomato wedge · pickle.
function makeHeldDog() {
  const grp = new THREE.Group();
  const bun = toon(0xdcb877), frank = toon(0x9c4a2a), mustard = toon(0xf2c200),
        relish = toon(0x59c23a), tomato = toon(0xd8382a), pickle = toon(0x3a7d2a);
  const segs = [], N = 3, segL = 0.052, total = N * segL;
  for (let i = 0; i < N; i++) {
    const s = new THREE.Group(), z0 = -total / 2 + segL * (i + 0.5);
    for (const dx of [-0.03, 0.03]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.05, segL * 0.96), bun); b.position.set(dx, 0.008, z0); s.add(b); }  // bun cheeks
    const fr = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, segL * 0.98, 8), frank); fr.rotation.x = Math.PI / 2; fr.position.set(0, 0.03, z0); s.add(fr);
    const mu = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, segL * 0.9), mustard); mu.position.set(-0.009, 0.052, z0); mu.rotation.y = 0.5; s.add(mu);          // mustard zigzag
    const re = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.009, segL * 0.9), relish); re.position.set(0.009, 0.052, z0); s.add(re);                                  // neon relish
    const to = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.012), tomato); to.position.set(0, 0.03, z0 - 0.006); s.add(to);                                     // tomato wedge
    const pk = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.008, 0.01), pickle); pk.position.set(0, 0.02, z0 + 0.013); pk.rotation.z = 0.2; s.add(pk);                // pickle spear
    grp.add(s); segs.push(s);
  }
  return { group: grp, segments: segs };
}

// a plain Old Style can — same recipe as favors-pilot / malort (shared label)
const canGeo = () => new THREE.CylinderGeometry(0.055, 0.055, 0.16, 12);
const newCan = () => new THREE.Mesh(canGeo(), bmat(0xffffff, { map: oldStyleTex() }));

// ---- crunch SFX (npcs.js sCrunch recipe; self-contained, actx-guarded) ----
function crunch() {
  const a = getAudioCtx(); if (!a || !a.actx || !a.noiseBuf) return;
  const { actx, sfxBus, noiseBuf } = a, t = actx.currentTime, dest = sfxBus || actx.destination;
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(950, t); f.frequency.exponentialRampToValueAtTime(240, t + 0.12); f.Q.value = 1.2;
  const g = actx.createGain(); g.gain.setValueAtTime(0.17, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + 0.16);
}
function crumbPuff(x, z) {                          // economy-pilot spawnCrumbs recipe (tan crumbs at the feet)
  const n = 2 + ((Math.random() * 2) | 0);
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, sp = 0.5 * (0.4 + Math.random());
    FX.spawn(x + Math.cos(a) * 0.2, 0.35, z + Math.sin(a) * 0.2, Math.cos(a) * sp, 0.6 + Math.random() * 0.4, Math.sin(a) * sp,
      0.85, 0.72, 0.42, 0.6, 1.6, 6, 0.3);
  }
}

// ==================================================================== //
onWorldReady(() => {
  // ---- SLUGGERS storefront local frame (matches village buildBars + WALK_W) ----
  const SL = SLUGGERS_W, th = SL.th, c = Math.cos(th), s = Math.sin(th);
  const w2 = (lx, lz) => [SL.cx + lx * c + lz * s, SL.cz - lx * s + lz * c];   // building-local → world
  const FACE = 6.0, ZW = 5.3;                       // street face (dep/2) · window centre (world z ≈ −476.5)
  const [AWX, AWZ] = w2(9.0, ZW);                   // interaction anchor, out on the Clark sidewalk east of the stair
  const [KWX, KWZ] = w2(FACE + 0.1, ZW);            // keeper, just proud of the face (visible in the opening)

  // ---- the static installation (all local coords; one group carries the frame) ----
  const inst = new THREE.Group();
  inst.position.set(SL.cx, 0, SL.cz); inst.rotation.y = th; wrigleyRoot.add(inst);

  const wood = 0x9c6b3f, woodDk = 0x7d5330, frame = 0x33261a, peach = 0xf2a86a, cream = 0xf3e6cf;
  const dBun = 0xdcb877, dFrank = 0x9c4a2a, dMust = 0xf2c200, dRelish = 0x59c23a;
  const parts = [];
  const push = (geo, hex) => parts.push(paint(geo, hex));

  // counter ledge + front apron (hugs the face; protrudes ≤0.5 m)
  push(new THREE.BoxGeometry(0.5, 0.13, 1.95).translate(FACE + 0.2, 1.08, ZW), wood);
  push(new THREE.BoxGeometry(0.08, 0.6, 1.95).translate(FACE + 0.42, 0.75, ZW), woodDk);

  // window frame around the serving opening (lintel + two jambs; opening y1.15..2.1)
  push(new THREE.BoxGeometry(0.12, 0.16, 1.95).translate(FACE + 0.06, 2.18, ZW), frame);
  push(new THREE.BoxGeometry(0.12, 1.05, 0.14).translate(FACE + 0.06, 1.62, ZW - 0.9), frame);
  push(new THREE.BoxGeometry(0.12, 1.05, 0.14).translate(FACE + 0.06, 1.62, ZW + 0.9), frame);

  // striped awning projecting east over the counter, sloped down toward the street
  const NST = 7, awW = 2.2, stW = awW / NST, awX = FACE + 0.55, awY = 2.55, tilt = 0.30;
  for (let i = 0; i < NST; i++) {
    const z = ZW - awW / 2 + stW * (i + 0.5);
    const g = new THREE.BoxGeometry(0.95, 0.05, stW + 0.004); g.rotateZ(-tilt); g.translate(awX, awY, z);
    push(g, i % 2 ? cream : peach);
  }
  const feX = awX + Math.cos(tilt) * 0.475, feY = awY - Math.sin(tilt) * 0.475;   // valance along the tilted front edge
  push(new THREE.BoxGeometry(0.06, 0.15, awW).translate(feX, feY, ZW), cream);

  // a deco Chicago dog on the ledge (south of centre; vertex-color, in the merge)
  const ddx = FACE + 0.22, ddz = ZW - 0.62, ddy = 1.19;
  push(new THREE.BoxGeometry(0.26, 0.06, 0.1).translate(ddx, ddy, ddz), dBun);
  push(new THREE.CylinderGeometry(0.028, 0.028, 0.24, 8).rotateX(Math.PI / 2).translate(ddx, ddy + 0.05, ddz), dFrank);
  push(new THREE.BoxGeometry(0.22, 0.02, 0.02).translate(ddx, ddy + 0.09, ddz - 0.02), dMust);
  push(new THREE.BoxGeometry(0.22, 0.02, 0.03).translate(ddx, ddy + 0.09, ddz + 0.02), dRelish);

  inst.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(parts, false), vc()));   // DRAW 1

  // Old Style can stack on the ledge (north of centre) — one merged mesh, one label
  const canParts = [], canY = 1.145 + 0.08;
  for (const [dz, dy] of [[0, 0], [0.14, 0], [0.07, 0.16]])
    canParts.push(canGeo().translate(FACE + 0.18, canY + dy, ZW + 0.5 + dz));
  inst.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(canParts, false), bmat(0xffffff, { map: oldStyleTex() })));   // DRAW 2

  // menu board (own canvas, FrontSide facing the street) beside the window (south jamb)
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.82), bmat(0xffffff, { map: menuTex(), side: THREE.FrontSide }));
  sign.position.set(FACE + 0.11, 1.72, ZW - 1.4); sign.rotation.y = Math.PI / 2; inst.add(sign);   // DRAW 3

  // ---- the keeper: makeNPC behind the window, facing the customer (+x/east) ----
  const keeper = makeNPC({ x: KWX, z: KWZ, ry: th + Math.PI / 2, name: 'sluggersteen', wander: 0,
    palette: { suit: 0xb42d2d, pants: 0x2b2b30, skin: 0xcaa070, hair: 0x241a12 },
    lines: ['drag it through the garden', "no ketchup. don't ask.", 'we take dibs', 'poppy seeds are non-negotiable', 'celery salt, chief'] });
  keeper.group.position.y = 0;

  // ---- the shop interaction at the window ----
  addInteraction({ x: AWX, z: AWZ, r: 2.2, label: 'grab a dog & a cold one', onUse: () =>
    shop.open({ title: 'Sluggers to-go', keeper: "no ketchup. don't ask.",
      items: [{ id: 'hot-dog', price: 6 }, { id: 'old-style', price: 6 }, { id: 'cubs-cap', price: 25 }] }) });

  // =================================================================== //
  //  ITEMS
  // =================================================================== //
  // ---- hot dog: hold a 3-segment dog → 'take a bite' ×3 → empty hand ----
  let dogMesh = null, dogSegs = null, dogBites = 0, dogState = 'stowed';
  let curPX = AWX, curPZ = AWZ;                      // live player pos (bite crumbs read it; no per-frame alloc)
  const ensureDog = () => { if (!dogMesh) { const d = makeHeldDog(); dogMesh = d.group; dogSegs = d.segments; } return dogMesh; };
  // ONE player-following bite interaction (priority −1: every real prompt outranks it — the pouch pattern)
  const biteInter = addInteraction({ x: 0, z: 0, r: 1.5, priority: -1, label: 'take a bite', onUse: () => takeBite() });
  biteInter.enabled = false;
  function holdDog() {
    const m = ensureDog();
    if (m.parent) m.parent.remove(m);
    for (const seg of dogSegs) seg.visible = true; dogBites = 0;   // a fresh whole dog every hold
    m.position.set(0.02, 0.05, 0.11); m.rotation.set(0.12, 0.35, 0); m.scale.setScalar(1.35);
    holdItem(m); dogState = 'held';
  }
  function takeBite() {
    if (dogState !== 'held' || dogBites >= 3) return;
    dogSegs[dogBites].visible = false; dogBites++;
    crunch(); crumbPuff(curPX, curPZ);
    if (dogBites >= 3) {                             // last bite: hand empties, the punchline, no payout (toy, not trophy)
      holdItem(null); dogState = 'stowed'; biteInter.enabled = false;
      crumbPuff(curPX, curPZ);
      toast('no ketchup. obviously.', 'celery salt, if you must');
    }
  }
  bag.define({ id: 'hot-dog', name: 'Chicago dog', icon: '🌭', kind: 'holdable',
    caption: 'drag it through the garden — no ketchup, ever',
    onUse() { holdDog(); },
    onStow() { if (dogState === 'held') { dogState = 'stowed'; biteInter.enabled = false; } } });

  // ---- Old Style: RE-DEFINE the id (our def wins; favors-pilot keeps its own) ----
  let osMesh = null;
  bag.define({ id: 'old-style', name: 'Old Style (cold)', icon: '🍺', kind: 'holdable',
    caption: 'rest it on the Sheffield rooftop drink rail',
    onUse() { const can = osMesh || (osMesh = newCan()); if (can.parent) can.parent.remove(can); can.position.set(0, 0.05, 0); holdItem(can); },
    onStow() {} });

  // =================================================================== //
  //  THE DRINK RAIL — rest an Old Style on the Sheffield rooftop rail
  // =================================================================== //
  const SH = ROOFTOPS_W.sheffield[0], roofY = ROOFTOPS_W.roofY;
  const railX = SH.x0 + 0.34, railTopY = roofY + 1.02;              // buildSheffieldExtras drink-rail geometry
  const RAIL_CAN = { x: railX + 0.12, y: railTopY + 0.1, z: -526 }; // sits ON the rail top (matches the cup boxes)
  let railCan = null;
  const railInter = addInteraction({ x: SH.x0 + 0.6, z: -526, r: 2.0, priority: 3, label: 'rest the Old Style on the rail',
    onUse(pl) {
      if (pl.y < 8) return;                          // must be up on the deck
      if (!railCan) { railCan = newCan(); railCan.position.set(RAIL_CAN.x, RAIL_CAN.y, RAIL_CAN.z); wrigleyRoot.add(railCan); }
      holdItem(null);                                // the can leaves your hand (no-op if stowed)
      toast('to the lake', 'an Old Style at the drink rail');
      wallet.pay({ key: 'rooftop.rail', first: 5, repeat: 2, reason: 'the drink rail', label: 'rooftop', cd: 20 });
    } });
  railInter.enabled = false;

  // =================================================================== //
  //  per-frame: bite-interaction follow · favor watch · rail enable poll
  // =================================================================== //
  let favAcc = 0, railAcc = 0;
  registerUpdate((dt, t, pl) => {
    curPX = pl.x; curPZ = pl.z;

    // dog held? enable + follow the bite prompt; theft (hand swapped) drops it
    if (dogState === 'held') {
      const m = ensureDog();
      if (m.parent !== mparts.handR) { dogState = 'stowed'; biteInter.enabled = false; }
      else { biteInter.enabled = true; biteInter.x = pl.x; biteInter.z = pl.z; }
    } else if (biteInter.enabled) biteInter.enabled = false;

    // FAVOR WATCH (~0.5 s): a counter buy / a pre-owned can counts as step 1.
    // (The favor DOOR advances itself, so step===0 here means it came another way.)
    favAcc -= dt;
    if (favAcc <= 0) {
      favAcc = 0.5;
      const f = favors.at('oldstyle');
      if (f.st === 'active' && f.step === 0 && bag.has('old-style')) {
        favors.advance('oldstyle');
        toast('"for HIM? …tell him he still owes me"', 'that counts — bring it to the Rocks');
      }
    }

    // RAIL PROMPT (~0.5 s): live only while you own an Old Style
    railAcc -= dt;
    if (railAcc <= 0) { railAcc = 0.5; railInter.enabled = bag.has('old-style'); }
  });
});
