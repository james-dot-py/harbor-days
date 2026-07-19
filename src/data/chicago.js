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
// 084 COMPRESSION: the golf revetment is re-cut to the compact vignette
// (z -400..-580); the OLD full-length piece stays as GHOST rng ballast — the
// coast.js terrace-slab loop iterates COAST_SEGS[2] with the SHARED world rng,
// so the ghost consumes the exact pre-084 draw pattern (boxes never pushed)
// and every towel/tuft/tree downstream stays bit-identical. The NEW golf +
// bay pieces render via the LOCAL xorshift fold (the Montrose precedent).
const golfFx = z=>232+Math.sin(z*0.017)*1.9+Math.sin(z*0.045+1.1)*1.1+Math.sin(z*0.082+0.4)*0.7;
export const COAST_GOLF_PARAMS       = { z0:-400,z1:-580, fx:golfFx };  // Marovitz trail-side revetment (084 vignette cut)
export const COAST_GOLF_GHOST_PARAMS = { z0:-400,z1:-800, fx:golfFx };  // pre-084 piece — WORLD-RNG BALLAST ONLY, never rendered/walked
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
// 084 COMPRESSION: the whole Montrose block slides SOUTH by MTR_DZ. montroseFx
// is PHASE-SHIFTED by the same delta so the shore meander translates RIGIDLY —
// every hand-matched junction value (mouth start, beach stub, closure) survives
// exactly: montroseFx(oldZ + MTR_DZ) === pre-084 montroseFx(oldZ).
export const MTR_DZ = 436;
export const montroseFx = z => 234 + Math.sin((z-MTR_DZ)*0.016)*2.2 + Math.sin((z-MTR_DZ)*0.041+0.7)*1.3;
// (COAST_MTR_LAWN is RETIRED by 084 — the blank golf-to-Montrose lawn is
// replaced by the curved BAY cove, COAST_BAY_PTS below, defined after crChain.)
// COAST_MTR_HARBOR is no longer a straight stub — task 070 carves the Montrose
// Harbor basin + hook mole here. Its pieces (MTR_HARBOR_MOUTH / mtBasin*Line /
// mtMoleWestSeawall / MTR_HOOK_TIP / COAST_MTR_HARBOR_PTS) are defined below,
// after crChain (the Montrose-harbor block near the Belmont basin functions).
export const COAST_MTR_POINT_PARAMS  = { z0:-867, z1:-926, fx:montroseFx };  // 071 pushes Montrose Point + the Magic Hedge east
export const COAST_MTR_BEACH_PARAMS  = { z0:-929, z1:-1064, fx:montroseFx };  // 072 lays Montrose Beach sand + the dunes here
// NE-corner map-edge closure: the revetment wraps from the beach's north end
// (matches COAST_MTR_BEACH's last point) west into the north-cap hedge line. A
// polyline (not fx(z)); coast.js densifies it. Ordered shore->west so the terrace
// normal points N/NE into the edge water.
export const COAST_MTR_CLOSE_PTS = [[montroseFx(-1064),-1064],[233,-1070],[228,-1074],[217,-1077],[201,-1078.5]];

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

// ---- MONTROSE HARBOR + THE HOOK (v0.6, task 070) --------------------------
// A bigger sibling of Belmont Harbor, laid with the SAME basin + peninsula +
// terraced-tip + south-mouth topology (BASIN_W / peninsulaWestLine / COAST_TIP /
// COAST_MOUTH), Montrose coords, and a STONE breakwater where Belmont has a
// grassy spit. Replaces the 069 COAST_MTR_HARBOR stub (z -655..-864). All
// densified via crChain (no rng). East-west COMPRESSED to fit xMax 244 (the
// standing liberty — order is the law, not raw osm x). Determinism-safe: every
// scatter loop caps at z>=-800, so this LAND carve is scatter-free (069 proved
// it, 0.34% spawn). Water is WATER_N (y -2.32) showing through the concave LAND.
//
// ---- THE BAY (084 COMPRESSION, z -580..-655) -------------------------------
// The curved cove replacing the blank golf-to-Montrose lawn: the shore sweeps
// WEST from the golf revetment end (golfFx(-580)=232.97) to a waist at ~x155,
// z-628, then back out to meet the harbor-mouth lawn end (montroseFx(-652) at
// z-655 — the same junction geometry the old LAWN piece arrived with, gentle
// N-NE final tangent into the mouth's NW sweep). Ordered south->north so the
// seaward normal points into the cove water; TIER_DEFAULT terraces via the
// LOCAL fold (zero shared rng). Across the cove the hook mole + entrance light
// read to the NE — the golf-to-harbor visual handshake.
export const COAST_BAY_PTS = crChain([
  [232.972,-580],[220,-592],[200,-602],[178,-612],[162,-620],[155,-628],
  [156,-636],[164,-644],[181,-650],[207,-652.5],[224,-653.5],[236.278,-655],
],2.5);   // return leg strictly monotonic in z — a north-south wiggle here cuts a water sliver into the headland (x-ray pip)

