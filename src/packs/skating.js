// =====================================================================
//  PACK: skating — the LIVE layer of the McCormick Tribune ICE RINK
//  (task 049). The sunken sheet/boards/ramp/Park-Grill band are the
//  builder (src/millennium/rink.js) and the GLIDE physics live in main.js
//  (state.onIce / state.iceHops / mayor.rotation.z carve-lean). This pack
//  owns everything ALIVE on the ice:
//    * SIX NPC skaters parented to millenniumRoot (cell-culled for free) —
//      five LOOPERS carving hardcoded ellipses around the sheet centre and
//      one wobbly BEGINNER hugging the boards on a rounded-rect path
//      (arms out, body wobble, an ~11 s near-fall);
//    * the MAYOR'S SKATES — white boot + steel blade assemblies parented
//      into mparts.legL/legR, shown on the state.onIce RISING edge (shoes
//      tint white, a little chime, a one-time toast); hidden + un-tinted on
//      the falling edge;
//    * BLADE-CARVE audio — a lazily-built LOOPING filtered-noise bed whose
//      gain + centre-freq track glide speed and carve lean, plus a rising
//      swish + soft 'shk' landing on every hop-spin.
//
//  Only-my-file rules (AUTOPILOT doctrine): ONE import line in
//  packs/index.js; ALL setup inside onWorldReady; imports anything, edits
//  nothing shared. Skater visuals → millenniumRoot. Own mulberry32 seed
//  ('SKAT') — never the shared world rng. Audio via getAudioCtx, null-
//  guarded on every path; zero per-frame allocation (scratch hoisted).
//  Reads state.onIce/iceHops + mayor.rotation.z only; never writes main.js.
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, registerUpdate, registerBumpable, journalSection,
         toast, getAudioCtx, state, createChibi, tintChibiLimb } from '../framework.js';
import { toon, mulberry32, clamp, lerpAngle } from '../core.js';
import { activeCell } from '../cells.js';
import { millenniumRoot } from '../millennium/index.js';
import { mayor, mparts } from '../character.js';

const CITIZEN = 0.74;               // canonical chibi scale (matches the mayor)
const CX = 67, CZ = 799, ICE_Y = -1.6;   // ice-rect centre + floor height (RINK_M.ice)
const SHOE_WHITE = 0xf5f2ec;        // skate-boot white (reads as blades on the shoes)
const MAYOR_SHOE = 0x241b13;        // the mayor's default shoe color (restore on exit)
const _r = mulberry32(0x534b4154);  // local 'SKAT' rng — never the shared world rng

// ---- hardcoded downtown-mixed palettes (office wear + tourist colors) ----
// face:true ONLY on the beginner (last row) so its setFace/wide-eyes read.
const PAL = [
  { suit: 0x2f3d5a, pants: 0x24272e, skin: 0xe8b48c, hair: 0x2a1c12 },                     // navy office
  { suit: 0x3c3c44, pants: 0x2b2b31, skin: 0x8a5a3c, hair: 0x1d160f, hairStyle: 'bun' },   // charcoal office
  { suit: 0xb2493c, pants: 0x394050, skin: 0xdca07a, hair: 0x241610 },                     // tourist red parka
  { suit: 0x2f8f8a, pants: 0x33384a, skin: 0xf0c49c, hair: 0x4a3520, hairStyle: 'afro' },  // tourist teal
  { suit: 0xd6a53c, pants: 0x40354a, skin: 0x6e4632, hair: 0x120d08, hairStyle: 'tall' },  // mustard coat
  { suit: 0xc85c8e, pants: 0x2c3b45, skin: 0xa8724a, hair: 0x241a12, face: true },         // pink puffer (beginner)
];

// ---- skating-flavored "ope" pools (registerBumpable picks one at random) ----
const LOOP_LINES = ["ope — comin' through!", "lookin' good out there", "mind the rail, eh",
                    "ope, hot dogs after this", "nice edges!", "just like the Olympics, dontcha know"];
