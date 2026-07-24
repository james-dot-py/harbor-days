// =====================================================================
//  PACK: zoo-habitats — task 115 animal cast for the habitat dioramas
//  built by structures.js buildZooHabitats (rockwork/water/rails) from
//  data/chicago.js ZOO.habitats + ZOO.farmyard. THIS pack owns the LIFE:
//    * PENGUINS: a 5-bird huddle on the cove's south shelf (3 merged
//      meshes: dark / belly / beak) + ONE WADDLER shuffling a 2.4 m arc
//      on the bowl's east rim (waddle roll + bob, pause + turn at ends).
//    * POLAR BEAR: one BIG cream bear on the tundra terrace; separate
//      head with a slow sway + an occasional 2 s nose-lift.
//    * SNOW MONKEYS: a grooming pair on the knoll's ledge — merged
//      bodies, merged pink faces, a separate pat-bobbing groomer forearm
//      and a separate contented-tilt groomee head.
//    * FLAMINGOS: a 6-bird pink cluster on the lagoon's NW mud shore
//      (4 one-legged, 2 two-legged; bodies+necks+legs merged, beaks
//      merged dark) + ONE DIPPER whose neck smoothsteps down to the
//      water every 7-13 s.
//    * FARM: brown-patched cow (breathing + lion-pattern tail flick),
//      goat up on a stump (scanning head, back-swept horns), 3 hens
//      (2 merged + 1 double-pecker), and the spinning windmill WHEEL
//      (the tower/vane are structures statics — builders can't animate).
//    * FARM CALLS: sparse synthesized hen cluck / goat bleat / rare cow
//      moo on a 10-24 s timer within 60 m of the paddock, actx-guarded.
//  Culling: every mesh lives under ONE group named 'zooanim' (fogcull
//  selfManaged exemption by name, same as packs/zoo.js) hidden past
//  150 m of (-60,880) with a full early-out — zero work when far.
//  Determinism: ALL placements are literal constants (derived from the
//  CH.ZOO.habitats / CH.ZOO.farmyard data); Math.random only for runtime
//  timers/jitter (never the shared world rng). No per-frame allocation;
//  no localStorage; every audio access guarded on actx.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, registerUpdate, getAudioCtx } from '../framework.js';
import { scene, toon } from '../core.js';
import { sph, box } from './zoo.js';   // the shared 114 animal part helpers
import * as CH from '../data/chicago.js';

// pose a finished local-space part-set: rotateY about the feet origin, place
function put(g, x, y, z, ry) { if (ry) g.rotateY(ry); g.translate(x, y, z); return g; }

// ---- penguin recipe: ~1 m chunky bowling-pin, +z forward, feet at y 0 ----
// (scale s baked so huddle + waddler share one recipe; chunk law: 1.15)
function pengGeos(s) {
  const dark = BufferGeometryUtils.mergeBufferGeometries([
    sph(1, 8, 0.28, 0.42, 0.26, 0, 0.42, 0),                     // bowling-pin body
    sph(0.18, 8, 1, 1, 1, 0, 0.82, 0.02),                        // round head merged into the top
    sph(1, 6, 0.055, 0.24, 0.11, 0.285, 0.50, -0.02, 0, 0.35),   // R flipper, swept back
    sph(1, 6, 0.055, 0.24, 0.11, -0.285, 0.50, -0.02, 0, 0.35),  // L flipper
  ], false);
  const white = sph(1, 8, 0.20, 0.30, 0.12, 0, 0.44, 0.19);      // belly lens on the front
  const beak = sph(1, 5, 0.05, 0.035, 0.09, 0, 0.80, 0.20);      // stubby beak
  dark.scale(s, s, s); white.scale(s, s, s); beak.scale(s, s, s);
  return { dark, white, beak };
}

