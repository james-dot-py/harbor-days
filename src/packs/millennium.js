// MILLENNIUM PARK cell pack — builds neighborhood three (the downtown park
// reached by riding the Red Line SOUTH; see GEOGRAPHY.md MILLENNIUM_GEOGRAPHY).
// World geometry lives in src/millennium/*, data in src/data/millennium.js,
// the cell mechanics in src/cells.js. This pack only builds the place and
// honors a dev spawn that lands inside it. (042 wires the ride/boarding.)
import { onWorldReady } from '../framework.js';
import { buildMillennium } from '../millennium/index.js';
import { setActiveCell } from '../cells.js';

onWorldReady((player) => {
  buildMillennium();
  // ?x=&z= dev spawn (or a future save) inside the cell → activate it.
  // z > 500 is unique to the millennium cell (lakefront zMax 408, wrigley
  // zMax −310), so it can never match a lakefront or Wrigleyville spawn.
  if (player.z > 500) {
    setActiveCell('millennium');
    player.y = 0;   // surfaceYM lerp takes it from here (BP deck rises to 5)
  }
});
