// =====================================================================
//  PACK: hats — THE HATS SYSTEM (task 080; re-authored task 089). Six cosmetic
//  hats the player actually WEARS. This module is the SOLE owner of every hat
//  def (task 078's economy-pilot handed the 'bucket-hat' def to us; its id is
//  FROZEN because existing saves own + wear it).
//
//  PLAYER-RIG-ONLY rule (was "022 mayor-only"): cosmetics parent to the PLAYER
//  rig's head only. The 089 avatar cast shares the ONE `mayor` group + `mparts`
//  rig (avatarselect swaps the rig in place), so a hat added to `mparts.head`
//  rides whichever avatar is worn — and every animation (walk bob, jump, sit)
//  for free. We never touch createChibi; no NPC ever wears one.
//
//  089 — HATS REPLACE THE HAIR, they no longer perch on the afro. Every hat but
//  the flower crown sets `keepHair:false`; on equip we call
//  setHairCompressed(mparts,true) (character.js) which squashes the baked hair
//  to a skull-hugging cap (max reach ~0.60 head-local; fringe still shows at the
//  nape/ears under a brim — DESIRED). onUnequip restores the afro exactly. The
//  call is UNCONDITIONAL every equip: an avatar swap can carry an already-worn
//  hat mesh onto a fresh, uncompressed head, so we must (re)assert it even when
//  the mesh is already parented. GEOMETRY LAW (head-local: head = sphere r0.56 at
//  origin, face +z, eyes y0.06 z0.5, brows y0.21 z0.495): each hat shell CONTAINS
//  a sphere of r0.60 above its hatline (nothing pokes through); the FRONT hatline
//  sits at y >= ~0.26 so brows/eyes stay visible; back/sides may dip lower. Chunky
//  Animal-Crossing proportions are correct — oversized crowns read right on a chibi.
//
//  keepHair:true is 'flower-crown' ONLY — a flower crown sits ON the intact afro;
//  every other hat replaces it. (Its equip still calls setHairCompressed(…,false)
//  so a leftover squash from another hat is undone before it goes on.)
//
//  HATLIKE AVATAR EXTRAS: some avatars (089 cast) wear built-in headwear meshes
//  parented into mparts.head tagged userData.hatlike=1 (a flat cap, a beanie).
//  While a bag hat is worn we HIDE them (c.visible=false) and un-hide on unequip;
//  we never remove them — they belong to the avatar builder.
//
//  THE 1-DRAW LAW: every hat is worn a LOT, so each hat is exactly ONE draw call.
//  We build each part as a primitive geometry, stamp a solid per-vertex 'color'
//  onto it, bake its transform in, and mergeBufferGeometries the lot into ONE
//  BufferGeometry drawn by a SINGLE shared white toon material (vertexColors:true
//  — white × vertex-color == a per-color toon material under r128's LinearEncoding,
//  the same trick character.js uses for chibi limbs). Merges are attribute-
//  consistent because every primitive we use (Cylinder/Sphere/Box/Torus/Cone/
//  Circle) carries position/normal/uv — never hand-build a geo without a uv attr.
//
//  Hats are built LAZILY on first equip and cached (id -> mesh); a hat mesh is
//  never in the scene until equipped (parented to the head), and frustum-culls
//  with the rig. No rng (determinism untouched), no per-frame update, no audio,
//  no DOM. UI is entirely the framework tote/shop.
//
//  DEBUG (tools / E2E only, SESSION-ONLY — never touches bag/save): `?hat=<id>`
//  direct-equips a hat at world-ready, and window.__hd.hats={list,wear(idOrNull)}
//  drives the same direct path headlessly. wear(null) removes + restores the afro.
//
//  Only-my-file rules honoured: this module + ONE import line in index.js.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, bag } from '../framework.js';
import { toon } from '../core.js';
import { mparts, setHairCompressed } from '../character.js';   // framework does NOT re-export these — import direct (player-rig-only cosmetic)

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
//  HAT BUILDERS — head-LOCAL coords (parented straight to mparts.head, which is
//  a sphere r0.56 at head-local origin; face is +z). Re-authored (089) to WEAR
//  over a COMPRESSED afro: each crown contains the r0.60 head-blob above its
//  hatline; the front hatline sits at y >= ~0.26 (brows y0.21 stay visible); the
//  back/sides dip lower so compressed fringe shows under the brim. Builders emit
//  the hat already seated in head-local coords (pos = [0,0,0]); rotX (about the
//  head centre) only adds a natural tilt and preserves the origin-sphere fit.
// =====================================================================

