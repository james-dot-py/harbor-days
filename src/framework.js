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
//  * Never touch localStorage/sessionStorage directly — the artifact sandbox
//    throws on ACCESS. Persist through src/store.js (getFlag/setFlag) only.
//  * All new meshes must use toon()/bmat()/curveMat from core.js so they bend
//    with the curved world. Cache vectors — no per-frame allocations.
//
//  Everything the packs need is re-exported / provided below. See each export
//  for a one-line usage note.
// =====================================================================
import * as THREE from 'three';
import { renderer, scene, camera, amb, sun, toon, curveMat, pointsMat, clamp, lerp, lerpAngle, $, game } from './core.js';
import { cam, keys, joy, jump } from './input.js';
import { mayor, mparts, createChibi, bakeChibiRig } from './character.js';
import { fw } from './fx.js';
import { getAudioCtx, setAmbienceGrade } from './audio.js';
import * as CH from './data/chicago.js';
import { getSave, markDirty, getFlag, setFlag, wasSaveRecovered } from './store.js';   // the guarded save adapter (task 078; 082 corrupt-recovery)

export { createChibi, tintChibiLimb, bakeChibiRig } from './character.js';   // re-export chibi builder + limb recolor + static-rig baker for packs
// getAudioCtx() -> {actx,sfxBus,musicBus,noiseBuf,mf,noiseHit} (actx null until audio starts)
export { getAudioCtx };

const _v=new THREE.Vector3();            // cached scratch vector (no per-frame alloc)

// prefersCalm() — the ONE reduced-motion flag packs read (task 085 settings).
// Backed by game.calm (core.js), set live by settings.js from the OS
// prefers-reduced-motion query or the player's explicit toggle. A pack that
// animates sway/bob/flash should skip or soften it when this is true.
export const prefersCalm=()=>game.calm;
// prefersLowPower() — the 085 low-power toggle, mirrored like calm. A pack
// with an optional particle field should thin its instance count when true.
export const prefersLowPower=()=>!!game.lowPower;

