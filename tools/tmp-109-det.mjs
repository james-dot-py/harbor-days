// tmp: task 109 determinism gate — own vite + canary, canonical spawn shot
// (play=1&quiet=1 @ 3500ms, 1280x720) diffed vs tools/shots/baseline.png at
// per-pixel threshold 0.1. Gate ratio (flake-calibration) = 0.828%.
import { spawn } from 'child_process';
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outPath = join(here, 'shots', 'tmp-109-spawn.png');
const GATE = 0.008275824652777777;

const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: root });
const port = await new Promise((res, rej) => {
  let buf = ''; const to = setTimeout(() => rej(new Error('vite no port:\n' + buf)), 30000);
  vite.stdout.on('data', d => { buf += d; const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/); if (m) { clearTimeout(to); res(m[1]); } });
  vite.stderr.on('data', d => { buf += d; });
});
const killVite = () => process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill();
console.log('vite on port ' + port);

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1300,760'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const canary = [], errs = [];
page.on('pageerror', e => errs.push('' + e.message));
page.on('console', m => { const t = m.text(); if (t.startsWith('[canary]')) canary.push(t); else if (m.type() === 'error' && !t.includes('favicon') && !t.includes('404')) errs.push(t); });
await page.goto(`http://localhost:${port}/?play=1&quiet=1&canary=det109`, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise(r => setTimeout(r, 3500));
await page.screenshot({ path: outPath });
await browser.close(); killVite();

console.log('canary:', canary, 'errors:', errs.length);
const a = PNG.sync.read(fs.readFileSync(join(here, 'shots', 'baseline.png')));
const b = PNG.sync.read(fs.readFileSync(outPath));
if (a.width !== b.width || a.height !== b.height) { console.log('SIZE MISMATCH ' + a.width + 'x' + a.height + ' vs ' + b.width + 'x' + b.height); process.exit(1); }
const n = pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0.1 });
const ratio = n / (a.width * a.height);
console.log(`diff ${n}px = ${(ratio * 100).toFixed(3)}%  (gate ${(GATE * 100).toFixed(3)}%)`);
console.log(canary.length && !errs.length && ratio <= GATE ? 'DETERMINISM PASS' : 'DETERMINISM FAIL');
process.exit(canary.length && !errs.length && ratio <= GATE ? 0 : 1);
