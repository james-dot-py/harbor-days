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
import { STADIUM_W, CORNER_ARC, APRONS_W, clarkX, gallagherWallX } from '../data/wrigleyville.js';
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
  ':': ['     ', '  #  ', '  #  ', '     ', '  #  ', '  #  ', '     '],
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
  // canvas aspect ~= the wall face (4.3 x 3.5 m): a wide-short canvas (256x64)
  // stretched ~3.3x vertically smeared every clump into bamboo streaks
  // (markers-close.png, task 012) — keep px roughly square on the wall.
  const cv = document.createElement('canvas'); cv.width = 192; cv.height = 160;
  const g = cv.getContext('2d');
  const IR = mulberry32(19141060);                            // DEDICATED rng — never touches the file R (crowd stays put)
  g.fillStyle = '#5a382f'; g.fillRect(0, 0, 192, 160);        // dark brick behind so the ivy reads
  // leaf CLUSTERS (overlapping dots), densest low, brick peeking at the top —
  // reads as ivy mats from ~40 m, not stripes
  const gs = ['#204a26', '#2f6b35', '#1c5127', '#489048', '#376f3b', '#5aa356'];
  for (let i = 0; i < 240; i++) {
    const cx = IR() * 192, cy = 14 + Math.pow(IR(), 0.55) * 146;   // pow<1 biases toward the bottom
    const n = 4 + IR() * 3 | 0;
    for (let k = 0; k < n; k++) {
      g.fillStyle = gs[IR() * gs.length | 0];
      g.beginPath();
      g.arc(cx + (IR() - 0.5) * 16, cy + (IR() - 0.5) * 12, 4 + IR() * 7, 0, 7);
      g.fill();
    }
  }
  return new THREE.CanvasTexture(cv);
}
function fieldTex() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512;
  const g = cv.getContext('2d');                               // 512px = 160 m
  const M = 512 / 160;                                          // m → px, HP at (256,256)
  g.fillStyle = '#3f7d46'; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 14;   // mow arcs
  for (let r = 12; r < 96; r += 10) { g.beginPath(); g.arc(256, 256, r * M, -Math.PI * 0.75, -Math.PI * 0.25); g.stroke(); }
  g.fillStyle = '#b98a52';                                      // infield dirt (diamond up)
  g.save(); g.translate(256, 256); g.rotate(Math.PI / 4);
  g.fillRect(-2 * M, -29 * M, 31 * M, 31 * M); g.restore();
  g.fillStyle = '#3f7d46'; g.save(); g.translate(256, 256); g.rotate(Math.PI / 4);
  g.fillRect(2.5 * M, -24.5 * M, 22 * M, 22 * M); g.restore();  // infield grass
  g.fillStyle = '#b98a52'; g.beginPath(); g.arc(256, 256 - 12.9 * M, 2.8 * M, 0, 7); g.fill(); // mound
  g.fillStyle = '#c9985e'; g.beginPath(); g.arc(256, 256, 4 * M, 0, 7); g.fill();              // plate circle
  g.strokeStyle = '#f2ece0'; g.lineWidth = 3;                   // foul lines (up = CF)
  g.beginPath(); g.moveTo(256, 256); g.lineTo(256 - 75 * M * 0.7071, 256 - 75 * M * 0.7071); g.stroke();
  g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + 75 * M * 0.7071, 256 - 75 * M * 0.7071); g.stroke();
  g.strokeStyle = '#a8794a'; g.lineWidth = 4.5 * M;             // warning track arc
  g.beginPath(); g.arc(256, 256, 71.5 * M, -Math.PI * 0.83, -Math.PI * 0.17); g.stroke();
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
// the scoreboard's BACK (seen from Waveland rooftops / wv-scoreboard): a round
// clock + a compact line-score panel (legibility liberty, GEOGRAPHY.md).
function backClockTex() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = '#1c4534'; g.fillRect(0, 0, 256, 256);
  const cxx = 128, cyy = 112, R0 = 92;
  g.strokeStyle = '#efe8d6'; g.lineWidth = 8; g.beginPath(); g.arc(cxx, cyy, R0, 0, 7); g.stroke();  // cream ring dial
  g.fillStyle = '#efe8d6';
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.arc(cxx + Math.sin(a) * (R0 - 14), cyy - Math.cos(a) * (R0 - 14), 5, 0, 7); g.fill(); }
  g.lineCap = 'round';
  g.lineWidth = 9; g.beginPath(); g.moveTo(cxx, cyy); g.lineTo(cxx + Math.sin(3.85) * 44, cyy - Math.cos(3.85) * 44); g.stroke();  // hour
  g.lineWidth = 6; g.beginPath(); g.moveTo(cxx, cyy); g.lineTo(cxx + Math.sin(1.15) * 70, cyy - Math.cos(1.15) * 70); g.stroke();  // minute
  g.fillStyle = '#efe8d6'; g.textAlign = 'center'; g.font = '700 22px Georgia,serif';
  g.fillText('WRIGLEY FIELD', 128, 238);
  return new THREE.CanvasTexture(cv);
}
function backScoreTex() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 144;
  const g = cv.getContext('2d');
  g.fillStyle = '#1c4534'; g.fillRect(0, 0, 512, 144);
  g.strokeStyle = '#0f2b20'; g.lineWidth = 5; g.strokeRect(3, 3, 506, 138);
  g.fillStyle = '#efe8d6'; g.textAlign = 'left'; g.font = '700 22px "Courier New",monospace';
  g.fillText('VISITORS 0 1 0 0 1 0 0  2', 22, 44);
  g.fillText('CUBS     1 0 0 2 0 0  3', 22, 80);
  g.textAlign = 'center'; g.font = '700 18px "Courier New",monospace';
  g.fillText('GAME IN PROGRESS · INNING 7', 256, 120);
  return new THREE.CanvasTexture(cv);
}

