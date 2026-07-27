// =====================================================================
//  PACK: lp-conservatory — task 122, the LINCOLN PARK CONSERVATORY's
//  LIVING layer. structures.js builds the PLACE from LP_CONSERVATORY
//  (the ogee glasshouse, the glass pyramid vestibule + its static FREE
//  ADMISSION door glow, the formal garden, the Eli Bates fountain and
//  its static spray plume, Grandmother's Garden); props.js grows the
//  beds. THIS pack owns what MOVES and what the player can feel:
//    * THE GARDEN CELL — a definePlace room over the formal garden
//      (x −84..−56, z 700..738). A SUBTLE grade only: the fog pulls a
//      touch closer/softer and the ambience goes hushed + birdier
//      (ext 0.7 / bird 1.4) — a walled garden hush, not a new biome.
//      One toast on the first entry of a session.
//    * BATES MIST — soft white-teal puffs off the fountain plume top,
//      spawned into the SHARED DUST particle pool (+0 draw calls, no
//      mesh, no bucket). ~3-5 puffs every 0.25 s inside 60 m, halved
//      when prefersCalm(); they drift up-and-out and fade.
//    * THE BURBLE — a quiet looped water bed: noise -> ~900 Hz bandpass
//      -> a slow LFO'd gain -> a master gain, built ONCE and LAZILY
//      (never a node until actx is live AND the player is first inside
//      18 m), then only ever ridden on a ~0.35 s throttle with
//      setTargetAtTime. Silent (and parked exactly once) past 18 m.
//    * THE DOORS — REBUILT task 125 (issue 038). 122 shipped a "peek
//      inside" interaction whose entire payload was a toast: the owner
//      pressed E at the doors, read a line of text, and the building did
//      not change one pixel. The anchor, radius and registration were
//      all fine — there was simply NOTHING TO SEE, because the doorway
//      was a flat cream panel with no inside behind it. So this pack now
//      owns the opening (structures.js kept only the frame around it):
//        - THE PALM HOUSE DIORAMA, a shallow lit room set back into the
//          already-carved vestCarve volume: warm back glow, a dark
//          recess shell, two scaly trunks, THREE depths of fern/palm
//          silhouette and a near-black koi pool with a few glints (the
//          kz05/kz07 interior refs — the real inside is layered GREEN
//          lit from above, not an amber lantern). Visible ALWAYS, so the
//          doorway reads as inhabited to anyone just walking past.
//        - SHUT GLASS DOORS in front of it. The doors are glass because
//          the real ones are: you can see in without anything opening.
//          NO walkable interior (the 111-plan decision stands) and NO
//          door-opening promise (the artinstitute.js precedent).
//        - THE BEAT: E leans a session camera in and frames the doorway
//          (the 118 scope precedent — fov eased off baseFov(), never a
//          literal 50), the interior warms and brightens, the fronds
//          stir, and warm air puffs out over the threshold into the
//          shared DUST pool. The toast + chime survive as the CAPTION.
//          Releases on any movement key, joystick deflection, a second
//          press, or ~6 s. ?peek=1 fires and HOLDS it for shot runs.
//      No glint of our own — the 091 affordance system handles that.
//  Culling: FOUR meshes total (warm glow / deep dark / mid green /
//  glass), all inside one group we hide past 70 m ourselves — so they
//  carry userData.noFogCull (the 095 fogcull-vs-pack-LOD law: whoever
//  manages .visible must claim the exemption, or the two fight). Every
//  frame's work is gated by ONE squared-distance test to the fountain —
//  past 60 m the update does two subtractions, parks the audio if
//  needed, and returns.
//  Determinism: NO shared rng — every placement is a literal constant.
//  Math.random appears only for runtime jitter/timers (the runtime-rand
//  rule). No per-frame allocation; every audio access guarded on actx.
//  DEBUG: window.__hd.conservatory() -> {d, mist, burble, actx, peek, glow}.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, registerUpdate, addInteraction, definePlace, toast, getAudioCtx, prefersCalm, state } from '../framework.js';
import { DUST } from '../fx.js';
import { scene, camera, toon, bmat, lerp, clamp, baseFov } from '../core.js';
import { cam, keys, joy } from '../input.js';
import { mayor } from '../character.js';
import * as CH from '../data/chicago.js';

