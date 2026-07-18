// Walkability probe — replicates main.js walkable()/surfaceY() using the
// pure geometry from coast.js + the new data, so we can assert exact points
// without needing THREE / a browser. Pure JS mirrors of the engine funcs.
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

let pass=0,fail=0;
function expect(label,got,want){const ok=got===want;console.log(`${ok?'PASS':'FAIL'}  ${label}  -> ${got} (want ${want})`);ok?pass++:fail++;}

console.log('--- trail walkable end to end (main + spur + connector + entrance samples) ---');
for(const [x,z] of [...CH.TRAIL_MAIN,...CH.TRAIL_SPUR,...CH.TRAIL_CONNECTOR,...CH.TRAIL_ENTRANCE]) expect(`trail (${x},${z})`,walkable(x,z),true);

console.log('\n--- harbor basin water NOT walkable ---');
for(const [x,z] of [[120,-60],[120,-120],[120,-200],[130,-280],[100,-40],[150,-150]]) expect(`basin (${x},${z})`,walkable(x,z),false);

console.log('\n--- peninsula walkable (reachable via north root) ---');
for(const [x,z] of [[180,-320],[180,-260],[182,-160],[185,-90],[190,-40]]) expect(`peninsula (${x},${z})`,walkable(x,z),true);
expect('north-root bridge (178,-322)',walkable(178,-322),true);
expect('basin gap west of peninsula (120,-150) NOT walkable',walkable(120,-150),false);

console.log('\n--- LSD berm NOT walkable (x < 14) ---');
for(const [x,z] of [[7,0],[10,-400],[5,100],[9,-800]]) expect(`berm (${x},${z})`,walkable(x,z),false);

console.log('\n--- dog beach cove walkable + slopes down to water ---');
expect('cove dry (100,-340)',walkable(100,-340),true);
expect('cove mid (100,-334)',walkable(100,-334),true);
console.log(`  beachH z=-340:${beachH(100,-340).toFixed(2)}  z=-334:${beachH(100,-334).toFixed(2)}  z=-328:${beachH(100,-328).toFixed(2)}  (should trend 0 -> negative)`);

console.log('\n--- Belmont Rocks terraces step DOWN going east ---');
const zc=150; const ys=[];
for(const x of [150,152,154,156,158,160]) ys.push([x,+surfaceY(x,zc).toFixed(3)]);
console.log('  surfaceY along z=150:',JSON.stringify(ys));
let mono=true;for(let i=1;i<ys.length;i++)if(ys[i][1]>ys[i-1][1]+1e-6)mono=false;
expect('terraces monotonically step down eastward',mono,true);
expect('rocks top walkable (150,150)',walkable(150,150),true);

console.log('\n--- finger docks walkable, water between docks not ---');
expect('finger dock plank (85,-140)',walkable(85,-140),true);
expect('water between docks (85,-170) NOT walkable',walkable(85,-170),false);
expect('pier deck (208,-105)',walkable(208,-105),true);

// ===== Job 1 (dual path) + Job 2 (fence clearance / gates) =====
// uniform Catmull-Rom sampler (close mirror of the THREE curve used in paths.js)
function crSample(ctrl, step){
  const m=ctrl.length; if(m<2) return ctrl.map(p=>[p[0],p[1]]);
  const pt=i=>ctrl[Math.max(0,Math.min(m-1,i))];
  const P=[[ctrl[0][0],ctrl[0][1]]];
  for(let s=0;s<m-1;s++){
    const p0=pt(s-1),p1=pt(s),p2=pt(s+1),p3=pt(s+2);
    const n=Math.max(1,Math.round(Math.hypot(p2[0]-p1[0],p2[1]-p1[1])/step));
    for(let k=1;k<=n;k++){const t=k/n,t2=t*t,t3=t2*t;
      const x=0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3);
      const z=0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3);
      P.push([x,z]);}
  }
  return P;
}
function offsetLine(pts, off){                 // parallel curve at lateral offset `off`
  const O=[];
  for(let i=0;i<pts.length;i++){
    const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)];
    const tx=b[0]-a[0],tz=b[1]-a[1],L=Math.hypot(tx,tz)||1;
    O.push([pts[i][0]+(-tz/L)*off,pts[i][1]+(tx/L)*off]);
  }
  return O;
}
function ptSeg(px,pz,ax,az,bx,bz){
  const dx=bx-ax,dz=bz-az,L2=dx*dx+dz*dz||1e-9;
  let t=((px-ax)*dx+(pz-az)*dz)/L2; t=clamp(t,0,1);
  const cx=ax+dx*t,cz=az+dz*t; return {d:Math.hypot(px-cx,pz-cz),cx,cz};
}
const inRect=(x,z,g)=>x>=g.x0&&x<=g.x1&&z>=g.z0&&z<=g.z1;
function fenceList(){
  const F=[],g=CH.GOLF.bounds,s=CH.SANCTUARY.bounds,sg=[CH.SANCTUARY.gate];
  F.push({a:[g.x0,g.z1],b:[g.x0,g.z0],gates:[]});         // golf west
  F.push({a:[g.x0,g.z1],b:[g.x1,g.z1],gates:[]});         // golf south
  F.push({a:[g.x0,g.z0],b:[g.x1,g.z0],gates:[]});         // golf north
  { const O=CH.sanctuaryOutline();                        // sanctuary: ORGANIC fence loop (1 gate)
    for(let i=0;i<O.length-1;i++)F.push({a:O[i],b:O[i+1],gates:sg}); }
  for(const ln of CH.DOG_FENCE.lines) F.push({a:ln[0],b:ln[1],gates:CH.DOG_FENCE.gates});
  return F;
}
const FENCES=fenceList();
function clearOfFences(label,pts,halfW){
  let minClr=1e9,worst=null;
  for(const p of pts) for(const f of FENCES){
    const r=ptSeg(p[0],p[1],f.a[0],f.a[1],f.b[0],f.b[1]);
    if(f.gates.some(gt=>inRect(r.cx,r.cz,gt))) continue;  // crossing is allowed at a gate
    const clr=r.d-halfW;
    if(clr<minClr){minClr=clr;worst=`(${p[0].toFixed(0)},${p[1].toFixed(0)}) d=${r.d.toFixed(2)}`;}
  }
  expect(`${label} clears fences by >=1.2m (min edge clr ${minClr.toFixed(2)} at ${worst})`,minClr>=1.2-1e-2,true);
}
const bikeC=crSample(CH.TRAIL_MAIN,1.2);
const walkOff=CH.TRAIL_STYLE.bike.width/2+CH.TRAIL_STYLE.gap+CH.TRAIL_STYLE.walk.width/2;
const walkC=offsetLine(bikeC,walkOff);
const spurC=crSample(CH.TRAIL_SPUR,1.2);

console.log('\n--- trail (with width) clears every fence except at its gates ---');
clearOfFences('bike path',bikeC,CH.TRAIL_STYLE.bike.width/2);
clearOfFences('walk path',walkC,CH.TRAIL_STYLE.walk.width/2);
clearOfFences('spur',spurC,CH.TRAIL_STYLE.spur.width/2);

console.log('\n--- both dual ribbons stay on walkable land ---');
let bikeBad=0,walkBad=0;
for(const p of bikeC) if(!walkable(p[0],p[1])) bikeBad++;
for(const p of walkC) if(!walkable(p[0],p[1])) walkBad++;
expect(`bike centerline all on land (${bikeBad} off)`,bikeBad,0);
expect(`walk centerline all on land (${walkBad} off)`,walkBad,0);

console.log('\n--- spur is the peninsula route: NO paved ribbon on the dog-beach sand ---');
{ const b=CH.DOG_BEACH.bounds;
  let onSand=0;
  for(const p of spurC) if(p[0]>=b.x0&&p[0]<=b.x1&&p[1]>=b.z0&&p[1]<=b.z1) onSand++;
  expect(`spur has no sample on the dog-beach sand (${onSand} on sand)`,onSand,0);
  // the cove still keeps BOTH gates (people enter on foot)
  expect('dog beach still has 2 gates',CH.DOG_FENCE.gates.length,2);
}
expect('spur reaches the peninsula (last pt walkable)',walkable(spurC[spurC.length-1][0],spurC[spurC.length-1][1]),true);

console.log('\n--- sanctuary is the lakeside block (x100-200, z-420..-357) ---');
{ const s=CH.SANCTUARY.bounds, area=Math.abs((s.x1-s.x0)*(s.z1-s.z0));
  expect(`sanctuary area ${area} == 6300 (100 x 63 lakeside block)`,area,6300);
  expect(`sanctuary north edge (${s.z0}) sits south of the golf south fence (${CH.GOLF.bounds.z1})`,s.z0>CH.GOLF.bounds.z1,true);
  const gt=CH.SANCTUARY.gate;
  expect('sanctuary gate on the WEST fence (spans x100)',gt.x0<=s.x0+2&&gt.x1>=s.x0,true); }

console.log('\n--- sanctuary hero room: organic outline + interior loop + deck ---');
{ const O=CH.sanctuaryOutline(),L=CH.sanctuaryLoop(),s=CH.SANCTUARY.bounds;
  let out=0;for(const[x,z]of O)if(x<s.x0-1.5||x>s.x1+1.5||z<s.z0-1.5||z>s.z1+1.5)out++;
  expect(`organic outline stays in the lakeside block (${out} escapees)`,out,0);
  let bad=0;for(const[x,z]of L)if(!walkable(x,z))bad++;
  expect(`interior walking loop fully walkable (${bad} bad of ${L.length})`,bad,0);
  const D=CH.SANCTUARY.deck,dcx=(D.x0+D.x1)/2,dcz=(D.z0+D.z1)/2;
  expect('deck platform walkable',walkable(dcx,dcz),true);
  expect(`deck surface at h=${D.h}`,onRect(dcx,dcz).h,D.h);
  for(const st of D.stairs)expect(`stair rect walkable at h=${st.h}`,onRect((st.x0+st.x1)/2,(st.z0+st.z1)/2).h,st.h);
  for(const sp of CH.SANCTUARY.deck.sits)expect(`sit spot (${sp.x},${sp.z}) on the deck`,onRect(sp.x,sp.z)!==null,true);
  // pip the loop inside the outline (the room contains its path)
  const pipO=(x,z)=>{let c=false;for(let i=0,j=O.length-1;i<O.length;j=i++){const xi=O[i][0],zi=O[i][1],xj=O[j][0],zj=O[j][1];if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/(zj-zi)+xi))c=!c}return c};
  let outL=0;for(const[x,z]of L)if(!pipO(x,z))outL++;
  expect(`interior loop fully inside the outline (${outL} out)`,outL,0); }

// ===== Job 5: FURNITURE / PROP-VS-TRAIL AUDIT =====
// Every data-driven prop (benches, trail lamps, signs, hedges, tennis +
// diversey fences) must clear EVERY ribbon footprint by >= 0.6 m.
const loopC=crSample(CH.TRAIL_LOOP,1.2);
const connC=crSample(CH.TRAIL_CONNECTOR,1.2);
const entC=crSample(CH.TRAIL_ENTRANCE,1.2);
const RIBBONS=[
  {name:'bike',pts:bikeC,half:CH.TRAIL_STYLE.bike.width/2},
  {name:'walk',pts:walkC,half:CH.TRAIL_STYLE.walk.width/2},
  {name:'spur',pts:spurC,half:CH.TRAIL_STYLE.spur.width/2},
  {name:'loop',pts:loopC,half:CH.TRAIL_STYLE.loop.width/2},
  {name:'conn',pts:connC,half:CH.TRAIL_STYLE.loop.width/2},
  {name:'ent',pts:entC,half:CH.TRAIL_STYLE.loop.width/2},
];
function ribbonClear(x,z,propR){          // min footprint clearance to any ribbon
  let min=1e9,worst=null;
  for(const rb of RIBBONS){
    for(let i=0;i<rb.pts.length-1;i++){
      const r=ptSeg(x,z,rb.pts[i][0],rb.pts[i][1],rb.pts[i+1][0],rb.pts[i+1][1]);
      const clr=r.d-rb.half-propR;
      if(clr<min){min=clr;worst=`${rb.name} d=${r.d.toFixed(2)}`;}
    }
  }
  return {min,worst};
}
function auditProps(label,pts,propR){
  let minClr=1e9,worst=null,off=0;
  for(const p of pts){
    const c=ribbonClear(p[0],p[1],propR);
    if(c.min<0.6-1e-6)off++;
    if(c.min<minClr){minClr=c.min;worst=`(${p[0].toFixed(0)},${p[1].toFixed(0)}) ${c.worst}`;}
  }
  expect(`${label}: all clear ribbons by >=0.6m (min ${minClr.toFixed(2)} at ${worst}; ${off} offenders)`,off,0);
}
console.log('\n--- Job 5: prop-vs-trail audit (>=0.6 m off every ribbon footprint) ---');
// benches (seat half-length ~1.2)
auditProps('benches',CH.BENCHES.map(b=>[b.x,b.z]),1.2);
// signs (post/board footprint ~0.5)
auditProps('signs',CH.SIGNS.map(s=>[s.x,s.z]),0.5);
// Chevron sculpture pad (Job 3) must clear the corner-hugging trail
auditProps('chevron',[[CH.CHEVRON.pos[0],CH.CHEVRON.pos[2]]],CH.CHEVRON.collide);
// hedges — regenerate the spots exactly like props.js (west/north/cap), r~2.9
{
  const H=CH.HEDGES,spots=[];
  const inGap=z=>H.west.gaps&&H.west.gaps.some(g=>z>=g[0]&&z<=g[1]);
  for(let z=H.west.z0;z<=H.west.z1;z+=H.west.step){if(inGap(z))continue;spots.push([H.west.x,z]);}
  for(let x=H.north.x0;x<=H.north.x1;x+=H.north.step)spots.push([x,H.north.z]);
  if(H.cap)for(let x=H.cap.x0;x<=H.cap.x1;x+=H.cap.step)spots.push([x,H.cap.z]);
  auditProps('hedges',spots,2.9);
}
// trail lamps — structural guarantee: all on the -1 (non-walk) side at a fixed
// offset, so clearance is independent of where on the curve they land.
{
  const allNeg=CH.LAMPS.trail.every(([,s])=>s===-1);
  expect('trail lamps all on the -1 (bike-only) side',allNeg,true);
  const lampClr=CH.LAMPS.offset-CH.TRAIL_STYLE.bike.width/2-0.4;   // offset - bikeHalf - lampR
  expect(`trail lamps clear the bike ribbon by >=0.6m (${lampClr.toFixed(2)})`,lampClr>=0.6-1e-6,true);
}

