// mp-inspect.mjs — one-off scout inspection of refs/millennium-park/osm.json
// (task 039). Prints the applied offset provenance, every named feature with a
// representative park-local coordinate, and the frame landing of the four
// boundary streets. Not part of the build; safe to delete.
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const j = JSON.parse(readFileSync(join(__dir, '..', 'refs', 'millennium-park', 'osm.json'), 'utf-8'));

console.log('offset:', JSON.stringify(j.projection.offset, null, 2));

const mid = pts => pts[Math.floor(pts.length / 2)];
const seen = new Map();
for (const k of Object.keys(j.features)) {
  for (const f of j.features[k]) {
    if (!f.name) continue;
    const xz = f.xz || mid(f.points || []);
    const key = k + ' :: ' + f.name;
    if (!seen.has(key)) seen.set(key, xz);
  }
}
for (const [k, xz] of [...seen.entries()].sort()) console.log(k.padEnd(72), JSON.stringify(xz));

// anchor-feature footprint dumps (bounds + point counts + type/tags)
const WANT = ['Jay Pritzker Pavilion', 'Cloud Gate', 'Crown Fountain', 'Millennium Monument', 'Lurie Garden', 'Millennium Park', 'Harris Theater'];
for (const k of Object.keys(j.features)) for (const f of j.features[k]) {
  if (!WANT.some(w => (f.name || '').includes(w))) continue;
  const pts = f.points || (f.xz ? [f.xz] : []);
  const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  console.log(`ANCHOR [${k}] id=${f.id} role=${f.role || '-'} "${f.name}" pts=${pts.length} x ${Math.min(...xs)}..${Math.max(...xs)} z ${Math.min(...zs)}..${Math.max(...zs)} tags=${JSON.stringify(f.tags || {}).slice(0, 220)}`);
}

// bridge-tagged ways (the BP serpentine crosses Columbus x≈195 unnamed?) + squares/plazas
for (const h of j.features.highways) {
  const t = h.tags || {};
  if (t.bridge === 'yes' || /bridge/i.test(t.man_made || '')) {
    const xs = h.points.map(p => p[0]), zs = h.points.map(p => p[1]);
    console.log(`bridgeway id=${h.id} name=${h.name || '(unnamed)'} hw=${t.highway} x ${Math.min(...xs)}..${Math.max(...xs)} z ${Math.min(...zs)}..${Math.max(...zs)} (${h.points.length} pts)`);
  }
}
for (const k of Object.keys(j.features)) for (const f of j.features[k]) {
  const t = f.tags || {};
  if (t.place === 'square' || t.leisure === 'common' || /plaza|square|lawn/i.test(t.name || ''))
    console.log(`square/plaza [${k}] id=${f.id} name=${f.name || '(unnamed)'} tags=${JSON.stringify(t)} at ${JSON.stringify(f.xz || mid(f.points || []))}`);
}

// boundary street landings (median z of E-W streets, median x of N-S streets)
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
for (const [name, axis] of [['South Michigan Avenue', 0], ['North Michigan Avenue', 0], ['South Columbus Drive', 0], ['North Columbus Drive', 0], ['East Randolph Street', 1], ['East Monroe Street', 1], ['East Madison Street', 1], ['East Washington Street', 1]]) {
  const vals = [];
  for (const h of j.features.highways) if (h.name === name) for (const p of h.points) vals.push(p[axis]);
  if (vals.length) console.log(`street ${name.padEnd(26)} ${axis ? 'z' : 'x'} median = ${med(vals)}  (n=${vals.length})`);
}
