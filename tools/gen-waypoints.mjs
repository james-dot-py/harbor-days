// gen-waypoints.mjs — waypoints.json is GENERATED from the data modules
// (owner decision (e) in AUTOPILOT.md). Hand-editing tools/waypoints.json is
// a doctrine violation; only the per-POI expectation strings are authored, in
// tools/waypoints.expect.json, merged here by id. Regenerated on every
// walkthrough run so it can never drift from the data.
//
// Camera math (see AUTOPILOT.md §4.1): the camera sits at
// player − (sin yaw, cos yaw)·dist and looks along +(sin yaw, cos yaw);
// yaw 0 = south (+z), ±π = north, −1.57 = west; positive pitch = higher
// camera looking down. To frame a feature, stand at/near it and point yaw
// from camera through player toward the feature: yaw = atan2(fx−px, fz−pz).
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as CH from '../src/data/chicago.js';
import * as W from '../src/data/wrigleyville.js';
import * as M from '../src/data/millennium.js';
import * as B from '../src/data/wrigley-bowl.js';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'waypoints.json');
const EXPECT = join(here, 'waypoints.expect.json');

const R = v => Math.round(v * 100) / 100;
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const yawTo = (px, pz, fx, fz) => R(Math.atan2(fx - px, fz - pz));

// three spread candidates around a primary yaw (the recurring trap is the
// camera landing inside nearby geometry — always give alternatives)
const spread = (yaw, pitch = 0.22, dist = 12) => [
  { yaw: R(yaw), pitch, dist },
  { yaw: R(yaw + 0.6), pitch, dist: Math.max(7, dist - 3) },
  { yaw: R(yaw - 0.6), pitch: R(pitch + 0.08), dist: dist + 2 },
];

// nearest walkable point to a Wrigleyville feature (WALK_W is THE shared
// walkability definition — the probe and the engine already import it)
function snapW(fx, fz) {
  if (W.walkableW(fx, fz)) return [R(fx), R(fz)];
  for (const r of [5, 8, 12, 16, 20, 26]) for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, x = fx + Math.sin(a) * r, z = fz + Math.cos(a) * r;
    if (W.walkableW(x, z)) return [R(x), R(z)];
  }
  return [R(fx), R(fz)];
}

/* ------------------- camera clearance (Wrigleyville) -------------------
   The recurring Phase-2 failure (run mrbjrqz2): a candidate camera lands
   INSIDE a building — wv-scoreboard against a mast, wv-stall-2 in Murphy's,
   wv-caray-statue f1 in a rooftop brownstone. Model the blocking volumes
   from the SAME data module the builders use and drop candidates whose
   camera would sit inside one. */
