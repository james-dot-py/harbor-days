// =====================================================================
//  PACK: nature — the quiet-nature layer of the north lakefront:
//    1. BIRD BINGO      — binocular mode at the Bird Sanctuary gate; six
//                         species perch/hop among the trees, hold the
//                         reticle on one to identify it, tick the checklist.
//    2. PIPING PLOVER   — a roped-off cameo at the dog beach's NW corner
//                         (Monty & Rose's cousin) + an orange-vest steward;
//                         a secret 7th bird if scoped from >3m away.
//    3. FISHING         — a rod rack mid-pier; auto-cast, wait for the dip,
//                         press E to set the hook; weighted catch table +
//                         a periodic SMELT RUN (lanterns glow, smelt triples).
//    4. CHIP 'N' PUTT   — three tee mats outside Marovitz's west fence; loft
//                         a ball over the fence with the wind, sink it near
//                         the pin. Par 2 each, par 6 round.
//    5. sanctuary birdsong ambience.
//
//  Only-my-file rules honoured: this module + one import line in index.js.
//  No shared source is edited and NO colliders are spliced (the golf fence
//  still blocks the fairway everywhere; tees sit outside it, balls fly over).
//  All gameplay jitter uses Math.random so the world rng is never perturbed.
//  All audio is synthesized and guarded on getAudioCtx().actx.
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, registerUpdate, addInteraction, chargeThrow, camForward,
         holdItem, toast, journalSection, state, makeNPC, getAudioCtx, screenFx } from '../framework.js';
import { scene, camera, toon, bmat, clamp, lerp, WATER_Y } from '../core.js';
import { beachH } from '../coast.js';
import { cam, keys, joy } from '../input.js';
import { FX } from '../fx.js';
import * as CH from '../data/chicago.js';

// ---------------------------- scratch + helpers ------------------------
const _v = new THREE.Vector3();
const _dir = new THREE.Vector3();
const rr = (a, b) => a + (b - a) * Math.random();
const moving = () => keys.has('w') || keys.has('a') || keys.has('s') || keys.has('d') ||
  keys.has('arrowup') || keys.has('arrowdown') || keys.has('arrowleft') || keys.has('arrowright') || joy.len > 0.2;

// ---------------------------- session state ----------------------------
state.birdsSeen = state.birdsSeen || new Set();
state.fishLog = state.fishLog || {};
state.fishStreak = state.fishStreak || 0;
state.golfRounds = state.golfRounds || 0;
state.golf = state.golf || { strokes: [null, null, null], best: [null, null, null], roundSet: new Set(), bestRound: null };

// ================================ audio ================================
function dingChime() {                                   // bird identified
  const { actx, sfxBus } = getAudioCtx(); if (!actx) return; const t = actx.currentTime;
  [1319, 1760].forEach((f, i) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.value = f; const t0 = t + i * 0.09;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.12, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
    o.connect(g); g.connect(sfxBus); o.start(t0); o.stop(t0 + 0.75);
  });
}
const SONGS = [
  () => {                                                // rising two-note chirp
    const { actx, sfxBus } = getAudioCtx(); if (!actx) return; const t = actx.currentTime;
    [[2200, 0], [2650, 0.11]].forEach(([f, dl]) => {
      const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(f * 0.92, t + dl); o.frequency.exponentialRampToValueAtTime(f, t + dl + 0.06);
      g.gain.setValueAtTime(0.0001, t + dl); g.gain.linearRampToValueAtTime(0.045, t + dl + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dl + 0.14);
      o.connect(g); g.connect(sfxBus); o.start(t + dl); o.stop(t + dl + 0.16);
    });
  },
  () => {                                                // little trill
    const { actx, sfxBus } = getAudioCtx(); if (!actx) return; const t = actx.currentTime;
    for (let i = 0; i < 5; i++) {
      const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine';
      const t0 = t + i * 0.06; o.frequency.value = 2500 + (i % 2 ? 320 : 0);
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.035, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
      o.connect(g); g.connect(sfxBus); o.start(t0); o.stop(t0 + 0.06);
    }
  },
  () => {                                                // descending whistle
    const { actx, sfxBus } = getAudioCtx(); if (!actx) return; const t = actx.currentTime;
    const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(2900, t); o.frequency.exponentialRampToValueAtTime(1750, t + 0.32);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.04, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.4);
  },
];
function biteBlip() {                                     // bobber dips
  const { actx, sfxBus, noiseBuf } = getAudioCtx(); if (!actx) return; const t = actx.currentTime;
  const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(180, t + 0.16);
  g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.25);
  if (noiseBuf) {
    const s = actx.createBufferSource(); s.buffer = noiseBuf;
    const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    const ng = actx.createGain(); ng.gain.setValueAtTime(0.1, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    s.connect(f); f.connect(ng); ng.connect(sfxBus); s.start(t); s.stop(t + 0.2);
  }
}
function hookChime() {                                    // fish landed
  const { actx, sfxBus } = getAudioCtx(); if (!actx) return; const t = actx.currentTime;
  [784, 988, 1319].forEach((f, i) => {
    const o = actx.createOscillator(), g = actx.createGain(); o.type = 'triangle';
    o.frequency.value = f; const t0 = t + i * 0.07;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.11, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
    o.connect(g); g.connect(sfxBus); o.start(t0); o.stop(t0 + 0.55);
  });
}
function splashBlip() {
  const { actx, sfxBus, noiseBuf } = getAudioCtx(); if (!actx || !noiseBuf) return; const t = actx.currentTime;
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.7;
  const g = actx.createGain(); g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + 0.28);
}
function swingWhoosh() {
  const { actx, sfxBus, noiseBuf } = getAudioCtx(); if (!actx || !noiseBuf) return; const t = actx.currentTime;
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.1;
  f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(1600, t + 0.16);
  const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.11, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + 0.28);
}
function tockSound() {                                    // ball bounce
  const { actx, sfxBus } = getAudioCtx(); if (!actx) return; const t = actx.currentTime;
  const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(240, t + 0.06);
  g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.12);
}
function flagPing() {                                     // holed out
  const { actx, sfxBus } = getAudioCtx(); if (!actx) return; const t = actx.currentTime;
  [1568, 2093].forEach((f, i) => {
    const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine';
    o.frequency.value = f; const t0 = t + i * 0.06;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.13, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
    o.connect(g); g.connect(sfxBus); o.start(t0); o.stop(t0 + 0.65);
  });
}

