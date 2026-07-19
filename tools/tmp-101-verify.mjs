// tmp-101-verify.mjs — visual proof for task 101 (NPC path discipline).
// Teleports the mayor next to a live jogger / cyclist / dog-walker on the
// harbor stretch (open, straight dual trail), aims the chase cam so the
// subject reads ~25 deg off-axis (the 047 anti-occlusion law), and shoots.
// Subjects must read ON their own ribbon: pedestrians on the crushed-
// limestone walk path, the cyclist on the asphalt bike path.
// Usage: node tools/tmp-101-verify.mjs
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const SHOTS = path.join(HERE, 'shots');

async function spawnVite() {
  const vite = spawn(process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: ROOT });
  const port = await new Promise((res, rej) => {
    let buf = '';
    const to = setTimeout(() => rej(new Error('vite did not report a port in 30s')), 30000);
    vite.stdout.on('data', d => {
      buf += d.toString();
      const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/);
      if (m) { clearTimeout(to); res(+m[1]); }
    });
    vite.stderr.on('data', d => { buf += d.toString(); });
    vite.on('exit', c => rej(new Error('vite exited early (' + c + ')')));
  });
  const kill = () => { try { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill(); } catch { } };
  return { port, kill };
}

const { port, kill } = await spawnVite();
let browser = null;
try {
  const puppeteer = (await import('puppeteer')).default;
  browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const canary = 'tmp101-' + Math.random().toString(36).slice(2, 8);
  const canaryHits = [], errs = [];
  page.on('console', m => { const t = m.text(); if (t.startsWith('[canary]')) canaryHits.push(t); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(`http://localhost:${port}/?play=1&quiet=1&canary=${canary}`, { waitUntil: 'networkidle0', timeout: 120000 });
  if (!canaryHits.some(c => c.includes(canary))) throw new Error('canary not echoed — foreign server?');
  await page.waitForFunction(() => window.__hd && window.__hd.trail && window.__hd.player && window.__hd.input, { timeout: 90000 });
  await new Promise(r => setTimeout(r, 1500));   // settle: world build + first frames

  // subject heading from two samples ~300 ms apart (movers never idle except
  // a sniffing dog-walker — then fall back to due-north heading)
  async function headingOf(getter) {
    const a = await page.evaluate(getter);
    await new Promise(r => setTimeout(r, 300));
    const b = await page.evaluate(getter);
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
    return L > 0.15 ? { h: [dx / L, dz / L], pos: b, sp: L / 0.3 } : { h: [0, -1], pos: b, sp: 0 };
  }

  async function shoot(name, getter, leadSecs) {
    const { h, pos, sp } = await headingOf(getter);
    // lead the subject by its travel during the post-teleport settle
    const S = [pos[0] + h[0] * sp * leadSecs, pos[1] + h[1] * sp * leadSecs];
    const P = [S[0] - 7, S[1]];                       // stand 7 m due WEST (park side)
    const yaw = Math.atan2(S[0] - P[0], S[1] - P[1]) + 0.45;   // subject ~25 deg off-axis
    await page.evaluate((P, yaw) => {
      window.__hd.player.x = P[0]; window.__hd.player.z = P[1];   // player is a {x,z,y} state object
      window.__hd.input.cam.yaw = yaw; window.__hd.input.cam.pitch = 0.30; window.__hd.input.cam.dist = 6.5;
      window.__hd.camCtl.snap = true;
    }, P, yaw);
    await new Promise(r => setTimeout(r, 500));
    const file = path.join(SHOTS, name + '.png');
    await page.screenshot({ path: file });
    const subj = await page.evaluate(getter);
    console.log(`SHOT ${name}  subject now at (${subj[0].toFixed(1)},${subj[1].toFixed(1)})  stood (${P[0].toFixed(1)},${P[1].toFixed(1)}) sp=${sp.toFixed(1)}`);
  }

  // jogger nearest the harbor stretch (walkers[0..5] = joggers)
  const jIdx = await page.evaluate(() => {
    const w = window.__hd.trail().walkers; let bi = 0, bd = 1e9;
    for (let i = 0; i < 6; i++) { const d = Math.abs(w[i][1] + 150); if (d < bd) { bd = d; bi = i; } }
    return bi;
  });
  console.log('jogger idx', jIdx);
  await shoot('tmp-101-jogger', new Function('return window.__hd.trail().walkers[' + jIdx + ']'), 0.8);

  // cyclist nearest the harbor stretch
  const cIdx = await page.evaluate(() => {
    const c = window.__hd.trail().cyclists; return Math.abs(c[0][1] + 150) < Math.abs(c[1][1] + 150) ? 0 : 1;
  });
  console.log('cyclist idx', cIdx);
  await shoot('tmp-101-cyclist', new Function('return window.__hd.trail().cyclists[' + cIdx + ']'), 0.55);

  // harbor dog-walker = walkers[7] (anchors[1] is the harbor stretch)
  await shoot('tmp-101-dogwalker', new Function('return window.__hd.trail().walkers[7]'), 0.8);

  if (errs.length) { console.log('PAGE ERRORS:\n' + errs.join('\n')); process.exitCode = 1; }
} finally {
  if (browser) await browser.close().catch(() => { });
  kill();
}
