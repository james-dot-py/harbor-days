// =====================================================================
// WRIGLEYVILLE — the second cell (see GEOGRAPHY.md · WRIGLEY_GEOGRAPHY)
// Pure data + pure walk functions. NO THREE imports — tools/walkprobe.mjs
// imports this file directly, so the engine and the probe share ONE
// walkability definition (no mirror drift).
//
// Chicago grid, Addison at TRUE latitude z −400. **STANDING LIBERTY
// (owner layout rework 2026-07-09, task 009): Waveland sits at z −560
// (true −500) — the cell-local z frame is stretched ×1.6 between Addison
// and Waveland** so double-wide game-day streets, a big-league bowl and
// set-back gate plazas all fit. E–W: 1 W-address unit = 1 game unit,
// anchored so the Red Line embankment (~950 W) is x −140:
//   x = −140 − (Waddr − 950)
// Clark St diagonal: cx(z) = −290 + 0.28·(z + 400)   (x −290 at Addison,
// x −334.8 at Waveland — ~16° west-of-north, the real cant).
// =====================================================================

export const CELL_ID = 'wrigleyville';
export const SEED_W = 19140423;                 // opening day at Clark & Addison

// Clark St centerline (diagonal)
export const clarkX = z => -290 + 0.28 * (z + 400);

// ---------------------------- streets ---------------------------------
// Corridors are road + both sidewalks (walkable curb to curb — game day,
// the streets belong to the crowd). Everything outside them is barricaded.
// DOUBLE-WIDE (owner directive 2026-07-09): every corridor ~2× its old
// road+sidewalk width. Sidewalks 6 m (Kenmore 2 m).
export const STREETS_W = {
  addison : { z: -400, road: 16, z0: -414, z1: -386, x0: -332, x1: -124 },
  waveland: { z: -560, road: 12, z0: -572, z1: -548, x0: -352, x1: -178 },
  sheffield:{ x: -190, road: 12, x0: -202, x1: -178, z0: -572, z1: -386 },
  kenmore : { x: -231, road: 8,  x0: -237, x1: -225, z0: -604, z1: -548 },
  clark   : { halfW: 14, z0: -572, z1: -386 },  // parallelogram on clarkX(z)
};

// Gallagher Way plaza: the triangular WEDGE east of Clark (owner directive
// 2026-07-09, task 019; real outline: osm.json park 1265774541). West edge =
// the Clark sidewalk line (off0); east edge = the west-stands BOWL WALL, a
// near-N–S polyline bulging gently west (wall[], north→south) — so the plaza
// is WIDE at the north (26 m at the office) and narrows south to 10 m at the
// ticket-office/box-office mass that closes the south end at z1. It does NOT
// reach Waveland — the Gallagher office block (1101 W Waveland) closes the
// north. board = the freestanding video board anchor (village.js + the
// gen-waypoints camera-clearance volume both derive from it).
export const GALLAGHER_W = {
  z0: -520, z1: -446, off0: 14,
  wall: [[-283.6, -520], [-283.0, -500], [-282.4, -478], [-280.6, -458], [-278.9, -446]],
  board: { z: -516, off: 35 },                       // x: cx+off
};
// x(z) of the bowl wall (piecewise-linear through GALLAGHER_W.wall) — THE
// plaza east bound, shared by walkability, builders, minimap and waypoints.
export function gallagherWallX(z) {
  const w = GALLAGHER_W.wall;
  if (z <= w[0][1]) return w[0][0];
  for (let i = 1; i < w.length; i++) if (z <= w[i][1]) {
    const [xa, za] = w[i - 1], [xb, zb] = w[i];
    return xa + (xb - xa) * (z - za) / (zb - za);
  }
  return w[w.length - 1][0];
}
// Gallagher office block: fills the notch from the plaza's north edge to the
// Waveland sidewalk, Clark corridor to the west-stands lot line (off 40) —
// its east face is COPLANAR with the stadium's plazaN wall, one lot.
export const OFFICE_W = { z0: -546, z1: -520, off0: 14, off1: 40 };    // x: cx+off

