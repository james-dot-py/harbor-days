// WRIGLEY FIELD — the hero. Facade ring on STADIUM_W.poly, marquee
// (canvas, live message line), interior bowl (field/ivy/grandstand/
// bleachers/crowd), hand-turned scoreboard + pennant masts + W flag,
// six light towers, gates, ticket booths, the Sheffield knothole.
// Postcard Wrigley: no video boards. Fable-owned. wrand-free: local R.
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon, bmat, mulberry32, pointsMat, pip } from '../core.js';
import { collide } from '../props.js';
import { wrigleyRoot } from './index.js';
import { STADIUM_W, CORNER_ARC } from '../data/wrigleyville.js';
import { atlasPlane } from './village.js';   // shared static-plane atlas (buildVillage emits it, last)

const R = mulberry32(1914);
const rr = (a, b) => a + (b - a) * R();
const mergeGeos = arr => BufferGeometryUtils.mergeBufferGeometries(arr.map(g => g.index ? g.toNonIndexed() : g), false);

// palette (dusk-warm, muted)
const PALE = 0xd9d2c4;      // painted upper facade
const BRICK = 0x8a4a3a;     // red brick
const GREEN = 0x1e4d38;     // scoreboard / grille forest green
const DARKROOF = 0x3c4038;
const TERRA = 0xb8593e;     // terracotta

const S = STADIUM_W, POLY = S.poly;
const HP = S.homePlate, CF = S.centerField;
const AXIS = Math.atan2(CF[0] - HP[0], CF[1] - HP[1]);   // HP → CF yaw
const BACK = AXIS - Math.PI;                             // behind home plate

// point-in-stadium with an inward inset toward home plate
function insidePoly(x, z, inset = 0) {
  if (!inset) return pip(x, z, POLY);
  const dx = HP[0] - x, dz = HP[1] - z, d = Math.hypot(dx, dz) || 1;
  return pip(x + dx / d * inset, z + dz / d * inset, POLY);
}

function inst(geo, mat, items) {
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), Sc = new THREE.Vector3();
  items.forEach((it, i) => {
    E.set(it.rx || 0, it.yaw || 0, 0); Q.setFromEuler(E);
    V.set(it.pos[0], it.pos[1], it.pos[2]);
    Sc.set(it.scale ? it.scale[0] : 1, it.scale ? it.scale[1] : 1, it.scale ? it.scale[2] : 1);
    M.compose(V, Q, Sc); m.setMatrixAt(i, M);
  });
  m.instanceMatrix.needsUpdate = true;
  wrigleyRoot.add(m); return m;
}

// ---------------------------- canvases ---------------------------------
let marqueeCtx = null, marqueeTex = null;

// The real Wrigley marquee: a cambered (arched) crown carrying WRIGLEY FIELD
// set ALONG the arc, art-deco stepped scroll shoulders, a rectangular body with
// HOME OF / CHICAGO CUBS, a cream pinstripe frame (doubled along the bottom),
// and a black dot-matrix message board. Canvas is 1024x512.
//
// ONE outline drives both the drawn red face and the extruded backing, so the
// dark-red body never pokes past the arched crown. Outline in canvas px; pad>0
// gives the inset pinstripe path.
const MQW = 1024, MQH = 512;
function mqOutline(pad) {
  const L = 44 + pad, R = 980 - pad, Bot = 498 - pad;
  const m1 = 88 + pad, sL = 140 + pad, sR = 884 - pad, mr1 = 936 - pad;   // stepped art-deco shoulders
  const y1 = 214 - pad * 0.3, y2 = 182 + pad * 0.3, springY = 150 + pad, apexY = 28 + pad, cx = 512;
  const a = sL - cx;                                    // circular camber through the two springs + apex
  const cy = (a * a + springY * springY - apexY * apexY) / (2 * (springY - apexY));
  const r = cy - apexY;
  const p = [[L, Bot], [L, y1], [m1, y1], [m1, y2], [sL, y2], [sL, springY]];
  const N = 22;
  for (let i = 1; i < N; i++) { const x = sL + (sR - sL) * i / N; p.push([x, cy - Math.sqrt(Math.max(0, r * r - (x - cx) * (x - cx)))]); }
  p.push([sR, springY], [sR, y2], [mr1, y2], [mr1, y1], [R, y1], [R, Bot]);
  return p;
}
const MQ_OUT = mqOutline(0), MQ_IN = mqOutline(17);
// canvas px -> group-local metres (face plane 7.6 x 3.8, centred at y 6.4, facing +z)
const mqMX = px => (px / MQW - 0.5) * 7.6;
const mqMY = py => 8.3 - (py / MQH) * 3.8;

