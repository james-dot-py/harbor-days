// =====================================================================
// MILLENNIUM PARK — the third cell (see GEOGRAPHY.md · MILLENNIUM_GEOGRAPHY)
// Pure data + pure walk functions. NO THREE imports — tools/walkprobe.mjs
// imports this file directly, so the engine and the probe share ONE
// walkability definition (no mirror drift).
//
// PARK-LOCAL displaced frame on BOTH axes (refs/millennium-park/osm.json
// provenance: dx −468.8, dz −2369.6; South Michigan Ave ∩ East Monroe St
// calibrated to game (40, 900)). Never validate against the true lakefront
// projection (z ≈ +3200 here) — PITFALLS.md / AUTOPILOT.md §4.4.
// Compass is TRUE: north up, lake east; downtown really is south (+z).
//
// HARD FLOOR: nothing in this cell may sit at z < 680 — the lakefront's
// GLOBAL skyline billboard (sky.js, scene-level, never hidden on cell swap,
// fog:false so never fog-culled) reaches world z 676.8 at x 181..209 after
// its 2.2x scale (computed from its deterministic mulberry32(0x5c1000)
// layout, task 040).
// =====================================================================

export const CELL_ID = 'millennium';
export const SEED_M = 20040716;                 // the park's opening day

// ---------------------------- streets ---------------------------------
// SCENERY roads behind planters + low park fence (the quiet downtown
// register — no barricades). Walkable ground is the park network below.
// Washington & Madison never enter the park: promenade break-lines only.
export const STREETS_M = {
  michigan: { x: 40,  road: 16, x0: 32,  x1: 48,  z0: 684, z1: 935 },
  randolph: { z: 698, road: 12, z0: 692, z1: 704, x0: 32,  x1: 216 },
  monroe  : { z: 901, road: 14, z0: 894, z1: 908, x0: 32,  x1: 216 },
  columbus: { x: 195, road: 10, x0: 190, x1: 200, z0: 692, z1: 908 },
  washingtonZ: 766, madisonZ: 831,               // paving axes, not roads
};

// Park fence + planter lines (builders instance them; the walk quads simply
// end here, so the wall is diegetic). Gaps: the arrival kiosk on Michigan,
// the BP deck flying over the Columbus line.
export const BARRIER_M = [
  { a: [48, 705],  b: [48, 795] },               // Michigan, N of the kiosk
  { a: [48, 805],  b: [48, 894] },               // Michigan, S of the kiosk
  { a: [48, 705],  b: [189, 705] },              // Randolph
  { a: [48, 894],  b: [189, 894] },              // Monroe
  { a: [189, 713], b: [189, 792] },              // Columbus, N of the bridge
  { a: [189, 814], b: [189, 886] },              // Columbus, S of the bridge
];

// -------------------- arrival (Red Line SUBWAY kiosk) ------------------
// STANDING LIBERTY: the State->Michigan block is compressed to zero — the
// subway stair kiosk stands ON the Michigan sidewalk (GEOGRAPHY.md). The
// stair down is the 042 boarding point; until then it dead-ends politely
// (no "future" signage — task-030 owner rule). entry faces the park (east).
export const KIOSK_M = { x0: 48, x1: 52.5, z0: 796, z1: 804.5, entry: 'east', pylonZ: 800 };

// ------------------------ landmark anchors -----------------------------
// Wrigley Square + Millennium Monument (NW): semicircular paired-Doric
// peristyle on a raised curved base, OPEN SIDE SE over its lawn — BUILT 1:1
// object scale, task 050, from the owner night photo (the 040 rect
// 61-73 x 721-727 was the raw 1:2 osm plan; Cloud Gate precedent, center
// kept). Base arc / piers / basin / lamps are builder COLLIDERS standing in
// the plaza walk quad (statue pattern); the exedra interior stays walkable
// through the open SE side. peristyle.x0..z1 = built bounding box (tools
// containment checks). Shared by src/millennium/wrigleymonument.js and
// tools/gen-waypoints.mjs VOLS_M.
export const WRIGLEY_SQ_M = {
  plaza: { x0: 57, x1: 96, z0: 713, z1: 752 },   // walk quad
  peristyle: {
    cx: 68, cz: 724.5, open: 'SE',               // arc center; opening faces SE (+x,+z diagonal)
    rOut: 9.0, rIn: 7.6, cols: 12,               // paired Doric rings, 12 columns each
    baseH: 2.2, colH: 8.0, entabH: 1.3,          // curved base + shafts + entablature ≈ 11.5 crown
    x0: 57.9, x1: 75.8, z0: 714.4, z1: 732.3,    // built bounding box (step ring r 10.1; rotated end piers)
  },
  fountain: { x: 70.8, z: 727.3, r: 2.4, jetH: 3.6 },  // single-jet basin at the exedra's foot
  urns: [[73.9, 718.6], [62.1, 730.4]],          // planter urns on the chord-end piers
  lamps: [[77.1, 721.8], [65.3, 733.6]],         // quad-globe period lamps at the lawn approach
  lawn: { x0: 58, x1: 90, z0: 730, z1: 750 },    // visual (inside the plaza quad)
  wall: { x: 78, z: 749, text: 'WIGGLY SQUARE' },
  grate: { x: 72, z: 709 },                      // Millennium Station rumble flavor (delight seed)
};

// McCormick Tribune Plaza — THE ICE RINK (owner override 2026-07-11, task
// 049; supersedes the 040 "summer cafe, no rink ever" call). SUNKEN one
// level below the Bean plaza and fully WALKABLE-GLIDABLE: a white ice sheet
// (kind 'ice' -> the main.js skate glide) ringed by chunky boards (0.8 m
// non-walk gap — wider than the worst per-frame step so a fast glide can't
// tunnel), a rubber apron ring, a west stair-ramp entry from the Michigan
// spine, and a ~1.1-1.6 m non-walk rim buffer all around (elevator rule:
// no y0 walk may sit grid-adjacent to the y -1.6 floor). East rim band
// (76.9-78) carries the toon PARK GRILL facade under the balustrade at
// railX. Perpetual-dusk seasonal liberty recorded in GEOGRAPHY + BRIEF.
// 093 (owner note 2026-07-18 "more space to skate around and do tricks"):
// the sheet GREW 13.5 x 46.5 ≈ 628 m² (~1.5x the 049 sheet 11 x 38) — pit
// pushed 2 north to the Washington walk edge (770) and 2 east into the Bean
// plaza (railX 78; the balustrade overlook composition keeps), west entry /
// gate / Park Grill band / apron ring pattern intact.
export const RINK_M = {
  x0: 57, x1: 78, z0: 770, z1: 826, y: -1.6, railX: 78,
  ice:     { x0: 61, x1: 74.5, z0: 775.5, z1: 822 },      // the sheet (kind 'ice')
  boardW: 0.8, boardH: 1.05,                              // boards gap/wall around the ice
  gate:    { z0: 797.5, z1: 802.5 },                      // opening in the WEST boards
  ramp:    { x0: 57, x1: 60, z0: 798.5, z1: 801.5 },      // stair-ramp, y 0 -> -1.6 along x (3.0 m: slope 0.53 <= the 0.55 elevator guard)
  landing: { x0: 60, x1: 61, z0: 797.5, z1: 802.5 },      // foot of the stairs, through the gate
  apron:   { x0: 58.6, x1: 76.9, z0: 771.6, z1: 824.4 },  // walkable ring outer bounds
  cornerR: 1.5,                                           // 45° corner-cut colliders (builder)
};
// surface KIND at (x,z) — the engine (cells.js cellKind) and any tool read
// the SAME answer. 'ice' turns on the skate glide in main.js.
export function kindAtM(x, z) {
  const I = RINK_M.ice;
  if (x >= I.x0 && x <= I.x1 && z >= I.z0 && z <= I.z1) return 'ice';
  // the Maggie Daley Skating Ribbon (059 flips OPEN_GRANT.ribbonIce; the
  // strip segs are defined with the walkability tables below — call-time
  // reference, so declaration order is fine)
  if (OPEN_GRANT.ribbonIce)
    for (const q of RIBBON_SEGS_M) if (inQuadM(q, x, z)) return 'ice';
  return null;
}

