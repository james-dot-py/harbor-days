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
export const COAST_PEN_PARAMS  = { z0:-25, z1:-330, fx:z=>196+4*Math.sin(Math.PI*(z+330)/305)+Math.sin(z*0.058+0.8)*1.2+Math.sin(z*0.101+2.1)*0.7 };  // east peninsula lake edge — TEARDROP (addison harbor.png): narrow at the root/tip (~196), swelling +4 mid-length (peak ~x200 @ z-177), small octaves for the organic read
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

// ---- MONTROSE north growth (v0.6, task 069): the STUB SHORE ----------------
// Five plain-revetment pieces continuing the golf revetment north to the map
// edge. Each is kept OUT of the shared COAST_SEGS (props.js beach-life iterates
// that with the WORLD rng — appending there moves every towel): coast.js +
// walkprobe append them to QUERY_SEGS (walkability) and coast.js folds their
// terraces/piles/faces into the EXISTING buckets with a LOCAL xorshift (zero new
// InstancedMesh buckets, zero shared-rng draws — the COAST_TIP precedent). They
// are SEPARATE consts so 070-072 swap one piece (harbor basin / Point / beach
// sand) without touching the others' arrays. One shared gentle meander (x ~231-
// 237, well under xMax 244) keeps the whole shore continuous; TIER_DEFAULT
// (4 steps) applies since every z here is outside the Rocks band (zMin 20).
export const montroseFx = z => 234 + Math.sin(z*0.016)*2.2 + Math.sin(z*0.041+0.7)*1.3;
export const COAST_MTR_LAWN_PARAMS   = { z0:-800,  z1:-1088, fx:montroseFx };  // honest shore south of the harbor mouth (ships as-is)
export const COAST_MTR_HARBOR_PARAMS = { z0:-1091, z1:-1300, fx:montroseFx };  // 070 carves the Montrose Harbor basin here
export const COAST_MTR_POINT_PARAMS  = { z0:-1303, z1:-1362, fx:montroseFx };  // 071 pushes Montrose Point + the Magic Hedge east
export const COAST_MTR_BEACH_PARAMS  = { z0:-1365, z1:-1500, fx:montroseFx };  // 072 lays Montrose Beach sand + the dunes here
// NE-corner map-edge closure: the revetment wraps from the beach's north end
// (matches COAST_MTR_BEACH's last point) west into the north-cap hedge line. A
// polyline (not fx(z)); coast.js densifies it. Ordered shore->west so the terrace
// normal points N/NE into the edge water.
export const COAST_MTR_CLOSE_PTS = [[montroseFx(-1500),-1500],[233,-1506],[228,-1510],[217,-1513],[201,-1514.5]];

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
export function buildLAND({ COAST_CORNER, COAST_MAIN, COAST_PEN, COAST_GOLF, COAST_MOUTH, BASIN_W,
                            COAST_MTR_LAWN, COAST_MTR_HARBOR, COAST_MTR_POINT, COAST_MTR_BEACH, COAST_MTR_CLOSE }){
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
  // MONTROSE north growth (v0.6): the stub revetment continues the shore north
  // from the golf's end (~232,-800) to the map edge. Each piece is separate so
  // 070-072 replace one (harbor basin / Point / beach) without touching the rest.
  P.push(...COAST_MTR_LAWN);                                // shore south of the harbor mouth
  P.push(...COAST_MTR_HARBOR);                              // 070: Montrose Harbor basin
  P.push(...COAST_MTR_POINT);                               // 071: Montrose Point + Magic Hedge
  P.push(...COAST_MTR_BEACH);                               // 072: Montrose Beach + dunes
  P.push(...COAST_MTR_CLOSE);                               // NE-corner closure (~201,-1514.5)
  P.push([14,-1516]);                                       // north edge (west end; north-cap hedge)
  P.push([14,-812],[14,-400],[14,0]);                      // west park edge (closes to [14,415])
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
// MONTROSE north growth: a SECOND water plane covering the new north stretch
// (the main WATER plane's north edge is only z -1085). Kept SEPARATE (not a
// resized WATER) so the existing lake surface — including the spawn view — stays
// BIT-IDENTICAL for the determinism gate. Built with the same living-water mat +
// aShore in coast.js; overlaps the main plane in z -1000..-1085 and sits 0.02 m
// LOWER so the existing plane wins there (no z-fight, no seam). Frustum-culled
// (a lone Mesh) so it costs 0 draws in any view not looking at the far north.
export const WATER_N = { size:1000, seg:84, cx:190, cz:-1500, yOff:-0.02 };

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
  // SOUTH SECTION (aerial-canonical, per Downloads/harbor aerial.png): the real
  // Lakefront Trail on the whole Diversey->Belmont stretch runs BESIDE LAKE
  // SHORE DRIVE, not the shore. South terminus beside the berm (~30,406 — the
  // future Diversey-Lincoln Park gate), straight north past the Diversey
  // range's WEST fence (bike x~20, walk ribbon +4 park-side => >=2.8 m fence
  // clearance), then angling NE across the lawn to skim the AIDS-garden circle
  // TANGENTIALLY on its EAST edge (111,120) — the Y onto the loop. The wide
  // south lawns / corner revetment / Chevron / pier all lie EAST of the trail;
  // people cross the grass to the rocks, as in the aerial.
  [30,406],[25,390],[22,366],[20.5,338],[19.5,306],[19.5,272],[19.5,238],[20,210],[27,190],
  [36,178],[50,172],[66,168],[82,162],[96,152],[106,138],[112,120],[111,106],
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
  // aerial-canonical (Downloads/addison harbor.png): the spit road enters
  // INLAND at the root (set ~6-9 m north of the basin shore — it was hugging
  // the seawall at z-327..-329) and runs down the spit's SPINE with the treed
  // strip flanking both sides, ending just above the south-tip terraces.
  [74,-340],[86,-344],[100,-346],[112,-345],        // skirt NORTH of the dog-beach cove (no ribbon on the sand)
  [128,-342],[144,-337],[157,-333],                 // set-inland run to the root (shore is z-326..-329 here)
  [166,-323],[173,-305],                            // onto the spit at the root
  [178,-260],[181,-200],[183,-150],[185,-105],      // the SPINE (trees both sides)
  [188,-70],[190,-48],[186,-32],                    // ease toward the tip loop
];
// AIDS-garden plaza LOOP — a TWO-LOBE PEANUT (task 023, per the owner drone
// aerial refs/aids-garden/aerial-path-structure.jpg: the real loop is the
// statue circle plus a larger lawn lobe to its WEST/SW, not a clean circle).
// Outline = union of the statue ring (r16 about 95,120) and the SW lobe (r12
// about 78,134), walked as one closed polyline (first point repeated); the
// CatmullRom rounds the waist into the aerial's pinched figure. BOTH welds
// are preserved exactly: the connector still T-junctions at (79,120) on the
// waist's north arc, MAIN still skims (111,120) tangentially.
export const TRAIL_LOOP=[
  [79.1,122.1],[79.6,115.8],[82.4,110.1],[87.2,106],[93.2,104.1],[99.5,104.7],
  [105.1,107.6],[109.1,112.5],[110.9,118.5],[110.3,124.8],[107.2,130.3],
  [102.3,134.2],[96.2,136],[89.9,135.2],
  [88.6,139.7],[85.6,143.3],[81.5,145.5],[76.8,145.9],[72.4,144.6],
  [68.7,141.6],[66.5,137.5],[66.1,132.9],[67.4,128.4],[70.4,124.7],
  [74.5,122.5],[79.1,122.1],
];
// DETERMINISM BALLAST — the retired r=16 circle. Its ribbonOn-identical
// samples stay registered in pathSamples at the loop's ORIGINAL build slot so
// the tree-rejection scan (props.js nearPath, stride 3) sees a byte-identical
// array: same content, same count, same phase => the shared world rng order
// (trees -> tufts -> towels -> everything) is bit-for-bit unchanged. All NEW
// garden ribbons (the peanut, TRAIL_ENTRANCE) register in pathSamples2 only.
// NEVER delete or reshape this table; it is consumed by paths.js sampleGhost.
export const TRAIL_LOOP_GHOST=[
  [111,120],[106.3,131.3],[95,136],[83.7,131.3],
  [79,120],[83.7,108.7],[95,104],[106.3,108.7],[111,120],
];
// ENTRANCE→LAKE PATH (task 023, the aerial's shore arm; re-routed 2026-07-10
// with the owner's monument re-siting): crushed limestone, leaving the
// monument forecourt pad's east edge and running ENE to the revetment top —
// it stops ~1.7 m short of the lip (COAST_MAIN fx(146.8)≈152.6) so the
// terrace steps stay clean. Registered in pathSamples2 only (see
// TRAIL_LOOP_GHOST note); trees along its out-of-garden stretch are removed
// by a POST-filter in props.js.
export const TRAIL_ENTRANCE=[
  [115,155.6],[123,153.8],[132,151.6],[141,149.4],[150.9,146.8],
];
// paved connector: the (moved) Belmont underpass mouth (~14,105) east to the
// LOOP's WEST point (79,120) — a clean radial T-junction, no crossing through.
// Styled like the loop (crushed limestone).
export const TRAIL_CONNECTOR=[[16,105],[34,108],[54,112],[70,116],[79,120]];
// MONTROSE north growth (v0.6, task 069): the dual Lakefront Trail CONTINUES from
// TRAIL_MAIN's golf-lakeside north end (~211,-782) up the new Montrose lawn toward
// the Point. A NEW ribbon (never reshape TRAIL_MAIN — pathSamples is phase-
// sensitive); paths.js draws it LAST and registers its samples in pathSamples2
// only. Starts ~z-770 (overlapping TRAIL_MAIN's end so the ribbons join with no
// gap) and runs to z-1460, holding x~200-211 (clear of the revetment x~234 and the
// west hedge x14). 070-073 re-route locally as the harbor/Point/beach carve in.
export const TRAIL_MONTROSE=[
  [211,-770],[211,-812],[209,-872],[206,-942],[203,-1012],[202,-1082],
  [201,-1152],[201,-1216],[202,-1286],[205,-1352],[208,-1412],[210,-1460],
];
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

