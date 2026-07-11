// =====================================================================
// WRIGLEYVILLE — the "deep cuts" signage layer. The little insider signs
// that make a local go "oh, they got THAT right": the Lakeview Baseball
// Club's EAMUS CATULI! banner + AC drought counter, the 1060 W. Addison
// address plate, hoisting rooftop W flags, W pennants down the lamp rows,
// and a HIT IT HERE bullseye. Postcard Wrigley — no neon (the Clark bars
// already carry it).
//
// EXCLUSIVE FILE. Self-wired: this module is imported (side-effect) by
// src/packs/index.js AFTER the wrigleyville pack, so its onWorldReady
// build runs once the cell is standing. Everything attaches to
// wrigleyRoot; own local rng (m32 seed 3633) — never the shared world
// rng, never wrand. All signs ride parapets/walls, so NO colliders.
// Draw-call discipline: 7 total (4 unique boards + 3 InstancedMeshes).
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon, bmat, mulberry32 } from '../core.js';
import { onWorldReady, registerUpdate, state } from '../framework.js';
import { activeCell } from '../cells.js';
import { wrigleyRoot } from './index.js';
import { STREETS_W, clarkX } from '../data/wrigleyville.js';

const R = mulberry32(3633);
const ROOF_Y = 9.6;                                    // rooftop deck top (parapet ~0.5 above)

// ------------------------------ palette -------------------------------
const NAVY = '#1c3f6e', OFFW = '#ece7d8', WEATHER = '#c8b98f';   // EAMUS board
const LIME = '#c7c1b0', ENGRAVE = '#3a352c';                     // address limestone
const PEN_BLUE = '#2a5a9c', PEN_WHITE = '#f4f2ec';               // pennants
const BULL_RED = '#c0392b', BULL_WHITE = '#f2ece0';              // bullseye

// canvas text helper — shrink-to-fit so nothing ever clips (house rule)
function fitFont(g, text, maxW, start, weight = '700', family = 'Arial,sans-serif') {
  let fs = start; g.font = `${weight} ${fs}px ${family}`;
  while (g.measureText(text).width > maxW && fs > 8) { fs -= 2; g.font = `${weight} ${fs}px ${family}`; }
  return fs;
}

