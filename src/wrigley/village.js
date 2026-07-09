// Wrigleyville village — Murphy's Bleachers, Cubby Bear, the Clark neon bar
// row, Engine 78 firehouse, souvenir stands, Gallagher Way (lawn, video board,
// splash pad, cornhole, planters) and Statue Row + Harry Caray.
// Data: VILLAGE_W / GALLAGHER_W / clarkX. Attach to wrigleyRoot; own rng only.
//
// r128 gotchas honored: InstancedMesh.setColorAt is IGNORED by the toon shader,
// so per-instance color = per-material (bucket by color). Object3D.position/
// rotation are read-only, so meshes are built via M(). Only toon()/bmat() are
// used so the world-curve vertex shader is injected everywhere.
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon, bmat, mulberry32, pointsMat } from '../core.js';
import { collide } from '../props.js';
import { createChibi } from '../framework.js';
import { wrigleyRoot } from './index.js';
import { VILLAGE_W, GALLAGHER_W, OFFICE_W, SLUGGERS_W, clarkX } from '../data/wrigleyville.js';

const R = mulberry32(1060);                       // OWN seed — never core rng/wrand
const rr = (a, b) => a + (b - a) * R();
const clarkYaw = Math.atan(0.28);                 // Clark diagonal heading (facades parallel it)
const mergeGeos = arr => BufferGeometryUtils.mergeBufferGeometries(arr.map(g => g.index ? g.toNonIndexed() : g), false);
// ---- global static-geometry merge pool: every non-instanced Mesh/Group is
// baked to world space and merged by material, so the whole village's solid
// geometry collapses to ~one draw call per distinct material (draw budget).
const SOLID = new Map();
function mark(o) {
  o.updateMatrixWorld(true);
  o.traverse(c => {
    if (!c.isMesh) return;
    const g = c.geometry.clone(); g.applyMatrix4(c.matrixWorld);
    if (!SOLID.has(c.material)) SOLID.set(c.material, []);
    SOLID.get(c.material).push(g);
  });
}
function add(o) {                                 // Instanced/Points stay live; Mesh/Group -> merge pool
  if (o.isInstancedMesh || o.isPoints) { wrigleyRoot.add(o); return o; }
  mark(o); return o;
}
function emitStatic() { for (const [mat, geos] of SOLID) wrigleyRoot.add(new THREE.Mesh(mergeGeos(geos), mat)); }
// local offset (lx,lz) under a Y-rotation of `th` -> world delta
const yrot = (lx, lz, th) => [lx * Math.cos(th) + lz * Math.sin(th), -lx * Math.sin(th) + lz * Math.cos(th)];
// mesh with position (+ optional rotation) — position/rotation are read-only props
function M(geo, mat, x, y, z, rx, ry, rz) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y || 0, z || 0);
  if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
  return m;
}

// ---- cross-building instancing accumulators (one draw call each at emit) ----
const A = {
  win: [], awn: [], rib: [], pole: [], flag: [],    // buildings
  cap: [], ped: [], base: [],                        // stands / statues
};

// place items[{pos:[x,y,z],yaw?,rx?,rz?,scale?[x,y,z]}] as one InstancedMesh.
function instMesh(geo, mat, items) {
  if (!items.length) return null;
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  const Mx = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
  items.forEach((it, i) => {
    E.set(it.rx || 0, it.yaw || 0, it.rz || 0); Q.setFromEuler(E);
    V.set(it.pos[0], it.pos[1], it.pos[2]);
    S.set(it.scale ? it.scale[0] : 1, it.scale ? it.scale[1] : 1, it.scale ? it.scale[2] : 1);
    Mx.compose(V, Q, S); m.setMatrixAt(i, Mx);
  });
  m.instanceMatrix.needsUpdate = true;
  wrigleyRoot.add(m); return m;
}
// bucket by color -> one InstancedMesh per color (toon setColorAt is a no-op)
function instColored(geo, items) {
  const groups = new Map();
  for (const it of items) { const k = it.color ?? 0xffffff; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(it); }
  for (const [c, g] of groups) instMesh(geo, toon(c), g);
}

// =====================================================================
//  canvas textures (dusk neon leans warm; bmat = unlit = self-lit signs)
// =====================================================================
function cvTex(w, h) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return [cv, cv.getContext('2d')]; }
function tx(cv) { const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t; }

function winTex() {                                 // warm lit sash window
  const [cv, g] = cvTex(64, 96);
  g.fillStyle = '#2a2320'; g.fillRect(0, 0, 64, 96);
  g.fillStyle = '#ffd98a'; g.fillRect(5, 5, 54, 86);
  g.strokeStyle = '#6b4f2e'; g.lineWidth = 5; g.strokeRect(5, 5, 54, 86);
  g.lineWidth = 4; g.beginPath(); g.moveTo(32, 5); g.lineTo(32, 91); g.moveTo(5, 48); g.lineTo(59, 48); g.stroke();
  return tx(cv);
}
// generic neon storefront sign on a dark board
function neonTex(text, hex, icon) {
  const [cv, g] = cvTex(384, 128);
  g.fillStyle = '#0e0b13'; g.fillRect(0, 0, 384, 128);
  g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 4; g.strokeRect(6, 6, 372, 116);
  if (icon) icon(g);
  const col = '#' + hex.toString(16).padStart(6, '0');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 62; g.font = `700 ${fs}px "Trebuchet MS",Arial,sans-serif`;
  while (g.measureText(text).width > 344 && fs > 26) { fs -= 2; g.font = `700 ${fs}px "Trebuchet MS",Arial,sans-serif`; }
  g.shadowColor = col; g.shadowBlur = 26; g.fillStyle = col;
  g.fillText(text, 192, 70); g.fillText(text, 192, 70);
  g.shadowBlur = 0; g.fillStyle = '#fff8e6'; g.font = `700 ${fs}px "Trebuchet MS",Arial,sans-serif`;
  g.fillText(text, 192, 70);
  return tx(cv);
}
const bats = g => { g.save(); g.translate(192, 46); g.strokeStyle = '#d9b06a'; g.lineCap = 'round'; g.lineWidth = 12; for (const s of [-1, 1]) { g.save(); g.rotate(s * 0.5); g.beginPath(); g.moveTo(0, -30); g.lineTo(0, 34); g.stroke(); g.restore(); } g.restore(); };
const shamrock = g => { g.save(); g.translate(300, 44); g.fillStyle = '#39b552'; for (const a of [-1.05, 0, 1.05]) { g.beginPath(); g.arc(Math.sin(a) * 15, -Math.cos(a) * 15, 12, 0, 7); g.fill(); } g.fillRect(-3, 6, 6, 20); g.restore(); };

