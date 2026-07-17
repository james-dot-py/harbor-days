// =====================================================================
//  PACK: economy-pilot — THE BEACH KIOSK (task 078 pilot; EXPANDED task 080).
//  A tiny wooden concession stand on the grass just NORTH of the dog-beach
//  fence (the beach approach), selling toys that DO something (the
//  "toy, not trophy" law — none decrement):
//    * popcorn bag  — hold it; crumbs fall as you walk + the sanctuary flock
//                     flutters in to peck at your feet (nature.js setCrumbLure).
//    * tennis ball  — hold + charge-throw; any registered fetch-dog brings it
//                     back; else it rests and you pick it up again.
//    * skip pouch   — 080: an infinite pouch of flat stones; hold + charge-throw
//                     and they skip across open water (shallow skims bounce up to
//                     ~6 times with a rising plink + splash ring; steep = plonk).
//                     Shares the 'stones' payout key with activities1's rock pile.
//    * kite         — 080: hold a wrapped kite bundle + a hint pointing north to
//                     Cricket Hill, where montrose-kite.js reads bag.has('kite').
//  Cosmetics (the bucket hat and the new sun hats) now live in the hats pack;
//  this file keeps the shop ROWS for them but owns no cosmetic defs.
//
//  Only-my-file rules honoured: this module + ONE import line in index.js.
//  All setup inside onWorldReady. FIXED coords, ZERO rng (Math.random only for
//  the crumb jitter) — the world rng order is never touched. The kiosk is all
//  REGULAR meshes (no InstancedMesh), so it frustum-culls to zero cost away
//  from the beach. UI comes entirely from the framework shop/tote (no DOM here).
//  The sign uses the sign law (own canvas + measureText-fitted font + FrontSide
//  plane over a solid backing). Colliders sit INBOARD on walkable grass (052/065).
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, registerUpdate, addInteraction, makeNPC, chargeThrow,
         camForward, holdItem, toast, bag, shop, fetchDogs, wallet, getAudioCtx, state } from '../framework.js';
import { scene, toon, bmat, pip, WATER_Y } from '../core.js';
import { coastQuery, beachH, LAND } from '../coast.js';
import { pathSamples } from '../paths.js';
import { collide } from '../props.js';
import { mparts } from '../character.js';   // framework does NOT re-export mparts — import direct (022 mayor-only cosmetic)
import { FX } from '../fx.js';
import { setCrumbLure } from './nature.js';
import { keys, joy } from '../input.js';

// ------------------------------- site --------------------------------
// Site-audited grass N of the dog-beach fence (tools/tmp-078-kiosk-site.mjs +
// tmp-078-kiosk-scan.mjs): pip(LAND) true, coastQuery lat ≈ −92 (far inland of
// the terraces), ~7 m clear of the trail spur, ≥8 m from the plover pen /
// fetch-ball / lifeguard / sanctuary-gate birder, and a verified clear pocket
// (nearest scenery: two tiny saplings ~4 m east, the birder/bench cluster ~8 m
// west). The brief's first guess (96,−320) is basin WATER (pip(LAND) false).
const KX = 100, KZ = -353;   // kiosk centre; FRONT faces +z (south) toward the beach & the DOG BEACH sign

// ---- hoisted scratch (zero per-frame allocation) ----
const _wp = new THREE.Vector3();
const moving = () => keys.has('w') || keys.has('a') || keys.has('s') || keys.has('d') ||
  keys.has('arrowup') || keys.has('arrowdown') || keys.has('arrowleft') || keys.has('arrowright') || joy.len > 0.2;

// dead-space audit (cornhole's clearPath/auditLawn pattern): the whole stand
// shifts off any trail sample closer than 6 m; warn if off the lawn / near steps.
function clearPath(cx, cz) {
  let bd2 = Infinity, bx = cx, bz = cz;
  for (let i = 0; i < pathSamples.length; i++) { const s = pathSamples[i], dx = cx - s[0], dz = cz - s[1], d2 = dx * dx + dz * dz; if (d2 < bd2) { bd2 = d2; bx = s[0]; bz = s[1]; } }
  const d = Math.sqrt(bd2);
  if (d < 6) {
    let ux = cx - bx, uz = cz - bz; const L = Math.hypot(ux, uz) || 1; ux /= L; uz /= L;
    const push = Math.min(4, (6 - d) + 0.6);
    console.warn(`[kiosk] NUDGE site: (${cx},${cz}) was ${d.toFixed(2)} m from a path sample`);
    return { x: cx + ux * push, z: cz + uz * push };
  }
  return { x: cx, z: cz };
}
function auditLawn(x, z, name) {
  if (!pip(x, z, LAND)) console.warn(`[kiosk] ${name} off the LAND polygon at (${x.toFixed(1)},${z.toFixed(1)})`);
  const q = coastQuery(x, z);
  if (q && q.lat > -1.5) console.warn(`[kiosk] ${name} too close to the coast steps at (${x.toFixed(1)},${z.toFixed(1)})`);
}

