// 084 frame derivation: junction x-values, lamp re-fractions, walk metric.
// Pure math against the PRE-084 constants (hardcoded here, from git HEAD).
const oldGolfFx = z=>232+Math.sin(z*0.017)*1.9+Math.sin(z*0.045+1.1)*1.1+Math.sin(z*0.082+0.4)*0.7;
const oldMtrFx  = z=>234+Math.sin(z*0.016)*2.2+Math.sin(z*0.041+0.7)*1.3;
const DZ=436;
const newMtrFx  = z=>234+Math.sin((z-DZ)*0.016)*2.2+Math.sin((z-DZ)*0.041+0.7)*1.3;

console.log('golfFx(-580) =', oldGolfFx(-580).toFixed(3));
console.log('golfFx(-400) =', oldGolfFx(-400).toFixed(3));
for(const z of [-1088,-1091,-1365,-1500]) console.log(`oldMtrFx(${z}) =`, oldMtrFx(z).toFixed(3), ' newMtrFx(', z+DZ, ') =', newMtrFx(z+DZ).toFixed(3));

// ---- trail lengths (CatmullRom arc approx like THREE, chordal-ish uniform CR) ----
function crSample(ctrl, step){
  const m=ctrl.length; if(m<2) return ctrl.map(p=>[p[0],p[1]]);
  const pt=i=>ctrl[Math.max(0,Math.min(m-1,i))];
  const P=[[ctrl[0][0],ctrl[0][1]]];
  for(let s=0;s<m-1;s++){
    const p0=pt(s-1),p1=pt(s),p2=pt(s+1),p3=pt(s+2);
    const n=Math.max(1,Math.round(Math.hypot(p2[0]-p1[0],p2[1]-p1[1])/step));
    for(let k=1;k<=n;k++){const t=k/n,t2=t*t,t3=t2*t;
      P.push([0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
              0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)]);}
  }
  return P;
}
const len=P=>{let L=0;for(let i=1;i<P.length;i++)L+=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);return L};

const TRAIL_MAIN_OLD=[
  [30,406],[25,390],[22,366],[20.5,338],[19.5,306],[19.5,272],[19.5,238],[20,210],[27,190],
  [36,178],[50,172],[66,168],[82,162],[96,152],[106,138],[112,120],[111,106],
  [104,55],[90,15],[75,-5],[58,-45],[48,-95],[44,-150],[45,-205],[48,-258],[54,-300],
  [62,-325],[74,-340],[86,-352],[90,-366],[90,-388],[90,-410],[91,-427],
  [106,-433],[145,-433],[182,-432],[205,-431],[211,-448],[211,-540],[211,-660],[211,-782]];
const TRAIL_MAIN_NEW=TRAIL_MAIN_OLD.slice(0,39).concat([[210,-560],[208,-572]]); // ...[211,-540],[210,-560],[208,-572]
const TRAIL_MONTROSE_OLD=[[211,-770],[211,-812],[205,-890],[198,-985],[188,-1072],[172,-1135],
  [158,-1200],[160,-1265],[180,-1312],[199,-1360],[206,-1414],[210,-1460]];
// new: join main end (~208,-572) -> bay routing -> shifted harbor alignment
const TRAIL_MONTROSE_NEW=[[209,-562],[206,-580],[198,-600],[190,-622],[186,-648],[178,-676],
  [172,-699],[158,-764],[160,-829],[180,-876],[199,-924],[206,-978],[210,-1024]];

const mOld=crSample(TRAIL_MAIN_OLD,1.0), mNew=crSample(TRAIL_MAIN_NEW,1.0);
const tOld=crSample(TRAIL_MONTROSE_OLD,1.0), tNew=crSample(TRAIL_MONTROSE_NEW,1.0);
const L0=len(mOld), L1=len(mNew);
console.log('\nTRAIL_MAIN old length', L0.toFixed(1), ' new', L1.toFixed(1));
console.log('TRAIL_MONTROSE old length', len(tOld).toFixed(1), ' new', len(tNew).toFixed(1));

// walk metric: spawn (109.5,156.6) join main near [96,152]; walk main north to its end,
// then montrose trail to the beach arrival (mt-beach stand old (215,-1456) / new (215,-1020)).
function arcBetween(P, fromPt, toPt){
  const near=(p)=>{let bi=0,bd=1e18;for(let i=0;i<P.length;i++){const d=(P[i][0]-p[0])**2+(P[i][1]-p[1])**2;if(d<bd){bd=d;bi=i}}return bi};
  const a=near(fromPt),b=near(toPt);let L=0;
  for(let i=Math.min(a,b)+1;i<=Math.max(a,b);i++)L+=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);
  return L;
}
const walkOld=arcBetween(mOld,[96,152],[211,-782])+arcBetween(tOld,[211,-770],[210,-1460])
  - 0 /* overlap main/montrose joint ~12m ignored */;
const oldToBeach=arcBetween(mOld,[96,152],[211,-782])+arcBetween(tOld,[211,-770],[206,-1414]);
const newToBeach=arcBetween(mNew,[96,152],[208,-572])+arcBetween(tNew,[209,-562],[206,-978]);
console.log('\nwalk spawn->beach-arrival OLD m =',oldToBeach.toFixed(0),' -> min brisk(3.4)',(oldToBeach/3.4/60).toFixed(2));
console.log('walk spawn->beach-arrival NEW m =',newToBeach.toFixed(0),' -> min brisk(3.4)',(newToBeach/3.4/60).toFixed(2));

// ---- lamp world positions on the OLD curve (t fractions) -> new fractions ----
// arc-length param approx: uniform-u sampling like THREE getPoint (CR chordal? THREE uses
// centripetal? r128 CatmullRomCurve3 default 'centripetal'). Approximate with uniform CR —
// close enough to re-derive fractions; we verify lamp positions visually after.
const LAMPF=[0.06,0.14,0.22,0.30,0.38,0.46,0.54,0.62,0.70,0.78,0.86,0.93];
function ptAtFrac(P,f){const target=f*len(P);let L=0;for(let i=1;i<P.length;i++){const d=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);if(L+d>=target){const u=(target-L)/d;return [P[i-1][0]+(P[i][0]-P[i-1][0])*u,P[i-1][1]+(P[i][1]-P[i-1][1])*u]}L+=d}return P[P.length-1]}
console.log('\nlamps: oldT -> old world pos -> newT (same arc dist) [drop if >1]');
for(const f of LAMPF){
  const s=f*L0, nf=s/L1, p=ptAtFrac(mOld,f);
  console.log(`  t=${f} s=${s.toFixed(0)} at (${p[0].toFixed(1)},${p[1].toFixed(1)}) -> newT=${nf.toFixed(4)}${nf>0.99?'  DROP->extra':''}`);
}
