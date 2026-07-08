// Temp: unlink files passed as args (sandbox misparses in-repo rm on Windows).
import { unlinkSync } from 'fs';
import { resolve } from 'path';
for (const f of process.argv.slice(2)) {
  const p = resolve(f);
  if (!p.startsWith(resolve('.'))) { console.error('refusing outside repo: ' + p); process.exit(1); }
  unlinkSync(p); console.log('removed ' + p);
}
