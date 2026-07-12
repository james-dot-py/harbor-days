// tmp: survey refs/millennium-park/osm-grant.json (task 057 scout).
// Lists named features + medians of the frame streets + full geometry dumps
// for the layout-critical items (BP bridge S-curve, Maggie Daley internals,
// Art Institute block, Butler Field, Nichols Bridgeway).
import { readFileSync } from 'fs';
const doc = JSON.parse(readFileSync('refs/millennium-park/osm-grant.json', 'utf8'));
const F = doc.features;
const all = [...F.highways, ...F.parks, ...F.buildings, ...F.landmarks, ...F.water, ...F.other];

const bboxOf = pts => {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return [x0, x1, z0, z1].map(v => Math.round(v * 10) / 10);
};
const med = a => { const s = [...a].sort((p, q) => p - q); return s.length ? s[Math.floor(s.length / 2)] : null; };

const mode = process.argv[2] || 'summary';

if (mode === 'summary') {
  // ---- frame street medians (x for N-S streets, z for E-W) ----
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
    console.log(`  ${w.name || '(unnamed)'} id ${w.id} bbox ${JSON.stringify(bboxOf(w.points))}`);
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
  // full point dumps for layout-critical ids passed as args
  const ids = process.argv.slice(3).map(Number);
  for (const id of ids) {
    for (const f of all) if (f.id === id && f.points) {
      console.log(`--- id ${id} (${f.name || 'unnamed'}) ${f.points.length} pts ---`);
      console.log(JSON.stringify(f.points));
    }
  }
}

if (mode === 'unnamed-leisure') {
  // unnamed playgrounds / tracks / rinks / pitches (Maggie Daley internals)
  for (const p of F.parks)
    console.log(`  [${p.tags?.leisure}${p.tags?.sport ? '/' + p.tags.sport : ''}] ${p.name || '(unnamed)'} id ${p.id} bbox ${JSON.stringify(bboxOf(p.points))} (${p.points.length} pts)`);
}

if (mode === 'footways') {
  // bridges + named footways (BP bridge, Nichols, ribbon-as-path?)
  for (const h of F.highways) {
    const t = h.tags || {};
    if (t.bridge || (t.highway === 'footway' && h.name))
      console.log(`  ${h.name || '(unnamed)'} id ${h.id} hwy=${t.highway} bridge=${t.bridge || ''} bbox ${JSON.stringify(bboxOf(h.points))} (${h.points.length} pts)`);
  }
}

if (mode === 'buildings-at') {
  // buildings intersecting a bbox: x0 x1 z0 z1
  const [x0, x1, z0, z1] = process.argv.slice(3).map(Number);
  for (const b of F.buildings) {
    const [bx0, bx1, bz0, bz1] = bboxOf(b.points);
    if (bx1 < x0 || bx0 > x1 || bz1 < z0 || bz0 > z1) continue;
    console.log(`  ${b.name || '(unnamed)'} id ${b.id} bbox [${bx0},${bx1},${bz0},${bz1}] tags ${JSON.stringify(b.tags)} (${b.points.length} pts)`);
  }
}
