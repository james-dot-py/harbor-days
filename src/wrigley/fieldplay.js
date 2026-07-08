// THE GAME ON THE FIELD — a live battery (pitcher/batter/catcher, full
// chibis) + three simplified outfielders, visible from the rooftops and
// the Sheffield knothole. One self-registered update drives a pitch
// cycle; gameday's bat CRACKs call swing() so contact is visible, and
// its homer launches from the plate. Local rng only (seed 1060714).
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon, bmat, mulberry32, clamp } from '../core.js';
import { registerUpdate, createChibi } from '../framework.js';
import { activeCell } from '../cells.js';
import { wrigleyRoot } from './index.js';
import { STADIUM_W } from '../data/wrigleyville.js';

const R = mulberry32(1060714);
const HP = STADIUM_W.homePlate, CF = STADIUM_W.centerField;
const AXIS = Math.atan2(CF[0] - HP[0], CF[1] - HP[1]);
const u = [Math.sin(AXIS), Math.cos(AXIS)], v = [u[1], -u[0]];
const at = (a, l) => [HP[0] + u[0] * a + v[0] * l, HP[1] + u[1] * a + v[1] * l];
export const PLATE = { x: HP[0], z: HP[1], y: 1.1 };   // gameday's homer launch point

const CUBS = { suit: 0xe9eaee, pants: 0xe4e5ea, skin: 0xc99a6a, hair: 0x1c3f6e };  // pinstripe white, blue cap
const AWAY = { suit: 0x9aa0a8, pants: 0x8f959d, skin: 0xb98a62, hair: 0x8f2430 };  // road gray, red cap

let pitcher = null, batter = null, catcher = null, bat = null, pitchBall = null;
const cyc = { t: 5, phase: 'idle', ballT: 0, swingT: -1, from: null, to: null, dur: 0.42 };

function placeChibi(pal, a, l, faceYaw, scale = 0.8) {
  const { group, parts } = createChibi({ ...pal, scale });
  const p = at(a, l);
  group.position.set(p[0], 0.22, p[1]);
  group.rotation.y = faceYaw;
  wrigleyRoot.add(group);
  return { group, parts };
}

export function buildFieldplay() {
  const mergeGeos = arr => BufferGeometryUtils.mergeBufferGeometries(arr.map(g => g.index ? g.toNonIndexed() : g), false);
  pitcher = placeChibi(CUBS, 12.9, 0, AXIS - Math.PI);        // on the mound, facing home
  batter = placeChibi(AWAY, 0.2, 1.05, AXIS - Math.PI / 2 - 0.35);
  catcher = placeChibi(CUBS, -1.7, 0, AXIS);                  // facing the mound
  // catcher crouch
  catcher.group.position.y -= 0.36;
  catcher.parts.legL.rotation.x = 1.35; catcher.parts.legR.rotation.x = 1.35;
  catcher.parts.armL.rotation.x = -0.9; catcher.parts.armR.rotation.x = -0.9;
  // the bat, in the batter's hands
  bat = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 1.05).translate(0, 0, 0.5), toon(0xb98a52));
  bat.rotation.set(-0.7, 0.3, 0);
  batter.parts.handR.add(bat);
  batter.parts.armR.rotation.x = -1.9; batter.parts.armL.rotation.x = -1.6;   // bat up, ready
  // three simplified outfielders (one merged mesh each — they read at 40 m)
  for (const da of [-0.42, 0.03, 0.45]) {
    const body = new THREE.SphereGeometry(0.5, 9, 8); body.scale(0.85, 1.15, 0.7); body.translate(0, 1.05, 0);
    const head = new THREE.SphereGeometry(0.4, 9, 8); head.translate(0, 1.95, 0);
    const capG = new THREE.SphereGeometry(0.42, 9, 6, 0, Math.PI * 2, 0, 1.1); capG.translate(0, 2.0, 0);
    const legs = new THREE.BoxGeometry(0.55, 0.7, 0.3); legs.translate(0, 0.35, 0);
    const mSkin = mergeGeos([head]);
    const mBody = mergeGeos([body, legs]);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(mBody, toon(CUBS.suit)));
    g.add(new THREE.Mesh(mSkin, toon(CUBS.skin)));
    g.add(new THREE.Mesh(capG, toon(CUBS.hair)));
    const a = AXIS + da, r = 39 + R() * 4;
    g.position.set(HP[0] + Math.sin(a) * r, 0.22, HP[1] + Math.cos(a) * r);
    g.rotation.y = a - Math.PI;                               // face home
    g.userData.sway = R() * 6.28;
    g.userData.live = true;                                   // the update() sways/rotates this — exempt from the cell merge
    wrigleyRoot.add(g);
    fielders.push(g);
  }
  pitchBall = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 7), bmat(0xf4f2ec));
  pitchBall.visible = false; pitchBall.userData.live = true;   // the update() flies this around — exempt from the cell merge
  wrigleyRoot.add(pitchBall);
  registerUpdate(update);
}
const fielders = [];

