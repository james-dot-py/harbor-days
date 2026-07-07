import * as THREE from 'three';
import { scene, rng, rand, clamp, smooth, gmap, toon, bmat, curveMat, pip, WATER_Y, CURV } from './core.js';
import * as CH from './data/chicago.js';

// ------------------------ coast + land outline -------------------------
function genCoast(z0,z1,fx){const C=[];for(let z=z0;z>=z1;z-=3)C.push([fx(z),z]);return C}
export const COAST_MAIN=genCoast(CH.COAST_MAIN_PARAMS.z0,CH.COAST_MAIN_PARAMS.z1,CH.COAST_MAIN_PARAMS.fx);  // Belmont Rocks + south lawn, south->north
export const COAST_PEN =genCoast(CH.COAST_PEN_PARAMS.z0,CH.COAST_PEN_PARAMS.z1,CH.COAST_PEN_PARAMS.fx);     // east peninsula lake edge
export const COAST_GOLF=genCoast(CH.COAST_GOLF_PARAMS.z0,CH.COAST_GOLF_PARAMS.z1,CH.COAST_GOLF_PARAMS.fx);  // Marovitz trail-side revetment
export const COAST_MOUTH=genCoast(CH.COAST_MOUTH_PARAMS.z0,CH.COAST_MOUTH_PARAMS.z1,CH.COAST_MOUTH_PARAMS.fx); // harbor-mouth terraced shore (rocks tip -> basin SW)
export const COAST_CORNER=genCoast(CH.COAST_CORNER_PARAMS.z0,CH.COAST_CORNER_PARAMS.z1,CH.COAST_CORNER_PARAMS.fx); // south-corner wrap (SW terminus -> rocks SE join), same 7-step profile
export const M_END=COAST_MAIN[COAST_MAIN.length-1];                          // ~[151,16]
export const P_START=COAST_PEN[0];                                           // ~[196,-25]
// peninsula SOUTH-TIP terraced arc (SW turn ~[166,-24] -> south point ~[176,-17] -> SE,
// joining COAST_PEN at P_START). A polyline coast piece (not fx(z): the tip horseshoes,
// so z isn't single-valued) — coastQuery/terraces consume it like any other. Ordered
// basin->lake so the seaward normal points outward around the whole horseshoe; TIER_DEFAULT
// (4 steps) since its z (~ -17..-24) is outside the Rocks band, matching COAST_PEN's tiers.
export const COAST_TIP=CH.peninsulaTipLine(P_START);

export const BASIN_W=[];for(let z=CH.BASIN_W_PARAMS.z0;z>=CH.BASIN_W_PARAMS.z1;z-=CH.BASIN_W_PARAMS.step)BASIN_W.push([CH.BASIN_W_PARAMS.fx(z),z]);
export const LAND=CH.buildLAND({COAST_CORNER,COAST_MAIN,COAST_PEN,COAST_GOLF,COAST_MOUTH,BASIN_W});

