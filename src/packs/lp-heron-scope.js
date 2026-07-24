// =====================================================================
//  PACK: lp-heron-scope — SPOT THE NIGHT-HERON (task 118 DELIGHT, the heart).
//  The 117 pond already has the black-crowned night herons working the
//  shallows; THIS pack gives the player the birder's moment: a mounted
//  spotting SCOPE on the Nature Boardwalk trained on the hunched bird in the
//  SE reeds. Press E / ✋ ("look through the scope") and a session camera —
//  the nature.js binocular precedent — drops you into a round-vignette
//  eyepiece zoomed on the heron, with the real endangered-colony story on
//  the toast + journal. It's a LIFER: an Illinois-endangered bird that chose
//  the zoo pond and came home. Move / press E again to step back to the deck.
//
//  Only-my-file rules: this module + one import line in packs/index.js. The
//  scope tripod is a handful of merged/individual meshes under ONE 'zooanim'
//  group (fogcull exemption), culled with the pond-life. No shared edits, all
//  setup in onWorldReady, no world rng (Math.random for the eyepiece sway
//  only), all audio actx-guarded, no per-frame allocation.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, registerUpdate, addInteraction, toast,
         journalSection, getAudioCtx, wallet, state } from '../framework.js';
import { scene, camera, toon, lerp, clamp, baseFov } from '../core.js';
import { cam, keys, joy } from '../input.js';
import * as CH from '../data/chicago.js';

const merge = (a) => BufferGeometryUtils.mergeBufferGeometries(a, false);
const MOVE_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
function movingNow() { if (joy.len > 0.2) return true; for (const k of MOVE_KEYS) if (keys.has(k)) return true; return false; }

