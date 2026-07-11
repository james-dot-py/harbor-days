// =====================================================================
//  osm-fetch.mjs — Overpass -> refs/<poi>/osm.json in GAME coordinates.
//  REFERENCE DATA ONLY (AUTOPILOT.md §1(g), §4.4). Nothing may import the
//  emitted osm.json at runtime or build time; builders hand-write coordinates
//  into GEOGRAPHY.md (first) and src/data/*.js, citing osm.json. OSM geometry
//  is never extruded or imported as game geometry.
//
//  Projection (GEOGRAPHY.md): anchor = real Belmont Ave centerline ∩ the east
//  edge of Lake Shore Drive = game (x=0, z=0). Local equirectangular:
//    meters_east  = Δlng · cos(lat0) · 111320
//    meters_north = Δlat · 110540
//  Game is 1:2 real distance, +z = south, lake = east = +x, so:
//    x = meters_east / 2 ,  z = −meters_north / 2
//
//  LAKEFRONT validation asserts run on EVERY fetch (±10 game units):
//    Belmont Ave → z=0 ; Addison St → z=−400 ; Irving Park Rd → z=−800 ;
//    LSD east edge → x≈0. On failure: print numbered failures, DO NOT emit
//    osm.json, exit nonzero.
//
//  Displaced hard cells (Wrigleyville) are a documented LIBERTY, not a
//  validation target. Their latitude anchors are true (z), but the x-frame is
//  cell-local. A per-area offset (dx, optional shear for diagonals) is applied
//  to the target geometry and recorded in provenance. NEVER assert a displaced
//  cell's x against the true projection (PITFALLS.md).
//
//  Usage:
//    node tools/osm-fetch.mjs <poi-slug> --bbox <s,w,n,e> [--offset-dx <n>] [--offset-dz <n>] [--shear <n>]
//    node tools/osm-fetch.mjs <named-area>            (belmont-harbor | wrigleyville | wrigley-field | millennium-park)
//    node tools/osm-fetch.mjs <poi-slug> --area <named>
//    flags: --refresh-anchor (ignore the cached anchor query), --no-emit (asserts only)
//
//  Network: overpass-api.de (mirror lz4.overpass-api.de). Google is refused
//  mechanically (defense in depth — no google URL is ever constructed).
// =====================================================================
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dir, '..');
const REFS = join(REPO, 'refs');

// -------------------------- constants / config ------------------------
const DEG_LAT = 110540;              // meters per degree latitude
const DEG_LNG = 111320;              // meters per degree longitude (× cos lat0)
const SCALE = 2;                     // game is 1:2 real distance
const ASSERT_TOL = 10;               // game units
const UA = 'HarborDays-Autopilot/1.0 (OSM geo reference; single-fetch, polite)';
const OVERPASS = ['https://overpass-api.de/api/interpreter',
                  'https://lz4.overpass-api.de/api/interpreter'];
const ANCHOR_CACHE = join(REFS, '_anchor-cache.json');
const ANCHOR_TTL_MS = 7 * 24 * 3600 * 1000;

// Lakefront strip that carries the anchor streets (Belmont → Irving Park + LSD).
const ANCHOR_BBOX = [41.9380, -87.6520, 41.9560, -87.6300];   // s,w,n,e

