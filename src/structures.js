import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { scene, rng, rand, toon, bmat, curveMat, gmap, pip } from './core.js';
import { LAND, COAST_CORNER, buildSegs, tierProfile, profileTotal } from './coast.js';
import { collide, walkRects } from './props.js';
import { createChibi } from './character.js';
import * as CH from './data/chicago.js';

// =====================================================================
//  STRUCTURES — the buildings + fenced grounds north of the harbor:
//  Waveland clock-tower fieldhouse, the yacht club, the Marovitz golf
//  course, the Bird Sanctuary fence + understory, the dog-beach fence.
//  All placement reads from data/chicago.js; this file is generic.
// =====================================================================

// ---- clock face (canvas texture) — limestone plate, live local time ----
function clockTex(faceHex){
  const cv=document.createElement('canvas');cv.width=cv.height=256;const g=cv.getContext('2d');
  g.fillStyle='#ead9bd';g.fillRect(0,0,256,256);                    // stone plate
  g.strokeStyle='#d8c29a';g.lineWidth=10;g.strokeRect(5,5,246,246);
  const f='#'+faceHex.toString(16).padStart(6,'0');
  g.fillStyle=f;g.beginPath();g.arc(128,128,104,0,7);g.fill();
  g.strokeStyle='#4a3b2f';g.lineWidth=8;g.beginPath();g.arc(128,128,104,0,7);g.stroke();
  g.lineWidth=5;
  for(let i=0;i<12;i++){const a=i*Math.PI/6,r0=i%3===0?78:88,r1=97;
    g.beginPath();g.moveTo(128+Math.cos(a)*r0,128+Math.sin(a)*r0);g.lineTo(128+Math.cos(a)*r1,128+Math.sin(a)*r1);g.stroke();}
  const now=new Date();
  const mA=-Math.PI/2+now.getMinutes()/60*Math.PI*2;
  const hA=-Math.PI/2+((now.getHours()%12)+now.getMinutes()/60)/12*Math.PI*2;
  g.lineCap='round';
  g.lineWidth=11;g.beginPath();g.moveTo(128,128);g.lineTo(128+Math.cos(hA)*52,128+Math.sin(hA)*52);g.stroke();
  g.lineWidth=6;g.beginPath();g.moveTo(128,128);g.lineTo(128+Math.cos(mA)*80,128+Math.sin(mA)*80);g.stroke();
  g.fillStyle='#4a3b2f';g.beginPath();g.arc(128,128,9,0,7);g.fill();
  const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return t;
}
// ---- arched openings (canvas textures, transparent corners) ------------
function archTex(draw){
  const cv=document.createElement('canvas');cv.width=128;cv.height=224;const g=cv.getContext('2d');
  g.fillStyle='#ead9bd';                                            // limestone surround
  g.beginPath();g.moveTo(0,224);g.lineTo(0,64);g.arc(64,64,64,Math.PI,Math.PI*2);g.lineTo(128,224);g.closePath();g.fill();
  g.save();g.beginPath();g.moveTo(14,224);g.lineTo(14,64);g.arc(64,64,50,Math.PI,Math.PI*2);g.lineTo(114,224);g.closePath();g.clip();
  draw(g);g.restore();
  const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return t;
}
const winTex=()=>archTex(g=>{
  g.fillStyle='#ffe9b0';g.fillRect(0,0,128,224);                    // warm glow panes
  g.strokeStyle='#c9a86a';g.lineWidth=5;
  g.beginPath();g.moveTo(64,14);g.lineTo(64,224);g.moveTo(14,112);g.lineTo(114,112);g.stroke();
});
const louverTex=()=>archTex(g=>{
  g.fillStyle='#3c3630';g.fillRect(0,0,128,224);                    // dark belfry opening
  g.fillStyle='#8a7f6d';for(let y=26;y<210;y+=22)g.fillRect(16,y,96,9);   // slats
});

// ---- accumulating fence builder ---------------------------------------
// pushes posts / rails into shared arrays; one InstancedMesh each at the end.
function fenceRun(line,opt,POSTS,RAILS){
  const gates=opt.gates||[];
  const inGate=(x,z)=>gates.some(g=>x>=g.x0&&x<=g.x1&&z>=g.z0&&z<=g.z1);
  const cr=opt.collideR!=null?opt.collideR:opt.spacing*0.62;
  for(let i=0;i<line.length-1;i++){
    const ax=line[i][0],az=line[i][1],bx=line[i+1][0],bz=line[i+1][1];
    const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);
    if(len<1e-4)continue;
    const n=Math.max(1,Math.round(len/opt.spacing)),rot=Math.atan2(dx,dz);
    let prevOK=false,prevX=0,prevZ=0;
    for(let k=0;k<=n;k++){
      const t=k/n,px=ax+dx*t,pz=az+dz*t,gate=inGate(px,pz);
      if(!gate){POSTS.push({x:px,z:pz,h:opt.postH,c:opt.color});if(opt.collide!==false)collide(px,pz,cr,opt.postH*0.85);}
      if(prevOK&&!gate){
        const mx=(prevX+px)/2,mz=(prevZ+pz)/2,seg=Math.hypot(px-prevX,pz-prevZ);
        RAILS.push({x:mx,z:mz,rot,len:seg,y:opt.postH*0.82,c:opt.color});
        RAILS.push({x:mx,z:mz,rot,len:seg,y:opt.postH*0.46,c:opt.color});
      }
      prevOK=!gate;prevX=px;prevZ=pz;
    }
  }
}
function rectLines(b){return [
  [[b.x0,b.z0],[b.x1,b.z0]],[[b.x1,b.z0],[b.x1,b.z1]],
  [[b.x1,b.z1],[b.x0,b.z1]],[[b.x0,b.z1],[b.x0,b.z0]],
];}
function emitFences(POSTS,RAILS){
  if(POSTS.length){
    const post=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055,0.08,1,6),
      curveMat(new THREE.MeshToonMaterial({gradientMap:gmap})),POSTS.length);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3();
    POSTS.forEach((p,i)=>{M.compose(V.set(p.x,p.h/2,p.z),Q.identity(),S.set(1,p.h,1));post.setMatrixAt(i,M);post.setColorAt(i,new THREE.Color(p.c));});
    post.instanceMatrix.needsUpdate=true;post.instanceColor.needsUpdate=true;scene.add(post);
  }
  if(RAILS.length){
    const rail=new THREE.InstancedMesh(new THREE.BoxGeometry(0.07,0.07,1),
      curveMat(new THREE.MeshToonMaterial({gradientMap:gmap})),RAILS.length);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3(),E=new THREE.Euler();
    RAILS.forEach((r,i)=>{E.set(0,r.rot,0);Q.setFromEuler(E);M.compose(V.set(r.x,r.y,r.z),Q,S.set(1,1,r.len));rail.setMatrixAt(i,M);rail.setColorAt(i,new THREE.Color(r.c));});
    rail.instanceMatrix.needsUpdate=true;rail.instanceColor.needsUpdate=true;scene.add(rail);
  }
}

// ---- Lake Shore Drive: low grass berm + paler road ribbon + portals ----
// The berm (x 0-14) sits OUTSIDE the walkable LAND polygon, so it needs no
// colliders (the player is clamped to x >= 14). Toon cars slide on the road
// in the lsd.js content pack. Three underpass portals stand at Belmont z 0,
// Addison z -400, Irving Park z -800 (their "FUTURE ENTRANCE" gag signs were
// removed in task 030 per owner feedback).
function buildUnderpass(zc,P,stone,dark){
  const grp=new THREE.Group(),fx=12.5;
  for(const s of[-1,1]){
    const post=new THREE.Mesh(new THREE.BoxGeometry(1.2,P.h,1.0),stone);post.position.set(fx,P.h/2,s*P.w/2);grp.add(post);
  }
  const lintel=new THREE.Mesh(new THREE.BoxGeometry(1.3,1.0,P.w+2.0),stone);lintel.position.set(fx,P.h-0.3,0);grp.add(lintel);
  const door=new THREE.Mesh(new THREE.BoxGeometry(0.5,P.h-1.1,P.w-0.6),dark);door.position.set(fx-0.4,(P.h-1.1)/2,0);grp.add(door);
  grp.position.set(0,0,zc);scene.add(grp);
}
function buildLSD(){
  const L=CH.LSD,B=L.berm,R=L.road,LN=L.lane;
  const zc=(B.z0+B.z1)/2,len=B.z1-B.z0,xc=(B.x0+B.x1)/2,w=B.x1-B.x0;
  const segZ=Math.max(2,Math.round(len/6));                       // z subdivisions for the world curve
  const berm=new THREE.Mesh(new THREE.BoxGeometry(w,B.h,len,1,1,segZ),toon(B.color));
  berm.position.set(xc,B.h/2,zc);scene.add(berm);
  const rw=R.x1-R.x0,rxc=(R.x0+R.x1)/2;
  const road=new THREE.Mesh(new THREE.BoxGeometry(rw,0.12,len,1,1,segZ),toon(R.color));
  road.position.set(rxc,R.y,zc);scene.add(road);
  // dashed lane lines (3 stripes, instanced)
  const pitch=LN.len+LN.gap,n=Math.floor(len/pitch),xoff=[-3,0,3];
  const dash=new THREE.InstancedMesh(new THREE.BoxGeometry(LN.w,0.02,LN.len),bmat(LN.color),n*xoff.length);
  const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(1,1,1),V=new THREE.Vector3();
  let di=0;
  for(let i=0;i<n;i++){const z=B.z0+(i+0.5)*pitch;for(const dx of xoff){M.compose(V.set(rxc+dx,R.y+0.08,z),Q,S);dash.setMatrixAt(di++,M);}}
  dash.instanceMatrix.needsUpdate=true;scene.add(dash);
  // underpass portals
  const P=L.portal,stone=toon(P.arch),dark=toon(P.recess);
  for(const upz of L.underpasses)buildUnderpass(upz,P,stone,dark);

  // portal detailing (all portals, instanced): voussoir arch band over the
  // opening, a warm lantern on each flank post, and a darker inset plane that
  // reads as a recessed gradient into the tunnel mouth.
  {
    const nU=L.underpasses.length;
    const voussoir=toon(0xe8dcc2),deep=toon(0x120f13);
    const IM=new THREE.Matrix4(),IV=new THREE.Vector3(),IS=new THREE.Vector3(),
      QY=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,Math.PI/2,0)),QI=new THREE.Quaternion();
    const arch=new THREE.InstancedMesh(new THREE.TorusGeometry(3.2,0.24,6,18,Math.PI),voussoir,nU);
    const inner=new THREE.InstancedMesh(new THREE.PlaneGeometry(5.0,2.6),deep,nU);
    const lant=new THREE.InstancedMesh(new THREE.SphereGeometry(0.24,10,8),bmat(0xffd9a0),nU*2);
    L.underpasses.forEach((zc,i)=>{
      IM.compose(IV.set(13.2,3.0,zc),QY,IS.set(1,0.4,1));arch.setMatrixAt(i,IM);        // shallow voussoir arch
      IM.compose(IV.set(12.45,1.45,zc),QY,IS.set(1,1,1));inner.setMatrixAt(i,IM);        // dark inset recess plane
      IM.compose(IV.set(13.2,2.7,zc-P.w/2),QI,IS.set(1,1,1));lant.setMatrixAt(i*2,IM);
      IM.compose(IV.set(13.2,2.7,zc+P.w/2),QI,IS.set(1,1,1));lant.setMatrixAt(i*2+1,IM);
    });
    arch.instanceMatrix.needsUpdate=inner.instanceMatrix.needsUpdate=lant.instanceMatrix.needsUpdate=true;
    scene.add(arch,inner,lant);
  }
}

