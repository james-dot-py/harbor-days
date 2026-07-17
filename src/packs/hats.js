// =====================================================================
//  PACK: hats — THE HATS SYSTEM (task 080). Six cosmetic hats the mayor
//  actually WEARS. This module is the SOLE owner of every hat def (task 078's
//  economy-pilot handed the 'bucket-hat' def to us; its id is FROZEN because
//  existing saves own + wear it).
//
//  022 mayor-only rule: cosmetics parent to the MAYOR's head only. We never
//  touch createChibi (NPCs share it) — a hat is added to `mparts.head`, the
//  mayor's head Mesh, so it rides every animation (walk bob, jump, sit) for
//  free. No NPC ever wears one.
//
//  THE 1-DRAW LAW: every hat is worn a LOT, so each hat is exactly ONE draw
//  call. We build each part as a primitive geometry, stamp a solid per-vertex
//  'color' onto it, bake its transform in, and mergeBufferGeometries the lot
//  into ONE BufferGeometry drawn by a SINGLE shared white toon material
//  (vertexColors:true — white × vertex-color == a per-color toon material under
//  r128's LinearEncoding, exactly the trick character.js uses for chibi limbs).
//  Merges are attribute-consistent because every primitive we use
//  (Cylinder/Sphere/Box/Torus/Cone/Circle) carries position/normal/uv — never
//  hand-build a geo without a uv attr or the merge silently drops that part.
//
//  Hats are built LAZILY on first equip and cached (id -> mesh); a hat mesh is
//  never in the scene until equipped (parented to the head), and frustum-culls
//  with the mayor. No rng (determinism untouched), no per-frame update, no
//  audio, no DOM. UI is entirely the framework tote/shop.
//
//  Only-my-file rules honoured: this module + ONE import line in index.js.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, bag } from '../framework.js';
import { toon } from '../core.js';
import { mparts } from '../character.js';   // framework does NOT re-export mparts — import direct (022 mayor-only cosmetic)

// ---- ONE shared white vertex-color toon material for every hat (lazy) ----
// toon() with opts is uncached, so we cache it ourselves and reuse it across
// all six hats — one material, so the count stays 1 draw per hat.
let _vc = null;
const vc = () => _vc || (_vc = toon(0xffffff, { mat: { vertexColors: true } }));

