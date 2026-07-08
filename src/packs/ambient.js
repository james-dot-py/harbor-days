// =====================================================================
//  AMBIENT — Chicago north-side life around the harbor:
//    1) the Brown Line 'L' (elevated track, columns, Belmont platform,
//       a passing 4-car train that stops + door-chimes + announces)
//    2) Wrigley Field presence to the NW (light towers, skyglow, CUBS
//       WIN events: roar + organ riff + west-treeline fireworks + a 'W'
//       flag on the yacht-club pole)
//    3) Air & Water Show rehearsal (4 jets sweeping south, contrails,
//       doppler whoosh)
//    4) The Rat Hole (pay-respects shrine by the garden trail)
//    5) boat nameplates on the slip + lake sailboats
//  All setup runs in onWorldReady; all audio is synthesized + guarded on
//  getAudioCtx().actx. The L is a backdrop just W of the LSD berm (x ~ -8,
//  outside the world clamp), running the full map z range.
// =====================================================================
import { onWorldReady, registerUpdate, addInteraction, toast, journalSection, state, getAudioCtx } from '../framework.js';
import * as THREE from 'three';
import { scene, toon, bmat, curveMat, glowTex, rng, rand, clamp, hexRGB, WATER_Y, game } from '../core.js';
import { burst, DUST, scheduled } from '../fx.js';
import * as CH from '../data/chicago.js';
import { activeCell } from '../cells.js';

// ---- fixed track geometry (world coords) ----
const TRACK_X = -8;           // centre of the elevated structure, just W of the LSD berm (outside the world clamp)
const DECK_TOP = 7.6;         // top of the track deck
const CAR_Y = DECK_TOP + 1.6; // car centre height
const PLATFORM_Z = 105;       // Belmont platform stub, aligned with the Belmont underpass (moved to z 105)
const Z_N = -846, Z_S = 316;  // north / south ends — the full map z range (matches the LSD berm)

// ---- module runtime handles (built in onWorldReady) ----
let TRAIN = null, JETS = null, WRIG = null, WRIG_GRP = null;
let audio = null;             // persistent train-rumble nodes (built lazily)

