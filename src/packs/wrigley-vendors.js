// =====================================================================
//  PACK: wrigley-vendors — the Wrigleyville street-FESTIVAL pack.
//  The commerce + foot-traffic layer on the closed game-day streets:
//    * PEANUT VENDOR on a soapbox — Addison south sidewalk just below the
//      marquee corner; a synth "pea-nuts!" honk on a timer (distance-mixed,
//      hushed after a Cubs win) + free peanuts (E) that scatter shell decals.
//    * PROGRAM HAWKER — Sheffield/Addison corner, program waving overhead.
//    * TICKET QUEUE — 5 fans lined at the marquee-gate booth; the front one
//      buys in and re-joins the back with a fresh jersey (recycled rigs).
//    * FAN STREAMS — two 3-chibi streams walking the corridors to the gates.
//    * SPLASH-PAD LIFE — Gallagher Way jets fire on a ~20 s cycle.
//
//  Only-my-file rules: one import line in packs/index.js; ALL setup inside
//  onWorldReady. makeNPC for the FRAMEWORK-culled cast (peanut vendor, hawker,
//  2×3 fan walkers = 8) so we honor the ≤8 makeNPC budget; the 5 queue fans are
//  raw createChibi rigs I fully own (recycle/teleport/re-palette) parented to
//  wrigleyRoot (cell swap culls them) with one container-level distance cull.
//  Freestanding props -> wrigleyRoot; worn/held props -> the chibi. Own
//  mulberry32 seed (19141060) — never the world rng. 100% synth audio via
//  getAudioCtx, every call guarded on actx + gated on the wrigleyville cell,
//  every gain ramped.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, registerUpdate, addInteraction, toast, makeNPC, state,
         getAudioCtx, createChibi, tintChibiLimb } from '../framework.js';
import { toon, bmat, mulberry32, clamp, lerpAngle, game } from '../core.js';
import { activeCell } from '../cells.js';
import { wrigleyRoot } from '../wrigley/index.js';
import { collide } from '../props.js';
import { clarkX } from '../data/wrigleyville.js';

// ------------------------------ scratch (no per-frame alloc) -----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(),
      _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1),
      _e = new THREE.Euler();

// own rng — seed 19141060, isolated from the world rng (determinism)
const _r = mulberry32(19141060);
const rnd = () => _r();
const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

// ------------------------------ landmarks ------------------------------
const PV = { x: -286, z: -410 };                    // peanut soapbox (Addison, below the marquee)
const HK = { x: -192, z: -389 };                    // program hawker (Sheffield/Addison corner)
const BOOTH = { x: -272.5, z: -412.5 };             // marquee-gate ticket booth
const GATE = { x: -277.6, z: -416.9 };              // marquee gate (queue exits here)
const SPLASH = { x: clarkX(-470) + 20, z: -470 };   // Gallagher Way splash pad center (village.js)

const SKINS = [0xe0a878, 0xc98a5a, 0x8a5a3c, 0xf0c8a0, 0xb07a50, 0x6e4632];
const HAIRS = [0x2a2018, 0x1a140e, 0x4a3a24, 0x8a8580, 0x241a12, 0x5a4a3a];
const pick = arr => arr[(rnd() * arr.length) | 0];

// ============================ canvas textures ==========================
function ticketSignTex() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#0e2a52'; g.fillRect(0, 0, 128, 64);
  g.strokeStyle = '#f4c542'; g.lineWidth = 4; g.strokeRect(4, 4, 120, 56);
  g.fillStyle = '#ffe08a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 26px "Trebuchet MS",sans-serif'; g.fillText('TICKETS', 64, 30);
  g.font = '700 13px "Trebuchet MS",sans-serif'; g.fillStyle = '#bcd6ff';
  g.fillText('game day', 64, 50);
  return new THREE.CanvasTexture(cv);
}
function programTex() {                              // white scorebook the hawker waves
  const cv = document.createElement('canvas'); cv.width = 48; cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#fbfaf4'; g.fillRect(0, 0, 48, 64);
  g.strokeStyle = '#c8c2b0'; g.lineWidth = 3; g.strokeRect(2, 2, 44, 60);
  g.fillStyle = '#0e4c92'; g.font = '800 13px "Trebuchet MS",sans-serif'; g.textAlign = 'center';
  g.fillText('OFFICIAL', 24, 18); g.fillText('PROGRAM', 24, 32);
  g.fillStyle = '#c0392b'; g.fillText('25¢', 24, 52);
  return new THREE.CanvasTexture(cv);
}

