// =====================================================================
//  PACK: lolla — LOLLAPALOOZA, LIVE at Butler Field (task 061).
//  Executor A builds the STATIC set (stage shell, tents, potties, trucks,
//  arches, poster, rail, booth) in src/millennium/butler.js. THIS pack owns
//  everything ALIVE on the grounds:
//    * THE CROWD — ~550 instanced people swaying in a traveling wave, ON the
//      beat (9 InstancedMesh buckets: 6 shirt colors × body + 3 skin × head);
//    * THE FRONT RAIL — 10 baked posed chibis that "ope" + 2 live wanderers;
//    * THE BAND on the Petrillo deck — drummer / guitarist / frontman rigs +
//      a drum kit, guitar, mic stand, all state-machine animated to the clock;
//    * THE MUSIC — a 100%-synth festival set (driving synth-rock ⇄ four-on-
//      the-floor) on its own bus, ducking the lo-fi score by player proximity;
//    * THE DANCE CIRCLE — 4 always-dancing NPCs + a joinable mayor move-cycle;
//    * THE CROWD-SURFING INFLATABLE ALLIGATOR drifting a slow lap on the heads.
//
//  Only-my-file rules (AUTOPILOT doctrine): this module + ONE import line in
//  packs/index.js + the LOLLA FM station in progression.js. ALL setup inside
//  onWorldReady, gated on OPEN_GRANT.butler; imports anything, edits nothing
//  else shared. Freestanding visuals → millenniumRoot (cell-culled for free;
//  added AFTER buildMillennium's merge so they stay live). Own mulberry32 seed
//  (19910808 — the first Lollapalooza) — never the shared world rng. All audio
//  synthesized + getAudioCtx().actx-guarded (null until start). Zero per-frame
//  allocation (every temp is hoisted at module scope).
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, registerUpdate, addInteraction, makeNPC, registerBumpable,
         toast, journalSection, state, screenFx, getAudioCtx, createChibi, bakeChibiRig, wallet } from '../framework.js';
import { toon, mulberry32, clamp, lerp, lerpAngle } from '../core.js';
import { CROWD_SHIRT, CROWD_SKIN, crowdGeos, makeCrowd, stampCrowd } from '../crowd.js';
import { mayor, mparts } from '../character.js';
import { activeCell } from '../cells.js';
import { millenniumRoot } from '../millennium/index.js';
import { OPEN_GRANT, BUTLER_M } from '../data/millennium.js';

// ---- determinism: LOCAL rng only, consumed only inside onWorldReady ----
const R = mulberry32(19910808);                  // first Lolla — never the shared world rng

// ---- additive hook (task 081): the drummer rig, so favors-downtown's
// "lucky stick" favor can raise his arm on a caught throw. Filled in buildBand;
// zero behavior change here (an exported handle, nothing reads it in this pack).
export const bandHooks = {};

// ---- shared crowd tech (buckets/geos/re-stamp) lives in ../crowd.js ----
const STAGE_MOUTH = { x: 224, z: 1006 };         // the crowd faces this
const DANCE = BUTLER_M.dance;                     // {x:272,z:971.5,r:3}
const DECK_Y = BUTLER_M.petrillo.deckY;           // 1.6 (band floats until A's stage lands)

// ---- festival palettes (hardcoded → deterministic) --------------------
const PAL_FEST = [
  { suit: 0xe4572e, pants: 0x2f3540, skin: 0xe8b48c, hair: 0x2a1c12 },
  { suit: 0x3fa7d6, pants: 0x2b3340, skin: 0x8a5a3c, hair: 0x1d160f, hairStyle: 'bun' },
  { suit: 0xf2c14e, pants: 0x40354a, skin: 0xf0c49c, hair: 0x4a3520, hairStyle: 'tall' },
  { suit: 0x7d5aa0, pants: 0x2c2733, skin: 0x6e4632, hair: 0x120d08, hairStyle: 'afro' },
  { suit: 0xe86aa8, pants: 0x33384a, skin: 0xdca07a, hair: 0x241610 },
  { suit: 0x4fb477, pants: 0x38402c, skin: 0xa8724a, hair: 0x140f0a },
  { suit: 0xef6f4a, pants: 0x2b2f36, skin: 0xf2caa6, hair: 0x6a4a2c, hairStyle: 'bun' },
  { suit: 0x5a7de8, pants: 0x2b3340, skin: 0x955f3d, hair: 0x161009, hairStyle: 'afro' },
];
const RAIL_LINES = [
  'ope! sorry — front rail is LIFE', 'been here since NOON', 'malörp face is my malörp face',
  'they only play bangers', 'the drummer WINKED at me', 'sorry ope — this is my spot',
  'deep dish mode goes SO hard live', 'I lost my group at the tamale truck',
  'hydrate or diedrate, ope', 'the alligator is my king',
];

// =====================================================================
//  module-scope live state (assigned in onWorldReady)
// =====================================================================
const CROWD = BUTLER_M.crowd;                     // {x0:225,x1:300,z0:940,z1:1005}
const people = [];                                // {x,z,yaw,sc,phase,amp,shirt,skin,bi,hi}
let crowd = null;                                 // makeCrowd() bundle: {people,bodyMesh,headMesh,...}
const SWAY_A = 0.09;                               // bounce amplitude (m)
let musicBeats = 0, curProx = 0, prevProx = 0;

const band = { drummer: null, guitarist: null, frontman: null };
const dancers = [];
const dance = { joined: false, moveIdx: -1, moveT: 0, cheerT: 0 };
let danceInter = null;
const gator = { grp: null, s: 0, hy: 0, lap: 0, counted: false, pauseT: 0 };

