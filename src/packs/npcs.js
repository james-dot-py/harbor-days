// =====================================================================
//  PACK: npcs — the Neighbors. Four bits of north-side human (+ goose) life
//  along the harbor's west trail and the Belmont Rocks:
//    1. HOT DOG CART  — vendor + steaming cart. Order "the works" for a
//                       Chicago dog (bun/dog/relish/mustard/tomato/peppers)
//                       -> munch -> +run-speed buff w/ mustard-gold sparkles.
//                       Ask for ketchup -> vendor recoils, 4 gulls dive you.
//    2. THE GOOSE     — a Canada goose patrols the trail; get too close and
//                       it lowers its neck, hisses, and CHASES. Never leaves
//                       its turf; fluffs + honks when it wins.
//    3. FRISBEE       — two friends float a disc across the lawn beside the
//                       diamond (~17 m apart); it flies in a slow, floaty
//                       banking arc; every ~5th throw SAILS past and the
//                       catcher jogs it down; they hold the throw politely
//                       if you wander into the lane ('heads up!').
//    4. CHICAGO HANDSHAKE — a laid-back regular hands you an Old Style, then
//                       a Malört shot: the screen makes the face.
//  Only-my-file rules: no shared edits (one import line in packs/index.js).
//  All setup in onWorldReady; all audio synthesized + guarded on actx; all
//  jitter uses Math.random so the shared world rng is never perturbed.
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, registerUpdate, addInteraction, holdItem, toast,
         journalSection, state, getAudioCtx, screenFx, makeNPC } from '../framework.js';
import { scene, camera, toon, bmat, clamp, lerp, lerpAngle } from '../core.js';
import { DUST } from '../fx.js';
import { mayor } from '../character.js';
import { mainCurve } from '../paths.js';
import { oldStyleTex, pourMalort } from './malort.js';   // shared Malört swig + Old Style label (task 031)

// ------------------------------ scratch (no per-frame alloc) -----------
const _m=new THREE.Matrix4(), _v=new THREE.Vector3(), _sc=new THREE.Vector3(), _q=new THREE.Quaternion();