// Named-area presets (convenience). bbox = s,w,n,e.
const AREAS = {
  'belmont-harbor': { bbox: [41.9380, -87.6500, 41.9560, -87.6300] },
  // Displaced hard cell: Clark & Addison. Offset auto-calibrated so the real
  // Clark ∩ Addison intersection lands on the cell's documented Clark centerline
  // at Addison — GEOGRAPHY.md WRIGLEY_GEOGRAPHY "Clark St diagonal: x = −290 at
  // Addison" (= wrigleyville.js clarkX(−400)). z stays TRUE latitude.
  'wrigleyville':  { bbox: [41.9455, -87.6600, 41.9505, -87.6520], calibrate: CLARK_ADDISON() },
  'wrigley-field': { bbox: [41.9455, -87.6600, 41.9505, -87.6520], calibrate: CLARK_ADDISON() },
  // Displaced hard cell, BOTH axes park-local (true lakefront projection would be
  // z ≈ +3200 — never a validation target, PITFALLS.md). Frame targets the queue-040
  // SUGGESTED cell region (x +40..+200, z +640..+920): Michigan Ave centerline →
  // x 40, Monroe St centerline → z 900 (so Randolph ≈ z 649, Columbus ≈ x 200 at
  // 1:2 land scale). bbox = Michigan/Randolph/Columbus/Monroe frame + a half-block
  // west of Michigan so the streetwall ("the cliff") footprints land as reference.
  'millennium-park': { bbox: [41.8795, -87.6260, 41.8865, -87.6180], calibrate: MICHIGAN_MONROE() },
};
function CLARK_ADDISON() {
  return { streetA: 'North Clark Street', streetB: 'West Addison Street',
           targetX: -290, targetZ: -400,
           cite: 'GEOGRAPHY.md WRIGLEY_GEOGRAPHY / wrigleyville.js clarkX(-400) = -290' };
}
function MICHIGAN_MONROE() {
  return { streetA: 'South Michigan Avenue', streetB: 'East Monroe Street',
           targetX: 40, targetZ: 900, displaceZ: true,
           cite: 'queue 040 SUGGESTED millennium cell region x +40..+200, z +640..+920: Michigan Ave centerline = x 40, Monroe centerline = z 900 (park-local frame, both axes displaced)' };
}

// ------------------------------- args ---------------------------------
function parseArgs(argv) {
  const a = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const k = t.slice(2);
      if (['refresh-anchor', 'no-emit'].includes(k)) a.flags[k] = true;
      else a.flags[k] = argv[++i];
    } else a._.push(t);
  }
  return a;
}

// ---------------------------- google guard ----------------------------
const GOOGLE_RE = /google\.com|googleapis\.com|gstatic\.com|ggpht|streetview|maps\.google|goo\.gl/i;
function assertNotGoogle(url) {
  if (GOOGLE_RE.test(url)) { throw new Error('REFUSED google-domain URL (owner decision, no exceptions): ' + url); }
  return url;
}

// ----------------------------- overpass -------------------------------
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function overpass(query) {
  let lastErr;
  for (const endpoint of OVERPASS) {
    assertNotGoogle(endpoint);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'User-Agent': UA },
          body: query,
        });
        if (res.status === 429 || res.status === 504) {
          console.warn(`  overpass ${res.status} from ${endpoint} — waiting 30s then retrying once`);
          await sleep(30000); lastErr = new Error('overpass ' + res.status); continue;
        }
        if (!res.ok) { lastErr = new Error('overpass HTTP ' + res.status); break; }
        return await res.json();
      } catch (e) { lastErr = e; await sleep(2000); }
    }
  }
  throw lastErr || new Error('overpass failed');
}

// --------------------------- geometry helpers -------------------------
function nodesOf(elements, pred) {
  return elements.filter(e => pred(e)).flatMap(e => e.geometry || []);
}
function segsOfName(elements, name) {
  const segs = [];
  for (const e of elements) if (e.tags?.name === name) {
    const g = e.geometry || [];
    for (let i = 0; i < g.length - 1; i++) segs.push([g[i], g[i + 1]]);
  }
  return segs;
}
// latitude of a named street interpolated at a given longitude (first bracketing segment)
function latAtLng(elements, name, lng) {
  for (const [a, b] of segsOfName(elements, name)) {
    if ((a.lon - lng) * (b.lon - lng) <= 0 && a.lon !== b.lon) {
      const t = (lng - a.lon) / (b.lon - a.lon);
      return a.lat + t * (b.lat - a.lat);
    }
  }
  return null;
}
function median(arr) { const s = [...arr].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; }
// polyline ∩ polyline (returns first intersection {lat,lon} or null)
function intersect(elements, nameA, nameB) {
  for (const [a, b] of segsOfName(elements, nameA))
    for (const [c, d] of segsOfName(elements, nameB)) {
      const r1x = b.lon - a.lon, r1y = b.lat - a.lat, r2x = d.lon - c.lon, r2y = d.lat - c.lat;
      const den = r1x * r2y - r1y * r2x; if (Math.abs(den) < 1e-13) continue;
      const t = ((c.lon - a.lon) * r2y - (c.lat - a.lat) * r2x) / den;
      const u = ((c.lon - a.lon) * r1y - (c.lat - a.lat) * r1x) / den;
      if (t >= -0.05 && t <= 1.05 && u >= -0.05 && u <= 1.05)
        return { lon: a.lon + t * r1x, lat: a.lat + t * r1y };
    }
  return null;
}

