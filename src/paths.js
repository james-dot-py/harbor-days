import * as THREE from 'three';
import { scene, toon, bmat } from './core.js';
import * as CH from './data/chicago.js';
// 102: seam/edge geometry SHARED with tools/path-continuity.mjs (the
// permanent gate) — one definition, engine and probe can never fork.
import { dirOf, radiusClamp, joinSeam, weldSeam } from './pathgeom.js';
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

// 106 FOOTSTEP SURFACE — the paved Lakefront Trail corridor (asphalt bike +
// crushed-limestone walk ribbons, MAIN + Montrose, plus the peninsula SPUR),
// registered from the DRAWN centerlines at buildPaths so the sound follows the
// real pavement. Each lane carries a padded bbox for a cheap early-out; the hit
// test is point-to-segment distance ≤ half-width. Module-const scratch only →
// zero per-step allocation (footsteps fire every ~0.26 s). This is SOUND, not
// walkability, so it needs no tools/walkprobe.mjs mirror.
const STEP_TRAIL=[];
function stepLane(cl,width){
  if(!cl||cl.length<2)return;
  let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
  for(const p of cl){if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<z0)z0=p[1];if(p[1]>z1)z1=p[1];}
  const hw=width/2;
  STEP_TRAIL.push({pts:cl,hw2:hw*hw,x0:x0-hw,x1:x1+hw,z0:z0-hw,z1:z1+hw});
}
export function onTrail(x,z){
  for(let L=0;L<STEP_TRAIL.length;L++){
    const t=STEP_TRAIL[L];
    if(x<t.x0||x>t.x1||z<t.z0||z>t.z1)continue;
    const pts=t.pts;
    for(let i=0;i<pts.length-1;i++){
      const ax=pts[i][0],az=pts[i][1],dx=pts[i+1][0]-ax,dz=pts[i+1][1]-az;
      const l2=dx*dx+dz*dz;
      let u=l2>0?((x-ax)*dx+(z-az)*dz)/l2:0;u=u<0?0:u>1?1:u;
      const ex=x-(ax+dx*u),ez=z-(az+dz*u);
      if(ex*ex+ez*ez<=t.hw2)return true;
    }
  }
  return false;
}

function curveOf(ctrl){ return new THREE.CatmullRomCurve3(ctrl.map(p=>new THREE.Vector3(p[0],0,p[1]))); }

const _frT=new THREE.Vector3();
// THE trail frame convention — point + LEFT normal (-t.z, t.x) of `curve` at
// parameter u. ribbonOn offsets ribbons along this normal and traillife's
// mover tables sample the same frame, so movers stay glued to the DRAWN
// ribbon. (r128 getTangent is the numeric delta tangent; both consumers read
// identical values.)
export function trailFrame(curve,u,p,n){ curve.getPoint(u,p); curve.getTangent(u,_frT); n.set(-_frT.z,0,_frT.x); }

// Junction discs — a hard-kink join whose miter would fold instead keeps both
// ribbons' natural caps and covers the junction with a paved DOT (one shared
// mesh via flushJunctions, y+0.006 up the 088 ladder): no wedge, no fold, no
// z-fight — a real paved node where paths meet at a corner. Task 102.
export const junctions=[];
function addJunction(x,z,r,y,color){ junctions.push({x,z,r,y,color}); }
export function flushJunctions(){
  if(!junctions.length)return;
  const byColor=new Map();
  for(const j of junctions){ const a=byColor.get(j.color)||[]; a.push(j); byColor.set(j.color,a); }
  for(const [color,list] of byColor){
    const inst=new THREE.InstancedMesh(new THREE.CircleGeometry(1,24),toon(color),list.length);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0)),S=new THREE.Vector3(),V=new THREE.Vector3();
    list.forEach((j,i)=>{ M.compose(V.set(j.x,j.y,j.z),Q,S.set(j.r,j.r,1)); inst.setMatrixAt(i,M); });
    inst.instanceMatrix.needsUpdate=true; scene.add(inst);
  }
}