// =====================================================================
//  CROWD — placement + geometry (geos/buckets/re-stamp via ../crowd.js)
// =====================================================================
// keep-clear + density
const AISLES = [
  { ax: 236, az: 940, bx: 248, bz: 999, w: 1.4 },   // two organic aisle gaps
  { ax: 286, az: 944, bx: 279, bz: 998, w: 1.3 },
  { ax: 262, az: 942, bx: 266, bz: 966, w: 1.2 },   // short lane to the booth
];
function distSeg(px, pz, s) {
  const dx = s.bx - s.ax, dz = s.bz - s.az, L2 = dx * dx + dz * dz;
  let tt = ((px - s.ax) * dx + (pz - s.az) * dz) / L2; tt = clamp(tt, 0, 1);
  return Math.hypot(px - (s.ax + dx * tt), pz - (s.az + dz * tt));
}
function d2(x, z, cx, cz) { const dx = x - cx, dz = z - cz; return dx * dx + dz * dz; }
function blocked(x, z) {
  if (x > 257 && x < 267 && z > 967 && z < 977) return true;                 // booth + 1 m margin
  if (d2(x, z, DANCE.x, DANCE.z) < 4.5 * 4.5) return true;                    // dance circle r 4.5
  for (const d of BUTLER_M.delays) if (d2(x, z, d[0], d[1]) < 2 * 2) return true;   // delay towers r 2
  for (const t of BUTLER_M.totems) if (d2(x, z, t[0], t[1]) < 1.6 * 1.6) return true; // totems r 1.6
  if (x < 263 && z > 999.4 && z < 1001.2) return true;                       // 1.2 m rail lane (real chibis stand there)
  for (const a of AISLES) if (distSeg(x, z, a) < a.w) return true;
  return false;
}
function density(x, z) {
  const zf = clamp((z - CROWD.z0) / (CROWD.z1 - CROWD.z0), 0, 1);            // 0 back .. 1 stage
  const front = 0.4 + 0.6 * zf * zf;                                          // heavier toward the stage
  const xf = clamp(1 - Math.abs(x - 252) / 45, 0, 1);                        // center-x ~240-265
  return front * (0.5 + 0.5 * xf);
}

function buildCrowd() {
  let attempts = 0;
  while (people.length < 560 && attempts < 9000) {
    attempts++;
    const x = CROWD.x0 + R() * (CROWD.x1 - CROWD.x0);
    const z = CROWD.z0 + R() * (CROWD.z1 - CROWD.z0);
    if (blocked(x, z)) continue;
    if (R() > density(x, z)) continue;
    const zf = clamp((z - CROWD.z0) / (CROWD.z1 - CROWD.z0), 0, 1);
    people.push({
      x, z,
      yaw: Math.atan2(STAGE_MOUTH.x - x, STAGE_MOUTH.z - z) + (R() * 2 - 1) * 0.35,
      sc: 0.88 + R() * 0.24,
      phase: (x * 0.7 + z) * 0.35,                                           // traveling waves
      amp: clamp(0.5 + 0.5 * zf + (R() * 2 - 1) * 0.12, 0.5, 1),             // rail rows bounce harder
      shirt: (R() * 6) | 0, skin: (R() * 3) | 0, bi: 0, hi: 0,
    });
  }
  crowd = makeCrowd(millenniumRoot, people, 'standing', 'lolla-crowd');  // 6 body + 3 head buckets
  updateCrowd(0.5);   // initial stamp so the field is correct even before the first update tick
}

// per-frame matrix re-stamp — one compose/person (bArg/lArg set before the call
// so the module-scope poseFn closes over them with zero per-frame allocation)
let _bArg = 0, _lArg = 0;
function crowdPose(p, E, V, S) {
  const y = p.amp * SWAY_A * Math.max(0, Math.sin(_bArg + p.phase));          // bounce ON the beat
  const lean = 0.07 * Math.sin(_lArg + p.phase);
  E.set(0, p.yaw, lean, 'YXZ');
  V.set(p.x, y, p.z);
  S.set(p.sc, p.sc, p.sc);
}
function updateCrowd(rate) {
  _bArg = 2 * Math.PI * musicBeats * rate;
  _lArg = 2 * Math.PI * musicBeats * rate * 0.5;
  stampCrowd(crowd, crowdPose);
}

// =====================================================================
//  REAL PEOPLE AT THE RAIL (baked chibis) + 2 live wanderers
// =====================================================================
function poseRail(p, k) {
  if (k === 0) { p.armL.rotation.x = -2.7; p.armR.rotation.x = -2.6; p.armL.rotation.z = 0.25; p.armR.rotation.z = -0.25; }
  else if (k === 1) { p.armR.rotation.x = -2.4; p.armR.rotation.z = -0.3; p.armL.rotation.x = -0.35; p.body.rotation.x = -0.12; }
  else { p.armL.rotation.x = -2.5; p.armR.rotation.x = -1.9; p.armL.rotation.z = 0.35; p.body.rotation.x = -0.06; }
}
function buildRail() {
  const N = 10;
  for (let i = 0; i < N; i++) {
    const x = 222 + ((i + 0.5) / N) * (260 - 222);
    const z = 1000.9 + ((i * 0.37) % 1) * 0.7;                                // 1000.9 .. 1001.6
    const { group, parts } = createChibi(Object.assign({ scale: 0.74 + (i % 3) * 0.02 }, PAL_FEST[i % PAL_FEST.length]));
    group.position.set(x, 0, z);
    group.rotation.y = Math.atan2(STAGE_MOUTH.x - x, STAGE_MOUTH.z - z);       // face the stage
    millenniumRoot.add(group);
    poseRail(parts, i % 3);
    registerBumpable(group, parts, RAIL_LINES);   // BEFORE bake (PITFALLS order law)
    bakeChibiRig(group, parts);                    // → 1 draw each, still opes on bump
  }
  // 2 live wanderers out on the field (framework-culled past 145 m → invisible on the lakefront)
  makeNPC({ x: 270, z: 985, ry: Math.atan2(STAGE_MOUTH.x - 270, STAGE_MOUTH.z - 985),
    wander: 2.5, name: 'festivalgoer', palette: PAL_FEST[1], lines: RAIL_LINES });
  makeNPC({ x: 240, z: 960, ry: Math.atan2(STAGE_MOUTH.x - 240, STAGE_MOUTH.z - 960),
    wander: 2.5, name: 'festivalgoer', palette: PAL_FEST[4], lines: RAIL_LINES });
}

