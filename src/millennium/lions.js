// =====================================================================
// THE LIONS — the two bronze guardians of the Art Institute (task 060).
// Kemeys' pair, 1894: verdigris green-bronze, each on a plain granite
// plinth flanking the grand staircase, both gazing WEST over Michigan
// Avenue. They are subtly DIFFERENT beasts (the real pair is): the NORTH
// lion stands "on the prowl" — head level, neck stretched forward, one
// forepaw advanced mid-stalk, tail low; the SOUTH lion stands "in an
// attitude of defiance" — chest lifted, head high with the mouth open in
// a roar, tail carried high. Caray-statue-level care (the most-checked
// detail of the whole block — refs/millennium-park/Art_Institute_*Lion*).
//
// Register: chunky house-toon homage, hand-posed primitives, no traced
// geometry. All parts are static toon meshes — the whole pair folds into
// TWO merged colour buckets (verdigris + granite; the verdigris hex is
// shared with the Fountain of the Great Lakes figures in artinstitute.js).
// No rng at all: the pose is fixed. Colliders seal the plinths (data law:
// ART_M.lions r 1.9).
// =====================================================================
import * as THREE from 'three';
import { millenniumRoot } from './index.js';
import { toon } from '../core.js';
import { collide } from '../props.js';
import * as M from '../data/millennium.js';

const VERD  = 0x4da28c;   // weathered verdigris bronze (shared bucket w/ the Taft fountain)
const DVERD = 0x35755f;   // shadowed verdigris — inner mane, brows, undercuts
const MAW   = 0x1e3f38;   // open-mouth interior
const GRAN  = 0x7d7b74;   // granite plinth (cool gray, ref truth)

