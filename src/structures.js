import * as THREE from 'three';
import { scene, rng, rand, toon, bmat, curveMat, gmap, pip } from './core.js';
import { LAND } from './coast.js';
import { collide, walkRects } from './props.js';
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
// in the lsd.js content pack. Three underpass portals ("FUTURE ENTRANCE")
// stand at Belmont z 0, Addison z -400, Irving Park z -800.
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
// A low concrete pad; 3 slender square-section columns leaning together into a
// tripod mast; 5 flat blade arms bursting from the masthead like a windmill sail.
// Beams are BoxGeometry whose local +Y is the length axis; setFromUnitVectors
// aims that axis down each ray. No shared rng (determinism-safe).
function buildChevron(){
  const C=CH.CHEVRON,grp=new THREE.Group();
  const blue=toon(C.color),conc=toon(C.pad.color);
  const up=new THREE.Vector3(0,1,0),dir=new THREE.Vector3(),Q=new THREE.Quaternion();
  const apex=new THREE.Vector3(C.apex[0],C.apex[1],C.apex[2]);
  // concrete pad
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(C.pad.r,C.pad.r+0.16,C.pad.h,20),conc);pad.position.y=C.pad.h/2;grp.add(pad);
  // 3 leaning columns -> tripod mast (triangle base, all meeting at the apex)
  for(let k=0;k<3;k++){
    const a=k/3*Math.PI*2+0.3;
    const base=new THREE.Vector3(Math.cos(a)*C.baseSpread,C.pad.h,Math.sin(a)*C.baseSpread);
    dir.copy(apex).sub(base);const L=dir.length();dir.normalize();Q.setFromUnitVectors(up,dir);
    const col=new THREE.Mesh(new THREE.BoxGeometry(C.colThick,L,C.colThick),blue);
    col.quaternion.copy(Q);col.position.copy(base).addScaledVector(dir,L/2);grp.add(col);
  }
  // masthead hub + 5 flat blade arms radiating asymmetrically (windmill-sail burst)
  const hub=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.7,0.7),blue);hub.position.copy(apex);grp.add(hub);
  for(const [dx,dy,dz,L,w] of C.arms){
    dir.set(dx,dy,dz).normalize();Q.setFromUnitVectors(up,dir);
    const blade=new THREE.Mesh(new THREE.BoxGeometry(w,L,0.12),blue);
    blade.quaternion.copy(Q);blade.position.copy(apex).addScaledVector(dir,L/2);grp.add(blade);
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

// ---- Bird Sanctuary (fence + understory) ------------------------------
function buildSanctuary(POSTS,RAILS){
  const S=CH.SANCTUARY,b=S.bounds;
  for(const ln of rectLines(b))fenceRun(ln,{spacing:S.fence.spacing,postH:S.fence.postH,color:S.fence.color,collideR:1.2,gates:[S.gate]},POSTS,RAILS);
  // dense understory shrubs (dark greens) inside the fence
  const U=S.understory,cols=U.colors.map(c=>new THREE.Color(c));
  const shrub=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,7),curveMat(new THREE.MeshToonMaterial({gradientMap:gmap})),U.count);
  const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),Sc=new THREE.Vector3(),V=new THREE.Vector3();
  let placed=0,guard=0;
  while(placed<U.count&&guard++<U.guard){
    const x=rand(b.x0+1,b.x1-1),z=rand(b.z0+1,b.z1-1);
    if(!pip(x,z,LAND))continue;
    const s=rand(U.scale[0],U.scale[1]);
    M.compose(V.set(x,s*0.75,z),Q.identity(),Sc.set(s,s*0.85,s));shrub.setMatrixAt(placed,M);
    shrub.setColorAt(placed,cols[(rng()*cols.length)|0]);placed++;
  }
  shrub.count=placed;shrub.instanceMatrix.needsUpdate=true;shrub.instanceColor.needsUpdate=true;scene.add(shrub);
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

  // ---- mini golf corner: felt fairways + wood rails + 3 holes ----
  const mg=D.mini,H=mg.holes;
  const felt=new THREE.InstancedMesh(new THREE.PlaneGeometry(6,6),toon(mg.felt,{}),H.length);
  const cups=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16,0.16,0.05,10),toon(mg.cup),H.length);
  const railM=toon(mg.rail);const rails=[];   // collect rail boxes -> one instanced mesh
  H.forEach((h,i)=>{
    M.compose(V.set(h.x,0.045,h.z),flatQ,S);felt.setMatrixAt(i,M);
    M.compose(V.set(h.x+1.6,0.07,h.z+1.6),Q.identity(),S);cups.setMatrixAt(i,M);
    for(const [dx,dz,len,rot] of [[0,-3,6,0],[0,3,6,0],[-3,0,6,Math.PI/2],[3,0,6,Math.PI/2]])
      rails.push({x:h.x+dx,z:h.z+dz,len,rot});
  });
  felt.instanceMatrix.needsUpdate=cups.instanceMatrix.needsUpdate=true;scene.add(felt,cups);
  const railI=new THREE.InstancedMesh(new THREE.BoxGeometry(0.16,0.24,1),railM,rails.length);
  rails.forEach((rr,i)=>{E.set(0,rr.rot,0);Q.setFromEuler(E);M.compose(V.set(rr.x,0.12,rr.z),Q,new THREE.Vector3(1,1,rr.len));railI.setMatrixAt(i,M);});
  railI.instanceMatrix.needsUpdate=true;scene.add(railI);Q.identity();
  // per-hole obstacles
  for(const h of H){
    if(h.type==='windmill'){
      const shaft=new THREE.Mesh(new THREE.BoxGeometry(0.7,2.2,0.7),toon(0xe9e2cf));shaft.position.set(h.x,1.1,h.z);scene.add(shaft);collide(h.x,h.z,0.55);
      const roof=new THREE.Mesh(new THREE.ConeGeometry(0.7,0.7,4),toon(0xb3402e));roof.rotation.y=Math.PI/4;roof.position.set(h.x,2.55,h.z);scene.add(roof);
      const blades=new THREE.InstancedMesh(new THREE.BoxGeometry(0.16,1.7,0.05),toon(0xfdf6e6,{}),4);   // STATIC (no registerUpdate in builders)
      for(let k=0;k<4;k++){E.set(0,0,k*Math.PI/2);Q.setFromEuler(E);M.compose(V.set(h.x,2.0,h.z+0.4),Q,S);blades.setMatrixAt(k,M);}
      blades.instanceMatrix.needsUpdate=true;scene.add(blades);Q.identity();
    }else if(h.type==='loop'){
      const loop=new THREE.Mesh(new THREE.TorusGeometry(0.9,0.12,8,20),toon(0x4f7dd9));loop.position.set(h.x,0.9,h.z);scene.add(loop);collide(h.x,h.z,0.5);
    }else if(h.type==='tower'){
      const body=new THREE.Mesh(new THREE.BoxGeometry(0.8,2.4,0.8),toon(0xa9614b));body.position.set(h.x,1.2,h.z);scene.add(body);collide(h.x,h.z,0.6);
      const roof=new THREE.Mesh(new THREE.ConeGeometry(0.72,0.8,4),toon(0x527f6d));roof.rotation.y=Math.PI/4;roof.position.set(h.x,2.8,h.z);scene.add(roof);
      const face=new THREE.Mesh(new THREE.CircleGeometry(0.26,14),bmat(0xf6efdd));face.position.set(h.x,1.9,h.z+0.41);scene.add(face);
    }
  }
}

export function buildStructures(){
  const POSTS=[],RAILS=[];
  buildDogFence(POSTS,RAILS);
  buildSanctuary(POSTS,RAILS);
  buildGolf(POSTS,RAILS);
  buildTennis(POSTS,RAILS);
  buildDiversey(POSTS,RAILS);
  emitFences(POSTS,RAILS);
  buildFieldhouse();
  buildYachtClub();
  buildGolfClubhouse();
  buildChevron();
  buildLSD();
}