// ------------------------------ anchor --------------------------------
async function loadAnchorData(refresh) {
  if (!refresh && existsSync(ANCHOR_CACHE)) {
    try {
      const c = JSON.parse(readFileSync(ANCHOR_CACHE, 'utf-8'));
      if (Date.now() - c.fetchedAt < ANCHOR_TTL_MS) { console.log('  anchor: using cached lakefront query'); return c.elements; }
    } catch { /* refetch */ }
  }
  console.log('  anchor: querying Overpass for lakefront anchor streets (Belmont, Addison, Irving Park, LSD)');
  const [s, w, n, e] = ANCHOR_BBOX;
  const q = `[out:json][timeout:60];
(
  way["highway"]["name"="West Belmont Avenue"](${s},${w},${n},${e});
  way["highway"]["name"="West Addison Street"](${s},${w},${n},${e});
  way["highway"]["name"="West Irving Park Road"](${s},${w},${n},${e});
  way["highway"]["name"~"Lake Shore Drive"](${s},${w},${n},${e});
);
out geom;`;
  const j = await overpass(q);
  mkdirSync(REFS, { recursive: true });
  writeFileSync(ANCHOR_CACHE, JSON.stringify({ fetchedAt: Date.now(), bbox: ANCHOR_BBOX, elements: j.elements }));
  return j.elements;
}

function computeAnchor(el) {
  const belmont = nodesOf(el, e => e.tags?.name === 'West Belmont Avenue');
  const lsd = nodesOf(el, e => /Lake Shore Drive/.test(e.tags?.name || ''));
  if (!belmont.length) throw new Error('anchor: no Belmont Avenue geometry returned');
  if (!lsd.length) throw new Error('anchor: no Lake Shore Drive geometry returned');
  // lat0 = Belmont's straight/inland grid latitude (median of the western half of
  // nodes; the lake-bend of Belmont climbs ~60 m north and must not skew z=0).
  const bLngs = belmont.map(n => n.lon), bMid = (Math.min(...bLngs) + Math.max(...bLngs)) / 2;
  const lat0p = median(belmont.filter(n => n.lon < bMid).map(n => n.lat)) ?? median(belmont.map(n => n.lat));
  // LSD east edge longitude near Belmont's latitude = the max-longitude carriageway.
  const lsdNear = lsd.filter(n => Math.abs(n.lat - lat0p) < 0.0015);
  const lsdEast = (lsdNear.length ? lsdNear : lsd).reduce((a, b) => (b.lon > a.lon ? b : a));
  const lng0 = lsdEast.lon;
  // Reference meridian ~900 m inland (west of the LSD east edge) where the grid
  // streets are straight/undistorted; used for the assert representative points.
  const lngRef = lng0 - 0.011;
  const lat0 = latAtLng(el, 'West Belmont Avenue', lngRef) ?? lat0p;
  return { lat0, lng0, lngRef, lsdEast };
}

function projector(anchor, offset) {
  const cos0 = Math.cos(anchor.lat0 * Math.PI / 180);
  const dx = offset?.dx || 0, dz = offset?.dz || 0, shear = offset?.shear || 0;
  return (lat, lng) => {
    const mE = (lng - anchor.lng0) * cos0 * DEG_LNG;
    const mN = (lat - anchor.lat0) * DEG_LAT;
    let x = mE / SCALE, z = -mN / SCALE;
    x += shear * z + dx; z += dz;
    return [Math.round(x * 10) / 10, Math.round(z * 10) / 10];
  };
}

