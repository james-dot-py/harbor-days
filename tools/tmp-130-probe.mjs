// tmp-130-probe.mjs — settle the 130 census's two UNVERIFIED claims against the
// LIVE engine (__hd.solidProbe), never against a node-side mirror:
//   (B4) a 0.4 m non-walkable dead band across BOTH Fullerton ramp heads, where
//        124's lawn TRENCH NOTCH (x -11.4..0 / 14..25.4) runs 0.4 m wider than
//        lpUnderpassH's ramp span (x -11..25) — i.e. the only working crossing
//        of Lake Shore Drive blocked at both ends.
//   (B1) Cafe Brauer's SOUTH loggia arm floor renders x -54..-42 at y 0.13, but
//        LP_SOUTHPOND_WATER's west edge cuts it at x ~-45.2 — 3.2 m of visible
//        brick quay that does not hold you.
// Spawns its own vite (never the foreign 5173) and canary-checks the page.
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
  await p.goto(`http://localhost:${port}/?play=1&quiet=1&canary=probe130`, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));
  console.log('canary:', canary.join('|') || 'SILENT — DO NOT TRUST THIS RUN');
  console.log('page errors:', errors.length ? errors.join(' | ') : 'none');

  const out = await p.evaluate(() => {
    const P = window.__hd.solidProbe;
    const row = (x, z) => { const q = P(x, z); return { x: +x.toFixed(2), z, walk: q.walk, water: q.water, y: +q.y.toFixed(2) }; };
    const scan = (z, x0, x1, st) => { const a = []; for (let x = x0; x <= x1 + 1e-9; x += st) a.push(row(x, z)); return a; };
    return {
      underpassZ661: scan(661, -13, 27, 0.2),
      underpassZ656: scan(656, -13, 27, 0.2),
      underpassZ666: scan(666, -13, 27, 0.2),
      brauerS918: scan(918, -56, -40, 0.25),
      brauerS920: scan(920, -56, -40, 0.25),
      brauerN898: scan(898, -56, -40, 0.25),
      brauerCourt908: scan(908, -56, -40, 0.25),
    };
  });
  const show = (name, rows) => {
    const bad = rows.filter(r => !r.walk);
    console.log(`\n${name}: ${rows.length} samples, ${bad.length} NOT walkable`);
    if (bad.length) {
      // print contiguous non-walkable runs
      let s = null, prev = null;
      for (const r of rows) {
        if (!r.walk) { if (s === null) s = r.x; prev = r.x; }
        else if (s !== null) { console.log(`   dead band x ${s.toFixed(2)} .. ${prev.toFixed(2)}`); s = null; }
      }
      if (s !== null) console.log(`   dead band x ${s.toFixed(2)} .. ${prev.toFixed(2)}`);
    }
    const ys = [...new Set(rows.filter(r => r.walk).map(r => r.y))];
    console.log(`   walkable surface heights seen: ${ys.slice(0, 8).join(', ')}`);
  };
  for (const k of Object.keys(out)) show(k, out[k]);
} finally { await b.close(); kill(); }
