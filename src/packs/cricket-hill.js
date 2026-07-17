// =====================================================================
//  CRICKET HILL — the walkable kite mound (task 073). The map's FIRST hill:
//  Chicago's grassy kite mound inland-west of Montrose Harbor. The SURFACE
//  (height + walkability) lives in ONE shared definition — CH.cricketHillH —
//  used by main.js/coast.js surfaceY AND tools/walkprobe.mjs (never forked);
//  this pack only DRESSES it:
//
//    * DOME MESH     — a grassy toon dome sampled straight from CH.cricketHillH,
//      blending into the y=0 lawn carpet at its zero-slope rim (one frustum-
//      culled Mesh → +0 draws unless the hill is framed).
//    * DESIRE PATH   — a worn dirt track up the harbor-side (SE) slope to the
//      summit, laid ON the analytic surface (one Mesh).
//    * GRASS SCATTER — sparse marram-ish tufts on the lower/mid slopes, a LOCAL
//      xorshift seed, all MERGED into one Mesh (+0 InstancedMesh buckets).
//    * KITE FLYERS   — a few makeNPC chibis standing on the summit / windward
//      slope with kites aloft on swaying strings (the tableau; INTERACTIVE kite
//      flying is task 074). Kites + strings are cheap self-lit meshes that read
//      bright against the sky, gently animated in a registerUpdate.
//    * ABOUT toast   — a passive E / hand fact at the summit (no kite gameplay).
//
//  Only-my-file rules: one import line in packs/index.js, no shared edits. All
//  setup in onWorldReady. The mound is FAR NORTH (z≈-879, ~1.47 km from the
//  Belmont spawn) so baseline scenes are untouched; the NPCs cull at range and
//  every static is frustum-culled. NO shared rng (rng/rand) — all jitter is a
//  LOCAL xorshift / index-seeded phase — so world determinism is safe.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { scene, toon, bmat } from '../core.js';
import { onWorldReady, registerUpdate, makeNPC, addInteraction, toast } from '../framework.js';
import * as CH from '../data/chicago.js';

const H = CH.CRICKET_HILL;
const hAt = (x, z) => { const h = CH.cricketHillH(x, z); return h === null ? 0 : h; };   // surface height, 0 off the mound

