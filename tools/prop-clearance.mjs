// prop-clearance.mjs — PERMANENT city-wide prop-vs-path clearance sweep.
// Task 088 (owner: "trees in the middle of pathways"). Loads the live build,
// reads window.__hd.propAudit() (trees + blocking colliders + every REAL drawn
// ribbon centerline), and flags anything encroaching on a walkable ribbon.
//
// Usage: node tools/prop-clearance.mjs [port]      (or PORT=<n> node ...)
//   With NO port it SPAWNS ITS OWN vite (tools/serve.mjs) and parses the real
//   port from its output — never attaches to 5173 by default (a foreign
//   interactive session may own it and serve a DIFFERENT build: the 5173 trap).
//   Pass a port only to reuse a server you started yourself this session.
// Every page load carries &canary=propclear and the run ABORTS unless the page
// echoes '[canary] propclear' (proves we drove OUR server, not a stale one).
// walkprobe.mjs spawns this as its final "088 permanent guards" category, so
// the check runs on every standard verify gate.
//
// Exit: 0 clean · 1 violations · 2 canary/probe failure.
import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

let port = process.argv[2] || process.env.PORT;
let vite = null;
if (!port) {
  const here = dirname(fileURLToPath(import.meta.url));
  vite = spawn(process.execPath, [join(here, 'serve.mjs')], { cwd: join(here, '..') });
  port = await new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error('serve.mjs did not report a port in 30s')), 30000);
    vite.stdout.on('data', d => { const m = d.toString().match(/PORT (\d+)/); if (m) { clearTimeout(to); res(+m[1]); } });
    vite.on('exit', c => rej(new Error('serve.mjs exited early (' + c + ')')));
  });
  console.log('prop-clearance: own vite on port ' + port);
}
const killVite = () => { if (!vite) return; process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill(); };
process.on('exit', killVite);

// point → segment distance + the closest point on the segment (clamped ends).
function segNear(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
  let t = L ? ((px - ax) * dx + (pz - az) * dz) / L : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + t * dx, cz = az + t * dz;
  return { d: Math.hypot(px - cx, pz - cz), cx, cz };
}
// Scan every lane POLYLINE (point-to-segment over consecutive pts, not vertices
// only) and return the lane/segment with the smallest clearance margin, where
// margin = d − need(w). Violation when margin < 0.
function worst(px, pz, lanes, need) {
  let b = { margin: Infinity, d: Infinity, cx: px, cz: pz, w: 0, need: 0 };
  for (const lane of lanes) {
    const nd = need(lane.w), pts = lane.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const r = segNear(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      const m = r.d - nd;
      if (m < b.margin) b = { margin: m, d: r.d, cx: r.cx, cz: r.cz, w: lane.w, need: nd };
    }
  }
  return b;
}
const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2);

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const canary = [], perr = [];
page.on('console', m => { const t = m.text(); if (t.startsWith('[canary]')) canary.push(t); });
page.on('pageerror', e => perr.push('[pageerror] ' + e.message));

const url = 'http://localhost:' + port + '/?play=1&quiet=1&canary=propclear';
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start').click(); });
await new Promise(r => setTimeout(r, 3500));

if (!canary.some(c => c === '[canary] propclear')) {
  console.error('CANARY FAILED — never saw "[canary] propclear" on ' + url + ' (wrong/stale server?).');
  if (perr.length) console.error(perr.join('\n'));
  await browser.close();
  process.exit(2);
}

const audit = await page.evaluate(() => (window.__hd && window.__hd.propAudit) ? window.__hd.propAudit() : null);
await browser.close();
if (!audit) { console.error('PROBE FAILED — window.__hd.propAudit() unavailable.'); process.exit(2); }

const { trees, colliders, lanes } = audit;
const out = [];
let tHits = 0, cHits = 0;

// --- TREES: canopy centers must clear every ribbon by w/2 + 0.5 m ---
const treeNeed = w => w / 2 + 0.5;
for (const [x, z] of trees) {
  const b = worst(x, z, lanes, treeNeed);
  if (b.margin < 0) {
    tHits++;
    out.push(`TREE (${f1(x)},${f1(z)}) ${f2(b.d)}m from lane centerline (w ${f1(b.w)}, need >=${f2(b.need)}) near (${f1(b.cx)},${f1(b.cz)})`);
  }
}

// --- BLOCKING PROPS: infinite (h:-1) or tall (h>=1.2) colliders whose BASE sits
// ON the pavement (center within w/2 − 0.05). Skip any collider within 0.7 m of
// a tree spot — those ARE tree colliders, already covered above. ---
const propNeed = w => w / 2 - 0.05;
for (const c of colliders) {
  if (!(c.h === -1 || c.h >= 1.2)) continue;
  let nearTree = false;
  for (const [tx, tz] of trees) { if ((tx - c.x) ** 2 + (tz - c.z) ** 2 < 0.49) { nearTree = true; break; } }  // 0.7^2
  if (nearTree) continue;
  const b = worst(c.x, c.z, lanes, propNeed);
  if (b.margin < 0) {
    cHits++;
    out.push(`PROP (${f1(c.x)},${f1(c.z)}) r ${f2(c.r)} h ${c.h === -1 ? 'inf' : f1(c.h)} center ${f2(b.d)}m onto lane (w ${f1(b.w)}, need >=${f2(b.need)}) near (${f1(b.cx)},${f1(b.cz)})`);
  }
}

for (const line of out) console.log(line);
const N = tHits + cHits;
if (N > 0) {
  console.log(`PROP-CLEARANCE: ${N} violations (${tHits} trees, ${cHits} colliders) across ${lanes.length} lanes / ${trees.length} trees`);
  process.exit(1);
} else {
  console.log(`PROP-CLEARANCE CLEAN (0 violations across ${lanes.length} lanes / ${trees.length} trees, ${colliders.length} colliders)`);
  process.exit(0);
}
