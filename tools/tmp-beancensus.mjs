// tmp (062): census the over-budget mp-bean-f3 view (486 > 480).
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', '5217', '--strictPort'], { cwd: root });
const port = await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite timeout')), 30000);
  vite.stdout.on('data', d => { const m = d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/); if (m) { clearTimeout(to); res(+m[1]); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
await page.goto(`http://localhost:${port}/?play=1&quiet=1&x=82&z=790&yaw=0.72&pitch=0.06&dist=8.5`, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise(r => setTimeout(r, 2600));
const res = await page.evaluate(() => ({
  c: window.__hd && window.__hd.census ? window.__hd.census(300) : null,
  p: window.__hd ? window.__hd.perf() : null,
}));
console.log(`mp-bean-f3 rendererCalls=${res.p ? res.p.drawCalls : '?'} censusTotal=${res.c ? res.c.total : '?'}`);
if (res.c) for (const [k, n] of res.c.rows.slice(0, 60)) console.log(String(n).padStart(5), k);
await browser.close();
process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill();
