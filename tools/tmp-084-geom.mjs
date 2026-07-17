// 084 shared geometry — a byte-for-byte copy of tools/walkprobe.mjs's walkable()/
// surfaceY()/coastQuery() machinery (lines 9-76), factored out so the 084 diag +
// bandsweep can reuse the exact same mirrors without re-running walkprobe's asserts.
// If walkprobe's geometry changes, mirror it here too.
import * as CH from '../src/data/chicago.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*(3-2*t);
export function pip(px,pz,poly){let ins=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],zi=poly[i][1],xj=poly[j][0],zj=poly[j][1];if(((zi>pz)!==(zj>pz))&&(px<(xj-xi)*(pz-zi)/(zj-zi)+xi))ins=!ins}return ins}
function genCoast(z0,z1,fx){const C=[];for(let z=z0;z>=z1;z-=3)C.push([fx(z),z]);return C}

const COAST_MAIN=genCoast(CH.COAST_MAIN_PARAMS.z0,CH.COAST_MAIN_PARAMS.z1,CH.COAST_MAIN_PARAMS.fx);
const COAST_PEN =genCoast(CH.COAST_PEN_PARAMS.z0,CH.COAST_PEN_PARAMS.z1,CH.COAST_PEN_PARAMS.fx);
const COAST_GOLF=genCoast(CH.COAST_GOLF_PARAMS.z0,CH.COAST_GOLF_PARAMS.z1,CH.COAST_GOLF_PARAMS.fx);
const COAST_MOUTH=genCoast(CH.COAST_MOUTH_PARAMS.z0,CH.COAST_MOUTH_PARAMS.z1,CH.COAST_MOUTH_PARAMS.fx);
const COAST_CORNER=genCoast(CH.COAST_CORNER_PARAMS.z0,CH.COAST_CORNER_PARAMS.z1,CH.COAST_CORNER_PARAMS.fx);
const BASIN_W=[];for(let z=CH.BASIN_W_PARAMS.z0;z>=CH.BASIN_W_PARAMS.z1;z-=CH.BASIN_W_PARAMS.step)BASIN_W.push([CH.BASIN_W_PARAMS.fx(z),z]);
export const COAST_BAY=CH.COAST_BAY_PTS;
const COAST_MTR_HARBOR=CH.COAST_MTR_HARBOR_PTS;
const COAST_MTR_POINT =CH.COAST_MTR_POINT_PTS;
const COAST_MTR_BEACH =genCoast(CH.COAST_MTR_BEACH_PARAMS.z0, CH.COAST_MTR_BEACH_PARAMS.z1, CH.COAST_MTR_BEACH_PARAMS.fx);
const COAST_MTR_CLOSE =CH.COAST_MTR_CLOSE_PTS;
const COAST_MTR_MOUTH =CH.MTR_HARBOR_MOUTH;
const COAST_MTR_HOOKTIP=CH.MTR_HOOK_TIP;
const COAST_MTR=[COAST_BAY,COAST_MTR_HARBOR,COAST_MTR_POINT,COAST_MTR_BEACH,COAST_MTR_CLOSE,COAST_MTR_MOUTH,COAST_MTR_HOOKTIP,COAST_GOLF];
export const LAND=CH.buildLAND({COAST_CORNER,COAST_MAIN,COAST_PEN,COAST_GOLF,COAST_MOUTH,BASIN_W,
  COAST_BAY,COAST_MTR_HARBOR,COAST_MTR_POINT,COAST_MTR_BEACH,COAST_MTR_CLOSE});
const P_START=COAST_PEN[0];
const COAST_TIP=CH.peninsulaTipLine(P_START);

