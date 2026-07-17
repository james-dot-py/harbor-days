// =====================================================================
//  FAVORS — WRIGLEYVILLE (task 081): two errands INSIDE the bowl pocket cell.
//  Needing a ticket is the point (it feeds the wrigley city-stamp signature).
//  Both favors reuse the existing cast through tiny read-only hooks:
//    * umpHooks   (wrigley-bowl.js) — THE UMP + his post/chase FSM state.
//    * vendorHooks(wrigley-game.js) — 'the hot dog guy' patrolling the concourse.
//  This pack ADDS interactions + one-off frustum-culled props; it changes ZERO
//  behavior in either hooked file.
//
//  umpwhistle — "the gull's got the whistle." Offer at the ump (only while his
//    FSM idles at 'post', never mid-chase). A cocky toon GULL struts a fixed
//    loop of concourse perches; get within ~3.5 m and it flap-hops to the next.
//    After the 3rd flush it DROPS the whistle + departs for the rafters; grab it
//    (E), carry it back to the ump. +12 dibs.
//  poppybuns — "buns by the seventh." Offer at the vendor's patrol-arc centre
//    (he oscillates through it). Ride the Addison L to Belmont, grab a paper sack
//    of poppy-seed buns at the beach kiosk, ride back, hand them over. +12 dibs.
//
//  Laws honoured (ECONOMY.md §3 / 081 spec): never the word "quest"; no timers
//  or fail states (a miss just resets the chase — the gull waits); offers gate on
//  rotation.offerable(); favor state is the framework's {st,step} ONLY (no coords
//  in the save — the gull chase always resumes fresh from step 0); Math.random
//  only for session flap timing (NEVER the world rng); one merged toon mesh per
//  prop under a shared vertexColors material (1 draw each; zero new instanced
//  buckets); props parent into the bowl cell root so they cull with the cell.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon } from '../core.js';
import { onWorldReady, registerUpdate, addInteraction, holdItem, toast,
         favors, bag, getAudioCtx } from '../framework.js';
import { getCell, activeCell } from '../cells.js';
import { rotation } from './favors-core.js';
import { umpHooks } from './wrigley-bowl.js';       // {npc, refState():'post'|...} — set in its onWorldReady (earlier in import order)
import { vendorHooks } from './wrigley-game.js';     // {npc} — set in buildVendor()
import { HP_B, BACK_B, rWallB, WALL_T_B, CONC_W_B, CELL_ID_B } from '../data/wrigley-bowl.js';

