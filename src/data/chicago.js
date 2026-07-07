// =====================================================================
//  CHICAGO — Belmont Harbor placement data (real-world proportions)
//  Every Chicago-specific coordinate, range, count and color for Harbor
//  Days lives here. The engine modules (coast/paths/props/structures/main/
//  minimap/sky) import from this file and hold NO city values of their own
//  — ship a differently-shaped file with the same exports to build a new
//  city without touching the builders.
//
//  Frame: 1 unit = 1 m, map is 1:2 of real distances (people/props stay
//  1:1). Water y = -2.3, park y = 0. +z = south, -z = north, lake = east
//  (+x). x = 0 is Lake Shore Drive's east edge; z = 0 is the Belmont Ave
//  line. Map bounds x -10..245, z -850..+415 (~255 x 1265 m). The world
//  rng (core.js, seed 20260704) is consumed in a fixed order by the
//  builders; this file only supplies values and never calls rng itself.
//
//  Canonical layout: see GEOGRAPHY.md. West -> east strip: LSD berm
//  (x 0-14, not walkable) · inner parkland (x 14-85) · then by section.
//  North (low z) -> south (high z):
//    Marovitz golf (x 60-205, z -790..-440; trail on the LAKE side x~211,
//    revetment x 232) · Waveland fieldhouse lakeside at the golf SE (186,-478)
//    · Bird Sanctuary on the lakefront strip (x 100-200, z -420..-357) +
//    Kwanusila (30,-370) · Belmont Harbor basin (x 85-160, z -330..-20) w/ west
//    finger docks, east peninsula (x 160-200) + yacht club, dog-beach cove at
//    the north tip, south-opening TERRACED mouth shore (COAST_MOUTH, z 16..-20)
//    · AIDS Garden (x 60-130, z 60-180) + Keith Haring (95,120) · Belmont
//    Rocks revetment (x 150, 7 steps) east-facing to z340, then the CORNER
//    WRAP (COAST_CORNER, z340..403) curving the same 7 steps around to the
//    south-facing SW terminus (~x55) · south lawn w/ the Chevron sculpture
//    (96,372) + the corner pier (x116-126, z373..406) toward the skyline.
// =====================================================================

/* ------------------------------- COASTS ------------------------------ */
// genCoast(z0,z1,fx) walks z from z0 down to z1 (step 3 in the engine),
// sampling fx(z) as the lake-edge (revetment-top) x; the terrace normal
// points to water (east). Three open-lake edges, all ordered south->north:
// Each fx sums 2-3 sine octaves for a gentle, never-straight organic meander
// (+/- ~3-6 m), the way a real Belmont Harbor shoreline reads from the air.
export const COAST_MAIN_PARAMS = { z0:340, z1:16,   fx:z=>150+Math.sin(z*0.020)*3.4+Math.sin(z*0.052+1.3)*1.9+Math.sin(z*0.091+0.6)*1.0 };  // Belmont Rocks (east-facing) — now reaches z340 where the corner wrap begins
export const COAST_PEN_PARAMS  = { z0:-25, z1:-330, fx:z=>199+Math.sin(z*0.026)*2.8+Math.sin(z*0.058+0.8)*1.7+Math.sin(z*0.101+2.1)*0.9 };  // east peninsula lake edge
export const COAST_GOLF_PARAMS = { z0:-400,z1:-800, fx:z=>232+Math.sin(z*0.017)*1.9+Math.sin(z*0.045+1.1)*1.1+Math.sin(z*0.082+0.4)*0.7 };  // Marovitz trail-side revetment
// THE CORNER WRAP (Diversey/Fullerton point): the SAME 7-step terraced revetment
// as the Rocks, swept from east-facing around to south-facing. Fitted-quadratic fx
// (like COAST_MOUTH): genCoast walks z 403 -> 340, so the array runs SW terminus
// (~x55,z403 — exits the map toward Diversey Harbor) up to the SE join with
// COAST_MAIN at (~x152,z340). Vertex at z340 => dfx/dz=0 there, a smooth tangent
// join to the (vertical) east-facing rocks; the seaward terrace normal rotates
// from due-east at the join to nearly-south at the terminus, so the steps step
// down seaward continuously the whole way around the arc.
export const COAST_CORNER_PARAMS= { z0:403, z1:340, fx:z=>152-0.02444*(z-340)*(z-340)+Math.sin(z*0.10+0.5)*0.7 };  // curved south shore behind the lawn (Chevron + pier)
// harbor-mouth SW shore: its OWN terraced coast piece (south-facing stepped
// revetment, like the real Belmont shore south of the entrance). genCoast walks
// z 16 -> -20 from the rocks' north tip (~x151) to the basin SW corner (~x85);
// the terrace normal points NE into the mouth water, so it steps down to the lake.
export const COAST_MOUTH_PARAMS= { z0:16,  z1:-20, fx:z=>127.5+1.76*z-0.018*z*z+Math.sin(z*0.13+0.4)*0.7 };  // harbor-mouth terraced shore
// west seawall of the harbor basin (own loop: z0 down to z1 by step) — gentle
export const BASIN_W_PARAMS    = { z0:-20, z1:-328, step:3, fx:z=>85+Math.sin(z*0.040)*0.8+Math.sin(z*0.088+0.7)*0.5 };