// ---------------------- the mayor's NAME (task 087) --------------------
// Stored through the ONE guarded door (store.js flags view). '' = unset; the
// naming card (src/naming.js) writes it once at first start. mayorName() is the
// RAW chosen name (empty until they pick one) — the incidental spots (bump
// lines, favor thanks) only personalize when it's non-empty, so an
// enter-through player never hears a robotic "ope, Mayor". mayorLabel() falls
// back to 'Mayor' for the DELIBERATE signage (journal signature, the Wrigley
// ejection) where a name always reads right.
const NAME_KEY='ope.name.v1';
export function mayorName(){ return getFlag(NAME_KEY)||''; }
export function mayorLabel(){ return mayorName()||'Mayor'; }
// sanitizeName — letters/spaces/apostrophes only, collapsed whitespace, ≤12.
export function sanitizeName(raw){
  return String(raw||'').replace(/[^A-Za-z '’]/g,'').replace(/\s+/g,' ').trim().slice(0,12);
}
// setMayorName(raw) — sanitize + persist; '' clears it (enter-through default).
export function setMayorName(raw){ const c=sanitizeName(raw); setFlag(NAME_KEY,c); return c; }

// ------------------------------ session state --------------------------
// state — shared session-only bag (flags/counts/bests). Packs add their own
// fields freely, e.g. state.stonesSkipped = (state.stonesSkipped||0)+1.
export const state={
  fireworksLaunched:0,
  distanceWalked:0,          // metres walked this session
  zonesVisited:new Set(),    // zone names entered
  speedMult:1,               // movement multiplier (buffs/vehicles) — main.js consults it
  interactionsUsed:0,        // E / ✋ presses that actually fired an onUse (onboarding reads it)
};

// ---- restore persisted journal state from the save blob (task 078) ----
// Runs at MODULE SCOPE (framework.js is imported before packs/index.js), so the
// restored values land BEFORE any pack's import-time `state.x = state.x || dflt`
// initializer — the pack keeps the restored number, not the default. Only names,
// ids and numbers cross this boundary; never coords or world-derived state.
{
  const _sv=getSave(), _c=_sv.counters||{};
  if(_sv.zones&&_sv.zones.length)state.zonesVisited=new Set(_sv.zones);
  for(const k of ['fireworksLaunched','distanceWalked','stonesThrown','fetches','malortShots','fishStreak','golfRounds'])
    if(typeof _c[k]==='number')state[k]=_c[k];
  if(_c.bests&&typeof _c.bests==='object')state.bests=Object.assign({},_c.bests);
  if(_c.fishLog&&typeof _c.fishLog==='object')state.fishLog=Object.assign({},_c.fishLog);
  if(_c.paidFirsts&&typeof _c.paidFirsts==='object')state.paidFirsts=Object.assign({},_c.paidFirsts);
  if(_c.dibsBy&&typeof _c.dibsBy==='object'){
    state.dibsBy=Object.assign({},_c.dibsBy);
    // 094 de-brand: merge any legacy wallet-ledger buckets into their new display names
    const _dibsRn={Divvy:'Dibsy',Wrigley:'Wiggly',Lolla:'Lalla','Malört':'Malörp'};
    for(const o in _dibsRn){ if(o in state.dibsBy){ const n=_dibsRn[o]; state.dibsBy[n]=(state.dibsBy[n]||0)+state.dibsBy[o]; delete state.dibsBy[o]; } }
  }
  if(Array.isArray(_c.birdsSeen))state.birdsSeen=new Set(_c.birdsSeen);
  if(Array.isArray(_c.rocksPainted))state.rocksPainted=new Set(_c.rocksPainted);
  if(Array.isArray(_c.seaGlass))state.seaGlass=new Set(_c.seaGlass);       // 080: beachcombed colors
  if(Array.isArray(_c.pennies))state.pennies=new Set(_c.pennies);          // 080: smashed-penny designs
}

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
// economy HUD refs (task 078)
let elDibs,elDibsN,elDibsPop,elTote,elToteGrid,elToteCap,elShop,elShopTitle,elShopKeeper,elShopRows,elBtnTote,elToteN;
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
  // mobile: the interaction pill is ITSELF a tap target — tapping it drives the
  // SAME _touchAct path as the ✋ hand button (issue 013 / task 026). _touchAct is
  // a shared boolean fired on the rising edge in runUpdates, so even a tap that
  // somehow reached both the pill and the button still fires onUse exactly once;
  // hold-to-charge works too (implicit touch-pointer capture keeps the pointerup
  // on the pill after hidePrompt hides it, just like the button). Touch only:
  // desktop keeps E primary and the pill stays inert (CSS pointer-events:none),
  // so a mouse click never triggers an action.
  if(elPrompt){
    const pillDown=e=>{ if(!IS_TOUCH())return; _touchAct=true; elPrompt.classList.add('pressed'); e.preventDefault(); };
    const pillUp=()=>{ if(!IS_TOUCH())return; _touchAct=false; elPrompt.classList.remove('pressed'); };
    elPrompt.addEventListener('pointerdown',pillDown,{passive:false});
    elPrompt.addEventListener('pointerup',pillUp);
    elPrompt.addEventListener('pointercancel',pillUp);
    elPrompt.addEventListener('pointerleave',pillUp);
  }
  const bJ=$('btnJournal');if(bJ)bJ.addEventListener('click',()=>toggleJournal());
  const jc=$('journalClose');if(jc)jc.addEventListener('click',()=>toggleJournal(false));

  // ---- economy HUD: chip / register pop / tote / shop (task 078) ----
  elDibs=$('dibs');elDibsN=$('dibsN');elDibsPop=$('dibsPop');
  elTote=$('tote');elToteGrid=$('toteGrid');elToteCap=$('toteCap');
  elShop=$('shop');elShopTitle=$('shopTitle');elShopKeeper=$('shopKeeper');elShopRows=$('shopRows');
  // tote: close button, tap-outside, the touch tote button (desktop uses B)
  // TAP-OUTSIDE GUARD: a modal opened by a touch INTERACTION (the pill/✋ path)
  // opens mid-gesture — _touchAct fires onUse in the rAF loop between touchstart
  // and touchend, so the release's synthesized click lands on the now-covering
  // BACKDROP and a naive backdrop-click-closes handler shuts the card the same
  // frame it opened (kiosk shop, task 078). Close only when the gesture STARTED
  // on the backdrop too (pointerdown target === backdrop).
  const tcl=$('toteClose');if(tcl)tcl.addEventListener('click',()=>bag.close());
  let _toteDown=false,_shopDown=false;
  if(elTote){
    elTote.addEventListener('pointerdown',e=>{_toteDown=(e.target===elTote);});
    elTote.addEventListener('click',e=>{if(e.target===elTote&&_toteDown)bag.close();});
  }
  elBtnTote=$('btnTote');elToteN=$('toteN');
  if(elBtnTote)elBtnTote.addEventListener('click',()=>{ if(elTote&&elTote.classList.contains('show'))bag.close(); else bag.open(); });
  // shop: close button, tap-outside (same started-on-backdrop guard)
  const scl=$('shopClose');if(scl)scl.addEventListener('click',()=>shop.close());
  if(elShop){
    elShop.addEventListener('pointerdown',e=>{_shopDown=(e.target===elShop);});
    elShop.addEventListener('click',e=>{if(e.target===elShop&&_shopDown)shop.close();});
  }
  // Escape closes the shop first, then the tote (Escape is not a movement key,
  // so a bare window listener is safe — DOM-input isolation applies to text fields).
  addEventListener('keydown',e=>{ if(e.key==='Escape'){
    if(elShop&&elShop.classList.contains('show'))shop.close();
    else if(elTote&&elTote.classList.contains('show'))bag.close(); } });
  // ?dibs=N — tooling affordance: seed a balance so the chip + shop can be shot
  // without playing to earn it. Seeding a positive balance implies the player is
  // past their "first dibs", so mark the flag too (keeps the shot's register pop
  // uncluttered by the one-time gold toast).
  const _dq=new URLSearchParams(location.search).get('dibs');
  if(_dq!==null){ const n=parseInt(_dq,10); if(!isNaN(n)){ const sv=getSave(); sv.dibs=n; if(n>0)sv.flags['ope.dibs']='1'; } }
  refreshChip();
  if(getSave().dibs>0||getSave().flags['ope.dibs']==='1')revealChip();
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
  elPrompt.classList.remove('pressed');   // drop any touch pressed-state
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
  if(actPressed&&best){state.interactionsUsed++;try{best.onUse(player);}catch(e){console.warn('[framework] interaction onUse error',e);}}
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
// _heldId / _bagHold: the tote (below) tracks which DEFINED item is in hand so
// its tile can show an "in hand" marker. Any holdItem call from OUTSIDE the
// tote's own use path (skip stones grabbing the hand, a pack clearing it) must
// drop that marker — so we clear _heldId unless the tote set _bagHold around
// its own call.
let _held=null,_heldId=null,_bagHold=false;
export function holdItem(mesh){
  if(_held){mparts.handR.remove(_held);_held=null;}
  if(mesh){mparts.handR.add(mesh);_held=mesh;}
  if(!_bagHold)_heldId=null;
}

// --------------------------------- NPCs --------------------------------
const _npcs=[];
const BUMP_LINES=[
  "ope","ope, sorry!","ope — lemme squeeze right past ya",
  "watch out for deer on your way home!",
  "oh jeez, didn't see ya there","you betcha",
  "hot enough for ya?","it's not the heat, it's the humidity",
  "welp. better get going","go bears.","how 'bout them chubs",
  "we're stopping at culvert's after this",
  "say hi to your mother for me","pop's in the cooler, help yourself",
  "jeez, it's gorgeous out","this? this is nothin'. you shoulda seen '11",
];
// Name-flavored bump lines (task 087): a ROTATING MINORITY of collide "ope"s
// greet the mayor by name — ~1 in 4, and ONLY once they've chosen one — so
// being known lands as a warm surprise, never a robotic tic. {name} is filled
// at pick time. Math.random throughout (NEVER the world rng).
const NAME_BUMP_LINES=[
  "ope — my fault, {name}",
  "oh hey {name}, didn't see ya",
  "lookin' sharp today, {name}",
  "how ya been, {name}?",
  "{name}! say hi to your mother for me",
  "watch the elbows there, {name}",
  "hot enough for ya, {name}?",
  "there's our {name}",
];
// pickBumpLine — the shared line chooser both makeNPC and registerBumpable use.
// ~1 in 4 (and only with a chosen name) it swaps in a name greeting.
function pickBumpLine(lines){
  const nm=mayorName();
  if(nm&&Math.random()<0.25)
    return NAME_BUMP_LINES[(Math.random()*NAME_BUMP_LINES.length)|0].replace('{name}',nm);
  return lines[(Math.random()*lines.length)|0];
}
// Distance culling for framework NPCs. Fog hides everything past ~210m but the
// meshes are still DRAWN — each chibi is ~20 meshes (+ held props), so far NPCs
// on long sightlines blow the draw-call budget invisibly. Hide the whole group
// past the fog. Bucketed (~0.3s) with hysteresis so NPCs never flicker at the
// boundary: hide beyond 145m, re-show within 135m.
const NPC_CULL_HIDE2=145*145, NPC_CULL_SHOW2=135*135;
// static-crowd LOD (staticLod NPCs only): near (<58m) = the live 6-7-draw rig;
// mid (62..145m) = a 1-draw baked twin; far (>145m, NPC_CULL) = both hidden.
// The idle breathing/sway a live rig animates is subpixel past ~60m, so the frozen
// twin is indistinguishable there while costing one draw instead of six.
const LOD_NEAR2=58*58, LOD_FAR2=62*62;
// moverLod: same twin, but for rigs that MOVE. Swap at 90m (hysteresis 87/93) —
// past there a 0.3s position step (<=~0.4m) and the frozen limb-swing are subpixel
// — and the twin's position + rotation.y are re-synced from the live rig every
// cull tick (not just on swap). Far band stays NPC_CULL (135/145). A pack that
// hides its rig itself (fan streams) sets npc._lodActive=false instead of
// group.visible, so the framework stays the sole owner of group/twin visibility.
const MOVER_NEAR2=87*87, MOVER_FAR2=93*93;

// makeNPC({x,z,ry?,palette,name?,lines?,wander?,scale?,staticLod?,moverLod?}) -> npc
//   palette:{suit,pants,skin,hair,shoe?,hairStyle?,face?}
//   npc.say(text,secs?)  npc.setFace(expr)  npc.remove()
//   Idle breathing + subtle sway; optional small wander radius (metres) reuses
//   the walk swing. Bump lines auto-fire when the player first comes within
//   ~1.1m (re-arms after leaving 2.5m). Speech bubbles project from the head.
//   staticLod:true — swap to a 1-draw baked twin past 60m (non-wandering rigs).
//   moverLod:true  — same past 90m, re-synced to the live pose each cull tick, so
//     it works for movers; a pack that hides its own rig sets npc._lodActive=false
//     (not group.visible) to stay out of the framework's visibility ownership.
const CITIZEN=0.74;   // canonical citizen scale — matches the mayor (scale:1 here = mayor-sized)
// npcList() — read-only view of the live framework NPC registry (task 090: the
// lake-moods pack stamps ONE shared umbrella InstancedMesh over rigs it doesn't
// own — updateChibiShadows precedent). Treat as read-only; a consumer's private
// per-NPC fields go on the npc object itself (the _lodActive convention).
export function npcList(){return _npcs;}
export function makeNPC({x,z,ry=0,palette,name='',lines,wander=0,scale=1,staticLod=false,moverLod=false}){
  scale*=CITIZEN;
  const {group,parts}=createChibi(Object.assign({scale},palette));
  group.position.set(x,0,z);group.rotation.y=ry;scene.add(group);
  // LOD twin: a 1-draw baked rig shown at MID range (see the cull pass). staticLod
  // freezes it (only for non-wandering rigs); moverLod re-syncs it to the live pose
  // every tick, so it works for movers too. Built at creation in the DEFAULT pose
  // (no worn props) — an accepted distance LOD: past the swap the detail is a few px.
  // Consumes no rng.
  let twin=null;
  if(staticLod&&!moverLod&&wander!==0)console.warn('[framework] makeNPC staticLod ignored on a wandering rig:',name);
  if(moverLod||(staticLod&&wander===0)){
    const tw=createChibi(Object.assign({scale},palette));
    bakeChibiRig(tw.group,tw.parts);
    tw.group.position.set(x,0,z);tw.group.rotation.y=ry;tw.group.visible=false;scene.add(tw.group);
    twin=tw.group;
  }
  const bubble=document.createElement('div');bubble.className='npcbubble';document.body.appendChild(bubble);
  const npc={group,parts,name,lines:lines||BUMP_LINES,scale,wander,twin,moverLod:!!moverLod,_lod:'near',
    home:{x,z},walkT:0,idle:Math.random()*Math.PI*2,tgt:null,waitT:1+Math.random()*2,sp:0,
    _bubbleEl:bubble,_bubbleT:0,_lastSay:-9,_armed:true,
    say(text,secs=3){ if(game.tNow-npc._lastSay<0.5)return; npc._lastSay=game.tNow;
      bubble.textContent=text;npc._bubbleT=secs; },
    setFace(expr){ const{eyeL,eyeR}=parts;const sc=expr==='happy'?[1,0.55,1]:expr==='surprised'?[1.3,1.3,1.3]:[1,1,1];
      eyeL.scale.set(sc[0],sc[1],sc[2]);eyeR.scale.set(sc[0],sc[1],sc[2]); },
    remove(){ scene.remove(group);if(npc.twin)scene.remove(npc.twin);bubble.remove();const i=_npcs.indexOf(npc);if(i>=0)_npcs.splice(i,1); }};
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
  p.body.position.y=1.18+bob;p.head.position.y=2.22+bob*1.1;   // hair baked into head — rides the head bob
  p.body.rotation.x=0.09*amt;
  if(amt<0.05){p.body.scale.y=1.12+Math.sin(t*2+npc.idle)*0.012;g.rotation.z=Math.sin(t*0.8+npc.idle)*0.015;}
  else g.rotation.z=0;
  // bump line
  const bx=player.x-g.position.x,bz=player.z-g.position.z,bd2=bx*bx+bz*bz;
  if(npc._armed&&bd2<1.21){npc.say(pickBumpLine(npc.lines));npc._armed=false;}
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
      // piggyback DISTANCE CULLING: posed-chibi groups are exactly the
      // uncull-ed figures (makeNPC has its own); same hysteresis band as
      // NPC_CULL. Position-proxy holders (instanced dogs) have no .visible
      // that matters — setting it is harmless. Keeps the phone draw budget
      // safe as lawnlife/badminton/golfer chibis pile up.
      if(b.group.visible!==false){ if(d2>NPC_CULL_HIDE2)b.group.visible=false; }
      else if(d2<NPC_CULL_SHOW2)b.group.visible=true;
    }
    if(near){ near.armed=false;_bumpSpeaker=near;_bumpT=3;
      bub.textContent=pickBumpLine(near.lines); }
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

// ------------------------------- places (cells) ------------------------
// definePlace: a named sub-place of the world that feels like WALKING INTO A
// ROOM. While the player is inside `contains(x,z)`, the world GRADE lerps
// toward the place's fog/light targets and the ambience mix re-balances —
// then lerps back out on exit. This is the shared CELL pattern:
//   * the Bird Sanctuary uses it as a graded open-world room (same scene);
//   * WRIGLEYVILLE (see WRIGLEYVILLE.md) can use the same machinery for its
//     whole neighborhood cell — containment tracking + graded transition are
//     shared here; cell-specific work (mesh-set visibility swaps, clamp +
//     minimap switches, arrival scripting) hangs off onEnter/onExit, which is
//     the intended extension point. One pattern, not two.
//
// definePlace({
//   name,                      // label (zone banners stay ZONES' job)
//   contains(x,z) -> bool,     // point-in-place test (cheap; called ~5 Hz)
//   fadeS = 1.8,               // seconds for the grade to breathe in/out
//   grade: { fogColor, fogNear, fogFar,          // linear-fog targets
//            ambSky, ambGround, ambI, sunI },    // hemisphere/sun targets (all optional)
//   amb: { ext, bird },        // ambience mix targets (audio.js grade)
//   onEnter(), onExit(),       // cell hooks (fire at the threshold crossing)
// }) -> handle
const _places=[];
let _placeCur=null,_gradePlace=null,_placeF=0,_placeScan=0;
const _pBase={cap:false,fogC:new THREE.Color(),fogN:0,fogF:0,ambS:new THREE.Color(),ambG:new THREE.Color(),ambI:0,sunI:0};
const _pcA=new THREE.Color(),_pcB=new THREE.Color();
export function definePlace(p){_places.push(p);return p;}
function updatePlaces(dt,player){
  if(!_places.length)return;
  if(!_pBase.cap){_pBase.cap=true;
    _pBase.fogC.copy(scene.fog.color);_pBase.fogN=scene.fog.near;_pBase.fogF=scene.fog.far;
    _pBase.ambS.copy(amb.color);_pBase.ambG.copy(amb.groundColor);_pBase.ambI=amb.intensity;_pBase.sunI=sun.intensity;}
  _placeScan-=dt;
  if(_placeScan<=0){_placeScan=0.2;
    let inside=null;
    for(let i=0;i<_places.length;i++)if(_places[i].contains(player.x,player.z)){inside=_places[i];break}
    if(inside!==_placeCur){
      if(_placeCur&&_placeCur.onExit)_placeCur.onExit();
      _placeCur=inside;
      if(inside){_gradePlace=inside;if(inside.onEnter)inside.onEnter();}
    }
  }
  if(!_gradePlace)return;
  const fadeS=_gradePlace.fadeS||1.8;
  _placeF=clamp(_placeF+(_placeCur===_gradePlace?1:-1)*dt/fadeS,0,1);
  const f=_placeF,g=_gradePlace.grade||{};
  if(g.fogColor!==undefined)scene.fog.color.copy(_pBase.fogC).lerp(_pcA.set(g.fogColor),f);
  if(g.fogNear !==undefined)scene.fog.near=_pBase.fogN+(g.fogNear-_pBase.fogN)*f;
  if(g.fogFar  !==undefined)scene.fog.far =_pBase.fogF+(g.fogFar -_pBase.fogF)*f;
  if(g.ambSky  !==undefined)amb.color.copy(_pBase.ambS).lerp(_pcA.set(g.ambSky),f);
  if(g.ambGround!==undefined)amb.groundColor.copy(_pBase.ambG).lerp(_pcB.set(g.ambGround),f);
  if(g.ambI    !==undefined)amb.intensity=_pBase.ambI+(g.ambI-_pBase.ambI)*f;
  if(g.sunI    !==undefined)sun.intensity=_pBase.sunI+(g.sunI-_pBase.sunI)*f;
  const am=_gradePlace.amb;
  if(am)setAmbienceGrade(1+((am.ext??1)-1)*f,1+((am.bird??1)-1)*f);
  if(f<=0)_gradePlace=null;                 // fully outside — release the grade
}

// --------------------------------- toast -------------------------------
// toast(main, sub?, jump?) : gold banner, auto-hides after 3s, queues if busy.
// jump=true is for a PAYOFF moment (a favor turn-in): it clears the pending queue
// and shows immediately, so the celebration never buries behind a run of
// incidental discovery toasts (082 — the Divvy-angel favor docks strays at real
// Divvy docks, each firing a 'DIVVY DOCK N/8' toast; without this the 'three
// bikes home safe' banner surfaced ~15 s late, long after the moment).
const _toastQ=[];let _toastBusy=false,_toastTO=null;
export function toast(main,sub,jump){
  if(jump){
    _toastQ.length=0;                                    // drop the incidental backlog (already popped on the chip)
    if(_toastTO){clearTimeout(_toastTO);_toastTO=null;}
    _toastBusy=false;                                    // let nextToast() take over the banner right now
  }
  _toastQ.push({main,sub:sub||''});
  if(!_toastBusy)nextToast();
}
function nextToast(){
  if(!_toastQ.length){_toastBusy=false;return;}
  _toastBusy=true;const{main,sub}=_toastQ.shift();
  elToastMain.textContent=main;elToastSub.textContent=sub;
  elToast.classList.add('show');
  _toastTO=setTimeout(()=>{_toastTO=null;elToast.classList.remove('show');setTimeout(nextToast,420);},3000);
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
  // the title page signs itself with the mayor's name (task 087) — the name is
  // sanitized to letters/spaces/apostrophes at entry, so it is HTML-safe here.
  const sign=`<div class="jsign">kept by the honorable ${mayorLabel()}</div>`;
  elJournalBody.innerHTML=sign+_sections.map(s=>{
    let html='';try{html=s.render();}catch(e){html='<i>…</i>';console.warn('[framework] journalSection render error',e);}
    if(!html)return '';   // a section with nothing to say hides its HEADER too — this is
                          // what lets a section register EAGERLY (holding a fixed slot in
                          // the journal's order) while staying invisible until it has
                          // something to show. 079's dibs section is the first user.
    return `<section class="jsec"><h2>${s.title}</h2>${html}</section>`;
  }).join('');
}
let _prevJ=false;
function toggleJournal(force){
  const open=force!==undefined?force:!elJournal.classList.contains('show');
  if(open){
    if(elTote)elTote.classList.remove('show');   // one card at a time
    if(elShop)elShop.classList.remove('show');
    { const s=$('settings');if(s)s.classList.remove('show'); }   // (settings card too — task 085)
    renderJournal();elJournal.classList.add('show');
  }else elJournal.classList.remove('show');
}

// -------------------------------- screen FX ----------------------------
// screenFx.flash(color,ms) : full-screen colour flash that fades out.
// screenFx.filter(cssFilter,ms) : CSS filter on the canvas, eased in/out.
// screenFx.shake(amt) : proxy for the shared fireworks camera shake.
let _filterTO=null;
export const screenFx={
  flash(color,ms=300){
    const peak=game.calm?0.34:0.85;                    // reduced-motion softens the flash (task 085)
    _fxflash.style.transition='none';_fxflash.style.background=color;_fxflash.style.opacity=String(peak);
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
function sitOnBench(b,player,quiet){
  _sit={x:b.x,z:b.z,y:SIT_LIFT+(b.y||0),ry:b.ry};   // b.y: base height for elevated seats (decks)
  player.vx=player.vz=0;player.x=b.x;player.z=b.z;
  hidePrompt();
  if(!quiet)toast('taking a load off','settle in — move to stand');   // idle auto-sit is quiet (task 087)
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

// ------------------------------ idle charm -----------------------------
// (task 087) When the player steps away, the world stays alive: after ~20 s of
// NO input the mayor stretches / yawns / checks the sky (a tiny state machine on
// the EXISTING rig — arm/leg/body rotation.x + head rotation, everything else
// restored by updateCharacter and the head reset here; NEVER manual shoe/hand
// animation, Bug 2 rules), and a bit of ambient life (a butterfly or a sparrow)
// drifts closer. After ~60 s, on safe FLAT ground, the mayor sits right down
// (reusing the sit warp). ANY input stands up instantly and never fights
// control. No idle during rides / activities / chases (gated on the ride flags
// + a shared state.idleBusy latch a session activity may set). Uses LOCAL time
// (game.tNow) + Math.random only — never the world rng (determinism untouched).
// Idle is DISABLED under ?play=1 (all tooling / baseline / walkthrough shots —
// headless pages run far more game time than waitMs, so an un-gated idle would
// pose or seat the mayor in EVERY waypoint shot). Real players (who click start,
// no ?play) always get it. Debug overrides for capturing the sequence:
//   ?idle=stretch — force on, stretch fast, never sit (the natural cycle)
//   ?idle=yawn    — force on, HOLD the peak yawn pose (a deterministic capture)
//   ?idle=sit     — force on, sit fast (~4 s)
//   ?idle=fast    — force on, fast timers (stretch ~2 s, sit ~8 s)
//   ?idle=1       — force on with the real 20 s / 60 s timers (parity)
//   ?idle=0       — force off
const _IDBG=new URLSearchParams(location.search);
const _idleParam=_IDBG.get('idle');
const IDLE_ENABLED=_idleParam==='0'?false:(_IDBG.get('play')==='1'?!!_idleParam:true);
const IDLE_HOLD_YAWN=_idleParam==='yawn';
const _idleFast=_idleParam==='fast'||_idleParam==='stretch'||_idleParam==='yawn'||_idleParam==='sit';
const IDLE_STRETCH_AT=_idleFast?2:20;
const IDLE_SIT_AT=_idleParam==='sit'?4:((_idleParam==='stretch'||_idleParam==='yawn')?1e9:(_idleFast?8:60));
const ESC4=[[0.7,0],[-0.7,0],[0,0.7],[0,-0.7]];
let _idleT=0,_idlePhase=0,_idleSit=false,_idleLookPx=0,_critter=null,_critterKind=0;
// main.js hands us a ground probe (walk + surface height) so we can tell whether
// the spot underfoot is safe FLAT ground to sit on — the walk data lives in the
// engine, so we borrow it rather than fork it (the shared-definition rule).
let _idleGround=null;
export function setIdleGroundProbe(fn){_idleGround=fn;}
function idleInputNow(){
  const look=cam.lookPx,moved=look!==_idleLookPx;_idleLookPx=look;
  const real=keys.size>0||_touchAct||joy.len>0.2||joy.id!==null||jump.buf>0||moved;
  const orbit=!_idleSit&&cam.freeT>0;   // desktop/touch look-drag (sit sets freeT itself — ignore it while seated)
  return real||orbit;
}
function idleBlocked(){
  return !game.running||_charge||state.onWater||state.onIce||(state.rideSpeed>0)||state.idleBusy;
}
function idleFlatSafe(player){
  if(!_idleGround)return false;
  if(Math.hypot(player.vx||0,player.vz||0)>0.12)return false;
  const c=_idleGround(player.x,player.z);
  if(!c||!c.walk)return false;
  if(Math.abs((player.y||0)-c.y)>0.35)return false;   // airborne / on the jetski
  let lo=c.y,hi=c.y;
  for(const[ox,oz]of ESC4){
    const s=_idleGround(player.x+ox,player.z+oz);
    if(!s||!s.walk)return false;
    if(s.y<lo)lo=s.y;if(s.y>hi)hi=s.y;
  }
  return (hi-lo)<0.22;                                 // level enough to plop down
}
function resetIdlePose(){ mparts.head.rotation.x=0;mparts.head.rotation.z=0; }   // arms/legs/body are re-stamped by updateCharacter; only the head is ours to clear
function poseIdleStretch(a){
  const p=mparts;
  if(IDLE_HOLD_YAWN){                                   // debug: freeze the peak yawn for a clean capture
    p.armL.rotation.x=-2.3;p.armR.rotation.x=-2.3;
    p.body.rotation.x=-0.14;p.body.scale.y=1.12*1.06;
    p.head.rotation.x=-0.4;p.head.rotation.z=0;
    p.legL.rotation.x=0.05;p.legR.rotation.x=-0.05;
    return;
  }
  const cyc=a%10;
  if(cyc<3.2){                                          // the big stretch + yawn
    const k=Math.sin((cyc/3.2)*Math.PI);                // 0 → 1 → 0
    p.armL.rotation.x=-2.3*k;p.armR.rotation.x=-2.3*k;  // arms rise overhead
    p.body.rotation.x=-0.14*k;p.body.scale.y=1.12*(1+0.06*k);
    p.head.rotation.x=-0.4*k;p.head.rotation.z=0;       // chin up
    p.legL.rotation.x=0.05*k;p.legR.rotation.x=-0.05*k;
  }else if(cyc<6){                                      // check the sky, glance around
    const k=Math.sin(((cyc-3.2)/2.8)*Math.PI);
    p.head.rotation.x=-0.3*k;p.head.rotation.z=0.22*Math.sin((cyc-3.2)*1.6);
    p.body.rotation.x=-0.04*k;p.armL.rotation.x=0;p.armR.rotation.x=0;
  }else{                                                // settle — a slow breathing sway
    const s=Math.sin(a*1.1);
    p.head.rotation.x=0.02*s;p.head.rotation.z=0.05*s;p.body.rotation.x=0;
    p.armL.rotation.x=0.04*s;p.armR.rotation.x=-0.04*s;
  }
}
// ambient life: one reusable rig (a butterfly OR a sparrow), built lazily on the
// first idle, hidden otherwise (drawn only while it's actually visiting; ≤4
// draws, near the player). Self-lit-ish toon, no world rng.
function buildCritter(){
  const g=new THREE.Group();g.visible=false;g.name='idle-critter';scene.add(g);
  const bf=new THREE.Group();                            // butterfly
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.34,5),toon(0x3a2a22));body.rotation.x=Math.PI/2;bf.add(body);
  const wm=toon(0xf2a6c8,{mat:{side:THREE.DoubleSide}}),wg=new THREE.CircleGeometry(0.16,10);
  const wL=new THREE.Mesh(wg,wm),wR=new THREE.Mesh(wg,wm);
  wL.rotation.y=0.5;wR.rotation.y=-0.5;bf.add(wL,wR);bf._wings=[wL,wR];g.add(bf);
  const sp=new THREE.Group();                            // sparrow
  const sBody=new THREE.Mesh(new THREE.SphereGeometry(0.13,9,8),toon(0x8a6b4a));sBody.scale.set(1,0.9,1.25);
  const sHead=new THREE.Mesh(new THREE.SphereGeometry(0.09,8,7),toon(0x6f523a));sHead.position.set(0,0.11,0.14);
  const sBeak=new THREE.Mesh(new THREE.ConeGeometry(0.03,0.09,5),toon(0xdca23a));sBeak.rotation.x=Math.PI/2;sBeak.position.set(0,0.1,0.24);
  const sTail=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.02,0.16),toon(0x6f523a));sTail.position.set(0,0.02,-0.16);
  sp.add(sBody,sHead,sBeak,sTail);g.add(sp);
  g._bf=bf;g._sp=sp;g._t=0;
  return g;
}
function spawnCritter(player){
  if(!_critter)_critter=buildCritter();
  _critterKind=Math.random()<0.5?0:1;
  _critter._bf.visible=_critterKind===0;_critter._sp.visible=_critterKind===1;
  const ang=Math.random()*Math.PI*2,r=7+Math.random()*3;
  _critter.position.set(player.x+Math.cos(ang)*r,2.4+Math.random()*0.8,player.z+Math.sin(ang)*r);
  _critter._t=0;_critter.visible=true;
}
function tickCritter(dt,player){
  if(!_critter||!_critter.visible)return;
  const tt=(_critter._t+=dt);
  const hx=player.x+Math.cos(tt*0.5)*2.2,hz=player.z+Math.sin(tt*0.5)*2.2;   // slow circle near the mayor
  const hy=(_critterKind===0?2.0:1.3)+Math.sin(tt*2.2)*0.18;
  const k=1-Math.exp(-1.4*dt);
  _critter.position.x=lerp(_critter.position.x,hx,k);
  _critter.position.y=lerp(_critter.position.y,hy,k);
  _critter.position.z=lerp(_critter.position.z,hz,k);
  const fx=hx-_critter.position.x,fz=hz-_critter.position.z;
  if(Math.abs(fx)+Math.abs(fz)>1e-3)_critter.rotation.y=Math.atan2(fx,fz);
  if(_critterKind===0){                                                       // butterfly flap + flutter tilt
    const f=Math.sin(tt*16)*0.7;
    _critter._bf._wings[0].rotation.y=0.5+f;_critter._bf._wings[1].rotation.y=-0.5-f;
    _critter.rotation.z=Math.sin(tt*2)*0.1;
  }else{ _critter._sp.rotation.x=Math.sin(tt*3)*0.06;_critter.rotation.z=0; }  // sparrow bob
}
function retireCritter(){ if(_critter)_critter.visible=false; }
function updateIdle(dt,player){
  if(!IDLE_ENABLED)return;
  if(idleInputNow()||idleBlocked()){
    if(_idleSit){_sit=null;_idleSit=false;}
    if(_idlePhase)resetIdlePose();
    _idleT=0;_idlePhase=0;retireCritter();
    return;
  }
  if(_sit){ if(_idleSit)tickCritter(dt,player); return; }   // a sit (bench or ours) owns the pose; keep the visitor company
  _idleT+=dt;
  if(_idleT<IDLE_STRETCH_AT){ if(_idlePhase){resetIdlePose();_idlePhase=0;} return; }
  if(!_idlePhase){ _idlePhase=1;spawnCritter(player); }
  poseIdleStretch(_idleT-IDLE_STRETCH_AT);
  tickCritter(dt,player);
  if(_idleT>=IDLE_SIT_AT&&idleFlatSafe(player)){
    resetIdlePose();_idleSit=true;
    sitOnBench({x:player.x,z:player.z,ry:mayor.rotation.y},player,true);
  }
}

// ------------------------ interact affordance (task 091) ----------------
// (owner 2026-07-18: "it should be more clear you can engage with people you
// can engage with. Objects you can interact with should appear interactable
// but not unnaturally so.") ONE shared quiet mechanism — packs inherit it,
// nothing opts in, nothing is hand-rolled per pack:
//   * PEOPLE — a framework NPC standing AT an enabled interaction (the Malört
//     guy, the counter regulars) GLANCES at a near player: the head eases
//     toward you inside ~6 m, clamped to a natural neck arc, and eases back
//     when you leave or walk behind them. Decorative NPCs never do — that is
//     the read-at-a-glance difference in one frame.
//   * OBJECTS — an enabled interaction anchor with NO person on it gets a
//     faint warm glint: a single soft additive point twinkling ~0.95 m over
//     the spot, fading in from ~6.5 m, bobbing a few cm. A catch-light, not a
//     quest marker (no outline, no arrow, never full-bright).
// Gated by the 087 idle-gate law: OFF under ?play=1 (baseline/walkthrough
// shots) unless ?affordance=1; ?affordance=0 forces off for a real player.
// Local time only, Math-free of the world rng — determinism untouched.
const _affParam=_IDBG.get('affordance');
const AFF_ENABLED=_affParam==='0'?false:(_IDBG.get('play')==='1'?_affParam==='1':true);
const AFF_NEAR=4.5,AFF_FAR=6.5,AFF_FAR2=AFF_FAR*AFF_FAR;  // glint fade band (m)
const AFF_MAX=6;                                          // glint pool size
const AFF_NPC2=2.2*2.2,AFF_BUMP2=1.6*1.6;                 // "a person is on this anchor" radii²
let _affPts=null,_affPos=null,_affCol=null,_affSize=null;
const _affGlints=[];                                      // live interaction handles (refs only)
let _affScanT=0,_affNpcT=0;
function affBuild(){
  const g=new THREE.BufferGeometry();
  // 2 points per glint: a soft warm HALO + a small near-white CORE — additive
  // cream alone washes out over bright toon lawns/sand (the 090 overlay law:
  // contrast against the NEAR field), the hot core survives any background.
  _affPos=new Float32Array(AFF_MAX*6);_affCol=new Float32Array(AFF_MAX*6);_affSize=new Float32Array(AFF_MAX*2);
  g.setAttribute('position',new THREE.BufferAttribute(_affPos,3));
  g.setAttribute('aColor',new THREE.BufferAttribute(_affCol,3));
  g.setAttribute('aSize',new THREE.BufferAttribute(_affSize,1));
  _affPts=new THREE.Points(g,pointsMat());
  _affPts.frustumCulled=false;_affPts.visible=false;_affPts.name='affordance-glints';
  scene.add(_affPts);
}
// throttled: which NPCs stand at an enabled interaction (they GLANCE, and they
// suppress the glint — a sparkle on a person reads wrong).
function affScanNpcs(){
  for(const npc of _npcs){
    let hit=null;
    const gx=npc.group.position.x,gz=npc.group.position.z;
    for(const it of _interactions){
      if(!it.enabled)continue;
      const dx=it.x-gx,dz=it.z-gz;
      if(dx*dx+dz*dz<AFF_NPC2){hit=it;break;}
    }
    npc._affInter=hit;
  }
}
// throttled: the nearby object anchors that get a glint this beat. Excludes
// priority<0 (player-following prompts anchor ON the player) and any anchor
// with a person (NPC or bumpable figure) standing on it.
function affScanGlints(player){
  _affGlints.length=0;
  for(const it of _interactions){
    if(_affGlints.length>=AFF_MAX)break;
    if(!it.enabled||it.priority<0)continue;
    const dx=player.x-it.x,dz=player.z-it.z;
    if(dx*dx+dz*dz>AFF_FAR2)continue;
    let person=false;
    for(const n of _npcs){const ax=n.group.position.x-it.x,az=n.group.position.z-it.z;if(ax*ax+az*az<AFF_NPC2){person=true;break;}}
    if(!person)for(const b of _bumpables){const ax=b.group.position.x-it.x,az=b.group.position.z-it.z;if(ax*ax+az*az<AFF_BUMP2){person=true;break;}}
    if(person)continue;
    if(it._affY===undefined){const c=_idleGround?_idleGround(it.x,it.z):null;it._affY=c?c.y:(player.y||0);}
    _affGlints.push(it);
  }
}
// debug/tools probe (091): live affordance state — enabled flag, glint count,
// points visibility, and per-NPC glance angles. Installed on the FIRST update
// frame (main.js assigns window.__hd wholesale at load — the econ-hook clobber).
let _affDbg=false;
function affInstallDbg(){
  _affDbg=true;
  try{window.__hd=window.__hd||{};window.__hd.aff=()=>({enabled:AFF_ENABLED,glints:_affGlints.length,
    ptsVisible:!!(_affPts&&_affPts.visible),
    glances:_npcs.filter(n=>Math.abs(n._glance||0)>0.05).map(n=>({name:n.name,g:+(n._glance||0).toFixed(2)}))});}catch(e){}
}
function updateAffordance(dt,t,player){
  if(!_affDbg)affInstallDbg();
  if(!AFF_ENABLED)return;
  _affNpcT-=dt;if(_affNpcT<=0){_affNpcT=1.2;affScanNpcs();}
  _affScanT-=dt;if(_affScanT<=0){_affScanT=0.45;affScanGlints(player);}
  // --- object glints (one Points draw, visible only when something is near) ---
  if(_affGlints.length&&!_affPts)affBuild();
  if(_affPts){
    let n=0;
    for(let i=0;i<_affGlints.length;i++){
      const it=_affGlints[i];
      const dx=player.x-it.x,dz=player.z-it.z,d=Math.sqrt(dx*dx+dz*dz);
      const fade=clamp((AFF_FAR-d)/(AFF_FAR-AFF_NEAR),0,1);
      if(fade<=0)continue;
      const ph=(it.x*7.13+it.z*3.71)%6.283;          // per-anchor phase, no rng
      const tw=0.7+0.3*Math.sin(t*2.1+ph*2.3);       // never fully dark — a shot always catches it
      const gy=it._affY+0.8+0.09*Math.sin(t*1.4+ph);
      const j=n*6;                                   // halo then core
      _affPos[j]=it.x;_affPos[j+1]=gy;_affPos[j+2]=it.z;
      _affPos[j+3]=it.x;_affPos[j+4]=gy;_affPos[j+5]=it.z;
      const ah=0.42*fade*tw,ac=0.95*fade*tw;
      _affCol[j]=ah;_affCol[j+1]=0.72*ah;_affCol[j+2]=0.38*ah;      // amber halo
      _affCol[j+3]=ac;_affCol[j+4]=0.93*ac;_affCol[j+5]=0.78*ac;    // warm-white core
      _affSize[n*2]=0.85+0.16*tw;
      _affSize[n*2+1]=0.3+0.07*tw;
      n++;
    }
    if(n||_affPts.visible){
      _affPts.geometry.attributes.position.needsUpdate=true;
      _affPts.geometry.attributes.aColor.needsUpdate=true;
      _affPts.geometry.attributes.aSize.needsUpdate=true;
      _affPts.geometry.setDrawRange(0,n*2);
      _affPts.visible=n>0;
    }
  }
  // --- interactive-NPC glance (heads ease toward a near player) ---
  for(const npc of _npcs){
    if(!npc.group.visible)continue;
    const g=npc.group,p=npc.parts;
    let tgt=0;
    if(npc._affInter&&npc._affInter.enabled){
      const dx=player.x-g.position.x,dz=player.z-g.position.z;
      if(dx*dx+dz*dz<36){
        let rel=Math.atan2(dx,dz)-g.rotation.y;
        rel=((rel%6.2832)+9.4248)%6.2832-3.1416;     // normalize to (-π,π]
        if(Math.abs(rel)<1.35)tgt=clamp(rel,-0.55,0.55);   // never owl-neck
      }
    }
    const cur=npc._glance||0;
    const nx=lerp(cur,tgt,1-Math.exp(-4*dt));
    npc._glance=nx;
    if(Math.abs(nx)>0.002||Math.abs(cur)>0.002)p.head.rotation.y=nx;
  }
}

// ------------------------------ per-frame ------------------------------
// runUpdates(dt,t,player) : called by main.js each frame (after the camera is
// positioned). Drives tracking, interactions, charge, NPCs and pack updates.
let _lpx=null,_lpz=null,_prevCool=0,_fcArmed=false,_zoneAcc=0,_npcCullAcc=0,_prevB=false;
export function runUpdates(dt,t,player){
  if(dt<0)dt=0;                          // frame-0 rAF can hand us a negative dt
  econUpdate(dt);                        // one-shot __hd/worn restore + slow save snapshot
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
  // --- tote toggle (B, desktop) — touch uses #btnTote ---
  const bNow=keys.has('b');if(bNow&&!_prevB){ if(toteIsOpen())bag.close(); else bag.open(); }_prevB=bNow;

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
  // --- idle charm (task 087): after the sit/charge/scan block so packs that
  // pose the mayor (kite, swings) still win; before pack updates so an idle sit
  // it starts is respected. Reads only local time + Math.random. ---
  updateIdle(dt,player);

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
      if(npc.twin){
        // 3-zone LOD (hysteresis): near=live rig, mid=baked twin, far=neither.
        // Movers swap at 90m and re-sync the twin each tick; static swaps at 60m.
        const near2=npc.moverLod?MOVER_NEAR2:LOD_NEAR2, far2=npc.moverLod?MOVER_FAR2:LOD_FAR2;
        let z=npc._lod;
        if(z==='near'){ if(d2>NPC_CULL_HIDE2)z='far'; else if(d2>far2)z='mid'; }
        else if(z==='mid'){ if(d2<near2)z='near'; else if(d2>NPC_CULL_HIDE2)z='far'; }
        else{ if(d2<near2)z='near'; else if(d2<NPC_CULL_SHOW2)z='mid'; }
        npc._lod=z;
        const active=npc._lodActive!==false, live=active&&z==='near', mid=active&&z==='mid';
        if(mid&&(npc.moverLod||!npc.twin.visible)){        // movers re-sync every tick; static once, on the swap in
          npc.twin.position.copy(npc.group.position); npc.twin.rotation.y=npc.group.rotation.y;
        }
        npc.group.visible=live; npc.twin.visible=mid;
        if(!live){npc._bubbleT=0;npc._bubbleEl.style.display='none';}
      }else if(npc.group.visible){
        if(d2>NPC_CULL_HIDE2){npc.group.visible=false;npc._bubbleT=0;npc._bubbleEl.style.display='none';}
      }else if(d2<NPC_CULL_SHOW2){npc.group.visible=true;}
    }
  }
  // --- NPCs ---
  for(const npc of _npcs){ if(!npc.group.visible)continue; updateNPC(npc,dt,t,player); }

  // --- interact affordance (091): glance + glints. BEFORE pack updates, so a
  // pack that re-poses its NPC's head in registerUpdate still wins the frame ---
  updateAffordance(dt,t,player);

  // --- pack updates ---
  for(let i=0;i<_updates.length;i++){try{_updates[i](dt,t,player);}catch(e){console.warn('[framework] update error',e);}}

  // --- bumpable figures: shared "ope" bubble (after packs move their rigs) ---
  updateBumpables(dt,player);

  // --- places (cells): graded room transitions ---
  updatePlaces(dt,player);
}

