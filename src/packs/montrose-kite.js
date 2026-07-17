// =====================================================================
//  FLY A KITE — Cricket Hill (task 074, the marquee delight). Nothing else
//  in the game FLIES. Climb the north side's favorite kite mound, press E /
//  ✋ at the summit, HOLD to wind up the launch, and RELEASE: your kite
//  climbs out over the lake on the wind with the line running from your
//  hand. A session camera (the driving-range swing precedent, issue 015)
//  frames the mayor small at the base and the kite riding high against the
//  dusk sky. Reel it in (E / ✋) — or it reels itself after a while — and
//  the camera eases back onto the chase cam with no snap.
//
//  Only-my-file rules: one import line in packs/index.js, no shared edits.
//  All setup inside onWorldReady. The kite rig is a handful of self-lit
//  (bmat) INDIVIDUAL meshes built ONCE and hidden until launch (+0
//  InstancedMesh buckets; frustum-culled, drawn only when the summit is in
//  view). NO shared rng — the mound is far north (z≈-879), determinism-safe.
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, registerUpdate, addInteraction, chargeThrow, toast,
         journalSection, state, getAudioCtx, bag, wallet } from '../framework.js';
import { scene, camera, toon, bmat, clamp, lerp, lerpAngle } from '../core.js';
import { cam } from '../input.js';
import { mayor, mparts } from '../character.js';
import { CRICKET_HILL } from '../data/chicago.js';

// summit stand — on the flat top, clear of the 073 kite-flyer NPCs (106/117/120)
const ANCHOR = { x: 108, z: -880 };
const hillH = (x, z) => { const H = CRICKET_HILL;
  const dx = (x - H.cx) / H.rx, dz = (z - H.cz) / H.rz, u = Math.hypot(dx, dz);
  if (u >= 1) return 0; const s = 1 - u; return H.height * s * s * (3 - 2 * s); };
const SUMMIT_Y = hillH(ANCHOR.x, ANCHOR.z);            // ≈ 6.66
const HAND = { x: ANCHOR.x + 0.4, y: SUMMIT_Y + 1.9, z: ANCHOR.z };   // where the line ties on
const YAW_E = Math.PI / 2;                             // face EAST (+x) — fly the kite out over the lake

// camera framing — over-the-shoulder from the WEST + a touch south, pulled back
// far enough that BOTH the mayor (lower third, his back to us) and the kite (upper
// third) fit inside the 50° FOV, with the line rising between them against the
// eastern dusk sky. Aim rides the column midpoint (recomputed each frame).
const CAM_BACK = 18, CAM_SIDE = 3.5, CAM_Y = SUMMIT_Y + 4.5;

// a soft wind gust on launch (guarded, ramped — 100% synth)
function sGust(){
  const { actx, sfxBus, noiseBuf } = getAudioCtx(); if(!actx || !noiseBuf) return;
  const t = actx.currentTime;
  const s = actx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 620; f.Q.value = 0.7;
  const g = actx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
  s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + 1.4);
}

