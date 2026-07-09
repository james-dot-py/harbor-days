// census.mjs — per-view draw-call attribution for the draw-budget ratchet
// (queue task 004). Two modes:
//
//   node tools/census.mjs [port]
//     Visit the hot framings and dump window.__hd.census() — visible draw
//     units grouped by named-ancestor chain | geometry | material color.
//     'chibi' groups are figure rigs; 'cell-*' are engine builders; unnamed
//     entries are pack-added meshes. Spawns its own vite when no port given
//     (NEVER assume 5173 — see PITFALLS.md).
//
//   node tools/census.mjs rank [reportPath]
//     Rank a walkthrough report.json's framings by measured draw calls
//     (default: the newest tools/shots/run-*/report.json).
import { spawn } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

// ---- rank mode -------------------------------------------------------
if (process.argv[2] === 'rank') {
  let path = process.argv[3];
  if (!path) {
    const runs = readdirSync(join(here, 'shots')).filter(d => d.startsWith('run-'))
      .map(d => join(here, 'shots', d, 'report.json'))
      .filter(p => { try { return statSync(p).isFile(); } catch { return false; } })
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    path = runs[0];
  }
  const r = JSON.parse(readFileSync(path, 'utf8'));
  const rows = [];
  for (const w of r.waypoints) for (const f of w.framings || [])
    if (f.perf) rows.push({ id: `${w.id}-f${f.i}`, area: w.area, dc: f.perf.drawCalls, fps: f.perf.fps });
  rows.sort((a, b) => b.dc - a.dc);
  console.log(path);
  for (const x of rows.slice(0, 40)) console.log(String(x.dc).padStart(5), x.area.padEnd(14), x.id, `fps=${x.fps}`);
  const over = n => rows.filter(x => x.dc > n).length;
  console.log(`--- framings: ${rows.length} · max ${rows[0]?.dc} · over480: ${over(480)} · over ${r.budget}: ${over(r.budget)}`);
  process.exit(0);
}

// ---- census mode -----------------------------------------------------
const puppeteer = (await import('puppeteer')).default;
const VIEWS = [   // the historical hot framings (see autopilot/issues/000-draw-call-budget.md)
  { id: 'wv-gate-bleacher-f2', q: 'x=-190&z=-500&yaw=-1.19&pitch=0.12&dist=14' },
  { id: 'deck-1-f1', q: 'x=121&z=389.5&yaw=3.14&pitch=0.22&dist=12' },
  { id: 'zone-diversey-point-f1', q: 'x=100&z=378&yaw=2.9&pitch=0.2&dist=11' },
  { id: 'wv-rooftop-view-f0', q: 'x=-212.5&z=-515&yaw=0.01&pitch=0.15&dist=10' },
  { id: 'sign-dog-beach-f0', q: 'x=103&z=-343&yaw=6.14&pitch=0.12&dist=8' },
  { id: 'wv-statue-row-f1', q: 'x=-308&z=-491&yaw=0.61&pitch=0.15&dist=7' },
  { id: 'zone-kwanusila-f0', q: 'x=38&z=-370&yaw=-1.57&pitch=-0.2&dist=12' },
  { id: 'spawn-f2', q: 'x=150&z=150&yaw=3.14&pitch=0.25&dist=14' },
  { id: 'wv-marquee-f2', q: 'x=-284.5&z=-404.5&yaw=2.54&pitch=0.33&dist=15' },
];

let port = process.argv[2] ? +process.argv[2] : null;
let vite = null;
if (!port) {
  vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: root });
  port = await new Promise((res, rej) => {
    let buf = '';
    const to = setTimeout(() => rej(new Error('vite did not report a port in 30s:\n' + buf)), 30000);
    vite.stdout.on('data', d => {
      buf += d.toString();
      const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/);
      if (m) { clearTimeout(to); res(+m[1]); }
    });
    vite.stderr.on('data', d => { buf += d.toString(); });
    vite.on('exit', c => rej(new Error('vite exited early (' + c + '):\n' + buf)));
  });
}
const killVite = () => { if (!vite) return; process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill(); };
console.log('census on port ' + port);

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
try {
  for (const v of VIEWS) {
    // one slow page shouldn't sink the whole census: try, retry once on a
    // fresh page, then log a FAILED line and move on (see PITFALLS.md 5173).
    for (let attempt = 1; attempt <= 2; attempt++) {
      const page = await browser.newPage();
      try {
        await page.setViewport({ width: 1280, height: 720 });
        await page.goto(`http://localhost:${port}/?play=1&quiet=1&${v.q}`, { waitUntil: 'networkidle0', timeout: 60000 });
        await new Promise(r => setTimeout(r, 2600));
        const res = await page.evaluate(() => ({
          c: window.__hd && window.__hd.census ? window.__hd.census(300) : null,
          p: window.__hd ? window.__hd.perf() : null,
        }));
        console.log(`\n===== ${v.id}  rendererCalls=${res.p ? res.p.drawCalls : '?'}  censusTotal=${res.c ? res.c.total : '?'} =====`);
        if (res.c) for (const [k, n] of res.c.rows) console.log(String(n).padStart(5), k);
        break;   // success — on to the next view
      } catch (err) {
        if (attempt === 2) console.log(`\n===== ${v.id}  FAILED after retry: ${String(err.message).split('\n')[0]} =====`);
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
  killVite();
}