/* -------------------------------- LAND ------------------------------- */
// Catmull-Rom densifier: a smooth polyline through `ctrl` at ~`step` m
// spacing. Used to ROUND the hand-built corners (harbor mouth, peninsula
// tip, Addison reach) and to keep the seawall polylines continuous so the
// wall pieces join cleanly instead of breaking into floating slabs.
function crChain(ctrl, step){
  const m=ctrl.length; if(m<2) return ctrl.map(p=>[p[0],p[1]]);
  const pt=i=>ctrl[Math.max(0,Math.min(m-1,i))];
  const P=[[ctrl[0][0],ctrl[0][1]]];
  for(let s=0;s<m-1;s++){
    const p0=pt(s-1),p1=pt(s),p2=pt(s+1),p3=pt(s+2);
    const n=Math.max(1,Math.round(Math.hypot(p2[0]-p1[0],p2[1]-p1[1])/step));
    for(let k=1;k<=n;k++){
      const t=k/n,t2=t*t,t3=t2*t;
      const x=0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3);
      const z=0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3);
      P.push([x,z]);
    }
  }
  return P;
}
// basin north shore, east of the dog-beach cove
function basinNorthLine(){ return crChain([[113,-330],[124,-329],[140,-328],[158,-326]],2.5); }
// peninsula west edge (basin east shore, straight bulkhead) + ROUNDED south tip.
// This FULL line is the boundary the LAND polygon traces (unchanged — keeps the world
// rng order intact). Two derived pieces split the wall from the steps:
//  - peninsulaWestSeawall: the STRAIGHT bulkhead — north root down to the SW turn
//    (~z-24) where the coast stops facing the basin and starts facing open water. Stays
//    a flush sheet-pile seawall (docks INSIDE the harbor), per the aerial.
//  - peninsulaTipLine: the terraced SOUTH TIP arc (SW turn -> south point -> SE),
//    joining COAST_PEN at P_START. Ordered basin->lake so its terrace normal points
//    seaward (outward) the whole way around the horseshoe — steps OUTSIDE, wrapping the
//    tip like the Diversey corner in miniature (TIER_DEFAULT, 4 steps).
function peninsulaWestLine(P_START){ return crChain([[158,-326],[160,-260],[160,-160],[160,-70],[161,-40],[166,-24],[176,-17],[186,-18],P_START],2.5); }
function peninsulaWestSeawall(){ return crChain([[158,-326],[160,-260],[160,-160],[160,-70],[161,-40],[166,-24]],2.5); }
export function peninsulaTipLine(P_START){ return crChain([[166,-24],[176,-17],[186,-18],P_START],2.5); }

// The park outline as one polygon: SW corner, up the rocks (COAST_MAIN),
// around the harbor mouth along its terraced revetment (COAST_MOUTH) to the
// basin west seawall (BASIN_W), around the rounded dog-beach cove + basin
// north shore, DOWN the peninsula west edge, around its rounded tip, UP its
// lake edge (COAST_PEN), the Addison reach, up the golf revetment (COAST_GOLF),
// across the north edge, and down the west edge (x = 14 — the LSD berm at
// x 0-14 sits OUTSIDE it). The harbor basin is a concave inlet (open south via
// the mouth), not a hole. Corners are 6-10-point arc sweeps so the aerial reads
// as smooth, curvy shoreline.
export function buildLAND({ COAST_CORNER, COAST_MAIN, COAST_PEN, COAST_GOLF, COAST_MOUTH, BASIN_W }){
  const P_START=COAST_PEN[0], P_END=COAST_PEN[COAST_PEN.length-1];
  const P=[[14,415]];                                      // new SW corner (map extended south; the SW terminus of the corner revetment is ~[55,403], so [14,415]->[55,403] is the SW grass edge toward Diversey)
  P.push(...COAST_CORNER);                                 // curved south-facing revetment (SW terminus -> SE join with the rocks)
  P.push(...COAST_MAIN);                                   // rocks lake edge (curvy)
  P.push(...COAST_MOUTH);                                  // harbor-mouth terraced shore (rocks tip -> basin SW)
  P.push(...BASIN_W);                                      // basin west seawall (curvy)
  P.push([85,-327],[88,-333],[90,-339],[95,-341],[105,-341],[110,-339],[112,-333],[113,-330]); // dog-beach cove (rounded, landward z-341)
  P.push(...basinNorthLine());                             // basin north shore east of the cove
  P.push(...peninsulaWestLine(P_START));                   // peninsula west edge + rounded south tip
  P.push(...COAST_PEN);                                    // peninsula lake edge (curvy)
  P.push(...crChain([P_END,[210,-356],[222,-380],COAST_GOLF[0]],2.5)); // Addison reach (smooth)
  P.push(...COAST_GOLF);                                   // golf revetment (curvy)
  P.push([232,-812],[14,-812]);                            // north edge
  P.push([14,-400],[14,0]);                                // west park edge (closes to [14,415])
  return P;
}

