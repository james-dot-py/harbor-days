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
// Wrigley Square + Millennium Monument (NW): paired-Doric peristyle on a
// raised plinth (collider), open side SE over its lawn; low curved inscribed
// wall at the walk corner. osm peristyle footprint 61-73 x 721-727.
export const WRIGLEY_SQ_M = {
  plaza: { x0: 57, x1: 96, z0: 713, z1: 752 },   // walk quad
  peristyle: { x0: 61, x1: 73, z0: 721, z1: 727, cx: 67, cz: 724, open: 'SE', colH: 9 },
  lawn: { x0: 58, x1: 90, z0: 730, z1: 750 },    // visual (inside the plaza quad)
  wall: { x: 78, z: 749, text: 'WRIGLEY SQUARE' },
  grate: { x: 72, z: 709 },                      // Millennium Station rumble flavor (delight seed)
};

// McCormick Tribune Plaza — THE SUMMER CAFE (perpetual summer: no ice rink,
// ever). SUNKEN one level below the Bean plaza and VIEW-ONLY (decorative,
// NOT walkable — Murphy's beer-garden register): umbrella grid + cream
// bar-tent, read from the white balustrade overlook at railX.
export const MCCORMICK_M = { x0: 57, x1: 76, z0: 772, z1: 826, y: -1.6, railX: 76 };

// Cloud Gate on AT&T Plaza — toon HOMAGE (painted reflection, never
// computed; copyright register). Long axis N-S; the plaza walks CONTINUOUS
// UNDER the arch — colliders are the two leg pads at the z ends only.
export const CLOUD_GATE_M = {
  plaza: { x0: 76, x1: 98, z0: 776, z1: 826 },   // walk quad
  bean: { x0: 83.1, x1: 90.5, z0: 792.8, z1: 802.6, cx: 86.8, cz: 797.7, h: 10, axis: 'ns' },
  legs: [{ x: 86.8, z: 794.2, r: 1.6 }, { x: 86.8, z: 801.2, r: 1.6 }],
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
  trellis: { x0: 120, x1: 166, z0: 792, z1: 844, colH: 9, apexH: 14 },
};

