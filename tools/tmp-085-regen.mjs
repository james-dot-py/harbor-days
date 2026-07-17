import { copyFileSync } from 'fs';
copyFileSync('tools/shots/verify-spawn.png', 'tools/shots/baseline.png');
console.log('baseline.png regenerated from verify-spawn.png (play=1&quiet=1 @3500ms, canary vs085, gear button included)');
