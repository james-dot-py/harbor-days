// =====================================================================
//  PACK: activities1 — Park Life on the Belmont Rocks + dog beach
//  Three cozy toys, all synthesized, all set up inside onWorldReady:
//    1. SKIP STONES   — pick a flat pebble off a pile, charge & sidearm it
//                       across the lake; shallow hits skip (rising-pitch
//                       plinks + splash rings), steep/slow ones ploonk.
//    2. FETCH         — throw the beach ball; the good dog bounds after it,
//                       trots it back to your feet, never leaves the sand.
//    3. PAINT A ROCK  — cycle painted decals on flat-topped limestone,
//                       Belmont Rocks memorial tradition since the '70s.
//    4. DOG PARK      — two neighbours run continuous, offset-phase fetch
//                       loops on the cove sand; ~40% of throws go into the
//                       shallows so the dog SWIMS (low body, paddle, ripple
//                       rings). Dogs are instanced parts; both give the
//                       piping-plover pen a wide berth.
//  Only-my-file rules honoured: no shared source edits. The dog Group is
//  reached via dogTail.parent (dogTail is exported); the beach ball via a
//  one-time scene lookup (fallback builds its own). Gameplay jitter uses
//  Math.random so the shared world rng is never perturbed (concurrency-safe).
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, registerUpdate, addInteraction, chargeThrow, camForward,
         holdItem, toast, journalSection, state, getAudioCtx, makeNPC } from '../framework.js';
import { scene, toon, curveMat, clamp, lerp, lerpAngle, pip, WATER_Y } from '../core.js';
import { coastQuery, profileTotal, tierAt, beachH, LAND } from '../coast.js';
import { FX } from '../fx.js';
import { dogTail, collide, colliders } from '../props.js';
import * as CH from '../data/chicago.js';

// ---------------------------- session state ----------------------------
state.bests = state.bests || {};
if(state.bests.skips==null) state.bests.skips=0;
state.stonesThrown = state.stonesThrown||0;
state.fetches      = state.fetches||0;
state.rocksPainted = state.rocksPainted || new Set();   // unique rock ids

journalSection('activities','Park Life',()=>`
  <div class="jrow"><span>Stones thrown</span><b>${state.stonesThrown}</b></div>
  <div class="jrow"><span>Best skips</span><b>${state.bests.skips}</b></div>
  <div class="jrow"><span>Rocks painted</span><b>${state.rocksPainted.size} / 4</b></div>
  <div class="jrow"><span>Fetches</span><b>${state.fetches}</b></div>`);

// ------------------------------ geometry helpers -----------------------
const RX = CH.COAST_MAIN_PARAMS.fx;                 // coast-top x at a given z
const _wp = new THREE.Vector3();                    // cached scratch (release only)
// dog-park instanced-part scratch (zero per-frame alloc)
const _dMat=new THREE.Matrix4(),_pMat=new THREE.Matrix4(),
      _dPos=new THREE.Vector3(),_dQuat=new THREE.Quaternion(),_dScl=new THREE.Vector3(),
      _pPos=new THREE.Vector3(),_pQuat=new THREE.Quaternion(),_pScl=new THREE.Vector3(),
      _dEul=new THREE.Euler(),_pEul=new THREE.Euler();

// spot on the revetment: coast top + eastward offset -> {x,z,y(tier)}
function rockSpot(z,off){
  const x = RX(z)+off;
  const q = coastQuery(x,z); let y=0;
  if(q){const t=tierAt(q.lat,q.z);if(t)y=t.h;}
  return {x,z,y};
}
function terraceYAt(x,z){
  const q=coastQuery(x,z);
  if(q&&q.lat>0.15){const t=tierAt(q.lat,q.z);if(t)return t.h;}
  return 0;
}
// east of the sheet-pile line at this z = out over open water
function overWater(x,z){
  const q=coastQuery(x,z);
  return q ? q.lat > profileTotal(q.z)-0.15 : false;
}
// ground under a point near the beach: sand / grass / basin water
function groundAt(x,z){
  const bh=beachH(x,z);
  if(bh!==null) return {y:bh,water:false};          // sloped sand
  if(pip(x,z,LAND)) return {y:0,water:false};        // grass
  return {y:WATER_Y,water:true};                     // basin water
}