// =====================================================================
//  canvas textures
// =====================================================================
function fitText(g, text, max, weight, family){
  let fs = 60; g.font = `${weight} ${fs}px ${family}`;
  while (g.measureText(text).width > max && fs > 10){ fs -= 2; g.font = `${weight} ${fs}px ${family}`; }
  return fs;
}
function belmontTex(){
  const cv=document.createElement('canvas');cv.width=512;cv.height=128;const g=cv.getContext('2d');
  g.fillStyle='#123a72';g.fillRect(0,0,512,128);                       // CTA navy
  g.fillStyle='#0d2c58';g.fillRect(0,0,512,18);g.fillRect(0,110,512,18);
  g.fillStyle='#ffffff';g.textAlign='center';g.textBaseline='middle';
  fitText(g,'BELMONT',450,'800','"Trebuchet MS",sans-serif');
  g.fillText('BELMONT',256,58);
  g.font='600 20px "Trebuchet MS",sans-serif';g.fillStyle='#9fc3f0';g.fillText('BROWN LINE',256,96);
  const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return t;
}
function wFlagTex(){
  const cv=document.createElement('canvas');cv.width=256;cv.height=192;const g=cv.getContext('2d');
  g.fillStyle='#ffffff';g.fillRect(0,0,256,192);
  g.strokeStyle='#0e3386';g.lineWidth=6;g.strokeRect(6,6,244,180);
  g.fillStyle='#0e3386';g.textAlign='center';g.textBaseline='middle';
  g.font='800 150px "Trebuchet MS",sans-serif';g.fillText('W',128,104);
  return new THREE.CanvasTexture(cv);
}
function ratTex(){
  const cv=document.createElement('canvas');cv.width=256;cv.height=320;const g=cv.getContext('2d');
  // concrete slab
  g.fillStyle='#b7b3aa';g.fillRect(0,0,256,320);
  for(let i=0;i<900;i++){g.fillStyle=`rgba(${90+Math.random()*90|0},${90+Math.random()*90|0},${88+Math.random()*80|0},0.14)`;g.fillRect(Math.random()*256,Math.random()*320,2,2);}
  g.strokeStyle='#8f8b82';g.lineWidth=3;g.strokeRect(6,6,244,308);
  // cartoon-cute splayed rat imprint
  g.fillStyle='#2c2b29';g.strokeStyle='#2c2b29';g.lineCap='round';g.lineJoin='round';
  g.lineWidth=15;                                                     // 4 splayed legs
  const legs=[[128,168,58,120],[128,168,198,120],[128,196,66,236],[128,196,190,236]];
  for(const[x0,y0,x1,y1]of legs){g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();
    g.beginPath();g.arc(x1,y1,15,0,7);g.fill();}
  g.beginPath();g.ellipse(128,176,50,66,0,0,7);g.fill();             // body
  g.beginPath();g.arc(128,104,32,0,7);g.fill();                       // head
  g.beginPath();g.arc(107,80,13,0,7);g.fill();g.beginPath();g.arc(149,80,13,0,7);g.fill(); // ears
  g.lineWidth=11;g.beginPath();g.moveTo(128,238);g.quadraticCurveTo(226,258,214,300);g.stroke(); // tail
  g.fillStyle='#efe9dd';g.beginPath();g.arc(120,100,5,0,7);g.fill();g.beginPath();g.arc(140,100,5,0,7);g.fill(); // eyes
  return new THREE.CanvasTexture(cv);
}
// atlas of boat names — one cell per boat, merged into a single draw call
const BOAT_NAMES=['Second City','Nauti by Nature','Dibs','The Lake Effect','Malört Face','Deep Dish','Windy Citizen','Grabowski','Sweet Home','Lincoln Parked','Ope-n Water','Wrigley Wave'];
const ATLAS_COLS=4, ATLAS_ROWS=4, CELL_W=256, CELL_H=72;
function namesAtlasTex(names){
  const cv=document.createElement('canvas');cv.width=CELL_W*ATLAS_COLS;cv.height=CELL_H*ATLAS_ROWS;const g=cv.getContext('2d');
  g.clearRect(0,0,cv.width,cv.height);
  names.forEach((nm,i)=>{
    const col=i%ATLAS_COLS,row=(i/ATLAS_COLS)|0,ox=col*CELL_W,oy=row*CELL_H;
    g.fillStyle='#f6f1e6';g.beginPath();g.roundRect(ox+6,oy+8,CELL_W-12,CELL_H-16,14);g.fill();
    g.strokeStyle='#c9b79a';g.lineWidth=4;g.stroke();
    g.fillStyle='#2c2f3a';g.textAlign='center';g.textBaseline='middle';
    fitText(g,nm,CELL_W-38,'700','"Trebuchet MS",sans-serif');
    g.fillText(nm,ox+CELL_W/2,oy+CELL_H/2);
  });
  const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return t;
}

// =====================================================================
//  1) THE L — track, columns, Belmont platform, train
// =====================================================================
function buildTrack(){
  const steel=toon(0x39423a);                                         // dark green-brown
  const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3();
  // ---- continuous deck (one long thin box) + twin rails ----
  const zLen=Z_S-Z_N, zc=(Z_S+Z_N)/2, zSeg=Math.round(zLen/4);      // depth-segment so the deck follows the world curve
  const deck=new THREE.Mesh(new THREE.BoxGeometry(5,0.6,zLen,1,1,zSeg),steel);deck.position.set(TRACK_X,DECK_TOP-0.3,zc);scene.add(deck);
  const rails=new THREE.InstancedMesh(new THREE.BoxGeometry(0.24,0.16,zLen,1,1,zSeg),toon(0x6b5b4a),2);
  [-1.25,1.25].forEach((dx,i)=>{M.compose(V.set(TRACK_X+dx,DECK_TOP+0.08,zc),Q.identity(),S.set(1,1,1));rails.setMatrixAt(i,M);});
  rails.instanceMatrix.needsUpdate=true;scene.add(rails);
  // ---- columns: two posts per bent, instanced ----
  const zs=[];for(let z=Z_N+6;z<=Z_S-6;z+=9)zs.push(z);
  const posts=new THREE.InstancedMesh(new THREE.BoxGeometry(0.55,DECK_TOP-0.6,0.55),steel,zs.length*2);
  let pi=0;for(const z of zs)for(const dx of[-2,2]){M.compose(V.set(TRACK_X+dx,(DECK_TOP-0.6)/2,z),Q.identity(),S.set(1,1,1));posts.setMatrixAt(pi++,M);}
  posts.instanceMatrix.needsUpdate=true;scene.add(posts);

  // ---- Belmont platform stub (east side, faces the park) ----
  const px=TRACK_X+3.3;
  const pdeck=new THREE.Mesh(new THREE.BoxGeometry(3.4,0.4,18),toon(0x9a938a));pdeck.position.set(px,DECK_TOP-0.2,PLATFORM_Z);scene.add(pdeck);
  const canopy=new THREE.Mesh(new THREE.BoxGeometry(4.0,0.22,18),toon(0x2f6fb0));canopy.position.set(px,DECK_TOP+2.7,PLATFORM_Z);scene.add(canopy);
  const cposts=new THREE.InstancedMesh(new THREE.BoxGeometry(0.16,2.8,0.16),toon(0x4a4a4a),4);
  let ci=0;for(const cx of[px-1.5,px+1.5])for(const cz of[PLATFORM_Z-8,PLATFORM_Z+8]){M.compose(V.set(cx,DECK_TOP+1.2,cz),Q.identity(),S.set(1,1,1));cposts.setMatrixAt(ci++,M);}
  cposts.instanceMatrix.needsUpdate=true;scene.add(cposts);
  // BELMONT sign — east face, readable from the park
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(5,1.25),bmat(0xffffff,{map:belmontTex(),side:THREE.DoubleSide}));
  sign.position.set(px+1.75,DECK_TOP+1.7,PLATFORM_Z);sign.rotation.y=Math.PI/2;scene.add(sign);
  // NOTE: the 'FUTURE ENTRANCE' gag now lives on the LSD underpass portals
  // (data/chicago.js SIGNS) — the Belmont portal sits at the moved underpass
  // (z 105), so the platform carries NO duplicate sign (exactly one instance).
}

