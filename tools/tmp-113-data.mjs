// 113 data sanity: banks, walkability invariants, clearances. Read-only.
import * as CH from '../src/data/chicago.js';
const ok=(n,c)=>console.log((c?'PASS':'FAIL')+' '+n);
// banks at dock rows
for(const zc of CH.LP_DIVERSEY.dockRows){
  const b=CH.lpDivBank(zc);
  console.log(`row z${zc}: e ${b.e.toFixed(2)} w ${b.w.toFixed(2)} width ${(b.e-b.w).toFixed(1)}`);
}
for(const z of [424,470,520,570,610,640,650,660]){
  const b=CH.lpDivBank(z);
  console.log(`z${z}: ${b?`e ${b.e.toFixed(2)} w ${b.w.toFixed(2)}`:'null'}`);
}
// polygon extremes
let zMax=-1e9,zMin=1e9;for(const p of CH.LP_DIVERSEY_WATER){if(p[1]>zMax)zMax=p[1];if(p[1]<zMin)zMin=p[1];}
console.log('water z range',zMin.toFixed(1),zMax.toFixed(1));
const c=CH.LP_DIVERSEY.culvert;
ok('apex under culvert deck (zMax<z1)',zMax<c.z1);
ok('apex south of arch line (zMax>z0)',zMax>c.z0);
// land/walk invariants (mirror walkable expr for LP-only spots)
const walk=(x,z)=>((CH.lpLandHit(x,z)&&!CH.lpBlockedHit(x,z))||CH.lpUnderpassHit(x,z));
for(const [x,z] of [[-3,440],[-4,470],[-5,520],[-6,560],[-7,600],[-8,632]]) ok(`east promenade (${x},${z})`,walk(x,z));
for(const [x,z] of [[-40,470],[-42,520],[-44.5,560],[-42,610]]) ok(`west quay (${x},${z})`,walk(x,z));
for(const [x,z] of [[-10,657],[-16,660],[-24,660],[-32,660],[-35,666]]) ok(`culvert deck (${x},${z})`,walk(x,z));
for(const [x,z] of [[-20,500],[-25,560],[-15,630],[-20,640],[-20,424],[-30,428]]) ok(`water blocked (${x},${z})`,!walk(x,z));
for(const [x,z] of [[-20,672],[-20,680]]) ok(`land S of culvert (${x},${z})`,walk(x,z));
for(const [x,z] of [[42,613],[34,601],[50,625]]) ok(`theater carve blocked (${x},${z})`,!walk(x,z));
for(const [x,z] of [[31,613],[42,598],[42,628],[28,612]]) ok(`theater perimeter walks (${x},${z})`,walk(x,z));
ok('theater is LAND not water (lpLandHit true inside carve)',CH.lpLandHit(42,613));
// trail points still clear (LP_TRAIL_* on walkable ground)
let bad=0;
for(const p of [...CH.LP_TRAIL_LAKE,...CH.LP_TRAIL_PARK,...CH.LP_TRAIL_STOCKTON])
  if(!CH.lpWaterHit(p[0],p[1])&&!walk(p[0],p[1])){bad++;console.log('  trail pt blocked',p);}
ok('all LP trail samples walkable',bad===0);
// trail clear of theater carve
let tbad=0;
for(const p of CH.LP_TRAIL_LAKE) if(CH.lpBlockedHit(p[0],p[1])){tbad++;console.log('  trail in carve',p);}
ok('LP_TRAIL_LAKE clear of theater carve',tbad===0);
// underpass overlap continuity: underpass walk + culvert deck adjacency
ok('underpass west end meets culvert deck (x-12 within deck x range)',CH.LP_UNDERPASS.walk.x0>=c.x0-30&&CH.LP_UNDERPASS.walk.x0<=c.x1+4);
// dock rects fully over water/promenade sanity: root and tip
for(const zc of CH.LP_DIVERSEY.dockRows){
  const root=CH.lpDivBank(zc).e+0.6,tip=root-CH.LP_DIVERSEY.dockLen;
  const midWater=CH.lpWaterHit((root+tip)/2-1,zc);
  ok(`dock z${zc} mid over water`,midWater);
}
// trees not in water / carve / on docks
for(const [x,z,s] of CH.LP_TREES){
  if(CH.lpWaterHit(x,z))console.log('TREE IN WATER',x,z);
  if(CH.lpBlockedHit(x,z))console.log('TREE IN CARVE',x,z);
}
console.log('done');