// ================================ audio ================================
// All reuse the exported getAudioCtx() nodes only (no audio.js internals).
function sCrunch(){                                   // soft munch bite
  const ac=getAudioCtx(); if(!ac.actx)return; const {actx,sfxBus,noiseBuf}=ac,t=actx.currentTime;
  const s=actx.createBufferSource();s.buffer=noiseBuf;
  const f=actx.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(950,t);f.frequency.exponentialRampToValueAtTime(240,t+0.12);f.Q.value=1.2;
  const g=actx.createGain();g.gain.setValueAtTime(0.17,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.14);
  s.connect(f);f.connect(g);g.connect(sfxBus);s.start(t);s.stop(t+0.16);
}
function sGullCry(){                                  // reuse the sGull recipe (2 descending chirps)
  const {actx,sfxBus}=getAudioCtx(); if(!actx)return; const t=actx.currentTime;
  for(let i=0;i<2;i++){const o=actx.createOscillator(),g=actx.createGain();o.type='sine';const t0=t+i*0.26;
    o.frequency.setValueAtTime(1150,t0);o.frequency.exponentialRampToValueAtTime(760,t0+0.22);
    g.gain.setValueAtTime(0.0001,t0);g.gain.linearRampToValueAtTime(0.05,t0+0.03);g.gain.exponentialRampToValueAtTime(0.0001,t0+0.26);
    o.connect(g);g.connect(sfxBus);o.start(t0);o.stop(t0+0.3);}
}
function sHiss(){                                     // goose hiss — highpassed noise
  const ac=getAudioCtx(); if(!ac.actx)return; const {actx,sfxBus,noiseBuf}=ac,t=actx.currentTime;
  const s=actx.createBufferSource();s.buffer=noiseBuf;
  const f=actx.createBiquadFilter();f.type='highpass';f.frequency.value=1500;f.Q.value=0.6;
  const g=actx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.12,t+0.05);
  g.gain.setValueAtTime(0.1,t+0.4);g.gain.exponentialRampToValueAtTime(0.0001,t+0.6);
  s.connect(f);f.connect(g);g.connect(sfxBus);s.start(t);s.stop(t+0.65);
}
function sHonk(){                                     // goose honk — two-tone nasal "ah-onk"
  const {actx,sfxBus}=getAudioCtx(); if(!actx)return; const t=actx.currentTime;
  [[233,0],[196,0.16]].forEach(([fr,dl])=>{
    const o=actx.createOscillator(),o2=actx.createOscillator(),g=actx.createGain();
    o.type='sawtooth';o2.type='square';o.frequency.value=fr;o2.frequency.value=fr;o2.detune.value=9;
    const f=actx.createBiquadFilter();f.type='bandpass';f.frequency.value=fr*3;f.Q.value=3;
    g.gain.setValueAtTime(0.0001,t+dl);g.gain.linearRampToValueAtTime(0.14,t+dl+0.03);
    g.gain.setValueAtTime(0.12,t+dl+0.12);g.gain.exponentialRampToValueAtTime(0.0001,t+dl+0.24);
    o.connect(f);o2.connect(f);f.connect(g);g.connect(sfxBus);
    o.start(t+dl);o2.start(t+dl);o.stop(t+dl+0.26);o2.stop(t+dl+0.26);});
}
function sDiscThrow(){                                // frisbee release — airy whoosh
  const ac=getAudioCtx(); if(!ac.actx)return; const {actx,sfxBus,noiseBuf}=ac,t=actx.currentTime;
  const s=actx.createBufferSource();s.buffer=noiseBuf;
  const f=actx.createBiquadFilter();f.type='bandpass';f.Q.value=0.8;
  f.frequency.setValueAtTime(480,t);f.frequency.exponentialRampToValueAtTime(1700,t+0.17);
  const g=actx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.08,t+0.04);g.gain.exponentialRampToValueAtTime(0.0001,t+0.21);
  s.connect(f);f.connect(g);g.connect(sfxBus);s.start(t);s.stop(t+0.23);
}
function sDiscCatch(){                                // disc into hands — soft plastic tap
  const ac=getAudioCtx(); if(!ac.actx)return; const {actx,sfxBus,noiseBuf}=ac,t=actx.currentTime;
  const s=actx.createBufferSource();s.buffer=noiseBuf;
  const f=actx.createBiquadFilter();f.type='bandpass';f.frequency.value=880;f.Q.value=2.2;
  const g=actx.createGain();g.gain.setValueAtTime(0.13,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.08);
  s.connect(f);f.connect(g);g.connect(sfxBus);s.start(t);s.stop(t+0.1);
  const o=actx.createOscillator(),og=actx.createGain();o.type='triangle';
  o.frequency.setValueAtTime(300,t);o.frequency.exponentialRampToValueAtTime(160,t+0.09);
  og.gain.setValueAtTime(0.09,t);og.gain.exponentialRampToValueAtTime(0.0001,t+0.11);
  o.connect(og);og.connect(sfxBus);o.start(t);o.stop(t+0.12);
}
function sCrack(){                                    // Old Style can crack + fizz
  const ac=getAudioCtx(); if(!ac.actx)return; const {actx,sfxBus,noiseBuf}=ac,t=actx.currentTime;
  const o=actx.createOscillator(),og=actx.createGain();o.type='square';o.frequency.value=520;
  og.gain.setValueAtTime(0.09,t);og.gain.exponentialRampToValueAtTime(0.0001,t+0.06);
  o.connect(og);og.connect(sfxBus);o.start(t);o.stop(t+0.07);
  const s=actx.createBufferSource();s.buffer=noiseBuf;
  const f=actx.createBiquadFilter();f.type='highpass';f.frequency.value=3500;
  const g=actx.createGain();g.gain.setValueAtTime(0.0001,t+0.02);g.gain.linearRampToValueAtTime(0.05,t+0.06);g.gain.exponentialRampToValueAtTime(0.0001,t+0.5);
  s.connect(f);f.connect(g);g.connect(sfxBus);s.start(t+0.02);s.stop(t+0.55);
}
// (sMalort moved to malort.js — the Malört guy + the Handshake share it now)

// ============================ canvas textures ==========================
function stripeTex(){                                 // umbrella — red/yellow radial wedges
  const cv=document.createElement('canvas');cv.width=256;cv.height=64;const g=cv.getContext('2d');
  const cols=['#e23b34','#f7c94b'],n=12,w=256/n;
  for(let i=0;i<n;i++){g.fillStyle=cols[i%2];g.fillRect(i*w,0,w+1,64);}
  const tx=new THREE.CanvasTexture(cv);tx.anisotropy=4;return tx;
}
function hotsTex(){                                   // 'RED HOTS' cart sign
  const cv=document.createElement('canvas');cv.width=256;cv.height=110;const g=cv.getContext('2d');
  g.fillStyle='#c8342b';g.beginPath();g.roundRect(4,4,248,102,12);g.fill();
  g.strokeStyle='#f7c94b';g.lineWidth=6;g.stroke();
  g.fillStyle='#ffe14d';g.textAlign='center';g.textBaseline='middle';
  g.font='800 46px "Trebuchet MS",sans-serif';g.fillText('RED HOTS',128,42);
  g.font='600 20px "Trebuchet MS",sans-serif';g.fillStyle='#fff2c4';g.fillText('steamed · never boiled',128,80);
  return new THREE.CanvasTexture(cv);
}
// (oldStyleTex moved to malort.js — the Handshake can + the Malört guy's case share it)
function gullTex(){                                   // white seagull "M" silhouette (transparent)
  const cv=document.createElement('canvas');cv.width=64;cv.height=48;const g=cv.getContext('2d');
  g.clearRect(0,0,64,48);g.strokeStyle='#ffffff';g.lineWidth=6;g.lineCap='round';g.lineJoin='round';
  g.beginPath();g.moveTo(5,32);g.quadraticCurveTo(20,8,32,26);g.quadraticCurveTo(44,8,59,32);g.stroke();
  return new THREE.CanvasTexture(cv);
}

