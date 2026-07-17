// =====================================================================
// INSIDE WRIGLEY (task 055) — get a ticket, walk the honest door, roam
// the bowl (game day live — see wrigley-game.js, 064), and the
// field-trespass ref chase.
//
// The owner's design, implemented exactly: the field is physically
// enterable (three open gates in the low wall — no invisible walls);
// stepping onto the GRASS wakes the ump, who chases at a pace between
// walk (4.2) and sprint (9.5) — catchable if you dawdle, escapable if
// you hustle. Tagged → whistle, fade, 'EJECTED', deposited outside the
// Marquee Gate, ticket gone. Ejection is the punchline, not a punishment:
// the box office is right there. Off the grass in time → he pulls up,
// dusts his cap, walks back to his post ("...and STAY off the grass").
//
// Ticket at the BOX OFFICE (the wrigleyville notchS/clark ticket-office
// mass); the Clark & Addison Marquee Gate is the honest door (fade →
// 'wrigley-bowl' pocket cell — the redline-car pattern). No per-frame
// allocations; all audio synthesized + actx-guarded; local rng only.
// =====================================================================
import * as THREE from 'three';
import { toon, bmat, lerpAngle } from '../core.js';
import { onWorldReady, registerUpdate, addInteraction, makeNPC,
         toast, journalSection, state, screenFx, holdItem, getAudioCtx, wallet } from '../framework.js';
import { setActiveCell, activeCell } from '../cells.js';
import { camCtl } from '../main.js';
import { cam } from '../input.js';
import { buildWrigleyBowl } from '../wrigley/bowl.js';
import { CELL_ID_B, HP_B, AXIS_B, BACK_B, rWallB, kindAtB, surfaceYB,
         WALL_T_B, CONC_W_B, ROWS_B, CLAMP_B, SPAWN_B } from '../data/wrigley-bowl.js';
import { STADIUM_W } from '../data/wrigleyville.js';

