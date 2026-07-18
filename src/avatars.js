// =====================================================================
//  THE AVATAR CAST (task 089) — "make some fun avatars you'd be as a
//  Chicagoan." The data + apply API for the playable cast. Each entry is a
//  createChibi palette (the SAME nested rig every NPC uses — shoes children
//  of legs, hands of arms; never manual swing) plus an optional extras()
//  builder that dresses the rig with merged 1-draw accessory meshes.
//
//  LAWS:
//   * Consumes NO rng — palettes and accessory geometry are literals.
//   * extras() meshes are built with chibiKit (vcGeo/mergeVC/vcMat — the
//     shared white vertex-color toon material) and EVERY mesh parented into
//     a rig part (head/arms/legs) is tagged userData.avatarExtra=1 so
//     applyAvatarRig rebuilds it on swap instead of carrying it. Group-level
//     extras (torso dressing) are tagged too, for uniformity.
//   * Never parent extras to parts.body — its breathing scale distorts
//     children (the suit-front law); torso dressing goes on the GROUP.
//   * Head extras that occupy the hat zone (a flat cap, a beanie) are tagged
//     userData.hatlike=1 — the hats pack hides them while a bag hat is worn.
//   * The save may hold NAMES/IDS ONLY: the chosen id persists as the
//     `ope.avatar.v1` flag (avatarselect.js owns that); nothing here writes
//     storage.
// =====================================================================
import * as THREE from 'three';
import { applyAvatarRig, MAYOR_DEF, chibiKit, tintChibiLimb } from './character.js';
import { bag } from './framework.js';

// ---------------------- accessory build kit (089) ----------------------
// Every extras() dresses the rig with MERGED vertex-color meshes drawn by the
// ONE shared white toon material (chibiKit.vcMat) — one draw call per merged
// mesh, exactly the mayor's suit-front / hats-pack trick. All coords are in the
// UNSCALED rig frame (the group is scaled 0.74 by buildMayor): body center
// y1.18 (sphere r0.62, scaled 1,1.12,0.82 -> front z0.508), head center y2.22.
// Head-worn parts parent to parts.head in HEAD-LOCAL coords (sphere r0.56, face
// +z, eyes y0.06 z0.5, brows y0.21); caps are built at a y0 SEAT and lifted by
// the mesh's own position (the hats-pack pattern) so they clear the hair.
const { vcGeo: _vg, mergeVC: _mv, vcMat: _vm } = chibiKit;
const TAU = Math.PI * 2;
const Box = (...a) => new THREE.BoxGeometry(...a);
const Sph = (...a) => new THREE.SphereGeometry(...a);
const Cyl = (...a) => new THREE.CylinderGeometry(...a);
const Tor = (...a) => new THREE.TorusGeometry(...a);
// acc([[geo,hex],…]) -> ONE avatar-extra mesh (1 draw). Tagged so applyAvatarRig
// rebuilds it on a rig swap instead of carrying it onto the next avatar.
function acc(list) {
  const m = new THREE.Mesh(_mv(list.map(([g, h]) => _vg(g, h))), _vm());
  m.userData.avatarExtra = 1;
  return m;
}
// torsoShell(col): a sleeveless vest — front(+z) & back(-z) sphere-patch panels
// sitting ~0.034 proud of the body ellipsoid, arms + neck left open.
function torsoShell(col) {
  const mk = p => { const s = Sph(0.63, 20, 16, p - 1.0, 2.0, 0.6, 1.5); s.scale(1, 1.12, 0.86); s.translate(0, 1.18, 0); return [s, col]; };
  return [mk(Math.PI / 2), mk(-Math.PI / 2)];
}

// ------------------------------ the cast -------------------------------
// { id, name, icon, blurb, def:{chibi:<createChibi opts>, extras?(group,parts) } }
// The mayor (owner portrait) is the default and always first — UNTOUCHED.

