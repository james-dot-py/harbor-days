// Wrigleyville streets — sidewalks/curbs/markings, cobra lamps, blade signs,
// CPD barricades, Lakeview backdrop band. Data: ../data/wrigleyville.js.
// Attach everything to wrigleyRoot. LOCAL rng only (R, seed 3600) — never the
// shared world rng, never wrand (keeps this file order-independent).
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon, bmat, mulberry32, pointsMat } from '../core.js';
import { collide } from '../props.js';
import { wrigleyRoot } from './index.js';
import { STREETS_W, BARRICADES_W, BACKDROP_W, clarkX, CLARK_STUB_W } from '../data/wrigleyville.js';
import { atlasPlane } from './village.js';   // shared static-plane atlas (buildVillage emits it, last)

const R = mulberry32(3600);
const rr = (a, b) => a + (b - a) * R();
const clarkYaw = Math.atan(0.28);                 // Clark diagonal heading
const _col = new THREE.Color();
const mergeGeos = arr => BufferGeometryUtils.mergeBufferGeometries(arr.map(g => g.index ? g.toNonIndexed() : g), false);

// place an array of {pos:[x,y,z], yaw?, scale?[x,y,z], color?} as InstancedMesh(es).
// colored=true buckets by color into one InstancedMesh each — r128's toon shader
// ignores InstancedMesh.setColorAt, so per-instance color must be per-material.
function instMesh(geo, mat, items, colored = false) {
  if (colored) {
    const groups = new Map();
    for (const it of items) { const k = it.color ?? 0xffffff; (groups.get(k) || groups.set(k, []).get(k)).push(it); }
    for (const [c, group] of groups) instMesh(geo, toon(c), group);
    return null;
  }
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
  items.forEach((it, i) => {
    E.set(0, it.yaw || 0, 0); Q.setFromEuler(E);
    V.set(it.pos[0], it.pos[1], it.pos[2]);
    S.set(it.scale ? it.scale[0] : 1, it.scale ? it.scale[1] : 1, it.scale ? it.scale[2] : 1);
    M.compose(V, Q, S); m.setMatrixAt(i, M);
  });
  m.instanceMatrix.needsUpdate = true;
  wrigleyRoot.add(m);
  return m;
}

// ---- canvas textures --------------------------------------------------
function slabTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  g.fillStyle = '#b4ac9c'; g.fillRect(0, 0, 64, 64);              // concrete face
  g.fillStyle = '#bdb5a5'; g.fillRect(4, 4, 56, 56);             // lighter panel
  g.strokeStyle = '#8f8878'; g.lineWidth = 4; g.strokeRect(2, 2, 60, 60);  // slab joint
  const t = new THREE.CanvasTexture(cv); return t;
}
function policeTex() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 64; const g = cv.getContext('2d');
  g.fillStyle = '#2f5aa8'; g.fillRect(0, 0, 512, 64);            // CPD blue board
  g.fillStyle = '#eef2f8'; g.fillRect(0, 4, 512, 3); g.fillRect(0, 57, 512, 3);
  g.fillStyle = '#f4f7fc'; g.textAlign = 'center';
  g.textBaseline = 'alphabetic'; g.font = '700 30px "Arial Narrow",Arial,sans-serif';
  g.fillText('POLICE LINE', 256, 34);
  g.font = '700 15px Arial,sans-serif';
  g.fillText('CHICAGO POLICE', 256, 52);
  const t = new THREE.CanvasTexture(cv); return t;
}
function bladeTex(text) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; const g = cv.getContext('2d');
  g.fillStyle = '#146a3a'; g.fillRect(0, 0, 512, 96);           // street-sign green
  g.strokeStyle = '#f4f7f0'; g.lineWidth = 6; g.strokeRect(7, 7, 498, 82);
  g.fillStyle = '#f7faf4'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 52; g.font = `700 ${fs}px "Trebuchet MS",Arial,sans-serif`;
  while (g.measureText(text).width > 470 && fs > 22) { fs -= 2; g.font = `700 ${fs}px "Trebuchet MS",Arial,sans-serif`; }
  g.fillText(text, 256, 52);
  return new THREE.CanvasTexture(cv);
}
function stubPlacardTex() {                                       // task 033 — the 017 teaser register (cf. stadium.js teaserTex)
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 224;
  const g = cv.getContext('2d');
  g.fillStyle = '#1c4a35'; g.fillRect(0, 0, 512, 224);                       // Cubs-green field
  g.strokeStyle = '#f2ece0'; g.lineWidth = 5; g.strokeRect(9, 9, 494, 206);  // cream pinstripe frame
  g.lineWidth = 1.6; g.strokeRect(16, 16, 480, 192);                         // doubled inner line
  g.fillStyle = '#b0202c'; g.fillRect(24, 24, 464, 38);                      // Cubs-red header ribbon
  g.fillStyle = '#f6f1e6'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 23px Georgia,serif'; g.fillText('C O M I N G   S O O N', 256, 44);
  const fit = (t, y) => { let fs = 48; g.font = `800 ${fs}px Georgia,serif`; while (g.measureText(t).width > 446 && fs > 22) { fs -= 2; g.font = `800 ${fs}px Georgia,serif`; } g.fillText(t, 256, y); };
  g.fillStyle = '#f6f1e6'; fit('N CLARK ST', 103); fit('KEEPS GOING', 151);  // the big tease, two lines
  g.fillStyle = '#cfe0c8'; g.font = 'italic 600 23px Georgia,serif';         // sage wink line
  g.fillText('all the way to the loop, someday', 256, 197);
  return new THREE.CanvasTexture(cv);
}

