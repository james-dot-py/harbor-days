// =====================================================================
// WRIGLEYVILLE — the second cell (see GEOGRAPHY.md · WRIGLEY_GEOGRAPHY)
// Pure data + pure walk functions. NO THREE imports — tools/walkprobe.mjs
// imports this file directly, so the engine and the probe share ONE
// walkability definition (no mirror drift).
//
// Chicago grid, true latitude: Addison = z −400, Waveland = z −500
// (same z-anchors as the lakefront). E–W: 1 W-address unit = 1 game unit,
// anchored so the Red Line embankment (~950 W) is x −140:
//   x = −140 − (Waddr − 950)
// Clark St diagonal: cx(z) = −290 + 0.28·(z + 400)   (x −290 at Addison,
// x −318 at Waveland — ~16° west-of-north, the real cant).
// =====================================================================

export const CELL_ID = 'wrigleyville';
export const SEED_W = 19140423;                 // opening day at Clark & Addison

// Clark St centerline (diagonal)
export const clarkX = z => -290 + 0.28 * (z + 400);

// ---------------------------- streets ---------------------------------
// Corridors are road + both sidewalks (walkable curb to curb — game day,
// the streets belong to the crowd). Everything outside them is barricaded.
export const STREETS_W = {
  addison : { z: -400, road: 8, z0: -407, z1: -393, x0: -326, x1: -124 },
  waveland: { z: -500, road: 6, z0: -506, z1: -494, x0: -330, x1: -184 },
  sheffield:{ x: -190, road: 6, x0: -196, x1: -184, z0: -506, z1: -393 },
  kenmore : { x: -230, road: 4, x0: -233, x1: -227, z0: -544, z1: -494 },
  clark   : { halfW: 8, z0: -506, z1: -393 },   // parallelogram on clarkX(z)
};

// Gallagher Way plaza: east of Clark, west stands to Waveland corner.
export const GALLAGHER_W = { z0: -494, z1: -430, off0: 8, off1: 32 }; // x: cx+off

// ------------------------- station (Addison, Red Line) ----------------
// Solid earth embankment, island platform on top, stair enclosed in the
// north mass with a doorway on Addison. Bridge carries the tracks over
// Addison (street stays walkable beneath).
export const STATION_W = {
  embank : { x0: -148, x1: -132, z0: -580, z1: -310, topY: 7.0 },
  bridge : { z0: -407, z1: -393, clearY: 5.6 },      // over Addison
  platform:{ x0: -143, x1: -137, z0: -444, z1: -426, y: 7.6 },
  stair  : { x0: -142, x1: -138, z0: -426, z1: -410, yTop: 7.6, yBot: 0.35 },
  landing: { x0: -142, x1: -138, z0: -410, z1: -404 },
  tracks : { west: -145.5, east: -134.5, y: 7.6 },   // rail centerlines
  signZ  : -435,
};

// --------------------------- the stadium ------------------------------
// Footprint polygon (CW from the Marquee corner). West face follows Clark;
// the Gallagher notch is the plaza. HP/CF define the field axis (opens NE:
// LF wall on Waveland, RF wall on Sheffield, scoreboard at the NE corner).
export const STADIUM_W = {
  poly: [
    [-284.0, -407],            // SW — Marquee Gate (Clark & Addison)
    [-196,   -407],            // SE (Addison side)
    [-196,   -494],            // NE — Bleacher Gate (Sheffield & Waveland)
    [-284.3, -494],            // NW (plaza east edge at Waveland)
    [-266.4, -430],            // plaza east edge, south end
    [-290.4, -430],            // out to Clark east edge
  ],
  marquee : { x: -284.5, z: -409.5, ry: Math.PI * 0.75 },  // faces the corner
  homePlate: [-262, -424],
  centerField: [-214, -476],
  scoreboard: { x: -212, z: -480, topY: 20.5 },
  gates: {
    marquee  : { x: -283, z: -409 },
    gallagher: { x: -272, z: -462 },               // on the plaza
    bleacher : { x: -198, z: -492 },               // Sheffield & Waveland
  },
  knothole: { x: -196, z0: -450, z1: -444 },       // screened opening, RF wall
  wallH: 4.2, facadeH: 9.5, rimH: 15.5, towerH: 20,
};

// -------------------- rooftops & buildings (lots) ---------------------
// Lots sit OUTSIDE the walk corridors and front onto them.
export const ROOFTOPS_W = {
  waveland: [                                       // north side, front z −508
    { x0: -226, x1: -217, z0: -522, z1: -508 },
    { x0: -217, x1: -208, z0: -522, z1: -508, access: true },  // THE rooftop
    { x0: -208, x1: -199, z0: -522, z1: -508 },
  ],
  sheffield: [                                      // east side, front x −184
    { x0: -184, x1: -170, z0: -478, z1: -462 },
    { x0: -184, x1: -170, z0: -462, z1: -446 },
    { x0: -184, x1: -170, z0: -446, z1: -430 },
  ],
  roofY: 9.6,
  stair: { x0: -208, x1: -205, z0: -520, z1: -508, yTop: 9.6, yBot: 0.9 },
  stairLanding: { x0: -208, x1: -205, z0: -508, z1: -505 },
};

