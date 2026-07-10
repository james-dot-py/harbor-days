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

// Gallagher Way plaza: east of Clark, hugging the WEST stands north of the
// Addison corner. It does NOT reach Waveland — the Gallagher office block
// (1101 W Waveland) closes its north end. Stretched frame (task 009).
export const GALLAGHER_W = { z0: -520, z1: -446, off0: 14, off1: 40 }; // x: cx+off
// Gallagher office block: fills the notch from the plaza's north edge to the
// Waveland sidewalk, Clark corridor to the west-stands wall (off 40).
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
    [-202,   -414],            // SE (Addison side)
    [-202,   -528],            // chamfer start (Sheffield face)
    [-222,   -548],            // chamfer end (Waveland face) — Bleacher Gate corner
    [-291.44,-548],            // NW (plaza east edge at Waveland)
    [-262.88,-446],            // plaza east edge, south end
    [-288.88,-446],            // out to Clark east edge
  ],
  // per-edge kind, same order/length as poly edges (edge i = poly[i]→poly[i+1])
  edgeKinds: [
    ...Array(CORNER_ARC.n).fill('arc'),            // arc chords P1→P2
    'addison', 'sheffield', 'gate', 'waveland', 'plazaE', 'notchS', 'clark',
  ],
  // marquee proud of the apex along the outward radial (the old 1.4 m stand-off)
  marquee : { x: _apex[0] + 1.4 * Math.cos(_apexA), z: _apex[1] + 1.4 * Math.sin(_apexA), ry: _apexYaw },
  homePlate: [-252, -444],
  centerField: [-218, -526],
  scoreboard: { x: -216, z: -533, topY: 26.5 },    // top 87 ft; base 18.3 (60 ft) — rides above the Bleacher Gate like the ref
  gates: {
    marquee  : { x: _apex[0], z: _apex[1], yaw: _apexYaw },        // ON the curve apex
    gallagher: { x: clarkX(-490) + 40, z: -490 },                  // on the plaza east wall
    addison  : { x: -234, z: -414, yaw: 0 },                       // south face, mid-block (owner: doors on the real main entries — Clark/Gallagher + Addison)
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
//   gallagher: a brick pad on the plaza in front of the Gallagher gate
//             (visual only — the plaza para quad already walks it)
export const APRONS_W = {
  marquee : { tri: [[-283.60, -427.15], [-279.92, -414], [-266.27, -414]], z0: -427.15, z1: -414 },
  bleacher: { tri: [[-202, -528], [-202, -548], [-222, -548]], z0: -548, z1: -528 },
  gallagher: { z0: -496, z1: -484, off0: 33, off1: 40 },   // x: cx+off (para)
};

// -------------------- rooftops & buildings (lots) ---------------------
// Lots sit OUTSIDE the walk corridors and front onto them.
export const ROOFTOPS_W = {
  waveland: [                                       // north side, front z −574
    { x0: -226, x1: -217, z0: -588, z1: -574 },
    { x0: -217, x1: -208, z0: -588, z1: -574, access: true },  // THE rooftop
    { x0: -208, x1: -199, z0: -588, z1: -574 },
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
  clarkBars: [                                     // west side of Clark, neon row
    { z0: -488, z1: -472, name: 'SLUGGERS'  },
    { z0: -470, z1: -454, name: 'SPORTS CORNER' },
    { z0: -452, z1: -436, name: "CASEY'S"   },
    { z0: -434, z1: -418, name: 'THE DUGOUT' },
  ],                                               // lots at cx(z)−22 … cx(z)−10
  standStalls: [                                   // souvenir/cap stands
    { x: -160, z: -389,   ry: 0 },                 // Addison S sidewalk, by the station
    { x: -212, z: -410.5, ry: Math.PI },           // Addison N sidewalk, mid-block (stadium behind)
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
    { id: 'addison-s',  o: 'ew',    face: -384, yaw: Math.PI,               spans: [[-298, -158]] },
    { id: 'waveland-n', o: 'ew',    face: -574, yaw: 0,                      spans: [[-348, -254], [-198, -180]] },
    { id: 'sheffield-e',o: 'ns',    face: -176, yaw: -Math.PI / 2,          spans: [[-534, -388]] },
    { id: 'clark-wn',   o: 'clark', off: -16,   yaw: Math.PI / 2 + clarkYaw, spans: [[-570, -492]] },
    { id: 'clark-ws',   o: 'clark', off: -16,   yaw: Math.PI / 2 + clarkYaw, spans: [[-416, -392]] },
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
    { x0: -384, x1: -353, z0: -590, z1: -360 },    // west of Clark bars
    { x0: -324, x1: -240, z0: -632, z1: -594 },    // north of the rooftops
    { x0: -178, x1: -152, z0: -650, z1: -582 },    // NE, toward the tracks
    { x0: -178, x1: -156, z0: -382, z1: -340 },    // SE block (S of Addison)
    { x0: -326, x1: -212, z0: -370, z1: -336 },    // S of Addison (behind Cubby)
    { x0: -122, x1: -110, z0: -560, z1: -350 },    // sliver east of the tracks
    { x0: -178, x1: -152, z0: -480, z1: -420 },    // E of Sheffield mid-block (streetwall)
  ],
  floors: [2, 4],                                  // storeys range
};

// ----------------------- walkability (THE definition) -----------------
// Ordered quads; FIRST hit wins for walkable + surfaceY. Ramps/elevated
// surfaces come before flat streets. Equal-height overlaps only.
//   rect: {x0,x1,z0,z1, y}         para: x measured from clarkX(z)+off
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
  { para: true, off0: G.off0, off1: G.off1, z0: G.z0, z1: G.z1, y: 0 },   // Gallagher Way
  { apron: true,                                                     // marquee-corner apron (red brick)
    tri: APRONS_W.marquee.tri, z0: APRONS_W.marquee.z0, z1: APRONS_W.marquee.z1, y: 0 },
  { tri: APRONS_W.bleacher.tri,                                      // Caray plaza apron (red brick)
    z0: APRONS_W.bleacher.z0, z1: APRONS_W.bleacher.z1, y: 0 },
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
  if (q.para) { const c = clarkX(z); return x >= c + q.off0 && x <= c + q.off1; }
  return x >= q.x0 && x <= q.x1;
}
export function walkableW(x, z) {
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