// 1) the biker — Milwaukee-Ave leather. Full short beard + zipper/collar dressing.
function biker(group, parts) {
  const BEARD = 0x46352a, g = [];
  g.push([Sph(0.15, 10, 8).scale(1.15, 0.82, 0.9).translate(0, -0.31, 0.36), BEARD]);           // chin
  for (const s of [-1, 1]) {
    g.push([Sph(0.125, 9, 8).scale(1, 0.92, 0.9).translate(s * 0.18, -0.28, 0.35), BEARD]);      // lower jaw
    g.push([Sph(0.115, 9, 8).scale(1, 1, 0.85).translate(s * 0.31, -0.19, 0.27), BEARD]);        // jaw side
    g.push([Sph(0.10, 8, 7).scale(1, 1.1, 0.85).translate(s * 0.375, -0.05, 0.15), BEARD]);      // toward the ear
  }
  parts.head.add(acc(g));                                                                        // beard is NOT hatlike
  const SILVER = 0xb9bec6, COLL = 0x35353e, j = [];
  const zip = Box(0.03, 0.56, 0.04); zip.rotateX(-0.22); zip.translate(-0.09, 1.25, 0.505); j.push([zip, SILVER]);
  for (const s of [-1, 1]) {
    const lap = Box(0.12, 0.34, 0.05); lap.rotateZ(-s * 0.32); lap.rotateY(s * 0.34); lap.rotateX(-0.26); lap.translate(s * 0.17, 1.52, 0.45);
    j.push([lap, COLL]);
  }
  group.add(acc(j));
}

// 2) the diehard — high-adiposity hockey superfan, rendered as a big joyful fan.
function sportsfan(group, parts) {
  parts.body.scale.set(1.34, 1.12, 1.18);                    // wide, warm build (y stays 1.12 — idle breathe writes it)
  parts.legL.position.x = -0.27; parts.legR.position.x = 0.27;
  parts.armL.position.x = -0.71; parts.armR.position.x = 0.71;
  const WHITE = 0xecebe6, h = [];
  for (const [y, xr, zr] of [[1.35, 0.865, 0.765], [1.02, 0.855, 0.755]]) {   // two jersey hoops on the widened body
    const ring = Tor(0.80, 0.055, 10, 30).rotateX(Math.PI / 2);
    ring.scale(xr / 0.80, 1, zr / 0.80); ring.translate(0, y, 0);
    h.push([ring, WHITE]);
  }
  group.add(acc(h));
}

// 3) the consultant — River-North yuppie in a navy quarter-zip vest.
function yuppie(group, parts) {
  const NAVY = 0x2c3a56, PULL = 0x9aa6b2, v = [...torsoShell(NAVY)];
  v.push([Sph(0.032, 8, 7).translate(0, 1.72, 0.55), PULL]);   // zipper pull dot at the collar
  group.add(acc(v));
}

// 4) pilates girl — teal mat slung across the back.
function pilates(group, parts) {
  const MAT = 0x3f9d8f, STRAP = 0x2b2f33, m = [];
  const roll = Cyl(0.14, 0.14, 0.85, 14); roll.rotateZ(0.5); roll.translate(0, 1.55, -0.55); m.push([roll, MAT]);
  for (const t of [-0.30, 0.30]) {
    const band = Cyl(0.152, 0.152, 0.09, 14); band.rotateZ(0.5);
    band.translate(-Math.sin(0.5) * t, 1.55 + Math.cos(0.5) * t, -0.55); m.push([band, STRAP]);
  }
  group.add(acc(m));
}

// 5) the chef — white short-sleeve shirt under a blue apron; bare tattooed forearms.
function chef(group, parts) {
  const SKIN = 0xdba580, SLEEVE = 0xefece3, INK = 0x3c6668;
  for (const arm of [parts.armL, parts.armR]) {
    tintChibiLimb(arm, 'arm', SKIN);                          // sleeve rolled up -> bare forearm (cuff is already skin)
    const a = [];
    a.push([Cyl(0.138, 0.138, 0.20, 12).translate(0, -0.10, 0), SLEEVE]);   // short white sleeve stub
    a.push([Cyl(0.127, 0.127, 0.05, 12).translate(0, -0.30, 0), INK]);      // two ink tattoo bands
    a.push([Cyl(0.127, 0.127, 0.05, 12).translate(0, -0.42, 0), INK]);
    arm.add(acc(a));
  }
  const APRON = 0x3d6bb3, ap = [];
  const bib = Box(0.30, 0.32, 0.04); bib.rotateX(-0.16); bib.translate(0, 1.45, 0.515); ap.push([bib, APRON]);
  const skirt = Box(0.44, 0.50, 0.04); skirt.rotateX(0.06); skirt.translate(0, 1.04, 0.505); ap.push([skirt, APRON]);
  const tie = Box(0.66, 0.07, 0.05); tie.translate(0, 1.17, 0.50); ap.push([tie, APRON]);
  for (const s of [-1, 1]) { const st = Box(0.05, 0.30, 0.04); st.rotateX(-0.34); st.translate(s * 0.12, 1.66, 0.44); ap.push([st, APRON]); }
  group.add(acc(ap));
}

