// =====================================================================
// MAGGIE DALEY PARK — terrain, skating-ribbon BED, climbing walls, warming
// hut, fieldhouse, tennis, Cancer Survivors' Garden, rolling landforms,
// X-mast signature lights, backdrop east + the lake (task 058, flag maggie).
//
// The PLAY GARDEN (lighthouse/ship/fort/slides, zone x252-316 z806-864) is a
// SEPARATE file (playgarden.js) — this file lays NO ground inside that rect
// and builds none of those objects.
//
// DETERMINISM: LOCAL mulberry32(0x4d414747 'MAGG') only — never the shared
// world rng. Positions are FIXED; rng drives cosmetic jitter/scatter only.
// Everything attaches to millenniumRoot; plain solid toon meshes FOLD FREE via
// mergeCellStatic, repeats go through the shared instanced pool (poolInstanced,
// 'mg-*' geoKeys), self-lit metal/glass/water via reused bmat instances.
//
// Geometry law: src/data/millennium.js MAGGIE_M / RIBBON_M / RIBBON_SEGS_M /
// BACKDROP_GRANT / STREETS_GRANT + GEOGRAPHY.md GRANT PARK EXPANSION Zone B.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { millenniumRoot, emitInstanced, poolInstanced, flatGrid, segStrip } from './index.js';
import { toon, bmat, mulberry32, pointsMat } from '../core.js';
import { collide } from '../props.js';
import * as M from '../data/millennium.js';

// ---- palette (plain hex; all folded per-color at the static merge) --------
// NB: these six MIRROR index.js COL by hex value (imported COL can't be read at
// module top level — index.js imports this file before its `export const COL`
// initializes, a circular-import TDZ). Same hex → same merge bucket, +0 draws.
const C = {
  lawn:   0x5f8a48, lawnDk: 0x527a3d, pave: 0xb0a996, plaza: 0xc7c0ad,
  soil:   0x4b4034, wood: 0x8a6b46,
  ribbon: 0xd9dcd6,   // PALE pre-ice paving of the ribbon bed (059 flips it to ice)
  rock:   0x8b9098,   // chunky gray rockwork
  wallL:  0xbcc0c4,   // faceted climbing-panel light gray
  wallM:  0x969aa2,   // faceted climbing-panel mid gray
  truss:  0x32363c,   // exposed steel truss (dark)
  holdR:  0xd23b3b, holdY: 0xe8c23a, holdB: 0x3f6fd0, holdG: 0x4aa84a,  // candy holds
  frame:  0xdad6ca,   // fieldhouse / hut light frame + seams
  roof:   0x9aa0a4,   // standing-seam roof gray
  court:  0x3a6b57,   // tennis court surface
  fence:  0x2f343a,   // chain-link posts/rails, net dark
  net:    0xd7dad2,   // tennis net band
  lime:   0xe9e3d3,   // CSG limestone columns
  steel:  0x26292e,   // CSG black-steel pergola lattice
  purple: 0x7a4f86,   // CSG purple planting
  trunk:  0x6b4a30, canopy: 0x3f7d3a, shrub: 0x4f6b34,   // trees + foliage
  rail:   0xeef0ec,   // white pipe railings
  can:    0x2b2f36,   // X-mast spotlight cans
  led:    0xffe6ad,   // X-mast LED panel (bright warm)
  gGreen: 0x4f7d68,   // 340 On The Park green glass (toon)
  gStone: 0xb7b1a2,   // The Buckingham stone
  gWhite: 0xd6d2c6,   // Outer Drive East white
  gDark:  0x3a3f47,   // Harbor Point dark
  sail:   0xece9df,   // moored sails
  road:   0x3b3e44,   // scenery asphalt (LSD / Randolph east)
};