// ---- flamingo recipe: ~1.2 m — oval body on stick leg(s), S-curve neck ----
function flamGeos(oneLeg) {
  const pink = [
    sph(1, 8, 0.17, 0.15, 0.26, 0, 0.78, 0),                     // oval body at ~0.78
    sph(1, 6, 0.052, 0.16, 0.052, 0, 0.94, 0.21, 0, 0.55),       // neck lower, leaning forward
    sph(1, 6, 0.046, 0.15, 0.046, 0, 1.06, 0.26, 0, -0.12),      // neck upper, near vertical
    sph(0.066, 6, 1, 0.92, 1.15, 0, 1.17, 0.27),                 // small head
  ];
  if (oneLeg) pink.push(box(0.045, 0.78, 0.045, 0, 0.39, -0.02));           // the tucked-leg read
  else pink.push(box(0.045, 0.78, 0.045, 0.07, 0.39, -0.02),
                 box(0.045, 0.78, 0.045, -0.07, 0.39, -0.02));
  return { pink: BufferGeometryUtils.mergeBufferGeometries(pink, false),
           beak: sph(1, 5, 0.030, 0.036, 0.09, 0, 1.13, 0.36, 0, 0.6) };    // short down-curved dark beak
}

// ---- hen recipe: ~0.4 m fat rusty teardrop, comb + beak folded into the red
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

