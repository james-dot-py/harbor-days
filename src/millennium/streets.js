// =====================================================================
// MILLENNIUM PARK — scenery streets + furniture layer (task 041, executor A).
// The quiet-downtown register that FRAMES the park: road asphalt, curbs, a
// low ornamental park fence + stone planters along every BARRIER_M line, the
// park's signature quad-globe iron lamps with warm glow + colorful pennant
// banners, a sprinkle of parked toon cars, and the Millennium Station grate.
//
// Everything attaches to millenniumRoot. All randomness is LOCAL (mulberry32
// seed below) — never the shared world rng (determinism hard constraint).
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { millenniumRoot, emitInstanced, flatGrid } from './index.js';
import { toon, bmat, mulberry32, pointsMat } from '../core.js';
import { collide } from '../props.js';
import { createUrbanKit } from '../urbankit.js';
import * as M from '../data/millennium.js';

const mergeGeos = arr => BufferGeometryUtils.mergeBufferGeometries(arr.map(g => g.index ? g.toNonIndexed() : g), false);

export function buildStreets() {
  // LOCAL deterministic rng — the ONLY source of randomness in this file.
  const R = mulberry32(0x4d5100);
  const rr = (a, b) => a + (b - a) * R();

  const UBOX = new THREE.BoxGeometry(1, 1, 1);   // shared unit box for instanced solids

  // ------------------------------------------------------------------
  // 1. ROAD ASPHALT (curve-shaded ground planes, folded by mergeCellStatic)
  // ------------------------------------------------------------------
  const RD = 0x45454d;
  millenniumRoot.add(flatGrid(16, 251, -0.04, RD, 40, 809.5));   // Michigan   x32-48  z684-935
  millenniumRoot.add(flatGrid(184, 12, -0.04, RD, 124, 698));    // Randolph   x32-216 z692-704
  millenniumRoot.add(flatGrid(184, 14, -0.04, RD, 124, 901));    // Monroe     x32-216 z894-908
  millenniumRoot.add(flatGrid(10, 216, -0.04, RD, 195, 800));    // Columbus   x190-200 z692-908

  // ------------------------------------------------------------------
  // 2. CURBS — thin light-grey box along the PARK-SIDE edge of each road
  //    (one instanced bucket, colour 0x9c968a)
  // ------------------------------------------------------------------
  emitInstanced(UBOX, [
    { pos: [48, 0.07, 799.5], scale: [0.3, 0.14, 189], color: 0x9c968a },   // Michigan x48
    { pos: [118.5, 0.07, 704], scale: [141, 0.14, 0.3], color: 0x9c968a },  // Randolph z704
    { pos: [118.5, 0.07, 894], scale: [141, 0.14, 0.3], color: 0x9c968a },  // Monroe   z894
    { pos: [190, 0.07, 799.5], scale: [0.3, 0.14, 173], color: 0x9c968a },  // Columbus x190
  ]);

  // ------------------------------------------------------------------
  // 3. PARK FENCE (dark iron posts + top rail) + STONE PLANTERS along every
  //    BARRIER_M segment. Posts & rails share ONE bucket (same colour +
  //    same UBOX geometry); planters are two buckets (stone body + green top).
  // ------------------------------------------------------------------
  const IRON = 0x2b2b30, STONE = 0xb4a892, GREEN = 0x4f7a3e;
  const fence = [];        // posts + rails  (colour IRON)
  const stone = [];        // planter bodies (colour STONE)
  const tops = [];         // planter tops   (colour GREEN)
  const CX = 118.5, CZ = 799.5;   // park interior centre (for the outward road-side normal)

  for (const seg of M.BARRIER_M) {
    const [ax, az] = seg.a, [bx, bz] = seg.b;
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
    const ux = dx / len, uz = dz / len;
    const vertical = Math.abs(dx) < Math.abs(dz);          // N-S run (constant x)?
    const nx = vertical ? (ax < CX ? -1 : 1) : 0;          // outward (road-side) normal
    const nz = vertical ? 0 : (az < CZ ? -1 : 1);

    // posts every ~2.4 m + one top rail spanning the segment
    const nPosts = Math.max(2, Math.round(len / 2.4));
    for (let i = 0; i <= nPosts; i++) {
      const t = i / nPosts;
      fence.push({ pos: [ax + dx * t, 0.5, az + dz * t], scale: [0.1, 1.0, 0.1], color: IRON });
    }
    fence.push({
      pos: [(ax + bx) / 2, 0.95, (az + bz) / 2],
      scale: vertical ? [0.08, 0.08, len] : [len, 0.08, 0.08], color: IRON,
    });

    // planters spaced ~8 m, pushed to the ROAD side of the fence line
    const psc = vertical ? [0.8, 0.5, 1.4] : [1.4, 0.5, 0.8];    // long axis along the fence
    for (let d = 4; d <= len - 4; d += 8) {
      const px = ax + ux * d + nx * 1.3, pz = az + uz * d + nz * 1.3;
      stone.push({ pos: [px, 0.25, pz], scale: psc, color: STONE });
      tops.push({ pos: [px, 0.55, pz], scale: [psc[0] * 0.86, 0.14, psc[2] * 0.86], color: GREEN });
      collide(px, pz, 0.8);
    }

    // belt-and-suspenders: a few light colliders on the fence line itself
    for (let d = 8; d <= len - 8; d += 16) collide(ax + ux * d, az + uz * d, 0.3);
  }
  emitInstanced(UBOX, fence);
  emitInstanced(UBOX, stone);
  emitInstanced(UBOX, tops);

  // ------------------------------------------------------------------
  // 4. QUAD-GLOBE IRON LAMPS — the park's signature fixture. One merged
  //    pole+cross-arm archetype (1 bucket), 4 glowing globes per lamp
  //    (1 bucket), one THREE.Points warm glow for the whole set (1 draw).
  //    Pennant banners hang from the spine + promenade lamps (item 5).
  // ------------------------------------------------------------------
  const lampGeo = (() => {
    const base = new THREE.CylinderGeometry(0.22, 0.28, 0.5, 8); base.translate(0, 0.25, 0);
    const pole = new THREE.CylinderGeometry(0.1, 0.13, 4.2, 8); pole.translate(0, 2.15, 0);
    const armX = new THREE.BoxGeometry(1.5, 0.09, 0.09); armX.translate(0, 3.95, 0);
    const armZ = new THREE.BoxGeometry(0.09, 0.09, 1.5); armZ.translate(0, 3.95, 0);
    const fin = new THREE.ConeGeometry(0.14, 0.42, 8); fin.translate(0, 4.5, 0);
    return mergeGeos([base, pole, armX, armZ, fin]);
  })();
  const globeGeo = new THREE.SphereGeometry(0.28, 10, 8);
  const ARM = 0.75;

  // lamp placements: {x,z, banner:true} where banner = spine/promenade lamps
  const lamps = [];
  for (let z = 715; z <= 890; z += 25) lamps.push({ x: M.STREETWALL_M.lampX, z, banner: true }); // Michigan spine
  for (const ex of [98, 118]) for (let z = 720; z <= 872; z += 28) lamps.push({ x: ex, z, banner: true }); // promenade edges
  for (let x = 60; x <= 180; x += 30) lamps.push({ x, z: 710, banner: false });   // Randolph walk
  for (let x = 60; x <= 180; x += 30) lamps.push({ x, z: 890, banner: false });   // Monroe walk

  const poles = [], globes = [], pennants = [];
  const PENN = [0xd23b2e, 0xf2c14e, 0x3a72c4];     // red / yellow / blue
  const pennGeo = (() => {                          // back-to-back hanging triangle (visible both sides)
    const w = 1.0, h = 1.15;
    const A = [-w / 2, 0, 0], B = [w / 2, 0, 0], C = [0, -h, 0];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...A, ...B, ...C, ...A, ...C, ...B]), 3));
    return g;
  })();

  for (const l of lamps) {
    poles.push({ pos: [l.x, 0, l.z], color: IRON });
    for (const [gx, gz] of [[ARM, 0], [-ARM, 0], [0, ARM], [0, -ARM]])
      globes.push({ pos: [l.x + gx, 3.85, l.z + gz], color: 0xfff2c8 });
    collide(l.x, l.z, 0.35);
  }
  // PENNANT BUNTING — strings of colorful flags between consecutive banner
  // lamps down each row (the Michigan spine + both promenade edges). Oriented
  // broadside (face ±x) to a viewer in the allee; a catenary droop between poles.
  {
    const rows = new Map();
    for (const l of lamps) if (l.banner) { const k = Math.round(l.x); (rows.get(k) || rows.set(k, []).get(k)).push(l); }
    let pi = 0;
    for (const row of rows.values()) {
      row.sort((a, b) => a.z - b.z);
      for (let i = 0; i < row.length - 1; i++) {
        const a = row[i], b = row[i + 1], N = 7;
        for (let k = 1; k <= N; k++) {
          const t = k / (N + 1);
          const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
          const sag = Math.sin(t * Math.PI) * 0.4;                 // droop between the two lamp heads
          pennants.push({ pos: [x, 3.55 - sag, z], yaw: Math.PI / 2, color: PENN[pi++ % 3] });
        }
      }
    }
  }
  emitInstanced(lampGeo, poles);
  emitInstanced(globeGeo, globes, { basic: true });
  emitInstanced(pennGeo, pennants, { basic: true });

  // warm glow cloud — ONE THREE.Points for every lamp cluster
  {
    const n = lamps.length;
    const gp = new Float32Array(n * 3), aC = new Float32Array(n * 3), aS = new Float32Array(n);
    lamps.forEach((l, i) => { gp.set([l.x, 4.0, l.z], i * 3); aC.set([1, 0.9, 0.62], i * 3); aS[i] = 4.2; });
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.BufferAttribute(gp, 3));
    gg.setAttribute('aColor', new THREE.BufferAttribute(aC, 3));
    gg.setAttribute('aSize', new THREE.BufferAttribute(aS, 1));
    millenniumRoot.add(new THREE.Points(gg, pointsMat()));
  }

  // ------------------------------------------------------------------
  // 6. SPARSE TOON CARS on the scenery roads (baked into the static merge).
  //    NOTE: the kit car's body length runs along local +x, so N-S roads
  //    (Michigan/Columbus) need yaw=PI/2 and E-W roads (Randolph/Monroe)
  //    yaw=0 to sit ALONG their lane.
  // ------------------------------------------------------------------
  const kit = createUrbanKit();
  const PAL = [0x2f3a4a, 0x8a2b2b, 0xcfc8ba, 0x30506a, 0x7a7f86];
  const TYP = ['sedan', 'suv', 'hatch'];
  const pick = arr => arr[Math.floor(rr(0, arr.length))];
  const NS = Math.PI / 2, EW = 0;
  const cars = [
    [44, 735, NS], [36, 815, NS], [44, 870, NS],   // Michigan
    [80, 697, EW], [150, 700, EW],                 // Randolph
    [110, 901, EW],                                // Monroe
    [195, 740, NS], [195, 860, NS],                // Columbus
  ];
  for (const [x, z, yaw] of cars) kit.car({ x, z, yaw, type: pick(TYP), color: pick(PAL) });
  kit.emitMerged({ solid: (g, mat) => millenniumRoot.add(new THREE.Mesh(g, mat)), collide });

  // ------------------------------------------------------------------
  // 7. MILLENNIUM STATION GRATE — dark iron plate on the Randolph sidewalk.
  // ------------------------------------------------------------------
  millenniumRoot.add(flatGrid(2, 2, 0.02, 0x22242a, M.WRIGLEY_SQ_M.grate.x, M.WRIGLEY_SQ_M.grate.z));
}