// 5x7 dot-matrix font — covers every glyph the live gameday messages use
const DFONT = {
  ' ': ['     ', '     ', '     ', '     ', '     ', '     ', '     '],
  A: [' ### ', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
  B: ['#### ', '#   #', '#   #', '#### ', '#   #', '#   #', '#### '],
  C: [' ####', '#    ', '#    ', '#    ', '#    ', '#    ', ' ####'],
  D: ['#### ', '#   #', '#   #', '#   #', '#   #', '#   #', '#### '],
  E: ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#####'],
  F: ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#    '],
  G: [' ####', '#    ', '#    ', '#  ##', '#   #', '#   #', ' ####'],
  H: ['#   #', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
  I: ['#####', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '#####'],
  J: ['  ###', '   # ', '   # ', '   # ', '#  # ', '#  # ', ' ##  '],
  K: ['#   #', '#  # ', '# #  ', '##   ', '# #  ', '#  # ', '#   #'],
  L: ['#    ', '#    ', '#    ', '#    ', '#    ', '#    ', '#####'],
  M: ['#   #', '## ##', '# # #', '# # #', '#   #', '#   #', '#   #'],
  N: ['#   #', '##  #', '# # #', '# # #', '#  ##', '#   #', '#   #'],
  O: [' ### ', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
  P: ['#### ', '#   #', '#   #', '#### ', '#    ', '#    ', '#    '],
  Q: [' ### ', '#   #', '#   #', '#   #', '# # #', '#  # ', ' ## #'],
  R: ['#### ', '#   #', '#   #', '#### ', '# #  ', '#  # ', '#   #'],
  S: [' ####', '#    ', '#    ', ' ### ', '    #', '    #', '#### '],
  T: ['#####', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  '],
  U: ['#   #', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
  V: ['#   #', '#   #', '#   #', '#   #', '#   #', ' # # ', '  #  '],
  W: ['#   #', '#   #', '#   #', '# # #', '# # #', '## ##', '#   #'],
  X: ['#   #', '#   #', ' # # ', '  #  ', ' # # ', '#   #', '#   #'],
  Y: ['#   #', '#   #', ' # # ', '  #  ', '  #  ', '  #  ', '  #  '],
  Z: ['#####', '    #', '   # ', '  #  ', ' #   ', '#    ', '#####'],
  0: [' ### ', '#   #', '#  ##', '# # #', '##  #', '#   #', ' ### '],
  1: ['  #  ', ' ##  ', '  #  ', '  #  ', '  #  ', '  #  ', ' ### '],
  2: [' ### ', '#   #', '    #', '   # ', '  #  ', ' #   ', '#####'],
  3: ['#####', '   # ', '  #  ', '   # ', '    #', '#   #', ' ### '],
  4: ['   # ', '  ## ', ' # # ', '#  # ', '#####', '   # ', '   # '],
  5: ['#####', '#    ', '#### ', '    #', '    #', '#   #', ' ### '],
  6: [' ### ', '#    ', '#    ', '#### ', '#   #', '#   #', ' ### '],
  7: ['#####', '    #', '   # ', '  #  ', ' #   ', ' #   ', ' #   '],
  8: [' ### ', '#   #', '#   #', ' ### ', '#   #', '#   #', ' ### '],
  9: [' ### ', '#   #', '#   #', ' ####', '    #', '    #', ' ### '],
  '!': ['  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '     ', '  #  '],
  '·': ['     ', '     ', '  #  ', ' ### ', '  #  ', '     ', '     '],
  '.': ['     ', '     ', '     ', '     ', '     ', ' ##  ', ' ##  '],
  '-': ['     ', '     ', '     ', '#####', '     ', '     ', '     '],
  "'": ['  #  ', '  #  ', '  #  ', '     ', '     ', '     ', '     '],
  '&': [' ##  ', '#  # ', '#  # ', ' ##  ', '#  # ', '#  # ', ' ## #'],
};

function mqPath(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }

// art-deco spiral volute nestled in the stepped shoulder (dir = -1 mirrors)
function mqScroll(g, x, y, dir) {
  g.save(); g.translate(x, y); g.scale(dir, 1);
  g.strokeStyle = '#f4efe2'; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  for (let i = 0; i <= 60; i++) { const t = i / 60, ang = t * 8.8, rad = 21 * (1 - 0.72 * t), px = Math.cos(ang) * rad, py = Math.sin(ang) * rad; if (i === 0) g.moveTo(px, py); else g.lineTo(px, py); }
  g.stroke();
  g.beginPath(); g.arc(0, 0, 3.4, 0, 6.2832); g.fillStyle = '#f4efe2'; g.fill();   // volute eye
  g.restore();
}

// WRIGLEY FIELD set along the camber — per-glyph translate+rotate on the arc
function mqArchText(g, text) {
  const cx = 512, Rt = 560, cyT = Rt + 96;             // circle centre below the crown
  let fs = 76; g.font = `800 ${fs}px Georgia,serif`;
  const total = () => [...text].reduce((s, c) => s + g.measureText(c).width, 0);
  while (total() > 664 && fs > 40) { fs -= 2; g.font = `800 ${fs}px Georgia,serif`; }
  const chars = [...text], w = chars.map(c => g.measureText(c).width), tot = w.reduce((s, v) => s + v, 0);
  g.fillStyle = '#f6f1e6'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let ang = -(tot / 2) / Rt;
  for (let i = 0; i < chars.length; i++) {
    const aa = ang + (w[i] / 2) / Rt;
    g.save(); g.translate(cx + Math.sin(aa) * Rt, cyT - Math.cos(aa) * Rt); g.rotate(aa);
    g.fillText(chars[i], 0, 0); g.restore();
    ang += w[i] / Rt;
  }
}

// black rounded message board with a warm incandescent dot-matrix message
function mqDots(g, msg, bx, by, bw, bh) {
  const r = 16;
  g.beginPath();
  g.moveTo(bx + r, by); g.arcTo(bx + bw, by, bx + bw, by + bh, r); g.arcTo(bx + bw, by + bh, bx, by + bh, r);
  g.arcTo(bx, by + bh, bx, by, r); g.arcTo(bx, by, bx + bw, by, r); g.closePath();
  g.fillStyle = '#0a0806'; g.fill();
  const chars = [...msg], cols = Math.max(1, chars.length * 6 - 1), padX = 22, padY = 16;
  const pitch = Math.min((bh - padY * 2) / 7, (bw - padX * 2) / cols), dr = pitch * 0.38;
  const blockW = cols * pitch, ox = bx + bw / 2 - blockW / 2, oy = by + bh / 2 - 3.5 * pitch;
  const dot = (cc, rw, col) => { g.beginPath(); g.arc(ox + cc * pitch + pitch / 2, oy + rw * pitch + pitch / 2, dr, 0, 6.2832); g.fillStyle = col; g.fill(); };
  for (let c = 0; c < cols; c++) for (let rw = 0; rw < 7; rw++) dot(c, rw, '#241c15');   // faint full grid
  for (let ci = 0; ci < chars.length; ci++) {                                            // lit message glyphs
    const rows = DFONT[chars[ci]] || DFONT[' '];
    for (let rw = 0; rw < 7; rw++) for (let cc = 0; cc < 5; cc++) if (rows[rw][cc] === '#') dot(ci * 6 + cc, rw, '#ffe3ad');
  }
}

function drawMarquee(msg) {
  const g = marqueeCtx; if (!g) return;
  g.clearRect(0, 0, MQW, MQH);
  mqPath(g, MQ_OUT); g.fillStyle = '#c11f2c'; g.fill();                 // red face silhouette
  mqPath(g, MQ_IN); g.strokeStyle = '#f4efe2'; g.lineJoin = 'round'; g.lineWidth = 5; g.stroke();  // pinstripe frame
  g.beginPath(); g.moveTo(72, 470); g.lineTo(952, 470); g.lineWidth = 4; g.stroke();               // doubled bottom line
  mqScroll(g, 126, 206, 1); mqScroll(g, 898, 206, -1);                  // art-deco shoulder volutes
  mqArchText(g, 'WRIGLEY FIELD');                                       // text on the arc
  g.fillStyle = '#f6f1e6'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = '800 30px Georgia,serif'; g.fillText('HOME OF', 512, 206);
  let fs = 78; g.font = `800 ${fs}px Georgia,serif`;
  while (g.measureText('CHICAGO CUBS').width > 812 && fs > 44) { fs -= 2; g.font = `800 ${fs}px Georgia,serif`; }
  g.fillText('CHICAGO CUBS', 512, 292);
  mqDots(g, msg, 80, 314, 864, 140);
  marqueeTex.needsUpdate = true;
}
export function marqueeSetText(line) { drawMarquee(String(line).toUpperCase().slice(0, 24)); }

function ivyTex() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#79413a'; g.fillRect(0, 0, 256, 64);          // brick behind
  const gs = ['#2e6b3a', '#3d7d44', '#255c33', '#4a8a4e'];
  for (let i = 0; i < 900; i++) {
    g.fillStyle = gs[R() * gs.length | 0];
    const x = R() * 256, y = 6 + Math.pow(R(), 0.75) * 58;     // thinner at the top
    g.beginPath(); g.arc(x, y, 1.5 + R() * 3, 0, 7); g.fill();
  }
  return new THREE.CanvasTexture(cv);
}
function fieldTex() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512;
  const g = cv.getContext('2d');                               // 512px = 120 m
  const M = 512 / 120;                                          // m → px, HP at (256,256)
  g.fillStyle = '#3f7d46'; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 14;   // mow arcs
  for (let r = 12; r < 78; r += 8) { g.beginPath(); g.arc(256, 256, r * M, -Math.PI * 0.75, -Math.PI * 0.25); g.stroke(); }
  g.fillStyle = '#b98a52';                                      // infield dirt (diamond up)
  g.save(); g.translate(256, 256); g.rotate(Math.PI / 4);
  g.fillRect(-2 * M, -29 * M, 31 * M, 31 * M); g.restore();
  g.fillStyle = '#3f7d46'; g.save(); g.translate(256, 256); g.rotate(Math.PI / 4);
  g.fillRect(2.5 * M, -24.5 * M, 22 * M, 22 * M); g.restore();  // infield grass
  g.fillStyle = '#b98a52'; g.beginPath(); g.arc(256, 256 - 12.9 * M, 2.8 * M, 0, 7); g.fill(); // mound
  g.fillStyle = '#c9985e'; g.beginPath(); g.arc(256, 256, 4 * M, 0, 7); g.fill();              // plate circle
  g.strokeStyle = '#f2ece0'; g.lineWidth = 3;                   // foul lines (up = CF)
  g.beginPath(); g.moveTo(256, 256); g.lineTo(256 - 57 * M * 0.7071, 256 - 57 * M * 0.7071); g.stroke();
  g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + 57 * M * 0.7071, 256 - 57 * M * 0.7071); g.stroke();
  g.strokeStyle = '#a8794a'; g.lineWidth = 4.5 * M;             // warning track arc
  g.beginPath(); g.arc(256, 256, 53.5 * M, -Math.PI * 0.83, -Math.PI * 0.17); g.stroke();
  const t = new THREE.CanvasTexture(cv); return t;
}
function scoreboardTex() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = '#1c4534'; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = '#0f2b20'; g.lineWidth = 6; g.strokeRect(3, 3, 506, 250);
  g.fillStyle = '#f2ece0'; g.textAlign = 'center';
  // dot clock
  g.strokeStyle = '#f2ece0'; g.lineWidth = 3;
  g.beginPath(); g.arc(256, 52, 34, 0, 7); g.stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.arc(256 + Math.sin(a) * 27, 52 - Math.cos(a) * 27, 2.2, 0, 7); g.fill(); }
  g.lineWidth = 4; g.beginPath(); g.moveTo(256, 52); g.lineTo(256 + Math.sin(3.85) * 16, 52 - Math.cos(3.85) * 16); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.moveTo(256, 52); g.lineTo(256 + Math.sin(1.15) * 24, 52 - Math.cos(1.15) * 24); g.stroke();
  const line = (txt, x, y, f) => { g.font = f; g.fillText(txt, x, y); };
  // inning grid
  g.font = '700 17px "Courier New",monospace'; g.textAlign = 'left';
  g.fillText('VISITORS  0 1 0 0 1 0 0', 30, 124);
  g.fillText('CUBS      1 0 0 2 0 0', 30, 154);
  g.strokeStyle = '#f2ece0'; g.lineWidth = 1;
  for (let i = 0; i < 10; i++) { g.strokeRect(196 + i * 22, 106, 20, 22); g.strokeRect(196 + i * 22, 136, 20, 22); }
  g.textAlign = 'center';
  line('R  H  E', 462, 96, '700 15px "Courier New",monospace');
  line('2  6  0', 462, 124, '700 17px "Courier New",monospace');
  line('3  8  1', 462, 154, '700 17px "Courier New",monospace');
  line('BATTING PRACTICE IS OVER — GAME IN PROGRESS', 256, 196, '700 15px "Courier New",monospace');
  line('AT BAT 44 · BALL 1 · STRIKE 2 · OUT 2 · INNING 7', 256, 226, '700 15px "Courier New",monospace');
  return new THREE.CanvasTexture(cv);
}
function wFlagTex() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 96;
  const g = cv.getContext('2d');
  g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, 128, 96);
  g.fillStyle = '#1c3f6e'; g.font = '900 84px Arial,sans-serif';
  g.textAlign = 'center'; g.fillText('W', 64, 78);
  return new THREE.CanvasTexture(cv);
}