// player + camera start — THE FRONT DOOR (task 023): the player spawns on the
// AIDS Garden entrance forecourt by the monument wall, facing SSW along the
// statue axis (yaw −0.31 → the Haring sculpture at 95,120); the camera rests
// NNE behind, looking over the wall's north end at monument + garden + statue.
// yaw seeds BOTH cam.yaw (main.js) and the mayor's initial facing (character.js).
// OWNER DIRECTION 2026-07-10: spawn on the monument forecourt near the sign,
// FACING THE WATER — due east (+x), the open lawn running to the Belmont
// Rocks steps and the lake. Monument wall front-right of the view, suggestion
// box ahead-right, Divvy dock behind-left across the trail. Camera due west.
export const SPAWN = { player:{ x:109.5, z:156.6 }, yaw:1.57, camera:{ x:87.5, y:4.5, z:156.6 } };
export const WORLD_CLAMP = { xMin:14, xMax:244, zMin:-1520, zMax:408 };   // zMin -1520 (was -822): the MONTROSE north growth (v0.6). zMax 408: the south lawn + pier tip (z406), short of the skyline billboard (z504+)

/* ------------------------------- PROPS ------------------------------- */

// trees — scattered across the park (excluding garden / paths / dog-beach
// cove / harbor water via pip), a few hand-placed on the peninsula, and the
// dense Bird Sanctuary grove (TREES.north).
export const TREES = {
  count:260, guard:24000,   // 150->260: the real park is much more heavily wooded (aerials); guard raised with it
  region:{ xr:[16,210], zr:[-400,300] },
  garden:{ x0:60, x1:130, z0:55, z1:185 },
  nearPathD2:16,
  dogBeach:{ xMin:86, zMax:-326, zMin:-348 },   // x>xMin && z<zMax && z>zMin
  minGapD2:60,
  scale:[1.0,1.8], pinkProb:0.16,
  fixed:[   // the SPIT's treed strip — flanking the spine trail (x~178-186) on BOTH sides, per the aerial
    [172,-60,1.1,false],[178,-110,1.0,true],[182,-160,1.05,false],
    [176,-210,1.0,false],[185,-260,0.95,true],[170,-300,1.1,false],
    [190,-90,0.9,false],[168,-140,1.0,true],
    [174,-240,1.1,false],[189,-235,1.0,false],[175,-180,1.0,true],[191,-172,1.05,false],
    [177,-122,1.1,false],[193,-128,0.95,false],[179,-82,1.0,true],[195,-88,1.05,false],
    [172,-42,1.0,false],[181,-52,0.95,false],[170,-268,1.0,false],[188,-292,1.05,true],
  ],
  north:{ count:92, xr:[104,196], zr:[-417,-359], scale:[1.6,2.6], pinkProb:0.1 },   // Bird Sanctuary grove (lakeside block) — denser per the aerials
};

