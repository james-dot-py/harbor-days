// =====================================================================
// BUTLER FIELD + LOLLAPALOOZA — the STATIC festival world (task 061,
// flag butler). The live pack (crowd sway, music, NPC skaters/gator) is
// packs/lolla.js (executor B) — this file owns ONLY the built stage,
// dressing kit, streets, lake band, minimap block and walk probe.
//
// DETERMINISM: ONE local mulberry32(0x10611991 'LOLLA 1991') for cosmetic
// jitter — NEVER the shared world rng (moving a lakefront towel is a hard
// regression). Positions are FIXED. This builder runs LAST (after the Art
// Institute), just before flushPool() → the shared instanced pool folds
// cross-zone repeats and the reused 'mg-*' keys add +0 buckets.
//
// Circular-import law (058): index.js exports are read ONLY inside
// buildButler() (call time, after init) — never at module top level.
// Object3D transforms via .position.set(); NEVER Object.assign (060 crash).
// Hand-built strips that share a toon color with UV'd geometry get a uv
// attribute (019 merge law). Word signs = OWN canvas, measureText-fitted
// font, FrontSide + a solid rear (never a lone DoubleSide plane).
//
// Law: GEOGRAPHY.md Zone D + src/data/millennium.js BUTLER_M / CLOSURE_M /
// STREETS_GRANT / BACKDROP_GRANT (the rects are law).
// =====================================================================
import * as THREE from 'three';
import { millenniumRoot, poolInstanced, flatGrid } from './index.js';
import { toon, bmat, mulberry32 } from '../core.js';
import { collide } from '../props.js';
import * as M from '../data/millennium.js';

// ---- palette (literal hex; reused hexes fold +0 at the static merge) -------
const C = {
  // reused from COL / maggie / artinstitute static pools (fold, +0):
  lawn: 0x5f8a48, pave: 0xb0a996, plaza: 0xc7c0ad, road: 0x45454d,
  dark: 0x32363c, wood: 0x8a6b46, steelG: 0x8b9098, roofW: 0xe9e4d8,
  sail: 0xece9df, mast: 0xdad6c8, rail: 0xeef0ec, can: 0x2b2f36,
  led: 0xffe6ad, elGray: 0x9aa0a6, starY: 0xe8c23a,
  // new butler toon buckets:
  straw: 0xc9b98a,    // worn trampled lawn patches
  plum:  0x7a2440,    // festival pylon legs / arch color
  deckD: 0x25262c,    // dark stage deck + interior
  cone:  0x4a3226,    // Serra reading-cones rusted steel
  pottyB: 0x2f6ea8,   // port-a-potty blue body
  pottyD: 0x1c2a33,   // potty door inset / vent
  tstripe: 0xc9402f,  // tent stripe red (also truck 0)
};
const WATER = 0x4a6c86;   // maggie lake bmat recipe (self-lit)

