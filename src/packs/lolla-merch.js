// =====================================================================
//  PACK: lolla-merch — THE LOLLA MERCH TENT (task 080). A tiny festival
//  merch tent at Butler Field's entry (214, 926) in the MILLENNIUM cell:
//  four poles, a striped canopy, a counter, two hanging tees, a 'MERCH'
//  sign, and a keeper who does not make the rules. The counter opens the
//  framework shop (LOLLA MERCH: boombox-to-go 35 · flower crown 20).
//
//  THE BOOMBOX-TO-GO — the beach boombox's radio engine, in your hand,
//  anywhere. It BORROWS the engine that lives in packs/progression.js via
//  the exported radioApi: takeover() moves the engine onto our own smaller
//  box (parking the towel box if it was in hand), R cycles the same six
//  stations (radio.carrying is set by takeover, so progression's existing
//  R handler just works), and a player-following ✋ interaction gives touch
//  players the stations too (hard constraint 7). release() hands it back.
//
//  DRAW LAW: every static tent part is painted with a per-vertex color and
//  mergeBufferGeometries'd into ONE vertexColors toon mesh (1 draw), exactly
//  the packs/hats.js pattern; the canvas 'MERCH' sign stays its OWN FrontSide
//  mesh (never atlased with letters — 050 law) with a solid merged backing box
//  behind it (no mirrored text from behind — 028/032). = 2 static draws.
//
//  Parented to getCell('millennium').root (cell-culled for free; added AFTER
//  buildMillennium's static merge so it stays live). This pack imports LAST so
//  the cell exists — but we assert it and defer to the first update frame if
//  it doesn't (PITFALLS 051: a swallowed onWorldReady getCell() throw hides as
//  a [framework] warn). Determinism: ZERO world rng; toon()/bmat() for every
//  mesh; audio is progression's (actx-guarded there). Colliders inboard on the
//  pre-probed-clean lawn (065 trap law). No per-frame allocation.
//
//  Only-my-file rules honoured: this module + ONE import line in index.js +
//  the MINIMAL radioApi surface added to progression.js.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, registerUpdate, addInteraction, holdItem, makeNPC,
         toast, bag, shop } from '../framework.js';
import { toon, bmat } from '../core.js';
import { getCell } from '../cells.js';
import { collide } from '../props.js';
import { mparts } from '../character.js';   // hand-steal guard (022 mayor-only rig)
import { radioApi } from './progression.js';  // the shared radio engine

// ---- ONE shared white vertexColors toon material for the merged tent ----
let _vc = null;
const vc = () => _vc || (_vc = toon(0xffffff, { mat: { vertexColors: true } }));

