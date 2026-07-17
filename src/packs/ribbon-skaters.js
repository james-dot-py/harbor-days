// =====================================================================
//  PACK: ribbon-skaters — the LIVE layer of the MAGGIE DALEY SKATING
//  RIBBON (task 059). The rockwork rims / rails / ICE strip are the
//  builder (maggie.js) and the GLIDE physics + mayor's skates/audio/
//  journal live GLOBALLY in packs/skating.js (state.onIce keys off
//  kindAtM 'ice', which the ribbon strip now returns — so the mayor
//  skates on the ribbon for free). This pack owns everything ALIVE on
//  the ribbon:
//    * SEVEN NPC LOOPERS carving the serpentine loop one-way (s
//      increasing), spread unevenly around the perimeter, banking into
//      the curves — one hands-clasped-behind speed-skater, one spinner;
//    * one wobbly BEGINNER hugging a rail (arms out, body wobble, an
//      ~11 s near-fall) — the archetype the owner loves, ported from the
//      049 rink onto the ribbon's arclength;
//    * the FULL-LAP beat (task 079): a net-signed-angle detector that pays
//      dibs when the mayor skates a whole circuit of the ribbon. It is the
//      ONE state read/write this pack does beyond posture (state.onIce +
//      wallet.pay); skating.js still owns the skates/audio/journal.
//
//  This GENERALIZES packs/skating.js's two state machines (looper +
//  beginner) from ellipse / rounded-rect paths to ARCLENGTH along the
//  RIBBON_M closed loop: a precomputed segment LUT + posAt(s,lat) place
//  every rig; posture / spinner / near-fall math is copied verbatim.
//
//  Only-my-file rules (AUTOPILOT doctrine): ONE import line in
//  packs/index.js; ALL setup inside onWorldReady, gated on
//  OPEN_GRANT.ribbonIce; imports anything, edits nothing shared. Skater
//  visuals → millenniumRoot (cell-culled for free). Own mulberry32 seed
//  ('RBNS') — never the shared world rng. NO audio / journal / toast /
//  camera / state writes (skating.js owns those globally). Zero per-
//  frame allocation (all scratch hoisted). Ribbon loop is AT GRADE, so
//  every rig sits at y 0 — NOT the rink's −1.6.
// =====================================================================
import { onWorldReady, registerUpdate, registerBumpable,
         createChibi, tintChibiLimb, state, wallet } from '../framework.js';
import { mulberry32, clamp, lerp, lerpAngle } from '../core.js';
import { activeCell } from '../cells.js';
import { millenniumRoot } from '../millennium/index.js';
import { RIBBON_M, OPEN_GRANT } from '../data/millennium.js';

const CITIZEN = 0.74;               // canonical chibi scale (matches the mayor)
const SHOE_WHITE = 0xf5f2ec;        // skate-boot white (reads as blades on the shoes)
const _r = mulberry32(0x52424e53);  // local 'RBNS' rng — never the shared world rng

// ---- arclength LUT over the RIBBON_M closed loop -----------------------
// loop is 66 pts with the last repeating the first, so the 65 UNIQUE verts
// U[0..64] form 65 segments U[i]->U[(i+1)%65] closing the loop. Built ONCE
// at import (pure geometry on static data — no rng, no meshes, no world;
// same as skating.js computing BR_P at module scope). Parallel arrays +
// cumulative lengths so posAt scans without allocating.
const U = RIBBON_M.loop.slice(0, 65);
const NSEG = U.length;                                 // 65 segments
const segAx = [], segAz = [], segUx = [], segUz = [], segH = [], cum = [];
let _acc = 0;
for (let i = 0; i < NSEG; i++) {
  const a = U[i], b = U[(i + 1) % NSEG];
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1e-6;
  segAx[i] = a[0]; segAz[i] = a[1];
  segUx[i] = dx / len; segUz[i] = dz / len;            // unit tangent (increasing s)
  segH[i] = Math.atan2(dx, dz);                        // heading of the segment
  cum[i] = _acc; _acc += len;
}
cum[NSEG] = _acc;
const RIBBON_P = _acc;                                 // total perimeter (metres)

