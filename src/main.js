import * as THREE from 'three';
import { renderer, scene, camera, amb, clamp, lerp, lerpAngle, hexRGB, pip, rng, rand, $, game, toon } from './core.js';
import { skyGroup, clouds, buildSky } from './sky.js';
import { buildCoast, water, coastQuery, profileTotal, tierAt, beachH, LAND } from './coast.js';
import { buildPaths, pathSamples, pathSamples2 } from './paths.js';
import { buildProps, colliders, walkRects, bobbers, drifter, dogTail, foam, fireflies } from './props.js';
import { buildStructures } from './structures.js';
import { mayor, mparts, buildMayor, updateCharacter, updateChibiShadows } from './character.js';
import { updateFogCull, fogCullStats } from './fogcull.js';
import { FX, DUST, PASTELS, fw, rockets, scheduled, boomLights, setType, updateFireworks } from './fx.js';
import { initAudio, audioDbg, audioCtx, installAudioResumeNet, sStep, sChime, sPop, updateAmbience } from './audio.js';
import { cam, keys, joy, jump, initInput } from './input.js';
import { mmInit, mmDraw, initMinimapToggle } from './minimap.js';
import * as CH from './data/chicago.js';
import { worldReady, runUpdates, state } from './framework.js';
import { beginCellCapture, endCellCapture, mergeCellStatic, getCell, cellWalk, cellSurf, cellClamp, cellKind } from './cells.js';
import './packs/index.js';   // content packs (side-effect); loaded before world build

// ---- dev/debug URL params (harmless in prod build) ----
// ?play=1 skip title · ?x=&z= player spawn · ?yaw=&pitch=&dist= camera
const DBG=new URLSearchParams(location.search);
const dbgNum=k=>DBG.has(k)?parseFloat(DBG.get(k)):null;