// TERRACED pieces (walkable steps via QUERY_SEGS + folded terraces/piles/faces,
// the COAST_TIP precedent). Ordered so each seaward normal points to the water:
export const MTR_HARBOR_MOUTH = crChain([[montroseFx(-652),-655],[231,-661],[216,-668],[201,-674],[191,-678],[186,-681]],2.5);  // mouth SW entrance shore (LAWN end -> basin SW jamb)
export const MTR_HOOK_TIP     = crChain([[228,-693],[232,-685],[238,-684],[242,-691],[242,-702],[239,-712],[237,-718]],1.7);  // hook curl at the south tip (terraces face the LAKE only; light on top)
export const COAST_MTR_HARBOR_PTS = crChain([[237,-718],[238,-764],[238,-826],[236,-864]],2.5);  // mole LAKE(outer) terraced face -> continues to the Point (the swapped 070 piece)
// SEAWALLS (flush sheet-pile bulkheads; the basin's west + north walls and the
// mole's inner/basin face — which WRAPS down to the apex so the terraced tip only
// faces open water, no walkable shelf pokes into the mouth). Added to seawallLines().
export function mtBasinWestLine(){  return crChain([[186,-681],[185,-724],[185,-788],[186,-850]],2.5); }  // mainland promenade edge (docks + launch root here)
export function mtBasinNorthLine(){ return crChain([[186,-852],[197,-853],[208,-853],[217,-851]],2.5); }  // basin north wall -> mole root
export function mtMoleWestSeawall(){return crChain([[217,-851],[219,-804],[219,-744],[220,-714],[224,-701],[228,-693]],2.5); }  // mole inner(basin) face: north root -> down and around to the SW apex
// harbor entrance light on the hook-tip apex (Belmont HARBOR_LIGHT register)
export const MT_HARBOR_LIGHT = { pos:[239,-694], towerH:2.6, r:0.44, white:0xf2ece0, red:0xd23b34, glow:0xffd98a };
// mole STONE-paved walk cap (the breakwater top reads as concrete, not the LAND
// lawn). A flat filled polygon over the mole footprint (frustum-culled, +0 far views).
export const MT_MOLE_PAVE = [[220,-714],[224,-701],[228,-693],[233,-687],[240,-691],[241,-704],[238,-714],[238,-864],[219,-864],[219,-714]];  // footprint (inner seawall x219 -> apex curl -> lake face x238 -> north)

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
                            COAST_BAY, COAST_MTR_HARBOR, COAST_MTR_POINT, COAST_MTR_BEACH, COAST_MTR_CLOSE }){
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
  P.push(...COAST_GOLF);                                   // golf revetment (084 vignette, ends z-580)
  // 084 COMPRESSION: the BAY cove replaces the blank golf-to-Montrose lawn —
  // the shore sweeps west to the waist (~155,-628) and back to the harbor-mouth
  // lawn end (montroseFx(-652),-655), where the (shifted) Montrose block begins.
  P.push(...COAST_BAY);                                     // the 084 bay cove (curvy, west-sweeping)
  // 070: Montrose Harbor — a concave south-opening basin with an east breakwater
  // MOLE (the hook). Traced like Belmont's basin+peninsula: mouth SW entrance
  // shore -> basin west seawall -> basin north -> DOWN the mole's inner face ->
  // around the terraced hook TIP -> UP the mole's lake face (COAST_MTR_HARBOR).
  P.push(...MTR_HARBOR_MOUTH);                              // mouth SW entrance shore
  P.push(...mtBasinWestLine());                            // basin west seawall (N)
  P.push(...mtBasinNorthLine());                           // basin north seawall (E)
  P.push(...mtMoleWestSeawall());                          // mole inner(basin) seawall (S toward the tip)
  P.push(...MTR_HOOK_TIP);                                 // hook curl (terraced south tip)
  P.push(...COAST_MTR_HARBOR);                             // mole lake(outer) terraced face (N)
  P.push(...COAST_MTR_POINT);                               // 071: Montrose Point + Magic Hedge
  P.push(...COAST_MTR_BEACH);                               // 072: Montrose Beach + dunes
  P.push(...COAST_MTR_CLOSE);                               // NE-corner closure (~201,-1078.5)
  P.push([14,-1080]);                                       // north edge (west end; north-cap hedge)
  P.push([14,-812],[14,-400],[14,0]);                      // west park edge (closes to [14,415])
  return P;
}

// 084 DETERMINISM BALLAST — the PRE-084 land polygon, truncated at z=-800.
// The shared-rng tuft/grass-patch accept loops (props.js TUFTS, coast.js
// GRASS_PATCHES) sample z >= -800 only, and pip is an x-ray at constant z, so
// this truncated polygon reproduces the pre-084 accept/reject decisions
// BIT-FOR-BIT (edges south of -800 identical to the old map; the horizontal
// z=-800 closure edge never crosses an x-ray). Consumers accept against THIS
// ghost (rng stream frozen) and then post-filter against the real LAND
// (zero-scale / skip — draws already consumed). Never reshape it.
export function buildLandGhost084({ COAST_CORNER, COAST_MAIN, COAST_PEN, COAST_GOLF_GHOST, COAST_MOUTH, BASIN_W }){
  const P_START=COAST_PEN[0], P_END=COAST_PEN[COAST_PEN.length-1];
  const P=[[14,415]];
  P.push(...COAST_CORNER);
  P.push(...COAST_MAIN);
  P.push(...COAST_MOUTH);
  P.push(...BASIN_W);
  P.push([85,-327],[88,-333],[90,-339],[95,-341],[105,-341],[110,-339],[112,-333],[113,-330]);
  P.push(...basinNorthLine());
  P.push(...peninsulaWestLine(P_START));
  P.push(...COAST_PEN);
  P.push(...crChain([P_END,[210,-356],[222,-380],COAST_GOLF_GHOST[0]],2.5));
  P.push(...COAST_GOLF_GHOST);                             // the OLD full golf revetment (to z-800)
  P.push([14,-800],[14,-400],[14,0]);                      // z=-800 closure + west edge home
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
    mtBasinWestLine(),                  // MONTROSE (070): harbor basin west seawall
    mtBasinNorthLine(),                 // MONTROSE (070): harbor basin north seawall
    mtMoleWestSeawall(),                // MONTROSE (070): the hook mole's inner(basin) face
  ];
}

// lake water plane (big enough to cover the tall map + horizon; centered
// near the map's middle so the golf's lake never runs out of water)
export const WATER = { size:1650, seg:180, cx:110, cz:-260 };
// MONTROSE north growth: a SECOND water plane covering the new north stretch
// (the main WATER plane's north edge is only z -649). Kept SEPARATE (not a
// resized WATER) so the existing lake surface — including the spawn view — stays
// BIT-IDENTICAL for the determinism gate. Built with the same living-water mat +
// aShore in coast.js; overlaps the main plane in z -1000..-649 and sits 0.02 m
// LOWER so the existing plane wins there (no z-fight, no seam). Frustum-culled
// (a lone Mesh) so it costs 0 draws in any view not looking at the far north.
export const WATER_N = { size:1000, seg:84, cx:190, cz:-1064, yOff:-0.02 };

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

