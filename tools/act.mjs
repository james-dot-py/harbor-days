// Headless action driver for Harbor Days (extends shot.mjs).
// Usage: node tools/act.mjs '<actionsJSON>' [baseQuery]
//   actions is a JSON array of steps:
//     ["goto",x,z]        navigate/teleport: (re)loads with ?play=1&x&z
//     ["key","e"]         tap a key (down, hold ~160ms, up) — survives a frame
//     ["keydown","e"]     press and keep held
//     ["keyup","e"]       release a held key
//     ["wait",800]        wait ms
//     ["shot","name"]     screenshot -> tools/shots/name.png
//   baseQuery (optional) extra params merged into every goto, e.g. "yaw=3.1&dist=9"
// Prints console/page errors at the end (non-zero exit if any).
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const actions = JSON.parse(process.argv[2] || '[]');
const baseQuery = process.argv[3] || '';
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

const PORT = +(process.argv[4] || process.env.PORT || 5173);   // optional 3rd CLI arg = port
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function nav(x, z) {
  const q = new URLSearchParams('play=1');
  if (x !== undefined && x !== null) q.set('x', x);
  if (z !== undefined && z !== null) q.set('z', z);
  if (baseQuery) for (const [k, v] of new URLSearchParams(baseQuery)) q.set(k, v);
  await page.goto('http://localhost:' + PORT + '/?' + q.toString(), { waitUntil: 'networkidle0', timeout: 20000 });
  await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start').click(); });
  await sleep(600);
}

let navigated = false;
for (const [op, a, b] of actions) {
  if (op === 'goto') { await nav(a, b); navigated = true; }
  else { if (!navigated) { await nav(); navigated = true; }
    if (op === 'key') { await page.keyboard.down(a); await sleep(160); await page.keyboard.up(a); }
    else if (op === 'keydown') await page.keyboard.down(a);
    else if (op === 'keyup') await page.keyboard.up(a);
    else if (op === 'wait') await sleep(a);
    else if (op === 'shot') { const f = join(outDir, a + '.png'); await page.screenshot({ path: f }); console.log('SHOT ' + f); }
  }
}

await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exitCode = 1; }
else console.log('NO ERRORS');
