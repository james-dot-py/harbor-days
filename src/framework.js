// =====================================================================
//  HARBOR DAYS — gameplay FRAMEWORK
//  The stable API that content packs build on WITHOUT editing shared files.
//
//  CONTRACT for content packs
//  --------------------------
//  * A pack is one module under src/packs/ plus one import line in
//    src/packs/index.js. It imports from THIS file only.
//  * packs/index.js is imported (side-effect) by main.js BEFORE the world is
//    built, so a pack's top-level code runs at import time — that is TOO
//    EARLY to touch the world (rng, meshes, player). Therefore a pack must do
//    ALL of its setup inside onWorldReady(fn) callbacks. onWorldReady runs
//    each queued fn exactly once, with the player object, AFTER the world is
//    built and BEFORE the first frame. rng() (core.js) is safe to call inside
//    onWorldReady builders; never at import time.
//  * Per-frame work goes through registerUpdate(fn) — fn(dt,t,player).
//  * No localStorage/sessionStorage anywhere (artifact constraint).
//  * All new meshes must use toon()/bmat()/curveMat from core.js so they bend
//    with the curved world. Cache vectors — no per-frame allocations.
//
//  Everything the packs need is re-exported / provided below. See each export
//  for a one-line usage note.
// =====================================================================
import * as THREE from 'three';
import { renderer, scene, camera, toon, curveMat, clamp, lerp, lerpAngle, $, game } from './core.js';
import { cam, keys, joy } from './input.js';
import { mayor, mparts, createChibi } from './character.js';
import { fw } from './fx.js';
import { getAudioCtx } from './audio.js';
import * as CH from './data/chicago.js';

export { createChibi };                 // re-export the chibi builder for packs
// getAudioCtx() -> {actx,sfxBus,musicBus,noiseBuf,mf,noiseHit} (actx null until audio starts)
export { getAudioCtx };

const _v=new THREE.Vector3();            // cached scratch vector (no per-frame alloc)

// ------------------------------ session state --------------------------
// state — shared session-only bag (flags/counts/bests). Packs add their own
// fields freely, e.g. state.stonesSkipped = (state.stonesSkipped||0)+1.
export const state={
  fireworksLaunched:0,
  distanceWalked:0,          // metres walked this session
  zonesVisited:new Set(),    // zone names entered
  speedMult:1,               // movement multiplier (buffs/vehicles) — main.js consults it
};

// --------------------- update registry + world-ready -------------------
const _updates=[];
const _readyQ=[];
let _worldReady=false,_player=null;

// registerUpdate(fn) -> {remove()} : fn(dt,t,player) runs every frame.
export function registerUpdate(fn){
  _updates.push(fn);
  return {remove(){const i=_updates.indexOf(fn);if(i>=0)_updates.splice(i,1);}};
}
// onWorldReady(fn) : queue fn(player) to run once after the world is built.
export function onWorldReady(fn){ if(_worldReady)fn(_player); else _readyQ.push(fn); }

// worldReady(player) : called by main.js once, after the world build, before
// the first frame — drains the onWorldReady queue.
export function worldReady(player){
  _player=player;_worldReady=true;
  for(const fn of _readyQ){try{fn(player);}catch(e){console.warn('[framework] onWorldReady error',e);}}
  _readyQ.length=0;
}

// ------------------------------- DOM refs ------------------------------
let elPrompt,elPromptK,elPromptL,elMeter,elFill,elToast,elToastMain,elToastSub,
    elJournal,elJournalBody,elBtnAct,_fxflash;