const at = (r, th) => [HP_B[0] + Math.sin(th) * r, HP_B[1] + Math.cos(th) * r];
const wrapA = a => ((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

// outside-the-gate anchors (wrigleyville frame). camYaw 2.49 looks back NE
// AT the gate: the camera lands SW in the open Clark & Addison intersection
// (yaw −0.9 parked it INSIDE the marquee-corner mass — buried frame) and the
// ejected mayor reads against the gate + marquee: the walk-of-shame shot.
const GATE_OUT = { x: -280, z: -416.5, camYaw: 2.49 };          // marquee apron, verified walkableW
const BOX_OFFICE = { x: -283.9, z: -448.2 };                    // plaza side of the ticket-office sign
const MARQUEE_GATE = STADIUM_W.gates.marquee;

// ------------------------------ audio ----------------------------------
function whistle(long = false) {
  const A = getAudioCtx(); if (!A.actx) return;
  const t0 = A.actx.currentTime;
  const blasts = long ? [[0, 0.42], [0.52, 0.72]] : [[0, 0.4]];
  for (const [dt, dur] of blasts) {
    const o = A.actx.createOscillator(); o.type = 'square'; o.frequency.value = 2280;
    const trem = A.actx.createOscillator(); trem.type = 'sine'; trem.frequency.value = 33;  // the pea
    const tg = A.actx.createGain(); tg.gain.value = 0.045;
    const g = A.actx.createGain();
    g.gain.setValueAtTime(0.0001, t0 + dt);
    g.gain.exponentialRampToValueAtTime(0.075, t0 + dt + 0.02);
    g.gain.setValueAtTime(0.075, t0 + dt + dur - 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + dur);
    trem.connect(tg); tg.connect(g.gain);
    o.connect(g); g.connect(A.sfxBus);
    o.start(t0 + dt); o.stop(t0 + dt + dur + 0.05);
    trem.start(t0 + dt); trem.stop(t0 + dt + dur + 0.05);
  }
}
function turnstile() {
  const A = getAudioCtx(); if (!A.actx) return;
  const t0 = A.actx.currentTime;
  A.noiseHit(t0, 0.05, 'highpass', 1800, 1.2, 0.05);
  A.noiseHit(t0 + 0.12, 0.06, 'bandpass', 900, 2, 0.05);
}
// a single quiet organ chord — the empty ballpark hum (cathedral register)
function quietOrgan() {
  const A = getAudioCtx(); if (!A.actx) return;
  const t0 = A.actx.currentTime;
  for (const [f, amp] of [[262, 0.05], [330, 0.04], [392, 0.045], [523, 0.025]]) {
    const o = A.actx.createOscillator(), g = A.actx.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(amp, t0 + 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
    o.connect(g); g.connect(A.musicBus); o.start(t0); o.stop(t0 + 3.4);
  }
}

// --------------------------- one-shot timeline --------------------------
const seq = []; let seqT = -1;
function runSeq(steps) { seq.length = 0; steps.forEach(s => seq.push(s)); seqT = 0; }

// ------------------------------ the ticket ------------------------------
let stub = null;
function ticketStub() {
  if (stub) return stub;
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#f4efe6'; g.fillRect(0, 0, 128, 64);              // cream card
  g.fillStyle = '#b0202c'; g.fillRect(0, 0, 128, 16);              // red header band
  g.fillStyle = '#1c4a35'; g.fillRect(96, 16, 4, 48);              // green tear line
  g.fillStyle = '#1c4a35'; g.beginPath(); g.arc(48, 40, 12, 0, 7); g.fill();  // green seal
  stub = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15),
    bmat(0xffffff, { map: new THREE.CanvasTexture(cv), side: THREE.DoubleSide }));
  stub.position.set(0, 0.22, 0.05); stub.rotation.x = -0.6;
  return stub;
}
function grantTicket() {
  state.wrigleyTicket = true;
  state.wrigleyTickets = (state.wrigleyTickets || 0) + 1;
  holdItem(ticketStub());
  turnstile();
}
function loseTicket() {
  state.wrigleyTicket = false;
  if (stub && stub.parent) holdItem(null);
}

// --------------------------- enter / exit -------------------------------
let transiting = false;
function enterBowl(p) {
  if (transiting) return;
  if (!state.wrigleyTicket) {
    toast('YOU NEED A TICKET', 'box office — south end of Gallagher Way, on Clark');
    return;
  }
  transiting = true;
  turnstile();
  runSeq([
    { at: 0.05, fn: () => screenFx.filter('brightness(0)', 1400) },
    { at: 0.7, fn: () => {
      setActiveCell(CELL_ID_B);
      p.x = SPAWN_B.x; p.z = SPAWN_B.z; p.y = 0; p.vx = p.vz = 0;
      cam.yaw = AXIS_B; cam.pitch = 0.07; cam.dist = 5.5; camCtl.snap = true;
      state.bowlVisits = (state.bowlVisits || 0) + 1;
      quietOrgan();
    } },
    { at: 1.6, fn: () => {
      transiting = false;
      if (state.bowlVisits === 1) toast('WRIGLEY FIELD', 'game day — the friendly confines');
      else toast('WRIGLEY FIELD', 'game day — welcome back');
    } },
  ]);
}
function exitBowl(p, ejected) {
  if (transiting) return;
  transiting = true;
  runSeq([
    { at: 0.05, fn: () => screenFx.filter('brightness(0)', ejected ? 1500 : 1200) },
    { at: 0.65, fn: () => {
      setActiveCell('wrigleyville');
      p.x = GATE_OUT.x; p.z = GATE_OUT.z; p.y = 0; p.vx = p.vz = 0;
      cam.yaw = GATE_OUT.camYaw; cam.pitch = 0.1; cam.dist = 8; camCtl.snap = true;
      if (ejected) loseTicket();
      refReset();
    } },
    { at: 1.45, fn: () => {
      transiting = false;
      if (ejected) {
        toast('EJECTED', (state.ejections || 0) >= 3
          ? 'banned? never. persistent? yes.'
          : "no fans on the field — box office is right there");
        // comedy pays — the biggest single payout in the park (task 079)
        wallet.pay({ key: 'wrigley.eject', first: 10, repeat: 3, reason: 'Wrigley: ejected — worth it',
          firstReason: 'Wrigley: EJECTED. worth it.', label: 'Wrigley' });
      }
      else toast('SEE YA AT THE CORNER', 'Clark & Addison');
    } },
  ]);
}

// ------------------------------ the ref ---------------------------------
// An ump at his post on the warning track by the home-plate gate. States:
// post → alert (whistle windup) → chase → dust (pulls up, dusts his cap) →
// return → post. Tag radius 1.05. All movement in plain scalars — no
// per-frame allocations.
let ref = null, refState = 'post', refT = 0;

// 081 favors ('umpwhistle', favors-wrigley.js) — additive, read-only hook.
// Filled in onWorldReady below with {npc, refState:()=>state}; changes ZERO
// existing behavior. The favor pack gates its offer on refState()==='post'.
export const umpHooks = {};
// ?slowref=1 (headless-shot knob, like ?gd=): page game-time at screenshot
// varies wildly under vite/SwiftShader contention (2.6 s .. 15 s+ observed),
// and the ump TAGS a dev-spawned trespasser before slow shots land — wb-chase
// frames came back post-eject exterior (055 pitfall, re-hit in 064; slowing
// him wasn't enough — a 16 s page still tagged). With the knob he sprints at
// full speed but PULLS UP 2.2 m short and never tags: any load timing yields
// a mid-pursuit (or looming-right-behind) frame. Gameplay untouched.
const SHOT_NOTAG = !!new URLSearchParams(location.search).get('slowref');
const REF_V = 6.9, RETURN_V = 2.7, TAG_R = 1.05;
const POST = (() => {
  const th = BACK_B + 0.3, [x, z] = at(rWallB(th) - 1.3, th);
  return { x, z, ry: wrapA(th + Math.PI) };                      // faces the field
})();
function refReset() {
  refState = 'post'; refT = 0;
  if (ref) {
    ref.group.position.set(POST.x, 0, POST.z);
    ref.group.rotation.y = POST.ry;
    ref.sp = 0; ref.setFace('normal');
    if (ref.tgt) ref.tgt = null;
  }
}
function updateRef(dt, p) {
  if (!ref) return;
  const g = ref.group;
  const onGrass = kindAtB(p.x, p.z) === 'grass';
  if (refState === 'post') {
    ref.sp = 0;
    if (onGrass && !transiting) {
      refState = 'alert'; refT = 0.38;
      whistle();
      ref.say('HEY! off the grass!');
      ref.setFace('surprised');
      state.refChases = (state.refChases || 0) + 1;
    }
  } else if (refState === 'alert') {
    refT -= dt;
    g.rotation.y = lerpAngle(g.rotation.y, Math.atan2(p.x - g.position.x, p.z - g.position.z), 1 - Math.exp(-10 * dt));
    if (refT <= 0) refState = 'chase';
  } else if (refState === 'chase') {
    if (transiting) { refReset(); return; }
    if (!onGrass) {                                              // escaped — pull up, dust the cap
      refState = 'dust'; refT = 1.25; ref.sp = 0;
      ref.say('...and STAY off the grass');
      ref.setFace('happy');
      state.refEscapes = (state.refEscapes || 0) + 1;
      return;
    }
    const dx = p.x - g.position.x, dz = p.z - g.position.z, d = Math.hypot(dx, dz);
    if (d < (SHOT_NOTAG ? 2.2 : TAG_R)) {
      if (SHOT_NOTAG) {                                          // shot knob: loom, never tag
        ref.sp = REF_V;
        g.rotation.y = lerpAngle(g.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-12 * dt));
        return;
      }
      whistle(true);                                             // TAGGED
      state.ejections = (state.ejections || 0) + 1;
      exitBowl(p, true);
      return;
    }
    const step = Math.min(d, REF_V * dt);
    g.position.x += dx / d * step; g.position.z += dz / d * step;
    g.rotation.y = lerpAngle(g.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-12 * dt));
    ref.sp = REF_V;                                              // full-swing run anim
  } else if (refState === 'dust') {
    refT -= dt; ref.sp = 0;
    if (refT <= 0) { refState = 'return'; ref.setFace('normal'); }
  } else if (refState === 'return') {
    const dx = POST.x - g.position.x, dz = POST.z - g.position.z, d = Math.hypot(dx, dz);
    if (d < 0.2) { refReset(); return; }
    const step = Math.min(d, RETURN_V * dt);
    g.position.x += dx / d * step; g.position.z += dz / d * step;
    g.rotation.y = lerpAngle(g.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-8 * dt));
    ref.sp = RETURN_V;
  }
}

