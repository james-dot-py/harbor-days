// =====================================================================
//  MONTROSE HARBOR LIFE — two cozy delight moments at the already-built
//  Montrose Harbor (task 074). ONE file, ONE import line; ALL setup inside
//  onWorldReady; imports anything, edits nothing shared. NO shared rng
//  (rng/rand) — the only jitter is Math.random() in the cricket-chirp timer,
//  which never touches world layout. ZERO new InstancedMesh buckets: the
//  fisherman is a makeNPC chibi; every prop is an individual frustum-culled
//  Mesh (toon/bmat), so they cost draws only when framed.
//
//    * MOMENT 1 — THE HOOK FISHERMAN'S CATCH: a breakwater angler on the
//      walkable hook mole, rod out over the open lake, bucket beside him with
//      a fish ALWAYS flopping. On a continuous ~7 s loop he gets a bite, reels
//      a wriggling perch up the line, and drops it in the bucket ("dinner!").
//      Shot-safe: no terminal state — any screenshot reads "he caught one."
//    * MOMENT 2 — PARK BAIT'S CRICKET CHIRP: a hand-lettered styrofoam bait
//      cooler outside Park Bait that softly chirps with crickets, swelling as
//      you approach (guarded, synthesized, subtle). A peek-in interaction
//      names the Cricket-Hill-up-the-shore wink.
// =====================================================================
import * as THREE from 'three';
import { scene, toon, bmat, curveMat, clamp } from '../core.js';
import { onWorldReady, registerUpdate, makeNPC, addInteraction, toast,
         journalSection, getAudioCtx, state } from '../framework.js';
import * as CH from '../data/chicago.js';

// ---------------------------------------------------------------------
//  TUNABLE PLACEMENT CONSTANTS (orchestrator nudges these from screenshots)
// ---------------------------------------------------------------------
// Fisherman: on the mole deck (z=-804 spans x 219..238), 2.5 m inboard of the
// lake face (x=238) so the line drops CLEANLY off the edge into open water and
// never punches the paved deck. Moved lakeward from the suggested x=230 for that
// reason — see the report. ry ~1.48 faces the open lake (east, a touch south).
const FISH_X = 235.5, FISH_Z = -804, FISH_RY = 1.48;

// Park Bait cooler: on the mainland, just east of the shop's east wall
// (PARK_BAIT.x=176,w=6.4 -> east face x≈179.2), z a touch south of shop centre.
const COOLER_X = CH.PARK_BAIT.x + 4;      // 180
const COOLER_Z = CH.PARK_BAIT.z + 2;      // -738
const CHIRP_R  = 15;                       // crickets audible within 15 m

// ---------------------------------------------------------------------
//  RIG-LOCAL GEOMETRY (metres; the fisherman's rig group is unscaled, +z=front)
// ---------------------------------------------------------------------
const ROD_LEN = 2.4, ROD_PHI = 1.009;      // rod tilt from vertical -> ~32° elevation, +z
const GRIP = { x: 0,    y: 1.15, z: 0.35 };                 // where his hands meet the rod
const TIP  = { x: 0,    y: 2.428, z: 2.381 };               // rod tip = GRIP + ROD_LEN·(0,cosφ,sinφ)
const BOB  = { x: 0,    y: -2.3, z: 2.9 };                  // line's water entry (y=-2.3 = lake), just past the seawall
const REELTOP = { x: 0, y: 2.15, z: 2.35 };                // where a reeled fish reaches, just below the tip
const BKT     = { x: 0.55, y: 0,    z: -0.15 };            // bucket base, beside him on the deck
const BKT_TOP = { x: 0.55, y: 0.36, z: -0.15 };            // fish rest height inside the bucket

// catch cycle timeline (seconds within one PERIOD)
const PERIOD = 7.0, T_BITE = 3.8, T_REEL = 4.3, T_ARC = 5.5, T_DROP = 5.95, T_SETTLE = 6.1;

