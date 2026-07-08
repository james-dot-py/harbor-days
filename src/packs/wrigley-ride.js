// THE RED LINE RIDE — Belmont ⇄ Addison (Wrigleyville). The train interior
// is its own tiny cell ('redline-car'): the cell system provides the pocket
// clamp/walkability, and the ride is two cell swaps hidden behind fades.
// Boarding pylon at the Belmont underpass mouth; return from the platform.
import * as THREE from 'three';
import { scene, toon, bmat, mulberry32, pointsMat } from '../core.js';
import { onWorldReady, registerUpdate, addInteraction, makeNPC, toast, state, getAudioCtx, screenFx } from '../framework.js';
import { registerCell, setActiveCell, getCell, activeCell } from '../cells.js';
import { camCtl } from '../main.js';
import { cam } from '../input.js';
import { SPAWN_W } from '../data/wrigleyville.js';
import { buildAddisonTrains, updateTrains, forceDwell, forceApproach } from '../wrigley/train.js';

const R = mulberry32(90210 + 1947);
const CAR = { x: -250, z: -650, y: 0.25 };          // pocket set, outside all clamps

// ------------------------------ audio ----------------------------------
function chime() {
  const A = getAudioCtx(); if (!A.actx) return;
  const t0 = A.actx.currentTime;
  [[659, 0], [523, 0.28]].forEach(([f, dt]) => {
    const o = A.actx.createOscillator(), g = A.actx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0 + dt);
    g.gain.exponentialRampToValueAtTime(0.22, t0 + dt + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.5);
    o.connect(g); g.connect(A.sfxBus); o.start(t0 + dt); o.stop(t0 + dt + 0.55);
  });
}
let rumble = null;
function rumbleOn() {
  const A = getAudioCtx(); if (!A.actx || rumble) return;
  const src = A.actx.createBufferSource(); src.buffer = A.noiseBuf; src.loop = true;
  const lp = A.actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 140;
  const g = A.actx.createGain(); g.gain.value = 0.0001;
  src.connect(lp); lp.connect(g); g.connect(A.sfxBus); src.start();
  g.gain.exponentialRampToValueAtTime(0.3, A.actx.currentTime + 0.8);
  rumble = { src, g };
}
function rumbleOff() {
  const A = getAudioCtx(); if (!A.actx || !rumble) return;
  const r = rumble; rumble = null;
  r.g.gain.exponentialRampToValueAtTime(0.0001, A.actx.currentTime + 0.6);
  setTimeout(() => { try { r.src.stop(); } catch (e) {} }, 800);
}
function clack() {
  const A = getAudioCtx(); if (!A.actx) return;
  const src = A.actx.createBufferSource(); src.buffer = A.noiseBuf;
  const bp = A.actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 2;
  const g = A.actx.createGain();
  const t0 = A.actx.currentTime;
  g.gain.setValueAtTime(0.14, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
  src.connect(bp); bp.connect(g); g.connect(A.sfxBus); src.start(t0, R() * 2, 0.1);
}
function organSting() {
  const A = getAudioCtx(); if (!A.actx) return;
  const t0 = A.actx.currentTime;
  // "take me out" opening arpeggio flavor: C E G E C, warm organ voices
  [[262, 0], [330, 0.18], [392, 0.36], [330, 0.54], [523, 0.72]].forEach(([f, dt]) => {
    for (const [type, mul, amp] of [['triangle', 1, 0.16], ['square', 2, 0.03]]) {
      const o = A.actx.createOscillator(), g = A.actx.createGain();
      o.type = type; o.frequency.value = f * mul;
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(amp, t0 + dt + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.85);
      o.connect(g); g.connect(A.musicBus); o.start(t0 + dt); o.stop(t0 + dt + 0.9);
    }
  });
}
function say(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92; u.pitch = 0.9; speechSynthesis.speak(u);
  } catch (e) {}
}