// ============================== textures ===============================
function bangTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  g.clearRect(0, 0, 64, 64); g.fillStyle = '#fff2c8'; g.strokeStyle = '#7a4a12'; g.lineWidth = 5;
  g.font = '800 52px "Trebuchet MS",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.strokeText('!', 32, 36); g.fillText('!', 32, 36);
  return new THREE.CanvasTexture(cv);
}

// =============================== birds =================================
// Six species; each a tiny group (body/beak/tail/2 wings + optional accent).
// Head-tilt/peck is faked by tilting the small "head" sphere.
const SPECIES = [
  { name: 'Cardinal', body: 0xd12b2b, wing: 0x9e1f1f, beak: 0xf2a93b, crest: 0xd12b2b, mask: 0x201512, size: 1.0 },
  { name: 'Blue Jay', body: 0x4f8fd6, wing: 0x2f5fa8, beak: 0x2a2a2a, size: 1.05 },
  { name: 'Goldfinch', body: 0xf1d434, wing: 0x1c1c1c, beak: 0xe0a24a, size: 0.82 },
  { name: 'Red-winged Blackbird', body: 0x161616, wing: 0x161616, beak: 0x2a2a2a, shoulder: 0xd12b2b, size: 1.0 },
  { name: 'Warbler', body: 0xa9c24a, wing: 0x8aa338, beak: 0x3a3a2a, size: 0.78 },
  { name: 'Black-crowned Night Heron', body: 0x9aa4ad, wing: 0x7f8890, beak: 0x2a2a2a, cap: 0x1c1f24, size: 1.65, hunched: true },
];
const CORE = SPECIES.map(s => s.name);

function makeBird(spec) {
  const g = new THREE.Group();
  const wingMat = toon(spec.wing, { mat: { side: THREE.DoubleSide } });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.15, 9, 8), toon(spec.body));
  body.scale.set(1, spec.hunched ? 0.86 : 0.98, 1.4); g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 7), toon(spec.body));
  head.position.set(0, spec.hunched ? 0.03 : 0.07, spec.hunched ? 0.19 : 0.17); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.15, 6), toon(spec.beak));
  beak.rotation.x = Math.PI / 2; beak.position.set(0, spec.hunched ? 0.02 : 0.05, 0.33); g.add(beak);
  const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.26), wingMat);
  tail.rotation.x = -0.5; tail.position.set(0, 0.02, -0.24); g.add(tail);
  const wings = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.16), wingMat);
    w.rotation.set(-1.3, s * 0.5, 0); w.position.set(s * 0.13, 0.02, -0.02); g.add(w);
    wings.push(w);
  }
  if (spec.crest) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.13, 5), toon(spec.crest)); c.position.set(0, 0.19, 0.13); c.rotation.x = -0.4; g.add(c); }
  if (spec.mask) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), toon(spec.mask)); m.scale.set(1.1, 0.7, 0.7); m.position.set(0, 0.02, 0.27); g.add(m); }
  if (spec.cap) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 6), toon(spec.cap)); c.scale.set(1, 0.55, 1); c.position.set(0, 0.1, 0.14); g.add(c); }
  if (spec.shoulder) for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), toon(spec.shoulder, { mat: { side: THREE.DoubleSide } })); p.position.set(s * 0.15, 0.06, -0.02); p.rotation.y = s * Math.PI / 2; g.add(p); }
  g.scale.setScalar(spec.size);
  if (spec.hunched) g.rotation.x = 0.25;
  g.userData = { head, wings, base: g.rotation.x, hopPh: rr(0, 6), tiltPh: rr(0, 6), baseY: 0,
    state: 'perch', perchT: rr(4, 9), flapPh: rr(0, 6),
    px: 0, py: 0, pz: 0, sx: 0, sy: 0, sz: 0, tx: 0, ty: 0, tz: 0,
    flyT: 0, flyDur: 1, arcH: 0.4, bow: 0, perpx: 0, perpz: 0 };
  g.visible = false;
  return g;
}

// =============================== plovers ===============================
function makePlover() {
  const g = new THREE.Group();
  const pale = toon(0xe6d8bd);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 7), pale); body.scale.set(1, 0.92, 1.3); g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 6), pale); head.position.set(0, 0.06, 0.09); g.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.06, 7, 6), toon(0x6b5a44)); cap.scale.set(1, 0.5, 1); cap.position.set(0, 0.1, 0.06); g.add(cap);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 5), toon(0x2a2a2a)); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.05, 0.16); g.add(beak);
  return g;
}

