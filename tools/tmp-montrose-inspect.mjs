// tmp: survey refs/montrose/osm.json (task 067 scout).
// Named features + street medians + ORDERED geometry dumps for layout-critical
// items (harbor basin, hook pier, Point, beach, dunes, Cricket Hill, LSD drift).
// Endpoints are first/last NODES of the ordered way, never bbox corners (PITFALLS).
import { readFileSync } from 'fs';
const doc = JSON.parse(readFileSync('refs/montrose/osm.json', 'utf8'));
const F = doc.features;
const all = [...F.highways, ...F.parks, ...F.buildings, ...F.landmarks, ...F.water, ...F.other, ...F.waterways];

const bboxOf = pts => {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return [x0, x1, z0, z1].map(v => Math.round(v * 10) / 10);
};
const med = a => { const s = [...a].sort((p, q) => p - q); return s.length ? s[Math.floor(s.length / 2)] : null; };

const mode = process.argv[2] || 'summary';

if (mode === 'prov') {
  console.log('top-level keys:', Object.keys(doc));
  for (const k of ['provenance', 'meta', 'origin', 'transform', 'header', 'bbox', 'frame']) {
    if (doc[k] !== undefined) console.log(`${k}:`, JSON.stringify(doc[k], null, 1).slice(0, 2000));
  }
  console.log('feature buckets:', Object.fromEntries(Object.entries(doc.features).map(([k, v]) => [k, v.length])));
}

if (mode === 'summary') {
  const streets = {};
  for (const h of F.highways) {
    if (!h.name) continue;
    (streets[h.name] = streets[h.name] || []).push(...h.points);
  }
  console.log('=== named street medians (game coords) ===');
  for (const [name, pts] of Object.entries(streets).sort()) {
    const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
    const [x0, x1, z0, z1] = bboxOf(pts);
    const ori = (x1 - x0) > (z1 - z0) ? 'E-W' : 'N-S';
    const m = ori === 'E-W' ? 'z~' + Math.round(med(zs)) : 'x~' + Math.round(med(xs));
    console.log(`  ${name}  [${ori}] ${m}  bbox x ${x0}..${x1}, z ${z0}..${z1}  (${pts.length} pts)`);
  }
  console.log('\n=== named parks/gardens/pitches ===');
  for (const p of F.parks) if (p.name || p.tags?.leisure)
    console.log(`  ${p.name || '(unnamed)'} [${p.tags?.leisure || '?'}${p.tags?.sport ? '/' + p.tags.sport : ''}] id ${p.id} bbox ${JSON.stringify(bboxOf(p.points))} (${p.points.length} pts)`);
  console.log('\n=== named buildings ===');
  for (const b of F.buildings) if (b.name)
    console.log(`  ${b.name} id ${b.id} bbox ${JSON.stringify(bboxOf(b.points))} (${b.points.length} pts)`);
  console.log('\n=== landmarks ===');
  for (const l of F.landmarks)
    console.log(`  ${l.name || '(unnamed)'} id ${l.id} ${l.xz ? '@ ' + JSON.stringify(l.xz) : 'bbox ' + JSON.stringify(bboxOf(l.points))} tags ${JSON.stringify(l.tags)}`);
  console.log('\n=== water ===');
  for (const w of F.water)
    console.log(`  ${w.name || '(unnamed)'} id ${w.id} role ${w.role || ''} bbox ${JSON.stringify(bboxOf(w.points))} (${w.points.length} pts)`);
  console.log('\n=== waterways ===');
  for (const w of F.waterways)
    console.log(`  ${w.name || '(unnamed)'} id ${w.id} bbox ${JSON.stringify(bboxOf(w.points))} tags ${JSON.stringify(w.tags)}`);
  console.log('\n=== other ===');
  for (const o of F.other)
    console.log(`  ${o.name || '(unnamed)'} id ${o.id} bbox ${JSON.stringify(bboxOf(o.points))} tags ${JSON.stringify(o.tags)}`);
}

if (mode === 'find') {
  const re = new RegExp(process.argv[3], 'i');
  for (const f of all) if (re.test(f.name || '') || re.test(JSON.stringify(f.tags || {})))
    console.log(`  ${f.name || '(unnamed)'} id ${f.id} tags ${JSON.stringify(f.tags)} ${f.points ? '(' + f.points.length + ' pts) bbox ' + JSON.stringify(bboxOf(f.points)) : '@ ' + JSON.stringify(f.xz)}`);
}

if (mode === 'geom') {
  const ids = process.argv.slice(3).map(Number);
  for (const id of ids) {
    for (const f of all) if (f.id === id && f.points) {
      console.log(`--- id ${id} (${f.name || 'unnamed'}${f.role ? ' role=' + f.role : ''}) ${f.points.length} pts; FIRST ${JSON.stringify(f.points[0])} LAST ${JSON.stringify(f.points[f.points.length - 1])} ---`);
      console.log(JSON.stringify(f.points));
    }
  }
}

if (mode === 'lsd') {
  // LSD carriageway drift: for each named LSD way, list points bucketed by z
  for (const h of F.highways) {
    if (!/Lake Shore Drive/i.test(h.name || '')) continue;
    const [x0, x1, z0, z1] = bboxOf(h.points);
    console.log(`  id ${h.id} ${h.tags?.oneway || ''} lanes=${h.tags?.lanes || '?'} bbox x ${x0}..${x1}, z ${z0}..${z1} (${h.points.length} pts) first ${JSON.stringify(h.points[0])} last ${JSON.stringify(h.points[h.points.length - 1])}`);
  }
}

if (mode === 'lsdx') {
  // east edge of the Drive (max x of any LSD/Marine-Drive carriageway) per 50-unit z bin
  const bins = {};
  for (const h of F.highways) {
    if (!/Lake Shore Drive|Marine Drive/i.test(h.name || '')) continue;
    for (const [x, z] of h.points) {
      const b = Math.round(z / 50) * 50;
      if (!(b in bins) || x > bins[b]) bins[b] = x;
    }
  }
  for (const b of Object.keys(bins).map(Number).sort((a, c) => c - a))
    console.log(`  z ${b}: LSD/Marine east edge x = ${bins[b].toFixed(1)}`);
}

if (mode === 'trace') {
  // every Nth point of a way: trace <id> [N]
  const id = Number(process.argv[3]), N = Number(process.argv[4] || 4);
  for (const f of all) if (f.id === id && f.points) {
    console.log(`--- id ${id} (${f.name || 'unnamed'}${f.role ? ' role=' + f.role : ''}) ${f.points.length} pts ---`);
    const out = f.points.filter((_, i) => i % N === 0 || i === f.points.length - 1);
    console.log(out.map(p => `(${p[0]},${p[1]})`).join(' '));
  }
}

if (mode === 'grep') {
  const s = JSON.stringify(doc);
  for (const w of process.argv.slice(3)) {
    const m = s.match(new RegExp(w, 'gi'));
    console.log(w.padEnd(20), m ? m.length : 0);
  }
}

if (mode === 'piers') {
  // man_made piers / breakwaters / groynes live in "other" or highways
  for (const f of all) {
    const t = f.tags || {};
    if (t.man_made || /pier|breakwater|groyne|mole/i.test(JSON.stringify(t)))
      console.log(`  ${f.name || '(unnamed)'} id ${f.id} tags ${JSON.stringify(t)} ${f.points ? '(' + f.points.length + ' pts) bbox ' + JSON.stringify(bboxOf(f.points)) : ''}`);
  }
}