// ---------------------------- facade ring ------------------------------
function buildFacades() {
  const pale = [], brick = [], cornice = [], grille = [], terra = [], stone = [];
  // per-edge kind drives height/dressing (parallel to the poly edges): the
  // first 8 are the rounded Marquee corner ('arc'), then the flat faces.
  const KINDS = S.edgeKinds;
  const edges = [];
  for (let i = 0; i < POLY.length; i++) {
    const a = POLY[i], b = POLY[(i + 1) % POLY.length];
    edges.push({ a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) });
  }
  const FH = S.facadeH;                        // true 4-storey streetwall (16.5)
  const HMAP = { addison: FH, secorner: FH, sheffield: 12, waveland: 6.5, gate: 8.2, plazaN: FH, plazaE: FH, notchS: FH, clark: FH, arc: FH };
  // plazaN rides with plazaE (grandstand skin); notchS + clark are the BOX-OFFICE
  // mass (own dressing below) so they drop OUT of the grandstand band. secorner
  // (task 020) = the ANGLED SE corner: grandstand treatment so the crown wraps it.
  const hasBand = k => k === 'addison' || k === 'secorner' || k === 'plazaN' || k === 'plazaE' || k === 'arc';
  edges.forEach((e, i) => {
    const kind = KINDS[i], isArc = kind === 'arc', isCorner = isArc || kind === 'secorner';
    const ext = isCorner ? 0.35 : 0;           // overlap neighbouring arc/secorner chords → seamless curve, no slits
    const dx = e.b[0] - e.a[0], dz = e.b[1] - e.a[1];
    const yaw = Math.atan2(dx, dz), nx = dz / e.len, nz = -dx / e.len;  // inward
    const cx = (e.a[0] + e.b[0]) / 2 + nx * 0.6, cz = (e.a[1] + e.b[1]) / 2 + nz * 0.6;
    const h = HMAP[kind];
    const mk = (arr, w, hh, d, ox, oy) => {                    // ox: inward offset
      const g = new THREE.BoxGeometry(w, hh, d);
      g.rotateY(yaw); g.translate(cx + nx * ox, oy, cz + nz * ox); arr.push(g);
    };
    if (kind === 'waveland') {                               // Waveland (LF) wall — full-height RED BRICK with the knothole gap
      const K = S.knothole;                                  // opening x0..x1 on the z-face: two segments either side + a lintel
      for (const [xa, xb] of [[e.b[0], K.x0], [K.x1, e.a[0]]]) {
        const L = Math.abs(xb - xa), c = (xa + xb) / 2;
        const g = new THREE.BoxGeometry(L, h, 1.3); g.translate(c, h / 2, cz); brick.push(g);
      }
      const lint = new THREE.BoxGeometry(Math.abs(K.x1 - K.x0), h - 3.4, 1.3);  // over the ~3.4 m clear opening
      lint.translate((K.x0 + K.x1) / 2, 3.4 + (h - 3.4) / 2, cz); brick.push(lint);
    } else if (kind === 'sheffield' || kind === 'gate') {    // street-side outfield walls read RED BRICK, full height
      mk(brick, 1.3, h, e.len + ext, 0, h / 2);
    } else if (kind === 'notchS' || kind === 'clark') {      // BOX OFFICE — full-height red brick (a distinct mass, not pale streetwall)
      mk(brick, 1.3, h, e.len, 0, h / 2);
      mk(stone, 1.35, 0.35, e.len + 0.2, 0, 4.75);           // one limestone stringcourse belting the ticket lobby
    } else {
      mk(pale, 1.2, h - 2.5, e.len + ext, 0, 2.5 + (h - 2.5) / 2);
      mk(brick, 1.3, 2.5, e.len + ext, 0, 1.25);
    }
    mk(cornice, 1.6, 0.5, e.len + 0.4 + ext, 0, h + 0.25);     // cap
    mk(terra, 1.4, 0.28, e.len + 0.2 + ext, 0, h + 0.64);      // terracotta strip
    if (kind !== 'waveland' && kind !== 'gate' && kind !== 'notchS' && kind !== 'clark') mk(grille, 0.5, 1.1, (isCorner ? e.len + ext : e.len * 0.9), -0.45, h - 1.2); // green grill band (box office skips it)
    // grandstand skin (IMG_2333/2339): proud brick band + green steel columns + X-lattice + continuous crown
    if (hasBand(kind)) {
      mk(brick, 1.3, 1.4, e.len + ext, -0.05, 3.9);           // (a) red brick band y 3.2–4.6, slightly proud
      if (!isArc) {                                            // (c) green steel columns 4.6 → h at the arch rhythm
        const nc = Math.floor(e.len / 6.5);
        for (let k = 0; k < nc; k++) {
          const t = (k + 0.45) / (nc + 0.4), px = e.a[0] + dx * t, pz = e.a[1] + dz * t;
          const col = new THREE.BoxGeometry(0.32, h - 4.6, 0.55);
          col.rotateY(yaw); col.translate(px + nx * -0.12, 4.6 + (h - 4.6) / 2, pz + nz * -0.12);
          grille.push(col);
        }
      }
      if (kind === 'addison') {                               // (d) subtle green X-lattice at the pressbox-band level
        const nl = Math.floor(e.len / 6.5);
        for (let k = 0; k < nl - 1; k++) {
          const t = (k + 0.95) / (nl + 0.4), px = e.a[0] + dx * t, pz = e.a[1] + dz * t;
          for (const s of [1, -1]) {
            const b = new THREE.BoxGeometry(0.12, 0.12, 5.5);
            b.rotateX(s * 0.55); b.rotateY(yaw);              // diagonal in the (along-wall, vertical) plane → reads as an X
            b.translate(px + nx * 1.7, 19.75, pz + nz * 1.7);
            grille.push(b);
          }
        }
      }
      mk(pale, 1.6, 5.4, e.len + (isCorner ? ext : 0.6), 2.6, h + 3.1);   // (e) pressbox band — FULL length (+overlap) → continuous crown
      mk(cornice, 1.8, 0.4, e.len + (isCorner ? ext : 0.6), 2.6, h + 5.9); // rim cap ~22.5, continuous
    }
    if (kind === 'clark' || kind === 'plazaE' || kind === 'plazaN') {  // (b) red-tile pent roof (clark = ticket-arcade shelter; plazaN hidden behind the office)
      const aw = new THREE.BoxGeometry(1.0, 0.16, e.len + ext);
      aw.rotateZ(0.45); aw.rotateY(yaw);
      aw.translate(cx + nx * -1.05, 4.7, cz + nz * -1.05);
      terra.push(aw);
    } else if (kind === 'addison') {                          // two segments — clear window over the Addison gate for the banner
      const gxa = S.gates.addison.x;                          // pent gap straddles the gate (±4.5 m), wherever it sits
      for (const [x0, x1] of [[e.a[0], gxa - 4.5], [gxa + 4.5, e.b[0]]]) {
        const L = Math.abs(x1 - x0), c = (x0 + x1) / 2;
        const aw = new THREE.BoxGeometry(1.0, 0.16, L);
        aw.rotateZ(0.45); aw.rotateY(yaw);
        aw.translate(c + nx * -1.05, 4.7, cz + nz * -1.05);
        terra.push(aw);
      }
    }
    if (isArc) {                                               // terracotta pent eyebrow over the corner ticket gates
      const aw = new THREE.BoxGeometry(0.9, 0.16, e.len + 0.3);
      aw.rotateZ(0.45); aw.rotateY(yaw);                       // droop the outer edge (red-tile pent tilt)
      aw.translate(cx + nx * -1.1, 4.7, cz + nz * -1.1);       // ~0.5 m proud of the wall face
      terra.push(aw);
    }
  });
  // (c/d) marquee-corner CURVE — 4 green steel columns + X-lattice across the sweep (CORNER_ARC math)
  { const A = CORNER_ARC, sweep = A.a1 - A.a0, rC = A.r + 0.3, rL = A.r - 1.7;
    const oyaw = a => Math.atan2(Math.cos(a), Math.sin(a));
    for (let k = 0; k < 4; k++) {
      const a = A.a0 + sweep * (k + 0.5) / 4;
      const col = new THREE.BoxGeometry(0.32, FH - 4.6, 0.55);
      col.rotateY(oyaw(a)); col.translate(A.cx + rC * Math.cos(a), 4.6 + (FH - 4.6) / 2, A.cz + rC * Math.sin(a));
      grille.push(col);
    }
    for (let k = 0; k < 3; k++) {
      const a = A.a0 + sweep * (k + 1) / 4;
      for (const s of [1, -1]) {
        const b = new THREE.BoxGeometry(0.12, 0.12, 5.5);
        b.rotateX(s * 0.55); b.rotateY(oyaw(a));
        b.translate(A.cx + rL * Math.cos(a), 19.75, A.cz + rL * Math.sin(a));
        grille.push(b);
      }
    }
  }
  wrigleyRoot.add(new THREE.Mesh(mergeGeos(pale), toon(PALE)));
  wrigleyRoot.add(new THREE.Mesh(mergeGeos(brick), toon(BRICK)));
  wrigleyRoot.add(new THREE.Mesh(mergeGeos(cornice), toon(0xbfb7a6)));
  wrigleyRoot.add(new THREE.Mesh(mergeGeos(terra), toon(TERRA)));
  wrigleyRoot.add(new THREE.Mesh(mergeGeos(grille), toon(GREEN)));
  if (stone.length) wrigleyRoot.add(new THREE.Mesh(mergeGeos(stone), toon(0xe6ddc8)));  // box-office limestone (office-parapet bucket → +0 draws)

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
    if (!(kind === 'addison' || kind === 'secorner' || kind === 'plazaE' || kind === 'notchS' || kind === 'clark')) return;
    const dx = e.b[0] - e.a[0], dz = e.b[1] - e.a[1];
    const yaw = Math.atan2(dx, dz), nx = dz / e.len, nz = -dx / e.len;
    const n = Math.floor(e.len / 6.5);
    // skip features straddling a gate frame: the Addison gate (x span) or, on the
    // diagonal, Gate D (radial distance — the chord is not axis-aligned)
    const nearGate = (px, pz) =>
      (kind === 'addison' && Math.abs(px - S.gates.addison.x) < 4.5) ||
      (kind === 'secorner' && Math.hypot(px - S.gates.gateD.x, pz - S.gates.gateD.z) < 4.5);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.7) / (n + 0.4), tw = (k + 0.2) / (n + 0.4);   // windows off the arch axis
      const x = e.a[0] + dx * t - nx * 0.12, z = e.a[1] + dz * t - nz * 0.12;   // proud of the face
      if (!nearGate(x, z)) arches.push({ pos: [x, 0, z], yaw });
      const wx = e.a[0] + dx * tw - nx * 0.12, wz = e.a[1] + dz * tw - nz * 0.12;
      if (!nearGate(wx, wz)) {
        wins.push({ pos: [wx, 5.4, wz], yaw });                      // second storey
        if (HMAP[kind] > 13) wins.push({ pos: [wx, 10.6, wz], yaw }); // third storey on the tall faces
      }
      // (f) arched-window band riding the pressbox band's outer face (postcard 65902 crown)
      const cwt = (k + 0.5) / (n + 0.4);
      wins.push({ pos: [e.a[0] + dx * cwt + nx * 1.68, 18.3, e.a[1] + dz * cwt + nz * 1.68], yaw, scale: [1.15, 1.1, 1] });
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
    const cr = A.r - 1.68;                                         // crown windows ride the inset pressbox band
    for (let k = 0; k < 5; k++) {                                   // 5 upper window columns, two storeys
      const a = A.a0 + sweep * (k + 0.5) / 5;
      wins.push({ pos: [px(a), 5.4, pz(a)], yaw: oyaw(a) });
      wins.push({ pos: [px(a), 10.6, pz(a)], yaw: oyaw(a) });
      wins.push({ pos: [A.cx + cr * Math.cos(a), 18.3, A.cz + cr * Math.sin(a)], yaw: oyaw(a), scale: [1.15, 1.1, 1] });  // (f) crown
    }
  }
  inst(archGeo, toon(0x2a4438), arches);
  inst(winGeo, toon(0x33503f), wins);

  // red-white-blue bunting swags under the cornice (S + plaza faces + the curve)
  const bunt = [];
  edges.forEach((e, i) => {
    const kind = KINDS[i];
    if (!(kind === 'addison' || kind === 'secorner' || kind === 'plazaE')) return;
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

// -------------------------- box-office signage -------------------------
// The ticket-office mass closing the wedge's south end names itself in the
// ballpark house style (Cubs-green field, cream double pinstripe — same recipe
// as teaserTex / the real GATES boards): 'WRIGLEY FIELD / TICKET OFFICE' on the
// plaza face, 'TICKETS' on the Clark face. Both static → baked into the shared
// wrigley atlas by atlasPlane (+0 draw calls).
function boxSignTex(w, h, big, sub) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  g.fillStyle = '#1c4a35'; g.fillRect(0, 0, w, h);                                       // Cubs-green field
  const m = h * 0.055;
  g.strokeStyle = '#f2ece0'; g.lineWidth = h * 0.028; g.strokeRect(m, m, w - 2 * m, h - 2 * m);            // cream pinstripe frame
  g.lineWidth = h * 0.011; g.strokeRect(m * 1.9, m * 1.9, w - 3.8 * m, h - 3.8 * m);                       // doubled inner line
  g.fillStyle = '#f6f1e6'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const fit = (t, y, cap, maxw) => { let fs = cap; g.font = `800 ${fs}px Georgia,serif`; while (g.measureText(t).width > maxw && fs > 12) { fs -= 2; g.font = `800 ${fs}px Georgia,serif`; } g.fillText(t, w / 2, y); };
  if (sub) { fit(big, h * 0.42, h * 0.4, w * 0.84); fit(sub, h * 0.76, h * 0.22, w * 0.66); }   // WRIGLEY FIELD over TICKET OFFICE
  else fit(big, h * 0.54, h * 0.5, w * 0.8);                                                    // single line (TICKETS)
  return new THREE.CanvasTexture(cv);
}
function boxOfficeSigns() {
  // a) plaza (notchS) face — outer wall face sits at z≈−446.05; 0.09 proud, faces north
  const a = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.8),
    bmat(0xffffff, { map: boxSignTex(768, 192, 'WRIGLEY FIELD', 'TICKET OFFICE') }));
  a.position.set(-283.9, 7.0, -446.14); a.rotation.y = Math.PI;
  atlasPlane(a, false);
  // b) Clark (clark) face — mid-edge, 0.75 m proud along the outward (west) normal
  const b = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.2),
    bmat(0xffffff, { map: boxSignTex(384, 128, 'TICKETS', null) }));
  b.position.set(-286.96, 5.6, -436.38); b.rotation.y = Math.atan2(-0.9627, 0.2699);
  atlasPlane(b, false);
}
// SE-corner (task 020) ballpark signage so a Chicagoan reads the corner instantly:
// a green WRIGLEY FIELD / GATE D board above Gate D on the angled diagonal, and a
// small TICKETS board on the first diagonal chord near the Addison end. Both static
// → baked into the shared wrigley atlas by atlasPlane (+0 draw calls).
function seCornerSigns() {
  const gd = S.gates.gateD, ox = Math.sin(gd.yaw), oz = Math.cos(gd.yaw);   // gate outward dir
  const board = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.8),
    bmat(0xffffff, { map: boxSignTex(768, 192, 'WRIGLEY FIELD', 'GATE D') }));
  // 0.5 proud: the green steel columns sit ~0.12 proud with 0.55 depth — the
  // board mounts on standoffs IN FRONT of them, else a column bisects the letters
  board.position.set(gd.x + ox * 0.5, 6.9, gd.z + oz * 0.5); board.rotation.y = gd.yaw;
  atlasPlane(board, false);
  // first diagonal chord (−238,−414)→(−229,−418): outward normal (0.406, 0.914)
  const tnx = 0.406, tnz = 0.914;
  const tix = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.2),
    bmat(0xffffff, { map: boxSignTex(384, 128, 'TICKETS', null) }));
  tix.position.set(-233.5 + tnx * 0.12, 5.4, -415.8 + tnz * 0.12); tix.rotation.y = Math.atan2(tnx, tnz);
  atlasPlane(tix, false);
}