onWorldReady(() => {
  const HB = CH.ZOO.habitats, FY = CH.ZOO.farmyard;
  // cached toon() materials — 0x2e2a28 / 0x9a9282 / 0x9a8d7c reuse zoo.js /
  // structures buckets for free (toon caches by color)
  const DARK = toon(0x2e2a28);    // penguin bodies + flamingo beaks (the seal hide)
  const BELLY = toon(0xf0ede4);   // penguin belly white
  const BEAK = toon(0xd9822b);    // penguin beak orange
  const BEAR = toon(0xeae6da);    // polar cream-white
  const MONK = toon(0x9a8d7c);    // goat horns (grey-tan)
  const MONKEY = toon(0x9c7a54);  // macaque warm brown — reads against the grey knoll rock (grey-tan 0x9a8d7c vanished on 0x8f8f88; real Japanese macaques are brown); pack meshes so the recolor is +0 draws
  const FACE = toon(0xd98a74);    // macaque pink faces
  const PINK = toon(0xe8919e);    // flamingo pink
  const COWW = toon(0xece8dc);    // cow white
  const PATCH = toon(0x7a4a30);   // cow brown patches + tail
  const GOATC = toon(0xdfd8c8);   // goat white-grey
  const WOOD = toon(0x8a6a44);    // the goat stump (paddock rail tone)
  const HEN = toon(0xa8442e);     // rusty hen red
  const STEEL = toon(0x9a9282);   // windmill wheel steel

  // ---- the one animal group (fogcull selfManaged exemption by name) -----
  const grp = new THREE.Group(); grp.name = 'zooanim'; scene.add(grp);

  // ---- (1) PENGUIN HUDDLE — 5 birds ON the south shelf (top y 0.5,
  // HB.penguin.shelfY), clustered toward the south viewing rail (z1 786 /
  // rail 786.6), facings varied +-0.5 rad around south (+z = ry 0).
  {
    const darks = [], whites = [], beaks = [];
    const SPOTS = [   // x, z, ry — literal, shelf band z 783..786 of the cove rect
      [-63.6, 784.9, 0.35], [-62.5, 785.2, -0.25], [-64.4, 784.3, 0.10],
      [-61.9, 784.4, 0.50], [-63.1, 784.1, -0.45],
    ];
    for (const [x, z, ry] of SPOTS) {
      const p = pengGeos(1.15);
      darks.push(put(p.dark, x, 0.5, z, ry));
      whites.push(put(p.white, x, 0.5, z, ry));
      beaks.push(put(p.beak, x, 0.5, z, ry));
    }
    grp.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(darks, false), DARK));
    grp.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(whites, false), BELLY));
    grp.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(beaks, false), BEAK));
  }
  // THE WADDLER — own 3 meshes in a group, shuffling the bowl's east rim
  // (rock band between the water wedge x1 -60.5 and the cove rect x1 -57.5)
  const wadG = new THREE.Group(); wadG.rotation.order = 'YXZ';
  {
    const p = pengGeos(1.15);
    wadG.add(new THREE.Mesh(p.dark, DARK));
    wadG.add(new THREE.Mesh(p.white, BELLY));
    wadG.add(new THREE.Mesh(p.beak, BEAK));
  }
  // the 2.6 m arc along the bowl floor at the east rim's base (floor y 0.024;
  // the rim itself is stepped slabs x>=-58.6 — walking ON them would float)
  const WA_X = -59.4, WA_Z = 778.3, WB_X = -59.6, WB_Z = 780.9;
  const WAD_Y = 0.03;
  const RY_AB = -0.077, RY_BA = 3.065;                            // headings A->B / B->A
  wadG.position.set(WA_X, WAD_Y, WA_Z); wadG.rotation.y = RY_AB;
  grp.add(wadG);

  // ---- (2) POLAR BEAR — one BIG chunky bear on the tundra terrace slab
  // (top ~0.45 near (-80.5,784.5)), facing SSE toward the south rail.
  // (spec ry 2.95 assumed -z-forward; +z-forward equivalent is 0.19)
  const bearG = new THREE.Group();
  bearG.position.set(-80, 0.45, 784.8); bearG.rotation.y = 0.19;
  bearG.scale.setScalar(1.1);                                     // chunk law
  bearG.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([
    sph(1, 10, 0.55, 0.60, 1.05, 0, 1.00, -0.05),                 // 2.1 m stretched torso
    sph(1, 8, 0.45, 0.42, 0.50, 0, 1.25, 0.45),                   // shoulder hump ~1.67
    sph(1, 8, 0.30, 0.44, 0.42, 0.28, 0.85, -0.80),               // haunches
    sph(1, 8, 0.30, 0.44, 0.42, -0.28, 0.85, -0.80),
    box(0.34, 0.90, 0.36, 0.33, 0.45, 0.62),                      // 4 stout leg columns
    box(0.34, 0.90, 0.36, -0.33, 0.45, 0.62),
    box(0.34, 0.90, 0.38, 0.33, 0.45, -0.68),
    box(0.34, 0.90, 0.38, -0.33, 0.45, -0.68),
    sph(0.09, 5, 1, 1, 1, 0, 1.05, -1.08),                        // tiny tail
  ], false), BEAR));
  const bearHead = new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([
    sph(0.30, 9, 1.05, 0.95, 1.05, 0, 0, 0.10),                   // big head
    sph(1, 7, 0.14, 0.12, 0.20, 0, -0.06, 0.40),                  // snout
    sph(0.075, 5, 1, 1, 1, 0.19, 0.24, 0.02),                     // small ears
    sph(0.075, 5, 1, 1, 1, -0.19, 0.24, 0.02),
  ], false), BEAR);
  bearHead.position.set(0, 1.42, 0.92); bearHead.rotation.x = 0.12;  // slightly lowered
  bearG.add(bearHead);
  grp.add(bearG);

  // ---- (3) SNOW MONKEYS — a grooming pair ON the knoll's built SOUTH ledge
  // (structures MSLAB [2.3,.4,1.6] at (-49.5,797.7), flat top y 0.8 — left
  // clear for exactly this), faced south toward the main loop viewers.
  const mkG = new THREE.Group();
  mkG.position.set(-49.5, 0.8, 797.65); mkG.rotation.y = 0.15;
  mkG.scale.setScalar(1.25);                                      // chunk law: pair reads small
  mkG.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([
    sph(1, 8, 0.26, 0.30, 0.26, 0.30, 0.34, 0.12),                // groomee: hunched round back
    sph(1, 6, 0.10, 0.14, 0.10, 0.18, 0.18, 0.34),                // knees-up hint
    sph(1, 6, 0.10, 0.14, 0.10, 0.42, 0.18, 0.32),
    sph(1, 8, 0.24, 0.32, 0.24, -0.28, 0.36, -0.12),              // groomer: seated behind/beside
    sph(0.16, 7, 1, 1, 1, -0.28, 0.80, -0.06),                    // groomer head (static)
    sph(1, 6, 0.09, 0.13, 0.09, -0.42, 0.16, 0.08),               // groomer knee
  ], false), MONKEY));
  mkG.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([
    sph(0.085, 6, 1, 0.9, 0.6, 0.30, 0.67, 0.30),                 // groomee face
    sph(0.075, 6, 1, 0.9, 0.6, -0.25, 0.80, 0.07, 0.45),          // groomer face, angled to partner
  ], false), FACE));
  const mkHead = new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([
    sph(0.15, 7, 1, 1, 1, 0, 0.06, 0),                            // groomee head, pivot at the neck
    sph(1, 6, 0.075, 0.06, 0.08, 0, 0.00, 0.14),                  // muzzle
    sph(0.05, 5, 1, 1, 1, 0.13, 0.14, -0.02),                     // ears
    sph(0.05, 5, 1, 1, 1, -0.13, 0.14, -0.02),
  ], false), MONKEY);
  mkHead.position.set(0.30, 0.60, 0.14);
  mkG.add(mkHead);
  const mkArm = new THREE.Mesh(box(0.07, 0.07, 0.36, 0, 0, 0.18), MONKEY);  // groomer forearm, pivot at the shoulder
  mkArm.rotation.order = 'YXZ';
  mkArm.position.set(-0.14, 0.60, 0.00);
  mkArm.rotation.y = 1.35; mkArm.rotation.x = 0.30;               // extended to the partner's back
  mkG.add(mkArm);
  grp.add(mkG);

  // ---- (4) FLAMINGOS — 6-bird cluster on the NW mud shore (viewing edge:
  // the loop + rail are north), 4 one-legged + 2 two-legged.
  {
    const pinks = [], beaks = [];
    const SPOTS = [   // x, z, ry, oneLeg — literal, spread (-32..-26, 857..860.5)
      [-31.4, 858.0, 2.6, 1], [-30.0, 859.6, -2.9, 1], [-28.6, 857.4, 2.1, 0],
      [-27.2, 858.8, 3.0, 1], [-29.3, 860.3, -2.5, 0], [-26.3, 857.8, 1.9, 1],
    ];
    for (const [x, z, ry, one] of SPOTS) {   // feet on the mud plane (y 0.02);
      const f = flamGeos(one);               // two spots wade the 0.12 water
      pinks.push(put(f.pink, x, 0.04, z, ry));
      beaks.push(put(f.beak, x, 0.04, z, ry));
    }
    grp.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(pinks, false), PINK));
    grp.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(beaks, false), DARK));
  }
  // THE DIPPER at the water edge — separate body + pivoting neck+head that
  // smoothsteps down to the water (y 0.12) every 7-13 s.
  const dipG = new THREE.Group();
  dipG.position.set(-27.5, 0.04, 861.5); dipG.rotation.y = 1.2;   // feet on the mud, ankle-deep; near-side profile from the rail
  dipG.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([
    sph(1, 8, 0.17, 0.15, 0.26, 0, 0.78, 0),                      // body (both legs down to feed)
    box(0.045, 0.78, 0.045, 0.07, 0.39, -0.02),
    box(0.045, 0.78, 0.045, -0.07, 0.39, -0.02),
  ], false), PINK));
  const dipNeck = new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([
    sph(1, 6, 0.052, 0.20, 0.052, 0, 0.16, 0.04),                 // neck, pivot at the base
    sph(1, 6, 0.046, 0.18, 0.046, 0, 0.42, 0.07),
    sph(0.068, 6, 1, 0.9, 1.15, 0, 0.55, 0.10),                   // head
  ], false), PINK);
  dipNeck.position.set(0, 0.62, 0.20);
  const dipBeak = new THREE.Mesh(sph(1, 5, 0.032, 0.036, 0.095, 0, 0.55, 0.20, 0, 0.5), DARK);
  dipNeck.add(dipBeak);                                           // dark tip rides the neck
  dipG.add(dipNeck);
  grp.add(dipG);

  // ---- (5a) COW at FY.cow — chunky brown-and-white, facing the east rail
  const cowG = new THREE.Group();
  cowG.position.set(FY.cow.x, 0, FY.cow.z); cowG.rotation.y = FY.cow.ry;   // (-77.5, 983, ry 1.35)
  cowG.scale.setScalar(1.1);                                      // chunk law
  const cowBody = new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([
    sph(1, 10, 0.46, 0.50, 0.85, 0, 0.98, -0.08),                 // torso barrel
    box(0.36, 0.38, 0.42, 0, 1.28, 0.92),                         // boxy head
    sph(1, 7, 0.17, 0.14, 0.14, 0, 1.16, 1.16),                   // muzzle
    sph(1, 5, 0.10, 0.05, 0.07, 0.26, 1.42, 0.86),                // ears
    sph(1, 5, 0.10, 0.05, 0.07, -0.26, 1.42, 0.86),
    box(0.17, 0.75, 0.19, 0.27, 0.375, 0.52),                     // 4 legs
    box(0.17, 0.75, 0.19, -0.27, 0.375, 0.52),
    box(0.17, 0.75, 0.19, 0.27, 0.375, -0.52),
    box(0.17, 0.75, 0.19, -0.27, 0.375, -0.52),
    sph(1, 6, 0.17, 0.14, 0.20, 0, 0.52, -0.42),                  // udder hint
  ], false), COWW);
  cowG.add(cowBody);
  const cowPatch = new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([
    sph(1, 7, 0.30, 0.26, 0.34, 0.30, 1.10, -0.35),               // flank/back patches, lapped
    sph(1, 7, 0.28, 0.24, 0.30, -0.32, 1.05, 0.25),
    sph(1, 7, 0.24, 0.20, 0.26, 0.15, 1.30, -0.02),
    sph(1, 6, 0.13, 0.13, 0.10, 0.15, 1.34, 1.10),                // the over-one-eye patch
  ], false), PATCH);
  cowG.add(cowPatch);
  const cowTailGeo = BufferGeometryUtils.mergeBufferGeometries([  // pivot at the root (lion tail pattern)
    (() => { const g = new THREE.CylinderGeometry(0.028, 0.038, 0.72, 5); g.translate(0, -0.36, 0); return g; })(),
    sph(0.07, 5, 1, 1, 1, 0, -0.74, 0),                           // tuft (all brown = one mesh)
  ], false);
  const cowTail = new THREE.Mesh(cowTailGeo, PATCH);
  cowTail.position.set(0, 1.42, -0.90); cowTail.rotation.x = 0.15;
  cowG.add(cowTail);
  grp.add(cowG);

  // ---- (5b) GOAT at FY.goat — UP ON A STUMP (pack-owned), scanning head
  const gtG = new THREE.Group();
  gtG.position.set(FY.goat.x, 0, FY.goat.z); gtG.rotation.y = FY.goat.ry;  // (-75, 990, ry 0.6)
  gtG.scale.setScalar(1.1);
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.38, 0.5, 8), WOOD);
  stump.position.set(0, 0.25, 0.55);
  gtG.add(stump);
  gtG.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([
    sph(1, 9, 0.25, 0.29, 0.52, 0, 0.82, 0.05, 0, -0.35),         // torso pitched up ~0.35
    box(0.09, 0.50, 0.10, 0.13, 0.75, 0.50),                      // forelegs up on the stump top
    box(0.09, 0.50, 0.10, -0.13, 0.75, 0.50),
    box(0.10, 0.60, 0.12, 0.14, 0.30, -0.30),                     // hind legs on the ground
    box(0.10, 0.60, 0.12, -0.14, 0.30, -0.30),
    sph(0.05, 5, 1, 1, 1, 0, 0.95, -0.48),                        // tail nub
  ], false), GOATC));
  const gtHead = new THREE.Group();
  gtHead.position.set(0, 1.28, 0.62);
  gtHead.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([
    sph(0.14, 7, 0.9, 1.0, 1.1, 0, 0.02, 0.02),                   // head
    sph(1, 6, 0.07, 0.06, 0.10, 0, -0.04, 0.16),                  // muzzle
    sph(1, 5, 0.05, 0.13, 0.08, 0.15, -0.05, -0.02, 0, 0.3),      // floppy ears
    sph(1, 5, 0.05, 0.13, 0.08, -0.15, -0.05, -0.02, 0, 0.3),
  ], false), GOATC));
  gtHead.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([
    sph(1, 5, 0.035, 0.13, 0.045, 0.055, 0.16, -0.08, 0, -1.0),   // tiny back-swept horns
    sph(1, 5, 0.035, 0.13, 0.045, -0.055, 0.16, -0.08, 0, -1.0),
  ], false), MONK));
  gtG.add(gtHead);
  grp.add(gtG);

  // ---- (5c) HENS at FY.hens — 2 merged standers + ONE double-pecker
  {
    const a = put(henGeo(), -74.9, 0, 978.55, 2.3);
    const b = put(henGeo(), -73.95, 0, 979.35, -0.7);
    grp.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([a, b], false), HEN));
  }
  const pecker = new THREE.Mesh(henGeo(), HEN);
  pecker.position.set(-74.55, 0, 979.6); pecker.rotation.y = 0.9;
  grp.add(pecker);

  // ---- (5d) WINDMILL WHEEL at FY.windmill — 10 blades + hub, ONE mesh,
  // plane facing EAST (+x, toward the farm lane); tower/vane are statics.
  const wheelParts = [];
  for (let i = 0; i < 10; i++) {
    const g = box(0.09, 1.32, 0.035, 0, 0.80, 0);                 // tip at wheelR ~1.46
    g.rotateZ(i * Math.PI * 2 / 10);
    wheelParts.push(g);
  }
  wheelParts.push(sph(1, 6, 0.14, 0.14, 0.11, 0, 0, 0));          // hub
  const wheelGeo = BufferGeometryUtils.mergeBufferGeometries(wheelParts, false);
  wheelGeo.rotateY(Math.PI / 2);                                  // plane normal -> +x
  const wheel = new THREE.Mesh(wheelGeo, STEEL);
  wheel.position.set(FY.windmill.x + 0.55, FY.windmill.h + 0.2, FY.windmill.z);  // (-88.95, 8.7, 955)
  grp.add(wheel);

  // ---- (6) FARM CALLS (all synthesized, actx-guarded) -------------------
  function henCluck(vol) {
    const { actx, sfxBus } = getAudioCtx(); if (!actx) return;
    const t0 = actx.currentTime, n = 2 + (Math.random() * 2 | 0);  // 2-3 blips
    for (let i = 0; i < n; i++) {
      const ts = t0 + i * 0.09;
      const o = actx.createOscillator(); o.type = 'square';
      o.frequency.setValueAtTime(500, ts);
      o.frequency.exponentialRampToValueAtTime(380, ts + 0.06);
      const g = actx.createGain();
      g.gain.setValueAtTime(0.0001, ts);
      g.gain.linearRampToValueAtTime(vol, ts + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, ts + 0.06);
      o.connect(g); g.connect(sfxBus); o.start(ts); o.stop(ts + 0.07);
    }
  }
  function goatBleat(vol) {
    const { actx, sfxBus } = getAudioCtx(); if (!actx) return;
    const t0 = actx.currentTime;
    const o = actx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(400, t0);
    o.frequency.exponentialRampToValueAtTime(300, t0 + 0.4);
    const lfo = actx.createOscillator(); lfo.frequency.value = 6;  // the bleat wobble
    const lg = actx.createGain(); lg.gain.value = 18;
    lfo.connect(lg); lg.connect(o.frequency);
    const g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
    o.connect(g); g.connect(sfxBus);
    o.start(t0); lfo.start(t0); o.stop(t0 + 0.45); lfo.stop(t0 + 0.45);
  }
  function cowMoo(vol) {
    const { actx, sfxBus } = getAudioCtx(); if (!actx) return;
    const t0 = actx.currentTime;
    const o = actx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(140, t0);
    o.frequency.exponentialRampToValueAtTime(95, t0 + 0.8);
    const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    const g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.25);               // slow attack
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.8);
    o.connect(lp); lp.connect(g); g.connect(sfxBus);
    o.start(t0); o.stop(t0 + 0.85);
  }

  // ---- (7) per frame: cull gate + all idle motion + the call timer ------
  let cullT = 0, hNear = true;
  let wadU = 0.35, wadDir = 1, wadPz = 0, wadFrom = RY_AB, wadTo = RY_AB;
  let bearLiftT = 8 + Math.random() * 7, bearLift = 0;
  let armOn = 0, armEl = 0, armRest = 2;
  let dipPh = 0, dipT = 7 + Math.random() * 6;
  let cowFlickT = 4, cowFlick = 0;
  let peckT = 3 + Math.random() * 3, peckEl = -1;
  let farmT = 10 + Math.random() * 14;
  registerUpdate((dt, t, pl) => {
    // throttled distance gate (~0.4 s): far -> hide + ZERO habitat work
    cullT -= dt;
    if (cullT <= 0) {
      cullT = 0.4;
      const dx = pl.x + 60, dz = pl.z - 880;
      hNear = dx * dx + dz * dz <= 150 * 150;
      if (grp.visible !== hNear) grp.visible = hNear;
    }
    if (!hNear) return;

    // WADDLER — shuffle the rim arc; waddle roll + bob; pause + turn at ends
    if (wadPz > 0) {
      wadPz -= dt;
      const u = 1 - Math.max(0, wadPz) / 1.5, e = u * u * (3 - 2 * u);
      wadG.rotation.y = wadFrom + (wadTo - wadFrom) * e;
      wadG.rotation.z *= Math.max(0, 1 - dt * 6);                 // settle the roll
      wadG.position.y = WAD_Y;
    } else {
      wadU += wadDir * (0.35 / 2.61) * dt;                        // ~0.35 m/s along the 2.61 m arc
      if (wadU >= 1) { wadU = 1; wadDir = -1; wadPz = 1.5; wadFrom = RY_AB; wadTo = RY_BA; }
      else if (wadU <= 0) { wadU = 0; wadDir = 1; wadPz = 1.5; wadFrom = RY_BA; wadTo = RY_AB; }
      else {
        wadG.rotation.y = wadDir > 0 ? RY_AB : RY_BA;
        wadG.rotation.z = Math.sin(t * 18.85) * 0.12;             // ~3 Hz waddle
        wadG.position.y = WAD_Y + Math.abs(Math.sin(t * 18.85)) * 0.025;
      }
    }
    wadG.position.x = WA_X + (WB_X - WA_X) * wadU;
    wadG.position.z = WA_Z + (WB_Z - WA_Z) * wadU;

    // POLAR BEAR — slow head sway + occasional 2 s nose-lift
    bearHead.rotation.y = Math.sin(t * 2.51) * 0.3;               // ~0.4 Hz
    if (bearLift > 0) {
      bearLift -= dt;
      const u = 1 - Math.max(0, bearLift) / 2;
      bearHead.rotation.x = 0.12 - 0.2 * Math.sin(Math.PI * u);
    } else {
      bearHead.rotation.x = 0.12;
      bearLiftT -= dt;
      if (bearLiftT <= 0) { bearLiftT = 8 + Math.random() * 7; bearLift = 2; }
    }

    // SNOW MONKEYS — contented head tilt + pat-bob bursts on the forearm
    mkHead.rotation.z = Math.sin(t * 1.885) * 0.12;               // 0.3 Hz
    if (armOn > 0) {
      armOn -= dt; armEl += dt;
      mkArm.rotation.x = 0.30 + Math.sin(armEl * 15.7) * 0.16;    // ~2.5 Hz pats
      if (armOn <= 0) { mkArm.rotation.x = 0.30; armRest = 2 + Math.random() * 1.4; }
    } else {
      armRest -= dt;
      if (armRest <= 0) { armOn = 3 + (Math.random() - 0.5) * 1.2; armEl = 0; }
    }

    // FLAMINGO DIPPER — idle -> 1.2 s down -> 1 s pause -> 1.2 s up
    if (dipPh === 0) { dipT -= dt; if (dipT <= 0) { dipPh = 1; dipT = 1.2; } }
    else if (dipPh === 1) {
      dipT -= dt;
      const u = 1 - Math.max(0, dipT) / 1.2, e = u * u * (3 - 2 * u);
      dipNeck.rotation.x = 2.9 * e;
      if (dipT <= 0) { dipPh = 2; dipT = 1.0; }
    } else if (dipPh === 2) { dipT -= dt; if (dipT <= 0) { dipPh = 3; dipT = 1.2; } }
    else {
      dipT -= dt;
      const u = Math.max(0, dipT) / 1.2, e = u * u * (3 - 2 * u);
      dipNeck.rotation.x = 2.9 * e;
      if (dipT <= 0) { dipPh = 0; dipT = 7 + Math.random() * 6; }
    }

    // COW — breathing (body + patches in lockstep) + tail swish
    const br = 1 + Math.sin(t * 1.3) * 0.012;
    cowBody.scale.y = br; cowPatch.scale.y = br;
    cowFlickT -= dt;
    if (cowFlickT <= 0) { cowFlickT = 3 + Math.random() * 3; cowFlick = 0.6; }
    if (cowFlick > 0) {
      cowFlick -= dt;
      const k = Math.max(0, cowFlick) / 0.6;
      cowTail.rotation.z = Math.sin(cowFlick * 26) * 0.35 * k;
    }

    // GOAT — slow left-right scan from the stump
    gtHead.rotation.y = Math.sin(t * 1.571) * 0.5;                // 0.25 Hz

    // PECKER HEN — quick double-peck every few seconds
    if (peckEl >= 0) {
      peckEl += dt;
      const u = peckEl / 0.6;
      if (u >= 1) { peckEl = -1; pecker.rotation.x = 0; peckT = 3 + Math.random() * 3; }
      else pecker.rotation.x = 0.5 * Math.abs(Math.sin(u * Math.PI * 2));
    } else {
      peckT -= dt;
      if (peckT <= 0) peckEl = 0;
    }

    // WINDMILL — slow steady spin about the east-west axis
    wheel.rotation.x = t * 0.55;

    // FARM CALLS — sparse timer, within 60 m of the paddock heart
    farmT -= dt;
    if (farmT <= 0) {
      farmT = 10 + Math.random() * 14;
      const fx = pl.x + 79, fz = pl.z - 982, fd = Math.sqrt(fx * fx + fz * fz);
      if (fd < 60) {
        const fall = Math.max(0.25, 1 - fd / 60);
        const p = Math.random();
        if (p < 0.25) cowMoo(0.09 * fall);                        // rare moo
        else if (p < 0.63) henCluck(0.06 * fall);
        else goatBleat(0.07 * fall);
      }
    }
  });
});
