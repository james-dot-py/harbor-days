// tmp-097-sweep-land.mjs — LAKEFRONT (open-world) walkability sweep for task 097.
// Report only. Finds (a) BLOCKED-LAND pockets (neither walkable NOR water: a hard
// freeze on the lakefront, which has NO anti-trap crawl escape) and (b) walkable
// islets unreachable from spawn. Pure node, no puppeteer/three.
//
// The prelude below (through walkable()/surfaceY()) is COPIED VERBATIM from
// tools/walkprobe.mjs lines 1-76 — the canonical pure-JS mirror of the engine's
// lakefront walkable()/surfaceY(). walkprobe runs expects at import time so it
// cannot be imported; copying is the established pattern.
// =========================== walkprobe prelude (verbatim) ===================
import * as CH from '../src/data/chicago.js';
import * as WV from '../src/data/wrigleyville.js';
import * as MP from '../src/data/millennium.js';
import * as WB from '../src/data/wrigley-bowl.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*(3-2*t);
function pip(px,pz,poly){let ins=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],zi=poly[i][1],xj=poly[j][0],zj=poly[j][1];if(((zi>pz)!==(zj>pz))&&(px<(xj-xi)*(pz-zi)/(zj-zi)+xi))ins=!ins}return ins}
function genCoast(z0,z1,fx){const C=[];for(let z=z0;z>=z1;z-=3)C.push([fx(z),z]);return C}

const COAST_MAIN=genCoast(CH.COAST_MAIN_PARAMS.z0,CH.COAST_MAIN_PARAMS.z1,CH.COAST_MAIN_PARAMS.fx);
const COAST_PEN =genCoast(CH.COAST_PEN_PARAMS.z0,CH.COAST_PEN_PARAMS.z1,CH.COAST_PEN_PARAMS.fx);
const COAST_GOLF=genCoast(CH.COAST_GOLF_PARAMS.z0,CH.COAST_GOLF_PARAMS.z1,CH.COAST_GOLF_PARAMS.fx);
const COAST_MOUTH=genCoast(CH.COAST_MOUTH_PARAMS.z0,CH.COAST_MOUTH_PARAMS.z1,CH.COAST_MOUTH_PARAMS.fx);
const COAST_CORNER=genCoast(CH.COAST_CORNER_PARAMS.z0,CH.COAST_CORNER_PARAMS.z1,CH.COAST_CORNER_PARAMS.fx);
const BASIN_W=[];for(let z=CH.BASIN_W_PARAMS.z0;z>=CH.BASIN_W_PARAMS.z1;z-=CH.BASIN_W_PARAMS.step)BASIN_W.push([CH.BASIN_W_PARAMS.fx(z),z]);
// MONTROSE north stub pieces (task 069; 084 reshape) — mirror coast.js exactly
// (genCoast/polyline per piece) so LAND + QUERY_SEGS stay lockstep with the engine.
const COAST_BAY=CH.COAST_BAY_PTS;                                                                  // 084: the bay cove replacing the retired COAST_MTR_LAWN (MTR slot 0)
const COAST_MTR_HARBOR=CH.COAST_MTR_HARBOR_PTS;                                                    // 070: hook mole lake face (polyline)
const COAST_MTR_POINT =CH.COAST_MTR_POINT_PTS;                                                                             // 071: the pushed-east Point (polyline, apex 243,-894 — the map's eastmost land)
const COAST_MTR_BEACH =genCoast(CH.COAST_MTR_BEACH_PARAMS.z0, CH.COAST_MTR_BEACH_PARAMS.z1, CH.COAST_MTR_BEACH_PARAMS.fx);
const COAST_MTR_CLOSE =CH.COAST_MTR_CLOSE_PTS;
const COAST_MTR_MOUTH =CH.MTR_HARBOR_MOUTH;    // 070: mouth entrance shore (terraced)
const COAST_MTR_HOOKTIP=CH.MTR_HOOK_TIP;       // 070: hook tip curl (terraced)
const COAST_MTR=[COAST_BAY,COAST_MTR_HARBOR,COAST_MTR_POINT,COAST_MTR_BEACH,COAST_MTR_CLOSE,COAST_MTR_MOUTH,COAST_MTR_HOOKTIP,COAST_GOLF];  // 084: BAY at slot 0, the vignette GOLF appended at idx 7 (matches coast.js). idx 3 MUST stay BEACH.
const LAND=CH.buildLAND({COAST_CORNER,COAST_MAIN,COAST_PEN,COAST_GOLF,COAST_MOUTH,BASIN_W,
  COAST_BAY,COAST_MTR_HARBOR,COAST_MTR_POINT,COAST_MTR_BEACH,COAST_MTR_CLOSE});