// ------------------------------ gates ----------------------------------
// Gate TEASER placard (task 017) — a green ballpark notice on the CLOSED gate
// doors hinting the interior opens SOMEDAY (owner directive 2026-07-09; "hint,
// don't promise a date"). Ballpark voice, deliberately NOT the lakefront's
// literal 'FUTURE ENTRANCE →' gag (the lakefront gag; removed in task 030, 2026-07-10).
// Green field + cream pinstripe like the real GATES 4&5 boards (IMG_2333 /
// 47996783347); red 'COMING SOON' ribbon ties the four winks into one set.
// Baked into the shared wrigley atlas by gateAt → +0 draw calls.
function teaserTex(l1, l2, wink, ribbon = 'C O M I N G   S O O N') {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 224;
  const g = cv.getContext('2d');
  g.fillStyle = '#1c4a35'; g.fillRect(0, 0, 512, 224);                       // Cubs-green field
  g.strokeStyle = '#f2ece0'; g.lineWidth = 5; g.strokeRect(9, 9, 494, 206);  // cream pinstripe frame
  g.lineWidth = 1.6; g.strokeRect(16, 16, 480, 192);                         // doubled inner line
  g.fillStyle = '#b0202c'; g.fillRect(24, 24, 464, 38);                      // Cubs-red header ribbon
  g.fillStyle = '#f6f1e6'; g.textAlign = 'center'; g.textBaseline = 'middle';
  { let fs = 23; g.font = `700 ${fs}px Georgia,serif`;                       // ribbon shrink-to-fit
    while (g.measureText(ribbon).width > 440 && fs > 12) { fs -= 1; g.font = `700 ${fs}px Georgia,serif`; }
    g.fillText(ribbon, 256, 44); }
  const fit = (t, y) => { let fs = 48; g.font = `800 ${fs}px Georgia,serif`; while (g.measureText(t).width > 446 && fs > 22) { fs -= 2; g.font = `800 ${fs}px Georgia,serif`; } g.fillText(t, 256, y); };
  g.fillStyle = '#f6f1e6'; fit(l1, 103); fit(l2, 151);                       // the big tease, two lines
  g.fillStyle = '#cfe0c8'; g.font = 'italic 600 23px Georgia,serif';         // sage wink line
  g.fillText(wink, 256, 197);
  return new THREE.CanvasTexture(cv);
}
function gateAt(x, z, yaw, label, wide = 4.4, teaser = null) {
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
  // teaser placard on the doors — width clamped to the door face (wide-0.6)
  // with >=0.3 m margin per issue 001; eye-level, proud of the door face (0.64).
  let teaserMesh = null;
  if (teaser) {
    const pw = Math.min(wide - 1.2, 2.6), ph = pw * 224 / 512;
    teaserMesh = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph),
      bmat(0xffffff, { map: teaserTex(teaser.big[0], teaser.big[1], teaser.wink, teaser.ribbon) }));
    teaserMesh.position.set(0, 1.98, 0.72); grp.add(teaserMesh);
  }
  grp.position.set(x, 0, z); grp.rotation.y = yaw;
  grp.updateMatrixWorld(true); atlasPlane(sign, false);   // gate sign -> shared wrigley atlas (detaches from grp)
  if (teaserMesh) atlasPlane(teaserMesh, false);          // teaser -> same atlas (detaches; +0 draw calls)
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
      uv.push(0.5 + (dx * vx + dz * vz) / 160, 0.5 + (dx * ux + dz * uz) / 160);
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

  // grandstand: two stepped tiers wrapping BACK ±2.0 rad, pip-clipped.
  // inClear: insidePoly's inset MOVES the point toward HP, so alone it accepts
  // points ~inset OUTSIDE the wall (PITFALLS) — upper-deck seat rows floated
  // over the Gallagher plaza at the notch (walk-past splash-pass-d, task 012).
  // Require strict containment AND the clearance inset.
  const inClear = (x, z, c) => pip(x, z, POLY) && insidePoly(x, z, c);
  // slabOK: a yaw-a arc slab is a BOX — its center passing inClear still lets
  // its radially-deep body (local z) or tangential span (local x) poke through
  // an oblique facade (bleacher ends stuck out of the Sheffield brick,
  // marker-355-truth.png). Test the outer radial end + both tangential ends.
  const slabOK = (x, z, a, radH, tanH, clear) =>
    inClear(x, z, clear)
    && pip(x + Math.sin(a) * radH, z + Math.cos(a) * radH, POLY)
    && pip(x + Math.cos(a) * tanH, z - Math.sin(a) * tanH, POLY)
    && pip(x - Math.cos(a) * tanH, z + Math.sin(a) * tanH, POLY);
  const lowRows = 8, upRows = 6, seats = [], crowd = [];
  const addArc = (rows, r0, y0, dy, dr) => {
    for (let ri = 0; ri < rows; ri++) {
      const r = r0 + ri * dr, y = y0 + ri * dy;
      const n = Math.max(10, Math.round(r * 4.0 / 3.1));
      for (let k = 0; k <= n; k++) {
        const a = BACK - 2.0 + (k / n) * 4.0;
        const x = HP[0] + Math.sin(a) * r, z = HP[1] + Math.cos(a) * r;
        if (!slabOK(x, z, a, 1.6, 0.8, 2.2)) continue;
        seats.push({ pos: [x, y, z], yaw: a, scale: [1, 1, 3.15] });
        const hx = x + rr(-0.5, 0.5), hz = z + rr(-0.9, 0.9);
        if (R() < 0.4 && slabOK(hx, hz, a, 0.35, 0.35, 2.2)) crowd.push([hx, y + 0.62, hz]);   // head radius too — slivers showed in the Sheffield wall face
      }
    }
  };
  addArc(lowRows, 13, 1.1, 0.62, 1.4);
  addArc(upRows, 18.5, 10.2, 0.78, 1.35);     // upper deck rides the taller shell
  inst(new THREE.BoxGeometry(1.5, 0.5, 1), toon(0x2f5544), seats);
  // upper-deck fascia + roof ring (instanced arc slabs)
  const fascia = [], roof = [];
  // roof/fascia ring: only place a slab when the WHOLE radial extent is inside the
  // footprint (both extremes + center), so slabs never float over the plaza notch
  // or past a facade edge at low angles (wv-gallagher-way f2 / wv-rooftop-view).
  const rad = (a, r) => [HP[0] + Math.sin(a) * r, HP[1] + Math.cos(a) * r];
  { const n = 48;
    for (let k = 0; k <= n; k++) {
      const a = BACK - 2.0 + (k / n) * 4.0;
      const [fx, fz] = rad(a, 17.8);
      if (slabOK(fx, fz, a, 1.5, 0.25, 2))
        fascia.push({ pos: [fx, 9.3, fz], yaw: a, scale: [1, 1, 2.9] });
      const [rxp, rzp] = rad(a, 23);                     // slab: radial half 1.85 (z·3.7), tangential half 4.75 (x 9.5)
      if (slabOK(rxp, rzp, a, 1.9, 4.8, 1))
        roof.push({ pos: [rxp, 19.5, rzp], yaw: a, rx: 0.16, scale: [1, 1, 3.7] });
    }
  }
  inst(new THREE.BoxGeometry(0.4, 1.5, 1), toon(0x24443a), fascia);
  inst(new THREE.BoxGeometry(9.5, 0.35, 1), toon(DARKROOF), roof);

  // ivy outfield wall: arc r 56 about HP, ±0.72 rad around AXIS
  const ivy = ivyTex();
  const wallSegs = [], caps = [];
  { const n = 34;
    for (let k = 0; k < n; k++) {
      const a = AXIS - 0.72 + ((k + 0.5) / n) * 1.44;
      const x = HP[0] + Math.sin(a) * 74, z = HP[1] + Math.cos(a) * 74;
      if (!pip(x, z, POLY)) continue;
      wallSegs.push({ pos: [x, 1.75, z], yaw: a + Math.PI / 2, scale: [1, 1, 1] });
      caps.push({ pos: [x, 3.62, z], yaw: a + Math.PI / 2, scale: [1, 1, 1] });
    }
  }
  inst(new THREE.BoxGeometry(4.3, 3.5, 0.8), toon(0xffffff, { mat: { map: ivy } }), wallSegs);   // overlap: arc fans the edges open
  inst(new THREE.BoxGeometry(4.35, 0.24, 0.9), toon(0x6b7d5a), caps);
  // foul poles (yellow) — probe each foul line out to the wall so the RF pole
  // lands on the near Sheffield face (short RF) while LF reaches the deep
  // corner. Inset 0.5 keeps the pole ITSELF at the wall (a 3.0 inset let the
  // RF pole overshoot ~2.5 m into the Sheffield sidewalk — run mrdlw8gt).
  const fp = [];
  for (const da of [-0.72, 0.72]) {
    const a = AXIS + da, sx = Math.sin(a), cz = Math.cos(a);
    let r = 40, last = 40;
    while (r <= 73.4 && insidePoly(HP[0] + sx * r, HP[1] + cz * r, 0.5)) { last = r; r += 0.5; }
    fp.push({ pos: [HP[0] + sx * last, 5.5, HP[1] + cz * last] });
  }
  inst(new THREE.CylinderGeometry(0.18, 0.20, 11, 7), toon(0xf2d24a), fp);   // thicker + brighter yellow (village cornhole color — cached)

  // yellow distance markers on the ivy brick (field side, facing home plate) —
  // readable from the bleacher/rooftop over the LF wall. LF is the WAVELAND
  // side = AXIS + 0.5 (AXIS − 0.5 is right field, where the r-74 arc exits the
  // footprint and a marker would float in Sheffield street — task 012). Guard:
  // only mount where the wall itself stands (same pip test as wallSegs).
  const distMark = (a, txt) => {
    if (!pip(HP[0] + Math.sin(a) * 74, HP[1] + Math.cos(a) * 74, POLY)) return;   // no wall segment here → no marker
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 96;
    const g = cv.getContext('2d');
    g.fillStyle = '#f2d24a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 66px Arial,sans-serif'; g.fillText(txt, 64, 52);           // yellow stencil digits on transparent
    const x = HP[0] + Math.sin(a) * 73.45, z = HP[1] + Math.cos(a) * 73.45;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5), bmat(0xffffff, { map: new THREE.CanvasTexture(cv), transparent: true }));
    m.position.set(x, 2.9, z); m.rotation.y = a + Math.PI;                   // face home plate
    atlasPlane(m, true);
  };
  distMark(AXIS + 0.5, '355');   // LF power alley (Waveland side)
  distMark(AXIS, '400');         // straightaway center

  // bleachers behind the ivy: rising arcs r 57.5 → 68
  const bl = [];
  for (let ri = 0; ri < 7; ri++) {
    const r = 75.5 + ri * 1.75, y = 3.9 + ri * 0.62;
    const n = Math.round(r * 1.44 / 3.0);
    for (let k = 0; k <= n; k++) {
      const a = AXIS - 0.66 + (k / n) * 1.32;
      const x = HP[0] + Math.sin(a) * r, z = HP[1] + Math.cos(a) * r;
      if (!slabOK(x, z, a, 1.55, 0.8, 1.2)) continue;
      bl.push({ pos: [x, y, z], yaw: a, scale: [1, 1, 3.05] });
      if (R() < 0.5) { const hx = x + rr(-0.5, 0.5), hz = z + rr(-1.2, 1.2);
        if (slabOK(hx, hz, a, 0.35, 0.35, 1.2)) crowd.push([hx, y + 0.62, hz]); }
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
  // BACK face (seen from the Waveland rooftops / wv-scoreboard): round clock + line-score panel
  const clockPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 2.7), bmat(0xffffff, { map: backClockTex() }));
  clockPlane.position.set(0, topY - 2.0, -0.9); clockPlane.rotation.y = Math.PI; grp.add(clockPlane);
  const scorePlane = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.5), bmat(0xffffff, { map: backScoreTex() }));
  scorePlane.position.set(0, topY - 5.2, -0.9); scorePlane.rotation.y = Math.PI; grp.add(scorePlane);
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
  atlasPlane(clockPlane, false); atlasPlane(scorePlane, false);   // back-face clock + line score (matrixWorld already updated)
  wrigleyRoot.add(grp);
}

