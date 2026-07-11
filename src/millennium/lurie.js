// =====================================================================
// LURIE GARDEN (SE) — task 046.  The park's quiet room: a big clipped
// SHOULDER HEDGE wall wrapping the N + W edges (the "big shoulders" wink),
// grown inside a visible dark-steel ARMATURE CAGE with the frame lips proud;
// a SALVIA RIVER + prairie perennial masses sweeping the two soil plates;
// and the wood SEAM BOARDWALK (a diagonal plank walk over the rill) dressed
// with plank cross-seams and a low SITTABLE edge curb.  The NE hedge break
// is the garden's gate.
//
// COPYRIGHT REGISTER (BRIEF/LOCATIONS owner rule): Lurie Garden (Gustafson
// Guthrie Nichol + Piet Oudolf) is a copyrighted landscape — this is a
// chunky toon HOMAGE that captures the hedge-wall + boardwalk + planting-
// tapestry READ, never a plant-for-plant replica.  No traced geometry, no
// photo textures.
//
// DRAW-CALL DISCIPLINE (PITFALLS): toon(hex) is CACHE-KEYED by color, so a
// BoxGeometry mesh reusing a color already in the STATIC merge pool folds
// into that color's bucket at mergeCellStatic (index.js, bandW 1e6 = one
// bucket per material) for +0 draws.  Every hedge / armature / gate / plank /
// rail piece reuses a pritzker/index color via BoxGeometry → +0.  The ONLY
// new draws are the 3 instanced planting buckets (salvia / amsonia / grass),
// each an InstancedMesh (frustumCulled=false → drawn in EVERY view) → +3.
//
// DETERMINISM: LOCAL mulberry32 only (never the shared world rng — moving a
// single lakefront towel is a hard-constraint regression).  Everything is
// attached to millenniumRoot and merged at build.
//
// Geometry law: GEOGRAPHY.md MILLENNIUM_GEOGRAPHY + data LURIE_M — bounds
// 124–179 × 842–892; hedgeN 128–170 × 846–851 (h4.5), hedgeW 124–129 ×
// 846–876 (h4.5); the Seam boardwalk a[175,849.5]→b[144,874] (halfW2.5);
// plates light [153.6,852.5] (NW) + dark [167.7,870.7] (SE).  The ground
// (floor / soil plates / paved walks / wood boardwalk strip) is already laid
// by index.js buildGround — this builder adds the hero geometry ON TOP.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { millenniumRoot, emitInstanced } from './index.js';
import { toon, bmat, mulberry32 } from '../core.js';
import { collide } from '../props.js';
import * as M from '../data/millennium.js';

const _r = mulberry32(0x4c555249);              // 'LURI' — local, never the world rng
const rr = (a, b) => a + (b - a) * _r();

// ---- palette: every static color is ALREADY in the merge pool -----------
const COL = {
  hedge: 0x496b33,   // pritzker lawn-edge hedge (static pool) — clipped-hedge green
  steel: 0x2b2f36,   // pritzker proscenium frame (static pool) — dark-steel armature/gate
  plank: 0x8f6836,   // pritzker fir shade panels (static pool) — boardwalk cross-seams
  rail:  0x8a6b46,   // index deck/boardwalk wood (static pool) — sit-rail curb
};
// ---- planting: the ONLY new draws (3 instanced buckets) -----------------
const PLANT = {
  salvia: 0x6f4f92,  // the salvia river (purple)
  gold:   0xcaa63c,  // amsonia / gold perennial mass
  grass:  0x8a8a4e,  // prairie grass russet-green
};

// small merged 3-blade tuft (~0.6 m tall, base at y0); instanced, so its
// attributes never need to fold — one shared geo for all 3 planting colors.
function makeTuft() {
  const blade = () => { const g = new THREE.CylinderGeometry(0.015, 0.09, 0.6, 4); g.translate(0, 0.3, 0); return g; };
  const geos = [];
  for (const [dx, dz, tilt] of [[0, 0, 0], [0.09, 0.05, 0.24], [-0.08, -0.05, -0.22]]) {
    const g = blade(); g.rotateZ(tilt); g.translate(dx, 0, dz); geos.push(g);
  }
  return BufferGeometryUtils.mergeBufferGeometries(geos, false);
}