function murphyTex() {                               // red letters on cream, green trim
  const [cv, g] = cvTex(512, 128);
  g.fillStyle = '#f3ead2'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#1f5136'; g.fillRect(0, 0, 512, 12); g.fillRect(0, 116, 512, 12);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#b6392c'; g.font = '800 46px "Arial Black",Arial,sans-serif';
  g.fillText("MURPHY'S", 256, 46); g.font = '800 40px "Arial Black",Arial,sans-serif';
  g.fillText('BLEACHERS', 256, 90);
  return tx(cv);
}
function bladeTex() {                                // vertical MURPHY'S blade
  const [cv, g] = cvTex(96, 384);
  g.fillStyle = '#123f2a'; g.fillRect(0, 0, 96, 384);
  g.strokeStyle = '#f3ead2'; g.lineWidth = 6; g.strokeRect(6, 6, 84, 372);
  g.save(); g.translate(48, 192); g.rotate(-Math.PI / 2);
  g.fillStyle = '#f6c14a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 52px "Arial Black",Arial,sans-serif'; g.fillText("MURPHY'S", 0, 0); g.restore();
  return tx(cv);
}
function cubbyTex() {                                // white on black
  const [cv, g] = cvTex(512, 192);
  g.fillStyle = '#0b0b0d'; g.fillRect(0, 0, 512, 192);
  g.strokeStyle = '#f4f4f2'; g.lineWidth = 7; g.strokeRect(9, 9, 494, 174);
  g.fillStyle = '#f7f7f4'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 84px "Arial Black",Arial,sans-serif'; g.fillText('CUBBY', 256, 66);
  g.fillText('BEAR', 256, 140);
  return tx(cv);
}
function bearTex() {                                 // round bear-face logo disc
  const [cv, g] = cvTex(256, 256);
  g.clearRect(0, 0, 256, 256);
  g.fillStyle = '#6b4a30';
  for (const s of [-1, 1]) { g.beginPath(); g.arc(128 + s * 74, 74, 34, 0, 7); g.fill(); }   // ears
  g.beginPath(); g.arc(128, 132, 104, 0, 7); g.fill();                                        // head
  g.fillStyle = '#caa676'; g.beginPath(); g.arc(128, 152, 58, 0, 7); g.fill();                // muzzle
  g.fillStyle = '#241812';
  for (const s of [-1, 1]) g.fillRect(128 + s * 44 - 9, 108, 18, 18);                         // eyes
  g.beginPath(); g.arc(128, 138, 15, 0, 7); g.fill();                                         // nose
  g.lineWidth = 6; g.strokeStyle = '#241812'; g.beginPath(); g.moveTo(128, 152); g.lineTo(128, 172); g.stroke();
  return tx(cv);
}
function beerTex(word, hex) {                        // tiny window neon
  const [cv, g] = cvTex(128, 64);
  g.fillStyle = '#120d10'; g.fillRect(0, 0, 128, 64);
  const col = '#' + hex.toString(16).padStart(6, '0');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = col; g.shadowBlur = 16; g.fillStyle = col;
  g.font = '700 30px "Trebuchet MS",Arial,sans-serif'; g.fillText(word, 64, 34); g.fillText(word, 64, 34);
  return tx(cv);
}
function lintelTex() {                               // ENGINE CO. 78 limestone lintel
  const [cv, g] = cvTex(512, 96);
  g.fillStyle = '#e6ddc8'; g.fillRect(0, 0, 512, 96);
  g.strokeStyle = '#c3b697'; g.lineWidth = 6; g.strokeRect(5, 5, 502, 86);
  g.fillStyle = '#4a4033'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 46px Georgia,"Times New Roman",serif'; g.fillText('ENGINE CO. 78', 256, 52);
  return tx(cv);
}
function capSignTex() {                              // hand-lettered CUBS HATS $10
  const [cv, g] = cvTex(256, 128);
  g.fillStyle = '#f5efe0'; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = '#c9c0aa'; g.lineWidth = 5; g.strokeRect(6, 6, 244, 116);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#0e4c92'; g.font = '800 40px "Comic Sans MS","Marker Felt",cursive';
  g.fillText('CUBS HATS', 128, 46);
  g.fillStyle = '#c0392b'; g.font = '800 46px "Comic Sans MS","Marker Felt",cursive';
  g.fillText('$10', 128, 92);
  return tx(cv);
}
function wFlagTex() {                                // Cubs win 'W' flag
  const [cv, g] = cvTex(96, 72);
  g.fillStyle = '#f4f6fb'; g.fillRect(0, 0, 96, 72);
  g.strokeStyle = '#0e4c92'; g.lineWidth = 5; g.strokeRect(4, 4, 88, 64);
  g.fillStyle = '#0e4c92'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 56px "Arial Black",Arial,sans-serif'; g.fillText('W', 48, 40);
  return tx(cv);
}
function buntingTex() {                              // red/white/blue swags (transparent above)
  const [cv, g] = cvTex(512, 64);
  g.clearRect(0, 0, 512, 64);
  const cols = ['#b03a2e', '#f2eee4', '#24407a'];
  for (let i = 0; i < 12; i++) { g.fillStyle = cols[i % 3]; g.beginPath(); g.arc((i + 0.5) * 512 / 12, 4, 512 / 24, 0, Math.PI); g.fill(); }
  return tx(cv);
}
function boardTex() {                                // Gallagher Way video board
  const [cv, g] = cvTex(512, 288);
  g.fillStyle = '#123018'; g.fillRect(0, 0, 512, 288);
  g.fillStyle = '#2f8a44'; g.fillRect(0, 132, 512, 156);                 // field
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 3;
  for (let x = 40; x < 512; x += 60) { g.beginPath(); g.moveTo(x, 138); g.lineTo(x - 26, 288); g.stroke(); }  // mow lines
  g.fillStyle = '#c9a35a'; g.beginPath(); g.moveTo(256, 176); g.lineTo(300, 216); g.lineTo(256, 256); g.lineTo(212, 216); g.closePath(); g.fill();  // infield
  g.fillStyle = '#f7f7f2'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 76px "Arial Black",Arial,sans-serif';
  g.shadowColor = '#ffd24a'; g.shadowBlur = 18; g.fillText('CUBS 3–2', 256, 58); g.shadowBlur = 0;
  g.font = '700 34px "Trebuchet MS",Arial,sans-serif'; g.fillStyle = '#ffe08a';
  g.fillText('GAME IN PROGRESS', 256, 108);
  return tx(cv);
}
function gallagherSignTex() {                        // GALLAGHER WAY — cream lettering on Cubs green (house-sign style)
  const [cv, g] = cvTex(512, 128);
  g.fillStyle = '#123f2a'; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#f3ead2'; g.lineWidth = 7; g.strokeRect(9, 9, 494, 110);
  g.fillStyle = '#f6efdc'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 60px "Trebuchet MS",Arial,sans-serif'; g.fillText('GALLAGHER WAY', 256, 66);
  return tx(cv);
}
function plaqueTex(name, sub) {                      // pedestal plaque
  const [cv, g] = cvTex(256, 128);
  g.fillStyle = '#c7bb9c'; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = '#8f8265'; g.lineWidth = 6; g.strokeRect(8, 8, 240, 112);
  g.fillStyle = '#4a3a22'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 28px Georgia,serif'; g.fillText(name, 128, 50);
  g.font = 'italic 20px Georgia,serif'; g.fillText(sub, 128, 86);
  return tx(cv);
}
function usFlagTex() {
  const [cv, g] = cvTex(96, 60);
  g.fillStyle = '#b22234'; for (let i = 0; i < 7; i++) g.fillRect(0, i * 8.6, 96, 4.3);
  g.fillStyle = '#f4f4f4'; for (let i = 0; i < 6; i++) g.fillRect(0, 4.3 + i * 8.6, 96, 4.3);
  g.fillStyle = '#3c3b6e'; g.fillRect(0, 0, 40, 32);
  g.fillStyle = '#fff'; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { g.beginPath(); g.arc(6 + c * 10, 6 + r * 10, 1.6, 0, 7); g.fill(); }
  return tx(cv);
}
function stripeTex() {
  const [cv, g] = cvTex(128, 32);
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#c0392b' : '#2f6bb0'; g.fillRect(i * 16, 0, 16, 32); }
  return tx(cv);
}
function aBoardTex() {
  const [cv, g] = cvTex(128, 192);
  g.fillStyle = '#26332a'; g.fillRect(0, 0, 128, 192);
  g.strokeStyle = '#f4c542'; g.lineWidth = 5; g.strokeRect(6, 6, 116, 180);
  g.fillStyle = '#f6efdc'; g.textAlign = 'center';
  g.font = '800 26px "Trebuchet MS",Arial,sans-serif'; g.fillText('GAME', 64, 60); g.fillText('DAY', 64, 92);
  g.fillStyle = '#f4c542'; g.font = '800 22px "Trebuchet MS",Arial,sans-serif'; g.fillText('COLD BEER', 64, 140);
  return tx(cv);
}

