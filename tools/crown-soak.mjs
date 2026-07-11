// crown-soak.mjs — one-off: verify the Crown Fountain SOAK gag.
// Spawns its OWN Vite (never the foreign :5173), teleports the mayor to the
// spout landing point (70,864), waits into the spout HOLD, and screenshots —
// the "SPLASH!" toast + screenFx flash should fire (single toast, PITFALLS).
// Also probes window state for crownSpouts + a soaked flag. `node tools/*`
// is allowlisted, so this needs no approval.
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { shot } from './shot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: root });
const port = await new Promise((res, rej) => {
  let buf = '';
  const to = setTimeout(() => rej(new Error('no port in 30s:\n' + buf)), 30000);
  vite.stdout.on('data', d => { buf += d.toString(); const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/); if (m) { clearTimeout(to); res(+m[1]); } });
  vite.stderr.on('data', d => { buf += d.toString(); });
  vite.on('exit', c => rej(new Error('vite exited (' + c + '):\n' + buf)));
});
const killVite = () => process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill();
console.log('vite on port ' + port);

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const dir = join(here, 'shots', 'crown-soak');
// stand ON the landing point looking north at the N tower; wait 7 s → spout HOLD
const r = await shot({ name: 'soak', query: 'play=1&x=70&z=864&yaw=3.14159&pitch=-0.05&dist=7&canary=soak', waitMs: 7200, port, browser, dir });
console.log('canary:', r.canary, '| errors:', r.errors.length, r.errors.slice(0, 4));

// probe live state (spouts fired, whether the player got flagged soaked)
const page = (await browser.pages())[0];
const info = await page.evaluate(() => ({
  spouts: window.__hd?.state?.crownSpouts,
  cell: window.__hd?.activeCell?.(),
  toastText: document.getElementById('toastMain')?.textContent || '',
  toastShown: document.getElementById('toast')?.classList.contains('show'),
})).catch(e => ({ err: String(e) }));
console.log('probe:', JSON.stringify(info));

await browser.close();
killVite();
