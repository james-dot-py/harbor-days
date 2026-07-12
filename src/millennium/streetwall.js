// =====================================================================
// MILLENNIUM PARK — the Michigan Ave CLIFF + Randolph GIANTS + east/south
// backdrops (task 041, executor C). This is the landmark-holder: every
// in-park view west/north terminates in a CONTINUOUS limestone-and-terra-
// cotta canyon wall (not scattered towers), with a classical COLONNADE
// block, gothic peaks, and one warm-window read; the north horizon is the
// bold Loop skyline (Prudential sign-slab, diamond-topped twin, Aon white
// monolith, Blue Cross glass).
//
// PERF: static toon-coloured BOX/CONE/CYL masses fold by colour in
// mergeCellStatic (~1 draw per palette colour); ALL lit windows are ONE
// instanced bucket (single warm colour). Attach everything to
// millenniumRoot. Randomness is LOCAL (mulberry32 below) — never shared rng.
// HARD FLOOR: nothing at z < 680 (the giants front the band at z 692,
// bodies reach back to z 680 exactly — never past it).
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { millenniumRoot, emitInstanced, poolInstanced } from './index.js';
import { toon, bmat, mulberry32 } from '../core.js';
import * as M from '../data/millennium.js';

// warm limestone / buff / terra-cotta / brick — the cliff folds to these
const PAL   = [0xc9bfa6, 0xd8cdb2, 0xb9a88a, 0xa89478, 0xcabfae, 0x9a8468];
const PALE  = 0xe6ddc8;   // pale limestone: colonnade, gothic crowns, arch
const DARK  = 0x6f5c44;   // inset shadow band (suggests arched fronts)
const COPING = 0xa89478;  // coping cap (a palette tone → folds with masses)
const GREYS = [0x7e8da6, 0x8a9fbe, 0x6f7a8e];   // cool Loop backdrop
const WIN   = 0xffd6a0;   // one warm lit-window colour (the whole bucket)
const ACC   = 0x2c333d;   // cool-dark accent (giant sign band / diamond antenna / fin reveals) — ONE shared bucket

const FRONT = 30, DEPTH = 18, BACKx = FRONT - DEPTH / 2;   // cliff geometry
const GFRONT = 692, GDEPTH = 12, GBACKz = GFRONT - GDEPTH / 2; // giants

