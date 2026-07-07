import * as CH from '../src/data/chicago.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function genCoast(z0,z1,fx){const C=[];for(let z=z0;z>=z1;z-=3)C.push([fx(z),z]);return C}
const COAST_MAIN=genCoast(CH.COAST_MAIN_PARAMS.z0,CH.COAST_MAIN_PARAMS.z1,CH.COAST_MAIN_PARAMS.fx);
const COAST_PEN =genCoast(CH.COAST_PEN_PARAMS.z0,CH.COAST_PEN_PARAMS.z1,CH.COAST_PEN_PARAMS.fx);
const COAST_GOLF=genCoast(CH.COAST_GOLF_PARAMS.z0,CH.COAST_GOLF_PARAMS.z1,CH.COAST_GOLF_PARAMS.fx);
const COAST_MOUTH=genCoast(CH.COAST_MOUTH_PARAMS.z0,CH.COAST_MOUTH_PARAMS.z1,CH.COAST_MOUTH_PARAMS.fx);
const COAST_CORNER=genCoast(CH.COAST_CORNER_PARAMS.z0,CH.COAST_CORNER_PARAMS.z1,CH.COAST_CORNER_PARAMS.fx);
const P_START=COAST_PEN[0];
const COAST_TIP=CH.peninsulaTipLine(P_START);
function buildSegs(pts){const segs=[];for(let i=0;i<pts.length-1;i++){const ax=pts[i][0],az=pts[i][1],bx=pts[i+1][0],bz=pts[i+1][1];const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);const tx=dx/len,tz=dz/len;segs.push({ax,az,tx,tz,nx:-tz,nz:tx,len})}return segs}
const NAMES=['MAIN','PEN','GOLF','MOUTH','CORNER','TIP'];
const ALL=[buildSegs(COAST_MAIN),buildSegs(COAST_PEN),buildSegs(COAST_GOLF),buildSegs(COAST_MOUTH),buildSegs(COAST_CORNER),buildSegs(COAST_TIP)];
function tierProfile(zc){const rocks=zc>CH.TIER_ROCKS.zMin&&zc<CH.TIER_ROCKS.zMax;return rocks?{w:CH.TIER_ROCKS.w,step:CH.TIER_ROCKS.step}:{w:CH.TIER_DEFAULT.w,step:CH.TIER_DEFAULT.step}}
function profileTotal(zc){const p=tierProfile(zc);let s=0;for(const w of p.w)s+=w;return s}
function tierAt(lat,zc){const p=tierProfile(zc);let acc=0;for(let i=0;i<p.w.length;i++){acc+=p.w[i];if(lat<=acc)return{h:-i*p.step,i,edge:acc}}return null}
function coastQueryDbg(x,z){let best=null,bd2=1e9,bi=-1;
  for(let ci=0;ci<ALL.length;ci++)for(const s of ALL[ci]){
    const px=x-s.ax,pz=z-s.az;let t=px*s.tx+pz*s.tz;t=clamp(t,0,s.len);
    const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;const ddx=x-cx,ddz=z-cz,d2=ddx*ddx+ddz*ddz;
    if(d2<bd2){bd2=d2;bi=ci;best={lat:ddx*s.nx+ddz*s.nz,d2,z:cz,cx,cz,seg:s}}}
  best.ae=Math.sqrt(Math.max(0,best.d2-best.lat*best.lat));best.piece=NAMES[bi];return best;}
for(const [x,z] of [[110,404.5],[112,404.5],[114,404.5],[110,402],[108,404.5],[116,406],[118,405]]){
  const q=coastQueryDbg(x,z);const pt=profileTotal(q.z);const t=tierAt(q.lat,q.z);
  const walk=(q.ae<0.9&&q.lat>-0.6&&t&&q.lat<pt-0.3);
  console.log(`(${x},${z}) piece=${q.piece} foot=(${q.cx.toFixed(1)},${q.cz.toFixed(1)}) lat=${q.lat.toFixed(2)} ae=${q.ae.toFixed(2)} profTot=${pt.toFixed(1)} tier=${t?t.i:'-'} WALK=${walk}`);
}
