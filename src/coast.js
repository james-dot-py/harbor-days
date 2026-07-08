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
  const R=CH.TIER_ROCKS;
  if(zc>R.zMin&&zc<R.zMax){                                   // Belmont Rocks stretch (+ wrapped corner): wider, 7 steps
    if(zc>R.cornerZ0){                                        // corner wrap: taper the wide promenade toward the convex SW terminus
      const f=clamp((zc-R.cornerZ0)/(R.cornerZ1-R.cornerZ0),0,1);
      const w=R.w.slice();w[w.length-1]=R.w[w.length-1]+(R.cornerPromW-R.w[w.length-1])*f;
      return {w,step:R.step};                                  // f=0 at the z340 join (promenade 6.0, flush w/ the straight rocks)
    }
    if(zc<R.mouthZ0){                                         // mouth taper: pinch the wide rocks field to the default
      const f=clamp((R.mouthZ0-zc)/(R.mouthZ0-R.mouthZ1),0,1); // 12.2 m total at zMin so the hand-off at the harbor-mouth
      const w=R.w.map((v,i)=>v+(R.mouthW[i]-v)*f);             // junction is flush (was a 10.5 m width cliff — the
      return {w,step:R.step};                                  // 'jagged edge at the mouth' tear). Same call counts.
    }
    return {w:R.w,step:R.step};
  }
  return {w:CH.TIER_DEFAULT.w,step:CH.TIER_DEFAULT.step};
}
export function profileTotal(zc){const p=tierProfile(zc);let s=0;for(const w of p.w)s+=w;return s}
// The corner PIER's slip: points seaward of the revetment top edge within the
// pier x-band are OPEN WATER (the terrace is carved so the deck spans water, not
// steps). North boundary follows the top-edge line so no lawn is carved.
export function inPierChannel(x,z){
  const P=CH.PIER_CHANNEL;if(!P)return false;
  if(x<P.x0||x>P.x1||z>P.zMax)return false;
  const topZ=P.topZ0+(P.topZ1-P.topZ0)*(x-P.x0)/(P.x1-P.x0);
  return z>=topZ;
}
// Per-VERTEX unit tangents for a segment list (average of the two adjacent
// segment tangents, clamped at the ends). Interpolating these along a segment
// gives a smoothly-varying box orientation with no jump at segment boundaries —
// kills the terrace sawtooth on tight curves. No rng.
function vertexTangents(segs){
  const n=segs.length,VT=new Array(n+1);
  for(let k=0;k<=n;k++){
    const a=segs[Math.max(0,k-1)],b=segs[Math.min(n-1,k)];
    let x=a.tx+b.tx,z=a.tz+b.tz;const l=Math.hypot(x,z)||1;VT[k]=[x/l,z/l];
  }
  return VT;
}
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
  if(inPierChannel(x,z))best.lat=1e3;                          // pier slip: carved to open water -> tierAt() yields no tier
  return best;
}
export function tierAt(lat,zc){       // height on the terraces, or null past the edge
  const p=tierProfile(zc);let acc=0;
  for(let i=0;i<p.w.length;i++){acc+=p.w[i];if(lat<=acc)return{h:-i*p.step,i,edge:acc}}
  return null;
}

