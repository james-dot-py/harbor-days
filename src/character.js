import * as THREE from 'three';
import { scene, toon, curveMat, clamp } from './core.js';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ----------------------- the mayor (our hero) --------------------------
export const mayor=new THREE.Group();
export const mparts={};
let walkT=0;

// ---- draw-call merge helpers (chibi rigs are dozens-in-view at hot spots) ----
// One SHARED white toon material driven by per-vertex color: white × vertex
// color is identical to a per-color toon material under r128's default
// LinearEncoding, so many differently-tinted parts collapse to ONE material and
// each merged limb is a single draw call. Created once (toon() with opts is
// uncached), then reused by every chibi.
let _vcMat=null;
const vcMat=()=>_vcMat||(_vcMat=toon(0xffffff,{mat:{vertexColors:true}}));
const _zAxis=new THREE.Vector3(0,0,1);
// vcGeo(geo,hex): non-index geo + stamp a solid 'color' attribute so it can be
// merged under vcMat. Every chibi primitive has position/normal/uv, so merged
// sets stay attribute-consistent.
function vcGeo(geo,hex){
  geo=geo.toNonIndexed();
  const c=new THREE.Color(hex),n=geo.attributes.position.count,a=new Float32Array(n*3);
  for(let i=0;i<n;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}
  geo.setAttribute('color',new THREE.BufferAttribute(a,3));return geo;
}
const mergeVC=arr=>BufferGeometryUtils.mergeBufferGeometries(arr,false);                         // vcGeo inputs (already non-indexed)
const mergeGeo=arr=>BufferGeometryUtils.mergeBufferGeometries(arr.map(g=>g.index?g.toNonIndexed():g),false); // hair (single-material, no colors)

