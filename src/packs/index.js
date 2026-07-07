// content packs — one import per pack
// Each pack is a module in this folder that imports from ../framework.js and
// does ALL of its setup inside onWorldReady(...) callbacks. This file is
// imported (side-effect only) by main.js BEFORE the world is built, so adding
// a pack is a single line here — no shared files change.
//
// e.g.  import './stones.js';
import './ambient.js';
import './activities1.js';
import './npcs.js';
import './nature.js';
import './progression.js';
import './parkcharm.js';
import './moorings.js';
import './delight.js';
import './lsd.js';
import './parklife.js';
import './traillife.js';
import './watertoys.js';
import './characters.js';
import './wrigleyville.js';   // neighborhood two — the Wrigleyville cell
