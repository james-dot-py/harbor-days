// tmp-104: prove/inspect shoreline self-intersection (task 104).
// Rebuilds LAND exactly like coast.js/walkprobe.mjs and reports:
//   - every proper segment-pair crossing (non-adjacent)
//   - near-touches (non-adjacent segments closer than 3 m)
//   - the hook/mouth local geometry numbers
import * as CH from '../src/data/chicago.js';

function genCoast(z0,z1,fx){const C=[];for(let z=z0;z>=z1;z-=3)C.push([fx(z),z]);return C}
const COAST_MAIN=genCoast(CH.COAST_MAIN_PARAMS.z0,CH.COAST_MAIN_PARAMS.z1,CH.COAST_MAIN_PARAMS.fx);
const COAST_PEN =genCoast(CH.COAST_PEN_PARAMS.z0,CH.COAST_PEN_PARAMS.z1,CH.COAST_PEN_PARAMS.fx);
const COAST_GOLF=genCoast(CH.COAST_GOLF_PARAMS.z0,CH.COAST_GOLF_PARAMS.z1,CH.COAST_GOLF_PARAMS.fx);
const COAST_MOUTH=genCoast(CH.COAST_MOUTH_PARAMS.z0,CH.COAST_MOUTH_PARAMS.z1,CH.COAST_MOUTH_PARAMS.fx);
const COAST_CORNER=genCoast(CH.COAST_CORNER_PARAMS.z0,CH.COAST_CORNER_PARAMS.z1,CH.COAST_CORNER_PARAMS.fx);
const BASIN_W=[];for(let z=CH.BASIN_W_PARAMS.z0;z>=CH.BASIN_W_PARAMS.z1;z-=CH.BASIN_W_PARAMS.step)BASIN_W.push([CH.BASIN_W_PARAMS.fx(z),z]);
const COAST_MTR_BEACH=genCoast(CH.COAST_MTR_BEACH_PARAMS.z0,CH.COAST_MTR_BEACH_PARAMS.z1,CH.COAST_MTR_BEACH_PARAMS.fx);
const LAND=CH.buildLAND({COAST_CORNER,COAST_MAIN,COAST_PEN,COAST_GOLF,COAST_MOUTH,BASIN_W,
  COAST_BAY:CH.COAST_BAY_PTS,COAST_MTR_HARBOR:CH.COAST_MTR_HARBOR_PTS,COAST_MTR_POINT:CH.COAST_MTR_POINT_PTS,
  COAST_MTR_BEACH,COAST_MTR_CLOSE:CH.COAST_MTR_CLOSE_PTS});

console.log('LAND points:', LAND.length);

