import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { scene, rng, rand, clamp, smooth, gmap, toon, bmat, curveMat, pip, WATER_Y, CURV } from './core.js';
import * as CH from './data/chicago.js';

// ------------------------ coast + land outline -------------------------
function genCoast(z0,z1,fx){const C=[];for(let z=z0;z>=z1;z-=3)C.push([fx(z),z]);return C}
export const COAST_MAIN=genCoast(CH.COAST_MAIN_PARAMS.z0,CH.COAST_MAIN_PARAMS.z1,CH.COAST_MAIN_PARAMS.fx);  // Belmont Rocks + south lawn, south->north
export const COAST_PEN =genCoast(CH.COAST_PEN_PARAMS.z0,CH.COAST_PEN_PARAMS.z1,CH.COAST_PEN_PARAMS.fx);     // east peninsula lake edge
export const COAST_GOLF=genCoast(CH.COAST_GOLF_PARAMS.z0,CH.COAST_GOLF_PARAMS.z1,CH.COAST_GOLF_PARAMS.fx);  // Marovitz trail-side revetment (084 vignette, z-400..-580) — renders via the LOCAL fold, NOT COAST_SEGS
// 084 GHOST: the pre-084 full-length golf piece (z-400..-800). Lives at
// COAST_SEGS[2] purely as WORLD-RNG BALLAST — the terrace-slab loop consumes
// its exact pre-084 rand()/rng() pattern and pushes NO boxes; walkability,
// wet-band, piles, faces and foam all use the REAL pieces instead.
const COAST_GOLF_GHOST=genCoast(CH.COAST_GOLF_GHOST_PARAMS.z0,CH.COAST_GOLF_GHOST_PARAMS.z1,CH.COAST_GOLF_GHOST_PARAMS.fx);
export const COAST_MOUTH=genCoast(CH.COAST_MOUTH_PARAMS.z0,CH.COAST_MOUTH_PARAMS.z1,CH.COAST_MOUTH_PARAMS.fx); // harbor-mouth terraced shore (rocks tip -> basin SW)
export const COAST_CORNER=genCoast(CH.COAST_CORNER_PARAMS.z0,CH.COAST_CORNER_PARAMS.z1,CH.COAST_CORNER_PARAMS.fx); // south-corner wrap (SW terminus -> rocks SE join), same 7-step profile
export const M_END=COAST_MAIN[COAST_MAIN.length-1];                          // ~[151,16]
export const P_START=COAST_PEN[0];                                           // ~[196,-25]
// peninsula SOUTH-TIP terraced arc (SW turn ~[166,-24] -> south point ~[176,-17] -> SE,
// joining COAST_PEN at P_START). A polyline coast piece (not fx(z): the tip horseshoes,
// so z isn't single-valued) — coastQuery/terraces consume it like any other. Ordered
// basin->lake so the seaward normal points outward around the whole horseshoe; TIER_DEFAULT
// (4 steps) since its z (~ -17..-24) is outside the Rocks band, matching COAST_PEN's tiers.
export const COAST_TIP=CH.peninsulaTipLine(P_START);

export const BASIN_W=[];for(let z=CH.BASIN_W_PARAMS.z0;z>=CH.BASIN_W_PARAMS.z1;z-=CH.BASIN_W_PARAMS.step)BASIN_W.push([CH.BASIN_W_PARAMS.fx(z),z]);

// MONTROSE north growth (v0.6, task 069): the stub-shore revetment pieces. Each
// is kept OUT of the shared COAST_SEGS (props.js beach-life iterates that with the
// world rng — appending there moves every towel); coast.js appends them to
// QUERY_SEGS (walkability) + folds their terraces/piles/faces into the EXISTING
// buckets with a LOCAL xorshift (zero new InstancedMesh buckets, zero shared-rng
// draws — the COAST_TIP precedent). Separate arrays so 070-072 swap one piece.
export const COAST_BAY=CH.COAST_BAY_PTS;                                                                                          // 084: the bay cove replacing the golf-to-Montrose lawn (takes the retired LAWN's slot 0)
export const COAST_MTR_HARBOR=CH.COAST_MTR_HARBOR_PTS;                                                                            // 070: the hook mole's LAKE(outer) terraced face (polyline)
export const COAST_MTR_POINT =CH.COAST_MTR_POINT_PTS;                                                                             // 071: the pushed-east Point (polyline, apex 243,-1330 — the map's eastmost land)
export const COAST_MTR_BEACH =genCoast(CH.COAST_MTR_BEACH_PARAMS.z0, CH.COAST_MTR_BEACH_PARAMS.z1, CH.COAST_MTR_BEACH_PARAMS.fx);  // 072 beach
export const COAST_MTR_CLOSE =CH.COAST_MTR_CLOSE_PTS;                                                                             // NE-corner map-edge closure (polyline)
// 070: two EXTRA terraced harbor pieces — the mouth-entrance shore + the hook TIP
// curl. Both walkable (QUERY_SEGS) + folded terraces (the COAST_TIP precedent).
// Appended AFTER the swap pieces so COAST_MTR[0..4] stay the piece-swap slots.
export const COAST_MTR_MOUTH  =CH.MTR_HARBOR_MOUTH;
export const COAST_MTR_HOOKTIP=CH.MTR_HOOK_TIP;
// 084: BAY takes the retired LAWN's slot 0 (same role: the shore south of the
// harbor mouth); the vignette GOLF piece appends at idx 7. Idx 3 MUST stay the
// BEACH — the i!==3 filters (sand, no revetment) key on it.
export const COAST_MTR=[COAST_BAY,COAST_MTR_HARBOR,COAST_MTR_POINT,COAST_MTR_BEACH,COAST_MTR_CLOSE,COAST_MTR_MOUTH,COAST_MTR_HOOKTIP,COAST_GOLF];

export const LAND=CH.buildLAND({COAST_CORNER,COAST_MAIN,COAST_PEN,COAST_GOLF,COAST_MOUTH,BASIN_W,
  COAST_BAY,COAST_MTR_HARBOR,COAST_MTR_POINT,COAST_MTR_BEACH,COAST_MTR_CLOSE});
// 084 ghost land (pre-084 polygon truncated at z=-800): the frozen accept-test
// surface for the shared-rng tuft/grass-patch loops. See chicago.js.
export const LAND_GHOST084=CH.buildLandGhost084({COAST_CORNER,COAST_MAIN,COAST_PEN,COAST_GOLF_GHOST,COAST_MOUTH,BASIN_W});

