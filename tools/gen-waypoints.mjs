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
  for (const b of W.VILLAGE_W.clarkBars) {   // lots at clarkX(z)−24…−8; slack covers the diagonal
    const c = W.clarkX((b.z0 + b.z1) / 2);
    VOLS_W.push({ x0: c - 27, x1: c - 5, z0: b.z0, z1: b.z1, yMax: 9 });
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
    const bx = W.clarkX(-464) + 27;                    // village.js buildGallagher board
    VOLS_W.push({ x0: bx - 3.8, x1: bx + 3.8, z0: -465.5, z1: -462.5, yMax: 9.6 });
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

const signSeen = {};
for (const s of CH.SIGNS) {
  let id = 'sign-' + slug(s.text.replace(/[^a-z ]/gi, ''));
  if (signSeen[id] !== undefined) id += '-' + (++signSeen[id]); else signSeen[id] = 1;
  // sign face normal ≈ (sin ry, cos ry): view it with the camera on the +normal
  // side, i.e. primary yaw = ry + π (candidates cover the other facing too)
  add(id, 'lakefront', 'lakefront', s.x, s.z,
    [{ yaw: R(s.ry + Math.PI), pitch: 0.12, dist: 8 }, { yaw: R(s.ry), pitch: 0.12, dist: 8 }, { yaw: R(s.ry + Math.PI + 0.9), pitch: 0.2, dist: 10 }]);
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

// marquee: the corner is now a rounded curve and the apex sidewalk (the
// apron) is walkable, so the default snap stands ON the marquee (degenerate
// yaw → camera behind the curved wall). Stand across the intersection SW,
// square to the marquee face — the postcard angle showing the curve.
featW('wv-marquee', ST.marquee.x, ST.marquee.z, { stand: [-286, -402], pitch: 0.25, dist: 14 });
// scoreboard: its base is ~18 m up — stand at the Waveland/Sheffield corner
// and TILT UP (negative pitch raises the look-target ~tan(|p|)·dist·1.35).
// The default snap walked the camera into the Waveland rooftop row and a
// light-tower mast (mrbjrqz2: no framing showed the board at all).
featW('wv-scoreboard', ST.scoreboard.x, ST.scoreboard.z, { stand: [-186, -500], pitch: -0.35, dist: 12 });
// gates read as blank wall at dist 11 (facade is 16.5 m): pull back. The
// bleacher corner also needs the intersection stand — its default snap sent
// spread cameras into the Sheffield rooftop brownstones.
const GATE_VIEW = {
  // marquee gate sits ON the walkable corner apron now — explicit stand
  marquee:   { stand: [-283, -403], pitch: 0.14, dist: 16 },
  // gallagher gate: the default snap stands AT the wall and the westward spread
  // cameras parked inside the relocated statue row (mrcn4gsg f0/f2) — stand
  // mid-lawn SW of the gate, clear of the booth/statues/board sightlines
  gallagher: { stand: [-282, -455], pitch: 0.14, dist: 13 },
  bleacher:  { stand: [-190, -500], pitch: 0.12, dist: 14 },
};
for (const [g, p] of Object.entries(ST.gates)) featW('wv-gate-' + g, p.x, p.z, GATE_VIEW[g]);
feat('wv-knothole', ST.knothole.x, (ST.knothole.z0 + ST.knothole.z1) / 2, 0.15, 8);
// station door: the feature is ON the walk grid, so the old snap degenerated
// (yaw 0.01 → camera inside the embankment). Stand on Addison south of the
// door and aim north at the door face under the bridge.
featW('wv-station-door', -140, W.STATION_W.landing.z1 - 0.5, { stand: [-140, -396.5], pitch: 0.06, dist: 11 });

const rectC = r => [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2];
feat('wv-murphys', ...rectC(V.murphys), 0.2, 12);
// engine78: the default snap's f0 spread put the camera inside the firehouse
// mass (blank frame, runs mrcn4gsg + mrcoeciv) — feat() does not clearance-
// filter. Stand on Waveland SE of the house, clearance-picked framings.
featW('wv-engine78', ...rectC(V.engine78), { stand: [-235, -504.5], pitch: 0.16, dist: 12 });
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
  const sx = W.clarkX(zc) - 16 + 6.05 * Math.cos(th), sz = zc - 6.05 * Math.sin(th);
  featW('wv-bar-' + slug(b.name), sx, sz,
    { stand: [sx + 4.5 * Math.cos(th), sz - 4.5 * Math.sin(th)], pitch: -0.3, dist: 14 });
});
V.standStalls.forEach((s, i) => i === 2
  // Sheffield/Waveland stall: the default snap stands ON it (degenerate yaw)
  // and the spread cameras enter Murphy's — view it from the SE, low
  ? featW('wv-stall-' + i, s.x, s.z, { stand: [-189, -482.5], pitch: 0.1, dist: 9 })
  : feat('wv-stall-' + i, s.x, s.z, 0.15, 8));
// statue row fronts the Gallagher office block on the plaza's north edge:
// stand SOUTH of the row on the open plaza looking north (the row point
// itself is walkable → default snap degenerates; north cameras would sit
// inside the office mass).
featW('wv-statue-row', (V.statueRow.xs[0] + V.statueRow.xs[V.statueRow.xs.length - 1]) / 2, V.statueRow.z,
  { stand: [-292, -458], pitch: 0.15, dist: 9 });
// Caray: the statue stands ~1 m off the Bleacher Gate wall, so a stand
// against the wall points every surviving camera AT the gate with the statue
// behind it (mrc4q9nx). Stand on Sheffield just NORTH of the statue and look
// SSW: camera ends up in the open Waveland/Sheffield intersection, statue
// front-lit with the gate wall as backdrop; slight up-tilt for the 4 m
// pedestal+figure.
featW('wv-caray-statue', V.carayStatue.x, V.carayStatue.z, { stand: [-192.5, -494], pitch: -0.12, dist: 8 });

{ // Gallagher Way plaza center (x is Clark-relative)
  const zc = (W.GALLAGHER_W.z0 + W.GALLAGHER_W.z1) / 2;
  const xc = W.clarkX(zc) + (W.GALLAGHER_W.off0 + W.GALLAGHER_W.off1) / 2;
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
}

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
  wps.filter(w => w.area === 'wrigleyville').length + ' wrigleyville), ' +
  wps.filter(w => w.expectation).length + ' with authored expectations');

export function genWaypoints() { return out; }