// ---- Marovitz golf starter kiosk --------------------------------------
// A small pitched-roof starter hut on the course's SOUTH edge (relative to
// GOLF.bounds so it rides along with any data move): serving counter under a
// canopy, a bucket of range balls, and a 'STARTER' sign facing the approach.
function buildGolfClubhouse(){
  const b=CH.GOLF.bounds;
  const cx=(b.x0+b.x1)/2,cz=b.z1-6;                         // centred on the south edge, just inside the fence
  const grp=new THREE.Group();
  const wall=toon(0xefe7cf),roofM=toon(0x527f6d),wood=toon(0xb07a46),postM=toon(0x7c8a74);
  const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(1,1,1),V=new THREE.Vector3();
  const w=3.4,d=2.6,h=2.6;
  const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wall);body.position.y=h/2;grp.add(body);
  // pitched gable roof overhanging SOUTH to shade the serving counter
  const rs=new THREE.Shape();rs.moveTo(-w/2-0.45,0);rs.lineTo(w/2+0.45,0);rs.lineTo(0,1.5);rs.closePath();
  const rg=new THREE.ExtrudeGeometry(rs,{depth:d+1.7,bevelEnabled:false});rg.translate(0,0,-(d/2+0.2));
  const roof=new THREE.Mesh(rg,roofM);roof.position.y=h;grp.add(roof);
  // two posts carrying the canopy front corners (instanced)
  const posts=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08,0.08,h,6),postM,2);
  [-1,1].forEach((s,i)=>{M.compose(V.set(s*(w/2-0.2),h/2,d/2+1.15),Q.identity(),S);posts.setMatrixAt(i,M);});
  posts.instanceMatrix.needsUpdate=true;grp.add(posts);
  // serving counter under the canopy
  const counter=new THREE.Mesh(new THREE.BoxGeometry(w-0.4,0.16,0.55),wood);counter.position.set(0,1.05,d/2+0.9);grp.add(counter);
  // ball bucket + a little pile of range balls (instanced)
  const bucket=new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.2,0.5,10),toon(0x9aa0a6));bucket.position.set(w/2-0.6,1.3,d/2+0.9);grp.add(bucket);
  const balls=new THREE.InstancedMesh(new THREE.SphereGeometry(0.11,8,7),toon(0xffffff),5);
  [[0,0.62,0],[0.13,0.6,0.05],[-0.12,0.6,-0.04],[0.05,0.68,-0.12],[-0.06,0.66,0.12]].forEach((p,i)=>{
    M.compose(V.set(w/2-0.6+p[0],1.3+p[1],d/2+0.9+p[2]),Q.identity(),S);balls.setMatrixAt(i,M);});
  balls.instanceMatrix.needsUpdate=true;grp.add(balls);
  // 'STARTER' canvas sign facing the southern approach
  const cv=document.createElement('canvas');cv.width=256;cv.height=72;const g=cv.getContext('2d');
  g.fillStyle='#2f5d3a';g.fillRect(0,0,256,72);g.strokeStyle='#fdf6e6';g.lineWidth=6;g.strokeRect(5,5,246,62);
  g.fillStyle='#fdf6e6';g.textAlign='center';g.textBaseline='middle';g.font='700 34px "Trebuchet MS",sans-serif';g.fillText('STARTER',128,40);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.9,0.54),curveMat(new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv)})));
  sign.position.set(0,2.55,d/2+0.05);grp.add(sign);
  grp.position.set(cx,0,cz);scene.add(grp);
  collide(cx,cz,2.4);
}

// ---- Waveland clock-tower fieldhouse ----------------------------------
function buildFieldhouse(){
  const F=CH.FIELDHOUSE,grp=new THREE.Group();
  const brick=toon(F.brick),trim=toon(F.trim),roofM=toon(F.roof);
  const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(1,1,1),V=new THREE.Vector3(),E=new THREE.Euler();

  // main hall: brick over a limestone plinth, trim eave, gabled copper roof
  const body=new THREE.Mesh(new THREE.BoxGeometry(F.body.w,F.body.h,F.body.d),brick);body.position.y=F.body.h/2;grp.add(body);
  const plinth=new THREE.Mesh(new THREE.BoxGeometry(F.body.w+0.26,0.8,F.body.d+0.26),trim);plinth.position.y=0.4;grp.add(plinth);
  const eave=new THREE.Mesh(new THREE.BoxGeometry(F.body.w+0.34,0.28,F.body.d+0.34),trim);eave.position.y=F.body.h-0.14;grp.add(eave);
  const rs=new THREE.Shape();rs.moveTo(-F.body.w/2-0.4,0);rs.lineTo(F.body.w/2+0.4,0);rs.lineTo(0,3.1);rs.closePath();
  const rg=new THREE.ExtrudeGeometry(rs,{depth:F.body.d+0.7,bevelEnabled:false});rg.translate(0,0,-(F.body.d+0.7)/2);
  const roof=new THREE.Mesh(rg,roofM);roof.position.y=F.body.h;grp.add(roof);

  // lower west wing with its own little gable
  const W=F.wing;
  const wing=new THREE.Mesh(new THREE.BoxGeometry(W.w,W.h,W.d),brick);wing.position.set(W.off,W.h/2,0);grp.add(wing);
  const ws=new THREE.Shape();ws.moveTo(-W.w/2-0.3,0);ws.lineTo(W.w/2+0.3,0);ws.lineTo(0,1.7);ws.closePath();
  const wg=new THREE.ExtrudeGeometry(ws,{depth:W.d+0.5,bevelEnabled:false});wg.translate(0,0,-(W.d+0.5)/2);
  const wroof=new THREE.Mesh(wg,roofM);wroof.position.set(W.off,W.h,0);grp.add(wroof);

  // door in a deep limestone surround + a step (south face)
  const sur=new THREE.Mesh(new THREE.BoxGeometry(2.2,3.1,0.36),trim);sur.position.set(-0.8,1.55,F.body.d/2+0.03);grp.add(sur);
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.4,2.5,0.14),toon(0x5f3c22));door.position.set(-0.8,1.25,F.body.d/2+0.16);grp.add(door);
  const step=new THREE.Mesh(new THREE.BoxGeometry(1.9,0.22,0.7),trim);step.position.set(-0.8,0.11,F.body.d/2+0.55);grp.add(step);

  // arched glow windows — one instanced plane, shared canvas texture
  const WIN=[
    [-3.9,F.body.d/2+0.04,0],[-2.4,F.body.d/2+0.04,0],
    [-3.6,-F.body.d/2-0.04,Math.PI],[0,-F.body.d/2-0.04,Math.PI],[3.6,-F.body.d/2-0.04,Math.PI],
    [W.off-1.5,W.d/2+0.04,0],[W.off+1.5,W.d/2+0.04,0],
  ];
  const win=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.05,1.85),bmat(0xffffff,{map:winTex(),transparent:true}),WIN.length);
  WIN.forEach((w,i)=>{E.set(0,w[2],0);Q.setFromEuler(E);M.compose(V.set(w[0],2.35,w[1]),Q,S.set(1,1,1));win.setMatrixAt(i,M);});
  win.instanceMatrix.needsUpdate=true;grp.add(win);

  // ---- the tower: brick shaft, quoined corners, louvered belfry,
  //      limestone clock stage (faces on ALL FOUR sides), dentil cornice,
  //      steep copper pyramid, finial ----
  const T=F.tower,tw=T.w,tx=T.off[0],tz=T.off[1];
  const shaftH=T.h-3.9;
  const shaft=new THREE.Mesh(new THREE.BoxGeometry(tw,shaftH,tw),brick);shaft.position.set(tx,shaftH/2,tz);grp.add(shaft);
  const QROWS=Math.floor((shaftH-1)/1.05),corners=[[1,1],[1,-1],[-1,1],[-1,-1]];
  const quoin=new THREE.InstancedMesh(new THREE.BoxGeometry(0.42,0.5,0.42),trim,QROWS*4);
  let qi=0;
  for(let r=0;r<QROWS;r++)for(const[cx,cz]of corners){
    const qs=r%2?0.76:1;
    M.compose(V.set(tx+cx*tw/2,0.95+r*1.05,tz+cz*tw/2),Q.identity(),S.set(qs,1,qs));
    quoin.setMatrixAt(qi++,M);
  }
  quoin.instanceMatrix.needsUpdate=true;grp.add(quoin);
  // tall arched louvers near the shaft top, all four faces
  const ldist=tw/2+0.04,ly=shaftH-1.65;
  const louv=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.15,2.05),bmat(0xffffff,{map:louverTex(),transparent:true}),4);
  [[0,ldist,0],[ldist,0,Math.PI/2],[0,-ldist,Math.PI],[-ldist,0,-Math.PI/2]].forEach((p,i)=>{
    E.set(0,p[2],0);Q.setFromEuler(E);M.compose(V.set(tx+p[0],ly,tz+p[1]),Q,S.set(1,1,1));louv.setMatrixAt(i,M);
  });
  louv.instanceMatrix.needsUpdate=true;grp.add(louv);
  // stone belt → limestone clock stage
  const belt=new THREE.Mesh(new THREE.BoxGeometry(tw+0.34,0.42,tw+0.34),toon(F.stone));belt.position.set(tx,shaftH+0.21,tz);grp.add(belt);
  const stageH=2.5;
  const stage=new THREE.Mesh(new THREE.BoxGeometry(tw+0.12,stageH,tw+0.12),trim);stage.position.set(tx,shaftH+0.42+stageH/2,tz);grp.add(stage);
  // four clock faces (west reads from the park), hands at real local time
  const cy=shaftH+0.42+stageH/2,cd=(tw+0.12)/2+0.03,cs2=F.clock.r*2;
  const clocks=new THREE.InstancedMesh(new THREE.PlaneGeometry(cs2,cs2),bmat(0xffffff,{map:clockTex(F.clock.face)}),4);
  [[0,cd,0],[cd,0,Math.PI/2],[0,-cd,Math.PI],[-cd,0,-Math.PI/2]].forEach((p,i)=>{
    E.set(0,p[2],0);Q.setFromEuler(E);M.compose(V.set(tx+p[0],cy,tz+p[1]),Q,S.set(1,1,1));clocks.setMatrixAt(i,M);
  });
  clocks.instanceMatrix.needsUpdate=true;grp.add(clocks);
  // dentil cornice → steep copper pyramid → finial
  const corTop=shaftH+0.42+stageH;
  const cor1=new THREE.Mesh(new THREE.BoxGeometry(tw+0.5,0.22,tw+0.5),trim);cor1.position.set(tx,corTop+0.11,tz);grp.add(cor1);
  const cor2=new THREE.Mesh(new THREE.BoxGeometry(tw+0.78,0.2,tw+0.78),trim);cor2.position.set(tx,corTop+0.32,tz);grp.add(cor2);
  const cap=new THREE.Mesh(new THREE.ConeGeometry((tw+0.78)*0.74,T.roofH,4),roofM);cap.rotation.y=Math.PI/4;cap.position.set(tx,corTop+0.42+T.roofH/2,tz);grp.add(cap);
  const fin=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1.1,5),toon(0xd9cbb2));fin.position.set(tx,corTop+0.42+T.roofH+0.35,tz);grp.add(fin);
  const finB=new THREE.Mesh(new THREE.SphereGeometry(0.14,8,7),toon(0xf0d98a));finB.position.set(tx,corTop+0.42+T.roofH+0.85,tz);grp.add(finB);

  grp.position.set(F.pos[0],F.pos[1],F.pos[2]);grp.rotation.y=F.ry;scene.add(grp);
  collide(F.pos[0],F.pos[2],F.collide);
  collide(F.pos[0]+W.off,F.pos[2],3.9);
}