// --------------------------- the car pocket ----------------------------
let winLights = [], carRoot = null;
function buildCar() {
  carRoot = new THREE.Group(); carRoot.name = 'cell-redline-car';
  const g = carRoot, C = CAR;
  const add = m => { g.add(m); return m; };
  const box = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(c)); m.position.set(x, y, z); return add(m); };
  box(3.4, 0.3, 13.5, 0x6d6a63, C.x, C.y - 0.15, C.z);            // floor
  box(3.6, 0.3, 13.7, 0x8f8b84, C.x, 2.75, C.z);                  // ceiling
  box(0.14, 1.05, 13.5, 0xc8c4bc, C.x - 1.72, 0.75, C.z);         // west wainscot
  box(0.14, 1.05, 13.5, 0xc8c4bc, C.x + 1.72, 0.75, C.z);         // east wainscot
  box(0.14, 0.7, 13.5, 0xb8442f, C.x - 1.72, 2.55, C.z);          // red trim bands
  box(0.14, 0.7, 13.5, 0xb8442f, C.x + 1.72, 2.55, C.z);
  box(3.4, 3, 0.16, 0xc8c4bc, C.x, 1.5, C.z - 6.7);               // ends
  box(3.4, 3, 0.16, 0xc8c4bc, C.x, 1.5, C.z + 6.7);
  // window bands — translucent dusk glass so the city lights stream past
  for (const sx of [-1.7, 1.7]) {
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 13.3),
      bmat(0x241f33, { transparent: true, opacity: 0.55 }));
    glass.position.set(C.x + sx, 1.85, C.z); add(glass);
  }
  // longitudinal benches + poles + ads
  box(0.6, 0.45, 10.5, 0x9a4a3a, C.x - 1.35, 0.45, C.z);
  box(0.6, 0.45, 10.5, 0x9a4a3a, C.x + 1.35, 0.45, C.z);
  const poleG = new THREE.CylinderGeometry(0.035, 0.035, 2.6, 6);
  const poles = new THREE.InstancedMesh(poleG, toon(0xd8d5cf), 4);
  { const M = new THREE.Matrix4(); [-4, -1.3, 1.3, 4].forEach((oz, i) => { M.setPosition(C.x, 1.45, C.z + oz); poles.setMatrixAt(i, M); }); }
  poles.instanceMatrix.needsUpdate = true; add(poles);
  { // ad card: WRIGLEY'S SPEARMINT — THE PERFECT GUM (the namesake wink)
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 48;
    const c2 = cv.getContext('2d');
    c2.fillStyle = '#e9f2e4'; c2.fillRect(0, 0, 256, 48);
    c2.fillStyle = '#1e6b3a'; c2.font = '700 20px Georgia,serif'; c2.textAlign = 'center';
    c2.fillText("WRIGLEY'S SPEARMINT", 128, 22);
    c2.font = '700 13px Georgia,serif'; c2.fillText('— THE PERFECT GUM —', 128, 40);
    const ad = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.36), bmat(0xffffff, { map: new THREE.CanvasTexture(cv) }));
    ad.position.set(C.x - 1.62, 2.52, C.z + 2.5); ad.rotation.y = Math.PI / 2; add(ad);
  }
  // scrolling city lights outside both window bands (animated in update)
  for (const side of [-1, 1]) {
    const n = 26, gp = new Float32Array(n * 3), aC = new Float32Array(n * 3), aS = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      gp.set([C.x + side * (3.6 + R() * 3), 1.4 + R() * 1.6, C.z - 9 + R() * 18], i * 3);
      const warm = 0.75 + R() * 0.25;
      aC.set([warm, warm * 0.82, 0.55], i * 3); aS[i] = 2.2 + R() * 2.6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(gp, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(aC, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(aS, 1));
    const pts = new THREE.Points(geo, pointsMat()); add(pts);
    winLights.push(pts);
  }
  // interior glow
  { const n = 3, gp = new Float32Array(n * 3), aC = new Float32Array(n * 3), aS = new Float32Array(n);
    for (let i = 0; i < n; i++) { gp.set([C.x, 2.6, C.z - 4 + i * 4], i * 3); aC.set([1, 0.95, 0.85], i * 3); aS[i] = 3.4; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(gp, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(aC, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(aS, 1));
    add(new THREE.Points(geo, pointsMat()));
  }
  // minimap while riding: a dark card with the Red Line
  scene.add(carRoot);                             // its own cell root (cells.js toggles it)
  const mmcv = document.createElement('canvas'); mmcv.width = 304; mmcv.height = 412;
  { const c2 = mmcv.getContext('2d');
    c2.fillStyle = '#2b2833'; c2.fillRect(0, 0, 304, 412);
    c2.strokeStyle = '#c0271f'; c2.lineWidth = 10; c2.lineCap = 'round';
    c2.beginPath(); c2.moveTo(152, 330); c2.lineTo(152, 80); c2.stroke();
    c2.fillStyle = '#f4efe6';
    for (const [y, n] of [[330, 'BELMONT'], [205, 'SHERIDAN'], [80, 'ADDISON']]) {
      c2.beginPath(); c2.arc(152, y, 8, 0, 7); c2.fill();
      c2.font = '700 16px "Trebuchet MS",sans-serif'; c2.textAlign = 'left';
      c2.fillText(n, 170, y + 6);
    }
  }
  return {
    id: 'redline-car', root: carRoot,
    walkable: (x, z) => x > CAR.x - 1.6 && x < CAR.x + 1.6 && z > CAR.z - 6.4 && z < CAR.z + 6.4,
    surfaceY: () => CAR.y,
    clamp: { xMin: CAR.x - 1.55, xMax: CAR.x + 1.55, zMin: CAR.z - 6.3, zMax: CAR.z + 6.3 },
    spawn: { x: CAR.x, z: CAR.z + 2 },
    minimapBase: mmcv, minimapBounds: { x0: 0, z0: 0, w: 304, h: 412, cw: 304, ch: 412 },
  };
}

// ------------------------- boarding pylon (Belmont) --------------------
function buildPylon() {
  const grp = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.4, 0.22), toon(0x3a3a42));
  post.position.y = 1.7; grp.add(post);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#1f1e24'; g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#c0271f'; g.fillRect(0, 0, 256, 34);
  g.fillStyle = '#f4efe6'; g.textAlign = 'center';
  g.font = '800 22px "Trebuchet MS",sans-serif'; g.fillText('RED LINE', 128, 25);
  g.font = '700 20px "Trebuchet MS",sans-serif';
  g.fillText('ADDISON →', 128, 66); g.fillText('WRIGLEY FIELD', 128, 94);
  g.font = '600 13px "Trebuchet MS",sans-serif'; g.fillText('game day service', 128, 116);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.85), bmat(0xffffff, { map: new THREE.CanvasTexture(cv), side: THREE.DoubleSide }));
  sign.position.set(0, 2.7, 0); sign.rotation.y = Math.PI / 2; grp.add(sign);
  grp.position.set(15.4, 0, 107.2);           // south of the underpass mouth, clear of the CPD board
  const lf = getCell('lakefront');            // parent into the lakefront cell root
  lf.root.add(grp);                           // so it hides with the rest of the cell
  return grp;
}