onWorldReady(() => {
  const SP = CH.LP_SOUTHPOND;
  const [hx, hz] = SP.herons.hunched;                 // the hunched bird in the SE shallows (-17,976)
  const HERON = new THREE.Vector3(hx, SP.waterY + 0.55, hz);   // aim at its head/upper body
  const SCOPE = { x: -20.5, z: 981 };                 // on the boardwalk deck, ~6 m SW of the heron
  const EYE_Y = 1.55, DECK_Y = 0.12;
  const bearing = Math.atan2(HERON.x - SCOPE.x, HERON.z - SCOPE.z);   // scope tube points at the heron

  // ---- the scope tripod (merged dark; +2 draws, culled) -----------------
  const grp = new THREE.Group(); grp.name = 'zooanim'; scene.add(grp);
  {
    const DARK = toon(0x2f3430), GLASS = toon(0x1c2a33);
    const g = new THREE.Group(); g.position.set(SCOPE.x, DECK_Y, SCOPE.z); g.rotation.y = bearing;
    // three splayed legs meeting under a head at y~1.15
    const legs = [];
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3;
      const leg = new THREE.CylinderGeometry(0.02, 0.03, 1.2, 5);
      leg.translate(0, -0.6, 0); leg.rotateX(0.28); leg.rotateY(a); leg.translate(Math.cos(a) * 0.02, 1.15, Math.sin(a) * 0.02);
      legs.push(leg);
    }
    legs.push(box(0.12, 0.10, 0.12, 0, 1.15, 0));     // head block
    // the scope TUBE, tilted down toward the water, pointing +z (the group faces the heron)
    const tube = new THREE.CylinderGeometry(0.055, 0.07, 0.62, 8);
    tube.rotateX(Math.PI / 2); tube.rotateX(0.15); tube.translate(0, 1.28, 0.14);
    const eyep = new THREE.CylinderGeometry(0.045, 0.045, 0.10, 7);
    eyep.rotateX(Math.PI / 2); eyep.rotateX(0.15); eyep.translate(0, 1.30, -0.16);
    g.add(new THREE.Mesh(merge([...legs, tube, eyep]), DARK));
    // objective glass at the front of the tube
    const obj = new THREE.CircleGeometry(0.05, 10); obj.rotateX(Math.PI / 2); obj.rotateX(0.15 + Math.PI / 2); obj.translate(0, 1.265, 0.45);
    g.add(new THREE.Mesh(obj, GLASS));
    grp.add(g);
  }
  function box(w, h, d, x, y, z) { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); return b; }

  // ---- the round-eyepiece VIGNETTE (DOM overlay, pointer-inert) ----------
  const wrap = document.createElement('div'); wrap.id = 'heronScope';
  Object.assign(wrap.style, { position: 'fixed', inset: '0', zIndex: '21', pointerEvents: 'none', display: 'none' });
  const vig = document.createElement('div');
  Object.assign(vig.style, { position: 'absolute', inset: '0', background: 'rgba(8,12,10,0.94)' });
  const mask = 'radial-gradient(circle at 50% 50%, transparent 0, transparent 27vh, #000 41vh)';
  vig.style.webkitMaskImage = mask; vig.style.maskImage = mask;
  wrap.appendChild(vig);
  const ret = document.createElement('div');
  Object.assign(ret.style, { position: 'absolute', left: '50%', top: '50%', width: '64px', height: '64px', transform: 'translate(-50%,-50%)' });
  ret.innerHTML =
    '<div style="position:absolute;left:50%;top:50%;width:64px;height:1px;background:rgba(255,255,255,.35);transform:translate(-50%,-50%)"></div>' +
    '<div style="position:absolute;left:50%;top:50%;width:1px;height:64px;background:rgba(255,255,255,.35);transform:translate(-50%,-50%)"></div>' +
    '<div style="position:absolute;left:50%;top:50%;width:20px;height:20px;border:1.5px solid rgba(255,255,255,.6);border-radius:50%;transform:translate(-50%,-50%)"></div>';
  wrap.appendChild(ret);
  document.body.appendChild(wrap);

  // ---- soft night-heron "quawk" (synth, guarded) ------------------------
  function quawk(vol) {
    const { actx, sfxBus } = getAudioCtx(); if (!actx) return;
    const t0 = actx.currentTime;
    const o = actx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(440, t0); o.frequency.exponentialRampToValueAtTime(205, t0 + 0.15);
    const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 850; bp.Q.value = 1.1;
    const g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
    o.connect(bp); bp.connect(g); g.connect(sfxBus); o.start(t0); o.stop(t0 + 0.24);
  }

  // ---- the scope session -------------------------------------------------
  state.heronScoped = state.heronScoped || 0;
  const sess = { active: false, ePrev: false, t: 0, wob: 0 };
  const _eye = new THREE.Vector3(), _aim = new THREE.Vector3();

  function enter() {
    if (sess.active) return;
    sess.active = true; sess.ePrev = true; sess.t = 0; sess.wob = 0;
    wrap.style.display = 'block';
    inter.enabled = false;
    state.heronScoped++;
    quawk(0.06);
    toast('a lifer', 'a black-crowned night-heron — Illinois-endangered, and it chose this pond');
    wallet.pay({ key: 'heron.scope', first: 6, repeat: 1, reason: 'spotted the night-heron',
      firstReason: 'a lifer — the night-heron', label: 'birdwatch', cd: 20 });
    if (state.birdsSeen && !state.birdsSeen.has('Black-crowned Night Heron')) state.birdsSeen.add('Black-crowned Night Heron');
  }
  function exit() {
    sess.active = false; wrap.style.display = 'none'; inter.enabled = true;
  }

  const inter = addInteraction({ x: SCOPE.x, z: SCOPE.z, r: 2.4, label: 'look through the scope', onUse: enter });

  journalSection('lp-heron', 'Night Herons 🌙', () => `
    <div class="jrow"><span>Scoped the rookery</span><b>${state.heronScoped}×</b></div>
    <div class="jrow"><span>Black-crowned night-heron</span><b>came home to nest</b></div>`);

  registerUpdate((dt, t, pl) => {
    state.idleBusy = sess.active;                                     // 087: no idle charm while the scope owns the camera
    // fov ease: 26 while scoped, back to baseFov otherwise (096: never a literal 50)
    const B = baseFov(), tgt = sess.active ? 26 : B;
    if (sess.active || Math.abs(camera.fov - B) > 0.05) {
      camera.fov = lerp(camera.fov, tgt, 1 - Math.exp(-9 * dt));
      if (!sess.active && Math.abs(camera.fov - B) < 0.05) camera.fov = B;
      camera.updateProjectionMatrix();
    }
    if (!sess.active) return;
    sess.t += dt; sess.wob += dt;
    const eNow = keys.has('e'), ePress = eNow && !sess.ePrev; sess.ePrev = eNow;
    if (ePress || movingNow() || sess.t > 8) { exit(); return; }      // never strand: auto-step-back after 8 s

    // override the chase cam: a fixed mounted-scope eye trained on the heron,
    // with a subtle hand/tripod sway so it feels alive
    _eye.set(SCOPE.x, EYE_Y, SCOPE.z);
    _aim.copy(HERON);
    _aim.x += Math.sin(sess.wob * 0.9) * 0.03;
    _aim.y += Math.sin(sess.wob * 1.3 + 1.1) * 0.02;
    camera.position.copy(_eye);
    camera.lookAt(_aim);
    camera.rotateY(Math.sin(sess.wob * 1.1) * 0.003);
    camera.rotateX(Math.sin(sess.wob * 0.8 + 0.7) * 0.003);
  });
});
