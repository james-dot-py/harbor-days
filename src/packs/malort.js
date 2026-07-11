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
import { holdItem, screenFx, toast, state, getAudioCtx } from '../framework.js';

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

// the SWIG — the shared half of a Chicago handshake: down the shot, the screen
// makes the face, the queasy sound, the server's reaction + a toast, bump the
// shared Malört counter. onDone() fires ~1.3 s later (after the recovery beat)
// so the caller can reset its OWN busy/cooldown/label. The CAN-first ceremony
// is NOT here — the Handshake regular keeps that; the Malört guy skips straight
// to this. npc is a makeNPC-built chibi with face:true (so setFace reads).
export function pourMalort({npc, react='it grows on ya',
    toastMain='IT GROWS ON YOU', toastSub="Jeppson's Malört", onDone}={}){
  const shot=makeShotGlass();
  shot.position.set(0,0.13,0); holdItem(shot);
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
  g.font='800 20px "Trebuchet MS",sans-serif';g.fillText('OLD',64,56);g.fillText('STYLE',64,76);
  const tx=new THREE.CanvasTexture(cv);tx.anisotropy=4;return tx;
}
