import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { scene, rng, rand, toon, bmat, curveMat, gmap, pointsMat, pip, WATER_Y } from './core.js';
import { COAST_SEGS, tierProfile, profileTotal, beachH, LAND } from './coast.js';
import { pathSamples, mainCurve } from './paths.js';
import * as CH from './data/chicago.js';

// --------------------------- world props ------------------------------
export const colliders=[];
export const walkRects=[];
export function collide(x,z,r,h=Infinity){colliders.push({x,z,r,h})}   // h: jumpable when player.y > h

export const bobbers=[];
export let drifter=null;
export let dogTail=null;
export const foam={pts:null,ph:[],base:[]};
export const fireflies={n:70,base:[],ph:[]};
const treeSpots=[];

// LOCAL deterministic rng (mulberry32) for per-tree cosmetic randomness ONLY.
// Never touches the shared world rng() — seed it per tree so tree placement
// (and every downstream prop that consumes rng after it) stays byte-identical.
function m32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// ---- signs / lamps / benches ----
function makeSign(text,x,z,ry){
  const cv=document.createElement('canvas');cv.width=512;cv.height=128;const g=cv.getContext('2d');
  g.fillStyle='#fdf6e6';g.beginPath();g.roundRect(6,6,500,116,26);g.fill();
  g.strokeStyle='#c9a97a';g.lineWidth=8;g.stroke();
  g.fillStyle='#4a3b2f';g.textAlign='center';g.textBaseline='middle';
  let fs=52;g.font=`700 ${fs}px "Trebuchet MS",sans-serif`;
  while(g.measureText(text).width>470&&fs>24){fs-=2;g.font=`700 ${fs}px "Trebuchet MS",sans-serif`;}
  g.fillText(text,256,68);
  const tex=new THREE.CanvasTexture(cv);
  const grp=new THREE.Group();
  const post=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.11,1.7,6),toon(0xa9713f));post.position.y=0.85;grp.add(post);
  const board=new THREE.Mesh(new THREE.PlaneGeometry(3.4,0.85),curveMat(new THREE.MeshBasicMaterial({map:tex})));board.position.y=1.9;grp.add(board);
  const back=new THREE.Mesh(new THREE.PlaneGeometry(3.4,0.85),bmat(0xe8d7b4));back.rotation.y=Math.PI;back.position.y=1.9;grp.add(back);
  grp.position.set(x,0,z);grp.rotation.y=ry;scene.add(grp);collide(x,z,0.5);
}
// (lamps + benches are built as InstancedMeshes in buildProps below)
// ---- pier + basin dock (with rails, posts to the water) ----
function plankDeck(x1,x2,z1,z2,y){
  const grp=new THREE.Group(),wm=toon(0xb07a46),wm2=toon(0x9c6a3a);
  const w=x2-x1,d=z2-z1;
  const deck=new THREE.Mesh(new THREE.BoxGeometry(w,0.24,d),wm);deck.position.set((x1+x2)/2,y,(z1+z2)/2);grp.add(deck);
  for(let px=x1+1;px<x2;px+=3.4)for(const pz of[z1+0.4,z2-0.4]){
    const post=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,y+3.4,6),wm2);post.position.set(px,(y-3.4)/2+0.55,pz);grp.add(post);
    const knob=new THREE.Mesh(new THREE.SphereGeometry(0.19,7,6),wm2);knob.position.set(px,y+1.05,pz);grp.add(knob);
    const railSeg=new THREE.Mesh(new THREE.BoxGeometry(3.4,0.09,0.09),wm2);railSeg.position.set(px+1.7,y+0.95,pz);if(px+3.4<x2+1)grp.add(railSeg);
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.85,5),wm2);stem.position.set(px,y+0.55,pz);grp.add(stem);
  }
  scene.add(grp);
}
// ---- boats / buoys ----
function makeBoat(x,z,ry,hullC,sailC,scale=1){
  const grp=new THREE.Group();
  const hull=new THREE.Mesh(new THREE.SphereGeometry(1.6,12,10),toon(hullC));hull.scale.set(0.62,0.42,1);grp.add(hull);
  const rim=new THREE.Mesh(new THREE.SphereGeometry(1.62,12,10),toon(0x7a5a3a));rim.scale.set(0.6,0.16,0.98);rim.position.y=0.42;grp.add(rim);
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,3.6,6),toon(0x8a6a4a));mast.position.y=2.1;grp.add(mast);
  const sailShape=new THREE.Shape();sailShape.moveTo(0,0);sailShape.lineTo(1.45,0);sailShape.quadraticCurveTo(0.55,1.3,0,2.6);sailShape.closePath();
  const sail=new THREE.Mesh(new THREE.ShapeGeometry(sailShape),curveMat(new THREE.MeshToonMaterial({color:sailC,gradientMap:gmap,side:THREE.DoubleSide})));
  sail.position.set(0.06,0.95,0);sail.rotation.y=Math.PI/2;grp.add(sail);
  grp.position.set(x,WATER_Y+0.24,z);grp.rotation.y=ry;grp.scale.setScalar(scale*2.1);
  grp.userData={by:WATER_Y+0.24,ph:rand(0,9)};scene.add(grp);bobbers.push(grp);
  return grp;
}
function makeBuoy(x,z,c){
  const grp=new THREE.Group();
  const body=new THREE.Mesh(new THREE.ConeGeometry(0.5,1.3,8),toon(c));body.position.y=0.5;grp.add(body);
  const tip=new THREE.Mesh(new THREE.SphereGeometry(0.16,7,6),toon(0xfdf6e6));tip.position.y=1.25;grp.add(tip);
  grp.position.set(x,WATER_Y+0.1,z);grp.userData={by:WATER_Y+0.1,ph:rand(0,9)};scene.add(grp);bobbers.push(grp);
}