// ---- autopilot instrumentation: canary echo, error ring, perf probe ----
// ?quiet=1: suppress transient HUD (hint bar, zone banners) so gate/baseline
// shots are frame-stable — the hint's 9 s fade boundary made spawn shots
// bimodal (~2.1% apart) and un-gateable without this.
const QUIET=DBG.get('quiet')==='1';
if(DBG.get('canary'))console.log('[canary] '+DBG.get('canary'));
const errRing=[];   // last 50 of console.error / window.onerror / unhandledrejection
{
  const push=v=>{errRing.push(String(v).slice(0,300));if(errRing.length>50)errRing.shift()};
  const ce=console.error.bind(console);
  console.error=(...a)=>{push(a.map(x=>(x&&x.stack)||x).join(' '));ce(...a)};
  addEventListener('error',e=>push(e.message||'window.onerror'));
  addEventListener('unhandledrejection',e=>push('unhandledrejection: '+((e.reason&&e.reason.message)||e.reason)));
}
const perfS={fps:0,n:0,mark:0};   // fps sampled over 60-frame windows (advisory; headless may be SwiftShader)
// census(): attribute would-be draw calls at the CURRENT camera by replicating
// the renderer's frustum cull (r128 culls InstancedMesh by geometry sphere too).
// Debug-only — used by tools/ to find draw-call offenders per view.
function census(top=60){
  camera.updateMatrixWorld();
  const fr=new THREE.Frustum(),M=new THREE.Matrix4(),S=new THREE.Sphere();
  fr.setFromProjectionMatrix(M.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  const tally={};let total=0;
  scene.traverseVisible(o=>{
    if(!(o.isMesh||o.isPoints||o.isLine||o.isSprite))return;
    if(o.frustumCulled&&o.geometry){
      if(!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();
      S.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
      if(!fr.intersectsSphere(S))return;
    }
    const mats=Array.isArray(o.material)?o.material:[o.material];
    total+=mats.length;
    const chain=[];let p=o;
    while(p&&p!==scene){if(p.name)chain.unshift(p.name);p=p.parent}
    const col=mats[0]&&mats[0].color?'#'+mats[0].color.getHexString():(mats[0]?mats[0].type:'?');
    const key=(chain.join('/')||'(unnamed)')+' | '+(o.geometry?o.geometry.type:o.type)+' '+col+(o.isInstancedMesh?' [inst '+o.count+']':'');
    tally[key]=(tally[key]||0)+mats.length;
  });
  return {total,rows:Object.entries(tally).sort((a,b)=>b[1]-a[1]).slice(0,top)};
}
window.__hd={errs:errRing,perf:()=>({drawCalls:renderer.info.render.calls,fps:Math.round(perfS.fps*10)/10,buildMs:window.__hd.buildMs}),census,
  audio:audioDbg,         // ?audiodbg probe: {state,resumes} — headless repro reads this
  audioCtx,               // debug/tools only: live AudioContext handle (null pre-start)
  fogcull:fogCullStats,   // {managed,hidden} — fog-distance culling introspection
  // debug-only scene access for tools/ (raycast attribution — census() names merged
  // meshes but can't localize a face; a ray can)
  scene,camera,THREE};

// ---- build the world (order matters: single shared rng, top-to-bottom) ----
// timed (task 007): __hd.buildMs reports where world-build start-up cost goes.
const _tb0=performance.now();
buildSky();
beginCellCapture();   // lakefront world → one cell root (cells.js); sky + mayor stay global
buildCoast();
buildPaths();
buildProps();
// merge the task-023 garden ribbons' samples in AFTER buildProps: the shared-
// rng consumers in buildProps saw the byte-identical legacy array (world
// scatter frozen), while every pack (worldReady) still keeps off the new
// peanut loop + entrance path like any other ribbon.
pathSamples.push(...pathSamples2);
buildStructures();
endCellCapture();
const _tm0=performance.now();
mergeCellStatic(getCell('lakefront').root);   // collapse the lakefront cell's static builder meshes → fewer draw calls
const _tm1=performance.now();
buildMayor();

// ------------------------ walkability + surface ------------------------
const player={x:dbgNum('x')??CH.SPAWN.player.x,z:dbgNum('z')??CH.SPAWN.player.z,y:0,vx:0,vz:0};
// vertical: grounded (lerp to surface) vs airborne (ballistic jump / edge fall)
const JUMP_V=7.2,GRAV=26;
const jphys={air:false,vy:0,coyote:0,squash:0};
const MSCL=mayor.scale.clone();   // base scale for jump squash/stretch

// ---- jetski: jump or wade into the lake and ride it like a Divvy ----
const WATER_Y=-2.3;
const jsk={on:false,grp:null,wadeT:0,bobT:0,lean:0,cd:0,splashT:0};
// ---- skating (task 049): standing on a cell 'ice' surface (cellKind — the
// McCormick rink) swaps the walk for a GLIDE: heading CARVES toward the input
// while speed converges slowly (momentum you can steer, not soap); SPACE does
// a hop-SPIN flourish instead of a plain jump. Pack layer (skates, audio,
// NPC skaters) reads state.onIce / state.iceHops — physics stays here.
const skate={on:false,lean:0,spinT:0,spinD:0.45,spinBase:0,spinDir:1};
{
  const g=new THREE.Group();
  const hull=new THREE.Mesh(new THREE.SphereGeometry(0.55,10,8),toon(0xff8a3d));hull.scale.set(0.62,0.35,1.5);hull.position.y=0.22;g.add(hull);
  const deck=new THREE.Mesh(new THREE.SphereGeometry(0.4,9,7),toon(0xe8e4da));deck.scale.set(0.5,0.3,1.05);deck.position.set(0,0.42,-0.15);g.add(deck);
  const col=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.07,0.5,6),toon(0x2a2d33));col.position.set(0,0.72,0.52);col.rotation.x=0.5;g.add(col);
  const bar=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.56,6),toon(0x2a2d33));bar.rotation.z=Math.PI/2;bar.position.set(0,0.95,0.38);g.add(bar);
  g.visible=false;scene.add(g);jsk.grp=g;
}
// A hard cell (Wrigleyville, Millennium) owns walkability ENTIRELY: not-walkable
// there means BLOCKED, never open water. The jetski/water fallback belongs to the
// lakefront alone — guard the CLASS so a downtown coverage gap can never mount the
// jetski (issue 017), no matter which spot has the hole. cellWalk() is null only
// on the lakefront, where the historic water logic runs unchanged.
function isWater(x,z){return !cellWalk()&&x>20&&!pip(x,z,LAND)&&!onRect(x,z)&&beachH(x,z)===null;}
function splash(k){
  if(game.tNow-jsk.splashT<0.15)return;   // throttle — transitions can cluster
  jsk.splashT=game.tNow;
  for(let i=0;i<Math.floor(10*k)+4;i++){const a=Math.random()*Math.PI*2,r=Math.random()*0.5;
    DUST.spawn(player.x+Math.cos(a)*r,WATER_Y+0.5,player.z+Math.sin(a)*r,
      Math.cos(a)*rand(1,2.5),rand(1.5,3.2),Math.sin(a)*rand(1,2.5),0.75,0.92,1,0.5,1.6,4,2);}
  sPop();
}
// movement gate: on land = walkable; on water = open water; transitions gated
function canMove(nx,nz){
  if(jsk.on)return isWater(nx,nz)||(walkable(nx,nz)&&surfaceY(nx,nz)<=-0.55);  // beach at low shores only
  if(walkable(nx,nz))return true;
  return isWater(nx,nz)&&(jphys.air||jsk.wadeT>0.35)&&(state.speedMult||1)<=1.05; // jump/wade in (not on a Divvy)
}
function onRect(x,z){for(const r of walkRects)if(x>=r.x1&&x<=r.x2&&z>=r.z1&&z<=r.z2)return r;return null}
function walkable(x,z){
  const cw=cellWalk();if(cw)return cw(x,z);   // active cell owns walkability
  if(onRect(x,z))return true;
  const bh=beachH(x,z);if(bh!==null)return z>CH.DOG_BEACH.walkZMin;
  if(pip(x,z,LAND))return true;
  const q=coastQuery(x,z);
  if(q&&q.ae<0.9&&q.lat>-0.6){
    const t=tierAt(q.lat,q.z);
    if(t&&q.lat<profileTotal(q.z)-0.3)return true;
  }
  return false;
}
function surfaceY(x,z){
  const cs=cellSurf();if(cs)return cs(x,z);   // active cell owns surface height
  const r=onRect(x,z);if(r)return r.h;
  const bh=beachH(x,z);if(bh!==null)return bh;
  const q=coastQuery(x,z);
  if(q&&q.ae<1.2&&q.lat>0.15){const t=tierAt(q.lat,q.z);if(t)return t.h}
  return 0;
}

