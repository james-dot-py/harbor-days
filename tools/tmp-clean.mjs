// Temp: remove files OR directories passed as args (sandbox misparses in-repo
// rm on Windows). Recursive so superseded tools/shots/run-* dirs can be pruned.
import { rmSync } from 'fs';
import { resolve } from 'path';
for (const f of process.argv.slice(2)) {
  const p = resolve(f);
  if (!p.startsWith(resolve('.'))) { console.error('refusing outside repo: ' + p); process.exit(1); }
  rmSync(p, { recursive: true, force: true }); console.log('removed ' + p);
}