// 1) bucket hat — olive-khaki. Tapered cylinder crown (r0.575, y0.26→0.62) that
//    contains the r0.60 head, a darker hatband, and a wide drooping brim. FROZEN
//    id — existing saves own it.
function makeBucket() {
  const khaki = 0x8a8a4e, band = 0x63632f;
  const crown = new THREE.CylinderGeometry(0.575, 0.585, 0.36, 22).translate(0, 0.44, 0);   // y0.26..0.62, contains r0.60
  const brim = new THREE.CylinderGeometry(0.585, 0.86, 0.13, 26, 1, true).translate(0, 0.235, 0);   // drooping flare
  const bandM = new THREE.CylinderGeometry(0.592, 0.592, 0.09, 22).translate(0, 0.31, 0);   // hatband over the crown base
  return hatMesh([paint(crown, khaki), paint(brim, khaki), paint(bandM, band)]);
}

// 2) ballcap (blue) — Cubs-coded royal blue: rounded sphere-cap dome (r0.62, rim
//    ~y0.27) over the head, top button, chunky forward bill, white front patch.
//    No logo/letter. The dome is symmetric — compressed nape fringe shows below
//    the back rim (reads as a real cap), and the sphere r0.62 contains the head.
function makeCap() {
  const royal = 0x123f8f, white = 0xf2f0ea;
  const dome = new THREE.SphereGeometry(0.62, 22, 16, 0, Math.PI * 2, 0, 1.12);   // cap: apex y0.62, rim ~y0.27
  const button = new THREE.SphereGeometry(0.055, 8, 6).translate(0, 0.62, 0);
  // bill: a +z half-disc pushed out past the brow, drooped down at the front.
  const bill = new THREE.CylinderGeometry(0.42, 0.42, 0.06, 22, 1, false, -Math.PI / 2, Math.PI);
  bill.rotateX(0.18); bill.translate(0, 0.245, 0.42);
  // front patch: a flattened white logo disc on the front panel of the dome
  const patch = new THREE.SphereGeometry(0.13, 12, 10).scale(1, 1, 0.3).translate(0, 0.37, 0.505);
  return hatMesh([paint(dome, royal), paint(button, royal), paint(bill, royal), paint(patch, white)]);
}

// 3) winter pom hat — navy knit dome + red fold-up cuff + white pom. The red cuff
//    (r0.60 cylinder, y0.25..0.42) is the folded band; the navy dome (r0.61,
//    apex y0.61) tucks into it and contains the head; the pom crowns the apex.
function makePom() {
  const navy = 0x20304f, red = 0xb83530, white = 0xf2efe6;
  const dome = new THREE.SphereGeometry(0.63, 22, 16, 0, Math.PI * 2, 0, 1.15);   // apex y0.63, rim tucks under the cuff
  const cuff = new THREE.CylinderGeometry(0.60, 0.60, 0.15, 22).translate(0, 0.31, 0);   // folded-up band, y0.235..0.385
  const pom = new THREE.SphereGeometry(0.135, 12, 10).translate(0, 0.72, 0);
  return hatMesh([paint(dome, navy), paint(cuff, red), paint(pom, white)]);
}