export function buildStreetwall() {
  const R = mulberry32(0x4d3000);
  const rr = (a, b) => a + (b - a) * R();
  const pick = arr => arr[Math.floor(rr(0, arr.length))];

  const wins = [];   // ALL lit-window records → one emitInstanced at the end

  // ---- primitive helpers (every mesh is static toon → merged by colour) ----
  const box = (cx, cy, cz, sx, sy, sz, color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), toon(color));
    m.position.set(cx, cy, cz); millenniumRoot.add(m); return m;
  };
  const cone = (cx, cy, cz, r, h, color, seg = 4) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), toon(color));
    m.position.set(cx, cy, cz); m.rotation.y = Math.PI / 4; millenniumRoot.add(m); return m;
  };
  const cyl = (cx, cy, cz, r, h, color) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8), toon(color));
    m.position.set(cx, cy, cz); millenniumRoot.add(m); return m;
  };

  // lit windows on an X-facing wall (cliff +x / east band -x): cols along z
  const winsX = (xFace, dir, zc, w, hTop, o = {}) => {
    const { step = 2.4, fh = 3.4, prob = 0.4, y0 = 4, top = 3 } = o;
    const x = xFace + dir * 0.05, yaw = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    const nC = Math.max(1, Math.floor((w - 1) / step)), z0 = zc - (nC - 1) * step / 2;
    for (let c = 0; c < nC; c++) { const z = z0 + c * step;
      for (let y = y0; y < hTop - top; y += fh)
        if (R() < prob) wins.push({ pos: [x, y, z], scale: [0.7, 1.0, 1], color: WIN, yaw }); }
  };
  // lit windows on a +z-facing wall (the giants face the park): cols along x
  const winsZ = (zFace, xc, w, hTop, o = {}) => {
    const { step = 3.2, fh = 5.5, prob = 0.22, y0 = 8, top = 8 } = o;
    const z = zFace + 0.05;
    const nC = Math.max(1, Math.floor((w - 1) / step)), x0 = xc - (nC - 1) * step / 2;
    for (let c = 0; c < nC; c++) { const x = x0 + c * step;
      for (let y = y0; y < hTop - top; y += fh)
        if (R() < prob) wins.push({ pos: [x, y, z], scale: [0.9, 1.3, 1], color: WIN, yaw: 0 }); }
  };

  // ==================================================================
  // 1. THE MICHIGAN AVE CLIFF — march z 684..935, front face at x30,
  //    bodies reaching west to ~x12. Fill gaps between the named anchors
  //    with generic masses so the wall reads CONTINUOUS (no sky at base).
  // ==================================================================
  const placeGeneric = (cz, w, h) => {
    const c = pick(PAL);
    box(BACKx, h / 2, cz, DEPTH, h, w, c);
    box(BACKx, h + 0.6, cz, DEPTH + 0.4, 1.2, w + 0.5, COPING);   // coping cap
    winsX(FRONT, +1, cz, w, h);
  };

  const placeAnchor = (a, opts = {}) => {
    const w = a.w, h = a.h, cz = a.z;
    // body colour: warm limestone (pick keeps the section-1 rng order) except the
    // south-extension slabs — cool glass (Blue Cross hex) / white terra-cotta.
    const c = a.style === 'glass' ? 0x66aecb : a.style === 'santafe' ? 0xeef0f2 : pick(PAL);
    box(BACKx, h / 2, cz, DEPTH, h, w, c);                        // the body mass

    if (a.style === 'colonnade') {
      // CLASSICAL COLONNADE (Cultural Center / old Public Library) — task 056
      // item 4: a DEEP portico, not a flat face. Columns stand proud on a
      // stylobate against a recessed shadow field, capped by capitals, a heavy
      // cornice and a central pediment → reads as historic Michigan Boulevard.
      const n = 10, colH = h - 9;
      box(FRONT + 0.05, 2 + colH / 2, cz, 0.2, colH, w, DARK);    // recessed portico shadow (columns read against it)
      box(FRONT + 0.15, 1.2, cz, 1.9, 2.4, w + 0.6, PALE);        // stylobate base course
      for (let i = 0; i < n; i++) {
        const z = cz - w / 2 + (i + 0.5) * (w / n);
        cyl(FRONT + 0.5, 2 + colH / 2, z, 0.62, colH, PALE);      // column shaft (proud of the face)
        box(FRONT + 0.5, 2 + colH + 0.35, z, 1.5, 0.7, 1.5, PALE);// capital block
      }
      box(BACKx, colH + 3.2, cz, DEPTH + 0.4, 1.6, w, PALE);      // architrave beam
      box(BACKx, h + 1.3, cz, DEPTH + 1, 2.6, w + 1.2, PALE);     // heavy cornice cap
      box(BACKx, h + 3.6, cz, DEPTH, 2.2, w * 0.5, PALE);         // central attic / pediment block
      if (opts.inscription) {                                     // ORCHESTRA HALL frieze (Symphony Center)
        const tex = wordTex(opts.inscription, '#e6ddc8', '#3a352a', 'Georgia,serif', 512, 64);
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, 2.4), bmat(0xffffff, { map: tex }));
        plane.position.set(FRONT + 0.2, h - 6, cz); plane.rotation.y = Math.PI / 2;  // FrontSide faces EAST; the body box is the solid rear
        millenniumRoot.add(plane);
      }
      return;                                                     // (few windows: classical)
    }
    if (a.style === 'glass') {
      // BORG-WARNER — cool glass slab: thin pale mullion fins + a modest lit scatter.
      const nfin = Math.max(3, Math.round(w / 3));
      for (let i = 0; i < nfin; i++) {
        const z = cz - w / 2 + (i + 0.5) * (w / nfin);
        box(FRONT + 0.12, h / 2 + 1, z, 0.2, h * 0.94, 0.35, PALE);   // slim pale mullion fin
      }
      box(BACKx, h + 0.6, cz, DEPTH + 0.3, 1.0, w + 0.4, COPING);     // slim coping cap
      winsX(FRONT, +1, cz, w, h, { prob: 0.3 });
      return;
    }
    if (a.style === 'santafe') {
      // RAILWAY EXCHANGE — white terra-cotta: fine pale pier rhythm, heavy cornice,
      // and the ROOFTOP "SANTA FE" skyline sign (self-lit, reads at 150 m).
      const npier = Math.max(6, Math.round(w / 2.2));
      for (let i = 0; i < npier; i++) {
        const z = cz - w / 2 + (i + 0.5) * (w / npier);
        box(FRONT + 0.15, 1 + (h - 4) / 2, z, 0.5, h - 4, 0.55, 0xeef0f2);   // fine pale pier
      }
      box(BACKx, h + 1.1, cz, DEPTH + 0.6, 2.4, w + 0.9, 0xeef0f2);          // heavy cornice
      const sw = 14, sh = 4, sy = h + 3, sx = FRONT + 0.6;
      const stex = wordTex('SANTA FE', '#17335c', '#f4f6fa', 'Arial,Helvetica,sans-serif', 448, 128);
      const front = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), bmat(0xffffff, { map: stex }));
      front.position.set(sx, sy, cz); front.rotation.y = Math.PI / 2; millenniumRoot.add(front);  // FrontSide faces EAST
      const back = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), bmat(0x17335c));                // solid dark rear (no lone-DoubleSide mirror)
      back.material.side = THREE.BackSide;
      back.position.set(sx, sy, cz); back.rotation.y = Math.PI / 2; millenniumRoot.add(back);
      for (const dz of [-sw * 0.32, 0, sw * 0.32])                          // 3 thin dark support posts above the roof
        box(FRONT + 0.4, h + 1.5, cz + dz, 0.28, 3.0, 0.28, ACC);
      winsX(FRONT, +1, cz, w, h, { prob: 0.28 });
      return;
    }
    if (a.style === 'gothic') {
      // VENETIAN GOTHIC (Chicago Athletic Assn) — task 056 item 4: pale
      // terra-cotta tracery ribs marching up a recessed dark field, a crenellated
      // pinnacled crown + the pointed peak → ornate, not a flat slab.
      box(FRONT + 0.05, (h - 2) / 2 + 1, cz, 0.2, h - 2, w - 0.8, DARK);   // recessed dark tracery field
      const np = 5;
      for (let i = 0; i < np; i++) {                              // vertical mullion piers (the gothic rhythm)
        const z = cz - w / 2 + (i + 0.5) * (w / np);
        box(FRONT + 0.4, (h - 4) / 2 + 1, z, 0.85, h - 4, 0.7, PALE);
      }
      box(FRONT + 0.35, h - 2.5, cz, w - 0.8, 1.1, 0.9, PALE);    // pale sill/transom band across the tracery
      box(BACKx, h + 2, cz, DEPTH - 2, 4, w - 3, PALE);           // stepped crown block
      cone(BACKx, h + 4 + w * 0.35, cz, w * 0.55, w * 0.7, PALE); // pointed peak
      for (const s of [-1, 1])                                    // corner pinnacles (crenellated gothic crown)
        cone(BACKx, h + 3.4, cz + s * (w / 2 - 1.2), 1.2, 4.5, PALE);
    } else if (a.style === 'sullivan') {
      box(BACKx, h - 1, cz, DEPTH + 0.4, 2.5, w + 1.5, 0xd8cdb2); // strong horizontal cornice
      for (let i = 0; i < 5; i++) {                               // fine vertical pier rhythm
        const z = cz - w / 2 + (i + 0.5) * (w / 5);
        box(FRONT + 0.15, 1 + (h - 5) / 2, z, 0.6, h - 5, 0.7, 0xa89478);
      }
    } else if (a.style === 'gable') {
      cone(BACKx, h + 2.5, cz, w * 0.62, 5, 0x9a8468);            // low pitched gable roof
    } else {                                                      // 'tower'
      box(BACKx, h + 0.75, cz, DEPTH + 0.4, 1.5, w + 0.6, COPING);// simple coping cap
    }
    winsX(FRONT, +1, cz, w, h);
  };

  {
    const { band, anchors } = M.STREETWALL_M;
    const A = anchors.slice().sort((p, q) => p.z - q.z);
    let z = band.z0, i = 0;
    while (z < band.z1 - 0.5) {
      const a = A[i], lead = a ? a.z - a.w / 2 : band.z1;
      if (a && z >= lead - 0.01) {                               // reached an anchor
        placeAnchor(a);
        z = Math.max(z, a.z + a.w / 2) + rr(0.2, 1.0);
        i++;
      } else {                                                    // tile the gap solidly
        const span = lead - z;
        if (span < 3) { z = lead; continue; }
        const n = Math.max(1, Math.round(span / 13)), cw = span / n;
        for (let k = 0; k < n; k++)
          placeGeneric(z + cw * (k + 0.5), cw + 1.4, rr(35, 64));  // overlap → no base gaps
        z = lead;
      }
    }
  }

  // ==================================================================
  // 2. THE RANDOLPH GIANTS — bold north-horizon terminators, front face
  //    at z692, bodies reaching north to z680. Distinct silhouettes.
  // ==================================================================
  // task 056 item 3 (+ issue 021): nudge each giant toward a NAMEABLE silhouette
  // at the billboard register (never 1:1) — a bold dark PRUDENTIAL crown band, a
  // big crisp diamond spire, deep-fluted bone-white Aon. Cool-dark ACC accents
  // read against both the pale bodies and the pale dusk sky.
  for (const g of M.BACKDROP_M.giants.list) {
    const { x, w, h, style } = g;
    if (style === 'sign-slab') {                                 // ONE PRU: flat white slab + bold PRUDENTIAL crown
      box(x, h / 2, GBACKz, w, h, GDEPTH, 0xeef0f2);
      box(x, h - 7, GFRONT - 0.15, w * 0.98, 13, 0.8, ACC);      // dark sign-crown band (reads as the Prudential cap at distance)
      const tex = signTex('PRUDENTIAL', '#242c37', '#f4f8fc');
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, 12), bmat(0xffffff, { map: tex }));
      sign.position.set(x, h - 7, GFRONT + 0.2); millenniumRoot.add(sign);
      winsZ(GFRONT, x, w, h - 24, { prob: 0.16 });
    } else if (style === 'diamond-spire') {                      // TWO PRU: bold stepped diamond crown + antenna
      box(x, h / 2, GBACKz, w, h, GDEPTH, 0xdfe3ea);
      box(x, h + 2.5, GBACKz, w * 0.82, 7, GDEPTH * 0.9, 0x6f7a8e); // stepped setback (dark cool steel — reuse GREYS bucket)
      cone(x, h + 27, GBACKz, 18, 54, 0x6f7a8e);                // BOLD dark 4-sided diamond spire: a dark diamond crown on the pale
                                                                  // dusk sky — the highest-contrast, most nameable Chicago roofline at ~150 m
      cyl(x, h + 54 + 18, GBACKz, 0.5, 34, ACC);                // tall dark antenna (crisp on the sky)
      winsZ(GFRONT, x, w, h);
    } else if (style === 'white-fins') {                         // AON: cool bone-white DEEP-fluted monolith
      // COOL white (reuse the One-Pru white bucket) so the shaft separates from the WARM tan
      // billboard skyline behind it; the full-height fluting is the one Aon feature the near-level
      // great-lawn framing does NOT crop, so BOLD WIDE dark reveals carry the read at ~150 m.
      box(x, h / 2, GBACKz, w, h, GDEPTH, 0xeef0f2);
      const nf = 4;                                              // very coarse fluting — reads far
      for (let i = 0; i < nf; i++) {
        const fx = x - w / 2 + (i + 0.5) * (w / nf);
        box(fx, h * 0.5 + 1, GFRONT + 0.22, w / nf - 1.6, h * 0.95, 0.7, 0xeef0f2); // wide cool-white fin
      }
      for (let i = 0; i <= nf; i++) {                            // BOLD dark reveals in the gaps (strong vertical shadow lines)
        const gx = x - w / 2 + i * (w / nf);
        box(gx, h * 0.5 + 1, GFRONT + 0.06, 1.5, h * 0.96, 0.5, ACC);
      }
      box(x, h + 2, GBACKz, w * 0.7, 5, GDEPTH, 0xeef0f2);       // cool-white crown cap (crisp flat top)
      winsZ(GFRONT, x, w, h, { prob: 0.14 });
    } else {                                                     // BLUE CROSS: glass box
      box(x, h / 2, GBACKz, w, h, GDEPTH, 0x66aecb);
      winsZ(GFRONT, x, w, h, { prob: 0.28 });
    }
  }

  // ==================================================================
  // 3. EAST LOOP BAND — lower cool mid-rises across Columbus, front face
  //    at x214 (faces west), bodies reaching east to x238. RETIRED when
  //    Maggie is live (058): that band sits inside Maggie Daley's footprint;
  //    the real park + the giants-east/lake bands (maggie.js) replace it.
  // ==================================================================
  if (!M.OPEN_GRANT.maggie) {
    const e = M.BACKDROP_M.east, cx = (e.x0 + e.x1) / 2, d = e.x1 - e.x0;
    let z = e.z0;
    while (z < e.z1 - 3) {
      const w = rr(12, 20), h = rr(e.floors[0] * 3.4, e.floors[1] * 3.4);
      box(cx, h / 2, z + w / 2, d, h, w, pick(GREYS));
      winsX(e.x0, -1, z + w / 2, w, h, { prob: 0.3, step: 3 });
      z += w + rr(0.3, 1.2);
    }
  }

  // ==================================================================
  // 4. SOUTH BACKDROP — low continuous stone band across Monroe, front
  //    face at z914 (faces north). Art Institute + Stock Exchange Arch cameo.
  //    RETIRES when the flag flips: the REAL Zone C (artinstitute.js, task
  //    060 — beaux-arts block, gardens, arch at its real spot) replaces it
  //    (GEOGRAPHY.md: "BACKDROP_M.south retires when the flag flips").
  // ==================================================================
  if (!M.OPEN_GRANT.artInstitute) {
    const s = M.BACKDROP_M.south, d = s.z1 - s.z0, cz = (s.z0 + s.z1) / 2;
    // low continuous fill so the south view never gaps
    { let x = s.x0;
      while (x < s.x1 - 3) {
        const w = rr(12, 18), h = rr(9, 16);
        box(x + w / 2, h / 2, cz, w, h, d, pick(GREYS));
        x += w + rr(0.3, 1.0);
      } }
    // Art Institute — low warm classical mass + cornice (lions arrive in 048)
    const ai = s.artInstitute;
    box(ai.x, ai.h / 2, cz, ai.w, ai.h, d, 0xbdb49c);
    box(ai.x, ai.h + 1, cz, ai.w + 2, 2, d + 1, PALE);
    // Stock Exchange Arch cameo — freestanding limestone arch, front of band
    const ax = s.archX, az = s.z0 - 2;
    box(ax - 3.5, 4.5, az, 2, 9, 2, PALE);                       // west pier
    box(ax + 3.5, 4.5, az, 2, 9, 2, PALE);                       // east pier
    box(ax, 10.2, az, 9, 3, 2.2, PALE);                          // spanning lintel
    box(ax, 12, az, 2, 1.4, 2.4, PALE);                          // keystone
  }

  // ==================================================================
  // 4b. MICHIGAN CLIFF EXTENSION — the wall the LIONS face (task 060). Same
  //     band x6-30, front at x30; the same generic-fill + anchor march as
  //     section 1 over z 935..1080 with the ART_M.cliffS anchors (glass Borg-
  //     Warner, ORCHESTRA HALL colonnade, white terra-cotta Railway Exchange
  //     with its rooftop SANTA FE sign, McCormick tower). APPENDED AFTER the
  //     giants so sections 1-2 rng call order is byte-identical.
  // ==================================================================
  if (M.OPEN_GRANT.artInstitute) {
    const band = { z0: 935, z1: 1080 };
    const A = M.ART_M.cliffS.slice().sort((p, q) => p.z - q.z);
    let z = band.z0, i = 0;
    while (z < band.z1 - 0.5) {
      const a = A[i], lead = a ? a.z - a.w / 2 : band.z1;
      if (a && z >= lead - 0.01) {                               // reached an anchor
        placeAnchor(a, a.style === 'colonnade' ? { inscription: 'ORCHESTRA HALL' } : {});
        z = Math.max(z, a.z + a.w / 2) + rr(0.2, 1.0);
        i++;
      } else {                                                    // tile the gap solidly
        const span = lead - z;
        if (span < 3) { z = lead; continue; }
        const n = Math.max(1, Math.round(span / 13)), cw = span / n;
        for (let k = 0; k < n; k++)
          placeGeneric(z + cw * (k + 0.5), cw + 1.4, rr(35, 64));
        z = lead;
      }
    }
  }

  // ==================================================================
  // 4c. SOUTH LOOP BACKDROP BAND — a quiet low grey band beyond Jackson
  //     (z 1050..1080), sparse NORTH-facing lit windows + a street-tree row
  //     in front (z 1046, shared 'mg-tree' pool → +0 buckets). FAR SOUTH —
  //     the z<680 billboard floor is a NORTH law; everything here is z<=1080.
  // ==================================================================
  if (M.OPEN_GRANT.artInstitute || M.OPEN_GRANT.butler) {
    const sl = M.BACKDROP_GRANT.southLoop, cz = (sl.z0 + sl.z1) / 2, d = sl.z1 - sl.z0;
    const zFace = sl.z0 - 0.05;                                  // windows sit just north of the front face
    let x = sl.x0;
    while (x < sl.x1 - 3) {
      const w = rr(14, 26), floors = Math.round(rr(sl.floors[0], sl.floors[1])), h = floors * 3.4;
      box(x + w / 2, h / 2, cz, w, h, d, pick(GREYS));
      box(x + w / 2, h + 0.5, cz, w + 0.5, 1.0, d, 0x6f7a8e);   // slim cool cap (GREYS tone → folds)
      // sparse NORTH-facing lit windows (yaw PI faces -z, toward the park)
      const nC = Math.max(1, Math.floor((w - 1) / 3)), wx0 = x + w / 2 - (nC - 1) * 3 / 2;
      for (let c = 0; c < nC; c++) { const wx = wx0 + c * 3;
        for (let y = 5; y < h - 4; y += 3.6)
          if (R() < 0.15) wins.push({ pos: [wx, y, zFace], scale: [0.8, 1.1, 1], color: WIN, yaw: Math.PI }); }
      x += w + rr(0.3, 1.0);
    }
    // street trees in front — copy maggie.js's EXACT trunk/canopy recipe so the
    // shared 'mg-tree-*' pool keys fold into one bucket each (+0 draws).
    const trunkGeo = new THREE.CylinderGeometry(0.28, 0.4, 3.2, 7); trunkGeo.translate(0, 1.6, 0);
    const canopyGeo = BufferGeometryUtils.mergeBufferGeometries(
      [[0, 0.15, 0, 1.75], [0.95, 0.2, 0.2, 1.25], [-0.85, 0.1, -0.3, 1.2], [0.15, 0.6, -0.55, 1.1]]
        .map(([px, py, pz, r]) => { const s = new THREE.SphereGeometry(r, 8, 6); s.translate(px, py, pz); return s; }), false);
    const trunks = [], canopies = [];
    for (let tx = 66; tx <= 312; tx += 40) {                     // 7 street trees along z 1046
      const s = rr(0.85, 1.2), jx = rr(-1, 1);
      trunks.push({ pos: [tx + jx, 0, 1046], yaw: rr(0, 6.28), color: 0x6b4a30 });
      canopies.push({ pos: [tx + jx, 4.2 + rr(-0.2, 0.4), 1046], yaw: rr(0, 6.28), scale: [s, s, s], color: 0x3f7d3a });
    }
    poolInstanced('mg-tree-trunk', trunkGeo, trunks);
    poolInstanced('mg-tree-canopy', canopyGeo, canopies);
  }

  // ==================================================================
  // 5. ALL LIT WINDOWS — one instanced bucket, single warm colour.
  // ==================================================================
  // CAP bounds the single warm-window bucket (still ONE InstancedMesh / one draw
  // — every record is the WIN colour). Raised for the Art Institute cliff/south
  // extension (~340 more) so the pre-existing cliff+giants windows (the first 640,
  // pushed by sections 1-2) never get decimated — the guard view stays identical.
  const CAP = 1100;
  let recs = wins;
  if (recs.length > CAP) { const k = Math.ceil(recs.length / CAP); recs = recs.filter((_, i) => i % k === 0); }
  emitInstanced(new THREE.PlaneGeometry(1, 1), recs, { basic: true });
}

// dark sign band with light lettering (PRUDENTIAL) — one canvas texture
function signTex(text, bg, fg) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96;
  const g = cv.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 96);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 46px Arial,Helvetica,sans-serif'; g.fillText(text, 256, 52);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}

// word sign on its OWN canvas, measureText-FITTED font (028/050 law: headless
// Chromium's serif fallback measures wide, so fit the drawn font to the canvas).
// Caller pairs it with a solid rear so the back never shows mirrored text.
function wordTex(text, bg, fg, font, cw = 512, ch = 96) {
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const g = cv.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, cw, ch);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = ch * 0.72; g.font = '700 ' + fs + 'px ' + font;
  while (g.measureText(text).width > cw * 0.9 && fs > 8) { fs -= 3; g.font = '700 ' + fs + 'px ' + font; }
  g.fillText(text, cw / 2, ch / 2);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
