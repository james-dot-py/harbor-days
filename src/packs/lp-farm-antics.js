// =====================================================================
//  PACK: lp-farm-antics — task 118 FARM-IN-THE-ZOO delight. structures.js
//  builds the place (gambrel barn, farmhouse, windmill tower, split-rail
//  paddock) and packs/zoo-habitats.js (115) put the standing cast in it
//  (cow, goat-on-a-stump, three pecking hens, the spinning wheel). THIS
//  pack owns the ANTICS — the three things that make the paddock a toy:
//    * THREE LOOSE HENS that SCATTER. Each is its own little rig (one
//      merged hen mesh in a group, the 115 henGeo recipe reused exactly)
//      idling with a timed double-peck + a slow look-around. Come within
//      4 m and the nearest ARMED hen bolts ~2.5 m straight away from you
//      over 0.9 s — hop, wing-flap tilt, an indignant cluck — then settles
//      and idles at the new spot. ONE hen per approach; she re-arms once
//      you leave 6.5 m. Escape targets are clamped inside the paddock and
//      nudged clear of the cow / goat / feed bucket.
//    * TOSS SOME FEED at the east gate: an interaction on a wooden feed
//      bucket just inside the gap. Press it and the whole flock RUSHES a
//      feed point a metre in front of you, cluster-pecks for the rest of
//      a ~5 s beat, then wanders back to their proper spots. Exactly ONE
//      toast per press (never one per hen), one wallet.pay, one cluck.
//    * A KEEPER KID (makeNPC, wander:0) just inside the gate, facing west
//      into the paddock, forever chasing them back in.
//  Culling: every mesh lives under ONE group named 'zooanim' (the fogcull
//  selfManaged exemption by name, same as packs/zoo.js) hidden past 90 m
//  of the paddock heart (-81,985) with a full early-out — zero farm work
//  when far. The keeper self-culls (framework NPC LOD).
//  Determinism: ALL placements are literal constants derived from
//  CH.ZOO.farmyard; the shared world rng is NEVER touched. Math.random
//  only for runtime timers/jitter. No InstancedMesh, no per-frame
//  allocation, no localStorage; every audio access guarded on actx.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, registerUpdate, getAudioCtx, prefersCalm,
         addInteraction, makeNPC, toast, journalSection, wallet, state } from '../framework.js';
import { scene, toon } from '../core.js';
import { sph } from './zoo.js';   // the shared 114 animal part helpers

// ---- hen recipe: ~0.4 m fat rusty teardrop, comb + beak folded into the
// red (verbatim from packs/zoo-habitats.js so the loose hens are the SAME
// bird as the standing three). +z forward, feet at y 0.
function henGeo() {
  return BufferGeometryUtils.mergeBufferGeometries([
    sph(1, 7, 0.15, 0.14, 0.19, 0, 0.17, -0.02),                 // fat teardrop body
    sph(1, 5, 0.05, 0.09, 0.06, 0, 0.27, 0.09),                  // neck
    sph(0.06, 6, 1, 1, 1, 0, 0.34, 0.13),                        // small head
    sph(1, 5, 0.02, 0.045, 0.05, 0, 0.405, 0.12),                // tiny comb (folded red)
    sph(1, 4, 0.02, 0.02, 0.045, 0, 0.33, 0.20),                 // beak (folded red)
    sph(1, 6, 0.06, 0.13, 0.06, 0, 0.29, -0.17, 0, -0.55),       // tail fan, tilted up-back
  ], false);
}