// ---- MONTROSE BEACH + DUNES (v0.6, task 072) ------------------------------
// The city's big wild beach, NORTH of the Point. Replaces the 069
// COAST_MTR_BEACH revetment stub (z -929..-1064) with SAND: a beachH-style
// sloped cove (the DOG_BEACH machinery at scale), shared by engine + walkprobe.
// The sand is dry (h~0) inland (x <= slope.ref) and slopes DOWN in +x (east)
// tucking UNDER the lake by x~x1 — the waterline. Walkable everywhere in bounds
// EXCEPT the roped DUNE interior (blocked by DATA, no collider ring — 065 law).
// Determinism: the sand mesh is a LONE frustum-culled Mesh (0 draws unless the
// beach is framed); towels/umbrellas/tufts GROW existing instanced buckets via
// LOCAL seeds (zero new buckets); COAST_MTR_BEACH stays the LAND/QUERY/SHORE
// boundary but its terraces are EXCLUDED from the coast fold (coast.js) so no
// concrete renders on the sand.
export const MONTROSE_BEACH = {
  bounds:{ x0:200, x1:242.5, z0:-1064, z1:-924 }, // sand footprint (walkable except the roped dune)
  // 088 (issue 030): slope ref MUST sit EAST of the LAND edge (montroseFx <= 237.5)
  // — with ref 227 the sand dipped below y0 from x~227.5 while the y0 LAND lawn
  // ran to the coast line, so a lawn-green strip capped the beach at the exact
  // waterline (the 041 grade-carpet-over-sunken-feature class, beach edition).
  // Dry flat sand to x237.6, then a short wet slope under the lake by x~242.
  slope:{ ref:237.6, span:5, depth:-2.7 },         // dry (h~0) at x<=237.6, dips under the lake by x~242
  mesh:{ cx:220.5, cz:-994, w:49, d:146, segW:36, segD:58 },   // sand render plane (frustum-culled) x196..245
  sand:0xd9c087,   // task 075: warmed from near-white 0xe8d9b5 — the flat beach read as snow/concrete under the toon sun; a golden tan reads as warm Chicago sand (matches the dune mounds; lone frustum-culled Mesh, +0 draws, no rng)
};
// dune natural area — the roped, protected SE corner abutting the Point. Its
// INTERIOR is NON-WALKABLE (montroseBeachH covers it -> beachWalkable returns
// false via inMontroseDune; NO collider, so no ring-trap). Raised sand mounds +
// dune grasses (tuft-bucket grow, local seed) + a rope-and-post line (fenceRun,
// collide:false) + the piping-plover story (2 adults + 1 chick + ONE honest
// sign). Quiet + protective, not a zoo exhibit.
export const MONTROSE_DUNE = {
  bounds:{ x0:210, x1:233, z0:-978, z1:-926 },   // BLOCKED interior (no collider)
  // rope line: E edge (x233) -> N edge (z-978, faces the beach) -> W edge (x210).
  // South (z-926) is the natural Point-side edge, left open. collide:false.
  fence:[ [233,-926],[233,-978],[210,-978],[210,-926] ],
  mounds:[ {x:217,z:-958,rx:5.5,rz:6.0,h:1.05}, {x:226,z:-944,rx:4.6,rz:5.2,h:0.8}, {x:220,z:-971,rx:4.2,rz:4.6,h:0.62} ],
  grass:{ count:130, seed:0x0d0e17, scaleY:[1.5,2.8], color:0x9fb56b, fringe:5 },  // taller/paler than park tufts; in bounds + a small fringe
  plovers:[ {x:214,z:-971,ry:0.6}, {x:225,z:-969,ry:2.3} ],   // near the NORTH rope so they READ from the mt-dunes stand
  chick:{ x:219, z:-972 },
  sign:{ x:218, z:-979.5, ry:Math.PI, lines:['PIPING PLOVER','NESTING AREA','— please keep out —'] },  // central on the N rope; faces N (the beach); FrontSide + backing
};
// Montrose beach LIFE — towels/umbrellas/coolers scattered on the DRY sand north
// of the dune, GROWN into the existing rocks beach-life buckets with a LOCAL seed
// (zero new buckets; the world rng order is untouched). props.js gates each spot
// on beachWalkable + clearance from the buildings.
export const MONTROSE_BEACH_LIFE = {
  seed:0x7205a1,
  region:{ xr:[209,231], zr:[-1062,-984] },       // dry-to-mid sand, north of the dune
  towels:22, umbrellas:8, coolers:5,
};
// Montrose Beach House — the historic ship-like bathing pavilion (1920s). Honest
// toon massing: a long two-storey cream hall (axis N-S) with a ROUNDED solarium
// "prow" bulging EAST toward the lake, a low terracotta hip roof + rooftop deck
// rail, an arched window band on the lake face, and an atlas-folded name sign.
// structures.js builds it (merged statics + frustum-culled). Set back inland
// (west) of the sand; anchors the beach's south-central end.
export const BEACH_HOUSE = {
  x:199, z:-1004, ry:0,          // long axis N-S; solarium/prow + windows face EAST (+x, the sand/lake)
  hallW:9, hallD:22, hallH:6.2,  // hallW = E-W depth, hallD = N-S length, hallH = two storeys
  prowR:5.2,                     // rounded solarium radius (east end, lake-facing)
  wall:0xe7dcc2, roof:0xb15f3e, trim:0x9a8a6a, glow:0xffe1a0, deckRail:0xb7a888,
  sign:'MONTROSE BEACH HOUSE',
  footRect:{ x0:194, x1:204, z0:-1016, z1:-992 },   // closed hall — carved from walk (052 law; prow gets a collider)
};
// The Dock at Montrose Beach — the seasonal open-air beach BAR (bar-likeness
// register: canvas signage, umbrellas, NO interior). A raised weathered-wood
// deck + an L-shaped bar counter under a canvas awning, colorful umbrellas,
// string-light glow, and a 'THE DOCK' canvas sign. On the sand at the beach's
// north end. structures.js builds it (frustum-culled + shared POSTS via fenceRun
// if needed). Beach NPCs (makeNPC) cluster here (packs/montrose-beach.js).
export const THE_DOCK = {
  x:216, z:-1048, ry:Math.PI,    // faces SOUTH down the beach (toward arriving players)
  deckW:12, deckD:8.5, deckY:0.36,
  wood:0x9c7a4e, bar:0x6b4e32, awning:0x2fb6a8, trim:0xece3cf, glow:0xffdf9a,
  umbCols:[0xff6b6b,0xffd93d,0x54a0ff,0x2fb6a8],
  sign:'THE DOCK',
  deckRect:{ x0:210, x1:222, z0:-1052, z1:-1044 },   // raised wood deck — WALKABLE (structures.js walkRect + walkprobe mirror)
};
// beach walkability helpers — SHARED by engine (main.js/coast.js) and
// tools/walkprobe.mjs so the two never fork (PITFALLS: walkprobe + engine must
// share walk definitions). montroseBeachH mirrors beachH's contract: height (m)
// or null outside the sand. inMontroseDune gates the roped block. beachWalkable
// answers "is this beach point walkable" for BOTH beaches (dog + Montrose).
export function montroseBeachH(x,z){
  const b=MONTROSE_BEACH.bounds,s=MONTROSE_BEACH.slope;
  if(x<b.x0||x>b.x1||z<b.z0||z>b.z1)return null;
  const t=Math.max(0,Math.min(1,(x-s.ref)/s.span));
  return s.depth*(t*t*(3-2*t));                    // smoothstep, matching coast.js smooth()
}
export function inMontroseDune(x,z){
  const d=MONTROSE_DUNE.bounds;
  return x>=d.x0&&x<=d.x1&&z>=d.z0&&z<=d.z1;
}
export function inBeachBuilding(x,z){              // beach house closed hall (The Dock deck is a walkRect, not blocked)
  const b=BEACH_HOUSE.footRect;
  return x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1;
}
// blocked BEFORE the sand test in walkable() (works whether or not the spot is
// on sand): the roped dune + the beach-house hall. No collider -> no ring-trap
// (065 law). The dune fence rope + the beach-house prow carry their own visual
// colliders/rope only where they can't strand the player.
export function beachCarved(x,z){ return inMontroseDune(x,z)||inBeachBuilding(x,z); }
// 084: ghost-accepted scatter (tufts/grass patches sampled against the pre-084
// LAND ghost) that lands on the mole's STONE walk cap must be hidden — the
// mole top IS pip(LAND) but reads as concrete. Local pip (chicago.js keeps no
// engine imports); callers also test the real LAND for water.
export function scatterCarve084(x,z){
  const poly=MT_MOLE_PAVE;let ins=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i][0],zi=poly[i][1],xj=poly[j][0],zj=poly[j][1];
    if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/(zj-zi)+xi))ins=!ins;
  }
  return ins;
}
export function beachWalkable(x,z){                // the beachH!==null path (dog + Montrose sand)
  const dg=DOG_BEACH.bounds;
  if(x>=dg.x0&&x<=dg.x1&&z>=dg.z0&&z<=dg.z1)return z>DOG_BEACH.walkZMin;  // dog beach: whole cove walkable
  return true;                                     // Montrose sand (dune/building carves handled earlier in walkable)
}