// ------------------------------ the ride -------------------------------
const seq = [];                                     // [{at, fn}] one-shot timeline
let seqT = -1;
function runSeq(steps) { seq.length = 0; steps.forEach(s => seq.push(s)); seqT = 0; }

function rideTo(dest, player) {
  if (seqT >= 0) return;                            // already riding
  state.redlineRides = (state.redlineRides || 0) + 1;
  const spot = dest === 'wrigleyville'
    ? { cell: 'wrigleyville', x: SPAWN_W.x + 1.4, z: SPAWN_W.z, y: SPAWN_W.y, yaw: 2.95, name: 'This is Addison.' }   // east of the canopy post row
    : { cell: 'lakefront', x: 20, z: 105, y: 0, yaw: 1.35, name: 'This is Belmont.' };
  const fade = ms => screenFx.filter('brightness(0)', ms);
  chime();
  // boarding AT Addison: a real train pulls in first; the fade covers boarding
  const preRoll = dest === 'lakefront' ? 2.6 : 0;
  if (preRoll) forceApproach();
  const P = preRoll;                              // every step waits for the pull-in
  runSeq([
    { at: P + 0.05, fn: () => fade(1500) },
    { at: P + 0.7, fn: () => {
      setActiveCell('redline-car');
      player.x = CAR.x; player.z = CAR.z + 2; player.y = CAR.y; player.vx = player.vz = 0;
      // look down the car's length, slightly angled at the west windows —
      // any cross-car camera lands outside the 3.4 m body
      cam.yaw = Math.PI - 0.28; cam.pitch = 0.06; cam.dist = 4.5; camCtl.snap = true;
      rumbleOn();
      toast('RED LINE — HOWARD BOUND', dest === 'wrigleyville' ? 'next stop: Addison' : 'next stop: Belmont');
    } },
    { at: P + 2.2, fn: () => rider.say(dest === 'wrigleyville' ? "ope — my stop too. go cubs, go!" : 'ope — heading back to the lake?') },
    { at: P + 6.2, fn: () => say(spot.name) },
    { at: P + 7.2, fn: () => chime() },
    { at: P + 8.0, fn: () => fade(1500) },
    { at: P + 8.7, fn: () => {
      setActiveCell(spot.cell);
      player.x = spot.x; player.z = spot.z; player.y = spot.y; player.vx = player.vz = 0;
      cam.yaw = spot.yaw; cam.pitch = 0.12; cam.dist = 6; camCtl.snap = true;
      rumbleOff();
      if (dest === 'wrigleyville') forceDwell(4);  // "that was my train" — it departs behind you
    } },
    { at: P + 9.4, fn: () => {
      if (dest === 'wrigleyville') {
        organSting();
        if (!state.wrigleyVisited) {
          state.wrigleyVisited = true;
          toast('WRIGLEYVILLE', 'the Friendly Confines — game day');
        } else toast('WRIGLEYVILLE', 'Addison station');
      } else toast('BELMONT', 'back at the lakefront');
      seqT = -1;
    } },
  ]);
}

