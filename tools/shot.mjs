// Headless screenshot + console-error check for Harbor Days.
// Usage: node tools/shot.mjs <name> [query] [waitMs]
//   node tools/shot.mjs baseline
//   node tools/shot.mjs harbor "x=22&z=-36&yaw=3.1&pitch=0.1" 4000
// Writes tools/shots/<name>.png and prints console/page errors.
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const name = process.argv[2] || 'shot';
const query = process.argv[3] || '';
const waitMs = +(process.argv[4] || 3500);
const outDir = join(dirname(fileURLToPath(import.meta.url)), 'shots');
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });

const errors = [];
const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
page.on('console', m => { if (m.type() === 'error' && !isNoise(m.text())) errors.push('[console.error] ' + m.text()); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
page.on('requestfailed', r => errors.push('[requestfailed] ' + r.url() + ' ' + (r.failure()?.errorText || '')));
page.on('response', r => { if (r.status() >= 400 && !r.url().includes('favicon')) errors.push('[http ' + r.status() + '] ' + r.url()); });

const PORT = process.env.PORT || 5173;
const url = 'http://localhost:' + PORT + '/' + (query ? '?' + query : '');
await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });

// Start the game if the title screen is up (debug ?play=1 may already skip it).
const started = await page.evaluate(() => {
  const t = document.getElementById('title');
  if (t && !t.classList.contains('hide')) { document.getElementById('start').click(); return 'clicked'; }
  return 'already-running';
});
await new Promise(r => setTimeout(r, waitMs));

const file = join(outDir, name + '.png');
await page.screenshot({ path: file });
await browser.close();

console.log('SHOT ' + file + ' (' + started + ')');
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exitCode = 1; }
else console.log('NO ERRORS');
