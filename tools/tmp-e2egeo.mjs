// tmp-e2egeo.mjs — coordinates for the 064 E2E scripts
import * as B from '../src/data/wrigley-bowl.js';
import { STADIUM_W } from '../src/data/wrigleyville.js';
const at = (r, th) => [B.HP_B[0] + Math.sin(th) * r, B.HP_B[1] + Math.cos(th) * r];
const R = v => Math.round(v * 100) / 100;
// seat[0] (s −0.55, row 6)
{ const th = B.BACK_B - 0.55, r = B.rWallB(th) + 0.8 + 3.8 + 6 * 1.4 + 0.7 + 0.42;
  console.log('seat0', at(r, th).map(R)); }
// vendor arc center (th = BACK+0.3, concourse mid)
{ const r = B.rWallB(B.BACK_B) + 0.8 + 3.8 / 2;
  console.log('vendorCenter', at(r, B.BACK_B + 0.3).map(R)); }
// grass spot just inside the track edge at BACK+0.9 (2 m onto grass, short escape hop)
{ const th = B.BACK_B + 0.9, r = B.rWallB(th) - 3.0 - 2.0;
  console.log('grassEdge', at(r, th).map(R), 'kind', B.kindAtB(...at(r, th)));
  console.log('trackSafe', at(B.rWallB(th) - 1.5, th).map(R), 'kind', B.kindAtB(...at(B.rWallB(th) - 1.5, th))); }
// marquee gate + box office (wrigleyville frame)
console.log('marqueeGate', STADIUM_W.gates.marquee);
console.log('spawnB', [R(B.SPAWN_B.x), R(B.SPAWN_B.z)]);