// =====================================================================
//  THE BAND on the Petrillo deck (all live rigs — never baked)
// =====================================================================
function makeDrumKit() {
  const g = new THREE.Group();
  const dark = toon(0x2a2d33), red = toon(0xb03a2e), metal = toon(0xc9c4b4);
  const kick = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16), red);   // kick on its side, facing +z (crowd)
  kick.rotation.x = Math.PI / 2; kick.position.set(0, 0.4, 0.35); g.add(kick);
  for (const sx of [-0.25, 0.25]) {                                                   // two toms
    const tom = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.2, 12), dark);
    tom.position.set(sx, 0.78, 0.15); g.add(tom);
  }
  const sn = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 14), metal); sn.position.set(-0.35, 0.6, -0.1); g.add(sn);
  const hstand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), dark); hstand.position.set(0.55, 0.45, -0.1); g.add(hstand);
  for (const hy of [0.86, 0.92]) { const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 16), metal); hd.position.set(0.55, hy, -0.1); g.add(hd); }
  const cstand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.05, 6), dark); cstand.position.set(-0.6, 0.52, -0.15); g.add(cstand);
  const cym = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.015, 18), metal); cym.position.set(-0.6, 1.05, -0.15); cym.rotation.x = 0.15; g.add(cym);
  return g;
}
function makeGuitar() {                                        // fixed prop parented to the GROUP (held-prop law)
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.09), toon(0xc0392b)); g.add(body);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.62, 0.05), toon(0x3a2a1a)); neck.position.set(0.02, 0.5, 0); g.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.04), toon(0x2a2018)); head.position.set(0.02, 0.85, 0); g.add(head);
  g.rotation.z = -0.55; g.position.set(0.1, 1.02, 0.34);       // waist/hand height, angled across the body
  return g;
}
function makeMicStand(x, z) {
  const g = new THREE.Group(); g.position.set(x, DECK_Y, z);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.3, 6), toon(0x2a2d33)); post.position.y = 0.65; g.add(post);
  const mic = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), toon(0x14141a)); mic.position.y = 1.34; g.add(mic);
  millenniumRoot.add(g);
}
const NE = 2.36;   // yaw facing NE — toward the crowd
function buildBand() {
  const kit = makeDrumKit(); kit.position.set(222.2, DECK_Y, 1013.2); kit.rotation.y = NE; millenniumRoot.add(kit);
  const drummer = createChibi({ suit: 0x2b2f6e, pants: 0x24262c, skin: 0x8a5a3c, hair: 0x1a120c, scale: 0.9 });
  drummer.group.position.set(221.7, DECK_Y, 1014.0); drummer.group.rotation.y = NE; millenniumRoot.add(drummer.group);
  band.drummer = drummer;
  bandHooks.drummer = drummer;                     // task 081 additive hook (the lucky-stick favor)

  const guitarist = createChibi({ suit: 0xb03a2e, pants: 0x2b2f36, skin: 0xe8b48c, hair: 0x241610, scale: 0.9 });
  guitarist.group.position.set(226.5, DECK_Y, 1009.0); guitarist.group.rotation.y = NE; guitarist.group.add(makeGuitar());
  millenniumRoot.add(guitarist.group); band.guitarist = guitarist;

  const frontman = createChibi({ suit: 0x1c1c22, pants: 0x141418, skin: 0xf0c49c, hair: 0x2a2018, scale: 0.9, hairStyle: 'tall' });
  frontman.group.position.set(223.5, DECK_Y, 1006.5); frontman.group.rotation.y = NE; millenniumRoot.add(frontman.group);
  band.frontman = frontman;
  makeMicStand(223.5, 1006.5);
}

