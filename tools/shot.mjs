// Headless screenshot + console-error check for Harbor Days.
// Usage: node tools/shot.mjs <name> [query] [waitMs]
//   node tools/shot.mjs baseline
//   node tools/shot.mjs harbor "x=22&z=-36&yaw=3.1&pitch=0.1" 4000
// Writes tools/shots/<name>.png and prints console/page errors.
// Module use (walkthrough.mjs): import { shot } from './shot.mjs' —
// pass {browser} to reuse one instance across shots, {perf:true} to sample
// window.__hd.perf() after settle, {dir} to redirect output.
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const defaultDir = join(dirname(fileURLToPath(import.meta.url)), 'shots');

export async function shot({ name = 'shot', query = '', waitMs = 3500, port = process.env.PORT || 5173, browser = null, dir = defaultDir, perf = false } = {}) {
  mkdirSync(dir, { recursive: true });
  const own = !browser;
  if (own) browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const errors = [], canary = [];
  const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
  page.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' && !isNoise(t)) errors.push('[console.error] ' + t);
    else if (t.startsWith('[canary]')) canary.push(t);
  });
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
  page.on('requestfailed', r => errors.push('[requestfailed] ' + r.url() + ' ' + (r.failure()?.errorText || '')));
  page.on('response', r => { if (r.status() >= 400 && !r.url().includes('favicon')) errors.push('[http ' + r.status() + '] ' + r.url()); });

  const url = 'http://localhost:' + port + '/' + (query ? '?' + query : '');
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });   // 60s: SwiftShader first paint under parallel load flaked at 20s

  // Start the game if the title screen is up (debug ?play=1 may already skip it).
  const started = await page.evaluate(() => {
    const t = document.getElementById('title');
    if (t && !t.classList.contains('hide')) { document.getElementById('start').click(); return 'clicked'; }
    return 'already-running';
  });
  await new Promise(r => setTimeout(r, waitMs));

  let perfStats = null;
  if (perf) perfStats = await page.evaluate(() => window.__hd ? window.__hd.perf() : null).catch(() => null);

  const file = join(dir, name + '.png');
  await page.screenshot({ path: file });
  await page.close();
  if (own) await browser.close();
  return { file, started, errors, canary, perf: perfStats };
}

// ---- CLI (behavior preserved; optional 4th arg = port) ----
// node tools/shot.mjs <name> [query] [waitMs] [port]
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const r = await shot({ name: process.argv[2] || 'shot', query: process.argv[3] || '', waitMs: +(process.argv[4] || 3500), port: +(process.argv[5] || process.env.PORT || 5173) });
  console.log('SHOT ' + r.file + ' (' + r.started + ')');
  if (r.canary.length) console.log('CANARY ' + r.canary.join(' | '));
  if (r.errors.length) { console.log('ERRORS:\n' + r.errors.join('\n')); process.exitCode = 1; }
  else console.log('NO ERRORS');
}