// ---- CRICKET HILL (v0.6, task 073) — the map's first walkable HILL ---------
// Chicago's kite mound, inland-WEST of Montrose Harbor (comfort station osm
// z-1319 raw 1:2; here at game z-879 in the 084 compressed frame, clear WEST of the re-routed trail x160-180 and
// EAST of the LSD berm). An ANALYTIC grassy dome in the beachH/tierAt lineage:
// a SINGLE shared surface function so the engine (main.js/coast.js surfaceY) and
// tools/walkprobe.mjs never fork. The profile is a radial smoothstep — FLAT top
// (a standable summit) + ZERO-slope rim — so the mound blends seamlessly into the
// y=0 lawn carpet with NO cliff seam, and there is NO walk RECT anywhere on it
// (the whole footprint sits on LAND, already walkable via pip(LAND); only the
// SURFACE HEIGHT is added). Zero-slope rim + gentle max grade (~H*1.5/min(rx,rz)
// ≈ 0.39) means the base has no step-up "elevator" and walking down never trips
// main.js's player.y-surf>0.5 airborne check. The dome MESH + dressing live in
// packs/cricket-hill.js; this module owns only the surface math (+ the footprint
// the pack and gen-waypoints cite). Height ~7 m (the "~7 m class" from the brief).
export const CRICKET_HILL = {
  cx:112, cz:-879,          // summit centre (inland-west of the harbor basin at x186)
  rx:31, rz:27,              // elliptical base radii — footprint x81..143, z-852..-906
  height:7.0,                // summit height (m)
  grass:0x77c268,            // a touch deeper/cooler than lawn 0x7ecb6f so the mass reads, but blends at the rim
};
export function cricketHillH(x,z){                  // height (m) on the mound, or null off it
  const H=CRICKET_HILL;
  const dx=(x-H.cx)/H.rx, dz=(z-H.cz)/H.rz, u=Math.hypot(dx,dz);
  if(u>=1)return null;                              // off the mound -> fall through to lawn/coast/beach
  const s=1-u;                                      // 1 at summit, 0 at rim
  return H.height*s*s*(3-2*s);                      // smoothstep dome: flat top + zero-slope rim
}