const FM_C = [223.5, 1006.5], FM_L = [219.5, 1007], FM_R = [227.5, 1006.5];
function frontmanPos(bar) {   // deterministic 30-bar walk-the-stage schedule
  const b = ((bar % 30) + 30) % 30;
  if (b < 8) return [FM_C[0], FM_C[1], 'center'];
  if (b < 10) { const u = (b - 8) / 2; return [lerp(FM_C[0], FM_L[0], u), lerp(FM_C[1], FM_L[1], u), 'walk']; }
  if (b < 18) return [FM_L[0], FM_L[1], 'left'];
  if (b < 20) { const u = (b - 18) / 2; return [lerp(FM_L[0], FM_R[0], u), lerp(FM_L[1], FM_R[1], u), 'walk']; }
  if (b < 28) return [FM_R[0], FM_R[1], 'right'];
  const u = (b - 28) / 2; return [lerp(FM_R[0], FM_C[0], u), lerp(FM_R[1], FM_C[1], u), 'walk'];
}
function updateBand(barClock) {
  const b = musicBeats, e8 = b * 2;                       // beats + 8th-note phase
  // --- DRUMMER: on-beat body bob, alternating stick strikes, head nod ---
  const d = band.drummer.parts;
  d.body.position.y = 1.18 + 0.05 * Math.sin(b * Math.PI * 2);
  d.armR.rotation.x = -1.4 + 0.5 * Math.sin(e8 * Math.PI * 2);
  d.armL.rotation.x = -1.4 + 0.5 * Math.sin((e8 + 0.5) * Math.PI * 2);
  d.armR.rotation.z = -0.25; d.armL.rotation.z = 0.25;
  d.head.rotation.x = 0.12 * Math.sin(b * Math.PI * 2);
  // --- GUITARIST: bar-rate sway, strum on beats, fretting hand up ---
  const g = band.guitarist;
  g.group.rotation.z = 0.12 * Math.sin(barClock * Math.PI);
  g.parts.armR.rotation.x = -1.05 + 0.35 * Math.sin(b * Math.PI * 2);
  g.parts.armL.rotation.x = -1.3; g.parts.armL.rotation.z = -0.3;
  g.parts.head.rotation.x = 0.06 * Math.sin(b * Math.PI);
  // --- FRONTMAN: works the crowd on the music clock ---
  const f = band.frontman, pos = frontmanPos(barClock);
  f.group.position.x = pos[0]; f.group.position.z = pos[1];
  f.parts.head.rotation.x = 0.1 * Math.sin(b * Math.PI * 2);
  f.parts.body.rotation.x = 0.06 * Math.sin(b * Math.PI * 2);
  if (pos[2] === 'walk') { const sw = Math.sin(b * Math.PI * 2 * 1.3); f.parts.legL.rotation.x = sw * 0.5; f.parts.legR.rotation.x = -sw * 0.5; }
  else { f.parts.legL.rotation.x = 0; f.parts.legR.rotation.x = 0; }
  if (pos[2] === 'left' || pos[2] === 'right') {           // point at the crowd
    f.parts.armR.rotation.x = -2.2; f.parts.armR.rotation.z = pos[2] === 'left' ? -0.4 : 0.4;
  } else if (pos[2] === 'center') {                        // armR up on chorus bars, else pump
    const chorus = (Math.floor(barClock) % 4) < 2;
    f.parts.armR.rotation.x = chorus ? -2.4 : (-0.6 + 0.3 * Math.sin(b * Math.PI * 2));
    f.parts.armR.rotation.z = 0;
  } else { f.parts.armR.rotation.x = -0.6; f.parts.armR.rotation.z = 0; }
  f.parts.armL.rotation.x = -0.4 + 0.2 * Math.sin(b * Math.PI * 2 + 1);
}