function initDom(){
  elPrompt=$('prompt');elPromptK=elPrompt.querySelector('.pk');elPromptL=$('promptlabel');
  elMeter=$('pwrmeter');elFill=$('pwrfill');
  elToast=$('toast');elToastMain=$('toastMain');elToastSub=$('toastSub');
  elJournal=$('journal');elJournalBody=$('journalBody');
  elBtnAct=$('btnAct');
  // full-screen flash overlay (screenFx.flash)
  _fxflash=document.createElement('div');_fxflash.id='fxflash';
  Object.assign(_fxflash.style,{position:'fixed',inset:'0',zIndex:'40',pointerEvents:'none',opacity:'0',background:'#fff'});
  document.body.appendChild(_fxflash);
  // mobile context-action button — press = interact, hold = charge
  if(elBtnAct){
    elBtnAct.addEventListener('pointerdown',e=>{_touchAct=true;e.preventDefault();},{passive:false});
    const up=()=>{_touchAct=false;};
    elBtnAct.addEventListener('pointerup',up);
    elBtnAct.addEventListener('pointercancel',up);
    elBtnAct.addEventListener('pointerleave',up);
  }
  const bJ=$('btnJournal');if(bJ)bJ.addEventListener('click',()=>toggleJournal());
  const jc=$('journalClose');if(jc)jc.addEventListener('click',()=>toggleJournal(false));
}

// ------------------------------ interactions ---------------------------
const _interactions=[];
let _activeInter=null,_touchAct=false,_prevActHeld=false;
const IS_TOUCH=()=>document.body.classList.contains('touch');

// addInteraction({x,z,r,label,onUse,priority?}) -> handle
//   handle.remove() / handle.setLabel(s) / handle.enabled (bool)
//   Each frame the nearest in-range enabled interaction shows a prompt pill;
//   E (desktop) or the on-screen hand button (mobile) fires onUse(player).
export function addInteraction({x,z,r,label,onUse,priority=0}){
  const h={x,z,r,label,onUse,priority,enabled:true,
    setLabel(s){h.label=s;},
    remove(){const i=_interactions.indexOf(h);if(i>=0)_interactions.splice(i,1);if(_activeInter===h){_activeInter=null;hidePrompt();}}};
  _interactions.push(h);
  return h;
}
function hidePrompt(){
  elPrompt.style.display='none';
  if(elBtnAct)elBtnAct.style.display='none';
  _activeInter=null;
}
function showPrompt(h){
  _activeInter=h;
  elPromptK.textContent=IS_TOUCH()?'✋':'Ⓔ';   // hand / circled-E
  elPromptL.textContent=h.label;
  elPrompt.style.display='flex';
  if(IS_TOUCH()&&elBtnAct)elBtnAct.style.display='flex';
}
function scanInteractions(player,actPressed){
  let best=null;
  for(const it of _interactions){
    if(!it.enabled)continue;
    const dx=player.x-it.x,dz=player.z-it.z,d2=dx*dx+dz*dz;
    const R=it.r+1.1;   // grace margin — colliders keep players ~1m from anchors
    if(d2>R*R)continue;
    if(!best||it.priority>best.priority||(it.priority===best.priority&&d2<best._d2)){best=it;best._d2=d2;}
  }
  if(best)showPrompt(best);else hidePrompt();
  if(actPressed&&best)try{best.onUse(player);}catch(e){console.warn('[framework] interaction onUse error',e);}
}

// ------------------------------ charge / throw -------------------------
// chargeThrow({onRelease, tickHz?}) : shows a power meter that oscillates
//   0->1->0 while E / the action button is held; on release calls
//   onRelease(power01). Also exported as beginCharge (same thing).
let _charge=null;
export function chargeThrow({onRelease,tickHz=1.2}){
  _charge={onRelease,hz:tickHz,t:0,power:0};
  elMeter.style.display='block';elFill.style.width='0%';
}
export const beginCharge=chargeThrow;
function updateCharge(dt,actHeld){
  _charge.t+=dt;
  _charge.power=0.5-0.5*Math.cos(2*Math.PI*_charge.hz*_charge.t);
  elFill.style.width=(_charge.power*100).toFixed(0)+'%';
  if(!actHeld){
    const p=_charge.power,cb=_charge.onRelease;_charge=null;elMeter.style.display='none';
    try{cb(p);}catch(e){console.warn('[framework] chargeThrow onRelease error',e);}
  }
}

// camForward() -> {x,z} unit vector from the camera yaw (allocates a small
// object; call on demand, not every frame).
export function camForward(){return{x:Math.sin(cam.yaw),z:Math.cos(cam.yaw)};}

