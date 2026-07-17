// 084: own-vite warnprobe — catches onWorldReady-swallowed throws (console.warn)
// + pageerrors on a given spawn. Usage: node tools/tmp-084-warnrun.mjs [query]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const query = process.argv[2] || 'play=1&x=180&z=-760&canary=warn084';
const port = 5241;
const vite = spawn(process.execPath,
  [join(here, '..', 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'],
  { cwd: join(here, '..') });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite start timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=640,360', '--mute-audio'] });
const page = await browser.newPage();
const lines = [];
page.on('console', m => { const t = m.type(); if (t === 'warn' || t === 'warning' || t === 'error' || m.text().startsWith('[canary]') || m.text().startsWith('[perf]')) lines.push(`[${t}] ${m.text()}`); });
page.on('pageerror', e => lines.push('[pageerror] ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 6).join('\n')));
await page.goto(`http://localhost:${port}/?${query}`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
await new Promise(r => setTimeout(r, 3000));
console.log(lines.length ? lines.join('\n') : '(no warns/errors)');
await browser.close();
if (process.platform === 'win32') spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']); else vite.kill();