// ------------------------------- setup ----------------------------------
onWorldReady((player) => {
  buildWrigleyBowl();

  // dev spawn (?x=&z=) inside the bowl clamp → activate the pocket + comp
  // ticket (walkthrough stands spawn in here). Runs AFTER wrigleyville's
  // x<−100 override (packs/index.js import order) so this one wins.
  if (player.x > CLAMP_B.xMin - 2 && player.x < CLAMP_B.xMax + 2 &&
      player.z > CLAMP_B.zMin - 2 && player.z < CLAMP_B.zMax + 2) {
    setActiveCell(CELL_ID_B);
    player.y = surfaceYB(player.x, player.z);
    state.wrigleyTicket = true;
    state.bowlVisits = (state.bowlVisits || 0) + 1;
  }

  // the ump — post on the warning track by the home-plate gate
  ref = makeNPC({
    x: POST.x, z: POST.z, ry: POST.ry, name: 'the ump',
    palette: { suit: 0x23252b, pants: 0x3a3d45, skin: 0xb98a62, hair: 0x2a2a2e, face: true },
    lines: ["field's for the players, bud", 'the ivy? 1937. the grass? off limits.',
            'ope — watch the chalk'],
  });
  umpHooks.npc = ref; umpHooks.refState = () => refState;   // 081: read-only exposure for favors-wrigley

  // BOX OFFICE — get a ticket (free, cozy). Priority 8: a real door/ticket
  // outranks the gameday sing-along zone (r 60, priority 6) that overlaps
  // the whole stadium block during the stretch window.
  addInteraction({
    x: BOX_OFFICE.x, z: BOX_OFFICE.z, r: 2.6, priority: 8,
    label: 'get a ticket — game day today',
    onUse: () => {
      if (state.wrigleyTicket) { toast("you've got yours", 'gates at Clark & Addison'); return; }
      grantTicket();
      toast('ONE TICKET', 'game day — enter at the Marquee Gate');
      wallet.pay({ key: 'wrigley.ticket', first: 6, repeat: 1, reason: 'Wrigley: got a ticket', label: 'Wrigley' });
    },
  });

  // the MARQUEE GATE — an honest door at last
  addInteraction({
    x: MARQUEE_GATE.x, z: MARQUEE_GATE.z, r: 2.8, priority: 8,
    label: 'enter Wrigley Field — game day',
    onUse: p => enterBowl(p),
  });

  // leave the ballpark — at the entry tunnel on the concourse behind home
  {
    const th = BACK_B, [x, z] = at(rWallB(th) + WALL_T_B + CONC_W_B + 1.6, th);
    addInteraction({ x, z, r: 2.4, priority: 8, label: 'leave the ballpark — Clark & Addison', onUse: p => exitBowl(p, false) });
  }

  // seats: game-day spectator seats are owned by wrigley-game.js (task 064)

  journalSection('wrigley-bowl', 'The Friendly Confines', () => `
    <div class="jrow"><span>Games attended</span><b>${state.bowlVisits || 0}</b></div>
    <div class="jrow"><span>Tickets torn</span><b>${state.wrigleyTickets || 0}</b></div>
    <div class="jrow"><span>Clean getaways</span><b>${state.refEscapes || 0}</b></div>
    <div class="jrow"><span>Ejections</span><b>${state.ejections || 0}</b></div>
    ${(state.ejections || 0) >= 3 ? '<div class="jrow"><i>banned? never. persistent? yes.</i></div>' : ''}`);

  registerUpdate((dt, t, p) => {
    if (seqT >= 0) {
      seqT += dt;
      let done = true;
      for (const s of seq) { if (!s.done && seqT >= s.at) { s.done = true; s.fn(); } if (!s.done) done = false; }
      if (done) seqT = -1;
    }
    if (activeCell() === CELL_ID_B) updateRef(dt, p);
    else if (refState !== 'post') refReset();
  });
});