// =====================================================================
//  THE ECONOMY (task 078) — dibs currency · the tote · shops · favors
//  The frozen framework contract that 079+ build activities/shops/quests on.
//  Everything is DOM + holdItem meshes only (≈0 draw calls); nothing here
//  touches the world rng. Persistence rides src/store.js's save blob.
// =====================================================================

// a compact folding lawn chair, for the shop price glyph (the HUD chip carries
// its own bigger copy in index.html). avocado webbing on a light tan panel + an
// aluminum X frame, so it reads at ~15 px against a cream card.
const CHAIR_SVG_SM='<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" style="vertical-align:-2px">'
  +'<g stroke="#a7b0b4" stroke-width="1.9" stroke-linecap="round" fill="none"><path d="M6 21 17 11"/><path d="M18 21 7 11"/></g>'
  +'<g transform="rotate(-23 7 12)"><rect x="4.1" y="2.6" width="5.2" height="10.6" rx="1.5" fill="#e7d9b6"/>'
  +'<rect x="4.9" y="3.4" width="1.4" height="9" rx=".7" fill="#7a9e4f"/><rect x="7" y="3.4" width="1.4" height="9" rx=".7" fill="#7a9e4f"/></g>'
  +'<rect x="5.6" y="9.8" width="12.8" height="4.8" rx="1.6" fill="#e7d9b6"/>'
  +'<rect x="7.1" y="10.5" width="1.5" height="3.4" rx=".7" fill="#7a9e4f"/><rect x="9.9" y="10.5" width="1.5" height="3.4" rx=".7" fill="#7a9e4f"/>'
  +'<rect x="12.7" y="10.5" width="1.5" height="3.4" rx=".7" fill="#7a9e4f"/><rect x="15.5" y="10.5" width="1.5" height="3.4" rx=".7" fill="#7a9e4f"/></svg>';

