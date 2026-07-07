import * as THREE from 'three';
import { scene, rng, rand, hexRGB, game, pointsMat, $ } from './core.js';
import { cam } from './input.js';
import { mayor } from './character.js';
import { mmPing } from './minimap.js';
import { sLaunch, sBoom, sCrackleBurst, sPop } from './audio.js';

// ---------------------------- particles --------------------------------
export class PSys{
  constructor(cap){
    this.cap=cap;this.head=0;
    this.px=new Float32Array(cap);this.py=new Float32Array(cap);this.pz=new Float32Array(cap);
    this.vx=new Float32Array(cap);this.vy=new Float32Array(cap);this.vz=new Float32Array(cap);
    this.br=new Float32Array(cap);this.bg=new Float32Array(cap);this.bb=new Float32Array(cap);
    this.life=new Float32Array(cap);this.max=new Float32Array(cap);
    this.sz=new Float32Array(cap);this.grav=new Float32Array(cap);this.drag=new Float32Array(cap);
    this.delay=new Float32Array(cap);
    const g=new THREE.BufferGeometry();
    this.aPos=new Float32Array(cap*3).fill(-999);
    this.aCol=new Float32Array(cap*3);this.aSize=new Float32Array(cap);
    g.setAttribute('position',new THREE.BufferAttribute(this.aPos,3));
    g.setAttribute('aColor',new THREE.BufferAttribute(this.aCol,3));
    g.setAttribute('aSize',new THREE.BufferAttribute(this.aSize,1));
    this.pts=new THREE.Points(g,pointsMat());this.pts.frustumCulled=false;scene.add(this.pts);
  }
  spawn(x,y,z,vx,vy,vz,r,g,b,life,size,grav=0,drag=0,delay=0){
    const i=this.head;this.head=(this.head+1)%this.cap;
    this.px[i]=x;this.py[i]=y;this.pz[i]=z;this.vx[i]=vx;this.vy[i]=vy;this.vz[i]=vz;
    this.br[i]=r;this.bg[i]=g;this.bb[i]=b;this.life[i]=life;this.max[i]=life;
    this.sz[i]=size;this.grav[i]=grav;this.drag[i]=drag;this.delay[i]=delay;
  }
  update(dt){
    const P=this.aPos,C=this.aCol,S=this.aSize;
    for(let i=0;i<this.cap;i++){
      if(this.life[i]<=0){P[i*3+1]=-999;S[i]=0;continue}
      if(this.delay[i]>0){this.delay[i]-=dt;P[i*3+1]=-999;S[i]=0;continue}
      this.life[i]-=dt;
      if(this.life[i]<=0){P[i*3+1]=-999;S[i]=0;continue}
      const dr=Math.max(0,1-this.drag[i]*dt);
      this.vx[i]*=dr;this.vy[i]*=dr;this.vz[i]*=dr;
      this.vy[i]-=this.grav[i]*dt;
      this.px[i]+=this.vx[i]*dt;this.py[i]+=this.vy[i]*dt;this.pz[i]+=this.vz[i]*dt;
      const f=this.life[i]/this.max[i],gl=f>0.85?1.6:1;
      P[i*3]=this.px[i];P[i*3+1]=this.py[i];P[i*3+2]=this.pz[i];
      C[i*3]=this.br[i]*f*gl;C[i*3+1]=this.bg[i]*f*gl;C[i*3+2]=this.bb[i]*f*gl;
      S[i]=this.sz[i]*(0.35+0.65*f);
    }
    this.pts.geometry.attributes.position.needsUpdate=true;
    this.pts.geometry.attributes.aColor.needsUpdate=true;
    this.pts.geometry.attributes.aSize.needsUpdate=true;
  }
}
export const FX=new PSys(4200),DUST=new PSys(700);