const VOLS_W = [];
{
  const vol = (r, yMax) => VOLS_W.push({ x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1, yMax });
  for (const r of W.ROOFTOPS_W.waveland) vol(r, 13);
  for (const r of W.ROOFTOPS_W.sheffield) vol(r, 13);
  vol(W.VILLAGE_W.murphys, 9); vol(W.VILLAGE_W.engine78, 9); vol(W.VILLAGE_W.cubbyBear, 9);
  vol(W.VILLAGE_W.sportsWorld, 9); vol(W.VILLAGE_W.stationCorner, 12);   // task 020 corner lots
  for (const b of W.VILLAGE_W.clarkBars) {   // lots at clarkX(z)−22…−10; slack covers the diagonal
    const c = W.clarkX((b.z0 + b.z1) / 2);
    VOLS_W.push({ x0: c - 33, x1: c - 8, z0: b.z0, z1: b.z1, yMax: 9 });
  }
  for (const b of W.BACKDROP_W.bands) vol(b, 14);
  { // Gallagher office block (para on clarkX — cover both z extremes' x span)
    const o = W.OFFICE_W;
    VOLS_W.push({ x0: W.clarkX(o.z0) + o.off0, x1: W.clarkX(o.z1) + o.off1, z0: o.z0, z1: o.z1, yMax: 16 });
  }
  { // statue row + video board on the plaza north edge (mrcn4gsg: gallagher-gate
    // spread cameras parked inside a bronze statue — props block cameras too)
    const s = W.VILLAGE_W.statueRow, xs = s.xs;
    VOLS_W.push({ x0: Math.min(...xs) - 1.2, x1: Math.max(...xs) + 1.2, z0: s.z - 1.5, z1: s.z + 1.5, yMax: 4.5 });
    const b = W.GALLAGHER_W.board;                     // derives from GALLAGHER_W.board (shared with village.js)
    const bx = W.clarkX(b.z) + b.off;
    VOLS_W.push({ x0: bx - 3.8, x1: bx + 3.8, z0: b.z - 1.5, z1: b.z + 1.5, yMax: 9.6 });
  }
  const e = W.STATION_W.embank, br = W.STATION_W.bridge;   // embankment, minus the Addison underpass
  VOLS_W.push({ x0: e.x0, x1: e.x1, z0: e.z0, z1: br.z0, yMax: e.topY + 2.5 });
  VOLS_W.push({ x0: e.x0, x1: e.x1, z0: br.z1, z1: e.z1, yMax: e.topY + 2.5 });
}
function inStadium(x, z) {
  const p = W.STADIUM_W.poly; let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
const PAD = 1.2;
function camBlockedW(x, y, z) {
  if (y < W.STADIUM_W.rimH && inStadium(x, z)) return true;
  for (const v of VOLS_W)
    if (y < v.yMax && x > v.x0 - PAD && x < v.x1 + PAD && z > v.z0 - PAD && z < v.z1 + PAD) return true;
  return false;
}
// main.js camera model (AUTOPILOT.md §4.1): where a framing puts the camera
function camPos(px, pz, py, f) {
  const down = Math.max(0, f.pitch), up = Math.max(0, -f.pitch);
  const horiz = Math.cos(down) * f.dist;
  const y = Math.max(py + 0.55, py + 1.6 + Math.sin(down) * f.dist + up * 1.2);
  return [px - Math.sin(f.yaw) * horiz, y, pz - Math.cos(f.yaw) * horiz];
}
// clearance-aware spread: candidates around the primary framing, keep the
// first three whose camera clears every volume (fall back to the raw list
// if the site is too tight — never emit fewer than three framings)
function pickW(px, pz, yaw, pitch, dist, py = 0) {
  const cands = [
    { yaw, pitch, dist },
    { yaw: yaw + 0.4, pitch, dist }, { yaw: yaw - 0.4, pitch, dist },
    { yaw, pitch, dist: dist * 0.7 },
    { yaw: yaw + 0.75, pitch: pitch + 0.06, dist: dist * 0.85 },
    { yaw: yaw - 0.75, pitch: pitch + 0.06, dist: dist * 0.85 },
    { yaw: yaw + 0.4, pitch, dist: dist + 5 }, { yaw: yaw - 0.4, pitch, dist: dist + 5 },
  ].map(f => ({ yaw: R(f.yaw), pitch: R(f.pitch), dist: R(f.dist) }));
  const clear = cands.filter(f => !camBlockedW(...camPos(px, pz, py, f)));
  return (clear.length >= 3 ? clear : clear.concat(cands.filter(f => !clear.includes(f)))).slice(0, 3);
}

const wps = [];
const add = (id, area, cell, x, z, framings, extra = {}) =>
  wps.push({ id, area, cell, x: R(x), z: R(z), framings, expectation: '', ...extra });

/* ----------------------------- lakefront ----------------------------- */
// canonical spawn view: framing {} = default camera params (baseline.png)
add('spawn', 'lakefront', 'lakefront', CH.SPAWN.player.x, CH.SPAWN.player.z,
  [{}, { yaw: -1.57, pitch: 0.2, dist: 12 }, { yaw: 3.14, pitch: 0.25, dist: 14 }]);

// zones whose subject stands AT the zone centre need a stand-off view: the
// default center-stand filled every yacht-club/fieldhouse frame with wall and
// showed only Kwanusila's base bands (run mrbjrqz2). Stand on the open side,
// aim at the centre; negative pitch lifts the look-target for tall subjects
// (fieldhouse tower tops ~21.4 m, totem wings ~13 m).
const ZONE_VIEW = {
  'Yacht Club':          { stand: [79, -180],  pitch: 0.14,  dist: 13 },  // from the basin side
  'Waveland Fieldhouse': { stand: [200, -467], pitch: -0.22, dist: 14 },  // NE trail side, tower in frame
  'Kwanusila':           { stand: [38, -370],  pitch: -0.2,  dist: 12 },  // whole pole incl. wings
  // 084 COMPRESSION: the golf is now a compact VIGNETTE (bounds z-580..-440,
  // centre 132,-510). Stand on the lakeside trail EAST of the fence and look
  // W/SW over it; yaw is OVERRIDDEN off the zone centre so the read is WSW into
  // the vignette (not WNW at the north edge). The ±0.45 spread catches the
  // Waveland fieldhouse tower (SW), the pins/flags/bunkers, and the fence.
  'Marovitz Golf Course':{ stand: [211, -500], yaw: -1.3, pitch: 0.12, dist: 14 },
};
for (const zn of CH.ZONES) {
  const v = ZONE_VIEW[zn.n];
  if (v) {
    const yaw = v.yaw !== undefined ? R(v.yaw) : yawTo(v.stand[0], v.stand[1], zn.x, zn.z);
    add('zone-' + slug(zn.n), 'lakefront', 'lakefront', v.stand[0], v.stand[1], [
      { yaw, pitch: v.pitch, dist: v.dist },
      { yaw: R(yaw + 0.45), pitch: v.pitch, dist: v.dist + 4 },
      { yaw: R(yaw - 0.45), pitch: R(v.pitch + 0.1), dist: Math.max(8, v.dist - 3) },
    ]);
    continue;
  }
  const dist = zn.r > 40 ? 15 : 11;
  add('zone-' + slug(zn.n), 'lakefront', 'lakefront', zn.x, zn.z,
    [{ yaw: 0.8, pitch: 0.2, dist }, { yaw: 2.9, pitch: 0.2, dist }, { yaw: -1.3, pitch: 0.28, dist: dist + 2 }]);
}

// sanctuary DECK — the bird-watching hero perch (task 025). Stand on the
// elevated platform just inside the west rail and look WEST/SW out over the
// interior loop + dappled clearings where the flock perches; the expectation
// judges VISIBLE BIRD ACTIVITY, not just the room. Camera sits EAST of the
// player (behind), in the tree-cleared east lane (props.js deck filter), so
// it clears the grove. Stand + yaws derive from SANCTUARY.deck.
{
  const D = CH.SANCTUARY.deck, cz = (D.z0 + D.z1) / 2, sx = D.x0 + 1.5;
  add('sanctuary-deck', 'lakefront', 'lakefront', R(sx), R(cz), [
    { yaw: yawTo(sx, cz, 132, -392), pitch: 0.34, dist: 10 },   // WSW across the clearings
    { yaw: yawTo(sx, cz, 122, -406), pitch: 0.3,  dist: 11 },   // SW toward the far clearing + loop
    { yaw: yawTo(sx, cz, 146, -380), pitch: 0.36, dist: 9 },    // W-NW up into the canopy
  ]);
}

// Belmont Red Line stop — the DESTINATION PICKER (task 051). Identity pylon
// (RED LINE · BELMONT) flanked by two lollipop departure boards at their own
// boarding points; boards face EAST (the lakefront approach), so stand EAST and
// look WEST. Boards at (16,100)/(16,111), pylon (15.4,107.2) — the cluster
// flanks the mayor from stand (26,106).
add('redline-belmont', 'lakefront', 'lakefront', 26, 106, [
  { yaw: -1.57, pitch: 0.12, dist: 12 },   // overview: pylon centre, both boards flanking
  { yaw: -1.73, pitch: 0.06, dist: 9 },    // angled toward the ADDISON board (north)
  { yaw: -1.42, pitch: 0.06, dist: 9 },    // angled toward the MONROE board (south)
]);

/* ---- 088 VISUAL-TRUTH waypoints (issues 027-030): the loop never framed the
   SHOP SIGNS close enough to read, never judged the bike/walk trail SEAM, and
   never once looked EAST at the Montrose waterline (the 072-075 framings all
   faced away — the lawn-strip-at-the-waterline bug shipped unseen). Framing
   rule per the 080 mp-lions-f0 fix: subject visible and unoccluded or the
   shot is invalid. ---- */
// beach kiosk (economy-pilot.js KX/KZ = 100,-353; sign on the +z south apron):
// f0 head-on close enough to READ the board; f1 oblique + f2 far pull-back are
// the FLICKER checks (issue 027 was a sign/apron coplanar z-fight — the board
// must be rock-solid from every angle and distance).
// f0/f2 stand WEST of the sign axis with yaw aimed at a background point past
// the kiosk — a dead-on yaw centers the mayor exactly on the board (047 law;
// the first cut of f0/f2 eclipsed the text behind the player).
add('shop-kiosk', 'lakefront', 'lakefront', 100, -347.5, [
  { x: 97, z: -347.5, yaw: 2.98, pitch: 0.04, dist: 5 },   // near: board beside the mayor, legible
  { yaw: 2.75, pitch: 0.05, dist: 7 },                     // oblique: stability off-axis
  { x: 97, z: -345, yaw: 3.08, pitch: 0.05, dist: 12 },    // far: stability at distance, board clear of the player
]);
// the dual-trail SEAM (issue 028): bike asphalt + dashes | grass strip | lime-
// stone walk, judged down-trail both ways + across. Stand mid-west-run (bike
// x90; the exact stretch the owner walks arriving at the sanctuary).
add('trail-seam', 'lakefront', 'lakefront', 90, -400, [
  { yaw: 3.14, pitch: 0.03, dist: 12 },    // north down the seam
  { yaw: 0,    pitch: 0.03, dist: 12 },    // south down the seam
  { yaw: -2.55, pitch: 0.1, dist: 8 },     // across: both ribbons + the strip
]);

/* ---- 090 LAKE MOODS: the three date-seeded weather layers, each shot with
   its explicit ?mood= opt-in (the 087 tooling law — under play=1 the mood is
   OFF unless requested, so every OTHER waypoint stays byte-stable). rainon=1
   pins the drizzle phase ON (headless page time is unpredictable; the phase
   cycle would make shots timing-coupled without it). ---- */
// FOG: f0 south past the monument globe lamp (114.8,162.2 — ~25° off-axis, 047
// law) into the misted lawn; f1 east over the Belmont Rocks at the fog-bank
// wall on the water; f2 the south lawn looking at the GHOSTED skyline scrim.
add('mood-fog', 'lakefront', 'lakefront', 111, 156, [
  { yaw: 0.24, pitch: 0.06, dist: 10 },
  { x: 146, z: 120, yaw: 1.35, pitch: 0.02, dist: 9 },
  { x: 120, z: 330, yaw: 0.12, pitch: 0.03, dist: 11 },
], { q: 'mood=fog' });
// RAIN: the frisbee pair (34,-242)/(48,-232) under their umbrellas + the
// trail's puddles. f0 aims PAST the SW partner (the coord-hash CARRIER —
// the NE one rolls without, that's the stagger; 047 law keeps the carrier
// off-axis, and their bump bubble no longer camouflages the mint canopy).
add('mood-rain', 'lakefront', 'lakefront', 40.5, -236.5, [
  { yaw: -2.0, pitch: 0.06, dist: 7 },
  { x: 48, z: -240, yaw: 0.1, pitch: 0.12, dist: 10 },
  { x: 44, z: -230, yaw: -2.6, pitch: 0.14, dist: 12 },
], { q: 'mood=rain&rainon=1' });
// FIREFLY: the sanctuary deck perch (the 025 hero stands), now judging the
// SURGE — clearly denser motes than the everyday handful, extra-golden cast.
// NO third (NW-canopy) framing: that frustum is 499/480 with the mood OFF —
// an inherited sanctuary-deck-f2 overrun (queue task 095), not a mood cost.
{
  const D = CH.SANCTUARY.deck, cz = (D.z0 + D.z1) / 2, sx = D.x0 + 1.5;
  add('mood-firefly', 'lakefront', 'lakefront', R(sx), R(cz), [
    { yaw: yawTo(sx, cz, 132, -392), pitch: 0.3, dist: 10 },
    { yaw: yawTo(sx, cz, 122, -406), pitch: 0.26, dist: 11 },
  ], { q: 'mood=firefly' });
}

// MONTROSE approach (084 COMPRESSION): mt-arrival + mt-trail now read the new
// curved BAY cove that replaced the blank golf-to-Montrose lawn (the golf is a
// compact vignette; the whole Montrose block slid +436 in z). mt-gate is the
// Montrose underpass, shifted +436 to z-771. All lakefront lawn, walkable via LAND.
// 102 TRAIL HAND-OFF: the MAIN->MONTROSE splice at [208,-572], where the golf
// course's white north fence ends beside the trail — the owner's 2026-07-19
// malformed-seam report. The mitered join (paths.js/pathgeom.js) is gate-
// checked mechanically by path-continuity.mjs; this waypoint keeps the spot
// under VISUAL regression watch too (doubled dashes / edge notches / z-fight
// band are what the owner saw).
add('trail-handoff', 'montrose', 'lakefront', 208, -572, [
  { x: 208, z: -567, yaw: 3.14, pitch: 0.85, dist: 13 },  // top-down over the seam: single dash line, smooth edges
  { x: 206, z: -590, yaw: 3.14, pitch: 0.28, dist: 9 },   // north along the trail through the seam
  { x: 205, z: -556, yaw: 3.10, pitch: 0.16, dist: 7 },   // grazing: the white fence end beside the clean pavement
]);
add('mt-arrival', 'montrose', 'lakefront', 150, -604, [
  { yaw: 2.36, pitch: 0.12, dist: 11 },    // NE across the 084 bay cove -> the hook mole + entrance light across the water
  { yaw: 2.0,  pitch: 0.10, dist: 14 },    // ENE wider: open cove water + the revetment steps wrapping the curve
  { yaw: 2.6,  pitch: 0.14, dist: 9 },     // NNE closer: the near shoreline sweep + a bench + prairie planting by the trail
]);
add('mt-trail', 'montrose', 'lakefront', 150, -632, [
  { yaw: 0.5, pitch: 0.10, dist: 12 },     // S/SSE along the curving cove shore -> golf revetment; fence + flags right, water left
  { yaw: 0.2, pitch: 0.10, dist: 12 },     // due-S: the shore curve + the hazy fieldhouse tower down the vignette
  { yaw: 0.9, pitch: 0.12, dist: 13 },     // SE toward the cove water + the golf revetment end
]);
add('mt-gate', 'montrose', 'lakefront', 34, -771, [
  { yaw: -1.57, pitch: 0.12, dist: 11 },   // due WEST at the Montrose Ave underpass portal
  { yaw: -1.4,  pitch: 0.1,  dist: 10 },   // angled: portal + flanking hedge + Lakeview backdrop
  { yaw: -1.74, pitch: 0.14, dist: 12 },   // angled the other way
]);

// MONTROSE HARBOR (task 070): the basin + moored boats, the HOOK breakwater pier,
// and Park Bait. All on walkable ground (west promenade / the mole top via LAND).
add('mt-harbor', 'montrose', 'lakefront', 182, -774, [
  { yaw: 1.42, pitch: 0.14, dist: 13 },    // east/NE across the basin -> moorings + masts + the hook beyond
  { yaw: 1.15, pitch: 0.13, dist: 14 },    // NE toward the mole/hook + entrance light + star docks
  { yaw: 1.55, pitch: 0.20, dist: 16 },    // wider basin overview (seawall water + docks)
]);
add('mt-hook', 'montrose', 'lakefront', 229, -776, [
  { yaw: 0.0,  pitch: 0.09, dist: 10 },    // SOUTH straight down the pier -> the curling tip + light + open lake
  { yaw: 0.30, pitch: 0.07, dist: 11 },    // SSE: the hook curl + light with open lake to the left
  { yaw: 0.0,  pitch: 0.14, dist: 13 },    // from further, wider down-pier (rail + riprap read)
]);
add('mt-baitshop', 'montrose', 'lakefront', 183, -736, [
  { yaw: -1.33, pitch: 0.05, dist: 8 },    // WNW at Park Bait's signed front (shop off-centre, sign reads)
  { yaw: -1.75, pitch: 0.06, dist: 8 },    // WSW from the other side (roof + shack form)
  { yaw: -1.55, pitch: 0.13, dist: 11 },   // wider: shop on the mainland + basin/docks context
]);

// MONTROSE BEACH (task 072): the city's big wild beach north of the Point — BREADTH
// after the harbor's masts and the Point's intimacy. All on walkable SAND (beachH).
// mt-beach: the long open sand + beach house; mt-dunes: the roped plover natural
// area (quiet, protective); mt-dock: the seasonal beach bar + beachgoers.
add('mt-beach', 'montrose', 'lakefront', 215, -1020, [
  { yaw: -0.7, pitch: 0.06, dist: 12 },    // SW at the beach house's rounded solarium prow — anchors the far end, sand foreground, lake low-left
  { yaw: 0.0,  pitch: 0.05, dist: 14 },    // due SOUTH down the long sand toward the dune, beach house to the right
  { yaw: 0.35, pitch: 0.09, dist: 16 },    // SSE, wide — open sand sweep + low lake horizon (breadth)
]);
add('mt-dunes', 'montrose', 'lakefront', 222, -985, [
  { yaw: 0.0,  pitch: 0.05, dist: 10 },    // SOUTH into the roped dune — sign + the plover pair + chick, rope line, grasses + mounds
  { yaw: -0.4, pitch: 0.05, dist: 9 },     // SSW at the 'PIPING PLOVER NESTING AREA' sign + the west plover (sign reads)
  { yaw: 0.28, pitch: 0.09, dist: 12 },    // SSE toward the east plover + dune mounds + the lake edge (breadth)
]);
add('mt-dock', 'montrose', 'lakefront', 216, -1037, [
  { yaw: 3.14, pitch: 0.08, dist: 10 },    // NORTH at The Dock's south front — canvas 'THE DOCK' sign, awning, umbrellas
  { yaw: 2.85, pitch: 0.06, dist: 9 },     // NNE angle — the L bar counter + beachgoers + umbrella colors
  { yaw: 3.14, pitch: 0.15, dist: 12 },    // wider/higher — the deck + bar on the sand, beach context
]);

// 088 MONTROSE SHORELINE ARC (issue 030): the waterline read the 072-075
// framings never took (all faced away from the lake), + the harbor-mouth arc.
// mt-shore-waterline: sand must run east through a short wet band INTO the
// water — the shipped bug was a lawn-green strip capping the beach at the
// exact waterline (MONTROSE_BEACH.slope.ref sat WEST of the LAND edge).
add('mt-shore-waterline', 'montrose', 'lakefront', 228, -1000, [
  { yaw: 1.35, pitch: 0.12, dist: 9 },     // EAST: sand -> wet band -> water, no green strip
  { yaw: 0.35, pitch: 0.08, dist: 12 },    // SSE along the waterline curve
  { yaw: -2.2, pitch: 0.1, dist: 12 },     // NW back over the dry sand: towels + The Dock/beach house landward
]);
// mt-shore-mouth: stand ON the rerouted trail bend at the mouth lawn; the
// hook's stone arm + entrance light (MT_HARBOR_LIGHT) read across the water.
{
  const L = CH.MT_HARBOR_LIGHT.pos, sx = 176, sz = -672;
  const yaw = yawTo(sx, sz, L[0], L[1]);
  add('mt-shore-mouth', 'montrose', 'lakefront', sx, sz, [
    { yaw, pitch: 0.08, dist: 11 },                          // NE at the hook arm + light across the mouth
    { yaw: R(yaw - 0.31), pitch: 0.08, dist: 13 },           // wider east: mouth water + mole lake face
    { yaw: R(yaw + 0.29), pitch: 0.12, dist: 9 },            // NNE closer: the basin entrance jamb
  ]);
}

// CRICKET HILL (task 073): the map's FIRST walkable HILL, inland-west of the
// harbor. Two hand-authored stands (elevated summit + lawn base). The summit
// camera pulls back DOWNHILL (behind the look direction) into clear air, never
// into the slope. mt-crickethill-summit stands ON the mound (surfaceY lifts the
// player to ~7 m); the earned view looks SSE/SE down over the harbor's hook
// breakwater + basin + the open lake, kite-flyers flanking. mt-crickethill-base
// stands on the lawn SOUTH of the mound looking NORTH at its dome silhouette with
// the kites aloft against the sky.
{
  const H = CH.CRICKET_HILL;
  add('mt-crickethill-summit', 'montrose', 'lakefront', H.cx, H.cz, [
    { yaw: 0.72, pitch: 0.16, dist: 15 },  // SSE down over the harbor HOOK breakwater + basin water, flyers flanking, open lake left
    { yaw: 0.95, pitch: 0.15, dist: 16 },  // S-SE: harbor + Park Bait shack + open lake (a kite-flyer's raised arm foreground)
    { yaw: 0.90, pitch: 0.20, dist: 18 },  // wider/higher — the whole earned vista (harbor + trail + open lake below)
  ]);
  add('mt-crickethill-base', 'montrose', 'lakefront', H.cx, H.cz + 43, [
    { yaw: 3.14, pitch: 0.06, dist: 16 },  // due NORTH at the dome SILHOUETTE — 3 kites aloft w/ tails against the sky
    { yaw: 2.88, pitch: 0.06, dist: 15 },  // NNE — the mound + kites + the low sun, flyers on the ridge
    { yaw: 3.14, pitch: 0.13, dist: 19 },  // wider/higher — the whole broad grassy mound, flyers + kites on the crest
  ]);
}

// THE MAGIC HEDGE / MONTROSE POINT (task 071): the signature-landmark hero.
// Stands from CH.MONTROSE_POINT.stands (all meadow lawn); framings are the 068
// BRIEF finals (refs/montrose/BRIEF.md §WAYPOINTS (final)) — the PHYSICS RULING
// bounds every promise: far plane 900 kills the downtown skyline, fog (opaque
// 210 m) kills the harbor light, so the strings promise the hook's stone ARM +
// the open-lake horizon instead. Cameras verified against the canopy anchors
// (the middle tree cluster was moved west of the mt-point pull-back zone).
{
  const S = CH.MONTROSE_POINT.stands;
  add('mt-hedge', 'montrose', 'lakefront', S.hedge[0], S.hedge[1], [
    { yaw: 2.36, pitch: 0.12, dist: 10 },  // NE — hedge wall + gap-1 birders left, cream panel right, lake glinting over the wall (camera pulls back into open meadow SW)
    { yaw: 1.90, pitch: 0.10, dist: 11 },  // ENE down-the-length — the whole green wall + both gaps + scopes
    { yaw: 2.85, pitch: 0.10, dist: 12 },  // NNE straight into the gap-1 window — birders + clustered songbirds dead ahead
  ]);
  add('mt-point', 'montrose', 'lakefront', S.point[0], S.point[1], [
    { yaw: 0.79, pitch: 0.12, dist: 10 },  // SE over the open water — prairie + rope line + wildflower drifts foreground
    { yaw: 0.15, pitch: 0.12, dist: 10 },  // S-SSE — centers the hook's stone arm (bearing ~0.07-0.19 from the stand; the staged 0.45 stared into the tip tree cluster at bearing 0.44)
    { yaw: 0.60, pitch: 0.16, dist: 13 },  // wider/higher — the whole tip meadow + arm + horizon
  ]);
  add('mt-hedge-gate', 'montrose', 'lakefront', S.gate[0], S.gate[1], [
    { yaw: 1.62, pitch: 0.10, dist: 10 },  // EAST through the gateway — yellow routed letters + split-rail flanks + rules board
    { yaw: 1.45, pitch: 0.08, dist: 9 },   // ENE angled — beam + flank + the path curving into the meadow beyond
    { yaw: 1.62, pitch: 0.16, dist: 12 },  // wider/higher — gateway in its meadow context, hedge line behind
  ]);
}

// LINCOLN PARK SHELL (task 112 — the map's FIRST growth WEST of the Drive and south
// of the old z408 fence). The connective SHELL waypoints; 113-117 add the lagoon
// docks / zoo / conservatory / pond and site their own lp-* stands. Framings per
// refs/lincoln-park/BRIEF.md §WAYPOINTS, REWORDED for the honest shell (the BRIEF
// grants 112 the connective strings). PHYSICS: far plane 900 + fog 210 + the
// skyline z-gate (fades z403->503) mean no string promises a crisp downtown skyline.
// lp-underpass is AXIS-ALIGNED (interior/tunnel — cross-body cameras exit tunnels).
add('lp-arrival', 'lincolnpark', 'lakefront', 22, 445, [
  { yaw: 0.0,  pitch: 0.15, dist: 7 },   // SOUTH: the parkland opening past the old fence — lawn, elms, the trail, the Drive one side
  { yaw: 0.4,  pitch: 0.12, dist: 9 },   // SSE wider: the crushed-limestone trail + lake glinting to the left, elms ahead
  { yaw: -0.35, pitch: 0.14, dist: 8 },  // SSW: the Drive + its low embankment carrying south, open park lawn to the right
]);
add('lp-underpass', 'lincolnpark', 'lakefront', 18, 661, [
  { yaw: -1.57, pitch: 0.0,  dist: 4 },              // WEST, axis-aligned: straight down the tunnel, open arch, see-through to the park
  { yaw: -1.57, pitch: 0.07, dist: 5.5 },            // wider/higher: the stone voussoir arch + the far mouth glowing beyond
  { x: -8, z: 661, yaw: 1.57, pitch: 0.05, dist: 5 }, // from the PARK side, back EAST through the tunnel toward the lakefront strip
]);
// (lp-westpanel RETIRED task 114 — its stand is now inside the zoo campus; the
// three lp-zoo-* stands below supersede the honest-interim-lawn read.)

// 114 — the FREE zoo campus: the east front-door gate off Cannon, the Sea Lion
// Pool hero (pool + rail + arcing seals + the brick hall behind), and the
// Kovler Lion House + lion yard. Stands per the 047 law (yaw aimed OFF the
// subject so the mayor doesn't occlude it); the f2 pool stand is the low
// over-the-rail read; the lion-house f2 reads the south face + monitor.
add('lp-zoo-gate', 'lincolnpark', 'lakefront', -5.5, 814, [
  { yaw: -0.75, pitch: 0.10, dist: 6.5 },               // SW oblique from the Cannon verge: BOTH piers + arch letters + open gap, house behind
  { x: -5, z: 844, yaw: -2.35, pitch: 0.08, dist: 6 },  // from the south: pier + arch band + pad, house SE corner + monitor
  { x: -6, z: 808, yaw: -0.55, pitch: 0.12, dist: 8 },  // wide NE establishing: Cannon + trail leading in, gate + house + lion yard in one frame
]);
add('lp-seal-pool', 'lincolnpark', 'lakefront', -66.5, 836, [
  { yaw: 2.35, pitch: 0.06, dist: 5.5 },                 // NE from the SW lawn: pool + grotto + rail, Lion House arches behind
  { x: -69, z: 829, yaw: 1.9, pitch: 0.08, dist: 6 },    // from the WEST loop: the postcard axis — pool + hauled seal BEFORE the hall
  { x: -60, z: 829.6, yaw: 2.95, pitch: 0.02, dist: 4.5 }, // LOW at the rail: over the rail into the water — the leaning-in read
]);
add('lp-lion-house', 'lincolnpark', 'lakefront', -20, 802, [
  { yaw: -0.30, pitch: 0.12, dist: 7 },                 // S from the north lawn: yard rail + lion ledge + the long north facade
  { x: -44, z: 807, yaw: 1.05, pitch: 0.10, dist: 8 },  // ESE oblique: plaque + facade raking away, both lions + keeper at the rail
  { x: -16, z: 806, yaw: -0.70, pitch: 0.12, dist: 6.5 }, // over-the-yard from the NE: lions + rail + plate, full west sweep of the hall
]);

// 115 — the HABITATS: a habitat-lined stretch of the north walk (penguin cove
// + polar tundra + snow-monkey knoll) and Farm-in-the-Zoo (the red GAMBREL
// barn + paddock). Stands on the new walkN/lane ribbons; plates/rails checked
// against every stand + camera point (the 114 furniture-at-stands trap).
add('lp-zoo-loop', 'lincolnpark', 'lakefront', -58, 789.2, [
  { yaw: -1.35, pitch: 0.08, dist: 6 },                   // W down-the-walk: penguin huddle at the rail right, pale tundra + white bear beyond
  { x: -52, z: 791.5, yaw: -1.05, pitch: 0.10, dist: 7 }, // WSW from the east stretch: snow-monkey knoll near-left (spring pool side), cove + tundra lined beyond
  { x: -70, z: 790.5, yaw: -2.25, pitch: 0.14, dist: 8 }, // SW higher: the tundra terrace + plunge pool + bear, the walk curving through frame
  { x: -50.5, z: 805, yaw: 2.75, pitch: 0.08, dist: 5 },  // from the LOOP looking N: the grooming pair on the knoll's south ledge (they face the loop; cam clears the -48,808 bench + the -60,812 elm)
  { x: -26, z: 848, yaw: 0.28, pitch: 0.10, dist: 6 },    // from the loop SE stretch looking S: the flamingo cluster + green lagoon + plate (yaw 0.15 parked the mayor's head on the plate title — art-director round 1)
]);
add('lp-farm', 'lincolnpark', 'lakefront', -68, 961, [
  { yaw: -1.57, pitch: 0.08, dist: 8 },                   // W axis-aligned down the lane: the red GAMBREL gable + white trim, windmill behind-right
  { x: -70.5, z: 975, yaw: -2.0, pitch: 0.10, dist: 7 },  // SW over the paddock rail: cow + goat + hens, barn behind
  { x: -68, z: 988, yaw: -2.65, pitch: 0.12, dist: 9 },   // NW from the lane's south bend: the whole yard — animals + barn + windmill
]);

// 117 — South Pond Nature Boardwalk. Café Brauer on the NW shoulder (across the
// water); the boardwalk deck + honeycomb pavilion + night herons. Stands are all
// on WALKABLE ground (deck/bank — the pond interior is non-walkable water) and
// cameras sit over the water, clear of the east fence (verified). NO skyline
// (the DOWNTOWN-SKYLINE PHYSICS RULING). 118 will add a heron interaction here.
add('lp-cafe-brauer', 'lincolnpark', 'lakefront', -49, 920, [
  { yaw: -2.30, pitch: 0.12, dist: 8 },                   // hero: Brauer E/S face + loggia + green hip + twin lanterns + clock, paddleboats right
  { x: -15, z: 918, yaw: -1.73, pitch: 0.08, dist: 9 },   // across the north water from the deck: paddleboats + loggia band + reflection
  { x: -47, z: 900, yaw: 3.00, pitch: 0.10, dist: 7 },    // the north loggia arm + terrace along the shore
]);
add('lp-boardwalk', 'lincolnpark', 'lakefront', -25, 974, [
  { yaw: 2.78, pitch: 0.06, dist: 8 },                    // N at the pavilion arch from the south deck: deck + dark rail + reeds + arch + herons (camera over water)
  { x: -33, z: 964, yaw: 2.68, pitch: 0.06, dist: 7 },    // NE through the arch from the west deck — the walk-under-the-tunnel read
  { x: -15, z: 946, yaw: 3.10, pitch: 0.06, dist: 9 },    // N up the east deck: rail + reeds + a heron + Café Brauer far
]);

// 113 — Diversey Harbor + Theater on the Lake. The harbor's money shot is the
// DOWN-THE-CHANNEL axis (docks + slips + the quay row + both banks + the
// Fullerton culvert closing the vista). f1 stands SOUTH of the skyline z-gate
// fade (z>503 hides the billboard entirely); f2 reads the channel back NORTH.
// Theater: oblique stands (047 law — never aim yaw dead at the subject).
add('lp-diversey-harbor', 'lincolnpark', 'lakefront', -4.5, 479, [
  { yaw: 0.15, pitch: 0.09, dist: 6 },                 // S down-channel from the east promenade (between dock rows — no near-deck clutter)
  { x: -6, z: 574, yaw: 0.06, pitch: 0.08, dist: 6 },  // south of the billboard fade: channel to the Fullerton culvert bridge (~75 m — the arch reads)
  { x: -6, z: 588, yaw: 2.92, pitch: 0.10, dist: 7 },  // from the promenade looking N up the channel: docks + boats + the head
]);
add('lp-theater', 'lincolnpark', 'lakefront', 24, 588, [
  { yaw: 0.95, pitch: 0.12, dist: 8 },                 // SE oblique: west arcade band angling away, lake glinting past the south end
  { yaw: 0.72, pitch: 0.10, dist: 10 },                // wider pull: the whole pavilion — arcade + deep-eave hip roof + lake beyond
  { x: 26, z: 636, yaw: 2.62, pitch: 0.10, dist: 7 },  // from the S on the trail: arcade + sign + the strip running north
]);

// Diversey ENTERABLE bay (task 028): stand on the ground hitting deck at a
// middle bay's hitting spot and look NORTH down the range — the axis-aligned
// interior framing for the bay pocket (a cross-body camera sits in a divider);
// camera behind (south) clears the open back at short dist. Stand derives from
// DIVERSEY.bays.hit. (py omitted — not a framing key; walkthrough uses spawn y.)
{
  const H = CH.DIVERSEY.bays.hit, sx = H.xs[3], sz = H.z;   // bay 4 (x51), on the deck
  add('dv-bay-deck', 'lakefront', 'lakefront', R(sx), R(sz), [
    { yaw: 3.14, pitch: 0.02, dist: 4 },    // INSIDE the bay, near-level: mayor + open front + field ahead
    { yaw: 3.14, pitch: 0.14, dist: 9 },    // pulled back: the two-tier building bands frame the downrange field
    { yaw: 2.9,  pitch: 0.05, dist: 5 },    // slight NW inside the bay — divider + field + a distance board
  ]);
}

// Diversey mini-golf (task 028): stand SE of the 3-hole course and look NW/N
// across all three holes from a raised pitch so the felt fairways, wood rails,
// cups/flags, windmill + loop all read as one coherent place. Stand + yaw
// derive from DIVERSEY.mini bounds.
{
  const mg = CH.DIVERSEY.mini, sx = (mg.x0 + mg.x1) / 2 + 7, sz = mg.z1 + 4;   // SE of the course
  const yaw = R(Math.atan2(((mg.x0 + mg.x1) / 2) - sx, ((mg.z0 + mg.z1) / 2) - sz));
  add('dv-minigolf', 'lakefront', 'lakefront', R(sx), R(sz), [
    { yaw, pitch: 0.5, dist: 20 },                 // high: the whole course layout
    { yaw: R(yaw + 0.4), pitch: 0.42, dist: 17 },  // shifted: flags + windmill
    { yaw: R(yaw - 0.4), pitch: 0.34, dist: 15 },  // lower + closer: a hole + rails read
  ]);
}

const signSeen = {};
for (const s of CH.SIGNS) {
  let id = 'sign-' + slug(s.text.replace(/[^a-z ]/gi, ''));
  if (signSeen[id] !== undefined) id += '-' + (++signSeen[id]); else signSeen[id] = 1;
  // sign face normal ≈ (sin ry, cos ry): view it with the camera on the +normal
  // side, i.e. primary yaw = ry + π (candidates cover the other facing too)
  add(id, 'lakefront', 'lakefront', s.x, s.z,
    [{ yaw: R(s.ry + Math.PI), pitch: 0.12, dist: 8 }, { yaw: R(s.ry), pitch: 0.12, dist: 8 }, { yaw: R(s.ry + Math.PI + 0.9), pitch: 0.2, dist: 10 }]);
}

// suggestion box (task 013; relocated + upsized by owner direction during 023):
// the diegetic "OPE! — welcome" kiosk (099 copy swap; was "WHERE NEXT?") ahead-right of the new monument spawn.
// Stand SE of it and aim NW; a dead-on aim hides the box behind the chibi, so
// the framings skew the yaw a little to keep the box (and its label) beside
// the mayor.
{
  // stand on the LABEL side — the face points WNW back toward the spawn
  // (standing SE shot the green back through the prairie flank)
  const b = CH.SUGGESTION_BOX, sx = b.x - 3.4, sz = b.z - 1.2;
  const yaw = yawTo(sx, sz, b.x, b.z);
  add('suggestion-box', 'lakefront', 'lakefront', R(sx), R(sz), [
    { yaw: R(yaw + 0.3), pitch: 0.08, dist: 5.5 },   // box left of the mayor, close — label read
    { yaw: R(yaw + 0.5), pitch: 0.12, dist: 6.5 },   // wider: box + monument wall + forecourt
    { yaw: R(yaw + 0.22), pitch: 0.06, dist: 4.5 },  // closer still, box just left of centre
  ]);
}

/* ---- AIDS Garden entrance + statue loop (task 023, refs/aids-garden/):
   two judged reads — (a) the spawn/entrance: monument wall, gold letters,
   bronze ginkgo scatter, boulder, sitting blocks, forecourt; (b) the plaza
   loop: the two-lobe peanut around the Haring lawn + the entrance path
   reaching the lake. Stands DERIVE from ENTRANCE/HARING so they survive
   reworks. ---- */
{
  const E = CH.ENTRANCE, H = CH.HARING.pos;
  { // (a) stand on the forecourt lawn north of the wall, aim at the lettered face
    const sx = E.letters.xc - 0.5, sz = E.wall.z - 6.5;
    const yaw = yawTo(sx, sz, E.letters.xc, E.wall.z);
    add('ag-entrance', 'lakefront', 'lakefront', R(sx), R(sz), [
      { yaw, pitch: 0.1, dist: 9 },                       // head-on: letters legible
      { yaw: R(yaw + 0.55), pitch: 0.14, dist: 11 },      // oblique: wall + forecourt + prairie + lamp
      { yaw: R(yaw - 0.5), pitch: 0.08, dist: 8 },        // from the other side: blocks + boulder near
    ]);
  }
  { // (b) statue-loop read: stand on the ring's NE, look SW across both lobes
    const sx = H[0] + 12, sz = H[2] - 9;
    add('ag-statue-loop', 'lakefront', 'lakefront', R(sx), R(sz), [
      { yaw: yawTo(sx, sz, H[0] - 9, H[2] + 11), pitch: 0.5, dist: 22 },   // high: the peanut shape
      { yaw: yawTo(sx, sz, H[0] - 9, H[2] + 11), pitch: 0.42, dist: 18 },
      { yaw: yawTo(sx, sz, H[0], H[2]), pitch: -0.1, dist: 12 },           // the statue on its lawn
    ]);
  }
}

CH.DECKS.forEach((d, i) => {   // skip decks another waypoint already covers
  const [x0, x1, z0, z1] = d.deck, xc = (x0 + x1) / 2, zc = (z0 + z1) / 2;
  if (wps.some(w => (w.x - xc) ** 2 + (w.z - zc) ** 2 < 20 * 20)) return;
  add('deck-' + i, 'lakefront', 'lakefront', xc, zc,
    [{ yaw: 0, pitch: 0.22, dist: 12 }, { yaw: 3.14, pitch: 0.22, dist: 12 }, { yaw: 1.57, pitch: 0.3, dist: 14 }]);
});

CH.MAP_LANDMARKS.forEach((lm, i) => {   // only landmarks no other waypoint covers
  if (wps.some(w => (w.x - lm.x) ** 2 + (w.z - lm.z) ** 2 < 20 * 20)) return;
  // ...or if the landmark coincides with a ZONE centre: that zone already has
  // its own (restaged) waypoint even when the stand sits off-subject — e.g. the
  // 084 golf vignette stands trail-side, 80 m from the golf landmark (132,-510),
  // so the stand-proximity test alone would spawn a redundant unjudged dup.
  if (CH.ZONES.some(zn => (zn.x - lm.x) ** 2 + (zn.z - lm.z) ** 2 < 12 * 12)) return;
  // stand OFF the landmark on the park side (west) and shoot east, far enough
  // for the whole building + water context (mrbjrqz2: walls filled the frame
  // when the player stood at the landmark itself)
  add('landmark-' + i, 'lakefront', 'lakefront', lm.x - 9, lm.z,
    [{ yaw: 1.57, pitch: 0.16, dist: 14 }, { yaw: 1.12, pitch: 0.16, dist: 12 }, { yaw: 2.02, pitch: 0.24, dist: 16 }]);
});

/* ---- Diversey corner (task 021, owner on-site photo set refs/diversey-corner/):
   five judged reads triangulated from the six photos — Chevron two-tone closeup,
   the stepped revetment + cove, seawall furniture, the lawn (path/benches/stones),
   and the harbor-mouth apron. Stands DERIVE from CHEVRON / COAST_CORNER_PARAMS.fx /
   DECKS[1] so they survive layout reworks. ---- */
{
  const CV = CH.CHEVRON.pos;                       // Chevron pad [96,0,372]
  const cfx = CH.COAST_CORNER_PARAMS.fx;           // corner revetment top-edge x at z
  const D = CH.DECKS[1].walk;                      // corner pier walk rect (x116-126, z372.5-406.5)
  const pierX = (D.x1 + D.x2) / 2;

  // (1) Chevron closeup — IMG_0389 (two-tone mast + crossing arms, water behind).
  // Stand NW of the pad on the lawn; negative pitch lifts the ~10 m masthead.
  {
    const sx = CV[0] - 7, sz = CV[2] - 9;
    const yaw = yawTo(sx, sz, CV[0], CV[2]);
    add('dv-corner-chevron', 'lakefront', 'lakefront', R(sx), R(sz), [
      { yaw, pitch: -0.14, dist: 13 },
      { yaw: R(yaw + 0.5), pitch: -0.1, dist: 15 },
      { yaw: R(yaw - 0.38), pitch: -0.18, dist: 11 },
    ]);
  }
  // (2) The steps — IMG_0394/0395 (weathered blocks, joint growth, riprap toe,
  // the cove inlet by the pier). Stand on the lawn lip above the steps at z 350.
  {
    const sx = cfx(350) - 3.5, sz = 350;
    const yaw = yawTo(sx, sz, pierX, D.z1 + 4);    // down the revetment toward the pier
    add('dv-corner-steps', 'lakefront', 'lakefront', R(sx), R(sz), [
      { yaw, pitch: 0.16, dist: 15 },
      { yaw: R(yaw - 0.55), pitch: 0.3, dist: 11 },   // steeper: the toe/waterline read
      { yaw: 2.95, pitch: 0.14, dist: 13 },           // north, up the arc toward the rocks join
    ]);
  }
  // (3) Seawall furniture — 0395/0398/0399 (white pipe railing on the shore edge,
  // bollards + red life ring on the pier). Stand ON the pier deck mid-span.
  add('dv-corner-furniture', 'lakefront', 'lakefront', R(pierX), R(D.z1 + 16), [
    { yaw: 3.14, pitch: 0.1, dist: 11 },              // north: shore railing + steps + Chevron
    { yaw: 0, pitch: 0.14, dist: 10 },                // south: down the deck, life ring + tip
    { yaw: -2.5, pitch: 0.14, dist: 9 },              // NW across the cove inlet
  ]);
  // (4) The lawn — IMG_0398/0396 (curving path, benches FACING THE WATER, worn
  // dirt desire path, scattered sitting stones). Stand W of the Chevron looking E.
  {
    const sx = CV[0] - 17, sz = CV[2] + 9;
    const yaw = yawTo(sx, sz, CV[0] + 14, CV[2] + 5);
    add('dv-corner-lawn', 'lakefront', 'lakefront', R(sx), R(sz), [
      { yaw, pitch: 0.1, dist: 13 },
      { yaw: R(yaw - 0.55), pitch: 0.08, dist: 13 },  // NE: Chevron rises from the meadow
      { yaw: R(yaw + 0.5), pitch: 0.16, dist: 15 },   // SE: toward the pier root
    ]);
  }
  // (5) Harbor mouth — IMG_0399 (apron + curved terraced seawall receding, skyline
  // south). Stand near the pier tip.
  add('dv-corner-harbormouth', 'lakefront', 'lakefront', R(pierX), R(D.z2 - 4), [
    { yaw: -1.35, pitch: 0.1, dist: 12 },             // west along the receding revetment arc
    { yaw: 0.15, pitch: 0.04, dist: 10 },             // south: skyline over open water
    { yaw: -2.35, pitch: 0.12, dist: 11 },            // NW back across the cove to the lawn
  ]);
}

/* ---------------------------- wrigleyville --------------------------- */
const ST = W.STADIUM_W, V = W.VILLAGE_W;
const feat = (id, fx, fz, pitch = 0.22, dist = 12) => {
  const [px, pz] = snapW(fx, fz);
  add(id, 'wrigleyville', 'wrigleyville', px, pz, spread(yawTo(px, pz, fx, fz) || 0.01, pitch, dist));
};
// featW: like feat but with an optional explicit stand point (view-position
// rule) and clearance-filtered framings — for subjects the default snap
// cannot frame (degenerate yaw when the feature sits ON the walk grid, or
// spread cameras that land inside buildings)
const featW = (id, fx, fz, { stand, pitch = 0.22, dist = 12 } = {}) => {
  const [px, pz] = stand ? [R(stand[0]), R(stand[1])] : snapW(fx, fz);
  add(id, 'wrigleyville', 'wrigleyville', px, pz, pickW(px, pz, yawTo(px, pz, fx, fz) || 0.01, pitch, dist));
};

// arrival platform (elevated island — axis-aligned down-the-length framings
// only; cross-body cameras exit small elevated spaces)
add('wv-spawn', 'wrigleyville', 'wrigleyville', W.SPAWN_W.x, W.SPAWN_W.z,
  [{ yaw: 3.14, pitch: 0.15, dist: 9 }, { yaw: 0, pitch: 0.15, dist: 9 }, { yaw: -1.57, pitch: 0.3, dist: 13 }]);

// Addison platform departure boards (task 051 picker). Two boards read DOWN
// the platform (the island's only clean camera axis): '→ BELMONT' faces S at
// z −447, '→ MONROE' faces N at z −438, both E of the canopy post row (x −140).
// Stand mid-platform and look N then S (axis-aligned; cross-body cameras exit
// the narrow island).
add('redline-addison-boards', 'wrigleyville', 'wrigleyville', -140, -442, [
  { yaw: 3.14, pitch: 0.05, dist: 6 },     // N: both boards ('→ BELMONT' far, '→ MONROE' near-right), 95th/Dan Ryan-bound
  { yaw: 0,    pitch: 0.05, dist: 6 },     // S: '→ MONROE / Millennium Park / 95th / Dan Ryan-bound'
  { yaw: 0,    pitch: 0.04, dist: 4 },     // S close on the MONROE board (level, clear of the hanging Addison band)
]);

// marquee: the corner is a rounded curve (r 18 after the 009 rework) and the
// apex sidewalk (the apron) is walkable, so the default snap stands ON the
// marquee (degenerate yaw → camera behind the curved wall). Stand across the
// double-wide intersection NW, square to the marquee face — the postcard
// angle showing the curve.
featW('wv-marquee', ST.marquee.x, ST.marquee.z, { stand: [-288, -401], pitch: 0.25, dist: 15 });
// scoreboard: its base is ~18 m up — stand at the Waveland/Sheffield corner
// and TILT UP (negative pitch raises the look-target ~tan(|p|)·dist·1.35).
// The default snap walked the camera into the Waveland rooftop row and a
// light-tower mast (mrbjrqz2: no framing showed the board at all).
featW('wv-scoreboard', ST.scoreboard.x, ST.scoreboard.z, { stand: [-185, -554], pitch: -0.35, dist: 12 });
// gates read as blank wall at dist 11 (facade is 16.5 m): pull back. The
// bleacher gate sits on the NE chamfer behind the Caray plaza (009) — stand
// in the Sheffield/Waveland intersection looking SW across the brick apron.
const GATE_VIEW = {
  // marquee gate sits ON the walkable corner apron now — explicit stand
  marquee:   { stand: [-286, -401], pitch: 0.14, dist: 16 },
  // gallagher gate now sits ON the wedge's bowl wall (~7.5 m west of the old
  // off-40 line); the westward spread cameras parked inside the statue row
  // (mrcn4gsg f0/f2), so stand mid-plaza SW of the gate (still walkable),
  // clear of the booth/statues/board sightlines
  gallagher: { stand: [-286, -483], pitch: 0.14, dist: 13 },
  // addison gate (task 012, owner placement correction): stand in the Addison
  // road south of the gate, camera pulls back toward the south sidewalk
  addison:   { stand: [ST.gates.addison.x, -398], pitch: 0.14, dist: 14 },
  // gate D rides the SE-corner diagonal (task 020) — stand at the court's
  // street corner; the pull-back cameras land in the open intersection
  gateD:     { stand: [-201, -409], pitch: 0.14, dist: 14 },
  bleacher:  { stand: [-190, -553], pitch: 0.12, dist: 14 },
};
for (const [g, p] of Object.entries(ST.gates)) featW('wv-gate-' + g, p.x, p.z, GATE_VIEW[g]);
// knothole (task 012, owner directive): now a screened opening in the
// WAVELAND (left-field) wall at the ball-hawk corner. The opening sits ON
// the corridor edge (z −548) — stand out in the Waveland road on its normal
// (feature-on-edge rule: featW with an explicit stand, never the plain snap).
featW('wv-knothole', (ST.knothole.x0 + ST.knothole.x1) / 2, ST.knothole.z,
  { stand: [(ST.knothole.x0 + ST.knothole.x1) / 2, ST.knothole.z - 5], pitch: 0.12, dist: 7 });
// station door: the feature is ON the walk grid, so the old snap degenerated
// (yaw 0.01 → camera inside the embankment). Stand on Addison south of the
// door and aim north at the door face under the (now 28 m) bridge.
featW('wv-station-door', -140, W.STATION_W.landing.z1 - 0.5, { stand: [-140, -398], pitch: 0.06, dist: 9 });

const rectC = r => [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2];
// murphys: the default snap stood ON the bar block and its spread cameras
// parked inside the stadium bleacher-corner mass (white frames, run mrr7fzoh
// — the engine78 feat() class). Stand in the Sheffield/Waveland intersection
// SW of the bar; the pull-back lands in the open street (094 street-shot
// proven: fascia + blade + annex band all read).
featW('wv-murphys', ...rectC(V.murphys), { stand: [-195, -555], pitch: 0.12, dist: 11 });
// engine78: the default snap's f0 spread put the camera inside the firehouse
// mass (blank frame, runs mrcn4gsg + mrcoeciv) — feat() does not clearance-
// filter. Stand on Waveland SE of the house, clearance-picked framings.
featW('wv-engine78', ...rectC(V.engine78), { stand: [-230, -564], pitch: 0.16, dist: 12 });
feat('wv-cubby-bear', ...rectC(V.cubbyBear), 0.2, 12);
V.clarkBars.forEach(b => {
  // the neon board is HIGH on the facade (sign centre y ~6.6–9) and parallel
  // to Clark's diagonal: near-grazing yaws render the plane edge-on and low
  // pitches leave it above the frame (mrbjrqz2 AND mrc4q9nx — the readable
  // "SLUGGERS" board in mrc4q9nx was the batting-cage prop, not the bar
  // neon). Stand on the front sidewalk ON the sign's normal and TILT UP
  // (pitch −0.3 centres the view ~y 7.5 at this range); the camera lands out
  // in Clark street looking square at the sign. Sign world pos = bar group
  // origin (clarkX(zc)−16) + local (dep/2, ·, 0) rotated by clarkYaw.
  const zc = (b.z0 + b.z1) / 2, th = Math.atan(0.28);   // clarkYaw (village.js)
  const sx = W.clarkX(zc) - 22 + 6.05 * Math.cos(th), sz = zc - 6.05 * Math.sin(th);
  featW('wv-bar-' + slug(b.name), sx, sz,
    { stand: [sx + 4.5 * Math.cos(th), sz - 4.5 * Math.sin(th)], pitch: -0.3, dist: 14 });
});
V.standStalls.forEach((s, i) => i === 2
  // Sheffield stall (W sidewalk, S of the Caray plaza): the default snap
  // stands ON it (degenerate yaw) — view it from the NE in the road, low
  ? featW('wv-stall-' + i, s.x, s.z, { stand: [-193, -522], pitch: 0.1, dist: 9 })
  : i === 1
  // Addison N-sidewalk stall: stand in the road south of it looking north so
  // the stadium facade rises behind (the authored expectation's context)
  ? featW('wv-stall-' + i, s.x, s.z, { stand: [s.x, -402], pitch: 0.15, dist: 8 })
  : feat('wv-stall-' + i, s.x, s.z, 0.15, 8));
// statue row fronts the Gallagher office block on the plaza's north edge:
// stand SOUTH of the row on the open plaza looking north (the row point
// itself is walkable → default snap degenerates; north cameras would sit
// inside the office mass).
featW('wv-statue-row', (V.statueRow.xs[0] + V.statueRow.xs[V.statueRow.xs.length - 1]) / 2, V.statueRow.z,
  { stand: [-299, -508], pitch: 0.15, dist: 9 });
// Caray: centered on the red-brick Caray plaza in front of the Bleacher Gate
// chamfer (009 — the owner-reference composition). Stand in the Sheffield/
// Waveland intersection NE of the statue looking SW: statue front-lit on the
// brick with the chamfered gate behind; slight up-tilt for pedestal+figure.
featW('wv-caray-statue', V.carayStatue.x, V.carayStatue.z, { stand: [-196, -550], pitch: -0.12, dist: 8 });

{ // Gallagher Way plaza center (x is Clark-relative)
  const zc = (W.GALLAGHER_W.z0 + W.GALLAGHER_W.z1) / 2;
  const xc = (W.clarkX(zc) + W.GALLAGHER_W.off0 + W.gallagherWallX(zc)) / 2;
  add('wv-gallagher-way', 'wrigleyville', 'wrigleyville', R(xc), R(zc),
    spread(yawTo(xc, zc, ST.gates.gallagher.x, ST.gates.gallagher.z), 0.25, 13));
}
{ // THE rooftop (the climbable Waveland brownstone) — stand on it, face the park
  const r = W.ROOFTOPS_W.waveland.find(b => b.access);
  const [xc, zc] = rectC(r);
  add('wv-rooftop-view', 'wrigleyville', 'wrigleyville', R(xc), R(zc),
    spread(yawTo(xc, zc, ST.scoreboard.x, ST.scoreboard.z), 0.15, 10));
}
{ // THE climbable SHEFFIELD rooftop (task 054) — stand on the deck; the hero
  // read is SW over the low Bleacher-Gate chamfer INTO right field (the 12 m RF
  // grandstand wall blocks the due-west floor, so the payoff is the SW opening +
  // the scoreboard/towers over the wall, NOT a straight-west field floor —
  // hand-authored framings, verified against the refs). f2 frames the deck
  // itself: drink rail, sittable bleacher rows, rooftop fans.
  add('wv-rooftop-bleachers', 'wrigleyville', 'wrigleyville', -170, -526, [
    { x: -167, z: -526, yaw: -1.5,  pitch: 0.17, dist: 8 },    // HERO: mayor at the drink rail (string lights), a fan alongside; the dressed green scoreboard + EAMUS CATULI + grandstand + light towers read over the right-field wall
    { x: -172, z: -524, yaw: -1.4,  pitch: 0.42, dist: 11.5 }, // FIELD GLIMPSE: the follow-cam lifts over the 12 m RF wall — grandstand seats + a sliver of green field + EAMUS CATULI read past the ivy; the deck frames the foreground
    { x: -166, z: -520, yaw: -1.72, pitch: 0.15, dist: 7 },    // the deck: drink rail + sittable bleacher rows, scoreboard + EAMUS CATULI over the wall to the WNW
  ]);
}
{ // THE Sluggers rooftop batting cage (task 009). Stand ON the deck; the west
  // backdrop band blocks east-facing cameras, so shoot from the EAST (camera
  // out over open Clark), down the deck at the cage — an elevated small space,
  // axis-ish framings only (cross-body cameras exit small rooftops).
  const SL = W.SLUGGERS_W;
  add('wv-sluggers-cage', 'wrigleyville', 'wrigleyville', R(SL.cx), R(SL.cz), [
    { yaw: -1.57, pitch: 0.2,  dist: 10 },
    { yaw: -1.15, pitch: 0.16, dist: 9 },
    { yaw: -2.0,  pitch: 0.26, dist: 11 },
  ]);
}
{ // the STREET approach: stand on Clark east of Sluggers, look WEST at the low
  // bar, its exterior stair and the rooftop cage above (the destination read).
  const SL = W.SLUGGERS_W, c = Math.cos(SL.th), s = Math.sin(SL.th);
  const sx = SL.cx + 11 * c, sz = SL.cz - 11 * s;    // out on the Clark sidewalk, east of the front
  add('wv-sluggers-stair', 'wrigleyville', 'wrigleyville', R(sx), R(sz), [
    { yaw: -1.57, pitch: 0.06, dist: 12 },
    { yaw: -1.2,  pitch: 0.1,  dist: 12 },
    { yaw: -1.95, pitch: 0.14, dist: 13 },
  ]);
}
{ // 088 (issue 027): the SLUGGERS shop MENU BOARD close-read — sluggers-shop.js
  // hangs it at building-local (FACE+0.11, 1.72, ZW-1.4) on the street face.
  // Stand out on Clark along the sign's local +x normal; yaw skewed ~0.25 off
  // dead-on so the mayor doesn't eclipse it (047 law; board top y2.13 clears
  // the head anyway). f2 far oblique = the flicker check.
  const SL = W.SLUGGERS_W, c = Math.cos(SL.th), s = Math.sin(SL.th);
  const lx = 6.11, lz = 5.3 - 1.4;
  const sxw = SL.cx + lx * c + lz * s, szw = SL.cz - lx * s + lz * c;        // sign world pos
  const px = SL.cx + (lx + 4.6) * c + lz * s, pz = SL.cz - (lx + 4.6) * s + lz * c;
  const yaw = yawTo(px, pz, sxw, szw);
  add('shop-sluggers', 'wrigleyville', 'wrigleyville', R(px), R(pz), [
    { yaw: R(yaw + 0.25), pitch: 0.0, dist: 4.5 },   // near head-on: menu lines legible
    { yaw: R(yaw - 0.3), pitch: 0.02, dist: 6 },     // oblique from the south
    { yaw: R(yaw + 0.2), pitch: 0.04, dist: 9 },     // far: stability at distance
  ]);
}
{ // one representative CPD barricade line (Addison east, by the station)
  const b = W.BARRICADES_W[0], mx = (b.a[0] + b.b[0]) / 2, mz = (b.a[1] + b.b[1]) / 2;
  const [px, pz] = snapW(mx - 10, mz);
  add('wv-barricade-addison-e', 'wrigleyville', 'wrigleyville', px, pz,
    spread(yawTo(px, pz, mx, mz), 0.15, 9));
}
{ // the Clark S right-of-way (task 033): stand on Clark just north of the
  // z −385.5 CPD line and look SSE down the reserved alignment — the stub
  // must read as a CONTINUING street (pavement/dashes/lamps/flanking lots),
  // never a wall. At these yaws the follow-cam (player − dir·dist) lands in
  // the open Clark & Addison intersection, always clear of geometry.
  const cz = -397, cx = W.clarkX(cz);
  add('wv-barricade-clark-s', 'wrigleyville', 'wrigleyville', cx, cz, [
    { yaw: 0.27, pitch: 0.12, dist: 11 },   // head-on down the alignment
    { yaw: 0.27, pitch: 0.05, dist: 7 },    // low + close: placard/blade read
    { yaw: 0.62, pitch: 0.2,  dist: 13 },   // oblique: east flank + barricade line
  ]);
}

/* ---- street-canyon waypoints (owner playtest 2026-07-09): the loop only
   judged SUBJECTS (signs, gates) and never the STREET AROUND them, so blocks
   read as bare prisms. Midblock, low pitch, down the canyon BOTH ways —
   their expectations judge ENCLOSURE (doors, glazing, cornices, furniture
   rhythm), not landmarks. ---- */
{
  const T = W.STREETS_W;
  const canyon = (id, x, z, yawA, yawB) => add(id, 'wrigleyville', 'wrigleyville', R(x), R(z), [
    { yaw: R(yawA), pitch: 0.06, dist: 13 },
    { yaw: R(yawB), pitch: 0.06, dist: 13 },
    { yaw: R(yawA + 0.35), pitch: 0.14, dist: 10 },
  ]);
  canyon('wv-street-addison', -230, T.addison.z, -1.57, 1.57);      // E-W: look W / look E
  canyon('wv-street-sheffield', T.sheffield.x + 3, -450, 3.14, 0);  // N-S: look N / look S
  canyon('wv-street-waveland', -260, T.waveland.z, -1.57, 1.57);
  canyon('wv-street-clark', W.clarkX(-460), -460, 2.87, -0.27);     // along the diagonal

  /* ---- intersection-corner waypoints (owner playtest 2026-07-09): every
     corner of every intersection should hold its REAL occupant — Sheffield &
     Addison had "nothing except the field". Stand at the intersection center,
     one framing per diagonal corner; expectations name the occupants. Coords
     derive from the data module so they follow layout reworks. ---- */
  const corner = (id, x, z) => {
    const [px, pz] = snapW(x, z);
    add(id, 'wrigleyville', 'wrigleyville', px, pz, [
      { yaw: 0.79, pitch: 0.1, dist: 13 }, { yaw: 2.36, pitch: 0.1, dist: 13 },
      { yaw: -2.36, pitch: 0.1, dist: 13 }, { yaw: -0.79, pitch: 0.1, dist: 13 },
    ]);
  };
  corner('wv-x-clark-addison', W.clarkX(T.addison.z), T.addison.z);
  corner('wv-x-sheffield-addison', T.sheffield.x, T.addison.z);
  corner('wv-x-sheffield-waveland', T.sheffield.x, T.waveland.z);
  corner('wv-x-clark-waveland', W.clarkX(T.waveland.z), T.waveland.z);
}

/* ---- OWNER PHOTO VANTAGES (task 034, refs/wrigleyville/owner-photoset-2026-07-10/):
   nine judged reads, one per owner photo — GPS+heading projected into the cell
   frame via refs/wrigleyville/osm.json (x = −140 − (Waddr − 950); z stretched
   ×1.6 north of Addison). Vantages near Clark anchor to FEATURES, not the raw
   projection (the cell's 0.28 cant liberty vs the real ~0.61 diagonal).
   Expectations quote what each photo shows; pairs that already read TRUE say
   so — the waypoint preserves the owner's ground truth either way. ---- */
{
  const T = W.STREETS_W, G = W.GALLAGHER_W, O = W.OFFICE_W;
  // (1) clark-addison-se-corner (41.947158,-87.656342 @129°): NW corner of
  // Clark & Addison looking SE across the intersection at the corner lot, its
  // rooftop billboard and the 033 Clark stub beyond the CPD line.
  add('wv-photo-clark-addison-se', 'wrigleyville', 'wrigleyville', R(W.clarkX(-396) + 6.9), -396, [
    { yaw: 0.87, pitch: 0.02, dist: 13 },
    { yaw: 0.87, pitch: -0.12, dist: 15 },   // up-tilt: the rooftop billboard
    { yaw: 1.15, pitch: 0.1, dist: 11 },
  ]);
  // (2) cubby-bear-detail (@244°): from the marquee corner looking WSW at the
  // Cubby Bear facade + rooftop truss board (the pair already reads TRUE).
  { const c = V.cubbyBear, fx = (c.x0 + c.x1) / 2, fz = (c.z0 + c.z1) / 2;
    const yaw = yawTo(-290, -392, fx, fz);
    add('wv-photo-cubby-bear', 'wrigleyville', 'wrigleyville', -290, -392, [
      { yaw, pitch: 0.05, dist: 12 },
      { yaw, pitch: -0.1, dist: 14 },        // billboard truss above the parapet
      { yaw: R(yaw + 0.35), pitch: 0.08, dist: 12 },
    ]); }
  // (3) swift-and-sons-tavern (@314°): the real NW corner anchor (Hotel
  // Zachary / Swift & Sons) — in-game the bar row holds this frontage (the
  // signed-off 006 liberty); judge the corner-anchor read at the Dugout lot.
  { const b = V.clarkBars[3], zc = (b.z0 + b.z1) / 2, fx = W.clarkX(zc) - 16;
    const yaw = yawTo(-280, -408, fx, zc);
    add('wv-photo-swift-and-sons', 'wrigleyville', 'wrigleyville', -280, -408, [
      { yaw, pitch: 0.08, dist: 12 },
      { yaw, pitch: 0.02, dist: 9 },
      { yaw: R(yaw + 0.32), pitch: 0.12, dist: 13 },
    ]); }
  // (4) gallagher-way-facing-north (@2°): mid-plaza looking north at the
  // office block, GALLAGHER WAY band, video board and statue row.
  { const pz = -470, px = R((W.clarkX(pz) + G.off0 + W.gallagherWallX(pz)) / 2);
    const yaw = yawTo(px, pz, W.clarkX((O.z0 + O.z1) / 2) + (O.off0 + O.off1) / 2, (O.z0 + O.z1) / 2);
    add('wv-photo-gallagher-north', 'wrigleyville', 'wrigleyville', px, pz, [
      { yaw, pitch: 0.03, dist: 13 },
      { yaw, pitch: -0.12, dist: 15 },       // lift to the office top + board
      { yaw: R(yaw + 0.36), pitch: 0.1, dist: 12 },
    ]); }
  // (5) wrigley-west-side-from-addison (@22°): Addison south roadway near
  // Clark, tilted up the south face to the upper deck + light lattice.
  add('wv-photo-west-flank', 'wrigleyville', 'wrigleyville', -250, -399, [
    { yaw: 2.75, pitch: -0.18, dist: 12 },
    { yaw: 2.75, pitch: -0.3, dist: 14 },    // crown + lattice banks
    { yaw: 3.05, pitch: -0.12, dist: 12 },
  ]);
  // (6) addison-south-side-facing-west (@267°): mid-block looking west along
  // Addison — south-side register (LUCKY STRIKE disc) + Cubby board far.
  add('wv-photo-addison-west', 'wrigleyville', 'wrigleyville', -218, -397, [
    { yaw: -1.52, pitch: 0.06, dist: 13 },
    { yaw: -1.52, pitch: -0.02, dist: 10 },
    { yaw: -1.2, pitch: 0.1, dist: 12 },
  ]);
  // (7) wrigley-se-corner-addison-sheffield (@321°): the angled bowl corner
  // from the Sheffield & Addison intersection; lattice banks over the crown.
  add('wv-photo-se-corner', 'wrigleyville', 'wrigleyville', -190, -404, [
    { yaw: -2.46, pitch: -0.1, dist: 13 },
    { yaw: -2.46, pitch: 0.08, dist: 12 },
    { yaw: -2.1, pitch: 0.06, dist: 12 },
  ]);
  // (8) addison-walking-west-from-redline (@229°): the arrival read — camera
  // exits from under the viaduct; yaw pulled west of the raw heading so the
  // stadium looms frame-right (the cell's compressed block vs the real one).
  add('wv-photo-arrival', 'wrigleyville', 'wrigleyville', -158, -404, [
    // f0 dist 10, not 13: at 13 the pull-back camera lands ON the task-034
    // viaduct bent column (x −146.6, z −408) and the maroon steel fills the
    // frame; at 10 the camera sits just west of it, column behind the lens
    { yaw: -1.25, pitch: 0.05, dist: 10 },
    { yaw: -1.05, pitch: 0.05, dist: 13 },
    { yaw: -1.45, pitch: -0.05, dist: 15 },
  ]);
  // (9) under-redline-facing-north (@349°): under the Addison bridge looking
  // north along the structure — underside dressing + head-house beyond.
  add('wv-photo-viaduct', 'wrigleyville', 'wrigleyville', (W.STATION_W.embank.x0 + W.STATION_W.embank.x1) / 2, -398, [
    { yaw: -2.95, pitch: -0.2, dist: 7 },
    { yaw: -2.95, pitch: -0.35, dist: 8 },   // steeper: the steel overhead
    { yaw: -2.95, pitch: 0, dist: 10 },
  ]);
}

/* ---- Ko-fi support surfaces (task 011) — the two DIEGETIC placements. Their
   screenshots feed the mechanical QR oracle (tools/decode-qr.mjs), so framings
   are chosen for a decodable, near-head-on QR, not just a pretty read. The
   title-card + HUD ♥ are DOM (shot separately), not waypoints. ---- */
{
  // rooftop billboard atop the WEST Waveland brownstone (ROOFTOPS_W.waveland[0],
  // NOT the EAMUS row). Stand on Waveland aligned with the QR panel (the board's
  // right third, ~2.3 m E of centre) and TILT UP; the board angles down toward
  // the street so the QR keystone stays shallow. Look straight N (no yaw skew).
  // Stand NORTH on Waveland (near the brownstones): the follow-cam sits `dist`
  // SOUTH of the player, so a southerly stand parks the camera INSIDE the
  // stadium (its cream Waveland face then fills the frame). From z −566 the
  // camera stays north of the stadium and looks up at the rooftop board.
  add('wv-kofi-billboard', 'wrigleyville', 'wrigleyville', -220, -566, [
    { yaw: 3.14, pitch: -0.36, dist: 13 },
    { yaw: 3.14, pitch: -0.32, dist: 11 },
    { yaw: 3.14, pitch: -0.42, dist: 15 },
  ]);
  // in-car Ko-fi placard on the redline-car north end wall. The dev-spawn hook
  // in wrigley-ride.js activates the pocket cell for x,z in the car box. Stand
  // just south of the card (north of the grab-pole column, so poles fall behind
  // the lens) and slightly WEST of centre, looking N — the card lands beside the
  // mayor, big and pole-free, at a shallow angle jsQR decodes.
  add('kofi-lcar', 'wrigleyville', 'redline-car', -251.0, -656.2, [
    { yaw: 3.14, pitch: 0.03, dist: 2.0 },
    { yaw: 3.14, pitch: 0.06, dist: 2.0 },
    { yaw: 3.14, pitch: 0.09, dist: 2.1 },
    { yaw: 3.14, pitch: 0.00, dist: 1.9 },
    { yaw: 3.14, pitch: 0.05, dist: 1.95 },
    { yaw: 3.14, pitch: 0.08, dist: 2.05 },
  ]);
}

/* ---- INSIDE WRIGLEY — the 'wrigley-bowl' pocket cell (task 055). Stands
   derive from src/data/wrigley-bowl.js; the dev-spawn hook in packs/
   wrigley-bowl.js activates the pocket (+comp ticket) for spawns inside its
   clamp. Framings are hand-authored on the interior doctrine: the ONLY safe
   camera air is over the FIELD (outward yaws from a stand put the camera
   field-side) or high over the seats (elevated stands) — a low camera behind
   a concourse stand aiming at the field buries itself in the seat risers. ---- */
{
  const atB = (r, th) => [R(B.HP_B[0] + Math.sin(th) * r), R(B.HP_B[1] + Math.cos(th) * r)];
  const AX = B.AXIS_B, BK = B.BACK_B;
  const rS0 = th => B.rWallB(th) + 0.8 + 3.8;
  // GATE ENTRY — the arrival reveal from the spawn on the warning track:
  // camera passes back through the OPEN home-plate field gate (clear air)
  add('wb-arrival', 'wrigleyville', 'wrigley-bowl', R(B.SPAWN_B.x), R(B.SPAWN_B.z), [
    { yaw: R(AX), pitch: 0.08, dist: 5.5 },      // the reveal: field → ivy → scoreboard
    { yaw: R(AX + 0.5), pitch: 0.12, dist: 8 },  // oblique: diamond + RF side
    { yaw: R(AX - 0.55), pitch: 0.2, dist: 10 }, // high oblique: LF sweep
  ]);
  // CONCOURSE READ — on the ring; outward/tangential yaws only (see doctrine)
  { const th = BK - 0.75, [px, pz] = atB(B.rWallB(th) + 2.6, th);
    const [tx, tz] = atB(B.rWallB(BK - 0.05) + 2.6, BK - 0.05);  // toward the tunnel mouth
    add('wb-concourse', 'wrigleyville', 'wrigley-bowl', px, pz, [
      { yaw: R(th), pitch: 0.1, dist: 7 },                        // outward: ring, low wall, seats+deck rising
      { yaw: yawTo(px, pz, tx, tz), pitch: 0.08, dist: 4.2 },     // along the ring to the tunnel portal (064: dist 7's straight-line pull-back left the CURVING ring and parked the lens inside a seated row-0 crowd instance — the '034 new-mass invalidates framings' pitfall, crowd edition)
      { yaw: R(th + 0.55), pitch: 0.14, dist: 9 },                // oblique outward: wedge B rises frame-left
    ]); }
  // BOWL FROM THE SEATS — wedge B rows. Cameras verified against polyRadiusB
  // (tools/tmp/frame-calc.mjs): behind-home poly depth is only ~30–36, so the
  // pull-back must stay steep + short (pitch ≥0.3 clears the 24° riser slope;
  // camR stays ≤ polyR−1.3 in the open air below the upper deck).
  { const stand = (s, row) => { const th = BK + s; return { th, p: atB(rS0(th) + row * 1.4 + 0.7, th) }; };
    const a = stand(-0.67, 6), bq = stand(-0.5, 4), c = stand(-0.9, 5);
    add('wb-bowl-from-seats', 'wrigleyville', 'wrigley-bowl', a.p[0], a.p[1], [
      { yaw: yawTo(...a.p, B.SCOREBOARD_B.x, B.SCOREBOARD_B.z), pitch: 0.3, dist: 5 },     // across the bowl to the board
      { x: bq.p[0], z: bq.p[1], yaw: yawTo(...bq.p, B.HP_B[0], B.HP_B[1]), pitch: 0.3, dist: 5 },   // down at the diamond
      { x: c.p[0], z: c.p[1], yaw: yawTo(...c.p, ...atB(70, AX + 0.55)), pitch: 0.12, dist: 7 },    // LF ivy + rooftops over the wall
    ]); }
  // IVY WALL — on the warning track in LF (track is SAFE: no chase in frame)
  { const th = AX + 0.45, [px, pz] = atB(B.rWallB(th) - 1.4, th);
    const [mx, mz] = atB(B.rWallB(AX + 0.5) - 0.2, AX + 0.5);     // the 355 marker
    const [fx, fz] = atB(B.rWallB(AX + 0.72) - 0.4, AX + 0.72);   // the LF foul pole
    add('wb-ivy', 'wrigleyville', 'wrigley-bowl', px, pz, [
      { yaw: yawTo(px, pz, mx, mz), pitch: 0.02, dist: 6 },       // ivy + 355, near-normal
      { yaw: yawTo(px, pz, fx, fz), pitch: 0.0, dist: 7 },        // down the wall to the foul pole
      { yaw: yawTo(px, pz, mx, mz), pitch: -0.14, dist: 10 },     // up: ivy → bleachers → rooftops
    ]); }
  // CHASE MOMENT — stand ON THE GRASS: the dev spawn trips the ump (whistle
  // + 0.38 s windup, then he charges from his post by the home gate). Stands
  // sit ~40–44 m of chase path from the post (frame-calc.mjs). q=slowref=1
  // (055-pack shot knob, 064): contended page game-time at the shot ranges
  // ~2.6 s to 15 s+, and the ump TAGGED before slow shots — frames came back
  // post-eject exterior. The knob keeps his full 6.9 m/s sprint but he PULLS
  // UP 2.2 m short and never tags: every load timing yields a pursuit frame.
  // Yaws aim ~0.4 rad OFF the post bearing (the 047 pitfall: yaw straight at
  // the subject pins the mayor dead-center IN FRONT of it — first run hid the
  // charging ump behind the player in all three frames).
  { const post = (() => { const th = BK + 0.3; return atB(B.rWallB(th) - 1.3, th); })();
    const s0 = atB(28, AX + 0.1), s1 = atB(31, AX - 0.15), s2 = atB(26, AX + 0.35);
    add('wb-chase', 'wrigleyville', 'wrigley-bowl', s0[0], s0[1], [
      { yaw: R(yawTo(...s0, ...post) + 0.42), pitch: 0.05, dist: 6 },                 // charge line beside the mayor
      { x: s1[0], z: s1[1], yaw: R(yawTo(...s1, ...post) - 0.45), pitch: 0.08, dist: 8.5 },  // wider, other side
      { x: s2[0], z: s2[1], yaw: R(yawTo(...s2, ...post) + 0.38), pitch: 0.03, dist: 5.5 },  // low + close
    ], { q: 'slowref=1' }); }
  // 064 GAME DAY — the seated view, the scoreboard read, the stretch moment
  // wb-seated: bg=seat auto-sits the mayor at the first bench seat at world-ready
  // and the game pack's spectator camera OVERRIDES yaw/pitch/dist — the framing
  // params are just the pre-override fallback.
  { const th = BK - 0.55, r = rS0(th) + 6 * 1.4 + 0.7 + 0.42, [sx, sz] = atB(r, th);
    add('wb-seated', 'wrigleyville', 'wrigley-bowl', sx, sz, [
      { yaw: yawTo(sx, sz, B.HP_B[0], B.HP_B[1]), pitch: 0.24, dist: 5.5 },
    ], { q: 'bg=seat' }); }
  // wb-scoreboard-game: from the CF warning track looking up at the live board
  { const th = AX + 0.06, [px, pz] = atB(B.rWallB(th) - 1.6, th);
    add('wb-scoreboard-game', 'wrigleyville', 'wrigley-bowl', px, pz, [
      { yaw: R(AX), pitch: -0.34, dist: 8 },
      { yaw: R(AX + 0.18), pitch: -0.3, dist: 10 },
    ]); }
  // wb-stretch: bg=stretch preloads the 7th-inning stretch mid-sway at ready
  { const th = BK + 0.66, r = rS0(th) + 4 * 1.4 + 0.7 + 0.42, [sx, sz] = atB(r, th);
    const [tx, tz] = atB(rS0(BK - 0.7) + 3 * 1.4, BK - 0.7);
    // f1 stands on the CF warning track (the wb-scoreboard-game composition):
    // the board's STRETCH message + the bleacher crowd leaning in sync over the
    // ivy in one frame. (Seat-side board framings kept burying the camera in a
    // near-row fan's head / the enclosure — behind-home poly depth is ~30.)
    const thT = AX + 0.06, [px, pz] = atB(B.rWallB(thT) - 1.6, thT);
    add('wb-stretch', 'wrigleyville', 'wrigley-bowl', sx, sz, [
      { yaw: yawTo(sx, sz, tx, tz), pitch: 0.14, dist: 7 },     // across the bowl: swaying sections
      { x: px, z: pz, yaw: R(AX), pitch: -0.3, dist: 9 },       // the STRETCH message on the board + syncing bleachers
    ], { q: 'bg=stretch' }); }
}

/* ---------------------------- millennium ----------------------------- */
// The Millennium Park cell (task 041 shell). Stands + framings are the
// task-040 "WAYPOINTS (final)" list, hand-verified against WALK_M — each
// framing carries its OWN stand (x,z) because these features are shot from
// several vantages (walkthrough.mjs honors f.x/f.z). Camera = stand −
// (sin yaw, cos yaw)·dist·cos(pitch). VOLS_M models this cell's camera-
// blocking masses so the hand stands can be re-checked (soft warning; the
// 040 stands were verified to land on open walkable ground / open air).
const VOLS_M = [];
{
  const vol = (x0, x1, z0, z1, yMax) => VOLS_M.push({ x0, x1, z0, z1, yMax });
  vol(M.STREETWALL_M.band.x0, M.STREETWALL_M.band.x1, M.STREETWALL_M.band.z0, M.STREETWALL_M.band.z1, 80);  // the cliff
  vol(M.BACKDROP_M.giants.z0 - 4, 214, M.BACKDROP_M.giants.z0, M.BACKDROP_M.giants.z1, 200);                // Randolph giants (x/z swapped: band runs E-W)
  vol(M.BACKDROP_M.east.x0, M.BACKDROP_M.east.x1, M.BACKDROP_M.east.z0, M.BACKDROP_M.east.z1, 44);          // east Loop band
  vol(M.KIOSK_M.x0, M.KIOSK_M.x1, M.KIOSK_M.z0, M.KIOSK_M.z1, 4.5);                                         // subway kiosk head-house
  for (const t of M.CROWN_M.towers) vol(t.x0, t.x1, t.z0, t.z1, M.CROWN_M.towerH);                          // Crown face-towers
  for (const c of M.EXELON_M.cubes) vol(c.x - M.EXELON_M.sz / 2, c.x + M.EXELON_M.sz / 2, c.z - M.EXELON_M.sz / 2, c.z + M.EXELON_M.sz / 2, M.EXELON_M.h);  // Exelon cubes
  // the Bean (043): the shell arches OVERHEAD (soffit >= ~3.5 inside the
  // footprint) — only the two ground-contact lobes block a camera. The
  // under-arch framing deliberately parks the camera inside the footprint.
  for (const l of M.CLOUD_GATE_M.legs) vol(l.x - l.r, l.x + l.r, l.z - l.r, l.z + l.r, M.CLOUD_GATE_M.bean.h);
  // Pritzker (044): the stage house is a solid mass; the ribbon crown +
  // trellis arcs arch OVERHEAD (y >= colH) — like the Bean, only the ground
  // columns block a camera, so the under-trellis great-lawn framings are
  // intentional. Model the stage box + the thin trellis POSTS (not the whole
  // footprint) so hand stands re-check without false positives.
  { const S = M.PRITZKER_M.stage; vol(S.x0, S.x1, S.z0, S.z1, 9.5); }         // stage house mass
  { const T = M.PRITZKER_M.trellis, r = (T.colR || 0.7) + 0.3;
    for (const px of [T.x0, T.x1]) for (let i = 0; i < (T.bays || 6); i++) {
      const pz = T.z0 + (T.z1 - T.z0) * i / ((T.bays || 6) - 1);
      vol(px - r, px + r, pz - r, pz + r, T.colH);                            // trellis columns
    } }
  // BP bridge parapets (046): chest-high brushed-shingle walls flanking BOTH
  // deck edges (bridge.js rails at ±2.6). Modeled as small OUTBOARD boxes
  // tracing each flank at lateral 2.6+0.35 from the deck centerline, so a
  // down-the-deck camera BETWEEN the parapets never registers (the L-car
  // interior doctrine) but a cross-body stand parked in a parapet would.
  { const B = M.BP_BRIDGE_M,
        // trace the LIVE deck: the 058+ serpentine (nodes [x,z,y] -> [x,y,z])
        // when maggie is on, else the pre-057 simplified deck (093).
        nodes = M.OPEN_GRANT.maggie
          ? M.BP_CROSSING_M.nodes.map(n => [n[0], n[2], n[1]])
          : [[168, 0, 796], [186, 3.8, 796], [196, 5, 804], [205, 5, 810]];
    for (let p = 0; p < nodes.length - 1; p++) {
      const a = nodes[p], b = nodes[p + 1];
      const dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz);
      const pxu = dz / L, pzu = -dx / L;                                       // horizontal perp (lateral)
      for (let t = 0.15; t <= 0.86; t += 0.35) {
        const cxp = a[0] + dx * t, czp = a[2] + dz * t, yTop = a[1] + (b[1] - a[1]) * t + B.parapetH;
        for (const s of [-1, 1]) {
          const ox = cxp + s * 2.95 * pxu, oz = czp + s * 2.95 * pzu;
          vol(ox - 0.5, ox + 0.5, oz - 0.5, oz + 0.5, yTop);                   // parapet flank block
        }
      }
    } }
  // Millennium Monument peristyle (050): the closed NW arc (base + columns +
  // entablature) traced as small boxes along the base radius, plus the
  // chord-end urn piers, the fountain basin and the two approach lamps. The
  // exedra interior and the open SE side stay clear for interior framings.
  { const P = M.WRIGLEY_SQ_M.peristyle, F = M.WRIGLEY_SQ_M.fountain;
    const rB = (P.rOut + P.rIn) / 2, crown = P.baseH + P.colH + P.entabH;
    for (let k = 0; k < 10; k++) {
      const th = 3 * Math.PI / 4 + (k + 0.5) * Math.PI / 10;
      const x = P.cx + Math.cos(th) * rB, z = P.cz + Math.sin(th) * rB;
      vol(x - 1.6, x + 1.6, z - 1.6, z + 1.6, crown);
    }
    for (const [ux, uz] of M.WRIGLEY_SQ_M.urns) vol(ux - 1.4, ux + 1.4, uz - 1.4, uz + 1.4, P.baseH + 2.4);
    vol(F.x - F.r, F.x + F.r, F.z - F.r, F.z + F.r, 0.7);
    for (const [lx, lz] of M.WRIGLEY_SQ_M.lamps) vol(lx - 0.4, lx + 0.4, lz - 0.4, lz + 0.4, 4.8);
  }
  // Maggie Daley masses (058) — climbing walls, fieldhouse, CSG columns +
  // pavilion frames, the play-garden lighthouse/tower/ship, and the X-masts,
  // so the new hand stands re-check (soft advisory).
  if (M.OPEN_GRANT.maggie) {
    const MG = M.MAGGIE_M;
    for (const w of MG.walls) vol(w.x0, w.x1, w.z0, w.z1, w.h);
    vol(MG.fieldhouse.x0, MG.fieldhouse.x1, MG.fieldhouse.z0, MG.fieldhouse.z1, MG.fieldhouse.h);
    for (const [cx, cz] of MG.csg.columns) vol(cx - 1.2, cx + 1.2, cz - 1.2, cz + 1.2, 12);
    for (const p of MG.csg.pavilions) vol(p.x0, p.x1, p.z0, p.z1, 6);
    const LH = MG.play.lighthouse, TW = MG.play.tower, SH = MG.play.rooms.ship;
    vol(LH.x - LH.r, LH.x + LH.r, LH.z - LH.r, LH.z + LH.r, LH.h);
    vol(TW.x0, TW.x1, TW.z0, TW.z1, TW.h);
    vol(SH.x0, SH.x1, SH.z0, SH.z1, 5);
    for (const [xx, zz] of MG.xmasts) vol(xx - 0.6, xx + 0.6, zz - 0.6, zz + 0.6, 11);
  }
  // Art Institute block masses (060) — museum campus, lions, arch, cliff
  // extension. The Nichols deck arches OVERHEAD (bean/trellis precedent) —
  // only its slim piers block, too small to model. Trench is a PIT, no vol.
  if (M.OPEN_GRANT.artInstitute) {
    const A2 = M.ART_M;
    vol(A2.westBlock.x0, A2.westBlock.x1, A2.westBlock.z0, A2.westBlock.z1, A2.pedimentH);
    vol(A2.portico.x0 - 0.4, A2.portico.x1, A2.portico.z0, A2.portico.z1, 16);    // proud portico bay
    vol(A2.waist.x0, A2.waist.x1, A2.waist.z0, A2.waist.z1, A2.waist.h);          // Gunsaulus waist
    vol(A2.modernWing.x0, A2.modernWing.x1, A2.modernWing.z0, A2.modernWing.z1, A2.modernWing.h + 1);
    for (const e of A2.eastCampus) vol(e.x0, e.x1, e.z0, e.z1, e.h);
    vol(95, 96.5, 999, 1032, 9);                                                  // South Garden annex screen wall
    for (const l of A2.lions) vol(l.x - 1.7, l.x + 1.7, l.z - 1.1, l.z + 1.1, 3.9); // lion plinths (yawed: long axis E-W)
    vol(182, 186, 930, 940, 11);                                                  // Stock Exchange Arch piers
    vol(M.STREETWALL_M.band.x0, M.STREETWALL_M.band.x1, 935, 1080, 80);           // cliff extension south
  }
  // Butler Field + Lolla masses (061) — the Petrillo shell, tents, FOH booth,
  // delay towers, the lineup poster and the crowd totems, so the festival
  // stands re-check (soft advisory; the instanced crowd is too low to model).
  if (M.OPEN_GRANT.butler) {
    const BU = M.BUTLER_M;
    vol(BU.petrillo.x0, BU.petrillo.x1, BU.petrillo.z0, BU.petrillo.z1, BU.petrillo.h + 1);
    vol(BU.tents.x0, BU.tents.x1, BU.tents.z0, BU.tents.z1, 4.5);
    vol(BU.booth.x0, BU.booth.x1, BU.booth.z0, BU.booth.z1, 4);
    for (const [dx2, dz2] of BU.delays) vol(dx2 - 1, dx2 + 1, dz2 - 1, dz2 + 1, 7.5);
    for (const [tx2, tz2] of BU.totems) vol(tx2 - 0.5, tx2 + 0.5, tz2 - 0.5, tz2 + 0.5, 3.6);
    vol(204, 208.5, 909, 911.5, 4.6);                                             // LINEUP poster board
    vol(BU.readingCones.x - 2.6, BU.readingCones.x + 2.6,
        BU.readingCones.z - 2.6, BU.readingCones.z + 2.6, 4.4);                   // Serra Reading Cones
  }
}
function camPosM(px, pz, f) {
  const down = Math.max(0, f.pitch), up = Math.max(0, -f.pitch);
  const horiz = Math.cos(down) * f.dist;
  const y = Math.max(0.55, 1.6 + Math.sin(down) * f.dist + up * 1.2);
  return [px - Math.sin(f.yaw) * horiz, y, pz - Math.cos(f.yaw) * horiz];
}
function camWarnM(id, i, f) {
  const [cx, cy, cz] = camPosM(f.x, f.z, f);
  for (const v of VOLS_M)
    if (cy < v.yMax && cx > v.x0 - 1 && cx < v.x1 + 1 && cz > v.z0 - 1 && cz < v.z1 + 1)
      console.error(`  [mp-clearance] ${id}-f${i} camera (${cx.toFixed(1)},${cz.toFixed(1)}) may sit inside a volume`);
}
// addM: framings each fully specify {x,z,yaw,pitch,dist}; the waypoint stand
// defaults to f0's stand (walkthrough falls back to it if a framing omits x/z).
function addM(id, framings) {
  framings.forEach((f, i) => { f.yaw = R(f.yaw); f.pitch = R(f.pitch); f.dist = R(f.dist); f.x = R(f.x); f.z = R(f.z); camWarnM(id, i, f); });
  add(id, 'millennium', 'millennium', framings[0].x, framings[0].z, framings);
}
addM('mp-arrival', [
  { x: 55, z: 812, yaw: Math.PI, pitch: 0.06, dist: 7 },
  { x: 54, z: 788, yaw: 0, pitch: 0.06, dist: 7 },
  { x: 55, z: 810, yaw: -2.9, pitch: 0.06, dist: 7 },
]);
// Monroe departure boards (task 051 picker) — the subway kiosk stair-head
// flanked by two boards ('→ BELMONT' and '→ ADDISON', both Howard-bound N of
// downtown). They face EAST (the park approach); stand E on the Michigan spine
// and look WEST so both flank the RED LINE pylon over the descending stair.
addM('redline-monroe-boards', [
  { x: 60, z: 800, yaw: -Math.PI / 2, pitch: 0.08, dist: 7 },   // both boards flank the kiosk pylon
  { x: 60, z: 797, yaw: -1.40,        pitch: 0.06, dist: 6 },   // toward the '→ BELMONT' board (north)
  { x: 60, z: 803, yaw: -1.74,        pitch: 0.06, dist: 6 },   // toward the '→ ADDISON' board (south)
]);
addM('mp-streetwall', [
  { x: 90, z: 820, yaw: -Math.PI / 2, pitch: -0.12, dist: 8 },
  { x: 108, z: 812, yaw: -Math.PI / 2, pitch: -0.1, dist: 6 },
  { x: 66, z: 766, yaw: -Math.PI / 2, pitch: -0.06, dist: 7 },
]);
// 050: the Millennium Monument is BUILT (1:1 semicircular arc, open side SE
// — the 041-shell framings assumed an open-S plinth). f2's straight-north
// head-on became an inside-the-exedra shot: stand near the arc center
// looking NW INTO the colonnade (axis-aligned to the opening, up-tilted).
addM('mp-peristyle', [
  { x: 78, z: 736, yaw: -2.40, pitch: 0.06, dist: 7 },
  { x: 84, z: 744, yaw: -2.35, pitch: 0.05, dist: 9 },
  { x: 69.4, z: 725.9, yaw: -2.356, pitch: -0.14, dist: 6.2 },
]);
// 050 NEW: the owner-photo vantage (owner-wrigley-square-night.webp,
// "x=85.4 z=734.5") — lawn apron foreground, purple colonnade over the warm
// gold base + fountain jet mid, lit Michigan Ave towers stacked behind.
// f1 = head-on down the SE axis; f2 = fountain + dedication band close
// (yaw aimed right of the basin so the mayor doesn't eclipse the jet).
addM('mp-wrigley-square', [
  { x: 85.4, z: 734.5, yaw: -2.09, pitch: 0.02, dist: 8 },
  { x: 78, z: 734.5, yaw: -2.356, pitch: 0.03, dist: 7 },
  { x: 74.8, z: 730.6, yaw: -1.95, pitch: 0.06, dist: 4.6 },
]);
// 049: the McCormick sunken cafe was rebuilt as the McCormick Tribune ICE
// RINK. Stands ON the ice/pit sit at floor y −1.6, so the chase cam rides low
// INSIDE the pit (the camWarnM advisory models camera y as absolute ~1.7 and
// may print for these sunken stands — advisory only). Camera positions were
// hand-verified: the f0 cams land on open apron / Michigan spine / plaza air,
// clear of the subway kiosk volume (x 48–52.5, z 796–804.5).
// overlook f0 pitches DOWN from mid-ice so the 1.6 m Park Grill band
// (awnings, lit windows, sign) fills the east read instead of Bean-and-sky
// (the first-run f0 aimed level and the band compressed to slivers).
// 093: stands re-centred on the GROWN sheet (61-74.5 x 775.5-822); f1 stands
// on the Bean-plaza balustrade rim (x0 78 now) pitched DOWN into the pit —
// the 041 carve-verify framing; f2 looks down the long axis from deeper south.
addM('mp-rink-overlook', [
  { x: 67.75, z: 800, yaw: 1.5708, pitch: 0.10, dist: 5.5 },
  { x: 79, z: 806, yaw: -2.2, pitch: 0.42, dist: 8 },
  { x: 67, z: 815, yaw: Math.PI, pitch: 0.05, dist: 9 },
]);
// entry f2 stands at the landing looking NE across the sheet — the first-run
// f2 camera parked ~0.3 m from the SKATE RENTAL board and it filled the frame.
// (093: f2 stand off the x-61 landing/ice knife-edge; ramp is 57-59.7 now.)
addM('mp-rink-entry', [
  { x: 59, z: 800, yaw: 1.5708, pitch: 0.12, dist: 4.5 },
  { x: 65.5, z: 800, yaw: -1.5708, pitch: -0.12, dist: 5 },
  { x: 60.8, z: 799, yaw: 2.0, pitch: 0.16, dist: 6 },
]);
// 043: f0/f3 dists widened for the 1:1 shell (13 x 20 — the 040 dists were
// authored against the raw osm plan and crop it); both cameras verified on
// the plaza / open lawn air.
addM('mp-bean', [
  { x: 92, z: 806, yaw: -2.58, pitch: 0.06, dist: 11 },
  { x: 87, z: 812, yaw: Math.PI, pitch: 0.06, dist: 7 },
  { x: 86.8, z: 797.7, yaw: -Math.PI / 2, pitch: 0.02, dist: 6 },
  { x: 82, z: 790, yaw: 0.72, pitch: 0.06, dist: 8.5 },
]);
// 045: the 040 stands sat SOUTH/EAST of the pad and now stare into the near
// tower's back (it fills the frame). Re-framed to stand IN the open pool
// BETWEEN the towers, looking down-axis at the FAR tower's LED face + spout
// + the amber pool reflection; f2 is the oblique establishing "two towers
// face each other" shot from the SE corner (bosques opened to x80+ for it).
addM('mp-crown-fountain', [
  { x: 72, z: 872, yaw: -2.6, pitch: 0.05, dist: 11 },         // OBLIQUE money shot: both towers + arcs curving into the pool + a face
  { x: 69.75, z: 866, yaw: Math.PI, pitch: -0.08, dist: 7 },   // axial N tower LED face head-on (+ spit)
  { x: 69.75, z: 862, yaw: 0, pitch: -0.08, dist: 7 },         // axial S tower LED face head-on (+ spit)
]);
addM('mp-promenade', [
  { x: 108, z: 806, yaw: Math.PI, pitch: 0.04, dist: 7 },
  { x: 108, z: 726, yaw: Math.PI, pitch: 0.06, dist: 6 },
  { x: 108, z: 790, yaw: 0, pitch: 0.04, dist: 7 },
]);
addM('mp-pritzker-stage', [
  { x: 147, z: 777, yaw: Math.PI, pitch: 0.05, dist: 8 },
  { x: 135, z: 782, yaw: -2.9, pitch: 0.05, dist: 9 },
  { x: 147, z: 768, yaw: Math.PI, pitch: 0.05, dist: 5 },
]);
addM('mp-great-lawn', [
  { x: 150, z: 834, yaw: Math.PI, pitch: 0.05, dist: 8 },
  { x: 130, z: 838, yaw: -2.95, pitch: 0.05, dist: 8 },
  { x: 150, z: 810, yaw: Math.PI, pitch: 0.05, dist: 6 },
]);
addM('mp-lurie', [
  { x: 159.5, z: 862, yaw: 2.25, pitch: 0.05, dist: 6 },
  { x: 159.5, z: 862, yaw: -0.91, pitch: 0.05, dist: 6 },
  { x: 174, z: 848, yaw: -0.80, pitch: 0.05, dist: 6 },
]);
// 058: the BP bridge is a FULL CROSSING (the pre-057 mp-bp-bridge-crest
// dead-end is retired). 093 SHORTENED the serpentine (owner liberty): the
// crossing moved south (crest z≈801) and the double-hairpin compressed to a
// SINGLE curl (apex ~(233, 795.6)) — stands re-derived on the new chain.
// Three down-deck stands (parapets block cross-body lines — the L-car
// doctrine): the hairpin looking back west, and the crest both ways.
addM('mp-bp-crossing', [
  { x: 233, z: 795.8, yaw: -1.95, pitch: 0.02, dist: 5 },   // hairpin apex looking back W: curl + trench + Bean/skyline
  { x: 206, z: 802.2, yaw: -1.42, pitch: 0.02, dist: 5.5 }, // crest looking WEST: deck curve + pavilion ribbons + skyline
  { x: 208, z: 802.6, yaw: 1.35, pitch: 0.02, dist: 5.5 },  // crest looking EAST: hairpin + descent into Maggie (X-masts + fieldhouse)
]);
addM('mp-ribbon', [
  { x: 252, z: 757, yaw: -2.2, pitch: 0.05, dist: 6 },      // SW lobe sweeping around the rockwork, wall shoulder in-frame
  { x: 224, z: 760, yaw: 0.5, pitch: 0.05, dist: 5 },       // ON the ribbon: down-path switchback read
  // f2 re-framed (060): the old (252,734) yaw 2.6 stand parked the chase cam
  // in the loop's outer-rim rockwork — the frame was the back of the mayor's
  // head. From the connector looking NNW the east lobes + wall B + skaters
  // read clean (island interiors are mostly climbing-wall mass — no camera
  // lands there).
  { x: 262, z: 775, yaw: -2.9, pitch: 0.06, dist: 6.5 },    // east lobes sweep + wall B holds + rails + skaters
]);
// 062: the walls are TRUE islands now (A 254-266 x 745-751, B 263-270 x
// 758-763 — issue 022); framings re-aimed at the new spots from the plaza.
addM('mp-climbing-walls', [
  { x: 252, z: 757, yaw: 2.42, pitch: 0.08, dist: 6 },      // wall A faceted face + holds from the mid plaza
  { x: 263, z: 772.5, yaw: 2.95, pitch: 0.1, dist: 6 },     // both walls three-quarter from the south connector
]);
addM('mp-play-garden', [
  { x: 279, z: 851, yaw: -2.32, pitch: 0.08, dist: 8 },     // the navy play SHIP (rope nets over wave rubber)
  { x: 296, z: 858, yaw: 2.45, pitch: 0.08, dist: 7 },      // the striped LIGHTHOUSE + curling tube slide + crater
  { x: 302, z: 830, yaw: -2.12, pitch: 0.06, dist: 9 },     // timber FORT + rope bridge + Enchanted Forest string lights
]);
addM('mp-cancer-survivors', [
  { x: 330, z: 760, yaw: Math.PI, pitch: 0.05, dist: 6 },   // column pair + pavilion frames + beds, giants-east band behind
]);
// 060: THE ART INSTITUTE. The lions are the most-checked detail of the whole
// block — three-quarter pair read, the head-on portico axis (long dist so the
// pediment fits), and one close per beast (subject 20–40° off-axis so the
// mayor doesn't eclipse it — the 047 occlusion law). Stands hug the spine /
// forecourt / steps; Michigan road west of x48 is open scenery air.
addM('mp-lions', [
  { x: 51.5, z: 981, yaw: 2.55, pitch: 0.02, dist: 10 },    // 3/4 from the S: both lions + steps + facade stack (080 sited the museum cart + docent at ~(50,986) — yaw 2.75 dist 7's camera landed square behind the docent's head; 2.55/10 rays past the cart's west face from the open road, cart mid-ground right)
  { x: 50, z: 971, yaw: 1.5708, pitch: -0.10, dist: 12 },   // head-on portico axis: lions flank, banners + frieze (tilt up — pediment apex honestly crops at this distance)
  { x: 56.2, z: 964.5, yaw: 2.62, pitch: -0.04, dist: 5.5 },// north lion close ("on the prowl", stalk paw)
  { x: 50.6, z: 977, yaw: 0.85, pitch: -0.06, dist: 5 },    // south lion close ("defiance", roaring head up)
]);
addM('mp-south-garden', [
  { x: 74, z: 1021, yaw: 2.30, pitch: 0.04, dist: 6 },      // bosque grid + fountain against the annex wall
  { x: 78.5, z: 1018, yaw: 1.9, pitch: -0.02, dist: 5 },    // Fountain of the Great Lakes close (shells + water threads)
]);
addM('mp-monroe-crossing', [
  { x: 52.5, z: 899, yaw: 0.25, pitch: 0.03, dist: 6 },     // the arrival read: crossing the closed street toward the lions
  { x: 65, z: 902.5, yaw: 1.35, pitch: 0.03, dist: 5 },     // down the closed street: LOLLA LOAD-IN (fences, cones, pallet; 061 moved the stand E — the old camera sat against the now-dressed scaffold-arch leg)
]);
// Nichols: down-the-deck framings only at deck level (mesh parapets are low
// but the L-car axis doctrine still composes best); f0 reads the hull belly
// from the allee. camWarnM may advisory-flag the on-deck stands (it models
// camera y as absolute ~1.7 — the deck is at y 5–13; documented, task 046).
addM('mp-nichols', [
  { x: 112, z: 852, yaw: 0.30, pitch: 0.02, dist: 6 },      // the boat-hull belly + nameplate rising over the stone bed
  { x: 118.2, z: 885, yaw: 0.05, pitch: -0.06, dist: 4.5 }, // ON deck, down-deck south to the Modern Wing landing
  { x: 128, z: 916, yaw: -2.51, pitch: 0.05, dist: 5 },     // from the Bluhm terrace back NW: deck, park, ribbons, skyline
]);
// 061: LOLLAPALOOZA on Butler Field. The rail stand is THE census view (057
// perf plan P4 — full festival kit + crowd buckets + closed Columbus + AI
// east masses in one frustum). f1 stands east of the stage looking NW so the
// crowd sea + flags read as the reverse angle (yaw keeps the stage edge
// ~30° off-axis — the 047 occlusion law).
addM('mp-lolla-rail', [
  { x: 252, z: 990, yaw: -0.78, pitch: 0.02, dist: 7 },     // over the crowd to the dressed Petrillo: banners + arrays + boards + the band (057's yaw 2.55 was pi-flipped — view fwd is +(sin,cos); mouth ~20° off-axis so the mayor doesn't eclipse the band, 047 law)
  { x: 247, z: 1008, yaw: -2.35, pitch: 0.10, dist: 5.5 },  // stage-side reverse: the crowd sea + totems + garlands at dusk
]);
addM('mp-lolla-crowd', [
  { x: 271, z: 960, yaw: -0.70, pitch: 0.10, dist: 7 },     // the swaying instanced field + totems + FOH booth + dance circle (SW)
  { x: 228, z: 905, yaw: 1.3, pitch: 0.04, dist: 5.2 },     // ON closed Monroe at the entry arch looking E down the festival street (camera clear of the z-901 garland string + truck awnings — both ate earlier framings)
  { x: 209.5, z: 905, yaw: -0.25, pitch: 0.04, dist: 5 },   // the LINEUP poster at the Monroe/Columbus corner (~25° right of axis — 047 law)
]);