// -------- chip / register pop helpers (motion on the CHILD, per PITFALLS) ----
// revealChip also marks the BODY: the touch hint sits in the same top-left box
// as the chip and slides below it via body.touch.hasdibs (index.html). A body
// class rather than a sibling selector — #hint/#dibs DOM order isn't a contract.
function revealChip(){ if(elDibs){elDibs.classList.add('on');document.body.classList.add('hasdibs');} }
function refreshChip(){ if(elDibsN)elDibsN.textContent=String(getSave().dibs); }
function pulseChip(){ if(!elDibs)return; elDibs.classList.remove('pulse');void elDibs.offsetWidth;elDibs.classList.add('pulse'); }
function shakeChip(){ if(!elDibs)return; elDibs.classList.remove('short');void elDibs.offsetWidth;elDibs.classList.add('short'); }
let _popTO=null,_popN=0,_popT=-1e9;
// showDibsPop(n,txt) — the dry register line, `+3 dibs · reason`.
// COALESCE (task 079): a completion beat almost always pays on the SAME FRAME as
// the increment that completed it (last bird + BINGO, last dock + the whole
// network, last hole + round done — five such pairs across the activity set).
// Two raw pops in one frame would show the first for ~0 ms, so sum anything
// inside a 0.4 s window and keep the LATER reason — completion always pays
// second, and it's the bigger moment. The window is deliberately far shorter
// than the 1600 ms display so two genuinely separate beats never merge.
function showDibsPop(n,txt){
  if(!elDibsPop)return;
  _popN=(game.tNow-_popT<0.4)?_popN+n:n; _popT=game.tNow;
  elDibsPop.textContent='+'+_popN+' dibs'+(txt?' · '+txt:'');
  elDibsPop.classList.remove('show');void elDibsPop.offsetWidth;elDibsPop.classList.add('show');
  clearTimeout(_popTO);_popTO=setTimeout(()=>{if(elDibsPop)elDibsPop.classList.remove('show');},1600);
}
// a tiny synthesized coin "dink": two quick sine blips, quiet. Guarded — actx is
// null until the player clicks start (constraint 4). Rate-limited to match the
// pop's coalescing: two dinks at the same instant phase-double into a clack.
let _dinkT=-1e9;
function coinDink(){
  const a=getAudioCtx();if(!a||!a.actx)return;
  if(a.actx.currentTime-_dinkT<0.08)return; _dinkT=a.actx.currentTime;
  const {actx,sfxBus}=a,dest=sfxBus||actx.destination,now=actx.currentTime;
  [1300,1750].forEach((f,i)=>{
    const o=actx.createOscillator(),g=actx.createGain(),t0=now+i*0.055;
    o.type='sine';o.frequency.value=f;
    g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(0.05,t0+0.008);
    g.gain.exponentialRampToValueAtTime(0.0008,t0+0.1);
    o.connect(g);g.connect(dest);o.start(t0);o.stop(t0+0.13);
  });
}

