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
// z-628, then back out to the harbor-mouth lawn corner at (213,-655.5).
// 104 SPIT-LAKEWARD: this corner RECEDED from x 236.278 (montroseFx(-652)) —
// at 236 the mainland sat at the hook mole's own x, the two TIER_DEFAULT
// aprons met across the ~25 m mouth gap, and the shoreline read as touching
// itself (owner 2026-07-19). The mainland at the mouth stays <= x 213 so the
// mole projects into real open water. Ordered south->north so the seaward
// normal points into the cove water; TIER_DEFAULT terraces via the LOCAL fold
// (zero shared rng). Across the cove the hook mole + entrance light read to
// the NE across open water — the golf-to-harbor visual handshake.
export const COAST_BAY_PTS = crChain([
  [232.972,-580],[220,-592],[200,-602],[178,-612],[162,-620],[155,-628],
  [156,-636],[164,-644],[181,-650],[198,-652.5],[208,-654],[213,-655.5],
],2.5);   // return leg strictly monotonic in z — a north-south wiggle here cuts a water sliver into the headland (x-ray pip)

// TERRACED pieces (walkable steps via QUERY_SEGS + folded terraces/piles/faces,
// the COAST_TIP precedent). Ordered so each seaward normal points to the water.
// 104 SPIT-LAKEWARD: the mouth shore starts at the receded bay corner (213),
// and the mole rakes EAST toward its tip — the curl apex (243.4,-697) is the
// local eastmost land (matching the Point apex x 243; terraces step past the
// clamp into the water, the recorded 071 liberty class). Open water S/E/W of
// the tip; the shoreline can never read as touching itself here again
// (gate: tools/shoreline-simple.mjs).
export const MTR_HARBOR_MOUTH = crChain([[213,-655.5],[207,-661],[199,-668],[192,-674.5],[186,-681]],2.5);  // mouth SW entrance shore (receded bay corner -> basin SW jamb)
export const MTR_HOOK_TIP     = crChain([[240.2,-686.3],[241.6,-685.6],[243.2,-689],[243.4,-697],[241.4,-705],[239.2,-710]],1.7);  // hook curl at the south tip (terraces face S/E open water ONLY — the curl's W/SW is seawalled so no apron shelf pokes into the mouth channel; light on top)
export const COAST_MTR_HARBOR_PTS = crChain([[239.2,-710],[240.6,-742],[241,-788],[239,-830],[236,-864]],2.5);  // mole LAKE(outer) terraced face, raked east mid-arm -> continues to the Point (the swapped 070 piece)
// SEAWALLS (flush sheet-pile bulkheads; the basin's west + north walls and the
// mole's inner/basin face — which WRAPS down to the apex so the terraced tip only
// faces open water, no walkable shelf pokes into the mouth). Added to seawallLines().
export function mtBasinWestLine(){  return crChain([[186,-681],[185,-724],[185,-788],[186,-850]],2.5); }  // mainland promenade edge (docks + launch root here)
export function mtBasinNorthLine(){ return crChain([[186,-852],[197,-853],[208,-853],[217,-851]],2.5); }  // basin north wall -> mole root
export function mtMoleWestSeawall(){return crChain([[217,-851],[220,-800],[224,-755],[228,-724],[232,-708],[236,-698],[238.2,-691],[240.2,-686.3]],2.5); }  // mole inner(basin) face: north root -> raking SE, WRAPPING the curl's W/SW to the south rim (deck tapers ~20 m -> ~7 m; terraces only past the wrap)
// harbor entrance light on the hook-tip apex (Belmont HARBOR_LIGHT register)
export const MT_HARBOR_LIGHT = { pos:[240.3,-694], towerH:2.6, r:0.44, white:0xf2ece0, red:0xd23b34, glow:0xffd98a };
// mole STONE-paved walk cap (the breakwater top reads as concrete, not the LAND
// lawn). A flat filled polygon over the mole footprint (frustum-culled, +0 far
// views). 104: traced from the DENSIFIED boundary chains (inner face -> tip
// curl -> lake face; implicit straight closure across the root), consecutive
// duplicates dropped, so the cap tracks the Catmull-Rom shoreline exactly —
// hand chords cut inside the curve and green lawn slivers peeked between cap
// edge and terraces (the old outline's lawn ring around the light, same class).
export const MT_MOLE_PAVE = (()=>{
  const raw=[...mtMoleWestSeawall(),...MTR_HOOK_TIP,...COAST_MTR_HARBOR_PTS],P=[];
  for(const p of raw){const q=P[P.length-1];if(!q||Math.hypot(p[0]-q[0],p[1]-q[1])>0.05)P.push(p);}
  return P;
})();

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
  // the shore sweeps west to the waist (~155,-628) and back to the receded
  // harbor-mouth lawn corner (213,-655.5), where the Montrose block begins
  // (104: kept well WEST of the mole so the spit projects into open water).
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
// LINCOLN PARK growth (112): a THIRD water plane for the south stretch (the main
// WATER plane's south edge is only z +565). Same rules as WATER_N — SEPARATE (so
// the spawn/lakefront surface stays BIT-IDENTICAL), same living-water mat + aShore,
// overlaps the main plane in z 400..565 and sits 0.02 m LOWER so the main plane
// wins there (no z-fight/seam). Frustum-culled lone Mesh (0 draws unless the south
// is framed). Blankets the open lake east of the strip AND the Diversey lagoon hole.
export const WATER_S = { size:820, seg:82, cx:360, cz:740, yOff:-0.02 };   // cx 60->360: the plane's WEST edge tucks to x~-50 (covers the Diversey lagoon hole + the whole east lake to the horizon) so no water shows WEST of the park behind the residential backdrop band (x-118) — the city, not the lake, sits west of Lincoln Park

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

// ---- THE RESERVE EXPANSION (129, owner directive 2026-08-02) ---------------
// The inland unit of the Montrose Beach Dunes Natural Area: the big interior
// lawn WEST of the bike path (issue 041's negative space) becomes a dune-and-
// swale restoration in the reserve's own vocabulary. GEOGRAPHY.md §The RESERVE
// EXPANSION is the law — read it first. NO LAND/coast change: everything sits
// on existing lawn; walkability changes are DATA CARVES only (the 072 dune-
// block precedent: two roped nest cells, non-walkable, NO collider — 065 law;
// rope sits exactly on the cell boundary so the block reads as the rope).
// All dressing uses LOCAL seeds; +0 InstancedMesh buckets (tuft/tree/flower
// bucket growth + two frustum-culled merged Meshes: straw + sand pannes).
export const MONTROSE_RESERVE = {
  // symbolic perimeter (fenceRun collide:false), three runs with GATE gaps:
  // east gate (the trail's west bow — the main entrance), west gate (the
  // Montrose-underpass axis), south gate (the spur to the bay lawn).
  rope:[
    [[153.5,-762],[156.5,-746],[161,-724],[165.5,-702],[168.5,-688],[170,-679],[170.5,-677],
     [156,-674],[138,-672.5],[122,-673.5],[108,-675]],                       // east edge (skirts the trail >=4 m off the bike centerline — the 129 rope law) + south edge -> south gate E side
    [[100,-676.5],[82,-678],[60,-680],[44,-682],[36,-684],[34,-700],[33,-720],
     [33.5,-744],[33,-767]],                                                  // south gate W side -> SW corner -> west gate S side
    [[33,-775],[34,-794],[35,-812],[36,-828],[42,-832],[56,-833.5],[74,-834],
     [94,-834],[112,-833],[128,-832],[138,-831],[146,-828],[151,-820],[152,-808],
     [150,-792],[151,-778],[152.5,-770],[153.5,-766]],                        // west gate N side -> NW corner -> kite-ring N edge -> east gate N side (gap z-766..-762 straddles the corridor at z~-764, >=1.9 m each side)
  ],
  // roped NEST CELLS — interior NON-walkable by data (inReserveCell), rope on
  // the exact boundary (closed loops, fenceRun collide:false).
  cells:[
    { x0:62, x1:90, z0:-802, z1:-780 },   // Cell A — the exclosure sand panne
    { x0:114, x1:140, z0:-740, z1:-716 }, // Cell B — dune-swale habitat
  ],
  // both NEW crushed-limestone ribbons (TRAIL_STYLE.walk), pathSamples-append
  // law; endpoints weld into the trail's WALK ribbon (102 miter law; the Point-
  // loop idiom — compute the sampled weld point, do not double-pave).
  paths:{
    corridor:[[16,-771],[26,-771],[36,-771],[48,-772],[62,-773.5],[76,-773],
              [90,-770.5],[104,-768.5],[118,-767],[132,-766],[144,-765],[152,-764.2],[163,-764]],
    spur:[[104,-768.5],[102,-750],[101,-730],[102,-710],[104,-692],[105,-678],
          // 129 executor-B NUDGE (tools/prop-clearance.mjs, a permanent gate):
          // the staged [138,-641.5],[144,-640.3] ran the spur 0.5 m from the 121
          // micro-discovery BENCH at (143,-641) — its r1.0 collider sat ON the new
          // pavement (need >=w/2-0.05 = 1.15 m). Swung 2.5 m south so the bench
          // now sits BESIDE the spur (2.3 m off the centerline, ~1.1 m of grass to
          // the ribbon edge) instead of in it — a bench on the new path is the
          // better read anyway. The welded endpoint [150.5,-639.3] is untouched.
          [107,-664],[114,-654],[126,-646],[138,-644],[144,-643.2],[150.5,-639.3]],
    width:2.4,
  },
  // the VIEWING PLATFORM (low wooden deck; obeys the FLUSH-ROOT/deck-coverage
  // law — literal rects, rendered top at h, stairs descend SOUTH to the lawn by
  // the corridor, every tread its own walkRect + deckMeshes tag, rise 0.375
  // (<0.45 — the sanctuary's 0.57 predates the law, don't copy it)).
  platform:{ deckRect:{ x0:53.9, x1:58.1, z0:-780.6, z1:-777.4 }, deckY:1.5,
             stairs:[ { x0:55.4, x1:56.6, z0:-777.4, z1:-776.5, h:1.125 },
                      { x0:55.4, x1:56.6, z0:-776.5, z1:-775.6, h:0.75 },
                      { x0:55.4, x1:56.6, z0:-775.6, z1:-774.7, h:0.375 } ],
             wood:0x9c7a4e, rail:0xb7a888,
             scope:{ x:57.2, z:-779.5, aim:[76,-791] } },
  // the signature object: a low wire dome EXCLOSURE over a nest scrape (Cell A)
  exclosure:{ x:76, z:-791, r:1.15, h:0.85, wire:0x9aa4a8, eggs:4 },
  // volunteer monitors (makeNPC wander:0); plovers keep >=8-10 m away (084 rule)
  monitors:[
    { x:84, z:-778, aim:[76,-791], scope:true },    // cell-A shoulder, scope on the exclosure
    { x:150, z:-761, aim:[120,-778], binocs:true }, // east gate, glassing the swales
  ],
  // plover pairs working the cell sand (pack: ground-bird jitter is fine)
  plovers:[ {x:70,z:-796,ry:0.7}, {x:82,z:-788,ry:2.4},   // Cell A pair (beside the exclosure)
            {x:120,z:-730,ry:1.2}, {x:131,z:-722,ry:4.1} ], // Cell B pair
  signs:{
    gateE:{ x:152.5, z:-766.8, ry:2.0, lines:['MONTROSE BEACH DUNES','NATURAL AREA'] },  // faces the trail approach
    gateW:{ x:35.5, z:-766.6, ry:-Math.PI/2, lines:['MONTROSE BEACH DUNES','NATURAL AREA'] }, // faces the underpass mouth
    cellA:{ x:76, z:-780.6, ry:Math.PI, lines:['PIPING PLOVER','NESTING AREA','— please keep out —'] }, // on the A rope, faces the corridor (the 072 register)
  },
  // small laminated placards zip-tied at rope posts (blue-on-white, the refs'
  // 'Fragile dune habitat — Please stay on paths'); placed on the nearest rope
  placards:[ [62,-790],[90,-791],[114,-728],[140,-729],[103,-676.2],[33.2,-771] ],
  benches:[ {x:150,z:-758,ry:Math.PI/2}, {x:59,z:-772,ry:Math.PI} ],
  // dune dressing (ALL local seeds; bucket growth + 2 merged Meshes)
  // 129 executor-B DENSITY RAISE (count 850->3200, straw 520->1800): the staged
  // counts were authored for a dune-sized patch and this unit is ~17,000 m2 —
  // 1 stem per 12 m2 shot as "cones on a lawn", not a restoration (the 072 dune
  // ships at 1 per 9, the 071 Point prairie at 1 per 2.8). props.js also clumps
  // them (~12 per clump, 2 m spread) so bare blowout sand shows BETWEEN clumps,
  // which is the refs' read. Value-only change: one InstancedMesh + one merged
  // straw Mesh, local seeds, +0 draw calls.
  grass:{ seed:0x129a11, count:3200, scaleY:[1.4,2.6], color:0x9fb56b,
          bands:{ period:26, duty:0.62 },   // NE-SW swale bands (density modulation)
          clearD:2.2, cellFringe:3 },
  straw:{ seed:0x129a22, count:1800, h:[0.45,0.95], color:0xcfba7e },
  // bare sand pannes (walkable, visual only) [cx,cz,rx,rz] + the cell floors
  pannes:[ [50,-748,5,3.6],[68,-716,4,3],[96,-806,5,4],[128,-796,6,4],[142,-702,4,3],
           [76,-791,11,8.5],[127,-728,10,7] ],
  sand:0xd9c087,   // the 075 beach tan
  saplings:{ seed:0x129a33, anchors:[[44,-706],[58,-822],[94,-820],[134,-748],[150,-688]],
             per:[2,4], scale:[0.5,0.75] },   // cottonwood scrub — tree-bucket growth, >=6 m off every ribbon
  flowers:{ seed:0x129a44, drifts:[[60,-790,3],[88,-772,2.5],[118,-742,3],[46,-770,2],[149,-767,2]],   // drift 1 sits OFF the platform-scope sightline (57.2,-779.5)->(76,-791) — purple blobs filled the eyepiece foreground at (64,-784)
            perDrift:12, color:0x8f6fc9 },    // beach pea (violet), stems+heads bucket growth
  snowFence:{ panels:[ [154,-768.5,2.0],[155.5,-771,2.0],[31.5,-777,2.0],[31.5,-765,2.0],
                       [60,-835,2.4],[96,-835.5,2.4] ], h:1.1, wood:0xb7a888 }, // [cx,cz,len] slatted wind-catch panels at gates + N edge
  stands:{ lawnfill:[164,-735], reserve:[100,-769], exclosure:[80,-776], overlook:[56,-779] },
};
// reserve nest-cell carve — SHARED by engine walkability and tools/walkprobe.mjs
// (the beachCarved lineage: blocked by DATA, no collider, no ring-trap).
export function inReserveCell(x,z){
  for(const c of MONTROSE_RESERVE.cells)
    if(x>=c.x0&&x<=c.x1&&z>=c.z0&&z<=c.z1)return true;
  return false;
}

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
// only. 102: the hand-off is a SHARED ENDPOINT — TRAIL_MONTROSE[0] IS
// TRAIL_MAIN's last point [208,-572] — and paths.js splices the two ribbons
// with a mitered join (the 071 Point-paths idiom generalized). NEVER reintroduce
// the 069 "overlap so the ribbons join with no gap" line: two full ribbons
// coexisting for ~10 m at identical y double-paved the seam (z-fight band,
// edge notches, doubled dashes — the owner's 2026-07-19 white-fence report).
// 070-073 re-route locally as the harbor/Point/beach carve in.
// 070 re-routes the harbor stretch WEST of the basin (the basin water sits x186-218,
// z-677..-852) so the promenade hugs the mainland harbor edge and never crosses
// water; determinism-safe (pathSamples2, merged after buildProps; scatter caps z>=-800).
// 084: re-authored — the bay routing (sweeping west with the cove, shore
// >=7m east of the bike centerline so the walk ribbon clears the revetment
// top) then the SHIFTED harbor-north alignment (pre-084 points +436 from
// [172,-699] on — the promenade/Point/beach run translates rigidly).
export const TRAIL_MONTROSE=[
  [208,-572],[206,-580],[196,-598],[178,-608],[160,-616],[148,-626],
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
export const WORLD_CLAMP = { xMin:-112, xMax:244, zMin:-1084, zMax:1020 };   // 112 LINCOLN PARK: xMin 14->-112 (the park opens WEST of the Drive), zMax 408->1020 (south to South Pond). The berm/lake keep the player east of x14 north of the corner (walkability, not clamp); LAND opens west only where z>408

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
  cap:null,   // 112 LINCOLN PARK: the old SW-corner cap (z406, x14-23 — the "future Diversey-Lincoln Park gate" hedge at the map's old south terminus) is REMOVED, opening the terminus into the new stretch so the parkland flows continuously south. Determinism-safe: HEDGES uses no shared rng (fixed spots + the Magic Hedge's own local seed), so dropping 2 hedge instances shifts nothing
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
// Finger docks root FLUSH on the basin west shore (mtBasinWestLine) and reach
// EAST into the basin. Deck y derives from SEAWALL_Y.top (issue 016 — a coast
// reshape carries the docks). props.js builds them as individual frustum-culled
// meshes (plankDeck vocabulary) — ZERO new InstancedMesh buckets; the moored
// boats ride the moorings.js buckets (LOCAL seed), never makeBoat (which draws
// world rng). Each deck is a walkRect (walkable boardwalk) via deckRects().
//
// 128 / issue 040 (owner playtest 2026-08-02, "I fall in when I try to walk to
// the end"): x0 was 186 because mtBasinWestLine's CONTROL POINTS are x185-186 —
// but the LAND polygon uses the crChain-SMOOTHED line, which at the four dock
// rows sits at x 184.8 / 184.9 / 185.1 / 185.6. So every deck rooted 0.4-1.2 m
// OUT OVER THE WATER: a non-walkable moat between the lawn and the first plank.
// Walking east you stalled at the gap, the wade rule fired after 0.35 s, and you
// dropped 2.4 m into the basin — the deck was never reachable on foot at all.
// The root now sits INLAND of the smoothed edge at every row (>=1.4 m of deck on
// the grass, the flush-root law) and the tip stays put at x201.
export const MT_FINGER_DOCKS = {
  x0:183.4, len:17.6, halfW:0.95,    // root x183.4 (inland of the smoothed shore at every row) -> tip x201
  rows:[-714,-754,-792,-826],        // 4 finger groups down the west shore
  shoreX:185.6,                      // eastmost smoothed LAND edge across the rows: posts start east of THIS, never west (they'd punch through the lawn)
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
  line:[[217.7,-848],[220.7,-800],[224.7,-755],[228.7,-724],[232.6,-708],[236.4,-698.6],[238.5,-691.9],[240.3,-687.5]] };  // 104: follows the raked inner face + the seawalled curl wrap, ending beside the light
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
  { x:205, z:-659, ry:2.4 },   // 104: pulled inland with the receded bay corner (mouth shore now passes ~(208,-660))
  // 121 MICRO-DISCOVERY benches (append-only — the bench build loop draws no
  // rng, so appends are determinism-free and +0 draw calls). Each gets a
  // sitSpot via TRAIL_DISCOVERY.sits (packs/trail-discovery.js), coords 1:1.
  { x:80,    z:-256,  ry:1.5 },    // Belmont harbor rim, facing east over the basin (tree at 76.2,-253.5 gives shade)
  { x:143,   z:-641,  ry:1.25 },   // the bay waist, facing ENE over the cove water
  { x:195.5, z:-1032, ry:1.55 },   // Montrose beach back-edge, facing the sand + The Dock
];

