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
  // Fullerton underpass gap so the path passes through (the road bridges over).
  // Two box segments instead of one; the road/dashes stay continuous.
  // 120: the gap moved to LSD.gap (widened to 653..669 to match the bridge deck)
  // — reading the stale B.gap left the berm UNSPLIT, and its underside roofed the
  // whole sunken cut with a green ceiling. Accept either spelling.
  const G=L.gap||B.gap;
  const bermSeg=(z0,z1)=>{const l=z1-z0;if(l<=0.5)return;const sz=Math.max(2,Math.round(l/6));
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,B.h,l,1,1,sz),toon(B.color));m.position.set(xc,B.h/2,(z0+z1)/2);scene.add(m);};
  if(G){ bermSeg(B.z0,G.z0); bermSeg(G.z1,B.z1); }
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

// 120 LINCOLN PARK (issue 035) — the map's FIRST WORKING crossing, REBUILT as a
// REAL sunken underpass. The 112 version was a flat cut AT GRADE: the berm split
// and the Drive's road slab (y 1.02) ran straight through the walker's chest —
// the owner's "there's not a real bridge over lakeshore drive… solids shouldn't
// pass through solids". Now the path DIPS: ramps down from both trail heads, a
// level tunnel under the Drive, and the Drive is carried OVER it on a bridge deck
// with parapets. Every floor sample comes from CH.lpUnderpassH — THE walk surface
// (main.js surfaceY/walkable + tools/walkprobe.mjs) — so geometry and walkability
// can NEVER diverge; the 112 flat walkRect is gone. Axis-aligned E-W (the
// camera-math interior rule). NO colliders (the anti-trap law): the trench rim is
// a data carve (lpUnderpassRim). Both mouths stay OPEN — you see straight through
// to the far side (the invitation), unlike the fenced dead-end portals.
// Draw budget: plain meshes on CACHED toon colours, so mergeCellStatic folds each
// colour to one bucket (no InstancedMesh here — r128 instances are never culled).
function buildLPUnderpass(){
  const U=CH.LP_UNDERPASS,D=U.deck,P=U.parapet,R=CH.LSD.road;
  const z=U.portalE[1],hw=U.w/2,zc=(U.z0+U.z1)/2;
  const wallM=toon(U.wall),floorM=toon(U.floor),deckM=toon(U.soffit),voussoirM=toon(0xe8dcc2);
  const throatM=toon(U.throat),lampM=bmat(U.lamp);   // 124: throat = baked-shadow interior tone; ONE lampM instance shared by tunnel + pylon lanterns (bmat does NOT cache — a 2nd instance would open a 2nd merge bucket)
  const SOF=D.top-D.th;                       // 0.52 — bridge soffit = abutment top (3.62 m headroom)
  const COPE=0.15;                            // retaining-wall coping, proud of park grade
  const LIFT=0.06;                            // paving rides just over the analytic walk surface
  const surf=(x,zz)=>{const h=CH.lpUnderpassH(x,zz);return (h===null?0:h)+LIFT;};

  // 1. THE PAVED CUT — one strip sampled from lpUnderpassH: west ramp down, the
  // level tunnel, east ramp up. Runs ~1.2 m PAST each ramp head so the trail
  // ribbon caps (LP_TRAIL_LAKE x 25.5 / LP_TRAIL_PARK x -11.5) meet paving with
  // no gap. Subdivided in x AND z so the world curve reads across the span.
  {
    const xA=U.rampW.x0-1.2,xB=U.rampE.x1+1.2,nx=64,nz=6;
    const pos=[],uv=[],idx=[];
    for(let i=0;i<=nx;i++){
      const x=xA+(xB-xA)*i/nx;
      for(let k=0;k<=nz;k++){
        const zz=U.z0+(U.z1-U.z0)*k/nz;
        pos.push(x,surf(x,zz),zz);uv.push((x-xA)/4,(zz-U.z0)/4);
      }
    }
    const row=nz+1;
    for(let i=0;i<nx;i++)for(let k=0;k<nz;k++){
      const a=i*row+k,b=(i+1)*row+k;
      idx.push(a,a+1,b+1,a,b+1,b);          // wound so the face normal is +y
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    g.setIndex(idx);g.computeVertexNormals();
    scene.add(new THREE.Mesh(g,floorM));
  }

  // 2. RETAINING WALLS down both long sides of the whole cut — bottom follows the
  // floor, top is a coping lip 0.15 proud of grade (so the trench edge reads from
  // above) and rises to the deck soffit under the bridge, where the same wall is
  // the ABUTMENT carrying the deck.
  {
    const WT=0.7;
    const span=(x0,x1,top,mat)=>{
      const n=Math.max(1,Math.round((x1-x0)/1.0));
      for(let i=0;i<n;i++){
        const a=x0+(x1-x0)*i/n,b=x0+(x1-x0)*(i+1)/n;
        const bot=Math.min(surf(a,zc),surf(b,zc))-0.7;
        for(const s of[-1,1]){
          const m=new THREE.Mesh(new THREE.BoxGeometry(b-a+0.02,top-bot,WT),mat||wallM);
          m.position.set((a+b)/2,(top+bot)/2,(s<0?U.z0:U.z1)+s*WT/2);scene.add(m);
        }
      }
    };
    span(U.rampW.x0-0.2,D.x0,COPE);         // open west ramp
    span(D.x0,D.x1,SOF,throatM);            // the abutments under the bridge — 124: THROAT tone (dark, never black; the lanterns keep it lit) so the mouth reads as a shadowed opening against the tan portal face
    span(D.x1,U.rampE.x1+0.2,COPE);         // open east ramp
    // 124: matching dark floor band under the deck (a thin overlay 0.012 proud
    // of the paved strip — layer-ladder clear) — the throat goes dark floor to
    // soffit, the open-cut ramps stay sunlit pale.
    const fb=new THREE.Mesh(new THREE.BoxGeometry(D.x1-D.x0-0.3,0.02,U.z1-U.z0-1.6),throatM);
    fb.position.set((D.x0+D.x1)/2,U.floorY+LIFT+0.022,zc);scene.add(fb);
  }

  // 3. THE BRIDGE DECK — the Drive rides OVER the cut (the road slab in buildLSD
  // is one continuous box at y 1.02; its underside 0.96 sits INSIDE this deck, so
  // no coplanar faces = no z-fight) — plus low parapets outboard of the roadway,
  // which are what read this as a BRIDGE from the Drive and from the trail.
  // The deck is SELF-LIT (bmat): a big toon slab seen from BELOW picks up the
  // hemisphere light's green ground-bounce and reads PEA-GREEN — the standing
  // raised-canopy pitfall (044/062). The parapets stay toon: they are vertical,
  // read from the roadway, and never become a ceiling.
  {
    const deck=new THREE.Mesh(new THREE.BoxGeometry(D.x1-D.x0,D.th,D.z1-D.z0,3,1,4),bmat(U.soffit));
    deck.position.set((D.x0+D.x1)/2,D.top-D.th/2,(D.z0+D.z1)/2);scene.add(deck);
    for(const px of[R.x0-0.06-P.t/2,R.x1+0.06+P.t/2]){
      const w=new THREE.Mesh(new THREE.BoxGeometry(P.t,P.h+0.1,D.z1-D.z0,1,1,4),deckM);
      w.position.set(px,D.top+P.h/2-0.05,(D.z0+D.z1)/2);scene.add(w);   // foot sunk 0.1 into the deck
    }
  }

  // 4. THE TWO OPEN MOUTHS at the berm faces, now down at floor level: solid
  // jambs the full width of the trench shoulder, a shallow segmental voussoir
  // ring over the 9 m opening (clear head U.h above the floor at the crown) and
  // the spandrel above it closed up to the soffit — so no daylight slot.
  {
    const dx=1.4,pw=1.55,rise=0.55,ring=0.2,ncol=26;
    const headY=U.floorY+U.h;
    for(const px of[U.portalW[0],U.portalE[0]]){
      // 124: THROAT COLLAR — a dark header band just inside each mouth. From
      // approach distance the through-view under the arc is the SUNLIT far
      // ramp, so the opening read pale-on-pale (worst from the west, where
      // toon sun washes the whole face cream); this band makes the mouth's
      // upper reveal read as shadow — the Belmont-portal dark-recess cue —
      // while the tunnel stays open and lit below it.
      { const s2=px<7?1:-1;
        const hb=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.96,U.w),throatM);
        hb.position.set(px+s2*0.85,0.03,z);scene.add(hb);     // y -0.45 .. 0.51, under the soffit line — tall enough to read from 30-40 m over the approach lip
        // warm jamb lanterns flanking the mouth, HALF-EMBEDDED in the headwall
        // face so they read as wall-mounted globes (the Belmont flank-lamp
        // cue): two glowing dots marking the opening at distance. x sits 0.1
        // inside the headwall face plane (face = px - s2*0.755) — a first cut
        // at px-s2*0.35 buried them wholly INSIDE the shoulder box.
        const jg=new THREE.SphereGeometry(0.2,10,8);
        for(const t of[-1,1]){
          const jl=new THREE.Mesh(jg,lampM);
          jl.position.set(px-s2*0.86,0.32,z+t*(U.w/2+0.55));scene.add(jl);
        } }
      for(const s of[-1,1]){
        const post=new THREE.Mesh(new THREE.BoxGeometry(dx,SOF-U.floorY,pw),wallM);
        post.position.set(px,(U.floorY+SOF)/2,z+s*(hw+pw/2));scene.add(post);
      }
      for(let i=0;i<ncol;i++){
        const za=-hw+2*hw*i/ncol,zb=-hw+2*hw*(i+1)/ncol,zm=(za+zb)/2,w=zb-za+0.02;
        const yi=headY-rise*(zm/hw)*(zm/hw);            // parabolic intrados
        const rt=Math.min(yi+ring,SOF);
        const v=new THREE.Mesh(new THREE.BoxGeometry(dx,rt-yi,w),voussoirM);
        v.position.set(px,(yi+rt)/2,z+zm);scene.add(v);
        if(SOF-rt>0.01){
          const sp=new THREE.Mesh(new THREE.BoxGeometry(dx,SOF-rt,w),wallM);
          sp.position.set(px,(rt+SOF)/2,z+zm);scene.add(sp);
        }
      }
    }
  }

  // 5. LANTERNS — warm self-lit glows along the tunnel walls so the crossing
  // reads LIT, not a black hole. One shared material => one merged draw.
  {
    const lg=new THREE.SphereGeometry(0.26,10,8);
    for(const lx of[2.6,7.0,11.4])for(const s of[-1,1]){
      const l=new THREE.Mesh(lg,lampM);l.position.set(lx,0,z+s*5.8);scene.add(l);
    }
  }

  // 6. PORTAL PRESENCE AT APPROACH DISTANCE (124, issue 037). The 120 mouth is
  // entirely below grade (crown y +0.3), so from the walk the crossing read as
  // blank slabs — "neither side of the fullerton underpass looks like there's
  // an underpass there". Above-grade furniture in the Belmont/Addison portal
  // idiom now marks BOTH faces: a stone HEADWALL over the mouth (shoulders
  // closing the berm-gap corner slots + a lintel + pale coping), a PYLON with
  // a lantern globe at each corner (the 30-40 m cue), and height-tapered WING
  // WALLS canting outward along the open ramps — the funnel that aims the eye
  // into the mouth. All plain meshes on the cached toon colours already in the
  // merge pool (+0 buckets; lampM shared with section 5). Footings stand on
  // the blocked rim lip (rimLip 2.6) or over the trench walls — no colliders
  // (the anti-trap law).
  {
    const lg=new THREE.SphereGeometry(0.26,10,8);
    const mzN=z-U.w/2,mzS=z+U.w/2;                 // mouth clear span (656.5 / 665.5)
    for(const s of[-1,1]){                          // s -1 = west face, +1 = east
      const face=s<0?D.x0:D.x1;
      const hx=face+s*0.28;                         // headwall centre, 0.55 thick, proud of the fascia
      const shoulder=(za,zb)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(0.55,2.12,zb-za),wallM);
        m.position.set(hx,0.26,(za+zb)/2);scene.add(m);};       // y -0.80 .. 1.32 (seals the corner slot down past grade)
      shoulder(U.z0-2.3,mzN);shoulder(mzS,U.z1+2.3);
      const lin=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.84,mzS-mzN),wallM);
      lin.position.set(hx,0.90,z);scene.add(lin);               // lintel y 0.48 .. 1.32 — overlaps the spandrels (no daylight slot) but spares the voussoir crown (top ~0.5)
      const cope=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.24,(U.z1-U.z0)+4.9),voussoirM);
      cope.position.set(hx,1.44,z);scene.add(cope);             // pale coping band y 1.32 .. 1.56 — the light cap line that reads at distance
      for(const t of[-1,1]){
        // corner pylon + cap + lantern globe
        const px=face+s*0.95,pz=zc+t*7.8;
        const py=new THREE.Mesh(new THREE.BoxGeometry(1.5,3.15,1.5),wallM);
        py.position.set(px,0.775,pz);scene.add(py);             // y -0.80 .. 2.35
        const cap=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.35,1.8),voussoirM);
        cap.position.set(px,2.52,pz);scene.add(cap);            // y 2.35 .. 2.70
        const l=new THREE.Mesh(lg,lampM);l.position.set(px,3.02,pz);scene.add(l);
        // wing wall — 4 segments stepping DOWN (top 1.15 -> 0.25) and canting
        // ~0.95 m OUTWARD from the trench line as they run along the open ramp
        const wx0=face+s*1.7,Lr=6.6,segN=4;
        for(let i=0;i<segN;i++){
          const u0=i/segN,u1=(i+1)/segN,um=(u0+u1)/2;
          const ax=wx0+s*Lr*u0,az=zc+t*(6.35+0.95*u0);
          const bx=wx0+s*Lr*u1,bz=zc+t*(6.35+0.95*u1);
          const top=1.15-0.9*um,len=Math.hypot(bx-ax,bz-az)+0.06;
          const m=new THREE.Mesh(new THREE.BoxGeometry(len,top+0.5,0.5),wallM);
          m.position.set((ax+bx)/2,(top-0.5)/2,(az+bz)/2);
          m.rotation.y=-Math.atan2(bz-az,bx-ax);
          scene.add(m);
        }
      }
    }
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
  const Z=CH.ZOO,LH=Z.lionHouse,GE=Z.gates.east,GW=Z.gates.west,GS=Z.gates.south,GN=Z.gates.north,P=Z.pool,Y=Z.yard;

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

  // (2b) NORTH / CONSERVATORY GATE — THE GARDEN GATE (task 125, owner playtest
  // 2026-07-26 "add an entrance to the zoo from the conservatory side"). Same
  // vocabulary as the east front door (brick piers + limestone caps + flattened
  // torus arch + chord bar + lettering band + swung-back leaves + paver pad) with
  // TWO structural differences: it spans world X (not z) and it FACES NORTH (-z,
  // toward the garden the player arrives from); and it is deliberately SHORTER
  // (GN.pierH 3.0 vs 3.4) so Cannon Dr stays the hero front door. Welcoming, never
  // controlled — NO booth, NO turnstile, no bollards, no second directory board.
  // Everything reads out of Z.gates.north; zero rng.
  {
    const gcx=(GN.x0+GN.x1)/2, span=GN.x1-GN.x0;          // -70 (the garden axis), 8 m gap
    const capW=GN.pierW*1.278, capTop=GN.pierH+0.18;      // caps in the east gate's proportion (1.15/0.9)
    for(const px of[GN.x0,GN.x1]){
      box(gBrick,GN.pierW,GN.pierH,GN.pierW,px,GN.pierH/2,GN.z,0);
      box(gTrim,capW,0.18,capW,px,GN.pierH+0.09,GN.z,0);
    }
    {  // iron ARCH between the pier tops. The east gate rotateY(PI/2)s its torus so
       // the arc spans world z; THIS arc must span world X, which is the torus's
       // NATIVE plane — so NO rotateY, and the tube's +-0.13 already falls in z as
       // the arch's depth. Crown scaled to the 3.0 piers: 3.90 (east is 4.5).
      const R=span/2,flat=0.35;
      const yc=capTop-0.045-R*flat*Math.cos(1.1);         // arc ends tuck 0.045 into the caps (the east gate's fit)
      const a=new THREE.TorusGeometry(R,0.13,6,20,2.2);
      a.rotateZ(Math.PI/2-1.1);                           // centre the 2.2-rad arc at the top
      a.scale(1,flat,1);                                  // flatten shallow
      a.translate(gcx,yc,GN.z);                           // crown yc + R*flat = 3.90
      gIron.push(a);
    }
    box(gIron,span-0.8,0.18,0.1,gcx,capTop+0.04,GN.z,0);  // chord bar tying the piers (the sign band hangs on it)
    {  // 'LINCOLN PARK ZOO / · ALWAYS FREE ·' band, lettered BOTH ways — a real
       // park gate greets you leaving as well as arriving, and the campus-side
       // look-back is the money framing (gate + the conservatory glasshouse).
       // BACK-TO-BACK FrontSide pair (village.js twoSided law) sandwiching the
       // SOLID gBack backing box: never a DoubleSide plane, which would show the
       // lettering MIRRORED from behind (PITFALLS 010/032). Both faces share ONE
       // canvas texture AND one merged geometry -> the pair is a single mesh.
      const cv=document.createElement('canvas');cv.width=1024;cv.height=192;const g=cv.getContext('2d');
      g.fillStyle='#2c2f2b';g.fillRect(0,0,1024,192);
      g.textAlign='center';g.textBaseline='middle';
      g.fillStyle='#f0e8d2';fit(g,GN.sign,940,92,'800');g.fillText(GN.sign,512,76);
      const reg='· '+GN.register+' ·';
      g.fillStyle='#e5c56a';fit(g,reg,700,40,'700');g.fillText(reg,512,156);
      const tex=new THREE.CanvasTexture(cv);tex.anisotropy=4;
      const bw=span-2.0,by=capTop+0.73;                   // 6.0 m band, spanned to THIS gap; bottom edge sits on the chord
      box(gBack,bw+0.2,1.22,0.08,gcx,by,GN.z+0.06,0);     // solid backing (faces z 740.33/740.41), tucked just SOUTH of the fence line
      const pgN=new THREE.PlaneGeometry(bw,1.12);pgN.rotateY(Math.PI);pgN.translate(gcx,by,GN.z-0.02);  // faces -z: the GARDEN / conservatory side
      const pgS=new THREE.PlaneGeometry(bw,1.12);pgS.translate(gcx,by,GN.z+0.14);                       // faces +z: the CAMPUS side (native plane normal, so upright, not mirrored)
      scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([pgN,pgS]),
        curveMat(new THREE.MeshBasicMaterial({map:tex,side:THREE.FrontSide}))));   // world-coord geometry, one mesh, one draw
    }
    // OPEN leaves swung fully back against the piers — folded TIGHT E/W along the
    // fence, angled the east gate's 0.35 rad into the campus (+z). Tips land at
    // x -76.0 / -64.0, so they clear ZOO.northWalk (x -70 +- 1.2) by >2.2 m; the
    // east gate's tips-on-the-pavers bug cannot repeat here.
    leaf(GN.x0+0.6,GN.z+0.4,0.35-Math.PI/2,2.8,1.5);
    leaf(GN.x1-0.6,GN.z+0.4,Math.PI/2-0.35,2.8,1.5);
    {  // brick paver PAD under the gate (GN.pad rect) — top y 0.081, over both the
       // 0.074 limestone walk running through it and the 0.066 garden gravel.
      const pd=GN.pad;
      const m=new THREE.Mesh(new THREE.BoxGeometry(pd.x1-pd.x0,0.05,pd.z1-pd.z0),toon(Z.loopStyle.color));
      m.position.set((pd.x0+pd.x1)/2,0.056,(pd.z0+pd.z1)/2);scene.add(m);
    }
  }

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

