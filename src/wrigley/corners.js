// Wrigleyville CORNER TRUTH (task 020) — the three supporting corners that make
// Sheffield & Addison (and Clark & Waveland) read as real intersections:
//   1. SPORTS WORLD souvenir store — SW corner of Sheffield & Addison, a
//      cream/white 2-storey mass with a CHAMFERED NE corner door facing the
//      intersection, a red SPORTS WORLD fascia, striped awnings + canvas banners.
//   2. 940-W station-corner block — NE corner of Sheffield & Addison, a blonde
//      3-storey block with dark storefronts + a CTA·ADDISON wayfinding blade
//      pointing east to the Red Line head-house.
//   3. Gallagher office corner dressing — windows / entry / GALLAGHER WAY band
//      on the WEST (Clark) + NORTH (Waveland) faces of the 019 office mass so the
//      Clark & Waveland SE corner stops reading as a blank cream wall.
//
// Data: VILLAGE_W.sportsWorld / .stationCorner + OFFICE_W + clarkX/clarkYaw
// (../data/wrigleyville.js — READ, never edited here). Attach everything to
// wrigleyRoot. Runs AFTER buildDressing() and BEFORE buildVillage() so its atlas
// signs land in the shared atlas before village's emitAtlas. LOCAL rng only
// (seed 2020) — never the shared world rng / wrand.
//
// PERF: plain toon-material meshes reuse EXISTING cached toon() hexes (cream
// 0xe6ddc8, blonde 0xc2a370, red 0xc0392b, dark 0x0c0a09, base 0x2c211d,
// limestone 0x9a948b), so mergeCellStatic folds them into existing per-colour
// buckets (~0 draw calls). ALL text/graphics go through canvas textures +
// atlasPlane (folds into the ONE shared atlas mesh, +0 draws). No InstancedMesh.
import * as THREE from 'three';
import { toon, bmat, mulberry32 } from '../core.js';
import { collide } from '../props.js';
import { wrigleyRoot } from './index.js';
import { atlasPlane } from './village.js';
import { VILLAGE_W, OFFICE_W, clarkX, clarkYaw } from '../data/wrigleyville.js';

const R = mulberry32(2020);

// cached toon palette (all already materialised elsewhere in the cell, so
// mergeCellStatic folds these meshes into existing per-colour buckets)
const CREAM = 0xe6ddc8, BLONDE = 0xc2a370, RED = 0xc0392b, DARK = 0x0c0a09, BASE = 0x2c211d;

// ---- primitives ------------------------------------------------------------
// plain box -> merge pool (mergeCellStatic folds by material)
function box(w, h, d, hex, x, y, z, ry) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(hex));
  m.position.set(x, y, z); if (ry) m.rotation.y = ry;
  wrigleyRoot.add(m); return m;
}
// textured plane -> shared atlas (opaque or alpha). No parent: atlasPlane bakes
// world = local (position + full rotation), then it is NEVER added individually.
function plane(tex, x, y, z, ry, w, h, alpha, rx) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bmat(0xffffff, { map: tex }));
  m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0);
  atlasPlane(m, !!alpha);
}
// FREE-STANDING sign: a lone atlas plane (atlas is DoubleSide) reads MIRRORED
// from behind (PITFALLS). Emit a back-to-back pair 0.06 m apart, each facing
// out with the same texture, so the near plane occludes the far plane's mirror
// (village.js twoSided rule). Both fold into the shared atlas (+0 draws).
function plane2(tex, x, y, z, ry, w, h, alpha) {
  const nx = Math.sin(ry), nz = Math.cos(ry);
  plane(tex, x + nx * 0.03, y, z + nz * 0.03, ry, w, h, alpha);
  plane(tex, x - nx * 0.03, y, z - nz * 0.03, ry + Math.PI, w, h, alpha);
}
// local offset (lx,lz) under rotation.y = th -> world delta (matches village yrot)
const yrot = (lx, lz, th) => [lx * Math.cos(th) + lz * Math.sin(th), -lx * Math.sin(th) + lz * Math.cos(th)];

// ---- canvas texture helpers ------------------------------------------------
function cvTex(w, h) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return [cv, cv.getContext('2d')]; }
function tx(cv) { const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t; }

