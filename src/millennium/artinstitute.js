// =====================================================================
// THE ART INSTITUTE OF CHICAGO — campus builder (task 060, flag artInstitute).
// Beaux-arts west block (1893 Allerton) + grand steps + exhibition banners +
// North/South sculpture gardens + Fountain of the Great Lakes + the open
// Metra rail trench (parked EMU, catenary) + Gunsaulus waist + quiet east
// campus + reflecting pool + Stock Exchange Arch + Lolla load-in dressing +
// Route 66 BEGIN sign. NOT here: the two lions (lions.js), Nichols Bridgeway
// + the Modern Wing landing (nichols.js).
//
// DETERMINISM: ONE local mulberry32(0x41525453 'ARTS') for cosmetic jitter
// only — positions are FIXED, never the shared world rng. Everything attaches
// to millenniumRoot; plain solid toon meshes FOLD FREE via mergeCellStatic,
// repeats reuse maggie's shared instanced-pool keys (mg-tree-*, mg-rock),
// self-lit metal/glass/water go through reused bmat singletons.
//
// Palette hexes are LITERALS (never index.js COL at module scope — circular-
// import TDZ, maggie.js precedent). Reused COL/maggie hexes fold +0 draws.
// Law: GEOGRAPHY.md Zone C + src/data/millennium.js ART_M (the rects are law).
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { millenniumRoot, poolInstanced, flatGrid } from './index.js';
import { toon, bmat, mulberry32 } from '../core.js';
import { collide } from '../props.js';
import * as M from '../data/millennium.js';

// ---- palette (literal hex; folded per-color at the static merge) ----------
const C = {
  // reused (fold +0 — already in COL / maggie static pool):
  pave: 0xb0a996, plaza: 0xc7c0ad, lawn: 0x5f8a48, lawnDk: 0x527a3d,
  soil: 0x4b4034, wood: 0x8a6b46, wall: 0x777063, dark: 0x32363c,
  ballast: 0x2f343a, white: 0xffffff,
  // new toon buckets (each ~1-2 merged tiles):
  stone: 0xcabfae,    // warm limestone hero (west block, waist, annex)
  stoneC: 0xc9bfa6,   // cool campus limestone (east masses, tympanum)
  trim: 0xe6ddc8,     // pale trim — heavy reuse (columns/cornice/quoins/urns/arch)
  recess: 0x6f5c44,   // dark drafted-joint / loggia recess
  glaze: 0x2a2620,    // dark glazing (portico openings, campus slots, EMU windows)
  roof: 0x8a8578,     // low hipped roof slab
  green: 0x3f5d30,    // clipped hedge / urn greenery
  verd: 0x4da28c,     // VERDIGRIS bronze — MUST match the lions' bucket
  red: 0xc23b2e,      // Calder red (Flying Dragon) + flag stars
  orange: 0xe07020,   // traffic cones + EMU nose stripe
  flagBlue: 0x9ec7e0, // Chicago-flag light-blue stripes
};

// ---- shared self-lit singletons (reused instances → one merge bucket each)
let _steel, _poolW, _fountW, _thread;
const steel  = () => _steel  || (_steel  = bmat(0x9aa0a6));   // brushed steel
const poolW  = () => _poolW  || (_poolW  = bmat(0x4a6c86));   // reflecting pool
const fountW = () => _fountW || (_fountW = bmat(0x2f4a56));   // fountain basin
const thread = () => _thread || (_thread = bmat(0x9fd0e0));   // water threads

