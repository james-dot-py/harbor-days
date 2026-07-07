// =====================================================================
//  PACK: progression — the collect-a-thon spine + two toys that reward it
//    1. HONORARY STREET SIGNS — 12 brown Chicago honorary blades on slim
//       green posts, a gold glint bobbing over each uncollected one. Walk
//       within 2.2m -> collected (rising chime + toast w/ lore + glint off).
//       journalSection('signs','Honorary Chicago') tracks n/12 + Divvy metres.
//    2. DIVVY NETWORK — FIVE docks (kiosk + sign + rack + 3 racked bikes,
//       all shared InstancedMeshes) across the map: harbor (40,-40), Belmont
//       plaza (24,110), dog beach (80,-330), fieldhouse/golf (92,-452), AIDS
//       Garden (95,145). Grab at ANY dock to MOUNT: a pale-blue bike appears
//       under the mayor (spinning spoked wheels, forward pose). On-trail =
//       fast (x1.9), off-trail = slow + wobble (x0.8). R = bell. E anywhere =
//       hop off -> the bike slides back to the NEAREST dock. Journal tracks
//       Divvy metres ridden + docks discovered (n/5, first pass within 6 m).
//    3. BOOMBOX RADIO — a chunky 80s boombox on a towel at the rocks
//       (x145 z162). Borrow it (holdItem) and R cycles stations:
//       LOFI (the score) -> WBMX HOUSE -> CHECKERBOARD BLUES -> OFF -> LOFI.
//       Non-LOFI stations duck musicBus to 0 and run an original synth loop
//       through a private radio bus; speaker cones pulse with the beat.
//
//  Only-my-file rules: this module + one import line in packs/index.js. No
//  shared source is edited. Colliders for the sign posts + the 5 dock kiosks
//  are ADDED via props.collide() (documented). Radio ducking uses the exported
//  getAudioCtx().musicBus (no audio.js edit). All gameplay jitter uses
//  Math.random (never the world rng). All audio is synthesized + actx-guarded.
//
//  KEY CHOICES (documented for the reviewer):
//   * R is context: carrying the boombox -> change station (even while riding);
//     else mounted -> ring bell. "Bell yields to radio" per spec.
//   * E while mounted -> dismount only: a high-priority (50) interaction that
//     follows the player suppresses every other E prompt while riding, and the
//     grab interaction is disabled, so E is unambiguous.
//   * speedMult composition with the npcs.js hot-dog buff: my update runs LAST,
//     so I decompose — if nobody else overwrote speedMult since my last write I
//     strip my own factor to recover the external base (1 or the 1.35 buff),
//     then re-apply the bike factor. Never compounds, never clobbers the buff.
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, registerUpdate, addInteraction, holdItem, toast,
         journalSection, state, getAudioCtx } from '../framework.js';
import { scene, camera, toon, bmat, curveMat, glowTex, clamp, game } from '../core.js';
import { mayor, mparts } from '../character.js';
import { collide } from '../props.js';
import { pathSamples } from '../paths.js';
import { coastQuery, tierAt } from '../coast.js';
import { keys } from '../input.js';

// ------------------------------ scratch (no per-frame alloc) -----------
const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1,1,1);
const _dockV = new THREE.Vector3(), _retFrom = new THREE.Vector3();

function groundY(x,z){                    // terrace height (rocks) else park y=0
  const q = coastQuery(x,z);
  if(q && q.lat>0.15){ const t=tierAt(q.lat,q.z); if(t) return t.h; }
  return 0;
}

// ===================================================================== //
//  session state
// ===================================================================== //
state.divvyMeters = state.divvyMeters || 0;

// ===================================================================== //
//  1) HONORARY STREET SIGNS
// ===================================================================== //
// {name, lore, x, z, ry, y0?}  — tied to geography; every zone rewarded.
// Placed on the rebuilt real-scale map (GEOGRAPHY.md / chicago.js). Two spots
// from the brief were nudged onto land: DU SABLE (harbor mouth is open water at
// x125,z-8 — moved to the SW-shore lawn overlooking the mouth) and MONTY & ROSE
// (x92,z-333 is the wet dog-beach slope — moved just west of the gate onto grass).
const SIGNS = [
  { name:'KEITH HARING',                lore:'the garden he would have loved',    x:100, z:112,  ry:-1.9 },
  { name:'MONTY & ROSE',                lore:'the plovers that stopped a fest',   x:82,  z:-333, ry:1.4  },
  { name:'FRANKIE KNUCKLES',            lore:'the Godfather of House',            x:140, z:100,  ry:-1.6 },
  { name:'STEVE GOODMAN',               lore:"he wrote 'Go, Cubs, Go'",           x:38,  z:-235, ry:0.9  },
  { name:'JEAN BAPTISTE POINT DU SABLE',lore:'the founder of Chicago',            x:104, z:-6,   ry:-1.4 },
  { name:'STUDS TERKEL',                lore:'he listened to the whole city',     x:60,  z:-170, ry:-1.6 },
  { name:'DEL CLOSE',                   lore:"the improv guru — 'yes, and'",      x:35,  z:-362, ry:1.4  },
  { name:'ANN SATHER',                  lore:'cinnamon rolls the size of a plate',x:207.5, z:-472, ry:1.6  },
  { name:'HARRY CARAY',                 lore:'Holy Cow!',                         x:26,  z:99,   ry:1.6  },
  { name:'VIVIAN MAIER',                lore:'the nanny with a Rolleiflex',       x:85,  z:-352, ry:0.6  },
  { name:'WAX TRAX! RECORDS',           lore:"Chicago's industrial-dance temple", x:209, z:-104, ry:-1.6, y0:0.42 },
  { name:'IRV KUPCINET',                lore:"'Kup's Column' ran 60 years",       x:95,  z:-418, ry:-1.6 },
];

