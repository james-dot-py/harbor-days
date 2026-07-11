// THE RED LINE RIDE — Belmont ⇄ Addison (Wrigleyville). The train interior
// is its own tiny cell ('redline-car'): the cell system provides the pocket
// clamp/walkability, and the ride is two cell swaps hidden behind fades.
// Boarding pylon at the Belmont underpass mouth; return from the platform.
import * as THREE from 'three';
import { scene, toon, bmat, mulberry32, pointsMat } from '../core.js';
import { drawQR, KOFI_URL } from '../qr.js';
import { onWorldReady, registerUpdate, addInteraction, makeNPC, toast, state, getAudioCtx, screenFx } from '../framework.js';
import { registerCell, setActiveCell, getCell, activeCell } from '../cells.js';
import { camCtl } from '../main.js';
import { cam } from '../input.js';
import { SPAWN_W } from '../data/wrigleyville.js';
import { KIOSK_M } from '../data/millennium.js';
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
// carBody is an inner pivot group POSITIONED at the car centre; every mesh is
// built in CAR-LOCAL coords (x,z are offsets from the centre, y is absolute).
// The gentle ride sway rolls carBody about its own long (z) axis — NOT the
// world origin, which sits 250 m away and turned a 0.004 rad roll into ±1 m of
// cabin heave (issue 009; measured 2.0 m peak-to-peak before this re-pivot).
let winLights = [], carRoot = null, carBody = null;
function buildCar() {
  carRoot = new THREE.Group(); carRoot.name = 'cell-redline-car';
  scene.add(carRoot);                             // its own cell root at origin (cells.js toggles .visible)
  carBody = new THREE.Group(); carBody.position.set(CAR.x, 0, CAR.z);
  carRoot.add(carBody);                           // pivot at the car centre → sway rolls about the long axis
  const g = carBody;                              // build children in CAR-LOCAL x/z (y absolute)
  const add = m => { g.add(m); return m; };
  const box = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(c)); m.position.set(x, y, z); return add(m); };
  // BIGGER SHELL (task 027 B): interior floor 0.25 → ceiling 3.1 (was ~2.35) and
  // body ~3.9 m wide (was 3.4), a roomier cabin the chase camera rides inside;
  // LOW window sills (~1.0) so the streaming city lights stay visible past the
  // walls from the seated ride camera.
  box(3.9, 0.3, 13.5, 0x6d6a63, 0, 0.10, 0);                     // floor (top at 0.25)
  box(4.1, 0.3, 13.7, 0x8f8b84, 0, 3.25, 0);                     // ceiling (bottom at 3.1)
  box(0.14, 0.9, 13.5, 0xc8c4bc, -1.9, 0.55, 0);                 // west wainscot (sill top ~1.0)
  box(0.14, 0.9, 13.5, 0xc8c4bc,  1.9, 0.55, 0);                 // east wainscot
  box(0.14, 0.45, 13.5, 0xb8442f, -1.9, 2.90, 0);               // red trim band above the windows
  box(0.14, 0.45, 13.5, 0xb8442f,  1.9, 2.90, 0);
  box(3.9, 3.4, 0.16, 0xc8c4bc, 0, 1.7, -6.7);                   // north end wall (carries the Ko-fi placard)
  box(3.9, 3.4, 0.16, 0xc8c4bc, 0, 1.7,  6.7);                   // south end wall
  // window bands — translucent dusk glass, tall (sill 1.0 → header 2.7) so the
  // city lights stream past and stay visible from the seated ride camera
  for (const sx of [-1.9, 1.9]) {
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.7, 13.3),
      bmat(0x241f33, { transparent: true, opacity: 0.55 }));
    glass.position.set(sx, 1.85, 0); add(glass);
  }
  // longitudinal benches + poles + ads
  box(0.6, 0.45, 10.5, 0x9a4a3a, -1.5, 0.45, 0);
  box(0.6, 0.45, 10.5, 0x9a4a3a,  1.5, 0.45, 0);
  const poleG = new THREE.CylinderGeometry(0.035, 0.035, 2.9, 6);
  const poles = new THREE.InstancedMesh(poleG, toon(0xd8d5cf), 4);
  { const M = new THREE.Matrix4(); [-4, -1.3, 1.3, 4].forEach((oz, i) => { M.setPosition(0, 1.55, oz); poles.setMatrixAt(i, M); }); }
  poles.instanceMatrix.needsUpdate = true; add(poles);
  { // ad card: WRIGLEY'S SPEARMINT — THE PERFECT GUM (the namesake wink)
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 48;
    const c2 = cv.getContext('2d');
    c2.fillStyle = '#e9f2e4'; c2.fillRect(0, 0, 256, 48);
    c2.fillStyle = '#1e6b3a'; c2.font = '700 20px Georgia,serif'; c2.textAlign = 'center';
    c2.fillText("WRIGLEY'S SPEARMINT", 128, 22);
    c2.font = '700 13px Georgia,serif'; c2.fillText('— THE PERFECT GUM —', 128, 40);
    const ad = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.36), bmat(0xffffff, { map: new THREE.CanvasTexture(cv) }));
    ad.position.set(-1.84, 2.9, 2.5); ad.rotation.y = Math.PI / 2; add(ad);   // on the west red band, faces the aisle
  }
  { // Ko-fi support placard on the NORTH end wall — the transit-car ad precedent
    // (task 011). "SUPPORT DEVELOPMENT ♥" header over the scannable QR, big and
    // centred on the wall. The walkthrough reads it from very close (camera just
    // north of the grab-pole column, so the poles fall behind the lens), looking
    // slightly off-axis so the mayor sits beside it. Same QR matrix as the
    // rooftop billboard (src/qr.js). Faces +z (down the car).
    const cs = 720;                                                            // hi-res square card
    const cv = document.createElement('canvas'); cv.width = cs; cv.height = cs;
    const g = cv.getContext('2d');
    g.fillStyle = '#fdf6e6'; g.fillRect(0, 0, cs, cs);                         // cream card
    g.strokeStyle = '#b8442f'; g.lineWidth = 12; g.strokeRect(12, 12, cs - 24, cs - 24);
    g.fillStyle = '#b8442f'; g.textAlign = 'center';
    let fs = 52; g.font = `800 ${fs}px "Trebuchet MS",Arial,sans-serif`;       // header shrink-to-fit
    while (g.measureText('SUPPORT DEVELOPMENT ♥').width > cs - 70 && fs > 18) { fs -= 2; g.font = `800 ${fs}px "Trebuchet MS",Arial,sans-serif`; }
    g.fillText('SUPPORT DEVELOPMENT ♥', cs / 2, 60);
    drawQR(g, (cs - 37 * 12) / 2, 92, 12);                                     // 37 modules × 12 px = 444, upper-centre
    g.fillStyle = '#b8442f'; g.font = 'italic 700 32px Georgia,serif';
    g.fillText('scan to support ♥', cs / 2, 600);
    g.fillStyle = '#6b4d1e'; g.font = '700 26px "Trebuchet MS",Arial,sans-serif';
    g.fillText(KOFI_URL.replace(/^https?:\/\//, ''), cs / 2, 646);
    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5),
      bmat(0xffffff, { map: tex, fog: false }));
    card.position.set(0, 1.75, -6.55); add(card);                             // centred on the end wall, faces +z
  }
  // scrolling city lights outside both window bands (animated in update) — local
  // coords under carBody; the LOWER base y + wider spread fills the taller windows
  for (const side of [-1, 1]) {
    const n = 26, gp = new Float32Array(n * 3), aC = new Float32Array(n * 3), aS = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      gp.set([side * (3.6 + R() * 3), 1.1 + R() * 1.6, -9 + R() * 18], i * 3);
      const warm = 0.75 + R() * 0.25;
      aC.set([warm, warm * 0.82, 0.55], i * 3); aS[i] = 2.2 + R() * 2.6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(gp, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(aC, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(aS, 1));
    const pts = new THREE.Points(geo, pointsMat()); add(pts);
    pts.userData.warm = aC.slice();               // base colours + sizes — setWindowMood restores from here
    pts.userData.size = aS.slice();
    winLights.push(pts);
  }
  // interior glow (ceiling line, raised for the taller cabin)
  { const n = 3, gp = new Float32Array(n * 3), aC = new Float32Array(n * 3), aS = new Float32Array(n);
    for (let i = 0; i < n; i++) { gp.set([0, 2.9, -4 + i * 4], i * 3); aC.set([1, 0.95, 0.85], i * 3); aS[i] = 3.4; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(gp, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(aC, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(aS, 1));
    add(new THREE.Points(geo, pointsMat()));
  }
  // minimap while riding: a dark card with the Red Line. Belmont↔Addison runs
  // solid; the downtown express to Monroe is a BROKEN line (the wink that it
  // skips the whole North Side — real Belmont→Monroe is ~14 stops).
  const mmcv = document.createElement('canvas'); mmcv.width = 304; mmcv.height = 412;
  { const c2 = mmcv.getContext('2d');
    c2.fillStyle = '#2b2833'; c2.fillRect(0, 0, 304, 412);
    c2.strokeStyle = '#c0271f'; c2.lineWidth = 10; c2.lineCap = 'round';
    c2.beginPath(); c2.moveTo(152, 330); c2.lineTo(152, 80); c2.stroke();   // Belmont → Addison (solid)
    c2.setLineDash([7, 9]);                                                 // express-run gap
    c2.beginPath(); c2.moveTo(152, 340); c2.lineTo(152, 373); c2.stroke();  // Belmont → Monroe (broken)
    c2.setLineDash([]);
    c2.fillStyle = '#f4efe6';
    for (const [y, n] of [[330, 'BELMONT'], [205, 'SHERIDAN'], [80, 'ADDISON'], [381, 'MONROE']]) {
      c2.beginPath(); c2.arc(152, y, 8, 0, 7); c2.fill();
      c2.font = '700 16px "Trebuchet MS",sans-serif'; c2.textAlign = 'left';
      c2.fillText(n, 170, y + 6);
    }
  }
  return {
    id: 'redline-car', root: carRoot,
    walkable: (x, z) => x > CAR.x - 1.7 && x < CAR.x + 1.7 && z > CAR.z - 6.4 && z < CAR.z + 6.4,
    surfaceY: () => CAR.y,
    clamp: { xMin: CAR.x - 1.8, xMax: CAR.x + 1.8, zMin: CAR.z - 6.3, zMax: CAR.z + 6.3 },
    spawn: { x: CAR.x, z: CAR.z + 2 },
    minimapBase: mmcv, minimapBounds: { x0: 0, z0: 0, w: 304, h: 412, cw: 304, ch: 412 },
  };
}

// ------------------------- boarding pylon (Belmont) --------------------
function buildPylon() {
  const grp = new THREE.Group();
  // pole ENDS at the sign's bottom edge (y 2.275) so it never crosses the text
  // band — previously a full 3.4 m post bisected ADDISON/WRIGLEY FIELD (issue 014).
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.275, 0.22), toon(0x3a3a42));
  post.position.y = 1.1375; grp.add(post);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#1f1e24'; g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#c0271f'; g.fillRect(0, 0, 256, 30);
  g.fillStyle = '#f4efe6'; g.textAlign = 'center';
  g.font = '800 21px "Trebuchet MS",sans-serif'; g.fillText('RED LINE', 128, 22);
  // BOTH served directions, each shrink-to-fit so nothing clips the 1.7 m plane
  const fit = (txt, y) => {
    let fs = 18; g.font = `700 ${fs}px "Trebuchet MS",sans-serif`;
    while (g.measureText(txt).width > 242 && fs > 11) { fs -= 1; g.font = `700 ${fs}px "Trebuchet MS",sans-serif`; }
    g.fillText(txt, 128, y);
  };
  fit('↑ ADDISON · WRIGLEY FIELD', 58);
  fit('↓ MONROE · MILLENNIUM PARK', 85);
  g.font = '600 13px "Trebuchet MS",sans-serif'; g.fillText('game day service', 128, 116);
  // back-to-back FrontSide pair — readable from the plaza (east) AND the underpass
  // exit (west); a lone DoubleSide plane read RED LINE mirrored from behind (PITFALLS).
  const tex = new THREE.CanvasTexture(cv);
  const sgeo = new THREE.PlaneGeometry(1.7, 0.85), smat = bmat(0xffffff, { map: tex });
  const signE = new THREE.Mesh(sgeo, smat); signE.position.set(0.01, 2.7, 0); signE.rotation.y = Math.PI / 2; grp.add(signE);
  const signW = new THREE.Mesh(sgeo, smat); signW.position.set(-0.01, 2.7, 0); signW.rotation.y = -Math.PI / 2; grp.add(signW);
  grp.position.set(15.4, 0, 107.2);           // south of the underpass mouth, clear of the CPD board
  const lf = getCell('lakefront');            // parent into the lakefront cell root
  lf.root.add(grp);                           // so it hides with the rest of the cell
  return grp;
}