/* ------------------------------ TERRACES ----------------------------- */
// Revetment tier tables. The Belmont Rocks stretch is wider with more
// steps; the peninsula + golf revetment use the default profile.
// Per the user's on-site photos: the BOTTOM tier is a wide waterline
// promenade (the main walk/hangout slab) — much wider than the upper steps.
// STEP 0.317: 6 gaps * 0.317 = 1.90 drop, so the bottom promenade sits at
// y≈-1.9 — just ABOVE the -2.3 lake (reads as a waterline walk, wet-stained at
// its outer edge) and <= -0.55 so a jetski can still hop out onto it (main.js
// canMove exit rule). (Was 0.475 -> -2.85, i.e. BELOW the water — the wide
// promenade made that submersion glaring; the user's 'extended step is
// underwater' screenshot.)
// CORNER TAPER: on the wrapped Diversey corner (COAST_CORNER, zc>cornerZ0) the
// wide bottom promenade tapers 6.0 -> cornerPromW toward the convex SW terminus.
// A single 22.7 m-wide apron on a convex corner bulges ~20 m seaward and bleeds
// past the pier into open water; tapering the promenade pulls that apron back so
// the pier's flanks read as water. f=0 at the z340 join (promenade stays 6.0,
// flush with the straight rocks -> no seam), f=1 at the terminus.
export const TIER_ROCKS   = { zMin:20, zMax:404, w:[3.6,3.0,2.8,2.6,2.4,2.3,6.0], step:0.317,
                              cornerZ0:340, cornerZ1:403, cornerPromW:2.8,
                              // MOUTH TAPER: north of mouthZ0 the 7 widths pinch toward mouthW
                              // (total 12.2 = TIER_DEFAULT's total) so the profile hand-off at
                              // zMin/the mouth junction is flush — was a 10.5 m width cliff
                              // (the user's 'jagged edge at the mouth'). Same 7 entries + step,
                              // so tierProfile call counts (and the world rng order) are unchanged.
                              mouthZ0:44, mouthZ1:20, mouthW:[1.9,1.6,1.5,1.4,1.3,1.2,3.3] };  // 7 steps, wide bottom promenade; zMax 404 so the SAME profile wraps the whole corner (COAST_MAIN to z340, then COAST_CORNER to z403) instead of reverting to the 4-step default
export const TIER_DEFAULT = { w:[3.2,2.4,2.2,4.4], step:0.6 };  // bottom promenade at -3*0.6 = -1.8 (above the lake, exit-able)

// sheet-pile seawalls (flush with the park, straight down). top/bot Y is
// shared by every wall; the polylines reference the generated pieces.
export const SEAWALL_Y = { top:0.04, bot:-3.1 };
// Every polyline here is densified/smoothed (crChain) so the sheet-pile wall
// pieces join continuously along the curve — no floating-slab gaps at bends.
// (The harbor-mouth SW shore is no longer a flush seawall: it is the terraced
// COAST_MOUTH revetment, walled at its bottom tier like the other open-lake edges.
// Likewise the peninsula's SOUTH TIP is now the terraced COAST_TIP piece — the
// seawall here runs only the STRAIGHT west edge down to the SW turn (~z-24).)
export function seawallLines({ P_START, BASIN_W }){
  return [
    BASIN_W,                            // basin west seawall (top -> north tip)
    basinNorthLine(),                   // basin north shore (east of the cove)
    peninsulaWestSeawall(),             // peninsula west bulkhead (root -> SW turn; tip is terraced)
  ];
}

// lake water plane (big enough to cover the tall map + horizon; centered
// near the map's middle so the golf's lake never runs out of water)
export const WATER = { size:1650, seg:180, cx:110, cz:-260 };

// dog beach — sloped sand cove at the basin's NORTH tip. beachH (coast.js)
// reads t = (z - ref)/span so it is 0 (dry) at the north edge and dips to
// `depth` at the south waterline (z ~ -328); walkZMin sits below the whole
// cove so all of it is walkable (the basin water south of it is not).
export const DOG_BEACH = {
  bounds:{ x0:88, x1:112, z0:-341, z1:-327 },     // landward edge pulled to z-341 to clear the dual trail
  slope:{ ref:-341, span:14, depth:-2.0 },
  mesh:{ cx:100, cz:-334, w:24, d:16, segW:20, segD:12 },
  walkZMin:-343,
};

// scattered mottled-grass circles across the whole park
export const GRASS_PATCHES = { count:45, xr:[16,225], zr:[-790,300], radius:[2.5,7], scaleX:[1,1.8], tries:40, segs:18, color:0x72c163 };

