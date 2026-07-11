// =====================================================================
// BP PEDESTRIAN BRIDGE — task 046.  Gehry's snaking stainless ribbon that
// hops Columbus Drive out of the Great Lawn toward Maggie Daley Park: a
// brushed-metal SHINGLE parapet enclosing a raised wood deck, ending at a
// quiet CLOSED gate-and-hedge overlook (no "future entrance" — task-030
// owner rule; the deck lands, turns you back, and frames the treetops).
//
// COPYRIGHT REGISTER (BRIEF/LOCATIONS owner rule): the Gehry bridge is a
// copyrighted work — chunky toon HOMAGE only.  The parapet captures the
// SERPENTINE brushed-shingle SKIN silhouette, never a plate-for-plate
// replica; no traced/imported geometry, no photo textures.
//
// DRAW-CALL DISCIPLINE (PITFALLS "toon SILVER reads GREEN"): the stainless
// parapet is SELF-LIT (bmat + a painted brushed-steel map, the Bean's
// sanctioned escape from the toon ramp) — toon steel here catches the
// hemisphere's GREEN ground-bounce on its many down/near-horizontal shingle
// faces and reads as a hedge.  ALL parapet geometry (both flanks, every
// band, every cap, whole run) is baked to world space and SELF-MERGED into
// ONE mesh with ONE shared bmat material = exactly ONE new draw call.  The
// wood plank seams (toon 0x8f6836), gate/bars/rail (toon 0x2b2f36) and
// hedge/treetops (toon 0x496b33) reuse colors pritzker.js already seeded in
// the static pool, so mergeCellStatic folds them to +0 draws.
//
// DETERMINISM: LOCAL mulberry32 only (never the shared world rng — moving a
// single lakefront towel is a hard-constraint regression).  Only the Maggie
// Daley treetop scatter consumes the local rng; the deck layout is fixed.
//
// Geometry law: GEOGRAPHY.md MILLENNIUM_GEOGRAPHY + data BP_BRIDGE_M — the
// raised WOOD deck ground already exists (index.js buildGround: approach
// ramp x168-186 y0->3.8, rising + crest segs to (205,810) y5, descending
// scenery run beyond the clamp).  This builder ADDS the hero geometry ON
// TOP: parapets (parapetH 1.4 above deck, railed at +/-2.6 so a down-deck
// camera frames BETWEEN them), plank detail, the east gate + treetops.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { millenniumRoot, emitInstanced } from './index.js';
import { toon, bmat, mulberry32 } from '../core.js';
import { collide } from '../props.js';
import * as M from '../data/millennium.js';

const _r = mulberry32(0x42504252);              // 'BPBR' — local, never the world rng
const rr = (a, b) => a + (b - a) * _r();

// The continuous deck CENTERLINE (constant halfW 2.6). The ramp reads 8 wide
// on the ground but is railed at +/-2.6 for a clean landing-apron -> bridge
// narrowing. nodes: (x, deckY, z).
const NODES = [
  { x: 168,   y: 0.0, z: 796 },   // 0 lawn-edge foot of the ramp
  { x: 186,   y: 3.8, z: 796 },   // 1 top of the ramp
  { x: 196,   y: 5.0, z: 804 },   // 2 rise into the crest (turn)
  { x: 205,   y: 5.0, z: 810 },   // 3 crest over Columbus (turn)
  { x: 207.5, y: 4.9, z: 811 },   // 4 the closed east landing
];

// ------------------------- brushed-steel map ---------------------------
// One warm-silver brushed map shared by the whole parapet. Fine brushed
// streaks run ALONG the plate length (the UV u-axis on each band's outboard
// face), with a few stronger HORIZONTAL seam lines so the courses read as
// overlapping shingle PLATES rather than a smooth wall.
function brushTex() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 32;
  const g = cv.getContext('2d');
  g.fillStyle = '#cdc8bf'; g.fillRect(0, 0, 128, 32);            // warm-silver stainless base (catches the dusk)
  for (let y = 0; y < 32; y += 2) {                              // fine brushed streaks along the plate
    g.fillStyle = (y / 2) % 2 ? 'rgba(255,255,255,0.10)' : 'rgba(120,124,132,0.10)';
    g.fillRect(0, y, 128, 1);
  }
  g.strokeStyle = 'rgba(110,114,122,0.34)'; g.lineWidth = 1;     // shingle-course seams (horizontal)
  for (const y of [7, 16, 25]) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(128, y + 0.5); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,0.40)'; g.lineWidth = 1;     // bright catch-light just above each seam
  for (const y of [6, 15, 24]) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(128, y + 0.5); g.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}