// =====================================================================
export function buildStreets() {
  // ------------------------- 1. SIDEWALKS ------------------------------
  const slabs = [];
  function straightWalk(x0, x1, z0, z1) {
    const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
    const L = alongX ? x1 - x0 : z1 - z0;
    const n = Math.max(1, Math.round(Math.abs(L) / 2.5)), seg = L / n;
    const w = Math.abs(alongX ? z1 - z0 : x1 - x0);
    const cz = (z0 + z1) / 2, cx = (x0 + x1) / 2;
    for (let k = 0; k < n; k++) {
      const c = (alongX ? x0 : z0) + seg * (k + 0.5);
      slabs.push(alongX
        ? { pos: [c, 0.03, cz], scale: [Math.abs(seg) - 0.12, 0.05, w] }
        : { pos: [cx, 0.03, c], scale: [w, 0.05, Math.abs(seg) - 0.12] });
    }
  }
  function paraWalk(offc, width, z0 = STREETS_W.clark.z0, z1 = STREETS_W.clark.z1) {   // Clark sheared ribbon
    const n = Math.max(1, Math.round((z1 - z0) / 2.4)), seg = (z1 - z0) / n;
    for (let k = 0; k < n; k++) {
      const z = z0 + seg * (k + 0.5);
      slabs.push({ pos: [clarkX(z) + offc, 0.03, z], yaw: clarkYaw, scale: [width, 0.05, seg - 0.15] });
    }
  }
  const A = STREETS_W.addison, W = STREETS_W.waveland, SH = STREETS_W.sheffield, K = STREETS_W.kenmore;
  straightWalk(A.x0, A.x1, A.z0, A.z0 + 6); straightWalk(A.x0, A.x1, A.z1 - 6, A.z1);   // Addison N/S
  straightWalk(W.x0, W.x1, W.z0, W.z0 + 6); straightWalk(W.x0, W.x1, W.z1 - 6, W.z1);   // Waveland N/S
  straightWalk(SH.x0, SH.x0 + 6, SH.z0, SH.z1); straightWalk(SH.x1 - 6, SH.x1, SH.z0, SH.z1); // Sheffield W/E
  straightWalk(K.x0, K.x0 + 2, K.z0, K.z1); straightWalk(K.x1 - 2, K.x1, K.z0, K.z1);   // Kenmore W/E
  paraWalk(-11, 6); paraWalk(11, 6);                                                    // Clark W/E
  paraWalk(-11, 6, CLARK_STUB_W.z0, CLARK_STUB_W.detailZ1); paraWalk(11, 6, CLARK_STUB_W.z0, CLARK_STUB_W.detailZ1);  // Clark stub W/E (task 033)
  instMesh(new THREE.BoxGeometry(1, 1, 1), toon(0xffffff, { mat: { map: slabTex() } }), slabs);

  // ------------------------- 2. CURBS ----------------------------------
  const curbs = [
    { pos: [-228, 0.065, -408], scale: [208, 0.13, 0.3] }, { pos: [-228, 0.065, -392], scale: [208, 0.13, 0.3] },   // Addison
    { pos: [-265, 0.065, -566], scale: [174, 0.13, 0.3] }, { pos: [-265, 0.065, -554], scale: [174, 0.13, 0.3] },   // Waveland
    { pos: [-196, 0.065, -479], scale: [0.3, 0.13, 186] }, { pos: [-184, 0.065, -479], scale: [0.3, 0.13, 186] },   // Sheffield
    { pos: [-235, 0.065, -576], scale: [0.3, 0.13, 56] }, { pos: [-227, 0.065, -576], scale: [0.3, 0.13, 56] },     // Kenmore
  ];
  { const zc = -479, xw = clarkX(zc);                                                   // Clark sheared road edges
    curbs.push({ pos: [xw - 8, 0.065, zc], yaw: clarkYaw, scale: [0.3, 0.13, 193.1] });
    curbs.push({ pos: [xw + 8, 0.065, zc], yaw: clarkYaw, scale: [0.3, 0.13, 193.1] }); }
  { const zc = (CLARK_STUB_W.z0 + CLARK_STUB_W.detailZ1) / 2, xw = clarkX(zc);          // Clark stub road edges (task 033)
    curbs.push({ pos: [xw - 8, 0.065, zc], yaw: clarkYaw, scale: [0.3, 0.13, 35.3] });
    curbs.push({ pos: [xw + 8, 0.065, zc], yaw: clarkYaw, scale: [0.3, 0.13, 35.3] }); }
  instMesh(new THREE.BoxGeometry(1, 1, 1), toon(0x9c968a), curbs);

  // ------------------------- 3. ROAD PAINT -----------------------------
  const yellow = [], white = [];
  const nearX = (x, ...xs) => xs.some(v => Math.abs(x - v) < 3.5);
  for (let x = A.x0 + 4; x <= A.x1 - 4; x += 5) if (!nearX(x, clarkX(-400), -190))       // Addison centre dashes
    yellow.push({ pos: [x, 0.025, -400], scale: [2.2, 0.02, 0.16] });
  for (let z = STREETS_W.clark.z0 + 4; z <= STREETS_W.clark.z1 - 4; z += 5)              // Clark centre dashes
    if (Math.abs(z + 400) > 4 && Math.abs(z + 560) > 6)
      yellow.push({ pos: [clarkX(z), 0.025, z], yaw: clarkYaw, scale: [0.16, 0.02, 2.2] });
  for (let z = CLARK_STUB_W.z0 + 3; z <= CLARK_STUB_W.detailZ1 - 2; z += 5)              // Clark stub dashes (task 033)
    yellow.push({ pos: [clarkX(z), 0.025, z], yaw: clarkYaw, scale: [0.16, 0.02, 2.2] });
  // CONTINENTAL CROSSWALKS (issue 018: "the crosswalks are just sidewalks"). A
  // real Chicago crossing is a set of white bar-stripes running PERPENDICULAR to
  // traffic (spanning the road curb-to-curb), spaced ALONG the road over a ~4.6 m
  // crossing zone. alongYaw = the road's traffic heading (direction (sin,cos)):
  // π/2 = E–W road along x, 0 = N–S road along z, clarkYaw = the Clark diagonal.
  // Every bar is a yawed box, so all axes (incl. Clark's cant) come out true.
  // Deterministic per-bar length wear (NO rng — never perturb the shared R
  // sequence that lays lamps/hydrants) so the set reads painted-on, not stamped.
  function xwalk(cx, cz, roadHalf, alongYaw) {
    const barLen = roadHalf * 2 - 0.7, depth = 4.6, n = 7;
    const sy = Math.sin(alongYaw), cy = Math.cos(alongYaw);
    for (let k = 0; k < n; k++) {
      const t = (k / (n - 1) - 0.5) * depth;                          // along the road from the band centre
      const wear = 0.85 + 0.13 * (((k * 37 + 11) % 7) / 6);           // length wobble, deterministic in k
      white.push({ pos: [cx + sy * t, 0.03, cz + cy * t], yaw: alongYaw, scale: [barLen * wear, 0.02, 0.42] });
    }
  }
  // one intersection = up to four leg crossings (the standard box): cross street
  // A on both sides of B, cross B on both sides of A. legsA/legsB (+1/−1) prune
  // legs that dead-end at a barricade. Centres derive straight from STREETS_W.
  function crossBox(ix, iz, hA, yawA, hB, yawB, legsA = [1, -1], legsB = [1, -1]) {
    const sA = Math.sin(yawA), cA = Math.cos(yawA), sB = Math.sin(yawB), cB = Math.cos(yawB);
    for (const s of legsA) xwalk(ix + sA * s * (hB + 1.6), iz + cA * s * (hB + 1.6), hA, yawA);   // cross A, flanking B
    for (const s of legsB) xwalk(ix + sB * s * (hA + 1.6), iz + cB * s * (hA + 1.6), hB, yawB);   // cross B, flanking A
  }
  const yEW = Math.PI / 2, yNS = 0, clarkHalf = 8;                                       // Clark road = off ±8 (curb-to-curb)
  crossBox(clarkX(A.z), A.z, A.road / 2, yEW, clarkHalf, clarkYaw);                      // Addison × Clark
  crossBox(SH.x,        A.z, A.road / 2, yEW, SH.road / 2, yNS);                         // Addison × Sheffield
  crossBox(SH.x,        W.z, W.road / 2, yEW, SH.road / 2, yNS);                         // Waveland × Sheffield
  crossBox(clarkX(W.z), W.z, W.road / 2, yEW, clarkHalf, clarkYaw);                      // Waveland × Clark
  crossBox(K.x,         W.z, W.road / 2, yEW, K.road / 2, yNS);                          // Waveland × Kenmore
  instMesh(new THREE.BoxGeometry(1, 1, 1), bmat(0xf3d24a), yellow);
  instMesh(new THREE.BoxGeometry(1, 1, 1), bmat(0xeef0ee), white);

  // ------------------------- 4. STREET LAMPS ---------------------------
  const lamps = [];
  let li = 0; const side = (a, b) => (li++ % 2 === 0 ? a : b);
  for (let x = A.x0 + 8; x <= A.x1 - 8; x += 18) side(() => lamps.push({ px: x, pz: -413.2, yaw: 0 }), () => lamps.push({ px: x, pz: -386.8, yaw: Math.PI }))();
  li = 0; for (let x = W.x0 + 8; x <= W.x1 - 8; x += 18) side(() => lamps.push({ px: x, pz: -571.2, yaw: 0 }), () => lamps.push({ px: x, pz: -548.8, yaw: Math.PI }))();
  li = 0; for (let z = SH.z0 + 8; z <= SH.z1 - 8; z += 18) side(() => lamps.push({ px: -201.2, pz: z, yaw: Math.PI / 2 }), () => lamps.push({ px: -178.8, pz: z, yaw: -Math.PI / 2 }))();
  li = 0; for (let z = K.z0 + 8; z <= K.z1 - 8; z += 18) side(() => lamps.push({ px: -236.2, pz: z, yaw: Math.PI / 2 }), () => lamps.push({ px: -225.8, pz: z, yaw: -Math.PI / 2 }))();
  li = 0; for (let z = STREETS_W.clark.z0 + 8; z <= STREETS_W.clark.z1 - 8; z += 17.3) side(() => lamps.push({ px: clarkX(z) - 13.2, pz: z, yaw: Math.PI / 2 }), () => lamps.push({ px: clarkX(z) + 13.2, pz: z, yaw: -Math.PI / 2 }))();
  lamps.push({ px: clarkX(-374) - 13.2, pz: -374, yaw: Math.PI / 2 });                  // Clark stub lamps (task 033) — alternating rhythm
  lamps.push({ px: clarkX(-362) + 13.2, pz: -362, yaw: -Math.PI / 2 });
  lamps.push({ px: clarkX(-350) - 13.2, pz: -350, yaw: Math.PI / 2 });
  // pole+arm archetype (grey), head baked-offset (warm), one glow point each
  const poleG = new THREE.CylinderGeometry(0.09, 0.12, 7, 7); poleG.translate(0, 3.5, 0);
  const armG = new THREE.BoxGeometry(0.12, 0.12, 2.6); armG.translate(0, 6.85, 1.3);
  const knuckG = new THREE.BoxGeometry(0.16, 0.34, 0.16); knuckG.translate(0, 6.72, 2.5);
  const lampGeo = mergeGeos([poleG, armG, knuckG]);
  const headGeo = new THREE.BoxGeometry(0.34, 0.16, 0.55); headGeo.translate(0, 6.6, 2.55);
  instMesh(lampGeo, toon(0x3a3a42), lamps.map(l => ({ pos: [l.px, 0, l.pz], yaw: l.yaw })));
  instMesh(headGeo, bmat(0xffe1a6), lamps.map(l => ({ pos: [l.px, 0, l.pz], yaw: l.yaw })));
  lamps.forEach(l => collide(l.px, l.pz, 0.35));
  { const gp = new Float32Array(lamps.length * 3), aC = new Float32Array(lamps.length * 3), aS = new Float32Array(lamps.length);
    lamps.forEach((l, i) => { gp.set([l.px + 2.55 * Math.sin(l.yaw), 6.6, l.pz + 2.55 * Math.cos(l.yaw)], i * 3); aC.set([1, 0.82, 0.5], i * 3); aS[i] = 4.6; });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(gp, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(aC, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(aS, 1));
    wrigleyRoot.add(new THREE.Points(g, pointsMat())); }

  // ------------------------- 5. BLADE SIGNS ----------------------------
  const bladePoles = [[-303, -387.6], [-200.8, -549.2], [-238.5, -571], [CLARK_STUB_W.blade.x, CLARK_STUB_W.blade.z]];
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.1, 6); poleGeo.translate(0, 1.55, 0);
  instMesh(poleGeo, toon(0x2b2b30), bladePoles.map(p => ({ pos: [p[0], 0, p[1]] })));
  bladePoles.forEach(p => collide(p[0], p[1], 0.3));
  function blade(text, cx, cy, cz, yaw, w) {
    // MIRRORED-TEXT rule (PITFALLS): a lone DoubleSide plane shows mirrored
    // text from behind — build back-to-back FrontSide atlas planes instead
    // (same texture canvas both ways; the atlas mesh costs no extra draw).
    const h = w * 96 / 512, tex = bladeTex(text);
    const nx = Math.sin(yaw), nz = Math.cos(yaw);
    for (const s of [1, -1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bmat(0xffffff, { map: tex }));
      m.position.set(cx + nx * 0.03 * s, cy, cz + nz * 0.03 * s);
      m.rotation.y = yaw + (s === 1 ? 0 : Math.PI);
      atlasPlane(m, false);   // blade sign -> shared wrigley atlas
    }
  }
  blade('ADDISON 3600 N', -303.9, 2.62, -387.6, 0, 1.9);
  blade('CLARK 1100 W', -302.7, 2.98, -386.73, clarkYaw, 1.7);
  blade('WAVELAND 3700 N', -201.7, 2.62, -549.2, 0, 1.9);
  blade('SHEFFIELD 1000 W', -200.8, 2.98, -550.1, Math.PI / 2, 1.8);
  blade('KENMORE 1040 W', -238.5, 2.62, -571.9, Math.PI / 2, 1.7);
  blade('N CLARK ST', CLARK_STUB_W.blade.x - 0.85, 2.62, CLARK_STUB_W.blade.z, Math.PI + clarkYaw, 1.7);  // stub blade (task 033), squared to Clark
  {  // COMING SOON placard (task 033) — the 017 teaser register, just S of the
     // barricade, offset EAST of the centerline (placard.off) so the CPD
     // officer NPC at (−286.5, −388) never blocks the head-on read.
     // Rear/legs use 0x2c2620 — the dressing-kit downspout color, already a
     // static-merge bucket on every facade lot → truly +0 draw calls
     // (0x2b2b30 exists only as the blade-pole InstancedMesh, which
     // mergeCellStatic excludes — it would have opened a NEW bucket).
    const cx = clarkX(CLARK_STUB_W.placard.z) + (CLARK_STUB_W.placard.off || 0);
    const cz = CLARK_STUB_W.placard.z, pyaw = Math.PI + clarkYaw;
    const ph = 2.3 * 224 / 512;                                       // panel height (512×224 canvas aspect)
    const front = new THREE.Mesh(new THREE.PlaneGeometry(2.3, ph), bmat(0xffffff, { map: stubPlacardTex() }));
    front.position.set(cx, 1.5, cz); front.rotation.y = pyaw; atlasPlane(front, false);   // -> shared opaque atlas (+0 draws)
    const rear = new THREE.Mesh(new THREE.BoxGeometry(2.3, ph, 0.05), toon(0x2c2620));     // solid back hides the DoubleSide atlas mirror
    rear.position.set(cx - 0.04 * Math.sin(pyaw), 1.5, cz - 0.04 * Math.cos(pyaw)); rear.rotation.y = pyaw; wrigleyRoot.add(rear);
    const legH = 1.5 - ph / 2, wx = Math.cos(clarkYaw), wz = -Math.sin(clarkYaw);          // legs end at the panel bottom; width axis
    for (const s of [1, -1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, legH, 0.07), toon(0x2c2620));
      leg.position.set(cx + s * 0.95 * wx, legH / 2, cz + s * 0.95 * wz); wrigleyRoot.add(leg);
    }
  }

  // ------------------------- 6. FLAVOR ---------------------------------
  {  // hydrants (merged archetype, red)
    const body = new THREE.CylinderGeometry(0.14, 0.16, 0.5, 8); body.translate(0, 0.25, 0);
    const dome = new THREE.SphereGeometry(0.15, 8, 7); dome.scale(1, 0.8, 1); dome.translate(0, 0.5, 0);
    const cap = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 6); cap.translate(0, 0.6, 0);
    const nzL = new THREE.CylinderGeometry(0.05, 0.05, 0.14, 6); nzL.rotateZ(Math.PI / 2); nzL.translate(-0.16, 0.32, 0);
    const nzF = new THREE.CylinderGeometry(0.055, 0.055, 0.14, 6); nzF.rotateX(Math.PI / 2); nzF.translate(0, 0.3, 0.16);
    const hydG = mergeGeos([body, dome, cap, nzL, nzF]);
    const spots = [[-250, -411.3], [-200, -411.3], [-313, -388.3], [-179.7, -470], [-310, -570.6], [-242, -549.4]];
    instMesh(hydG, toon(0xc0392b), spots.map(s => ({ pos: [s[0], 0, s[1]], yaw: rr(0, 6.28) })));
    spots.forEach(s => collide(s[0], s[1], 0.4));
  }
  {  // newspaper boxes (merged box + base, colored)
    const boxB = new THREE.BoxGeometry(0.42, 0.7, 0.4); boxB.translate(0, 0.55, 0);
    const base = new THREE.BoxGeometry(0.46, 0.12, 0.44); base.translate(0, 0.14, 0);
    const win = new THREE.BoxGeometry(0.3, 0.28, 0.02); win.translate(0, 0.68, 0.21);
    const newsG = mergeGeos([boxB, base, win]);
    const spots = [[-158, -390.5, 0x2b5aa0], [-306, -388, 0xb03a2e], [-204, -549.6, 0x2f7d46]];
    instMesh(newsG, toon(0xffffff), spots.map(s => ({ pos: [s[0], 0, s[1]], yaw: rr(0, 6.28), color: s[2] })), true);
    spots.forEach(s => collide(s[0], s[1], 0.4));
  }

  // ------------------------- 7. CPD BARRICADES -------------------------
  const frames = [], boards = [];
  for (const s of BARRICADES_W) {
    const ax = s.a[0], az = s.a[1], bx = s.b[0], bz = s.b[1];
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz) || 0.001, yaw = Math.atan2(dx, dz);
    const n = Math.max(1, Math.round(len / 2.3));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, x = ax + dx * t, z = az + dz * t;
      frames.push({ pos: [x, 0, z], yaw }); boards.push({ pos: [x, 0, z], yaw });
      collide(x, z, 1.2, 2.5);                                    // r 1.2, unhoppable
    }
  }
  {  // frames = A-frame legs + lower rail (blue), length axis Z
    const parts = [];
    for (const zc of [0.85, -0.85]) for (const sx of [1, -1]) {
      const leg = new THREE.BoxGeometry(0.08, 1.05, 0.08); leg.rotateZ(sx * 0.38);
      leg.translate(sx * 0.2, 0.5, zc); parts.push(leg);
    }
    const rail = new THREE.BoxGeometry(0.1, 0.1, 1.7); rail.translate(0, 0.45, 0); parts.push(rail);
    const foot = new THREE.BoxGeometry(0.5, 0.06, 0.1);
    parts.push(foot.clone().translate(0, 0.03, 0.85), foot.clone().translate(0, 0.03, -0.85));
    instMesh(mergeGeos(parts), toon(0x2f5aa8), frames);
  }
  {  // boards = textured top rail (POLICE LINE)
    const bg = new THREE.BoxGeometry(0.16, 0.24, 1.9); bg.translate(0, 0.98, 0);
    instMesh(bg, bmat(0xffffff, { map: policeTex() }), boards);
  }

  // ------------------------- 8. BACKDROP BAND --------------------------
  const bandDir = [[1, 0], [0, 1], [0, 1], [-1, 0], [0, -1], [0, -1], [-1, 0], [-1, 0], [0, -1]];  // 9 bands (task 033: S-of-Addison split into idx 4&5, both front north); last: Sheffield S mouth (020), fronts north
  const palette = [0x7a4a38, 0x8a5a44, 0x9a948b, 0x88837a, 0xa8946f, 0xb3a480, 0x6f5240];
  const buildings = [], windows = [];
  BACKDROP_W.bands.forEach((b, bi) => {
    const dir = bandDir[bi], alongZ = dir[0] !== 0;                // facing x => line along z
    const xs = b.x1 - b.x0, zs = b.z1 - b.z0;
    const depth = Math.min((alongZ ? xs : zs) * 0.9, 14);
    const frontX = dir[0] > 0 ? b.x1 : b.x0, frontZ = dir[1] > 0 ? b.z1 : b.z0;
    const cX = dir[0] !== 0 ? frontX - dir[0] * depth / 2 : 0;
    const cZ = dir[1] !== 0 ? frontZ - dir[1] * depth / 2 : 0;
    const wyaw = Math.atan2(dir[0], dir[1]);
    const L = alongZ ? zs : xs, start = alongZ ? b.z0 : b.x0;
    let p = start + 0.5;
    while (p < start + L - 6) {
      const Wb = rr(8, 14), floors = 2 + (R() * 3 | 0), H = floors * 3.1;
      const c = p + Wb / 2;
      const bx = alongZ ? cX : c, bz = alongZ ? c : cZ;
      buildings.push({ pos: [bx, H / 2, bz], scale: alongZ ? [depth, H, Wb] : [Wb, H, depth], color: palette[R() * palette.length | 0] });
      // sparse warm windows on the street-facing face
      const fx = alongZ ? frontX + dir[0] * 0.06 : bx, fz = alongZ ? bz : frontZ + dir[1] * 0.06;
      for (let fl = 0; fl < floors; fl++) for (let cwi = -1; cwi <= 1; cwi++) {
        if (R() > 0.5) continue;
        const off = cwi * Wb * 0.28, wy = 1.9 + fl * 3.1;
        if (wy > H - 0.8) continue;
        windows.push({ pos: [alongZ ? fx : fx + off, wy, alongZ ? fz + off : fz], yaw: wyaw, scale: [0.6, 0.9, 1] });
      }
      p += Wb + rr(0.8, 2.2);
    }
  });
  instMesh(new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), buildings, true);
  instMesh(new THREE.PlaneGeometry(1, 1), bmat(0xffd39a), windows);
}