function bladeTex(name){
  const cv=document.createElement('canvas'); cv.width=512; cv.height=140; const g=cv.getContext('2d');
  g.fillStyle='#5a3d28'; g.fillRect(0,0,512,140);                       // Chicago honorary brown
  g.strokeStyle='#efe6d2'; g.lineWidth=6; g.strokeRect(7,7,498,126);
  g.fillStyle='#f6efe0'; g.textAlign='center'; g.textBaseline='middle';
  g.font='700 24px "Trebuchet MS",sans-serif'; g.fillText('HONORARY',256,30);
  let fs=52; g.font=`800 ${fs}px "Trebuchet MS",sans-serif`;
  while(g.measureText(name).width>478 && fs>18){ fs-=2; g.font=`800 ${fs}px "Trebuchet MS",sans-serif`; }
  g.fillText(name,256,74);
  g.font='700 24px "Trebuchet MS",sans-serif'; g.fillText('WAY',256,116);
  const t=new THREE.CanvasTexture(cv); t.anisotropy=4; return t;
}

let glintMesh=null;
function buildSigns(){
  // one shared InstancedMesh for all 12 slim green posts
  const posts=new THREE.InstancedMesh(new THREE.BoxGeometry(0.09,2.4,0.09),toon(0x2f7d4f),SIGNS.length);
  SIGNS.forEach((s,i)=>{
    const y0=s.y0||0;
    _m.compose(_v.set(s.x,y0+1.2,s.z),new THREE.Quaternion(),_s.set(1,1,1)); posts.setMatrixAt(i,_m);
    // individual brown blade w/ white canvas text (12 draw calls — OK)
    const blade=new THREE.Mesh(new THREE.PlaneGeometry(2.2,0.6),
      curveMat(new THREE.MeshBasicMaterial({map:bladeTex(s.name),side:THREE.DoubleSide})));
    blade.position.set(s.x,y0+2.05,s.z); blade.rotation.y=s.ry; scene.add(blade);
    collide(s.x,s.z,0.35);                                              // bump the post
    s.collected=false; s._gy=y0+2.9;
  });
  posts.instanceMatrix.needsUpdate=true; scene.add(posts);
  // gold glints (billboarded, hidden when collected)
  glintMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(0.42,0.42),
    bmat(0xffe08a,{map:glowTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}),SIGNS.length);
  glintMesh.frustumCulled=false; scene.add(glintMesh);
}

let signCheckT=0;
function updateSigns(dt,player){
  signCheckT-=dt;
  if(signCheckT<=0){
    signCheckT=0.15;
    for(const s of SIGNS){
      if(s.collected)continue;
      const dx=player.x-s.x,dz=player.z-s.z;
      if(dx*dx+dz*dz<2.2*2.2){
        s.collected=true; signChime();
        toast(`HONORARY ${s.name} WAY`, s.lore);
        if(SIGNS.every(g=>g.collected)) toast('HONORARY CHICAGOAN','you know every corner now');
      }
    }
    // docks discovered — cheap n/5 check on the same throttle
    for(const D of DOCKS){
      if(D.discovered)continue;
      const dx=player.x-D.x,dz=player.z-D.z;
      if(dx*dx+dz*dz<6*6){
        D.discovered=true;
        const n=DOCKS.filter(d=>d.discovered).length;
        toast('DIVVY DOCK',`${n} / ${DOCKS.length} on the network`);
      }
    }
  }
}
function updateGlints(t){
  if(!glintMesh)return;
  for(let i=0;i<SIGNS.length;i++){
    const s=SIGNS[i];
    if(s.collected){ _m.compose(_v.set(0,-999,0),camera.quaternion,_s.set(0,0,0)); }
    else{ const bob=Math.sin(t*2.4+i)*0.09, sc=0.9+0.12*Math.sin(t*5+i*1.7);
      _m.compose(_v.set(s.x,s._gy+bob,s.z),camera.quaternion,_s.set(sc,sc,sc)); }
    glintMesh.setMatrixAt(i,_m);
  }
  glintMesh.instanceMatrix.needsUpdate=true;
}

