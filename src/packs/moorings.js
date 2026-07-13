// =====================================================================
//  MOORINGS — Belmont Harbor's mooring field (plus a second, smaller
//  MONTROSE Harbor field laid at the bottom of onWorldReady from its own
//  local rng seed 7071, reusing every instanced mesh below → ZERO new
//  draw calls). The real basin reads two
//  ways from the air: tidy north-south rows of sailboats on cans, AND
//  distinctive STAR DOCKS — radial clusters where 8-9 boats moor nose-in
//  around a little central float, blooming like flowers among the rows.
//  A modest central slip-dock arm sits in the open south water. Together
//  that silhouette is half of what makes the harbor recognizable, so we
//  lay it all in here as its own pack.
//
//  Open basin water used: x 102..142 (rows at x106/117/128/139, star
//  clusters scattered x110..135), east of the finger-dock tips ~x93 and
//  west of the peninsula seawall at x160; z -46..-300 (north of the mouth
//  channel, south of the dog-beach cove). ~100 boats + cans at basin scale.
//
//  All static placement uses a LOCAL mulberry32 (seed 4242) so it never
//  touches the shared world rng / determinism. Everything is instanced:
//  hulls, masts, booms, jibs, cans, dinghies, star-dock floats, star-dock
//  spokes (8 draw calls) + one plank arm mesh = 9. A very gentle shared
//  bob/roll recomposes the hull/mast/boom/jib matrices each frame from
//  hoisted scratch objects — no per-frame allocations.
// =====================================================================
import { onWorldReady, registerUpdate } from '../framework.js';
import * as THREE from 'three';
import { scene, toon, WATER_Y } from '../core.js';

// local deterministic rng — never the shared core rng()/rand()
function m32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// ---- straight rows (thinned to leave room for the star clusters) -----
const ROWS = [106, 117, 128, 139];   // 4 N-S rows mid-basin (clear of dock/boat tips ~x100 W and the peninsula seawall x~160 E)
const Z0 = -46, Z1 = -300, ZSTEP = 14.5;   // per-row bow-to-stern spacing (wider than v0.5 so the field is a field, not soup)
const STAGGER = 2.5;               // brick-offset alternate rows in z
const BASE_HEAD = Math.PI;         // moored boats weathervane ~north (bow -> -z)
const JITTER_X = 0.5, JITTER_Z = 0.9, JITTER_H = 0.25;

// ---- star docks: radial nose-in clusters around a little central float -
const CLUSTERS = [
  { x: 112, z: -90,  n: 9 },
  { x: 135, z: -120, n: 8 },
  { x: 110, z: -170, n: 9 },
  { x: 133, z: -215, n: 8 },
  { x: 115, z: -265, n: 9 },
];
const CL_R = 5.2;                    // boat-CENTRE radius (bow tip lands ~x2.9 from float centre, just outside it)
const FLOAT_R = 1.6, FLOAT_H = 0.32; // octagonal central float
const CL_JIT_A = 0.09, CL_JIT_R = 0.35, CL_JIT_H = 0.13;   // petal angle / radius / heading jitter
const SKIP_R = 12.5;                 // thin straight rows within this of any cluster centre (keeps ~2m hull clearance)

// ---- central slip-dock arm (modest; skipped if it can't fit cleanly) --
// Placed in the open water just off the head of the basin, clear of every
// star cluster, so slips can alternate on BOTH sides without dodging a
// flower. x123.2..124.8, z-273..-303 (~30m).
const INCLUDE_ARM = true;
const ARM_X = 124, ARM_Z0 = -273, ARM_Z1 = -303, ARM_W = 1.6;   // arm z-span (~30m of open water)
const ARM_SKIP_X0 = 112, ARM_SKIP_X1 = 136;                     // thin straight rows crossing the arm's footprint

// ---- hull geometry / colours -----------------------------------------
const HULL_S = new THREE.Vector3(0.85, 0.55, 2.3);   // beam, draft, length half-extents
const HULL_HALF_LEN = HULL_S.z;
const LIGHT = [0xffffff, 0xf6f1e6, 0xf2ecdd, 0xeef1f3, 0xf8ead0, 0xffffff, 0xe9e4d6];
const DARK  = [0x27324a, 0x7a2b2b, 0x2f4a34];        // a few navy / dark-red / forest
const DARK_PROB = 0.16;

