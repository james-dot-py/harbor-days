import * as CH from '../src/data/chicago.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*(3-2*t);
// exact mirror of coast.js beachH (dog cove) + montrose
function beachH(x,z){const b=CH.DOG_BEACH.bounds,s=CH.DOG_BEACH.slope;if(x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1){const t=clamp((z-s.ref)/s.span,0,1);return s.depth*smooth(t)}return CH.montroseBeachH(x,z)}
const cands = {
  'DG green  (94,-338)':[94,-338],
  'DG brown  (100,-336)':[100,-336],
  'DG white  (107,-338)':[107,-338],
  'MT green  (216,-1430)':[216,-1430],
  'MT white  (222,-1444)':[222,-1444],
  'MT blue   (212,-1468)':[212,-1468],
};
for(const [k,[x,z]] of Object.entries(cands)){
  const h=beachH(x,z);
  const dune=CH.inMontroseDune(x,z);
  const carved=CH.beachCarved(x,z);
  const walk=CH.beachWalkable(x,z);
  console.log(`${k}: beachH=${h===null?'NULL':h.toFixed(3)}  inDune=${dune}  carved=${carved}  beachWalkable=${walk}`);
}
console.log('\nDune bounds:',JSON.stringify(CH.MONTROSE_DUNE.bounds));
console.log('Beach house footRect:',JSON.stringify(CH.BEACH_HOUSE.footRect));
console.log('Dock deckRect:',JSON.stringify(CH.THE_DOCK.deckRect));
console.log('DOG_BEACH bounds:',JSON.stringify(CH.DOG_BEACH.bounds));
