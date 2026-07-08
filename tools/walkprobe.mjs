// Walkability probe — replicates main.js walkable()/surfaceY() using the
// pure geometry from coast.js + the new data, so we can assert exact points
// without needing THREE / a browser. Pure JS mirrors of the engine funcs.
import * as CH from '../src/data/chicago.js';
import * as WV from '../src/data/wrigleyville.js';

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
const LAND=CH.buildLAND({COAST_CORNER,COAST_MAIN,COAST_PEN,COAST_GOLF,COAST_MOUTH,BASIN_W});
const P_START=COAST_PEN[0];
const COAST_TIP=CH.peninsulaTipLine(P_START);   // peninsula south-tip terraced arc (matches coast.js)

function buildSegs(pts){const segs=[];for(let i=0;i<pts.length-1;i++){const ax=pts[i][0],az=pts[i][1],bx=pts[i+1][0],bz=pts[i+1][1];const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);const tx=dx/len,tz=dz/len;segs.push({ax,az,tx,tz,nx:-tz,nz:tx,len})}return segs}
const COAST_SEGS=[buildSegs(COAST_MAIN),buildSegs(COAST_PEN),buildSegs(COAST_GOLF),buildSegs(COAST_MOUTH),buildSegs(COAST_CORNER)];
const TIP_SEGS=buildSegs(COAST_TIP);
const QUERY_SEGS=[...COAST_SEGS,TIP_SEGS];      // coastQuery scans the tip too (COAST_SEGS stays 5 for props/beach-life)
function tierProfile(zc){const R=CH.TIER_ROCKS;if(zc>R.zMin&&zc<R.zMax){if(zc>R.cornerZ0){const f=clamp((zc-R.cornerZ0)/(R.cornerZ1-R.cornerZ0),0,1);const w=R.w.slice();w[w.length-1]=R.w[w.length-1]+(R.cornerPromW-R.w[w.length-1])*f;return{w,step:R.step}}return{w:R.w,step:R.step}}return{w:CH.TIER_DEFAULT.w,step:CH.TIER_DEFAULT.step}}
function profileTotal(zc){const p=tierProfile(zc);let s=0;for(const w of p.w)s+=w;return s}
function inPierChannel(x,z){const P=CH.PIER_CHANNEL;if(!P)return false;if(x<P.x0||x>P.x1||z>P.zMax)return false;const topZ=P.topZ0+(P.topZ1-P.topZ0)*(x-P.x0)/(P.x1-P.x0);return z>=topZ}
function coastQuery(x,z){let best=null,bd2=1e9;for(const C of QUERY_SEGS)for(const s of C){const px=x-s.ax,pz=z-s.az;let t=px*s.tx+pz*s.tz;t=clamp(t,0,s.len);const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;const ddx=x-cx,ddz=z-cz,d2=ddx*ddx+ddz*ddz;if(d2<bd2){bd2=d2;best={lat:ddx*s.nx+ddz*s.nz,d2,z:cz}}}if(!best)return null;best.ae=Math.sqrt(Math.max(0,best.d2-best.lat*best.lat));if(inPierChannel(x,z))best.lat=1e3;return best}
function tierAt(lat,zc){const p=tierProfile(zc);let acc=0;for(let i=0;i<p.w.length;i++){acc+=p.w[i];if(lat<=acc)return{h:-i*p.step,i,edge:acc}}return null}
function beachH(x,z){const b=CH.DOG_BEACH.bounds,s=CH.DOG_BEACH.slope;if(x<b.x0||x>b.x1||z<b.z0||z>b.z1)return null;const t=clamp((z-s.ref)/s.span,0,1);return s.depth*smooth(t)}

// walkRects: finger docks + pier decks (from data)
const walkRects=[];
for(const zc of CH.FINGER_DOCKS.rows)walkRects.push({x1:CH.FINGER_DOCKS.x0,x2:CH.FINGER_DOCKS.x0+CH.FINGER_DOCKS.len,z1:zc-CH.FINGER_DOCKS.halfW,z2:zc+CH.FINGER_DOCKS.halfW});
for(const d of CH.DECKS)walkRects.push(d.walk);
{ const D=CH.SANCTUARY.deck;                     // sanctuary bird-watching deck + stairs (matches buildSanctuary)
  walkRects.push({x1:D.x0,x2:D.x1,z1:D.z0,z2:D.z1,h:D.h});
  for(const st of D.stairs)walkRects.push({x1:st.x0,x2:st.x1,z1:st.z0,z2:st.z1,h:st.h}); }
function onRect(x,z){for(const r of walkRects)if(x>=r.x1&&x<=r.x2&&z>=r.z1&&z<=r.z2)return r;return null}

function walkable(x,z){
  if(onRect(x,z))return true;
  const bh=beachH(x,z);if(bh!==null)return z>CH.DOG_BEACH.walkZMin;
  if(pip(x,z,LAND))return true;
  const q=coastQuery(x,z);
  if(q&&q.ae<0.9&&q.lat>-0.6){const t=tierAt(q.lat,q.z);if(t&&q.lat<profileTotal(q.z)-0.3)return true;}
  return false;
}
function surfaceY(x,z){
  const r=onRect(x,z);if(r)return r.h;
  const bh=beachH(x,z);if(bh!==null)return bh;
  const q=coastQuery(x,z);
  if(q&&q.ae<1.2&&q.lat>0.15){const t=tierAt(q.lat,q.z);if(t)return t.h}
  return 0;
}