const P_START=COAST_PEN[0];
const COAST_TIP=CH.peninsulaTipLine(P_START);   // peninsula south-tip terraced arc (matches coast.js)

function buildSegs(pts){const segs=[];for(let i=0;i<pts.length-1;i++){const ax=pts[i][0],az=pts[i][1],bx=pts[i+1][0],bz=pts[i+1][1];const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);const tx=dx/len,tz=dz/len;segs.push({ax,az,tx,tz,nx:-tz,nz:tx,len})}return segs}
const COAST_SEGS=[buildSegs(COAST_MAIN),buildSegs(COAST_PEN),buildSegs(COAST_GOLF),buildSegs(COAST_MOUTH),buildSegs(COAST_CORNER)];
const TIP_SEGS=buildSegs(COAST_TIP);
const MTR_SEGS=COAST_MTR.map(buildSegs);        // Montrose stub revetment tops (task 069) — mirror coast.js
const QUERY_SEGS=[...COAST_SEGS.filter((_,i)=>i!==2),TIP_SEGS,...MTR_SEGS.filter((_,i)=>i!==3)];  // 084: golf lives at COAST_SEGS[2] AND MTR idx7 — drop the COAST_SEGS copy so it isn't duplicated; the real-piece SET then matches coast.js's QUERY_SEGS exactly. BEACH (MTR idx3) is SAND (beachH), NOT a revetment — excluded so no walkable tier lingers off the sand
function tierProfile(zc){const R=CH.TIER_ROCKS;if(zc>R.zMin&&zc<R.zMax){if(zc>R.cornerZ0){const f=clamp((zc-R.cornerZ0)/(R.cornerZ1-R.cornerZ0),0,1);const w=R.w.slice();w[w.length-1]=R.w[w.length-1]+(R.cornerPromW-R.w[w.length-1])*f;return{w,step:R.step}}return{w:R.w,step:R.step}}return{w:CH.TIER_DEFAULT.w,step:CH.TIER_DEFAULT.step}}
function profileTotal(zc){const p=tierProfile(zc);let s=0;for(const w of p.w)s+=w;return s}
function inPierChannel(x,z){const P=CH.PIER_CHANNEL;if(!P)return false;if(x<P.x0||x>P.x1||z>P.zMax)return false;const topZ=P.topZ0+(P.topZ1-P.topZ0)*(x-P.x0)/(P.x1-P.x0);return z>=topZ}
function coastQuery(x,z){let best=null,bd2=1e9;for(const C of QUERY_SEGS)for(const s of C){const px=x-s.ax,pz=z-s.az;let t=px*s.tx+pz*s.tz;t=clamp(t,0,s.len);const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;const ddx=x-cx,ddz=z-cz,d2=ddx*ddx+ddz*ddz;if(d2<bd2){bd2=d2;best={lat:ddx*s.nx+ddz*s.nz,d2,z:cz}}}if(!best)return null;best.ae=Math.sqrt(Math.max(0,best.d2-best.lat*best.lat));if(inPierChannel(x,z))best.lat=1e3;return best}
function tierAt(lat,zc){const p=tierProfile(zc);let acc=0;for(let i=0;i<p.w.length;i++){acc+=p.w[i];if(lat<=acc)return{h:-i*p.step,i,edge:acc}}return null}
function beachH(x,z){const b=CH.DOG_BEACH.bounds,s=CH.DOG_BEACH.slope;if(x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1){const t=clamp((z-s.ref)/s.span,0,1);return s.depth*smooth(t)}return CH.montroseBeachH(x,z)}  // task 072: Montrose beach too (shared helper)