// ---- geometry paint helpers (build-time; scratch reuse is safe) — the
//      hats.js recipe: toNonIndexed + stamp a solid/banded 'color' attribute so
//      every primitive (Box/Cone/Cylinder/Plane) merges attribute-consistent. --
const _c = new THREE.Color();
function paint(geo, hex) {
  geo = geo.toNonIndexed();
  _c.set(hex);
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
const _cb = new THREE.Color();
function paintBands(geo, base, bands) {   // solid base; verts whose WORLD y is in a band take that color
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

// ---- canvas signs (own canvas, measureText-fitted font: 028/050 word-sign law)
function cvTex(cv) { const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t; }
function fitFont(g, text, maxW, px, weight = '900') {
  let p = px; do { g.font = `${weight} ${p}px Arial,sans-serif`; if (g.measureText(text).width <= maxW) break; p -= 2; } while (p > 10);
  g.font = `${weight} ${p}px Arial,sans-serif`; return p;
}
function signTex(text) {                    // plum 'MERCH' plate, cream letters
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = '#6e1b39'; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = 'rgba(244,220,160,0.6)'; g.lineWidth = 8; g.strokeRect(9, 9, 494, 110);
  g.fillStyle = '#f4e6cf'; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFont(g, text, 452, 84); g.fillText(text, 256, 66);
  return cvTex(cv);
}
function stickerTex() {                      // tiny festival star sticker for the box
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  g.fillStyle = '#6e1b39'; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill();
  g.fillStyle = '#f2c14e'; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 5 * i - Math.PI / 2, r = i % 2 ? 8 : 20;
    const x = 32 + Math.cos(a) * r, y = 32 + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.closePath(); g.fill();
  return cvTex(cv);
}

// ---- the boombox-to-go mesh (progression's buildBoombox recipe at 0.75 scale,
//      with its OWN speaker-cone array — never touches radio.box/radio.speakers) --
function buildTogo() {
  const S = 0.75, g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.92 * S, 0.44 * S, 0.22 * S), toon(0x2a2a30)));       // body
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.36 * S, 0.16 * S, 0.02 * S), toon(0x14141a));
  grille.position.set(0, 0.02 * S, 0.12 * S); g.add(grille);
  const cones = [];
  for (const sx of [-0.28, 0.28]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * S, 0.15 * S, 0.04 * S, 16), toon(0x45464e));
    ring.rotation.x = Math.PI / 2; ring.position.set(sx * S, 0, 0.11 * S); g.add(ring);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.1 * S, 0.08 * S, 16), toon(0x101015));
    cone.rotation.x = -Math.PI / 2; cone.position.set(sx * S, 0, 0.14 * S); g.add(cone);
    cones.push(cone);                                                                              // our OWN pulse cones
  }
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.2 * S, 0.02 * S, 6, 14, Math.PI), toon(0x3a3a42));
  handle.position.set(0, 0.24 * S, 0); g.add(handle);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008 * S, 0.008 * S, 0.5 * S, 5), toon(0xb0b4bc));
  ant.position.set(0.4 * S, 0.42 * S, -0.05 * S); ant.rotation.z = -0.5; g.add(ant);
  const sticker = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.11), bmat(0xffffff, { map: stickerTex(), transparent: true, side: THREE.FrontSide }));
  sticker.position.set(-0.16 * S, 0.05 * S, 0.115 * S); g.add(sticker);                             // festival sticker
  return { box: g, cones };
}

// ---- the tent (needs the cell root) ----
function buildTent(root) {
  const CX = 214, CZ = 926, parts = [];
  // four corner poles (dark steel) — colliders r0.25, inboard on the pre-probed lawn
  for (const [px, pz] of [[212.0, 924.0], [215.8, 924.0], [212.0, 928.0], [215.8, 928.0]]) {
    parts.push(paint(new THREE.BoxGeometry(0.12, 2.4, 0.12).translate(px, 1.2, pz), 0x4a4d55));
    collide(px, pz, 0.25);
  }
  // striped canopy — 4-sided pyramid, cream base + red rings (paintBands, world y)
  const canopy = new THREE.ConeGeometry(3.1, 1.1, 4, 1);
  canopy.rotateY(Math.PI / 4); canopy.translate(CX, 2.95, CZ);            // base y2.4, apex y3.5
  parts.push(paintBands(canopy, 0xf2ece0, [[2.40, 2.62, 0xc9402f], [2.86, 3.06, 0xc9402f], [3.30, 3.50, 0xc9402f]]));
  // counter — dark-wood body + lighter top; three colliders across its length (r0.5)
  parts.push(paint(new THREE.BoxGeometry(0.7, 0.95, 3.2).translate(214.9, 0.475, CZ), 0x5a3f28));
  parts.push(paint(new THREE.BoxGeometry(0.95, 0.12, 3.5).translate(214.9, 1.0, CZ), 0xc7a061));
  for (const cz2 of [924.7, 926, 927.3]) collide(214.9, cz2, 0.5);
  // two hanging tee quads (face +x toward the approach), dressing inside the tent —
  // hung LOW (top y ~1.8) so they peek above the counter but clear the sign band
  for (const [tz, thex] of [[923.8, 0x3fa7d6], [928.2, 0xe86aa8]]) {
    const tee = new THREE.PlaneGeometry(0.75, 0.95); tee.rotateY(Math.PI / 2); tee.translate(212.7, 1.32, tz);
    parts.push(paint(tee, thex));
  }
  // MERCH sign — a hanging banner CLEAR of the canopy front (x216.19) so it reads
  // from any approach; solid dark backing box merges in, the canvas face stays its
  // own mesh (never atlased with letters — 050). backing WEST of the +x face.
  parts.push(paint(new THREE.BoxGeometry(2.5, 0.66, 0.08).translate(216.5, 2.12, CZ), 0x2a2230));
  // ---- ONE merged vertexColors mesh (1 draw) ----
  const merged = new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(parts, false), vc());
  merged.name = 'lolla-merch-tent'; root.add(merged);
  // ---- the FrontSide 'MERCH' sign face toward the +x approach (1 draw) ----
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.58), bmat(0xffffff, { map: signTex('MERCH'), side: THREE.FrontSide }));
  face.rotation.y = Math.PI / 2; face.position.set(216.57, 2.12, CZ); root.add(face);

  // keeper behind the counter, facing the customer (+x); makeNPC = scene-add,
  // framework-culled past 145 m (invisible on the lakefront). festival-staff look.
  makeNPC({ x: 213.0, z: CZ, ry: Math.PI / 2, wander: 0, name: '',
    palette: { suit: 0x1c1c22, pants: 0x2b2f36, skin: 0xcaa06e, hair: 0x241610, hairStyle: 'bun' },
    lines: ["festival pricing. I don't make the rules.", 'the flower crowns are real. the pit isn’t.', "it's got Lolla FM. obviously."] });

  // the shop (framework card) — flower-crown is defined by packs/hats.js
  addInteraction({ x: 215.6, z: CZ, r: 2.4, label: 'browse the merch', onUse: () => {
    shop.open({ title: 'LOLLA MERCH', keeper: "festival pricing. I don't make the rules.",
      items: [{ id: 'boombox', price: 35 }, { id: 'flower-crown', price: 20 }] });
  } });
}