// Lurie Garden — shoulder hedges (4.5 m clipped walls inside dark-steel
// armature cages, frame lips proud) on the N and W; the Seam boardwalk is
// the ONLY interior walk; the plates are planting.
export const LURIE_M = {
  bounds: { x0: 124, x1: 179, z0: 842, z1: 892 },
  hedgeN: { x0: 128, x1: 170, z0: 846, z1: 851, h: 4.5 },
  hedgeW: { x0: 124, x1: 129, z0: 846, z1: 876, h: 4.5 },
  gateNE: { x0: 170, x1: 179, z0: 843, z1: 852 },        // walk quad (hedge break)
  seam: { a: [175, 849.5], b: [144, 874], halfW: 2.5 },  // boardwalk walk quad (rill beneath)
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
    { name: 'ONE PRU',    x: 79,  w: 42, h: 130, style: 'sign-slab' },      // white PRUDENTIAL sign
    { name: 'TWO PRU',    x: 102, w: 22, h: 165, style: 'diamond-spire' },
    { name: 'AON',        x: 172, w: 30, h: 200, style: 'white-fins' },
    { name: 'BLUE CROSS', x: 206, w: 26, h: 95,  style: 'glass' },          // osm x 245, pulled in-frame
  ] },
  east:  { x0: 214, x1: 238, z0: 700, z1: 908, floors: [6, 14] },           // lower Loop across Columbus
  south: { x0: 48, x1: 200, z0: 914, z1: 938,
           artInstitute: { x: 123, w: 46, h: 22 },                          // + lions, 048
           archX: 175 },                                                    // Stock Exchange Arch cameo
};

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
export const WALK_M = [
  // --- elevated (the BP deck; flanks buffered non-walkable, ramp-only) ---
  { ...B.approach, rampX: true },                                   // lawn-edge ramp, y 0->3.8
  segQ(B.segs[0].a, B.segs[0].b, B.segs[0].halfW, 3.8, 5),          // rising seg
  segQ(B.segs[1].a, B.segs[1].b, B.segs[1].halfW, 5, 5),            // crest over Columbus
  // --- the y-0 park network ---
  { x0: 48, x1: 57,   z0: 705, z1: 894, y: 0 },   // Michigan sidewalk spine
  { x0: 48, x1: 189,  z0: 705, z1: 713, y: 0 },   // Randolph S sidewalk
  { x0: 48, x1: 189,  z0: 886, z1: 894, y: 0 },   // Monroe N sidewalk
  { x0: 181, x1: 189, z0: 713, z1: 788, y: 0 },   // Columbus rim walk N (stops at the BP buffer)
  { x0: 181, x1: 189, z0: 818, z1: 886, y: 0 },   // Columbus rim walk S
  { x0: WRIGLEY_SQ_M.plaza.x0, x1: WRIGLEY_SQ_M.plaza.x1,
    z0: WRIGLEY_SQ_M.plaza.z0, z1: WRIGLEY_SQ_M.plaza.z1, y: 0 },   // Wrigley Square
  { x0: CHASE_M.walk.x0, x1: CHASE_M.walk.x1,
    z0: CHASE_M.walk.z0, z1: CHASE_M.walk.z1, y: 0 },               // Chase Promenade allee
  { x0: 57, x1: 96,   z0: 758, z1: 770, y: 0 },   // Washington cross walk (axis 766)
  { x0: CLOUD_GATE_M.plaza.x0, x1: CLOUD_GATE_M.plaza.x1,
    z0: CLOUD_GATE_M.plaza.z0, z1: CLOUD_GATE_M.plaza.z1, y: 0 },   // Bean plaza (under the arch)
  { x0: 57, x1: 96,   z0: 826, z1: 838, y: 0 },   // Madison cross walk (axis 831)
  { x0: CROWN_M.plaza.x0, x1: CROWN_M.plaza.x1,
    z0: CROWN_M.plaza.z0, z1: CROWN_M.plaza.z1, y: 0 },             // Crown wet plaza
  { x0: 118, x1: 186, z0: 758, z1: 788, y: 0 },   // seating bowl
  { x0: 118, x1: 168, z0: 788, z1: 846, y: 0 },   // Great Lawn W (carved at the BP approach)
  { x0: 168, x1: 186, z0: 812, z1: 846, y: 0 },   // Great Lawn SE
  { x0: LURIE_M.gateNE.x0, x1: LURIE_M.gateNE.x1,
    z0: LURIE_M.gateNE.z0, z1: LURIE_M.gateNE.z1, y: 0 },           // Lurie NE hedge gate
  segQ(LURIE_M.seam.a, LURIE_M.seam.b, LURIE_M.seam.halfW, 0, 0),   // the Seam boardwalk
  { x0: LURIE_M.linkSW.x0, x1: LURIE_M.linkSW.x1,
    z0: LURIE_M.linkSW.z0, z1: LURIE_M.linkSW.z1, y: 0 },           // seam SW link
  { x0: LURIE_M.southRim.x0, x1: LURIE_M.southRim.x1,
    z0: LURIE_M.southRim.z0, z1: LURIE_M.southRim.z1, y: 0 },       // Lurie south rim
];
function inQuadM(q, x, z) {
  if (q.seg) {
    const dx = x - q.cx, dz = z - q.cz;
    return Math.abs(dx * q.ux + dz * q.uz) <= q.hl &&
           Math.abs(dz * q.ux - dx * q.uz) <= q.hw;
  }
  return x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1;
}
function quadYM(q, x, z) {
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
// pattern). xMax 208 backs the BP crest dead-end; z > 500 is unique to this
// cell (dev-spawn disambiguation — GEOGRAPHY.md).
export const CLAMP_M = { xMin: 44, xMax: 208, zMin: 700, zMax: 900 };
export const SPAWN_M = { x: 55, z: 800, y: 0 };          // beside the subway kiosk
export const MAP_M   = { x0: 28, z0: 676, w: 184, h: 240, cw: 188, ch: 246 };