// ---- geometry paint helpers (build-time only; scratch reuse is safe) ----
const _c = new THREE.Color();
// paint(geo,hex): non-index + stamp a solid 'color' attribute so the part can
// merge under vc(). Mirrors character.js vcGeo — every input becomes
// attribute-consistent (position/normal/uv/color).
function paint(geo, hex) {
  geo = geo.toNonIndexed();
  _c.set(hex);
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
// paintBands(geo,base,[[yLo,yHi,hex],…]): solid base color, but any vertex whose
// LOCAL y falls in a band takes that band's color — used for the pirate hat's
// printed newsprint stripes without a texture (vertex-color stripes).
const _cb = new THREE.Color();
function paintBands(geo, base, bands) {
  geo = geo.toNonIndexed();
  const pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
  _c.set(base);
  for (let i = 0; i < n; i++) {
    const y = pos.getY(i); let r = _c.r, g = _c.g, b = _c.b;
    for (const [lo, hi, hex] of bands) { if (y >= lo && y <= hi) { _cb.set(hex); r = _cb.r; g = _cb.g; b = _cb.b; break; } }
    a[i * 3] = r; a[i * 3 + 1] = g; a[i * 3 + 2] = b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
// merge painted parts into ONE mesh under the shared vc() material (1 draw).
const hatMesh = (parts) => new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(parts, false), vc());

// =====================================================================
//  HAT BUILDERS — head-LOCAL coords. The mayor's head Mesh is a sphere r0.56
//  centred at head-local origin; the afro tufts reach ~y0.87 (mass ~y0.9) and
//  its face is +z (eyes baked at z0.5). Each builder returns a merged mesh with
//  its "seat" near local y0; onEquip lifts it onto the head. Sizes chosen so the
//  crown clears the afro and the brim clears the afro silhouette.
// =====================================================================

// 1) bucket hat — olive-khaki, 078's exact silhouette (crown r0.42 h0.26 @y0.14,
//    brim 0.44→0.66 h0.1, darker band). FROZEN id — existing saves own it.
function makeBucket() {
  const khaki = 0x8a8a4e, band = 0x63632f;
  const crown = new THREE.CylinderGeometry(0.42, 0.42, 0.26, 16).translate(0, 0.14, 0);
  const brim = new THREE.CylinderGeometry(0.44, 0.66, 0.1, 18, 1, true).translate(0, 0, 0);
  const bandM = new THREE.CylinderGeometry(0.428, 0.428, 0.07, 16).translate(0, 0.04, 0);
  return hatMesh([paint(crown, khaki), paint(brim, khaki), paint(bandM, band)]);
}

// 2) ballcap (blue) — Cubs-coded royal blue: dome + forward bill + white front
//    patch + top button. No logo/letter.
function makeCap() {
  const royal = 0x123f8f, white = 0xf2f0ea;
  const dome = new THREE.SphereGeometry(0.5, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5);   // top hemisphere y0..0.5
  const button = new THREE.SphereGeometry(0.05, 8, 6).translate(0, 0.5, 0);
  // bill: a thin +z half-disc (theta −π/2..π/2 covers the +z semicircle), tilted
  // down at the front and pushed out past the dome brow.
  const bill = new THREE.CylinderGeometry(0.34, 0.34, 0.055, 22, 1, false, -Math.PI / 2, Math.PI);
  bill.rotateX(0.17); bill.translate(0, 0.055, 0.34);
  // front patch: a flattened white disc bulging off the brow
  const patch = new THREE.SphereGeometry(0.12, 12, 10).scale(1, 1, 0.32).translate(0, 0.2, 0.47);
  return hatMesh([paint(dome, royal), paint(button, royal), paint(bill, royal), paint(patch, white)]);
}

// 3) winter pom hat — navy knit dome + red fold-up cuff + white pom.
function makePom() {
  const navy = 0x20304f, red = 0xb83530, white = 0xf2efe6;
  const dome = new THREE.SphereGeometry(0.46, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5);
  dome.scale(1, 1.18, 1);                                   // stretched knit dome (apex ~0.54)
  const cuff = new THREE.CylinderGeometry(0.5, 0.5, 0.16, 20).translate(0, 0.02, 0);   // folded-up band, proud of the dome
  const pom = new THREE.SphereGeometry(0.13, 12, 10).translate(0, 0.66, 0);
  return hatMesh([paint(dome, navy), paint(cuff, red), paint(pom, white)]);
}

// 4) flower crown — thin green vine ring + 8 blossoms (pink/white/yellow) with
//    tiny yellow centres. Sits around the crown of the hair.
function makeFlowerCrown() {
  const vineHex = 0x4a8a3a, yellow = 0xf4cf55;
  const blossomHex = [0xef7fae, 0xf5efe6, 0xf4cf55];       // pink / white / yellow, cycling
  const R = 0.52;
  const ring = new THREE.TorusGeometry(R, 0.035, 8, 30); ring.rotateX(Math.PI / 2);   // horizontal vine
  const parts = [paint(ring, vineHex)];
  const N = 8;
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2, x = Math.cos(a) * R, z = Math.sin(a) * R;
    const hex = blossomHex[i % 3];
    parts.push(paint(new THREE.SphereGeometry(0.1, 9, 8).translate(x, 0.02, z), hex));
    if (hex !== yellow)                                     // pink/white blossoms get a yellow centre, nudged outward
      parts.push(paint(new THREE.SphereGeometry(0.04, 7, 6).translate(x * 1.08, 0.02, z * 1.08), yellow));
  }
  return hatMesh(parts);
}

// 5) birder's boonie — wide flat tan brim + shallow rounded crown + darker
//    hatband + two chin-cord snap dots.
function makeBoonie() {
  const tan = 0xcdb886, dk = 0x8f7a4a;
  const brim = new THREE.CylinderGeometry(0.5, 0.8, 0.055, 26).translate(0, -0.02, 0);   // wide flat brim
  const crown = new THREE.SphereGeometry(0.48, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);   // shallow rounded crown
  const band = new THREE.CylinderGeometry(0.485, 0.485, 0.055, 20).translate(0, 0.07, 0);   // darker hatband
  const parts = [paint(brim, tan), paint(crown, tan), paint(band, dk)];
  for (const s of [-1, 1])                                  // two chin-cord snap dots on the brim front
    parts.push(paint(new THREE.SphereGeometry(0.045, 7, 6).translate(s * 0.3, -0.01, 0.42), dk));
  return hatMesh(parts);
}

// 6) paper pirate hat — a folded-newspaper peak: a 4-sided pyramid squashed
//    fore-aft into a bicorne, off-white with gray printed bands. SIZED TO THE
//    AFRO: the first cut (r0.6, seat y0.5) vanished INSIDE the hair (tufts
//    reach ~y0.87; only a 0.15 m apex sliver ever poked out — two shots showed
//    no hat at all). Wider than the afro + seated above it so the whole
//    newspaper triangle reads against the hair.
function makePirate() {
  const paper = 0xf0ebdd, print = 0xa7a29a;
  const cone = new THREE.ConeGeometry(0.78, 0.62, 4, 1);    // square-base pyramid, afro-wide
  cone.rotateY(Math.PI / 4);                                // points to +x/−x (over the ears) & +z/−z
  cone.scale(1, 1, 0.45);                                   // squash fore-aft → a thin newspaper peak
  cone.translate(0, 0.31, 0);                               // base at y0, apex ~y0.62
  // gray print bands across the lower paper (vertex-color stripes)
  const geo = paintBands(cone, paper, [[0.07, 0.15, print], [0.24, 0.32, print]]);
  return hatMesh([geo]);
}

// id -> {make, pos:[x,y,z], rotX, name, icon, caption}. pos/rotX tuned per hat so
// nothing floats or sinks into the afro (verified in tools/shots/hats-*).
const HATS = [
  { id: 'bucket-hat', make: makeBucket, pos: [0, 0.45, 0.02], rotX: 0.07,
    name: 'bucket hat', icon: '👒', caption: 'lake-tested. mayor-approved.' },
  { id: 'cubs-cap', make: makeCap, pos: [0, 0.44, 0.0], rotX: 0.03,
    name: 'ballcap (blue)', icon: '🧢', caption: 'how bout them cubs' },
  { id: 'pom-hat', make: makePom, pos: [0, 0.42, 0.0], rotX: 0.0,
    name: 'winter pom hat', icon: '🧶', caption: 'the rink misses you. july won’t mind.' },
  { id: 'flower-crown', make: makeFlowerCrown, pos: [0, 0.46, 0.0], rotX: 0.0,
    name: 'flower crown', icon: '🌸', caption: 'lolla petals, no wristband required.' },
  { id: 'boonie-hat', make: makeBoonie, pos: [0, 0.46, 0.02], rotX: 0.05,
    name: 'birder’s boonie', icon: '🐦', caption: 'the plover respects it.' },
  { id: 'pirate-hat', make: makePirate, pos: [0, 0.6, 0.0], rotX: 0.0,
    name: 'paper pirate hat', icon: '🏴‍☠️', caption: 'front page: you, a pirate.' },
];

// ==================================================================== //
onWorldReady(() => {
  const built = new Map();   // id -> merged mesh (lazy; cached across equips)
  for (const h of HATS) {
    bag.define({
      id: h.id, name: h.name, icon: h.icon, kind: 'cosmetic', caption: h.caption,
      onEquip() {
        let m = built.get(h.id);
        if (!m) { m = h.make(); m.position.set(h.pos[0], h.pos[1], h.pos[2]); m.rotation.x = h.rotX; built.set(h.id, m); }
        if (m.parent !== mparts.head) mparts.head.add(m);
      },
      onUnequip() { const m = built.get(h.id); if (m && m.parent) m.parent.remove(m); },
    });
  }
});
