// =====================================================================
//  PACK: wrigley-game — GAME DAY inside the bowl (task 064).
//  wrigley-bowl.js (055) built the empty cathedral + the ref chase; THIS
//  pack fills it with a LIVE ballgame: an instanced swaying/erupting/
//  waving crowd (9 draws), a time-compressed CUBS vs SOX diorama (state
//  machine, NOT an engine), spectator SEATS with a session camera, the
//  7th-inning STRETCH (the hero), a full synth soundscape on its own PA
//  bus, crowd reactions to the 055 ref chase, a hot-dog vendor + baked
//  near-row fans.
//
//  Only-my-file rules: this module + ONE import line in packs/index.js.
//  ALL setup inside onWorldReady, gated on the bowl cell. Freestanding
//  visuals parent into getCell(CELL_ID_B).root (cell-culled for free,
//  added AFTER buildWrigleyBowl's merge so they stay live). TWO local
//  mulberry32 rngs (never the shared world rng): RP (build-time crowd
//  placement) + RG (runtime game outcomes). All audio synthesized +
//  getAudioCtx().actx-guarded. Zero per-frame allocation (scratch hoisted).
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, registerUpdate, addInteraction, makeNPC, registerBumpable,
         toast, journalSection, state, screenFx, holdItem, getAudioCtx,
         createChibi, bakeChibiRig, wallet } from '../framework.js';
import { toon, bmat, mulberry32, clamp, lerp, camera, game, hexRGB } from '../core.js';
import { cam, keys, joy } from '../input.js';
import { mayor, mparts } from '../character.js';
import { getCell, activeCell } from '../cells.js';
import { CROWD_SHIRT, CROWD_SKIN, crowdGeos, makeCrowd, stampCrowd } from '../crowd.js';
import { bowlScoreboard, bowlWFlagSet, STANDS_B } from '../wrigley/bowl.js';
import { raiseW } from '../wrigley/stadium.js';
import { burst, PASTELS } from '../fx.js';
import { sBoom } from '../audio.js';
import { CELL_ID_B, HP_B, AXIS_B, BACK_B, rWallB, polyRadiusB, kindAtB, surfaceYB,
         WALL_T_B, CONC_W_B, ROWS_B, WEDGES_B, VOM_S_B, SCOREBOARD_B } from '../data/wrigley-bowl.js';

// ---- determinism: two LOCAL rngs (never the shared world rng) ----------
const RP = mulberry32(19140423);   // 1914-04-23 Weeghman Park opens — crowd PLACEMENT (build only)
const RG = mulberry32(19081014);   // 1908-10-14 last title before 2016 — GAME outcomes (runtime)