// LAKEFRONT asserts (true projection, no offset). Returns {asserts, pass}.
function runAsserts(el, anchor) {
  const proj = projector(anchor, null);
  const repLat = name => latAtLng(el, name, anchor.lngRef);
  const checks = [];
  const push = (name, gotXZ, axis, expected) => {
    const got = axis === 'z' ? gotXZ[1] : gotXZ[0];
    const delta = got - expected;
    checks.push({ name, axis, expected, got: Math.round(got * 10) / 10, delta: Math.round(delta * 10) / 10, pass: Math.abs(delta) <= ASSERT_TOL });
  };
  const bLat = repLat('West Belmont Avenue');
  const aLat = repLat('West Addison Street');
  const iLat = repLat('West Irving Park Road');
  if (bLat != null) push('Belmont Ave centerline', proj(bLat, anchor.lngRef), 'z', 0);
  if (aLat != null) push('Addison St centerline', proj(aLat, anchor.lngRef), 'z', -400);
  if (iLat != null) push('Irving Park Rd centerline', proj(iLat, anchor.lngRef), 'z', -800);
  // LSD east edge at the anchor latitude → x ≈ 0. (Confirms lng0 was derived from
  // the actual LSD east carriageway, not mis-set.)
  push('LSD east edge (lakefront)', proj(anchor.lsdEast.lat, anchor.lng0), 'x', 0);
  const pass = checks.every(c => c.pass);
  return { asserts: checks, pass };
}

// --------------------------- offset resolve ---------------------------
function resolveOffset(flags, area, targetEl, anchor) {
  if (flags['offset-dx'] != null || flags['offset-dz'] != null || flags['shear'] != null) {
    return { dx: +(flags['offset-dx'] || 0), dz: +(flags['offset-dz'] || 0), shear: +(flags['shear'] || 0),
             source: 'explicit --offset-dx/--offset-dz/--shear' };
  }
  const cal = area?.calibrate;
  if (!cal) return { dx: 0, dz: 0, shear: 0, source: 'none (true projection)' };
  const p = intersect(targetEl, cal.streetA, cal.streetB);
  if (!p) {
    console.warn(`  offset: calibration intersection ${cal.streetA} ∩ ${cal.streetB} not found — falling back to dx=0`);
    return { dx: 0, dz: 0, shear: 0, source: 'calibration failed (intersection missing)' };
  }
  const trueXZ = projector(anchor, null)(p.lat, p.lon);
  const dx = cal.targetX - trueXZ[0];
  const dz = cal.displaceZ ? cal.targetZ - trueXZ[1] : 0;
  return {
    dx: Math.round(dx * 10) / 10, dz: Math.round(dz * 10) / 10, shear: 0,
    source: 'auto-calibrated (displaced cell)',
    calibration: {
      landmark: `${cal.streetA} ∩ ${cal.streetB}`,
      real: { lat: +p.lat.toFixed(6), lng: +p.lon.toFixed(6) },
      trueProjected: { x: trueXZ[0], z: trueXZ[1] },
      target: { x: cal.targetX, z: cal.targetZ },
      cite: cal.cite,
      note: cal.displaceZ
        ? 'BOTH axes are cell-local (park-local frame): dx and dz move the whole area onto its displaced cell region. The true lakefront projection (z ≈ +3200 here) is NEVER a validation target for a displaced cell — the lakefront anchor asserts above validate only the projection math (PITFALLS.md).'
        : 'z is TRUE latitude; only x is displaced. Cell x is a documented standing liberty — never a validation target (PITFALLS.md).',
    },
  };
}

// ----------------------------- target fetch ---------------------------
async function fetchTarget(bbox) {
  const [s, w, n, e] = bbox;
  const b = `${s},${w},${n},${e}`;
  const q = `[out:json][timeout:90];
(
  way["natural"="coastline"](${b});
  way["natural"="water"](${b});
  relation["natural"="water"](${b});
  way["waterway"](${b});
  way["leisure"="park"](${b});
  way["leisure"="garden"](${b});
  way["leisure"="pitch"](${b});
  way["highway"](${b});
  way["building"](${b});
  way["leisure"="stadium"](${b});
  relation["leisure"="stadium"](${b});
  relation["building"](${b});
  relation["leisure"="park"](${b});
  relation["leisure"="garden"](${b});
  way["tourism"]["name"](${b});
  way["historic"]["name"](${b});
  way["amenity"="fountain"](${b});
  node["amenity"="fountain"]["name"](${b});
  node["natural"="peak"](${b});
  node["tourism"]["name"](${b});
  node["historic"]["name"](${b});
  node["leisure"]["name"](${b});
);
out geom;`;
  return (await overpass(q)).elements;
}