function buildTrain(){
  const grp=new THREE.Group();grp.visible=false;scene.add(grp);
  const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(1,1,1),V=new THREE.Vector3(),E=new THREE.Euler();
  const pitch=14.2, carLen=13, nCar=4, off=(nCar-1)/2;               // centre the rake
  // car bodies (silver, brown belt baked as a second strip)
  const bodies=new THREE.InstancedMesh(new THREE.BoxGeometry(2.6,3.0,carLen),toon(0xc4c8ce),nCar);
  const belts=new THREE.InstancedMesh(new THREE.BoxGeometry(2.66,0.5,carLen),toon(0x7a4a38),nCar);
  for(let i=0;i<nCar;i++){const z=(i-off)*pitch;
    M.compose(V.set(0,0,z),Q.identity(),S);bodies.setMatrixAt(i,M);
    M.compose(V.set(0,-0.55,z),Q.identity(),S);belts.setMatrixAt(i,M);}
  bodies.instanceMatrix.needsUpdate=belts.instanceMatrix.needsUpdate=true;grp.add(bodies,belts);
  // glowing warm windows, both sides
  const wins=new THREE.InstancedMesh(new THREE.PlaneGeometry(0.85,0.95),bmat(0xffd9a0,{side:THREE.DoubleSide}),nCar*4*2);
  let wi=0;for(let i=0;i<nCar;i++){const cz=(i-off)*pitch;for(const s of[1,-1]){E.set(0,s>0?Math.PI/2:-Math.PI/2,0);Q.setFromEuler(E);
    for(let w=0;w<4;w++){M.compose(V.set(s*1.32,0.35,cz+(w-1.5)*3.0),Q,S);wins.setMatrixAt(wi++,M);}}}
  wins.instanceMatrix.needsUpdate=true;grp.add(wins);Q.identity();
  // red marker lights at both ends
  const half=off*pitch+carLen/2;
  const lights=new THREE.InstancedMesh(new THREE.BoxGeometry(0.32,0.32,0.24),bmat(0xff2a2a),4);
  let li=0;for(const ez of[half,-half])for(const dx of[-0.85,0.85]){M.compose(V.set(dx,-0.7,ez),Q.identity(),S);lights.setMatrixAt(li++,M);}
  lights.instanceMatrix.needsUpdate=true;grp.add(lights);

  TRAIN={grp,z:Z_N,dir:1,lastDir:-1,phase:'idle',wait:0,decel:42,accel:42,cruise:17,
    stopped:false,dwellT:0,dwellDur:6,curSpeed:0,moving:false,counted:false,
    startZ:Z_N,endZ:Z_S,stopsSinceSpeech:2};
}
function spawnTrain(){
  const T=TRAIN;T.dir=T.lastDir=-T.lastDir;                          // alternate N/S
  T.startZ=T.dir>0?Z_N:Z_S;T.endZ=T.dir>0?Z_S:Z_N;
  T.z=T.startZ;T.stopped=false;T.counted=false;T.phase='run';T.grp.visible=true;
}
function onTrainStop(player){
  doorChime();
  const dx=player.x-TRACK_X,dz=player.z-PLATFORM_Z,dist=Math.hypot(dx,dz);
  TRAIN.stopsSinceSpeech++;
  if(TRAIN.stopsSinceSpeech>=3 && dist<45 && typeof speechSynthesis!=='undefined'){
    try{const u=new SpeechSynthesisUtterance('This is Belmont. Doors open on the right, at Belmont.');
      u.rate=1.0;u.volume=0.5;const vs=speechSynthesis.getVoices();if(vs&&vs.length)u.voice=vs[0];
      speechSynthesis.speak(u);TRAIN.stopsSinceSpeech=0;}catch(e){}
  }
}
function updTrain(dt,t,player){
  const T=TRAIN;
  if(T.phase==='idle'){T.wait-=dt;if(T.wait<=0)spawnTrain();return;}
  const dir=T.dir;let sp=0;
  if(T.phase==='run'){
    const toPlat=(PLATFORM_Z-T.z)*dir;
    sp=toPlat>T.decel?T.cruise:T.cruise*clamp(toPlat/T.decel,0.02,1);
    T.z+=dir*sp*dt;
    if((PLATFORM_Z-T.z)*dir<=0.15){T.z=PLATFORM_Z;T.phase='dwell';T.dwellT=T.dwellDur;sp=0;onTrainStop(player);}
  }else if(T.phase==='dwell'){
    T.dwellT-=dt;if(T.dwellT<=0)T.phase='depart';
  }else if(T.phase==='depart'){
    const fromPlat=(T.z-PLATFORM_Z)*dir;
    sp=T.cruise*clamp(fromPlat/T.accel+0.06,0.06,1);
    T.z+=dir*sp*dt;
    if((T.endZ-T.z)*dir<=0){T.grp.visible=false;T.phase='idle';T.wait=nextTrainWait();T.curSpeed=0;T.moving=false;return;}
  }
  T.curSpeed=sp;T.moving=(T.phase==='run'||T.phase==='depart');
  T.grp.position.set(TRACK_X,CAR_Y,T.z);
  // trains-watched: count once per pass while player is near the track
  if(T.moving&&!T.counted&&Math.abs(player.x-TRACK_X)<40){T.counted=true;state.trainsWatched=(state.trainsWatched||0)+1;}
  // audio: rumble by 1/distance + rhythmic clack while moving
  if(audio){
    const d=Math.hypot(player.x-TRACK_X,player.z-T.z);
    const near=clamp(1-d/80,0,1);
    const tgt=(T.moving&&d<80)?near*near*0.16*clamp(sp/T.cruise,0,1):0;
    const g=audio.rumbleGain.gain;g.value+=(tgt-g.value)*Math.min(1,dt*6);
    if(T.moving&&d<70){T.clackT=(T.clackT||0)-dt;
      if(T.clackT<=0){T.clackT=clamp(3/(sp+0.1),0.18,1.4);audio.noiseHit(audio.actx.currentTime,0.045,'bandpass',170+rng()*50,1.3,0.05*near);}
    }
  }
}
function nextTrainWait(){return TRAIN._fast?8+rng()*4:75+rng()*45;}

