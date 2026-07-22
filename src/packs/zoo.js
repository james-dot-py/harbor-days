// =====================================================================
//  PACK: zoo — LINCOLN PARK ZOO campus life (task 114): THE MAP'S FIRST
//  ANIMALS. The campus GEOMETRY (fence runs, gates, the Sea Lion Pool
//  basin, Kovler Lion House, yard, paver loop) is world structure built
//  from data/chicago.js ZOO; THIS pack owns the LIFE:
//    * definePlace: inside the perimeter the world grades greener (the
//      CH.ZOO.place grade) + a once-per-session "the zoo is free" toast.
//    * SEA LIONS: one merged chunky-torpedo geometry shared by 4 meshes —
//      three circle-swimmers (surfaced cruise -> dive -> a real BREACH
//      arc with velocity-following pitch + DUST water puffs) + one
//      hauled-out classic on the grotto shelf.
//    * LIONS: a chunky sphinx lion on the yard ledge (merged tawny body,
//      separate mane shell + draped tail w/ tuft; tail-flick + breathing)
//      and a seated lioness (separate swaying head).
//    * VISITORS: two rail onlookers + a keeper (makeNPC, wander:0).
//    * DISTANT CALLS: sparse synthesized lion huff-roar / sea-lion bark /
//      zoo-bird whoop on a 9-22 s timer, distance-scaled, actx-guarded.
//  Culling: every animal mesh lives under ONE group named 'zooanim'
//  (fogcull selfManaged exemption) hidden past 150 m of (-52,868) with a
//  full early-out — zero animal work when far. NPCs self-cull (framework).
//  Determinism: ALL placements are literal constants; Math.random only
//  for runtime timers/jitter (never the shared world rng). No per-frame
//  allocation; no localStorage; every audio access guarded on actx.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, registerUpdate, definePlace, makeNPC, toast, getAudioCtx } from '../framework.js';
import { scene, toon } from '../core.js';
import { DUST } from '../fx.js';
import * as CH from '../data/chicago.js';

