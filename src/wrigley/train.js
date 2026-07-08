// THE RED LINE AT ADDISON — two visible 4-car rakes. The EAST-track train
// serves the platform (approach → dwell → depart, ~70 s loop); the WEST
// track carries a non-stop ghost pass, phase-offset. Driven by the ride
// pack (updateTrains from its registerUpdate; audio callbacks passed in),
// which also scripts dwells so the ride's fades line up with a real train.
// Builder file: geometry to wrigleyRoot, LOCAL rng only (seed 3155).
import * as THREE from 'three';
import { toon, bmat, mulberry32, clamp } from '../core.js';
import { wrigleyRoot } from './index.js';
import { STATION_W } from '../data/wrigleyville.js';

const R = mulberry32(3155);
const CAR_Y = STATION_W.tracks.y + 1.54;         // body top 10.64 — clears the canopy shell (10.68)
const PLAT_Z = (STATION_W.platform.z0 + STATION_W.platform.z1) / 2;
const Z_N = -578, Z_S = -312;                     // embankment span
const CRUISE = 16, DECEL = 40;

function buildRake(x) {
  const grp = new THREE.Group(); grp.visible = false; grp.userData.live = true;   // a pack moves this via updateTrains — exempt from the cell merge
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), V = new THREE.Vector3(), E = new THREE.Euler();
  const pitch = 14.2, carLen = 13, nCar = 4, off = (nCar - 1) / 2;
  const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 3.0, carLen), toon(0xc4c8ce), nCar);
  const belts = new THREE.InstancedMesh(new THREE.BoxGeometry(2.66, 0.5, carLen), toon(0xb5232e), nCar);   // RED Line belt
  for (let i = 0; i < nCar; i++) {
    const z = (i - off) * pitch;
    M.compose(V.set(0, 0, z), Q.identity(), S); bodies.setMatrixAt(i, M);
    M.compose(V.set(0, -0.55, z), Q.identity(), S); belts.setMatrixAt(i, M);
  }
  bodies.instanceMatrix.needsUpdate = belts.instanceMatrix.needsUpdate = true;
  grp.add(bodies, belts);
  const wins = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.85, 0.95), bmat(0xffd9a0, { side: THREE.DoubleSide }), nCar * 8);
  let wi = 0;
  for (let i = 0; i < nCar; i++) {
    const cz = (i - off) * pitch;
    for (const s of [1, -1]) {
      E.set(0, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0); Q.setFromEuler(E);
      for (let w = 0; w < 4; w++) { M.compose(V.set(s * 1.32, 0.35, cz + (w - 1.5) * 3.0), Q, S); wins.setMatrixAt(wi++, M); }
    }
  }
  wins.instanceMatrix.needsUpdate = true; grp.add(wins); Q.identity();
  const half = off * pitch + carLen / 2;
  const lights = new THREE.InstancedMesh(new THREE.BoxGeometry(0.32, 0.32, 0.24), bmat(0xff2a2a), 4);
  let li = 0;
  for (const ez of [half + 0.06, -half - 0.06]) for (const dx of [-0.85, 0.85]) { M.compose(V.set(dx, -0.7, ez), Q.identity(), S); lights.setMatrixAt(li++, M); }   // proud of the belt ends (z-fight)
  lights.instanceMatrix.needsUpdate = true; grp.add(lights);
  wrigleyRoot.add(grp);
  return { grp, x, z: Z_N, dir: 1, phase: 'idle', wait: 4 + R() * 6, dwellT: 0, sp: 0, clackT: 0 };
}

let east = null, west = null;
export function buildAddisonTrains() {
  east = buildRake(STATION_W.tracks.east);
  west = buildRake(STATION_W.tracks.west);
  west.wait = 26 + R() * 10;                      // phase-offset the ghost pass
}

// ---- ride-sync controls (wrigley-ride.js) ----
// snap the east train to the platform mid-dwell (arrival: "that was my train")
export function forceDwell(secs = 4) {
  if (!east) return;
  east.dir = 1; east.z = PLAT_Z; east.phase = 'dwell'; east.dwellT = secs;
  east.sp = 0; east.grp.visible = true;
  east.grp.position.set(east.x, CAR_Y, east.z);
}
// spawn the east train 38 m out, decelerating in — dwells in ~2.5 s (boarding)
export function forceApproach() {
  if (!east) return;
  east.dir = 1; east.z = PLAT_Z - 38; east.phase = 'run';
  east.grp.visible = true;
}
export const dwelling = () => !!east && east.phase === 'dwell';

function step(T, dt, player, fx, stops) {
  if (T.phase === 'idle') {
    T.wait -= dt;
    if (T.wait <= 0) {
      T.dir = R() < 0.5 ? 1 : -1;
      T.z = T.dir > 0 ? Z_N : Z_S;
      T.phase = 'run'; T.grp.visible = true;
    }
    return;
  }
  let sp = CRUISE;
  if (T.phase === 'run') {
    if (stops) {
      const toPlat = (PLAT_Z - T.z) * T.dir;
      sp = toPlat > DECEL ? CRUISE : CRUISE * clamp(toPlat / DECEL, 0.02, 1);
      T.z += T.dir * sp * dt;
      if ((PLAT_Z - T.z) * T.dir <= 0.15) { T.z = PLAT_Z; T.phase = 'dwell'; T.dwellT = 8; sp = 0; fx.chime(); }
    } else T.z += T.dir * sp * dt;
    const endZ = T.dir > 0 ? Z_S : Z_N;
    if ((endZ - T.z) * T.dir <= 0) { T.grp.visible = false; T.phase = 'idle'; T.wait = 42 + R() * 26; T.sp = 0; return; }
  } else if (T.phase === 'dwell') {
    sp = 0; T.dwellT -= dt;
    if (T.dwellT <= 0) { T.phase = 'depart'; fx.chime(); }
  } else if (T.phase === 'depart') {
    const fromPlat = (T.z - PLAT_Z) * T.dir;
    sp = CRUISE * clamp(fromPlat / DECEL + 0.06, 0.06, 1);
    T.z += T.dir * sp * dt;
    const endZ = T.dir > 0 ? Z_S : Z_N;
    if ((endZ - T.z) * T.dir <= 0) { T.grp.visible = false; T.phase = 'idle'; T.wait = 42 + R() * 26; T.sp = 0; return; }
  }
  T.sp = sp;
  T.grp.position.set(T.x, CAR_Y, T.z);
  // clacks near the player while rolling
  if (sp > 2) {
    const d = Math.hypot(player.x - T.x, player.z - T.z);
    if (d < 60) {
      T.clackT -= dt;
      if (T.clackT <= 0) { T.clackT = clamp(3 / (sp + 0.1), 0.18, 1.2); fx.clack(); }
    }
  }
}

export function updateTrains(dt, player, fx) {
  if (!east) return;
  step(east, dt, player, fx, true);               // serves the platform
  step(west, dt, player, fx, false);              // non-stop ghost pass
}
