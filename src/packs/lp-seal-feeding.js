// =====================================================================
//  PACK: lp-seal-feeding — SEAL FEEDING TIME at the historic Sea Lion Pool
//  (task 118 DELIGHT, the marquee moment). The pool + the ambient circle-
//  swimmers are task-114 world/structure (packs/zoo.js owns THOSE). THIS
//  pack owns the FEEDING RITUAL on top of it, self-contained:
//    * A KEEPER at the south rail with a galvanized FISH BUCKET, waiting.
//    * THREE BEGGAR SEALS crowding the near feeding corner of the pool —
//      nose-up at the surface, always there (an ambient "they know it's
//      almost two" read), on a gentle idle bob.
//    * Press E / ✋ ("watch feeding time") and the ritual fires ONCE: the
//      keeper winds up and TOSSES silver fish that arc into the water, the
//      beggar seals LUNGE and bark in a frenzy with water puffs, ONE toast
//      ("feeding time!"), a journal line, a dib. Stand in the front row and
//      you get the splash — "ope — front row gets wet."
//  Culling: every added mesh lives under ONE group named 'zooanim' (the
//  fogcull selfManaged exemption by name, same as packs/zoo.js) hidden past
//  ~130 m of the pool with a full early-out. Determinism: ALL placements are
//  literal constants; Math.random only for runtime timers/jitter (never the
//  shared world rng). No per-frame allocation; every audio access guarded.
//  The feeding beat fires ONLY on the interaction — nothing autonomous, so a
//  waypoint/baseline shot is never perturbed (the 087 idle-gate spirit).
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, registerUpdate, addInteraction, makeNPC, toast,
         journalSection, getAudioCtx, wallet, state, screenFx, prefersCalm } from '../framework.js';
import { scene, toon } from '../core.js';
import { DUST } from '../fx.js';
import { sph, box } from './zoo.js';   // the shared 114 animal part helpers
import * as CH from '../data/chicago.js';

// ONE beggar-seal geometry: the 114 torpedo, shared by all three meshes.
function makeSealGeo() {
  return BufferGeometryUtils.mergeBufferGeometries([
    sph(1, 10, 0.375, 0.33, 0.85, 0, 0, 0),                 // body
    sph(0.24, 8, 1, 1, 1, 0, 0.20, 0.72),                   // head
    sph(0.13, 7, 1, 1, 1, 0, 0.17, 0.95),                   // snout
    sph(1, 6, 0.30, 0.06, 0.13, 0.36, -0.14, 0.16, 0.6),    // R flipper
    sph(1, 6, 0.30, 0.06, 0.13, -0.36, -0.14, 0.16, -0.6),  // L flipper
    sph(1, 6, 0.24, 0.06, 0.20, 0, 0.02, -0.88),            // tail flipper
  ], false);
}