// ---- paddock frame (CH.ZOO.farmyard.paddock, literal) -----------------
const PAD_X0 = -90, PAD_X1 = -72, PAD_Z0 = 972, PAD_Z1 = 998;
const INSET = 0.7;                                   // keep birds off the rails
const IN_X0 = PAD_X0 + INSET, IN_X1 = PAD_X1 - INSET;
const IN_Z0 = PAD_Z0 + INSET, IN_Z1 = PAD_Z1 - INSET;
const HEART_X = -81, HEART_Z = 985;                  // paddock centre (cull + audio anchor)
const CULL_R = 90;
// the feed bucket, INSIDE the paddock at the east gate gap (z 982..986)
const BUCKET_X = -74, BUCKET_Z = 985;
// standing 115 cast the loose hens must not barge into
const OBST = [[-77.5, 983, 1.5], [-75, 990, 1.4], [BUCKET_X, BUCKET_Z, 1.0]];  // cow, goat stump, bucket
// the three loose homes — clear of cow (-77.5,983), goat (-75,990) and the
// existing hen trio (~-74.5,979)
const HOMES = [[-82, 986, 0.75], [-85, 980, -1.05], [-79, 993, 2.35]];
// cluster offsets around the feed point, so they don't stack into one bird
const FEED_OFF = [[0.42, 0.30], [-0.38, 0.44], [0.08, -0.50]];

const FLEE_D = 2.5, FLEE_S = 0.9;                    // step / seconds
const FLEE_TRIG = 4, FLEE_REARM = 6.5;
const FEED_S = 5.2, RUSH_SP = 4.2, BACK_SP = 1.5;    // the feed beat
// states
const IDLE = 0, FLEE = 1, RUSH = 2, FEAST = 3, BACK = 4;

const cl = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