onWorldReady((player) => {
  state.kitesFlown = state.kitesFlown || 0;
  state.kiteBest = state.kiteBest || 0;                 // best release power, %

  // ------------------------- the kite rig (built once) -------------------------
  // A pivot at the hand; a string cylinder up to a diamond kite. Self-lit so it
  // POPS on the sky (the 044 toon-green-underside pitfall — matches 073's flyers).
  const KITE_COL = 0xff5a4d;
  const pivot = new THREE.Group();
  pivot.position.set(HAND.x, HAND.y, HAND.z);
  pivot.visible = false;
  scene.add(pivot);

  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 4), bmat(0x2b2b2b));
  pivot.add(string);

  const kite = new THREE.Group();
  pivot.add(kite);
  // diamond sail in the local YZ-ish plane, broad face toward −X (the flyer/camera,
  // to the west); DoubleSide + self-lit
  const dpos = [0, 1.05, 0,  0, 0, 0.72,  0, -1.15, 0,  0, 0, -0.72];
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.Float32BufferAttribute(dpos, 3));
  dg.setIndex([0, 1, 2, 0, 2, 3]); dg.computeVertexNormals();
  const sail = new THREE.Mesh(dg, bmat(KITE_COL, { side: THREE.DoubleSide }));
  kite.add(sail);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.2, 0.05), bmat(0x2a2a2a));
  spine.position.y = -0.05; kite.add(spine);
  const spar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.44), bmat(0x2a2a2a));
  kite.add(spar);
  const tailCol = [0xffffff, KITE_COL, 0xffffff];
  let midBow = null;
  for (let b = 0; b < 3; b++) {
    const bow = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.34), bmat(tailCol[b], { side: THREE.DoubleSide }));
    bow.position.set(0.02, -1.35 - b * 0.55, (b % 2 ? 0.22 : -0.22));
    bow.rotation.x = (b % 2 ? -0.5 : 0.5); kite.add(bow);
    if (b === 1) midBow = bow;
  }
  // 080: owning the kiosk's kite bundle makes the summit flight YOUR kite — the
  // sail (and its matching tail bow) turns the bundle's teal on launch.
  const OWN_COL = 0x2aa6a0;

  // ------------------------------ flight session ------------------------------
  // phases: 'ascend' (hand→aloft), 'aloft' (holds + sways), 'reel' (aloft→hand),
  // 'release' (camera eases back onto the chase cam). tUp/tLean lerp toward targets.
  const sess = { active: false, phase: 'off', seed: false, t: 0, relT: 0,
                 up: 0, lean: 0, upTgt: 0, leanTgt: 0 };
  // scratch (hoisted — zero per-frame allocation)
  const _cp = new THREE.Vector3(), _ct = new THREE.Vector3(),
        _dP = new THREE.Vector3(), _dT = new THREE.Vector3();

  function launchKite(power){
    const own = bag.has('kite');                        // 080: the kiosk bundle = your own kite
    sail.material.color.set(own ? OWN_COL : KITE_COL);
    if (midBow) midBow.material.color.set(own ? OWN_COL : KITE_COL);
    sess.active = true; sess.phase = 'ascend'; sess.seed = true; sess.t = 0;
    sess.up = 1.2; sess.lean = 0.3;                     // starts near the hand
    sess.upTgt = 8 + power * 5;                         // ~8..13 m — matches the ambient flyers' kites
    sess.leanTgt = 3 + power * 2.5;                     // ~3..5.5 m lakeward lean
    pivot.visible = true;
    flyInter.enabled = false; reelInter.enabled = true;
    state.kitesFlown++; state.kiteBest = Math.max(state.kiteBest, Math.round(power * 100));
    sGust();
    toast('UP SHE GOES', own ? "your kite — the wind's got it. reel in when you're done"
                             : "the wind's got it — reel in when you're done");
    wallet.pay({ key: 'kite', first: 5, repeat: 2, reason: 'flew a kite', firstReason: 'first flight!', label: 'kites', cd: 10 });
  }
  function beginReel(){
    if(sess.phase === 'ascend' || sess.phase === 'aloft'){
      sess.phase = 'reel'; reelInter.enabled = false;
    }
  }

  // interactions: fly (idle) + reel-in (during flight only)
  const flyInter = addInteraction({ x: ANCHOR.x, z: ANCHOR.z, r: 3.4, label: 'fly a kite',
    onUse: () => { if(!sess.active) chargeThrow({ onRelease: launchKite }); } });
  const reelInter = addInteraction({ x: ANCHOR.x, z: ANCHOR.z, r: 40, priority: 5,
    label: 'reel it in', onUse: beginReel });
  reelInter.enabled = false;

  // --------------------------------- per frame --------------------------------
  let labelAcc = 0;
  registerUpdate((dt, t, pl) => {
    // 080: the prompt says whose kite flies (throttled — no per-frame bag reads)
    labelAcc -= dt;
    if(labelAcc <= 0){ labelAcc = 1.2; if(!sess.active) flyInter.setLabel(bag.has('kite') ? 'fly YOUR kite' : 'fly a kite'); }
    if(!sess.active) return;
    sess.t += dt;

    if(sess.phase !== 'release'){
      // pin the player at the summit stand (like the sit / driving-range bay) so
      // the framing is stable and the reel-in prompt stays in range
      pl.x = ANCHOR.x; pl.z = ANCHOR.z; pl.vx = 0; pl.vz = 0;
      mayor.position.set(ANCHOR.x, SUMMIT_Y, ANCHOR.z);
      mayor.rotation.y = lerpAngle(mayor.rotation.y, YAW_E, 1 - Math.exp(-6 * dt));
      // right arm reaches up toward the line (main.js posed the mayor first; we win)
      mparts.armR.rotation.x = -2.25; mparts.armR.rotation.z = 0.14;
      mparts.armL.rotation.x = -0.2;
    }

    // phase machine
    if(sess.phase === 'ascend'){
      sess.up = lerp(sess.up, sess.upTgt, 1 - Math.exp(-2.2 * dt));
      sess.lean = lerp(sess.lean, sess.leanTgt, 1 - Math.exp(-2.2 * dt));
      if(sess.up > sess.upTgt - 0.4){ sess.phase = 'aloft'; sess.t = 0; }
    } else if(sess.phase === 'aloft'){
      if(sess.t > 16) beginReel();                     // never strand: auto-reel
    } else if(sess.phase === 'reel'){
      sess.up = lerp(sess.up, 1.0, 1 - Math.exp(-3.0 * dt));
      sess.lean = lerp(sess.lean, 0.2, 1 - Math.exp(-3.0 * dt));
      if(sess.up < 1.5){                               // home — end the flight
        pivot.visible = false; sess.phase = 'release'; sess.relT = 0;
        flyInter.enabled = true;
        toast('NICE FLIGHT', 'best wind-up: ' + state.kiteBest + '%');
      }
    }

    // place string + kite for the current up/lean (kite leans EAST, +x local)
    const up = sess.up, lean = sess.lean, L = Math.hypot(up, lean) || 0.01;
    string.scale.y = L; string.position.set(lean / 2, up / 2, 0);
    string.rotation.z = -Math.atan2(lean, up);
    kite.position.set(lean, up, 0);
    // gentle wind life
    const sway = Math.sin(t * 0.7) * 0.11, flut = Math.sin(t * 1.5) * 0.16;
    pivot.rotation.z = sway;
    pivot.rotation.x = Math.sin(t * 0.9) * 0.06;
    kite.rotation.x = flut;

    // ------------------------------ session camera ------------------------------
    if(sess.phase === 'release'){                       // reconstruct main.js's chase pos, ease on
      sess.relT += dt;
      const dp = Math.max(0, cam.pitch), hz = Math.cos(dp) * cam.dist;
      _dP.set(pl.x - Math.sin(cam.yaw) * hz, Math.max(pl.y + 0.55, (pl.y + 1.6) + Math.sin(dp) * cam.dist), pl.z - Math.cos(cam.yaw) * hz);
      _dT.set(pl.x, pl.y + 1.7, pl.z);
    } else {
      // behind (west) + a touch south, low; look partway up the line so the mayor
      // AND the kite both read against the eastern sky
      _dP.set(ANCHOR.x - CAM_BACK, CAM_Y, ANCHOR.z + CAM_SIDE);
      // aim at the column midpoint (mayor feet ≈ SUMMIT_Y → kite top ≈ HAND.y+up):
      // the mayor sits in the lower third, the kite in the upper third
      _dT.set(HAND.x + lean * 0.5, 7.6 + up * 0.5, HAND.z);
    }
    if(sess.seed){ _cp.copy(camera.position); _ct.set(pl.x, pl.y + 1.6, pl.z); sess.seed = false; }
    const kP = sess.phase === 'release' ? 8 : 4, kT = sess.phase === 'release' ? 8 : 4;
    _cp.lerp(_dP, 1 - Math.exp(-kP * dt));
    _ct.lerp(_dT, 1 - Math.exp(-kT * dt));
    camera.position.copy(_cp);
    camera.lookAt(_ct);
    if(sess.phase === 'release' && sess.relT > 0.5){ sess.active = false; sess.phase = 'off'; }
  });

  // -------------------------------- journal --------------------------------
  journalSection('montrose-kite', 'Kites 🪁', () => `
    <div class="jrow"><span>Kites flown</span><b>${state.kitesFlown}</b></div>
    <div class="jrow"><span>Best wind-up</span><b>${state.kiteBest}%</b></div>
    <div class="jrow"><span>Cricket Hill</span><b>the north side's kite mound</b></div>`);
});
