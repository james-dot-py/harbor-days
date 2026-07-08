// =====================================================================
//  PACK: wrigley-toys — the Wrigleyville "live props" pack (cell two).
//    1) ROOFTOP BINOCULARS — the coin-op viewer on the climbable roof.
//       Peering through it saves the camera, snaps a tight over-shoulder
//       framing aimed at the scoreboard/field, holds until the player
//       moves (or 5 s), then restores the camera exactly.
//    2) THROWABLE SOUVENIR BALL — once the player has grabbed a Waveland
//       homer (state.wrigleyBallsCaught rises), a broad "toss" zone over
//       Gallagher Way lets them wind up a charge-throw down the street:
//       the ball arcs on BALL_G-style physics, bounces twice, rests, then
//       fades. A distance banner reports the poke.
//
//  Only-my-file rules: no shared edits beyond one import line in
//  packs/index.js. ALL setup in onWorldReady. Own mulberry32 seed (62) so
//  the shared world rng / lakefront determinism is never perturbed. Meshes
//  ride wrigleyRoot (cell visibility culls them). EVERYTHING gated on
//  activeCell()==='wrigleyville'. Camera writes ONLY via the ride pack's
//  pattern: cam from ../input.js + camCtl.snap from ../main.js, careful
//  save/restore. No walkability changes.
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, registerUpdate, addInteraction, chargeThrow,
         camForward, toast, screenFx, state } from '../framework.js';
import { bmat, mulberry32, pointsMat, clamp } from '../core.js';
import { activeCell } from '../cells.js';
import { wrigleyRoot } from '../wrigley/index.js';
import { clarkX } from '../data/wrigleyville.js';
import { cam, keys, joy } from '../input.js';
import { camCtl } from '../main.js';

// own rng — seed 62, isolated from the world rng (determinism constraint)
const R = mulberry32(62);

// ---- ball physics tuning (mirrors the gameday pack's feel) ----
const BALL_G = 20, BALL_GROUND = 0.18;

// ---- the coin-op binocular stand (from wrigley/rooftops.js buildClimbable:
//      cx = -212.5 (W1 center), bx = cx + 1.4, bz = b.z1 - 0.9) ----
const STAND = { x: -211.1, z: -508.9 };
const SCOREBOARD = { x: -212, z: -480 };            // aim target (data/wrigleyville scoreboard)

// ---- Gallagher Way toss zone (x = clarkX(z)+8..+32, z -494..-430) ----
const LAWN_CZ = -462;                               // mid of z -494..-430
const LAWN = { x: clarkX(LAWN_CZ) + 20, z: LAWN_CZ, r: 30 };

const inCell = () => activeCell() === 'wrigleyville';
function movementPressed() {
  return keys.has('w') || keys.has('a') || keys.has('s') || keys.has('d') ||
         keys.has('arrowup') || keys.has('arrowdown') || keys.has('arrowleft') || keys.has('arrowright') ||
         joy.len > 0.2;
}

// =====================================================================
//  1) ROOFTOP BINOCULARS — save / aim / hold / restore
// =====================================================================
const binoc = { active: false, t: 0, yaw: 0, pitch: 0, dist: 0 };

function peer(player) {
  if (!inCell() || binoc.active) return;             // guard re-entry
  binoc.yaw = cam.yaw; binoc.pitch = cam.pitch; binoc.dist = cam.dist;   // SAVE
  // the camera looks along +forward from behind the player: to LOOK at the
  // scoreboard, aim +forward at it → yaw = atan2(sx-px, sz-pz).
  cam.yaw = Math.atan2(SCOREBOARD.x - player.x, SCOREBOARD.z - player.z);
  cam.pitch = 0.05;
  cam.dist = 2.2;                                     // tight over-shoulder
  camCtl.snap = true;
  binoc.active = true; binoc.t = 0;
  toast('through the lenses', 'CUBS 3–2 · runner on first · 7th');
  screenFx.filter('contrast(1.05) saturate(1.1)', 5300);   // subtle "through glass" tint
}
function unpeer() {
  if (!binoc.active) return;
  cam.yaw = binoc.yaw; cam.pitch = binoc.pitch; cam.dist = binoc.dist;   // RESTORE
  camCtl.snap = true;
  binoc.active = false;
  screenFx.filter('none', 200);                      // drop the tint now on an early exit
}

// =====================================================================
//  2) THROWABLE SOUVENIR BALL — grant, charge, arc, bounce, rest, fade
// =====================================================================
let tossBall = null, tossMat = null, tossZone = null;
const toss = { active: false, phase: '', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
               bounces: 0, sx: 0, sz: 0, rest: 0 };