// ---------------------------- facade ring ------------------------------
function buildFacades() {
  const pale = [], brick = [], cornice = [], grille = [], terra = [];
  // per-edge kind drives height/dressing (parallel to the poly edges): the
  // first 8 are the rounded Marquee corner ('arc'), then the flat faces.
  const KINDS = S.edgeKinds;
  const edges = [];
  for (let i = 0; i < POLY.length; i++) {
    const a = POLY[i], b = POLY[(i + 1) % POLY.length];
    edges.push({ a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) });
  }
  const FH = S.facadeH;                        // true 4-storey streetwall (16.5)
  const HMAP = { addison: FH, sheffield: 12, waveland: 6.5, plazaE: FH, notchS: FH, clark: FH, arc: FH };
  const hasBand = k => k === 'addison' || k === 'plazaE' || k === 'notchS' || k === 'clark' || k === 'arc';
  edges.forEach((e, i) => {
    const kind = KINDS[i], isArc = kind === 'arc';
    const ext = isArc ? 0.35 : 0;              // overlap neighbouring arc chords → seamless curve, no slits
    const dx = e.b[0] - e.a[0], dz = e.b[1] - e.a[1];
    const yaw = Math.atan2(dx, dz), nx = dz / e.len, nz = -dx / e.len;  // inward
    const cx = (e.a[0] + e.b[0]) / 2 + nx * 0.6, cz = (e.a[1] + e.b[1]) / 2 + nz * 0.6;
    const h = HMAP[kind];
    const mk = (arr, w, hh, d, ox, oy) => {                    // ox: inward offset
      const g = new THREE.BoxGeometry(w, hh, d);
      g.rotateY(yaw); g.translate(cx + nx * ox, oy, cz + nz * ox); arr.push(g);
    };
    if (kind === 'sheffield') {                               // Sheffield wall — knothole gap
      const K = S.knothole, zA = e.a[1], segs = [[zA, K.z1], [K.z0, e.b[1]]];
      for (const [z0, z1] of segs) {
        const L = Math.abs(z1 - z0), c = (z0 + z1) / 2;
        const g = new THREE.BoxGeometry(1.2, h - 2.5, L); g.translate(cx, 2.5 + (h - 2.5) / 2, c); pale.push(g);
        const gb = new THREE.BoxGeometry(1.3, 2.5, L); gb.translate(cx, 1.25, c); brick.push(gb);
      }
      const lint = new THREE.BoxGeometry(1.2, h - 3.4, Math.abs(K.z0 - K.z1)); // above the opening
      lint.translate(cx, 3.4 + (h - 3.4) / 2, (K.z0 + K.z1) / 2); pale.push(lint);
    } else {
      mk(pale, 1.2, h - 2.5, e.len + ext, 0, 2.5 + (h - 2.5) / 2);
      mk(brick, 1.3, 2.5, e.len + ext, 0, 1.25);
    }
    mk(cornice, 1.6, 0.5, e.len + 0.4 + ext, 0, h + 0.25);     // cap
    mk(terra, 1.4, 0.28, e.len + 0.2 + ext, 0, h + 0.64);      // terracotta strip
    if (kind !== 'waveland') mk(grille, 0.5, 1.1, (isArc ? e.len + ext : e.len * 0.9), -0.45, h - 1.2); // green grill band
    // pressbox band set back behind the grandstand sides, up to the rim.
    // On the curve, full-length chords (no 0.86/0.9 shrink) → one continuous crown.
    if (hasBand(kind)) {
      mk(pale, 1.6, 5.4, (isArc ? e.len + ext : e.len * 0.86), 2.6, h + 3.1);   // ~16.9–22.3
      mk(cornice, 1.8, 0.4, (isArc ? e.len + ext : e.len * 0.8), 2.6, h + 5.9); // rim cap ~22.5
    }
    if (isArc) {                                               // terracotta pent eyebrow over the corner ticket gates
      const aw = new THREE.BoxGeometry(0.9, 0.16, e.len + 0.3);
      aw.rotateZ(0.45); aw.rotateY(yaw);                       // droop the outer edge (red-tile pent tilt)
      aw.translate(cx + nx * -1.1, 4.7, cz + nz * -1.1);       // ~0.5 m proud of the wall face
      terra.push(aw);
    }
  });
  wrigleyRoot.add(new THREE.Mesh(mergeGeos(pale), toon(PALE)));
  wrigleyRoot.add(new THREE.Mesh(mergeGeos(brick), toon(BRICK)));
  wrigleyRoot.add(new THREE.Mesh(mergeGeos(cornice), toon(0xbfb7a6)));
  wrigleyRoot.add(new THREE.Mesh(mergeGeos(terra), toon(TERRA)));
  wrigleyRoot.add(new THREE.Mesh(mergeGeos(grille), toon(GREEN)));

  // street-level arches + upper windows (instanced dark-green recesses)
  const archGeo = mergeGeos([
    new THREE.BoxGeometry(2.2, 3.0, 0.3).translate(0, 1.5, 0),
    new THREE.CylinderGeometry(1.1, 1.1, 0.3, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(0, 3.0, 0),
  ]);
  const winGeo = mergeGeos([
    new THREE.BoxGeometry(1.3, 1.9, 0.24).translate(0, 0.95, 0),
    new THREE.CylinderGeometry(0.65, 0.65, 0.24, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(0, 1.9, 0),
  ]);
  const arches = [], wins = [];
  edges.forEach((e, i) => {
    const kind = KINDS[i];
    if (!(kind === 'addison' || kind === 'plazaE' || kind === 'notchS' || kind === 'clark')) return;
    const dx = e.b[0] - e.a[0], dz = e.b[1] - e.a[1];
    const yaw = Math.atan2(dx, dz), nx = dz / e.len, nz = -dx / e.len;
    const n = Math.floor(e.len / 6.5);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.7) / (n + 0.4), tw = (k + 0.2) / (n + 0.4);   // windows off the arch axis
      const x = e.a[0] + dx * t - nx * 0.12, z = e.a[1] + dz * t - nz * 0.12;   // proud of the face
      arches.push({ pos: [x, 0, z], yaw });
      const wx = e.a[0] + dx * tw - nx * 0.12, wz = e.a[1] + dz * tw - nz * 0.12;
      wins.push({ pos: [wx, 5.4, wz], yaw });                        // second storey
      if (HMAP[kind] > 13) wins.push({ pos: [wx, 10.6, wz], yaw });  // third storey on the tall faces
    }
  });
  // the rounded Marquee corner: too short per-chord (floor(2.3/6.5)=0), so
  // dress the whole quarter-round as ONE virtual edge swept along CORNER_ARC.
  { const A = CORNER_ARC, rp = A.r + 0.12, sweep = A.a1 - A.a0;      // rp: features ~0.1 proud of the curved face
    const px = a => A.cx + rp * Math.cos(a), pz = a => A.cz + rp * Math.sin(a);
    const oyaw = a => Math.atan2(Math.cos(a), Math.sin(a));          // a +z-facing plane → faces radially outward
    for (const f of [0.22, 0.78]) {                                 // 2 ground arches; APEX KEPT CLEAR (the gate goes there)
      const a = A.a0 + sweep * f; arches.push({ pos: [px(a), 0, pz(a)], yaw: oyaw(a) });
    }
    for (let k = 0; k < 5; k++) {                                   // 5 upper window columns, two storeys
      const a = A.a0 + sweep * (k + 0.5) / 5;
      wins.push({ pos: [px(a), 5.4, pz(a)], yaw: oyaw(a) });
      wins.push({ pos: [px(a), 10.6, pz(a)], yaw: oyaw(a) });
    }
  }
  inst(archGeo, toon(0x2a4438), arches);
  inst(winGeo, toon(0x33503f), wins);

  // red-white-blue bunting swags under the cornice (S + plaza faces + the curve)
  const bunt = [];
  edges.forEach((e, i) => {
    const kind = KINDS[i];
    if (!(kind === 'addison' || kind === 'plazaE')) return;
    const dx = e.b[0] - e.a[0], dz = e.b[1] - e.a[1];
    const yaw = Math.atan2(dx, dz), nx = dz / e.len, nz = -dx / e.len;
    const n = Math.floor(e.len / 6.5);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.2) / (n + 0.4);
      bunt.push({ pos: [e.a[0] + dx * t - nx * 0.28, HMAP[kind] - 0.6, e.a[1] + dz * t - nz * 0.28], yaw });
    }
  });
  { const A = CORNER_ARC, rb = A.r + 0.28, sweep = A.a1 - A.a0;      // 4 swags wrapping the curved cornice
    for (let k = 0; k < 4; k++) {
      const a = A.a0 + sweep * (k + 0.5) / 4;
      bunt.push({ pos: [A.cx + rb * Math.cos(a), FH - 0.6, A.cz + rb * Math.sin(a)], yaw: Math.atan2(Math.cos(a), Math.sin(a)) });
    }
  }
  const bcv = document.createElement('canvas'); bcv.width = 96; bcv.height = 48;
  const bg = bcv.getContext('2d');
  bg.fillStyle = '#b03a2e'; bg.beginPath(); bg.ellipse(48, 0, 48, 46, 0, 0, Math.PI); bg.fill();
  bg.fillStyle = '#e8e4da'; bg.beginPath(); bg.ellipse(48, 0, 48, 34, 0, 0, Math.PI); bg.fill();
  bg.fillStyle = '#1c3f6e'; bg.beginPath(); bg.ellipse(48, 0, 48, 20, 0, 0, Math.PI); bg.fill();
  inst(new THREE.PlaneGeometry(3.4, 1.5).translate(0, -0.75, 0),
    bmat(0xffffff, { map: new THREE.CanvasTexture(bcv), transparent: true, side: THREE.DoubleSide }), bunt);
}