// 6) the cab driver — silver-grey afro, tweed flat cap, mustard cardigan.
function taxi(group, parts) {
  const TWEED = 0x6b5b45, c = [];
  const dome = Sph(0.56, 18, 12, 0, TAU, 0, Math.PI * 0.56).scale(1.12, 0.74, 1.16);   // fuller newsboy crown (seat y0)
  c.push([dome, TWEED]);
  const bill = Box(0.38, 0.05, 0.18); bill.rotateX(0.34); bill.translate(0, -0.03, 0.46); c.push([bill, TWEED]);   // short front peak
  const cap = acc(c); cap.userData.hatlike = 1; cap.position.set(0, 0.44, 0.0); cap.rotation.x = 0.15; parts.head.add(cap);
  const DK = 0x5f492a, BTN = 0x3a2c18, cg = [];
  for (const s of [-1, 1]) { const f = Box(0.09, 0.42, 0.05); f.rotateZ(-s * 0.20); f.rotateX(-0.22); f.translate(s * 0.10, 1.44, 0.47); cg.push([f, DK]); }
  for (const y of [1.30, 1.15, 1.00]) cg.push([Sph(0.03, 8, 7).translate(0, y, 0.505), BTN]);
  group.add(acc(cg));
}

// 7) ¡viva México! — El Tri superfan under a tricolor cape.
function vivamex(group, parts) {
  const GRN = 0x159048, WHT = 0xf2efe8, RED = 0xc42f33, v = [];
  for (const [x, col] of [[-0.245, GRN], [0, WHT], [0.245, RED]]) {
    const b = Box(0.25, 0.86, 0.03); b.rotateX(0.12); b.translate(x, 1.34, -0.53); v.push([b, col]);   // cape band, flares out at the hem
  }
  for (const s of [-1, 1]) { const f = Box(0.045, 0.20, 0.05); f.rotateZ(-s * 0.5); f.translate(s * 0.06, 1.55, 0.50); v.push([f, RED]); }   // red V collar
  group.add(acc(v));
}

// 8) the conductor — CTA L operator: hi-vis vest + navy service cap.
function conductor(group, parts) {
  const HIVIS = 0xf2c516, SILVER = 0xd8dbe0, v = [...torsoShell(HIVIS)];
  for (const y of [1.34, 1.06]) {                            // two silver reflective stripes across the front
    const band = Tor(0.65, 0.035, 8, 20, 2.0); band.rotateX(Math.PI / 2); band.rotateY(-0.571); band.scale(1, 1, 0.86); band.translate(0, y, 0);
    v.push([band, SILVER]);
  }
  group.add(acc(v));
  const NAVY = 0x2b3a55, BADGE = 0xd8dbe0, c = [];
  c.push([Cyl(0.48, 0.52, 0.20, 20).translate(0, 0.10, 0), NAVY]);        // flat-top crown (seat y0)
  c.push([Cyl(0.48, 0.48, 0.02, 20).translate(0, 0.20, 0), NAVY]);        // flat lid
  const bill = Box(0.40, 0.05, 0.19); bill.rotateX(0.26); bill.translate(0, -0.02, 0.42); c.push([bill, NAVY]);
  c.push([Box(0.06, 0.06, 0.03).translate(0, 0.06, 0.50), BADGE]);        // silver badge
  const cap = acc(c); cap.userData.hatlike = 1; cap.position.set(0, 0.40, 0.0); cap.rotation.x = 0.04; parts.head.add(cap);
}