export function buildArtInstitute() {
  const root = millenniumRoot;
  const R = mulberry32(0x41525453);                // LOCAL — cosmetic jitter only
  const rr = (a, b) => a + (b - a) * R();
  const AI = M.ART_M;

  // ---- primitives -------------------------------------------------------
  const q = (x0, x1, z0, z1, y, c) => root.add(flatGrid(x1 - x0, z1 - z0, y, c, (x0 + x1) / 2, (z0 + z1) / 2));
  const box = (w, h, d, x, y, z, c, ry = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(c));
    m.position.set(x, y, z); if (ry) m.rotation.y = ry; root.add(m); return m;
  };
  const bbox = (w, h, d, x, y, z, matFn, ry = 0) => {       // self-lit box
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matFn());
    m.position.set(x, y, z); if (ry) m.rotation.y = ry; root.add(m); return m;
  };
  const cyl = (r0, r1, h, x, y, z, c, seg = 12) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), toon(c));
    m.position.set(x, y, z); root.add(m); return m;
  };
  const waterQuad = (x0, x1, z0, z1, y, matFn) => {
    const w = x1 - x0, d = z1 - z0;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d, Math.max(1, Math.round(w / 5)), Math.max(1, Math.round(d / 5))), matFn());
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); root.add(m); return m;
  };
  // arched opening facing WEST at x (pale surround behind + dark head+jamb front).
  const archW = (x, z, w, y0, yTop, darkC, paleC, depth = 0.28) => {
    const rad = w / 2, straight = Math.max(0, yTop - y0 - rad);
    // pale surround (behind, slightly larger)
    if (straight > 0) box(depth * 0.7, straight, w + 0.5, x + 0.1, y0 + straight / 2, z, paleC);
    { const d2 = new THREE.Mesh(new THREE.CylinderGeometry(rad + 0.25, rad + 0.25, depth * 0.7, 18), toon(paleC));
      d2.rotation.z = Math.PI / 2; d2.position.set(x + 0.1, y0 + straight, z); root.add(d2); }
    // dark opening (front)
    if (straight > 0) box(depth, straight, w, x, y0 + straight / 2, z, darkC);
    const d = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, depth, 18), toon(darkC));
    d.rotation.z = Math.PI / 2; d.position.set(x, y0 + straight, z); root.add(d);
  };

  // ---- instanced-pool records (reuse maggie geo/colours → +0 buckets) ----
  const trunkGeo = new THREE.CylinderGeometry(0.28, 0.4, 3.2, 7); trunkGeo.translate(0, 1.6, 0);
  const canopyGeo = BufferGeometryUtils.mergeBufferGeometries(
    [[0, 0.15, 0, 1.75], [0.95, 0.2, 0.2, 1.25], [-0.85, 0.1, -0.3, 1.2], [0.15, 0.6, -0.55, 1.1]]
      .map(([x, y, z, r]) => { const s = new THREE.SphereGeometry(r, 8, 6); s.translate(x, y, z); return s; }), false);
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const trunks = [], canopies = [], rocks = [];
  const tree = (x, z, sc = 1) => {
    trunks.push({ pos: [x, 0, z], yaw: rr(0, 6.28), scale: [sc, sc, sc], color: 0x6b4a30 });
    canopies.push({ pos: [x, 4.2 * sc + rr(-0.2, 0.35), z], yaw: rr(0, 6.28), scale: [sc, sc, sc], color: 0x3f7d3a });
  };
  const rock = (x, z, s) => rocks.push({ pos: [x, s * 0.35, z], yaw: rr(0, 6.28), scale: [s, s * rr(0.6, 0.9), s], color: 0x8b9098 });

  // =====================================================================
  // 1. ZONE GROUND (this file lays its own surfaces over index.js base fill)
  // =====================================================================
  q(48, 57, 908, 958, 0.0, C.pave);                 // spine extension N
  q(48, 57, 984, 1032, 0.0, C.pave);                // spine extension S
  q(48, 53.2, 958, 984, 0.005, C.plaza);            // forecourt apron
  q(53.2, 59.5, 958, 963.5, 0.006, C.lawnDk);       // urn bed N (lions stand here)
  q(53.2, 59.5, 978, 984, 0.006, C.lawnDk);         // urn bed S
  q(53, 59, 941, 958, 0.004, C.lawn);               // fringe N of urn beds
  q(53, 59, 984, 999, 0.004, C.lawn);               // fringe S of urn beds
  q(59, 96, 995, 999, 0.004, C.lawn);               // fringe S of west block
  q(94, 96, 909, 999, 0.004, C.lawn);               // annex/east yard strip
  // east rim walk (pave; pool strip carved out mid-run)
  q(181, 189, 908, 954, 0.0, C.pave);
  q(183.2, 189, 954, 985, 0.0, C.pave);
  q(181, 189, 985, 1032, 0.0, C.pave);
  q(125, 181, 930, 1032, 0.004, C.lawnDk);          // campus yards (masses occlude)
  // North Garden lawn + gravel path ring
  q(53, 81, 906, 941, 0.004, C.lawn);
  q(57, 77, 910, 912, 0.006, C.pave); q(57, 77, 935, 937, 0.006, C.pave);
  q(57, 59, 910, 937, 0.006, C.pave); q(75, 77, 910, 937, 0.006, C.pave);
  // South Garden soil + pave ring/aisle
  q(55, 95, 999, 1032, 0.003, C.soil);
  q(55, 95, 999, 1001, 0.006, C.pave); q(55, 95, 1030, 1032, 0.006, C.pave);
  q(55, 57, 999, 1032, 0.006, C.pave); q(93, 95, 999, 1032, 0.006, C.pave);
  q(55, 95, 1014, 1017, 0.006, C.pave);             // center aisle
  q(74, 77, 1001, 1030, 0.006, C.pave);             // cross path

  // canvas plates — FrontSide facing a compass dir + rely on a solid rear.
  // 062 DRAW-FOLD: every one-off canvas plate on this campus (frieze, name
  // bands, 3 exhibition banners, chalk board, both Route 66 faces) used to
  // be its OWN 4-vert bmat mesh — 9 draws in every south-park frustum
  // (mp-bean-f3 measured 486>480, the budget gate). They now share ONE
  // hand-packed 1024x1024 atlas + ONE merged mesh = 1 draw, pixel-identical
  // placement (each plate keeps its exact plane size/position/rotation; the
  // atlas just re-homes the texels). flushPlates() runs at the end of the
  // build. rotY-then-tiltX order matches the old mesh Euler ('XYZ').
  const _plates = [];
  const plate = (x, y, z, w, h, rotY, tex, dx, dy, dw, dh, tiltX = 0) =>
    _plates.push({ x, y, z, w, h, rotY, img: tex.image, dx, dy, dw, dh, tiltX });
  function flushPlates() {
    const A = 1024, cv = document.createElement('canvas'); cv.width = A; cv.height = A;
    const g = cv.getContext('2d');
    const geos = [];
    for (const p of _plates) {
      g.drawImage(p.img, p.dx, p.dy, p.dw, p.dh);
      const geo = new THREE.PlaneGeometry(p.w, p.h), uv = geo.attributes.uv;
      const u0 = p.dx / A, u1 = (p.dx + p.dw) / A, v1 = 1 - p.dy / A, v0 = 1 - (p.dy + p.dh) / A;
      uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0);
      geo.rotateY(p.rotY);
      if (p.tiltX) geo.rotateX(p.tiltX);
      geo.translate(p.x, p.y, p.z);
      geos.push(geo);
    }
    const t = new THREE.CanvasTexture(cv); t.anisotropy = 4;
    root.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(geos, false), bmat(0xffffff, { map: t })));
  }

  // =====================================================================
  // 2. THE WEST BLOCK (1893 Allerton) — the beaux-arts hero, face WEST at x59
  // =====================================================================
  {
    const WB = AI.westBlock, cx = (WB.x0 + WB.x1) / 2, cz = (WB.z0 + WB.z1) / 2;
    const w = WB.x1 - WB.x0, d = WB.z1 - WB.z0;
    box(w, 17, d, cx, 8.5, cz, C.stone);                              // body mass
    box(w + 0.4, 0.4, d + 0.4, cx, 16.9, cz, C.trim);                // cornice cap
    box(w - 2, 0.7, d - 2, cx, 17.35, cz, C.roof);                   // low hipped roof
    // rusticated base: drafted coursing (dark joint strips) — FLANK WINGS ONLY
    // (never across the portico bay z963.5–978, so no line crosses an arch)
    for (const y of [1.6, 2.9, 4.2, 5.1]) {
      box(0.16, 0.12, 17.5, 58.92, y, 954.75, C.recess);           // north wing z946–963.5
      box(0.16, 0.12, 17, 58.92, y, 986.5, C.recess);              // south wing z978–995
    }
    // quoins at the two west corners
    for (const qz of [WB.z0 + 1, WB.z1 - 1]) for (let k = 0; k < 5; k++) box(0.5, 0.9, 1.0, 58.85, 0.7 + k * 1.05, qz, C.trim);
    // roundels on the wing base — INSET flush into the wall (never proud, or
    // the disc face reads as a floating ball beside the lions); recessed panel
    for (const [rz, ry] of [[952, 3.2], [989, 3.2]]) {
      const dm = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 14), toon(C.recess));
      dm.rotation.z = Math.PI / 2; dm.position.set(59.02, ry, rz); root.add(dm);   // sunk into face x59
    }
    // --- PORTICO bay (z 963.5–978): porch floor + 3 base entries -----------
    q(57.2, 59.6, 963.5, 978, 1.88, C.plaza);                        // porch/landing slab
    archW(58.9, 970.75, 3.8, 1.9, 5.2, C.glaze, C.trim);             // centre entry (wider)
    archW(58.9, 965.6, 2.8, 1.9, 5.0, C.glaze, C.trim);              // north entry
    archW(58.9, 975.9, 2.8, 1.9, 5.0, C.glaze, C.trim);              // south entry
    box(0.32, 0.3, 15, 58.78, 5.35, 970.75, C.trim);                 // base entablature
    // --- column band (y 5.4–13.8): 4 pale columns + 3 arches + banners ----
    const cols = [964.5, 968.9, 973.1, 977.5];
    for (const czp of cols) {
      cyl(0.5, 0.5, 8.4, 57.5, 9.6, czp, C.trim, 14);                // shaft
      box(1.25, 0.42, 1.25, 57.5, 13.95, czp, C.trim);              // capital
      box(1.15, 0.3, 1.15, 57.5, 5.55, czp, C.trim);               // base block
    }
    const bays = [966.7, 971.0, 975.3];
    for (const bz of bays) archW(58.9, bz, 3.4, 6.0, 13.4, C.glaze, C.trim);
    // exhibition banners (INVENTED shows) hung in the three bays
    const banners = [
      ['#1c3a6e', '#f2efe6', ['SEEING', 'SPOTS'], 'a dot retrospective'],
      ['#8a2b2b', '#f2efe6', ['DEEP', 'DISH'], 'a still life'],
      ['#c9a03a', '#241c10', ['THE BIG', 'OPE'], 'midwestern masters'],
    ];
    bays.forEach((bz, i) => {
      const [bg, fg, words, sub] = banners[i];
      plate(58.72, 9.0, bz, 2.2, 5, -Math.PI / 2,
        bannerTex(bg, fg, words, sub), i * 256, 240, 256, 576, 0.04);  // atlas-folded (062)
      box(0.05, 5, 2.2, 58.8, 9.0, bz, C.glaze);                    // solid dark rear
    });
    // --- flank-wing upper loggia (y 8–13.5): arched recesses + mullions ----
    for (const [wz0, wz1] of [[946, 963.5], [978, 995]]) {
      box(0.4, 0.35, wz1 - wz0, 58.7, 8.0, (wz0 + wz1) / 2, C.trim);  // sill course
      box(0.28, 0.2, wz1 - wz0, 58.62, 8.25, (wz0 + wz1) / 2, C.trim);                      // balustrade rail
      const nb = 4, span = (wz1 - wz0) / nb;
      for (let k = 0; k <= nb; k++) box(0.4, 5.4, 0.5, 58.75, 10.9, wz0 + span * k, C.trim); // column mullions
      for (let k = 0; k < nb; k++) archW(58.88, wz0 + span * (k + 0.5), span - 1.0, 8.6, 13.2, C.recess, C.trim, 0.22);
    }
    // --- entablature + frieze lettering + heavy cornice --------------------
    box(0.35, 0.4, d, 58.75, 14.4, cz, C.trim);                      // architrave (full width)
    box(0.6, 0.95, d + 0.6, 58.6, 15.9, cz, C.trim);                 // heavy cornice
    plate(58.93, 15.0, 970.75, 11, 0.85, -Math.PI / 2, friezeTex('THE ARF INSTITVTE OF CHICAGO'), 0, 0, 1024, 96);
    plate(58.93, 15.0, 954.75, 9, 0.6, -Math.PI / 2, nameTex('RAPHAEL · LEONARDO · TITIAN'), 0, 96, 768, 72);
    plate(58.93, 15.0, 986.5, 9, 0.6, -Math.PI / 2, nameTex('REMBRANDT · HOLBEIN · VERONESE'), 0, 168, 768, 72);
    // --- PEDIMENT over the portico bay (base y16.4, apex y19) --------------
    box(0.72, 0.36, 15, 58.55, 16.45, 970.75, C.trim);              // base cornice
    const steps = [[16.75, 14], [17.2, 11], [17.65, 8], [18.1, 5], [18.55, 2.2]];
    for (const [py, pw] of steps) box(0.34, 0.46, pw, 58.7, py, 970.75, C.stoneC);  // stepped tympanum
    for (const s of [1, -1]) {                                       // raking cornices
      const zc = 970.75 + s * 3.6, ln = Math.hypot(7.25, 2.6);
      const rk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, ln), toon(C.trim));
      rk.position.set(58.5, 17.7, zc); rk.rotation.x = s * Math.atan2(2.6, 7.25); root.add(rk);
    }
    for (const [az, ay] of [[970.75, 19.25], [963.5, 16.7], [978, 16.7]]) {   // acroteria
      const a = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.8, 8), toon(C.trim));
      a.position.set(58.6, ay, az); root.add(a);
    }
    // dentil hint under the pediment cornice
    for (let z = 964.2; z <= 977.4; z += 0.7) box(0.3, 0.24, 0.32, 58.62, 16.15, z, C.trim);
    // --- two angled FLAGPOLES + small Chicago flags -----------------------
    for (const fz of [965, 977]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 6), toon(C.dark));
      p.position.set(57.55, 13.55, fz); p.rotation.z = 0.96; root.add(p);
      const tipX = 56.1, tipY = 14.55;
      box(0.05, 1.0, 1.6, tipX, tipY, fz, C.white);                 // flag field
      for (const sy of [-0.28, 0.28]) box(0.06, 0.16, 1.6, tipX - 0.01, tipY + sy, fz, C.flagBlue); // stripes
      for (const [sx, sz] of [[-0.32, -0.28], [-0.32, 0.28], [0.32, 0], [0, 0]])
        box(0.07, 0.14, 0.14, tipX - 0.04, tipY + sx, fz + sz, C.red); // star dots
    }
    // --- GRAND STEPS visual over the walk ramp (x53.2→57.2, y0→1.9) --------
    const rampY = x => (x - 53.2) / 4 * 1.9;
    for (let i = 0; i < 8; i++) {
      const x0 = 53.2 + i * 0.5, top = rampY(x0 + 0.25);
      const h = top + 0.5;
      box(0.5, h, 14.5, x0 + 0.25, top - h / 2, 970.75, C.plaza);
    }
    // cheek curbs just INSIDE the step edges — clear of the lion plinths
    // (plinth footprint x52.75–56.05, z±0.95 around 962.4 / 979.4)
    for (const cz2 of [963.85, 977.65]) box(4.4, 0.5, 0.45, 55.2, 0.7, cz2, C.trim);
    // --- classical planter URNS (bed corners, off the lion radius) ---------
    for (const [ux, uz] of [[58.6, 961.6], [58.6, 981.2]]) {
      box(1.5, 0.5, 1.5, ux, 0.25, uz, C.trim);                     // plinth
      cyl(0.62, 0.5, 1.3, ux, 1.15, uz, C.trim, 12);               // bowl (taller, rim y1.8)
      const g = new THREE.Mesh(new THREE.SphereGeometry(0.72, 8, 6), toon(C.green));
      g.position.set(ux, 1.75, uz); g.scale.set(1, 0.6, 1); root.add(g);   // greenery nested in the bowl
      collide(ux, uz, 0.9);
    }
    // --- sandwich board on the portico landing (chalk faces WEST approach) --
    { const bx = 58.6, bz = 969.4, by = 1.9;
      plate(bx - 0.09, by + 0.55, bz, 0.9, 0.95, -Math.PI / 2, chalkTex(), 768, 240, 256, 200);  // chalkboard front
      box(0.05, 0.95, 0.9, bx + 0.06, by + 0.55, bz, C.trim);       // pale A-frame rear
      box(0.28, 0.1, 0.9, bx, by + 1.05, bz, C.trim);              // top ridge cap
      for (const fz of [bz - 0.35, bz + 0.35]) box(0.3, 0.1, 0.1, bx, by + 0.03, fz, C.trim); // feet
      collide(bx, bz, 0.5);
    }
  }

  // =====================================================================
  // 3. NORTH GARDEN (x53–81 z906–941) — hedged sculpture garden, W+N OPEN
  // =====================================================================
  {
    // clipped hedge rows: EAST edge (x81) + SOUTH edge (z941) + short returns
    box(1.0, 1.4, 35, 81.4, 0.7, 923.5, C.green);                   // east hedge (z906–941)
    box(28, 1.4, 1.0, 67, 0.7, 941.4, C.green);                     // south hedge (x53–81)
    box(1.0, 1.4, 5, 53.4, 0.7, 938.9, C.green);                    // SW corner return
    box(1.0, 1.4, 5, 81.4, 0.7, 908.5, C.green);                    // NE corner return
    // Flying Dragon (71.8, 930.2) — red Calder-ish plates + beaked cantilever
    { const x = 71.8, z = 930.2;
      for (const [px, pz, ry, ln] of [[-0.6, 0, 0.5, 3.0], [0.5, 0.3, -0.7, 2.6], [0.1, -0.6, 1.2, 2.4]]) {
        const pl = new THREE.Mesh(new THREE.BoxGeometry(0.08, ln, 1.1), toon(C.red));
        pl.position.set(x + px, ln / 2 + 0.1, z + pz); pl.rotation.set(0.35, ry, 0.3); root.add(pl);
      }
      const cant = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 2.6), toon(C.red));
      cant.position.set(x + 0.2, 2.8, z + 0.4); cant.rotation.set(0.2, 0.4, 0); root.add(cant);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.9, 5), toon(C.red));
      beak.position.set(x + 1.1, 2.9, z + 1.0); beak.rotation.z = 1.2; root.add(beak);
      collide(x, z, 1.2);
    }
    // Large Interior Form (61.4, 914) — dark bronze lumpy vertical + void torus
    { const x = 61.4, z = 914;
      for (const [sy, sc, sw] of [[0.9, 1.0, 1.1], [2.0, 0.85, 0.9], [2.9, 0.6, 0.7]]) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), toon(C.soil));
        b.position.set(x + (sy > 1.5 ? 0.15 : 0), sy, z); b.scale.set(sw, sc, sw * 0.85); root.add(b);
      }
      const tor = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.24, 8, 14), toon(C.soil));
      tor.position.set(x + 0.05, 1.7, z + 0.55); tor.rotation.x = 1.2; root.add(tor);
      collide(x, z, 1.2);
    }
    // Cubi VII (67.6, 919.4) — brushed-steel stacked boxes on a post (SELF-LIT)
    { const x = 67.6, z = 919.4;
      bbox(0.5, 1.7, 0.5, x, 0.85, z, steel);                       // post
      bbox(1.7, 0.5, 0.6, x, 1.9, z, steel, 0.4);                   // arm 1
      bbox(0.6, 1.5, 0.6, x + 0.3, 2.7, z + 0.2, steel, 0.7);       // upright 2
      bbox(1.3, 0.5, 0.55, x - 0.2, 3.2, z, steel, -0.5);           // arm 3
      collide(x, z, 1.2);
    }
    // pool trees around the edges
    for (const [tx, tz] of [[56.5, 909], [78.5, 912], [57, 938], [76, 937], [64.5, 908]]) tree(tx, tz, 0.9);
  }

  // =====================================================================
  // 4. SOUTH GARDEN (x55–95 z999–1032) — hawthorn bosque + Great Lakes fount
  // =====================================================================
  {
    // hawthorn BOSQUE grid (skip the fountain rect + the centre aisle)
    for (let x = 59; x <= 92; x += 6.5) for (let z = 1002; z <= 1030; z += 6.5) {
      if (x > 79.5 && x < 88 && z > 1006 && z < 1018) continue;      // fountain buffer
      if (z > 1013.5 && z < 1017.5) continue;                       // centre aisle
      const sc = rr(0.65, 0.8), jx = x + rr(-0.5, 0.5), jz = z + rr(-0.5, 0.5);
      tree(jx, jz, sc); collide(jx, jz, 0.45);
    }
    // low hedge border (z999, z1032, x95 — WEST x55 open to the spine)
    box(40, 1.2, 0.9, 75, 0.6, 999.4, C.green);
    box(40, 1.2, 0.9, 75, 0.6, 1031.6, C.green);
    box(0.9, 1.2, 33, 94.6, 0.6, 1015.5, C.green);
    // FOUNTAIN OF THE GREAT LAKES (x81.9–86.5 z1009–1015.5, carved non-walk)
    { const fx = 84.2, fz = 1012.2;
      box(5.4, 0.6, 7.4, fx, 0.3, fz, C.trim);                      // raised basin curb
      waterQuad(81.5, 86.9, 1008.6, 1015.9, 0.35, fountW);          // dark water
      const rockM = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), toon(C.trim));
      rockM.position.set(fx, 0.9, fz); rockM.scale.set(1.5, 0.8, 1.4); root.add(rockM);
      // five staggered verdigris figures, each cradling a flattened SHELL
      const figs = [[fx, 3.6, fz, 1.0], [fx - 1.3, 3.0, fz - 0.5, 0.9], [fx + 1.3, 2.9, fz + 0.4, 0.9],
                    [fx - 0.6, 2.4, fz + 1.2, 0.85], [fx + 0.7, 2.5, fz - 1.2, 0.85]];
      for (const [gx, gy, gz, gs] of figs) {
        const body = new THREE.Mesh(new THREE.ConeGeometry(0.55 * gs, 1.9 * gs, 8), toon(C.verd));
        body.position.set(gx, gy - 0.3, gz); root.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.32 * gs, 8, 6), toon(C.verd));
        head.position.set(gx, gy + 0.75 * gs, gz); root.add(head);
        const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.45 * gs, 0.5 * gs, 0.14, 10), toon(C.verd));
        shell.position.set(gx + 0.35 * gs, gy + 0.2 * gs, gz + 0.35 * gs); shell.rotation.x = 0.5; root.add(shell);
      }
      // water threads shell→shell→basin (self-lit)
      for (const [wx, wy, wz, wh] of [[fx - 0.4, 2.7, fz + 0.5, 1.4], [fx + 0.6, 2.2, fz - 0.4, 1.3], [fx, 1.5, fz + 0.6, 1.4]])
        bbox(0.09, wh, 0.09, wx, wy, wz, thread);
      collide(fx, fz, 2.4);
    }
    // ANNEX SCREEN WALL behind the fountain (separates garden from rail trench)
    box(1.5, 9, 33, 95.75, 4.5, 1015.5, C.stone);
    box(1.9, 0.4, 33.4, 95.75, 9.1, 1015.5, C.trim);                // pale coping
  }

  // =====================================================================
  // 5. THE RAIL TRENCH (x96–124 z909–1032, floor y−3) + GUNSAULUS WAIST
  // =====================================================================
  {
    q(96, 124, 909, 1032, -3, C.ballast);                           // ballast floor
    // retaining walls inside the four rims (y−3 → +0.15) + pale coping at grade
    box(0.3, 3.15, 123, 96.15, -1.425, 970.5, C.wall);             // west
    box(0.3, 3.15, 123, 123.85, -1.425, 970.5, C.wall);           // east
    box(28, 3.15, 0.3, 110, -1.425, 909.15, C.wall);              // north
    box(28, 3.15, 0.3, 110, -1.425, 1031.85, C.wall);             // south
    box(0.55, 0.3, 123, 96.1, 0.2, 970.5, C.trim); box(0.55, 0.3, 123, 123.9, 0.2, 970.5, C.trim);
    box(28, 0.3, 0.55, 110, 0.2, 909.1, C.trim); box(28, 0.3, 0.55, 110, 0.2, 1031.9, C.trim);
    // two track pairs (x≈104, x≈114), rails y−2.85 running z914–1028
    for (const tx of [104, 114]) for (const g of [-0.7, 0.7])
      box(0.1, 0.16, 114, tx + g, -2.85, 971, C.wall);
    // catenary masts along x109 every ~16 m + cross-arms over the tracks
    for (let z = 918; z <= 1026; z += 16) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.5, 6), toon(C.dark));
      p.position.set(109, -0.25, z); root.add(p);
      box(11, 0.16, 0.16, 109, 2.35, z, C.dark);                   // cross-arm over both tracks
    }
    // PARKED SILVER EMU (one Metra gallery car ~26 long, roof pokes above grade)
    { const ex = 104.25, ez0 = 985, ez1 = 1012, ecz = (ez0 + ez1) / 2;
      bbox(3.5, 4, ez1 - ez0, ex, -1, ecz, steel);                 // body y−3 → +1
      box(3.6, 0.6, ez1 - ez0 - 2, ex, 1.35, ecz, C.dark);         // roof hump
      for (const sx of [-1.79, 1.79]) box(0.06, 0.7, ez1 - ez0 - 2, ex + sx, -0.3, ecz, C.glaze); // window band
      box(3.5, 0.5, 0.4, ex, -1.6, ez0 + 0.3, C.orange);           // orange nose stripe
    }
    // --- GUNSAULUS WAIST (x94–125 z964.5–974 h12) bridging the trench ------
    box(31, 8, 9.5, 109.5, 8, 969.25, C.stone);                    // stone body (soffit y4)
    box(31.4, 0.55, 9.9, 109.5, 12.1, 969.25, C.trim);            // pale cornice
    for (const px of [100, 118]) box(1.6, 7, 1.6, px, 0.5, 969.25, C.wall);  // piers to the floor
    for (const fz of [964.35, 974.15])                             // dark window recesses, N+S faces
      for (let x = 98; x <= 121; x += 4.6) {
        box(2.6, 4.4, 0.3, x, 8.2, fz, C.glaze);                   // dark opening
        box(3.0, 0.35, 0.25, x, 10.5, fz, C.trim);                // pale head lintel
      }
  }

  // =====================================================================
  // 6. EAST CAMPUS masses (quiet museum stone) + reflecting POOL STRIP
  // =====================================================================
  {
    const mass = (x0, x1, z0, z1, h, c) => {
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
      box(w, h, d, cx, h / 2, cz, c);
      box(w + 0.4, 0.5, d + 0.4, cx, h + 0.1, cz, C.trim);        // pale coping
      box(w - 1.5, 0.6, d - 1.5, cx, h + 0.4, cz, C.roof);        // flat roof cap
    };
    mass(125, 147, 973, 1031, 12, C.stoneC);                       // McKinlock
    mass(147, 175, 980, 1027, 12, C.stoneC);                       // SE block
    mass(168, 180.3, 942, 980, 13, C.stoneC);                      // Columbus pavilion
    // shallow dark arched-niche hints on the quiet faces
    for (let z = 978; z <= 1026; z += 8) archW(146.9, z, 2.2, 2.5, 7.5, C.recess, C.stoneC, 0.2);   // McKinlock W-ish (face x147)
    for (let z = 986; z <= 1022; z += 8) box(2.0, 4.4, 0.3, 147.1, 5, z, C.recess);                 // SE block niches (face x147)
    // Columbus pavilion grander EAST face (x180.3): pilaster rhythm + glazing
    for (let z = 945; z <= 978; z += 4.3) box(0.4, 12, 0.8, 180.35, 6, z, C.trim);
    for (const gz of [951, 961, 971]) box(0.35, 8.5, 2.6, 180.3, 6.5, gz, C.glaze);
    // POOL STRIP (x180.3–183 z954–985): pale curb + reflecting water
    box(3.1, 0.4, 31.6, 181.55, 0.2, 969.5, C.trim);               // curb ring
    waterQuad(180.5, 183, 954.5, 984.5, 0.06, poolW);
  }

  // =====================================================================
  // 7. STOCK EXCHANGE ARCH at (184, 935) — freestanding, opening axis E–W
  // =====================================================================
  {
    // (reworked by the main session after A's pass: the post-and-lintel v1
    // read as a bare white goalpost with a floating dentil row — a real ARCH
    // needs its voussoir ring. All C.trim/C.recess → folds, +0 buckets.)
    const ax = 184;
    for (const pz of [931.5, 938.5]) {
      box(2.6, 0.6, 2.6, ax, 0.3, pz, C.trim);                      // base plinth
      box(2, 8.4, 2, ax, 4.6, pz, C.trim);                          // pier shaft
      box(2.5, 0.5, 2.5, ax, 9.05, pz, C.trim);                     // pier cap
      collide(ax, pz, 1.3);
    }
    for (let k = 0; k < 9; k++) {                                   // voussoir ring (intrados curve, dies into the piers)
      const th = Math.PI * (k + 0.5) / 9;
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.85, 1.1), toon(C.trim));
      m.position.set(ax, 5.6 + Math.sin(th) * 3.2, 935 + Math.cos(th) * 3.2);
      m.rotation.x = -(th - Math.PI / 2);                           // follow the curve — no jacknifed crumbs
      root.add(m);
    }
    box(1.3, 1.7, 1.25, ax, 9.35, 935, C.trim);                     // keystone (proud at the crown)
    box(2.4, 1.5, 10.4, ax, 9.95, 935, C.trim);                     // entablature beam
    box(2.9, 0.5, 10.9, ax, 10.95, 935, C.trim);                    // projecting cornice
    for (const s of [-1, 1]) {
      for (let z = 930.2; z <= 939.8; z += 0.8)
        box(0.32, 0.3, 0.42, ax + s * 1.28, 10.5, z, C.trim);       // dentils UNDER the cornice (attached, both faces)
      for (const mz of [932.4, 937.6]) {                            // spandrel medallions, both faces
        const md = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 14), toon(C.recess));
        md.rotation.z = Math.PI / 2; md.position.set(ax + s * 1.05, 8.3, mz); root.add(md);
      }
    }
  }

  // =====================================================================
  // 8. LOLLA LOAD-IN on closed Monroe (x48–190 z894–908, festival street)
  // =====================================================================
  {
    // 7 traffic cones loosely grouped
    for (const [cx, cz] of [[98, 900], [106, 903], [113, 898], [120, 905], [126, 899], [130, 903], [110, 901]]) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.55, 8), toon(C.orange));
      c.position.set(cx, 0.28, cz); root.add(c);
      box(0.6, 0.06, 0.6, cx, 0.03, cz, C.orange); collide(cx, cz, 0.35);
    }
    // wood PALLET stack (two pallets + a strapped bundle)
    { const px = 120, pz = 903.5;
      for (const py of [0.1, 0.35]) for (let s = -0.6; s <= 0.6; s += 0.3) box(1.5, 0.08, 0.16, px, py, pz + s, C.wood);
      box(1.5, 0.12, 1.3, px, 0.5, pz, C.wood);                     // strapped bundle
      box(1.55, 0.05, 0.1, px, 0.5, pz - 0.4, C.dark); box(1.55, 0.05, 0.1, px, 0.5, pz + 0.4, C.dark); // straps
      collide(px, pz, 0.9);
    }
    // crowd-fence panels: 3 STANDING end-to-end (z906.5, x150–160) + 2 LEANING
    const fencePanel = (x, z, ry, lean) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; if (lean) g.rotation.z = lean;
      const add = (w, h, d, ox, oy) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), steel()); m.position.set(ox, oy, 0); g.add(m); };
      add(0.06, 1.1, 0.06, -1.2, 0.55); add(0.06, 1.1, 0.06, 1.2, 0.55);      // uprights
      add(2.4, 0.06, 0.06, 0, 0.3); add(2.4, 0.06, 0.06, 0, 0.85);           // cross bars
      root.add(g);
    };
    for (let i = 0; i < 3; i++) { fencePanel(151.2 + i * 2.5, 906.5, 0); collide(151.2 + i * 2.5, 906.5, 0.6); }
    fencePanel(119.2, 903.5, 0.2, -0.55); fencePanel(121.0, 903.6, 0.2, 0.55);   // leaning on the pallets
    // bare scaffold arch over the spine crossing (z901, hugging the edges)
    for (const sx of [48.2, 56.8]) { box(0.5, 5, 0.5, sx, 2.5, 901, C.dark); collide(sx, 901, 0.4); }
    box(9.1, 0.5, 0.5, 52.5, 5.2, 901, C.dark);                     // top beam (no banner — 061 dresses it)
  }

  // =====================================================================
  // 9. ROUTE 66 SIGN at (48.5, 968) on the forecourt apron edge
  // =====================================================================
  {
    // pulled N of the portico axis so its post doesn't float dead-centre; the
    // shield reads from BOTH the park (east) and the road (west) — a landmark.
    const sx = 48.5, sz = 962.5, tex = route66Tex();
    box(0.14, 2.05, 0.14, sx, 1.02, sz, C.dark);                    // lollipop post (ends at panel bottom)
    plate(sx + 0.05, 2.35, sz, 1.0, 1.25, Math.PI / 2, tex, 768, 440, 256, 320);   // park side
    plate(sx - 0.05, 2.35, sz, 1.0, 1.25, -Math.PI / 2, tex, 768, 440, 256, 320);  // road side
    collide(sx, sz, 0.4);
  }

  // =====================================================================
  // 10. THE MODERN WING (main session, post-A — the gap both executors
  //     assumed the other owned): clean white-limestone-and-glass mass as
  //     the Nichols landing, EXTERIOR ONLY (ART_M.modernWing x121–171,
  //     z909–930, h14; the Bluhm terrace notch x124.8–132.4 × z909.5–922
  //     carries the y13 walk — nichols.js owns its rails/door/benches).
  //     The x121–124.8 sliver stays open trench air (the trench's east wall
  //     at x124 already retains it); the flying-carpet canopy overhangs it.
  // =====================================================================
  {
    const W = M.ART_M.modernWing, B = W.bluhm;
    const wingWhite = 0xdad6ca;                     // maggie fieldhouse frame hex → folds
    const glass = bmat(0x86a2b6);                   // one shared instance (bmat doesn't cache)
    // main mass east of the terrace notch: base course + glass volume + fins
    box(171 - 132.4, 1.0, 930 - 909.5, (132.4 + 171) / 2, 0.5, (909.5 + 930) / 2, wingWhite);
    { const g = new THREE.Mesh(new THREE.BoxGeometry(171 - 132.4 - 0.8, 11.6, 930 - 909.5 - 0.8), glass);
      g.position.set((132.4 + 171) / 2, 6.8, (909.5 + 930) / 2); root.add(g); }
    for (let x = 133.6; x <= 170; x += 3.2)         // white mullion fins, north (park) face
      box(0.26, 11.8, 0.34, x, 6.9, 909.55, wingWhite);
    box(171 - 132.4 + 0.3, 0.9, 930 - 909.5 + 0.3, (132.4 + 171) / 2, 13.05, (909.5 + 930) / 2, wingWhite); // fascia
    box(171 - 132.4 + 0.1, 0.4, 930 - 909.5 + 0.1, (132.4 + 171) / 2, 13.7, (909.5 + 930) / 2, C.roof);     // roof slab
    // west + east end walls read as solid limestone
    box(0.6, 13.4, 930 - 909.5, 132.4, 6.7, (909.5 + 930) / 2, wingWhite);
    box(0.6, 13.4, 930 - 909.5, 170.8, 6.7, (909.5 + 930) / 2, wingWhite);
    // the Bluhm terrace: solid under-plinth + pale slab whose top hits y13
    box(B.x1 - B.x0, 12.7, B.z1 - B.z0, (B.x0 + B.x1) / 2, 6.35, (B.z0 + B.z1) / 2, wingWhite);
    box(B.x1 - B.x0 + 0.4, 0.3, B.z1 - B.z0 + 0.4, (B.x0 + B.x1) / 2, 12.85, (B.z0 + B.z1) / 2, C.plaza);
    // small pave court where the deck sweeps in south of the terrace
    q(B.x0, 132.4, B.z1, 930, 0.004, C.plaza);
    // FLYING-CARPET canopy: a thin white slab floating over roof + terrace +
    // the trench sliver, on slim posts (the wing's signature).
    // 062/issue 024b: RAISED from y14.9 → y18.1 (underside 17.95). At 14.9 the
    // 1.9 m of terrace headroom buried the chase cam (~y16.6) INSIDE the slab —
    // "the ceiling is too low to see anything." The bay-camera lesson: NEVER
    // leave the chase cam inside geometry; give the terrace a real overhead deck.
    // SELF-LIT (bmat, the Nichols-hull escape): once raised, this big near-
    // horizontal slab is the dominant plane in every terrace view, and a toon
    // slab that size reads PEA-GREEN from below — its underside catches the
    // hemisphere's green ground-bounce (PITFALLS "toon steel reads GREEN"). The
    // signature blade is WHITE, so bake it cream self-lit. +1 draw (no longer
    // folds into the wingWhite merge bucket). Posts stay toon (thin verticals ok).
    { const carpet = new THREE.Mesh(new THREE.BoxGeometry(172.5 - 122.5, 0.3, 931.5 - 907.5), bmat(0xe6e4dc));
      carpet.position.set((122.5 + 172.5) / 2, 18.1, (907.5 + 931.5) / 2); root.add(carpet); }
    for (const [px, pz] of [[134, 911], [134, 928], [152, 911], [152, 928], [169, 911], [169, 928]])
      cyl(0.14, 0.14, 4.05, px, 15.925, pz, wingWhite, 8);          // short roof posts (roof top y13.9 → underside y17.95)
    for (const [px, pz] of [[125.6, 911], [125.6, 920]])
      cyl(0.16, 0.16, 4.95, px, 15.475, pz, wingWhite, 8);          // tall terrace posts (terrace y13 → underside y17.95)
  }

  // ---- flush instanced pools (reuse maggie buckets → +0 draws) ----
  poolInstanced('mg-tree-trunk', trunkGeo, trunks);
  poolInstanced('mg-tree-canopy', canopyGeo, canopies);
  poolInstanced('mg-rock', rockGeo, rocks);
  flushPlates();   // the campus plate atlas — ONE draw for all 9 canvas plates (062)
}