// ===================================================================== //
//  2) DIVVY BIKE
// ===================================================================== //
// FIVE docks — the real Divvy network. Each on grass, >=3 m off the trail
// ribbon, clear of structures/signs (verified by screenshot). Original harbor
// dock kept first; return-to-dock picks the nearest of these.
const DOCKS=[
  {x:40, z:-40 },   // Belmont Harbor west inner park (original)
  {x:24, z:110 },   // Belmont underpass plaza (moved to the z≈105 stop)
  {x:80, z:-330},   // dog beach — on grass west of the cove
  {x:150, z:-436},  // golf/sanctuary corridor — south of the course fence, off the trail crossing
  {x:95, z:145 },   // AIDS Garden south lawn
];
function nearestDock(x,z){
  let best=DOCKS[0],bd=Infinity;
  for(const D of DOCKS){ const dx=D.x-x,dz=D.z-z,d=dx*dx+dz*dz; if(d<bd){bd=d;best=D;} }
  return best;
}
const bike={mounted:false,returning:false,retT:0,group:null,spins:[],wheelA:0,
            onTrail:true,checkT:0,wob:0,bellCd:0,grabs:[],off:null,retDock:DOCKS[0]};

// --- on-trail test: bucket pathSamples into a coarse grid, scan 3x3 ---
const GRID=new Map(), CELL=2.6;
function gkey(cx,cz){return cx+','+cz;}
function buildGrid(){
  for(let i=0;i<pathSamples.length;i++){
    const p=pathSamples[i],cx=Math.floor(p[0]/CELL),cz=Math.floor(p[1]/CELL),k=gkey(cx,cz);
    let a=GRID.get(k); if(!a){a=[];GRID.set(k,a);} a.push(p[0],p[1]);
  }
}
function nearTrail(px,pz){
  const cx=Math.floor(px/CELL),cz=Math.floor(pz/CELL),R2=2.6*2.6;
  for(let ix=cx-1;ix<=cx+1;ix++)for(let iz=cz-1;iz<=cz+1;iz++){
    const a=GRID.get(gkey(ix,iz)); if(!a)continue;
    for(let i=0;i<a.length;i+=2){const dx=a[i]-px,dz=a[i+1]-pz;if(dx*dx+dz*dz<R2)return true;}
  }
  return false;
}

// --- speedMult composition (see header) ---
let _spmBike=1,_spmLast=null;
function setBikeFactor(f){
  let base;
  if(_spmLast!==null && state.speedMult===_spmLast) base=state.speedMult/_spmBike;  // nobody else touched it
  else base=state.speedMult;                                                         // buff (etc.) set a fresh base
  state.speedMult=base*f; _spmBike=f; _spmLast=state.speedMult;
}

