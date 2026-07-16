// tmp (task 068): dump the Montrose Point band geometry — stub shore x per z,
// trail x per z, and neighbor join points — to design the staged 071 layout.
import * as CH from '../src/data/chicago.js';
const fx = CH.montroseFx;
console.log('--- stub shore x = montroseFx(z) across the Point band ---');
for (const z of [-1300,-1303,-1310,-1315,-1320,-1325,-1330,-1335,-1340,-1345,-1350,-1355,-1360,-1362,-1365])
  console.log(z, fx(z).toFixed(2));
console.log('--- TRAIL_MONTROSE x interpolated across the band ---');
const T = CH.TRAIL_MONTROSE;
for (const z of [-1290,-1300,-1312,-1320,-1330,-1340,-1350,-1360]) {
  for (let i=0;i<T.length-1;i++){
    const [x0,z0]=T[i],[x1,z1]=T[i+1];
    if ((z<=z0&&z>=z1)||(z>=z0&&z<=z1)){ const t=(z-z0)/(z1-z0); console.log('trail',z,(x0+(x1-x0)*t).toFixed(1)); break; }
  }
}
console.log('--- neighbor joins ---');
console.log('COAST_MTR_HARBOR_PTS last:', CH.COAST_MTR_HARBOR_PTS[CH.COAST_MTR_HARBOR_PTS.length-1].map(v=>v.toFixed(2)).join(','));
console.log('POINT stub z0/z1:', CH.COAST_MTR_POINT_PARAMS.z0, CH.COAST_MTR_POINT_PARAMS.z1, 'fx(z0)=', fx(CH.COAST_MTR_POINT_PARAMS.z0).toFixed(2), 'fx(z1)=', fx(CH.COAST_MTR_POINT_PARAMS.z1).toFixed(2));
console.log('BEACH stub z0:', CH.COAST_MTR_BEACH_PARAMS.z0, 'fx(z0)=', fx(CH.COAST_MTR_BEACH_PARAMS.z0).toFixed(2));
console.log('DUNE bounds:', JSON.stringify(CH.MONTROSE_DUNE.bounds));
console.log('MOLE north end (MT_MOLE_PAVE z<=-1300 pts):', JSON.stringify(CH.MT_MOLE_PAVE.filter(p=>p[1]<=-1299)));
console.log('CRICKET_HILL:', JSON.stringify(CH.CRICKET_HILL));
console.log('WORLD_CLAMP:', JSON.stringify(CH.WORLD_CLAMP));