// ---- yacht club (peninsula) -------------------------------------------
function buildYachtClub(){
  const Y=CH.YACHT_CLUB,grp=new THREE.Group();
  const bw=Y.body.w,bh=Y.body.h,bd=Y.body.d;
  const wall=toon(Y.wall),trim=toon(Y.trim),roofM=toon(Y.roof);
  const stone=toon(0xbcb2a2),clap=toon(0xe0d5bf);
  const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(1,1,1),V=new THREE.Vector3(),E=new THREE.Euler();

  const plinth=new THREE.Mesh(new THREE.BoxGeometry(bw+0.3,0.55,bd+0.3),stone);plinth.position.y=0.27;grp.add(plinth);   // limestone foundation
  const body=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),wall);body.position.y=bh/2;grp.add(body);
  const band=new THREE.Mesh(new THREE.BoxGeometry(bw+0.12,0.35,bd+0.12),trim);band.position.y=bh-0.3;grp.add(band);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(bw*0.82,2.6,4),roofM);roof.rotation.y=Math.PI/4;roof.position.y=bh+1.3;grp.add(roof);

  // clapboard siding hint: 3 thin horizontal lap lines wrapping all 4 walls (1 instanced mesh)
  const clapM=new THREE.InstancedMesh(new THREE.BoxGeometry(1,0.06,0.04),clap,12);let clapI=0;
  for(const y of[1.3,2.5,3.7]){
    for(const sz of[1,-1]){M.compose(V.set(0,y,sz*(bd/2+0.02)),Q.identity(),S.set(bw+0.04,1,1));clapM.setMatrixAt(clapI++,M);}
    for(const sx of[1,-1]){E.set(0,Math.PI/2,0);Q.setFromEuler(E);M.compose(V.set(sx*(bw/2+0.02),y,0),Q,S.set(bd+0.04,1,1));clapM.setMatrixAt(clapI++,M);}
  }
  clapM.instanceMatrix.needsUpdate=true;grp.add(clapM);S.set(1,1,1);

  // door + a small covered porch (posts + flat roof) on the south face
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.1,2.1,0.12),trim);door.position.set(0,1.05,bd/2+0.02);grp.add(door);
  const pPosts=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08,0.08,2.4,6),wall,2);
  [-1,1].forEach((sx,i)=>{M.compose(V.set(sx*0.9,1.2,bd/2+1.2),Q.identity(),S);pPosts.setMatrixAt(i,M);});
  pPosts.instanceMatrix.needsUpdate=true;grp.add(pPosts);
  const porch=new THREE.Mesh(new THREE.BoxGeometry(2.6,0.16,1.55),roofM);porch.position.set(0,2.5,bd/2+0.6);grp.add(porch);

  // glow windows + flanking shutters
  const WINS=[];
  for(const wy of[1.8,3.9])for(const wx of[-2.3,0,2.3]){
    if(wy<3&&wx===0)continue;   // door occupies the ground-floor centre
    WINS.push([wx,wy]);
    const win=new THREE.Mesh(new THREE.BoxGeometry(0.9,1,0.12),curveMat(new THREE.MeshBasicMaterial({color:0xcfe9ff})));win.position.set(wx,wy,bd/2+0.02);grp.add(win);
  }
  const shut=new THREE.InstancedMesh(new THREE.BoxGeometry(0.16,1.02,0.05),trim,WINS.length*2);let shutI=0;
  for(const[wx,wy]of WINS)for(const sx of[-1,1]){M.compose(V.set(wx+sx*0.62,wy,bd/2+0.05),Q.identity(),S);shut.setMatrixAt(shutI++,M);}
  shut.instanceMatrix.needsUpdate=true;grp.add(shut);

  // burgee flag pole (toward the basin)
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,4.2,6),toon(0xd9cbb2));pole.position.set(bw/2-0.4,bh+2,bd/2-0.4);grp.add(pole);
  const bs=new THREE.Shape();bs.moveTo(0,0);bs.lineTo(1.5,0.28);bs.lineTo(0,0.56);bs.closePath();
  const burgee=new THREE.Mesh(new THREE.ShapeGeometry(bs),curveMat(new THREE.MeshBasicMaterial({color:Y.burgee,side:THREE.DoubleSide})));
  burgee.position.set(bw/2-0.34,bh+3.4,bd/2-0.4);grp.add(burgee);

  // rooftop cupola with a pyramid cap + tiny burgee
  const cupola=new THREE.Mesh(new THREE.BoxGeometry(1.0,1.1,1.0),wall);cupola.position.set(0,bh+2.05,0);grp.add(cupola);
  const cupCap=new THREE.Mesh(new THREE.ConeGeometry(0.82,0.6,4),roofM);cupCap.rotation.y=Math.PI/4;cupCap.position.set(0,bh+2.9,0);grp.add(cupCap);
  const cbs=new THREE.Shape();cbs.moveTo(0,0);cbs.lineTo(0.7,0.13);cbs.lineTo(0,0.26);cbs.closePath();
  const cupBurgee=new THREE.Mesh(new THREE.ShapeGeometry(cbs),curveMat(new THREE.MeshBasicMaterial({color:Y.burgee,side:THREE.DoubleSide})));
  cupBurgee.position.set(0,bh+3.06,0);grp.add(cupBurgee);

  grp.position.set(Y.pos[0],Y.pos[1],Y.pos[2]);grp.rotation.y=Y.ry;scene.add(grp);
  collide(Y.pos[0],Y.pos[2],Y.collide);
}

// ---- John Henry's 'Chevron' (blue steel sculpture, south lawn) ---------
// Task-021 rework per the owner's photos (refs/diversey-corner/): TWO-TONE —
// a tapered main BLADE mast (narrow base flaring to a beveled chisel tip),
// pale powder blue over a darker steel-blue base — plus a second leaning
// blade and slender square beams CROSSING the masts like pick-up sticks.
// No shared rng (determinism-safe).
// taperedBlade: a vertical blade through `levels` [[y,w,t],..] sliced at
// splitY into a steel lower + pale upper mesh (the paint line). Built from a
// height-segmented box whose vertex rows are re-mapped to the level profile.
function taperedBlade(levels,splitY,paleM,steelM,grp,ry,lean,off=[0,0]){
  const lerpAt=y=>{                       // width/thickness at height y
    for(let i=0;i<levels.length-1;i++){
      const[a,b]=[levels[i],levels[i+1]];
      if(y<=b[0]||i===levels.length-2){
        const f=Math.min(1,Math.max(0,(y-a[0])/(b[0]-a[0])));
        return[a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f];
      }
    }
  };
  const piece=(y0,y1,mat)=>{
    const rows=[y0];                      // include every level break inside the piece
    for(const[ly]of levels)if(ly>y0+1e-4&&ly<y1-1e-4)rows.push(ly);
    rows.push(y1);
    const geo=new THREE.BoxGeometry(1,1,1,1,rows.length-1,1).toNonIndexed();
    const pos=geo.attributes.position;
    for(let i=0;i<pos.count;i++){
      const r=Math.round((pos.getY(i)+0.5)*(rows.length-1));
      const[w,t]=lerpAt(rows[r]);
      pos.setXYZ(i,Math.sign(pos.getX(i))*w/2||0,rows[r],Math.sign(pos.getZ(i))*t/2||0);
    }
    geo.computeVertexNormals();
    const m=new THREE.Mesh(geo,mat);
    m.rotation.set(lean[1],ry,lean[0]);m.position.set(off[0],0,off[1]);grp.add(m);
  };
  piece(levels[0][0],splitY,steelM);
  piece(splitY,levels[levels.length-1][0],paleM);
}
function buildChevron(){
  const C=CH.CHEVRON,grp=new THREE.Group();
  const pale=toon(C.pale),steel=toon(C.steel),conc=toon(C.pad.color);
  // concrete pad
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(C.pad.r,C.pad.r+0.16,C.pad.h,20),conc);pad.position.y=C.pad.h/2;grp.add(pad);
  // the two tapered blades (two-tone: steel base under the pale upper)
  taperedBlade(C.mast.levels,C.mast.splitY,pale,steel,grp,C.mast.ry,C.mast.lean);
  taperedBlade(C.blade2.levels,C.blade2.splitY,pale,steel,grp,C.blade2.ry,C.blade2.lean,C.blade2.off);
  // slender square-section beams crossing the masts (centre + axis, both ways)
  const up=new THREE.Vector3(0,1,0),dir=new THREE.Vector3(),Q=new THREE.Quaternion();
  for(const a of C.arms){
    dir.set(a.d[0],a.d[1],a.d[2]).normalize();Q.setFromUnitVectors(up,dir);
    const beam=new THREE.Mesh(new THREE.BoxGeometry(a.t,a.L,a.t),steel);
    beam.quaternion.copy(Q);beam.position.set(a.c[0],a.c[1],a.c[2]);grp.add(beam);
  }
  grp.position.set(C.pos[0],C.pos[1],C.pos[2]);scene.add(grp);
  collide(C.pos[0],C.pos[2],C.collide);
}