// ================================ setup ================================
onWorldReady(player => {
  const SMELT_FAST = /[?&]smeltfast=1/.test(location.search);

  // ---------------- binocular DOM (vignette + reticle) ---------------- //
  const wrap = document.createElement('div'); wrap.id = 'binocWrap';
  Object.assign(wrap.style, { position: 'fixed', inset: '0', zIndex: '21', pointerEvents: 'none', display: 'none' });
  const vig = document.createElement('div');
  Object.assign(vig.style, { position: 'absolute', inset: '0', background: 'rgba(10,12,16,0.95)' });
  const mask = 'radial-gradient(circle at 35% 50%, transparent 0, transparent 19vh, #000 30vh), radial-gradient(circle at 65% 50%, transparent 0, transparent 19vh, #000 30vh)';
  vig.style.webkitMaskImage = mask; vig.style.maskImage = mask;
  vig.style.webkitMaskComposite = 'source-in'; vig.style.maskComposite = 'intersect';
  wrap.appendChild(vig);
  const ret = document.createElement('div');
  Object.assign(ret.style, { position: 'absolute', left: '50%', top: '50%', width: '58px', height: '58px', transform: 'translate(-50%,-50%)' });
  ret.innerHTML =
    '<div style="position:absolute;left:50%;top:50%;width:58px;height:1px;background:rgba(255,255,255,.5);transform:translate(-50%,-50%)"></div>' +
    '<div style="position:absolute;left:50%;top:50%;width:1px;height:58px;background:rgba(255,255,255,.5);transform:translate(-50%,-50%)"></div>' +
    '<div style="position:absolute;left:50%;top:50%;width:18px;height:18px;border:1.5px solid rgba(255,255,255,.8);border-radius:50%;transform:translate(-50%,-50%)"></div>';
  wrap.appendChild(ret);
  document.body.appendChild(wrap);

  // ------------------------------ 1. BIRDS ---------------------------- //
  const birds = SPECIES.map(makeBird);
  birds.forEach(b => scene.add(b));
  const idTargets = birds.map((g, i) => ({ group: g, species: SPECIES[i].name, isPlover: false }));

  const SANC = { x0: 32, x1: 180, z0: -420, z1: -356 };   // perch bounds — extended east so bingo birds range past the new watching DECK (~x172)
  function randPerch() { return { x: rr(SANC.x0, SANC.x1), z: rr(SANC.z0, SANC.z1), y: rr(0.7, 1.7) }; }
  let birdRelocT = 2;
  function relocateBirds() {
    const n = 3 + (Math.random() < 0.5 ? 0 : 1);
    const idx = [0, 1, 2, 3, 4, 5];
    for (let i = idx.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp; }
    birds.forEach(b => (b.visible = false));
    for (let k = 0; k < n; k++) {
      const b = birds[idx[k]], p = randPerch(), u = b.userData;
      b.position.set(p.x, p.y, p.z); b.rotation.y = rr(0, Math.PI * 2);
      u.px = p.x; u.py = p.y; u.pz = p.z; u.baseY = p.y;
      u.hopPh = rr(0, 6); u.tiltPh = rr(0, 6); u.flapPh = rr(0, 6);
      u.state = 'perch'; u.perchT = rr(4, 9);
      u.wings[0].rotation.x = u.wings[1].rotation.x = -1.3;
      b.visible = true;
    }
    birdRelocT = 22 + Math.random() * 8;   // reshuffle which species show; flights are the main motion
  }
  // launch a perched bird on a short hop (or, 20% of the time, a longer circling flight)
  function startFlight(b) {
    const u = b.userData;
    const circ = Math.random() < 0.2;
    const dist = circ ? 5 + Math.random() * 2.5 : 1.5 + Math.random() * 1.5;
    const ang = Math.random() * Math.PI * 2;
    const nx = clamp(u.px + Math.cos(ang) * dist, SANC.x0, SANC.x1);
    const nz = clamp(u.pz + Math.sin(ang) * dist, SANC.z0, SANC.z1);
    u.sx = u.px; u.sy = u.py; u.sz = u.pz;
    u.tx = nx; u.ty = rr(0.7, 1.7); u.tz = nz;
    const dx = nx - u.sx, dz = nz - u.sz, dl = Math.hypot(dx, dz) || 1;
    u.perpx = -dz / dl; u.perpz = dx / dl;                 // path bows out to one side when circling
    u.bow = circ ? (Math.random() < 0.5 ? -1 : 1) * 2.2 : 0;
    u.arcH = circ ? 1.1 : 0.45;                            // takeoff/landing arc height
    u.flyT = 0; u.flyDur = circ ? 2.6 + Math.random() * 0.8 : 1.0 + Math.random() * 0.6;
    u.state = 'fly';
    b.rotation.y = Math.atan2(dx, dz);                     // face travel (beak = +z)
  }
  function updBirds(dt, t) {
    birdRelocT -= dt; if (birdRelocT <= 0) relocateBirds();
    for (const b of birds) {
      if (!b.visible) continue; const u = b.userData;
      if (u.state === 'perch') {
        b.position.set(u.px, u.py + Math.abs(Math.sin(t * 2.2 + u.hopPh)) * 0.04, u.pz);
        u.head.rotation.z = Math.sin(t * 1.6 + u.tiltPh) * 0.35;
        u.head.rotation.x = Math.sin(t * 3.1 + u.tiltPh) * 0.12;
        u.perchT -= dt; if (u.perchT <= 0) startFlight(b);
      } else {                                             // in flight: arc + wing flap
        u.flyT += dt; let uu = u.flyT / u.flyDur; if (uu > 1) uu = 1;
        const s = Math.sin(uu * Math.PI);
        b.position.set(
          u.sx + (u.tx - u.sx) * uu + u.perpx * u.bow * s,
          u.sy + (u.ty - u.sy) * uu + s * u.arcH,
          u.sz + (u.tz - u.sz) * uu + u.perpz * u.bow * s);
        u.flapPh += dt * 22;
        const flap = Math.sin(u.flapPh) * 0.7;
        u.wings[0].rotation.x = -1.3 + flap; u.wings[1].rotation.x = -1.3 + flap;
        u.head.rotation.z = 0; u.head.rotation.x = 0.1;
        if (uu >= 1) {                                     // touch down, back to perching
          u.px = u.tx; u.py = u.ty; u.pz = u.tz; u.baseY = u.ty;
          u.wings[0].rotation.x = u.wings[1].rotation.x = -1.3;
          u.state = 'perch'; u.perchT = 4 + Math.random() * 5;
        }
      }
    }
  }

  // --------------------------- 2. PLOVER PEN -------------------------- //
  const penX = 105, penZ = -332, penHalf = 0.5;    // dog-beach cove edge (inside DOG_FENCE, on sand)
  const penGroundY = beachH(penX, penZ) ?? 0;
  const pen = new THREE.Group();
  const corners = [[-penHalf, -penHalf], [penHalf, -penHalf], [penHalf, penHalf], [-penHalf, penHalf]];
  const postH = 0.42;
  for (const [ox, oz] of corners) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, postH, 6), toon(0xdad2c2));
    post.position.set(penX + ox, penGroundY + postH / 2, penZ + oz); pen.add(post);
  }
  for (let i = 0; i < 4; i++) {                            // drooping ropes between post tops
    const a = corners[i], b = corners[(i + 1) % 4];
    const ax = penX + a[0], az = penZ + a[1], bx = penX + b[0], bz = penZ + b[1];
    const len = Math.hypot(bx - ax, bz - az);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, len, 5), toon(0xe8e0cf));
    rope.rotation.z = Math.PI / 2; rope.rotation.y = -Math.atan2(bz - az, bx - ax);
    rope.position.set((ax + bx) / 2, penGroundY + postH - 0.09, (az + bz) / 2); pen.add(rope);
  }
  scene.add(pen);

  const plovers = [makePlover(), makePlover()];
  plovers.forEach(p => {
    p.userData = { x: penX + rr(-0.35, 0.35), z: penZ + rr(-0.35, 0.35), tx: 0, tz: 0, wait: rr(0.6, 2.2), moving: false, ph: rr(0, 6) };
    scene.add(p);
    idTargets.push({ group: p, species: 'Piping Plover', isPlover: true });
  });
  function updPlovers(dt, t, pl) {
    for (const p of plovers) {
      const u = p.userData;
      if (u.moving) {
        const dx = u.tx - u.x, dz = u.tz - u.z, d = Math.hypot(dx, dz);
        if (d < 0.03) { u.moving = false; u.wait = rr(1.5, 2.8); }
        else { const st = Math.min(d, 0.45 * dt); u.x += dx / d * st; u.z += dz / d * st; p.rotation.y = Math.atan2(dx, dz); }
      } else { u.wait -= dt; if (u.wait <= 0) { u.tx = penX + rr(-0.4, 0.4); u.tz = penZ + rr(-0.4, 0.4); u.moving = true; } }
      const hop = u.moving ? Math.abs(Math.sin(t * 12 + u.ph)) * 0.03 : 0;
      p.position.set(u.x, penGroundY + 0.09 + hop, u.z);
    }
    // steward scolds if you crowd the rope
    scoldT -= dt;
    const dx = pl.x - penX, dz = pl.z - penZ;
    if (dx * dx + dz * dz < 2.1 * 2.1 && scoldT <= 0) { steward.say('ope — not too close!'); scoldT = 4.5; }
  }
  const steward = makeNPC({
    x: 108, z: -343, ry: -0.27,
    palette: { suit: 0xff7a1a, pants: 0x35414c, skin: 0xe4b489, hair: 0x241812, shoe: 0x222 },
    lines: ["that's Monty and Rose's cousin", "give 'em space now, wouldya", "they flew in from Montrose"],
  });
  let scoldT = 0;

  // ------------------------ binocular machine ------------------------- //
  const binoc = { active: false, ePrev: false, wobT: 0, idTgt: null, idHold: 0 };
  const binocInters = [];
  function enterBinoc() {
    if (binoc.active) return;
    binoc.active = true; binoc.ePrev = true; binoc.idTgt = null; binoc.idHold = 0;
    wrap.style.display = 'block';
    for (const it of binocInters) it.enabled = false;
  }
  function exitBinoc() {
    binoc.active = false; wrap.style.display = 'none'; binoc.idTgt = null; binoc.idHold = 0;
    for (const it of binocInters) it.enabled = true;
  }
  function identify(tgt) {
    if (tgt.isPlover) {
      if (!state.birdsSeen.has('Piping Plover')) { state.birdsSeen.add('Piping Plover'); dingChime(); toast('PIPING PLOVER!', 'the rarest guys'); }
      return;
    }
    if (state.birdsSeen.has(tgt.species)) return;
    state.birdsSeen.add(tgt.species); dingChime(); toast(tgt.species, 'checked off the list');
    if (CORE.every(n => state.birdsSeen.has(n))) toast('BIRD BINGO!', 'Bill Jarvis would be proud');
  }
  function updBinoc(dt, t, pl) {
    // fov ease (24 while raised, back to 50 otherwise)
    const tgtFov = binoc.active ? 24 : 50;
    if (binoc.active || Math.abs(camera.fov - 50) > 0.05) {
      camera.fov = lerp(camera.fov, tgtFov, 1 - Math.exp(-9 * dt));
      if (!binoc.active && Math.abs(camera.fov - 50) < 0.05) camera.fov = 50;
      camera.updateProjectionMatrix();
    }
    const eNow = keys.has('e'), ePress = eNow && !binoc.ePrev; binoc.ePrev = eNow;
    if (!binoc.active) return;
    if (moving() || ePress) { exitBinoc(); return; }
    // override the chase cam with a first-person look so the mayor doesn't
    // block the reticle; Z/C orbit still aims (they don't count as movement).
    const el = clamp(0.15 - cam.pitch, -0.7, 0.7);
    _dir.set(Math.sin(cam.yaw) * Math.cos(el), Math.sin(el), Math.cos(cam.yaw) * Math.cos(el));
    const eyeY = pl.y + 1.5;
    camera.position.set(pl.x + _dir.x * 0.4, eyeY + _dir.y * 0.4, pl.z + _dir.z * 0.4);
    camera.lookAt(pl.x + _dir.x * 12, eyeY + _dir.y * 12, pl.z + _dir.z * 12);
    // subtle hand sway (applied after lookAt, before render)
    binoc.wobT += dt;
    camera.rotateY(Math.sin(binoc.wobT * 1.3) * 0.004);
    camera.rotateX(Math.sin(binoc.wobT * 0.9 + 1.7) * 0.004);
    // reticle identify: nearest target to screen centre
    camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    const cx = innerWidth / 2, cy = innerHeight / 2;
    let best = null, bestD = 1e9;
    for (const tgt of idTargets) {
      if (!tgt.group.visible) continue;
      tgt.group.getWorldPosition(_v); _v.y += 0.12; _v.project(camera);
      if (_v.z > 1) continue;
      const sx = (_v.x * 0.5 + 0.5) * innerWidth, sy = (-_v.y * 0.5 + 0.5) * innerHeight;
      const d = Math.hypot(sx - cx, sy - cy);
      if (d < bestD) { bestD = d; best = tgt; }
    }
    if (best && bestD < (best.isPlover ? 48 : 42)) {
      if (best.isPlover) { const dx = pl.x - penX, dz = pl.z - penZ; if (dx * dx + dz * dz < 9) { binoc.idTgt = null; binoc.idHold = 0; return; } }
      if (binoc.idTgt === best) binoc.idHold += dt; else { binoc.idTgt = best; binoc.idHold = 0; }
      if (binoc.idHold >= 1.2) { identify(best); binoc.idHold = 0; binoc.idTgt = null; }
    } else { binoc.idTgt = null; binoc.idHold = 0; }
  }
  const gate = CH.SANCTUARY.gate;
  binocInters.push(addInteraction({ x: (gate.x0 + gate.x1) / 2, z: gate.z1, r: 2.4, label: 'birdwatch 🔭', onUse: enterBinoc }));
  binocInters.push(addInteraction({ x: 100, z: -342, r: 3.6, label: 'birdwatch 🔭', onUse: enterBinoc }));   // dog-beach vantage (scopes the plover >3m off)
  { const D = CH.SANCTUARY.deck;                              // the elevated watching DECK — the hero perch
    binocInters.push(addInteraction({ x: (D.x0 + D.x1) / 2, z: (D.z0 + D.z1) / 2, r: 2.6, label: 'birdwatch 🔭', onUse: enterBinoc })); }

  // ------------------------------ 3. FISHING -------------------------- //
  const RACK_X = 208, RACK_Z = -105, TX = 224, TZ = -105;   // rod rack on the peninsula pier deck; cast EAST into open lake
  // rod rack (base + two leaning rods)
  const rack = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.16), toon(0x7a5636)); base.position.y = 0.67; rack.add(base);
  for (const s of [-1, 1]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 1.5, 6), toon(0x6b4a2a));
    rod.geometry.translate(0, 0.75, 0); rod.position.set(s * 0.15, 0.9, 0); rod.rotation.x = -0.5; rod.rotation.z = s * 0.08; rack.add(rod);
  }
  rack.position.set(RACK_X, 0.42, RACK_Z); scene.add(rack);
  // held rod
  const rodHeld = new THREE.Group();
  { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 1.3, 6), toon(0x6b4a2a)); r.geometry.translate(0, 0.65, 0); r.rotation.x = -0.9; rodHeld.add(r); }
  // bobber
  const bobber = new THREE.Group();
  { const top = new THREE.Mesh(new THREE.SphereGeometry(0.11, 9, 8), toon(0xd83b3b)); top.scale.y = 0.9; top.position.y = 0.05; bobber.add(top);
    const bot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 9, 8), toon(0xf4f4f4)); bot.scale.y = 0.9; bot.position.y = -0.05; bobber.add(bot); }
  bobber.visible = false; scene.add(bobber);
  // '!' bite marker (billboarded)
  const bang = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), bmat(0xffffff, { map: bangTex(), transparent: true, side: THREE.DoubleSide }));
  bang.visible = false; scene.add(bang);
  // reusable catch meshes
  const fishMat = toon(0xcccccc, { mat: {} });
  const fishMesh = new THREE.Group();
  { const fb = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 8), fishMat); fb.rotation.z = Math.PI / 2; fishMesh.add(fb);
    const ft = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 8), fishMat); ft.rotation.z = -Math.PI / 2; ft.position.x = -0.33; fishMesh.add(ft); }
  const bootMesh = new THREE.Group();
  { const bs = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.32, 0.17), toon(0x5a3a24)); bs.position.y = 0.09; bootMesh.add(bs);
    const bf = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 8), toon(0x452c1a)); bf.rotation.z = Math.PI / 2; bf.position.set(0.11, -0.08, 0); bootMesh.add(bf); }

  const CATCH = {
    perch:   { key: 'perch',   label: 'perch',      flavor: 'fry it up',                    size: 1.0, color: 0xd9c26a },
    smelt:   { key: 'smelt',   label: 'smelt',      flavor: 'April tradition',              size: 0.65, color: 0xbfc6cf },
    alewife: { key: 'alewife', label: 'alewife',    flavor: 'washed up by the thousands',   size: 0.85, color: 0xcfd6dd },
    boot:    { key: 'boot',    label: 'an old boot',flavor: 'the lake provides',            size: 1.0, kind: 'boot' },
    rockbass:{ key: 'rockbass',label: 'rock bass',  flavor: 'red-eyed scrapper',            size: 0.9, color: 0x6b7a4a },
    trout:   { key: 'trout',   label: 'lake trout', flavor: 'THE LEGEND OF LAKE MICHIGAN',   size: 1.75, color: 0x5a6b7a, legendary: true },
  };
  const FISH_LABELS = { perch: 'Perch', smelt: 'Smelt', alewife: 'Alewife', rockbass: 'Rock bass', boot: 'Old boots', trout: 'Lake trout' };
  function pickCatch() {
    const table = [['perch', 48], ['smelt', smelt.active ? 81 : 27], ['alewife', 10], ['boot', 8], ['rockbass', 4], ['trout', 3]];
    let tot = 0; for (const e of table) tot += e[1];
    let r = Math.random() * tot;
    for (const e of table) { if (r < e[1]) return CATCH[e[0]]; r -= e[1]; }
    return CATCH.perch;
  }
  function ripple(x, z, rs) {
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; FX.spawn(x, WATER_Y + 0.06, z, Math.cos(a) * rs, 0.08, Math.sin(a) * rs, 0.7, 0.9, 1.0, 0.5, 2.2, 0, 3.0); }
  }
  function splashAt(x, z) {
    for (let k = 0; k < 12; k++) { const a = Math.random() * Math.PI * 2, sp = 1.5 * (0.5 + Math.random()); FX.spawn(x, WATER_Y + 0.05, z, Math.cos(a) * sp, 3 * (0.5 + 0.5 * Math.random()), Math.sin(a) * sp, 0.72, 0.9, 1.0, 0.45, 2.6, 9, 0.4); }
  }
  const fish = { phase: 'idle', t: 0, sx: 0, sy: 0, sz: 0, waitT: 0, biteT: 0, ePrev: false, catch: null, mesh: null, rippleT: 0, streak: 0 };
  const fishInter = addInteraction({ x: RACK_X, z: RACK_Z, r: 2.4, label: 'cast a line', onUse: pl => {
    if (fish.phase !== 'idle') return;
    holdItem(rodHeld); fishInter.enabled = false;
    const f = camForward();
    fish.sx = pl.x + f.x * 0.5; fish.sy = 1.8; fish.sz = pl.z + f.z * 0.5;   // rod tip above the deck (deck h 0.42)
    fish.phase = 'cast'; fish.t = 0; fish.ePrev = true;
    bobber.visible = true; bobber.position.set(fish.sx, fish.sy, fish.sz);
    swingWhoosh();
  }});
  function missReset(sub) {
    bang.visible = false; toast('it got away…', sub || 'next time'); fish.streak = 0;
    bobber.visible = false; fish.phase = 'idle'; fishInter.enabled = true; fishInter.setLabel('cast a line');
  }
  function updFishing(dt, t, pl) {
    const eNow = keys.has('e'), ePress = eNow && !fish.ePrev; fish.ePrev = eNow;
    const P = fish.phase;
    if (P === 'cast') {
      fish.t += dt; const u = Math.min(1, fish.t / 0.85);
      bobber.position.set(lerp(fish.sx, TX, u), lerp(fish.sy, WATER_Y + 0.15, u) + Math.sin(u * Math.PI) * 2.2, lerp(fish.sz, TZ, u));
      if (u >= 1) { fish.phase = 'wait'; fish.waitT = 2.5 + Math.random() * 5.5; fish.rippleT = 0; ripple(TX, TZ, 2.4); splashBlip(); }
    } else if (P === 'wait') {
      bobber.position.set(TX, WATER_Y + 0.15 + Math.sin(t * 2.2) * 0.03, TZ);
      fish.rippleT -= dt; if (fish.rippleT <= 0) { ripple(TX, TZ, 1.3); fish.rippleT = 1.7; }
      if (ePress) { missReset('too eager'); return; }
      fish.waitT -= dt;
      if (fish.waitT <= 0) { fish.phase = 'bite'; fish.biteT = 0.9; bang.visible = true; biteBlip(); ripple(TX, TZ, 1.8); }
    } else if (P === 'bite') {
      bobber.position.set(TX, WATER_Y - 0.05 + Math.sin(t * 20) * 0.05, TZ);
      bang.position.set(TX, WATER_Y + 0.95, TZ); bang.quaternion.copy(camera.quaternion);
      if (ePress) {
        bang.visible = false;
        const sp = pickCatch(); fish.catch = sp;
        fish.mesh = sp.kind === 'boot' ? bootMesh : fishMesh;
        if (sp.color) fishMat.color.setHex(sp.color);
        scene.add(fish.mesh); fish.mesh.scale.setScalar(sp.size);
        fish.phase = 'reel'; fish.t = 0; hookChime(); splashAt(TX, TZ);
        state.fishLog[sp.key] = (state.fishLog[sp.key] || 0) + 1;
        fish.streak++; if (fish.streak > state.fishStreak) state.fishStreak = fish.streak;
        return;
      }
      fish.biteT -= dt; if (fish.biteT <= 0) missReset('a hair too slow');
    } else if (P === 'reel') {
      fish.t += dt; const u = Math.min(1, fish.t / 0.6);
      const y = lerp(WATER_Y, 1.35, u) + Math.sin(u * Math.PI) * 1.6;
      fish.mesh.position.set(lerp(TX, pl.x, u), y, lerp(TZ, pl.z, u));
      fish.mesh.rotation.y += 10 * dt; fish.mesh.rotation.z = Math.sin(fish.t * 20) * 0.3;
      bobber.visible = false;
      if (u >= 1) {
        holdItem(fish.mesh); fish.mesh.position.set(0, 0.12, 0.18); fish.mesh.rotation.set(0, 0, 0.4);
        fish.phase = 'show'; fish.showT = 1.8; toast(fish.catch.label, fish.catch.flavor);
        if (fish.catch.legendary) screenFx.flash('#ffe9a8', 500);
      }
    } else if (P === 'show') {
      fish.showT -= dt;
      if (fish.showT <= 0) { holdItem(null); splashAt(TX, TZ); splashBlip(); fish.mesh = null; fish.phase = 'idle'; fishInter.enabled = true; fishInter.setLabel('cast a line'); }
    }
  }

  // ------------------------- SMELT RUN + lanterns --------------------- //
  const lanternMat = bmat(0xffcf8a, { transparent: true, opacity: 0 });
  const lanterns = new THREE.Group();
  for (const lx of [201, 203.6, 206.2, 208.8, 211.4, 214]) {   // strung over the pier deck
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 9, 8), lanternMat); l.position.set(lx, 1.92, -96); lanterns.add(l);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.08, 6), toon(0x7a4a2a)); cap.position.set(lx, 2.10, -96); lanterns.add(cap);
  }
  { const str = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.025, 0.025), toon(0x3a2c1c)); str.position.set(207.5, 2.18, -96); lanterns.add(str); }
  lanterns.visible = false; scene.add(lanterns);
  const smelt = { active: false, t: 0, dur: SMELT_FAST ? 20 : 75, next: SMELT_FAST ? 4 : 240 + Math.random() * 120 };
  function updSmelt(dt, t) {
    if (!smelt.active) {
      smelt.next -= dt;
      if (smelt.next <= 0) { smelt.active = true; smelt.t = smelt.dur; lanterns.visible = true; toast('SMELT RUN', 'get the net'); }
      return;
    }
    smelt.t -= dt;
    const inA = clamp((smelt.dur - smelt.t) / 2, 0, 1), outA = clamp(smelt.t / 2, 0, 1);
    lanternMat.opacity = Math.min(inA, outA) * (0.8 + 0.2 * Math.sin(t * 7));
    if (smelt.t <= 0) { smelt.active = false; lanterns.visible = false; smelt.next = SMELT_FAST ? 15 + Math.random() * 10 : 240 + Math.random() * 120; }
  }

  // ------------------------ 4. CHIP 'N' PUTT -------------------------- //
  const G = CH.GOLF;
  const TEES = [                                       // inside the fence, ~19 m from the 3 south pins, clear fairway to each
    { x: 88,  z: -470, pin: G.pins[0] },                // -> pin [95,-452]
    { x: 118, z: -486, pin: G.pins[1] },                // -> pin [110,-468]
    { x: 138, z: -462, pin: G.pins[2] },                // -> pin [125,-448]
  ];
  const windArrow = w => Math.abs(w.x) >= Math.abs(w.z) ? (w.x >= 0 ? '→' : '←') : (w.z >= 0 ? '↓' : '↑');
  const clubHeld = new THREE.Group();
  { const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.9, 6), toon(0xcccccc)); shaft.position.y = -0.45; clubHeld.add(shaft);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.05), toon(0x888888)); head.position.set(0.05, -0.9, 0.04); clubHeld.add(head); }
  const golfBall = new THREE.Mesh(new THREE.SphereGeometry(0.08, 9, 8), toon(0xf6f6f2)); golfBall.visible = false; scene.add(golfBall);
  const golf = { cur: null, flying: false, life: 0, bx: 0, by: 0, bz: 0, bvx: 0, bvy: 0, bvz: 0 };
  const holes = TEES.map((tee, i) => {
    const h = { i, tee, pin: tee.pin, wind: { x: rr(-0.6, 0.6), z: rr(-0.6, 0.6) }, stroke: 0, inter: null };
    // tee mat + peg, facing the pin
    const ry = Math.atan2(tee.pin[0] - tee.x, tee.pin[1] - tee.z);
    const mat = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20), toon(0x66b04f)); mat.rotation.x = -Math.PI / 2; mat.position.set(tee.x, 0.045, tee.z); mat.scale.z = 1.3; mat.rotation.z = -ry; scene.add(mat);
    const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 5), toon(0xf6f6f2)); peg.position.set(tee.x, 0.11, tee.z); scene.add(peg);
    return h;
  });
  function confetti(x, z) {
    const cols = [[0.06, 0.2, 0.53], [1, 1, 1], [0.83, 0.2, 0.2], [1, 0.88, 0.54]];
    for (let k = 0; k < 40; k++) { const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 3.5, c = cols[(Math.random() * cols.length) | 0];
      FX.spawn(x, 0.2, z, Math.cos(a) * sp, 3 + Math.random() * 3, Math.sin(a) * sp, c[0], c[1], c[2], 1.0 + Math.random() * 0.6, 2.6, 4, 0.6); }
  }
  function holeDone(h, strokes, holed) {
    const g = state.golf; g.strokes[h.i] = strokes;
    if (g.best[h.i] == null || strokes < g.best[h.i]) g.best[h.i] = strokes;
    if (holed) { flagPing(); confetti(h.pin[0], h.pin[1]); toast('IN!', `hole ${h.i + 1} in ${strokes} stroke${strokes > 1 ? 's' : ''}`); }
    else toast('gimme', `hole ${h.i + 1} — picked up at ${strokes}`);
    g.roundSet.add(h.i);
    if (g.roundSet.size >= 3) {
      const total = g.strokes.reduce((a, b) => a + (b || 0), 0);
      if (g.bestRound == null || total < g.bestRound) g.bestRound = total;
      state.golfRounds = (state.golfRounds || 0) + 1; g.roundSet.clear();
    }
  }
  function resolveBall(h) {
    golf.flying = false; golf.life = 0; golfBall.visible = false;
    const dx = golf.bx - h.pin[0], dz = golf.bz - h.pin[1], d = Math.hypot(dx, dz);
    if (d <= 1.1 || h.stroke >= 5) {
      holeDone(h, h.stroke, d <= 1.1); h.stroke = 0;
      for (const hh of holes) { hh.inter.enabled = true; hh.inter.setLabel(`tee off — hole ${hh.i + 1}`); }
    } else {
      for (const hh of holes) hh.inter.enabled = true;
      h.inter.setLabel(`chip again (stroke ${h.stroke + 1})`);
    }
  }
  function launchBall(h, pl, power) {
    golf.cur = h; const f = camForward();
    const speed = 7 + 13 * power, vy = 3 + 4 * power;
    golf.bx = h.tee.x; golf.by = 0.12; golf.bz = h.tee.z;
    golf.bvx = f.x * speed; golf.bvy = vy; golf.bvz = f.z * speed; golf.flying = true; golf.life = 0;
    golfBall.visible = true; golfBall.position.set(golf.bx, golf.by, golf.bz); swingWhoosh();
    for (const hh of holes) hh.inter.enabled = false;
  }
  for (const h of holes) {
    h.inter = addInteraction({ x: h.tee.x, z: h.tee.z, r: 2.6, label: `tee off — hole ${h.i + 1}`, onUse: pl => {
      if (golf.flying) return;
      if (h.stroke === 0) toast(`hole ${h.i + 1} · par 2`, `wind ${windArrow(h.wind)}`);
      holdItem(clubHeld);
      chargeThrow({ onRelease: power => { holdItem(null); h.stroke++; launchBall(h, pl, power); } });
    }});
  }
  function updGolf(dt) {
    if (!golf.flying) return;
    const h = golf.cur, groundY = 0.05;
    golf.bvx += h.wind.x * dt; golf.bvz += h.wind.z * dt; golf.bvy -= 9 * dt;
    golf.bx += golf.bvx * dt; golf.by += golf.bvy * dt; golf.bz += golf.bvz * dt;
    if (golf.by <= groundY) {
      golf.by = groundY;
      if (golf.bvy < -0.4) { golf.bvy = -golf.bvy * 0.45; golf.bvx *= 0.7; golf.bvz *= 0.7; tockSound(); }
      else { golf.bvy = 0; const fr = Math.max(0, 1 - 2.5 * dt); golf.bvx *= fr; golf.bvz *= fr; }
    }
    golfBall.position.set(golf.bx, golf.by, golf.bz); golfBall.rotation.x += 8 * dt;
    golf.life += dt;
    const hs = Math.hypot(golf.bvx, golf.bvz);
    if ((golf.by <= groundY + 0.001 && hs < 0.25 && Math.abs(golf.bvy) < 0.3) || golf.life > 14) resolveBall(h);
  }

  // ---------------------------- 5. BIRDSONG --------------------------- //
  let songT = 5 + Math.random() * 4;
  function updSong(dt, pl) {
    songT -= dt;
    if (songT <= 0) { if (pl.z < -350 && pl.z > -425) SONGS[(Math.random() * SONGS.length) | 0](); songT = 4 + Math.random() * 5; }   // in the sanctuary
  }

  // ------------------------------ journals ---------------------------- //
  journalSection('birds', 'Bird Bingo', () => {
    let rows = CORE.map(n => `<div class="jrow"><span>${state.birdsSeen.has(n) ? '✓' : '·'} ${n}</span><b></b></div>`).join('');
    if (state.birdsSeen.has('Piping Plover')) rows += `<div class="jrow"><span>★ Piping Plover</span><b>secret</b></div>`;
    rows += `<div class="jrow"><span>Species seen</span><b>${CORE.filter(n => state.birdsSeen.has(n)).length} / 6</b></div>`;
    return rows;
  });
  journalSection('fishing', 'Fish Log', () => {
    let rows = Object.keys(FISH_LABELS).map(k => `<div class="jrow"><span>${FISH_LABELS[k]}</span><b>${state.fishLog[k] || 0}</b></div>`).join('');
    rows += `<div class="jrow"><span>Best streak</span><b>${state.fishStreak}</b></div>`;
    return rows;
  });
  journalSection('golf', 'Marovitz 3', () => {
    const g = state.golf; let rows = '';
    for (let i = 0; i < 3; i++) { const s = g.strokes[i], b = g.best[i];
      rows += `<div class="jrow"><span>Hole ${i + 1} (par 2)</span><b>${s == null ? '—' : s}${b != null ? ` · best ${b}` : ''}</b></div>`; }
    const total = g.strokes.every(s => s != null) ? g.strokes.reduce((a, b) => a + b, 0) : null;
    rows += `<div class="jrow"><span>Total (par 6)</span><b>${total == null ? '—' : total}</b></div>`;
    rows += `<div class="jrow"><span>Best round</span><b>${g.bestRound == null ? '—' : g.bestRound}</b></div>`;
    rows += `<div class="jrow"><span>Rounds played</span><b>${state.golfRounds || 0}</b></div>`;
    return rows;
  });

  // ------------------------------ per frame --------------------------- //
  registerUpdate((dt, t, pl) => {
    updBinoc(dt, t, pl);
    updBirds(dt, t);
    updPlovers(dt, t, pl);
    updFishing(dt, t, pl);
    updSmelt(dt, t);
    updGolf(dt);
    updSong(dt, pl);
  });
});
