// =====================================================================
// WRIGLEY SQUARE — MILLENNIUM MONUMENT PERISTYLE (NW) — task 050.
// Built from the owner's night photo (refs/millennium-park/
// owner-wrigley-square-night.webp — THE ground truth for structure AND
// lighting): a semicircular paired-Doric colonnade on a raised curved
// base, open side SE over the lawn; columns washed PURPLE by uplights
// over a WARM GOLD base band; dark dedication band across the base
// front; single-jet fountain basin at the exedra's foot; planter urns
// on the chord-end piers; twin quad-globe period lamps at the approach.
//
// LIGHTING REGISTER: the game's perpetual dusk IS the photo's hour and
// there are no dynamic lights — every "lit" surface is SELF-LIT bmat
// (the Crown-lantern escape from the toon ramp, so the purple never
// muddies under the green hemisphere ground-bounce, PITFALLS). ONE
// opaque atlas (column wash / base gold / dedication text / cap, iron,
// globe, flower patches / basin water) + ONE transparent fx atlas (warm
// glow pools, purple uplight pools, the jet plume) → the entire monument
// folds to ~2 new draw calls in mergeCellStatic. Unlit stone (step ring,
// base cap course, entablature, cornice, basin ring, urn bowls) reuses
// cached static toon colors already in this cell's merge pool (+0).
//
// DETERMINISM: LOCAL mulberry32 only (texture speckle); no world rng.
// Geometry law: GEOGRAPHY.md anchors row + data WRIGLEY_SQ_M (1:1 object
// scale — the Cloud Gate precedent, arc center kept from the osm plan).
// =====================================================================
import * as THREE from 'three';
import { millenniumRoot } from './index.js';
import { bmat, mulberry32 } from '../core.js';
import { collide } from '../props.js';
import * as M from '../data/millennium.js';

const _r = mulberry32(0x50455249);              // 'PERI' — local, never the world rng