// ---------------------------- sign texture ---------------------------
// own canvas + measureText-FITTED font (the 028/050 word-sign law), so the
// hand-painted board reads on a FrontSide plane (a solid backing hides the back).
function signTex(text) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 100; const g = cv.getContext('2d');
  g.fillStyle = '#f1e6ca'; g.fillRect(0, 0, 512, 100);                       // cream board
  g.strokeStyle = '#8a5a34'; g.lineWidth = 7; g.strokeRect(6, 6, 500, 88);   // wood frame
  g.fillStyle = '#7a4a1e'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 56; g.font = `800 ${fs}px "Trebuchet MS",sans-serif`;
  while (g.measureText(text).width > 466 && fs > 12) { fs -= 2; g.font = `800 ${fs}px "Trebuchet MS",sans-serif`; }
  g.fillText(text, 256, 54);
  const tx = new THREE.CanvasTexture(cv); tx.anisotropy = 4; return tx;
}

// ---------------------------- held props -----------------------------
function makePopcorn() {                                   // ~0.14 m: striped bag + popped-kernel dome
  const g = new THREE.Group();
  const bagBody = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.045, 0.12, 10), toon(0xf4f4f4)); g.add(bagBody);
  const red = toon(0xd8352c);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const s = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.12, 0.05), red); s.position.set(Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05); s.rotation.y = a; g.add(s); }
  const cream = toon(0xfff2cc);
  for (const [dx, dy, dz] of [[-0.025, 0.085, 0.01], [0.022, 0.095, -0.02], [0.0, 0.115, 0.025]]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.032, 7, 6), cream); k.position.set(dx, dy, dz); g.add(k); }
  return g;
}
function makeTennisBall() {                                // chartreuse sphere + a slim white seam (2 meshes)
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), toon(0xcadb2f)));
  const seam = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.008, 6, 20), toon(0xf6f6f2)); seam.rotation.x = 1.0; g.add(seam);
  return g;
}
function makePebble() {                                    // 080: a small flat gray skipping stone (1 mesh)
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), toon(0x6b6f76));
  m.scale.set(1, 0.42, 1.3);                              // squashed flat
  return m;
}
function makeKiteBundle() {                                // 080: a rolled-up kite for the hand (~4 tiny meshes)
  const g = new THREE.Group();
  const teal = toon(0x2aa6a0), stick = toon(0x9c6b3f), white = toon(0xf4f4f4);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.26, 10), teal); roll.rotation.z = Math.PI / 2; g.add(roll);   // rolled sail, lying flat
  const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.34, 6), stick); s1.rotation.z = Math.PI / 2 - 0.28; s1.position.set(0.02, 0.02, 0.005); g.add(s1);   // crossed spars poking out one end
  const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 6), stick); s2.rotation.z = Math.PI / 2 + 0.32; s2.position.set(0.02, -0.01, -0.01); g.add(s2);
  const bow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.012), white); bow.position.set(-0.16, -0.02, 0); bow.rotation.z = 0.6; g.add(bow);   // a little white bow tail
  return g;
}

