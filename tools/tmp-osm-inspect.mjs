// Temp inspector for refs/<poi>/osm.json — prints structure, provenance, and
// named features matching an optional filter. Usage:
//   node tools/tmp-osm-inspect.mjs refs/wrigleyville/osm.json [nameFilter]
import { readFileSync } from 'fs';

const [, , path, filter, dumpIdx] = process.argv;
const j = JSON.parse(readFileSync(path, 'utf8'));
if (!filter) {
  console.log('top-level keys:', Object.keys(j));
  console.log('projection:', JSON.stringify(j.projection, null, 1).slice(0, 2000));
  console.log('_README:', JSON.stringify(j._README).slice(0, 1500));
}

let feats = j.features || j.elements || [];
if (!Array.isArray(feats)) {
  console.log('features keys:', Object.keys(feats).map(k => `${k}(${(feats[k] || []).length})`).join(' '));
  feats = Object.entries(feats).flatMap(([cat, arr]) =>
    (Array.isArray(arr) ? arr : []).map(f => ({ ...f, _cat: cat })));
}
console.log('feature count:', feats.length);
// bbox mode: filter = "bbox:x0,x1,z0,z1" keeps features with any point inside
let bbox = null;
if (filter && filter.startsWith('bbox:')) bbox = filter.slice(5).split(',').map(Number);
feats.forEach((f, i) => {
  if (bbox) {
    const pts = f.points || (f.xz ? [f.xz] : []);
    const [x0, x1, z0, z1] = bbox;
    if (!pts.some(([x, z]) => x >= x0 && x <= x1 && z >= z0 && z <= z1)) return;
  } else {
    const hay = JSON.stringify(f).toLowerCase();
    if (filter && !hay.includes(filter.toLowerCase())) return;
  }
  if (dumpIdx !== undefined) {
    if (i === +dumpIdx) console.log(JSON.stringify(f, null, 1));
    return;
  }
  const p = f.properties || f.tags || {};
  const name = p.name || f.name || p.ref || '';
  const kind = p.building || p.leisure || p.amenity || p.shop || p.highway || p.railway || f.type || f._cat || '';
  const keys = Object.keys(f).join(',');
  console.log(`[${i}] ${f._cat || ''} | ${name} | ${kind} | keys:${keys} | ${JSON.stringify(f).slice(0, 260)}`);
});
