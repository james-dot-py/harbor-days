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
  // 112 LINCOLN PARK: the berm runs the full new length but is SPLIT at the
  // Fullerton underpass gap (B.gap) so the path passes through (the road bridges
  // over). Two box segments instead of one; the road/dashes stay continuous.
  const bermSeg=(z0,z1)=>{const l=z1-z0;if(l<=0.5)return;const sz=Math.max(2,Math.round(l/6));
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,B.h,l,1,1,sz),toon(B.color));m.position.set(xc,B.h/2,(z0+z1)/2);scene.add(m);};
  if(B.gap){ bermSeg(B.z0,B.gap.z0); bermSeg(B.gap.z1,B.z1); }
  else bermSeg(B.z0,B.z1);
  const segZ=Math.max(2,Math.round(len/6));                       // z subdivisions for the world curve
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
  buildLPUnderpass();   // 112: the Fullerton WORKING crossing (open both ends, walkable)
}

// 112 LINCOLN PARK — the map's FIRST WORKING underpass. Unlike the fenced dead-end
// portals (dark door plane), BOTH mouths are OPEN — you see straight through to the
// far side (the invitation). A crushed paved floor makes it walkable; the berm is
// split around it (buildLSD) so the passage is a real opening, the road bridging
// over. Axis-aligned E-W. No collider (the anti-trap law) — walkability is the rect.
function buildLPUnderpass(){
  const U=CH.LP_UNDERPASS,wr=U.walk,z=U.portalE[1],hw=U.w/2,H=U.h;
  const stone=toon(CH.LSD.portal.arch),voussoir=toon(0xe8dcc2),paveM=toon(0xc9c3b4);
  // walkable paved floor through the cut (a crushed-limestone path)
  const floor=new THREE.Mesh(new THREE.BoxGeometry(wr.x1-wr.x0,0.1,wr.z1-wr.z0),paveM);
  floor.position.set((wr.x0+wr.x1)/2,0.05,(wr.z0+wr.z1)/2);scene.add(floor);
  walkRects.push({x1:wr.x0,x2:wr.x1,z1:wr.z0,z2:wr.z1,h:wr.h});
  // two OPEN stone portal mouths (no dark door): east faces the lakefront strip,
  // west faces the park. Voussoir arch + flank posts, mirroring the dead-end frame.
  const QY=new THREE.Euler(0,Math.PI/2,0);
  for(const px of[U.portalE[0],U.portalW[0]]){
    const g=new THREE.Group();
    for(const s of[-1,1]){const post=new THREE.Mesh(new THREE.BoxGeometry(1.0,H,1.0),stone);post.position.set(0,H/2,s*(hw+0.5));g.add(post);}
    const lintel=new THREE.Mesh(new THREE.BoxGeometry(1.3,0.9,U.w+2.6),stone);lintel.position.set(0,H-0.35,0);g.add(lintel);
    const arch=new THREE.Mesh(new THREE.TorusGeometry(hw+0.5,0.26,6,18,Math.PI),voussoir);
    arch.rotation.copy(QY);arch.position.set(0,H-0.35,0);g.add(arch);
    g.position.set(px,0,z);scene.add(g);
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
  // distance boards: instanced posts + one plane each (canvas number). Post height
  // 1.1 so it TOPS OUT at the board's bottom (y1.1) and never grazes the digits.
  const bposts=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06,0.06,1.1,6),toon(0xb07a46),D.boards.length);
  D.boards.forEach(([txt,bx,bz],i)=>{
    M.compose(V.set(bx,0.55,bz),Q.identity(),S);bposts.setMatrixAt(i,M);
    // back-to-back FrontSide pair (faces both ways down the range, east/west) so
    // the yardage never reads mirrored — a lone DoubleSide plane showed the number
    // flipped from the far side (PITFALLS: DoubleSide canvas plane mirrors).
    const boardG=new THREE.PlaneGeometry(1.5,1.0);
    const boardM=curveMat(new THREE.MeshBasicMaterial({map:diverseyBoardTex(txt)}));  // FrontSide
    const boardE=new THREE.Mesh(boardG,boardM);boardE.position.set(bx+0.02,1.6,bz);boardE.rotation.y=Math.PI/2;scene.add(boardE);
    const boardW=new THREE.Mesh(boardG,boardM);boardW.position.set(bx-0.02,1.6,bz);boardW.rotation.y=-Math.PI/2;scene.add(boardW);
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
  // post BEHIND the FrontSide panel (offset along −normal) so it never covers the
  // text — was planted at the panel's center depth, grazing the word's underside.
  const spost=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.3,6),toon(mg.pole));
  spost.position.set(sgn.x-Math.sin(sgn.ry)*0.14,0.65,sgn.z-Math.cos(sgn.ry)*0.14);scene.add(spost);

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

// ---- Park Bait Shop — a small signed bait/tackle shack facing the basin ----
// Individual frustum-culled meshes; fully deterministic (fixed numbers only,
// no shared rng). Sits on existing LAND west of the basin; the EAST (+x) face
// looks out at the harbor promenade, so door / windows / sign all live there.
function buildParkBait(){
  const B=CH.PARK_BAIT,grp=new THREE.Group();
  const w=B.w,d=B.d,h=B.h;
  const wallM=toon(B.wall),roofM=toon(B.roof),trimM=toon(B.trim);
  const darkM=toon(0x2c241d),glowM=bmat(0xffe1a0);
  const ex=w/2;                                        // east wall plane (local +x = harbor)

  // grounding plinth + walls + a header/fascia band under the eave
  const plinth=new THREE.Mesh(new THREE.BoxGeometry(w+0.24,0.3,d+0.24),trimM);plinth.position.y=0.15;grp.add(plinth);
  const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wallM);body.position.y=h/2;grp.add(body);
  const fascia=new THREE.Mesh(new THREE.BoxGeometry(w+0.14,0.26,d+0.14),trimM);fascia.position.y=h-0.13;grp.add(fascia);

  // pitched gable roof: ridge runs E–W (along x), slopes face N/S, gable ends
  // (triangles) face the harbor (+x) and inland (−x). Two slanted slope boxes
  // + two flat gable-fill triangles in the wall colour.
  const oh=0.35,rise=1.15,run=d/2+oh,slopeLen=Math.hypot(run,rise),a=Math.atan2(rise,run),ridgeY=h+rise;
  for(const s of[1,-1]){                              // s=+1 south slope, s=-1 north slope
    const slope=new THREE.Mesh(new THREE.BoxGeometry(w+2*oh,0.14,slopeLen),roofM);
    slope.rotation.x=s*a;slope.position.set(0,h+rise/2,s*run/2);grp.add(slope);
  }
  const gable=new THREE.Shape();gable.moveTo(-d/2,0);gable.lineTo(d/2,0);gable.lineTo(0,rise);gable.closePath();
  const gg=new THREE.ShapeGeometry(gable);
  for(const s of[1,-1]){                              // +x harbor gable, −x inland gable
    const tri=new THREE.Mesh(gg,wallM);tri.position.set(s*w/2,h,0);tri.rotation.y=s*Math.PI/2;grp.add(tri);
  }
  const ridge=new THREE.Mesh(new THREE.BoxGeometry(w+2*oh,0.16,0.22),roofM);ridge.position.set(0,ridgeY,0);grp.add(ridge);

  // EAST face (harbor side): a dark door + two warm-glow windows, each framed.
  const door=new THREE.Mesh(new THREE.BoxGeometry(0.12,2.0,1.1),darkM);door.position.set(ex+0.02,1.0,-1.2);grp.add(door);
  const dframe=new THREE.Mesh(new THREE.BoxGeometry(0.06,2.16,1.28),trimM);dframe.position.set(ex+0.01,1.02,-1.2);grp.add(dframe);
  for(const wz of[0.4,1.7]){
    const wframe=new THREE.Mesh(new THREE.BoxGeometry(0.06,1.04,1.0),trimM);wframe.position.set(ex+0.01,1.55,wz);grp.add(wframe);
    const pane=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.86,0.82),glowM);pane.position.set(ex+0.03,1.55,wz);grp.add(pane);
  }

  // SIGN 'PARK BAIT' mounted high on the EAST face, reading from the promenade
  // ~8 m east. Own CanvasTexture, font shrink-to-fit so it never clips. To dodge
  // the mirrored-from-behind DoubleSide trap: FrontSide text plane + a solid
  // trim backing box (its rear face is plain trim, never reversed text).
  const cv=document.createElement('canvas');cv.width=512;cv.height=128;const g=cv.getContext('2d');
  g.fillStyle='#1f3d34';g.fillRect(0,0,512,128);                          // painted board
  g.strokeStyle='#e9dcc0';g.lineWidth=8;g.strokeRect(10,10,492,108);
  g.fillStyle='#f5ecd6';g.textAlign='center';g.textBaseline='middle';
  let fs=68;g.font=`800 ${fs}px "Trebuchet MS",sans-serif`;
  while(g.measureText(B.sign).width>452&&fs>18){fs-=2;g.font=`800 ${fs}px "Trebuchet MS",sans-serif`;}
  g.fillText(B.sign,256,70);
  const stex=new THREE.CanvasTexture(cv);stex.anisotropy=4;
  const sw=3.6,sh=0.9,sgrp=new THREE.Group();
  const frame=new THREE.Mesh(new THREE.BoxGeometry(sw+0.18,sh+0.18,0.08),trimM);frame.position.z=-0.05;sgrp.add(frame);
  const board=new THREE.Mesh(new THREE.PlaneGeometry(sw,sh),curveMat(new THREE.MeshBasicMaterial({map:stex})));sgrp.add(board);
  sgrp.position.set(ex+0.09,2.2,0.2);sgrp.rotation.y=Math.PI/2;grp.add(sgrp);   // rotate to face +x (harbor); FrontSide stays un-mirrored

  grp.position.set(B.x,0,B.z);grp.rotation.y=B.ry;scene.add(grp);
  collide(B.x,B.z,3.6);                                // footprint (modest; clears the trail to the west)
}

