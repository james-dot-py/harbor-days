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
{ const B=CH.DIVERSEY.bays.deckRect;              // Diversey ground-tier hitting deck (matches structures.js walkRects.push)
  walkRects.push({x1:B.x0,x2:B.x1,z1:B.z0,z2:B.z1,h:B.h}); }
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
  ['Randolph sidewalk',120,709],['Monroe sidewalk',120,890],
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
  ['Michigan roadway',40,800],['Randolph roadway',100,700],['Monroe roadway',100,900],['Columbus roadway',195,750],
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
  ['bridge-landing plaza',250,808],['climbing-wall island',250,760],['plaza->ribbon connector',262,785],
  ['play-garden esplanade',285,806],['play garden core',285,830],['Slide Crater apron',305,858],
  ['CSG garden walk',330,760],['tennis pad',307,720],['Monroe-side south rim',270,882],['LSD overlook',334,830],
]) expect(`${label} (${x},${z}) walkable at grade`,MP.walkableM(x,z)&&MP.surfaceYM(x,z)===0,true);
// the Skating Ribbon BED is walkable now; kind is NULL until 059 flips ribbonIce
{ const P=MP.RIBBON_M.loop[0];   // (276.1,738.9) on the ribbon centerline
  expect(`ribbon bed (${P[0]},${P[1]}) walkable (058 paved bed)`,MP.walkableM(P[0],P[1]),true);
  expect('ribbon bed is NOT ice yet (059 flips ribbonIce)',MP.kindAtM(P[0],P[1]),null); }
// building footprints SEALED (052 law — data carve, not circular colliders)
for(const [label,x,z] of [
  ['climbing wall A footprint',250,748],['play ship footprint',272,845],['lighthouse footprint',303,849],
  ['fort tower footprint',289,822],['CSG pavilion frame',329.5,746],['fieldhouse footprint',264,720],
]) expect(`${label} (${x},${z}) sealed (NOT walkable)`,MP.walkableM(x,z),false);
// the CSG Federal Building COLUMNS stay collider-pattern (small piers standing
// ON the garden walk, like the Crown towers / peristyle) — walkable in data.
expect('CSG columns are colliders on walkable ground (327.4,714.5)',MP.walkableM(327.4,714.5),true);

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
  expect(`whole network reachable from the spawn (${reach}/${total} cells)`,reach,total);
  expect(`network area sane (${total} cells > 8000)`,total>8000,true);
  // key destinations reachable (grid cells): peristyle, bean, crown pool,
  // bowl, lawn, seam boardwalk, bridge crest, all four frame corners
  for(const [label,x,z] of [
    ['peristyle plaza',67,730],['Bean plaza',87,798],['Crown pool',70,864],
    ['seating bowl',147,777],['Great Lawn',150,820],['Seam boardwalk',159,862],
    ['BP crest',200,790],['NW corner',50,709],['SW corner',50,890],
    // Maggie Daley (058) — every zone reached ONLY over the BP crossing
    ['BP landing plaza',250,808],['ribbon bed',276,738],['climbing island',250,760],
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
    const pts=q.seg
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

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail?1:0);