// 121 TRAIL MICRO-DISCOVERY — the 2026-07-19 design audit's B3 fix: one
// noticeable thing per ~50 m on the stretches that degraded to just-walking
// (the Belmont harbor rim, the spit spine, the Belmont↔Montrose connectors,
// the Montrose beach back-edge). ALL placement data lives HERE (the city-pack
// rule); packs/trail-discovery.js consumes it with a LOCAL seed only. Every
// coord was probed against the live world (tools/tmp/121-siteprobe.mjs):
// clear of both trail ribbons, tree trunks, fences and building footprints.
// `s` is the STRETCH key — the pack merges each stretch's statics into its
// own meshes so bounding spheres stay local and fogcull drops them from every
// far view (the mp/wv draw budgets never see them).
export const TRAIL_DISCOVERY = {
  // deadpan historical plaques: angled cream face on two short wood posts,
  // 'read the plaque' interaction toasts the full gag. ry = face normal yaw
  // ((sin ry, cos ry) points AT the reader's approach).
  plaques:[
    { s:'rim',  x:82,    z:-52,    ry:-1.35,        title:"RAY'S BIG FISH",
      lines:['ON THIS SPOT IN 1974,','A GUY NAMED RAY SAW A','REALLY BIG FISH.'],
      sub:'it did not come back. — lakefront historical society' },
    { s:'spit', x:180.5, z:-130,   ry:0.9,          title:'POINT OF INTEREST',
      lines:['NOTHING HAPPENED HERE','FOR 150 YEARS.','IT WAS LOVELY.'],
      sub:'the trees agree. — lakefront historical society' },
    { s:'golf', x:170,   z:-437.5, ry:0,            title:'HISTORIC AIR SPACE',   // face normal +z = SOUTH, toward the corridor trail (z-433; the first cut's ry:π faced the golf fence)
      lines:['IN 1987 A GOLF BALL','CLEARED THIS FENCE.','WE STILL TALK ABOUT IT.'],
      sub:'nobody caught it. nobody ever will. — lakefront historical society' },
    { s:'bay',  x:162,   z:-722,   ry:Math.PI/2,    title:'THE FOG OF 1953',
      lines:['THE HARBOR FOG OF 1953','ROLLED IN ON A TUESDAY.','NOBODY SAW ANYTHING.'],
      sub:'it rolled back out on thursday. — lakefront historical society' },
    { s:'beach',x:195,   z:-950,   ry:-Math.PI/2,   title:'ABOUT THE LAKE',
      lines:['THE LAKE IS COLD.','IT HAS ALWAYS BEEN COLD.','SWIM ANYWAY.'],
      sub:'— chicago park district, unofficially' },
  ],
  // loafing gull huddles (favors-wrigley makeGull recipe at BIRD_SCALE ~1.55,
  // one juvenile, one head-turned; merged static — never animated). ry = the
  // huddle's mean facing (gulls face the water/wind); n birds, local jitter.
  gulls:[
    { s:'rim',  x:83,  z:-160,  n:5, ry:1.3,  seed:0x1211 },  // on the basin seawall edge
    { s:'spit', x:196, z:-170,  n:4, ry:1.6,  seed:0x1212 },  // peninsula lake-edge lawn
    { s:'golf', x:222, z:-505,  n:5, ry:0.6,  seed:0x1213 },  // revetment-top lawn east of the walk ribbon
    { s:'bay',  x:184, z:-706,  n:5, ry:1.2,  seed:0x1214 },  // Montrose basin west edge, north of the dock root
    { s:'beach',x:205, z:-957,  n:6, ry:2.6,  seed:0x1215 },  // back sand west of the dune rope
  ],
  // painted kindness-rock clusters: squashed toon stones, most wearing one
  // bright painted color (coral/teal/gold/sky/pink), a couple bare grey.
  rocks:[
    { s:'rim',  x:80,    z:-215,   n:6, seed:0x1221 },
    { s:'spit', x:183.5, z:-82,    n:5, seed:0x1222 },
    { s:'golf', x:125,   z:-437.3, n:6, seed:0x1223 },  // corridor, fence-side grass
    { s:'golf', x:207.5, z:-562,   n:5, seed:0x1224 },  // golf-run west strip
    { s:'bay',  x:154,   z:-757,   n:6, seed:0x1225 },
    { s:'beach',x:196,   z:-963,   n:5, seed:0x1226 },
  ],
  // shell/feather micro-picks: tiny prop + halo/core glint, 'pocket the …'
  // pays wallet.pay({key:'trailfind', first:3, repeat:1, cd:6}) — the
  // ECONOMY.md register row. One pocket per spot per session.
  picks:[
    { kind:'feather', x:81,  z:-302  },   // rim, under the lakeside tree
    { kind:'feather', x:187, z:-185  },   // spit treed strip, east side
    { kind:'feather', x:186.5, z:-222 },  // spit treed strip, east side (the west spot sat dead on the md-spit f2 axis — mayor-eclipsed)
    { kind:'shell',   x:218, z:-548  },   // golf-run lakeside strip
    { kind:'feather', x:166, z:-692  },   // bay lawn
    { kind:'shell',   x:203, z:-1030 },   // beach back sand, by the new bench
    { kind:'shell',   x:204, z:-1044 },   // beach back sand, near The Dock
  ],
  // sitSpots for the three 121 benches appended to BENCHES above (coords 1:1).
  sits:[
    { x:80,    z:-256,  ry:1.5,  label:'sit by the harbor' },
    { x:143,   z:-641,  ry:1.25, label:'sit above the cove' },
    { x:195.5, z:-1032, ry:1.55, label:'sit by the sand' },
  ],
};

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
  front:-16,                 // band front line (the L track is the backdrop at x~-8) — the NORTH band (z<=408, east-of-park)
  frontS:-118,               // 112 LINCOLN PARK: the SOUTH band relocates FAR WEST (~x-118) — the Clark/Lincoln residential wall WEST of the park (framing B). The L stops at the corner; the south backdrop is brick flats, not an elevated track
  zr:[-812,408],             // the ORIGINAL span — marched FIRST with the original seed so every existing block stays byte-identical
  zrN:[-1080,-812],          // MONTROSE growth: the north extension, marched SECOND with its OWN seed (existing band unperturbed; same 3 InstancedMeshes -> 0 new buckets)
  zrS:[416,1016],            // 112 LINCOLN PARK south extension: marched THIRD at frontS with its OWN seed (existing band byte-identical; same 3 InstancedMeshes -> 0 new buckets)
  // 120 (issue 034): the SOUTH CITY EDGE. Walking south through the park the
  // horizon ahead was empty sky once the skyline gate let go — nothing "in the
  // distance" at all. This row marches along X at a front z (North Ave / Old
  // Town across the park's south edge), bodies extending SOUTH, into the SAME
  // three InstancedMeshes: +0 draw calls, own seed, existing band untouched.
  southRow:{ z:1046, x0:-160, x1:0, seed:0x51b7d3a9 },   // x1 0 = the Drive. The city south of Lincoln Park sits WEST of LSD; east of it is beach and lake, so no block may stand past the berm
  spacing:[15,30],           // street-ish gaps between buildings
  depth:[8,14],              // how far the blocks extend west
  w:[10,22],                 // frontage widths
  h:[7,16],                  // 2-5 stories
  tallProb:0.12, tallH:[20,26],   // the occasional vintage tower (still modest)
  colors:[0x8a5a44,0x9c6b50,0xb08968,0xa89078,0x8f8578,0x7b6d5f,0x6e5a4e,0xbfae94],
  winColor:0xf2e0b6, winLitProb:0.35,   // sparse warm windows at dusk
};

