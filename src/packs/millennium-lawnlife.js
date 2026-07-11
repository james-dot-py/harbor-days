// =====================================================================
//  MILLENNIUM-LAWNLIFE — the Pritzker Great Lawn crowd, as REAL PEOPLE
//  (task 048 item 0d). The owner playtest flagged the old BAKED "reclining
//  figures" (pritzker.js §6) as unrecognizable jellybean lumps. This pack
//  replaces them with the lawnlife REGISTER: posed full chibis (picnics,
//  sunbathers, loungers) that BUMP and "ope" up close, folded to ~1 draw
//  each via bakeChibiRig, plus a few makeNPC standees whose 1-draw baked
//  LOD twins carry the distance view. Budget-aware — see the tally below.
//
//    ~4 PICNICS      — a flat blanket quad + 2 seated eaters each
//                      (createChibi -> poseSeated -> registerBumpable ->
//                      bakeChibiRig), a little cooler box per blanket.
//    ~4 LOUNGERS     — single sunbathers/sitters on small towel-mats,
//                      recline OR seated pose, each baked + bumpable.
//    3 STANDEES      — makeNPC({wander:0, staticLod:true}): a couple + a
//                      lone watcher facing the stage (north). Live rig up
//                      close, 1-draw baked twin past 60 m.
//
//  Only-my-file rules (AUTOPILOT doctrine): this module + ONE import line in
//  packs/index.js. ALL setup inside onWorldReady; imports anything, edits
//  nothing shared. DETERMINISM: a LOCAL mulberry32 seed only (never the
//  shared world rng — one moved lakefront towel is a hard-constraint
//  regression); no rng at module top-level. Positions are FIXED; the local
//  seed adds only cosmetic facing/seat jitter. No audio, no per-frame work
//  (the crowd is static — no registerUpdate). The seated/lounging baked
//  chibis distance-cull via registerBumpable; the standees via makeNPC;
//  the instanced blanket/mat/cooler batches (3 draws) sit at the park.
//
//  GEOMETRY (src/data/millennium.js): walkable lawn x 118–168 z 788–846 (W).
//  Trellis posts stand along x≈120 and x≈166 — every figure is kept in
//  x 124–163 (>=2.5 m clear of both post lines) and clear of the BP corner
//  (x>166 & z>810). The mp-great-lawn hero cams look NORTH from ~z810–838,
//  so the crowd clusters x 126–161, z 804–832 where those framings see it.
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, createChibi, registerBumpable, bakeChibiRig, makeNPC } from '../framework.js';
import { scene, toon, curveMat, mulberry32 } from '../core.js';

const CITIZEN = 0.74;                              // canonical chibi scale (matches the mayor / makeNPC)

// ---- palettes (hardcoded -> deterministic; varied skin/hair/clothing) --
const PAL = [
  { suit: 0xd4694f, pants: 0x3c4a63, skin: 0xe8b48c, hair: 0x3a2a1e },
  { suit: 0x4f8c6b, pants: 0x2f3540, skin: 0x8a5a3c, hair: 0x1d160f, hairStyle: 'bun' },
  { suit: 0xe0b24a, pants: 0x6b4a2f, skin: 0xf0c9a0, hair: 0x55402a },
  { suit: 0x6d7fbf, pants: 0x33384a, skin: 0x6e4632, hair: 0x24160e, hairStyle: 'afro' },
  { suit: 0xc85c8e, pants: 0x40354a, skin: 0xdca07a, hair: 0x2a1c12, hairStyle: 'tall' },
  { suit: 0x3f9bb0, pants: 0x2c3b45, skin: 0xa8724a, hair: 0x140f0a },
  { suit: 0xe38b5a, pants: 0x4a3320, skin: 0xf2caa6, hair: 0x6a4a2c, hairStyle: 'bun' },
  { suit: 0x8a6bbf, pants: 0x33304a, skin: 0x7a5038, hair: 0x1a120c },
  { suit: 0xcf5142, pants: 0x2f3a4a, skin: 0xecb890, hair: 0x2c1d12 },
  { suit: 0x5aa06a, pants: 0x38402c, skin: 0x955f3d, hair: 0x120d08, hairStyle: 'afro' },
  { suit: 0xd9a23c, pants: 0x3a3550, skin: 0xf0c49c, hair: 0x4a3520, hairStyle: 'tall' },
  { suit: 0x4d84c4, pants: 0x2b3340, skin: 0x87573a, hair: 0x161009 },
];