// --------------------- terraces (the revetment) ------------------------
export function tierProfile(zc){
  const R=CH.TIER_ROCKS;
  if(zc>R.zMin&&zc<R.zMax){                                   // Belmont Rocks stretch (+ wrapped corner): wider, 7 steps
    if(zc>R.cornerZ0){                                        // corner wrap: taper the wide promenade toward the convex SW terminus
      const f=clamp((zc-R.cornerZ0)/(R.cornerZ1-R.cornerZ0),0,1);
      const w=R.w.slice();w[w.length-1]=R.w[w.length-1]+(R.cornerPromW-R.w[w.length-1])*f;
      return {w,step:R.step};                                  // f=0 at the z340 join (promenade 6.0, flush w/ the straight rocks)
    }
    if(zc<R.mouthZ0){                                         // mouth taper: pinch the wide rocks field to the default
      const f=clamp((R.mouthZ0-zc)/(R.mouthZ0-R.mouthZ1),0,1); // 12.2 m total at zMin so the hand-off at the harbor-mouth
      const w=R.w.map((v,i)=>v+(R.mouthW[i]-v)*f);             // junction is flush (was a 10.5 m width cliff — the
      return {w,step:R.step};                                  // 'jagged edge at the mouth' tear). Same call counts.
    }
    return {w:R.w,step:R.step};
  }
  return {w:CH.TIER_DEFAULT.w,step:CH.TIER_DEFAULT.step};
}
export function profileTotal(zc){const p=tierProfile(zc);let s=0;for(const w of p.w)s+=w;return s}
// The corner PIER's slip: points seaward of the revetment top edge within the
// pier x-band are OPEN WATER (the terrace is carved so the deck spans water, not
// steps). North boundary follows the top-edge line so no lawn is carved.
export function inPierChannel(x,z){
  const P=CH.PIER_CHANNEL;if(!P)return false;
  if(x<P.x0||x>P.x1||z>P.zMax)return false;
  const topZ=P.topZ0+(P.topZ1-P.topZ0)*(x-P.x0)/(P.x1-P.x0);
  return z>=topZ;
}
// Per-VERTEX unit tangents for a segment list (average of the two adjacent
// segment tangents, clamped at the ends). Interpolating these along a segment
// gives a smoothly-varying box orientation with no jump at segment boundaries —
// kills the terrace sawtooth on tight curves. No rng.
function vertexTangents(segs){
  const n=segs.length,VT=new Array(n+1);
  for(let k=0;k<=n;k++){
    const a=segs[Math.max(0,k-1)],b=segs[Math.min(n-1,k)];
    let x=a.tx+b.tx,z=a.tz+b.tz;const l=Math.hypot(x,z)||1;VT[k]=[x/l,z/l];
  }
  return VT;
}
export function buildSegs(pts){
  const segs=[];
  for(let i=0;i<pts.length-1;i++){
    const ax=pts[i][0],az=pts[i][1],bx=pts[i+1][0],bz=pts[i+1][1];
    const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);
    const tx=dx/len,tz=dz/len;
    segs.push({ax,az,tx,tz,nx:-tz,nz:tx,len});   // n points to water (east) for south->north coasts
  }
  return segs;
}
// 084: COAST_SEGS[2] is the GOLF GHOST — rng ballast only (slab loop consumes,
// never pushes; excluded from openRuns/QUERY/foam positions). The REAL golf +
// bay live in MTR_SEGS (idx 7 / idx 0) and render via the local fold.
export const GHOST_CI=2;
export const COAST_SEGS=[buildSegs(COAST_MAIN),buildSegs(COAST_PEN),buildSegs(COAST_GOLF_GHOST),buildSegs(COAST_MOUTH),buildSegs(COAST_CORNER)];  // corner appended (index 4) so COAST_SEGS[0..3] stay put for props/beach-life
// The tip is kept OUT of COAST_SEGS on purpose: props.js beach-life/foam iterate
// COAST_SEGS (with the shared rng), so appending here would shift the world's rng order
// (moved towels/flowers — hard constraint #1). Instead coastQuery/tierAt (walkability
// + the tip's own DETERMINISTIC terrace mesh in buildCoast) scan this extra piece, which
// consumes no shared rng. Everything else in the world stays bit-for-bit identical.
export const TIP_SEGS=buildSegs(COAST_TIP);
// MONTROSE stub pieces: segs built here (buildSegs is rng-free) and added ONLY to
// QUERY_SEGS — walkability (coastQuery/tierAt) + water color (SHORE_SEGS below) —
// never to COAST_SEGS. Their terraces/piles/faces render inside buildCoast via a
// local xorshift folded into the existing buckets.
export const MTR_SEGS=COAST_MTR.map(buildSegs);
// 084: the ghost (COAST_SEGS[2]) is NOT walkable/queryable — the real golf
// piece is MTR_SEGS[7], the bay MTR_SEGS[0].
const QUERY_SEGS=[...COAST_SEGS.filter((_,i)=>i!==GHOST_CI),TIP_SEGS,...MTR_SEGS.filter((_,i)=>i!==3)];  // task 072: BEACH (idx 3) is SAND (beachH), not a revetment
export function coastQuery(x,z){
  let best=null,bd2=1e9;
  for(const C of QUERY_SEGS)for(const s of C){
    const px=x-s.ax,pz=z-s.az;
    let t=px*s.tx+pz*s.tz;t=clamp(t,0,s.len);
    const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;
    const ddx=x-cx,ddz=z-cz,d2=ddx*ddx+ddz*ddz;
    if(d2<bd2){bd2=d2;best={lat:ddx*s.nx+ddz*s.nz,d2,z:cz}}
  }
  if(!best)return null;
  best.ae=Math.sqrt(Math.max(0,best.d2-best.lat*best.lat));   // overrun past polyline ends
  if(inPierChannel(x,z))best.lat=1e3;                          // pier slip: carved to open water -> tierAt() yields no tier
  return best;
}
export function tierAt(lat,zc){       // height on the terraces, or null past the edge
  const p=tierProfile(zc);let acc=0;
  for(let i=0;i<p.w.length;i++){acc+=p.w[i];if(lat<=acc)return{h:-i*p.step,i,edge:acc}}
  return null;
}

// ---- water color gradient: shore-distance field -----------------------
// Segments the per-vertex water aShore is sampled against: the open-lake coast
// + peninsula tip (QUERY_SEGS) PLUS the sheltered harbor BASIN edges (west
// seawall, north shore, peninsula west bulkhead). Including the basin walls
// makes basin water read shallow/light (its nearest edge is always close),
// matching the aerial's greener harbor. One flat list for the hot loop.
// buildSegs uses NO shared rng -> deterministic; the world's rng order is untouched.
// Montrose basin bulkheads (seawallLines[3..5]) are EXCLUDED from the color
// field (task 076 / issue 026): the basin is only ~31 m wall-to-wall, so with
// them included every drop of basin water sat in the brightest 0-14 m "beach
// shallows" band (+1.4x glint boost) — a garish cyan pond where white hulls
// read as foam blobs. A flush bulkhead marina reads DEEP to the wall; without
// its walls the basin measures to the mole's outer lake face (~33 m) and lands
// in the sheltered aqua/teal bands. Belmont's wider basin keeps its walls (the
// aerial's greener-harbor read there is deliberate and shipped).
const SHORE_SEGS=[].concat(...QUERY_SEGS, MTR_SEGS[3], ...CH.seawallLines({P_START,BASIN_W}).slice(0,3).map(buildSegs));  // task 072: beach shoreline kept for water color only
export function shoreDist(x,z){        // approx Euclidean distance (m) to the nearest shoreline
  let bd2=1e18;
  for(let i=0;i<SHORE_SEGS.length;i++){
    const s=SHORE_SEGS[i];
    const px=x-s.ax,pz=z-s.az;
    let t=px*s.tx+pz*s.tz; if(t<0)t=0; else if(t>s.len)t=s.len;
    const ddx=x-(s.ax+s.tx*t),ddz=z-(s.az+s.tz*t),d2=ddx*ddx+ddz*ddz;
    if(d2<bd2)bd2=d2;
  }
  return Math.sqrt(bd2);
}

// dog beach — sloped sand cove: dry (h=0) at the north edge, dipping to
// `depth` at the south waterline. t rises with z (south) so the slope faces
// the basin water south of the cove.
export function beachH(x,z){const b=CH.DOG_BEACH.bounds,s=CH.DOG_BEACH.slope;if(x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1){const t=clamp((z-s.ref)/s.span,0,1);return s.depth*smooth(t)}return CH.montroseBeachH(x,z)}

// water meshes (populated by buildCoast; read by the main loop for uTime).
// waterN is the Montrose north plane — 069 shipped it frozen (uTime 0) when
// the far north was empty; with the harbor/beach built, dead-still water read
// wrong (issue 026), so main.js ticks both now.
export let water=null;
export let waterN=null;
export let waterS=null;   // 112 LINCOLN PARK south water plane (lagoon + south lake)

