// =====================================================================
//  ART INSTITUTE pack (task 060) — the grand steps come alive. A lunch
//  PAIR seated on the treads eating sandwiches (the steps read as
//  sittable), SIT SPOTS so the mayor can join them, LION-LUCK nods at the
//  two bronze guardians, the SANDWICH BOARD on the portico, and the
//  ROUTE 66 begin-sign at the curb.
//
//  Content-pack doctrine (AUTOPILOT): this module + ONE import line in
//  packs/index.js. ALL setup inside onWorldReady; imports anything, edits
//  nothing shared. DETERMINISM: a LOCAL mulberry32 seed only (never the
//  shared world rng); no rng at module top-level; the seat/facing jitter
//  is cosmetic. No audio. Gated on OPEN_GRANT.artInstitute — with the flag
//  off this pack is a no-op (byte-identical pre-060 world).
//
//  GEOMETRY (src/data/millennium.js ART_M): the grand steps are a walk
//  ramp x53.2-57.2 x z963.5-978, y=(x-53.2)/4*1.9 (tread rises W->E). The
//  lions sit on the urn-bed flanks at (54.4,962.4) N + (54.4,979.4) S.
//  The lion/board/Route-66 MESHES are built by the main session; this pack
//  only wires the interactions (pure distance — z>900 is unique to the
//  millennium cell, so no cross-cell contamination).
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, createChibi, registerBumpable, bakeChibiRig,
         addSitSpot, addInteraction, toast, addAtWorld } from '../framework.js';
import { scene, toon, mulberry32 } from '../core.js';
import { OPEN_GRANT } from '../data/millennium.js';

const CITIZEN = 0.74;   // canonical chibi scale (matches the mayor / makeNPC — poseSeated's -0.33 is calibrated here)

// sit cross-legged on a surface (copied verbatim from packs/millennium-
// lawnlife.js / packs/lawnlife.js): y = the SURFACE the figure rests on; the
// -0.33 seats the folded rig on it. Keep the rig at CITIZEN scale.
function poseSeated(group, parts, y) {
  parts.legL.rotation.x = -1.42; parts.legR.rotation.x = -1.36;
  parts.armL.rotation.x = -0.4;  parts.armR.rotation.x = -0.5;
  parts.armL.rotation.z = 0.15;  parts.armR.rotation.z = -0.15;
  parts.body.rotation.x = -0.12;
  group.position.y = y - 0.33;
}