// ===== Job 2: WAVELAND TENNIS COURTS =====
console.log('\n--- Job 2: tennis block clears the trail + sanctuary fence by >=3 m ---');
{
  const T=CH.TENNIS,b=T.block;
  // fence rect edges sampled, min distance to any trail ribbon
  const edge=[];for(let t=0;t<=1;t+=0.02){
    edge.push([b.x0+(b.x1-b.x0)*t,b.z0],[b.x0+(b.x1-b.x0)*t,b.z1],
              [b.x0,b.z0+(b.z1-b.z0)*t],[b.x1,b.z0+(b.z1-b.z0)*t]);
  }
  let minTrail=1e9;
  for(const p of edge){const c=ribbonClear(p[0],p[1],0);if(c.min<minTrail)minTrail=c.min;}
  expect(`tennis fence clears every ribbon by >=3 m (min ${minTrail.toFixed(2)})`,minTrail>=3-1e-2,true);
  // clear of the sanctuary WEST fence (x100, z-420..-357)
  const s=CH.SANCTUARY.bounds;let minSanc=1e9;
  for(const p of edge){const r=ptSeg(p[0],p[1],s.x0,s.z0,s.x0,s.z1);if(r.d<minSanc)minSanc=r.d;}
  expect(`tennis fence clears the sanctuary west fence by >=3 m (min ${minSanc.toFixed(2)})`,minSanc>=3-1e-2,true);
  // all 4 courts sit on walkable land
  let cbad=0;for(const [cx,cz] of T.courts)if(!walkable(cx,cz))cbad++;
  expect(`all 4 tennis courts on land (${cbad} off)`,cbad,0);
  expect('tennis has 4 courts',T.courts.length,4);
}

// ===== Job 3: DIVERSEY RANGE + MINI GOLF =====
console.log('\n--- Job 3: Diversey range + mini golf on land, clear of the trail ---');
{
  const D=CH.DIVERSEY,r=D.range,m=D.mini;
  // range + mini-golf footprints on walkable land
  const pts=[[r.x0,r.z0],[r.x1,r.z0],[r.x0,r.z1],[r.x1,r.z1],[(r.x0+r.x1)/2,(r.z0+r.z1)/2],
             [m.x0,m.z0],[m.x1,m.z1],...m.holes.flatMap(h=>[h.tee,h.cup])];
  let dbad=0;for(const p of pts)if(!walkable(p[0],p[1]))dbad++;
  expect(`Diversey range + mini golf all on land (${dbad} off)`,dbad,0);
  // fence edges clear of the trail ribbons
  const edge=[];for(let t=0;t<=1;t+=0.03){
    edge.push([r.x0+(r.x1-r.x0)*t,r.z0],[r.x0,r.z0+(r.z1-r.z0)*t],[r.x1,r.z0+(r.z1-r.z0)*t]);
  }
  let minTrail=1e9;for(const p of edge){const c=ribbonClear(p[0],p[1],0);if(c.min<minTrail)minTrail=c.min;}
  expect(`Diversey fence clears every ribbon by >=3 m (min ${minTrail.toFixed(2)})`,minTrail>=3-1e-2,true);
  expect('Diversey has 3 mini-golf holes',m.holes.length,3);
}

// ===== Task 028: bay hitting deck (elevated walk rect) + mini-golf felt fairways =====
console.log('\n--- Task 028: enterable bay deck walkable+elevated, mini-golf tees/cups on their felt ---');
{
  const B=CH.DIVERSEY.bays, dc=[(B.deckRect.x0+B.deckRect.x1)/2,(B.deckRect.z0+B.deckRect.z1)/2];
  expect('bay deck centre walkable',walkable(dc[0],dc[1]),true);
  expect(`bay deck surface h=${B.deckRect.h}`,onRect(dc[0],dc[1]).h,B.deckRect.h);
  for(const hx of B.hit.xs)expect(`bay hit spot (${hx},${B.hit.z}) on the deck`,onRect(hx,B.hit.z)!==null,true);
  const m=CH.DIVERSEY.mini;
  for(const h of m.holes){
    expect(`hole ${h.id} tee inside its fairway`,pip(h.tee[0],h.tee[1],h.fair),true);
    expect(`hole ${h.id} cup inside its fairway`,pip(h.cup[0],h.cup[1],h.fair),true);
    expect(`hole ${h.id} fairway is a polygon (>=4 verts)`,h.fair.length>=4,true);
  }
}

// ===== Job 4: south terraces keep the 7-step Rocks profile around the curve =====
console.log('\n--- Job 4: 7-step revetment continues around the corner to z403 ---');
for(const zc of [150,240,300,340,360,380,400]) expect(`tier profile at z=${zc} is the 7-step Rocks`,tierProfile(zc).w.length,7);
expect('revetment walkable near the rocks/corner join (149,338)',walkable(149,338),true);

// ===== Job 1/5: CORNER WRAP — 7 tiers stepping DOWN seaward around the arc =====
// Sample seaward along the local corner-segment normal at several arc angles; the
// surface must step DOWN monotonically and reach the 7th (bottom) tier each time.
console.log('\n--- Job 1/5: corner steps down monotonically seaward at 5 arc angles ---');
const CORNER_SEGS=buildSegs(COAST_CORNER);
for(const zc of [348,362,376,390,400]){
  const topx=CH.COAST_CORNER_PARAMS.fx(zc);
  let s=CORNER_SEGS[0],bd=1e9;                          // nearest corner segment to this z
  for(const seg of CORNER_SEGS){const d=Math.abs(seg.az-zc);if(d<bd){bd=d;s=seg}}
  const ys=[];let mono=true,maxI=-1,allWalk=true;
  for(const lat of [0.5,3,6,9,12,15,17.8]){
    const px=topx+s.nx*lat,pz=zc+s.nz*lat;
    const y=surfaceY(px,pz);ys.push(+y.toFixed(2));
    const q=coastQuery(px,pz);if(q){const t=tierAt(q.lat,q.z);if(t)maxI=Math.max(maxI,t.i);}
    if(lat<=15&&!walkable(px,pz))allWalk=false;         // inner steps must be standable
  }
  for(let i=1;i<ys.length;i++)if(ys[i]>ys[i-1]+1e-6)mono=false;
  expect(`corner z=${zc}: steps down seaward ${JSON.stringify(ys)}`,mono,true);
  expect(`corner z=${zc}: reaches the 7th tier (i=6)`,maxI,6);
  expect(`corner z=${zc}: steps walkable`,allWalk,true);
}

// ===== Job 4 + pier re-anchor: THE PIER lands on the revetment top edge and
// then SPANS OPEN WATER (a carved slip), walkable root->tip, water beyond rails.
console.log('\n--- Job 4: corner pier lands on the top edge, spans open water, walkable to the tip ---');
{ const P=CH.DECKS[1].walk;                             // corner pier walk rect
  const xc=(P.x1+P.x2)/2;
  // terrain (ignoring the plank rect) at a point: true only if genuine OPEN WATER
  const overWater=(x,z)=>{ if(pip(x,z,LAND))return false; const q=coastQuery(x,z);
    if(q&&q.ae<0.9&&q.lat>-0.6){const t=tierAt(q.lat,q.z);if(t&&q.lat<profileTotal(q.z)-0.3)return false;} return true; };
  expect(`pier north root walkable (${xc},${(P.z1+0.5).toFixed(0)})`,walkable(xc,P.z1+0.5),true);
  expect('land immediately NORTH of the pier root is walkable (top-edge landing)',walkable(xc,P.z1-1.5),true);
  expect(`pier walkable at the tip (${xc},${(P.z2-0.5).toFixed(0)})`,walkable(xc,P.z2-0.5),true);
  expect('pier deck walkable mid-span',walkable(xc,(P.z1+P.z2)/2),true);
  expect(`pier tip inside the world clamp (z${(P.z2-0.5).toFixed(1)} <= ${CH.WORLD_CLAMP.zMax})`,P.z2-0.5<=CH.WORLD_CLAMP.zMax,true);
  // the deck south of its top-edge landing spans OPEN WATER (carved slip), not the
  // descending revetment steps — only the plank walk rect makes it walkable.
  expect(`deck south of root is over WATER not steps (${xc},${(P.z1+12).toFixed(0)})`,overWater(xc,P.z1+12),true);
  expect(`deck near-tip is over WATER not steps (${xc},${(P.z2-4).toFixed(0)})`,overWater(xc,P.z2-4),true);
  // water flanks both rails near the tip (pier juts over the lake)
  expect('open water WEST of the pier tip NOT walkable',walkable(P.x1-6,P.z2-2),false);
  expect('open water EAST of the pier tip NOT walkable',walkable(P.x2+6,P.z2-2),false);
}

// ===== NEW: PENINSULA SOUTH-TIP TERRACES (wrap the horseshoe like the Diversey corner) =====
// The tip's bulkhead arc is now a TIER_DEFAULT (4-step) terraced coast piece. The steps
// must step DOWN seaward around the horseshoe, be walkable on top, have water beyond, and
// join cleanly to the west bulkhead (SW) and to COAST_PEN's tiers (SE) with no holes/leaks.
console.log('\n--- Tip: steps step DOWN seaward & reach a low tier at 4+ arc angles ---');
{
  // sample along each tip segment's own seaward normal; pick angles across the wrap
  // (SW face, mid, SE face) — the very apex is naturally compressed (tip is narrow),
  // so we assert monotonic-down + a low tier on the inner run and water well beyond.
  const angles=[];
  for(const zc of [-24,-22,-20,-18.5,-19,-21]){        // spread around the horseshoe
    let s=TIP_SEGS[0],bd=1e9;for(const seg of TIP_SEGS){const d=Math.abs(seg.az-zc);if(d<bd){bd=d;s=seg}}
    angles.push(s);
  }
  let okAngles=0;
  angles.forEach((s,ai)=>{
    const ys=[];let mono=true,maxI=-1,allWalk=true;
    for(const lat of [0.4,2.5,5,7.5]){                 // inner run (fits even the narrow apex)
      const px=s.ax+s.nx*lat,pz=s.az+s.nz*lat;
      ys.push(+surfaceY(px,pz).toFixed(2));
      const q=coastQuery(px,pz);if(q){const t=tierAt(q.lat,q.z);if(t)maxI=Math.max(maxI,t.i);}
      if(!walkable(px,pz))allWalk=false;
    }
    for(let i=1;i<ys.length;i++)if(ys[i]>ys[i-1]+1e-6)mono=false;
    const waterBeyond=!walkable(s.ax+s.nx*13,s.az+s.nz*13);   // open water past the last step
    const good=mono&&allWalk&&maxI>=2&&waterBeyond;
    if(good)okAngles++;
    console.log(`  angle${ai} (${s.ax.toFixed(0)},${s.az.toFixed(0)}) ys=${JSON.stringify(ys)} mono=${mono} walk=${allWalk} maxTier=${maxI} waterBeyond=${waterBeyond}`);
  });
  expect(`tip steps step down + walkable + water beyond at >=4 arc angles (${okAngles}/6)`,okAngles>=4,true);
}

console.log('\n--- Tip: transition seams have no walkability holes ---');
// SW seam: west bulkhead land -> tip step top (continuous around the SW turn ~[166,-24])
expect('west bulkhead land walkable (161,-60)',walkable(161,-60),true);
expect('SW-turn step top walkable (167,-23)',walkable(167,-23),true);
expect('south-point step top walkable (176,-19)',walkable(176,-19),true);
// SE seam: tip -> COAST_PEN tiers (continuous through P_START)
expect('tip/COAST_PEN join top walkable (~P_START)',walkable(P_START[0]-1.5,P_START[1]-0.5),true);
expect('COAST_PEN tier just north of the join walkable (194,-34)',walkable(194,-34),true);

console.log('\n--- Tip: basin/mouth water around the tip stays NOT walkable (no leaks) ---');
// west of the peninsula edge = basin (docks inside, seawall — no steps leaking onto water)
for(const [x,z] of [[156,-30],[157,-38],[153,-22],[158,-45],[150,-18]]) expect(`basin W of tip (${x},${z}) NOT walkable`,walkable(x,z),false);
// south of the tip = harbor-mouth OPEN water, BEYOND the 4-step apron. NB: the TIER_DEFAULT
// profile is ~10 m wide and the tip is convex, so the stepped apron itself reaches ~z-7 at
// the south point (rendered steps, walkable) — genuine mouth water is south of that (z>=-6).
for(const [x,z] of [[176,-2],[184,-3],[190,-5],[168,-4],[180,-1]]) expect(`mouth S of tip (${x},${z}) NOT walkable`,walkable(x,z),false);

console.log('\n--- Tip: harbor light sits on a walkable top step ---');
expect(`harbor light pos (${CH.HARBOR_LIGHT.pos[0]},${CH.HARBOR_LIGHT.pos[1]}) walkable`,walkable(CH.HARBOR_LIGHT.pos[0],CH.HARBOR_LIGHT.pos[1]),true);

// ===== WRIGLEYVILLE CELL — walkableW/surfaceYW are imported from the data
// module itself (the engine uses the SAME functions — no mirror to drift).
console.log('\n--- Wrigleyville: street corridors walkable (double-wide, task 009) ---');
for(const [x,z] of [[-200,-400],[-140,-400],[-300,-400],[-190,-450],[-250,-560],[-230,-580],[-310,-470]])
  expect(`street (${x},${z})`,WV.walkableW(x,z),true);
expect('Clark diagonal mid-block walkable',WV.walkableW(WV.clarkX(-450),-450),true);
expect('Clark @ Waveland (-334.8,-560) walkable',WV.walkableW(WV.clarkX(-560),-560),true);
expect('Addison N sidewalk (-212,-410.5) walkable',WV.walkableW(-212,-410.5),true);
expect('Sheffield W sidewalk (-199,-530) walkable',WV.walkableW(-199,-530),true);

console.log('\n--- Wrigleyville: the park + lots are NOT walkable (game day) ---');
for(const [x,z] of [[-240,-480],[-260,-425],[-216,-534],[-170,-541],[-242,-582],[-221,-581],[-283.5,-430]])
  expect(`inside a lot/the park (${x},${z}) NOT walkable`,WV.walkableW(x,z),false);

console.log('\n--- Wrigleyville: barricade mouths end the corridors ---');
for(const [x,z] of [[-120,-400],[-336,-400],[-356,-560],[-174,-560],[-190,-382],[-190,-576],[-231,-608],[-290,-382]])
  expect(`beyond barricade (${x},${z}) NOT walkable`,WV.walkableW(x,z),false);