// Cloud Gate on AT&T Plaza — toon HOMAGE (painted reflection, never
// computed; copyright register). Long axis N-S; the plaza walks CONTINUOUS
// UNDER the arch — colliders are the two ground-contact lobes only.
// 1:1 OBJECT SCALE (13 x 20 x h 10, the real ballpark; task 043): the 040
// rect was the raw 1:2-compressed osm plan — center (86.8, 797.7) kept.
// archHalf: the walk-under arch's half-span along z (soffit hits 0 there);
// the lobes sit just outboard of it.
export const CLOUD_GATE_M = {
  plaza: { x0: 78, x1: 98, z0: 776, z1: 826 },   // walk quad (x0 78: the 093 rink growth — balustrade overlook at railX)
  bean: { x0: 80.3, x1: 93.3, z0: 787.7, z1: 807.7, cx: 86.8, cz: 797.7, h: 10, axis: 'ns' },
  legs: [{ x: 86.8, z: 792.2, r: 2.2 }, { x: 86.8, z: 803.2, r: 2.2 }],
  archHalf: 4.6,
};

// Crown Fountain — a walkable WET black-granite plaza (the film is visual;
// data y stays 0). Glass-block LED-face towers are colliders standing in
// the walk quad. Homage register (invented toon faces).
export const CROWN_M = {
  plaza: { x0: 57, x1: 86, z0: 838, z1: 886 },   // walk quad
  pool: { x0: 66, x1: 73.5, z0: 847, z1: 881 },
  towers: [
    { x0: 68,   x1: 71.5, z0: 850,   z1: 853 },  // north face-tower
    { x0: 68.5, x1: 72,   z0: 875.5, z1: 878.5 },// south face-tower
  ],
  towerH: 15.2,
  benches: { x: 75.5, z0: 850, z1: 878 },        // wood-beam east rim
  bosques: [                                     // elm rows flanking the pool
    { x0: 58, x1: 65, z0: 846, z1: 882 },
    { x0: 75, x1: 84, z0: 846, z1: 882 },
  ],
};

// Jay Pritzker Pavilion + seating bowl + Great Lawn + trellis. Stage mouth
// faces SOUTH; Harris Theater flybox adjoins its north. The trellis east
// edge stops at 166 — the BP approach owns x 168+.
export const PRITZKER_M = {
  stage: { x0: 123, x1: 170, z0: 747, z1: 758, mouth: 'S' },
  harris: { x0: 129, x1: 163, z0: 715, z1: 747 },
  speakers: [{ x: 118, z: 752 }, { x: 175, z: 752 }],
  bowl: { x0: 118, x1: 186, z0: 758, z1: 788 },  // red seat field (walkable)
  lawn: { x0: 118, x1: 186, z0: 788, z1: 846 },  // carved into 3 walk quads (BP approach)
  // trellis: criss-cross pipe-arc dome. bays paired posts per long edge
  // (x0/x1); arcs spring from post tops (colH) to apexH. Shared by the
  // builder (src/millennium/pritzker.js) and gen-waypoints VOLS_M.
  trellis: { x0: 120, x1: 166, z0: 792, z1: 844, colH: 9, apexH: 14, bays: 6, colR: 0.7 },
};

// Lurie Garden — shoulder hedges (4.5 m clipped walls inside dark-steel
// armature cages, frame lips proud) on the N and W; the Seam boardwalk is
// the ONLY interior walk; the plates are planting.
export const LURIE_M = {
  bounds: { x0: 124, x1: 179, z0: 842, z1: 892 },
  hedgeN: { x0: 128, x1: 170, z0: 846, z1: 851, h: 4.5 },
  hedgeW: { x0: 124, x1: 129, z0: 846, z1: 876, h: 4.5 },
  gateNE: { x0: 170, x1: 179, z0: 843, z1: 852 },        // walk quad (hedge break)
  seam: { a: [175, 849.5], b: [144, 874], halfW: 2.5,    // boardwalk walk quad (rill beneath)
    // sittable edge — the mayor sits ON the boardwalk-edge bench (lurie.js
    // builds a real wood bench along the −halfW rail here), feet dangling over
    // the rill (task 048 item 0b: the old centre-of-walk sits seated on nothing).
    // Seats sit at lateral −2.15 (0.35 inboard of the ±halfW rail) so they stay
    // INSIDE the seg walk quad — walkprobe still proves them walkable at y0 —
    // and face straight out over the rill (ry ≈ −2.47 = the −halfW normal).
    sits: [
      { x: 161.27, z: 857.61, ry: -2.47 },
      { x: 154.47, z: 863.01, ry: -2.47 },
    ] },
  linkSW: { x0: 138, x1: 149, z0: 870, z1: 880 },        // walk quad to the south rim
  southRim: { x0: 130, x1: 182, z0: 878, z1: 886 },      // walk quad along Monroe
  plates: { light: [153.6, 852.5], dark: [167.7, 870.7] }, // salvia/amsonia tapestries (NOT walkable)
};

// BP bridge — serpentine deck, RAMP-ONLY access from the lawn edge; the
// walkable deck ends at the crest past Columbus (the clamp backs it); the
// scenery run continues descending toward Maggie Daley and dead-ends
// politely at the frame (046 decides the exact treatment). Stainless
// shingle parapets (colliders) enclose both flanks. Homage register.
export const BP_BRIDGE_M = {
  approach: { x0: 168, x1: 186, z0: 792, z1: 800, y0: 0, y1: 3.8 },  // ramp walk quad
  segs: [
    { a: [186, 796], b: [196, 804], halfW: 2.6, y0: 3.8, y1: 5 },    // rising walk quad
    { a: [196, 804], b: [205, 810], halfW: 2.6, y0: 5,   y1: 5 },    // crest walk quad (over Columbus)
  ],
  scenery: [[205, 810], [216, 818], [228, 824], [242, 833]],          // beyond the clamp, descending
  deckW: 5.2, parapetH: 1.4,
};

// Chase Promenade — tree-lined allee, three blocks Randolph->Monroe, with
// paired curved inscribed limestone plinths at the entrances.
export const CHASE_M = {
  walk: { x0: 96, x1: 120, z0: 713, z1: 886 },   // walk quad
  treeRowsX: [100, 116],
  plinths: [{ x: 102, z: 716 }, { x: 114, z: 716 }, { x: 102, z: 883 }, { x: 114, z: 883 }],
  boeing: [{ x: 81, z: 724 }, { x: 81, z: 884 }],// gallery terraces (paving detail)
};

// Exelon pavilions — four black glass cubes (colliders; the S pair stands
// pulled ~6 north of its osm curb spots, off the Monroe walk).
export const EXELON_M = { sz: 8, h: 6, cubes: [
  { x: 125, z: 718 }, { x: 168, z: 720 },        // N pair flanking Harris
  { x: 125, z: 882 }, { x: 170, z: 882 },        // S pair flanking the Lurie approaches
] };

// McDonald's Cycle Center (scenery, NE pocket) + Nichols Bridgeway (scenery
// ribbon leaving the frame over Monroe) + Monroe food-truck row (read over
// the fence — perpetual-summer street food).
export const CYCLE_M = { x: 176, z: 722, w: 10, d: 8 };
export const NICHOLS_M = { a: [122, 846, 1.5], b: [112, 930, 13], w: 3 };
export const FOODTRUCKS_M = { z: 897, xs: [72, 84, 96, 108] };