// posAt(s, lat): write world (x,z) + heading for arclength s (+ a lateral
// offset `lat` m along the segment's LEFT normal) into hoisted scalars — NO
// per-frame allocation. Left normal of heading h = (−cos h, +sin h): it is
// perpendicular to the tangent (sin h, cos h) and CONSISTENT for every
// skater (the exact rail it points to is immaterial — it only spreads the
// rigs laterally so they don't ride single file).
let _px = 0, _pz = 0, _ph = 0;
function posAt(s, lat) {
  s = ((s % RIBBON_P) + RIBBON_P) % RIBBON_P;
  let seg = 0;
  while (seg < NSEG - 1 && cum[seg + 1] <= s) seg++;   // 65 segs — cheap, alloc-free
  const t = s - cum[seg], h = segH[seg];
  _px = segAx[seg] + segUx[seg] * t + lat * (-Math.cos(h));
  _pz = segAz[seg] + segUz[seg] * t + lat * ( Math.sin(h));
  _ph = h;
}

// ---- hardcoded winter-wear puffer palettes (suit/pants/skin/hair) ------
// 7 loopers + 1 beginner, visually distinct. face:true ONLY on the
// beginner (last row) so its wide-eyed setFace reads.
const PAL = [
  { suit: 0x2f5d3a, pants: 0x2b2b31, skin: 0xe8b48c, hair: 0x2a1c12 },                     // forest
  { suit: 0x7a2233, pants: 0x33272b, skin: 0x8a5a3c, hair: 0x1d160f, hairStyle: 'bun' },   // burgundy
  { suit: 0x274b86, pants: 0x24272e, skin: 0xdca07a, hair: 0x241610 },                     // royal blue
  { suit: 0xd6a53c, pants: 0x40354a, skin: 0x6e4632, hair: 0x120d08, hairStyle: 'tall' },  // mustard
  { suit: 0x5b2a5e, pants: 0x2c2733, skin: 0xf0c49c, hair: 0x3a2416, hairStyle: 'afro' },  // plum
  { suit: 0x455160, pants: 0x2b2f36, skin: 0xc8895f, hair: 0x201812 },                     // slate
  { suit: 0xc85a1e, pants: 0x30343d, skin: 0xe8b48c, hair: 0x241a12 },                     // orange
  { suit: 0x2f8f8a, pants: 0x394050, skin: 0xa8724a, hair: 0x241a12, face: true },         // teal (beginner)
];

// ---- ribbon-flavored "ope" pools (registerBumpable picks one at random) ----
const LOOP_LINES = ["ope — one-way traffic!", "quarter mile of ice, baby",
                    "the zamboni dreams of this place", "passing on your left!",
                    "smoother than the rink, dontcha think"];
const BEG_LINES  = ["ope — the rail is my copilot", "whoa— okay. okay. we're fine.",
                    "first time off the wall!", "tell the lighthouse I made it",
                    "who put the rail way over there?!"];

// ---- seven loopers: hardcoded start fraction of P, speed (m/s), fixed
// lateral offset (m, in [−1.2,+1.2] so they fan out), and phase. One
// hands-clasped-behind (speed-skater read), one spinner. ----
const LOOPERS = [
  { f: 0.02, v: 2.4, lat:  0.9, ph: 0.0 },
  { f: 0.11, v: 3.1, lat: -0.6, ph: 1.7, handsBack: true },   // hands clasped behind
  { f: 0.22, v: 1.9, lat:  0.3, ph: 3.4 },
  { f: 0.36, v: 2.7, lat: -1.1, ph: 0.8 },
  { f: 0.50, v: 2.2, lat:  1.2, ph: 4.6, spinner: true },     // the stylish one
  { f: 0.64, v: 3.2, lat: -0.3, ph: 2.2 },
  { f: 0.83, v: 1.7, lat:  0.6, ph: 5.1 },
];
const BEG_SPD = 0.55;               // slow wall-hugging crawl (m/s)
const BEG_LAT = -1.5;               // hugs one rail consistently (< halfW 2.7)

// ---- 079 full-lap beat: the loop's centroid + bbox, filled ONCE at
// onWorldReady (module-scope scalars — the per-frame test allocates nothing).
// The vertex-average centroid is INTERIOR: winding about it is exactly −1 and
// it clears the nearest segment by ~9 m (checked against the data), so one
// honest circuit accumulates a full 2π and a wander never fakes one.
let RB_CX = 0, RB_CZ = 0, RB_X0 = 0, RB_X1 = 0, RB_Z0 = 0, RB_Z1 = 0;
const RB_MARGIN = 4;   // bbox slack (m) — this is what tells ribbon ice from the 049 rink's

