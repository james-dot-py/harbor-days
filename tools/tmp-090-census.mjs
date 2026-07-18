// tmp (090): census attribution at the sanctuary-deck-f2 camera — the framing
// measured 499/480 with NO mood active (inherited overrun; queue task 095
// carries the fix). Own vite + canary per PITFALLS. Reusable: edit the query
// params to attribute any framing.
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: root });
const port = await new Promise((res, rej) => {
  let buf = '';
  const to = setTimeout(() => rej(new Error('vite silent:\n' + buf)), 30000);
  vite.stdout.on('data', d => {
    buf += d.toString();
    const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/);
    if (m) { clearTimeout(to); res(+m[1]); }
  });
  vite.on('exit', c => rej(new Error('vite exited ' + c)));
});
const killVite = () => { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill(); };
console.log('vite on ' + port);

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const canaries = [];
  page.on('console', m => { if (m.text().startsWith('[canary]')) canaries.push(m.text()); });
  await page.goto(`http://localhost:${port}/?play=1&quiet=1&canary=cen090&x=171&z=-396.25&yaw=-0.99&pitch=0.36&dist=9`,
    { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(s => setTimeout(s, 3500));
  if (!canaries.some(c => c.includes('cen090'))) { console.error('CANARY FAILED'); killVite(); process.exit(2); }
  const r = await page.evaluate(() => window.__hd.census(45));
  console.log('total', r.total);
  for (const [k, n] of r.rows) console.log(String(n).padStart(4), k);
} finally { killVite(); await browser.close(); }