// ---- Marovitz golf course ---------------------------------------------
function buildGolf(POSTS,RAILS){
  const G=CH.GOLF,b=G.bounds;
  // fairway sheet
  const fw=new THREE.Mesh(new THREE.PlaneGeometry(b.x1-b.x0,b.z1-b.z0),toon(G.fairway,{}));
  fw.rotation.x=-Math.PI/2;fw.position.set((b.x0+b.x1)/2,0.03,(b.z0+b.z1)/2);scene.add(fw);
  const IM=new THREE.Matrix4(),IQ=new THREE.Quaternion(),IS=new THREE.Vector3(),IV=new THREE.Vector3();
  const flatQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
  // sand bunkers (instanced)
  {
    const bunk=new THREE.InstancedMesh(new THREE.CircleGeometry(1,20),toon(G.sand,{}),G.bunkers.length);
    G.bunkers.forEach(([bx,bz,br],i)=>{IM.compose(IV.set(bx,0.05,bz),flatQ,IS.set(br*rand(0.9,1.3),br,1));bunk.setMatrixAt(i,IM);});
    bunk.instanceMatrix.needsUpdate=true;scene.add(bunk);
  }
  // putting greens + pin flags (instanced: greens, poles, flags, cups)
  {
    const nP=G.pins.length;
    const greens=new THREE.InstancedMesh(new THREE.CircleGeometry(1,22),toon(G.green,{}),nP);
    const poles=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03,0.03,2,5),toon(0xf2f2f2),nP);
    const fs=new THREE.Shape();fs.moveTo(0,0);fs.lineTo(0.8,-0.28);fs.lineTo(0,-0.56);fs.closePath();
    const flags=new THREE.InstancedMesh(new THREE.ShapeGeometry(fs),curveMat(new THREE.MeshBasicMaterial({color:G.flag,side:THREE.DoubleSide})),nP);
    const cups=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12,0.12,0.06,10),toon(0x2a2a2a),nP);
    G.pins.forEach(([px,pz],i)=>{
      IM.compose(IV.set(px,0.06,pz),flatQ,IS.set(G.greenR,G.greenR,1));greens.setMatrixAt(i,IM);
      IM.compose(IV.set(px,1,pz),IQ.identity(),IS.set(1,1,1));poles.setMatrixAt(i,IM);
      IM.compose(IV.set(px,1.95,pz),IQ.identity(),IS.set(1,1,1));flags.setMatrixAt(i,IM);
      IM.compose(IV.set(px,0.08,pz),IQ.identity(),IS.set(1,1,1));cups.setMatrixAt(i,IM);
    });
    greens.instanceMatrix.needsUpdate=poles.instanceMatrix.needsUpdate=flags.instanceMatrix.needsUpdate=cups.instanceMatrix.needsUpdate=true;
    scene.add(greens,poles,flags,cups);
  }
  // low fence: west + south + north (lake side is the revetment)
  const f=G.fence;
  fenceRun([[b.x0,b.z1],[b.x0,b.z0]],{spacing:f.spacing,postH:f.postH,color:f.color,collideR:1.25},POSTS,RAILS); // west
  fenceRun([[b.x0,b.z1],[b.x1,b.z1]],{spacing:f.spacing,postH:f.postH,color:f.color,collideR:1.25},POSTS,RAILS); // south
  fenceRun([[b.x0,b.z0],[b.x1,b.z0]],{spacing:f.spacing,postH:f.postH,color:f.color,collideR:1.25},POSTS,RAILS); // north
}

// ---- Bird Sanctuary — the hero ROOM ------------------------------------
// Organic fence loop + gate arch, layered native planting kept off the
// interior walking loop (the loop RIBBON itself is built in paths.js so
// pathSamples guards it), dappled clearings, and the elevated bird-watching
// DECK (walkable via walkRects, sittable via the sanctuary pack).
function buildSanctuary(POSTS,RAILS){
  const S=CH.SANCTUARY;
  const outline=CH.sanctuaryOutline(),loop=CH.sanctuaryLoop();
  // 1. the organic fence (west gate gap)
  fenceRun(outline,{spacing:S.fence.spacing,postH:S.fence.postH,color:S.fence.color,collideR:1.2,gates:[S.gate]},POSTS,RAILS);
  // 2. gate ARCH — the room's door
  {
    const A=S.arch,pm=toon(A.beam);
    const pgeo=new THREE.CylinderGeometry(0.09,0.11,A.h,7);
    for(const s of[-1,1]){
      const p=new THREE.Mesh(pgeo,pm);p.position.set(A.x,A.h/2,A.z+s*A.w/2);scene.add(p);
      collide(A.x,A.z+s*A.w/2,0.3,A.h*0.85);
    }
    const beam=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.3,A.w+0.5),pm);beam.position.set(A.x,A.h+0.05,A.z);scene.add(beam);
    const plank=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.42,2.2),toon(0xc9b183));plank.position.set(A.x,A.h-0.36,A.z);scene.add(plank);
  }
  // shared placement filters: inside the outline, off the loop, out of clearings
  const clr2=S.understory.pathClear*S.understory.pathClear;
  const offLoop=(x,z)=>{for(let i=0;i<loop.length;i++){const dx=x-loop[i][0],dz=z-loop[i][1];if(dx*dx+dz*dz<clr2)return false}return true};
  const offClear=(x,z)=>{for(const[cx,cz,r]of S.clearings){const dx=x-cx,dz=z-cz;if(dx*dx+dz*dz<r*r)return false}return true};
  const b=S.bounds;
  // 3. dense understory shrubs (dark greens), layered sizes
  {
    const U=S.understory,cols=U.colors.map(c=>new THREE.Color(c));
    const shrub=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,7),curveMat(new THREE.MeshToonMaterial({gradientMap:gmap})),U.count);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),Sc=new THREE.Vector3(),V=new THREE.Vector3();
    let placed=0,guard=0;
    while(placed<U.count&&guard++<U.guard){
      const x=rand(b.x0+1,b.x1-1),z=rand(b.z0+1,b.z1-1);
      const s=rand(U.scale[0],U.scale[1]);                    // draws happen every attempt (stable rng cadence)
      if(!pip(x,z,outline)||!offLoop(x,z)||!offClear(x,z))continue;
      M.compose(V.set(x,s*0.75,z),Q.identity(),Sc.set(s,s*0.85,s));shrub.setMatrixAt(placed,M);
      shrub.setColorAt(placed,cols[(rng()*cols.length)|0]);placed++;
    }
    shrub.count=placed;shrub.instanceMatrix.needsUpdate=true;shrub.instanceColor.needsUpdate=true;scene.add(shrub);
  }
  // 4. native prairie layer: tall grass tufts + purple/yellow wildflowers
  {
    const P=S.prairie;
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),Sc=new THREE.Vector3(1,1,1),V=new THREE.Vector3();
    const tufts=new THREE.InstancedMesh(new THREE.ConeGeometry(0.11,1.05,5),toon(P.tuftColor,{}),P.tufts);
    let pt=0,guard=0;
    while(pt<P.tufts&&guard++<P.tufts*6){
      const x=rand(b.x0+1,b.x1-1),z=rand(b.z0+1,b.z1-1),s=rand(0.7,1.5);
      if(!pip(x,z,outline)||!offLoop(x,z)||!offClear(x,z))continue;
      M.compose(V.set(x,0.5*s,z),Q,Sc.set(s,s,s));tufts.setMatrixAt(pt++,M);
    }
    tufts.count=pt;tufts.instanceMatrix.needsUpdate=true;scene.add(tufts);
    const fcols=P.flowerColors.map(c=>new THREE.Color(c));
    const stems=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02,0.02,0.5,4),toon(0x4f7a42,{}),P.flowers);
    const heads=new THREE.InstancedMesh(new THREE.SphereGeometry(0.09,6,5),toon(0xffffff,{}),P.flowers);
    let pf=0;guard=0;
    while(pf<P.flowers&&guard++<P.flowers*6){
      const x=rand(b.x0+1,b.x1-1),z=rand(b.z0+1,b.z1-1);
      const ci=(rng()*fcols.length)|0;
      if(!pip(x,z,outline)||!offLoop(x,z))continue;
      M.compose(V.set(x,0.25,z),Q,Sc.set(1,1,1));stems.setMatrixAt(pf,M);
      M.compose(V.set(x,0.55,z),Q,Sc.set(1,1,1));heads.setMatrixAt(pf,M);
      heads.setColorAt(pf,fcols[ci]);pf++;
    }
    stems.count=heads.count=pf;
    stems.instanceMatrix.needsUpdate=heads.instanceMatrix.needsUpdate=true;
    heads.instanceColor.needsUpdate=true;scene.add(stems,heads);
  }
  // 5. dappled clearings — soft lighter-green circles
  {
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0)),Sc=new THREE.Vector3(),V=new THREE.Vector3();
    const inst=new THREE.InstancedMesh(new THREE.CircleGeometry(1,20),bmat(0x8fd07c),S.clearings.length);
    S.clearings.forEach(([cx,cz,r],i)=>{M.compose(V.set(cx,0.025,cz),Q,Sc.set(r,r*0.85,1));inst.setMatrixAt(i,M);});
    inst.instanceMatrix.needsUpdate=true;scene.add(inst);
  }
  // 6. the DECK — elevated bird-watching platform (walkable + sittable)
  {
    const D=S.deck,cx=(D.x0+D.x1)/2,cz=(D.z0+D.z1)/2,w=D.x1-D.x0,d=D.z1-D.z0;
    const wood=toon(D.wood),plankM=toon(D.plank),railM=toon(D.rail);
    const pg=new THREE.CylinderGeometry(0.14,0.17,D.h,7);
    for(const[px,pz]of[[D.x0+0.35,D.z0+0.35],[D.x1-0.35,D.z0+0.35],[D.x0+0.35,D.z1-0.35],[D.x1-0.35,D.z1-0.35],[cx,D.z0+0.35],[cx,D.z1-0.35]]){
      const p=new THREE.Mesh(pg,wood);p.position.set(px,D.h/2,pz);scene.add(p);
      collide(px,pz,0.26,D.h*0.9);
    }
    const top=new THREE.Mesh(new THREE.BoxGeometry(w+0.3,0.2,d+0.3),plankM);top.position.set(cx,D.h-0.1,cz);scene.add(top);
    const rim=new THREE.Mesh(new THREE.BoxGeometry(w+0.44,0.3,d+0.44),wood);rim.position.set(cx,D.h-0.34,cz);scene.add(rim);
    // guard rails on N/E/S rims (stairs land on the WEST edge): posts + top bar
    const railPosts=[],railBars=[];
    const edge=(x1,z1,x2,z2)=>{railBars.push([x1,z1,x2,z2]);
      const len=Math.hypot(x2-x1,z2-z1),n=Math.max(2,Math.round(len/1.3));
      for(let k=0;k<=n;k++)railPosts.push([x1+(x2-x1)*k/n,z1+(z2-z1)*k/n]);};
    edge(D.x0,D.z0,D.x1,D.z0);                       // north rim
    edge(D.x1,D.z0,D.x1,D.z1);                       // east rim (behind the sit spots)
    edge(D.x0,D.z1,D.x1,D.z1);                       // south rim
    edge(D.x0,D.z0,D.x0,D.stairs[0].z0);             // west rim, north of the stair landing
    edge(D.x0,D.stairs[0].z1,D.x0,D.z1);             // west rim, south of the stair landing
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),Sc=new THREE.Vector3(1,1,1),V=new THREE.Vector3(),E=new THREE.Euler();
    const rpost=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045,0.045,1.02,6),railM,railPosts.length);
    railPosts.forEach(([px,pz],i)=>{M.compose(V.set(px,D.h+0.51,pz),Q.identity(),Sc.set(1,1,1));rpost.setMatrixAt(i,M);});
    rpost.instanceMatrix.needsUpdate=true;scene.add(rpost);
    const rbar=new THREE.InstancedMesh(new THREE.BoxGeometry(0.07,0.09,1),railM,railBars.length);
    railBars.forEach(([x1,z1,x2,z2],i)=>{
      const len=Math.hypot(x2-x1,z2-z1);E.set(0,Math.atan2(x2-x1,z2-z1),0);Q.setFromEuler(E);
      M.compose(V.set((x1+x2)/2,D.h+1.02,(z1+z2)/2),Q,Sc.set(1,1,len));rbar.setMatrixAt(i,M);
    });
    rbar.instanceMatrix.needsUpdate=true;scene.add(rbar);
    // rail collision (blocks stepping through at deck level; the skirt below)
    for(const[x1,z1,x2,z2]of railBars){
      const len=Math.hypot(x2-x1,z2-z1),n=Math.max(2,Math.round(len/0.8));
      for(let k=0;k<=n;k++)collide(x1+(x2-x1)*k/n,z1+(z2-z1)*k/n,0.22,D.h+1.1);
    }
    // stairs — solid risers on the west side; each is its own walk rect
    for(const st of D.stairs){
      const sw=st.x1-st.x0,sd=st.z1-st.z0;
      const step=new THREE.Mesh(new THREE.BoxGeometry(sw,st.h,sd),plankM);
      step.position.set((st.x0+st.x1)/2,st.h/2,(st.z0+st.z1)/2);scene.add(step);
      walkRects.push({x1:st.x0,x2:st.x1,z1:st.z0,z2:st.z1,h:st.h});
    }
    walkRects.push({x1:D.x0,x2:D.x1,z1:D.z0,z2:D.z1,h:D.h});
  }
}

