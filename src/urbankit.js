// =====================================================================
//  URBAN STREETSCAPE KIT (task 015) — the vocabulary for streets that
//  surround you. City-generic: no wrigley/ imports, no placement data,
//  no shared-rng consumption (callers pass every variation explicitly).
//
//  Instancing-first: builders only RECORD placements; kit.emit(parent)
//  collapses everything into ONE InstancedMesh per (part-geometry ×
//  color/texture) bucket, so a whole street row costs ~a few dozen draw
//  calls no matter how many assemblies are placed. r128: toon/basic
//  materials IGNORE InstancedMesh.setColorAt (PITFALLS.md) — per-color
//  buckets are the law here. All materials via toon()/bmat() so the
//  world-curve vertex shader is injected everywhere.
//
//  Assemblies (refs/streetscape/):
//   storefront()  recessed door + glazing + transom + optional striped awning
//   block() cornice() parapetSteps() windowGrid() downspout() fireEscape()
//   stoplight()   Chicago mast-arm signal (+ green street-name blade pair —
//                 back-to-back FrontSide planes per the mirrored-text pitfall)
//   meter() hydrant() mailbox() newsbox() bikeRack() streetTree() trashCan()
//   car()         chunky toon sedan / suv / hatch, per-color body buckets
//
//  Usage (a content pack or cell builder):
//    const kit = createUrbanKit();
//    kit.storefront({ x, z, yaw, w: 7, palette: { frame: 0x1f5136, awning: [0xb03a2e, 0xf2eee4] } });
//    ...
//    const stats = kit.emit({ parent: scene, collide });   // stats.drawCalls
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon, bmat } from './core.js';

const mergeGeos = arr => BufferGeometryUtils.mergeBufferGeometries(arr.map(g => g.index ? g.toNonIndexed() : g), false);

// ---- kit palette (Chicago dusk defaults; callers may override per call) ----
export const KIT = {
  dark: 0x1e2024,        // storefront bulkheads, door recesses, downspouts, car glass
  limestone: 0xe6ddc8,   // lintels, sills, cornices, coping
  ironblack: 0x26282e,   // stoplight/fire-escape/grate iron
  metal: 0x74797f,       // meters, bike racks (galvanized)
  acgray: 0x9aa0a6,      // window AC units
  hydrant: 0xc0392b,
  mailbox: 0x2b4a8b,
  trash: 0x2e4436,       // CDOT mesh-basket green
  trunk: 0x6b4a30,
  canopy: 0x4f8f46,
  signalRed: 0xff5348, signalGreen: 0x59d977, headlight: 0xfff2c0, taillight: 0xff5348,
};

// ------------------------- canvas textures ----------------------------
function cvTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'));
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
const hex = c => '#' + c.toString(16).padStart(6, '0');

