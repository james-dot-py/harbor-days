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
// Quote the color values: unquoted, bash on the macOS CI runner reads '#...'
// as a comment and the flag loses its argument (cmd on Windows does not).
const quoted = args.map(a => a.startsWith('#') ? '"' + a + '"' : a);
console.log('[cap-assets] capacitor-assets ' + quoted.join(' '));
execSync(`npx --no-install capacitor-assets ${quoted.join(' ')}`, { stdio: 'inherit', shell: true });
