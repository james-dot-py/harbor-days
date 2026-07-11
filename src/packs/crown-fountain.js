// =====================================================================
//  PACK: crown-fountain — the LIVE layer of Crown Fountain (task 045).
//  The static shells/pool/bosques are the builder (src/millennium/crown.js);
//  this pack owns everything that MOVES:
//    * two LED FACE screens on the towers' inner faces — invented toon
//      CITIZENS (homage register, NO real-person likenesses), rotating a
//      few hand-drawn faces with a slow blink idle (canvas SWAP among
//      pre-rendered textures — no per-frame canvas redraws, no per-frame
//      allocation);
//    * THE SPOUT — on a ~40 s cycle a tower's face purses and a water ARC
//      spouts from its lips into the pool (instanced droplet arc + splash
//      ring + synthesized splash audio); standing in the landing zone
//      SOAKS the player (screenFx + a single toast gag — never queued);
//    * a couple of KID NPCs who shriek-and-scatter on the spout.
//
//  Only-my-file rules (AUTOPILOT doctrine): ONE import line in
//  packs/index.js; ALL setup inside onWorldReady; imports anything, edits
//  nothing shared.  Freestanding visuals → millenniumRoot (cell-culled,
//  added AFTER buildMillennium's merge pass so they stay live).  Kids →
//  makeNPC (framework culling + bump lines).  Own mulberry32 seed
//  (0x63524f57 offset) — never the world rng.  Audio via getAudioCtx,
//  null-guarded + gated on the millennium cell + distance, gains ramped.
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, registerUpdate, makeNPC, toast, screenFx, getAudioCtx, state } from '../framework.js';
import { toon, bmat, mulberry32, clamp, lerpAngle } from '../core.js';
import { activeCell } from '../cells.js';
import { millenniumRoot } from '../millennium/index.js';
import * as M from '../data/millennium.js';

// scratch (no per-frame allocation)
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _m4 = new THREE.Matrix4();
const _r = mulberry32(0x6350574e);              // local 'CPWN' — never the world rng
const rnd = () => _r();

// ------------------------------ geometry -------------------------------
// Tower inner faces face each other down the pool's long axis; the LED
// screen sits 60 mm proud of the shell face (no z-fight), the spout mouth
// ~7.5 m up, and both spouts land at pool centre.
const LAND = { x: 70, y: 0.12, z: 864 };
const APEX = 4.2;                               // arc bulge (peak ≈ mouth height → a shooting jet, not a dribble)
const FACE_W = 3.2, FACE_H = 8, FACE_CY = 8.5;  // LED screen size + centre height
const MOUTH_Y = 8.2;                            // world Y of the drawn pursed mouth on the screen