const BEG_LINES  = ["ope — still learning!", "whoa whoa whoa", "the wall is my friend",
                    "ope! almost went down", "you make it look easy"];

// ---- five loopers: per-skater hardcoded ellipse (A=x semi-axis, B=z semi-
// axis, dir=±1, w=base ang.speed sized so tangential speed ~2.2–5 m/s, ph=
// phase). All axes fit inside the ice rect (x 61.5–72.5, z 780–818). ----
const LOOPERS = [
  { A: 3.4, B: 13.0, dir:  1, w: 0.34, ph: 0.0 },
  { A: 2.8, B: 10.0, dir: -1, w: 0.42, ph: 2.1 },
  { A: 4.0, B: 15.5, dir:  1, w: 0.30, ph: 4.3 },
  { A: 3.0, B: 11.0, dir: -1, w: 0.40, ph: 1.2, handsBack: true },  // hands clasped behind
  { A: 3.8, B:  9.0, dir:  1, w: 0.46, ph: 5.4, spinner: true },    // the stylish one
];

// ---- beginner rounded-rect path: inset 1.0 m inside the ice rect
// (x 62.5–71.5, z 781–817), corner radius 2.6, parameterised by arclength. ----
const BR_CX = 67, BR_CZ = 799, BR_HX = 4.5, BR_HZ = 18, BR_R = 2.6;
const BR_A = BR_HX - BR_R, BR_B = BR_HZ - BR_R, BR_ARC = Math.PI / 2 * BR_R;
const BR_P = 4 * BR_A + 4 * BR_B + 2 * Math.PI * BR_R;   // perimeter ≈ 85.5 m
const BEG_SPD = 0.7;                                     // slow wall-hugging crawl (m/s)
// roundedRectAt(s): write world (x,z) + heading for arclength s into hoisted
// scalars (no per-frame allocation). CCW: E edge → NE arc → N edge → …
let _bx = 0, _bz = 0, _bh = 0;
function roundedRectAt(s) {
  s = ((s % BR_P) + BR_P) % BR_P;
  const a = BR_A, b = BR_B, r = BR_R, arc = BR_ARC;
  let lx, lz, h;
  if (s < 2 * b) { lx = BR_HX; lz = -b + s; h = 0; }
  else if ((s -= 2 * b) < arc) { const f = s / r; lx = a + r * Math.cos(f); lz = b + r * Math.sin(f); h = Math.atan2(-Math.sin(f), Math.cos(f)); }
  else if ((s -= arc) < 2 * a) { lx = a - s; lz = BR_HZ; h = -Math.PI / 2; }
  else if ((s -= 2 * a) < arc) { const f = Math.PI / 2 + s / r; lx = -a + r * Math.cos(f); lz = b + r * Math.sin(f); h = Math.atan2(-Math.sin(f), Math.cos(f)); }
  else if ((s -= arc) < 2 * b) { lx = -BR_HX; lz = b - s; h = Math.PI; }
  else if ((s -= 2 * b) < arc) { const f = Math.PI + s / r; lx = -a + r * Math.cos(f); lz = -b + r * Math.sin(f); h = Math.atan2(-Math.sin(f), Math.cos(f)); }
  else if ((s -= arc) < 2 * a) { lx = -a + s; lz = -BR_HZ; h = Math.PI / 2; }
  else { s -= 2 * a; const f = 3 * Math.PI / 2 + s / r; lx = a + r * Math.cos(f); lz = -b + r * Math.sin(f); h = Math.atan2(-Math.sin(f), Math.cos(f)); }
  _bx = BR_CX + lx; _bz = BR_CZ + lz; _bh = h;
}

// ---- one mayor skate: white boot cover + dark steel blade beneath it.
// Parented into a leg mesh at leg-local (0,-0.62,0.06) (shoe sits at -0.6). ----
function makeSkate() {
  const g = new THREE.Group();
  const boot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.4), toon(SHOE_WHITE));
  g.add(boot);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.07, 0.36), toon(0x2a2d33));
  blade.position.y = -0.14;   // leg-local y -0.76
  g.add(blade);
  return g;
}

