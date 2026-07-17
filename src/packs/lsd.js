// =====================================================================
//  LAKE SHORE DRIVE — ambient toon traffic. The static berm, road ribbon
//  and underpass portals build in structures.js; this pack adds the cars
//  that whoosh both ways along the road (like the passing L is today's
//  hook). Two InstancedMeshes (bodies + cabins, 2 draw calls), animated
//  from hoisted scratch matrices — no per-frame allocations. Placement /
//  colours use a LOCAL mulberry32 (seed 90210) so the shared world rng /
//  determinism is never touched. Cars live entirely on the berm road
//  (x 2.5-11.5), which is outside the walkable park, so no collisions.
// =====================================================================
import { onWorldReady, registerUpdate } from '../framework.js';
import * as THREE from 'three';
import { scene, toon } from '../core.js';

// local deterministic rng — never the shared core rng()/rand()
function m32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// road extents (match CH.LSD in data/chicago.js: berm z0 -1094, road y 1.02)
// Z0 -1094 (was -846): MONTROSE growth — cars run the full new berm length. N is
// a FIXED count (2 InstancedMeshes), so the longer range adds no draw calls and
// touches no shared rng (placement uses the local m32(90210) only).
const Z0 = -1094, Z1 = 316, LEN = Z1 - Z0;
const CAR_Y = 1.02 + 0.65;
const LANES = [                         // x lane, travel direction (+z south / -z north)
  { x: 3.6, dir: 1 }, { x: 5.6, dir: 1 },
  { x: 8.4, dir: -1 }, { x: 10.4, dir: -1 },
];
const COLORS = [0xd94f4f, 0x4f7dd9, 0xf2ede0, 0xf4c430, 0x59b36b];
const N = 13;
const SPEED_MIN = 20, SPEED_MAX = 36;

// hoisted scratch (no per-frame allocation)
const _M = new THREE.Matrix4(), _V = new THREE.Vector3(), _col = new THREE.Color();
const _IDENT = new THREE.Quaternion();
const _BODY = new THREE.Vector3(2.0, 1.1, 4.2);
const _CABIN = new THREE.Vector3(1.7, 0.9, 2.0);
const _cabinOff = new THREE.Vector3(0, 0.9, -0.2);

const cars = [];
let bodies = null, cabins = null;

function drawCars(){
  for (let i = 0; i < cars.length; i++){
    const c = cars[i];
    _M.compose(_V.set(c.x, CAR_Y, c.z), _IDENT, _BODY);
    bodies.setMatrixAt(i, _M);
    _M.compose(_V.set(c.x + _cabinOff.x, CAR_Y + _cabinOff.y, c.z + _cabinOff.z), _IDENT, _CABIN);
    cabins.setMatrixAt(i, _M);
  }
  bodies.instanceMatrix.needsUpdate = true;
  cabins.instanceMatrix.needsUpdate = true;
}

onWorldReady(() => {
  const rnd = m32(90210);

  bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon(0xffffff, {}), N);
  cabins = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon(0x2c3038), N);
  for (const m of [bodies, cabins]){ m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; }

  for (let i = 0; i < N; i++){
    const L = LANES[i % LANES.length];
    cars.push({ x: L.x, dir: L.dir, z: Z0 + rnd() * LEN, spd: SPEED_MIN + rnd() * (SPEED_MAX - SPEED_MIN) });
    bodies.setColorAt(i, _col.setHex(COLORS[(rnd() * COLORS.length) | 0]));
  }
  bodies.instanceColor.needsUpdate = true;
  drawCars();
  scene.add(bodies, cabins);

  registerUpdate((dt) => {
    for (const c of cars){
      c.z += c.dir * c.spd * dt;
      if (c.z > Z1) c.z -= LEN; else if (c.z < Z0) c.z += LEN;
    }
    drawCars();
  });
});