// ---- Montrose Beach House — the historic ship-like bathing pavilion --------
// A long two-storey cream hall (axis N-S) with a ROUNDED solarium "prow"
// bulging EAST toward the lake, a low terracotta hip roof + ship-deck rail, an
// arched glow-window band on the lake face, and an atlas-folded name sign.
// Individual frustum-culled meshes; zero rng (all numbers from CH.BEACH_HOUSE).
// Local +x = EAST (lake). The closed hall is carved from walk in chicago.js
// (footRect); only the round prow gets a collider (052 law).
function buildBeachHouse(){
  const B=CH.BEACH_HOUSE,grp=new THREE.Group();
  const hw=B.hallW,hd=B.hallD,hh=B.hallH,pr=B.prowR,ex=hw/2;
  const wallM=toon(B.wall),roofM=toon(B.roof),trimM=toon(B.trim),glowM=bmat(B.glow),drM=toon(B.deckRail);

  // plinth + main hall + belt course + top cornice
  const plinth=new THREE.Mesh(new THREE.BoxGeometry(hw+0.3,0.4,hd+0.3),trimM);plinth.position.y=0.2;grp.add(plinth);
  const hall=new THREE.Mesh(new THREE.BoxGeometry(hw,hh,hd),wallM);hall.position.y=hh/2;grp.add(hall);
  const belt=new THREE.Mesh(new THREE.BoxGeometry(hw+0.14,0.22,hd+0.14),trimM);belt.position.y=hh*0.5;grp.add(belt);
  const cornice=new THREE.Mesh(new THREE.BoxGeometry(hw+0.14,0.22,hd+0.14),trimM);cornice.position.y=hh-0.15;grp.add(cornice);

  // rounded solarium PROW on the EAST end, centred on the hall length. A cream
  // cylinder + a wraparound glass band (open-ended glow ring) + a terracotta cap.
  const prow=new THREE.Mesh(new THREE.CylinderGeometry(pr,pr,hh*0.82,16),wallM);prow.position.set(ex,hh*0.41,0);grp.add(prow);
  const glass=new THREE.Mesh(new THREE.CylinderGeometry(pr+0.05,pr+0.05,1.4,16,1,true),glowM);glass.position.set(ex,hh*0.55,0);grp.add(glass);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(pr,1.0,16),roofM);cap.position.set(ex,hh*0.82+0.5,0);grp.add(cap);

  // low hip roof: a broad terracotta slab + a smaller box on top (suggests pitch)
  const hip=new THREE.Mesh(new THREE.BoxGeometry(hw+1.0,0.4,hd+1.0),roofM);hip.position.y=hh+0.2;grp.add(hip);
  const hipTop=new THREE.Mesh(new THREE.BoxGeometry(hw-2.0,0.5,hd-2.0),roofM);hipTop.position.y=hh+0.6;grp.add(hipTop);

  // rooftop deck rail (the ship-deck signature): thin posts round the perimeter +
  // a thin top rail on each side. Individual meshes, frustum-culled.
  const rx=ex,rz=hd/2,ry0=hh+0.6,postG=new THREE.BoxGeometry(0.08,0.7,0.08);
  for(const sx of[-1,1])for(let k=0;k<=3;k++){
    const p=new THREE.Mesh(postG,drM);p.position.set(sx*rx,ry0,-rz+2*rz*k/3);grp.add(p);
  }
  for(const sz of[-1,1]){const p=new THREE.Mesh(postG,drM);p.position.set(0,ry0,sz*rz);grp.add(p);}
  for(const sx of[-1,1]){const r=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.06,2*rz),drM);r.position.set(sx*rx,ry0+0.33,0);grp.add(r);}
  for(const sz of[-1,1]){const r=new THREE.Mesh(new THREE.BoxGeometry(2*rx,0.06,0.06),drM);r.position.set(0,ry0+0.33,sz*rz);grp.add(r);}

  // arched glow-window band on the EAST (lake) face, upper storey — flanking the
  // solarium (north + south of the prow). Each = a framed glow pane.
  for(const wz of[-8.5,-6.8,6.8,8.5]){
    const wf=new THREE.Mesh(new THREE.BoxGeometry(0.06,1.7,1.1),trimM);wf.position.set(ex+0.01,hh*0.62,wz);grp.add(wf);
    const pane=new THREE.Mesh(new THREE.BoxGeometry(0.12,1.5,0.9),glowM);pane.position.set(ex+0.04,hh*0.62,wz);grp.add(pane);
  }

  // NAME SIGN on the EAST face above the prow, reading from the sand/lake. Own
  // CanvasTexture, font shrink-to-fit; FrontSide plane + solid trim backing box
  // (its rear face is plain trim, never mirrored text). Rotated PI/2 to face +x.
  const cv=document.createElement('canvas');cv.width=720;cv.height=128;const g=cv.getContext('2d');
  g.fillStyle='#2c3e50';g.fillRect(0,0,720,128);
  g.strokeStyle='#e9dcc0';g.lineWidth=8;g.strokeRect(10,10,700,108);
  g.fillStyle='#f5ecd6';g.textAlign='center';g.textBaseline='middle';
  let fs=72;g.font=`800 ${fs}px "Trebuchet MS",sans-serif`;
  while(g.measureText(B.sign).width>660&&fs>18){fs-=2;g.font=`800 ${fs}px "Trebuchet MS",sans-serif`;}
  g.fillText(B.sign,360,70);
  const stex=new THREE.CanvasTexture(cv);stex.anisotropy=4;
  const sw=4.5,sh=0.8,sgrp=new THREE.Group();
  const frame=new THREE.Mesh(new THREE.BoxGeometry(sw+0.18,sh+0.18,0.08),trimM);frame.position.z=-0.05;sgrp.add(frame);
  const board=new THREE.Mesh(new THREE.PlaneGeometry(sw,sh),curveMat(new THREE.MeshBasicMaterial({map:stex})));sgrp.add(board);
  sgrp.position.set(ex+0.1,hh+1.0,0);sgrp.rotation.y=Math.PI/2;grp.add(sgrp);   // faces +x (lake); sign lifted above the roofline so it clears the hip slab

  grp.position.set(B.x,0,B.z);grp.rotation.y=B.ry;scene.add(grp);
  collide(B.x+B.hallW/2,B.z,B.prowR);                 // round prow only (hall carved from walk in chicago.js)
}

// ---- The Dock — the seasonal open-air beach BAR (canvas signage + umbrellas,
// NO interior). A raised weathered-wood deck (WALKABLE) + an L-shaped bar
// counter under a teal canvas awning, colourful umbrellas, string-light glow,
// and a 'THE DOCK' canvas sign. Individual frustum-culled meshes; zero rng.
// Group ry=PI (faces SOUTH, world +z, toward arriving players).
function buildTheDock(){
  const D=CH.THE_DOCK,grp=new THREE.Group();
  const dw=D.deckW,dd=D.deckD,dy=D.deckY;
  const woodM=toon(D.wood),barM=toon(D.bar),awnM=toon(D.awning),trimM=toon(D.trim),glowM=bmat(D.glow);
  const wtoX=lx=>D.x-lx,wtoZ=lz=>D.z-lz;             // group is ry=PI: world = D - local

  // raised wood deck (top at y=deckY) + a darker edge fascia skirt
  const deck=new THREE.Mesh(new THREE.BoxGeometry(dw,0.3,dd),woodM);deck.position.y=dy-0.15;grp.add(deck);
  const fascia=new THREE.Mesh(new THREE.BoxGeometry(dw+0.15,0.28,dd+0.15),barM);fascia.position.y=dy-0.14;grp.add(fascia);
  // register the deck as WALKABLE (this rect is mirrored in tools/walkprobe.mjs — keep identical)
  walkRects.push({x1:D.deckRect.x0,x2:D.deckRect.x1,z1:D.deckRect.z0,z2:D.deckRect.z1,h:D.deckY});

  // L-shaped bar counter (two boxes, ~0.9 tall) with a lighter trim countertop.
  // Colliders sit INBOARD on the deck so they never strand the player (065 law).
  const bh=0.9,by=dy+bh/2,inA=dd/2-1.75,inB=dw/2-1.5;
  const cA=new THREE.Mesh(new THREE.BoxGeometry(dw-2.0,bh,0.7),barM);cA.position.set(0,by,inA);grp.add(cA);
  const capA=new THREE.Mesh(new THREE.BoxGeometry(dw-1.8,0.1,0.9),trimM);capA.position.set(0,by+bh/2+0.05,inA);grp.add(capA);
  const cB=new THREE.Mesh(new THREE.BoxGeometry(0.7,bh,dd-3.5),barM);cB.position.set(inB,by,-0.4);grp.add(cB);
  const capB=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.1,dd-3.3),trimM);capB.position.set(inB,by+bh/2+0.05,-0.4);grp.add(capB);
  collide(wtoX(2.5),wtoZ(inA),0.9);collide(wtoX(-2.5),wtoZ(inA),0.9);   // counter A
  collide(wtoX(inB),wtoZ(1.5),0.9);collide(wtoX(inB),wtoZ(-1.5),0.9);   // counter B

  // canvas awning on 4 thin posts over the bar, + two string-light glow bulbs
  const awZ0=inA+0.2,awZ1=inA-2.8,awX=dw/2-1.0;
  for(const[px,pz]of[[awX,awZ0],[-awX,awZ0],[awX,awZ1],[-awX,awZ1]]){
    const post=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,2.7,8),woodM);post.position.set(px,dy+1.35,pz);grp.add(post);
  }
  const awn=new THREE.Mesh(new THREE.BoxGeometry(dw-1.6,0.12,(awZ0-awZ1)+0.6),awnM);awn.position.set(0,dy+2.75,(awZ0+awZ1)/2);awn.rotation.x=0.09;grp.add(awn);
  for(const sx of[-1,1]){const b=new THREE.Mesh(new THREE.SphereGeometry(0.14,8,6),glowM);b.position.set(sx*2.5,dy+2.3,(awZ0+awZ1)/2);grp.add(b);}

  // 4 beach umbrellas just off the deck edges (on the sand); each a small collider
  const ub=[[dw/2+1.5,2.5],[dw/2+1.5,-2.5],[-dw/2-1.5,2.5],[-dw/2-1.5,-2.5]];
  ub.forEach(([lx,lz],i)=>{
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,2.4,8),toon(0xd9cbb2));pole.position.set(lx,1.2,lz);grp.add(pole);
    const can=new THREE.Mesh(new THREE.ConeGeometry(1.2,0.55,10),toon(D.umbCols[i%D.umbCols.length]));can.position.set(lx,2.1,lz);can.rotation.z=0.12;grp.add(can);
    collide(wtoX(lx),wtoZ(lz),0.35);
  });

  // 'THE DOCK' sign, high on the awning's south face. FrontSide + solid backing.
  // Group ry=PI already; sign rotated PI more → net world 0 → FrontSide faces +z
  // (SOUTH, toward arriving players). Own canvas, shrink-to-fit font.
  const cv=document.createElement('canvas');cv.width=600;cv.height=128;const g=cv.getContext('2d');
  g.fillStyle='#1c4b45';g.fillRect(0,0,600,128);
  g.strokeStyle='#ece3cf';g.lineWidth=8;g.strokeRect(10,10,580,108);
  g.fillStyle='#f6efe0';g.textAlign='center';g.textBaseline='middle';
  let fs=80;g.font=`800 ${fs}px "Trebuchet MS",sans-serif`;
  while(g.measureText(D.sign).width>540&&fs>18){fs-=2;g.font=`800 ${fs}px "Trebuchet MS",sans-serif`;}
  g.fillText(D.sign,300,70);
  const stex=new THREE.CanvasTexture(cv);stex.anisotropy=4;
  const sw=4.0,sh=0.85,sgrp=new THREE.Group();
  const frame=new THREE.Mesh(new THREE.BoxGeometry(sw+0.18,sh+0.18,0.08),trimM);frame.position.z=-0.05;sgrp.add(frame);
  const board=new THREE.Mesh(new THREE.PlaneGeometry(sw,sh),curveMat(new THREE.MeshBasicMaterial({map:stex})));sgrp.add(board);
  sgrp.position.set(0,dy+2.55,awZ1-0.2);sgrp.rotation.y=Math.PI;grp.add(sgrp);

  grp.position.set(D.x,0,D.z);grp.rotation.y=D.ry;scene.add(grp);
}