console.log('\n--- Wrigleyville: Addison platform + stairs (elevated surfaces) ---');
expect('platform center (-140,-442) walkable',WV.walkableW(-140,-442),true);
expect('platform y = 7.6',WV.surfaceYW(-140,-442),7.6);
expect('track bed west (-145.5,-460) NOT walkable',WV.walkableW(-145.5,-460),false);
expect('embankment top away from platform (-140,-480) NOT walkable',WV.walkableW(-140,-480),false);
expect('under the bridge (-140,-400) walkable at street level',WV.walkableW(-140,-400)&&WV.surfaceYW(-140,-400)===0,true);
{ const yMid=WV.surfaceYW(-140,-425);
  expect(`station stair mid (-140,-425) between floors (${yMid.toFixed(2)})`,yMid>1&&yMid<7.5,true); }
expect('station stair landing (-140,-413) at street',WV.surfaceYW(-140,-413),0);

console.log('\n--- Wrigleyville: the climbable rooftop ---');
expect('roof center (-212.5,-581) walkable',WV.walkableW(-212.5,-581),true);
expect('roof y = 9.6',WV.surfaceYW(-212.5,-581),9.6);
{ const yMid=WV.surfaceYW(-206.5,-580);
  expect(`rooftop stair mid (-206.5,-580) between floors (${yMid.toFixed(2)})`,yMid>1&&yMid<9.5,true); }
expect('neighbor roof (-221,-581) NOT walkable (only one is open)',WV.walkableW(-221,-581),false);

console.log('\n--- Wrigleyville: the Sluggers rooftop cage (task 009) ---');
{ const SL=WV.SLUGGERS_W, c=Math.cos(SL.th), s=Math.sin(SL.th);
  const w=(lx,lz)=>[SL.cx+lx*c+lz*s, SL.cz-lx*s+lz*c];   // building-local -> world (matches village.js)
  const wk=(lx,lz)=>WV.walkableW(...w(lx,lz)), sy=(lx,lz)=>+WV.surfaceYW(...w(lx,lz)).toFixed(2);
  expect(`deck centre walkable`,wk(0,0),true);
  expect(`deck at roofY (${SL.roofY})`,sy(0,0),SL.roofY);
  expect('deck NW corner walkable',wk(-4.5,6),true);
  expect('deck SW corner walkable',wk(-4.5,-6),true);
  { const y=sy(7.2,0); expect(`stair mid (${y}) between floors`,y>1&&y<SL.roofY-0.5,true); }
  expect('stair base ~street level',sy(7.2,-6.8)<0.4,true);
  expect(`stair top ~roofY`,sy(7.2,6.8),SL.roofY);
  expect('street mouth (stair base landing) walkable',wk(7.8,-7.5),true);
  expect('street mouth at grade',sy(7.8,-7.5),0);
  // enclosure — off the deck footprint must NOT be walkable (no elevator surface)
  expect('west of roof (lot) NOT walkable',wk(-8,0),false);
  expect('north gap to Sports Corner NOT walkable',wk(0,9.5),false);
  expect('south of the building NOT walkable',wk(0,-10),false);
  // the gap between deck (lx<=5) and mid-stair (lx>=6) stays NON-walkable — this
  // is the seam that stops a deck<->stair elevator except at the top bridge.
  expect('deck/mid-stair seam NOT walkable',wk(5.5,0),false);
  // the Clark corridor beside/below the stair is untouched
  expect('Clark corridor @z-480 still walkable at grade',WV.walkableW(WV.clarkX(-480),-480)&&WV.surfaceYW(WV.clarkX(-480),-480)===0,true);
}

console.log('\n--- Wrigleyville: the climbable Sheffield rooftop (task 054) ---');
{ const R=WV.ROOFTOPS_W, b=R.sheffield[0], SS=R.sheffStair, SL=R.sheffLanding;
  const dcx=(b.x0+b.x1)/2, dcz=(b.z0+b.z1)/2, sx=(SS.x0+SS.x1)/2, lx=(SL.x0+SL.x1)/2, lz=(SL.z0+SL.z1)/2;
  expect('Sheffield deck centre walkable',WV.walkableW(dcx,dcz),true);
  expect(`Sheffield deck at roofY (${R.roofY})`,WV.surfaceYW(dcx,dcz),R.roofY);
  expect('deck SW corner (park side) walkable',WV.walkableW(b.x0+1,b.z1-1),true);   // -177,-519
  expect('deck NE corner walkable',WV.walkableW(b.x1-1,b.z0+1),true);               // -165,-533
  { const y=WV.surfaceYW(sx,(SS.z0+SS.z1)/2);
    expect(`Sheffield stair mid (${y.toFixed(2)}) between floors`,y>1&&y<R.roofY-0.5,true); }
  expect('Sheffield stair bottom ~sidewalk',WV.surfaceYW(sx,SS.z1)<0.4,true);
  expect(`Sheffield stair top ~roofY`,WV.surfaceYW(sx,SS.z0),R.roofY);
  expect('stair-top landing walkable at roofY',WV.walkableW(lx,lz)&&WV.surfaceYW(lx,lz)===R.roofY,true);
  // enclosure — the sidewalk west of the stair stays at grade; the neighbour
  // roofs (S1/S2) and the building interior are NOT walkable (only S0 is open)
  expect('Sheffield sidewalk west of the stair still grade',WV.walkableW(-186,-525)&&WV.surfaceYW(-186,-525)===0,true);
  expect('neighbour roof S1 (-171,-510) NOT walkable',WV.walkableW(-171,-510),false);
  expect('neighbour roof S2 (-171,-494) NOT walkable',WV.walkableW(-171,-494),false);
}

console.log('\n--- Wrigleyville: Gallagher Way is a WEDGE — Clark curb to the bowl wall (task 019) ---');
expect('plaza @ z-480 (clark+25) walkable',WV.walkableW(WV.clarkX(-480)+25,-480),true);
expect('east of the bowl wall @ z-480 (clark+31) NOT walkable',WV.walkableW(WV.clarkX(-480)+31,-480),false);
expect('WIDE north: plaza @ z-516 (clark+38) walkable',WV.walkableW(WV.clarkX(-516)+38,-516),true);
expect('NARROW south: plaza @ z-450 (clark+22) walkable',WV.walkableW(WV.clarkX(-450)+22,-450),true);
expect('NARROW south: @ z-450 (clark+26) NOT walkable (past the tip wall)',WV.walkableW(WV.clarkX(-450)+26,-450),false);
{ const w=z=>WV.gallagherWallX(z)-(WV.clarkX(z)+14); const zs=[-518,-500,-478,-458,-448];
  let mono=true; for(let i=1;i<zs.length;i++) if(w(zs[i])>w(zs[i-1])+1e-9) mono=false;
  expect(`wedge narrows monotonically north->south (${zs.map(z=>w(z).toFixed(1)).join(' -> ')})`,mono,true); }
expect('box office closes the south: (clark+20,z-440) NOT walkable',WV.walkableW(WV.clarkX(-440)+20,-440),false);
expect('plaza north edge @ z-518 (clark+20) walkable',WV.walkableW(WV.clarkX(-518)+20,-518),true);
expect('Gallagher office block @ z-530 (clark+20) NOT walkable (plaza stops at -520)',WV.walkableW(WV.clarkX(-530)+20,-530),false);
expect('statue row spot (-297,-516.5) walkable',WV.walkableW(-297,-516.5),true);
expect('gallagher gate sits ON the wall line',Math.abs(WV.STADIUM_W.gates.gallagher.x-WV.gallagherWallX(-490))<1e-9,true);

console.log('\n--- Wrigleyville: the rounded marquee corner + its red-brick apron ---');
expect('apron inside the crescent (-278.5,-416.5) walkable',WV.walkableW(-278.5,-416.5),true);
expect('apron at street level',WV.surfaceYW(-278.5,-416.5),0);
expect('apron mid-crescent (-281,-419) walkable',WV.walkableW(-281,-419),true);
expect('behind the curve (-272,-420) NOT walkable (inside the stadium fillet)',WV.walkableW(-272,-420),false);
expect('inside the fillet near the apex (-274,-421) NOT walkable',WV.walkableW(-274,-421),false);

console.log('\n--- Wrigleyville: the SE corner court at the angled bowl corner (task 020) ---');
expect('court center (-212,-424) walkable',WV.walkableW(-212,-424),true);
expect('court at street level',WV.surfaceYW(-212,-424),0);
expect('court near the Addison end (-232,-416) walkable',WV.walkableW(-232,-416),true);
expect('court near the Sheffield end (-204,-434) walkable',WV.walkableW(-204,-434),true);
expect('court in front of Gate D (-214,-422) walkable',WV.walkableW(-214,-422),true);
expect('behind the diagonal (-220,-428) NOT walkable (inside the bowl)',WV.walkableW(-220,-428),false);
expect('deep behind the diagonal (-228,-424) NOT walkable',WV.walkableW(-228,-424),false);
expect('court meets the Addison sidewalk (-210,-414.5) walkable',WV.walkableW(-210,-414.5),true);
expect('court meets the Sheffield sidewalk (-202.5,-436) walkable',WV.walkableW(-202.5,-436),true);

console.log('\n--- Wrigleyville: the Caray plaza apron at the chamfered Bleacher Gate (task 009) ---');
expect('Caray statue spot (-206.5,-543.5) walkable',WV.walkableW(-206.5,-543.5),true);
expect('Caray plaza at street level',WV.surfaceYW(-206.5,-543.5),0);
expect('apron in front of the gate (-209,-541) walkable',WV.walkableW(-209,-541),true);
expect('apron corner by the crosswalks (-203,-547) walkable',WV.walkableW(-203,-547),true);
expect('apron meets the Sheffield sidewalk (-202.5,-540) walkable',WV.walkableW(-202.5,-540),true);
expect('past the chamfer wall (-216,-534) NOT walkable (inside the park)',WV.walkableW(-216,-534),false);

// ===== Task 013: suggestion box (relocated to the AIDS Garden spawn plaza, task 023) =====
// The box is a small collider on EXISTING walkable LAND — it must add no new
// walkable surface and must clear every trail ribbon like any other prop.
console.log('\n--- Task 013 (relocated by owner, task 023): suggestion box at the new spawn ---');
{
  const b=CH.SUGGESTION_BOX,r=0.5*(b.scale||1);
  expect(`box ground walkable (${b.x},${b.z})`,walkable(b.x,b.z),true);
  expect('box adds no elevated walk rect (still ground level)',surfaceY(b.x,b.z),0);
  // players approach from the spawn (west) and off the entrance path (north)
  expect(`W approach spot walkable (${b.x-3},${b.z})`,walkable(b.x-3,b.z),true);
  expect(`N approach spot walkable (${b.x},${b.z-2.5})`,walkable(b.x,b.z-2.5),true);
  // clears every trail ribbon footprint by >=0.6 m (kiosk-scaled radius)
  auditProps('suggestion box',[[b.x,b.z]],r);
}

// ===== Task 023: AIDS Garden entrance — monument, peanut loop, entrance path, spawn =====
console.log('\n--- Task 023: peanut loop + entrance path fully walkable ---');
{
  let bad=0;for(const p of loopC)if(!walkable(p[0],p[1]))bad++;
  expect(`peanut loop ribbon fully walkable (${bad} bad of ${loopC.length})`,bad,0);
  let ebad=0;for(const p of entC)if(!walkable(p[0],p[1]))ebad++;
  expect(`entrance path fully walkable (${ebad} bad of ${entC.length})`,ebad,0);
  // welds preserved: connector T (79,120) and MAIN tangent (111,120) sit ON the loop ribbon
  const dT=Math.min(...loopC.map((p,i)=>i<loopC.length-1?ptSeg(79,120,p[0],p[1],loopC[i+1][0],loopC[i+1][1]).d:1e9));
  const dM=Math.min(...loopC.map((p,i)=>i<loopC.length-1?ptSeg(111,120,p[0],p[1],loopC[i+1][0],loopC[i+1][1]).d:1e9));
  expect(`connector T-junction (79,120) on the loop ribbon (d=${dT.toFixed(2)} <= ${CH.TRAIL_STYLE.loop.width/2})`,dT<=CH.TRAIL_STYLE.loop.width/2+1e-6,true);
  expect(`MAIN tangent (111,120) on/next to the loop ribbon (d=${dM.toFixed(2)} <= 1.6)`,dM<=1.6,true);
  // the entrance path STOPS short of the revetment lip (steps stay clean)
  const last=CH.TRAIL_ENTRANCE[CH.TRAIL_ENTRANCE.length-1];
  const lip=CH.COAST_MAIN_PARAMS.fx(last[1]);
  expect(`entrance path end (${last}) stops short of the lip x=${lip.toFixed(1)} (gap ${(lip-last[0]).toFixed(2)} >= 1.2)`,lip-last[0]>=1.2,true);
  // Haring statue stays inside the loop lawn, clear of the ribbon
  const H=CH.HARING;
  const dH=Math.min(...loopC.map((p,i)=>i<loopC.length-1?ptSeg(H.pos[0],H.pos[2],p[0],p[1],loopC[i+1][0],loopC[i+1][1]).d:1e9));
  expect(`Haring sculpture clears the loop ribbon (d=${dH.toFixed(2)} >= collide ${H.collide}+half+0.6)`,dH>=H.collide+CH.TRAIL_STYLE.loop.width/2+0.6,true);
}

console.log('\n--- Task 023: entrance monument on land, clear of every ribbon ---');
{
  const E=CH.ENTRANCE,w=E.wall;
  // wall footprint sampled along its length (prop radius = half thickness + a hair)
  const wallPts=[];for(let x=w.x0;x<=w.x1+1e-6;x+=1.5)wallPts.push([x,w.z]);
  auditProps('monument wall',wallPts,w.t/2+0.1);
  auditProps('monument blocks',E.blocks.map(b=>[b.x,b.z]),1.05);
  auditProps('monument boulder',[[E.boulder.x,E.boulder.z]],1.0);
  let mbad=0;for(const p of [...wallPts,[E.boulder.x,E.boulder.z],...E.blocks.map(b=>[b.x,b.z]),[E.pad.x,E.pad.z]])if(!walkable(p[0],p[1]))mbad++;
  expect(`monument pieces all on walkable land (${mbad} off)`,mbad,0);
}

