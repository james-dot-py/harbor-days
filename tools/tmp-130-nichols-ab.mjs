// tmp-130-nichols-ab.mjs — SAME BUILD, SAME WORLD STATE, only the winding
// differs: shoot each Nichols framing with the 130 fix, then re-reverse the
// mp-nichols-deck triangles in the SAME page and shoot again. Anything that
// moves between the pair is the winding, not the weather / the HUD / a rebuild.
// Writes flat names into tools/shots/ and pixel-diffs each pair.
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import puppeteer from 'puppeteer';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const shots = join(here, 'shots');
const FRAMINGS = [
  ['f1-ondeck',  'x=118.2&z=885&yaw=0.05&pitch=-0.06&dist=4.5'],   // the shipped mp-nichols-f1
  ['down-deck',  'x=118.2&z=885&yaw=0.05&pitch=0.42&dist=6'],       // looking DOWN at the walk surface
  ['f0-belly',   'x=112&z=852&yaw=0.30&pitch=0.02&dist=6'],         // the shipped mp-nichols-f0 (hull + fascia lip)
];
const UNFIX = fs.readFileSync(join(here, 'tmp-130-inject-nichols-unfix.js'), 'utf8');

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
  for (const [name, qs] of FRAMINGS) {
    const p = await b.newPage();
    await p.setViewport({ width: 1280, height: 720 });
    const canary = [], errors = [];
    p.on('console', m => { const t = m.text(); if (t.startsWith('[canary]')) canary.push(t); });
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(`http://localhost:${port}/?play=1&quiet=1&canary=nichab&${qs}`, { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3500));
    const A = join(shots, `tmp130-${name}-FIXED.png`), B = join(shots, `tmp130-${name}-PREFIX.png`), D = join(shots, `tmp130-${name}-DIFF.png`);
    await p.screenshot({ path: A });
    await p.evaluate(UNFIX);
    await new Promise(r => setTimeout(r, 700));
    await p.screenshot({ path: B });
    const a = PNG.sync.read(fs.readFileSync(A)), c = PNG.sync.read(fs.readFileSync(B));
    const d = new PNG({ width: a.width, height: a.height });
    const n = pixelmatch(a.data, c.data, d.data, a.width, a.height, { threshold: 0.1 });
    fs.writeFileSync(D, PNG.sync.write(d));
    console.log(`${name}: canary ${canary.join('|') || 'SILENT — DO NOT TRUST'} · errors ${errors.length ? errors.join(' | ') : 'none'} · changed px ${n} (${(100 * n / (a.width * a.height)).toFixed(2)}%)`);
    await p.close();
  }
} finally { await b.close(); kill(); }
