// WRIGLEYVILLE cell pack — builds neighborhood two (see WRIGLEYVILLE.md).
// World geometry lives in src/wrigley/*, data in src/data/wrigleyville.js,
// the cell mechanics in src/cells.js. The ride pack handles boarding; this
// pack only builds the place and honors dev spawns that land inside it.
import { onWorldReady } from '../framework.js';
import { buildWrigleyville } from '../wrigley/index.js';
import { setActiveCell } from '../cells.js';

onWorldReady((player) => {
  buildWrigleyville();
  // ?x=&z= dev spawn (or a future save) inside the cell → activate it
  if (player.x < -100) {
    setActiveCell('wrigleyville');
    player.y = 0;   // surfaceY lerp takes it from here (platform = 7.6)
  }
});