console.log('\n--- Task 023: spawn on the forecourt, clear of the monument colliders ---');
{
  const S=CH.SPAWN.player,E=CH.ENTRANCE;
  expect(`spawn (${S.x},${S.z}) walkable`,walkable(S.x,S.z),true);
  expect('spawn at ground level',surfaceY(S.x,S.z),0);
  // on the forecourt pad ellipse
  const onPad=((S.x-E.pad.x)/E.pad.rx)**2+((S.z-E.pad.z)/E.pad.rz)**2<1;
  expect('spawn stands ON the forecourt pad',onPad,true);
  // clear of every monument collider (r + player 0.34 + 0.2 margin)
  const clearers=[[E.boulder.x,E.boulder.z,1.0],...E.blocks.map(b=>[b.x,b.z,0.95]),
                  [CH.SUGGESTION_BOX.x,CH.SUGGESTION_BOX.z,0.5*(CH.SUGGESTION_BOX.scale||1)]];
  for(let x=E.wall.x0+1.1;x<=E.wall.x1-1.1+1e-6;x+=2.32)clearers.push([x,E.wall.z,1.15]);
  let minC=1e9;for(const[cx,cz,r]of clearers)minC=Math.min(minC,Math.hypot(S.x-cx,S.z-cz)-r-0.34);
  expect(`spawn clears every monument collider by >=0.2 (min ${minC.toFixed(2)})`,minC>=0.2,true);
  // facing: SPAWN.yaw faces THE WATER — due east, +x (owner direction 2026-07-10)
  expect(`SPAWN.yaw (${CH.SPAWN.yaw}) faces the water/east (want ~1.57)`,Math.abs(CH.SPAWN.yaw-Math.PI/2)<0.2,true);
  // the suggestion box stands ahead-right of the east-facing spawn (owner
  // 2026-07-10): in FRONT = east of the spawn (+x), to the RIGHT = south of
  // it (+z; right = (cos yaw, -sin yaw)·(-1)? — main.js: 'd' moves (-cos yaw,
  // sin yaw), at yaw pi/2 that is (0,+1) = south).
  const B=CH.SUGGESTION_BOX;
  expect(`suggestion box in FRONT of the spawn (x ${B.x} > ${S.x})`,B.x>S.x,true);
  expect(`suggestion box to the RIGHT of the spawn (z ${B.z} > ${S.z})`,B.z>S.z,true);
  // spawn keeps off the walk ribbon (stands beside it, not blocking)
  const c=ribbonClear(S.x,S.z,0.34);
  expect(`spawn off every ribbon footprint (min clr ${c.min.toFixed(2)} >= 0)`,c.min>=0,true);
}

// ===== MILLENNIUM PARK CELL (task 040 — pure data; engine wiring is 041).
// walkableM/surfaceYM are imported from the data module itself — the SAME
// functions the engine will use (no mirror to drift).
console.log('\n--- Millennium: the park network is walkable at grade ---');
for(const [label,x,z] of [
  ['Michigan spine @ spawn',55,800],['Michigan spine N',52,710],['Michigan spine S',52,890],
  ['Randolph sidewalk',120,709],
  // 060: the Nichols slot (x115.8-122.2) carves the Monroe sidewalk under the
  // bridgeway, so (120,890) is now non-walk — probe either flank instead.
  ['Monroe sidewalk W of the bridgeway',110,890],['Monroe sidewalk E of the bridgeway',130,890],
  ['Columbus rim N',185,750],['Columbus rim S',185,850],
  ['Wrigley Sq plaza (peristyle foot)',67,730],['Wrigley Sq entrance corner',58,714],
  ['Chase Promenade N',108,720],['Chase Promenade mid',108,800],['Chase Promenade S',108,880],
  ['Washington cross walk',66,766],['Madison cross walk',66,831],
  ['Bean plaza',92,806],['UNDER the Bean arch',86.8,797.7],
  // 043: the walk THROUGH the arch stays continuous E-W across the whole
  // bean footprint (colliders are the two contact lobes, builder-side only)
  ['Bean arch W approach',78,797.7],['Bean under-arch W',83,797.7],
  ['Bean under-arch E',91,797.7],['Bean arch E approach',96,797.7],
  ['Bean N approach (plate line)',86.8,785.5],['Bean S approach',86.8,810],
  ['Crown plaza dry pavers',60,860],['Crown wet pool mid',69.8,864],
  ['seating bowl',147,777],['Great Lawn W',150,820],['Great Lawn SE',176,830],
  ['Lurie NE gate',174,848],['Seam boardwalk mid',159.5,862],['Lurie SW link',144,876],['Lurie south rim',150,882],
]) expect(`${label} (${x},${z}) walkable`,MP.walkableM(x,z),true);
for(const [x,z] of [[55,800],[108,800],[86.8,797.7],[69.8,864],[150,820],[159.5,862]])
  expect(`grade y=0 at (${x},${z})`,MP.surfaceYM(x,z),0);

console.log('\n--- Millennium: Bean geometry discipline (043) ---');
{ const B=MP.CLOUD_GATE_M.bean, P=MP.CLOUD_GATE_M.plaza, legs=MP.CLOUD_GATE_M.legs;
  expect('bean footprint inside the plaza walk quad',B.x0>P.x0&&B.x1<P.x1&&B.z0>P.z0&&B.z1<P.z1,true);
  for(const l of legs) expect(`bean lobe (${l.x},${l.z}) inside the footprint`,l.x>B.x0&&l.x<B.x1&&l.z>B.z0&&l.z<B.z1,true);
  // the E-W arch line at cz passes BETWEEN the lobe colliders with margin
  expect('arch line clears both lobe colliders by >=0.8m',
    legs.every(l=>Math.abs(B.cz-l.z)>=l.r+0.8),true);
  expect('lobes sit outboard of the arch span',legs.every(l=>Math.abs(l.z-B.cz)>MP.CLOUD_GATE_M.archHalf),true); }

console.log('\n--- Millennium: roads/cafe/planting are NOT walkable ---');
for(const [label,x,z] of [
  ['Michigan roadway',40,800],['Randolph roadway',100,700],
  // 060/061: the closed festival streets (Monroe west+east, Columbus south) are
  // now WALKABLE curb-to-curb — see the BUTLER block below. Columbus NORTH of
  // Monroe (z<894) stays open SCENERY (the BP bridge is the only way to Maggie).
  ['Columbus roadway N of Monroe',195,750],
  ['rink boards gap W',61.3,790],['rink boards gap E',73,800],['rink boards gap N',66,779.5],['rink boards gap S',67,818.5],
  ['rink rim buffer W',58,780],['rink rim buffer E (Park Grill band)',75.5,800],['rink rim buffer N',66,773],['rink rim buffer S',66,825.5],['rink stair cheek',59,798],
  ['Lurie light plate',153.6,852.5],['Lurie dark plate',167.7,870.7],
  ['Lurie N hedge',150,848],['Lurie W hedge',126,860],
  ['backstage pocket E of stage',175,730],['pocket between promenade and Lurie',123,866],
  ['Pritzker stage floor (visually gated, no dead stair)',146,752],['stage house mass',135,749],['stage apron just N of the bowl',146,757],
  ['streetwall zone',20,800],['giants band',100,686],['giants-east band',308,686],
]) expect(`${label} (${x},${z}) NOT walkable`,MP.walkableM(x,z),false);
// (058 retired the pre-057 'east backdrop zone (220,800)' probe: with Maggie
// live the BP S-hook deck legitimately passes there and the east Loop band is
// replaced by Maggie Daley — streetwall.js skips BACKDROP_M.east when maggie.)

console.log('\n--- Millennium: Lurie Seam boardwalk sittable edge (046; 048 edge bench) ---');
for(const s of MP.LURIE_M.seam.sits){
  expect(`sit spot (${s.x},${s.z}) on the boardwalk walkable`,MP.walkableM(s.x,s.z),true);
  expect(`sit spot (${s.x},${s.z}) at grade y0`,MP.surfaceYM(s.x,s.z),0);
}

console.log('\n--- Millennium: McCormick ICE RINK — walkable-glidable (task 049, owner override) ---');
for(const [label,x,z] of [
  ['ice sheet centre (owner spot)',64.4,800.1],['ice N',67,782],['ice S',67,816],['ice E lane',72,800],
  ['gate threshold',61.3,800],['landing',60.8,800],['apron W',60,790],['apron E',74,800],
  ['apron N',66,776],['apron S',70,822],['apron SW of entry',59,803],['apron NW of entry',59,797],
]) expect(`${label} (${x},${z}) walkable`,MP.walkableM(x,z),true);
// surfaceY descends down the entry ramp (0 spine -> -1.6 pit floor), tolerance ±0.26
for(const [label,x,z,want] of [
  ['spine at stair head',57,800,0],['ramp mid',58.6,800,-0.8],['ramp foot',60.1,800,-1.55],
  ['landing floor',61,800,-1.6],['ice sheet',67,799,-1.6],['apron floor',74,800,-1.6],
]){ const y=MP.surfaceYM(x,z); expect(`${label} surfaceY (${x},${z})=${y.toFixed(2)} ~ ${want} (±0.26)`,Math.abs(y-want)<=0.26,true); }
// kind contract: 'ice' only inside the ice rect; landing/apron/plaza are null
// (skates not yet on the sheet). kindAtM returns null, not undefined — expect === matches.
expect('kindAtM(64.4,800.1) === ice (owner spot)',MP.kindAtM(64.4,800.1),'ice');
expect('kindAtM(63,782) === ice',MP.kindAtM(63,782),'ice');
expect('kindAtM(60.8,800) === null (landing — skates not yet on)',MP.kindAtM(60.8,800),null);
expect('kindAtM(66,776) === null (apron)',MP.kindAtM(66,776),null);
expect('kindAtM(86.8,797.7) === null (Bean plaza)',MP.kindAtM(86.8,797.7),null);

// ===== issue 017 / task 048 item 0a — the cell answers walkability DEFINITIVELY.
// The main.js CLASS guard (isWater false while a hard cell is active) means a
// non-walkable spot here is BLOCKED, never the jetski/water fallback; the data
// layer just has to be unambiguous everywhere the owner probed. mp-gridsweep.mjs
// enumerates interior holes (only the intended BP-ramp buffer remains).
console.log('\n--- Millennium: walkability holes closed (issue 017) ---');
// the two owner-reported spots are DEFINITIVELY non-walkable (planting / stage
// apron) — with the class guard that means "blocked", never "fall to jetski".
expect('jetski-fallback spot (168,866) blocked, not walkable',MP.walkableM(168,866),false);
expect('stage apron just N of the bowl (144.7,757) blocked',MP.walkableM(144.7,757),false);
expect('bowl edge the owner stood on (144.7,758) still walkable',MP.walkableM(144.7,758),true);
// the Lurie NE gate↔Columbus-rim corner seam is closed (was a 2 m hole)
expect('Lurie NE corner link (180,848) walkable',MP.walkableM(180,848),true);
expect('Lurie NE corner link (180,850) walkable',MP.walkableM(180,850),true);
expect('Lurie NE corner link at grade y0',MP.surfaceYM(180,848),0);

console.log('\n--- Millennium: BP CROSSING (058) — real serpentine, ramp-only, crests Columbus, lands in Maggie ---');
// The deck GOES somewhere now: launch (172.6,834.9) grade -> north rim wiggle
// -> east over Columbus at z~790 (y5) -> double-hairpin -> grade (247,807.5).
expect('launch foot at grade (173,834.5) walkable y~0',MP.walkableM(173,834.5)&&MP.surfaceYM(173,834.5)<0.4,true);
expect('launch esplanade (176,838) walkable at grade',MP.walkableM(176,838)&&MP.surfaceYM(176,838)===0,true);
{ const yR=MP.surfaceYM(191,791);
  expect(`crossing rises over Columbus approach (191,791) elevated (${yR.toFixed(2)})`,yR>3.5&&yR<5.05,true); }
expect('crest over Columbus (200,790) at y~5',MP.surfaceYM(200,790)>4.7,true);
expect('deck elevated over the trench roadway (196,790)',MP.surfaceYM(196,790)>4.4,true);
{ const yL=MP.surfaceYM(240,806);
  expect(`S-hook descends toward Maggie (240,806) mid-height (${yL.toFixed(2)})`,yL>0.4&&yL<2.6,true); }
expect('lands at grade in Maggie (247,807.5) walkable y~0',MP.walkableM(247,807.5)&&MP.surfaceYM(247,807.5)<0.3,true);
// seam continuity along the chain (adjacent samples never jump > 0.15)
{ let worst=0,at=''; for(let i=1;i<MP.BP_CROSSING_M.nodes.length;i++){
    const a=MP.BP_CROSSING_M.nodes[i-1],b=MP.BP_CROSSING_M.nodes[i];
    const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;
    const y1=MP.surfaceYM(a[0]*0.5+mx*0.5,a[1]*0.5+mz*0.5),y2=MP.surfaceYM(mx,mz);
    const d=Math.abs(y1-y2); if(d>worst){worst=d;at=`(${mx.toFixed(0)},${mz.toFixed(0)})`;} }
  expect(`chain deck y continuous end-to-end (worst mid-seam ${worst.toFixed(2)} at ${at})`,worst<0.6,true); }
// the trench FLOOR is visual road only — never a walk surface
expect('Columbus trench floor is not a walk surface (you ride the deck over it)',MP.surfaceYM(196,790)>4,true);
// enclosure buffers (PITFALLS elevator rule): the deck flanks / planted buffers never touch grade walks
for(const [label,x,z] of [
  ['planted N-rim flank buffer',184,810],['launch-flank planted buffer',184,812],
  ['rimN/deck gap',187,789],['Columbus-corridor buffer',190,808],
]) expect(`${label} (${x},${z}) NOT walkable`,MP.walkableM(x,z),false);

console.log('\n--- Millennium: MAGGIE DALEY (058) — rim net, ribbon bed, island, play garden, CSG all walkable ---');
for(const [label,x,z] of [
  ['E-rim promenade',205,750],['Randolph-side north walk',300,708],['fieldhouse esplanade',280,732],
  ['bridge-landing plaza',250,808],['climbing-wall island',260,741],['plaza->ribbon connector',262,785],
  ['play-garden esplanade',285,806],['play garden core',285,830],['Slide Crater apron',305,858],
  ['CSG garden walk',330,760],['tennis pad',307,720],['Monroe-side south rim',270,882],['LSD overlook',334,830],
]) expect(`${label} (${x},${z}) walkable at grade`,MP.walkableM(x,z)&&MP.surfaceYM(x,z)===0,true);
// 059: ribbonIce LIVE — the strip kinds 'ice' end to end (the 049 glide
// contract on the serpentine). Even loop indices are stride-2 chord ENDPOINTS
// of RIBBON_SEGS_M, so they sit exactly on the kind quads; walk and kind read
// the SAME quads, so anywhere you can stand on the strip the skates are on.
for(const i of [0,12,24,34,44,54]){ const P=MP.RIBBON_M.loop[i];
  expect(`ribbon strip (${P[0]},${P[1]}) walkable`,MP.walkableM(P[0],P[1]),true);
  expect(`ribbon strip (${P[0]},${P[1]}) kinds ICE (059 ribbonIce)`,MP.kindAtM(P[0],P[1]),'ice'); }