// ------------------------- canvas-texture helpers ----------------------
function fitFont(g, text, maxW, px, family, weight = '') {
  let p = px;
  do { g.font = `${weight} ${p}px ${family}`; if (g.measureText(text).width <= maxW) break; p -= 2; } while (p > 8);
  g.font = `${weight} ${p}px ${family}`; return p;
}
function friezeTex(text) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 96; const g = cv.getContext('2d');
  g.fillStyle = '#cabfae'; g.fillRect(0, 0, 1024, 96);
  g.fillStyle = '#463a2b'; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFont(g, text, 968, 60, 'Georgia,serif', '600'); g.fillText(text, 512, 52);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
function nameTex(text) {
  const cv = document.createElement('canvas'); cv.width = 768; cv.height = 72; const g = cv.getContext('2d');
  g.fillStyle = '#cabfae'; g.fillRect(0, 0, 768, 72);
  g.fillStyle = '#4d4130'; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFont(g, text, 720, 42, 'Georgia,serif', '600'); g.fillText(text, 384, 40);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
function bannerTex(bg, fg, words, sub) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 576; const g = cv.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 576);
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 6; g.strokeRect(9, 9, 238, 558);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  const n = words.length, gap = 470 / n;
  words.forEach((w, i) => { fitFont(g, w, 214, 92, 'Arial,sans-serif', '800'); g.fillText(w, 128, 70 + gap * (i + 0.5)); });
  g.fillStyle = fg; fitFont(g, sub, 214, 26, 'Arial,sans-serif', ''); g.fillText(sub, 128, 548);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