// =====================================================================
//  2) WRIGLEY — light towers, skyglow, CUBS WIN events, 'W' flag
// =====================================================================
function buildWrigley(){
  const grp=new THREE.Group();scene.add(grp);WRIG_GRP=grp;   // hidden while the real Wrigleyville cell is active
  const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(1,1,1),V=new THREE.Vector3(),E=new THREE.Euler();
  const poleSpots=[[-57,-426,34],[-66,-430,39],[-75,-417,37],[-84,-422,33],[-62,-411,40],[-80,-409,36]]; // x,z,h — NW backdrop (~ -70,-420, W of Addison)
  const poles=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.45,0.6,1,7),toon(0x4a4f57),poleSpots.length);
  poleSpots.forEach((p,i)=>{M.compose(V.set(p[0],p[2]/2,p[1]),Q.identity(),S.set(1,p[2],1));poles.setMatrixAt(i,M);});
  poles.instanceMatrix.needsUpdate=true;grp.add(poles);
  // glowing light banks (face east toward the park)
  E.set(0,Math.PI/2,0);Q.setFromEuler(E);
  const banks=new THREE.InstancedMesh(new THREE.PlaneGeometry(7.5,3.6),bmat(0xfff0c0,{side:THREE.DoubleSide}),poleSpots.length);
  poleSpots.forEach((p,i)=>{M.compose(V.set(p[0]+0.5,p[2]+1.0,p[1]),Q,S.set(1,1,1));banks.setMatrixAt(i,M);});
  banks.instanceMatrix.needsUpdate=true;grp.add(banks);Q.identity();
  // soft warm skyglow behind the cluster
  const glowM=curveMat(new THREE.MeshBasicMaterial({map:glowTex,color:0xffe6ae,transparent:true,opacity:0.5,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(190,84),glowM);glow.position.set(-73,34,-420);glow.rotation.y=Math.PI/2;grp.add(glow);

  // 'W' flag on the yacht-club burgee pole (compute world pole position)
  const Y=CH.YACHT_CLUB,c=Math.cos(Y.ry),s=Math.sin(Y.ry);
  const lx=Y.body.w/2-0.4,lz=Y.body.d/2-0.4;
  const wx=Y.pos[0]+(lx*c+lz*s),wz=Y.pos[2]+(-lx*s+lz*c);
  const flagGrp=new THREE.Group();flagGrp.position.set(wx,0,wz);flagGrp.rotation.y=Y.ry;scene.add(flagGrp);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.4,0.95),bmat(0xffffff,{map:wFlagTex(),side:THREE.DoubleSide}));
  flag.position.set(0.72,3.8,0);flag.visible=false;flagGrp.add(flag);

  WRIG={winT:0,roarT:60,flag,flagT:0,flagDur:60,flagLo:3.8,flagHi:6.7,_fast:false};
}
function cubsWin(player){
  roar(5.0,0.18);organRiff();
  state.cubsWins=(state.cubsWins||0)+1;
  toast('CUBS WIN','somewhere west, 40,000 people hug');
  // 3-4 distant bursts over the west treeline, staggered via the fx scheduler
  const cols=[0x0e3386,0xffffff,0xcc3433,0xffe08a];
  const n=3+(rng()*2|0);
  for(let k=0;k<n;k++)scheduled.push({t:game.tNow+0.2+k*0.7,fn:()=>{
    burst(-58+rand(-3,3),15+rand(-2,4),player.z+rand(-22,22),150,11,hexRGB(cols[k%cols.length]),1.5,2.8,3,0.9);
  }});
  WRIG.flagT=WRIG.flagDur;WRIG.flag.visible=true;
}
function updWrig(dt,t,player){
  const W=WRIG;
  // the gag backdrop is the FAKE Wrigley — hide it (and pause its events)
  // while the player is in the real Wrigleyville cell
  const away=activeCell()!=='lakefront';
  if(WRIG_GRP)WRIG_GRP.visible=!away;
  if(away)return;
  W.winT-=dt;
  if(W.winT<=0){cubsWin(player);W.winT=W._fast?25+rng()*20:240+rng()*180;}
  else{W.roarT-=dt;if(W.roarT<=0){roar(2.6,0.045);W.roarT=90+rng()*40;}}
  if(W.flagT>0){
    W.flagT-=dt;
    const up=clamp((W.flagDur-W.flagT)/1.6,0,1),down=W.flagT<1.6?clamp(W.flagT/1.6,0,1):1;
    const h=Math.min(up,down);
    W.flag.position.y=W.flagLo+(W.flagHi-W.flagLo)*h;
    W.flag.visible=h>0.02;
    if(W.flag.visible)W.flag.rotation.z=Math.sin(t*2.2)*0.05;
  }else W.flag.visible=false;
}