// ---- geometry helpers --------------------------------------------------
const wrap = a => ((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
const at = (r, th) => [HP_B[0] + Math.sin(th) * r, HP_B[1] + Math.cos(th) * r];
const U = [Math.sin(AXIS_B), Math.cos(AXIS_B)];        // along HP->CF
const Vv = [U[1], -U[0]];                              // lateral
const at2 = (a, l) => [HP_B[0] + U[0] * a + Vv[0] * l, HP_B[1] + U[1] * a + Vv[1] * l];
const mergeGeos = arr => BufferGeometryUtils.mergeBufferGeometries(arr.map(g => g.index ? g.toNonIndexed() : g), false);
function inWedge(s) { for (const w of WEDGES_B) if (s >= w.s0 && s <= w.s1) return true; return false; }

// team palettes (hardcoded → deterministic; NO logos anywhere)
const CUBS = { suit: 0xe9eaee, pants: 0xe4e5ea, hair: 0x1c3f6e };   // pinstripe-white suggestion, blue cap-as-hair
const SOX  = { suit: 0x9aa0a8, pants: 0x8f959d, hair: 0x23252b };   // road grey, dark caps
const SKINS = [0xc99a6a, 0x8a5a3c, 0xe8b48c];
const FIELD_SKIN = 0xc99a6a;

let root = null;

// =====================================================================
//  1. THE CROWD  (instanced — 9 draws for any size)
// =====================================================================
const people = [];       // {x,z,yaw,sc,phase,baseY,th,amp,shirt,skin}
let crowd = null;
let crowdMode = 'idle';
let clockT = 0, swayT = 0, swayRamp = 0, eruptT = 0, oohT = 0, oohHold = false;
let waveActive = false, waveTh = 0, waveDist = 0, waveCd = 45;

function pushPerson(x, z, baseY) {
  const th = Math.atan2(x - HP_B[0], z - HP_B[1]);
  people.push({
    x, z, baseY, th,
    yaw: wrap(th + Math.PI + (RP() * 2 - 1) * 0.25),          // faces home plate ± jitter
    sc: 0.62 + RP() * 0.16,
    phase: RP() * 6.28,
    amp: 0.7 + RP() * 0.6,
    shirt: (RP() * 6) | 0, skin: (RP() * 3) | 0,
  });
}
function placeCrowd() {
  // --- GRANDSTAND: bench rows, skip wedges + vomitory ---
  for (let s = -1.62; s <= 1.621; s += 0.10) {
    if (inWedge(s)) continue;                                 // climbable wedges belong to the player
    const th = BACK_B + s, rw = rWallB(th), rS0 = rw + WALL_T_B + CONC_W_B, pr = polyRadiusB(th);
    const pOcc = 0.5 + 0.28 * (1 - Math.abs(s) / 1.62);
    for (let k = 0; k < ROWS_B.n; k++) {
      if (Math.abs(s) < VOM_S_B && k < 5) continue;           // entry vomitory gap
      const r = rS0 + k * ROWS_B.dr + ROWS_B.dr / 2 + 0.42;
      if (r > pr - 1.6) continue;
      const baseY = ROWS_B.y0 + k * ROWS_B.dy + 0.4;          // bench top
      const [bx, bz] = at(r, th);
      for (const off of [-0.45, 0.45]) {
        if (RP() > pOcc) continue;
        const o = off + (RP() * 2 - 1) * 0.15;
        pushPerson(bx + Math.cos(th) * o, bz - Math.sin(th) * o, baseY);
      }
    }
  }
  // --- UPPER DECK (scenery) ---
  const Umax = STANDS_B.upper.sMax;
  for (let s = -Umax; s <= Umax + 0.001; s += 0.14) {
    const th = BACK_B + s, pr = polyRadiusB(th);
    const rF = Math.min(26.5, pr - 4.5);
    for (let k = 0; k < 5; k++) {
      const r = rF + 0.8 + k * 1.35;
      if (r > pr - 1.4) continue;
      const baseY = 10.4 + k * 0.78 + 0.25;
      const [bx, bz] = at(r, th);
      for (const off of [-0.45, 0.45]) {
        if (RP() > 0.55) continue;
        const o = off + (RP() * 2 - 1) * 0.15;
        pushPerson(bx + Math.cos(th) * o, bz - Math.sin(th) * o, baseY);
      }
    }
  }
  // --- BLEACHERS (behind the ivy) ---
  for (let th = AXIS_B - 0.66; th <= AXIS_B + 0.66 + 0.001; th += 0.045) {
    const dth = th - AXIS_B, pr = polyRadiusB(th);
    for (let ri = 0; ri < 7; ri++) {
      if (Math.abs(dth) < 0.09 && ri < 3) continue;           // batter's-eye panel blocks these
      const r = 75.5 + ri * 1.75;
      if (r > pr - 1.2) continue;
      if (RP() > 0.7) continue;
      const baseY = 3.9 + ri * 0.62 + 0.25;
      const [bx, bz] = at(r, th);
      pushPerson(bx, bz, baseY);
    }
  }
  crowd = makeCrowd(root, people, 'seated', 'wgame-crowd');
  stampCrowd(crowd, crowdPose);                                // initial stamp (correct even before the first tick)
}
// hoisted poseFn — fully sets E/V/S each call (zero allocation)
function crowdPose(p, E, V, S) {
  let y = p.baseY, lx = 0, lz = 0, sy = p.sc;
  const t = clockT;
  if (crowdMode === 'stretch') {
    lz = swayRamp * 0.16 * Math.sin(2 * Math.PI * swayT / 3.6);   // SYNCHRONIZED shared-phase sway
    y = p.baseY + 0.02 * Math.max(0, Math.sin(swayT * 1.6));
  } else if (crowdMode === 'erupt') {
    y = p.baseY + 0.30 * Math.abs(Math.sin(t * 5 + p.phase));
    lz = 0.06 * Math.sin(t * 7 + p.phase);
  } else if (crowdMode === 'ooh') {
    lx = -0.08 + 0.012 * Math.sin(t * 9 + p.phase);              // lean toward the field + tremble
  } else if (crowdMode === 'wave') {
    const d = wrap(p.th - waveTh);
    const lift = 0.42 * Math.exp(-(d / 0.30) * (d / 0.30));
    y = p.baseY + lift + 0.02 * Math.max(0, Math.sin(t * 1.3 + p.phase));
    if (lift > 0.05) sy = p.sc * 1.08;
  } else {
    y = p.baseY + 0.02 * Math.max(0, Math.sin(t * 1.3 + p.phase));
    lz = 0.03 * Math.sin(t * 0.7 + p.phase);
  }
  E.set(lx, p.yaw, lz, 'YXZ');
  V.set(p.x, y, p.z);
  S.set(p.sc, sy, p.sc);
}
function updateCrowdMode() {
  if (G.phase === 'stretch') crowdMode = 'stretch';
  else if (eruptT > 0) crowdMode = 'erupt';
  else if (oohT > 0) crowdMode = 'ooh';
  else if (waveActive) crowdMode = 'wave';
  else crowdMode = 'idle';
}

// =====================================================================
//  the RIGS (createChibi, added to root; hidden rigs cost 0 draws)
// =====================================================================
const rigs = {};   // cubsP/soxP (pitchers), cubsC/soxC, cubsB/soxB
const BAT_YAW = AXIS_B - Math.PI / 2 - 0.35;
function placeRig(pal, wxz, yaw, scale = 0.8) {
  const skin = SKINS[(RP() * SKINS.length) | 0];
  const { group, parts } = createChibi({ suit: pal.suit, pants: pal.pants, skin, hair: pal.hair, scale });
  group.position.set(wxz[0], 0.22, wxz[1]); group.rotation.y = yaw;
  root.add(group);
  return { group, parts };
}
function buildBattery() {
  const mound = at2(12.9, 0), plate = at2(-0.2, 0), catch0 = at2(-1.7, 0), box = at2(0.2, 1.05);
  for (const [key, pal] of [['cubs', CUBS], ['sox', SOX]]) {
    const p = placeRig(pal, mound, BACK_B);
    p.parts.armR.rotation.x = 0;
    rigs[key + 'P'] = p;
    const c = placeRig(pal, catch0, AXIS_B);                    // catcher — crouched (fieldplay)
    c.group.position.y -= 0.36;
    c.parts.legL.rotation.x = 1.35; c.parts.legR.rotation.x = 1.35;
    c.parts.armL.rotation.x = -0.9; c.parts.armR.rotation.x = -0.9;
    rigs[key + 'C'] = c;
    const b = placeRig(pal, box, BAT_YAW);                      // batter — bat in handR
    const bat = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 1.05).translate(0, 0, 0.5), toon(0xb98a52));
    bat.rotation.set(-0.7, 0.3, 0); b.parts.handR.add(bat);
    b.parts.armR.rotation.x = -1.9; b.parts.armL.rotation.x = -1.6;
    rigs[key + 'B'] = b;
  }
  hideAllRigs();
}
function hideAllRigs() { for (const k in rigs) rigs[k].group.visible = false; }
let activeBatter = null, activePitcher = null, batSwT = -1;
function setHalfRigs() {
  hideAllRigs();
  const fielding = G.batting === 'vis' ? 'cubs' : 'sox';       // top: SOX bat, CUBS field
  const batting = G.batting === 'vis' ? 'sox' : 'cubs';
  rigs[fielding + 'P'].group.visible = true;
  rigs[fielding + 'C'].group.visible = true;
  rigs[batting + 'B'].group.visible = true;
  rigs[batting + 'B'].group.rotation.y = BAT_YAW;
  activeBatter = rigs[batting + 'B']; activePitcher = rigs[fielding + 'P'];
  // fielders wear the fielding team's colors
  const fp = fielding === 'cubs' ? CUBS : SOX;
  if (fBody) { fBody.material.color.setHex(fp.suit); fCap.material.color.setHex(fp.hair); }
}
function batterSwing() { batSwT = 0; }
function updateBatterSwing(dt) {
  if (batSwT < 0 || !activeBatter) return;
  batSwT += dt; const k = batSwT, g = activeBatter.group, p = activeBatter.parts;
  if (k < 0.3) { g.rotation.y = BAT_YAW + (k / 0.3) * 2.1; p.armR.rotation.x = -1.9 + (k / 0.3) * 1.7; p.armL.rotation.x = -1.6 + (k / 0.3) * 1.5; }
  else if (k < 0.9) { const b = (k - 0.3) / 0.6; g.rotation.y = BAT_YAW + (1 - b) * 2.1; p.armR.rotation.x = -0.2 - b * 1.7; p.armL.rotation.x = -0.1 - b * 1.5; }
  else { batSwT = -1; g.rotation.y = BAT_YAW; p.armR.rotation.x = -1.9; p.armL.rotation.x = -1.6; }
}

// ---- runners (2 per team; visible only on base / running) --------------
const cubsRunners = [], soxRunners = [];
function buildRunners() {
  for (const [arr, pal] of [[cubsRunners, CUBS], [soxRunners, SOX]]) {
    for (let i = 0; i < 2; i++) {
      const skin = SKINS[(RP() * SKINS.length) | 0];
      const { group, parts } = createChibi({ suit: pal.suit, pants: pal.pants, skin, hair: pal.hair, scale: 0.8 });
      group.position.set(HP_B[0], 0.22, HP_B[1]); group.visible = false; root.add(group);
      arr.push({ group, parts, walkT: 0 });
    }
  }
}
const BASE = [
  { }, { }, { },                                              // filled below
];
function initBases() {
  const b1 = at(27.4, AXIS_B + 0.785), b2 = at(38.8, AXIS_B), b3 = at(27.4, AXIS_B - 0.785);
  BASE[0] = { x: b1[0], z: b1[1] }; BASE[1] = { x: b2[0], z: b2[1] }; BASE[2] = { x: b3[0], z: b3[1] };
}
const curRunners = () => G.batting === 'cubs' ? cubsRunners : soxRunners;
function gaitReset(parts) { parts.legL.rotation.x = 0; parts.legR.rotation.x = 0; parts.armL.rotation.x = 0; parts.armR.rotation.x = 0; }
function gait(parts, sp, walkT) {
  const amt = clamp(sp / 3.4, 0, 1.25), sw = Math.sin(walkT) * amt;
  parts.legL.rotation.x = sw * 0.85; parts.legR.rotation.x = -sw * 0.85;
  parts.armL.rotation.x = -sw * 0.75; parts.armR.rotation.x = sw * 0.75;
}
function placeRunners() {
  const rr = curRunners(); let ri = 0;
  for (let b = 0; b < 3; b++) {
    if (G.bases[b] && ri < rr.length) {
      const rig = rr[ri++]; rig.group.visible = true;
      rig.group.position.set(BASE[b].x, 0.22, BASE[b].z);
      rig.group.rotation.y = Math.atan2(HP_B[0] - BASE[b].x, HP_B[1] - BASE[b].z);
      gaitReset(rig.parts);
    }
  }
  for (; ri < rr.length; ri++) rr[ri].group.visible = false;
  const other = G.batting === 'cubs' ? soxRunners : cubsRunners;
  for (const r of other) r.group.visible = false;
}
const sprint = { active: false, t: 0, dur: 1.6, kind: '', rig: null, walkT: 0 };
function startSprint(kind) {
  const rig = curRunners()[0]; if (!rig) return;
  sprint.active = true; sprint.t = 0; sprint.kind = kind; sprint.rig = rig; sprint.walkT = 0;
  sprint.dur = kind === 'ground' ? 1.3 : 1.6;
  rig.group.visible = true;
}
function updateSprint(dt) {
  if (!sprint.active) return;
  sprint.t += dt; let k = clamp(sprint.t / sprint.dur, 0, 1);
  if (sprint.kind === 'ground') k = Math.min(k, 0.85);         // pull up short — out
  const x = lerp(HP_B[0], BASE[0].x, k), z = lerp(HP_B[1], BASE[0].z, k);
  sprint.rig.group.position.set(x, 0.22, z);
  sprint.rig.group.rotation.y = Math.atan2(BASE[0].x - HP_B[0], BASE[0].z - HP_B[1]);
  sprint.walkT += dt * 9; gait(sprint.rig.parts, 6, sprint.walkT);
  if (sprint.t >= sprint.dur) { sprint.active = false; if (sprint.kind === 'ground') { sprint.rig.group.visible = false; gaitReset(sprint.rig.parts); } }
}