// ---- dog-beach fence --------------------------------------------------
function buildDogFence(POSTS,RAILS){
  const D=CH.DOG_FENCE;
  for(const ln of D.lines)fenceRun(ln,{spacing:D.spacing,postH:D.postH,color:D.color,collideR:0.9,gates:D.gates},POSTS,RAILS);
}

// ---- Waveland tennis courts (2x2 block) -------------------------------
// One shared canvas texture for the green court slab (white perimeter, net
// line, centre service lines) instanced across the 4 courts; net posts + a
// thin sagging net box per court; a low fence with one gate (shared instanced
// mesh via fenceRun). Consumes NO shared rng (determinism-safe).
function tennisTex(slabHex,lineHex){
  const cv=document.createElement('canvas');cv.width=128;cv.height=140;const g=cv.getContext('2d');
  const line='#'+lineHex.toString(16).padStart(6,'0');
  g.fillStyle='#'+slabHex.toString(16).padStart(6,'0');g.fillRect(0,0,128,140);
  g.strokeStyle=line;g.lineWidth=4;g.strokeRect(12,10,104,120);           // baselines + sidelines
  g.lineWidth=3;
  g.beginPath();g.moveTo(12,70);g.lineTo(116,70);g.stroke();              // net line (mid-length)
  g.strokeRect(24,10,80,120);                                            // singles sidelines
  g.beginPath();g.moveTo(24,40);g.lineTo(104,40);g.stroke();             // service line (top half)
  g.beginPath();g.moveTo(24,100);g.lineTo(104,100);g.stroke();           // service line (bottom half)
  g.beginPath();g.moveTo(64,40);g.lineTo(64,100);g.stroke();             // centre service line
  const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return t;
}
function buildTennis(POSTS,RAILS){
  const T=CH.TENNIS,b=T.block,C=T.court;
  const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(1,1,1),V=new THREE.Vector3();
  const flatQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
  // court slabs — one shared texture, one instanced plane
  const slabs=new THREE.InstancedMesh(new THREE.PlaneGeometry(C.w,C.d),
    curveMat(new THREE.MeshBasicMaterial({map:tennisTex(T.slab,T.line)})),T.courts.length);
  T.courts.forEach(([cx,cz],i)=>{M.compose(V.set(cx,0.04,cz),flatQ,S);slabs.setMatrixAt(i,M);});
  slabs.instanceMatrix.needsUpdate=true;scene.add(slabs);
  // net posts (2 per court) + sagging net box (1 per court)
  const posts=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05,0.06,T.net.postH,6),toon(0xf2f2f2),T.courts.length*2);
  const nets=new THREE.InstancedMesh(new THREE.BoxGeometry(C.w+0.4,T.net.h,0.06),toon(T.netColor,{}),T.courts.length);
  let pi=0;
  T.courts.forEach(([cx,cz],i)=>{
    for(const sx of[-1,1]){M.compose(V.set(cx+sx*(C.w/2+0.2),T.net.postH/2,cz),Q.identity(),S);posts.setMatrixAt(pi++,M);collide(cx+sx*(C.w/2+0.2),cz,0.2);}
    M.compose(V.set(cx,T.net.h/2,cz),Q.identity(),S);nets.setMatrixAt(i,M);
  });
  posts.instanceMatrix.needsUpdate=nets.instanceMatrix.needsUpdate=true;scene.add(posts,nets);
  // low perimeter fence with one gate (south side), shared instanced mesh
  const f=T.fence,opt={spacing:f.spacing,postH:f.postH,color:f.color,collideR:1.15,gates:[T.gate]};
  fenceRun([[b.x0,b.z0],[b.x1,b.z0]],opt,POSTS,RAILS);   // north
  fenceRun([[b.x1,b.z0],[b.x1,b.z1]],opt,POSTS,RAILS);   // east
  fenceRun([[b.x1,b.z1],[b.x0,b.z1]],opt,POSTS,RAILS);   // south (gate)
  fenceRun([[b.x0,b.z1],[b.x0,b.z0]],opt,POSTS,RAILS);   // west
}