// =====================================================================
onWorldReady(player => {
  state.peanutBags = state.peanutBags || 0;

  // ================================================================== //
  //  synth "pea-nuts!" call — two-note descending honk (G4 -> E4 triangle,
  //  quick decay) + a breathy noise tap. Guarded + ramped; the CALLER gates
  //  on the wrigleyville cell. Volume by distance to the vendor: full <=25 m
  //  -> 0 >=60 m, and quieter (0.4x) once the player wanders past 40 m.
  // ================================================================== //
  function peanutCall(px, pz) {
    const A = getAudioCtx(); if (!A.actx) return;
    const d = Math.hypot(px - PV.x, pz - PV.z);
    let v = d <= 25 ? 1 : d >= 60 ? 0 : 1 - (d - 25) / 35;
    if (d > 40) v *= 0.4;
    if (v <= 0.01) return;
    const t = A.actx.currentTime;
    for (const [f, dt] of [[392.0, 0], [329.63, 0.16]]) {         // G4 -> E4
      const o = A.actx.createOscillator(), g = A.actx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      const ts = t + dt;
      g.gain.setValueAtTime(0.0001, ts);
      g.gain.linearRampToValueAtTime(0.16 * v, ts + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ts + 0.22);
      o.connect(g); g.connect(A.sfxBus); o.start(ts); o.stop(ts + 0.26);
    }
    const src = A.actx.createBufferSource(); src.buffer = A.noiseBuf;
    const bp = A.actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 0.7;
    const ng = A.actx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.linearRampToValueAtTime(0.05 * v, t + 0.03);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    src.connect(bp); bp.connect(ng); ng.connect(A.sfxBus); src.start(t, 0, 0.2);
  }

  // ================================================================== //
  //  1) PEANUT VENDOR on a soapbox
  // ================================================================== //
  // wooden crate (soapbox) — collide r0.6
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.9), toon(0x8a5a2e));
  crate.position.set(PV.x, 0.25, PV.z); wrigleyRoot.add(crate);
  { const lid = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.08, 0.98), toon(0x6f4522));
    lid.position.set(PV.x, 0.52, PV.z); wrigleyRoot.add(lid); }
  collide(PV.x, PV.z, 0.6);
  // a stack of bagged peanuts beside the crate (one InstancedMesh)
  {
    const bagGeo = new THREE.BoxGeometry(0.16, 0.2, 0.11);
    const stack = new THREE.InstancedMesh(bagGeo, toon(0xdcc09a), 6);
    const spots = [[-0.18, 0.1, -0.2], [0, 0.1, -0.2], [0.18, 0.1, -0.2],
                   [-0.09, 0.1, 0], [0.09, 0.1, 0], [0, 0.28, -0.1]];
    spots.forEach((o, i) => {
      _e.set(0, (rnd() - 0.5) * 0.6, 0); _q.setFromEuler(_e);
      _m.compose(_v.set(PV.x + 0.72 + o[0], o[1], PV.z + 0.35 + o[2]), _q, _s.set(1, 1, 1));
      stack.setMatrixAt(i, _m);
    });
    stack.instanceMatrix.needsUpdate = true; wrigleyRoot.add(stack);
  }
  // the vendor — stands ON the crate (lift the whole group)
  const peanut = makeNPC({ x: PV.x, z: PV.z, ry: 0, wander: 0, name: 'peanut vendor',
    palette: { suit: 0xb2352c, pants: 0x2a2e36, skin: pick(SKINS), hair: pick(HAIRS), face: true },   // setFace at runtime → keep live eyes
    lines: ["pea-NUTS! get ya pea-nuts!", "shells on the ground, that's the good stuff, ope",
      "red hots down the block — I got the pea-nuts", "on the house today, mayor"] });
  peanut.group.position.y = 0.45;
  { const apron = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.7, 0.12), toon(0xe6dcc2));
    apron.position.set(0, 1.0, 0.42); peanut.group.add(apron); }
  { const bag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.11), toon(0xdcc09a));
    bag.position.set(0, -0.02, 0.02); peanut.parts.handR.add(bag); }

  // ---- shell decals: instanced flat tan boxes, capped at 24 (reuse oldest) ----
  const SHELL_CAP = 24;
  const shells = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.03, 0.09), toon(0xd8c49c, {}), SHELL_CAP);
  shells.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < SHELL_CAP; i++) { _m.compose(_v.set(0, -20, 0), _q.identity(), _s.set(0, 0, 0)); shells.setMatrixAt(i, _m); }
  shells.instanceMatrix.needsUpdate = true; wrigleyRoot.add(shells);
  let shellIdx = 0;
  function dropShells(px, pz) {
    const n = 5 + ((rnd() * 2) | 0);                 // 5-6
    for (let k = 0; k < n; k++) {
      const a = rnd() * Math.PI * 2, r = 0.2 + rnd() * 0.55;
      _e.set(0, rnd() * Math.PI * 2, 0); _q.setFromEuler(_e);
      _m.compose(_v.set(px + Math.cos(a) * r, 0.03, pz + Math.sin(a) * r), _q, _s.set(1, 1, 1));
      shells.setMatrixAt(shellIdx % SHELL_CAP, _m); shellIdx++;
    }
    shells.instanceMatrix.needsUpdate = true;
  }
  addInteraction({ x: PV.x, z: PV.z, r: 2.0, label: 'a bag of peanuts — on the house', onUse: pl => {
    peanut.setFace('happy'); peanut.say('there ya go — mind the shells', 2.2);
    toast('peanuts!', 'shells everywhere. perfect.');
    state.peanutBags = (state.peanutBags || 0) + 1;
    dropShells(pl.x, pl.z);
  } });

  // ================================================================== //
  //  2) PROGRAM HAWKER — Sheffield/Addison corner, waving a program
  // ================================================================== //
  const hawker = makeNPC({ x: HK.x, z: HK.z, ry: Math.PI, wander: 0, name: 'program hawker',
    palette: { suit: 0x2f6bb0, pants: 0x2a2e36, skin: pick(SKINS), hair: pick(HAIRS) },
    lines: ['programs! scorecards!', "can't tell your Hendricks from your Hottovy without one, ope",
      'get ya program — line-ups right here', 'two bits, help the cause'] });
  // held + waved so BOTH faces are seen: a lone DoubleSide plane reads mirrored
  // from behind (PITFALLS). Merge front + π-rotated back into one FrontSide mesh
  // so each face is upright (stays one mesh -> +0 draws).
  { const pg = new THREE.PlaneGeometry(0.28, 0.38);
    const prog = new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([pg, pg.clone().rotateY(Math.PI)], false),
      bmat(0xffffff, { map: programTex() }));
    prog.position.set(0, -0.02, 0.02); hawker.parts.handR.add(prog); }

  // ================================================================== //
  //  3) TICKET QUEUE — 5 recycled fan rigs at the booth (own culled root)
  // ================================================================== //
  // ticket booth kiosk
  { const bod = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.7, 1.0), toon(0x9a3b34));
    bod.position.set(BOOTH.x, 0.85, BOOTH.z); wrigleyRoot.add(bod);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 1.4), toon(0x2a2e36));
    roof.position.set(BOOTH.x, 1.78, BOOTH.z); wrigleyRoot.add(roof);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55),
      bmat(0xffffff, { map: ticketSignTex(), side: THREE.DoubleSide }));
    sign.position.set(BOOTH.x, 1.2, BOOTH.z + 0.52); wrigleyRoot.add(sign);
    collide(BOOTH.x, BOOTH.z, 0.9); }

  // three preset jerseys (fresh, uncached materials -> safe to reassign per mesh)
  const QPAL = [
    { suit: 0x2a52a8, pants: 0x8f8a80 },             // Cubs royal top, grey slacks
    { suit: 0xb5322c, pants: 0x2a2e36 },             // red pullover, charcoal
    { suit: 0xe9e4d6, pants: 0x39506a },             // cream, denim blue
  ];
  QPAL.forEach(p => { p.suitMat = toon(p.suit, {}); p.pantMat = toon(p.pants, {}); });
  function applyPal(parts, p) {
    parts.body.material = p.suitMat;                                  // body is still its own plain mesh
    tintChibiLimb(parts.armL, 'arm', p.suit); tintChibiLimb(parts.armR, 'arm', p.suit);   // recolor only the sleeve, not the baked skin hand
    tintChibiLimb(parts.legL, 'leg', p.pants); tintChibiLimb(parts.legR, 'leg', p.pants); // recolor only the pants, not the baked shoe
  }
  const slotXZ = i => [-275.0 - i * 1.1, -411.6];    // slot 0 = front (nearest booth), west along the sidewalk

  const qRoot = new THREE.Group(); wrigleyRoot.add(qRoot);
  const queue = [];
  for (let i = 0; i < 5; i++) {
    const p = QPAL[i % QPAL.length];
    const { group, parts } = createChibi({ suit: p.suit, pants: p.pants, skin: pick(SKINS), hair: pick(HAIRS), scale: 0.74 });
    const [x, z] = slotXZ(i);
    group.position.set(x, 0, z); group.rotation.y = faceTo(x, z, BOOTH.x, BOOTH.z);
    qRoot.add(group);
    queue.push({ group, parts, phase: rnd() * Math.PI * 2 });
  }
  let leaver = null, leaveT = 0, qTimer = 9;
  function updQueue(dt, t) {
    qRoot.visible = Math.hypot(player.x - BOOTH.x, player.z - BOOTH.z) < 150;
    if (!qRoot.visible) return;
    qTimer -= dt;
    if (!leaver && qTimer <= 0) { qTimer = 9; leaver = queue.shift(); leaveT = 0; }
    const k = 1 - Math.exp(-5 * dt);
    for (let i = 0; i < queue.length; i++) {
      const r = queue[i], [tx, tz] = slotXZ(i);
      r.group.position.x += (tx - r.group.position.x) * k;
      r.group.position.z += (tz - r.group.position.z) * k;
      r.group.rotation.y = lerpAngle(r.group.rotation.y, faceTo(r.group.position.x, r.group.position.z, BOOTH.x, BOOTH.z), k);
      r.parts.body.scale.y = 1.12 + Math.sin(t * 2 + r.phase) * 0.012;
    }
    if (leaver) {
      leaveT += dt;
      const dx = GATE.x - leaver.group.position.x, dz = GATE.z - leaver.group.position.z, d = Math.hypot(dx, dz);
      if (d > 1e-3) {
        const step = Math.min(d, 1.4 * dt);
        leaver.group.position.x += dx / d * step; leaver.group.position.z += dz / d * step;
        leaver.group.rotation.y = lerpAngle(leaver.group.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-8 * dt));
      }
      if (d < 0.6 || leaveT > 4) {                   // bought in -> re-join the back with a fresh jersey
        applyPal(leaver.parts, QPAL[(rnd() * QPAL.length) | 0]);
        const [bx, bz] = slotXZ(queue.length);
        leaver.group.position.set(bx, 0, bz);
        leaver.group.rotation.y = faceTo(bx, bz, BOOTH.x, BOOTH.z);
        queue.push(leaver); leaver = null;
      }
    }
  }

  // ================================================================== //
  //  4) FAN STREAMS — two 3-chibi corridor streams (makeNPC, hand-lerped)
  // ================================================================== //
  function makePath(pts, v, respawn) {
    const segs = []; let L = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
      segs.push({ a, len, tx: dx / len, tz: dz / len }); L += len;
    }
    return { segs, L, v, respawn };
  }
  function posAt(path, d) {
    let rem = d;
    for (const s of path.segs) {
      if (rem <= s.len) return { x: s.a.x + s.tx * rem, z: s.a.z + s.tz * rem, hy: Math.atan2(s.tx, s.tz) };
      rem -= s.len;
    }
    const s = path.segs[path.segs.length - 1];
    return { x: s.a.x + s.tx * s.len, z: s.a.z + s.tz * s.len, hy: Math.atan2(s.tx, s.tz) };
  }
  function makeStream(pts, palettes) {
    const path = makePath(pts, 1.25, 25);
    const startD = [0, 2.6, 5.2];
    const npcs = palettes.map((pal, i) => {
      const n = makeNPC({ x: pts[0].x, z: pts[0].z, ry: 0, wander: 0, moverLod: true, name: 'fan', palette: pal,
        lines: ['go chubs go!', 'ope — this way to the gate', "hurry, it's almost first pitch"] });
      n.group.position.x = pts[0].x; n.group.position.z = pts[0].z;
      return n;
    });
    return { path, npcs, d: startD.slice(), startD, state: 'walk', timer: 0 };
  }
  const jerseyPals = () => Array.from({ length: 3 }, () => ({
    suit: [0x2a52a8, 0xb5322c, 0xe8e6df, 0x3a7a4a, 0xf0a02a][(rnd() * 5) | 0],
    pants: [0x2a2e36, 0x39506a, 0x8f8a80][(rnd() * 3) | 0],
    skin: pick(SKINS), hair: pick(HAIRS),
  }));
  const streamA = makeStream(                        // Addison east barricade -> marquee corner -> gate
    [{ x: -126, z: -401 }, { x: -280, z: -401 }, { x: -278, z: -413 }], jerseyPals());
  const streamB = makeStream(                        // Waveland west barricade -> Sheffield -> Bleacher Gate
    [{ x: -348, z: -562 }, { x: -184, z: -562 }, { x: -190, z: -552 }], jerseyPals());
  // moverLod: the framework owns group/twin visibility (it swaps in a 1-draw twin
  // past 90m). We drive PRESENCE via n._lodActive (walk=on, wait/done=off) and keep
  // updating the live position each frame — even while hidden — so the mid-range
  // twin can re-sync to it every cull tick.
  const hideFan = n => { n._lodActive = false; n.group.visible = false; if (n.twin) n.twin.visible = false; };  // present=off + crisp hide now
  function updStream(gr, dt, t) {
    if (gr.state === 'wait') {
      for (const n of gr.npcs) hideFan(n);
      gr.timer -= dt; if (gr.timer <= 0) { gr.state = 'walk'; for (let i = 0; i < gr.d.length; i++) gr.d[i] = gr.startD[i]; }
      return;
    }
    let allDone = true;
    for (let i = 0; i < gr.npcs.length; i++) {
      gr.d[i] += gr.path.v * dt;
      const n = gr.npcs[i];
      if (gr.d[i] < gr.path.L) {
        allDone = false; n._lodActive = true;                              // walking: framework owns the near/mid swap
        const p = posAt(gr.path, gr.d[i]);
        n.group.position.x = p.x; n.group.position.z = p.z;
        n.group.position.y = Math.abs(Math.sin(t * 4 + i * 1.3)) * 0.05;   // tiny bob (not the limb rig)
        n.group.rotation.y = lerpAngle(n.group.rotation.y, p.hy, 1 - Math.exp(-8 * dt));
      } else hideFan(n);
    }
    if (allDone) { gr.state = 'wait'; gr.timer = gr.path.respawn; }
  }

  // ================================================================== //
  //  5) SPLASH-PAD LIFE — 6 water columns fire on a ~20 s cycle
  // ================================================================== //
  const JETS = [];
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; JETS.push([SPLASH.x + Math.cos(a) * 0.9, SPLASH.z + Math.sin(a) * 0.9]); }
  const columns = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.09, 1, 8),
    bmat(0xbfe8f2, { transparent: true, opacity: 0.55, depthWrite: false }), 6);
  columns.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  function writeColumns(h) {
    for (let i = 0; i < 6; i++) {
      _m.compose(_v.set(JETS[i][0], 0.05 + h / 2, JETS[i][1]), _q.identity(), _s.set(1, h, 1));
      columns.setMatrixAt(i, _m);
    }
    columns.instanceMatrix.needsUpdate = true;
  }
  writeColumns(0); wrigleyRoot.add(columns);
  const GROW = 0.5, HOLD = 2.0, SHRINK = 0.5, PEAK = 1.6;
  let splashPhase = 'idle', splashT = 20, splashE = 0;
  function updSplash(dt) {
    if (splashPhase === 'idle') {
      splashT -= dt;
      if (splashT <= 0) { splashPhase = 'grow'; splashE = 0; state.splashPulse = game.tNow; }
      return;
    }
    splashE += dt;
    let h;
    if (splashPhase === 'grow') { h = PEAK * Math.min(1, splashE / GROW); if (splashE >= GROW) { splashPhase = 'hold'; splashE = 0; h = PEAK; } }
    else if (splashPhase === 'hold') { h = PEAK; if (splashE >= HOLD) { splashPhase = 'shrink'; splashE = 0; } }
    else { h = PEAK * (1 - Math.min(1, splashE / SHRINK)); if (splashE >= SHRINK) { splashPhase = 'idle'; splashT = 20; h = 0; } }
    writeColumns(h);
  }

  // ---------------------------- per-frame ---------------------------- //
  let peanutT = 14, prevWins = state.cubsWinsSeen || 0, winStamp = -999;
  registerUpdate((dt, t) => {
    if (dt < 0) dt = 0;
    if (activeCell() !== 'wrigleyville') return;     // lakefront hears/moves nothing

    // static poses (re-applied AFTER the framework NPC pass)
    peanut.parts.armR.rotation.x = -0.55; peanut.parts.armR.rotation.z = -0.15; peanut.parts.armL.rotation.x = -0.25;
    hawker.parts.armR.rotation.x = -2.55 + Math.sin(t * 3) * 0.28; hawker.parts.armR.rotation.z = -0.15;
    hawker.parts.armL.rotation.x = -0.2;

    // "pea-nuts!" honk on a ~14 s timer, hushed for 60 s after a Cubs win
    if (state.cubsWinsSeen !== prevWins) { prevWins = state.cubsWinsSeen; winStamp = game.tNow; }
    peanutT -= dt;
    if (peanutT <= 0) {
      peanutT = 14;
      if (!(winStamp > 0 && game.tNow - winStamp < 60)) { peanutCall(player.x, player.z); peanut.say('pea-NUTS!', 1.4); }
    }

    updQueue(dt, t);
    updStream(streamA, dt, t);
    updStream(streamB, dt, t);
    updSplash(dt);
  });
});