// ---- gentle bob ------------------------------------------------------
const BOB_SPD = 0.9, BOB_AMP = 0.05, ROLL_AMP = 0.045;

// ---- hoisted scratch (no per-frame allocation) -----------------------
const _mW = new THREE.Matrix4(), _mP = new THREE.Matrix4();
const _q = new THREE.Quaternion(), _qh = new THREE.Quaternion(), _qr = new THREE.Quaternion();
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(1, 1, 1), _one = new THREE.Vector3(1, 1, 1);
const _yAxis = new THREE.Vector3(0, 1, 0), _zAxis = new THREE.Vector3(0, 0, 1);
const _col = new THREE.Color();
const _IDENT = new THREE.Quaternion();

// per-part LOCAL matrices (relative to a boat sitting at the waterline)
const _qBoom = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)); // cylinder y -> z (fore-aft)
const _qJib  = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));  // triangle faces the beam
const hullLocal = new THREE.Matrix4().compose(new THREE.Vector3(0, 0.05, 0), _IDENT, HULL_S);
const mastLocal = new THREE.Matrix4().compose(new THREE.Vector3(0, 2.8, 0),  _IDENT, new THREE.Vector3(1, 4.5, 1));
const boomLocal = new THREE.Matrix4().compose(new THREE.Vector3(0, 1.3, 0),  _qBoom, new THREE.Vector3(1, 1.9, 1));
const jibLocal  = new THREE.Matrix4().compose(new THREE.Vector3(0, 0.62, 1.5), _qJib, _one);

const boats = [];   // {x, z, ry, ph, jib, can}
const spokes = [];  // {cx, cz, ang, len}  — one radial finger per star-dock boat
let hulls, masts, booms, jibs;

function jibTriGeo(){
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(0.55, 0); s.lineTo(0, 1.15); s.closePath();
  return new THREE.ShapeGeometry(s);
}

// compose a boat's world matrix (heading + gentle roll + bob) into _mW
function boatWorld(b, t){
  const bob  = Math.sin(t * BOB_SPD + b.ph) * BOB_AMP;
  const roll = Math.sin(t * BOB_SPD * 0.8 + b.ph * 1.3) * ROLL_AMP;
  _qh.setFromAxisAngle(_yAxis, b.ry);
  _qr.setFromAxisAngle(_zAxis, roll);
  _q.copy(_qh).multiply(_qr);
  _mW.compose(_v.set(b.x, WATER_Y + bob, b.z), _q, _one);
}
function setPart(mesh, idx, local){
  _mP.multiplyMatrices(_mW, local);
  mesh.setMatrixAt(idx, _mP);
}