// -------------------------------- wallet -------------------------------
// wallet.dibs · earnDibs(n,reason,label) · spendDibs(n,reason)->bool · pay(opts)->int
const _payRepeats={};   // per-key paid-repeat counts THIS SESSION (never persisted)
const _payAt={};        // per-key last-paid game time — backs pay()'s `cd` throttle
export const wallet={
  get dibs(){ return getSave().dibs; },
  // earn: bump balance, pulse the chip, show the dry register pop. First-EVER
  // earn also gets the gold toast + reveals the chip + a coin dink.
  // label (079): the ledger bucket for the journal's biggest-earner line.
  earnDibs(n,reason,label){
    if(!(n>0))return;
    const sv=getSave();
    sv.dibs+=n;markDirty();
    const b=label||reason||'odds & ends';
    state.dibsBy=state.dibsBy||{};state.dibsBy[b]=(state.dibsBy[b]||0)+n;
    refreshChip();revealChip();pulseChip();
    showDibsPop(n,reason);
    if(sv.flags['ope.dibs']!=='1'){
      sv.flags['ope.dibs']='1';markDirty();
      toast('your first dibs!','claimed, like a shoveled parking spot');
    }
    coinDink();
  },
  // spend: refuse (gentle chip shake, no toast) when short; else deduct.
  spendDibs(n,reason){
    const sv=getSave();
    if(sv.dibs<n){ shakeChip(); return false; }
    sv.dibs-=n;markDirty();refreshChip();
    return true;
  },
  // pay: the shared payout helper — activities call THIS, never earnDibs.
  // First time for `key` pays `first`; repeats pay `repeat`, halving (floor,
  // min 1) after 10 paid repeats of that key this session. paidFirsts persists
  // (via the state snapshot); the repeat count does not.
  //   label (079) — ledger bucket for the journal (defaults to key).
  //   cd    (079) — min seconds between PAID REPEATS of this key; the anti-spam
  //                 valve for beats that can fire in a fast loop. The first-ever
  //                 payout is NEVER throttled — that gift always lands.
  // Returns the amount paid: 0 when throttled, or when a beat defines no repeat
  // value (a once-ever payout like a zone discovery just goes quiet forever).
  pay({key,first,repeat,reason,firstReason,label,cd}){
    state.paidFirsts=state.paidFirsts||{};
    const isFirst=!state.paidFirsts[key];
    let amount,r;
    if(isFirst){ amount=first;r=firstReason||reason; }
    else{
      if(cd&&game.tNow-(_payAt[key]||-1e9)<cd)return 0;
      amount=repeat;r=reason;
      if((_payRepeats[key]||0)>=10)amount=Math.max(1,Math.floor(amount/2));
    }
    if(!(amount>0))return 0;                      // nothing to pay: no pop, no bookkeeping
    if(isFirst)state.paidFirsts[key]=1; else _payRepeats[key]=(_payRepeats[key]||0)+1;
    _payAt[key]=game.tNow;
    wallet.earnDibs(amount,r,label||key);
    return amount;
  },
};