// 130: a pier's walk surface IS its plank footprint — `deck` is the ONE
// statement of both. Until 130 each pier carried a separate `walk` rect that
// ran 0.5 m PAST the slab in z at both ends: half a metre of standable air
// hanging over open lake at the tip of both piers (the exact reverse of issue
// 040 — a walk surface with no plank under it). Deriving the rect from the
// rendered slab makes the two structurally incapable of diverging, and
// tools/deck-coverage.mjs now hard-fails either direction.
export const DECKS = [
  // peninsula pier juts EAST over the lake; its landward root is the WEST edge
  // (root:'w') — a fascia closes the daylight where it meets the spit (issue 016).
  { deck:[200,216,-120,-90,0.42], root:'w' },
  // corner pier restyled task 021 (owner photos 0395/0399): a pale CONCRETE
  // APRON — white bollards inset along the long edges + tip (north landing
  // open), two red life rings on white posts, NO wooden rails. It juts SOUTH, so
  // its landward root is the NORTH edge (root:'n') — a curb roots it to the top edge.
  { deck:[116,126,373,406,0.42],  root:'n',
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
  berm:{ x0:0, x1:14, z0:-1094, z1:1020, h:1.0, color:0x6f9e5c },   // z1 418->1020 (112 LINCOLN PARK): the berm/road/Drive continue SOUTH as an INTERIOR ribbon (park on BOTH sides). buildLSD splits the berm at the Fullerton underpass gap (LP_UNDERPASS)
  gap:{ z0:653, z1:669 },   // 120: the Fullerton underpass CUT in the berm (structures.js splits the box here; the road rides the LP_UNDERPASS.deck bridge over the sunken passage)
  road:{ x0:2.5, x1:11.5, y:1.02, color:0x8f9298 },
  lane:{ color:0xf2ede0, w:0.16, len:2.4, gap:3.2, count:7 },   // dashed center lines
  underpasses:[105, -400, -600, -771],                        // Belmont z105, Addison -400, Irving -600 (084: at the vignette golf's north), Montrose -771 (084 frame)
  portal:{ w:7, h:4.2, recess:0x211f22, arch:0xd8cbb0 },
};

// ---- THE WEST GRADE (task 120, issue 032; GEOGRAPHY.md STRUCTURAL FIRST #3) --
// Everything WEST of the Drive used to be OPEN LAKE: the Brown Line viaduct's
// bents and the Belmont platform stood IN the water, the Lakeview flats floated
// on it, and from the trail you saw the lake through the gap past the screening
// hedges (owner playtest 2026-07-24). The map's west face is LAND. Two flat
// panels of solid city ground, 0.06 m UNDER the park lawn so LAND/LP_LAND_WEST
// always win the seam, tucked 2 m under the berm's west face.
// The SOUTH panel stops at x -66 so it can never CAP the Diversey lagoon
// (x >= -43) or South Pond (x >= -47) — the 041 grade-carpet law.
// NOT walkable: isWater()'s x>20 gate already reads this BLOCKED, never
// wadeable, so the west-wade guard is untouched. Rendered in coast.js.
export const WEST_GRADE = {
  y:-0.06, color:0x6aa85f,          // a duller, greyer city green than the park lawn 0x7ecb6f — reads as "the other side of the Drive"
  panels:[
    { x0:-300, x1:2, z0:-1100, z1:412, sx:16, sz:200 },    // N: the whole pre-Lincoln-Park map length
    { x0:-300, x1:-66, z0:412, z1:1032, sx:12, sz:60 },    // S: the Lincoln Park band, WEST of LP_LAND_WEST only
    { x0:-66,  x1:2,  z0:1006, z1:1032, sx:8,  sz:4 },     // S2: the wedge between LP_LAND_WEST's DIAGONAL south edge (z 1007..1028) and the S3 panel — 24 m of open lake showed on the south horizon without it. z0 1006 clears South Pond (zMax 1002) so the grade can never cap it (the 041 law)
    { x0:-300, x1:2,  z0:1032, z1:1104, sx:20, sz:8 },     // S3: the ground past the park's south edge, under LAKEVIEW_BAND.southRow. x1 2 stops at the berm — the lake east of the Drive must keep reading as lake
  ],
};
export function onWestGrade(x,z){for(const p of WEST_GRADE.panels)if(x>=p.x0&&x<=p.x1&&z>=p.z0&&z<=p.z1)return true;return false}
// DRY GROUND — the single truth for "this point is solid land, not lake", shared
// by tools/no-solid-in-water.mjs (the permanent guard, issues 032/036) and
// walkprobe. Walkable ground is dry by definition; this adds the two NON-walkable
// dry surfaces: the west grade and the Drive's own embankment.
export function isDryGround(x,z){
  if(onWestGrade(x,z))return true;
  const B=LSD.berm;return x>=B.x0&&x<=B.x1&&z>=B.z0&&z<=B.z1;
}

// ---- THE BROWN LINE 'L' (task 120: moved out of packs/ambient.js) -----------
// The elevated backdrop track west of the Drive. It lived as module consts in
// the pack, which meant no tool could assert that its BENTS stand on ground —
// and for the map's whole life they did not (issue 032). Data module now, so
// walkprobe + tools/no-solid-in-water.mjs check every bent against isDryGround.
export const L_TRACK = {
  x:-8, deckTop:7.6, zN:-1094, zS:316,      // z span = the full north map (the L stops at the Diversey corner; the south band is brick flats)
  bentDx:[-2,2], bentStep:9, bentInset:6,   // two posts per bent, every 9 m, inset 6 m from each end
  platform:{ z:105, dx:3.3, len:18 },       // Belmont platform stub, aligned with the Belmont underpass
};
export function lTrackBents(){
  const out=[];for(let z=L_TRACK.zN+L_TRACK.bentInset;z<=L_TRACK.zS-L_TRACK.bentInset;z+=L_TRACK.bentStep)
    for(const dx of L_TRACK.bentDx)out.push([L_TRACK.x+dx,z]);
  return out;
}

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
export const MAP = { x0:-170, z0:-1124, w:576, h:2184, cw:304, ch:412 };   // 112 LINCOLN PARK: h 1549->2184 (bottom z+425 -> z+1060 = zMax1020 + 40 pad; z0/x0/w/cw/ch unchanged). The taller map compresses vertically in the same 304x412 HUD box -> the 112 baseline.png regen (like 084)
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
  { x:-24, z:520,  c:'#4a9fc9', r:5 },   // Diversey Harbor lagoon (113)
  { x:42,  z:613,  c:'#b0573f', r:5 },   // Theater on the Lake (113)
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
  { id:'the-hook',       n:'the hook',          x:240, z:-695,   c:'#8f6234' },                       // MTR_HOOK_TIP curl — on the mole (104: raked-east tip)
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
  { id:'diversey-harbor',n:'diversey harbor',   x:-24, z:520,    c:'#4a9fc9' },  // 113: the channel lagoon (no zone key — the Montrose ungated precedent)
  { id:'theater-lake',   n:'theater on the lake', x:42, z:613,   c:'#b0573f' },  // 113: the Fullerton point pavilion (real name — geographic/civic)
];

/* ==================================================================== *
 *  LINCOLN PARK — task 111 LAYOUT (STAGED data; NOTHING consumed yet)   *
 * ==================================================================== *
 * The map's growth SOUTH of the Diversey corner: Diversey Harbor lagoon,
 * Theater on the Lake, the FREE zoo, the conservatory + formal garden,
 * South Pond + the Nature Boardwalk + Café Brauer. Authored task 111 from
 * refs/lincoln-park/osm.json (provenance.scout110) + BRIEF.md.
 * GEOGRAPHY.md "Lincoln Park" is the law; this block STAGES it.
 *
 * BIT-IDENTICAL GUARANTEE: every const below is NEW and UNCONSUMED — no
 * builder/pack imports it this task, no rng runs at import (crChain math
 * only), so the world stays byte-for-byte unchanged (the 111 gate: canonical
 * spawn shot ~= baseline.png). 112 wires the bounds/clamp/minimap ONCE and
 * regenerates baseline.png; 113-117 swap in these pieces ONE area per task
 * (the Montrose 069 stub-const model — each piece is its own const so a build
 * touches only its patch and never the others' rng).
 *
 * ---- THE FRAME (framing B — the WEST CROSSING; GEOGRAPHY.md §Lincoln Park) -
 * The berm / DuSable LSD stays x 0-14. The PARK opens WEST into NEGATIVE x;
 * the thin lakefront strip (Lakefront Trail + Theater on the Lake) stays EAST
 * at x>14; the L-track + Lakeview band RELOCATE to the new far-west edge for
 * the southern band. Two STANDING LIBERTIES place the raw osm reaches:
 *   WEST compression:  x_game = 14 - (LSDx(z) - x_raw) * 0.5
 *     (a further 2x squeeze beyond the 1:2 base — the west mirror of Montrose's
 *      ~2.8x east-reach). LSDx(z) is the LOCAL DuSable-LSD east edge, which
 *      DRIFTS EAST going south (~196 at Diversey -> ~324 at Armitage, BRIEF
 *      §1b) so every latitude re-anchors to the Drive, never a fixed x.
 *   SOUTH compression: z_game = 410 + (z_raw - 403) * (2/3)
 *     (the 084 precedent — keep topological ORDER, squeeze the connective
 *      distance so Diversey->zoo->South Pond has no 084-class blank stretch).
 * Positions below are COMPRESSED-frame anchors: SCAFFOLDING for 112-117 to
 * refine against osm.json + these transforms, NOT final vertex law.            */

// FINAL bounds/clamp/minimap 112 applies ONCE (the live WORLD_CLAMP/MAP/LSD/
// LAKEVIEW_BAND stay put THIS task — that is the bit-identical guarantee):
export const LINCOLN_BOUNDS = {
  clamp:{ xMin:-112, xMax:244, zMin:-1084, zMax:1020 },     // was {14,244,-1084,408}: west opens into the park, south reaches South Pond (~z1018)
  map:{ x0:-170, z0:-1124, w:576, h:2184, cw:304, ch:412 }, // z0/x0/w unchanged; h 1549->2184 (bottom z+425 -> z+1060 = zMax1020 + 40 pad). 112 tunes ch for the HUD aspect (a [baseline-regen], like 084)
  westLiberty:0.5,   // x_game = 14 - (LSDx(z) - x_raw)*westLiberty
  southRef:403, southZ0:410, southLiberty:2/3,   // z_game = southZ0 + (z_raw - southRef)*southLiberty
};

// LOCAL DuSable-LSD east edge by raw z (BRIEF §1b) — the anchor the west
// transform re-references at each latitude (the Drive drifts EAST going south).
// Piecewise-linear; interp between rows. Pure data (no rng).
export const LP_LSD_DRIFT = [ [403,196],[600,195],[794,234],[1000,283],[1200,324],[1310,345] ];

// The SKYLINE-BILLBOARD gate (a STRUCTURAL FIRST — GEOGRAPHY.md §Lincoln Park):
// the global downtown billboard (sky.js, world z 504..677, fog:false) would
// interpenetrate contiguous Lincoln Park content and read to the NORTH from
// inside the park. It is Z-GATED: full north of the Diversey corner (the
// signature Belmont read, baseline.png, UNCHANGED), faded across the corner
// transition, hidden in the park. 112/113 add the gate (a player-z uniform/
// visibility flag — the billboard geometry + its mulberry32(0x5c1000) extents
// stay frozen; zero new buckets, zero rng). Keep the fade band (z 450..560)
// content-LOW (lagoon water + docks, no tall halls — the halls start z>=671).
// 120 AMENDMENT (issue 034 — "the buildings that are supposed to be in the
// distance just fade away"): a straight opacity fade dissolved the whole
// skyline into SEE-THROUGH GLASS towers in plain view over ~30 s of walking.
// It now RECEDES then HAZES:
//   z <= holdZ   IDENTITY — no transform, no transparency (baseline.png and
//                every north view stay BYTE-IDENTICAL; non-negotiable)
//   z >  holdZ   the group translates south at `recede` x the player's
//                southward progress (a gentle pull-away, not a dissolve). It
//                stays >= 101 m ahead and everything it overlaps is past
//                fog-opaque (210 m), so no hall is ever seen through it.
//   fadeZ0..1    only once it is ~half size do the materials fade — and their
//                COLOR lerps toward the horizon `haze` as opacity drops, so it
//                reads as atmospheric perspective instead of glass. Hidden past
//                fadeZ1, where the front face is still ~100 m short of the
//                first park hall (z 671).
export const LP_SKYLINE_GATE = { holdZ:403, recede:1.8, fadeZ0:470, fadeZ1:545, haze:0xf6ab84,
  fadeZ0Legacy:403, hiddenSouthOf:545 };

// ---- FEATURE ANCHORS (compressed-frame landmark centres; scaffolding) -------
export const LINCOLN_ANCHORS = {
  diverseyHarbor:{ x:-24, z:520 },   // lagoon mid (west of berm)
  theaterOnLake: { x:30,  z:615 },   // ALONE on the east lakefront strip (x>14)
  fullertonUnderpass:{ x:6, z:661 }, // the FIRST working crossing (through the berm)
  conservatory:  { x:-70, z:706 },   // NW of the zoo, across Fullerton (122: the 116 ruling — vestibule/doors on the SOUTH face; anchor on walkable forecourt)
  batesFountain: { x:-70, z:733 },   // formal-garden axis S of the glasshouse (122: fountain at (-70,726); anchor just S of the basin carve, walkable)
  lilyPool:      { x:-46, z:688 },   // Caldwell lily pool, NE of the conservatory (122 re-stage — scaffolding, future scope)
  zooGate:       { x:-10, z:830 },   // 114: the FRONT DOOR — the EAST gate off Cannon (arch + FREE SINCE 1868); the west lion-plinth gate is secondary at (-93.9,858)
  seaLionPool:   { x:-60, z:820 },   // the hero — historic rock-rimmed pool (114: refined -56,822 -> -60,820 to clear the Lion House NW corner; recorded in GEOGRAPHY.md)
  lionHouse:     { x:-34, z:831 },   // Kovler Lion House (1912 red brick)
  farm:          { x:-79, z:980 },   // Farm-in-the-Zoo (115 RE-SITE to the campus SW — the honest west-reach math; the old (-55,980) staging was the eyeball error), NW of the ruled pond
  southPond:     { x:-30, z:952 },   // pond centre (115 RULING: the pond compresses EAST of the built spur)
  cafeBrauer:    { x:-61, z:908 },   // pond NW shoulder ACROSS the spur (115 re-stage; 117 refines)
  honeycombPav:  { x:-30, z:958 },   // Studio Gang pavilion, boardwalk SE peninsula
};