// ------------------------------ atlases --------------------------------
// Opaque atlas (1024x512) — NO TEXT ANYWHERE (task-050 lesson, PITFALLS:
// canvas word-signs need their OWN canvas + a FITTED font; the first cut
// centered the dedication in a shared atlas and the headless serif fallback
// spilled it into the gold strip — "TO T" on every base face). The whole
// canvas is prefilled warm stone so ANY stray mapping reads as stone.
// Canvas top row = texture v 1 (flipY) = the TOP of a column/course.
// Regions (u,v):
//   column wash  u 0.00-0.25, v 0-1      base gold   u 0.25-0.50, v 0-1
//   pale stone   u 0.50-0.75, v 0.5-1    basin water u 0.50-0.75, v 0-0.5
//   flat patches (32px @ canvas y 128, x 784+): cap/iron/globe/flower/leaf
function atlasTex() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512;
  const g = cv.getContext('2d');
  g.fillStyle = '#dccfae'; g.fillRect(0, 0, 1024, 512);   // benign stone prefill
  // --- column strip: the PURPLE uplight wash (photo: vivid violet shafts,
  // hotspot low-mid where the uplights hit, warm spill at the very foot,
  // pale lavender fading into the capitals) ---
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0.00, '#a984dd');
  gr.addColorStop(0.10, '#9560d4');
  gr.addColorStop(0.55, '#8850cc');
  gr.addColorStop(0.80, '#9f63e2');
  gr.addColorStop(0.93, '#bb7fee');
  gr.addColorStop(0.985, '#d0a2dd');
  gr.addColorStop(1.00, '#e3c48c');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
  const rb = g.createLinearGradient(0, 0, 256, 0);        // soft roundness hint
  rb.addColorStop(0.00, 'rgba(25,8,45,0.26)');
  rb.addColorStop(0.36, 'rgba(255,238,255,0.05)');
  rb.addColorStop(0.50, 'rgba(255,244,255,0.08)');
  rb.addColorStop(0.64, 'rgba(255,238,255,0.05)');
  rb.addColorStop(1.00, 'rgba(25,8,45,0.26)');
  g.fillStyle = rb; g.fillRect(0, 0, 256, 512);
  g.strokeStyle = 'rgba(40,12,66,0.18)'; g.lineWidth = 2;  // flutes (subtle)
  for (let i = 0; i < 10; i++) { const x = 14 + i * 25.5; g.beginPath(); g.moveTo(x, 8); g.lineTo(x, 502); g.stroke(); }
  // --- base strip: the WARM GOLD wash — washed limestone, not a gold pipe
  // (first cut read as a glossy barrel: contrast lowered, top course pale) ---
  const gb = g.createLinearGradient(0, 0, 0, 512);
  gb.addColorStop(0.00, '#f2ddb0');
  gb.addColorStop(0.30, '#e6be76');
  gb.addColorStop(0.65, '#d3a055');
  gb.addColorStop(0.88, '#9c7238');
  gb.addColorStop(1.00, '#6e5230');
  g.fillStyle = gb; g.fillRect(256, 0, 256, 512);
  g.strokeStyle = 'rgba(96,62,22,0.22)'; g.lineWidth = 2;
  for (const y of [128, 300]) { g.beginPath(); g.moveTo(258, y); g.lineTo(510, y); g.stroke(); }
  for (let x = 288; x < 512; x += 64) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x, 504); g.stroke(); }
  // --- pale stone strip (entablature/cornice/cap course/step/basin/bowls —
  // SELF-LIT so the big toon faces never catch the green ground-bounce that
  // minted the first cut's entablature): pale warm top -> AO-shadowed foot ---
  const gs = g.createLinearGradient(0, 0, 0, 255);
  gs.addColorStop(0.00, '#f6efdc');
  gs.addColorStop(0.45, '#e8dabc');
  gs.addColorStop(1.00, '#b3a081');
  g.fillStyle = gs; g.fillRect(512, 0, 256, 255);
  g.strokeStyle = 'rgba(110,90,60,0.18)'; g.lineWidth = 2;
  for (let x = 544; x < 768; x += 56) { g.beginPath(); g.moveTo(x, 4); g.lineTo(x, 250); g.stroke(); }
  // faint per-stone speckle over the three strips (local rng — deterministic)
  for (let i = 0; i < 340; i++) {
    const x = _r() * 768, y = _r() * 512, a = 0.03 + _r() * 0.04;
    if (x >= 512 && y >= 255) continue;                   // keep the water clean
    g.fillStyle = _r() < 0.5 ? `rgba(255,240,220,${a.toFixed(3)})` : `rgba(40,24,10,${a.toFixed(3)})`;
    g.fillRect(x, y, 2 + _r() * 3, 2 + _r() * 3);
  }
  // --- flat patches (canvas y 128-160, x 784+, padded islands) ---
  const patch = (x, c) => { g.fillStyle = c; g.fillRect(x, 128, 32, 32); };
  patch(784, '#cbb2ec');   // capital lavender
  patch(832, '#26262c');   // lamp/uplight iron
  patch(880, '#ffe3a0');   // lamp globe warm
  patch(928, '#b8433a');   // urn blooms deep red
  patch(976, '#37552c');   // urn foliage olive
  // --- basin water (warm-lit, concentric shimmer) ---
  const gw = g.createLinearGradient(0, 256, 0, 512);
  gw.addColorStop(0, '#8a5f2a'); gw.addColorStop(1, '#c98f3e');
  g.fillStyle = gw; g.fillRect(512, 256, 256, 256);
  for (let r = 12; r < 128; r += 14) {
    g.strokeStyle = `rgba(255,220,150,${(0.34 - r * 0.0018).toFixed(3)})`; g.lineWidth = 3;
    g.beginPath(); g.arc(640, 384, r, 0, 7); g.stroke();
  }
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}

// Dedication band — its OWN canvas + FITTED font (the sign register;
// letters need not be legible-exact, but must never clip or bleed).
function dedicationTex() {
  const TXT = 'TO THE FOUNDERS OF MILLENNIUM PARK';
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 96;
  const g = cv.getContext('2d');
  g.fillStyle = '#c9994e'; g.fillRect(0, 0, 1024, 96);
  g.strokeStyle = 'rgba(70,44,16,0.55)'; g.lineWidth = 4; g.strokeRect(10, 10, 1004, 76);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#3a2812';
  let px = 46;
  do { g.font = `600 ${px}px Georgia,serif`; px--; } while (px > 12 && g.measureText(TXT).width > 940);
  g.fillText(TXT, 512, 50);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}