// =====================================================================
//  3) AIR & WATER SHOW — 4 jets sweep south over the lake
// =====================================================================
const JET_OFF=[[0,0,6],[-5,0,-2],[5,0,-2],[0,0,-9]];                  // diamond (local, +z = travel)
function buildJets(){
  const grp=new THREE.Group();grp.visible=false;scene.add(grp);
  const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(1,1,1),V=new THREE.Vector3(),E=new THREE.Euler();
  const dark=toon(0x2a2e33);
  const bodies=new THREE.InstancedMesh(new THREE.ConeGeometry(0.55,4.0,8),dark,4);
  const wings=new THREE.InstancedMesh(new THREE.BoxGeometry(3.0,0.14,1.0),dark,8);
  E.set(Math.PI/2,0,0);const qFwd=new THREE.Quaternion().setFromEuler(E);                 // cone tip -> +z
  let bi=0,wi=0;
  for(const o of JET_OFF){
    M.compose(V.set(o[0],o[1],o[2]),qFwd,S);bodies.setMatrixAt(bi++,M);
    for(const sw of[-1,1]){E.set(0,sw*0.5,0);Q.setFromEuler(E);M.compose(V.set(o[0]+sw*1.5,o[1],o[2]-0.4),Q,S.set(1,1,1));wings.setMatrixAt(wi++,M);}
  }
  bodies.instanceMatrix.needsUpdate=wings.instanceMatrix.needsUpdate=true;grp.add(bodies,wings);
  JETS={grp,phase:'idle',wait:0,z:0,z0:-820,z1:412,x:100,y:45,speed:70,trailT:0,whooshed:false,prevCross:0,seenToast:false,_fast:false};
}
function spawnJets(player){
  const J=JETS;J.z=J.z0;J.grp.visible=true;J.whooshed=false;J.grp.rotation.z=0;J.phase='fly';
  J.prevCross=J.z-player.z;
  state.jetsSeen=(state.jetsSeen||0)+1;
  if(!J.seenToast){toast('AIR & WATER SHOW','rehearsal day');J.seenToast=true;}
}
function updJets(dt,t,player){
  const J=JETS;
  if(J.phase==='idle'){J.wait-=dt;if(J.wait<=0)spawnJets(player);return;}
  J.z+=J.speed*dt;
  const prog=clamp((J.z-J.z0)/(J.z1-J.z0),0,1),bank=prog>0.7?(prog-0.7)/0.3:0;
  J.grp.position.set(J.x,J.y+bank*bank*22,J.z);
  J.grp.rotation.z=-bank*0.7;
  // contrail puffs behind each jet
  J.trailT-=dt;
  if(J.trailT<=0){J.trailT=0.05;const cy=J.y+bank*bank*22;
    for(const o of JET_OFF)DUST.spawn(J.x+o[0],cy+o[1]+0.1,J.z+o[2]-2.2,rand(-0.3,0.3),rand(-0.2,0.3),rand(-1,-0.4),1,1,1,1.3,2.2,0,1.1);}
  // doppler whoosh at closest approach (lead crosses the player's latitude)
  const cross=J.z-player.z;
  if(J.prevCross<0&&cross>=0&&!J.whooshed){J.whooshed=true;jetWhoosh(clamp(1-Math.abs(J.x-player.x)/120,0.05,1));}
  J.prevCross=cross;
  if(J.z>J.z1){J.grp.visible=false;J.phase='idle';J.wait=J._fast?10+rng()*6:180+rng()*120;}
}