// --- geometry: a spinning wheel (torus rim + spokes + hub) ---
function makeWheel(R){
  const orient=new THREE.Group(); orient.rotation.y=Math.PI/2;        // hole axis Z -> bike X (rolls in Z)
  const spin=new THREE.Group(); orient.add(spin);
  spin.add(new THREE.Mesh(new THREE.TorusGeometry(R,0.035,6,16),toon(0x23262b)));
  spin.add(new THREE.Mesh(new THREE.SphereGeometry(0.05,7,6),toon(0x3a3d44)));
  for(let k=0;k<3;k++){const sp=new THREE.Mesh(new THREE.BoxGeometry(0.02,R*1.92,0.02),toon(0x9aa0a6));sp.rotation.z=k*Math.PI/3;spin.add(sp);}
  return {orient,spin};
}
function tubeBetween(a,b,rad,mat){
  const A=new THREE.Vector3(a[0],a[1],a[2]),B=new THREE.Vector3(b[0],b[1],b[2]);
  const d=new THREE.Vector3().subVectors(B,A),len=d.length();
  const m=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad,len,6),mat);
  m.position.copy(A).addScaledVector(d,0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
  return m;
}
function makeRideBike(){
  const g=new THREE.Group(); g.visible=false;
  const blue=toon(0x2b9fd4), R=0.33;
  const wF=makeWheel(R),wB=makeWheel(R);
  wF.orient.position.set(0,R,0.55); wB.orient.position.set(0,R,-0.55);
  g.add(wF.orient,wB.orient); bike.spins=[wF.spin,wB.spin];
  // frame (points in metres, +z forward)
  const BB=[0,0.34,-0.02], seat=[0,0.92,-0.22], head=[0,0.62,0.5], bar=[0,0.9,0.44];
  g.add(tubeBetween(BB,seat,0.028,blue));               // seat tube
  g.add(tubeBetween(BB,head,0.028,blue));               // down tube
  g.add(tubeBetween(seat,bar,0.026,blue));              // top tube
  g.add(tubeBetween(head,[0,R,0.55],0.024,toon(0x3a3d44))); // fork
  g.add(tubeBetween(BB,[0,R,-0.55],0.022,blue));        // chain stay
  g.add(tubeBetween(seat,[0,R,-0.55],0.022,blue));      // seat stay
  g.add(tubeBetween(head,bar,0.024,toon(0x3a3d44)));    // steerer
  const handleb=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.42,6),toon(0x23262b));
  handleb.rotation.z=Math.PI/2; handleb.position.set(0,0.95,0.44); g.add(handleb);
  const seatM=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.06,0.26),toon(0x23262b)); seatM.position.set(0,0.96,-0.22); g.add(seatM);
  const basket=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.2,0.2),toon(0x2b6f9c)); basket.position.set(0,0.74,0.6); g.add(basket);
  scene.add(g); return g;
}
function makeParkedBike(){                              // simple static rack bike (cloned)
  const g=new THREE.Group(); const pale=toon(0x7ec8e8), R=0.3;
  for(const dz of [0.5,-0.5]){
    const w=new THREE.Mesh(new THREE.CylinderGeometry(R,R,0.05,14),toon(0x2a2d33));
    w.rotation.x=Math.PI/2; w.rotation.z=Math.PI/2; w.position.set(0,R,dz); g.add(w);
  }
  g.add(tubeBetween([0,0.32,-0.5],[0,0.86,-0.18],0.026,pale));
  g.add(tubeBetween([0,0.32,-0.5],[0,0.58,0.5],0.026,pale));
  g.add(tubeBetween([0,0.86,-0.18],[0,0.85,0.44],0.024,pale));
  g.add(tubeBetween([0,0.58,0.5],[0,0.9,0.44],0.022,toon(0x3a3d44)));
  const basket=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.18,0.18),toon(0x2b6f9c)); basket.position.set(0,0.72,0.58); g.add(basket);
  return g;
}
function divvyTex(){
  const cv=document.createElement('canvas'); cv.width=256; cv.height=180; const g=cv.getContext('2d');
  g.fillStyle='#0f4d78'; g.fillRect(0,0,256,180);
  g.fillStyle='#ffffff'; g.textAlign='center'; g.textBaseline='middle';
  g.font='900 66px "Trebuchet MS",sans-serif'; g.fillText('DIVVY',128,66);
  g.fillStyle='#8fd6f2'; g.font='700 22px "Trebuchet MS",sans-serif'; g.fillText('grab a bike',128,120);
  const t=new THREE.CanvasTexture(cv); t.anisotropy=4; return t;
}
// Build ALL 5 docks as shared InstancedMeshes so the whole network is ~11 draw
// calls total (fewer than the old single looped dock): 1 deck + 1 kiosk + 1
// sign + 1 rack, plus one per parked-bike component (7 parts x 15 bikes).
function buildDocks(){
  const idQ=new THREE.Quaternion(), N=DOCKS.length;
  const bases =new THREE.InstancedMesh(new THREE.BoxGeometry(4.4,0.12,1.5),toon(0x6b7076),N);
  const kiosks=new THREE.InstancedMesh(new THREE.BoxGeometry(0.5,1.5,0.85),toon(0x0f4d78),N);
  const signs =new THREE.InstancedMesh(new THREE.PlaneGeometry(0.72,0.5),
                 bmat(0xffffff,{map:divvyTex(),side:THREE.DoubleSide,transparent:true}),N);
  const racks =new THREE.InstancedMesh(new THREE.TorusGeometry(0.14,0.03,5,10),toon(0xa6adb4),N*5);
  // one parked-bike template -> a shared InstancedMesh per component
  const tmpl=makeParkedBike(); tmpl.updateMatrixWorld(true);
  const parts=tmpl.children;
  const bikeInst=parts.map(ch=>new THREE.InstancedMesh(ch.geometry,ch.material,N*3));
  const bikeWorld=new THREE.Matrix4(), bikeQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,Math.PI/2,0.1));
  let ri=0,bi=0;
  DOCKS.forEach((D,di)=>{
    const DX=D.x,DZ=D.z,gy=groundY(DX,DZ);
    _m.compose(_v.set(DX,     gy+0.06,DZ     ),idQ,_s.set(1,1,1)); bases.setMatrixAt(di,_m);   // deck
    _m.compose(_v.set(DX-2.5, gy+0.81,DZ     ),idQ,_s.set(1,1,1)); kiosks.setMatrixAt(di,_m);  // kiosk
    collide(DX-2.5,DZ,0.5);
    _m.compose(_v.set(DX-2.5, gy+1.75,DZ+0.44),idQ,_s.set(1,1,1)); signs.setMatrixAt(di,_m);   // DIVVY sign
    for(let i=0;i<5;i++){ _m.compose(_v.set(DX-1.6+i*0.8,gy+0.28,DZ-0.55),idQ,_s.set(1,1,1)); racks.setMatrixAt(ri++,_m); }
    [-1.3,0.1,1.5].forEach(dx=>{                                        // 3 racked bikes / dock
      bikeWorld.compose(_v.set(DX+dx,gy,DZ+0.1),bikeQ,_s.set(1,1,1));
      parts.forEach((ch,ci)=>{ _m.multiplyMatrices(bikeWorld,ch.matrix); bikeInst[ci].setMatrixAt(bi,_m); });
      bi++;
    });
  });
  bases.instanceMatrix.needsUpdate=true;  scene.add(bases);
  kiosks.instanceMatrix.needsUpdate=true; scene.add(kiosks);
  signs.instanceMatrix.needsUpdate=true;  scene.add(signs);
  racks.instanceMatrix.needsUpdate=true;  scene.add(racks);
  for(const im of bikeInst){ im.instanceMatrix.needsUpdate=true; scene.add(im); }
}