onWorldReady(() => {
  const P = CH.ZOO.pool;                         // pool center (-60,820)
  const SEAL = toon(0x2e2a28);                   // dark wet hide (cached, shared with zoo.js — +0 color bucket)
  const STEEL = toon(0x8a9299);                  // galvanized pail
  const FISH = toon(0xb9c2c8);                   // silvery fish

  // ---- the one animal group (fogcull selfManaged exemption by name) -----
  const grp = new THREE.Group(); grp.name = 'zooanim'; scene.add(grp);

  // -------- constants: the keeper stand, the feed point, the beggars ------
  const KEEP = { x: -56.5, z: 827.5 };           // keeper on the deck OUTSIDE the pool carve (dist 8.3 > carveR 7.5)
  const KEEP_RY = Math.atan2(P.x - KEEP.x, P.z - KEEP.z);   // face the pool (NW)
  const FEED = { x: -57, y: 0.30, z: 823 };      // the near feeding corner (surface y ~0.30, matching zoo.js surfaced cruise)
  const BUCKET = { x: -55.8, y: 0, z: 828.0 };   // pail at the keeper's feet
  const WSURF = 0.30;                            // pool surface the beggars float at

  // ---- (1) the KEEPER + fish bucket -------------------------------------
  const keeper = makeNPC({ x: KEEP.x, z: KEEP.z, ry: KEEP_RY,
    palette: { suit: 0x9a8b5c, pants: 0x4a5238, skin: 0x8a5a3c, hair: 0x7a3320 },
    name: 'keeper', wander: 0,
    lines: ["feeding's at two — watch the splash zone", 'free since 1868, baby', 'they hear the bucket a mile off'] });

  {   // galvanized pail + two fish poking out (one merged steel mesh + a fish mesh)
    const pail = new THREE.CylinderGeometry(0.20, 0.24, 0.5, 9);
    pail.translate(BUCKET.x, 0.25, BUCKET.z);
    const rim = new THREE.TorusGeometry(0.22, 0.03, 5, 10); rim.rotateX(Math.PI / 2); rim.translate(BUCKET.x, 0.5, BUCKET.z);
    grp.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([pail, rim], false), STEEL));
    const f1 = sph(1, 6, 0.05, 0.05, 0.16, BUCKET.x - 0.06, 0.55, BUCKET.z, 0, 0.5);
    const f2 = sph(1, 6, 0.05, 0.05, 0.16, BUCKET.x + 0.08, 0.53, BUCKET.z + 0.05, 0.5, 0.7);
    grp.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([f1, f2], false), FISH));
  }

  // ---- (2) THREE BEGGAR SEALS crowding the feed corner, nose-up ---------
  // each its own mesh (they lunge independently); shared geo. Facing the
  // keeper/rail (south). y sits them mostly submerged, snout raised.
  const sealGeo = makeSealGeo();
  const BEG = [
    { x: -57.6, z: 822.4, ry: 0.21, ph: 0.0 },
    { x: -56.2, z: 823.2, ry: -0.07, ph: 2.1 },
    { x: -57.9, z: 824.0, ry: 0.38, ph: 4.2 },
  ];
  for (const b of BEG) {
    const m = new THREE.Mesh(sealGeo, SEAL);
    m.rotation.order = 'YXZ';
    m.position.set(b.x, WSURF - 0.12, b.z);      // mostly submerged
    m.rotation.y = b.ry; m.rotation.x = -0.45;   // nose-up begging pose
    b.m = m; grp.add(m);
  }

  // ---- (3) a reusable TOSSED FISH (arcs bucket -> feed point) ------------
  const tossFish = new THREE.Mesh(sph(1, 6, 0.06, 0.06, 0.18, 0, 0, 0), FISH);
  tossFish.visible = false; grp.add(tossFish);

  // ---- synth: a stacked seal BARK (compact zoo.js recipe) ---------------
  function bark(vol) {
    const { actx, sfxBus } = getAudioCtx(); if (!actx) return;
    const t = actx.currentTime, n = 2 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const t0 = t + i * (0.11 + Math.random() * 0.05);
      const o = actx.createOscillator(); o.type = 'square';
      const f = 300 + Math.random() * 220;
      o.frequency.setValueAtTime(f, t0);
      o.frequency.exponentialRampToValueAtTime(f * 0.72, t0 + 0.09);
      const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 1.2;
      const g = actx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.10);
      o.connect(bp); bp.connect(g); g.connect(sfxBus);
      o.start(t0); o.stop(t0 + 0.12);
    }
  }
  // a small "clang" on the bucket as the keeper reaches in (feeding start)
  function bucketClang() {
    const { actx, sfxBus } = getAudioCtx(); if (!actx) return;
    const t0 = actx.currentTime;
    const o = actx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(760, t0); o.frequency.exponentialRampToValueAtTime(520, t0 + 0.18);
    const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 3;
    const g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
    o.connect(bp); bp.connect(g); g.connect(sfxBus); o.start(t0); o.stop(t0 + 0.32);
  }
  // water puff at the feed corner (zoo.js splash shape)
  function splash() {
    const n = 3 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++)
      DUST.spawn(FEED.x + (Math.random() - 0.5) * 0.9, WSURF + 0.15, FEED.z + (Math.random() - 0.5) * 0.9,
        (Math.random() - 0.5) * 1.6, 1.0 + Math.random() * 1.4, (Math.random() - 0.5) * 1.6,
        0.78, 0.88, 0.92, 0.5, 1.5, 3, 1.2);
    }

  // ---- (4) the feeding beat + interaction -------------------------------
  state.sealFeeds = state.sealFeeds || 0;
  const FEED_DUR = 9.0;                           // total ritual length
  let feed = 0;                                   // >0 while feeding (counts down)
  let tossT = 0, tossFly = -1, tossN = 0, splashT = 0, barkT = 0, wetShown = false;

  const inter = addInteraction({ x: KEEP.x, z: KEEP.z, r: 2.8, label: 'watch feeding time',
    onUse: () => {
      if (feed > 0) return;
      feed = FEED_DUR; tossT = 0.5; tossN = 0; splashT = 0; barkT = 0; wetShown = false;
      inter.enabled = false;
      bucketClang();
      state.sealFeeds++;
      toast('feeding time!', state.sealFeeds === 1 ? 'two o’clock at the pool — mind the splash zone' : 'the whole rail leans in');
      wallet.pay({ key: 'sealfeed', first: 5, repeat: 2, reason: 'feeding time', firstReason: 'feeding time at the pool!', label: 'the zoo', cd: 12 });
      bark(0.11);
    } });

  journalSection('lp-seal', 'Feeding time 🐟', () => `
    <div class="jrow"><span>Fed the seals</span><b>${state.sealFeeds}</b></div>
    <div class="jrow"><span>The Sea Lion Pool</span><b>free since 1868</b></div>`);

  // ---- (5) per frame: cull gate + idle bob + the feeding ritual ---------
  const kp = keeper.parts;
  let cullT = 0, near = true;
  registerUpdate((dt, t, pl) => {
    cullT -= dt;
    if (cullT <= 0) {
      cullT = 0.4;
      const dx = pl.x + 58, dz = pl.z - 822;
      near = dx * dx + dz * dz <= 130 * 130;
      if (grp.visible !== near) grp.visible = near;
    }
    if (!near) return;
    const cm = prefersCalm();
    const active = feed > 0;

    // beggar seals: idle bob (calm) OR eager lunge (feeding)
    for (let i = 0; i < BEG.length; i++) {
      const b = BEG[i], m = b.m;
      if (active) {
        const lung = 0.5 + 0.5 * Math.sin(t * 6.5 + b.ph);              // fast eager bob
        m.position.y = WSURF - 0.12 + lung * (cm ? 0.10 : 0.22);
        m.rotation.x = -0.45 - lung * 0.35;                            // nose lunges up
        m.rotation.y = b.ry + Math.sin(t * 3.1 + b.ph) * 0.22;         // jostle
      } else {
        m.position.y = WSURF - 0.12 + (0.5 + 0.5 * Math.sin(t * 1.1 + b.ph)) * (cm ? 0.03 : 0.06);
        m.rotation.x = -0.45 + Math.sin(t * 0.9 + b.ph) * 0.05;
        m.rotation.y = b.ry;
      }
    }

    if (!active) return;
    feed -= dt;

    // keeper: reach into the bucket, wind up, and toss (armR pose; our
    // registerUpdate runs AFTER updateNPC so we win the frame)
    tossT -= dt;
    const throwing = tossFly >= 0;
    if (throwing) {
      tossFly += dt;
      const u = tossFly / 0.55;                                        // 0.55 s flight
      if (u >= 1) {
        tossFish.visible = false; tossFly = -1;
        splash(); bark(cm ? 0.06 : 0.10);                             // the fish lands: frenzy
      } else {
        tossFish.visible = true;
        tossFish.position.set(
          BUCKET.x + (FEED.x - BUCKET.x) * u,
          0.7 + (FEED.y - 0.7) * u + Math.sin(u * Math.PI) * 1.4,     // parabola
          BUCKET.z + (FEED.z - BUCKET.z) * u);
        tossFish.rotation.x = t * 9;
      }
      // wind-forward pose during the throw
      kp.armR.rotation.x = 0.5 - u * 0.9;
    } else if (tossT <= 0 && tossN < 3 && feed > 1.4) {
      tossN++; tossFly = 0; tossT = 2.4;                              // ~3 tosses across the ritual
    } else {
      // between tosses: reach into the pail (arm down/forward)
      kp.armR.rotation.x = -0.5 + Math.sin(t * 2) * 0.15;
    }
    kp.armL.rotation.x = -0.2;

    // extra frenzy: sparse barks + splashes for the whole ritual
    barkT -= dt; if (barkT <= 0) { barkT = 0.7 + Math.random() * 0.7; bark(cm ? 0.05 : 0.085); }
    splashT -= dt; if (splashT <= 0) { splashT = 0.55 + Math.random() * 0.5; splash(); }

    // "ope — front row gets wet": stand within 3 m of the feed corner once
    if (!wetShown) {
      const dx = pl.x - FEED.x, dz = pl.z - FEED.z;
      if (dx * dx + dz * dz < 3 * 3) {
        wetShown = true;
        screenFx.filter('brightness(1.35) saturate(1.1)', 420);
        toast('SPLASH!', 'ope — front row gets wet');
      }
    }

    if (feed <= 0) {                                                  // ritual over — reset
      tossFish.visible = false; tossFly = -1;
      kp.armR.rotation.x = 0; kp.armL.rotation.x = 0;
      inter.enabled = true;
    }
  });
});
