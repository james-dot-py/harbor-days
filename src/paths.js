import * as THREE from 'three';
import { scene, toon, bmat } from './core.js';
import * as CH from './data/chicago.js';
export { TRAIL_MAIN, TRAIL_SPUR, TRAIL_LOOP, TRAIL_CONNECTOR, TRAIL_ENTRANCE } from './data/chicago.js';

// ------------------------------- paths --------------------------------
// The Lakefront Trail's MAIN run is a DUAL path: an asphalt BIKE ribbon on
// the TRAIL_MAIN centerline (with yellow center dashes) and a parallel
// crushed-limestone WALKING ribbon offset one grass-strip to the side. The
// contracts other modules rely on stay put: `mainCurve` + `pathSamples` are
// the BIKE centerline (cyclists, benches, lamps, traillife consume them);
// `walkCurve` is the new walking-path centerline (same shape, for future use).
export const pathSamples=[];
// pathSamples2 — samples of ribbons ADDED/RESHAPED after the world-rng order
// froze (task 023: the peanut TRAIL_LOOP + TRAIL_ENTRANCE). They are kept out
// of pathSamples during the build so the tree-rejection scan (props.js, a
// shared-rng consumer) sees a byte-identical array; local-rng consumers
// (garden boulders, prairie) probe BOTH arrays, and main.js merges these into
// pathSamples AFTER buildProps so every pack still keeps off the new ribbons.
export const pathSamples2=[];
// 084: the COMPRESSED main trail's own dual-ribbon samples. Kept out of BOTH
// pathSamples (the ghost covers the frozen tree-placement scan) AND
// pathSamples2 (props' tree POST-filter near2 scans that during buildProps —
// feeding it the new main line re-filtered trees the ghost had already
// cleared, shifting every later tree's per-tree m32 index: canopy reshuffle).
// main.js merges this into pathSamples AFTER buildProps so packs still keep
// off the real trail.
export const pathSamplesMain=[];
// 088: every REAL drawn ribbon registers its shifted centerline polyline here
// (via ribbonOn). {pts:[[x,z],...], w:width}. Ghost sample blocks
// (TRAIL_MAIN_GHOST084, TRAIL_LOOP_GHOST) are inline loops that never call
// ribbonOn, so they DO NOT register — ribbonLanes === the real walkable ribbons.
// Consumed by the prop-clearance audit + the props.js tree clearance nudge.
export const ribbonLanes=[];
// 101: the DRAWN dual-trail centerlines by name (ribbonOn returns), exposed on
// __hd.trailLanes by main.js so the npc-paths gate probe measures movers
// against the real ribbons — never a node-side curve mirror.
export const trailLanes={walk:null,bike:null,mtrWalk:null,mtrBike:null};
export let mainCurve=null, walkCurve=null, spurCurve=null;

function curveOf(ctrl){ return new THREE.CatmullRomCurve3(ctrl.map(p=>new THREE.Vector3(p[0],0,p[1]))); }

const _frT=new THREE.Vector3();
// THE trail frame convention — point + LEFT normal (-t.z, t.x) of `curve` at
// parameter u. ribbonOn offsets ribbons along this normal and traillife's
// mover tables sample the same frame, so movers stay glued to the DRAWN
// ribbon. (r128 getTangent is the numeric delta tangent; both consumers read
// identical values.)
export function trailFrame(curve,u,p,n){ curve.getPoint(u,p); curve.getTangent(u,_frT); n.set(-_frT.z,0,_frT.x); }