function mount(player){
  if(bike.mounted)return;
  bike.mounted=true; bike.returning=false; bike.wheelA=0; bike.wob=0;
  bike.group.visible=true;
  for(const g of bike.grabs) g.enabled=false; bike.off.enabled=true;
  bike.off.x=player.x; bike.off.z=player.z;
  toast("DIVVY'D","R = bell · trail = fast · E = hop off");
}
function dismount(){
  if(!bike.mounted)return;
  bike.mounted=false; bike.returning=true; bike.retT=0;
  _retFrom.copy(bike.group.position);
  bike.retDock=nearestDock(bike.group.position.x,bike.group.position.z);   // slide back to the nearest dock
  // restore rig + speed
  mparts.armL.rotation.z=-0.25; mparts.armR.rotation.z=0.25; mayor.rotation.z=0;
  setBikeFactor(1);
  for(const g of bike.grabs) g.enabled=true; bike.off.enabled=false;
  toast('docked','rolled back to the nearest dock');
}
function bikePose(){
  const s=Math.sin(bike.wheelA);
  mparts.legL.rotation.x=0.82+s*0.26; mparts.legR.rotation.x=0.82-s*0.26;   // pedalling
  mparts.armL.rotation.x=-1.0; mparts.armR.rotation.x=-1.0;
  mparts.armL.rotation.z=-0.06; mparts.armR.rotation.z=0.06;                // hands to the bars
  mparts.body.rotation.x=0.22;
  mayor.position.y=mayor.position.y+0.34;                                    // up onto the seat
  mayor.rotation.z=bike.wob;
}
function updateBike(dt,player){
  bike.bellCd=Math.max(0,bike.bellCd-dt);
  if(bike.mounted){
    // throttle the on-trail probe
    bike.checkT-=dt; if(bike.checkT<=0){ bike.checkT=0.12; bike.onTrail=nearTrail(player.x,player.z); }
    const factor=bike.onTrail?1.9:0.8;
    setBikeFactor(factor);
    // wobble target: gentle lean when off-trail
    const speed=Math.hypot(player.vx,player.vz);
    const wobTgt=bike.onTrail?0:Math.sin(game.tNow*7)*0.11*clamp(speed/3,0.15,1);
    bike.wob+=(wobTgt-bike.wob)*Math.min(1,dt*8);
    // wheels
    bike.wheelA-=speed*dt/0.33;
    for(const sp of bike.spins) sp.rotation.z=bike.wheelA;
    // metres ridden
    state.divvyMeters+=speed*dt;
    // dismount interaction follows the player so E anywhere = hop off
    bike.off.x=player.x; bike.off.z=player.z;
    // place the bike under the mayor, then pose the mayor on top
    bike.group.position.set(player.x,player.y,player.z);
    bike.group.rotation.set(0,mayor.rotation.y,bike.wob);
    bikePose();
  }else if(bike.returning){
    bike.retT+=dt; const u=Math.min(1,bike.retT/0.6);
    _dockV.set(bike.retDock.x,groundY(bike.retDock.x,bike.retDock.z),bike.retDock.z);
    bike.group.position.lerpVectors(_retFrom,_dockV,u);
    bike.group.rotation.set(0,Math.PI/2,0);
    bike.wheelA-=6*dt*(1-u); for(const sp of bike.spins) sp.rotation.z=bike.wheelA;
    if(u>=1){ bike.returning=false; bike.group.visible=false; }
  }
}
function ringBell(){ if(bike.bellCd>0)return; bike.bellCd=0.4; bell(); toast('🔔','on your left!'); }

// ===================================================================== //
//  3) BOOMBOX RADIO
// ===================================================================== //
const TOWEL={x:145,z:162};
const STATION_META=[
  {name:'📻 LOFI',            flavor:'the harbor score'},
  {name:"WBMX · HOUSE",       flavor:'warehouse, 122 BPM'},
  {name:'CHECKERBOARD · BLUES',flavor:'a slow shuffle in E'},
  {name:'RADIO OFF',          flavor:'just the lake now'},
];
const radio={station:0,carrying:false,timer:null,next:0,step:0,stepDur:0,bus:null,pulse:0,walkBeat:0,speakers:[],box:null};
let MB_BASE=null;

