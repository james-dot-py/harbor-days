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
import './badminton.js';
import './lawnlife.js';
import './cornhole.js';   // the flagship south-lawn cornhole match (task 003)
import './diversey.js';   // Diversey golf — driving-range + mini-golf play (task 028)
import './sanctuary.js';
import './wrigleyville.js';   // neighborhood two — the Wrigleyville cell
import './wrigley-ride.js';   // the Red Line ride (Belmont ⇄ Addison)
import './wrigley-gameday.js';   // the Wrigleyville game-day event cycle
import './wrigley-npcs.js';   // Wrigleyville street-life NPCs
import './wrigley-sluggers.js';   // the Sluggers batting-cage minigame
import '../wrigley/deepcuts.js';   // Wrigleyville "deep cuts" signage layer
import './wrigley-toys.js';   // Wrigleyville live props — rooftop binoculars + throwable ball
import './wrigley-vendors.js';   // Wrigleyville street-festival — vendors, ticket queue, fan streams, splash pad
import './about.js';   // About / credits — OpenStreetMap ODbL attribution
import './kofi.js';   // Ko-fi support — diegetic rooftop billboard (task 011)
import './suggestions.js';   // Neighborhood suggestion box at the Belmont FUTURE ENTRANCE (task 013)