// ------------------- the Michigan Ave cliff + backdrops ----------------
// STREETWALL: the west wall — every in-park view west terminates here.
// Faces at x 30 (across the scenery road), 1:1 verticals (10-25 storeys).
// Anchors cite osm footprints; 041 dresses them in the house style.
export const STREETWALL_M = {
  band: { x0: 6, x1: 30, z0: 684, z1: 935 },
  anchors: [
    { name: 'CULTURAL CENTER', z: 760, w: 34, h: 34, style: 'colonnade' },  // PUBLIC LIBRARY cornice
    { name: 'SIX N MICHIGAN',  z: 824, w: 16, h: 60, style: 'tower' },
    { name: 'ATHLETIC ASSN',   z: 836, w: 14, h: 46, style: 'gothic' },     // Venetian tracery + arch crown
    { name: 'WILLOUGHBY',      z: 846, w: 14, h: 72, style: 'tower' },
    { name: 'GAGE',            z: 861, w: 18, h: 42, style: 'sullivan' },
    { name: 'UNIVERSITY CLUB', z: 896, w: 15, h: 70, style: 'gothic' },
    { name: 'MONROE BLDG',     z: 919, w: 14, h: 55, style: 'gable' },
  ],
  lampX: 47.2,                                   // quad-globe lamps + pennant banners on the spine curb
};
// Randolph giants band (z floor 680: billboard clearance, GEOGRAPHY.md) —
// E-W ORDER preserved (Pru -> Two Pru -> Aon -> Blue Cross). Verticals at
// the skyline-billboard register (~0.55-0.6x), NOT 1:1 — recorded liberty.
export const BACKDROP_M = {
  giants: { z0: 680, z1: 692, list: [
    { name: 'ONE PRU',    x: 79,  w: 42, h: 130, style: 'sign-slab' },      // white PRUDENT OWL sign
    { name: 'TWO PRU',    x: 102, w: 22, h: 165, style: 'diamond-spire' },
    { name: 'AON',        x: 172, w: 30, h: 200, style: 'white-fins' },
    { name: 'BLUE CROSS', x: 206, w: 26, h: 95,  style: 'glass' },          // osm x 245, pulled in-frame
  ] },
  east:  { x0: 214, x1: 238, z0: 700, z1: 908, floors: [6, 14] },           // lower Loop across Columbus
  south: { x0: 48, x1: 200, z0: 914, z1: 938,
           artInstitute: { x: 123, w: 46, h: 22 },                          // + lions, 048
           archX: 175 },                                                    // Stock Exchange Arch cameo
};

// =====================================================================
// GRANT PARK EXPANSION (task 057 layout; GEOGRAPHY.md → GRANT PARK
// EXPANSION is the law; refs/millennium-park/osm-grant.json is the cite).
// STAGED: nothing here is live until a builder flips its OPEN_GRANT flag —
// with all flags false this module behaves byte-identically to pre-057
// (same WALK_M order, same clamp, same minimap). Builders flip:
//   maggie       → 058 (BP crossing rebuilt on the real curve + all of
//                  Maggie Daley; east clamp/backdrops grow)
//   ribbonIce    → 059 (kindAtM 'ice' on the ribbon strip; 049 glide)
//   artInstitute → 060 (AI block + gardens + cliff extension; south grows)
//   nichols      → 060 sub-flag, ONLY if the bridgeway ships walkable
//   butler       → 061 (Butler Field + Lolla + street closure east/south)
// =====================================================================
export const OPEN_GRANT = {
  maggie: true, ribbonIce: true, artInstitute: true, nichols: true, butler: true,   // 058: Maggie LIVE · 059: ribbon ICE live · 060: ART INSTITUTE + NICHOLS LIVE · 061: BUTLER + LOLLA LIVE
};
const G = OPEN_GRANT;

// Scenery street extensions (builders draw these when their flag flips;
// STREETS_M above stays untouched for the pre-flip world).
export const STREETS_GRANT = {
  monroeEast:  { z: 897, z0: 894, z1: 908, x0: 216, x1: 340 },  // to LSD (east-end bend trimmed — liberty)
  columbusS:   { x: 195, x0: 190, x1: 200, z0: 908, z1: 1044 }, // to Jackson
  randolphE:   { z: 701, z0: 692, z1: 704, x0: 216, x1: 352 },
  jackson:     { z: 1038, z0: 1032, z1: 1044, x0: 32, x1: 352 },// new S frame (scenery, never walkable)
  lsd:         { x: 340, x0: 332, x1: 346, z0: 694, z1: 1044 }, // new E frame; straightened N of z 770 (NE-wedge fold)
  adamsAxis:   972,                                             // paving break-line on the spine (the lions' axis)
};

// THE CROSSING LAW: Lolla closes Monroe (Michigan→LSD) + Columbus (Monroe→
// Jackson) — walkable curb to curb, festival fence + arches (no CPD).
// Columbus NORTH of Monroe stays open scenery: the BP bridge is the only
// way into Maggie Daley from the park. Segments gate per GEOGRAPHY.
export const CLOSURE_M = {
  monroeWest: { x0: 48, x1: 190, z0: 894, z1: 908 },   // artInstitute (LOLLA LOAD-IN register pre-061)
  monroeEast: { x0: 200, x1: 336, z0: 894, z1: 908 },  // butler
  columbus:   { x0: 190, x1: 200, z0: 894, z1: 1040 }, // butler (z1 caps at CLAMP_FULL_M.zMax — frame discipline)
  arches: [{ x: 52, z: 901, face: 'S' }, { x: 240, z: 901, face: 'W' }, { x: 195, z: 925, face: 'N' }],
  lineup: { x: 206, z: 910 },                          // the all-Chicago pun poster (061)
};

// ---------------- Zone A: BP CROSSING (058, flag maggie) ---------------
// 093 SHORTENED serpentine (owner note 2026-07-18 "maggie daley bridge
// should be a bit shorter even if that's unrealistic" — recorded liberty,
// GEOGRAPHY.md). Both landings keep: lawn-SE launch (172.6, 834.9) → ONE
// rim wiggle → east over Columbus at z≈801 (y 5; the crossing moved ~11
// south of the osm line, closer to the straight launch→landing chord) →
// ONE hairpin (the famous S-hook compressed to a single curl) → grade at
// (247, 807.5) in Maggie. Polyline ~104 m vs the 058 osm-verbatim ~144 m
// (~28% shorter walk). Hand-fit 21 nodes [x, z, y]; bridge.js sweeps
// treads/parapets by CatmullRom tangent (048 contour law).
export const BP_CROSSING_M = {
  deckW: 5.2, parapetH: 1.4, halfW: 2.6,
  nodes: [
    [172.6, 834.9, 0],   [176.8, 830.3, 0.55], [179.4, 824.9, 1.1],
    [178.3, 819.5, 1.6], [180.3, 814.1, 2.15], [183.9, 809.1, 2.75],
    [188.5, 805.1, 3.4], [193.7, 802.3, 4.0],  [198.9, 800.8, 4.6],
    [202.6, 800.5, 5.0], [208.3, 802.6, 4.45], [213.9, 803.6, 3.95],
    [219.3, 802.3, 3.5], [223.7, 799.2, 3.0],  [228.1, 796.2, 2.5],
    [233.0, 795.6, 2.05],[236.8, 799.0, 1.3],  [239.0, 802.6, 0.6],
    [240.4, 805.8, 0.38],[243.2, 807.2, 0.2],  [247.0, 807.5, 0],
    // tail curls in from the WEST at z>=805 and is DOWN to <=0.6 by x 239, so
    // wherever the +-2.35 band reaches within 1 m of the grade landing plaza
    // (x0 243, z0 800) the deck sits <=~0.45 — never a side cliff onto y0
    // (the walkprobe 0.55 elevator guard, 093).
  ],
  launchPad: { x0: 168, x1: 186, z0: 833, z1: 846 },   // the shrunk lawn-SE esplanade
  // Columbus rim re-split for the 093 overflight (band at x 185.8-189 tops
  // out z≈809.8, buffer 2.5 both sides):
  rimN: { x0: 181, x1: 189, z0: 713, z1: 784 },
  rimS: [{ x0: 185.8, x1: 189, z0: 813, z1: 846 }, { x0: 181, x1: 189, z0: 846, z1: 886 }],
  // Columbus reads as a road TRENCH passing beneath the deck (visual only,
  // never walkable): the road band under the overflight is cut to floorY with
  // retaining walls at each curb (index.js carves the grade carpet + the
  // streets.js road plane around it — the 041 pit law; bridge.js builds the
  // sunken roadbed + walls). Spans the deck footprint at Columbus (z≈801, y5).
  trench: { x0: 190, x1: 200, z0: 793, z1: 809, floorY: -1.7 },
};

