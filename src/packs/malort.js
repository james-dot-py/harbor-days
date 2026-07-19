// =====================================================================
//  MALÖRT — the shared Chicago-handshake pieces (task 031).
//  Two lakefront regulars serve Jeppson's Malört: the CHICAGO HANDSHAKE
//  regular (npcs.js — the ceremony: an Old Style first, then the shot) and
//  the MALÖRT GUY (characters.js — straight to the shot). The SWIG itself —
//  the shot glass in your hand, the screen making the burnt-band-aid face,
//  the queasy wobble, the server's reaction line + a toast, the shared
//  counter — is identical for both, so it lives HERE and each NPC calls it.
//  Keeping it in one place stops the two flows from drifting apart.
//
//  This is a plain HELPER module imported by those two packs — NOT a pack:
//  no packs/index.js line, no onWorldReady, no world code at import time. It
//  only defines/exports; the meshes + audio are created when a pack calls in.
//  All audio is synthesized + guarded on actx; nothing here touches the
//  shared world rng (determinism intact).
// =====================================================================
import * as THREE from 'three';
import { toon } from '../core.js';
import { holdItem, screenFx, toast, state, getAudioCtx, registerUpdate } from '../framework.js';
import { mparts } from '../character.js';   // framework doesn't re-export mparts (022 convention)

// queasy detuned wobble, descending + dissonant — the taste, in sound.
// (Moved here from npcs.js so both Malört NPCs share the one recipe.)
export function sMalort(){
  const {actx,sfxBus}=getAudioCtx(); if(!actx)return; const t=actx.currentTime,dur=2.4;
  const lfo=actx.createOscillator();lfo.type='sine';lfo.frequency.value=6.5;
  const lfoG=actx.createGain();lfoG.gain.value=24;lfo.connect(lfoG);
  const master=actx.createGain();
  master.gain.setValueAtTime(0.0001,t);master.gain.linearRampToValueAtTime(0.16,t+0.15);
  master.gain.setValueAtTime(0.14,t+dur-0.6);master.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  master.connect(sfxBus);
  [-7,7].forEach((det,k)=>{
    const o=actx.createOscillator();o.type='sawtooth';
    o.frequency.setValueAtTime(182+k*4,t);o.frequency.exponentialRampToValueAtTime(70,t+dur);
    o.detune.value=det;lfoG.connect(o.detune);
    const f=actx.createBiquadFilter();f.type='lowpass';f.frequency.value=900;f.Q.value=6;
    o.connect(f);f.connect(master);o.start(t);o.stop(t+dur+0.1);
  });
  lfo.start(t);lfo.stop(t+dur+0.1);
}

// a little shot glass of amber Malört — the swig prop, held in the mayor's hand.
export function makeShotGlass(){
  return new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.04,0.09,10), toon(0xd9b44a));
}

// 100 (owner: "the bottle is attached to the player avatar ... it clips behind
// the arm so it's barely visible"): during the swig the mayor RAISES the shot
// in a toast — the old flat hang left the glass tucked behind the hanging
// wrist, which read as a mystery blob glued to the avatar. The pose keys off
// the GLASS's presence in the hand (not a timer), so it always ends exactly
// when holdItem(null) drops it — wall-clock timers and game-dt drift apart in
// slow frames. Lazily registers ONE updater on the first pour (this module
// stays world-free at import); updateCharacter re-stamps the arm every frame,
// so an unposed frame restores it for free. Registered late = runs after
// updateCharacter, so the toast pose wins its frames.
let toastShot=null, toastReg=false, toastOn=false;
function toastArm(shot){
  toastShot=shot;
  if(toastReg)return; toastReg=true;
  registerUpdate(()=>{
    if(toastShot&&toastShot.parent===mparts.handR){
      // straight UP with a wide OUTBOARD splay (+z is outboard for the +x arm —
      // a NEGATIVE roll swings the raised fist inboard, into the face/hair). The
      // fist + glass clear the big chibi hair silhouette entirely (fist rig-local
      // ~(0.90,2.09,0.28)), so the toast reads against the SKY even from the
      // chase cam behind the mayor.
      mparts.armR.rotation.x=-2.6; mparts.armR.rotation.z=0.5;
      toastOn=true;
    }else if(toastOn){
      // the glass left the hand — updateCharacter re-stamps rotation.x every
      // frame but never rotation.z, so the splay is ours to hand back (the
      // badminton/lolla leave convention) or the arm stays twisted forever.
      toastOn=false; mparts.armR.rotation.z=0.25;
    }
  });
}

// the SWIG — the shared half of a Chicago handshake: down the shot, the screen
// makes the face, the queasy sound, the server's reaction + a toast, bump the
// shared Malört counter. onDone() fires ~1.3 s later (after the recovery beat)
// so the caller can reset its OWN busy/cooldown/label. The CAN-first ceremony
// is NOT here — the Handshake regular keeps that; the Malört guy skips straight
// to this. npc is a makeNPC-built chibi with face:true (so setFace reads).
export function pourMalort({npc, react='it grows on ya',
    toastMain='IT GROWS ON YOU', toastSub="Jebson's Malörp", onDone}={}){
  const shot=makeShotGlass();
  shot.scale.setScalar(1.25);                              // chibi-chunky, like the guy's bottle — a toast must READ
  shot.position.set(0,-0.10,0.02); shot.rotation.x=2.3;   // just past the raised fist, tipped back — the drain-it tilt (100 toast pose)
  holdItem(shot); toastArm(shot);
  screenFx.filter('saturate(0.2) contrast(1.35) hue-rotate(-20deg)',2600);
  screenFx.shake(0.35); sMalort();
  if(npc){ npc.setFace('surprised'); npc.say(react,3); }
  toast(toastMain,toastSub);
  state.malortShots=(state.malortShots||0)+1;
  setTimeout(()=>{ holdItem(null); if(npc)npc.setFace('happy'); if(onDone)onDone(); },1300);
}

// Old Style can label — blue-striped cream (moved here from npcs.js so the
// Handshake's can AND the Malört guy's loose cans share one texture recipe).
export function oldStyleTex(){
  const cv=document.createElement('canvas');cv.width=128;cv.height=128;const g=cv.getContext('2d');
  g.fillStyle='#f3ede0';g.fillRect(0,0,128,128);
  g.fillStyle='#1c4fa0';g.fillRect(0,10,128,12);g.fillRect(0,106,128,12);
  g.fillStyle='#b8252b';g.beginPath();g.ellipse(64,64,44,34,0,0,7);g.fill();
  g.fillStyle='#f3ede0';g.beginPath();g.ellipse(64,64,38,28,0,0,7);g.fill();
  g.fillStyle='#1c4fa0';g.textAlign='center';g.textBaseline='middle';
  g.font='800 20px "Trebuchet MS",sans-serif';g.fillText('OLDE',64,56);g.fillText('STYLO',64,76);
  const tx=new THREE.CanvasTexture(cv);tx.anisotropy=4;return tx;
}