// local deterministic jitter (no shared rng — world layout is untouched)
function mkrng(seed){ let s = seed >>> 0; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// friendly kite-flyer palettes (kite string held aloft in the wind off the lake)
const FLYER_PAL = [
  { suit:0xe4572e, pants:0x2b3a55, skin:0xe8b088, hair:0x2b2b2b },
  { suit:0x3d7dca, pants:0xf2c14e, skin:0x8d5a3b, hair:0x1a1a1a, hairStyle:'bun' },
  { suit:0x2fb37a, pants:0xd9556b, skin:0xf1c9a5, hair:0x5a3a1a, hairStyle:'tall' },
];
const KITE_LINES = [
  'ope — wind\'s perfect up here!',
  'best kite spot on the lakefront',
  'watch the string, watch the string!',
  'catch that gust?',
];

// flyers: on the summit + the windward (lake-facing, EAST) upper slope, all
// clear of the desire path; each faces roughly EAST into the lake breeze.
const FLYERS = [
  { x:106, z:-881, ry:1.42, kite:0xff5a4d, up:12.5, lean:2.6, ph:0.0 },
  { x:117, z:-875, ry:1.72, kite:0xffd23f, up:13.5, lean:3.2, ph:1.9 },
  { x:120, z:-884, ry:1.55, kite:0x39a0ed, up:11.5, lean:2.2, ph:3.6 },
];

// worn desire path — up the harbor-side (SE) slope to the summit. Centerline
// world nodes (all inside the footprint, so cricketHillH is defined on them).
const PATH_NODES = [[139,-869],[132,-872],[125,-875],[119,-877],[114,-879]];
const PATH_HALF = 1.25, PATH_COLOR = 0xb59a6f;

onWorldReady(() => {
  // ---------------------- the grassy dome mesh ----------------------
  // sampled straight from CH.cricketHillH so the visible slope IS the walk
  // surface; rim vertices sit at y=0 (flush with the lawn carpet); the mesh
  // rides 0.02 m proud so the flat rim ring never z-fights the lawn.
  {
    const w = (H.rx + 3) * 2, d = (H.rz + 3) * 2;
    const g = new THREE.PlaneGeometry(w, d, Math.round(w / 1.3), Math.round(d / 1.3));
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i) + H.cx, wz = pos.getZ(i) + H.cz;
      pos.setY(i, hAt(wx, wz));
    }
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, toon(H.grass, {}));
    mesh.position.set(H.cx, 0.02, H.cz);
    scene.add(mesh);
  }

  // ---------------------- worn desire path ----------------------
  // a dirt ribbon following the analytic surface up the SE slope (one Mesh).
  {
    const posArr = [], idx = [];
    const N = PATH_NODES.length;
    for (let i = 0; i < N; i++) {
      const a = PATH_NODES[Math.max(0, i - 1)], b = PATH_NODES[Math.min(N - 1, i + 1)];
      let tx = b[0] - a[0], tz = b[1] - a[1]; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      const px = -tz, pz = tx;                                   // lateral (perp) in xz
      const cx = PATH_NODES[i][0], cz = PATH_NODES[i][1];
      const lx = cx + px * PATH_HALF, lz = cz + pz * PATH_HALF;   // left edge
      const rx = cx - px * PATH_HALF, rz = cz - pz * PATH_HALF;   // right edge
      posArr.push(lx, hAt(lx, lz) + 0.04, lz,  rx, hAt(rx, rz) + 0.04, rz);
      if (i < N - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    pg.setIndex(idx); pg.computeVertexNormals();
    scene.add(new THREE.Mesh(pg, toon(PATH_COLOR, {})));
  }

  // ---------------------- sparse grass tufts (merged) ----------------------
  // marram-ish tufts on the lower/mid slopes only (u 0.5..0.92 — off the flat
  // summit and off the desire path), MERGED into one frustum-culled Mesh with a
  // LOCAL seed. Zero new InstancedMesh buckets; the world rng order is untouched.
  {
    const tr = mkrng(0x0c7a11), geos = [];
    const nearPath = (x, z) => {                                 // keep tufts off the worn track
      for (let i = 0; i < PATH_NODES.length - 1; i++) {
        const a = PATH_NODES[i], b = PATH_NODES[i + 1];
        const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1;
        let t = ((x - a[0]) * dx + (z - a[1]) * dz) / L2; t = Math.max(0, Math.min(1, t));
        const cx = a[0] + dx * t, cz = a[1] + dz * t;
        if (Math.hypot(x - cx, z - cz) < PATH_HALF + 1.0) return true;
      }
      return false;
    };
    let placed = 0, tries = 0;
    while (placed < 42 && tries++ < 400) {
      const ang = tr() * Math.PI * 2, u = 0.5 + tr() * 0.42;      // lower/mid slope ring
      const x = H.cx + Math.cos(ang) * H.rx * u, z = H.cz + Math.sin(ang) * H.rz * u;
      if (nearPath(x, z)) continue;
      const sy = 0.75 + tr() * 0.8;
      const c = new THREE.ConeGeometry(0.085, 0.34 * sy, 5);
      c.rotateY(tr() * Math.PI); c.rotateZ((tr() - 0.5) * 0.3);
      c.translate(x, hAt(x, z) + 0.16 * sy, z);
      geos.push(c); placed++;
    }
    if (geos.length) {
      const merged = BufferGeometryUtils.mergeBufferGeometries(geos, false);
      scene.add(new THREE.Mesh(merged, toon(0x6fb35f, {})));
    }
  }

  // ---------------------- kite flyers + kites aloft ----------------------
  const flyers = [];
  for (let i = 0; i < FLYERS.length; i++) {
    const f = FLYERS[i], sy = hAt(f.x, f.z);
    const npc = makeNPC({ x:f.x, z:f.z, ry:f.ry, palette:FLYER_PAL[i % FLYER_PAL.length],
      name:'', lines:KITE_LINES, wander:0 });
    npc.group.position.y = sy;                                   // stand ON the summit surface

    // kite rig: a pivot at the flyer's raised hand; a string rises up-and-east to
    // the kite. The whole pivot swings like a pendulum, so the string stays taut.
    const fx2 = Math.sin(f.ry), fz2 = Math.cos(f.ry);            // NPC front (east-ish)
    const pivot = new THREE.Group();
    pivot.position.set(f.x + fx2 * 0.5, sy + 1.85, f.z + fz2 * 0.5);
    scene.add(pivot);

    const up = f.up, lean = f.lean, L = Math.hypot(up, lean);
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, L, 4), bmat(0x3a3a3a));
    string.position.set(0, up / 2, lean / 2);
    string.rotation.x = Math.atan2(lean, up);                    // tilt toward the wind
    pivot.add(string);

    const kite = new THREE.Group();
    kite.position.set(0, up, lean);
    // sail: a tall diamond facing the flyer (DoubleSide, self-lit → pops on sky)
    const dpos = [0, 1.05, 0.02,  0.72, 0, 0.02,  0, -1.15, 0.02,  -0.72, 0, 0.02];
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.Float32BufferAttribute(dpos, 3));
    dg.setIndex([0, 1, 2, 0, 2, 3]); dg.computeVertexNormals();
    kite.add(new THREE.Mesh(dg, bmat(f.kite, { side:THREE.DoubleSide })));
    // spine + spar (thin dark cross) for the kite read
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.2, 0.05), bmat(0x2a2a2a));
    spine.position.y = -0.05; kite.add(spine);
    const spar = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.05, 0.05), bmat(0x2a2a2a));
    kite.add(spar);
    // tail: three little bows trailing from the bottom
    const tailCol = [0xffffff, f.kite, 0xffffff];
    for (let b = 0; b < 3; b++) {
      const bow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.03), bmat(tailCol[b], { side:THREE.DoubleSide }));
      bow.position.set((b % 2 ? 0.22 : -0.22), -1.35 - b * 0.55, 0.02);
      bow.rotation.z = (b % 2 ? -0.5 : 0.5); kite.add(bow);
    }
    pivot.add(kite);

    flyers.push({ npc, pivot, kite, parts:npc.parts, ph:f.ph, base:pivot.rotation.x });
  }

  // gentle wind sway: the pivot swings (string + kite follow rigidly); the kite
  // also flutters a touch. And re-pose each flyer's RIGHT arm up toward the
  // string every frame (updateNPC resets arms first — we run after it, line 602).
  registerUpdate((dt, t) => {
    for (const fl of flyers) {
      const s = Math.sin(t * 0.6 + fl.ph), c = Math.sin(t * 0.85 + fl.ph * 1.3);
      fl.pivot.rotation.z = s * 0.14;
      fl.pivot.rotation.x = fl.base + c * 0.09;
      fl.kite.rotation.z = Math.sin(t * 1.4 + fl.ph) * 0.16;
      const p = fl.parts;
      p.armR.rotation.x = -2.35 + c * 0.08;   // reach up toward the kite string
      p.armR.rotation.z = 0.12;
      p.armL.rotation.x = -0.35;              // other hand shading the eyes-ish, relaxed
    }
  });

  // ---------------------- about the hill (passive fact) ----------------------
  addInteraction({ x:H.cx, z:H.cz + 3, r:3.2, label:'about Cricket Hill',
    onUse:() => toast('CRICKET HILL',
      'A grassy mound above the harbor — the north side\'s favorite spot to fly a kite (and sled, come winter). 🪁') });
});
