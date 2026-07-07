// =====================================================================
//  PACK: wrigley-npcs — Wrigleyville street-life NPC pack (cell two).
//  A gameday crowd for the closed streets around the Friendly Confines:
//    * 9 CPD OFFICERS — one at each BARRICADES_W mouth, navy w/ a
//      light-blue Sillitoe checkerboard cap band, facing the closure.
//    * BALL-HAWK GUS  — Waveland/Kenmore corner; RUNS for a landed homer
//      (state.wrigleyBall, set by a future gameday pack) and races the
//      player for it after a 6 s head start.
//    * SCORECARD VENDOR — free scorecards, house rules (Harry kept score).
//    * HOT-DOG CART REPRISE — a small RED HOTS cart (npcs.js twin) with a
//      steaming pot; "grab a dog" first, the no-ketchup gag on seconds.
//    * BLEACHER BUMS x3 — jerseys, a W flag, binoculars, 1969 grievances.
//    * ROOFTOP WATCHERS x2 — up on the climbable roof (y 9.6), binoculars.
//    * MARQUEE SELFIE TOURISTS x2 — phone up toward the marquee.
//    * GALLAGHER WAY — a kid pair (chasing, wander) + a parent watching.
//    * MURPHY'S DOORMAN — folded arms, cash only upstairs.
//    * KNOTHOLE REGULAR — face pressed to the RF-wall screen, 2 strikes.
//
//  Only-my-file rules: no shared edits beyond one import line in
//  packs/index.js. All setup in onWorldReady. makeNPC for every character
//  (auto bump-"ope" + distance culling). Own mulberry32 seed (773) so the
//  shared world rng / lakefront determinism is never perturbed. NO audio.
//  FREESTANDING props go on wrigleyRoot (cell visibility swap culls them);
//  worn/held props parent into the chibi (they cull + move with the NPC).
//  NPC groups stay global — makeNPC owns them and the framework culls them.
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, registerUpdate, addInteraction, holdItem, toast,
         makeNPC, state } from '../framework.js';
import { camera, toon, bmat, lerpAngle, mulberry32, glowTex } from '../core.js';
import { wrigleyRoot } from '../wrigley/index.js';

// ------------------------------ scratch (no per-frame alloc) -----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(),
      _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1),
      _e = new THREE.Euler();

// own rng — seed 773, isolated from the world rng (determinism constraint)
const _r = mulberry32(773);
const rnd = () => _r();
const pick = arr => arr[(_r() * arr.length) | 0];

// ============================ canvas textures ==========================
function capBandTex() {                                // light-blue Sillitoe checkerboard
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 16;
  const g = cv.getContext('2d'), c = 8;
  for (let y = 0; y < 16; y += c) for (let x = 0; x < 64; x += c) {
    g.fillStyle = ((x / c + y / c) % 2 === 0) ? '#8fbce8' : '#f4f8ff';
    g.fillRect(x, y, c, c);
  }
  const tx = new THREE.CanvasTexture(cv); tx.wrapS = THREE.RepeatWrapping; tx.repeat.set(4, 1); return tx;
}
function wFlagTex() {                                   // Cubs "W" win flag
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 48;
  const g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 48);
  g.strokeStyle = '#0e3386'; g.lineWidth = 3; g.strokeRect(2, 2, 60, 44);
  g.fillStyle = '#0e3386'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 34px "Trebuchet MS",sans-serif'; g.fillText('W', 32, 26);
  return new THREE.CanvasTexture(cv);
}
function cartStripeTex() {                              // umbrella — red/yellow wedges
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
  const g = cv.getContext('2d'), cols = ['#e23b34', '#f7c94b'], n = 12, w = 256 / n;
  for (let i = 0; i < n; i++) { g.fillStyle = cols[i % 2]; g.fillRect(i * w, 0, w + 1, 64); }
  const tx = new THREE.CanvasTexture(cv); tx.anisotropy = 4; return tx;
}
function cartSignTex() {                                // 'RED HOTS' cart sign
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 110;
  const g = cv.getContext('2d');
  g.fillStyle = '#c8342b'; g.beginPath(); g.roundRect(4, 4, 248, 102, 12); g.fill();
  g.strokeStyle = '#f7c94b'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#ffe14d'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 46px "Trebuchet MS",sans-serif'; g.fillText('RED HOTS', 128, 42);
  g.font = '600 20px "Trebuchet MS",sans-serif'; g.fillStyle = '#fff2c4';
  g.fillText('steamed · never boiled', 128, 80);
  return new THREE.CanvasTexture(cv);
}