/* ------------------------------- TRAILS ------------------------------ */
// Lakefront Trail. MAIN is the DUAL path (paths.js draws an asphalt BIKE
// ribbon on this centerline + a parallel crushed-limestone WALKING ribbon
// offset one grass-strip to its side). It runs the whole map: south lawn ->
// AIDS garden -> down the harbor's WEST inner park -> touches the basin north
// shore (SPUR branches here) -> jogs WEST up the Bird Sanctuary's west fence
// (x100) passing x~91 -> bends around its NW corner and crosses the corridor
// between the golf (south fence z-440) and the sanctuary (north fence z-420)
// -> up the LAKE side of the golf (east of the golf fence x205, west of the
// revetment). Everything keeps >=1.2 m clearance to every fence. SPUR is the
// peninsula access route only: it leaves MAIN at the basin north shore, skirts
// NORTH of the dog-beach cove (NO ribbon on the sand) and runs out the
// peninsula to the pier. LOOP is a little garden loop; CONNECTOR joins the
// (moved) Belmont underpass mouth to the loop's west edge.
// TRAIL_MAIN stays the BIKE centerline (mainCurve/pathSamples contract).
export const TRAIL_MAIN=[
  // SOUTH TERMINUS: hugs ~10 m inland of the CURVED corner revetment top, from the
  // SW terminus (map's south edge / future Diversey-Lincoln Park gate) around the
  // point (passing ~8 m NE of the Chevron at 96,372) back to the east-facing rocks.
  [55,395],[62,389],[76,385],[92,379],[108,371],[124,362],[135,353],[141,346],[139,325],
  // south section HUGS the shoreline ~8-12 m inland of the Belmont Rocks
  // revetment top (x~148-153), curving around the point, then bends back
  // WEST to skim the AIDS-garden circle TANGENTIALLY on its EAST edge (x~111)
  // — a Y where riders can peel onto the loop (never slicing its interior).
  [137,306],[138,258],[137,208],[132,172],[122,146],
  [113,132],[112,120],[111,106],
  [104,55],[90,15],[75,-5],
  [58,-45],[48,-95],[44,-150],
  [45,-205],[48,-258],[54,-300],
  [62,-325],[74,-340],                              // basin NW — SPUR branches at [74,-340]
  [86,-352],[90,-366],                              // onto the sanctuary's west side
  [90,-388],[90,-410],                              // west run (bike x90; walk ribbon +4 east of the fence x100)
  [91,-427],                                        // NW-corner sweep (bowed clear of the sanctuary NW corner)
  [106,-433],[145,-433],[182,-432],[205,-431],      // corridor east run (south of golf z-440, north of sanctuary z-420)
  [211,-448],                                       // reach the golf lake side
  [211,-540],[211,-660],[211,-782],
];
export const TRAIL_SPUR=[
  [74,-340],[86,-344],[100,-346],[112,-345],        // skirt NORTH of the dog-beach cove (no ribbon on the sand)
  [126,-340],[142,-333],[154,-329],[158,-327],      // to the peninsula north root (~158,-326)
  [164,-315],[170,-280],[178,-215],[184,-150],[190,-95],[192,-48],   // down the peninsula to the pier/tip
];
// AIDS-garden plaza LOOP: a CLEAN circle (r=16) centred on the Keith Haring
// sculpture (95,120). Even 8-point ring (repeat the first to close) so the
// CatmullRom reads as a true circle. WEST point (79,120) = the connector's
// T-junction; EAST point (111,120) = where MAIN skims tangentially.
export const TRAIL_LOOP=[
  [111,120],[106.3,131.3],[95,136],[83.7,131.3],
  [79,120],[83.7,108.7],[95,104],[106.3,108.7],[111,120],
];
// paved connector: the (moved) Belmont underpass mouth (~14,105) east to the
// LOOP's WEST point (79,120) — a clean radial T-junction, no crossing through.
// Styled like the loop (crushed limestone).
export const TRAIL_CONNECTOR=[[16,105],[34,108],[54,112],[70,116],[79,120]];
// Dual-path styling. walkOff (paths.js) = bike/2 + gap + walk/2 = 4.0 m, so
// the two ribbons run parallel with a ~1.2 m grass strip between them.
export const TRAIL_STYLE = {
  bike:{ width:3.2, color:0x83878d, y:0.05 },     // asphalt bike path (mainCurve centerline)
  walk:{ width:2.4, color:0xd9c9ac, y:0.062 },    // crushed-limestone walking path (walkCurve) — ABOVE bike/spur y so crossings (e.g. the spur branch at [74,-340]) layer cleanly instead of z-fighting
  gap:1.2,                                         // grass strip between bike & walk
  spur:{ width:2.6, color:0x83878d, y:0.05 },      // single asphalt connector (fits the cove gates)
  loop:{ width:2.2, color:0xd9c9ac, y:0.06 },      // little garden loop (crushed limestone)
  dash:{ spacing:2.8, w:0.14, len:1.1, color:0xe6c458, y:0.075 },  // yellow center dashes (bike + spur only)
};

/* ------------------------------- ZONES ------------------------------- */
export const ZONES=[
  {n:'AIDS Garden Chicago',  x:95,  z:120,  r:34},
  {n:'The Belmont Rocks',    x:150, z:150,  r:36},
  {n:'Diversey Point',       x:100, z:378,  r:34},
  {n:'Belmont Harbor',       x:120, z:-170, r:60},
  {n:'Harbor Pier',          x:205, z:-105, r:16},
  {n:'Yacht Club',           x:70,  z:-180, r:16},
  {n:'Dog Beach',            x:100, z:-336, r:18},
  {n:'Kwanusila',            x:30,  z:-370, r:12},
  {n:'Bird Sanctuary',       x:150, z:-388, r:52},
  {n:'Waveland Fieldhouse',  x:186, z:-478, r:22},
  {n:'Marovitz Golf Course', x:150, z:-610, r:90},
];

// player + camera start (on the Belmont Rocks, camera behind/south), clamp
export const SPAWN = { player:{ x:150, z:150 }, camera:{ x:150, y:4.5, z:172 } };
export const WORLD_CLAMP = { xMin:14, xMax:244, zMin:-822, zMax:408 };   // zMax 408: reaches the new south lawn + pier tip (z406) but well short of the skyline billboard (z504+)

/* ------------------------------- PROPS ------------------------------- */

// trees — scattered across the park (excluding garden / paths / dog-beach
// cove / harbor water via pip), a few hand-placed on the peninsula, and the
// dense Bird Sanctuary grove (TREES.north).
export const TREES = {
  count:150, guard:14000,
  region:{ xr:[16,210], zr:[-400,300] },
  garden:{ x0:60, x1:130, z0:55, z1:185 },
  nearPathD2:16,
  dogBeach:{ xMin:86, zMax:-326, zMin:-348 },   // x>xMin && z<zMax && z>zMin
  minGapD2:60,
  scale:[1.0,1.8], pinkProb:0.16,
  fixed:[   // peninsula (walkable, treed)
    [172,-60,1.1,false],[178,-110,1.0,true],[182,-160,1.05,false],
    [176,-210,1.0,false],[185,-260,0.95,true],[170,-300,1.1,false],
    [190,-90,0.9,false],[168,-140,1.0,true],
  ],
  north:{ count:64, xr:[104,196], zr:[-417,-359], scale:[1.6,2.6], pinkProb:0.1 },   // Bird Sanctuary grove (lakeside block)
};

