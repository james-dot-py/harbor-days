import * as CH from '../src/data/chicago.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function genCoast(z0,z1,fx){const C=[];for(let z=z0;z>=z1;z-=3)C.push([fx(z),z]);return C}
const COAST_CORNER=genCoast(CH.COAST_CORNER_PARAMS.z0,CH.COAST_CORNER_PARAMS.z1,CH.COAST_CORNER_PARAMS.fx);
const COAST_MAIN=genCoast(CH.COAST_MAIN_PARAMS.z0,CH.COAST_MAIN_PARAMS.z1,CH.COAST_MAIN_PARAMS.fx);
function buildSegs(pts){const segs=[];for(let i=0;i<pts.length-1;i++){const ax=pts[i][0],az=pts[i][1],bx=pts[i+1][0],bz=pts[i+1][1];const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);const tx=dx/len,tz=dz/len;segs.push({ax,az,tx,tz,nx:-tz,nz:tx,len})}return segs}
function tierProfile(zc){const rocks=zc>CH.TIER_ROCKS.zMin&&zc<CH.TIER_ROCKS.zMax;return rocks?{w:CH.TIER_ROCKS.w,step:CH.TIER_ROCKS.step}:{w:CH.TIER_DEFAULT.w,step:CH.TIER_DEFAULT.step}}
function profileTotal(zc){const p=tierProfile(zc);let s=0;for(const w of p.w)s+=w;return s}
const C=buildSegs(COAST_CORNER);
console.log('CORNER promenade OUTER edge (top -> +profileTotal*normal):');
for(const s of C){
  const tot=profileTotal(s.az);
  const ox=s.ax+s.nx*tot, oz=s.az+s.nz*tot;
  console.log(`  top(${s.ax.toFixed(1)},${s.az.toFixed(1)}) -> outer(${ox.toFixed(1)},${oz.toFixed(1)})  n=(${s.nx.toFixed(2)},${s.nz.toFixed(2)})`);
}
// pier rect
const P=CH.DECKS[1].walk;
console.log('\nPier walk rect',JSON.stringify(P));
console.log('test pts: WEST(',(P.x1-6),',',(P.z2-2),')  EAST(',(P.x2+6),',',(P.z2-2),')');