// --------------------------------- bag ---------------------------------
// bag.define · add · remove · has · count · equip · unequip · worn · defs ·
// open · close · heldId. Owned counts live in save.bag; the worn cosmetic in
// save.worn. Item defs are session-scoped (packs re-define them each load).
function toteIsOpen(){ return !!(elTote&&elTote.classList.contains('show')); }
function bagRefresh(){ if(toteIsOpen())renderTote(); }
// ---- tote affordance (task 091 — owner: "accessing your tote should be more
// obvious"). Two layers, both DOM-only (no gating needed: nothing fires without
// a real pickup, so play=1 baseline/walkthrough shots never see them):
//   * a persistent COUNT BADGE on the touch 🧺 button (items in the tote) that
//     pops on every add — the tote visibly HAS your stuff;
//   * a one-time first-pickup hint: a toast naming the input (B / the 🧺) plus,
//     on touch, a short glow pulse on the button itself (animation lives on the
//     button's box-shadow, badge pop on the CHILD — the 077 opacity law).
const TOTE_SEEN='ope.tote.v1';
let _toteNudgeTO=null;
function refreshToteBadge(){
  if(!elToteN)return;
  const b=getSave().bag;let n=0;for(const k in b)if(b[k]>0)n+=b[k];
  elToteN.textContent=n>9?'9+':String(n);
  elToteN.style.display=n>0?'flex':'none';
}
function toteNudge(){
  refreshToteBadge();
  if(elToteN){ elToteN.classList.remove('pop');void elToteN.offsetWidth;elToteN.classList.add('pop'); }
  if(!getFlag(TOTE_SEEN)){
    setFlag(TOTE_SEEN,'1');
    toast('into the tote it goes',IS_TOUCH()?'tap the 🧺 to rummage':'press B to rummage');
    if(IS_TOUCH()&&elBtnTote){
      elBtnTote.classList.add('nudge');
      clearTimeout(_toteNudgeTO);_toteNudgeTO=setTimeout(()=>{if(elBtnTote)elBtnTote.classList.remove('nudge');},8000);
    }
  }
}
export const bag={
  defs:new Map(),
  // def = {id,name,icon,kind:'holdable'|'gear'|'collectible'|'cosmetic',caption,
  //        onUse(),onStow(),onEquip(),onUnequip()}. icon is an emoji or inline SVG.
  define(def){ if(def&&def.id){ bag.defs.set(def.id,def);bagRefresh(); } return def; },
  add(id,n=1){ const sv=getSave();sv.bag[id]=(sv.bag[id]||0)+n;markDirty();bagRefresh();toteNudge(); },
  remove(id,n=1){ const sv=getSave();if(sv.bag[id]){ sv.bag[id]-=n;if(sv.bag[id]<=0)delete sv.bag[id];markDirty();bagRefresh();refreshToteBadge(); } },
  has(id){ return (getSave().bag[id]||0)>0; },
  count(id){ return getSave().bag[id]||0; },
  worn(){ return getSave().worn; },
  heldId(){ return _heldId; },
  equip(id){
    const def=bag.defs.get(id);if(!def)return;
    const sv=getSave();
    if(sv.worn&&sv.worn!==id){ const cur=bag.defs.get(sv.worn);if(cur&&cur.onUnequip)try{cur.onUnequip();}catch(e){console.warn('[econ] onUnequip',e);} }
    sv.worn=id;markDirty();
    if(def.onEquip)try{def.onEquip();}catch(e){console.warn('[econ] onEquip',e);}
    bagRefresh();
  },
  unequip(){
    const sv=getSave();
    if(sv.worn){ const cur=bag.defs.get(sv.worn);sv.worn=null;markDirty();
      if(cur&&cur.onUnequip)try{cur.onUnequip();}catch(e){console.warn('[econ] onUnequip',e);} }
    bagRefresh();
  },
  open(){ openTote(); },
  close(){ if(elTote)elTote.classList.remove('show'); },
};
// bag's own holdable use/stow — flagged so holdItem() keeps the "in hand" marker.
function bagUse(def){
  _bagHold=true;
  try{ if(def.onUse)def.onUse(); }catch(e){console.warn('[econ] onUse',e);}
  _bagHold=false;
  _heldId=def.id;
}
function bagStow(def){
  try{ if(def.onStow)def.onStow(); }catch(e){console.warn('[econ] onStow',e);}
  _bagHold=true;holdItem(null);_bagHold=false;
  _heldId=null;
}
function toteTap(id){
  const def=bag.defs.get(id);if(!def)return;
  if(elToteCap)elToteCap.textContent=def.caption||'';
  if(def.kind==='holdable'){
    if(_heldId===id)bagStow(def); else bagUse(def);
    renderTote();
    bag.close();   // holdable-use closes the card so the player sees their hand
    return;
  }
  if(def.kind==='cosmetic'){
    if(getSave().worn===id)bag.unequip(); else bag.equip(id);
    return;        // keep the card open
  }
  // gear / collectible: fire onUse, keep the card open
  try{ if(def.onUse)def.onUse(); }catch(e){console.warn('[econ] onUse',e);}
  renderTote();
}
function renderTote(){
  if(!elToteGrid)return;
  const sv=getSave();
  const ids=Object.keys(sv.bag).filter(id=>sv.bag[id]>0&&bag.defs.has(id));
  if(!ids.length){
    elToteGrid.innerHTML='<div class="tempty">just sand in here<span>the kiosk at the dog beach sells treats</span></div>';
    if(elToteCap)elToteCap.textContent='';
    return;
  }
  elToteGrid.innerHTML=ids.map(id=>{
    const def=bag.defs.get(id),n=sv.bag[id],held=_heldId===id,worn=sv.worn===id;
    const mark=held?'<span class="tmark">in hand</span>':worn?'<span class="tmark">wearing</span>':'';
    const badge=n>1?`<span class="tcount">${n}</span>`:'';
    return `<div class="ttile${held||worn?' active':''}" data-id="${id}">`
      +`<div class="ticon">${def.icon||'▫'}</div><span class="tname">${def.name||id}</span>${badge}${mark}</div>`;
  }).join('');
  elToteGrid.querySelectorAll('.ttile').forEach(t=>t.addEventListener('click',()=>toteTap(t.getAttribute('data-id'))));
}
function openTote(){
  toggleJournal(false);if(elShop)elShop.classList.remove('show');   // one card at a time
  { const s=$('settings');if(s)s.classList.remove('show'); }        // (settings card too — task 085)
  if(elBtnTote)elBtnTote.classList.remove('nudge');                 // found it — stop nudging (091)
  renderTote();
  if(elTote)elTote.classList.add('show');
}