let pass=0,fail=0;
function expect(label,got,want){const ok=got===want;console.log(`${ok?'PASS':'FAIL'}  ${label}  -> ${got} (want ${want})`);ok?pass++:fail++;}

console.log('--- trail walkable end to end (main + spur + connector samples) ---');
for(const [x,z] of [...CH.TRAIL_MAIN,...CH.TRAIL_SPUR,...CH.TRAIL_CONNECTOR]) expect(`trail (${x},${z})`,walkable(x,z),true);

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
const RIBBONS=[
  {name:'bike',pts:bikeC,half:CH.TRAIL_STYLE.bike.width/2},
  {name:'walk',pts:walkC,half:CH.TRAIL_STYLE.walk.width/2},
  {name:'spur',pts:spurC,half:CH.TRAIL_STYLE.spur.width/2},
  {name:'loop',pts:loopC,half:CH.TRAIL_STYLE.loop.width/2},
  {name:'conn',pts:connC,half:CH.TRAIL_STYLE.loop.width/2},
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
             [m.x0,m.z0],[m.x1,m.z1],...m.holes.map(h=>[h.x,h.z])];
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
console.log('\n--- Wrigleyville: street corridors walkable ---');
for(const [x,z] of [[-200,-400],[-140,-400],[-300,-400],[-190,-450],[-250,-500],[-230,-520],[-280,-460]])
  expect(`street (${x},${z})`,WV.walkableW(x,z),true);
expect('Clark diagonal mid-block (-304,-450) walkable',WV.walkableW(WV.clarkX(-450),-450),true);
expect('Clark @ Waveland (-318,-500) walkable',WV.walkableW(WV.clarkX(-500),-500),true);

console.log('\n--- Wrigleyville: the park + lots are NOT walkable (game day) ---');
for(const [x,z] of [[-240,-450],[-260,-425],[-210,-480],[-176,-487],[-242,-516],[-221,-540]])
  expect(`inside a lot (${x},${z}) NOT walkable`,WV.walkableW(x,z),false);

console.log('\n--- Wrigleyville: barricade mouths end the corridors ---');
for(const [x,z] of [[-120,-400],[-330,-400],[-334,-500],[-180,-500],[-190,-388],[-190,-510],[-230,-548],[-290,-388]])
  expect(`beyond barricade (${x},${z}) NOT walkable`,WV.walkableW(x,z),false);

console.log('\n--- Wrigleyville: Addison platform + stairs (elevated surfaces) ---');
expect('platform center (-140,-435) walkable',WV.walkableW(-140,-435),true);
expect('platform y = 7.6',WV.surfaceYW(-140,-435),7.6);
expect('track bed west (-145.5,-450) NOT walkable',WV.walkableW(-145.5,-450),false);
expect('embankment top away from platform (-140,-470) NOT walkable',WV.walkableW(-140,-470),false);
expect('under the bridge (-140,-400) walkable at street level',WV.walkableW(-140,-400)&&WV.surfaceYW(-140,-400)===0,true);
{ const yMid=WV.surfaceYW(-140,-418);
  expect(`station stair mid (-140,-418) between floors (${yMid.toFixed(2)})`,yMid>1&&yMid<7.5,true); }
expect('station stair landing (-140,-406) at street',WV.surfaceYW(-140,-406),0);

console.log('\n--- Wrigleyville: the climbable rooftop ---');
expect('roof center (-212.5,-515) walkable',WV.walkableW(-212.5,-515),true);
expect('roof y = 9.6',WV.surfaceYW(-212.5,-515),9.6);
{ const yMid=WV.surfaceYW(-206.5,-514);
  expect(`rooftop stair mid (-206.5,-514) between floors (${yMid.toFixed(2)})`,yMid>1&&yMid<9.5,true); }
expect('neighbor roof (-221,-515) NOT walkable (only one is open)',WV.walkableW(-221,-515),false);

console.log('\n--- Wrigleyville: Gallagher Way plaza hugs the Clark diagonal ---');
expect('plaza @ z-460 (clark+20) walkable',WV.walkableW(WV.clarkX(-460)+20,-460),true);
expect('east of plaza @ z-460 (clark+36) NOT walkable (stadium)',WV.walkableW(WV.clarkX(-460)+36,-460),false);
expect('plaza does not extend south of z-430 (clark+20,z-420) NOT walkable',WV.walkableW(WV.clarkX(-420)+20,-420),false);
expect('plaza north edge @ z-462 (clark+20) walkable',WV.walkableW(WV.clarkX(-462)+20,-462),true);
expect('Gallagher office block @ z-480 (clark+20) NOT walkable (plaza stops at -466)',WV.walkableW(WV.clarkX(-480)+20,-480),false);
expect('statue row spot (-290,-464) walkable',WV.walkableW(-290,-464),true);

console.log('\n--- Wrigleyville: the rounded marquee corner + its sidewalk apron ---');
expect('apron inside the crescent (-283.5,-409.5) walkable',WV.walkableW(-283.5,-409.5),true);
expect('apron at street level',WV.surfaceYW(-283.5,-409.5),0);
expect('old sharp corner spot (-284.2,-407.8) now walkable apron',WV.walkableW(-284.2,-407.8),true);
expect('behind the curve (-278,-412) NOT walkable (inside the stadium fillet)',WV.walkableW(-278,-412),false);
expect('marquee gate apex (-281.83,-409.85) on the arc edge NOT past the wall (-280,-411)',WV.walkableW(-280,-411),false);
expect('apron does not leak north of the Clark tangent (-286,-420) NOT walkable',WV.walkableW(-286,-420),false);

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail?1:0);