// ---- COAST / WATER pieces — each its OWN deterministic piece, KEPT OUT of
// COAST_SEGS (the Montrose-stub / COAST_TIP precedent). 113/117 fold each via a
// LOCAL xorshift + append its own walkability SEGS; NO shared world rng shifts.
// Diversey Harbor: a long narrow lagoon west of the berm (Cannon = west bank).
// 113 FINAL: the channel narrows to a ~15 m NECK at Fullerton and slides UNDER
// the crossing (the LP_DIVERSEY.culvert deck covers z 646-668); the south apex
// (z~664) is wrapped UNDER that deck so no walkable water-shelf exists at any
// end (the Montrose terraced-tip law). The polygon is the SINGLE truth for the
// land hole, walkability, minimap AND the 113 seawall (coast.js builds walls
// from these SAMPLED points — the 071 sampled-curve law).
export const LP_DIVERSEY_WATER = crChain([
  [-2,420],[-5,480],[-7,558],[-9,610],[-12,640],[-13,652],   // east bank (berm side), narrowing to the neck
  [-16,664],[-24,664],                                        // south apex UNDER the Fullerton culvert deck
  [-27,652],[-29,640],[-33,610],[-43,558],[-41,480],[-36,420],[-2,420],  // west bank (Cannon side) back north
],3);
// bank x at latitude z from the SAMPLED lagoon polygon (071 law: measure the
// sampled curve, not the control points). {e: east bank, w: west bank} or null.
// Shared by coast.js (seawall/promenade), props.js (finger docks), moorings.js
// (boat rows) and tools/walkprobe.mjs (dock rects) — the single-truth banks.
export function lpDivBank(z){
  let e=null,w=null;const P=LP_DIVERSEY_WATER;
  for(let i=0,j=P.length-1;i<P.length;j=i++){
    const zi=P[i][1],zj=P[j][1];
    if((zi>z)!==(zj>z)){
      const x=P[j][0]+(P[i][0]-P[j][0])*(z-zj)/(zi-zj);
      if(e===null||x>e)e=x;if(w===null||x<w)w=x;
    }
  }
  return e===null?null:{e,w};
}
// ---- DIVERSEY HARBOR dressing data (113) — single truth for coast.js
// (seawall/promenade/culvert/mouth/lamps), props.js (finger docks + sign),
// moorings.js (the third boat field) and walkprobe (dock rects + expects).
export const LP_DIVERSEY = {
  pave:0xc9c3b4, stone:0x93968c, cap:0x7b7f74,              // promenade pave / bulkhead stone / rim cap (113 shot round 1: the first stone 0xa8a696 washed to CREAM in toon sun — the whole west wall+cap read as a sandy beach band from across the channel; cooler greys read as stone block)
  lampPost:0x4a4f46, lampGlow:0xffd9a0,                     // dock-box lamps (posts + warm glow tops)
  boxCream:0xece4cf, deckWood:0x8a6a44, postWood:0x9c6a3a,  // dock boxes + the Montrose dock wood vocabulary
  wallTop:0.14, wallBot:-2.9, paveY:0.02,
  eastPave:{ z0:424, z1:645, xIn:-0.2, w:3.3 },   // east promenade: a 3.3 m path band hugging the bank (capped east at xIn where the strip narrows) — lawn between it and the berm (round 1 paved bank->berm and the whole east half read as a white esplanade)
  westPave:{ z0:424, z1:640, w:2.4 },      // narrow quay walk on the west (Cannon) bank
  // the Fullerton CULVERT: the crossing ground continues WEST over the neck.
  // The rect is WALKABLE (lpLandHit returns true here BEFORE the water
  // subtraction — shared by engine + walkprobe); the deck/parapets/arch are
  // coast.js visuals. Water reads through the north arch face.
  // 120: east edge -8 -> -12 so the deck can never float over the Fullerton
  // underpass's descending WEST ramp (LP_UNDERPASS.rampW head x -11). The arch
  // (x -28..-12) already ended there, and the lagoon's east bank in this z band
  // sits at x ~-14, so the neck stays fully covered.
  culvert:{ x0:-36, x1:-12, z0:646, z1:668, deckY:0.055, parapetH:0.55,
            arch:{ x0:-28, x1:-12, topY:-0.3, rise:0.7 } },
  mouth:{ x:-1.7, z0:417, z1:427 },        // NE head: the Diversey inlet under the Drive (water-under-causeway hint, faces W)
  dockRows:[444,468,492,516,540,564,588,612],  // 8 east-bank finger docks (jut WEST off the promenade)
  dockLen:7.6, dockHalfW:0.9, deckY:0.12,
  slipDz:2.8, slipXOff:3.4,                // moored slip boats beside each finger (x = bankE+0.6-slipXOff)
  westRow:{ z0:452, z1:628, step:6.4, off:4.2 },  // nose-to-tail quay line riding cans off the WEST bank
  headBoats:[[-24,430],[-14,434],[-31,437]],      // a few boats on cans in the wide north head
  lampEvery:36,                            // dock-box lamps along the east promenade
  sign:{ x:-3.0, z:610, ry:-0.4, text:'DIVERSEY HARBOR' },  // real name — geographic/civic (RENAMES law). On the WIDE south promenade (bank e~-9 there), SW-facing toward the underpass/culvert arrival; the head promenade (z<450) is <3 m wide — a 3.2 m board + its ring doesn't fit
};
// ---- THE DECK RECTS (task 128) --------------------------------------------
// THE single definition of every FORMULA-DERIVED plank walk surface in the city
// — the two pier decks, the Belmont fingers, the Montrose fingers and the
// Diversey fingers. props.js pushes these straight into the engine's walkRects
// and tools/walkprobe.mjs reads the SAME function: the walkability of a deck
// must never be stated twice (PITFALLS — "walkprobe + main.js must share
// walkability definitions: put them in the data module"). Issue 040 was exactly
// what that fork buys you: the Montrose rows were mirrored NOWHERE in the probe,
// so 1729 green expects never once asked whether their planks held the player.
//
// Every rect is {id, x1,x2,z1,z2, h} in world metres, h = the walk surface y.
// The RENDERED plank footprint must match each rect — asserted per-frame-free by
// tools/deck-coverage.mjs, which raycasts the real geometry instead of trusting
// these numbers.
export function deckRects(){
  const out=[];
  const fingerY=SEAWALL_Y.top+0.08;                     // low boardwalk flush on the shore grade (~0.12)
  DECKS.forEach((d,i)=>out.push({ id:'pier-'+i, x1:d.deck[0], x2:d.deck[1], z1:d.deck[2], z2:d.deck[3], h:d.deck[4] }));   // 130: DERIVED from the rendered slab, never restated (props.js plankDeck builds from the same d.deck)
  for(const zc of FINGER_DOCKS.rows)
    out.push({ id:'belmont-finger-'+zc, x1:FINGER_DOCKS.x0, x2:FINGER_DOCKS.x0+FINGER_DOCKS.len, z1:zc-FINGER_DOCKS.halfW, z2:zc+FINGER_DOCKS.halfW, h:fingerY });
  for(const zc of MT_FINGER_DOCKS.rows)
    out.push({ id:'montrose-finger-'+zc, x1:MT_FINGER_DOCKS.x0, x2:MT_FINGER_DOCKS.x0+MT_FINGER_DOCKS.len, z1:zc-MT_FINGER_DOCKS.halfW, z2:zc+MT_FINGER_DOCKS.halfW, h:fingerY });
  for(const zc of LP_DIVERSEY.dockRows){                // rooted 0.6 onto the promenade so the deck reads flush (issue-016 flush-root law)
    const root=lpDivBank(zc).e+0.6;                     // 130: x2 is the PLANK root exactly — it used to run root+0.3, a 0.3 m lip of walk surface with no deck under it (harmless over the promenade, but the gate now asserts both directions and a rect states only what is rendered)
    out.push({ id:'diversey-finger-'+zc, x1:root-LP_DIVERSEY.dockLen, x2:root, z1:zc-LP_DIVERSEY.dockHalfW, z2:zc+LP_DIVERSEY.dockHalfW, h:LP_DIVERSEY.deckY });
  }
  return out;
}

// ---- THE COMPLETE WALK-RECT LEDGER (task 130) ------------------------------
// deckRects() states the FORMULA-DERIVED plank rects; four more walk rects are
// stated beside the structures that build them (structures.js pushes each into
// the engine's walkRects as it builds). This function is the ONE place that
// knows the whole set, and every id matches that surface's deckMeshes tag
// EXACTLY, so a ledger row and a rendered plank can be compared by name.
//
// It exists because 128 only ever gated ONE direction. tools/deck-coverage.mjs
// now runs both over THIS list:
//   forward  every rendered plank cell is walkable  (CHECK A/B/C)
//   reverse  every walk-rect cell has a plank under it (CHECK L) — no more
//            invisible ledges, and no rect may quietly outgrow its slab again.
// tools/walkprobe.mjs builds its mirror from this function instead of
// re-deriving four consts by hand, and deck-coverage CHECK W asserts the LIVE
// engine's walkRects array is exactly this set — the 128 pitfall ("a mirror
// does not fail loudly when it is INCOMPLETE") made mechanical.
// Order matches the engine's own push order within each group (the sanctuary
// treads precede their deck, the reserve deck precedes its treads) so a
// first-match onRect() lookup answers identically on both sides.
export function allWalkRects(){
  const out=deckRects();
  { const D=SANCTUARY.deck;
    D.stairs.forEach((st,i)=>out.push({ id:'sanctuary-stair-'+i, x1:st.x0, x2:st.x1, z1:st.z0, z2:st.z1, h:st.h }));
    out.push({ id:'sanctuary-deck', x1:D.x0, x2:D.x1, z1:D.z0, z2:D.z1, h:D.h }); }
  { const B=DIVERSEY.bays.deckRect;                     // ground-tier hitting deck (the upper tier is decorative — deckMeshes tags inst 0 only)
    out.push({ id:'diversey-bay-deck', x1:B.x0, x2:B.x1, z1:B.z0, z2:B.z1, h:B.h }); }
  { const D=THE_DOCK.deckRect;
    out.push({ id:'the-dock-deck', x1:D.x0, x2:D.x1, z1:D.z0, z2:D.z1, h:THE_DOCK.deckY }); }
  { const P=MONTROSE_RESERVE.platform, D=P.deckRect;
    out.push({ id:'reserve-platform', x1:D.x0, x2:D.x1, z1:D.z0, z2:D.z1, h:P.deckY });
    P.stairs.forEach((st,i)=>out.push({ id:'reserve-platform-stair-'+i, x1:st.x0, x2:st.x1, z1:st.z0, z2:st.z1, h:st.h })); }
  return out;
}

// Cannon Dr (BUILT 114 — the zoo's east flank): a modest asphalt park drive
// emerging from the Fullerton culvert crossing and running south between the
// berm and the zoo fence to the pond ground. The old scaffolding polyline ran
// through the campus interior (wrong) and is SUPERSEDED; the lagoon-bank
// northern reach reads as the 113 west-bank quay (recorded in GEOGRAPHY.md).
export const LP_DIVERSEY_CANNON = crChain([[-6,670],[-4,690],[-3.2,720],[-3,760],[-3.4,800],[-3.8,840],[-4.2,880],[-5,920],[-6.3,955],[-7.5,985],[-8.5,1008]],4);
// South Pond: a rounded restored pond hanging off the zoo's south end.
// 115 RULING (resolving the 114 conflict note): the pond compresses EAST of
// the built 114 pond spur (the spur is its west promenade, the east campus
// fence its east bound) — clear of the re-sited farm, the flamingo lagoon,
// primate-house and regenstein-apes. 117 builds it (and must reshape
// LP_BOARDWALK/LP_POND_BRIDGE to this oval + re-site the three LP_TREES
// inside it: (-24,908),(-38,936),(-30,984) — lawn today, water after).
export const LP_SOUTHPOND_WATER = crChain([
  [-44,902],[-30,896],[-18,902],[-14,920],[-13.5,950],[-15,975],
  [-19,995],[-30,1002],[-40,999],[-45,985],[-47,962],[-46,930],[-44,902],
],3);
// The two big land panels 112 renders + walks (SEPARATE from buildLAND so the
// pre-112 world polygon stays byte-identical — see lpLandHit). 112 reconciled the
// 111 scaffolding so the panels contain their features: WEST is the whole park
// (x0 -> Stockton ~x-104), with the Diversey lagoon (LP_DIVERSEY_WATER) as a
// contained WATER HOLE and the zoo/conservatory/South Pond STUBBED as its lawn
// (113-117 carve them). EAST is the continuous thin lakefront strip carrying the
// Lakefront Trail south, bulging at Fullerton for Theater on the Lake; lake beyond.
export const LP_LAND_WEST = [
  [0,412],                              // NE (berm west face x the Diversey corner)
  [0,560],
  [0,655],[-11,655],[-11,667],[0,667],   // 124 (issue 037): the Fullerton TRENCH NOTCH — the west ramp's cut carved OUT of the lawn polygon. The y0 lawn plane rendered right OVER the sunken ramp (the 041 grade-carpet law, LAWN edition), so from every approach the underpass read as slabs on turf; 120's framings all stood inside the cut and never saw it. 130: the notch was x-11.4 while LP_UNDERPASS.rampW.x0 is -11, so the 0.4 m between them belonged to NEITHER — not lawn (notched out), not ramp (lpUnderpassH returns null west of the head): a 0.4 x 12 m INVISIBLE WALL across the whole ramp head, on the only working crossing of the Drive, with paving rendered right over it. The notch must be EXACTLY the ramp span; walkprobe pins both seams.
  [0,720],[0,900],[0,1006],             // EAST edge = the berm's west face (x0)
  [-28,1024],[-64,1028],[-94,1022],     // SOUTH edge (South Pond lawn — stubbed for 117)
  [-104,958],[-104,876],                // SW corner
  [-103,810],[-107,795],[-107,700],[-99,688],  // WEST edge N-bound — 122 (the 116 ruling): the Grandmother's Garden LAND bulge (west edge ~ -107 over z 690..800; clamp -112 + the relocated L band -118 both hold; holds LP_TRAIL_STOCKTON x-92..-99)
  [-88,624],[-80,540],
  [-74,470],[-70,414],                  // NW corner
  [0,412],                              // NORTH edge back to NE (wide lawn north of the lagoon)
];
export const LP_LAND_EAST = [
  [14,402],                    // NW (berm east face, overlapping the pre-112 corner land)
  [44,406],[48,450],           // 120: the north mouth widened 40,410 -> 44,406 so the DUAL trail (bike x30 + walk x34 at the corner weld, issue 033) keeps ground under both ribbons where the strip takes over from the pre-112 corner land (whose shoreline is x~55 at z403)
  [54,536],[54,612],           // Theater-on-the-Lake bulge (113: widened x52->54 so the pavilion's east wall x51 keeps >=1.3 m of ground through z626; z<700 so the millennium CLAMP_FULL_M disjointness holds)
  [48,662],[38,702],           // narrowing south
  [28,726],[16,714],           // SE tip (Fullerton / trail south end)
  [14,667],[25,667],[25,655],[14,655],   // 124 (issue 037): the Fullerton TRENCH NOTCH, east ramp — same lawn-cap carve as LP_LAND_WEST (the 041 law, lawn edition); the cut + retaining walls finally show from the approach. 130: was x25.4 against LP_UNDERPASS.rampE.x1 = 25 — the same 0.4 m dead band as the west head (see LP_LAND_WEST), and the east one is the head you arrive at from the lakefront trail.
  [14,640],[14,470],[14,402],  // WEST edge = the berm's east face (x14)
];

