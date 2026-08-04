// tmp-130-probe2.mjs — verify the 130 census's Wrigleyville claim before filing
// it: WALK_W's `sheffLanding` quad (x -181..-178, z -534..-532, y 9.6) is said to
// be walkable AIR — 6 m2 of walk surface 9.6 m up with nothing rendered under it.
// Asks the CELL's own walkable()/surfaceY() through __hd.cellProbe (never
// activating the cell) and raycasts the live scene for anything drawn beneath.
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: root });
const port = await new Promise((res, rej) => {
  let buf = '';
  const to = setTimeout(() => rej(new Error('no port in 40s:\n' + buf)), 40000);
  vite.stdout.on('data', d => {
    buf += d.toString();
    const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/);
    if (m) { clearTimeout(to); res(+m[1]); }
  });
  vite.stderr.on('data', d => { buf += d.toString(); });
  vite.on('exit', c => rej(new Error('vite exited early (' + c + ')\n' + buf)));
});
const kill = () => process.platform === 'win32'
  ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill();

const b = await puppeteer.launch({ headless: 'new', args: ['--mute-audio'], protocolTimeout: 300000 });
try {
  const p = await b.newPage();
  const canary = [], errors = [];
  p.on('console', m => { const t = m.text(); if (t.startsWith('[canary]')) canary.push(t); });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(`http://localhost:${port}/?play=1&quiet=1&canary=probe130b`, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));
  console.log('canary:', canary.join('|') || 'SILENT — DO NOT TRUST THIS RUN');
  console.log('page errors:', errors.length ? errors.join(' | ') : 'none');

  const out = await p.evaluate(() => {
    const T = window.__hd.THREE, S = window.__hd.scene;
    S.updateMatrixWorld(true);
    const ray = new T.Raycaster(), down = new T.Vector3(0, -1, 0), org = new T.Vector3();
    ray.camera = window.__hd.camera;
    const rows = [];
    for (let x = -182; x <= -176.5; x += 0.5) for (let z = -535; z <= -530.5; z += 0.5) {
      const q = window.__hd.cellProbe('wrigleyville', x, z);
      if (!q) return { err: 'cellProbe returned null — no such cell / no walkable fn' };
      // what is DRAWN under this point, from 1 m above the claimed walk height down to grade?
      org.set(x, q.y + 1, z); ray.set(org, down); ray.near = 0; ray.far = q.y + 1;
      const hits = ray.intersectObject(S, true).map(h => +h.point.y.toFixed(2));
      rows.push({ x: +x.toFixed(1), z: +z.toFixed(1), walk: q.walk, y: +q.y.toFixed(2), tops: hits.slice(0, 3) });
    }
    return { rows };
  });
  if (out.err) { console.log('ERROR:', out.err); }
  else {
    const walk = out.rows.filter(r => r.walk);
    console.log(`\nsheffLanding box: ${out.rows.length} samples, ${walk.length} walkable`);
    const air = walk.filter(r => !r.tops.some(t => Math.abs(t - r.y) <= 0.35));
    console.log(`walkable cells with NOTHING rendered within 0.35 m of the walk height: ${air.length}`);
    for (const r of walk.slice(0, 40))
      console.log(`  (${r.x},${r.z}) walk y ${r.y}  drawn under: ${r.tops.length ? r.tops.join(' ') : 'NOTHING'}`);
  }
} finally { await b.close(); kill(); }