// ...and the skates come OFF at the lip: island / connector / landing / rims
// are walkable but kind-null (no glide on the plaza, no class leak).
for(const [label,x,z] of [
  ['climbing-wall island plaza',261,754],['plaza->ribbon connector',262,785],
  ['bridge-landing plaza',250,808],['fieldhouse esplanade',280,732],['E-rim promenade',205,750],
]) expect(`${label} (${x},${z}) walkable but NOT ice`,MP.walkableM(x,z)&&MP.kindAtM(x,z)===null,true);
// building footprints SEALED (052 law — data carve, not circular colliders)
for(const [label,x,z] of [
  ['climbing wall A footprint',260,748],['climbing wall B footprint',266.5,760.5],
  ['play ship footprint',272,845],['lighthouse footprint',303,849],
  ['fort tower footprint',289,822],['CSG pavilion frame',329.5,746],['fieldhouse footprint',264,720],
]) expect(`${label} (${x},${z}) sealed (NOT walkable)`,MP.walkableM(x,z),false);
// the CSG Federal Building COLUMNS stay collider-pattern (small piers standing
// ON the garden walk, like the Crown towers / peristyle) — walkable in data.
expect('CSG columns are colliders on walkable ground (327.4,714.5)',MP.walkableM(327.4,714.5),true);

console.log('\n--- Millennium 062: ribbon ISLANDS + deck BANDS (issues 022/023) ---');
// (a) the climbing walls are ISLANDS the ribbon loops AROUND: each wall's
// SHELL ENVELOPE (footprint + fold/bulge/truss overhang per maggie.js
// climbWall opts) clears the ice band (centerline ±2.7) by a rail/curb margin.
{
  const L=MP.RIBBON_M.loop,N=65,U=L.slice(0,N),HW=MP.RIBBON_M.halfW;
  const rectClr=(x0,x1,z0,z1)=>{let best=1e9;
    for(let i=0;i<N;i++){const a=U[i],b=U[(i+1)%N];
      const st=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/0.25);
      for(let s=0;s<=st;s++){const px=a[0]+(b[0]-a[0])*s/st,pz=a[1]+(b[1]-a[1])*s/st;
        const dx=px<x0?x0-px:px>x1?px-x1:0,dz=pz<z0?z0-pz:pz>z1?pz-z1:0;
        best=Math.min(best,Math.hypot(dx,dz));}}
    return best;};
  const OPTS=[{thick:4.5,foldAmp:0.85,bulge:1.9,lean:0.6},{thick:3.2,foldAmp:0.7,bulge:1.2,lean:-0.5}];
  MP.MAGGIE_M.walls.forEach((w,i)=>{
    const cz=(w.z0+w.z1)/2,o=OPTS[i];
    const d=rectClr(w.x0,w.x1,cz-o.foldAmp-o.thick-0.35,cz+o.foldAmp+o.bulge+Math.max(o.lean,0)+0.45);
    expect(`wall${i} shell envelope clears the ice band by >= 0.8 (${(d-HW).toFixed(2)})`,d>=HW+0.8,true);});
  // x-masts (pole + collider r0.5) never stand in the ice band
  for(const [mx,mz] of MP.MAGGIE_M.xmasts){
    let best=1e9;
    for(let i=0;i<N;i++){const a=U[i],b=U[(i+1)%N];
      const dx=b[0]-a[0],dz=b[1]-a[1],L2=dx*dx+dz*dz||1;
      let t=Math.max(0,Math.min(1,((mx-a[0])*dx+(mz-a[1])*dz)/L2));
      best=Math.min(best,Math.hypot(mx-(a[0]+dx*t),mz-(a[1]+dz*t)));}
    expect(`x-mast (${mx},${mz}) clear of the ice band (${best.toFixed(2)} >= ${(HW+0.55).toFixed(2)})`,best>=HW+0.55,true);}
}
// (b) the BP + Nichols decks are CONTINUOUS BANDS over their swept curves —
// centerline AND both outer lanes walkable at every dense sample (the old
// per-segment rect union left outside-of-bend wedge slivers = "stopped every
// few meters", issue 023). This is the mechanical no-sliver regression test.
{
  const lane=(pts,offs,label)=>{let bad=0;
    for(let i=1;i<pts.length;i++){const p=pts[i],q=pts[i-1];
      let tx=p[0]-q[0],tz=p[1]-q[1];const l=Math.hypot(tx,tz)||1;tx/=l;tz/=l;
      for(const s of offs) if(!MP.walkableM(p[0]-tz*s,p[1]+tx*s))bad++;}
    expect(`${label}: centerline + lanes walkable at every sample (${bad} bad)`,bad,0);};
  lane(MP.BP_DECK_PTS,[0,1.9,-1.9],'BP band');
  lane(MP.NICHOLS_DECK_PTS,[0,1.0,-1.0],'Nichols band');
  // y stays continuous along the BP band (no seam jumps)
  let worst=0;for(let i=1;i<MP.BP_DECK_PTS.length;i++){
    const d=Math.abs(MP.surfaceYM(MP.BP_DECK_PTS[i][0],MP.BP_DECK_PTS[i][1])
                    -MP.surfaceYM(MP.BP_DECK_PTS[i-1][0],MP.BP_DECK_PTS[i-1][1]));
    if(d>worst)worst=d;}
  expect(`BP band y continuous (worst step ${worst.toFixed(3)} < 0.35)`,worst<0.35,true);
}

// ===== Millennium: ART INSTITUTE + NICHOLS (task 060) — flags artInstitute +
// nichols LIVE. The AI block (steps ramp, gardens, east rim), the closed-Monroe
// festival crossing and the Nichols Bridgeway (elevated deck lawn->Bluhm) join
// the network. walkableM/surfaceYM/kindAtM are the SAME funcs the engine uses.
console.log('\n--- Millennium: ART INSTITUTE + NICHOLS (task 060) ---');
// WALKABLE — spine extension, forecourt/steps/portico, gardens, closed Monroe,
// east rim, the Nichols launch pad + the elevated Bluhm terrace.
for(const [label,x,z] of [
  ['spine extension N',52,930],['spine extension S',52,1010],
  ['forecourt apron',50,970],['steps mid',55,970],['portico landing',58.4,970],
  ['North Garden',67,925],['North Garden street overlap',70,907],
  ['South Garden N',60,1005],['South Garden S',75,1025],
  ['closed Monroe crossing',100,901],['spine crossing closed Monroe',52,901],
  ['east rim N',185,930],['east rim S',185,1000],
  ['Nichols launch pad',117,836],['Bluhm terrace',128,915],
]) expect(`${label} (${x},${z}) walkable`,MP.walkableM(x,z),true);
// surfaceY — the steps ramp lerps 0->1.9 W->E; portico + Bluhm are flat decks;
// the Nichols deck rises along its node chain (over Monroe, over the slot).
for(const [label,x,z,want,tol] of [
  ['steps ramp mid',55,970,0.855,0.15],['steps ramp upper',56.8,970,1.71,0.15],
  ['portico landing',58.4,970,1.9,0],['Bluhm terrace',128,915,13,0],
  ['Nichols deck mid',117.9,872,4.6,0.3],['Nichols deck over Monroe',118.6,899,8.7,0.5],
]){ const y=MP.surfaceYM(x,z); expect(`${label} surfaceY (${x},${z})=${y.toFixed(3)} ~ ${want} (±${tol})`,Math.abs(y-want)<=tol,true); }
{ const y=MP.surfaceYM(119,890);     // the deck flies OVER the carved slot — elevated, not grade
  expect(`Nichols deck over the slot (119,890) elevated y=${y.toFixed(2)} > 6.5`,y>6.5,true); }
// grade elsewhere on the AI network stays y0
for(const [x,z] of [[52,930],[100,901]]) expect(`grade y0 at (${x},${z})`,MP.surfaceYM(x,z),0);
// NOT walkable — urn-bed flanks, the west gallery block, the Metra trench, the
// carved fountain, the reflecting pool, the slot OUTSIDE the deck chain, the
// roadway edges + the garden/trench annex lip.
for(const [label,x,z] of [
  ['urn bed N',56,960],['urn bed S',56,981],['west gallery block',75,970],
  ['rail trench N',110,950],['rail trench S',110,1020],
  ['South Garden fountain carve',84,1012],['east reflecting pool carve',180,970],
  ['Monroe slot outside the deck chain',116.2,889],
  ['Michigan roadway south',40,1000],['Jackson roadway',100,1038],
  ['garden/trench annex lip',95.5,1015],
]) expect(`${label} (${x},${z}) NOT walkable`,MP.walkableM(x,z),false);
// CHAIN CONTINUITY (BP-chain pattern) — walk the Nichols node chain. The deck
// follows its node heights end to end (no grade hole / seam jump). Nichols' 7
// nodes span y0->13 with steep per-seg deltas, so we compare each sample to its
// node-lerp expectation (not to an adjacent sample). Sample the SEG INTERIORS
// (t=.25/.5/.75) — never the exact shared node, where along==hl is a float
// knife-edge that inQuadM can miss (the player never stands sub-micron on a
// vertex; the BP test samples interiors for the same reason). Worst dev < 0.6.
{ const nd=MP.NICHOLS2_M.nodes; let worst=0,at='';
  for(let i=1;i<nd.length;i++) for(const t of [0.25,0.5,0.75]){
    const x=nd[i-1][0]+(nd[i][0]-nd[i-1][0])*t, z=nd[i-1][1]+(nd[i][1]-nd[i-1][1])*t;
    const ey=nd[i-1][2]+(nd[i][2]-nd[i-1][2])*t;     // node-lerp expectation on this seg
    const d=Math.abs(MP.surfaceYM(x,z)-ey);
    if(d>worst){worst=d;at=`(${x.toFixed(1)},${z.toFixed(1)})`;} }
  expect(`Nichols deck follows its nodes end-to-end (worst mid-seam ${worst.toFixed(2)} at ${at} < 0.6)`,worst<0.6,true); }
// KIND — no ice anywhere in the AI zone (the rink + ribbon are north)
expect('kindAtM(52,970) === null (no ice in the AI zone)',MP.kindAtM(52,970),null);

// ===== Millennium: BUTLER FIELD + LOLLA (task 061) — flag butler LIVE. The
// festival field (Petrillo + booth carved), the two CLOSED festival streets
// (walkable curb-to-curb), the LSD rim walk and the three Maggie south-rim gate
// knits join the network. walkableM/surfaceYM are the SAME funcs the engine uses.
console.log('\n--- Millennium: BUTLER FIELD + LOLLA (061) ---');
// WALKABLE at grade — closed streets, field lawn, around Petrillo, LSD rim, gates
for(const [label,x,z] of [
  ['closed Monroe east',240,901],['closed Columbus',195,950],
  ['field lawn N',250,950],['field lawn mid',290,990],
  ['west-of-Petrillo lane',206,1015],['south-of-Petrillo',222,1025],['east-of-Petrillo',250,1015],
  ['LSD rim walk',327,970],
  ['Maggie gate knit W',250,891],['Maggie gate knit M',284,891],['Maggie gate knit E',319,891],
]) expect(`${label} (${x},${z}) walkable at grade`,MP.walkableM(x,z)&&MP.surfaceYM(x,z)===0,true);
// NOT walkable — Petrillo mass, sound booth, past the closures, LSD road, off-rim
for(const [label,x,z] of [
  ['Petrillo mass',222,1009],['sound booth (carved)',262,972],
  ['Monroe east of the closure',338,901],['Columbus past Jackson',195,1043],
  ['Jackson band',250,1036],['LSD road',336,970],['lawn east of the rim',333,990],
  ['open ground N of the field between the gates',270,893],
]) expect(`${label} (${x},${z}) NOT walkable`,MP.walkableM(x,z),false);
// no ice anywhere in the festival field
expect('kindAtM(250,950) === null (no ice at Butler Field)',MP.kindAtM(250,950),null);

console.log('\n--- Millennium: flood fill from the spawn — one connected network, no elevators ---');
{
  const C=MP.CLAMP_M, x0=Math.floor(C.xMin), x1=Math.ceil(C.xMax), z0=Math.floor(C.zMin), z1=Math.ceil(C.zMax);
  const W=x1-x0+1, H=z1-z0+1, walk=new Uint8Array(W*H), y=new Float32Array(W*H);
  let total=0;
  for(let gz=0;gz<H;gz++)for(let gx=0;gx<W;gx++){
    const wx=x0+gx,wz=z0+gz;
    if(MP.walkableM(wx,wz)){walk[gz*W+gx]=1;y[gz*W+gx]=MP.surfaceYM(wx,wz);total++;}
  }
  // elevator guard: no two ADJACENT walkable cells differ by > 0.55 in y —
  // every level change must ride a ramp (0.21/unit), never a cliff edge.
  let worstStep=0,worstAt='';
  for(let gz=0;gz<H;gz++)for(let gx=0;gx<W;gx++){
    if(!walk[gz*W+gx])continue;
    for(const [dx,dz] of [[1,0],[0,1]]){
      const nx=gx+dx,nz=gz+dz;
      if(nx>=W||nz>=H||!walk[nz*W+nx])continue;
      const d=Math.abs(y[gz*W+gx]-y[nz*W+nx]);
      if(d>worstStep){worstStep=d;worstAt=`(${x0+gx},${z0+gz})`;}
    }
  }
  expect(`no elevator seams: worst adjacent step ${worstStep.toFixed(2)} at ${worstAt} <= 0.55`,worstStep<=0.55,true);
  // BFS from the spawn: every walkable cell must be reachable (no islands)
  const seen=new Uint8Array(W*H),Q=[(Math.round(MP.SPAWN_M.z)-z0)*W+(Math.round(MP.SPAWN_M.x)-x0)];
  seen[Q[0]]=1;let reach=0;
  while(Q.length){const i=Q.pop();reach++;const gx=i%W,gz=(i-gx)/W;
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=gx+dx,nz=gz+dz;if(nx<0||nz<0||nx>=W||nz>=H)continue;
      const j=nz*W+nx;if(walk[j]&&!seen[j]){seen[j]=1;Q.push(j);}
    }}
  expect(`spawn cell (${MP.SPAWN_M.x},${MP.SPAWN_M.z}) walkable`,walk[Q.length?0:(Math.round(MP.SPAWN_M.z)-z0)*W+(Math.round(MP.SPAWN_M.x)-x0)]===1,true);
  // list the disconnected islets (issue 025) so a future trap is actionable, not
  // just a count — every walkable cell unreachable from spawn is a hard-stuck trap.
  if(reach!==total){
    const islets=[];
    for(let gz=0;gz<H;gz++)for(let gx=0;gx<W;gx++)if(walk[gz*W+gx]&&!seen[gz*W+gx])islets.push([x0+gx,z0+gz]);
    console.log(`  ${islets.length} UNREACHABLE walkable islet cell(s):`);
    for(const [x,z] of islets.slice(0,40))console.log(`    ISLET (${x}, ${z})`);
    if(islets.length>40)console.log(`    ... and ${islets.length-40} more`);
  }
  expect(`whole network reachable from the spawn (${reach}/${total} cells)`,reach,total);
  expect(`network area sane (${total} cells > 8000)`,total>8000,true);
  // key destinations reachable (grid cells): peristyle, bean, crown pool,
  // bowl, lawn, seam boardwalk, bridge crest, all four frame corners
  for(const [label,x,z] of [
    ['peristyle plaza',67,730],['Bean plaza',87,798],['Crown pool',70,864],
    ['seating bowl',147,777],['Great Lawn',150,820],['Seam boardwalk',159,862],
    ['BP crest',200,790],['NW corner',50,709],['SW corner',50,890],
    // Maggie Daley (058) — every zone reached ONLY over the BP crossing
    ['BP landing plaza',250,808],['ribbon bed',276,738],['climbing island',260,741],
    ['play garden',285,830],['Slide Crater',305,858],['CSG',330,760],['fieldhouse esplanade',280,732],
    ['Maggie NE corner',336,708],['Maggie SE corner',336,884],['LSD overlook',334,830],
  ]) expect(`${label} (${x},${z}) reached`,seen[(z-z0)*W+(x-x0)]===1,true);
}