// ------------------------- station (Addison, Red Line) ----------------
// Solid earth embankment, island platform on top, stair enclosed in the
// north mass with a doorway on Addison. Bridge carries the tracks over
// Addison (street stays walkable beneath — the bridge now spans the full
// 28 m corridor).
export const STATION_W = {
  embank : { x0: -148, x1: -132, z0: -587, z1: -310, topY: 7.0 },
  bridge : { z0: -414, z1: -386, clearY: 5.6 },      // over Addison
  platform:{ x0: -143, x1: -137, z0: -451, z1: -433, y: 7.6 },
  stair  : { x0: -142, x1: -138, z0: -433, z1: -417, yTop: 7.6, yBot: 0.35 },
  landing: { x0: -142, x1: -138, z0: -417, z1: -411 },
  tracks : { west: -145.5, east: -134.5, y: 7.6 },   // rail centerlines
  signZ  : -442,
};

// --------------------------- the stadium ------------------------------
// Footprint polygon (CW from the rounded Marquee corner). West face follows
// Clark; the Gallagher notch is the plaza. HP/CF define the field axis
// (opens NE: LF wall on Waveland, RF wall on Sheffield, scoreboard NE).
// Grown for the 009 rework: faces on Addison z −414 / Sheffield x −202 /
// Waveland z −548; HP→CF 88.8 m (was 70.8) so the bowl reads big-league.
//
// THE MARQUEE CORNER IS ROUND (the real art-deco curve): a fillet r 18
// about (−266.266, −432). Tangents: Clark wall at (−283.60, −427.15),
// Addison wall at (−266.27, −414); apex (−277.09, −417.62) carries the
// marquee. a0 = π − asin(4.854/18) toward the Clark tangent.
export const CORNER_ARC = { cx: -266.266, cz: -432.0, r: 18, a0: 2.86836, a1: 1.5708, n: 8 };
const arcPts = [];
for (let i = 0; i <= CORNER_ARC.n; i++) {
  const a = CORNER_ARC.a0 + (CORNER_ARC.a1 - CORNER_ARC.a0) * i / CORNER_ARC.n;
  arcPts.push([CORNER_ARC.cx + CORNER_ARC.r * Math.cos(a), CORNER_ARC.cz + CORNER_ARC.r * Math.sin(a)]);
}
// marquee-corner apex (mid-arc) + its outward direction — the marquee and
// its gate hang here, facing the Clark & Addison intersection
const _apexA = (CORNER_ARC.a0 + CORNER_ARC.a1) / 2;
const _apex = [CORNER_ARC.cx + CORNER_ARC.r * Math.cos(_apexA), CORNER_ARC.cz + CORNER_ARC.r * Math.sin(_apexA)];
const _apexYaw = Math.atan2(Math.cos(_apexA), Math.sin(_apexA));
export const STADIUM_W = {
  poly: [
    ...arcPts,                 // SW — the rounded Marquee corner (Clark & Addison)
    [-238,   -414],            // Addison face ends here (osm.json rel 17379974: diagonal starts x −238.6)
    [-229,   -418],            // SE CORNER — the ANGLED BOWL (task 020): a 4-chord
    [-220,   -423.6],          //   convex diagonal per the real footprint (the
    [-211,   -431],            //   grandstand wraps the corner; sagitta ~3.4 toward
    [-202,   -440],            //   the intersection), opening the walkable corner court
    [-202,   -528],            // chamfer start (Sheffield face, z −440…−528)
    [-222,   -548],            // chamfer end (Waveland face) — Bleacher Gate corner
    [-291.44,-548],            // NW (Waveland at the office lot line)
    [-283.6, -520],            // plazaN: behind the office (coplanar with its east face)
    [-283.0, -500],            // the wedge's BOWL WALL (GALLAGHER_W.wall, N→S):
    [-282.4, -478],            //   near-N–S, bulging gently west — the bowl
    [-280.6, -458],            //   curving over the plaza (task 019)
    [-278.9, -446],            // wedge south tip (plaza narrows to 10 m here)
    [-288.88,-446],            // box-office north face → out to Clark east edge
  ],
  // per-edge kind, same order/length as poly edges (edge i = poly[i]→poly[i+1])
  // notchS + clark = the TICKET-OFFICE/BOX-OFFICE mass closing the wedge's
  // south end (full-height brick, distinct dressing — stadium.js).
  edgeKinds: [
    ...Array(CORNER_ARC.n).fill('arc'),            // arc chords P1→P2
    'addison', 'secorner', 'secorner', 'secorner', 'secorner',
    'sheffield', 'gate', 'waveland', 'plazaN',
    'plazaE', 'plazaE', 'plazaE', 'plazaE', 'notchS', 'clark',
  ],
  // marquee proud of the apex along the outward radial (the old 1.4 m stand-off)
  marquee : { x: _apex[0] + 1.4 * Math.cos(_apexA), z: _apex[1] + 1.4 * Math.sin(_apexA), ry: _apexYaw },
  homePlate: [-252, -444],
  centerField: [-218, -526],
  scoreboard: { x: -216, z: -533, topY: 26.5 },    // top 87 ft; base 18.3 (60 ft) — rides above the Bleacher Gate like the ref
  gates: {
    marquee  : { x: _apex[0], z: _apex[1], yaw: _apexYaw },        // ON the curve apex
    gallagher: { x: gallagherWallX(-490), z: -490 },               // on the wedge's bowl wall
    addison  : { x: -252, z: -414, yaw: 0 },                       // south face, mid-block (moved west when 020 shortened the face to x −238)
    gateD    : { x: -217.5, z: -425.5, yaw: 0.66 },                // SE-corner diagonal (task 020) — the real right-field gate, faces the Sheffield & Addison intersection
    bleacher : { x: -212, z: -538, yaw: Math.atan2(0.7071, -0.7071) }, // chamfer mid, faces the Sheffield/Waveland corner
  },
  // knothole: screened opening in the WAVELAND (left-field) wall by the
  // ball-hawk corner (Kenmore axis) — OWNER DIRECTIVE 2026-07-09. The real
  // knothole is on Sheffield (right field); recorded as a standing liberty
  // in GEOGRAPHY.md. Opening spans x0..x1 on the z-face.
  knothole: { z: -548, x0: -234, x1: -228 },
  // true 1:1 verticals (scoreboard base 60 ft / top 87 ft published)
  wallH: 4.2, facadeH: 16.5, rimH: 23, towerH: 29,
};