// ---- THEATER ON THE LAKE (task 113) — the 1920 Dwight Perkins Prairie-brick
// pavilion, ALONE on the Fullerton lakefront strip. No photo refs (Commons
// gap): modeled from the documented type — a LOW long hall whose whole read is
// the RHYTHMIC ARCADE of tall round-arched openings marching down every face
// between brick piers, a pale spring-line course, and a broad low hip roof
// with deep Prairie eaves. The arches are glazed today → one merged warm bmat
// glow band (toon glass goes green — the 044 law). All placement from
// CH.LP_THEATER; zero rng; NO walkRects, NO colliders (the footprint is carved
// from walkability in data — the anti-trap law). 12 draws total:
// plinth + 4 walls + glow + trim + roof + doors + stoop + sign + backing.
function buildTheaterOnTheLake(){
  const T=CH.LP_THEATER,grp=new THREE.Group();
  const cx=(T.x0+T.x1)/2,cz=(T.z0+T.z1)/2;
  const hx=(T.x1-T.x0)/2,hz=(T.z1-T.z0)/2;            // 9 x 13 — long axis N-S
  const wallT=0.5,sill=0.45,r=T.archW/2,spring=sill+(T.archH-r);  // arch springs at rect top
  const pitch=3.5;   // ONE arcade beat on every face (pier 1.4 ≥ 1.2); the
                     // leftover goes to fatter CORNER piers — the rhythm
                     // marches around the building instead of re-stretching per face

  // (1) base course — plinth, footprint +0.3 each side
  const plinth=new THREE.Mesh(new THREE.BoxGeometry(hx*2+0.6,0.35,hz*2+0.6),toon(T.base));
  plinth.position.y=0.175;grp.add(plinth);

  // (2) walls — each face ONE ExtrudeGeometry: outer rect minus arch holes
  // (rect + absarc semicircle cap; the 0.5 extrude gives real brick reveals).
  // Shape plane = the OUTER face; extrude runs inward. N/S walls shortened one
  // wall-thickness each end to butt the long walls' inner faces — the long
  // walls' end caps finish the corners flush (no coplanar overlap, no z-fight).
  const brickM=toon(T.brick);
  function wallGeo(len,n){
    const s=new THREE.Shape();
    s.moveTo(-len/2,0);s.lineTo(len/2,0);s.lineTo(len/2,T.wallH);s.lineTo(-len/2,T.wallH);s.closePath();
    for(let i=0;i<n;i++){
      const c=(i-(n-1)/2)*pitch,h=new THREE.Path();
      h.moveTo(c-r,sill);h.lineTo(c+r,sill);h.lineTo(c+r,spring);
      h.absarc(c,spring,r,0,Math.PI,false);h.lineTo(c-r,sill);
      s.holes.push(h);
    }
    return new THREE.ExtrudeGeometry(s,{depth:wallT,bevelEnabled:false,curveSegments:12});
  }
  const longG=wallGeo(hz*2,T.nLong),shortG=wallGeo(hx*2-2*wallT,T.nShort);
  const wW=new THREE.Mesh(longG,brickM);wW.rotation.y=Math.PI/2; wW.position.set(-hx,0.35,0);grp.add(wW);
  const wE=new THREE.Mesh(longG,brickM);wE.rotation.y=-Math.PI/2;wE.position.set( hx,0.35,0);grp.add(wE);
  const wN=new THREE.Mesh(shortG,brickM);                        wN.position.set(0,0.35,-hz);grp.add(wN);
  const wS=new THREE.Mesh(shortG,brickM);wS.rotation.y=Math.PI;  wS.position.set(0,0.35, hz);grp.add(wS);

  // (3) glow windows — ONE merged mesh: a warm pane just larger than each
  // opening, 0.18 inside the outer face, facing out (bmat, NEVER toon — 044
  // law). The two door arches (west+east centres) are SKIPPED so the recessed
  // doors read as doors, not more glass.
  const panes=[],pw=T.archW+0.15,ph=T.archH+0.15,py=0.35+sill+T.archH/2;
  function paneRow(n,skip,place){
    for(let i=0;i<n;i++){
      if(i===skip)continue;
      const g=new THREE.PlaneGeometry(pw,ph);place(g,(i-(n-1)/2)*pitch);panes.push(g);
    }
  }
  const inx=hx-0.18,inz=hz-0.18,mid=(T.nLong-1)/2;
  paneRow(T.nLong,mid,(g,c)=>{g.rotateY(-Math.PI/2);g.translate(-inx,py,c);});  // west
  paneRow(T.nLong,mid,(g,c)=>{g.rotateY( Math.PI/2);g.translate( inx,py,c);});  // east
  paneRow(T.nShort,-1,(g,c)=>{g.rotateY(Math.PI);   g.translate(c,py,-inz);});  // north
  paneRow(T.nShort,-1,(g,c)=>{                      g.translate(c,py, inz);});  // south
  grp.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(panes),bmat(T.glow)));

  // (4) trim — ONE merged mesh: the pale spring-line course + an eaves-line
  // course round all four faces (0.08 proud; N/S strips BUTT the W/E strips at
  // x=±(hx-0.08) so no coplanar overlap ever shimmers), plus the fascia ring
  // hung just under the roof's eave edge (0.01 clear of the roof cap plane).
  const trims=[];
  function band(y,t){
    const g1=new THREE.BoxGeometry(0.16,t,hz*2+0.32);          // W/E wrap the corners
    for(const sx of[-1,1]){const g=g1.clone();g.translate(sx*hx,y,0);trims.push(g);}
    const g2=new THREE.BoxGeometry(hx*2-0.16,t,0.16);          // N/S butt in between
    for(const sz of[-1,1]){const g=g2.clone();g.translate(0,y,sz*hz);trims.push(g);}
  }
  band(0.35+spring,0.18);                                       // spring line (limestone impost)
  band(0.35+T.wallH-0.10,0.18);                                 // eaves line, top 0.01 shy of wall top
  const ex=hx+T.eave,ez=hz+T.eave,roofY=0.35+T.wallH;           // eave rect / wall-top y
  const f1=new THREE.BoxGeometry(0.16,0.14,ez*2);
  for(const sx of[-1,1]){const g=f1.clone();g.translate(sx*(ex-0.08),roofY-0.08,0);trims.push(g);}
  const f2=new THREE.BoxGeometry(ex*2-0.32,0.14,0.16);
  for(const sz of[-1,1]){const g=f2.clone();g.translate(0,roofY-0.08,sz*(ez-0.08));trims.push(g);}
  grp.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(trims),toon(T.trim)));

  // (5) hip roof — one 4-side pyramid frustum: r=√2 makes the π/4-turned square
  // cylinder's FLAT-side half-extent exactly 1, so per-axis scale = the target
  // eave half-extents (corners land exactly on the eave rect). Top cap 22% =
  // the short flat ridge; the 1.15 overhang is the deep-Prairie-eaves read.
  const roofG=new THREE.CylinderGeometry(0.22*Math.SQRT2,Math.SQRT2,T.roofH,4,1);
  roofG.rotateY(Math.PI/4);roofG.scale(ex,1,ez);
  const roof=new THREE.Mesh(roofG,toon(T.roof));roof.position.y=roofY+T.roofH/2;grp.add(roof);

  // (6) doors — dark recessed doubles in the west + east CENTRE arches, 0.35
  // into the opening (glow skipped there above). Two boxes merged → 1 draw.
  const doorGs=[];
  for(const sx of[-1,1]){
    const g=new THREE.BoxGeometry(0.1,2.4,T.archW-0.3);
    g.translate(sx*(hx-0.35),0.35+sill+1.2,0);doorGs.push(g);
  }
  grp.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(doorGs),toon(T.door)));

  // (7) stoop at the west (trail-side) door, lapped 0.05 into the plinth so no
  // coplanar butt face
  const stoop=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.18,3.2),toon(T.base));
  stoop.position.set(-hx-0.85,0.09,0);grp.add(stoop);

  // (8) 'THEATER ON THE LAKE' — bronze plaque high on the WEST face (the trail
  // side), on the blank brick band between arch crowns (3.9) and the eaves
  // course (4.76). Own canvas, measureText-FITTED (headless fallback font
  // measures wider); FrontSide plane 0.025 PROUD of the backing box (z-fight
  // law — never coplanar); backing lapped 0.01 into the brick. The solid wall
  // + backing behind it = no mirrored-text risk.
  const cv=document.createElement('canvas');cv.width=1024;cv.height=128;const g=cv.getContext('2d');
  g.fillStyle='#2c2620';g.fillRect(0,0,1024,128);
  g.fillStyle='#f0e8d2';g.textAlign='center';g.textBaseline='middle';
  let fs=72;g.font=`800 ${fs}px "Trebuchet MS",sans-serif`;
  while(g.measureText(T.sign).width>940&&fs>18){fs-=2;g.font=`800 ${fs}px "Trebuchet MS",sans-serif`;}
  g.fillText(T.sign,512,66);
  const stex=new THREE.CanvasTexture(cv);stex.anisotropy=4;
  const back=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.84,7.66),toon(0x2c2620));
  back.position.set(-hx-0.02,4.32,0);grp.add(back);
  const board=new THREE.Mesh(new THREE.PlaneGeometry(7.5,0.72),curveMat(new THREE.MeshBasicMaterial({map:stex})));
  board.rotation.y=-Math.PI/2;board.position.set(-hx-0.075,4.32,0);grp.add(board);

  grp.position.set(cx,0,cz);scene.add(grp);
}