// the visible swing — gameday calls this on every bat CRACK
export function swing() {
  if (!batter) return;
  cyc.swingT = 0;
  // if a pitch is inbound, line it out toward a fielder
  if (cyc.phase === 'pitch') {
    const f = fielders[(R() * fielders.length) | 0];
    cyc.from = [pitchBall.position.x, 1.3, pitchBall.position.z];
    cyc.to = [f.position.x, 1.6, f.position.z];
    cyc.ballT = 0; cyc.dur = 1.1; cyc.phase = 'liner';
  }
}

function lerpBall(dt, arcH) {
  cyc.ballT += dt;
  const k = clamp(cyc.ballT / cyc.dur, 0, 1);
  pitchBall.position.set(
    cyc.from[0] + (cyc.to[0] - cyc.from[0]) * k,
    cyc.from[1] + (cyc.to[1] - cyc.from[1]) * k + Math.sin(k * Math.PI) * arcH,
    cyc.from[2] + (cyc.to[2] - cyc.from[2]) * k);
  return k >= 1;
}

function update(dt, t) {
  if (activeCell() !== 'wrigleyville' || !pitcher) return;
  // fielders sway
  for (const f of fielders) f.rotation.z = Math.sin(t * 0.8 + f.userData.sway) * 0.045;
  // batter swing anim (0.3 s whip + 0.5 s reset)
  if (cyc.swingT >= 0) {
    cyc.swingT += dt;
    const k = cyc.swingT;
    if (k < 0.3) {
      batter.group.rotation.y = AXIS - Math.PI / 2 - 0.35 + (k / 0.3) * 2.1;
      batter.parts.armR.rotation.x = -1.9 + (k / 0.3) * 1.7;
      batter.parts.armL.rotation.x = -1.6 + (k / 0.3) * 1.5;
    } else if (k < 0.9) {
      const b = (k - 0.3) / 0.6;
      batter.group.rotation.y = AXIS - Math.PI / 2 - 0.35 + (1 - b) * 2.1;
      batter.parts.armR.rotation.x = -0.2 - b * 1.7;
      batter.parts.armL.rotation.x = -0.1 - b * 1.5;
    } else { cyc.swingT = -1; }
  }
  // pitch cycle
  cyc.t -= dt;
  if (cyc.phase === 'idle' && cyc.t <= 0) {
    cyc.phase = 'windup'; cyc.t = 0.55;
    pitcher.parts.armR.rotation.x = -2.7;                     // wind up
  } else if (cyc.phase === 'windup' && cyc.t <= 0) {
    pitcher.parts.armR.rotation.x = 0.6;                      // release
    const m = at(11.6, 0), p = at(-1.2, 0);
    cyc.from = [m[0], 1.55, m[1]]; cyc.to = [p[0], 0.95, p[1]];
    cyc.ballT = 0; cyc.dur = 0.45; cyc.phase = 'pitch';
    pitchBall.visible = true;
  } else if (cyc.phase === 'pitch') {
    if (lerpBall(dt, 0.35)) {                                 // caught — throw it back
      const m = at(11.6, 0), p = at(-1.2, 0);
      cyc.from = [p[0], 0.95, p[1]]; cyc.to = [m[0], 1.55, m[1]];
      cyc.ballT = 0; cyc.dur = 0.9; cyc.phase = 'return';
      catcher.parts.armR.rotation.x = -2.2;
    }
  } else if (cyc.phase === 'return') {
    if (lerpBall(dt, 1.4)) {
      pitchBall.visible = false; catcher.parts.armR.rotation.x = -0.9;
      pitcher.parts.armR.rotation.x = 0;
      cyc.phase = 'idle'; cyc.t = 6.5 + R() * 4;
    }
  } else if (cyc.phase === 'liner') {
    if (lerpBall(dt, 6)) {
      pitchBall.visible = false;
      cyc.phase = 'idle'; cyc.t = 6.5 + R() * 4;
      pitcher.parts.armR.rotation.x = 0;
    }
  }
}