// -------- concourse geometry (derived from data consts; 084-proof) ----------
const at = (r, th) => [HP_B[0] + Math.sin(th) * r, HP_B[1] + Math.cos(th) * r];
const midR = th => rWallB(th) + WALL_T_B + CONC_W_B / 2;      // centre of the walkable ring
const wrap = a => ((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

// GULL perch loop — 4 fixed concourse points (verified walkable, ≥3.5 m from
// every wb-* waypoint stand, clear of the vendor's th=BACK+0.3±0.6 patrol arc;
// see tools/tmp-081-wr-geo.mjs). The chase visits P0→P1→P2 (whistle drops at P2);
// P3 completes the "owns the whole joint" loop but isn't reached before the drop.
const PERCH_S = [-0.42, -1.00, -1.25, 1.00];
const FLUSH_R = 3.5;

// ---- merge/paint helpers (hats.js recipe: one vertexColors toon mat = 1 draw) ----
let _vc = null;
const vcMat = () => _vc || (_vc = toon(0xffffff, { mat: { vertexColors: true } }));
const _col = new THREE.Color();
function paint(geo, hex) {
  geo = geo.toNonIndexed();
  _col.set(hex);
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = _col.r; a[i * 3 + 1] = _col.g; a[i * 3 + 2] = _col.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
const merged = parts => new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(parts, false), vcMat());

// ------------------------------- props ---------------------------------
function makeGull() {                                   // ~0.35 m, faces +z (beak forward)
  const white = 0xf3f2ee, grey = 0xacb2bb, beak = 0xe7a13a, eye = 0x24272d, leg = 0xdf8f2a;
  const body = new THREE.SphereGeometry(0.11, 12, 10); body.scale(0.9, 0.92, 1.55); body.translate(0, 0.13, 0);
  const mantle = new THREE.SphereGeometry(0.095, 10, 8); mantle.scale(0.92, 0.5, 1.35); mantle.translate(0, 0.2, -0.03);   // grey back
  const head = new THREE.SphereGeometry(0.075, 12, 10); head.translate(0, 0.25, 0.14);
  const bk = new THREE.ConeGeometry(0.03, 0.1, 8); bk.rotateX(Math.PI / 2); bk.translate(0, 0.245, 0.24);
  const tail = new THREE.BoxGeometry(0.1, 0.03, 0.14); tail.rotateX(-0.25); tail.translate(0, 0.15, -0.16);
  const wingL = new THREE.SphereGeometry(0.06, 8, 6); wingL.scale(0.42, 0.72, 1.75); wingL.translate(0.085, 0.14, -0.03);   // folded wings
  const wingR = new THREE.SphereGeometry(0.06, 8, 6); wingR.scale(0.42, 0.72, 1.75); wingR.translate(-0.085, 0.14, -0.03);
  const eyeL = new THREE.SphereGeometry(0.014, 6, 5); eyeL.translate(0.05, 0.265, 0.18);
  const eyeR = new THREE.SphereGeometry(0.014, 6, 5); eyeR.translate(-0.05, 0.265, 0.18);
  const legL = new THREE.CylinderGeometry(0.012, 0.012, 0.09, 6); legL.translate(0.03, 0.045, 0.02);
  const legR = new THREE.CylinderGeometry(0.012, 0.012, 0.09, 6); legR.translate(-0.03, 0.045, 0.02);
  return merged([paint(body, white), paint(mantle, grey), paint(head, white), paint(bk, beak),
    paint(tail, grey), paint(wingL, grey), paint(wingR, grey),
    paint(eyeL, eye), paint(eyeR, eye), paint(legL, leg), paint(legR, leg)]);
}
function makeWhistle() {                                // tiny silver whistle + red lanyard
  const silver = 0xcfd3d9, dark = 0x8b9096, red = 0xc0392b;
  const barrel = new THREE.CylinderGeometry(0.028, 0.028, 0.08, 10); barrel.rotateZ(Math.PI / 2); barrel.translate(0, 0.03, 0);
  const mouth = new THREE.BoxGeometry(0.032, 0.022, 0.03); mouth.translate(-0.052, 0.03, 0);
  const chamber = new THREE.SphereGeometry(0.02, 8, 6); chamber.scale(1, 1.25, 1); chamber.translate(0.018, 0.05, 0);
  const loop = new THREE.TorusGeometry(0.014, 0.005, 6, 12); loop.rotateY(Math.PI / 2); loop.translate(0.05, 0.052, 0);
  const lanyard = new THREE.TorusGeometry(0.05, 0.006, 6, 22); lanyard.rotateX(1.15); lanyard.translate(0.06, 0.02, 0);
  return merged([paint(barrel, silver), paint(mouth, silver), paint(chamber, dark), paint(loop, silver), paint(lanyard, red)]);
}
function makePoppySack() {                              // kraft paper bag, folded top, dark poppy specks
  const kraft = 0xc9a874, fold = 0xb8955f, dot = 0x2c2a27;
  const body = new THREE.BoxGeometry(0.11, 0.15, 0.08); body.translate(0, 0.075, 0);
  const top = new THREE.BoxGeometry(0.115, 0.035, 0.086); top.translate(0, 0.16, 0);
  const parts = [paint(body, kraft), paint(top, fold)];
  for (const [dx, dy] of [[-0.03, 0.06], [0.02, 0.09], [-0.01, 0.045], [0.032, 0.05], [0.005, 0.11]]) {
    const d = new THREE.SphereGeometry(0.008, 6, 5); d.translate(dx, dy, 0.041); parts.push(paint(d, dot));
  }
  return merged(parts);
}

// ------------------------------- state ---------------------------------
let PERCHES = [];                       // [{x,z,th}] computed at worldReady
let cellRoot = null, clock = 0;
let gull = null, gi = 0, flushes = 0, gullMode = 'idle';   // idle | hop | depart
let hopT = 0, hopDur = 0, hopArc = 0, fromX = 0, fromZ = 0, toX = 0, toZ = 0, idleT = 0;
let departT = 0, departVX = 0, departVZ = 0;
let whistle = null, whistlePos = null;

function ensureRoot() { if (!cellRoot) { const c = getCell(CELL_ID_B); if (c) cellRoot = c.root; } return cellRoot; }

function buildGull() {
  if (gull) return;
  const root = ensureRoot(); if (!root) return;
  gull = makeGull();
  gi = 0; flushes = 0; gullMode = 'idle'; idleT = Math.random() * 6.28;
  const p = PERCHES[gi];
  gull.position.set(p.x, 0, p.z); gull.rotation.set(0, wrap(p.th + Math.PI), 0); gull.scale.set(1, 1, 1);
  root.add(gull);
}
function removeGull() { if (gull) { if (gull.parent) gull.parent.remove(gull); gull = null; } }

function startHop(nextIdx) {
  const from = PERCHES[gi], to = PERCHES[nextIdx];
  fromX = from.x; fromZ = from.z; toX = to.x; toZ = to.z;
  const d = dist(fromX, fromZ, toX, toZ);
  hopDur = Math.min(1.05, 0.55 + d * 0.045);           // 0.6..~1.0 s, longer for longer flights
  hopArc = Math.min(2.7, 0.9 + d * 0.16);              // tall parabola → reads as a flap-flight, not a slide
  hopT = 0; gullMode = 'hop'; gi = nextIdx;
  gull.rotation.y = Math.atan2(toX - fromX, toZ - fromZ);
}
function clatter() {
  const A = getAudioCtx(); if (!A || !A.actx || !A.noiseHit) return;
  const t = A.actx.currentTime;
  A.noiseHit(t, 0.04, 'highpass', 2600, 1.0, 0.06);
  A.noiseHit(t + 0.06, 0.05, 'bandpass', 1800, 1.4, 0.05);
  A.noiseHit(t + 0.13, 0.04, 'highpass', 2200, 1.0, 0.04);
}
function dropWhistle() {
  const p = PERCHES[gi];
  whistle = makeWhistle(); whistle.position.set(p.x, 0.06, p.z); whistle.scale.setScalar(1.4);   // a touch larger so it reads on the concourse
  const root = ensureRoot(); if (root) root.add(whistle);
  whistlePos = { x: p.x, z: p.z };
  whistlePickup.x = p.x; whistlePickup.z = p.z; whistlePickup.enabled = true;
  clatter();
  gullMode = 'depart'; departT = 3.5;
  departVX = Math.sin(p.th) * 2.4; departVZ = Math.cos(p.th) * 2.4;   // outward, up to the rafters
  gull.rotation.y = Math.atan2(departVX, departVZ);
}
function updateGull(dt, player) {
  if (!gull) return;
  if (gullMode === 'depart') {
    departT -= dt;
    gull.position.x += departVX * dt; gull.position.z += departVZ * dt; gull.position.y += dt * 4.2;
    gull.rotation.z = Math.sin(clock * 22) * 0.45;     // frantic flapping as it clears the roof
    if (departT <= 0) removeGull();
    return;
  }
  if (gullMode === 'hop') {
    hopT += dt; let k = hopT / hopDur; if (k > 1) k = 1;
    const s = Math.sin(k * Math.PI);
    gull.position.set(fromX + (toX - fromX) * k, s * hopArc, fromZ + (toZ - fromZ) * k);
    gull.scale.set(1 + s * 0.9, 1, 1 - s * 0.15);      // wing-spread flair mid-arc
    if (k >= 1) {
      const p = PERCHES[gi];
      gullMode = 'idle'; gull.scale.set(1, 1, 1);
      gull.position.set(p.x, 0, p.z); gull.rotation.set(0, wrap(p.th + Math.PI), 0);
    }
    return;
  }
  // idle: subtle bob + head cock + a hint of a wing-flap
  idleT += dt;
  gull.position.y = 0.02 * Math.max(0, Math.sin(idleT * 2.2));
  gull.rotation.z = 0.14 * Math.sin(idleT * 0.8);
  gull.scale.x = 1 + 0.05 * Math.max(0, Math.sin(idleT * 1.3 - 1.0));
  const p = PERCHES[gi];
  if (dist(player.x, player.z, p.x, p.z) < FLUSH_R) {
    if (flushes < 2) { flushes++; startHop((gi + 1) % PERCHES.length); }
    else dropWhistle();
  }
}

// ================================ setup ================================
let umpInter = null, whistlePickup = null, vendorInter = null, kioskGrab = null;
let whistleDef = null, poppyDef = null;
const KIOSK_GRAB = { x: 95.8, z: -351.5 };              // 4.2 m W of the beach-kiosk counter (100,-351.5) — pill-clear (verified)

onWorldReady(() => {
  // ---- perch loop from consts ----
  PERCHES = PERCH_S.map(s => { const th = BACK_B + s; const [x, z] = at(midR(th), th); return { x, z, th }; });
  const POST_UMP = at(rWallB(BACK_B + 0.3) - 1.3, BACK_B + 0.3);                       // the ump's post (mirrors wrigley-bowl POST)
  const POPPY_OFFER = at(rWallB(BACK_B) + WALL_T_B + CONC_W_B / 2, BACK_B + 0.3);       // the vendor's patrol-arc centre

  // ---- register both favors (journal to-do + turn-in celebrate live here) ----
  favors.register({
    id: 'umpwhistle', title: 'the gull’s got the whistle', giver: 'the ump', reward: 12,
    todo: [
      'a gull swiped the ump’s whistle — it’s strutting the concourse behind home. flush it till it drops.',
      'bring the whistle back to the ump, at his post behind home plate.',
    ],
    doneToast: { main: 'PLAY BALL', sub: 'whistle, de-gulled' },
  });
  favors.register({
    id: 'poppybuns', title: 'buns by the seventh', giver: 'the hot dog guy', reward: 12,
    todo: [
      'the vendor’s out of poppy-seed buns — grab some at the beach kiosk. take the Addison L to Belmont.',
      'get the poppy buns back to the hot dog guy on the concourse.',
    ],
    doneToast: { main: 'SAVED THE SEVENTH', sub: 'poppy buns, delivered' },
  });
  // rotation pool (offers gate on rotation.offerable; started/done stay live) ----
  rotation.join({ id: 'umpwhistle', giver: 'the ump', where: 'at his post inside Wrigley — you’ll need a ticket', hood: 'wrigley' });
  rotation.join({ id: 'poppybuns', giver: 'the hot dog guy', where: 'working the concourse inside Wrigley', hood: 'wrigley' });

  // ---- held props ----
  whistleDef = bag.define({
    id: 'ump-whistle', name: 'the ump’s whistle', kind: 'holdable',
    icon: '<svg width="22" height="22" viewBox="0 0 32 32"><g fill="#cfd3d9" stroke="#8b9096" stroke-width="1.4"><rect x="5" y="12" width="15" height="9" rx="4"/><circle cx="20" cy="16.5" r="5"/><rect x="8" y="7" width="3" height="6" rx="1"/></g><circle cx="20" cy="16.5" r="1.7" fill="#8b9096"/></svg>',
    caption: 'de-gulled. and wet. bring it back to the ump.',
    onUse() { const w = makeWhistle(); w.position.set(0, 0.04, 0.03); w.scale.set(1.35, 1.35, 1.35); holdItem(w); },
    onStow() {},
  });
  poppyDef = bag.define({
    id: 'poppy-buns', name: 'poppy-seed buns', icon: '🥯', kind: 'holdable',
    caption: 'for the hot dog guy — a lake thing, don’t ask',
    onUse() { const s = makePoppySack(); s.position.set(0, 0.02, 0.05); holdItem(s); },
    onStow() {},
  });

  // ---- UMPWHISTLE: offer / turn-in at the ump (only while the FSM idles at 'post') ----
  function offerUmp() {
    if (umpHooks.npc) umpHooks.npc.say('a gull took my whistle. a GULL. took my WHISTLE. it’s strutting the concourse like it owns the joint.', 5.5);
    favors.offer('umpwhistle');                        // shows its OWN toast + journal to-do (don't duplicate)
    buildGull();
  }
  function deliverWhistle() {
    bag.remove('ump-whistle'); holdItem(null);
    removeGull(); if (whistle) { if (whistle.parent) whistle.parent.remove(whistle); whistle = null; }
    if (umpHooks.npc) { umpHooks.npc.setFace('happy'); umpHooks.npc.say('...it’s wet. of course it’s wet.', 4.5); }
    favors.complete('umpwhistle');                     // PLAY BALL gold toast + +12 dibs
  }
  umpInter = addInteraction({
    x: POST_UMP[0], z: POST_UMP[1], r: 2.2, priority: 7, label: 'what’s the trouble, ump?',
    onUse() {
      const f = favors.at('umpwhistle');
      if (f.st === 'active' && f.step === 1 && bag.has('ump-whistle')) { deliverWhistle(); return; }
      if (f.st === 'none' && umpHooks.refState && umpHooks.refState() === 'post' && rotation.offerable('umpwhistle')) offerUmp();
    },
  });
  umpInter.enabled = false;

  whistlePickup = addInteraction({
    x: 0, z: 0, r: 1.9, label: 'grab the ump’s whistle',
    onUse() {
      const f = favors.at('umpwhistle');
      if (!(f.st === 'active' && f.step === 0)) return;
      bag.add('ump-whistle'); whistleDef.onUse();       // rides home in your hand
      if (whistle) { if (whistle.parent) whistle.parent.remove(whistle); whistle = null; }
      whistlePickup.enabled = false;
      toast('"gotcha."', 'now back to the ump');
      favors.advance('umpwhistle');                     // step 0 → 1
    },
  });
  whistlePickup.enabled = false;

  // ---- POPPYBUNS: offer / turn-in at the vendor's arc centre (priority 7 so it
  //      shows through his own priority-6 hot-dog interaction when he passes it) ----
  function offerPoppy() {
    if (vendorHooks.npc) vendorHooks.npc.say('out of poppy-seed buns! the beach kiosk carries ’em — a lake thing, don’t ask. Addison stop’s RIGHT there. back before the seventh, yeah?', 6);
    favors.offer('poppybuns');
  }
  function deliverBuns() {
    bag.remove('poppy-buns'); holdItem(null);
    if (vendorHooks.npc) { vendorHooks.npc.setFace('happy'); vendorHooks.npc.say('SAVED it — poppy buns by the seventh. you’re alright, kid.', 4.5); }
    favors.complete('poppybuns');                       // SAVED THE SEVENTH + +12 dibs
  }
  vendorInter = addInteraction({
    x: POPPY_OFFER[0], z: POPPY_OFFER[1], r: 2.2, priority: 7, label: 'got a sec, hot dog guy?',
    onUse() {
      const f = favors.at('poppybuns');
      if (f.st === 'active' && f.step === 1 && bag.has('poppy-buns')) { deliverBuns(); return; }
      if (f.st === 'none' && rotation.offerable('poppybuns')) offerPoppy();
    },
  });
  vendorInter.enabled = false;

  // the BEACH KIOSK grab (lakefront) — the Sluggers DOOR pattern verbatim
  // (enabled only while step 0; belt + suspenders in onUse).
  kioskGrab = addInteraction({
    x: KIOSK_GRAB.x, z: KIOSK_GRAB.z, r: 2.2, label: 'grab the poppy buns (for the vendor)',
    onUse() {
      const f = favors.at('poppybuns');
      if (!(f.st === 'active' && f.step === 0)) return;
      bag.add('poppy-buns'); poppyDef.onUse();          // the sack rides back on the L
      toast('"tell him it’s a LAKE thing."', 'the beach kiosk');
      favors.advance('poppybuns');                      // step 0 → 1
    },
  });
  kioskGrab.enabled = false;

  // ---- per-frame: gull FSM (in-cell) + throttled offer/step gating ----
  let acc = 0;
  registerUpdate((dt, t, player) => {
    if (dt < 0) dt = 0;
    clock = t;
    const fu = favors.at('umpwhistle');
    if (gull) {
      const inBowl = activeCell() === CELL_ID_B;
      if (gullMode === 'depart') { if (inBowl) updateGull(dt, player); }
      else if (fu.st === 'active' && fu.step === 0) { if (inBowl) updateGull(dt, player); }
      else removeGull();                                // step advanced (whistle taken) or reset — retire
    }
    acc -= dt;
    if (acc <= 0) {
      acc = 0.5;
      const post = !!(umpHooks.refState && umpHooks.refState() === 'post');
      if (fu.st === 'active' && fu.step === 1 && bag.has('ump-whistle') && post) { umpInter.enabled = true; umpInter.setLabel('give the ump his whistle'); }
      else if (fu.st === 'none' && post && rotation.offerable('umpwhistle')) { umpInter.enabled = true; umpInter.setLabel('what’s the trouble, ump?'); }
      else umpInter.enabled = false;

      const fp = favors.at('poppybuns');
      if (fp.st === 'active' && fp.step === 1 && bag.has('poppy-buns')) { vendorInter.enabled = true; vendorInter.setLabel('hand over the poppy buns'); }
      else if (fp.st === 'none' && rotation.offerable('poppybuns')) { vendorInter.enabled = true; vendorInter.setLabel('got a sec, hot dog guy?'); }
      else vendorInter.enabled = false;

      kioskGrab.enabled = (fp.st === 'active' && fp.step === 0);
    }
  });

  // ---- persistence: a fresh session already mid-chase (step 0) → rebuild the
  //      gull (fresh loop, per the derive-from-step law; no substep in the save) ----
  const f0 = favors.at('umpwhistle');
  if (f0.st === 'active' && f0.step === 0) buildGull();

  // ---- debug knobs (tools / E2E only; harmless in play) ----
  try {
    window.__hd = window.__hd || {};
    window.__hd.f081 = Object.assign(window.__hd.f081 || {}, {
      umpwhistle: {
        at: () => favors.at('umpwhistle'),
        offer: () => offerUmp(),
        gull: () => (gull ? { perch: gi, flushes, mode: gullMode, pos: { x: gull.position.x, z: gull.position.z } } : null),
        perches: () => PERCHES.map(p => ({ x: +p.x.toFixed(2), z: +p.z.toFixed(2) })),
        whistlePos: () => whistlePos,
        at_ump: { x: +POST_UMP[0].toFixed(2), z: +POST_UMP[1].toFixed(2) },
        build: () => buildGull(),
        refState: () => (umpHooks.refState ? umpHooks.refState() : null),          // read-only: verify the chase FSM (regression)
        umpPos: () => (umpHooks.npc ? { x: umpHooks.npc.group.position.x, z: umpHooks.npc.group.position.z } : null),
      },
      poppybuns: {
        at: () => favors.at('poppybuns'),
        offer: () => offerPoppy(),
        at_vendor: { x: +POPPY_OFFER[0].toFixed(2), z: +POPPY_OFFER[1].toFixed(2) },
        offerPos: { x: +POPPY_OFFER[0].toFixed(2), z: +POPPY_OFFER[1].toFixed(2) },
        grabPos: { x: KIOSK_GRAB.x, z: KIOSK_GRAB.z },
      },
    });
  } catch (e) {}
});
