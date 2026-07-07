// =====================================================================
//  PACK: parkcharm — Chicago Park District street furniture. The everyday,
//  cared-for props that make Belmont Harbor read as a real lakefront park:
//    1. BENCHES        — classic CPD forest-green wood-slat benches on dark
//                        iron frames, strung along the Lakefront Trail and
//                        turned to FACE THE LAKE (east). One every ~26 m of
//                        the main curve, offset 5.8 m to the lake side (clear
//                        of the parallel bike+walk ribbon; park side if that
//                        would fall on water). Occupied/landmark
//                        points + the hot-dog cart are given a 6 m berth.
//    2. TRASH BARRELS  — the green perforated-metal CPD barrels, one beside
//                        every ~3rd bench.
//    3. FOUNTAINS      — 3 squat concrete drinking fountains (pedestal + bowl
//                        + spout), spaced far apart along the trail.
//    4. ENTRANCE SIGNS — 2 white-on-CPD-blue canvas panels reading CHICAGO
//                        PARK DISTRICT / LINCOLN PARK / BELMONT HARBOR, on the
//                        west edge where people enter, facing east.
//    5. CHESS TABLES   — 2 concrete checkerboard tables + stub stools by the
//                        Waveland fieldhouse (kept ≥9 m off its collider).
//
//  Only-my-file rules: this module + one import line in packs/index.js. No
//  shared source is edited. Solid props get props.collide(). Every repeated
//  shape is instanced (≈14 added draw calls total). All jitter uses a LOCAL
//  mulberry32 (seed 1871) — the shared world rng is never touched, so world
//  determinism (towel/flower placement) is preserved.
// =====================================================================
import * as THREE from 'three';
import { onWorldReady } from '../framework.js';
import { scene, toon, bmat, curveMat, gmap, pip } from '../core.js';
import { LAND } from '../coast.js';
import { pathSamples, mainCurve } from '../paths.js';
import { collide } from '../props.js';

// ---- local deterministic rng (NEVER the shared world rng) -------------
function m32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const rnd=m32(1871);

// ---- scratch (no per-frame alloc; onWorldReady is one-shot anyway) -----
const _M=new THREE.Matrix4(), _v=new THREE.Vector3(), _q=new THREE.Quaternion(),
      _e=new THREE.Euler(), _s1=new THREE.Vector3(1,1,1), _qI=new THREE.Quaternion();

// ---- palette ----------------------------------------------------------
const BGREEN=0x2f6b3f, IRON=0x23262b, BARREL_RIM=0x24402b,
      CONCRETE=0xbdb6a8, CONCRETE2=0xa9a294, CPD_BLUE=0x134d80, POST=0x37584a;

// water-side offset from the BIKE centerline for benches/barrels/fountains.
// The trail is now a DUAL ribbon: the walking path sits on the water side, its
// far edge ~5.2 m out (walkOff 4.0 + walk width/2 1.2). 5.8 m clears it + margin
// so no furniture lands on either ribbon (benches still face the water).
const WATER_OFF=5.8;

// occupied points on the NEW map: Divvy, boombox, hot-dog cart, goose,
// honorary/entrance signs, the peninsula pier sign, and the chess tables —
// benches keep a 6 m berth from each.
const OCCUPIED=[
  [40,-40],   // Divvy dock
  [145,162],  // boombox towel (rocks)
  [45,-150],  // hot-dog cart
  [50,-120],  // goose patrol lawn
  [100,112],[92,-333],[140,100],[38,-235],[125,-8],[60,-170],
  [35,-362],[207.5,-472],[26,99],[85,-352],[95,-418],        // honorary + entrance signs (Ann Sather now trail-side by the fieldhouse)
  [205,-105], // peninsula pier sign (DECKS x200-216, z-120..-90)
  [193,-470],[196,-476],                                      // chess tables (below)
];