// ------------------------------- held item -----------------------------
// holdItem(mesh) : parent a small mesh into the mayor's right hand
// (mparts.handR); holdItem(null) clears. Only one held item at a time.
let _held=null;
export function holdItem(mesh){
  if(_held){mparts.handR.remove(_held);_held=null;}
  if(mesh){mparts.handR.add(mesh);_held=mesh;}
}

// --------------------------------- NPCs --------------------------------
const _npcs=[];
const BUMP_LINES=[
  "ope","ope, sorry!","ope — lemme squeeze right past ya",
  "watch out for deer on your way home!",
  "oh jeez, didn't see ya there","you betcha",
  "hot enough for ya?","it's not the heat, it's the humidity",
  "welp. better get going","go bears.","how 'bout them cubs",
  "we're stopping at culver's after this",
  "say hi to your mother for me","pop's in the cooler, help yourself",
  "jeez, it's gorgeous out","this? this is nothin'. you shoulda seen '11",
];
// Distance culling for framework NPCs. Fog hides everything past ~210m but the
// meshes are still DRAWN — each chibi is ~20 meshes (+ held props), so far NPCs
// on long sightlines blow the draw-call budget invisibly. Hide the whole group
// past the fog. Bucketed (~0.3s) with hysteresis so NPCs never flicker at the
// boundary: hide beyond 145m, re-show within 135m.
const NPC_CULL_HIDE2=145*145, NPC_CULL_SHOW2=135*135;