// shared textures/materials built once
let SH = null;
function shared() {
  if (SH) return SH;
  SH = {
    winMat: bmat(0xffffff, { map: winTex() }),
    beerMats: [bmat(0xffffff, { map: beerTex('OLD STYLE', 0xff5a3c) }), bmat(0xffffff, { map: beerTex('BUDWEISER', 0xff4a4a) }), bmat(0xffffff, { map: beerTex('ON TAP', 0x5ad0ff) })],
    flagMat: bmat(0xffffff, { map: wFlagTex(), side: THREE.DoubleSide }),
    capSignMat: bmat(0xffffff, { map: capSignTex() }),   // shared across the 3 stands
    aBoardMat: bmat(0xffffff, { map: aBoardTex() }),
    headMat: bmat(0xfff2c0),                              // warm headlights
  };
  return SH;
}

// =====================================================================
//  STATIC TEXTURED-PLANE ATLAS
//  Each canvas-textured sign/plaque/poster needs its own CanvasTexture, so
//  mergeCellStatic can never bucket them (unique material each). We pack the
//  static ones into ONE atlas canvas + ONE merged mesh (opaque), plus ONE for
//  the transparent-textured planes. World transforms are baked into geometry
//  (like the SOLID pool) so the world-curve shader renders identically; each
//  plane's UVs are remapped into its atlas region (½-texel inset + 2 px gutter,
//  no bleed). Both atlas meshes are DoubleSide (backs sit against building
//  bodies — never seen). Excludes anything live/redrawn (none here: the video
//  board is drawn once and never .needsUpdate'd). Consumes NO rng.
// =====================================================================
// Shared across ALL wrigley builders (streets/station/stadium/rooftops import
// atlasPlane): they run before buildVillage, so they push here and buildVillage
// (last) emits. ATLAS is a module singleton, so every builder feeds one atlas.
const ATLAS = { opaque: [], alpha: [] };
export function atlasPlane(mesh, alpha) {          // collect a finished textured plane; it is NEVER added individually
  if (!mesh.parent) mesh.updateMatrixWorld(true);  // cat-A (no parent): world = local. cat-B callers pre-update the group.
  ATLAS[alpha ? 'alpha' : 'opaque'].push({ cv: mesh.material.map.image, geo: mesh.geometry, world: mesh.matrixWorld.clone() });
  if (mesh.parent) mesh.parent.remove(mesh);       // cat-B: detach from its group so add(g) won't double-bake it
}
export function emitAtlas(list, alpha) {
  if (!list.length) return;
  const PAD = 2, MAXW = 1024;
  const order = list.slice().sort((a, b) => b.cv.height - a.cv.height);   // tallest-first shelf pack
  let x = PAD, y = PAD, shelfH = 0, usedW = 0;
  for (const it of order) {
    const w = it.cv.width, h = it.cv.height;
    if (x + w + PAD > MAXW && x > PAD) { y += shelfH + PAD; x = PAD; shelfH = 0; }
    it.rx = x; it.ry = y; it.rw = w; it.rh = h;
    x += w + PAD; usedW = Math.max(usedW, x); shelfH = Math.max(shelfH, h);
  }
  const AW = usedW, AH = y + shelfH + PAD;
  const cv = document.createElement('canvas'); cv.width = AW; cv.height = AH;
  const ctx = cv.getContext('2d');
  for (const it of order) ctx.drawImage(it.cv, it.rx, it.ry);            // native size -> pixel density preserved
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4; tex.generateMipmaps = false;                      // NPOT-safe (linear, clamp, no mips)
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const geos = [];
  for (const it of order) {
    const geo = it.geo.index ? it.geo.toNonIndexed() : it.geo.clone();
    geo.applyMatrix4(it.world);                                          // bake world transform (position + normals)
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i), v = uv.getY(i);                              // remap [0,1] plane UV -> atlas region (½-texel inset)
      uv.setXY(i, (it.rx + 0.5 + u * (it.rw - 1)) / AW, (AH - it.ry - it.rh + 0.5 + v * (it.rh - 1)) / AH);
    }
    geos.push(geo);
  }
  const opts = alpha ? { map: tex, transparent: true, side: THREE.DoubleSide } : { map: tex, side: THREE.DoubleSide };
  wrigleyRoot.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(geos, false), bmat(0xffffff, opts)));
}

function signPlane(tex, x, y, z, ry, w, h) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bmat(0xffffff, { map: tex }));
  m.position.set(x, y, z); m.rotation.y = ry; atlasPlane(m, false); return m;   // -> shared opaque atlas
}

// =====================================================================
//  1. MURPHY'S BLEACHERS  (SE corner Sheffield & Waveland, faces WEST)
// =====================================================================
function buildMurphys() {
  const b = VILLAGE_W.murphys, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const w = b.x1 - b.x0, d = b.z1 - b.z0, H = 8.6;
  const brick = toon(0xc2a370), grn = toon(0x1f5136);
  add(M(new THREE.BoxGeometry(w, H, d, 2, 4, 2), brick, cx, H / 2, cz));
  add(M(new THREE.BoxGeometry(w + 0.3, 0.5, d + 0.3), grn, cx, H - 0.25, cz));                 // cornice band
  A.base.push({ pos: [cx, 0.35, cz], scale: [w + 0.2, 0.7, d + 0.2], color: 0xd8cdb4 });
  signPlane(murphyTex(), b.x0 - 0.06, 4.7, cz, -Math.PI / 2, 12, 3);                            // west facade sign
  // corner blade at the NW corner (faces the Sheffield/Waveland corner)
  const bx = b.x0 + 0.2, bz = b.z0 + 0.2;
  add(M(new THREE.CylinderGeometry(0.07, 0.07, 4.4, 6), toon(0x2a2a2e), bx, H + 0.6, bz));
  const bl = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 5.2), bmat(0xffffff, { map: bladeTex(), side: THREE.DoubleSide }));
  bl.position.set(bx - 0.75, H + 0.4, bz - 0.75); bl.rotation.y = -Math.PI / 2.3; atlasPlane(bl, false);
  awning(b.x0 - 0.7, 3.5, cz, 0, 1.5, d - 2);                                                   // west storefront awning
  for (const wy of [3.0, 6.0]) for (const wz of [cz - 4, cz, cz + 4])
    A.win.push({ pos: [b.x0 - 0.05, wy, wz], yaw: -Math.PI / 2, scale: [1.2, 1.7, 1] });
  rooftopPatio(cx, cz, w, d, H);
  aBoard(b.x0 - 2.4, cz + 4.2, -Math.PI / 2);
  collide(cx, cz, 8);
}

