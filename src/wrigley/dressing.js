// Wrigleyville streetscape dressing (task 016) — the FABRIC between the hero
// landmarks: per-lot facade recipes on every corridor frontage, a furniture
// rhythm + parked cars on every sidewalk, and Chicago mast-arm stoplights at
// the two signalized Addison intersections. Uses the urban kit (src/urbankit)
// via emitMerged so everything folds into the cell static-merge pool +
// atlas — reusing cached toon() colours costs ~no draw calls, unlike the
// kit's InstancedMesh emit (frustumCulled=false → global). Data: FACADES_W +
// STREETS_W in ../data/wrigleyville.js. LOCAL rng only (seed 1916). Attach to
// wrigleyRoot; run BEFORE buildVillage so atlas signs land before emitAtlas.
import * as THREE from 'three';
import { toon, bmat, mulberry32 } from '../core.js';
import { collide } from '../props.js';
import { wrigleyRoot } from './index.js';
import { createUrbanKit } from '../urbankit.js';
import { atlasPlane } from './village.js';
import { STREETS_W, FACADES_W, clarkX, clarkYaw } from '../data/wrigleyville.js';

const R = mulberry32(1916);
const rr = (a, b) => a + (b - a) * R();
const nrm = yaw => [Math.sin(yaw), Math.cos(yaw)];               // kit "forward" = (sin,cos)

// ---- per-lot storefront name band (unique canvas → shared atlas, +0 draws) --
function lotSignTex(text, hex) {
  const cv = document.createElement('canvas'); cv.width = 384; cv.height = 96; const g = cv.getContext('2d');
  g.fillStyle = '#120d10'; g.fillRect(0, 0, 384, 96);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 4; g.strokeRect(6, 6, 372, 84);
  const col = '#' + hex.toString(16).padStart(6, '0');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 52; g.font = `800 ${fs}px "Trebuchet MS",Arial,sans-serif`;
  while (g.measureText(text).width > 344 && fs > 22) { fs -= 2; g.font = `800 ${fs}px "Trebuchet MS",Arial,sans-serif`; }
  g.shadowColor = col; g.shadowBlur = 20; g.fillStyle = col;
  g.fillText(text, 192, 50); g.fillText(text, 192, 50);
  g.shadowBlur = 0; g.fillStyle = '#fff8e6'; g.fillText(text, 192, 50);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
function lotSign(x, z, yaw, w, sign) {
  const n = nrm(yaw), sw = Math.min(w - 1.4, 4.2), sh = sw * 96 / 384;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), bmat(0xffffff, { map: lotSignTex(sign.t, sign.c) }));
  m.position.set(x + n[0] * 0.09, 3.42, z + n[1] * 0.09); m.rotation.y = yaw;
  atlasPlane(m, false);
}

// ---- one facade lot: host wall + storefront + upper windows + cornice ----
const STFRAME = [0x2a2620, 0x1f2a24, 0x241d17, 0x22282c];
function buildLot(kit, i, x, z, yaw, rec) {
  const n = nrm(yaw), d = 7, h = 4 + rec.floors * 3.0, w = rec.w;
  const ux = x - n[0] * 0.45, uz = z - n[1] * 0.45;               // upper-wall face (set back)
  const cx = x - n[0] * (0.45 + d / 2), cz = z - n[1] * (0.45 + d / 2);   // block centre
  kit.block({ x: cx, z: cz, yaw, w, d, h, color: rec.color, coping: rec.cornice === 'flat' });
  kit.storefront({ x, z, yaw, w: w - 0.5, palette: { frame: STFRAME[i % STFRAME.length], door: rec.door, awning: rec.awning } });
  const rows = Math.max(1, rec.floors - 1);
  const cols = Math.max(2, Math.round((w - 1.6) / 2.5));
  kit.windowGrid({ x: ux, z: uz, yaw, cols, rows, dx: (w - 1.6) / Math.max(1, cols - 1), y0: 5.4, dy: 3.0,
    acAt: rec.upper === 'paired' ? [[cols - 1, 0]] : [] });
  if (rec.upper === 'bay') bay(ux, uz, yaw, w, rec.color);         // projecting oriel over the door
  if (rec.upper === 'arch') archHeads(kit, ux, uz, yaw, cols, rows, w);
  if (rec.cornice === 'step') kit.parapetSteps({ x: ux, z: uz, yaw, w, h, color: rec.color });
  else kit.cornice({ x: ux, z: uz, yaw, w, h, color: 0xe6ddc8 });
  if (rec.fesc) kit.fireEscape({ x: ux, z: uz, yaw, y0: 3.9, dy: 3.0 });
  kit.downspout({ x: ux, z: uz, yaw, h, color: 0x2c2620 });
  if (rec.stoop) stoop(x, z, yaw, rec.door, w);
  if (rec.sign) lotSign(x, z, yaw, w, rec.sign);
}
// a projecting bay window (toon box in the wall colour + two warm panes)
function bay(x, z, yaw, w, color) {
  const n = nrm(yaw), g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw;
  g.add(mesh(new THREE.BoxGeometry(Math.min(3.2, w * 0.42), 5.6, 1.0), toon(color), 0, 8.0, 0.55));
  add(g);
}
// shallow limestone arch heads above the upper windows (a stack of chamfered boxes)
function archHeads(kit, x, z, yaw, cols, rows, w) {
  const dx = (w - 1.6) / Math.max(1, cols - 1), ox = -(cols - 1) * dx / 2, lime = toon(0xe6ddc8);
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw;
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const lx = ox + c * dx, ly = 5.4 + r * 3.0 + 1.05;
    g.add(mesh(new THREE.BoxGeometry(1.34, 0.3, 0.12), lime, lx, ly, 0.06));
    g.add(mesh(new THREE.BoxGeometry(0.9, 0.24, 0.12), lime, lx, ly + 0.24, 0.06));
    g.add(mesh(new THREE.BoxGeometry(0.4, 0.2, 0.12), lime, lx, ly + 0.44, 0.06));
  }
  add(g);
}
// a couple of stone steps + cheek walls at the door
function stoop(x, z, yaw, door, w) {
  const DW = 1.15, PIL = 0.22, dc = door === 'left' ? -w / 2 + PIL + DW / 2 + 0.1 : door === 'right' ? w / 2 - PIL - DW / 2 - 0.1 : 0;
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw;
  const stone = toon(0x9a948b);
  g.add(mesh(new THREE.BoxGeometry(1.9, 0.18, 0.9), stone, dc, 0.09, 0.55));
  g.add(mesh(new THREE.BoxGeometry(1.6, 0.18, 0.55), stone, dc, 0.27, 0.42));
  for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.22, 0.7, 0.95), stone, dc + s * 0.95, 0.35, 0.5));
  add(g);
}