// Living toon water. A MeshToonMaterial patched via onBeforeCompile: the same
// world-curve as curveMat, plus (1) a gentle 2-octave swell, (2) sparse warm
// sun-glints, (3) a very slow large-scale hue drift. Keeps the userData.sh /
// uTime contract main.js ticks. No shared rng, no geometry change, no textures.
// clip (optional, MESH-LOCAL xz rect): fragments inside it are DISCARDED. The 041
// grade-carpet law, water edition (task 120): a map-spanning water plane CAPS any
// feature dug below WATER_Y exactly like the lawn fill caps a sunken pit — the
// rebuilt Fullerton underpass (floor y -3.1 < WATER_Y -2.3) rendered as a flooded
// canal with the mayor waist-deep under the Drive. The trench footprint is
// entirely under LAND (shoreline x~48 at that z), so no legitimate water is lost;
// the discard edges hide under the land plane / culvert deck on every side.
function livingWaterMat(baseHex,clip){
  const m=new THREE.MeshToonMaterial({color:baseHex,gradientMap:gmap});
  m.userData.timeAnim=true;              // shader-time swell keyed on LOCAL position -> never bake/merge this
  // r128 keys its PROGRAM CACHE on onBeforeCompile.toString(): every
  // livingWaterMat shares that source, so a clipped instance would silently
  // reuse the first (unclipped) plane's compiled shader and the discard never
  // runs. A per-clip cache key forces its own program.
  m.customProgramCacheKey=()=>'livingWater'+(clip?JSON.stringify(clip):'');
  m.onBeforeCompile=sh=>{
    sh.uniforms.uCurv={value:CURV};
    sh.uniforms.uTime={value:0};
    m.userData.sh=sh;                    // <-- main.js ticks sh.uniforms.uTime.value

    // ---- vertex: world-curve + gentle breathing swell (amp <= 0.07) ----
    sh.vertexShader=sh.vertexShader.replace('#include <common>',
      '#include <common>\nuniform float uCurv;\nuniform float uTime;\nattribute float aShore;\nvarying vec2 vWc;\nvarying float vShore;');
    sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n'+
      '\tvWc = position.xz;\n'+                 // mesh unrotated & at x=z=0 -> world xz
      '\tvShore = aShore;\n'+                   // build-time shore distance (m), swell-independent
      // two slow swells, periods ~6s & ~9s, directions ~40 deg apart
      '\ttransformed.y += sin(dot(position.xz, vec2(0.90,0.44))*0.14 + uTime*1.047)*0.045\n'+
      '\t              + sin(dot(position.xz, vec2(0.40,0.91))*0.11 + uTime*0.698)*0.025;');
    sh.vertexShader=sh.vertexShader.replace('gl_Position = projectionMatrix * mvPosition;',
      'mvPosition.y -= uCurv * mvPosition.z * mvPosition.z;\n\tgl_Position = projectionMatrix * mvPosition;');

    // ---- fragment: banded shore gradient + hue drift + sparse warm glints ----
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>',
      '#include <common>\nuniform float uTime;\nvarying vec2 vWc;\nvarying float vShore;');
    // Shore-distance color GRADE (the aerial's soft bands hugging the shoreline):
    // bright turquoise at the water's edge -> deep blue-teal offshore, in 4 TOON
    // STEPS. Each edge is a ~3 m smoothstep so the swell can't make bands shimmer.
    // Then the broad slow hue drift layers ON TOP (before toon lighting -> flat).
    sh.fragmentShader=sh.fragmentShader.replace(
      'vec4 diffuseColor = vec4( diffuse, opacity );',
      (clip?'if(vWc.x>'+clip.x0.toFixed(2)+' && vWc.x<'+clip.x1.toFixed(2)+' && vWc.y>'+clip.z0.toFixed(2)+' && vWc.y<'+clip.z1.toFixed(2)+') discard;\n\t':'')+
      'vec3 cShore=vec3(0.3490,0.8588,0.9098);\n'+   // 0x59dbe8 bright turquoise (0-14 m)
      '\tvec3 cAqua =vec3(0.1843,0.6392,0.7098);\n'+ // 0x2fa3b5 mid aqua  (14-38 m, the old base)
      '\tvec3 cTeal =vec3(0.1451,0.5490,0.6275);\n'+ // 0x258ca0 deeper teal (38-85 m)
      '\tvec3 cDeep =vec3(0.0902,0.4980,0.6196);\n'+ // 0x177f9e deep blue-teal (>85 m)
      '\tvec3 band=cShore;\n'+
      '\tband=mix(band,cAqua,smoothstep(12.5,15.5,vShore));\n'+
      '\tband=mix(band,cTeal,smoothstep(36.5,39.5,vShore));\n'+
      '\tband=mix(band,cDeep,smoothstep(83.5,86.5,vShore));\n'+
      '\tfloat hz1 = sin(vWc.x*0.012 + uTime*0.05)*0.5 + 0.5;\n'+
      '\tfloat hz2 = sin(vWc.y*0.010 - uTime*0.037 + 1.7)*0.5 + 0.5;\n'+
      '\tvec3 wCol = band;\n'+
      '\twCol = mix(wCol, band*vec3(0.84,0.95,1.03), hz1*0.45);\n'+   // deeper teal drift
      '\twCol = mix(wCol, band*vec3(1.12,1.05,0.95), hz2*0.45);\n'+   // warmer aqua drift
      '\tvec4 diffuseColor = vec4( wCol, opacity );');
    // glints: interference of three drifting sine fields; only the rare near-peak
    // survives the smoothstep -> sparse glitter. Added before fog so distance fades them.
    sh.fragmentShader=sh.fragmentShader.replace('#include <fog_fragment>',
      'float g1 = sin(dot(vWc, vec2( 1.7, 0.9)) + uTime*1.3);\n'+
      '\tfloat g2 = sin(dot(vWc, vec2(-1.1, 1.9)) - uTime*1.0);\n'+
      '\tfloat g3 = sin(dot(vWc, vec2( 0.7,-1.3)) + uTime*0.7);\n'+
      '\tfloat glint = smoothstep(0.90, 1.0, (g1+g2+g3)*0.3333);\n'+
      '\tfloat shoreGlint = mix(1.4, 1.0, smoothstep(0.0, 22.0, vShore));\n'+   // extra sparkle on the bright shore band
      '\tgl_FragColor.rgb += vec3(1.0,0.94,0.80) * glint * 0.55 * shoreGlint;\n'+
      '\t#include <fog_fragment>');
  };
  return m;
}