// --------------------------- light towers ------------------------------
function buildTowers() {
  const towers = [];
  // across the grandstand roof arc (plaza notch clips the WNW candidates)
  for (const da of [-1.35, -0.9, -0.35, 0.35, 1.1, 1.7]) {
    const a = BACK + da, r = 21;
    const x = HP[0] + Math.sin(a) * r, z = HP[1] + Math.cos(a) * r;
    if (pip(x, z, POLY) && insidePoly(x, z, 1.5)) towers.push({ x, z, base: 20, yaw: a - Math.PI });   // on the raised roof (strict containment — inset alone accepts outside points, PITFALLS)
  }
  for (const da of [-0.52, 0.52]) {
    const a = AXIS + da, r = 78;
    const x = HP[0] + Math.sin(a) * r, z = HP[1] + Math.cos(a) * r;
    if (pip(x, z, POLY) && insidePoly(x, z, 1)) towers.push({ x, z, base: 8.6, mast: 12, yaw: a - Math.PI });  // bleacher wings reach higher
  }
  const mastG = new THREE.CylinderGeometry(0.2, 0.38, 7.6, 6).translate(0, 3.8, 0);
  const wingMastG = new THREE.CylinderGeometry(0.24, 0.46, 12, 6).translate(0, 6, 0);
  // wide white lattice bank (merged into ONE geometry; instanced 8x by the headG inst() below — +0 draws)
  const bank = [];
  bank.push(new THREE.BoxGeometry(7.0, 0.22, 0.24).translate(0, 1.25, 0));    // top chord
  bank.push(new THREE.BoxGeometry(7.0, 0.22, 0.24).translate(0, -1.25, 0));   // bottom chord
  for (const vx of [-3.4, -1.7, 0, 1.7, 3.4]) bank.push(new THREE.BoxGeometry(0.18, 2.5, 0.18).translate(vx, 0, 0));  // 5 verticals
  for (const bx of [-2.55, -0.85, 0.85, 2.55]) {                              // X-diagonals, two per bay
    bank.push(new THREE.BoxGeometry(0.13, 2.9, 0.13).rotateZ(0.6).translate(bx, 0, 0));
    bank.push(new THREE.BoxGeometry(0.13, 2.9, 0.13).rotateZ(-0.6).translate(bx, 0, 0));
  }
  bank.push(new THREE.BoxGeometry(6.6, 0.34, 0.34).translate(0, 1.62, 0));    // lamp bar on the top chord
  bank.push(new THREE.BoxGeometry(0.14, 1.6, 0.14).rotateZ(0.55).translate(2.3, -1.9, 0));    // curved-brace hint
  bank.push(new THREE.BoxGeometry(0.14, 1.6, 0.14).rotateZ(-0.55).translate(-2.3, -1.9, 0));
  const headG = mergeGeos(bank).translate(0, 0.55, 0);                        // sit a touch prouder over the crown
  inst(mastG, toon(0xdad5c8), towers.filter(t => !t.mast).map(t => ({ pos: [t.x, t.base, t.z], yaw: t.yaw })));
  inst(wingMastG, toon(0xdad5c8), towers.filter(t => t.mast).map(t => ({ pos: [t.x, t.base, t.z], yaw: t.yaw })));
  inst(headG, toon(0xc9c4b6), towers.map(t => ({ pos: [t.x, t.base + (t.mast || 7.6) + 0.6, t.z], yaw: t.yaw })));
  // glow banks
  const pts = [];
  towers.forEach(t => {
    const hy = t.base + (t.mast || 7.6) + 0.6;
    for (let i = -2; i <= 2; i++) {
      const ox = Math.cos(t.yaw) * i * 1.3, oz = -Math.sin(t.yaw) * i * 1.3;
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
  // WAVELAND (left-field) face: opening x0..x1 at z −548; the wall's street (north)
  // side is ~z −548.05, so everything sits proud to the NORTH, facing Waveland.
  const K = S.knothole, cx = (K.x0 + K.x1) / 2, W = Math.abs(K.x1 - K.x0), zf = -548.6;
  const frame = [];
  for (const oy of [0.15, 3.3]) { const g = new THREE.BoxGeometry(W + 0.6, 0.3, 0.5); g.translate(cx, oy, zf + 0.05); frame.push(g); }   // top + bottom rails (along x)
  for (const ox of [K.x0 - 0.15, K.x1 + 0.15]) { const g = new THREE.BoxGeometry(0.3, 3.5, 0.5); g.translate(ox, 1.75, zf + 0.05); frame.push(g); } // side posts
  wrigleyRoot.add(new THREE.Mesh(mergeGeos(frame), toon(0x2a4438)));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(W, 3.1),
    bmat(0x16281f, { transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
  screen.rotation.y = Math.PI;                              // faces north into the Waveland street
  screen.position.set(cx, 1.72, zf);
  wrigleyRoot.add(screen);
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 36;
  const g = cv.getContext('2d');
  g.fillStyle = '#a91f2e'; g.fillRect(0, 0, 320, 36);
  g.fillStyle = '#f2ece0'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const label = 'KNOTHOLE — WATCH FREE, BE KIND';
  let fs = 20; g.font = `700 ${fs}px Georgia,serif`;
  while (g.measureText(label).width > 306 && fs > 9) { fs -= 1; g.font = `700 ${fs}px Georgia,serif`; }   // fit the full text
  g.fillText(label, 160, 19);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 4.8 * 36 / 320), bmat(0xffffff, { map: new THREE.CanvasTexture(cv) }));
  sign.rotation.y = Math.PI; sign.position.set(cx, 3.75, -548.75);
  atlasPlane(sign, false);   // knothole sign -> shared wrigley atlas
}

// ---------------------------- gate aprons ------------------------------
// The signature Wrigley red-brick ground treatment the gates open onto:
// the marquee-corner crescent, the Caray plaza, and the Gallagher pad.
// ONE brick material, ONE merged mesh (+1 draw call — walkability is the
// data's job; these are visual). Running-bond canvas, world-metre UVs.
function brickTex() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
  const g = cv.getContext('2d');
  const BR = mulberry32(20090709);                             // DEDICATED rng — never touches the file's R
  const pal = ['#8a4436', '#7d3b2f', '#96503c', '#83452f'];    // warm brick palette
  g.fillStyle = '#c9b49a'; g.fillRect(0, 0, 128, 128);         // mortar bed
  const bw = 32, bh = 16, gap = 1.5;                           // 8 courses × 16px; half-brick running bond
  for (let row = 0; row < 8; row++) {
    const oy = row * bh, off = (row % 2) * (bw / 2);
    for (let bx = -bw; bx < 128 + bw; bx += bw) {
      const x = bx + off;
      g.fillStyle = pal[BR() * pal.length | 0];
      g.fillRect(x + gap, oy + gap, bw - gap * 2, bh - gap * 2);
      g.fillStyle = `rgba(0,0,0,${BR() * 0.12})`;              // slight per-brick tone jitter
      g.fillRect(x + gap, oy + gap, bw - gap * 2, bh - gap * 2);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.repeat.set(1 / 2.4, 1 / 2.4);                            // one tile = 2.4 m (UVs are world metres)
  return tex;
}
function buildAprons() {
  const A = CORNER_ARC, geos = [];
  // shapes live in the (x, −z) plane so rotateX(−90°) maps (px,py) → (px,0,−py)
  // with the normal +y; wound CCW so the up-face survives front-side culling.
  // a. marquee crescent — the fillet triangle MINUS the corner-arc circle
  { const t = APRONS_W.marquee.tri, s = new THREE.Shape();
    s.moveTo(t[0][0], -t[0][1]);
    s.lineTo(t[1][0], -t[1][1]);
    s.lineTo(t[2][0], -t[2][1]);
    for (let i = 1; i <= 12; i++) {                            // close back along the arc a1 → a0 (the concave bite)
      const a = A.a1 + (A.a0 - A.a1) * i / 12;
      s.lineTo(A.cx + A.r * Math.cos(a), -(A.cz + A.r * Math.sin(a)));
    }
    s.closePath(); geos.push(new THREE.ShapeGeometry(s));
  }
  // b. Caray plaza — the Bleacher-Gate chamfer triangle
  { const t = APRONS_W.bleacher.tri, s = new THREE.Shape();
    s.moveTo(t[0][0], -t[0][1]);
    s.lineTo(t[1][0], -t[1][1]);
    s.lineTo(t[2][0], -t[2][1]);
    s.closePath(); geos.push(new THREE.ShapeGeometry(s));
  }
  // c. Gallagher pad — the plaza rect (axis-aligned, tucked under the wedge wall)
  { const P = APRONS_W.gallagher, s = new THREE.Shape();
    s.moveTo(P.x0, -P.z1);                                     // wound CCW: NW → NE → SE → SW
    s.lineTo(P.x1, -P.z1);
    s.lineTo(P.x1, -P.z0);
    s.lineTo(P.x0, -P.z0);
    s.closePath(); geos.push(new THREE.ShapeGeometry(s));
  }
  // d. SE corner court (task 020) — the red-brick court the angled bowl opens at
  // Sheffield & Addison. APRONS_W.secorner.poly is CW in the (x,−z) plane, so walk
  // it in REVERSE → CCW, keeping the up-face after rotateX(−90°) (see comment above).
  { const P = APRONS_W.secorner.poly, s = new THREE.Shape();
    s.moveTo(P[P.length - 1][0], -P[P.length - 1][1]);
    for (let i = P.length - 2; i >= 0; i--) s.lineTo(P[i][0], -P[i][1]);
    s.closePath(); geos.push(new THREE.ShapeGeometry(s));
  }
  const geo = mergeGeos(geos); geo.rotateX(-Math.PI / 2);      // ShapeGeometry UVs stay world metres for tex.repeat
  const mesh = new THREE.Mesh(geo, toon(0xffffff, { mat: { map: brickTex() } }));
  mesh.position.y = 0.06;                                      // flush-proud of the 0.055 sidewalk slab tops
  wrigleyRoot.add(mesh);
}

// ----------------------- banner + rooftop flag ring --------------------
// 'WELCOME TO THE FRIENDLY CONFINES' green banner band over the Addison gate.
function friendlyConfinesBanner() {
  const cv = document.createElement('canvas'); cv.width = 768; cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#1e4d38'; g.fillRect(0, 0, 768, 64);          // Cubs green field
  g.strokeStyle = '#e9e2d0'; g.lineWidth = 3; g.strokeRect(5, 5, 758, 54);   // thin cream border
  g.fillStyle = '#efe8d6'; g.textBaseline = 'middle'; g.font = '700 30px Georgia,serif';
  const txt = 'WELCOME TO THE FRIENDLY CONFINES', extra = 4;   // letter tracking like the ref
  const ws = [...txt].map(c => g.measureText(c).width + extra), total = ws.reduce((s, w) => s + w, 0) - extra;
  let x = 384 - total / 2; g.textAlign = 'left';
  for (let i = 0; i < txt.length; i++) { g.fillText(txt[i], x, 34); x += ws[i]; }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 0.72), bmat(0xffffff, { map: new THREE.CanvasTexture(cv) }));
  m.position.set(S.gates.addison.x, 5.95, -413.5); m.rotation.y = 0;   // rides above the gate frame (top 5.2), clear of the pent gap
  atlasPlane(m, false);
}

// Mirror-safe flag faces (atlas is DoubleSide → no letters/digits).
function flagTex(kind) {
  const cv = document.createElement('canvas'); cv.width = 96; cv.height = 64;
  const g = cv.getContext('2d');
  const star6 = (sx, sy, r) => {                               // six-point star
    g.beginPath();
    for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + i * Math.PI / 6, rr2 = i % 2 ? r * 0.5 : r; const px = sx + Math.cos(a) * rr2, py = sy + Math.sin(a) * rr2; i ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.closePath(); g.fill();
  };
  if (kind === 'chicago') {                                    // CHICAGO CITY FLAG — the signature cue
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 96, 64);
    g.fillStyle = '#5aa9dd'; g.fillRect(0, 13, 96, 9); g.fillRect(0, 42, 96, 9);   // two light-blue stripes
    g.fillStyle = '#c8102e'; for (let i = 0; i < 4; i++) star6(15 + i * 22, 32, 8); // four red six-point stars
  } else if (kind === 'illinois') {                            // white field, tan/olive eagle-seal disc
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 96, 64);
    g.fillStyle = '#9a8b52'; g.beginPath(); g.arc(48, 32, 20, 0, 7); g.fill();
    g.fillStyle = '#7d7040'; g.beginPath(); g.arc(48, 32, 12, 0, 7); g.fill();
  } else if (kind === 'cubs') {                                // royal blue, red-ringed white roundel
    g.fillStyle = '#0e3386'; g.fillRect(0, 0, 96, 64);
    g.fillStyle = '#c8102e'; g.beginPath(); g.arc(48, 32, 19, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(48, 32, 12, 0, 7); g.fill();
  } else {                                                     // solid swallowtail pennant (transparent notch)
    g.fillStyle = kind === 'red' ? '#c8102e' : '#0e3386';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(96, 0); g.lineTo(70, 32); g.lineTo(96, 64); g.lineTo(0, 64); g.closePath(); g.fill();
  }
  return new THREE.CanvasTexture(cv);
}

// White flagpoles along the marquee-corner crown, tilted OUTWARD over the street
// (IMG_2333). Poles merge into the cornice-color mesh; flags ride the shared atlas.
function buildFlagRing() {
  const A = CORNER_ARC, sweep = A.a1 - A.a0;
  const oyaw = a => Math.atan2(Math.cos(a), Math.sin(a));
  const designs = ['red', 'illinois', 'chicago', 'cubs', 'blue'];   // center pole = CHICAGO (signature), most legible
  const poles = [];
  for (let k = 0; k < 5; k++) {
    const a = A.a0 + sweep * (k + 0.5) / 5;
    const geo = new THREE.CylinderGeometry(0.05, 0.05, 3.4, 6).translate(0, 1.7, 0);
    geo.rotateX(0.55); geo.rotateY(oyaw(a));                  // lean the tip radially outward
    geo.translate(A.cx + 16.0 * Math.cos(a), 22.4, A.cz + 16.0 * Math.sin(a));  // base just inside the band (outer face r≈16.2)
    poles.push(geo);
    const tx = A.cx + 17.78 * Math.cos(a), tz = A.cz + 17.78 * Math.sin(a);     // pole tip (base + 3.4·dir)
    const d = designs[k], alpha = (d === 'red' || d === 'blue');               // swallowtails need the transparent notch
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.75).translate(0.5, -0.35, 0),
      bmat(0xffffff, { map: flagTex(d), transparent: alpha }));
    flag.position.set(tx, 25.3, tz); flag.rotation.y = oyaw(a);                // broad side faces the street
    atlasPlane(flag, alpha);
  }
  wrigleyRoot.add(new THREE.Mesh(mergeGeos(poles), toon(0xbfb7a6)));           // cornice color → merges free
}

