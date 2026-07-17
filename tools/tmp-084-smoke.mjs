import * as m from '../src/data/chicago.js';
console.log('OK exports:',Object.keys(m).length);
console.log('BAY pts',m.COAST_BAY_PTS.length,'first',m.COAST_BAY_PTS[0].map(v=>+v.toFixed(2)),'last',m.COAST_BAY_PTS[m.COAST_BAY_PTS.length-1].map(v=>+v.toFixed(2)));
console.log('mouth first',m.MTR_HARBOR_MOUTH[0].map(v=>+v.toFixed(2)));
console.log('CLAMP',JSON.stringify(m.WORLD_CLAMP));
console.log('CRICKET cz',m.CRICKET_HILL.cz,'HILL h at summit',m.cricketHillH(112,-879));
console.log('mtfx(-652)',m.montroseFx(-652).toFixed(3),' (want 236.278)');
console.log('golf params',JSON.stringify(m.COAST_GOLF_PARAMS.z0),m.COAST_GOLF_PARAMS.z1,'ghost',m.COAST_GOLF_GHOST_PARAMS.z0,m.COAST_GOLF_GHOST_PARAMS.z1);
console.log('beach bounds',JSON.stringify(m.MONTROSE_BEACH.bounds));
console.log('dune bounds',JSON.stringify(m.MONTROSE_DUNE.bounds));
console.log('point stands',JSON.stringify(m.MONTROSE_POINT.stands));
console.log('hedge pts',JSON.stringify(m.MONTROSE_POINT.hedge.pts));
console.log('close pts',JSON.stringify(m.COAST_MTR_CLOSE_PTS.map(p=>p.map(v=>+v.toFixed(2)))));
console.log('trail montrose',JSON.stringify(m.TRAIL_MONTROSE));
console.log('scatterCarve mole-top(228,-760)',m.scatterCarve084(228,-760),' lawn(100,-700)',m.scatterCarve084(100,-700));
// beach helper sanity at new frame
console.log('montroseBeachH(215,-1020)',m.montroseBeachH(215,-1020));
console.log('MAP',JSON.stringify(m.MAP));