function glazingTex() {                       // one big warm storefront pane
  return cvTex(128, 128, g => {
    g.fillStyle = '#15110d'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#ffd98a'; g.fillRect(8, 8, 112, 112);
    g.fillStyle = 'rgba(255,255,255,.35)';                       // glass sheen
    g.beginPath(); g.moveTo(20, 128); g.lineTo(70, 0); g.lineTo(94, 0); g.lineTo(44, 128); g.closePath(); g.fill();
    g.strokeStyle = '#15110d'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(64, 8); g.lineTo(64, 120); g.stroke();  // mullion
  });
}
function transomTex() {                       // band of little lites over door+glass
  return cvTex(256, 64, g => {
    g.fillStyle = '#15110d'; g.fillRect(0, 0, 256, 64);
    for (let i = 0; i < 6; i++) { g.fillStyle = '#f6c775'; g.fillRect(6 + i * 42, 8, 34, 48); }
  });
}
function doorTex() {                          // recessed shop door, warm window, brass pull
  return cvTex(64, 128, g => {
    g.fillStyle = '#231d17'; g.fillRect(0, 0, 64, 128);
    g.fillStyle = '#3a3129'; g.fillRect(5, 4, 54, 120);
    g.fillStyle = '#ffd98a'; g.fillRect(10, 9, 44, 66);          // big warm door light
    g.strokeStyle = '#3a3129'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(32, 9); g.lineTo(32, 75); g.stroke();
    g.fillStyle = '#c9a86a'; g.fillRect(49, 84, 5, 16);
    g.fillStyle = '#171310'; g.fillRect(5, 110, 54, 14);
  });
}
function sashTex() {                          // upper-storey warm sash window
  return cvTex(64, 96, g => {
    g.fillStyle = '#2a2320'; g.fillRect(0, 0, 64, 96);
    g.fillStyle = '#ffd98a'; g.fillRect(5, 5, 54, 86);
    g.strokeStyle = '#6b4f2e'; g.lineWidth = 5; g.strokeRect(5, 5, 54, 86);
    g.lineWidth = 4; g.beginPath(); g.moveTo(32, 5); g.lineTo(32, 91); g.moveTo(5, 48); g.lineTo(59, 48); g.stroke();
  });
}
function awningTex(a, b) {                    // fabric stripes + darker under-valance shadow line
  return cvTex(256, 128, g => {
    for (let i = 0; i < 8; i++) { g.fillStyle = hex(i % 2 ? b : a); g.fillRect(i * 32, 0, 32, 128); }
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 116, 256, 12);
  });
}
function newsWinTex() {                       // honor-box window: folded paper + headline
  return cvTex(64, 64, g => {
    g.fillStyle = '#101114'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#e8e4da'; g.fillRect(7, 9, 50, 46);
    g.fillStyle = '#26282e'; g.fillRect(11, 14, 42, 8);
    g.fillStyle = '#8a8578'; g.fillRect(11, 27, 30, 3); g.fillRect(11, 34, 38, 3); g.fillRect(11, 41, 26, 3);
  });
}
function uspsTex() {                          // white USPS eagle decal (drawn, not imported)
  return cvTex(64, 64, g => {
    g.fillStyle = '#f4f5f7'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#2b4a8b';
    g.beginPath(); g.moveTo(6, 20); g.lineTo(34, 20); g.lineTo(58, 32); g.lineTo(30, 32); g.closePath(); g.fill();
    g.beginPath(); g.arc(40, 24, 7, 0, 7); g.fill();               // eagle head
    g.fillRect(6, 24, 22, 8);
    g.fillStyle = '#b03a2e'; g.fillRect(6, 42, 52, 4);
    g.fillStyle = '#2b4a8b'; g.fillRect(6, 50, 52, 4);
  });
}
function nameplateTex(text) {                 // green street-name blade (both sides)
  return cvTex(256, 64, g => {
    g.fillStyle = '#146a3a'; g.fillRect(0, 0, 256, 64);
    g.strokeStyle = '#f4f7f0'; g.lineWidth = 4; g.strokeRect(4, 4, 248, 56);
    g.fillStyle = '#f7faf4'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = 34; g.font = `700 ${fs}px "Trebuchet MS",Arial,sans-serif`;
    while (g.measureText(text).width > 232 && fs > 14) { fs -= 2; g.font = `700 ${fs}px "Trebuchet MS",Arial,sans-serif`; }
    g.fillText(text, 128, 33);
  });
}