// ------------------------------ gates ----------------------------------
function gateAt(x, z, yaw, label, wide = 4.4) {
  const grp = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(wide + 1.2, 5.2, 0.9), toon(BRICK));
  frame.position.y = 2.6; grp.add(frame);
  const recess = new THREE.Mesh(new THREE.BoxGeometry(wide, 4.2, 0.5), toon(0x241f1c));
  recess.position.set(0, 2.1, 0.35); grp.add(recess);
  const doors = new THREE.Mesh(new THREE.BoxGeometry(wide - 0.6, 3.6, 0.18), toon(0x7d2430));
  doors.position.set(0, 1.8, 0.55); grp.add(doors);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 40;
  const g = cv.getContext('2d');
  g.fillStyle = '#1e4d38'; g.fillRect(0, 0, 256, 40);
  g.fillStyle = '#f2ece0'; g.textAlign = 'center';
  let fs = 24; g.font = `700 ${fs}px Georgia,serif`;
  while (g.measureText(label).width > 236 && fs > 12) { fs -= 1; g.font = `700 ${fs}px Georgia,serif`; }
  g.fillText(label, 128, 28);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(wide, wide * 40 / 256), bmat(0xffffff, { map: new THREE.CanvasTexture(cv) }));
  sign.position.set(0, 4.6, 0.62); grp.add(sign);
  grp.position.set(x, 0, z); grp.rotation.y = yaw;
  grp.updateMatrixWorld(true); atlasPlane(sign, false);   // gate sign -> shared wrigley atlas (detaches from grp)
  wrigleyRoot.add(grp);
}
function ticketBooth(x, z, yaw) {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.5, 1.9), toon(PALE));
  body.position.y = 1.25; grp.add(body);
  const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.1), toon(0x26221e));
  win.position.set(0, 1.55, 0.95); grp.add(win);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.9, 4), toon(TERRA));
  roof.position.y = 2.95; roof.rotation.y = Math.PI / 4; grp.add(roof);
  grp.position.set(x, 0, z); grp.rotation.y = yaw;
  wrigleyRoot.add(grp);
  collide(x, z, 1.3, 3);
}