// ---- midwestern "ope" bump-line pools -------------------------------
const LINES_PICNIC = ['ope — mind the blanket!', "there's room, scooch in", "pop's in the cooler, help yourself", 'we packed enough for the whole lawn'];
const LINES_LOUNGE = ['ope — catchin some sun', 'perfect day for the lawn, eh', "you'll hear the whole soundcheck from here", 'ope, didnt see ya there, bud'];
const LINES_STAND  = ['ope — best spot on the lawn', "they're tunin up — listen", 'free concert, dontcha know', 'shh, here come the strings'];

onWorldReady((player) => {
  const rnd = mulberry32(0x4d4c4c46);              // 'MLLF' — LOCAL seed only, never the shared world rng
  const jit = (a) => (rnd() * 2 - 1) * a;          // small deterministic +/- jitter

  // build-time scratch (onWorldReady is one-shot — allocation here is fine)
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(),
        S = new THREE.Vector3(1, 1, 1), E = new THREE.Euler(), C = new THREE.Color(), qI = new THREE.Quaternion();
  const flatX = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));  // plane -> lay flat

  // instanced-prop spot buckets (one InstancedMesh each at the end)
  const blanketSpots = [];   // {x,z,ry,col}
  const matSpots = [];       // {x,z,ry,col}
  const coolerSpots = [];    // {x,z}

  let _pi = 0;
  const nextPal = () => PAL[_pi++ % PAL.length];

  // ---- shared chibi helpers ------------------------------------------
  function makeChibi(x, z, ry, pal, scale = CITIZEN) {
    const { group, parts } = createChibi(Object.assign({ scale }, pal));
    group.position.set(x, 0, z); group.rotation.y = ry; scene.add(group);
    return { group, parts };
  }
  // sit cross-legged on the ground (copied verbatim from packs/lawnlife.js)
  function poseSeated(group, parts, y) {
    parts.legL.rotation.x = -1.42; parts.legR.rotation.x = -1.36;
    parts.armL.rotation.x = -0.4;  parts.armR.rotation.x = -0.5;
    parts.armL.rotation.z = 0.15;  parts.armR.rotation.z = -0.15;
    parts.body.rotation.x = -0.12;
    group.position.y = y - 0.33;
  }
  // recline/sunbathe: legs out front, arms propped back, torso leaned back, face up
  function poseLounge(group, parts, y) {
    parts.legL.rotation.x = -1.05; parts.legR.rotation.x = -0.95;
    parts.armL.rotation.x = 0.55;  parts.armR.rotation.x = 0.55;
    parts.armL.rotation.z = 0.4;   parts.armR.rotation.z = -0.4;
    parts.body.rotation.x = 0.42;
    parts.head.rotation.x = 0.12;
    group.position.y = y - 0.28;
  }

  // ================================================================= //
  //  1) PICNICS — fixed centres; each a blanket + 2 seated eaters + cooler
  // ================================================================= //
  //  seat offsets from the blanket centre; first n used, each faces centre
  const SEAT = [[-1.0, -0.5], [0.9, 0.6], [-0.75, 0.95], [0.8, -0.9]];
  function buildPicnic(cx, cz, ry, col, n, lines) {
    blanketSpots.push({ x: cx, z: cz, ry, col });
    for (let i = 0; i < n; i++) {
      const sx = cx + SEAT[i][0] + jit(0.12), sz = cz + SEAT[i][1] + jit(0.12);
      const sry = Math.atan2(cx - sx, cz - sz) + jit(0.18);   // face the blanket centre (+ small jitter)
      const { group, parts } = makeChibi(sx, sz, sry, nextPal());
      poseSeated(group, parts, 0);                            // lawn y = 0 flat everywhere
      registerBumpable(group, parts, lines);
      bakeChibiRig(group, parts);                             // static seated eater — baked -> 1 draw
    }
    coolerSpots.push({ x: cx + 1.25, z: cz - 0.9 });
  }
  const PICNICS = [
    { x: 130, z: 804, ry: -0.4, col: 0xd8b356, n: 2 },
    { x: 152, z: 808, ry: 0.5,  col: 0xcf6f5a, n: 2 },
    { x: 138, z: 824, ry: 0.9,  col: 0x6ea38c, n: 2 },
    { x: 157, z: 826, ry: -0.6, col: 0x4d78ad, n: 2 },
  ];
  for (const p of PICNICS) buildPicnic(p.x, p.z, p.ry, p.col, p.n, LINES_PICNIC);

  // ================================================================= //
  //  2) LOUNGERS / SUNBATHERS — single posed chibi on a towel-mat
  // ================================================================= //
  const LOUNGERS = [
    { x: 126, z: 814, ry: 1.2,  mat: 0xe0b84a, pose: 'lounge' },
    { x: 145, z: 816, ry: 2.6,  mat: 0x4d78ad, pose: 'seated' },
    { x: 134, z: 832, ry: 0.3,  mat: 0xcf6f5a, pose: 'lounge' },
    { x: 161, z: 818, ry: -1.9, mat: 0x7d5aa0, pose: 'seated' },
  ];
  for (const L of LOUNGERS) {
    matSpots.push({ x: L.x, z: L.z, ry: L.ry, col: L.mat });
    const { group, parts } = makeChibi(L.x, L.z, L.ry + jit(0.12), nextPal());
    (L.pose === 'lounge' ? poseLounge : poseSeated)(group, parts, 0);
    registerBumpable(group, parts, LINES_LOUNGE);
    bakeChibiRig(group, parts);                               // static sunbather — baked -> 1 draw
  }

  // ================================================================= //
  //  3) STANDEES — makeNPC couple + a lone watcher, facing the stage (N)
  // ================================================================= //
  //  ry = PI => face -z (north), toward the pavilion stage across the lawn.
  //  staticLod:true + wander:0 => live rig near, 1-draw baked twin past 60 m.
  const STANDEES = [
    { x: 147.0, z: 830, name: 'lawn watcher',  pal: { suit: 0x2f6b8f, pants: 0x2a2e36, skin: 0xe8b48c, hair: 0x2a2018, face: true } },
    { x: 149.4, z: 830, name: 'lawn watcher',  pal: { suit: 0xc85c8e, pants: 0x34303f, skin: 0x8a5a3c, hair: 0x1a120c, face: true, hairStyle: 'bun' } },
    { x: 130.0, z: 822, name: 'concert fan',   pal: { suit: 0x5aa06a, pants: 0x38402c, skin: 0xa8724a, hair: 0x140f0a, face: true } },
  ];
  for (const N of STANDEES) {
    makeNPC({ x: N.x, z: N.z, ry: Math.PI, wander: 0, staticLod: true, name: N.name, palette: N.pal, lines: LINES_STAND });
  }

  // ================================================================= //
  //  INSTANCED PROP BATCHES (one draw call per repeated type)
  // ================================================================= //
  function buildInst(spots, geo, mat, place) {
    if (!spots.length) return null;
    const inst = new THREE.InstancedMesh(geo, mat, spots.length);
    inst.frustumCulled = false;                              // instanced bounds default to origin — never auto-cull
    spots.forEach((sp, i) => place(sp, i, inst));
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    scene.add(inst);
    return inst;
  }
  // blankets — flat warm-check quads laid on the lawn (per-instance color)
  buildInst(blanketSpots, new THREE.PlaneGeometry(2.6, 2.0),
    curveMat(new THREE.MeshToonMaterial({ side: THREE.DoubleSide })),
    (b, i, inst) => { E.set(0, b.ry, 0); Q.setFromEuler(E); Q.multiply(flatX);
      M.compose(V.set(b.x, 0.02, b.z), Q, S.set(1, 1, 1)); inst.setMatrixAt(i, M); inst.setColorAt(i, C.setHex(b.col)); });
  // towel-mats under the loungers (per-instance color)
  buildInst(matSpots, new THREE.PlaneGeometry(0.72, 1.9),
    curveMat(new THREE.MeshToonMaterial({ side: THREE.DoubleSide })),
    (b, i, inst) => { E.set(0, b.ry, 0); Q.setFromEuler(E); Q.multiply(flatX);
      M.compose(V.set(b.x, 0.03, b.z), Q, S.set(1, 1, 1)); inst.setMatrixAt(i, M); inst.setColorAt(i, C.setHex(b.col)); });
  // cooler boxes (one shared blue toon material)
  buildInst(coolerSpots, new THREE.BoxGeometry(0.52, 0.4, 0.36), toon(0x3a6ea5),
    (c, i, inst) => { M.compose(V.set(c.x, 0.2, c.z), qI, S.set(1, 1, 1)); inst.setMatrixAt(i, M); });
});