// ---- Diversey driving range + mini golf -------------------------------
// (a) green range strip fenced W/N/E (open at the south tee line), 4 tee mats,
// 3 distance boards, ~30 scattered balls (LOCAL rng — no shared-rng shift),
// a ball bucket; (b) mini-golf corner: 3 whimsical holes on felt fairways with
// wood rails — a STATIC windmill (builders can't registerUpdate), a loop ramp,
// and a tiny Waveland clock-tower replica. Colliders on the solid props.
function diverseyBoardTex(txt){
  const cv=document.createElement('canvas');cv.width=96;cv.height=64;const g=cv.getContext('2d');
  g.fillStyle='#fdf6e6';g.fillRect(0,0,96,64);g.strokeStyle='#3a6b3f';g.lineWidth=6;g.strokeRect(4,4,88,56);
  g.fillStyle='#2f5d3a';g.textAlign='center';g.textBaseline='middle';g.font='700 34px "Trebuchet MS",sans-serif';g.fillText(txt,48,34);
  const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return t;
}
function buildDiversey(POSTS,RAILS){
  const D=CH.DIVERSEY,r=D.range;
  const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(1,1,1),V=new THREE.Vector3(),E=new THREE.Euler();
  const flatQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
  // LOCAL deterministic rng (never touches the shared world rng)
  let seed=0x9e37|0;const lr=()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const lrand=(a,bb)=>a+(bb-a)*lr();
  // range slab
  const slab=new THREE.Mesh(new THREE.PlaneGeometry(r.x1-r.x0,r.z1-r.z0),toon(D.green,{}));
  slab.rotation.x=-Math.PI/2;slab.position.set((r.x0+r.x1)/2,0.035,(r.z0+r.z1)/2);scene.add(slab);
  // fence: W + N + E (south/tee side open), shared instanced mesh
  const f=D.fence,opt={spacing:f.spacing,postH:f.postH,color:f.color,collideR:1.2};
  fenceRun([[r.x0,r.z1],[r.x0,r.z0]],opt,POSTS,RAILS);   // west
  fenceRun([[r.x0,r.z0],[r.x1,r.z0]],opt,POSTS,RAILS);   // north
  fenceRun([[r.x1,r.z0],[r.x1,r.z1]],opt,POSTS,RAILS);   // east
  // tee mats (instanced)
  const tees=new THREE.InstancedMesh(new THREE.BoxGeometry(D.tees.w,0.08,D.tees.d),toon(D.tees.color,{}),D.tees.xs.length);
  D.tees.xs.forEach((tx,i)=>{M.compose(V.set(tx,0.09,D.tees.z),Q.identity(),S);tees.setMatrixAt(i,M);});
  tees.instanceMatrix.needsUpdate=true;scene.add(tees);
  // distance boards: instanced posts + one plane each (canvas number)
  const bposts=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06,0.06,1.4,6),toon(0xb07a46),D.boards.length);
  D.boards.forEach(([txt,bx,bz],i)=>{
    M.compose(V.set(bx,0.7,bz),Q.identity(),S);bposts.setMatrixAt(i,M);
    const board=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.0),curveMat(new THREE.MeshBasicMaterial({map:diverseyBoardTex(txt),side:THREE.DoubleSide})));
    board.position.set(bx,1.6,bz);board.rotation.y=Math.PI/2;scene.add(board);   // face down the range (east/west)
  });
  bposts.instanceMatrix.needsUpdate=true;scene.add(bposts);
  // ~30 scattered balls downrange (instanced, local rng)
  const nb=D.balls.count,balls=new THREE.InstancedMesh(new THREE.SphereGeometry(0.12,7,6),toon(D.balls.color,{}),nb);
  for(let i=0;i<nb;i++){M.compose(V.set(lrand(D.balls.x0,D.balls.x1),0.12,lrand(D.balls.z0,D.balls.z1)),Q.identity(),S);balls.setMatrixAt(i,M);}
  balls.instanceMatrix.needsUpdate=true;scene.add(balls);
  // ball bucket (with a couple of balls perched on the rim, same instanced mesh as downrange balls would over-budget — keep it to the bucket)
  const bk=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.24,0.55,10),toon(D.bucket.color));bk.position.set(D.bucket.x,0.28,D.bucket.z);scene.add(bk);collide(D.bucket.x,D.bucket.z,0.4);

  // ===================================================================
  //  MINI GOLF — 3 playable holes. Each felt fairway is a data polygon
  //  (mg.holes[].fair, CCW); its wood rails are DERIVED from the polygon
  //  edges so they hug the felt and can never cross. Draw-call budget:
  //  ONE merged felt Mesh (plain, frustum-culled), ONE rails InstancedMesh,
  //  ONE cups+flagpoles InstancedMesh; flag cloths + tee pads each merge to
  //  a single plain mesh. Static windmill tower + loop torus (the diversey
  //  pack owns the spinning blades). Low boundary fence via the shared
  //  instanced fence mesh, left open at the sign for entry.
  // ===================================================================
  const mg=D.mini,H=mg.holes;
  // (1) FELT — per-hole ShapeGeometry from the fairway polygon, baked to
  //     ABSOLUTE world coords (mesh sits at origin so the curve shader works)
  const feltGeos=[];
  for(const h of H){
    const sh=new THREE.Shape();
    h.fair.forEach(([px,pz],k)=>k?sh.lineTo(px,-pz):sh.moveTo(px,-pz));   // shape (x,-z) -> world (x,0,z) after rotateX
    const g=new THREE.ShapeGeometry(sh);g.rotateX(-Math.PI/2);g.translate(0,0.05,0);
    feltGeos.push(g);
  }
  scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(feltGeos,false),toon(mg.felt,{})));
  // (2) RAILS — one box per axis-aligned fairway edge, derived from the verts
  //     (vertical edge -> long axis along z, rot 0; horizontal -> rot PI/2)
  const railSpecs=[];
  for(const h of H){const P=h.fair,n=P.length;
    for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];
      railSpecs.push({x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,
        rot:Math.abs(a[0]-b[0])<1e-6?0:Math.PI/2,len:Math.hypot(b[0]-a[0],b[1]-a[1])});}
  }
  const railI=new THREE.InstancedMesh(new THREE.BoxGeometry(mg.railW,mg.railH,1),toon(mg.rail),railSpecs.length);
  railSpecs.forEach((rr,i)=>{E.set(0,rr.rot,0);Q.setFromEuler(E);M.compose(V.set(rr.x,mg.railH/2,rr.z),Q,S.set(1,1,rr.len+mg.railW));railI.setMatrixAt(i,M);});
  railI.instanceMatrix.needsUpdate=true;scene.add(railI);Q.identity();S.set(1,1,1);
  // (3) CUPS + FLAGPOLES — ONE InstancedMesh of unit cylinders (2 per hole)
  const cups=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,10),toon(mg.cup),H.length*2);
  let ci=0;
  for(const h of H){
    M.compose(V.set(h.cup[0],0.03,h.cup[1]),Q.identity(),S.set(0.16,0.05,0.16));cups.setMatrixAt(ci++,M);   // cup
    M.compose(V.set(h.cup[0],0.7,h.cup[1]),Q.identity(),S.set(0.03,1.4,0.03));cups.setMatrixAt(ci++,M);      // flagpole
  }
  cups.instanceMatrix.needsUpdate=true;scene.add(cups);S.set(1,1,1);
  // (4) FLAG CLOTHS — merged into ONE plain (frustum-culled) mesh, flying +x
  const flagGeos=[];
  for(const h of H){const g=new THREE.PlaneGeometry(0.5,0.32);g.translate(h.cup[0]+0.29,1.3,h.cup[1]);flagGeos.push(g);}
  scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(flagGeos,false),toon(mg.flag,{mat:{side:THREE.DoubleSide}})));
  // (5) TEE PADS — merged into ONE plain mesh, one flat pad per hole tee
  const teeGeos=[];
  for(const h of H){const g=new THREE.BoxGeometry(0.9,0.06,0.9);g.translate(h.tee[0],0.07,h.tee[1]);teeGeos.push(g);}
  scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(teeGeos,false),toon(mg.tee)));
  // (6/7) STATIC obstacles: windmill tower (pack owns the blades) + loop torus
  for(const h of H){
    if(!h.obst)continue;const ox=h.obst[0],oz=h.obst[1];
    if(h.type==='windmill'){
      const shaft=new THREE.Mesh(new THREE.BoxGeometry(0.7,2.2,0.7),toon(0xe9e2cf));shaft.position.set(ox,1.1,oz);scene.add(shaft);
      const roof=new THREE.Mesh(new THREE.ConeGeometry(0.7,0.7,4),toon(0xb3402e));roof.rotation.y=Math.PI/4;roof.position.set(ox,2.55,oz);scene.add(roof);
      collide(ox,oz,0.5);
    }else if(h.type==='loop'){
      const loop=new THREE.Mesh(new THREE.TorusGeometry(0.9,0.12,8,20),toon(0x4f7dd9));loop.position.set(ox,0.9,oz);scene.add(loop);
      collide(ox,oz,0.5);
    }
  }
  // (9) BOUNDARY FENCE — shared instanced fence mesh, left open at the sign
  //     corner (gate rect near sign) so the course is enterable from there.
  const mf=mg.fence;
  fenceRun([[mg.x0,mg.z0],[mg.x1,mg.z0],[mg.x1,mg.z1],[mg.x0,mg.z1],[mg.x0,mg.z0]],
    {spacing:mf.spacing,postH:mf.postH,color:mf.color,collideR:0.8,gates:[{x0:69.5,x1:74,z0:304,z1:306.5}]},
    POSTS,RAILS);
  // (10) MINI-GOLF SIGN at the entrance (canvas board on a short post). Its own
  // WIDE canvas — diverseyBoardTex is sized for short numbers and clips a word
  // like "MINI GOLF" to its middle. FrontSide (faces the entrance/course side
  // via sign.ry) so the back never shows mirrored text (PITFALLS: DoubleSide
  // canvas planes mirror from behind).
  const sgn=mg.sign;
  const mgSignTex=(txt)=>{
    const cv=document.createElement('canvas');cv.width=256;cv.height=88;const g=cv.getContext('2d');
    g.fillStyle='#fdf6e6';g.fillRect(0,0,256,88);g.strokeStyle='#3a6b3f';g.lineWidth=7;g.strokeRect(5,5,246,78);
    g.fillStyle='#2f5d3a';g.textAlign='center';g.textBaseline='middle';g.font='700 40px "Trebuchet MS",sans-serif';g.fillText(txt,128,47);
    const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return t;
  };
  const signM=new THREE.Mesh(new THREE.PlaneGeometry(2.0,0.69),curveMat(new THREE.MeshBasicMaterial({map:mgSignTex(sgn.text)})));
  signM.position.set(sgn.x,1.3,sgn.z);signM.rotation.y=sgn.ry;scene.add(signM);
  const spost=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.3,6),toon(mg.pole));spost.position.set(sgn.x,0.65,sgn.z);scene.add(spost);

  // ===================================================================
  //  TWO-TIER BAY BUILDING (Topgolf-style) + TALL PERIMETER NET
  //  Built on the range's SOUTH edge: open dark steel frame, per-bay
  //  divider walls, a railed upper deck, double-sided warm glow panels +
  //  cool screens per bay, 4 posed chibi golfers, and a 12 m net wrapping
  //  the field's W/N/E lines. Everything instanced (building ~6 draw calls,
  //  net 2). NO shared rng — pure data + fixed geometry (determinism-safe).
  // ===================================================================
  Q.identity();S.set(1,1,1);
  const B=D.bays,N=D.net;
  const bx0=B.x0,bx1=B.x1,zF=B.zFront,dep=B.depth,zB=zF+dep,bzc=(zF+zB)/2;
  const bw=(bx1-bx0)/B.perLevel,bW=bx1-bx0,bxc=(bx0+bx1)/2;
  const sH=B.storyH,deckT=0.3,y1=sH+deckT,wallT=0.2,roofB=y1+sH,buildTop=roofB+0.3;
  const setBox=(im,i,x,y,z,sx,sy,sz)=>{M.compose(V.set(x,y,z),Q,S.set(sx,sy,sz));im.setMatrixAt(i,M);};

  // dark steel frame: roof slab + front/back top & sill beams (6 boxes)
  const frame=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),toon(B.frame),6);
  let fi=0;
  setBox(frame,fi++,bxc,buildTop-0.15,bzc,bW+0.5,0.3,dep+0.5);   // flat roof slab
  setBox(frame,fi++,bxc,roofB-0.1,zF,bW,0.22,0.22);              // front top beam
  setBox(frame,fi++,bxc,y1-0.12,zF,bW,0.22,0.22);               // front deck beam
  setBox(frame,fi++,bxc,0.25,zF,bW,0.22,0.22);                  // front ground sill
  setBox(frame,fi++,bxc,roofB-0.1,zB,bW,0.22,0.22);             // back top beam
  setBox(frame,fi++,bxc,0.25,zB,bW,0.22,0.22);                  // back ground sill
  frame.instanceMatrix.needsUpdate=true;scene.add(frame);

  // deck-toned slabs: walkable GROUND platform (top = deckRect.h) + upper deck slab.
  // The old dead east stair is gone — the upper tier is decorative + gated.
  const deckM=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),toon(B.deck),2);
  let dmi=0;
  setBox(deckM,dmi++,bxc,B.deckRect.h/2,bzc,bW,B.deckRect.h,dep);   // ground platform (walkable, top at deckRect.h)
  setBox(deckM,dmi++,bxc,sH+deckT/2,bzc,bW,deckT,dep);          // upper deck slab (top at y1)
  deckM.instanceMatrix.needsUpdate=true;scene.add(deckM);

  // per-bay divider walls, both levels (perLevel+1 walls x 2 = 14)
  const divM=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),toon(B.divider),(B.perLevel+1)*2);
  let dvi=0;
  for(let j=0;j<=B.perLevel;j++){const x=bx0+j*bw;
    setBox(divM,dvi++,x,sH/2,bzc,wallT,sH,dep);                 // ground divider
    setBox(divM,dvi++,x,y1+sH/2,bzc,wallT,sH,dep);}             // upper divider
  divM.instanceMatrix.needsUpdate=true;scene.add(divM);

  // warm glow panels on each bay's back wall (double-sided so both shots read them)
  const glowZ=zB-0.3,glow=new THREE.InstancedMesh(new THREE.PlaneGeometry(bw-0.6,2.2),bmat(B.glow,{side:THREE.DoubleSide}),B.perLevel*2);
  let gli=0;
  for(let j=0;j<B.perLevel;j++){const x=bx0+(j+0.5)*bw;
    M.compose(V.set(x,1.45,glowZ),Q,S.set(1,1,1));glow.setMatrixAt(gli++,M);
    M.compose(V.set(x,y1+1.45,glowZ),Q,S.set(1,1,1));glow.setMatrixAt(gli++,M);}
  glow.instanceMatrix.needsUpdate=true;scene.add(glow);

  // small cool screens hung near each bay front
  const scrZ=zF+0.5,screen=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.1,0.75),bmat(B.screen,{side:THREE.DoubleSide}),B.perLevel*2);
  let sci=0;
  for(let j=0;j<B.perLevel;j++){const x=bx0+(j+0.5)*bw;
    M.compose(V.set(x,2.3,scrZ),Q,S.set(1,1,1));screen.setMatrixAt(sci++,M);
    M.compose(V.set(x,y1+2.3,scrZ),Q,S.set(1,1,1));screen.setMatrixAt(sci++,M);}
  screen.instanceMatrix.needsUpdate=true;scene.add(screen);

  // guard rail along the upper deck's north (front) edge: 13 posts + a top bar
  const railH=1.0,railZ=zF+0.2,rail=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),toon(B.rail),14);
  let ri=0;
  for(let k=0;k<=12;k++)setBox(rail,ri++,bx0+k*(bW/12),y1+railH/2,railZ,0.08,railH,0.08);
  setBox(rail,ri++,bxc,y1+railH,railZ,bW,0.08,0.08);            // top bar
  rail.instanceMatrix.needsUpdate=true;scene.add(rail);

  // ENCLOSURE colliders: the 5 internal dividers + 2 end walls (x = bx0+j*bw)
  // each get a run of thin colliders along z; PLUS the back (south) wall, whose
  // glow panels must not be walked through. So each bay is a 3-sided pocket
  // entered ONLY from the range/front (north) — stand in, face north, hit. The
  // north front stays open (entry + the shot downrange).
  for(let j=0;j<=B.perLevel;j++){const x=bx0+j*bw;
    for(let cz=zF;cz<=zB+0.01;cz+=1.3)collide(x,cz,0.34);}
  for(let cx=bx0;cx<=bx1+0.01;cx+=1.3)collide(cx,zB,0.34);   // back (south) wall — behind the glow panels
  // the ground tier is a walkable hitting deck (engine reads walkRects->surfaceY)
  walkRects.push({x1:B.deckRect.x0,x2:B.deckRect.x1,z1:B.deckRect.z0,z2:B.deckRect.z1,h:B.deckRect.h});

  // ---- posed chibi golfers mid-swing (B.golfers: upper-deck decorative only) ----
  const CIT=0.74;
  const gpal=[
    {suit:0xc85a4a,pants:0x35406e,skin:0xe6b98f,hair:0x2a1c12},
    {suit:0x3f8f66,pants:0x2b3357,skin:0xc98a5a,hair:0x22160e},
    {suit:0x5a6db0,pants:0x2f3540,skin:0xe0a878,hair:0x3a2618},
    {suit:0xd6a63f,pants:0x3a3f45,skin:0xbf7a4a,hair:0x22160e},
  ];
  const gpose=[
    {yaw:0.18,alx:-2.3,alz:0.55,arx:-2.5,arz:0.35,bx:0.05},     // top of backswing
    {yaw:-0.12,alx:-2.4,alz:-0.5,arx:-2.2,arz:-0.55,bx:0.05},   // follow-through
    {yaw:0.12,alx:-1.15,alz:0.25,arx:-1.35,arz:0.15,bx:0.22},   // downswing
    {yaw:-0.16,alx:-1.9,alz:0.4,arx:-1.8,arz:0.35,bx:0.1},      // backswing mid
  ];
  B.golfers.forEach((g,i)=>{
    const up=g.lvl===1,gy=up?y1:0,gz=up?zF+1.3:D.tees.z,p=gpose[i%4];
    const {group,parts}=createChibi(Object.assign({scale:CIT},gpal[i%4]));
    group.name='chibi-statue';   // fully static pose (baked below, no update registered) — opt OUT of the cell-merge 'chibi' live-rig exemption so these bake into the z-band merges
    group.position.set(g.x,gy,gz);group.rotation.y=Math.PI+p.yaw;   // face NORTH, downrange
    parts.legL.rotation.z=0.14;parts.legR.rotation.z=-0.14;         // stance
    parts.armL.rotation.set(p.alx,0,p.alz);parts.armR.rotation.set(p.arx,0,p.arz);
    parts.body.rotation.x=p.bx;
    const club=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.024,1.5,6),toon(0x2b2b2b));
    club.position.set(0.06,-1.25,0.05);club.rotation.z=0.2;parts.armR.add(club);   // gripped, follows the arm
    scene.add(group);
    if(!up)collide(g.x,gz,0.45);
  });

  // ---- TALL PERIMETER NET wrapping the field's W/N/E (inset toward the field) ----
  const netH=N.h,ins=N.inset;
  const netPath=[[r.x0+ins,r.z1],[r.x0+ins,r.z0+ins],[r.x1-ins,r.z0+ins],[r.x1-ins,r.z1]];
  const poles=[],panels=[];
  for(let e=0;e<netPath.length-1;e++){
    const ax=netPath[e][0],az=netPath[e][1],bxp=netPath[e+1][0],bzp=netPath[e+1][1];
    const dx=bxp-ax,dz=bzp-az,len=Math.hypot(dx,dz),n=Math.max(1,Math.round(len/N.poleEvery)),rot=Math.atan2(dx,dz);
    for(let k=0;k<=n;k++){const t=k/n;if(!(e>0&&k===0))poles.push([ax+dx*t,az+dz*t]);}
    for(let k=0;k<n;k++){const t=(k+0.5)/n;panels.push([ax+dx*t,az+dz*t,rot,len/n]);}
  }
  const poleM=new THREE.InstancedMesh(new THREE.CylinderGeometry(N.poleR,N.poleR,netH,8),toon(N.pole),poles.length);
  poles.forEach((p,i)=>{M.compose(V.set(p[0],netH/2,p[1]),Q,S.set(1,1,1));poleM.setMatrixAt(i,M);});
  poleM.instanceMatrix.needsUpdate=true;scene.add(poleM);
  const panelG=new THREE.PlaneGeometry(1,netH);panelG.rotateY(Math.PI/2);   // unit width along z, netH tall
  const panelM=new THREE.InstancedMesh(panelG,bmat(N.mesh,{transparent:true,opacity:N.opacity,side:THREE.DoubleSide}),panels.length);
  panels.forEach((p,i)=>{E.set(0,p[2],0);Q.setFromEuler(E);M.compose(V.set(p[0],netH/2,p[1]),Q,S.set(1,1,p[3]));panelM.setMatrixAt(i,M);});
  panelM.instanceMatrix.needsUpdate=true;scene.add(panelM);
}