// ---------------- Zone B: MAGGIE DALEY (058 + 059) ---------------------
// Bounds x 198–338, z 699.5–892 (osm rel 224231352 west of straightened
// LSD). Rooftop-park topography = visual mounds; walk grade stays y 0.
export const MAGGIE_M = {
  bounds: { x0: 198, x1: 338, z0: 699.5, z1: 892 },
  fieldhouse: { x0: 243, x1: 285, z0: 712, z1: 727.5, h: 7 },       // osm 764227071 (Randolph front)
  tennis: { x0: 296, x1: 318, z0: 711.5, z1: 728 },                 // RELOCATED (NE-wedge fold liberty; real osm x 393–414)
  // climbing walls (owner aerial + 20151008 ref; not in OSM) — TRUE ISLAND
  // masses the ribbon loops AROUND (repositioned 062/issue 022: the 058 spots
  // put wall A's shell ON the ice centerline). Shell envelopes (footprint +
  // fold/bulge/truss overhangs) clear the ice band (centerline ±2.7) by
  // ≥3.5 m — walkprobe asserts this mechanically.
  walls: [
    { x0: 254, x1: 266, z0: 745, z1: 751, h: 12, read: 'faceted crescent' },
    { x0: 263, x1: 270, z0: 758, z1: 763, h: 9, read: 'prow' },
  ],
  hut: { x: 229.75, z: 760.75 },                                    // SW-lobe warming hut (aerial; re-centred in its pocket 062 — the old spot's roof kissed the ice edge)
  landing: { x0: 243, x1: 266, z0: 800, z1: 816 },                  // bridge apron plaza
  csg: {                                                            // Cancer Survivors' Garden (osm 10601819)
    bounds: { x0: 321.7, x1: 338.8, z0: 710.8, z1: 789 },
    columns: [[327.4, 714.5], [331.9, 714.5]],                      // the real Federal Building Columns
    pavilions: [{ x0: 326, x1: 333, z0: 743, z1: 749 }, { x0: 326, x1: 333, z0: 769, z1: 775 }],
  },
  play: {                                                           // the Play Garden (osm-NAMED rooms)
    zone: { x0: 252, x1: 316, z0: 806, z1: 864 },
    rooms: {
      cradleNest: { x0: 254.5, x1: 267, z0: 840, z1: 848 },
      ship:       { x0: 267, x1: 277, z0: 840, z1: 849 },           // 'Harbor' — red/blue play boat + rope nets
      sea:        { x0: 270.6, x1: 293, z0: 812.5, z1: 835 },
      lagoon:     { x0: 278, x1: 285, z0: 820, z1: 827 },
      wateringHole: { x0: 277.8, x1: 282.2, z0: 815, z1: 819 },     // splash pad (walkable wet, Crown register)
      enchantedForest: { x0: 295, x1: 313, z0: 808, z1: 829 },      // string lights at dusk
      swings:     { x0: 279, x1: 286, z0: 836, z1: 842 },
      slideCrater:{ x0: 294.5, x1: 314, z0: 838, z1: 862 },
    },
    tower:      { x0: 286, x1: 292, z0: 819, z1: 825, h: 8 },       // timber fort + rope suspension bridge
    lighthouse: { x: 303, z: 849, r: 3.2, h: 11 },                  // red/white stripes + curling tube slide
  },
  xmasts: [[214, 744], [246, 776], [272, 726.5], [258, 850], [300, 800]], // white X-crossed floodlight masts (signature; #3 pulled off the ice band, 062)
};
// The Skating Ribbon (osm way 524270342 VERBATIM, closed loop, 66 pts).
// 058 built the BED (rockwork rims + rails); 059 flipped ribbonIce → the
// strip renders as ICE (maggie.js), kindAtM returns 'ice' over it and the
// 049 glide just works (skaters live in packs/ribbon-skaters.js).
export const RIBBON_M = { halfW: 2.7, loop: [
  [276.1,738.9],[276.9,737.5],[277.1,736],[276.8,734.5],[276,733.2],[274.9,732.2],
  [273.4,731.7],[273,731.7],[271.9,731.7],[270.4,732.3],[268,734],[265.3,735.2],
  [262.3,735.5],[259.4,734.9],[257.3,734.1],[255.1,733.9],[253.6,734.1],[252.9,734.3],
  [250.9,735.3],[249.3,736.8],[248,739.5],[247.5,741.9],[247.2,746.4],[246.1,749.4],
  [244.2,751.8],[241.5,753.6],[238.4,754.9],[234.9,754.9],[230.4,753.5],[228.1,753.5],
  [225.9,754.2],[224,755.6],[222.8,757.6],[222.2,759.8],[222.2,762.1],[223,764.3],
  [224.5,766.1],[226.4,767.3],[228.6,767.9],[230.9,767.8],[236.3,766],[241,763],
  [244,761.5],[247.4,760.9],[250.8,761.1],[253.2,761.9],[255.3,763.4],[256.5,764.8],
  [256.9,765.4],[258.9,768.4],[262.5,770.2],[266.5,770.9],[270.5,770.6],[274.1,768.6],
  [276.9,765.6],[278.6,761.9],[279,760],[278.8,758],[278.2,756.2],[277,754.6],
  [274,750.4],[272.8,748.3],[272.3,745.9],[272.6,743.5],[273.6,741.3],[276.1,738.9],
] };

// ---------------- Zone C: ART INSTITUTE (060, flag artInstitute) --------
// Masses simplified from osm relation 1870546 (105-pt outline).
export const ART_M = {
  westBlock: { x0: 59, x1: 94, z0: 946, z1: 995, h: 17, pedimentH: 19 },
  portico:   { x0: 57.2, x1: 59.5, z0: 963.5, z1: 978 },            // Adams axis 972
  steps:     { x0: 53.2, x1: 57.2, z0: 963.5, z1: 978, y0: 0, y1: 1.9 }, // sittable
  urnBeds: [                                                        // non-walk flanks sealing the open stair sides
    { x0: 53.2, x1: 59.5, z0: 958, z1: 963.5 }, { x0: 53.2, x1: 59.5, z0: 978, z1: 984 },
  ],
  lions: [                                                          // THE meshes (r 1.9 colliders seal the plinths)
    { x: 54.4, z: 962.4, stance: 'on the prowl' },                  // north
    { x: 54.4, z: 979.4, stance: 'in an attitude of defiance' },    // south
  ],
  northGarden: { x0: 53, x1: 81, z0: 906, z1: 941,                  // osm 235227858 — hedged sculpture garden
    sculptures: [['Flying Dragon', 71.8, 930.2], ['Large Interior Form', 61.4, 914], ['Cubi VII', 67.6, 919.4]] },
  southGarden: { x0: 55, x1: 95, z0: 999, z1: 1032,                 // osm 235216579 — hawthorn bosque grid
    fountain: { x0: 81.9, x1: 86.5, z0: 1009, z1: 1015.5 } },       // Fountain of the Great Lakes (carved 4-rect)
  trench: { x0: 96, x1: 124, z0: 909, z1: 1032, floorY: -3 },       // open Metra cut — CARVE THE CARPET (041 pit law)
  waist:  { x0: 94, x1: 125, z0: 964.5, z1: 974, h: 12 },           // Gunsaulus gallery bridging the trench
  modernWing: { x0: 121, x1: 171, z0: 909, z1: 930, h: 14,
    bluhm: { x0: 124.8, x1: 132.4, z0: 909.5, z1: 922, y: 13 } },   // the Nichols landing terrace
  eastCampus: [
    { x0: 125, x1: 147, z0: 973, z1: 1031, h: 12 },                 // McKinlock block
    { x0: 147, x1: 175, z0: 980, z1: 1027, h: 12 },
    { x0: 168, x1: 180.3, z0: 942, z1: 980, h: 13 },                // Columbus pavilion
  ],
  pool: { x0: 177.4, x1: 183, z0: 954, z1: 985 },                   // east reflecting strip
  arch: { x: 184, z: 935 },                                         // Stock Exchange Arch — ITS REAL SPOT (retires the S-backdrop cameo)
  route66: { x: 48.5, z: 968 },                                     // BEGIN sign, pulled to the park curb (liberty)
  cliffS: [                                                         // Michigan cliff band extension z 935→1080
    { name: 'BORG-WARNER',      z: 984,  w: 16, h: 60, style: 'glass' },
    { name: 'SYMPHONY CENTER',  z: 1002, w: 26, h: 40, style: 'colonnade' },  // ORCHESTRA HALL
    { name: 'RAILWAY EXCHANGE', z: 1023, w: 26, h: 65, style: 'santafe' },    // white terra-cotta + rooftop SANTA FLEA sign
    { name: 'McCORMICK BLDG',   z: 1072, w: 28, h: 60, style: 'tower' },
  ],
};
// Nichols Bridgeway, REAL alignment (osm way 90707301) — white boat-hull
// ribbon lawn→Bluhm terrace. Walkable ONLY under OPEN_GRANT.nichols (060
// decides; else 060 rebuilds it as scenery on this alignment). nodes [x,z,y].
export const NICHOLS2_M = {
  halfW: 1.6,
  nodes: [[117.5, 839, 0], [117.6, 852, 1.6], [117.9, 872, 4.6], [118.7, 902, 9.2],
          [120.3, 918, 11.9], [122.4, 925.4, 13], [126, 922, 13]],
  pad: { x0: 113, x1: 121, z0: 833, z1: 839 },                      // lawn launch
  slot: { x0: 115.8, x1: 122.2 },                                   // carve width where it overflies y-0 walks
};