// =====================================================================
onWorldReady(() => {
  if (!OPEN_GRANT.ribbonIce) return;   // no ice on the ribbon → no skaters, no lap

  // ---- centroid + bbox over the 65 UNIQUE verts (U drops loop's repeated
  // closing vertex, which would otherwise weight one point twice) ----
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, sx = 0, sz = 0;
  for (let i = 0; i < NSEG; i++) {
    const x = U[i][0], z = U[i][1];
    sx += x; sz += z;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (z < z0) z0 = z; if (z > z1) z1 = z;
  }
  RB_CX = sx / NSEG; RB_CZ = sz / NSEG;
  RB_X0 = x0 - RB_MARGIN; RB_X1 = x1 + RB_MARGIN;
  RB_Z0 = z0 - RB_MARGIN; RB_Z1 = z1 + RB_MARGIN;

  // ---- A FULL LAP OF THE RIBBON ----------------------------------------
  // state.onIce is GLOBAL (the 049 rink sets it too), so the bbox is what says
  // "this ice is the ribbon". Accumulate the NET SIGNED angle swept about the
  // centroid: skating back and forth CANCELS, so only an actual circuit pays.
  // Own update (not the troupe's below — that one early-outs on the far-cull).
  let net = 0, prevA = 0, hasPrev = false;
  registerUpdate((dt, t, pl) => {
    if (!state.onIce || pl.x < RB_X0 || pl.x > RB_X1 || pl.z < RB_Z0 || pl.z > RB_Z1) {
      net = 0; hasPrev = false; return;          // off the ice / off the ribbon → forget the lap
    }
    const a = Math.atan2(pl.z - RB_CZ, pl.x - RB_CX);
    if (hasPrev) {
      let d = a - prevA;                          // unwrap into (−π, π]
      if (d > Math.PI) d -= 2 * Math.PI; else if (d <= -Math.PI) d += 2 * Math.PI;
      net += d;
      if (Math.abs(net) >= 2 * Math.PI) {
        wallet.pay({ key: 'ice.loop', first: 8, repeat: 3, reason: 'skating: the whole ribbon', label: 'skating' });
        net = 0;                                  // next lap starts clean
      }
    }
    prevA = a; hasPrev = true;
  });

  // ---- seven loopers (createChibi → millenniumRoot → shoes tinted → bumpable) ----
  const loopers = LOOPERS.map((cfg, i) => {
    const { group, parts } = createChibi(Object.assign({ scale: CITIZEN }, PAL[i]));
    const s0 = cfg.f * RIBBON_P;
    posAt(s0, cfg.lat);
    group.position.set(_px, 0, _pz);
    group.rotation.y = _ph;
    millenniumRoot.add(group);
    tintChibiLimb(parts.legL, 'shoe', SHOE_WHITE); tintChibiLimb(parts.legR, 'shoe', SHOE_WHITE);
    registerBumpable(group, parts, LOOP_LINES);
    return { group, parts, v: cfg.v, lat: cfg.lat, ph: cfg.ph,
      handsBack: !!cfg.handsBack, spinner: !!cfg.spinner,
      s: s0, hd: _ph, lean: 0, stride: _r() * 6.283,
      spinExtra: 0, spinT: 0, spinCd: 3 + _r() * 6 };
  });

  // ---- the wobbly beginner (hugs a rail, arms out, near-falls) ----
  const bg = createChibi(Object.assign({ scale: CITIZEN }, PAL[7]));
  posAt(0, BEG_LAT);
  bg.group.position.set(_px, 0, _pz); bg.group.rotation.y = _ph;
  millenniumRoot.add(bg.group);
  tintChibiLimb(bg.parts.legL, 'shoe', SHOE_WHITE); tintChibiLimb(bg.parts.legR, 'shoe', SHOE_WHITE);
  registerBumpable(bg.group, bg.parts, BEG_LINES);
  const beg = { group: bg.group, parts: bg.parts, s: 0, hd: _ph, ph: _r() * 6.283,
    stride: 0, nfT: 0, nfCd: 6 + _r() * 4 };

  // 062 DRAW-FOLD: the 8 live skater rigs are ~35 draws, and from the west
  // park they're 4-6 px fog-washed silhouettes 150-200 m out — yet every
  // Bean/rink frustum paid for them (mp-bean-f3 measured 486>480, the budget
  // gate). Hide the troupe whenever the player is far from the ribbon
  // (hysteresis 120/130 m so it never flickers). The framework can't own
  // this cull — these are custom-animated createChibi rigs, not makeNPC.
  const RIB_CX = 252, RIB_CZ = 751;
  let _farHidden = false;

  registerUpdate((dt, t, p) => {
    if (dt < 0) dt = 0;
    // NPC skaters only animate while downtown (cell-culled anyway).
    if (activeCell() !== 'millennium') return;
    const pdx = p.x - RIB_CX, pdz = p.z - RIB_CZ, pd2 = pdx * pdx + pdz * pdz;
    if (_farHidden ? pd2 < 120 * 120 : pd2 > 130 * 130) {
      _farHidden = !_farHidden;
      for (const s of loopers) s.group.visible = !_farHidden;
      beg.group.visible = !_farHidden;
    }
    if (_farHidden) return;

    for (let i = 0; i < loopers.length; i++) {
      const s = loopers[i], g = s.group, p = s.parts;
      const ve = s.v * (1 + 0.16 * Math.sin(t * 0.5 + s.ph));   // speed breathes over time
      s.s += ve * dt;
      posAt(s.s, s.lat);
      g.position.set(_px, 0, _pz);
      // heading smoothed toward the segment tangent
      const prevHd = s.hd;
      s.hd = lerpAngle(s.hd, _ph, 1 - Math.exp(-6 * dt));
      // lean into the curve ∝ the smoothed heading's turn rate. skating.js's
      // loopers lean = dir·κ·v·0.16 which equals −0.16·(dH/dt), so NEGATE the
      // raw rate to bank INTO the turn the same way (verified algebraically).
      let dhd = s.hd - prevHd;
      if (dhd > Math.PI) dhd -= 2 * Math.PI; else if (dhd < -Math.PI) dhd += 2 * Math.PI;
      const hdRate = dt > 0 ? dhd / dt : 0;
      s.lean = lerp(s.lean, clamp(-hdRate * 0.16, -0.22, 0.22), 1 - Math.exp(-4 * dt));
      // stylish spin: a 0.8 s full 2π turn every ~9-11 s, kept ON the loop
      if (s.spinner) {
        s.spinCd -= dt;
        if (s.spinCd <= 0 && s.spinT <= 0) { s.spinT = 0.8; s.spinCd = 9 + _r() * 2; }
        if (s.spinT > 0) { s.spinT = Math.max(0, s.spinT - dt); s.spinExtra = (1 - s.spinT / 0.8) * Math.PI * 2; }
        else s.spinExtra = 0;
      }
      g.rotation.y = s.hd + s.spinExtra;
      g.rotation.z = s.lean;
      // skating posture: torso pitched over the blades, long leg scissor
      // (rate tied to speed), arms counter-swing or clasped behind
      p.body.rotation.x = 0.16 + Math.abs(Math.sin(s.stride)) * 0.05;
      s.stride += ve * dt * 1.4;
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
    posAt(beg.s, BEG_LAT);
    const dip = nf ? -0.12 * Math.sin(Math.PI * (1 - beg.nfT / 1.6)) : 0;   // dip + recover
    beg.group.position.set(_px, dip, _pz);
    beg.hd = lerpAngle(beg.hd, _ph, 1 - Math.exp(-5 * dt));
    const amp = nf ? 3 : 1;
    beg.group.rotation.y = beg.hd;
    beg.group.rotation.z = (Math.sin(t * 5.3) * 0.1 + Math.sin(t * 0.7 + beg.ph) * 0.05) * amp;  // wobble + lurch, tripled
    const bp = beg.parts;
    bp.armL.rotation.z = -1.15 + Math.sin(t * 3.1) * 0.12 * amp;   // arms OUT, flailing (worse mid near-fall)
    bp.armR.rotation.z = 1.15 - Math.sin(t * 3.1) * 0.12 * amp;
    bp.armL.rotation.x = Math.sin(t * 2.4) * 0.18 * amp;
    bp.armR.rotation.x = -Math.sin(t * 2.4) * 0.18 * amp;
    if (!nf) beg.stride += dt * 2.2;
    const bsw = nf ? 0 : Math.sin(beg.stride) * 0.18;
    bp.legL.rotation.x = bsw; bp.legR.rotation.x = -bsw;
  });
});
