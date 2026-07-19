// tmp (095): dump per-bird LOD state at the sanctuary-deck-f2 camera.
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
  await page.goto(`http://localhost:${port}/?play=1&quiet=1&canary=bp095&x=171&z=-396.25&yaw=-0.99&pitch=0.36&dist=9`,
    { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(s => setTimeout(s, 3500));
  if (!canaries.some(c => c.includes('bp095'))) { console.error('CANARY FAILED'); killVite(); process.exit(2); }
  const r = await page.evaluate(() => {
    const { scene } = window.__hd;
    const out = [];
    scene.traverse(o => {
      if (o.name !== 'bird' || !o.visible) return;
      const u = o.userData;
      const kids = o.children.map(c => (c.name || c.type) + ':' + (c.visible ? 'V' : 'h'));
      const dx = o.position.x - 171, dz = o.position.z + 396.25;
      out.push({
        name: u && u.name, state: u && u.state, lodLive: u && u.lodLive,
        d: Math.round(Math.hypot(dx, dz)), x: Math.round(o.position.x * 10) / 10, z: Math.round(o.position.z * 10) / 10,
        liveM: u && u.liveM ? u.liveM.length : -1, kids: kids.join(','),
      });
    });
    return out;
  });
  for (const b of r.sort((a, b) => a.d - b.d)) console.log(JSON.stringify(b));
} finally { killVite(); await browser.close(); }