// plain-mesh helpers (mergeCellStatic folds these by material at cell build end)
function mesh(geo, mat, x, y, z) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y || 0, z || 0); return m; }
function add(o) { wrigleyRoot.add(o); return o; }

// ============================ facades =================================
function layFacades(kit) {
  for (let fi = 0; fi < FACADES_W.frontages.length; fi++) {
    const f = FACADES_W.frontages[fi];
    let lot = 0, prev = -1;
    for (const [a, b] of f.spans) {
      let t = Math.min(a, b);
      const end = Math.max(a, b);
      while (end - t > 9) {
        // pick a recipe that differs from the previous lot
        let ri = (lot * 3 + fi * 2) % FACADES_W.recipes.length;
        if (ri === prev) ri = (ri + 1) % FACADES_W.recipes.length;
        const rec = FACADES_W.recipes[ri];
        if (end - t < rec.w) break;
        const c = t + rec.w / 2;
        let x, z;
        if (f.o === 'ew') { x = c; z = f.face; }
        else if (f.o === 'ns') { x = f.face; z = c; }
        else { z = c; x = clarkX(c) + f.off; }             // clark diagonal
        buildLot(kit, lot, x, z, f.yaw, rec);
        t += rec.w; lot++; prev = ri;
      }
    }
  }
}

// ============================ furniture ===============================
// walk each sidewalk near the building edge, alternating prop types; skip
// within m of an intersection so nothing lands on a crosswalk. Crossing coords
// are PER STREET: Addison meets Clark at clarkX(-400) and Sheffield at -190;
// Waveland meets Clark at clarkX(-560); N-S corridors meet Addison/Waveland z.
const ADDX = [clarkX(-400), -190];                          // Addison crossings (x)
const WAVX = [clarkX(-560), -190];                          // Waveland crossings (x)
const ZW = [-400, -560];                                    // Sheffield/Clark cross Addison & Waveland (z)
const nearAny = (v, arr, m) => arr.some(k => Math.abs(v - k) < m);
function furniture(kit) {
  // each: {o:'ew'|'ns'|'clark', line, from,to, yaw, cross:[coords to skip]}
  const walks = [
    { o: 'ew', line: -412,  from: -326, to: -132, yaw: Math.PI,     cross: ADDX },  // Addison N (stadium side)
    { o: 'ew', line: -388,  from: -326, to: -132, yaw: 0,           cross: ADDX },  // Addison S (facade side)
    { o: 'ew', line: -570,  from: -346, to: -182, yaw: Math.PI,     cross: WAVX },  // Waveland N (facade side)
    { o: 'ew', line: -550,  from: -346, to: -182, yaw: 0,           cross: WAVX },  // Waveland S (stadium side)
    { o: 'ns', line: -200,  from: -566, to: -392, yaw: -Math.PI / 2, cross: ZW },   // Sheffield W (stadium side)
    { o: 'ns', line: -180,  from: -566, to: -392, yaw: Math.PI / 2,  cross: ZW },   // Sheffield E (facade side)
    { o: 'clark', line: -12, from: -566, to: -392, yaw: Math.PI / 2 + clarkYaw, cross: ZW }, // Clark W
    { o: 'clark', line: 12,  from: -566, to: -392, yaw: -Math.PI / 2 + clarkYaw, cross: ZW }, // Clark E
  ];
  const props = ['meter', 'hydrant', 'newsbox', 'bikeRack', 'trashCan', 'streetTree', 'meter', 'mailbox'];
  let k = 0;
  for (const w of walks) {
    let n = 0;
    for (let t = w.from; t <= w.to; t += 9.5, n++) {
      let x, z;
      if (w.o === 'ew') { x = t; z = w.line; if (nearAny(x, w.cross, 8)) continue; }
      else if (w.o === 'ns') { z = t; x = w.line; if (nearAny(z, w.cross, 8)) continue; }
      else { z = t; x = clarkX(t) + w.line; if (nearAny(z, w.cross, 8)) continue; }
      const type = props[(k++) % props.length];
      const yaw = w.yaw + rr(-0.25, 0.25);
      if (type === 'streetTree') kit.streetTree({ x, z, yaw, s: rr(0.92, 1.12) });
      else if (type === 'newsbox') kit.newsbox({ x, z, yaw, color: 0xc0392b });   // cached red → folds in
      else kit[type]({ x, z, yaw });
    }
  }
}