// =====================================================================
//  4) THE RAT HOLE — pay-respects shrine by the garden trail
// =====================================================================
function buildRatHole(){
  const rx=45,rz=-90;   // inner park, ~2 m W of TRAIL_MAIN (path centre ~x49 here)
  const slab=new THREE.Mesh(new THREE.PlaneGeometry(2.4,3.2),bmat(0xffffff,{map:ratTex(),side:THREE.DoubleSide}));
  slab.rotation.x=-Math.PI/2;slab.position.set(rx,0.055,rz);scene.add(slab);
  // 3 gold coins (instanced) + an orange cheese wedge, in/around the imprint
  const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(1,1,1),V=new THREE.Vector3(),E=new THREE.Euler();
  E.set(Math.PI/2,0,0);const qFlat=new THREE.Quaternion().setFromEuler(E);
  const coins=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.17,0.17,0.05,14),toon(0xf4c430),3);
  const cp=[[rx-0.7,rz-1.0],[rx+0.75,rz-0.6],[rx+0.2,rz+1.2]];
  cp.forEach((p,i)=>{M.compose(V.set(p[0],0.1,p[1]),qFlat,S);coins.setMatrixAt(i,M);});
  coins.instanceMatrix.needsUpdate=true;scene.add(coins);
  const ws=new THREE.Shape();ws.moveTo(0,0);ws.lineTo(0.6,0);ws.lineTo(0,0.5);ws.closePath();
  const cheese=new THREE.Mesh(new THREE.ExtrudeGeometry(ws,{depth:0.5,bevelEnabled:false}),toon(0xffa41b));
  cheese.rotation.x=-Math.PI/2;cheese.position.set(rx-0.9,0.08,rz+0.9);scene.add(cheese);

  addInteraction({x:rx,z:rz,r:2.2,label:'pay respects',onUse:()=>{
    coinClink();toast('RIP THE RAT HOLE','2024, never forgotten');
    state.ratRespects=(state.ratRespects||0)+1;
  }});
}

