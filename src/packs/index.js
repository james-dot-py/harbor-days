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
import './wrigley-rooftop.js';   // the climbable Sheffield rooftop deck — sit spots + fans (task 054)
import './wrigley-bowl.js';   // INSIDE Wrigley — ticket, honest Marquee Gate, the bowl pocket cell + ref chase (task 055)
import './about.js';   // About / credits — OpenStreetMap ODbL attribution
import './kofi.js';   // Ko-fi support — diegetic rooftop billboard (task 011)
import './suggestions.js';   // Neighborhood suggestion box on the AIDS Garden spawn plaza (task 013, relocated task 023)
import './millennium.js';   // neighborhood three — the Millennium Park cell (task 041)
import './bean-visitors.js';   // posing visitors + journal naming at THE BEAN (task 043)
import './crown-fountain.js';   // Crown Fountain LED faces + spout + splash + kid NPCs (task 045)
import './millennium-delight.js';   // Millennium delight — bean polisher, wedding shoot, Pritzker soundcheck, station rumble (task 047)
import './millennium-lawnlife.js';   // Millennium Great Lawn crowd — real posed chibi people (task 048 item 0d)
import './skating.js';   // McCormick rink — NPC skaters, mayor skates + blade-carve audio (task 049)
import './ribbon-skaters.js';   // Maggie Daley Skating Ribbon — arclength loopers + wobbly beginner (task 059)
import './artinstitute.js';   // the Art Institute — steps lunch pair, lion luck, sandwich board, Route 66 (task 060)
