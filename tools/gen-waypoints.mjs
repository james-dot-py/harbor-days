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
};
for (const zn of CH.ZONES) {
  const v = ZONE_VIEW[zn.n];
  if (v) {
    const yaw = yawTo(v.stand[0], v.stand[1], zn.x, zn.z);
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
// the diegetic "WHERE NEXT?" kiosk ahead-right of the new monument spawn.
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
feat('wv-murphys', ...rectC(V.murphys), 0.2, 12);
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
  { const B = M.BP_BRIDGE_M, nodes = [[168, 0, 796], [186, 3.8, 796], [196, 5, 804], [205, 5, 810]];
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
addM('mp-streetwall', [
  { x: 90, z: 820, yaw: -Math.PI / 2, pitch: -0.12, dist: 8 },
  { x: 108, z: 812, yaw: -Math.PI / 2, pitch: -0.1, dist: 6 },
  { x: 66, z: 766, yaw: -Math.PI / 2, pitch: -0.06, dist: 7 },
]);
addM('mp-peristyle', [
  { x: 78, z: 736, yaw: -2.40, pitch: 0.08, dist: 7 },
  { x: 84, z: 744, yaw: -2.35, pitch: 0.08, dist: 9 },
  { x: 67, z: 738, yaw: Math.PI, pitch: 0.08, dist: 7 },
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
addM('mp-rink-overlook', [
  { x: 66.5, z: 800, yaw: 1.5708, pitch: 0.10, dist: 5.5 },
  { x: 78, z: 806, yaw: -2.2, pitch: 0.42, dist: 8 },
  { x: 67, z: 812, yaw: Math.PI, pitch: 0.05, dist: 9 },
]);
// entry f2 stands at the landing looking NE across the sheet — the first-run
// f2 camera parked ~0.3 m from the SKATE RENTAL board and it filled the frame.
addM('mp-rink-entry', [
  { x: 59, z: 800, yaw: 1.5708, pitch: 0.12, dist: 4.5 },
  { x: 65.5, z: 800, yaw: -1.5708, pitch: -0.12, dist: 5 },
  { x: 61, z: 799, yaw: 2.0, pitch: 0.16, dist: 6 },
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
addM('mp-bp-bridge-crest', [
  { x: 199, z: 806.5, yaw: -2.07, pitch: 0.02, dist: 5.5 },
  { x: 193, z: 802, yaw: -1.93, pitch: 0.02, dist: 5 },
  { x: 198, z: 806, yaw: 1.07, pitch: 0.02, dist: 5.5 },
]);

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