// walkRects: finger docks + pier decks (from data)
const walkRects=[];
for(const zc of CH.FINGER_DOCKS.rows)walkRects.push({x1:CH.FINGER_DOCKS.x0,x2:CH.FINGER_DOCKS.x0+CH.FINGER_DOCKS.len,z1:zc-CH.FINGER_DOCKS.halfW,z2:zc+CH.FINGER_DOCKS.halfW});
for(const d of CH.DECKS)walkRects.push(d.walk);
{ const D=CH.SANCTUARY.deck;                     // sanctuary bird-watching deck + stairs (matches buildSanctuary)
  walkRects.push({x1:D.x0,x2:D.x1,z1:D.z0,z2:D.z1,h:D.h});
  for(const st of D.stairs)walkRects.push({x1:st.x0,x2:st.x1,z1:st.z0,z2:st.z1,h:st.h}); }
{ const B=CH.DIVERSEY.bays.deckRect;              // Diversey ground-tier hitting deck (matches structures.js walkRects.push)
  walkRects.push({x1:B.x0,x2:B.x1,z1:B.z0,z2:B.z1,h:B.h}); }
{ const D=CH.THE_DOCK.deckRect;                   // task 072: The Dock raised wood deck (matches structures.js walkRects.push)
  walkRects.push({x1:D.x0,x2:D.x1,z1:D.z0,z2:D.z1,h:CH.THE_DOCK.deckY}); }
function onRect(x,z){for(const r of walkRects)if(x>=r.x1&&x<=r.x2&&z>=r.z1&&z<=r.z2)return r;return null}

function walkable(x,z){
  if(onRect(x,z))return true;
  if(CH.beachCarved(x,z))return false;             // task 072: roped dune + beach-house hall (data carve, no collider)
  const bh=beachH(x,z);if(bh!==null)return CH.beachWalkable(x,z);   // task 072: dog + Montrose sand
  if(pip(x,z,LAND))return true;
  const q=coastQuery(x,z);
  if(q&&q.ae<0.9&&q.lat>-0.6){const t=tierAt(q.lat,q.z);if(t&&q.lat<profileTotal(q.z)-0.3)return true;}
  return false;
}
function surfaceY(x,z){
  const r=onRect(x,z);if(r)return r.h;
  const hh=CH.cricketHillH(x,z);if(hh!==null)return hh;   // task 073: Cricket Hill analytic mound (mirror of main.js surfaceY)
  const bh=beachH(x,z);if(bh!==null)return bh;
  const q=coastQuery(x,z);
  if(q&&q.ae<1.2&&q.lat>0.15){const t=tierAt(q.lat,q.z);if(t)return t.h}
  return 0;
}
// ========================= end walkprobe prelude ============================

// isWater mirror from src/main.js line 140 (cellWalk() is null on the lakefront so
// that term drops): isWater(x,z)= x>20 && !pip(x,z,LAND) && !onRect(x,z) && beachH===null.
function isWater(x,z){ return x>20 && !pip(x,z,LAND) && !onRect(x,z) && beachH(x,z)===null; }

// ------------------------------- sweep --------------------------------------
const WC=CH.WORLD_CLAMP;                    // {xMin:14,xMax:244,zMin:-1084,zMax:408}
const xMin=WC.xMin, xMax=WC.xMax, zMin=WC.zMin, zMax=WC.zMax;
const W=xMax-xMin+1, H=zMax-zMin+1;
const N=W*H;
const idx=(xi,zi)=>zi*W+xi;
const wx=xi=>xMin+xi, wz=zi=>zMin+zi;

// classification: 0 BLOCKED, 1 WALK, 2 WATER
const WALK=1, WATER=2, BLOCKED=0;
const cls=new Int8Array(N);
let nWalk=0,nWater=0,nBlocked=0;
const t0=Date.now();
for(let zi=0;zi<H;zi++){
  const z=wz(zi);
  for(let xi=0;xi<W;xi++){
    const x=wx(xi);
    let c;
    if(walkable(x,z)){ c=WALK; nWalk++; }
    else if(isWater(x,z)){ c=WATER; nWater++; }
    else { c=BLOCKED; nBlocked++; }
    cls[idx(xi,zi)]=c;
  }
}
console.log(`[classify] ${N} cells in ${((Date.now()-t0)/1000).toFixed(1)}s  (grid ${W}x${H}, x[${xMin}..${xMax}] z[${zMin}..${zMax}])`);
console.log(`[classify] WALK=${nWalk}  WATER=${nWater}  BLOCKED=${nBlocked}`);