// perimeter hedges: west fence line at x = 14 (inner edge of the LSD berm,
// with gaps at the three underpasses), north cap, partial south cap.
export const HEDGES = {
  // west-fence gaps line up with the three underpasses (Belmont MOVED to z105,
  // so its gap moved to [95,115] — this also clears the paved CONNECTOR that
  // leaves the underpass mouth at (16,105); Addison z-400, Irving Park z-800).
  west:{ x:14, z0:-812, z1:412, step:5.5, gaps:[[95,115],[-410,-390],[-810,-790]] },   // west perimeter now runs to the new SW corner
  north:{ z:-812, x0:14, x1:232, step:5.5 },
  cap:{ z:406, x0:14, x1:34, step:5.5 },   // SW corner cap only (x14-34): the rest of the south edge is now the curved shoreline, and x>34 is open lawn/trail down to the revetment
  scale:[3,2.2,2.8], y:1.1, color:0x4c9a55,
};

// dense little grass tufts across the whole park
export const TUFTS = { count:1600, guard:26000, xr:[16,230], zr:[-800,300], scaleY:[0.7,1.6], color:0x66bd5e };

// AIDS Garden Chicago — flower beds (x 60-130, z 60-180)
export const GARDEN = {
  beds:[[70,75],[85,90],[100,80],[115,95],[75,120],[95,130],[112,135],[80,155],[100,165],[120,160],[90,110]],
  colors:[0xff9ec7,0xffd166,0xc3a8ff,0xff7b9c,0x9ef2c0,0xffffff],
  count:220, bedCount:220, bedRadius:3.2, trailJitter:4, fallback:[95,120], scale:[0.8,1.35],
};
// green Keith Haring self-portrait figure at the garden (30 ft)
export const HARING = { pos:[95,0,120], scale:1.7, ry:-1.7, collide:3.4 };

// summer life on the rocks: towels, umbrellas, coolers, loose blocks
export const BEACH_LIFE = {
  towelColors:[0xff6b6b,0x4ecdc4,0xffd93d,0x6c5ce7,0xff9ff3,0x54a0ff],
  towel:{ zMin:20, zMax:280, step:3.2, skipProb:0.5, offFrac:[0.3,0.7] },
  umbrellaColors:[0xff6b6b,0xffd93d,0x54a0ff,0xff9ff3],
  umbrella:{ count:14, jitter:1, tilt:0.16, yOff:-0.04, collide:0.35 },
  coolerColors:[0xd94f4f,0x4f7dd9],
  cooler:{ count:10, jitter:1.2, yOff:0.2 },
  block:{ count:20, zMin:20, zMax:280, offFrac:[0.2,0.8], yOff:0.28, collide:0.8 },
};

// inner-tube floaties + one swan floaty off the rocks
export const FLOATIES = { colors:[0xff9ec7,0x9ef2c0,0xffd98a,0x9edcff], count:16, zMin:20, zMax:280, offRange:[2.5,10] };
export const SWAN = { x:170, z:110, yOff:0.28, ph:3, ryRange:[0,6] };

// the roaming "drifter" out in the lake, moored lake boats, mouth buoys.
// (basin sailboats live in the finger-dock slips + the moorings pack.)
export const BOATS = [
  { x:220, z:100,  ry:0.8,  hull:0xf7f3ea, sail:0xffffff, scale:1.2 },
  { x:210, z:-60,  ry:-0.6, hull:0x7fc8f0, sail:0xffd98a, scale:1.25 },
];
export const DRIFTER = { x:238, z:70, ry:Math.PI, hull:0xf7f3ea, sail:0xff9d94, scale:1.3 };
// mouth channel markers, red-right-returning (entering from the lake, red on
// the peninsula-tip side). Mid-CHANNEL: the tip terraces reach ~(176,-5) and the
// mouth-shore terraces ~(134,-10), so both floats sit in clear water — they were
// beached against the revetment feet (the user's 'mystery cone in the water').
export const BUOYS = [ { x:168, z:-2, c:0xff5a5a }, { x:152, z:-2, c:0x5db06b } ];

// finger docks along the west seawall (4 groups, z -300..-60) — narrow
// plank walkways jutting east into the basin, two moored sailboats each.
export const FINGER_DOCKS = {
  x0:78, len:13, halfW:0.9, h:0.42,
  rows:[-75,-140,-205,-275],                       // 4 dock groups along the west shore
  boat:{ scale:0.7, xMid:89, dz:2.6 },
  hulls:[0xf7f3ea,0xff9d94,0x7fc8f0,0xfbe3a0,0xbfe0b0,0xffd0a0,0xf0d0e0,0x9edcff,0xf3e0c0,0xffb1c9,0xcfe8f7,0xf7f3ea],
  sails:[0xffffff,0xffd98a,0x9edcff,0xffb1c9,0xffffff,0xe0c0f0,0xffffff,0xffd98a,0x9edcff,0xffffff,0xffb1c9,0xffffff],
};