function buildBoombox(){
  const g=new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.92,0.44,0.22),toon(0x2a2a30)));         // body
  const grille=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.16,0.02),toon(0x14141a)); grille.position.set(0,0.02,0.12); g.add(grille); // cassette/tuner face
  radio.speakers.length=0;
  for(const sx of [-0.28,0.28]){
    const ring=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,0.04,16),toon(0x45464e));
    ring.rotation.x=Math.PI/2; ring.position.set(sx,0,0.11); g.add(ring);                       // outer ring
    const cone=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.08,16),toon(0x101015));
    cone.rotation.x=-Math.PI/2; cone.position.set(sx,0,0.14); g.add(cone);                       // pulsing cone
    radio.speakers.push(cone);
  }
  const handle=new THREE.Mesh(new THREE.TorusGeometry(0.2,0.02,6,14,Math.PI),toon(0x3a3a42)); handle.position.set(0,0.24,0); g.add(handle);
  const ant=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.008,0.5,5),toon(0xb0b4bc)); ant.position.set(0.4,0.42,-0.05); ant.rotation.z=-0.5; g.add(ant);
  radio.box=g; placeBoomboxOnTowel();
  // towel under it
  const towel=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.95),curveMat(new THREE.MeshToonMaterial({color:0xff8c5a,side:THREE.DoubleSide})));
  towel.rotation.x=-Math.PI/2; towel.rotation.z=-0.6; towel.position.set(TOWEL.x,groundY(TOWEL.x,TOWEL.z)+0.03,TOWEL.z); scene.add(towel);
}
function placeBoomboxOnTowel(){
  const g=radio.box; if(!g)return;
  g.scale.setScalar(1); g.rotation.set(0,-0.6,0);
  g.position.set(TOWEL.x,groundY(TOWEL.x,TOWEL.z)+0.24,TOWEL.z);
  scene.add(g);
}

// -- private radio bus: replacing it instantly kills all still-scheduled nodes --
function newRadioBus(){
  const ctx=getAudioCtx(); if(!ctx.actx)return;
  if(radio.bus){ try{radio.bus.disconnect();}catch(e){} }
  radio.bus=ctx.actx.createGain(); radio.bus.gain.value=0.0001; radio.bus.connect(ctx.actx.destination);
}
function radioStart(){
  const ctx=getAudioCtx();
  if(ctx.actx && MB_BASE==null) MB_BASE=ctx.musicBus.gain.value;
  radio.carrying=true; radio.station=0; newRadioBus();
  if(!radio.timer) radio.timer=setInterval(radioTick,120);
}
function radioReturn(){
  const ctx=getAudioCtx();
  if(radio.timer){ clearInterval(radio.timer); radio.timer=null; }
  newRadioBus();
  if(ctx.actx){ const mb=ctx.musicBus.gain,now=ctx.actx.currentTime;
    mb.cancelScheduledValues(now); mb.setValueAtTime(mb.value,now);
    mb.linearRampToValueAtTime(MB_BASE!=null?MB_BASE:0.16,now+0.4); }
  radio.station=0; radio.carrying=false; radio.pulse=0;
}
function cycleStation(){ radioSetStation((radio.station+1)%4); }
function radioSetStation(sTo){
  const ctx=getAudioCtx(); radio.station=sTo;
  newRadioBus(); staticBlip();
  radio.step=0; radio.walkBeat=0;
  if(ctx.actx){
    const now=ctx.actx.currentTime;
    radio.next=now+0.12;
    const mb=ctx.musicBus.gain;
    mb.cancelScheduledValues(now); mb.setValueAtTime(mb.value,now);
    mb.linearRampToValueAtTime(sTo===0?(MB_BASE!=null?MB_BASE:0.16):0.0001, now+0.4);
    if(sTo===1||sTo===2){ radio.stepDur = sTo===1 ? (60/122/4) : (60/92/3);
      radio.bus.gain.cancelScheduledValues(now); radio.bus.gain.setValueAtTime(0.0001,now);
      radio.bus.gain.linearRampToValueAtTime(0.5,now+0.1); }
  }
  const m=STATION_META[sTo]; toast(m.name,m.flavor);
}
function radioTick(){
  const ctx=getAudioCtx(); if(!ctx.actx)return;
  if(radio.station!==1 && radio.station!==2)return;                    // only HOUSE/BLUES synthesize
  if(radio.next<ctx.actx.currentTime) radio.next=ctx.actx.currentTime+0.05;
  while(radio.next<ctx.actx.currentTime+0.5){
    if(radio.station===1) houseStep(radio.step,radio.next);
    else                  bluesStep(radio.step,radio.next);
    radio.next+=radio.stepDur; radio.step++;
  }
}
function updateRadio(dt){
  radio.pulse*=Math.exp(-6*dt);
  const playing=(radio.station===1||radio.station===2);
  const sc=playing?1+radio.pulse*0.4:1;
  for(const s of radio.speakers) s.scale.set(sc,sc,1);
}