// SPORTS WORLD — white block letters on red fascia (opaque)
function sportsWorldTex() {
  const [cv, g] = cvTex(512, 96);
  g.fillStyle = '#bf2f27'; g.fillRect(0, 0, 512, 96);
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 4; g.strokeRect(5, 5, 502, 86);
  g.fillStyle = '#f7f5ef'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 60px "Arial Black",Arial,sans-serif';
  g.fillText('SPORTS WORLD', 256, 52);
  return tx(cv);
}
// wall-mounted canvas merch banner (opaque) — bg colour + one or two lines
function bannerTex(l1, l2, bg, fg) {
  const [cv, g] = cvTex(512, 128);
  g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 5; g.strokeRect(7, 7, 498, 114);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (l2) {
    g.font = '800 46px "Trebuchet MS",Arial,sans-serif'; g.fillText(l1, 256, 44);
    g.font = '800 34px "Trebuchet MS",Arial,sans-serif'; g.fillText(l2, 256, 92);
  } else {
    g.font = '800 58px "Trebuchet MS",Arial,sans-serif'; g.fillText(l1, 256, 66);
  }
  return tx(cv);
}
// blue W-flag graphic banner (transparent field top/bottom)
function wFlagBannerTex() {
  const [cv, g] = cvTex(256, 128);
  g.clearRect(0, 0, 256, 128);
  g.fillStyle = '#f4f6fb'; g.fillRect(8, 14, 240, 100);
  g.strokeStyle = '#0e4c92'; g.lineWidth = 8; g.strokeRect(8, 14, 240, 100);
  g.fillStyle = '#0e4c92'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 84px "Arial Black",Arial,sans-serif'; g.fillText('W', 128, 66);
  return tx(cv);
}
// red/cream awning stripes (opaque)
function awningTex() {
  const [cv, g] = cvTex(256, 96);
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f2eee4' : '#bf2f27'; g.fillRect(i * 32, 0, 32, 96); }
  return tx(cv);
}
// dark storefront glazing: bulkhead frame + warm panes + optional recessed door
function storefrontTex(withDoor) {
  const [cv, g] = cvTex(512, 140);
  g.fillStyle = '#0c0a09'; g.fillRect(0, 0, 512, 140);
  const pane = (x, w) => {
    g.fillStyle = '#14100c'; g.fillRect(x, 14, w, 96);
    g.fillStyle = '#e8c98a'; g.fillRect(x + 6, 20, w - 12, 66);
    g.strokeStyle = '#060505'; g.lineWidth = 3; g.strokeRect(x, 14, w, 96);
    g.beginPath(); g.moveTo(x + w / 2, 14); g.lineTo(x + w / 2, 110); g.stroke();
  };
  if (withDoor) {
    pane(14, 150); pane(348, 150);
    g.fillStyle = '#080605'; g.fillRect(196, 8, 120, 122);            // recessed reveal
    g.fillStyle = '#1a1712'; g.fillRect(206, 16, 100, 104);          // door slab
    g.fillStyle = '#e8c98a'; g.fillRect(214, 22, 84, 44);            // warm transom/glass
    g.fillStyle = '#c9a86a'; g.fillRect(298, 74, 6, 20);             // handle
  } else {
    pane(14, 150); pane(181, 150); pane(348, 150);
  }
  g.fillStyle = '#080605'; g.fillRect(0, 116, 512, 24);              // kickplate
  return tx(cv);
}
// window grid (alpha): cols x rows lit/unlit panes on a transparent field
function windowGridTex(cols, rows) {
  const cw = 72, ch = 104, [cv, g] = cvTex(cols * cw, rows * ch);
  g.clearRect(0, 0, cols * cw, rows * ch);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = c * cw + 12, y = r * ch + 14, w = cw - 24, h = ch - 28;
    g.fillStyle = '#241d17'; g.fillRect(x - 4, y - 4, w + 8, h + 8);     // stone frame
    const lit = R() > 0.42;
    g.fillStyle = lit ? '#ffd98a' : '#2b2a30'; g.fillRect(x, y, w, h);   // pane
    g.strokeStyle = '#5a4a34'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h);
    g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke();
  }
  return tx(cv);
}
// dark CTA wayfinding blade — 'CTA · ADDISON' + directional arrow (opaque).
// dir = +1 arrow points to the RIGHT end of the canvas, -1 to the LEFT end.
function ctaBladeTex(dir) {
  const [cv, g] = cvTex(448, 140);
  g.fillStyle = '#1b1b1e'; g.fillRect(0, 0, 448, 140);
  g.strokeStyle = '#f2f2ef'; g.lineWidth = 5; g.strokeRect(6, 6, 436, 128);
  g.fillStyle = '#c0271f'; g.fillRect(18, 18, 96, 104);               // red CTA tab
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 40px "Arial Black",Arial,sans-serif'; g.fillText('CTA', 66, 70);
  g.textAlign = 'left'; g.font = '800 44px "Trebuchet MS",Arial,sans-serif';
  g.fillText('ADDISON', 132, 70);
  // arrow head + shaft toward the station end
  g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.lineCap = 'round';
  const ax = dir > 0 ? 430 : 132, sx = dir > 0 ? 396 : 166;
  g.beginPath(); g.moveTo(sx, 118); g.lineTo(ax, 118); g.stroke();
  g.beginPath(); g.moveTo(ax, 118); g.lineTo(ax - dir * 16, 108);
  g.moveTo(ax, 118); g.lineTo(ax - dir * 16, 128); g.stroke();
  return tx(cv);
}
// GALLAGHER WAY corner band — cream on Cubs dark-green (opaque)
function gallagherCornerTex() {
  const [cv, g] = cvTex(512, 120);
  g.fillStyle = '#123f2a'; g.fillRect(0, 0, 512, 120);
  g.strokeStyle = '#f3ead2'; g.lineWidth = 7; g.strokeRect(9, 9, 494, 102);
  g.fillStyle = '#f6efdc'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 58px "Trebuchet MS",Arial,sans-serif'; g.fillText('GALLAGHER WAY', 256, 64);
  return tx(cv);
}
// hand-lettered sidewalk merch sign (opaque)
function merchSignTex(l1, l2, c1, c2) {
  const [cv, g] = cvTex(256, 128);
  g.fillStyle = '#f5efe0'; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = '#c9c0aa'; g.lineWidth = 5; g.strokeRect(6, 6, 244, 116);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = c1; g.font = '800 40px "Comic Sans MS","Marker Felt",cursive'; g.fillText(l1, 128, 46);
  g.fillStyle = c2; g.font = '800 44px "Comic Sans MS","Marker Felt",cursive'; g.fillText(l2, 128, 92);
  return tx(cv);
}