// ---------------------------- geometry helpers -------------------------
// scale -> rotateX -> rotateY -> translate, so parts pose before placing.
function sph(r, seg, sx, sy, sz, x, y, z, ry = 0, rx = 0) {
  const g = new THREE.SphereGeometry(r, seg, Math.max(4, (seg * 0.75) | 0));
  g.scale(sx, sy, sz);
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return g;
}
function box(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

// ONE seal geometry, shared by all four meshes. Chunky torpedo, +z forward:
// stretched-sphere body 1.7 long x 0.75 wide x 0.66 high, head + snout
// forward/up, two flat side flippers swept back, tail flipper.
function makeSealGeo() {
  return BufferGeometryUtils.mergeBufferGeometries([
    sph(1, 10, 0.375, 0.33, 0.85, 0, 0, 0),                 // body
    sph(0.24, 8, 1, 1, 1, 0, 0.20, 0.72),                   // head
    sph(0.13, 7, 1, 1, 1, 0, 0.17, 0.95),                   // snout
    sph(1, 6, 0.30, 0.06, 0.13, 0.36, -0.14, 0.16, 0.6),    // R flipper (swept back)
    sph(1, 6, 0.30, 0.06, 0.13, -0.36, -0.14, 0.16, -0.6),  // L flipper
    sph(1, 6, 0.24, 0.06, 0.20, 0, 0.02, -0.88),            // tail flipper
  ], false);
}

onWorldReady(() => {
  const Z = CH.ZOO, P = Z.pool;                 // pool center (-60,820), water y 0.45
  const SEAL = toon(0x2e2a28);                  // dark wet-hide toon (cached)
  const TAWNY = toon(0xc98f56);                 // lion coat
  const MANE = toon(0x6e4018);                  // dark rust mane / tuft (round 1: darkened for contrast vs the tawny coat)

  // ---- (1) AMBIENCE CELL ------------------------------------------------
  let welcomed = false;
  definePlace({
    name: 'Lincoln Park Zoo',
    contains: (x, z) => CH.zooInside(x, z),
    fadeS: Z.place.fadeS, grade: Z.place.grade, amb: Z.place.amb,
    onEnter() {
      if (!welcomed) { welcomed = true; toast('the zoo is free', 'walk right in — since 1868'); }
    },
  });

  // ---- the one animal group (fogcull selfManaged exemption by name) -----
  const grp = new THREE.Group(); grp.name = 'zooanim'; scene.add(grp);
  const sealGeo = makeSealGeo();

  // ---- (2) SEA LIONS ----------------------------------------------------
  // Three circle-swimmers — LITERAL orbit constants (radius / direction /
  // angular speed w rad/s / behavior-cycle length T s / cycle offset / start
  // angle ph). Two CCW, one CW; offsets staggered 0 / 1/3 / 2/3.
  const SWIM = [
    { R: 2.4, dir: 1,  w: 0.42, T: 4.6, off: 0,       ph: 0.0, pc: 0, m: null },
    { R: 3.4, dir: 1,  w: 0.36, T: 5.4, off: 1 / 3,   ph: 2.1, pc: 0, m: null },
    { R: 4.3, dir: -1, w: 0.32, T: 6.0, off: 2 / 3,   ph: 4.2, pc: 0, m: null },
  ];
  for (const s of SWIM) {
    s.m = new THREE.Mesh(sealGeo, SEAL);
    s.m.rotation.order = 'YXZ';                 // yaw, then LOCAL pitch, then roll
    grp.add(s.m);
  }
  // The hauled-out classic on the grotto shelf (top y 0.62; body half 0.33),
  // facing SE toward the rail, nose raised.
  const hauled = new THREE.Mesh(sealGeo, SEAL);
  hauled.rotation.order = 'YXZ';
  hauled.position.set(-60.8, 0.62 + 0.33, 817.4);
  hauled.rotation.y = Math.PI * 0.25;
  grp.add(hauled);

  // water puffs on breach exit / re-entry (DUST call shape per fx.js/main.js)
  function splash(x, z) {
    const n = 3 + (Math.random() * 3 | 0);      // 3-5 puffs
    for (let i = 0; i < n; i++)
      DUST.spawn(x + (Math.random() - 0.5) * 0.6, 0.55, z + (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 1.4, 0.9 + Math.random() * 1.3, (Math.random() - 0.5) * 1.4,
        0.78, 0.88, 0.92, 0.5, 1.5, 3, 1.2);
  }

  // ---- (3) LIONS in the yard -------------------------------------------
  // Lying sphinx on the ledge top (-28.5, 0.75, 814.5), facing north-ish
  // toward the rail. Merged tawny body; SEPARATE mane shell; SEPARATE thin
  // tail (cylinder + tuft) draped off the ledge rear.
  const lion = new THREE.Group();
  lion.position.set(-28.5, 0.75, 814.5);
  lion.rotation.y = Math.PI + 0.12;
  lion.scale.setScalar(1.3);                    // shot round 1: chunk up — 1.5 m torso read modest at the 14 m rail view (PITFALLS small-toon-animal law)
  const lionBody = new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([
    sph(1, 10, 0.42, 0.44, 0.75, 0, 0.48, -0.08),           // torso ~1.5 m long
    sph(0.34, 9, 1, 1, 1, 0, 1.04, 0.52),                   // big head, high
    sph(0.16, 7, 1.1, 0.85, 1.1, 0, 0.95, 0.82),            // muzzle
    box(0.20, 0.18, 0.74, -0.24, 0.09, 0.60),               // front legs, sphinx
    box(0.20, 0.18, 0.74, 0.24, 0.09, 0.60),
    sph(1, 8, 0.30, 0.35, 0.42, -0.28, 0.38, -0.60),        // haunches
    sph(1, 8, 0.30, 0.35, 0.42, 0.28, 0.38, -0.60),
  ], false), TAWNY);
  lion.add(lionBody);
  const mane = new THREE.Mesh(new THREE.SphereGeometry(0.48, 9, 7), MANE);
  mane.scale.set(1.18, 1.22, 0.6); mane.position.set(0, 1.02, 0.38);   // round 1: bigger ruff so the mane reads at rail distance
  lion.add(mane);
  const tailGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.85, 6);
  tailGeo.translate(0, -0.425, 0);                          // pivot at the root
  const tail = new THREE.Mesh(tailGeo, TAWNY);
  tail.position.set(0, 0.40, -0.90); tail.rotation.x = 0.55;  // draped down-back off the ledge
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 5), MANE);
  tuft.position.set(0, -0.86, 0); tail.add(tuft);
  lion.add(tail);
  grp.add(lion);

  // Lioness seated upright at (-24, 0, 813.8) on the yard floor, facing the
  // rail; no mane, torso pitched up, head high ~1.1-1.5, slow head-sway.
  const lioness = new THREE.Group();
  lioness.position.set(-24, 0, 813.8);
  lioness.rotation.y = 2.89;                                // north-ish toward the viewers
  lioness.scale.setScalar(1.25);                            // round 1 chunk-up, matching the lion
  lioness.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([
    sph(1, 10, 0.36, 0.60, 0.42, 0, 0.62, -0.06, 0, 0.28),  // torso pitched up (seated)
    sph(1, 8, 0.30, 0.26, 0.42, -0.20, 0.24, -0.26),        // haunches on the ground
    sph(1, 8, 0.30, 0.26, 0.42, 0.20, 0.24, -0.26),
    box(0.15, 0.60, 0.15, -0.17, 0.30, 0.26),               // front legs straight
    box(0.15, 0.60, 0.15, 0.17, 0.30, 0.26),
    sph(1, 6, 0.05, 0.045, 0.34, 0.28, 0.05, -0.38),        // tail curled on the ground
  ], false), TAWNY));
  const lionessHead = new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([
    sph(0.30, 9, 1, 1, 1, 0, 0, 0),                         // head
    sph(0.14, 7, 1.05, 0.8, 1.1, 0, -0.06, 0.26),           // muzzle
    sph(0.07, 5, 1, 1, 1, -0.15, 0.24, -0.02),              // ears
    sph(0.07, 5, 1, 1, 1, 0.15, 0.24, -0.02),
  ], false), TAWNY);
  lionessHead.position.set(0, 1.18, 0.16);
  lioness.add(lionessHead);
  grp.add(lioness);

  // ---- (4) VISITOR NPCs (framework-culled, NOT in grp) ------------------
  // Palettes copied literal from packs/montrose-point.js PAL (casual olive /
  // forest-grey) + its khaki entry for the keeper.
  makeNPC({ x: -62.4, z: 827.5, ry: Math.atan2(2.4, -7.5),          // leaning at the rail, facing the pool center
    palette: { suit: 0x5f6b3e, pants: 0x8a7c55, skin: 0xcaa274, hair: 0x4a3826 },
    name: 'onlooker', wander: 0,
    lines: ['ope — he got some air!', 'the seals eat at two', 'free since 1868, baby'] });
  makeNPC({ x: -54.2, z: 825.9, ry: Math.atan2(-5.8, -5.9),         // NW toward the pool
    palette: { suit: 0x4f6b4a, pants: 0x51565e, skin: 0xe8c6a0, hair: 0x53606e },
    name: 'onlooker', wander: 0,
    lines: ['ope — sorry!', 'look at him go'] });
  makeNPC({ x: -28.2, z: 808.6, ry: Math.atan2(-0.3, 5.9),          // keeper at the rail across from the lion (round 1: -22.5,808 stood in the lp-lion-house f0 stand's lap)
    palette: { suit: 0x9a8b5c, pants: 0x4a5238, skin: 0x8a5a3c, hair: 0x7a3320 },
    name: 'keeper', wander: 0,
    lines: ['the lions ate at nine', 'ope — mind the rail', 'big fella loves that ledge'] });

  // ---- (5) DISTANT ANIMAL CALLS (all synthesized, actx-guarded) ---------
  function lionHuffRoar(vol) {
    const { actx, sfxBus } = getAudioCtx(); if (!actx) return;
    const t = actx.currentTime;
    for (let i = 0; i < 2; i++) {                           // two huffs
      const t0 = t + i * 0.62;
      const o = actx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(95, t0);
      o.frequency.exponentialRampToValueAtTime(68, t0 + 1.0);
      const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
      const g = actx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.15);       // slow attack
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.3);
      o.connect(lp); lp.connect(g); g.connect(sfxBus);
      o.start(t0); o.stop(t0 + 1.35);
    }
  }
  function sealBark(vol) {
    const { actx, sfxBus } = getAudioCtx(); if (!actx) return;
    const t = actx.currentTime, n = 3 + (Math.random() * 3 | 0);   // 3-5 barks
    for (let i = 0; i < n; i++) {
      const t0 = t + i * (0.13 + Math.random() * 0.05);
      const o = actx.createOscillator(); o.type = 'square';
      const f = 320 + Math.random() * 200;
      o.frequency.setValueAtTime(f, t0);
      o.frequency.exponentialRampToValueAtTime(f * 0.75, t0 + 0.09);
      const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 1.2;
      const g = actx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
      o.connect(bp); bp.connect(g); g.connect(sfxBus);
      o.start(t0); o.stop(t0 + 0.11);
    }
  }
  function zooBirdWhoop(vol) {
    const { actx, sfxBus } = getAudioCtx(); if (!actx) return;
    const t = actx.currentTime;
    [[900, 0], [1250, 0.16]].forEach(([f, dl]) => {          // two bright rising chirps
      const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(f * 0.75, t + dl);
      o.frequency.exponentialRampToValueAtTime(f * 1.3, t + dl + 0.12);
      g.gain.setValueAtTime(0.0001, t + dl);
      g.gain.linearRampToValueAtTime(vol, t + dl + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dl + 0.22);
      o.connect(g); g.connect(sfxBus); o.start(t + dl); o.stop(t + dl + 0.25);
    });
  }

  // ---- (6) per frame: cull gate + animation + call timer ----------------
  let cullT = 0, zNear = true;
  let callT = 9 + Math.random() * 13;
  let lionFlickT = 4, lionFlick = 0;
  registerUpdate((dt, t, pl) => {
    // throttled distance gate (~0.4 s): far -> hide + ZERO animal work
    cullT -= dt;
    if (cullT <= 0) {
      cullT = 0.4;
      const dx = pl.x + 52, dz = pl.z - 868;
      zNear = dx * dx + dz * dz <= 150 * 150;
      if (grp.visible !== zNear) grp.visible = zNear;
    }
    if (!zNear) return;

    const dxp = pl.x - P.x, dzp = pl.z - P.z, d2pool = dxp * dxp + dzp * dzp;

    // SEA LION SWIMMERS — orbit + cycle behavior (cruise / dive / BREACH)
    for (let i = 0; i < SWIM.length; i++) {
      const s = SWIM[i], m = s.m;
      const a = s.ph + s.dir * s.w * t;
      const x = P.x + Math.cos(a) * s.R, z = P.z + Math.sin(a) * s.R;
      const c = (t / s.T + s.off) % 1;
      let y, pitch = 0, roll = 0;
      if (c < 0.08) {                                       // post-entry surfacing
        const u = c / 0.08, e = u * u * (3 - 2 * u);
        y = 0.05 + 0.25 * e; pitch = -0.3 * (1 - u);
      } else if (c < 0.55) {                                // SURFACED CRUISE — back + head break the plane
        y = 0.30; roll = Math.sin(t * 1.9 + s.ph) * 0.07;
      } else if (c < 0.62) {                                // sink into the dive
        const u = (c - 0.55) / 0.07, e = u * u * (3 - 2 * u);
        y = 0.30 - 0.25 * e; pitch = 0.35 * u;
      } else if (c < 0.80) {                                // hidden under the water disc
        y = 0.05;
      } else {                                              // BREACH — the leap arc
        const u = (c - 0.80) / 0.20;
        y = 0.05 + 1.10 * Math.sin(Math.PI * u);            // apex ~1.15
        const vy = 1.10 * Math.PI * Math.cos(Math.PI * u) / (0.20 * s.T);
        pitch = -Math.max(-1, Math.min(1, vy * 0.45));      // nose-up rising, nose-down entering
      }
      m.position.set(x, y, z);
      m.rotation.y = Math.atan2(-Math.sin(a) * s.dir, Math.cos(a) * s.dir);  // tangent
      m.rotation.x = pitch; m.rotation.z = roll;
      // splash puffs on breach exit + re-entry (near the pool only)
      if (d2pool < 90 * 90) {
        if (s.pc < 0.80 && c >= 0.80 && c < 0.99) {
          splash(x, z);
          if (Math.random() < 0.3 && d2pool < 60 * 60) sealBark(0.10);   // bark tied to the leap
        }
        if (s.pc - c > 0.5) splash(x, z);                   // cycle wrapped = re-entry
      }
      s.pc = c;
    }

    // HAULED-OUT idle — the classic nose-up pose, gentle pitch oscillation
    hauled.rotation.x = -0.35 + Math.sin(t * 0.9) * 0.06;

    // LION idle — breathing + tail-tip flick every few seconds
    lionBody.scale.y = 1 + Math.sin(t * 1.15) * 0.015;
    lionFlickT -= dt;
    if (lionFlickT <= 0) { lionFlickT = 3 + Math.random() * 4; lionFlick = 0.6; }
    if (lionFlick > 0) {
      lionFlick -= dt;
      const k = Math.max(0, lionFlick) / 0.6;
      tail.rotation.z = Math.sin(lionFlick * 26) * 0.3 * k;
    }

    // LIONESS — slow head-sway
    lionessHead.rotation.y = Math.sin(t * 0.45 + 1.3) * 0.2;

    // DISTANT CALLS — sparse timer, within ~130 m of the campus heart
    callT -= dt;
    if (callT <= 0) {
      callT = 9 + Math.random() * 13;
      const dcx = pl.x + 52, dcz = pl.z - 865, dc = Math.sqrt(dcx * dcx + dcz * dcz);
      if (dc < 130) {
        const fall = Math.max(0.2, 1 - dc / 130);
        const pick = Math.random();
        if (pick < 0.38) lionHuffRoar(0.08 * fall);
        else if (pick < 0.72) sealBark((d2pool < 45 * 45 ? 0.10 : 0.06) * fall);
        else zooBirdWhoop(0.05 * fall);
      }
    }
  });
});
