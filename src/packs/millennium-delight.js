// =====================================================================
//  PACK: millennium-delight — the LIVE delight layer of Millennium Park
//  (task 047).  Four moments, the ones that are most THIS park — the
//  Bean's fingerprint economy, the pavilion that is always almost-
//  rehearsing, the wedding album everyone in Chicago has a page of, and
//  the working train station humming under the lawn:
//
//   1. BEAN POLISHER  — a CPD worker on a little rolling scaffold squeegees
//      Cloud Gate's underbelly, grumbling about fingerprints (locals' gag).
//   2. WEDDING SHOOT  — a posed couple + a photographer NPC who circles for
//      angles ("one more — pretend you like each other") and waves you out
//      of frame when you wander into the shot (the one place tourists ARE
//      the local color).
//   3. PRITZKER SOUNDCHECK — a conductor on the stage podium counts in and
//      conducts a warm synthesized string swell (Grant Park Music Festival
//      rehearsals, the city's free secret): 100% WebAudio, routed via
//      musicBus, ducked with distance, on a long local-seed cycle. The
//      builder LEFT the stands + timpani for exactly this (pritzker.js).
//   4. STATION RUMBLE — the Millennium Station grate by Wrigley Square hums
//      with warm air and lets out a muffled departure chime every ~70 s;
//      the pigeons startle off it and resettle.
//
//  Only-my-file rules (AUTOPILOT doctrine): ONE import line in
//  packs/index.js; ALL setup inside onWorldReady; imports anything, edits
//  nothing shared.  Free-standing visuals → millenniumRoot (cell-culled,
//  added AFTER buildMillennium's merge so they stay live).  Characters →
//  makeNPC (framework culling + bump lines + LOD twins).  addInteraction
//  is NOT used (none of these moments is a player ACTION — they are ambient
//  life).  Own local mulberry32 seed — never the world rng.  Audio via
//  getAudioCtx, null-guarded + gated on the millennium cell + distance,
//  gains ramped; the soundcheck's scheduling is asserted through
//  window.__hd.mp so verification never has to trust silence.
//
//  Z-SIGN NOTE (this is the first POSITIVE-z cell — task 025 lost an hour to
//  a flipped cull at negative z): every distance check below is d = hypot(
//  player.x - X, player.z - Z) with Z read straight from GEOGRAPHY.md /
//  src/data/millennium.js — no `pl.z ± z0` shortcuts.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, registerUpdate, makeNPC, getAudioCtx, journalSection } from '../framework.js';
import { toon, bmat, mulberry32, clamp, lerpAngle } from '../core.js';
import { activeCell } from '../cells.js';
import { millenniumRoot } from '../millennium/index.js';
import * as M from '../data/millennium.js';

// ---- local deterministic rng (NEVER the shared world rng) -------------
const _r = mulberry32(0x4d504c54);              // 'MPLT'
const rnd = (a = 0, b = 1) => a + (b - a) * _r();
// scratch — no per-frame allocation
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _m4 = new THREE.Matrix4();
const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

const BEAN = { x: M.CLOUD_GATE_M.bean.cx, z: M.CLOUD_GATE_M.bean.cz };   // (86.8, 797.7)
const STAGE = { x: (M.PRITZKER_M.stage.x0 + M.PRITZKER_M.stage.x1) / 2, z: M.PRITZKER_M.stage.z1 - 6 };  // pit centre ≈ (146.5, 752)
const GRATE = M.WRIGLEY_SQ_M.grate;             // { x: 72, z: 709 }