// =====================================================================
//  5) BOAT NAMEPLATES — merged into one draw call via a names atlas
// =====================================================================
function buildNameplates(){
  // gather boats: 12 slip sailboats (readable from the docks) + 3 lake boats
  const FD=CH.FINGER_DOCKS,plates=[];               // {x,y,z,ry,cell}
  let bi=0;
  for(const zc of FD.rows){
    plates.push({x:FD.boat.xMid-1.1,y:WATER_Y+0.68,z:(zc-FD.boat.dz)+1.35,ry:0,        cell:bi%12});bi++;
    plates.push({x:FD.boat.xMid-1.1,y:WATER_Y+0.68,z:(zc+FD.boat.dz)-1.35,ry:Math.PI, cell:bi%12});bi++;
  }
  const lake=[[CH.BOATS[0].x,CH.BOATS[0].z,3],[CH.BOATS[1].x,CH.BOATS[1].z,10],[CH.DRIFTER.x,CH.DRIFTER.z,11]];
  for(const[lx,lz,cell]of lake)plates.push({x:lx-1.0,y:WATER_Y+0.7,z:lz,ry:-Math.PI/2,cell});

  const hw=0.62,hh=0.16,pos=[],uv=[],idx=[];let v=0;
  const W=CELL_W*ATLAS_COLS,H=CELL_H*ATLAS_ROWS;
  for(const p of plates){
    const c=Math.cos(p.ry),s=Math.sin(p.ry);        // right vector = (cos,0,-sin), up = +y
    const col=p.cell%ATLAS_COLS,row=(p.cell/ATLAS_COLS)|0;
    const uL=col*CELL_W/W,uR=(col+1)*CELL_W/W,vT=1-row/ATLAS_ROWS,vB=1-(row+1)/ATLAS_ROWS;
    const cn=[[-hw,-hh,uL,vB],[hw,-hh,uR,vB],[hw,hh,uR,vT],[-hw,hh,uL,vT]];
    for(const[lxo,lyo,u,vv]of cn){pos.push(p.x+c*lxo,p.y+lyo,p.z-s*lxo);uv.push(u,vv);}
    idx.push(v,v+1,v+2,v,v+2,v+3);v+=4;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(pos),3));
  g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(uv),2));
  g.setIndex(idx);
  const mesh=new THREE.Mesh(g,bmat(0xffffff,{map:namesAtlasTex(BOAT_NAMES),side:THREE.DoubleSide,transparent:true}));
  mesh.frustumCulled=false;scene.add(mesh);
}