// =====================================================================
//  2. CUBBY BEAR  (opposite the marquee; sign on the N face toward Clark&Addison)
// =====================================================================
function buildCubby() {
  const b = VILLAGE_W.cubbyBear, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const w = b.x1 - b.x0, d = b.z1 - b.z0, H = 8.4;
  add(M(new THREE.BoxGeometry(w, H, d, 2, 4, 2), toon(0x4e3a34), cx, H / 2, cz));
  add(M(new THREE.BoxGeometry(w + 0.3, 0.5, d + 0.3), toon(0x2c211d), cx, H - 0.25, cz));
  A.base.push({ pos: [cx, 0.3, cz], scale: [w + 0.2, 0.6, d + 0.2], color: 0x2c211d });
  // giant white-on-black sign on the north face (faces -z toward the intersection)
  signPlane(cubbyTex(), cx, H - 1.3, b.z0 - 0.06, Math.PI, w - 1.5, 3.2);
  // round bear disc on the NE corner, facing NE
  const ne = 2.356;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), bmat(0xffffff, { map: bearTex(), transparent: true }));
  disc.position.set(b.x1 - 0.3, 4.4, b.z0 - 0.25); disc.rotation.y = ne; atlasPlane(disc, true);
  // neon beer signs in ground-floor windows + warm upper windows
  const sh = shared();
  const beerAt = (x, z, yaw, mi) => { const q = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.65), sh.beerMats[mi]); const [dx, dz] = yrot(0, 0.05, yaw); q.position.set(x + dx, 2.4, z + dz); q.rotation.y = yaw; atlasPlane(q, false); };
  beerAt(cx - 3.5, b.z0, Math.PI, 0); beerAt(cx + 3.5, b.z0, Math.PI, 2);   // north face
  beerAt(b.x1, cz + 3, Math.PI / 2, 1);                                     // east face (toward Clark)
  for (const wx of [cx - 4, cx + 4]) A.win.push({ pos: [wx, 5.6, b.z0 - 0.05], yaw: Math.PI, scale: [1.2, 1.6, 1] });
  for (const wz of [cz - 3, cz + 3]) A.win.push({ pos: [b.x1 + 0.05, 5.6, wz], yaw: Math.PI / 2, scale: [1.2, 1.6, 1] });
  collide(cx, cz, 8);
}

// =====================================================================
//  3. CLARK BAR ROW  (west side of Clark, four attached storefronts)
// =====================================================================
function buildBars() {
  const facades = [0x7a6f63, 0x8a5a4a, 0x566a58, 0x6a6472];
  const neons = [
    { t: 'SLUGGERS', c: 0xff5545, icon: bats },
    { t: 'SPORTS CORNER', c: 0xffb43a },
    { t: "CASEY'S", c: 0x4ad06a, icon: shamrock },
    { t: 'THE DUGOUT', c: 0x5aa8ff },
  ];
  // clarkBars[0] ('SLUGGERS') is LOWERED to a 2-storey bar: its roof is the
  // batting-cage destination (task 009 — buildSluggersRoof adds the stair/deck).
  const Hs = [SLUGGERS_W.roofY, 11.0, 8.6, 10.2];
  VILLAGE_W.clarkBars.forEach((bar, i) => {
    const zc = (bar.z0 + bar.z1) / 2, H = Hs[i];
    const gx = clarkX(zc) - 22, gz = zc, dep = 12, wid = (bar.z1 - bar.z0);
    const g = new THREE.Group(); g.position.set(gx, 0, gz); g.rotation.y = clarkYaw;
    g.add(M(new THREE.BoxGeometry(dep, H, wid, 2, 4, 2), toon(facades[i]), 0, H / 2, 0));
    g.add(M(new THREE.BoxGeometry(dep + 0.2, 0.45, wid + 0.02), toon(0x2c2620), 0, H - 0.22, 0));   // parapet
    // Sluggers (i=0): its sign shifts to the low SOUTH end of the front, clear
    // of the rooftop stair that climbs the north half.
    const sgnW = i === 0 ? 7.5 : wid - 3, sgnZ = i === 0 ? -4.2 : 0;
    const sgn = new THREE.Mesh(new THREE.PlaneGeometry(sgnW, 2.2), bmat(0xffffff, { map: neonTex(neons[i].t, neons[i].c, neons[i].icon) }));
    sgn.position.set(dep / 2 + 0.05, H - 2.0, sgnZ); sgn.rotation.y = Math.PI / 2; g.add(sgn);        // street-facing (+x local)
    g.updateMatrixWorld(true); atlasPlane(sgn, false);   // bake the neon sign into the shared atlas (detaches it from g)
    add(g);   // add() snapshots the group's remaining meshes NOW — must come after every g.add
    if (i !== 0) {   // Sluggers (i=0): the rooftop stair replaces the awning; the roof carries the flag + cage
      const [ax, az] = yrot(dep / 2 + 0.7, 0, clarkYaw);
      awning(gx + ax, 3.4, gz + az, clarkYaw + Math.PI / 2, 1.5, wid - 2);
      for (const lz of [-3.5, 3.5]) { const [dx, dz] = yrot(dep / 2 + 0.05, lz, clarkYaw); A.win.push({ pos: [gx + dx, H - 3.4, gz + dz], yaw: clarkYaw + Math.PI / 2, scale: [1.3, 1.7, 1] }); }
      const [fx, fz] = yrot(dep / 2 - 1, wid / 2 - 1.5, clarkYaw);
      A.pole.push({ pos: [gx + fx, H, gz + fz] });
      A.flag.push({ pos: [gx + fx + 0.55, H + 1.05, gz + fz], yaw: clarkYaw });
    }
    // Sluggers roof is walkable: cap the body collider BELOW the deck so the
    // player can stand up there (collide is ignored once player.y > h).
    collide(gx, gz, 6.5, i === 0 ? Hs[0] - 0.2 : Infinity);
  });
  // red/white/blue bunting strung along the whole row front (Clark is linear -> straight strip)
  const z0 = -486, z1 = -420, zm = (z0 + z1) / 2, len = Math.hypot(clarkX(z1) - clarkX(z0), z1 - z0);
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.8), bmat(0xffffff, { map: buntingTex(), transparent: true, side: THREE.DoubleSide }));
  const [bx, bz] = yrot(6.4, 0, clarkYaw); bg.position.set(clarkX(zm) - 22 + bx, 7.0, zm + bz);
  bg.rotation.y = clarkYaw + Math.PI / 2; atlasPlane(bg, true);
}