onWorldReady(() => {
  const rnd = m32(4242);

  // ---- helpers: keep straight-row boats out of the clusters / arm -----
  const nearCluster = (x, z) => {
    for (const c of CLUSTERS){ const dx = x - c.x, dz = z - c.z; if (dx * dx + dz * dz < SKIP_R * SKIP_R) return true; }
    return false;
  };
  const nearArm = (x, z) =>
    INCLUDE_ARM && z <= ARM_Z0 + 6 && z >= ARM_Z1 - 6 && x >= ARM_SKIP_X0 && x <= ARM_SKIP_X1;

  // ---- lay out the thinned straight rows ----
  ROWS.forEach((rx, r) => {
    const zoff = (r & 1) ? STAGGER : 0;
    for (let z = Z0 - zoff; z >= Z1; z -= ZSTEP){
      if (nearCluster(rx, z) || nearArm(rx, z)) continue;   // leave the water clear where a cluster/arm sits
      boats.push({
        x: rx + (rnd() * 2 - 1) * JITTER_X,
        z: z + (rnd() * 2 - 1) * JITTER_Z,
        ry: BASE_HEAD + (rnd() * 2 - 1) * JITTER_H,
        ph: rnd() * Math.PI * 2,
        jib: -1,
        can: true,                                          // row boats ride an individual mooring can
      });
    }
  });
  const rowCount = boats.length;

  // ---- star docks: 8-9 boats nose-in around each central float ----
  CLUSTERS.forEach(c => {
    const a0 = rnd() * Math.PI * 2;                         // random spin so the flowers don't line up
    for (let k = 0; k < c.n; k++){
      const ang = a0 + (k / c.n) * Math.PI * 2 + (rnd() * 2 - 1) * CL_JIT_A;
      const rr  = CL_R + (rnd() * 2 - 1) * CL_JIT_R;
      const px  = c.x + Math.cos(ang) * rr;
      const pz  = c.z + Math.sin(ang) * rr;
      boats.push({
        x: px, z: pz,
        ry: Math.atan2(c.x - px, c.z - pz) + (rnd() * 2 - 1) * CL_JIT_H,   // bow -> float centre
        ph: rnd() * Math.PI * 2,
        jib: -1,
        can: false,                                         // moored to the shared float, not a can
      });
      spokes.push({ cx: c.x, cz: c.z, ang, len: rr });
    }
  });

  // ---- central slip-dock arm: perpendicular slip boats, alternating ----
  if (INCLUDE_ARM){
    const stations = [-277, -282, -287, -292, -297, -302];
    stations.forEach((z, k) => {
      const east = (k & 1) === 1;                            // clean alternation, 3 per side
      const sx = ARM_X + (east ? 1 : -1) * (ARM_W / 2 + 0.5 + HULL_HALF_LEN);
      boats.push({
        x: sx, z,
        ry: (east ? -Math.PI / 2 : Math.PI / 2) + (rnd() * 2 - 1) * 0.05,  // bow -> dock edge
        ph: rnd() * Math.PI * 2,
        jib: -1,
        can: false,
      });
    });
  }

  // =====================================================================
  //  MONTROSE HARBOR — a second, smaller mooring field in the new basin.
  //  Laid here (after Belmont populates boats[]/spokes[], before N is taken)
  //  so it rides the SAME instanced meshes below → ZERO new draw calls. Its
  //  own local rng (seed 7071) keeps it independent of Belmont's draw order.
  //  Basin water x192..216, z-1145..-1282; finger docks root x186 reaching
  //  east to ~x201 at deck rows z-1150/-1190/-1228/-1262; hook mole at x>=219.
  //  We moor in the slips beside the fingers and across the open east half.
  // =====================================================================
  const belmontBoatCount = boats.length;   // Belmont's rnd draws end here; Montrose is rnd2 only
  const rnd2 = m32(7071);

  const M_ROWS = [199, 208, 214];                       // 2 open-water rows (208/214) + 1 slip row (199)
  const M_Z0 = -1152, M_Z1 = -1276, M_ZSTEP = 13.8, M_STAGGER = 2.5;
  const MONTROSE_CLUSTERS = [{ x: 203, z: -1180, n: 8 }, { x: 207, z: -1240, n: 7 }];
  const M_DOCK_Z = [-1150, -1190, -1228, -1262];        // finger-dock deck rows (planks x186..201)
  const M_DOCK_XMAX = 202, M_DOCK_SKIP_Z = 4.5;         // keep a slip-row boat off the planks

  const nearMontroseCluster = (x, z) => {
    for (const c of MONTROSE_CLUSTERS){ const dx = x - c.x, dz = z - c.z; if (dx * dx + dz * dz < SKIP_R * SKIP_R) return true; }
    return false;
  };
  const onMontroseDock = (x, z) => {
    if (x > M_DOCK_XMAX) return false;
    for (const dz of M_DOCK_Z){ if (Math.abs(z - dz) < M_DOCK_SKIP_Z) return true; }
    return false;
  };

  // ---- Montrose straight rows (bow ~north, staggered like the Belmont rows) ----
  M_ROWS.forEach((rx, r) => {
    const zoff = (r & 1) ? M_STAGGER : 0;
    for (let z = M_Z0 - zoff; z >= M_Z1; z -= M_ZSTEP){
      if (nearMontroseCluster(rx, z) || onMontroseDock(rx, z)) continue;   // clear water for clusters + docks
      boats.push({
        x: rx + (rnd2() * 2 - 1) * JITTER_X,
        z: z + (rnd2() * 2 - 1) * JITTER_Z,
        ry: BASE_HEAD + (rnd2() * 2 - 1) * JITTER_H,
        ph: rnd2() * Math.PI * 2,
        jib: -1,
        can: true,                                       // row boats ride an individual mooring can
      });
    }
  });

  // ---- Montrose star docks: 7-8 boats nose-in around each central float ----
  MONTROSE_CLUSTERS.forEach(c => {
    const a0 = rnd2() * Math.PI * 2;
    for (let k = 0; k < c.n; k++){
      const ang = a0 + (k / c.n) * Math.PI * 2 + (rnd2() * 2 - 1) * CL_JIT_A;
      const rr  = CL_R + (rnd2() * 2 - 1) * CL_JIT_R;
      const px  = c.x + Math.cos(ang) * rr;
      const pz  = c.z + Math.sin(ang) * rr;
      boats.push({
        x: px, z: pz,
        ry: Math.atan2(c.x - px, c.z - pz) + (rnd2() * 2 - 1) * CL_JIT_H,   // bow -> float centre
        ph: rnd2() * Math.PI * 2,
        jib: -1,
        can: false,                                      // moored to the shared float, not a can
      });
      spokes.push({ cx: c.x, cz: c.z, ang, len: rr });
    }
  });

  // Belmont + Montrose star-dock floats share one InstancedMesh
  const ALL_CLUSTERS = [...CLUSTERS, ...MONTROSE_CLUSTERS];
  // a few loose Montrose cans out in the open east water
  const montroseLooseCans = [[212, -1160], [211, -1212], [213, -1268]];

  const N = boats.length;

  // a few ROW boats get a small furled-jib triangle (they read most clearly)
  const jibList = [];
  for (let i = 3; i < rowCount && jibList.length < 3; i += Math.max(1, (rowCount / 3) | 0)) jibList.push(i);
  jibList.forEach((bi, j) => { boats[bi].jib = j; });

  // ---- instanced boat meshes (4 draw calls) ----
  const hullMat = toon(0xffffff, {});   // white base; per-instance colour tints it
  hulls = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), hullMat, N);
  masts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.055, 1, 6), toon(0x9a8a6e), N);
  booms = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), toon(0x9a8a6e), N);
  jibs  = new THREE.InstancedMesh(jibTriGeo(), toon(0xf3ecdd, { mat: { side: THREE.DoubleSide } }), Math.max(1, jibList.length));

  for (const m of [hulls, masts, booms, jibs]){
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    scene.add(m);
  }

  // ---- cans: one ahead of every ROW bow + a few loose extras ----
  const looseCans = [[120, -58], [138, -155], [104, -235], [130, -100]];
  const cans = new THREE.InstancedMesh(new THREE.SphereGeometry(0.26, 8, 6), toon(0xffffff), boats.filter(b => b.can).length + looseCans.length + montroseLooseCans.length);
  cans.frustumCulled = false;

  // ---- a few tiny gray dinghies drifting in the gaps ----
  const dinghySpots = [[128, -88, 0.7], [113, -205, -0.6], [141, -250, 2.1], [118, -45, 1.4]];
  const dinghies = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), toon(0x8a9098), dinghySpots.length);
  dinghies.frustumCulled = false;

  // ---- star-dock central floats (1 draw call) ----
  const floats = new THREE.InstancedMesh(new THREE.CylinderGeometry(FLOAT_R, FLOAT_R, FLOAT_H, 8), toon(0x8a6a44), ALL_CLUSTERS.length);
  floats.frustumCulled = false;

  // ---- star-dock radial spokes: thin planks from float out under each bow (1 draw call) ----
  const spokeMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.1, 1), toon(0x7c5f3d), Math.max(1, spokes.length));
  spokeMesh.frustumCulled = false;

  // ---- write static boat matrices + hull colours + cans ----
  let canIdx = 0;
  for (let i = 0; i < N; i++){
    const b = boats[i];
    boatWorld(b, 0);
    setPart(hulls, i, hullLocal);
    setPart(masts, i, mastLocal);
    setPart(booms, i, boomLocal);
    if (b.jib >= 0) setPart(jibs, b.jib, jibLocal);
    const crng = (i < belmontBoatCount) ? rnd : rnd2;   // Belmont draws stay bit-identical; Montrose from rnd2
    const hex = (crng() < DARK_PROB) ? DARK[(crng() * DARK.length) | 0] : LIGHT[(crng() * LIGHT.length) | 0];
    hulls.setColorAt(i, _col.setHex(hex));
    if (b.can){
      const fx = Math.sin(b.ry), fz = Math.cos(b.ry), d = HULL_HALF_LEN + 0.9;   // can just ahead of the bow
      _mP.compose(_v.set(b.x + fx * d, WATER_Y + 0.14, b.z + fz * d), _IDENT, _v2.set(1, 0.8, 1));
      cans.setMatrixAt(canIdx++, _mP);
    }
  }
  looseCans.forEach(([x, z]) => {
    _mP.compose(_v.set(x, WATER_Y + 0.14, z), _IDENT, _v2.set(1, 0.8, 1));
    cans.setMatrixAt(canIdx++, _mP);
  });
  montroseLooseCans.forEach(([x, z]) => {
    _mP.compose(_v.set(x, WATER_Y + 0.14, z), _IDENT, _v2.set(1, 0.8, 1));
    cans.setMatrixAt(canIdx++, _mP);
  });
  dinghySpots.forEach(([x, z, ry], k) => {
    _qh.setFromAxisAngle(_yAxis, ry);
    _mP.compose(_v.set(x, WATER_Y + 0.02, z), _qh, _v2.set(0.55, 0.22, 0.95));
    dinghies.setMatrixAt(k, _mP);
  });

  // ---- write star-dock floats + spokes (Belmont + Montrose) ----
  ALL_CLUSTERS.forEach((c, k) => {
    _mP.compose(_v.set(c.x, WATER_Y + 0.16, c.z), _IDENT, _one);
    floats.setMatrixAt(k, _mP);
  });
  spokes.forEach((s, k) => {
    const sry = Math.atan2(Math.cos(s.ang), Math.sin(s.ang));   // box +z points radially outward
    _qh.setFromAxisAngle(_yAxis, sry);
    _mP.compose(_v.set(s.cx + Math.cos(s.ang) * s.len * 0.5, WATER_Y + 0.14, s.cz + Math.sin(s.ang) * s.len * 0.5), _qh, _v2.set(1, 1, s.len));
    spokeMesh.setMatrixAt(k, _mP);
  });

  hulls.instanceColor.needsUpdate = true;
  cans.instanceMatrix.needsUpdate = dinghies.instanceMatrix.needsUpdate = true;
  floats.instanceMatrix.needsUpdate = spokeMesh.instanceMatrix.needsUpdate = true;
  scene.add(cans, dinghies, floats, spokeMesh);

  // ---- central slip-dock plank deck (1 draw call; purely visual, no walk rect) ----
  if (INCLUDE_ARM){
    const armLen = ARM_Z0 - ARM_Z1;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(ARM_W, 0.3, armLen), toon(0x8a6a44));
    arm.position.set(ARM_X, WATER_Y + 0.22, (ARM_Z0 + ARM_Z1) / 2);
    arm.frustumCulled = false;
    scene.add(arm);
  }

  // ---- gentle shared bob/roll (static is acceptable, but this is cheap) ----
  registerUpdate((dt, t) => {
    for (let i = 0; i < N; i++){
      const b = boats[i];
      boatWorld(b, t);
      setPart(hulls, i, hullLocal);
      setPart(masts, i, mastLocal);
      setPart(booms, i, boomLocal);
      if (b.jib >= 0) setPart(jibs, b.jib, jibLocal);
    }
    hulls.instanceMatrix.needsUpdate = true;
    masts.instanceMatrix.needsUpdate = true;
    booms.instanceMatrix.needsUpdate = true;
    jibs.instanceMatrix.needsUpdate = true;
  });
});
