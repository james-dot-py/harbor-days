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

const wps = [];
const add = (id, area, cell, x, z, framings, extra = {}) =>
  wps.push({ id, area, cell, x: R(x), z: R(z), framings, expectation: '', ...extra });

/* ----------------------------- lakefront ----------------------------- */
// canonical spawn view: framing {} = default camera params (baseline.png)
add('spawn', 'lakefront', 'lakefront', CH.SPAWN.player.x, CH.SPAWN.player.z,
  [{}, { yaw: -1.57, pitch: 0.2, dist: 12 }, { yaw: 3.14, pitch: 0.25, dist: 14 }]);

for (const zn of CH.ZONES) {
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
  add('landmark-' + i, 'lakefront', 'lakefront', lm.x, lm.z,
    [{ yaw: 0.8, pitch: 0.2, dist: 10 }, { yaw: 2.9, pitch: 0.2, dist: 10 }, { yaw: -1.3, pitch: 0.28, dist: 12 }]);
});

/* ---------------------------- wrigleyville --------------------------- */
const ST = W.STADIUM_W, V = W.VILLAGE_W;
const feat = (id, fx, fz, pitch = 0.22, dist = 12) => {
  const [px, pz] = snapW(fx, fz);
  add(id, 'wrigleyville', 'wrigleyville', px, pz, spread(yawTo(px, pz, fx, fz) || 0.01, pitch, dist));
};

// arrival platform (elevated island — axis-aligned down-the-length framings
// only; cross-body cameras exit small elevated spaces)
add('wv-spawn', 'wrigleyville', 'wrigleyville', W.SPAWN_W.x, W.SPAWN_W.z,
  [{ yaw: 3.14, pitch: 0.15, dist: 9 }, { yaw: 0, pitch: 0.15, dist: 9 }, { yaw: -1.57, pitch: 0.3, dist: 13 }]);

feat('wv-marquee', ST.marquee.x, ST.marquee.z, 0.25, 13);
feat('wv-scoreboard', ST.scoreboard.x, ST.scoreboard.z, 0.38, 18);
for (const [g, p] of Object.entries(ST.gates)) feat('wv-gate-' + g, p.x, p.z, 0.22, 11);
feat('wv-knothole', ST.knothole.x, (ST.knothole.z0 + ST.knothole.z1) / 2, 0.15, 8);
feat('wv-station-door', -140, (W.STATION_W.landing.z1 + -400) / 2, 0.2, 10);

const rectC = r => [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2];
feat('wv-murphys', ...rectC(V.murphys), 0.2, 12);
feat('wv-engine78', ...rectC(V.engine78), 0.2, 12);
feat('wv-cubby-bear', ...rectC(V.cubbyBear), 0.2, 12);
V.clarkBars.forEach(b => {
  const zc = (b.z0 + b.z1) / 2;
  feat('wv-bar-' + slug(b.name), W.clarkX(zc) - 16, zc, 0.18, 11);
});
V.standStalls.forEach((s, i) => feat('wv-stall-' + i, s.x, s.z, 0.15, 8));
feat('wv-statue-row', V.statueRow.xs[V.statueRow.xs.length - 1], V.statueRow.z, 0.15, 9);
feat('wv-caray-statue', V.carayStatue.x, V.carayStatue.z, 0.15, 8);

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
{ // one representative CPD barricade line (Addison east, by the station)
  const b = W.BARRICADES_W[0], mx = (b.a[0] + b.b[0]) / 2, mz = (b.a[1] + b.b[1]) / 2;
  const [px, pz] = snapW(mx - 10, mz);
  add('wv-barricade-addison-e', 'wrigleyville', 'wrigleyville', px, pz,
    spread(yawTo(px, pz, mx, mz), 0.15, 9));
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