export function buildProps(){
  // ---- trees ----
  {
    const T=CH.TREES;
    const inGarden=(x,z)=>x>T.garden.x0&&x<T.garden.x1&&z>T.garden.z0&&z<T.garden.z1;
    const nearPath=(x,z)=>{for(let i=0;i<pathSamples.length;i+=3){const p=pathSamples[i];if((p[0]-x)**2+(p[1]-z)**2<T.nearPathD2)return true}return false};
    let guard=0;
    while(treeSpots.length<T.count&&guard++<T.guard){
      const x=rand(T.region.xr[0],T.region.xr[1]),z=rand(T.region.zr[0],T.region.zr[1]);
      if(!pip(x,z,LAND))continue;
      if(inGarden(x,z)||nearPath(x,z))continue;
      if(x>T.dogBeach.xMin&&z<T.dogBeach.zMax&&z>T.dogBeach.zMin)continue;   // dog beach area
      let ok=true;for(const t of treeSpots)if((t[0]-x)**2+(t[1]-z)**2<T.minGapD2){ok=false;break}
      if(ok)treeSpots.push([x,z,rand(T.scale[0],T.scale[1]),rng()<T.pinkProb]);
    }
    for(const f of T.fixed)treeSpots.push(f);
    for(let i=0;i<T.north.count;i++)treeSpots.push([rand(T.north.xr[0],T.north.xr[1]),rand(T.north.zr[0],T.north.zr[1]),rand(T.north.scale[0],T.north.scale[1]),rng()<T.north.pinkProb]);

    // POST-filter (after all rng consumption — zero determinism impact): no
    // trees inside the tennis block or the Diversey range/mini-golf field.
    {
      const inRect=(t,r)=>t[0]>r.x0-1&&t[0]<r.x1+1&&t[1]>r.z0-1&&t[1]<r.z1+1;
      for(let i=treeSpots.length-1;i>=0;i--)
        if(inRect(treeSpots[i],CH.TENNIS.block)||inRect(treeSpots[i],CH.DIVERSEY.range))treeSpots.splice(i,1);
    }

    const n=treeSpots.length,M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3(),Eu=new THREE.Euler();

    // ---- 5 tree archetypes, each ONE merged BufferGeometry (tapered trunk +
    // visible branches + leaf masses + edge leaf-cards) with baked VERTEX COLORS
    // (bark browns vs two-tone leaf greens), drawn as ONE InstancedMesh via a
    // shared toon material. 5 canopy meshes + 1 shadow mesh = 6 draw calls.
    // Assignment is per-tree via the LOCAL m32 rng only — the shared world rng is
    // never touched in this block, so tree PLACEMENT stays byte-identical. ----
    const bark=new THREE.Color(0x875636),barkD=new THREE.Color(0x6f4529);
    const lfLo=new THREE.Color(0x4e9d54),lfHi=new THREE.Color(0xa8e08a);         // leaf gradient: dark base → light top
    const pkLo=new THREE.Color(0xef9ec6),pkHi=new THREE.Color(0xffd6ea),wht=new THREE.Color(0xfff3f8);
    const _c=new THREE.Color(),Yv=new THREE.Vector3(0,1,0),_dv=new THREE.Vector3(),_qm=new THREE.Matrix4();
    // paint(g,c0)=flat c0; paint(g,c0,c1,y0,y1)=per-vertex bottom→top gradient
    function paint(g,c0,c1,y0,y1){
      const p=g.attributes.position,m=p.count,a=new Float32Array(m*3);
      for(let i=0;i<m;i++){
        if(c1){let t=(p.getY(i)-y0)/(y1-y0);t=t<0?0:t>1?1:t;_c.copy(c0).lerp(c1,t);}else _c.copy(c0);
        a[i*3]=_c.r;a[i*3+1]=_c.g;a[i*3+2]=_c.b;
      }
      g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;
    }
    const trunkP=(bR,tR,h,seg)=>{const g=new THREE.CylinderGeometry(tR,bR,h,seg);g.translate(0,h/2,0);return paint(g,bark);};
    const branchP=(a,b,r0,r1,seg)=>{
      const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz);
      const g=new THREE.CylinderGeometry(r1,r0,len,seg);g.translate(0,len/2,0);
      g.applyMatrix4(_qm.makeRotationFromQuaternion(Q.setFromUnitVectors(Yv,_dv.set(dx,dy,dz).normalize())));
      g.translate(a[0],a[1],a[2]);return paint(g,barkD);
    };
    const massP=(cx,cy,cz,rx,ry,rz,ws,hs,c0,c1,y0,y1)=>{const g=new THREE.SphereGeometry(1,ws,hs);g.scale(rx,ry,rz);g.translate(cx,cy,cz);return paint(g,c0,c1,y0,y1);};
    const cardsP=(P,cx,cy,cz,rx,ry,rz,cnt,sz,c0,c1,y0,y1,rnd)=>{
      for(let k=0;k<cnt;k++){
        const th=rnd()*6.2832,u=rnd()*2-1,sp=Math.sqrt(1-u*u);
        const g=new THREE.TetrahedronGeometry(sz*(0.7+rnd()*0.7),0);
        g.applyMatrix4(_qm.makeRotationY(rnd()*6.2832));g.applyMatrix4(_qm.makeRotationX(rnd()*6.2832));
        g.translate(cx+sp*Math.cos(th)*rx,cy+u*ry,cz+sp*Math.sin(th)*rz);
        P.push(paint(g,c0,c1,y0,y1));
      }
    };
    const merge=P=>BufferGeometryUtils.mergeBufferGeometries(P.map(g=>g.index?g.toNonIndexed():g));
    // A classic round — round crown, branch forks visible in the gaps
    const archA=()=>{const rnd=m32(0xA0F1),y0=2.9,y1=5.9,P=[];P.push(trunkP(0.42,0.24,2.7,7));
      P.push(branchP([0,1.7,0],[0.55,3.7,0.25],0.15,0.06,5),branchP([0,1.8,0],[-0.6,3.8,-0.15],0.14,0.06,5),branchP([0,1.9,0],[0.1,4.1,-0.5],0.13,0.05,5));
      P.push(massP(0,4.3,0,1.55,1.5,1.55,8,7,lfLo,lfHi,y0,y1));
      for(const[mx,my,mz]of[[1.15,3.95,0.1],[-0.5,4.0,1.05],[-1.05,4.15,-0.4],[0.35,4.2,-1.05],[0.7,4.75,0.6]])P.push(massP(mx,my,mz,0.95,0.9,0.95,7,6,lfLo,lfHi,y0,y1));
      cardsP(P,0,4.3,0,1.8,1.6,1.8,30,0.34,lfLo,lfHi,y0,y1,rnd);return merge(P);};
    // B tall oval — poplar, narrow vertical column of leaf masses
    const archB=()=>{const rnd=m32(0xB0F2),y0=2.8,y1=7.0,P=[];P.push(trunkP(0.3,0.17,3.0,6));
      P.push(branchP([0,2.4,0],[0.35,4.6,0.1],0.1,0.05,5),branchP([0,2.6,0],[-0.32,5.0,-0.08],0.1,0.05,5));
      for(const[mx,my,mz,rr,ry]of[[0,3.4,0,0.95,1.0],[0.1,4.3,0.05,0.9,1.05],[-0.08,5.1,-0.05,0.82,1.0],[0.05,5.9,0,0.66,0.9],[0,6.55,0,0.42,0.6]])P.push(massP(mx,my,mz,rr,ry,rr,7,7,lfLo,lfHi,y0,y1));
      cardsP(P,0,4.9,0,0.95,2.0,0.95,34,0.3,lfLo,lfHi,y0,y1,rnd);return merge(P);};
    // C layered tiers — 3 stacked flattened canopy discs + a straight leader
    const archC=()=>{const rnd=m32(0xC0F3),y0=3.0,y1=6.0,P=[];P.push(trunkP(0.4,0.22,2.6,7));
      P.push(branchP([0,2.6,0],[0,5.4,0],0.12,0.05,6),branchP([0,3.2,0],[1.5,3.5,0],0.1,0.05,5),branchP([0,4.3,0],[-1.2,4.5,0.2],0.09,0.05,5));
      P.push(massP(0,3.5,0,1.85,0.55,1.85,9,6,lfLo,lfHi,y0,y1),massP(0.1,4.55,0,1.5,0.5,1.5,9,6,lfLo,lfHi,y0,y1),massP(0,5.45,0,1.05,0.5,1.05,8,6,lfLo,lfHi,y0,y1));
      cardsP(P,0,3.5,0,1.95,0.4,1.95,12,0.3,lfLo,lfHi,y0,y1,rnd);cardsP(P,0.1,4.55,0,1.6,0.35,1.6,10,0.28,lfLo,lfHi,y0,y1,rnd);cardsP(P,0,5.45,0,1.15,0.35,1.15,8,0.26,lfLo,lfHi,y0,y1,rnd);return merge(P);};
    // D wide spreading — mature elm, low broad crown, prominent horizontal branches
    const archD=()=>{const rnd=m32(0xD0F4),y0=2.7,y1=4.8,P=[];P.push(trunkP(0.52,0.32,2.2,8));
      const arms=[[2.2,3.5,0.3],[-2.0,3.4,0.5],[0.4,3.6,2.1],[0.2,3.5,-2.0]];
      for(const a of arms)P.push(branchP([0,2.0,0],a,0.18,0.07,6));
      P.push(massP(0,3.7,0,1.5,1.1,1.5,8,7,lfLo,lfHi,y0,y1));
      for(const[ax,ay,az]of arms)P.push(massP(ax*0.92,ay+0.25,az*0.92,1.15,0.9,1.15,7,6,lfLo,lfHi,y0,y1));
      cardsP(P,0,3.7,0,2.7,0.95,2.7,34,0.34,lfLo,lfHi,y0,y1,rnd);return merge(P);};
    // E cherry — full pink blossom cluster with a couple of white masses baked in
    const archE=()=>{const rnd=m32(0xE0F5),y0=2.9,y1=5.6,P=[];P.push(trunkP(0.34,0.2,2.4,7));
      P.push(branchP([0,1.6,0],[0.5,3.4,0.2],0.13,0.05,5),branchP([0,1.7,0],[-0.55,3.5,-0.15],0.12,0.05,5));
      P.push(massP(0,4.0,0,1.5,1.35,1.5,8,7,pkLo,pkHi,y0,y1));
      for(const[mx,my,mz,w]of[[1.1,3.8,0.1,0],[-0.55,3.85,0.95,1],[-1.0,3.95,-0.45,0],[0.4,4.0,-1.0,1],[0.65,4.5,0.55,0]])
        P.push(w?massP(mx,my,mz,0.9,0.85,0.9,7,6,wht,wht,y0,y1):massP(mx,my,mz,0.9,0.85,0.9,7,6,pkLo,pkHi,y0,y1));
      cardsP(P,0,4.0,0,1.75,1.5,1.75,30,0.32,pkLo,pkHi,y0,y1,rnd);return merge(P);};

    const geos=[archA(),archB(),archC(),archD(),archE()];
    const leafMat=curveMat(new THREE.MeshToonMaterial({vertexColors:true,gradientMap:gmap}));   // shared across all 5
    const meshes=geos.map(g=>new THREE.InstancedMesh(g,leafMat,n));                              // over-allocated to n each
    const counts=[0,0,0,0,0];
    const shad=new THREE.InstancedMesh(new THREE.CircleGeometry(1.5,14),new THREE.MeshBasicMaterial({color:0x2f6b45,transparent:true,opacity:0.22,depthWrite:false}),n);
    curveMat(shad.material);
    const flat=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
    for(let i=0;i<n;i++){
      const[x,z,s,pink]=treeSpots[i];
      const r=m32((i*2654435761)>>>0);   // LOCAL per-tree rng — placement rng untouched
      // pink→E; greens: A 35% / B 20% / C 20% / D 25% via the local rng.
      // (skip 3 — m32's 1st output is weakly spread for i*const seeds; the 4th
      // hits the target weights: measured ~33/21/20/26.)
      let ai;if(pink)ai=4;else{r();r();r();const w=r();ai=w<0.35?0:w<0.55?1:w<0.75?2:3;}
      Eu.set(0,r()*Math.PI*2,0);Q.setFromEuler(Eu);                                              // per-tree yaw so clones don't line up
      M.compose(V.set(x,0,z),Q,S.set(s,s,s));
      const slot=counts[ai]++;meshes[ai].setMatrixAt(slot,M);
      const t=0.92+r()*0.16;_c.setRGB(t,t,t);meshes[ai].setColorAt(slot,_c);                     // subtle grayscale tint ×vertexColor
      M.compose(V.set(x,0.03,z),flat,S.set(s,s,s));shad.setMatrixAt(i,M);
      collide(x,z,0.55*s);
    }
    for(let k=0;k<5;k++){meshes[k].count=counts[k];meshes[k].instanceMatrix.needsUpdate=true;if(meshes[k].instanceColor)meshes[k].instanceColor.needsUpdate=true;}
    shad.instanceMatrix.needsUpdate=true;
    scene.add(meshes[0],meshes[1],meshes[2],meshes[3],meshes[4],shad);
  }

  // ---- hedges ----
  {
    const H=CH.HEDGES,hm=toon(H.color);
    const spots=[];
    const inGap=z=>H.west.gaps&&H.west.gaps.some(g=>z>=g[0]&&z<=g[1]);   // LSD underpass openings
    for(let z=H.west.z0;z<=H.west.z1;z+=H.west.step){if(inGap(z))continue;spots.push([H.west.x,z]);}
    for(let x=H.north.x0;x<=H.north.x1;x+=H.north.step)spots.push([x,H.north.z]);
    if(H.cap)for(let x=H.cap.x0;x<=H.cap.x1;x+=H.cap.step)spots.push([x,H.cap.z]);
    const hedge=new THREE.InstancedMesh(new THREE.SphereGeometry(1,9,8),hm,spots.length);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3();
    spots.forEach((p,i)=>{M.compose(V.set(p[0],H.y,p[1]),Q.identity(),S.set(H.scale[0],H.scale[1],H.scale[2]));hedge.setMatrixAt(i,M)});
    hedge.instanceMatrix.needsUpdate=true;scene.add(hedge);
  }

  // ---- grass tufts (small, dense — human scale) ----
  {
    const TU=CH.TUFTS,n=TU.count,tm=toon(TU.color);
    const tuft=new THREE.InstancedMesh(new THREE.ConeGeometry(0.09,0.3,5),tm,n);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3();
    let placed=0,guard=0;
    while(placed<n&&guard++<TU.guard){const x=rand(TU.xr[0],TU.xr[1]),z=rand(TU.zr[0],TU.zr[1]);if(!pip(x,z,LAND))continue;
      M.compose(V.set(x,0.14,z),Q.identity(),S.set(1,rand(TU.scaleY[0],TU.scaleY[1]),1));tuft.setMatrixAt(placed++,M)}
    tuft.instanceMatrix.needsUpdate=true;scene.add(tuft);
  }

  // ---- AIDS Garden: flowers + sculpture tribute ----
  {
    const GA=CH.GARDEN;
    const beds=GA.beds;
    const cols=GA.colors.map(c=>new THREE.Color(c));
    const n=GA.count;
    const stems=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05,0.05,0.55,5),toon(0x4f9f52,{}),n);
    const heads=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.19,0),curveMat(new THREE.MeshToonMaterial({gradientMap:gmap})),n);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3();
    for(let i=0;i<n;i++){
      let x,z;
      if(i<GA.bedCount){const b=beds[i%beds.length];const a=rand(0,Math.PI*2),r=Math.sqrt(rng())*GA.bedRadius;x=b[0]+Math.cos(a)*r;z=b[1]+Math.sin(a)*r}
      else{const t=rng();const p=mainCurve.getPoint(t);x=p.x+rand(-1,1)*GA.trailJitter;z=p.z+rand(-1,1)*GA.trailJitter;if(!pip(x,z,LAND)){x=GA.fallback[0];z=GA.fallback[1]}}
      const s=rand(GA.scale[0],GA.scale[1]);
      M.compose(V.set(x,0.28*s,z),Q.identity(),S.set(1,s,1));stems.setMatrixAt(i,M);
      M.compose(V.set(x,0.62*s,z),Q.identity(),S.set(1,0.8,1));heads.setMatrixAt(i,M);
      heads.setColorAt(i,cols[rng()*cols.length|0]);
    }
    stems.instanceMatrix.needsUpdate=heads.instanceMatrix.needsUpdate=true;heads.instanceColor.needsUpdate=true;
    scene.add(stems,heads);

    // Keith Haring "Self-Portrait": a bold bright-green OUTLINED figure — tube
    // limbs, an OPEN ring torso + faceless ring head (visible gaps within the
    // body), caught mid-motion (one arm up, one leg raised). Reads as a Haring
    // line-drawing made solid, not filled blobs.
    const fig=new THREE.Group(),gm=toon(0x4ecb6e);
    const plinth=new THREE.Mesh(new THREE.CylinderGeometry(1.7,2,0.5,16),toon(0xd9cbb2));plinth.position.y=0.25;fig.add(plinth);
    const TR=0.18,_yA=new THREE.Vector3(0,1,0),_d=new THREE.Vector3();
    function tube(a,b,r=TR){const len=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
      const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,8),gm);
      m.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);
      m.quaternion.setFromUnitVectors(_yA,_d.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]).normalize());fig.add(m);return m}
    function joint(p,r){const m=new THREE.Mesh(new THREE.SphereGeometry(r,10,9),gm);m.position.set(p[0],p[1],p[2]);fig.add(m);return m}
    // OPEN torso frame (upright oval ring) — hollow, the signature cutout
    const torso=new THREE.Mesh(new THREE.TorusGeometry(0.6,TR,8,22),gm);
    torso.scale.set(0.82,1.25,0.62);torso.position.y=2.95;fig.add(torso);
    // faceless ring head + neck
    const head=new THREE.Mesh(new THREE.TorusGeometry(0.4,0.15,8,20),gm);
    head.scale.set(1,1,0.75);head.position.y=4.62;fig.add(head);
    tube([0,3.72,0],[0,4.2,0]);                              // neck
    // shoulders + hips as joints so tubes read continuous
    const shL=[-0.5,3.6,0],shR=[0.5,3.6,0],hipL=[-0.35,2.0,0],hipR=[0.35,2.0,0];
    joint(shL,0.19);joint(shR,0.19);joint(hipL,0.2);joint(hipR,0.2);
    // right arm UP (bent overhead), left arm swung out/down
    const elbR=[1.02,4.5,0.05],handR=[0.75,5.35,0.12];
    tube(shR,elbR);tube(elbR,handR);joint(elbR,0.17);joint(handR,0.19);
    tube(shL,[-1.25,2.95,0.2]);joint([-1.25,2.95,0.2],0.19);
    // right leg RAISED (knee up, striding forward), left leg planted back
    const knR=[0.72,1.4,0.55],footR=[0.5,0.72,1.15];
    tube(hipR,knR);tube(knR,footR);joint(knR,0.18);joint(footR,0.2);
    tube(hipL,[-0.7,0.38,-0.3]);joint([-0.7,0.38,-0.3],0.2);
    // three green motion streaks radiating from the body (Haring action lines)
    for(let k=0;k<3;k++){
      const arc=new THREE.Mesh(new THREE.TorusGeometry(1.35+k*0.4,0.07,6,20,0.9),gm);
      arc.position.y=3.1;arc.rotation.z=1.0+k*0.3;arc.rotation.y=rand(-0.4,0.4);fig.add(arc);
    }
    const HR=CH.HARING;
    fig.scale.setScalar(HR.scale);fig.position.set(HR.pos[0],HR.pos[1],HR.pos[2]);fig.rotation.y=HR.ry;scene.add(fig);collide(HR.pos[0],HR.pos[2],HR.collide);
  }

  // ---- limestone edging boulders along the AIDS-garden paths (hand-placed) ----
  // Big rough low-poly blocks edging the loop + connector, like the real garden.
  // Zero shared rng: a LOCAL m32 drives per-boulder rotation/scale; each seed is
  // probed against pathSamples and nudged clear (>~1.5 m off every ribbon), kept
  // on grass (pip). Instanced (1 draw call); collide is jumpable (h=0.8).
  {
    const seeds=[[86,110],[84,126],[78,120],[90,140],[70,113],[60,108],[100,98],[88,150],[50,106],[40,104]];
    const br=m32(0x10cb0017);
    const clear=[];
    for(const[sx,sz]of seeds){
      let x=sx,z=sz;
      // iteratively push directly away from the nearest ribbon sample until the
      // nearest is >=1.9 m (sampling ~1.7 m => true distance to the ribbon >=1.5 m)
      for(let k=0;k<24;k++){
        let bi=-1,d2=Infinity;
        for(let i=0;i<pathSamples.length;i++){const p=pathSamples[i];const e=(p[0]-x)**2+(p[1]-z)**2;if(e<d2){d2=e;bi=i}}
        if(bi<0||d2>=1.9*1.9)break;
        const p=pathSamples[bi];let ax=x-p[0],az=z-p[1];const L=Math.hypot(ax,az)||1;
        x=p[0]+ax/L*1.95;z=p[1]+az/L*1.95;
      }
      if(pip(x,z,LAND))clear.push([x,z]);
    }
    const rock=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),toon(0xb9b0a2,{}),clear.length);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),E=new THREE.Euler(),S=new THREE.Vector3(),V=new THREE.Vector3();
    clear.forEach(([x,z],i)=>{
      const sc=0.72+br()*0.5;                                   // ~0.72..1.22 m base radius
      E.set(br()*Math.PI,br()*Math.PI*2,br()*Math.PI);Q.setFromEuler(E);
      M.compose(V.set(x,sc*0.52,z),Q,S.set(sc*1.15,sc*0.78,sc*1.05));   // squat, boulder-ish
      rock.setMatrixAt(i,M);
      collide(x,z,sc*1.0,0.8);                                   // jumpable when airborne
    });
    rock.instanceMatrix.needsUpdate=true;scene.add(rock);
  }

  // ---- prairie planting beds (native tall grasses + purple coneflower masses) ----
  // 3 organic clusters near the garden/lawn edges. Zero shared rng: a LOCAL m32
  // jitters each blade/flower within ~5 m; every one is pip-guarded on land and
  // kept off the ribbons. Exactly 3 draw calls: grass + flower stems + heads.
  {
    const centers=[[60,150],[120,165],[70,90]];
    const grassCols=[0x8a9a5b,0x9fae6b,0x76863f].map(c=>new THREE.Color(c));
    const purples=[0x9a6bd0,0xb58ae0].map(c=>new THREE.Color(c));
    const pr=m32(0x7a1e0055);
    const nBlade=40,nFlower=18,R=5;
    const gN=centers.length*nBlade,fN=centers.length*nFlower;
    const grass=new THREE.InstancedMesh(new THREE.ConeGeometry(0.07,0.95,4),curveMat(new THREE.MeshToonMaterial({gradientMap:gmap})),gN);
    const stems=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03,0.03,0.62,4),toon(0x5c7b46,{}),fN);
    const heads=new THREE.InstancedMesh(new THREE.SphereGeometry(0.14,8,7),curveMat(new THREE.MeshToonMaterial({gradientMap:gmap})),fN);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),E=new THREE.Euler(),S=new THREE.Vector3(),V=new THREE.Vector3();
    const clearOf=(x,z)=>{for(let i=0;i<pathSamples.length;i++){const p=pathSamples[i];if((p[0]-x)**2+(p[1]-z)**2<2.4*2.4)return false}return true};
    const spot=(cx,cz)=>{for(let k=0;k<16;k++){const a=pr()*Math.PI*2,r=Math.sqrt(pr())*R,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;if(pip(x,z,LAND)&&clearOf(x,z))return[x,z]}return[cx,cz]};
    let gi=0,fi=0;
    for(const[cx,cz]of centers){
      for(let b=0;b<nBlade;b++){
        const[x,z]=spot(cx,cz),s=0.7+pr()*0.9;                  // blade height variance
        E.set(pr()*0.18-0.09,pr()*Math.PI*2,pr()*0.18-0.09);Q.setFromEuler(E);
        M.compose(V.set(x,0.475*s,z),Q,S.set(1,s,1));grass.setMatrixAt(gi,M);
        grass.setColorAt(gi,grassCols[pr()*grassCols.length|0]);gi++;
      }
      for(let f=0;f<nFlower;f++){
        const[x,z]=spot(cx,cz),h=0.55+pr()*0.35;
        M.compose(V.set(x,h*0.5,z),Q.identity(),S.set(1,h/0.62,1));stems.setMatrixAt(fi,M);
        M.compose(V.set(x,h+0.06,z),Q.identity(),S.set(1,1.25,1));heads.setMatrixAt(fi,M);
        heads.setColorAt(fi,purples[pr()*purples.length|0]);fi++;
      }
    }
    grass.instanceMatrix.needsUpdate=stems.instanceMatrix.needsUpdate=heads.instanceMatrix.needsUpdate=true;
    grass.instanceColor.needsUpdate=heads.instanceColor.needsUpdate=true;
    scene.add(grass,stems,heads);
  }

  // ---- summer life on the rocks: towels, umbrellas, coolers, blocks ----
  {
    const BL=CH.BEACH_LIFE;
    const twlCols=BL.towelColors.map(c=>new THREE.Color(c));
    const spots=[];
    const segs=COAST_SEGS[0];
    for(const s of segs){
      if(s.az<BL.towel.zMin||s.az>BL.towel.zMax)continue;
      for(let t=0;t<s.len;t+=BL.towel.step){
        if(rng()<BL.towel.skipProb)continue;
        const cx=s.ax+s.tx*t,cz=s.az+s.tz*t,p=tierProfile(cz);
        const tier=(rng()*(p.w.length-1))|0;let acc=0;for(let i=0;i<tier;i++)acc+=p.w[i];
        const off=acc+p.w[tier]*rand(BL.towel.offFrac[0],BL.towel.offFrac[1]);
        spots.push({x:cx+s.nx*off,z:cz+s.nz*off,y:-tier*p.step+0.045,rot:rand(0,Math.PI*2)});
      }
    }
    const inst=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.8,0.95),curveMat(new THREE.MeshToonMaterial({gradientMap:gmap,side:THREE.DoubleSide})),spots.length);
    const M=new THREE.Matrix4(),S=new THREE.Vector3(1,1,1),V=new THREE.Vector3();
    const tilt=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
    spots.forEach((d,i)=>{
      const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,d.rot,0)).multiply(tilt);
      M.compose(V.set(d.x,d.y,d.z),q,S);inst.setMatrixAt(i,M);
      inst.setColorAt(i,twlCols[rng()*twlCols.length|0]);
    });
    inst.instanceMatrix.needsUpdate=true;inst.instanceColor.needsUpdate=true;scene.add(inst);

    // umbrellas (instanced: poles + canopies)
    {
      const umbCols=BL.umbrellaColors.map(c=>new THREE.Color(c)),nU=BL.umbrella.count;
      const poles=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045,0.045,2.1,6),toon(0xd9cbb2),nU);
      const cans=new THREE.InstancedMesh(new THREE.ConeGeometry(1.15,0.55,9),toon(0xffffff,{}),nU);
      const Mu=new THREE.Matrix4(),Qu=new THREE.Quaternion(),Su=new THREE.Vector3(1,1,1),Vu=new THREE.Vector3(),Eu=new THREE.Euler(),Ou=new THREE.Vector3();
      let pu=0;
      for(let i=0;i<nU&&spots.length;i++){
        const d=spots[(rng()*spots.length)|0];
        const bx=d.x+rand(-BL.umbrella.jitter,BL.umbrella.jitter),bz=d.z+rand(-BL.umbrella.jitter,BL.umbrella.jitter),tilt=rand(-BL.umbrella.tilt,BL.umbrella.tilt),by=d.y+BL.umbrella.yOff;
        Eu.set(0,0,tilt);Qu.setFromEuler(Eu);
        Ou.set(0,1.05,0).applyQuaternion(Qu);Mu.compose(Vu.set(bx+Ou.x,by+Ou.y,bz+Ou.z),Qu,Su);poles.setMatrixAt(pu,Mu);
        Ou.set(0,2.05,0).applyQuaternion(Qu);Mu.compose(Vu.set(bx+Ou.x,by+Ou.y,bz+Ou.z),Qu,Su);cans.setMatrixAt(pu,Mu);
        cans.setColorAt(pu,umbCols[i%umbCols.length]);collide(bx,bz,BL.umbrella.collide);pu++;
      }
      poles.count=cans.count=pu;poles.instanceMatrix.needsUpdate=cans.instanceMatrix.needsUpdate=true;cans.instanceColor.needsUpdate=true;scene.add(poles,cans);
    }
    // coolers (instanced)
    {
      const coolCols=BL.coolerColors.map(c=>new THREE.Color(c)),nC=BL.cooler.count;
      const cool=new THREE.InstancedMesh(new THREE.BoxGeometry(0.55,0.4,0.35),toon(0xffffff,{}),nC);
      const Mc=new THREE.Matrix4(),Qc=new THREE.Quaternion(),Sc=new THREE.Vector3(1,1,1),Vc=new THREE.Vector3(),Ec=new THREE.Euler();
      let pc=0;
      for(let i=0;i<nC&&spots.length;i++){
        const d=spots[(rng()*spots.length)|0];
        const cx=d.x+rand(-BL.cooler.jitter,BL.cooler.jitter),cz=d.z+rand(-BL.cooler.jitter,BL.cooler.jitter),ry=rand(0,3);
        Ec.set(0,ry,0);Qc.setFromEuler(Ec);Mc.compose(Vc.set(cx,d.y+BL.cooler.yOff,cz),Qc,Sc);cool.setMatrixAt(pc,Mc);
        cool.setColorAt(pc,coolCols[i%2?0:1]);pc++;
      }
      cool.count=pc;cool.instanceMatrix.needsUpdate=true;cool.instanceColor.needsUpdate=true;scene.add(cool);
    }
    // loose limestone blocks (instanced)
    {
      const nB=BL.block.count;
      const blocks=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),toon(0xd8caa8,{}),nB);
      const Mb=new THREE.Matrix4(),Qb=new THREE.Quaternion(),Sb=new THREE.Vector3(),Vb=new THREE.Vector3(),Eb=new THREE.Euler();
      let pb=0;
      for(let i=0;i<nB;i++){
        const s=COAST_SEGS[0][(rng()*COAST_SEGS[0].length)|0];
        if(s.az<BL.block.zMin||s.az>BL.block.zMax){i--;continue}
        const p=tierProfile(s.az),tier=(rng()*(p.w.length-1))|0;let acc=0;for(let k=0;k<tier;k++)acc+=p.w[k];
        const off=acc+p.w[tier]*rand(BL.block.offFrac[0],BL.block.offFrac[1]);
        const sx=rand(0.8,1.6),sy=rand(0.5,0.8),sz=rand(0.7,1.2);
        const bx=s.ax+s.nx*off,by=-tier*p.step+BL.block.yOff,bz=s.az+s.nz*off,ry=rand(0,3),rz=rand(-0.08,0.08);
        Eb.set(0,ry,rz);Qb.setFromEuler(Eb);Mb.compose(Vb.set(bx,by,bz),Qb,Sb.set(sx,sy,sz));blocks.setMatrixAt(pb,Mb);
        collide(bx,bz,BL.block.collide);pb++;
      }
      blocks.count=pb;blocks.instanceMatrix.needsUpdate=true;scene.add(blocks);
    }
  }

  // ---- floaties in the water (swimmers off the rocks) ----
  {
    const FL=CH.FLOATIES,flCols=FL.colors.map(c=>new THREE.Color(c));
    const segs=COAST_SEGS[0];
    const rings=new THREE.InstancedMesh(new THREE.TorusGeometry(0.55,0.22,8,16),toon(0xffffff,{}),FL.count);
    const Mf=new THREE.Matrix4(),Qf=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0)),Sf=new THREE.Vector3(1,1,1),Vf=new THREE.Vector3();
    let pf=0;
    for(let i=0;i<FL.count;i++){
      const s=segs[(rng()*segs.length)|0];
      if(s.az<FL.zMin||s.az>FL.zMax){i--;continue}
      const tot=profileTotal(s.az),off=tot+rand(FL.offRange[0],FL.offRange[1]);
      Mf.compose(Vf.set(s.ax+s.nx*off,WATER_Y+0.12,s.az+s.nz*off),Qf,Sf);rings.setMatrixAt(pf,Mf);
      rings.setColorAt(pf,flCols[i%flCols.length]);pf++;
    }
    rings.count=pf;rings.instanceMatrix.needsUpdate=true;rings.instanceColor.needsUpdate=true;scene.add(rings);
    // one swan floaty, obviously
    const SW=CH.SWAN;
    const swan=new THREE.Group();
    const body=new THREE.Mesh(new THREE.SphereGeometry(0.75,10,9),toon(0xfdf6e6));body.scale.set(1,0.6,1.3);swan.add(body);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.16,1.1,7),toon(0xfdf6e6));neck.position.set(0,0.72,0.75);neck.rotation.x=0.35;swan.add(neck);
    const hd=new THREE.Mesh(new THREE.SphereGeometry(0.2,8,7),toon(0xfdf6e6));hd.position.set(0,1.28,0.92);swan.add(hd);
    const beak=new THREE.Mesh(new THREE.ConeGeometry(0.09,0.28,6),toon(0xf5a04c));beak.rotation.x=Math.PI/2;beak.position.set(0,1.26,1.14);swan.add(beak);
    swan.position.set(SW.x,WATER_Y+SW.yOff,SW.z);swan.rotation.y=rand(SW.ryRange[0],SW.ryRange[1]);
    swan.userData={by:WATER_Y+SW.yOff,ph:SW.ph};scene.add(swan);bobbers.push(swan);
  }

  // ---- signs / lamps / benches ----
  // lamps: instanced posts + caps + bulbs (3 draw calls) + one glow-points set
  const lampGlowPos=[];
  const lampSpots=[];
  CH.LAMPS.trail.forEach(([t,side])=>{
    const p=mainCurve.getPoint(t),tan=mainCurve.getTangent(t);
    lampSpots.push([p.x+(-tan.z)*side*CH.LAMPS.offset,p.z+tan.x*side*CH.LAMPS.offset]);
  });
  for(const[lx,lz]of CH.LAMPS.extra)lampSpots.push([lx,lz]);
  {
    const nL=lampSpots.length,M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(1,1,1),V=new THREE.Vector3();
    // real Lakefront Trail lamp: a WHITE GLOBE on a slender GREEN post — a
    // tapered green pole, a small green collar, and a warm-white glowing sphere.
    // Same instanced structure (3 draw calls), same spots/counts, same glow.
    const posts=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08,0.13,4,7),toon(0x37584a),nL);
    const collars=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15,0.12,0.22,8),toon(0x2f5142),nL);
    const globes=new THREE.InstancedMesh(new THREE.SphereGeometry(0.36,12,11),bmat(0xfff3df),nL);
    lampSpots.forEach(([x,z],i)=>{
      M.compose(V.set(x,2,z),Q,S);posts.setMatrixAt(i,M);        // post top at y=4.0
      M.compose(V.set(x,3.9,z),Q,S);collars.setMatrixAt(i,M);    // small collar under the globe
      M.compose(V.set(x,4.05,z),Q,S);globes.setMatrixAt(i,M);    // globe centred on the glow point
      collide(x,z,0.4);lampGlowPos.push([x,4.05,z]);
    });
    posts.instanceMatrix.needsUpdate=collars.instanceMatrix.needsUpdate=globes.instanceMatrix.needsUpdate=true;
    scene.add(posts,collars,globes);
  }
  {
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(lampGlowPos.flat()),3));
    const aC=new Float32Array(lampGlowPos.length*3),aS=new Float32Array(lampGlowPos.length);
    for(let i=0;i<lampGlowPos.length;i++){aC.set([1,0.78,0.5],i*3);aS[i]=4.2}
    g.setAttribute('aColor',new THREE.BufferAttribute(aC,3));g.setAttribute('aSize',new THREE.BufferAttribute(aS,1));
    scene.add(new THREE.Points(g,pointsMat()));
  }
  // benches: instanced seats + backs + legs (3 draw calls)
  {
    const wm=toon(0xa9713f),lm=toon(0x6d4526),nB=CH.BENCHES.length;
    const seats=new THREE.InstancedMesh(new THREE.BoxGeometry(2.4,0.16,0.7),wm,nB);
    const backs=new THREE.InstancedMesh(new THREE.BoxGeometry(2.4,0.6,0.12),wm,nB);
    const legs=new THREE.InstancedMesh(new THREE.BoxGeometry(0.14,0.62,0.6),lm,nB*2);
    const base=new THREE.Matrix4(),tmp=new THREE.Matrix4(),Q=new THREE.Quaternion(),E=new THREE.Euler(),V=new THREE.Vector3(),S1=new THREE.Vector3(1,1,1);
    const seatL=new THREE.Matrix4().makeTranslation(0,0.62,0);
    const backL=new THREE.Matrix4().makeTranslation(0,1.05,-0.32).multiply(new THREE.Matrix4().makeRotationX(-0.15));
    const legLm=new THREE.Matrix4().makeTranslation(-1,0.31,0),legRm=new THREE.Matrix4().makeTranslation(1,0.31,0);
    CH.BENCHES.forEach((b,i)=>{
      E.set(0,b.ry,0);Q.setFromEuler(E);base.compose(V.set(b.x,0,b.z),Q,S1);
      tmp.multiplyMatrices(base,seatL);seats.setMatrixAt(i,tmp);
      tmp.multiplyMatrices(base,backL);backs.setMatrixAt(i,tmp);
      tmp.multiplyMatrices(base,legLm);legs.setMatrixAt(i*2,tmp);
      tmp.multiplyMatrices(base,legRm);legs.setMatrixAt(i*2+1,tmp);
      collide(b.x,b.z,1);
    });
    seats.instanceMatrix.needsUpdate=backs.instanceMatrix.needsUpdate=legs.instanceMatrix.needsUpdate=true;
    scene.add(seats,backs,legs);
  }

  // ---- pier (peninsula lake side) with rails, posts to the water ----
  for(const d of CH.DECKS){plankDeck(d.deck[0],d.deck[1],d.deck[2],d.deck[3],d.deck[4]);walkRects.push({x1:d.walk.x1,x2:d.walk.x2,z1:d.walk.z1,z2:d.walk.z2,h:d.walk.h});}

  // ---- finger docks along the west seawall + sailboats moored in the slips ----
  // decks + posts are instanced (2 draw calls for all docks); boats via makeBoat.
  {
    const FD=CH.FINGER_DOCKS,rows=FD.rows;
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3();
    const postXs=[];for(let px=FD.x0+1.2;px<FD.x0+FD.len;px+=3.4)postXs.push(px);
    const decks=new THREE.InstancedMesh(new THREE.BoxGeometry(1,0.24,1),toon(0xb07a46),rows.length);
    const posts=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14,0.14,FD.h+3.4,6),toon(0x9c6a3a),rows.length*postXs.length*2);
    let pi=0,bi=0;
    rows.forEach((zc,i)=>{
      M.compose(V.set(FD.x0+FD.len/2,FD.h,zc),Q.identity(),S.set(FD.len,1,FD.halfW*2));decks.setMatrixAt(i,M);
      for(const px of postXs)for(const pz of[zc-FD.halfW,zc+FD.halfW]){
        M.compose(V.set(px,(FD.h-3.4)/2+0.55,pz),Q.identity(),S.set(1,1,1));posts.setMatrixAt(pi++,M);
      }
      walkRects.push({x1:FD.x0,x2:FD.x0+FD.len,z1:zc-FD.halfW,z2:zc+FD.halfW,h:FD.h});
      makeBoat(FD.boat.xMid,zc-FD.boat.dz,Math.PI/2,FD.hulls[bi%FD.hulls.length],FD.sails[bi%FD.sails.length],FD.boat.scale);bi++;
      makeBoat(FD.boat.xMid,zc+FD.boat.dz,-Math.PI/2,FD.hulls[bi%FD.hulls.length],FD.sails[bi%FD.sails.length],FD.boat.scale);bi++;
    });
    decks.instanceMatrix.needsUpdate=posts.instanceMatrix.needsUpdate=true;scene.add(decks,posts);
  }

  // ---- boats / buoys ----
  for(const b of CH.BOATS)makeBoat(b.x,b.z,b.ry,b.hull,b.sail,b.scale);
  drifter=makeBoat(CH.DRIFTER.x,CH.DRIFTER.z,CH.DRIFTER.ry,CH.DRIFTER.hull,CH.DRIFTER.sail,CH.DRIFTER.scale);
  for(const b of CH.BUOYS)makeBuoy(b.x,b.z,b.c);

  // ---- harbor house ----
  {
    const grp=new THREE.Group();
    const cream=toon(0xf3ead4),roofC=toon(0xd0705c);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3();
    const base=new THREE.Mesh(new THREE.BoxGeometry(8.5,4.4,6.2),toon(0xfbf3e2));base.position.y=2.2;grp.add(base);
    // gabled roof (ridge along z) with a ~0.5 m eave overhang on the door side
    const rs=new THREE.Shape();rs.moveTo(-4.75,0);rs.lineTo(4.75,0);rs.lineTo(0,2.8);rs.closePath();
    const rg=new THREE.ExtrudeGeometry(rs,{depth:6.8,bevelEnabled:false});rg.translate(0,0,-3.4);
    const roof=new THREE.Mesh(rg,roofC);roof.position.y=4.4;grp.add(roof);
    const eaves=new THREE.InstancedMesh(new THREE.BoxGeometry(0.16,0.28,6.9),cream,2);   // fascia under both eaves
    [-1,1].forEach((s,i)=>{M.compose(V.set(s*4.72,4.28,0),Q.identity(),S.set(1,1,1));eaves.setMatrixAt(i,M);});
    eaves.instanceMatrix.needsUpdate=true;grp.add(eaves);
    const door=new THREE.Mesh(new THREE.BoxGeometry(0.14,2.2,1.2),toon(0x6d4526));door.position.set(4.28,1.1,0);grp.add(door);
    for(const wz of[-2,2]){const win=new THREE.Mesh(new THREE.BoxGeometry(0.14,1.1,1.1),curveMat(new THREE.MeshBasicMaterial({color:0xffe9b0})));win.position.set(4.28,2.7,wz);grp.add(win)}
    // cream trim frames around the door + two windows (1 instanced mesh)
    const trim=new THREE.InstancedMesh(new THREE.BoxGeometry(0.08,1,1),cream,3);
    M.compose(V.set(4.26,1.15,0),Q.identity(),S.set(1,2.5,1.5));trim.setMatrixAt(0,M);
    [-2,2].forEach((wz,i)=>{M.compose(V.set(4.26,2.7,wz),Q.identity(),S.set(1,1.4,1.4));trim.setMatrixAt(i+1,M);});
    trim.instanceMatrix.needsUpdate=true;grp.add(trim);
    // small brick chimney poking through the north slope
    const chimney=new THREE.Mesh(new THREE.BoxGeometry(0.7,3.4,0.7),toon(0x9c5a48));chimney.position.set(-2.6,5.6,1.4);grp.add(chimney);
    // harbor-master sign board above the door
    const cv=document.createElement('canvas');cv.width=256;cv.height=76;const g=cv.getContext('2d');
    g.fillStyle='#20406a';g.fillRect(0,0,256,76);g.strokeStyle='#fdf6e6';g.lineWidth=6;g.strokeRect(5,5,246,66);
    g.fillStyle='#fdf6e6';g.textAlign='center';g.textBaseline='middle';g.font='700 27px "Trebuchet MS",sans-serif';g.fillText('HARBOR MASTER',128,42);
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.0,0.6),curveMat(new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv)})));
    sign.position.set(4.27,3.5,0);sign.rotation.y=Math.PI/2;grp.add(sign);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,4.4,6),toon(0xd9cbb2));pole.position.set(-3.1,6.5,2.1);grp.add(pole);
    const penShape=new THREE.Shape();penShape.moveTo(0,0);penShape.lineTo(1.7,0.3);penShape.lineTo(0,0.6);penShape.closePath();
    const pennant=new THREE.Mesh(new THREE.ShapeGeometry(penShape),curveMat(new THREE.MeshBasicMaterial({color:0xa8dcf2,side:THREE.DoubleSide})));
    pennant.position.set(-3.02,8.2,2.1);grp.add(pennant);
    const HH=CH.HARBOR_HOUSE;
    grp.position.set(HH.pos[0],HH.pos[1],HH.pos[2]);scene.add(grp);collide(HH.pos[0],HH.pos[2],HH.collide);
  }

  // ---- Kwanusila tribute ----
  {
    const grp=new THREE.Group();
    const bands=[0xb3402e,0x2e6f8f,0xe0b13e,0x274e37,0x8a4a7a];
    for(let i=0;i<5;i++){
      const seg=new THREE.Mesh(new THREE.CylinderGeometry(0.75-i*0.05,0.8-i*0.05,1.35,10),toon(bands[i]));
      seg.position.y=0.7+i*1.35;grp.add(seg);
    }
    const wingG=new THREE.BoxGeometry(3.4,0.5,0.28);
    for(const s of[-1,1]){const w=new THREE.Mesh(wingG,toon(0xb3402e));w.position.set(s*1.9,6.6,0);w.rotation.z=s*0.35;grp.add(w)}
    const beak=new THREE.Mesh(new THREE.ConeGeometry(0.28,0.9,6),toon(0xe0b13e));beak.rotation.x=Math.PI/2;beak.position.set(0,6.4,0.85);grp.add(beak);
    const KW=CH.KWANUSILA;
    grp.scale.setScalar(KW.scale);grp.position.set(KW.pos[0],KW.pos[1],KW.pos[2]);scene.add(grp);collide(KW.pos[0],KW.pos[2],KW.collide);
  }

  // ---- dog beach props + one very good dog ----
  {
    const DP=CH.DOG_PROPS;
    const bh=z=>{const h=beachH(24,z);return h===null?0:h};
    const ball=new THREE.Mesh(new THREE.SphereGeometry(0.42,12,10),toon(0xff7b6b));
    ball.position.set(DP.ball.x,bh(DP.ball.z)+DP.ball.yOff,DP.ball.z);scene.add(ball);collide(DP.ball.x,DP.ball.z,DP.ball.collide);
    const pail=new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.2,0.42,10),toon(0x7fc8f0));
    pail.position.set(DP.pail.x,bh(DP.pail.z)+DP.pail.yOff,DP.pail.z);scene.add(pail);
    const dog=new THREE.Group(),dm=toon(0xf5efe2);
    const body=new THREE.Mesh(new THREE.SphereGeometry(0.42,10,9),dm);body.scale.set(0.85,0.8,1.25);body.position.y=0.48;dog.add(body);
    const hd=new THREE.Mesh(new THREE.SphereGeometry(0.3,9,8),dm);hd.position.set(0,0.92,0.5);dog.add(hd);
    for(const s of[-1,1]){const ear=new THREE.Mesh(new THREE.ConeGeometry(0.11,0.26,5),toon(0xcbb89a));ear.position.set(s*0.17,1.16,0.44);ear.rotation.z=s*-0.3;dog.add(ear)}
    const snout=new THREE.Mesh(new THREE.SphereGeometry(0.12,7,6),toon(0x3a2f26));snout.position.set(0,0.86,0.78);dog.add(snout);
    dogTail=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.08,0.5,6),dm);dogTail.geometry.translate(0,0.25,0);
    dogTail.position.set(0,0.62,-0.5);dogTail.rotation.x=-0.9;dog.add(dogTail);
    for(const s of[-1,1])for(const f of[0.3,-0.28]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.4,6),dm);leg.position.set(s*0.2,0.2,f);dog.add(leg)}
    const dz=DP.dog.z;dog.position.set(DP.dog.x,bh(dz),dz);dog.rotation.y=DP.dog.ry;scene.add(dog);collide(DP.dog.x,dz,DP.dog.collide);
  }

  for(const s of CH.SIGNS)makeSign(s.text,s.x,s.z,s.ry);

  // ---- waterline foam sparkle along the sheet-pile ----
  {
    const P=[];
    for(const segs of COAST_SEGS)for(const s of segs){
      for(let t=0;t<s.len;t+=1.7){
        const cx=s.ax+s.tx*t,cz=s.az+s.tz*t,tot=profileTotal(cz);
        P.push([cx+s.nx*(tot+0.45),WATER_Y+0.18,cz+s.nz*(tot+0.45)]);
      }
    }
    const n=P.length,pos=new Float32Array(n*3),aC=new Float32Array(n*3),aS=new Float32Array(n);
    for(let i=0;i<n;i++){pos.set(P[i],i*3);aC.set([0.9,1,1],i*3);aS[i]=1.1;foam.ph.push(rand(0,9));foam.base.push(P[i])}
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    g.setAttribute('aColor',new THREE.BufferAttribute(aC,3));
    g.setAttribute('aSize',new THREE.BufferAttribute(aS,1));
    foam.pts=new THREE.Points(g,pointsMat());foam.pts.frustumCulled=false;scene.add(foam.pts);
  }

  // ---- fireflies ----
  {
    const pos=new Float32Array(fireflies.n*3),aC=new Float32Array(fireflies.n*3),aS=new Float32Array(fireflies.n);
    for(let i=0;i<fireflies.n;i++){
      let x,z;
      if(i<44){x=rand(60,132);z=rand(55,185)}else{const t=treeSpots[rng()*treeSpots.length|0];x=t[0]+rand(-4,4);z=t[1]+rand(-4,4)}
      const y=rand(0.5,2.4);
      fireflies.base.push([x,y,z]);fireflies.ph.push(rand(0,9));
      pos.set([x,y,z],i*3);aC.set([1,0.85,0.45],i*3);aS[i]=rand(0.55,0.95);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    g.setAttribute('aColor',new THREE.BufferAttribute(aC,3));
    g.setAttribute('aSize',new THREE.BufferAttribute(aS,1));
    fireflies.pts=new THREE.Points(g,pointsMat());scene.add(fireflies.pts);
  }
}