// ---- Montrose Point / the Magic Hedge sanctuary (task 071) -----------------
// The refs' timber BIRD SANCTUARY gateway (opening faces WEST, arrivals from the
// Lakefront Trail — the entrance path leaves EAST), split-rail flanks, a dark
// rules board, white rope-and-post path fencing, the cream 'Magic Hedge'
// interpretive panel, and the tripod spotting-scopes the birders share. Every
// value from CH.MONTROSE_POINT; 100% rng-free (individual frustum-culled toon
// meshes, no InstancedMesh beyond the appended POSTS/RAILS, no walkRects).
// Fences append to the tail of POSTS/RAILS so every earlier instance index is
// unchanged (determinism holds). Word-sign laws (tasks 028/032/050): each text
// gets its OWN canvas (never a shared atlas), the font is measureText-FITTED
// (headless Chromium's fallback font measures wider — fitting is mandatory), a
// FrontSide plane only, and a solid rear (the beam box, or a BackSide solid
// plane at the same transform) so no mirrored-text artifact can ever show.
function buildMontrosePoint(POSTS,RAILS){
  const MP=CH.MONTROSE_POINT,G=MP.gateway;

  // (a) WHITE ROPE-AND-POST lines — the refs' low path fencing. NO colliders
  // (waist-high rope, purely visual; the birders/probe never collide with it).
  for(const line of MP.ropes)
    fenceRun(line,{spacing:2.6,postH:0.5,color:0xd8d0bd,collide:false},POSTS,RAILS);

  // (b) SPLIT-RAIL FLANKS running N/S from each gateway post along x=191
  // (posts sit at z -880.1 / -883.9 = gate.z ± span/2). Weathered timber,
  // solid colliders (collideR 0.9) so the player is channelled through the gap.
  fenceRun([[191,-880.1],[191,-875.9]],{spacing:2.1,postH:G.rail.postH,color:G.wood,collideR:0.5},POSTS,RAILS);
  fenceRun([[191,-883.9],[191,-886.6]],{spacing:2.1,postH:G.rail.postH,color:G.wood,collideR:0.5},POSTS,RAILS);
  // south flank SHORTENED (-888.1 -> -886.6) + both collideR 0.5: the Montrose
  // walk ribbon bows to x~189.8 by z-888, and a 0.9 collider there reached onto
  // the ribbon (soft-push on the approach path — the issue-025 ring law).

  // (c) THE TIMBER GATEWAY at MP.gate (191,-882). Opening faces WEST; the beam
  // runs N-S over two posts. Individual toon meshes, world coords direct.
  const woodM=toon(G.wood);
  const zN=MP.gate.z+G.span/2,zS=MP.gate.z-G.span/2;   // -880.1 (north) / -883.9 (south)
  for(const pz of[zN,zS]){
    const post=new THREE.Mesh(new THREE.BoxGeometry(G.postW,G.postH,G.postW),woodM);
    post.position.set(MP.gate.x,G.postH/2,pz);scene.add(post);
    collide(MP.gate.x,pz,0.4);
  }
  const beamY=G.beamY+G.beamH/2;                        // beam box centre-y
  const beam=new THREE.Mesh(new THREE.BoxGeometry(0.22,G.beamH,G.beamLen),woodM);
  beam.position.set(MP.gate.x,beamY,MP.gate.z);scene.add(beam);

  // ROUTED-YELLOW letters on the beam's WEST face. Own wide canvas painted the
  // beam wood tone so the board blends into the timber; fitted bold letters with
  // a darker outline for the carved-in look. FrontSide plane only — the solid
  // beam box behind it is the 'solid rear' (no BackSide plane needed here).
  {
    const cv=document.createElement('canvas');cv.width=1024;cv.height=96;const g=cv.getContext('2d');
    g.fillStyle='#8f8470';g.fillRect(0,0,1024,96);                       // beam-wood ground (blends)
    g.textAlign='center';g.textBaseline='middle';
    const txt='MONTROSE POINT BIRD SANCTUARY';
    let fs=46;g.font=`800 ${fs}px "Trebuchet MS",sans-serif`;
    while(g.measureText(txt).width>988&&fs>10){fs-=2;g.font=`800 ${fs}px "Trebuchet MS",sans-serif`;}
    g.lineWidth=2;g.strokeStyle='#5f5010';g.strokeText(txt,512,52);      // subtle darker outline (routed)
    g.fillStyle='#'+G.letters.toString(16).padStart(6,'0');g.fillText(txt,512,52);
    const ltex=new THREE.CanvasTexture(cv);ltex.anisotropy=4;
    const lp=new THREE.Mesh(new THREE.PlaneGeometry(G.beamLen-0.4,G.beamH-0.14),
      curveMat(new THREE.MeshBasicMaterial({map:ltex,side:THREE.FrontSide})));
    lp.position.set(MP.gate.x-0.115-0.015,beamY,MP.gate.z);lp.rotation.y=-Math.PI/2;   // faces -x (west)
    scene.add(lp);
  }

  // THE RULES BOARD — dark, W-facing, at the south jamb; hangs on the S flank
  // line (the flank posts carry it — no post of its own). Own canvas: two rows
  // of three white pictogram circles + the fitted 'Open from dawn to dusk.'.
  // FrontSide plane + a BackSide solid rear at the same transform (free-standing
  // sign law) so the reverse never shows mirrored text.
  {
    const rw=G.rules.w,rh=G.rules.h;
    const cv=document.createElement('canvas');cv.width=384;cv.height=256;const g=cv.getContext('2d');
    g.fillStyle='#2b2723';g.fillRect(0,0,384,256);
    g.fillStyle='#e8e4dc';                                                // pictogram circles
    for(let row=0;row<2;row++)for(let col=0;col<3;col++){g.beginPath();g.arc(96+col*96,58+row*64,24,0,7);g.fill();}
    g.fillStyle='#f2efe8';g.textAlign='center';g.textBaseline='middle';
    const rtxt='Open from dawn to dusk.';
    let rfs=34;g.font=`700 ${rfs}px "Trebuchet MS",sans-serif`;
    while(g.measureText(rtxt).width>360&&rfs>10){rfs-=2;g.font=`700 ${rfs}px "Trebuchet MS",sans-serif`;}
    g.fillText(rtxt,192,222);
    const rtex=new THREE.CanvasTexture(cv);rtex.anisotropy=4;
    const rp=new THREE.Mesh(new THREE.PlaneGeometry(rw,rh),
      curveMat(new THREE.MeshBasicMaterial({map:rtex,side:THREE.FrontSide})));
    rp.position.set(190.9,1.05,-885.6);rp.rotation.y=-Math.PI/2;scene.add(rp);
    const rear=new THREE.Mesh(new THREE.PlaneGeometry(rw,rh),toon(G.rules.bg,{mat:{side:THREE.BackSide}}));
    rear.position.set(190.9,1.05,-885.6);rear.rotation.y=-Math.PI/2;scene.add(rear);   // solid rear
  }

  // (d) THE INTERPRETIVE PANEL at MP.panel (front faces WNW per MP.panel.ry).
  // Lollipop law (issue 014): the post ENDS at the panel's BOTTOM edge — a post
  // run full height through panel centre-depth would BISECT the text. FrontSide
  // cream panel + BackSide solid-cream rear at the same transform.
  {
    const P=MP.panel;
    const post=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.83,0.12),toon(0x6b5c48));
    post.position.set(P.x,0.415,P.z);scene.add(post);                    // base at ground, top at y 0.83 = panel bottom
    const cv=document.createElement('canvas');cv.width=512;cv.height=384;const g=cv.getContext('2d');
    g.fillStyle='#efe6cd';g.fillRect(0,0,512,384);                       // cream board
    g.fillStyle='#2d4a2a';g.textAlign='left';g.textBaseline='alphabetic';
    let tfs=52;g.font=`800 ${tfs}px "Trebuchet MS",sans-serif`;
    const title='The Magic Hedge';
    while(g.measureText(title).width>430&&tfs>14){tfs-=2;g.font=`800 ${tfs}px "Trebuchet MS",sans-serif`;}
    g.fillText(title,28,72);
    g.fillStyle='#4a5c46';g.font='italic 28px "Trebuchet MS",sans-serif';
    g.fillText('A migrant magnet',30,110);                               // subtitle
    // yellow-warbler silhouette glyph, top-right
    g.fillStyle='#e8c11c';
    g.beginPath();g.ellipse(452,60,26,16,0,0,7);g.fill();                // body
    g.beginPath();g.arc(478,50,11,0,7);g.fill();                        // head
    g.fillStyle='#d8a800';g.beginPath();g.moveTo(488,50);g.lineTo(502,47);g.lineTo(488,55);g.closePath();g.fill();   // beak
    g.fillStyle='#c9c3b4';                                               // fake paragraph body lines
    for(let i=0;i<7;i++){g.fillRect(30,152+i*26,i===6?250:440,9);}
    g.fillStyle='#3a3428';g.textAlign='center';
    const band='CHICAGO PARK DISTRICT';
    let bfs=26;g.font=`700 ${bfs}px "Trebuchet MS",sans-serif`;
    while(g.measureText(band).width>470&&bfs>10){bfs-=2;g.font=`700 ${bfs}px "Trebuchet MS",sans-serif`;}
    g.textBaseline='middle';g.fillText(band,256,364);
    const ptex=new THREE.CanvasTexture(cv);ptex.anisotropy=4;
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.15,0.85),
      curveMat(new THREE.MeshBasicMaterial({map:ptex,side:THREE.FrontSide})));
    panel.position.set(P.x,1.25,P.z);panel.rotation.y=P.ry;scene.add(panel);
    const rear=new THREE.Mesh(new THREE.PlaneGeometry(1.15,0.85),toon(0xe6dcc0,{mat:{side:THREE.BackSide}}));
    rear.position.set(P.x,1.25,P.z);rear.rotation.y=P.ry;scene.add(rear);   // solid cream rear
    collide(P.x,P.z,0.35);
  }

  // (e) TRIPOD SCOPES for the two scope:true birders. Each stands 0.55 m from
  // the birder TOWARD their aim; ONE merged geometry per scope (three splayed
  // legs meeting at the apex + a horizontal tube yawed at the aim + an eyepiece
  // knob at the back). Merged so each scope is a single frustum-culled draw.
  const scopeM=toon(0x3a3f45);
  for(const b of MP.birders){
    if(!b.scope)continue;
    const dx=b.aim[0]-b.x,dz=b.aim[1]-b.z,d=Math.hypot(dx,dz)||1;
    const px=b.x+0.55*dx/d,pz=b.z+0.55*dz/d;
    const yaw=Math.atan2(b.aim[0]-px,b.aim[1]-pz);
    const parts=[];
    for(let i=0;i<3;i++){                                                // three legs, splayed ~0.35 rad at 120 deg
      const leg=new THREE.CylinderGeometry(0.02,0.02,1.25,6);
      leg.translate(0,-0.625,0);                                        // top -> local origin (the apex pivot)
      leg.rotateX(0.35);leg.rotateY(i*2*Math.PI/3);                     // splay + distribute
      leg.translate(0,1.18,0);                                          // lift apex to y 1.18
      parts.push(leg);
    }
    const tube=new THREE.CylinderGeometry(0.055,0.075,0.42,10);
    tube.rotateX(Math.PI/2);tube.rotateY(yaw);tube.translate(0,1.28,0); // horizontal, yawed toward the aim
    parts.push(tube);
    const knob=new THREE.SphereGeometry(0.045,8,6);
    knob.translate(-0.24*Math.sin(yaw),1.28,-0.24*Math.cos(yaw));       // eyepiece at the back (opposite aim)
    parts.push(knob);
    const scope=new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(parts),scopeM);
    scope.position.set(px,0,pz);scene.add(scope);
    collide(px,pz,0.3);
  }
}

