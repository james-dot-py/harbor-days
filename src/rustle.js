import * as THREE from 'three';
import { sRustle } from './audio.js';

// ---- brush rustle (task 109, design audit B5) --------------------------------
// Passing within R of a grass tuft / flower head fires one soft sRustle(),
// throttled >= THROTTLE. To do that per frame with ZERO allocation we hash the
// vegetation instance positions into a static spatial grid ONCE at world-ready
// (initRustle, called after buildProps): decompose each brushable InstancedMesh
// and drop every VISIBLE instance's (x,z) into a bucket keyed by its CELL. The
// build reads matrices only — the shared world rng is never touched, so layout
// stays byte-identical. The per-frame query walks the 3x3 cells around the
// player (CELL >= R, so a 3x3 fully covers the R disc) — plain integer math and
// Map.get on a packed numeric key, no strings, no arrays created per frame.
const CELL=0.7, R=0.6, R2=R*R, THROTTLE=0.3;
// key packing: cell x/z offset into the positive integers then combined. Map
// bounds (GEOGRAPHY x -10..245, z -850..320) give cx in ~[-15,350], cz in
// ~[-1215,460]; +OFF keeps both non-negative and cz+OFF < MUL so no collision.
const OFF=2000, MUL=4096;
const key=(cx,cz)=>(cx+OFF)*MUL+(cz+OFF);

const grid=new Map();            // packed cell key -> flat [x,z,x,z,...]
let rustleT=0;
const _M=new THREE.Matrix4(),_p=new THREE.Vector3(),_q=new THREE.Quaternion(),_s=new THREE.Vector3();

// Build the grid from the brushable meshes. Hidden instances (zero-scaled tufts
// — the on-pad / off-land stamps in props.js) decompose to scale 0 and are
// skipped, so only real vegetation rustles.
export function initRustle(meshes){
  grid.clear();rustleT=0;
  for(const mesh of meshes){
    if(!mesh)continue;
    const n=mesh.count;
    for(let i=0;i<n;i++){
      mesh.getMatrixAt(i,_M);_M.decompose(_p,_q,_s);
      if(_s.x<0.2)continue;                                  // zero-scaled = hidden instance
      const k=key(Math.floor(_p.x/CELL),Math.floor(_p.z/CELL));
      let a=grid.get(k);if(!a){a=[];grid.set(k,a);}
      a.push(_p.x,_p.z);
    }
  }
}

// Per-frame: fire a throttled rustle when the moving player is within R of any
// brushable instance. active gates out standing still / airborne / jetski / ice.
export function updateRustle(dt,px,pz,sp,active){
  if(rustleT>0)rustleT-=dt;
  if(!active||sp<1||rustleT>0)return;
  const cx=Math.floor(px/CELL),cz=Math.floor(pz/CELL);
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
    const a=grid.get(key(cx+dx,cz+dz));if(!a)continue;
    for(let i=0;i<a.length;i+=2){const ex=a[i]-px,ez=a[i+1]-pz;
      if(ex*ex+ez*ez<R2){sRustle();rustleT=THROTTLE;return;}}
  }
}

// debug/tools only: grid census + live throttle timer (verify harness reads this)
export function rustleStats(){let cells=0,pts=0;grid.forEach(a=>{cells++;pts+=a.length>>1;});return{cells,pts,cool:rustleT};}
