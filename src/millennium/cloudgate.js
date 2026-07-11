// =====================================================================
// THE BEAN — Cloud Gate HOMAGE on AT&T Plaza (task 043).
// Owner register (BRIEF/LOCATIONS): Cloud Gate is a copyrighted artwork —
// this is a chunky toon caricature that EVOKES it, never replicates it:
// a hand-modeled squashed lozenge (deformed sphere BufferGeometry — no
// traced/imported geometry), and the mirror finish is PAINTED — a canvas
// wrap of stylized reflection: dusk sky above, an upside-down Michigan Ave
// streetwall band at the waist, warm plaza + tiny toon figures below, an
// omphalos swirl at the navel. NO CubeCamera/envMap, ever (perf + the
// painted read IS the homage register). bmat (self-lit) so the shell reads
// as a mirror holding the dusk — the acceptance's sanctioned escape from
// the toon ramp.
//
// Geometry law: GEOGRAPHY.md MILLENNIUM_GEOGRAPHY + data CLOUD_GATE_M —
// 1:1 object scale 13 x 20 x h 10, long axis N-S, the plaza CONTINUOUS
// under the E-W arch; the two ground-contact lobes are the only colliders.
// =====================================================================
import * as THREE from 'three';
import { millenniumRoot } from './index.js';
import { toon, bmat, mulberry32 } from '../core.js';
import { collide } from '../props.js';
import * as M from '../data/millennium.js';

const rr = mulberry32(0xbea7 ^ M.SEED_M);   // local rng — texture scatter only