// perimeter hedges: west fence line at x = 14 (inner edge of the LSD berm,
// with gaps at the three underpasses), north cap, partial south cap.
export const HEDGES = {
  // west-fence gaps line up with the three underpasses (Belmont MOVED to z105,
  // so its gap moved to [95,115] — this also clears the paved CONNECTOR that
  // leaves the underpass mouth at (16,105); Addison z-400, Irving Park z-800).
  west:{ x:14, z0:-1516, z1:412, step:5.5, gaps:[[95,115],[-410,-390],[-810,-790],[-1217,-1197]] },   // z0 -1516: MONTROSE growth; 4th gap = the Montrose underpass (z-1207)
  north:{ z:-1515, x0:14, x1:200, step:5.5 },   // north cap MOVED to the new map edge (was z-812); caps the lawn x14-200, the closure revetment is the shore east of it
  cap:{ z:406, x0:14, x1:23, step:5.5 },   // SW corner cap only (x14-23): the aerial-canonical trail now exits the map at (30,406) — the cap stops short of the gate so the ribbon passes clear
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

// AIDS GARDEN ENTRANCE MONUMENT (task 023, owner reference
// refs/aids-garden/entrance-monument-sign.jpg + owner live direction
// 2026-07-10): the real monument wall — the game's ONE AND ONLY 'AIDS Garden'
// signage, and the spawn's first read. OWNER SITING: near the garden Divvy
// dock (95,145) at the garden's south, the player spawning on its forecourt
// FACING THE WATER (east). The wall runs E–W (long axis x), lettered NORTH
// face toward the lawn/trail-bend approach: gold 'AIDS Garden Chicago'
// letters EAST-biased, bronze ginkgo-leaf plaques (ONE merged geometry — a
// quiet scatter; names illegible at toon scale, which is right), the rough
// granite boulder leaning mid-span WEST of the letter band (owner: it must
// never cover the 'A'), two white limestone sitting blocks on a
// decomposed-granite forecourt pad north of the wall. Prairie flanks build in
// props.js (prairie centers); the globe lamp behind is LAMPS.extra. Builder:
// buildEntranceMonument() in structures.js — zero shared rng (local xorshift).
// Colors sit ~1 stop darker than the photo reads: the toon ramp + warm dusk
// light lift them (the first pass read cream/pink, not grey concrete).
export const ENTRANCE = {
  wall:{ x0:102.8, x1:116, z:160.2, t:0.55, h:1.55, color:0x706e69 },
  letters:{ text:'AIDS Garden Chicago', gold:'#caa04c', xc:111.4, w:7.4, h:0.62, y:1.02 },
  plaques:{ n:34, bronze:0x5f4a2b, xr:[103.6,115.4], yr:[0.32,1.32], letterX0:107.7 },   // scatter the north face; sparser over the letter band (x>letterX0, y>0.72)
  boulder:{ x:105.6, z:159.2, color:0x8a867d },                    // leans on the wall mid-span, WEST of the letters
  blocks:[ { x:107.3, z:157.2, w:1.9,  h:0.52, d:0.95, ry:0.22 },  // white limestone sitting blocks
           { x:112.8, z:157.8, w:1.55, h:0.46, d:1.35, ry:-0.18 } ],
  blockColor:0xe8e2d4,
  pad:{ x:110, z:157.1, rx:6.6, rz:2.8, y:0.045, color:0x92907f },  // decomposed-granite forecourt (tufts zero-scaled under it, props.js)
};

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

// finger docks along the west seawall (4 groups, z -300..-60) — narrow plank
// boardwalks that root FLUSH with the shore lawn and reach east over the basin,
// two moored sailboats each. The deck y is DERIVED in props.js from the shore
// grade (SEAWALL_Y.top) so a coast reshape carries the docks with it — never a
// hardcoded height that could float above the grass (issue 016 / task 038).
export const FINGER_DOCKS = {
  x0:78, len:13, halfW:0.9,
  rows:[-75,-140,-205,-275],                       // 4 dock groups along the west shore
  boat:{ scale:0.7, xMid:89, dz:2.6 },
  hulls:[0xf7f3ea,0xff9d94,0x7fc8f0,0xfbe3a0,0xbfe0b0,0xffd0a0,0xf0d0e0,0x9edcff,0xf3e0c0,0xffb1c9,0xcfe8f7,0xf7f3ea],
  sails:[0xffffff,0xffd98a,0x9edcff,0xffb1c9,0xffffff,0xe0c0f0,0xffffff,0xffd98a,0x9edcff,0xffffff,0xffb1c9,0xffffff],
};

// wooden signs (text + placement).
// (task 023: the 'AIDS GARDEN' plate was removed — the entrance monument
// (ENTRANCE, structures.js) is the ONE AND ONLY AIDS Garden signage.)
// (task 030: the three 'FUTURE ENTRANCE →' underpass gag signs were removed
// per owner feedback — the LSD underpass portals (structures.js) stay.)
export const SIGNS = [
  { text:'BELMONT HARBOR',      x:78,  z:-30,  ry:Math.PI/2 },
  { text:'DOG BEACH',           x:103, z:-343, ry:3.0 },            // on the GRASS north of the cove (between fence z-341 and the trail spur), facing the trail — was standing in the sand at the waterline
  { text:'BIRD SANCTUARY',      x:98,  z:-386, ry:-1.4 },          // by the WEST gate; nudged east of the walk ribbon (x~94)
  { text:'WAVELAND FIELDHOUSE', x:202, z:-470, ry:1.3 },           // trail side of the lakeside fieldhouse
  { text:'YACHT CLUB',          x:70,  z:-168, ry:-0.6 },
  { text:'WAVELAND TENNIS COURTS', x:83, z:-403, ry:-1.9 },        // SE corner, facing the trail approach
  { text:'DIVERSEY RANGE & MINI GOLF', x:30, z:285, ry:0.5 },      // SW of the range, facing the park
];

// suggestion box (task 013; RELOCATED + UPSIZED 2026-07-10 per owner live
// direction during task 023): the diegetic park-district "WHERE NEXT?" box now
// stands ahead-right of the NEW spawn on the monument forecourt's east lawn —
// "in front and to the right of the user when they spawn", scaled to
// park-kiosk presence so it reads at spawn distance (it was birdhouse-tiny at
// the Belmont underpass, whose FUTURE ENTRANCE signs task 030 has since
// removed). Small
// collider only — NO new walkable surface (it sits on existing LAND). The
// coordinate lives here so the engine pack, tools/walkprobe.mjs and
// tools/gen-waypoints.mjs all read ONE placement source. Front-right of the
// east-facing spawn = east AND south of it (right = +z when facing +x);
// ry ≈ -1.92 → the labelled face points WNW, back toward the spawn.
export const SUGGESTION_BOX = { x:115.5, z:158.8, ry:-1.92, scale:1.55 };

// path lamps along the main trail (trail-t + side) plus one pier lamp.
// ALL on side -1 (the RIGHT normal = the bike-only side; the crushed-limestone
// WALK ribbon runs on the +1/left normal at a 4.0 m offset). At offset 2.8 a
// -1 lamp clears the 3.2 m bike ribbon by 1.2 m and never touches the walk
// ribbon — keeping every lamp off BOTH ribbons (prop-vs-trail audit, Job 5).
export const LAMPS = {
  trail:[[0.06,-1],[0.14,-1],[0.22,-1],[0.30,-1],[0.38,-1],[0.46,-1],[0.54,-1],[0.62,-1],[0.70,-1],[0.78,-1],[0.86,-1],[0.93,-1]],
  offset:2.8,
  extra:[[205,-105],[121,404],[114.8,162.2]],   // peninsula pier lamp + corner pier tip lamp + the globe lamp behind the entrance monument (task 023, per the owner photo — reuses the instanced lamp meshes, +0 draws)
};

// benches (each becomes a "sit for a bit" interaction via the framework)
// NOTE: parkcharm.js places the CPD benches along the trail with clearance —
// these few are hand-set accents WELL AWAY from every ribbon.
export const BENCHES = [
  { x:102, z:129,  ry:-2.4 },        // inside the Haring circle lawn, facing the statue (nudged in to clear the r=16 loop ribbon)
  { x:30,  z:-90,  ry:-Math.PI/2 },  // west lawn
  { x:55,  z:230,  ry:-Math.PI/2 },  // south lawn
  { x:210, z:-110, ry:Math.PI },     // peninsula pier deck
  // corner-lawn benches (task 021, IMG_0398): on the CORNER_PARK path's inland
  // edge, FACING THE WATER across the path + dirt desire path
  { x:73.5, z:383.2, ry:0.3 },
  { x:89,   z:373.8, ry:0.5 },
  { x:105,  z:369,   ry:0.95 },
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
// LAKEVIEW BAND — the low-rise backdrop strip of vintage brick flats /
// greystones / small pre-war apartment blocks behind the L track (x < -12),
// per LSD-at-Belmont photo references (mostly 2-6 stories, the occasional
// taller 1920s block — distant and modest, NEVER towering over the park).
// Built in sky.js as instanced boxes (like the skyline treatment but
// nearer/lower) with a LOCAL deterministic rng — the shared world rng is
// never touched.
export const LAKEVIEW_BAND = {
  front:-16,                 // band front line (the L track is the backdrop at x~-8)
  zr:[-812,408],             // the ORIGINAL span — marched FIRST with the original seed so every existing block stays byte-identical
  zrN:[-1516,-812],          // MONTROSE growth: the north extension, marched SECOND with its OWN seed (existing band unperturbed; same 3 InstancedMeshes -> 0 new buckets)
  spacing:[15,30],           // street-ish gaps between buildings
  depth:[8,14],              // how far the blocks extend west
  w:[10,22],                 // frontage widths
  h:[7,16],                  // 2-5 stories
  tallProb:0.12, tallH:[20,26],   // the occasional vintage tower (still modest)
  colors:[0x8a5a44,0x9c6b50,0xb08968,0xa89078,0x8f8578,0x7b6d5f,0x6e5a4e,0xbfae94],
  winColor:0xf2e0b6, winLitProb:0.35,   // sparse warm windows at dusk
};

export const DECKS = [
  // peninsula pier juts EAST over the lake; its landward root is the WEST edge
  // (root:'w') — a fascia closes the daylight where it meets the spit (issue 016).
  { deck:[200,216,-120,-90,0.42], walk:{ x1:200, x2:216, z1:-120.5, z2:-89.5, h:0.42 }, root:'w' },
  // corner pier restyled task 021 (owner photos 0395/0399): a pale CONCRETE
  // APRON — white bollards inset along the long edges + tip (north landing
  // open), two red life rings on white posts, NO wooden rails. It juts SOUTH, so
  // its landward root is the NORTH edge (root:'n') — a curb roots it to the top edge.
  { deck:[116,126,373,406,0.42],  walk:{ x1:116, x2:126, z1:372.5, z2:406.5, h:0.42 }, root:'n',
    apron:{ slab:0xbdb8ae, white:0xf2ece0, red:0xd23b34,
            bollard:{ inset:0.55, spacing:3.4, r:0.13, h:0.82 },
            rings:[ {x:125.45, z:395, ry:-Math.PI/2}, {x:116.55, z:381, ry:Math.PI/2} ] } },
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
// underpass portals (short tunnel mouths; the FUTURE ENTRANCE gag signs were
// removed in task 030) at Belmont z 0, Addison z -400, Irving Park z -800.
// Toon cars slide N/S in
// the `lsd.js` content pack; the static berm/road/portals build here.
export const LSD = {
  berm:{ x0:0, x1:14, z0:-1530, z1:418, h:1.0, color:0x6f9e5c },   // z0 -1530 (was -846): MONTROSE growth — berm/road run the full new length; z1 418 past the south lawn
  road:{ x0:2.5, x1:11.5, y:1.02, color:0x8f9298 },
  lane:{ color:0xf2ede0, w:0.16, len:2.4, gap:3.2, count:7 },   // dashed center lines
  underpasses:[105, -400, -800, -1207],                        // Belmont z105, Addison -400, Irving -800, Montrose -1207 (v0.6 growth)
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
// behind the curved revetment. REWORKED task 021 against the owner's on-site
// photo set (refs/diversey-corner/chevron-closeup-IMG_0389 + 0396): the real
// sculpture is TWO-TONE — a tapered main BLADE mast (narrow base flaring to a
// beveled chisel tip) in pale powder blue over a darker steel-blue base — with
// a second shorter leaning blade and slender square-section straight beams
// CROSSING the masts like pick-up sticks (beams pass through a loose hub zone;
// NOT a radial fan). Builder buildChevron() in structures.js (no rng).
// blades: taper levels bottom->top [y, width, thickness]; splitY = the two-tone
// paint line. arms: {c:[x,y,z] beam centre, d:[dx,dy,dz] axis, L, t}.
export const CHEVRON = {
  pos:[96,0,372],
  pale:0xa3c4e6, steel:0x4c6d99,                   // powder-blue upper / steel-blue base + beams
  pad:{ r:2.4, h:0.3, color:0xbdb8ae },
  mast:{ levels:[[0,0.85,0.52],[3.3,1.08,0.52],[8.7,1.52,0.50],[9.6,1.60,0.07]],  // chisel tip
         splitY:3.3, ry:0.55, lean:[0.05,-0.03] },
  blade2:{ levels:[[0,0.55,0.36],[2.5,0.72,0.36],[6.6,1.02,0.35],[7.2,1.06,0.06]],
           splitY:2.5, ry:1.25, lean:[-0.10,0.06], off:[1.05,-0.55] },
  arms:[
    { c:[ 0.10,6.25, 0.25], d:[ 0.56, 0.72,-0.22], L:7.6, t:0.22 },
    { c:[ 0.35,6.80,-0.20], d:[-0.62, 0.66, 0.30], L:7.0, t:0.22 },
    { c:[-0.25,5.60, 0.30], d:[ 0.84, 0.36, 0.42], L:6.0, t:0.20 },
    { c:[ 0.25,5.95,-0.35], d:[-0.78, 0.30,-0.52], L:5.6, t:0.20 },
    { c:[ 0.00,7.30, 0.00], d:[ 0.18, 0.90,-0.40], L:5.2, t:0.20 },
  ],
  collide:2.2,
};

// CORNER PARK dressing (task 021, owner photos refs/diversey-corner/): the
// Diversey-corner lawn + revetment furniture. Path/desire ribbons build in
// paths.js (ribbonOn registers them in pathSamples so lawn-life keeps off);
// railing/stones/growth/riprap build in structures.js buildCornerPark() —
// zero shared rng (local xorshift only), so world scatter never moves.
export const CORNER_PARK = {
  // curving pale concrete path across the lawn to the pier root (IMG_0398)
  path:{ pts:[[63,392],[71,387],[80,381.5],[90,376.5],[100,373.5],[109,371.2],[117,370]],
         width:1.8, color:0xbdb8ae, y:0.065 },
  // the worn dirt desire path paralleling it on the seaward side
  desire:{ pts:[[66,394.5],[74,389.5],[83,384],[92,379],[101,375.8],[108,373.4]],
           width:2.0, color:0x9d7f58, y:0.05 },
  // scattered limestone sitting-stone blocks in the grass (IMG_0396): x,z,ry,scale
  stones:[ [84,367,0.5,1.0],[91,361,1.4,0.8],[79,375,2.2,1.15],
           [101,364,0.9,0.9],[106,366.5,2.8,0.75],[70,381,1.1,0.95] ],
  stone:{ w:1.35, h:0.55, d:0.85, color:0xbdb8ae },
  // white pipe railing on the revetment top lip (posts + 2 thin rails via the
  // shared instanced fence meshes): two spans flanking the pier, steps between
  // them left OPEN for play. Post line = COAST_CORNER fx(z) - edgeInset.
  rail:{ color:0xf2f4ee, postH:1.02, spacing:2.3, edgeInset:0.75,
         runs:[ {z0:347, z1:368}, {z0:388, z1:402} ] },
  // green growth tufting the step joints (0394/0395) — corner arc only
  growth:{ n:150, z0:342, z1:401, color:0x55924e },
  // rubble riprap toe at the waterline + the pier-slip lip (the cove read)
  riprap:{ step:2.6, z0:344, z1:399, color:0xa6ab95,
           slip:{ x:112.6, z0:383, z1:403, step:2.4 } },
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
// BILL JARVIS MIGRATORY BIRD SANCTUARY — hero rework (2026-07-07, per
// Downloads/addison harbor.png + harbor-new.md 5c): the fence is now an
// ORGANIC loop (crChain through `outlineCtrl`), the interior is a lush ROOM —
// winding walking LOOP, dense layered planting kept off the path, dappled
// clearings, and an ELEVATED WOODEN DECK (climbable, sittable) overlooking a
// clearing. Entering feels like walking into a separate room: framework
// definePlace grades fog/light greener+denser inside and re-balances the
// ambience (exterior ducked, birdsong boosted) — the shared CELL pattern
// (see framework.js definePlace; Wrigleyville adopts the same machinery).
export const SANCTUARY = {
  bounds:{ x0:100, x1:200, z0:-420, z1:-357 },  // coarse block (nature.js perch/cull bounds): golf north (z-440), harbor south
  outlineCtrl:[                                  // organic fence loop (closed by crChain)
    [100,-388],[102,-403],[110,-414],[126,-419],[148,-417],[170,-419],
    [188,-413],[198,-400],[199,-385],[193,-372],[178,-362],[156,-358],
    [134,-359],[116,-363],[104,-372],
  ],
  gate:{ x0:99, x1:102, z0:-393, z1:-383 },     // gap in the WEST run, facing the trail
  arch:{ x:100.5, z:-388, w:3.6, h:2.6, beam:0x6d5a3a, text:'BIRD SANCTUARY' },  // gate arch — the room's door
  fence:{ color:0x6d5a3a, postH:1.2, spacing:2.6 },
  loopCtrl:[                                     // interior walking loop (closed by crChain; crushed limestone)
    [103,-388],[112,-381],[122,-374],[135,-369],[150,-371],[163,-377],
    [175,-386],[180,-397],[174,-407],[160,-412],[144,-410],[128,-404],
    [114,-396],[106,-391],
  ],
  path:{ width:1.9, color:0xd9c9ac, y:0.055 },
  clearings:[ [140,-390,7],[158,-392,6],[122,-408,5] ],   // dappled openings (x,z,r) — planting stays out
  deck:{                                         // the bird-watching perch (walkable, sittable)
    x0:169.5, x1:175, z0:-398.5, z1:-394, h:2.3, // platform walk rect
    stairs:[ {x0:168.3,x1:169.5,z0:-397.5,z1:-395.5,h:1.72},
             {x0:167.1,x1:168.3,z0:-397.5,z1:-395.5,h:1.15},
             {x0:165.9,x1:167.1,z0:-397.5,z1:-395.5,h:0.57} ],
    wood:0x8a6a48, rail:0x6d5a3a, plank:0x9c7c55,
    sits:[ {x:174.1,z:-395.3,ry:-1.45},{x:174.1,z:-397.4,ry:-1.45} ],  // along the EAST rail, facing WEST over the interior + clearings
  },
  understory:{ count:200, colors:[0x2f6b3a,0x3c7a44,0x27512f,0x356e3e], scale:[0.7,1.7], guard:6000,
               pathClear:2.3 },                  // keep planting off the loop + clearings
  prairie:{ tufts:420, flowers:260,              // native planting: tall grasses + purple/yellow wildflowers
            tuftColor:0x8fae5e, flowerColors:[0x9a6bd0,0xb98ae6,0xf2c14e,0xead06a] },
  place:{ fadeS:2.0,                             // the room grade (framework definePlace)
          grade:{ fogColor:0xa9c48f, fogNear:26, fogFar:120, ambGround:0x77b06e, ambI:1.0, sunI:0.72 },
          amb:{ ext:0.25, bird:2.2 } },
};
// densified fence outline + interior loop (exported so builders + walkprobe
// share ONE geometry source — walkable and rendered stay lockstep)
export function sanctuaryOutline(){ const P=crChain([...SANCTUARY.outlineCtrl,SANCTUARY.outlineCtrl[0]],2.4); return P; }
export function sanctuaryLoop(){ const P=crChain([...SANCTUARY.loopCtrl,SANCTUARY.loopCtrl[0]],2.2); return P; }

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
// inland, west of the trail), now ENTERABLE + PLAYABLE (task 028, issues
// 010/011). Green range strip x28-88, z242-283 (fenced W/N/E, open at the
// south tee line) hitting NORTH (−z) under a 12 m net. The two-tier bay
// building's GROUND tier is a walkable hitting deck (bays.deck, h 0.4) entered
// from the park/back side into a bay; the "hit a bucket" activity (pack
// diversey.js) launches balls north with arc + bounce + distance in yards.
// The UPPER tier is decorative (posed golfers) + visually gated — NO stair
// (the old dead stair is removed). A playable 3-hole mini-golf course (x70-88,
// z286-306): hole 1 dogleg, hole 2 loop-ramp, hole 3 windmill — each felt
// fairway is a data polygon whose wood rails are DERIVED from its edges (they
// cannot cross), tee pad + cup + flag on each; putt via chargeThrow with
// strokes/par (pack). The windmill TOWER is static here; the pack owns +
// slowly rotates the BLADES.
// NOTE: range{} is UNCHANGED — props.js tree-scatter filters against this exact
// rect; moving it would drift the world's tree layout. Do not touch it.
export const DIVERSEY = {
  range:{ x0:28, x1:88, z0:242, z1:283 },
  green:0x59b356,
  fence:{ color:0xd7cfbe, postH:1.05, spacing:2.8 },   // W + N + E (south/tee side open)
  // TWO-TIER BAY BUILDING (Topgolf-style double-decker). GROUND tier ENTERABLE:
  // a walkable hitting DECK (deck.h) reached from the park/back (south) side,
  // enclosed by the divider + end-wall colliders so only the bay fronts open to
  // the field. UPPER tier decorative + gated (no stair). Hitting NORTH.
  bays:{ x0:30, x1:66, zFront:280, depth:5.5, storyH:3.1, perLevel:6,
         frame:0x3a3f45, deck:0x8b857a, divider:0x565b61, rail:0xcfd4d8,
         glow:0xffd98a, screen:0x9edcff,
         deckRect:{ x0:30, x1:66, z0:279.8, z1:285.6, h:0.4 },   // ground-tier walk rect (slab top matches h); deck (above) is the slab color
         hit:{ xs:[33,39,45,51,57,63], z:280.9, r:1.9 },     // per-bay hitting spots (bay centers, on the deck front)
         golfers:[ {x:41,lvl:1},{x:59,lvl:1} ] },            // UPPER-deck posed chibis only — the ground bays are the player's
  // TALL PERIMETER NET wrapping the downrange field (W/N/E fence lines):
  // thin dark posts + translucent net panels — the photo's big vertical presence.
  net:{ h:12, poleEvery:10, inset:0.5, pole:0x2e3236, poleR:0.16, mesh:0xdadfe4, opacity:0.16 },
  tees:{ xs:[33,39,45,51,57,63], z:279.2, w:2.4, d:1.7, color:0x2f6b3a },   // hitting mats, one per bay, on the deck front lip
  balls:{ count:30, x0:30, x1:86, z0:246, z1:275, color:0xf6f6ee },         // static decorative scatter (structures, LOCAL rng)
  boards:[ ['50',34,266],['100',34,257],['150',34,248] ],   // distance markers down the west edge
  bucket:{ x:76, z:281, color:0x9aa0a6, ball:0xffffff },
  play:{ ballR:0.14, bucketN:10, gravity:22, netZ:243.0, yardScale:4.5,
         maxBalls:14 },   // range hitting (pack). yardScale maps the compressed
         // ~38 m field to real-feeling yards, ~consistent with the 50/100/150
         // distance boards (a full-field carry reads ~170 yds; a net-buster more)
  mini:{
    x0:70, x1:88, z0:286, z1:306,
    felt:0x3fae5f, rail:0xb07a46, cup:0x171717, tee:0x2f6b3a, flag:0xd23b32, pole:0x2a2a2a,
    railW:0.16, railH:0.24,
    fence:{ color:0xc9b78f, postH:0.7, spacing:2.2 },        // low boundary fence (shared instanced fence mesh)
    sign:{ x:70.5, z:305.5, ry:0.6, text:'MINI GOLF' },
    // Each hole's felt FAIRWAY is an ordered rectilinear polygon (CCW). Rails
    // are DERIVED from its consecutive edges — never freehand — so they hug the
    // felt and can never cross. tee = start pad, cup = hole, obst = obstacle.
    holes:[
      { id:1, type:'dogleg', par:3,
        fair:[[71,297],[81,297],[81,293],[75,293],[75,288],[71,288]],
        tee:[79,295], cup:[73,290] },
      { id:2, type:'loop', par:2,
        fair:[[83,299],[87,299],[87,288],[83,288]],
        tee:[85,297.5], cup:[85,290], obst:[85,293.5] },
      { id:3, type:'windmill', par:3,
        fair:[[72,305],[86,305],[86,300],[72,300]],
        tee:[84,302.5], cup:[74,302.5], obst:[79,302.5] },
    ],
    putt:{ power:5.5, friction:1.6, cupR:0.30, cupSpeed:2.4 },   // putt physics (pack)
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
