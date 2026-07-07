import * as THREE from 'three';
import { scene, toon, curveMat, clamp } from './core.js';

// ----------------------- the mayor (our hero) --------------------------
export const mayor=new THREE.Group();
export const mparts={};
let walkT=0;

// createChibi — parameterized chibi builder shared by the mayor and the
// framework's makeNPC(). Consumes NO rng (fully deterministic geometry);
// pass explicit palette colors. The rig is nested: each shoe is a CHILD of
// its leg and each hand a CHILD of its arm, so the walk swing propagates
// for free — never re-add manual foot/hand position animation.
//   palette:{ suit, pants, skin, hair, shoe?, hairStyle?, scale? }
//   returns { group, parts }  (parts: legL/legR, shoeL/shoeR, body,
//   armL/armR, handL/handR, head, hair, eyeL/eyeR, cheekL/cheekR, shadow)
export function createChibi({suit,pants,skin,hair,shoe=0x57351f,hairStyle,scale=1,bigEyes=false,cheek=0xffa1a1}){
  const group=new THREE.Group(),parts={};
  const suitM=toon(suit),skinM=toon(skin),hairM=toon(hair),pantM=toon(pants),shoeM=toon(shoe);
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(0.62,16),new THREE.MeshBasicMaterial({color:0x1e4a33,transparent:true,opacity:0.3,depthWrite:false}));
  curveMat(shadow.material);shadow.rotation.x=-Math.PI/2;shadow.position.y=0.02;group.add(shadow);parts.shadow=shadow;
  for(const s of[-1,1]){
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.13,0.55,7),pantM);
    leg.geometry.translate(0,-0.275,0);leg.position.set(s*0.2,0.72,0);group.add(leg);parts['leg'+(s<0?'L':'R')]=leg;
    const sh=new THREE.Mesh(new THREE.SphereGeometry(0.17,8,7),shoeM);sh.scale.set(1,0.6,1.35);sh.position.set(0,-0.6,0.05);leg.add(sh);parts['shoe'+(s<0?'L':'R')]=sh;
  }
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.62,12,11),suitM);body.scale.set(1,1.12,0.82);body.position.y=1.18;group.add(body);parts.body=body;
  for(const s of[-1,1]){
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.11,0.6,7),suitM);
    arm.geometry.translate(0,-0.3,0);arm.position.set(s*0.62,1.62,0);arm.rotation.z=s*0.25;group.add(arm);parts['arm'+(s<0?'L':'R')]=arm;
    const hand=new THREE.Mesh(new THREE.SphereGeometry(0.11,7,6),skinM);
    hand.position.set(s*0.14,-0.6,0).applyAxisAngle(new THREE.Vector3(0,0,1),-s*0.25);arm.add(hand);parts['hand'+(s<0?'L':'R')]=hand;
  }
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.56,13,12),skinM);head.position.y=2.22;group.add(head);parts.head=head;
  const hair2=new THREE.Mesh(new THREE.SphereGeometry(0.585,13,12),hairM);hair2.scale.set(1,0.82,1);hair2.position.set(0,2.4,-0.1);
  if(hairStyle==='tall'){hair2.scale.set(1.03,1.08,1.03);hair2.position.y=2.5;}
  else if(hairStyle==='bun'){const bun=new THREE.Mesh(new THREE.SphereGeometry(0.24,9,8),hairM);bun.position.set(0,2.74,-0.16);group.add(bun);}
  else if(hairStyle==='afro'){ // small round afro: compact cap on top-back —
    // must NOT reach the face plane (z<0.35 at eye height) or eyes float on hair
    hair2.geometry=new THREE.SphereGeometry(0.42,12,11);
    hair2.scale.set(1.15,1,1.1);hair2.position.set(0,2.72,-0.16);
    for(const s of[-1,1]){const puff=new THREE.Mesh(new THREE.SphereGeometry(0.15,8,7),hairM);puff.position.set(s*0.4,2.56,-0.18);group.add(puff);}
    const back=new THREE.Mesh(new THREE.SphereGeometry(0.22,8,7),hairM);back.position.set(0,2.5,-0.42);group.add(back);
  }
  group.add(hair2);parts.hair=hair2;
  const eyeR=bigEyes?0.088:0.055;
  for(const s of[-1,1]){
    const eye=new THREE.Mesh(new THREE.SphereGeometry(eyeR,7,7),toon(0x1d1712));eye.position.set(s*0.19,2.28,0.5);group.add(eye);parts['eye'+(s<0?'L':'R')]=eye;
    if(bigEyes){const gl=new THREE.Mesh(new THREE.SphereGeometry(0.028,5,5),curveMat(new THREE.MeshBasicMaterial({color:0xffffff})));
      gl.position.set(s*0.16,2.32,0.55);group.add(gl);}
    const ch=new THREE.Mesh(new THREE.SphereGeometry(0.075,6,6),toon(cheek));ch.scale.z=0.4;ch.position.set(s*0.34,2.12,0.44);group.add(ch);parts['cheek'+(s<0?'L':'R')]=ch;
  }
  if(scale!==1)group.scale.setScalar(scale);
  return {group,parts};
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
