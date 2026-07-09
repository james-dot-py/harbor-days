// Addison Red Line station — solid earth embankment with concrete retaining
// walls, a plate-girder bridge over Addison, two tracks, an island platform
// under an oversized arched canopy, and a stair enclosed in the north mass
// exiting to the Addison sidewalk. Data: STATION_W (../data/wrigleyville.js).
// Attach everything to wrigleyRoot. LOCAL rng only (R, seed 940) — never the
// shared world rng, never wrand (keeps this file order-independent).
import * as THREE from 'three';
import { toon, bmat, mulberry32 } from '../core.js';
import { collide } from '../props.js';
import { wrigleyRoot } from './index.js';
import { atlasPlane } from './village.js';   // shared static-plane atlas (buildVillage emits it, last)
// Geometry follows STATION_W (../data/wrigleyville.js): embank x-148..-132 topY7.0;
// bridge z-414..-386 clearY5.6; platform x-143..-137 z-451..-433 y7.6; stair
// z-433..-417; landing z-417..-411; track centers x-145.5/-134.5.

const R = mulberry32(940);

// reused scratch objects (no per-call allocation)
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(),
      V = new THREE.Vector3(), E = new THREE.Euler();

// ---- palette --------------------------------------------------------------
const CONC    = 0x8f877b;   // aged warm-gray concrete (retaining wall)
const COPE    = 0xa39a8c;   // lighter capstone
const FOOT    = 0x7a7266;   // battered base course
const PILA    = 0x847c70;   // pilaster strip
const BALLAST = 0x33302b;   // dark track ballast
const TIE     = 0x2e2822;   // dark timber ties
const RAILC   = 0x8a8a92;   // metallic rail
const THIRD   = 0x5a5148;   // third-rail hint
const MAROON  = 0x5c3a34;   // CTA plate-girder maroon-brown
const DECKC   = 0x453b33;   // bridge deck underside
const SLAB    = 0x9a938a;   // platform concrete
const YEL     = 0xf2c033;   // tactile warning strip
const STEEL   = 0xe8e6e0;   // white canopy steel
const CANU    = 0xf0e9dc;   // warm-white canopy underside
const CANT    = 0x6b4a36;   // brown canopy top
const RAILM   = 0x9a9aa0;   // handrail / fence metal
const VOUS    = 0xd9cfbc;   // doorway voussoir stone

// ---- helpers --------------------------------------------------------------
// One InstancedMesh from a list of box instances {x,y,z,sx,sy,sz,ey?}, using a
// unit box scaled per instance. nseg subdivides local z so long spans follow
// the world-curve vertex shader (the scale distributes the segments).
function instBoxes(items, color, nseg = 1, opts) {
  const g = new THREE.BoxGeometry(1, 1, 1, 1, 1, nseg);
  const m = opts ? toon(color, opts) : toon(color);
  const mesh = new THREE.InstancedMesh(g, m, items.length);
  items.forEach((it, i) => {
    E.set(0, it.ey || 0, 0); Q.setFromEuler(E);
    M.compose(V.set(it.x, it.y, it.z), Q, S.set(it.sx, it.sy, it.sz));
    mesh.setMatrixAt(i, M);
  });
  mesh.instanceMatrix.needsUpdate = true;
  wrigleyRoot.add(mesh);
  return mesh;
}

function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'));
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
const F = (s) => `800 ${s}px "Trebuchet MS",sans-serif`;