// ---------------- Zone D: BUTLER FIELD + LOLLA (061, flag butler) -------
export const BUTLER_M = {
  field: { x0: 198.6, x1: 326, z0: 900.7, z1: 1032.6 },             // osm 139013800
  // THE STAGE IS PETRILLO (osm 210671695; mouth faces NE — real bearing),
  // wearing festival dress: banner truss, line arrays, video side-boards.
  petrillo: { x0: 214, x1: 230, z0: 1002, z1: 1017, h: 14, mouth: 'NE', deckY: 1.6 },
  crowd: { x0: 225, x1: 300, z0: 940, z1: 1005 },                   // instanced swaying field; real bumpables at the rail
  booth: { x0: 258, x1: 266, z0: 968, z1: 976 },                    // sound booth (carved); dance circle beside (061)
  dance: { x: 272, z: 971.5, r: 3.0 },                              // the joinable dance circle, beside the booth (061)
  rail: { x0: 218, x1: 262, z: 1000.2 },                            // front-of-stage crowd barricade line (builder colliders)
  delays: [[250, 960], [288, 966]],                                 // mid-crowd delay/light towers (NEMA kit; colliders)
  totems: [[262, 981, 'star'], [246, 956, 'el'], [283, 950, 'disco']], // crowd totems (the gator crowd-surfs — packs/lolla.js)
  readingCones: { x: 262.7, z: 912.7 },                             // Serra — real spot, stays
  tents: { x0: 300, x1: 322, z0: 930, z1: 1010 },                   // white tent rows (NEMA-aerial kit)
  potties: { x0: 202, x1: 207, z0: 950, z1: 1000 },                 // the honest row, closed-Columbus east curb
  trucks: { z: 902, xs: [220, 236, 252, 268, 284] },                // food-truck row on closed Monroe
  lsdRim: { x0: 324, x1: 331, z0: 902, z1: 1030 },
};

// ---------------- Backdrop growth (flag-gated) --------------------------
export const BACKDROP_GRANT = {
  // giants band extension EAST over Maggie's north rim (flag maggie);
  // E-W order preserved, register heights (~0.55x). Aqua stays out (real
  // z≈596 — under the z-680 billboard floor, recorded).
  giantsE: { z0: 680, z1: 692, list: [
    { name: '340 ON THE PARK', x: 274, w: 26, h: 105, style: 'glass-green' },
    { name: 'THE BUCKINGHAM',  x: 308, w: 18, h: 90,  style: 'tower' },
    { name: 'OUTER DRIVE EAST', x: 352, w: 40, h: 90, style: 'white-curve' },  // scalloped slab
    { name: 'HARBOR POINT',    x: 385, w: 24, h: 100, style: 'dark-round' },   // osm x 440, pulled in-frame
  ] },
  // east of LSD = THE LAKE (Monroe Harbor glint + moored sails; Peanut Park
  // compressed into it — recorded). flag maggie (z<894) / butler (z>894).
  eastLake: { x0: 348, x1: 362, z0: 700, z1: 1040 },
  // quiet South Loop band beyond Jackson (flag artInstitute/butler).
  // Buckingham Fountain measured (246-289 x 1157-1200) = FUTURE GROWTH, out.
  southLoop: { x0: 48, x1: 330, z0: 1050, z1: 1080, floors: [4, 10] },
};

// Full-growth clamp + minimap bounds (gridsweep sweeps CLAMP_FULL_M always).
export const CLAMP_FULL_M = { xMin: 44, xMax: 340, zMin: 700, zMax: 1040 };
export const MAP_FULL_M = { x0: 28, z0: 676, w: 336, h: 412, cw: 336, ch: 412 };

// ----------------------- walkability (THE definition) -----------------
// Ordered quads; FIRST hit wins for walkable + surfaceY. Elevated deck
// quads come first; everything else is y 0. Kinds:
//   rect: {x0,x1,z0,z1, y}          rampX: y lerps x0->x1 (the BP approach)
//   seg : rotated rect on a center-line a->b (halfW lateral), y lerps a->b
// Buildings standing ON walks (kiosk, Crown towers, Exelon cubes) are
// builder COLLIDERS, not walk holes — the Wrigleyville statue pattern.
const segQ = (a, b, halfW, y0, y1) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  return { seg: true, cx: (a[0] + b[0]) / 2, cz: (a[1] + b[1]) / 2,
           ux: dx / len, uz: dz / len, hl: len / 2, hw: halfW, y0, y1 };
};
const B = BP_BRIDGE_M;
// ---- deck BANDS (062/issue 023). The old per-node segQ union left
// outside-of-bend WEDGE slivers at every joint of the serpentine — the
// owner was "stopped every few meters". THE definition now: walkable =
// within halfW of the SAME CatmullRom the builders sweep (point-to-POLYLINE
// distance over a dense sample, circular caps at joints — no slivers).
// catmullChain replicates THREE.CatmullRomCurve3(pts, false, 'catmullrom',
// 0.5) exactly (uniform cubic Hermite, tangents 0.5*(p[i+1]-p[i-1]),
// mirrored phantom endpoints) — NO THREE import (walkprobe shares this).
// pinY: y stays the node-linear lerp (the Nichols Y-PIN law — nichols.js
// pins its deck y the same way); without it y rides the smoothed curve
// (the BP deck geometry does — bridge.js sweeps the full 3D curve).
function catmullChain(nodes, sub, pinY) {
  const n = nodes.length, T = 0.5, pts = [];
  const mirror = (a, b) => [2 * a[0] - b[0], 2 * a[1] - b[1], 2 * a[2] - b[2]];
  for (let i = 0; i < n - 1; i++) {
    const p1 = nodes[i], p2 = nodes[i + 1];
    const p0 = i === 0 ? mirror(nodes[0], nodes[1]) : nodes[i - 1];
    const p3 = i === n - 2 ? mirror(nodes[n - 1], nodes[n - 2]) : nodes[i + 2];
    for (let s = 0; s < sub; s++) {
      const t = s / sub, t2 = t * t, t3 = t2 * t, out = [0, 0, 0];
      for (let c = 0; c < 3; c++) {
        const m1 = T * (p2[c] - p0[c]), m2 = T * (p3[c] - p1[c]);
        out[c] = p1[c] + m1 * t + (-3 * p1[c] + 3 * p2[c] - 2 * m1 - m2) * t2
               + (2 * p1[c] - 2 * p2[c] + m1 + m2) * t3;
      }
      if (pinY) {
        const dx = p2[0] - p1[0], dz = p2[1] - p1[1], L2 = dx * dx + dz * dz || 1;
        const f = Math.max(0, Math.min(1, ((out[0] - p1[0]) * dx + (out[1] - p1[1]) * dz) / L2));
        out[2] = p1[2] + (p2[2] - p1[2]) * f;
      }
      pts.push(out);
    }
  }
  pts.push([nodes[n - 1][0], nodes[n - 1][1], nodes[n - 1][2]]);
  return pts;
}
// dense curve samples ([x,z,y]) — exported so walkprobe can assert the band
// is continuously walkable along the whole arc.
export const BP_DECK_PTS = catmullChain(BP_CROSSING_M.nodes, 6, false);
export const NICHOLS_DECK_PTS = catmullChain(NICHOLS2_M.nodes, 6, true);
// band walk-quad: bbox prefilter + min point-to-segment distance <= halfW
const bandQ = (pts, halfW) => {
  const segs = []; let bx0 = 1e9, bx1 = -1e9, bz0 = 1e9, bz1 = -1e9;
  for (const p of pts) { bx0 = Math.min(bx0, p[0]); bx1 = Math.max(bx1, p[0]); bz0 = Math.min(bz0, p[1]); bz1 = Math.max(bz1, p[1]); }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1];
    segs.push({ ax: a[0], az: a[1], dx, dz, L2: dx * dx + dz * dz || 1, y0: a[2], y1: b[2] });
  }
  return { band: true, segs, hw2: halfW * halfW,
           bx0: bx0 - halfW, bx1: bx1 + halfW, bz0: bz0 - halfW, bz1: bz1 + halfW };
};
// lane half-widths: 0.25 inside the BP parapet inner face (2.6) so the mayor
// never wedges into the shingles; Nichols posts sit at 1.5, lane 1.4.
export const BP_BAND_HW = 2.35, NICHOLS_BAND_HW = 1.4;
// Ribbon strip = stride-2 segQ over the verbatim closed loop (33 flat segs);
// shared by WALK (maggie), kindAtM (ribbonIce) and the 058/059 builders.
export const RIBBON_SEGS_M = (() => {
  const L = RIBBON_M.loop, out = [];
  for (let i = 0; i < L.length - 1; i += 2)
    out.push(segQ(L[i], L[Math.min(i + 2, L.length - 1)], RIBBON_M.halfW, 0, 0));
  return out;
})();