// ---- Diversey-corner park dressing (task 021, refs/diversey-corner/) ----
// White pipe railing on the revetment top lip (via the shared instanced fence
// meshes: +0 draw calls), limestone sitting stones on the lawn, green growth
// tufting the step joints, and a rubble riprap toe at the waterline + the
// pier-slip lip. ZERO shared rng: a local xorshift drives every jitter, so
// the world's rng order (towels/flowers/trees) is bit-for-bit unchanged.
// Static toon meshes only -> they fold into the cell merge's per-material
// z-band buckets (no new instanced global draws).
function buildCornerPark(POSTS,RAILS){
  const P=CH.CORNER_PARK,fx=CH.COAST_CORNER_PARAMS.fx;
  let h=0x5eedC0DE>>>0;                     // local deterministic jitter
  const jr=()=>{h^=h<<13;h>>>=0;h^=h>>>17;h^=h<<5;h>>>=0;return h/4294967296;};

  // white pipe railing: two spans on the top lip flanking the pier, the steps
  // between left open. Post line follows the coast data (fx - edgeInset).
  for(const run of P.rail.runs){
    const line=[];
    for(let z=run.z0;z<=run.z1+0.01;z+=2.0)line.push([fx(z)-P.rail.edgeInset,z]);
    fenceRun(line,{spacing:P.rail.spacing,postH:P.rail.postH,color:P.rail.color,collideR:1.2},POSTS,RAILS);
  }

  // limestone sitting-stone blocks in the grass (jump-over-able colliders)
  {
    const sm=toon(P.stone.color);
    for(const[sx,sz,ry,sc]of P.stones){
      const b=new THREE.Mesh(new THREE.BoxGeometry(P.stone.w*sc,P.stone.h*sc,P.stone.d*sc),sm);
      b.position.set(sx,P.stone.h*sc/2-0.04,sz);b.rotation.y=ry;scene.add(b);
      collide(sx,sz,0.95*sc,0.5);
    }
  }

  // sample helper: walk the corner arc's segments (shared coast geometry)
  const segs=buildSegs(COAST_CORNER);
  const arcSample=(step,cb)=>{
    for(const s of segs)for(let t=0;t<s.len;t+=step){
      const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;
      cb(cx,cz,-s.tz,s.tx);                 // point + seaward normal
    }
  };

  // green growth tufting the step joints (small cones on the tier treads)
  {
    const gm=toon(P.growth.color);
    let n=0;
    arcSample(1.5,(cx,cz,nx,nz)=>{
      if(cz<P.growth.z0||cz>P.growth.z1||n>=P.growth.n)return;
      if(jr()<0.35)return;
      const p=tierProfile(cz),i=(jr()*6|0);
      let acc=0;for(let k=0;k<i;k++)acc+=p.w[k];
      const lat=acc+p.w[i]*(jr()<0.5?0.14:0.86);   // hug the joint lines
      const gx=cx+nx*lat,gz=cz+nz*lat;
      const gh=0.14+jr()*0.2;
      const c=new THREE.Mesh(new THREE.ConeGeometry(0.06+jr()*0.08,gh,5),gm);
      c.position.set(gx,-i*p.step+gh/2-0.02,gz);c.rotation.y=jr()*Math.PI;
      scene.add(c);n++;
    });
  }

  // rubble riprap toe at the waterline (seaward of the bottom promenade)
  {
    const rm=toon(P.riprap.color);
    const rock=(rx,rz)=>{
      const sc=0.35+jr()*0.42;
      const r=new THREE.Mesh(new THREE.DodecahedronGeometry(1,0),rm);
      r.position.set(rx,-2.12+jr()*0.34,rz);
      r.rotation.set(jr()*Math.PI,jr()*Math.PI*2,jr()*Math.PI);
      r.scale.set(sc*1.2,sc*0.75,sc*1.05);scene.add(r);
    };
    arcSample(P.riprap.step,(cx,cz,nx,nz)=>{
      if(cz<P.riprap.z0||cz>P.riprap.z1)return;
      if(jr()<0.25)return;
      const lat=profileTotal(cz)+0.6+jr()*1.7;
      rock(cx+nx*lat,cz+nz*lat);
    });
    // the pier-slip lip: rubble in the shallow cove water west of the deck
    const S=P.riprap.slip;
    for(let z=S.z0;z<=S.z1;z+=S.step)rock(S.x+(jr()-0.5)*1.6,z+(jr()-0.5)*1.2);
  }
}