// =====================================================================
//  1. SPORTS WORLD  (SW corner Sheffield & Addison, chamfered NE corner)
// =====================================================================
function buildSportsWorld() {
  const L = VILLAGE_W.sportsWorld;                       // x -220..-204, z -384(N)..-371(S), h 7.6
  const H = L.h;
  // NE corner (x -204, z -384) chamfered ~3 m toward the intersection (NE).
  const cN = [-207, -384], cE = [-204, -381];            // chamfer endpoints on N + E faces
  const chMid = [(cN[0] + cE[0]) / 2, (cN[1] + cE[1]) / 2];   // (-205.5, -382.5)
  const chYaw = 3 * Math.PI / 4;                         // outward normal NE (0.707,-0.707)
  const nrm = [Math.sin(chYaw), Math.cos(chYaw)];        // (0.707,-0.707)

  // --- cream mass (built around the cut corner) ---
  box(16, H, 10, CREAM, -212, H / 2, -376);              // south body (z -381..-371)
  box(13, H, 3, CREAM, -213.5, H / 2, -382.5);           // north strip minus the NE 3x3
  { const c = [chMid[0] - nrm[0] * 1.5, chMid[1] - nrm[1] * 1.5];   // chamfer fill, front face on the cut line
    box(4.3, H, 3.0, CREAM, c[0], H / 2, c[1], chYaw); }
  // --- flat parapet + modest cornice ---
  box(16.3, 0.4, 10.3, CREAM, -212, H + 0.02, -376);
  box(13.3, 0.4, 3.3, CREAM, -213.5, H + 0.02, -382.5);

  // --- ground-floor storefront glazing (N + E) + chamfer door ---
  plane(storefrontTex(false), -213.5, 1.55, -384.10, Math.PI, 12, 3.0, false);          // N merch windows
  plane(storefrontTex(false), -203.98, 1.55, -376, Math.PI / 2, 9, 3.0, false);         // E merch windows
  { const c = [chMid[0] + nrm[0] * 0.14, chMid[1] - nrm[1] * 0.14];
    plane(storefrontTex(true), c[0], 1.55, c[1], chYaw, 2.7, 3.0, false); }             // chamfer recessed door

  // --- red SPORTS WORLD fascia band (N + chamfer + E), y 3.2..4.2 ---
  box(13, 1.0, 0.24, RED, -213.5, 3.7, -384.12);                                        // N band
  box(0.24, 1.0, 10, RED, -203.88, 3.7, -376);                                          // E band
  { const c = [chMid[0] + nrm[0] * 0.12, chMid[1] - nrm[1] * 0.12];
    box(4.0, 1.0, 0.24, RED, c[0], 3.7, c[1], chYaw); }                                 // chamfer band
  const swTex = sportsWorldTex();
  plane(swTex, -213.5, 3.7, -384.26, Math.PI, 10, 0.86, false);                         // N lettering
  { const c = [chMid[0] + nrm[0] * 0.26, chMid[1] - nrm[1] * 0.26];
    plane(sportsWorldTex(), c[0], 3.7, c[1], chYaw, 3.4, 0.72, false); }                // chamfer lettering

  // --- red/cream striped awnings over the N ground-floor windows ---
  const awn = awningTex();
  for (const ax of [-215.4, -209.6]) {
    box(3.5, 0.1, 1.0, RED, ax, 2.98, -384.55, 0);                                       // solid sloped top (folds red)
    plane(awn, ax, 2.5, -384.95, Math.PI, 3.4, 0.55, false);                             // striped valance flap
  }

  // --- canvas souvenir banners under the 2nd-floor sills ---
  plane(bannerTex('CUBS SOUVENIRS', null, '#0e4c92', '#f7f5ef'), -214, 4.9, -384.20, Math.PI, 6.0, 0.72, false);
  plane(bannerTex('T-SHIRTS · CAPS', 'PENNANTS', '#bf2f27', '#f7f5ef'), -203.94, 4.9, -376.5, Math.PI / 2, 5.4, 0.9, false);
  plane(wFlagBannerTex(), -208.4, 4.9, -384.20, Math.PI, 1.1, 0.72, true);

  // --- simple 2nd-floor window rows (N + E) ---
  plane(windowGridTex(3, 1), -213.5, 5.95, -384.14, Math.PI, 8, 1.35, true);
  plane(windowGridTex(2, 1), -203.94, 5.95, -377, Math.PI / 2, 5, 1.35, true);

  // --- sidewalk merch racks ON the Addison S sidewalk, just outside the door ---
  // (IN the walk corridor -> colliders; near the NE/chamfer door)
  box(1.3, 0.85, 0.8, BASE, -211.5, 0.45, -386.6, 0);                                    // cap bin
  plane2(merchSignTex('CUBS', 'HATS $10', '#0e4c92', '#c0271f'), -211.5, 1.15, -386.18, Math.PI, 1.1, 0.55, false);
  collide(-211.5, -386.6, 0.75);
  box(1.0, 1.4, 0.6, DARK, -207.8, 0.7, -386.9, 0);                                       // t-shirt rack post box
  plane2(merchSignTex('TEES', '$20', '#c0271f', '#0e4c92'), -207.8, 1.65, -386.58, Math.PI, 0.9, 0.5, false);
  collide(-207.8, -386.9, 0.6);
}

