// =====================================================================
//  LAWNLIFE — the dead-space kill. The inland lawns were "not pretty enough
//  to be empty", so this pack fills them with cozy, posed-chibi tableaux:
//    1. SIX PICNICS  — varied blankets/coolers/food, 2-3 seated eaters each.
//                      One is a BIRTHDAY (swaying balloons + a little cake).
//    2. PEQUOD'S DEEP-DISH PICNIC — the black-box-with-red-band look, an open
//                      deep dish (caramelized crust ring + golden cheese), 3
//                      happy eaters, one holding a slice.
//    3. YOGA CLASS   — an instructor + 5 students on mats, slowly cycling
//                      synchronized poses (the instructor leads by ~0.5 s).
//    4. READING CIRCLE — 4 seated readers with little books, one reading aloud.
//    5. GUITAR STRUMMER — seated, strum-arm oscillation + a QUIET pluck loop
//                      when the player is within ~10 m.
//    6. CORNHOLE     — two sites, angled boards w/ a dark hole, throwers on a
//                      slow underhand cycle + a bean bag arcing between.
//    7. TODDLER + GEESE — a tiny chibi zig-zag-chasing a wandering point on the
//                      goose lawn, giggling, with a trailing parent.
//    8. FARMERS-MARKET CART — striped awning, produce cubes, vendor + browser.
//
//  Only-my-file rules: this module + its one (pre-existing) import line in
//  packs/index.js. All setup runs inside onWorldReady. Every posed chibi uses
//  raw createChibi (NOT makeNPC, whose walk-swing would fight static poses) and
//  registers a framework bumpable for midwestern "ope" lines. Repeated geometry
//  (blankets, mats, coolers, food, books, produce, boards) is instanced. LAYOUT
//  IS FIXED/HARDCODED (deterministic across loads) and every group's center is
//  runtime-verified against pathSamples — nudged >=6 m off any trail sample with
//  a console.warn if the audit missed one. Any non-layout randomness uses a
//  LOCAL mulberry32; the shared world rng is never touched. A single
//  registerUpdate drives all motion from hoisted scratch (zero per-frame alloc).
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, registerUpdate, createChibi, registerBumpable, bakeChibiRig, getAudioCtx } from '../framework.js';
import { scene, camera, toon, bmat, curveMat, clamp, lerp, smooth } from '../core.js';
import { coastQuery, tierAt } from '../coast.js';
import { pathSamples } from '../paths.js';

// local deterministic rng — never the shared core rng()/rand()
function m32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

const CITIZEN = 0.74;                          // canonical chibi scale (matches the mayor)

// terrace height (rocks) else park y=0 — same test as progression.js/parklife groundY.
// One value per CLUSTER center keeps a whole picnic on a single surface.
function groundY(x,z){
  const q = coastQuery(x,z);
  if(q && q.lat>0.15){ const t=tierAt(q.lat,q.z); if(t) return t.h; }
  return 0;
}

// runtime path audit: if a hardcoded center slipped within 6 m of a trail
// sample, shove it away along the offending direction (<=4 m) and warn so the
// orchestrator sees it in shot output. Returns the (possibly nudged) center.
function clearPath(cx,cz,name){
  let bd2=Infinity, bx=cx, bz=cz;
  for(let i=0;i<pathSamples.length;i++){ const s=pathSamples[i]; const dx=cx-s[0], dz=cz-s[1]; const d2=dx*dx+dz*dz; if(d2<bd2){bd2=d2;bx=s[0];bz=s[1];} }
  const d=Math.sqrt(bd2);
  if(d<6){
    let ux=cx-bx, uz=cz-bz; const L=Math.hypot(ux,uz)||1; ux/=L; uz/=L;
    const push=Math.min(4,(6-d)+0.6);
    const nx=cx+ux*push, nz=cz+uz*push;
    console.warn(`[lawnlife] NUDGE ${name}: (${cx},${cz}) was ${d.toFixed(2)} m from a path sample -> (${nx.toFixed(2)},${nz.toFixed(2)})`);
    return {x:nx,z:nz};
  }
  return {x:cx,z:cz};
}

// ---- palettes (hardcoded → deterministic, no world rng) --------------
const PAL = [
  {suit:0xd4694f,pants:0x3c4a63,skin:0xe8b48c,hair:0x3a2a1e},
  {suit:0x4f8c6b,pants:0x2f3540,skin:0x8a5a3c,hair:0x1d160f,hairStyle:'bun'},
  {suit:0xe0b24a,pants:0x6b4a2f,skin:0xf0c9a0,hair:0x55402a},
  {suit:0x6d7fbf,pants:0x33384a,skin:0x6e4632,hair:0x24160e,hairStyle:'afro'},
  {suit:0xc85c8e,pants:0x40354a,skin:0xdca07a,hair:0x2a1c12,hairStyle:'tall'},
  {suit:0x3f9bb0,pants:0x2c3b45,skin:0xa8724a,hair:0x140f0a},
  {suit:0xe38b5a,pants:0x4a3320,skin:0xf2caa6,hair:0x6a4a2c,hairStyle:'bun'},
  {suit:0x8a6bbf,pants:0x33304a,skin:0x7a5038,hair:0x1a120c},
  {suit:0xcf5142,pants:0x2f3a4a,skin:0xecb890,hair:0x2c1d12},
  {suit:0x5aa06a,pants:0x38402c,skin:0x955f3d,hair:0x120d08,hairStyle:'afro'},
  {suit:0xd9a23c,pants:0x3a3550,skin:0xf0c49c,hair:0x4a3520,hairStyle:'tall'},
  {suit:0x4d84c4,pants:0x2b3340,skin:0x87573a,hair:0x161009},
  {suit:0xb85c94,pants:0x3d3348,skin:0xe6ad84,hair:0x241610},
  {suit:0x6fae8a,pants:0x2f3a3f,skin:0xd8a878,hair:0x2c211a,hairStyle:'bun'},
];
let _pi = 0;
function nextPal(){ return PAL[_pi++ % PAL.length]; }