// =====================================================================
//  3b. SLUGGERS ROOFTOP  (task 009 — the batting-cage destination)
//  clarkBars[0] is a low bar; an exterior stair up its street (east) face
//  climbs to a rooftop deck that carries the fast-pitch cage. Walk data is
//  SLUGGERS_W (shared with the engine + walkprobe); this builds only meshes
//  + the stair-edge railing colliders, in the SAME local frame (origin
//  cx/cz, rotation th) so the drawn steps line up with the ramp exactly.
//  Colours reuse existing village materials (office-limestone deck, parapet
//  dark steel) so the static merge pool adds no new draw calls.
// =====================================================================
function cageSignTex() {                            // street-level "cages upstairs" arrow board
  const [cv, g] = cvTex(256, 128);
  g.fillStyle = '#0e0b13'; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 4; g.strokeRect(6, 6, 244, 116);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#ff5545'; g.shadowBlur = 16; g.fillStyle = '#ff5545';
  g.font = '800 30px "Trebuchet MS",Arial,sans-serif'; g.fillText('BATTING CAGES', 128, 40); g.fillText('BATTING CAGES', 128, 40);
  g.shadowBlur = 0; g.fillStyle = '#ffd24a';
  g.font = '800 30px "Trebuchet MS",Arial,sans-serif'; g.fillText('UPSTAIRS  ↑', 128, 90);
  return tx(cv);
}
function buildSluggersRoof() {
  const SL = SLUGGERS_W, c = Math.cos(SL.th), sn = Math.sin(SL.th), rf = SL.roofY, S = SL.stair, hz = S.hz;
  const deckMat = toon(0x9a948b), steel = toon(0x2c2620);   // reuse office-lime + parapet-dark → no new draw
  const w2 = (lx, lz) => [SL.cx + lx * c + lz * sn, SL.cz - lx * sn + lz * c];
  const yAt = lz => rf * (lz + hz) / (2 * hz);
  const g = new THREE.Group(); g.position.set(SL.cx, 0, SL.cz); g.rotation.y = SL.th;
  // deck surface + stair-top landing (slabs a hair proud of the building top)
  g.add(M(new THREE.BoxGeometry(SL.deck.hx * 2, 0.14, SL.deck.hz * 2), deckMat, SL.deck.lx, rf + 0.03, SL.deck.lz));
  g.add(M(new THREE.BoxGeometry(SL.bridge.hx * 2, 0.14, SL.bridge.hz * 2), deckMat, SL.bridge.lx, rf + 0.03, SL.bridge.lz));
  // exterior stair — treads + risers climbing lz −hz (y0) → +hz (y rf). Steps
  // are the light steel (deckMat); the tilt is NEGATIVE so the +z (north) end
  // rises with the treads (a positive tilt sends the stringers the wrong way,
  // crossing the treads as an X over the sign).
  const tilt = -Math.atan2(rf, 2 * hz), nT = 15, step = 2 * hz / nT;
  for (let i = 0; i < nT; i++) {
    const lz = -hz + (i + 0.5) * step, y = yAt(lz);
    g.add(M(new THREE.BoxGeometry(S.hx * 2 - 0.2, 0.13, step + 0.28), deckMat, S.lx, y, lz));                 // tread
    g.add(M(new THREE.BoxGeometry(S.hx * 2 - 0.2, rf / nT + 0.12, 0.1), deckMat, S.lx, y - rf / nT / 2, lz - step / 2));  // riser
  }
  for (const sx of [S.lx - S.hx + 0.12, S.lx + S.hx - 0.12]) {                                              // side stringers
    const st = M(new THREE.BoxGeometry(0.14, 0.38, 2 * hz + 0.6), deckMat, sx, rf / 2, S.lz);
    st.rotation.x = tilt; g.add(st);
  }
  // stair OUTER-edge railing (posts + sloped top rail, dark for contrast) — the elevator seal
  const railE = S.lx + S.hx;
  for (let lz = -hz + 1; lz <= hz; lz += 1.2) g.add(M(new THREE.BoxGeometry(0.09, 1.0, 0.09), steel, railE, yAt(lz) + 0.5, lz));
  { const rl = M(new THREE.BoxGeometry(0.1, 0.1, 2 * hz + 0.2), steel, railE, rf / 2 + 1.0, S.lz); rl.rotation.x = tilt; g.add(rl); }
  // deck-edge posts on the WEST + NORTH (park) sides, low rail — believable roof edge
  for (let lz = -SL.deck.hz + 1; lz <= SL.deck.hz - 0.5; lz += 1.6) g.add(M(new THREE.BoxGeometry(0.09, 0.95, 0.09), steel, -SL.deck.hx, rf + 0.5, lz));
  for (let lx = -SL.deck.hx + 1; lx <= SL.deck.hx - 0.5; lx += 1.6) g.add(M(new THREE.BoxGeometry(0.09, 0.95, 0.09), steel, lx, rf + 0.5, SL.deck.hz));
  add(g);
  // street sign on the front face pointing up the stair
  const [sgx, sgz] = w2(S.lx + S.hx + 0.06, -hz + 2.2);
  signPlane(cageSignTex(), sgx, 2.5, sgz, SL.th + Math.PI / 2, 2.2, 1.1);
  // railing COLLIDERS (world): seal the stair's street edge; the base (lz < −hz+2)
  // is the walk-on mouth from the sidewalk, left open.
  for (let lz = -hz + 2; lz <= hz; lz += 1.05) { const [wx, wz] = w2(railE, lz); collide(wx, wz, 0.3, 12); }
}

// =====================================================================
//  4. ENGINE 78  (1915 Renaissance-Revival firehouse, faces SOUTH)
// =====================================================================
function buildEngine() {
  const b = VILLAGE_W.engine78, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const w = b.x1 - b.x0, d = b.z1 - b.z0, H = 10.2, fz = b.z1;   // south face
  const brick = toon(0x94402f), stone = toon(0xe6ddc8);
  add(M(new THREE.BoxGeometry(w, H, d, 2, 5, 2), brick, cx, H / 2, cz));
  A.base.push({ pos: [cx, 0.4, cz], scale: [w + 0.2, 0.8, d + 0.2], color: 0xd8cdb4 });
  for (const px of [cx - w / 2 + 0.5, cx - 2.2, cx + 2.2, cx + w / 2 - 0.5])                   // limestone pilaster strips
    add(M(new THREE.BoxGeometry(0.7, H - 0.6, 0.35), stone, px, (H - 0.6) / 2, fz + 0.03));
  add(M(new THREE.BoxGeometry(w + 0.1, 0.35, d + 0.1), stone, cx, 6.2, cz));                   // string course
  add(M(new THREE.BoxGeometry(w + 0.5, 0.6, d + 0.5), stone, cx, H + 0.05, cz));               // cornice
  // ONE wide apparatus bay, door OPEN -> dark opening framed by limestone, engine nosing out
  const bayW = 5.2, bayH = 4.4;
  add(M(new THREE.BoxGeometry(bayW, bayH, 0.08), toon(0x0c0a09), cx, bayH / 2 + 0.1, fz + 0.05));      // dark open bay
  for (const s of [-1, 1]) add(M(new THREE.BoxGeometry(0.5, bayH + 0.7, 0.4), stone, cx + s * (bayW / 2 + 0.25), (bayH + 0.7) / 2, fz + 0.12));  // jambs
  add(M(new THREE.BoxGeometry(bayW + 1.0, 0.55, 0.45), stone, cx, bayH + 0.45, fz + 0.12));            // limestone lintel band
  fireEngineNose(cx, fz + 0.5);                                                                         // engine nosing out of the bay
  collide(cx, fz + 0.3, 2.0);
  signPlane(lintelTex(), cx, 5.5, fz + 0.18, 0, 5.6, 1.05);                                    // 'ENGINE CO. 78' lintel
  for (const sx of [cx - 4, cx, cx + 4]) {                                                     // three upper windows + surrounds
    add(M(new THREE.BoxGeometry(1.5, 2.1, 0.28), stone, sx, 7.9, fz + 0.02));
    A.win.push({ pos: [sx, 7.9, fz + 0.12], yaw: 0, scale: [1.05, 1.65, 1] });
  }
  const pole = M(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6), toon(0xcabfa5), cx + w / 2 - 0.6, 6.9, fz + 0.2);
  pole.rotation.x = 0.5; add(pole);
  atlasPlane(M(new THREE.PlaneGeometry(1.2, 0.72), bmat(0xffffff, { map: usFlagTex(), side: THREE.DoubleSide }), cx + w / 2 + 0.2, 8.3, fz + 1.0), false);
  collide(cx, cz, 8);
}
function fireEngineNose(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  g.add(M(new THREE.BoxGeometry(4.0, 2.0, 2.2), toon(0xb42a22), 0, 1.4, 0));      // cab/hood
  g.add(M(new THREE.BoxGeometry(3.4, 1.0, 0.3), toon(0x0e0d0f), 0, 1.7, 1.1));    // windshield
  g.add(M(new THREE.BoxGeometry(2.6, 0.7, 0.25), toon(0xcfd3d6), 0, 0.7, 1.16));  // silver grille
  for (const s of [-1, 1]) {
    g.add(M(new THREE.CylinderGeometry(0.14, 0.14, 0.9, 12), toon(0x141414), s * 1.5, 0.5, 0.8, Math.PI / 2, 0, 0));  // tires
    g.add(M(new THREE.CircleGeometry(0.18, 12), shared().headMat, s * 1.1, 0.85, 1.19));                              // warm headlights
  }
  add(g);
}