// ------------------------------ zones ----------------------------------
const ZONES=CH.ZONES;
const zoneCool={};let zoneT=0,bannerTO=null;
function showBanner(n){
  if(QUIET)return;
  $('bname').textContent=n;
  $('banner').classList.add('show');
  clearTimeout(bannerTO);
  bannerTO=setTimeout(()=>$('banner').classList.remove('show'),2600);
}

// ------------------------------ minimap init ---------------------------
mmInit();
initInput();
installAudioResumeNet();   // mobile audio safety net: resume() on any gesture / refocus (issue 007)
initMinimapToggle();

// ---- framework: run queued pack setup now the world exists ----
const _tp0=performance.now();
worldReady(player);
window.__hd.buildMs={build:Math.round(_tm0-_tb0),merge:Math.round(_tm1-_tm0),packs:Math.round(performance.now()-_tp0)};
console.log('[perf] world build '+window.__hd.buildMs.build+'ms · mergeCellStatic '+window.__hd.buildMs.merge+'ms · packs '+window.__hd.buildMs.packs+'ms');

// ------------------------------ main loop ------------------------------
const camPos=new THREE.Vector3(CH.SPAWN.camera.x,CH.SPAWN.camera.y,CH.SPAWN.camera.z);
const camTarget=new THREE.Vector3();
export const camCtl={snap:false};   // packs set snap=true after a teleport (cells.js rides)
let assistAmt=0,introT=0;   // introT 1→0: start-of-game camera swoop (skipped in ?play=1)
let stepT=0,sparkT=0;
let last=performance.now();