// ---------------------------- fireworks --------------------------------
export const FW_TYPES=[
  {name:'Peony',c:0xff9ec7},
  {name:'Willow',c:0xffd27a},
  {name:'Crackle',c:0xfff3c4},
  {name:'Chicago Flag',c:0xa8dcf2},
];
export const fw={type:0,cool:0,shake:0,ambPulse:0};
export const rockets=[],scheduled=[],boomLights=[];
export function setType(i){
  fw.type=i;
  const t=FW_TYPES[i];
  $('pname').textContent=t.name;
  const hx='#'+t.c.toString(16).padStart(6,'0');
  $('pdot').style.background=hx;
  $('pdot').style.boxShadow=`0 0 8px 1px ${hx}cc`;
}
export function tryLaunch(){
  if(fw.cool>0||!game.running)return;fw.cool=0.28;sLaunch();
  const T=1.35+rng()*0.4,ty=13+rng()*6,df=26+rng()*8;
  const fx=Math.sin(cam.yaw),fz=Math.cos(cam.yaw);
  const jx=rand(-1.6,1.6),jz=rand(-1.6,1.6);
  rockets.push({x:mayor.position.x,y:1.4,z:mayor.position.z,t:0,T,
    vx:(fx*df+jx)/T,vy:(ty-1.4+4.5*T*T)/T,vz:(fz*df+jz)/T,type:fw.type});
}
function addBoom(x,y,z){
  if(boomLights.length>=3)return;
  const L=new THREE.PointLight(0xffe2b8,12,80,2);L.position.set(x,y,z);
  scene.add(L);boomLights.push({L,t:0.6});
}
export function burst(x,y,z,count,speed,rgb,life,size,grav=0,drag=0,flat=1){
  for(let k=0;k<count;k++){
    const u=rng()*2-1,th=rng()*Math.PI*2,r=Math.sqrt(1-u*u);
    const dx=r*Math.cos(th),dy=u*flat,dz=r*Math.sin(th);
    const sp=speed*(0.35+0.65*rng());
    FX.spawn(x,y,z,dx*sp,dy*sp,dz*sp,rgb[0],rgb[1],rgb[2],life*(0.7+0.6*rng()),size,grav,drag);
  }
}
export const PASTELS=[0xff9ec7,0x9ef2c0,0xc3a8ff,0xffd98a,0x9edcff];
function explode(r){
  const{x,y,z,type}=r;
  fw.shake=Math.min(fw.shake+0.25,0.6);fw.ambPulse=Math.min(0.45,fw.ambPulse+0.28);
  addBoom(x,y,z);sBoom();mmPing(x,z);
  if(type===0){
    const rgb=hexRGB(PASTELS[rng()*PASTELS.length|0]);
    burst(x,y,z,210,13.5,rgb,1.7,3,3.2,0.9);
    burst(x,y,z,26,4.5,[1,1,1],0.5,4,1,0.5);
  }else if(type===1){
    burst(x,y,z,240,9.5,hexRGB(0xffce7a),2.7,2.6,4,1.5);
    burst(x,y,z,20,3,[1,1,1],0.4,3.4,1,0.5);
  }else if(type===2){
    burst(x,y,z,90,8,hexRGB(0xeef2ff),0.65,2.8,2,1);
    for(let k=0;k<64;k++){
      const u=rng()*2-1,th=rng()*Math.PI*2,rr2=Math.sqrt(1-u*u);
      const d=[rr2*Math.cos(th),u,rr2*Math.sin(th)],rr=rng()*7;
      FX.spawn(x+d[0]*rr,y+d[1]*rr,z+d[2]*rr,d[0],d[1],d[2],1,0.97,0.85,0.16,3.6,1,0,rng()*1.4);
    }
    sCrackleBurst();
  }else{
    burst(x,y,z,190,12,hexRGB(0xa8dcf2),1.6,3,3,0.9,0.35);
    const rx=-Math.cos(cam.yaw),rz=Math.sin(cam.yaw);
    [-7.5,-2.5,2.5,7.5].forEach((off,k)=>{
      scheduled.push({t:game.tNow+0.55+k*0.04,fn:()=>{
        burst(x+rx*off,y-1,z+rz*off,46,4.5,hexRGB(0xff4d4d),1.1,2.6,2.4,0.8);sPop();
      }});
    });
  }
}

// ---- fireworks per-frame update ----
export function updateFireworks(dt){
  fw.cool=Math.max(0,fw.cool-dt);
  for(let i=rockets.length-1;i>=0;i--){
    const r=rockets[i];r.t+=dt;
    r.x+=r.vx*dt;r.y+=r.vy*dt;r.z+=r.vz*dt;r.vy-=9*dt;
    DUST.spawn(r.x,r.y,r.z,rand(-0.4,0.4),rand(-1.2,-0.4),rand(-0.4,0.4),1,0.82,0.5,0.32,1.6,2,1);
    if(r.t>=r.T){explode(r);rockets.splice(i,1)}
  }
  for(let i=scheduled.length-1;i>=0;i--)if(game.tNow>=scheduled[i].t){scheduled[i].fn();scheduled.splice(i,1)}
  for(let i=boomLights.length-1;i>=0;i--){
    const b=boomLights[i];b.t-=dt;
    if(b.t<=0){scene.remove(b.L);boomLights.splice(i,1)}
    else b.L.intensity=12*b.t/0.6;
  }
  FX.update(dt);DUST.update(dt);
}