// =====================================================================
//  5. SOUVENIR STANDS  (folding-table stalls, striped canopy, pegboard)
// =====================================================================
function buildStands() {
  const sh = shared();
  const canopyMat = bmat(0xffffff, { map: stripeTex() });
  const capGeo = new THREE.SphereGeometry(0.16, 8, 6);
  VILLAGE_W.standStalls.forEach(s => {
    const ry = s.ry || 0;   // front (customer side) = -z local; pegboard/back = +z local
    const g = new THREE.Group(); g.position.set(s.x, 0, s.z); g.rotation.y = ry;
    g.add(M(new THREE.BoxGeometry(3.0, 0.1, 1.0), toon(0x9a9088), 0, 0.95, -0.5));             // folding table (front)
    for (const sx of [-1.3, 1.3]) for (const sz of [-0.1, -0.9]) g.add(M(new THREE.BoxGeometry(0.08, 0.95, 0.08), toon(0x555555), sx, 0.48, sz));
    g.add(M(new THREE.BoxGeometry(3.0, 1.7, 0.1), toon(0xcbb488), 0, 1.6, 0.55));              // pegboard back
    g.add(M(new THREE.BoxGeometry(3.3, 0.1, 1.85), canopyMat, 0, 2.55, -0.05));               // striped canopy
    for (const sx of [-1.45, 1.45]) g.add(M(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 6), toon(0x777777), sx, 1.3, 0.5));   // back poles
    for (const sx of [-1.45, 1.45]) g.add(M(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 6), toon(0x777777), sx, 0.5, -0.7));  // front poles
    add(g);   // add() snapshots the group's meshes NOW — must come after every g.add
    for (let r = 0; r < 3; r++) for (let c = -2; c <= 2; c++) {                                // caps on the pegboard front
      const [dx, dz] = yrot(c * 0.55, 0.48, ry);
      A.cap.push({ pos: [s.x + dx, 1.15 + r * 0.38, s.z + dz], color: (r + c) % 2 ? 0x0e4c92 : 0xc0392b });
    }
    const [px, pz] = yrot(0, 0.47, ry);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.6), sh.capSignMat);
    sign.position.set(s.x + px, 2.28, s.z + pz); sign.rotation.y = ry + Math.PI; add(sign);   // faces the customer (-z)
    pennants(s.x, s.z, ry);
    collide(s.x, s.z, 1.6);
  });
  instMesh(capGeo, toon(0x0e4c92), A.cap.filter(c => c.color === 0x0e4c92));
  instMesh(capGeo, toon(0xc0392b), A.cap.filter(c => c.color === 0xc0392b));
  A.cap.length = 0;
}
function pennants(x, z, ry) {
  const cols = [0xc0392b, 0x0e4c92, 0xf2d24a, 0xf2eee4];
  for (let i = -3; i <= 3; i++) {
    const [dx, dz] = yrot(i * 0.42, -0.85, ry);
    add(M(new THREE.ConeGeometry(0.12, 0.28, 3), toon(cols[(i + 3) % cols.length]), x + dx, 2.4, z + dz, Math.PI, ry, 0));
  }
}

// =====================================================================
//  6a. GALLAGHER OFFICE BLOCK  (1101 W Waveland — the modern office/hotel
//  mass at Waveland & Clark that closes the plaza's north end; light
//  limestone facade, warm window grid, GALLAGHER WAY crown over the plaza)
// =====================================================================
function buildGallagherOffice() {
  const O = OFFICE_W, zc = (O.z0 + O.z1) / 2, cx = clarkX(zc) + 27;   // Clark-sheared frame, off-centred at 27
  const H = 14, dep = 24, wid = 24;                  // dep = off-depth (kept inset of off 15…39), wid = frontage along Clark
  const lime = toon(0x9a948b), stone = toon(0xe6ddc8);   // stone reuses Engine 78's limestone material (no new draw call)
  const g = new THREE.Group(); g.position.set(cx, 0, zc); g.rotation.y = clarkYaw;
  g.add(M(new THREE.BoxGeometry(dep, H, wid, 2, 4, 2), lime, 0, H / 2, 0));            // main mass
  g.add(M(new THREE.BoxGeometry(dep + 0.3, 0.5, wid + 0.3), stone, 0, H - 0.25, 0));   // thin limestone parapet/cornice
  // readable GALLAGHER WAY sign crowning the SOUTH face (+z local), over the top window band, facing the plaza
  const sgn = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 3.4), bmat(0xffffff, { map: gallagherSignTex() }));
  sgn.position.set(0, 12.2, wid / 2 + 0.06); g.add(sgn);
  g.updateMatrixWorld(true); atlasPlane(sgn, false);   // bake the GALLAGHER WAY crown into the shared atlas (detaches it from g)
  add(g);   // add() snapshots the group's remaining meshes NOW — must come after every g.add
  A.base.push({ pos: [cx, 0.4, zc], scale: [dep + 0.2, 0.8, wid + 0.2], color: 0x2c211d });   // dark base band (shares Cubby's bucket)
  // warm window GRID: three storeys on the SOUTH face (plaza) and WEST face (Clark), baked to world via yrot
  for (const y of [3.2, 6.4, 9.6]) {
    for (const lx of [-8, -4, 0, 4, 8]) {            // SOUTH face columns (local +z)
      const [dx, dz] = yrot(lx, wid / 2 + 0.06, clarkYaw);
      A.win.push({ pos: [cx + dx, y, zc + dz], yaw: clarkYaw, scale: [1.4, 1.9, 1] });
    }
    for (const lz of [-8, -4, 0, 4, 8]) {            // WEST face columns (local −x, toward Clark)
      const [dx, dz] = yrot(-dep / 2 - 0.06, lz, clarkYaw);
      A.win.push({ pos: [cx + dx, y, zc + dz], yaw: clarkYaw - Math.PI / 2, scale: [1.4, 1.9, 1] });
    }
  }
  collide(cx, zc, 11);
}