function buildTossBall() {
  tossBall = new THREE.Group();
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), bmat(0xffffff, { transparent: true }));
  tossMat = s.material; tossBall.add(s);
  // a warm glow point rides along (same trick as the gameday ball)
  const gp = new Float32Array([0, 0, 0]), aC = new Float32Array([1, 0.96, 0.85]), aS = new Float32Array([6.5]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(gp, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(aC, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(aS, 1));
  tossBall.add(new THREE.Points(geo, pointsMat()));
  tossBall.visible = false;
  wrigleyRoot.add(tossBall);
}

function grantToss() {
  if (tossZone) return;
  tossZone = addInteraction({
    x: LAWN.x, z: LAWN.z, r: LAWN.r, priority: 1,       // low: real place interactions win
    label: 'toss the souvenir ball', onUse: startToss,
  });
}
function startToss(player) {
  if (!inCell() || toss.active) return;
  chargeThrow({ onRelease: p => launchToss(player, p) });
}
function launchToss(player, p) {
  if (!inCell()) return;
  const f = camForward();                              // {x,z} unit along the camera aim
  const speed = 12 + 20 * p, vy = 5 + 7 * p;
  toss.x = player.x + f.x * 0.6; toss.y = player.y + 1.2; toss.z = player.z + f.z * 0.6;
  toss.sx = toss.x; toss.sz = toss.z;
  toss.vx = f.x * speed; toss.vz = f.z * speed; toss.vy = vy;
  toss.bounces = 0; toss.rest = 0; toss.phase = 'flight'; toss.active = true;
  tossMat.opacity = 1; tossBall.visible = true;
  tossBall.rotation.set(R() * 6.28, R() * 6.28, 0);    // cosmetic spin (own rng)
  tossBall.position.set(toss.x, toss.y, toss.z);
  state.ballTosses = (state.ballTosses || 0) + 1;
}
function restToss() {
  toss.phase = 'rest'; toss.rest = 0; toss.vx = toss.vz = 0;
  const d = Math.round(Math.hypot(toss.x - toss.sx, toss.z - toss.sz));
  const sub = d >= 35 ? 'Waveland power' : d >= 22 ? 'off the ivy' :
              d >= 12 ? 'a real poke' : 'lil dribbler';
  toast(d + ' m', sub);
}
function endToss() { toss.active = false; toss.phase = 'done'; if (tossBall) tossBall.visible = false; }
function updToss(dt) {
  if (!toss.active) return;
  if (toss.phase === 'rest') {
    toss.rest += dt;
    if (toss.rest > 6) tossMat.opacity = clamp(1 - (toss.rest - 6), 0, 1);   // fade after 6 s
    if (toss.rest >= 7) endToss();
    return;
  }
  toss.vy -= BALL_G * dt;
  toss.x += toss.vx * dt; toss.y += toss.vy * dt; toss.z += toss.vz * dt;
  if (toss.y <= BALL_GROUND) {
    toss.y = BALL_GROUND;
    if (toss.vy < 0) {
      if (toss.bounces < 2) { toss.vy = -toss.vy * 0.45; toss.vx *= 0.7; toss.vz *= 0.7; toss.bounces++; }
      else toss.vy = 0;
    }
    const fr = Math.exp(-2.6 * dt); toss.vx *= fr; toss.vz *= fr;   // rolling friction
    if (Math.hypot(toss.vx, toss.vz) < 0.5 && toss.vy <= 0) { restToss(); }
  }
  tossBall.position.set(toss.x, toss.y, toss.z);
}

// =====================================================================
//  wire it up
// =====================================================================
onWorldReady(() => {
  buildTossBall();
  state.ballTosses = state.ballTosses || 0;
  let prevCaught = state.wrigleyBallsCaught || 0;

  addInteraction({
    x: STAND.x, z: STAND.z, r: 2,
    label: 'peer through the binoculars — 25¢, on the house', onUse: peer,
  });

  // dev: ?toy=1 grants the toss before any catch (headless charge-throw test)
  if (new URLSearchParams(location.search).get('toy') === '1') grantToss();

  registerUpdate((dt) => {
    if (dt < 0) dt = 0;
    if (!inCell()) { if (binoc.active) binoc.active = false; return; }   // ride owns the cam off-cell

    // grant the souvenir toy the first time a homer ball is caught
    const caught = state.wrigleyBallsCaught || 0;
    if (caught > prevCaught) {
      toast('souvenir ball!', 'press E anywhere on the street to wind up a throw');
      grantToss();
    }
    prevCaught = caught;

    // binocular hold — end on any movement (after a brief grace) or 5 s
    if (binoc.active) {
      binoc.t += dt;
      if ((binoc.t > 0.2 && movementPressed()) || binoc.t >= 5) unpeer();
    }

    updToss(dt);
  });
});