// ---- skip-stone SFX + particles (080; self-contained, actx-guarded, quiet) ----
function stonePlink(n) {                                   // rising sine per skip (getAudioCtx guarded — actx null pre-start)
  const a = getAudioCtx(); if (!a || !a.actx) return;
  const { actx, sfxBus } = a, dest = sfxBus || actx.destination, t = actx.currentTime, base = 520 + Math.min(n, 6) * 95;
  const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(base * 0.9, t); o.frequency.exponentialRampToValueAtTime(base, t + 0.08);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.18);
}
function stonePlonk() {                                    // final sink: low thunk
  const a = getAudioCtx(); if (!a || !a.actx) return;
  const { actx, sfxBus } = a, dest = sfxBus || actx.destination, t = actx.currentTime;
  const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.28);
  g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.45);
}
function splashRing(x, z, big) {                           // droplet sparks + an expanding surface ring (activities1 recipe, smaller)
  const n = big ? 12 : 8;
  for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, sp = (big ? 2.2 : 1.4) * (0.5 + Math.random());
    FX.spawn(x, WATER_Y + 0.05, z, Math.cos(a) * sp, (big ? 3.6 : 2.4) * (0.55 + 0.5 * Math.random()), Math.sin(a) * sp, 0.72, 0.9, 1.0, big ? 0.55 : 0.4, big ? 3.2 : 2.4, 9, 0.4); }
  const rn = big ? 18 : 12, rs = big ? 3.4 : 2.2;
  for (let k = 0; k < rn; k++) { const a = k / rn * Math.PI * 2;
    FX.spawn(x, WATER_Y + 0.06, z, Math.cos(a) * rs, 0.1, Math.sin(a) * rs, 0.6, 0.86, 1.0, big ? 0.5 : 0.4, big ? 2.6 : 2.0, 0, 3.0); }
}
function dustPuff(x, y, z) {                               // dry inland clack: a few tan puffs at the ground
  for (let k = 0; k < 6; k++) { const a = Math.random() * Math.PI * 2, sp = 0.8 * (0.4 + Math.random());
    FX.spawn(x, y + 0.1, z, Math.cos(a) * sp, 0.5 + Math.random() * 0.6, Math.sin(a) * sp, 0.78, 0.72, 0.58, 0.5, 1.4, 6, 0.4); }
}

