// tmp-104: dump montrose osm.json provenance + key feature geometry (breakwater,
// harbor water, point) to calibrate the osm->game frame for the spit fix.
import { readFileSync } from 'fs';
const j = JSON.parse(readFileSync('refs/montrose/osm.json', 'utf8'));
console.log('provenance:', JSON.stringify(j.provenance, null, 1));
console.log('bbox:', JSON.stringify(j.bbox));
console.log('lakefrontAsserts:', JSON.stringify(j.lakefrontAsserts).slice(0, 600));

const cats = j.features;
const all = Object.entries(cats).flatMap(([c, a]) => a.map(f => ({ ...f, _cat: c })));
const ext = f => {
  const xs = f.points.map(p => p[0]), zs = f.points.map(p => p[1]);
  return `x ${Math.min(...xs).toFixed(1)}..${Math.max(...xs).toFixed(1)} z ${Math.min(...zs).toFixed(1)}..${Math.max(...zs).toFixed(1)} (${f.points.length} pts)`;
};
for (const f of all) {
  const t = f.tags || {};
  const name = f.name || t.name || '';
  if (t.man_made === 'breakwater' || /breakwater/i.test(name)) {
    console.log(`BW [${f.id}] ${name} | ${JSON.stringify(t)} | ${ext(f)}`);
  }
}
for (const f of cats.water) console.log(`WATER [${f.id}] ${f.name || (f.tags||{}).name || ''} | ${ext(f)}`);
const pt = all.find(f => f.id === 23946659);
console.log('POINT sanctuary:', ext(pt));
// full polyline of the named breakwater + the long stone one
for (const id of [479527712, 949455887, 949455886, 949455884]) {
  const f = all.find(x => x.id === id);
  if (f) console.log(`\n[${id}] ${(f.tags||{}).name||''} ${JSON.stringify(f.tags)}\n  pts:`, JSON.stringify(f.points.filter((_, i) => i % Math.ceil(f.points.length / 24) === 0)));
}