// wooden signs (text + placement); the three underpass gag signs live in
// the inner park just east of the LSD berm.
export const SIGNS = [
  { text:'AIDS GARDEN',         x:95,  z:60,   ry:0.4 },
  { text:'BELMONT HARBOR',      x:78,  z:-30,  ry:Math.PI/2 },
  { text:'DOG BEACH',           x:103, z:-343, ry:3.0 },            // on the GRASS north of the cove (between fence z-341 and the trail spur), facing the trail — was standing in the sand at the waterline
  { text:'BIRD SANCTUARY',      x:98,  z:-386, ry:-1.4 },          // by the WEST gate; nudged east of the walk ribbon (x~94)
  { text:'WAVELAND FIELDHOUSE', x:202, z:-470, ry:1.3 },           // trail side of the lakeside fieldhouse
  { text:'YACHT CLUB',          x:70,  z:-168, ry:-0.6 },
  { text:'WAVELAND TENNIS COURTS', x:83, z:-403, ry:-1.9 },        // SE corner, facing the trail approach
  { text:'DIVERSEY RANGE & MINI GOLF', x:30, z:285, ry:0.5 },      // SW of the range, facing the park
  { text:'FUTURE ENTRANCE →',   x:15,  z:113,  ry:-Math.PI/2 },    // Belmont underpass (moved to z105); beside the connector mouth, off the ribbon
  { text:'FUTURE ENTRANCE →',   x:16,  z:-394, ry:-Math.PI/2 },   // Addison underpass
  { text:'FUTURE ENTRANCE →',   x:16,  z:-794, ry:-Math.PI/2 },   // Irving Park underpass
];

// path lamps along the main trail (trail-t + side) plus one pier lamp.
// ALL on side -1 (the RIGHT normal = the bike-only side; the crushed-limestone
// WALK ribbon runs on the +1/left normal at a 4.0 m offset). At offset 2.8 a
// -1 lamp clears the 3.2 m bike ribbon by 1.2 m and never touches the walk
// ribbon — keeping every lamp off BOTH ribbons (prop-vs-trail audit, Job 5).
export const LAMPS = {
  trail:[[0.06,-1],[0.14,-1],[0.22,-1],[0.30,-1],[0.38,-1],[0.46,-1],[0.54,-1],[0.62,-1],[0.70,-1],[0.78,-1],[0.86,-1],[0.93,-1]],
  offset:2.8,
  extra:[[205,-105],[121,404]],   // peninsula pier lamp + the corner pier's tip lamp
};

// benches (each becomes a "sit for a bit" interaction via the framework)
// NOTE: parkcharm.js places the CPD benches along the trail with clearance —
// these few are hand-set accents WELL AWAY from every ribbon.
export const BENCHES = [
  { x:102, z:129,  ry:-2.4 },        // inside the Haring circle lawn, facing the statue (nudged in to clear the r=16 loop ribbon)
  { x:30,  z:-90,  ry:-Math.PI/2 },  // west lawn
  { x:55,  z:230,  ry:-Math.PI/2 },  // south lawn
  { x:210, z:-110, ry:Math.PI },     // peninsula pier deck
];

// pier plank decks (peninsula lake side + the new corner pier) with walkable rects.
// Corner pier: x116-126, jutting SOUTH toward the skyline. Its NW corner lands on
// the revetment TOP edge (the corner top runs z378 at x116 -> z372 at x126, so the
// deck's north edge z373 rests on the top/lawn there and connects to walkable land);
// the REST spans OPEN WATER — the revetment terrace is carved away beneath+beside
// the deck (PIER_CHANNEL, a slip), so the pier stands on posts over the lake instead
// of floating over the descending steps (the reference photo: a pier starts at the
// top edge and immediately juts over water). Water flanks both rails. Tip z406 stays
// inside WORLD_CLAMP.zMax (408).
export const DECKS = [
  { deck:[200,216,-120,-90,0.42], walk:{ x1:200, x2:216, z1:-120.5, z2:-89.5, h:0.42 } },
  { deck:[116,126,373,406,0.42],  walk:{ x1:116, x2:126, z1:372.5, z2:406.5, h:0.42 } },
];

// The corner pier's SLIP: the revetment terrace is carved to OPEN WATER within this
// x-band, everywhere SEAWARD of the revetment top edge (north boundary = the top-edge
// line topZ0@x0 -> topZ1@x1, so no lawn is carved). coast.js skips terrace slabs +
// sheet-piles here and coastQuery returns water, so the deck spans water (its own walk
// rect keeps the planks walkable). Band = the deck (x116-126) + a west flank (x113-116):
// the revetment curves AWAY to the SW here, so open water reads on the pier's west +
// south; EAST of the deck the revetment WRAPS on (promenade abuts the east rail, per the
// corner walkprobe). Near the TIP both flanks are water anyway (corner-promenade taper).
// zMax past the tip so the tip flanks are water too.
export const PIER_CHANNEL = { x0:113, x1:126, topZ0:380, topZ1:372.5, zMax:411 };

// harbor entrance light at the peninsula's SOUTH TIP (the aerial's entrance marker):
// a short white tower, a red cap, and a warm glow bulb — sits on the tip's top step
// (tier 0, y~0). Built data-driven in coast.js (buildCoast), no rng, 3 meshes.
export const HARBOR_LIGHT = { pos:[176,-20], towerH:2.4, r:0.42, white:0xf2ece0, red:0xd23b34, glow:0xffd98a };

// harbor house (west shore lawn), Kwanusila totem, dog-beach props
export const HARBOR_HOUSE = { pos:[60,0,-100], collide:4.6 };
export const KWANUSILA    = { pos:[30,0,-370], scale:1.6, collide:1.6 };
export const DOG_PROPS = {
  ball:{ x:104, z:-336, yOff:0.44, collide:0.55 },
  pail:{ x:96,  z:-338, yOff:0.24 },
  dog: { x:100, z:-335, ry:2.4, collide:0.6 },
};

