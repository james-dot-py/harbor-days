// Title-screen screenshot for Harbor Days — captures the title card WITHOUT
// clicking "start" (shot.mjs dismisses the title, so it can't frame the card).
// Usage: node tools/title-shot.mjs <name> <width> <height> <port> <canary>
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'shots');
const [name = 'title', width = 1280, height = 720, port = 5173, canary = ''] = process.argv.slice(2);

mkdirSync(dir, { recursive: true });
const browser = await puppeteer.launch({ headless: 'new', args: ['--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: +width, height: +height });

const errors = [], canaryEcho = [];
const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
page.on('console', m => {
  const t = m.text();
  if (m.type() === 'error' && !isNoise(t)) errors.push('[console.error] ' + t);
  else if (t.startsWith('[canary]')) canaryEcho.push(t);
});
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
page.on('requestfailed', r => errors.push('[requestfailed] ' + r.url() + ' ' + (r.failure()?.errorText || '')));
page.on('response', r => { if (r.status() >= 400 && !r.url().includes('favicon')) errors.push('[http ' + r.status() + '] ' + r.url()); });

const url = 'http://localhost:' + port + '/' + (canary ? '?canary=' + canary : '');
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
// deliberately do NOT click #start — we want the title card in frame.
await new Promise(r => setTimeout(r, 1500)); // let cardIn animation settle

const file = join(dir, name + '.png');
await page.screenshot({ path: file });
await page.close();
await browser.close();

console.log('SHOT ' + file + ' (' + width + 'x' + height + ')');
if (canaryEcho.length) console.log('CANARY ' + canaryEcho.join(' | '));
else console.log('CANARY (none echoed)');
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exitCode = 1; }
else console.log('NO ERRORS');