export function buildSegs(pts){const segs=[];for(let i=0;i<pts.length-1;i++){const ax=pts[i][0],az=pts[i][1],bx=pts[i+1][0],bz=pts[i+1][1];const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);const tx=dx/len,tz=dz/len;segs.push({ax,az,tx,tz,nx:-tz,nz:tx,len})}return segs}
const COAST_SEGS=[buildSegs(COAST_MAIN),buildSegs(COAST_PEN),buildSegs(COAST_GOLF),buildSegs(COAST_MOUTH),buildSegs(COAST_CORNER)];
const TIP_SEGS=buildSegs(COAST_TIP);
const MTR_SEGS=COAST_MTR.map(buildSegs);
const QUERY_SEGS=[...COAST_SEGS.filter((_,i)=>i!==2),TIP_SEGS,...MTR_SEGS.filter((_,i)=>i!==3)];
function tierProfile(zc){const R=CH.TIER_ROCKS;if(zc>R.zMin&&zc<R.zMax){if(zc>R.cornerZ0){const f=clamp((zc-R.cornerZ0)/(R.cornerZ1-R.cornerZ0),0,1);const w=R.w.slice();w[w.length-1]=R.w[w.length-1]+(R.cornerPromW-R.w[w.length-1])*f;return{w,step:R.step}}return{w:R.w,step:R.step}}return{w:CH.TIER_DEFAULT.w,step:CH.TIER_DEFAULT.step}}
export function profileTotal(zc){const p=tierProfile(zc);let s=0;for(const w of p.w)s+=w;return s}
function inPierChannel(x,z){const P=CH.PIER_CHANNEL;if(!P)return false;if(x<P.x0||x>P.x1||z>P.zMax)return false;const topZ=P.topZ0+(P.topZ1-P.topZ0)*(x-P.x0)/(P.x1-P.x0);return z>=topZ}
export function coastQuery(x,z){let best=null,bd2=1e9;for(const C of QUERY_SEGS)for(const s of C){const px=x-s.ax,pz=z-s.az;let t=px*s.tx+pz*s.tz;t=clamp(t,0,s.len);const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;const ddx=x-cx,ddz=z-cz,d2=ddx*ddx+ddz*ddz;if(d2<bd2){bd2=d2;best={lat:ddx*s.nx+ddz*s.nz,d2,z:cz}}}if(!best)return null;best.ae=Math.sqrt(Math.max(0,best.d2-best.lat*best.lat));if(inPierChannel(x,z))best.lat=1e3;return best}
export function tierAt(lat,zc){const p=tierProfile(zc);let acc=0;for(let i=0;i<p.w.length;i++){acc+=p.w[i];if(lat<=acc)return{h:-i*p.step,i,edge:acc}}return null}
export function beachH(x,z){const b=CH.DOG_BEACH.bounds,s=CH.DOG_BEACH.slope;if(x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1){const t=clamp((z-s.ref)/s.span,0,1);return s.depth*smooth(t)}return CH.montroseBeachH(x,z)}

const walkRects=[];
for(const zc of CH.FINGER_DOCKS.rows)walkRects.push({x1:CH.FINGER_DOCKS.x0,x2:CH.FINGER_DOCKS.x0+CH.FINGER_DOCKS.len,z1:zc-CH.FINGER_DOCKS.halfW,z2:zc+CH.FINGER_DOCKS.halfW});
for(const d of CH.DECKS)walkRects.push(d.walk);
{ const D=CH.SANCTUARY.deck;
  walkRects.push({x1:D.x0,x2:D.x1,z1:D.z0,z2:D.z1,h:D.h});
  for(const st of D.stairs)walkRects.push({x1:st.x0,x2:st.x1,z1:st.z0,z2:st.z1,h:st.h}); }
{ const B=CH.DIVERSEY.bays.deckRect;
  walkRects.push({x1:B.x0,x2:B.x1,z1:B.z0,z2:B.z1,h:B.h}); }
{ const D=CH.THE_DOCK.deckRect;
  walkRects.push({x1:D.x0,x2:D.x1,z1:D.z0,z2:D.z1,h:CH.THE_DOCK.deckY}); }
export function onRect(x,z){for(const r of walkRects)if(x>=r.x1&&x<=r.x2&&z>=r.z1&&z<=r.z2)return r;return null}

export function walkable(x,z){
  if(onRect(x,z))return true;
  if(CH.beachCarved(x,z))return false;
  const bh=beachH(x,z);if(bh!==null)return CH.beachWalkable(x,z);
  if(pip(x,z,LAND))return true;
  const q=coastQuery(x,z);
  if(q&&q.ae<0.9&&q.lat>-0.6){const t=tierAt(q.lat,q.z);if(t&&q.lat<profileTotal(q.z)-0.3)return true;}
  return false;
}
export function surfaceY(x,z){
  const r=onRect(x,z);if(r)return r.h;
  const hh=CH.cricketHillH(x,z);if(hh!==null)return hh;
  const bh=beachH(x,z);if(bh!==null)return bh;
  const q=coastQuery(x,z);
  if(q&&q.ae<1.2&&q.lat>0.15){const t=tierAt(q.lat,q.z);if(t)return t.h}
  return 0;
}
// main.js isWater mirror: open lake = east of the berm, off LAND, no beach, no plank.
export function isWater(x,z){ return x>20 && !pip(x,z,LAND) && beachH(x,z)===null && onRect(x,z)===null; }
// three-way classification for the band sweep.
export function classify(x,z){
  if(walkable(x,z)) return 'walkable';
  if(isWater(x,z))  return 'water';
  return 'blocked';   // non-walkable, non-water land
}