// ---------------- gate aprons (RED BRICK, task 009) -------------------
// The stadium face pulls back from the sidewalk at the gates; the ground
// it opens paves in red brick (walkable, y 0 — same grade as the street).
//   marquee : the fillet crescent (triangle minus the CORNER_ARC circle)
//   bleacher: the CARAY PLAZA — the chamfer triangle at Sheffield&Waveland,
//             statue centered, off the sidewalk through-lines, gate behind
//   gallagher: a brick pad on the plaza in front of the Gallagher gate —
//             an axis-aligned rect tucked under the near-vertical wedge
//             wall (visual only — the plaza wedge quad already walks it)
export const APRONS_W = {
  marquee : { tri: [[-283.60, -427.15], [-279.92, -414], [-266.27, -414]], z0: -427.15, z1: -414 },
  bleacher: { tri: [[-202, -528], [-202, -548], [-222, -548]], z0: -548, z1: -528 },
  gallagher: { x0: -289.9, x1: -282.4, z0: -496, z1: -484 },
  // SE CORNER COURT (task 020): the polygon the angled bowl corner opens at
  // Sheffield & Addison — first point is the street corner, the rest walk the
  // diagonal wall (STADIUM_W.poly secorner chords, Addison end → Sheffield end).
  secorner: { poly: [[-202, -414], [-238, -414], [-229, -418], [-220, -423.6], [-211, -431], [-202, -440]], z0: -440, z1: -414 },
};

// -------------------- rooftops & buildings (lots) ---------------------
// Lots sit OUTSIDE the walk corridors and front onto them.
export const ROOFTOPS_W = {
  waveland: [                                       // north side, front z −574
    { x0: -226, x1: -217, z0: -588, z1: -574 },
    { x0: -217, x1: -208, z0: -588, z1: -574, access: true },  // THE rooftop
    { x0: -208, x1: -199, z0: -588, z1: -574 },
    { x0: -178, x1: -163, z0: -588, z1: -574 },     // task 020: NE Sheffield & Waveland corner house (closes the bare corner; APPEND-ONLY — earlier indexes are load-bearing)
  ],
  sheffield: [                                      // east side, front x −178
    { x0: -178, x1: -164, z0: -534, z1: -518 },
    { x0: -178, x1: -164, z0: -518, z1: -502 },
    { x0: -178, x1: -164, z0: -502, z1: -486 },
  ],
  roofY: 9.6,
  stair: { x0: -208, x1: -205, z0: -586, z1: -574, yTop: 9.6, yBot: 0.9 },
  stairLanding: { x0: -208, x1: -205, z0: -574, z1: -571 },
};

