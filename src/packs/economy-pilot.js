// =====================================================================
//  PACK: economy-pilot — THE BEACH KIOSK + the three pilot toys (task 078).
//  A tiny wooden concession stand on the grass just NORTH of the dog-beach
//  fence (the beach approach), selling three things that DO something (the
//  "toy, not trophy" law — none decrement):
//    * popcorn bag  — hold it; crumbs fall as you walk + the sanctuary flock
//                     flutters in to peck at your feet (nature.js setCrumbLure).
//    * tennis ball  — hold + charge-throw; any registered fetch-dog brings it
//                     back; else it rests and you pick it up again.
//    * bucket hat   — the mayor actually WEARS it (parents to mparts.head,
//                     mayor-only per the 022 rules; rides every animation).
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
         camForward, holdItem, toast, bag, shop, fetchDogs } from '../framework.js';
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
function makeBucketHat() {                                 // olive-khaki, mayor head-local; 3 meshes (~+3 draws)
  const g = new THREE.Group();
  const khaki = toon(0x8a8a4e), band = toon(0x63632f);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.26, 16), khaki); crown.position.y = 0.14; g.add(crown);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.66, 0.1, 18, 1, true), khaki); brim.position.y = 0.0; g.add(brim);
  const bandM = new THREE.Mesh(new THREE.CylinderGeometry(0.428, 0.428, 0.07, 16), band); bandM.position.y = 0.04; g.add(bandM);
  g.rotation.x = 0.07;                                     // brim tips slightly down toward the front
  return g;
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
  const signPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 0.6), bmat(0xffffff, { map: signTex('SNACKS · POP · TENNIS BALLS'), side: THREE.FrontSide }));
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

  // KEEPER — a teen NPC behind the counter, facing the customer (+z); green visor.
  const keeper = makeNPC({ x: cx, z: cz - 0.9, ry: 0, name: 'kioskteen',
    palette: { suit: 0x3ba6d6, pants: 0x33404a, skin: 0xd7a074, hair: 0x2a1d12 },
    lines: ["popcorn's fresh — the birds know it", "tennis balls are for the dogs. mostly.", "pop's in the cooler", "we take dibs"] });
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
      items: [{ id: 'popcorn', price: 5 }, { id: 'tennis-ball', price: 8 }, { id: 'bucket-hat', price: 25 }] }) });

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

  // ---- bucket hat: mayor-only worn cosmetic (022) ----
  let hatMesh = null;
  bag.define({ id: 'bucket-hat', name: 'bucket hat', icon: '👒', kind: 'cosmetic', caption: 'lake-tested. mayor-approved.',
    onEquip() { if (!hatMesh) hatMesh = makeBucketHat(); hatMesh.position.set(0, 0.42, 0.02); if (hatMesh.parent !== mparts.head) mparts.head.add(hatMesh); },
    onUnequip() { if (hatMesh && hatMesh.parent) hatMesh.parent.remove(hatMesh); } });

  // =================================================================== //
  //  single per-frame update — popcorn crumbs/lure + tennis ball
  // =================================================================== //
  let popHeldPrev = false, crumbT = 0, lureFn = null;
  registerUpdate((dt, t, pl) => {
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