// ----------------------------- the shell -------------------------------
// Deformed sphere: ellipsoid 13 x 20 x 10, lower hemisphere blended onto a
// soffit surface S(x,z) = E-W arch + upturned edges + omphalos dome. The
// blend grounds the two contact lobes at local z ±5.5 (data legs) and
// opens the walk-under arch between them.
function beanGeometry() {
  const B = M.CLOUD_GATE_M.bean;
  const RX = (B.x1 - B.x0) / 2, RZ = (B.z1 - B.z0) / 2, H = B.h;
  const AH = M.CLOUD_GATE_M.archHalf;                  // arch half-span (z)
  const soffit = (x, z) => {
    const az = Math.abs(z);
    const arch = az < AH ? 3.7 * Math.pow(Math.cos(Math.PI * z / (2 * AH)), 1.15) : 0;
    const curl = (x / RX) * (x / RX) * (1.1 + 1.1 * Math.min(1, (az / AH) * (az / AH)));
    const omph = 1.15 * Math.exp(-(x * x + z * z) / 7);
    return arch + curl + omph;
  };
  // seam meridian at phiStart=PI faces EAST (the park treeline panel of the
  // wrap hides it; the west streetwall hero panel stays seam-free)
  const geo = new THREE.SphereGeometry(1, 56, 40, Math.PI);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const ux = pos.getX(i), uy = pos.getY(i), uz = pos.getZ(i);
    const x = ux * RX, z = uz * RZ;
    let y = (uy * 0.5 + 0.5) * H;
    if (uy > 0) y = H / 2 + (H / 2) * uy * (1 - 0.08 * uy * uy);   // gentle lozenge flatten on top
    else {
      const w = Math.pow(-uy, 1.5);                                // 0 at the waist -> 1 at the navel
      y = y * (1 - w) + soffit(x, z) * w;
    }
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

// ------------------------ the painted reflection ------------------------
// Wrap layout (u: 0=E, .25=N, .5=W, .75=S; v: canvas top = shell top):
// dusk sky -> bright horizon flash -> UPSIDE-DOWN city band (the Michigan
// cliff on the west face, the Randolph giants on the north, park trees +
// a Pritzker ribbon curl on the east, lower streetwall on the south) ->
// warm paver band with tiny toon figures -> omphalos swirl at the navel.
const W = 2048, H = 1024, HY = Math.round(H * 0.54);
function skyBand(g) {
  // SILVER first (the bean must read silver, not peach): cool silver-blue
  // zenith through pale steel, warmth arriving only near the horizon flash
  const grad = g.createLinearGradient(0, 0, 0, HY);
  grad.addColorStop(0, '#5e6884'); grad.addColorStop(0.4, '#98a2b6');
  grad.addColorStop(0.72, '#ced3da'); grad.addColorStop(0.9, '#eec9a4');
  grad.addColorStop(1, '#ffdcb0');
  g.fillStyle = grad; g.fillRect(0, 0, W, HY);
  g.fillStyle = 'rgba(255,246,234,0.22)';                          // soft dusk cloud streaks
  for (let i = 0; i < 7; i++) {
    const cx = rr() * W, cy = H * (0.08 + rr() * 0.3), rw = 130 + rr() * 220;
    g.beginPath(); g.ellipse(cx, cy, rw, 14 + rr() * 12, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse((cx + W * 0.5) % W, cy + 30, rw * 0.7, 12, 0, 0, 7); g.fill();
  }
  g.fillStyle = '#fff2da'; g.fillRect(0, HY - 5, W, 7);            // the horizon flash line
}
function bldg(g, x, w, hang, col, o = {}) {                        // one INVERTED building (hangs down)
  g.fillStyle = col; g.fillRect(x, HY, w, hang);
  if (o.win !== false) {
    g.fillStyle = 'rgba(255,212,148,0.9)';
    for (let yy = HY + 12; yy < HY + hang - 10; yy += 14)
      for (let xx = x + 7; xx < x + w - 8; xx += 12) if (rr() < 0.4) g.fillRect(xx, yy, 5, 7);
  }
  if (o.spire) { g.fillStyle = col; g.beginPath(); g.moveTo(x + w / 2 - 11, HY + hang);
    g.lineTo(x + w / 2 + 11, HY + hang); g.lineTo(x + w / 2, HY + hang + o.spire); g.fill(); }
  if (o.gable) { g.fillStyle = col; g.beginPath(); g.moveTo(x + 4, HY + hang);
    g.lineTo(x + w - 4, HY + hang); g.lineTo(x + w / 2, HY + hang + o.gable); g.fill(); }
  if (o.cols) { g.fillStyle = 'rgba(46,34,62,0.55)';               // colonnade slits
    for (let xx = x + 9; xx < x + w - 10; xx += 13) g.fillRect(xx, HY + hang * 0.3, 6, hang * 0.55); }
  if (o.fins) { g.fillStyle = 'rgba(255,250,240,0.4)';             // Aon bone-white fins
    for (let xx = x + 5; xx < x + w - 5; xx += 9) g.fillRect(xx, HY + 5, 3, hang - 12); }
  if (o.sign) { g.fillStyle = '#fff6e8'; g.fillRect(x + w * 0.22, HY + hang - 16, w * 0.56, 9); }
}
function trees(g, x0, x1) {                                        // inverted bosque lumps (wraps mod W)
  for (let x = x0; x < x1; x += 34 + rr() * 14) {
    const r = 13 + rr() * 11, cy = HY + 10 + rr() * 14;
    const cx = ((x % W) + W) % W, col = rr() < 0.5 ? '#46524a' : '#3f4652';
    g.fillStyle = col;
    g.fillRect(cx - 2, HY, 4, cy - HY);                            // trunk stub from the horizon
    g.beginPath(); g.arc(cx, cy + r * 0.6, r, 0, 7); g.fill();     // canopy hangs below it
  }
}
function cityBand(g) {
  g.fillStyle = '#5e4c6e'; g.fillRect(0, HY, W, 26);               // base parapet line all round
  // EAST (seam) + wrap: park treeline + a cream Pritzker ribbon curl (ENE — honest compass)
  trees(g, -160, 384); trees(g, 1900, 2048);
  g.strokeStyle = '#e9e1d3'; g.lineWidth = 8; g.lineCap = 'round';
  for (const [cx, r] of [[205, 38], [252, 28], [168, 24]]) {       // hug the horizon — long arcs
    g.beginPath(); g.arc(cx, HY + 14, r, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  }                                                                // smear into 'cracks' at grazing
  // NORTH: the Randolph giants — Pru sign slab, Two Pru diamond, Aon fins
  bldg(g, 398, 96, 150, '#584767', { sign: true });
  bldg(g, 505, 62, 172, '#4f3f60', { spire: 46 });
  bldg(g, 585, 84, 208, '#cfc4c6', { fins: true, win: false });
  bldg(g, 680, 70, 118, '#5a4a6a');
  // WEST (hero panel, seam-free): the Michigan Ave limestone cliff
  bldg(g, 812, 90, 96, '#6a5578');
  bldg(g, 902, 118, 74, '#75607f', { cols: true, win: false });    // Cultural Center colonnade
  bldg(g, 1020, 74, 150, '#63506f', { gable: 26 });
  bldg(g, 1094, 92, 120, '#6d5878');
  bldg(g, 1186, 66, 164, '#584767', { spire: 30 });                // gothic crown
  bldg(g, 1252, 96, 102, '#715c7c');
  bldg(g, 1348, 78, 138, '#5e4c6e');
  // SOUTH: lower streetwall fading to trees + a low classical cameo
  bldg(g, 1462, 100, 88, '#6a5578');
  bldg(g, 1562, 120, 60, '#7a6484', { cols: true, win: false });   // Art Institute hint
  bldg(g, 1692, 80, 104, '#63506f');
  trees(g, 1782, 1936);
}
function figure(g, x, y, h, col, phone) {                          // tiny toon visitor silhouette
  g.fillStyle = 'rgba(255,206,152,0.22)';
  g.beginPath(); g.ellipse(x, y, h * 0.42, h * 0.1, 0, 0, 7); g.fill();
  g.fillStyle = col;
  g.beginPath(); g.ellipse(x, y - h * 0.34, h * 0.19, h * 0.36, 0, 0, 7); g.fill();
  g.beginPath(); g.arc(x, y - h * 0.8, h * 0.2, 0, 7); g.fill();
  if (phone) {
    g.strokeStyle = col; g.lineWidth = h * 0.09;
    g.beginPath(); g.moveTo(x + h * 0.1, y - h * 0.6); g.lineTo(x + h * 0.32, y - h * 0.95); g.stroke();
    g.fillStyle = '#ffe9c0'; g.fillRect(x + h * 0.27, y - h * 1.08, h * 0.13, h * 0.18);
  }
}
function plazaBand(g) {
  const y0 = Math.round(H * 0.74), y1 = Math.round(H * 0.88);
  const grad = g.createLinearGradient(0, y0, 0, y1);
  grad.addColorStop(0, '#d8ab7e'); grad.addColorStop(1, '#a67c55');
  g.fillStyle = grad; g.fillRect(0, y0 - H * 0.02, W, y1 - y0 + H * 0.02);
  g.fillStyle = 'rgba(70,45,30,0.1)';                              // paver perspective lines
  for (let yy = y0 + 8; yy < y1; yy += 14) g.fillRect(0, yy, W, 2);
  const cols = ['#43324e', '#5a3b46', '#374357', '#4e3a2e'];
  for (let i = 0; i < 22; i++) {                                   // the tiny toon crowd — E/W faces
    const fx = rr() * W, u = fx / W;                               // only (the N/S quarters wrap onto
    const fy = y1 - 6 - rr() * 30, fh = 44 + rr() * 16;            // the lobes' undersides and smudge
    if ((u > 0.12 && u < 0.38) || (u > 0.62 && u < 0.88)) continue;
    figure(g, fx, fy, fh, cols[(rr() * 4) | 0], rr() < 0.4);
  }
  // the city band meets the plaza through a soft violet blend row
  g.fillStyle = 'rgba(94,76,110,0.5)'; g.fillRect(0, y0 - H * 0.023, W, H * 0.025);
}
function omphalos(g) {
  const y0 = Math.round(H * 0.88);
  const ring = ['#f6ab84', '#6b5580', '#f2e3c8', '#c9b7d8', '#57466e'];
  for (let x = 0; x < W; x += 16) for (let y = y0; y < H; y += 4) {
    const b = ((H - y) / 13 + 0.9 * Math.sin((x / W) * Math.PI * 4 + (H - y) * 0.06)) | 0;
    g.fillStyle = ring[((b % 5) + 5) % 5];
    g.fillRect(x, y, 16, 4);
  }
}
function wrapTex() {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  skyBand(g);
  // sky continues under the city band down to the plaza blend (fills gaps
  // between hanging silhouettes with reflected glow, not black)
  const grad = g.createLinearGradient(0, HY, 0, H * 0.74);
  grad.addColorStop(0, '#ffdcb0'); grad.addColorStop(1, '#d3a887');
  g.fillStyle = grad; g.fillRect(0, HY, W, H * 0.74 - HY);
  g.fillStyle = '#fff2da'; g.fillRect(0, HY - 5, W, 7);
  cityBand(g);
  plazaBand(g);
  omphalos(g);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 8; return t;
}

// ------------------------------ dressing --------------------------------
function paverTex() {                                              // 2x2 m limestone pavers, two-tone
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    g.fillStyle = (i + j) % 2 ? '#cfc8b4' : '#c6bfab';
    g.fillRect(i * 128, j * 128, 128, 128);
  }
  g.strokeStyle = '#b0a791'; g.lineWidth = 4;
  g.strokeRect(0, 0, 256, 256); g.strokeRect(128, 0, 0.5, 256); g.strokeRect(0, 128, 256, 0.5);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5.5, 12.5); t.anisotropy = 4;
  return t;
}
function plateTex() {                                              // 'THE BEAN' etched ground plate
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = '#c7c0ad'; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = '#a89f88'; g.lineWidth = 6; g.strokeRect(14, 14, 484, 228);
  g.fillStyle = '#4a4335'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = 96; g.font = `600 ${size}px Georgia,serif`;           // shrink-to-fit, house sign law
  while (g.measureText('THE BEAN').width > 440 && size > 20) { size -= 4; g.font = `600 ${size}px Georgia,serif`; }
  g.fillText('THE BEAN', 256, 128);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
function aoTex() {                                                 // soft seat shadow, darker at the lobes
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 384;
  const g = cv.getContext('2d');
  const base = g.createRadialGradient(128, 192, 20, 128, 192, 180);
  base.addColorStop(0, 'rgba(38,26,50,0.34)'); base.addColorStop(0.75, 'rgba(38,26,50,0.18)');
  base.addColorStop(1, 'rgba(38,26,50,0)');
  g.fillStyle = base; g.fillRect(0, 0, 256, 384);
  for (const cy of [192 - 384 * 5.5 / 21.2, 192 + 384 * 5.5 / 21.2]) {
    const lobe = g.createRadialGradient(128, cy, 4, 128, cy, 52);
    lobe.addColorStop(0, 'rgba(30,20,42,0.42)'); lobe.addColorStop(1, 'rgba(30,20,42,0)');
    g.fillStyle = lobe; g.beginPath(); g.arc(128, cy, 52, 0, 7); g.fill();
  }
  return new THREE.CanvasTexture(cv);
}

export function buildCloudGate() {
  const CG = M.CLOUD_GATE_M, B = CG.bean, P = CG.plaza;

  // 1. the shell — ONE self-lit painted mesh (settled 0.15 into the pavers)
  const shell = new THREE.Mesh(beanGeometry(), bmat(0xffffff, { map: wrapTex() }));
  shell.position.set(B.cx, -0.15, B.cz);
  millenniumRoot.add(shell);

  // 2. seat shadow under the belly (transparent, no depth write)
  const ao = new THREE.Mesh(new THREE.PlaneGeometry(14.4, 21.2),
    bmat(0xffffff, { map: aoTex(), transparent: true, depthWrite: false }));
  ao.rotation.x = -Math.PI / 2; ao.position.set(B.cx, 0.035, B.cz);
  millenniumRoot.add(ao);

  // 3. AT&T Plaza paver carpet (big 2 m squares over the 041 plaza quad)
  const pav = new THREE.Mesh(new THREE.PlaneGeometry(P.x1 - P.x0, P.z1 - P.z0, 4, 10),
    toon(0xffffff, { mat: { map: paverTex() } }));
  pav.rotation.x = -Math.PI / 2;
  pav.position.set((P.x0 + P.x1) / 2, 0.02, (P.z0 + P.z1) / 2);
  millenniumRoot.add(pav);

  // 4. 'THE BEAN' etched plate at the north approach (flush — walk right
  // over it; the journal owns the honest Cloud Gate naming). Text top faces
  // south so a reader arriving from Washington St reads it upright.
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 1.4), toon(0xc7c0ad));
  body.position.set(B.cx, 0.07, B.z0 - 1.4); millenniumRoot.add(body);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 1.15),
    toon(0xffffff, { mat: { map: plateTex() } }));
  face.rotation.set(-Math.PI / 2, 0, Math.PI);
  face.position.set(B.cx, 0.145, B.z0 - 1.4); millenniumRoot.add(face);

  // 5. colliders — ONLY the two ground-contact lobes (data law: the plaza
  // stays continuous under the arch)
  for (const l of CG.legs) collide(l.x, l.z, l.r);
}