// ---- the two anchors this pack lives off (literals derived from data) ----
const MIST_R = 60, MIST_R2 = MIST_R * MIST_R;   // mist / update gate
const BURBLE_R = 18;                            // audible radius of the basin
const MIST_EVERY = 0.25;                        // spawn tick (s)
const BURBLE_CAP = 0.12, BURBLE_CAP_CALM = 0.055;

onWorldReady(() => {
  const C = CH.LP_CONSERVATORY, B = C.batesFountain, V = C.vestibule;
  const FX_X = B.x, FX_Z = B.z;                 // (-70, 726)
  const calm = prefersCalm;

  // ---- (1) THE GARDEN CELL ---------------------------------------------
  // Cheap rect containment (called ~5 Hz by the framework) over the formal
  // garden + the vestibule forecourt. The grade is deliberately near the
  // world default — a hush, not a biome (cf. ZOO.place.grade, which is a
  // full room; this one is half its strength in every axis).
  let welcomed = false;
  definePlace({
    name: 'Conservatory Gardens',
    contains: (x, z) => x >= -84 && x <= -56 && z >= 700 && z <= 738,
    fadeS: 2.0,
    grade: { fogNear: 34, fogFar: 190, ambI: 0.95 },
    amb: { ext: 0.7, bird: 1.4 },
    onEnter() {
      if (!welcomed) { welcomed = true; toast('the conservatory', 'free admission — always has been'); }
    },
  });

  // ---- (2) THE BURBLE (lazy, guarded, throttled) ------------------------
  // Cached at build of the node graph; the hot path never calls getAudioCtx()
  // (it allocates its return object) — only the 0.35 s throttle does.
  let actx = null, burbleG = null, burbleTarget = 0;
  function buildBurble(A) {
    const ax = A.actx;
    if (!ax || !A.noiseBuf || !A.sfxBus) return;        // retry on the next tick
    const t0 = ax.currentTime;
    const src = ax.createBufferSource(); src.buffer = A.noiseBuf; src.loop = true;
    const bp = ax.createBiquadFilter();                 // the wet band of falling water
    bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.75;
    const hp = ax.createBiquadFilter();                 // shave the rumble so it sits UNDER the birds
    hp.type = 'highpass'; hp.frequency.value = 420;
    const mod = ax.createGain(); mod.gain.value = 1;    // slow swell — the plume breathing
    const lfo = ax.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.17;
    const lfoD = ax.createGain(); lfoD.gain.value = 0.32;
    lfo.connect(lfoD); lfoD.connect(mod.gain);
    const m = ax.createGain(); m.gain.value = 0;        // silent until the throttle ramps it
    src.connect(bp); bp.connect(hp); hp.connect(mod); mod.connect(m); m.connect(A.sfxBus);
    src.start(t0); lfo.start(t0);
    actx = ax; burbleG = m;
  }

  // ---- a soft two-note chime (event-driven, guarded) --------------------
  function chime(f, delay, vol) {
    const A = getAudioCtx(); const ax = A.actx; if (!ax || !A.sfxBus) return;
    const t0 = ax.currentTime + delay;
    const o = ax.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const g = ax.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.75);
    o.connect(g); g.connect(A.sfxBus);
    o.start(t0); o.stop(t0 + 0.78);
  }

  // ---- (3) THE PALM HOUSE BEHIND THE GLASS ------------------------------
  // Geometry is all literal, derived from the vestibule data that structures.js
  // builds the porch from: zS is the south face, SILL the stone plinth top, and
  // the doorway opening is the gap between the jamb frames at V.x +- 1.26.
  const vHD = V.d / 2, SILL = 0.40, zS = V.z + vHD;   // 707.8 — the south face
  // FL clears the gStoneD dark course (a 0.10-tall slab centred at SILL+0.05, so
  // its top is 0.50) — a floor at SILL+0.02 sat UNDER it and the porch's tan
  // stone showed through the doorway instead of the room's dark ground.
  const HW = 1.14, FL = SILL + 0.14, CE = SILL + 2.02;  // opening half-width, floor, ceiling
  const zGlass = zS - 0.02, zBack = zS - 3.18;          // door plane / back wall (well inside vestCarve z0 703)

  // four geometry buckets -> four merged meshes (see the header's culling note)
  const gWarm = [], gDeep = [], gMid = [], gGlass = [];
  const quad = (bucket, w, h, x, y, z, rz, ry) => {     // a leaf blade / wall panel
    const g = new THREE.PlaneGeometry(w, h);
    if (rz) g.rotateZ(rz);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    bucket.push(g);
  };
  const slab = (bucket, w, h, d, x, y, z) => {
    const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); bucket.push(g);
  };
  // Planting is built from CHUNKY LOBES, not flat blades. Flat quads read as
  // paper shards at this scale (tried, shot, rejected) — the house vocabulary
  // for foliage is solid faceted volume (the 4-lobe tree canopies, the cone
  // conifers), and that is what reads as a room stuffed with plants.
  const lobe = (bucket, r, x, y, z, sy) => {
    const g = new THREE.IcosahedronGeometry(r, 0);       // 20 faces — cheap, faceted, on-style
    if (sy) g.scale(1, sy, 1);
    g.translate(x, y, z); bucket.push(g);
  };
  const clump = (bucket, x, y, z, r) => {                // a 4-lobe leafy crown
    lobe(bucket, r, x, y, z, 0.78);
    lobe(bucket, r * 0.72, x - r * 0.72, y - r * 0.20, z + r * 0.30, 0.80);
    lobe(bucket, r * 0.68, x + r * 0.74, y - r * 0.14, z - r * 0.26, 0.82);
    lobe(bucket, r * 0.60, x + r * 0.10, y + r * 0.52, z + r * 0.10, 0.74);
  };
  const frond = (bucket, x, y, z, r, h, rz) => {         // an upright fern blade
    const g = new THREE.ConeGeometry(r, h, 5);
    if (rz) g.rotateZ(rz);
    g.translate(x, y, z); bucket.push(g);
  };

  // (a) the WARM BACK WALL — the light coming down through the roof glass,
  //     read from a dark doorway. This is the mesh the beat brightens.
  quad(gWarm, HW * 2 + 0.1, CE - FL + 0.1, V.x, (FL + CE) / 2, zBack, 0, 0);
  // (b) the RECESS SHELL — side walls, ceiling, floor + the koi pool. Deep dark
  //     green so the opening reads as depth, never as a lit sticker on a wall.
  quad(gDeep, zGlass - zBack, CE - FL, V.x - HW, (FL + CE) / 2, (zGlass + zBack) / 2, 0, Math.PI / 2);
  quad(gDeep, zGlass - zBack, CE - FL, V.x + HW, (FL + CE) / 2, (zGlass + zBack) / 2, 0, -Math.PI / 2);
  { const g = new THREE.PlaneGeometry(HW * 2, zGlass - zBack); g.rotateX(Math.PI / 2);
    g.translate(V.x, CE, (zGlass + zBack) / 2); gDeep.push(g); }                    // ceiling
  { const g = new THREE.PlaneGeometry(HW * 2, zGlass - zBack); g.rotateX(-Math.PI / 2);
    g.translate(V.x, FL, (zGlass + zBack) / 2); gDeep.push(g); }                    // floor / the koi pool
  // (c) TWO SCALY TRUNKS rising through it — the strongest read in the ref
  slab(gDeep, 0.15, CE - FL - 0.1, 0.15, V.x - 0.62, (FL + CE) / 2, zBack + 1.05);
  slab(gDeep, 0.13, CE - FL - 0.3, 0.13, V.x + 0.55, (FL + CE) / 2 - 0.1, zBack + 0.72);
  // (d) THREE DEPTHS of planting. Far layer dark (gDeep), mid + near a shade
  //     lighter (gMid), all leaving the warm centre-back visible between them.
  // NOTE the composition constraint: the 122 awning band (y 1.70..2.55) hangs
  // OUTSIDE this opening, so from the garden the doorway is a WIDE SHORT SLOT,
  // roughly y 0.54..1.70. Every read below is packed into that band — canopy
  // fronds hang DOWN into it rather than sitting above it, where the awning
  // would have hidden them.
  // FAR layer (deep dark) — the mass at the back, silhouetted on the warm wall
  clump(gDeep, V.x - 0.74, 1.02, zBack + 0.55, 0.42);
  clump(gDeep, V.x + 0.70, 0.96, zBack + 0.62, 0.38);
  clump(gDeep, V.x + 0.02, 1.34, zBack + 0.34, 0.34);
  clump(gDeep, V.x - 0.30, 1.46, zBack + 0.95, 0.30);
  frond(gDeep, V.x - 0.38, 0.82, zBack + 0.92, 0.24, 0.56, 0.28);
  frond(gDeep, V.x + 0.40, 0.79, zBack + 0.86, 0.22, 0.50, -0.24);
  // CANOPY across the top of the visible slot — without this the upper half of
  // the doorway is bare wall and the room reads bottom-heavy (shot, fixed).
  clump(gDeep, V.x - 0.86, 1.58, zBack + 0.78, 0.40);
  clump(gDeep, V.x + 0.84, 1.62, zBack + 0.88, 0.42);
  clump(gDeep, V.x + 0.06, 1.66, zBack + 1.14, 0.36);
  // MID layer (a shade lighter) — the body of the room, and the near fringe
  clump(gMid, V.x - 0.88, 0.94, zBack + 1.74, 0.46);
  clump(gMid, V.x + 0.90, 0.90, zBack + 1.86, 0.44);
  clump(gMid, V.x - 0.14, 0.80, zBack + 1.44, 0.32);
  frond(gMid, V.x + 0.48, 0.88, zBack + 1.32, 0.26, 0.62, -0.30);
  frond(gMid, V.x - 0.58, 0.85, zBack + 1.58, 0.24, 0.58, 0.32);
  clump(gMid, V.x - 1.00, 1.24, zBack + 2.40, 0.30);             // nearest fringe, just behind the glass
  clump(gMid, V.x + 1.02, 1.30, zBack + 2.46, 0.28);
  clump(gMid, V.x - 0.46, 1.50, zBack + 1.96, 0.34);             // mid canopy, hanging into the slot
  clump(gMid, V.x + 0.52, 1.54, zBack + 2.08, 0.32);
  // LOW FOREGROUND at the glass — fills the bare floor wedge and frames the
  // look-in, leaving just enough dark water showing for the koi to read.
  clump(gMid, V.x - 0.95, 0.72, zBack + 2.74, 0.38);
  clump(gMid, V.x + 0.98, 0.70, zBack + 2.80, 0.36);
  frond(gMid, V.x + 0.30, 0.78, zBack + 2.40, 0.22, 0.52, -0.22);
  // NOTE: the centre-front stays DELIBERATELY OPEN — a clump here closed the
  // last gap to the floor and the koi pool stopped reading entirely.
  // (e) KOI — three bright flecks on the near-black water
  for (const [x, z] of [[-0.22, 1.72], [0.20, 2.02], [-0.06, 2.32], [0.34, 2.56]])
    quad(gWarm, 0.28, 0.14, V.x + x, FL + 0.075, zBack + z, 0, 0);
  // (f) THE DOORS THEMSELVES — SHUT, and GLASS. depthWrite off so the planting
  //     behind reads through; renderOrder puts it after the interior.
  quad(gGlass, HW * 2 + 0.06, CE - FL + 0.04, V.x, (FL + CE) / 2, zGlass, 0, 0);

  const merge = g => BufferGeometryUtils.mergeBufferGeometries(g.map(x => x.index ? x.toNonIndexed() : x), false);
  const doorGrp = new THREE.Group(); doorGrp.name = 'lp-cons-doors';
  const warmMat = bmat(0xf5e2ad);                       // warm interior light (its own material — the beat rides it)
  const glowMesh = new THREE.Mesh(merge(gWarm), warmMat);
  const deepMesh = new THREE.Mesh(merge(gDeep), toon(C.palmDark2, { mat: { side: THREE.DoubleSide } }));
  const midMesh  = new THREE.Mesh(merge(gMid),  toon(C.palmDark,  { mat: { side: THREE.DoubleSide } }));
  const glassMesh = new THREE.Mesh(merge(gGlass),
    bmat(C.glass, { transparent: true, opacity: 0.26, depthWrite: false }));
  glassMesh.renderOrder = 3;
  for (const m of [glowMesh, deepMesh, midMesh, glassMesh]) {
    m.userData.noFogCull = true;                        // WE manage .visible (the 095 law)
    doorGrp.add(m);
  }
  scene.add(doorGrp);

  // ---- (4) THE BEAT — lean in and look (no walkable interior, no opening) --
  const sess = { active: false, t: 0, u: 0, wob: 0, held: false };
  const PEEK_HOLD = (() => { try { return /[?&]peek=1/.test(location.search); } catch (e) { return false; } })();
  const _eye = new THREE.Vector3(), _aim = new THREE.Vector3();
  // The eye is FIXED on the garden axis ~4 m out from the door plane, not
  // parented to the player: wherever you press E inside the radius you get the
  // same well-composed framed look-in, and the shot is deterministic. The mayor
  // is HIDDEN for the duration (the scope precedent is a mounted eye the player
  // stands behind; here the player can be anywhere in the radius, so a visible
  // chibi would sit square in the doorway). Nothing about him moves — he is
  // simply not drawn while you are looking through the glass.
  // Framed on the SLOT (see the composition note above), level — an aim that
  // tilts down drops the doorway and pulls the awning sign into the top of frame.
  const EYE_Z = zS + 2.45, EYE_Y = 1.12;
  const AIM_Z = zBack + 1.35, AIM_Y = 1.12;

  // The 091 affordance system auto-glints this anchor; we add none.
  addInteraction({
    x: V.x, z: V.z + 4, r: 2.6, label: 'peek inside',
    onUse() {
      if (sess.active) { sess.active = false; return; }   // a second press steps back
      sess.active = true; sess.t = 0; sess.wob = 0;
      toast('warm palm air drifts out', 'ferns, orchids, a koi pool — free admission');
      const v = calm() ? 0.035 : 0.06;
      chime(659.25, 0, v);          // E5
      chime(987.77, 0.16, v * 0.8); // B5 — a soft open fifth, door-chime warm
    },
  });

  // ---- (5) per frame: ONE gate, then the doors + mist + burble ----------
  let mistT = 0, burbleT = 0, dbgOnce = false, lastD = 999, puffT = 0, shown = true;
  registerUpdate((dt, t, pl) => {
    if (!dbgOnce) {                                     // main.js assigns window.__hd wholesale at load
      dbgOnce = true;
      try {
        window.__hd = window.__hd || {};
        window.__hd.conservatory = () => ({ d: lastD, mist: lastD < MIST_R, burble: burbleTarget,
                                            actx: !!actx, peek: sess.active, glow: +sess.u.toFixed(3) });
      } catch (e) { /* sandboxed window — the pack still runs */ }
      if (PEEK_HOLD) { sess.active = true; sess.held = true; }   // shot determinism: fire and HOLD
    }

    // -- THE DOORS. The glow ramp and the group's visibility are the only
    // things that must run outside the 60 m gate (a session can only start
    // inside it, but the ease-back must finish even if the player walks off).
    const dxD = pl.x - V.x, dzD = pl.z - zS, dD2 = dxD * dxD + dzD * dzD;
    const vis = dD2 < 70 * 70;
    if (vis !== shown) { shown = vis; doorGrp.visible = vis; }
    if (sess.active && !sess.held) {                    // release: move, deflect, or time out
      sess.t += dt;
      if (sess.t > 6 || joy.len > 0.25 ||
          keys.has('w') || keys.has('a') || keys.has('s') || keys.has('d') ||
          keys.has('arrowup') || keys.has('arrowdown') || keys.has('arrowleft') || keys.has('arrowright')) sess.active = false;
    }
    const uT = sess.active ? 1 : 0;
    if (sess.u !== uT) {
      sess.u = Math.abs(sess.u - uT) < 0.004 ? uT : lerp(sess.u, uT, 1 - Math.exp(-6 * dt));
      // the interior WARMS UP: pale daylight -> lit-from-within (the payload)
      warmMat.color.setRGB(0.88 + 0.12 * sess.u, 0.84 + 0.12 * sess.u, 0.62 + 0.22 * sess.u);
    }
    state.idleBusy = sess.active;                       // 087: no idle charm while the doors own the camera
    { const hide = sess.u > 0.5;                        // the mayor is not drawn while you look through the glass
      if (mayor.visible === hide) mayor.visible = !hide; }
    { const B = baseFov(), tgt = sess.active ? 34 : B;   // 096: never a literal 50
      if (sess.active || Math.abs(camera.fov - B) > 0.05) {
        camera.fov = lerp(camera.fov, tgt, 1 - Math.exp(-9 * dt));
        if (!sess.active && Math.abs(camera.fov - B) < 0.05) camera.fov = B;
        camera.updateProjectionMatrix();
      } }
    if (sess.u > 0.001) {                               // override the chase cam (packs own it here)
      sess.wob += dt;
      const u = sess.u;
      const cx = pl.x - Math.sin(cam.yaw) * cam.dist, cz = pl.z - Math.cos(cam.yaw) * cam.dist;
      _eye.set(lerp(cx, V.x, u), lerp(pl.y + 1.5 + cam.dist * 0.34, EYE_Y, u), lerp(cz, EYE_Z, u));
      _aim.set(lerp(pl.x, V.x, u), lerp(pl.y + 1.1, AIM_Y, u), lerp(pl.z, AIM_Z, u));
      camera.position.copy(_eye); camera.lookAt(_aim);
      camera.rotateY(Math.sin(sess.wob * 1.1) * 0.0025);
      camera.rotateX(Math.sin(sess.wob * 0.8 + 0.7) * 0.0025);
    }
    if (sess.active) {                                  // warm air spilling out over the threshold
      puffT -= dt;
      if (puffT <= 0) {
        puffT = calm() ? 0.46 : 0.26;
        const n = calm() ? 1 : 2;
        for (let i = 0; i < n; i++) {
          // hugging the JAMBS, small and low: the session eye sits 2.45 m off the
          // door, so a big central puff blooms straight over the lens (shot, fixed)
          const ox = (Math.random() < 0.5 ? -1 : 1) * (0.80 + Math.random() * 0.34);
          DUST.spawn(V.x + ox, 0.60 + Math.random() * 0.55, zS + 0.22,
            ox * 0.13, 0.30 + Math.random() * 0.22, 0.34 + Math.random() * 0.30,
            1.00, 0.94, 0.78,                            // warm palm air
            1.2 + Math.random() * 0.6, 0.95 + Math.random() * 0.55, 0.08, 0.55);
        }
      }
    }

    const dx = pl.x - FX_X, dz = pl.z - FX_Z, d2 = dx * dx + dz * dz;
    if (d2 >= MIST_R2) {                                // FAR: park the bed once, zero work
      lastD = Math.sqrt(d2);
      if (burbleG && burbleTarget !== 0) { burbleG.gain.setTargetAtTime(0, actx.currentTime, 0.4); burbleTarget = 0; }
      mistT = 0; burbleT = 0;
      return;
    }
    const d = Math.sqrt(d2);
    lastD = d;
    const cm = calm();

    // -- MIST: soft white-teal puffs off the plume top (shared DUST pool) --
    mistT -= dt;
    if (mistT <= 0) {
      mistT = MIST_EVERY;
      const n = cm ? 2 : 3 + (Math.random() * 3 | 0);    // 3-5 puffs, halved when calm
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * 0.5;
        const sp = 0.16 + Math.random() * 0.22;          // slow outward drift
        DUST.spawn(
          FX_X + Math.cos(a) * r, 1.8 + Math.random() * 0.8, FX_Z + Math.sin(a) * r,
          Math.cos(a) * sp, 0.30 + Math.random() * 0.28, Math.sin(a) * sp,
          0.80, 0.95, 0.92,                              // white-teal
          1.5 + Math.random() * 0.9,                     // life
          2.6 + Math.random() * 1.2,                     // size
          0.10, 0.55);                                   // barely-falling, draggy = it hangs
      }
    }

    // -- BURBLE: build on the first in-range tick, then ride 1-(d/18) ------
    burbleT -= dt;
    if (burbleT <= 0) {
      burbleT = 0.35;
      const near = d < BURBLE_R;
      if (near && !burbleG) buildBurble(getAudioCtx());  // never on the hot path
      if (burbleG && actx) {
        const u = near ? 1 - d / BURBLE_R : 0;
        burbleTarget = u * (cm ? BURBLE_CAP_CALM : BURBLE_CAP);
        burbleG.gain.setTargetAtTime(burbleTarget, actx.currentTime, 0.35);
      }
    }
  });
});