// makeNPC({x,z,ry?,palette,name?,lines?,wander?,scale?}) -> npc
//   palette:{suit,pants,skin,hair,shoe?,hairStyle?}
//   npc.say(text,secs?)  npc.setFace(expr)  npc.remove()
//   Idle breathing + subtle sway; optional small wander radius (metres) reuses
//   the walk swing. Bump lines auto-fire when the player first comes within
//   ~1.1m (re-arms after leaving 2.5m). Speech bubbles project from the head.
const CITIZEN=0.74;   // canonical citizen scale — matches the mayor (scale:1 here = mayor-sized)
export function makeNPC({x,z,ry=0,palette,name='',lines,wander=0,scale=1}){
  scale*=CITIZEN;
  const {group,parts}=createChibi(Object.assign({scale},palette));
  group.position.set(x,0,z);group.rotation.y=ry;scene.add(group);
  const bubble=document.createElement('div');bubble.className='npcbubble';document.body.appendChild(bubble);
  const npc={group,parts,name,lines:lines||BUMP_LINES,scale,wander,
    home:{x,z},walkT:0,idle:Math.random()*Math.PI*2,tgt:null,waitT:1+Math.random()*2,sp:0,
    _bubbleEl:bubble,_bubbleT:0,_lastSay:-9,_armed:true,
    say(text,secs=3){ if(game.tNow-npc._lastSay<0.5)return; npc._lastSay=game.tNow;
      bubble.textContent=text;npc._bubbleT=secs; },
    setFace(expr){ const{eyeL,eyeR}=parts;const sc=expr==='happy'?[1,0.55,1]:expr==='surprised'?[1.3,1.3,1.3]:[1,1,1];
      eyeL.scale.set(sc[0],sc[1],sc[2]);eyeR.scale.set(sc[0],sc[1],sc[2]); },
    remove(){ scene.remove(group);bubble.remove();const i=_npcs.indexOf(npc);if(i>=0)_npcs.splice(i,1); }};
  _npcs.push(npc);
  return npc;
}
function updateNPC(npc,dt,t,player){
  const g=npc.group;
  // wander
  if(npc.wander>0){
    if(!npc.tgt){
      npc.waitT-=dt;npc.sp=lerp(npc.sp,0,1-Math.exp(-6*dt));
      if(npc.waitT<=0){const a=Math.random()*Math.PI*2,r=Math.random()*npc.wander;npc.tgt={x:npc.home.x+Math.cos(a)*r,z:npc.home.z+Math.sin(a)*r};}
    }else{
      const dx=npc.tgt.x-g.position.x,dz=npc.tgt.z-g.position.z,d=Math.hypot(dx,dz);
      if(d<0.16){npc.tgt=null;npc.waitT=1.5+Math.random()*3;npc.sp=0;}
      else{const step=Math.min(d,1.15*dt);g.position.x+=dx/d*step;g.position.z+=dz/d*step;npc.sp=1.15;
        g.rotation.y=lerpAngle(g.rotation.y,Math.atan2(dx,dz),1-Math.exp(-8*dt));}
    }
  }
  // walk / idle animation (reuse the mayor swing pattern; shoes/hands inherit)
  npc.walkT+=npc.sp*dt*2.6;
  const amt=clamp(npc.sp/3.4,0,1.25),sw=Math.sin(npc.walkT)*amt,p=npc.parts;
  p.legL.rotation.x=sw*0.85;p.legR.rotation.x=-sw*0.85;
  p.armL.rotation.x=-sw*0.75;p.armR.rotation.x=sw*0.75;
  const bob=Math.abs(Math.sin(npc.walkT))*0.06*amt;
  p.body.position.y=1.18+bob;p.head.position.y=2.22+bob*1.1;p.hair.position.y=2.4+bob*1.1;
  p.body.rotation.x=0.09*amt;
  if(amt<0.05){p.body.scale.y=1.12+Math.sin(t*2+npc.idle)*0.012;g.rotation.z=Math.sin(t*0.8+npc.idle)*0.015;}
  else g.rotation.z=0;
  // bump line
  const bx=player.x-g.position.x,bz=player.z-g.position.z,bd2=bx*bx+bz*bz;
  if(npc._armed&&bd2<1.21){npc.say(npc.lines[(Math.random()*npc.lines.length)|0]);npc._armed=false;}
  else if(!npc._armed&&bd2>6.25)npc._armed=true;
  // speech bubble projection (head world pos -> screen)
  if(npc._bubbleT>0){
    npc._bubbleT-=dt;
    if(npc._bubbleT<=0){npc._bubbleEl.style.display='none';}
    else{
      _v.set(g.position.x,g.position.y+2.78*npc.scale,g.position.z);
      const dcam=_v.distanceTo(camera.position);_v.project(camera);
      if(_v.z>1||dcam>18)npc._bubbleEl.style.display='none';
      else{npc._bubbleEl.style.display='block';
        npc._bubbleEl.style.left=((_v.x*0.5+0.5)*innerWidth).toFixed(0)+'px';
        npc._bubbleEl.style.top=((-_v.y*0.5+0.5)*innerHeight).toFixed(0)+'px';}
    }
  }
}