function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(0.05,(now-last)/1000||0.016);last=now;game.tNow+=dt;
  const t=game.tNow;

  // ---- input → camera-relative movement ----
  const Fx=Math.sin(cam.yaw),Fz=Math.cos(cam.yaw);
  const Rx=-Math.cos(cam.yaw),Rz=Math.sin(cam.yaw);
  let inF=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0);
  let inR=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
  inF-=joy.z;inR+=joy.x;
  let mvx=Fx*inF+Rx*inR,mvz=Fz*inF+Rz*inR;
  let mag=Math.hypot(mvx,mvz);
  if(mag>1){mvx/=mag;mvz/=mag;mag=1}
  const runF=keys.has('shift')||joy.len>0.92;
  const kAt=cellKind();
  skate.on=!!(kAt&&kAt(player.x,player.z)==='ice');
  state.onIce=skate.on;
  const spd=(jsk.on?(runF?12:8):(runF?9.5:4.2)*(state.speedMult||1))*(game.running?1:0);
  let leanT=0;
  if(skate.on){
    const cur=Math.hypot(player.vx,player.vz);
    const tgt=mag*(runF?10.5:7.2)*(game.running?1:0);
    if(mag>0.15&&tgt>0.01){
      const inHd=Math.atan2(mvx,mvz);
      // carve: heading turns toward the stick much faster than speed changes
      const hd=cur>0.5?lerpAngle(Math.atan2(player.vx,player.vz),inHd,1-Math.exp(-2.6*dt)):inHd;
      const ns=lerp(cur,tgt,1-Math.exp(-(tgt>cur?1.7:0.6)*dt));
      player.vx=Math.sin(hd)*ns;player.vz=Math.cos(hd)*ns;
      let dh=inHd-hd;dh=((dh+Math.PI*3)%(Math.PI*2))-Math.PI;
      leanT=clamp(-dh*Math.min(cur/7,1)*0.7,-0.42,0.42);   // bank into the carve
    }else{
      const k=Math.exp(-0.4*dt);player.vx*=k;player.vz*=k;  // long glide-out, no input
    }
  }else{
    player.vx=lerp(player.vx,mvx*spd,1-Math.exp(-10*dt));
    player.vz=lerp(player.vz,mvz*spd,1-Math.exp(-10*dt));
  }
  skate.lean=lerp(skate.lean,leanT,1-Math.exp(-6*dt));

  // ---- slide collision against the world (water-aware) ----
  const wtx=player.x+mvx*0.7,wtz=player.z+mvz*0.7;   // probe by INPUT dir (velocity dies when blocked)
  if(!jsk.on&&mag>0.3&&!walkable(wtx,wtz)&&isWater(wtx,wtz))jsk.wadeT+=dt;else jsk.wadeT=Math.max(0,jsk.wadeT-dt*2);
  const nx=player.x+player.vx*dt;
  if(canMove(nx,player.z))player.x=nx;else player.vx=0;
  const nz=player.z+player.vz*dt;
  if(canMove(player.x,nz))player.z=nz;else player.vz=0;
  for(const c of colliders){
    if(player.y>c.h)continue;   // airborne over a low obstacle (fences are jumpable)
    const dx=player.x-c.x,dz=player.z-c.z,R=c.r+0.34,d2=dx*dx+dz*dz;
    if(d2<R*R&&d2>1e-6){const d=Math.sqrt(d2);player.x=c.x+dx/d*R;player.z=c.z+dz/d*R}
  }
  const CLW=cellClamp()||CH.WORLD_CLAMP;
  player.x=clamp(player.x,CLW.xMin,CLW.xMax);player.z=clamp(player.z,CLW.zMin,CLW.zMax);
  // ---- vertical: jump / fall / grounded / afloat ----
  const surf=surfaceY(player.x,player.z);
  jump.buf=Math.max(0,jump.buf-dt);
  const overWater=!walkable(player.x,player.z)&&isWater(player.x,player.z);
  jsk.cd=Math.max(0,jsk.cd-dt);
  if(!jsk.on&&overWater&&game.running&&jsk.cd<=0){   // crossed into open water — jetski!
    jsk.on=true;jsk.grp.visible=true;jsk.wadeT=0;state.onWater=true;jsk.cd=0.6;
    if(player.y<=WATER_Y+0.7){jphys.air=false;jphys.vy=0;player.y=WATER_Y+0.42;}
    splash(1);
  }
  if(jsk.on){
    jsk.bobT+=dt;
    if(walkable(player.x,player.z)&&jsk.cd<=0){      // reached a low shore — hop out
      jsk.on=false;jsk.grp.visible=false;state.onWater=false;jsk.cd=0.6;
      jphys.air=true;jphys.vy=2.2;splash(0.4);
    }else if(jphys.air){                      // mid-hop over water
      jphys.vy-=GRAV*dt;player.y+=jphys.vy*dt;
      if(player.y<=WATER_Y+0.42&&jphys.vy<=0){jphys.air=false;jphys.vy=0;player.y=WATER_Y+0.42;splash(0.5);}
    }else{
      player.y=lerp(player.y,WATER_Y+0.42+Math.sin(jsk.bobT*2.2)*0.05,1-Math.exp(-9*dt));
      if(jump.buf>0){jump.buf=0;jphys.air=true;jphys.vy=5;jphys.squash=-0.4;}
    }
    jsk.lean=lerp(jsk.lean,clamp(-inR*0.28,-0.3,0.3),1-Math.exp(-6*dt));
    jsk.grp.position.set(player.x,player.y-0.36,player.z);
    jsk.grp.rotation.set(0,mayor.rotation.y,jsk.lean);
    const wsp=Math.hypot(player.vx,player.vz);   // sp isn't declared yet up here
    if(wsp>2.5&&sparkT<=0){                      // wake spray
      DUST.spawn(player.x-Math.sin(mayor.rotation.y)*0.95,WATER_Y+0.45,player.z-Math.cos(mayor.rotation.y)*0.95,
        rand(-0.8,0.8),rand(1.2,2.4),rand(-0.8,0.8),0.8,0.95,1,0.4,1.5,3.5,2);
      sparkT=0.045;
    }
  }
  else if(jphys.air){
    jphys.coyote=Math.max(0,jphys.coyote-dt);
    jphys.vy-=GRAV*dt;player.y+=jphys.vy*dt;
    if(player.y<=surf&&jphys.vy<=0){                       // touch down
      const impact=-jphys.vy;
      player.y=surf;jphys.air=false;jphys.vy=0;
      jphys.squash=clamp(impact/9,0.25,1);
      if(impact>3){
        const q0=coastQuery(player.x,player.z);
        sStep(onRect(player.x,player.z)?'wood':(q0&&q0.lat>0.2&&q0.ae<1?'stone':'grass'));
        for(let k=0;k<8;k++){const a=k/8*Math.PI*2;
          DUST.spawn(player.x+Math.cos(a)*0.3,surf+0.08,player.z+Math.sin(a)*0.3,
            Math.cos(a)*rand(1.2,2),rand(0.4,0.9),Math.sin(a)*rand(1.2,2),1,0.95,0.82,0.35,1.4,3,3);}
      }
    }
  }else{
    jphys.coyote=0.1;
    if(player.y-surf>0.5){jphys.air=true;jphys.vy=0}       // stepped off an edge
    else player.y=lerp(player.y,surf,1-Math.exp(-12*dt));
  }
  if(!jsk.on&&jump.buf>0&&jphys.coyote>0&&game.running&&(!jphys.air||jphys.vy<=0)){
    jump.buf=0;jphys.coyote=0;jphys.air=true;
    if(skate.on){   // hop-SPIN flourish: lower hop, full 360 over the airtime
      jphys.vy=5.8;jphys.squash=-0.7;
      skate.spinD=2*5.8/GRAV;skate.spinT=skate.spinD;
      skate.spinBase=mayor.rotation.y;
      skate.spinDir=skate.lean>0.02?1:skate.lean<-0.02?-1:1;
      state.iceHops=(state.iceHops||0)+1;
    }else{jphys.vy=JUMP_V;jphys.squash=-0.55;}
  }
  jphys.squash*=Math.exp(-9*dt);
  mayor.position.set(player.x,player.y,player.z);
  mayor.scale.set(MSCL.x*(1+0.1*jphys.squash),MSCL.y*(1-0.18*jphys.squash),MSCL.z*(1+0.1*jphys.squash));

  const sp=Math.hypot(player.vx,player.vz);
  if(sp>0.4)mayor.rotation.y=lerpAngle(mayor.rotation.y,Math.atan2(player.vx,player.vz),1-Math.exp(-10*dt));
  if(skate.spinT>0){   // hop-spin owns the facing until the twirl completes
    skate.spinT=Math.max(0,skate.spinT-dt);
    mayor.rotation.y=skate.spinBase+skate.spinDir*(1-skate.spinT/skate.spinD)*Math.PI*2;
  }
  mayor.rotation.z=skate.lean;   // carve bank (0 off-ice — leanT decays)

  // ---- walk animation (limb swing damped mid-air / afloat / gliding) ----
  updateCharacter(jsk.on?sp*0.15:skate.on?sp*0.22:(jphys.air?sp*0.25:sp),dt,t);

  // footsteps + run sparkles
  stepT-=dt;
  if(!jsk.on&&!skate.on&&sp>1&&stepT<=0){
    const q0=coastQuery(player.x,player.z);
    const surf=onRect(player.x,player.z)?'wood':(q0&&q0.lat>0.2&&q0.ae<1?'stone':'grass');
    sStep(surf);stepT=runF?0.26:0.42;
    DUST.spawn(player.x+rand(-0.12,0.12),player.y+0.05,player.z+rand(-0.12,0.12),   // footfall puff
      rand(-0.3,0.3),rand(0.5,1),rand(-0.3,0.3),0.98,0.93,0.8,0.28,0.95,2.2,2.5);
  }
  sparkT-=dt;
  if(!jsk.on&&!skate.on&&runF&&sp>5&&sparkT<=0){
    const c=hexRGB(PASTELS[rng()*PASTELS.length|0]);
    DUST.spawn(player.x+rand(-0.25,0.25),player.y+0.15,player.z+rand(-0.25,0.25),
      rand(-0.4,0.4),rand(0.6,1.4),rand(-0.4,0.4),c[0],c[1],c[2],0.5,0.55,-1,2);
    sparkT=0.05;
  }

  // ---- camera ---- (orbit moved to Z/C so E is free for framework interact)
  if(keys.has('z')){cam.yaw+=1.9*dt;cam.freeT=0.8}
  if(keys.has('c')){cam.yaw-=1.9*dt;cam.freeT=0.8}
  cam.freeT=Math.max(0,cam.freeT-dt);
  if(mag>0.25&&cam.freeT<=0&&sp>0.6){
    const hdg=Math.atan2(player.vx,player.vz);
    const dy=Math.abs((((hdg-cam.yaw)%(Math.PI*2))+Math.PI*3)%(Math.PI*2)-Math.PI);
    const rate=dy<1.75?2.2:0.9;
    cam.yaw=lerpAngle(cam.yaw,hdg,1-Math.exp(-rate*dt));
  }
  let showTgt=(rockets.length>0||boomLights.length>0||scheduled.length>0)?1:0;
  if(showTgt){if(mag>0.2)showTgt*=0.6;if(cam.freeT>0)showTgt*=0.5}
  assistAmt=lerp(assistAmt,showTgt,1-Math.exp(-3*dt));
  let effP=lerp(cam.pitch,-0.3,assistAmt),effD=cam.dist+assistAmt*1.6;
  if(!game.running){effP=0.30;effD=17}   // title-screen establishing shot behind the
  // translucent card (task 035) — ?play=1 runs runStart before the first frame,
  // so tooling/baseline framings never see this
  if(introT>0){                                   // opening swoop: high over the lake, easing in
    introT=Math.max(0,introT-dt/3.2);
    const k=introT*introT*(3-2*introT);
    effP=lerp(effP,0.55,k);effD=lerp(effD,26,k);cam.yaw+=dt*0.22*k;
  }
  const pvx=player.x,pvy=player.y+1.6,pvz=player.z;
  const upT=Math.max(0,-effP),downP=Math.max(0,effP);
  const horiz=Math.cos(downP)*effD;
  camTarget.set(
    pvx-Math.sin(cam.yaw)*horiz,
    Math.max(player.y+0.55,Math.max(-1.5,pvy+Math.sin(downP)*effD+upT*1.2)),
    pvz-Math.cos(cam.yaw)*horiz);
  if(camCtl.snap){camPos.copy(camTarget);camCtl.snap=false;}
  camPos.lerp(camTarget,1-Math.exp(-8*dt));
  const shx=(Math.random()-0.5)*fw.shake*0.5,shy=(Math.random()-0.5)*fw.shake*0.5,shz=(Math.random()-0.5)*fw.shake*0.5;
  camera.position.set(camPos.x+shx,camPos.y+shy,camPos.z+shz);
  camera.lookAt(pvx,pvy+0.1+Math.tan(upT)*horiz*1.35,pvz);
  const fovT=50+(runF&&sp>6?4:0)+(jphys.air?1.2:0);   // gentle speed/air FOV kick
  if(Math.abs(camera.fov-fovT)>0.02){camera.fov=lerp(camera.fov,fovT,1-Math.exp(-5*dt));camera.updateProjectionMatrix()}
  skyGroup.position.set(camera.position.x,0,camera.position.z);
  fw.shake=Math.max(0,fw.shake-dt*1.6);
  fw.ambPulse*=Math.exp(-3*dt);amb.intensity=0.9+fw.ambPulse;

  // ---- world life ----
  if(water.material.userData.sh)water.material.userData.sh.uniforms.uTime.value=t;
  for(const b of bobbers){
    b.position.y=b.userData.by+Math.sin(t*1.1+b.userData.ph)*0.09;
    b.rotation.z=Math.sin(t*0.9+b.userData.ph)*0.05;
  }
  drifter.position.z-=dt*1.1;if(drifter.position.z<-110)drifter.position.z=70;
  for(const c of clouds){c.position.x+=dt*0.7;if(c.position.x>210)c.position.x=-210}
  skyGroup.userData.stars.material.opacity=0.72+0.16*Math.sin(t*1.3);
  if(dogTail)dogTail.rotation.z=Math.sin(t*7)*0.5;
  {
    const pa=fireflies.pts.geometry.attributes.position,ca=fireflies.pts.geometry.attributes.aColor;
    for(let i=0;i<fireflies.n;i++){
      const[bx,by,bz]=fireflies.base[i],ph=fireflies.ph[i];
      pa.setXYZ(i,bx+Math.sin(t*0.5+ph)*0.8,by+Math.sin(t*0.8+ph*1.3)*0.5,bz+Math.cos(t*0.4+ph)*0.8);
      const bl=0.3+0.7*(0.5+0.5*Math.sin(t*2.1+ph*2));
      ca.setXYZ(i,1*bl,0.85*bl,0.45*bl);
    }
    pa.needsUpdate=true;ca.needsUpdate=true;
  }
  {
    const sa=foam.pts.geometry.attributes.aSize;
    for(let i=0;i<foam.ph.length;i++)sa.setX(i,1.1*(0.55+0.45*Math.sin(t*2.3+foam.ph[i])));
    sa.needsUpdate=true;
  }

  // ---- fireworks ----
  updateFireworks(dt);

  // ---- ambience ----
  updateAmbience(dt,t,player);

  // ---- zones ----
  zoneT-=dt;
  if(zoneT<=0&&game.running){
    zoneT=0.5;
    for(const zn of ZONES){
      const dx=player.x-zn.x,dz=player.z-zn.z;
      if(dx*dx+dz*dz<zn.r*zn.r){
        if(!(zoneCool[zn.n]>game.tNow)){zoneCool[zn.n]=game.tNow+90;showBanner(zn.n);sChime()}
        break;
      }
    }
  }

  // ---- framework per-frame (interactions, NPCs, tracking, pack updates) ----
  runUpdates(dt,t,player);
  updateChibiShadows();   // after runUpdates: rigs have moved; one InstancedMesh re-stamp
  updateFogCull(dt);      // hide fully-fogged meshes (pixel-neutral draw-call cut)

  if(DBG.get('dbg')==='1'&&performance.now()>dbgHud.holdT){const h=$('hint');h.style.display='block';h.classList.remove('hide');
    const s=`x=${player.x.toFixed(1)} z=${player.z.toFixed(1)} y=${player.y.toFixed(2)} mag=${mag.toFixed(2)} mvx=${mvx.toFixed(2)} wadeT=${jsk.wadeT.toFixed(2)} on=${jsk.on?1:0} walk=${walkable(player.x,player.z)?1:0} iw07=${isWater(player.x+mvx*0.7,player.z+mvz*0.7)?1:0} walk07=${walkable(player.x+mvx*0.7,player.z+mvz*0.7)?1:0}`;
    if(s!==dbgHud.last){h.textContent=s;dbgHud.last=s;}}  // skip identical writes — a text selection survives while standing still

  mmDraw(dt,player);
  renderer.render(scene,camera);
  perfS.n++;if(perfS.n>=60){if(perfS.mark)perfS.fps=perfS.n*1000/(now-perfS.mark);perfS.mark=now;perfS.n=0}
}