// ---- FIELDERS (7, instanced — 3 draws; team recolor on half swap) ------
let fBody = null, fHead = null, fCap = null;
const fst = [];   // {bx,bz,yaw,ox,oz,tx,tz,lean,sway}
const FIELDERS = [
  { da: 0.55, r: 22 }, { da: 0.18, r: 26 }, { da: -0.18, r: 26 }, { da: -0.55, r: 22 },  // 1B 2B SS 3B
  { da: -0.42, r: 42 }, { da: 0.02, r: 44 }, { da: 0.42, r: 40 },                          // LF CF RF
];
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v3 = new THREE.Vector3(), _s3 = new THREE.Vector3(0.8, 0.8, 0.8);
function buildFielders() {
  const bodyGeo = mergeGeos([
    new THREE.SphereGeometry(0.5, 9, 8).scale(0.85, 1.15, 0.7).translate(0, 1.05, 0),
    new THREE.BoxGeometry(0.55, 0.7, 0.3).translate(0, 0.35, 0),
  ]);
  const headGeo = new THREE.SphereGeometry(0.4, 9, 8).translate(0, 1.95, 0);
  const capGeo = new THREE.SphereGeometry(0.42, 9, 6, 0, Math.PI * 2, 0, 1.1).translate(0, 2.0, 0);
  fBody = new THREE.InstancedMesh(bodyGeo, toon(CUBS.suit, { mat: {} }), 7);   // UNCACHED so recolor never hits the shared cache
  fHead = new THREE.InstancedMesh(headGeo, toon(FIELD_SKIN, { mat: {} }), 7);
  fCap = new THREE.InstancedMesh(capGeo, toon(CUBS.hair, { mat: {} }), 7);
  for (const m of [fBody, fHead, fCap]) { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(m); }
  FIELDERS.forEach((f, i) => { const th = AXIS_B + f.da, [x, z] = at(f.r, th); fst.push({ bx: x, bz: z, yaw: th + Math.PI, ox: 0, oz: 0, tx: 0, tz: 0, lean: 0, sway: i * 0.9 }); });
  stampFielders(0);
}
function stampFielders(t) {
  for (let i = 0; i < 7; i++) {
    const f = fst[i];
    _e.set(0, f.yaw, 0.045 * Math.sin(t * 0.8 + f.sway) + f.lean, 'YXZ'); _q.setFromEuler(_e);
    _v3.set(f.bx + f.ox, 0.22, f.bz + f.oz); _m4.compose(_v3, _q, _s3);
    fBody.setMatrixAt(i, _m4); fHead.setMatrixAt(i, _m4); fCap.setMatrixAt(i, _m4);
  }
  fBody.instanceMatrix.needsUpdate = true; fHead.instanceMatrix.needsUpdate = true; fCap.instanceMatrix.needsUpdate = true;
}
function slideFielder(i, reach) {
  const f = fst[i];
  // target: shove toward the ball landing (a bit toward home along the radial)
  const th = Math.atan2(f.bx - HP_B[0], f.bz - HP_B[1]);
  f.tx = -Math.sin(th) * reach * 0.4; f.tz = -Math.cos(th) * reach * 0.4;
}
function fieldersReturn() { for (const f of fst) { f.tx = 0; f.tz = 0; } }
function updateFielders(dt, t) {
  for (const f of fst) {
    const dx = f.tx - f.ox, dz = f.tz - f.oz;
    f.ox += Math.sign(dx) * Math.min(Math.abs(dx), 6 * dt);     // slide ≤ 6 m/s
    f.oz += Math.sign(dz) * Math.min(Math.abs(dz), 6 * dt);
    f.lean = lerp(f.lean, (f.tx || f.tz) ? -0.18 : 0, 1 - Math.exp(-6 * dt));   // lean into the pickup
  }
  stampFielders(t);
}

// ---- the ball (scalar kinematics) --------------------------------------
let ball = null;
const bs = { kind: '', t: 0, dur: 1, arc: 0, fx: 0, fy: 0, fz: 0, tx: 0, ty: 0, tz: 0, onDone: null };
function launchBall(kind, from, to, dur, arc, onDone) {
  bs.kind = kind; bs.fx = from[0]; bs.fy = from[1]; bs.fz = from[2];
  bs.tx = to[0]; bs.ty = to[1]; bs.tz = to[2]; bs.dur = dur; bs.arc = arc; bs.t = 0; bs.onDone = onDone || null;
  ball.visible = true; ball.position.set(bs.fx, bs.fy, bs.fz);
}
function stepBall(dt) {
  if (!ball.visible) return;
  bs.t += dt; const k = clamp(bs.t / bs.dur, 0, 1);
  let y = bs.fy + (bs.ty - bs.fy) * k;
  if (bs.kind === 'arc' || bs.kind === 'line') y += Math.sin(k * Math.PI) * bs.arc;
  else if (bs.kind === 'ground') y = 0.14 + bs.arc * (1 - k) * Math.abs(Math.sin(k * Math.PI * 3));
  ball.position.set(bs.fx + (bs.tx - bs.fx) * k, y, bs.fz + (bs.tz - bs.fz) * k);
  if (k >= 1 && bs.onDone) { const f = bs.onDone; bs.onDone = null; f(); }
}