console.log('\n--- Millennium: frame discipline (clamp, spawn, billboard floor, disjointness) ---');
{
  const C=MP.CLAMP_M;
  // every walk quad sample sits inside the clamp (the clamp backs the walls)
  let out=0;
  for(const q of MP.WALK_M){
    const pts=q.band
      ? [[q.bx0,q.bz0],[q.bx1,q.bz0],[q.bx0,q.bz1],[q.bx1,q.bz1]]   // 062 deck bands: bbox corners
      : q.seg
      ? [[q.cx+q.ux*q.hl+q.uz*q.hw,q.cz+q.uz*q.hl-q.ux*q.hw],[q.cx+q.ux*q.hl-q.uz*q.hw,q.cz+q.uz*q.hl+q.ux*q.hw],
         [q.cx-q.ux*q.hl+q.uz*q.hw,q.cz-q.uz*q.hl-q.ux*q.hw],[q.cx-q.ux*q.hl-q.uz*q.hw,q.cz-q.uz*q.hl+q.ux*q.hw]]
      : [[q.x0,q.z0],[q.x1,q.z0],[q.x0,q.z1],[q.x1,q.z1]];
    for(const [px,pz] of pts) if(px<C.xMin||px>C.xMax||pz<C.zMin||pz>C.zMax)out++;
  }
  expect(`all WALK_M corners inside CLAMP_M (${out} out)`,out,0);
  expect('spawn walkable at grade',MP.walkableM(MP.SPAWN_M.x,MP.SPAWN_M.z)&&MP.surfaceYM(MP.SPAWN_M.x,MP.SPAWN_M.z)===0,true);
  const kc=Math.hypot(MP.SPAWN_M.x-(MP.KIOSK_M.x0+MP.KIOSK_M.x1)/2,MP.SPAWN_M.z-(MP.KIOSK_M.z0+MP.KIOSK_M.z1)/2);
  expect(`spawn clear of the kiosk footprint (d ${kc.toFixed(1)} > 3)`,kc>3,true);
  expect('kiosk stands ON the Michigan spine walk',
    MP.KIOSK_M.x0>=48&&MP.KIOSK_M.x1<=57&&MP.KIOSK_M.z0>=705&&MP.KIOSK_M.z1<=894,true);
  // billboard floor: nothing in the cell at z < 680 (GEOGRAPHY.md liberty)
  expect(`giants band z0 (${MP.BACKDROP_M.giants.z0}) >= 680`,MP.BACKDROP_M.giants.z0>=680,true);
  expect(`streetwall band z0 (${MP.STREETWALL_M.band.z0}) >= 680`,MP.STREETWALL_M.band.z0>=680,true);
  // disjoint from every other play space; z>500 is unique to this cell
  expect('cell z-range beyond WORLD_CLAMP',C.zMin>CH.WORLD_CLAMP.zMax,true);
  expect('cell disjoint from the Wrigleyville clamp',C.xMin>WV.CLAMP_W.xMax||C.zMin>WV.CLAMP_W.zMax,true);
  expect('z>500 dev-spawn check is unambiguous',C.zMin>500&&CH.WORLD_CLAMP.zMax<500&&WV.CLAMP_W.zMax<500,true);
  // landmark data consistency
  const CG=MP.CLOUD_GATE_M,CR=MP.CROWN_M;
  expect('bean footprint inside its plaza',CG.bean.x0>=CG.plaza.x0&&CG.bean.x1<=CG.plaza.x1&&CG.bean.z0>=CG.plaza.z0&&CG.bean.z1<=CG.plaza.z1,true);
  expect('crown pool inside its plaza',CR.pool.x0>=CR.plaza.x0&&CR.pool.x1<=CR.plaza.x1&&CR.pool.z0>=CR.plaza.z0&&CR.pool.z1<=CR.plaza.z1,true);
  expect('both crown towers inside the pool',CR.towers.every(t=>t.x0>=CR.pool.x0&&t.x1<=CR.pool.x1&&t.z0>=CR.pool.z0&&t.z1<=CR.pool.z1),true);
  expect('trellis stops W of the BP approach',MP.PRITZKER_M.trellis.x1<=MP.BP_BRIDGE_M.approach.x0,true);
  // Wrigley Square + Millennium Monument (050: built 1:1 arc — base/piers/
  // basin/lamps are colliders in the plaza walk quad; the issue-017 class
  // guard makes every non-walk spot BLOCKED, never water)
  const WQ=MP.WRIGLEY_SQ_M,PE=WQ.peristyle,PF=WQ.fountain;
  expect('peristyle bbox inside the Wrigley Sq plaza',
    PE.x0>=WQ.plaza.x0&&PE.x1<=WQ.plaza.x1&&PE.z0>=WQ.plaza.z0&&PE.z1<=WQ.plaza.z1,true);
  expect('arc extremes inside the declared bbox (step ring r = rBase+1.8)',
    PE.cx-((PE.rOut+PE.rIn)/2+1.8)>=PE.x0-0.01&&PE.cz-((PE.rOut+PE.rIn)/2+1.8)>=PE.z0-0.01,true);
  expect('fountain basin inside the plaza walk quad',
    PF.x-PF.r>=WQ.plaza.x0&&PF.x+PF.r<=WQ.plaza.x1&&PF.z-PF.r>=WQ.plaza.z0&&PF.z+PF.r<=WQ.plaza.z1,true);
  expect('basin clear of the base arc inner face',
    Math.hypot(PF.x-PE.cx,PF.z-PE.cz)+PF.r<=(PE.rOut+PE.rIn)/2-1.5-0.2,true);
  expect('owner vantage (85.4,734.5) walkable at grade',
    MP.walkableM(85.4,734.5)&&MP.surfaceYM(85.4,734.5)===0,true);
  expect('exedra interior walkable through the open SE side',
    MP.walkableM(PE.cx+2,PE.cz+2),true);
  expect('approach lamps + urn piers stand in the plaza walk quad',
    [...WQ.lamps,...WQ.urns].every(([x,z])=>MP.walkableM(x,z)),true);
}

// ===== WRIGLEY BOWL pocket cell (task 055) — walkableB/surfaceYB/kindAtB are
// imported from src/data/wrigley-bowl.js (THE shared definition). Issue-017
// class rules: the cell answers definitively EVERYWHERE in-clamp (a hole is
// BLOCKED, never water — main.js isWater() is cell-guarded).
console.log('\n--- Wrigley bowl: field / track / wall / gates / concourse / wedges ---');
{
  const atB=(r,th)=>[WB.HP_B[0]+Math.sin(th)*r,WB.HP_B[1]+Math.cos(th)*r];
  const wrapB=a=>((a+Math.PI*3)%(Math.PI*2))-Math.PI;
  expect('spawn on the warning track',WB.walkableB(WB.SPAWN_B.x,WB.SPAWN_B.z)&&WB.kindAtB(WB.SPAWN_B.x,WB.SPAWN_B.z)==='track'&&WB.surfaceYB(WB.SPAWN_B.x,WB.SPAWN_B.z)===0,true);
  expect('mound is grass (chase trigger)',WB.kindAtB(...atB(12.9,WB.AXIS_B)),'grass');
  expect('deep center is grass',WB.kindAtB(...atB(65,WB.AXIS_B)),'grass');
  expect('CF warning track',WB.kindAtB(...atB(72.5,WB.AXIS_B)),'track');
  expect('past the ivy wall NOT walkable',WB.walkableB(...atB(75.5,WB.AXIS_B)),false);
  expect('short-RF wall hugs Sheffield (rWall ~53.5)',Math.abs(WB.rWallB(WB.AXIS_B-0.72)-53.5)<1.5,true);
  expect('deep-LF wall at the target arc (74)',Math.abs(WB.rWallB(WB.AXIS_B+0.72)-74)<1,true);
  // the wall band blocks EXCEPT at the three open field gates
  {const th=WB.BACK_B+0.5,rw=WB.rWallB(th);expect('wall band blocked off-gate (s 0.5)',WB.walkableB(...atB(rw+0.4,th)),false);}
  for(const gs of WB.GATES_B){const th=WB.BACK_B+gs,rw=WB.rWallB(th);
    expect(`field gate open at s ${gs}`,WB.walkableB(...atB(rw+0.4,th)),true);}
  // concourse ring continuous at mid-width
  {let holes=0;
   for(let s=-1.5;s<=1.5;s+=0.05){const th=WB.BACK_B+s,rw=WB.rWallB(th);if(!WB.walkableB(...atB(rw+2.5,th)))holes++;}
   expect('concourse ring continuous (|s|<=1.5)',holes,0);}
  // wedge rows climb 0.62/row; outside the wedges the seats are blocked
  {const th=WB.BACK_B-0.7,rw=WB.rWallB(th),rS0=rw+0.8+3.8;let mono=true,last=-1;
   for(let k=0;k<8;k++){const y=WB.surfaceYB(...atB(rS0+k*1.4+0.7,th));if(y<=last)mono=false;last=y;}
   expect('wedge B rows step up monotonically',mono,true);
   expect('wedge B row0 y',WB.surfaceYB(...atB(rS0+0.7,th)),1.15);}
  {const th=WB.BACK_B+0.2,rw=WB.rWallB(th);            // between vomitory and wedge A
   expect('seats outside the wedges NOT walkable',WB.walkableB(...atB(rw+0.8+3.8+2,th)),false);}
  // full-coverage sweep: every 2 m point in-clamp ANSWERS (no exceptions),
  // and the walkable network is one island reachable from the spawn
  {const C=WB.CLAMP_B,x0=C.xMin,z0=C.zMin,W=Math.ceil((C.xMax-C.xMin)/1)+1,H=Math.ceil((C.zMax-C.zMin)/1)+1;
   const walk=new Uint8Array(W*H);let n=0;
   for(let gx=0;gx<W;gx++)for(let gz=0;gz<H;gz++){if(WB.walkableB(x0+gx,z0+gz)){walk[gz*W+gx]=1;n++;}}
   const seen=new Uint8Array(W*H);
   const sx=Math.round(WB.SPAWN_B.x-x0),sz=Math.round(WB.SPAWN_B.z-z0);
   const Q=[sz*W+sx];seen[Q[0]]=walk[Q[0]];let reach=walk[Q[0]]?1:0;
   while(Q.length){const i=Q.pop();const gx=i%W,gz=(i/W)|0;
     for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=gx+dx,nz=gz+dz;
       if(nx<0||nz<0||nx>=W||nz>=H)continue;const j=nz*W+nx;
       if(walk[j]&&!seen[j]){seen[j]=1;reach++;Q.push(j);}}}
   expect(`whole bowl network reachable from spawn (${reach}/${n})`,reach,n);
   expect(`walkable area sane (${n} > 6000)`,n>6000,true);
   const hit=(x,z,label)=>expect(`${label} reached`,seen[(Math.round(z)-z0)*W+(Math.round(x)-x0)]===1,true);
   hit(...atB(0.5,WB.AXIS_B),'home plate');
   hit(...atB(65,WB.AXIS_B),'deep center grass');
   hit(...atB(WB.rWallB(WB.AXIS_B+0.6)-1.5,WB.AXIS_B+0.6),'LF corner track');
   hit(...atB(WB.rWallB(WB.AXIS_B-0.6)-1.5,WB.AXIS_B-0.6),'RF corner track');
   {const th=WB.BACK_B-1.45,rw=WB.rWallB(th);hit(...atB(rw+2.5,th),'concourse 3B end');}
   {const th=WB.BACK_B+1.45,rw=WB.rWallB(th);hit(...atB(rw+2.5,th),'concourse 1B end');}
   {const th=WB.BACK_B-0.7,rw=WB.rWallB(th);hit(...atB(rw+0.8+3.8+7*1.4+0.7,th),'wedge B top row');}
   {const th=WB.BACK_B+0.66,rw=WB.rWallB(th);hit(...atB(rw+0.8+3.8+4*1.4+0.7,th),'wedge A row 4 (sit)');}
  }
  // ref post stands on the track; the eject deposit point is walkable OUTSIDE
  {const th=WB.BACK_B+0.3,[px,pz]=atB(WB.rWallB(th)-1.3,th);
   expect('ump post on the warning track',WB.walkableB(px,pz)&&WB.kindAtB(px,pz)==='track',true);}
  expect('eject deposit (-280,-416.5) walkable on the marquee apron',WV.walkableW(-280,-416.5),true);
  expect('box office spot (-283.9,-448.2) walkable on the plaza',WV.walkableW(-283.9,-448.2),true);
  // frame discipline: pocket disjoint from every other clamp + the car box
  const C=WB.CLAMP_B;
  expect('bowl clamp disjoint from Wrigleyville clamp',C.zMax<WV.CLAMP_W.zMin,true);
  expect('bowl clamp disjoint from the redline-car box (z -656..-643)',C.zMax<-657||C.zMin>-642,true);
  expect('bowl clamp outside WORLD_CLAMP',C.zMax<CH.WORLD_CLAMP.zMin||C.xMax<CH.WORLD_CLAMP.xMin,true);
  expect('dev-spawn box unambiguous vs wrigleyville (zMax < its zMin)',C.zMax< WV.CLAMP_W.zMin,true);
}