// ------------------------------ start ----------------------------------
function runStart(){
  game.running=true;
  if(DBG.get('play')!=='1'){introT=1;camPos.set(player.x+20,22,player.z+16)}   // swoop in from over the lake
  else camCtl.snap=true;   // debug/shot starts must not depend on startup duration (settle lerp vs fixed waitMs)
  $('title').classList.add('hide');
  $('pill').style.display='flex';setType(0);
  $('mini').style.display='block';
  if(!QUIET){
    const h=$('hint');h.style.display='block';
    h.textContent=document.body.classList.contains('touch')
      ?'left stick walk · drag to look · ⬆️ jump · ✋ interact · 📖 journal · ✨ type · 🎆 launch'
      :'WASD move · SPACE jump · Z/C orbit · SHIFT run · E interact · J journal · 1–4 firework · F launch';
    setTimeout(()=>h.classList.add('hide'),9000);
  }
  $('btnHelp').style.display='flex';   // the hint auto-hides; the "?" button is the permanent way back
  $('btnKofi').style.display='flex';   // ♥ Ko-fi support button, beside "?"
}

// ---- "?" controls card: always-discoverable version of the hint bar ----
{
  const card=$('ctl'),body=$('ctlBody'),btn=$('btnHelp');
  const row=(k,v)=>`<div class="ctlrow"><b>${k}</b><span>${v}</span></div>`;
  function fill(){
    body.innerHTML=(document.body.classList.contains('touch')
      ? row('left stick','walk')+row('drag','look around')+row('⬆️','jump')+row('✋','interact')
        +row('📖','journal')+row('✨','pick firework')+row('🎆','launch firework')
        +row('🔔','Divvy bell / radio (riding)')
      : row('W A S D','walk')+row('SHIFT','run')+row('SPACE','jump')+row('E','interact')
        +row('J','journal')+row('1–4','pick firework')+row('F','launch firework')
        +row('R','Divvy bell / radio station')+row('Z / C · wheel','orbit · zoom'))
      +'<div class="ctlnote">🌊 <b>jetski</b> — wade in past your knees and jump on; ride up to any low step to hop off.'
      +'<br>🚲 <b>Divvy</b> — interact at a dock to borrow a bike; drop it back at any dock.'
      +'<br>⛸ <b>skating</b> — step onto the McCormick rink downtown; '
      +(document.body.classList.contains('touch')?'⬆️':'SPACE')+' hop-spins.</div>';
  }
  const close=()=>card.classList.remove('show');
  btn.addEventListener('click',()=>{if(card.classList.contains('show'))close();else{fill();card.classList.add('show')}});
  $('ctlClose').addEventListener('click',close);
  card.addEventListener('click',e=>{if(e.target===card)close()});
  addEventListener('keydown',e=>{
    if(e.key==='Escape')close();
    else if(e.key==='?'){if(card.classList.contains('show'))close();else{fill();card.classList.add('show')}}
  });
}
$('start').addEventListener('click',()=>{initAudio();runStart();
  // GoatCounter "pressed let's walk" event — AFTER the gesture-critical
  // initAudio; never throws. The ?play=1 tooling path below deliberately
  // does not count (keeps headless shots out of the metric).
  try{if(window.goatcounter&&window.goatcounter.count)goatcounter.count({path:'lets-walk',title:"pressed let's walk",event:true});}catch(e){}
});
addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