// ------------------------------ the ride -------------------------------
// THREE destinations now (task 042). Arrival flavor keys off the DESTINATION;
// the Addison pull-in keys off the ORIGIN (activeCell at boarding). Monroe is
// downtown's State-St SUBWAY — no visible train (the fade is the tunnel) and
// the streaming window lights turn amber/dark for the tube.
const DEST = {
  lakefront: {
    cell: 'lakefront', x: 20, z: 105, y: 0, yaw: 1.35,
    stop: 'Belmont', label: 'Belmont / lakefront', name: 'This is Belmont.',
    quip: 'ope — heading back to the lake?',
    arrive: () => toast('BELMONT', 'back at the lakefront'),
  },
  wrigleyville: {
    cell: 'wrigleyville', x: SPAWN_W.x + 1.4, z: SPAWN_W.z, y: SPAWN_W.y, yaw: 2.95,  // east of the canopy post row
    stop: 'Addison', label: 'Addison / Wrigley Field', name: 'This is Addison.',
    quip: 'ope — my stop too. go cubs, go!',
    arrive: () => {
      organSting();
      if (!state.wrigleyVisited) { state.wrigleyVisited = true; toast('WRIGLEYVILLE', 'the Friendly Confines — game day'); }
      else toast('WRIGLEYVILLE', 'Addison station');
    },
  },
  millennium: {
    // top of the park subway stair (KIOSK_M east mouth), facing the Bean axis
    cell: 'millennium', x: KIOSK_M.x1 + 2, z: KIOSK_M.pylonZ, y: 0, yaw: 1.62,
    stop: 'Monroe', label: 'Monroe / Millennium Park', name: 'This is Monroe.',
    quip: 'millennium park? locals just say the bean',
    arrive: () => {
      if (!state.millenniumVisited) { state.millenniumVisited = true; toast('MILLENNIUM PARK', 'downtown — the Bean is that way'); }
      else toast('MILLENNIUM PARK', 'Monroe / the park');
    },
  },
};