// ---- helpers ----------------------------------------------------------
const onLand=(x,z)=>pip(x,z,LAND);
function nearOccupied(x,z,r){ const r2=r*r; for(const o of OCCUPIED){ const dx=x-o[0],dz=z-o[1]; if(dx*dx+dz*dz<r2)return true; } return false; }
function nearTrail(x,z,d){ const d2=d*d; for(let i=0;i<pathSamples.length;i+=2){ const p=pathSamples[i],dx=p[0]-x,dz=p[1]-z; if(dx*dx+dz*dz<d2)return true; } return false; }
// unit normal at trail param u pointing toward the NEAREST water: probe both
// perpendicular sides ~9 m out and face whichever leaves LAND (i.e. water).
// The lake side flips along the rebuilt trail (east on the rocks/golf stretches,
// south around the harbor's north shore); falls back to east (+x) when both
// probes are on land (bench sits deep inland).
function lakeNormal(u){
  const tg=mainCurve.getTangent(u); let nx=-tg.z,nz=tg.x;
  const l=Math.hypot(nx,nz)||1; nx/=l; nz/=l;
  const p=mainCurve.getPoint(u), P=9;
  const plusW=!onLand(p.x+nx*P,p.z+nz*P), minusW=!onLand(p.x-nx*P,p.z-nz*P);
  if(minusW&&!plusW){ nx=-nx; nz=-nz; }               // water on the minus side
  else if(plusW===minusW&&nx<0){ nx=-nx; nz=-nz; }    // ambiguous -> default east (+x)
  return {x:nx,z:nz};
}
// compose an instance matrix at (x,z,ry) with a local (lx,ly,lz) offset + optional tilt about the local X
function placeMat(M,x,z,ry,lx,ly,lz,rx){
  const c=Math.cos(ry),s=Math.sin(ry);
  _v.set(x+(lx*c+lz*s), ly, z+(-lx*s+lz*c));
  if(rx){ _e.set(rx,ry,0,'YXZ'); _q.setFromEuler(_e); M.compose(_v,_q,_s1); }
  else{ _e.set(0,ry,0,'YXZ'); _q.setFromEuler(_e); M.compose(_v,_q,_s1); }
}

// ---- canvas textures --------------------------------------------------
function barrelTex(){
  const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d');
  g.fillStyle='#2f6b3f';g.fillRect(0,0,64,64);
  g.fillStyle='#234f2e';                                   // punched-metal perforations
  for(let y=4;y<64;y+=8)for(let x=4;x<64;x+=8){g.beginPath();g.arc(x+((y/8)&1?4:0)%8,y,2.1,0,7);g.fill();}
  const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(5,2);t.anisotropy=4;return t;
}
function signTex(){
  const cv=document.createElement('canvas');cv.width=520;cv.height=325;const g=cv.getContext('2d');
  g.fillStyle='#134d80';g.fillRect(0,0,520,325);
  g.strokeStyle='#ffffff';g.lineWidth=8;g.strokeRect(13,13,494,299);
  g.fillStyle='#ffffff';g.textAlign='center';g.textBaseline='middle';
  g.font='700 30px "Trebuchet MS",sans-serif';g.fillText('CHICAGO PARK DISTRICT',260,52);
  g.font='800 74px "Trebuchet MS",sans-serif';g.fillText('LINCOLN PARK',260,148);
  g.strokeStyle='#8fbce0';g.lineWidth=4;g.beginPath();g.moveTo(96,196);g.lineTo(424,196);g.stroke();
  g.fillStyle='#ffffff';g.font='700 46px "Trebuchet MS",sans-serif';g.fillText('BELMONT HARBOR',260,244);
  const t=new THREE.CanvasTexture(cv);t.anisotropy=8;return t;
}
function checkerTex(){
  const cv=document.createElement('canvas');cv.width=cv.height=256;const g=cv.getContext('2d');
  const n=8,s=256/n;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){g.fillStyle=((x+y)&1)?'#3a4a3f':'#e8e0cf';g.fillRect(x*s,y*s,s,s);}
  g.strokeStyle='#20302a';g.lineWidth=6;g.strokeRect(3,3,250,250);
  const t=new THREE.CanvasTexture(cv);t.anisotropy=8;return t;
}