// --------------------- terraces (the revetment) ------------------------
export function tierProfile(zc){
  const rocks=zc>CH.TIER_ROCKS.zMin&&zc<CH.TIER_ROCKS.zMax;   // Belmont Rocks stretch: wider, more steps
  return rocks?{w:CH.TIER_ROCKS.w,step:CH.TIER_ROCKS.step}:{w:CH.TIER_DEFAULT.w,step:CH.TIER_DEFAULT.step};
}
export function profileTotal(zc){const p=tierProfile(zc);let s=0;for(const w of p.w)s+=w;return s}
export function buildSegs(pts){
  const segs=[];
  for(let i=0;i<pts.length-1;i++){
    const ax=pts[i][0],az=pts[i][1],bx=pts[i+1][0],bz=pts[i+1][1];
    const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);
    const tx=dx/len,tz=dz/len;
    segs.push({ax,az,tx,tz,nx:-tz,nz:tx,len});   // n points to water (east) for south->north coasts
  }
  return segs;
}
export const COAST_SEGS=[buildSegs(COAST_MAIN),buildSegs(COAST_PEN),buildSegs(COAST_GOLF),buildSegs(COAST_MOUTH),buildSegs(COAST_CORNER)];  // corner appended (index 4) so COAST_SEGS[0..3] stay put for props/beach-life
// The tip is kept OUT of COAST_SEGS on purpose: props.js beach-life/foam iterate
// COAST_SEGS (with the shared rng), so appending here would shift the world's rng order
// (moved towels/flowers — hard constraint #1). Instead coastQuery/tierAt (walkability
// + the tip's own DETERMINISTIC terrace mesh in buildCoast) scan this extra piece, which
// consumes no shared rng. Everything else in the world stays bit-for-bit identical.
export const TIP_SEGS=buildSegs(COAST_TIP);
const QUERY_SEGS=[...COAST_SEGS,TIP_SEGS];
export function coastQuery(x,z){
  let best=null,bd2=1e9;
  for(const C of QUERY_SEGS)for(const s of C){
    const px=x-s.ax,pz=z-s.az;
    let t=px*s.tx+pz*s.tz;t=clamp(t,0,s.len);
    const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;
    const ddx=x-cx,ddz=z-cz,d2=ddx*ddx+ddz*ddz;
    if(d2<bd2){bd2=d2;best={lat:ddx*s.nx+ddz*s.nz,d2,z:cz}}
  }
  if(!best)return null;
  best.ae=Math.sqrt(Math.max(0,best.d2-best.lat*best.lat));   // overrun past polyline ends
  return best;
}
export function tierAt(lat,zc){       // height on the terraces, or null past the edge
  const p=tierProfile(zc);let acc=0;
  for(let i=0;i<p.w.length;i++){acc+=p.w[i];if(lat<=acc)return{h:-i*p.step,i,edge:acc}}
  return null;
}

// dog beach — sloped sand cove: dry (h=0) at the north edge, dipping to
// `depth` at the south waterline. t rises with z (south) so the slope faces
// the basin water south of the cove.
export function beachH(x,z){
  const b=CH.DOG_BEACH.bounds,s=CH.DOG_BEACH.slope;
  if(x<b.x0||x>b.x1||z<b.z0||z>b.z1)return null;
  const t=clamp((z-s.ref)/s.span,0,1);
  return s.depth*smooth(t);
}

// water mesh (populated by buildCoast; read by the main loop for uTime)
export let water=null;