// ---- MONTROSE POINT + THE MAGIC HEDGE (v0.6, task 071 — STAGED by 068) -----
// Layout truth staged by task 068 (GEOGRAPHY.md § Montrose Point — read it
// first). NOTHING here is consumed by a builder yet: the world stays
// bit-identical until 071 flips COAST_MTR_POINT from the genCoast stub to
// COAST_MTR_POINT_PTS in BOTH src/coast.js and tools/walkprobe.mjs (one commit,
// never fork) and builds the sanctuary from MONTROSE_POINT. Pure data — crChain
// is deterministic, no rng at import time.
//
// The pushed-east Point shore (piece-swap slot idx 2, z -864..-926): starts
// at COAST_MTR_HARBOR_PTS' end (236,-864), bulges to the tip apex (243,-894)
// — the map's eastmost land, 1 m inside WORLD_CLAMP.xMax — and returns to
// (234.9,-926) to meet the beach stub start (montroseFx(-929)=234.92).
// TIER_DEFAULT terraces face the open lake; own piece OUT of COAST_SEGS
// (COAST_TIP precedent), folded via the LOCAL xorshift like its neighbors.
export const COAST_MTR_POINT_PTS = crChain([[236,-864],[239,-872],[242,-882],[243,-894],[241.5,-906],[238.5,-916],[236,-922],[234.9,-926]],2.5);
// The sanctuary itself. Compass care: -z is NORTH; the band's south edge
// (z -860) meets the mole-root neck, its north edge (z -926) the roped dune.
// Everything at x <= ~231 sits on TODAY's lawn (walkable now — staged walkprobe
// expects lock it); 'scope'/the tip-loop east arc sit on the FUTURE bulge.
export const MONTROSE_POINT = {
  meadow:{ x0:188, x1:241, z0:-922, z1:-860 },   // prairie carpet + wildflower drifts (LOCAL seed; clip to LAND, >=2 m clear of every ribbon — the trail cuts the NW corner)
  gate:{ x:191, z:-882 },                         // timber gateway just E of the trail's walk ribbon (~x187): posts + header beam, chunky YELLOW routed letters, split-rail flanks, rules board; opening faces WEST (arrivals from the trail), beam runs N-S
  panel:{ x:200, z:-884.5, ry:-0.55 },            // the SEPARATE cream 'The Magic Hedge — A migrant magnet' interpretive panel, south side of the entrance path; front faces WNW so both the gate approach and the mt-hedge f0 camera catch the cream face
  hedge:{ pts:[[194,-890],[206,-893],[220,-896],[231,-900]], h:2.6, w:2.2,   // the green wall (~38 m), WSW->ENE
          gaps:[[207,-893],[222,-896.5]] },      // birder clearings ON the line; scopes/birders cluster on the gaps' SOUTH (path) side
  paths:{                                          // both NEW crushed-limestone ribbons via pathSamples2 (never touch TRAIL_MONTROSE's points)
    entrance:[[191,-882],[198,-886],[207,-889.5],[217,-892.5],[227,-895],[232,-902]],   // gate -> hedge's S flank -> around its east end
    loop:[[232,-902],[237,-897],[239,-891],[236,-883],[230,-876],[222,-870],[214,-866],[206,-863.5]],   // tip clearing -> S shore edge -> the mole-root walk (trail-gate-hedge-tip-hook connectivity, no dead ends)
    width:2.4,                                     // crushed limestone, TRAIL_STYLE.walk color/y
  },
  scope:{ x:238.1, z:-900.4 },                    // tip-clearing tripod-scope spot on the 071 bulge, EAST of the loop's tip arc (the CR-sampled loop passes ~0.8 m from the staged 235.5,-899 — tripod legs overlapped the hero path; here it clears the centerline by >=2.8 m)
  trees:[[210,-908],[211,-916],[236,-890]],     // low tree-cluster anchors (refs: scattered clusters in open meadow; keep the hedge sightlines clear). Anchor 1 moved W of the staged (223,-913): mt-point's pull-back cameras land at (221.9,-912)/(224.7,-914) and a canopy there is the 034/047 camera-trap
  stands:{ hedge:[203,-883], point:[229,-905], gate:[186,-880] },   // the mt-* waypoint stands — all lawn TODAY (GEOGRAPHY §Point waypoints; final strings in refs/montrose/BRIEF.md)
  // ---- 071 build params (ALL local seeds — zero shared rng; consumed by
  // props.js / structures.js / paths.js / packs/montrose-point.js) ----
  prairie:{ seed:0x51ab17, tufts:420, tuftScaleY:[1.5,2.8],       // tuft-bucket growth: taller straw-length meadow grass (green; height carries the read, the dune-grass precedent)
            straw:760, strawH:[0.45,0.95], strawColor:0xcfba7e,   // ONE merged frustum-culled Mesh of thin straw cones — the straw half of the prairie palette
            clearD:2.0 },                                         // min distance to every ribbon centerline (trail + sanctuary paths)
  flowers:{ seed:0x601d70,                                        // grows the AIDS-garden stems+heads buckets in place (setColorAt heads)
            drifts:[[234,-908,4],[228,-900,3.5],[210,-904,4],[199,-894,3],[216,-916,4]], perDrift:18, goldenrod:0xf2c14e,
            asters:[[224,-906,3],[204,-898,2.5]], perAster:14, aster:0xb48ae0 },
  hedgeFill:{ seed:0x8ed6e1, step:1.1, jitter:0.35,               // grows the HEDGES InstancedMesh: overlapping blobs along hedge.pts
              sx:[1.5,2.1], sy:[1.05,1.35], sz:1.15, y:1.3,       // per-instance yaw follows the segment tangent; top ~2.4-2.7 m (h 2.6)
              gapR:1.7,                                           // skip blobs within gapR of each gaps[] point — the birder windows
              ragged:{ off:[0.8,1.6], step:2.7, sy:[0.5,0.75] } },// sparse low second row on the S (path) side — the refs' ragged front
  treeFill:{ seed:0x7ee3a1, per:[3,2,1], spread:[4.5,3.5,0.1], scale:[1.7,2.2] },   // clusters per anchor (kept clear of ribbons/hedge/dune by rejection)
  ropes:[                                                         // white rope-and-post lines (fenceRun collide:false; the refs' path fencing)
    [[196,-888],[203,-890.2]],                                  // entrance path, hedge side (stops W of gap 1 — birders stand in the window)
    [[231,-912],[236,-907],[239,-901]],                        // tip meadow shore-edge run (mt-point f0 foreground)
  ],
  gateway:{ span:3.8, postW:0.26, postH:2.9, beamY:2.45, beamH:0.5, beamLen:5.2,   // posts at z -880.1/-883.9; beam spans them N-S
            wood:0x9a8d78, letters:0xe8c11c,                      // weathered gray timber, chunky routed-yellow letters (FrontSide canvas on the beam's W face; the beam box is the solid rear)
            rail:{ len:4.2, postH:1.0 },                          // split-rail flanks running N/S from each post along x=191
            rules:{ w:1.5, h:1.0, bg:0x2b2723 } },                // dark rules board ('Open from dawn to dusk'), W-facing at the S jamb
  birders:[                                                       // the devotees (pack: makeNPC wander:0, aim = look target; probe: footprint clearance)
    { x:206.0, z:-891.4, aim:[207,-893] },                      // gap-1 pair, peering into the window
    { x:208.6, z:-890.7, aim:[207.5,-893.5], scope:true },      // ...one on a tripod scope
    { x:221.6, z:-894.6, aim:[222,-896.5], binocs:true },       // gap-2, binoculars raised
    { x:237.8, z:-900.8, aim:[245,-891], scope:true },          // tip clearing (east of the loop arc, just inside the shore rope), scope aimed SE over the open lake
  ],
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
  [211,-540],[210,-560],[208,-572],                 // 084: the vignette golf ends at z-580; MAIN hands off to TRAIL_MONTROSE's bay routing here (41 control points, same count as pre-084 — lamps' getPoint(t) fractions stay put)
];
// 084 DETERMINISM BALLAST — the pre-084 TRAIL_MAIN (full golf run to z-782).
// Its dual-ribbon samples (walk-offset pass + bike pass) are pushed into
// pathSamples at MAIN's ORIGINAL build slot, byte-identical, so the shared-rng
// tree-rejection scan (props.js nearPath, stride 3) never moves a tree. The
// REAL (compressed) TRAIL_MAIN above draws into pathSamples2. The
// TRAIL_LOOP_GHOST law applies: NEVER delete or reshape this table.
export const TRAIL_MAIN_GHOST084=[
  [30,406],[25,390],[22,366],[20.5,338],[19.5,306],[19.5,272],[19.5,238],[20,210],[27,190],
  [36,178],[50,172],[66,168],[82,162],[96,152],[106,138],[112,120],[111,106],
  [104,55],[90,15],[75,-5],
  [58,-45],[48,-95],[44,-150],
  [45,-205],[48,-258],[54,-300],
  [62,-325],[74,-340],
  [86,-352],[90,-366],
  [90,-388],[90,-410],
  [91,-427],
  [106,-433],[145,-433],[182,-432],[205,-431],
  [211,-448],
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
// gap) and runs to z-1024, holding x~200-211 (clear of the revetment x~234 and the
// west hedge x14). 070-073 re-route locally as the harbor/Point/beach carve in.
// 070 re-routes the harbor stretch WEST of the basin (the basin water sits x186-218,
// z-677..-852) so the promenade hugs the mainland harbor edge and never crosses
// water; determinism-safe (pathSamples2, merged after buildProps; scatter caps z>=-800).
// 084: re-authored — the bay routing (sweeping west with the cove, shore
// >=7m east of the bike centerline so the walk ribbon clears the revetment
// top) then the SHIFTED harbor-north alignment (pre-084 points +436 from
// [172,-699] on — the promenade/Point/beach run translates rigidly).
export const TRAIL_MONTROSE=[
  [209,-562],[206,-580],[196,-598],[178,-608],[160,-616],[148,-626],
  [146,-638],[154,-648],[168,-658],[176,-672],
  // 088 REROUTE (issue 030, owner "shoreline placement"): the shipped tail
  // ([199,-924],[206,-978],[210,-1024]) ran the asphalt + dashes ACROSS the
  // beach SAND east of the beach house. Real place: the Lakefront Trail passes
  // INLAND (west) of the beach house. Bike stays x<=188 so the walk ribbon
  // (+4 east, w 2.4) clears BEACH_HOUSE.footRect x0 194 by ~0.8 m, and the
  // trail now reaches the map's north cap instead of dead-ending mid-sand.
  [172,-699],[158,-764],[160,-829],[180,-876],[186,-914],[188,-960],[188,-1012],[186,-1058],
];
// 088 DETERMINISM BALLAST — the pre-088 TRAIL_MONTROSE. Its dual-ribbon samples
// stay in pathSamples2 at the ORIGINAL build slot, byte-identical, so the tree
// post-filter (props.js near2) + every local clearD consumer sees an unchanged
// array; the REAL (rerouted) line above samples into pathSamplesMain (merged
// after buildProps). The TRAIL_MAIN_GHOST084 law applies: NEVER delete/reshape.
export const TRAIL_MONTROSE_GHOST088=[
  [209,-562],[206,-580],[196,-598],[178,-608],[160,-616],[148,-626],
  [146,-638],[154,-648],[168,-658],[176,-672],
  [172,-699],[158,-764],[160,-829],[180,-876],[199,-924],[206,-978],[210,-1024],
];
// Dual-path styling. walkOff (paths.js) = bike/2 + gap + walk/2 = 4.0 m, so
// the two ribbons run parallel with a ~1.2 m grass strip between them.
// 088 STRICT Y-LADDER (issue 028, owner "dashed line floats / pavement drops
// out"): every overlapping pair keeps >=0.006 separation (safe against 24-bit
// depth quantization inside the ~100 m detail range), and MARKINGS sit above
// their own asphalt but BELOW any crossing pedestrian pavement — so at a
// crossing the limestone covers the dashes (paint yields to the crossing
// surface, the real-world read) instead of the dashes floating on top of it.
// Ladder: bike 0.050 < spur 0.056 < dash 0.062 < loop 0.068 < walk 0.074.
// tools/path-layers.mjs asserts this mechanically in the verify gate — run it
// after ANY change here or to the trail polylines.
export const TRAIL_STYLE = {
  bike:{ width:3.2, color:0x83878d, y:0.05 },      // asphalt bike path (mainCurve centerline)
  walk:{ width:2.4, color:0xd9c9ac, y:0.074 },     // crushed-limestone walking path (walkCurve) — top of the ladder: covers dashes + asphalt at crossings
  gap:1.2,                                          // grass strip between bike & walk
  spur:{ width:2.6, color:0x83878d, y:0.056 },      // single asphalt connector — ABOVE main bike (they overlap at the [74,-340] branch; 0.05/0.05 was a coplanar z-fight)
  loop:{ width:2.2, color:0xd9c9ac, y:0.068 },      // little garden loop (crushed limestone) — above the dashes it crosses at the TRAIL_MAIN tangent (111,120)
  dash:{ spacing:2.8, w:0.14, len:1.1, color:0xe6c458, y:0.062 },  // yellow center dashes (bike + spur only) — above both asphalts, below both limestones
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
  {n:'Marovitz Golf Course', x:132, z:-510, r:72},   // 084: the compact vignette (bounds z-580..-440)
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
export const WORLD_CLAMP = { xMin:14, xMax:244, zMin:-1084, zMax:408 };   // zMin -1084 (was -822): the MONTROSE north growth (v0.6). zMax 408: the south lawn + pier tip (z406), short of the skyline billboard (z504+)

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
    [172,-60,1.1,false],[178,-110,1.0,true],[176,-160,1.05,false],
    [176,-210,1.0,false],[185,-260,0.95,true],[170,-300,1.1,false],
    [190,-90,0.9,false],[168,-140,1.0,true],
    // ^ [182,-160] moved to [176,-160] below (088 issue 029: the spur spine runs
    //   x~182.7 at z-160 — the tree stood 0.6 m off the path centerline, IN the
    //   path; prop-clearance.mjs is the permanent guard)
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
  west:{ x:14, z0:-1080, z1:412, step:5.5, gaps:[[95,115],[-410,-390],[-610,-590],[-781,-761]] },   // z0 -1080 (084 frame); 3rd gap = Irving Park at the vignette golf's north (z-600), 4th = the Montrose underpass (z-771)
  north:{ z:-1079, x0:14, x1:200, step:5.5 },   // north cap MOVED to the new map edge (was z-812); caps the lawn x14-200, the closure revetment is the shore east of it
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

// ---- MONTROSE HARBOR west-shore content (task 070) ------------------------
// Finger docks root FLUSH on the basin west seawall (x186, mtBasinWestLine) and
// reach EAST into the basin. Deck y derives from SEAWALL_Y.top (issue 016 — a
// coast reshape carries the docks). props.js builds them as individual
// frustum-culled meshes (plankDeck vocabulary) — ZERO new InstancedMesh buckets;
// the moored boats ride the moorings.js buckets (LOCAL seed), never makeBoat
// (which draws world rng). Each deck is a walkRect (walkable boardwalk).
export const MT_FINGER_DOCKS = {
  x0:186, len:15, halfW:0.95,
  rows:[-714,-754,-792,-826],        // 4 finger groups down the west shore
  seawallX:-186,                          // |x| of the basin west seawall (deck sits on grade west of it, on posts east of it)
};
// public boat LAUNCH ramp — a wide pale slab sloping from the shore into the basin.
export const MT_LAUNCH = { x0:186, x1:204, z0:-864, z1:-850, topY:0.05, botY:-2.05, color:0xb9b3a2 };
// Park Bait Shop — the real bait/tackle shop (small, signed). On the mainland
// WEST of the basin, facing the water (east). structures.js builds it (frustum-
// culled shack + a two-sided canvas sign). The map's north-harbor "you are here".
export const PARK_BAIT = { x:176, z:-740, w:6.4, d:4.6, h:2.7, ry:0, wall:0xcfc7b4, roof:0x9c5340, trim:0x7d6b52, sign:'PERCH BAIT' };
// the HOOK fishing-pier RAILING — the mole's inner(basin) walk edge + around the
// terraced tip, so the player leans on it and never falls into the basin. Posts
// sit INBOARD on the walkable mole top; structures.js fenceRun feeds the SHARED
// POSTS/RAILS buckets (+0 buckets). Small collider (keeps the player on-deck, no trap).
export const MT_HOOK_RAIL = { spacing:3.0, postH:0.95, color:0x7d8790, collideR:0.5,
  line:[[219.7,-848],[220.1,-804],[220.1,-746],[220.9,-716],[224.6,-703],[228.8,-695],[233.4,-689],[239,-693]] };
// Montrose harbor wooden signs (register: SIGNS above). Faces its approach.
export const MT_SIGNS = [
  { text:'MONTROSE HARBOR', x:184, z:-684, ry:Math.PI },   // at the mouth/promenade south, facing the arriving trail
];

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
  // 084 BAY benches: west of the cove trail facing east over the water, and on
  // the headland facing NE across the harbor mouth to the hook + entrance light
  { x:154, z:-612, ry:1.37 },
  { x:208, z:-660, ry:2.4 },
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
  zrN:[-1080,-812],          // MONTROSE growth: the north extension, marched SECOND with its OWN seed (existing band unperturbed; same 3 InstancedMeshes -> 0 new buckets)
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
  berm:{ x0:0, x1:14, z0:-1094, z1:418, h:1.0, color:0x6f9e5c },   // z0 -1094 (was -846): MONTROSE growth — berm/road run the full new length; z1 418 past the south lawn
  road:{ x0:2.5, x1:11.5, y:1.02, color:0x8f9298 },
  lane:{ color:0xf2ede0, w:0.16, len:2.4, gap:3.2, count:7 },   // dashed center lines
  underpasses:[105, -400, -600, -771],                        // Belmont z105, Addison -400, Irving -600 (084: at the vignette golf's north), Montrose -771 (084 frame)
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
  bounds:{ x0:60, x1:205, z0:-580, z1:-440 },   // 084 COMPACT VIGNETTE: z-580..-440 (was -790) — evocation over acreage; east edge x205 (lake-side trail east of it); south edge z-440 (corridor to the sanctuary)
  fairway:0x83c86a, green:0x5fa851, sand:0xe9d9a6,
  pins:[
    [95,-452],[110,-468],[125,-448],                  // holes 1-3 (south, playable — unchanged)
    [148,-498],[170,-540],[122,-565],                 // 4-6 (dressing, inside the vignette fence)
  ],
  bunkers:[
    [105,-470,3.2],[130,-505,2.8],[158,-522,2.6],     // COUNT FROZEN at 6 — the bunker loop is
    [178,-556,3.0],[102,-540,2.4],[140,-548,2.8],     // structures.js's only shared-rng draw (084)
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
// side is open to the water. The gates run all the way to the waterline:
// fenceRun posts stand base-y0, and the cove sand dips to ~-2 m by z-328, so
// any post seaward of z~-339 hangs mid-air over the slope (092 floating-prop
// sweep — the old narrow gates left a 3-post stub floating on each side).
export const DOG_FENCE = {
  lines:[
    [[88,-328],[88,-341]],     // west (gate)
    [[88,-341],[112,-341]],    // north (landward, z-341)
    [[112,-341],[112,-328]],   // east (gate)
  ],
  gates:[ { x0:87,  x1:89,  z0:-338.5, z1:-327.5 },
          { x0:111, x1:113, z0:-338.5, z1:-327.5 } ],
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
export const MAP = { x0:-170, z0:-1124, w:576, h:1549, cw:304, ch:412 };   // 084 COMPRESSION: z0 -1560->-1124, h 1985->1549 (north edge now z-1084 + 40 pad; bottom stays z+425); ch/cw unchanged -> the shorter map breathes vertically (HUD minimap aspect change -> the 084 baseline.png regen)
export const MAP_GOLF = { x0:60, x1:205, z0:-580, z1:-440, color:'#8fce74' };   // 084 vignette
export const MAP_LANDMARKS = [
  { x:60,  z:-100, c:'#d0705c', r:6 },   // harbor house
  { x:30,  z:-370, c:'#e0b13e', r:5 },   // Kwanusila
  { x:95,  z:120,  c:'#37a457', r:5 },   // AIDS garden
  { x:205, z:-105, c:'#8f6234', r:5 },   // pier
  { x:70,  z:-180, c:'#5a86c4', r:5 },   // yacht club
  { x:186, z:-478, c:'#9a8b78', r:6 },   // Waveland fieldhouse (lakeside, golf SE)
  { x:132, z:-510, c:'#4f9b46', r:6 },   // golf (084 vignette)
  { x:96,  z:372,  c:'#2f63d0', r:5 },   // Chevron sculpture (south lawn)
  { x:121, z:400,  c:'#8f6234', r:4 },   // corner pier
];

/* ----------------------------- CITY POI ------------------------------ */
// The full-city map card's landmark table for the LAKEFRONT strip (task 086):
// the dots + labels the city map / compass breadcrumb read. Another city ships
// a differently-shaped file with this same export and no card changes. Fields:
// id, n (lowercase display name), x/z (world m), c (css dot color), and an
// optional zone — the EXACT matching name from the ZONES export above, used to
// dim a landmark until its zone is discovered (omit where no zone exists, e.g.
// all of Montrose). North -> south.
export const CITY_POI = [
  { id:'montrose-beach', n:'montrose beach',    x:220.5, z:-994, c:'#dfc48f' },                       // MONTROSE_BEACH.mesh centre (cx,cz)
  { id:'magic-hedge',    n:'the magic hedge',   x:213, z:-894.5, c:'#3f8f4f' },                       // MONTROSE_POINT.hedge.pts midpoint
  { id:'cricket-hill',   n:'cricket hill',      x:112, z:-879,   c:'#77c268' },                       // CRICKET_HILL summit (cx,cz)
  { id:'the-hook',       n:'the hook',          x:239, z:-700,   c:'#8f6234' },                       // MTR_HOOK_TIP curl — on the mole
  { id:'park-bait',      n:'perch bait',        x:176, z:-740,   c:'#9c5340' },                       // PARK_BAIT (x,z)
  { id:'montrose-harbor',n:'montrose harbor',   x:212, z:-775,   c:'#4a9fc9' },                       // basin water, between the west seawall (x~185) and the hook mole (x~219)
  { id:'golf',           n:'the golf course',   x:132, z:-510,   c:'#4f9b46', zone:'Marovitz Golf Course' },
  { id:'clock-tower',    n:'the clock tower',   x:186, z:-478,   c:'#9a8b78', zone:'Waveland Fieldhouse' },
  { id:'sanctuary',      n:'the bird sanctuary',x:150, z:-388,   c:'#3f7d3c', zone:'Bird Sanctuary' },
  { id:'kwanusila',      n:'kwanusila',         x:30,  z:-370,   c:'#e0b13e', zone:'Kwanusila' },
  { id:'dog-beach',      n:'the dog beach',     x:100, z:-336,   c:'#d9b982', zone:'Dog Beach' },
  { id:'yacht-club',     n:'the yacht club',    x:70,  z:-180,   c:'#5a86c4', zone:'Yacht Club' },
  { id:'harbor',         n:'belmont harbor',    x:120, z:-170,   c:'#4a9fc9', zone:'Belmont Harbor' },
  { id:'harbor-house',   n:'the harbor house',  x:60,  z:-100,   c:'#d0705c', zone:'Belmont Harbor' },
  { id:'pier',           n:'the harbor pier',   x:205, z:-105,   c:'#8f6234', zone:'Harbor Pier' },
  { id:'aids-garden',    n:'the aids garden',   x:95,  z:120,    c:'#37a457', zone:'AIDS Garden Chicago' },
  { id:'rocks',          n:'the belmont rocks', x:150, z:150,    c:'#e0574a', zone:'The Belmont Rocks' },
  { id:'diversey',       n:'diversey range',    x:58,  z:262.5,  c:'#4f9b46' },  // DIVERSEY.range centre ((28+88)/2,(242+283)/2) — no zone key: the Diversey Point circle (100,378 r34) never covers the range, so gating on it would keep the dot dim while you stand on the tee line
];