// window-light mood: amber sodium bulbs against the dark State St tube for a
// Monroe-bound run, warm city lights otherwise. Recolors the static per-vertex
// aColor (no rng; per-ride, resets from each pts' stored warm base).
function setWindowMood(tube) {
  for (const pts of winLights) {
    const a = pts.geometry.attributes.aColor, s = pts.geometry.attributes.aSize;
    const base = pts.userData.warm, bs = pts.userData.size;
    for (let i = 0; i < a.count; i++) {
      if (tube) {                                   // sodium-amber bulbs, dimmer + smaller: the dark State St tube
        const b = base[i * 3];
        a.setXYZ(i, b * 0.95, b * 0.36, 0.02); s.setX(i, bs[i] * 0.5);
      } else {                                       // warm city lights streaming past
        a.setXYZ(i, base[i * 3], base[i * 3 + 1], base[i * 3 + 2]); s.setX(i, bs[i]);
      }
    }
    a.needsUpdate = true; s.needsUpdate = true;
  }
}

const seq = [];                                     // [{at, fn}] one-shot timeline
let seqT = -1;
function runSeq(steps) { seq.length = 0; steps.forEach(s => seq.push(s)); seqT = 0; }

function rideTo(dest, player) {
  if (seqT >= 0) return;                            // already riding
  const origin = activeCell();                      // where we boarded
  const spot = DEST[dest];
  const toTube = dest === 'millennium';             // downtown = the subway
  state.redlineRides = (state.redlineRides || 0) + 1;
  const fade = ms => screenFx.filter('brightness(0)', ms);
  chime();
  // boarding AT Addison: a real train pulls in first; the fade covers boarding.
  // Belmont (surface stub) and Monroe (subway) board without a visible train.
  const preRoll = origin === 'wrigleyville' ? 2.6 : 0;
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
      setWindowMood(toTube);
      rumbleOn();
      toast(toTube ? 'RED LINE — 95TH BOUND' : 'RED LINE — HOWARD BOUND', 'next stop: ' + spot.stop);
    } },
    { at: P + 2.2, fn: () => rider.say(spot.quip) },
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
    { at: P + 9.4, fn: () => { spot.arrive(); seqT = -1; } },
  ]);
}