// ----------------------------- marquee ---------------------------------
function buildMarquee() {
  const M = S.marquee;
  const grp = new THREE.Group();
  // dark-red extruded backing whose outline exactly matches the drawn red face
  const shape = new THREE.Shape();
  shape.moveTo(mqMX(MQ_OUT[0][0]), mqMY(MQ_OUT[0][1]));
  for (let i = 1; i < MQ_OUT.length; i++) shape.lineTo(mqMX(MQ_OUT[i][0]), mqMY(MQ_OUT[i][1]));
  shape.closePath();
  const backing = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false }), toon(0x7d1622));
  backing.position.z = -0.3; grp.add(backing);
  // live canvas face on a slightly-proud plane (transparent outside the silhouette)
  const cv = document.createElement('canvas'); cv.width = MQW; cv.height = MQH;
  marqueeCtx = cv.getContext('2d');
  marqueeTex = new THREE.CanvasTexture(cv);
  drawMarquee('GAME IN PROGRESS');
  const face = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 3.8),
    bmat(0xffffff, { map: marqueeTex, transparent: true, alphaTest: 0.5 }));
  face.position.set(0, 6.4, 0.33); grp.add(face);
  // two struts back to the corner wall
  for (const sx of [-2.7, 2.7]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 2.6), toon(0x5a1a20));
    strut.position.set(sx, 7.4, -1.2); grp.add(strut);
  }
  // warm glow bulbs following the arched crown (every other camber sample)
  const arc = MQ_OUT.filter(p => p[1] < 172).filter((_, i) => i % 2 === 0);   // springs + camber, incl. apex
  const n = arc.length, gp = new Float32Array(n * 3), aC = new Float32Array(n * 3), aS = new Float32Array(n);
  for (let i = 0; i < n; i++) { gp.set([mqMX(arc[i][0]), mqMY(arc[i][1]) + 0.06, 0.36], i * 3); aC.set([1, 0.72, 0.5], i * 3); aS[i] = 2.7; }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(gp, 3));
  pg.setAttribute('aColor', new THREE.BufferAttribute(aC, 3));
  pg.setAttribute('aSize', new THREE.BufferAttribute(aS, 1));
  grp.add(new THREE.Points(pg, pointsMat()));
  // mount on the rounded corner apex, proud of the curve, facing the
  // Clark/Addison intersection (position + heading come from the data)
  grp.position.set(M.x, 0, M.z);
  grp.rotation.y = M.ry;
  wrigleyRoot.add(grp);
}