// ===================================================================== //
onWorldReady(()=>{
  if(!mainCurve)return;                                    // paths built before worldReady; guard anyway
  const L=mainCurve.getLength();

  // ---------------------------------------------------------------- //
  //  1) BENCHES — one every ~26 m along the main trail, facing the lake
  // ---------------------------------------------------------------- //
  const benches=[];
  const n=Math.max(1,Math.round(L/26));
  for(let i=0;i<n;i++){
    const u=(i+0.5)/n;
    const p=mainCurve.getPoint(u), nrm=lakeNormal(u);
    const ry=Math.atan2(nrm.x,nrm.z)+(rnd()-0.5)*0.05;     // face the lake, tiny weathered skew
    let bx=p.x+nrm.x*WATER_OFF, bz=p.z+nrm.z*WATER_OFF;
    if(!onLand(bx,bz)){ bx=p.x-nrm.x*WATER_OFF; bz=p.z-nrm.z*WATER_OFF; if(!onLand(bx,bz))continue; } // park side if lake side is water
    if(nearOccupied(bx,bz,6))continue;
    benches.push({x:bx,z:bz,ry});
  }
  const NB=benches.length;
  const seat=new THREE.InstancedMesh(new THREE.BoxGeometry(2.2,0.06,0.16),toon(BGREEN),NB*3);
  const back=new THREE.InstancedMesh(new THREE.BoxGeometry(2.2,0.16,0.06),toon(BGREEN),NB*2);
  const legs=new THREE.InstancedMesh(new THREE.BoxGeometry(0.12,0.62,0.55),toon(IRON),NB*2);
  let si=0,bi=0,li=0;
  for(const b of benches){
    for(const lz of [-0.2,0,0.2]){ placeMat(_M,b.x,b.z,b.ry,0,0.62,lz,0); seat.setMatrixAt(si++,_M); }      // 3 seat slats
    for(const ly of [0.95,1.14]){ placeMat(_M,b.x,b.z,b.ry,0,ly,-0.27,-0.13); back.setMatrixAt(bi++,_M); }   // 2 leaned back slats
    for(const lx of [-0.95,0.95]){ placeMat(_M,b.x,b.z,b.ry,lx,0.31,0,0); legs.setMatrixAt(li++,_M); }        // 2 iron end frames
    collide(b.x,b.z,0.9);
  }
  seat.instanceMatrix.needsUpdate=back.instanceMatrix.needsUpdate=legs.instanceMatrix.needsUpdate=true;
  scene.add(seat,back,legs);

  // ---------------------------------------------------------------- //
  //  2) TRASH BARRELS — one beside every ~3rd bench
  // ---------------------------------------------------------------- //
  const barrels=[];
  benches.forEach((b,j)=>{
    if(j%3!==0)return;
    const c=Math.cos(b.ry),s=Math.sin(b.ry);               // bench local +x side dir = (cos ry, -sin ry)
    let x=b.x+c*1.5, z=b.z-s*1.5;
    if(!onLand(x,z)||nearTrail(x,z,1.8)){ x=b.x-c*1.5; z=b.z+s*1.5; }
    if(!onLand(x,z))return;
    barrels.push([x,z]);
  });
  if(barrels.length){
    const barMat=curveMat(new THREE.MeshToonMaterial({color:0xffffff,map:barrelTex(),gradientMap:gmap}));
    const body=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42,0.42,1.0,14),barMat,barrels.length);
    const rim =new THREE.InstancedMesh(new THREE.TorusGeometry(0.42,0.06,6,16),toon(BARREL_RIM),barrels.length);
    barrels.forEach((p,i)=>{
      _M.compose(_v.set(p[0],0.5,p[1]),_qI,_s1); body.setMatrixAt(i,_M);
      _e.set(Math.PI/2,0,0,'YXZ'); _q.setFromEuler(_e); _M.compose(_v.set(p[0],1.0,p[1]),_q,_s1); rim.setMatrixAt(i,_M);
      collide(p[0],p[1],0.45);
    });
    body.instanceMatrix.needsUpdate=rim.instanceMatrix.needsUpdate=true; scene.add(body,rim);
  }

  // ---------------------------------------------------------------- //
  //  3) DRINKING FOUNTAINS — 3, spaced far apart along the trail
  // ---------------------------------------------------------------- //
  const fount=[0.16,0.5,0.84].map(u=>{
    const p=mainCurve.getPoint(u), nrm=lakeNormal(u);
    let x=p.x+nrm.x*WATER_OFF, z=p.z+nrm.z*WATER_OFF;
    if(!onLand(x,z)){ x=p.x-nrm.x*WATER_OFF; z=p.z-nrm.z*WATER_OFF; }
    return [x,z];
  });
  {
    const ped  =new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16,0.22,0.9,12),toon(CONCRETE),3);
    const bowl =new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3,0.22,0.16,16),toon(CONCRETE2),3);
    const spout=new THREE.InstancedMesh(new THREE.BoxGeometry(0.05,0.1,0.05),toon(0x8a9098),3);
    fount.forEach((p,i)=>{
      _M.compose(_v.set(p[0],0.45,p[1]),_qI,_s1); ped.setMatrixAt(i,_M);
      _M.compose(_v.set(p[0],0.96,p[1]),_qI,_s1); bowl.setMatrixAt(i,_M);
      _M.compose(_v.set(p[0]+0.16,1.0,p[1]),_qI,_s1); spout.setMatrixAt(i,_M);
      collide(p[0],p[1],0.5);
    });
    ped.instanceMatrix.needsUpdate=bowl.instanceMatrix.needsUpdate=spout.instanceMatrix.needsUpdate=true;
    scene.add(ped,bowl,spout);
  }

  // ---------------------------------------------------------------- //
  //  4) ENTRANCE SIGNS — 2 on the west edge, facing east (+x)
  // ---------------------------------------------------------------- //
  const signSpots=[{x:19,z:103},{x:18,z:-395}]; // Belmont underpass mouth (moved to z≈105) · Addison underpass, facing east into the park
  {
    const tex=signTex();
    const front=new THREE.InstancedMesh(new THREE.PlaneGeometry(2.6,1.62),bmat(0xffffff,{map:tex,side:THREE.FrontSide}),2);
    const rear =new THREE.InstancedMesh(new THREE.PlaneGeometry(2.6,1.62),toon(CPD_BLUE),2);
    const posts=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07,0.08,2.2,8),toon(POST),4);
    let pi=0;
    signSpots.forEach((sp,i)=>{
      _e.set(0, Math.PI/2,0,'YXZ'); _q.setFromEuler(_e); _M.compose(_v.set(sp.x,1.9,sp.z),_q,_s1); front.setMatrixAt(i,_M);
      _e.set(0,-Math.PI/2,0,'YXZ'); _q.setFromEuler(_e); _M.compose(_v.set(sp.x-0.04,1.9,sp.z),_q,_s1); rear.setMatrixAt(i,_M);
      for(const lz of [-1,1]){ _M.compose(_v.set(sp.x,1.1,sp.z+lz),_qI,_s1); posts.setMatrixAt(pi++,_M); }
      collide(sp.x,sp.z,0.5);
    });
    front.instanceMatrix.needsUpdate=rear.instanceMatrix.needsUpdate=posts.instanceMatrix.needsUpdate=true;
    scene.add(front,rear,posts);
  }

  // ---------------------------------------------------------------- //
  //  5) CHESS TABLES — 2 on the relocated fieldhouse (186,-478) clubhouse lawn, ≥9 m off it
  // ---------------------------------------------------------------- //
  const chess=[{x:193,z:-470},{x:196,z:-476}];
  {
    const chk=checkerTex();
    const top  =new THREE.InstancedMesh(new THREE.BoxGeometry(0.92,0.06,0.92),bmat(0xffffff,{map:chk}),2);
    const ped  =new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16,0.22,0.7,12),toon(CONCRETE),2);
    const stool=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18,0.2,0.46,12),toon(CONCRETE2),4);
    let sti=0;
    chess.forEach((t,i)=>{
      _M.compose(_v.set(t.x,0.73,t.z),_qI,_s1); top.setMatrixAt(i,_M);
      _M.compose(_v.set(t.x,0.35,t.z),_qI,_s1); ped.setMatrixAt(i,_M);
      for(const dx of [-0.95,0.95]){ _M.compose(_v.set(t.x+dx,0.23,t.z),_qI,_s1); stool.setMatrixAt(sti++,_M); }
      collide(t.x,t.z,0.8);
    });
    top.instanceMatrix.needsUpdate=ped.instanceMatrix.needsUpdate=stool.instanceMatrix.needsUpdate=true;
    scene.add(top,ped,stool);
  }
});