// ---------------- HOUSE (WBMX) — 122 BPM, 2-bar loop ------------------ //
const HOUSE_ROOT=[53,49];                                              // F, Db
const HOUSE_CH=[[53,56,60,63],[49,53,56,60]];                          // Fm7, Dbmaj7 stabs
function houseStep(step,t){
  const s=step%32, bar=(s>=16)?1:0, beatPos=s%4;
  if(beatPos===0){ kick(t); radio.pulse=1; }
  if(s%2===1) hat(t, s%4===3?0.06:0.032);
  if(s%8===4) clap(t);                                                 // backbeats
  const root=HOUSE_ROOT[bar];
  if(beatPos===0) subBass(root-24,t,radio.stepDur*3);
  if(beatPos===2) subBass(root-24,t,radio.stepDur*1.6);
  if(s%8===6) stab(HOUSE_CH[bar],t);
}
// ---------------- BLUES (CHECKERBOARD) — shuffle in E ----------------- //
const BLUES_WALK=[40,43,45,46,47,46,45,43];                            // E G A A# B walk
function bluesStep(step,t){
  const inBar=step%12, beat=(inBar/3)|0, trip=inBar%3;
  if(trip===0||trip===2) ride(t, trip===0?0.045:0.028);               // swung ride
  if(trip===0){ walkBass(BLUES_WALK[radio.walkBeat%BLUES_WALK.length],t,60/92*0.9); radio.walkBeat++; radio.pulse=1; }
  if(trip===0 && (beat===1||beat===3)) brush(t);                       // brushed backbeat
  if(trip===0 && Math.random()<0.16) bentLead(t);
}

// ================================ audio ================================
function actxMf(){ const c=getAudioCtx(); return c.mf; }
function kick(t){ const c=getAudioCtx(),bus=radio.bus; if(!c.actx||!bus)return;
  const o=c.actx.createOscillator(),g=c.actx.createGain(); o.type='sine';
  o.frequency.setValueAtTime(150,t); o.frequency.exponentialRampToValueAtTime(50,t+0.11);
  g.gain.setValueAtTime(0.9,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.16);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t+0.18);
}
function hat(t,peak){ const c=getAudioCtx(),bus=radio.bus; if(!c.actx||!bus)return;
  const s=c.actx.createBufferSource(); s.buffer=c.noiseBuf;
  const f=c.actx.createBiquadFilter(); f.type='highpass'; f.frequency.value=8200;
  const g=c.actx.createGain(); g.gain.setValueAtTime(peak,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.04);
  s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t+0.05);
}
function clap(t){ const c=getAudioCtx(),bus=radio.bus; if(!c.actx||!bus)return;
  for(const dl of [0,0.012,0.026]){
    const s=c.actx.createBufferSource(); s.buffer=c.noiseBuf;
    const f=c.actx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=1700; f.Q.value=1.2;
    const g=c.actx.createGain(); g.gain.setValueAtTime(0.0001,t+dl); g.gain.linearRampToValueAtTime(0.16,t+dl+0.005); g.gain.exponentialRampToValueAtTime(0.0001,t+dl+0.09);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t+dl); s.stop(t+dl+0.1);
  }
}
function subBass(m,t,dur){ const c=getAudioCtx(),bus=radio.bus,mf=actxMf(); if(!c.actx||!bus)return;
  const o=c.actx.createOscillator(),g=c.actx.createGain(); o.type='sine'; o.frequency.value=mf(m);
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.55,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t+dur+0.05);
}
function stab(chord,t){ const c=getAudioCtx(),bus=radio.bus,mf=actxMf(); if(!c.actx||!bus)return;
  const g=c.actx.createGain(); const f=c.actx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=2600; f.Q.value=2;
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.3,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+0.2);
  g.connect(f); f.connect(bus);
  for(const m of chord){ const o=c.actx.createOscillator(); o.type='square'; o.frequency.value=mf(m); o.detune.value=(Math.random()-0.5)*8; o.connect(g); o.start(t); o.stop(t+0.22); }
}
function walkBass(m,t,dur){ const c=getAudioCtx(),bus=radio.bus,mf=actxMf(); if(!c.actx||!bus)return;
  const o=c.actx.createOscillator(),g=c.actx.createGain(); o.type='triangle'; o.frequency.value=mf(m);
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.5,t+0.03); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t+dur+0.05);
}
function ride(t,peak){ const c=getAudioCtx(),bus=radio.bus; if(!c.actx||!bus)return;
  const s=c.actx.createBufferSource(); s.buffer=c.noiseBuf;
  const f=c.actx.createBiquadFilter(); f.type='highpass'; f.frequency.value=6500;
  const g=c.actx.createGain(); g.gain.setValueAtTime(peak,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.06);
  s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t+0.07);
}
function brush(t){ const c=getAudioCtx(),bus=radio.bus; if(!c.actx||!bus)return;
  const s=c.actx.createBufferSource(); s.buffer=c.noiseBuf;
  const f=c.actx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=2500; f.Q.value=0.6;
  const g=c.actx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.12,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.14);
  s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t+0.15);
}
function bentLead(t){ const c=getAudioCtx(),bus=radio.bus,mf=actxMf(); if(!c.actx||!bus)return;
  const notes=[52,55,57,58,59,62], m=notes[(Math.random()*notes.length)|0];
  const o=c.actx.createOscillator(),g=c.actx.createGain(); o.type='triangle';
  o.frequency.setValueAtTime(mf(m),t); o.frequency.linearRampToValueAtTime(mf(m+1.5),t+0.18);   // bend up
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.2,t+0.03); g.gain.exponentialRampToValueAtTime(0.0001,t+0.45);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t+0.5);
}
function staticBlip(){ const c=getAudioCtx(); if(!c.actx)return;
  const s=c.actx.createBufferSource(),t=c.actx.currentTime; s.buffer=c.noiseBuf;
  const f=c.actx.createBiquadFilter(); f.type='highpass'; f.frequency.value=1400;
  const g=c.actx.createGain(); g.gain.setValueAtTime(0.13,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.14);
  s.connect(f); f.connect(g); g.connect(c.sfxBus); s.start(t); s.stop(t+0.16);
}
function signChime(){ const c=getAudioCtx(); if(!c.actx)return; const t=c.actx.currentTime;
  [659.25,880,1174.66].forEach((f,i)=>{ const o=c.actx.createOscillator(),g=c.actx.createGain(); o.type='sine'; o.frequency.value=f; const t0=t+i*0.08;
    g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(0.14,t0+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t0+0.6);
    o.connect(g); g.connect(c.sfxBus); o.start(t0); o.stop(t0+0.65); });
}
function bell(){ const c=getAudioCtx(); if(!c.actx)return; const t=c.actx.currentTime;
  [0,0.13].forEach((dl,i)=>{ const o=c.actx.createOscillator(),g=c.actx.createGain(); o.type='sine'; o.frequency.value=i?2637:2093;
    g.gain.setValueAtTime(0.0001,t+dl); g.gain.linearRampToValueAtTime(0.16,t+dl+0.005); g.gain.exponentialRampToValueAtTime(0.0001,t+dl+0.45);
    o.connect(g); g.connect(c.sfxBus); o.start(t+dl); o.stop(t+dl+0.5); });
}