// createChibi — parameterized chibi builder shared by the mayor and the
// framework's makeNPC(). Consumes NO rng (fully deterministic geometry);
// pass explicit palette colors. Static sub-meshes are baked into vertex-colored
// merges to cut draw calls: each leg = leg+shoe, each arm = arm+hand, the head =
// head+cheeks, and bun/afro extras fold into the hair. Only nodes that ANIMATE
// (legs/arms/body/head/hair rotate or bob) or HOLD props (hands) stay live.
//   palette:{ suit, pants, skin, hair, shoe?, hairStyle?, scale? }
//   returns { group, parts }  (parts: legL/legR (leg+shoe), body, armL/armR
//   (arm+hand), handL/handR (live empty nodes for held items), head (head+
//   cheeks), hair, eyeL/eyeR, shadow)
export function createChibi({suit,pants,skin,hair,shoe=0x57351f,hairStyle,scale=1,bigEyes=false,cheek=0xffa1a1}){
  const group=new THREE.Group(),parts={};group.name='chibi';   // named so the static cell-merge pass can exempt live rigs
  const suitM=toon(suit),hairM=toon(hair);
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(0.62,16),new THREE.MeshBasicMaterial({color:0x1e4a33,transparent:true,opacity:0.3,depthWrite:false}));
  curveMat(shadow.material);shadow.rotation.x=-Math.PI/2;shadow.position.y=0.02;group.add(shadow);parts.shadow=shadow;
  for(const s of[-1,1]){
    // leg cylinder + its shoe sphere (scale/offset baked) -> one merged mesh
    const legGeo=vcGeo(new THREE.CylinderGeometry(0.15,0.13,0.55,7).translate(0,-0.275,0),pants);
    const shoeGeo=vcGeo(new THREE.SphereGeometry(0.17,8,7).scale(1,0.6,1.35).translate(0,-0.6,0.05),shoe);
    const lc=legGeo.attributes.position.count,sc=shoeGeo.attributes.position.count;
    const leg=new THREE.Mesh(mergeVC([legGeo,shoeGeo]),vcMat());leg.position.set(s*0.2,0.72,0);
    leg.userData.vc={leg:[0,lc],shoe:[lc,sc]};group.add(leg);parts['leg'+(s<0?'L':'R')]=leg;
  }
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.62,12,11),suitM);body.scale.set(1,1.12,0.82);body.position.y=1.18;group.add(body);parts.body=body;
  for(const s of[-1,1]){
    const hl=new THREE.Vector3(s*0.14,-0.6,0).applyAxisAngle(_zAxis,-s*0.25);   // hand offset in the arm's local frame
    const armGeo=vcGeo(new THREE.CylinderGeometry(0.12,0.11,0.6,7).translate(0,-0.3,0),suit);
    const handGeo=vcGeo(new THREE.SphereGeometry(0.11,7,6).translate(hl.x,hl.y,hl.z),skin);
    const ac=armGeo.attributes.position.count,hc=handGeo.attributes.position.count;
    const arm=new THREE.Mesh(mergeVC([armGeo,handGeo]),vcMat());arm.position.set(s*0.62,1.62,0);arm.rotation.z=s*0.25;
    arm.userData.vc={arm:[0,ac],hand:[ac,hc]};group.add(arm);parts['arm'+(s<0?'L':'R')]=arm;
    // hand stays a LIVE empty node at the baked hand position: packs parent held
    // props into it (and read its world pos); it swings with the arm for free.
    const hand=new THREE.Group();hand.position.copy(hl);arm.add(hand);parts['hand'+(s<0?'L':'R')]=hand;
  }
  // head + cheeks merged; cheeks now bob with the head (≤0.066 m, only while walking — accepted)
  const headGeo=vcGeo(new THREE.SphereGeometry(0.56,13,12),skin);
  const cheekGeos=[];
  for(const s of[-1,1])cheekGeos.push(vcGeo(new THREE.SphereGeometry(0.075,6,6).scale(1,1,0.4).translate(s*0.34,-0.10,0.44),cheek));
  const head=new THREE.Mesh(mergeVC([headGeo,...cheekGeos]),vcMat());head.position.y=2.22;group.add(head);parts.head=head;
  // hair — single toon(hair) material; bun/afro extras fold into the geometry.
  // The per-frame gait forces parts.hair.position.y to 2.4, so we anchor the
  // hair mesh at y=2.4 (bun's/afro's designed base baked into the geometry) and
  // express extras relative to 2.4 — keeps the extras' world positions identical
  // whether the rig is statically posed or animated.
  let hair2;
  if(hairStyle==='bun'){
    const base=new THREE.SphereGeometry(0.585,13,12).scale(1,0.82,1);         // default cap (scale baked so the bun stays round)
    const bun=new THREE.SphereGeometry(0.24,9,8).translate(0,0.34,-0.06);     // (0,2.74,-0.16) - (0,2.4,-0.1)
    hair2=new THREE.Mesh(mergeGeo([base,bun]),hairM);hair2.position.set(0,2.4,-0.1);
  }else if(hairStyle==='afro'){ // small round afro: compact cap on top-back —
    // must NOT reach the face plane (z<0.35 at eye height) or eyes float on hair
    const base=new THREE.SphereGeometry(0.42,12,11);base.scale(1.15,1,1.1);base.translate(0,0.32,0);   // cap at (0,2.72,-0.16) with the mesh at 2.4
    const geos=[base];
    for(const s of[-1,1])geos.push(new THREE.SphereGeometry(0.15,8,7).translate(s*0.4,0.16,-0.02));    // puffs (±0.4,2.56,-0.18)
    geos.push(new THREE.SphereGeometry(0.22,8,7).translate(0,0.10,-0.26));                              // back (0,2.5,-0.42)
    hair2=new THREE.Mesh(mergeGeo(geos),hairM);hair2.position.set(0,2.4,-0.16);
  }else{
    hair2=new THREE.Mesh(new THREE.SphereGeometry(0.585,13,12),hairM);hair2.scale.set(1,0.82,1);hair2.position.set(0,2.4,-0.1);
    if(hairStyle==='tall'){hair2.scale.set(1.03,1.08,1.03);hair2.position.y=2.5;}
  }
  group.add(hair2);parts.hair=hair2;
  const eyeR=bigEyes?0.088:0.055;
  for(const s of[-1,1]){   // eyes stay live meshes: setFace() scales them per-expression
    const eye=new THREE.Mesh(new THREE.SphereGeometry(eyeR,7,7),toon(0x1d1712));eye.position.set(s*0.19,2.28,0.5);group.add(eye);parts['eye'+(s<0?'L':'R')]=eye;
    if(bigEyes){const gl=new THREE.Mesh(new THREE.SphereGeometry(0.028,5,5),curveMat(new THREE.MeshBasicMaterial({color:0xffffff})));
      gl.position.set(s*0.16,2.32,0.55);group.add(gl);}
  }
  if(scale!==1)group.scale.setScalar(scale);
  return {group,parts};
}