// Living toon water. A MeshToonMaterial patched via onBeforeCompile: the same
// world-curve as curveMat, plus (1) a gentle 2-octave swell, (2) sparse warm
// sun-glints, (3) a very slow large-scale hue drift. Keeps the userData.sh /
// uTime contract main.js ticks. No shared rng, no geometry change, no textures.
function livingWaterMat(baseHex){
  const m=new THREE.MeshToonMaterial({color:baseHex,gradientMap:gmap});
  m.onBeforeCompile=sh=>{
    sh.uniforms.uCurv={value:CURV};
    sh.uniforms.uTime={value:0};
    m.userData.sh=sh;                    // <-- main.js ticks sh.uniforms.uTime.value

    // ---- vertex: world-curve + gentle breathing swell (amp <= 0.07) ----
    sh.vertexShader=sh.vertexShader.replace('#include <common>',
      '#include <common>\nuniform float uCurv;\nuniform float uTime;\nvarying vec2 vWc;');
    sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n'+
      '\tvWc = position.xz;\n'+                 // mesh unrotated & at x=z=0 -> world xz
      // two slow swells, periods ~6s & ~9s, directions ~40 deg apart
      '\ttransformed.y += sin(dot(position.xz, vec2(0.90,0.44))*0.14 + uTime*1.047)*0.045\n'+
      '\t              + sin(dot(position.xz, vec2(0.40,0.91))*0.11 + uTime*0.698)*0.025;');
    sh.vertexShader=sh.vertexShader.replace('gl_Position = projectionMatrix * mvPosition;',
      'mvPosition.y -= uCurv * mvPosition.z * mvPosition.z;\n\tgl_Position = projectionMatrix * mvPosition;');

    // ---- fragment: large-scale hue drift + sparse warm glints ----
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>',
      '#include <common>\nuniform float uTime;\nvarying vec2 vWc;');
    // hue life: nudge the base cyan toward a deeper teal / warmer aqua over
    // very broad (>500m) slowly-drifting fields, before toon lighting -> stays flat.
    sh.fragmentShader=sh.fragmentShader.replace(
      'vec4 diffuseColor = vec4( diffuse, opacity );',
      'float hz1 = sin(vWc.x*0.012 + uTime*0.05)*0.5 + 0.5;\n'+
      '\tfloat hz2 = sin(vWc.y*0.010 - uTime*0.037 + 1.7)*0.5 + 0.5;\n'+
      '\tvec3 wCol = diffuse;\n'+
      '\twCol = mix(wCol, diffuse*vec3(0.84,0.95,1.03), hz1*0.45);\n'+   // deeper teal
      '\twCol = mix(wCol, diffuse*vec3(1.12,1.05,0.95), hz2*0.45);\n'+   // warmer aqua
      '\tvec4 diffuseColor = vec4( wCol, opacity );');
    // glints: interference of three drifting sine fields; only the rare near-peak
    // survives the smoothstep -> sparse glitter. Added before fog so distance fades them.
    sh.fragmentShader=sh.fragmentShader.replace('#include <fog_fragment>',
      'float g1 = sin(dot(vWc, vec2( 1.7, 0.9)) + uTime*1.3);\n'+
      '\tfloat g2 = sin(dot(vWc, vec2(-1.1, 1.9)) - uTime*1.0);\n'+
      '\tfloat g3 = sin(dot(vWc, vec2( 0.7,-1.3)) + uTime*0.7);\n'+
      '\tfloat glint = smoothstep(0.90, 1.0, (g1+g2+g3)*0.3333);\n'+
      '\tgl_FragColor.rgb += vec3(1.0,0.94,0.80) * glint * 0.55;\n'+
      '\t#include <fog_fragment>');
  };
  return m;
}

