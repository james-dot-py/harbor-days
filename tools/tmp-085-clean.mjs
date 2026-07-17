import { existsSync, unlinkSync } from 'fs';
for (const f of ['tools/shots/spawn-b.png']) {
  if (existsSync(f)) { unlinkSync(f); console.log('removed', f); }
}