// Split a raw lat/lon polyline into runs of points inside bbox (+margin), so a
// giant relation member (e.g. all of Lake Michigan, 80k pts) contributes only
// its LOCAL shore near the target. margin keeps edge points that just leave bbox.
function clipRuns(geom, bbox, proj, margin = 0.0015) {
  const [s, w, n, e] = bbox;
  const inB = g => g.lat >= s - margin && g.lat <= n + margin && g.lon >= w - margin && g.lon <= e + margin;
  const runs = []; let cur = [];
  for (const g of geom) {
    if (inB(g)) cur.push(proj(g.lat, g.lon));
    else if (cur.length) { runs.push(cur); cur = []; }
  }
  if (cur.length) runs.push(cur);
  return runs.filter(r => r.length >= 2);
}

function classify(el, proj, bbox) {
  const out = { coastlines: [], water: [], waterways: [], highways: [], parks: [], buildings: [], landmarks: [], other: [] };
  const ids = [];
  const line = e => (e.geometry || []).map(g => proj(g.lat, g.lon));
  for (const e of el) {
    ids.push(e.type[0] + e.id);
    const t = e.tags || {};
    if (e.type === 'node') {
      if (t.name && (t.tourism || t.historic || t.leisure || t.natural || t.amenity === 'fountain'))
        out.landmarks.push({ id: e.id, name: t.name, tags: t, xz: proj(e.lat, e.lon) });
      continue;
    }
    if (e.type === 'relation') {
      // water bodies (Lake Michigan, Belmont Harbor) — member ways are the shore
      // edge. Clip each member to the bbox so the local shoreline is captured.
      if (t.natural === 'water' || t.water) {
        for (const m of e.members || []) {
          if (!m.geometry) continue;
          for (const run of clipRuns(m.geometry, bbox, proj))
            out.water.push({ id: e.id, name: t.name, role: m.role, tags: t, points: run });
        }
      }
      // stadium / building relations (Wrigley Field is a relation, not a way):
      // outer members carry the footprint the builders cite.
      if (t.leisure === 'stadium' || t.building) {
        for (const m of e.members || []) {
          if (!m.geometry || m.role === 'inner') continue;
          for (const run of clipRuns(m.geometry, bbox, proj))
            out.buildings.push({ id: e.id, name: t.name, role: m.role, tags: t, points: run });
        }
      }
      // park / garden relations (Millennium Park and Lurie Garden are relations):
      // outer members carry the boundary.
      if (t.leisure === 'park' || t.leisure === 'garden') {
        for (const m of e.members || []) {
          if (!m.geometry || m.role === 'inner') continue;
          for (const run of clipRuns(m.geometry, bbox, proj))
            out.parks.push({ id: e.id, name: t.name, role: m.role, tags: t, points: run });
        }
      }
      continue;
    }
    const pts = line(e);
    if (!pts.length) continue;
    const rec = { id: e.id, name: t.name, tags: t, points: pts };
    if (t.natural === 'coastline') out.coastlines.push(rec);
    else if (t.natural === 'water' || t.water) out.water.push(rec);
    else if (t.waterway) out.waterways.push(rec);
    else if (t.highway) out.highways.push({ ...rec, highway: t.highway });
    else if (t.leisure === 'park' || t.leisure === 'garden') out.parks.push(rec);
    else if (t.building || t.leisure === 'stadium') out.buildings.push(rec);
    else if (t.tourism || t.historic || t.amenity === 'fountain') out.landmarks.push(rec);
    else out.other.push(rec);
  }
  return { features: out, ids };
}