// =====================================================================
//  THE DANCE CIRCLE — 4 always-dancing NPCs + joinable mayor move-cycle
// =====================================================================
function buildDancers() {
  for (let i = 0; i < 4; i++) {
    const ang = i * Math.PI / 2 + 0.4;
    const dx = DANCE.x + Math.cos(ang) * 2.7, dz = DANCE.z + Math.sin(ang) * 2.7;
    const { group, parts } = createChibi(Object.assign({ scale: 0.74 }, PAL_FEST[(i + 2) % PAL_FEST.length]));
    group.position.set(dx, 0, dz);
    const base = Math.atan2(DANCE.x - dx, DANCE.z - dz);    // face the circle centre
    group.rotation.y = base; millenniumRoot.add(group);
    dancers.push({ group, parts, phase: i * 1.6, base });
  }
}
function animateDancer(dc, cheering) {
  const b = musicBeats + dc.phase;
  dc.group.position.y = Math.max(0, Math.sin(b * Math.PI * 2)) * (cheering ? 0.13 : 0.07);   // quarter-turn hops
  const arm = cheering ? -2.5 : (-1.4 + 0.6 * Math.sin(b * Math.PI * 2));                     // alternating arm raises
  dc.parts.armL.rotation.x = arm; dc.parts.armR.rotation.x = arm - 0.3 * Math.sin(b * Math.PI);
  dc.parts.armL.rotation.z = 0.3; dc.parts.armR.rotation.z = -0.3;
  dc.group.rotation.z = 0.1 * Math.sin(b * Math.PI);                                          // hip lean
  dc.group.rotation.y = dc.base + 0.25 * Math.sin(b * Math.PI * 0.5);
  const sw = Math.sin(b * Math.PI * 2);
  dc.parts.legL.rotation.x = sw * 0.2; dc.parts.legR.rotation.x = -sw * 0.2;
}
function driveMayorMove(idx) {   // runs AFTER main.js poses the mayor
  const b = musicBeats;
  if (idx === 0) {               // arms-up wave
    mparts.armL.rotation.x = -2.5 + 0.3 * Math.sin(b * Math.PI * 2);
    mparts.armR.rotation.x = -2.5 - 0.3 * Math.sin(b * Math.PI * 2);
    mparts.armL.rotation.z = 0.25; mparts.armR.rotation.z = -0.25;
    mayor.rotation.z = 0.05 * Math.sin(b * Math.PI);
  } else if (idx === 1) {        // point-up disco
    mparts.armR.rotation.x = -2.6; mparts.armR.rotation.z = -0.35;
    mparts.armL.rotation.x = -0.2; mparts.armL.rotation.z = 0.3;
    mayor.rotation.z = 0.12 * Math.sin(b * Math.PI * 2);
    mparts.body.rotation.x = 0.08;
  } else {                       // the shopping cart
    const s = Math.sin(b * Math.PI * 2);
    mparts.armL.rotation.x = -1.4 + s * 0.5; mparts.armR.rotation.x = -1.4 - s * 0.5;
    mparts.armL.rotation.z = 0.1; mparts.armR.rotation.z = -0.1;
    mayor.rotation.z = 0;
  }
}
function driveMayorIdle() {      // between moves while joined — gentle in-the-circle sway
  const b = musicBeats;
  mparts.armL.rotation.x = -0.5 + 0.15 * Math.sin(b * Math.PI * 2);
  mparts.armR.rotation.x = -0.5 - 0.15 * Math.sin(b * Math.PI * 2);
  mparts.armL.rotation.z = 0.1; mparts.armR.rotation.z = -0.1;
  mayor.rotation.z = 0.04 * Math.sin(b * Math.PI);
}
function joinDance(pl) {
  dance.joined = true; dance.moveIdx = -1;
  const ang = 0.8;                                          // nudge to a free arc point (not a far teleport)
  pl.x = DANCE.x + Math.cos(ang) * 1.6; pl.z = DANCE.z + Math.sin(ang) * 1.6; pl.vx = 0; pl.vz = 0;
  danceInter.setLabel('bust a move'); danceInter.x = pl.x; danceInter.z = pl.z;
  if (!state.lollaJoinedOnce) { state.lollaJoinedOnce = true; toast('DANCE CIRCLE', 'no wristband needed'); }
  wallet.pay({ key: 'lolla.dance', first: 6, repeat: 2, reason: 'Lalla: the dance circle', label: 'Lalla', cd: 10 });
}
function bustMove() {
  dance.moveIdx = (dance.moveIdx + 1) % 3; dance.moveT = 2.4; dance.cheerT = 2.4;
  state.lollaMoves = (state.lollaMoves || 0) + 1;
  screenFx.flash('rgba(255,210,150,0.5)', 420);
  danceHit();
}
function leaveDance(pl) {
  dance.joined = false;
  mparts.armL.rotation.z = -0.25; mparts.armR.rotation.z = 0.25;   // restore the rest splay (badminton leave)
  mparts.armL.rotation.x = 0; mparts.armR.rotation.x = 0;
  mparts.body.rotation.x = 0; mayor.rotation.z = 0;
  danceInter.x = DANCE.x; danceInter.z = DANCE.z; danceInter.setLabel('join the dance circle');
}
function updateDance(dt, pl) {
  const cheering = dance.cheerT > 0;
  for (let i = 0; i < dancers.length; i++) animateDancer(dancers[i], cheering);
  if (dance.cheerT > 0) dance.cheerT -= dt;
  if (dance.joined) {
    danceInter.x = pl.x; danceInter.z = pl.z;                       // interaction follows the player (E always fires)
    if (Math.hypot(pl.x - DANCE.x, pl.z - DANCE.z) > 4.5) { leaveDance(pl); return; }
    if (dance.moveT > 0) { dance.moveT -= dt; driveMayorMove(dance.moveIdx); }
    else driveMayorIdle();
  }
}

// =====================================================================
//  THE TOTEMS — finding one in the sea IS the beat (task 079)
// =====================================================================
// No toast: the register pop is the whole celebration (pay() owns it). 5 Hz
// scan, per-totem armed flag re-armed past 5 m (framework registerBumpable's
// pattern), scalars only — zero per-frame allocation.
const TOTEM_R2 = 2.5 * 2.5, TOTEM_REARM2 = 5 * 5;
const totemArmed = BUTLER_M.totems.map(() => true);
let totemScan = 0;
function updateTotems(dt, pl) {
  totemScan -= dt;
  if (totemScan > 0) return;
  totemScan = 0.2;
  for (let i = 0; i < BUTLER_M.totems.length; i++) {
    const tm = BUTLER_M.totems[i], dd = d2(pl.x, pl.z, tm[0], tm[1]);
    if (totemArmed[i]) {
      if (dd < TOTEM_R2) {
        totemArmed[i] = false;
        wallet.pay({ key: 'lolla.totem.' + tm[2], first: 5, repeat: 2,
          reason: 'Lalla: the ' + tm[2] + ' totem', label: 'Lalla' });
      }
    } else if (dd > TOTEM_REARM2) totemArmed[i] = true;
  }
}

