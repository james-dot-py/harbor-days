// =====================================================================
// JAY PRITZKER PAVILION + GREAT LAWN + TRELLIS — task 044.
// The second-biggest silhouette in Millennium Park: the exploding steel
// RIBBON headdress over a glass proscenium, the red seating bowl, and the
// criss-cross pipe TRELLIS that turns the Great Lawn into a room.
//
// COPYRIGHT REGISTER (BRIEF/LOCATIONS, owner rule): the Gehry pavilion is a
// copyrighted work — this is a chunky toon HOMAGE that captures the BURST
// SILHOUETTE, never a panel-for-panel replica. No traced/imported geometry,
// no photo textures; hand-modeled curved shells in the house style.
//
// DRAW-CALL DISCIPLINE (PITFALLS): toon(hex) is CACHE-KEYED by color, so all
// static meshes sharing a color fold into ONE merged bucket in
// mergeCellStatic (index.js, bandW 1e6 = one bucket per material). Petals use
// a shared DoubleSide material (uncached) and are self-merged into 2 tone
// meshes. Repeated small geometry (seats, posts, pods, stands) is instanced.
// Report census() before/after — the ribbons are the draw-call risk.
//
// DETERMINISM: LOCAL mulberry32 only (never the shared world rng — moving a
// single lakefront towel is a hard-constraint regression). Everything is
// attached to millenniumRoot and merged at build.
//
// Geometry law: GEOGRAPHY.md MILLENNIUM_GEOGRAPHY + data PRITZKER_M —
// stage 123–170 × 747–758 (mouth S), bowl 118–186 × 758–788 (red seats,
// walkable), lawn 118–186 × 788–846, trellis 120–166 × 792–844 (stops W of
// the BP approach at x168). Stage is a solid visual mass — NOT enterable
// (walkableM ends at the bowl's z758 edge; no dead stairs — Diversey rule).
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { millenniumRoot, emitInstanced } from './index.js';
import { toon, bmat, mulberry32 } from '../core.js';
import { collide } from '../props.js';
import * as M from '../data/millennium.js';

// ---- shared palette (all folded per-color at merge) -------------------
const COL = {
  silver:  0xa6abb0,   // COOL shade-steel petal tone (task 056 item 2: darker + cooler so
                       // the burst silhouette separates from the pale dusk sky, not washes into it)
  warm:    0xe9d6a9,   // dusk-lit WARM (amber-catching) petal tone — pushed warmer for a bold two-tone read
  steelDk: 0x8a8f93,   // ribbon shade / stage-house shell in shadow
  arc:     0x9ba1aa,   // trellis pipe steel
  post:    0x8f8c86,   // trellis / speaker-tower concrete-steel columns
  fir:     0xb98a4e,   // warm Douglas-fir stage interior
  firDk:   0x8f6836,   // interior shade panels
  curtain: 0x7c2028,   // dark-red stage curtain
  dark:    0x2b2f36,   // steel frames, music stands, timpani, speaker gear
  seat:    0xb63139,   // fixed folding-seat red
  pod:     0x191b1f,   // hanging speaker pods
  stripeA: 0x5f8a48,   // mowed lawn stripe (matches the 041 lawn carpet)
  stripeB: 0x6d9a52,   // lighter mowed stripe
  hedge:   0x496b33,   // lawn-edge boxwood hedge (the pad 046's Lurie hedge rises from)
  planter: 0x8d8578,   // limestone planter curb
};