// =====================================================================
//  2. 940-W STATION-CORNER BLOCK  (NE corner Sheffield & Addison)
// =====================================================================
function buildStationCorner() {
  const L = VILLAGE_W.stationCorner;                     // x -176(W)..-162(E), z -430(N)..-415(S), h 10.4
  const H = L.h, cx = (L.x0 + L.x1) / 2, cz = (L.z0 + L.z1) / 2;   // (-169, -422.5)
  const w = L.x1 - L.x0, d = L.z1 - L.z0;                // 14 x 15

  box(w, H, d, BLONDE, cx, H / 2, cz);                   // blonde body
  box(w + 0.4, 0.45, d + 0.4, CREAM, cx, H - 0.1, cz);   // limestone cornice

  // ground-floor dark storefronts (S = Addison, W = Sheffield) with doors
  plane(storefrontTex(true), cx, 1.55, L.z1 + 0.08, 0, 13, 3.0, false);                  // S face (faces south)
  plane(storefrontTex(true), L.x0 - 0.08, 1.55, cz, -Math.PI / 2, 14, 3.0, false);       // W face (faces west)

  // upper window grids (2 storeys) on S + W
  plane(windowGridTex(4, 2), cx, 6.6, L.z1 + 0.06, 0, 11, 4.4, true);
  plane(windowGridTex(4, 2), L.x0 - 0.06, 6.6, cz, -Math.PI / 2, 12, 4.4, true);

  // ---- CTA wayfinding blade: perpendicular to the S face near the EAST end,
  //      projecting SOUTH over the Addison sidewalk (faces E/W). Back-to-back
  //      FrontSide pair (two textures) so neither side shows mirrored text; the
  //      arrow points toward the Red Line head-house (east) on each face. ----
  // sits just WEST of the dressing street-tree (x ~ -164.5) so it reads
  // unoccluded on the eastbound approach toward the head-house.
  const bx = -166.5, by = 3.5, bz = -412.6;              // over the sidewalk, out from z -415
  box(0.14, 1.1, 2.9, DARK, bx, by, bz, 0);              // dark blade body
  box(0.1, 0.1, 3.0, BASE, bx, by + 0.68, -413.3, 0);    // top bracket back to the wall
  // west face (read walking EAST toward the station): arrow to the right end
  plane(ctaBladeTex(+1), bx - 0.08, by, bz, -Math.PI / 2, 2.7, 0.9, false);
  // east face (read walking WEST): arrow to the left end (mirror-consistent)
  plane(ctaBladeTex(-1), bx + 0.08, by, bz, Math.PI / 2, 2.7, 0.9, false);
}