// ==================================================================== //
onWorldReady(player => {
  // ---------------------------- site audit ---------------------------
  const SITE = clearPath(KX, KZ);
  auditLawn(SITE.x, SITE.z, 'kiosk');
  const cx = SITE.x, cz = SITE.z, FRONT = cz + 0.5;        // counter/sign live on the +z (south) face

  // ------------------------------ build ------------------------------
  const wood = toon(0x9c6b3f), woodDk = toon(0x7d5330);
  const add = (m) => { scene.add(m); return m; };

  // 4 posts
  for (const px of [cx - 1.2, cx + 1.2]) for (const pz of [cz + 0.75, cz - 0.75]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.2, 8), wood);
    post.position.set(px, 1.1, pz); add(post);
  }
  // counter slab + front apron + side panels + a low back shelf
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.14, 0.72), woodDk); counter.position.set(cx, 1.0, cz + 0.5); add(counter);
  const apron = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.9, 0.07), wood); apron.position.set(cx, 0.55, cz + 0.85); add(apron);
  for (const sx of [cx - 1.2, cx + 1.2]) { const side = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.95, 1.4), wood); side.position.set(sx, 0.55, cz); add(side); }
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.4), woodDk); shelf.position.set(cx, 0.92, cz - 0.6); add(shelf);

  // scalloped peach/cream striped awning — alternating thin toon boxes read
  // cleaner than a texture at this size; a scallop valance hangs off the front.
  const peach = toon(0xf2a86a), cream = toon(0xf3e6cf);
  const peachDS = toon(0xf2a86a, { mat: { side: THREE.DoubleSide } }), creamDS = toon(0xf3e6cf, { mat: { side: THREE.DoubleSide } });
  const NST = 7, awW = 2.9, stW = awW / NST, awZ = cz + 0.35, awY = 2.35, tilt = 0.2;
  const scGeo = new THREE.CircleGeometry(0.2, 8, Math.PI, Math.PI);   // downward semicircle (theta π..2π), facing +z
  const feY = awY - Math.sin(tilt) * 0.52, feZ = awZ + Math.cos(tilt) * 0.52;   // front edge after the tilt
  for (let i = 0; i < NST; i++) {
    const px = cx - awW / 2 + stW * (i + 0.5);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(stW + 0.004, 0.06, 1.05), i % 2 ? cream : peach);
    stripe.position.set(px, awY, awZ); stripe.rotation.x = tilt; add(stripe);
    const sc = new THREE.Mesh(scGeo, i % 2 ? creamDS : peachDS);           // scallop bump under the front edge
    sc.position.set(px, feY - 0.02, feZ + 0.03); add(sc);
  }
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(awW, 0.16, 0.05), cream); fascia.position.set(cx, feY, feZ + 0.02); add(fascia);

  // hand-painted menu board across the counter FRONT (sign law): a FrontSide
  // canvas plane on the apron face — the solid apron behind it IS the backing,
  // and it sits below the counter so the keeper's head reads clear above.
  const signPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 0.6), bmat(0xffffff, { map: signTex('SNACKS · TOYS · KITES'), side: THREE.FrontSide }));
  signPlane.position.set(cx, 0.6, cz + 0.885); add(signPlane);

  // popcorn machine on the counter (warm amber glow = self-lit bmat)
  {
    const mx = cx - 0.55, mz = cz + 0.45, top = 1.07;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.34), toon(0xd23b34)); body.position.set(mx, top + 0.2, mz); add(body);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.28), bmat(0xffbf57, { transparent: true, opacity: 0.85 })); glass.position.set(mx, top + 0.22, mz); add(glass);
    for (const [dx, dy, dz] of [[-0.07, 0.3, 0.02], [0.05, 0.33, -0.03], [0.0, 0.36, 0.04], [0.09, 0.31, 0.03]]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 6), toon(0xfff2cc)); k.position.set(mx + dx, top + dy, mz + dz); add(k); }
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.38), toon(0xb52c25)); lid.position.set(mx, top + 0.44, mz); add(lid);
  }
  // a small pyramid of 3 tennis balls on the counter
  {
    const bx = cx + 0.7, bz = cz + 0.45, top = 1.09, ballMat = toon(0xcadb2f);
    for (const [dx, dy, dz] of [[-0.1, 0.09, 0], [0.1, 0.09, 0], [0.0, 0.24, 0]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 9), ballMat); b.position.set(bx + dx, top + dy, bz + dz); add(b); }
  }
  // 080 stock: a rolled kite leaning on the right post + two flat skipping stones on the counter (3 meshes, no rng)
  {
    const kiteDisp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 10), toon(0x2aa6a0)); kiteDisp.position.set(cx + 1.15, 0.72, cz + 0.6); kiteDisp.rotation.z = 0.3; add(kiteDisp);
    const stoneMat = toon(0x6b6f76);
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), stoneMat); s1.scale.set(1.3, 0.4, 1.5); s1.position.set(cx - 0.05, 1.11, cz + 0.52); add(s1);
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), stoneMat); s2.scale.set(1.3, 0.4, 1.5); s2.position.set(cx - 0.16, 1.11, cz + 0.44); add(s2);
  }

  // KEEPER — a teen NPC behind the counter, facing the customer (+z); green visor.
  const keeper = makeNPC({ x: cx, z: cz - 0.9, ry: 0, name: 'kioskteen',
    palette: { suit: 0x3ba6d6, pants: 0x33404a, skin: 0xd7a074, hair: 0x2a1d12 },
    lines: ["popcorn's fresh — the birds know it", "tennis balls are for the dogs. mostly.", "pop's in the cooler", "we take dibs", "flat stones skip best — try the rocks", "that kite wants Cricket Hill"] });
  keeper.group.position.y = 0;
  {                                                         // cheap visor: forward brim + a strap band on the head
    const vis = toon(0x2f9e5b);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 16, 1, false, 0, Math.PI), vis);
    brim.rotation.x = -Math.PI / 2; brim.position.set(0, 0.2, 0.34); keeper.parts.head.add(brim);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 16, Math.PI), vis); strap.rotation.y = -Math.PI / 2; strap.position.set(0, 0.2, 0); keeper.parts.head.add(strap);
  }

  // colliders INBOARD on walkable grass (052/065): three overlapping discs seal the
  // ~2.5 m footprint; the ring (r+0.34≈1.19) stays well inside the surrounding lawn.
  for (const px of [cx - 1.0, cx, cx + 1.0]) collide(px, cz, 0.85);

  // interaction at the counter front
  addInteraction({ x: cx, z: FRONT + 1.0, r: 2.6, label: 'browse the kiosk', onUse: () =>
    shop.open({ title: 'the beach kiosk', keeper: 'popcorn’s fresh. the birds know it.',
      items: [{ id: 'popcorn', price: 5 }, { id: 'tennis-ball', price: 8 }, { id: 'skip-pouch', price: 10 }, { id: 'kite', price: 15 }, { id: 'pirate-hat', price: 12 }, { id: 'bucket-hat', price: 20 }] }) });
      // bucket hat: the MILESTONE first hat. 082 balance pass lowered it 25 -> 20 so a
      // normally-engaged session-1 (a few zones + the pilot favor OR a couple activity
      // firsts, measured ~40-55 dibs; a light wanderer ~18-24) clears it comfortably —
      // "err generous: nobody quit Animal Crossing because the bells came too easy."

  // =================================================================== //
  //  ITEMS
  // =================================================================== //
  let popcornFirst = true;

  bag.define({ id: 'popcorn', name: 'popcorn bag', icon: '🍿', kind: 'holdable', caption: 'the birds will find you',
    onUse() { const p = makePopcorn(); p.position.set(0, 0.03, 0.05); holdItem(p); },
    onStow() { setCrumbLure(null); } });

  // ---- tennis ball: hold → charge-throw → fetch-dog / rest → pick up ----
  let tennisMesh = null, tennisState = 'stowed', goodDogToasted = false, fetchWatchdog = 0;
  const tball = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, restT: 0, life: 0 };
  const tennisGroundY = (x, z) => { const b = beachH(x, z); return b !== null ? b : (pip(x, z, LAND) ? 0 : WATER_Y); };
  const ensureBall = () => (tennisMesh || (tennisMesh = makeTennisBall()));
  // ONE player-following throw interaction (priority −1: every real prompt outranks it)
  const throwInter = addInteraction({ x: 0, z: 0, r: 1.5, priority: -1, label: 'throw the ball (hold)', onUse: () => startThrow() });
  throwInter.enabled = false;
  let pickupInter = null;
  function armPickup() {
    if (!pickupInter) pickupInter = addInteraction({ x: tball.x, z: tball.z, r: 1.9, label: 'pick up the ball', onUse: () => holdTennis() });
    else { pickupInter.x = tball.x; pickupInter.z = tball.z; }
    pickupInter.enabled = true;
  }
  function holdTennis() {                                   // (re)hold to hand — the def.onUse pattern, reused by the pickup
    const m = ensureBall();
    if (m.parent) m.parent.remove(m);
    m.position.set(0, 0.02, 0.04); m.rotation.set(0, 0, 0); m.scale.setScalar(1);
    holdItem(m);
    tennisState = 'held';
    if (pickupInter) pickupInter.enabled = false;
  }
  function dropTennisAt(x, z) {
    const gy = tennisGroundY(x, z);
    tball.x = x; tball.z = z; tball.y = gy + 0.09; tball.vx = tball.vy = tball.vz = 0; tball.restT = 0;
    const m = ensureBall(); if (m.parent !== scene) { if (m.parent) m.parent.remove(m); scene.add(m); }
    m.position.set(tball.x, tball.y, tball.z);
  }
  function startThrow() {
    if (tennisState !== 'held') return;
    chargeThrow({ onRelease(power) {
      if (tennisState !== 'held') return;                  // stale (stolen / stowed mid-charge)
      const m = ensureBall(); m.getWorldPosition(_wp);
      holdItem(null);                                       // detach from hand (clears the held marker)
      scene.add(m); m.position.copy(_wp); m.scale.setScalar(1);
      const f = camForward();
      tball.x = _wp.x; tball.y = _wp.y; tball.z = _wp.z;
      tball.vx = f.x * (6 + 9 * power); tball.vy = 2 + 2.2 * power; tball.vz = f.z * (6 + 9 * power);
      tball.restT = 0; tball.life = 0; tennisState = 'flying';
    } });
  }
  function ballRested() {                                   // ~0.25 s at low speed low to the ground
    // find the nearest available fetch-dog that can reach the ball (defensive:
    // empty registry / partial adapters are fine — we just arm the pickup)
    const bx = tball.x, bz = tball.z; let adapter = null, best = Infinity; const out = { x: 0, z: 0 };
    for (const a of fetchDogs) {
      if (!a || typeof a.available !== 'function' || !a.available()) continue;
      if (typeof a.canReach !== 'function' || !a.canReach(bx, bz)) continue;
      if (typeof a.pos === 'function') a.pos(out); const d = Math.hypot(out.x - bx, out.z - bz);
      if (d < best) { best = d; adapter = a; }
    }
    if (adapter && typeof adapter.fetch === 'function') {
      tennisState = 'fetching'; fetchWatchdog = 15;
      let closed = false;
      const finish = (dropX, dropZ, good) => {
        if (closed) return; closed = true; fetchWatchdog = 0;
        if (dropX !== undefined) dropTennisAt(dropX, dropZ); else dropTennisAt(tball.x, tball.z);
        if (good && !goodDogToasted) { goodDogToasted = true; toast('good dog', 'the goodest'); }
        // pay EVERY completed fetch (the toast is once-only; pay() owns its own
        // first-time logic + throttle). done() → the ball back at your feet.
        if (good) wallet.pay({ key: 'fetch', first: 5, repeat: 2, reason: 'fetch: good dog', label: 'fetch', cd: 4 });
        armPickup(); tennisState = 'resting';
      };
      try {
        adapter.fetch(bx, bz, {
          grab() { const m = ensureBall(); if (m.parent !== scene) { if (m.parent) m.parent.remove(m); scene.add(m); } },
          at(x, y, z) { ensureBall().position.set(x, y, z); },
          done(x, z) { finish(x, z, true); },
          abort() { finish(undefined, undefined, false); },
        });
      } catch (e) { console.warn('[kiosk] fetch adapter threw', e); armPickup(); tennisState = 'resting'; }
    } else {
      armPickup(); tennisState = 'resting';                 // no dog — just rest where it landed
    }
  }

  bag.define({ id: 'tennis-ball', name: 'tennis ball', icon: '🎾', kind: 'holdable', caption: 'every dog’s best day',
    onUse() { holdTennis(); },
    onStow() { if (tennisState === 'held') tennisState = 'stowed'; throwInter.enabled = false; } });

  // (bucket hat + the new sun hats now live in the hats pack — the shop lists
  //  'pirate-hat'/'bucket-hat' rows above by id; those cosmetic DEFS are not here.)

  // ---- skip-stone pouch (080): hold a flat pebble → charge-throw → skip on water ----
  // 'gear' kind (like the kite): a tote tap fires onUse and leaves the card open;
  // the hand-swap + our own state track holding (no _heldId marker for gear). The
  // pouch is INFINITE — every resolved throw refills the hand, nothing decrements.
  let pebMesh = null, pebbleState = 'stowed', pouchFirst = true;
  let curPX = 0, curPZ = 0;                                // live player pos (kept by the update; the kite hint reads it)
  const peb = { x: 0, y: 0, z: 0, x0: 0, z0: 0, vx: 0, vy: 0, vz: 0, skips: 0, t: 0, first: true };   // one live thrown stone (allocated once)
  const overWaterAt = (x, z) => beachH(x, z) === null && !pip(x, z, LAND);   // brief's water test: no beach + off the LAND polygon
  const ensurePebble = () => (pebMesh || (pebMesh = makePebble()));
  // ONE player-following throw interaction (priority −1: every real prompt outranks it)
  const stoneThrow = addInteraction({ x: 0, z: 0, r: 1.5, priority: -1, label: 'skip a stone (hold)', onUse: () => startStoneThrow() });
  stoneThrow.enabled = false;
  function holdPebble() {                                   // (re)fill the hand — used by the tote tap AND the auto-refill
    const m = ensurePebble();
    if (m.parent) m.parent.remove(m);
    m.position.set(0, 0.01, 0.04); m.rotation.set(0, 0, 0); m.scale.set(1, 0.42, 1.3);
    holdItem(m); pebbleState = 'held';
  }
  function startStoneThrow() {
    if (pebbleState !== 'held') return;
    chargeThrow({ onRelease(power) {
      if (pebbleState !== 'held') return;                  // stale (hand stolen / item swapped mid-charge)
      const m = ensurePebble(); m.getWorldPosition(_wp);
      holdItem(null); scene.add(m); m.position.copy(_wp); m.scale.set(1.3, 0.5, 1.7);
      const f = camForward(), speed = 6 + 10 * power;      // camForward on release only (no per-frame alloc)
      peb.x = _wp.x; peb.y = _wp.y; peb.z = _wp.z;
      peb.x0 = _wp.x; peb.z0 = _wp.z;                      // launch point — the safety net is RELATIVE to it
      peb.vx = f.x * speed; peb.vz = f.z * speed; peb.vy = 2 + 2 * power;
      peb.skips = 0; peb.t = 0; peb.first = true;
      pebbleState = 'flying'; stoneThrow.enabled = false;
      state.stonesThrown = (state.stonesThrown || 0) + 1;  // same counter the journal shows
    } });
  }
  function resolveStone(where) {                            // the ONE toast per throw + payout + auto-refill
    const n = peb.skips;
    if (n >= 1) toast(`${n} skip${n > 1 ? 's' : ''}!`, n >= 6 ? 'a beauty' : n >= 4 ? 'nice arm' : 'not bad');
    else if (where === 'land') toast('clack.');
    else if (where === 'water') toast('plonk!');
    // 'gone' (flew off the map — safety net) resolves silently.
    if (n >= 3) wallet.pay({ key: 'stones', first: 5, repeat: n >= 6 ? 3 : 2,   // SAME key as activities1 (shared activity, shared first)
      reason: n >= 6 ? 'skipped a beauty' : 'a good skip', firstReason: 'first good skip!' });
    holdPebble();                                          // a fresh flat one back in hand
  }

  bag.define({ id: 'skip-pouch', name: 'skip-stone pouch', icon: '🪨', kind: 'gear', caption: 'the lake is everywhere. so are stones.',
    onUse() { holdPebble(); if (pouchFirst) { pouchFirst = false; toast('a pocketful of flat ones', "find the water's edge and let one fly"); } },
    onStow() { const m = ensurePebble(); if (m.parent) m.parent.remove(m); if (pebbleState === 'held') pebbleState = 'stowed'; stoneThrow.enabled = false; } });

  // ---- kite (080): hold a wrapped bundle + a where-to-fly-it hint (Cricket Hill) ----
  // Owning it changes the Cricket Hill flight (montrose-kite.js reads bag.has('kite'));
  // here it is a held prop + a distance-aware hint toward the summit (108,−1316).
  let kiteMesh = null;
  bag.define({ id: 'kite', name: 'a kite of your own', icon: '🪁', kind: 'gear', caption: 'wants a hill and wind off the lake — Cricket Hill.',
    onUse() {
      const m = kiteMesh || (kiteMesh = makeKiteBundle());
      if (m.parent) m.parent.remove(m);
      m.position.set(0, 0.02, 0.05); m.rotation.set(0, 0, 0); holdItem(m);
      const d = Math.hypot(curPX - 108, curPZ + 1316);      // Cricket Hill summit
      if (d > 60) toast('the wind wants a hill', 'Cricket Hill — north end, past Montrose Harbor');
      else toast('this is the spot', 'the summit — fly it');
    } });

  // =================================================================== //
  //  single per-frame update — popcorn crumbs/lure + tennis ball
  // =================================================================== //
  let popHeldPrev = false, crumbT = 0, lureFn = null;
  registerUpdate((dt, t, pl) => {
    curPX = pl.x; curPZ = pl.z;                            // the kite hint reads the live player pos

    // --- POPCORN: crumbs while moving + keep nature's lure alive ---
    const popHeld = bag.heldId() === 'popcorn';
    if (popHeld) {
      if (!popHeldPrev) {
        popHeldPrev = true;
        if (!lureFn) lureFn = () => ({ x: pl.x, z: pl.z });
        setCrumbLure(lureFn);
        if (popcornFirst) { popcornFirst = false; toast('birder heresy', 'the flock forgives you'); }
      }
      if (moving()) { crumbT -= dt; if (crumbT <= 0) { crumbT = 0.45; spawnCrumbs(pl.x, pl.z); } }
    } else if (popHeldPrev) {                               // stopped being held (stowed OR stolen by another pack)
      popHeldPrev = false; setCrumbLure(null);
    }

    // --- TENNIS BALL ---
    if (tennisState === 'held') {
      // theft check: another pack grabbed the hand (fishing rod, popcorn, …)
      const m = ensureBall();
      if (m.parent !== mparts.handR) { tennisState = 'stowed'; throwInter.enabled = false; }
      else { throwInter.enabled = true; throwInter.x = pl.x; throwInter.z = pl.z; }
    } else if (throwInter.enabled) {
      throwInter.enabled = false;
    }
    if (tennisState === 'flying') {
      tball.vy -= 9 * dt;
      tball.x += tball.vx * dt; tball.y += tball.vy * dt; tball.z += tball.vz * dt;
      const gy = tennisGroundY(tball.x, tball.z);
      if (tball.y <= gy + 0.09) {
        tball.y = gy + 0.09;
        if (tball.vy < -0.5) { tball.vy = -tball.vy * 0.45; tball.vx *= 0.6; tball.vz *= 0.6; }
        else { tball.vy = 0; const fr = Math.max(0, 1 - 3 * dt); tball.vx *= fr; tball.vz *= fr; }
      }
      const m = ensureBall(); m.position.set(tball.x, tball.y, tball.z); m.rotation.x += 6 * dt; m.rotation.z += 5 * dt;
      const hs = Math.hypot(tball.vx, tball.vz);
      tball.restT = (hs < 0.5 && Math.abs(tball.vy) < 0.4 && tball.y <= gy + 0.1) ? tball.restT + dt : 0;
      tball.life += dt;
      if (tball.restT > 0.25 || tball.life > 12) ballRested();
    } else if (tennisState === 'fetching') {
      fetchWatchdog -= dt;
      if (fetchWatchdog <= 0) { dropTennisAt(tball.x, tball.z); armPickup(); tennisState = 'resting'; }   // 15 s watchdog → treat as abort
    }

    // --- SKIP-STONE POUCH ---
    if (pebbleState === 'held') {
      const m = ensurePebble();
      if (m.parent !== mparts.handR) { pebbleState = 'stowed'; stoneThrow.enabled = false; }   // hand swapped for another item
      else { stoneThrow.enabled = true; stoneThrow.x = pl.x; stoneThrow.z = pl.z; }
    } else if (pebbleState !== 'flying' && stoneThrow.enabled) {
      stoneThrow.enabled = false;
    }
    if (pebbleState === 'flying') {
      peb.vy -= 9 * dt;
      peb.x += peb.vx * dt; peb.y += peb.vy * dt; peb.z += peb.vz * dt;
      const m = ensurePebble(); m.position.set(peb.x, peb.y, peb.z); m.rotation.y += 16 * dt; m.rotation.x += 7 * dt;
      peb.t += dt;
      let resolved = false;
      if (peb.vy < 0) {                                     // only test contact while descending
        const gy = tennisGroundY(peb.x, peb.z);
        // WET = the open lake OR any ground sitting below the waterline (the
        // dog-beach pond's submerged sand is inside DOG_BEACH/LAND, so the
        // overWaterAt test alone called the pond "land" and stones clacked
        // invisibly underwater — visible water is water).
        if (overWaterAt(peb.x, peb.z) || gy <= WATER_Y + 0.05) {
          if (peb.y <= WATER_Y + 0.05) {
            // shallow-enough descent SKIMS (angle gate — a flat fast arrival, stricter after the first);
            // the launch sits ~3.7 m above the lake, so an absolute vy cutoff never skips (see task 080 note).
            const hs = Math.hypot(peb.vx, peb.vz), factor = peb.first ? 0.78 : 0.55;
            if (hs > 3 && Math.abs(peb.vy) < factor * hs && peb.skips < 6) {
              peb.first = false; peb.y = WATER_Y + 0.05;
              peb.vy = -peb.vy * 0.55; peb.vx *= 0.8; peb.vz *= 0.8;   // small hop + damp (brief)
              peb.skips++; splashRing(peb.x, peb.z, false); stonePlink(peb.skips);
            } else { splashRing(peb.x, peb.z, true); stonePlonk(); resolveStone('water'); resolved = true; }   // too steep/spent → PLONK
          }
        } else if (peb.y <= gy + 0.05) {                    // over dry LAND/sand: a clack
          dustPuff(peb.x, gy, peb.z); resolveStone('land'); resolved = true;
        }
      }
      // safety net RELATIVE to the launch (a fixed x 88..262 box silently ate
      // every throw outside the kiosk neighborhood — the harbor, Montrose, the
      // cells: 'skip anywhere' is the whole point of the pouch)
      if (!resolved && (peb.t > 8 || Math.abs(peb.x - peb.x0) > 150 || Math.abs(peb.z - peb.z0) > 150 || peb.y < WATER_Y - 6)) { resolveStone('gone'); resolved = true; }
    }
  });

  function spawnCrumbs(x, z) {                              // 2-3 tiny tan crumbs at the feet (activities1 spark recipe)
    const n = 2 + ((Math.random() * 2) | 0);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, sp = 0.5 * (0.4 + Math.random());
      FX.spawn(x + Math.cos(a) * 0.2, 0.35, z + Math.sin(a) * 0.2, Math.cos(a) * sp, 0.6 + Math.random() * 0.4, Math.sin(a) * sp,
        0.85, 0.72, 0.42, 0.6, 1.6, 6, 0.3);
    }
  }
});