// ================================ builders =============================
function buildHotDog(){                              // reused held group (bun+dog+works)
  const grp=new THREE.Group();
  const add=(mesh,x,y,z,rz)=>{mesh.position.set(x,y,z);if(rz)mesh.rotation.z=rz;grp.add(mesh);};
  add(new THREE.Mesh(new THREE.BoxGeometry(0.5,0.15,0.24),toon(0xdca85a)),0,0,0);          // bun
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.5,10),toon(0x9c3b22)),0,0.09,0,Math.PI/2); // dog
  add(new THREE.Mesh(new THREE.BoxGeometry(0.42,0.035,0.05),toon(0x4fa32a)),0,0.16,0.05);  // relish
  add(new THREE.Mesh(new THREE.BoxGeometry(0.44,0.03,0.04),toon(0xf4c81e)),0,0.17,-0.02);  // mustard zigzag
  add(new THREE.Mesh(new THREE.BoxGeometry(0.4,0.03,0.05),toon(0xd8402e)),0,0.1,0.11);      // tomato strip
  add(new THREE.Mesh(new THREE.ConeGeometry(0.03,0.11,6),toon(0x5f9a34)),0.13,0.17,-0.05);  // sport pepper
  add(new THREE.Mesh(new THREE.ConeGeometry(0.03,0.11,6),toon(0x5f9a34)),-0.06,0.17,-0.06); // sport pepper
  grp.visible=true;
  return grp;
}

// find the CURRENT bike centerline near the old stop and offset the cart WEST
// of the whole dual ribbon onto the inner-park grass. The city-data pass may
// reroute the trail, so we sample mainCurve live rather than hard-coding.
function cartSpot(){
  const TX=45, TZ=-150, WEST_OFF=5.5;                 // 5.5 m clears the ~6.8 m dual ribbon (centerline +4.5 covers it)
  if(!mainCurve) return {x:TX-WEST_OFF, z:TZ};        // guard (paths build before worldReady)
  let bu=0, bd=Infinity;
  for(let i=0;i<=400;i++){ const u=i/400, p=mainCurve.getPoint(u), dx=p.x-TX, dz=p.z-TZ, d=dx*dx+dz*dz; if(d<bd){bd=d;bu=u;} }
  const p=mainCurve.getPoint(bu), tg=mainCurve.getTangent(bu);
  let nx=-tg.z, nz=tg.x; const l=Math.hypot(nx,nz)||1; nx/=l; nz/=l;   // trail normal
  if(nx>0){ nx=-nx; nz=-nz; }                          // force WEST (−x, the inner-park grass side)
  return {x:p.x+nx*WEST_OFF, z:p.z+nz*WEST_OFF};
}

