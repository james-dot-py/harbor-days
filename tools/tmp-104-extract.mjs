// tmp-104: write HEAD's chicago.js to tools/tmp/old-chicago-104.mjs for gate calibration
import { execFileSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync(new URL('./tmp/', import.meta.url), { recursive: true });
const src = execFileSync('git', ['show', 'HEAD:src/data/chicago.js'], { encoding: 'utf8', maxBuffer: 1 << 24 });
writeFileSync(new URL('./tmp/old-chicago-104.mjs', import.meta.url), src);
console.log('wrote tools/tmp/old-chicago-104.mjs', src.length, 'bytes');