// The FULLERTON UNDERPASS — the map's FIRST WORKING crossing of the Drive (the
// Belmont/Addison/Irving/Montrose gates stay fenced dead-ends; Diversey gets
// NO second pedestrian crossing — its inlet is a water-under-causeway detail).
// A walkable tunnel THROUGH the berm (x0-14) linking the east strip to the west
// park. Axis-aligned E-W (camera-math doctrine for interiors/tunnels).
// 120 REBUILD (issue 035 — the marquee). The 112 version was a flat cut AT
// GRADE: the berm split and the Drive's road slab (y 1.02) ran straight through
// the walker's chest ("solids shouldn't pass through solids"). The path now
// DIPS UNDER the Drive and the Drive is carried OVER it on a bridge deck — the
// real Fullerton underpass. Ramps ~0.28 m/m (inside the walkprobe 0.55 elevator
// guard); headroom 3.62 m under the soffit (over the 3.5 m chase-camera rule,
// issue 024). Walkability is the ANALYTIC lpUnderpassH below — shared by
// main.js surfaceY/walkable() and tools/walkprobe.mjs; the 112 flat walkRect is
// gone. NO colliders (the anti-trap law): the trench rim is a data carve in
// lpBlockedHit so no one can step off a 3 m retaining wall.
// The west ramp stops at x -11: the 113 Diversey CULVERT deck carries Fullerton
// over the lagoon neck immediately west of it (its east edge pulled -8 -> -12 by
// this task so the deck can never float over the descending ramp), and the
// lagoon's own east bank sits at x ~-14 in this z band.
export const LP_UNDERPASS = {
  z0:655, z1:667,                    // the passage (12 m wide)
  floorY:-3.1,
  rampW:{ x0:-11, x1:0 },            // west ramp head x-11 (grade) -> x0 (floor, the berm's west face)
  rampE:{ x0:14,  x1:25 },           // east ramp x14 (floor, the berm's east face) -> head x25 (grade)
  portalE:[14,661], portalW:[0,661], w:9, h:3.4,   // the two OPEN stone mouths at the berm faces
  deck:{ x0:-0.2, x1:14.2, z0:653, z1:669, top:1.02, th:0.5 },   // the LSD bridge over the cut (soffit y 0.52 -> 3.62 m headroom)
  parapet:{ h:0.9, t:0.5 },          // low walls on the bridge, read from the roadway
  rimLip:2.6, rimDepth:0.6,          // blocked band in z beside the OPEN ramps, only where the cut is genuinely deep (walk data, no colliders). 124: 2.2 -> 2.6 so the portal pylons + outward-canting wing walls (issue 037) stand entirely on blocked ground
  wall:0xd8cbb0, floor:0xc9c3b4, soffit:0x9c968a, lamp:0xffd9a0, throat:0x6f665c,   // 124: throat = under-deck wall/floor tone (warm dark stone) — toon light never darkens an interior, so the mouth needs a baked-shadow tone to read as an OPENING from the approach (issue 037)
};

// ---- SHARED LINCOLN PARK WALKABILITY (the engine main.js AND tools/walkprobe.mjs
// import these — NEVER fork the two, the standing pitfall). chicago.js keeps no
// engine imports, so a LOCAL pip lives here. The pre-112 world polygon (buildLAND)
// is untouched; Lincoln Park walks via these separate panels so nothing north of
// the Diversey corner moves (the bit-identical guarantee + the west-wade guard:
// isWater's x>20 gate already blocks wading west of the berm, so the west park is
// simply BLOCKED where it is not LAND — never open water).
function _pipLP(x,z,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],zi=poly[i][1],xj=poly[j][0],zj=poly[j][1];if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/(zj-zi)+xi))c=!c}return c}
// The Diversey Harbor lagoon — a WATER HOLE in the west park (blocked, not wadeable).
export function lpWaterHit(x,z){return z>408&&(_pipLP(x,z,LP_DIVERSEY_WATER)||_pipLP(x,z,LP_SOUTHPOND_WATER));}
// 117: the Nature Boardwalk DECK — a walkable wood ribbon on pilings over the
// pond margin. Point-to-polyline distance to LP_BOARDWALK <= half-width (the
// millennium band law; _segD2 is the shared kernel, hoisted below). Checked in
// lpLandHit BEFORE the pond-water subtraction so the deck walks OVER the water
// (no walkable water-shelf — the Montrose terraced-tip law); the rest of the
// pond stays non-walkable. NO colliders (anti-trap law) — the pilings stand in
// water no walker can reach. Shared engine + walkprobe (NEVER fork).
// 130 (deck-coverage CHECK L): the run is a CAPSULE and _segD2 clamps to the
// segment, so the distance band used to bulge a HALF-DISC of radius HALF past
// BOTH end samples — 4.3 m2 of walk surface with no plank under it, since
// structures.js sweeps the deck between the samples and caps it SQUARE. It sat
// over the two spur welds (walkable ground, so nobody could fall), but a walk
// surface may state only what is rendered. The two end-plane tests below clip
// the caps to the same perpendicular the mitred end quad uses.
export function lpBoardwalkHit(x,z){
  if(z<896||z>1010||x<-52||x>-12)return false;              // ring bbox early-out
  const B=LP_BOARDWALK,N=B.length,h2=LP_BOARDWALK_HALF*LP_BOARDWALK_HALF;
  for(let i=0;i<N-1;i++){                                    // _segD2 inlined: the two OUTER caps must be SQUARE, which needs the projection t
    const a=B[i],b=B[i+1],dx=b[0]-a[0],dz=b[1]-a[1],L=dx*dx+dz*dz;
    let t=L?((x-a[0])*dx+(z-a[1])*dz)/L:0;
    if(t<0){ if(i===0)continue; t=0; }                       // before the FIRST sample = past the NW end cap, never covered by this segment
    if(t>1){ if(i===N-2)continue; t=1; }                     // beyond the LAST sample = past the SW end cap
    const cx=a[0]+t*dx,cz=a[1]+t*dz;
    if((x-cx)*(x-cx)+(z-cz)*(z-cz)<=h2)return true;
  }
  return false;
}
// Walkable Lincoln Park LAND: the west park (minus the lagoon hole) + the east
// lakefront strip. z>408 only (north of the corner is the untouched pre-112 world).
// 113: the Fullerton CULVERT deck reads as LAND (checked BEFORE the water
// subtraction) — the crossing walks OVER the lagoon neck; the water below is
// covered by the coast.js deck. Shared engine + walkprobe (never forked).
export function lpLandHit(x,z){
  if(z<=408)return false;
  const c=LP_DIVERSEY.culvert;
  if(x>=c.x0&&x<=c.x1&&z>=c.z0&&z<=c.z1)return true;
  if(lpBoardwalkHit(x,z))return true;              // 117: the boardwalk deck walks OVER the pond margin (before the water subtraction)
  if(_pipLP(x,z,LP_DIVERSEY_WATER))return false;   // the lagoon is subtracted out
  if(_pipLP(x,z,LP_SOUTHPOND_WATER))return false;  // 117: South Pond subtracted out (non-walkable; x<20 so isWater's west-wade guard keeps it BLOCKED, never jetski-able)
  return _pipLP(x,z,LP_LAND_WEST)||_pipLP(x,z,LP_LAND_EAST);
}
// 113: Theater on the Lake footprint — BLOCKED land, never water (isWater keeps
// reading lpLandHit=true here, so the issue-017 wade class can't fire; walkable()
// in main.js AND walkprobe subtract this — the 052 footprint-carve law, no
// colliders per the anti-trap law).
export function lpBlockedHit(x,z){
  const T=LP_THEATER;
  if(x>=T.x0&&x<=T.x1&&z>=T.z0&&z<=T.z1)return true;
  const B=LP_CAFE_BRAUER;   // 117: Café Brauer hall footprint — SOLID (the 052 sink law; open loggia arms east of the hall stay walkable terrace; NO colliders, anti-trap)
  if(x>=B.x-B.w/2-0.3&&x<=B.x+B.w/2+0.3&&z>=B.z-B.d/2-0.3&&z<=B.z+B.d/2+0.3)return true;
  if(lpUnderpassRim(x,z))return true;   // 120: the Fullerton cut's retaining-wall rim (issue 035) — data carve, no colliders
  return zooBlockedHit(x,z)      // 114: the zoo campus carves (fence band / pool / yard / hall / pier pads)
       ||conservatoryBlockedHit(x,z);  // 122 (the 116 ruling): glasshouse + vestibule footprints + the Bates basin
}
// 122 CONSERVATORY walkability carves — pure data, NO colliders (anti-trap
// law): the glasshouse + vestibule footprints and the Bates basin disc.
// Shared engine + walkprobe via lpBlockedHit above. Beds/lawn stay walkable
// (soft ground cover — the flowers forgive a shortcut).
export function conservatoryBlockedHit(x,z){
  if(z<671||z>731||x<-83||x>-57)return false;          // block bbox early-out
  const C=LP_CONSERVATORY,G=C.glasshouse;
  if(x>=G.x0&&x<=G.x1&&z>=G.z0&&z<=G.z1)return true;   // the glasshouse
  const V=C.vestCarve;
  if(x>=V.x0&&x<=V.x1&&z>=V.z0&&z<=V.z1)return true;   // the vestibule porch
  const B=C.batesFountain,dx=x-B.x,dz=z-B.z;
  return dx*dx+dz*dz<=B.carveR*B.carveR;               // the Bates basin
}
// 114 ZOO walkability carves — pure data, NO colliders (anti-trap law): the
// fence is a thin BLOCKED band under the rail line (both sides walkable, gates
// are gaps between runs), the pool/yard/hall are honest footprint carves.
// Shared engine + walkprobe via lpBlockedHit above.
function _segD2(x,z,ax,az,bx,bz){
  const dx=bx-ax,dz=bz-az,l2=dx*dx+dz*dz;
  let t=l2?((x-ax)*dx+(z-az)*dz)/l2:0;t=t<0?0:t>1?1:t;
  const ex=ax+dx*t-x,ez=az+dz*t-z;return ex*ex+ez*ez;
}
export function zooBlockedHit(x,z){
  if(z<730||z>1012||x>-5.5||x<-98)return false;        // campus bbox early-out
  const P=ZOO.pool,dx=x-P.x,dz=z-P.z;
  if(dx*dx+dz*dz<=P.carveR*P.carveR)return true;       // the Sea Lion Pool
  const Y=ZOO.yard;
  if(x>=Y.x0&&x<=Y.x1&&z>=Y.z0&&z<=Y.z1)return true;   // the lion yard
  const H=ZOO.lionHouse,hx=H.w/2,hz=H.d/2;
  if(x>=H.x-hx&&x<=H.x+hx&&z>=H.z-hz&&z<=H.z+hz)return true;  // Kovler Lion House
  const GE=ZOO.gates.east,GW=ZOO.gates.west,GS=ZOO.gates.south;
  if(Math.abs(x-GE.x)<0.62&&(Math.abs(z-GE.z0)<0.62||Math.abs(z-GE.z1)<0.62))return true;  // east gate pier pads
  if(Math.abs(z-GS.z)<0.55&&(Math.abs(x-GS.x0)<0.55||Math.abs(x-GS.x1)<0.55))return true;  // south gate pier pads
  const GN=ZOO.gates.north;   // 125 north/conservatory gate: ONLY the two pier pads carve — the 6.8 m between them is walkable by construction
  if(Math.abs(z-GN.z)<0.6&&(Math.abs(x-GN.x0)<0.6||Math.abs(x-GN.x1)<0.6))return true;
  if(Math.abs(x-GW.x)<GW.plinth.w/2+0.35&&Math.abs(z-GW.z)<GW.plinth.d/2+0.35)return true; // west lion plinth
  const b2=ZOO.fence.band*ZOO.fence.band;
  for(const run of ZOO.fence.runs)
    for(let i=0;i<run.length-1;i++){
      const a=run[i],b=run[i+1];
      if(x<Math.min(a[0],b[0])-0.5||x>Math.max(a[0],b[0])+0.5)continue;
      if(z<Math.min(a[1],b[1])-0.5||z>Math.max(a[1],b[1])+0.5)continue;
      if(_segD2(x,z,a[0],a[1],b[0],b[1])<=b2)return true;   // the fence band
    }
  // ---- 115 habitat + farm carves (pure data, NO colliders — anti-trap) ----
  const HB=ZOO.habitats;
  {const dx2=x-HB.macaque.x,dz2=z-HB.macaque.z;
   if(dx2*dx2+dz2*dz2<=HB.macaque.blockR*HB.macaque.blockR)return true;}  // snow-monkey knoll
  const PG=HB.penguin;
  if(x>=PG.x0&&x<=PG.x1&&z>=PG.z0&&z<=PG.z1)return true;                  // penguin cove
  const PL=HB.polar;
  if(x>=PL.x0&&x<=PL.x1&&z>=PL.z0&&z<=PL.z1)return true;                  // polar tundra
  const FL=HB.flamingo;
  if(x>=FL.x0&&x<=FL.x1&&z>=FL.z0&&z<=FL.z1)return true;                  // flamingo lagoon
  const FY=ZOO.farmyard,B=FY.barn,FH=FY.farmhouse;
  if(x>=B.x-B.w/2&&x<=B.x+B.w/2&&z>=B.z-B.d/2&&z<=B.z+B.d/2)return true;  // the gambrel barn
  if(x>=FH.x-FH.w/2&&x<=FH.x+FH.w/2&&z>=FH.z-FH.d/2&&z<=FH.z+FH.d/2)return true;  // farmhouse
  {const dxw=x-FY.windmill.x,dzw=z-FY.windmill.z;
   if(dxw*dxw+dzw*dzw<=0.9*0.9)return true;}                              // windmill legs
  const pb2=FY.paddock.band*FY.paddock.band;
  for(const run of FY.paddock.runs)
    for(let i=0;i<run.length-1;i++){
      const a=run[i],b=run[i+1];
      if(x<Math.min(a[0],b[0])-0.5||x>Math.max(a[0],b[0])+0.5)continue;
      if(z<Math.min(a[1],b[1])-0.5||z>Math.max(a[1],b[1])+0.5)continue;
      if(_segD2(x,z,a[0],a[1],b[0],b[1])<=pb2)return true;  // split-rail band (the east gate is a gap between runs — walkable by construction)
    }
  return false;
}
// point-in-campus (definePlace contains + tools) — the closed perimeter poly
export function zooInside(x,z){return z>735&&z<1008&&x<-8&&x>-96&&_pipLP(x,z,ZOO.perimeter);}
// The Fullerton underpass floor — a flat walk rect through the berm (surfaceY 0).
// 120: the SUNKEN Fullerton crossing's walk surface — null off the footprint,
// else the y (ramp down / tunnel floor / ramp up). THE shared definition: main.js
// surfaceY + walkable(), and tools/walkprobe.mjs mirror it by importing this
// function (never a fork — the 052 law).
export function lpUnderpassH(x,z){
  const U=LP_UNDERPASS;
  if(z<U.z0||z>U.z1||x<U.rampW.x0||x>U.rampE.x1)return null;
  if(x<=U.rampW.x1)return U.floorY*((x-U.rampW.x0)/(U.rampW.x1-U.rampW.x0));          // -11 (0) -> 0 (floorY)
  if(x<U.rampE.x0)return U.floorY;                                                     // the level tunnel under the Drive
  return U.floorY*(1-(x-U.rampE.x0)/(U.rampE.x1-U.rampE.x0));                          // 14 (floorY) -> 25 (0)
}
export function lpUnderpassHit(x,z){return lpUnderpassH(x,z)!==null;}
// The trench RIM beside the open ramps: a blocked lip so no one walks off a 3 m
// retaining wall into the cut. Only where the cut is OPEN (outside the berm,
// which is non-walkable anyway). Folded into lpBlockedHit.
export function lpUnderpassRim(x,z){
  const U=LP_UNDERPASS;
  if(x<U.rampW.x0||x>U.rampE.x1)return false;
  if(!((z>U.z1&&z<=U.z1+U.rimLip)||(z<U.z0&&z>=U.z0-U.rimLip)))return false;
  const h=lpUnderpassH(x,(U.z0+U.z1)/2);          // only beside the DEEP part — a ramp head has no wall to fall off
  return h!==null&&h<-U.rimDepth;
}