// =====================================================================
//  6. GALLAGHER WAY  (lawn, video board, splash pad, cornhole, planters)
// =====================================================================
function buildGallagher() {
  const G = GALLAGHER_W;
  add(paraStrip(G.off0 + 2, G.off1 - 2, G.z0 + 2, G.z1 - 2, 0.03, toon(0x57964f)));   // inset lawn
  // freestanding VIDEO BOARD at the plaza's NE north edge, east of the statue row, faces south (the plaza)
  { const bzc = -516, bx = clarkX(bzc) + 36.5;
    add(M(new THREE.BoxGeometry(0.5, 5.0, 0.5), toon(0x2a2d33), bx - 3, 3.2, bzc));
    add(M(new THREE.BoxGeometry(0.5, 5.0, 0.5), toon(0x2a2d33), bx + 3, 3.2, bzc));
    add(M(new THREE.BoxGeometry(7.2, 4.2, 0.5), toon(0x22242a), bx, 7.3, bzc));                 // frame
    atlasPlane(M(new THREE.PlaneGeometry(6.4, 3.5), bmat(0xffffff, { map: boardTex() }), bx, 7.3, bzc + 0.28), false);   // static (drawn once, never redrawn)
    collide(bx, bzc, 3.6); }
  // splash pad (off-centre so the plaza middle stays open, clear of the statue row)
  { const sz = -470, sx = clarkX(sz) + 20;
    add(M(new THREE.CylinderGeometry(2.6, 2.6, 0.06, 24), toon(0xb9b3a6), sx, 0.05, sz));
    add(M(new THREE.RingGeometry(1.0, 1.7, 24), bmat(0x7f9096), sx, 0.08, sz, -Math.PI / 2, 0, 0));   // wet ring
    const jets = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; jets.push({ pos: [sx + Math.cos(a) * 0.9, 0.28, sz + Math.sin(a) * 0.9], scale: [1, 0.9 + (i % 2) * 0.5, 1] }); }
    instMesh(new THREE.ConeGeometry(0.09, 0.5, 8), bmat(0xbfe6f5), jets); }
  // planter boxes along the Clark (west) edge
  { const pz = [], pf = [];
    for (let z = G.z0 + 5; z <= G.z1 - 5; z += 9) { const px = clarkX(z) + G.off0 + 1.2;
      pz.push({ pos: [px, 0.35, z], yaw: clarkYaw, scale: [2.4, 0.7, 1.0] });
      pf.push({ pos: [px, 0.85, z], yaw: clarkYaw, scale: [2.2, 0.5, 0.8] });
      collide(px, z, 1.1); }
    instMesh(new THREE.BoxGeometry(1, 1, 1), toon(0x6b4a30), pz);
    instMesh(new THREE.BoxGeometry(1, 1, 1), toon(0x3f7a44), pf); }
  // scattered lawn chairs (east edge) + a cornhole pair (south, clear of centre)
  for (const [oz, ooff] of [[-505, 33], [-498, 32], [-488, 34], [-476, 33]]) chairLike(clarkX(oz) + ooff, oz);
  cornhole(clarkX(-455) + 20, -455, clarkX(-463) + 20, -463);
}
function chairLike(x, z) {
  const c = rr(0, 1) > 0.5 ? 0x2f6bb0 : 0xc0392b, m = toon(c);
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rr(0, 6.28);
  g.add(M(new THREE.BoxGeometry(0.6, 0.08, 0.6), m, 0, 0.42, 0));       // seat
  g.add(M(new THREE.BoxGeometry(0.6, 0.6, 0.08), m, 0, 0.72, -0.28));   // back
  for (const sx of [-0.26, 0.26]) for (const sz of [-0.26, 0.26]) g.add(M(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 5), toon(0x888888), sx, 0.21, sz));
  add(g); collide(x, z, 0.5);
}
function cornhole(x0, z0, x1, z1) {
  for (const [x, z, tilt] of [[x0, z0, 0.35], [x1, z1, -0.35]]) {
    add(M(new THREE.BoxGeometry(0.6, 0.08, 1.2), toon(0x0e4c92), x, 0.3, z, tilt, 0, 0));
    add(M(new THREE.CircleGeometry(0.12, 16), toon(0xf2d24a), x, 0.31 + Math.sin(tilt) * 0.1, z + Math.cos(tilt) * 0.25, -Math.PI / 2 + tilt, 0, 0));
    collide(x, z, 0.6);
  }
}

// =====================================================================
//  7. STATUE ROW + HARRY CARAY  (limestone pedestals, bronze chibis)
// =====================================================================
const BRONZE = 0x8a6d3f;
function bronzeStatue(pose) {                          // uniform bronze -> the merge pool collapses all 5 to bronze + dark-eye
  const { group, parts } = createChibi({ suit: BRONZE, pants: BRONZE, skin: BRONZE, hair: BRONZE, shoe: BRONZE, cheek: BRONZE, scale: 1.1 });
  group.name = 'chibi-statue';                          // fully static pose — drop the live-rig 'chibi' name so any chibi-aware merge exemption (cells.js) treats it as bakeable static
  group.remove(parts.shadow);                          // no ground disc on a pedestal
  pose(parts, group);
  return group;
}
// pose helpers (rotations only; baked statically — NO animation registration)
const poses = {
  banks: p => { p.armL.rotation.set(0, 0, -2.5); p.armR.rotation.set(0, 0, 2.5); },          // both arms raised
  santo: p => { p.legR.rotation.set(-1.0, 0, 0.25); p.legL.rotation.set(0.2, 0, 0); p.armL.rotation.z = -0.9; p.armR.rotation.z = 0.9; }, // heel-click
  williams: (p, g) => { p.armR.rotation.set(-1.5, 0, 0.4);
    const bat = M(new THREE.BoxGeometry(0.09, 1.55, 0.09), toon(BRONZE), 0.42, 2.15, -0.05); bat.rotation.set(-0.35, 0, -0.5); g.add(bat); }, // bat on shoulder
  jenkins: p => { p.armR.rotation.set(2.4, 0, 0.25); p.armL.rotation.set(-0.9, 0, -0.25); p.legL.rotation.set(-0.5, 0, 0); }, // wind-up
  caray: (p, g) => { p.armR.rotation.set(-2.15, 0, 0.5);
    g.add(M(new THREE.BoxGeometry(0.1, 0.28, 0.1), toon(BRONZE), 0.5, 2.45, 0.4));            // mic body
    g.add(M(new THREE.SphereGeometry(0.11, 8, 7), toon(BRONZE), 0.5, 2.62, 0.42));            // mic head
    for (const s of [-1, 1]) g.add(M(new THREE.TorusGeometry(0.13, 0.03, 6, 14), toon(0x1d1712), s * 0.2, 2.28, 0.5)); }, // oversized glasses
};
function buildStatues() {
  const row = VILLAGE_W.statueRow;
  const defs = [
    { pose: 'banks', name: 'ERNIE BANKS', sub: '"LET\'S PLAY TWO"' },
    { pose: 'santo', name: 'RON SANTO', sub: '#10' },
    { pose: 'williams', name: 'BILLY WILLIAMS', sub: '#26' },
    { pose: 'jenkins', name: 'FERGIE JENKINS', sub: '#31' },
  ];
  row.xs.forEach((x, i) => placeStatue(x, row.z, 0, poses[defs[i].pose], defs[i].name, defs[i].sub));
  const cs = VILLAGE_W.carayStatue;
  placeStatue(cs.x, cs.z, cs.ry, poses.caray, 'HARRY CARAY', '"HOLY COW!"');
  instMesh(new THREE.BoxGeometry(1, 1, 1), toon(0xd8cdb4), A.ped);   // one limestone pedestal instance for all five
}
function placeStatue(x, z, ry, pose, name, sub) {
  const pedH = 1.5;
  A.ped.push({ pos: [x, pedH / 2, z], yaw: ry, scale: [1.5, pedH, 1.5] });
  const [px, pz] = yrot(0, 0.78, ry);                 // plaque on the front (+z local) face
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), bmat(0xffffff, { map: plaqueTex(name, sub) }));
  pl.position.set(x + px, 1.0, z + pz); pl.rotation.y = ry; atlasPlane(pl, false);
  const st = bronzeStatue(pose); st.position.set(x, pedH, z); st.rotation.y = ry; add(st);
  collide(x, z, 0.9, 3);
}