// 9) da superfan — SNL Bears superfan: mustache, aviators, jersey.
function bearsfan(group, parts) {
  const DARK = 0x2e241c, GLASS = 0x141414, ORANGE = 0xd96b2b, h = [];
  for (const s of [-1, 1]) { const m = Box(0.14, 0.07, 0.06); m.rotateZ(-s * 0.25); m.translate(s * 0.075, -0.085, 0.55); h.push([m, DARK]); }   // thick mustache
  h.push([Box(0.46, 0.115, 0.05).translate(0, 0.06, 0.575), GLASS]);     // aviator bar across BOTH eyes (the joke)
  for (const s of [-1, 1]) h.push([Box(0.05, 0.035, 0.30).translate(s * 0.245, 0.075, 0.42), GLASS]);   // temples toward the ears
  parts.head.add(acc(h));                                                 // NOT hatlike
  const o = [];
  for (const s of [-1, 1]) { const f = Box(0.05, 0.16, 0.05); f.rotateZ(-s * 0.55); f.translate(s * 0.07, 1.56, 0.50); o.push([f, ORANGE]); }
  o.push([Box(0.22, 0.05, 0.05).translate(0, 1.48, 0.50), ORANGE]);       // orange collar trim
  group.add(acc(o));
}

// 10) dibs defender — flannel + orange beanie + a folded lawn chair on the back.
function dibs(group, parts) {
  const PLAID = 0x2a2118, p = [];
  for (const s of [-1, 1]) { const v = Box(0.045, 0.52, 0.03); v.rotateX(-0.10); v.translate(s * 0.13, 1.22, 0.515); p.push([v, PLAID]); }
  for (const y of [1.38, 1.08]) p.push([Box(0.44, 0.045, 0.03).translate(0, y, 0.515), PLAID]);
  group.add(acc(p));
  const KNIT = 0xd97b29, b = [];
  b.push([Sph(0.47, 20, 14, 0, TAU, 0, Math.PI * 0.5).scale(1.02, 1.15, 1.05), KNIT]);   // knit dome (seat y0)
  b.push([Cyl(0.5, 0.5, 0.16, 20).translate(0, 0.02, 0), KNIT]);                          // fold-up cuff
  const beanie = acc(b); beanie.userData.hatlike = 1; beanie.position.set(0, 0.40, -0.01); beanie.rotation.x = 0.02; parts.head.add(beanie);
  // folded lawn chair strapped flat on the back: webbing panel behind, a BOLD
  // aluminum frame outline + diagonal fold brace in FRONT (toward a chase cam) so
  // the "chair" reads, top poking to the shoulder line for silhouette.
  const AL = 0xcfd3d8, GRN = 0x3f7d4a, WHT = 0xe8e5dc, c = [];
  const H = 0.86, W = 0.50, yc = 1.26, zf = -0.575, zw = -0.55;
  let i = 0; for (let k = 0; k < 6; k++) c.push([Box(W - 0.05, 0.085, 0.02).translate(0, yc - H / 2 + 0.10 + k * 0.125, zw), (i++ % 2) ? WHT : GRN]);   // webbing strips
  for (const s of [-1, 1]) c.push([Cyl(0.04, 0.04, H, 7).translate(s * W / 2, yc, zf), AL]);                                    // side rails
  for (const s of [-1, 1]) { const cr = Cyl(0.04, 0.04, W + 0.08, 7); cr.rotateZ(Math.PI / 2); cr.translate(0, yc + s * H / 2, zf); c.push([cr, AL]); }   // top + bottom rails
  const br = Cyl(0.032, 0.032, Math.hypot(W, H) * 0.96, 7); br.rotateZ(Math.atan2(H, W)); br.translate(0, yc, zf - 0.01); c.push([br, AL]);   // diagonal fold brace
  group.add(acc(c));
}