// ============================== audio ==================================
// A bright two-note chime on the skates-on edge. Guards actx (null until start).
function chimeSound() {
  const A = getAudioCtx(); if (!A.actx) return;
  const t = A.actx.currentTime;
  [880, 1318.5].forEach((f, i) => {   // A5 → E6
    const o = A.actx.createOscillator(), g = A.actx.createGain(), t0 = t + i * 0.07;
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.07, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
    o.connect(g); g.connect(A.sfxBus); o.start(t0); o.stop(t0 + 0.34);
  });
}
// hop-spin: a rising noise SWISH (bandpass 800→2400 over 0.25 s) + a soft
// landing 'shk' ~0.4 s later. Every node is short-lived (crown-fountain style).
function hopSound() {
  const A = getAudioCtx(); if (!A.actx) return;
  const t = A.actx.currentTime;
  const s = A.actx.createBufferSource(); s.buffer = A.noiseBuf;
  const bp = A.actx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
  bp.frequency.setValueAtTime(800, t); bp.frequency.exponentialRampToValueAtTime(2400, t + 0.25);
  const g = A.actx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.1, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  s.connect(bp); bp.connect(g); g.connect(A.sfxBus); s.start(t, 0, 0.3); s.stop(t + 0.3);
  const t2 = t + 0.4;
  const s2 = A.actx.createBufferSource(); s2.buffer = A.noiseBuf;
  const bp2 = A.actx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 1800; bp2.Q.value = 0.8;
  const g2 = A.actx.createGain();
  g2.gain.setValueAtTime(0.0001, t2); g2.gain.linearRampToValueAtTime(0.09, t2 + 0.01); g2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.12);
  s2.connect(bp2); bp2.connect(g2); g2.connect(A.sfxBus); s2.start(t2, 0, 0.14); s2.stop(t2 + 0.14);
}