onWorldReady(() => {
  if (!OPEN_GRANT.artInstitute) return;               // flag off -> no-op (staged world)
  const rnd = mulberry32(0x41495043);                 // 'AIPC' — LOCAL seed only, never the shared world rng
  const jit = (a) => (rnd() * 2 - 1) * a;             // small deterministic +/- jitter

  // ================================================================= //
  //  1) THE LUNCH PAIR — two chibis seated ON the grand steps, eating
  //     sandwiches, facing WEST over Michigan Ave (ry -PI/2). Both on the
  //     same tread line x55.9 -> y=(55.9-53.2)/4*1.9 ~ 1.28.
  // ================================================================= //
  const TREAD_Y = 1.28;
  const LINES = [
    'ope — best lunch spot in the loop',
    "the lions? they're good luck",
    'free day tomorrow, dontcha know',
    "sun's out, sandwich out",
  ];
  // distinct WARM palettes; face:true on ONE eater keeps a live eyes mesh we
  // squint (a happy lunch face — setFace is a no-op without face:true).
  const EATERS = [
    { x: 55.9, z: 975.0, squint: true,
      pal: { suit: 0xd4694f, pants: 0x3c4a63, skin: 0xe8b48c, hair: 0x3a2a1e, face: true } },
    { x: 55.9, z: 976.6,
      pal: { suit: 0xe0b24a, pants: 0x6b4a2f, skin: 0x8a5a3c, hair: 0x1d160f, hairStyle: 'bun' } },
  ];
  // a SANDWICH = bread box + a proud filling stripe. Attached to the GROUP
  // (never handR — PITFALLS held-prop law) at lap/hand height; both toon
  // (non-textured), so bakeChibiRig folds them into the 1-draw baked rig.
  const breadMat = toon(0xdfc08a), fillMat = toon(0xa8543a);
  function makeSandwich() {
    const s = new THREE.Group();
    s.add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.14), breadMat));    // bread
    s.add(new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.035, 0.15), fillMat));   // filling stripe (pokes out the sides)
    return s;
  }
  for (const e of EATERS) {
    const { group, parts } = createChibi(Object.assign({ scale: CITIZEN }, e.pal));
    group.position.set(e.x, 0, e.z);
    group.rotation.y = -Math.PI / 2 + jit(0.12);      // face WEST over Michigan Ave
    addAtWorld(group, e.x, e.z);   // 120 (issue 036): hand the rig to the millennium cell root — a bare scene.add left these step-eaters visible on the lakefront's open lake once Lincoln Park grew within 145 m of them
    poseSeated(group, parts, TREAD_Y);                // sit ON the tread (y ~ 1.28)
    if (e.squint) parts.eyeL.scale.set(1.1, 0.42, 1); // happy lunch squint (eyeL===eyeR on a face:true rig)
    const s = makeSandwich();
    s.position.set(0.14, 1.02, 0.2);                  // lap/hand height, group-local
    group.add(s);
    registerBumpable(group, parts, LINES);            // BEFORE baking (PITFALLS: anchor captured at registration)
    bakeChibiRig(group, parts);                       // posed eater + sandwich -> 1 draw
  }

  // ================================================================= //
  //  2) SIT SPOTS on the steps — the mayor can join the pair.
  //     sitOnBench sets mayor.y = SIT_LIFT(0.34) + s.y; the Lurie sits pass
  //     y:0 at grade -> a 0.34 lift. The tread at x55.6 is y=(55.6-53.2)/4
  //     *1.9 = 1.14, so pass y:1.14 -> the mayor sits ON the tread (butt at
  //     1.14, same 0.34 lift), not floating and not sunk.
  // ================================================================= //
  for (const z of [970.8, 966.4])
    addSitSpot({ x: 55.6, z, ry: -Math.PI / 2, y: 1.14, r: 2.0, label: 'sit on the steps' });

  // ================================================================= //
  //  3) LION LUCK — the two bronze guardians (meshes are main-session).
  //     N 'on the prowl' (54.4,962.4); S 'in an attitude of defiance'
  //     (54.4,979.4). Pure-distance interactions, r 2.6.
  // ================================================================= //
  addInteraction({ x: 54.4, z: 962.4, r: 2.6, label: 'wish the lion luck',
    onUse: () => toast('You give the prowling lion a quiet nod.', "He's seen some winters.") });
  addInteraction({ x: 54.4, z: 979.4, r: 2.6, label: 'wish the lion luck',
    onUse: () => toast('You wish the defiant lion luck.', 'Somewhere a tiny helmet waits for him.') });

  // ================================================================= //
  //  4) SANDWICH BOARD on the portico landing (mesh is executor A's).
  //     Interior is explicitly out of scope — no door-opening promise.
  // ================================================================= //
  addInteraction({ x: 58.6, z: 969.4, r: 2.4, label: 'read the board',
    onUse: () => toast('FREE DAY TOMORROW', 'the lions never take a day off.') });

  // ================================================================= //
  //  5) ROUTE 66 begin-sign at the curb (mesh is executor A's).
  // ================================================================= //
  addInteraction({ x: 48.5, z: 962.5, r: 2.2, label: 'get your kicks',   // sign moved off the portico axis (060 art-director pass)
    onUse: () => toast('ROUTE 66 BEGINS HERE', '2,448 miles to Santa Monica. Maybe after lunch.') });
});