// brushed-steel band texture (subtle horizontal shingle lines — sells the
// "brushed-steel petals" read without chasing panel accuracy). One shared
// texture tinted by each tone material's color.
function brushTex() {
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#c4c0b8'; g.fillRect(0, 0, 32, 128);          // MID warm steel base (was near-white → washed into the sky)
  for (let x = 0; x < 32; x += 2) {                             // faint vertical brushed streaks
    g.fillStyle = (x / 2) % 2 ? 'rgba(255,255,255,0.10)' : 'rgba(120,124,132,0.10)';
    g.fillRect(x, 0, 2, 128);
  }
  g.strokeStyle = 'rgba(110,114,122,0.30)'; g.lineWidth = 1;    // SUBTLE shingle seams (heavy seams read as leaf veins)
  for (let y = 5; y < 128; y += 11) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(32, y + 0.5); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,0.32)'; g.lineWidth = 1;
  for (let y = 6; y < 128; y += 11) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(32, y + 0.5); g.stroke(); }
  // RIM DARKENING (task 056 item 2): shade both lateral edges of every petal so
  // the curled shells read as separated ribbons against the pale dusk sky — a
  // cheap silhouette outline (uv u runs across the petal width, wrapping at the seam).
  const edge = g.createLinearGradient(0, 0, 32, 0);
  edge.addColorStop(0.00, 'rgba(58,62,70,0.55)');
  edge.addColorStop(0.14, 'rgba(58,62,70,0.00)');
  edge.addColorStop(0.86, 'rgba(58,62,70,0.00)');
  edge.addColorStop(1.00, 'rgba(58,62,70,0.55)');
  g.fillStyle = edge; g.fillRect(0, 0, 32, 128);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}