// ---- THEATER ON THE LAKE (113) — the 1920 Perkins Prairie-brick venue, ALONE
// on the east lakefront strip at Fullerton. Hand-modeled (Commons imagery gap —
// BRIEF §11); the arcade band is the read. RECORDED LIBERTY (GEOGRAPHY.md): the
// real ~35x20 E-W footprint turns 90° (long axis N-S, 18x26) to fit the
// 111-planned strip bulge (x<=52). Footprint = the lpBlockedHit carve;
// structures.js builds from this const. Real name stays (geographic/civic).
export const LP_THEATER = {
  x0:33, x1:51, z0:600, z1:626,        // footprint carve — walls sit ON this rect
  brick:0x8e4f3c, trim:0xd9ccb2, roof:0x40604f, glow:0xffe2ae, door:0x5c4632, base:0x9a9282,
  wallH:4.6, roofH:3.0, eave:1.15,     // brick walls + broad low hip roof w/ deep eaves
  archW:2.1, archH:3.1,                // arched openings: rect + semicircle top (archW/2 radius)
  nLong:7, nShort:4,                   // arch rhythm: 7 on the west/east (26 m) faces, 4 on the ends
  sign:'THEATER ON THE LAKE',
};

// ---- THE ZOO — a FENCED-but-OPEN campus (free admission; open gates, no
// ticket booth). CAMPUS ARMATURE BUILT task 114: fence runs + 3 open gates +
// (125 adds a FOURTH — the north/conservatory garden gate + its northWalk) +
// the Sea Lion Pool + Kovler Lion House + lion yard + paver loop/spur/Cannon.
// Animals are NPC/pack register (culled >145 m), NEVER instanced buckets
// (§BUILD-PLAN). Walkability: zooBlockedHit below (data carves, NO colliders —
// the anti-trap law), folded into lpBlockedHit so engine + walkprobe share it.
export const ZOO = {
  // closed polygon (spans the gate gaps) — definePlace contains + minimap
  perimeter:[ [-10.2,738],[-88,741],[-92,790],[-93.5,853],[-94.4,863],[-95,900],[-94,950],[-93,1000],[-72,1004],[-53,1005.5],[-45,1005.5],[-28,1005],[-12,1003],[-10,940],[-9,900],[-9.6,860],[-10.2,825],[-10.2,738] ],
  // the ornamental fence = these RUNS (gates are the gaps between them);
  // POSTS/RAILS tail-append, collide:false — blocking is the data band below
  fence:{ runs:[
    [[-10.2,738],[-66,740.15]],                       // north A (gap x -74..-66 = NORTH/CONSERVATORY GATE, task 125)
    [[-74,740.46],[-88,741]],                         // north B
    [[-88,741],[-92,790],[-93.5,853]],                // west A (gap 853-863 = WEST GATE)
    [[-94.4,863],[-95,900],[-94,950],[-93,1000]],     // west B
    [[-93,1000],[-72,1004],[-53,1005.5]],             // south A (gap x -53..-45 = SOUTH GATE)
    [[-45,1005.5],[-28,1005],[-12,1003]],             // south B
    [[-12,1003],[-10,940],[-9,900],[-9.6,860],[-10.2,835]],  // east A (gap 825-835 = EAST GATE)
    [[-10.2,825],[-10.2,738]],                        // east B
  ], band:0.45, postH:1.3, spacing:2.7, color:0x2f3430 },
  gates:{
    east:{ x:-10.2, z0:825, z1:835, pierW:0.9, pierH:3.4,   // THE FRONT DOOR off Cannon: brick piers + iron arch + open leaves
           sign:'LINCOLN PARK ZOO', register:'FREE SINCE 1868',
           pad:{ x0:-16, x1:-8, z0:824, z1:836, y:0.081 } },   // top of the path y-ladder (>=0.006 over the 0.074 walks crossing under it)
    west:{ x:-93.9, z:858, z0:853, z1:863,                  // the lion-plinth secondary gate (Stockton side; ref identity)
           plinth:{ w:2.8, d:2.2 }, sign:'LINCOLN PARK ZOO',
           bollards:[[-92.2,854.5],[-92.2,861.5]] },
    south:{ z:1005.5, x0:-53, x1:-45, pierW:0.7, pierH:2.6 },  // plain piers toward the Farm/pond ground (115/117)
    // 125 (owner playtest 2026-07-26) — THE GARDEN GATE on the CONSERVATORY side.
    // Sited on the x -70 garden axis the vestibule doors / AXIS_N/S / Bates /
    // the garden loop's south point already share. Same vocabulary as the east
    // front door (brick piers + limestone caps + open iron arch + lettering +
    // swung-back leaves + paver pad) but DELIBERATELY SHORTER (pierH 3.0 vs
    // 3.4) so Cannon stays the hero. Register reads ALWAYS FREE — welcoming,
    // never controlled. The jamb x's are exactly the north-run gap ends, so the
    // fence and the gap can never disagree.
    north:{ z:740.31, x0:-74, x1:-66, pierW:0.85, pierH:3.0,
            sign:'LINCOLN PARK ZOO', register:'ALWAYS FREE',
            pad:{ x0:-75.5, x1:-64.5, z0:736.6, z1:744.4, y:0.081 } },   // top of the y-ladder (>=0.006 over the 0.074 walk running under it)
  },
  pool:{ x:-60, z:820, waterR:6.3, rimR:7.0, rimH:0.75, carveR:7.5, railR:7.25, railH:0.95,
         water:0x4e8a7a, rim:0x9a988c, rock:0x8f8f88, rock2:0x71726a, shelfY:0.55,
         grotto:{ x:-62.5, z:815.5 }, sign:'SEA LIONS' },   // stacked-slab grotto mound (B&W ref) carries the hanging sign + the haul-out shelf
  yard:{ x0:-32, x1:-18, z0:811, z1:824.6, dirt:0xb59a72, ledge:0xa8916c, rock:0x8f8f88, railH:1.05 },  // z1 laps the house carve 0.1 — no walkable sliver between yard + hall
  lionHouse:{ x:-34, z:831, w:34, d:13, wallH:5.6, roofH:3.2, eave:1.25,
              brick:0x8e4f3c, trim:0xd9ccb2, roof:0x527a58, glow:0xffe2ae, door:0x5c4632, base:0x9a9282,  // Theater palette reuse (merged-bucket fold); roof = the green-tile signature (named +1 merged color)
              nLong:9, nShort:3, archW:2.0, archH:3.6,
              monitor:{ w:16, d:5, h:2.2, roofH:1.6 },      // the clerestory ridge monitor (1912 silhouette)
              sign:'KOVLER LION HOUSE' },
  // the red-brick-paver MAIN LOOP (closed — weldSeam), the limestone pond SPUR
  // (T off the loop at [-44,847]) and Cannon Dr; all pathSamples2 ribbons
  loop: crChain([[-11.5,830],[-14,820],[-20,806.5],[-30,802],[-42,801.5],[-53,806],[-64,810],[-69.5,820],[-66,834],[-56,842],[-44,847],[-31,849],[-20,845],[-13,837],[-11.5,830]],3),
  loopStyle:{ width:2.2, color:0x9a5a44, y:0.066 },   // Searle-plaza herringbone brick read (below walk 0.074, above dashes)
  spur: crChain([[-44,847],[-46,866],[-50,905],[-52,962],[-48.9,1005.5],[-48,1012]],4),
  // 125 — THE CONSERVATORY CONNECTION. Limestone (st.walk, y 0.074) from the
  // garden loop's EXACT (-70,735) control point, south through the new north
  // gate, down the empty north lawn, threading the 6 m gap between the Polar
  // tundra (x <= -74.5) and the Penguin cove (x >= -68.5) onto walkN's EXACT
  // (-71,791.5) control point. Shared exact endpoints at BOTH ends -> both
  // seams mitre, no dead end. Clear of every zooBlockedHit carve (probed).
  northWalk: crChain([[-70,735],[-70,748],[-70.2,763],[-70.8,778],[-71,791.5]],3),
  place:{ fadeS:2.2,   // inside-the-zoo ambience cell (framework definePlace)
          grade:{ fogColor:0x9fbe8d, fogNear:30, fogFar:175, ambGround:0x7fb474, ambI:0.98, sunI:0.85 },
          amb:{ ext:0.55, bird:1.5 } },
  // ---- 115 HABITATS (BUILT) — each a small diorama: rockwork/water/rails
  // from structures.js buildZooHabitats (statics, zero rng), the animal cast +
  // idle motion from packs/zoo-habitats.js (pack meshes, culled — NEVER
  // instanced buckets). Blocking = data carves in zooBlockedHit below (NO
  // colliders, the anti-trap law); rails are POSTS/RAILS collide:false.
  // walkN = the NORTH HABITAT WALK (limestone): T off the loop at its
  // (-42,801.5) control point, west past the three dioramas, rejoining the
  // loop at (-69.5,820) — no dead ends. Plate positions are checked ≥2.5 m off
  // ribbon centerlines + off every lp-* stand/camera (the furniture-at-stands
  // trap).
  habitats:{
    walkN: crChain([[-42,801.5],[-45,793],[-53,789.5],[-63,789],[-71,791.5],[-75.5,799],[-74,810],[-69.5,820]],3),
    macaque:{ x:-49.5, z:796.2, moundR:2.9, railR:3.5, blockR:3.6,       // Regenstein Macaque Forest: stacked-slab knoll + steaming spring pool + a grooming pair
              rock:0x8f8f88, rock2:0x71726a, pool:{ x:-50.6, z:795.0, r:1.2, water:0x4e8a7a },
              sign:{ x:-46, z:799.5, ry:1.1 }, plate:'THE SNOW MONKEYS', sub:'Regenstein Macaque Forest' },
    penguin:{ x0:-68.5, x1:-57.5, z0:775.5, z1:786,                      // Pritzker Penguin Cove: pale rockwork bowl + water wedge; huddle + one mid-waddle
              rock:0xc9c3b4, rock2:0x9a988c, shelfY:0.5,
              water:{ x0:-67, x1:-60.5, z0:777, z1:783, y:0.28, color:0x3e6e7e },
              rail:[[-68.5,786.6],[-57.5,786.6]],                        // south viewing rail along the walk
              sign:{ x:-57, z:786.8, ry:0.6 }, plate:'THE PENGUINS', sub:'Pritzker Penguin Cove' },
    polar:{ x0:-89, x1:-74.5, z0:778, z1:792.5,                          // Walter Family Arctic Tundra: pale rock terrace + plunge pool + one big chunky white bear
            rock:0x9a988c, rock2:0x8f8f88, dirt:0xb59a72,
            pool:{ x:-78.5, z:789, r:2.6, y:0.18, color:0x3e6e7e },
            rail:[[-89,793.2],[-74,793.2],[-74,779]],                    // south face + east face rails
            sign:{ x:-75, z:792.8, ry:0.75 }, plate:'THE POLAR BEAR', sub:'Walter Family Arctic Tundra' },
    flamingo:{ x0:-34.5, x1:-21.5, z0:855.5, z1:868.5,                   // Waterfowl Lagoon: green water + mud bank + a pink one-legged cluster
               bank:0xc4a878, water:0x6a9a58, waterY:0.12,
               rail:[[-35,854.8],[-21,854.8]],                           // north viewing rail toward the loop
               sign:{ x:-26, z:853.8, ry:2.99 }, plate:'THE FLAMINGOS', sub:'Waterfowl Lagoon' },   // faces NORTH toward the loop viewers (ry -0.15 showed its back — d115 diag)
  },
  // FARM-IN-THE-ZOO (115 RE-SITE to the campus SW — the honest west-reach
  // math; GEOGRAPHY.md standing liberty). The red GAMBREL barn is the read.
  // lane = the brick FARM LANE: T off the spur at its (-52,962) control point,
  // around the paddock's east side, rejoining the spur at z~997 (loopStyle
  // brick y 0.066 tucks UNDER the limestone spur at both junctions). The
  // paddock is ENTERABLE through the east gate gap (pettable register).
  farmyard:{
    lane: crChain([[-52,962],[-61,956.5],[-68,959.5],[-70.5,967],[-70.5,981],[-67.5,993],[-59,999],[-52.5,1000.5],[-49.4,997]],3),
    barn:{ x:-80.5, z:964.5, w:13, d:9,                                  // long axis E-W; the GAMBREL gable faces EAST down the lane
           eaveH:3.4, breakH:5.4, ridgeH:6.6,
           red:0xa8402e, trim:0xe8e2d2, roof:0x9a9282, door:0x6e3020 },
    farmhouse:{ x:-70, z:950, w:7, d:6, wallH:3.0, roofH:2.2,            // yellow clapboard + porch
                clap:0xe0c368, roof:0x8a6a50, trim:0xf0ece0 },
    windmill:{ x:-89.5, z:955, h:8.5, wheelR:1.5 },                      // tower/vane static; the WHEEL spins in the pack
    paddock:{ x0:-90, x1:-72, z0:972, z1:998, straw:0xd9c087,
              runs:[                                                     // split-rail runs; the EAST GATE is the gap z 982-986
                [[-90,972],[-72,972]],                                   // north
                [[-72,972],[-72,982]],                                   // east A (gap 982-986 = GATE)
                [[-72,986],[-72,998]],                                   // east B
                [[-72,998],[-90,998]],                                   // south
                [[-90,998],[-90,972]],                                   // west
              ], band:0.4, postH:1.05, spacing:2.4, color:0x8a6a44 },
    cow:{ x:-77.5, z:983, ry:1.35 }, goat:{ x:-75, z:990, ry:0.6 }, hens:{ x:-74.5, z:979 },
    sign:{ x:-65.5, z:962.5, ry:2.5, title:'FARM-IN-THE-ZOO', sub:'a working farm in the city' },
  },
  // Remaining hall SCAFFOLDING (unconsumed) — 115 re-staged clear of
  // everything built (walkN/lane/habitats/farm + the ruled pond). penguin-cove
  // + polar-tundra hall boxes are GONE (built as open dioramas above).
  halls:[
    { id:'sea-lion-pool',  x:-60, z:820, r:6,  round:true, built:114 },
    { id:'kovler-lion',    x:-34, z:831, w:34, d:13, ry:0, built:114 },
    { id:'searle-center',  x:-20, z:786, w:16, d:10, ry:0, stack:true },  // Searle visitor center + the red-brick smokestack
    { id:'bird-house',     x:-30, z:772, w:16, d:12, ry:0 },              // McCormick Bird House
    { id:'african-journey',x:-52, z:765, w:20, d:14, ry:0 },              // Regenstein African Journey (giraffes; 115 re-stage N of the penguin cove)
    { id:'childrens-zoo',  x:-85.5,z:806, w:11, d:11, ry:0 },             // Pritzker Children's Zoo (115 re-stage clear of walkN + the west fence)
    { id:'small-mammal',   x:-80, z:866, w:16, d:12, ry:0 },              // (115 re-stage clear of the west-gate through-line)
    { id:'primate-house',  x:-26, z:880, w:14, d:12, ry:0 },              // Helen Brach Primate House
    { id:'regenstein-apes',x:-80, z:890, w:16, d:12, ry:0 },              // African Apes (115 re-site WEST, clear of the ruled pond)
  ],
  fixtures:[  // ride/attraction fixtures (RENAMES.md: brand marks -> generic in-game names)
    { id:'carousel',  x:-42, z:813, r:4, name:'Endangered Species Carousel' },  // AT&T brand dropped (115 re-stage inside the loop, clear of walkN; 119 re-judges the lp-lion-house f1 view when building)
    { id:'zoo-train', x:-78, z:830, w:6, d:3, name:'the Zoo Train' },           // Lionel -> generic (115 re-stage clear of the loop west bend)
  ],
};

