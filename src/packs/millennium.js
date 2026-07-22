// MILLENNIUM PARK cell pack — builds neighborhood three (the downtown park
// reached by riding the Red Line SOUTH; see GEOGRAPHY.md MILLENNIUM_GEOGRAPHY).
// World geometry lives in src/millennium/*, data in src/data/millennium.js,
// the cell mechanics in src/cells.js. This pack only builds the place and
// honors a dev spawn that lands inside it. (042 wires the ride/boarding.)
import { onWorldReady, addSitSpot } from '../framework.js';
import { buildMillennium } from '../millennium/index.js';
import { setActiveCell } from '../cells.js';
import { LURIE_M, CLAMP_FULL_M } from '../data/millennium.js';

onWorldReady((player) => {
  buildMillennium();
  // Lurie Seam boardwalk — sittable edge, feet dangling over the rill (the
  // sanctuary-deck pattern). Pure-distance interactions; the cell is
  // coordinate-disjoint (z>800) so they never fire outside Millennium.
  for (const s of LURIE_M.seam.sits)
    addSitSpot({ x: s.x, z: s.z, ry: s.ry, y: 0, r: 1.8, label: 'sit by the rill' });
  // ?x=&z= dev spawn (or a future save) inside the cell → activate it. Gated on
  // the millennium clamp REGION (not a bare z>500): task 112 grew the lakefront's
  // Lincoln Park to z 408..1020, so z>500 is no longer unique to millennium — but
  // Lincoln Park sits at x<44 wherever z≥700, so the full x/z box cleanly excludes
  // it (millennium is x44..340, z700..1040; Wrigleyville stays z<−310).
  const C = CLAMP_FULL_M;
  if (player.x >= C.xMin && player.x <= C.xMax && player.z >= C.zMin && player.z <= C.zMax) {
    setActiveCell('millennium');
    player.y = 0;   // surfaceYM lerp takes it from here (BP deck rises to 5)
  }
});