// ---- flag-gated Grant walk sets (see GEOGRAPHY.md GRANT walkability) ----
const MAGGIE_WALK = [
  // E-rim promenade (east of Columbus) — split under the BP crest overflight
  // (093 chain footprint z 798.2-805.3 at this x; ≥2.5 m planted buffer both sides)
  { x0: 201, x1: 209, z0: 706, z1: 795.5, y: 0 },
  { x0: 201, x1: 209, z0: 808, z1: 888, y: 0 },
  { x0: 201, x1: 338, z0: 705, z1: 711.5, y: 0 }, // Randolph-side north walk
  { x0: 209, x1: 323, z0: 728, z1: 736, y: 0 },   // fieldhouse esplanade
  { x0: 296, x1: 318, z0: 711.5, z1: 728, y: 0 }, // tennis pad (relocated — NE-wedge fold)
  ...RIBBON_SEGS_M,                               // the Skating Ribbon strip (paved bed; ice via kindAtM)
  // the climbing-wall island — 7 rects sealing both wall footprints (052 law;
  // walls repositioned 062/issue 022 so the ice clears the rock everywhere);
  // edges overlap the ribbon strip (both y 0) so no seam slivers read as holes
  { x0: 249, x1: 274.5, z0: 736.5, z1: 745, y: 0 },// island N plaza
  { x0: 246, x1: 254, z0: 745, z1: 751, y: 0 },    // W of the crescent
  { x0: 266, x1: 273.5, z0: 745, z1: 751, y: 0 },  // E of the crescent
  { x0: 243.5, x1: 271.5, z0: 751, z1: 758, y: 0 },// mid plaza (crescent->prow)
  { x0: 255.5, x1: 263, z0: 758, z1: 767, y: 0 },  // W of the prow
  { x0: 243.5, x1: 256.5, z0: 758, z1: 760.5, y: 0 },// SW corridor (chord-sagitta cover)
  { x0: 270, x1: 274.5, z0: 751, z1: 767, y: 0 },  // E of the prow (+SE pocket)
  { x0: 273.5, x1: 276, z0: 753, z1: 763, y: 0 },  // SE-lobe shim (chord-sagitta cover)
  { x0: 263, x1: 270, z0: 763, z1: 768, y: 0 },    // S of the prow
  { x0: 243, x1: 266, z0: 800, z1: 816, y: 0 },   // bridge-landing plaza (x0 243: the chain tail is <=0.45 there)
  { x0: 258, x1: 266, z0: 770, z1: 800, y: 0 },   // plaza -> ribbon connector
  { x0: 256, x1: 316, z0: 802, z1: 810, y: 0 },   // landing -> play-garden esplanade
  // the Play Garden — 10 rects sealing ship / fort tower / lighthouse
  { x0: 252, x1: 316, z0: 810, z1: 818, y: 0 },
  { x0: 252, x1: 286, z0: 818, z1: 826, y: 0 },
  { x0: 292, x1: 316, z0: 818, z1: 826, y: 0 },
  { x0: 252, x1: 316, z0: 826, z1: 839, y: 0 },
  { x0: 252, x1: 267, z0: 839, z1: 864, y: 0 },
  { x0: 277, x1: 299, z0: 839, z1: 864, y: 0 },
  { x0: 299, x1: 316, z0: 839, z1: 845, y: 0 },
  { x0: 309, x1: 316, z0: 845, z1: 855, y: 0 },
  { x0: 299, x1: 316, z0: 855, z1: 864, y: 0 },
  { x0: 267, x1: 277, z0: 849, z1: 864, y: 0 },
  // Cancer Survivors' Garden — 7 rects sealing the two pavilion frames
  { x0: 323, x1: 337, z0: 711.5, z1: 743, y: 0 },
  { x0: 323, x1: 326, z0: 743, z1: 749, y: 0 },
  { x0: 333, x1: 337, z0: 743, z1: 749, y: 0 },
  { x0: 323, x1: 337, z0: 749, z1: 769, y: 0 },
  { x0: 323, x1: 326, z0: 769, z1: 775, y: 0 },
  { x0: 333, x1: 337, z0: 769, z1: 775, y: 0 },
  { x0: 323, x1: 337, z0: 775, z1: 789, y: 0 },
  { x0: 201, x1: 338, z0: 878, z1: 888, y: 0 },   // Monroe-side south rim esplanade
  { x0: 330, x1: 338, z0: 789, z1: 878, y: 0 },   // LSD-overlook east walk
  { x0: 246, x1: 254, z0: 816, z1: 878, y: 0 },   // plaza -> south rim
  { x0: 280, x1: 288, z0: 864, z1: 878, y: 0 },   // play garden -> south rim
];
const AI_WALK = [
  { x0: 48, x1: 57, z0: 908, z1: 958, y: 0 },     // spine extension N of the forecourt
  { x0: 48, x1: 53.2, z0: 958, z1: 984, y: 0 },   // forecourt apron (urn beds seal the stair flanks)
  { x0: 48, x1: 57, z0: 984, z1: 1032, y: 0 },    // spine extension S (to Jackson band)
  { x0: 53, x1: 81, z0: 906, z1: 941, y: 0 },     // North Garden (sculptures = colliders)
  { x0: 55, x1: 95, z0: 999, z1: 1009, y: 0 },    // South Garden (fountain basin carved — 052 law)
  { x0: 55, x1: 81.9, z0: 1009, z1: 1015.5, y: 0 },
  { x0: 86.5, x1: 95, z0: 1009, z1: 1015.5, y: 0 },
  { x0: 55, x1: 95, z0: 1015.5, z1: 1032, y: 0 },
  { x0: 181, x1: 189, z0: 908, z1: 954, y: 0 },   // east rim walk (pool strip carved mid-run)
  { x0: 183.2, x1: 189, z0: 954, z1: 985, y: 0 },
  { x0: 181, x1: 189, z0: 985, z1: 1032, y: 0 },
];
const BUTLER_WALK = [
  { x0: 200, x1: 336, z0: 894, z1: 908, y: 0 },   // closed Monroe east (festival street)
  { x0: 190, x1: 202, z0: 894, z1: 1040, y: 0 },  // closed Columbus (festival street; x1 202 MEETS the lawn — the
  //   old x1 200 left a 2 m non-walk seam vs the lawn's x0 202 that pinned the player
  //   against the entry-arch leg colliders — issue 025, the field walks edge to edge)
  { x0: 202, x1: 324, z0: 902, z1: 968, y: 0 },   // Butler lawn N (booth carved below)
  { x0: 202, x1: 258, z0: 968, z1: 976, y: 0 },
  { x0: 266, x1: 324, z0: 968, z1: 976, y: 0 },
  { x0: 202, x1: 324, z0: 976, z1: 1002, y: 0 },
  { x0: 202, x1: 214, z0: 1002, z1: 1030, y: 0 }, // west of Petrillo
  { x0: 230, x1: 324, z0: 1002, z1: 1030, y: 0 }, // east of Petrillo
  { x0: 214, x1: 230, z0: 1017, z1: 1030, y: 0 }, // south of Petrillo (mass sealed 4-side)
  { x0: 324, x1: 331, z0: 902, z1: 1030, y: 0 },  // LSD rim walk
  { x0: 246, x1: 254, z0: 888, z1: 894, y: 0 },   // Maggie south-rim gate knits
  { x0: 280, x1: 288, z0: 888, z1: 894, y: 0 },
  { x0: 315, x1: 323, z0: 888, z1: 894, y: 0 },
];
const N2 = NICHOLS2_M, NSLOT = N2.slot;