// =====================================================================
//  shared small builders + accumulator emit
// =====================================================================
// flat awning slab (+ valance ribs). yaw = facing of the slab's long edge.
function awning(x, y, z, yaw, dep, wid) {
  A.awn.push({ pos: [x, y, z], yaw, scale: [dep, 0.14, wid] });
  const n = Math.max(3, Math.round(wid / 0.8));
  for (let k = 0; k < n; k++) {
    const off = -wid / 2 + (k + 0.5) * wid / n;
    const [dx, dz] = yrot(dep / 2, off, yaw);
    A.rib.push({ pos: [x + dx, y - 0.22, z + dz], yaw, scale: [0.12, 0.42, wid / n * 0.55] });
  }
}
function rooftopPatio(cx, cz, w, d, H) {
  const posts = [], rails = [];
  const hw = w / 2 - 0.3, hd = d / 2 - 0.3, y = H + 0.02;
  for (let k = 0; k <= 6; k++) { const t = k / 6; posts.push({ pos: [cx - hw + 2 * hw * t, y + 0.5, cz - hd] }, { pos: [cx - hw + 2 * hw * t, y + 0.5, cz + hd] }); }
  for (let k = 0; k <= 4; k++) { const t = k / 4; posts.push({ pos: [cx - hw, y + 0.5, cz - hd + 2 * hd * t] }, { pos: [cx + hw, y + 0.5, cz - hd + 2 * hd * t] }); }
  instMesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 5), toon(0x3a3a40), posts);
  rails.push({ pos: [cx, y + 1.0, cz - hd], scale: [2 * hw, 0.07, 0.07] }, { pos: [cx, y + 1.0, cz + hd], scale: [2 * hw, 0.07, 0.07] });
  rails.push({ pos: [cx - hw, y + 1.0, cz], scale: [0.07, 0.07, 2 * hd] }, { pos: [cx + hw, y + 1.0, cz], scale: [0.07, 0.07, 2 * hd] });
  instMesh(new THREE.BoxGeometry(1, 1, 1), toon(0x3a3a40), rails);
  // market umbrellas (pole + canopy) — 3 across the patio
  const upos = [], ucan = [], ucol = [0xc0392b, 0x2f6bb0, 0xd9a441];
  for (let i = 0; i < 3; i++) { const ux = cx - w / 4 + i * w / 4; upos.push({ pos: [ux, y + 1.1, cz] }); ucan.push({ pos: [ux, y + 2.4, cz], color: ucol[i] }); }
  instMesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), toon(0x6b6b6b), upos);
  for (const c of ucol) instMesh(new THREE.ConeGeometry(1.1, 0.7, 10), toon(c), ucan.filter(u => u.color === c));
  // warm string lights (Points) along both long sides
  const pts = [], N = 26;
  for (let k = 0; k < N; k++) { const t = k / (N - 1), sag = Math.sin(t * Math.PI) * 0.5;
    pts.push([cx - hw + 2 * hw * t, y + 1.4 - sag, cz - hd + 0.3], [cx - hw + 2 * hw * t, y + 1.4 - sag, cz + hd - 0.3]); }
  const gp = new Float32Array(pts.length * 3), aC = new Float32Array(pts.length * 3), aS = new Float32Array(pts.length);
  pts.forEach((p, i) => { gp.set(p, i * 3); aC.set([1, 0.82, 0.5], i * 3); aS[i] = 2.4; });
  const bgm = new THREE.BufferGeometry();
  bgm.setAttribute('position', new THREE.BufferAttribute(gp, 3));
  bgm.setAttribute('aColor', new THREE.BufferAttribute(aC, 3));
  bgm.setAttribute('aSize', new THREE.BufferAttribute(aS, 1));
  add(new THREE.Points(bgm, pointsMat()));
}
function aBoard(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  for (const s of [-1, 1]) { const p = M(new THREE.BoxGeometry(0.9, 1.3, 0.05), shared().aBoardMat, 0, 0.72, s * 0.28); p.rotation.x = s * 0.16; g.add(p); }
  add(g); collide(x, z, 0.6);
}
function paraStrip(off0, off1, z0, z1, y, mat, step = 5) {   // sheared strip on clarkX (copied from index.js)
  const pos = [], idx = [];
  const n = Math.max(2, Math.ceil((z1 - z0) / step) + 1);
  for (let i = 0; i < n; i++) {
    const z = z0 + (z1 - z0) * i / (n - 1), c = clarkX(z);
    pos.push(c + off0, y, z, c + off1, y, z);
    if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k, k + 1, k - 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

export function buildVillage() {
  buildMurphys();
  buildCubby();
  buildBars();
  buildSluggersRoof();
  buildEngine();
  buildStands();
  buildGallagherOffice();
  buildGallagher();
  buildStatues();
  // ---- emit cross-building instanced batches (one draw call each) ----
  instMesh(new THREE.PlaneGeometry(1, 1), shared().winMat, A.win);
  instMesh(new THREE.BoxGeometry(1, 1, 1), toon(0x1f5136), A.awn);
  instMesh(new THREE.BoxGeometry(1, 1, 1), toon(0xeae0c8), A.rib);
  instMesh(new THREE.CylinderGeometry(0.05, 0.05, 2.0, 6), toon(0x9a9488), A.pole);
  instMesh(new THREE.PlaneGeometry(1.0, 0.68), shared().flagMat, A.flag);
  instColored(new THREE.BoxGeometry(1, 1, 1), A.base);
  emitStatic();   // merge every marked solid mesh into one draw call per material
  emitAtlas(ATLAS.opaque, false);   // all static opaque signs/plaques/boards -> ONE atlas mesh
  emitAtlas(ATLAS.alpha, true);     // transparent-textured planes (bunting swags, bear disc) -> ONE atlas mesh
}