// ---- (a) connected components of BLOCKED cells (4-conn) --------------------
function labelFor(b){
  const within=(x0,x1,z0,z1)=> b.minx>=x0-1 && b.maxx<=x1+1 && b.minz>=z0-1 && b.maxz<=z1+1;
  if(within(210,233,-978,-926)) return 'MONTROSE_DUNE (roped plover dune, intended)';
  if(within(194,204,-1016,-992)) return 'BEACH_HOUSE (closed hall, intended)';
  if(b.maxx<=20) return 'west berm strip (map edge, intended)';
  return 'UNKNOWN — FLAG';
}
const seen=new Uint8Array(N);
const comps=[];
const stack=new Int32Array(N);
for(let start=0;start<N;start++){
  if(cls[start]!==BLOCKED||seen[start])continue;
  let sp=0; stack[sp++]=start; seen[start]=1;
  let count=0, minx=1e9,maxx=-1e9,minz=1e9,maxz=-1e9, adjWalk=false;
  const samples=[];
  while(sp>0){
    const cur=stack[--sp];
    const cxi=cur%W, czi=(cur-cxi)/W;
    const X=wx(cxi), Z=wz(czi);
    count++;
    if(X<minx)minx=X; if(X>maxx)maxx=X; if(Z<minz)minz=Z; if(Z>maxz)maxz=Z;
    if(samples.length<3)samples.push([X,Z]);
    // 4-neighbours: enqueue BLOCKED, note WALK adjacency
    const nb=[[cxi-1,czi],[cxi+1,czi],[cxi,czi-1],[cxi,czi+1]];
    for(const [nxi,nzi] of nb){
      if(nxi<0||nxi>=W||nzi<0||nzi>=H)continue;
      const ni=idx(nxi,nzi);
      if(cls[ni]===WALK)adjWalk=true;
      if(cls[ni]===BLOCKED&&!seen[ni]){seen[ni]=1;stack[sp++]=ni;}
    }
  }
  comps.push({count,minx,maxx,minz,maxz,adjWalk,samples,label:labelFor({minx,maxx,minz,maxz})});
}
comps.sort((a,b)=>b.count-a.count);

// ---- interior-pothole class: BLOCKED cells with >=6/8 WALK neighbours ------
const potholes=[];
for(let zi=0;zi<H;zi++)for(let xi=0;xi<W;xi++){
  if(cls[idx(xi,zi)]!==BLOCKED)continue;
  let wn=0;
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
    if(dx===0&&dz===0)continue;
    const nxi=xi+dx,nzi=zi+dz;
    if(nxi<0||nxi>=W||nzi<0||nzi>=H)continue;
    if(cls[idx(nxi,nzi)]===WALK)wn++;
  }
  if(wn>=6)potholes.push([wx(xi),wz(zi),wn]);
}