// -------------------------------- shop ---------------------------------
// shop.open({title,keeper,items:[{id,price}]}) — buy = spendDibs + bag.add.
let _shopItems=[];
export const shop={
  open({title,keeper,items}){
    _shopItems=items||[];
    if(elShopTitle)elShopTitle.textContent=title||'the kiosk';
    if(elShopKeeper)elShopKeeper.textContent=keeper||'';
    toggleJournal(false);if(elTote)elTote.classList.remove('show');   // one card at a time
    { const s=$('settings');if(s)s.classList.remove('show'); }        // (settings card too — task 085)
    renderShop();
    if(elShop)elShop.classList.add('show');
  },
  close(){ if(elShop)elShop.classList.remove('show'); },
};
function renderShop(){
  if(!elShopRows)return;
  elShopRows.innerHTML=_shopItems.map((it,i)=>{
    const def=bag.defs.get(it.id)||{},owned=bag.has(it.id);
    const right=owned
      ? '<span class="sowned">in your tote ✓</span>'
      : `<div class="sbuy"><span class="sprice">${CHAIR_SVG_SM}${it.price}</span><button class="sbtn" data-i="${i}">buy</button></div>`;
    return `<div class="srow" data-i="${i}"><div class="sicon">${def.icon||'▫'}</div>`
      +`<div class="sinfo"><b>${def.name||it.id}</b><span>${def.caption||''}</span></div>${right}</div>`;
  }).join('');
  elShopRows.querySelectorAll('.sbtn').forEach(b=>b.addEventListener('click',()=>shopBuy(+b.getAttribute('data-i'))));
}
function shopBuy(i){
  const it=_shopItems[i];if(!it)return;
  const def=bag.defs.get(it.id)||{};
  if(wallet.spendDibs(it.price,def.name||it.id)){
    bag.add(it.id);
    toast(def.name||it.id, def.kind==='cosmetic'?'try it on from the tote':"that's yours now");
    renderShop();
  }else{
    // wallet already shook the chip; the row does a tiny refusal shake, no toast
    const row=elShopRows.querySelector(`.srow[data-i="${i}"]`);
    if(row){ row.classList.remove('refuse');void row.offsetWidth;row.classList.add('refuse'); }
  }
}