export function buildMaggie() {
  const root = millenniumRoot;
  const rnd = mulberry32(0x4d414747);            // LOCAL — cosmetic scatter only
  const rr = (a, b) => a + (b - a) * rnd();
  const MG = M.MAGGIE_M, PZ = MG.play.zone, L = M.RIBBON_M.loop, HW = M.RIBBON_M.halfW;

  // ---- ground helpers ----------------------------------------------------
  const q = (x0, x1, z0, z1, y, c) => root.add(flatGrid(x1 - x0, z1 - z0, y, c, (x0 + x1) / 2, (z0 + z1) / 2));
  // lay a quad but SUBTRACT the play-garden zone (playgarden.js owns that ground)
  const overlapPZ = (x0, x1, z0, z1) => !(x1 <= PZ.x0 || x0 >= PZ.x1 || z1 <= PZ.z0 || z0 >= PZ.z1);
  const qClip = (x0, x1, z0, z1, y, c) => {
    if (!overlapPZ(x0, x1, z0, z1)) return q(x0, x1, z0, z1, y, c);
    if (z0 < PZ.z0) q(x0, x1, z0, PZ.z0, y, c);                     // band north of PZ
    if (z1 > PZ.z1) q(x0, x1, PZ.z1, z1, y, c);                     // band south of PZ
    const mz0 = Math.max(z0, PZ.z0), mz1 = Math.min(z1, PZ.z1);     // middle band: sides of PZ
    if (x0 < PZ.x0) q(x0, PZ.x0, mz0, mz1, y, c);
    if (x1 > PZ.x1) q(PZ.x1, x1, mz0, mz1, y, c);
  };

  // =====================================================================
  // A. GROUND CARPETS (Maggie walkable areas + garden floors, minus PZ)
  // =====================================================================
  qClip(198, 338, 699.5, 892, -0.015, C.lawn);                     // rooftop-park LAWN base
  // hardscape paving over the walk network (avoids PZ)
  q(201, 209, 706, 888, 0.0, C.pave);                              // E-rim promenade
  q(201, 338, 705, 711.5, 0.0, C.pave);                            // Randolph-side north walk
  q(201, 338, 878, 888, 0.0, C.pave);                             // Monroe-side south rim
  q(209, 323, 728, 736, 0.0, C.pave);                             // fieldhouse esplanade
  q(330, 338, 789, 878, 0.0, C.pave);                            // LSD-overlook east walk
  q(243, 252, 800, 816, 0.005, C.plaza);                         // bridge-landing plaza (W of PZ)
  q(252, 266, 800, 806, 0.005, C.plaza);                         // landing plaza (N of PZ)
  q(258, 266, 770, 800, 0.0, C.pave);                            // plaza -> ribbon connector
  q(256, 316, 802, 806, 0.0, C.pave);                            // landing -> play esplanade (N of PZ)
  q(246, 252, 816, 878, 0.0, C.pave);                            // plaza -> south rim (W of PZ)
  q(252, 254, 864, 878, 0.0, C.pave);                            // ...its stub S of PZ
  // climbing-wall island plaza (inside the ribbon loop, around the walls)
  q(236, 276, 736, 770, 0.005, C.plaza);

  // =====================================================================
  // B. ROLLING LANDFORMS — a few low PLANTED mounds (visual only, off-walk)
  // =====================================================================
  const domeGeo = new THREE.SphereGeometry(1, 12, 8);
  for (const [mx, mz, r, h, dk] of [
    [221, 783, 7.5, 1.7, 0], [301, 772, 10, 2.0, 1], [223, 843, 8.5, 1.6, 0],
    [323, 843, 6, 1.3, 1], [233, 799, 6.5, 1.4, 0], [312, 800, 6, 1.3, 1],
  ]) {
    const d = new THREE.Mesh(domeGeo, toon(dk ? C.lawnDk : C.lawn));
    d.position.set(mx, -0.25, mz); d.scale.set(r, h, r); root.add(d);
  }

  // =====================================================================
  // C. SKATING RIBBON — soil rim + white pipe rails + rockwork + warming
  //    hut; the strip surface is ICE once OPEN_GRANT.ribbonIce (059) and
  //    the pale pre-ice bed before that (058).
  // =====================================================================
  const N = 65, U = L.slice(0, N);                                 // 65 unique loop verts (closed)
  let cx = 0, cz = 0; for (const p of U) { cx += p[0]; cz += p[1]; } cx /= N; cz /= N;
  // planting/soil rim under the ribbon
  for (let i = 0; i < N; i++) {
    const a = U[i], b = U[(i + 1) % N];
    segStrip(a, b, HW + 1.6, 0.018, 0.018, C.soil);                // soil/planting-bed rim
  }
  // per-vertex edge offsets (the ice ring + rails all follow BOTH loop edges)
  const nrm = i => {
    const a = U[(i - 1 + N) % N], b = U[(i + 1) % N];
    let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    return [-tz, tx];
  };
  const edgeL = [], edgeR = [];
  for (let i = 0; i < N; i++) { const [nx, nz] = nrm(i); edgeL.push([U[i][0] + nx * HW, U[i][1] + nz * HW]); edgeR.push([U[i][0] - nx * HW, U[i][1] - nz * HW]); }
  if (M.OPEN_GRANT.ribbonIce) {
    // 059: THE RIBBON IS ICE. One closed ring strip over the edge offsets (no
    // chord gaps at the hairpins) + skate scratches strung along the flow —
    // merged into ONE self-lit vertexColors bmat mesh, the rink.js ice recipe
    // (toon would pick up green ground-bounce at grazing angles). Own LOCAL
    // rng ('RBNI') so the 058 rock/shrub/tree scatter stays byte-identical.
    const ir = mulberry32(0x52424e49);
    const irr = (a, b) => a + (b - a) * ir();
    const cA = [0.918, 0.945, 0.961], cB = [0.847, 0.895, 0.922];  // #eaf1f5 base · #d8e4eb mottle
    const geos = [];
    { const P = [], Cv = [], Uv = [], Ix = [];                     // the ring strip
      for (let i = 0; i < N; i++)
        for (const e of [edgeL[i], edgeR[i]]) {
          const m = 0.5 + 0.5 * Math.sin(e[0] * 2.1 + e[1] * 0.7) * Math.sin(e[1] * 1.3 - e[0] * 0.9);
          P.push(e[0], 0.035, e[1]); Uv.push(0, 0);
          Cv.push(cA[0] + (cB[0] - cA[0]) * m * 0.55, cA[1] + (cB[1] - cA[1]) * m * 0.55, cA[2] + (cB[2] - cA[2]) * m * 0.55);
        }
      for (let i = 0; i < N; i++) {                                // (a,c,b)/(b,c,d): +y winding
        const a = i * 2, b = a + 1, c2 = ((i + 1) % N) * 2, d = c2 + 1;
        Ix.push(a, c2, b, b, c2, d);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(Cv, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(Uv, 2));   // uv keeps the merge signature whole (019 law)
      g.setIndex(Ix); g.computeVertexNormals();
      geos.push(g); }
    { const cum = [0]; let per = 0;                                // scratches by arclength
      for (let i = 0; i < N; i++) { per += Math.hypot(U[(i + 1) % N][0] - U[i][0], U[(i + 1) % N][1] - U[i][1]); cum.push(per); }
      for (let k = 0; k < 64; k++) {
        const s = irr(0, per);
        let i = 0; while (cum[i + 1] < s) i++;
        const f = (s - cum[i]) / (cum[i + 1] - cum[i]), a = U[i], b = U[(i + 1) % N];
        const head = Math.atan2(b[0] - a[0], b[1] - a[1]), lat = irr(-HW + 0.6, HW - 0.6);
        const g = new THREE.PlaneGeometry(0.045, irr(0.7, 2.2), 1, 1);
        g.rotateX(-Math.PI / 2); g.rotateY(head + irr(-0.3, 0.3));
        const n2 = g.attributes.position.count, sc = new Float32Array(n2 * 3);
        const white = ir() < 0.55;
        for (let m2 = 0; m2 < n2; m2++) { sc[m2 * 3] = white ? 0.973 : 0.784; sc[m2 * 3 + 1] = white ? 0.984 : 0.851; sc[m2 * 3 + 2] = white ? 0.992 : 0.895; }
        g.setAttribute('color', new THREE.BufferAttribute(sc, 3));
        g.translate(a[0] + (b[0] - a[0]) * f - Math.cos(head) * lat, 0.042 + (k % 4) * 0.003,
                    a[1] + (b[1] - a[1]) * f + Math.sin(head) * lat);
        geos.push(g);
      } }
    const merged = BufferGeometryUtils.mergeBufferGeometries(geos, false);
    root.add(new THREE.Mesh(merged, bmat(0xffffff, { vertexColors: true })));
  } else {
    for (let i = 0; i < N; i++) {
      const a = U[i], b = U[(i + 1) % N];
      segStrip(a, b, HW, 0.035, 0.035, C.ribbon);                  // the pale pre-ice paved bed (058)
    }
  }
  // WHITE PIPE RAILINGS — posts (every other vert) + a continuous top rail,
  // with a GATE GAP in the outer south lip (x 258.5–268.5, z > 769) where the
  // plaza→ribbon connector walk meets the ice: the honest way onto the skate
  // loop (059 — entering used to clip through the rail). Inner rail continues.
  const postGeo = new THREE.CylinderGeometry(0.055, 0.055, 1.0, 6); postGeo.translate(0, 0.5, 0);
  const railGeo = new THREE.BoxGeometry(0.07, 0.07, 1);
  const posts = [], rails = [];
  const inGate = (x, z) => x > 258.5 && x < 268.5 && z > 769;
  for (const edge of [edgeL, edgeR]) {
    for (let i = 0; i < N; i++) {
      if (i % 2 === 0 && !inGate(edge[i][0], edge[i][1])) posts.push({ pos: [edge[i][0], 0, edge[i][1]], color: C.rail });
      const a = edge[i], b = edge[(i + 1) % N], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      if (inGate(a[0], a[1]) || inGate(b[0], b[1])) continue;
      rails.push({ pos: [(a[0] + b[0]) / 2, 0.95, (a[1] + b[1]) / 2], yaw: Math.atan2(dx, dz), scale: [1, 1, len], color: C.rail });
    }
  }
  poolInstanced('mg-rail-post', postGeo, posts);
  poolInstanced('mg-rail', railGeo, rails);
  // ROCKWORK RIMS — chunky gray rocks on the outer rim + islands inside the loop
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const shrubGeo = new THREE.SphereGeometry(1, 7, 5);
  const rocks = [], shrubs = [];
  for (let i = 0; i < N; i++) {
    const p = U[i]; let ox = p[0] - cx, oz = p[1] - cz; const l = Math.hypot(ox, oz) || 1; ox /= l; oz /= l;
    if (i % 2 === 0) {                                             // outer-rim rock/shrub clusters
      const d = HW + 1.4 + rr(0, 2.2), rx = p[0] + ox * d, rz = p[1] + oz * d;
      const s = rr(0.55, 1.5);
      rocks.push({ pos: [rx, s * 0.35, rz], yaw: rr(0, 6.28), scale: [s, s * rr(0.6, 0.9), s], color: C.rock });
      if (i % 4 === 0) shrubs.push({ pos: [p[0] + ox * (d + 1.6), 0.35, p[1] + oz * (d + 1.6)], yaw: rr(0, 6.28), scale: [rr(1, 1.5), rr(0.65, 0.95), rr(1, 1.5)], color: C.shrub });
    }
  }
  // a few rock islands INSIDE the loop, clear of the wall footprints
  for (const [ix, iz] of [[231, 748], [269, 743], [272, 766], [238, 762], [263, 749]]) {
    const s = rr(0.7, 1.4);
    rocks.push({ pos: [ix, s * 0.35, iz], yaw: rr(0, 6.28), scale: [s, s * rr(0.6, 0.9), s], color: C.rock });
  }
  poolInstanced('mg-rock', rockGeo, rocks);

  // WARMING HUT (SW lobe) — faceted gray metallic box + standing-seam roof
  {
    const hx = MG.hut.x, hz = MG.hut.z, hw = 4.0, hd = 3.2, hh = 3.4;
    const metal = _metal();                                        // shared self-lit steel
    const body = new THREE.Mesh(new THREE.BoxGeometry(hw, hh, hd), metal);
    body.position.set(hx, hh / 2, hz); root.add(body);
    const cham = new THREE.Mesh(new THREE.BoxGeometry(hw - 0.9, hh * 0.5, hd - 0.9), metal);  // canted upper facet
    cham.position.set(hx, hh + 0.2, hz); cham.rotation.y = 0.5; root.add(cham);
    const rf = new THREE.Mesh(new THREE.BoxGeometry(hw + 0.5, 0.35, hd + 0.5), toon(C.roof));  // standing-seam roof
    rf.position.set(hx, hh + 0.75, hz); root.add(rf);
    for (let sx = -hw / 2 + 0.5; sx < hw / 2; sx += 0.7) {          // seam ridges
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, hd + 0.5), toon(C.frame));
      seam.position.set(hx + sx, hh + 0.95, hz); root.add(seam);
    }
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 0.1), toon(C.truss));  // recessed doorway (faces ribbon, +? use south)
    door.position.set(hx, 1.0, hz + hd / 2 + 0.03); root.add(door);
    collide(hx, hz, 3.4);
  }

  // =====================================================================
  // D. THE TWO CLIMBING WALLS — faceted gray masses, candy holds, steel truss
  // =====================================================================
  climbWall(MG.walls[0], { cols: 5, rows: 4, thick: 4.5, foldAmp: 0.85, bulge: 1.9, lean: 0.6, truss: 6 }, rnd, root);
  climbWall(MG.walls[1], { cols: 4, rows: 3, thick: 3.2, foldAmp: 0.7, bulge: 1.2, lean: -0.5, truss: 12 }, rnd, root);

  // =====================================================================
  // E. FIELDHOUSE — long low glassy park-district building
  // =====================================================================
  {
    const f = MG.fieldhouse, w = f.x1 - f.x0, d = f.z1 - f.z0, fx = (f.x0 + f.x1) / 2, fz = (f.z0 + f.z1) / 2;
    const glass = _glass();
    const gl = new THREE.Mesh(new THREE.BoxGeometry(w - 1.2, f.h - 1.4, d - 1.2), glass);       // glass curtain volume
    gl.position.set(fx, (f.h - 1.4) / 2 + 0.2, fz); root.add(gl);
    const frame = toon(C.frame);
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, 1.0, d), frame); base.position.set(fx, 0.5, fz); root.add(base);
    for (let x = f.x0; x <= f.x1 + 0.1; x += (f.x1 - f.x0) / 7) {   // vertical mullion fins
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.28, f.h - 1.2, d + 0.2), frame);
      m.position.set(x, (f.h) / 2, fz); root.add(m);
    }
    const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.4, d + 0.2), frame); band.position.set(fx, f.h - 1.2, fz); root.add(band);  // fascia
    const rf = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6), toon(C.roof)); rf.position.set(fx, f.h - 0.7, fz); root.add(rf);  // standing-seam roof
    for (let x = f.x0; x <= f.x1; x += 1.1) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, d + 0.6), toon(C.frame)); s.position.set(x, f.h - 0.42, fz); root.add(s); }
    for (const px of [f.x0 + 5, fx, f.x1 - 5]) collide(px, fz, 8);  // footprint seal (carved in data)
  }

  // =====================================================================
  // F. TENNIS — court pad + chain-link perimeter fence + net (visual, simple)
  // =====================================================================
  {
    const t = MG.tennis, w = t.x1 - t.x0, d = t.z1 - t.z0, tx = (t.x0 + t.x1) / 2, tz = (t.z0 + t.z1) / 2;
    q(t.x0, t.x1, t.z0, t.z1, 0.006, C.court);                     // court surface
    const lineMat = toon(0xe6e6de);                                // court lines
    const ln = (x0, x1, z0, z1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 || 0.12, 0.02, z1 - z0 || 0.12), lineMat); m.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2); root.add(m); };
    ln(t.x0 + 1, t.x1 - 1, t.z0 + 1, t.z0 + 1); ln(t.x0 + 1, t.x1 - 1, t.z1 - 1, t.z1 - 1);
    ln(t.x0 + 1, t.x0 + 1, t.z0 + 1, t.z1 - 1); ln(t.x1 - 1, t.x1 - 1, t.z0 + 1, t.z1 - 1);
    ln(tx, tx, t.z0 + 1, t.z1 - 1);
    // fence: posts + top & bottom rail on the perimeter (open, see-through frame)
    const fm = toon(C.fence);
    const post = new THREE.BoxGeometry(0.12, 3.0, 0.12);
    const peri = [];
    for (let x = t.x0; x <= t.x1 + 0.1; x += 2.5) { peri.push([x, t.z0]); peri.push([x, t.z1]); }
    for (let z = t.z0 + 2.5; z < t.z1; z += 2.5) { peri.push([t.x0, z]); peri.push([t.x1, z]); }
    for (const [px, pz] of peri) { const m = new THREE.Mesh(post, fm); m.position.set(px, 1.5, pz); root.add(m); }
    for (const [z0, z1] of [[t.z0, t.z0], [t.z1, t.z1]]) for (const yy of [0.4, 2.9]) { const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.08), fm); r.position.set(tx, yy, z0); root.add(r); }
    for (const x0 of [t.x0, t.x1]) for (const yy of [0.4, 2.9]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, d), fm); r.position.set(x0, yy, tz); root.add(r); }
    const net = new THREE.Mesh(new THREE.BoxGeometry(w - 2, 1.0, 0.06), toon(C.net)); net.position.set(tx, 0.5, tz); root.add(net);
    const netTop = new THREE.Mesh(new THREE.BoxGeometry(w - 2, 0.08, 0.1), toon(0xffffff)); netTop.position.set(tx, 1.0, tz); root.add(netTop);
  }

  // =====================================================================
  // G. CANCER SURVIVORS' GARDEN — white Corinthian columns, black-steel
  //    pergola lattices, purple/green beds, crabapples, benches
  // =====================================================================
  {
    const cg = MG.csg, b = cg.bounds;
    q(b.x0, b.x1, b.z0, b.z1, -0.008, C.lawnDk);                    // garden floor
    // limestone paver paths (the CSG walk rects)
    for (const [x0, x1, z0, z1] of [
      [323, 337, 711.5, 743], [323, 326, 743, 749], [333, 337, 743, 749],
      [323, 337, 749, 769], [323, 326, 769, 775], [333, 337, 769, 775], [323, 337, 775, 789],
    ]) q(x0, x1, z0, z1, 0.0, C.plaza);
    // the two WHITE Corinthian columns (fluted shaft + chunky capital) — colliders
    for (const [colx, colz] of cg.columns) {
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.82, 8.4, 14), toon(C.lime)); sh.position.set(colx, 4.2, colz); root.add(sh);
      for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; const fl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 8.0, 0.14), toon(C.lime)); fl.position.set(colx + Math.cos(a) * 0.74, 4.2, colz + Math.sin(a) * 0.74); root.add(fl); }
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.8, 1.4, 14), toon(0xf0ead9)); cap.position.set(colx, 8.9, colz); root.add(cap);
      const ab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 2.0), toon(0xf0ead9)); ab.position.set(colx, 9.7, colz); root.add(ab);
      const bs = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.1, 0.7, 14), toon(C.lime)); bs.position.set(colx, 0.35, colz); root.add(bs);
      collide(colx, colz, 1.0);
    }
    // two BLACK STEEL open-lattice gabled pergolas (wireframe) — carved footprints
    for (const p of cg.pavilions) pergola(p, root);
    // purple/green planting beds (soil + purple foliage) — purple is a low
    // localised patch so it stays STATIC-MERGED (no extra instanced bucket)
    const purpleMat = toon(C.purple);
    for (const [bx, bz, bw, bd] of [[329.5, 730, 12, 8], [329.5, 758, 12, 8], [329.5, 784, 12, 6]]) {
      q(bx - bw / 2, bx + bw / 2, bz - bd / 2, bz + bd / 2, 0.008, C.soil);
      for (let k = 0; k < 9; k++) {
        const pm = new THREE.Mesh(shrubGeo, purpleMat);
        pm.position.set(bx + rr(-bw / 2 + 1, bw / 2 - 1), 0.3, bz + rr(-bd / 2 + 1, bd / 2 - 1));
        pm.scale.set(rr(0.7, 1.1), rr(0.5, 0.8), rr(0.7, 1.1)); pm.rotation.y = rr(0, 6.28); root.add(pm);
      }
      shrubs.push({ pos: [bx, 0.35, bz], yaw: rr(0, 6.28), scale: [rr(1.1, 1.5), rr(0.6, 0.9), rr(1.1, 1.5)], color: C.shrub });  // a green hosta clump per bed
    }
    // benches
    for (const [bx, bz] of [[324.5, 726], [335.5, 726], [324.5, 784]]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.6), toon(C.wood)); seat.position.set(bx, 0.55, bz); root.add(seat);
      for (const dx of [-0.9, 0.9]) { const lg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.5), toon(C.steel)); lg.position.set(bx + dx, 0.27, bz); root.add(lg); }
    }
  }
  poolInstanced('mg-shrub', shrubGeo, shrubs);

  // =====================================================================
  // I. TREES throughout Maggie (chibi 4-lobe canopies) — rims + lawns
  // =====================================================================
  const trunkGeo = new THREE.CylinderGeometry(0.28, 0.4, 3.2, 7); trunkGeo.translate(0, 1.6, 0);
  const canopyGeo = BufferGeometryUtils.mergeBufferGeometries(
    [[0, 0.15, 0, 1.75], [0.95, 0.2, 0.2, 1.25], [-0.85, 0.1, -0.3, 1.2], [0.15, 0.6, -0.55, 1.1]]
      .map(([x, y, z, r]) => { const s = new THREE.SphereGeometry(r, 8, 6); s.translate(x, y, z); return s; }), false);
  const trunks = [], canopies = [];
  const tree = (x, z) => {
    const s = rr(0.85, 1.2);
    trunks.push({ pos: [x, 0, z], yaw: rr(0, 6.28), color: C.trunk });
    canopies.push({ pos: [x, 4.2 + rr(-0.2, 0.4), z], yaw: rr(0, 6.28), scale: [s, s, s], color: C.canopy });
  };
  for (let z = 720; z <= 872; z += 13.5) tree(211.5 + rr(-0.5, 0.5), z + rr(-1, 1));   // E-rim allee
  for (let x = 214; x <= 320; x += 12) { if (x > 220 && x < 282) continue; tree(x + rr(-0.6, 0.6), 739 + rr(-0.6, 0.6)); }  // north esplanade edge (skip ribbon)
  for (let x = 210; x <= 330; x += 15) tree(x + rr(-0.8, 0.8), 873 + rr(-0.8, 0.8));    // south rim allee
  for (const [tx, tz] of [[325, 720], [336, 730], [325, 756], [336, 762], [325, 780], [336, 786]]) tree(tx + rr(-0.6, 0.6), tz + rr(-0.6, 0.6));  // CSG crabapples
  for (const [tx, tz] of [[300, 758], [290, 748], [246, 786], [218, 812], [312, 812], [225, 862], [305, 872]]) tree(tx + rr(-1, 1), tz + rr(-1, 1));  // meadow clumps
  poolInstanced('mg-tree-trunk', trunkGeo, trunks);
  poolInstanced('mg-tree-canopy', canopyGeo, canopies);

  // =====================================================================
  // H. X-MASTS — Maggie's SIGNATURE white X-crossed floodlight masts
  // =====================================================================
  const poleGeo = new THREE.CylinderGeometry(0.16, 0.16, 13, 8);
  const canGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.7, 8); canGeo.translate(0, 0.35, 0);
  const poles = [], cans = [], glowPos = [];
  for (let mi = 0; mi < MG.xmasts.length; mi++) {
    const [mx, mz] = MG.xmasts[mi];
    const yaw = 0.5 + mi * 0.22, yCross = 6.1;
    poles.push({ pos: [mx, yCross, mz], rx: 0.34, yaw, color: C.rail });
    poles.push({ pos: [mx, yCross, mz], rx: -0.34, yaw, color: C.rail });
    for (let k = 0; k < 5; k++) {                                  // spotlight-can cluster at the crossing
      const a = k / 5 * 6.28;
      cans.push({ pos: [mx + Math.cos(a) * 0.45, yCross + 0.9 + rr(-0.15, 0.25), mz + Math.sin(a) * 0.45], rx: 0.7 + rr(-0.2, 0.2), yaw: a, color: C.can });
    }
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.5), toon(C.led));  // flat LED area panel
    led.position.set(mx + 0.6, yCross + 0.5, mz); led.rotation.z = -0.5; root.add(led);
    glowPos.push([mx, yCross + 0.9, mz]);
    collide(mx, mz, 0.5);
  }
  poolInstanced('mg-xpole', poleGeo, poles);
  poolInstanced('mg-xcan', canGeo, cans);
  // warm glow at the crossings (one Points draw)
  {
    const pg = new THREE.BufferGeometry(), n = glowPos.length;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), sz = new Float32Array(n);
    for (let i = 0; i < n; i++) { pos[i * 3] = glowPos[i][0]; pos[i * 3 + 1] = glowPos[i][1]; pos[i * 3 + 2] = glowPos[i][2]; col[i * 3] = 1.0; col[i * 3 + 1] = 0.86; col[i * 3 + 2] = 0.55; sz[i] = 42; }
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pg.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    pg.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    root.add(new THREE.Points(pg, pointsMat()));
  }

  // =====================================================================
  // J. BACKDROP EAST — giants-east band, the lake, LSD + Randolph-east roads
  // =====================================================================
  {
    const road = toon(C.road);
    const lsd = new THREE.Mesh(new THREE.PlaneGeometry(14, 206, 3, 40), road); lsd.rotation.x = -Math.PI / 2; lsd.position.set(339, -0.03, 797); root.add(lsd);  // STREETS_GRANT.lsd x332-346 (z<900)
    const rnd2 = new THREE.Mesh(new THREE.PlaneGeometry(136, 12, 27, 2), road); rnd2.rotation.x = -Math.PI / 2; rnd2.position.set(284, -0.03, 698); root.add(rnd2);  // STREETS_GRANT.randolphE x216-352
    // giants-east band (register heights ~0.55x), z ~686
    const S = 0.55, gz = 686;
    slab(274, gz, 26, 105 * S, 11, toon(C.gGreen), root);          // 340 On The Park (green glass)
    slab(308, gz, 18, 90 * S, 10, toon(C.gStone), root);           // The Buckingham (tower)
    // Outer Drive East — white scalloped curve slab
    slab(352, gz, 40, 90 * S, 10, toon(C.gWhite), root);
    for (let x = 334; x <= 370; x += 5) { const sc = new THREE.Mesh(new THREE.BoxGeometry(1.2, 90 * S, 1.6), toon(0xe6e2d6)); sc.position.set(x, 90 * S / 2, gz + 5.6); root.add(sc); }
    // Harbor Point (dark rounded)
    const hp = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 100 * S, 16), toon(C.gDark)); hp.position.set(385, 100 * S / 2, gz); root.add(hp);
    // THE LAKE east of LSD — harbor-glint water band + moored sails
    const water = _water();
    const lake = new THREE.Mesh(new THREE.PlaneGeometry(14, 200, 3, 20), water); lake.rotation.x = -Math.PI / 2; lake.position.set(355, -0.18, 797); root.add(lake);
    const sailMat = toon(C.sail);
    for (const [sx, sz2] of [[353, 730], [358, 770], [354, 812], [359, 852]]) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 5), toon(0xdad6c8)); mast.position.set(sx, 2, sz2); root.add(mast);
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3, 1, 1), sailMat); sail.position.set(sx + 0.6, 2.2, sz2); root.add(sail);
      const sail2 = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3, 1, 1), sailMat); sail2.position.set(sx + 0.6, 2.2, sz2); sail2.rotation.y = Math.PI; root.add(sail2);
    }
  }
}