// ---------------------------- bumpable figures -------------------------
// Promoted from parklife so ANY pack can register a POSED or MOVING figure:
// bumping it pops ONE shared projected "ope" speech bubble for ~3s, then the
// figure disarms until the player leaves. Same look as makeNPC's bubble (the
// .npcbubble class + head-projection math), but for figures that are NOT
// framework NPCs (raw createChibi rigs, instanced dogs, floaters, …).
//
// registerBumpable(group, anchorOffsetYOrParts, lines, radius=1.15) -> handle
//   group  — an Object3D (or any object exposing a live .position{x,y,z} in
//            WORLD space) whose position tracks the figure each frame.
//   anchorOffsetYOrParts —
//     • a parts object (has .head): the bubble rides the head. The head's
//       offset in the group's LOCAL frame is captured ONCE, then re-applied
//       through the group's world matrix every display frame — so lying /
//       reclined poses AND moving / spinning rigs both float the bubble
//       correctly. Crown lift = 0.56 * (group.scale.x||1), matching makeNPC.
//     • a number: the bubble floats that many metres above group.position in
//       world Y (simple upright figures with no head Object3D, e.g. the fetch
//       dogs, which are instanced meshes).
//   lines  — line pool; a random line shows on bump (Math.random — NEVER the
//            shared world rng).
//   radius — bump trigger radius in metres (default 1.15 = parklife's). Re-arm
//            distance = radius + 1.45 (parklife: 1.15 -> 2.6m).
const _bumpables=[];
let _bumpBubble=null;
function bumpBubbleEl(){
  if(!_bumpBubble){
    _bumpBubble=document.createElement('div');_bumpBubble.className='npcbubble';
    _bumpBubble.style.display='none';document.body.appendChild(_bumpBubble);
  }
  return _bumpBubble;
}
export function registerBumpable(group,anchorOffsetYOrParts,lines,radius=1.15){
  const rearm=radius+1.45;                      // parklife: 1.15 -> 2.6m re-arm
  const b={group,lines,armed:true,r2:radius*radius,rearm2:rearm*rearm,
           local:null,lift:0,offsetY:0};
  if(typeof anchorOffsetYOrParts==='number'){
    b.offsetY=anchorOffsetYOrParts;             // world-Y offset above group.position
  }else{
    const parts=anchorOffsetYOrParts;           // ride the head (handles posed/nested rigs)
    group.updateWorldMatrix(true,true);
    b.local=new THREE.Vector3();
    parts.head.getWorldPosition(b.local);       // head world pos
    group.worldToLocal(b.local);                // -> group-local (constant while the pose holds)
    b.lift=0.56*(group.scale.x||1);             // crown lift above the head (world Y)
  }
  _bumpables.push(b);
  bumpBubbleEl();
  return {remove(){const i=_bumpables.indexOf(b);if(i>=0)_bumpables.splice(i,1);}};
}
// hoisted per-frame scratch (module scope — no per-frame allocation)
const _bumpV=new THREE.Vector3();
let _bumpSpeaker=null,_bumpT=0,_bumpScan=0;
function updateBumpables(dt,player){
  if(!_bumpables.length)return;
  const bub=_bumpBubble;
  // throttled proximity scan (~5 Hz): nearest ARMED figure within its radius speaks
  _bumpScan-=dt;
  if(_bumpScan<=0){
    _bumpScan=0.2;
    let near=null,nd2=Infinity;
    for(let i=0;i<_bumpables.length;i++){
      const b=_bumpables[i];
      const dx=player.x-b.group.position.x,dz=player.z-b.group.position.z,d2=dx*dx+dz*dz;
      if(b.armed){ if(d2<b.r2&&d2<nd2){nd2=d2;near=b;} }
      else if(d2>b.rearm2) b.armed=true;        // re-arm once the player leaves
    }
    if(near){ near.armed=false;_bumpSpeaker=near;_bumpT=3;
      bub.textContent=near.lines[(Math.random()*near.lines.length)|0]; }
  }
  // project the live bubble to the speaker's head anchor every frame
  if(_bumpT>0&&_bumpSpeaker){
    _bumpT-=dt;
    if(_bumpT<=0){ bub.style.display='none';_bumpSpeaker=null; }
    else{
      const b=_bumpSpeaker;
      if(b.local){ b.group.updateWorldMatrix(true,false);            // moving rigs: follow the head
        _bumpV.copy(b.local).applyMatrix4(b.group.matrixWorld);_bumpV.y+=b.lift; }
      else{ _bumpV.set(b.group.position.x,b.group.position.y+b.offsetY,b.group.position.z); }
      const dcam=_bumpV.distanceTo(camera.position);_bumpV.project(camera);
      if(_bumpV.z>1||dcam>30) bub.style.display='none';             // behind camera / too far
      else{ bub.style.display='block';
        bub.style.left=((_bumpV.x*0.5+0.5)*innerWidth).toFixed(0)+'px';
        bub.style.top =((-_bumpV.y*0.5+0.5)*innerHeight).toFixed(0)+'px'; }
    }
  }
}

