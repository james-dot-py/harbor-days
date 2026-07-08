// serve.mjs — spawn a Vite dev server for THIS checkout and print the parsed
// port. Tools default to PORT 5173, which an interactive session may own
// (PITFALLS.md) — shot.mjs/act.mjs against a foreign server screenshot the
// wrong game. Run this in the background, read "PORT <n>" from its output,
// then pass PORT=<n> to shot/act. Canary-check every shot regardless.
// Usage: node tools/serve.mjs [--port 5199]   (stays alive until killed)
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const i = process.argv.indexOf('--port');
const portArgs = i > 0 ? ['--port', process.argv[i + 1], '--strictPort'] : [];
const vite = spawn(process.execPath,
  [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), ...portArgs], { cwd: root });
vite.stdout.on('data', d => {
  // strip ANSI color codes — vite prints them mid-URL (localhost:\x1b[1m5175)
  const m = d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/);
  if (m) console.log('PORT ' + m[1]);
});
vite.stderr.on('data', d => process.stderr.write(d));
vite.on('exit', c => process.exit(c ?? 0));
process.on('SIGTERM', () => vite.kill());