// ---- LINCOLN PARK ZOO habitats + Farm-in-the-Zoo (task 115) ----------------
// Four open DIORAMAS lining the north habitat walk (snow-monkey knoll, penguin
// cove, polar tundra, flamingo lagoon) + the Farm-in-the-Zoo yard (the red
// GAMBREL barn / yellow farmhouse / windmill tower / split-rail paddock).
// EVERY placement from CH.ZOO.habitats / CH.ZOO.farmyard or a literal below —
// zero rng, NO colliders (walkability is data-carved in zooBlockedHit), rails
// tail-append POSTS/RAILS via fenceRun collide:false. Same fold discipline as
// buildZoo: per-material world-coord accumulators -> ONE merged mesh each;
// water = bmat (self-lit — toon bands weirdly on water, the 044 law). The
// animal cast + the spinning windmill wheel come from packs/zoo-habitats.js —
// the flat ledge/shelf/terrace tops + the mill head's +x side stay CLEAR.
function buildZooHabitats(POSTS,RAILS){
  const HB=CH.ZOO.habitats,FY=CH.ZOO.farmyard;
  const MQ=HB.macaque,PG=HB.penguin,PL=HB.polar,FL=HB.flamingo,B=FY.barn,FH=FY.farmhouse,WM=FY.windmill;

  // -- per-material accumulators (merged + scene.add'd at the end) -----------
  const gGrey=[],gGrey2=[],gPale=[],gPale2=[],gDirt=[],gBank=[],
        gRed=[],gTrimW=[],gRoofG=[],gDoor=[],gClap=[],gFhRoof=[],gFhTrim=[],
        gStraw=[],gLeafA=[],gLeafB=[],gGlow=[],gWaterA=[],gWaterT=[],gWaterF=[],
        gBack=[],gPost=[];
  const box=(arr,w,h,d,x,y,z,ry)=>{const g=new THREE.BoxGeometry(w,h,d);if(ry)g.rotateY(ry);g.translate(x,y,z);arr.push(g);};
  const emit=(geos,mat)=>{if(!geos.length)return;
    scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(geos.map(g=>g.index?g.toNonIndexed():g)),mat));};
  const fit=(g,t,mw,fs,w)=>{g.font=`${w} ${fs}px "Trebuchet MS",sans-serif`;
    while(g.measureText(t).width>mw&&fs>10){fs-=2;g.font=`${w} ${fs}px "Trebuchet MS",sans-serif`;}};
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
  // the habitat name plate (the lion-plate shape): bold title / italic sub
  const plate=(S,title,sub)=>sign(S.x,S.z,S.ry,1.35,0.6,1.25,0.05,512,224,g=>{
    g.fillStyle='#efe6cd';g.fillRect(0,0,512,224);
    g.textAlign='center';g.textBaseline='middle';
    g.fillStyle='#3a2f24';fit(g,title,460,64,'800');g.fillText(title,256,82);
    g.fillStyle='#6b5c48';fit(g,sub,470,28,'italic 700');g.fillText(sub,256,168);
  });
  const disc=(arr,r,seg,x,y,z,sx,sz)=>{const g=new THREE.CircleGeometry(r,seg);if(sx)g.scale(sx,sz,1);g.rotateX(-Math.PI/2);g.translate(x,y,z);arr.push(g);};
  const gnd=(arr,w,d,x,y,z)=>{const g=new THREE.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);g.translate(x,y,z);arr.push(g);};
  // sloped roof panel: profile line (z0,y0)->(z1,y1) (offsets off cx/cz), a
  // box sw wide (x) x th thick, extended e0 past the start / e1 past the end,
  // lifted noff (default th/2) along the outward normal so the panel SITS ON
  // the profile edge instead of bisecting it
  const slope=(arr,cx,cz,sw,th,z0,y0,z1,y1,e0,e1,noff)=>{
    const dz=z1-z0,dy=y1-y0,L=Math.hypot(dz,dy),uz=dz/L,uy=dy/L;
    const k=uz>=0?1:-1,nz=-uy*k,ny=uz*k,no=noff!=null?noff:th/2,off=(e1-e0)/2;
    const g=new THREE.BoxGeometry(sw,th,L+e0+e1);
    g.rotateX(-Math.atan2(dy,dz));
    g.translate(cx,(y0+y1)/2+off*uy+ny*no,cz+(z0+z1)/2+off*uz+nz*no);
    arr.push(g);
  };

  // (1) SNOW-MONKEY KNOLL — stacked-slab rockwork mound (the SLABS grotto
  // recipe, smaller), the stack biased NE so the spring pool reads at the SW
  // base; the SOUTH mid-ledge stays flat + clear (the pack seats a grooming
  // pair there)
  const MSLAB=[  // [w,h,d, ox,cy,oz, ry, alt] off the mound centre
    [3.4,.5,2.6,  .4,.25,.5,  .15,0],[2.9,.45,2.2, .6,.68,.2, -.25,1],
    [2.4,.4,1.9,  .2,1.03,.6, .4, 0],[1.9,.38,1.5, .5,1.32,.3, -.2,1],
    [1.3,.32,1.05,.35,1.5,.45,.55,0],                          // top ~1.66
    [2.0,.38,1.5,-1.1,.19,1.2,.6,1],[1.7,.35,1.3,1.5,.18,-.7,-.5,0],  // base spread
    [2.3,.4,1.6,   0,.6,1.5,  .08,0],                          // the SOUTH ledge — flat top y .8
  ];
  for(const[w,h,d,ox,cy,oz,ry,alt]of MSLAB)box(alt?gGrey2:gGrey,w,h,d,MQ.x+ox,cy,MQ.z+oz,ry);
  disc(gWaterA,MQ.pool.r,20,MQ.pool.x,0.14,MQ.pool.z);         // the steaming spring pool
  box(gGrey2,0.8,0.32,0.55,-51.9,0.16,794.4,.5);               // two low rocks at the pool lip
  box(gGrey,0.65,0.26,0.5,-50.1,0.13,793.6,-.4);
  {  // viewing rail — one closed 14-segment circle at railR (first pt repeated)
    const pts=[];
    for(let i=0;i<=14;i++){const a=i/14*Math.PI*2;pts.push([MQ.x+Math.cos(a)*MQ.railR,MQ.z+Math.sin(a)*MQ.railR]);}
    fenceRun(pts,{spacing:1.8,postH:0.85,color:0x3a3f3a,collide:false},POSTS,RAILS);
  }
  plate(MQ.sign,MQ.plate,MQ.sub);

  // (2) PENGUIN COVE — PALE rockwork bowl: rim slabs N/W/E, the flat huddle
  // SHELF at the south viewing edge, stepped slabs down to the water wedge
  gnd(gPale,PG.x1-PG.x0,PG.z1-PG.z0,(PG.x0+PG.x1)/2,0.024,(PG.z0+PG.z1)/2);   // pale floor kills the grass inside the bowl
  const PRIM=[  // rim slabs [x,z, w,d, h, ry, alt]
    [-67.6,776.2,2.4,1.3,.9, .12,0],[-65.2,775.9,2.2,1.2,.7,-.08,1],
    [-62.9,776.1,2.5,1.3,.95,.06,0],[-60.4,775.9,2.2,1.2,.75,-.1,1],[-58.2,776.3,2.0,1.3,.85,.15,0],  // north rim
    [-68.1,777.9,1.3,2.3,.8,-.06,1],[-68.0,780.2,1.2,2.2,.95,.08,0],
    [-68.1,782.5,1.3,2.3,.7,-.1,1],[-68.0,784.8,1.2,2.2,.85,.07,0],   // west rim
    [-57.9,777.9,1.3,2.3,.85,.09,0],[-58.0,780.2,1.2,2.2,.7,-.07,1],
    [-57.9,782.5,1.3,2.3,.9,.1,0],[-58.0,784.7,1.2,2.2,.75,-.06,1],   // east rim
    [-67.9,785.4,1.4,1.2,.6,.1,0],[-58.1,785.3,1.3,1.1,.55,-.08,1],   // south corners
  ];
  for(const[x,z,w,d,h,ry,alt]of PRIM)box(alt?gPale2:gPale,w,h,d,x,h/2,z,ry);
  box(gPale,4.8,PG.shelfY,2.8,-63,PG.shelfY/2,784.3,0);        // the huddle SHELF — flat top y .5 at the viewing edge
  box(gPale2,3.6,0.4,1.4,-63.4,0.2,782.5,.04);                 // steps down to the water
  box(gPale,2.6,0.3,1.2,-64.6,0.15,781.6,-.06);
  {const W=PG.water;box(gWaterT,W.x1-W.x0,0.26,W.z1-W.z0,(W.x0+W.x1)/2,W.y-0.13,(W.z0+W.z1)/2,0);}  // wedge top y .28
  box(gPale,1.1,0.5,0.8,-64.9,0.25,779.4,.4);                  // two pale slabs poke from the water
  box(gPale2,0.9,0.44,0.7,-62.3,0.22,780.6,-.5);
  fenceRun(PG.rail,{spacing:2.2,postH:0.9,color:0x3a3f3a,collide:false},POSTS,RAILS);
  plate(PG.sign,PG.plate,PG.sub);

  // (3) POLAR TUNDRA — dirt ground, the two-course stacked back wall W+N
  // (grey stacked-rockwork ref), scattered boulders, the plunge pool + its
  // north rim arc, the low terrace the bear stands by
  gnd(gDirt,PL.x1-PL.x0,PL.z1-PL.z0,(PL.x0+PL.x1)/2,0.025,(PL.z0+PL.z1)/2);
  const PWALL=[  // [x,z, w,d, h,cy, ry, alt] — course 1 low, course 2 bond-offset on top
    [-88.5,779.9,1.5,3.6,1.25,.625,-.05,0],[-88.6,783.5,1.5,3.6,1.15,.575,.04,1],
    [-88.5,787.1,1.5,3.6,1.25,.625,-.04,0],[-88.6,790.7,1.5,3.6,1.2,.6,.05,1],   // west course 1
    [-88.4,781.7,1.35,3.4,1.0,1.7,.03,1],[-88.5,785.3,1.35,3.4,.95,1.65,-.04,0],
    [-88.4,788.9,1.35,3.4,1.0,1.7,.05,1],[-88.5,791.6,1.35,1.8,.9,1.6,-.03,0],   // west course 2 — top ~2.2
    [-86.9,778.7,3.6,1.5,1.2,.6,.04,1],[-83.3,778.6,3.6,1.5,1.25,.625,-.05,0],
    [-79.7,778.7,3.6,1.5,1.15,.575,.05,1],[-76.1,778.6,3.6,1.5,1.25,.625,-.04,0], // north course 1
    [-85.1,778.8,3.4,1.35,1.0,1.65,-.04,0],[-81.5,778.7,3.4,1.35,.95,1.7,.04,1],
    [-77.9,778.8,3.4,1.35,1.0,1.65,-.05,0],                                       // north course 2
  ];
  for(const[x,z,w,d,h,cy,ry,alt]of PWALL)box(alt?gGrey:gPale2,w,h,d,x,cy,z,ry);
  box(gPale2,1.1,0.7,0.9,-84,0.35,786,.5);box(gGrey,0.9,0.55,0.75,-79.5,0.27,782,-.4);   // boulders
  box(gPale2,0.7,0.45,0.6,-76.5,0.22,786.5,.8);box(gGrey,0.8,0.5,0.65,-86,0.25,790.5,-.6);
  box(gPale2,0.6,0.4,0.5,-81.5,0.2,791,.3);
  disc(gWaterT,PL.pool.r,20,PL.pool.x,PL.pool.y,PL.pool.z);    // the plunge pool
  box(gGrey,1.1,0.5,0.75,-80.83,0.25,787.45,.98);              // low rock rim arc on the pool's north
  box(gPale2,1.0,0.42,0.7,-79.54,0.21,786.42,.38);
  box(gGrey,1.1,0.48,0.75,-77.89,0.24,786.46,-.22);
  box(gPale2,1.0,0.44,0.7,-76.6,0.22,787.23,-.82);
  box(gPale2,3.2,0.45,2.2,-80.5,0.225,784.5,.06);              // the low terrace — flat top y .45, the bear stands by it
  fenceRun(PL.rail,{spacing:2.2,postH:0.95,color:0x3a3f3a,collide:false},POSTS,RAILS);
  plate(PL.sign,PL.plate,PL.sub);

  // (4) FLAMINGO LAGOON — mud bank + the kidney of algae-green water (two
  // squashed discs, the B disc 4 mm up — same-colour lap, no fight) + reeds
  // on the south + east margins
  gnd(gBank,FL.x1-FL.x0,FL.z1-FL.z0,(FL.x0+FL.x1)/2,0.02,(FL.z0+FL.z1)/2);
  disc(gWaterF,1,24,-30,FL.waterY,861.5,4.2,3.2);
  disc(gWaterF,1,24,-26.6,FL.waterY+0.004,863.8,3.9,3.3);
  const REED=[  // [x,z, r, alt] squashed-sphere clumps
    [-24.3,866.4,.45,0],[-23.9,866.15,.34,1],[-22.9,864.0,.42,1],[-23.25,863.7,.3,0],
    [-23.4,861.0,.4,0],[-23.1,860.6,.3,1],[-26.1,867.2,.44,1],[-26.5,866.9,.32,0],
    [-29.6,866.9,.46,0],[-30.0,866.6,.33,1],[-32.4,865.6,.4,1],[-32.7,865.25,.3,0],
    [-23.1,858.6,.38,0],[-22.85,858.3,.28,1],
  ];
  for(const[x,z,r,alt]of REED){const g=new THREE.SphereGeometry(r,8,6);g.scale(1,.7,1);g.translate(x,r*.55,z);(alt?gLeafB:gLeafA).push(g);}
  fenceRun(FL.rail,{spacing:2.2,postH:0.9,color:0x3a3f3a,collide:false},POSTS,RAILS);
  plate(FL.sign,FL.plate,FL.sub);

  // (5a) THE GAMBREL BARN — pentagon gable ends E/W (ExtrudeGeometry), red
  // side walls to the eave, 4 grey slope panels with eave + rake overhang,
  // white corner/rake/fascia trim; the EAST gable is the postcard face down
  // the farm lane: sliding X-brace door + hayloft door under the peak
  const hw=B.w/2,hd=B.d/2,bw=2.6;   // bw = the gambrel break half-width
  const gam=()=>{const s=new THREE.Shape();
    s.moveTo(-hd,0);s.lineTo(hd,0);s.lineTo(hd,B.eaveH);s.lineTo(bw,B.breakH);s.lineTo(0,B.ridgeH);
    s.lineTo(-bw,B.breakH);s.lineTo(-hd,B.eaveH);s.closePath();
    return new THREE.ExtrudeGeometry(s,{depth:0.3,bevelEnabled:false});};
  {const e=gam();e.rotateY(Math.PI/2);e.translate(B.x+hw-0.3,0,B.z);gRed.push(e);}
  {const w=gam();w.rotateY(-Math.PI/2);w.translate(B.x-hw+0.3,0,B.z);gRed.push(w);}
  for(const sz of[-1,1])box(gRed,B.w-0.6,B.eaveH,0.35,B.x,B.eaveH/2,B.z+sz*(hd-0.175),0);   // N/S side walls butt the ends
  slope(gRoofG,B.x,B.z,B.w+0.7,0.18,-hd,B.eaveH,-bw,B.breakH,0.35,0.05);   // N lower slope
  slope(gRoofG,B.x,B.z,B.w+0.7,0.18,-bw,B.breakH,0,B.ridgeH,0.2,0.12);     // N upper (crosses the ridge — reads as the ridge line)
  slope(gRoofG,B.x,B.z,B.w+0.7,0.18, hd,B.eaveH, bw,B.breakH,0.35,0.05);   // S lower
  slope(gRoofG,B.x,B.z,B.w+0.7,0.18, bw,B.breakH,0,B.ridgeH,0.2,0.12);     // S upper
  for(const sx of[-1,1])for(const sz of[-1,1])box(gTrimW,0.24,B.eaveH,0.24,B.x+sx*hw,B.eaveH/2,B.z+sz*hd,0);  // corner boards
  for(const sz of[-1,1])box(gTrimW,B.w-0.4,0.18,0.1,B.x,B.eaveH-0.08,B.z+sz*(hd+0.03),0);   // eave fascia
  const rkx=B.x+hw+0.1;   // rake boards proud of the EAST gable face
  slope(gTrimW,rkx,B.z,0.12,0.16,-hd,B.eaveH,-bw,B.breakH,0.05,0.05,-0.06);
  slope(gTrimW,rkx,B.z,0.12,0.16,-bw,B.breakH,0,B.ridgeH,0.05,0.05,-0.06);
  slope(gTrimW,rkx,B.z,0.12,0.16, hd,B.eaveH, bw,B.breakH,0.05,0.05,-0.06);
  slope(gTrimW,rkx,B.z,0.12,0.16, bw,B.breakH,0,B.ridgeH,0.05,0.05,-0.06);
  box(gDoor,0.14,3.0,2.8,B.x+hw+0.05,1.5,B.z,0);               // the big sliding door, slightly proud
  for(const sz of[-1,1])box(gTrimW,0.1,3.15,0.16,B.x+hw+0.08,1.575,B.z+sz*1.48,0);   // white frame
  box(gTrimW,0.1,0.16,3.12,B.x+hw+0.08,3.1,B.z,0);
  for(const sgn of[1,-1]){const g=new THREE.BoxGeometry(0.05,0.12,3.8);g.rotateX(sgn*0.82);g.translate(B.x+hw+0.14,1.5,B.z);gTrimW.push(g);}  // the X-brace
  box(gDoor,0.1,1.5,1.3,B.x+hw+0.04,4.9,B.z,0);                // hayloft door under the peak
  for(const sz of[-1,1])box(gTrimW,0.08,1.66,0.12,B.x+hw+0.06,4.9,B.z+sz*0.71,0);
  for(const sy of[-1,1])box(gTrimW,0.08,0.12,1.54,B.x+hw+0.06,4.9+sy*0.81,B.z,0);
  for(const sz of[-1,1]){  // one small white-framed glow window each, N + S walls
    const p=new THREE.PlaneGeometry(0.9,0.9);if(sz<0)p.rotateY(Math.PI);
    p.translate(B.x,2.1,B.z+sz*(hd+0.06));gGlow.push(p);
    for(const sx of[-1,1])box(gTrimW,0.1,1.14,0.08,B.x+sx*0.52,2.1,B.z+sz*(hd+0.03),0);
    for(const sy of[-1,1])box(gTrimW,1.14,0.1,0.08,B.x,2.1+sy*0.52,B.z+sz*(hd+0.03),0);
  }

  // (5b) FARMHOUSE — yellow clapboard + gable roof, white door/window trim on
  // the SOUTH (farm-facing) face, a small stone stoop
  const fhw=FH.w/2,fhd=FH.d/2,fz=FH.z+fhd;
  box(gClap,FH.w,FH.wallH,FH.d,FH.x,FH.wallH/2,FH.z,0);
  const tri=()=>{const s=new THREE.Shape();
    s.moveTo(-fhd,FH.wallH);s.lineTo(fhd,FH.wallH);s.lineTo(0,FH.wallH+FH.roofH);s.closePath();
    return new THREE.ExtrudeGeometry(s,{depth:0.3,bevelEnabled:false});};
  {const e=tri();e.rotateY(Math.PI/2);e.translate(FH.x+fhw-0.3,0,FH.z);gClap.push(e);}
  {const w=tri();w.rotateY(-Math.PI/2);w.translate(FH.x-fhw+0.3,0,FH.z);gClap.push(w);}
  slope(gFhRoof,FH.x,FH.z,FH.w+0.7,0.16,-fhd,FH.wallH,0,FH.wallH+FH.roofH,0.4,0.12);
  slope(gFhRoof,FH.x,FH.z,FH.w+0.7,0.16, fhd,FH.wallH,0,FH.wallH+FH.roofH,0.4,0.12);
  box(gDoor,1.0,2.0,0.12,FH.x,1.0,fz+0.02,0);                  // door + white frame
  for(const sx of[-1,1])box(gFhTrim,0.1,2.15,0.1,FH.x+sx*0.6,1.075,fz+0.03,0);
  box(gFhTrim,1.3,0.1,0.1,FH.x,2.12,fz+0.03,0);
  for(const ox of[-2,2]){                                      // two glow windows + frames
    const p=new THREE.PlaneGeometry(0.7,0.9);p.translate(FH.x+ox,1.8,fz+0.05);gGlow.push(p);
    for(const sx of[-1,1])box(gFhTrim,0.08,1.06,0.08,FH.x+ox+sx*0.41,1.8,fz+0.02,0);
    for(const sy of[-1,1])box(gFhTrim,0.86,0.08,0.08,FH.x+ox,1.8+sy*0.49,fz+0.02,0);
  }
  box(gPale2,1.5,0.18,0.8,FH.x,0.09,fz+0.45,0);                // stoop slab

  // (5c) WINDMILL TOWER — 4 leaning legs, 3 brace rings, top platform, the
  // west tail vane. NO wheel: the pack spins it at head height on the +x side
  const tilt=0.061;   // lean: base half 0.7 -> top half 0.175 over h 8.5
  for(const sx of[-1,1])for(const sz of[-1,1]){
    const g=new THREE.BoxGeometry(0.1,8.6,0.1);g.translate(0,4.3,0);
    g.rotateX(-tilt*sz);g.rotateZ(tilt*sx);
    g.translate(WM.x+sx*0.7,0,WM.z+sz*0.7);gRoofG.push(g);
  }
  for(const[y,bh]of[[2.2,0.564],[4.4,0.428],[6.6,0.292]])      // cross-brace rings
    for(const s of[-1,1]){
      box(gRoofG,bh*2+0.12,0.07,0.07,WM.x,y,WM.z+s*bh,0);
      box(gRoofG,0.07,0.07,bh*2+0.12,WM.x+s*bh,y,WM.z,0);
    }
  box(gRoofG,1.0,0.14,1.0,WM.x,8.55,WM.z,0);                   // top platform
  box(gRoofG,0.7,0.08,0.08,WM.x-0.45,8.5,WM.z,0);              // tail boom -x
  box(gRoofG,1.3,0.55,0.06,WM.x-1.15,8.5,WM.z,0);              // the VANE plate, pointing west

  // (5d) PADDOCK — split-rail runs (the east gap = the open gate), flattened
  // straw discs + the dark water trough by the gate
  for(const run of FY.paddock.runs)
    fenceRun(run,{spacing:FY.paddock.spacing,postH:FY.paddock.postH,color:FY.paddock.color,collide:false},POSTS,RAILS);
  for(const[x,z,r]of[[-85.2,977.8,1.8],[-79.3,976.4,1.3],[-87.1,990.5,2.0],[-80.2,993.2,1.5],[-76.1,984.6,1.2]])
    disc(gStraw,r,12,x,0.015,z);
  box(gDoor,1.4,0.5,0.7,-73.5,0.25,984,0.2);                   // trough by the gate

  // (5e) FARM SIGN — the folk directory board (ref Lincoln_Park_Farm_Zoo.jpg):
  // bold header + tag + a painted red-barn glyph over a green ground stripe
  const FS=FY.sign;
  sign(FS.x,FS.z,FS.ry,1.7,1.2,1.5,0.06,512,384,g=>{
    g.fillStyle='#efe6cd';g.fillRect(0,0,512,384);
    g.fillStyle='#7fae6b';g.fillRect(0,292,512,92);            // green ground stripe
    g.textAlign='center';g.textBaseline='middle';
    g.fillStyle='#2d3a2c';fit(g,FS.title,460,54,'800');g.fillText(FS.title,256,52);
    g.fillStyle='#5a5142';fit(g,FS.sub,440,30,'italic 700');g.fillText(FS.sub,256,102);
    g.fillStyle='#b3402e';
    g.fillRect(196,228,120,78);                                // barn body
    g.beginPath();g.moveTo(186,230);g.lineTo(206,184);g.lineTo(256,164);g.lineTo(306,184);g.lineTo(326,230);g.closePath();g.fill();  // pentagon gambrel roof
    g.fillStyle='#f0ece0';g.fillRect(244,258,24,48);           // door
  });

  // -- emit: ONE merged mesh per material --------------------------------
  emit(gGrey,toon(MQ.rock));   emit(gGrey2,toon(MQ.rock2));
  emit(gPale,toon(PG.rock));   emit(gPale2,toon(PG.rock2));
  emit(gDirt,toon(PL.dirt));   emit(gBank,toon(FL.bank));
  emit(gRed,toon(B.red));      emit(gTrimW,toon(B.trim));   emit(gRoofG,toon(B.roof));
  emit(gDoor,toon(B.door));    emit(gClap,toon(FH.clap));   emit(gFhRoof,toon(FH.roof));
  emit(gFhTrim,toon(FH.trim)); emit(gStraw,toon(FY.paddock.straw));
  emit(gLeafA,toon(0x5aa64f)); emit(gLeafB,toon(0x74bd63));
  emit(gGlow,bmat(0xffe2ae));
  emit(gWaterA,bmat(MQ.pool.water)); emit(gWaterT,bmat(PG.water.color)); emit(gWaterF,bmat(FL.water));
  emit(gBack,toon(0x2c2620));  emit(gPost,toon(0x6b5c48));
}