// Transparent fx atlas (256x256): warm radial glow (u 0-0.5, v 0.5-1),
// purple uplight radial (u 0-0.5, v 0-0.5), jet plume (u 0.5-1, v 0-1;
// canvas bottom = v 0 = the nozzle).
function fxTex() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, 256, 256);
  const radial = (cx, cy, r, rgb, a0) => {
    const gr = g.createRadialGradient(cx, cy, 2, cx, cy, r);
    gr.addColorStop(0, `rgba(${rgb},${a0})`);
    gr.addColorStop(0.45, `rgba(${rgb},${a0 * 0.5})`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  };
  radial(64, 64, 62, '255,205,120', 0.9);     // warm pool
  radial(64, 192, 60, '186,120,246', 0.8);    // purple uplight pool
  // jet plume: narrow bright core at the nozzle (canvas bottom), blooming
  // and fading as it rises; splash flare at the foot.
  for (let y = 0; y < 256; y++) {             // y 0 = plume top
    const f = y / 255;                        // 1 at nozzle
    const w = 10 + 42 * Math.pow(1 - f, 1.5);
    const a = 0.16 + 0.8 * Math.pow(f, 1.2);
    const gr = g.createLinearGradient(192 - w, 0, 192 + w, 0);
    gr.addColorStop(0, 'rgba(255,240,210,0)');
    gr.addColorStop(0.5, `rgba(255,246,222,${a.toFixed(3)})`);
    gr.addColorStop(1, 'rgba(255,240,210,0)');
    g.fillStyle = gr; g.fillRect(192 - w, y, 2 * w, 1.5);
  }
  g.fillStyle = 'rgba(255,250,228,0.95)';     // core
  g.fillRect(187, 26, 10, 230);
  const sp = g.createRadialGradient(192, 250, 2, 192, 250, 42);
  sp.addColorStop(0, 'rgba(255,244,214,0.9)'); sp.addColorStop(1, 'rgba(255,230,180,0)');
  g.fillStyle = sp; g.beginPath(); g.ellipse(192, 250, 42, 14, 0, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(cv); return t;
}

// ---------------------------- uv helpers -------------------------------
const uvTo = (geo, u0, v0, u1, v1) => {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + (u1 - u0) * uv.getX(i), v0 + (v1 - v0) * uv.getY(i));
  return geo;
};
const uvPin = (geo, u, v) => {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u, v);
  return geo;
};
const PIN = { cap: [0.7813, 0.719], iron: [0.8281, 0.719], globe: [0.875, 0.719], flower: [0.9219, 0.719], leaf: [0.9688, 0.719] };
// pale stone strip sub-bands (u 0.5-0.75; v 0.502-1 with the palest at v~1)
const ST = { full: [0.5, 0.502, 0.75, 1], pale: [0.52, 0.94, 0.73, 0.995], mid: [0.52, 0.6, 0.73, 0.8], low: [0.5, 0.55, 0.75, 0.9] };

