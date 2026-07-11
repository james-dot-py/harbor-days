// mp-manifest-prune.mjs — remove culled reference images from a refs manifest
// (task 039 scout hygiene). Usage:
//   node tools/mp-manifest-prune.mjs <poi> <file> [<file> ...]
// Deletes each named file from refs/<poi>/ if present and drops its manifest
// entry, so the committed manifest never claims images that were culled as
// junk (wrong city, duplicates, off-topic).
import { readFileSync, writeFileSync, existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const [poi, ...files] = process.argv.slice(2);
if (!poi || !files.length) { console.error('usage: node tools/mp-manifest-prune.mjs <poi> <file> [...]'); process.exit(2); }

const dir = join(__dir, '..', 'refs', poi);
const manFile = join(dir, 'manifest.json');
const man = JSON.parse(readFileSync(manFile, 'utf-8'));
const before = man.images.length;
for (const f of files) {
  const p = join(dir, f);
  if (existsSync(p)) { rmSync(p); console.log('deleted ' + f); }
  man.images = man.images.filter(e => e.file !== f);
}
writeFileSync(manFile, JSON.stringify(man, null, 2), 'utf-8');
console.log(`manifest: ${before} -> ${man.images.length} entries`);