export function buildButler() {
  const root = millenniumRoot;
  const rnd = mulberry32(0x10611991);              // LOCAL — cosmetic jitter only
  const rr = (a, b) => a + (b - a) * rnd();
  const BM = M.BUTLER_M;

  // ---- primitives -------------------------------------------------------
  const q = (x0, x1, z0, z1, y, c) => root.add(flatGrid(x1 - x0, z1 - z0, y, c, (x0 + x1) / 2, (z0 + z1) / 2));
  const box = (w, h, d, x, y, z, c, ry = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(c));
    m.position.set(x, y, z); if (ry) m.rotation.y = ry; root.add(m); return m;
  };

  // shared self-lit material singletons (one instance → one merge bucket)
  let _water, _awn, _bnr, _tstr, _tile, _boardBase;
  const water = () => _water || (_water = bmat(WATER));
  const awnMat = () => _awn || (_awn = bmat(0xffffff, { map: awningTex() }));
  const bnrMat = () => _bnr || (_bnr = bmat(0xffffff, { map: bannerTex() }));
  const tstrMat = () => _tstr || (_tstr = toon(0xffffff, { mat: { map: stripeTex() } }));
  const tileMat = () => _tile || (_tile = toon(0xece4d2, { mat: { map: tileTex() } }));
  const boardBase = () => _boardBase || (_boardBase = bmat(0x33285f));

  // a free-standing WORD sign: FrontSide canvas + a solid dark rear (never a
  // lone DoubleSide plane — 028/032 law). faces +/- along z or x per `dir`.
  const wordSign = (x, y, z, w, h, tex, dir) => {
    const ry = { N: Math.PI, S: 0, E: Math.PI / 2, W: -Math.PI / 2 }[dir];
    const nx = Math.sin(ry) * 0.03, nz = Math.cos(ry) * 0.03;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bmat(0xffffff, { map: tex }));
    face.position.set(x + nx, y, z + nz); face.rotation.y = ry; root.add(face);
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), toon(C.pottyD));
    back.position.set(x, y, z); back.rotation.y = ry; root.add(back);
  };
  // a two-sided BANNER on a beam (both approach sides read; a solid backing box
  // usually already backs it, so a back-to-back FrontSide pair is used here).
  const bannerPair = (x, y, z, w, h, axis) => {   // axis 'z' faces N/S, 'x' faces E/W
    for (const s of [1, -1]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bnrMat());
      if (axis === 'z') { p.position.set(x, y, z + s * 0.06); p.rotation.y = s === 1 ? 0 : Math.PI; }
      else { p.position.set(x + s * 0.06, y, z); p.rotation.y = s === 1 ? Math.PI / 2 : -Math.PI / 2; }
      root.add(p);
    }
  };

  // =====================================================================
  // 1. GROUND — closed festival streets (asphalt, walkable), field lawn,
  //    worn trampled patches, LSD rim walk + LSD scenery road.
  // =====================================================================
  q(200, 340, 894, 908, -0.04, C.road);            // closed Monroe east (festival street)
  q(190, 200, 894, 1044, -0.04, C.road);           // closed Columbus south
  q(332, 346, 900, 1044, -0.03, C.road);           // LSD scenery road (maggie covers z<900)
  q(198.6, 326, 908, 1032.6, -0.01, C.lawn);       // Butler Field lawn carpet
  // 6 irregular straw-colored trampled patches in the crowd zone (NEMA truth)
  for (const [px, pz, pw, pd] of [
    [242, 956, 11, 7], [266, 949, 9, 6], [284, 974, 8, 7],
    [251, 986, 12, 6], [276, 996, 9, 5], [234, 977, 7, 6], [296, 962, 8, 6],
  ]) q(px - pw / 2, px + pw / 2, pz - pd / 2, pz + pd / 2, 0.004, C.straw);
  q(BM.lsdRim.x0, BM.lsdRim.x1, BM.lsdRim.z0, BM.lsdRim.z1, 0.0, C.pave);   // LSD overlook rim walk

  // =====================================================================
  // 2. EAST LAKE BAND — Monroe Harbor glint + moored white sails (maggie
  //    _water recipe + sail silhouettes so colors/materials fold).
  // =====================================================================
  {
    const lake = new THREE.Mesh(new THREE.PlaneGeometry(14, 146, 3, 15), water());
    lake.rotation.x = -Math.PI / 2; lake.position.set(355, -0.18, 967); root.add(lake);
    for (let i = 0; i < 7; i++) {
      const sx = 350 + rr(0, 10), sz = 905 + i * 18 + rr(-4, 4);
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 0.6), toon(0x3a3a44));
      hull.position.set(sx, 0.05, sz); root.add(hull);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 5), toon(C.mast));
      mast.position.set(sx, 2.1, sz); root.add(mast);
      for (const f of [Math.PI / 2, -Math.PI / 2]) {   // sails broadside to the field (faces ±x)
        const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4, 1, 1), toon(C.sail));
        sail.position.set(sx + 0.5, 2.4, sz); sail.rotation.y = f; root.add(sail);
      }
    }
  }

  // =====================================================================
  // 3. PETRILLO — the permanent shell in festival dress. Built as a LOCAL
  //    group at the footprint centre, canted so the mouth faces the crowd
  //    (NE) — a rotated group with LOCAL children never heaves (027 law).
  //    local -z = mouth/front (NE) · +z = back (SW) · height slopes down back.
  // =====================================================================
  {
    const P = BM.petrillo, cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2;   // (222, 1009.5)
    const SG = new THREE.Group(); SG.position.set(cx, 0, cz); SG.rotation.y = -0.5; root.add(SG);
    const sbox = (w, h, d, lx, ly, lz, mat, ry = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(lx, ly, lz); if (ry) m.rotation.y = ry; SG.add(m); return m;
    };
    const toonB = c => (w, h, d, lx, ly, lz, ry) => sbox(w, h, d, lx, ly, lz, toon(c), ry);
    const dk = toonB(C.dark), deckMat = toonB(C.deckD);
    // cream tile-grid shell walls (ONE texture reused → one bucket)
    sbox(0.8, 12, 12, -7, 6, 0, tileMat());          // NW side wall (tall — the photo's big tile wall)
    sbox(0.8, 10, 12, 7, 5, 0, tileMat());           // SE side wall
    sbox(14, 8, 0.8, 0, 4, 6, tileMat());            // back wall (SW, lower — the slope)
    // flat white CANOPY cantilevered forward over the deck — self-lit so it
    // stays white (a horizontal white toon slab reads green from the ground
    // bounce, 044 law); tucks UNDER the taller proscenium top beam.
    { const cn = new THREE.Mesh(new THREE.BoxGeometry(15, 0.4, 10), bmat(0xece7da));
      cn.position.set(0, 11.4, -8.2); cn.rotation.x = -0.06; SG.add(cn); }
    // dark truss PROSCENIUM frame at the FRONT mouth plane — TALLER than the
    // canopy so the banner clearly rises above it (the reference read).
    dk(15, 1.2, 1.2, 0, 13.0, -6.4);                 // top beam (above the canopy)
    dk(1.2, 13.4, 1.2, -7, 6.7, -6.4);               // left post
    dk(1.2, 13.4, 1.2, 7, 6.7, -6.4);                // right post (pokes E — collide below)
    dk(15, 0.9, 0.9, 0, 2.2, -6.4);                  // bottom truss chord across the mouth
    // LALLAPAWLOOZA banner strip on the top beam + two vertical side banners
    { const b = new THREE.Mesh(new THREE.PlaneGeometry(14.4, 1.5), bnrMat());
      b.position.set(0, 13.0, -7.02); b.rotation.y = Math.PI; SG.add(b); }
    for (const sx2 of [-7, 7]) { const sb = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 7.5), bnrMat());
      sb.position.set(sx2, 8, -7.02); sb.rotation.y = Math.PI; SG.add(sb); }
    // elevated dark stage DECK (y1.6) — executor B parks performers here
    deckMat(13, 1.6, 9, 0, 0.8, -3);
    // dark interior back + backline (amp boxes + drum riser silhouettes)
    dk(12, 7, 0.6, 0, 4.5, 4.5);                     // dark interior back wall
    for (const [ax, az] of [[-4, 3.4], [4, 3.4], [-2.4, 4.2], [2.4, 4.2]]) deckMat(1.5, 1.3, 1.1, ax, 2.25, az);  // amps
    deckMat(3, 1.0, 2, 0, 2.1, 4.6);                 // drum riser box
    // hung LINE ARRAYS — 2 stacks of 5 dark boxes each side of the mouth,
    // hanging from the top truss just inside the opening.
    for (const sx3 of [-5.4, 5.4]) for (let k = 0; k < 5; k++) dk(0.8, 0.7, 0.8, sx3, 11.6 - k * 0.85, -6.2);
    // light-truss row under the canopy + fixture nubs
    dk(13, 0.4, 0.4, 0, 10.9, -6.9);
    for (let lx = -6; lx <= 6; lx += 1.5) dk(0.3, 0.5, 0.3, lx, 10.5, -6.9);
    // SIDE VIDEO BOARDS — self-lit deep blue-violet masses + brighter blocks
    // (NO text/textures per acceptance), angled ~20° toward the crowd.
    const acc = [bmat(0x6f8be0), bmat(0xcf5f9e), bmat(0xe8c23a)];
    for (const sgn of [-1, 1]) {
      const bx = sgn * 8.7, by = 6, bz = -6.4, brot = -sgn * 0.35;
      const board = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 3.4), boardBase());
      board.position.set(bx, by, bz - 0.05); board.rotation.set(0, Math.PI + brot, 0); SG.add(board);
      for (let a = 0; a < 3; a++) {                   // 3 abstract color blocks
        const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2 + a * 0.35, 0.8), acc[a]);
        p.position.set(bx + (a - 1) * 1.4, by + (a % 2 ? 0.8 : -0.8), bz - 0.08);
        p.rotation.set(0, Math.PI + brot, 0); SG.add(p);
      }
      dk(0.4, by, 0.4, bx, by / 2, bz);               // board support leg
    }
    // colliders for the parts standing OUTSIDE the carved footprint (E pokes;
    // world pos of local (7,-6.4) / (8.7,-6.4) under center (222,1009.5) yaw -0.5)
    collide(231.2, 1007.2, 1.3);                     // proscenium right post (front)
    collide(232.7, 1008.0, 1.1);                     // E video board + leg
  }

  // =====================================================================
  // 4. BARRICADE RAIL — front-of-stage crowd fence (x218–262 z1000.2).
  //    Instanced posts + two continuous rails (steel gray); 2 m gates at
  //    both ends; a collider on every post so the player can't tunnel it.
  // =====================================================================
  {
    const R = BM.rail, z = R.z, postGeo = new THREE.BoxGeometry(0.09, 1.15, 0.09);
    const posts = [];
    for (let x = R.x0 + 2; x <= R.x1 - 2 + 0.01; x += 1.5) {   // 2 m gates at both ends
      posts.push({ pos: [x, 0.575, z], color: C.steelG }); collide(x, z, 0.5);
    }
    poolInstanced('bt-rail-post', postGeo, posts);
    const rlen = R.x1 - R.x0 - 4, rx = (R.x0 + R.x1) / 2;
    for (const ry of [1.05, 0.6]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(rlen, 0.08, 0.08), toon(C.steelG));
      rail.position.set(rx, ry, z); root.add(rail);
    }
  }

  // =====================================================================
  // 5. SOUND BOOTH — FOH scaffold tower + desk + mixing console + roof +
  //    road cases (booth footprint x258–266 z968–976 already walk-carved).
  // =====================================================================
  {
    const b = BM.booth, x0 = b.x0 + 0.5, x1 = b.x1 - 0.5, z0 = b.z0 + 0.5, z1 = b.z1 - 0.5;
    const bcx = (b.x0 + b.x1) / 2, bcz = (b.z0 + b.z1) / 2;
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]])   // scaffold posts
      box(0.12, 3.4, 0.12, px, 1.7, pz, C.dark);
    for (const zy of [1.2, 3.2]) { box(x1 - x0, 0.08, 0.08, bcx, zy, z0, C.dark); box(x1 - x0, 0.08, 0.08, bcx, zy, z1, C.dark); }
    for (const zx of [x0, x1]) { box(0.08, 0.08, z1 - z0, zx, 1.2, bcz, C.dark); box(0.08, 0.08, z1 - z0, zx, 3.2, bcz, C.dark); }
    box(6.6, 0.15, 1.2, bcx, 1.05, z0 + 0.7, C.dark);          // desk board (faces the stage, +z)
    box(2.6, 0.5, 0.9, bcx, 1.4, z0 + 0.7, C.can);             // mixing console body
    let ki = 0;
    for (let kx = -1.0; kx <= 1.0; kx += 0.35) box(0.1, 0.1, 0.1, bcx + kx, 1.68, z0 + 0.5, [0xd23b3b, 0xe8c23a, 0x4aa84a][ki++ % 3]);
    box(8.4, 0.2, 8.4, bcx, 3.5, bcz, C.roofW);                // canvas roof
    box(1.4, 1.0, 0.9, b.x1 - 1.2, 0.5, b.z1 + 1.0, C.dark); collide(b.x1 - 1.2, b.z1 + 1.0, 0.9);   // road case beside
  }

  // =====================================================================
  // 6. DELAY / LIGHT TOWERS — black scaffold pole towers in the crowd.
  // =====================================================================
  for (const [tx, tz] of BM.delays) {
    for (const [ox, oz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]])
      box(0.1, 7, 0.1, tx + ox, 3.5, tz + oz, C.dark);
    for (const yy of [2, 4, 6]) { box(1.4, 0.06, 0.06, tx, yy, tz - 0.6, C.dark); box(1.4, 0.06, 0.06, tx, yy, tz + 0.6, C.dark); }
    for (const yy of [4.2, 5.6]) box(1.1, 1.4, 0.8, tx, yy, tz, C.can);       // two speaker boxes
    box(1.4, 0.24, 0.35, tx, 7.1, tz, C.dark);                                 // light bar
    collide(tx, tz, 0.8);
  }

  // =====================================================================
  // 7. CROWD TOTEMS — tall wobbly poles: chunky star / foam EL car / disco
  //    ball. They stand IN the crowd (colliders; the gator surfs live).
  // =====================================================================
  for (const [tx, tz, kind] of BM.totems) {
    const lean = rr(-0.12, 0.12), pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 6), toon(C.dark));
    pole.position.set(tx, 1.6, tz); pole.rotation.z = lean; root.add(pole);
    const topX = tx + Math.sin(lean) * 3.2, topY = 3.2, topZ = tz;
    if (kind === 'star') {
      const geo = new THREE.ExtrudeGeometry(starShape(0.75, 0.32, 5), { depth: 0.25, bevelEnabled: false });
      const star = new THREE.Mesh(geo, toon(C.starY));
      star.position.set(topX, topY + 0.4, topZ - 0.13); root.add(star);
      for (const s of [-1, 1]) {                       // ribbon streamers
        const rib = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.4), toon(s > 0 ? 0xd23b3b : 0x4a7fc0));
        rib.position.set(topX + s * 0.2, topY - 0.5, topZ); rib.rotation.z = s * 0.3; root.add(rib);
      }
    } else if (kind === 'el') {
      const car = box(1.7, 0.85, 0.72, topX, topY + 0.4, topZ, C.elGray);
      for (const wx of [-0.5, 0, 0.5]) box(0.28, 0.34, 0.02, topX + wx, topY + 0.5, topZ + 0.37, C.pottyD);   // windows
      box(1.72, 0.12, 0.74, topX, topY + 0.15, topZ, 0xd23b3b);          // red stripe
    } else {                                             // disco ball (self-lit faceted silver)
      const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), bmat(0xcdd2da));
      ball.position.set(topX, topY + 0.5, topZ); root.add(ball);
    }
    collide(tx, tz, 0.4);
  }

  // =====================================================================
  // 8. TENTS — two N-S rows of festival tents (half white, half striped)
  //    + a couple of merch-table boxes. Posts + roofs instanced.
  // =====================================================================
  {
    const postGeo = new THREE.BoxGeometry(0.14, 2.6, 0.14);
    const roofGeo = new THREE.ConeGeometry(3.5, 2.3, 4);
    const posts = [], rw = []; let ti = 0;
    for (const rowX of [305, 317]) {
      for (let k = 0; k < 5; k++) {
        const cxT = rowX, czT = 938 + k * 16, striped = (ti++ % 2) === 1;
        for (const [ox, oz] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]])
          posts.push({ pos: [cxT + ox, 1.3, czT + oz], color: C.roofW });
        if (striped) {                                  // striped roof = static textured cone (shares 1 bucket)
          const rf = new THREE.Mesh(roofGeo, tstrMat()); rf.position.set(cxT, 3.75, czT); rf.rotation.y = Math.PI / 4; root.add(rf);
        } else rw.push({ pos: [cxT, 3.75, czT], yaw: Math.PI / 4, color: C.roofW });
        if (k % 2 === 0) box(2.2, 0.7, 0.9, cxT, 0.5, czT - 2.8, [0xd94f3d, 0x3d9d6b, 0x4a7fc0][ti % 3]);   // merch table
        collide(cxT, czT, 2.6);
      }
    }
    poolInstanced('bt-tent-post', postGeo, posts);
    poolInstanced('bt-tent-roof-w', roofGeo, rw);
  }

  // =====================================================================
  // 9. PORT-A-POTTY ROW — 12 blue units facing EAST (doors toward the
  //    field) on the closed-Columbus east curb; one door ajar; a lollipop
  //    'THE THINKING ROOMS' word-sign at the south end.
  // =====================================================================
  {
    const P = BM.potties, x = (P.x0 + P.x1) / 2 + 0.3, bodyGeo = new THREE.BoxGeometry(1.1, 2.1, 1.1);
    const roofGeo = new THREE.BoxGeometry(1.26, 0.14, 1.26);
    const bodies = [], roofs = [], N = 12;
    for (let i = 0; i < N; i++) {
      const z = P.z0 + 2 + i * ((P.z1 - P.z0 - 4) / (N - 1));
      bodies.push({ pos: [x, 1.05, z], color: C.pottyB });
      roofs.push({ pos: [x, 2.22, z], color: C.roofW });
      const ajar = i === 6;
      box(0.06, 1.6, ajar ? 0.9 : 0.7, x + 0.56, 0.9, z + (ajar ? 0.25 : 0), C.pottyD, ajar ? -0.5 : 0);   // door (east face)
      box(0.1, 0.5, 0.1, x - 0.2, 2.5, z, C.pottyD);   // vent pipe
      collide(x, z, 0.8);
    }
    poolInstanced('bt-potty-body', bodyGeo, bodies);
    poolInstanced('bt-potty-roof', roofGeo, roofs);
    wordSign(x + 0.1, 1.4, P.z1 + 1.6, 2.2, 0.55, wordTex('THE THINKING ROOMS', '#2f6ea8', '#f2ede0'), 'E');
    box(0.12, 1.15, 0.12, x + 0.1, 0.575, P.z1 + 1.6, C.dark);   // lollipop post (ends at panel bottom)
    collide(x + 0.1, P.z1 + 1.6, 0.4);
  }

  // =====================================================================
  // 10. FOOD-TRUCK ROW on closed Monroe — serving windows face SOUTH (+z,
  //     toward the field). Reuse the promenade recipe; distinct bodies.
  // =====================================================================
  {
    const T = BM.trucks, cols = [0xd94f3d, 0x3d9d6b, 0xe6b83a, 0x4a7fc0, 0x8a5cb0];
    T.xs.forEach((x, i) => {
      const z = T.z;
      box(4.5, 2.4, 2.0, x, 1.7, z, cols[i]);                         // body
      box(2.8, 1.0, 0.06, x, 1.9, z + 1.04, C.can);                   // serving window (south face)
      const aw = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.3), awnMat());
      aw.position.set(x, 2.75, z + 1.5); aw.rotation.x = -Math.PI / 2 + 0.55; root.add(aw);
      collide(x, z, 2.2);
    });
    wordSign(T.xs[0] + 2.7, 1.5, T.z + 0.9, 1.1, 0.7, menuTex('TAMALES'), 'S');
    wordSign(T.xs[3] + 2.7, 1.5, T.z + 0.9, 1.1, 0.7, menuTex('LEMONADE ICE'), 'S');
  }

  // =====================================================================
  // 11. ENTRY ARCHES — festival pylons + LALLAPAWLOOZA banners over the two
  //     closed streets; the third arch (52,901) already exists (060) —
  //     hang a banner on its bare top beam only.
  // =====================================================================
  {
    // (240, 901) over closed Monroe — legs N/S of the roadway, banner faces E/W
    for (const lz of [895.5, 906.5]) { box(1.2, 5.5, 1.2, 240, 2.75, lz, C.plum); collide(240, lz, 0.6); }
    box(1.0, 0.95, 11.9, 240, 5.4, 901, C.plum);
    bannerPair(240, 4.75, 901, 10.4, 1.15, 'x');
    // (195, 925) over closed Columbus — legs E/W, banner faces N/S. Leg centres
    // pulled INBOARD to 191.4/198.6 so each collider ring (r0.6 + player 0.34 =
    // 0.94) sits fully inside the walkable Columbus strip x190-200 — the old
    // 190.8/199.2 poked 0.14 into the flanking non-walk seams and wedged the
    // player against the arch (issue 025). Top beam + banner still overhang them.
    for (const lx of [191.4, 198.6]) { box(1.2, 5.5, 1.2, lx, 2.75, 925, C.plum); collide(lx, 925, 0.6); }
    box(9.0, 0.95, 1.0, 195, 5.4, 925, C.plum);
    bannerPair(195, 4.75, 925, 7.6, 1.15, 'z');
    // (52, 901) the 060 spine scaffold — hang a banner on its beam (y≈5.2)
    bannerPair(52.5, 4.68, 901, 8.4, 1.1, 'z');
  }

  // =====================================================================
  // 12. THE LINEUP POSTER (206, 910) — big all-Chicago-pun billboard, panel
  //     bottom y0.9, two posts ending at the bottom edge, facing NE, solid
  //     dark rear. Local group at its base (rotated group, local children).
  // =====================================================================
  {
    const L = M.CLOSURE_M.lineup, PG = new THREE.Group();
    PG.position.set(L.x, 0, L.z); PG.rotation.y = 2.36; root.add(PG);   // face NE
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.4), bmat(0xffffff, { map: lineupTex() }));
    panel.position.set(0, 2.6, 0.06); PG.add(panel);
    const backing = new THREE.Mesh(new THREE.BoxGeometry(4.7, 3.5, 0.12), toon(C.pottyD));
    backing.position.set(0, 2.6, 0); PG.add(backing);
    for (const s of [-1.9, 1.9]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9, 0.16), toon(C.dark)); p.position.set(s, 0.45, 0); PG.add(p); }
    collide(204.66, 908.65, 0.5); collide(207.34, 911.35, 0.5);   // the two posts (rotated-frame world pos)
  }

  // =====================================================================
  // 13. PERIMETER FLAG GARLANDS — poles + strung triangular pennants along
  //     the field's street edges + near the arches. Poles (1 bucket) +
  //     pennants (2 color buckets), a shallow-V sag per span.
  // =====================================================================
  {
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 3, 6); poleGeo.translate(0, 1.5, 0);
    const pennGeo = pennantGeo();
    const poles = [], penn = [], pcol = [0xd23b2e, 0xe8c23a];
    const strings = [
      { poles: [], along: 'x', y: 2.9 },   // Monroe edge z909.5 x210->322
      { poles: [], along: 'z', y: 2.9 },   // Columbus edge x200.8 z915->995
    ];
    for (let x = 210; x <= 322 + 0.1; x += 14) strings[0].poles.push([x, 909.5]);
    for (let z = 915; z <= 995 + 0.1; z += 14) strings[1].poles.push([200.8, z]);
    // 2 short strings near the arches
    strings.push({ poles: [[228, 901], [242, 901], [256, 901]], along: 'x', y: 2.9 });
    for (const st of strings) {
      for (const [px, pz] of st.poles) { poles.push({ pos: [px, 0, pz], color: C.rail }); collide(px, pz, 0.3); }
      for (let i = 0; i < st.poles.length - 1; i++) {
        const a = st.poles[i], b = st.poles[i + 1], yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
        const NP = 6;
        for (let k = 1; k <= NP; k++) {
          const t = k / (NP + 1), sag = Math.sin(t * Math.PI) * 0.55;
          penn.push({ pos: [a[0] + (b[0] - a[0]) * t, st.y - sag, a[1] + (b[1] - a[1]) * t], yaw, rx: 0.35, color: pcol[k % 2] });
        }
      }
    }
    poolInstanced('bt-garland-pole', poleGeo, poles);
    poolInstanced('bt-pennant', pennGeo, penn, { basic: true });
  }

  // =====================================================================
  // 14. READING CONES (262.7, 912.7) — Serra homage: two curved rusted-
  //     steel plates leaning toward each other, sealed by one collider.
  // =====================================================================
  {
    const rc = BM.readingCones, coneMat = toon(C.cone, { mat: { side: THREE.DoubleSide } });
    const plate = (dx, thetaStart, lean) => {
      const g = new THREE.CylinderGeometry(2.6, 2.6, 4.2, 12, 1, true, thetaStart, 2.1);
      const m = new THREE.Mesh(g, coneMat);
      m.position.set(rc.x + dx, 2.1, rc.z); m.rotation.z = lean; root.add(m);
    };
    plate(-1.9, -1.05, 0.14);      // west plate, opening east, leaning in
    plate(1.9, Math.PI - 1.05, -0.14);   // east plate, opening west, leaning in
    collide(rc.x, rc.z, 2.8);
  }

  // =====================================================================
  // 15. X-MASTS — white X-crossed floodlight masts at field corners.
  //     REUSE maggie's exact pooled geometry + color ('mg-xpole'/'mg-xcan'
  //     — first geo wins, +0 buckets).
  // =====================================================================
  {
    const poleGeo = new THREE.CylinderGeometry(0.16, 0.16, 13, 8);
    const canGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.7, 8); canGeo.translate(0, 0.35, 0);
    const poles = [], cans = [];
    const masts = [[205, 915], [318, 928], [310, 1008]];
    masts.forEach(([mx, mz], mi) => {
      const yaw = 0.5 + mi * 0.4, yCross = 6.1;
      poles.push({ pos: [mx, yCross, mz], rx: 0.34, yaw, color: C.rail });
      poles.push({ pos: [mx, yCross, mz], rx: -0.34, yaw, color: C.rail });
      for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28;
        cans.push({ pos: [mx + Math.cos(a) * 0.45, yCross + 0.9, mz + Math.sin(a) * 0.45], rx: 0.7, yaw: a, color: C.can }); }
      box(0.7, 0.12, 0.5, mx + 0.6, yCross + 0.5, mz, C.led);   // warm LED panel (static)
      collide(mx, mz, 0.5);
    });
    poolInstanced('mg-xpole', poleGeo, poles);
    poolInstanced('mg-xcan', canGeo, cans);
  }
}