// ---- water color gradient: shore-distance field -----------------------
// Segments the per-vertex water aShore is sampled against: the open-lake coast
// + peninsula tip (QUERY_SEGS) PLUS the sheltered harbor BASIN edges (west
// seawall, north shore, peninsula west bulkhead). Including the basin walls
// makes basin water read shallow/light (its nearest edge is always close),
// matching the aerial's greener harbor. One flat list for the hot loop.
// buildSegs uses NO shared rng -> deterministic; the world's rng order is untouched.
const SHORE_SEGS=[].concat(...QUERY_SEGS, ...CH.seawallLines({P_START,BASIN_W}).map(buildSegs));
export function shoreDist(x,z){        // approx Euclidean distance (m) to the nearest shoreline
  let bd2=1e18;
  for(let i=0;i<SHORE_SEGS.length;i++){
    const s=SHORE_SEGS[i];
    const px=x-s.ax,pz=z-s.az;
    let t=px*s.tx+pz*s.tz; if(t<0)t=0; else if(t>s.len)t=s.len;
    const ddx=x-(s.ax+s.tx*t),ddz=z-(s.az+s.tz*t),d2=ddx*ddx+ddz*ddz;
    if(d2<bd2)bd2=d2;
  }
  return Math.sqrt(bd2);
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
      '#include <common>\nuniform float uCurv;\nuniform float uTime;\nattribute float aShore;\nvarying vec2 vWc;\nvarying float vShore;');
    sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n'+
      '\tvWc = position.xz;\n'+                 // mesh unrotated & at x=z=0 -> world xz
      '\tvShore = aShore;\n'+                   // build-time shore distance (m), swell-independent
      // two slow swells, periods ~6s & ~9s, directions ~40 deg apart
      '\ttransformed.y += sin(dot(position.xz, vec2(0.90,0.44))*0.14 + uTime*1.047)*0.045\n'+
      '\t              + sin(dot(position.xz, vec2(0.40,0.91))*0.11 + uTime*0.698)*0.025;');
    sh.vertexShader=sh.vertexShader.replace('gl_Position = projectionMatrix * mvPosition;',
      'mvPosition.y -= uCurv * mvPosition.z * mvPosition.z;\n\tgl_Position = projectionMatrix * mvPosition;');

    // ---- fragment: banded shore gradient + hue drift + sparse warm glints ----
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>',
      '#include <common>\nuniform float uTime;\nvarying vec2 vWc;\nvarying float vShore;');
    // Shore-distance color GRADE (the aerial's soft bands hugging the shoreline):
    // bright turquoise at the water's edge -> deep blue-teal offshore, in 4 TOON
    // STEPS. Each edge is a ~3 m smoothstep so the swell can't make bands shimmer.
    // Then the broad slow hue drift layers ON TOP (before toon lighting -> flat).
    sh.fragmentShader=sh.fragmentShader.replace(
      'vec4 diffuseColor = vec4( diffuse, opacity );',
      'vec3 cShore=vec3(0.3490,0.8588,0.9098);\n'+   // 0x59dbe8 bright turquoise (0-14 m)
      '\tvec3 cAqua =vec3(0.1843,0.6392,0.7098);\n'+ // 0x2fa3b5 mid aqua  (14-38 m, the old base)
      '\tvec3 cTeal =vec3(0.1451,0.5490,0.6275);\n'+ // 0x258ca0 deeper teal (38-85 m)
      '\tvec3 cDeep =vec3(0.0902,0.4980,0.6196);\n'+ // 0x177f9e deep blue-teal (>85 m)
      '\tvec3 band=cShore;\n'+
      '\tband=mix(band,cAqua,smoothstep(12.5,15.5,vShore));\n'+
      '\tband=mix(band,cTeal,smoothstep(36.5,39.5,vShore));\n'+
      '\tband=mix(band,cDeep,smoothstep(83.5,86.5,vShore));\n'+
      '\tfloat hz1 = sin(vWc.x*0.012 + uTime*0.05)*0.5 + 0.5;\n'+
      '\tfloat hz2 = sin(vWc.y*0.010 - uTime*0.037 + 1.7)*0.5 + 0.5;\n'+
      '\tvec3 wCol = band;\n'+
      '\twCol = mix(wCol, band*vec3(0.84,0.95,1.03), hz1*0.45);\n'+   // deeper teal drift
      '\twCol = mix(wCol, band*vec3(1.12,1.05,0.95), hz2*0.45);\n'+   // warmer aqua drift
      '\tvec4 diffuseColor = vec4( wCol, opacity );');
    // glints: interference of three drifting sine fields; only the rare near-peak
    // survives the smoothstep -> sparse glitter. Added before fog so distance fades them.
    sh.fragmentShader=sh.fragmentShader.replace('#include <fog_fragment>',
      'float g1 = sin(dot(vWc, vec2( 1.7, 0.9)) + uTime*1.3);\n'+
      '\tfloat g2 = sin(dot(vWc, vec2(-1.1, 1.9)) - uTime*1.0);\n'+
      '\tfloat g3 = sin(dot(vWc, vec2( 0.7,-1.3)) + uTime*0.7);\n'+
      '\tfloat glint = smoothstep(0.90, 1.0, (g1+g2+g3)*0.3333);\n'+
      '\tfloat shoreGlint = mix(1.4, 1.0, smoothstep(0.0, 22.0, vShore));\n'+   // extra sparkle on the bright shore band
      '\tgl_FragColor.rgb += vec3(1.0,0.94,0.80) * glint * 0.55 * shoreGlint;\n'+
      '\t#include <fog_fragment>');
  };
  return m;
}