// Draw a paved ribbon of `width` following `curve`, with its centerline
// shifted laterally by `shift` (along the left normal). Collects the shifted
// centerline into pathSamples (so props stay off BOTH ribbons) and returns it.
// JOIN/MITRE (task 102 — "malformed path seams impossible, not patched"):
// a ribbon that CONTINUES a previous one passes the predecessor's returned
// `cl.endFrame`; its first centerline station snaps to the predecessor's last
// (bit-exact) and BOTH seam stations' edges are replaced by the two miter
// intersections (each side's edge lines extended to a shared point, paired by
// side so >90° kinks don't swap) — the seam then shares ONE edge exactly: no
// gap, no overlap, no step, at any kink angle. A ribbon whose curve is a
// CLOSED outline (first==last control point — the garden peanut, the
// sanctuary loop) miters its own weld the same way. Determinism-safe: miters
// move only EDGE vertices; centerline samples (the frozen arrays) never move.
function ribbonOn(curve,width,color,y,shift,samples=pathSamples,join=null){
  const n=Math.max(60,Math.round(curve.getLength()/2));
  const cl=[],EL=[],ER=[];
  const p=new THREE.Vector3(),t=new THREE.Vector3();
  for(let i=0;i<=n;i++){
    const u=i/n; trailFrame(curve,u,p,t);
    const nx=t.x,nz=t.z,w=width/2;
    const cx=p.x+nx*shift,cz=p.z+nz*shift;
    cl.push([cx,cz]);
    EL.push([cx+nx*w,cz+nz*w]);ER.push([cx-nx*w,cz-nz*w]);
  }
  const halfW=width/2;
  radiusClamp(cl,EL,+1); radiusClamp(cl,ER,-1);   // 102: no inner-edge darts, anywhere
  // CONTINUATION JOIN (shared math: pathgeom.joinSeam): snap our first
  // station to the predecessor's last and miter both seam stations — the
  // predecessor's last quad is rewritten through its position attribute
  // (build-time, pre-render, so no upload race). A hard kink whose miter
  // would fold keeps both natural caps under a paved dot (junctions[]).
  if(join){
    const res=joinSeam(join,cl,EL,ER,halfW);
    if(res.disc){
      addJunction(res.disc.x,res.disc.z,res.disc.r,y+0.006,color);
    }else{
      const A=join.attr.array,o=join.n*6;
      A[o]=res.mL[0];A[o+2]=res.mL[1]; A[o+3]=res.mR[0];A[o+5]=res.mR[1];
      join.attr.needsUpdate=true;
    }
  }
  // WELD: a closed outline (first==last control point) miters its own
  // start/end meeting — the garden peanut + the sanctuary loop weld clean
  // (shared math: pathgeom.weldSeam; hard kinks fall back to a paved dot).
  const P0=curve.points[0],P1=curve.points[curve.points.length-1];
  if(Math.hypot(P0.x-P1.x,P0.z-P1.z)<1e-6&&n>=4){
    const res=weldSeam(cl,EL,ER,halfW);
    if(res.disc) addJunction(res.disc.x,res.disc.z,res.disc.r,y+0.006,color);
  }
  const pos=[],idx=[];
  for(let i=0;i<=n;i++){
    samples.push([cl[i][0],cl[i][1]]);
    pos.push(EL[i][0],y,EL[i][1], ER[i][0],y,ER[i][1]);
    // wind faces UP (normals +y) so the ribbon is visible from above — the
    // old winding faced down and got back-face culled ("no walkways" bug).
    if(i<n){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setIndex(idx);g.computeVertexNormals();
  scene.add(new THREE.Mesh(g,toon(color)));
  ribbonLanes.push({pts:cl,w:width});   // 088: register the real drawn ribbon
  // the chainable end frame (join target for a continuing ribbon; the attr
  // handle lets the successor rewrite THIS ribbon's last quad to the miter)
  cl.endFrame={c:cl[n],pc:cl[n-1],l:EL[n],r:ER[n],pl:EL[n-1],pr:ER[n-1],dir:dirOf(cl[n-1],cl[n]),attr:g.getAttribute('position'),n};
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
  const spurCl=ribbonOn(spurCurve,st.spur.width,st.spur.color,st.spur.y,0);
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
  // 102 JOINS: the Montrose run CONTINUES MAIN (shared endpoint [208,-572] in
  // the data) — splice each ribbon to its MAIN counterpart's end frame so the
  // hand-off is one shared mitered edge (no gap/overlap/step by construction;
  // replaces the 069 "overlap so the ribbons join" double-pave seam).
  trailLanes.mtrWalk=ribbonOn(montroseCurve,st.walk.width,st.walk.color,st.walk.y,walkOff,pathSamplesMain,walkCl.endFrame);
  trailLanes.mtrBike=ribbonOn(montroseCurve,st.bike.width,st.bike.color,st.bike.y,0,pathSamplesMain,trailLanes.bike.endFrame);
  // yellow center dashes on the paved BIKE path + the SPUR + Montrose (not the walkway)
  // 102: dashes belong to the NETWORK's arc length, not to each curve's
  // parameter — a curve that CONTINUES the previous one (shares its exact
  // endpoint, MAIN->MONTROSE) keeps the dash PHASE across the seam so the
  // paint rhythm never stutters at a join (the old per-curve u=(i+0.5)/n
  // placement landed two dashes ~1 m apart at the hand-off). Forks/standalone
  // curves (the spur) start their own phase. rng-free, visual-only.
  // ORDER: montrose directly AFTER main — the carry compares each curve's
  // start against the PREVIOUS list entry's end, so the continuation must be
  // adjacent (main,spur,montrose silently never carried; the gate mirrors
  // this list).
  {
    const dashes=[];
    let carry=null;      // arc-length from the last placed dash to the previous curve's end
    let prevEnd=null;
    for(const cv of[mainCurve,montroseCurve,spurCurve]){
      const L=cv.getLength();
      const cont=carry!==null&&cv.getPoint(0).distanceTo(prevEnd)<1e-3;
      const s0=cont?st.dash.spacing-carry:st.dash.spacing/2;
      let last=-1;
      for(let s=s0;s<L;s+=st.dash.spacing){
        const p=cv.getPointAt(s/L),tg=cv.getTangentAt(s/L);
        dashes.push({x:p.x,z:p.z,rot:Math.atan2(tg.x,tg.z)});last=s;
      }
      carry=last<0?(cont?carry:0)+L:L-last; prevEnd=cv.getPoint(1);
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
  const mpEnt=ribbonOn(curveOf(MP.paths.entrance),MP.paths.width,st.walk.color,st.walk.y,0,pathSamples2);
  // 102 JOIN: the tip loop continues the entrance path at the shared [232,-902]
  // — spliced; the ~100° kink there falls back to a paved junction dot (the
  // miter would fold), covering the wedge the owner-era build left in the bend.
  ribbonOn(curveOf(MP.paths.loop),MP.paths.width,st.walk.color,st.walk.y,0,pathSamples2,mpEnt.endFrame);
  // 112 LINCOLN PARK: three NEW crushed-limestone ribbons — the Lakefront Trail
  // continuing south on the east strip, the west park spine (through the Fullerton
  // underpass into the zoo/pond), and the Stockton campus walk. pathSamples2 ONLY
  // (merged into pathSamples AFTER buildProps in main.js -> world scatter frozen);
  // NEVER reshape TRAIL_MAIN. Standalone starts (no bit-exact shared endpoint), so
  // no miter join. crChain-densified already (chicago.js) -> curveOf directly.
  const lpLake=ribbonOn(curveOf(CH.LP_TRAIL_LAKE),st.walk.width,st.walk.color,st.walk.y,0,pathSamples2);
  ribbonOn(curveOf(CH.LP_TRAIL_PARK),st.walk.width,st.walk.color,st.walk.y,0,pathSamples2);
  ribbonOn(curveOf(CH.LP_TRAIL_STOCKTON),st.walk.width,st.walk.color,st.walk.y,0,pathSamples2);
  // 114 ZOO CAMPUS: three NEW ribbons — the red-brick paver MAIN LOOP (closed
  // outline, first==last control point -> ribbonOn's weldSeam miters its own
  // start/end), the limestone SPUR south to the pond ground (Ts off the loop at
  // [-44,847]; the miterless T seam is covered by a paved junction disc from
  // structures), and Cannon Dr (asphalt park drive down the zoo's east flank).
  // pathSamples2 ONLY (ribbonOn is rng-free; LP is scatter-free ground, so the
  // tree post-filter sees nothing in range) — world scatter frozen.
  ribbonOn(curveOf(CH.ZOO.loop),CH.ZOO.loopStyle.width,CH.ZOO.loopStyle.color,CH.ZOO.loopStyle.y,0,pathSamples2);
  ribbonOn(curveOf(CH.ZOO.spur),st.walk.width,st.walk.color,st.walk.y,0,pathSamples2);
  ribbonOn(curveOf(CH.LP_DIVERSEY_CANNON),4.6,st.bike.color,st.bike.y,0,pathSamples2);
  // 115 ZOO HABITATS: two NEW ribbons — the limestone NORTH HABITAT WALK (Ts
  // off the loop's (-42,801.5) control point, west past the dioramas, rejoins
  // the loop at (-69.5,820)) and the brick FARM LANE (loopStyle; Ts off the
  // spur's (-52,962) control point, rejoins the spur at ~(-49.4,997) — the
  // brick y 0.066 tucks UNDER the limestone spur at both T-junctions,
  // intended). pathSamples2 ONLY (ribbonOn is rng-free) — world scatter frozen.
  ribbonOn(curveOf(CH.ZOO.habitats.walkN),st.walk.width,st.walk.color,st.walk.y,0,pathSamples2);
  ribbonOn(curveOf(CH.ZOO.farmyard.lane),CH.ZOO.loopStyle.width,CH.ZOO.loopStyle.color,CH.ZOO.loopStyle.y,0,pathSamples2);
  flushJunctions();   // 102: one instanced mesh for every paved junction dot
  // 106: register the DRAWN dual trail + spur centerlines as the footstep
  // 'asphalt' corridor (onTrail). rng-free; the miters only touch edge verts, so
  // these centerline arrays are stable for the life of the run.
  STEP_TRAIL.length=0;
  stepLane(trailLanes.walk,st.walk.width);
  stepLane(trailLanes.bike,st.bike.width);
  stepLane(trailLanes.mtrWalk,st.walk.width);
  stepLane(trailLanes.mtrBike,st.bike.width);
  stepLane(spurCl,st.spur.width);
}