export function buildCoast(){
  // terrace blocks — instanced, jittered for the uneven limestone look
  {
    const cols=[0xe9ddc2,0xdfd2b4,0xd5c7a6,0xcdbf9e,0xc7b183].map(c=>new THREE.Color(c));
    const boxes=[];
    for(const segs of COAST_SEGS){
      let along=0;
      for(const s of segs){
        for(let t=0;t<s.len;t+=2.2){
          const cx=s.ax+s.tx*t,cz=s.az+s.tz*t,zc=cz;
          const p=tierProfile(zc);let acc=0;
          for(let i=0;i<p.w.length;i++){
            const w=p.w[i]+rand(-0.25,0.25);
            const off=acc+p.w[i]/2+rand(-0.12,0.12);
            boxes.push({
              x:cx+s.nx*off, z:cz+s.nz*off,
              y:-i*p.step-0.4+rand(-0.03,0.03),
              l:2.35+rand(-0.25,0.45), w,
              rot:Math.atan2(s.tx,s.tz)+rand(-0.035,0.035),
              c:cols[i<2?(rng()*3|0):(2+(rng()*3|0))]
            });
            acc+=p.w[i];
          }
          along+=2.2;
        }
      }
    }
    const geo=new THREE.BoxGeometry(1,0.8,1);
    const inst=new THREE.InstancedMesh(geo,curveMat(new THREE.MeshToonMaterial({gradientMap:gmap})),boxes.length);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3(),E=new THREE.Euler();
    boxes.forEach((b,i)=>{
      E.set(0,b.rot,0);Q.setFromEuler(E);
      M.compose(V.set(b.x,b.y,b.z),Q,S.set(b.w,1,b.l));
      inst.setMatrixAt(i,M);inst.setColorAt(i,b.c);
    });
    inst.instanceMatrix.needsUpdate=true;inst.instanceColor.needsUpdate=true;
    scene.add(inst);
  }

  // peninsula SOUTH-TIP terraces (TIER_DEFAULT, wrapping the horseshoe). Rendered as its
  // OWN instanced mesh with DETERMINISTIC jitter (an xorshift seeded once, NOT the shared
  // rng) so this addition never shifts the world's rng order — every towel/flower/tree
  // downstream stays put (hard constraint #1). Same limestone look as the main revetment.
  {
    const cols=[0xe9ddc2,0xdfd2b4,0xd5c7a6,0xcdbf9e,0xc7b183].map(c=>new THREE.Color(c));
    let h=0x9e3779b1>>>0;                     // local deterministic jitter (no shared rng)
    const jr=()=>{h^=h<<13;h>>>=0;h^=h>>>17;h^=h<<5;h>>>=0;return h/4294967296;};
    const jit=a=>(jr()*2-1)*a;
    const boxes=[];
    for(const s of TIP_SEGS){
      for(let t=0;t<s.len;t+=2.2){
        const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;
        const p=tierProfile(cz);let acc=0;
        for(let i=0;i<p.w.length;i++){
          const w=p.w[i]+jit(0.25);
          const off=acc+p.w[i]/2+jit(0.12);
          boxes.push({x:cx+s.nx*off, z:cz+s.nz*off,
            y:-i*p.step-0.4+jit(0.03), l:2.35+jit(0.35), w,
            rot:Math.atan2(s.tx,s.tz)+jit(0.035),
            c:cols[i<2?(jr()*3|0):(2+(jr()*3|0))]});
          acc+=p.w[i];
        }
      }
    }
    const inst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,0.8,1),curveMat(new THREE.MeshToonMaterial({gradientMap:gmap})),boxes.length);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3(),E=new THREE.Euler();
    boxes.forEach((b,i)=>{E.set(0,b.rot,0);Q.setFromEuler(E);M.compose(V.set(b.x,b.y,b.z),Q,S.set(b.w,1,b.l));inst.setMatrixAt(i,M);inst.setColorAt(i,b.c);});
    inst.instanceMatrix.needsUpdate=true;inst.instanceColor.needsUpdate=true;
    scene.add(inst);
  }

  // harbor entrance light on the tip's top step (short white tower, red cap, warm bulb).
  {
    const L=CH.HARBOR_LIGHT,lx=L.pos[0],lz=L.pos[1];
    const g=new THREE.Group();
    const tower=new THREE.Mesh(new THREE.CylinderGeometry(L.r*0.78,L.r,L.towerH,10),toon(L.white));tower.position.y=L.towerH/2;g.add(tower);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(L.r*0.92,L.r*0.92,0.5,10),toon(L.red));cap.position.y=L.towerH+0.25;g.add(cap);
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(L.r*0.6,10,8),bmat(L.glow));bulb.position.y=L.towerH+0.6;g.add(bulb);
    g.position.set(lx,0,lz);scene.add(g);
  }

  // sheet-pile walls — the sawtooth steel edge from the photo
  const pileData=[];
  function wallLine(pts,topY,botY){
    const segs=buildSegs(pts);
    for(const s of segs){
      for(let t=0;t<s.len;t+=1.15){
        const k=pileData.length;
        pileData.push({
          x:s.ax+s.tx*t+s.nx*((k%2?0.24:-0.05)),
          z:s.az+s.tz*t+s.nz*((k%2?0.24:-0.05)),
          y:(topY+botY)/2, h:topY-botY,
          rot:Math.atan2(s.tx,s.tz), dark:k%2
        });
      }
    }
  }
  // along every open-lake revetment, at the outer edge of the bottom tier
  for(const[pts,segs]of[[COAST_MAIN,0],[COAST_PEN,0],[COAST_GOLF,0],[COAST_MOUTH,0],[COAST_CORNER,0],[COAST_TIP,0]]){
    const S2=buildSegs(pts);
    for(const s of S2){
      for(let t=0;t<s.len;t+=1.15){
        const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;
        const p=tierProfile(cz),tot=profileTotal(cz);
        const topY=-(p.w.length-1)*p.step+0.06;
        const k=pileData.length,jut=(k%2?0.26:-0.04);
        pileData.push({x:cx+s.nx*(tot+jut),z:cz+s.nz*(tot+jut),
          y:(topY-3.1)/2,h:topY+3.1,rot:Math.atan2(s.tx,s.tz),dark:k%2});
      }
    }
  }
  // basin + mouth seawalls (flush with the park, straight down)
  for(const pts of CH.seawallLines({P_START,BASIN_W}))wallLine(pts,CH.SEAWALL_Y.top,CH.SEAWALL_Y.bot);
  {
    const geo=new THREE.BoxGeometry(1.22,1,0.5);
    const m1=curveMat(new THREE.MeshToonMaterial({gradientMap:gmap}));
    const inst=new THREE.InstancedMesh(geo,m1,pileData.length);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3(),E=new THREE.Euler();
    const c1=new THREE.Color(0x6f665a),c2=new THREE.Color(0x655c50);
    pileData.forEach((p,i)=>{
      E.set(0,p.rot,0);Q.setFromEuler(E);
      M.compose(V.set(p.x,p.y,p.z),Q,S.set(1,p.h,1));
      inst.setMatrixAt(i,M);inst.setColorAt(i,p.dark?c2:c1);
    });
    inst.instanceMatrix.needsUpdate=true;inst.instanceColor.needsUpdate=true;
    scene.add(inst);
  }

  // ------------------------------ ground --------------------------------
  function shapeFrom(pts){const s=new THREE.Shape();s.moveTo(pts[0][0],-pts[0][1]);for(let i=1;i<pts.length;i++)s.lineTo(pts[i][0],-pts[i][1]);s.closePath();return s}
  function flatShape(pts,y,mat){const g=new THREE.ShapeGeometry(shapeFrom(pts));g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,mat);m.position.y=y;return m}
  scene.add(flatShape(LAND,0,toon(0x7ecb6f)));

  const wgeo=new THREE.PlaneGeometry(CH.WATER.size,CH.WATER.size,CH.WATER.seg,CH.WATER.seg);wgeo.rotateX(-Math.PI/2);
  water=new THREE.Mesh(wgeo,livingWaterMat(0x2fa3b5));
  water.position.set(CH.WATER.cx,WATER_Y,CH.WATER.cz);scene.add(water);   // centered on the tall map so the lake never runs out

  // dog beach — sloped sand down to the basin water
  {
    const g=new THREE.PlaneGeometry(CH.DOG_BEACH.mesh.w,CH.DOG_BEACH.mesh.d,CH.DOG_BEACH.mesh.segW,CH.DOG_BEACH.mesh.segD);g.rotateX(-Math.PI/2);
    const cx=CH.DOG_BEACH.mesh.cx,cz=CH.DOG_BEACH.mesh.cz,pos=g.attributes.position;
    for(let i=0;i<pos.count;i++){
      const wx=pos.getX(i)+cx,wz=pos.getZ(i)+cz;
      const h=beachH(wx,wz);pos.setY(i,h===null?0:h+0.03);
    }
    g.computeVertexNormals();
    const m=new THREE.Mesh(g,toon(0xf0e2bd,{}));m.position.set(cx,0,cz);scene.add(m);
  }

  // mottled grass patches (instanced — one draw call). Reject any placement
  // outside the LAND polygon (pip test PER TRY); if no land point turns up
  // within G.tries, SKIP the patch rather than dropping it on the water
  // (that was the 'grass circle floating on the harbor' bug).
  {
    const G=CH.GRASS_PATCHES,pm=bmat(G.color);
    const inst=new THREE.InstancedMesh(new THREE.CircleGeometry(1,G.segs),pm,G.count);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0)),S=new THREE.Vector3(),V=new THREE.Vector3();
    let placed=0;
    for(let i=0;i<G.count;i++){
      let x,z,ok=false,tries=0;
      while(tries++<G.tries){x=rand(G.xr[0],G.xr[1]);z=rand(G.zr[0],G.zr[1]);if(pip(x,z,LAND)){ok=true;break}}
      if(!ok)continue;                       // no land found -> never place on water
      const r=rand(G.radius[0],G.radius[1]),sx=rand(G.scaleX[0],G.scaleX[1]);
      M.compose(V.set(x,0.02,z),Q,S.set(r*sx,r,1));inst.setMatrixAt(placed++,M);
    }
    inst.count=placed;
    inst.instanceMatrix.needsUpdate=true;scene.add(inst);
  }
}