// =====================================================================
//  THE CROWD-SURFING INFLATABLE ALLIGATOR
// =====================================================================
const GATOR_LOOP = [[240, 996], [258, 999], [276, 994], [285, 980], [280, 967], [262, 961], [246, 964], [236, 978], [235, 990]];
const gseg = []; let gper = 0, railDist = 0, GATOR_SPEED = 1;
let _gx = 0, _gz = 0, _gh = 0;
function buildGatorPath() {
  for (let i = 0; i < GATOR_LOOP.length; i++) {
    const a = GATOR_LOOP[i], b = GATOR_LOOP[(i + 1) % GATOR_LOOP.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    gseg.push({ ax: a[0], az: a[1], dx, dz, len, cum: gper }); gper += len;
  }
  railDist = gseg[1].cum;                       // the [258,999] node — nearest the rail
  GATOR_SPEED = gper / 45;                       // ~45 s / lap
}
function gatorPos(s) {
  s = ((s % gper) + gper) % gper;
  let i = gseg.length - 1;
  for (let k = 0; k < gseg.length; k++) if (s < gseg[k].cum + gseg[k].len) { i = k; break; }
  const seg = gseg[i], t = (s - seg.cum) / seg.len;
  _gx = seg.ax + seg.dx * t; _gz = seg.az + seg.dz * t; _gh = Math.atan2(seg.dx, seg.dz);
}
function buildGator() {
  buildGatorPath();
  const green = [
    new THREE.SphereGeometry(0.9, 10, 8).scale(1.0, 0.7, 1.7),                // body
    new THREE.BoxGeometry(0.7, 0.45, 1.0).translate(0, -0.05, 1.5),           // snout base
    new THREE.BoxGeometry(0.55, 0.3, 0.7).translate(0, -0.12, 2.15),          // snout tip
    new THREE.ConeGeometry(0.5, 1.6, 8).rotateX(-Math.PI / 2).translate(0, 0, -1.9), // tail
  ];
  for (const sx of [-1, 1]) for (const sz of [0.7, -0.7]) green.push(new THREE.BoxGeometry(0.28, 0.4, 0.28).translate(sx * 0.85, -0.5, sz)); // stubby legs
  const white = [
    new THREE.SphereGeometry(0.85, 10, 8).scale(0.85, 0.4, 1.5).translate(0, -0.35, 0.1),  // belly
    new THREE.SphereGeometry(0.18, 8, 7).translate(-0.35, 0.45, 1.0),          // eye bumps
    new THREE.SphereGeometry(0.18, 8, 7).translate(0.35, 0.45, 1.0),
  ];
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(green, false), toon(0x4bbf3a)));
  grp.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(white, false), toon(0xf2f0e6)));
  for (const sx of [-0.35, 0.35]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 6), toon(0x14140f)); eye.position.set(sx, 0.55, 1.08); grp.add(eye); }
  grp.scale.setScalar(0.5);                      // ~2.6 m long
  grp.name = 'lolla-gator'; millenniumRoot.add(grp);
  gator.grp = grp; gatorPos(0); grp.position.set(_gx, 1.5, _gz); gator.hy = _gh;
}
function updateGator(dt, t, pl) {
  if (gator.pauseT > 0) gator.pauseT -= dt;      // pauses at the rail every lap
  else {
    const prev = gator.s;
    gator.s += GATOR_SPEED * dt;
    if (prev < railDist && gator.s >= railDist) gator.pauseT = 3;
    if (gator.s >= gper) { gator.s -= gper; gator.lap++; gator.counted = false; }
  }
  gatorPos(gator.s);
  gator.grp.position.set(_gx, 1.5 + 0.15 * Math.sin(t * 2.2), _gz);    // drifts ON TOP of the crowd
  gator.hy = lerpAngle(gator.hy, _gh, 1 - Math.exp(-3 * dt));
  gator.grp.rotation.y = gator.hy;
  gator.grp.rotation.z = 0.08 * Math.sin(t * 1.3);                     // roll wobble
  if (!gator.counted && Math.hypot(pl.x - _gx, pl.z - _gz) < 6) { gator.counted = true; state.lollaGator = (state.lollaGator || 0) + 1; }
}

// =====================================================================
//  THE MUSIC — 100% synthesized festival set on its OWN bus
// =====================================================================
const SONG_BARS = 24;
const music = {
  bus: null, lp: null, bedGain: null, started: false, timer: null,
  phase: 'A', song: 'A', nextSong: 'B', bpm: 132, stepDur: 60 / 132 / 4,
  step: 0, bar: 0, nextT: 0, roarEnd: 0, gain: 0, ducked: false,
};

function ensureAudio(A) {
  if (music.started || !A.actx) return;
  music.started = true;
  const c = A.actx;
  music.bus = c.createGain(); music.bus.gain.value = 0.0001;
  music.lp = c.createBiquadFilter(); music.lp.type = 'lowpass'; music.lp.frequency.value = 3400;
  music.bus.connect(music.lp); music.lp.connect(c.destination);
  // festival-crowd murmur bed on sfxBus (prox-scaled by hand)
  const src = c.createBufferSource(); src.buffer = A.noiseBuf; src.loop = true;
  const bf = c.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = 300;
  music.bedGain = c.createGain(); music.bedGain.gain.value = 0.0001;
  src.connect(bf); bf.connect(music.bedGain); music.bedGain.connect(A.sfxBus); src.start();
  // start the lookahead scheduler
  music.bpm = 132; music.stepDur = 60 / 132 / 4; music.nextT = c.currentTime + 0.1; music.step = 0;
  music.timer = setInterval(() => scheduler(A), 180);
}
function scheduler(A) {
  const c = A.actx; if (!c) return;
  const now = c.currentTime;
  if (music.phase === 'roar') {
    if (now >= music.roarEnd) {                    // downbeat into the next number
      music.phase = music.nextSong; music.song = music.nextSong;
      music.nextSong = music.song === 'A' ? 'B' : 'A';
      music.bpm = music.song === 'A' ? 132 : 126;
      music.stepDur = 60 / music.bpm / 4; music.step = 0;
      music.nextT = Math.max(now + 0.03, music.roarEnd);
    }
    return;
  }
  while (music.nextT < now + 0.6) {
    if (music.song === 'A') songAStep(A, music.step, music.nextT);
    else songBStep(A, music.step, music.nextT);
    music.step++; music.nextT += music.stepDur; music.bar = (music.step >> 4) % SONG_BARS;
    if (music.step >= SONG_BARS * 16) { startRoar(A, music.nextT); break; }
  }
}
function startRoar(A, tAt) {
  if (curProx > 0.35) state.lollaSets = (state.lollaSets || 0) + 1;   // a full set heard nearby
  music.phase = 'roar'; music.roarEnd = tAt + 3.0;
  crowdRoar(A, tAt, 3.0); noiseRiser(A, tAt + 1.3, 1.6);
}
function updateAudioGain(A, prox, dt) {
  if (!music.bus) return;
  const k = 1 - Math.exp(-3 * dt);
  music.bus.gain.value += (0.22 * Math.pow(prox, 1.4) - music.bus.gain.value) * k;   // positional festival PA
  music.gain = music.bus.gain.value;
  if (music.bedGain) music.bedGain.gain.value += (0.10 * prox - music.bedGain.gain.value) * k;
  const mb = A.musicBus;                          // duck the global lo-fi score (converging lerps — never fight a restore)
  if (mb) {
    if (prox > 0.02) { music.ducked = true; mb.gain.value += (0.16 * (1 - 0.85 * prox) - mb.gain.value) * k; }
    else if (music.ducked) { mb.gain.value += (0.16 - mb.gain.value) * k; if (Math.abs(mb.gain.value - 0.16) < 0.003) { mb.gain.value = 0.16; music.ducked = false; } }
  }
}