// ---- shared self-lit materials (reused instances so they merge) -----------
let _mM, _gM, _wM;
function _metal() { return _mM || (_mM = bmat(0x9aa0a6)); }
function _glass() { return _gM || (_gM = bmat(0x86a2b6)); }
function _water() { return _wM || (_wM = bmat(0x4a6c86)); }

// ---- CSG black-steel open-lattice gabled pergola (wireframe frame) --------
function pergola(p, root) {
  const w = p.x1 - p.x0, d = p.z1 - p.z0, px = (p.x0 + p.x1) / 2, pz = (p.z0 + p.z1) / 2, H = 4.6, gable = 1.6;
  const mat = toon(0x26292e), bar = (bw, bh, bd, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; root.add(m); };
  for (const cxp of [p.x0, p.x1]) for (const czp of [p.z0, p.z1]) bar(0.12, H, 0.12, cxp, H / 2, czp);   // corner posts
  for (let x = p.x0; x <= p.x1 + 0.1; x += w / 5) { bar(0.06, H, 0.06, x, H / 2, p.z0); bar(0.06, H, 0.06, x, H / 2, p.z1); }  // side lattice verticals
  for (let y = 0.8; y < H; y += 0.9) { bar(w, 0.05, 0.05, px, y, p.z0); bar(w, 0.05, 0.05, px, y, p.z1); bar(0.05, 0.05, d, p.x0, y, pz); bar(0.05, 0.05, d, p.x1, y, pz); }  // horizontals
  // gabled roof grid (two pitched planes of thin bars)
  for (const czp of [p.z0, p.z1, pz]) { bar(w, 0.06, 0.06, px, H + gable, czp === pz ? pz : czp, 0); }
  for (let x = p.x0; x <= p.x1 + 0.1; x += w / 5) {
    const rlen = Math.hypot(d / 2, gable);
    const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, rlen), mat); r1.position.set(x, H + gable / 2, pz - d / 4); r1.rotation.x = Math.atan2(gable, d / 2); root.add(r1);
    const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, rlen), mat); r2.position.set(x, H + gable / 2, pz + d / 4); r2.rotation.x = -Math.atan2(gable, d / 2); root.add(r2);
  }
  collide(px, pz, Math.max(w, d) / 2);
}