// --------------------------------- audio -------------------------------
function sSkip(n){                                    // rising plink per skip
  const {actx,sfxBus,mf}=getAudioCtx(); if(!actx)return;
  const t=actx.currentTime, m=64+Math.min(n,10)*1.5;
  const o=actx.createOscillator(),g=actx.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(mf(m+7),t);
  o.frequency.exponentialRampToValueAtTime(mf(m),t+0.09);
  g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.14,t+0.008);
  g.gain.exponentialRampToValueAtTime(0.0001,t+0.17);
  o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+0.2);
}
function sPloonk(){                                   // final sink: low thunk + water
  const {actx,sfxBus,noiseBuf}=getAudioCtx(); if(!actx)return;
  const t=actx.currentTime;
  const o=actx.createOscillator(),g=actx.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(58,t+0.3);
  g.gain.setValueAtTime(0.26,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.45);
  o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+0.5);
  if(noiseBuf){const s=actx.createBufferSource();s.buffer=noiseBuf;
    const f=actx.createBiquadFilter();f.type='lowpass';f.frequency.value=560;
    const ng=actx.createGain();ng.gain.setValueAtTime(0.18,t);ng.gain.exponentialRampToValueAtTime(0.0001,t+0.28);
    s.connect(f);f.connect(ng);ng.connect(sfxBus);s.start(t);s.stop(t+0.3);}
}
function sPaint(){                                    // wet-paint blip
  const {actx,sfxBus,noiseBuf}=getAudioCtx(); if(!actx)return;
  const t=actx.currentTime;
  const o=actx.createOscillator(),g=actx.createGain();
  o.type='triangle';
  o.frequency.setValueAtTime(520,t);o.frequency.exponentialRampToValueAtTime(900,t+0.08);
  g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.1,t+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001,t+0.16);
  o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+0.2);
  if(noiseBuf){const s=actx.createBufferSource();s.buffer=noiseBuf;
    const f=actx.createBiquadFilter();f.type='bandpass';f.frequency.value=1500;f.Q.value=1.1;
    const ng=actx.createGain();ng.gain.setValueAtTime(0.05,t);ng.gain.exponentialRampToValueAtTime(0.0001,t+0.11);
    s.connect(f);f.connect(ng);ng.connect(sfxBus);s.start(t);s.stop(t+0.14);}
}
function sWhine(){                                    // dog can't reach the ball
  const {actx,sfxBus,mf}=getAudioCtx(); if(!actx)return;
  const t=actx.currentTime;
  [0,0.18].forEach((off,k)=>{
    const o=actx.createOscillator(),g=actx.createGain();
    o.type='sine';
    o.frequency.setValueAtTime(mf(k?75:70),t+off);
    o.frequency.linearRampToValueAtTime(mf(k?71:66),t+off+0.22);
    g.gain.setValueAtTime(0.0001,t+off);g.gain.linearRampToValueAtTime(0.06,t+off+0.03);
    g.gain.exponentialRampToValueAtTime(0.0001,t+off+0.26);
    o.connect(g);g.connect(sfxBus);o.start(t+off);o.stop(t+off+0.3);
  });
}

// --------------------------------- splash ------------------------------
// white-blue droplet sparks (arc up + fall), a vertical plume, and an
// expanding surface ring — reads even from the shallow rocks-eye angle.
function splash(x,z,big){
  const n=big?16:11;
  for(let k=0;k<n;k++){
    const a=Math.random()*Math.PI*2, sp=(big?2.6:1.7)*(0.5+Math.random());
    FX.spawn(x,WATER_Y+0.05,z, Math.cos(a)*sp,(big?4.4:3.2)*(0.55+0.5*Math.random()),Math.sin(a)*sp,
      0.72,0.9,1.0, big?0.6:0.45, big?3.6:2.8, 9, 0.4);
  }
  for(let k=0;k<(big?4:2);k++)                            // vertical plume
    FX.spawn(x+(Math.random()-0.5)*0.2,WATER_Y+0.05,z+(Math.random()-0.5)*0.2,
      (Math.random()-0.5)*0.6,(big?5.5:4)*(0.7+0.4*Math.random()),(Math.random()-0.5)*0.6,
      0.8,0.94,1.0, big?0.5:0.4, big?4.0:3.0, 9, 0.3);
  const rn=big?26:18, rs=big?5.5:3.8;                     // expanding ring
  for(let k=0;k<rn;k++){
    const a=k/rn*Math.PI*2;
    FX.spawn(x,WATER_Y+0.06,z, Math.cos(a)*rs,0.12,Math.sin(a)*rs,
      0.6,0.86,1.0, big?0.62:0.48, big?3.0:2.3, 0, 3.0);
  }
}

