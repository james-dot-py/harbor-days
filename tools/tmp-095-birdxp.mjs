// tmp (095): experiment — manually hide a far bird's live meshes, wait, re-read.
// Distinguishes "something re-shows them" from "the LOD hide never ran".
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
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto(`http://localhost:${port}/?play=1&quiet=1&canary=bx095&x=171&z=-396.25&yaw=-0.99&pitch=0.36&dist=9`,
    { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(s => setTimeout(s, 3500));
  if (!canaries.some(c => c.includes('bx095'))) { console.error('CANARY FAILED'); killVite(); process.exit(2); }
  const r1 = await page.evaluate(() => {
    const { scene } = window.__hd;
    let tgt = null;
    scene.traverse(o => {
      if (tgt || o.name !== 'bird' || !o.visible) return;
      const u = o.userData;
      if (u && u.lodLive === false) tgt = o;
    });
    if (!tgt) return { err: 'no baked-mode bird found' };
    const u = tgt.userData;
    window.__xpBird = tgt;
    for (const m of u.liveM) m.visible = false;          // manual hide, same objects the LOD uses
    u.liveM[0].userData.__xpTag = true;
    return {
      name: u.name, state: u.state,
      sameAsChildren: u.liveM.every(m => tgt.children.includes(m)),
      kids: tgt.children.map(c => (c.name || c.type) + ':' + (c.visible ? 'V' : 'h')).join(','),
    };
  });
  console.log('after manual hide:', JSON.stringify(r1));
  await new Promise(s => setTimeout(s, 1500));
  const r2 = await page.evaluate(() => {
    const tgt = window.__xpBird;
    const u = tgt.userData;
    return {
      state: u.state, lodLive: u.lodLive,
      fogHidden: u.liveM.map(m => !!m.userData._fogHidden).join(','),
      kids: tgt.children.map(c => (c.name || c.type) + ':' + (c.visible ? 'V' : 'h')).join(','),
    };
  });
  console.log('1.5s later:', JSON.stringify(r2));
} finally { killVite(); await browser.close(); }