// ---- a 5-point star Shape (chunky, slightly uneven points) ----------------
function starShape(rOut, rIn, pts) {
  const s = new THREE.Shape();
  for (let i = 0; i < pts * 2; i++) {
    const a = Math.PI / pts * i - Math.PI / 2;
    const r = (i % 2 ? rIn : rOut) * (1 + (i % 3 - 1) * 0.06);   // uneven points
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath(); return s;
}
// ---- back-to-back hanging pennant triangle (visible from both sides) ------
function pennantGeo() {
  const w = 0.7, h = 0.9;
  const A = [-w / 2, 0, 0], B = [w / 2, 0, 0], D = [0, -h, 0];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...A, ...B, ...D, ...A, ...D, ...B]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 1, 1, 1, 0.5, 0, 0, 1, 0.5, 0, 1, 1]), 2));
  g.computeVertexNormals(); return g;
}

// ---------------------- canvas-texture helpers -----------------------------
function cvTex(cv) { const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t; }
function fitFont(g, text, maxW, px, family, weight = '') {
  let p = px; do { g.font = `${weight} ${p}px ${family}`; if (g.measureText(text).width <= maxW) break; p -= 2; } while (p > 8);
  g.font = `${weight} ${p}px ${family}`; return p;
}
function tileTex() {   // cream graph-paper tile grid (pale tiles + darker grout)
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = '#e8e0cc'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#c1b699'; g.lineWidth = 3;
  for (let i = 0; i <= 128.1; i += 128 / 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
  return cvTex(cv);
}
function bannerTex() {   // deep-plum LALLAPAWLOOZA festival banner
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 140; const g = cv.getContext('2d');
  g.fillStyle = '#6e1b39'; g.fillRect(0, 0, 1024, 140);
  g.strokeStyle = 'rgba(244,220,160,0.55)'; g.lineWidth = 8; g.strokeRect(10, 10, 1004, 120);
  g.fillStyle = '#f4e6cf'; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFont(g, 'LALLAPAWLOOZA', 940, 108, 'Arial,sans-serif', '900'); g.fillText('LALLAPAWLOOZA', 512, 74);
  return cvTex(cv);
}
function stripeTex() {   // red/white circus stripes (tent roofs)
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const g = cv.getContext('2d'); const n = 8, w = 128 / n;
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#f2ece0' : '#c9402f'; g.fillRect(i * w, 0, w + 1, 64); }
  const t = cvTex(cv); t.wrapS = THREE.RepeatWrapping; return t;
}
function awningTex() {   // red/cream food-truck awning stripes (promenade recipe)
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const g = cv.getContext('2d'); const n = 8, w = 128 / n;
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#f3ede0' : '#d94f3d'; g.fillRect(i * w, 0, w + 1, 64); }
  return cvTex(cv);
}
function menuTex(text) {   // small dark menu board
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 160; const g = cv.getContext('2d');
  g.fillStyle = '#2f2a24'; g.fillRect(0, 0, 256, 160);
  g.strokeStyle = '#d8c9a8'; g.lineWidth = 6; g.strokeRect(8, 8, 240, 144);
  g.fillStyle = '#f0e6cf'; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFont(g, text, 214, 52, 'Arial,sans-serif', '800'); g.fillText(text, 128, 84);
  return cvTex(cv);
}
function wordTex(text, bg, fg, cw = 512, ch = 96) {   // fitted word sign (028/050 law)
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const g = cv.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, cw, ch); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFont(g, text, cw * 0.9, ch * 0.72, 'Arial,sans-serif', '800'); g.fillText(text, cw / 2, ch / 2);
  return cvTex(cv);
}
function lineupTex() {   // THE LINEUP POSTER — all-Chicago pun bill (no real artists)
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 768; const g = cv.getContext('2d');
  g.fillStyle = '#efe4cf'; g.fillRect(0, 0, 1024, 768);
  g.strokeStyle = '#6e1b39'; g.lineWidth = 14; g.strokeRect(16, 16, 992, 736);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#6e1b39'; fitFont(g, 'LALLAPAWLOOZA', 940, 120, 'Arial,sans-serif', '900'); g.fillText('LALLAPAWLOOZA', 512, 88);
  g.fillStyle = '#2f6f6a'; fitFont(g, 'BUTLER FIELD · GRANT PARK · ALL WEEKEND', 900, 42, 'Arial,sans-serif', '700'); g.fillText('BUTLER FIELD · GRANT PARK · ALL WEEKEND', 512, 156);
  g.fillStyle = '#3a2c22';
  ['MALÖRP FACE', 'DEEP DISH MODE', 'THE LAKE EFFECTS'].forEach((t, i) => { fitFont(g, t, 900, 74, 'Arial,sans-serif', '900'); g.fillText(t, 512, 232 + i * 78); });
  g.fillStyle = '#8a5a1c';
  ['WINDY CITY HEAT · LOWER WACKER · THE JIBARITOS', 'BEAR DOWN BRASS · SIXTEEN-INCH SOFTBALL · GIARDINIERA'].forEach((t, i) => { fitFont(g, t, 946, 40, 'Arial,sans-serif', '700'); g.fillText(t, 512, 486 + i * 50); });
  g.fillStyle = '#4a4030';
  ['OPE! & THE SORRYS · DIBS · THE VIADUCTS · L GHOST TRAIN', 'POLISH & ONIONS · THE MONTROSE DOGS · LAKE EFFECT SNOW DAY · THE 606'].forEach((t, i) => { fitFont(g, t, 954, 30, 'Arial,sans-serif', '700'); g.fillText(t, 512, 602 + i * 44); });
  return cvTex(cv);
}