let rider = null;
onWorldReady((player) => {
  registerCell(buildCar());
  buildPylon();
  buildAddisonTrains();
  // the rider NPC lives in the car (framework NPC culling hides it elsewhere)
  rider = makeNPC({
    x: CAR.x + 1.15, z: CAR.z - 3.4, ry: -Math.PI / 2, name: 'red line regular',
    palette: { suit: 0x2a4a7a, pants: 0x3a3a42, skin: 0xb98a62, hair: 0x4a3626 },
    lines: ['ope', 'this car always smells like popcorn', 'the L is the best seat in the city'],
  });
  addInteraction({
    x: 16, z: 106, r: 3.6,
    label: 'ride the Red Line — Addison / Wrigley Field',
    onUse: p => rideTo('wrigleyville', p),
  });
  addInteraction({
    x: SPAWN_W.x, z: SPAWN_W.z - 3, r: 4.5,
    label: 'ride the Red Line — Belmont / lakefront',
    onUse: p => rideTo('lakefront', p),
  });
  registerUpdate((dt, t, p) => {
    if (seqT >= 0) {
      seqT += dt;
      for (const s of seq) if (!s.done && seqT >= s.at) { s.done = true; s.fn(); }
    }
    if (activeCell() === 'wrigleyville') updateTrains(dt, p, { chime, clack });
    if (activeCell() === 'redline-car') {
      // window lights stream past + car sway + clacks
      for (const pts of winLights) {
        const a = pts.geometry.attributes.position;
        for (let i = 0; i < a.count; i++) {
          let z = a.getZ(i) + dt * 14;
          if (z > CAR.z + 10) z -= 20;
          a.setZ(i, z);
        }
        a.needsUpdate = true;
      }
      if (carRoot) carRoot.rotation.z = Math.sin(t * 1.7) * 0.004;
      if (((t * 1.8) | 0) !== (((t - dt) * 1.8) | 0)) clack();
    }
  });
});