export function buildWrigleyMonument() {
  const P = M.WRIGLEY_SQ_M.peristyle, F = M.WRIGLEY_SQ_M.fountain;
  const C = [P.cx, P.cz];
  const rBase = (P.rOut + P.rIn) / 2;                    // 8.3 — base/entablature arc
  const atlasMat = bmat(0xffffff, { map: atlasTex() });
  const dedMat = bmat(0xffffff, { map: dedicationTex() });
  const fxMat = bmat(0xffffff, { map: fxTex(), transparent: true, depthWrite: false, side: THREE.DoubleSide });

  const add = (mesh, x, y, z, yaw = 0) => { mesh.position.set(x, y, z); mesh.rotation.y = yaw; millenniumRoot.add(mesh); return mesh; };
  // arc parametrization: d(th) = (cos th, sin th) in (x,z); the CLOSED half
  // spans th 3PI/4 .. 7PI/4 (opening faces SE = th PI/4). ends at the chord.
  const TH0 = 3 * Math.PI / 4, SPAN = Math.PI;
  const at = (th, r) => [C[0] + Math.cos(th) * r, C[1] + Math.sin(th) * r];
  const radialYaw = th => Math.atan2(Math.cos(th), Math.sin(th));   // local +z -> outward d

  // ---- 1. curved base: step ring + gold body + pale cap course ---------
  const stepGeo = uvTo(new THREE.BoxGeometry(2.5, 0.35, 3.6), ...ST.mid);
  const bodyGeo = uvTo(new THREE.BoxGeometry(2.2, 2.02, 3.0), 0.25, 0, 0.5, 1);
  const capGeo = uvTo(new THREE.BoxGeometry(2.4, 0.18, 3.3), ...ST.pale);
  for (let k = 0; k < 14; k++) {
    const th = TH0 + (k + 0.5) * SPAN / 14, [x, z] = at(th, rBase), yaw = radialYaw(th);
    add(new THREE.Mesh(stepGeo, atlasMat), x, 0.175, z, yaw);
    add(new THREE.Mesh(bodyGeo, atlasMat), x, 1.01, z, yaw);
    add(new THREE.Mesh(capGeo, atlasMat), x, 2.11, z, yaw);
    collide(x, z, 1.9);
  }

  // ---- 2. dedication band — five plates tracing the inner face ---------
  // (arc apex faces the viewer across the basin; FrontSide toward the
  // opening — the free-standing-sign law needs no back face here, the wall
  // body backs it. OWN fitted-font texture, never the shared atlas.)
  for (let i = 0; i < 5; i++) {
    const th = 5 * Math.PI / 4 + (i - 2) * SPAN / 14, [x, z] = at(th, rBase - 1.5 - 0.06);
    const plate = uvTo(new THREE.PlaneGeometry(1.48, 0.78), i * 0.2, 0, (i + 1) * 0.2, 1);
    add(new THREE.Mesh(plate, dedMat), x, 1.5, z, Math.atan2(-Math.cos(th), -Math.sin(th)));
  }

  // ---- 3. paired Doric rings: purple shafts + lavender capitals --------
  const shaftGeo = uvTo(new THREE.CylinderGeometry(0.34, 0.44, 7.55, 10), 0, 0, 0.25, 1);
  shaftGeo.translate(0, 3.775, 0);
  const echGeo = uvPin(new THREE.CylinderGeometry(0.46, 0.33, 0.22, 8), ...PIN.cap);
  const abaGeo = uvPin(new THREE.BoxGeometry(0.95, 0.23, 0.95), ...PIN.cap);
  const canGeo = uvPin(new THREE.BoxGeometry(0.34, 0.16, 0.22), ...PIN.iron);
  const poolGeo = uvTo(new THREE.PlaneGeometry(1.35, 1.35), 0, 0, 0.5, 0.5);
  for (let k = 0; k < P.cols; k++) {
    const th = TH0 + k * SPAN / (P.cols - 1);
    for (const r of [P.rOut, P.rIn]) {
      const [x, z] = at(th, r);
      add(new THREE.Mesh(shaftGeo, atlasMat), x, P.baseH, z, Math.PI / 4);   // wash seam faces NW (away)
      add(new THREE.Mesh(echGeo, atlasMat), x, P.baseH + 7.66, z);
      add(new THREE.Mesh(abaGeo, atlasMat), x, P.baseH + 7.885, z, radialYaw(th));
      const pool = add(new THREE.Mesh(poolGeo, fxMat), x, P.baseH + 0.02, z);
      pool.rotation.set(-Math.PI / 2, 0, 0);                                 // purple uplight pooling
    }
    const [ux, uz] = at(th, P.rIn - 0.7);                                    // uplight can, inboard
    add(new THREE.Mesh(canGeo, atlasMat), ux, P.baseH + 0.08, uz, radialYaw(th));
  }

  // ---- 4. entablature + cornice (self-lit pale stone — atlas strip, so
  // the big faces never catch the green hemisphere ground-bounce) --------
  const entGeo = uvTo(new THREE.BoxGeometry(2.35, 1.0, 3.2), ...ST.full);
  const corGeo = uvTo(new THREE.BoxGeometry(2.5, 0.24, 3.5), ...ST.pale);
  const yEnt = P.baseH + P.colH;                                             // 10.2
  for (let k = 0; k < 13; k++) {
    const th = TH0 + (k + 0.5) * SPAN / 13, [x, z] = at(th, rBase), yaw = radialYaw(th);
    add(new THREE.Mesh(entGeo, atlasMat), x, yEnt + 0.5, z, yaw);
    add(new THREE.Mesh(corGeo, atlasMat), x, yEnt + 1.12, z, yaw);
  }

  // ---- 5. chord-end piers + planter urns (muted blooms, photo register:
  // dark foliage mounds with red accents, not traffic lights) ------------
  const pierGeo = uvTo(new THREE.BoxGeometry(2.6, 2.55, 2.6), 0.25, 0, 0.5, 1);
  const pedGeo = uvTo(new THREE.BoxGeometry(0.9, 0.5, 0.9), 0.25, 0.3, 0.5, 1);
  const bowlGeo = uvTo(new THREE.CylinderGeometry(0.75, 0.35, 0.85, 10), 0.52, 0.55, 0.73, 0.95);
  const leafGeo = uvPin(new THREE.SphereGeometry(0.72, 8, 6), ...PIN.leaf);
  const bloomGeo = uvPin(new THREE.SphereGeometry(0.5, 8, 6), ...PIN.flower);
  M.WRIGLEY_SQ_M.urns.forEach(([x, z], i) => {
    const yawP = Math.atan2(x - C[0], z - C[1]);
    add(new THREE.Mesh(pierGeo, atlasMat), x, 1.275, z, yawP);
    add(new THREE.Mesh(pedGeo, atlasMat), x, 2.8, z, yawP);
    add(new THREE.Mesh(bowlGeo, atlasMat), x, 3.475, z);
    const lf = add(new THREE.Mesh(leafGeo, atlasMat), x, 3.88, z, i * 1.2); lf.scale.set(1, 0.4, 1);
    const bl = add(new THREE.Mesh(bloomGeo, atlasMat), x, 4.02, z, i * 2.1); bl.scale.set(1, 0.55, 1);
    collide(x, z, 1.9);
  });

  // ---- 6. fountain: stone ring, warm water, single glowing jet ---------
  const ringGeo = uvTo(new THREE.BoxGeometry(1.4, 0.55, 0.5), ...ST.low);
  const copGeo = uvTo(new THREE.BoxGeometry(1.5, 0.14, 0.62), ...ST.pale);
  for (let k = 0; k < 12; k++) {
    const th = k * Math.PI / 6, x = F.x + Math.cos(th) * F.r, z = F.z + Math.sin(th) * F.r, yaw = radialYaw(th);
    add(new THREE.Mesh(ringGeo, atlasMat), x, 0.275, z, yaw);
    add(new THREE.Mesh(copGeo, atlasMat), x, 0.62, z, yaw);
  }
  const water = add(new THREE.Mesh(uvTo(new THREE.CircleGeometry(F.r - 0.25, 20), 0.5, 0, 0.75, 0.5), atlasMat), F.x, 0.42, F.z);
  water.rotation.set(-Math.PI / 2, 0, 0);
  const jetGeo = uvTo(new THREE.PlaneGeometry(1.5, F.jetH), 0.5, 0, 1, 1);
  add(new THREE.Mesh(jetGeo, fxMat), F.x, 0.42 + F.jetH / 2, F.z, 0);
  add(new THREE.Mesh(jetGeo, fxMat), F.x, 0.42 + F.jetH / 2, F.z, Math.PI / 2);
  const jglow = add(new THREE.Mesh(uvTo(new THREE.PlaneGeometry(3.2, 3.2), 0, 0.5, 0.5, 1), fxMat), F.x, 0.45, F.z);
  jglow.rotation.set(-Math.PI / 2, 0, 0);
  collide(F.x, F.z, F.r + 0.5);

  // ---- 7. the warm court glow (base + fountain light pooling on the
  // pavers between the colonnade and the lawn — the photo's gold floor) --
  const court = add(new THREE.Mesh(uvTo(new THREE.PlaneGeometry(11, 7), 0, 0.5, 0.5, 1), fxMat),
    C[0] + 3.0, 0.045, C[1] + 3.0);
  court.rotation.set(-Math.PI / 2, 0, Math.PI / 4);

  // ---- 8. twin quad-globe period lamps at the lawn approach ------------
  const lampBase = uvPin(new THREE.CylinderGeometry(0.22, 0.28, 0.5, 8), ...PIN.iron);
  const lampPole = uvPin(new THREE.CylinderGeometry(0.1, 0.13, 4.2, 8), ...PIN.iron);
  const lampArmX = uvPin(new THREE.BoxGeometry(1.5, 0.09, 0.09), ...PIN.iron);
  const lampArmZ = uvPin(new THREE.BoxGeometry(0.09, 0.09, 1.5), ...PIN.iron);
  const lampFin = uvPin(new THREE.ConeGeometry(0.14, 0.42, 8), ...PIN.iron);
  const globeGeo = uvPin(new THREE.SphereGeometry(0.28, 10, 8), ...PIN.globe);
  for (const [x, z] of M.WRIGLEY_SQ_M.lamps) {
    add(new THREE.Mesh(lampBase, atlasMat), x, 0.25, z);
    add(new THREE.Mesh(lampPole, atlasMat), x, 2.15, z);
    add(new THREE.Mesh(lampArmX, atlasMat), x, 3.95, z);
    add(new THREE.Mesh(lampArmZ, atlasMat), x, 3.95, z);
    add(new THREE.Mesh(lampFin, atlasMat), x, 4.5, z);
    for (const [gx, gz] of [[0.75, 0], [-0.75, 0], [0, 0.75], [0, -0.75]])
      add(new THREE.Mesh(globeGeo, atlasMat), x + gx, 4.12, z + gz);
    collide(x, z, 0.35);
  }
}