// =====================================================================
onWorldReady(() => {
  // ---- the item + the touch-parity ✋ interaction (cell-independent) ----
  const { box, cones } = buildTogo();
  let boxHeld = false;
  // a player-FOLLOWING station-cycler for touch (hard constraint 7): priority −1
  // so every real prompt outranks it; anchor tracks the mayor while the box is held.
  const followInter = addInteraction({ x: 0, z: 0, r: 1.5, priority: -1,
    label: 'change the station', onUse: () => radioApi.cycle() });
  followInter.enabled = false;

  bag.define({ id: 'boombox', name: 'boombox-to-go', icon: '📻', kind: 'holdable',
    caption: 'six stations, zero cords. R changes the station.',
    onUse() {
      radioApi.takeover(cones);                                    // engine → our box; R now cycles via radio.carrying
      holdItem(box);
      box.scale.setScalar(0.62); box.position.set(0, 0.06, 0.05); box.rotation.set(0, 0, 0);   // progression's carry pose
      boxHeld = true; followInter.enabled = true;
      toast('BOOMBOX TO-GO', 'R = change the station');
    },
    onStow() {
      if (radioApi.togoActive()) radioApi.release();               // hand the engine back to LOFI
      boxHeld = false; followInter.enabled = false;
    },
  });

  // per-frame: keep the ✋ on the mayor; catch every hand-steal (another holdable,
  // the towel-box borrow, a pack clearing the hand) — release the engine + stow.
  registerUpdate((dt, t, pl) => {
    if (!boxHeld) return;
    if (box.parent !== mparts.handR) {
      if (radioApi.togoActive()) radioApi.release();               // towel-box borrow already cleared it → no-op there
      boxHeld = false; followInter.enabled = false; return;
    }
    followInter.x = pl.x; followInter.z = pl.z;
  });

  // ---- the tent (needs the millennium cell root; assert + defer per PITFALLS 051) ----
  const cell = getCell('millennium');
  if (cell && cell.root) buildTent(cell.root);
  else {
    console.warn('[lolla-merch] millennium cell not ready at onWorldReady — deferring to first update frame');
    let done = false;
    registerUpdate(() => {
      if (done) return;
      const c = getCell('millennium');
      if (c && c.root) { buildTent(c.root); done = true; }
    });
  }
});