// ------------------------- canvas textures ----------------------------
function eamusTex() {
  const cv = document.createElement('canvas'); cv.width = 448; cv.height = 72;
  const g = cv.getContext('2d');
  g.fillStyle = NAVY; g.fillRect(0, 0, 448, 72);                 // navy field
  // weathered flecks (local rng — cosmetic only)
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(190,205,225,${0.03 + R() * 0.05})`; const s = 1 + R() * 2; g.fillRect(R() * 448, R() * 72, s, s); }
  g.strokeStyle = WEATHER; g.lineWidth = 4; g.strokeRect(5, 5, 438, 62);   // thin weathered frame
  g.fillStyle = OFFW; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFont(g, 'EAMUS CATULI!', 404, 52, '800');
  g.fillText('EAMUS CATULI!', 224, 40);
  return new THREE.CanvasTexture(cv);
}
function acTex() {
  const cv = document.createElement('canvas'); cv.width = 384; cv.height = 88;
  const g = cv.getContext('2d');
  g.fillStyle = NAVY; g.fillRect(0, 0, 384, 88);
  g.strokeStyle = WEATHER; g.lineWidth = 3; g.strokeRect(4, 4, 376, 80);
  g.fillStyle = OFFW; g.textAlign = 'center'; g.textBaseline = 'middle';
  // AC = Anno Catulorum: years since division / pennant / Series (our fiction)
  const label = 'AC   01   10   80';                             // spaced digits
  fitFont(g, label, 348, 46, '800', '"Courier New",monospace');
  g.fillText(label, 192, 46);
  return new THREE.CanvasTexture(cv);
}
function addressTex() {
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 100;
  const g = cv.getContext('2d');
  g.fillStyle = LIME; g.fillRect(0, 0, 320, 100);               // limestone face
  g.strokeStyle = '#a7a08d'; g.lineWidth = 6; g.strokeRect(6, 6, 308, 88);   // beveled edge
  g.strokeStyle = '#e4dece'; g.lineWidth = 2; g.strokeRect(10, 10, 300, 80); // inner highlight
  g.fillStyle = ENGRAVE; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFont(g, '1060 W. ADDISON', 280, 40, '700', 'Georgia,serif');
  g.fillText('1060 W. ADDISON', 160, 52);
  return new THREE.CanvasTexture(cv);
}
function wFlagTex() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 96;
  const g = cv.getContext('2d');
  g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, 128, 96);
  g.fillStyle = NAVY; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFont(g, 'W', 96, 88, '900');
  g.fillText('W', 64, 52);
  return new THREE.CanvasTexture(cv);
}
function pennantTex() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 160;
  const g = cv.getContext('2d');
  g.fillStyle = PEN_BLUE; g.fillRect(0, 0, 128, 160);
  g.fillStyle = PEN_WHITE; g.fillRect(0, 0, 128, 12); g.fillRect(0, 92, 128, 8);  // trim bands
  g.fillStyle = PEN_WHITE; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFont(g, 'W', 92, 78, '900');
  g.fillText('W', 64, 52);
  return new THREE.CanvasTexture(cv);
}
function bullseyeTex() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
  const g = cv.getContext('2d'); const cx = 128, cy = 128;
  const ring = (r, c) => { g.fillStyle = c; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); };
  ring(122, BULL_WHITE); ring(112, BULL_RED); ring(88, BULL_WHITE);   // concentric rings
  ring(66, BULL_RED); ring(42, BULL_WHITE); ring(20, BULL_RED);
  // 'HIT IT HERE' arced across the top ring
  const text = 'HIT IT HERE', radius = 100, arcSpan = Math.PI * 0.92;
  g.fillStyle = BULL_RED; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFont(g, text, arcSpan * radius * 0.92, 34, '800');
  const chars = text.split(''), step = arcSpan / (chars.length - 1);
  g.save(); g.translate(cx, cy);
  let a = -arcSpan / 2;
  for (const ch of chars) { g.save(); g.rotate(a); g.translate(0, -radius); g.fillText(ch, 0, 0); g.restore(); a += step; }
  g.restore();
  return new THREE.CanvasTexture(cv);
}

// ------------------------- instancing helper --------------------------
const _M = new THREE.Matrix4(), _Q = new THREE.Quaternion(), _E = new THREE.Euler(), _V = new THREE.Vector3(), _S = new THREE.Vector3();
function instMesh(geo, mat, items) {
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  items.forEach((it, i) => {
    _E.set(0, it.yaw || 0, 0); _Q.setFromEuler(_E);
    _V.set(it.pos[0], it.pos[1], it.pos[2]);
    const s = it.scale; _S.set(s ? s[0] : 1, s ? s[1] : 1, s ? s[2] : 1);
    _M.compose(_V, _Q, _S); m.setMatrixAt(i, _M);
  });
  m.instanceMatrix.needsUpdate = true; wrigleyRoot.add(m); return m;
}
// A free-standing board's DoubleSide back reads MIRRORED (PITFALLS: lone
// DoubleSide canvas plane). Merge the front quad with a π-rotated back quad into
// ONE FrontSide geometry so each face shows upright text and the back-face is
// culled — stays ONE draw call (+0 vs the old single plane).
function twoFaceGeo(geo) { return BufferGeometryUtils.mergeBufferGeometries([geo, geo.clone().rotateY(Math.PI)], false); }
function board(w, h, x, y, z, yaw, tex) {                 // two-faced textured board (no mirrored back)
  const m = new THREE.Mesh(twoFaceGeo(new THREE.PlaneGeometry(w, h)), bmat(0xffffff, { map: tex }));
  m.position.set(x, y, z); m.rotation.y = yaw; wrigleyRoot.add(m); return m;
}

// -------------------- hoisting rooftop W flags ------------------------
// waveland[0], waveland[2], sheffield[0] parapets. One InstancedMesh; the
// self-registered update lerps all three up over ~3 s, holds ~55 s, then
// lowers over ~3 s whenever state.cubsWinsSeen ticks (gameday's WIN).
let flagMesh = null;
const FLAG_BASE_Y = 9.95, FLAG_TOP_Y = 11.35;
const flagData = [
  { px: -221.5, pz: -574.4, yaw: 0 },            // waveland[0], faces the park (south)
  { px: -205.5, pz: -574.4, yaw: 0 },            // waveland[2]
  { px: -178.4, pz: -526.0, yaw: -Math.PI / 2 }, // sheffield[0], faces the park (west)
];
function setFlags(f) {
  if (!flagMesh) return;
  flagMesh.visible = f > 0.02;
  for (let i = 0; i < flagData.length; i++) {
    const d = flagData[i], y = FLAG_BASE_Y + (FLAG_TOP_Y - FLAG_BASE_Y) * f;
    _E.set(0, d.yaw, 0); _Q.setFromEuler(_E); _V.set(d.px, y, d.pz); _S.set(1, 1, 1);
    _M.compose(_V, _Q, _S); flagMesh.setMatrixAt(i, _M);
  }
  flagMesh.instanceMatrix.needsUpdate = true;
}

let lastSeen = 0, hoisting = false, hoistT = 0;
function update(dt) {
  if (activeCell() !== 'wrigleyville') return;
  const seen = state.cubsWinsSeen || 0;
  if (seen > lastSeen) { lastSeen = seen; hoisting = true; hoistT = 0; }
  if (!hoisting) return;
  hoistT += dt;
  let f;
  if (hoistT < 3) f = hoistT / 3;                // hoist
  else if (hoistT < 58) f = 1;                   // hold ~55 s
  else if (hoistT < 61) f = 1 - (hoistT - 58) / 3; // lower
  else { f = 0; hoisting = false; }
  setFlags(f);
}

// =====================================================================
export function buildDeepcuts() {
  // ---- 1. EAMUS CATULI! + AC counter on ROOFTOPS_W.sheffield[1], facing W ----
  const eLotZ = -510, eFaceX = -178.6, eYaw = -Math.PI / 2;
  board(7.0, 1.1, eFaceX, 11.70, eLotZ, eYaw, eamusTex());      // main banner
  board(3.4, 0.85, eFaceX - 0.02, 10.50, eLotZ, eYaw, acTex()); // AC drought counter below

  // ---- 2. 1060 W. ADDISON limestone plate, S wall just E of the Marquee ----
  board(1.6, 0.5, -273, 3.2, -413.93, 0, addressTex());

  // ---- 3 + EAMUS posts: one InstancedMesh of vertical poles (dark metal) ----
  const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
  instMesh(CYL, toon(0x3a3a40), [
    { pos: [-178.25, 11.05, -506.7], scale: [0.14, 2.9, 0.14] },  // EAMUS post
    { pos: [-178.25, 11.05, -513.3], scale: [0.14, 2.9, 0.14] },  // EAMUS post
    { pos: [flagData[0].px, 10.7, flagData[0].pz], scale: [0.12, 2.2, 0.12] },  // flag poles
    { pos: [flagData[1].px, 10.7, flagData[1].pz], scale: [0.12, 2.2, 0.12] },
    { pos: [flagData[2].px, 10.7, flagData[2].pz], scale: [0.12, 2.2, 0.12] },
  ]);

  // ---- 3. the three hoisting W flags (start LOWERED + hidden) ----
  const flagGeo = new THREE.PlaneGeometry(1.0, 0.72).translate(0.5, 0, 0);
  flagMesh = new THREE.InstancedMesh(flagGeo, bmat(0xffffff, { map: wFlagTex(), side: THREE.DoubleSide }), flagData.length);
  wrigleyRoot.add(flagMesh);
  setFlags(0); flagMesh.visible = false;

  // ---- 4. W pennants on the Addison + Clark lamp rows (re-derived spacing) ----
  const A = STREETS_W.addison, CK = STREETS_W.clark, clarkYaw = Math.atan(0.28);
  const lamps = [];
  let li = 0; const side = (a, b) => (li++ % 2 === 0 ? a : b);
  // Addison — pennant face runs along the E–W street (yaw PI/2), DoubleSide reads both ways
  for (let x = A.x0 + 8; x <= A.x1 - 8; x += 18)
    side(() => lamps.push({ px: x, pz: -413.2 }), () => lamps.push({ px: x, pz: -386.8 }))();
  const nAddison = lamps.length;
  // Clark — pennant face runs along the diagonal (yaw = clark cant)
  li = 0; for (let z = CK.z0 + 8; z <= CK.z1 - 8; z += 17.3)
    side(() => lamps.push({ px: clarkX(z) - 13.2, pz: z }), () => lamps.push({ px: clarkX(z) + 13.2, pz: z }))();
  const pennGeo = new THREE.BufferGeometry();
  pennGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.35, 0, 0, 0.35, 0, 0, 0, -1.1, 0], 3));
  pennGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0.5, 0], 2));
  pennGeo.computeVertexNormals();
  instMesh(pennGeo, bmat(0xffffff, { map: pennantTex(), side: THREE.DoubleSide }),
    lamps.map((l, i) => ({ pos: [l.px, 5.2, l.pz], yaw: i < nAddison ? Math.PI / 2 : clarkYaw })));

  // ---- 5. HIT IT HERE bullseye on waveland[2]'s Waveland-facing parapet ----
  const bull = new THREE.Mesh(twoFaceGeo(new THREE.CircleGeometry(0.7, 32)), bmat(0xffffff, { map: bullseyeTex() }));  // back-to-back, no mirror
  bull.position.set(-201.5, 11.0, -574.4); wrigleyRoot.add(bull);

  // self-registered hoist update (cell-gated inside update)
  lastSeen = state.cubsWinsSeen || 0;
  registerUpdate(update);
}

onWorldReady(() => { buildDeepcuts(); });
