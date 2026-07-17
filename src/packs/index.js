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
import './lolla.js';   // LOLLAPALOOZA live — crowd, band, festival set, dance circle (task 061)
import './wrigley-game.js';   // GAME DAY inside the bowl — the ball game, crowd, seats, stretch (task 064)
import './montrose-beach.js';   // Montrose Beach life — wandering beachgoers + piping-plover sign (task 072)
import './cricket-hill.js';   // Cricket Hill — the walkable kite mound + flyers/kites tableau (task 073)
import './montrose-harbor-life.js';   // Montrose Harbor delight — the hook fisherman's catch + Park Bait cricket chirp (task 074)
import './montrose-kite.js';   // FLY A KITE on Cricket Hill — hold-to-launch, session cam, reel-in (task 074)
import './montrose-point.js';   // THE MAGIC HEDGE — Montrose Point sanctuary life: birders + scopes + clustered chibi migrants + graded birdsong (task 071)
import './favors-pilot.js';   // THE ECONOMY's pilot favor — "an Old Style for the Malört guy" (task 078)
import './economy-pilot.js';   // THE ECONOMY's beach kiosk + pilot toys — popcorn/tennis ball/bucket hat (task 078)
import './economy-payouts.js';   // THE ECONOMY's unowned dibs — zone discovery, the fireworks finale, the jetski (task 079)
import './hats.js';   // THE HATS — six mayor-only cosmetics, 1 draw each worn (task 080)
import './sea-glass.js';   // BEACHCOMBING — sea-glass spots on the two beaches, four colors, a journal page (task 080)
import './sluggers-shop.js';   // SLUGGERS TO-GO — the Clark St walk-up window: Chicago dog + Old Style + the drink rail (task 080)
import './museum-cart.js';   // THE MUSEUM CART — Michigan-Ave coffee/souvenir cart by the AI lions + museum coffee + the penny machine (task 080)
import './lolla-merch.js';   // LOLLA MERCH — Butler Field merch tent + the boombox-to-go (borrows the radio engine); imports LAST so the millennium cell exists (task 080)
import './favors-core.js';   // FAVORS AT SCALE — the date-seeded daily rotation + "around the neighborhood" journal (task 081)
import './favors-lakefront.js';   // lakefront favors — the love letter, the Divvy angel, the window lady (task 081)
import './favors-wrigley.js';   // Wrigleyville favors — the gull's whistle, poppy buns by the seventh (task 081)
import './favors-downtown.js';   // downtown favors — the chalk bag, the lucky stick, the recipe glide (task 081)
import './favors-montrose.js';   // Montrose favors — the wind-blown field notes, one for the Park Bait wall (task 081)
import './mayor-for-real.js';   // MAYOR FOR REAL — city stamps, the AIDS-Garden ceremony, the regalia returns (task 081)