// =====================================================================
//  3. GALLAGHER OFFICE CORNER DRESSING  (Clark & Waveland SE corner)
//  Derive every plane from OFFICE_W + clarkX so it can't drift from the
//  019 mass (buildGallagherOffice: cx = clarkX(zc)+27, rotation.y = clarkYaw,
//  local +x = off-depth (dep 24), local +z = along Clark (wid 24)).
// =====================================================================
function buildOfficeCorner() {
  const O = OFFICE_W, zc = (O.z0 + O.z1) / 2, cx = clarkX(zc) + 27;   // matches village
  const dep = 24, wid = 24, cy = clarkYaw;
  const yawN = cy + Math.PI, yawW = cy - Math.PI / 2;                 // outward NORTH / WEST plane yaws
  const wc = (lx, lz) => { const [dx, dz] = yrot(lx, lz, cy); return [cx + dx, zc + dz]; };

  // ---- NORTH (Waveland) face: currently blank cream ----
  { const c = wc(0, -wid / 2 - 0.08);
    plane(storefrontTex(true), c[0], 1.55, c[1], yawN, 18, 3.0, false);       // dark glazing band + recessed entry
    const g = wc(0, -wid / 2 - 0.06);
    plane(windowGridTex(4, 3), g[0], 7.2, g[1], yawN, 18, 7.6, true);         // 3-storey window grid
  }
  // ---- WEST (Clark) face: village added upper windows; add a matching
  //      ground-floor glazing band so the retail base wraps the corner ----
  { const c = wc(-dep / 2 - 0.08, 0);
    plane(storefrontTex(false), c[0], 1.55, c[1], yawW, 18, 3.0, false); }

  // ---- GALLAGHER WAY band near the top of the ground floor at the NW corner ----
  { const c = wc(-7, -wid / 2 - 0.10);
    plane(gallagherCornerTex(), c[0], 3.0, c[1], yawN, 6.0, 1.4, false); }
}

// =====================================================================
export function buildCorners() {
  buildSportsWorld();
  buildStationCorner();
  buildOfficeCorner();
}