// -------------------- Sluggers rooftop batting cage -------------------
// clarkBars[0] ('SLUGGERS') is a LOW 2-storey bar whose ROOF is a real
// destination: an exterior stair up the street (east) face climbs to a
// rooftop deck holding the fast-pitch cage (bat toward the park). Geometry
// AND walkability share this one anchor set — buildBars builds clarkBars[0]
// as a Group at origin (cx,0,cz), rotation th; every quad below is a ROTATED
// rect in that local frame, so the walk grid and the meshes never drift.
//   local frame: +x = toward the street (east), +z = north along Clark.
//   the building body is local x −6..6, z −8..8; roofY = its height (Hs[0]).
//   (bar lots moved to clarkX−22…−10 for the widened Clark corridor.)
export const SLUGGERS_W = {
  cx: clarkX(-480) - 22, cz: -480, th: Math.atan(0.28), roofY: 6.8,
  deck   : { lx: 0,   lz: 0,    hx: 5,   hz: 7 },     // rooftop deck (y roofY)
  bridge : { lx: 6.4, lz: 6.5,  hx: 2.0, hz: 1.0 },   // stair-top landing → deck (y roofY)
  stair  : { lx: 7.2, lz: 0,    hx: 1.2, hz: 7 },     // exterior ramp: lz −7 (y0) → +7 (y roofY)
  landBot: { lx: 7.5, lz: -7.5, hx: 1.6, hz: 1.1 },   // Clark sidewalk → stair base (y0)
};

export const VILLAGE_W = {
  murphys : { x0: -178, x1: -162, z0: -548, z1: -534 },  // SE cnr Sheffield/Waveland (lot)
  // Murphy's likeness sub-lots (task 010, refs/murphys-bleachers/): the 2-storey
  // blonde main mass, the 1-storey red-brick corner annex carrying the verdigris
  // sign band, and the fenced sidewalk beer garden (decorative — NOT walkable,
  // colliders only; pokes 0.6 m into the Sheffield corridor like a real patio).
  murphysBld  : { x0: -172, x1: -162, z0: -548, z1: -534, h: 8.6 },
  murphysAnnex: { x0: -178, x1: -168, z0: -548, z1: -539, h: 4.8 },
  murphysGarden:{ x0: -178.6, x1: -174, z0: -539, z1: -534 },
  engine78: { x0: -250, x1: -234, z0: -590, z1: -574 },  // 1052 W Waveland
  cubbyBear:{ x0: -316, x1: -300, z0: -386, z1: -372 },  // opposite the marquee
  // task 020 corner lots (Sheffield & Addison — see GEOGRAPHY.md):
  //   sportsWorld: SW corner souvenir store (Sports World-style likeness,
  //   chamfered NE corner door facing the intersection, canvas signage).
  //   stationCorner: NE corner blonde-brick block with the CTA wayfinding
  //   blade pointing east to the Addison head-house.
  sportsWorld  : { x0: -220, x1: -204, z0: -384, z1: -371, h: 7.6 },
  stationCorner: { x0: -176, x1: -162, z0: -430, z1: -415, h: 10.4 },
  clarkBars: [                                     // west side of Clark, neon row
    { z0: -488, z1: -472, name: 'SLUGGERS'  },
    { z0: -470, z1: -454, name: 'SPORTS CORNER' },
    { z0: -452, z1: -436, name: "CASEY'S"   },
    { z0: -434, z1: -418, name: 'THE DUGOUT' },
  ],                                               // lots at cx(z)−22 … cx(z)−10
  standStalls: [                                   // souvenir/cap stands
    { x: -160, z: -389,   ry: 0 },                 // Addison S sidewalk, by the station
    { x: -245, z: -410.5, ry: Math.PI },           // Addison N sidewalk, mid-block (moved west with the 020 corner cut so the facade still rises behind it)
    { x: -199, z: -530,   ry: -Math.PI / 2 },      // Sheffield W sidewalk, S of the Caray plaza
  ],
  statueRow: { z: -516.5, xs: [-293, -297, -301, -305] }, // plaza north edge, fronting the office block (Banks first)
  carayStatue: { x: -206.5, z: -543.5, ry: 2.36 }, // centered on the Caray plaza apron, facing the intersection, gate behind
};