// =====================================================================
//  2. THE GAME  (state machine — a diorama that breathes)
// =====================================================================
const MSG1 = ['CUBS vs SOX', 'HOT DOGS · NO KETCHUP', 'THIS IS THE YEAR'];
const G = {
  vis: new Array(10).fill(null), cubs: new Array(10).fill(null),
  inning: 6, half: 'top', batting: 'vis', outs: 0,
  bases: [false, false, false],
  phase: 'idle', t: 4, plays: 0, drought: 0, msgIdx: 0,
  pendingOut: false, devHomer: false,
};
let halfStartT = 0, winT = 0;
let pendingBox = null, pendingT = 0;   // hand-turned digit reveal
const total = a => a.reduce((s, v) => s + (v == null ? 0 : v), 0);
const baseCount = () => G.bases.reduce((s, b) => s + (b ? 1 : 0), 0);
function inningMsg() { return (G.half === 'top' ? 'TOP' : 'BOT') + ' ' + G.inning + ' · ' + (G.outs === 1 ? '1 OUT' : G.outs + ' OUTS'); }
function disp(arr, team) {
  if (!pendingBox || pendingBox.team !== team) return arr;
  const c = arr.slice(); c[pendingBox.idx] = null; return c;
}
function repaint() {
  if (G.phase === 'stretch') { bowlScoreboard({ vis: disp(G.vis, 'vis'), cubs: disp(G.cubs, 'cubs'), half: G.half, outs: G.outs, msg1: '7TH INNING STRETCH', msg2: '♪ take me out to the ball game' }); return; }
  if (G.phase === 'win' || G.phase === 'postwin') { bowlScoreboard({ vis: G.vis, cubs: G.cubs, half: G.half, outs: 0, msg1: 'CUBS WIN!', msg2: 'FLY THE W' }); return; }
  bowlScoreboard({ vis: disp(G.vis, 'vis'), cubs: disp(G.cubs, 'cubs'), half: G.half, outs: G.outs, msg1: MSG1[G.msgIdx % MSG1.length], msg2: inningMsg() });
}
function scoreRun(n) {
  if (n <= 0) return;
  const arr = G.batting === 'vis' ? G.vis : G.cubs, idx = G.inning - 1;
  arr[idx] = (arr[idx] || 0) + n;
  pendingBox = { team: G.batting, idx }; pendingT = 0.7;       // paint null now, digit in 0.7 s
  repaint();
}
// distribute a run total across 5 innings, each box 0..2 (deterministic)
function distribute(tot) {
  const a = [0, 0, 0, 0, 0];
  let guard = 0;
  while (tot > 0 && guard++ < 40) { const i = (RG() * 5) | 0; if (a[i] < 2) { a[i]++; tot--; } }
  return a;
}
function prefill() {
  for (let i = 0; i < 10; i++) { G.vis[i] = null; G.cubs[i] = null; }
  const box = () => { const r = RG(); return r < 0.55 ? 0 : r < 0.85 ? 1 : 2; };
  let visTot = 0;
  for (let i = 0; i < 5; i++) { G.vis[i] = box(); visTot += G.vis[i]; }
  const d = (RG() * 3) | 0;                                    // cubs trail-or-tie within 2
  const cubsTot = Math.max(0, visTot - d);
  const c = distribute(cubsTot);
  for (let i = 0; i < 5; i++) G.cubs[i] = c[i];
}

function enterIdle() { G.phase = 'idle'; G.t = 4 + RG() * 4; }
function enterWindup() { G.phase = 'windup'; G.t = 0.7; if (activePitcher) activePitcher.parts.armR.rotation.x = -2.7; }
function enterPitch() {
  G.phase = 'pitch'; G.t = 0.45;
  if (activePitcher) activePitcher.parts.armR.rotation.x = 0.6;
  const m = at2(11.6, 0), p = at2(-1.2, 0);
  launchBall('arc', [m[0], 1.55, m[1]], [p[0], 0.95, p[1]], 0.45, 0.35);
}
function pickOutcome() {
  if (G.devHomer) { G.devHomer = false; return 'homer'; }
  if (G.half === 'bot' && G.inning >= 9 && G.outs >= 2 && total(G.cubs) <= total(G.vis)) return 'homer';   // walk-off engine
  if (G.drought >= 14) return 'homer';
  const wH = 0.09 * (G.batting === 'cubs' ? 1.5 : 1);
  const ws = [['take', 0.26], ['foul', 0.13], ['ground', 0.30], ['single', 0.22], ['homer', wH]];
  let tot = 0; for (const w of ws) tot += w[1];
  let r = RG() * tot;
  for (const w of ws) { if (r < w[1]) return w[0]; r -= w[1]; }
  return 'take';
}
function advanceSingle() {
  const nb = [false, false, false]; let runs = 0;
  if (G.bases[2]) runs++;                       // 3B scores
  if (G.bases[1]) runs++;                       // 2B scores
  if (G.bases[0]) nb[2] = true;                 // 1B -> 3B
  nb[0] = true;                                 // batter -> 1B
  G.bases = nb;
  scoreRun(runs);
}
function resolveOutcome() {
  G.plays++; G.msgIdx++;
  const oc = pickOutcome();
  if (oc !== 'take') { batterSwing(); crackSfx(oc === 'homer'); murmurSwell(); }

  if (oc === 'take') {
    G.phase = 'take'; G.t = 1.5;
    const c = at2(-1.7, 0), p = at2(-0.6, 0);
    launchBall('arc', [p[0], 1.2, p[1]], [c[0], 0.9, c[1]], 0.4, 0.15, () => { ball.visible = false; });
    if (RG() < 0.30) { G.pendingOut = true; politeClap(); }   // called strike three, when it'd be fun
  } else if (oc === 'foul') {
    G.phase = 'foul'; G.t = 1.2;
    const back = at(rWallB(BACK_B) + WALL_T_B + CONC_W_B + 6, BACK_B + (RG() * 2 - 1) * 0.3);
    launchBall('arc', [HP_B[0], 1.0, HP_B[1]], [back[0], 4, back[1]], 1.0, 6, () => { ball.visible = false; });
    oohLight();
  } else if (oc === 'ground') {
    G.phase = 'ground'; G.t = 2.5;
    const fi = (RG() * 4) | 0, f = fst[fi]; slideFielder(fi, 2.6);
    launchBall('ground', [HP_B[0], 0.14, HP_B[1]], [f.bx + f.tx, 0.14, f.bz + f.tz], 0.9, 0.5, () => {
      launchBall('arc', [f.bx + f.tx, 1.0, f.bz + f.tz], [BASE[0].x, 1.2, BASE[0].z], 0.5, 1.2, () => { ball.visible = false; });
    });
    startSprint('ground'); G.pendingOut = true; crowdMild();
  } else if (oc === 'single') {
    G.phase = 'single'; G.t = 2.5;
    const of = 4 + ((RG() * 3) | 0), f = fst[of]; slideFielder(of, 3);
    launchBall('line', [HP_B[0], 1.4, HP_B[1]], [f.bx + f.tx, 1.6, f.bz + f.tz], 1.0, 5, () => { ball.visible = false; });
    advanceSingle(); startSprint('single'); midCheer();
  } else {   // homer
    G.phase = 'homer'; G.t = 4; G.drought = 0;
    const tgt = [SCOREBOARD_B.x + (RG() * 2 - 1) * 6, SCOREBOARD_B.topY - 1, SCOREBOARD_B.z];
    launchBall('arc', [HP_B[0], 1.1, HP_B[1]], tgt, 2.8, 20, () => { ball.visible = false; });
    eruptT = 4;
    const runs = 1 + baseCount(); G.bases = [false, false, false];
    scoreRun(runs);
    if (activeCell() === CELL_ID_B) state.gameHomers = (state.gameHomers || 0) + 1;
    if (G.batting === 'cubs') { cubsFireworks(3); bigRoar(3.5); }
    else { awwwGroan(); bigRoar(2.4); }
  }
  if (oc !== 'homer') G.drought++;
  repaint();
}
function afterResolve() {
  if (activeBatter) { activeBatter.parts.armR.rotation.x = -1.9; activeBatter.parts.armL.rotation.x = -1.6; activeBatter.group.rotation.y = BAT_YAW; }
  if (activePitcher) activePitcher.parts.armR.rotation.x = 0;
  fieldersReturn();
  if (G.pendingOut) { G.outs++; G.pendingOut = false; }
  placeRunners();
  repaint();
  // BOT-9 (or later) walk-off: once the Cubs take the lead, it's over
  if (G.half === 'bot' && G.inning >= 9 && total(G.cubs) > total(G.vis)) { startWin(); return; }
  if (G.outs >= 3) { recordHalfWatched(); halfOver(); } else enterIdle();
}
// "stayed for the whole half" — seated since before the half started, ≥25 s in
function recordHalfWatched() {
  if (seated && sittingSince <= halfStartT && game.tNow - halfStartT > 25) {
    state.halfInningsWatched = (state.halfInningsWatched || 0) + 1;
    toast('STAYED FOR THE WHOLE HALF', 'that’s a scorecard kind of day');
    wallet.pay({ key: 'wrigley.half', first: 8, repeat: 3, reason: 'Wrigley: the whole half-inning', label: 'Wrigley' });
  }
}
function halfOver() {
  if (G.half === 'top' && G.inning === 7) { startStretch(); return; }
  if (G.half === 'top' && G.inning === 9 && total(G.cubs) > total(G.vis)) { startWin(); return; }
  G.phase = 'between'; G.t = 5;
}
function swapHalf() {
  if (G.half === 'top') { G.half = 'bot'; } else { G.half = 'top'; G.inning++; }
  G.batting = G.half === 'top' ? 'vis' : 'cubs';
  G.outs = 0; G.bases = [false, false, false];
  const arr = G.batting === 'vis' ? G.vis : G.cubs; if (arr[G.inning - 1] == null) arr[G.inning - 1] = 0;
  halfStartT = game.tNow;
  setHalfRigs(); placeRunners();
  repaint();
}