// ---- a small silver perch (elongated body + tail); build-time alloc is fine ----
function makeFish() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 7), toon(0xc7ced6));
  body.scale.set(1.7, 0.72, 0.72);
  g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.14, 4), toon(0xb0b8c2));
  tail.rotation.z = Math.PI / 2;                // fan out along -x (the tail end)
  tail.position.set(-0.19, 0, 0);
  g.add(tail);
  return g;
}

onWorldReady((player) => {
  state.mtPerch = state.mtPerch || 0;

  // ================================================================
  //  MOMENT 1 — THE HOOK FISHERMAN
  // ================================================================
  const npc = makeNPC({
    x: FISH_X, z: FISH_Z, ry: FISH_RY, wander: 0, name: '',
    palette: { suit: 0x5f6b52, pants: 0x7a6f56, skin: 0xd7a679, hair: 0x6b5a44 },  // muted olive shirt, khaki pants
    lines: ["perch are runnin' today", "quiet now — you'll spook 'em",
            'ope, watch the line!', 'caught a dozen since sunup'],
  });
  npc.group.position.y = 0;                      // mole deck is at grade (y≈0)
  const p = npc.parts;

  // bucket-hat vibe — a khaki crown + brim parented to the head (rides the bob)
  {
    const HAT = 0x8a7d55;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.42, 12), toon(HAT));
    crown.position.y = 0.5; p.head.add(crown);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.06, 14), toon(HAT));
    brim.position.y = 0.18; p.head.add(brim);
  }

  // the fishing rig (unscaled world-metre group; +z is his front = the lake)
  const rig = new THREE.Group();
  rig.position.set(FISH_X, 0, FISH_Z);
  rig.rotation.y = FISH_RY;
  scene.add(rig);

  // ROD — a thin tapered cylinder on a pivot at the grip, tilted up-and-out
  const rodPivot = new THREE.Group();
  rodPivot.position.set(GRIP.x, GRIP.y, GRIP.z);
  rodPivot.rotation.x = ROD_PHI;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.018, ROD_LEN, 6), bmat(0x6b4a2f));
  rod.position.y = ROD_LEN / 2;                  // base at the pivot, tip at +ROD_LEN
  rodPivot.add(rod);
  rig.add(rodPivot);

  // LINE — a very thin dark cylinder from the rod tip down to the water (static)
  {
    const dx = BOB.x - TIP.x, dy = BOB.y - TIP.y, dz = BOB.z - TIP.z;
    const len = Math.hypot(dx, dy, dz);
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 4), bmat(0x20242a));
    line.position.set((TIP.x + BOB.x) / 2, (TIP.y + BOB.y) / 2, (TIP.z + BOB.z) / 2);
    line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(dx, dy, dz).normalize());
    rig.add(line);
  }

  // BUCKET — a pale open-top pail beside him, ALWAYS holding a flopping fish
  {
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.42, 12, 1, true), toon(0xdfe3da));
    wall.position.set(BKT.x, BKT.y + 0.21, BKT.z);
    rig.add(wall);
    const base = new THREE.Mesh(new THREE.CircleGeometry(0.17, 12), toon(0xcfd3c8));
    base.rotation.x = -Math.PI / 2; base.position.set(BKT.x, BKT.y + 0.02, BKT.z);
    rig.add(base);
  }
  const bfish = makeFish();                       // the bucket keeper — never leaves
  bfish.position.set(BKT_TOP.x, BKT_TOP.y, BKT_TOP.z);
  rig.add(bfish);

  const cfish = makeFish();                        // the freshly-caught fish (travels the line)
  cfish.visible = false;
  rig.add(cfish);

  // interaction anchor ~1.5 m inboard (west) of him so the player stands on deck
  addInteraction({ x: FISH_X - 1.5, z: FISH_Z, r: 2.5, label: 'ask about the fishing',
    onUse: () => toast('OFF THE HOOK',
      'Perch off the breakwater — get your minnows at Perch Bait up the shore.') });

  // ---- the catch cycle + always-flopping bucket fish (no per-frame alloc) ----
  let lastDrop = -1, popT = 0;

  // ================================================================
  //  MOMENT 2 — PARK BAIT'S BAIT COOLER (built here; audio in the update below)
  // ================================================================
  {
    const cool = new THREE.Group();
    cool.position.set(COOLER_X, 0, COOLER_Z);     // sign faces +z (south) toward the peek-in anchor
    // styrofoam body
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.5), toon(0xeef0ea));
    box.position.y = 0.275; cool.add(box);
    // slightly-open dark lid (front edge lifted = ajar, "crickets inside")
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.05, 0.52), toon(0x3a3d3a));
    lid.position.set(0, 0.58, -0.03); lid.rotation.x = -0.2; cool.add(lid);
    // a couple of dark vent slots on the front face
    for (const sx of [-0.16, 0.16]) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), bmat(0x2a2c28));
      vent.position.set(sx, 0.16, 0.251); cool.add(vent);
    }
    // hand-lettered sign — own CanvasTexture on a FrontSide plane + solid backing
    {
      const cv = document.createElement('canvas'); cv.width = 384; cv.height = 168;
      const g = cv.getContext('2d');
      g.fillStyle = '#f3ecd6'; g.fillRect(0, 0, 384, 168);
      g.strokeStyle = '#7d6b52'; g.lineWidth = 9; g.strokeRect(7, 7, 370, 154);
      g.fillStyle = '#3a2f22'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '800 46px "Trebuchet MS",sans-serif'; g.fillText('LIVE BAIT', 192, 46);
      g.font = '700 27px "Trebuchet MS",sans-serif';
      g.fillText('CRICKETS · CRAWLERS', 192, 100);
      g.fillText('· MINNOWS ·', 192, 134);
      const tex = new THREE.CanvasTexture(cv);
      const placard = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.27),
        curveMat(new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide })));
      placard.position.set(0, 0.34, 0.275); cool.add(placard);     // 15 mm proud of the 0.260 backing face (anti z-fight)
      const backing = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.29, 0.03), toon(0xcbb892));
      backing.position.set(0, 0.34, 0.245); cool.add(backing);     // solid back -> no mirrored text
    }
    scene.add(cool);
  }

  addInteraction({ x: 180, z: -736, r: 2.5, label: 'peek in the cooler',
    onUse: () => toast('PERCH BAIT',
      'Crickets, a dozen for a buck. (Cricket Hill up the shore is named for the swarms.)') });

  // cricket chirp scheduler state
  let chirpT = 0.5;

  // ================================================================
  //  ONE PER-FRAME UPDATE (fisherman catch cycle + cricket chirp)
  // ================================================================
  registerUpdate((dt, t, pl) => {
    if (dt < 0) dt = 0;

    // ---- fisherman: continuous catch cycle (driven purely by t -> shot-safe) ----
    const ph = t % PERIOD;
    let rodX = ROD_PHI + Math.sin(t * 0.8) * 0.02;   // gentle idle rod sway
    let pull = 0;                                    // reel arm-lift 0..1
    let cfVis = false, cfx = 0, cfy = 0, cfz = 0, wob = 0;

    if (ph < T_BITE) {
      // idle, waiting on a bite
    } else if (ph < T_REEL) {                        // (a) the bite — rod tip dips
      const b = (ph - T_BITE) / (T_REEL - T_BITE);
      rodX += Math.sin(b * Math.PI) * 0.1;
    } else if (ph < T_ARC) {                         // (b/c) reel — rod bends up, fish rises the line
      const r = (ph - T_REEL) / (T_ARC - T_REEL);
      pull = r; rodX -= r * 0.08;
      cfVis = true; wob = 1;
      cfy = BOB.y + (REELTOP.y - BOB.y) * r;
      cfz = BOB.z + (REELTOP.z - BOB.z) * r;
    } else if (ph < T_SETTLE) {                      // (d) arc down into the bucket
      const a = (ph - T_ARC) / (T_SETTLE - T_ARC);
      pull = 1 - a; cfVis = true; wob = 1;
      cfx = REELTOP.x + (BKT_TOP.x - REELTOP.x) * a;
      cfz = REELTOP.z + (BKT_TOP.z - REELTOP.z) * a;
      cfy = REELTOP.y + (BKT_TOP.y - REELTOP.y) * a + Math.sin(a * Math.PI) * 0.5;
    }

    rodPivot.rotation.x = rodX;
    // re-pose both arms toward the rod EVERY frame (updateNPC reset them first;
    // pack updates run after it — mirrors cricket-hill.js's re-pose approach)
    p.armL.rotation.x = -1.3 - pull * 0.55; p.armL.rotation.z = 0.28;
    p.armR.rotation.x = -1.12 - pull * 0.55; p.armR.rotation.z = -0.2;

    cfish.visible = cfVis;
    if (cfVis) {
      cfish.position.set(cfx, cfy, cfz);
      cfish.rotation.z = Math.sin(t * 22) * 0.5 * wob;
      cfish.rotation.y = Math.sin(t * 15) * 0.4;
    }

    // bucket keeper: always flopping so any screenshot reads "he caught one"
    bfish.rotation.z = Math.sin(t * 6) * 0.35;
    bfish.rotation.y = Math.sin(t * 3) * 0.3;
    bfish.position.y = BKT_TOP.y + Math.sin(t * 5) * 0.02;
    if (popT > 0) { popT -= dt; const s = 1 + Math.max(0, popT) * 0.6; bfish.scale.set(s, s, s); }

    // the drop beat — rate-limited to ONCE per cycle; only when the player is
    // near enough to witness it (bubble is a lightweight head projection).
    const cyc = Math.floor(t / PERIOD);
    if (ph >= T_DROP && cyc !== lastDrop) {
      lastDrop = cyc; popT = 0.4;
      const dxp = pl.x - FISH_X, dzp = pl.z - FISH_Z;
      if (dxp * dxp + dzp * dzp < 30 * 30) { state.mtPerch++; npc.say('dinner!'); }
    }

    // ---- Park Bait cricket chirp (guarded, proximity-swelled, ~1/sec) ----
    chirpT -= dt;
    if (chirpT <= 0) {
      chirpT = 0.85 + Math.random() * 0.3;         // reset the accumulator every time
      const dcx = pl.x - COOLER_X, dcz = pl.z - COOLER_Z;
      const cd = Math.hypot(dcx, dcz);
      if (cd < CHIRP_R) {
        const A = getAudioCtx();                    // fetched only at a scheduled chirp, never per-frame
        if (A.actx) chirp(A, clamp(1 - cd / CHIRP_R, 0, 1));
      }
    }
  });

  // ---- journal ----
  journalSection('montrose-harbor-life', 'Montrose Harbor', () => `
    <div class="jrow"><span>Perch off the hook</span><b>${state.mtPerch}</b></div>
    <div class="jrow"><span>Perch Bait</span><b>live crickets, by the dozen</b></div>`);
});

// a single cricket chirp: 2–4 quick high-sine pulses (~0.02 s on / 0.03 s off),
// gain scaled by proximity, GENTLE peak, through sfxBus. Short-lived nodes only
// (called ~1/sec when near — never per frame). Fully guarded on actx.
function chirp(A, vol) {
  const actx = A.actx; if (!actx) return;
  const t0 = actx.currentTime;
  const peak = vol * 0.07;                          // subtle ambience — never loud
  const pulses = 2 + (Math.random() * 3 | 0);       // 2..4
  let tt = t0;
  for (let i = 0; i < pulses; i++) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.value = 4300 + Math.random() * 500;   // 4.3–4.8 kHz
    g.gain.setValueAtTime(0.0001, tt);
    g.gain.linearRampToValueAtTime(peak, tt + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.02);
    o.connect(g); g.connect(A.sfxBus); o.start(tt); o.stop(tt + 0.05);
    tt += 0.05;
  }
}