// 088 (issue 027): the two MILLENNIUM shop signs, framed close enough to READ.
// mp-museum-cart: cart (51,986), 'COFFEE · SOUVENIRS' plane faces WEST (−x) at
// x≈50.23, sign is LOW (y 0.4-0.84) — stands sit BESIDE the axis so the mayor
// never eclipses it (047 law); cameras land in the open Michigan road air.
// 047 law, hard-learned here: the chase camera pins the MAYOR at frame centre
// on the yaw axis — aiming yaw AT the sign hides it behind the player. Each
// framing aims PAST the cart so the sign sits ~20-30° off-axis beside the
// mayor. (The docent was also moved off the sign's west normal — 080 NPC law.)
addM('mp-museum-cart', [
  { x: 47.5, z: 984.2, yaw: 1.75, pitch: 0.06, dist: 4.5 },  // SW oblique: sign left of the mayor
  { x: 47.5, z: 988.2, yaw: 1.15, pitch: 0.06, dist: 4.5 },  // NW oblique: sign right of the mayor
  { x: 46, z: 983.5, yaw: 1.85, pitch: 0.06, dist: 7.5 },    // wider: cart + docent + penny machine + lion steps, sign off-axis
]);
// mp-lolla-merch: tent (214,926), plum MERCH banner faces EAST (+x) at x≈216.57
// y2.12 (above the mayor's head — head-on is safe). The 088 sweep fixed its
// backing box (dimensions were transposed: a 2.5 m blade poked through the face).
// Same 047 law: yaws aim past the tent so the banner reads BESIDE the mayor
// (the first cut aimed straight at it and the player's head covered the word).
addM('mp-lolla-merch', [
  { x: 221, z: 924.4, yaw: -0.55, pitch: 0.02, dist: 5 },    // from the SE, aimed NNW: MERCH left of the mayor
  { x: 219, z: 921.5, yaw: -1.6, pitch: 0.02, dist: 5 },     // from the S, aimed W: banner right-of-frame
  { x: 224, z: 926, yaw: -0.9, pitch: 0.05, dist: 8 },       // wider: tent left, festival context right
]);