// ---- midwestern "ope" bump-line pools (one per group type) ------------
const LINES_PICNIC   = ["ope — mind the blanket!","pop's in the cooler, help yourself","we got plenty of brats","ope, scooch in, there's room"];
const LINES_BIRTHDAY = ["happy birthday, ya goof!","ope — save room for cake","make a wish!","she's the big three-oh, dontcha know"];
const LINES_PEQUOD   = ["caramelized crust, no notes","ope — best in the city","we drove from Bridgeport for this"];
const LINES_YOGA     = ["ope — namaste, bud","find your center, eh","breeeathe","downward dog, dontcha know"];
const LINES_READING  = ["ope — good chapter","shh, it's gettin' good","got it from the library, ya","real page-turner, this one"];
const LINES_GUITAR   = ["ope — any requests?","just noodlin' a bit","know any Mellencamp?","c'mon and sing along, eh"];
const LINES_CORNHOLE = ["ope — bags!","right in the hole, ya!","board's yours, bud","gotta wash that bag first, eh"];
const LINES_TODDLER  = ["hehehe!","goose!!","*giggling*"];
const LINES_PARENT   = ["ope — not too far, honey!","she loves them geese","careful by the water, bud","stay where I can see ya"];
const LINES_MARKET   = ["fresh sweet corn, last of it","tomatoes are from Michigan","ope — take a sample"];

// ---- canvas texture: the Pequod's box lid (black w/ a red band + logo) ----
function pequodsTex(){
  const cv=document.createElement('canvas');cv.width=256;cv.height=256;const g=cv.getContext('2d');
  g.fillStyle='#141414';g.fillRect(0,0,256,256);                       // black lid
  g.fillStyle='#b3261d';g.fillRect(0,96,256,64);                       // red band
  g.fillStyle='#f2ede2';g.textAlign='center';g.textBaseline='middle';
  g.font='800 40px "Trebuchet MS",sans-serif';g.fillText("PEQUOD'S",128,128);
  g.font='600 18px "Trebuchet MS",sans-serif';g.fillStyle='#e8b34a';g.fillText('PIZZERIA',128,176);
  const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return t;
}
// ---- canvas texture: the market awning stripes (red / cream) ----
function awningTex(){
  const cv=document.createElement('canvas');cv.width=256;cv.height=64;const g=cv.getContext('2d');
  const cols=['#c8443a','#f2ede0'],n=8,w=256/n;
  for(let i=0;i<n;i++){g.fillStyle=cols[i%2];g.fillRect(i*w,0,w+1,64);}
  const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return t;
}