// ===================================================================== //
//  wire it all up
// ===================================================================== //
let _prevR=false;
onWorldReady(player=>{
  buildGrid();
  buildSigns();
  buildDocks();
  bike.group=makeRideBike();
  buildBoombox();

  // Divvy interactions — a grab at every dock (same label), one shared dismount
  bike.grabs=DOCKS.map(D=>addInteraction({x:D.x,z:D.z,r:2.6,label:'grab a Divvy',onUse:pl=>{ bike.returning=false; mount(pl); }}));
  bike.off =addInteraction({x:0,z:0,r:3,priority:50,label:'hop off',onUse:()=>dismount()}); bike.off.enabled=false;

  // Boombox interactions
  const borrow=addInteraction({x:TOWEL.x,z:TOWEL.z,r:2.2,label:'borrow the boombox',onUse:()=>{
    holdItem(radio.box); radio.box.scale.setScalar(0.62); radio.box.position.set(0,0.06,0.05); radio.box.rotation.set(0,0,0);
    radioStart(); borrow.enabled=false; putBack.enabled=true;
    toast('BORROWED THE BOOMBOX','R = change the station');
  }});
  const putBack=addInteraction({x:TOWEL.x,z:TOWEL.z,r:2.4,label:'put it back',onUse:()=>{
    holdItem(null); placeBoomboxOnTowel(); radioReturn();
    putBack.enabled=false; borrow.enabled=true;
    toast('put it back','LOFI’s back on');
  }}); putBack.enabled=false;

  // journal — n/12 + collected list w/ lore + Divvy metres
  journalSection('signs','Honorary Chicago',()=>{
    const got=SIGNS.filter(s=>s.collected);
    let rows=`<div class="jrow"><span>Honorary signs</span><b>${got.length} / 12</b></div>`;
    for(const s of got) rows+=`<div class="jrow"><span>✓ ${s.name} WAY</span><b>${s.lore}</b></div>`;
    rows+=`<div class="jrow"><span>Divvy metres ridden</span><b>${(state.divvyMeters||0).toFixed(0)} m</b></div>`;
    const docksFound=DOCKS.filter(D=>D.discovered).length;
    rows+=`<div class="jrow"><span>Docks discovered</span><b>${docksFound} / ${DOCKS.length}</b></div>`;
    return rows;
  });

  // per-frame: R context key + signs + glints + bike + radio visuals
  registerUpdate((dt,t,pl)=>{
    const rNow=keys.has('r'), rPress=rNow&&!_prevR; _prevR=rNow;
    if(rPress && game.running){
      if(radio.carrying) cycleStation();                              // radio wins (bell yields)
      else if(bike.mounted) ringBell();
    }
    updateSigns(dt,pl);
    updateGlints(t);
    updateBike(dt,pl);
    updateRadio(dt);
  });
});