// ------------------------------ builders -------------------------------
function buildDog() {                                  // small Chicago dog (held; npcs.js twin)
  const grp = new THREE.Group();
  const add = (mesh, x, y, z, rz) => { mesh.position.set(x, y, z); if (rz) mesh.rotation.z = rz; grp.add(mesh); };
  add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.24), toon(0xdca85a)), 0, 0, 0);           // bun
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 10), toon(0x9c3b22)), 0, 0.09, 0, Math.PI / 2); // dog
  add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.035, 0.05), toon(0x4fa32a)), 0, 0.16, 0.05);   // relish
  add(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.03, 0.04), toon(0xf4c81e)), 0, 0.17, -0.02);   // mustard
  add(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.11, 6), toon(0x5f9a34)), 0.13, 0.17, -0.05);  // sport pepper
  return grp;
}

onWorldReady(player => {
  state.scorecards = state.scorecards || 0;
  const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
  const rePose = [];                                   // re-applied each frame AFTER the NPC pass

  // ---- shared CPD cap assets (one geo/mat set, worn by all 9 officers) ----
  const capBandMat = bmat(0xffffff, { map: capBandTex(), side: THREE.DoubleSide });
  const crownGeo = new THREE.CylinderGeometry(0.5, 0.54, 0.26, 12);
  const bandGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.09, 16, 1, true);
  const billGeo = new THREE.BoxGeometry(0.5, 0.05, 0.28);
  const crownMat = toon(0x141d33), billMat = toon(0x0e1628);
  function addCap(head) {
    const crown = new THREE.Mesh(crownGeo, crownMat); crown.position.set(0, 0.5, -0.04); head.add(crown);
    const band = new THREE.Mesh(bandGeo, capBandMat); band.position.set(0, 0.4, -0.04); head.add(band);
    const bill = new THREE.Mesh(billGeo, billMat); bill.position.set(0, 0.36, 0.34); head.add(bill);
  }
  // ---- shared binoculars (parented to a head, glued at the eyes) ----
  const binocGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.2, 8), binocMat = toon(0x1a1a20);
  function addBinoculars(head) {
    const b = new THREE.InstancedMesh(binocGeo, binocMat, 2);
    _e.set(Math.PI / 2, 0, 0); _q.setFromEuler(_e);
    [-0.1, 0.1].forEach((dx, i) => { _m.compose(_v.set(dx, 0, 0), _q, _s.set(1, 1, 1)); b.setMatrixAt(i, _m); });
    b.instanceMatrix.needsUpdate = true; b.position.set(0, 0.02, 0.5); head.add(b);
  }

  // ================================================================== //
  //  1) CPD OFFICERS — one just inside each BARRICADES_W mouth, facing out
  // ================================================================== //
  const OFFICERS = [
    { x: -126, z: -400, ry: Math.PI / 2 },   // Addison E (past the station) — face east
    { x: -324, z: -400, ry: -Math.PI / 2 },  // Addison W (past Clark)       — face west
    { x: -328, z: -500, ry: -Math.PI / 2 },  // Waveland W                    — face west
    { x: -186, z: -500, ry: Math.PI / 2 },   // Waveland E (past Sheffield)   — face east
    { x: -190, z: -394, ry: 0 },             // Sheffield S of Addison        — face south
    { x: -190, z: -505, ry: Math.PI },       // Sheffield N of Waveland       — face north
    { x: -290, z: -394, ry: 0 },             // Clark S of Addison            — face south
    { x: -318, z: -505, ry: Math.PI },       // Clark N of Waveland           — face north
    { x: -230, z: -543, ry: Math.PI },       // Kenmore dead end              — face north
  ];
  const SKINS = [0xe0a878, 0xc98a5a, 0x8a5a3c, 0xf0c8a0, 0xb07a50, 0x6e4632];
  const HAIRS = [0x2a2018, 0x1a140e, 0x4a3a24, 0x8a8580, 0x241a12, 0x5a4a3a];
  const OFFICER_LINES = ["street's closed — game day, ope", "move along folks, nothing but baseball here",
    "ope — barricade's for everybody's good", "62 games a summer, 62 street closures"];
  for (const o of OFFICERS) {
    const cop = makeNPC({ x: o.x, z: o.z, ry: o.ry, wander: 0, name: 'cpd',
      palette: { suit: 0x1c2c4a, pants: 0x14203a, skin: pick(SKINS), hair: pick(HAIRS) },
      lines: OFFICER_LINES });
    addCap(cop.parts.head);
  }

  // ================================================================== //
  //  2) BALL-HAWK GUS — Waveland at the Kenmore corner
  // ================================================================== //
  const GUS_HOME = { x: -228, z: -498 };
  const gus = makeNPC({ x: GUS_HOME.x, z: GUS_HOME.z, ry: 0, wander: 0, name: 'gus',
    palette: { suit: 0x6a6f62, pants: 0x3a3d38, skin: 0xd8a878, hair: 0xb8b4ac },
    lines: ["62 career balls. year 41 of waiting.", "when it clears the wall, it's MINE, ope",
      "the trick is playing the wind off the lake"] });
  // worn glove (moves with his arm when he runs)
  const glove = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.12), toon(0x6a3a1c));
  glove.position.set(0, -0.06, 0.06); gus.parts.handR.add(glove);
  // a bucket of balls beside him (freestanding — his stash stays put) → wrigleyRoot
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.42, 12), toon(0x9aa0a6));
  bucket.position.set(GUS_HOME.x + 0.75, 0.21, GUS_HOME.z + 0.35); wrigleyRoot.add(bucket);
  for (let i = 0; i < 4; i++) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 7), toon(0xf3efe6));
    ball.position.set(GUS_HOME.x + 0.75 + (rnd() - 0.5) * 0.2, 0.44, GUS_HOME.z + 0.35 + (rnd() - 0.5) * 0.2);
    wrigleyRoot.add(ball);
  }
  const GUS = { phase: 'idle', liveT: 0, claimed: false, prevLive: false };
  rePose.push(() => { if (GUS.phase === 'idle') gus.parts.armR.rotation.x = -0.7; }); // glove up when watching
  function updGus(dt) {
    const ball = state.wrigleyBall;                    // set by a future gameday pack; undefined until then
    const live = !!(ball && ball.live && typeof ball.x === 'number' && typeof ball.z === 'number');
    if (live && !GUS.prevLive) { GUS.liveT = 0; GUS.claimed = false; GUS.phase = 'chase'; }
    if (live) GUS.liveT += dt;
    GUS.prevLive = !!(ball && ball.live);
    const g = gus.group;
    if (GUS.phase === 'chase') {
      if (!live) {                                     // ball gone & Gus didn't take it → the player grabbed it
        if (!GUS.claimed) gus.say('…nice grab, kid. 62 it stays.', 3);
        GUS.phase = 'return';
      } else {
        let dx = ball.x - g.position.x, dz = ball.z - g.position.z, d = Math.hypot(dx, dz);
        if (d > 1e-3) {
          const step = Math.min(d, 2.6 * dt); g.position.x += dx / d * step; g.position.z += dz / d * step;
          g.rotation.y = lerpAngle(g.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-9 * dt));
        }
        gus.sp = 2.6;
        if (d < 1.6 && GUS.liveT > 6) {                // 6 s head start elapsed, Gus beat the player to it
          ball.live = false; state.wrigleyBallsLostToGus = (state.wrigleyBallsLostToGus || 0) + 1;
          GUS.claimed = true; gus.say('MINE! ope — sorry kid, 63!', 3); GUS.phase = 'return';
        }
      }
    } else if (GUS.phase === 'return') {
      let dx = GUS_HOME.x - g.position.x, dz = GUS_HOME.z - g.position.z, d = Math.hypot(dx, dz);
      if (d > 0.3) {
        const step = Math.min(d, 2.6 * dt); g.position.x += dx / d * step; g.position.z += dz / d * step;
        g.rotation.y = lerpAngle(g.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-9 * dt)); gus.sp = 2.6;
      } else {
        g.position.set(GUS_HOME.x, 0, GUS_HOME.z);
        g.rotation.y = lerpAngle(g.rotation.y, 0, 1 - Math.exp(-6 * dt)); gus.sp = 0; GUS.phase = 'idle';
      }
    } else { gus.sp = 0; }
  }

  // ================================================================== //
  //  3) SCORECARD VENDOR — the marquee corner sidewalk
  // ================================================================== //
  const MARQUEE = { x: -284.5, z: -409.5 };
  const SC = { x: -288, z: -396 };
  const scVendor = makeNPC({ x: SC.x, z: SC.z, ry: faceTo(SC.x, SC.z, MARQUEE.x, MARQUEE.z), wander: 0, name: 'scorecards',
    palette: { suit: 0x3a5a8a, pants: 0x2a2e36, skin: 0xcaa070, hair: 0x2a2018 },
    lines: ["scorecard! ya can't tell the players without one", "ope — free of charge, house rules",
      "somebody's gotta keep score", "Harry always kept score, ya know"] });
  { const apron = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.72, 0.12), toon(0xcfc8b6)); apron.position.set(0, 1.0, 0.42); scVendor.group.add(apron);
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.02), toon(0xf4f0e6)); card.position.set(0.5, 1.62, 0.5); card.rotation.set(0, -0.2, 0.08); scVendor.group.add(card);
    const stack = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.34), toon(0xeae4d2)); stack.position.set(-0.5, 1.28, 0.28); scVendor.group.add(stack); }
  rePose.push(() => { scVendor.parts.armR.rotation.x = -1.35; scVendor.parts.armR.rotation.z = -0.1; scVendor.parts.armL.rotation.x = -0.45; });
  addInteraction({ x: SC.x, z: SC.z + 1.1, r: 2.0, label: 'buy a scorecard — free, house rules', onUse: () => {
    scVendor.setFace('happy'); scVendor.say('somebody keep score — Harry always did', 2.4);
    toast('scorecard!', 'somebody keep score — Harry always did');
    state.scorecards = (state.scorecards || 0) + 1;
  } });

  // ================================================================== //
  //  4) HOT-DOG CART REPRISE — Addison/Sheffield corner (npcs.js twin)
  // ================================================================== //
  const CX = -186, CZ = -396.5;                        // cart centre (north sidewalk; sign faces the street +z)
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 1.0), toon(0xcdd2d7)); body.position.set(CX, 0.75, CZ); wrigleyRoot.add(body);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.12, 1.12), toon(0x9aa0a6)); counter.position.set(CX, 1.24, CZ); wrigleyRoot.add(counter);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12), toon(0x6a7078)); pot.position.set(CX, 1.4, CZ); wrigleyRoot.add(pot);
  const wheels = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.14, 12), toon(0x2b2b2b), 2);
  [-0.85, 0.85].forEach((dx, i) => { _q.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)); _m.compose(_v.set(CX + dx, 0.3, CZ + 0.3), _q, _s.set(1, 1, 1)); wheels.setMatrixAt(i, _m); });
  wheels.instanceMatrix.needsUpdate = true; wrigleyRoot.add(wheels); _q.identity();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.0, 8), toon(0x8a8a8a)); pole.position.set(CX, 1.6, CZ); wrigleyRoot.add(pole);
  const umb = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.75, 12), bmat(0xffffff, { map: cartStripeTex() })); umb.position.set(CX, 3.1, CZ); wrigleyRoot.add(umb);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.48), bmat(0xffffff, { map: cartSignTex(), side: THREE.DoubleSide, transparent: true }));
  sign.position.set(CX, 1.72, CZ + 0.58); wrigleyRoot.add(sign);
  const hdVendor = makeNPC({ x: CX, z: CZ - 1.5, ry: 0, wander: 0, name: 'hotdog',
    palette: { suit: 0xe8e2d0, pants: 0x333a44, skin: 0xe0a878, hair: 0x2a2018 },
    lines: ["encased meats, Wrigley-side", "ope — no ketchup, house rules travel",
      "steamed, never boiled", "how 'bout them Cubs — get a dog"] });
  // steam: 3 slow-rising billboarded glow points off the pot → wrigleyRoot
  const steam = [];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5),
      bmat(0xdfe6ea, { map: glowTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set(CX + (i - 1) * 0.12, 1.6, CZ); wrigleyRoot.add(s); steam.push({ m: s, t: i * 0.66 });
  }
  const dogHeld = buildDog();
  let dogUses = 0, dogBusy = false;
  addInteraction({ x: CX, z: CZ + 1.0, r: 2.4, label: 'grab a dog — the works', onUse: () => {
    if (dogBusy) return; dogBusy = true;
    if (dogUses === 0) {
      hdVendor.setFace('happy'); hdVendor.say('one, dragged through the garden', 2.2);
      dogHeld.scale.setScalar(0.85); dogHeld.position.set(0, 0.14, 0); dogHeld.rotation.set(0, 0, 0); holdItem(dogHeld);
      toast('CHICAGO DOG', 'dragged through the garden');
      setTimeout(() => { holdItem(null); dogBusy = false; }, 2600);
    } else {
      hdVendor.setFace('surprised'); hdVendor.say('ketchup? …not on a dog, friend. house rules travel.', 3);
      toast('NO KETCHUP', 'house rules travel');
      setTimeout(() => { hdVendor.setFace('neutral'); dogBusy = false; }, 2600);
    }
    dogUses++;
  } });

  // ================================================================== //
  //  5) BLEACHER BUMS x3 — clustered on Waveland at the Bleacher Gate
  // ================================================================== //
  const bum1 = makeNPC({ x: -196, z: -498, ry: 0, wander: 0, name: 'bum',
    palette: { suit: 0x2a52a8, pants: 0x2a2e36, skin: 0xd8a878, hair: 0x3a2a1c },
    lines: ["threw it back — wasn't ours, ope", "the bleachers are the only true seats", "fly the W, baby"] });
  { const flag = new THREE.Group();
    const fpole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 6), toon(0x6a4a2a)); fpole.position.set(0, 0.65, 0); flag.add(fpole);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.38), bmat(0xffffff, { map: wFlagTex(), side: THREE.DoubleSide }));
    cloth.position.set(0.3, 1.12, 0); flag.add(cloth);
    flag.position.set(0.5, 1.0, 0.2); bum1.group.add(flag); }
  rePose.push(() => { bum1.parts.armR.rotation.x = -0.35; bum1.parts.armR.rotation.z = -0.5; });
  const bum2 = makeNPC({ x: -201, z: -497, ry: 0, wander: 0, name: 'bum',
    palette: { suit: 0xb5322c, pants: 0x2a2e36, skin: 0xc98a5a, hair: 0x1a140e },
    lines: ["ope, watch the ivy — ball's lost in there", "'69 still stings, don't get me started", "day games only, the way God intended"] });
  addBinoculars(bum2.parts.head);
  rePose.push(() => { bum2.parts.armL.rotation.x = -2.3; bum2.parts.armR.rotation.x = -2.3; bum2.parts.armL.rotation.z = 0.15; bum2.parts.armR.rotation.z = -0.15; });
  makeNPC({ x: -205, z: -499, ry: 0, wander: 0, name: 'bum',
    palette: { suit: 0xe8e6df, pants: 0x394b57, skin: 0x8a5a3c, hair: 0x241a12 },
    lines: ["Waveland's where the legends land, ope", "been in these bleachers since the Bartman days", "sweet home, Wrigley Field"] });

  // ================================================================== //
  //  6) ROOFTOP WATCHERS x2 — on the climbable roof (y 9.6)
  // ================================================================== //
  const w1 = makeNPC({ x: -214, z: -514, ry: 0, wander: 0, name: 'rooftop',
    palette: { suit: 0x4a7a5a, pants: 0x2f3540, skin: 0xe0a878, hair: 0x3a2a1c },
    lines: ["best seats in baseball, ope", "no video boards blockin' us up here"] });
  w1.group.position.y = 9.6; addBinoculars(w1.parts.head);
  rePose.push(() => { w1.parts.armL.rotation.x = -2.3; w1.parts.armR.rotation.x = -2.3; w1.parts.armL.rotation.z = 0.15; w1.parts.armR.rotation.z = -0.15; });
  const w2 = makeNPC({ x: -211, z: -515, ry: 0, wander: 0, name: 'rooftop',
    palette: { suit: 0xc06a3a, pants: 0x2a3340, skin: 0xc98a5a, hair: 0x241a12 },
    lines: ["you can smell the hot dogs from up here, ope", "we can see the whole infield — go Cubs"] });
  w2.group.position.y = 9.6;

  // ================================================================== //
  //  7) MARQUEE SELFIE TOURISTS x2 — Clark/Addison crosswalk island
  // ================================================================== //
  function phoneProp() {
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.02), toon(0x14141a));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.16), bmat(0x9fd0ff)); scr.position.z = 0.012; phone.add(scr);
    return phone;
  }
  const t1 = makeNPC({ x: -294, z: -399, ry: faceTo(-294, -399, MARQUEE.x, MARQUEE.z), wander: 0, name: 'tourist',
    palette: { suit: 0xd83a6a, pants: 0x394b57, skin: 0xf0c8a0, hair: 0x4a3a24 },
    lines: ["say cheddar!", "ope — we drove four hours for this", "get the marquee in it!"] });
  { const p = phoneProp(); p.position.set(0.14, 1.92, 0.62); p.rotation.x = -0.2; t1.group.add(p); }
  rePose.push(() => { t1.parts.armR.rotation.x = -2.0; t1.parts.armR.rotation.z = -0.1; t1.parts.armL.rotation.x = -1.2; });
  makeNPC({ x: -292, z: -397, ry: faceTo(-292, -397, MARQUEE.x, MARQUEE.z), wander: 0, name: 'tourist',
    palette: { suit: 0x3aa0c0, pants: 0x2a2e36, skin: 0x8a5a3c, hair: 0x1a140e },
    lines: ["one more with the sign, ope", "we saw the Cubs win here once", "smile — friendly confines!"] });

  // ================================================================== //
  //  8) GALLAGHER WAY — a kid pair chasing (wander) + a parent watching
  // ================================================================== //
  makeNPC({ x: -287, z: -455, ry: 0, wander: 2.5, scale: 0.55, name: 'kid',
    palette: { suit: 0xf0a02a, pants: 0x394b57, skin: 0xe0a878, hair: 0x241a12 },
    lines: ["tag, you're it! ope", "I'm gonna play for the Cubs someday", "race ya to the splash pad!"] });
  const kid2 = makeNPC({ x: -289, z: -457, ry: 0, wander: 2.5, scale: 0.55, name: 'kid',
    palette: { suit: 0x3ac06a, pants: 0x2a3340, skin: 0xc98a5a, hair: 0x3a2a1c },
    lines: ["ope, sorry! didn't see ya", "my glove's bigger than yours", "go Cubbies!"] });
  { const kg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.1), toon(0x8a4a26)); kg.position.set(0, -0.05, 0.05); kid2.parts.handR.add(kg); }
  const parent = makeNPC({ x: -283, z: -458, ry: faceTo(-283, -458, -288, -456), wander: 0, name: 'parent',
    palette: { suit: 0x6a5a8a, pants: 0x2a2e36, skin: 0xf0c8a0, hair: 0x2a2018 },
    lines: ["ope — careful you two", "grab a spot on the lawn, game's on", "first game's always here at Gallagher Way"] });

  // ================================================================== //
  //  9) MURPHY'S DOORMAN — outside Murphy's, folded arms
  // ================================================================== //
  const door = makeNPC({ x: -186, z: -487, ry: -Math.PI / 2, wander: 0, name: 'doorman',
    palette: { suit: 0x1a1a20, pants: 0x1a1a20, skin: 0x6e4632, hair: 0x140f0a },
    lines: ["rooftop's full — street's the party anyway", "ope — cash only upstairs",
      "Murphy's since before you were born, kid", "we pour a cold one every Cubs win"] });
  rePose.push(() => {                                  // folded arms across the chest
    door.parts.armL.rotation.x = -1.3; door.parts.armR.rotation.x = -1.3;
    door.parts.armL.rotation.z = 0.7; door.parts.armR.rotation.z = -0.7;
  });

  // ================================================================== //
  //  10) KNOTHOLE REGULAR — face pressed to the RF-wall screen
  // ================================================================== //
  const knot = makeNPC({ x: -194.5, z: -447, ry: -Math.PI / 2, wander: 0, name: 'knothole',
    palette: { suit: 0x7a4a3a, pants: 0x3a3d38, skin: 0xe0a878, hair: 0x3a2a1c },
    lines: ["shh — 2 strikes", "best free seat in the majors, ope", "you can watch the whole game through this knothole"] });
  rePose.push(() => {                                  // lean in, hands cupped to the screen
    knot.parts.body.rotation.x = 0.32;
    knot.parts.armL.rotation.x = -0.5; knot.parts.armR.rotation.x = -0.5;
    knot.parts.armL.rotation.z = 0.25; knot.parts.armR.rotation.z = -0.25;
  });

  // ---------------------------- per-frame ---------------------------- //
  registerUpdate((dt) => {
    updGus(dt);
    for (const s of steam) {                           // slow-rising billboarded steam
      s.t += dt * 0.5; if (s.t > 2) s.t -= 2; const p = s.t / 2;
      s.m.position.y = 1.55 + p * 0.9;
      s.m.material.opacity = Math.sin(p * Math.PI) * 0.4;
      s.m.quaternion.copy(camera.quaternion);
      s.m.scale.setScalar(0.5 + p * 0.7);
    }
    for (let i = 0; i < rePose.length; i++) rePose[i](dt);
  });
});