// ---- SOUTH POND — CAFÉ BRAUER + the Nature Boardwalk (task 117) -------------
// The pipeline's quiet finale, all in ONE builder so the whole precinct folds
// to one merged mesh per material: the 1908 Prairie refectory on the pond's NW
// shoulder (brick mass, broad GREEN-tile hip, green-glazed frieze band, tall
// arched sage-framed glow windows, a facade clock, twin roof lanterns, two open
// loggia arms embracing the terrace), the Studio-Gang honeycomb PAVILION (a
// curved laminated-timber lattice tunnel-arch you walk under), the boardwalk
// DECK on pilings swept from the same LP_BOARDWALK polyline lpBoardwalkHit uses
// (geometry + walkability can never drift), its dark post-and-cable rails, the
// three interpretive plates and the south-outlet bridge parapet.
// EVERY placement from CH.LP_CAFE_BRAUER / LP_HONEYCOMB / LP_BOARDWALK(+_HALF/
// _STYLE) / LP_POND_BRIDGE / LP_SOUTHPOND — ZERO rng (literal geometry only),
// NO colliders and NO walkRects (walkability is data-carved: lpBoardwalkHit +
// the pond subtraction in lpLandHit — the anti-trap law; the player walks y0
// under the 0.12 deck, the culvert precedent), rails tail-append POSTS/RAILS
// via fenceRun collide:false so every earlier instance index is unchanged.
// ZERO new InstancedMesh buckets; glow/glass = self-lit bmat (the 044 law).
function buildSouthPond(POSTS,RAILS){
  const B=CH.LP_CAFE_BRAUER,HC=CH.LP_HONEYCOMB,BW=CH.LP_BOARDWALK,
        HALF=CH.LP_BOARDWALK_HALF,ST=CH.LP_BOARDWALK_STYLE,
        BR=CH.LP_POND_BRIDGE,SP=CH.LP_SOUTHPOND;

  // -- per-material accumulators (merged + scene.add'd at the end) -----------
  const gBrick=[],gTrim=[],gBase=[],gRoof=[],gDoor=[],gGlow=[],
        gFrieze=[],gTile=[],gFrame=[],gPave=[],gStone=[],gWood=[],gBack=[];
  const box=(arr,w,h,d,x,y,z,ry)=>{const g=new THREE.BoxGeometry(w,h,d);if(ry)g.rotateY(ry);g.translate(x,y,z);arr.push(g);};
  const emit=(geos,mat)=>{if(!geos.length)return;
    scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(geos.map(g=>g.index?g.toNonIndexed():g)),mat));};
  const fit=(g,t,mw,fs,w)=>{g.font=`${w} ${fs}px "Trebuchet MS",sans-serif`;
    while(g.measureText(t).width>mw&&fs>10){fs-=2;g.font=`${w} ${fs}px "Trebuchet MS",sans-serif`;}};
  // lollipop plate (the zoo vocab): post ENDS at the panel bottom, solid dark
  // backing box, own canvas, FrontSide plate 0.045 proud of the backing face
  const sign=(px,pz,ry,w,h,cy,postR,cw,ch,draw)=>{
    const bot=cy-h/2;
    if(postR>0){const pg=new THREE.CylinderGeometry(postR,postR,bot,8);pg.translate(px,bot/2,pz);gWood.push(pg);}
    box(gBack,w+0.07,h+0.07,0.05,px,cy,pz,ry);
    const cv=document.createElement('canvas');cv.width=cw;cv.height=ch;const g=cv.getContext('2d');
    draw(g);
    const tex=new THREE.CanvasTexture(cv);tex.anisotropy=4;
    const pl=new THREE.Mesh(new THREE.PlaneGeometry(w,h),curveMat(new THREE.MeshBasicMaterial({map:tex,side:THREE.FrontSide})));
    pl.rotation.y=ry;pl.position.set(px+Math.sin(ry)*0.045,cy,pz+Math.cos(ry)*0.045);scene.add(pl);
  };
  // auto-oriented quad -> two triangles in a plain non-indexed attribute soup
  // (the coast.js per-edge-quad pattern; the winding is derived from the wanted
  // normal so mitred ribbons can never flip inside-out)
  const quad=(P,N,U,a,b,c,d,nx,ny,nz)=>{
    const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
    const kx=uy*vz-uz*vy,ky=uz*vx-ux*vz,kz=ux*vy-uy*vx;
    const q=(kx*nx+ky*ny+kz*nz)<0?[a,d,c,b]:[a,b,c,d];
    for(const p of[q[0],q[1],q[2],q[0],q[2],q[3]]){P.push(p[0],p[1],p[2]);N.push(nx,ny,nz);}
    U.push(0,0, 1,0, 1,1, 0,0, 1,1, 0,1);
  };
  const mkGeo=(P,N,U)=>{const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));return g;};

  // =====================================================================
  // (1) CAFÉ BRAUER — the Theater/Lion-House arcade recipe grown to two
  // storeys: long axis N-S (the 24 m E/W faces carry nLong arches), the EAST
  // face fronts the terrace/pond and swaps its centre arch for the entrance
  // bay (solid brick -> doors + the facade clock + the name plaque).
  // =====================================================================
  const cx=B.x,cz=B.z,hx=B.w/2,hz=B.d/2;              // -61, 908, 7, 12
  const wallT=0.5,sill=0.5,ar=B.archW/2,spring=sill+B.archH-ar,pitch=4.2;
  const plY=0.35,roofY=plY+B.wallH,ex=hx+B.eave,ez=hz+B.eave;   // 6.75 / 8.25 / 13.25
  const midL=(B.nLong-1)/2,midS=(B.nShort-1)/2;

  box(gBase,B.w+0.6,0.35,B.d+0.6,cx,0.175,cz,0);      // plinth, +0.3 oversize

  // walls — each face ONE ExtrudeGeometry: outer rect minus arch holes. Long
  // (E/W) walls run full length; the short N/S ends are shortened one wall-T
  // each side so the long walls' end caps finish the corners (Theater law).
  function wallGeo(len,n,skip){
    const s=new THREE.Shape();
    s.moveTo(-len/2,0);s.lineTo(len/2,0);s.lineTo(len/2,B.wallH);s.lineTo(-len/2,B.wallH);s.closePath();
    for(let i=0;i<n;i++){
      if(i===skip)continue;
      const c=(i-(n-1)/2)*pitch,h=new THREE.Path();
      h.moveTo(c-ar,sill);h.lineTo(c+ar,sill);h.lineTo(c+ar,spring);
      h.absarc(c,spring,ar,0,Math.PI,false);h.lineTo(c-ar,sill);
      s.holes.push(h);
    }
    return new THREE.ExtrudeGeometry(s,{depth:wallT,bevelEnabled:false,curveSegments:12});
  }
  {const g=wallGeo(B.d,B.nLong);      g.rotateY( Math.PI/2);g.translate(cx-hx,plY,cz);gBrick.push(g);}   // west (centre arch = service door)
  {const g=wallGeo(B.d,B.nLong,midL); g.rotateY(-Math.PI/2);g.translate(cx+hx,plY,cz);gBrick.push(g);}   // east — centre bay SOLID (entrance + clock)
  {const g=wallGeo(B.w-2*wallT,B.nShort);                   g.translate(cx,plY,cz-hz);gBrick.push(g);}   // north
  {const g=wallGeo(B.w-2*wallT,B.nShort);g.rotateY(Math.PI);g.translate(cx,plY,cz+hz);gBrick.push(g);}   // south

  // glow panes 0.18 inside each opening (bmat, never toon — 044 law) + the
  // sage FRAME set (jambs + centre mullion + transom bar) sitting proud of the
  // face; the two door bays are skipped so the doors read as doors.
  const pane=(w,h,ry,x,y,z)=>{const g=new THREE.PlaneGeometry(w,h);if(ry)g.rotateY(ry);g.translate(x,y,z);gGlow.push(g);};
  const frameAt=(ry,x,y,z)=>{
    const fh=B.archH+0.2,hw=B.archW/2;
    const put=(w,h,d,ox,oy)=>{const g=new THREE.BoxGeometry(w,h,d);g.translate(ox,oy,0);if(ry)g.rotateY(ry);g.translate(x,y,z);gFrame.push(g);};
    put(0.12,fh,0.14,-(hw+0.06),0);put(0.12,fh,0.14,(hw+0.06),0);   // jambs
    put(0.09,fh-0.3,0.12,0,0);                                      // centre mullion
    put(B.archW+0.12,0.10,0.12,0,-0.35);                            // transom bar
  };
  const pw=B.archW+0.15,ph=B.archH+0.15,py=plY+sill+B.archH/2;
  for(let i=0;i<B.nLong;i++){
    const c=(i-midL)*pitch;
    if(i!==midL){pane(pw,ph,-Math.PI/2,cx-(hx-0.18),py,cz+c);frameAt(-Math.PI/2,cx-hx-0.02,py,cz+c);}   // west row
    if(i!==midL){pane(pw,ph, Math.PI/2,cx+(hx-0.18),py,cz+c);frameAt( Math.PI/2,cx+hx+0.02,py,cz+c);}   // east row
  }
  for(let i=0;i<B.nShort;i++){
    const c=(i-midS)*pitch;
    pane(pw,ph,Math.PI,cx+c,py,cz-(hz-0.18));frameAt(Math.PI,cx+c,py,cz-hz-0.02);                       // north end
    pane(pw,ph,0,      cx+c,py,cz+(hz-0.18));frameAt(0,      cx+c,py,cz+hz+0.02);                       // south end
  }
  // SECOND-STOREY windows — the wall is solid up here, so pane + sage frame sit
  // PROUD of the brick (the farmhouse-window recipe). East centre is skipped:
  // the clock and the name plaque own that bay.
  const upWin=(ry,x,y,z)=>{
    const w=1.1,h=1.25;
    const p=new THREE.PlaneGeometry(w,h);if(ry)p.rotateY(ry);p.translate(x,y,z);gGlow.push(p);
    const put=(bw,bh,ox,oy)=>{const g=new THREE.BoxGeometry(bw,bh,0.1);g.translate(ox,oy,-0.03);if(ry)g.rotateY(ry);g.translate(x,y,z);gFrame.push(g);};
    put(0.10,h+0.2,-(w/2+0.05),0);put(0.10,h+0.2,(w/2+0.05),0);
    put(w+0.2,0.10,0,(h/2+0.05));put(w+0.2,0.10,0,-(h/2+0.05));
    put(0.08,h,0,0);
  };
  for(let i=0;i<B.nLong;i++){
    const c=(i-midL)*pitch;
    upWin(-Math.PI/2,cx-hx-0.05,5.00,cz+c);
    if(i!==midL)upWin(Math.PI/2,cx+hx+0.05,5.00,cz+c);
  }
  for(let i=0;i<B.nShort;i++){
    const c=(i-midS)*pitch;
    upWin(Math.PI,cx+c,5.00,cz-hz-0.05);upWin(0,cx+c,5.00,cz+hz+0.05);
  }

  // limestone courses — E/W wrap the corners, N/S butt in between (no coplanar
  // overlap ever shimmers). gapE opens the EAST band across the clock bay so
  // the roundel isn't sliced by a string course.
  const band=(y,t,gapE)=>{
    for(const sx of[-1,1]){
      if(sx>0&&gapE){
        const L=(B.d+0.32)/2-gapE;
        for(const sz of[-1,1])box(gTrim,0.16,t,L,cx+hx,y,cz+sz*(gapE+L/2),0);
      } else box(gTrim,0.16,t,B.d+0.32,cx+sx*hx,y,cz,0);
    }
    for(const sz of[-1,1])box(gTrim,B.w-0.16,t,0.16,cx,y,cz+sz*hz,0);
  };
  band(plY+spring,0.18,1.35);   // spring-line impost (2.90)
  band(4.20,0.18,1.35);         // second-storey belt course
  band(5.86,0.12,0);            // course under the frieze
  band(6.62,0.12,0);            // course over the frieze
  for(const sx of[-1,1])box(gTrim,0.16,0.14,ez*2,cx+sx*(ex-0.08),roofY-0.08,cz,0);          // fascia ring
  for(const sz of[-1,1])box(gTrim,ex*2-0.32,0.14,0.16,cx,roofY-0.08,cz+sz*(ez-0.08),0);

  // GREEN-GLAZED PRAIRIE FRIEZE — a dark-green band under the eaves with square
  // friezeTile accents (one big + a small over/under, the geometric Prairie
  // rhythm), each lapped 0.01 into the band so nothing floats.
  const fy=6.24,fh=0.62;
  for(const sx of[-1,1])box(gFrieze,0.20,fh,B.d+0.4,cx+sx*hx,fy,cz,0);
  for(const sz of[-1,1])box(gFrieze,B.w-0.2,fh,0.20,cx,fy,cz+sz*hz,0);
  for(const sx of[-1,1])for(let i=0;i<20;i++){
    const z=cz-11.4+i*1.2,x=cx+sx*(hx+0.12);
    box(gTile,0.06,0.30,0.30,x,fy,z,0);
    box(gTile,0.06,0.14,0.14,x,fy+0.23,z,0);box(gTile,0.06,0.14,0.14,x,fy-0.23,z,0);
  }
  for(const sz of[-1,1])for(let i=0;i<11;i++){
    const x=cx-6.0+i*1.2,z=cz+sz*(hz+0.12);
    box(gTile,0.30,0.30,0.06,x,fy,z,0);
    box(gTile,0.14,0.14,0.06,x,fy+0.23,z,0);box(gTile,0.14,0.14,0.06,x,fy-0.23,z,0);
  }

  // broad GREEN-TILE HIP ROOF — the √2 frustum trick lands the corners exactly
  // on the eave rect; the 1.25 overhang is the deep-Prairie-eaves read.
  {const g=new THREE.CylinderGeometry(0.22*Math.SQRT2,Math.SQRT2,B.roofH,4,1);
   g.rotateY(Math.PI/4);g.scale(ex,1,ez);g.translate(cx,roofY+B.roofH/2,cz);gRoof.push(g);}

  // TWIN LANTERN CUPOLAS on the ridge at ±towers.dx — the Lion-House clerestory
  // MONITOR recipe run twice: a brick box whose bottom is sunk under the roof
  // slope on all four sides, glow strips on all four faces, a cornice, and its
  // own small √2 hip cap sunk 0.06 into the box top (no coplanar cap).
  {
    const T=B.towers,my=roofY+B.roofH-0.1,top=my+T.h/2;
    for(const sd of[-1,1]){
      const tz=cz+sd*T.dx;
      box(gBrick,T.w,T.h,T.w,cx,my,tz,0);
      pane(1.9,0.92,Math.PI,   cx,10.56,tz-(T.w/2+0.02));   // 10.10 bottom clears the roof slope (10.03) at the near face
      pane(1.9,0.92,0,         cx,10.56,tz+(T.w/2+0.02));
      pane(1.9,0.92,-Math.PI/2,cx-(T.w/2+0.02),10.56,tz);
      pane(1.9,0.92, Math.PI/2,cx+(T.w/2+0.02),10.56,tz);
      box(gTrim,T.w+0.3,0.12,T.w+0.3,cx,top-0.06,tz,0);
      const mr=new THREE.CylinderGeometry(0.22*Math.SQRT2,Math.SQRT2,T.roofH,4,1);
      mr.rotateY(Math.PI/4);mr.scale(T.w/2+0.4,1,T.w/2+0.4);
      mr.translate(cx,top-0.06+T.roofH/2,tz);gRoof.push(mr);
    }
  }

  // WEST service door (centre arch, full arch height — a short door leaves the
  // transom see-through, the 114 round-2 lesson) + its stoop
  box(gDoor,0.10,B.archH+0.25,B.archW-0.3,cx-(hx-0.35),plY+sill+(B.archH+0.25)/2,cz,0);
  box(gBase,1.2,0.18,3.2,cx-hx-0.85,0.09,cz,0);

  // EAST ENTRANCE BAY — double doors in a limestone surround, the round facade
  // CLOCK on a limestone roundel above (roundel + lintel are BOTH gTrim, so the
  // 0.06 they share is an invisible same-material lap), and the name plaque up
  // in the second-storey band.
  box(gDoor,0.14,2.30,2.60,cx+hx+0.07,plY+1.15,cz,0);
  box(gFrame,0.16,2.30,0.10,cx+hx+0.09,plY+1.15,cz,0);                     // sage meeting mullion
  for(const sz of[-1,1])box(gTrim,0.18,2.45,0.18,cx+hx+0.05,plY+1.225,cz+sz*1.44,0);
  box(gTrim,0.18,0.18,3.06,cx+hx+0.05,2.72,cz,0);                          // lintel
  {
    const rd=new THREE.CylinderGeometry(B.clock.r+0.12,B.clock.r+0.12,0.18,20);
    rd.rotateZ(Math.PI/2);rd.translate(cx+hx+0.06,B.clock.y,cz);gTrim.push(rd);
    const fc=new THREE.CircleGeometry(B.clock.r,24);fc.rotateY(Math.PI/2);
    const m=new THREE.Mesh(fc,bmat(0xffffff,{map:clockTex(B.trim),side:THREE.FrontSide}));
    m.position.set(cx+hx+0.195,B.clock.y,cz);scene.add(m);
  }
  {  // 'CAFÉ BRAUER' — bronze plaque on the entrance bay, between the belt
     // course (4.29) and the under-frieze course (5.80). Own canvas, fitted
     // font, FrontSide plane 0.025 proud of a solid backing lapped into the brick.
    const cv=document.createElement('canvas');cv.width=1024;cv.height=128;const g=cv.getContext('2d');
    g.fillStyle='#2c2620';g.fillRect(0,0,1024,128);
    g.textAlign='center';g.textBaseline='middle';
    g.fillStyle='#f0e8d2';fit(g,B.sign,940,72,'800');g.fillText(B.sign,512,66);
    const tex=new THREE.CanvasTexture(cv);tex.anisotropy=4;
    box(gBack,0.06,0.92,6.12,cx+hx+0.02,5.05,cz,0);
    const pg=new THREE.PlaneGeometry(6.0,0.8);pg.rotateY(Math.PI/2);
    const pl=new THREE.Mesh(pg,curveMat(new THREE.MeshBasicMaterial({map:tex,side:THREE.FrontSide})));
    pl.position.set(cx+hx+0.075,5.05,cz);scene.add(pl);
  }

  // TERRACE + the TWO LOGGIA ARMS. The terrace is a paved slab east of the hall
  // (it laps 0.01 over the boardwalk's NW weld — no coplanar z-fight); each arm
  // is three arcade screens (both long edges + the east end) on a slab that
  // runs down to -0.75 so the south arm's tip, which reaches over the pond,
  // reads as a solid quay instead of piers floating above the water.
  {
    const TR=B.terrace,LG=B.loggia;
    // the court between the arms (the arm floors below tile the remaining z, so
    // no two paving tops are ever coplanar — the same-material shimmer trap)
    {const g=new THREE.BoxGeometry(TR.x1-TR.x0,0.63,(TR.z1-TR.z0)-2*LG.depth);
     g.translate((TR.x0+TR.x1)/2,TR.y-0.315,(TR.z0+TR.z1)/2);gPave.push(g);}
    const arcGeo=(len,n,ptch)=>{
      const s=new THREE.Shape(),aw=1.9,ah=2.4,rr=aw/2,sl=0.05,sp=sl+ah-rr;
      s.moveTo(-len/2,0);s.lineTo(len/2,0);s.lineTo(len/2,LG.postH);s.lineTo(-len/2,LG.postH);s.closePath();
      for(let i=0;i<n;i++){
        const c=(i-(n-1)/2)*ptch,h=new THREE.Path();
        h.moveTo(c-rr,sl);h.lineTo(c+rr,sl);h.lineTo(c+rr,sp);
        h.absarc(c,sp,rr,0,Math.PI,false);h.lineTo(c-rr,sl);
        s.holes.push(h);
      }
      return new THREE.ExtrudeGeometry(s,{depth:0.4,bevelEnabled:false,curveSegments:10});
    };
    const aX0=cx+hx,aX1=aX0+LG.armLen,aXc=(aX0+aX1)/2;      // -54 -> -42
    for(const sd of[-1,1]){
      const zEdge=cz+sd*hz,zIn=zEdge-sd*LG.depth,zc2=zEdge-sd*LG.depth/2;
      const outRy=sd<0?0:Math.PI,inRy=sd<0?Math.PI:0;
      {const g=new THREE.BoxGeometry(LG.armLen,0.88,LG.depth);g.translate(aXc,TR.y-0.44,zc2);gPave.push(g);}
      {const g=arcGeo(LG.armLen,LG.nBay,2.8);if(outRy)g.rotateY(outRy);g.translate(aXc,TR.y,zEdge);gBrick.push(g);}
      {const g=arcGeo(LG.armLen,LG.nBay,2.8);if(inRy) g.rotateY(inRy); g.translate(aXc,TR.y,zIn);  gBrick.push(g);}
      {const g=arcGeo(LG.depth,1,2.8);g.rotateY(-Math.PI/2);g.translate(aX1,TR.y,zc2);gBrick.push(g);}
      const eaveY=TR.y+LG.postH;
      box(gFrieze,LG.armLen+0.32,0.26,LG.depth+0.32,aXc,eaveY-0.05,zc2,0);   // green frieze strip
      box(gTrim,LG.armLen+0.5,0.30,LG.depth+0.5,aXc,eaveY+0.24,zc2,0);       // cornice
      const rg=new THREE.CylinderGeometry(0.22*Math.SQRT2,Math.SQRT2,LG.roofH,4,1);
      rg.rotateY(Math.PI/4);rg.scale(LG.armLen/2+0.45,1,LG.depth/2+0.45);
      rg.translate(aXc,eaveY+0.33+LG.roofH/2,zc2);gRoof.push(rg);            // low green hip, base sunk 0.06 into the cornice
    }
  }

  // =====================================================================
  // (2) THE BOARDWALK DECK on pilings — swept from the DENSE LP_BOARDWALK
  // samples with MITRED offsets (±HALF along the averaged segment normal, so
  // bends have no V-notch; the residual under-coverage vs the lpBoardwalkHit
  // distance band is <=0.07 m at the sharpest bend): a deck-top ribbon at
  // deckY, a fascia skirt one deckTh deep, end caps at both spur welds, and
  // piling rows just inside each edge (cylinder + sphere pile-head collar).
  // The skirt stops at deckY-deckTh (-0.10), NOT at the brief's -0.35: the pond
  // surface is at LP_SOUTHPOND.waterY -0.5, so a 0.47 skirt would have swallowed
  // the pilings whole — this leaves the honest 0.40 m of piling standing out of
  // the water, which IS the "on pilings" read.
  // ONE merged deck mesh + the shared gWood mesh; no colliders, no walkRects.
  // =====================================================================
  const NS=BW.length,NXA=new Array(NS),NZA=new Array(NS);
  for(let i=0;i<NS;i++){
    let dx=0,dz=0;
    if(i>0){const l=Math.hypot(BW[i][0]-BW[i-1][0],BW[i][1]-BW[i-1][1])||1;dx+=(BW[i][0]-BW[i-1][0])/l;dz+=(BW[i][1]-BW[i-1][1])/l;}
    if(i<NS-1){const l=Math.hypot(BW[i+1][0]-BW[i][0],BW[i+1][1]-BW[i][1])||1;dx+=(BW[i+1][0]-BW[i][0])/l;dz+=(BW[i+1][1]-BW[i][1])/l;}
    const l=Math.hypot(dx,dz)||1;NXA[i]=-dz/l;NZA[i]=dx/l;
  }
  const edge=(i,s)=>[BW[i][0]+s*NXA[i]*HALF,BW[i][1]+s*NZA[i]*HALF];
  {
    const DP=[],DN=[],DU=[],FP=[],FN=[],FU=[],dy=ST.deckY,fb=ST.deckY-ST.deckTh;
    for(let i=0;i<NS-1;i++){
      const L0=edge(i,-1),R0=edge(i,1),L1=edge(i+1,-1),R1=edge(i+1,1);
      const sx=BW[i+1][0]-BW[i][0],sz=BW[i+1][1]-BW[i][1],sl=Math.hypot(sx,sz)||1;
      const nx=-sz/sl,nz=sx/sl;
      quad(DP,DN,DU,[L0[0],dy,L0[1]],[R0[0],dy,R0[1]],[R1[0],dy,R1[1]],[L1[0],dy,L1[1]],0,1,0);
      quad(FP,FN,FU,[R0[0],dy,R0[1]],[R1[0],dy,R1[1]],[R1[0],fb,R1[1]],[R0[0],fb,R0[1]], nx,0, nz);
      quad(FP,FN,FU,[L0[0],dy,L0[1]],[L1[0],dy,L1[1]],[L1[0],fb,L1[1]],[L0[0],fb,L0[1]],-nx,0,-nz);
    }
    for(const[i,s]of[[0,-1],[NS-1,1]]){                       // end caps at the two spur welds
      const L=edge(i,-1),R=edge(i,1);
      quad(FP,FN,FU,[L[0],dy,L[1]],[R[0],dy,R[1]],[R[0],fb,R[1]],[L[0],fb,L[1]],s*NZA[i],0,-s*NXA[i]);
    }
    scene.add(new THREE.Mesh(mkGeo(DP,DN,DU),toon(ST.wood2)));              // deck planks
    gWood.push(mkGeo(FP,FN,FU));                                            // fascia -> the dark-wood pool
    let run=0,next=0;
    for(let i=0;i<NS-1;i++){
      const seg=Math.hypot(BW[i+1][0]-BW[i][0],BW[i+1][1]-BW[i][1]);
      while(next<=run+seg){
        const t=seg>1e-6?(next-run)/seg:0;
        for(const s of[-1,1]){
          const a=edge(i,s),b=edge(i+1,s);
          const px=a[0]+(b[0]-a[0])*t,pz=a[1]+(b[1]-a[1])*t;
          const ix=BW[i][0]+(BW[i+1][0]-BW[i][0])*t,iz=BW[i][1]+(BW[i+1][1]-BW[i][1])*t;
          const qx=ix+(px-ix)*0.89,qz=iz+(pz-iz)*0.89;        // 0.15 in from the deck edge
          const cyl=new THREE.CylinderGeometry(0.16,0.16,2.9,6);cyl.translate(qx,fb-1.45,qz);gWood.push(cyl);
          const cap=new THREE.SphereGeometry(0.21,8,6);cap.translate(qx,fb-0.03,qz);gWood.push(cap);   // pile-head collar peeking under the fascia
        }
        next+=ST.pileEvery;
      }
      run+=seg;
    }
  }

  // (3) POST-AND-CABLE RAILS — the dark mesh rail. LP_BOARDWALK runs INSIDE the
  // pond polygon for 52 of its 58 samples (the deck is over open water almost
  // end to end), so BOTH mitred edges get a rail line — a single-sided rail
  // would leave an open drop on the pond side of most of the run. Tail-appended
  // to POSTS/RAILS (collide:false, +0 InstancedMesh buckets).
  for(const s of[-1,1]){
    const line=[];for(let i=0;i<NS;i++)line.push(edge(i,s));
    fenceRun(line,{spacing:ST.railSpace,postH:ST.railH,color:ST.railColor,collide:false},POSTS,RAILS);
  }

  // =====================================================================
  // (4) THE HONEYCOMB PAVILION — a CURVED laminated-timber lattice TUNNEL-ARCH
  // over the water at LP_HONEYCOMB. The ribs are struck PERPENDICULAR to the
  // boardwalk at arc-length stations centred on (x,z), NOT extruded along a
  // straight ry: LP_BOARDWALK swings ~68° through this station (it is the SE
  // bulge's corner), so a straight 12 m barrel at ry -1.1 walks clean off the
  // deck — measured, the far rib feet landed ON the planks. Following the walk
  // keeps every rib foot exactly spanW/2 from the deck centreline (1.45 m
  // outboard of the edge — nothing to walk into), the crown always crownH over
  // the deck, and delivers the data's own word: a CURVED tunnel-arch whose
  // centre tangent is the ry -1.1 the data records. Parabolic ribs springing
  // from pilings in the water + two diagonal families + longitudinal purlins =
  // the stylized hex/diamond CELLS. Pritzker trellis recipe: every member is a
  // TubeGeometry on a curve, ALL merged into ONE toon(timber) mesh. NO
  // colliders — you walk straight under it.
  // =====================================================================
  {
    const sp=HC.spanW/2,springY=-0.35,dlt=HC.crownH-springY,pav=[];
    const CUM=[0];                                          // arc length along the walk
    for(let i=1;i<NS;i++)CUM[i]=CUM[i-1]+Math.hypot(BW[i][0]-BW[i-1][0],BW[i][1]-BW[i-1][1]);
    let i0=0,d0=1e9;
    for(let i=0;i<NS;i++){const d=Math.hypot(BW[i][0]-HC.x,BW[i][1]-HC.z);if(d<d0){d0=d;i0=i;}}
    const at=s=>{                                           // position on the walk at arc length s
      const t=Math.max(0,Math.min(CUM[NS-1],s));
      let i=1;while(i<NS-1&&CUM[i]<t)i++;
      const f=(t-CUM[i-1])/((CUM[i]-CUM[i-1])||1);
      return[BW[i-1][0]+(BW[i][0]-BW[i-1][0])*f,BW[i-1][1]+(BW[i][1]-BW[i-1][1])*f];
    };
    const step=HC.len/(HC.ribs-1),s0=CUM[i0]-HC.len/2;
    const RB=[];                                            // per-rib frame {p, n} (n = unit normal, smoothed)
    for(let k=0;k<HC.ribs;k++){
      const p=at(s0+k*step),a=at(s0+(k-1)*step),b=at(s0+(k+1)*step);
      const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;
      RB.push({x:p[0],z:p[1],nx:-dz/l,nz:dx/l});            // finite-difference tangent -> smooth, fold-free frames
    }
    const ribPt=(r,t)=>{const u=sp*(2*t-1);
      return new THREE.Vector3(r.x+r.nx*u,springY+4*dlt*t*(1-t),r.z+r.nz*u);};
    for(const r of RB){
      const c=new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(r.x-r.nx*sp,springY,r.z-r.nz*sp),
        new THREE.Vector3(r.x,springY+2*dlt,r.z),
        new THREE.Vector3(r.x+r.nx*sp,springY,r.z+r.nz*sp));
      pav.push(new THREE.TubeGeometry(c,16,0.17,6,false));
      for(const s of[-1,1]){const p=new THREE.CylinderGeometry(0.18,0.18,2.7,6);   // 0.18: the ribs crowd to 0.48 apart on the inside of the bend
        p.translate(r.x+s*r.nx*sp,springY-1.35,r.z+s*r.nz*sp);pav.push(p);}
    }
    const nd=HC.cells*2;                                    // 8 stations -> cells diamonds per bay
    for(let b=0;b<HC.ribs-1;b++)for(let k=0;k<nd;k+=2){
      const t0=k/nd,t1=(k+2)/nd,tm=(k+1)/nd;
      const mid={x:(RB[b].x+RB[b+1].x)/2,z:(RB[b].z+RB[b+1].z)/2,
                 nx:(RB[b].nx+RB[b+1].nx)/2,nz:(RB[b].nz+RB[b+1].nz)/2};
      for(const[ta,tb]of[[t0,t1],[t1,t0]]){
        const p0=ribPt(RB[b],ta),p2=ribPt(RB[b+1],tb),m=ribPt(mid,tm);
        const ctrl=new THREE.Vector3(2*m.x-(p0.x+p2.x)/2,2*m.y-(p0.y+p2.y)/2,2*m.z-(p0.z+p2.z)/2);
        pav.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0,ctrl,p2),8,0.11,5,false));
      }
    }
    for(const t of[0.12,0.3,0.5,0.7,0.88]){                 // longitudinal purlins riding the curve
      const pts=RB.map(r=>ribPt(r,t));
      pav.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,0.10,5,false));
    }
    scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(pav.map(g=>g.index?g.toNonIndexed():g)),toon(HC.timber)));
  }

  // =====================================================================
  // (5) INTERPRETIVE PLATES — the three LP_SOUTHPOND.plates on the bank, the
  // habitat-plate shape (bold title over an italic sub), each facing per ry.
  // =====================================================================
  for(const P of SP.plates)
    sign(P.x,P.z,P.ry,1.35,0.6,1.25,0.05,512,224,g=>{
      g.fillStyle='#efe6cd';g.fillRect(0,0,512,224);
      g.textAlign='center';g.textBaseline='middle';
      g.fillStyle='#3a2f24';fit(g,P.title,460,64,'800');g.fillText(P.title,256,82);
      g.fillStyle='#6b5c48';fit(g,P.sub,470,28,'italic 700');g.fillText(P.sub,256,168);
    });

  // =====================================================================
  // (6) THE BRIDGE — the low stone causeway at the pond's south outlet. The
  // data rect (x -48..-32, z 1003.3..1004.7) is NOT clear of the walk: the
  // boardwalk's SW tail runs diagonally into it and at x -48 the box centreline
  // sits 0.21 m off the deck centreline, so a literal 1.5 m box would stand a
  // stone wall THROUGH the walkway (no collider = walk-into-a-wall, the worse
  // half of the anti-trap law). So the causeway is sliced every 0.5 m and each
  // slice's NORTH face is pushed clear of the lpBoardwalkHit band (measured off
  // the SAME polyline, so it can never drift): slices the walk owns keep only
  // the low abutment the deck sits on, the rest carry the full parapet + coping.
  // 'NATURE BOARDWALK / LINCOLN PARK ZOO' goes on the parapet's NORTH face over
  // the full-height run (own canvas, fitted font, FrontSide plane proud of the
  // solid stone — the box IS the backing, no mirror artifact).
  // =====================================================================
  {
    const d2walk=(px,pz)=>{let b=1e9;
      for(let i=0;i<NS-1;i++){
        const ax=BW[i][0],az=BW[i][1],dx=BW[i+1][0]-ax,dz=BW[i+1][1]-az,l2=dx*dx+dz*dz;
        let t=l2?((px-ax)*dx+(pz-az)*dz)/l2:0;t=t<0?0:t>1?1:t;
        const ex=ax+dx*t-px,ez=az+dz*t-pz,d=ex*ex+ez*ez;if(d<b)b=d;
      }
      return Math.sqrt(b);};
    const zN=BR.z-BR.d/2,zS=BR.z+BR.d/2,clr=HALF+0.06,sw=0.5;
    let fx0=Infinity,fx1=-Infinity;
    for(let k=0,nk=Math.round(BR.w/sw);k<nk;k++){
      const mx=BR.x-BR.w/2+(k+0.5)*sw;
      box(gStone,sw+0.02,0.62,BR.d,mx,-0.41,BR.z,0);              // abutment under the deck (-0.72 -> -0.10)
      let nz=zN;while(nz<zS&&d2walk(mx,nz)<clr)nz+=0.05;
      const dp=zS-nz;
      if(dp<0.3)continue;                                          // the walk owns this slice
      box(gStone,sw+0.02,BR.h,dp,mx,BR.h/2,nz+dp/2,0);
      box(gTrim,sw+0.02,0.16,dp+0.28,mx,BR.h+0.08,nz+dp/2,0);      // coping cap
      if(dp>BR.d-0.12){fx0=Math.min(fx0,mx-sw/2);fx1=Math.max(fx1,mx+sw/2);}
    }
    const lw=Math.min(9.0,fx1-fx0-0.8);
    if(lw>2.5){
      const cv=document.createElement('canvas');cv.width=1024;cv.height=192;const g=cv.getContext('2d');
      g.fillStyle='#6f6d63';g.fillRect(0,0,1024,192);              // shadowed stone panel
      g.textAlign='center';g.textBaseline='middle';
      g.fillStyle='#f2efe4';fit(g,BR.sign,960,90,'800');g.fillText(BR.sign,512,72);
      g.fillStyle='#dcd8c8';fit(g,BR.sub,860,44,'700');g.fillText(BR.sub,512,146);
      const tex=new THREE.CanvasTexture(cv);tex.anisotropy=4;
      const pg=new THREE.PlaneGeometry(lw,1.05);pg.rotateY(Math.PI);   // 0.34 -> 1.39, inside the 1.5 parapet
      const pl=new THREE.Mesh(pg,curveMat(new THREE.MeshBasicMaterial({map:tex,side:THREE.FrontSide})));
      pl.position.set((fx0+fx1)/2,0.86,BR.faceZ);scene.add(pl);
    }
  }

  // -- emit: ONE merged mesh per material --------------------------------
  emit(gBrick,toon(B.brick));   emit(gTrim,toon(B.trim));      emit(gBase,toon(B.base));
  emit(gRoof,toon(B.roof));     emit(gDoor,toon(B.door));      emit(gGlow,bmat(B.glow));
  emit(gFrieze,toon(B.frieze)); emit(gTile,toon(B.friezeTile));emit(gFrame,toon(B.frame));
  emit(gPave,toon(CH.ZOO.loopStyle.color));                    emit(gStone,toon(BR.stone));
  emit(gWood,toon(ST.wood));    emit(gBack,toon(0x2c2620));
}