// ---------- signage canvases ----------
function girderTex() {                                   // white on maroon
  return canvasTex(512, 110, g => {
    g.fillStyle = '#5c3a34'; g.fillRect(0, 0, 512, 110);
    g.strokeStyle = '#e8ded0'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 94);
    g.fillStyle = '#f4efe6'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = F(60); g.fillText('ADDISON', 256, 58);
  });
}
function stationTex() {                                  // CTA identity band: charcoal, white Addison + address
  return canvasTex(512, 184, g => {
    g.fillStyle = '#2d2d2d'; g.fillRect(0, 0, 512, 184);
    g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = F(80); g.fillText('Addison', 28, 82);
    g.textAlign = 'right'; g.font = F(30);
    g.fillText('3600 N', 486, 60); g.fillText('940 W', 486, 104);
    g.strokeStyle = '#ffffff'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(28, 142); g.lineTo(486, 142); g.stroke();
  });
}
function lintelTex() {
  return canvasTex(512, 120, g => {
    g.fillStyle = '#efe9dc'; g.fillRect(0, 0, 512, 120);
    g.strokeStyle = '#b8ab92'; g.lineWidth = 6; g.strokeRect(6, 6, 500, 108);
    g.fillStyle = '#2a2420'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = F(50); g.fillText('ADDISON', 256, 44);
    g.fillStyle = '#c0271f'; g.font = F(28); g.fillText('RED LINE', 256, 90);
  });
}
function bandTex() {                                     // street head-house identity band (wider aspect)
  return canvasTex(768, 130, g => {
    g.fillStyle = '#2d2d2d'; g.fillRect(0, 0, 768, 130);
    g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = F(70); g.fillText('Addison', 26, 62);
    g.textAlign = 'right'; g.font = F(30);
    g.fillText('3600 N', 742, 44); g.fillText('940 W', 742, 84);
    g.strokeStyle = '#ffffff'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(430, 108); g.lineTo(742, 108); g.stroke();
  });
}
function elevTex() {                                      // red Elevator tab: arrow + wheelchair glyph + label
  return canvasTex(180, 128, g => {
    g.fillStyle = '#c0271f'; g.fillRect(0, 0, 180, 128);
    g.strokeStyle = '#ffffff'; g.fillStyle = '#ffffff'; g.lineCap = 'round';
    g.lineWidth = 6;                                      // left-right arrow across the top
    g.beginPath(); g.moveTo(28, 24); g.lineTo(152, 24); g.stroke();
    g.beginPath(); g.moveTo(28, 24); g.lineTo(42, 14); g.moveTo(28, 24); g.lineTo(42, 34); g.stroke();
    g.beginPath(); g.moveTo(152, 24); g.lineTo(138, 14); g.moveTo(152, 24); g.lineTo(138, 34); g.stroke();
    g.lineWidth = 5;                                      // wheelchair glyph (wheel ring + seated figure)
    g.beginPath(); g.arc(90, 66, 19, 0, 7); g.stroke();
    g.beginPath(); g.arc(90, 46, 5, 0, 7); g.fill();
    g.beginPath(); g.moveTo(90, 52); g.lineTo(90, 66); g.lineTo(104, 66); g.moveTo(90, 60); g.lineTo(103, 60); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = F(24); g.fillText('Elevator', 90, 110);
  });
}
function cubsTex() {                                      // white panel, Cubs bullseye (blue ring, red circle, white C)
  return canvasTex(128, 128, g => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#0e4c92'; g.beginPath(); g.arc(64, 64, 54, 0, 7); g.fill();   // blue ring
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(64, 64, 46, 0, 7); g.fill();
    g.fillStyle = '#cc3433'; g.beginPath(); g.arc(64, 64, 40, 0, 7); g.fill();   // red inner circle
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 64px Georgia,"Times New Roman",serif'; g.fillText('C', 64, 68);
  });
}