// ---- the 7th-inning STRETCH (the hero) ---------------------------------
function startStretch() {
  G.phase = 'stretch'; G.t = 32; swayT = 0; swayRamp = 0;
  repaint();
  const A = getAudioCtx(); if (A.actx) scheduleStretchSong(A);
}
function endStretch() { swapHalf(); enterIdle(); }

// ---- CUBS WIN ----------------------------------------------------------
function startWin() {
  G.phase = 'win'; G.t = 9; winT = 0; eruptT = 9;
  state.cubsWinsSeen = (state.cubsWinsSeen || 0) + 1;
  raiseW(1); cubsFireworks(3); bigRoar(4.5); goCubsGo();
  repaint();
}
function enterPostwin() { G.phase = 'postwin'; G.t = 6; eruptT = 0; bowlWFlagSet(1); }
function newGame() {
  prefill();
  G.inning = 6; G.half = 'top'; G.batting = 'vis'; G.outs = 0; G.bases = [false, false, false];
  G.vis[5] = 0; G.drought = 0; G.msgIdx++;
  bowlWFlagSet(0);                              // exterior cycle owns lowering raiseW
  halfStartT = game.tNow;
  setHalfRigs(); placeRunners();
  enterIdle(); repaint();
}
function advancePhase() {
  switch (G.phase) {
    case 'idle': enterWindup(); break;
    case 'windup': enterPitch(); break;
    case 'pitch': resolveOutcome(); break;
    case 'take': case 'foul': case 'ground': case 'single': case 'homer': afterResolve(); break;
    case 'between': swapHalf(); enterIdle(); break;
    case 'stretch': endStretch(); break;
    case 'win': enterPostwin(); break;
    case 'postwin': newGame(); break;
  }
}

// =====================================================================
//  3. SEATS — watching is the activity
// =====================================================================
const SEATS_DEF = [{ s: -0.55, row: 6 }, { s: -0.82, row: 6 }, { s: 0.66, row: 4 }];
const SEATS = [];
const seatInters = [];
let standInter = null;
let seated = null, sittingSince = 0, singT = 0;
const camPosCur = new THREE.Vector3(), camLookCur = new THREE.Vector3(), _relLook = new THREE.Vector3();
let releaseT = 0;
function buildSeats() {
  for (const d of SEATS_DEF) {
    const th = BACK_B + d.s, r = rWallB(th) + WALL_T_B + CONC_W_B + d.row * 1.4 + 0.7 + 0.42;
    const [x, z] = at(r, th);
    SEATS.push({ x, z, s: d.s, th, rowY: ROWS_B.y0 + d.row * 0.62, facing: wrap(th + Math.PI) });
  }
  for (const seat of SEATS) {
    const h = addInteraction({ x: seat.x, z: seat.z, r: 1.6, priority: 6, label: 'take in the game', onUse: () => sitDown(seat, false) });
    seatInters.push(h);
  }
  standInter = addInteraction({
    x: SEATS[0].x, z: SEATS[0].z, r: 2.0, priority: 7, label: 'stand up',
    onUse: () => { if (G.phase === 'stretch') singAlong(); else standUp(); },
  });
  standInter.enabled = false;
}
// Spectator cam: BEHIND + above the seated mayor with a slight aisle-side angle
// (the side-dominant spec offset pushed the mayor out of frame in this bowl
// geometry; a behind-and-above framing — the proven chase/bowl-from-seats read —
// reliably holds the seated mayor in the foreground with the field beyond).
function seatCamTarget(seat, outPos, outLook) {
  outLook.set(HP_B[0] + Math.sin(AXIS_B) * 6, 1.0, HP_B[1] + Math.cos(AXIS_B) * 6);
  let dx = outLook.x - seat.x, dz = outLook.z - seat.z;
  const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;         // horizontal seat→field
  const factor = -Math.sign(seat.s || 1);                     // hang toward the aisle (s=0) side
  const tx = Math.cos(seat.th), tz = -Math.sin(seat.th);
  // HIGH over-the-shoulder: the seated mayor's head tops out ~rowY+2.1, and the
  // bench row itself fills the bottom of any eye-level frame — the camera must
  // sit ABOVE both (rowY+2.9) looking down, so the mayor reads seated low in
  // frame and the FIELD is the subject (first cut at rowY+1.5 was a wall of
  // bench + the back of his head).
  outPos.set(seat.x - dx * 3.4 + tx * 1.3 * factor, seat.rowY + 2.9, seat.z - dz * 3.4 + tz * 1.3 * factor);
}
function sitDown(seat, instant) {
  seated = seat; sittingSince = game.tNow; singT = 0; releaseT = 0;
  for (const h of seatInters) h.enabled = false;
  standInter.enabled = true;
  standInter.setLabel(G.phase === 'stretch' ? '♪ sing along' : 'stand up');
  if (instant) { seatCamTarget(seat, camPosCur, camLookCur); }
  else { camPosCur.copy(camera.position); camLookCur.set(mayor.position.x, mayor.position.y + 0.1, mayor.position.z); }   // settle FROM the chase view
  cam.yaw = seat.facing; cam.pitch = 0.12; cam.dist = 6;
}
function standUp() {
  if (!seated) return;
  seated = null;
  mparts.legL.rotation.x = 0; mparts.legR.rotation.x = 0;
  mparts.armL.rotation.x = 0; mparts.armR.rotation.x = 0;
  mparts.armL.rotation.z = -0.25; mparts.armR.rotation.z = 0.25;
  mparts.body.rotation.x = 0;
  for (const h of seatInters) h.enabled = true;
  standInter.enabled = false;
  releaseT = 0.5;                                             // hand the chase cam back, no snap
}
function singAlong() {
  screenFx.flash('#ffe1a8', 550);
  singT = 3;
  toast('♪ root, root, root for the CUBBIES');
  state.stretchesSungIn = (state.stretchesSungIn || 0) + 1;
}
function standPressed() {
  return keys.has('w') || keys.has('a') || keys.has('s') || keys.has('d') ||
    keys.has('arrowup') || keys.has('arrowdown') || keys.has('arrowleft') || keys.has('arrowright') ||
    keys.has(' ') || joy.len > 0.2;
}
function updateSeated(dt, player) {
  if (standPressed()) { standUp(); return; }
  player.x = seated.x; player.z = seated.z; player.vx = 0; player.vz = 0; player.y = surfaceYB(seated.x, seated.z);
  mayor.position.set(seated.x, seated.rowY + 0.46, seated.z); mayor.rotation.y = seated.facing;
  if (singT > 0) {
    singT -= dt; const a = -0.9 + 0.4 * Math.sin(clockT * 4);
    mparts.armL.rotation.x = a; mparts.armR.rotation.x = a;
    mparts.armL.rotation.z = 0.2; mparts.armR.rotation.z = -0.2;
  } else {
    mparts.armL.rotation.x = -0.18; mparts.armR.rotation.x = -0.18;
    mparts.armL.rotation.z = 0.15; mparts.armR.rotation.z = -0.15;
  }
  mparts.legL.rotation.x = -1.15; mparts.legR.rotation.x = -1.15; mparts.body.rotation.x = -0.05;
  // spectator camera settle
  seatCamTarget(seated, _v3, _relLook);
  const k = 1 - Math.exp(-4 * dt);
  camPosCur.lerp(_v3, k); camLookCur.lerp(_relLook, k);
  camera.position.copy(camPosCur); camera.lookAt(camLookCur);
  cam.yaw = seated.facing; cam.pitch = 0.12; cam.dist = 6;
  standInter.x = player.x; standInter.z = player.z;
  standInter.setLabel(G.phase === 'stretch' ? '♪ sing along' : 'stand up');
}
function updateRelease(dt, player) {
  const pit = Math.max(0, cam.pitch), horiz = Math.cos(pit) * cam.dist;
  _v3.set(player.x - Math.sin(cam.yaw) * horiz, Math.max(player.y + 0.55, player.y + 1.6 + Math.sin(pit) * cam.dist), player.z - Math.cos(cam.yaw) * horiz);
  _relLook.set(player.x, player.y + 0.1, player.z);
  const k = 1 - Math.exp(-8 * dt);
  camPosCur.lerp(_v3, k); camLookCur.lerp(_relLook, k);
  camera.position.copy(camPosCur); camera.lookAt(camLookCur);
  releaseT -= dt;
}