// right-handed frame for a deck piece a->b: ex along the (pitched) piece,
// ey the deck-normal "up" (tilts on the ramp so bands pitch with the deck),
// ez the horizontal lateral (perp) axis. mid = piece midpoint.
function pieceFrame(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const xzLen = Math.hypot(dx, dz), len3 = Math.hypot(dx, dy, dz);
  const ex = new THREE.Vector3(dx, dy, dz).multiplyScalar(1 / len3);
  const up = new THREE.Vector3(0, 1, 0);
  const ey = up.clone().addScaledVector(ex, -up.dot(ex)).normalize();  // up projected perp to ex
  const ez = new THREE.Vector3().crossVectors(ex, ey);                 // horizontal lateral, right-handed
  const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return { dx, dy, dz, xzLen, len3, ex, ey, ez, mid };
}

export function buildBridge() {
  const B = M.BP_BRIDGE_M, root = millenniumRoot;
  const halfW = 2.6;                              // rail lateral (deckW/2, clean narrowing)
  const parapetH = B.parapetH;                    // 1.4 — chest-high, frames between the flanks
  const woodMat = toon(0x8f6836);                 // plank seams (pritzker firDk — folds +0)
  const steelDkMat = toon(0x2b2f36);              // gate bars/posts/rail (pritzker dark — folds +0)
  const hedgeMat = toon(0x496b33);                // hedges + treetops (pritzker hedge — folds +0)

  // ==================== 1. THE SHINGLE PARAPET ========================
  // Brushed-metal walls enclosing BOTH flanks of the whole run. Merged BAND
  // geometry (horizontal overlapping plate courses), not per-shingle: 4
  // stacked bands per side per piece from the deck up to deckY+1.4, each
  // higher band ~0.03 proud (outboard) so they read as lapped plates, plus a
  // rounded coping cap. Every band is baked to world space and self-merged
  // into ONE mesh (ONE new draw) with ONE self-lit bmat brushed-steel map.
  const nBands = 4, stepH = parapetH / nBands, bandH = 0.46, bandDepth = 0.14, proud = 0.03;
  const capH = 0.15, capDepth = 0.22, flareCurved = 0.1;
  const parapetGeos = [];
  for (let p = 0; p < NODES.length - 1; p++) {
    const f = pieceFrame(NODES[p], NODES[p + 1]);
    const curved = (p === 1 || p === 2);          // the two turning pieces get a slightly flared coping
    const bandLen = f.len3 + 0.3;                 // overlap at the nodes so corners close cleanly
    const rot = new THREE.Matrix4().makeBasis(f.ex, f.ey, f.ez);
    for (const s of [-1, 1]) {
      for (let k = 0; k < nBands; k++) {
        const g = new THREE.BoxGeometry(bandLen, bandH, bandDepth);   // X=length, Y=height, Z=thickness(lateral)
        const off = f.mid.clone()
          .addScaledVector(f.ey, stepH * k + stepH / 2)               // band height above the deck
          .addScaledVector(f.ez, s * (halfW + proud * k));            // lateral seat + shingle proud step
        parapetGeos.push(g.applyMatrix4(rot.clone().setPosition(off)));
      }
      const cg = new THREE.BoxGeometry(bandLen, capH, capDepth + (curved ? flareCurved : 0));  // rounded coping cap
      const coff = f.mid.clone()
        .addScaledVector(f.ey, parapetH + 0.02)
        .addScaledVector(f.ez, s * (halfW + proud * nBands));
      parapetGeos.push(cg.applyMatrix4(rot.clone().setPosition(coff)));
    }
  }
  const parapetMat = bmat(0xc6c2b9, { map: brushTex(), side: THREE.DoubleSide });
  root.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(parapetGeos, false), parapetMat));

  // ==================== 2. WOOD PLANK RIBBON ==========================
  // Thin dark cross-seams across the deck that FOLLOW THE SERPENTINE: a
  // Catmull-Rom spline through the ramp/rise/crest nodes (NODE 0..3 only, so
  // the treads stop AT the walkable crest ~x205,z810 and never spill onto the
  // closed east landing). Treads are placed at ~1.3 m arc-length intervals and
  // each is oriented by the LOCAL curve tangent at its station — the seams
  // sweep smoothly around the curve instead of jacknifing at the node joints.
  // 0.04 proud of the deck. Subtle; folds to +0 (shared wood color, merged).
  const plankGeo = new THREE.BoxGeometry(0.1, 0.06, 2 * halfW - 0.1);   // X thin (travel), Z span (across deck)
  const deckCurve = new THREE.CatmullRomCurve3(
    NODES.slice(0, 4).map(n => new THREE.Vector3(n.x, n.y, n.z)), false, 'catmullrom', 0.5);
  const deckLen = deckCurve.getLength();
  const nP = Math.max(2, Math.round(deckLen / 1.3));
  const worldUp = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < nP; i++) {
    const t = (i + 0.5) / nP;
    const p = deckCurve.getPointAt(t);                                  // arc-length station on the curve
    const fwd = deckCurve.getTangentAt(t).normalize();                 // local travel dir (span is perp to this)
    const up = worldUp.clone().addScaledVector(fwd, -worldUp.dot(fwd)).normalize();  // deck-normal (pitches on ramp)
    const lat = new THREE.Vector3().crossVectors(fwd, up);             // across the deck = plank long (Z) axis
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(fwd, up, lat));
    const plank = new THREE.Mesh(plankGeo, woodMat);                    // box X->fwd (thin), Y->up, Z->lat (span)
    plank.position.copy(p.addScaledVector(up, 0.04)); plank.quaternion.copy(q); root.add(plank);
  }

  // ============= 3. EAST GATE + HEDGE OVERLOOK + TREETOPS ==============
  // The deck lands at the crest end and turns you back: a QUIET CLOSED gate
  // (NO "future entrance" signage — owner rule), flanked by hedge stubs, with
  // Maggie Daley treetops peeking past it. Gate/bars/rail fold to +0 (dark
  // steel), hedges + treetops fold to +0 (hedge green).
  const f3 = pieceFrame(NODES[3], NODES[4]);
  const gAlong = new THREE.Vector3(f3.dx, 0, f3.dz).normalize();       // horizontal travel dir at the landing
  const gAcross = new THREE.Vector3(f3.dz, 0, -f3.dx).normalize();     // across the deck (perp)
  const gUp = new THREE.Vector3(0, 1, 0);
  const gateRot = new THREE.Matrix4().makeBasis(gAcross, gUp, gAlong); // X=across, Y=up, Z=along
  const gateQ = new THREE.Quaternion().setFromRotationMatrix(gateRot);
  const gateCtr = new THREE.Vector3(206.5, 4.94, 810.6);              // x~206.5, deckY~4.94 (past the walkable crest ~205)
  const gateBox = (uAcross, yUp, w, h, d, mat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);  // X=across(w), Y=up(h), Z=along(d)
    mesh.position.copy(gateCtr.clone()
      .addScaledVector(gAcross, uAcross).addScaledVector(gUp, yUp));
    mesh.quaternion.copy(gateQ); root.add(mesh);
  };
  gateBox(-2.6, 1.0, 0.2, 2.0, 0.22, steelDkMat);                    // west post
  gateBox( 2.6, 1.0, 0.2, 2.0, 0.22, steelDkMat);                    // east post
  for (const u of [-1.55, -0.52, 0.52, 1.55]) gateBox(u, 0.925, 0.09, 1.85, 0.09, steelDkMat);  // vertical bars
  gateBox(0, 1.9, 5.2, 0.14, 0.16, steelDkMat);                      // top rail (spans the deck width)
  collide(gateCtr.x, gateCtr.z, 1.7);                                // closed — no passage past the landing
  gateBox(-3.5, 0.6, 1.6, 1.2, 1.7, hedgeMat);                       // west flanking hedge stub
  gateBox( 3.5, 0.6, 1.6, 1.2, 1.7, hedgeMat);                       // east flanking hedge stub

  // Maggie Daley treetops beyond the closed gate — a chunky blocky chibi
  // GROVE clustered just past the gate, its crowns riding ABOVE the gate's top
  // rail (~y6.9) so they clearly peek over the closed overlook (deck y5).
  // Two-tone (hedge + a lighter canopy green already static-pooled) for depth;
  // BoxGeometry -> folds to +0.
  const canopyLt = toon(0x5f8a48);   // pritzker lawn stripe / index lawn — static pool
  for (let i = 0; i < 13; i++) {
    const x = rr(208, 217), z = rr(812, 825), s = rr(2.2, 3.9), cy = rr(4.8, 6.6);
    const mat = i % 3 ? hedgeMat : canopyLt;
    const top = new THREE.Mesh(new THREE.BoxGeometry(s, s * rr(0.7, 1.0), s * rr(0.8, 1.1)), mat);
    top.position.set(x, cy, z); top.rotation.y = rr(0, 6.28); root.add(top);
  }
}