export function buildStation() {
  const CX = -140;                                       // embankment centerline x
  const ZN0 = -587, ZN1 = -414;                          // north mass z-span
  const ZS0 = -386, ZS1 = -310;                          // south mass z-span
  const nCz = (ZN0 + ZN1) / 2, nLen = ZN1 - ZN0;         // -500.5, 173
  const sCz = (ZS0 + ZS1) / 2, sLen = ZS1 - ZS0;         // -348, 76
  const WX = -145.5, EXX = -134.5;                       // track centers
  const trkZc = -448.5, trkLen = 273;                    // -585..-312 continuous run
  const bZ = -400;                                       // Addison bridge center

  // =====================================================================
  // 1) EMBANKMENT MASSES  (north split around the stair channel + doorway)
  // =====================================================================
  instBoxes([
    // south mass (solid) — its north face is the south bridge abutment (z-386)
    { x: CX, y: 3.5, z: sCz, sx: 16, sy: 7, sz: sLen },
    // north mass, split so the stair channel (x-142..-138) stays open to sky:
    { x: -145, y: 3.5, z: nCz, sx: 6, sy: 7, sz: nLen },      // west block
    { x: -135, y: 3.5, z: nCz, sx: 6, sy: 7, sz: nLen },      // east block
    { x: CX,  y: 3.5, z: -510, sx: 4, sy: 7, sz: 154 },       // center, N of the stair
    { x: CX,  y: 4.9, z: -414.75, sx: 4, sy: 4.2, sz: 1.5 },  // lintel wall over the doorway (front flush z-414)
  ], CONC, 48);

  // battered base course + coped tops along the outer faces (both masses)
  instBoxes([
    { x: -148.2, y: 0.35, z: nCz, sx: 0.9, sy: 0.7, sz: nLen },
    { x: -131.8, y: 0.35, z: nCz, sx: 0.9, sy: 0.7, sz: nLen },
    { x: -148.2, y: 0.35, z: sCz, sx: 0.9, sy: 0.7, sz: sLen },
    { x: -131.8, y: 0.35, z: sCz, sx: 0.9, sy: 0.7, sz: sLen },
  ], FOOT, 48);
  instBoxes([
    { x: -147.6, y: 7.05, z: nCz, sx: 1.0, sy: 0.35, sz: nLen },
    { x: -132.4, y: 7.05, z: nCz, sx: 1.0, sy: 0.35, sz: nLen },
    { x: -147.6, y: 7.05, z: sCz, sx: 1.0, sy: 0.35, sz: sLen },
    { x: -132.4, y: 7.05, z: sCz, sx: 1.0, sy: 0.35, sz: sLen },
  ], COPE, 48);

  // pilaster strips every ~6 m on both outer faces of both masses
  {
    const pos = [];
    const addRun = (z0, z1) => { for (let z = z0; z <= z1; z += 6) { pos.push([-148.1, z], [-131.9, z]); } };
    addRun(ZN0 + 2, ZN1 - 2);
    addRun(ZS0 + 2, ZS1 - 2);
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 6.0, 0.7), toon(PILA), pos.length);
    pos.forEach(([x, z], i) => {
      const h = 5.7 + R() * 0.5;
      M.compose(V.set(x, h / 2 + 0.2, z), Q.identity(), S.set(1, h / 6.0, 1));
      mesh.setMatrixAt(i, M);
    });
    mesh.instanceMatrix.needsUpdate = true; wrigleyRoot.add(mesh);
  }

  // =====================================================================
  // 2) BRIDGE over Addison (plate girder; underside clear >= y 5.6)
  // =====================================================================
  {                                                       // deck (bottom 5.6, top flush 7.0)
    const deck = new THREE.Mesh(new THREE.BoxGeometry(13.6, 1.4, 28, 1, 1, 5), toon(DECKC));
    deck.position.set(CX, 6.3, bZ); wrigleyRoot.add(deck);
  }
  instBoxes([                                             // two deep side girders
    { x: -147.3, y: 6.55, z: bZ, sx: 0.4, sy: 1.9, sz: 28 },
    { x: -132.7, y: 6.55, z: bZ, sx: 0.4, sy: 1.9, sz: 28 },
  ], MAROON, 4);
  {                                                       // 'ADDISON' plate on each outward face
    const mat = bmat(0xffffff, { map: girderTex(), side: THREE.DoubleSide });
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, 2);
    [[-147.55, -Math.PI / 2], [-132.45, Math.PI / 2]].forEach(([x, ry], i) => {
      E.set(0, ry, 0); Q.setFromEuler(E);
      M.compose(V.set(x, 6.5, bZ), Q, S.set(5, 1, 1)); mesh.setMatrixAt(i, M);
    });
    mesh.instanceMatrix.needsUpdate = true; wrigleyRoot.add(mesh);
  }

  // =====================================================================
  // 3) TRACKS — ballast, ties, rails, third-rail hint (full run over bridge)
  // =====================================================================
  instBoxes([                                             // ballast beds (one per track)
    { x: WX,  y: 7.175, z: trkZc, sx: 2.9, sy: 0.35, sz: trkLen },
    { x: EXX, y: 7.175, z: trkZc, sx: 2.9, sy: 0.35, sz: trkLen },
  ], BALLAST, 66);
  {                                                       // ties
    const zs = [];
    for (let z = -585; z <= -312; z += 0.62) zs.push(z);
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 0.16, 0.28), toon(TIE), zs.length * 2);
    let i = 0;
    for (const z of zs) for (const cx of [WX, EXX]) {
      M.compose(V.set(cx, 7.4, z), Q.identity(), S.set(1, 1, 1)); mesh.setMatrixAt(i++, M);
    }
    mesh.instanceMatrix.needsUpdate = true; wrigleyRoot.add(mesh);
  }
  {                                                       // rails (2 per track)
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.14, trkLen, 1, 1, 66), toon(RAILC), 4);
    [-146.22, -144.78, -135.22, -133.78].forEach((x, i) => {
      M.compose(V.set(x, 7.51, trkZc), Q.identity(), S.set(1, 1, 1)); mesh.setMatrixAt(i, M);
    });
    mesh.instanceMatrix.needsUpdate = true; wrigleyRoot.add(mesh);
  }
  instBoxes([                                             // third-rail hint (outer side)
    { x: -147.3, y: 7.44, z: trkZc, sx: 0.14, sy: 0.18, sz: trkLen },
    { x: -132.7, y: 7.44, z: trkZc, sx: 0.14, sy: 0.18, sz: trkLen },
  ], THIRD, 66);

  // =====================================================================
  // 4) ISLAND PLATFORM  (slab + tactile edges + north railing)
  // =====================================================================
  {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(6, 0.25, 18, 1, 1, 6), toon(SLAB));
    slab.position.set(CX, 7.475, -442); wrigleyRoot.add(slab);
  }
  {                                                       // yellow tactile warning strips
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.06, 18, 1, 1, 6), bmat(YEL), 2);
    [-142.85, -137.15].forEach((x, i) => {
      M.compose(V.set(x, 7.63, -442), Q.identity(), S.set(1, 1, 1)); mesh.setMatrixAt(i, M);
    });
    mesh.instanceMatrix.needsUpdate = true; wrigleyRoot.add(mesh);
  }
  {                                                       // short railing at the north end
    const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), toon(RAILM), 4);
    [-142.5, -140.83, -139.17, -137.5].forEach((x, i) => {
      M.compose(V.set(x, 8.1, -451), Q.identity(), S.set(1, 1, 1)); posts.setMatrixAt(i, M);
    });
    posts.instanceMatrix.needsUpdate = true; wrigleyRoot.add(posts);
    const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(5.4, 0.06, 0.06), toon(RAILM), 2);
    [8.5, 8.05].forEach((y, i) => {
      M.compose(V.set(CX, y, -451), Q.identity(), S.set(1, 1, 1)); bars.setMatrixAt(i, M);
    });
    bars.instanceMatrix.needsUpdate = true; wrigleyRoot.add(bars);
  }

  // =====================================================================
  // 5) CANOPY  — oversized gentle arch on a single centre row of posts
  // =====================================================================
  const yAxis = -10.92;                                   // cylinder axis y (apex = yAxis + R)
  {
    const under = new THREE.Mesh(
      new THREE.CylinderGeometry(22, 22, 14, 6, 8, true, -0.23, 0.46),
      toon(CANU, { mat: { side: THREE.DoubleSide } }));
    under.rotation.x = -Math.PI / 2; under.position.set(CX, yAxis, -442); wrigleyRoot.add(under);
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(22.22, 22.22, 14.4, 6, 8, true, -0.26, 0.52),
      toon(CANT, { mat: { side: THREE.DoubleSide } }));
    top.rotation.x = -Math.PI / 2; top.position.set(CX, yAxis, -442); wrigleyRoot.add(top);
  }
  {                                                       // centre row of white steel posts
    const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.13, 3.4, 8), toon(STEEL), 4);
    [-448, -444, -440, -436].forEach((z, i) => {
      M.compose(V.set(CX, 9.3, z), Q.identity(), S.set(1, 1, 1)); posts.setMatrixAt(i, M);
    });
    posts.instanceMatrix.needsUpdate = true; wrigleyRoot.add(posts);
  }
  {                                                       // hanging + post-mounted station signs
    // back-to-back FrontSide pairs (one InstancedMesh — same single draw): a lone
    // DoubleSide plane shows MIRRORED text from behind, and the dark retexture
    // made that read down the whole platform. Each partner faces outward; the
    // near opaque plane occludes the far one.
    const mat = bmat(0xffffff, { map: stationTex() });
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, 6);
    const items = [
      { x: CX, y: 9.6, z: -448.53, sx: 3.2, sy: 0.9, ry: Math.PI },        // faces north
      { x: CX, y: 9.6, z: -448.47, sx: 3.2, sy: 0.9, ry: 0 },              // partner faces south
      { x: CX, y: 9.6, z: -435.47, sx: 3.2, sy: 0.9, ry: 0 },              // faces south
      { x: CX, y: 9.6, z: -435.53, sx: 3.2, sy: 0.9, ry: Math.PI },        // partner faces north
      { x: -139.73, y: 9.2, z: -442, sx: 2.1, sy: 0.72, ry: Math.PI / 2 }, // post blade (faces east)
      { x: -139.67, y: 9.2, z: -442, sx: 2.1, sy: 0.72, ry: -Math.PI / 2 },// partner faces west
    ];
    items.forEach((it, i) => {
      E.set(0, it.ry, 0); Q.setFromEuler(E);
      M.compose(V.set(it.x, it.y, it.z), Q, S.set(it.sx, it.sy, 1)); mesh.setMatrixAt(i, M);
    });
    mesh.instanceMatrix.needsUpdate = true; wrigleyRoot.add(mesh);
  }

  // =====================================================================
  // 6) STAIR  — open channel in the north mass, arched doorway to Addison
  // =====================================================================
  const rampPhi = Math.atan2(6.7, 16);                    // ramp slope (7.6 -> 0.9 over 16 m)
  {                                                       // ~12 visible treads down the ramp
    const treads = new THREE.InstancedMesh(new THREE.BoxGeometry(4, 0.16, 1.35), toon(SLAB), 12);
    for (let i = 0; i < 12; i++) {
      const t = (i + 0.5) / 12, z = -433 + t * 16, y = 7.6 - t * 6.7;
      M.compose(V.set(CX, y - 0.08, z), Q.identity(), S.set(1, 1, 1)); treads.setMatrixAt(i, M);
    }
    treads.instanceMatrix.needsUpdate = true; wrigleyRoot.add(treads);
  }
  {                                                       // sloped channel side walls + handrails
    const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 1.7, 17.35), toon(CONC), 2);
    const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.06, 17.6), toon(RAILM), 2);
    E.set(rampPhi, 0, 0); Q.setFromEuler(E);
    [-142.5, -137.5].forEach((x, i) => {
      M.compose(V.set(x, 4.5, -425), Q, S.set(1, 1, 1)); walls.setMatrixAt(i, M);
      M.compose(V.set(x, 5.4, -425), Q, S.set(1, 1, 1)); rails.setMatrixAt(i, M);
    });
    walls.instanceMatrix.needsUpdate = true; rails.instanceMatrix.needsUpdate = true;
    wrigleyRoot.add(walls, rails);
  }
  {                                                       // arched doorway + limestone head-house portal (street level, under the tracks)
    const arch = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.26, 6, 16, Math.PI), toon(VOUS));
    arch.position.set(CX, 2.6, -413.85); wrigleyRoot.add(arch);
    const lintel = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.6),
      bmat(0xffffff, { map: lintelTex(), side: THREE.DoubleSide }));
    lintel.position.set(CX, 3.15, -413.8); atlasPlane(lintel, false);   // 'ADDISON' lintel -> shared wrigley atlas
    // (former CTA roundel dropped: at y6.1 it would embed in the bridge deck underside (y5.6), and the
    //  new header fills its old y4.9 slot; the real 942-W-Addison portal carries the band + tabs, no roundel)
    // limestone portal frame proud ~0.9 m — plain toon(VOUS) meshes merge into the arch's static bucket (no new draw)
    const vm = toon(VOUS), jamb = new THREE.BoxGeometry(1.2, 4.4, 0.9);
    for (const jx of [-142.8, -137.2]) {                 // two jamb piers flanking the x-142..-138 walk gap (kept clear)
      const p = new THREE.Mesh(jamb, vm); p.position.set(jx, 2.2, -413.55); wrigleyRoot.add(p);
    }
    const hdr = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.8, 0.9), vm);
    hdr.position.set(CX, 4.8, -413.55); wrigleyRoot.add(hdr);            // header beam spanning the piers (overhead, clears the deck at y5.6)
    // sign band on the header front + red Elevator tab (left) + white Cubs bullseye panel (right); all atlas'd (no new draw)
    const band = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.78),
      bmat(0xffffff, { map: bandTex(), side: THREE.DoubleSide }));
    band.position.set(CX, 4.8, -413.05); atlasPlane(band, false);       // 0.05 proud of the header front (z-413.1)
    const elev = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.78),
      bmat(0xffffff, { map: elevTex(), side: THREE.DoubleSide }));
    elev.position.set(-142.6, 4.8, -413.0); atlasPlane(elev, false);    // left end, 0.05 proud of the band
    const cubs = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8),
      bmat(0xffffff, { map: cubsTex(), side: THREE.DoubleSide }));
    cubs.position.set(-137.3, 4.8, -413.0); atlasPlane(cubs, false);    // right end, opaque panel, 0.05 proud of the band
  }
  instBoxes([                                             // non-blocking turnstile hint (no collider)
    { x: -139, y: 0.7, z: -416, sx: 0.14, sy: 1.4, sz: 0.14 },
    { x: -140, y: 1.0, z: -416, sx: 1.6, sy: 0.12, sz: 0.12 },
  ], RAILM, 1);

  // =====================================================================
  // 7) COLLIDERS  (keep the stair mouth, platform interior, doorway + the
  //    under-bridge street clear; never let the player reach the tracks)
  // =====================================================================
  // north bridge abutment — solid wall flanking the doorway gap (x-142..-138)
  for (const x of [-147, -145, -143, -137, -135, -133]) collide(x, -414.5, 1.1);
  // head-house portal jamb piers (flank the doorway; NOTHING inside x-142..-138)
  collide(-142.8, -413.6, 0.55); collide(-137.2, -413.6, 0.55);
  // south bridge abutment — full wall
  for (const x of [-147, -145, -143, -141, -139, -137, -135, -133]) collide(x, -385.5, 1.1);
  // platform edges facing the track beds
  for (let z = -451; z <= -433; z += 3) { collide(-143.4, z, 0.4); collide(-136.6, z, 0.4); }
  // stair channel side walls (skip z-433: the stair mouth stays open)
  for (let z = -430; z <= -417; z += 3.2) { collide(-142.6, z, 0.35); collide(-137.4, z, 0.35); }
}