// ---------------------------- ribbon petal -----------------------------
// A chunky curled SHELL WITH THICKNESS (top skin + bottom skin + edges): grows
// +Y along its length, tapers to a tip, curls FORWARD (+Z) as it rises, and is
// cross-cupped into a concave trough so it reads as a rolled STEEL ribbon with
// real shaded undersides — not a flat papery sail. uv: u across, v along.
function petalSolid(L, w0, w1, thick, bend, cup) {
  const NL = 10, NW = 4, h = thick / 2;
  const pos = [], uv = [], idx = [];
  let vi = 0;
  const pushV = (x, y, z, uu, vv) => { pos.push(x, y, z); uv.push(uu, vv); return vi++; };
  const top = [], bot = [];
  for (let i = 0; i <= NL; i++) {
    const t = i / NL, sy = L * t, sz = bend * L * t * t, w = w0 + (w1 - w0) * t;
    const dy = L, dz = 2 * bend * L * t, tl = Math.hypot(dy, dz);       // spine tangent (Y-Z)
    const ny = -dz / tl, nz = dy / tl;                                  // face normal (Y-Z)
    const rT = [], rB = [];
    for (let j = 0; j <= NW; j++) {
      const u = j / NW - 0.5, cupOff = cup * w * (0.25 - u * u);        // concave trough
      const bx = u * w, by = sy + ny * cupOff, bz = sz + nz * cupOff;
      rT.push(pushV(bx, by + ny * h, bz + nz * h, j / NW, t * (L / 6)));
      rB.push(pushV(bx, by - ny * h, bz - nz * h, j / NW, t * (L / 6)));
    }
    top.push(rT); bot.push(rB);
  }
  const quad = (a, b, c, d) => idx.push(a, b, d, a, d, c);
  for (let i = 0; i < NL; i++) for (let j = 0; j < NW; j++) {
    quad(top[i][j], top[i][j + 1], top[i + 1][j], top[i + 1][j + 1]);  // top skin
    quad(bot[i][j + 1], bot[i][j], bot[i + 1][j + 1], bot[i + 1][j]);  // bottom skin
  }
  for (let i = 0; i < NL; i++) {                                        // side edges
    quad(top[i][0], bot[i][0], top[i + 1][0], bot[i + 1][0]);
    quad(bot[i][NW], top[i][NW], bot[i + 1][NW], top[i + 1][NW]);
  }
  for (let j = 0; j < NW; j++) {                                        // end caps
    quad(bot[0][j], top[0][j], bot[0][j + 1], top[0][j + 1]);
    quad(top[NL][j], bot[NL][j], top[NL][j + 1], bot[NL][j + 1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// place a petal into world space and return the baked geometry. The petal
// grows +Y; SPLAY (about Z) fans it out sideways (a vertical petal spun about
// Y just stays vertical — the burst spread MUST be a Z-roll), TILT (about X)
// leans it forward(+)/back(−) toward the audience, TWIST (about Y) angles the
// concave face. Euler order 'YXZ' applies splay → tilt → twist in that order.
function placedPetal(spec) {
  const g = petalSolid(spec.L, spec.w0, spec.w1, 0.55, spec.bend, spec.cup);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  q.setFromEuler(new THREE.Euler(spec.tilt, spec.twist, spec.splay, 'YXZ'));
  m.compose(new THREE.Vector3(spec.bx, spec.by, spec.bz), q, new THREE.Vector3(1, 1, 1));
  g.applyMatrix4(m);
  return g;
}

// hand-authored crown: a WIDE exploding chrysanthemum of petals around the
// proscenium top — the DD_04/05 burst silhouette, spread wider than tall so it
// reads within the bowl framing (tips ~y15). Inner petals stand and curl
// forward over the mouth; outer petals SPLAY out to the sides. tone alternates
// silver / warm so the dusk directional light two-tones the flower.
function crownSpecs(cx, cz) {
  const S = [];
  const P = (bx, by, bz, tilt, twist, splay, L, w0, w1, bend, cup, tone) =>
    S.push({ bx: cx + bx, by, bz: cz + bz, tilt, twist, splay, L, w0, w1, bend, cup, tone });
  // deterministic per-petal wobble (index-hashed, NO rng) so the burst reads
  // organic/overlapping, not a tidy peacock fan
  const jl = k => Math.sin(k * 2.7 + 0.6) * 0.7, jt = k => Math.cos(k * 1.9) * 0.07, js = k => Math.sin(k * 3.3) * 0.10;
  const NS = 4;                                    // side petals per side
  for (let k = 0; k < NS; k++) {
    const f = k / (NS - 1);                         // 0 inner → 1 outer
    const splay = 0.30 + f * 1.16 + js(k);          // sideways fan (Z-roll), grows outward
    const tilt = 0.44 - f * 0.14 + jt(k);           // forward lean (inner curls forward most)
    const L = 7.9 - f * 1.6 + jl(k), w0 = 6.2 - f * 1.2, w1 = 1.9 - f * 0.4;
    const bx = 1.8 + f * 8.5, by = 7.6 - f * 1.9, bz = 0.9 - f * 1.0, bend = 0.32 + f * 0.14;
    const tone = k % 2;
    P( bx, by, bz, tilt, -0.12, -splay, L, w0, w1, bend, 1.05, tone);        // right (+x)
    P(-bx, by, bz, tilt + jt(k + 5), 0.12, splay + js(k + 5), L + jl(k + 5) * 0.5, w0, w1, bend, 1.05, tone ? 0 : 1); // left (near-mirror, slightly offset)
  }
  // forward pair — big petals curling strongly over the mouth toward the crowd
  P(-2.0, 7.6, 1.8, 0.55, 0.05, -0.10, 8.2, 7.0, 2.4, 0.50, 1.2, 1);
  P( 2.0, 7.6, 1.8, 0.55, -0.05, 0.12, 7.8, 7.0, 2.4, 0.50, 1.2, 0);
  // back crest pair — the burst's tall centre, tipped slightly back
  P(-2.4, 8.0, -1.4, -0.10, 0.08, -0.22, 7.9, 5.0, 1.8, 0.12, 0.8, 0);
  P( 2.4, 8.2, -1.4, -0.14, -0.08, 0.26, 7.5, 5.0, 1.8, 0.12, 0.8, 1);
  return S;
}

export function buildPritzker() {
  const P = M.PRITZKER_M, root = millenniumRoot;
  const rr = mulberry32(0x9a1712 ^ M.SEED_M);   // LOCAL seed — lawn-life scatter only
  const rnd = (a, b) => a + (b - a) * rr();
  const cx = (P.stage.x0 + P.stage.x1) / 2;      // stage center x ≈ 146.5
  const mouthZ = P.stage.z1;                      // proscenium mouth at z758 (faces S)

  // ================= 1. STAGE HOUSE (open proscenium) ==================
  // Solid brushed-steel mass with the mouth open to the south so the wood
  // interior reads. Back wall + two wings + roof slab leave a cavity.
  const shellMat = toon(COL.steelDk);
  const box = (x0, x1, y0, y1, z0, z1, mat) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); root.add(b); return b;
  };
  const HH = 9.5;                                 // fly-tower height
  box(P.stage.x0, P.stage.x1, 0, HH, 747, 749, shellMat);           // back wall
  box(P.stage.x0, 133, 0, HH, 749, 757, shellMat);                  // left wing
  box(160, P.stage.x1, 0, HH, 749, 757, shellMat);                  // right wing
  box(P.stage.x0, P.stage.x1, HH - 0.6, HH, 749, 757, shellMat);    // roof slab over the cavity
  // canted steel buttress FINS flanking the mouth (the DD_04 splayed wedges) —
  // slim + bright steel so they read as structure, not a grey wall
  const finMat = toon(COL.silver);
  for (const s of [-1, 1]) {
    const wedge = new THREE.Mesh(new THREE.BoxGeometry(1.9, 9.5, 1.2), finMat);
    wedge.position.set(cx + s * 13.2, 4.6, 757.2); wedge.rotation.z = s * 0.62; root.add(wedge);
  }
  // glass curtain-wall hint at the mouth: sparse dark mullions + two transoms
  // (see-through — the fir interior + curtain stay visible behind)
  { const mul = toon(COL.dark);
    for (let x = 135.5; x <= 157.5; x += 3.7) box(x - 0.07, x + 0.07, 0.6, 8, 757.1, 757.3, mul);
    box(135, 158, 3.4, 3.6, 757.1, 757.3, mul); box(135, 158, 6.0, 6.2, 757.1, 757.3, mul);
  }

  // interior: warm-fir back + canted acoustic panels + dark-red curtain
  box(134, 159, 0, 8, 748.6, 749.2, toon(COL.fir));                 // fir back wall
  { const ceil = new THREE.Mesh(new THREE.BoxGeometry(24, 0.4, 8), toon(COL.firDk));
    ceil.position.set(cx, 7.4, 753); ceil.rotation.x = 0.34; root.add(ceil); }   // canted acoustic ceiling
  box(137, 156, 0, 6.6, 749.5, 749.9, toon(COL.curtain));          // dark-red curtain
  box(137, 156, 6.6, 7.1, 749.4, 750.0, toon(COL.fir));            // fir valance over the curtain
  // raised stage floor (fir lip proud of the bowl)
  box(133, 160, 0, 0.6, 750, 758, toon(COL.fir));
  // proscenium frame — dark steel surround of the opening
  { const fr = toon(COL.dark);
    box(132, 161, 8, 8.7, 757, 757.6, fr);                          // header
    for (const x of [132, 160.4]) box(x, x + 0.6, 0, 8.4, 757, 757.6, fr);  // jambs
  }

  // ---- interior silhouettes: a few music stands + timpani (soundcheck GAG is 047) ----
  const standGeo = BufferGeometryUtils.mergeBufferGeometries([
    (() => { const g = new THREE.CylinderGeometry(0.03, 0.03, 1.1, 5); g.translate(0, 0.55, 0); return g; })(),
    (() => { const g = new THREE.BoxGeometry(0.42, 0.28, 0.05); g.translate(0, 1.05, 0.04); g.rotateX(-0.5); return g; })(),
  ], false);
  const stands = [];
  for (let i = 0; i < 7; i++) stands.push({ pos: [cx - 9 + i * 3 + rnd(-0.4, 0.4), 0.6, 751 + (i % 2) * 1.4], yaw: Math.PI, color: COL.dark });
  emitInstanced(standGeo, stands);
  const timGeo = (() => { const g = new THREE.CylinderGeometry(0.7, 0.55, 0.8, 12); g.translate(0, 1.0, 0); return g; })();
  emitInstanced(timGeo, [{ pos: [cx + 6, 0.6, 749.8], color: 0x9a7b3e }, { pos: [cx + 8, 0.6, 750.4], color: 0x9a7b3e }]);

  // ==================== 2. RIBBON CROWN (the burst) ====================
  // SELF-LIT brushed steel (bmat, not toon): the ribbons are a stainless mirror
  // in the copyright-homage register — the SAME sanctioned escape from the toon
  // ramp the Bean uses. Toon here catches the hemisphere's GREEN ground-bounce
  // on the shells' many down/horizontal faces and reads as foliage; a painted
  // self-lit steel keeps the two-tone silver/warm dusk read clean at any angle.
  const brush = brushTex();
  const petalMat = [
    bmat(COL.silver, { map: brush, side: THREE.DoubleSide }),
    bmat(COL.warm,   { map: brush, side: THREE.DoubleSide }),
  ];
  const toneGeo = [[], []];
  for (const spec of crownSpecs(cx, 754)) toneGeo[spec.tone].push(placedPetal(spec));
  for (let tone = 0; tone < 2; tone++) {
    if (!toneGeo[tone].length) continue;
    const merged = BufferGeometryUtils.mergeBufferGeometries(toneGeo[tone], false);
    root.add(new THREE.Mesh(merged, petalMat[tone]));
  }

  // ================= 3. FLANKING SPEAKER TOWERS =======================
  // black line-array stacks on slim columns at the bowl's front corners
  for (const s of P.speakers) {
    box(s.x - 0.5, s.x + 0.5, 0, 6.2, s.z - 0.5, s.z + 0.5, toon(COL.post));   // column
    const arr = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.6, 1.2), toon(COL.dark));
    arr.position.set(s.x, 5.3, s.z); arr.rotation.x = 0.12; root.add(arr);      // canted array head
    collide(s.x, s.z, 0.9);
  }

  // ==================== 4. RED SEATING BOWL ============================
  // Fixed folding seats fill the bowl, facing the stage (−z). Decorative
  // (no colliders) so the bowl stays walkable per WALK_M. Center + side
  // aisles. One instanced red bucket.
  const seatGeo = BufferGeometryUtils.mergeBufferGeometries([
    (() => { const g = new THREE.BoxGeometry(0.52, 0.09, 0.5); g.translate(0, 0.46, 0); return g; })(),      // pan
    (() => { const g = new THREE.BoxGeometry(0.52, 0.62, 0.08); g.translate(0, 0.75, 0.22); g.rotateX(0.14); return g; })(), // back
  ], false);
  const seats = [];
  const aisle = x => (x > 149 && x < 153) || (x > 128 && x < 130.5) || (x > 173.5 && x < 176);
  for (let r = 0; r < 9; r++) {
    const z = 761 + r * 2.9;                       // rows from just S of the apron to the lawn edge
    for (let x = 120.5; x <= 184; x += 1.45) {
      if (aisle(x)) continue;
      seats.push({ pos: [x + rnd(-0.05, 0.05), 0, z], yaw: 0, color: COL.seat });   // back at +z, opens toward stage
    }
  }
  emitInstanced(seatGeo, seats);

  // ====================== 5. THE TRELLIS ===============================
  // Criss-cross pipe-arc lattice over the lawn on perimeter columns. Two
  // diagonal arc families spring from paired posts and cross into X's; the
  // perspective down the lawn converges them toward the silver stage
  // (mp-great-lawn hero). All arcs share ONE steel material → 1 merged draw.
  const T = P.trellis, colR = T.colR || 0.7, bays = T.bays || 6;
  const zPost = i => T.z0 + (T.z1 - T.z0) * i / (bays - 1);
  const apexY = T.apexH, springY = T.colH;
  // posts (both long edges) — static, folded, colliders
  const postGeo = (() => { const g = new THREE.CylinderGeometry(colR, colR * 1.15, springY, 10); g.translate(0, springY / 2, 0); return g; })();
  for (const px of [T.x0, T.x1]) for (let i = 0; i < bays; i++) {
    const m = new THREE.Mesh(postGeo, toon(COL.post)); m.position.set(px, 0, zPost(i)); root.add(m);
    collide(px, zPost(i), colR + 0.2);
  }
  // arcs — quadratic-Bezier tubes, merged into one mesh
  const arcGeos = [], crossings = [];
  const arc = (za, zb) => {
    const p0 = new THREE.Vector3(T.x0, springY, za), p2 = new THREE.Vector3(T.x1, springY, zb);
    const ctrl = new THREE.Vector3((T.x0 + T.x1) / 2, springY + 2 * (apexY - springY), (za + zb) / 2);
    const curve = new THREE.QuadraticBezierCurve3(p0, ctrl, p2);
    arcGeos.push(new THREE.TubeGeometry(curve, 18, 0.4, 6, false));
    return curve.getPoint(0.5);                    // apex ≈ crossing point
  };
  for (let i = 0; i < bays - 1; i++) {
    const a = arc(zPost(i), zPost(i + 1));         // family A (leans +z going E)
    const b = arc(zPost(i + 1), zPost(i));         // family B (leans −z going E) → X with A
    crossings.push(new THREE.Vector3((a.x + b.x) / 2, Math.min(a.y, b.y) - 0.2, (a.z + b.z) / 2));
  }
  // two end hoops to close the ends of the vault
  arc(zPost(0), zPost(0)); arc(zPost(bays - 1), zPost(bays - 1));
  root.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(arcGeos, false), toon(COL.arc)));

  // hanging paired speaker pods at the crossings (instanced) + thin cables
  const podGeo = new THREE.BoxGeometry(0.9, 0.7, 0.7);
  const pods = [], cables = [];
  const cableGeo = (() => { const g = new THREE.CylinderGeometry(0.03, 0.03, 1, 4); g.translate(0, -0.5, 0); return g; })();
  for (const c of crossings) {
    for (const dz of [-0.55, 0.55]) pods.push({ pos: [c.x, c.y - 1.4, c.z + dz], color: COL.pod });
    cables.push({ pos: [c.x, c.y, c.z], scale: [1, 1.4, 1], color: COL.dark });
  }
  emitInstanced(podGeo, pods);
  emitInstanced(cableGeo, cables);

  // ==================== 6. GREAT LAWN (stripes + shoulder) =============
  // mowed-stripe tint bands (thin overlay quads, alternating greens) + the
  // lawn-edge hedge/planter line (the room's shoulder — 046's Lurie hedge
  // rises from the south run). The lawn CROWD (blankets + real posed-chibi
  // people) is owned by the millennium-lawnlife pack (task 048 item 0d).
  const stripeGeo = new THREE.PlaneGeometry(T.x1 - T.x0 + 24, 3.4, 8, 1);
  for (let z = 790; z < 846; z += 6.8) {
    const s = new THREE.Mesh(stripeGeo, toon((z / 6.8 | 0) % 2 ? COL.stripeB : COL.stripeA));
    s.rotation.x = -Math.PI / 2; s.position.set(148, 0.015, z + 1.7); root.add(s);
  }
  // lawn-edge hedge (W + S runs) + limestone planter curb beneath it
  const hedgeMat = toon(COL.hedge), curbMat = toon(COL.planter);
  const hedgeRun = (x0, x1, z0, z1) => {
    box(x0, x1, 0, 0.25, z0, z1, curbMat);
    box(x0 + 0.1, x1 - 0.1, 0.25, 1.15, z0 + 0.1, z1 - 0.1, hedgeMat);
  };
  hedgeRun(116.5, 118, 790, 831);                 // west shoulder (BREAKS 2 m before the Nichols pad — 062/024a)
  hedgeRun(120.5, 168, 845, 846.5);               // south shoulder (W end clears the deck band x<=119.2 — 062/024a)
  hedgeRun(168, 169.5, 812, 846);                 // SE return (clear of the BP ramp mouth)
  // pale limestone approach apron: clear paved walk from the lawn onto the Nichols pad through the break (062/issue 024a)
  box(118, 121.3, 0, 0.03, 827, 833, curbMat);
  // NOTE: the lawn CROWD (picnic blankets + real posed-chibi people) lives in
  // packs/millennium-lawnlife.js (task 048 item 0d) — this section is stripes
  // + hedge only, so no local-rng scatter runs after the seats above.
}