// =====================================================================
onWorldReady(player => {
  state.iceGlideBest = state.iceGlideBest || 0;

  // ---- journal ----
  journalSection('skating', 'Ice Skating', () =>
    `<div class="jrow"><span>Hop-spins landed</span><b>${state.iceHops || 0}</b></div>` +
    `<div class="jrow"><span>Longest glide</span><b>${(state.iceGlideBest || 0).toFixed(1)} s</b></div>`);

  // ---- five loopers (createChibi → millenniumRoot → shoes tinted → bumpable) ----
  const loopers = LOOPERS.map((cfg, i) => {
    const { group, parts } = createChibi(Object.assign({ scale: CITIZEN }, PAL[i]));
    const st0 = Math.sin(cfg.ph), ct0 = Math.cos(cfg.ph);
    group.position.set(CX + cfg.A * ct0, ICE_Y, CZ + cfg.B * st0);
    const hd0 = Math.atan2(-cfg.A * st0 * cfg.dir, cfg.B * ct0 * cfg.dir);
    group.rotation.y = hd0;
    millenniumRoot.add(group);
    tintChibiLimb(parts.legL, 'shoe', SHOE_WHITE); tintChibiLimb(parts.legR, 'shoe', SHOE_WHITE);
    registerBumpable(group, parts, LOOP_LINES);
    return { group, parts, A: cfg.A, B: cfg.B, dir: cfg.dir, w: cfg.w, ph: cfg.ph,
      handsBack: !!cfg.handsBack, spinner: !!cfg.spinner,
      th: cfg.ph, hd: hd0, lean: 0, stride: _r() * 6.283, spinExtra: 0, spinT: 0, spinCd: 3 + _r() * 6 };
  });

  // ---- the wobbly beginner (hugs the boards, arms out, near-falls) ----
  const bg = createChibi(Object.assign({ scale: CITIZEN }, PAL[5]));
  roundedRectAt(0);
  bg.group.position.set(_bx, ICE_Y, _bz); bg.group.rotation.y = _bh;
  millenniumRoot.add(bg.group);
  tintChibiLimb(bg.parts.legL, 'shoe', SHOE_WHITE); tintChibiLimb(bg.parts.legR, 'shoe', SHOE_WHITE);
  registerBumpable(bg.group, bg.parts, BEG_LINES);
  const beg = { group: bg.group, parts: bg.parts, s: 0, hd: _bh, ph: _r() * 6.283,
    stride: 0, nfT: 0, nfCd: 6 + _r() * 4 };

  // ---- the mayor's skates: parented into the leg meshes, hidden until on-ice ----
  const skateL = makeSkate(); skateL.position.set(0, -0.62, 0.06); skateL.visible = false; mparts.legL.add(skateL);
  const skateR = makeSkate(); skateR.position.set(0, -0.62, 0.06); skateR.visible = false; mparts.legR.add(skateR);
  let wasOnIce = false, toastedSkates = false;

  // ---- audio state ----
  let carve = null;                       // {src,bp,g} — the looping blade-carve bed (built lazily)
  let prevHops = state.iceHops || 0;
  let glideT = 0;                         // running >5 m/s glide timer (journal best)

  registerUpdate((dt, t, pl) => {
    if (dt < 0) dt = 0;
    const onIce = !!state.onIce;
    const speed = Math.hypot(pl.vx, pl.vz);

    // --- mayor's skates: rising / falling edge on state.onIce ---
    // (runs every frame — even off-cell state.onIce is false, so leaving the
    //  ice by any path fires the falling edge and un-tints the shoes.)
    if (onIce && !wasOnIce) {
      skateL.visible = true; skateR.visible = true;
      tintChibiLimb(mparts.legL, 'shoe', SHOE_WHITE); tintChibiLimb(mparts.legR, 'shoe', SHOE_WHITE);
      chimeSound();
      if (!toastedSkates) { toast('⛸ skates on!', 'carve with your momentum — SPACE for a twirl'); toastedSkates = true; }
    } else if (!onIce && wasOnIce) {
      skateL.visible = false; skateR.visible = false;
      tintChibiLimb(mparts.legL, 'shoe', MAYOR_SHOE); tintChibiLimb(mparts.legR, 'shoe', MAYOR_SHOE);
    }
    wasOnIce = onIce;

    // --- blade-carve audio (guarded; bed built on the first on-ice frame) ---
    const A = getAudioCtx();
    if (A.actx) {
      if (!carve && onIce) {
        const src = A.actx.createBufferSource(); src.buffer = A.noiseBuf; src.loop = true;
        const bp = A.actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.9;
        const g = A.actx.createGain(); g.gain.value = 0;
        src.connect(bp); bp.connect(g); g.connect(A.sfxBus); src.start();
        carve = { src, bp, g };
      }
      if (carve) {
        const tgt = onIce ? clamp(speed / 10, 0, 1) * 0.12 + Math.abs(mayor.rotation.z) * 0.10 : 0;
        carve.g.gain.setTargetAtTime(tgt, A.actx.currentTime, 0.08);
        carve.bp.frequency.setTargetAtTime(900 + speed * 90, A.actx.currentTime, 0.06);
      }
    }
    const hops = state.iceHops || 0;
    if (hops > prevHops) hopSound();
    prevHops = hops;

    // --- longest glide (>5 m/s while on ice) ---
    if (onIce && speed > 5) { glideT += dt; if (glideT > state.iceGlideBest) state.iceGlideBest = glideT; }
    else glideT = 0;

    // --- NPC skaters only animate while downtown (cell-culled anyway) ---
    if (activeCell() !== 'millennium') return;

    for (let i = 0; i < loopers.length; i++) {
      const s = loopers[i], g = s.group, p = s.parts;
      const we = s.w * (1 + 0.16 * Math.sin(t * 0.5 + s.ph));   // ω breathes over time
      s.th += we * s.dir * dt;
      const ct = Math.cos(s.th), st = Math.sin(s.th);
      g.position.set(CX + s.A * ct, ICE_Y, CZ + s.B * st);
      // heading = atan2 of the tangent; smoothed
      const head = Math.atan2(-s.A * st * s.dir, s.B * ct * s.dir);
      s.hd = lerpAngle(s.hd, head, 1 - Math.exp(-6 * dt));
      // lean into the curve ∝ curvature·speed (sign by direction)
      const denom = s.A * s.A * st * st + s.B * s.B * ct * ct;
      const v = we * Math.sqrt(denom);
      const kappa = s.A * s.B / Math.pow(denom, 1.5);
      s.lean = clamp(s.dir * kappa * v * 0.16, -0.22, 0.22);
      // stylish spin: a 0.8 s full turn every ~9 s, kept ON the loop
      if (s.spinner) {
        s.spinCd -= dt;
        if (s.spinCd <= 0 && s.spinT <= 0) { s.spinT = 0.8; s.spinCd = 9 + _r() * 2; }
        if (s.spinT > 0) { s.spinT = Math.max(0, s.spinT - dt); s.spinExtra = (1 - s.spinT / 0.8) * Math.PI * 2; }
        else s.spinExtra = 0;
      }
      g.rotation.y = s.hd + s.spinExtra;
      g.rotation.z = s.lean;
      // skating posture: torso pitched forward over the blades, long leg
      // scissor (rate tied to speed), arms counter-swing or clasp behind
      p.body.rotation.x = 0.16 + Math.abs(Math.sin(s.stride)) * 0.05;
      s.stride += v * dt * 1.4;
      const sw = Math.sin(s.stride);
      p.legL.rotation.x = sw * 0.52; p.legR.rotation.x = -sw * 0.52;
      if (s.handsBack) { p.armL.rotation.x = -0.5; p.armR.rotation.x = -0.5; p.armL.rotation.z = 0.15; p.armR.rotation.z = -0.15; }
      else { p.armL.rotation.x = -sw * 0.38; p.armR.rotation.x = sw * 0.38; }
    }

    // --- beginner: constant crawl, arms out, wobble + a periodic near-fall ---
    beg.nfCd -= dt;
    if (beg.nfCd <= 0 && beg.nfT <= 0) { beg.nfT = 1.6; beg.nfCd = 11 + _r() * 3; }
    const nf = beg.nfT > 0;
    if (nf) beg.nfT = Math.max(0, beg.nfT - dt);
    else beg.s += BEG_SPD * dt;              // frozen mid near-fall (stops)
    roundedRectAt(beg.s);
    const dip = nf ? -0.12 * Math.sin(Math.PI * (1 - beg.nfT / 1.6)) : 0;   // dip + recover
    beg.group.position.set(_bx, ICE_Y + dip, _bz);
    beg.hd = lerpAngle(beg.hd, _bh, 1 - Math.exp(-5 * dt));
    const amp = nf ? 3 : 1;
    beg.group.rotation.y = beg.hd;
    beg.group.rotation.z = (Math.sin(t * 5.3) * 0.1 + Math.sin(t * 0.7 + beg.ph) * 0.05) * amp;  // wobble + lurch, tripled
    const bp2 = beg.parts;
    bp2.armL.rotation.z = -1.15 + Math.sin(t * 3.1) * 0.12 * amp;   // arms OUT, flailing (worse mid near-fall)
    bp2.armR.rotation.z = 1.15 - Math.sin(t * 3.1) * 0.12 * amp;
    bp2.armL.rotation.x = Math.sin(t * 2.4) * 0.18 * amp;
    bp2.armR.rotation.x = -Math.sin(t * 2.4) * 0.18 * amp;
    if (!nf) beg.stride += dt * 2.2;
    const bsw = nf ? 0 : Math.sin(beg.stride) * 0.18;
    bp2.legL.rotation.x = bsw; bp2.legR.rotation.x = -bsw;
  });
});