/* ---------------------------- STRUCTURES ----------------------------- */
// Lake Shore Drive — low grass berm (x 0-14, NOT walkable; it sits outside
// the LAND polygon) with a paler 8-lane road ribbon on top, and three
// underpass portals (short tunnel mouths + FUTURE ENTRANCE signs) at
// Belmont z 0, Addison z -400, Irving Park z -800. Toon cars slide N/S in
// the `lsd.js` content pack; the static berm/road/portals build here.
export const LSD = {
  berm:{ x0:0, x1:14, z0:-846, z1:418, h:1.0, color:0x6f9e5c },   // z1 418: berm/road extend past the new south lawn so the west edge reads continuous
  road:{ x0:2.5, x1:11.5, y:1.02, color:0x8f9298 },
  lane:{ color:0xf2ede0, w:0.16, len:2.4, gap:3.2, count:7 },   // dashed center lines
  underpasses:[105, -400, -800],                               // Belmont stop moved to z105 (on the AIDS-garden/statue axis)
  portal:{ w:7, h:4.2, recess:0x211f22, arch:0xd8cbb0 },
};

// Waveland clock-tower fieldhouse (warm brick over a limestone plinth,
// quoined corners, arched windows, gabled copper roof, tall square clock
// tower with faces on all four sides — west reads from the park). Hands are
// set to real local time at load. Lakeside, just inside the golf's SE at
// (186,-478); ry = +PI/2 presents the tower corner NE, toward the trail.
export const FIELDHOUSE = {
  pos:[186,0,-478], ry:Math.PI/2,
  body:{ w:11, d:8, h:6.6 },
  wing:{ w:6, d:6.4, h:4.4, off:-8 },                 // lower west wing (off = x from body centre)
  brick:0xa9614b, trim:0xead9bd, roof:0x527f6d,
  stone:0x9a938a,
  tower:{ w:3.6, h:18, off:[3.2,3.4], roofH:3.4 },
  clock:{ face:0xf6efdd, r:1.15 },
  collide:7.5,
};

// small yacht-club building on the harbor's west shore lawn (70,-180),
// white clapboard, blue trim, hipped roof, burgee pole toward the basin.
export const YACHT_CLUB = {
  pos:[70,0,-180], ry:-0.6,
  body:{ w:7.6, d:6.2, h:5.4 },
  wall:0xfbf7ee, trim:0x2f6fb0, roof:0x2f6fb0, burgee:0xd94f4f,
  collide:4.8,
};

// John Henry's 'Chevron' — a tall BLUE steel sculpture on the south-corner lawn,
// behind the curved revetment (reads like a post-modern windmill against the sky).
// A low concrete pad; 3 slender square-section columns leaning together into a
// tripod mast ~9.5 m tall; and 5 flat blade arms bursting asymmetrically from the
// masthead like a windmill sail. Builder buildChevron() in structures.js (no rng).
// Each arm: [dirX, dirY, dirZ, length, width]; dir is the ray out of the masthead.
export const CHEVRON = {
  pos:[96,0,372], color:0x2f63d0,
  pad:{ r:2.4, h:0.3, color:0xbdb8ae },
  colThick:0.34, baseSpread:1.5, apex:[0,9.2,0],   // 3 columns from a triangle base up to the apex
  arms:[
    [-0.62, 0.66, 0.12, 5.4, 0.95],
    [ 0.70, 0.52,-0.18, 4.6, 0.85],
    [-0.80, 0.20, 0.30, 5.0, 0.85],
    [ 0.86, 0.30, 0.22, 4.2, 0.80],
    [ 0.08, 0.84,-0.46, 4.9, 0.95],
  ],
  collide:2.2,
};

// Sydney R. Marovitz golf course — a fenced green strip along the lake
// (x 60-205, z -790..-440; ~145 x 350 m). Holes 1-3 are the playable ones
// near the south entrance; 4-9 are visual dressing. Trail + revetment are
// on the lake side (east), so the fence is west/south/north only. South edge
// pulled north to z-440 so the Bird Sanctuary (z-420..-357) sits south of it,
// with a trail corridor (z-440..-420) between the two fences.
export const GOLF = {
  bounds:{ x0:60, x1:205, z0:-790, z1:-440 },   // east edge x205 (lake-side trail runs east of it); south edge z-440 (corridor to the sanctuary)
  fairway:0x83c86a, green:0x5fa851, sand:0xe9d9a6,
  pins:[
    [95,-452],[110,-468],[125,-448],                  // holes 1-3 (south, playable — all inside the fence)
    [140,-500],[165,-540],[150,-590],
    [180,-640],[120,-690],[160,-740],                 // 4-9 (dressing)
  ],
  bunkers:[
    [105,-470,3.2],[130,-520,2.8],[155,-575,2.6],
    [170,-630,3.0],[110,-670,2.4],[145,-720,2.8],
  ],
  flag:0xff5a5a, greenR:2.6,
  fence:{ color:0xe6ebe4, postH:1.0, spacing:2.6 },
};

// Bill Jarvis Bird Sanctuary — fenced woodland on the lakefront strip, south
// of the golf and north of the harbor (x 100-200, z -420..-357; 100 x 63 m),
// dense understory, one gate on the WEST fence by the trail's jog-west.
export const SANCTUARY = {
  bounds:{ x0:100, x1:200, z0:-420, z1:-357 },  // lakeside block: golf is north (z-440), harbor is south
  gate:{ x0:99, x1:101, z0:-394, z1:-382 },     // gap in the WEST fence (x100), facing the trail
  fence:{ color:0x6d5a3a, postH:1.2, spacing:2.6 },
  understory:{ count:120, colors:[0x2f6b3a,0x3c7a44,0x27512f,0x356e3e], scale:[0.7,1.6], guard:3000 },
};