// tintChibiLimb(mesh,part,hex): recolor one baked sub-range of a merged limb
// (part='leg'|'shoe'|'arm'|'hand') by rewriting its 'color' vertices — leaves
// the other baked part (e.g. skin hand / shoe) untouched. Rare call (jersey
// recycling); no per-frame use.
export function tintChibiLimb(mesh,part,hex){
  const range=mesh.userData.vc&&mesh.userData.vc[part];if(!range)return;
  const [start,count]=range,c=new THREE.Color(hex),attr=mesh.geometry.attributes.color;
  for(let i=start;i<start+count;i++)attr.setXYZ(i,c.r,c.g,c.b);
  attr.needsUpdate=true;
}

export function buildMayor(){
  // build the shared chibi with the mayor's EXACT palette, then reparent its
  // parts directly onto `mayor` (keeps the historical flat hierarchy + no rng).
  // the mayor: warm dark brown skin, small grey afro, big beady eyes
  const {group,parts}=createChibi({suit:0x35406e,pants:0x2b3357,skin:0x6e4632,hair:0xb5aea6,hairStyle:'afro',bigEyes:true,cheek:0xa1614c});
  while(group.children.length)mayor.add(group.children[0]);
  Object.assign(mparts,parts);
  // mayoral regalia — sash / star / tie (mayor-only; NPCs skip these)
  const sash=new THREE.Mesh(new THREE.BoxGeometry(0.2,1.16,0.06),toon(0xa8dcf2));sash.position.set(0.02,1.2,0.47);sash.rotation.z=0.62;sash.rotation.x=0.12;mayor.add(sash);
  const star=new THREE.Mesh(new THREE.OctahedronGeometry(0.09,0),toon(0xff5a5a));star.position.set(0.2,1.02,0.52);star.scale.z=0.5;mayor.add(star);
  const tie=new THREE.Mesh(new THREE.ConeGeometry(0.09,0.3,4),toon(0xc4453b));tie.position.set(0,1.52,0.5);tie.rotation.x=0.2;mayor.add(tie);
  mayor.scale.setScalar(0.74);
  mayor.position.set(38.5,0,58);
  scene.add(mayor);
}

// ---- walk / idle animation (per frame) ----
export function updateCharacter(sp,dt,t){
  walkT+=sp*dt*2.6;
  const amt=clamp(sp/4.2,0,1.25),sw=Math.sin(walkT)*amt;
  mparts.legL.rotation.x=sw*0.85;mparts.legR.rotation.x=-sw*0.85;
  mparts.armL.rotation.x=-sw*0.75;mparts.armR.rotation.x=sw*0.75;
  const bob=Math.abs(Math.sin(walkT))*0.06*amt;
  mparts.body.position.y=1.18+bob;
  mparts.head.position.y=2.22+bob*1.1;
  mparts.hair.position.y=2.4+bob*1.1;
  mparts.body.rotation.x=0.09*amt;
  if(amt<0.05)mparts.body.scale.y=1.12+Math.sin(t*2)*0.012;
}