// ---- AIDS Garden entrance monument (task 023, refs/aids-garden/) --------
// Owner-sited (live direction 2026-07-10): near the garden Divvy dock at the
// garden's south, wall long axis E–W, lettered NORTH face toward the
// lawn/trail approach; the player spawns on the forecourt pad north of it
// facing the water. Gold 'AIDS Garden Chicago' letters EAST-biased, a quiet
// bronze scatter of ginkgo-leaf plaques (ONE merged geometry, sparser over
// the letter band), the granite boulder leaning mid-span WEST of the letters
// (owner: never cover the 'A'), two white limestone sitting blocks on a
// decomposed-granite pad. Static toon meshes only -> they fold into the cell
// z-band merges. ZERO shared rng: a local xorshift drives every jitter.
function buildEntranceMonument(){
  const E=CH.ENTRANCE,W=E.wall,fz=W.z-W.t/2;         // fz: the lettered NORTH face
  let h=0x023AB1DE>>>0;                               // local deterministic jitter
  const jr=()=>{h^=h<<13;h>>>=0;h^=h>>>17;h^=h<<5;h>>>=0;return h/4294967296;};

  // 1. WALL: one grey slab, long axis E–W. 6 tall colliders (not jumpable).
  const wall=new THREE.Mesh(new THREE.BoxGeometry(W.x1-W.x0,W.h,W.t),toon(W.color));
  wall.position.set((W.x0+W.x1)/2,W.h/2,W.z);scene.add(wall);
  for(let k=0;k<6;k++)collide((W.x0+1.1)+k*((W.x1-1.1)-(W.x0+1.1))/5,W.z,1.15);

  // 2. GOLD LETTERS: transparent canvas plane, shrink-to-fit, faces NORTH.
  const Lt=E.letters;
  const cv=document.createElement('canvas');cv.width=1024;cv.height=96;const g=cv.getContext('2d');
  g.clearRect(0,0,1024,96);                           // keep transparent — no plate
  g.fillStyle=Lt.gold;g.textAlign='center';g.textBaseline='middle';
  let fs=64;g.font=`700 ${fs}px "Trebuchet MS",sans-serif`;
  while(g.measureText(Lt.text).width>980&&fs>20){fs-=2;g.font=`700 ${fs}px "Trebuchet MS",sans-serif`;}
  g.fillText(Lt.text,512,48);
  const tex=new THREE.CanvasTexture(cv);tex.anisotropy=4;
  const letters=new THREE.Mesh(new THREE.PlaneGeometry(Lt.w,Lt.h),curveMat(new THREE.MeshBasicMaterial({map:tex,transparent:true})));
  letters.position.set(Lt.xc,Lt.y,fz-0.015);letters.rotation.y=Math.PI;scene.add(letters);

  // 3. GINKGO PLAQUES: n bronze fan-notch leaves, ONE merged mesh on the face.
  // Placement respects the letter band: most WEST of letterX0 (the dense
  // cluster), a handful east of it low, 2-3 small ones high among the letters.
  const Pq=E.plaques,xr=Pq.xr,yr=Pq.yr,lx0=Pq.letterX0,pz=fz-0.01;
  const nHi=Math.max(2,Math.round(Pq.n*0.1)),nLo=Math.round(Pq.n*0.17);
  const leaves=[],spots=[];
  const addLeaf=(y,x,rMax)=>{
    // real plaques are ~15-25 cm and clearly SPACED (the first pass read as
    // big touching blobs): small fans, min 0.42 m apart (8 local retries)
    for(let t=0;t<8;t++){
      if(spots.some(s=>(s[0]-x)**2+(s[1]-y)**2<0.42*0.42)){y=yr[0]+jr()*(yr[1]-yr[0]);x=xr[0]+jr()*(xr[1]-xr[0]);continue}
      break;
    }
    spots.push([x,y]);
    const lg=new THREE.CircleGeometry(0.07+jr()*(rMax-0.07),7,0.45,4.25);   // fan w/ notch reads ginkgo
    lg.rotateZ(jr()*Math.PI*2);                       // spin the notch around the plane normal
    lg.rotateY(Math.PI);                              // then orient the plane to face NORTH (−z)
    lg.translate(x,y,pz);leaves.push(lg);
  };
  for(let i=0;i<Pq.n;i++){
    if(i<nHi){                                        // high, small, among the letters' ends
      addLeaf(0.85+jr()*(yr[1]-0.85),lx0+(xr[1]-lx0)*jr(),0.10);
    }else if(i<nHi+nLo){                              // a handful under the letters, low
      addLeaf(yr[0]+jr()*(0.7-yr[0]),lx0+(xr[1]-lx0)*jr(),0.14);
    }else{                                            // the dense west cluster (clear of the letters)
      addLeaf(yr[0]+jr()*(yr[1]-yr[0]),xr[0]+(lx0-xr[0])*jr(),0.14);
    }
  }
  scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(leaves.map(g2=>g2.toNonIndexed())),toon(Pq.bronze)));

  // 4. BOULDER: a granite dodeca leaning against the north face, mid-span
  // WEST of the letter band (never over the 'A' — owner direction).
  const Bo=E.boulder;
  const boulder=new THREE.Mesh(new THREE.DodecahedronGeometry(1,0),toon(Bo.color));
  boulder.position.set(Bo.x,0.62,Bo.z);
  boulder.scale.set(1.05*(1+(jr()-0.5)*0.2),1.35*(1+(jr()-0.5)*0.2),0.85);   // wide along the wall, shallow toward the viewer
  boulder.rotation.set(0.22,jr()*Math.PI*2,jr()*0.3);   // +x lean tips the top south, into the wall
  scene.add(boulder);collide(Bo.x,Bo.z,1.0);

  // 5. SITTING BLOCKS: chunky white limestone (jumpable colliders).
  const bm=toon(E.blockColor);
  for(const bl of E.blocks){
    const box=new THREE.Mesh(new THREE.BoxGeometry(bl.w,bl.h,bl.d),bm);
    box.position.set(bl.x,bl.h/2-0.03,bl.z);box.rotation.y=bl.ry;scene.add(box);
    collide(bl.x,bl.z,0.9,0.5);
  }

  // 6. FORECOURT PAD: flat oval of decomposed granite + a speckle scatter.
  const Pd=E.pad;
  const pg=new THREE.CircleGeometry(1,22);pg.rotateX(-Math.PI/2);
  const pad=new THREE.Mesh(pg,toon(Pd.color));
  pad.scale.set(Pd.rx,1,Pd.rz);pad.position.set(Pd.x,Pd.y,Pd.z);scene.add(pad);
  const specks=[];
  for(let k=0;k<26;k++){
    const rr=Math.sqrt(jr()),ang=jr()*Math.PI*2,s=0.06+jr()*0.06;
    const sg=new THREE.BoxGeometry(s,s,s);
    sg.translate(Pd.x+Math.cos(ang)*rr*Pd.rx*0.92,Pd.y+0.015,Pd.z+Math.sin(ang)*rr*Pd.rz*0.92);
    specks.push(sg);
  }
  scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(specks.map(g2=>g2.toNonIndexed())),toon(0x8a7f70)));
}

export function buildStructures(){
  const POSTS=[],RAILS=[];
  buildDogFence(POSTS,RAILS);
  buildSanctuary(POSTS,RAILS);
  buildGolf(POSTS,RAILS);
  buildTennis(POSTS,RAILS);
  buildDiversey(POSTS,RAILS);
  buildCornerPark(POSTS,RAILS);
  emitFences(POSTS,RAILS);
  buildFieldhouse();
  buildYachtClub();
  buildGolfClubhouse();
  buildChevron();
  buildEntranceMonument();
  buildLSD();
}