onWorldReady(() => {
  const calm = prefersCalm;
  const HEN = toon(0xa8442e);      // rusty hen red — the 115 bucket, reused
  const WOOD = toon(0x8a6a44);     // paddock rail / goat stump wood, reused

  // ---- the one antics group (fogcull selfManaged exemption by name) ----
  const grp = new THREE.Group(); grp.name = 'zooanim'; scene.add(grp);

  // =================== (1) THE THREE LOOSE HENS ======================
  // Each hen: a group (position + facing) carrying ONE merged hen mesh, so
  // the body can peck/flap/roll inside a group that walks.
  const hens = [];
  for (let i = 0; i < HOMES.length; i++) {
    const [hx, hz, hry] = HOMES[i];
    const g = new THREE.Group();
    g.position.set(hx, 0, hz); g.rotation.y = hry;
    const m = new THREE.Mesh(henGeo(), HEN);
    m.rotation.order = 'YXZ';
    g.add(m); grp.add(g);
    hens.push({
      g, m,
      ox: hx, oz: hz, ory: hry,        // the ORIGINAL home (feed beat returns here)
      hx, hz, ry: hry,                 // the CURRENT resting spot / facing
      st: IDLE, t: 0,
      ax: hx, az: hz, bx: hx, bz: hz,  // flee lerp endpoints
      tx: hx, tz: hz,                  // rush / return target
      armed: true,
      pT: 1.6 + Math.random() * 3.4, pE: -1,
      ph: Math.random() * 6.283,
    });
  }

  // =================== (2) THE FEED BUCKET + INTERACTION =============
  // A short wooden pail just inside the east gate — the interaction anchor.
  {
    const body = new THREE.CylinderGeometry(0.25, 0.19, 0.40, 9);
    body.translate(0, 0.20, 0);
    const rim = new THREE.CylinderGeometry(0.27, 0.27, 0.06, 9);
    rim.translate(0, 0.41, 0);
    const scoop = new THREE.CylinderGeometry(0.10, 0.12, 0.22, 7);   // a scoop leaning in the pail
    scoop.rotateZ(0.55); scoop.translate(0.10, 0.50, 0.04);
    const pail = new THREE.Mesh(
      BufferGeometryUtils.mergeBufferGeometries([body, rim, scoop], false), WOOD);
    pail.position.set(BUCKET_X, 0, BUCKET_Z);
    grp.add(pail);
  }

  // =================== (3) THE KEEPER KID ============================
  // Just inside the east gate (2.2 m off the bucket, well west of the
  // lp-farm waypoint cameras at x -60..-70), turned WEST into the paddock.
  makeNPC({
    x: -73, z: 987, ry: -1.4, wander: 0, scale: 0.82, staticLod: true,
    name: 'farm kid',
    palette: { suit: 0xd85a4a, pants: 0x3a5a7a, skin: 0xe8c6a0, hair: 0x2a1e14 },
    lines: ["they got out again!", "aw, c'mon back",
            "you can pet the goat — she's friendly", "ope — mind the goat"],
  });

  // =================== (4) the hen CLUCK (synth, guarded) ============
  // 2-3 square-osc blips 500 -> 380 Hz (the 115 farm-call voice).
  function cluck(vol) {
    const A = getAudioCtx(); const actx = A.actx; if (!actx) return;
    const t0 = actx.currentTime, n = 2 + (Math.random() * 2 | 0);
    for (let i = 0; i < n; i++) {
      const ts = t0 + i * 0.09;
      const o = actx.createOscillator(); o.type = 'square';
      o.frequency.setValueAtTime(500, ts);
      o.frequency.exponentialRampToValueAtTime(380, ts + 0.06);
      const g = actx.createGain();
      g.gain.setValueAtTime(0.0001, ts);
      g.gain.linearRampToValueAtTime(vol, ts + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, ts + 0.06);
      o.connect(g); g.connect(A.sfxBus); o.start(ts); o.stop(ts + 0.07);
    }
  }
  // distance-scaled by the player's distance to the paddock heart
  function cluckNear(px, pz, base) {
    const dx = px - HEART_X, dz = pz - HEART_Z, d = Math.sqrt(dx * dx + dz * dz);
    if (d > 70) return;
    cluck(base * Math.max(0.25, 1 - d / 70));
  }

  // ---- start ONE hen's scatter away from (px,pz) ----------------------
  function startFlee(h, px, pz) {
    h.st = FLEE; h.t = 0; h.armed = false;
    h.ax = h.g.position.x; h.az = h.g.position.z;
    let dx = h.ax - px, dz = h.az - pz;
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    const base = Math.atan2(dx / d, dz / d);
    // try the straight-away line first, then two splayed alternates, then a
    // short hop — never barge into the cow / goat / pail. Scalars only.
    let bestX = h.ax, bestZ = h.az, ok = false;
    for (let k = 0; k < 4 && !ok; k++) {
      const a = base + (k === 1 ? 0.7 : k === 2 ? -0.7 : 0) + (Math.random() - 0.5) * 0.25;
      const step = k === 3 ? 1.3 : FLEE_D;
      const tx = cl(h.ax + Math.sin(a) * step, IN_X0, IN_X1);
      const tz = cl(h.az + Math.cos(a) * step, IN_Z0, IN_Z1);
      let clash = false;
      for (let j = 0; j < OBST.length; j++) {
        const ex = tx - OBST[j][0], ez = tz - OBST[j][1], r = OBST[j][2];
        if (ex * ex + ez * ez < r * r) { clash = true; break; }
      }
      bestX = tx; bestZ = tz; h.ry = a;
      if (!clash) ok = true;
    }
    h.bx = bestX; h.bz = bestZ;
    h.g.rotation.y = h.ry;
    h.pE = -1; h.m.rotation.x = 0;
  }

  // ---- walk a hen toward (tx,tz); true once it arrives ----------------
  function stepTo(h, sp, dt) {
    const dx = h.tx - h.g.position.x, dz = h.tz - h.g.position.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < 0.18) return true;
    const s = Math.min(d, sp * dt);
    h.g.position.x += dx / d * s;
    h.g.position.z += dz / d * s;
    h.ry = Math.atan2(dx / d, dz / d);
    h.g.rotation.y = h.ry;
    return false;
  }

  // =================== (5) the FEED beat =============================
  let feedT = 0;            // >0 while the flock is at the feed point
  let feedX = BUCKET_X, feedZ = BUCKET_Z;
  let tNow = 0, lastToast = -99;
  state.farmFeeds = state.farmFeeds || 0;

  addInteraction({
    x: BUCKET_X, z: BUCKET_Z, r: 2.6, label: 'toss some feed',
    onUse(pl) {
      // a feed point ~1 m in FRONT of the player (bucket -> player), inside
      // the paddock: the flock runs at YOU, which is the whole joke.
      let dx = pl.x - BUCKET_X, dz = pl.z - BUCKET_Z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > 0.01) { dx /= d; dz /= d; } else { dx = 1; dz = 0; }
      feedX = cl(BUCKET_X + dx * 1.0, IN_X0, IN_X1);
      feedZ = cl(BUCKET_Z + dz * 1.0, IN_Z0, IN_Z1);
      const fresh = feedT <= 0;                   // a re-press mid-beat just re-aims
      feedT = FEED_S;
      for (let i = 0; i < hens.length; i++) {
        const h = hens[i];
        h.st = RUSH; h.t = 0; h.pE = -1; h.m.rotation.x = 0;
        h.g.position.y = 0; h.m.rotation.z = 0;
        h.tx = cl(feedX + FEED_OFF[i][0], IN_X0, IN_X1);
        h.tz = cl(feedZ + FEED_OFF[i][1], IN_Z0, IN_Z1);
      }
      if (!fresh) return;                          // no double toast / double pay
      cluckNear(pl.x, pl.z, 0.075);
      state.farmFeeds = (state.farmFeeds || 0) + 1;
      // EXACTLY one toast per press, and never faster than the beat itself
      if (state.farmFeeds === 1) {
        toast('here chick chick chick', 'the whole flock came running');
        lastToast = tNow;
      } else if (tNow - lastToast > 8) {
        toast('the flock came running');
        lastToast = tNow;
      }
      wallet.pay({ key: 'farmfeed', first: 4, repeat: 1, reason: 'fed the flock',
                   firstReason: 'the whole flock came running', label: 'the farm', cd: 8 });
    },
  });

  journalSection('lp-farm', 'Farm 🐔', () => {
    const n = state.farmFeeds || 0;
    if (!n) return '';                             // hides its own header until fed
    return `<div class="jrow"><span>Fed the flock</span><b>${n}</b></div>
    <div class="jrow"><span>Loose hens</span><b>three, briefly</b></div>`;
  });

  // =================== (6) per frame: cull gate + the antics ==========
  let cullT = 0, near = true;
  registerUpdate((dt, t, pl) => {
    tNow = t;
    // throttled distance gate (~0.4 s): far -> hide + ZERO farm work
    cullT -= dt;
    if (cullT <= 0) {
      cullT = 0.4;
      const dx = pl.x - HEART_X, dz = pl.z - HEART_Z;
      near = dx * dx + dz * dz <= CULL_R * CULL_R;
      if (grp.visible !== near) grp.visible = near;
    }
    if (!near) return;
    const amp = calm() ? 0.5 : 1;

    // -- the feed beat clock: when it runs out everyone heads home ------
    if (feedT > 0) {
      feedT -= dt;
      if (feedT <= 0) {
        feedT = 0;
        for (let i = 0; i < hens.length; i++) {
          const h = hens[i];
          if (h.st === RUSH || h.st === FEAST) {
            h.st = BACK; h.tx = h.ox; h.tz = h.oz;
            h.m.rotation.x = 0; h.g.position.y = 0;
          }
        }
      }
    }

    // -- SCATTER trigger: the nearest ARMED hen inside 4 m bolts. One at
    // a time (never a synchronized explosion of chickens).
    let anyFleeing = false;
    for (let i = 0; i < hens.length; i++) if (hens[i].st === FLEE) { anyFleeing = true; break; }
    if (!anyFleeing && feedT <= 0) {
      let pick = null, pd2 = FLEE_TRIG * FLEE_TRIG;
      for (let i = 0; i < hens.length; i++) {
        const h = hens[i];
        if (h.st !== IDLE) continue;
        const dx = pl.x - h.g.position.x, dz = pl.z - h.g.position.z, d2 = dx * dx + dz * dz;
        if (h.armed) { if (d2 < pd2) { pd2 = d2; pick = h; } }
      }
      if (pick) { startFlee(pick, pl.x, pl.z); cluckNear(pl.x, pl.z, 0.06); }
    }
    // re-arm any hen the player has left behind
    for (let i = 0; i < hens.length; i++) {
      const h = hens[i];
      if (h.armed) continue;
      const dx = pl.x - h.g.position.x, dz = pl.z - h.g.position.z;
      if (dx * dx + dz * dz > FLEE_REARM * FLEE_REARM) h.armed = true;
    }

    // -- per-hen state machine ------------------------------------------
    for (let i = 0; i < hens.length; i++) {
      const h = hens[i];
      if (h.st === FLEE) {
        h.t += dt;
        const u = Math.min(1, h.t / FLEE_S), e = u * u * (3 - 2 * u);
        h.g.position.x = h.ax + (h.bx - h.ax) * e;
        h.g.position.z = h.az + (h.bz - h.az) * e;
        h.g.position.y = Math.sin(u * Math.PI) * 0.13 * amp;          // the startled hop
        h.m.rotation.z = Math.sin(h.t * 27) * 0.30 * amp * (1 - u);   // wing flap tilt
        h.m.rotation.x = -0.20 * amp * (1 - u);                       // head up, alarmed
        if (u >= 1) {                                                 // settle at the new spot
          h.st = IDLE; h.t = 0;
          h.hx = h.bx; h.hz = h.bz;
          h.g.position.set(h.bx, 0, h.bz);
          h.m.rotation.z = 0; h.m.rotation.x = 0;
          h.pT = 1.2 + Math.random() * 2.4; h.pE = -1;
        }
      } else if (h.st === RUSH) {
        h.t += dt;
        const done = stepTo(h, RUSH_SP, dt);
        h.g.position.y = Math.abs(Math.sin(h.t * 19)) * 0.055 * amp;  // scurry bob
        h.m.rotation.z = Math.sin(h.t * 19) * 0.17 * amp;             // comic waddle roll
        h.m.rotation.x = 0.12 * amp;                                  // leaning in
        if (done) { h.st = FEAST; h.t = 0; h.g.position.y = 0; h.m.rotation.z = 0; }
      } else if (h.st === FEAST) {
        h.t += dt;
        h.m.rotation.x = 0.55 * amp * Math.abs(Math.sin(h.t * 13));   // rapid cluster peck
        h.m.rotation.z = Math.sin(h.t * 6.5 + h.ph) * 0.05 * amp;
        h.g.rotation.y = h.ry + Math.sin(h.t * 1.7 + h.ph) * 0.12;
      } else if (h.st === BACK) {
        h.t += dt;
        const done = stepTo(h, BACK_SP, dt);
        h.g.position.y = Math.abs(Math.sin(h.t * 11)) * 0.03 * amp;
        h.m.rotation.z = Math.sin(h.t * 11) * 0.09 * amp;
        if (done) {
          h.st = IDLE; h.t = 0;
          h.hx = h.ox; h.hz = h.oz; h.ry = h.ory;
          h.g.position.set(h.ox, 0, h.oz); h.g.rotation.y = h.ory;
          h.m.rotation.z = 0; h.m.rotation.x = 0;
          h.pT = 1.0 + Math.random() * 2.6; h.pE = -1;
        }
      } else {                                                        // IDLE
        h.g.rotation.y = h.ry + Math.sin(t * 0.65 + h.ph) * 0.26;     // slow look-around
        if (h.pE >= 0) {                                              // a timed double-peck
          h.pE += dt;
          const u = h.pE / 0.6;
          if (u >= 1) { h.pE = -1; h.m.rotation.x = 0; h.pT = 2.4 + Math.random() * 3.4; }
          else h.m.rotation.x = 0.5 * amp * Math.abs(Math.sin(u * Math.PI * 2));
        } else {
          h.pT -= dt;
          if (h.pT <= 0) h.pE = 0;
        }
      }
    }
  });
});