export const VILLAGE_W = {
  murphys : { x0: -184, x1: -168, z0: -494, z1: -480 },  // SE cnr Sheffield/Waveland
  engine78: { x0: -250, x1: -234, z0: -524, z1: -508 },  // 1052 W Waveland
  cubbyBear:{ x0: -310, x1: -294, z0: -393, z1: -379 },  // opposite the marquee
  clarkBars: [                                     // west side of Clark, neon row
    { z0: -488, z1: -472, name: 'SLUGGERS'  },
    { z0: -470, z1: -454, name: 'SPORTS CORNER' },
    { z0: -452, z1: -436, name: "CASEY'S"   },
    { z0: -434, z1: -418, name: 'THE DUGOUT' },
  ],                                               // lots at cx(z)−8−16 … cx(z)−8
  standStalls: [                                   // souvenir/cap stands
    { x: -160, z: -396, ry: 0 },                   // Addison, by the station
    { x: -212, z: -397, ry: 0 },                   // Addison, mid-block
    { x: -193, z: -488, ry: Math.PI/2 },           // Sheffield at Waveland
  ],
  statueRow: { z: -491, xs: [-296, -300, -304, -308] }, // plaza north edge (Banks first)
  carayStatue: { x: -194.6, z: -489.5 },           // west sidewalk, outside the Bleacher Gate
};

// ------------------------- CPD barricades -----------------------------
// Blue wooden A-frames, 'POLICE LINE — CHICAGO POLICE'. Each line is a
// street mouth: [x0,z0]→[x1,z1]. streets.js instances them; the walk
// quads simply END here, so the wall is diegetic, not invisible.
export const BARRICADES_W = [
  { a: [-124, -407], b: [-124, -393] },            // Addison E (past the station)
  { a: [-326, -407], b: [-326, -393] },            // Addison W (past Clark)
  { a: [-330, -506], b: [-330, -494] },            // Waveland W
  { a: [-184, -506], b: [-184, -494] },            // Waveland E (past Sheffield)
  { a: [-196, -392.5], b: [-184, -392.5] },        // Sheffield S of Addison
  { a: [-196, -506.5], b: [-184, -506.5] },        // Sheffield N of Waveland
  { a: [-298, -392.5], b: [-282, -392.5] },        // Clark S of Addison
  { a: [-326.5, -506.5], b: [-310, -506.5] },      // Clark N of Waveland
  { a: [-233, -544.5], b: [-227, -544.5] },        // Kenmore dead end
];

// --------------------- backdrop (beyond the lines) --------------------
// Low-rise Lakeview band: flat instanced volumes past every barricade so
// closed streets read as "the city keeps going", not a void.
export const BACKDROP_W = {
  bands: [
    { x0: -368, x1: -336, z0: -560, z1: -350 },    // west of Clark bars
    { x0: -320, x1: -240, z0: -560, z1: -530 },    // north of the rooftops
    { x0: -184, x1: -152, z0: -580, z1: -516 },    // NE, toward the tracks
    { x0: -184, x1: -156, z0: -390, z1: -340 },    // SE block (S of Addison)
    { x0: -320, x1: -212, z0: -377, z1: -340 },    // S of Addison (behind Cubby)
    { x0: -122, x1: -110, z0: -560, z1: -350 },    // sliver east of the tracks
    { x0: -184, x1: -152, z0: -428, z1: -412 },    // NE corner block (N of Addison)
  ],
  floors: [2, 4],                                  // storeys range
};

// ----------------------- walkability (THE definition) -----------------
// Ordered quads; FIRST hit wins for walkable + surfaceY. Ramps/elevated
// surfaces come before flat streets. Equal-height overlaps only.
//   rect: {x0,x1,z0,z1, y}         para: x measured from clarkX(z)+off
//   ramp: y lerps yTop→yBot along z (z0 = yTop end)
const S = STATION_W, R = ROOFTOPS_W, G = GALLAGHER_W, T = STREETS_W;
const rampY = (q, z) => q.yTop + (q.yBot - q.yTop) * (z - q.z0) / (q.z1 - q.z0);
export const WALK_W = [
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
];
function inQuad(q, x, z) {
  if (z < q.z0 || z > q.z1) return false;
  if (q.para) { const c = clarkX(z); return x >= c + q.off0 && x <= c + q.off1; }
  return x >= q.x0 && x <= q.x1;
}
export function walkableW(x, z) {
  for (const q of WALK_W) if (inQuad(q, x, z)) return true;
  return false;
}
export function surfaceYW(x, z) {
  for (const q of WALK_W) if (inQuad(q, x, z)) return q.ramp ? rampY(q, z) : q.y;
  return 0;
}

// --------------------------- cell plumbing ----------------------------
export const CLAMP_W = { xMin: -365, xMax: -115, zMin: -580, zMax: -310 };
export const SPAWN_W = { x: -140, z: -435, y: 7.6 };     // arrive on the platform
export const MAP_W   = { x0: -400, z0: -608, w: 300, h: 406, cw: 304, ch: 412 };