export const WALK_M = [
  // --- elevated first (ramp-only access; flanks buffered non-walkable) ---
  ...(G.maggie
    ? [bandQ(BP_DECK_PTS, BP_BAND_HW)]                              // the REAL serpentine, end to end (062 band law)
    : [
        { ...B.approach, rampX: true },                             // lawn-edge ramp, y 0->3.8
        segQ(B.segs[0].a, B.segs[0].b, B.segs[0].halfW, 3.8, 5),    // rising seg
        segQ(B.segs[1].a, B.segs[1].b, B.segs[1].halfW, 5, 5),      // crest over Columbus
      ]),
  ...(G.artInstitute ? [
    { x0: ART_M.steps.x0, x1: ART_M.steps.x1, z0: ART_M.steps.z0, z1: ART_M.steps.z1,
      rampX: true, y0: 0, y1: 1.9 },                                // the grand steps (sittable)
    { x0: 57.2, x1: 59.6, z0: 963.5, z1: 978, y: 1.9 },             // portico landing (honest non-door)
  ] : []),
  ...(G.artInstitute && G.nichols ? [
    bandQ(NICHOLS_DECK_PTS, NICHOLS_BAND_HW),                       // Nichols Bridgeway deck (062 band law)
    { x0: ART_M.modernWing.bluhm.x0, x1: ART_M.modernWing.bluhm.x1,
      z0: ART_M.modernWing.bluhm.z0, z1: ART_M.modernWing.bluhm.z1, y: 13 },  // Bluhm terrace
  ] : []),
  // --- the y-0 park network (pre-057 order preserved exactly) ---
  { x0: 48, x1: 57,   z0: 705, z1: 894, y: 0 },   // Michigan sidewalk spine
  { x0: 48, x1: 189,  z0: 705, z1: 713, y: 0 },   // Randolph S sidewalk
  ...(G.artInstitute && G.nichols ? [              // Monroe N sidewalk (slot carved under the bridgeway + bypass)
    { x0: 48, x1: NSLOT.x0, z0: 886, z1: 894, y: 0 },
    { x0: NSLOT.x1, x1: 189, z0: 886, z1: 894, y: 0 },
    { x0: 108, x1: NSLOT.x0, z0: 878, z1: 886, y: 0 },
    { x0: NSLOT.x1, x1: 128, z0: 878, z1: 886, y: 0 },
  ] : [
    { x0: 48, x1: 189,  z0: 886, z1: 894, y: 0 }, // Monroe N sidewalk
  ]),
  ...(G.maggie ? [                                 // Columbus rims re-split for the real overflight
    { ...BP_CROSSING_M.rimN, y: 0 },
    { ...BP_CROSSING_M.rimS[0], y: 0 },
    { ...BP_CROSSING_M.rimS[1], y: 0 },
  ] : [
    { x0: 181, x1: 189, z0: 713, z1: 788, y: 0 }, // Columbus rim walk N (stops at the BP buffer)
    { x0: 181, x1: 189, z0: 818, z1: 886, y: 0 }, // Columbus rim walk S
  ]),
  { x0: WRIGLEY_SQ_M.plaza.x0, x1: WRIGLEY_SQ_M.plaza.x1,
    z0: WRIGLEY_SQ_M.plaza.z0, z1: WRIGLEY_SQ_M.plaza.z1, y: 0 },   // Wrigley Square
  ...(G.artInstitute && G.nichols ? [              // Chase allee (SE corner trimmed under the bridgeway;
    // x1 114.5 keeps a full non-walk cell between the allee and the rising deck)
    { x0: CHASE_M.walk.x0, x1: CHASE_M.walk.x1, z0: CHASE_M.walk.z0, z1: 843, y: 0 },
    { x0: CHASE_M.walk.x0, x1: 114.5, z0: 843, z1: CHASE_M.walk.z1, y: 0 },
  ] : [
    { x0: CHASE_M.walk.x0, x1: CHASE_M.walk.x1,
      z0: CHASE_M.walk.z0, z1: CHASE_M.walk.z1, y: 0 },             // Chase Promenade allee
  ]),
  { x0: 57, x1: 96,   z0: 758, z1: 770, y: 0 },   // Washington cross walk (axis 766)
  { x0: CLOUD_GATE_M.plaza.x0, x1: CLOUD_GATE_M.plaza.x1,
    z0: CLOUD_GATE_M.plaza.z0, z1: CLOUD_GATE_M.plaza.z1, y: 0 },   // Bean plaza (under the arch)
  { x0: 57, x1: 96,   z0: 826, z1: 838, y: 0 },   // Madison cross walk (axis 831)
  // --- the SUNKEN RINK group (049, all y -1.6; see RINK_M) — ramp first so
  // its lerped y wins over the flat landing/apron where they touch ---
  { x0: RINK_M.ramp.x0, x1: RINK_M.ramp.x1,
    z0: RINK_M.ramp.z0, z1: RINK_M.ramp.z1, rampX: true, y0: 0, y1: -1.6 }, // entry stair-ramp
  { x0: RINK_M.landing.x0, x1: RINK_M.landing.x1,
    z0: RINK_M.landing.z0, z1: RINK_M.landing.z1, y: -1.6 },  // landing + boards GATE threshold
  { x0: 58.6, x1: 60.2, z0: 771.6, z1: 797.5, y: -1.6 },      // apron W (north of the entry)
  { x0: 58.6, x1: 60.2, z0: 802.5, z1: 824.4, y: -1.6 },      // apron W (south of the entry)
  { x0: 75.3, x1: 76.9, z0: 771.6, z1: 824.4, y: -1.6 },      // apron E (under the Park Grill band)
  { x0: 60.2, x1: 75.3, z0: 771.6, z1: 774.7, y: -1.6 },      // apron N
  { x0: 60.2, x1: 75.3, z0: 822.8, z1: 824.4, y: -1.6 },      // apron S
  { x0: RINK_M.ice.x0, x1: RINK_M.ice.x1,
    z0: RINK_M.ice.z0, z1: RINK_M.ice.z1, y: -1.6 },          // THE ICE (kindAtM -> 'ice')
  { x0: CROWN_M.plaza.x0, x1: CROWN_M.plaza.x1,
    z0: CROWN_M.plaza.z0, z1: CROWN_M.plaza.z1, y: 0 },             // Crown wet plaza
  { x0: 118, x1: 186, z0: 758, z1: 788, y: 0 },   // seating bowl
  ...(G.artInstitute && G.nichols ? [              // Great Lawn W (west edge trimmed under the bridgeway)
    { x0: 122, x1: 168, z0: 788, z1: 846, y: 0 },
    { x0: 118, x1: 122, z0: 788, z1: 833, y: 0 },
    { x0: N2.pad.x0, x1: N2.pad.x1, z0: N2.pad.z0, z1: N2.pad.z1, y: 0 },  // Nichols launch pad
  ] : [
    { x0: 118, x1: 168, z0: 788, z1: 846, y: 0 }, // Great Lawn W (carved at the BP approach)
  ]),
  ...(G.maggie ? [
    { ...BP_CROSSING_M.launchPad, y: 0 },         // lawn-SE launch esplanade (deck flank buffer z 812-833 is planted)
  ] : [
    { x0: 168, x1: 186, z0: 812, z1: 846, y: 0 }, // Great Lawn SE
  ]),
  { x0: LURIE_M.gateNE.x0, x1: LURIE_M.gateNE.x1,
    z0: LURIE_M.gateNE.z0, z1: LURIE_M.gateNE.z1, y: 0 },           // Lurie NE hedge gate
  { x0: 179, x1: 182, z0: 843, z1: 853, y: 0 },   // gate↔Columbus-rim corner link (048 gridsweep: closes the 2 m seam at ~180,848)
  segQ(LURIE_M.seam.a, LURIE_M.seam.b, LURIE_M.seam.halfW, 0, 0),   // the Seam boardwalk
  { x0: LURIE_M.linkSW.x0, x1: LURIE_M.linkSW.x1,
    z0: LURIE_M.linkSW.z0, z1: LURIE_M.linkSW.z1, y: 0 },           // seam SW link
  { x0: LURIE_M.southRim.x0, x1: LURIE_M.southRim.x1,
    z0: LURIE_M.southRim.z0, z1: LURIE_M.southRim.z1, y: 0 },       // Lurie south rim
  // --- Grant zones (flag-gated; empty arrays pre-flip) ---
  ...(G.maggie ? MAGGIE_WALK : []),
  ...(G.artInstitute ? [
    ...(G.nichols ? [
      { x0: 48, x1: NSLOT.x0, z0: 894, z1: 908, y: 0 },             // closed-Monroe crossing (slot carved)
      { x0: NSLOT.x1, x1: 190, z0: 894, z1: 908, y: 0 },
    ] : [
      { x0: 48, x1: 190, z0: 894, z1: 908, y: 0 },                  // closed-Monroe crossing (LOLLA LOAD-IN)
    ]),
    ...AI_WALK,
  ] : []),
  ...(G.butler ? BUTLER_WALK : []),
];
function inQuadM(q, x, z) {
  if (q.band) {
    if (x < q.bx0 || x > q.bx1 || z < q.bz0 || z > q.bz1) return false;
    for (const s of q.segs) {
      let t = ((x - s.ax) * s.dx + (z - s.az) * s.dz) / s.L2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = x - (s.ax + s.dx * t), ez = z - (s.az + s.dz * t);
      if (ex * ex + ez * ez <= q.hw2) return true;
    }
    return false;
  }
  if (q.seg) {
    const dx = x - q.cx, dz = z - q.cz;
    return Math.abs(dx * q.ux + dz * q.uz) <= q.hl &&
           Math.abs(dz * q.ux - dx * q.uz) <= q.hw;
  }
  return x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1;
}
function quadYM(q, x, z) {
  if (q.band) {                       // y at the NEAREST point on the curve
    let best = 1e18, y = 0;
    for (const s of q.segs) {
      let t = ((x - s.ax) * s.dx + (z - s.az) * s.dz) / s.L2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = x - (s.ax + s.dx * t), ez = z - (s.az + s.dz * t);
      const d2 = ex * ex + ez * ez;
      if (d2 < best) { best = d2; y = s.y0 + (s.y1 - s.y0) * t; }
    }
    return y;
  }
  if (q.seg) {
    if (q.y1 === q.y0) return q.y0;
    const al = (x - q.cx) * q.ux + (z - q.cz) * q.uz;
    return q.y0 + (q.y1 - q.y0) * (al + q.hl) / (2 * q.hl);
  }
  if (q.rampX) return q.y0 + (q.y1 - q.y0) * (x - q.x0) / (q.x1 - q.x0);
  return q.y;
}
export function walkableM(x, z) {
  for (const q of WALK_M) if (inQuadM(q, x, z)) return true;
  return false;
}
export function surfaceYM(x, z) {
  for (const q of WALK_M) if (inQuadM(q, x, z)) return quadYM(q, x, z);
  return 0;
}