export const AVATARS = [
  { id: 'mayor', name: 'the mayor', icon: '🏛️', blurb: 'the honorable incumbent. beloved.', def: MAYOR_DEF },
  { id: 'biker', name: 'the biker', icon: '🏍️', blurb: 'milwaukee ave, leather and all. waves at every dog.',
    def: { chibi: { suit: 0x23232a, pants: 0x33415a, skin: 0xc98e66, hair: 0x3a2e26, shoe: 0x14141a, cuff: 0x1b1b20, hairStyle: 'default', bigEyes: true, face: true, detail: true }, extras: biker } },
  { id: 'sportsfan', name: 'the diehard', icon: '🏒', blurb: 'united center regular. would take a puck for you.',
    def: { chibi: { suit: 0xb02a28, pants: 0x26262b, skin: 0xe8b48d, hair: 0x4a3324, shoe: 0x1c1c20, cuff: 0x1f1f24, cheek: 0xd4766a, hairStyle: 'default', bigEyes: true, face: true, detail: true }, extras: sportsfan } },
  { id: 'yuppie', name: 'the consultant', icon: '💼', blurb: 'two monitors, one cold brew. let\'s circle back.',
    def: { chibi: { suit: 0xa8c4dd, pants: 0xc2ad7c, skin: 0xe0ac84, hair: 0x4a3626, shoe: 0x5a3d22, cuff: 0xa8c4dd, hairStyle: 'tall', bigEyes: true, face: true, detail: true }, extras: yuppie } },
  { id: 'pilates', name: 'pilates girl', icon: '🧘', blurb: 'reformer at six, matcha by seven. so centered.',
    def: { chibi: { suit: 0xb9a4d6, pants: 0x3c3a48, skin: 0xd9a077, hair: 0xd9b25f, shoe: 0xe8e5dc, cuff: 0xb9a4d6, hairStyle: 'bun', bigEyes: true, face: true, detail: true }, extras: pilates } },
  { id: 'chef', name: 'the chef', icon: '🔪', blurb: 'line-cook hands, west-loop heart. everything from scratch.',
    def: { chibi: { suit: 0xefece3, pants: 0x232326, skin: 0xdba580, hair: 0x9a7148, shoe: 0x1c1917, cuff: 0xdba580, hairStyle: 'bun', bigEyes: true, face: true, detail: true }, extras: chef } },
  { id: 'taxi', name: 'the cab driver', icon: '🚕', blurb: 'forty years of these streets. knows a shortcut for that.',
    def: { chibi: { suit: 0x8a6a3e, pants: 0x4a4a52, skin: 0x4a2e1c, hair: 0xd8d4cc, shoe: 0x3a2a1a, cuff: 0x8a6a3e, hairStyle: 'afro', bigEyes: true, face: true, detail: true }, extras: taxi } },
  { id: 'vivamex', name: '¡viva méxico!', icon: '🇲🇽', blurb: 'green, white, and loud. every goal is personal.',
    def: { chibi: { suit: 0x1e7a3e, pants: 0x2c3038, skin: 0xc08a58, hair: 0x2a2018, shoe: 0xe8e5dc, cuff: 0xf0ede4, hairStyle: 'default', bigEyes: true, face: true, detail: true }, extras: vivamex } },
  { id: 'conductor', name: 'the conductor', icon: '🚇', blurb: 'doors closing. next stop, belmont.',
    def: { chibi: { suit: 0x2b3a55, pants: 0x232a3a, skin: 0x8a5b3a, hair: 0x1f1a16, shoe: 0x14141a, cuff: 0x2b3a55, hairStyle: 'default', bigEyes: true, face: true, detail: true }, extras: conductor } },
  { id: 'bearsfan', name: 'da superfan', icon: '🐻', blurb: 'da coach woulda loved ya. bear down.',
    def: { chibi: { suit: 0x1b2a4a, pants: 0x2a2e35, skin: 0xdfa88a, hair: 0x2e241c, shoe: 0x1c1c20, cuff: 0xd96b2b, hairStyle: 'default', bigEyes: true, face: true, detail: true }, extras: bearsfan } },
  { id: 'dibs', name: 'dibs defender', icon: '🪑', blurb: 'that spot is saved. all winter.',
    def: { chibi: { suit: 0x9c3428, pants: 0x46536b, skin: 0xe3b491, hair: 0x5a4632, shoe: 0x3a2a1a, cuff: 0x812a20, hairStyle: 'default', bigEyes: true, face: true, detail: true }, extras: dibs } },
];

// ------------------------------- the API -------------------------------
let _current = 'mayor';
export const avatarById = id => AVATARS.find(a => a.id === id) || null;
export function currentAvatar() { return _current; }

// applyAvatar(id) — swap the player rig in place. Safe any time after
// buildMayor(); re-applying the current id is a no-op. After the swap the worn
// cosmetic (hat / regalia) is re-equipped through the bag so it re-parents onto
// the new head and re-asserts the hair-compression + hatlike-hide state — a
// no-op before worldReady (pack defs don't exist yet; the framework's own
// one-shot worn-restore covers boot).
export function applyAvatar(id) {
  const a = avatarById(id);
  if (!a) return false;
  if (id === _current) return true;
  applyAvatarRig(a.def);
  _current = id;
  try { const w = bag.worn(); if (w && bag.defs.has(w)) bag.equip(w); } catch (e) { }
  return true;
}