onWorldReady((player) => {
  const rnd = m32(90210);

  // build-time scratch (onWorldReady is one-shot — allocation here is fine)
  const M=new THREE.Matrix4(), Q=new THREE.Quaternion(), V=new THREE.Vector3(),
        S=new THREE.Vector3(1,1,1), E=new THREE.Euler(), C=new THREE.Color(), qI=new THREE.Quaternion();
  const flatX = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0)); // plane -> lay flat

  // spot buckets — collected across every group, one InstancedMesh each at the end
  const blanketSpots=[];   // {x,z,ry,col}
  const matSpots=[];       // {x,z,ry,col}  (yoga)
  const coolerSpots=[];    // {x,z}
  const foodSpots=[];      // {x,y,z,c}
  const bookSpots=[];      // {x,y,z,ry,tilt}
  const produceSpots=[];   // {x,y,z,c}

  // ---- shared chibi helpers ------------------------------------------
  function makeChibi(x,z,ry,pal,scale=CITIZEN){
    const {group,parts}=createChibi(Object.assign({scale},pal));
    group.position.set(x,0,z); group.rotation.y=ry; scene.add(group);
    return {group,parts};
  }
  // sit cross-legged on the ground (from parklife): legs forward, hips dropped
  function poseSeated(group,parts,y){
    parts.legL.rotation.x=-1.42; parts.legR.rotation.x=-1.36;
    parts.armL.rotation.x=-0.4;  parts.armR.rotation.x=-0.5;
    parts.armL.rotation.z=0.15;  parts.armR.rotation.z=-0.15;
    parts.body.rotation.x=-0.12;
    group.position.y=y-0.33;
  }

  // ================================================================= //
  //  1) SIX PICNICS (fixed centers; the first is the BIRTHDAY picnic)
  // ================================================================= //
  //  n = seated eaters. face-center offsets, first n used.
  const SEAT=[[-1.0,-0.5],[0.9,0.6],[-0.75,0.95],[0.8,-0.9],[0.05,1.15]];
  const FOODC=[0xf2c45a,0xd0463f,0x6db24a,0xe08a3a,0xf0e6c0];   // roll / apple / greens / peach / bun
  function buildPicnic(cx,cz,ry,col,n,lines){
    const gy=groundY(cx,cz);
    blanketSpots.push({x:cx,z:cz,ry,col});
    for(let i=0;i<n;i++){
      const sx=cx+SEAT[i][0], sz=cz+SEAT[i][1], sry=Math.atan2(cx-sx,cz-sz);
      const {group,parts}=makeChibi(sx,sz,sry,nextPal());
      poseSeated(group,parts,gy);
      registerBumpable(group,parts,lines);
      bakeChibiRig(group,parts);               // static seated eater — baked → 1 draw
    }
    coolerSpots.push({x:cx+1.25,z:cz-0.9});
    foodSpots.push({x:cx+0.3, y:gy+0.12, z:cz+0.15, c:FOODC[0]});
    foodSpots.push({x:cx-0.25,y:gy+0.11, z:cz-0.3,  c:FOODC[1]});
    foodSpots.push({x:cx+0.1, y:gy+0.11, z:cz-0.55, c:FOODC[2]});
    return gy;
  }

  const PICNICS=[
    {x:60, z:300,  ry:-0.4, col:0xe0a13a, n:2, lines:LINES_PICNIC},
    {x:48, z:80,   ry:0.5,  col:0x4f8c6b, n:2, lines:LINES_PICNIC},
    {x:68, z:-135, ry:0.9,  col:0xc25c8e, n:2, lines:LINES_PICNIC},
    {x:42, z:-310, ry:-0.7, col:0xd0563c, n:2, lines:LINES_PICNIC},
    {x:185,z:-345, ry:0.3,  col:0x6d7fbf, n:2, lines:LINES_PICNIC},
  ];
  for(const p of PICNICS){ const c=clearPath(p.x,p.z,'picnic'); buildPicnic(c.x,c.z,p.ry,p.col,p.n,p.lines); }

  // ---- BIRTHDAY picnic (95,340): cake + swaying balloons ----
  // NOTE: an InstancedMesh carrying per-instance colour (setColorAt) throws a
  // three-r128 render error when parented under a Group, so the balloon meshes
  // live at the scene ROOT and the "bundle sway" is applied to their instance
  // matrices each frame (anchor * sway * localMatrix) from hoisted scratch.
  let balloonMesh=null, stringMesh=null;
  const balloonAnchor=new THREE.Vector3(), balloonLocal=[], stringLocal=[];
  {
    const c=clearPath(95,340,'birthday-picnic');
    const gy=buildPicnic(c.x,c.z,0.4,0xcf5142,3,LINES_BIRTHDAY);
    // a little cake near blanket center
    const cake=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.36,0.24,16),toon(0xf3e3d0));
    cake.position.set(c.x,gy+0.14,c.z); scene.add(cake);
    const icing=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,0.05,16),toon(0xe58aa6));
    icing.position.set(c.x,gy+0.27,c.z); scene.add(icing);
    const candles=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012,0.012,0.14,5),toon(0xf2f0e6),3);
    const flames =new THREE.InstancedMesh(new THREE.ConeGeometry(0.03,0.07,6),bmat(0xffb23a),3);
    [-0.14,0,0.14].forEach((dx,i)=>{
      M.compose(V.set(c.x+dx,gy+0.36,c.z),qI,S.set(1,1,1)); candles.setMatrixAt(i,M);
      M.compose(V.set(c.x+dx,gy+0.47,c.z),qI,S.set(1,1,1)); flames.setMatrixAt(i,M);
    });
    candles.instanceMatrix.needsUpdate=true; flames.instanceMatrix.needsUpdate=true;
    scene.add(candles,flames);
    // 4 balloons on strings — local matrices are relative to the anchor; the
    // per-frame sway multiplies anchor*sway*local (see registerUpdate).
    balloonAnchor.set(c.x-1.1, gy+0.2, c.z-0.6);
    const BCOL=[0xe0453a,0x3f7fbf,0xf2c445,0x5aa06a];
    const BPOS=[[-0.28,2.35,-0.05],[0.05,2.62,0.12],[0.34,2.28,-0.1],[-0.02,2.9,-0.2]];
    balloonMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(0.26,10,9),toon(0xffffff,{}),4);  // fresh (uncached) mat for setColorAt
    stringMesh =new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006,0.006,1,4),toon(0xcfc8b6),4);
    balloonMesh.frustumCulled=stringMesh.frustumCulled=false;
    const seed=new THREE.Matrix4().makeTranslation(balloonAnchor.x,balloonAnchor.y,balloonAnchor.z), tmp=new THREE.Matrix4();
    for(let i=0;i<4;i++){
      const bx=BPOS[i][0],by=BPOS[i][1],bz=BPOS[i][2];
      balloonMesh.setColorAt(i,C.setHex(BCOL[i]));
      balloonLocal.push(new THREE.Matrix4().compose(new THREE.Vector3(bx,by,bz),qI,new THREE.Vector3(1,1.14,1)));  // slight teardrop
      const len=Math.hypot(bx,by-0.26,bz);
      const sq=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), new THREE.Vector3(bx,by-0.26,bz).normalize());
      stringLocal.push(new THREE.Matrix4().compose(new THREE.Vector3(bx*0.5,(by-0.26)*0.5,bz*0.5),sq,new THREE.Vector3(1,len,1)));
      tmp.multiplyMatrices(seed,balloonLocal[i]); balloonMesh.setMatrixAt(i,tmp);   // pre-sway seed matrices
      tmp.multiplyMatrices(seed,stringLocal[i]);  stringMesh.setMatrixAt(i,tmp);
    }
    balloonMesh.instanceMatrix.needsUpdate=true; balloonMesh.instanceColor.needsUpdate=true;
    stringMesh.instanceMatrix.needsUpdate=true;
    scene.add(balloonMesh,stringMesh);
  }

  // ================================================================= //
  //  2) PEQUOD'S DEEP-DISH PICNIC (72,60)
  // ================================================================= //
  {
    const c=clearPath(72,60,'pequods'); const gy=groundY(c.x,c.z);
    blanketSpots.push({x:c.x,z:c.z,ry:0.2,col:0x9c3f3a});      // deep-red checked-ish blanket
    // the box: black base + an open lid tilted up showing PEQUOD'S
    const base=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.16,1.1),toon(0x151515));
    base.position.set(c.x,gy+0.08,c.z); scene.add(base);
    const band=new THREE.Mesh(new THREE.BoxGeometry(1.12,0.06,1.12),toon(0xb3261d));  // red band around the base
    band.position.set(c.x,gy+0.13,c.z); scene.add(band);
    const lidGeo=new THREE.PlaneGeometry(1.1,1.1);
    const lidMat=bmat(0xffffff,{map:pequodsTex()});                                   // FrontSide: PEQUOD'S faces the eaters
    const lid=new THREE.Mesh(lidGeo,lidMat);
    lid.position.set(c.x,gy+0.55,c.z-0.55); lid.rotation.x=-1.15; scene.add(lid);   // hinged up, facing the eaters
    // plain cardboard OUTSIDE (BackSide, same transform) so the back of the lid
    // never shows mirrored PEQUOD'S text (PITFALLS: lone DoubleSide canvas plane).
    const lidBack=new THREE.Mesh(lidGeo,bmat(0x2a2a2a,{side:THREE.BackSide}));
    lidBack.position.copy(lid.position); lidBack.rotation.copy(lid.rotation); scene.add(lidBack);
    // the deep dish: dark caramelized crust RING (torus) + golden cheese disc inside
    const crust=new THREE.Mesh(new THREE.TorusGeometry(0.42,0.12,8,20),toon(0x6a3d18));
    crust.rotation.x=-Math.PI/2; crust.position.set(c.x,gy+0.19,c.z); scene.add(crust);
    const cheese=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,0.09,20),toon(0xe8b23c));
    cheese.position.set(c.x,gy+0.2,c.z); scene.add(cheese);
    const sauce=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.1,14),toon(0xc23a24));  // a bright sauce ladle on top
    sauce.position.set(c.x+0.08,gy+0.24,c.z-0.05); scene.add(sauce);
    // 3 happy eaters; the middle one holds a slice
    const OFF=[[-1.05,-0.35],[0.0,-1.15],[1.05,-0.35]];
    OFF.forEach((o,i)=>{
      const sx=c.x+o[0], sz=c.z+o[1], sry=Math.atan2(c.x-sx,c.z-sz);
      const {group,parts}=makeChibi(sx,sz,sry,{...nextPal(),face:true});   // face:true → the setup squint scales a real eyes mesh (then bakeChibiRig folds it in → still 1 draw)
      poseSeated(group,parts,gy);
      parts.eyeL.scale.set(1,0.6,1); parts.eyeR.scale.set(1,0.6,1);       // happy squint
      if(i===1){                                                          // holding a slice up to the hand
        parts.armR.rotation.x=-1.75; parts.armR.rotation.z=0.05;
        const wedge=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,0.09,14,1,false,0,Math.PI/3.2),toon(0xe8b23c));
        wedge.rotation.set(-Math.PI/2,0,sry); wedge.position.set(sx+Math.sin(sry)*0.45,gy+1.45,sz+Math.cos(sry)*0.45);
        scene.add(wedge);
      }
      registerBumpable(group,parts,LINES_PEQUOD);
      bakeChibiRig(group,parts);        // seated + squint + slice pose set once (squint bakes in; the slice is a separate mesh) — baked → 1 draw
    });
    coolerSpots.push({x:c.x+1.3,z:c.z+0.6});
  }

  // ================================================================= //
  //  3) YOGA CLASS (85,325) — instructor + 5 students, synchronized poses
  // ================================================================= //
  const yogaStudents=[], yogaInstructor={parts:null};
  {
    const c=clearPath(85,325,'yoga'); const gy=groundY(c.x,c.z);
    const MATC=[0x6db2b0,0xd98aa6,0xe0b24a,0x7f9bd0,0x8fbf7a];
    // 5 student mats in 2 rows (3 + 2), all facing the instructor (+z, toward higher z)
    const rows=[ [[-2.0,0],[0,0],[2.0,0]], [[-1.0,-2.2],[1.0,-2.2]] ];
    let mi=0;
    for(const row of rows) for(const off of row){
      const sx=c.x+off[0], sz=c.z+off[1];
      matSpots.push({x:sx,z:sz,ry:0,col:MATC[mi++%MATC.length]});
      const {group,parts}=makeChibi(sx,sz,0,nextPal());     // ry=0 => faces +z (the instructor)
      poseSeated(group,parts,gy);
      registerBumpable(group,parts,LINES_YOGA);
      yogaStudents.push(parts);
    }
    // instructor up front (higher z) facing the class (-z => ry=PI), on their own mat
    const ix=c.x, iz=c.z+2.0;
    matSpots.push({x:ix,z:iz,ry:0,col:0xcf7f4a});
    const inst=makeChibi(ix,iz,Math.PI,nextPal());
    poseSeated(inst.group,inst.parts,gy);
    registerBumpable(inst.group,inst.parts,LINES_YOGA);
    yogaInstructor.parts=inst.parts;
  }

  // ================================================================= //
  //  4) READING CIRCLE (40,-280) — 4 seated readers, one reading aloud
  // ================================================================= //
  {
    const c=clearPath(40,-280,'reading-circle'); const gy=groundY(c.x,c.z);
    const R=1.35;
    for(let i=0;i<4;i++){
      const a=i/4*Math.PI*2 + 0.3;
      const sx=c.x+Math.cos(a)*R, sz=c.z+Math.sin(a)*R;
      const sry=Math.atan2(c.x-sx,c.z-sz);                  // face the circle center
      const {group,parts}=makeChibi(sx,sz,sry,nextPal());
      poseSeated(group,parts,gy);
      if(i===0){ parts.armR.rotation.x=-1.15; parts.armR.rotation.z=0.05; parts.head.rotation.x=-0.12; }  // the reader, arm raised
      // a little book held out in front of the hands
      bookSpots.push({x:sx+Math.sin(sry)*0.42, y:gy+0.62, z:sz+Math.cos(sry)*0.42, ry:sry, tilt:-0.55});
      registerBumpable(group,parts,LINES_READING);
      bakeChibiRig(group,parts);        // reader arm is posed once at setup (no interaction re-pose); book is a separate prop — baked → 1 draw
    }
  }

  // ================================================================= //
  //  5) GUITAR STRUMMER (112,270) — seated, animated strum + soft pluck loop
  // ================================================================= //
  const guitar={armR:null,x:0,z:0};
  {
    const c=clearPath(112,270,'guitar'); const gy=groundY(c.x,c.z);
    const ry=0.6;
    const {group,parts}=makeChibi(c.x,c.z,ry,nextPal());
    poseSeated(group,parts,gy);
    parts.armL.rotation.x=-1.1; parts.armL.rotation.z=0.4;                // fretting hand up the neck
    registerBumpable(group,parts,LINES_GUITAR);
    guitar.armR=parts.armR; guitar.x=c.x; guitar.z=c.z;
    // simple guitar: rounded box body + neck cylinder, laid across the lap
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.26,0.12,16),toon(0x8a4a26));
    body.rotation.set(Math.PI/2,0,ry); body.position.set(c.x+Math.sin(ry)*0.18,gy+0.9,c.z+Math.cos(ry)*0.18); scene.add(body);
    const hole=new THREE.Mesh(new THREE.CircleGeometry(0.08,12),toon(0x201408));
    hole.rotation.set(Math.PI/2-0.001,0,ry); hole.position.set(body.position.x,gy+0.965,body.position.z); scene.add(hole);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.8,8),toon(0x3a2414));
    // neck points up-and-left away from the body across the lap
    const nx=c.x+Math.sin(ry+1.5)*0.55, nz=c.z+Math.cos(ry+1.5)*0.55;
    neck.position.set(nx,gy+1.05,nz); neck.rotation.set(0.5,ry+1.5,0.9); scene.add(neck);
  }

  // ================================================================= //
  //  6) CORNHOLE — two sites (36,-160) & (100,315); angled boards + bags
  // ================================================================= //
  const boardMats=[], holeMats=[], throwers=[], beanSites=[];
  {
    const bumpQ=new THREE.Quaternion();                    // scratch during build
    const flatUp=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
    const BOARDL=1.9, BOARDW=0.9, TILT=-0.2;
    function makeBoard(bx,bz,gy,yaw){                       // yaw sets the raised (hole) end OUTBOARD; low lip faces the gap (issue 019)
      E.set(TILT,yaw,0,'YXZ'); Q.setFromEuler(E);
      M.compose(V.set(bx,gy+0.16,bz),Q,S.set(BOARDW,0.08,BOARDL)); boardMats.push(M.clone());
      // hole near the high (far) end, lying on the board surface
      const off=new THREE.Vector3(0,0.06,0.55).applyQuaternion(Q);
      bumpQ.copy(Q).multiply(flatUp);
      M.compose(V.set(bx+off.x,gy+0.16+off.y,bz+off.z),bumpQ,S.set(1,1,1)); holeMats.push(M.clone());
    }
    function throwerAt(tx,tz,gy,ry){
      const {group,parts}=makeChibi(tx,tz,ry,nextPal());
      group.position.y=gy;
      registerBumpable(group,parts,LINES_CORNHOLE);
      throwers.push({parts, base:-0.5, ph:rnd()*6.28});
    }
    function site(cfg){
      const c=clearPath(cfg.x,cfg.z,'cornhole'); const gy=groundY(c.x,c.z);
      let a,b,ta,tb;                                        // board A/B centers + thrower spots
      if(cfg.axis==='z'){
        a={x:c.x,z:c.z-4.5}; b={x:c.x,z:c.z+4.5};
        makeBoard(a.x,a.z,gy,Math.PI); makeBoard(b.x,b.z,gy,0);   // issue 019: low lips face the gap, raised ends outboard
        ta={x:c.x,z:c.z-6.6,ry:0}; tb={x:c.x,z:c.z+6.6,ry:Math.PI};
      }else{
        a={x:c.x-4.5,z:c.z}; b={x:c.x+4.5,z:c.z};
        makeBoard(a.x,a.z,gy,-Math.PI/2); makeBoard(b.x,b.z,gy,Math.PI/2);   // issue 019: low lips face the gap, raised ends outboard
        ta={x:c.x-6.6,z:c.z,ry:Math.PI/2}; tb={x:c.x+6.6,z:c.z,ry:-Math.PI/2};
      }
      throwerAt(ta.x,ta.z,gy,ta.ry); throwerAt(tb.x,tb.z,gy,tb.ry);
      // a bean bag arcing between the two board holes
      beanSites.push({ax:a.x,ay:gy+0.5,az:a.z, bx:b.x,by:gy+0.5,bz:b.z, t:rnd()*2.5, dur:2.6, dir:1});
    }
    site({x:36, z:-160, axis:'z'});
    site({x:100,z:315,  axis:'x'});
  }

  // ================================================================= //
  //  7) TODDLER CHASING GEESE (52,-118) — tiny chibi + trailing parent
  // ================================================================= //
  const toddler={group:null, tx:52, tz:-118, walkT:0, waitT:0, legL:null, legR:null, armL:null, armR:null};
  {
    // parent stands just east of the toddler's turf (clear of the west trail), arms slightly out
    const p=clearPath(57,-123,'toddler-parent'); const pgy=groundY(p.x,p.z);
    const par=makeChibi(p.x,p.z,Math.atan2(53-p.x,-118-p.z),nextPal());
    par.group.position.y=pgy;
    par.parts.armL.rotation.z=0.55; par.parts.armR.rotation.z=-0.55;      // reaching, watchful
    par.parts.armL.rotation.x=-0.2; par.parts.armR.rotation.x=-0.2;
    registerBumpable(par.group,par.parts,LINES_PARENT);
    bakeChibiRig(par.group,par.parts);   // the PARENT is static (only the toddler's limbs animate below) — baked → 1 draw
    // the toddler — small, chases a wandering point within (46..60, -126..-110)
    const t=makeChibi(52,-118,0,nextPal(),0.5);
    registerBumpable(t.group,t.parts,LINES_TODDLER);
    toddler.group=t.group; toddler.legL=t.parts.legL; toddler.legR=t.parts.legR;
    toddler.armL=t.parts.armL; toddler.armR=t.parts.armR;
    toddler.tx=53; toddler.tz=-120;
  }

  // ================================================================= //
  //  8) FARMERS-MARKET CART (32,-70) — striped awning, produce, 2 chibis
  // ================================================================= //
  {
    const c=clearPath(32,-70,'market-cart'); const gy=groundY(c.x,c.z);
    // wooden cart body + plank counter
    const cart=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.85,1.0),toon(0x9c6a3a));
    cart.position.set(c.x,gy+0.62,c.z); scene.add(cart);
    const counter=new THREE.Mesh(new THREE.BoxGeometry(2.14,0.1,1.12),toon(0xba8a54));
    counter.position.set(c.x,gy+1.06,c.z); scene.add(counter);
    // two wheels
    const wheels=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3,0.3,0.12,12),toon(0x5a3a20),2);
    [-0.85,0.85].forEach((dx,i)=>{ E.set(0,0,Math.PI/2); Q.setFromEuler(E); M.compose(V.set(c.x+dx,gy+0.3,c.z+0.5),Q,S.set(1,1,1)); wheels.setMatrixAt(i,M); });
    wheels.instanceMatrix.needsUpdate=true; scene.add(wheels);
    // awning posts + striped canopy tilted forward over the counter
    const posts=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03,0.03,1.4,6),toon(0x6a4a2c),2);
    [-0.95,0.95].forEach((dx,i)=>{ M.compose(V.set(c.x+dx,gy+1.75,c.z-0.4),qI,S.set(1,1,1)); posts.setMatrixAt(i,M); });
    posts.instanceMatrix.needsUpdate=true; scene.add(posts);
    const awn=new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.1),bmat(0xffffff,{map:awningTex(),side:THREE.DoubleSide}));
    awn.position.set(c.x,gy+2.35,c.z-0.02); awn.rotation.x=-1.05; scene.add(awn);
    // produce cubes on the counter (instanced, per-crate color)
    const PCOL=[0xd0463f,0x6db24a,0xe0a13a,0xdc7a3a,0xf0d84a];
    const cx0=c.x-0.75;
    for(let i=0;i<5;i++) produceSpots.push({x:cx0+i*0.37, y:gy+1.2, z:c.z+0.12, c:PCOL[i%PCOL.length]});
    // vendor behind the counter, browser in front
    const ven=makeChibi(c.x,c.z-0.85,0,nextPal());
    ven.group.position.y=gy; ven.parts.armR.rotation.x=-0.5; ven.parts.armL.rotation.x=-0.4;
    registerBumpable(ven.group,ven.parts,LINES_MARKET);
    bakeChibiRig(ven.group,ven.parts);   // static vendor pose — baked → 1 draw
    const bro=makeChibi(c.x+0.4,c.z+1.5,Math.PI,nextPal());
    bro.group.position.y=gy; bro.parts.body.rotation.x=0.14; bro.parts.head.rotation.x=0.1;  // leaning in to look
    registerBumpable(bro.group,bro.parts,LINES_MARKET);
    bakeChibiRig(bro.group,bro.parts);   // static leaning browser — baked → 1 draw
  }

  // ================================================================= //
  //  INSTANCED PROP BATCHES (one draw call per repeated type)
  // ================================================================= //
  function buildInst(spots,geo,mat,place){
    if(!spots.length)return null;
    const inst=new THREE.InstancedMesh(geo,mat,spots.length);
    inst.frustumCulled=false;
    spots.forEach((sp,i)=>place(sp,i,inst));
    inst.instanceMatrix.needsUpdate=true;
    if(inst.instanceColor)inst.instanceColor.needsUpdate=true;
    scene.add(inst);
    return inst;
  }
  buildInst(blanketSpots, new THREE.PlaneGeometry(2.8,2.2),
    curveMat(new THREE.MeshToonMaterial({side:THREE.DoubleSide})),
    (b,i,inst)=>{ E.set(0,b.ry,0);Q.setFromEuler(E);Q.multiply(flatX);
      M.compose(V.set(b.x,0.02,b.z),Q,S.set(1,1,1)); inst.setMatrixAt(i,M); inst.setColorAt(i,C.setHex(b.col)); });
  buildInst(matSpots, new THREE.PlaneGeometry(0.62,1.7),
    curveMat(new THREE.MeshToonMaterial({side:THREE.DoubleSide})),
    (b,i,inst)=>{ E.set(0,b.ry,0);Q.setFromEuler(E);Q.multiply(flatX);
      M.compose(V.set(b.x,0.03,b.z),Q,S.set(1,1,1)); inst.setMatrixAt(i,M); inst.setColorAt(i,C.setHex(b.col)); });
  buildInst(coolerSpots, new THREE.BoxGeometry(0.52,0.4,0.36), toon(0x3a6ea5),
    (c,i,inst)=>{ M.compose(V.set(c.x,0.2,c.z),qI,S.set(1,1,1)); inst.setMatrixAt(i,M); });
  buildInst(foodSpots, new THREE.SphereGeometry(0.1,7,6), toon(0xffffff,{}),      // fresh mat for setColorAt
    (f,i,inst)=>{ M.compose(V.set(f.x,f.y,f.z),qI,S.set(1,1,1)); inst.setMatrixAt(i,M); inst.setColorAt(i,C.setHex(f.c)); });
  buildInst(bookSpots, new THREE.BoxGeometry(0.5,0.34,0.06),
    curveMat(new THREE.MeshToonMaterial({color:0xf4ede0,side:THREE.DoubleSide})),
    (b,i,inst)=>{ E.set(b.tilt,b.ry,0);Q.setFromEuler(E); M.compose(V.set(b.x,b.y,b.z),Q,S.set(1,1,1)); inst.setMatrixAt(i,M); });
  buildInst(produceSpots, new THREE.BoxGeometry(0.28,0.28,0.28), toon(0xffffff,{}),   // fresh mat for setColorAt
    (p,i,inst)=>{ M.compose(V.set(p.x,p.y,p.z),qI,S.set(1,1,1)); inst.setMatrixAt(i,M); inst.setColorAt(i,C.setHex(p.c)); });

  // cornhole boards + holes (matrices already composed above)
  let boardMesh=null, holeMesh=null;
  if(boardMats.length){
    boardMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1), toon(0xc9a86a), boardMats.length);
    boardMats.forEach((m,i)=>boardMesh.setMatrixAt(i,m)); boardMesh.instanceMatrix.needsUpdate=true; scene.add(boardMesh);
    holeMesh=new THREE.InstancedMesh(new THREE.CircleGeometry(0.16,14), toon(0x1a140c), holeMats.length);
    holeMesh.frustumCulled=false;
    holeMats.forEach((m,i)=>holeMesh.setMatrixAt(i,m)); holeMesh.instanceMatrix.needsUpdate=true; scene.add(holeMesh);
  }
  // bean bags (one per site) — animated below
  const beanMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(0.14,0.07,0.14), toon(0xb03028), Math.max(1,beanSites.length));
  beanMesh.frustumCulled=false; scene.add(beanMesh);

  // ================================================================= //
  //  AUDIO — QUIET, sparse guitar pluck when the player is near
  // ================================================================= //
  const PLUCK=[57,60,64,67,69];                            // gentle A-minor-ish pentatonic
  function sPluck(){
    const {actx,sfxBus,mf}=getAudioCtx(); if(!actx)return; const t=actx.currentTime;
    const m=PLUCK[(rnd()*PLUCK.length)|0];
    const o=actx.createOscillator(),g=actx.createGain();
    o.type='triangle'; o.frequency.value=mf(m);
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.028,t+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.7);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t+0.75);
  }
  let pluckT=1.5;

  // ---- hoisted per-frame scratch (NO allocation in the loop) ----
  const _M=new THREE.Matrix4(), _M2=new THREE.Matrix4(), _V=new THREE.Vector3(), _Q=new THREE.Quaternion(),
        _E=new THREE.Euler(), _S=new THREE.Vector3(1,1,1), _qI=new THREE.Quaternion(), _one=new THREE.Vector3(1,1,1);
  const YOGA_PERIOD=8, _yA=[0,0,0,0,0,0], _yB=[0,0,0,0,0,0];
  // yoga poses: [armLx, armLz, armRx, armRz, bodyx, headx]
  const YPOSES=[
    [-2.9, 0.14, -2.9, -0.14, -0.10, -0.34],   // reach to the sky
    [-0.20,0.10, -0.30,-0.10,  0.70,  0.48],   // forward fold
    [-1.55,1.35, -1.55,-1.35,  0.00, -0.05],   // warrior arm spread
    [-0.35,0.14, -0.45,-0.14, -0.05,  0.00],   // easy seat
  ];
  function yogaPose(time,out){
    const ph=time/YOGA_PERIOD, i=((Math.floor(ph)%YPOSES.length)+YPOSES.length)%YPOSES.length;
    const f=smooth(ph-Math.floor(ph)), a=YPOSES[i], b=YPOSES[(i+1)%YPOSES.length];
    for(let k=0;k<6;k++) out[k]=a[k]+(b[k]-a[k])*f;
  }
  function applyYoga(parts,p){
    parts.armL.rotation.x=p[0]; parts.armL.rotation.z=p[1];
    parts.armR.rotation.x=p[2]; parts.armR.rotation.z=p[3];
    parts.body.rotation.x=p[4]; parts.head.rotation.x=p[5];
  }

  registerUpdate((dt,t,player) => {
    // --- birthday balloons: gentle bundle sway about the anchor ---
    if(balloonMesh){
      _Q.setFromEuler(_E.set(Math.sin(t*0.53+1.1)*0.06, 0, Math.sin(t*0.7)*0.09));
      _M.compose(balloonAnchor,_Q,_one);
      for(let i=0;i<balloonLocal.length;i++){
        _M2.multiplyMatrices(_M,balloonLocal[i]); balloonMesh.setMatrixAt(i,_M2);
        _M2.multiplyMatrices(_M,stringLocal[i]);  stringMesh.setMatrixAt(i,_M2);
      }
      balloonMesh.instanceMatrix.needsUpdate=true; stringMesh.instanceMatrix.needsUpdate=true;
    }

    // --- yoga: synchronized slow pose cycle; instructor leads by ~0.5 s ---
    if(yogaInstructor.parts){
      yogaPose(t+0.5,_yA); applyYoga(yogaInstructor.parts,_yA);         // instructor ahead
      yogaPose(t,_yB);
      for(let i=0;i<yogaStudents.length;i++) applyYoga(yogaStudents[i],_yB);
    }

    // --- guitar: strum-arm oscillation + quiet pluck when the player's near ---
    if(guitar.armR){
      guitar.armR.rotation.x=-1.35 + Math.sin(t*7.5)*0.28;
      guitar.armR.rotation.z=-0.15;
      const dx=player.x-guitar.x, dz=player.z-guitar.z;
      pluckT-=dt;
      if(pluckT<=0){ if(dx*dx+dz*dz<100) sPluck(); pluckT=1.8+rnd()*1.6; }
    }

    // --- cornhole: slow underhand toss arms + arcing bean bags ---
    for(let i=0;i<throwers.length;i++){
      const th=throwers[i]; const s=Math.sin(t*1.1+th.ph);
      th.parts.armR.rotation.x = th.base + s*0.9;                        // wind back / swing through
      th.parts.armR.rotation.z = -0.1;
    }
    for(let i=0;i<beanSites.length;i++){
      const bs=beanSites[i]; bs.t+=dt;
      let s=clamp(bs.t/bs.dur,0,1);
      if(s>=1){ bs.t=0; bs.dir*=-1; s=0; }
      const fx = bs.dir>0?bs.ax:bs.bx, fz=bs.dir>0?bs.az:bs.bz;
      const gx = bs.dir>0?bs.bx:bs.ax, gz=bs.dir>0?bs.bz:bs.az;
      const y  = lerp(bs.ay,bs.by,s) + 2.2*4*s*(1-s);                     // gentle arc
      _M.compose(_V.set(lerp(fx,gx,s), y, lerp(fz,gz,s)), _qI, _S.set(1,1,1));
      beanMesh.setMatrixAt(i,_M);
    }
    if(beanSites.length){ beanMesh.instanceMatrix.needsUpdate=true; }

    // --- toddler: short zig-zag bursts after a wandering point, giggling ---
    {
      const g=toddler.group; let dx=toddler.tx-g.position.x, dz=toddler.tz-g.position.z, d=Math.hypot(dx,dz);
      let sp=0;
      if(toddler.waitT>0){ toddler.waitT-=dt; }
      else if(d<0.4){                                                    // reached point -> brief pause, pick a new wander point
        toddler.waitT=0.5+rnd()*0.9;
        toddler.tx=46+rnd()*14;                                          // within (46..60)
        toddler.tz=-126+rnd()*16;                                        // within (-126..-110)
      }else{
        sp=2.4; const step=Math.min(d,sp*dt);
        g.position.x+=dx/d*step; g.position.z+=dz/d*step;
        g.rotation.y=Math.atan2(dx,dz);
      }
      toddler.walkT+=sp*dt*3.2;
      const amt=clamp(sp/2.4,0,1), sw=Math.sin(toddler.walkT)*amt;
      toddler.legL.rotation.x=sw*0.9; toddler.legR.rotation.x=-sw*0.9;
      toddler.armL.rotation.x=-sw*0.7; toddler.armR.rotation.x=sw*0.7;
    }
  });
});