// =====================================================================
//  synthesized audio (all guarded on getAudioCtx().actx)
// =====================================================================
function ensureAudio(){
  if(audio)return;
  const ac=getAudioCtx();if(!ac.actx)return;
  const{actx,sfxBus,noiseBuf}=ac;
  const src=actx.createBufferSource();src.buffer=noiseBuf;src.loop=true;
  const filt=actx.createBiquadFilter();filt.type='lowpass';filt.frequency.value=170;filt.Q.value=0.5;
  const g=actx.createGain();g.gain.value=0;
  src.connect(filt);filt.connect(g);g.connect(sfxBus);src.start();
  audio={actx,sfxBus,rumbleGain:g,noiseHit:ac.noiseHit};
}
function doorChime(){
  const ac=getAudioCtx();if(!ac.actx)return;const{actx,sfxBus}=ac,t=actx.currentTime;
  [[988,0],[784,0.18]].forEach(([f,dl])=>{const o=actx.createOscillator(),g=actx.createGain();
    o.type='sine';o.frequency.value=f;
    g.gain.setValueAtTime(0.0001,t+dl);g.gain.linearRampToValueAtTime(0.13,t+dl+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+dl+0.9);
    o.connect(g);g.connect(sfxBus);o.start(t+dl);o.stop(t+dl+1);});
}
function roar(dur,peak){
  const ac=getAudioCtx();if(!ac.actx)return;const{actx,sfxBus,noiseBuf}=ac,t=actx.currentTime;
  const src=actx.createBufferSource();src.buffer=noiseBuf;src.loop=true;
  const f=actx.createBiquadFilter();f.type='bandpass';f.frequency.value=520;f.Q.value=0.4;
  const g=actx.createGain();
  g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(peak,t+dur*0.35);g.gain.linearRampToValueAtTime(peak*0.8,t+dur*0.62);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  src.connect(f);f.connect(g);g.connect(sfxBus);src.start(t);src.stop(t+dur+0.1);
}
function organRiff(){
  const ac=getAudioCtx();if(!ac.actx)return;const{actx,sfxBus,mf}=ac,t0=actx.currentTime;
  const mel=[67,72,71,72,76,74,72,67],dur=[0.19,0.19,0.19,0.19,0.19,0.19,0.19,0.5];
  let t=t0;for(let i=0;i<mel.length;i++){const f=mf(mel[i]),d=dur[i];
    for(const[type,det,g0]of[['square',0,0.05],['square',7,0.04],['triangle',-5,0.05]]){
      const o=actx.createOscillator(),g=actx.createGain();o.type=type;o.frequency.value=f;o.detune.value=det;
      g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(g0,t+0.02);g.gain.setValueAtTime(g0,t+d*0.7);g.gain.exponentialRampToValueAtTime(0.0001,t+d);
      o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+d+0.05);}
    t+=d;}
}
function jetWhoosh(prox){
  const ac=getAudioCtx();if(!ac.actx)return;const{actx,sfxBus,noiseBuf}=ac,t=actx.currentTime;
  const src=actx.createBufferSource();src.buffer=noiseBuf;src.loop=true;
  const f=actx.createBiquadFilter();f.type='bandpass';f.Q.value=0.8;
  f.frequency.setValueAtTime(1400,t);f.frequency.exponentialRampToValueAtTime(320,t+1.4);
  const g=actx.createGain();
  g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.22*prox,t+0.25);g.gain.exponentialRampToValueAtTime(0.0001,t+1.5);
  src.connect(f);f.connect(g);g.connect(sfxBus);src.start(t);src.stop(t+1.6);
}
function coinClink(){
  const ac=getAudioCtx();if(!ac.actx)return;const{actx,sfxBus}=ac,t=actx.currentTime;
  [1750,2300,1500].forEach((f,i)=>{const o=actx.createOscillator(),g=actx.createGain();
    o.type='sine';o.frequency.value=f+Math.random()*140;const t0=t+i*0.09;
    g.gain.setValueAtTime(0.11,t0);g.gain.exponentialRampToValueAtTime(0.0001,t0+0.5);
    o.connect(g);g.connect(sfxBus);o.start(t0);o.stop(t0+0.55);});
}

// =====================================================================
//  wire it all up
// =====================================================================
onWorldReady(player=>{
  const FAST=/[?&]ambientfast=1/.test(location.search);
  buildTrack();buildTrain();buildWrigley();buildJets();buildRatHole();buildNameplates();
  TRAIN._fast=FAST;JETS._fast=FAST;WRIG._fast=FAST;
  TRAIN.wait=FAST?2.5:22+rng()*18;
  JETS.wait =FAST?4  :60+rng()*70;
  WRIG.winT =FAST?5  :100+rng()*120;
  // journal counters
  state.ratRespects=state.ratRespects||0;state.cubsWins=state.cubsWins||0;
  state.jetsSeen=state.jetsSeen||0;state.trainsWatched=state.trainsWatched||0;
  journalSection('chicago','Chicago Things',()=>`
    <div class="jrow"><span>Rat Hole respects</span><b>${state.ratRespects||0}</b></div>
    <div class="jrow"><span>Cubs wins witnessed</span><b>${state.cubsWins||0}</b></div>
    <div class="jrow"><span>Jets seen</span><b>${state.jetsSeen||0}</b></div>
    <div class="jrow"><span>Trains watched</span><b>${state.trainsWatched||0}</b></div>`);

  registerUpdate((dt,t,pl)=>{
    ensureAudio();
    updTrain(dt,t,pl);
    updWrig(dt,t,pl);
    updJets(dt,t,pl);
  });
});