// --------------------------- interior bowl -----------------------------
function buildBowl() {
  // field — the footprint polygon itself, earcut-triangulated (a center FAN
  // speared across the notch's reflex corner: triangles with both endpoints
  // inside still crossed the plaza, floating a dirt sliver at y 0.22 over the
  // Gallagher lawn. Earcut respects the reflex corner; UVs stay the affine
  // HP-centered map, so linear interpolation is exact.)
  {
    const ux = Math.sin(AXIS), uz = Math.cos(AXIS), vx = uz, vz = -ux;
    const pos = [], uv = [], idx = [];
    for (const [x, z] of POLY) {
      pos.push(x, 0.22, z);
      const dx = x - HP[0], dz = z - HP[1];
      uv.push(0.5 + (dx * vx + dz * vz) / 120, 0.5 + (dx * ux + dz * uz) / 120);
    }
    const tris = THREE.ShapeUtils.triangulateShape(POLY.map(p => new THREE.Vector2(p[0], p[1])), []);
    for (const [a, b, c] of tris) {
      // enforce +Y winding regardless of earcut's output orientation
      const crossY = (POLY[b][1] - POLY[a][1]) * (POLY[c][0] - POLY[a][0])
                   - (POLY[b][0] - POLY[a][0]) * (POLY[c][1] - POLY[a][1]);
      idx.push(a, crossY > 0 ? b : c, crossY > 0 ? c : b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    wrigleyRoot.add(new THREE.Mesh(g, toon(0xffffff, { mat: { map: fieldTex() } })));
  }

  // grandstand: two stepped tiers wrapping BACK ±2.0 rad, pip-clipped
  const lowRows = 7, upRows = 5, seats = [], crowd = [];
  const addArc = (rows, r0, y0, dy, dr) => {
    for (let ri = 0; ri < rows; ri++) {
      const r = r0 + ri * dr, y = y0 + ri * dy;
      const n = Math.max(10, Math.round(r * 4.0 / 3.1));
      for (let k = 0; k <= n; k++) {
        const a = BACK - 2.0 + (k / n) * 4.0;
        const x = HP[0] + Math.sin(a) * r, z = HP[1] + Math.cos(a) * r;
        if (!insidePoly(x, z, 2.2)) continue;
        seats.push({ pos: [x, y, z], yaw: a, scale: [1, 1, 3.15] });
        const hx = x + rr(-0.5, 0.5), hz = z + rr(-0.9, 0.9);
        if (R() < 0.4 && insidePoly(hx, hz, 2.2)) crowd.push([hx, y + 0.62, hz]);
      }
    }
  };
  addArc(lowRows, 12.5, 1.1, 0.62, 1.35);
  addArc(upRows, 16.5, 10.2, 0.78, 1.3);      // upper deck rides the taller shell
  inst(new THREE.BoxGeometry(1.5, 0.5, 1), toon(0x2f5544), seats);
  // upper-deck fascia + roof ring (instanced arc slabs)
  const fascia = [], roof = [];
  { const n = 40;
    for (let k = 0; k <= n; k++) {
      const a = BACK - 2.0 + (k / n) * 4.0;
      const fx = HP[0] + Math.sin(a) * 16.2, fz = HP[1] + Math.cos(a) * 16.2;
      if (insidePoly(fx, fz, 2)) fascia.push({ pos: [fx, 9.3, fz], yaw: a, scale: [1, 1, 2.9] });
      const rxp = HP[0] + Math.sin(a) * 20.5, rzp = HP[1] + Math.cos(a) * 20.5;
      if (insidePoly(rxp, rzp, 1)) roof.push({ pos: [rxp, 19.5, rzp], yaw: a, rx: 0.16, scale: [1, 1, 3.7] });
    }
  }
  inst(new THREE.BoxGeometry(0.4, 1.5, 1), toon(0x24443a), fascia);
  inst(new THREE.BoxGeometry(9.5, 0.35, 1), toon(DARKROOF), roof);

  // ivy outfield wall: arc r 56 about HP, ±0.72 rad around AXIS
  const ivy = ivyTex();
  const wallSegs = [], caps = [];
  { const n = 26;
    for (let k = 0; k < n; k++) {
      const a = AXIS - 0.72 + ((k + 0.5) / n) * 1.44;
      const x = HP[0] + Math.sin(a) * 56, z = HP[1] + Math.cos(a) * 56;
      if (!pip(x, z, POLY)) continue;
      wallSegs.push({ pos: [x, 1.75, z], yaw: a + Math.PI / 2, scale: [1, 1, 1] });
      caps.push({ pos: [x, 3.62, z], yaw: a + Math.PI / 2, scale: [1, 1, 1] });
    }
  }
  inst(new THREE.BoxGeometry(4.3, 3.5, 0.8), toon(0xffffff, { mat: { map: ivy } }), wallSegs);   // overlap: arc fans the edges open
  inst(new THREE.BoxGeometry(4.35, 0.24, 0.9), toon(0x6b7d5a), caps);
  // foul poles (yellow) where the wall arc meets the foul lines
  const fp = [];
  for (const da of [-0.72, 0.72]) {
    const a = AXIS + da;
    fp.push({ pos: [HP[0] + Math.sin(a) * 55.4, 5.5, HP[1] + Math.cos(a) * 55.4] });
  }
  inst(new THREE.CylinderGeometry(0.12, 0.14, 11, 7), toon(0xd8bb2f), fp);

  // bleachers behind the ivy: rising arcs r 57.5 → 68
  const bl = [];
  for (let ri = 0; ri < 7; ri++) {
    const r = 57.5 + ri * 1.5, y = 3.9 + ri * 0.62;
    const n = Math.round(r * 1.44 / 3.0);
    for (let k = 0; k <= n; k++) {
      const a = AXIS - 0.66 + (k / n) * 1.32;
      const x = HP[0] + Math.sin(a) * r, z = HP[1] + Math.cos(a) * r;
      if (!insidePoly(x, z, 1.2)) continue;
      bl.push({ pos: [x, y, z], yaw: a, scale: [1, 1, 3.05] });
      if (R() < 0.5) crowd.push([x + rr(-0.5, 0.5), y + 0.62, z + rr(-1.2, 1.2)]);
    }
  }
  inst(new THREE.BoxGeometry(1.5, 0.5, 1), toon(0x4a6b52), bl);

  // crowd — bucketed by color (r128: no instanceColor on toon)
  const cols = [0x1c3f6e, 0xb03a2e, 0xe8e4da, 0xc9a36a, 0x5a7d9a];
  const buckets = cols.map(() => []);
  crowd.forEach(p => buckets[R() * cols.length | 0].push({ pos: p, yaw: rr(0, 6.28) }));
  const headG = new THREE.SphereGeometry(0.27, 6, 5);
  buckets.forEach((b, i) => b.length && inst(headG, toon(cols[i]), b));
}

// ---------------------------- scoreboard -------------------------------
let wFlag = null, wMast = { base: 14.4, top: 19.6 };
export function raiseW(t = 1) {
  if (!wFlag) return null;
  wFlag.visible = t > 0.02;
  wFlag.position.y = wMast.base + (wMast.top - wMast.base) * Math.min(1, Math.max(0, t));
  return wFlag;
}
function buildScoreboard() {
  const B = S.scoreboard, yaw = BACK;               // face looks back at home plate
  const grp = new THREE.Group();
  const W = 15, H = 8.2, topY = B.topY;             // true 27 ft board; base lands at 18.3 (60 ft)
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, 1.6), toon(GREEN));
  body.position.y = topY - H / 2; grp.add(body);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.6, H - 0.5), bmat(0xffffff, { map: scoreboardTex() }));
  face.position.set(0, topY - H / 2, 0.85); grp.add(face);
  // lattice legs down to the bleacher crown (~8.1 → 18.3)
  const legs = new THREE.Mesh(new THREE.BoxGeometry(W - 4, 10.4, 1.1), toon(0x173a2c));
  legs.position.y = topY - H - 5.2; grp.add(legs);
  for (const lx of [-(W - 3) / 2, (W - 3) / 2]) {                  // edge columns
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10.4, 0.5), toon(0x14352a));
    col.position.set(lx, topY - H - 5.2, 0); grp.add(col);
  }
  // three pennant masts
  const mastG = new THREE.CylinderGeometry(0.07, 0.09, 5.4, 6);
  const masts = [-4.6, 0, 4.6].map(mx => ({ pos: [mx, topY + 2.7, 0] }));
  const mastMesh = new THREE.InstancedMesh(mastG, toon(0xd9d2c4), 3);
  { const M = new THREE.Matrix4(); masts.forEach((m, i) => { M.setPosition(m.pos[0], m.pos[1], m.pos[2]); mastMesh.setMatrixAt(i, M); }); }
  mastMesh.instanceMatrix.needsUpdate = true; grp.add(mastMesh);
  // NL pennant strings, two color buckets
  const pen = { blue: [], red: [] };
  [-4.6, 4.6].forEach(mx => {
    for (let i = 0; i < 5; i++) (i % 2 ? pen.red : pen.blue).push({ pos: [mx + 0.55, topY + 4.9 - i * 1.05, 0], yaw: 0 });
  });
  for (let i = 0; i < 3; i++) (i % 2 ? pen.blue : pen.red).push({ pos: [0.55, topY + 4.9 - i * 1.05, 0], yaw: 0 });
  const penG = new THREE.PlaneGeometry(1.0, 0.42).translate(0.5, 0, 0);
  const mkPen = (items, c) => { const m = inst(penG, bmat(c, { side: THREE.DoubleSide }), items); grp.add(m); wrigleyRoot.remove(m); grp.add(m); };
  mkPen(pen.blue, 0x2a5a9c); mkPen(pen.red, 0xb03a2e);
  // the W flag — center mast, starts lowered+hidden; raiseW(t) hoists it
  wMast.base = B.topY + 0.6; wMast.top = B.topY + 4.6;
  wFlag = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.25).translate(0.85, 0, 0),
    bmat(0xffffff, { map: wFlagTex(), side: THREE.DoubleSide }));
  wFlag.position.set(0.07, wMast.base, 0); wFlag.visible = false;
  wFlag.userData.live = true;                       // raiseW() hoists this (gameday WIN) — exempt from the cell merge
  grp.add(wFlag);
  grp.position.set(B.x, 0, B.z); grp.rotation.y = yaw;
  grp.updateMatrixWorld(true); atlasPlane(face, false);   // scoreboard face is STATIC (drawn once, never .needsUpdate'd) -> shared atlas; W flag stays live
  wrigleyRoot.add(grp);
}