// --------------------------------- toast -------------------------------
// toast(main, sub?) : gold banner, auto-hides after 3s, queues if busy.
const _toastQ=[];let _toastBusy=false;
export function toast(main,sub){
  _toastQ.push({main,sub:sub||''});
  if(!_toastBusy)nextToast();
}
function nextToast(){
  if(!_toastQ.length){_toastBusy=false;return;}
  _toastBusy=true;const{main,sub}=_toastQ.shift();
  elToastMain.textContent=main;elToastSub.textContent=sub;
  elToast.classList.add('show');
  setTimeout(()=>{elToast.classList.remove('show');setTimeout(nextToast,420);},3000);
}

// -------------------------------- journal ------------------------------
// journalSection(id,title,renderFn) : renderFn()->HTML string. Re-registering
// the same id replaces it. Journal card toggles with J (desktop) / book button.
const _sections=[];
export function journalSection(id,title,renderFn){
  const ex=_sections.find(s=>s.id===id);
  if(ex){ex.title=title;ex.render=renderFn;}else _sections.push({id,title,render:renderFn});
}
function renderJournal(){
  elJournalBody.innerHTML=_sections.map(s=>{
    let html='';try{html=s.render();}catch(e){html='<i>…</i>';console.warn('[framework] journalSection render error',e);}
    return `<section class="jsec"><h2>${s.title}</h2>${html}</section>`;
  }).join('');
}
let _prevJ=false;
function toggleJournal(force){
  const open=force!==undefined?force:!elJournal.classList.contains('show');
  if(open){renderJournal();elJournal.classList.add('show');}else elJournal.classList.remove('show');
}

// -------------------------------- screen FX ----------------------------
// screenFx.flash(color,ms) : full-screen colour flash that fades out.
// screenFx.filter(cssFilter,ms) : CSS filter on the canvas, eased in/out.
// screenFx.shake(amt) : proxy for the shared fireworks camera shake.
let _filterTO=null;
export const screenFx={
  flash(color,ms=300){
    _fxflash.style.transition='none';_fxflash.style.background=color;_fxflash.style.opacity='0.85';
    void _fxflash.offsetWidth;                         // force reflow
    _fxflash.style.transition=`opacity ${ms}ms ease-out`;_fxflash.style.opacity='0';
  },
  filter(cssFilter,ms=600){
    const c=renderer.domElement;
    c.style.transition=`filter ${Math.max(90,ms*0.35)|0}ms ease-in-out`;
    c.style.filter=cssFilter;
    clearTimeout(_filterTO);_filterTO=setTimeout(()=>{c.style.filter='none';},ms);
  },
  shake(amt){fw.shake=Math.min(0.6,fw.shake+amt);},
};

// ----------------------------- bench sitting ---------------------------
// (built-in demo/cozy feature — exercises interactions + registry + camera)
const SIT_LIFT=0.34;
let _sit=null;
function sitOnBench(b,player){
  _sit={x:b.x,z:b.z,y:SIT_LIFT,ry:b.ry};
  player.vx=player.vz=0;player.x=b.x;player.z=b.z;
  hidePrompt();
  toast('taking a load off','settle in — move to stand');
}
function movementPressed(){
  return keys.has('w')||keys.has('a')||keys.has('s')||keys.has('d')||
         keys.has('arrowup')||keys.has('arrowdown')||keys.has('arrowleft')||keys.has('arrowright')||joy.len>0.2;
}
function updateSitting(dt,player){
  if(movementPressed()){_sit=null;return;}
  // freeze the player on the seat, hold a relaxed pose, drift the camera
  player.vx=player.vz=0;player.x=_sit.x;player.z=_sit.z;
  mayor.position.set(_sit.x,_sit.y,_sit.z);mayor.rotation.y=_sit.ry;
  mparts.legL.rotation.x=-1.15;mparts.legR.rotation.x=-1.15;
  mparts.armL.rotation.x=-0.18;mparts.armR.rotation.x=-0.18;
  mparts.body.rotation.x=-0.05;
  cam.yaw+=0.12*dt;cam.freeT=1;
}

