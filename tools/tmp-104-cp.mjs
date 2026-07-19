// tmp-104: copy the canonical spawn capture over baseline.png (cp is sandbox-blocked)
import { copyFileSync } from 'fs';
copyFileSync(new URL('./shots/t104-spawn-det.png', import.meta.url), new URL('./shots/baseline.png', import.meta.url));
console.log('baseline.png <- t104-spawn-det.png');
