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
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, registerUpdate, addInteraction, chargeThrow, camForward,
         holdItem, toast, journalSection, state, makeNPC, getAudioCtx, screenFx, wallet,
         takeCamera, releaseCamera } from '../framework.js';
import { scene, camera, toon, bmat, curveMat, gmap, clamp, lerp, WATER_Y, baseFov } from '../core.js';
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

// ---------------------------- crumb lure (task 078) --------------------
// The popcorn bag (packs/economy-pilot.js) publishes a lure point via
// setCrumbLure(()=>({x,z})) while it's held, setCrumbLure(null) when stowed.
// The sanctuary flock diverts a few SONG/GROUND birds to peck near it, then
// rotates back to normal life. Module-scoped so the pack can toggle it without
// reaching into onWorldReady's closure; the bird update below reads _crumbLure.
let _crumbLure = null;
export function setCrumbLure(fn) { _crumbLure = (typeof fn === 'function') ? fn : null; }

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
// Per-species CALLS — a short synthesized voice keyed by the SPECIES.call
// [kind, baseHz] pair (guarded on actx; the audio ctx is null until start).
// Reuses the toon-audio idiom: tiny oscillator chirps + a filtered-noise click
// for the woodpecker drum. New behavior flavors (heron strike, woodpecker
// knock, hummingbird hover, waxwing pass) each trigger their own voice here.
function birdCall(kind, f) {
  const A = getAudioCtx(), actx = A.actx; if (!actx) return;
  const sfx = A.sfxBus, t = actx.currentTime, nb = A.noiseBuf;
  const tone = (freq, dur, gain, type, t0, slideTo) => {
    const o = actx.createOscillator(), g = actx.createGain(); o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(gain, t0 + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(sfx); o.start(t0); o.stop(t0 + dur + 0.02);
  };
  const click = (freq, gain, t0) => {
    if (!nb) { tone(freq, 0.03, gain, 'square', t0); return; }
    const s = actx.createBufferSource(); s.buffer = nb;
    const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 3;
    const g = actx.createGain(); g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
    s.connect(bp); bp.connect(g); g.connect(sfx); s.start(t0); s.stop(t0 + 0.05);
  };
  switch (kind) {
    case 'chip':     tone(f, 0.09, 0.05, 'sine', t, f * 1.4); break;
    case 'jeer':     tone(f, 0.28, 0.06, 'sawtooth', t, f * 0.6); break;
    case 'twitter':  for (let i = 0; i < 4; i++) tone(f * (i % 2 ? 1.25 : 1), 0.06, 0.035, 'sine', t + i * 0.07); break;
    case 'conkaree': tone(f, 0.06, 0.045, 'sine', t); tone(f * 1.15, 0.06, 0.045, 'sine', t + 0.08); tone(f * 1.6, 0.22, 0.05, 'sawtooth', t + 0.16, f * 1.2); break;
    case 'trill':    for (let i = 0; i < 7; i++) tone(f + (i % 2 ? 260 : 0), 0.045, 0.03, 'sine', t + i * 0.05); break;
    case 'whistle':  tone(f, 0.14, 0.05, 'sine', t, f * 1.25); tone(f * 1.25, 0.16, 0.05, 'sine', t + 0.16, f * 0.9); break;
    case 'buzz':     tone(f, 0.1, 0.04, 'square', t, f * 1.05); tone(f * 1.02, 0.1, 0.035, 'square', t + 0.12, f * 0.98); break;
    case 'chipburr': tone(f, 0.07, 0.05, 'sawtooth', t); tone(f * 0.9, 0.18, 0.045, 'sawtooth', t + 0.09, f * 0.7); break;
    case 'warble':   for (let i = 0; i < 5; i++) tone(f * (1 + 0.18 * Math.sin(i * 1.7)), 0.09, 0.035, 'sine', t + i * 0.1); break;
    case 'seee':     tone(f, 0.5, 0.03, 'sine', t, f * 0.92); break;
    case 'sam':      tone(f, 0.16, 0.045, 'sine', t); tone(f * 0.86, 0.2, 0.045, 'sine', t + 0.2); tone(f * 0.86, 0.18, 0.04, 'sine', t + 0.44); break;
    case 'kek':      for (let i = 0; i < 5; i++) tone(f, 0.05, 0.05, 'square', t + i * 0.09, f * 0.9); break;
    case 'squeal':   tone(f, 0.24, 0.05, 'sine', t, f * 2.0); break;
    case 'quawk':    tone(f, 0.16, 0.09, 'sawtooth', t, f * 0.7); break;
    case 'croak':    tone(f, 0.28, 0.09, 'sawtooth', t, f * 0.6); tone(f * 0.9, 0.2, 0.06, 'square', t + 0.1); break;
    case 'knock':    for (let i = 0; i < 9; i++) click(1400, 0.09, t + i * 0.035); break;
    case 'hum':      { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'triangle'; o.frequency.value = f || 55;
                       const lfo = actx.createOscillator(), lg = actx.createGain(); lfo.frequency.value = 45; lg.gain.value = 8; lfo.connect(lg); lg.connect(o.frequency);
                       g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
                       o.connect(g); g.connect(sfx); o.start(t); lfo.start(t); o.stop(t + 0.55); lfo.stop(t + 0.55); break; }
  }
}
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
// The Bill Jarvis / Magic Hedge roster — real migrants & residents of the
// north-lakefront sanctuary. Each songbird is chibi-toon: a MERGED
// vertex-colored body (1 draw) + a separately tiltable head + two flapping
// wings = 4 draws, so a busy flock of ~13 stays well under budget. Palette
// params drive the field-guide plumage per species; `kind` selects the
// behavior state machine, `layer` the perch height (canopy/shrub/ground/
// clearing-edge), `flock` clusters birds in twos & threes, `core` marks the
// original six that the Bird Bingo win still requires, `call` = [voice, Hz].
const SPECIES = [
  // --- the CORE six (bingo win condition — unchanged) ---
  { name: 'Cardinal',                 body: 0xd12b2b, wing: 0x9e1f1f, beak: 0xf2a93b, crest: 0xd12b2b, mask: 0x201512, size: 1.0,  core: true, layer: 'shrub',  call: ['chip', 1500] },
  { name: 'Blue Jay',                 body: 0x4f8fd6, wing: 0x2f5fa8, beak: 0x2a2a2a, crest: 0x5a97da, size: 1.08, core: true, layer: 'canopy', call: ['jeer', 900] },
  { name: 'Goldfinch',                body: 0xf1d434, wing: 0x1c1c1c, beak: 0xe0a24a, cap: 0x1c1c1c, size: 0.82, core: true, flock: 2, layer: 'shrub', call: ['twitter', 2600] },
  { name: 'Red-winged Blackbird',     body: 0x161616, wing: 0x161616, beak: 0x2a2a2a, shoulder: 0xd12b2b, size: 1.02, core: true, layer: 'shrub', call: ['conkaree', 1400] },
  { name: 'Warbler',                  body: 0xa9c24a, wing: 0x8aa338, beak: 0x3a3a2a, size: 0.78, core: true, layer: 'shrub', call: ['trill', 2500] },
  { name: 'Black-crowned Night Heron', body: 0x9aa4ad, wing: 0x7f8890, beak: 0x2a2a2a, cap: 0x1c1f24, legc: 0xd0c26a, size: 1.15, core: true, kind: 'wade', layer: 'edge', call: ['quawk', 360] },
  // --- bonus migrants (Magic Hedge headliners; identify = bonus sighting) ---
  { name: 'Baltimore Oriole',         body: 0xf0781a, wing: 0x161616, beak: 0x8a95a0, headColor: 0x161616, size: 0.92, layer: 'canopy', call: ['whistle', 1900] },
  { name: 'Indigo Bunting',           body: 0x2f5fd0, wing: 0x223f8a, beak: 0xb8c0c8, size: 0.8,  layer: 'canopy', call: ['buzz', 2100] },
  { name: 'Scarlet Tanager',          body: 0xe02818, wing: 0x141414, beak: 0xc8b88a, size: 0.95, layer: 'canopy', call: ['chipburr', 1600] },
  { name: 'Rose-breasted Grosbeak',   body: 0xf2f0ea, wing: 0x1c1c1c, beak: 0xe6ddc6, headColor: 0x1c1c1c, throat: 0xd42b4a, size: 0.98, flock: 2, layer: 'shrub', call: ['warble', 2000] },
  { name: 'Cedar Waxwing',            body: 0xc7a577, wing: 0x8f8a86, beak: 0x241a12, crest: 0xc7a577, mask: 0x1c1512, tailTip: 0xf2c14e, size: 0.9, kind: 'flock', flock: 3, layer: 'canopy', call: ['seee', 7200] },
  { name: 'Yellow-rumped Warbler',    body: 0x6b7686, wing: 0x3f4756, beak: 0x33383e, shoulder: 0xf2c14e, size: 0.78, flock: 2, layer: 'shrub', call: ['trill', 3000] },
  { name: 'Palm Warbler',             body: 0xb7a35a, wing: 0x8a7a48, beak: 0x33352a, cap: 0x9c5a30, size: 0.76, kind: 'ground', layer: 'ground', call: ['trill', 3200] },
  { name: 'White-throated Sparrow',   body: 0x9a8460, wing: 0x7a6444, beak: 0x33352a, cap: 0x2a2418, throat: 0xf4f0e6, size: 0.82, kind: 'ground', flock: 3, layer: 'ground', call: ['sam', 2200] },
  { name: 'Ruby-throated Hummingbird', body: 0x3fae6a, wing: 0x2f6b45, beak: 0x141414, throat: 0xc41230, belly: 0xdfe3dc, size: 0.42, kind: 'hover', layer: 'shrub', call: ['hum', 55] },
  { name: 'Downy Woodpecker',         body: 0xf2f2ee, wing: 0x1a1a1a, beak: 0x2a2a2a, cap: 0x1a1a1a, nape: 0xcc2222, size: 0.78, kind: 'cling', layer: 'shrub', call: ['knock', 0] },
  { name: 'Great Blue Heron',         body: 0x8a97a4, wing: 0x6f7c88, beak: 0xe0b83a, cap: 0xdad8d2, plume: 0x1c1f24, legc: 0x3f4a52, size: 1.6, tall: true, kind: 'wade', layer: 'edge', call: ['croak', 180] },
  { name: 'Wood Duck',                body: 0x2f6b45, wing: 0x223f2f, beak: 0xd23a3a, cap: 0x184a30, mask: 0xf4f0e6, belly: 0x9c6a3a, size: 1.05, kind: 'ground', layer: 'ground', call: ['squeal', 1100] },
  { name: "Cooper's Hawk",            body: 0xd8cdbf, wing: 0x53606e, beak: 0x2a2a2a, cap: 0x53606e, size: 1.45, kind: 'raptor', layer: 'canopy', call: ['kek', 1500] },
];
const CORE = SPECIES.filter(s => s.core).map(s => s.name);

// merged vertex-colored geometry (the tree/economy pattern): one shared toon
// material for EVERY bird part, so a bird is only as many draws as it has
// independently-animated meshes (body / head / 2 wings).
const BIRD_MAT = curveMat(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gmap, side: THREE.DoubleSide }));
// chibi-chunky scale so the flock READS from the deck (Animal-Crossing birds
// are endearingly oversized; herons build their own bigger geometry).
const BIRD_SCALE = 2.5;
function paintGeo(g, hex) {
  const c = new THREE.Color(hex), p = g.attributes.position, m = p.count, a = new Float32Array(m * 3);
  for (let i = 0; i < m; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g.index ? g.toNonIndexed() : g;
}
const mergeGeos = arr => BufferGeometryUtils.mergeBufferGeometries(arr);

// ---- baked LOD twin (task 095 draw diet) ----------------------------------
// A perched songbird is 4 draws (body / head / 2 wings) purely so the head can
// tilt and the wings can flap — detail that is subpixel past ~30 m. Each pool
// bird carries a 1-draw BAKED twin (the live parts' geometries merged in the
// exact perched pose, shared per species), and updBirdLod keeps only the
// nearest few birds live (lawnlife/048 law: live rigs near, baked twins far).
// The twin is a child of the same group, so every behavior (perch bob, fly
// arcs, relocate, lure, binocular ID — which projects the GROUP) is unchanged.
// Build-time only; consumes no rng.
const _bakedGeoCache = new Map();
function addBakedTwin(spec, g) {
  let geo = _bakedGeoCache.get(spec.name);
  if (!geo) {
    const gs = [];
    for (const child of g.children) {              // body / head / wings — all direct mesh children
      child.updateMatrix();
      gs.push(child.geometry.clone().applyMatrix4(child.matrix));
    }
    geo = mergeGeos(gs);
    _bakedGeoCache.set(spec.name, geo);
  }
  const baked = new THREE.Mesh(geo, BIRD_MAT);
  baked.name = 'bird-baked'; baked.visible = false; g.add(baked);
  const u = g.userData;
  u.baked = baked; u.liveM = g.children.filter(c => c !== baked); u.lodLive = true;
}
function setBirdLod(b, live) {
  const u = b.userData;
  if (!u.baked || u.lodLive === live) return;
  u.lodLive = live;
  for (const m of u.liveM) m.visible = live;
  u.baked.visible = !live;
}

function makeBird(spec) {
  const g = new THREE.Group();
  const hun = spec.hunched;
  // --- merged static body (body + beak + tail + accents) ---
  const parts = [];
  const body = new THREE.SphereGeometry(0.15, 9, 8); body.scale(1, hun ? 0.86 : 0.98, 1.4); parts.push(paintGeo(body, spec.body));
  if (spec.belly) { const bl = new THREE.SphereGeometry(0.12, 8, 7); bl.scale(0.92, 0.7, 1.15); bl.translate(0, -0.03, 0.06); parts.push(paintGeo(bl, spec.belly)); }
  const beak = new THREE.ConeGeometry(0.035, 0.15, 6); beak.rotateX(Math.PI / 2); beak.translate(0, hun ? 0.02 : 0.05, 0.33); parts.push(paintGeo(beak, spec.beak));
  const tail = new THREE.PlaneGeometry(0.12, 0.26); tail.rotateX(-0.5); tail.translate(0, 0.02, -0.24); parts.push(paintGeo(tail, spec.wing));
  if (spec.tailTip) { const tt = new THREE.PlaneGeometry(0.12, 0.055); tt.rotateX(-0.5); tt.translate(0, 0.075, -0.35); parts.push(paintGeo(tt, spec.tailTip)); }
  if (spec.crest) { const c = new THREE.ConeGeometry(0.05, 0.13, 5); c.rotateX(-0.4); c.translate(0, 0.19, 0.13); parts.push(paintGeo(c, spec.crest)); }
  if (spec.mask) { const m = new THREE.SphereGeometry(0.06, 6, 6); m.scale(1.1, 0.7, 0.7); m.translate(0, 0.02, 0.27); parts.push(paintGeo(m, spec.mask)); }
  if (spec.shoulder) for (const s of [-1, 1]) { const p = new THREE.CircleGeometry(0.05, 8); p.rotateY(s * Math.PI / 2); p.translate(s * 0.15, 0.06, -0.02); parts.push(paintGeo(p, spec.shoulder)); }
  if (spec.throat) { const th = new THREE.SphereGeometry(0.055, 7, 6); th.scale(1.0, 0.85, 0.6); th.translate(0, 0.0, 0.22); parts.push(paintGeo(th, spec.throat)); }
  const bodyMesh = new THREE.Mesh(mergeGeos(parts), BIRD_MAT); g.add(bodyMesh);
  // --- head (separate mesh so it can tilt/peck) ---
  const hParts = [];
  const head = new THREE.SphereGeometry(0.11, 8, 7); hParts.push(paintGeo(head, spec.headColor || spec.body));
  if (spec.cap) { const cp = new THREE.SphereGeometry(0.1, 7, 6); cp.scale(1, 0.55, 1); cp.translate(0, 0.045, -0.02); hParts.push(paintGeo(cp, spec.cap)); }
  if (spec.nape) { const np = new THREE.SphereGeometry(0.045, 6, 6); np.translate(0, 0.05, -0.07); hParts.push(paintGeo(np, spec.nape)); }
  const headMesh = new THREE.Mesh(mergeGeos(hParts), BIRD_MAT);
  headMesh.position.set(0, hun ? 0.03 : 0.07, hun ? 0.19 : 0.17); g.add(headMesh);
  // --- wings (separate meshes — flap) ---
  const wings = [];
  for (const s of [-1, 1]) {
    const wg = paintGeo(new THREE.PlaneGeometry(0.28, 0.16), spec.wing);
    const w = new THREE.Mesh(wg, BIRD_MAT); w.rotation.set(-1.3, s * 0.5, 0); w.position.set(s * 0.13, 0.02, -0.02); g.add(w); wings.push(w);
  }
  g.scale.setScalar(spec.size * BIRD_SCALE);
  if (hun) g.rotation.x = 0.25;
  g.userData = birdData(spec, headMesh, wings);
  g.name = 'bird';
  addBakedTwin(spec, g);
  g.visible = false;
  return g;
}

// wading birds (herons): long legs + upright body + a NECK that pivots for the
// slow strike, head/beak riding the neck. Body+legs merge (1 draw), neck (1),
// head (1) = 3 draws; only ~1–2 herons ever visible at once.
function makeHeron(spec) {
  const g = new THREE.Group();
  const legH = spec.tall ? 0.66 : 0.3, neckLen = spec.tall ? 0.5 : 0.24;
  const parts = [];
  for (const s of [-1, 1]) { const leg = new THREE.CylinderGeometry(0.022, 0.022, legH, 5); leg.translate(s * 0.055, legH / 2, 0); parts.push(paintGeo(leg, spec.legc || spec.beak)); }
  const body = new THREE.SphereGeometry(0.16, 9, 8); body.scale(1, 0.92, 1.55); body.translate(0, legH + 0.16, -0.02); parts.push(paintGeo(body, spec.body));
  for (const s of [-1, 1]) { const w = new THREE.PlaneGeometry(0.16, 0.34); w.rotateY(s * 1.35); w.translate(s * 0.14, legH + 0.17, -0.04); parts.push(paintGeo(w, spec.wing)); }
  const bodyMesh = new THREE.Mesh(mergeGeos(parts), BIRD_MAT); g.add(bodyMesh);
  const neckGeo = new THREE.CylinderGeometry(0.035, 0.05, neckLen, 6); neckGeo.translate(0, neckLen / 2, 0);
  const neck = new THREE.Mesh(paintGeo(neckGeo, spec.body), BIRD_MAT); neck.position.set(0, legH + 0.26, 0.05); g.add(neck);
  const hParts = [];
  const head = new THREE.SphereGeometry(0.075, 7, 6); head.translate(0, neckLen, 0.03); hParts.push(paintGeo(head, spec.cap || spec.body));
  const beak = new THREE.ConeGeometry(0.028, spec.tall ? 0.32 : 0.2, 6); beak.rotateX(Math.PI / 2); beak.translate(0, neckLen, spec.tall ? 0.2 : 0.16); hParts.push(paintGeo(beak, spec.beak));
  if (spec.plume) { const pl = new THREE.ConeGeometry(0.02, 0.17, 4); pl.rotateX(1.25); pl.translate(0, neckLen + 0.05, -0.09); hParts.push(paintGeo(pl, spec.plume)); }
  const headMesh = new THREE.Mesh(mergeGeos(hParts), BIRD_MAT); neck.add(headMesh);
  g.scale.setScalar(spec.size);
  g.userData = birdData(spec, headMesh, []); g.userData.neck = neck; g.userData.neckRest = 0;
  g.name = 'bird';                                 // herons stay live always (3 draws, the slow strike is the charm)
  g.visible = false;
  return g;
}

// shared per-bird state block (perch/fly + the special-behavior timers)
function birdData(spec, head, wings) {
  return {
    spec, name: spec.name, kind: spec.kind || 'song', layer: spec.layer || 'shrub', head, wings,
    hopPh: rr(0, 6), tiltPh: rr(0, 6), flapPh: rr(0, 6), baseY: 0,
    state: 'perch', perchT: rr(4, 9), callT: rr(3, 11),
    px: 0, py: 0, pz: 0, sx: 0, sy: 0, sz: 0, tx: 0, ty: 0, tz: 0,
    flyT: 0, flyDur: 1, arcH: 0.4, bow: 0, perpx: 0, perpz: 0,
    behT: rr(4, 10), sub: 0,
  };
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
  // The room reads BUSY: a POOL of songbirds (song/ground/flock/raptor) with
  // ~6 (calm) to ~13 (busy) visible at once, distance-culled to zero draws
  // away from the sanctuary; plus dedicated special-behavior birds — two
  // herons (statue-still + a slow strike), a woodpecker (clings a snag +
  // knocks), a hummingbird (hover-darts), and a waxwing flock-pass. Real
  // birding comes in WAVES, so the relocate rhythm pulses busy↔calm.
  const ROOM = { x0: 108, x1: 180, z0: -415, z1: -361 };     // interior woodland visible from the deck
  const CLEAR = CH.SANCTUARY.clearings;                      // [[x,z,r],…] dappled openings
  // Birds gather at the CLEARINGS — the open, watchable focal points the deck
  // looks onto — not buried in the far canopy. Layer sets the height: ground
  // on the clearing floor, shrub at the edges, sub-canopy just above the shrubs
  // (visible, not lost in the leaf masses), edge = clearing rim (herons).
  // Perch centres, weighted so the flock reads BUSY from the deck: a DECKSIDE
  // zone right in front of the watcher (birds 3–12 m off the west rail — the
  // big, obvious foreground) gets the biggest share, then the near clearing
  // [158,-392], then [140,-390], then far [122,-408]. Herons take a rim.
  const PZONES = [[163, -396, 5], [158, -392, 6], [140, -390, 7], [122, -408, 5]];
  const PW = [0.26, 0.55, 0.8];   // cumulative thresholds → deckside / near / mid / far
  function perchFor(layer) {
    if (layer === 'edge') { const c = CLEAR[(Math.random() * CLEAR.length) | 0], a = rr(0, 6.283), r = c[2] * 0.9; return { x: clamp(c[0] + Math.cos(a) * r, ROOM.x0, ROOM.x1), z: clamp(c[1] + Math.sin(a) * r, ROOM.z0, ROOM.z1), y: 0 }; }
    const r0 = Math.random(), zi = r0 < PW[0] ? 0 : r0 < PW[1] ? 1 : r0 < PW[2] ? 2 : 3, Z = PZONES[zi];
    const a = rr(0, 6.283), r = Math.sqrt(Math.random()) * (Z[2] + 3);
    const x = clamp(Z[0] + Math.cos(a) * r, ROOM.x0, ROOM.x1), z = clamp(Z[1] + Math.sin(a) * r, ROOM.z0, ROOM.z1);
    const y = (layer === 'canopy' || layer === 'subcanopy') ? rr(2.0, 3.0) : layer === 'ground' ? rr(0.28, 0.4) : rr(0.7, 1.9);
    return { x, z, y };
  }

  const poolSpecs = SPECIES.filter(s => !['wade', 'cling', 'hover'].includes(s.kind || 'song'));
  const pool = [];
  for (const s of poolSpecs) { const copies = Math.min(s.flock || 1, 3); for (let i = 0; i < copies; i++) pool.push(makeBird(s)); }
  const nightHeron = makeHeron(SPECIES.find(s => s.name === 'Black-crowned Night Heron'));
  const greatBlue  = makeHeron(SPECIES.find(s => s.name === 'Great Blue Heron'));
  const woodpecker = makeBird(SPECIES.find(s => s.name === 'Downy Woodpecker'));
  const hummer     = makeBird(SPECIES.find(s => s.name === 'Ruby-throated Hummingbird'));
  const dedicated  = [nightHeron, greatBlue, woodpecker, hummer];
  [...pool, ...dedicated].forEach(b => scene.add(b));
  const idTargets = [...pool, ...dedicated].map(g => ({ group: g, species: g.userData.name, isPlover: false }));

  // a weathered dead SNAG — a real bird-sanctuary feature (cavity nesters) and
  // the woodpecker's home; stands in the interior, deck-facing (east) side.
  const SNAG = { x: 150, z: -402 };
  { // trunk + stub vertex-color-merged into one mesh (095: 2 draws → 1, same colors/transforms)
    const trunk = new THREE.CylinderGeometry(0.15, 0.24, 3.0, 7); trunk.translate(0, 1.5, 0);
    const stub = new THREE.CylinderGeometry(0.05, 0.09, 0.7, 5); stub.rotateZ(-0.9); stub.translate(0.24, 2.35, 0);
    const snagMesh = new THREE.Mesh(mergeGeos([paintGeo(trunk, 0x9a938a), paintGeo(stub, 0x8a837a)]), BIRD_MAT);
    snagMesh.position.set(SNAG.x, 0, SNAG.z); scene.add(snagMesh); }
  woodpecker.userData.snag = SNAG;

  // eye-level perches right on the deck RAIL — the "a bird lands beside you"
  // moment that makes the watch pay off up close (derived from SANCTUARY.deck).
  const _D = CH.SANCTUARY.deck, _ry = _D.h + 1.05;
  const RAILP = [ { x: _D.x0 - 0.1, z: _D.z0 + 0.7, y: _ry }, { x: _D.x0 - 0.1, z: _D.z1 - 0.7, y: _ry }, { x: _D.x0 + 1.9, z: _D.z0 - 0.1, y: _ry } ];

  // busy/calm wave + cull state
  let busy = true, waveT = 12, birdRelocT = 1.2, birdsShown = false, flockPassT = 0;
  // ---- bird LOD state (095): nearest ≤6 birds within 30 m stay live 4-draw
  // rigs; every other visible bird shows its 1-draw baked twin. Re-ranked every
  // ~0.35 s AND immediately after any relocate (so a rail bird never renders a
  // baked tick beside the player). Hoisted array — no per-frame alloc.
  const LOD_LIVE_MAX = 6, LOD_LIVE_R2 = 30 * 30;
  const _lodArr = [];
  let birdLodT = 0, lodDirty = true;
  function updBirdLod(pl) {
    _lodArr.length = 0;
    for (const b of pool) if (b.visible) _lodArr.push(b);
    if (woodpecker.visible) _lodArr.push(woodpecker);
    if (hummer.visible) _lodArr.push(hummer);
    for (const b of _lodArr) {
      const dx = b.position.x - pl.x, dz = b.position.z - pl.z;
      b.userData._d2 = dx * dx + dz * dz;
    }
    _lodArr.sort((a, b) => a.userData._d2 - b.userData._d2);
    for (let i = 0; i < _lodArr.length; i++)
      setBirdLod(_lodArr[i], i < LOD_LIVE_MAX && _lodArr[i].userData._d2 < LOD_LIVE_R2);
  }
  function queueFlockPass() { flockPassT = 0.15; }
  // crumb-lure state (task 078): last recruit point + throttles (hoisted — no
  // per-frame alloc; fn() is only called on lureScan ticks, never every frame).
  const LURE_R = 82, LURE_MAX = 4;   // recruit radius (m): the sanctuary flock you're standing beside (gate→far clearings ~80 m); up to 4 birds
  let lureScan = 0, lureRetgT = 0, lureX = 0, lureZ = 0, lureOn = false;

  function placePerch(b, p) {
    const u = b.userData;
    b.position.set(p.x, p.y, p.z); b.rotation.set(0, rr(0, 6.283), 0);
    u.px = p.x; u.py = p.y; u.pz = p.z; u.baseY = p.y;
    u.hopPh = rr(0, 6); u.tiltPh = rr(0, 6); u.flapPh = rr(0, 6);
    u.state = 'perch'; u.perchT = rr(4, 9); u.callT = rr(3, 11);
    if (u.wings.length) u.wings[0].rotation.x = u.wings[1].rotation.x = -1.3;
  }
  function relocateBirds() {
    const target = clamp((busy ? 11 : 5) + ((Math.random() * 3) | 0), 0, pool.length);
    const idx = pool.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp; }
    pool.forEach(b => { if (!b.userData.lured) b.visible = false; });   // lured birds keep pecking; never re-scattered
    const clusterAt = {};                                   // species → last perch, for flocking twos & threes
    for (let k = 0; k < target; k++) {
      const b = pool[idx[k]], u = b.userData; if (u.lured) continue; let p;
      if (u.spec.flock && clusterAt[u.name] && Math.random() < 0.8) { const c = clusterAt[u.name]; p = { x: clamp(c.x + rr(-2.5, 2.5), ROOM.x0, ROOM.x1), z: clamp(c.z + rr(-2.5, 2.5), ROOM.z0, ROOM.z1), y: Math.max(0.28, c.y + rr(-0.4, 0.4)) }; }
      else p = perchFor(u.layer);
      clusterAt[u.name] = p; placePerch(b, p); b.visible = true;
    }
    // seat the first up-to-2 visible birds ON the deck rail (eye level, close);
    // they linger longer before flitting, and face side-on so plumage reads.
    const railN = Math.min(2, target);
    for (let k = 0; k < railN; k++) {
      const b = pool[idx[k]]; if (!b.visible || b.userData.lured) continue;
      placePerch(b, RAILP[k % RAILP.length]);
      b.rotation.y = k % 2 ? 0.7 : -0.7; b.userData.perchT = rr(9, 15);
    }
    birdRelocT = 9 + Math.random() * 7;
    lodDirty = true;                                // re-rank live/baked on the fresh layout
  }
  // launch a perched bird — hop (short/low), circling flight, or a raptor glide
  function startFlight(b) {
    const u = b.userData, k = u.kind;
    const circ = k === 'raptor' ? true : Math.random() < 0.2, long = k === 'raptor';
    const dist = long ? 8 + Math.random() * 4 : circ ? 4.5 + Math.random() * 2.5 : 1.4 + Math.random() * 1.6;
    const ang = Math.random() * 6.283;
    const nx = clamp(u.px + Math.cos(ang) * dist, ROOM.x0, ROOM.x1), nz = clamp(u.pz + Math.sin(ang) * dist, ROOM.z0, ROOM.z1);
    const ny = k === 'ground' ? rr(0.28, 0.4) : k === 'raptor' ? rr(3.2, 5.0) : rr(0.8, 1.8);
    u.sx = u.px; u.sy = u.py; u.sz = u.pz; u.tx = nx; u.ty = ny; u.tz = nz;
    const dx = nx - u.sx, dz = nz - u.sz, dl = Math.hypot(dx, dz) || 1;
    u.perpx = -dz / dl; u.perpz = dx / dl;
    u.bow = circ && !long ? (Math.random() < 0.5 ? -1 : 1) * 2.2 : 0;
    u.arcH = k === 'ground' ? 0.22 : long ? 0.6 : circ ? 1.1 : 0.45;
    u.flyT = 0; u.flyDur = long ? 2.8 + Math.random() : circ ? 2.4 + Math.random() * 0.8 : 0.9 + Math.random() * 0.6;
    u.state = 'fly'; b.rotation.y = Math.atan2(dx, dz);
  }
  // --- crumb lure (task 078): divert a SONG/GROUND bird to peck near the popcorn
  // point (which may be OUTSIDE ROOM — the player's feet), then rotate home. All
  // Math.random; reuses the fly arc + ground-peck idioms; zero new meshes. ---
  const lureGroundY = (x, z) => Math.max(-0.4, (beachH(x, z) ?? 0) + 0.05);   // the grass/sand the player stands on; never far below ground
  function lureRingPoint(u, lx, lz) {                       // a ground point 1.0-2.2 m ring around the lure
    const a = rr(0, 6.283), r = rr(1.0, 2.2);
    u.tx = lx + Math.cos(a) * r; u.tz = lz + Math.sin(a) * r; u.ty = lureGroundY(u.tx, u.tz);
  }
  function startLure(b, lx, lz) {
    const u = b.userData; u.lured = true; u.lureT = rr(8, 12);
    u.sx = b.position.x; u.sy = b.position.y; u.sz = b.position.z;
    lureRingPoint(u, lx, lz);
    const d = Math.hypot(u.tx - u.sx, u.tz - u.sz);
    u.flyT = 0; u.flyDur = clamp(d * 0.09, 0.7, 3.5); u.arcH = clamp(d * 0.06, 0.7, 2.2);   // ~11 m/s swoop in from the trees, not a blur
    u.state = 'lurefly'; b.rotation.y = Math.atan2(u.tx - u.sx, u.tz - u.sz);
  }
  function retargetLure(b, lx, lz) {                        // player moved > 2 m — hop to a fresh ring point
    const u = b.userData;
    u.sx = b.position.x; u.sy = b.position.y; u.sz = b.position.z;
    lureRingPoint(u, lx, lz);
    u.flyT = 0; u.flyDur = 0.5 + Math.random() * 0.4; u.arcH = 0.35;
    u.state = 'lurefly'; b.rotation.y = Math.atan2(u.tx - u.sx, u.tz - u.sz);
  }
  function releaseLure(b) {                                 // back to normal life: fly home to a fresh in-room perch
    const u = b.userData; u.lured = false;
    const p = perchFor(u.layer);
    u.sx = b.position.x; u.sy = b.position.y; u.sz = b.position.z;
    u.tx = p.x; u.ty = p.y; u.tz = p.z;
    u.flyT = 0; u.flyDur = 1.0 + Math.random() * 0.6; u.arcH = 0.7;
    u.state = 'fly'; b.rotation.y = Math.atan2(u.tx - u.sx, u.tz - u.sz);
  }
  function updLureFly(b, dt) {
    const u = b.userData; u.flyT += dt; let uu = u.flyT / u.flyDur; if (uu > 1) uu = 1;
    const s = Math.sin(uu * Math.PI);
    b.position.set(u.sx + (u.tx - u.sx) * uu, u.sy + (u.ty - u.sy) * uu + s * u.arcH, u.sz + (u.tz - u.sz) * uu);
    u.flapPh += dt * 22; const flap = Math.sin(u.flapPh) * 0.7;
    if (u.wings.length) { u.wings[0].rotation.x = -1.3 + flap; u.wings[1].rotation.x = -1.3 + flap; }
    u.head.rotation.z = 0; u.head.rotation.x = 0.1;
    if (uu >= 1) { u.px = u.tx; u.py = u.ty; u.pz = u.tz; if (u.wings.length) u.wings[0].rotation.x = u.wings[1].rotation.x = -1.3; u.state = 'lurepeck'; u.peckT = rr(0.3, 0.9); }
  }
  function updLurePeck(b, dt, t) {
    const u = b.userData;
    b.position.set(u.px, u.py + Math.abs(Math.sin(t * 6 + u.hopPh)) * 0.03, u.pz);   // hop at the crumbs
    u.peckT -= dt;
    if (u.peckT <= 0) { u.peckT = rr(0.5, 1.2); u.head.rotation.x = 0.9; if (Math.random() < 0.3) birdCall(u.spec.call[0], u.spec.call[1]); }
    else u.head.rotation.x += (0.15 - u.head.rotation.x) * Math.min(1, dt * 8);     // ease back up between pecks
    u.head.rotation.z = Math.sin(t * 3 + u.tiltPh) * 0.25;
    u.lureT -= dt; if (u.lureT <= 0) releaseLure(b);
  }
  function updPerchBird(b, dt, t, chorus) {
    if (!b.visible) return; const u = b.userData;
    if (u.state === 'pass') { updPass(b, dt); return; }
    if (u.state === 'lurefly') { updLureFly(b, dt); return; }
    if (u.state === 'lurepeck') { updLurePeck(b, dt, t); return; }
    if (u.state === 'perch') {
      if (chorus) { u.callT -= dt; if (u.callT <= 0) { birdCall(u.spec.call[0], u.spec.call[1]); u.callT = 7 + Math.random() * 11; } }
      const bob = u.kind === 'ground' ? 0.02 : 0.04;
      b.position.set(u.px, u.py + Math.abs(Math.sin(t * 2.2 + u.hopPh)) * bob, u.pz);
      u.head.rotation.z = Math.sin(t * 1.6 + u.tiltPh) * 0.35;
      u.head.rotation.x = Math.sin(t * 3.1 + u.tiltPh) * 0.12;
      u.perchT -= dt; if (u.perchT <= 0) startFlight(b);
    } else {                                                // in flight: arc + wing flap
      u.flyT += dt; let uu = u.flyT / u.flyDur; if (uu > 1) uu = 1;
      const s = Math.sin(uu * Math.PI);
      b.position.set(u.sx + (u.tx - u.sx) * uu + u.perpx * u.bow * s, u.sy + (u.ty - u.sy) * uu + s * u.arcH, u.sz + (u.tz - u.sz) * uu + u.perpz * u.bow * s);
      u.flapPh += dt * 22; const flap = Math.sin(u.flapPh) * 0.7;
      u.wings[0].rotation.x = -1.3 + flap; u.wings[1].rotation.x = -1.3 + flap;
      u.head.rotation.z = 0; u.head.rotation.x = 0.1;
      if (uu >= 1) { u.px = u.tx; u.py = u.ty; u.pz = u.tz; u.baseY = u.ty; u.wings[0].rotation.x = u.wings[1].rotation.x = -1.3; u.state = 'perch'; u.perchT = 4 + Math.random() * 5; }
    }
  }
  // waxwing flock-pass: the visible waxwings sweep across together in one arc
  function updFlockPass(dt) {
    if (flockPassT <= 0) return; flockPassT -= dt; if (flockPassT > 0) return;
    const wax = pool.filter(b => b.visible && b.userData.name === 'Cedar Waxwing' && b.userData.state !== 'pass');
    if (wax.length < 2) return;
    const ang = rr(0, 6.283), cx = Math.cos(ang), cz = Math.sin(ang);
    wax.forEach((b, i) => { const u = b.userData;
      u.state = 'pass'; u.sx = b.position.x; u.sy = b.position.y; u.sz = b.position.z;
      u.tx = clamp(u.sx + cx * rr(14, 20), ROOM.x0, ROOM.x1); u.tz = clamp(u.sz + cz * rr(14, 20), ROOM.z0, ROOM.z1); u.ty = rr(3.5, 5.0);
      u.flyT = -i * 0.12; u.flyDur = 2.6 + Math.random() * 0.6; u.arcH = 1.4;
      b.rotation.y = Math.atan2(cx, cz); });
    birdCall('seee', 7200);
  }
  function updPass(b, dt) {
    const u = b.userData; u.flyT += dt; if (u.flyT < 0) return;
    let uu = u.flyT / u.flyDur; if (uu > 1) uu = 1; const s = Math.sin(uu * Math.PI);
    b.position.set(u.sx + (u.tx - u.sx) * uu, u.sy + (u.ty - u.sy) * uu + s * u.arcH, u.sz + (u.tz - u.sz) * uu);
    u.flapPh += dt * 20; const flap = Math.sin(u.flapPh) * 0.8; u.wings[0].rotation.x = -1.3 + flap; u.wings[1].rotation.x = -1.3 + flap;
    if (uu >= 1) { u.px = u.tx; u.py = u.ty; u.pz = u.tz; u.baseY = u.ty; u.wings[0].rotation.x = u.wings[1].rotation.x = -1.3; u.state = 'perch'; u.perchT = 4 + Math.random() * 5; }
  }
  // heron: statue-still at a clearing edge, then ONE slow neck strike + a call
  function placeHeron(h) {
    const c = CLEAR[(Math.random() * CLEAR.length) | 0], a = rr(0, 6.283);
    const x = c[0] + Math.cos(a) * c[2] * 0.9, z = c[1] + Math.sin(a) * c[2] * 0.9;
    h.position.set(x, 0, z); h.rotation.y = Math.atan2(c[0] - x, c[1] - z);   // face the clearing centre
    const u = h.userData; u.sub = 0; u.st = 0; u.strikeT = rr(4, 9); h.visible = true;
  }
  function updHeron(h, dt, t) {
    const u = h.userData; u.behT -= dt;
    if (!h.visible) { if (u.behT <= 0) { if (Math.random() < 0.6) placeHeron(h); u.behT = 9 + Math.random() * 13; } return; }
    const nk = u.neck;
    if (u.sub === 0) { nk.rotation.x = Math.sin(t * 0.5 + u.tiltPh) * 0.05; h.position.y = Math.sin(t * 0.8) * 0.01;
      u.strikeT -= dt; if (u.strikeT <= 0) { u.sub = 1; u.st = 0; birdCall(u.spec.call[0], u.spec.call[1]); } }
    else if (u.sub === 1) { u.st += dt; const uu = Math.min(1, u.st / 0.26); nk.rotation.x = 1.65 * Math.sin(uu * Math.PI / 2); if (uu >= 1) { u.sub = 2; u.st = 0; } }
    else { u.st += dt; const uu = Math.min(1, u.st / 0.7); nk.rotation.x = 1.65 * (1 - uu); if (uu >= 1) { u.sub = 0; u.strikeT = rr(5, 11); } }
    if (u.behT <= 0) { if (Math.random() < 0.4) { h.visible = false; u.behT = 12 + Math.random() * 16; } else u.behT = 8 + Math.random() * 10; }
  }
  // woodpecker: clings the snag (deck-facing east face), hitches up, drums
  function updWoodpecker(dt) {
    const w = woodpecker, u = w.userData, sn = u.snag; u.behT -= dt;
    if (!w.visible) { if (u.behT <= 0) { if (Math.random() < 0.7) { w.visible = true; u.py = rr(1.2, 2.0); u.knockT = rr(1.2, 3.5); u.jab = 0; } u.behT = 8 + Math.random() * 12; } return; }
    w.position.set(sn.x + 0.26, u.py, sn.z); w.rotation.set(-1.4, 0, 0);
    u.py += dt * 0.12; if (u.py > 2.35) u.py = 1.2;
    u.knockT -= dt; if (u.knockT <= 0) { birdCall('knock', 0); u.knockT = 2.5 + Math.random() * 4; u.jab = 0.3; }
    if (u.jab > 0) { u.jab -= dt; u.head.rotation.x = -Math.abs(Math.sin((0.3 - u.jab) / 0.3 * 9.4)) * 0.5; } else u.head.rotation.x = 0;
    if (u.behT <= 0 && Math.random() < 0.35) { w.visible = false; u.behT = 10 + Math.random() * 14; }
  }
  // hummingbird: hover-darts among the clearing flowers during busy waves
  function updHummer(dt, t) {
    const h = hummer, u = h.userData; u.behT -= dt;
    if (!h.visible) { if (u.behT <= 0) { if (busy && Math.random() < 0.7) { const c = CLEAR[(Math.random() * CLEAR.length) | 0]; u.hx = c[0]; u.hz = c[1]; u.tx = c[0]; u.tz = c[1]; u.ty = 1.3; h.position.set(c[0], 1.3, c[1]); u.dartT = 0; u.humT = 0; h.visible = true; } u.behT = 6 + Math.random() * 8; } return; }
    u.flapPh += dt * 60; const fl = Math.sin(u.flapPh) * 0.9; u.wings[0].rotation.x = -1.0 + fl; u.wings[1].rotation.x = -1.0 + fl;
    u.dartT -= dt; if (u.dartT <= 0) { u.tx = u.hx + rr(-3, 3); u.tz = u.hz + rr(-3, 3); u.ty = rr(1.0, 1.7); u.dartT = 0.8 + Math.random() * 1.4; }
    const sp = Math.min(1, 6 * dt); h.position.x += (u.tx - h.position.x) * sp; h.position.z += (u.tz - h.position.z) * sp;
    h.position.y = u.ty + Math.sin(t * 8) * 0.03;
    const dx = u.tx - h.position.x, dz = u.tz - h.position.z; if (dx * dx + dz * dz > 0.02) h.rotation.y = Math.atan2(dx, dz);
    u.humT -= dt; if (u.humT <= 0) { birdCall('hum', 55); u.humT = 1.4 + Math.random() * 2; }
    if (u.behT <= 0) { if (Math.random() < 0.5) { h.visible = false; u.behT = 10 + Math.random() * 14; } else u.behT = 6 + Math.random() * 6; }
  }
  function updBirds(dt, t, pl) {
    const d2 = (pl.x - 150) ** 2 + (pl.z + 388) ** 2;   // sanctuary centre ≈ (150,−388)
    if (d2 > 135 * 135) { if (birdsShown) { for (const b of pool) b.userData.lured = false; [...pool, ...dedicated].forEach(b => (b.visible = false)); birdsShown = false; lureOn = false; } return; }
    if (!birdsShown) { birdsShown = true; birdRelocT = 0.2; }   // re-seed the flock on approach
    const chorus = d2 < 95 * 95;
    waveT -= dt; if (waveT <= 0) { busy = !busy; waveT = busy ? 16 + Math.random() * 10 : 14 + Math.random() * 10; relocateBirds(); if (busy && Math.random() < 0.6) queueFlockPass(); }
    birdRelocT -= dt; if (birdRelocT <= 0) relocateBirds();
    // --- crumb lure recruit / release (throttled; _crumbLure() only called here) ---
    lureScan -= dt; lureRetgT -= dt;
    if (lureScan <= 0) {
      lureScan = 0.4;
      const lp = _crumbLure ? _crumbLure() : null;
      if (lp && lp.x !== undefined) {
        const moved = Math.hypot(lp.x - lureX, lp.z - lureZ) > 2;
        lureX = lp.x; lureZ = lp.z; lureOn = true;
        let n = 0; for (const b of pool) if (b.userData.lured) n++;
        for (const b of pool) {
          if (n >= LURE_MAX) break;
          const u = b.userData;
          if (u.lured || !b.visible || u.state === 'pass') continue;
          if (u.kind !== 'song' && u.kind !== 'ground') continue;   // never wade/raptor/hover/cling/flock
          const dx = b.position.x - lureX, dz = b.position.z - lureZ;
          if (dx * dx + dz * dz > LURE_R * LURE_R) continue;
          startLure(b, lureX, lureZ); n++;
        }
        if (moved && lureRetgT <= 0) { lureRetgT = 2; for (const b of pool) if (b.userData.lured) retargetLure(b, lureX, lureZ); }
      } else if (lureOn) {                                    // lure went null — resume normal life cleanly
        lureOn = false;
        for (const b of pool) if (b.userData.lured) releaseLure(b);
      }
    }
    for (const b of pool) updPerchBird(b, dt, t, chorus);
    updFlockPass(dt);
    updHeron(nightHeron, dt, t); updHeron(greatBlue, dt, t);
    updWoodpecker(dt); updHummer(dt, t);
    birdLodT -= dt;
    if (birdLodT <= 0 || lodDirty) { birdLodT = 0.35; lodDirty = false; updBirdLod(pl); }
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
    x: 108, z: -343, ry: -0.27, staticLod: true,   // 095: 1-draw baked twin past 60 m (the sanctuary-deck frustum)
    palette: { suit: 0xff7a1a, pants: 0x35414c, skin: 0xe4b489, hair: 0x241812, shoe: 0x222 },
    lines: ["that's Monty and Rose's cousin", "give 'em space now, wouldya", "they flew in from Montrose"],
  });
  let scoldT = 0;

  // ------------------------ binocular machine ------------------------- //
  const binoc = { active: false, ePrev: false, wobT: 0, idTgt: null, idHold: 0 };
  const binocInters = [];
  // 126 (issue 039's twin): the binoculars are the OTHER look-through beat that
  // eased the fov while main.js eased it back — take the camera so ours is the
  // only writer. lockLook:false: Z/C orbit IS the aim here (unlike the mounted
  // heron scope, which cannot be turned).
  const BINOC_CAM = 'nature-binoc';
  function enterBinoc() {
    if (binoc.active) return;
    binoc.active = true; binoc.ePrev = true; binoc.idTgt = null; binoc.idHold = 0;
    wrap.style.display = 'block';
    takeCamera(BINOC_CAM, { lockLook: false });
    for (const it of binocInters) it.enabled = false;
  }
  function exitBinoc() {
    binoc.active = false; wrap.style.display = 'none'; binoc.idTgt = null; binoc.idHold = 0;
    releaseCamera(BINOC_CAM);
    for (const it of binocInters) it.enabled = true;
  }
  function identify(tgt) {
    if (tgt.isPlover) {
      if (!state.birdsSeen.has('Piping Plover')) { state.birdsSeen.add('Piping Plover'); dingChime(); toast('PIPING PLOVER!', 'the rarest guys');
        wallet.pay({ key: 'plover', first: 8, repeat: 2, reason: 'birdwatch: the rarest guy', firstReason: 'birdwatch: a piping plover!', label: 'birdwatch' }); }
      return;
    }
    if (state.birdsSeen.has(tgt.species)) return;
    state.birdsSeen.add(tgt.species); dingChime(); toast(tgt.species, 'checked off the list');
    wallet.pay({ key: 'bingo.species', first: 5, repeat: 2, reason: 'birdwatch: new friend', label: 'birdwatch' });
    if (CORE.every(n => state.birdsSeen.has(n))) { toast('BIRD BINGO!', 'Bill Jarvis would be proud');
      // repeat:0 — a COLLECTION completes once and can never un-complete, so the
      // bonus is a once-ever gift. (A later non-core bird re-runs this branch;
      // without the 0 it would re-pay the card forever.)
      wallet.pay({ key: 'bingo.full', first: 10, repeat: 0, reason: 'birdwatch: BINGO', label: 'birdwatch' }); }
  }
  function updBinoc(dt, t, pl) {
    const eNow = keys.has('e'), ePress = eNow && !binoc.ePrev; binoc.ePrev = eNow;
    if (!binoc.active) return;   // 126: lowered -> main.js owns the fov and eases it home. Easing toward
                                 // baseFov() here too was the second writer (issue 039's class).
    // fov ease to the 24° zoom while raised — ours alone while takeCamera()
    // holds, so it actually REACHES it instead of settling at a dt-dependent
    // midpoint. Scaled off baseFov() (096): 24 on desktop, proportionally
    // wider on a portrait phone, where the base is wider to begin with.
    const Z = 24 * baseFov() / 50;
    if (Math.abs(camera.fov - Z) > 0.01) {
      camera.fov = lerp(camera.fov, Z, 1 - Math.exp(-9 * dt));
      if (Math.abs(camera.fov - Z) < 0.01) camera.fov = Z;
      camera.updateProjectionMatrix();
    }
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
        wallet.pay({ key: 'fish', first: 5, repeat: 2, reason: 'fishing: reeled one in', label: 'fishing' });
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
    if (holed) { flagPing(); confetti(h.pin[0], h.pin[1]); toast('IN!', `hole ${h.i + 1} in ${strokes} stroke${strokes > 1 ? 's' : ''}`);
      wallet.pay({ key: 'marovitz.hole', first: 5, repeat: 2, reason: 'chip-and-putt: sank it', label: 'golf' }); }
    else toast('gimme', `hole ${h.i + 1} — picked up at ${strokes}`);
    g.roundSet.add(h.i);
    if (g.roundSet.size >= 3) {
      const total = g.strokes.reduce((a, b) => a + (b || 0), 0);
      if (g.bestRound == null || total < g.bestRound) g.bestRound = total;
      state.golfRounds = (state.golfRounds || 0) + 1; g.roundSet.clear();
      wallet.pay({ key: 'marovitz.round', first: 8, repeat: 3, reason: 'chip-and-putt: round done', label: 'golf' });   // no toast here — the register pop IS the round's beat
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
    const BONUS = SPECIES.filter(s => !s.core).map(s => s.name);
    let rows = CORE.map(n => `<div class="jrow"><span>${state.birdsSeen.has(n) ? '✓' : '·'} ${n}</span><b></b></div>`).join('');
    rows += `<div class="jrow"><span>Bingo</span><b>${CORE.filter(n => state.birdsSeen.has(n)).length} / 6</b></div>`;
    if (state.birdsSeen.has('Piping Plover')) rows += `<div class="jrow"><span>★ Piping Plover</span><b>secret</b></div>`;
    const seenBonus = BONUS.filter(n => state.birdsSeen.has(n));
    if (seenBonus.length) rows += `<div class="jrow"><span>Bonus sightings</span><b>${seenBonus.length} / ${BONUS.length}</b></div>`;
    for (const n of seenBonus) rows += `<div class="jrow"><span>+ ${n}</span><b></b></div>`;
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
    updBirds(dt, t, pl);
    updPlovers(dt, t, pl);
    updFishing(dt, t, pl);
    updSmelt(dt, t);
    updGolf(dt);
    updSong(dt, pl);
  });
});

export { SPECIES, makeBird, birdCall };   // task 071: the Magic Hedge pack reuses the bird machinery (species palettes, chibi geometry, synthesized voices) — no parallel bird system