// one lion, built in a LOCAL frame facing +z (head at +z, tail at −z),
// children in local coords so the group yaw pivots the beast, not the
// world (PITFALLS: far-from-origin rotation heave). stance:
//   'prowl'    — head level + forward, mid-stalk forepaw, tail low
//   'defiance' — chest up, head high, roaring mouth, tail high
function buildLion(stance, gx, gz) {
  const g = new THREE.Group();
  const add = (geo, color, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, toon(color));
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz);
    g.add(m); return m;
  };
  const S = (r, w, h) => new THREE.SphereGeometry(r, w || 10, h || 8);
  const B = (x, y, z) => new THREE.BoxGeometry(x, y, z);
  const C = (r, h, s) => new THREE.ConeGeometry(r, h, s || 8);
  const CY = (rt, rb, h) => new THREE.CylinderGeometry(rt, rb, h, 8);

  const def = stance === 'defiance';

  // ---- granite plinth (long axis = the beast's axis) + bronze base ----
  add(B(1.9, 0.28, 3.3), GRAN, 0, 0.14, 0);                       // footing course
  add(B(1.7, 1.15, 3.05), GRAN, 0, 0.28 + 0.575, 0);              // plinth block
  add(B(1.78, 0.12, 3.15), GRAN, 0, 1.49, 0);                     // cap lip
  const TOP = 1.55;                                               // plinth top
  add(B(1.35, 0.14, 2.75), VERD, 0, TOP + 0.07, 0);               // bronze base plate
  add(S(1, 12, 8), VERD, 0, TOP + 0.1, -0.1, 0, 0, 0, 1.25, 0.14, 0.55); // cast ground mound

  // ---- posture frame ------------------------------------------------
  const BY = TOP + 0.16;                                          // bronze-ground level
  const pitch = def ? -0.085 : 0.035;                             // body pitch: defiance rears the chest UP (−x rot lifts +z end)
  const body = new THREE.Group(); body.position.y = BY; body.rotation.x = pitch;
  g.add(body);
  const badd = (geo, color, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, toon(color));
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz);
    body.add(m); return m;
  };

  // ---- torso ---------------------------------------------------------
  badd(S(0.5), VERD, 0, 1.30, 0.42, 0.1, 0, 0, 1.16, 1.14, 1.18);  // shoulder mass
  badd(S(0.48), VERD, 0, 1.18, -0.62, -0.12, 0, 0, 1.06, 1.02, 1.2); // hindquarters
  badd(S(0.46), VERD, 0, 1.16, -0.1, 0, 0, 0, 1.0, 0.92, 1.5);     // barrel bridging both
  badd(S(0.4), VERD, 0, 1.0, -0.12, 0, 0, 0, 0.95, 0.85, 1.3);     // belly (closes the underline)
  badd(S(0.4), VERD, 0, 1.05, 0.56, 0.3, 0, 0, 0.88, 0.82, 0.72);  // chest keel (soft — no diamond brisket)
  for (const s of [-1, 1])
    badd(S(0.33), VERD, s * 0.27, 0.82, -0.62, 0, 0, 0, 0.9, 1.0, 1.15); // haunches

  // ---- legs + paws (prowl: left fore advanced mid-stalk) -------------
  const paw = (x, z, adv = 0) => {
    badd(CY(0.14, 0.165, 0.95), VERD, x, 0.48, z + adv * 0.5, adv * -0.35);
    badd(B(0.3, 0.17, 0.46), VERD, x, 0.085, z + adv * 0.24 + 0.06);
    for (const t of [-1, 0, 1])                                    // toe knuckles
      badd(S(0.062, 8, 6), VERD, x + t * 0.095, 0.075, z + adv * 0.24 + 0.28);
  };
  paw(-0.3, 0.78, stance === 'prowl' ? 0.55 : 0);                  // fore L (the stalk step)
  paw(0.3, 0.78, 0);                                               // fore R
  paw(-0.31, -0.78, 0); paw(0.31, -0.78, 0);                       // hind pair
  for (const s of [-1, 1])                                         // fore shoulders over the legs
    badd(S(0.24), VERD, s * 0.29, 0.95, 0.75, 0, 0, 0, 0.9, 1.1, 0.9);

  // ---- head group (pose per stance) -----------------------------------
  const head = new THREE.Group();
  head.position.set(0, def ? 1.94 : 1.7, def ? 0.78 : 0.9);       // short leonine neck — the head sits IN the ruff
  head.rotation.x = def ? -0.22 : 0.1;                             // defiance looks UP, prowl levels down the avenue
  head.rotation.y = def ? 0.1 : 0;                                 // the defiant head turns a touch south
  body.add(head);
  const hadd = (geo, color, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, toon(color));
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz);
    head.add(m); return m;
  };
  hadd(S(0.32), VERD, 0, 0.02, 0.1, 0, 0, 0, 0.98, 0.98, 1.0);     // skull
  hadd(B(0.36, 0.22, 0.36), VERD, 0, -0.05, 0.38);                 // muzzle
  hadd(B(0.2, 0.1, 0.12), DVERD, 0, 0.075, 0.52);                  // nose bridge/leather
  hadd(B(0.32, 0.11, 0.3), VERD, 0, -0.18, 0.35, def ? 0.62 : 0.3);// dropped jaw (defiance ROARS)
  hadd(B(0.24, def ? 0.18 : 0.09, 0.22), MAW, 0, -0.13, 0.39, def ? 0.3 : 0.15); // maw shadow
  for (const s of [-1, 1]) {
    hadd(B(0.13, 0.06, 0.15), DVERD, s * 0.12, 0.16, 0.33, 0.25);  // brow ridges
    hadd(S(0.04, 8, 6), MAW, s * 0.115, 0.1, 0.38);                // eyes
    hadd(S(0.085, 8, 6), DVERD, s * 0.24, 0.3, 0.02, 0, 0, 0, 1, 1.2, 0.7); // ears (dark vs the ruff)
    hadd(S(0.1, 8, 6), VERD, s * 0.17, -0.14, 0.44, 0, 0, 0, 1, 0.8, 0.9);  // muzzle flews
  }
  // MANE — the lion-maker. A chunky two-layer BALL ruff swallowing the neck,
  // a petal COLLAR framing the face, and a proud spike crest (the refs'
  // flame). The mane is DARK verdigris against the smooth light body — at
  // dusk same-colour masses flatten; the tone break is what reads "lion".
  hadd(S(0.58), VERD, 0, 0.0, -0.1, 0.15, 0, 0, 1.05, 1.02, 0.85);     // inner ruff ball (light core)
  hadd(S(0.62), DVERD, 0, -0.1, -0.22, 0.2, 0, 0, 1.12, 1.12, 0.85);   // outer ruff ball (DARK, the silhouette)
  for (let i = 0; i < 8; i++) {                                        // face-framing petal collar
    const a = (i / 7 - 0.5) * 3.6;                                     // −1.8..1.8 around the face
    const px = Math.sin(a) * 0.42, py = 0.06 + Math.cos(a) * 0.38;
    hadd(S(0.17, 8, 6), i % 2 ? VERD : DVERD, px, py, 0.14,
         0.3, 0, a * 0.5, 1, 1.3, 0.75);                               // flattened petal lobes
  }
  hadd(C(0.38, 0.78, 10), DVERD, 0, -0.58, 0.12, 3.05, 0, 0, 1.1, 1, 0.8); // chest beard wedge (rounded, fills under the jaw)
  for (let i = 0; i < 9; i++) {                                        // crest spikes — proud of the ruff
    const a = (i / 8 - 0.5) * 2.6;                                     // −1.3..1.3 across the crown
    hadd(C(0.15, 0.5, 6), i % 2 ? VERD : DVERD,
         Math.sin(a) * 0.46, 0.34 + Math.cos(a) * 0.26, -0.14 - Math.abs(a) * 0.06,
         -0.65 - Math.abs(a) * 0.15, 0, a * 0.95);
  }
  // mane cascade down the nape onto the shoulders (dark over light)
  badd(S(0.46), DVERD, 0, 1.42, 0.5, 0.5, 0, 0, 1.05, 0.95, 0.9);
  badd(S(0.36), DVERD, 0, 1.24, 0.68, 0.7, 0, 0, 1.0, 0.8, 0.7);

  // ---- tail: low sweep (prowl) vs carried high (defiance) ------------
  {
    let px = 0.12, py = def ? 1.42 : 1.18, pz = -1.02;             // root at the rump
    let dir = def ? [0.1, 0.32, -0.5] : [0.22, -0.42, -0.42];      // initial segment direction
    const segs = def
      ? [[0.12, 0.5, -0.4], [0.3, 0.4, 0.25], [0.2, -0.1, 0.5]]    // high S-curl, tip flicked forward
      : [[0.3, -0.3, -0.3], [0.35, 0.15, 0.2], [-0.1, 0.35, 0.3]]; // low sweep, tip curled up
    let d = dir;
    for (let i = 0; i < 3; i++) {
      const len = 0.46 - i * 0.06;
      const L = Math.hypot(d[0], d[1], d[2]);
      const ux = d[0] / L, uy = d[1] / L, uz = d[2] / L;
      const cx2 = px + ux * len / 2, cy2 = py + uy * len / 2, cz2 = pz + uz * len / 2;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.055 - i * 0.008, 0.062 - i * 0.008, len, 7), toon(VERD));
      m.position.set(cx2, cy2, cz2);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(ux, uy, uz));
      body.add(m);
      px += ux * len; py += uy * len; pz += uz * len;
      d = segs[i];
    }
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), toon(DVERD));
    tuft.position.set(px, py, pz); tuft.scale.set(1, 1.35, 1); body.add(tuft);
  }

  // place: local +z (the gaze) → world −x = WEST over Michigan Ave
  g.position.set(gx, 0, gz);
  g.rotation.y = -Math.PI / 2;
  millenniumRoot.add(g);
}

export function buildLions() {
  const [north, south] = M.ART_M.lions;                            // data law: (54.4, 962.4) / (54.4, 979.4)
  buildLion('prowl', north.x, north.z);                            // north — "on the prowl"
  buildLion('defiance', south.x, south.z);                         // south — "in an attitude of defiance"
  for (const l of M.ART_M.lions) collide(l.x, l.z, 1.9);           // r 1.9 plinth seals (ART_M comment law)
}