// ============================ face textures ============================
// A chibi CITIZEN face on a warm LED screen, mosaiced with a faint glass-
// block grid so it reads as pixels-behind-glass.  Pre-rendered ONCE per
// (citizen × state); the animation only SWAPS material.map (no redraws).
function faceTex({ skin, hair, cheek, eyes = 'open', mouth = 'smile' }) {
  const W = 128, H = 320;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#140b06'; g.fillRect(0, 0, W, H);                 // dark LED field
  const glow = g.createRadialGradient(W / 2, H * 0.44, 8, W / 2, H * 0.44, H * 0.55);
  glow.addColorStop(0, 'rgba(255,150,70,0.30)'); glow.addColorStop(1, 'rgba(255,150,70,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H * 0.42, hr = W * 0.40;
  // hair cap
  g.fillStyle = '#' + hair.toString(16).padStart(6, '0');
  g.beginPath(); g.ellipse(cx, cy - hr * 0.32, hr * 1.06, hr * 0.92, 0, Math.PI, 0); g.fill();
  g.fillRect(cx - hr * 1.06, cy - hr * 0.32, hr * 2.12, hr * 0.5);
  // head
  g.fillStyle = '#' + skin.toString(16).padStart(6, '0');
  g.beginPath(); g.ellipse(cx, cy, hr, hr * 1.15, 0, 0, 7); g.fill();
  // cheeks
  g.fillStyle = 'rgba(' + [(cheek >> 16) & 255, (cheek >> 8) & 255, cheek & 255].join(',') + ',0.55)';
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * hr * 0.52, cy + hr * 0.30, hr * 0.24, hr * 0.16, 0, 0, 7); g.fill(); }
  // brows
  g.strokeStyle = '#' + hair.toString(16).padStart(6, '0'); g.lineWidth = 4; g.lineCap = 'round';
  for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * hr * 0.42, cy - hr * 0.20, hr * 0.24, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
  // eyes
  for (const s of [-1, 1]) {
    const ex = cx + s * hr * 0.42, ey = cy - hr * 0.02;
    if (eyes === 'blink') {
      g.strokeStyle = '#241a12'; g.lineWidth = 5; g.beginPath();
      g.arc(ex, ey, hr * 0.22, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    } else {
      g.fillStyle = '#fbfaf4'; g.beginPath(); g.ellipse(ex, ey, hr * 0.22, hr * 0.28, 0, 0, 7); g.fill();
      g.fillStyle = '#221a12'; g.beginPath(); g.ellipse(ex, ey + hr * 0.03, hr * 0.11, hr * 0.13, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + hr * 0.04, ey - hr * 0.03, hr * 0.04, 0, 7); g.fill();
    }
  }
  // mouth
  g.strokeStyle = '#7a2a24'; g.fillStyle = '#7a2a24'; g.lineWidth = 5; g.lineCap = 'round';
  const my = cy + hr * 0.62;
  if (mouth === 'pursed') { g.fillStyle = '#521b18'; g.beginPath(); g.ellipse(cx, my, hr * 0.14, hr * 0.20, 0, 0, 7); g.fill(); }
  else { g.beginPath(); g.arc(cx, my - hr * 0.18, hr * 0.34, Math.PI * 0.18, Math.PI * 0.82); g.stroke(); }
  // LED mosaic overlay (faint block grid + scanlines)
  g.strokeStyle = 'rgba(20,10,4,0.35)'; g.lineWidth = 1;
  const cols = 16, rows = 40, cw = W / cols, ch = H / rows;
  for (let i = 0; i <= cols; i++) { g.beginPath(); g.moveTo(i * cw, 0); g.lineTo(i * cw, H); g.stroke(); }
  for (let j = 0; j <= rows; j++) { g.beginPath(); g.moveTo(0, j * ch); g.lineTo(W, j * ch); g.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}

// citizen palettes (invented toon citizens — homage register)
const CITIZENS = [
  { skin: 0xe0a878, hair: 0x2a2018, cheek: 0xe58a6a },
  { skin: 0xc98a5a, hair: 0x1a140e, cheek: 0xd07a5a },
  { skin: 0x8a5a3c, hair: 0x241a12, cheek: 0xb5654a },
  { skin: 0xf0c8a0, hair: 0x5a4a3a, cheek: 0xeaa07a },
];
// pre-render each citizen's three states ONCE (open / blink / pursed)
const FACESET = CITIZENS.map(c => ({
  open:  faceTex({ ...c, eyes: 'open',  mouth: 'smile' }),
  blink: faceTex({ ...c, eyes: 'blink', mouth: 'smile' }),
  spout: faceTex({ ...c, eyes: 'open',  mouth: 'pursed' }),
}));

// =====================================================================
onWorldReady(player => {
  // ---- the two towers (inner faces + spout mouths) --------------------
  // N tower inner (south) face at z853 → screen faces +z; S tower inner
  // (north) face at z875.5 → screen faces −z.  Rotating citizen index +
  // blink state per tower.
  const T = M.CROWN_M.towers;
  const towers = [
    { cx: (T[0].x0 + T[0].x1) / 2, faceZ: T[0].z1 + 0.06, yaw: 0,        ci: 0 },   // N, faces south (+z)
    { cx: (T[1].x0 + T[1].x1) / 2, faceZ: T[1].z0 - 0.06, yaw: Math.PI,  ci: 2 },   // S, faces north (−z)
  ];
  for (const tw of towers) {
    tw.mat = bmat(0xffffff, { map: FACESET[tw.ci].open });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(FACE_W, FACE_H), tw.mat);
    face.position.set(tw.cx, FACE_CY, tw.faceZ);
    face.rotation.y = tw.yaw;
    millenniumRoot.add(face);
    tw.blinkMode = 'open'; tw.blinkT = 2 + rnd() * 3;
    tw.set = st => { tw.mat.map = FACESET[tw.ci][st]; tw.mat.needsUpdate = true; };
  }

  // ---- the spout arcs (BOTH towers spit toward pool centre at once) ----
  // Instanced droplets, NARC per tower in one mesh; a chunky bright jet that
  // arcs from each pursed mouth into the pool where the two streams meet.
  const NARC = 20;
  const arc = new THREE.InstancedMesh(new THREE.SphereGeometry(0.18, 7, 6),
    bmat(0xe8f8ff, { transparent: true, opacity: 0.9, depthWrite: false }), NARC * 2);
  arc.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  arc.frustumCulled = false; arc.visible = false; millenniumRoot.add(arc);
  const ringMat = bmat(0xeaf6ff, { transparent: true, opacity: 0.55, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 1.15, 22), ringMat);
  ring.rotation.x = -Math.PI / 2; ring.position.set(LAND.x, 0.06, LAND.z);
  ring.renderOrder = 3; ring.visible = false; millenniumRoot.add(ring);

  function writeArc(ext, t) {
    let idx = 0;
    for (let k = 0; k < towers.length; k++) {
      const tw = towers[k], ph = k * 1.7;
      for (let i = 0; i < NARC; i++) {
        const u = i / (NARC - 1), vis = u <= ext;
        const px = tw.cx + (LAND.x - tw.cx) * u;
        const pz = tw.faceZ + (LAND.z - tw.faceZ) * u;
        const py = (MOUTH_Y + (LAND.y - MOUTH_Y) * u) + 4 * APEX * u * (1 - u);
        const pulse = 0.6 + 0.4 * Math.sin(t * 8 - u * 10 + ph);
        const sc = vis ? (0.6 + 0.5 * pulse) : 0;
        _s.set(sc, sc * 1.3, sc); _v.set(px, py, pz);
        _m4.compose(_v, _q, _s); arc.setMatrixAt(idx++, _m4);
      }
    }
    arc.instanceMatrix.needsUpdate = true;
  }

  // ---- synthesized splash audio (guarded + distance-mixed) ------------
  function splashSound(px, pz) {
    const A = getAudioCtx(); if (!A.actx) return;
    const d = Math.hypot(px - LAND.x, pz - LAND.z);
    const v = d <= 12 ? 1 : d >= 45 ? 0 : 1 - (d - 12) / 33;
    if (v <= 0.01) return;
    const t = A.actx.currentTime;
    // filtered-noise water burst
    const src = A.actx.createBufferSource(); src.buffer = A.noiseBuf;
    const bp = A.actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.5;
    const ng = A.actx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.linearRampToValueAtTime(0.13 * v, t + 0.04);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    src.connect(bp); bp.connect(ng); ng.connect(A.sfxBus); src.start(t, 0, 0.6);
    // a low gurgle warble under it
    const o = A.actx.createOscillator(), og = A.actx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.5);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.linearRampToValueAtTime(0.05 * v, t + 0.05);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(og); og.connect(A.sfxBus); o.start(t); o.stop(t + 0.6);
  }

  // ---- kid NPCs (shriek-and-scatter) ----------------------------------
  const KID_HOMES = [
    { x: 72.5, z: 858 }, { x: 67.2, z: 869 }, { x: 73.0, z: 871 },
  ];
  const SHRIEKS = ['eeeee!', "it's gonna get us!", 'run run run!', 'aaah cold!'];
  const kids = KID_HOMES.map((h, i) => {
    const npc = makeNPC({ x: h.x, z: h.z, ry: Math.atan2(LAND.x - h.x, LAND.z - h.z), wander: 0, moverLod: true,
      name: 'kid', scale: 0.56,
      palette: { suit: [0x4d78ad, 0xcf6f5a, 0x6ea38c][i % 3], pants: 0x39506a, skin: CITIZENS[i % 4].skin, hair: CITIZENS[i % 4].hair, face: true },
      lines: ['this is the BEST', "get in, it's not that cold", 'watch it spit!'] });
    // flee target: radially away from the landing, clamped to the wet plaza
    const dx = h.x - LAND.x, dz = h.z - LAND.z, dd = Math.hypot(dx, dz) || 1;
    const flee = { x: clamp(h.x + dx / dd * 4.5, 58, 85), z: clamp(h.z + dz / dd * 4.5, 840, 884) };
    return { npc, home: h, flee };
  });

  // ---- the spout cycle (~40 s: both towers purse + spit together) -----
  const GROW = 0.8, HOLD = 3.6, SHRINK = 1.0, PERIOD_REST = 34;   // idle ≈34 s + spout ≈5.4 s ≈ 40 s
  let spoutT = 5, spouting = false, phase = 'idle', pe = 0, soaked = false;
  state.crownSpouts = 0;

  function startSpout() {
    spouting = true; phase = 'grow'; pe = 0; soaked = false;
    for (const tw of towers) tw.set('spout');
    splashSound(player.x, player.z);            // the rush as the mouths purse
    for (const k of kids) { k.npc.setFace('surprised'); k.npc.say(SHRIEKS[(rnd() * SHRIEKS.length) | 0], 2.2); }
  }
  function endSpout() {
    spouting = false; phase = 'idle'; spoutT = PERIOD_REST;
    for (const tw of towers) { tw.ci = (tw.ci + 1) % FACESET.length; tw.set('open'); tw.blinkMode = 'open'; tw.blinkT = 2 + rnd() * 2; }
    arc.visible = false; ring.visible = false;
    for (const k of kids) k.npc.setFace('happy');
  }

  registerUpdate((dt, t) => {
    if (dt < 0) dt = 0;
    if (activeCell() !== 'millennium') return;   // only alive downtown

    // spout state machine
    if (phase === 'idle') {
      spoutT -= dt;
      if (spoutT <= 0) startSpout();
    } else {
      pe += dt;
      let ext;
      if (phase === 'grow') { ext = Math.min(1, pe / GROW); if (pe >= GROW) { phase = 'hold'; pe = 0; splashSound(player.x, player.z); state.crownSpouts++; } }
      else if (phase === 'hold') { ext = 1; if (pe >= HOLD) { phase = 'shrink'; pe = 0; } }
      else { ext = Math.max(0, 1 - pe / SHRINK); if (pe >= SHRINK) { endSpout(); ext = 0; } }
      if (spouting) {
        arc.visible = true; writeArc(ext, t);
        ring.visible = ext > 0.25;
        if (ring.visible) { const rs = 1.6 * ext * (phase === 'hold' ? 1 + 0.2 * Math.sin(t * 5) : 1); ring.scale.set(rs, 1, rs); ringMat.opacity = 0.55 * ext; }
        // soak the player standing in the landing zone (single toast per spout)
        if (phase === 'hold' && !soaked && Math.hypot(player.x - LAND.x, player.z - LAND.z) < 3.2) {
          soaked = true; screenFx.flash('rgba(150,205,255,0.6)', 420);
          toast('SPLASH!', 'soaked head to toe — worth it');
        }
      }
    }

    // face idle blink (both towers, while not spouting)
    if (!spouting) for (const tw of towers) {
      tw.blinkT -= dt;
      if (tw.blinkT <= 0) {
        if (tw.blinkMode === 'open') { tw.set('blink'); tw.blinkMode = 'blink'; tw.blinkT = 0.14; }
        else { tw.set('open'); tw.blinkMode = 'open'; tw.blinkT = 2.5 + rnd() * 3; }
      }
    }

    // kids: flee while a spout runs, drift home otherwise
    const scatter = spouting;
    const kk = 1 - Math.exp(-4 * dt);
    for (const k of kids) {
      if (!k.npc.group.visible) continue;
      const tgt = scatter ? k.flee : k.home;
      k.npc.group.position.x += (tgt.x - k.npc.group.position.x) * kk;
      k.npc.group.position.z += (tgt.z - k.npc.group.position.z) * kk;
      const fy = scatter ? Math.atan2(k.flee.x - LAND.x, k.flee.z - LAND.z) : Math.atan2(LAND.x - k.home.x, LAND.z - k.home.z);
      k.npc.group.rotation.y = lerpAngle(k.npc.group.rotation.y, fy, kk);
    }
  });
});
