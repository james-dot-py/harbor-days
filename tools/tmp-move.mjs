// Temp: rename/move files passed as (src, dst) pairs — sandbox misparses
// in-repo mv on Windows (same trap as rm; see PITFALLS-adjacent memory).
import { renameSync } from 'fs';
import { resolve } from 'path';
const [src, dst] = process.argv.slice(2).map(p => resolve(p));
for (const p of [src, dst]) if (!p.startsWith(resolve('.'))) { console.error('refusing outside repo: ' + p); process.exit(1); }
renameSync(src, dst);
console.log('moved ' + src + ' -> ' + dst);
