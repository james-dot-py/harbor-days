import * as THREE from 'three';
import { scene, toon, bmat } from './core.js';
import * as CH from './data/chicago.js';
export { TRAIL_MAIN, TRAIL_SPUR, TRAIL_LOOP, TRAIL_CONNECTOR } from './data/chicago.js';

// ------------------------------- paths --------------------------------
// The Lakefront Trail's MAIN run is a DUAL path: an asphalt BIKE ribbon on
// the TRAIL_MAIN centerline (with yellow center dashes) and a parallel
// crushed-limestone WALKING ribbon offset one grass-strip to the side. The
// contracts other modules rely on stay put: `mainCurve` + `pathSamples` are
// the BIKE centerline (cyclists, benches, lamps, traillife consume them);
// `walkCurve` is the new walking-path centerline (same shape, for future use).
export const pathSamples=[];
export let mainCurve=null, walkCurve=null, spurCurve=null;

function curveOf(ctrl){ return new THREE.CatmullRomCurve3(ctrl.map(p=>new THREE.Vector3(p[0],0,p[1]))); }

// Draw a paved ribbon of `width` following `curve`, with its centerline
// shifted laterally by `shift` (along the left normal). Collects the shifted
// centerline into pathSamples (so props stay off BOTH ribbons) and returns it.
function ribbonOn(curve,width,color,y,shift){
  const n=Math.max(60,Math.round(curve.getLength()/2));
  const pos=[],idx=[],cl=[];
  const p=new THREE.Vector3(),t=new THREE.Vector3();
  for(let i=0;i<=n;i++){
    const u=i/n; curve.getPoint(u,p); curve.getTangent(u,t);
    const nx=-t.z,nz=t.x,w=width/2;
    const cx=p.x+nx*shift,cz=p.z+nz*shift;
    cl.push([cx,cz]); pathSamples.push([cx,cz]);
    pos.push(cx+nx*w,y,cz+nz*w, cx-nx*w,y,cz-nz*w);
    // wind faces UP (normals +y) so the ribbon is visible from above — the
    // old winding faced down and got back-face culled ("no walkways" bug).
    if(i<n){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setIndex(idx);g.computeVertexNormals();
  scene.add(new THREE.Mesh(g,toon(color)));
  return cl;
}

export function buildPaths(){
  const st=CH.TRAIL_STYLE;
  const walkOff=st.bike.width/2+st.gap+st.walk.width/2;   // 4.0 m centerline separation
  // MAIN dual path: walking ribbon (offset) then bike ribbon (centerline).
  mainCurve=curveOf(CH.TRAIL_MAIN);
  const walkCl=ribbonOn(mainCurve,st.walk.width,st.walk.color,st.walk.y,walkOff);
  ribbonOn(mainCurve,st.bike.width,st.bike.color,st.bike.y,0);
  walkCurve=curveOf(walkCl.filter((_,i)=>i%8===0||i===walkCl.length-1));
  // SPUR + garden LOOP: single ribbons.
  spurCurve=curveOf(CH.TRAIL_SPUR);
  ribbonOn(spurCurve,st.spur.width,st.spur.color,st.spur.y,0);
  ribbonOn(curveOf(CH.TRAIL_LOOP),st.loop.width,st.loop.color,st.loop.y,0);
  // paved connector: (moved) Belmont underpass mouth -> AIDS-garden loop west edge
  ribbonOn(curveOf(CH.TRAIL_CONNECTOR),st.loop.width,st.loop.color,st.loop.y,0);
  // Bird Sanctuary interior walking LOOP (crushed limestone) — the hero room's
  // winding path. Built here (not in structures) so ribbonOn registers it in
  // pathSamples: trees/props/lawnlife all keep off it automatically.
  ribbonOn(curveOf(CH.sanctuaryLoop()),CH.SANCTUARY.path.width,CH.SANCTUARY.path.color,CH.SANCTUARY.path.y,0);
  // yellow center dashes on the paved BIKE path + the SPUR (not the walkway)
  {
    const dashes=[];
    for(const cv of[mainCurve,spurCurve]){
      const L=cv.getLength(),n=Math.floor(L/st.dash.spacing);
      for(let i=0;i<n;i++){
        const u=(i+0.5)/n,p=cv.getPoint(u),tg=cv.getTangent(u);
        dashes.push({x:p.x,z:p.z,rot:Math.atan2(tg.x,tg.z)});
      }
    }
    const inst=new THREE.InstancedMesh(new THREE.PlaneGeometry(st.dash.w,st.dash.len),bmat(st.dash.color),dashes.length);
    const M=new THREE.Matrix4(),S=new THREE.Vector3(1,1,1),V=new THREE.Vector3();
    const tilt=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
    dashes.forEach((d,i)=>{
      const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,d.rot,0)).multiply(tilt);
      M.compose(V.set(d.x,st.dash.y,d.z),q,S);inst.setMatrixAt(i,M);});
    inst.instanceMatrix.needsUpdate=true;scene.add(inst);
  }
}