// ---- 122: THE conservatory glass texture. ONE canvas shared by every glass
// surface (walls, ogee roofs, the vestibule pyramid, the ridge lantern) on ONE
// self-lit bmat — the 044 law: big slabs seen from below go bmat, never toon,
// or the green hemisphere bounce turns the whole glasshouse into a lawn. Pale
// mint field + a soft warm interior wash toward the lower centre + white
// glazing bars; every quad carries plain 0..1 uvs so the pattern repeats once
// per pane (no RepeatWrapping needed, so it can never seam).
function conservatoryGlassTex(field,warm){
  const cv=document.createElement('canvas');cv.width=cv.height=128;const g=cv.getContext('2d');
  g.fillStyle='#'+field.toString(16).padStart(6,'0');g.fillRect(0,0,128,128);
  const w=new THREE.Color(warm),rgb=[w.r*255|0,w.g*255|0,w.b*255|0].join(',');
  const gr=g.createRadialGradient(64,122,3,64,122,94);          // canvas bottom = v 0 = the pane's foot
  gr.addColorStop(0,'rgba('+rgb+',0.92)');gr.addColorStop(0.5,'rgba('+rgb+',0.40)');gr.addColorStop(1,'rgba('+rgb+',0)');
  g.fillStyle=gr;g.fillRect(0,0,128,128);
  g.strokeStyle='rgba(255,255,255,0.55)';g.lineWidth=3.2;       // white glazing bars, up the slope
  for(let i=0;i<=8;i++){const x=i*16;g.beginPath();g.moveTo(x,0);g.lineTo(x,128);g.stroke();}
  g.strokeStyle='rgba(104,138,122,0.34)';g.lineWidth=2;         // darker transom bars
  for(let i=0;i<=4;i++){const y=i*32;g.beginPath();g.moveTo(0,y);g.lineTo(128,y);g.stroke();}
  const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return t;
}
// ---- 122: the Bates spray atlas (the Millennium/Crown vocabulary, static):
// LEFT half (u 0..0.5) a soft splash bloom, RIGHT half (u 0.5..1) the plume —
// canvas BOTTOM = v 0 = the nozzle, so a plane's foot is the spout.
function conservatorySprayTex(){
  const cv=document.createElement('canvas');cv.width=cv.height=256;const g=cv.getContext('2d');
  g.clearRect(0,0,256,256);
  const sp=g.createRadialGradient(64,128,2,64,128,62);
  sp.addColorStop(0,'rgba(255,255,255,0.80)');sp.addColorStop(0.45,'rgba(226,244,240,0.34)');sp.addColorStop(1,'rgba(226,244,240,0)');
  g.fillStyle=sp;g.beginPath();g.arc(64,128,62,0,7);g.fill();
  for(let y=0;y<256;y++){
    const f=y/255,w=7+30*Math.pow(1-f,1.5),a=0.10+0.60*Math.pow(f,1.2);
    const lg=g.createLinearGradient(192-w,0,192+w,0);
    lg.addColorStop(0,'rgba(255,255,255,0)');
    lg.addColorStop(0.5,'rgba(248,253,251,'+a.toFixed(3)+')');
    lg.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=lg;g.fillRect(192-w,y,2*w,1.5);
  }
  g.fillStyle='rgba(255,255,255,0.88)';g.fillRect(188,44,8,212);     // bright core
  const fl=g.createRadialGradient(192,250,2,192,250,40);
  fl.addColorStop(0,'rgba(255,255,255,0.85)');fl.addColorStop(1,'rgba(240,252,250,0)');
  g.fillStyle=fl;g.beginPath();g.ellipse(192,250,40,13,0,0,7);g.fill();
  const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return t;
}