// ---- faceted CLIMBING WALL: crystalline gray shell + holds + steel truss ---
function climbWall(fp, o, rnd, root) {
  const w = fp.x1 - fp.x0;
  const cx = (fp.x0 + fp.x1) / 2, cz = (fp.z0 + fp.z1) / 2, h = fp.h;
  const cols = o.cols, rows = o.rows, thick = o.thick, foldAmp = o.foldAmp, bulge = o.bulge, lean = o.lean;
  // build a folded front skin (local origin = base-centre, front +z toward the walk)
  const F = [], B = [];
  for (let j = 0; j <= rows; j++) { F[j] = []; B[j] = [];
    for (let i = 0; i <= cols; i++) {
      const x = -w / 2 + w * i / cols, y = h * Math.pow(j / rows, 0.9);
      const fold = (rnd() * 2 - 1) * foldAmp * (0.3 + 0.7 * j / rows);
      const bul = bulge * (1 - Math.pow(2 * i / cols - 1, 2)) * (0.35 + 0.65 * (1 - j / rows));
      const z = fold + bul + lean * (j / rows);
      F[j][i] = { x, y, z }; B[j][i] = { x, y, z: z - thick };
    }
  }
  const light = [], mid = [];
  const tri = (a, p, qv, r) => a.push(p.x, p.y, p.z, qv.x, qv.y, qv.z, r.x, r.y, r.z);
  const quad = (a, p1, p2, p3, p4) => { tri(a, p1, p2, p3); tri(a, p1, p3, p4); };
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    quad(((i + j) & 1) ? mid : light, F[j][i], F[j][i + 1], F[j + 1][i + 1], F[j + 1][i]);   // front
    quad(mid, B[j][i], B[j + 1][i], B[j + 1][i + 1], B[j][i + 1]);                            // back (reversed)
  }
  for (let j = 0; j < rows; j++) { quad(mid, F[j][0], B[j][0], B[j + 1][0], F[j + 1][0]); quad(mid, B[j][cols], F[j][cols], F[j + 1][cols], B[j + 1][cols]); }
  for (let i = 0; i < cols; i++) { quad(mid, F[rows][i], F[rows][i + 1], B[rows][i + 1], B[rows][i]); quad(mid, B[0][i], B[0][i + 1], F[0][i + 1], F[0][i]); }
  const geoFrom = arr => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeVertexNormals(); return g; };
  const matL = _wmatL(), matM = _wmatM();
  const ml = new THREE.Mesh(geoFrom(light), matL); ml.position.set(cx, 0, cz); root.add(ml);
  const mm = new THREE.Mesh(geoFrom(mid), matM); mm.position.set(cx, 0, cz); root.add(mm);
  // candy-colored HOLDS scattered on the front face (bilinear sample of the fold)
  const sampleF = (u, v) => {
    const fi = u * cols, fj = v * rows, i0 = Math.min(cols - 1, Math.floor(fi)), j0 = Math.min(rows - 1, Math.floor(fj));
    const tu = fi - i0, tv = fj - j0, a = F[j0][i0], b = F[j0][i0 + 1], c = F[j0 + 1][i0], d = F[j0 + 1][i0 + 1];
    return { x: a.x + (b.x - a.x) * tu, y: a.y + (c.y - a.y) * tv, z: (a.z * (1 - tu) + b.z * tu) * (1 - tv) + (c.z * (1 - tu) + d.z * tu) * tv };
  };
  const holdCols = [0xd23b3b, 0xe8c23a, 0x3f6fd0, 0x4aa84a];
  const holdGeo = new THREE.BoxGeometry(0.34, 0.34, 0.34);
  for (let u = 0.06; u < 0.95; u += 0.11) for (let v = 0.08; v < 0.95; v += 0.13) {
    if (rnd() > 0.62) continue;
    const s = sampleF(u + (rnd() - 0.5) * 0.05, v + (rnd() - 0.5) * 0.05);
    const hm = new THREE.Mesh(holdGeo, toon(holdCols[(rnd() * 4) | 0]));
    hm.position.set(cx + s.x, s.y, cz + s.z + 0.22); hm.rotation.set(rnd(), rnd(), rnd()); hm.scale.setScalar(rnd() * 0.5 + 0.7); root.add(hm);
  }
  // exposed STEEL TRUSS on the back
  const tmat = toon(0x32363c);
  const backZ = cz - thick - 0.35;
  for (let k = 0; k < o.truss; k++) {
    const x = cx - w / 2 + w * (k + 0.5) / o.truss;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, h * 0.95, 0.12), tmat); post.position.set(x, h * 0.47, backZ); root.add(post);
    if (k < o.truss - 1) {                                          // X-braces between posts
      const x2 = cx - w / 2 + w * (k + 1.5) / o.truss, span = x2 - x, dl = Math.hypot(span, h * 0.9);
      for (const s of [1, -1]) { const br = new THREE.Mesh(new THREE.BoxGeometry(0.08, dl, 0.08), tmat); br.position.set((x + x2) / 2, h * 0.47, backZ); br.rotation.z = s * Math.atan2(span, h * 0.9); root.add(br); }
    }
  }
  for (let hy = 1; hy < h; hy += h / 3) { const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.08), tmat); rail.position.set(cx, hy, backZ); root.add(rail); }
  collide(cx, cz, Math.min(w, fp.z1 - fp.z0) / 2);
}
// shared DoubleSide wall materials (created once → merge together)
let _wL, _wM2;
function _wmatL() { return _wL || (_wL = toon(0xbcc0c4, { mat: { side: THREE.DoubleSide } })); }
function _wmatM() { return _wM2 || (_wM2 = toon(0x969aa2, { mat: { side: THREE.DoubleSide } })); }

// ---- a simple backdrop slab (box) ----------------------------------------
function slab(x, z, w, h, d, mat, root) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, h / 2, z); root.add(m); }
