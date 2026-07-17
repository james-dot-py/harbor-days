// tmp (078): kiosk site audit — resolve where LAND / the terraces / the trail
// sit around the dog-beach approach, so the beach kiosk lands on clear grass.
// Spawns its OWN vite (strict free port), canary-checks, then imports the SERVED
// geometry modules in-page (same singletons the app built) to compute pip(LAND),
// coastQuery lat, beachH and nearest pathSample distance for a grid + the brief's
// candidate window. Usage: node tools/tmp-078-kiosk-site.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const port = +(process.argv[2] || 5251);
const canary = 'kiosk' + Math.floor(Math.random() * 1e6);

const vite = spawn(process.execPath,
  [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'],
  { cwd: root });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite start timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});

const browser = await puppeteer.launch({ headless: 'new', args: ['--mute-audio'] });
const page = await browser.newPage();
const canaries = [];
page.on('console', m => { const t = m.text(); if (t.startsWith('[canary]')) canaries.push(t); });
page.on('pageerror', e => console.log('[pageerror] ' + e.message));

await page.goto(`http://localhost:${port}/?play=1&quiet=1&canary=${canary}`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.scene, { timeout: 15000 });
console.log('canary echoed:', canaries.some(c => c.includes(canary)), canaries.join('|'));

const out = await page.evaluate(async () => {
  const core = await import('/src/core.js');
  const coast = await import('/src/coast.js');
  const paths = await import('/src/paths.js');
  const CH = await import('/src/data/chicago.js');
  const { pip } = core;
  const { LAND, coastQuery, tierAt, beachH } = coast;
  const PS = paths.pathSamples;

  const nearestPath = (x, z) => {
    let bd2 = Infinity;
    for (const s of PS) { const dx = x - s[0], dz = z - s[1], d2 = dx * dx + dz * dz; if (d2 < bd2) bd2 = d2; }
    return Math.sqrt(bd2);
  };
  const obstacles = {
    pen: [105, -332, 3.2], clampNZ: -324, ball: [CH.DOG_PROPS.ball.x, CH.DOG_PROPS.ball.z],
    guard: [108, -341], birder: [92, -349],
  };
  const dist = (x, z, ox, oz) => Math.hypot(x - ox, z - oz);

  const probe = (x, z) => {
    const q = coastQuery(x, z);
    const t = q ? tierAt(q.lat, q.z) : null;
    return {
      x, z, land: pip(x, z, LAND), lat: q ? +q.lat.toFixed(2) : null, tier: t ? t.i : null,
      beach: beachH(x, z), path: +nearestPath(x, z).toFixed(1),
      dPen: +dist(x, z, obstacles.pen[0], obstacles.pen[1]).toFixed(1),
      dBall: +dist(x, z, obstacles.ball[0], obstacles.ball[1]).toFixed(1),
      dGuard: +dist(x, z, obstacles.guard[0], obstacles.guard[1]).toFixed(1),
      dBirder: +dist(x, z, obstacles.birder[0], obstacles.birder[1]).toFixed(1),
    };
  };

  // candidate window from the brief + the north-of-fence alternative
  const cands = [];
  for (let z = -360; z <= -341; z += 1)
    for (let x = 74; x <= 114; x += 1) cands.push(probe(x, z));
  const named = {};
  for (const [n, x, z] of [['brief-96,-320', 96, -320], ['brief-96,-321', 96, -321], ['n-96,-346', 96, -346], ['n-96,-348', 96, -348], ['n-98,-350', 98, -350]])
    named[n] = probe(x, z);
  return { cands, named, dogBeach: CH.DOG_BEACH.bounds, fence: CH.DOG_FENCE.lines };
});

console.log('\nDOG_BEACH bounds:', JSON.stringify(out.dogBeach));
console.log('DOG_FENCE lines:', JSON.stringify(out.fence));
console.log('\nnamed candidates:');
for (const k of Object.keys(out.named)) console.log(' ', k, JSON.stringify(out.named[k]));

// clear candidates: on LAND, not beach, inland of terraces (lat<-1.5 or no tier),
// >=3m from pen ring/ball/guard/birder, >=6m from a path, and >=3m north of the
// clamp window (z <= -327 so it's not on the beach; the grass is NORTH = z<=-341).
console.log('\nGRASS candidates (land, not-beach, terrace-safe, path>=6, clears):');
const good = out.cands.filter(c =>
  c.land && c.beach === null && (c.tier === null || c.lat < -1.5) &&
  c.path >= 6 && c.dPen >= 6.2 && c.dBall >= 3 && c.dGuard >= 3 && c.dBirder >= 3);
// prefer: closest to the fence/beach (max z), then furthest from paths + birder
good.sort((a, b) => (b.z - a.z) || (b.path - a.path) || (b.dBirder - a.dBirder));
for (const c of good.slice(0, 50)) console.log('  ', JSON.stringify(c));
console.log('  (total good:', good.length, ')');

await browser.close();
vite.kill();
process.exit(0);