// ============================ parked cars =============================
// body colours are CACHED Wrigleyville toon() hexes so car bodies fold into
// existing per-colour merge meshes (no new draw calls); type variety is free
// because mergeCellStatic merges by material, not shape.
const CARCOLORS = [0xb42a22, 0x9c968a, 0x2c2620, 0x0e4c92, 0xd8cdb4, 0x63594e];
const CARTYPES = ['sedan', 'suv', 'hatch'];
function cars(kit) {
  // ONE sparse parallel-parking lane per street, just inside the curb on the
  // facade side. yaw = the car's LENGTH axis (local +x), aligned ALONG the
  // street (E-W → 0, N-S → π/2, Clark → clarkYaw−π/2); a few nose the other way.
  const lanes = [
    { o: 'ew',    line: -394, from: -294, to: -164, yaw: 0,                       cross: ADDX }, // Addison S (facade side)
    { o: 'ew',    line: -564, from: -342, to: -188, yaw: 0,                       cross: WAVX }, // Waveland N (facade side)
    { o: 'ns',    line: -186, from: -558, to: -396, yaw: Math.PI / 2,             cross: ZW },   // Sheffield E (facade side)
    { o: 'clark', line: -6,   from: -558, to: -396, yaw: clarkYaw - Math.PI / 2,  cross: ZW },   // Clark W (bar/facade side)
  ];
  let k = 0;
  for (const L of lanes) {
    for (let t = L.from; t <= L.to; t += 13) {
      let x, z;
      if (L.o === 'ew') { x = t; z = L.line; if (nearAny(x, L.cross, 10)) continue; }
      else if (L.o === 'ns') { z = t; x = L.line; if (nearAny(z, L.cross, 10)) continue; }
      else { z = t; x = clarkX(t) + L.line; if (nearAny(z, L.cross, 10)) continue; }
      if (R() < 0.28) continue;                                       // gaps between parked cars
      kit.car({ x, z, yaw: L.yaw + (R() < 0.4 ? Math.PI : 0), type: CARTYPES[k % 3], color: CARCOLORS[(k * 5 + 2) % CARCOLORS.length] });
      k++;
    }
  }
}

// ============================ signals =================================
// Chicago mast-arm stoplights at the two signalized Addison intersections
// (static red — no gameplay effect). arm reaches over the road; a green
// street blade hangs mid-span.
function signals(kit) {
  // static red (no gameplay effect); street name is already on the corner blade
  // signs (streets.js) so no mast nameplate (keeps the lit-lamp bucket to one).
  kit.stoplight({ x: -282, z: -389, yaw: Math.PI / 2, arm: 7.5, state: 'red' });   // Clark & Addison
  kit.stoplight({ x: clarkX(-411) - 15, z: -411, yaw: -Math.PI / 2, arm: 6.5, state: 'red' });
  kit.stoplight({ x: -181, z: -389, yaw: Math.PI / 2, arm: 6.5, state: 'red' });   // Sheffield & Addison
  kit.stoplight({ x: -199, z: -411, yaw: -Math.PI / 2, arm: 6.0, state: 'red' });
}

// =====================================================================
export function buildDressing() {
  const kitF = createUrbanKit();     // facades — OUTSIDE the corridor, unreachable → NO colliders
  layFacades(kitF);
  kitF.emitMerged({ solid: (geo, mat) => add(new THREE.Mesh(geo, mat)) });

  const kitP = createUrbanKit();     // props IN the corridor → colliders so the player walks around
  furniture(kitP);
  cars(kitP);
  signals(kitP);
  kitP.emitMerged({ solid: (geo, mat) => add(new THREE.Mesh(geo, mat)), collide });
}