// ------------------------------- build ---------------------------------
export function buildStadium() {
  buildFacades();
  buildAprons();
  buildMarquee();
  buildBowl();
  buildScoreboard();
  buildTowers();
  buildKnothole();
  boxOfficeSigns();                                              // ticket-office marquee signs on the wedge's box-office mass
  // gates sit ON the wall plane (data points are logical spots; the wall
  // face is what the street sees). The Gallagher gate rides the wedge's BOWL
  // WALL: at z −490 the wall runs (−283.0,−500)→(−282.4,−478); its outward
  // (west, toward the plaza) unit normal is (−0.99963, 0.02726).
  const gx = S.gates.gallagher.x, gz = S.gates.gallagher.z;
  const gnx = -0.99963, gnz = 0.02726, gYaw = Math.atan2(gnx, gnz);   // faces the plaza
  // task 055: the Marquee Gate is an HONEST DOOR now — the 017 teaser kept
  // its promise. OPEN HOUSE placard (same green house style, new ribbon);
  // the interaction lives in packs/wrigley-bowl.js.
  gateAt(S.gates.marquee.x, S.gates.marquee.z, S.gates.marquee.yaw, 'MARQUEE GATE', 4.4, // on the curve apex
    { big: ['GATES OPEN', 'TODAY'], wink: 'tickets at the box office', ribbon: 'O P E N   H O U S E' });
  gateAt(gx - gnx * 0.42, gz - gnz * 0.42, gYaw, 'GALLAGHER WAY GATE', 4.4, // recessed 0.42 into the bowl wall
    { big: ['WALK THE', 'WARNING TRACK'], wink: 'enter at the Marquee Gate', ribbon: 'T H E   I V Y   I S   I N' });
  gateAt(-212.28, -537.72, S.gates.bleacher.yaw, 'BLEACHERS', 7, // hero gate on the chamfer, Caray plaza in front
    { big: ['TAKE YOUR SEAT', 'IN THE BLEACHERS'], wink: 'save us a spot' });
  gateAt(S.gates.addison.x, S.gates.addison.z, S.gates.addison.yaw, 'ADDISON GATE', 4.4, // south face, mid-block (outer face z≈−413.95)
    { big: ['BALLPARK TOURS', 'RETURN SOON'], wink: 'watch this gate' });
  gateAt(S.gates.gateD.x, S.gates.gateD.z, S.gates.gateD.yaw, 'GATE D', 4.4, // SE-corner diagonal — the real RF corner gate, faces the Sheffield & Addison intersection (data pt sits ~0.12 m proud of the wall line)
    { big: ['RIGHT FIELD', 'RETURNS SOON'], wink: 'ballhawks, hold your spot' });
  friendlyConfinesBanner();                                       // green banner band over the Addison gate
  seCornerSigns();                                                // SE-corner Gate D board + TICKETS board
  buildFlagRing();                                                // rooftop flag ring above the marquee
  // marquee-side booth now lives in wrigley-vendors.js (the ticket queue owns it)
  ticketBooth(gallagherWallX(-487) + gnx * 1.06, -487 + gnz * 1.06, gYaw);
}