// 4) flower crown — thin green vine ring + 8 blossoms (pink/white/yellow) with
//    tiny yellow centres. keepHair:true — it WRAPS the intact afro (not a shell),
//    so it rides the full-size hair; sized to sit proud of the fro, blossoms out.
function makeFlowerCrown() {
  const vineHex = 0x4a8a3a, yellow = 0xf4cf55;
  const blossomHex = [0xef7fae, 0xf5efe6, 0xf4cf55];       // pink / white / yellow, cycling
  const R = 0.56, Y = 0.46, ZB = -0.06;                    // ring nudged back to follow the afro (centre ~z-0.15)
  const ring = new THREE.TorusGeometry(R, 0.04, 8, 32); ring.rotateX(Math.PI / 2); ring.translate(0, Y, ZB);   // horizontal vine
  const parts = [paint(ring, vineHex)];
  const N = 8;
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2, x = Math.cos(a) * R, z = Math.sin(a) * R + ZB;
    const hex = blossomHex[i % 3];
    parts.push(paint(new THREE.SphereGeometry(0.11, 9, 8).translate(x, Y, z), hex));
    if (hex !== yellow)                                     // pink/white blossoms get a yellow centre, nudged outward
      parts.push(paint(new THREE.SphereGeometry(0.045, 7, 6).translate(x * 1.08, Y, (z - ZB) * 1.08 + ZB), yellow));
  }
  return hatMesh(parts);
}

// 5) birder's boonie — wide floppy tan brim + rounded sphere-cap crown (r0.62,
//    apex y0.62) that contains the head + darker hatband + two chin-cord snap dots.
function makeBoonie() {
  const tan = 0xcdb886, dk = 0x8f7a4a;
  const crown = new THREE.SphereGeometry(0.62, 22, 14, 0, Math.PI * 2, 0, 1.10);   // rounded crown, rim ~y0.28
  const brim = new THREE.CylinderGeometry(0.55, 0.96, 0.06, 30, 1, true).translate(0, 0.255, 0);   // wide floppy brim
  const band = new THREE.CylinderGeometry(0.555, 0.555, 0.06, 22).translate(0, 0.33, 0);   // darker hatband
  const parts = [paint(brim, tan), paint(crown, tan), paint(band, dk)];
  for (const s of [-1, 1])                                  // two chin-cord snap dots on the brim front
    parts.push(paint(new THREE.SphereGeometry(0.05, 7, 6).translate(s * 0.34, 0.235, 0.62), dk));
  return hatMesh(parts);
}

// 6) paper pirate hat — a folded-newspaper look: a short paper band wrapped round
//    the head (contains the wide lower head) + a 4-sided peak rising above it
//    (flat triangular faces read as folded newsprint), off-white with gray printed
//    bands. Band + peak together contain the r0.60 head with the peak never
//    pinching below it.
function makePirate() {
  const paper = 0xece7d8, print = 0x8c887e;
  // folded brim: a short wrapping band. Extra height segments so the vertex-color
  // newsprint lines land on real vertex RINGS (a 1-segment cylinder only has
  // top/bottom edge verts — mid-height bands would paint nothing).
  const band = new THREE.CylinderGeometry(0.605, 0.605, 0.19, 24, 6).translate(0, 0.325, 0);   // y0.23..0.42
  // peak: a squat truncated 4-sided pyramid (flat-topped paper ridge, not a party
  // cone), flat faces front/back so the silhouette reads as folded newsprint.
  const peak = new THREE.CylinderGeometry(0.12, 0.68, 0.46, 4, 6);
  peak.rotateY(Math.PI / 4); peak.scale(1, 1, 1.12);
  peak.translate(0, 0.63, 0);                               // base ~y0.40, ridge ~y0.86 (clears the head)
  // gray print stripes (newsprint columns) via vertex-color bands.
  const bandG = paintBands(band, paper, [[0.25, 0.30, print], [0.35, 0.375, print]]);
  const peakG = paintBands(peak, paper, [[0.45, 0.51, print], [0.60, 0.63, print]]);
  return hatMesh([bandG, peakG]);
}