// ---- apply debug params ----
cam.yaw=CH.SPAWN.yaw??0;   // spawn facing comes from the data (task 023: east, facing the water); ?yaw= still overrides below
if(dbgNum('yaw')!==null)cam.yaw=dbgNum('yaw');
if(dbgNum('pitch')!==null)cam.pitch=dbgNum('pitch');
if(dbgNum('dist')!==null)cam.dist=dbgNum('dist');
if(DBG.get('play')==='1'){try{initAudio()}catch(e){}runStart();}

// ---- ?audiodbg=1 — live AudioContext-state HUD (owner reads it on the phone) ----
// off the hot frame loop (a 250 ms timer): none/suspended/running + resume count.
if(DBG.get('audiodbg')==='1'){
  const el=$('audiodbg');el.style.display='block';
  const paint=()=>{const a=audioDbg();el.textContent='audio: '+a.state+' · resumes '+a.resumes;};
  paint();setInterval(paint,250);
}

// ---- ?dbg=1 — coordinate HUD is click-to-copy (owner sends coords as feedback):
// click puts "x=.. z=.." on the clipboard and flashes 'copied'; the text is also
// selectable (#hint.dbg) since the frame loop skips identical writes. Clipboard
// needs a secure context (https/localhost) — on failure we select the text instead.
const dbgHud={last:'',holdT:0};
if(DBG.get('dbg')==='1'){
  const h=$('hint');h.classList.add('dbg');
  h.addEventListener('click',()=>{
    const s=`x=${player.x.toFixed(1)} z=${player.z.toFixed(1)}`;
    const flash=()=>{h.textContent='copied  '+s;dbgHud.last='';dbgHud.holdT=performance.now()+900;};
    const select=()=>{const sel=getSelection(),r=document.createRange();sel.removeAllRanges();r.selectNodeContents(h);sel.addRange(r);};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(s).then(flash,select);
    else select();
  });
}

requestAnimationFrame(frame);