// ---- CONSERVATORY + FORMAL GARDEN + Bates fountain + Lily Pool (BUILT 122;
// the GEOGRAPHY.md 116 ruling, owner-approved 2026-07-26 — the block re-sites
// NORTH of the built zoo fence, the vestibule flips to the SOUTH face per the
// refs, Grandmother's Garden rides a small LAND bulge west across Stockton).
// structures.js builds the glasshouse/garden/fountain from this const (zero
// rng); props.js grows the beds (index-gated 2nd seed, +0 buckets);
// packs/lp-conservatory.js owns the ambient beats; walkability = the carves
// in conservatoryBlockedHit above (shared engine + walkprobe, NO colliders).
export const LP_CONSERVATORY = {
  // the glasshouse: nested OGEE glass pavilions (the 9719113515 ref: curved
  // eave slopes sweeping up in a soft double curve to flat verdigris copper
  // ridge caps — NOT plain round arches) on a rusticated warm sandstone base —
  // the tall PALM HOUSE mass center, a smaller front gable bell south of it,
  // lower flanking wings E/W; the pale silver-green GLASS pyramid VESTIBULE
  // (the owner's photo correction — glass, not opaque white) fronts SOUTH over
  // the garden axis (dark-green awning band + FREE ADMISSION door glow — no
  // walkable interior, the 111-plan decision).
  glasshouse:{ x0:-81, x1:-59, z0:673, z1:703 },   // footprint carve — walls/base sit ON this rect
  palm:  { x:-70, z:684, w:14,  d:18, eaveH:3.4, capH:10.5, capW:5.2, capD:7   },  // the big ogee bell (flat copper cap + open ridge LANTERN — palm heads poke through)
  gable: { x:-70, z:697, w:9.6, d:11, eaveH:2.6, capH:7.0,  capW:3.4, capD:4.2 },  // the front (south) bell behind the vestibule
  wings: [ { x:-78.9, z:688, w:4.2, d:26, eaveH:2.0, capH:5.2 },                   // W wing (long axis N-S)
           { x:-61.1, z:688, w:4.2, d:26, eaveH:2.0, capH:5.2 } ],                 // E wing
  vestibule:{ x:-70, z:705.4, w:5.8, d:4.8, apexH:4.8,                             // the GLASS pyramid porch (pale framing + glass slopes)
              awning:{ w:11.5, y:2.55, drop:0.85 },
              sign:'LINCOLN PARK CONSERVATORY', register:'FREE ADMISSION' },       // real names — geographic/civic (RENAMES law)
  vestCarve:{ x0:-73.2, x1:-66.8, z0:703, z1:708 },                                // vestibule footprint carve
  glass:0xcfe4d8, glassWarm:0xe8eec6, frame:0xbcd6c4, copper:0x6fa08a,             // pale mint glass / warm interior glow tint / rib frame green-white / verdigris caps
  stone:0x9a7a56, stoneDark:0x7c5f42, awnGreen:0x2e4f38, doorGlow:0xffe2ae,        // rusticated base / base shadow course / awning + lettering band / door glow
  palmDark:0x2d5a3a, palmDark2:0x1f4030, trunk:0x6e5638,                           // interior/above-ridge palm silhouettes
  conifers:[ [-76,704.5,1.1],[-64,704.5,1.2],[-80.5,707,0.9],[-59.5,707,0.95] ],   // dark evergreen sentinels flanking the vestibule (the ref's screen planting; x,z,scale — thin trunks, no carve)
  // FORMAL GARDEN on the axis south of the doors (z 712..737, up to the zoo's
  // north fence z~740 — true adjacency): a central lawn axis between hot
  // parterre ribbon beds (the ref: reds/magenta/silver-white edging), straw
  // fountain grasses, globe lamps, and the Bates fountain ON the axis.
  formalGarden:{ x0:-84, x1:-56, z0:712, z1:737 },
  batesFountain:{ x:-70, z:726, basinR:3.2, rimH:0.5, rimW:0.6, carveR:3.55,       // Eli Bates "Storks at Play" (person; KEPT real). THE READ (BATES-FOUNTAIN.md):
                  reedH:2.7,                                                       // a LOW BROAD grey granite sitting-ledge ring around a tall near-black bronze
                  apronR:5.2, apron:0x8a5a40,                                      // reed/cattail THICKET; 2 beak-spouting storks + 3 merboys-with-fish read as
                  water:0x4e8a7a, stone:0x9a988c,                                  // rim-height silhouettes at its base; a modest low plume (Millennium spray
                  bronze:0x4f3a28, reedBronze:0x2a2118 },                          // vocab), NOT a jet; red-brown paved apron disc under the ring walk
  beds:[  // ribbon parterre beds (SOFT ground — walkable, no carve; props.js fills them; c indexes bedColors)
    { x0:-79,   x1:-74,   z0:715.5, z1:721,   c:0 },   // NW panel
    { x0:-66,   x1:-61,   z0:715.5, z1:721,   c:1 },   // NE panel
    { x0:-79,   x1:-74,   z0:731,   z1:735.5, c:1 },   // SW panel
    { x0:-66,   x1:-61,   z0:731,   z1:735.5, c:0 },   // SE panel
    { x0:-83.4, x1:-81.6, z0:714,   z1:735,   c:2 },   // W edge ribbon
    { x0:-58.4, x1:-56.6, z0:714,   z1:735,   c:2 },   // E edge ribbon
  ],
  bedColors:[0xc23b4a,0xb03a8c,0xdfe0d2],   // hot red / magenta / silver-white edging (the ref parterre palette)
  flora:{ bedSeed:0x22b3d51, bedPer:26,      // flowers per parterre bed (6 beds -> 156; props.js index-gated 2nd-seed grow, +0 buckets)
          gmSeed:0x22d5f73, gmPer:14,        // flowers per Grandmother's clump (7 clumps -> 98)
          tuftSeed:0x22c4e62, tufts:90, tuftScaleY:[1.5,2.6],   // feathery straw grasses in the formal garden (height IS the read — instance tint is documentary)
          soil:0x5c4632 },                   // low soil slab under each parterre bed (pooled door-brown -> +0 draws)
  lamps:[ [-73.4,713.4],[-66.6,713.4],[-74.2,730.4],[-65.8,730.4] ],   // white globe lamps flanking the axis (the ref; clear of walks/beds/ring)
  // GRANDMOTHER'S GARDEN west across the Stockton walk — looser cottage-style
  // bed clumps in open lawn (the palette contrast) + the crossing's bench focal
  grandmothers:{ x0:-103, x1:-96.5, z0:706, z1:788, bench:{ x:-101.5, z:714, ry:1.57 },
                 clumps:[ [-100.5,712,2.2],[-98.3,721,1.8],[-101.5,731,2.6],[-98.8,743,2.0],[-101,757,2.4],[-98.5,769,1.9],[-100.5,781,2.2] ],  // [x,z,r] loose drifts down the west lawn
                 colors:[0xf2c14e,0x9a3f8c,0x6b3fa0,0xe8853a] },   // goldenrod/liatris/ironweed/cottage-orange — the informal side
  lilyPool:{ x0:-52, x1:-40, z0:676, z1:700 },     // Alfred Caldwell Lily Pool re-staged NE + clear (scaffolding — future scope)
};
// Garden WALKS (122, the 116 plan) — all pathSamples2 ribbons (LP is
// scatter-free ground; ribbonOn is rng-free). The LOOP rings the beds (closed —
// first==last -> weldSeam); the basin RING circles Bates (closed); the AXIS
// stubs run door threshold -> loop -> ring on the vestibule axis (shared exact
// endpoints -> mitered seams); the EAST connector Ts off the loop's east point
// into LP_TRAIL_PARK's (-8,714) control point; the STOCKTON crossing runs the
// loop west point THROUGH the new (-93.2,716) LP_TRAIL_STOCKTON control point
// to the Grandmother's bench focal.
export const LP_GARDEN_LOOP = crChain([[-70,710.5],[-78,714],[-81,722],[-78.5,731],[-70,735],[-61.5,731],[-59,722],[-62,714],[-70,710.5]],3);
export const LP_BATES_RING  = crChain([[-70,721],[-66.46,722.46],[-65,726],[-66.46,729.54],[-70,731],[-73.54,729.54],[-75,726],[-73.54,722.46],[-70,721]],2);  // r 5.0 (CR sag leaves the inner edge > carveR+halfW — the 071 sampled-curve law)
export const LP_GARDEN_AXIS_N = crChain([[-70,708.6],[-70,710.5],[-70,721]],2);   // door threshold -> loop north pt -> ring north pt (the vestibule axis; 708.6 clears the vestCarve z1 708)
export const LP_GARDEN_AXIS_S = crChain([[-70,731],[-70,735]],2);     // ring south pt -> loop south pt
export const LP_GARDEN_EAST = crChain([[-59,722],[-42,719.5],[-24,717],[-8,714]],3);        // T into the park spine (no dead end)
export const LP_STOCKTON_CROSSING = crChain([[-81,722],[-87.5,719],[-93.2,716],[-98.5,714]],3);  // west into Grandmother's (bench focal 3 m past the end)
export const LP_GARDEN_STYLE = { width:2.0, color:0xc9c3b4, y:0.066 };  // pale garden gravel — tucks UNDER the 0.074 limestone walks at the junctions (y-ladder law)