// ------------------- streetscape facades (task 016) -------------------
// Per-lot FACADE RECIPES for the fabric buildings that line the corridors
// between the hero landmarks (bars/stadium/Engine 78/rooftops own their own
// frontage). dressing.js lays a row of lots along each FRONTAGE span, pulling
// recipes so no two ADJACENT lots share a composition (owner issue 004: no
// uniform facades). Colours reuse Wrigleyville's cached toon() palette so the
// static merge pool adds ~no draw calls; two warm hues (·greystone·/·warm·)
// are the only new materials. Every lot sits just OUTSIDE its walk corridor
// (unreachable — no colliders needed; the walkable clamp is the wall).
export const clarkYaw = Math.atan(0.28);
export const FACADES_W = {
  // frontages: where a lot row runs. o:'ew' lots step along x at z=face;
  // o:'ns' lots step along z at x=face; o:'clark' lots step along z at
  // x=clarkX(z)+off. yaw = direction the storefront FACES (toward the road).
  // spans = [[a,b],…] extents to fill (gaps skip the hero landmarks).
  frontages: [
    // addison-s: split around the Sports World lot (x −220…−204) + the closed
    // Sheffield mouth (x −202…−178) — task 020 corner truth. Task 033: the row
    // START moved −298 → −268 — the three western lots stood in the Clark
    // right-of-way (clarkX±14 reaches x −299.6…−269.3 over the lot depth);
    // they are REHOMED to the clark-se/clark-sw stub frontages below.
    { id: 'addison-s',  o: 'ew',    face: -384, yaw: Math.PI,               spans: [[-268, -224], [-176, -158]] },
    { id: 'waveland-n', o: 'ew',    face: -574, yaw: 0,                      spans: [[-348, -254], [-198, -180]] },
    // sheffield-e: STOPS at z −432 (task 020) — the 016 span ran to −388,
    // standing lots INSIDE the Addison corridor (z −414…−386) and walling off
    // the view east to the station; the stationCorner lot owns the corner
    { id: 'sheffield-e',o: 'ns',    face: -176, yaw: -Math.PI / 2,          spans: [[-534, -432]] },
    { id: 'clark-wn',   o: 'clark', off: -16,   yaw: Math.PI / 2 + clarkYaw, spans: [[-570, -492]] },
    { id: 'clark-ws',   o: 'clark', off: -16,   yaw: Math.PI / 2 + clarkYaw, spans: [[-416, -392]] },
    // task-033 REHOME: the stub frontages — storefronts LINING the reserved
    // Clark alignment south of the CPD line (scenery; unreachable, no colliders).
    // clark-se starts z −374 (south of the addison-s lot backs, z −376) so the
    // Addison corner lot owns the corner; clark-sw starts z −370, clear of the
    // Cubby Bear lot (z ≥ −372).
    { id: 'clark-se',   o: 'clark', off: 16,    yaw: -Math.PI / 2 + clarkYaw, spans: [[-374, -346]] },
    { id: 'clark-sw',   o: 'clark', off: -16,   yaw: Math.PI / 2 + clarkYaw,  spans: [[-370, -344]] },
  ],
  // recipe palette. color = cached toon hex; floors → height; door position;
  // awning [stripeA,stripeB]|null; upper window style; cornice style; fesc =
  // fire escape; stoop; sign {t,c} = a small storefront name band (atlas).
  // awnings use only TWO colorways (navy/cream ANV, red/cream ARC) so the kit's
  // striped-awning texture stays two buckets, not eight.
  recipes: [
    { id: 'greystone', w: 13, color: 0x9a8f80, floors: 3, door: 'center', awning: null,               upper: 'sash',   cornice: 'dentil', fesc: false, stoop: true,  sign: null },
    { id: 'redbrick',  w: 11, color: 0x94402f, floors: 2, door: 'left',   awning: [0xb03a2e, 0xf2eee4], upper: 'paired', cornice: 'flat',   fesc: true,  stoop: false, sign: { t: 'TAP ROOM', c: 0xff5a3c } },
    { id: 'blonde',    w: 14, color: 0xc2a370, floors: 3, door: 'right',  awning: [0x24407a, 0xf2eee4], upper: 'sash',   cornice: 'step',   fesc: false, stoop: false, sign: { t: 'CORNER MARKET', c: 0xffb43a } },
    { id: 'cream',     w: 12, color: 0xe6ddc8, floors: 3, door: 'center', awning: null,               upper: 'arch',   cornice: 'dentil', fesc: false, stoop: true,  sign: null },
    { id: 'brownwalk', w: 12, color: 0x63594e, floors: 3, door: 'left',   awning: null,               upper: 'bay',    cornice: 'flat',   fesc: true,  stoop: true,  sign: null },
    { id: 'buffdeli',  w: 11, color: 0xcbb488, floors: 2, door: 'center', awning: [0x24407a, 0xf2eee4], upper: 'paired', cornice: 'step',   fesc: false, stoop: false, sign: { t: 'DELI', c: 0x4ad06a } },
    { id: 'whitegrill',w: 13, color: 0xd8cdb4, floors: 3, door: 'right',  awning: [0x24407a, 0xf2eee4], upper: 'sash',   cornice: 'dentil', fesc: false, stoop: false, sign: { t: 'GRILL', c: 0xff5545 } },
    { id: 'warmpizza', w: 11, color: 0xa8654a, floors: 2, door: 'center', awning: [0xb03a2e, 0xf2eee4], upper: 'paired', cornice: 'flat',   fesc: true,  stoop: false, sign: { t: 'PIZZA', c: 0xff8a3c } },
  ],
};