// =====================================================================
//  4/5. SOUNDSCAPE — own PA bus (lowpass 3200) + sfxBus one-shots
// =====================================================================
let pa = null, murmurG = null, murmurSwellT = 0;
function ensureAudio() {
  const A = getAudioCtx(); if (!A.actx || pa) return;
  pa = A.actx.createGain(); pa.gain.value = 1;
  const lp = A.actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
  pa.connect(lp); lp.connect(A.actx.destination);
  const src = A.actx.createBufferSource(); src.buffer = A.noiseBuf; src.loop = true;
  const f = A.actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 240;
  murmurG = A.actx.createGain(); murmurG.gain.value = 0.0001;
  src.connect(f); f.connect(murmurG); murmurG.connect(pa); src.start();
}
function murmurSwell() { murmurSwellT = 1.5; }
function crackSfx(big) {
  const A = getAudioCtx(); if (!A.actx) return; const t = A.actx.currentTime;
  const s = A.actx.createBufferSource(); s.buffer = A.noiseBuf;
  const f = A.actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 1.1;
  const g = A.actx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime((big ? 0.32 : 0.26), t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  s.connect(f); f.connect(g); g.connect(A.sfxBus); s.start(t); s.stop(t + 0.12);
  const o = A.actx.createOscillator(), og = A.actx.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(250, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.08);
  og.gain.setValueAtTime(0.14, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(og); og.connect(A.sfxBus); o.start(t); o.stop(t + 0.12);
}
function noiseSwell(dur, peak, freq, q) {
  const A = getAudioCtx(); if (!A.actx) return; const t = A.actx.currentTime;
  const s = A.actx.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true;
  const f = A.actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = A.actx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + dur * 0.35); g.gain.linearRampToValueAtTime(peak * 0.8, t + dur * 0.62); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(A.sfxBus); s.start(t); s.stop(t + dur + 0.1);
}
function bigRoar(dur) { noiseSwell(dur, 0.17, 500, 0.4); }
function midCheer() { noiseSwell(1.6, 0.09, 520, 0.5); }
function crowdMild() { noiseSwell(0.9, 0.05, 480, 0.6); }
function oohLight() { noiseSwell(0.7, 0.05, 430, 0.7); }
function oohSwell() { noiseSwell(1.2, 0.09, 400, 0.6); }
function politeClap() {
  const A = getAudioCtx(); if (!A.actx) return; const t0 = A.actx.currentTime;
  for (let i = 0; i < 3; i++) A.noiseHit(t0 + i * 0.09, 0.05, 'bandpass', 1500, 1.2, 0.05);
}
function laughter() {
  const A = getAudioCtx(); if (!A.actx) return; const t0 = A.actx.currentTime;
  for (let i = 0; i < 6; i++) A.noiseHit(t0 + i * 0.11, 0.05, 'bandpass', 1200 - i * 90, 1.4, 0.06);
}
function mockRoar() {
  noiseSwell(1.6, 0.11, 560, 0.5);
  const A = getAudioCtx(); if (!A.actx) return; A.noiseHit(A.actx.currentTime + 0.2, 0.18, 'highpass', 2400, 1.0, 0.05);   // short whistle
}
function awwwGroan() {
  const A = getAudioCtx(); if (!A.actx) return; const t0 = A.actx.currentTime;
  for (const [f0, det] of [[196, 0], [147, 0]]) {
    const o = A.actx.createOscillator(), g = A.actx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * 0.62, t0 + 1.4);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.06, t0 + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.5);
    o.connect(g); g.connect(A.sfxBus); o.start(t0); o.stop(t0 + 1.6);
  }
}
// organ note stack on the PA bus (triangle + detuned + square)
function organNote(A, midi, t, dur, g0) {
  const f = A.mf(midi);
  for (const [type, det, gain] of [['triangle', 0, g0], ['triangle', -6, g0 * 0.36], ['square', 4, g0 * 0.22]]) {
    const o = A.actx.createOscillator(), g = A.actx.createGain();
    o.type = type; o.frequency.value = f; o.detune.value = det;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.03);
    g.gain.setValueAtTime(gain, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.02);
    o.connect(g); g.connect(pa); o.start(t); o.stop(t + dur + 0.05);
  }
}
// crowd HUM at the note frequency + a broad ~600 Hz singing bed (reads as thousands)
function crowdHum(A, midi, t, dur) {
  const f = A.mf(midi);
  const s = A.actx.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true;
  const bp = A.actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 10;
  const g = A.actx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
  s.connect(bp); bp.connect(g); g.connect(pa); s.start(t); s.stop(t + dur + 0.1);
  const s2 = A.actx.createBufferSource(); s2.buffer = A.noiseBuf; s2.loop = true;
  const bp2 = A.actx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 600; bp2.Q.value = 1.4;
  const g2 = A.actx.createGain();
  g2.gain.setValueAtTime(0.0001, t); g2.gain.linearRampToValueAtTime(0.05, t + 0.08); g2.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
  s2.connect(bp2); bp2.connect(g2); g2.connect(pa); s2.start(t); s2.stop(t + dur + 0.1);
}
function scheduleStretchSong(A) {
  let t = A.actx.currentTime + 0.15;
  const base = 0.42, hold = 1.0;
  const phrase = (notes, lastHold) => {
    for (let i = 0; i < notes.length; i++) {
      const last = i === notes.length - 1;
      const dur = last && lastHold ? base * 2 : base;
      organNote(A, notes[i], t, dur, 0.14); crowdHum(A, notes[i], t, dur);
      t += dur;
    }
    t += 0.12;
  };
  phrase([60, 72, 69, 67, 64, 67, 62], true);    // take me out to the ball game
  phrase([60, 72, 69, 67, 64, 67], true);        // take me out with the crowd
  phrase([69, 68, 69, 64, 65, 67, 69, 65, 62], false);  // buy me some peanuts and cracker jack (chromatic turn)
  phrase([60, 72, 69, 67, 64, 67, 62], true);    // root, root, root reprise
  // cadence: F-major then C-major, warm swell
  for (const m of [65, 69, 72]) organNote(A, m, t, 1.2, 0.11); t += 1.2;
  for (const m of [60, 64, 67, 72]) organNote(A, m, t, 2.2, 0.11); t += 2.2;
  crowdHum(A, 60, t, 0.1);
  noiseSwellAt(t + 0.1, 2.4, 0.14, 520, 0.45);   // big happy crowd cheer
}
function noiseSwellAt(t, dur, peak, freq, q) {
  const A = getAudioCtx(); if (!A.actx) return;
  const s = A.actx.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true;
  const f = A.actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = A.actx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(pa); s.start(t); s.stop(t + dur + 0.1);
}
function goCubsGo() {   // 'Go, Cubs, go' hook: G4 G4 E4 G4 x2 (triangle voices) on the PA
  const A = getAudioCtx(); if (!A.actx) return;
  let t = A.actx.currentTime + 0.2; const mel = [67, 67, 64, 67, 67, 67, 64, 67];
  for (const m of mel) { organNote(A, m, t, 0.32, 0.12); crowdHum(A, m, t, 0.32); t += 0.34; }
}
function organNoodle() {
  const A = getAudioCtx(); if (!A.actx) return; let t = A.actx.currentTime;
  for (const m of [62, 66, 69, 74, 69]) { organNote(A, m, t, 0.22, 0.07); t += 0.22; }
}
function chargeCall() {
  const A = getAudioCtx(); if (!A.actx) return; let t = A.actx.currentTime;
  const mel = [60, 65, 69, 72, 69, 72], dur = [0.14, 0.14, 0.14, 0.5, 0.2, 0.9];
  for (let i = 0; i < mel.length; i++) { organNote(A, mel[i], t, dur[i], 0.1); t += dur[i]; }
  // crowd 'CHARGE!' bark
  const s = A.actx.createBufferSource(); s.buffer = A.noiseBuf;
  const f = A.actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(1200, t + 0.4); f.Q.value = 0.8;
  const g = A.actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.14, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  s.connect(f); f.connect(g); g.connect(A.sfxBus); s.start(t); s.stop(t + 0.45);
}
function vendorCall() {
  const A = getAudioCtx(); if (!A.actx) return; const t0 = A.actx.currentTime;
  for (let i = 0; i < 2; i++) {
    const t = t0 + i * 0.36;
    const s = A.actx.createBufferSource(); s.buffer = A.noiseBuf;
    const f = A.actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(500, t + 0.3); f.Q.value = 1.2;
    const g = A.actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.08, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    s.connect(f); f.connect(g); g.connect(A.sfxBus); s.start(t); s.stop(t + 0.34);
  }
}