// -------------------------------- main --------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const poi = args._[0];
  if (!poi) { console.error('usage: node tools/osm-fetch.mjs <poi-slug> --bbox <s,w,n,e> [--offset-dx n] [--shear n]\n       node tools/osm-fetch.mjs <named-area>'); process.exit(2); }

  // Resolve area preset + bbox.
  const areaName = args.flags.area || poi;
  const area = AREAS[areaName] || null;
  let bbox;
  if (args.flags.bbox) bbox = args.flags.bbox.split(',').map(Number);
  else if (area) bbox = area.bbox;
  else { console.error(`no --bbox given and "${areaName}" is not a named area (${Object.keys(AREAS).join(', ')})`); process.exit(2); }
  if (bbox.length !== 4 || bbox.some(Number.isNaN)) { console.error('--bbox must be s,w,n,e'); process.exit(2); }

  console.log(`osm-fetch: poi="${poi}" bbox=[${bbox.join(',')}]${area ? ' area="' + areaName + '"' : ''}`);

  // 1) Anchor + LAKEFRONT asserts (every fetch).
  const anchorEl = await loadAnchorData(args.flags['refresh-anchor']);
  const anchor = computeAnchor(anchorEl);
  console.log(`  anchor: lat0=${anchor.lat0.toFixed(6)} lng0=${anchor.lng0.toFixed(6)} (Belmont grid ∩ LSD east edge)`);
  const { asserts, pass } = runAsserts(anchorEl, anchor);
  console.log('  LAKEFRONT asserts (true projection, ±10 game units):');
  for (const c of asserts) console.log(`    [${c.pass ? 'PASS' : 'FAIL'}] ${c.name.padEnd(28)} ${c.axis}=${c.got} (want ${c.expected}, Δ${c.delta})`);
  if (!pass) {
    console.error('\nPROJECTION MISCALIBRATED — refusing to emit osm.json. Numbered failures:');
    let i = 0;
    for (const c of asserts) if (!c.pass) console.error(`  ${++i}. ${c.name}: ${c.axis}=${c.got}, expected ${c.expected} (Δ${c.delta}, tol ±${ASSERT_TOL})`);
    process.exit(1);
  }

  // 2) Target area fetch.
  console.log('  fetching target area geometry (coastline/water/highway/park/building/landmarks)…');
  const targetEl = await fetchTarget(bbox);
  console.log(`  target: ${targetEl.length} OSM elements`);

  // 3) Offset (displaced cells) + projection.
  const offset = resolveOffset(args.flags, area, targetEl, anchor);
  if (offset.dx || offset.shear) console.log(`  offset: dx=${offset.dx} shear=${offset.shear} (${offset.source})`);
  const proj = projector(anchor, offset);
  const { features, ids } = classify(targetEl, proj, bbox);
  const counts = Object.fromEntries(Object.entries(features).map(([k, v]) => [k, v.length]));
  console.log('  projected feature counts:', JSON.stringify(counts));

  if (args.flags['no-emit']) { console.log('  --no-emit: asserts passed; skipping write.'); return; }

  // 4) Emit refs/<poi>/osm.json (REFERENCE ONLY).
  const outDir = join(REFS, poi);
  mkdirSync(outDir, { recursive: true });
  const doc = {
    _README: 'REFERENCE DATA ONLY — do not import at runtime or build. Builders hand-write coords into GEOGRAPHY.md (first) then src/data/*.js, citing this file. OSM © OpenStreetMap contributors, ODbL.',
    poi, area: area ? areaName : null, bbox,
    generated: new Date().toISOString(),
    tool: 'tools/osm-fetch.mjs',
    projection: {
      frame: 'game: +z=south, lake=east=+x, 1:2 real distance, 1 unit=1 m',
      formula: 'x = ((lng-lng0)·cos(lat0)·111320)/2 + shear·z + dx ; z = -((lat-lat0)·110540)/2 + dz',
      anchor: { lat0: anchor.lat0, lng0: anchor.lng0, description: 'Belmont Ave centerline (grid) ∩ Lake Shore Drive east edge = game (0,0), derived from OSM' },
      offset,
    },
    lakefrontAsserts: asserts,
    features,
    provenance: {
      overpass: OVERPASS[0],
      fetchTimestamp: new Date().toISOString(),
      anchorBbox: ANCHOR_BBOX,
      counts,
      osmElementIds: ids,
      attribution: '© OpenStreetMap contributors, licensed under ODbL (queue task 001).',
    },
  };
  const file = join(outDir, 'osm.json');
  writeFileSync(file, JSON.stringify(doc), 'utf-8');
  console.log(`  EMITTED ${file} (${ids.length} elements, ${(JSON.stringify(doc).length / 1024).toFixed(0)} kB)`);
}

main().catch(e => { console.error('osm-fetch error:', e.message); process.exit(1); });