// ===== Task 069: MONTROSE north growth — new lawn/trail/revetment walkable, edges sealed =====
console.log('\n--- Task 069: Montrose new lawn is walkable (north extension via LAND pip) ---');
for(const [x,z] of [[100,-1000],[60,-864],[180,-900],[150,-1014]]) expect(`Montrose lawn (${x},${z})`,walkable(x,z),true);

console.log('\n--- Task 069/084: the whole Montrose trail runs on walkable land, end to end ---');
for(const [x,z] of CH.TRAIL_MONTROSE)
  expect(`Montrose trail (${x},${z})`,walkable(x,z),true);

// 084: the retired blank-lawn revetment (old montroseFx shore z-800..-1088) is
// replaced by the BAY cove (z-580..-655). The old montroseFx-top test no longer
// describes real geography there (Point/beach now occupy those z), so it is
// re-authored as the bay cove: inland lawn walkable, the concave cove water NOT,
// and TIER_DEFAULT revetment steps stepping DOWN seaward of the shore top edge.
console.log('\n--- Task 084: the BAY cove — inland lawn walkable, cove water NOT, revetment steps down seaward ---');
// cove WATER (>12.2 m seaward of the shore line, past the TIER_DEFAULT apron) — NOT
// walkable. NB: the walkable revetment apron reaches ~12.2 m seaward, so genuine open
// water needs a bigger stand-off than the task's staged (170,-628)/(220,-600)/(190,-645),
// which land ON the apron (lat 6-11 m) — re-authored to the cove interior (lat 18-21 m).
for(const [x,z] of [[200,-632],[210,-620],[220,-632],[215,-635]]) expect(`bay cove water (${x},${z}) NOT walkable`,walkable(x,z),false);
// cove LAND (west of the waist / golf interior / headland) — walkable
for(const [x,z] of [[150,-628],[200,-660],[150,-575],[208,-660]]) expect(`bay land (${x},${z}) walkable`,walkable(x,z),true);
// TIER_DEFAULT revetment steps just seaward of the shore top edge step DOWN and stay walkable
{
  const BAY_SEGS=buildSegs(COAST_BAY);
  let s=BAY_SEGS[0],bd=1e9; for(const seg of BAY_SEGS){const d=Math.hypot(seg.ax-155,seg.az+628);if(d<bd){bd=d;s=seg}}  // segment nearest the waist (~155,-628)
  const ys=[];let mono=true,allWalk=true,maxI=-1;
  for(const lat of [0.4,2,4,6]){                     // step seaward along the coast normal
    const px=s.ax+s.nx*lat,pz=s.az+s.nz*lat;
    ys.push(+surfaceY(px,pz).toFixed(2));
    const q=coastQuery(px,pz);if(q){const t=tierAt(q.lat,q.z);if(t)maxI=Math.max(maxI,t.i);}
    if(!walkable(px,pz))allWalk=false;
  }
  for(let i=1;i<ys.length;i++)if(ys[i]>ys[i-1]+1e-6)mono=false;
  console.log(`  bay waist steps @(${s.ax.toFixed(0)},${s.az.toFixed(0)}) ys=${JSON.stringify(ys)} mono=${mono} walk=${allWalk} maxTier=${maxI}`);
  expect('bay revetment steps down seaward + walkable (TIER_DEFAULT)',mono&&allWalk&&maxI>=1,true);
}

console.log('\n--- Task 070: Montrose Harbor basin water NOT walkable (concave LAND carve) ---');
for(const [x,z] of [[200,-724],[200,-764],[205,-814],[195,-844],[210,-709]]) expect(`basin (${x},${z})`,walkable(x,z),false);

console.log('\n--- Task 070: the HOOK mole (breakwater) walkable end to end ---');
for(const [x,z] of [[228,-854],[228,-804],[230,-754],[231,-724],[230,-697]]) expect(`hook mole (${x},${z})`,walkable(x,z),true);
expect('mole north root (solid land) (210,-859)',walkable(210,-859),true);
expect('open lake east of the mole (252,-764) NOT walkable',walkable(252,-764),false);

console.log('\n--- Task 070: harbor west shore (mainland) walkable ---');
for(const [x,z] of [[176,-740],[172,-794],[168,-769]]) expect(`west shore (${x},${z})`,walkable(x,z),true);

console.log('\n--- Task 069: Montrose underpass berm (x<14, outside LAND) NOT walkable ---');
for(const [x,z] of [[7,-771],[10,-771]]) expect(`berm behind the fence (${x},${z}) NOT walkable`,walkable(x,z),false);

console.log('\n--- Task 069: north map edge is sealed ---');
expect('inside the north lawn (150,-1000) walkable',walkable(150,-1000),true);
expect('past the north map edge (150,-1600) NOT walkable',walkable(150,-1600),false);

console.log('\n--- Task 072: Montrose Beach sand walkable (beachH), roped dune interior NOT ---');
for(const [x,z] of [[214,-1034],[224,-1014],[230,-996],[212,-1054],[236,-964]]) expect(`beach sand (${x},${z}) walkable`,walkable(x,z),true);
for(const [x,z] of [[218,-956],[224,-949],[220,-969],[228,-959]]) expect(`dune interior (${x},${z}) BLOCKED`,walkable(x,z),false);
expect('beach just NORTH of the dune (222,-984) walkable',walkable(222,-984),true);
expect('beach WEST of the dune (208,-954) walkable',walkable(208,-954),true);
expect('beach EAST of the dune (236,-954) walkable',walkable(236,-954),true);   // the sand WRAPS the dune (no walk-island)
expect('wet sand at the waterline (239,-1019) walkable (wade)',walkable(239,-1019),true);
expect('open lake east of the beach (243,-1019) NOT walkable',walkable(243,-1019),false);

console.log('\n--- Task 072: beach sand slopes DOWN to the lake (dry inland, wet at the waterline) ---');
console.log(`  montroseBeachH x=214:${CH.montroseBeachH(214,-1014).toFixed(2)}  x=237:${CH.montroseBeachH(237,-1014).toFixed(2)}  x=242:${CH.montroseBeachH(242,-1014).toFixed(2)}  (should trend 0 -> negative)`);
expect('dry sand inland is ~grade (>-0.2)',CH.montroseBeachH(214,-1014)>-0.2,true);
// 088 (issue 030): the dry sand must reach EAST of the LAND edge (montroseFx <= 237.5)
// so the y0 lawn never caps the waterline — then dip under the lake inside the bounds.
expect('sand still ~grade at the LAND edge x237.5 (>-0.2)',CH.montroseBeachH(237.5,-1014)>-0.2,true);
expect('sand is underwater at x242 (<-2.0)',CH.montroseBeachH(242,-1014)<-2.0,true);
expect('montroseBeachH null outside the sand (250,-1014)',CH.montroseBeachH(250,-1014),null);

console.log('\n--- Task 072: beach house hall BLOCKED (solid), The Dock deck WALKABLE ---');
for(const [x,z] of [[199,-1004],[196,-1009],[202,-996]]) expect(`beach house hall (${x},${z}) BLOCKED`,walkable(x,z),false);
for(const [x,z] of [[206,-1004],[192,-1004]]) expect(`sand/lawn just outside the beach house (${x},${z}) walkable`,walkable(x,z),true);
for(const [x,z] of [[216,-1048],[212,-1046],[220,-1050]]) expect(`The Dock deck (${x},${z}) walkable`,walkable(x,z),true);
expect('The Dock deck surface at deckY',surfaceY(216,-1048),CH.THE_DOCK.deckY);

// ===== Task 073: CRICKET HILL — the walkable analytic mound (engine <-> probe lockstep) =====
console.log('\n--- Task 073: Cricket Hill is walkable everywhere (no cliff/hole; whole mound on LAND) ---');
{
  const H=CH.CRICKET_HILL;
  // grid: summit + rings at r/rx = 0.25,0.5,0.75,0.95 over all 8 bearings -> every
  // sample must be walkable (the mound never carves a hole) AND surfaceY must equal
  // cricketHillH (engine <-> probe share the one definition).
  const BEAR=[[1,0],[0.7071,0.7071],[0,1],[-0.7071,0.7071],[-1,0],[-0.7071,-0.7071],[0,-1],[0.7071,-0.7071]];
  let bad=0,mism=0;
  for(const rf of [0,0.25,0.5,0.75,0.95]) for(const [bx,bz] of BEAR){
    const x=H.cx+bx*H.rx*rf, z=H.cz+bz*H.rz*rf;
    if(!walkable(x,z))bad++;
    const want=CH.cricketHillH(x,z); if(want!==null&&Math.abs(surfaceY(x,z)-want)>1e-9)mism++;
  }
  expect(`whole mound grid walkable (${bad} unwalkable of 33)`,bad,0);
  expect(`surfaceY == cricketHillH across the mound (${mism} mismatches)`,mism,0);
  expect('summit walkable',walkable(H.cx,H.cz),true);
  expect(`summit at full height (${H.height} m)`,+surfaceY(H.cx,H.cz).toFixed(3),H.height);
}
console.log('\n--- Task 073: the dome slopes DOWN monotonically to grade in all 8 directions, no cliff, rim blends to lawn ---');
{
  const H=CH.CRICKET_HILL;
  const BEAR=[[1,0],[0.7071,0.7071],[0,1],[-0.7071,0.7071],[-1,0],[-0.7071,-0.7071],[0,-1],[0.7071,-0.7071]];
  // sample at the WORST-CASE per-frame stride (max run 9.5 m/s * clamped dt 0.05 =
  // 0.475 m) — main.js's "stepped off an edge" airborne check (player.y-surf>0.5)
  // fires per FRAME, so the gentle mound is safe iff no single 0.475 m step drops
  // more than 0.5 m. Step out to just past the rim on all 8 bearings.
  const STRIDE=0.475, STEPS=Math.ceil((Math.max(H.rx,H.rz)+2)/STRIDE);
  let allMono=true, maxStep=0;
  for(const [bx,bz] of BEAR){
    let prev=surfaceY(H.cx,H.cz);
    for(let r=1;r<=STEPS;r++){
      const rr=r*STRIDE;
      const y=surfaceY(H.cx+bx*rr, H.cz+bz*rr);
      if(y>prev+1e-6)allMono=false;                  // must never rise going outward
      maxStep=Math.max(maxStep,prev-y);              // biggest single-frame drop
      prev=y;
    }
  }
  expect('mound steps down monotonically outward on all 8 bearings',allMono,true);
  // no false-airborne / no cliff seam: no single per-frame stride drops > 0.5 m.
  expect(`no cliff: max per-frame drop ${maxStep.toFixed(3)} m < 0.5`,maxStep<0.5,true);
  // rim blends to the lawn: just OUTSIDE the footprint the surface is flat grade
  expect('lawn just outside the west rim is grade 0',surfaceY(H.cx-H.rx-2,H.cz),0);
  expect('lawn just outside the north rim is grade 0',surfaceY(H.cx,H.cz-H.rz-2),0);
  expect('cricketHillH null off the mound',CH.cricketHillH(H.cx+H.rx+2,H.cz),null);
}
console.log('\n--- Task 073: the base is clear of TRAIL_MONTROSE (no trail on the mound) ---');
{
  const H=CH.CRICKET_HILL;
  let onMound=0;
  for(const [x,z] of CH.TRAIL_MONTROSE){const dx=(x-H.cx)/H.rx,dz=(z-H.cz)/H.rz;if(Math.hypot(dx,dz)<1)onMound++;}
  expect(`no TRAIL_MONTROSE node on the mound footprint (${onMound})`,onMound,0);
}

// ===== Task 071: Montrose Point FLIPPED — real Point walkability =====
// COAST_MTR_POINT is now CH.COAST_MTR_POINT_PTS (the pushed-east polyline, apex
// 243,-894 — the map's eastmost land). LAND / QUERY_SEGS / MTR_SEGS[2] all
// consume it automatically (coast.js + this probe flipped in lockstep). These
// expects prove the LIVE Point: the bulge is real, the piece joins its
// neighbors, both sanctuary ribbons + every new-land spot are walkable, the
// bulge terraces step DOWN seaward to open water, and every prop clears the
// ribbons. LOCAL geometry only — no rng.
const MPT=CH.MONTROSE_POINT;   // NB: MP is the millennium import at the top

console.log('\n--- Task 071 (a): the pushed-east bulge is LIVE ---');
{
  const maxX=Math.max(...CH.COAST_MTR_POINT_PTS.map(p=>p[0]));
  expect(`Point apex x ${maxX.toFixed(2)} > 242 (the bulge is live)`,maxX>242,true);
}

console.log('\n--- Task 071 (b): the piece joins its neighbors, monotone north, finite ---');
{
  const P=CH.COAST_MTR_POINT_PTS, first=P[0], last=P[P.length-1];
  expect('Point piece starts at the mole lake-face end (236,-864)',Math.hypot(first[0]-236,first[1]+864)<0.01,true);
  const bx=CH.montroseFx(-926);
  expect(`Point piece ends on the stub meander (~${bx.toFixed(1)},-926) for the beach join`,Math.hypot(last[0]-bx,last[1]+926)<0.6,true);
  expect('Point piece runs north monotonically (CR overshoot tol 0.3)',P.every((p,i)=>!i||p[1]<P[i-1][1]+0.3),true);
  expect('Point data is finite',P.every(p=>Number.isFinite(p[0])&&Number.isFinite(p[1])),true);
}

console.log('\n--- Task 071 (c): the three waypoint stands are walkable ---');
for(const [x,z] of [[203,-883],[229,-905],[186,-880]]) expect(`stand (${x},${z}) walkable`,walkable(x,z),true);

console.log('\n--- Task 071 (d): both sanctuary ribbons fully walkable, none inside the dune ---');
{
  const entC2=crSample(MPT.paths.entrance,1.2), loopC2=crSample(MPT.paths.loop,1.2);
  let entBad=0; for(const p of entC2) if(!walkable(p[0],p[1])) entBad++;
  let loopBad=0; for(const p of loopC2) if(!walkable(p[0],p[1])) loopBad++;
  expect(`entrance ribbon fully walkable (${entBad} bad of ${entC2.length})`,entBad,0);
  expect(`loop ribbon fully walkable (${loopBad} bad of ${loopC2.length})`,loopBad,0);
  let entDune=0; for(const p of entC2) if(CH.inMontroseDune(p[0],p[1])) entDune++;
  let loopDune=0; for(const p of loopC2) if(CH.inMontroseDune(p[0],p[1])) loopDune++;
  expect(`no entrance-ribbon sample inside the dune (${entDune})`,entDune,0);
  expect(`no loop-ribbon sample inside the dune (${loopDune})`,loopDune,0);
}