// -------------------------------- favors -------------------------------
// favors.register · offer · advance · complete · at. Never "quests" in copy.
// State in save.favors[id] = {st:'active'|'done', step}. Done-this-session ids
// stay in the journal one session (in memory), then retire.
const _favorDefs=new Map();
const _doneThisSession=new Set();
let _todoWired=false;
// the To-do journal section renders only once ANY favor has ever been offered
// (save.favors non-empty). Registered lazily so a fresh boot shows no section.
function ensureTodoSection(){
  if(_todoWired)return;
  if(!Object.keys(getSave().favors).length)return;
  _todoWired=true;
  journalSection('todo','To-do',()=>{
    const sv=getSave();let rows=[];
    for(const [id,def] of _favorDefs){                       // active REGISTERED favors: current step line
      const f=sv.favors[id];
      if(f&&f.st==='active'){
        const line=(def.todo&&def.todo[f.step||0])||def.title||id;
        rows.push(`<div class="jrow"><span>· ${line}</span></div>`);
      }
    }
    for(const id of _doneThisSession){                       // done THIS session: quiet ✓ line
      const def=_favorDefs.get(id);
      rows.push(`<div class="jrow jdone"><span>✓ ${def?def.title:id}</span></div>`);
    }
    return rows.join('')||'<i>all caught up</i>';
  });
}
export const favors={
  // def = {id,title,giver,reward,todo:[step0,step1,…],doneToast:{main,sub}}
  register(def){ if(def&&def.id){ _favorDefs.set(def.id,def);ensureTodoSection(); } return def; },
  offer(id){
    const def=_favorDefs.get(id);if(!def)return;
    const sv=getSave();
    if(sv.favors[id]&&sv.favors[id].st)return;               // idempotent
    sv.favors[id]={st:'active',step:0};markDirty();
    ensureTodoSection();
    toast(def.giver+' needs a favor',"it's in your journal");
  },
  advance(id){ const f=getSave().favors[id];if(!f)return; f.step=(f.step||0)+1;markDirty(); },
  complete(id){
    const def=_favorDefs.get(id),f=getSave().favors[id];if(!f)return;
    f.st='done';markDirty();
    _doneThisSession.add(id);
    if(def){
      if(def.doneToast){
        // 082: jump the queue — the turn-in payoff lands NOW, not behind incidental
        // toasts. 087: the giver thanks the mayor BY NAME when they've chosen one.
        const nm=mayorName();
        const sub=nm?(def.doneToast.sub?`${def.doneToast.sub} — thanks, ${nm}`:`thanks a million, ${nm}`):def.doneToast.sub;
        toast(def.doneToast.main,sub,true);
      }
      if(def.reward)wallet.earnDibs(def.reward,def.giver);
    }
  },
  at(id){ const f=getSave().favors[id];return f?{st:f.st||'none',step:f.step||0}:{st:'none',step:0}; },
};

// ----------------------- fetch-dog registry (dumb) ---------------------
// registerFetchDog(adapter) -> {remove()}. The framework does NOTHING with these;
// the tennis-ball pack (079) consumes them to drive a dog to a thrown ball.
// adapter = {
//   name,                     // for debugging
//   pos(out{x,z}),            // write the dog's current position into out
//   available()->bool,        // is this dog free to fetch right now?
//   canReach(x,z)->bool,      // can it reach the ball's landing spot?
//   fetch(x,z, api),          // GO: run to (x,z); drive itself via api:
//     api.grab(),             //   at the ball — take it into the mouth
//     api.at(x,y,z),          //   each carried frame — where the ball rides
//     api.done(x,z),          //   drop it here (back at the thrower)
//     api.abort(),            //   bail (ball unreachable / interrupted)
// }
export const fetchDogs=[];
export function registerFetchDog(adapter){
  fetchDogs.push(adapter);
  return {remove(){const i=fetchDogs.indexOf(adapter);if(i>=0)fetchDogs.splice(i,1);}};
}

// --------------- persistence snapshot (slow throttle) ------------------
// Rebuild the whitelisted counter snapshot every ~3 s; write only when it
// changed (JSON-string compare). Sets are stored as SORTED arrays and
// distanceWalked as a rounded int, so an idle player never churns the save.
function buildSnap(){
  return {
    zones:[...state.zonesVisited].sort(),
    counters:{
      fireworksLaunched:state.fireworksLaunched||0,
      distanceWalked:Math.round(state.distanceWalked||0),
      stonesThrown:state.stonesThrown||0,
      fetches:state.fetches||0,
      malortShots:state.malortShots||0,
      fishStreak:state.fishStreak||0,
      golfRounds:state.golfRounds||0,
      bests:state.bests||{},
      fishLog:state.fishLog||{},
      paidFirsts:state.paidFirsts||{},
      dibsBy:state.dibsBy||{},
      birdsSeen:state.birdsSeen?[...state.birdsSeen].sort():[],
      rocksPainted:state.rocksPainted?[...state.rocksPainted].sort():[],
      seaGlass:state.seaGlass?[...state.seaGlass].sort():[],
      pennies:state.pennies?[...state.pennies].sort():[],
    },
  };
}
let _snapAcc=0,_snapPrev=null,_econOnce=false;
function econUpdate(dt){
  // one-shot, first update frame AFTER worldReady: packs define cosmetics inside
  // onWorldReady (drained during worldReady), so this is the earliest safe point
  // to restore the worn look — and the earliest point AFTER main.js assigns
  // window.__hd wholesale (line ~65), so the __hd.econ hook survives (the same
  // clobber onboard.js documents; initDom runs at import time, too early).
  if(!_econOnce){
    _econOnce=true;
    const w=getSave().worn;
    if(w){ const def=bag.defs.get(w);if(def&&def.onEquip)try{def.onEquip();}catch(e){console.warn('[econ] restore onEquip',e);} }
    refreshToteBadge();   // a returning save shows its tote badge from boot (091)
    try{ window.__hd=window.__hd||{};window.__hd.econ={wallet,bag,favors,shop,save:getSave};
      window.__hd.flags={get:getFlag,set:setFlag}; }catch(e){}   // debug/tools sibling: store flag round-trip
    // 082 save integrity: a stored save that couldn't be read (bad JSON / a
    // version this build can't reach) started us fresh — say so ONCE, gently,
    // never as a scold. A brand-new player never trips this.
    if(wasSaveRecovered())toast('starting fresh','couldn’t read your last save — no worries');
  }
  // slow snapshot
  _snapAcc-=dt;
  if(_snapAcc<=0){
    _snapAcc=3;
    const snap=buildSnap(),s=JSON.stringify(snap);
    if(s!==_snapPrev){ _snapPrev=s;const sv=getSave();sv.counters=snap.counters;sv.zones=snap.zones;markDirty(); }
  }
}

// ---------------------- built-in world-ready setup ---------------------
// Built-in journal section (registered immediately; renders live state).
journalSection('harbor-days','Ope!',()=>`
  <div class="jrow"><span>Fireworks launched</span><b>${state.fireworksLaunched}</b></div>
  <div class="jrow"><span>Distance walked</span><b>${state.distanceWalked.toFixed(0)} m</b></div>
  <div class="jrow"><span>Zones visited</span><b>${state.zonesVisited.size} / ${CH.ZONES.length}</b></div>`);

// dibs (task 079) — registered EAGERLY, right under Ope!, so it holds a fixed
// slot near the top instead of landing wherever the first earn happens to fall
// (packs register their sections during onWorldReady, so a lazily-added section
// sorts differently on a fresh boot than on a returning one). It renders '' —
// and so hides its own header — until the player has ever earned a dib: the same
// law as the HUD chip, a fresh boot shows a game, not an economy.
// state.dibsBy is the ledger every earn writes; the biggest earner falls out of
// it without a single pack having to report anything.
journalSection('dibs','dibs',()=>{
  const sv=getSave();
  if(!(sv.dibs>0||sv.flags['ope.dibs']==='1'))return '';
  const by=state.dibsBy||{},ks=Object.keys(by).filter(k=>by[k]>0).sort((a,b)=>by[b]-by[a]);
  const all=ks.reduce((a,k)=>a+by[k],0);
  return `<div class="jrow"><span>In your pocket</span><b>${sv.dibs}</b></div>`
    +`<div class="jrow"><span>Earned all told</span><b>${all}</b></div>`
    +(ks.length?`<div class="jrow"><span>Biggest earner</span><b>${ks[0]} · ${by[ks[0]]}</b></div>`:'');
});

// Bench sitting — one "sit for a bit" interaction per bench (framework demo).
onWorldReady(()=>{
  for(const b of CH.BENCHES)addInteraction({x:b.x,z:b.z,r:2.2,label:'sit for a bit',onUse:pl=>sitOnBench(b,pl)});
});
// pack-facing sit API: register a sittable spot anywhere (benches use the same
// mechanism internally). s = {x,z,ry, y? (base height, e.g. a deck), r?, label?,
// onSit?} — onSit(player) fires AFTER the sit lands, for packs that hang a beat
// off it (079's sanctuary dib). Added because the alternative was packs patching
// the returned handle's undocumented .onUse, which a future refactor would break.
export function addSitSpot(s){
  return addInteraction({x:s.x,z:s.z,r:s.r||2.2,label:s.label||'sit for a bit',
    onUse:pl=>{sitOnBench(s,pl);if(s.onSit)try{s.onSit(pl);}catch(e){console.warn('[framework] onSit error',e);}}});
}

// wire the DOM once (index.html is fully parsed before any module runs).
initDom();