// id -> {make, keepHair, pos:[x,y,z], rotX, name, icon, caption}. Builders emit
// head-local seated geometry, so pos is [0,0,0]; rotX is a small natural tilt
// about the head centre (preserves the origin-sphere containment).
const HATS = [
  { id: 'bucket-hat', make: makeBucket, pos: [0, 0, 0], rotX: -0.04,
    name: 'bucket hat', icon: '👒', caption: 'lake-tested. mayor-approved.' },
  { id: 'cubs-cap', make: makeCap, pos: [0, 0, 0], rotX: 0.0,
    name: 'ballcap (blue)', icon: '🧢', caption: 'how bout them chubs' },
  { id: 'pom-hat', make: makePom, pos: [0, 0, 0], rotX: 0.0,
    name: 'winter pom hat', icon: '🧶', caption: 'the rink misses you. july won’t mind.' },
  { id: 'flower-crown', make: makeFlowerCrown, keepHair: true, pos: [0, 0, 0], rotX: -0.06,
    name: 'flower crown', icon: '🌸', caption: 'lalla petals, no wristband required.' },
  { id: 'boonie-hat', make: makeBoonie, pos: [0, 0, 0], rotX: -0.03,
    name: 'birder’s boonie', icon: '🐦', caption: 'the plover respects it.' },
  { id: 'pirate-hat', make: makePirate, pos: [0, 0, 0], rotX: 0.0,
    name: 'paper pirate hat', icon: '🏴‍☠️', caption: 'front page: you, a pirate.' },
];

// ==================================================================== //
onWorldReady(() => {
  const built = new Map();   // id -> merged mesh (lazy; cached across equips)

  const buildOrGet = (h) => {
    let m = built.get(h.id);
    if (!m) { m = h.make(); m.position.set(h.pos[0], h.pos[1], h.pos[2]); m.rotation.x = h.rotX; built.set(h.id, m); }
    return m;
  };
  // avatar built-in headwear (userData.hatlike) hides while a bag hat is worn.
  const setHatlike = (visible) => {
    const head = mparts.head; if (!head) return;
    for (const c of head.children) if (c.userData && c.userData.hatlike) c.visible = visible;
  };
  const equip = (h) => {
    const m = buildOrGet(h);
    if (m.parent !== mparts.head) mparts.head.add(m);
    setHairCompressed(mparts, !h.keepHair);   // ALWAYS (re)assert — an avatar swap can carry the mesh onto a fresh head
    setHatlike(false);
  };
  const unequip = (h) => {
    const m = built.get(h.id); if (m && m.parent) m.parent.remove(m);
    setHairCompressed(mparts, false);         // restore the afro exactly
    setHatlike(true);
  };

  for (const h of HATS) {
    bag.define({
      id: h.id, name: h.name, icon: h.icon, kind: 'cosmetic', caption: h.caption,
      onEquip() { equip(h); },
      onUnequip() { unequip(h); },
    });
  }

  // ---- DEBUG hooks (tools / E2E only; SESSION-ONLY — never writes bag/save) ----
  const byId = (id) => HATS.find((x) => x.id === id) || null;
  let _directId = null;   // the hat last worn via the direct path (not the bag)
  const directWear = (id) => {
    if (_directId) { const p = byId(_directId); if (p) unequip(p); _directId = null; }
    if (!id) return;
    const h = byId(id); if (!h) return;
    equip(h); _directId = id;
  };
  try {
    const hp = new URLSearchParams(location.search).get('hat');
    if (hp && byId(hp)) directWear(hp);
  } catch (e) { }
  try {
    window.__hd = window.__hd || {};
    window.__hd.hats = { list: HATS.map((h) => h.id), wear: directWear };
  } catch (e) { }
});
