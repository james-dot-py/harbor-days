// Fan the source art (assets/icon.png + assets/splash*.png, from
// tools/gen-ios-assets.mjs) into the iOS AppIcon + Splash asset catalogs
// (task 083). Idempotent; re-run after regenerating the source art.
// Usage: node tools/cap-assets.mjs   (requires ios/ to exist — run cap-bootstrap first)
import { execSync } from 'child_process';
const args = [
  'generate', '--ios',
  '--assetPath', 'assets',
  '--iconBackgroundColor', '#ffb98a',
  '--iconBackgroundColorDark', '#ffb98a',
  '--splashBackgroundColor', '#ffb98a',
  '--splashBackgroundColorDark', '#5a3238',
];
console.log('[cap-assets] capacitor-assets ' + args.join(' '));
execSync(`npx --no-install capacitor-assets ${args.join(' ')}`, { stdio: 'inherit', shell: true });