// closed polygon: append first point
const P=LAND.slice(); P.push(P[0]);
// drop zero-length segments
const S=[];
for(let i=0;i<P.length-1;i++){
  const a=P[i],b=P[i+1];
  if(Math.hypot(b[0]-a[0],b[1]-a[1])<1e-9)continue;
  S.push({a,b,i});
}
console.log('segments:',S.length);
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function segsCross(a,b,c,d){
  const s1=cross(a,b,c),s2=cross(a,b,d),s3=cross(c,d,a),s4=cross(c,d,b);
  return (s1*s2<0)&&(s3*s4<0);
}
function segDist(a,b,c,d){
  const pt=(p,u,v)=>{const dx=v[0]-u[0],dz=v[1]-u[1],L2=dx*dx+dz*dz||1e-12;
    let t=((p[0]-u[0])*dx+(p[1]-u[1])*dz)/L2;t=Math.max(0,Math.min(1,t));
    return Math.hypot(p[0]-(u[0]+dx*t),p[1]-(u[1]+dz*t));};
  return Math.min(pt(a,c,d),pt(b,c,d),pt(c,a,b),pt(d,a,b));
}
let crossings=0;
const near=[];
for(let i=0;i<S.length;i++){
  const A=S[i];
  const ax0=Math.min(A.a[0],A.b[0]),ax1=Math.max(A.a[0],A.b[0]);
  const az0=Math.min(A.a[1],A.b[1]),az1=Math.max(A.a[1],A.b[1]);
  for(let j=i+2;j<S.length;j++){
    if(i===0&&j===S.length-1)continue;             // closing adjacency
    const B=S[j];
    if(Math.min(B.a[0],B.b[0])>ax1+3||Math.max(B.a[0],B.b[0])<ax0-3)continue;
    if(Math.min(B.a[1],B.b[1])>az1+3||Math.max(B.a[1],B.b[1])<az0-3)continue;
    if(segsCross(A.a,A.b,B.a,B.b)){
      crossings++;
      if(crossings<=40)console.log(`CROSS seg${A.i}(${A.a[0].toFixed(1)},${A.a[1].toFixed(1)}->${A.b[0].toFixed(1)},${A.b[1].toFixed(1)}) x seg${B.i}(${B.a[0].toFixed(1)},${B.a[1].toFixed(1)}->${B.b[0].toFixed(1)},${B.b[1].toFixed(1)})`);
    } else {
      const d=segDist(A.a,A.b,B.a,B.b);
      if(d<3&&j-i>5)near.push({d,A,B});
    }
  }
}
console.log('proper crossings:',crossings);
near.sort((p,q)=>p.d-q.d);
console.log('nearest non-adjacent approaches (<3 m, index gap >5):');
const seen=new Set();
for(const n of near){
  const key=Math.round(n.A.i/5)+':'+Math.round(n.B.i/5);
  if(seen.has(key))continue;seen.add(key);
  console.log(`  d=${n.d.toFixed(2)} seg${n.A.i}(${n.A.a[0].toFixed(1)},${n.A.a[1].toFixed(1)}) x seg${n.B.i}(${n.B.a[0].toFixed(1)},${n.B.a[1].toFixed(1)})`);
  if(seen.size>25)break;
}
// pave polygon simplicity (ShapeGeometry folds on self-intersection)
{
  const PP=CH.MT_MOLE_PAVE.slice();PP.push(PP[0]);
  const SS=[];for(let i=0;i<PP.length-1;i++){const a=PP[i],b=PP[i+1];if(Math.hypot(b[0]-a[0],b[1]-a[1])>1e-9)SS.push({a,b,i});}
  let pc=0;
  for(let i=0;i<SS.length;i++)for(let j=i+2;j<SS.length;j++){
    if(i===0&&j===SS.length-1)continue;
    if(segsCross(SS[i].a,SS[i].b,SS[j].a,SS[j].b)){pc++;if(pc<=10)console.log(`PAVE CROSS seg${SS[i].i}(${SS[i].a}) x seg${SS[j].i}(${SS[j].a})`);}
  }
  console.log('PAVE pts:',CH.MT_MOLE_PAVE.length,'crossings:',pc);
}
// hook/mouth local numbers
console.log('\nmontroseFx(-652) =',CH.montroseFx(-652).toFixed(3));
console.log('MTR_HOOK_TIP raw ctrl-ish first/last:',JSON.stringify(CH.MTR_HOOK_TIP[0]),JSON.stringify(CH.MTR_HOOK_TIP[CH.MTR_HOOK_TIP.length-1]));
const ext=(name,pts)=>{
  const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1]);
  console.log(`${name}: x ${Math.min(...xs).toFixed(1)}..${Math.max(...xs).toFixed(1)}  z ${Math.min(...zs).toFixed(1)}..${Math.max(...zs).toFixed(1)}  (${pts.length} pts)`);
};
ext('MTR_HARBOR_MOUTH',CH.MTR_HARBOR_MOUTH);
ext('MTR_HOOK_TIP',CH.MTR_HOOK_TIP);
ext('COAST_MTR_HARBOR_PTS',CH.COAST_MTR_HARBOR_PTS);
ext('COAST_BAY_PTS',CH.COAST_BAY_PTS);
ext('COAST_MTR_POINT_PTS',CH.COAST_MTR_POINT_PTS);