// ---- SONG A — driving synth-rock, 132 BPM, i–VI–VII–i in E minor -------
const A_ROOTS = [40, 43, 45, 40];                 // E2 G2 A2 E2
const LEAD_A = { 0: [76, 2], 4: [79, 2], 6: [81, 2], 8: [79, 4], 16: [74, 2], 20: [76, 2], 24: [71, 4] };  // E-min pentatonic, 2-bar phrase
function songAStep(A, step, t) {
  const s = step % (SONG_BARS * 16), barIdx = (s >> 4) % 4, inBar = s & 15;
  if (inBar % 2 === 0) sawBass(A, A_ROOTS[barIdx], t, music.stepDur * 1.8);          // driving 8th bass
  if (inBar === 0 || inBar === 8) kickA(A, t);                                        // kick 1+3
  if (inBar === 4 || inBar === 12) snareA(A, t);                                      // snare 2+4
  if (inBar % 2 === 0) hatA(A, t, 0.03);                                              // 8th hats
  if (inBar === 6 || inBar === 14) powerStab(A, A_ROOTS[barIdx] + 12, t);             // power-chord stabs on the 'and'
  if ((s >> 4) >= 8) { const n = LEAD_A[s % 32]; if (n) squareLead(A, n[0], t, music.stepDur * n[1]); }  // lead enters after bar 8
}
// ---- SONG B — four-on-the-floor, 126 BPM, Am–F–C–G ---------------------
const B_ROOTS = [45, 41, 48, 43];                 // A2 F2 C3 G2
function songBStep(A, step, t) {
  const s = step % (SONG_BARS * 16), barIdx = (s >> 4) % 4, inBar = s & 15;
  if (inBar % 4 === 0) kickA(A, t);                                                   // kick EVERY beat
  if (inBar === 4 || inBar === 12) clapA(A, t);                                       // clap 2+4
  if (inBar % 4 === 2) hatA(A, t, 0.05);                                              // offbeat open hats
  if (inBar % 2 === 0) subB(A, B_ROOTS[barIdx] - 12, t, music.stepDur * 1.6);         // sub-bass 8ths
  if (inBar % 4 === 2) chordStabB(A, B_ROOTS[barIdx], t);                             // bright offbeat stabs
  if (inBar === 0) padB(A, B_ROOTS[barIdx], t, music.stepDur * 16);                   // filter-swept pad
  if (inBar === 0 && (s >> 4) % 8 === 0) heyShout(A, t);                              // 'HEY!' on the drop bars
}

// ---- synth voices (all on music.bus → inherit the positional PA gain) --
function kickA(A, t) { const c = A.actx, o = c.createOscillator(), g = c.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  o.connect(g); g.connect(music.bus); o.start(t); o.stop(t + 0.2); }
function snareA(A, t) { const c = A.actx, s = c.createBufferSource(); s.buffer = A.noiseBuf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.9;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.3, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  s.connect(f); f.connect(g); g.connect(music.bus); s.start(t); s.stop(t + 0.16); }
function clapA(A, t) { const c = A.actx;
  for (const dl of [0, 0.012, 0.026]) { const s = c.createBufferSource(); s.buffer = A.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 1.1;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t + dl); g.gain.linearRampToValueAtTime(0.22, t + dl + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dl + 0.1);
    s.connect(f); f.connect(g); g.connect(music.bus); s.start(t + dl); s.stop(t + dl + 0.11); } }
function hatA(A, t, peak) { const c = A.actx, s = c.createBufferSource(); s.buffer = A.noiseBuf;
  const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8000;
  const g = c.createGain(); g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  s.connect(f); f.connect(g); g.connect(music.bus); s.start(t); s.stop(t + 0.05); }
function sawBass(A, m, t, dur) { const c = A.actx, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.value = A.mf(m); f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 1;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f); f.connect(g); g.connect(music.bus); o.start(t); o.stop(t + dur + 0.05); }
function subB(A, m, t, dur) { const c = A.actx, o = c.createOscillator(), g = c.createGain();
  o.type = 'sine'; o.frequency.value = A.mf(m); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(music.bus); o.start(t); o.stop(t + dur + 0.05); }
function powerStab(A, m, t) { const c = A.actx, g = c.createGain(), f = c.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 2200; f.Q.value = 1;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  g.connect(f); f.connect(music.bus);
  for (const [mm, det] of [[m, -6], [m, 6], [m + 7, -6], [m + 7, 6]]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = A.mf(mm); o.detune.value = det; o.connect(g); o.start(t); o.stop(t + 0.24); } }