// 090 LAKE MOODS — the Lurie firefly surge (millennium cell). Stands on the
// Seam boardwalk / south rim; aims PAST the planting plates (047 law) so the
// motes read over the tapestry beside the mayor. add() direct (addM has no
// extras slot; this one needs its ?mood= opt-in).
add('mood-firefly-lurie', 'millennium', 'millennium', 160, 861, [
  { yaw: -2.2, pitch: 0.1, dist: 7 },
  { x: 152, z: 881, yaw: 2.8, pitch: 0.12, dist: 9 },
], { q: 'mood=firefly' });

/* --------------------------- expectations ---------------------------- */
let expect = {};
try { expect = JSON.parse(readFileSync(EXPECT, 'utf8')); } catch { /* none authored yet */ }
const ids = new Set(wps.map(w => w.id));
const stale = Object.keys(expect).filter(k => !ids.has(k));
if (stale.length) {
  console.error('STALE EXPECTATIONS (no matching waypoint — probable rename regression):\n  ' + stale.join('\n  '));
  process.exit(1);
}
for (const w of wps) if (expect[w.id]) w.expectation = expect[w.id];

const out = { generated: new Date().toISOString(), count: wps.length, waypoints: wps };
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log('waypoints.json: ' + wps.length + ' waypoints (' +
  wps.filter(w => w.area === 'lakefront').length + ' lakefront, ' +
  wps.filter(w => w.area === 'wrigleyville').length + ' wrigleyville, ' +
  wps.filter(w => w.area === 'millennium').length + ' millennium), ' +
  wps.filter(w => w.expectation).length + ' with authored expectations');

export function genWaypoints() { return out; }