// low fence ringing the dog-beach cove's landward sides (N/E/W), gates on
// BOTH the west and east sides so the trail spur passes through; the south
// side is open to the water.
export const DOG_FENCE = {
  lines:[
    [[88,-328],[88,-341]],     // west (gate)
    [[88,-341],[112,-341]],    // north (landward, z-341)
    [[112,-341],[112,-328]],   // east (gate)
  ],
  gates:[ { x0:87,  x1:89,  z0:-338, z1:-332 },
          { x0:111, x1:113, z0:-336, z1:-330 } ],
  color:0xc9a97a, postH:0.9, spacing:2.0,
};

// Lincoln Park WAVELAND TENNIS COURTS — a 2x2 block of 4 courts in the inland
// band SOUTH of Marovitz golf (south fence z-440) and WEST of the Bird
// Sanctuary (west fence x100). NOTE: the task's suggested east edge (x94) is
// bisected by the Lakefront Trail's sanctuary-side run (bike x90 + walk ribbon
// x94), so the block is shifted WEST to x60-85 — its east fence (x85) clears
// the bike ribbon's west edge (x88.4) by ~3.4 m and the sanctuary fence by far
// more. Courts: 2 columns (cx 68,79) x 2 rows (cz -426,-412); slab 10(x)x11(z),
// net across mid-length at z=cz. Fence shares the global instanced fence mesh.
export const TENNIS = {
  block:{ x0:59, x1:84, z0:-432, z1:-406 },        // outer fence rect (east edge x84 clears the bike ribbon's westward corner bow at x~89.5 by ~3.9 m)
  courts:[ [67,-426],[78,-426],[67,-412],[78,-412] ],
  court:{ w:10, d:11 },                            // slab: w along x (width), d along z (length)
  net:{ h:0.95, postH:1.05 },
  gate:{ x0:69, x1:74, z0:-407, z1:-405 },         // one gate on the SOUTH fence
  fence:{ color:0x6f8a63, postH:1.1, spacing:2.4 },
  slab:0x4a9d5b, line:0xf2f2e6, netColor:0x38382f,
};

// DIVERSEY DRIVING RANGE & MINI GOLF — south-end inland attraction (real:
// inland, west of the trail). Green range strip x28-88, z242-283 (fenced on
// its W/N/E, open at the south tee line), 4 tee mats, 3 distance boards,
// ~30 scattered balls downrange, a ball bucket; a mini-golf corner (x70-88,
// z286-306) with 3 whimsical holes (STATIC windmill — registerUpdate isn't
// available in builders and packs are out of scope here — a loop ramp, and a
// tiny Waveland clock-tower replica) on felt fairways with wood rails.
export const DIVERSEY = {
  range:{ x0:28, x1:88, z0:242, z1:283 },
  green:0x59b356,
  fence:{ color:0xd7cfbe, postH:1.05, spacing:2.8 },   // W + N + E (south/tee side open)
  tees:{ xs:[36,48,60,72], z:279, w:2.4, d:1.7, color:0x2f6b3a },
  balls:{ count:30, x0:30, x1:86, z0:246, z1:275, color:0xf6f6ee },
  boards:[ ['50',34,266],['100',34,257],['150',34,248] ],   // distance markers down the west edge
  bucket:{ x:76, z:281, color:0x9aa0a6, ball:0xffffff },
  mini:{
    x0:70, x1:88, z0:286, z1:306,
    felt:0x3fae5f, rail:0xb07a46, cup:0x2a2a2a,
    holes:[
      { type:'windmill', x:75, z:291 },
      { type:'loop',     x:83, z:293 },
      { type:'tower',    x:78, z:301 },
    ],
  },
};

/* ----------------------------- LANDMARKS ----------------------------- */
// named skyline towers (positions / dims only; the silhouette itself is
// generic-Chicago and stays in sky.js). Due south, well beyond the map.
export const SKYLINE_TOWERS = {
  willis:  { steps:[[22,50],[16,72],[10,94]], x:60, z:560, antennaX:[56,64], antennaY:99, antennaZ:560 },
  hancock: { rBot:5.5, rTop:10.5, h:76, x:150, y:33, z:570, antennaX:[146,154], antennaY:79, antennaZ:570 },
};

/* -------------------------------- MAP -------------------------------- */
// minimap world->canvas mapping and landmark dots. The world is very tall
// now (z -850..320); px/unit is kept near-uniform (mild ~1.5x horizontal
// spread for legibility) so shapes read true and the open lake letterboxes.
export const MAP = { x0:-170, z0:-850, w:576, h:1275, cw:304, ch:412 };   // h 1170->1275 so the new south lawn/corner (to z~415) fits; ch/cw unchanged (canvas keeps its aspect, the tall map just packs a touch tighter vertically)
export const MAP_GOLF = { x0:60, x1:205, z0:-790, z1:-440, color:'#8fce74' };
export const MAP_LANDMARKS = [
  { x:60,  z:-100, c:'#d0705c', r:6 },   // harbor house
  { x:30,  z:-370, c:'#e0b13e', r:5 },   // Kwanusila
  { x:95,  z:120,  c:'#37a457', r:5 },   // AIDS garden
  { x:205, z:-105, c:'#8f6234', r:5 },   // pier
  { x:70,  z:-180, c:'#5a86c4', r:5 },   // yacht club
  { x:186, z:-478, c:'#9a8b78', r:6 },   // Waveland fieldhouse (lakeside, golf SE)
  { x:150, z:-610, c:'#4f9b46', r:6 },   // golf
  { x:96,  z:372,  c:'#2f63d0', r:5 },   // Chevron sculpture (south lawn)
  { x:121, z:400,  c:'#8f6234', r:4 },   // corner pier
];