// ------------------------- CPD barricades -----------------------------
// Blue wooden A-frames, 'POLICE LINE — CHICAGO POLICE'. Each line is a
// street mouth: [x0,z0]→[x1,z1]. streets.js instances them; the walk
// quads simply END here, so the wall is diegetic, not invisible.
export const BARRICADES_W = [
  { a: [-124, -414], b: [-124, -386] },            // Addison E (past the station)
  { a: [-332, -414], b: [-332, -386] },            // Addison W (past Clark)
  { a: [-352, -572], b: [-352, -548] },            // Waveland W
  { a: [-178, -572], b: [-178, -548] },            // Waveland E (past Sheffield)
  { a: [-202, -385.5], b: [-178, -385.5] },        // Sheffield S of Addison
  { a: [-202, -572.5], b: [-178, -572.5] },        // Sheffield N of Waveland
  { a: [-300, -385.5], b: [-272.5, -385.5] },      // Clark S of Addison
  { a: [-352.5, -572.5], b: [-324, -572.5] },      // Clark N of Waveland
  { a: [-237, -604.5], b: [-225, -604.5] },        // Kenmore dead end
];

// --------------------- backdrop (beyond the lines) --------------------
// Low-rise Lakeview band: flat instanced volumes past every barricade so
// closed streets read as "the city keeps going", not a void.
// (facing dirs live in streets.js bandDir, same order.)
export const BACKDROP_W = {
  bands: [
    // west of Clark bars — x1 pulled −353 → −358 (task 033): the east edge
    // clipped the reserved Clark alignment (clarkX−14 ≤ −353 for z ≤ −575)
    { x0: -384, x1: -358, z0: -590, z1: -360 },
    { x0: -324, x1: -240, z0: -632, z1: -594 },    // north of the rooftops
    { x0: -178, x1: -152, z0: -650, z1: -582 },    // NE, toward the tracks
    { x0: -178, x1: -156, z0: -382, z1: -340 },    // SE block (S of Addison)
    // S of Addison, SPLIT around the reserved Clark alignment (task 033) —
    // the old single band (x −326…−212) stood across the right-of-way.
    // West half sits behind the clark-sw stub lots (their masses reach
    // x −306); east half behind clark-se (masses reach x −253).
    { x0: -326, x1: -307, z0: -370, z1: -336 },    // S of Addison, W of the Clark stub (behind Cubby)
    { x0: -248, x1: -212, z0: -370, z1: -336 },    // S of Addison, E of the Clark stub
    { x0: -122, x1: -110, z0: -560, z1: -350 },    // sliver east of the tracks
    { x0: -178, x1: -152, z0: -480, z1: -434 },    // E of Sheffield mid-block (streetwall; z1 pulled to −434 so it clears the 020 stationCorner lot)
    { x0: -202, x1: -178, z0: -378, z1: -340 },    // Sheffield S mouth (task 020) — the closed street continues into city, not bare ground
  ],
  floors: [2, 4],                                  // storeys range
};

// ------------------ Clark stub (task 033 — SCENERY) -------------------
// The reserved Clark right-of-way south of the z −385.5 CPD line: visible
// street (asphalt/curbs/centerline/sidewalk slabs/lamps) continuing to z1
// so the closure reads as event-day Chicago, not a dead end. NOT walkable —
// no WALK_W quad; the barricade stays the soft wall. detailZ1 = where curbs/
// slabs/dashes stop; bare asphalt continues to z1 and fades with the world
// curve. blade/placard = the 017-register teaser anchors at the line.
export const CLARK_STUB_W = {
  z0: -386, z1: -338, detailZ1: -352,
  blade:   { x: -271.2, z: -386.9 },               // 'N CLARK ST' pole, east curb corner
  // COMING SOON board, x = clarkX(z)+off — offset EAST of the centerline
  // because the Clark-S CPD officer NPC stands at (−286.5, −388) and blocks
  // a centered board's head-on read (task-033 shot review)
  placard: { z: -384.6, off: 4.5 },
};