// Draw a paved ribbon of `width` following `curve`, with its centerline
// shifted laterally by `shift` (along the left normal). Collects the shifted
// centerline into pathSamples (so props stay off BOTH ribbons) and returns it.
function ribbonOn(curve,width,color,y,shift,samples=pathSamples){
  const n=Math.max(60,Math.round(curve.getLength()/2));
  const pos=[],idx=[],cl=[];
  const p=new THREE.Vector3(),t=new THREE.Vector3();
  for(let i=0;i<=n;i++){
    const u=i/n; trailFrame(curve,u,p,t);
    const nx=t.x,nz=t.z,w=width/2;
    const cx=p.x+nx*shift,cz=p.z+nz*shift;
    cl.push([cx,cz]); samples.push([cx,cz]);
    pos.push(cx+nx*w,y,cz+nz*w, cx-nx*w,y,cz-nz*w);
    // wind faces UP (normals +y) so the ribbon is visible from above — the
    // old winding faced down and got back-face culled ("no walkways" bug).
    if(i<n){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setIndex(idx);g.computeVertexNormals();
  scene.add(new THREE.Mesh(g,toon(color)));
  ribbonLanes.push({pts:cl,w:width});   // 088: register the real drawn ribbon
  return cl;
}

export function buildPaths(){
  const st=CH.TRAIL_STYLE;
  const walkOff=st.bike.width/2+st.gap+st.walk.width/2;   // 4.0 m centerline separation
  // 084 GHOST of the pre-084 TRAIL_MAIN: push its dual-ribbon samples (walk-
  // offset pass then bike pass, replicating ribbonOn's sample math exactly)
  // into pathSamples AT MAIN'S ORIGINAL BUILD SLOT — same content, count and
  // stride-3 phase, so the shared-rng tree-rejection scan (props.js nearPath)
  // is bit-for-bit unchanged. The REAL (compressed) MAIN draws just below
  // into pathSamples2, like every post-freeze ribbon. Never remove.
  {
    const gm=curveOf(CH.TRAIL_MAIN_GHOST084);
    const n=Math.max(60,Math.round(gm.getLength()/2));
    const p=new THREE.Vector3(),t=new THREE.Vector3();
    for(const shift of[walkOff,0]){
      for(let i=0;i<=n;i++){
        const u=i/n; gm.getPoint(u,p); gm.getTangent(u,t);
        pathSamples.push([p.x+(-t.z)*shift,p.z+t.x*shift]);
      }
    }
  }
  // MAIN dual path (084 compressed): walking ribbon (offset) then bike ribbon
  // (centerline) — drawn for real, samples into pathSamplesMain ONLY (see note
  // at its declaration: pathSamples2 is scanned by props' tree post-filter).
  mainCurve=curveOf(CH.TRAIL_MAIN);
  const walkCl=ribbonOn(mainCurve,st.walk.width,st.walk.color,st.walk.y,walkOff,pathSamplesMain);
  trailLanes.bike=ribbonOn(mainCurve,st.bike.width,st.bike.color,st.bike.y,0,pathSamplesMain);
  trailLanes.walk=walkCl;
  walkCurve=curveOf(walkCl.filter((_,i)=>i%8===0||i===walkCl.length-1));
  // SPUR: single ribbon.
  spurCurve=curveOf(CH.TRAIL_SPUR);
  ribbonOn(spurCurve,st.spur.width,st.spur.color,st.spur.y,0);
  // GHOST of the retired r=16 garden circle (task 023): push its ribbonOn-
  // identical centerline samples into pathSamples AT THE LOOP'S ORIGINAL BUILD
  // SLOT — same content, same count, same stride-3 phase — so the shared-rng
  // tree-rejection scan (props.js nearPath) is bit-for-bit unchanged and NO
  // world scatter moves. The REAL (peanut) loop draws at the end of this
  // function into pathSamples2. Never remove; see CH.TRAIL_LOOP_GHOST.
  {
    const gc=curveOf(CH.TRAIL_LOOP_GHOST);
    const n=Math.max(60,Math.round(gc.getLength()/2));
    const p=new THREE.Vector3(),t=new THREE.Vector3();
    for(let i=0;i<=n;i++){
      const u=i/n; gc.getPoint(u,p); gc.getTangent(u,t);   // getTangent kept: ribbonOn parity (no state, but keep the call pattern obvious)
      const nx=-t.z;
      pathSamples.push([p.x+nx*0,p.z+t.x*0]);
    }
  }
  // paved connector: (moved) Belmont underpass mouth -> AIDS-garden loop west edge
  ribbonOn(curveOf(CH.TRAIL_CONNECTOR),st.loop.width,st.loop.color,st.loop.y,0);
  // Bird Sanctuary interior walking LOOP (crushed limestone) — the hero room's
  // winding path. Built here (not in structures) so ribbonOn registers it in
  // pathSamples: trees/props/lawnlife all keep off it automatically.
  ribbonOn(curveOf(CH.sanctuaryLoop()),CH.SANCTUARY.path.width,CH.SANCTUARY.path.color,CH.SANCTUARY.path.y,0);
  // Diversey-corner lawn (task 021, refs/diversey-corner/ IMG_0398): the pale
  // concrete path curving to the pier root + the worn dirt DESIRE PATH
  // paralleling it on the seaward side. ribbonOn registers both in pathSamples
  // (corner lawn-life nudges clear); appended LAST so every earlier consumer's
  // sample indices are unchanged. ribbonOn is rng-free -> world scatter holds.
  ribbonOn(curveOf(CH.CORNER_PARK.desire.pts),CH.CORNER_PARK.desire.width,CH.CORNER_PARK.desire.color,CH.CORNER_PARK.desire.y,0);
  ribbonOn(curveOf(CH.CORNER_PARK.path.pts),CH.CORNER_PARK.path.width,CH.CORNER_PARK.path.color,CH.CORNER_PARK.path.y,0);
  // Task 023 garden ribbons — LAST, and into pathSamples2 ONLY (pathSamples
  // must stay byte-identical for the shared world rng; see the ghost above):
  // the PEANUT plaza loop (statue ring + SW lawn lobe, one closed outline)
  // and the ENTRANCE→LAKE path from the monument forecourt to the revetment top.
  ribbonOn(curveOf(CH.TRAIL_LOOP),st.loop.width,st.loop.color,st.loop.y,0,pathSamples2);
  ribbonOn(curveOf(CH.TRAIL_ENTRANCE),st.loop.width,st.loop.color,st.loop.y,0,pathSamples2);
  // MONTROSE north growth (v0.6, task 069): the dual Lakefront Trail CONTINUES
  // north as a NEW ribbon — walk ribbon then bike centerline, same styling as
  // MAIN. 088 REROUTE (issue 030): the OLD line's dual samples are pushed into
  // pathSamples2 as a byte-identical GHOST at this original build slot
  // (replicating ribbonOn's sample math exactly — walk-offset pass then bike
  // pass, same n, same order) so the tree post-filter (props.js near2) and every
  // local clearD consumer see an UNCHANGED array; the REAL (rerouted) ribbons
  // draw below into pathSamplesMain, like MAIN itself (the 084 law). Never remove.
  {
    const gm=curveOf(CH.TRAIL_MONTROSE_GHOST088);
    const n=Math.max(60,Math.round(gm.getLength()/2));
    const p=new THREE.Vector3(),t=new THREE.Vector3();
    for(const shift of[walkOff,0]){
      for(let i=0;i<=n;i++){
        const u=i/n; gm.getPoint(u,p); gm.getTangent(u,t);
        pathSamples2.push([p.x+(-t.z)*shift,p.z+t.x*shift]);
      }
    }
  }
  const montroseCurve=curveOf(CH.TRAIL_MONTROSE);
  trailLanes.mtrWalk=ribbonOn(montroseCurve,st.walk.width,st.walk.color,st.walk.y,walkOff,pathSamplesMain);
  trailLanes.mtrBike=ribbonOn(montroseCurve,st.bike.width,st.bike.color,st.bike.y,0,pathSamplesMain);
  // yellow center dashes on the paved BIKE path + the SPUR + Montrose (not the walkway)
  {
    const dashes=[];
    for(const cv of[mainCurve,spurCurve,montroseCurve]){
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
  // MONTROSE POINT sanctuary paths (task 071): gate -> hedge south flank -> around
  // the east end, + the tip loop back to the mole-root walk. Crushed limestone
  // (walk styling); NEW ribbons -> pathSamples2 ONLY (ribbonOn is rng-free).
  const MP=CH.MONTROSE_POINT;
  ribbonOn(curveOf(MP.paths.entrance),MP.paths.width,st.walk.color,st.walk.y,0,pathSamples2);
  ribbonOn(curveOf(MP.paths.loop),MP.paths.width,st.walk.color,st.walk.y,0,pathSamples2);
}
