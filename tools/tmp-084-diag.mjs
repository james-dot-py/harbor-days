// 084 diag: find genuine cove-water points (>profileTotal from shore, off LAND).
import * as G from './tmp-084-geom.mjs';

const cand=[[200,-632],[210,-632],[220,-632],[230,-632],[210,-620],[220,-618],
  [205,-640],[215,-635],[220,-645],[225,-635],[200,-615],[228,-628]];
for(const [x,z] of cand){
  const inLand=G.pip(x,z,G.LAND);
  const q=G.coastQuery(x,z);
  const pt=q?G.profileTotal(q.z):0;
  const ok = !G.walkable(x,z) && G.isWater(x,z);
  console.log(`${ok?'WATER ':'      '}(${x},${z}) walkable=${G.walkable(x,z)} water=${G.isWater(x,z)} pip=${inLand} lat=${q?q.lat.toFixed(1):'-'} (apron ${pt.toFixed(1)})`);
}