// =====================================================================
// 122 — THE LINCOLN PARK CONSERVATORY + the formal garden + the Eli Bates
// "Storks at Play" fountain, the whole precinct folded to one merged mesh per
// material (the buildSouthPond idiom). The 116 ruling, owner-approved
// 2026-07-26: the vestibule flips to the SOUTH face over the garden axis.
//   THE TWO WIN CONDITIONS (refs/lincoln-park/BATES-FOUNTAIN.md + the
//   9719113515 photo):
//     (a) the OGEE profile against sky — every pavilion roof is lofted from
//         its eave rect to its flat copper ridge cap on a SMOOTHSTEP inset
//         (f(t)=t*t*(3-2*t), 7 bands). Smoothstep is vertical at BOTH ends,
//         which is exactly the ref: a straight glass shoulder off the eave,
//         a hard convex sweep through the middle, and the short vertical
//         clerestory collar under the copper. NOT an arch, NOT a pyramid.
//     (b) the fountain = a LOW BROAD grey sitting ring under a tall
//         near-black bronze reed/cattail THICKET (3-4x the bird height);
//         the 2 beak-spouting storks and 3 merboys-with-fish are silhouette
//         detail at its base, never the mass.
// EVERY placement reads out of CH.LP_CONSERVATORY. ZERO rng()/rand() (index
// hashes only) so no towel/flower in the world moves. NO colliders and NO
// walkRects — walkability is already data-carved by conservatoryBlockedHit
// (the anti-trap law). All glass shares ONE bmat (044); toon() is cached per
// hex so repeated colours reuse one material.
// =====================================================================
function buildConservatory(){
  const C=CH.LP_CONSERVATORY,V=C.vestibule,B=C.batesFountain;

  // -- per-material accumulators (merged + scene.add'd at the end) ---------
  const gStone=[],gStoneD=[],gGlass=[],gFrame=[],gCopper=[],gPalm=[],gPalm2=[],
        gTrunk=[],gAwn=[],gBrown=[],gGlow=[],gGrey=[],gBronze=[],gReed=[],
        gApron=[],gDark=[],gWood=[],gLamp=[],gFx=[],gWater=[];
  const box=(arr,w,h,d,x,y,z,ry)=>{const g=new THREE.BoxGeometry(w,h,d);if(ry)g.rotateY(ry);g.translate(x,y,z);arr.push(g);};
  const emit=(geos,mat)=>{if(!geos.length)return;
    scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(geos.map(g=>g.index?g.toNonIndexed():g)),mat));};
  const fit=(g,t,mw,fs,w)=>{g.font=`${w} ${fs}px "Trebuchet MS",sans-serif`;
    while(g.measureText(t).width>mw&&fs>10){fs-=2;g.font=`${w} ${fs}px "Trebuchet MS",sans-serif`;}};
  const mkGeo=(P,N,U)=>{const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));return g;};
  // FIXED corner->uv quad (a=bottom-left, b=bottom-right, c=top-right,
  // d=top-left). The winding flips to match the wanted normal, the uv
  // assignment NEVER does: buildSouthPond's quad() reorders the CORNERS on a
  // flip, which mirrors the uv set — harmless for a flat ribbon, but it would
  // run the glazing bars sideways on half the panes here.
  const gquad=(P,N,U,a,b,c,d,nx,ny,nz)=>{
    const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=d[0]-a[0],vy=d[1]-a[1],vz=d[2]-a[2];
    const kx=uy*vz-uz*vy,ky=uz*vx-ux*vz,kz=ux*vy-uy*vx;
    const W=[a,b,c,d],UV=[[0,0],[1,0],[1,1],[0,1]];
    const T=(kx*nx+ky*ny+kz*nz)<0?[0,3,2,0,2,1]:[0,1,2,0,2,3];
    for(const i of T){P.push(W[i][0],W[i][1],W[i][2]);N.push(nx,ny,nz);U.push(UV[i][0],UV[i][1]);}
  };
  const gtri=(P,N,U,a,b,c,nx,ny,nz)=>{
    const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
    const kx=uy*vz-uz*vy,ky=uz*vx-ux*vz,kz=ux*vy-uy*vx;
    const W=[a,b,c],UV=[[0,0],[1,0],[0.5,1]];
    const T=(kx*nx+ky*ny+kz*nz)<0?[0,2,1]:[0,1,2];
    for(const i of T){P.push(W[i][0],W[i][1],W[i][2]);N.push(nx,ny,nz);U.push(UV[i][0],UV[i][1]);}
  };
  const uvTo=(g,u0,v0,u1,v1)=>{const uv=g.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,u0+(u1-u0)*uv.getX(i),v0+(v1-v0)*uv.getY(i));return g;};
  const hsh=i=>{const s=Math.sin(i*127.1+311.7)*43758.5453;return s-Math.floor(s);};   // index hash — deterministic, rng-free

  // =====================================================================
  // (1) THE GLASSHOUSE — nested ogee pavilions on a rusticated sandstone base
  // =====================================================================
  const BASE_H=1.10;                                   // rusticated plinth height
  const wingCap=w=>({cw:0.9,cd:w.d-3});                // wings carry no capW/capD: a narrow ridge instead
  const PAV=[{p:C.palm ,rL:8,rS:6},{p:C.gable,rL:5,rS:4},
             {p:C.wings[0],rL:6,rS:2},{p:C.wings[1],rL:6,rS:2}];
  // the smoothstep ogee profile: level(t) -> {y, half-width, half-depth}
  const levOf=p=>{
    const cw=p.capW!==undefined?p.capW:wingCap(p).cw,cd=p.capD!==undefined?p.capD:wingCap(p).cd;
    return t=>{const s=t*t*(3-2*t);
      return {y:p.eaveH+(p.capH-p.eaveH)*t,hw:p.w/2+(cw/2-p.w/2)*s,hd:p.d/2+(cd/2-p.d/2)*s};};
  };

  // -- rusticated warm-sandstone plinth: a solid course ring, a recessed dark
  // shadow joint, and two courses of proud blocks whose lengths stagger off an
  // index cycle (no rng) so the coursing never reads as one long extrusion.
  const plinth=(cx,cz,w,d)=>{
    const hw=w/2+0.22,hd=d/2+0.22;
    for(const sz of[-1,1])box(gStone,hw*2,BASE_H,0.44,cx,BASE_H/2,cz+sz*(d/2),0);
    for(const sx of[-1,1])box(gStone,0.44,BASE_H,d-0.44,cx+sx*(w/2),BASE_H/2,cz,0);
    // the shadow joint rides PROUD of the wall face but 0.05 SHY of the block
    // courses — buried inside the wall box it renders as nothing at all.
    for(const sz of[-1,1])box(gStoneD,hw*2+0.02,0.13,0.10,cx,0.585,cz+sz*(hd+0.005),0);
    for(const sx of[-1,1])box(gStoneD,0.10,0.13,hd*2-0.16,cx+sx*(hw+0.005),0.585,cz,0);
    for(const[cy,ch,ph]of[[0.28,0.44,0],[0.87,0.40,1]]){
      for(const sz of[-1,1]){let t=-hw,k=ph;
        while(t<hw-0.35){const L=Math.min(1.35+0.5*((k*5)%3),hw-t);
          box(gStone,L-0.08,ch,0.11,cx+t+L/2,cy,cz+sz*(hd+0.05),0);t+=L;k++;}}
      for(const sx of[-1,1]){let t=-hd,k=ph+1;
        while(t<hd-0.35){const L=Math.min(1.35+0.5*((k*5)%3),hd-t);
          box(gStone,0.11,ch,L-0.08,cx+sx*(hw+0.05),cy,cz+t+L/2,0);t+=L;k++;}}
    }
    for(const sz of[-1,1])box(gStone,hw*2+0.16,0.16,0.60,cx,BASE_H+0.05,cz+sz*(d/2),0);   // cap course the glass sits on
    for(const sx of[-1,1])box(gStone,0.60,0.16,d-0.30,cx+sx*(w/2),BASE_H+0.05,cz,0);
  };

  for(const{p,rL,rS}of PAV){
    plinth(p.x,p.z,p.w,p.d);
    const lev=levOf(p),hw=p.w/2,hd=p.d/2;
    // -- vertical glass walls, plinth top -> eave -------------------------
    {
      const P=[],N=[],U=[],y0=BASE_H+0.13,y1=p.eaveH;
      gquad(P,N,U,[p.x-hw,y0,p.z+hd],[p.x+hw,y0,p.z+hd],[p.x+hw,y1,p.z+hd],[p.x-hw,y1,p.z+hd],0,0,1);
      gquad(P,N,U,[p.x+hw,y0,p.z-hd],[p.x-hw,y0,p.z-hd],[p.x-hw,y1,p.z-hd],[p.x+hw,y1,p.z-hd],0,0,-1);
      gquad(P,N,U,[p.x+hw,y0,p.z+hd],[p.x+hw,y0,p.z-hd],[p.x+hw,y1,p.z-hd],[p.x+hw,y1,p.z+hd],1,0,0);
      gquad(P,N,U,[p.x-hw,y0,p.z-hd],[p.x-hw,y0,p.z+hd],[p.x-hw,y1,p.z+hd],[p.x-hw,y1,p.z-hd],-1,0,0);
      gGlass.push(mkGeo(P,N,U));
    }
    // -- THE OGEE ROOF: 7 lofted bands, smoothstep on the inset ------------
    {
      const P=[],N=[],U=[],NB=7;
      for(let i=0;i<NB;i++){
        const a=lev(i/NB),b=lev((i+1)/NB),dy=b.y-a.y;
        let dr=b.hd-a.hd,L=Math.hypot(dy,dr)||1;
        gquad(P,N,U,[p.x-a.hw,a.y,p.z+a.hd],[p.x+a.hw,a.y,p.z+a.hd],[p.x+b.hw,b.y,p.z+b.hd],[p.x-b.hw,b.y,p.z+b.hd],0,-dr/L, dy/L);
        gquad(P,N,U,[p.x+a.hw,a.y,p.z-a.hd],[p.x-a.hw,a.y,p.z-a.hd],[p.x-b.hw,b.y,p.z-b.hd],[p.x+b.hw,b.y,p.z-b.hd],0,-dr/L,-dy/L);
        dr=b.hw-a.hw;L=Math.hypot(dy,dr)||1;
        gquad(P,N,U,[p.x+a.hw,a.y,p.z+a.hd],[p.x+a.hw,a.y,p.z-a.hd],[p.x+b.hw,b.y,p.z-b.hd],[p.x+b.hw,b.y,p.z+b.hd], dy/L,-dr/L,0);
        gquad(P,N,U,[p.x-a.hw,a.y,p.z-a.hd],[p.x-a.hw,a.y,p.z+a.hd],[p.x-b.hw,b.y,p.z+b.hd],[p.x-b.hw,b.y,p.z-b.hd],-dy/L,-dr/L,0);
      }
      gGlass.push(mkGeo(P,N,U));
    }
    // -- glazing ribs: thin frame tubes riding the ogee at a FIXED fraction
    // of the half-depth/half-width, so every rib stays on the surface and
    // converges at the ridge (the ref's radiating bars). Wall mullions below.
    const rib=(u,onX)=>{
      for(const s of[-1,1]){
        const pts=[];
        for(let i=0;i<=8;i++){const t=i/8,L=lev(t);
          pts.push(onX?new THREE.Vector3(p.x+s*L.hw,L.y,p.z+u*L.hd)
                      :new THREE.Vector3(p.x+u*L.hw,L.y,p.z+s*L.hd));}
        gFrame.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),9,0.055,3,false));
        const wy=(BASE_H+0.13+p.eaveH)/2,wh=p.eaveH-BASE_H-0.13;
        if(wh>0.25){
          if(onX)box(gFrame,0.12,wh,0.10,p.x+s*(hw+0.05),wy,p.z+u*hd,0);
          else    box(gFrame,0.10,wh,0.12,p.x+u*hw,wy,p.z+s*(hd+0.05),0);
        }
      }
    };
    for(let k=0;k<rL;k++)rib((k+0.5)/rL*2-1,true);
    for(let k=0;k<rS;k++)rib((k+0.5)/rS*2-1,false);
    for(const t of[0,0.5]){                              // eave-line + mid-height horizontal bands
      const L=lev(t);
      for(const sz of[-1,1])box(gFrame,L.hw*2+0.20,0.14,0.16,p.x,L.y,p.z+sz*L.hd,0);
      for(const sx of[-1,1])box(gFrame,0.16,0.14,L.hd*2-0.10,p.x+sx*L.hw,L.y,p.z,0);
    }
    // -- verdigris copper ridge cap (a flat slab with a small overhang) ----
    const top=lev(1);
    box(gCopper,top.hw*2+0.60,0.24,top.hd*2+0.60,p.x,p.capH+0.12,p.z,0);
    box(gCopper,top.hw*2+0.24,0.10,top.hd*2+0.24,p.x,p.capH+0.29,p.z,0);
  }
  // finial knobs on the palm cap corners
  {
    const P=C.palm,t=levOf(P)(1);
    for(const sx of[-1,1])for(const sz of[-1,1]){
      const fx=P.x+sx*(t.hw+0.22),fz=P.z+sz*(t.hd+0.22);
      const s=new THREE.SphereGeometry(0.17,8,6);s.translate(fx,P.capH+0.42,fz);gCopper.push(s);
      const c=new THREE.ConeGeometry(0.11,0.26,6);c.translate(fx,P.capH+0.68,fz);gCopper.push(c);
    }
  }

  // -- (1b) THE OPEN RIDGE LANTERN on the palm house, with dark palm crowns
  // cresting through it. Self-lit glass can't show an interior, so the
  // sanctioned "palms above the ridge" read is literal: heads over the ridge.
  {
    const P=C.palm,lw=1.8,ld=2.6,y0=P.capH+0.35,y1=y0+1.20;
    for(const sx of[-1,1])for(const sz of[-1,1])box(gFrame,0.15,1.20,0.15,P.x+sx*lw,(y0+y1)/2,P.z+sz*ld,0);
    for(const sz of[-1,1])box(gFrame,0.13,1.20,0.13,P.x,(y0+y1)/2,P.z+sz*ld,0);
    {
      const Q=[],N=[],U=[];
      gquad(Q,N,U,[P.x-lw,y0,P.z+ld],[P.x+lw,y0,P.z+ld],[P.x+lw,y1,P.z+ld],[P.x-lw,y1,P.z+ld],0,0,1);
      gquad(Q,N,U,[P.x+lw,y0,P.z-ld],[P.x-lw,y0,P.z-ld],[P.x-lw,y1,P.z-ld],[P.x+lw,y1,P.z-ld],0,0,-1);
      gquad(Q,N,U,[P.x+lw,y0,P.z+ld],[P.x+lw,y0,P.z-ld],[P.x+lw,y1,P.z-ld],[P.x+lw,y1,P.z+ld],1,0,0);
      gquad(Q,N,U,[P.x-lw,y0,P.z-ld],[P.x-lw,y0,P.z+ld],[P.x-lw,y1,P.z+ld],[P.x-lw,y1,P.z-ld],-1,0,0);
      gGlass.push(mkGeo(Q,N,U));
    }
    for(const sz of[-1,1])box(gCopper,lw*2+0.34,0.13,0.30,P.x,y1+0.06,P.z+sz*ld,0);   // open vent coping (NO top)
    for(const sx of[-1,1])box(gCopper,0.30,0.13,ld*2-0.10,P.x+sx*lw,y1+0.06,P.z,0);
    // 3 chunky palm crowns poking 0.8-1.6 m above the ridge line (y1 = 12.05)
    for(const[px,pz,s,cy]of[[-71.0,682.3,1.05,12.85],[-69.7,684.5,1.15,13.20],[-68.9,686.2,0.95,12.75]]){
      const tr=new THREE.CylinderGeometry(0.10*s,0.17*s,cy-y0+0.5,6);
      tr.translate(px,(y0-0.5+cy)/2,pz);gTrunk.push(tr);
      const core=new THREE.IcosahedronGeometry(0.34*s,0);core.translate(px,cy,pz);gPalm2.push(core);
      for(let k=0;k<7;k++){
        const a=k*0.8976,tilt=0.92+0.22*(k%2);
        const f=new THREE.ConeGeometry(0.17*s,1.00*s,5);
        f.translate(0,0.50*s,0);f.rotateZ(tilt);f.rotateY(-a);f.translate(px,cy,pz);
        (k%2?gPalm2:gPalm).push(f);
      }
    }
  }

  // =====================================================================
  // (2) THE GLASS PYRAMID VESTIBULE on the SOUTH face + the awning sign
  // =====================================================================
  const vHW=V.w/2,vHD=V.d/2,SILL=0.40,EAVE=V.awning.y,zS=V.z+vHD;   // eave 2.55 = the awning top
  box(gStone,V.w+0.4,SILL,V.d+0.3,V.x,SILL/2,V.z,0);                // low stone sill
  box(gStoneD,V.w+0.5,0.10,V.d+0.4,V.x,SILL+0.05,V.z,0);
  {
    const P=[],N=[],U=[];
    // 125 (issue 038): the SOUTH face is glazed AROUND A REAL DOORWAY HOLE
    // instead of one unbroken sheet. The old sheet is why "peek inside" could
    // never show anything — it sealed the porch, and the door read was a slab
    // stuck on its outside. packs/lp-conservatory.js fills this hole with the
    // lit palm-house diorama and the shut glass doors.
    const dHW=1.14,dTOP=2.42;                                                   // the opening: matches the jamb frames at V.x +- 1.26
    gquad(P,N,U,[V.x-vHW,SILL,zS],[V.x-dHW,SILL,zS],[V.x-dHW,EAVE,zS],[V.x-vHW,EAVE,zS],0,0,1);   // west of the doors
    gquad(P,N,U,[V.x+dHW,SILL,zS],[V.x+vHW,SILL,zS],[V.x+vHW,EAVE,zS],[V.x+dHW,EAVE,zS],0,0,1);   // east of the doors
    gquad(P,N,U,[V.x-dHW,dTOP,zS],[V.x+dHW,dTOP,zS],[V.x+dHW,EAVE,zS],[V.x-dHW,EAVE,zS],0,0,1);   // the transom over them
    gquad(P,N,U,[V.x+vHW,SILL,V.z-vHD],[V.x-vHW,SILL,V.z-vHD],[V.x-vHW,EAVE,V.z-vHD],[V.x+vHW,EAVE,V.z-vHD],0,0,-1);
    gquad(P,N,U,[V.x+vHW,SILL,zS],[V.x+vHW,SILL,V.z-vHD],[V.x+vHW,EAVE,V.z-vHD],[V.x+vHW,EAVE,zS],1,0,0);
    gquad(P,N,U,[V.x-vHW,SILL,V.z-vHD],[V.x-vHW,SILL,zS],[V.x-vHW,EAVE,zS],[V.x-vHW,EAVE,V.z-vHD],-1,0,0);
    // the 4 triangular glass slopes
    const ap=[V.x,V.apexH,V.z],rise=V.apexH-EAVE;
    let L=Math.hypot(rise,vHD);
    gtri(P,N,U,[V.x-vHW,EAVE,zS],[V.x+vHW,EAVE,zS],ap,0,vHD/L,rise/L);
    gtri(P,N,U,[V.x+vHW,EAVE,V.z-vHD],[V.x-vHW,EAVE,V.z-vHD],ap,0,vHD/L,-rise/L);
    L=Math.hypot(rise,vHW);
    gtri(P,N,U,[V.x+vHW,EAVE,zS],[V.x+vHW,EAVE,V.z-vHD],ap,vHW/L,rise/L,0);
    gtri(P,N,U,[V.x-vHW,EAVE,V.z-vHD],[V.x-vHW,EAVE,zS],ap,-vHW/L,rise/L,0);
    gGlass.push(mkGeo(P,N,U));
  }
  for(const sx of[-1,1])for(const sz of[-1,1]){                     // pale hip edges
    const c=new THREE.LineCurve3(new THREE.Vector3(V.x+sx*vHW,EAVE,V.z+sz*vHD),new THREE.Vector3(V.x,V.apexH,V.z));
    gFrame.push(new THREE.TubeGeometry(c,1,0.065,4,false));
  }
  for(const sz of[-1,1])box(gFrame,V.w+0.22,0.14,0.16,V.x,EAVE,V.z+sz*vHD,0);     // eave ring
  for(const sx of[-1,1])box(gFrame,0.16,0.14,V.d-0.10,V.x+sx*vHW,EAVE,V.z,0);
  {const k=new THREE.SphereGeometry(0.16,8,6);k.translate(V.x,V.apexH+0.10,V.z);gCopper.push(k);}

  // -- the DARK-GREEN AWNING BAND. LP_CONSERVATORY.vestibule.awning.w is 11.5
  // and the porch is only 5.8 wide: the band WRAPS the entry corners exactly
  // as the ref photo shows — 6.3 across the front + a 2.6 return down each
  // side = 11.5 running metres.
  const awT=V.awning.y,awB=awT-V.awning.drop,awY=(awT+awB)/2,awZ=zS+0.225;
  box(gAwn,V.w+0.5,V.awning.drop,0.45,V.x,awY,awZ,0);
  for(const sx of[-1,1])box(gAwn,0.45,V.awning.drop,2.6,V.x+sx*(vHW+0.025),awY,zS-1.30+0.10,0);
  {  // 'LINCOLN PARK CONSERVATORY / · FREE ADMISSION ·' — the zoo east-gate
     // canvas recipe. FrontSide plane facing SOUTH (+z, PlaneGeometry's own
     // default normal, so NO rotateY) 0.06 proud of the SOLID awning box,
     // which is its own backing (the bridge-sign precedent: no mirror
     // artifact, and one fewer merged bucket than a separate dark backer).
    const cv=document.createElement('canvas');cv.width=1024;cv.height=160;const g=cv.getContext('2d');
    g.fillStyle='#'+C.awnGreen.toString(16).padStart(6,'0');g.fillRect(0,0,1024,160);
    g.textAlign='center';g.textBaseline='middle';
    g.fillStyle='#f0e8d2';fit(g,V.sign,950,72,'800');g.fillText(V.sign,512,58);
    const reg='· '+V.register+' ·';
    g.fillStyle='#e5c56a';fit(g,reg,640,32,'700');g.fillText(reg,512,124);
    const tex=new THREE.CanvasTexture(cv);tex.anisotropy=4;
    const pl=new THREE.Mesh(new THREE.PlaneGeometry(5.0,0.78),curveMat(new THREE.MeshBasicMaterial({map:tex,side:THREE.FrontSide})));
    pl.position.set(V.x,awY+0.03,awZ+0.285);scene.add(pl);
  }
  // -- the DOOR SURROUND only. 125 (issue 038): the opaque brown leaf slab and
  // the flat cream FREE ADMISSION pane that used to fill this opening are GONE.
  // They were the whole reason "peek inside" showed the player nothing — the
  // doorway was a blank panel with no inside behind it. packs/lp-conservatory.js
  // now owns what sits in this hole: shut GLASS doors with the lit palm house
  // reading through them. Everything here is the frame AROUND that opening —
  // mullion, jambs, head — and it stays exactly where it was, so the doors still
  // read as doors and still never open.
  box(gFrame,0.09,2.00,0.15,V.x,SILL+1.00,zS+0.10,0);                      // meeting mullion
  for(const sx of[-1,1])box(gFrame,0.12,2.14,0.15,V.x+sx*1.26,SILL+1.07,zS+0.08,0);
  box(gFrame,2.64,0.12,0.15,V.x,SILL+2.07,zS+0.08,0);

  // =====================================================================
  // (3) THE ELI BATES FOUNTAIN — low broad ring, dominant reed thicket
  // =====================================================================
  const WY=0.425;                                        // basin water level
  {  // the red-brown paved apron (the pooled zoo-brick 0x8e4f3c, NOT the
     // data's 0x8a5a40 — that hex has no other consumer and would open a
     // whole extra merged bucket for one disc; the zoo brick is the
     // sanctioned pooled equivalent and reads identically).
    const a=new THREE.CircleGeometry(B.apronR,40);a.rotateX(-Math.PI/2);
    a.translate(B.x,0.06,B.z);gApron.push(a);
  }
  {  // two concentric grey rings: a low outer step, then the flat sitting ledge
    const st=new THREE.CylinderGeometry(3.55,3.55,0.25,32);st.translate(B.x,0.125,B.z);gGrey.push(st);
    const ow=new THREE.CylinderGeometry(B.basinR,B.basinR,B.rimH,36,1,true);ow.translate(B.x,B.rimH/2,B.z);gGrey.push(ow);
    const lg=new THREE.RingGeometry(B.basinR-B.rimW,B.basinR,36,1);lg.rotateX(-Math.PI/2);
    lg.translate(B.x,B.rimH,B.z);gGrey.push(lg);
    const fl=new THREE.CylinderGeometry(B.basinR-B.rimW+0.03,B.basinR-B.rimW+0.03,WY,32);
    fl.translate(B.x,WY/2,B.z);gGrey.push(fl);                             // basin floor stone
    const w=new THREE.CircleGeometry(B.basinR-B.rimW+0.01,32);w.rotateX(-Math.PI/2);
    w.translate(B.x,WY+0.005,B.z);gWater.push(w);
  }
  // -- THE THICKET: the win condition. 21 near-black bronze reeds, 1.55..reedH
  // tall on a golden-angle spiral, leaning out — a spiky vertical cluster
  // 3-4x the birds' height that reads as the mass from any standing distance.
  const NREED=26,reedTip=[];
  for(let i=0;i<NREED;i++){
    const a=i*2.39996323,r=0.09+0.58*Math.sqrt(hsh(i)),
          h=1.55+(B.reedH-1.55)*hsh(i+37),lean=0.045+0.14*hsh(i+91);
    const bx=B.x+Math.cos(a)*r,bz=B.z+Math.sin(a)*r;
    // THIN is the read: fat stems went mid-brown under the toon ramp and lost
    // the near-black spike; slender stems keep sky between them.
    const g=new THREE.CylinderGeometry(0.011,0.038,h,5);
    g.translate(0,h/2,0);g.rotateZ(lean);g.rotateY(-a);g.translate(bx,WY,bz);gReed.push(g);
    reedTip.push([bx,bz,a,h,lean]);
  }
  for(let i=1;i<NREED;i+=3){                              // cattail heads (bronze, not black — they catch the light)
    // seated ON the stem axis: rotateZ(lean) maps the +Y stem to NEGATIVE local
    // x, so the axis direction is (-sin·cos a, cos, -sin·sin a) — a + sign here
    // hung every head ~0.5 m off its stem in the air (the floating-pill read)
    const[bx,bz,a,h,lean]=reedTip[i],f=h*0.80,
          ax=-Math.sin(lean)*Math.cos(a),ay=Math.cos(lean),az=-Math.sin(lean)*Math.sin(a);
    const px=bx+ax*f,py=WY+ay*f,pz=bz+az*f;
    const c=new THREE.CylinderGeometry(0.048,0.048,0.26,6);
    c.rotateZ(lean);c.rotateY(-a);c.translate(px,py,pz);gBronze.push(c);
    for(const s of[-1,1]){const e=new THREE.SphereGeometry(0.048,7,5);
      e.translate(px+s*ax*0.13,py+s*ay*0.13,pz+s*az*0.13);gBronze.push(e);}
  }
  // -- a local rig: build a figure in its own +z-forward frame, then swing it
  // out to (ox,oz) facing `yaw` (outward from the thicket).
  const rigAt=(ox,oy,oz,yaw)=>{
    const W=new THREE.Matrix4().makeRotationY(yaw).premultiply(new THREE.Matrix4().makeTranslation(ox,oy,oz));
    return(arr,geo,lx,ly,lz,rx,ry,rz,sx,sy,sz)=>{
      const L=new THREE.Matrix4().compose(new THREE.Vector3(lx,ly,lz),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rx||0,ry||0,rz||0)),
        new THREE.Vector3(sx===undefined?1:sx,sy===undefined?1:sy,sz===undefined?1:sz));
      geo.applyMatrix4(L.premultiply(W));arr.push(geo);return geo;};
  };
  // -- 2 STORKS, wings out, spouting from the beak (rim-height silhouettes) --
  const spouts=[];
  for(const a of[0.62,0.62+Math.PI]){
    const sx=B.x+Math.sin(a)*1.18,sz=B.z+Math.cos(a)*1.18,put=rigAt(sx,WY,sz,a);
    for(const s of[-1,1])put(gBronze,new THREE.CylinderGeometry(0.028,0.028,0.34,5),s*0.085,0.17,0.02);
    put(gBronze,new THREE.SphereGeometry(0.24,10,8),0,0.44,0,0,0,0,1,0.78,1.45);
    put(gBronze,new THREE.CylinderGeometry(0.050,0.065,0.24,6),0,0.62,0.05,-0.45,0,0);
    put(gBronze,new THREE.CylinderGeometry(0.045,0.050,0.22,6),0,0.80,0.155,0.50,0,0);
    put(gBronze,new THREE.SphereGeometry(0.085,8,6),0,0.90,0.22);
    put(gBronze,new THREE.ConeGeometry(0.037,0.30,6),0,0.955,0.335,0.96,0,0);
    for(const s of[-1,1]){                                     // flattened wing slabs swept up-and-out
      const wg=new THREE.BoxGeometry(0.58,0.07,0.44);wg.translate(0.29,0,0);
      put(gBronze,wg,s*0.09,0.60,0,0,s<0?Math.PI:0,0.90);
    }
    spouts.push([sx+Math.sin(a)*0.458,WY+1.041,sz+Math.cos(a)*0.458,a]);
  }
  // -- 3 MERBOYS wrestling fish (silhouette only, no faces) -----------------
  for(const a of[1.90,3.02,5.40]){
    const mx=B.x+Math.sin(a)*1.02,mz=B.z+Math.cos(a)*1.02,put=rigAt(mx,WY,mz,a);
    put(gBronze,new THREE.ConeGeometry(0.15,0.30,7),0,0.17,-0.02,Math.PI,0,0);          // tail root
    put(gBronze,new THREE.ConeGeometry(0.095,0.30,6),0,0.10,-0.17,0.95,0,0);            // the curl
    put(gBronze,new THREE.BoxGeometry(0.22,0.05,0.16),0,0.06,-0.30,0.5,0,0);            // fluke
    put(gBronze,new THREE.SphereGeometry(0.185,9,7),0,0.42,0.02,-0.22,0,0,1,1.15,0.9);  // torso, leaning into the fish
    put(gBronze,new THREE.SphereGeometry(0.110,8,6),0,0.65,0.07);                       // head
    for(const s of[-1,1])put(gBronze,new THREE.CylinderGeometry(0.042,0.042,0.32,5),s*0.16,0.47,0.13,-1.05,0,s*0.35);
    put(gBronze,new THREE.SphereGeometry(0.170,9,7),0,0.55,0.31,0,0.30,0.42,1.9,0.85,0.72);   // the unwieldy fish
    put(gBronze,new THREE.ConeGeometry(0.13,0.20,4),-0.30,0.42,0.24,0,0.30,-1.25);      // its thrashing tail fluke
  }
  // -- STATIC SPRAY (the Millennium crossed-billboard plume, never animated):
  // a modest central plume through the reeds, a small arc off each beak, and
  // a splash bloom on the water. ONE transparent bmat, ONE merged mesh.
  {
    const pl=(w,h)=>uvTo(new THREE.PlaneGeometry(w,h),0.5,0,1,1);
    for(const ry of[0,Math.PI/2]){
      const g=pl(1.10,2.25);g.translate(0,1.13,0);g.rotateY(ry);g.translate(B.x,WY,B.z);gFx.push(g);
    }
    for(const[px,py,pz,a]of spouts)for(const off of[-0.55,0.55]){
      const g=pl(0.30,0.85);g.translate(0,0.42,0);g.rotateX(0.96);g.rotateY(a+off);g.translate(px,py,pz);gFx.push(g);
    }
    const sp=uvTo(new THREE.PlaneGeometry(3.4,3.4),0,0,0.5,1);
    sp.rotateX(-Math.PI/2);sp.translate(B.x,WY+0.012,B.z);gFx.push(sp);
  }

  // =====================================================================
  // (4) GARDEN FURNISHINGS — bed soil, globe lamps, conifer sentinels, bench
  // =====================================================================
  for(const b of C.beds)                                   // the parterre soil slabs props.js plants into
    box(gBrown,(b.x1-b.x0)-0.2,0.12,(b.z1-b.z0)-0.2,(b.x0+b.x1)/2,0.06,(b.z0+b.z1)/2,0);
  for(const[lx,lz]of C.lamps){
    const p=new THREE.CylinderGeometry(0.075,0.115,2.60,7);p.translate(lx,1.30,lz);gDark.push(p);
    const c=new THREE.CylinderGeometry(0.13,0.10,0.16,7);c.translate(lx,2.62,lz);gDark.push(c);
    const gl=new THREE.SphereGeometry(0.16,10,8);gl.translate(lx,2.82,lz);gLamp.push(gl);
  }
  for(const[cx,cz,s]of C.conifers){
    const t=new THREE.CylinderGeometry(0.11*s,0.15*s,0.55*s,6);t.translate(cx,0.275*s,cz);gTrunk.push(t);
    const c1=new THREE.ConeGeometry(0.95*s,2.05*s,8);c1.translate(cx,1.50*s,cz);gPalm.push(c1);
    const c2=new THREE.ConeGeometry(0.72*s,1.70*s,8);c2.translate(cx,2.45*s,cz);gPalm2.push(c2);
    const c3=new THREE.ConeGeometry(0.46*s,1.30*s,8);c3.translate(cx,3.35*s,cz);gPalm.push(c3);
  }
  {  // Grandmother's bench, facing EAST across the Stockton crossing
    const BN=C.grandmothers.bench,put=rigAt(BN.x,0,BN.z,BN.ry);
    for(const s of[-1,1]){
      put(gDark,new THREE.BoxGeometry(0.10,0.45,0.52),s*0.78,0.225,0);
      put(gDark,new THREE.BoxGeometry(0.09,0.58,0.10),s*0.78,0.74,-0.20,0,0,-0.14);
    }
    for(const z of[-0.16,0,0.16])put(gWood,new THREE.BoxGeometry(1.80,0.06,0.13),0,0.47,z);
    for(const y of[0.70,0.92])put(gWood,new THREE.BoxGeometry(1.80,0.14,0.05),0,y,-0.22,0,0,0);
  }

  // -- emit: ONE merged mesh per material ---------------------------------
  const glassM=bmat(0xffffff,{map:conservatoryGlassTex(C.glass,C.glassWarm)});
  emit(gGlass,glassM);
  emit(gStone,toon(C.stone));      emit(gStoneD,toon(C.stoneDark));
  emit(gFrame,toon(C.frame));      emit(gCopper,toon(C.copper));
  emit(gPalm,toon(C.palmDark));    emit(gPalm2,toon(C.palmDark2));
  emit(gTrunk,toon(C.trunk));      emit(gAwn,toon(C.awnGreen));
  emit(gBrown,toon(C.flora.soil)); emit(gGlow,bmat(C.doorGlow));
  emit(gGrey,toon(B.stone));       emit(gWater,bmat(B.water));
  emit(gBronze,toon(B.bronze));    emit(gReed,toon(B.reedBronze));
  emit(gApron,toon(0x8e4f3c));     emit(gDark,toon(0x2f3430));
  emit(gWood,toon(0x8a6a44));      emit(gLamp,bmat(0xfff4dc));
  emit(gFx,bmat(0xffffff,{map:conservatorySprayTex(),transparent:true,depthWrite:false,side:THREE.DoubleSide}));
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
  buildZooHabitats(POSTS,RAILS);     // task 115: habitat dioramas + Farm-in-the-Zoo — rails append to the tail (collide:false, data-carved walkability)
  buildSouthPond(POSTS,RAILS);       // task 117: Café Brauer + honeycomb pavilion + Nature Boardwalk deck/rails/plates/bridge — rails append to the tail (collide:false, zero rng)
  buildConservatory();               // task 122: ogee glasshouse + glass-pyramid vestibule + Eli Bates fountain + garden furnishings (zero rng, no fences, no colliders — det-safe insert)
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