// =====================================================================
//  fireworks queue (deferred bursts; burst() consumes shared rng — runtime OK)
// =====================================================================
const fxQueue = [];
function cubsFireworks(n) {
  for (let i = 0; i < n; i++) fxQueue.push({ t: game.tNow + i * 0.5, i });
  screenFx.flash('#ffe6b0', 500);
}
function updateFxQueue() {
  for (let i = fxQueue.length - 1; i >= 0; i--) {
    if (game.tNow >= fxQueue[i].t) {
      const idx = fxQueue[i].i; fxQueue.splice(i, 1);
      const col = idx % 2 ? hexRGB(0xffd98a) : hexRGB(PASTELS[(RG() * PASTELS.length) | 0]);
      burst(SCOREBOARD_B.x + (RG() * 2 - 1) * 3, SCOREBOARD_B.topY + 6 + (RG() * 2 - 1) * 2, SCOREBOARD_B.z, 160, 11, col, 1.8, 3, 3, 0.9);
      sBoom();
    }
  }
}

// =====================================================================
//  6. CROWD REACTIONS TO THE 055 REF CHASE (read-only sync)
// =====================================================================
let prevChases = 0, prevEscapes = 0, prevEjects = 0;
function reactToChase(player) {
  const c = state.refChases || 0, e = state.refEscapes || 0, j = state.ejections || 0;
  if (c > prevChases) { oohSwell(); oohHold = true; oohT = 0.5; }
  if (e > prevEscapes) { laughter(); eruptT = Math.max(eruptT, 2); }
  if (j > prevEjects) { mockRoar(); eruptT = Math.max(eruptT, 2.5); }
  prevChases = c; prevEscapes = e; prevEjects = j;
  if (oohHold) { if (kindAtB(player.x, player.z) === 'grass') oohT = 0.5; else oohHold = false; }
}

// =====================================================================
//  7. THE VENDOR + near-row real people
// =====================================================================
let vendor = null, vendorInter = null, vPhase = 0, vBaseR = 0, heldClearT = 0, vendorT = 18, organT = 25;
// 081 favors ('poppybuns', favors-wrigley.js) — additive, read-only hook.
// Filled in buildVendor() with {npc}; changes ZERO existing behavior.
export const vendorHooks = {};
function buildVendor() {
  const th0 = BACK_B; vBaseR = rWallB(th0) + WALL_T_B + CONC_W_B / 2;
  const [vx, vz] = at(vBaseR, th0);
  vendor = makeNPC({
    x: vx, z: vz, ry: 0, name: 'the hot dog guy', wander: 0,
    palette: { suit: 0xb03a2e, pants: 0x2b2f36, skin: 0xcaa07a, hair: 0x2a2018, face: true },
    lines: ['hot dogs! getcha hot dogs!', 'no ketchup. don’t ask.', 'mustard? mustard.', 'ope — comin’ through', 'last row’s on me, kid'],
  });
  vendorHooks.npc = vendor;   // 081: read-only exposure for favors-wrigley (poppybuns)
  const tray = new THREE.Group();                            // held-prop law: parent to the GROUP, never handR
  tray.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.32), toon(0x8a6a3a)));
  for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 6), toon(0xc06a2a)); d.rotation.z = Math.PI / 2; d.position.set(-0.15 + i * 0.1, 0.05, 0); tray.add(d); }
  tray.position.set(0, 1.05, 0.30); vendor.group.add(tray);
  vendorInter = addInteraction({
    x: vx, z: vz, r: 2.2, priority: 6, label: 'hot dog — no ketchup',
    onUse: () => {
      const dog = new THREE.Group();
      dog.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.07), toon(0xdcb670)));
      const sa = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.17, 7), toon(0x9a3b1e)); sa.rotation.z = Math.PI / 2; sa.position.y = 0.03; dog.add(sa);
      dog.position.set(0, 0.16, 0.06); dog.rotation.x = -0.5;
      holdItem(dog); heldClearT = game.tNow + 5;
      const A = getAudioCtx(); if (A.actx) A.noiseHit(A.actx.currentTime, 0.09, 'bandpass', 900, 1.5, 0.08);
      toast('ONE WITH EVERYTHING', 'well — everything but ketchup');
      state.hotDogs = (state.hotDogs || 0) + 1;
    },
  });
}
function updateVendor(dt) {
  if (!vendor) return;
  vPhase += dt * 0.35;
  // patrol arc BK−0.3..+0.9 — biased off the wb-concourse/arrival stands
  // (BK−0.75/BK): with contended page game-times up to ~11 s the vendor can be
  // anywhere on his arc at shot time, so the arc itself must clear the lenses
  // (he eclipsed a whole concourse framing standing AT the camera).
  const th = BACK_B + 0.3 + Math.sin(vPhase) * 0.6;
  const [x, z] = at(vBaseR, th);
  const ox = vendor.group.position.x, oz = vendor.group.position.z;
  if (Math.hypot(x - ox, z - oz) > 1e-4) vendor.group.rotation.y = Math.atan2(x - ox, z - oz);   // face travel
  vendor.group.position.x = x; vendor.group.position.z = z;
  vendor.sp = 1.0;                                            // makeNPC gait swings the legs (055 direct-move pattern)
  if (vendorInter) { vendorInter.x = x; vendorInter.z = z; }
}
function buildNearRowFans() {
  const LINES = ['kid, I’ve been coming here since ’69', 'this is the year. I can FEEL it.', 'no ketchup. obviously.',
    'ope — heads up, foul balls', 'the ivy? 1937. the grass? off limits.', 'scorecard? I keep it in my head'];
  const PAL = [
    { suit: 0x4f8c6b, pants: 0x2f3540, skin: 0x8a5a3c, hair: 0x1d160f },
    { suit: 0xd4694f, pants: 0x3c4a63, skin: 0xe8b48c, hair: 0x3a2a1e },
    { suit: 0x6d7fbf, pants: 0x33384a, skin: 0x6e4632, hair: 0x24160e, hairStyle: 'afro' },
    { suit: 0xe0b24a, pants: 0x6b4a2f, skin: 0xf0c9a0, hair: 0x55402a },
  ];
  let n = 0, pi = 0;
  for (const w of WEDGES_B) {
    for (const sOff of [0.12, 0.30, 0.46]) {
      for (const row of [4, 6]) {
        if (n >= 8) break;
        const s = w.s0 + sOff * (w.s1 - w.s0) + 0.05;
        const th = BACK_B + s, r = rWallB(th) + WALL_T_B + CONC_W_B + row * ROWS_B.dr + ROWS_B.dr / 2 + 0.42;
        const [x, z] = at(r, th);
        let tooClose = false;
        for (const seat of SEATS) if (Math.hypot(x - seat.x, z - seat.z) < 1.5) tooClose = true;
        if (tooClose) continue;
        const benchTopY = ROWS_B.y0 + row * ROWS_B.dy + 0.4;
        const pal = PAL[pi++ % PAL.length];
        const { group, parts } = createChibi(Object.assign({ scale: 0.72 }, pal));
        group.position.set(x, benchTopY - 0.33, z); group.rotation.y = wrap(th + Math.PI);
        parts.legL.rotation.x = -1.42; parts.legR.rotation.x = -1.36;
        parts.armL.rotation.x = -0.4; parts.armR.rotation.x = -0.5;
        parts.armL.rotation.z = 0.15; parts.armR.rotation.z = -0.15;
        parts.body.rotation.x = -0.12;
        root.add(group);
        registerBumpable(group, parts, LINES);                 // BEFORE bake (PITFALLS order law)
        bakeChibiRig(group, parts);                            // 1 draw each
        n++;
      }
    }
  }
}