// ---- LINCOLN PARK ZOO campus (task 114) ------------------------------------
// The fenced-but-OPEN free zoo: ornamental perimeter fence (gates = gaps between
// runs), the east front-door arch + open leaves, the Sea Lion Pool with its
// stacked-slab grotto (B&W ref), the 1912 Kovler Lion House (Theater arcade
// recipe + clerestory ridge monitor), the lion yard, the west lion-plinth gate,
// plain south piers, benches + planted beds. EVERY placement from CH.ZOO —
// zero rng, NO colliders anywhere (walkability is data-carved in chicago.js,
// the anti-trap law), fences tail-append POSTS/RAILS via fenceRun collide:false.
// Statics fold aggressively: per-material world-coord accumulators -> ONE
// merged mesh each (all geometry normalized toNonIndexed so Box/Extrude/Torus/
// Sphere merge under one material — identical position/normal/uv sets).
function buildZoo(POSTS,RAILS){
  const Z=CH.ZOO,LH=Z.lionHouse,GE=Z.gates.east,GW=Z.gates.west,GS=Z.gates.south,P=Z.pool,Y=Z.yard;

  // -- per-material accumulators (merged + scene.add'd at the end) -----------
  const gBrick=[],gTrim=[],gBase=[],gIron=[],gRoof=[],gDoor=[],gGlow=[],gRock=[],gRock2=[],
        gLedge=[],gBronze=[],gBoll=[],gBench=[],gSoil=[],gLeafA=[],gLeafB=[],gBlmA=[],gBlmB=[],
        gBack=[],gPost=[];
  const box=(arr,w,h,d,x,y,z,ry)=>{const g=new THREE.BoxGeometry(w,h,d);if(ry)g.rotateY(ry);g.translate(x,y,z);arr.push(g);};
  const emit=(geos,mat)=>{if(!geos.length)return;
    scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(geos.map(g=>g.index?g.toNonIndexed():g)),mat));};
  // fitted-font helper (word-sign law: measureText-FITTED, headless fallback
  // fonts measure wider). w = the css weight prefix ('800', 'italic 700', ...)
  const fit=(g,t,mw,fs,w)=>{g.font=`${w} ${fs}px "Trebuchet MS",sans-serif`;
    while(g.measureText(t).width>mw&&fs>10){fs-=2;g.font=`${w} ${fs}px "Trebuchet MS",sans-serif`;}};
  // lollipop plate: post ENDS at panel bottom (never bisects), solid dark
  // backing box, FrontSide plate 0.02 proud of the backing face. Own canvas.
  const sign=(px,pz,ry,w,h,cy,postR,cw,ch,draw)=>{
    const bot=cy-h/2;
    if(postR>0){const pg=new THREE.CylinderGeometry(postR,postR,bot,8);pg.translate(px,bot/2,pz);gPost.push(pg);}
    box(gBack,w+0.07,h+0.07,0.05,px,cy,pz,ry);
    const cv=document.createElement('canvas');cv.width=cw;cv.height=ch;const g=cv.getContext('2d');
    draw(g);
    const tex=new THREE.CanvasTexture(cv);tex.anisotropy=4;
    const pl=new THREE.Mesh(new THREE.PlaneGeometry(w,h),curveMat(new THREE.MeshBasicMaterial({map:tex,side:THREE.FrontSide})));
    pl.rotation.y=ry;pl.position.set(px+Math.sin(ry)*0.045,cy,pz+Math.cos(ry)*0.045);scene.add(pl);
  };
  // open iron gate leaf parked swung open: top+bottom rails + 4 vertical bars,
  // hinged at (x,z), local +z rotated by ry (leaves fold back INTO the campus)
  const leaf=(x,z,ry,len,hgt)=>{
    const parts=[[0.06,0.06,len,0,hgt,len/2],[0.06,0.06,len,0,hgt*0.18,len/2]];
    for(let i=0;i<4;i++)parts.push([0.05,hgt*0.92,0.05,0,hgt*0.5,(i+0.5)*len/4]);
    for(const[w,h,d,ox,oy,oz]of parts){const g=new THREE.BoxGeometry(w,h,d);g.translate(ox,oy,oz);g.rotateY(ry);g.translate(x,0,z);gIron.push(g);}
  };
  // chunky reclining bronze lion (cute > anatomical): stretched-sphere body,
  // head + muzzle, flattened mane shell, two forward leg boxes. Local +z =
  // facing; s scales the whole cat. Merged into ONE bronze mesh with the rest.
  const lion=(s,x,y0,z,ry)=>{
    const parts=[];
    const add=(g,sx,sy,sz,lx,ly,lz)=>{g.scale(sx*s,sy*s,sz*s);g.translate(lx*s,ly*s,lz*s);g.rotateY(ry);g.translate(x,y0,z);parts.push(g);};
    add(new THREE.SphereGeometry(0.45,10,8),1.6,0.78,1.05, 0,0.36,-0.05);   // body
    add(new THREE.SphereGeometry(0.26,10,8),1,1,1,          0,0.62,0.55);   // head
    add(new THREE.BoxGeometry(0.22,0.16,0.2),1,1,1,         0,0.55,0.74);   // muzzle
    add(new THREE.SphereGeometry(0.36,10,8),1.05,1,0.55,    0,0.58,0.34);   // mane shell
    for(const sx of[-1,1])add(new THREE.BoxGeometry(0.14,0.15,0.55),1,1,1,sx*0.19,0.1,0.6);  // front legs
    for(const g of parts)gBronze.push(g);
  };

  // (1) PERIMETER FENCE — the whole ornamental ring; gates are the gaps
  // between runs. collide:false — blocking is the data band (zooBlockedHit).
  for(const run of Z.fence.runs)
    fenceRun(run,{spacing:Z.fence.spacing,postH:Z.fence.postH,color:Z.fence.color,collide:false},POSTS,RAILS);

  // (2) EAST GATE — the front door off Cannon. Brick piers + limestone caps.
  for(const pz of[GE.z0,GE.z1]){
    box(gBrick,0.9,3.4,0.9,GE.x,1.7,pz,0);
    box(gTrim,1.15,0.18,1.15,GE.x,3.49,pz,0);
  }
  {  // iron ARCH between the pier tops: shallow torus arc, flattened, crown y 4.5
    const a=new THREE.TorusGeometry(5.0,0.13,6,20,2.2);
    a.rotateZ(Math.PI/2-1.1);                 // centre the 2.2-rad arc at the top
    a.scale(1,0.35,1);                        // flatten shallow
    a.rotateY(Math.PI/2);                     // arc spans world z
    a.translate(GE.x,2.75,(GE.z0+GE.z1)/2);   // crown 5*0.35+2.75 = 4.5
    gIron.push(a);
  }
  box(gIron,0.1,0.18,9.2,GE.x,3.62,(GE.z0+GE.z1)/2,0);   // chord bar tying the piers (the sign band hangs on it)
  {  // 'LINCOLN PARK ZOO / · FREE SINCE 1868 ·' band facing EAST (+x)
    const cv=document.createElement('canvas');cv.width=1024;cv.height=192;const g=cv.getContext('2d');
    g.fillStyle='#2c2f2b';g.fillRect(0,0,1024,192);
    g.textAlign='center';g.textBaseline='middle';
    g.fillStyle='#f0e8d2';fit(g,GE.sign,940,92,'800');g.fillText(GE.sign,512,76);
    const reg='· '+GE.register+' ·';
    g.fillStyle='#e5c56a';fit(g,reg,700,40,'700');g.fillText(reg,512,156);
    const tex=new THREE.CanvasTexture(cv);tex.anisotropy=4;
    box(gBack,0.08,1.45,7.8,-10.14,4.35,830,0);           // solid backing over the chord
    const pg=new THREE.PlaneGeometry(7.6,1.35);pg.rotateY(Math.PI/2);       // front faces +x
    const pl=new THREE.Mesh(pg,curveMat(new THREE.MeshBasicMaterial({map:tex,side:THREE.FrontSide})));
    pl.position.set(-10.06,4.35,830);scene.add(pl);
  }
  // OPEN leaves parked swung fully back INTO the campus, flat-ish along the
  // fence (the spec's ±0.6-rad park landed the tips ON the loop pavers — the
  // loop's first points hug this corner; 0.35 rad folded N/S clears them).
  leaf(-10.6,825.6,Math.PI+0.35,3.4,1.6);
  leaf(-10.6,834.4,-0.35,3.4,1.6);
  {  // brick paver PAD under the gate (GE.pad rect)
    const pd=GE.pad;
    const m=new THREE.Mesh(new THREE.BoxGeometry(pd.x1-pd.x0,0.05,pd.z1-pd.z0),toon(Z.loopStyle.color));
    m.position.set((pd.x0+pd.x1)/2,0.056,(pd.z0+pd.z1)/2);scene.add(m);    // top y 0.081
  }
  // DIRECTORY BOARD, NE-facing toward the gate: header + tag line + a painted
  // suggestive mini-map (green blob / pool dot / red halls / you-are-here)
  sign(-16.5,818.5,2.35,1.6,1.15,1.5,0.06,512,384,g=>{
    g.fillStyle='#efe6cd';g.fillRect(0,0,512,384);
    g.textAlign='center';g.textBaseline='middle';
    g.fillStyle='#2d3a2c';fit(g,GE.sign,450,50,'800');g.fillText(GE.sign,256,44);
    g.fillStyle='#5a5142';const tag='free · open · since 1868';fit(g,tag,430,26,'700');g.fillText(tag,256,86);
    g.fillStyle='#7fae6b';g.beginPath();g.ellipse(256,236,200,122,0,0,7);g.fill();      // the campus blob
    g.strokeStyle='#c8b98e';g.lineWidth=7;g.beginPath();g.moveTo(430,236);g.bezierCurveTo(360,300,220,300,120,240);g.stroke();  // the loop walk
    g.fillStyle='#5a8fae';g.beginPath();g.arc(190,222,20,0,7);g.fill();                 // pool dot
    g.fillStyle='#b3402e';g.fillRect(268,196,74,28);g.fillRect(210,282,44,20);g.fillRect(140,152,36,22);  // hall rects
    g.fillStyle='#d43b2a';g.beginPath();g.arc(408,238,10,0,7);g.fill();                 // you are here
    g.beginPath();g.moveTo(398,208);g.lineTo(418,208);g.lineTo(408,224);g.closePath();g.fill();  // arrow down to it
  });

  // (3) SEA LION POOL — rim ring (open cylinders + flat cap, DoubleSide)
  {
    const wo=new THREE.CylinderGeometry(7.0,7.0,P.rimH,28,1,true);wo.translate(P.x,P.rimH/2,P.z);
    const wi=new THREE.CylinderGeometry(6.55,6.55,P.rimH,28,1,true);wi.translate(P.x,P.rimH/2,P.z);
    const cap=new THREE.RingGeometry(6.55,7.15,28);cap.rotateX(-Math.PI/2);cap.translate(P.x,P.rimH,P.z);
    scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([wo,wi,cap].map(g=>g.index?g.toNonIndexed():g)),
      toon(P.rim,{mat:{side:THREE.DoubleSide}})));
    const wat=new THREE.CircleGeometry(P.waterR,26);wat.rotateX(-Math.PI/2);wat.translate(P.x,0.45,P.z);
    scene.add(new THREE.Mesh(wat,bmat(P.water)));      // self-lit water (toon bands weirdly — 044 law)
  }
  // GROTTO — the signature craggy stacked-slab limestone mound rising out of
  // the water. Slab centres pulled toward the pool centre (grotto anchor sits
  // 5.15 out — literal slabs there would poke the rim) so every extent stays
  // inside waterR. Alternating greys -> the two rock meshes.
  const gx=-62.2,gz=816.2;   // mound origin (biased in from P.grotto toward centre)
  const SLABS=[  // [w,h,d, ox,cy,oz, ry, alt]
    [2.6,.5,1.9,   0,.25,  0,  .2,0],[2.3,.45,1.7, .25,.72,-.15,-.3,1],
    [2.4,.4,1.5, -.2,1.13, .2, .55,0],[2.0,.45,1.4,.15,1.55,-.1,-.15,1],
    [2.2,.4,1.2, .55,1.95,.35, .9,0],                         // the cantilevered overhang
    [1.6,.4,1.2,-.15,2.33,  0, -.5,1],[1.4,.35,1.0,.1,2.7,.1,.35,0],
    [1.0,.35,.8,   0,3.0,-.05,-.7,1],                         // top ~3.17
    [1.8,.4,1.3,-1.1,.2,  .6,  .7,1],[1.6,.35,1.1,.9,.18,-.8,-.4,0],  // base spread
    [1.5,.4,1.0,  .7,.6,  .9, 1.1,0],[1.3,.35,.9,-.9,.65,-.6,-.9,1],
  ];
  for(const[w,h,d,ox,cy,oz,ry,alt]of SLABS)box(alt?gRock2:gRock,w,h,d,gx+ox,cy,gz+oz,ry);
  {  // dark cave recess plane tucked on the SE face (edges buried in slab)
    const cm=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.0),toon(0x1a1a1c));
    cm.rotation.y=Math.PI/4;cm.position.set(-61.4,0.9,817.0);scene.add(cm);
  }
  box(gRock,2.2,0.5,1.4,-60.8,0.37,817.4,0.15);   // HAUL-OUT SHELF, flat top y 0.62 (the pack lies a seal here)
  // two low rock islets
  box(gRock,1.4,0.35,1.0,-57,0.175,823.5,0.5);  box(gRock2,1.0,0.28,0.7,-56.8,0.36,823.3,-0.3);
  box(gRock2,1.5,0.35,1.1,-63,0.175,823.3,-0.6);box(gRock,0.9,0.25,0.6,-63.2,0.37,823.1,0.8);
  // hanging 'SEA LIONS' board off the grotto top — L-arm (two thin iron boxes),
  // small board facing SE toward the south-east rail (the spec's ry -2.5 is the
  // NW anti-parallel of its own 'facing SE' word — the word wins, ry 0.79)
  box(gIron,0.08,1.0,0.08,-62.0,2.7,816.4,0);                       // vertical stub buried in the top slabs
  {const arm=new THREE.BoxGeometry(0.08,0.08,1.1);arm.translate(0,0,0.55);arm.rotateY(0.79);arm.translate(-62.0,2.67,816.4);gIron.push(arm);}
  sign(-61.4,817.0,0.79,1.0,0.5,2.3,0,256,128,g=>{
    g.fillStyle='#242422';g.fillRect(0,0,256,128);
    g.textAlign='center';g.textBaseline='middle';
    g.fillStyle='#f0e8d2';fit(g,P.sign,230,52,'800');g.fillText(P.sign,128,66);
  });
  {  // VIEWING RAIL — one closed 21-segment circle at railR (first pt repeated)
    const pts=[];
    for(let i=0;i<=21;i++){const a=i/21*Math.PI*2;pts.push([P.x+Math.cos(a)*P.railR,P.z+Math.sin(a)*P.railR]);}
    fenceRun(pts,{spacing:2.1,postH:P.railH,color:0x3a3f3a,collide:false},POSTS,RAILS);
  }
  // 'SEA LION POOL' plate SE of the rail on the approach side (word 'SE' wins
  // over the spec's anti-parallel ry -2.4, as above)
  sign(-52.6,827.6,0.75,1.3,0.5,1.3,0.05,512,192,g=>{
    g.fillStyle='#efe6cd';g.fillRect(0,0,512,192);
    g.textAlign='center';g.textBaseline='middle';
    g.fillStyle='#2f4a3f';fit(g,'SEA LION POOL',460,54,'800');g.fillText('SEA LION POOL',256,98);
  });

  // (4) KOVLER LION HOUSE — the Theater arcade recipe with the long faces
  // turned N/S (9 beats), 3-arch ends, and the 1912 clerestory ridge monitor.
  {
    const hx=LH.w/2,hz=LH.d/2,wallT=0.5,sill=0.5,r=LH.archW/2,spring=sill+LH.archH-r,pitch=3.5;
    box(gBase,LH.w+0.6,0.35,LH.d+0.6,LH.x,0.175,LH.z,0);           // plinth, +0.3 oversize
    function wallGeo(len,n){                                       // outer rect minus arch holes
      const s=new THREE.Shape();
      s.moveTo(-len/2,0);s.lineTo(len/2,0);s.lineTo(len/2,LH.wallH);s.lineTo(-len/2,LH.wallH);s.closePath();
      for(let i=0;i<n;i++){
        const c=(i-(n-1)/2)*pitch,h=new THREE.Path();
        h.moveTo(c-r,sill);h.lineTo(c+r,sill);h.lineTo(c+r,spring);
        h.absarc(c,spring,r,0,Math.PI,false);h.lineTo(c-r,sill);
        s.holes.push(h);
      }
      return new THREE.ExtrudeGeometry(s,{depth:wallT,bevelEnabled:false,curveSegments:12});
    }
    // long N/S walls full-length; E/W ends shortened one wall-T each side to
    // butt them (the long walls' end caps finish the corners — Theater law)
    const gN=wallGeo(LH.w,LH.nLong);                       gN.translate(LH.x,0.35,LH.z-hz);gBrick.push(gN);
    const gS=wallGeo(LH.w,LH.nLong);gS.rotateY(Math.PI);   gS.translate(LH.x,0.35,LH.z+hz);gBrick.push(gS);
    const gW=wallGeo(LH.d-2*wallT,LH.nShort);gW.rotateY( Math.PI/2);gW.translate(LH.x-hx,0.35,LH.z);gBrick.push(gW);
    const gEw=wallGeo(LH.d-2*wallT,LH.nShort);gEw.rotateY(-Math.PI/2);gEw.translate(LH.x+hx,0.35,LH.z);gBrick.push(gEw);
    // glow panes in every arch EXCEPT the two door centres; monitor strips too
    const pw=LH.archW+0.15,ph=LH.archH+0.15,py=0.35+sill+LH.archH/2,mid=(LH.nLong-1)/2;
    const pane=(w,h,ry,x,y,z)=>{const g=new THREE.PlaneGeometry(w,h);if(ry)g.rotateY(ry);g.translate(x,y,z);gGlow.push(g);};
    for(let i=0;i<LH.nLong;i++){
      if(i===mid)continue;const c=(i-mid)*pitch;
      pane(pw,ph,Math.PI,LH.x+c,py,LH.z-(hz-0.18));                // north row (doors skip centre)
      pane(pw,ph,0,      LH.x+c,py,LH.z+(hz-0.18));                // south row
    }
    for(let i=0;i<LH.nShort;i++){
      const c=(i-(LH.nShort-1)/2)*pitch;
      pane(pw,ph,-Math.PI/2,LH.x-(hx-0.18),py,LH.z+c);             // west end
      pane(pw,ph, Math.PI/2,LH.x+(hx-0.18),py,LH.z+c);             // east end
    }
    // trim: spring-line + eaves courses (W/E wrap corners, N/S butt between —
    // no coplanar overlap), then the fascia ring under the eave edge
    const band=(y,t)=>{
      for(const sx of[-1,1])box(gTrim,0.16,t,LH.d+0.32,LH.x+sx*hx,y,LH.z,0);
      for(const sz of[-1,1])box(gTrim,LH.w-0.16,t,0.16,LH.x,y,LH.z+sz*hz,0);
    };
    band(0.35+spring,0.18);band(0.35+LH.wallH-0.10,0.18);
    const ex=hx+LH.eave,ez=hz+LH.eave,roofY=0.35+LH.wallH;
    for(const sx of[-1,1])box(gTrim,0.16,0.14,ez*2,LH.x+sx*(ex-0.08),roofY-0.08,LH.z,0);
    for(const sz of[-1,1])box(gTrim,ex*2-0.32,0.14,0.16,LH.x,roofY-0.08,LH.z+sz*(ez-0.08),0);
    // hip roof — the √2 frustum trick lands the corners exactly on the eave rect
    const roofG=new THREE.CylinderGeometry(0.22*Math.SQRT2,Math.SQRT2,LH.roofH,4,1);
    roofG.rotateY(Math.PI/4);roofG.scale(ex,1,ez);roofG.translate(LH.x,roofY+LH.roofH/2,LH.z);gRoof.push(roofG);
    // CLERESTORY MONITOR on the ridge (the 1912 silhouette): brick box sunk
    // into the roof slopes, 4-pane glow strips N+S, its own small hip cap
    const M=LH.monitor,my=roofY+LH.roofH-0.1;                      // centre y 9.05 (bottom buried on all sides)
    box(gBrick,M.w,M.h,M.d,LH.x,my,LH.z,0);
    for(const sz of[-1,1])for(let i=0;i<4;i++)
      pane(2.6,1.0,sz<0?Math.PI:0,LH.x-6+i*4,my+0.3,LH.z+sz*(M.d/2+0.02));
    const mr=new THREE.CylinderGeometry(0.22*Math.SQRT2,Math.SQRT2,M.roofH,4,1);
    mr.rotateY(Math.PI/4);mr.scale(M.w/2+0.5,1,M.d/2+0.5);
    mr.translate(LH.x,my+M.h/2-0.06+M.roofH/2,LH.z);gRoof.push(mr);   // base sunk 0.06 into the box top (no coplanar cap)
    // doors: dark recessed boxes + stoops in the north + south CENTRE arches.
    // Full arch height (shot round 2: a 2.4 door left the transom OPEN — the
    // arch read see-through green over the door in the south-face framing).
    for(const sz of[-1,1]){
      box(gDoor,LH.archW-0.3,LH.archH+0.25,0.1,LH.x,0.35+sill+(LH.archH+0.25)/2,LH.z+sz*(hz-0.35),0);
      box(gBase,3.2,0.18,1.2,LH.x,0.09,LH.z+sz*(hz+0.85),0);       // stoop, lapped 0.05 into the plinth
    }
    // 'KOVLER LION HOUSE' plaque high on the NORTH face (pool/yard side), on
    // the blank band between arch crowns (4.45) and the eaves course (5.76)
    {
      const cv=document.createElement('canvas');cv.width=1024;cv.height=128;const g=cv.getContext('2d');
      g.fillStyle='#2c2620';g.fillRect(0,0,1024,128);
      g.textAlign='center';g.textBaseline='middle';
      g.fillStyle='#f0e8d2';fit(g,LH.sign,940,72,'800');g.fillText(LH.sign,512,66);
      const tex=new THREE.CanvasTexture(cv);tex.anisotropy=4;
      box(gBack,7.66,0.84,0.06,LH.x,5.1,LH.z-hz-0.02,0);           // lapped 0.01 into the brick
      const pg=new THREE.PlaneGeometry(7.5,0.72);pg.rotateY(Math.PI);
      const pl=new THREE.Mesh(pg,curveMat(new THREE.MeshBasicMaterial({map:tex,side:THREE.FrontSide})));
      pl.position.set(LH.x,5.1,LH.z-hz-0.055);scene.add(pl);       // 0.025 proud of the backing face
    }
  }
  // BRONZE LION by the north door, reclining on a stone plinth, facing north
  box(gBase,1.7,0.45,1.0,-36.6,0.225,822.9,0);
  lion(1,-36.6,0.45,822.9,Math.PI);

  // (5) LION YARD — dirt ground, NW ledge group (lions lie on the tall one),
  // low slab walls W + E edges, loose rocks; south side is the house plinth
  {
    const gnd=new THREE.PlaneGeometry(Y.x1-Y.x0,Y.z1-Y.z0);gnd.rotateX(-Math.PI/2);
    const m=new THREE.Mesh(gnd,toon(Y.dirt));m.position.set((Y.x0+Y.x1)/2,0.03,(Y.z0+Y.z1)/2);scene.add(m);
  }
  box(gLedge,2.6,0.75,1.9,-28.5,0.375,814.5,0);    // the lie slab — flat top y 0.75, kept ≥2.2x1.6
  box(gLedge,2.2,0.55,1.7,-26.8,0.275,815.9,0.4);
  box(gLedge,1.8,0.4,1.5,-29.9,0.2,815.7,-0.35);
  const WALL=[  // [x,z, h, d, ry] slab rows along the W (x0) and E (x1) edges
    [Y.x0,812.6,.6,2.6,.08],[Y.x0,815.2,.5,2.4,-.06],[Y.x0,817.9,.7,2.5,.1],[Y.x0,820.5,.55,2.4,-.09],[Y.x0,823.1,.6,2.6,.05],
    [Y.x1,812.5,.55,2.6,-.07],[Y.x1,815.1,.65,2.4,.09],[Y.x1,817.8,.5,2.5,-.05],[Y.x1,820.4,.6,2.4,.08],[Y.x1,823.2,.7,2.6,-.1],
  ];
  for(const[x,z,h,d,ry]of WALL)box(gRock,0.8,h,d,x,h/2,z,ry);
  box(gRock,0.6,0.4,0.5,-22,0.2,818.5,0.5);box(gRock,0.5,0.35,0.45,-29.5,0.175,820.8,-0.7);box(gRock,0.45,0.3,0.4,-20.5,0.15,813.8,0.9);
  fenceRun([[-32,814],[-32,811],[-18,811],[-18,814]],{spacing:2.2,postH:Y.railH,color:0x3a3f3a,collide:false},POSTS,RAILS);
  // habitat plate, facing NORTH toward approaching viewers
  sign(-25,809.8,Math.PI,1.35,0.6,1.25,0.05,512,224,g=>{
    g.fillStyle='#efe6cd';g.fillRect(0,0,512,224);
    g.textAlign='center';g.textBaseline='middle';
    g.fillStyle='#3a2f24';fit(g,'THE LIONS',460,64,'800');g.fillText('THE LIONS',256,82);
    const sub='Pepper Family Wildlife Center';
    g.fillStyle='#6b5c48';fit(g,sub,470,28,'italic 700');g.fillText(sub,256,168);
  });

  // (6) WEST GATE — the ref-identity octagonal 2-tier lion plinth (flats E/W)
  for(const[rt,rb,h,cy,c]of[[1.55,1.55,0.5,0.25,0xd8d2c2],[1.25,1.4,0.45,0.72,0x8b8f92],[1.0,1.15,0.28,1.08,0x3c4043]]){
    const g=new THREE.CylinderGeometry(rt,rb,h,8);g.rotateY(Math.PI/8);g.translate(GW.x,cy,GW.z);
    scene.add(new THREE.Mesh(g,toon(c)));
  }
  {  // 'LINCOLN PARK ZOO' plate on the light band's WEST flat (Stockton side);
     // the octagon band itself is the solid backing (flat face x -95.33)
    const cv=document.createElement('canvas');cv.width=1024;cv.height=160;const g=cv.getContext('2d');
    g.fillStyle='#d8d2c2';g.fillRect(0,0,1024,160);
    g.textAlign='center';g.textBaseline='middle';
    g.fillStyle='#3a352c';fit(g,GW.sign,980,84,'800');g.fillText(GW.sign,512,82);
    const tex=new THREE.CanvasTexture(cv);tex.anisotropy=4;
    const pg=new THREE.PlaneGeometry(1.9,0.3);pg.rotateY(-Math.PI/2);       // faces -x (west)
    const pl=new THREE.Mesh(pg,curveMat(new THREE.MeshBasicMaterial({map:tex,side:THREE.FrontSide})));
    pl.position.set(-95.35,0.27,GW.z);scene.add(pl);
  }
  lion(0.8,-94.05,1.22,857.75,0.5);          // two reclining bronzes on the top
  lion(0.8,-93.75,1.22,858.25,Math.PI-0.5);  // slab, back-to-back-ish
  for(const[bx,bz]of GW.bollards){
    const c=new THREE.CylinderGeometry(0.14,0.14,0.8,8);c.translate(bx,0.4,bz);gBoll.push(c);
    const s=new THREE.SphereGeometry(0.16,8,6);s.translate(bx,0.8,bz);gBoll.push(s);
  }

  // (7) SOUTH GATE — plain brick piers + trim caps + small open leaves folded
  // back along the fence (the pond spur crosses the gap at x ~ -48.9)
  for(const px of[GS.x0,GS.x1]){
    box(gBrick,GS.pierW,GS.pierH,GS.pierW,px,GS.pierH/2,GS.z,0);
    box(gTrim,0.95,0.16,0.95,px,GS.pierH+0.08,GS.z,0);
  }
  leaf(GS.x0+0.4,GS.z-0.4,-1.92,1.8,1.2);
  leaf(GS.x1-0.4,GS.z-0.4, 1.92,1.8,1.2);

  // (9) BENCHES — the props park-bench geometry (seat/back/2 legs) as plain
  // merged boxes, dock-wood tone; each ≥2.5 m off every path centreline
  const bench=(x,z,ry)=>{   // CHIBI scale (shot round 1: 0.62 seat read grown-up next to the 1.2 m mayor)
    const parts=[];
    const seat=new THREE.BoxGeometry(1.7,0.12,0.55);seat.translate(0,0.42,0);parts.push(seat);
    const back=new THREE.BoxGeometry(1.7,0.42,0.1);back.rotateX(-0.15);back.translate(0,0.72,-0.26);parts.push(back);
    for(const sx of[-0.72,0.72]){const l=new THREE.BoxGeometry(0.12,0.42,0.5);l.translate(sx,0.21,0);parts.push(l);}
    for(const g of parts){g.rotateY(ry);g.translate(x,0,z);gBench.push(g);}
  };
  bench(-48,808,0);          // back north, faces the yard/pool ground
  bench(-73,843,2.77);       // faces NE toward the pool (round 1: -67,838 sat IN the lp-seal-pool f0 camera)
  bench(-14.5,808,-1.45);    // back to the trail, faces W toward the yard (round 1: -18.5,801 sat IN the lp-lion-house f0 camera)
  // (10) PLANTED BEDS x2 — squashed soil disc + chunky blossom mounds + leaf
  // balls (LP canopy greens; blossoms reuse this file's windmill red + finial gold)
  const bed=(bx,bz)=>{   // round 2: r.27-.4 blossom blobs merged into a striped 'fallen pole' at grazing angles — smaller heads over a green shrub base reads as a bed
    const soil=new THREE.CircleGeometry(1.3,16);soil.rotateX(-Math.PI/2);soil.scale(1,1,0.692);soil.translate(bx,0.02,bz);gSoil.push(soil);
    const SHR=[[-.5,-.2,.34],[.15,.25,.38],[.55,-.15,.3]];   // low green mounds first...
    for(const[ox,oz,r]of SHR){const g=new THREE.SphereGeometry(r,8,6);g.scale(1,0.6,1);g.translate(bx+ox,r*0.35,bz+oz);gLeafA.push(g);}
    const BLM=[[-.62,.18,.16,0],[-.28,-.42,.18,1],[-.1,.42,.15,0],[.3,-.32,.17,0],[.5,.3,.16,1],[.75,-.02,.14,0],[-.75,-.1,.15,1]];   // ...small blossom heads dotted atop
    for(const[ox,oz,r,alt]of BLM){const g=new THREE.SphereGeometry(r,7,5);g.scale(1,0.6,1);g.translate(bx+ox,0.32,bz+oz);(alt?gBlmB:gBlmA).push(g);}
    for(const[ox,oz,r,alt]of[[-.35,.55,.3,0],[.72,-.12,.26,1]]){const g=new THREE.SphereGeometry(r,8,6);g.scale(1,0.8,1);g.translate(bx+ox,r*0.5,bz+oz);(alt?gLeafB:gLeafA).push(g);}
  };
  bed(-12.5,841);bed(-58,845);

  // -- emit: ONE merged mesh per material --------------------------------
  emit(gBrick,toon(LH.brick));  emit(gTrim,toon(LH.trim));  emit(gBase,toon(LH.base));
  emit(gDoor,toon(LH.door));    emit(gRoof,toon(LH.roof));  emit(gGlow,bmat(LH.glow));
  emit(gIron,toon(Z.fence.color));
  emit(gRock,toon(P.rock));     emit(gRock2,toon(P.rock2)); emit(gLedge,toon(Y.ledge));
  emit(gBronze,toon(0x6a5233)); emit(gBoll,toon(0x4a4f46)); emit(gBench,toon(0x8a6a44));
  emit(gSoil,toon(0x5c4a38));
  emit(gLeafA,toon(0x5aa64f));  emit(gLeafB,toon(0x74bd63));
  emit(gBlmA,toon(0xb3402e));   emit(gBlmB,toon(0xf0d98a));
  emit(gBack,toon(0x2c2620));   emit(gPost,toon(0x6b5c48));
}