// ----------------------- walkability (THE definition) -----------------
// Ordered quads; FIRST hit wins for walkable + surfaceY. Ramps/elevated
// surfaces come before flat streets. Equal-height overlaps only.
//   rect: {x0,x1,z0,z1, y}         para: x measured from clarkX(z)+off
//   wedge: the Gallagher plaza — clarkX(z)+off0 → gallagherWallX(z)
//   ramp: y lerps yTop→yBot along z (z0 = yTop end)
//   apron: point-in-triangle MINUS the corner-arc circle (the sidewalk
//   crescent the rounded marquee corner opens at Clark & Addison)
//   tri: plain point-in-triangle (the Caray plaza at the Bleacher Gate)
const S = STATION_W, R = ROOFTOPS_W, G = GALLAGHER_W, T = STREETS_W;
const rampY = (q, z) => q.yTop + (q.yBot - q.yTop) * (z - q.z0) / (q.z1 - q.z0);
// rotated-rect quad on the Sluggers building's local frame (see SLUGGERS_W).
// A sub-quad {lx,lz,hx,hz} is a rect centred at building-local (lx,lz); we bake
// its WORLD centre once and carry the shared cos/sin so inQuad/surfaceYW can
// project any point into the (unchanged) local axes. ramp = y lerps along the
// local +z axis (lz −hz → yBot, +hz → yTop), matching the drawn steps exactly.
const SLc = Math.cos(SLUGGERS_W.th), SLs = Math.sin(SLUGGERS_W.th);
const slQuad = (sub, extra) => ({
  rot: true, c: SLc, s: SLs, hx: sub.hx, hz: sub.hz,
  wcx: SLUGGERS_W.cx + sub.lx * SLc + sub.lz * SLs,
  wcz: SLUGGERS_W.cz - sub.lx * SLs + sub.lz * SLc, ...extra,
});
export const WALK_W = [
  slQuad(SLUGGERS_W.deck,    { y: SLUGGERS_W.roofY }),               // Sluggers rooftop deck
  slQuad(SLUGGERS_W.bridge,  { y: SLUGGERS_W.roofY }),               // stair-top landing
  slQuad(SLUGGERS_W.stair,   { ramp: true, yBot: 0, yTop: SLUGGERS_W.roofY }),  // exterior stair
  slQuad(SLUGGERS_W.landBot, { y: 0 }),                             // street-level stair base
  { ...S.stair, ramp: true },                                        // station stair
  { x0: S.platform.x0, x1: S.platform.x1, z0: S.platform.z0, z1: S.platform.z1, y: S.platform.y },
  { ...R.stair, ramp: true },                                        // rooftop stair
  { x0: R.waveland[1].x0, x1: R.waveland[1].x1, z0: R.waveland[1].z0, z1: R.waveland[1].z1, y: R.roofY },
  { x0: S.landing.x0, x1: S.landing.x1, z0: S.landing.z0, z1: S.landing.z1, y: 0 },
  { x0: R.stairLanding.x0, x1: R.stairLanding.x1, z0: R.stairLanding.z0, z1: R.stairLanding.z1, y: 0 },
  { x0: T.addison.x0,  x1: T.addison.x1,  z0: T.addison.z0,  z1: T.addison.z1,  y: 0 },
  { x0: T.waveland.x0, x1: T.waveland.x1, z0: T.waveland.z0, z1: T.waveland.z1, y: 0 },
  { x0: T.sheffield.x0,x1: T.sheffield.x1,z0: T.sheffield.z0,z1: T.sheffield.z1,y: 0 },
  { x0: T.kenmore.x0,  x1: T.kenmore.x1,  z0: T.kenmore.z0,  z1: T.kenmore.z1,  y: 0 },
  { para: true, off0: -T.clark.halfW, off1: T.clark.halfW, z0: T.clark.z0, z1: T.clark.z1, y: 0 },
  { wedge: true, off0: G.off0, z0: G.z0, z1: G.z1, y: 0 },   // Gallagher Way: Clark curb → bowl wall
  { apron: true,                                                     // marquee-corner apron (red brick)
    tri: APRONS_W.marquee.tri, z0: APRONS_W.marquee.z0, z1: APRONS_W.marquee.z1, y: 0 },
  { tri: APRONS_W.bleacher.tri,                                      // Caray plaza apron (red brick)
    z0: APRONS_W.bleacher.z0, z1: APRONS_W.bleacher.z1, y: 0 },
  // SE corner court (task 020): a triangle fan from the street corner across
  // APRONS_W.secorner.poly — the diagonal wall itself is the walk boundary.
  ...APRONS_W.secorner.poly.slice(1, -1).map((p, i) => {
    const q = APRONS_W.secorner.poly[i + 2], c = APRONS_W.secorner.poly[0];
    return { tri: [c, p, q], z0: Math.min(c[1], p[1], q[1]), z1: Math.max(c[1], p[1], q[1]), y: 0 };
  }),
];
function inTri(t, x, z) {
  let ins = false;
  for (let i = 0, j = 2; i < 3; j = i++) {
    const xi = t[i][0], zi = t[i][1], xj = t[j][0], zj = t[j][1];
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) ins = !ins;
  }
  return ins;
}
function inQuad(q, x, z) {
  if (q.rot) {                                    // rotated rect (Sluggers roof/stair)
    const dx = x - q.wcx, dz = z - q.wcz;
    return Math.abs(dx * q.c - dz * q.s) <= q.hx && Math.abs(dx * q.s + dz * q.c) <= q.hz;
  }
  if (z < q.z0 || z > q.z1) return false;
  if (q.apron) {
    const dx = x - CORNER_ARC.cx, dz = z - CORNER_ARC.cz;
    return inTri(q.tri, x, z) && dx * dx + dz * dz > CORNER_ARC.r * CORNER_ARC.r;
  }
  if (q.tri) return inTri(q.tri, x, z);
  if (q.wedge) return x >= clarkX(z) + q.off0 && x <= gallagherWallX(z);
  if (q.para) { const c = clarkX(z); return x >= c + q.off0 && x <= c + q.off1; }
  return x >= q.x0 && x <= q.x1;
}
// The Gallagher office block (issue 020) is a SOLID building: its rotated
// footprint is carved OUT of walkability so the mayor can't sink into its dark
// base band where the SW corner overhangs the plaza wedge + Clark para (the
// r=11 circular collider never covered the square's corners). Same frame the
// builder (village.js buildGallagherOffice) and the minimap (wrigley/index.js)
// use — centre clarkX(zc)+27, 24×24 on clarkYaw; half 12.4 covers the band
// (dep+0.2 → 12.1) plus a wall standoff, and clears the nearest walkable test
// (statue-row / plaza-north-edge sit at local |z| ≥ 13.7).
const OFC = (() => {
  const cz = (OFFICE_W.z0 + OFFICE_W.z1) / 2;
  return { cx: clarkX(cz) + 27, cz, half: 12.4, c: Math.cos(clarkYaw), s: Math.sin(clarkYaw) };
})();
export function inOfficeBlock(x, z) {
  const dx = x - OFC.cx, dz = z - OFC.cz;
  return Math.abs(dx * OFC.c - dz * OFC.s) <= OFC.half && Math.abs(dx * OFC.s + dz * OFC.c) <= OFC.half;
}
export function walkableW(x, z) {
  if (inOfficeBlock(x, z)) return false;   // solid building — never a ghost you sink into (issue 020)
  for (const q of WALK_W) if (inQuad(q, x, z)) return true;
  return false;
}
export function surfaceYW(x, z) {
  for (const q of WALK_W) if (inQuad(q, x, z)) {
    if (q.rot) {
      if (!q.ramp) return q.y;
      const lz = (x - q.wcx) * q.s + (z - q.wcz) * q.c;    // local +z along the stair run
      return q.yBot + (q.yTop - q.yBot) * (lz + q.hz) / (2 * q.hz);
    }
    return q.ramp ? rampY(q, z) : q.y;
  }
  return 0;
}

// --------------------------- cell plumbing ----------------------------
export const CLAMP_W = { xMin: -365, xMax: -115, zMin: -615, zMax: -310 };
export const SPAWN_W = { x: -140, z: -442, y: 7.6 };     // arrive on the platform
export const MAP_W   = { x0: -400, z0: -660, w: 300, h: 460, cw: 304, ch: 466 };
