// =====================================================================
// CROWD — shared instanced-crowd tech (extracted from lolla.js, task 064).
// Bucketed InstancedMeshes: 6 shirt-color body buckets + 3 skin-color head
// buckets = 9 draw calls for ANY crowd size. Per-frame animation is a
// matrix re-stamp (one compose per person, zero allocation).
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon } from './core.js';

export const CROWD_SHIRT = [0x1c3f6e, 0xb03a2e, 0xe8e4da, 0xc9a36a, 0x5a7d9a, 0x3f7d3a];
export const CROWD_SKIN  = [0xcaa07a, 0x8a5a3c, 0xf0c8a0];

// ---- hoisted per-frame scratch (zero allocation in stampCrowd) ---------
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(),
      V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1);

// 'standing' | 'seated' → { body, head } merged geometries.
export function crowdGeos(kind) {
  if (kind === 'seated') {
    // ORIGIN AT THE BENCH SEAT TOP — caller sets V.y to the bench top.
    const body = [
      new THREE.SphereGeometry(0.34, 8, 6).scale(1, 1.22, 1).translate(0, 0.42, 0),  // torso
      new THREE.SphereGeometry(0.11, 6, 5).translate(-0.36, 0.55, 0.05),              // arm nubs
      new THREE.SphereGeometry(0.11, 6, 5).translate(0.36, 0.55, 0.05),
      new THREE.BoxGeometry(0.15, 0.16, 0.42).translate(-0.12, 0.10, 0.24),           // thighs (knees forward)
      new THREE.BoxGeometry(0.15, 0.16, 0.42).translate(0.12, 0.10, 0.24),
      new THREE.BoxGeometry(0.14, 0.34, 0.15).translate(-0.12, -0.12, 0.42),          // shins
      new THREE.BoxGeometry(0.14, 0.34, 0.15).translate(0.12, -0.12, 0.42),
    ];
    return {
      body: BufferGeometryUtils.mergeBufferGeometries(body, false),
      head: new THREE.SphereGeometry(0.27, 8, 6).translate(0, 0.95, 0.03),
    };
  }
  // 'standing' — byte-identical to lolla's original bodyGeo()/headGeo().
  const body = [
    new THREE.SphereGeometry(0.34, 8, 6).scale(1, 1.35, 1).translate(0, 0.62, 0),     // squat torso
    new THREE.SphereGeometry(0.11, 6, 5).translate(-0.38, 0.78, 0),                    // arm nubs
    new THREE.SphereGeometry(0.11, 6, 5).translate(0.38, 0.78, 0),
    new THREE.BoxGeometry(0.15, 0.5, 0.16).translate(-0.12, 0.25, 0),                  // leg stubs
    new THREE.BoxGeometry(0.15, 0.5, 0.16).translate(0.12, 0.25, 0),
  ];
  return {
    body: BufferGeometryUtils.mergeBufferGeometries(body, false),
    head: new THREE.SphereGeometry(0.27, 8, 6).translate(0, 1.18, 0),                  // BIG chibi head
  };
}

// people: array of {x, z, yaw, sc, shirt (0-5 int), skin (0-2 int), ...pack fields}.
// Assigns p.bi / p.hi bucket indices. Creates 6 body + 3 head InstancedMesh
// (DynamicDrawUsage, frustumCulled = false, name = namePrefix + '-body'/'-head'),
// adds them to root. Returns { people, bodyMesh, headMesh, bodyBuckets, headBuckets }.
export function makeCrowd(root, people, kind, namePrefix) {
  const bodyBuckets = [[], [], [], [], [], []];
  const headBuckets = [[], [], []];
  for (const p of people) {
    p.bi = bodyBuckets[p.shirt].length; bodyBuckets[p.shirt].push(p);
    p.hi = headBuckets[p.skin].length;  headBuckets[p.skin].push(p);
  }
  const { body: BG, head: HG } = crowdGeos(kind);
  const bodyMesh = CROWD_SHIRT.map((c, i) => {
    const m = new THREE.InstancedMesh(BG, toon(c), Math.max(1, bodyBuckets[i].length));
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false;
    m.name = namePrefix + '-body'; root.add(m); return m;
  });
  const headMesh = CROWD_SKIN.map((c, i) => {
    const m = new THREE.InstancedMesh(HG, toon(c), Math.max(1, headBuckets[i].length));
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false;
    m.name = namePrefix + '-head'; root.add(m); return m;
  });
  return { people, bodyMesh, headMesh, bodyBuckets, headBuckets };
}

// Per-frame re-stamp. poseFn(p, E, V, S) must FULLY set the hoisted Euler E
// (with explicit rotation order if non-default), position V and scale S for
// person p every call. Composes and writes the SAME matrix into the person's
// body and head instance slots, then flags all 9 instanceMatrix buffers.
export function stampCrowd(crowd, poseFn) {
  const { people, bodyMesh, headMesh } = crowd;
  for (let i = 0; i < people.length; i++) {
    const p = people[i];
    poseFn(p, E, V, S);
    Q.setFromEuler(E);
    M.compose(V, Q, S);
    bodyMesh[p.shirt].setMatrixAt(p.bi, M);
    headMesh[p.skin].setMatrixAt(p.hi, M);
  }
  for (let i = 0; i < 6; i++) bodyMesh[i].instanceMatrix.needsUpdate = true;
  for (let i = 0; i < 3; i++) headMesh[i].instanceMatrix.needsUpdate = true;
}