export function buildStructures(){
  const POSTS=[],RAILS=[];
  buildDogFence(POSTS,RAILS);
  buildSanctuary(POSTS,RAILS);
  buildGolf(POSTS,RAILS);
  buildTennis(POSTS,RAILS);
  buildDiversey(POSTS,RAILS);
  buildCornerPark(POSTS,RAILS);
  fenceRun(CH.MT_HOOK_RAIL.line, {spacing:CH.MT_HOOK_RAIL.spacing, postH:CH.MT_HOOK_RAIL.postH, color:CH.MT_HOOK_RAIL.color, collideR:CH.MT_HOOK_RAIL.collideR}, POSTS, RAILS);
  fenceRun(CH.MONTROSE_DUNE.fence, {spacing:2.6, postH:0.5, color:0xcbb994, collide:false}, POSTS, RAILS);   // low rope line, NO colliders (dune interior blocked by walk data — 065 law)
  buildMontrosePoint(POSTS,RAILS);   // task 071: sanctuary gateway/flanks/ropes append to POSTS/RAILS tail (indices unchanged); statics drawn directly
  buildZoo(POSTS,RAILS);             // task 114: zoo campus — perimeter/gates/pool/lion house/yard append to the tail (collide:false, data-carved walkability)
  emitFences(POSTS,RAILS);
  buildFieldhouse();
  buildParkBait();
  buildBeachHouse();
  buildTheDock();
  buildTheaterOnTheLake();   // 113: the Fullerton lakefront pavilion (zero rng — det-safe insert)
  buildYachtClub();
  buildGolfClubhouse();
  buildChevron();
  buildEntranceMonument();
  buildLSD();
}