// --------------------------- cell plumbing ----------------------------
// Clamp is the hard box; the walk quads are the fine wall (Wrigleyville
// pattern). Pre-expansion: xMax 208 backs the BP crest dead-end. Growth is
// computed from OPEN_GRANT (east needs maggie/butler, south needs
// artInstitute/butler); z > 500 stays unique to this cell (dev-spawn
// disambiguation — GEOGRAPHY.md).
export const CLAMP_M = {
  xMin: 44,
  xMax: (G.maggie || G.butler) ? CLAMP_FULL_M.xMax : 208,
  zMin: 700,
  zMax: (G.artInstitute || G.butler) ? CLAMP_FULL_M.zMax : 900,
};
export const SPAWN_M = { x: 55, z: 800, y: 0 };          // beside the subway kiosk
export const MAP_M = (G.maggie || G.artInstitute || G.butler)
  ? MAP_FULL_M
  : { x0: 28, z0: 676, w: 184, h: 240, cw: 188, ch: 246 };

// -------------------------- city-map POI (086) ------------------------
// The full-city map card's landmark dots for this cell. Same shape as
// CITY_POI, NO zone field (Millennium is one visited flag). Coordinates
// derive from the constants above so each dot sits on its feature. The
// GRANT-expansion landmarks are flag-gated the way MAP_M gates its bounds:
// with 058-061 all shipped (G.maggie/artInstitute/butler true) every entry
// is unconditional; were a flag off, its landmarks would fall away (maggie →
// maggie + ribbon, artInstitute → art, butler → lolla).
export const CITY_POI_M = [
  { id: 'bean',     n: 'the bean',        x: 86.8,  z: 797.7, c: '#d8dde4' },   // CLOUD_GATE_M.bean cx/cz
  { id: 'rink',     n: 'the rink',        x: 67.75, z: 798.75, c: '#cfe3ee' },  // RINK_M.ice centre (093 sheet)
  { id: 'crown',    n: 'crown fountain',  x: 69.8,  z: 864,   c: '#e8b64c' },   // CROWN_M.pool centre
  { id: 'pritzker', n: 'the pavilion',    x: 146.5, z: 752,   c: '#d8d2c4' },   // PRITZKER_M.stage centre
  { id: 'lurie',    n: 'lurie garden',    x: 151.5, z: 867,   c: '#7a9e4f' },   // LURIE_M.bounds centre
  { id: 'ribbon',   n: 'the skating ribbon', x: 255.2, z: 751, c: '#cfe3ee' },  // RIBBON_M.loop vertex average (65 unique pts, last dup of first)
  { id: 'maggie',   n: 'maggie daley park', x: 284,  z: 835,  c: '#5da06a' },   // MAGGIE_M.play.zone centre
  { id: 'art',      n: 'the arf institute', x: 76.5, z: 970.5, c: '#b7b0a0' },  // ART_M.westBlock centre
  { id: 'lolla',    n: 'lalla',           x: 262,   z: 972,   c: '#b06ad0' },   // BUTLER_M.crowd centre
];