// ------------------------------ per-frame ------------------------------
// runUpdates(dt,t,player) : called by main.js each frame (after the camera is
// positioned). Drives tracking, interactions, charge, NPCs and pack updates.
let _lpx=null,_lpz=null,_prevCool=0,_fcArmed=false,_zoneAcc=0,_npcCullAcc=0;
export function runUpdates(dt,t,player){
  if(dt<0)dt=0;                          // frame-0 rAF can hand us a negative dt
  // --- distance walked ---
  if(_lpx!==null&&game.running)state.distanceWalked+=Math.hypot(player.x-_lpx,player.z-_lpz);
  _lpx=player.x;_lpz=player.z;
  // --- fireworks launched: rising edge of the launch cooldown. Arm only once
  // the cooldown has settled to 0, so the frame-0 negative-dt spike that
  // momentarily inflates fw.cool (no rocket is spawned) is never miscounted. ---
  if(!_fcArmed){ if(fw.cool<=0)_fcArmed=true; }
  else if(fw.cool>0&&_prevCool<=0&&game.running)state.fireworksLaunched++;
  _prevCool=fw.cool;
  // --- zones visited ---
  _zoneAcc-=dt;
  if(_zoneAcc<=0&&game.running){_zoneAcc=0.5;
    for(const zn of CH.ZONES){const dx=player.x-zn.x,dz=player.z-zn.z;if(dx*dx+dz*dz<zn.r*zn.r){state.zonesVisited.add(zn.n);break;}}
  }
  // --- journal toggle (J) ---
  const jNow=keys.has('j');if(jNow&&!_prevJ)toggleJournal();_prevJ=jNow;

  // --- action input (E key or mobile button): held + rising edge ---
  const actHeld=keys.has('e')||_touchAct;
  const actPressed=actHeld&&!_prevActHeld;_prevActHeld=actHeld;

  if(_sit){
    updateSitting(dt,player);
    hidePrompt();
  }else if(_charge){
    updateCharge(dt,actHeld);
    hidePrompt();
  }else{
    scanInteractions(player,actPressed);
  }

  // --- NPC distance culling (bucketed, hysteresis) ---
  // Recompute group.visible every ~0.3s (not per-frame). Interaction prompts are
  // handled separately in scanInteractions above — this only gates the chibi's
  // own animation/wander/bubble work below and its draw cost. Pack-owned meshes
  // are untouched; only framework NPCs registered via makeNPC live in _npcs.
  _npcCullAcc-=dt;
  if(_npcCullAcc<=0){
    _npcCullAcc=0.3;
    for(const npc of _npcs){
      const dx=player.x-npc.group.position.x,dz=player.z-npc.group.position.z,d2=dx*dx+dz*dz;
      if(npc.group.visible){
        if(d2>NPC_CULL_HIDE2){npc.group.visible=false;npc._bubbleT=0;npc._bubbleEl.style.display='none';}
      }else if(d2<NPC_CULL_SHOW2){npc.group.visible=true;}
    }
  }
  // --- NPCs ---
  for(const npc of _npcs){ if(!npc.group.visible)continue; updateNPC(npc,dt,t,player); }

  // --- pack updates ---
  for(let i=0;i<_updates.length;i++){try{_updates[i](dt,t,player);}catch(e){console.warn('[framework] update error',e);}}

  // --- bumpable figures: shared "ope" bubble (after packs move their rigs) ---
  updateBumpables(dt,player);
}

// ---------------------- built-in world-ready setup ---------------------
// Built-in journal section (registered immediately; renders live state).
journalSection('harbor-days','Harbor Days',()=>`
  <div class="jrow"><span>Fireworks launched</span><b>${state.fireworksLaunched}</b></div>
  <div class="jrow"><span>Distance walked</span><b>${state.distanceWalked.toFixed(0)} m</b></div>
  <div class="jrow"><span>Zones visited</span><b>${state.zonesVisited.size} / ${CH.ZONES.length}</b></div>`);

// Bench sitting — one "sit for a bit" interaction per bench (framework demo).
onWorldReady(()=>{
  for(const b of CH.BENCHES)addInteraction({x:b.x,z:b.z,r:2.2,label:'sit for a bit',onUse:pl=>sitOnBench(b,pl)});
});

// wire the DOM once (index.html is fully parsed before any module runs).
initDom();