export function buildCoast(){
  // ---------------------- THE WEST GRADE (issue 032) ---------------------
  // For the whole life of the map everything WEST of the Lake Shore Drive
  // berm was OPEN LAKE: the Brown Line viaduct's bents plunged into water,
  // the Lakeview backdrop flats floated on it, and from the Lakefront Trail
  // the player saw whitecaps through the gap past the screening hedges —
  // where the CITY should be (owner playtest 2026-07-24). CH.WEST_GRADE lays
  // flat panels of solid city ground over that whole west face, 0.06 m UNDER
  // the park lawn so LAND / LP_LAND_WEST always win the seam.
  //
  // SCENERY, NOT WALKABLE: isWater()'s `x>20` gate already reads every point
  // out here as BLOCKED (never wadeable), so the west-wade guard and every
  // walk function are untouched — no walkability change, no colliders.
  //
  // Pure data, ZERO rng of any kind (the shared mulberry32 call ORDER is a
  // hard constraint) — one lone Mesh per panel, added inside the lakefront
  // cell capture so a hard cell (Millennium/Wrigleyville) hides it with the
  // rest of the lakefront. The sx/sz segment counts exist so the quadratic
  // world curve (mvPosition.y -= CURV*z*z, injected by toon()) is SAMPLED
  // finely enough across a panel this large — never reduce them.
  {
    const G=CH.WEST_GRADE,gm=toon(G.color);       // one shared cached toon material for all panels
    for(const p of G.panels){
      const g=new THREE.PlaneGeometry(p.x1-p.x0,p.z1-p.z0,p.sx,p.sz);g.rotateX(-Math.PI/2);
      const m=new THREE.Mesh(g,gm);
      m.position.set((p.x0+p.x1)/2,G.y,(p.z0+p.z1)/2);
      scene.add(m);
    }
  }

  // Junction-WELDED vertex tangents. Each coast piece smooths its own vertex
  // tangents but clamps at its endpoints, so two pieces meeting at a corner
  // disagreed about the tangent there — slabs/piles tore at the seams (the
  // harbor-mouth join ~[151,16], the peninsula-tip join ~[196,-25]). Averaging
  // the shared-endpoint tangents makes both fans rotate through the same
  // bisector, so the terraces wrap the corner instead of tearing. Pure
  // geometry — no rng, and every rand()/rng() call count below is unchanged.
  const VTS=COAST_SEGS.map(vertexTangents);
  const VT_TIP=vertexTangents(TIP_SEGS);
  const weld=(VA,ia,VB,ib)=>{
    const x=VA[ia][0]+VB[ib][0],z=VA[ia][1]+VB[ib][1],l=Math.hypot(x,z)||1;
    VA[ia]=VB[ib]=[x/l,z/l];
  };
  weld(VTS[0],VTS[0].length-1,VTS[3],0);   // rocks north tip -> mouth shore
  weld(VTS[4],VTS[4].length-1,VTS[0],0);   // corner SE join -> rocks south end
  weld(VT_TIP,VT_TIP.length-1,VTS[1],0);   // tip SE arc -> peninsula lake edge
  // MONTROSE stub pieces: their own welded-per-piece tangents, added to openRuns
  // so the wet-stain band / sheet-piles / wall-faces (all rng-free, iterating
  // openRuns) include them — those InstancedMeshes just grow (zero new buckets).
  const VT_MTR=MTR_SEGS.map(vertexTangents);
  const openRuns=[...COAST_SEGS.map((s,i)=>[s,VTS[i]]).filter((_,i)=>i!==GHOST_CI),[TIP_SEGS,VT_TIP],...MTR_SEGS.map((s,i)=>[s,VT_MTR[i]]).filter((_,i)=>i!==3)];  // task 072: beach (idx 3) = sand, no revetment features; 084: the golf GHOST is rng ballast, not a rendered run

  // terrace blocks — instanced, jittered for the uneven limestone look.
  // Warm-GRAY concrete family (the real Belmont revetment is a warm gray, not the
  // old cream/beige) — desaturated a touch, still cozy/toon. Box ORIENTATION and
  // seaward offset follow a smoothly-interpolated VERTEX tangent (not the raw
  // per-segment tangent), so the slabs stop sawtoothing where the coast curves
  // tightly (harbor mouth, peninsula tip, Diversey corner); tight arcs also get
  // proportionally longer slabs so neighbours overlap instead of gapping. Slabs
  // over the pier SLIP are skipped (carved to water). Every per-box rand()/rng()
  // draw stays UNCHANGED in count+order (skipped slabs still draw theirs) -> the
  // world rng order is bit-for-bit intact; no towels/flowers move.
  {
    const cols=[0xc7ccb8,0xbcc1ad,0xb1b6a1,0xa6ab95,0x999e86].map(c=>new THREE.Color(c));
    const boxes=[];
    for(let ci=0;ci<COAST_SEGS.length;ci++){
      const segs=COAST_SEGS[ci],VT=VTS[ci];   // junction-welded tangents (see top of buildCoast)
      for(let j=0;j<segs.length;j++){
        const s=segs[j],a=VT[j],b=VT[j+1];
        const turn=Math.acos(clamp(a[0]*b[0]+a[1]*b[1],-1,1));   // arc this segment sweeps
        const xtra=Math.min(1.3,turn*3.0);                       // fatten slabs on tight curves to close gaps
        for(let t=0;t<s.len;t+=2.2){
          const u=t/s.len;
          let tgx=a[0]+(b[0]-a[0])*u,tgz=a[1]+(b[1]-a[1])*u;      // smoothly-varying tangent
          const tl=Math.hypot(tgx,tgz)||1;tgx/=tl;tgz/=tl;
          const nsx=-tgz,nsz=tgx,srot=Math.atan2(tgx,tgz);
          const cx=s.ax+s.tx*t,cz=s.az+s.tz*t,zc=cz;
          const p=tierProfile(zc);let acc=0;
          for(let i=0;i<p.w.length;i++){
            const w=p.w[i]+rand(-0.25,0.25);
            const off=acc+p.w[i]/2+rand(-0.12,0.12);
            const bx=cx+nsx*off,bz=cz+nsz*off;
            const box={
              x:bx, z:bz,
              y:-i*p.step-0.4+rand(-0.03,0.03),
              // On a convex arc the OUTER tiers sweep a longer arc than the coast
              // line the samples walk, so fixed-length slabs gap out there (the
              // torn tip/mouth steps). Scale the turn-fatten by the tier's seaward
              // offset — same rand() count, purely deterministic.
              l:2.4+xtra*(1+off*0.14)+rand(-0.25,0.45), w,
              rot:srot+rand(-0.035,0.035),
              c:cols[i<2?(rng()*3|0):(2+(rng()*3|0))]
            };
            // pier slip carve + the 084 golf GHOST (ci===GHOST_CI): in both
            // cases every rand()/rng() above is already consumed — the skip
            // keeps the world rng order bit-for-bit while nothing renders.
            if(!inPierChannel(bx,bz)&&ci!==GHOST_CI)boxes.push(box);
            acc+=p.w[i];
          }
        }
      }
    }
    // MONTROSE stub terraces — FOLDED into THIS bucket (zero new draw calls).
    // A LOCAL xorshift (NOT the shared rng) jitters them, so appending after the
    // shared-rng loop above never shifts the world's rng order — every towel/tree
    // downstream stays bit-for-bit. TIER_DEFAULT (4 steps; z outside the Rocks
    // band). 070-072 replace a piece by editing its COAST_MTR_* array only.
    {
      let hm=0x53c1a7f9>>>0;
      const mr=()=>{hm^=hm<<13;hm>>>=0;hm^=hm>>>17;hm^=hm<<5;hm>>>=0;return hm/4294967296;};
      const mj=a=>(mr()*2-1)*a;
      for(let ci=0;ci<MTR_SEGS.length;ci++){
        if(ci===3)continue;   // task 072: BEACH is sand — no terraces
        const segs=MTR_SEGS[ci],VT=VT_MTR[ci];
        // 104: the raked hook-tip curl (ci 6) is the map's tightest terraced
        // arc (r ~4-5 m) — at the shared 2.2 stride its OUTER tiers gap into
        // floating slabs. Densified stride for that piece only (same bucket,
        // +0 draws; the local hm stream downstream — golf jitter — shifts, a
        // cosmetic non-event).
        const stride=ci===6?1.1:2.2;
        for(let j=0;j<segs.length;j++){
          const s=segs[j],a=VT[j],b=VT[j+1];
          const turn=Math.acos(clamp(a[0]*b[0]+a[1]*b[1],-1,1)),xtra=Math.min(1.3,turn*3.0);
          for(let t=0;t<s.len;t+=stride){
            const u=t/s.len;let tgx=a[0]+(b[0]-a[0])*u,tgz=a[1]+(b[1]-a[1])*u;const tl=Math.hypot(tgx,tgz)||1;tgx/=tl;tgz/=tl;
            const nsx=-tgz,nsz=tgx,srot=Math.atan2(tgx,tgz);
            const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;
            const p=tierProfile(cz);let acc=0;
            for(let i=0;i<p.w.length;i++){
              const w=p.w[i]+mj(0.25);
              const off=acc+p.w[i]/2+mj(0.12);
              boxes.push({x:cx+nsx*off, z:cz+nsz*off,
                y:-i*p.step-0.4+mj(0.03), l:2.4+xtra*(1+off*0.14)+mj(0.45), w,
                rot:srot+mj(0.035),
                c:cols[i<2?(mr()*3|0):(2+(mr()*3|0))]});
              acc+=p.w[i];
            }
          }
        }
      }
    }
    const geo=new THREE.BoxGeometry(1,0.8,1);
    const inst=new THREE.InstancedMesh(geo,curveMat(new THREE.MeshToonMaterial({gradientMap:gmap})),boxes.length);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3(),E=new THREE.Euler();
    boxes.forEach((b,i)=>{
      E.set(0,b.rot,0);Q.setFromEuler(E);
      M.compose(V.set(b.x,b.y,b.z),Q,S.set(b.w,1,b.l));
      inst.setMatrixAt(i,M);inst.setColorAt(i,b.c);
    });
    inst.instanceMatrix.needsUpdate=true;inst.instanceColor.needsUpdate=true;
    scene.add(inst);
  }

  // peninsula SOUTH-TIP terraces (TIER_DEFAULT, wrapping the horseshoe). Rendered as its
  // OWN instanced mesh with DETERMINISTIC jitter (an xorshift seeded once, NOT the shared
  // rng) so this addition never shifts the world's rng order — every towel/flower/tree
  // downstream stays put (hard constraint #1). Same limestone look as the main revetment.
  {
    const cols=[0xc7ccb8,0xbcc1ad,0xb1b6a1,0xa6ab95,0x999e86].map(c=>new THREE.Color(c));
    let h=0x9e3779b1>>>0;                     // local deterministic jitter (no shared rng)
    const jr=()=>{h^=h<<13;h>>>=0;h^=h>>>17;h^=h<<5;h>>>=0;return h/4294967296;};
    const jit=a=>(jr()*2-1)*a;
    const boxes=[];
    const VT=VT_TIP;   // junction-welded with COAST_PEN (see top of buildCoast)
    for(let j=0;j<TIP_SEGS.length;j++){
      const s=TIP_SEGS[j],a=VT[j],b=VT[j+1];
      const turn=Math.acos(clamp(a[0]*b[0]+a[1]*b[1],-1,1)),xtra=Math.min(1.3,turn*3.0);   // smooth the horseshoe
      for(let t=0;t<s.len;t+=1.7){   // denser than the straight coasts: the horseshoe's outer tiers need the coverage (own jitter rng — shared-rng order untouched)
        const u=t/s.len;let tgx=a[0]+(b[0]-a[0])*u,tgz=a[1]+(b[1]-a[1])*u;const tl=Math.hypot(tgx,tgz)||1;tgx/=tl;tgz/=tl;
        const nsx=-tgz,nsz=tgx,srot=Math.atan2(tgx,tgz);
        const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;
        const p=tierProfile(cz);let acc=0;
        for(let i=0;i<p.w.length;i++){
          const w=p.w[i]+jit(0.25);
          const off=acc+p.w[i]/2+jit(0.12);
          boxes.push({x:cx+nsx*off, z:cz+nsz*off,
            y:-i*p.step-0.4+jit(0.03), l:2.4+xtra*(1+off*0.14)+jit(0.35), w,
            rot:srot+jit(0.035),
            c:cols[i<2?(jr()*3|0):(2+(jr()*3|0))]});
          acc+=p.w[i];
        }
      }
    }
    const inst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,0.8,1),curveMat(new THREE.MeshToonMaterial({gradientMap:gmap})),boxes.length);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3(),E=new THREE.Euler();
    boxes.forEach((b,i)=>{E.set(0,b.rot,0);Q.setFromEuler(E);M.compose(V.set(b.x,b.y,b.z),Q,S.set(b.w,1,b.l));inst.setMatrixAt(i,M);inst.setColorAt(i,b.c);});
    inst.instanceMatrix.needsUpdate=true;inst.instanceColor.needsUpdate=true;
    scene.add(inst);
  }

  // waterline WET-STAIN band: a subtle darker warm-gray strip hugging the OUTER
  // (water) edge of the bottom promenade — the wet stain the concrete takes at the
  // waterline in the reference photo. Deterministic (no shared rng), one InstancedMesh,
  // skipped in the pier slip. Sits flush on the promenade (y≈-1.9) covering its outer ~1.7 m.
  {
    const band=[];
    for(const[C,VT]of openRuns){
      for(let j=0;j<C.length;j++){
        const s=C[j],a=VT[j],b=VT[j+1];
        for(let t=0;t<s.len;t+=1.9){
          const u=t/s.len;
          let tgx=a[0]+(b[0]-a[0])*u,tgz=a[1]+(b[1]-a[1])*u;const tl=Math.hypot(tgx,tgz)||1;tgx/=tl;tgz/=tl;
          const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;
          const p=tierProfile(cz),tot=profileTotal(cz),lat=tot-1.35;   // outer band of the promenade, FLUSH inside the slab edge (no overhang past the piles)
          const bx=cx+(-tgz)*lat,bz=cz+tgx*lat;
          if(inPierChannel(bx,bz))continue;
          band.push({x:bx,z:bz,y:-(p.w.length-1)*p.step+0.06,rot:Math.atan2(tgx,tgz)});
        }
      }
    }
    const inst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),curveMat(new THREE.MeshToonMaterial({gradientMap:gmap})),band.length);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3(),E=new THREE.Euler();
    const wet=new THREE.Color(0x7a7b64);
    band.forEach((b,i)=>{E.set(0,b.rot,0);Q.setFromEuler(E);M.compose(V.set(b.x,b.y,b.z),Q,S.set(2.6,0.06,2.5));inst.setMatrixAt(i,M);inst.setColorAt(i,wet);});
    inst.instanceMatrix.needsUpdate=true;inst.instanceColor.needsUpdate=true;
    scene.add(inst);
  }

  // harbor entrance light on the tip's top step (short white tower, red cap, warm bulb).
  {
    const L=CH.HARBOR_LIGHT,lx=L.pos[0],lz=L.pos[1];
    const g=new THREE.Group();
    const tower=new THREE.Mesh(new THREE.CylinderGeometry(L.r*0.78,L.r,L.towerH,10),toon(L.white));tower.position.y=L.towerH/2;g.add(tower);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(L.r*0.92,L.r*0.92,0.5,10),toon(L.red));cap.position.y=L.towerH+0.25;g.add(cap);
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(L.r*0.6,10,8),bmat(L.glow));bulb.position.y=L.towerH+0.6;g.add(bulb);
    g.position.set(lx,0,lz);scene.add(g);
  }
  // MONTROSE (070) harbor entrance light — on the hook-tip apex (same register).
  {
    const L=CH.MT_HARBOR_LIGHT,lx=L.pos[0],lz=L.pos[1];
    const g=new THREE.Group();
    const tower=new THREE.Mesh(new THREE.CylinderGeometry(L.r*0.78,L.r,L.towerH,10),toon(L.white));tower.position.y=L.towerH/2;g.add(tower);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(L.r*0.92,L.r*0.92,0.5,10),toon(L.red));cap.position.y=L.towerH+0.25;g.add(cap);
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(L.r*0.6,10,8),bmat(L.glow));bulb.position.y=L.towerH+0.6;g.add(bulb);
    g.position.set(lx,0,lz);scene.add(g);
  }
  // MONTROSE (070) mole STONE walk cap — the breakwater top reads as concrete, not
  // the LAND lawn. A flat filled polygon over the mole footprint (a lone frustum-
  // culled Mesh -> +0 draws unless the far-north hook is framed).
  {
    const P=CH.MT_MOLE_PAVE,s=new THREE.Shape();
    s.moveTo(P[0][0],-P[0][1]);for(let i=1;i<P.length;i++)s.lineTo(P[i][0],-P[i][1]);s.closePath();
    const g=new THREE.ShapeGeometry(s);g.rotateX(-Math.PI/2);
    const m=new THREE.Mesh(g,curveMat(new THREE.MeshToonMaterial({color:0xb7b1a2,gradientMap:gmap})));
    m.position.y=0.06;scene.add(m);
  }

  // sheet-pile walls — the sawtooth steel edge from the photo
  const pileData=[];
  function wallLine(pts,topY,botY){
    const segs=buildSegs(pts);
    for(const s of segs){
      for(let t=0;t<s.len;t+=1.15){
        const k=pileData.length;
        pileData.push({
          x:s.ax+s.tx*t+s.nx*((k%2?0.24:-0.05)),
          z:s.az+s.tz*t+s.nz*((k%2?0.24:-0.05)),
          y:(topY+botY)/2, h:topY-botY,
          rot:Math.atan2(s.tx,s.tz), dark:k%2
        });
      }
    }
  }
  // along every open-lake revetment, at the outer edge of the bottom tier —
  // offset along the junction-welded interpolated tangent so the pile row
  // sweeps the corners with the slabs instead of tearing at piece seams
  for(const[S2,VT]of openRuns){
    for(let j=0;j<S2.length;j++){
      const s=S2[j],a=VT[j],b=VT[j+1];
      for(let t=0;t<s.len;t+=1.15){
        const u=t/s.len;
        let tgx=a[0]+(b[0]-a[0])*u,tgz=a[1]+(b[1]-a[1])*u;const tl=Math.hypot(tgx,tgz)||1;tgx/=tl;tgz/=tl;
        const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;
        const p=tierProfile(cz),tot=profileTotal(cz);
        const topY=-(p.w.length-1)*p.step+0.06;
        const k=pileData.length,jut=(k%2?0.26:-0.04);
        const px=cx+(-tgz)*(tot+jut),pz=cz+tgx*(tot+jut);
        if(inPierChannel(px,pz))continue;                       // pier slip opens to the lake — no wall across it
        pileData.push({x:px,z:pz,
          y:(topY-3.1)/2,h:topY+3.1,rot:Math.atan2(tgx,tgz),dark:k%2});
      }
    }
  }
  // basin + mouth seawalls (flush with the park, straight down)
  for(const pts of CH.seawallLines({P_START,BASIN_W}))wallLine(pts,CH.SEAWALL_Y.top,CH.SEAWALL_Y.bot);
  {
    const geo=new THREE.BoxGeometry(1.22,1,0.5);
    const m1=curveMat(new THREE.MeshToonMaterial({gradientMap:gmap}));
    const inst=new THREE.InstancedMesh(geo,m1,pileData.length);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3(),E=new THREE.Euler();
    const c1=new THREE.Color(0x6f665a),c2=new THREE.Color(0x655c50);
    pileData.forEach((p,i)=>{
      E.set(0,p.rot,0);Q.setFromEuler(E);
      M.compose(V.set(p.x,p.y,p.z),Q,S.set(1,p.h,1));
      inst.setMatrixAt(i,M);inst.setColorAt(i,p.dark?c2:c1);
    });
    inst.instanceMatrix.needsUpdate=true;inst.instanceColor.needsUpdate=true;
    scene.add(inst);
  }

  // continuous WALL FACES — an opaque concrete strip directly behind every
  // pile line, from the promenade/seawall top down to below the waterline.
  // The piles alone are ribs with ~0.65 m gaps between them; from the water
  // you could see grass/sky straight through (the 'transparent seawall' bug).
  // The strip closes every gap so all walls read opaque from every angle.
  // One InstancedMesh, fully deterministic (no shared rng).
  {
    const faces=[];
    // open-lake revetments: tucked just inside the bottom-tier slab edge, top
    // kept below the promenade surface so it never pokes through the walkway
    for(const[S2,VT]of openRuns){
      for(let j=0;j<S2.length;j++){
        const s=S2[j],a=VT[j],b=VT[j+1];
        for(let t=0;t<s.len;t+=2.0){
          const u=t/s.len;
          let tgx=a[0]+(b[0]-a[0])*u,tgz=a[1]+(b[1]-a[1])*u;const tl=Math.hypot(tgx,tgz)||1;tgx/=tl;tgz/=tl;
          const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;
          const p=tierProfile(cz),tot=profileTotal(cz);
          const topY=-(p.w.length-1)*p.step-0.06;
          const fx=cx+(-tgz)*(tot-0.42),fz=cz+tgx*(tot-0.42);
          if(inPierChannel(fx,fz))continue;
          faces.push({x:fx,z:fz,top:topY,bot:-3.2,rot:Math.atan2(tgx,tgz)});
        }
      }
    }
    // basin + mouth seawalls: directly behind the wallLine pile ribs, full height
    for(const pts of CH.seawallLines({P_START,BASIN_W})){
      const S2=buildSegs(pts);
      for(const s of S2){
        for(let t=0;t<s.len;t+=2.0){
          const cx=s.ax+s.tx*t,cz=s.az+s.tz*t;
          faces.push({x:cx-s.nx*0.38,z:cz-s.nz*0.38,top:CH.SEAWALL_Y.top,bot:CH.SEAWALL_Y.bot,rot:Math.atan2(s.tx,s.tz)});
        }
      }
    }
    const inst=new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.45,1,2.45),
      curveMat(new THREE.MeshToonMaterial({color:0x8f8e79,gradientMap:gmap})),faces.length);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3(),E=new THREE.Euler();
    faces.forEach((f,i)=>{
      E.set(0,f.rot,0);Q.setFromEuler(E);
      M.compose(V.set(f.x,(f.top+f.bot)/2,f.z),Q,S.set(1,f.top-f.bot,1));
      inst.setMatrixAt(i,M);
    });
    inst.instanceMatrix.needsUpdate=true;
    scene.add(inst);
  }

  // ------------------------------ ground --------------------------------
  function shapeFrom(pts){const s=new THREE.Shape();s.moveTo(pts[0][0],-pts[0][1]);for(let i=1;i<pts.length;i++)s.lineTo(pts[i][0],-pts[i][1]);s.closePath();return s}
  function flatShape(pts,y,mat){const g=new THREE.ShapeGeometry(shapeFrom(pts));g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,mat);m.position.y=y;return m}
  scene.add(flatShape(LAND,0,toon(0x7ecb6f)));

  const wgeo=new THREE.PlaneGeometry(CH.WATER.size,CH.WATER.size,CH.WATER.seg,CH.WATER.seg);wgeo.rotateX(-Math.PI/2);
  // per-vertex shore distance (world xz) -> banded water color in the shader
  // (~85 ms at full 181x181 res; no rng, no geometry change -> determinism intact).
  {
    const wcx=CH.WATER.cx,wcz=CH.WATER.cz,pos=wgeo.attributes.position,n=pos.count;
    const aShore=new Float32Array(n);
    for(let i=0;i<n;i++)aShore[i]=shoreDist(pos.getX(i)+wcx,pos.getZ(i)+wcz);
    wgeo.setAttribute('aShore',new THREE.BufferAttribute(aShore,1));
  }
  water=new THREE.Mesh(wgeo,livingWaterMat(0x2fa3b5));
  water.userData.live=true;              // animated (uTime) + local-position swell — exempt from the cell merge
  water.position.set(CH.WATER.cx,WATER_Y,CH.WATER.cz);scene.add(water);   // centered on the tall map so the lake never runs out

  // MONTROSE north stub water: a SECOND living-water plane for the new north
  // stretch (the main plane's north edge is only z-1085). Own material, ticked
  // by main.js like the main plane (069 froze it while the north was empty),
  // same shore-banded look via aShore. Sits WATER_N.yOff (0.02 m) LOWER so the
  // existing plane wins in the z-overlap (no seam / z-fight) and the EXISTING lake
  // surface — including the spawn view — stays BIT-IDENTICAL (the determinism
  // gate). A lone Mesh (frustum-culled) -> 0 draws unless the far north is framed.
  {
    const N=CH.WATER_N;
    const ng=new THREE.PlaneGeometry(N.size,N.size,N.seg,N.seg);ng.rotateX(-Math.PI/2);
    const pos=ng.attributes.position,nn=pos.count,aSh=new Float32Array(nn);
    for(let i=0;i<nn;i++)aSh[i]=shoreDist(pos.getX(i)+N.cx,pos.getZ(i)+N.cz);
    ng.setAttribute('aShore',new THREE.BufferAttribute(aSh,1));
    const wn=new THREE.Mesh(ng,livingWaterMat(0x2fa3b5));
    wn.userData.live=true;               // exempt from the cell static merge (curved/shader mesh)
    wn.position.set(N.cx,WATER_Y+N.yOff,N.cz);scene.add(wn);
    waterN=wn;
  }

  // dog beach — sloped sand down to the basin water
  {
    const g=new THREE.PlaneGeometry(CH.DOG_BEACH.mesh.w,CH.DOG_BEACH.mesh.d,CH.DOG_BEACH.mesh.segW,CH.DOG_BEACH.mesh.segD);g.rotateX(-Math.PI/2);
    const cx=CH.DOG_BEACH.mesh.cx,cz=CH.DOG_BEACH.mesh.cz,pos=g.attributes.position;
    for(let i=0;i<pos.count;i++){
      const wx=pos.getX(i)+cx,wz=pos.getZ(i)+cz;
      const h=beachH(wx,wz);
      // outside the cove bounds: the NORTH fringe meets the lawn at 0, but the
      // SOUTH (waterline) fringe must keep dipping BELOW the water — snapping
      // it to 0 built a phantom sand wall at the beach foot that the player
      // could walk straight through (the user's cove-seam bug).
      pos.setY(i,h===null?(wz>CH.DOG_BEACH.bounds.z1?CH.DOG_BEACH.slope.depth-0.3:0):h+0.03);
    }
    g.computeVertexNormals();
    const m=new THREE.Mesh(g,toon(0xf0e2bd,{}));m.position.set(cx,0,cz);scene.add(m);

    // cove SKIRT: a vertical ribbon down the cove's landward arc (the LAND
    // polygon's own points) sealing the y=0 land edge to the dipping sand and
    // closing the see-through gaps at the seawall junctions on both sides.
    // DoubleSide per the opaque-from-every-angle rule. Deterministic, 1 mesh.
    {
      const arc=[[85,-327],[88,-333],[90,-339],[95,-341],[105,-341],[110,-339],[112,-333],[113,-330]];
      const spos=[],sidx=[];
      arc.forEach(([ax,az],i)=>{
        spos.push(ax,0.02,az, ax,-2.6,az);
        if(i<arc.length-1){const a=i*2;sidx.push(a,a+1,a+2, a+1,a+3,a+2);}
      });
      const sg=new THREE.BufferGeometry();
      sg.setAttribute('position',new THREE.Float32BufferAttribute(spos,3));
      sg.setIndex(sidx);sg.computeVertexNormals();
      scene.add(new THREE.Mesh(sg,toon(0xe6d8b4,{mat:{side:THREE.DoubleSide}})));
    }

    // seawall-junction PATCHES: the LAND cove arc spans x 85..113 but the sand
    // mesh/bounds span x 88..112 — the leftover notches beside the gates were
    // open water reaching the fence. Fill each with a wet-sand shelf just
    // above the waterline (visual only; walkability untouched).
    for(const[px0,px1]of[[83.6,88.4],[111.6,113.8]]){
      const pg=new THREE.PlaneGeometry(px1-px0,8.5);pg.rotateX(-Math.PI/2);
      const pm=new THREE.Mesh(pg,toon(0xe6d8b4,{mat:{side:THREE.DoubleSide}}));
      pm.position.set((px0+px1)/2,-2.05,-330.5);scene.add(pm);
    }
  }

    // Montrose Beach — the big sand sweep (task 072). A LONE frustum-culled Mesh
    // (0 draws unless the beach is framed). Height via montroseBeachH: dry inland,
    // sloping UNDER the lake at the EAST (waterline) edge. The roped dune mounds +
    // grasses + buildings sit on top (props.js / structures.js); walkability is
    // beachWalkable + the beachCarved carves (main.js). No shared rng, 0 new bucket.
    {
      const MB=CH.MONTROSE_BEACH,m=MB.mesh;
      const g=new THREE.PlaneGeometry(m.w,m.d,m.segW,m.segD);g.rotateX(-Math.PI/2);
      const pos=g.attributes.position;
      for(let i=0;i<pos.count;i++){
        const wx=pos.getX(i)+m.cx,wz=pos.getZ(i)+m.cz;
        const h=CH.montroseBeachH(wx,wz);
        // outside the sand bounds: the EAST fringe keeps dipping below the lake
        // (no phantom sand wall at the foot); other fringes meet grade at 0.
        pos.setY(i,h===null?(wx>MB.bounds.x1?MB.slope.depth-0.3:0):h+0.03);
      }
      g.computeVertexNormals();
      const mesh=new THREE.Mesh(g,toon(MB.sand,{}));mesh.position.set(m.cx,0,m.cz);scene.add(mesh);
    }

  // ---- LINCOLN PARK ground + water + shade trees (112 SHELL) --------------
  // The map's FIRST land WEST of the Drive. The west park (with the Diversey
  // lagoon carved as a HOLE) + the east lakefront strip render as the same park
  // green as LAND; the zoo/conservatory/South Pond read as interim lawn (113-117
  // carve them piece-for-piece). WATER_S is a lone frustum-culled living-water
  // plane (the WATER_N precedent) for the south lake + the lagoon. Trees are
  // individual frustum-culled meshes (0 draws unless a Lincoln Park view frames
  // them) — NO shared rng, NO new InstancedMesh bucket, NO change to any pre-112
  // view (the whole block sits z>408, past the fog from every existing waypoint).
  {
    const lpGreen=toon(0x7ecb6f);   // the LAND park green
    const ws=shapeFrom(CH.LP_LAND_WEST);   // west park...
    // ...minus the Diversey lagoon AND (117) South Pond — both punched as HOLES
    // in the same green (note the -z negation shapeFrom uses; neither polygon
    // touches the outer boundary, so the earcut triangulation stays valid).
    for(const H of[CH.LP_DIVERSEY_WATER,CH.LP_SOUTHPOND_WATER]){
      const hp=new THREE.Path();
      hp.moveTo(H[0][0],-H[0][1]);for(let i=1;i<H.length;i++)hp.lineTo(H[i][0],-H[i][1]);hp.closePath();
      ws.holes.push(hp);
    }
    const wg=new THREE.ShapeGeometry(ws);wg.rotateX(-Math.PI/2);
    scene.add(new THREE.Mesh(wg,lpGreen));
    scene.add(flatShape(CH.LP_LAND_EAST,0,lpGreen));       // east lakefront strip

    // WATER_S — south lake + Diversey lagoon (living water, shore-banded like main)
    { const N=CH.WATER_S,U=CH.LP_UNDERPASS;
      const ng=new THREE.PlaneGeometry(N.size,N.size,N.seg,N.seg);ng.rotateX(-Math.PI/2);
      const pos=ng.attributes.position,nn=pos.count,aSh=new Float32Array(nn);
      for(let i=0;i<nn;i++)aSh[i]=shoreDist(pos.getX(i)+N.cx,pos.getZ(i)+N.cz);
      ng.setAttribute('aShore',new THREE.BufferAttribute(aSh,1));
      // 120: the Fullerton trench (floor -3.1) digs below this plane — clip its
      // footprint out of the water or the underpass reads as a flooded canal
      // (livingWaterMat clip note). Local coords: rect minus the mesh centre.
      // 124 (issue 037): z margin 1.2 -> 2.4 so the clip covers the FULL berm
      // gap (LSD.gap 653..669) — the old rect stopped at 653.8/668.2, and the
      // water plane showed through the two berm-gap corner slots (z 653..654.3
      // / 667.7..669, x 0..14, where no ground exists) as cyan patches at the
      // base of every approach view. The whole rect stays under LAND/berm, so
      // no legit lake is ever lost.
      const wn=new THREE.Mesh(ng,livingWaterMat(0x2fa3b5,
        {x0:U.rampW.x0-1.5-N.cx,x1:U.rampE.x1+1.5-N.cx,z0:U.z0-2.4-N.cz,z1:U.z1+2.4-N.cz}));
      wn.userData.live=true;                                // animated + local swell -> exempt from the cell merge
      wn.position.set(N.cx,WATER_Y+N.yOff,N.cz);scene.add(wn);
      waterS=wn;
    }

    // ---- SOUTH POND water (117) — a SHALLOW SELF-LIT sheet, NOT the deep-teal
    // WATER_S living plane: the 044 register (bmat, like the habitat pools) so
    // the algae green reads flat and the cattail/lily margins sit on top of it.
    // The green above is punched out at LP_SOUTHPOND_WATER, so three lone
    // frustum-culled meshes render the pond (0 draws unless a pond view frames
    // them): the water sheet, a darker centre pool, and the MUD RIM skirt --
    // one quad per polygon edge, starting 0.6 m OUTSIDE the hole (tucked under
    // the park green at rimY) and ramping 2 m inward to just below the
    // waterline, so it masks the land-hole vertical drop and reads as muddy
    // shallows. ZERO rng, ZERO InstancedMesh buckets, no walkability touch
    // (lpLandHit already subtracts the pond; the deck walks over it).
    {
      const SP=CH.LP_SOUTHPOND,P=CH.LP_SOUTHPOND_WATER;
      scene.add(flatShape(P,SP.waterY,bmat(SP.water)));
      { const cg=new THREE.CircleGeometry(1,30);cg.rotateX(-Math.PI/2);cg.scale(10,1,30);   // deeper middle (an inset ellipse well clear of the rim)
        const cm=new THREE.Mesh(cg,bmat(SP.water2));cm.position.set(-30,SP.waterY+0.015,950);scene.add(cm); }
      { const pos=[],nor=[],uv=[],idx=[],out=0.6,inw=2.0,yIn=SP.waterY-0.06;
        for(let i=0;i<P.length-1;i++){
          const ax=P[i][0],az=P[i][1],bx=P[i+1][0],bz=P[i+1][1];
          const l=Math.hypot(bx-ax,bz-az);if(l<1e-6)continue;
          let nx=-(bz-az)/l,nz=(bx-ax)/l;
          if(!pip((ax+bx)/2+nx*0.5,(az+bz)/2+nz*0.5,P)){nx=-nx;nz=-nz;}   // flip to point INTO the pond
          const b=pos.length/3;
          pos.push(ax-nx*out,SP.rimY,az-nz*out, bx-nx*out,SP.rimY,bz-nz*out, bx+nx*inw,yIn,bz+nz*inw, ax+nx*inw,yIn,az+nz*inw);
          nor.push(0,1,0, 0,1,0, 0,1,0, 0,1,0);
          uv.push(0,0, 1,0, 1,1, 0,1);                                    // uv kept: attribute-set parity with the other coast quads
          idx.push(b,b+1,b+2, b,b+2,b+3);
        }
        const rg=new THREE.BufferGeometry();
        rg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
        rg.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
        rg.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
        rg.setIndex(idx);
        scene.add(new THREE.Mesh(rg,bmat(SP.mud,{side:THREE.DoubleSide})));   // DoubleSide: convex/concave corners flip the quad winding
      }
    }

    // shade elms — hand-placed, individual frustum-culled meshes (CH.LP_TREES)
    const bark=toon(0x7a5a3c),leaf1=toon(0x5aa64f),leaf2=toon(0x74bd63);
    for(const[x,z,s]of CH.LP_TREES){
      const g=new THREE.Group();
      const tr=new THREE.Mesh(new THREE.CylinderGeometry(0.28*s,0.42*s,3.4*s,6),bark);tr.position.y=1.7*s;g.add(tr);
      const c1=new THREE.Mesh(new THREE.IcosahedronGeometry(2.0*s,0),leaf1);c1.position.y=4.0*s;c1.scale.set(1,0.85,1);g.add(c1);
      const c2=new THREE.Mesh(new THREE.IcosahedronGeometry(1.5*s,0),leaf2);c2.position.set(0.9*s,3.4*s,0.5*s);g.add(c2);
      const c3=new THREE.Mesh(new THREE.IcosahedronGeometry(1.4*s,0),leaf1);c3.position.set(-0.8*s,3.5*s,-0.6*s);g.add(c3);
      g.position.set(x,0,z);scene.add(g);
    }
  }

  // ---- DIVERSEY HARBOR dressing (113): bulkhead seawall + promenade + Fullerton culvert + mouth arch + lamps ----
  // Everything derives from CH.LP_DIVERSEY / CH.LP_DIVERSEY_WATER — the walls
  // follow the SAMPLED polygon points exactly (the 071 sampled-curve law), the
  // banks come from lpDivBank (the same single truth props/moorings/walkprobe
  // read). ZERO rng of any kind; 8 lone frustum-culled Meshes, no InstancedMesh
  // buckets, no walk changes (walkability = lpLandHit/lpWaterHit in chicago.js).
  // Nothing here draws unless a lagoon view frames it.
  {
    const LD=CH.LP_DIVERSEY,P=CH.LP_DIVERSEY_WATER;
    const stoneDS=toon(LD.stone,{mat:{side:THREE.DoubleSide}});   // walls/plates read from water AND land sides
    const mkGeo=(pos,nor,uv,idx)=>{const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
      g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
      g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));   // uv REQUIRED: attribute-set mismatches abort later merges
      g.setIndex(idx);return g;};

    // 1) BULKHEAD SEAWALL — one vertical quad per sampled polygon edge, from
    // wallTop down past the waterline. Wraps the WHOLE loop, including under
    // the culvert deck and around the south apex — intentional, so no walkable
    // water-shelf exists at any end (the Montrose terraced-tip law).
    {
      const pos=[],nor=[],uv=[],idx=[];
      for(let i=0;i<P.length-1;i++){
        const ax=P[i][0],az=P[i][1],bx=P[i+1][0],bz=P[i+1][1];
        const l=Math.hypot(bx-ax,bz-az);if(l<1e-6)continue;
        const nx=-(bz-az)/l,nz=(bx-ax)/l;                        // horizontal; facing handled by DoubleSide
        const b=pos.length/3;
        pos.push(ax,LD.wallTop,az, bx,LD.wallTop,bz, bx,LD.wallBot,bz, ax,LD.wallBot,az);
        nor.push(nx,0,nz, nx,0,nz, nx,0,nz, nx,0,nz);
        uv.push(0,0, 1,0, 1,1, 0,1);
        idx.push(b,b+1,b+2, b,b+2,b+3);
      }
      scene.add(new THREE.Mesh(mkGeo(pos,nor,uv,idx),stoneDS));
    }

    // 2) RIM CAP — the stone lip at wallTop along every edge: 0.2 over the
    // water, 0.35 over the land. Offset = the edge normal flipped AWAY from
    // the water (pip against the same polygon: inside = lagoon). Corner
    // overlaps are coplanar + identically-shaded -> invisible. DoubleSide:
    // the loop runs down one bank and back up the other, so winding flips.
    {
      const pos=[],nor=[],uv=[],idx=[];
      for(let i=0;i<P.length-1;i++){
        const ax=P[i][0],az=P[i][1],bx=P[i+1][0],bz=P[i+1][1];
        const l=Math.hypot(bx-ax,bz-az);if(l<1e-6)continue;
        let nx=-(bz-az)/l,nz=(bx-ax)/l;
        if(pip((ax+bx)/2+nx*0.5,(az+bz)/2+nz*0.5,P)){nx=-nx;nz=-nz;}   // flip landward
        const b=pos.length/3,y=LD.wallTop;
        pos.push(ax-nx*0.2,y,az-nz*0.2, bx-nx*0.2,y,bz-nz*0.2, bx+nx*0.35,y,bz+nz*0.35, ax+nx*0.35,y,az+nz*0.35);
        nor.push(0,1,0, 0,1,0, 0,1,0, 0,1,0);
        uv.push(0,0, 1,0, 1,1, 0,1);
        idx.push(b,b+1,b+2, b,b+2,b+3);
      }
      scene.add(new THREE.Mesh(mkGeo(pos,nor,uv,idx),toon(LD.cap,{mat:{side:THREE.DoubleSide}})));
    }

    // 3+4) PROMENADE PAVE — the east bank walk + the west (Cannon) quay, one
    // z-sampled triangle strip each (banks from lpDivBank so the pave hugs the
    // sampled curve), merged with the culvert DECK box into ONE mesh (same
    // pave color; the deck is 0.6 thick so it hides the hole edges below).
    {
      const pos=[],nor=[],uv=[],idx=[];
      const strip=(z0,z1,xw,xe)=>{        // xw/xe: west/east edge at z (xe>xw)
        const n=Math.ceil((z1-z0)/4),b=pos.length/3;
        for(let k=0;k<=n;k++){
          const z=z0+(z1-z0)*k/n;
          pos.push(xw(z),LD.paveY,z, xe(z),LD.paveY,z);
          nor.push(0,1,0, 0,1,0);
          uv.push(0,k/n, 1,k/n);
          if(k<n){const a=b+k*2;idx.push(a,a+2,a+1, a+1,a+2,a+3);}   // +y winding
        }
      };
      const E=LD.eastPave,W=LD.westPave,C=LD.culvert;
      strip(E.z0,E.z1,z=>CH.lpDivBank(z).e+0.05,z=>Math.min(CH.lpDivBank(z).e+0.05+E.w,E.xIn));   // a path BAND along the bank, lawn behind (not a bank-to-berm esplanade)
      strip(W.z0,W.z1,z=>CH.lpDivBank(z).w-W.w,z=>CH.lpDivBank(z).w-0.05);
      const deck=new THREE.BoxGeometry(C.x1-C.x0,0.6,C.z1-C.z0);
      deck.translate((C.x0+C.x1)/2,C.deckY-0.3,(C.z0+C.z1)/2);
      scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([mkGeo(pos,nor,uv,idx),deck],false),toon(LD.pave)));
    }

    // 5+6) CULVERT stonework + the NE MOUTH arch — ONE merged stone mesh.
    // Both arch faces are Shape-with-hole extrudes: the water reads THROUGH
    // the openings (WATER_S continues beneath the deck / the causeway hint).
    {
      const C=LD.culvert,A=C.arch,M=LD.mouth;
      // face plate w/ a flat-top opening, corners rounded by `rise` (the
      // underpass portal vocabulary — structures.js). Hole bottom sits 0.05
      // above the plate bottom (holes must not touch the outer boundary).
      const plate=(x0,x1,top,bot,o0,o1,oTop,rise)=>{
        const s=new THREE.Shape();
        s.moveTo(x0,bot);s.lineTo(x1,bot);s.lineTo(x1,top);s.lineTo(x0,top);s.closePath();
        const h=new THREE.Path();
        h.moveTo(o0,bot+0.05);h.lineTo(o1,bot+0.05);h.lineTo(o1,oTop-rise);
        h.quadraticCurveTo(o1,oTop,o1-rise*2,oTop);h.lineTo(o0+rise*2,oTop);
        h.quadraticCurveTo(o0,oTop,o0,oTop-rise);h.closePath();
        s.holes.push(h);
        return new THREE.ExtrudeGeometry(s,{depth:0.5,bevelEnabled:false});
      };
      const parts=[];
      // The face plate / parapet / curb span the DECK: inset 2 m at the WEST
      // end (today's look, all over land) and FLUSH at the east. 120 pulled
      // the culvert's east edge -8 -> -12 (CH.LP_DIVERSEY.culvert.x1) so the
      // deck can never float over the sunken Fullerton underpass's descending
      // west ramp — but these three were hard-coded to the PRE-120 deck
      // (BoxGeometry(24) at x -22 = -34..-10, plate(-34,-10)) and would now
      // hang 2 m PAST the deck edge over the ramp head. Derived from the data
      // now, like the deck itself. The arch opening is clamped 0.8 m inside
      // the plate: A.x1 (-12) now meets the deck edge, and a THREE.Shape hole
      // may never touch its outer boundary.
      const fx0=C.x0+2,fx1=C.x1,fwid=fx1-fx0,fxc=(fx0+fx1)/2;
      const ax0=Math.max(A.x0,fx0+0.8),ax1=Math.min(A.x1,fx1-0.8);
      // north parapet ON the deck (overhangs the water edge — unreachable, no collider)
      const par=new THREE.BoxGeometry(fwid,C.parapetH,0.5);par.translate(fxc,C.deckY+C.parapetH/2,C.z0-0.2);parts.push(par.toNonIndexed());
      // south curb — low, steppable-looking (visual only)
      const curb=new THREE.BoxGeometry(fwid,0.16,0.4);curb.translate(fxc,0.08,C.z1+0.15);parts.push(curb.toNonIndexed());
      // culvert NORTH arch face, extruded southward under the deck
      const nf=plate(fx0,fx1,C.deckY,-2.95,ax0,ax1,A.topY,A.rise);nf.translate(0,0,C.z0-0.05);parts.push(nf);
      // MOUTH face at the NE head — length runs along z, extruded 0.5 EAST.
      // Shape x = -world z (rotateY(PI/2) maps local +x -> world -z, +z -> +x).
      const mf=plate(-M.z1,-M.z0,LD.wallTop,-2.95,-(M.z1-1.2),-(M.z0+1.2),-0.6,0.5);
      mf.rotateY(Math.PI/2);mf.translate(M.x,0,0);parts.push(mf);
      scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(parts,false),stoneDS));

      // dark recesses — the near-black passage planes behind both openings
      // (the portal recess vocabulary, structures.js)
      const r1=new THREE.PlaneGeometry(A.x1-A.x0+1,3);r1.rotateY(Math.PI);r1.translate((A.x0+A.x1)/2,-1.3,C.z0+2.2);       // faces north (-z)
      const r2=new THREE.PlaneGeometry(M.z1-M.z0+1,3);r2.rotateY(-Math.PI/2);r2.translate(M.x+1.2,-1.5,(M.z0+M.z1)/2);    // faces west (-x)
      scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([r1,r2],false),toon(0x120f13)));

      // voussoir trim — flattened half-tori over both openings (the exact
      // structures.js flattened-torus recipe). The culvert band rises above
      // the deck: the segmental bridge silhouette read from across the lagoon.
      const v1=new THREE.TorusGeometry((A.x1-A.x0)/2+0.4,0.22,6,18,Math.PI);
      v1.scale(1,0.35,1);v1.translate((A.x0+A.x1)/2,A.topY+0.1,C.z0-0.1);
      const v2=new THREE.TorusGeometry((M.z1-M.z0-2.4)/2+0.4,0.16,6,16,Math.PI);
      v2.scale(1,0.3,1);v2.rotateY(Math.PI/2);v2.translate(M.x-0.1,-0.5,(M.z0+M.z1)/2);
      scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries([v1,v2],false),toon(0xe8dcc2)));
    }

    // 7) DOCK-BOX LAMPS — east promenade, every lampEvery from z 440. All
    // posts in ONE merged mesh (toon) + all glow tops in ONE (bmat: self-lit,
    // never toon — the harbor-light bulb register).
    {
      const posts=[],glows=[];
      for(let z=440;z<=632;z+=LD.lampEvery){
        const x=CH.lpDivBank(z).e+0.55;
        const p=new THREE.CylinderGeometry(0.07,0.07,1.15,8);p.translate(x,0.575,z);posts.push(p);
        const g=new THREE.SphereGeometry(0.13,8,6);g.translate(x,1.24,z);glows.push(g);
      }
      scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(posts,false),toon(LD.lampPost)));
      scene.add(new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(glows,false),bmat(LD.lampGlow)));
    }
  }

  // mottled grass patches (instanced — one draw call). Reject any placement
  // outside the LAND polygon (pip test PER TRY); if no land point turns up
  // within G.tries, SKIP the patch rather than dropping it on the water
  // (that was the 'grass circle floating on the harbor' bug).
  // CLASS RULE (issue 012 / task 023): a disc's CENTER being on land is not
  // enough — a big ellipse near the coast overhung the revetment and painted
  // green over the terrace steps (owner report at 151,115). Every ground disc
  // must clip at the coast boundary: test 12 rim points (+0.5 m margin)
  // against LAND and SHRINK the disc until the whole rim fits; if even 40%
  // doesn't fit, skip it. Pure geometry AFTER all rand draws — the tree
  // POST-filter analog for ground discs, zero world-rng impact.
  {
    const G=CH.GRASS_PATCHES,pm=bmat(G.color);
    const inst=new THREE.InstancedMesh(new THREE.CircleGeometry(1,G.segs),pm,G.count);
    const M=new THREE.Matrix4(),Q=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0)),S=new THREE.Vector3(),V=new THREE.Vector3();
    const rimFits=(x,z,rx,rz)=>{
      for(let a=0;a<12;a++){
        const th=a/12*Math.PI*2;
        if(!pip(x+Math.cos(th)*(rx+0.5),z+Math.sin(th)*(rz+0.5),LAND))return false;
      }
      return true;
    };
    let placed=0;
    for(let i=0;i<G.count;i++){
      let x,z,ok=false,tries=0;
      // 084: accept against the FROZEN pre-084 land ghost so the rand() try
      // pattern (and everything downstream in the shared stream) never moves;
      // the real-LAND post-filter below drops patches the compression put in
      // the water / on the mole (draws already consumed).
      while(tries++<G.tries){x=rand(G.xr[0],G.xr[1]);z=rand(G.zr[0],G.zr[1]);if(pip(x,z,LAND_GHOST084)){ok=true;break}}
      if(!ok)continue;                       // no land found -> never place on water
      const r=rand(G.radius[0],G.radius[1]),sx=rand(G.scaleX[0],G.scaleX[1]);
      if(!pip(x,z,LAND)||CH.scatterCarve084(x,z))continue;   // 084 post-filter (rng consumed above)
      let k=1;
      while(k>=0.4&&!rimFits(x,z,r*sx*k,r*k))k-=0.15;
      if(k<0.4)continue;                     // hugs the coast too tight at any size -> skip
      M.compose(V.set(x,0.02,z),Q,S.set(r*sx*k,r*k,1));inst.setMatrixAt(placed++,M);
    }
    inst.count=placed;
    inst.instanceMatrix.needsUpdate=true;scene.add(inst);
  }
}