let rider = null;
onWorldReady((player) => {
  registerCell(buildCar());
  buildPylon();
  buildAddisonTrains();
  // dev spawn INSIDE the car pocket → activate the ride cell (walkthrough shots
  // of the in-car ad). Runs after wrigleyville.js already switched to its cell
  // for x<-100, so this override wins. The pocket sits far below all real z.
  if (player.x < CAR.x + 3 && player.x > CAR.x - 3 && player.z < CAR.z + 7 && player.z > CAR.z - 7) {
    setActiveCell('redline-car');
    player.x = Math.min(Math.max(player.x, CAR.x - 1.8), CAR.x + 1.8);
    player.z = Math.min(Math.max(player.z, CAR.z - 6.3), CAR.z + 6.3);
    player.y = CAR.y;
  }
  // the rider NPC lives in the car (framework NPC culling hides it elsewhere)
  rider = makeNPC({
    x: CAR.x + 1.35, z: CAR.z - 3.4, ry: -Math.PI / 2, name: 'red line regular',
    palette: { suit: 0x2a4a7a, pants: 0x3a3a42, skin: 0xb98a62, hair: 0x4a3626 },
    lines: ['ope', 'this car always smells like popcorn', 'the L is the best seat in the city'],
  });
  // Each of the three boarding points offers the OTHER TWO destinations as its
  // own zone, spaced so the prompts never overlap (centers ≥7 m; r 3 + 1.1
  // grace = 4.1 reach, so at each stand only that zone is in range).
  const board = (x, z, dest) => addInteraction({
    x, z, r: 3, label: 'ride the Red Line — ' + DEST[dest].label, onUse: p => rideTo(dest, p),
  });
  board(16, 104, 'wrigleyville');                        // Belmont pylon → Addison
  board(16, 111, 'millennium');                          // Belmont pylon → Monroe
  board(SPAWN_W.x, SPAWN_W.z - 5, 'lakefront');          // Addison platform → Belmont
  board(SPAWN_W.x, SPAWN_W.z + 2, 'millennium');         // Addison platform → Monroe
  board(KIOSK_M.x1 + 2, KIOSK_M.z0 + 0.5, 'lakefront');  // Millennium kiosk → Belmont
  board(KIOSK_M.x1 + 2, KIOSK_M.z1 - 1, 'wrigleyville'); // Millennium kiosk → Addison
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
          if (z > 10) z -= 20;                        // local z now (child of carBody)
          a.setZ(i, z);
        }
        a.needsUpdate = true;
      }
      if (carBody) carBody.rotation.z = Math.sin(t * 1.7) * 0.006;   // true subtle roll about the car's long axis
      if (((t * 1.8) | 0) !== (((t - dt) * 1.8) | 0)) clack();
    }
  });
});