export function buildCoast(){
  // Junction-WELDED vertex tangents. Each coast piece smooths its own vertex
  // tangents but clamps at its endpoints, so two pieces meeting at a corner
  // disagreed about the tangent there — slabs/piles tore at the seams (the
  // harbor-mouth join ~[151,16], the peninsula-tip join ~[196,-25]). Averaging
  // the shared-endpoint tangents makes both fans rotate through the same
  // bisector, so the terraces wrap the corner instead of tearing. Pure
  // geometry — no rng, and every rand()/rng() call count below is unchanged.
  const VTS=COAST_SEGS.map(vertexTangents);
  const VT_TIP=vertexTangents(TIP_SEGS);
  const weld=(VA,ia,VB,ib)=>{
    const x=VA[ia][0]+VB[ib][0],z=VA[ia][1]+VB[ib][1],l=Math.hypot(x,z)||1;
    VA[ia]=VB[ib]=[x/l,z/l];
  };
  weld(VTS[0],VTS[0].length-1,VTS[3],0);   // rocks north tip -> mouth shore
  weld(VTS[4],VTS[4].length-1,VTS[0],0);   // corner SE join -> rocks south end
  weld(VT_TIP,VT_TIP.length-1,VTS[1],0);   // tip SE arc -> peninsula lake edge
  const openRuns=[...COAST_SEGS.map((s,i)=>[s,VTS[i]]),[TIP_SEGS,VT_TIP]];

  // terrace blocks — instanced, jittered for the uneven limestone look.
  // Warm-GRAY concrete family (the real Belmont revetment is a warm gray, not the
  // old cream/beige) — desaturated a touch, still cozy/toon. Box ORIENTATION and
  // seaward offset follow a smoothly-interpolated VERTEX tangent (not the raw
  // per-segment tangent), so the slabs stop sawtoothing where the coast curves
  // tightly (harbor mouth, peninsula tip, Diversey corner); tight arcs also get
  // proportionally longer slabs so neighbours overlap instead of gapping. Slabs
  // over the pier SLIP are skipped (carved to water). Every per-box rand()/rng()
  // draw stays UNCHANGED in count+order (skipped slabs still draw theirs) -> the
  // world rng order is bit-for-bit intact; no towels/flowers move.
  {
    const cols=[0xc7ccb8,0xbcc1ad,0xb1b6a1,0xa6ab95,0x999e86].map(c=>new THREE.Color(c));
    const boxes=[];
    for(let ci=0;ci<COAST_SEGS.length;ci++){
      const segs=COAST_SEGS[ci],VT=VTS[ci];   // junction-welded tangents (see top of buildCoast)
      for(let j=0;j<segs.length;j++){
        const s=segs[j],a=VT[j],b=VT[j+1];
        const turn=Math.acos(clamp(a[0]*b[0]+a[1]*b[1],-1,1));   // arc this segment sweeps
        const xtra=Math.min(1.3,turn*3.0);                       // fatten slabs on tight curves to close gaps
        for(let t=0;t<s.len;t+=2.2){
          const u=t/s.len;
          let tgx=a[0]+(b[0]-a[0])*u,tgz=a[1]+(b[1]-a[1])*u;      // smoothly-varying tangent
          const tl=Math.hypot(tgx,tgz)||1;tgx/=tl;tgz/=tl;
          const nsx=-tgz,nsz=tgx,srot=Math.atan2(tgx,tgz);
          const cx=s.ax+s.tx*t,cz=s.az+s.tz*t,zc=cz;
          const p=tierProfile(zc);let acc=0;
          for(let i=0;i<p.w.length;i++){
            const w=p.w[i]+rand(-0.25,0.25);
            const off=acc+p.w[i]/2+rand(-0.12,0.12);
            const bx=cx+nsx*off,bz=cz+nsz*off;
            const box={
              x:bx, z:bz,
              y:-i*p.step-0.4+rand(-0.03,0.03),
              // On a convex arc the OUTER tiers sweep a longer arc than the coast
              // line the samples walk, so fixed-length slabs gap out there (the
              // torn tip/mouth steps). Scale the turn-fatten by the tier's seaward
              // offset — same rand() count, purely deterministic.
              l:2.4+xtra*(1+off*0.14)+rand(-0.25,0.45), w,
              rot:srot+rand(-0.035,0.035),
              c:cols[i<2?(rng()*3|0):(2+(rng()*3|0))]
            };
            if(!inPierChannel(bx,bz))boxes.push(box);            // carve the pier slip (rng already consumed)
            acc+=p.w[i];
          }
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
    const cols=[0xc7ccb8,0xbcc1ad,0xb1b6a1,0xa6ab95,0x999e86].map(c=>new THREE.Color(c));
    let h=0x9e3779b1>>>0;                     // local deterministic jitter (no shared rng)
    const jr=()=>{h^=h<<13;h>>>=0;h^=h>>>17;h^=h<<5;h>>>=0;return h/4294967296;};
    const jit=a=>(jr()*2-1)*a;
    const boxes=[];
    const VT=VT_TIP;   // junction-welded with COAST_PEN (see top of buildCoast)
    for(let j=0;j<TIP_SEGS.length;j++){
      const s=TIP_SEGS[j],a=VT[j],b=VT[j+1];
      const turn=Math.acos(clamp(a[0]*b[0]+a[1]*b[1],-1,1)),xtra=Math.min(1.3,turn*3.0);   // smooth the horseshoe
      for(let t=0;t<s.len;t+=1.7){   // denser than the straight coasts: the horseshoe's outer tiers need the coverage (own jitter rng — shared-rng order untouched)
        const u=t/s.len;let tgx=a[0]+(b[0]-a[0])*u,tgz=a[1]+(b[1]-a[1])*u;const tl=Math.hypot(tgx,tgz)||1;tgx/=tl;tgz/=tl;
        const nsx=-tgz,nsz=tgx,srot=Math.atan2(tgx,tgz);
        const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;
        const p=tierProfile(cz);let acc=0;
        for(let i=0;i<p.w.length;i++){
          const w=p.w[i]+jit(0.25);
          const off=acc+p.w[i]/2+jit(0.12);
          boxes.push({x:cx+nsx*off, z:cz+nsz*off,
            y:-i*p.step-0.4+jit(0.03), l:2.4+xtra*(1+off*0.14)+jit(0.35), w,
            rot:srot+jit(0.035),
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

  // waterline WET-STAIN band: a subtle darker warm-gray strip hugging the OUTER
  // (water) edge of the bottom promenade — the wet stain the concrete takes at the
  // waterline in the reference photo. Deterministic (no shared rng), one InstancedMesh,
  // skipped in the pier slip. Sits flush on the promenade (y≈-1.9) covering its outer ~1.7 m.
  {
    const band=[];
    for(const[C,VT]of openRuns){
      for(let j=0;j<C.length;j++){
        const s=C[j],a=VT[j],b=VT[j+1];
        for(let t=0;t<s.len;t+=1.9){
          const u=t/s.len;
          let tgx=a[0]+(b[0]-a[0])*u,tgz=a[1]+(b[1]-a[1])*u;const tl=Math.hypot(tgx,tgz)||1;tgx/=tl;tgz/=tl;
          const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;
          const p=tierProfile(cz),tot=profileTotal(cz),lat=tot-1.35;   // outer band of the promenade, FLUSH inside the slab edge (no overhang past the piles)
          const bx=cx+(-tgz)*lat,bz=cz+tgx*lat;
          if(inPierChannel(bx,bz))continue;
          band.push({x:bx,z:bz,y:-(p.w.length-1)*p.step+0.06,rot:Math.atan2(tgx,tgz)});
        }
      }
    }
    const inst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),curveMat(new THREE.MeshToonMaterial({gradientMap:gmap})),band.length);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3(),E=new THREE.Euler();
    const wet=new THREE.Color(0x7a7b64);
    band.forEach((b,i)=>{E.set(0,b.rot,0);Q.setFromEuler(E);M.compose(V.set(b.x,b.y,b.z),Q,S.set(2.6,0.06,2.5));inst.setMatrixAt(i,M);inst.setColorAt(i,wet);});
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
  // along every open-lake revetment, at the outer edge of the bottom tier —
  // offset along the junction-welded interpolated tangent so the pile row
  // sweeps the corners with the slabs instead of tearing at piece seams
  for(const[S2,VT]of openRuns){
    for(let j=0;j<S2.length;j++){
      const s=S2[j],a=VT[j],b=VT[j+1];
      for(let t=0;t<s.len;t+=1.15){
        const u=t/s.len;
        let tgx=a[0]+(b[0]-a[0])*u,tgz=a[1]+(b[1]-a[1])*u;const tl=Math.hypot(tgx,tgz)||1;tgx/=tl;tgz/=tl;
        const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;
        const p=tierProfile(cz),tot=profileTotal(cz);
        const topY=-(p.w.length-1)*p.step+0.06;
        const k=pileData.length,jut=(k%2?0.26:-0.04);
        const px=cx+(-tgz)*(tot+jut),pz=cz+tgx*(tot+jut);
        if(inPierChannel(px,pz))continue;                       // pier slip opens to the lake — no wall across it
        pileData.push({x:px,z:pz,
          y:(topY-3.1)/2,h:topY+3.1,rot:Math.atan2(tgx,tgz),dark:k%2});
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

  // continuous WALL FACES — an opaque concrete strip directly behind every
  // pile line, from the promenade/seawall top down to below the waterline.
  // The piles alone are ribs with ~0.65 m gaps between them; from the water
  // you could see grass/sky straight through (the 'transparent seawall' bug).
  // The strip closes every gap so all walls read opaque from every angle.
  // One InstancedMesh, fully deterministic (no shared rng).
  {
    const faces=[];
    // open-lake revetments: tucked just inside the bottom-tier slab edge, top
    // kept below the promenade surface so it never pokes through the walkway
    for(const[S2,VT]of openRuns){
      for(let j=0;j<S2.length;j++){
        const s=S2[j],a=VT[j],b=VT[j+1];
        for(let t=0;t<s.len;t+=2.0){
          const u=t/s.len;
          let tgx=a[0]+(b[0]-a[0])*u,tgz=a[1]+(b[1]-a[1])*u;const tl=Math.hypot(tgx,tgz)||1;tgx/=tl;tgz/=tl;
          const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;
          const p=tierProfile(cz),tot=profileTotal(cz);
          const topY=-(p.w.length-1)*p.step-0.06;
          const fx=cx+(-tgz)*(tot-0.42),fz=cz+tgx*(tot-0.42);
          if(inPierChannel(fx,fz))continue;
          faces.push({x:fx,z:fz,top:topY,bot:-3.2,rot:Math.atan2(tgx,tgz)});
        }
      }
    }
    // basin + mouth seawalls: directly behind the wallLine pile ribs, full height
    for(const pts of CH.seawallLines({P_START,BASIN_W})){
      const S2=buildSegs(pts);
      for(const s of S2){
        for(let t=0;t<s.len;t+=2.0){
          const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;
          faces.push({x:cx-s.nx*0.38,z:cz-s.nz*0.38,top:CH.SEAWALL_Y.top,bot:CH.SEAWALL_Y.bot,rot:Math.atan2(s.tx,s.tz)});
        }
      }
    }
    const inst=new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.45,1,2.45),
      curveMat(new THREE.MeshToonMaterial({color:0x8f8e79,gradientMap:gmap})),faces.length);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3(),E=new THREE.Euler();
    faces.forEach((f,i)=>{
      E.set(0,f.rot,0);Q.setFromEuler(E);
      M.compose(V.set(f.x,(f.top+f.bot)/2,f.z),Q,S.set(1,f.top-f.bot,1));
      inst.setMatrixAt(i,M);
    });
    inst.instanceMatrix.needsUpdate=true;
    scene.add(inst);
  }

  // ------------------------------ ground --------------------------------
  function shapeFrom(pts){const s=new THREE.Shape();s.moveTo(pts[0][0],-pts[0][1]);for(let i=1;i<pts.length;i++)s.lineTo(pts[i][0],-pts[i][1]);s.closePath();return s}
  function flatShape(pts,y,mat){const g=new THREE.ShapeGeometry(shapeFrom(pts));g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,mat);m.position.y=y;return m}
  scene.add(flatShape(LAND,0,toon(0x7ecb6f)));

  const wgeo=new THREE.PlaneGeometry(CH.WATER.size,CH.WATER.size,CH.WATER.seg,CH.WATER.seg);wgeo.rotateX(-Math.PI/2);
  // per-vertex shore distance (world xz) -> banded water color in the shader
  // (~85 ms at full 181x181 res; no rng, no geometry change -> determinism intact).
  {
    const wcx=CH.WATER.cx,wcz=CH.WATER.cz,pos=wgeo.attributes.position,n=pos.count;
    const aShore=new Float32Array(n);
    for(let i=0;i<n;i++)aShore[i]=shoreDist(pos.getX(i)+wcx,pos.getZ(i)+wcz);
    wgeo.setAttribute('aShore',new THREE.BufferAttribute(aShore,1));
  }
  water=new THREE.Mesh(wgeo,livingWaterMat(0x2fa3b5));
  water.position.set(CH.WATER.cx,WATER_Y,CH.WATER.cz);scene.add(water);   // centered on the tall map so the lake never runs out

  // dog beach — sloped sand down to the basin water
  {
    const g=new THREE.PlaneGeometry(CH.DOG_BEACH.mesh.w,CH.DOG_BEACH.mesh.d,CH.DOG_BEACH.mesh.segW,CH.DOG_BEACH.mesh.segD);g.rotateX(-Math.PI/2);
    const cx=CH.DOG_BEACH.mesh.cx,cz=CH.DOG_BEACH.mesh.cz,pos=g.attributes.position;
    for(let i=0;i<pos.count;i++){
      const wx=pos.getX(i)+cx,wz=pos.getZ(i)+cz;
      const h=beachH(wx,wz);
      // outside the cove bounds: the NORTH fringe meets the lawn at 0, but the
      // SOUTH (waterline) fringe must keep dipping BELOW the water — snapping
      // it to 0 built a phantom sand wall at the beach foot that the player
      // could walk straight through (the user's cove-seam bug).
      pos.setY(i,h===null?(wz>CH.DOG_BEACH.bounds.z1?CH.DOG_BEACH.slope.depth-0.3:0):h+0.03);
    }
    g.computeVertexNormals();
    const m=new THREE.Mesh(g,toon(0xf0e2bd,{}));m.position.set(cx,0,cz);scene.add(m);

    // cove SKIRT: a vertical ribbon down the cove's landward arc (the LAND
    // polygon's own points) sealing the y=0 land edge to the dipping sand and
    // closing the see-through gaps at the seawall junctions on both sides.
    // DoubleSide per the opaque-from-every-angle rule. Deterministic, 1 mesh.
    {
      const arc=[[85,-327],[88,-333],[90,-339],[95,-341],[105,-341],[110,-339],[112,-333],[113,-330]];
      const spos=[],sidx=[];
      arc.forEach(([ax,az],i)=>{
        spos.push(ax,0.02,az, ax,-2.6,az);
        if(i<arc.length-1){const a=i*2;sidx.push(a,a+1,a+2, a+1,a+3,a+2);}
      });
      const sg=new THREE.BufferGeometry();
      sg.setAttribute('position',new THREE.Float32BufferAttribute(spos,3));
      sg.setIndex(sidx);sg.computeVertexNormals();
      scene.add(new THREE.Mesh(sg,toon(0xe6d8b4,{mat:{side:THREE.DoubleSide}})));
    }

    // seawall-junction PATCHES: the LAND cove arc spans x 85..113 but the sand
    // mesh/bounds span x 88..112 — the leftover notches beside the gates were
    // open water reaching the fence. Fill each with a wet-sand shelf just
    // above the waterline (visual only; walkability untouched).
    for(const[px0,px1]of[[83.6,88.4],[111.6,113.8]]){
      const pg=new THREE.PlaneGeometry(px1-px0,8.5);pg.rotateX(-Math.PI/2);
      const pm=new THREE.Mesh(pg,toon(0xe6d8b4,{mat:{side:THREE.DoubleSide}}));
      pm.position.set((px0+px1)/2,-2.05,-330.5);scene.add(pm);
    }
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