// =====================================================================
//  wire it up
// =====================================================================
onWorldReady((player) => {
  const cell = getCell(CELL_ID_B);
  if (!cell) { console.warn('[wrigley-game] bowl cell missing — skipping'); return; }
  root = cell.root;

  state.gameHomers = state.gameHomers || 0;
  state.hotDogs = state.hotDogs || 0;
  state.stretchesSungIn = state.stretchesSungIn || 0;
  state.halfInningsWatched = state.halfInningsWatched || 0;

  initBases();
  buildFielders();
  buildBattery();
  buildRunners();
  ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 7), bmat(0xf4f2ec)); ball.visible = false; root.add(ball);
  placeCrowd();
  buildSeats();
  buildVendor();
  buildNearRowFans();

  // new game: TOP 6, fresh prefill
  prefill();
  G.inning = 6; G.half = 'top'; G.batting = 'vis'; G.outs = 0; G.bases = [false, false, false];
  G.vis[5] = 0; G.phase = 'idle'; G.t = 4; halfStartT = 0;
  setHalfRigs(); placeRunners(); repaint();

  // dev/test hooks
  const bg = new URLSearchParams(location.search).get('bg');
  if (bg === 'homer') { G.inning = 6; G.half = 'bot'; G.batting = 'cubs'; if (G.cubs[5] == null) G.cubs[5] = 0; setHalfRigs(); G.phase = 'idle'; G.t = 1.2; G.devHomer = true; repaint(); }
  else if (bg === 'win') {
    G.vis = [1, 1, 1, 0, 0, 0, 0, 0, 0, null]; G.cubs = [1, 1, 0, 0, 0, 0, 0, 0, 0, null];   // vis leads by 1
    G.inning = 9; G.half = 'bot'; G.batting = 'cubs'; G.outs = 2; G.bases = [false, true, false];
    setHalfRigs(); placeRunners(); G.phase = 'idle'; G.t = 1.2; repaint();
  } else if (bg === 'stretch') {
    // fill through the 6th, jump to just-after-top-7, start the stretch mid-sway
    prefill(); G.vis[5] = 0 + ((RG() * 2) | 0); G.cubs[5] = 0 + ((RG() * 2) | 0); G.vis[6] = (RG() * 2) | 0;
    G.inning = 7; G.half = 'top'; G.batting = 'vis'; G.outs = 3;
    startStretch(); swayT = 2.0; swayRamp = 1;
  }

  journalSection('wrigley-game', 'The Box Score', () => `
    <div class="jrow"><span>Half-innings watched</span><b>${state.halfInningsWatched || 0}</b></div>
    <div class="jrow"><span>Homers watched</span><b>${state.gameHomers || 0}</b></div>
    <div class="jrow"><span>Hot dogs</span><b>${state.hotDogs || 0}</b></div>
    <div class="jrow"><span>Stretch sing-alongs</span><b>${state.stretchesSungIn || 0}</b></div>
    <div class="jrow"><span>Cubs wins seen</span><b>${state.cubsWinsSeen || 0}</b></div>`);

  if (bg === 'seat') sitDown(SEATS[0], true);

  registerUpdate((dt, t, pl) => {
    if (dt < 0) dt = 0;
    clockT = t;
    const inCell = activeCell() === CELL_ID_B;
    ensureAudio();
    // murmur bed slews (0.055 in-cell + swell / 0 off-cell); the whole PA bus
    // slews too, so anything already SCHEDULED on it (the stretch melody) dies
    // with the cell swap — an ejection mid-stretch must not serenade Clark St.
    if (murmurG) {
      if (murmurSwellT > 0) murmurSwellT -= dt;
      const tgt = inCell ? 0.055 + (murmurSwellT > 0 ? 0.05 : 0) : 0;
      murmurG.gain.value += (tgt - murmurG.gain.value) * Math.min(1, dt * 3);
      pa.gain.value += ((inCell ? 1 : 0) - pa.gain.value) * Math.min(1, dt * 3);
    }
    updateFxQueue();
    if (heldClearT && game.tNow >= heldClearT) { holdItem(null); heldClearT = 0; }

    if (!inCell) { if (seated) { standUp(); releaseT = 0; } return; }   // the lakefront hears/sees nothing

    // --- game clock (advances only in-cell) ---
    G.t -= dt;
    if (G.t <= 0) advancePhase();
    if (pendingT > 0) { pendingT -= dt; if (pendingT <= 0) { pendingBox = null; repaint(); } }

    // --- stretch sway clock + ramp ---
    if (G.phase === 'stretch') { swayT += dt; swayRamp = Math.min(1, swayRamp + dt); }

    // --- win: hoist the W over 3 s ---
    if (G.phase === 'win') { winT += dt; bowlWFlagSet(clamp(winT / 3, 0, 1)); }

    // --- crowd reactions to the ref chase (055 sync) ---
    reactToChase(pl);

    // --- timers ---
    if (eruptT > 0) eruptT -= dt;
    if (oohT > 0) oohT -= dt;

    // --- crowd wave (idle only, no play resolving) ---
    if (waveActive) {
      waveTh += (2 * Math.PI / 11) * dt; waveDist += (2 * Math.PI / 11) * dt;
      if (waveDist >= 4 * Math.PI) { waveActive = false; waveCd = 100 + RG() * 40; }
    } else {
      waveCd -= dt;
      if (waveCd <= 0 && G.phase === 'idle' && eruptT <= 0 && oohT <= 0) { waveActive = true; waveTh = BACK_B; waveDist = 0; }
    }

    // --- animation ---
    updateBatterSwing(dt);
    updateSprint(dt);
    stepBall(dt);
    updateFielders(dt, t);
    updateCrowdMode();
    stampCrowd(crowd, crowdPose);

    // --- vendor patrol + ambient one-shots ---
    updateVendor(dt);
    vendorT -= dt;
    if (vendorT <= 0) { vendorT = 18; if (Math.hypot(pl.x - vendor.group.position.x, pl.z - vendor.group.position.z) < 40) vendorCall(); }
    organT -= dt;
    if (organT <= 0) { organT = 35 + RG() * 20; if (G.phase === 'idle' || G.phase === 'between') { (RG() < 0.5 ? organNoodle : chargeCall)(); } }

    // --- seated / camera override ---
    if (seated) updateSeated(dt, pl);
    else if (releaseT > 0) updateRelease(dt, pl);
  });

  window.__wgame = {
    get phase() { return G.phase; },
    get inning() { return G.inning; },
    get half() { return G.half; },
    get outs() { return G.outs; },
    get score() { return { vis: total(G.vis), cubs: total(G.cubs) }; },
    get bases() { return baseCount(); },
    get seated() { return !!seated; },
    get mode() { return crowdMode; },
    get crowd() { return people.length; },
    get drought() { return G.drought; },
    get watched() { return state.halfInningsWatched || 0; },
  };
});