function chordStabB(A, root, t) { const c = A.actx, g = c.createGain(), f = c.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 3000; f.Q.value = 2;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  g.connect(f); f.connect(music.bus);
  for (const iv of [0, 4, 7]) for (const ty of ['triangle', 'square']) { const o = c.createOscillator(); o.type = ty; o.frequency.value = A.mf(root + 12 + iv); o.detune.value = ty === 'square' ? 5 : 0; o.connect(g); o.start(t); o.stop(t + 0.2); } }
function padB(A, root, t, dur) { const c = A.actx, g = c.createGain(), f = c.createBiquadFilter();
  f.type = 'bandpass'; f.Q.value = 3;
  f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(1400, t + dur * 0.5); f.frequency.linearRampToValueAtTime(400, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.08, t + dur * 0.2); g.gain.setValueAtTime(0.08, t + dur * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(f); f.connect(music.bus);
  for (const iv of [0, 7, 12]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = A.mf(root + iv); o.detune.value = iv ? 7 : -7; o.connect(g); o.start(t); o.stop(t + dur + 0.1); } }
function squareLead(A, m, t, dur) { const c = A.actx, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
  o.type = 'square'; o.frequency.value = A.mf(m); f.type = 'lowpass'; f.frequency.value = 2600;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.14, t + 0.02); g.gain.setValueAtTime(0.14, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f); f.connect(g); g.connect(music.bus); o.start(t); o.stop(t + dur + 0.05); }
function crowdRoar(A, t, dur) { const c = A.actx, s = c.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 480; f.Q.value = 0.4;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.4, t + dur * 0.65); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(music.bus); s.start(t); s.stop(t + dur + 0.1); }
function noiseRiser(A, t, dur) { const c = A.actx, s = c.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true;
  const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(6000, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22, t + dur * 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
  s.connect(f); f.connect(g); g.connect(music.bus); s.start(t); s.stop(t + dur + 0.2); }
function heyShout(A, t) { const c = A.actx, s = c.createBufferSource(); s.buffer = A.noiseBuf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(1200, t + 0.18); f.Q.value = 0.8;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.4, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  s.connect(f); f.connect(g); g.connect(music.bus); s.start(t); s.stop(t + 0.45); }
function danceHit() {   // sChime-ish move confirm on sfxBus
  const A = getAudioCtx(); if (!A.actx) return; const c = A.actx, t = c.currentTime;
  [880, 1320].forEach((fr, i) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = fr;
    const t0 = t + i * 0.06; g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.14, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
    o.connect(g); g.connect(A.sfxBus); o.start(t0); o.stop(t0 + 0.45); });
}

// =====================================================================
//  wire it up
// =====================================================================
onWorldReady((player) => {
  if (!OPEN_GRANT.butler) return;   // no Butler Field → no festival

  state.lollaMoves = state.lollaMoves || 0;
  state.lollaSets = state.lollaSets || 0;
  state.lollaGator = state.lollaGator || 0;

  buildCrowd();
  buildRail();
  buildBand();
  buildDancers();
  buildGator();

  danceInter = addInteraction({
    x: DANCE.x, z: DANCE.z, r: 3.2, priority: 6, label: 'join the dance circle',
    onUse: (pl) => { if (!dance.joined) joinDance(pl); bustMove(); },
  });

  journalSection('lolla', 'Lallapawlooza', () => `
    <div class="jrow"><span>Moves busted</span><b>${state.lollaMoves || 0}</b></div>
    <div class="jrow"><span>Sets heard</span><b>${state.lollaSets || 0}</b></div>
    <div class="jrow"><span>Gator sightings</span><b>${state.lollaGator || 0}</b></div>`);

  registerUpdate((dt, t, pl) => {
    if (dt < 0) dt = 0;
    const A = getAudioCtx();
    ensureAudio(A);
    const inCell = activeCell() === 'millennium';
    const d = Math.hypot(pl.x - 226, pl.z - 1004);            // distance to the stage mouth
    const prox = inCell ? clamp(1 - (d - 30) / 130, 0, 1) : 0;
    curProx = prox;
    updateAudioGain(A, prox, dt);                            // audio slews even off-cell (fade out + restore lo-fi)
    if (!inCell) { if (dance.joined) leaveDance(pl); prevProx = prox; return; }

    musicBeats += dt * (music.bpm / 60);
    const rate = music.song === 'B' ? 1 : 0.5;               // ω LOCKED to the music: bounce on four-on-floor, half-sway on rock
    const barClock = musicBeats / 4;
    if (prox > 0.5 && prevProx <= 0.5) toast('LALLAPAWLOOZA', 'butler field · grounds open — wander in');
    prevProx = prox;

    if (d < 280) updateCrowd(rate);                          // the swaying instanced sea
    updateBand(barClock);
    updateDance(dt, pl);
    updateGator(dt, t, pl);
    updateTotems(dt, pl);
  });

  // debug handle for headless verification (main session reads this)
  window.__lolla = {
    get song() { return music.phase === 'roar' ? 'roar' : music.song; },
    get bpm() { return music.bpm; },
    get bar() { return music.bar; },
    get gain() { return +music.gain.toFixed(4); },
    get prox() { return +curProx.toFixed(3); },
    get crowd() { return people.length; },
    get moves() { return state.lollaMoves || 0; },
    get sets() { return state.lollaSets || 0; },
    get gator() { return state.lollaGator || 0; },
  };
});