// ---- (b) reachability: flood from SPAWN over WALK|WATER (both passable) -----
const passable=i=>cls[i]===WALK||cls[i]===WATER;
let sxi=Math.round(CH.SPAWN.player.x)-xMin, szi=Math.round(CH.SPAWN.player.z)-zMin;
let startI=idx(sxi,szi), startNote='';
if(!(sxi>=0&&sxi<W&&szi>=0&&szi<H&&passable(startI))){
  // spiral out to the nearest passable cell (spawn should already be walkable)
  let found=-1;
  for(let r=1;r<=8&&found<0;r++)for(let dz=-r;dz<=r&&found<0;dz++)for(let dx=-r;dx<=r;dx++){
    const nxi=sxi+dx,nzi=szi+dz;
    if(nxi<0||nxi>=W||nzi<0||nzi>=H)continue;
    if(passable(idx(nxi,nzi))){found=idx(nxi,nzi);break;}
  }
  startI=found; startNote=` (spawn cell not passable; using nearest passable at ${found>=0?`${wx(found%W)},${wz((found-found%W)/W)}`:'NONE'})`;
}
const reached=new Uint8Array(N);
if(startI>=0){
  let sp=0; stack[sp++]=startI; reached[startI]=1;
  while(sp>0){
    const cur=stack[--sp];
    const cxi=cur%W, czi=(cur-cxi)/W;
    const nb=[[cxi-1,czi],[cxi+1,czi],[cxi,czi-1],[cxi,czi+1]];
    for(const [nxi,nzi] of nb){
      if(nxi<0||nxi>=W||nzi<0||nzi>=H)continue;
      const ni=idx(nxi,nzi);
      if(!reached[ni]&&passable(ni)){reached[ni]=1;stack[sp++]=ni;}
    }
  }
}
// components of UNREACHED passable cells (4-conn over WALK|WATER); report those
// that contain >=1 WALK cell (walkable pockets sealed behind blocked land).
const seen2=new Uint8Array(N);
const sealed=[];
let nUnreachedWalk=0;
for(let start=0;start<N;start++){
  if(!passable(start)||reached[start]||seen2[start])continue;
  let sp=0; stack[sp++]=start; seen2[start]=1;
  let walkCount=0, minx=1e9,maxx=-1e9,minz=1e9,maxz=-1e9, total=0;
  const wsamp=[];
  while(sp>0){
    const cur=stack[--sp];
    const cxi=cur%W, czi=(cur-cxi)/W;
    total++;
    if(cls[cur]===WALK){
      walkCount++; nUnreachedWalk++;
      const X=wx(cxi),Z=wz(czi);
      if(X<minx)minx=X; if(X>maxx)maxx=X; if(Z<minz)minz=Z; if(Z>maxz)maxz=Z;
      if(wsamp.length<3)wsamp.push([X,Z]);
    }
    const nb=[[cxi-1,czi],[cxi+1,czi],[cxi,czi-1],[cxi,czi+1]];
    for(const [nxi,nzi] of nb){
      if(nxi<0||nxi>=W||nzi<0||nzi>=H)continue;
      const ni=idx(nxi,nzi);
      if(!seen2[ni]&&passable(ni)){seen2[ni]=1;stack[sp++]=ni;}
    }
  }
  if(walkCount>0)sealed.push({walkCount,total,minx,maxx,minz,maxz,samples:wsamp});
}
sealed.sort((a,b)=>b.walkCount-a.walkCount);

// -------------------------------- report ------------------------------------
console.log('\n================= (a) BLOCKED components (4-conn) =================');
console.log(`total components: ${comps.length}`);
for(const c of comps){
  console.log(`  #cells=${c.count}  bbox x[${c.minx}..${c.maxx}] z[${c.minz}..${c.maxz}]  adjWalk=${c.adjWalk}  label="${c.label}"`);
  console.log(`      samples: ${c.samples.map(s=>`(${s[0]},${s[1]})`).join('  ')}`);
}
const unknowns=comps.filter(c=>c.label.startsWith('UNKNOWN'));
if(unknowns.length)console.log(`\n  *** ${unknowns.length} UNKNOWN blocked component(s) — FLAGGED ABOVE ***`);

console.log('\n============ interior potholes (BLOCKED, >=6/8 WALK nb) ============');
console.log(`count: ${potholes.length}`);
for(const p of potholes)console.log(`  (${p[0]},${p[1]})  walkNb=${p[2]}/8`);

console.log('\n========== (b) unreachable walkable pockets (from spawn) ==========');
console.log(`spawn cell: world(${CH.SPAWN.player.x},${CH.SPAWN.player.z}) -> grid(${wx(sxi)},${wz(szi)})${startNote}`);
if(!sealed.length){console.log('  none — every WALK cell reachable from spawn via WALK|WATER');}
else for(const s of sealed){
  console.log(`  walkCells=${s.walkCount} (region total ${s.total})  bbox x[${s.minx}..${s.maxx}] z[${s.minz}..${s.maxz}]`);
  console.log(`      samples: ${s.samples.map(v=>`(${v[0]},${v[1]})`).join('  ')}`);
}

console.log('\n============================ RESULT ===============================');
console.log(`RESULT grid WALK=${nWalk} WATER=${nWater} BLOCKED=${nBlocked}`);
console.log(`RESULT blocked-components=${comps.length}  unknown-components=${unknowns.length}`);
console.log(`RESULT interior-potholes=${potholes.length}`);
console.log(`RESULT unreachable-walk-cells=${nUnreachedWalk}  sealed-pockets=${sealed.length}`);