export function buildLurie() {
  const LU = M.LURIE_M, root = millenniumRoot;
  const hedgeMat = toon(COL.hedge), steelMat = toon(COL.steel);
  const plankMat = toon(COL.plank), railMat = toon(COL.rail);
  // pritzker-style corner-addressed box helper (folds by material at merge)
  const box = (x0, x1, y0, y1, z0, z1, mat) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); root.add(b); return b;
  };

  // ============ 1. SHOULDER HEDGE — clipped wall on N + W edges ==========
  // Each run is a row of ~2.7 m box segments (per-segment height jitter +
  // a narrower crown cap) so it reads as merged chunky topiary, not a slab;
  // then a dark-steel armature cage stands proud of the hedge faces; then a
  // solid collider line so the wall stops the player.
  function hedgeRun(x0, x1, z0, z1, h) {
    const alongX = (x1 - x0) >= (z1 - z0);
    const runLen = alongX ? (x1 - x0) : (z1 - z0);
    const n = Math.max(1, Math.round(runLen / 2.7)), seg = runLen / n;
    for (let i = 0; i < n; i++) {
      const jh = h + rr(-0.25, 0.25);                     // lumpy clipped crown
      if (alongX) {
        const a = x0 + i * seg, b = a + seg;
        box(a, b, 0, jh, z0, z1, hedgeMat);
        box(a + 0.35, b - 0.35, jh, jh + 0.4, z0 + 0.4, z1 - 0.4, hedgeMat);   // narrower crown cap
      } else {
        const a = z0 + i * seg, b = a + seg;
        box(x0, x1, 0, jh, a, b, hedgeMat);
        box(x0 + 0.4, x1 - 0.4, jh, jh + 0.4, a + 0.35, b - 0.35, hedgeMat);
      }
    }
  }
  // dark-steel armature: verticals every ~3 m on BOTH faces + a top-rail lip,
  // all standing ~0.15 m proud (outboard + taller) of the hedge — the cage read
  function armature(x0, x1, z0, z1, h) {
    const alongX = (x1 - x0) >= (z1 - z0);
    const runLen = alongX ? (x1 - x0) : (z1 - z0);
    const n = Math.max(2, Math.round(runLen / 3) + 1), top = h + 0.2, P = 0.15;
    if (alongX) {
      for (let i = 0; i < n; i++) {
        const x = x0 + (x1 - x0) * i / (n - 1);
        box(x - 0.08, x + 0.08, 0, top, z0 - P - 0.08, z0 - P + 0.08, steelMat);
        box(x - 0.08, x + 0.08, 0, top, z1 + P - 0.08, z1 + P + 0.08, steelMat);
      }
      box(x0, x1, top - 0.16, top, z0 - P - 0.08, z0 - P + 0.08, steelMat);     // top-rail lip (N face)
      box(x0, x1, top - 0.16, top, z1 + P - 0.08, z1 + P + 0.08, steelMat);     // top-rail lip (S face)
    } else {
      for (let i = 0; i < n; i++) {
        const z = z0 + (z1 - z0) * i / (n - 1);
        box(x0 - P - 0.08, x0 - P + 0.08, 0, top, z - 0.08, z + 0.08, steelMat);
        box(x1 + P - 0.08, x1 + P + 0.08, 0, top, z - 0.08, z + 0.08, steelMat);
      }
      box(x0 - P - 0.08, x0 - P + 0.08, top - 0.16, top, z0, z1, steelMat);     // top-rail lip (W face)
      box(x1 + P - 0.08, x1 + P + 0.08, top - 0.16, top, z0, z1, steelMat);     // top-rail lip (E face)
    }
  }
  const hN = LU.hedgeN, hW = LU.hedgeW;
  hedgeRun(hN.x0, hN.x1, hN.z0, hN.z1, hN.h);  armature(hN.x0, hN.x1, hN.z0, hN.z1, hN.h);
  hedgeRun(hW.x0, hW.x1, hW.z0, hW.z1, hW.h);  armature(hW.x0, hW.x1, hW.z0, hW.z1, hW.h);
  // the hedge is a WALL — dense collider line down both runs (~2 m spacing)
  for (let x = hN.x0 + 1; x <= hN.x1 - 1; x += 2) collide(x, (hN.z0 + hN.z1) / 2, 1.8);
  for (let z = hW.z0 + 1; z <= hW.z1 - 1; z += 2) collide((hW.x0 + hW.x1) / 2, z, 1.8);

  // ============ 5. NE GATE — armature posts flanking the break ===========
  // hedgeN stops at x170; the gateNE walk is the main entry. Mark it with a
  // pair of dark-steel posts flanking the opening (a touch taller than 4.5).
  box(169.6, 170.4, 0, 4.8, 846.6, 847.4, steelMat);
  box(169.6, 170.4, 0, 4.8, 850.6, 851.4, steelMat);
  collide(170, 847, 0.5); collide(170, 851, 0.5);

  // ============ 4. SEAM BOARDWALK DETAIL (wood strip exists at y0.02) =====
  const sa = LU.seam.a, sb = LU.seam.b, hw = LU.seam.halfW;
  const cx = (sa[0] + sb[0]) / 2, cz = (sa[1] + sb[1]) / 2;
  const dx = sb[0] - sa[0], dz = sb[1] - sa[1], len = Math.hypot(dx, dz);
  const yaw = Math.atan2(dx, dz);                 // index segStrip convention
  const px = dz / len, pz = -dx / len;            // lateral (local +x) unit
  // plank cross-seams: thin lines ACROSS the walk every ~1.3 m, just proud
  for (let t = 0.04; t <= 0.96; t += 1.3 / len) {
    const x = sa[0] + dx * t, z = sa[1] + dz * t;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(2 * hw - 0.1, 0.04, 0.1), plankMat);
    plank.position.set(x, 0.05, z); plank.rotation.y = yaw;
    root.add(plank);
  }
  // sittable edge: the +halfW (NE) edge keeps a LOW wood-beam curb (0.35 m) so
  // it never blocks the down-the-rill camera framings; the −halfW (SW) edge is
  // a REAL backless wood bench (task 048/0b) so the mayor sits ON it with feet
  // dangling over the rill — seat top y≈0.42 matches sitOnBench's 0.34 hip lift,
  // and the whole bench stays ≤0.5 m so it clears the mp-lurie framings.
  const runL = len - 0.6;
  // +halfW edge: low curb (unchanged read)
  {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, runL), railMat);
    beam.position.set(cx + hw * px, 0.175, cz + hw * pz); beam.rotation.y = yaw;
    root.add(beam);
  }
  // −halfW edge: backless bench — a 0.30-deep seat plank centered at lateral
  // −2.2 (spans −2.05…−2.35, so both sit spots at −2.15 land ON it), seat top
  // y≈0.42; an outboard skirt/apron board drops to y0 under the seat's outer
  // edge so it reads as a bench, not a floating plank.
  {
    const seatL = -2.2, skirtL = -2.32;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.10, runL), railMat);
    seat.position.set(cx + seatL * px, 0.37, cz + seatL * pz); seat.rotation.y = yaw;
    root.add(seat);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, runL), railMat);
    skirt.position.set(cx + skirtL * px, 0.17, cz + skirtL * pz); skirt.rotation.y = yaw;
    root.add(skirt);
  }

  // ============ 2+3. PLANTING — salvia river + prairie masses ============
  // Exactly 3 color buckets (emitInstanced groups by color → 3 InstancedMesh).
  // CLUSTERED, weighted toward the light plate, the dark plate and the
  // boardwalk sightlines (task-025 lesson: clustered reads beat uniform).
  // Kept OFF every walk: >2.9 from the boardwalk centerline, out of the
  // gateNE / linkSW / southRim quads and off the hedge footprints.
  const tuftGeo = makeTuft();
  const inRect = (r, pad = 0) => (x, z) => x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;
  const onGate = inRect(LU.gateNE), onLink = inRect(LU.linkSW), onRim = inRect(LU.southRim);
  const onHN = inRect(LU.hedgeN, 0.3), onHW = inRect(LU.hedgeW, 0.3);
  const plantable = (x, z) => {
    if (x < 130 || x > 178 || z < 852 || z > 877) return false;   // interior soil/floor only
    // distance to the boardwalk centerline segment
    let t = ((x - sa[0]) * dx + (z - sa[1]) * dz) / (len * len);
    t = Math.max(0, Math.min(1, t));
    if (Math.hypot(x - (sa[0] + dx * t), z - (sa[1] + dz * t)) < 2.9) return false;
    return !(onGate(x, z) || onLink(x, z) || onRim(x, z) || onHN(x, z) || onHW(x, z));
  };
  const recs = [];
  const scatter = (centers, count, spread, color) => {
    let placed = 0;
    for (let tries = 0; tries < count * 14 && placed < count; tries++) {
      const c = centers[(_r() * centers.length) | 0];
      const x = c[0] + (rr(-1, 1) + rr(-1, 1)) * spread;   // triangular clustering
      const z = c[1] + (rr(-1, 1) + rr(-1, 1)) * spread;
      if (!plantable(x, z)) continue;
      const s = rr(0.8, 1.4);
      recs.push({ pos: [x, 0, z], yaw: rr(0, 6.283), scale: [s, rr(1.0, 1.8), s], color });
      placed++;
    }
  };
  // Dense CLUSTERED drifts (task-025: clustered reads beat uniform density) —
  // tight spread hugging the plate + boardwalk-sightline centers so the room
  // reads as lush perennial masses, never a thin flower bed.
  // salvia river — sweeps the LIGHT PLATE diagonally toward the boardwalk (SE)
  scatter([[150.5, 853], [152.5, 854.5], [154.5, 856], [156.5, 858], [158.5, 860], [160.5, 862], [162, 863.5]], 96, 1.8, PLANT.salvia);
  // gold amsonia mass — dark plate + boardwalk sightline + light-plate edge
  scatter([[167.7, 870.7], [165, 868], [169.5, 873], [162, 865], [150, 856], [158, 861], [153, 858]], 72, 1.9, PLANT.gold);
  // prairie grass — both plates + boardwalk flanks (the connective russet mass)
  scatter([[167.7, 870.7], [171, 872], [164, 869], [163, 861], [155, 867], [150, 870], [169, 867], [159, 858], [152, 861], [157, 864]], 92, 2.0, PLANT.grass);
  emitInstanced(tuftGeo, recs);   // groups by color → salvia / gold / grass buckets (+3 draws)
}