// ---- CAFÉ BRAUER + Nature Boardwalk + honeycomb pavilion (BUILT 117) --------
// The pond is the pipeline's quiet finale — a NATURALIZED prairie pond (algae-
// green shallow water, cattail/lily margins) with a walkable wood BOARDWALK on
// pilings ringing its N/E/S margin (welds to ZOO.spur, the west promenade — no
// dead ends), the honeycomb PAVILION arching over the water on the SE peninsula,
// and CAFÉ BRAUER (1908 Prairie refectory) on the NW shoulder. structures.js
// builds Brauer/pavilion/boardwalk/rails/plates/bridge (zero rng, merged pool);
// coast.js renders the shallow water piece; props.js grows the bank grass +
// wildflowers (index-gated 2nd seed, existing buckets); packs/lp-pond-life.js
// owns the herons/turtles/dragonflies/lily-pads/paddleboats (culled, LOCAL
// seeds). Walkability = lpBoardwalkHit + the pond subtraction in lpLandHit
// (shared engine + walkprobe, NO colliders — the anti-trap law).
export const LP_CAFE_BRAUER = {
  x:-61, z:908, w:14, d:24, ry:0,        // central 2-storey brick refectory; long axis N-S; the EAST face (x-54) fronts the spur/pond
  brick:0x8e4f3c, trim:0xd9ccb2, roof:0x527a58, glow:0xffe2ae, door:0x5c4632, base:0x9a9282,  // Theater/Lion-House palette reuse (all pooled -> +0 draws; 0x527a58 green tile = the Lion House roof)
  frieze:0x2e4f38, friezeTile:0x6fa08a, frame:0x8a9a7a,   // NAMED: green-glazed Prairie frieze band + its square inset tiles + sage window frames
  wallH:6.4, roofH:3.4, eave:1.25,       // tall 2-storey mass under a broad deep-eave GREEN hip roof
  nLong:5, nShort:3, archW:1.9, archH:3.0,   // tall arched window rhythm (5 on the E/W long faces, 3 on the N/S ends)
  towers:{ w:2.6, h:2.2, roofH:1.5, dx:4.6 },  // TWIN LANTERN cupolas on the ridge at +/-dx (the Lion-House clerestory-monitor recipe run twice)
  clock:{ r:0.85, y:3.7 },               // round facade clock on the EAST (pond) face, over the doors
  loggia:{ depth:3.6, postH:3.2, roofH:1.3, nBay:4, armLen:12 },  // TWO open loggia arms (N + S) off the east face embracing the terrace
  terrace:{ x0:-54, x1:-47.5, z0:896, z1:920, y:0.13 },  // brick terrace east of the hall (the paddleboat overlook, over the spur toward the pond)
  sign:'CAFÉ BRAUER',   // person name — KEPT real (RENAMES law)
};
export const LP_HONEYCOMB = {
  x:-30, z:958, ry:-1.1,                 // pond-center-south peninsula; long axis along the boardwalk TANGENT (stands OVER the water — walkprobe reads x,z only)
  len:12, spanW:5.6, crownH:4.2,         // curved laminated-timber lattice TUNNEL-ARCH: 12m long (walk-through), 5.6m span, 4.2m crown — the READ is "walk under a wooden honeycomb"
  ribs:7, cells:4,                       // stylized hex-cell lattice: 7 arch ribs along the length x ~4 hex divisions per rib face (NOT literal)
  timber:0xc9a075, timber2:0xab8755,     // pale WARM laminated-glulam timber (reads as wood, not rusty steel truss, at distance)
  deckY:0.12,
};
// The walkable wood BOARDWALK ring (crChain, densely sampled). Hugs the pond's
// N/E/S margin on pilings + a SE bulge THROUGH the pavilion (walk-through), and
// welds to ZOO.spur at the NW (near spur (-50,905)) and SW (near spur
// (-48.9,1005.5)) so the loop closes with no dead ends. structures.js sweeps
// the deck-on-pilings from THESE samples (the same polyline lpBoardwalkHit
// uses — geometry + walkability can't drift). NOT a pathSamples2 ribbon (it is
// a deck, not a ground decal; LP is scatter-free so no tree-filter is needed).
export const LP_BOARDWALK = crChain([
  [-48.5,905],[-38,903],[-24,901],[-16,910],[-14.5,932],[-15,952],
  [-21,960],[-30,958],[-33,966],[-25,974],[-18,984],[-22,996],[-36,1001],[-49,1004],
],3);
export const LP_BOARDWALK_HALF = 1.35;   // deck half-width — SHARED by the deck geometry (structures.js), lpBoardwalkHit (engine) and walkprobe (NEVER fork)
export const LP_BOARDWALK_STYLE = { deckY:0.12, deckTh:0.22, wood:0x8a6a44, wood2:0x9c6a3a, plankStep:0.9, railColor:0x2f3430, railH:1.0, railSpace:2.6, pileEvery:3.2 };  // reuse the dock-wood pool colors; dark mesh rail on the water side (POSTS/RAILS)
export const LP_POND_BRIDGE = { x:-40, z:1004, w:16, h:1.5, d:1.4, faceZ:1003.2, stone:0x9a988c, sign:'NATURE BOARDWALK', sub:'LINCOLN PARK ZOO' };  // the postcard "Bridge Over South Pond" — a low stone causeway/abutment at the pond's SOUTH outlet; lettering on its NORTH face (toward the pond/boardwalk viewer)
// Pond render + bank scatter + pond-life data (its OWN piece; the water is a
// SHALLOW self-lit bmat surface — the 044 habitat-pool register, NOT the deep
// teal WATER_S plane — so cattail/lily margins read).
export const LP_SOUTHPOND = {
  waterY:-0.35, water:0x4e8a7a, water2:0x3a6e64,  // shallow pond — TEAL-green (self-lit bmat, the habitat-pool register) so it READS as water vs the grass; raised to -0.35 for less near-level occlusion
  mud:0xa89468, rimY:-0.08,                       // mud/shallows rim skirt masking the land-hole edge (reeds mask the rest)
  banks:{   // index-gated 2nd-seed grow of the EXISTING props.js tuft + flower buckets (LOCAL seeds; +0 buckets)
    tuftSeed:0x5e17a3, tufts:300, tuftScaleY:[1.7,3.0], tuftColor:0xbfa96a,          // golden prairie grass ringing the pond
    reedSeed:0x2c91f0, reeds:170, reedScaleY:[2.4,3.8], reedColor:0x9caf5e,          // taller cattail/reed clusters at the water margin (same tuft bucket, taller)
    flowerSeed:0x6a1d90, drifts:[[-46,910,2.0],[-12.5,940,1.8],[-18,1005,2.2],[-13,924,2.4],[-12.5,958,2.4],[-13,986,2.6],[-30,1009,3.2],[-42,1010,2.6]],  // on ACCESSIBLE banks (E strip + S lawn + NW terrace corner) — the tight spur/water west edge holds no drift
    perDrift:15, liatris:0x9a3f8c, ironweed:0x6b3fa0, goldenrod:0xf2c14e,            // magenta liatris / purple ironweed / goldenrod drifts on the banks
    edgeMin:0.8, ringR:9.0,   // scatter annulus: dist to the pond edge in [edgeMin, ringR], on LAND, off the boardwalk+pavilion
  },
  lily:{ seed:0x3a7e11, pads:78, r:[0.5,0.95], color:0x4e7a3a, color2:0x3d6630, edgeMax:9 },  // lily-pad discs near the pond edges (pack merged mesh; +1 draw)
  paddleboats:{ green:0x3a8f4a, deck:0xe8e2d2, swan:0xf2f2ea, dark:0x223a2b, spots:[[-40,913,0.4],[-37,917,1.1],[-42,919,-0.6],[-38,922,2.2],[-34,916,-1.4]] },  // green pedal boats (brighter kelly-green hull + a pale cockpit deck so the raft reads over the algae-green pond — the 090 green-on-green law; the ref boats' pale seats) + one white swan, clustered on the NW water off the Brauer terrace (freeboard + dark waterline, the 076 law)
  herons:{  // chibi-chunky BLACK-CROWNED NIGHT HERONS (the endangered rookery — the delight hook); pack-owned, culled
    body:0x7b8a99, belly:0xe8ecee, crown:0x1c1f24, leg:0xd0c26a, beak:0x2a2a2a,   // body slate blue-grey (was washed-pale 0x9aa4ad — read as a white gull at deck distance; deeper slate reads as a grey night heron under the white belly/crown)
    perched:[ [-27,955,2.0], [-24,966,-1.0] ],   // two perched by the pavilion (a piling + the deck edge)
    hunched:[ -17,976,-2.4 ],                     // one hunched at the SE bank with an idle strike/stare beat (x,z,ry)
  },
  turtles:{ shell:0x5a6a3a, shell2:0x3f4a28, log:0x8a6a44, x:-22, z:948, ry:0.5, count:3 },  // turtles basking on a half-log in the shallows just W of the boardwalk (reads in the lp-boardwalk hero view)
  dragonflies:{ seed:0x11c7a3, n:12, color:[0.35,0.9,0.85], yLo:0.1, yHi:1.4 },  // teal Points motes darting over the water (pack; 1 draw, not a bucket)
  plates:[ { x:-13, z:924, ry:-1.57, title:'NATURE BOARDWALK', sub:'a restored prairie pond' },
           { x:-13, z:972, ry:-1.57, title:'NIGHT HERONS',    sub:'an endangered colony, home' },
           { x:-26, z:1008, ry:3.05, title:'SOUTH POND',      sub:'a naturalized pond, 2010' } ],   // interpretive plates on the bank (zoo plate() vocab; off centerlines + off stands)
  cull:{ x:-30, z:952, r:150 },   // pond-life distance-cull center + radius
};

// ---- TRAILS — all NEW ribbons registered via pathSamples2 (NEVER reshape
// TRAIL_MAIN; pathSamples is PHASE-sensitive — PITFALLS). LP_TRAIL_LAKE
// continues the Lakefront Trail south on the EAST strip; LP_TRAIL_PARK is the
// west park's interior spine (through the underpass into the zoo/pond).
// 120 RESHAPE (issue 033 — "paths disjointed, looks bad"). LP_TRAIL_LAKE now
// STARTS on TRAIL_MAIN's exact first control point (30,406) and is built as a
// DUAL ribbon (bike centerline + walk 4 m park-side, shift -walkOff so it lands
// on MAIN's side) mitre-welded to MAIN's START frame — the 102 continuation law
// applied to a predecessor's head. It ENDS at the east ramp head of the rebuilt
// Fullerton underpass (x 25.5); a flat ribbon may not run over the trench.
// The bike line holds x ~26 past Theater on the Lake (x0 33) so the walk ribbon
// keeps >=1.3 m of ground at its east edge (the 113 strip law).
export const LP_TRAIL_LAKE = crChain([[30,406],[28,436],[27,500],[26,560],[26,614],[26,644],[25.5,661]],4);
export const LP_TRAIL_PARK = crChain([[-11.5,661],[-14,668],[-13,684],[-10,700],[-8,714],[-8.2,752],[-8,788],[-8,810],[-8.6,824],[-11.5,830]],4);  // 114 RESHAPE / 120: starts at the WEST ramp head (x -11.5) of the sunken crossing -> south along the zoo flank (between Cannon and the fence) -> THROUGH the east gate (ends at the gate pad; ZOO.loop takes over inside, ZOO.spur continues to the pond). Det-safe: LP is scatter-free ground (GEOGRAPHY liberty note)
export const LP_TRAIL_STOCKTON = crChain([[-92,700],[-93.2,716],[-96,820],[-99,900],[-96,1000]],4);   // the west campus walk (Stockton side; 122 inserts the (-93.2,716) control point — the Stockton-crossing junction. Det-safe: pathSamples2 content-scan only, LP is scatter-free ground)

// 112 SHELL: hand-placed shade elms on the new parkland (individual frustum-culled
// meshes built in coast.js — NO scatter rng, NO new InstancedMesh bucket). Clear of
// the lagoon, the trails, and the underpass. 113-117 replace the interim lawn.
export const LP_TREES = [
  [-56,468,1.4],[-76,520,1.2],[-80,584,1.15],[-84,640,1.3],   // west of the Diversey lagoon
  [-48,500,1.25],[-46,572,1.15],                               // 113: west-bank leaners — old shade trees over the quay walk (BRIEF harbor read)
  [-54,712,1.2],[-84,762,1.35],[-60,812,1.2],[-70,868,1.25],   // west park interior (122: the (-64,704) elm re-sited to (-54,712) — its old spot is the conservatory forecourt; the new spot is the block's NE shoulder, clear of the lily-pool scaffold + the east connector)
  [-84,910,1.15],[-60,922,1.3],[-62,944,1.2],[-58,884,1.1],    // 115: the (-72,966) elm moved to (-62,944) — its old spot is the farm forecourt (lane clearance)
  [-40,868,1.25],[-55,940,1.1],[-30,1010,1.15],[-42,1012,1.2],   // 117: the three elms that stood inside the RULED pond re-sited to its shoulders — (-38,936)->(-55,940) W of the spur (S of Café Brauer), (-24,908)->(-30,1010) + (-30,984)->(-42,1012) on the south lawn; clear of the boardwalk/pavilion/Brauer/plates + Garibaldi
  [42,478,1.2],[48,540,1.3],[44,576,1.15],[46,658,1.1],        // east lakefront strip (113: the z606 elm moved N of the Theater footprint)
  [-78,842,1.2],[-86,828,1.25],[-79,876,1.15],[-66,876,1.2],   // 114: zoo campus shade elms (115: the (-78,792) elm moved to (-78,842) — its old spot is inside the polar tundra)
  [-16,880,1.15],[-34,790,1.1],
];
// 127 — DRESS THE WALK TO THE UNDERPASS (owner 2026-07-26: "Add trees on the
// way to the underpass too please"). Cluster anchors grown into the SHARED
// props.js instanced tree buckets via the Montrose-071 append (LOCAL seed,
// appended AFTER the post-filter, BEFORE n is taken → +0 buckets, +0 draws,
// shared-rng order untouched). Anchors: [x, z, per, spread]. The west band
// hugs the Drive (thinner planting, the real thing); the east band is the
// mature canopy over the lakeside lawns. KEEP-OUTS (hard, enforced by the
// props.js rejection loop + these anchor choices): the portal-approach
// corridor z 622-676 (the 124 sightlines are load-bearing), the Theater
// sightline band z 565-600, the corner weld's top-down frame (z < 415), the
// LP_RIPPLES heads (>=3.5 m), the LP_TREES elms (>=4 m), the trail (>=6.5 m
// off the LP_TRAIL_LAKE bike centerline covers the walk lane too), and a
// 1.4 m land inset so no trunk stands at the water's edge.
export const LP_TREEFILL = {
  seed:0x127f11, scale:[1.1,1.8],
  anchors:[
    // west / Drive-side band (x >= 16 guard keeps trunks off the berm toe)
    [17,420,1,2.5],[17.5,472,2,3],[20,515,2,5],[19,552,2,5],[20,608,2,4],
    // east / lake-side band
    [42,442,3,5],[42,468,3,5],[45,505,4,6],[40,538,2,5],[46,557,2,4],
  ],
};
// 127 — TEN THOUSAND RIPPLES (Indira Freitas Johnson, 2012/13; the Park
// District's Lincoln Park site record: "Just South of Diversey @ LSD" — the
// owner photographed it 2026-07-26 and asked for it). Six matte-white Buddha
// heads HALF-SUNK in the Drive-side lawn of the east strip, buried to the
// jaw: lawn meets sculpture, no plinth, no lip, no signage, no fence.
// STYLIZED TOON HOMAGE (Cloud Gate / Crown Fountain precedent — living
// artist's copyrighted work, never a facsimile; APPSTORE.md §9a registers
// it). The at-distance read is the RIBBED DOME of concentric curl bands; the
// face stays minimal, eyes closed. Built in props.js as ONE InstancedMesh
// (+1 draw, zero further buckets), zero rng of any kind — every placement is
// authored here. heads: [x, z, ry, tiltX, tiltZ, s] (tilts are small
// head-local leans; geometry extends ~0.4 m below the lawn so a tilt never
// opens a shadow gap at the waterline). Colliders r 0.85*s — rings stay
// entirely on open walkable lawn (>=2 m off the berm toe x14, >=3 m off the
// bike ribbon's west edge; the anti-trap law holds).
export const LP_RIPPLES = {
  color:0xf3efe4,
  heads:[
    [17.8,425.5,  2.9,  0.06,-0.03, 1.06],
    [23.0,433.5, -0.65,-0.05, 0.06, 0.94],
    [16.9,447.0,  1.75, 0.04, 0.07, 1.12],   // the money face — looks EAST at the trail
    [21.8,458.5,  0.4, -0.06,-0.04, 1.0 ],
    [18.9,476.5, -2.35, 0.05, 0.04, 0.9 ],
    [22.6,487.0,  0.4, -0.04, 0.06, 1.05],   // 127 walkthrough round 2: ry 1.1->0.4 — faces SSE, near-frontal to the lp-ripples f3 stand so ONE framing reads the calm closed-eye face (the chase cam can never resolve a face at f0/f2 range; from the trail it still shows a varied 3/4)
  ],
  collide:0.85,
  // the quiet once-per-session approach toast (pack ripples.js) — reverent,
  // no plaque, no fanfare; the real installation carries no signage.
  toast:{ x:20.2, z:456, r:15, main:'TEN THOUSAND RIPPLES',
          sub:'a hundred quiet heads across the city — six of them here' },
};
// ---- ZONES (discovery) + PROPS (statues) — LINCOLN_* mirrors of ZONES/props
export const LINCOLN_ZONES = [
  { n:'Diversey Harbor',      x:-24, z:520,  r:44 },
  { n:'Theater on the Lake',  x:30,  z:615,  r:20 },
  { n:'Lincoln Park Conservatory', x:-70, z:716, r:30 },
  { n:'Lincoln Park Zoo',     x:-50, z:860,  r:80 },
  { n:'Farm-in-the-Zoo',      x:-79, z:982,  r:20 },   // 115 re-site (campus SW)
  { n:'South Pond',           x:-30, z:952,  r:34 },   // 115 ruling (east of the spur)
];
export const LINCOLN_PROPS = {   // verdigris-bronze + granite statuary (persons/civic — all KEPT real)
  signalOfPeace:{ x:-6,  z:415 },   // A Signal of Peace (Dallin), Diversey
  goethe:       { x:-100,z:432 },   // Goethe Monument (west backdrop)
  grantMemorial:{ x:-70, z:876 },   // Ulysses S. Grant (equestrian, ridge N of the pond)
  andersen:     { x:-98, z:893 },   // Hans Christian Andersen
  garibaldi:    { x:-44, z:1018 },  // Garibaldi (S of the pond)
};