console.log('\n--- Task 071 (e): the new-land spots on the bulge are walkable ---');
for(const [x,z] of [[MPT.scope.x,MPT.scope.z],[242,-894],[240,-882],[240,-909]]) expect(`new-land (${x},${z}) walkable`,walkable(x,z),true);

console.log('\n--- Task 071 (f): the bulge terraces step DOWN seaward to open water (mirrors the Tip idiom) ---');
{
  const segs=MTR_SEGS[2];   // buildSegs of the flipped Point piece (walkprobe builds MTR_SEGS from COAST_MTR)
  for(const zc of [-879,-894,-912]){
    let s=segs[0],bd=1e9; for(const seg of segs){const d=Math.abs(seg.az-zc);if(d<bd){bd=d;s=seg}}
    const ys=[];let mono=true,maxI=-1,allWalk=true;
    for(const lat of [0.4,3,6,9]){
      const px=s.ax+s.nx*lat,pz=s.az+s.nz*lat;
      ys.push(+surfaceY(px,pz).toFixed(2));
      const q=coastQuery(px,pz);if(q){const t=tierAt(q.lat,q.z);if(t)maxI=Math.max(maxI,t.i);}
      if(!walkable(px,pz))allWalk=false;
    }
    for(let i=1;i<ys.length;i++)if(ys[i]>ys[i-1]+1e-6)mono=false;
    const waterBeyond=!walkable(s.ax+s.nx*14,s.az+s.nz*14);
    console.log(`  bulge zc=${zc} @(${s.ax.toFixed(0)},${s.az.toFixed(0)}) ys=${JSON.stringify(ys)} mono=${mono} walk=${allWalk} maxTier=${maxI} waterBeyond=${waterBeyond}`);
    expect(`bulge zc=${zc}: steps down + walkable + maxTier>=2 + water beyond`,mono&&allWalk&&maxI>=2&&waterBeyond,true);
  }
}

console.log('\n--- Task 071 (g): open water beyond the bulge apron is NOT walkable ---');
// The TIER_DEFAULT revetment apron is ~12.2 m wide, so the walkable stepped
// terrace extends ~12 m seaward of the coast line (at the apex that runs PAST
// xMax 244 — the player is clamped at 244, so those outer tiers are unreachable
// in-game). Genuine open water begins beyond the apron: sample the piece's local
// east reach + 14 m at three z's. (The task's 248-252 coords land ON the walkable
// apron, not water — see report.)
{
  const P=CH.COAST_MTR_POINT_PTS;
  for(const zc of [-869,-884,-904]){
    let cx=-1e9; for(const p of P) if(Math.abs(p[1]-zc)<6) cx=Math.max(cx,p[0]);
    const x=+(cx+14).toFixed(1);
    expect(`open water (${x},${zc}) beyond the apron NOT walkable`,walkable(x,zc),false);
  }
}

console.log('\n--- Task 071 (h): the join seams have no walkability holes ---');
expect('mole join (236,-863) walkable',walkable(236,-863),true);
expect('mole join (236.2,-866) walkable',walkable(236.2,-866),true);
expect('beach join (235,-924) walkable',walkable(235,-924),true);
// beach-sand side of the z-926 join. NB: the task's (232,-930) lands INSIDE the
// roped 072 MONTROSE_DUNE (x<=233, z in [-978,-926]) -> non-walkable by the dune
// carve (beachCarved). Sample sand EAST of the dune instead (x>233) — see report.
expect('beach-sand side of the z-926 join (235,-928) walkable',walkable(235,-928),true);

console.log('\n--- Task 071 (i): hedge control pts + gaps + loop-end walkable (hook-mole connectivity) ---');
for(const [x,z] of [...MPT.hedge.pts,...MPT.hedge.gaps]) expect(`hedge (${x},${z}) walkable`,walkable(x,z),true);
expect('loop end (206,-863.5) walkable',walkable(206,-863.5),true);

console.log('\n--- Task 071 (j): all 4 birder spots walkable + not inside the dune ---');
for(const b of MPT.birders){
  expect(`birder (${b.x},${b.z}) walkable`,walkable(b.x,b.z),true);
  expect(`birder (${b.x},${b.z}) not inside the dune`,CH.inMontroseDune(b.x,b.z),false);
}

console.log('\n--- Task 071 (k): Point props clear the ribbons (collision-model aware) ---');
// Prop-vs-ribbon clearance across the 4 Montrose ribbons. NB the sanctuary
// intentionally WEAVES some elements into its paths — so each element is held to
// >=0.6 m only against the ribbons it is NOT designed to be adjacent to:
//   * gateway posts FRAME the entrance path (opening 3.8 m > path 2.4 m; a gate
//     crossing, exempt like the sanctuary fence gate) -> clear the trail + loop.
//   * split-rail flanks LINE the trail (x=191, just E of the walk ribbon) ->
//     clear the sanctuary paths (south flank shortened to -886.6 off the bow).
//   * the tip scope sits EAST of the loop's tip arc -> clears ALL walkways
//     (moved from the staged 235.5,-899, which overlapped the sampled loop).
//   * birders are NON-colliding makeNPC figures (framework: soft bump only, no
//     blocker) that line the paths -> walkability checked in (j), not clearance.
// The furniture that must stay OFF every walkway — the panel post + every rope
// post — is held to >=0.6 m against ALL FOUR ribbons.
{
  const mtBike=crSample(CH.TRAIL_MONTROSE,1.2), mtWalk=offsetLine(mtBike,walkOff);
  const entC2=crSample(MPT.paths.entrance,1.2), loopC2=crSample(MPT.paths.loop,1.2);
  const w=MPT.paths.width/2;
  const RIB={mtBike:{pts:mtBike,half:1.6},mtWalk:{pts:mtWalk,half:1.2},
             ent:{pts:entC2,half:w},loop:{pts:loopC2,half:w}};
  const clr=(x,z,propR,names)=>{                   // min footprint clearance to the named ribbons
    let min=1e9,worst=null;
    for(const nm of names){const rb=RIB[nm];
      for(let i=0;i<rb.pts.length-1;i++){
        const r=ptSeg(x,z,rb.pts[i][0],rb.pts[i][1],rb.pts[i+1][0],rb.pts[i+1][1]);
        const c=r.d-rb.half-propR;
        if(c<min){min=c;worst=`${nm} d=${r.d.toFixed(2)}`;}}}
    return {min,worst};
  };
  const posts=(pts,sp)=>{                           // sample a polyline at fenceRun's post spacing
    const out=[[pts[0][0],pts[0][1]]];
    for(let i=0;i<pts.length-1;i++){
      const ax=pts[i][0],az=pts[i][1],bx=pts[i+1][0],bz=pts[i+1][1];
      const L=Math.hypot(bx-ax,bz-az),n=Math.max(1,Math.round(L/sp));
      for(let k=1;k<=n;k++){const t=k/n;out.push([ax+(bx-ax)*t,az+(bz-az)*t]);}
    }
    return out;
  };
  // 1) furniture that must stay off EVERY walkway: panel post + rope posts.
  const ALL=['mtBike','mtWalk','ent','loop'];
  const furn=[{p:[200,-884.5],r:0.15,n:'panel post'}];
  for(const rope of MPT.ropes) for(const pt of posts(rope,2.6)) furn.push({p:pt,r:0.1,n:'rope post'});
  let fOff=0,fmin=1e9,fw=null;
  for(const pr of furn){const c=clr(pr.p[0],pr.p[1],pr.r,ALL);
    if(c.min<0.6-1e-6){fOff++;console.log(`  OFFENDER ${pr.n} (${pr.p[0].toFixed(1)},${pr.p[1].toFixed(1)}) clr=${c.min.toFixed(2)} (${c.worst})`);}
    if(c.min<fmin){fmin=c.min;fw=`${pr.n} ${c.worst}`;}}
  expect(`panel + ${furn.length-1} rope posts clear ALL 4 ribbons by >=0.6 m (min ${fmin.toFixed(2)} at ${fw}; ${fOff} off)`,fOff,0);
  // 2) the gateway FRAMES the entrance path: opening exceeds the path width, and
  //    the posts clear the through-trail + the loop.
  const gspan=Math.abs(-880.1-(-883.9));
  expect(`gateway opening ${gspan.toFixed(1)} m exceeds the path width ${MPT.paths.width} m (path threads the gate)`,gspan>MPT.paths.width+0.6,true);
  for(const gp of [[191,-880.1],[191,-883.9]]){
    const c=clr(gp[0],gp[1],0.2,['mtBike','mtWalk','loop']);
    expect(`gateway post (${gp[0]},${gp[1]}) clears trail+loop by >=0.6 m (min ${c.min.toFixed(2)} at ${c.worst})`,c.min>=0.6-1e-6,true);
  }
  // 3) split-rail flanks line the trail -> clear the SANCTUARY paths.
  for(const se of [[191,-875.9],[191,-886.6]]){
    const c=clr(se[0],se[1],0.15,['ent','loop']);
    expect(`split-rail end (${se[0]},${se[1]}) clears the sanctuary paths by >=0.6 m (min ${c.min.toFixed(2)} at ${c.worst})`,c.min>=0.6-1e-6,true);
  }
  // 4) the tip scope sits east of the loop's tip arc -> clears ALL 4 ribbons.
  { const c=clr(MPT.scope.x,MPT.scope.z,0.45,ALL);
    expect(`tip scope (${MPT.scope.x},${MPT.scope.z}) clears all walkways by >=0.6 m (min ${c.min.toFixed(2)} at ${c.worst})`,c.min>=0.6-1e-6,true); }
}

console.log('\n--- Task 071 (l): meadow interior spot checks walkable ---');
for(const [x,z] of [[200,-899],[215,-909],[225,-894],[238,-894]]) expect(`meadow (${x},${z}) walkable`,walkable(x,z),true);

// ===== Task 082: SAVE INTEGRITY — migration + round-trip + corrupt-recovery =====
// Pure-node exercise of src/store.js (localStorage shim + cache-busted dynamic
// import per scenario -> fresh module state; store.js caches _save/_probed/
// _recovered, so a distinct ?sv= query yields a fresh module instance). Mirrors
// tools/tmp/082-store-sanity.mjs. store.js's module-level addEventListener is
// try-guarded, so it imports cleanly under node. Reuses the file's expect().
console.log('\n--- Task 082: save integrity (migration + round-trip + corrupt-recovery) ---');
function makeLS(seed){
  const m=new Map(Object.entries(seed||{}));
  globalThis.localStorage={
    getItem:k=>(m.has(k)?m.get(k):null),
    setItem:(k,v)=>m.set(k,String(v)),
    removeItem:k=>m.delete(k),
    clear:()=>m.clear(), _m:m,
  };
}
// (a) v0 -> current (v2, task 085) migration walks the whole chain and keeps every field
makeLS({'ope.save.v1':JSON.stringify({v:0,dibs:7,bag:{'bucket-hat':1},worn:'bucket-hat',favors:{oldstyle:{st:'done',step:2}},zones:['Belmont Harbor'],counters:{fetches:3},flags:{'ope.stamp.lakefront':'1'}})});
const sv1=await import('../src/store.js?sv=wp1');
const wb1=sv1.getSave();
expect('082 v0->v2 version',wb1.v,2);
expect('082 v0->v2 dibs',wb1.dibs,7);
expect('082 v0->v2 worn',wb1.worn,'bucket-hat');
expect('082 v0->v2 favor',wb1.favors.oldstyle.st,'done');
expect('082 v0->v2 stamp flag',wb1.flags['ope.stamp.lakefront'],'1');
expect('082 v0->v2 counter',wb1.counters.fetches,3);
expect('085 v0->v2 gains settings bag',typeof wb1.settings,'object');
expect('082 v0->v2 NOT recovered',sv1.wasSaveRecovered(),false);
// (b) round-trip via public API (mutate -> flushSave -> re-import the written string)
makeLS();
const sv2=await import('../src/store.js?sv=wp2');
const wsv=sv2.getSave(); wsv.dibs=23; wsv.bag['tennis-ball']=1; wsv.worn='ballcap'; wsv.favors.divvyangel={st:'done',step:1}; wsv.flags['ope.stamp.wrigley']='1';
sv2.flushSave();
const written=globalThis.localStorage.getItem('ope.save.v1');
makeLS({'ope.save.v1':written});
const sv2b=await import('../src/store.js?sv=wp2b');
const wrt=sv2b.getSave();
expect('082 round-trip dibs',wrt.dibs,23);
expect('082 round-trip worn',wrt.worn,'ballcap');
expect('082 round-trip favor',wrt.favors.divvyangel.st,'done');
expect('082 round-trip stamp',wrt.flags['ope.stamp.wrigley'],'1');
// (c) corrupt JSON -> fresh blob + recovered flag set (one gentle toast on boot)
makeLS({'ope.save.v1':'{not valid json'});
const sv3=await import('../src/store.js?sv=wp3');
expect('082 corrupt -> fresh dibs',sv3.getSave().dibs,0);
expect('082 corrupt -> recovered',sv3.wasSaveRecovered(),true);
// (d) future version (a stale build can't reach) -> fresh blob + recovered
makeLS({'ope.save.v1':JSON.stringify({v:99,dibs:5})});
const sv4=await import('../src/store.js?sv=wp4');
expect('082 future -> fresh dibs',sv4.getSave().dibs,0);
expect('082 future -> recovered',sv4.wasSaveRecovered(),true);
// (e) brand-new player (no save) -> fresh, NOT recovered (never a toast)
makeLS();
const sv5=await import('../src/store.js?sv=wp5');
expect('082 fresh player dibs',sv5.getSave().dibs,0);
expect('082 fresh player NOT recovered',sv5.wasSaveRecovered(),false);

// ===== 088 PERMANENT GUARDS — spawned as gate categories so the standard
// verify (step 1 = this file) mechanically runs them every time:
//   path-layers.mjs    — path/decal y-ladder assertion (issue 028; pure Node)
//   prop-clearance.mjs — tree/prop-vs-ribbon sweep (issue 029; spawns its OWN
//                        vite + headless page, ~25 s — the cost of "tree-on-path
//                        can never ship again")
// Skip with WALKPROBE_FAST=1 only for tight inner-loop iteration; the final
// gate run must include them.
if(process.env.WALKPROBE_FAST!=='1'){
  const {spawnSync}=await import('child_process');
  for(const tool of['path-layers.mjs','prop-clearance.mjs']){
    console.log(`\n--- 088 guard: ${tool} ---`);
    const r=spawnSync(process.execPath,[new URL(tool,import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')],{encoding:'utf8',timeout:180000});
    const out=(r.stdout||'')+(r.stderr||'');
    const tail=out.trim().split('\n').slice(-6).join('\n');
    console.log(tail);
    expect(`088 guard ${tool} exit 0`,r.status,0);
  }
}

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail?1:0);
