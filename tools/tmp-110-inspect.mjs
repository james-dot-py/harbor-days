// tmp: survey refs/lincoln-park/osm.json (task 110 scout).
// Named features + street medians + ORDERED geometry dumps + the WEST-REACH
// measurement at a latitude line (Fullerton) for 111's compression ruling.
// Endpoints are first/last NODES of the ordered way, never bbox corners (PITFALLS).
import { readFileSync } from 'fs';
const doc = JSON.parse(readFileSync('refs/lincoln-park/osm.json', 'utf8'));
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
  console.log('projection:', JSON.stringify(doc.projection, null, 1));
  console.log('lakefrontAsserts:', JSON.stringify(doc.lakefrontAsserts));
  console.log('feature buckets:', Object.fromEntries(Object.entries(doc.features).map(([k, v]) => [k, v.length])));
  console.log('bbox:', JSON.stringify(doc.bbox), 'generated:', doc.generated, 'tool:', doc.tool);
  console.log('provenance:', JSON.stringify(doc.provenance, null, 1));
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
  console.log('\n=== named parks/gardens/reserves ===');
  for (const p of F.parks) if (p.name)
    console.log(`  ${p.name} [${p.tags?.leisure || p.tags?.natural || p.tags?.boundary || '?'}] id ${p.id} bbox ${JSON.stringify(bboxOf(p.points))} (${p.points.length} pts)`);
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

if (mode === 'trace') {
  // every Nth point of a way: trace <id> [N]
  const id = Number(process.argv[3]), N = Number(process.argv[4] || 4);
  for (const f of all) if (f.id === id && f.points) {
    console.log(`--- id ${id} (${f.name || 'unnamed'}${f.role ? ' role=' + f.role : ''}) ${f.points.length} pts ---`);
    const out = f.points.filter((_, i) => i % N === 0 || i === f.points.length - 1);
    console.log(out.map(p => `(${p[0]},${p[1]})`).join(' '));
  }
}

if (mode === 'westreach') {
  // x of every matching N-S way interpolated at latitude line z = argv[3]
  // (segment-bracket interpolation, the latAtLng pattern in game coords).
  const zLine = Number(process.argv[3] || 805);
  const re = new RegExp(process.argv[4] || 'Lake Shore|Cannon|Stockton|Clark|Lincoln Park West', 'i');
  const hits = {};
  for (const h of F.highways) {
    if (!re.test(h.name || '')) continue;
    const pts = h.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const [xa, za] = pts[i], [xb, zb] = pts[i + 1];
      if ((za - zLine) * (zb - zLine) <= 0 && za !== zb) {
        const t = (zLine - za) / (zb - za);
        const x = xa + t * (xb - xa);
        (hits[h.name] = hits[h.name] || []).push({ x: Math.round(x * 10) / 10, id: h.id, hwy: h.tags?.highway });
      }
    }
  }
  console.log(`=== x at z=${zLine} (game units; true projection) ===`);
  for (const [name, arr] of Object.entries(hits).sort((a, b) => Math.min(...a[1].map(v => v.x)) - Math.min(...b[1].map(v => v.x)))) {
    const xs = arr.map(v => v.x).sort((a, b) => a - b);
    console.log(`  ${name}: x ${xs.join(', ')}  (${arr.length} crossings)`);
  }
}

if (mode === 'grep') {
  const s = JSON.stringify(doc);
  for (const w of process.argv.slice(3)) {
    const m = s.match(new RegExp(w, 'gi'));
    console.log(w.padEnd(28), m ? m.length : 0);
  }
}