function chalkTex() {
  const cv = document.createElement('canvas'); cv.width = 384; cv.height = 300; const g = cv.getContext('2d');
  g.fillStyle = '#2e4638'; g.fillRect(0, 0, 384, 300);
  g.strokeStyle = '#c9bfa6'; g.lineWidth = 10; g.strokeRect(10, 10, 364, 280);
  g.fillStyle = '#efe6cf'; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFont(g, 'FREE DAY', 320, 74, 'Arial,sans-serif', '800'); g.fillText('FREE DAY', 192, 90);
  fitFont(g, 'TOMORROW', 320, 74, 'Arial,sans-serif', '800'); g.fillText('TOMORROW', 192, 165);
  fitFont(g, '(the lions never take a day off)', 340, 26, 'Arial,sans-serif', ''); g.fillText('(the lions never take a day off)', 192, 245);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
function route66Tex() {
  const cv = document.createElement('canvas'); cv.width = 288; cv.height = 360; const g = cv.getContext('2d');
  g.fillStyle = '#f5f2e8'; g.fillRect(0, 0, 288, 360);
  g.fillStyle = '#1c1c1c'; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFont(g, 'ROUTE 66', 250, 40, 'Arial,sans-serif', '800'); g.fillText('ROUTE 66', 144, 40);
  // US-66 shield outline
  g.strokeStyle = '#1c1c1c'; g.lineWidth = 7; g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(80, 95); g.lineTo(208, 95); g.quadraticCurveTo(214, 150, 190, 210);
  g.quadraticCurveTo(150, 258, 144, 262); g.quadraticCurveTo(138, 258, 98, 210);
  g.quadraticCurveTo(74, 150, 80, 95); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#1c1c1c'; g.font = '700 22px Arial,sans-serif'; g.fillText('ILLINOIS', 144, 120);
  g.font = '900 74px Arial,sans-serif'; g.fillText('66', 144, 178);
  g.font = '800 32px Arial,sans-serif'; g.fillText('BEGINS HERE', 144, 320);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