// --------------------------- light towers ------------------------------
function buildTowers() {
  const towers = [];
  // across the grandstand roof arc (plaza notch clips the WNW candidates)
  for (const da of [-1.35, -0.9, -0.35, 0.35, 1.1, 1.7]) {
    const a = BACK + da, r = 18.5;
    const x = HP[0] + Math.sin(a) * r, z = HP[1] + Math.cos(a) * r;
    if (insidePoly(x, z, 1.5)) towers.push({ x, z, base: 20, yaw: a - Math.PI });   // on the raised roof
  }
  for (const da of [-0.52, 0.52]) {
    const a = AXIS + da, r = 63;
    const x = HP[0] + Math.sin(a) * r, z = HP[1] + Math.cos(a) * r;
    if (insidePoly(x, z, 1)) towers.push({ x, z, base: 8.6, mast: 12, yaw: a - Math.PI });  // bleacher wings reach higher
  }
  const mastG = new THREE.CylinderGeometry(0.2, 0.38, 7.6, 6).translate(0, 3.8, 0);
  const wingMastG = new THREE.CylinderGeometry(0.24, 0.46, 12, 6).translate(0, 6, 0);
  const headG = new THREE.BoxGeometry(3.4, 1.5, 0.5);
  inst(mastG, toon(0xdad5c8), towers.filter(t => !t.mast).map(t => ({ pos: [t.x, t.base, t.z], yaw: t.yaw })));
  inst(wingMastG, toon(0xdad5c8), towers.filter(t => t.mast).map(t => ({ pos: [t.x, t.base, t.z], yaw: t.yaw })));
  inst(headG, toon(0xc9c4b6), towers.map(t => ({ pos: [t.x, t.base + (t.mast || 7.6) + 0.6, t.z], yaw: t.yaw })));
  // glow banks
  const pts = [];
  towers.forEach(t => {
    const hy = t.base + (t.mast || 7.6) + 0.6;
    for (let i = -1; i <= 1; i++) {
      const ox = Math.cos(t.yaw) * i * 1.05, oz = -Math.sin(t.yaw) * i * 1.05;
      pts.push([t.x + ox, hy, t.z + oz]);
    }
  });
  const gp = new Float32Array(pts.length * 3), aC = new Float32Array(pts.length * 3), aS = new Float32Array(pts.length);
  pts.forEach((p, i) => { gp.set(p, i * 3); aC.set([1, 0.93, 0.78], i * 3); aS[i] = 7.5; });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(gp, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(aC, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(aS, 1));
  wrigleyRoot.add(new THREE.Points(g, pointsMat()));
}

// ------------------------------ knothole -------------------------------
function buildKnothole() {
  const K = S.knothole, cz = (K.z0 + K.z1) / 2;
  const frame = [];
  for (const oy of [0.15, 3.3]) { const g = new THREE.BoxGeometry(0.5, 0.3, Math.abs(K.z1 - K.z0) + 0.6); g.translate(K.x - 0.55, oy, cz); frame.push(g); }
  for (const oz of [K.z0 - 0.15, K.z1 + 0.15]) { const g = new THREE.BoxGeometry(0.5, 3.5, 0.3); g.translate(K.x - 0.55, 1.75, oz); frame.push(g); }
  wrigleyRoot.add(new THREE.Mesh(mergeGeos(frame), toon(0x2a4438)));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(K.z1 - K.z0), 3.1),
    bmat(0x16281f, { transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
  screen.rotation.y = -Math.PI / 2;
  screen.position.set(K.x - 0.55, 1.72, cz);
  wrigleyRoot.add(screen);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 32;
  const g = cv.getContext('2d');
  g.fillStyle = '#a91f2e'; g.fillRect(0, 0, 256, 32);
  g.fillStyle = '#f2ece0'; g.font = '700 18px Georgia,serif'; g.textAlign = 'center';
  g.fillText('KNOTHOLE — WATCH FREE, BE KIND', 128, 22);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.55), bmat(0xffffff, { map: new THREE.CanvasTexture(cv) }));
  sign.rotation.y = -Math.PI / 2; sign.position.set(K.x - 0.7, 3.75, cz);
  atlasPlane(sign, false);   // knothole sign -> shared wrigley atlas
}

// ------------------------------- build ---------------------------------
export function buildStadium() {
  buildFacades();
  buildMarquee();
  buildBowl();
  buildScoreboard();
  buildTowers();
  buildKnothole();
  // gates sit ON the wall plane (data points are logical spots; the wall
  // face is what the street sees). Plaza-east wall line interpolates
  // (−284.3,−494)→(−266.4,−430); outward normal (−0.963, 0.269).
  const plazaX = z => -284.3 + 17.9 * (z + 494) / 64;
  const gYaw = Math.atan2(-0.963, 0.269);                        // faces the plaza
  gateAt(S.gates.marquee.x, S.gates.marquee.z, S.gates.marquee.yaw, 'MARQUEE GATE'); // on the curve apex
  gateAt(plazaX(-462) + 0.42, -462.12, gYaw, 'GALLAGHER WAY GATE');
  gateAt(S.gates.bleacher.x, -493.6, Math.PI, 'BLEACHERS', 5.2); // faces Waveland
  // marquee-side booth now lives in wrigley-vendors.js (the ticket queue owns it)
  ticketBooth(plazaX(-457.4) - 1.06, -457.1, gYaw);
}