onWorldReady(player => {
  // instrumentation handle for the headless verifier (main.js sets window.__hd
  // before worldReady; we only ADD a namespace, never clobber it).
  const MP = {
    soundcheck: { attempts: 0, plays: 0, lastAt: 0, mode: 'idle' },
    station: { chimes: 0 },
    activeCell,
  };
  if (typeof window !== 'undefined') { window.__hd = window.__hd || {}; window.__hd.mp = MP; }

  // ============================ 1. BEAN POLISHER =======================
  // A rolling scaffold parked at the Bean's SW underbelly; the worker stands
  // on the deck and works a squeegee-on-a-pole up into the shell. SW so a
  // camera from the south-west frames worker + pole + silver shell together.
  const POL = { x: 82, z: 803.5, deckY: 0.4 };
  POL.ry = faceTo(POL.x, POL.z, BEAN.x, BEAN.z);            // face the shell
  // per-constant-color vertex paint → several prims share ONE vcol toon mesh
  // (062 DRAW-FOLD: the scaffold was 6 one-off draws in every Bean frustum,
  // the squeegee 3 more — mp-bean-f3 measured over the 480 budget gate).
  const _vc = new THREE.Color();
  const vcol = (geo, hex) => {
    _vc.set(hex); const n = geo.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = _vc.r; arr[i * 3 + 1] = _vc.g; arr[i * 3 + 2] = _vc.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3)); return geo;
  };
  {
    // rolling scaffold (cell-culled statics added after the merge → stay live;
    // 5 boxes + bucket merged to ONE vertex-colored toon mesh, 062)
    const g = new THREE.Group(); g.position.set(POL.x, 0, POL.z); g.rotation.y = POL.ry;
    const sg = [];
    const sbox = (w, h, d, x, y, z, hex) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); sg.push(vcol(b, hex)); };
    sbox(1.7, 0.12, 1.1, 0, POL.deckY, 0, 0xc9a13a);                 // deck
    sbox(1.5, 0.26, 0.95, 0, 0.2, 0, 0x8a7524);                      // skirt
    sbox(1.7, 0.06, 0.06, 0, 1.0, -0.5, 0x8a7524);                   // back rail
    for (const dx of [-0.8, 0.8]) sbox(0.06, 0.62, 0.06, dx, 0.72, -0.5, 0x8a7524);  // rail posts
    { const bk = new THREE.CylinderGeometry(0.13, 0.11, 0.2, 10);    // suds bucket
      bk.translate(0.6, POL.deckY + 0.12, 0.32); sg.push(vcol(bk, 0xf1c40f)); }
    g.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(sg, false),
      toon(0xffffff, { mat: { vertexColors: true } })));
    // four casters, one instanced mesh (1 draw)
    const casters = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 10), toon(0x2b2b30), 4);
    let ci = 0; for (const dx of [-0.72, 0.72]) for (const dz of [-0.45, 0.45]) { _q.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)); _m4.compose(_v.set(dx, 0.11, dz), _q, _s); casters.setMatrixAt(ci++, _m4); }
    casters.instanceMatrix.needsUpdate = true; g.add(casters);
    millenniumRoot.add(g);
  }
  const polisher = makeNPC({
    x: POL.x, z: POL.z, ry: POL.ry, wander: 0, staticLod: true, name: 'bean polisher', scale: 1.0,
    palette: { suit: 0x2f6b3f, pants: 0x2a2e26, skin: 0xc98a5a, hair: 0x2a2018, face: true },  // CPD forest-green work shirt
    lines: [
      'fingerprints, fingerprints — all day, fingerprints',
      "everybody's gotta touch it. nobody's gotta clean it",
      'ope — mind the bucket',
      "she'll be smudged again by lunch, but that's the job",
      'a hundred selfies a minute and I get the smears',
    ],
  });
  polisher.group.position.y = POL.deckY;                    // stand ON the scaffold deck
  if (polisher.twin) polisher.twin.position.y = POL.deckY;
  polisher.setFace('neutral');
  // squeegee on a pole — gripped mid-shaft by the raised hand and reaching UP
  // and forward (local +z, toward the shell he faces). Group-attached so the
  // pole angle is stable while the arm scrubs (bean-visitors prop precedent).
  {
    const sq = new THREE.Group();
    const qg = [];                                                   // pole+bar+blade → ONE vcol mesh (062)
    { const pl = new THREE.CylinderGeometry(0.03, 0.03, 2.5, 6); pl.translate(0, 1.15, 0); qg.push(vcol(pl, 0x9aa0a6)); }
    { const br = new THREE.BoxGeometry(0.5, 0.09, 0.08); br.translate(0, 2.34, 0); qg.push(vcol(br, 0x2b2f36)); }
    { const bl = new THREE.BoxGeometry(0.5, 0.05, 0.03); bl.translate(0, 2.28, 0.06); qg.push(vcol(bl, 0x14161a)); }
    sq.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(qg, false),
      toon(0xffffff, { mat: { vertexColors: true } })));
    sq.position.set(0.34, 1.28, 0.36); sq.rotation.set(-0.72, 0, 0.1);      // reach up-and-forward to the underbelly
    polisher.group.add(sq);
  }

  // ============================ 2. WEDDING SHOOT =======================
  // A posed couple with the Bean behind them (north), facing the photographer
  // (south) so the player approaching from the south sees their faces + the
  // shell. The photographer CIRCLES on a shallow arc south of the couple.
  const CPL = { x: 88.9, z: 814 };
  const bride = makeNPC({
    x: CPL.x - 0.7, z: CPL.z, ry: 0, wander: 0, staticLod: true, name: 'bride', scale: 1.0,
    palette: { suit: 0xf1ece2, pants: 0xf1ece2, skin: 0xe8b58c, hair: 0x3a2a1c, face: true },
    lines: ["it's our SPOT — we had our first date right here", 'ope — is my veil straight?', 'shiniest wedding album in Illinois'],
  });
  bride.setFace('happy');
  const groom = makeNPC({
    x: CPL.x + 0.7, z: CPL.z + 0.2, ry: 0, wander: 0, staticLod: true, name: 'groom', scale: 1.05,
    palette: { suit: 0x24242c, pants: 0x1c1c22, skin: 0x8a5a3c, hair: 0x181008, face: true },
    lines: ['she picked the Bean, I picked the deep dish after', 'sixty photos and counting, bud', 'go cubs — ope, sorry, wedding voice'],
  });
  groom.setFace('happy');
  // arms: link them at the inside — bride's right + groom's left toward each other
  const poseCouple = () => {
    bride.parts.armR.rotation.x = -0.5; bride.parts.armR.rotation.z = -0.55;
    bride.parts.armL.rotation.x = -0.15;
    groom.parts.armL.rotation.x = -0.5; groom.parts.armL.rotation.z = 0.55;
    groom.parts.armR.rotation.x = -0.15;
  };
  const photog = makeNPC({
    x: CPL.x, z: CPL.z + 5, ry: Math.PI, wander: 0, moverLod: true, name: 'photographer', scale: 1.0,
    palette: { suit: 0x394b57, pants: 0x24272e, skin: 0xc98a5a, hair: 0x241a12, face: true },
    lines: ['one more — pretend you like each other!', 'big smiles, chin down, gorgeous', 'hold it — the light off the Bean is perfect', "okay now a candid — don't look candid"],
  });
  {   // a boxy camera held up to the eye. GROUP-attached (not handR): the arms
    // hold a fixed raised pose, and the group tracks the photographer's live
    // position+facing, so the camera stays at the face aimed at the couple.
    // (A large offset on the tiny handR wrist node flings the prop — bean-
    // visitors attaches props to the group for exactly this reason.)
    const cam = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.14), toon(0x14141a)); cam.add(body);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 10), toon(0x2b2b30)); lens.rotation.x = Math.PI / 2; lens.position.z = 0.12; cam.add(lens);
    cam.position.set(0.02, 1.92, 0.5); photog.group.add(cam);
  }
  const wed = { t: 0, inFrame: false };                      // photographer orbit + in-frame gag state
  const CPLC = { x: (bride.group.position.x + groom.group.position.x) / 2, z: 814 };  // couple centre

  // ============================ 3. PRITZKER SOUNDCHECK =================
  // Conductor on a podium at the stage front (raised fir floor top = y0.6),
  // facing the orchestra (north). Counts in, conducts a warm string swell,
  // cuts it off. The audio is the moment; the conductor is the visible cue.
  const COND = { x: STAGE.x, z: 754, floorY: 0.6, podH: 0.28 };
  { const pod = new THREE.Mesh(new THREE.BoxGeometry(0.9, COND.podH, 0.9), toon(0x2a2e36));
    pod.position.set(COND.x, COND.floorY + COND.podH / 2, COND.z); millenniumRoot.add(pod); }
  const conductor = makeNPC({
    x: COND.x, z: COND.z, ry: Math.PI, wander: 0, staticLod: true, name: 'conductor', scale: 1.0,
    palette: { suit: 0x1c1c22, pants: 0x14141a, skin: 0xe8b58c, hair: 0x3a3a40, face: true },  // tux
    lines: ['from the top — and watch me, not the phone', 'again. and this time, together', 'that entrance was a rumor. give me the note'],
  });
  const CY = COND.floorY + COND.podH;                        // conductor foot height (on the podium)
  conductor.group.position.y = CY; if (conductor.twin) conductor.twin.position.y = CY;
  { const baton = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.42, 6), bmat(0xf4efe6));
    baton.position.set(0, 0.24, 0); baton.rotation.x = -0.4; conductor.parts.handR.add(baton); }

  // ---- soundcheck audio (persistent bus on musicBus; distance-ducked) ----
  let scBus = null;
  function ensureBus(A) { if (!scBus) { scBus = A.actx.createGain(); scBus.gain.value = 0; scBus.connect(A.musicBus); } return scBus; }
  function stringVoice(A, bus, f, t, dur, amp) {            // a slow bowed swell — detuned triangle pair
    for (const det of [-5, 5]) {
      const o = A.actx.createOscillator(), g = A.actx.createGain();
      o.type = 'triangle'; o.frequency.value = f; o.detune.value = det;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(amp, t + dur * 0.4);
      g.gain.setValueAtTime(amp, t + dur * 0.62);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.1);
    }
  }
  function tick(A, bus, t, f) {                              // the conductor's count-in click (a dry pluck)
    const o = A.actx.createOscillator(), g = A.actx.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.2);
  }
  // one "deep cut" phrase: a two-beat count-in, then a slow minor-ish
  // progression of bowed swells. Everything is scheduled at trigger time
  // (organSting precedent); the persistent scBus gain is ducked per-frame.
  const PHRASE = [[57, 60, 64], [53, 57, 60], [55, 58, 62], [50, 57, 60]];   // Am–F–Gsus–Dm-ish voicings (midi)
  function playPhrase() {
    MP.soundcheck.attempts++;
    const A = getAudioCtx(); if (!A.actx) return;
    const bus = ensureBus(A), mf = A.mf, t0 = A.actx.currentTime + 0.08;
    tick(A, bus, t0, mf(72)); tick(A, bus, t0 + 0.52, mf(72));               // "two — three — four —"
    let ct = t0 + 1.15;
    for (const chord of PHRASE) {
      for (const m of chord) { stringVoice(A, bus, mf(m), ct, 4.4, 0.05); stringVoice(A, bus, mf(m - 12), ct, 4.4, 0.03); }
      ct += 3.9;
    }
    MP.soundcheck.plays++; MP.soundcheck.lastAt = t0;
  }
  MP.soundcheck.force = playPhrase;                          // headless verifier can force one

  // soundcheck cycle (game-time state machine; audio is fire-and-forget)
  const SC = { mode: 'idle', modeT: 3.0, phraseArm: false };   // first phrase ~3 s after cell entry
  const COUNTIN = 1.15, PLAYING = 14.6;

  // journal wink (audio-only moments read better with a note)
  journalSection('mp-soundcheck', 'The Pavilion', () => `
    <p>The Pritzker is <b>always almost rehearsing</b> — Grant Park Music
    Festival soundchecks are the city's free secret. Stand near the bowl at
    dusk and you'll catch the strings tuning into something. Deep cuts only.</p>`);

  // ============================ 4. STATION RUMBLE ======================
  // The grate already exists (streets.js, a dark iron plate at 72,709). This
  // adds the LIVE layer: pigeons that peck the grate and startle off it on a
  // muffled departure chime, plus a warm-air hum you hear as you pass.
  function pigeonGeo() {
    const body = new THREE.SphereGeometry(0.17, 8, 6); body.scale(1.0, 0.9, 1.45); body.translate(0, 0.2, 0);
    const head = new THREE.SphereGeometry(0.1, 8, 6); head.translate(0, 0.36, 0.16);
    const beak = new THREE.ConeGeometry(0.03, 0.1, 6); beak.rotateX(Math.PI / 2); beak.translate(0, 0.35, 0.27);
    const tail = new THREE.BoxGeometry(0.16, 0.04, 0.2); tail.translate(0, 0.18, -0.22);
    return BufferGeometryUtils.mergeBufferGeometries([body, head, beak, tail], false);
  }
  const NPIG = 6;
  const flock = new THREE.InstancedMesh(pigeonGeo(), toon(0x8a8d92), NPIG);
  flock.frustumCulled = false; millenniumRoot.add(flock);
  const pigeons = [];
  for (let i = 0; i < NPIG; i++) {
    const a = rnd(0, Math.PI * 2), r = rnd(0.3, 1.7);
    const hx = GRATE.x + Math.sin(a) * r, hz = GRATE.z + Math.cos(a) * r;
    pigeons.push({ hx, hz, ph: rnd(0, 6.28), ry: rnd(-Math.PI, Math.PI), hop: rnd(0, 4), startle: 0, fdx: Math.sin(a), fdz: Math.cos(a) });
  }
  function writeFlock(t) {
    for (let i = 0; i < NPIG; i++) {
      const p = pigeons[i];
      let x = p.hx, z = p.hz, y = 0, roll = 0, pitch = 0;
      if (p.startle > 0) {                                   // fly up-and-out, then settle back home
        const u = 1 - clamp(p.startle / 2.2, 0, 1);          // 0→1 over the startle
        const lift = Math.sin(u * Math.PI);                  // up then down
        y = lift * 1.15;
        x += p.fdx * lift * 1.6; z += p.fdz * lift * 1.6;
        roll = Math.sin(t * 26 + p.ph) * 0.5 * lift;         // wing flap wobble
        pitch = -0.5 * lift;
      } else {                                               // idle: a slow peck-bob + tiny sway
        const bob = Math.sin(t * 3 + p.ph);
        y = 0.015 + Math.max(0, bob) * 0.02;
        pitch = Math.max(0, -bob) * 0.35;                    // dip the head to peck
      }
      _q.setFromEuler(new THREE.Euler(pitch, p.ry, roll, 'YXZ'));
      _m4.compose(_v.set(x, y, z), _q, _s);
      flock.setMatrixAt(i, _m4);
    }
    flock.instanceMatrix.needsUpdate = true;
  }
  writeFlock(0);

  // ---- station audio: a persistent hum loop (distance-gated) + the chime ---
  let hum = null;
  function ensureHum(A) {
    if (hum) return hum;
    const src = A.actx.createBufferSource(); src.buffer = A.noiseBuf; src.loop = true;
    const lp = A.actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 110; lp.Q.value = 0.6;
    const g = A.actx.createGain(); g.gain.value = 0;
    src.connect(lp); lp.connect(g); g.connect(A.sfxBus); src.start();
    hum = { g }; return hum;
  }
  function departureChime() {
    MP.station.chimes++;
    const A = getAudioCtx(); if (!A.actx) return;
    const t = A.actx.currentTime;
    // a MUFFLED two-tone (lowpassed so it reads as "below the pavement")
    const lp = A.actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.4;
    lp.connect(A.sfxBus);
    [[622, 0], [466, 0.34]].forEach(([f, dt]) => {
      const o = A.actx.createOscillator(), g = A.actx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.linearRampToValueAtTime(0.09, t + dt + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.8);
      o.connect(g); g.connect(lp); o.start(t + dt); o.stop(t + dt + 0.85);
    });
    // a low warm-air whoosh under it
    const src = A.actx.createBufferSource(); src.buffer = A.noiseBuf;
    const bp = A.actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 240; bp.Q.value = 0.5;
    const ng = A.actx.createGain(); ng.gain.setValueAtTime(0.0001, t);
    ng.gain.linearRampToValueAtTime(0.06, t + 0.15); ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    src.connect(bp); bp.connect(ng); ng.connect(A.sfxBus); src.start(t, 0, 1.2);
    // startle the flock
    for (const p of pigeons) p.startle = 2.2 + rnd(0, 0.5);
  }
  MP.station.forceChime = departureChime;                   // headless verifier can force one
  const ST = { chimeT: 8 };                                  // first chime ~8 s in

  // ================================ update =============================
  registerUpdate((dt, t, pl) => {
    if (dt < 0) dt = 0;
    const inCell = activeCell() === 'millennium';

    // ---- 1. polisher: scrub the shell (arm + squeegee sway) ----
    if (polisher.group.visible) {
      const scrub = Math.sin(t * 3.4);
      polisher.parts.armR.rotation.x = -1.75 + scrub * 0.22;
      polisher.parts.armR.rotation.z = -0.28 + scrub * 0.12;
      polisher.parts.armL.rotation.x = -0.35;
      polisher.parts.body.rotation.x = 0.05;
    }

    // ---- 2. wedding: couple pose + photographer orbit + in-frame gag ----
    if (bride.group.visible) poseCouple();
    if (photog.group.visible || (photog.twin && photog.twin.visible)) {
      wed.t += dt;
      // circle for angles at a constant ~4.5 m shooting distance, arcing within
      // the SOUTH-WEST sector (cos(a)>0 → south of the couple; sin(a)<0 → west
      // of it) so it reads as "getting the angle" and stays clear of the
      // over-the-shoulder camera line to the east.
      const a = -0.55 + Math.sin(wed.t * 0.4) * 0.3, D = 4.5;
      const px = CPLC.x + Math.sin(a) * D, pz = CPLC.z + Math.cos(a) * D;
      photog.group.position.x = px; photog.group.position.z = pz;
      const fy = faceTo(px, pz, CPLC.x, CPLC.z);
      photog.group.rotation.y = lerpAngle(photog.group.rotation.y, fy, 1 - Math.exp(-6 * dt));
      if (photog.group.visible) {                            // crouch to the eyepiece
        photog.parts.armL.rotation.x = -1.9; photog.parts.armL.rotation.z = 0.2;
        photog.parts.armR.rotation.x = -1.9; photog.parts.armR.rotation.z = -0.2;
        photog.parts.body.rotation.x = 0.12;
      }
      // "ope — one sec, bud": the player has wandered into the shot (between
      // the photographer and the couple, on the photographer's side).
      const dCouple = Math.hypot(pl.x - CPLC.x, pl.z - CPLC.z);
      const inShot = inCell && pl.z > CPLC.z + 0.5 && dCouple < 3.4;
      if (inShot && !wed.inFrame) { wed.inFrame = true; photog.say('ope — one sec, bud!', 2.4); }
      else if (!inShot && wed.inFrame && dCouple > 4.6) { wed.inFrame = false; photog.say("perfect — you're in the album now", 2.4); }
    }

    // ---- 3. soundcheck: cycle + conductor gesture + distance duck ----
    if (inCell) {
      SC.modeT -= dt;
      if (SC.mode === 'idle') { if (SC.modeT <= 0) { playPhrase(); SC.mode = 'countin'; SC.modeT = COUNTIN; } }
      else if (SC.mode === 'countin') { if (SC.modeT <= 0) { SC.mode = 'playing'; SC.modeT = PLAYING; } }
      else { if (SC.modeT <= 0) { SC.mode = 'idle'; SC.modeT = 32 + rnd(0, 16); if (Math.hypot(pl.x - STAGE.x, pl.z - STAGE.z) < 12) conductor.say('again — from the top!', 2.2); } }
      MP.soundcheck.mode = SC.mode;
      // duck the soundcheck bus by distance to the pit (audible ~within 60 m)
      if (scBus) {
        const d = Math.hypot(pl.x - STAGE.x, pl.z - STAGE.z);
        const g = clamp(1 - d / 60, 0, 1);
        scBus.gain.setTargetAtTime(g * 0.85, getAudioCtx().actx.currentTime, 0.25);
      }
    } else if (scBus) { scBus.gain.setTargetAtTime(0, getAudioCtx().actx.currentTime, 0.2); }
    // conductor arms: raised + beating while a phrase runs, relaxed otherwise
    if (conductor.group.visible) {
      const p = conductor.parts;
      if (SC.mode === 'idle') {
        p.armR.rotation.x = lerpAngle(p.armR.rotation.x, -0.5, 1 - Math.exp(-4 * dt)); p.armR.rotation.z = 0;
        p.armL.rotation.x = lerpAngle(p.armL.rotation.x, -0.3, 1 - Math.exp(-4 * dt)); p.armL.rotation.z = 0;
      } else {
        const beat = t * 3.3;
        p.armR.rotation.x = -1.55 + Math.sin(beat) * 0.5;
        p.armR.rotation.z = 0.28 + Math.sin(beat * 0.5) * 0.22;
        p.armL.rotation.x = -1.2 + Math.sin(beat + 1.0) * 0.38;
        p.armL.rotation.z = -0.22;
        p.body.rotation.x = 0.04 * Math.sin(beat * 0.5);
      }
    }

    // ---- 4. station: hum gain + chime timer + flock ----
    if (inCell) {
      const A = getAudioCtx();
      if (A.actx) {
        const h = ensureHum(A);
        const d = Math.hypot(pl.x - GRATE.x, pl.z - GRATE.z);
        const g = clamp(1 - d / 15, 0, 1) * 0.09;            // warm hum, audible ~within 15 m
        h.g.gain.setTargetAtTime(g, A.actx.currentTime, 0.3);
      }
      ST.chimeT -= dt;
      if (ST.chimeT <= 0) { departureChime(); ST.chimeT = 62 + rnd(0, 18); }   // muffled departure ~every 70 s
    } else if (hum) { hum.g.gain.setTargetAtTime(0, getAudioCtx().actx.currentTime, 0.2); }
    for (const p of pigeons) if (p.startle > 0) p.startle = Math.max(0, p.startle - dt);
    writeFlock(t);
  });
});
