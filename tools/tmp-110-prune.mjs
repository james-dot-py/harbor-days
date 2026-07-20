// tmp (task 110): prune wrong-subject junk from refs/lincoln-park + reconcile
// manifest, then report files-on-disk vs manifest entries (case-collision audit,
// PITFALLS). "State-Lake Theater" is a downtown movie house, NOT the Lincoln
// Park "Theater on the Lake" venue — the query mis-fired (montrose SCOTLAND-dunes
// precedent).
import { readFileSync, writeFileSync, unlinkSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
const DIR = 'refs/lincoln-park';
const JUNK = [
  'State_Lake_Theater_Chicago.jpg',
  'Lady_and_the_Tramp_State_Lake_Theater.jpg',
  'Lady_and_the_Tramp_State_Lake_Theater,_1955.png',
];
const manPath = join(DIR, 'manifest.json');
const man = JSON.parse(readFileSync(manPath, 'utf8'));
for (const f of JUNK) {
  const p = join(DIR, f);
  if (existsSync(p)) { unlinkSync(p); console.log('deleted', f); }
  else console.log('(already gone)', f);
}
man.images = man.images.filter(e => !JUNK.includes(e.file));
writeFileSync(manPath, JSON.stringify(man, null, 2));
// audit: files on disk vs manifest entries
const onDisk = readdirSync(DIR).filter(f => /\.(jpe?g|png)$/i.test(f));
const inMan = new Set(man.images.map(e => e.file));
const orphanFiles = onDisk.filter(f => !inMan.has(f));      // file with no manifest entry
const missingFiles = [...inMan].filter(f => !onDisk.includes(f)); // manifest entry, no file (case-collision)
console.log('\nfiles on disk:', onDisk.length, ' manifest entries:', man.images.length);
console.log('orphan files (no manifest entry):', JSON.stringify(orphanFiles));
console.log('missing files (manifest entry, no file — case-collision):', JSON.stringify(missingFiles));