// ================================ wire up ==============================
onWorldReady(player=>{
  // ---- journal counters ----
  state.dogsEaten=state.dogsEaten||0; state.ketchupIncidents=state.ketchupIncidents||0;
  state.gooseEncounters=state.gooseEncounters||0; state.handshakes=state.handshakes||0;
  state.malortShots=state.malortShots||0;   // every Malört shot (Handshake ceremony + the Malört guy)
  state.bests=state.bests||{}; state.bests.discRally=state.bests.discRally||0;
  journalSection('people','Neighbors',()=>`
    <div class="jrow"><span>Encased meats eaten</span><b>${state.dogsEaten||0}</b></div>
    <div class="jrow"><span>Ketchup incidents</span><b>${state.ketchupIncidents||0}</b></div>
    <div class="jrow"><span>Goose encounters</span><b>${state.gooseEncounters||0}</b></div>
    <div class="jrow"><span>Longest frisbee rally</span><b>${(state.bests&&state.bests.discRally)||0}</b></div>
    <div class="jrow"><span>Chicago handshakes</span><b>${state.handshakes||0}</b></div>
    <div class="jrow"><span>Malört shots</span><b>${state.malortShots||0}</b></div>`);

  // ================================================================== //
  //  1) HOT DOG CART  (on the harbor-west lawn, beside the trail)
  // ================================================================== //
  const _cs=cartSpot(); const CX=_cs.x, CZ=_cs.z;     // cart centre: ≥5 m W of the rerouted bike path, on grass
  // body / counter / pot
  const body=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.9,1.1),toon(0xcdd2d7));body.position.set(CX,0.75,CZ);scene.add(body);
  const counter=new THREE.Mesh(new THREE.BoxGeometry(2.34,0.12,1.22),toon(0x9aa0a6));counter.position.set(CX,1.24,CZ);scene.add(counter);
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,0.22,12),toon(0x6a7078));pot.position.set(CX,1.4,CZ);scene.add(pot);
  // wheels (instanced)
  const wheels=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.32,0.32,0.14,12),toon(0x2b2b2b),2);
  [-0.95,0.95].forEach((dx,i)=>{_q.setFromEuler(new THREE.Euler(0,0,Math.PI/2));_m.compose(_v.set(CX+dx,0.3,CZ+0.35),_q,_sc.set(1,1,1));wheels.setMatrixAt(i,_m);});
  wheels.instanceMatrix.needsUpdate=true;scene.add(wheels);_q.identity();
  // umbrella pole + striped canopy
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,3.0,8),toon(0x8a8a8a));pole.position.set(CX,1.6,CZ);scene.add(pole);
  const umb=new THREE.Mesh(new THREE.ConeGeometry(1.5,0.8,12),bmat(0xffffff,{map:stripeTex()}));umb.position.set(CX,3.15,CZ);scene.add(umb);
  // RED HOTS sign — back-to-back FrontSide pair (front toward the trail +z, back
  // toward the vendor -z). A lone DoubleSide plane showed MIRRORED text from
  // behind (PITFALLS); each face points outward so neither side mirrors.
  const hotsM=bmat(0xffffff,{map:hotsTex(),side:THREE.FrontSide,transparent:true});
  const hotsG=new THREE.PlaneGeometry(1.15,0.5);
  const signF=new THREE.Mesh(hotsG,hotsM); signF.position.set(CX,1.72,CZ+0.63); scene.add(signF);
  const signB=new THREE.Mesh(hotsG,hotsM); signB.position.set(CX,1.72,CZ+0.61); signB.rotation.y=Math.PI; scene.add(signB);

  const vendor=makeNPC({x:CX,z:CZ-1.6,ry:0,palette:{suit:0xe8e2d0,pants:0x333a44,skin:0xe0a878,hair:0x2a2018,face:true},   // setFace at runtime → keep live eyes
    name:'vendor',lines:["encased meats, my friend","steamed, never boiled","get 'em while they're hot","no ketchup — house rules","you want the works, dontcha"]});

  const hotdog=buildHotDog(); const HD_SCALE=0.85;
  const cart={busy:false,phase:'none',munchT:0,biteN:0};
  const buff={t:0}; let buffDustT=0, steamT=0;

  function orderWorks(){
    if(cart.busy)return; cart.busy=true;
    vendor.setFace('happy'); vendor.say('one, dragged through the garden',2.2);
    setTimeout(()=>{ hotdog.scale.setScalar(HD_SCALE); hotdog.position.set(0,0.14,0); hotdog.rotation.set(0,0,0);
      holdItem(hotdog); cart.phase='munch'; cart.munchT=3; cart.biteN=0; },1200);
  }
  function askKetchup(){
    if(cart.busy||GULL.t>0)return;
    vendor.setFace('surprised'); vendor.say('...get outta here.',3);
    startGullSwarm(); toast('NO.','this is a Chicago dog');
    state.ketchupIncidents=(state.ketchupIncidents||0)+1;
    setTimeout(()=>vendor.setFace('neutral'),3200);
  }
  addInteraction({x:CX+1.9,z:CZ,r:1.6,label:'order the works',onUse:orderWorks});
  addInteraction({x:CX-1.9,z:CZ,r:1.6,label:'ask for ketchup',onUse:askKetchup});

  // ---- 4 white gulls: one billboarded instanced silhouette, pooled/reused ----
  const GULL_N=4, GULL_DUR=4.2;
  const gullMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(0.72,0.5),
    bmat(0xffffff,{map:gullTex(),transparent:true,side:THREE.DoubleSide,depthWrite:false}),GULL_N);
  gullMesh.frustumCulled=false;gullMesh.visible=false;scene.add(gullMesh);
  const GULL={t:0,cryT:0};
  function startGullSwarm(){ GULL.t=GULL_DUR; GULL.cryT=0; gullMesh.visible=true; }
  function updGulls(dt){
    if(GULL.t<=0){ if(gullMesh.visible)gullMesh.visible=false; return; }
    GULL.t-=dt; const e=GULL_DUR-GULL.t, prog=clamp(e/GULL_DUR,0,1);
    const px=player.x,pz=player.z,py=player.y;
    for(let i=0;i<GULL_N;i++){
      const ang=i*(Math.PI*0.5)+e*3.6, rad=4.4-prog*2.6, h=Math.max(1.2,5.6-prog*3.9+Math.sin(e*7+i*1.3)*0.5);
      _v.set(px+Math.cos(ang)*rad,py+h,pz+Math.sin(ang)*rad);
      _sc.set(1,0.7+0.3*Math.sin(e*16+i*2),1);
      _m.compose(_v,camera.quaternion,_sc); gullMesh.setMatrixAt(i,_m);
    }
    gullMesh.instanceMatrix.needsUpdate=true;
    GULL.cryT-=dt; if(GULL.cryT<=0){ sGullCry(); GULL.cryT=0.8+Math.random()*0.5; }
  }

  function updCart(dt){
    // steam wisps from the pot
    steamT-=dt;
    if(steamT<=0){ steamT=0.18;
      DUST.spawn(CX+(Math.random()-0.5)*0.3,1.56,CZ+(Math.random()-0.5)*0.2,
        (Math.random()-0.5)*0.15,0.5+Math.random()*0.3,(Math.random()-0.5)*0.15,0.93,0.93,0.9,1.4,1.1,-0.25,0.5); }
    // munch (3 bites over 3s)
    if(cart.phase==='munch'){
      cart.munchT-=dt; const eaten=3-cart.munchT;
      while(cart.biteN<3&&eaten>=cart.biteN+1){ cart.biteN++; sCrunch(); }
      hotdog.scale.setScalar(HD_SCALE*Math.max(0.12,1-cart.biteN*0.28));
      if(cart.munchT<=0){ holdItem(null); cart.phase='none'; cart.busy=false;
        state.dogsEaten=(state.dogsEaten||0)+1;
        buff.t=20;                                    // refresh, never stacks
        toast('ENCASED MEATS','+run speed, 20s'); }
    }
    // run-speed buff + mustard-gold sparkles behind you
    if(buff.t>0){ buff.t-=dt; state.speedMult=1.35;
      buffDustT-=dt;
      if(buffDustT<=0&&(player.vx*player.vx+player.vz*player.vz>0.5)){ buffDustT=0.07;
        const fx=Math.sin(mayor.rotation.y),fz=Math.cos(mayor.rotation.y);
        DUST.spawn(player.x-fx*0.35+(Math.random()-0.5)*0.3,player.y+0.35,player.z-fz*0.35+(Math.random()-0.5)*0.3,
          (Math.random()-0.5)*0.4,0.5+Math.random()*0.5,(Math.random()-0.5)*0.4,0.95,0.76,0.09,0.5,0.5,-1.2,2); }
      if(buff.t<=0)state.speedMult=1;                 // restore
    }
  }

  // ================================================================== //
  //  2) THE GOOSE  (patrols the west trail near the cart)
  // ================================================================== //
  const goose=new THREE.Group();
  const gBrown=toon(0x6f5c3a),gBlk=toon(0x1c1c1c),gOrg=toon(0xe6892a),gWht=toon(0xf2efe6);
  const gBody=new THREE.Mesh(new THREE.SphereGeometry(0.26,10,8),gBrown);gBody.scale.set(1.05,0.95,1.55);gBody.position.y=0.5;goose.add(gBody);
  const neck=new THREE.Group();neck.position.set(0,0.62,0.28);goose.add(neck);
  const neckM=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.09,0.46,7),gBlk);neckM.geometry.translate(0,0.23,0);neck.add(neckM);
  const gHead=new THREE.Mesh(new THREE.SphereGeometry(0.115,9,8),gBlk);gHead.position.set(0,0.48,0.02);neck.add(gHead);
  const gBill=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.17,6),gOrg);gBill.rotation.x=Math.PI/2;gBill.position.set(0,0.46,0.16);neck.add(gBill);
  const gChin=new THREE.Mesh(new THREE.SphereGeometry(0.07,7,6),gWht);gChin.scale.set(1,1.25,0.5);gChin.position.set(0,0.44,0.1);neck.add(gChin);
  const gLegs=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03,0.03,0.2,5),gOrg,2);
  [-0.09,0.09].forEach((dx,i)=>{_m.compose(_v.set(dx,0.3,0.05),_q.identity(),_sc.set(1,1,1));gLegs.setMatrixAt(i,_m);});
  gLegs.instanceMatrix.needsUpdate=true;goose.add(gLegs);
  // patrol the harbor-west lawn between the hot-dog cart (45,-150) and the harbor
  // house (60,-100) — a grass strip just east of the trail (x~46 here) and well
  // west of the basin seawall (x85), so the loop never crosses water or path.
  const GO={anchor:{x:50,z:-120},phase:'patrol',wp:[-112,-130],wpi:0,walkT:0,honkT:5+Math.random()*4,
    alertT:0,fluffT:0,firstChase:true};
  goose.position.set(GO.anchor.x,0,GO.anchor.z);goose.scale.setScalar(0.72);scene.add(goose);

  function updGoose(dt,t){
    const gx=goose.position.x,gz=goose.position.z;
    const dPl=Math.hypot(player.x-gx,player.z-gz);
    const dAnchorPl=Math.hypot(player.x-GO.anchor.x,player.z-GO.anchor.z);
    let sp=0,tx=gx,tz=gz,moving=false;
    if(GO.phase==='patrol'||GO.phase==='return'){ GO.honkT-=dt; if(GO.honkT<=0){ sHonk(); GO.honkT=6+Math.random()*6; } }

    if(GO.phase==='patrol'){
      tx=GO.anchor.x+Math.sin(t*0.6)*0.4; tz=GO.wp[GO.wpi]; sp=0.9;
      if(Math.abs(gz-tz)<0.3)GO.wpi=1-GO.wpi;
      if(dPl<3&&dAnchorPl<9){ GO.phase='alert'; GO.alertT=0.5; sHiss(); }
    }else if(GO.phase==='alert'){
      GO.alertT-=dt;
      if(GO.alertT<=0){ GO.phase='chase'; state.gooseEncounters=(state.gooseEncounters||0)+1;
        if(GO.firstChase){ GO.firstChase=false; toast('THE GOOSE','you know what you did'); } }
    }else if(GO.phase==='chase'){
      // lunge to a 0.8m standoff so the neck-out threat reads (no overlap)
      let ddx=player.x-gx,ddz=player.z-gz,dd=Math.hypot(ddx,ddz)||1;
      tx=player.x-ddx/dd*0.8; tz=player.z-ddz/dd*0.8; sp=4.6;
      if(dAnchorPl>9){ GO.phase='return'; sHonk(); setTimeout(sHonk,360); GO.fluffT=0.5; }
    }else if(GO.phase==='return'){
      tx=GO.anchor.x; tz=GO.wp[GO.wpi]; sp=1.4;
      if(Math.hypot(gx-tx,gz-tz)<0.5)GO.phase='patrol';
    }
    if(sp>0){
      let dx=tx-gx,dz=tz-gz,d=Math.hypot(dx,dz);
      if(d>1e-3){ const step=Math.min(d,sp*dt); let nx=gx+dx/d*step,nz=gz+dz/d*step;
        const ax=nx-GO.anchor.x,az=nz-GO.anchor.z,ad=Math.hypot(ax,az);
        if(ad>12){ nx=GO.anchor.x+ax/ad*12; nz=GO.anchor.z+az/ad*12; }
        goose.position.x=nx;goose.position.z=nz;moving=step>0.001;
        goose.rotation.y=lerpAngle(goose.rotation.y,Math.atan2(dx,dz),1-Math.exp(-9*dt)); }
    }
    const neckTgt=(GO.phase==='alert'||GO.phase==='chase')?1.35:-0.1;
    neck.rotation.x+=(neckTgt-neck.rotation.x)*Math.min(1,dt*9);
    GO.walkT+=(moving?sp:0)*dt*3.5; const amt=moving?1:0;
    goose.rotation.z=Math.sin(GO.walkT)*0.12*amt;
    gBody.position.y=0.5+Math.abs(Math.sin(GO.walkT))*0.03*amt;
    if(GO.fluffT>0){ GO.fluffT-=dt; const p=Math.sin((0.5-GO.fluffT)/0.5*Math.PI); goose.scale.setScalar(0.72*(1+0.12*p)); }
    else goose.scale.setScalar(0.72);
  }

  // ================================================================== //
  //  3) FRISBEE  (open lawn beside the softball diamond — the pair stands
  //     ~17 m apart and floats a disc back and forth with real hang-time;
  //     every ~5th throw SAILS past and the catcher jogs it down; if you
  //     wander into the lane they hold the throw politely — 'heads up!')
  // ================================================================== //
  const FR={A:{x:34,z:-242},B:{x:48,z:-232}};          // ~17 m apart, both on grass
  const frA=makeNPC({x:FR.A.x,z:FR.A.z,ry:Math.atan2(FR.B.x-FR.A.x,FR.B.z-FR.A.z),
    palette:{suit:0x3aa06a,pants:0x394b57,skin:0xdca878,hair:0x2c211a},
    name:'disc',lines:["huck it!","open up!","nice and floaty","ope — my bad!","I got legs"]});
  const frB=makeNPC({x:FR.B.x,z:FR.B.z,ry:Math.atan2(FR.A.x-FR.B.x,FR.A.z-FR.B.z),
    palette:{suit:0xe0873a,pants:0x2a3340,skin:0xe6b088,hair:0x3a2a1c},
    name:'disc2',lines:["right here!","put some touch on it","up the line!","you betcha","I'm deep"]});
  const disc=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.30,0.05,18),toon(0xff8c1a));
  disc.position.set(FR.A.x,1.4,FR.A.z);scene.add(disc);
  const DISC={A:frA,B:frB,holder:'A',phase:'play',flight:null,waitT:1.4,throwN:0,rally:0,
              blockedT:0,jogger:null,carrying:false};

  function discHand(type){ const n=type==='A'?FR.A:FR.B; return {x:n.x,y:1.4,z:n.z}; }
  function laneBlocked(){                               // is the player standing in the throwing lane?
    const ax=FR.A.x,az=FR.A.z,dx=FR.B.x-ax,dz=FR.B.z-az,L2=dx*dx+dz*dz;
    const s=((player.x-ax)*dx+(player.z-az)*dz)/L2;
    if(s<0.12||s>0.88)return false;
    return Math.hypot(player.x-(ax+dx*s),player.z-(az+dz*s))<2.4;
  }
  function throwDisc(from,to,sail){
    const fp=discHand(from),tp=discHand(to);
    if(sail){ const dx=tp.x-fp.x,dz=tp.z-fp.z,d=Math.hypot(dx,dz)||1;   // overshoot past the catcher
      tp.x+=dx/d*4.4; tp.z+=dz/d*4.4; tp.y=1.0; }
    DISC.flight={fp,tp,from,to,sail,t:0,dur:2.7,arc:2.3,bank:Math.random()<0.5?-1:1};
    DISC.holder=null;
    const thr=from==='A'?DISC.A:DISC.B; thr._faceX=tp.x; thr._faceZ=tp.z; thr._windT=0.45;
    sDiscThrow();
  }

  function updFrisbee(dt,t){
    const A=DISC.A,B=DISC.B;
    // facing + sidearm wind-up + catcher reach (applied after framework's updateNPC)
    for(const npc of [A,B]){
      if(npc._faceX!==undefined){ const yaw=Math.atan2(npc._faceX-npc.home.x,npc._faceZ-npc.home.z);
        npc.group.rotation.y=lerpAngle(npc.group.rotation.y,yaw,1-Math.exp(-8*dt)); }
      const winding=npc._windT>0, reaching=!winding&&npc._reachT>0;
      if(winding){ npc._windT-=dt; const w=clamp(npc._windT/0.45,0,1);
        npc.group.rotation.z=Math.sin(w*Math.PI)*0.22;              // torso coil
        npc.parts.armR.rotation.x=-1.9*(1-w);                       // sweep forward on release
        npc.parts.armR.rotation.z=0.5*w; }
      else if(reaching){ npc._reachT-=dt; npc.parts.armR.rotation.x=-1.95; npc.parts.armR.rotation.z=0.1; }
      else npc.parts.armR.rotation.z+=(0.25-npc.parts.armR.rotation.z)*Math.min(1,dt*8);
    }

    const f=DISC.flight;
    if(f){
      f.t+=dt; const s=clamp(f.t/f.dur,0,1);
      disc.position.set(lerp(f.fp.x,f.tp.x,s),
        lerp(f.fp.y,f.tp.y,s)+f.arc*4*s*(1-s)+Math.sin(s*Math.PI*2)*0.12,   // arc + float wobble
        lerp(f.fp.z,f.tp.z,s));
      disc.rotation.y+=16*dt;                                      // fast spin
      disc.rotation.x=0.05+Math.sin(t*4)*0.05*f.bank;              // nose + bank
      disc.rotation.z=Math.sin(t*3.2)*0.10*f.bank;                 // banking wobble
      const catcher=f.to==='A'?A:B;
      if(!f.sail&&s>0.55)catcher._reachT=0.18;                     // arm goes up as it nears
      if(s>=1){
        if(f.sail){                                                // sailed past — jog it down
          disc.position.set(f.tp.x,0.14,f.tp.z); disc.rotation.set(0,disc.rotation.y,0.4);
          DISC.rally=0; DISC.jogger=catcher; DISC.carrying=false; DISC.phase='pickup';
          catcher.say(Math.random()<0.5?'nice toss!':'ope — wind got it',2.2);
          DISC.flight=null;
        }else{                                                     // clean catch
          sDiscCatch(); DISC.rally++;
          state.bests.discRally=Math.max(state.bests.discRally||0,DISC.rally);
          DISC.holder=f.to; DISC.phase='play'; DISC.waitT=0.7+Math.random()*0.6;
          const hp=discHand(f.to); disc.position.set(hp.x,hp.y,hp.z); disc.rotation.set(0,0,0);
          DISC.flight=null;
        }
      }
      return;
    }

    if(DISC.phase==='pickup'){                                     // catcher jogs after the sailed disc
      const c=DISC.jogger,g=c.group;
      if(!DISC.carrying){
        let dx=disc.position.x-g.position.x,dz=disc.position.z-g.position.z,d=Math.hypot(dx,dz);
        c.sp=2.6;
        if(d>0.7){ const step=Math.min(d,3.2*dt); g.position.x+=dx/d*step; g.position.z+=dz/d*step;
          g.rotation.y=lerpAngle(g.rotation.y,Math.atan2(dx,dz),1-Math.exp(-8*dt)); }
        else DISC.carrying=true;
      }else{
        let hx=c.home.x-g.position.x,hz=c.home.z-g.position.z,hd=Math.hypot(hx,hz);
        c.sp=2.6; disc.position.set(g.position.x,1.35,g.position.z); disc.rotation.set(0,0,0);
        if(hd>0.4){ const step=Math.min(hd,3.2*dt); g.position.x+=hx/hd*step; g.position.z+=hz/hd*step;
          g.rotation.y=lerpAngle(g.rotation.y,Math.atan2(hx,hz),1-Math.exp(-8*dt)); }
        else{ g.position.set(c.home.x,0,c.home.z); c.sp=0;
          DISC.holder=(c===A?'A':'B'); DISC.phase='play'; DISC.waitT=0.9;
          disc.position.set(discHand(DISC.holder).x,1.4,discHand(DISC.holder).z); }
      }
      return;
    }

    // phase 'play' — disc rests in the holder's hand; throw once the lane's clear
    disc.position.set(discHand(DISC.holder).x,1.4,discHand(DISC.holder).z); disc.rotation.set(0,0,0);
    if(laneBlocked()){
      DISC.blockedT-=dt;
      if(DISC.blockedT<=0){ (DISC.holder==='A'?A:B).say('heads up!',1.4); DISC.blockedT=1.9; }
      return;
    }
    DISC.waitT-=dt;
    if(DISC.waitT<=0){
      const from=DISC.holder,to=from==='A'?'B':'A'; DISC.throwN++;
      throwDisc(from,to,DISC.throwN%5===0);
    }
  }

  // ================================================================== //
  //  4) THE CHICAGO HANDSHAKE  (upper terrace at the rocks)
  // ================================================================== //
  const HX=150,HZ=195;                                // Belmont Rocks (top terrace, h~0; nudged from 152 so NPC+cooler sit on ground)
  const hsNPC=makeNPC({x:HX,z:HZ,ry:0,palette:{suit:0x18b8a0,pants:0xf2c94c,skin:0xd8a070,hair:0x241a12,face:true},   // setFace at runtime → keep live eyes
    name:'regular',lines:["pull up a rock","beautiful day for it, eh","you ever had Malört?","welcome to the rocks"]});
  const cooler=new THREE.Mesh(new THREE.BoxGeometry(0.72,0.46,0.52),toon(0xd0392f));cooler.position.set(HX+1.3,0.23,HZ+0.4);scene.add(cooler);
  const coolerLid=new THREE.Mesh(new THREE.BoxGeometry(0.76,0.1,0.56),toon(0xeceae2));coolerLid.position.set(HX+1.3,0.51,HZ+0.4);scene.add(coolerLid);
  const can=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.11,0.32,12),bmat(0xffffff,{map:oldStyleTex()}));
  const HS={busy:false,cool:0};
  const hsInter=addInteraction({x:HX,z:HZ+1.5,r:2.2,label:'the Chicago handshake?',onUse:()=>{
    if(HS.busy||HS.cool>0)return; HS.busy=true;
    hsNPC.setFace('happy'); hsNPC.say('here — the Chicago handshake',2.4);
    can.position.set(0,0.15,0); can.rotation.set(0,0,0); holdItem(can); sCrack();   // the ceremony: an Old Style FIRST...
    setTimeout(()=>{                                  // ...then the shared swig (the Malört).
      state.handshakes=(state.handshakes||0)+1;
      pourMalort({npc:hsNPC, react:'it grows on ya', toastMain:'IT GROWS ON YOU', toastSub:"Jeppson's Malört",
        onDone:()=>{ HS.busy=false; HS.cool=60; hsInter.setLabel('walk it off...'); }});
    },1500);
  }});
  function updHandshake(dt){ if(HS.cool>0){ HS.cool-=dt; if(HS.cool<=0)hsInter.setLabel('the Chicago handshake?'); } }

  // ---------------------------- per-frame ---------------------------- //
  registerUpdate((dt,t)=>{ updCart(dt); updGulls(dt); updGoose(dt,t); updFrisbee(dt,t); updHandshake(dt); });

  // kick off the frisbee demo loop
  disc.position.set(FR.A.x,1.4,FR.A.z);
});