// =====================================================================
export function createUrbanKit() {
  // ---- buckets: key -> {geo, mat, items, name} --------------------------
  const buckets = new Map();
  const colliders = [];
  const texCache = new Map();                 // texture singletons per kit
  const T = (k, make) => { if (!texCache.has(k)) texCache.set(k, make()); return texCache.get(k); };

  // shared unit geometries (scaled per instance)
  const UBOX = new THREE.BoxGeometry(1, 1, 1);
  const UPLANE = new THREE.PlaneGeometry(1, 1);
  const geoCache = new Map();                 // archetype merges, built once
  const G = (k, make) => { if (!geoCache.has(k)) geoCache.set(k, make()); return geoCache.get(k); };

  function push(geoKey, geo, matKey, matMake, it) {
    const k = geoKey + '|' + matKey;
    if (!buckets.has(k)) buckets.set(k, { geo, mat: matMake(), items: [], name: 'urbankit/' + k });
    buckets.get(k).items.push(it);
  }
  // toon color box/plane/archetype; bmat plane (self-lit); textured planes
  const pushT = (geoKey, geo, color, it) => push(geoKey, geo, 't' + color, () => toon(color), it);
  const pushB = (geoKey, geo, color, it) => push(geoKey, geo, 'b' + color, () => bmat(color), it);
  const pushTex = (texKey, texMake, it, opts = {}) =>
    push('plane', UPLANE, 'x' + texKey, () => opts.fabric
      ? toon(0xffffff, { mat: { map: T(texKey, texMake) } })
      : bmat(0xffffff, { map: T(texKey, texMake) }), it);

  // local (lx,ly,lz) under assembly yaw -> world pos [x+dx, y+ly, z+dz]
  const at = (x, y, z, yaw, lx, ly, lz) =>
    [x + lx * Math.cos(yaw) + lz * Math.sin(yaw), y + ly, z - lx * Math.sin(yaw) + lz * Math.cos(yaw)];

  // =====================================================================
  //  1. STOREFRONT — bulkhead, glazing panels, recessed door, transom,
  //  fascia band, pilasters, optional striped awning. (x,z) = centre of
  //  the front face at ground; yaw = direction the front FACES; w = width.
  //  Awning width auto-clamps inside the face (plate-fits-face rule).
  //  HOST-WALL CONTRACT: the door recess digs 0.35 m BACKWARD, so the host
  //  massing face (block()) must sit >= 0.45 m behind this face plane —
  //  the storefront band is proud of the upper wall, like the real thing.
  // =====================================================================
  function storefront({ x, y = 0, z, yaw = 0, w = 7, palette = {} }) {
    const frame = palette.frame ?? 0x1f5136;
    const door = palette.door ?? 'center';                      // 'left'|'center'|'right'
    const DW = 1.15, PIL = 0.22;                                // door width, pilaster width
    const dc = door === 'left' ? -w / 2 + PIL + DW / 2 + 0.1 : door === 'right' ? w / 2 - PIL - DW / 2 - 0.1 : 0;
    const P = (lx, ly, lz, sx, sy, c, sz = 0.18) =>             // frame/dark boxes on the face
      pushT('box', UBOX, c, { pos: at(x, y, z, yaw, lx, ly, lz), yaw, scale: [sx, sy, sz] });
    // bulkhead + fascia + end pilasters + door jambs (frame color).
    // End pilasters + fascia run DEEP (0.72) to seal the reveal back to the
    // host wall; the recess jambs reach past the door plane (-0.32).
    P(0, 0.275, 0.02, w, 0.55, KIT.dark);                                        // bulkhead kick
    P(0, 3.42, -0.16, w, 0.62, frame, 0.72);                                     // fascia/sign band
    for (const sx of [-1, 1]) P(sx * (w - PIL) / 2, 1.71, -0.16, PIL, 3.42, frame, 0.72);
    for (const sx of [-1, 1]) P(dc + sx * (DW / 2 + 0.08), 1.4, -0.2, 0.16, 2.8, frame, 0.5);   // recess jambs
    P(dc, 2.87, -0.2, DW + 0.48, 0.35, frame, 0.5);                              // recess head
    // recessed door (textured plane set back into the wall)
    pushTex('door', doorTex, { pos: at(x, y, z, yaw, dc, 1.31, -0.32), yaw, scale: [DW, 2.62, 1] });
    // glazing panels: fill left/right of the door recess
    const seg = [[-w / 2 + PIL, dc - DW / 2 - 0.16], [dc + DW / 2 + 0.16, w / 2 - PIL]];
    for (const [a, b] of seg) {
      const gw = b - a; if (gw < 0.7) continue;
      pushTex('glz', glazingTex, { pos: at(x, y, z, yaw, (a + b) / 2, 1.55, 0.03), yaw, scale: [gw, 2.0, 1] });
    }
    // transom band across everything (over door + glass)
    pushTex('trn', transomTex, { pos: at(x, y, z, yaw, 0, 2.83, 0.03), yaw, scale: [w - 2 * PIL, 0.52, 1] });
    // awning: sloped stripe plane + straight valance, clamped inside the face
    if (palette.awning) {
      const [ca, cb] = palette.awning, key = 'awn' + ca + '_' + cb;
      const aw = Math.min(w - 2 * PIL - 0.2, palette.awningW ?? (w - 2 * PIL - 0.2));
      const out = 1.15, top = 2.62, drop = 0.5;                 // projection + slope drop
      const slope = Math.atan2(drop, out), len = Math.hypot(out, drop);
      pushTex(key, () => awningTex(ca, cb), {
        pos: at(x, y, z, yaw, 0, top - drop / 2, 0.06 + out / 2),
        yaw, rx: -(Math.PI / 2 - slope), scale: [aw, len, 1],
      }, { fabric: true });
      pushTex(key, () => awningTex(ca, cb), {                   // hanging valance at the outer edge
        pos: at(x, y, z, yaw, 0, top - drop - 0.14, 0.06 + out),
        yaw, scale: [aw, 0.3, 1],
      }, { fabric: true });
    }
    colliders.push({ x, z, r: Math.min(2.4, w * 0.35) });
    return { h: 3.73 };                                         // storefront band top (dress above this)
  }

  // =====================================================================
  //  2. FACADE DRESSING
  // =====================================================================
  // plain massing box (host wall) — centre (x,z), yaw, w across, d deep, h tall
  function block({ x, y = 0, z, yaw = 0, w, d, h, color = 0xc2a370, coping = false }) {
    pushT('box', UBOX, color, { pos: [x, y + h / 2, z], yaw, scale: [w, h, d] });
    if (coping) pushT('box', UBOX, KIT.limestone, { pos: [x, y + h - 0.06, z], yaw, scale: [w + 0.22, 0.22, d + 0.22] });
    colliders.push({ x, z, r: Math.max(w, d) / 2 + 0.3 });
  }
  // cornice cap along a face: (x,z) face centre at roofline y=h, w across
  function cornice({ x, z, yaw = 0, w, h, color = KIT.limestone }) {
    pushT('box', UBOX, color, { pos: at(x, 0, z, yaw, 0, h - 0.14, 0.3), yaw, scale: [w + 0.3, 0.3, 0.5] });
    pushT('box', UBOX, color, { pos: at(x, 0, z, yaw, 0, h - 0.42, 0.16), yaw, scale: [w + 0.1, 0.26, 0.24] });
    const n = Math.max(2, Math.round(w / 1.3));                 // brackets
    for (let i = 0; i <= n; i++)
      pushT('box', UBOX, color, { pos: at(x, 0, z, yaw, -w / 2 + 0.3 + (w - 0.6) * i / n, h - 0.62, 0.2), yaw, scale: [0.16, 0.3, 0.3] });
  }
  function parapetSteps({ x, z, yaw = 0, w, h, color = 0xc2a370 }) {
    for (const [sw, sh] of [[w * 0.62, 0.35], [w * 0.34, 0.7]])
      pushT('box', UBOX, color, { pos: at(x, 0, z, yaw, 0, h + sh / 2 - 0.02, -0.1), yaw, scale: [sw, sh, 0.5] });
  }
  // window grid on a face: cols×rows sash windows w/ limestone lintel+sill.
  // acAt: [col,row] pairs that get an AC unit hanging out of the window.
  function windowGrid({ x, z, yaw = 0, cols = 3, rows = 2, dx = 2.2, y0 = 5.0, dy = 2.8, acAt = [] }) {
    const ox = -(cols - 1) * dx / 2;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const lx = ox + c * dx, ly = y0 + r * dy;
      pushTex('sash', sashTex, { pos: at(x, 0, z, yaw, lx, ly, 0.03), yaw, scale: [1.1, 1.65, 1] });
      pushT('box', UBOX, KIT.limestone, { pos: at(x, 0, z, yaw, lx, ly + 0.95, 0.05), yaw, scale: [1.34, 0.17, 0.12] });   // lintel
      pushT('box', UBOX, KIT.limestone, { pos: at(x, 0, z, yaw, lx, ly - 0.9, 0.08), yaw, scale: [1.26, 0.1, 0.2] });      // sill
      if (acAt.some(p => p[0] === c && p[1] === r))
        pushT('box', UBOX, KIT.acgray, { pos: at(x, 0, z, yaw, lx, ly - 0.52, 0.26), yaw, scale: [0.72, 0.55, 0.5] });
    }
  }
  function downspout({ x, z, yaw = 0, h = 8, color = KIT.dark }) {
    pushT('box', UBOX, color, { pos: at(x, 0, z, yaw, 0, h / 2, 0.1), yaw, scale: [0.15, h, 0.15] });
    pushT('box', UBOX, color, { pos: at(x, 0, z, yaw, 0, 0.12, 0.32), yaw, scale: [0.15, 0.14, 0.5] });   // elbow kick
  }
  // two-level iron fire escape (platforms + rails + stair + drop ladder).
  // (x,z) = wall face point, yaw = face normal; spans ~2.9 m across.
  function fireEscape({ x, z, yaw = 0, y0 = 3.15, dy = 2.8 }) {
    const geo = G('fesc', () => {
      const parts = [], B = (sx, sy, sz, px, py, pz, rz) => {
        const g = new THREE.BoxGeometry(sx, sy, sz); if (rz) g.rotateZ(rz); g.translate(px, py, pz); parts.push(g);
      };
      for (const lv of [0, 1]) {
        const py = lv * dy;
        B(2.9, 0.07, 1.0, 0, py, 0.5);                                            // platform
        B(2.9, 0.05, 0.05, 0, py + 0.78, 0.98);                                   // outer rail
        for (let i = 0; i < 6; i++) B(0.04, 0.78, 0.04, -1.35 + i * 0.54, py + 0.39, 0.98);
        for (const sx of [-1, 1]) {                                               // side rails
          B(0.05, 0.05, 0.95, sx * 1.43, py + 0.78, 0.5);
          B(0.04, 0.78, 0.04, sx * 1.43, py + 0.39, 0.9);
        }
      }
      B(0.08, Math.hypot(dy, 1.7) + 0.2, 0.08, -0.62, dy / 2, 0.5, Math.atan2(1.7, dy));  // stair stringers
      B(0.08, Math.hypot(dy, 1.7) + 0.2, 0.08, 0.02, dy / 2, 0.5, Math.atan2(1.7, dy));
      for (let i = 1; i < 7; i++) B(0.62, 0.05, 0.16, -0.3 - 0.85 + i * 0.243, i * dy / 7, 0.5); // treads
      for (const sx of [0.9, 1.24]) B(0.05, 2.3, 0.05, sx, -1.05, 0.35);          // drop ladder rails
      for (let i = 0; i < 5; i++) B(0.34, 0.05, 0.05, 1.07, -2.05 + i * 0.44, 0.35);
      return mergeGeos(parts);
    });
    push('fesc', geo, 't' + KIT.ironblack, () => toon(KIT.ironblack), { pos: at(x, y0, z, yaw, 0, 0, 0.06), yaw });
  }

  // =====================================================================
  //  3. STREET FURNITURE
  // =====================================================================
  // Chicago mast-arm stoplight. (x,z) pole base; arm extends local +x;
  // signal heads FACE local +z (toward approaching traffic).
  // state: which lamp glows ('red'|'green'|'amber'). name: street blade text.
  function stoplight({ x, y = 0, z, yaw = 0, arm = 4.6, state = 'red', name = null }) {
    const geo = G('stopl' + arm, () => {
      const parts = [];
      const pole = new THREE.CylinderGeometry(0.085, 0.115, 5.2, 8); pole.translate(0, 2.6, 0); parts.push(pole);
      const mast = new THREE.CylinderGeometry(0.055, 0.075, arm, 7); mast.rotateZ(Math.PI / 2); mast.translate(arm / 2, 4.82, 0); parts.push(mast);
      const brace = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 5); brace.rotateZ(Math.PI / 4); brace.translate(0.53, 4.35, 0); parts.push(brace);
      const head = (px, py) => {
        const h = new THREE.BoxGeometry(0.36, 1.02, 0.26); h.translate(px, py, 0); parts.push(h);
        for (let i = -1; i <= 1; i++) { const v = new THREE.BoxGeometry(0.3, 0.05, 0.2); v.translate(px, py + 0.31 * i + 0.15, 0.12); parts.push(v); }
      };
      head(arm - 0.35, 4.1);                                    // hung at the arm tip
      head(0.24, 3.4);                                          // pole-mounted near side
      return mergeGeos(parts);
    });
    push('stopl' + arm, geo, 't' + KIT.ironblack, () => toon(KIT.ironblack), { pos: [x, y, z], yaw });
    // the ONE lit lamp per head (toon-chunky: black face + a glowing disc)
    const lampY = state === 'red' ? 0.31 : state === 'amber' ? 0 : -0.31;
    const col = state === 'red' ? KIT.signalRed : state === 'amber' ? 0xffc84a : KIT.signalGreen;
    for (const [px, py] of [[arm - 0.35, 4.1], [0.24, 3.4]])
      pushB('plane', UPLANE, col, { pos: at(x, y, z, yaw, px, py + lampY, 0.135), yaw, scale: [0.21, 0.21, 1] });
    if (name) {                                                 // green blade under the arm, mid-span, both sides
      const key = 'plate:' + name, pw = Math.min(1.9, arm - 1.6), ph = pw * 64 / 256;
      for (const s of [1, -1])
        pushTex(key, () => nameplateTex(name), {
          pos: at(x, y, z, yaw, arm * 0.48, 4.7 - ph / 2, 0.028 * s),
          yaw: yaw + (s === 1 ? 0 : Math.PI), scale: [pw, ph, 1],
        });
    }
    colliders.push({ x, z, r: 0.4 });
  }
  function meter({ x, y = 0, z, yaw = 0 }) {
    const geo = G('meter', () => {
      const pole = new THREE.CylinderGeometry(0.03, 0.035, 1.1, 6); pole.translate(0, 0.55, 0);
      const head = new THREE.BoxGeometry(0.24, 0.32, 0.11); head.translate(0, 1.24, 0);
      const dome = new THREE.SphereGeometry(0.12, 8, 6); dome.scale(1, 0.75, 0.46); dome.translate(0, 1.4, 0);
      return mergeGeos([pole, head, dome]);
    });
    push('meter', geo, 't' + KIT.metal, () => toon(KIT.metal), { pos: [x, y, z], yaw });
    colliders.push({ x, z, r: 0.25 });
  }
  function hydrant({ x, y = 0, z, yaw = 0 }) {
    const geo = G('hyd', () => {
      const parts = [];
      const base = new THREE.CylinderGeometry(0.2, 0.23, 0.1, 8); base.translate(0, 0.05, 0); parts.push(base);
      const barrel = new THREE.CylinderGeometry(0.155, 0.175, 0.52, 8); barrel.translate(0, 0.36, 0); parts.push(barrel);
      const flange = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 8); flange.translate(0, 0.64, 0); parts.push(flange);
      const dome = new THREE.SphereGeometry(0.16, 8, 7); dome.scale(1, 0.85, 1); dome.translate(0, 0.72, 0); parts.push(dome);
      const nut = new THREE.CylinderGeometry(0.05, 0.06, 0.09, 6); nut.translate(0, 0.87, 0); parts.push(nut);
      for (const s of [-1, 1]) { const c = new THREE.CylinderGeometry(0.055, 0.065, 0.16, 6); c.rotateZ(Math.PI / 2); c.translate(s * 0.19, 0.42, 0); parts.push(c); }
      const f = new THREE.CylinderGeometry(0.06, 0.07, 0.16, 6); f.rotateX(Math.PI / 2); f.translate(0, 0.38, 0.19); parts.push(f);
      return mergeGeos(parts);
    });
    push('hyd', geo, 't' + KIT.hydrant, () => toon(KIT.hydrant), { pos: [x, y, z], yaw });
    colliders.push({ x, z, r: 0.35 });
  }
  function mailbox({ x, y = 0, z, yaw = 0 }) {
    const geo = G('mail', () => {
      const parts = [];
      const body = new THREE.BoxGeometry(0.62, 0.7, 0.6); body.translate(0, 0.78, 0); parts.push(body);
      const top = new THREE.CylinderGeometry(0.3, 0.3, 0.62, 10, 1, false, 0, Math.PI); top.rotateZ(Math.PI / 2); top.translate(0, 1.13, 0); parts.push(top);
      const hood = new THREE.BoxGeometry(0.5, 0.1, 0.08); hood.translate(0, 0.98, 0.32); parts.push(hood);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = new THREE.BoxGeometry(0.07, 0.44, 0.07); leg.translate(sx * 0.24, 0.22, sz * 0.23); parts.push(leg); }
      return mergeGeos(parts);
    });
    push('mail', geo, 't' + KIT.mailbox, () => toon(KIT.mailbox), { pos: [x, y, z], yaw });
    pushTex('usps', uspsTex, { pos: at(x, y, z, yaw, 0, 0.8, 0.315), yaw, scale: [0.3, 0.3, 1] });
    colliders.push({ x, z, r: 0.45 });
  }
  function newsbox({ x, y = 0, z, yaw = 0, color = 0xb03a2e }) {
    const geo = G('news', () => {
      const body = new THREE.BoxGeometry(0.46, 0.72, 0.42); body.translate(0, 0.56, 0);
      const coin = new THREE.BoxGeometry(0.2, 0.1, 0.3); coin.translate(0.1, 0.97, 0);
      const legs = [];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = new THREE.BoxGeometry(0.06, 0.22, 0.06); l.translate(sx * 0.17, 0.11, sz * 0.15); legs.push(l); }
      return mergeGeos([body, coin, ...legs]);
    });
    pushT('news', geo, color, { pos: [x, y, z], yaw });
    pushTex('newswin', newsWinTex, { pos: at(x, y, z, yaw, 0, 0.68, 0.215), yaw, scale: [0.34, 0.36, 1] });
    colliders.push({ x, z, r: 0.35 });
  }
  function bikeRack({ x, y = 0, z, yaw = 0 }) {
    const geo = G('rack', () => {
      const parts = [];
      for (const s of [-1, 1]) { const leg = new THREE.CylinderGeometry(0.035, 0.035, 0.72, 7); leg.translate(s * 0.38, 0.36, 0); parts.push(leg); }
      const top = new THREE.CylinderGeometry(0.035, 0.035, 0.76, 7); top.rotateZ(Math.PI / 2); top.translate(0, 0.73, 0); parts.push(top);
      for (const s of [-1, 1]) { const k = new THREE.SphereGeometry(0.045, 6, 5); k.translate(s * 0.38, 0.72, 0); parts.push(k); }
      return mergeGeos(parts);
    });
    push('rack', geo, 't' + KIT.metal, () => toon(KIT.metal), { pos: [x, y, z], yaw });
    colliders.push({ x, z, r: 0.45 });
  }
  // parkway tree in a cast-iron grate (square plate + trunk + lobed canopy)
  function streetTree({ x, y = 0, z, s = 1, yaw = 0 }) {
    const geo = G('grate', () => {
      const plate = new THREE.BoxGeometry(1.5, 0.06, 1.5);
      const ring = new THREE.CylinderGeometry(0.22, 0.22, 0.1, 8); ring.translate(0, 0.01, 0);
      return mergeGeos([plate, ring]);
    });
    push('grate', geo, 't' + KIT.ironblack, () => toon(KIT.ironblack), { pos: [x, y + 0.03, z], yaw });
    pushT('cyl', G('cyl', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 7)), KIT.trunk,
      { pos: [x, y + 1.3 * s, z], yaw, scale: [0.2 * s, 2.6 * s, 0.2 * s] });
    const lobes = G('lobes', () => {
      const parts = [];
      for (const [lx, ly, lz, r] of [[0, 0, 0, 0.95], [0.55, -0.25, 0.25, 0.62], [-0.5, -0.2, -0.3, 0.58], [0.1, 0.55, -0.15, 0.6]]) {
        const g = new THREE.SphereGeometry(r, 8, 6); g.translate(lx, ly, lz); parts.push(g);
      }
      return mergeGeos(parts);
    });
    push('lobes', lobes, 't' + KIT.canopy, () => toon(KIT.canopy), { pos: [x, y + 3.15 * s, z], yaw, scale: [s, s, s] });
    colliders.push({ x, z, r: 0.4 });
  }
  function trashCan({ x, y = 0, z, yaw = 0 }) {
    const geo = G('trash', () => {
      const body = new THREE.CylinderGeometry(0.34, 0.28, 0.86, 9); body.translate(0, 0.43, 0);
      const rim = new THREE.CylinderGeometry(0.37, 0.37, 0.09, 9); rim.translate(0, 0.9, 0);
      const lid = new THREE.SphereGeometry(0.34, 9, 5); lid.scale(1, 0.5, 1); lid.translate(0, 0.94, 0);
      return mergeGeos([body, rim, lid]);
    });
    push('trash', geo, 't' + KIT.trash, () => toon(KIT.trash), { pos: [x, y, z], yaw });
    colliders.push({ x, z, r: 0.4 });
  }

  // =====================================================================
  //  4. PARKED CARS — chunky toon archetypes; body per-color buckets,
  //  glass shares the kit dark bucket, one wheel bucket across all types.
  // =====================================================================
  const CAR = {   // [bodyL, bodyH, bodyW, cabinL, cabinH, cabinW, cabinOff, wheelbase]
    sedan: { L: 4.5, BH: 0.62, W: 1.78, CL: 2.25, CH: 0.55, CW: 1.6, CO: -0.15, WB: 2.7 },
    suv: { L: 4.65, BH: 0.8, W: 1.88, CL: 2.95, CH: 0.62, CW: 1.7, CO: -0.25, WB: 2.85 },
    hatch: { L: 3.85, BH: 0.58, W: 1.7, CL: 2.3, CH: 0.55, CW: 1.55, CO: -0.5, WB: 2.45 },
  };
  function car({ x, y = 0, z, yaw = 0, type = 'sedan', color = 0xb03a2e }) {
    const c = CAR[type] || CAR.sedan;
    const geo = G('car:' + type, () => {
      const body = new THREE.BoxGeometry(c.L, c.BH, c.W); body.translate(0, 0.36 + c.BH / 2, 0);
      // roof cap OVERHANGS the glass box so the greenhouse's dark top face
      // never shows from above (owner-view angle is high)
      const roof = new THREE.BoxGeometry(c.CL + 0.06, 0.12, c.CW + 0.06); roof.translate(c.CO, 0.36 + c.BH + c.CH + 0.02, 0);
      const bf = new THREE.BoxGeometry(0.16, 0.22, c.W + 0.06); bf.translate(c.L / 2 - 0.04, 0.5, 0);
      const bb = new THREE.BoxGeometry(0.16, 0.22, c.W + 0.06); bb.translate(-c.L / 2 + 0.04, 0.5, 0);
      const mirrors = [];
      for (const s of [-1, 1]) { const m = new THREE.BoxGeometry(0.1, 0.1, 0.16); m.translate(c.CO + c.CL / 2 - 0.1, 0.42 + c.BH + 0.28, s * (c.W / 2 + 0.06)); mirrors.push(m); }
      return mergeGeos([body, roof, bf, bb, ...mirrors]);
    });
    pushT('car:' + type, geo, color, { pos: [x, y, z], yaw });
    // greenhouse (kit-dark shared bucket) + wheels (one bucket for all cars)
    pushT('box', UBOX, KIT.dark, { pos: at(x, y, z, yaw, c.CO, 0.36 + c.BH + c.CH / 2, 0), yaw, scale: [c.CL, c.CH, c.CW] });
    const wheel = G('wheel', () => { const w = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 9); w.rotateX(Math.PI / 2); return w; });
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      push('wheel', wheel, 't' + 0x17181c, () => toon(0x17181c), { pos: at(x, y, z, yaw, sx * c.WB / 2, 0.34, sz * (c.W / 2 - 0.08)), yaw });
    for (const s of [-1, 1]) {   // lights as facing planes flush on the body ends, above the bumper line;
      // warm front; rear SHARES the signal-red bucket
      pushB('plane', UPLANE, KIT.headlight, { pos: at(x, y, z, yaw, c.L / 2 + 0.015, 0.68, s * (c.W / 2 - 0.28)), yaw: yaw + Math.PI / 2, scale: [0.3, 0.14, 1] });
      pushB('plane', UPLANE, KIT.taillight, { pos: at(x, y, z, yaw, -c.L / 2 - 0.015, 0.68, s * (c.W / 2 - 0.24)), yaw: yaw - Math.PI / 2, scale: [0.26, 0.12, 1] });
    }
    colliders.push({ x, z, r: Math.max(c.L, c.W) / 2 + 0.2 });
  }

  // =====================================================================
  //  emit — collapse every bucket to ONE InstancedMesh, add to parent.
  // =====================================================================
  function emit({ parent, collide = null } = {}) {
    const Mx = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
    let instances = 0; const names = [];
    for (const b of buckets.values()) {
      const m = new THREE.InstancedMesh(b.geo, b.mat, b.items.length);
      b.items.forEach((it, i) => {
        // YXZ: rx tilts in the ASSEMBLY frame (awning slopes), then yaw turns it
        E.set(it.rx || 0, it.yaw || 0, it.rz || 0, 'YXZ'); Q.setFromEuler(E);
        V.set(it.pos[0], it.pos[1], it.pos[2]);
        S.set(it.scale ? it.scale[0] : 1, it.scale ? it.scale[1] : 1, it.scale ? it.scale[2] : 1);
        Mx.compose(V, Q, S); m.setMatrixAt(i, Mx);
      });
      m.instanceMatrix.needsUpdate = true;
      m.name = b.name; parent.add(m);
      instances += b.items.length; names.push(b.name + ' ×' + b.items.length);
    }
    if (collide) for (const c of colliders) collide(c.x, c.z, c.r);
    return { drawCalls: buckets.size, instances, buckets: names };
  }

  return {
    storefront, block, cornice, parapetSteps, windowGrid, downspout, fireEscape,
    stoplight, meter, hydrant, mailbox, newsbox, bikeRack, streetTree, trashCan,
    car, emit,
  };
}