// ==================================================================== //
onWorldReady(player=>{

  // ------------------------ 1. SKIP STONES ---------------------------- //
  const pebGeo=new THREE.SphereGeometry(0.17,8,6), pebMat=toon(0x6b6f76);
  const stones=[];                                   // live thrown pebbles

  function buildPile(spot){
    for(let k=0;k<6;k++){
      const a=Math.random()*Math.PI*2, r=Math.random()*0.4;
      const st=new THREE.Mesh(pebGeo,pebMat);
      st.position.set(spot.x+Math.cos(a)*r, spot.y+0.06+Math.random()*0.04, spot.z+Math.sin(a)*r);
      st.scale.set(1.1+Math.random()*0.5, 0.34, 1.3+Math.random()*0.5);
      st.rotation.set((Math.random()-0.5)*0.22, Math.random()*Math.PI, 0);
      scene.add(st);
    }
  }
  function finishStone(s,i,onLand){
    scene.remove(s.mesh); stones.splice(i,1);
    const n=s.skips; if(n>state.bests.skips)state.bests.skips=n;
    const sub = n>=7?'LEGENDARY':n>=4?'nice arm':n>=2?'not bad':'plonk.';
    toast(n>0?`${n} skip${n>1?'s':''}!`:(onLand?'plop.':'plonk!'), sub);
  }
  function updateStones(dt){
    for(let i=stones.length-1;i>=0;i--){
      const s=stones[i];
      s.t+=dt; s.vy-=9*dt;
      s.x+=s.vx*dt; s.y+=s.vy*dt; s.z+=s.vz*dt;
      s.mesh.position.set(s.x,s.y,s.z);
      s.mesh.rotation.y+=18*dt; s.mesh.rotation.x+=7*dt;   // visible spin
      if(s.vy<0){
        if(overWater(s.x,s.z)){
          if(s.y<=WATER_Y+0.04){
            const hs=Math.hypot(s.vx,s.vz);
            // first contact off the terrace is unavoidably steeper — grant it
            // more leniency; later skims must stay flat. Hop is capped so skips
            // stay tight + visible instead of arcing 20m out to the horizon.
            const factor=s.first?0.65:0.5;
            if(hs>=3.5 && Math.abs(s.vy)<factor*hs){       // shallow -> SKIP
              s.first=false; s.y=WATER_Y+0.04;
              s.vy=Math.min(1.7,hs*0.12); s.vx*=0.75; s.vz*=0.75;
              s.skips++; splash(s.x,s.z,false); sSkip(s.skips);
            }else{                                         // steep/slow -> PLOONK
              splash(s.x,s.z,true); sPloonk(); finishStone(s,i,false); continue;
            }
          }
        }else if(s.y<=terraceYAt(s.x,s.z)+0.06){           // clipped the rocks
          finishStone(s,i,true); continue;
        }
      }
      if(s.t>7||s.x>246||s.x<120||s.z>300||s.z<0){ finishStone(s,i,false); continue; }
    }
  }

  const PILES=[{z:130,off:7.0},{z:140,off:6.5},{z:150,off:7.5}];   // Belmont Rocks waterline ~(158,140), skip EAST
  for(const pd of PILES){
    const spot=rockSpot(pd.z,pd.off);
    buildPile(spot);
    const inter=addInteraction({x:spot.x,z:spot.z,r:2.4,label:'skip stones',onUse:()=>{
      const peb=new THREE.Mesh(pebGeo,pebMat);
      peb.scale.set(1,0.4,1.3);
      holdItem(peb); peb.position.set(0,0,0);
      inter.setLabel('skip again (hold E)');
      chargeThrow({onRelease:power=>{
        peb.getWorldPosition(_wp);
        holdItem(null); scene.add(peb);
        const f=camForward(), speed=10+14*power;         // 10..24 m/s sidearm
        peb.position.set(_wp.x+f.x*0.4, _wp.y+0.1, _wp.z+f.z*0.4);
        peb.scale.set(1.4,0.5,1.8);
        stones.push({mesh:peb, x:peb.position.x,y:peb.position.y,z:peb.position.z,
          vx:f.x*speed, vy:0.6+1.1*power, vz:f.z*speed, skips:0, t:0, first:true});
        state.stonesThrown++;
      }});
    }});
  }

  // ------------------------ 3. PAINT A ROCK --------------------------- //
  const rockGeo=new THREE.BoxGeometry(1.3,0.55,1.05), rockMat=toon(0xd8caa8);
  // 7 designs (drawDesign): heart · rainbow · sunburst · J+M · RICO · star · remember
  let firstPaint=true;

  function drawDesign(g,i){
    g.clearRect(0,0,256,256); const cx=128,cy=128;
    g.lineJoin='round'; g.lineCap='round';
    if(i===0){                                         // pastel heart
      const s=64; g.fillStyle='#ff8fbf';
      g.beginPath(); g.moveTo(cx,cy+s*0.95);
      g.bezierCurveTo(cx-s*1.35,cy-s*0.2, cx-s*0.55,cy-s*1.15, cx,cy-s*0.35);
      g.bezierCurveTo(cx+s*0.55,cy-s*1.15, cx+s*1.35,cy-s*0.2, cx,cy+s*0.95);
      g.fill();
    }else if(i===1){                                   // rainbow arc
      const cols=['#ff5a5a','#ff9d4d','#ffe14d','#5ad07a','#4da6ff','#9a6bff'];
      g.lineWidth=15; cols.forEach((c,k)=>{g.strokeStyle=c;g.beginPath();g.arc(cx,cy+62,32+k*17,Math.PI,0);g.stroke();});
    }else if(i===2){                                   // sunburst
      g.fillStyle='#ffd447'; g.beginPath(); g.arc(cx,cy,32,0,7); g.fill();
      g.strokeStyle='#ffb300'; g.lineWidth=11;
      for(let k=0;k<12;k++){const a=k/12*Math.PI*2;
        g.beginPath();g.moveTo(cx+Math.cos(a)*44,cy+Math.sin(a)*44);g.lineTo(cx+Math.cos(a)*92,cy+Math.sin(a)*92);g.stroke();}
    }else if(i===3){ text(g,'J+M','#ff6b9d',88); }
    else if(i===4){ text(g,'RICO','#4da6ff',74); }
    else if(i===5){                                    // 5-point star
      g.fillStyle='#ffd447'; g.beginPath();
      for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5, r=k%2?38:92;
        const px=cx+Math.cos(a)*r, py=cy+Math.sin(a)*r; k?g.lineTo(px,py):g.moveTo(px,py);}
      g.closePath(); g.fill();
    }else{                                             // "the rocks remember"
      g.fillStyle='#7a5cff'; g.strokeStyle='#ffffff'; g.lineWidth=4;
      g.textAlign='center'; g.textBaseline='middle';
      const ls=['the','rocks','remember'];
      ls.forEach((ln,k)=>{const fs=ln.length>5?46:56; g.font=`700 ${fs}px "Trebuchet MS",sans-serif`;
        const y=cy+(k-1)*58; g.strokeText(ln,cx,y); g.fillText(ln,cx,y);});
    }
  }
  function text(g,s,c,fs){
    g.fillStyle=c; g.strokeStyle='#ffffff'; g.lineWidth=6;
    g.textAlign='center'; g.textBaseline='middle';
    g.font=`800 ${fs}px "Trebuchet MS",sans-serif`;
    g.strokeText(s,128,128); g.fillText(s,128,128);
  }
  function buildPaintRock(spot,id){
    const ry=(Math.random()-0.5)*0.5;
    const block=new THREE.Mesh(rockGeo,rockMat);
    block.position.set(spot.x,spot.y+0.28,spot.z); block.rotation.y=ry; scene.add(block);
    collide(spot.x,spot.z,0.55);
    const cv=document.createElement('canvas'); cv.width=cv.height=256;
    const g2=cv.getContext('2d'); const tex=new THREE.CanvasTexture(cv);
    const decal=new THREE.Mesh(new THREE.PlaneGeometry(1.14,0.94),
      curveMat(new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide})));
    decal.rotation.set(-Math.PI/2,0,ry); decal.position.set(spot.x,spot.y+0.565,spot.z); scene.add(decal);
    const rock={design:-1};
    addInteraction({x:spot.x,z:spot.z,r:2.2,label:'paint this rock',onUse:()=>{
      rock.design=(rock.design+1)%7; drawDesign(g2,rock.design); tex.needsUpdate=true; sPaint();
      if(firstPaint){firstPaint=false; toast('the rocks remember','Belmont Rocks tradition since the 70s');}
      state.rocksPainted.add(id);
    }});
  }
  [165,172,180,187].forEach((z,k)=>buildPaintRock(rockSpot(z,4+(k%2)*1.6),k));   // rocks terraces ~(148,175)

  // ------------------------------ 2. FETCH ---------------------------- //
  const dog = dogTail ? dogTail.parent : null;
  const DB=CH.DOG_PROPS;
  // the dog + ball moved off their spawn spots below; drop the stale colliders
  // they left behind (invisible bumps on the little beach).
  const dropCol=(x,z,r)=>{for(let i=colliders.length-1;i>=0;i--){const c=colliders[i];
    if(Math.abs(c.x-x)<0.4&&Math.abs(c.z-z)<0.4&&Math.abs(c.r-r)<0.1){colliders.splice(i,1);return;}}};
  dropCol(DB.dog.x,DB.dog.z,DB.dog.collide);
  dropCol(DB.ball.x,DB.ball.z,DB.ball.collide);

  // grab the real red ball out of the scene (fallback: build our own)
  let ball=null;
  scene.traverse(o=>{ if(ball)return;
    if(o.isMesh&&o.geometry&&o.geometry.type==='SphereGeometry'&&o.geometry.parameters
       &&Math.abs(o.geometry.parameters.radius-0.42)<0.03
       &&Math.abs(o.position.x-DB.ball.x)<0.8&&Math.abs(o.position.z-DB.ball.z)<0.8) ball=o;
  });
  if(!ball){ ball=new THREE.Mesh(new THREE.SphereGeometry(0.42,12,10),toon(0xff7b6b));
    ball.position.set(DB.ball.x,(beachH(DB.ball.x,DB.ball.z)??0)+0.44,DB.ball.z); scene.add(ball); }

  // dog stays on sand + shallow edge. GRAB radius is generous and the
  // reachable window sits safely INSIDE clamp+grab, so a "reachable" ball is
  // always physically grabbable (no infinite chase at the sand's edge).
  const GRAB=0.8;
  const clX=x=>clamp(x,90,110), clZ=z=>clamp(z,-344,-330);   // new dog-beach cove (DOG_BEACH.bounds)
  const dogBaseY=(x,z)=>{const bh=beachH(x,z);return bh!==null?bh:WATER_Y;};
  const reachable=(x,z)=>x>89.4&&x<110.6&&z>-344.6&&z<-329.4;   // safely inside clamp+GRAB

  const fetch={phase:'idle', bx:ball.position.x, by:ball.position.y, bz:ball.position.z,
               bvx:0,bvy:0,bvz:0, restT:0, respawnT:0, whineT:0, boostT:0, chaseT:0};

  // drive the dog toward a clamped target with a leg-less bound; returns reached
  function dogPursue(dt,t,tx,tz,speed){
    if(!dog)return false;
    const cx=clX(tx), cz=clZ(tz), dp=dog.position;
    let dx=cx-dp.x, dz=cz-dp.z, d=Math.hypot(dx,dz);
    if(d>1e-3){
      const step=Math.min(d,speed*dt); dp.x+=dx/d*step; dp.z+=dz/d*step;
      dog.rotation.y=lerpAngle(dog.rotation.y,Math.atan2(dx,dz),1-Math.exp(-10*dt));
    }
    const running=d>GRAB;
    dp.y=dogBaseY(dp.x,dp.z)+(running?Math.abs(Math.sin(t*14))*0.16:0);
    dog.rotation.x = running?Math.sin(t*14)*0.12:dog.rotation.x*(1-Math.min(1,dt*6));
    if(fetch.boostT<=0) dog.rotation.z += (0-dog.rotation.z)*Math.min(1,dt*6);
    return d<=GRAB;
  }

  const fetchInter=addInteraction({x:DB.ball.x,z:DB.ball.z,r:2.8,label:'play fetch',onUse:()=>{
    if(fetch.phase!=='idle')return;
    holdItem(ball); ball.scale.setScalar(0.62); ball.position.set(0,0,0);
    fetch.phase='held'; fetchInter.setLabel('throw the ball (hold E)');
    chargeThrow({onRelease:power=>{
      ball.getWorldPosition(_wp); holdItem(null); scene.add(ball); ball.scale.setScalar(1);
      const f=camForward(), speed=5+7*power;             // gentle — the beach is ~11m wide
      fetch.bx=_wp.x+f.x*0.4; fetch.by=_wp.y+0.1; fetch.bz=_wp.z+f.z*0.4;
      fetch.bvx=f.x*speed; fetch.bvy=1.8+2.0*power; fetch.bvz=f.z*speed;
      ball.position.set(fetch.bx,fetch.by,fetch.bz);
      fetch.phase='thrown'; fetch.restT=0; fetchInter.enabled=false;
    }});
  }});

  function dropBall(bx,bz){
    scene.add(ball); ball.scale.setScalar(1);
    const by=(beachH(bx,bz)??WATER_Y)+0.42;
    ball.position.set(bx,by,bz);
    fetch.bx=bx; fetch.by=by; fetch.bz=bz; fetch.bvx=fetch.bvy=fetch.bvz=0;
    fetchInter.x=bx; fetchInter.z=bz; fetchInter.enabled=true; fetchInter.setLabel('play fetch');
    fetch.phase='idle';
  }
  function updateFetch(dt,t,player){
    if(!dog)return;
    if(fetch.boostT>0)fetch.boostT-=dt;
    const ph=fetch.phase;

    if(ph==='thrown'){
      fetch.bvy-=9*dt;
      fetch.bx+=fetch.bvx*dt; fetch.by+=fetch.bvy*dt; fetch.bz+=fetch.bvz*dt;
      const g=groundAt(fetch.bx,fetch.bz);
      if(fetch.by<=g.y+0.42){
        if(g.water){ fetch.by=g.y+0.28; fetch.bvy=0; fetch.bvx*=0.8; fetch.bvz*=0.8; }
        else{ fetch.by=g.y+0.42;
          if(fetch.bvy<-0.6){ fetch.bvy=-fetch.bvy*0.5; fetch.bvx*=0.62; fetch.bvz*=0.62; ball.scale.set(1.2,0.72,1.2); }
          else{ fetch.bvy=0; fetch.bvx*=0.5; fetch.bvz*=0.5; } }
      }
      ball.scale.x+=(1-ball.scale.x)*Math.min(1,dt*8);
      ball.scale.y+=(1-ball.scale.y)*Math.min(1,dt*8);
      ball.scale.z+=(1-ball.scale.z)*Math.min(1,dt*8);
      ball.position.set(fetch.bx,fetch.by,fetch.bz);
      ball.rotation.x+=6*dt; ball.rotation.z+=5*dt;
      dogPursue(dt,t,fetch.bx,fetch.bz,5.5);
      const hs=Math.hypot(fetch.bvx,fetch.bvz);
      fetch.restT = (hs<0.6&&Math.abs(fetch.bvy)<0.5)?fetch.restT+dt:0;
      if(fetch.restT>0.25){
        if(reachable(fetch.bx,fetch.bz)){ fetch.phase='chase'; fetch.chaseT=0; }
        else{ fetch.phase='wait'; fetch.respawnT=5; fetch.whineT=0; }
      }
      return;
    }

    if(ph==='chase'){
      const g=groundAt(fetch.bx,fetch.bz);
      ball.position.set(fetch.bx, g.water?g.y+0.28+Math.sin(t*3)*0.05:fetch.by, fetch.bz);
      if(dogPursue(dt,t,fetch.bx,fetch.bz,5.5)){       // grab
        ball.scale.setScalar(0.62); dog.add(ball); ball.position.set(0,0.9,0.85);
        fetch.phase='return';
      }else if((fetch.chaseT+=dt)>4){                  // safety: can't reach -> give up
        fetch.phase='wait'; fetch.respawnT=4; fetch.whineT=0;
      }
      return;
    }

    if(ph==='return'){
      if(dogPursue(dt,t,player.x,player.z,4.5)){
        const dp=dog.position; let dx=player.x-dp.x,dz=player.z-dp.z,d=Math.hypot(dx,dz)||1;
        dropBall(clX(dp.x+dx/d*0.6), clZ(dp.z+dz/d*0.6));
        fetch.boostT=6; state.fetches++;
        if(state.fetches===3)toast('GOOD DOG','the goodest on the north side');
      }
      return;
    }

    if(ph==='wait'){                                   // ball out of reach
      dogPursue(dt,t,fetch.bx,fetch.bz,5.0);
      fetch.whineT-=dt; if(fetch.whineT<=0){ sWhine(); fetch.whineT=1.7; }
      ball.position.set(fetch.bx,fetch.by,fetch.bz);
      fetch.respawnT-=dt;
      if(fetch.respawnT<=0){ const px=DB.pail.x+1.1,pz=DB.pail.z; dropBall(clX(px),clZ(pz)); }
      return;
    }

    // idle: bob a floating ball; trot the dog home; wag-boost excitement
    const g=groundAt(fetch.bx,fetch.bz);
    if(g.water) ball.position.y=g.y+0.28+Math.sin(t*2.5)*0.04;
    const hd=Math.hypot(dog.position.x-DB.dog.x, dog.position.z-DB.dog.z);
    if(hd>0.5){ dogPursue(dt,t,DB.dog.x,DB.dog.z,3.0); }
    else{
      const dp=dog.position; dp.y+=(dogBaseY(dp.x,dp.z)-dp.y)*Math.min(1,dt*8);
      dog.rotation.x+=(0-dog.rotation.x)*Math.min(1,dt*6);
      dog.rotation.y=lerpAngle(dog.rotation.y,DB.dog.ry,1-Math.exp(-4*dt));
      if(fetch.boostT>0){                              // the goodest: happy hop + wiggle
        dog.rotation.z=Math.sin(t*16)*0.13;
        dp.y=dogBaseY(dp.x,dp.z)+Math.abs(Math.sin(t*10))*0.12;
      }else dog.rotation.z+=(0-dog.rotation.z)*Math.min(1,dt*6);
    }
  }

  // ------------------------- 4. DOG PARK ------------------------------ //
  // Two neighbours run continuous, offset-phase fetch loops on the cove
  // sand: owner throws (arm swing) -> dog SPRINTS -> if the ball landed in
  // the shallows (beach slope < 0) the dog SWIMS low with a paddling bob
  // and ripple rings -> grab -> trots back -> owner throws again. Phases are
  // desynced so the pairs never mirror. Both dogs stay WEST of the plover
  // pen and clear of the player's own fetch spot. Dogs are built from six
  // instanced part-meshes shared across the pair (6 draw calls total);
  // balls are two small meshes; ripples reuse the shared FX point system.
  const PEN={x:105,z:-332,r:3.2};                    // piping-plover pen — dogs never enter
  const avoidPen=(x,z)=>{ const dx=x-PEN.x,dz=z-PEN.z,d=Math.hypot(dx,dz);
    return d<PEN.r?{x:PEN.x+dx*(PEN.r/(d||1)),z:PEN.z+dz*(PEN.r/(d||1))}:{x,z}; };

  // ---- instanced dog parts (one InstancedMesh per part-type, both dogs) ----
  const dogCream=toon(0xefe6d2), earTan=toon(0xcbb89a), snoutDk=toon(0x3a2f26);
  const bodyGeo=new THREE.SphereGeometry(0.42,10,9); bodyGeo.scale(0.85,0.8,1.25);
  const headGeo=new THREE.SphereGeometry(0.3,9,8);
  const earGeo=new THREE.ConeGeometry(0.11,0.26,5);
  const snoutGeo=new THREE.SphereGeometry(0.12,7,6);
  const tailGeo=new THREE.CylinderGeometry(0.05,0.08,0.5,6); tailGeo.translate(0,0.25,0);
  const legGeo=new THREE.CylinderGeometry(0.07,0.07,0.42,6); legGeo.translate(0,-0.21,0);  // hip at origin
  const bodyIM=new THREE.InstancedMesh(bodyGeo,dogCream,2);
  const headIM=new THREE.InstancedMesh(headGeo,dogCream,2);
  const earIM =new THREE.InstancedMesh(earGeo,earTan,4);
  const snoutIM=new THREE.InstancedMesh(snoutGeo,snoutDk,2);
  const tailIM=new THREE.InstancedMesh(tailGeo,dogCream,2);
  const legIM =new THREE.InstancedMesh(legGeo,dogCream,8);
  const dogIMs=[bodyIM,headIM,earIM,snoutIM,tailIM,legIM];
  dogIMs.forEach(m=>{ m.frustumCulled=false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); });

  // ---- owners (framework NPCs, scale 1) ----
  const ownerA=makeNPC({x:91,z:-340,ry:0.4,name:'walkerA',
    palette:{suit:0x4f6f9a,pants:0x2c3542,skin:0xdca878,hair:0x2b2118},
    lines:["go get it!","good boy!","atta girl","drop it","who's a good dog"]});
  const ownerB=makeNPC({x:99.5,z:-340,ry:-0.3,name:'walkerB',
    palette:{suit:0xb0553f,pants:0x33404a,skin:0xe6b088,hair:0x3a2a1c},
    lines:["here!","go go go!","bring it back","nice catch","fetch!"]});

  function makeDog(idx,owner,home,clampX,clampZ,scl,ballCol,waitT){
    const ball=new THREE.Mesh(new THREE.SphereGeometry(0.16,10,8),toon(ballCol));
    ball.position.set(owner.group.position.x,1.12,owner.group.position.z); scene.add(ball);
    return { idx,owner,home,clampX,clampZ,scale:scl,ball,
      x:home.x,z:home.z,y:beachH(home.x,home.z)??0,ry:owner.group.rotation.y,
      pitch:0,legPh:Math.random()*6,tailWag:0,swimming:false,rippleT:0,armT:0,
      phase:'idle',waitT,flight:null,landX:0,landZ:0,landY:0,waterThrow:false };
  }
  const dogs=[
    makeDog(0,ownerA,{x:91,z:-338},[88,96],[-340,-324],0.82,0xd4e34a,0.6),
    makeDog(1,ownerB,{x:99.5,z:-338},[94,101],[-340,-324],0.76,0x4a90e2,2.7),
  ];

  function clampDog(d,x,z){ return avoidPen(clamp(x,d.clampX[0],d.clampX[1]),clamp(z,d.clampZ[0],d.clampZ[1])); }
  function pickLanding(d,water){
    const zt = water ? -324.5-Math.random()*1.5 : -332-Math.random()*3;  // water: open lake -324.5..-326  sand:-332..-335
    const xt = clamp(d.owner.group.position.x+(Math.random()-0.5)*4, d.clampX[0]+0.6, d.clampX[1]-0.6);
    return avoidPen(xt,zt);
  }
  function ripple(x,y,z){
    for(let k=0;k<9;k++){ const a=k/9*Math.PI*2;
      FX.spawn(x,y,z,Math.cos(a)*1.9,0.04,Math.sin(a)*1.9,0.66,0.86,1.0,0.6,1.9,0,3.0);   // outer wake ring
      FX.spawn(x,y,z,Math.cos(a)*0.9,0.03,Math.sin(a)*0.9,0.78,0.9,1.0,0.45,1.3,0,3.4); } }  // inner splash

  // move a dog toward a target; drives run/swim gait, ground/water height, ripples
  function runDog(d,dt,t,tx,tz,water){
    const g=clampDog(d,tx,tz);
    let dx=g.x-d.x,dz=g.z-d.z,dist=Math.hypot(dx,dz);
    const surf=beachH(d.x,d.z), surfY=surf===null?WATER_Y:surf;
    const nowSwim=surf===null;                         // out past the beach edge = in the open lake
    const speed=nowSwim?2.3:5.4;
    if(dist>1e-3){ const step=Math.min(dist,speed*dt); d.x+=dx/dist*step; d.z+=dz/dist*step;
      d.ry=lerpAngle(d.ry,Math.atan2(dx,dz),1-Math.exp(-10*dt)); }
    const running=dist>0.55; d.swimming=nowSwim;
    if(nowSwim){                                       // low body at the water surface, quick paddle, wake rings
      d.legPh+=dt*17; d.pitch+=(0.2-d.pitch)*Math.min(1,dt*6);
      d.y+=((WATER_Y-0.30+Math.sin(t*4)*0.05)-d.y)*Math.min(1,dt*7);   // ease down into the water
      d.tailWag=Math.sin(t*6)*0.15;
      d.rippleT-=dt; if(d.rippleT<=0){ d.rippleT=0.2; ripple(d.x,WATER_Y+0.02,d.z); }
    }else{                                             // sprint on the sand
      d.legPh+=dt*(running?15:2.5); d.pitch+=(0-d.pitch)*Math.min(1,dt*6);
      d.y=surfY+(running?Math.abs(Math.sin(t*13))*0.14:0);
      d.tailWag=running?Math.sin(t*10)*0.2:d.tailWag*0.9;
    }
    return dist<=0.55;
  }

  function updDogPair(d,dt,t){
    const owner=d.owner, og=owner.group;
    // owner watches the ball/dog + a throw-arm swing on release
    const fx=d.ball.position.x-og.position.x, fz=d.ball.position.z-og.position.z;
    if(fx*fx+fz*fz>0.05) og.rotation.y=lerpAngle(og.rotation.y,Math.atan2(fx,fz),1-Math.exp(-5*dt));
    if(d.armT>0){ d.armT-=dt; owner.parts.armR.rotation.x=-1.8*clamp(d.armT/0.4,0,1); }

    if(d.phase==='idle'){
      const hd=Math.hypot(d.x-d.home.x,d.z-d.home.z);
      if(hd>0.5) runDog(d,dt,t,d.home.x,d.home.z,false);
      else{ const s=beachH(d.x,d.z); d.y=(s===null?WATER_Y:s); d.swimming=false; d.legPh+=dt*2.5;
        d.pitch+=(0-d.pitch)*Math.min(1,dt*6); d.tailWag=Math.sin(t*7)*0.28;
        d.ry=lerpAngle(d.ry,og.rotation.y+Math.PI,1-Math.exp(-3*dt)); }
      d.ball.position.set(og.position.x,1.12,og.position.z);      // ball resting in owner's hand
      d.waitT-=dt;
      if(d.waitT<=0){
        const water=Math.random()<0.99, land=pickLanding(d,water);
        d.landX=land.x; d.landZ=land.z; d.waterThrow=water;
        const ly=beachH(land.x,land.z); d.landY=ly===null?WATER_Y:ly;
        d.flight={fx:og.position.x,fy:1.12,fz:og.position.z,tx:land.x,ty:d.landY+0.16,tz:land.z,
                  t:0,dur:0.8+Math.random()*0.2,arc:1.8};
        d.armT=0.4; owner.say(water?'go get it!':'fetch!',1.4); d.phase='throw';
      }
      return;
    }
    if(d.phase==='throw'){
      const f=d.flight; f.t+=dt; const s=clamp(f.t/f.dur,0,1);
      d.ball.position.set(lerp(f.fx,f.tx,s),lerp(f.fy,f.ty,s)+f.arc*4*s*(1-s),lerp(f.fz,f.tz,s));
      d.ball.rotation.x+=8*dt;
      runDog(d,dt,t,f.tx,f.tz,d.waterThrow);                      // sprint toward the landing
      if(s>=1){ d.phase='chase'; d.flight=null; }
      return;
    }
    if(d.phase==='chase'){
      const inWater=d.waterThrow&&d.landY<-1.0;
      d.ball.position.set(d.landX, inWater?d.landY+0.12+Math.sin(t*3)*0.05:d.landY+0.16, d.landZ);
      if(runDog(d,dt,t,d.landX,d.landZ,d.waterThrow)){ d.phase=inWater?'grab':'return'; d.grabT=1.4; }
      return;
    }
    if(d.phase==='grab'){                               // tread water a beat, ball in the mouth
      runDog(d,dt,t,d.landX,d.landZ,true);
      d.ball.position.set(d.x+Math.sin(d.ry)*0.45, d.y+0.45, d.z+Math.cos(d.ry)*0.45); d.ball.rotation.set(0,0,0);
      d.grabT-=dt; if(d.grabT<=0) d.phase='return';
      return;
    }
    if(d.phase==='return'){
      const reached=runDog(d,dt,t,d.home.x,d.home.z,false);      // trot back to the dry sand
      d.ball.position.set(d.x+Math.sin(d.ry)*0.5, d.y+0.5, d.z+Math.cos(d.ry)*0.5);  // in the dog's mouth
      d.ball.rotation.set(0,0,0);
      if(reached){ d.phase='idle'; d.waitT=0.8+Math.random()*1.4;
        owner.say(["good boy!","drop it","atta girl","who's a good dog"][(Math.random()*4)|0],1.4); }
      return;
    }
  }

  // compose the six instanced part matrices for one dog (world = dog * part-local)
  function writeDog(d){
    const idx=d.idx,S=d.scale;
    _dEul.set(d.pitch,d.ry,0); _dQuat.setFromEuler(_dEul);
    _dPos.set(d.x,d.y,d.z); _dScl.set(S,S,S); _dMat.compose(_dPos,_dQuat,_dScl);
    const part=(im,ii,lx,ly,lz,rx,ry,rz)=>{
      _pEul.set(rx,ry,rz); _pQuat.setFromEuler(_pEul); _pPos.set(lx,ly,lz); _pScl.set(1,1,1);
      _pMat.compose(_pPos,_pQuat,_pScl); _pMat.premultiply(_dMat); im.setMatrixAt(ii,_pMat);
    };
    part(bodyIM,idx,0,0.48,0,0,0,0);
    part(headIM,idx,0,0.92,0.5,0,0,0);
    part(earIM,idx*2,  -0.17,1.16,0.44,0,0,0.3);
    part(earIM,idx*2+1, 0.17,1.16,0.44,0,0,-0.3);
    part(snoutIM,idx,0,0.86,0.78,0,0,0);
    part(tailIM,idx,0,0.62,-0.5,-0.9,d.tailWag,0);
    const amp=d.swimming?0.4:0.62;
    const hips=[[-0.2,0.32,0],[0.2,0.32,Math.PI],[-0.2,-0.26,Math.PI],[0.2,-0.26,0]];
    for(let l=0;l<4;l++){ const h=hips[l];
      part(legIM,idx*4+l,h[0],0.42,h[1],Math.sin(d.legPh+h[2])*amp,0,0); }
  }
  function updateDogPark(dt,t){
    for(const d of dogs){ updDogPair(d,dt,t); writeDog(d); }
    for(const m of dogIMs) m.instanceMatrix.needsUpdate=true;
  }
  for(const d of dogs) writeDog(d);                    // seed matrices so nothing flashes at the origin
  for(const m of dogIMs) m.instanceMatrix.needsUpdate=true;

  // ------------------------------ per frame --------------------------- //
  registerUpdate((dt,t,pl)=>{ updateStones(dt); updateFetch(dt,t,pl); updateDogPark(dt,t); });
});
