// 084 band sweep — a 2 m grid over the reshaped Montrose band (x 14..244,
// z -440..-1084). Classifies every point walkable / water / blocked-land using
// walkprobe's own mirrors (tmp-084-geom.mjs), then hunts:
//   (a) walkable points with ZERO walkable 8-neighbours   (isolated islets)   -> expect 0
//   (b) blocked-land points with >=7 walkable 8-neighbours (pinholes)         -> expect 0
//       the roped dune interior + beach-house hall are LEGIT carves -> whitelisted.
// Also asserts the whole TRAIL_MONTROSE + the last 4 TRAIL_MAIN points are
// walkable and inside WORLD_CLAMP. Writes tools/tmp-084-bandsweep.json.
import fs from 'fs';
import * as G from './tmp-084-geom.mjs';
import * as CH from '../src/data/chicago.js';

const STEP=2, X0=14, X1=244, Z0=-440, Z1=-1084;
const xs=[]; for(let x=X0;x<=X1;x+=STEP) xs.push(x);
const zs=[]; for(let z=Z0;z>=Z1;z-=STEP) zs.push(z);
const NX=xs.length, NZ=zs.length;

// classify into a grid (row-major [iz][ix])
const cls=Array.from({length:NZ},()=>new Array(NX));
let nWalk=0,nWater=0,nBlocked=0;
for(let iz=0;iz<NZ;iz++)for(let ix=0;ix<NX;ix++){
  const c=G.classify(xs[ix],zs[iz]); cls[iz][ix]=c;
  if(c==='walkable')nWalk++; else if(c==='water')nWater++; else nBlocked++;
}
const isWalk=(ix,iz)=> ix>=0&&ix<NX&&iz>=0&&iz<NZ && cls[iz][ix]==='walkable';
function walkNeighbours(ix,iz){
  let n=0;
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dz)continue;
    if(isWalk(ix+dx,iz+dz))n++;
  }
  return n;
}
const inDune=(x,z)=>{const d=CH.MONTROSE_DUNE.bounds;return x>=d.x0&&x<=d.x1&&z>=d.z0&&z<=d.z1;};
const inHouse=(x,z)=>{const b=CH.BEACH_HOUSE.footRect;return x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1;};

const islets=[], pinholes=[];
for(let iz=0;iz<NZ;iz++)for(let ix=0;ix<NX;ix++){
  const x=xs[ix],z=zs[iz],c=cls[iz][ix];
  if(c==='walkable'){
    if(walkNeighbours(ix,iz)===0) islets.push([x,z]);
  } else if(c==='blocked'){
    if(walkNeighbours(ix,iz)>=7 && !inDune(x,z) && !inHouse(x,z)) pinholes.push([x,z,walkNeighbours(ix,iz)]);
  }
}

// ---- trail assertions ----
const inClamp=(x,z)=>{const W=CH.WORLD_CLAMP;return x>=W.xMin&&x<=W.xMax&&z>=W.zMin&&z<=W.zMax;};
const trailFails=[];
for(const [x,z] of CH.TRAIL_MONTROSE){
  if(!G.walkable(x,z)) trailFails.push(['TRAIL_MONTROSE not walkable',x,z]);
  if(!inClamp(x,z)) trailFails.push(['TRAIL_MONTROSE outside WORLD_CLAMP',x,z]);
}
const lastMain=CH.TRAIL_MAIN.slice(-4);
for(const [x,z] of lastMain){
  if(!G.walkable(x,z)) trailFails.push(['TRAIL_MAIN(last4) not walkable',x,z]);
  if(!inClamp(x,z)) trailFails.push(['TRAIL_MAIN(last4) outside WORLD_CLAMP',x,z]);
}

const out={
  band:{x:[X0,X1],z:[Z0,Z1],step:STEP,points:NX*NZ,cols:NX,rows:NZ},
  totals:{walkable:nWalk,water:nWater,blocked:nBlocked},
  isolatedIslets:islets,
  pinholes,
  trail:{montrosePts:CH.TRAIL_MONTROSE.length,mainLast4:lastMain,fails:trailFails},
};
fs.writeFileSync('tools/tmp-084-bandsweep.json',JSON.stringify(out,null,1));

console.log(`band x[${X0}..${X1}] z[${Z0}..${Z1}] step ${STEP}  = ${NX}x${NZ} = ${NX*NZ} pts`);
console.log(`  walkable=${nWalk}  water=${nWater}  blocked-land=${nBlocked}`);
console.log(`(a) isolated walkable islets (0 walkable neighbours): ${islets.length}`);
if(islets.length)console.log('    '+JSON.stringify(islets.slice(0,40)));
console.log(`(b) blocked-land pinholes (>=7 walkable neighbours, dune+beach-house whitelisted): ${pinholes.length}`);
if(pinholes.length)console.log('    '+JSON.stringify(pinholes.slice(0,40)));
console.log(`trail assertions: ${trailFails.length} fail(s) over ${CH.TRAIL_MONTROSE.length} TRAIL_MONTROSE + 4 TRAIL_MAIN pts`);
if(trailFails.length)console.log('    '+JSON.stringify(trailFails));
console.log(`wrote tools/tmp-084-bandsweep.json`);
process.exit((islets.length||pinholes.length||trailFails.length)?1:0);
