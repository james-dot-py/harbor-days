// tmp (128): REPRODUCE issue 040 — falling in at the Montrose finger docks.
// (a) fine profile of the ENGINE's own walkable/surfaceY/isWater along each dock
//     row (x 178..208 @ 0.1) — shows exactly where the walk surface starts/ends
//     vs the rendered deck extent (MT_FINGER_DOCKS.x0 .. x0+len).
// (b) a REAL steering walk east along a dock from the lawn to past the tip,
//     recording the player's y so the drop is on disk, with screenshots.
// Spawns its OWN strict-port vite (PITFALLS: :5173 may be a foreign app).
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const port = +(process.argv[2] || 5241);
const vite = spawn(process.execPath,
  [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'],
  { cwd: root });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite start timeout')), 40000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});

const outDir = join(here, 'shots'); mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = []; let canary = 0;
const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !isNoise(m.text())) errors.push('[console.error] ' + m.text()); if (m.text().startsWith('[canary] r128')) canary++; });

async function load(q) {
  await page.goto(`http://localhost:${port}/?play=1&canary=r128&${q}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
  await new Promise(r => setTimeout(r, 900));
}

await load('x=180&z=-754');

// ---- (a) engine profile across every Montrose finger dock row ------------
const prof = await page.evaluate(() => {
  const P = window.__hd.solidProbe;
  const rows = [-714, -754, -792, -826];
  const out = {};
  for (const zc of rows) {
    const line = [];
    for (let x = 176; x <= 208.001; x += 0.1) {
      const p = P(+x.toFixed(2), zc);
      line.push([+x.toFixed(2), p.walk ? 1 : 0, +p.y.toFixed(3), p.water ? 1 : 0]);
    }
    // cross-profile at the deck mid (does the 1.9 m plank hold you off-centre?)
    const cross = [];
    for (let dz = -2.0; dz <= 2.001; dz += 0.1) {
      const p = P(193.5, +(zc + dz).toFixed(2));
      cross.push([+dz.toFixed(2), p.walk ? 1 : 0, +p.y.toFixed(3), p.water ? 1 : 0]);
    }
    out[zc] = { line, cross };
  }
  return out;
});
function runs(line) {           // compress to [x0,x1,walk,y] runs
  const r = []; let cur = null;
  for (const [x, w, y] of line) {
    const key = w + '@' + y.toFixed(2);
    if (!cur || cur.key !== key) { cur = { key, x0: x, x1: x, w, y }; r.push(cur); } else cur.x1 = x;
  }
  return r.map(s => `x${s.x0.toFixed(1)}-${s.x1.toFixed(1)} ${s.w ? 'WALK' : 'no  '} y=${s.y.toFixed(2)}`);
}
console.log('\n=== (a) ENGINE walk profile along each Montrose finger dock row ===');
console.log('rendered deck extent: x 186.0 .. 201.0 (MT_FINGER_DOCKS x0 186 + len 15)');
for (const zc of Object.keys(prof)) {
  console.log(`\n-- row z=${zc} --`);
  for (const s of runs(prof[zc].line)) console.log('   ' + s);
  const c = prof[zc].cross;
  const walkDz = c.filter(v => v[1]).map(v => v[0]);
  console.log(`   cross @x193.5: walkable dz ${walkDz.length ? walkDz[0] + ' .. ' + walkDz[walkDz.length - 1] : 'NONE'} (deck halfW 0.95)`);
}

// ---- (b) REAL walk east along row -754 -----------------------------------
async function walkRow(zc, name) {
  await load(`x=181&z=${zc}&yaw=-1.5708&dist=7&pitch=0.28`);
  const res = await page.evaluate(async (zc) => {
    const hd = window.__hd, P = hd.player, { joy, cam } = hd.input;
    const trace = []; let frames = 0;
    await new Promise(resolve => {
      const step = () => {
        // steer EAST (+x) in camera-relative space, holding z=zc
        const dx = 1, dz = Math.max(-1, Math.min(1, (zc - P.z) * 0.5));
        const l = Math.hypot(dx, dz);
        const Fx = Math.sin(cam.yaw), Fz = Math.cos(cam.yaw), Rx = -Math.cos(cam.yaw), Rz = Math.sin(cam.yaw);
        joy.z = -((dx / l) * Fx + (dz / l) * Fz); joy.x = (dx / l) * Rx + (dz / l) * Rz; joy.len = 1;
        frames++;
        if (frames % 3 === 0) trace.push([+P.x.toFixed(2), +P.z.toFixed(2), +P.y.toFixed(2)]);
        if (frames > 900 || P.y < -1.5) { joy.x = joy.z = 0; joy.len = 0; resolve(); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    return { trace, end: [+P.x.toFixed(2), +P.z.toFixed(2), +P.y.toFixed(2)], frames };
  }, zc);
  // where did y first drop below 0?
  let dropAt = null;
  for (const [x, z, y] of res.trace) if (y < -0.5) { dropAt = [x, z, y]; break; }
  console.log(`\n=== (b) walk EAST along z=${zc}: end=(${res.end}) frames=${res.frames} ===`);
  console.log('   first y<-0.5 at ' + (dropAt ? `x=${dropAt[0]} z=${dropAt[1]} y=${dropAt[2]}` : 'never'));
  console.log('   trace (every 3rd frame, x/y): ' + res.trace.map(t => `${t[0]}/${t[2]}`).join(' '));
  await page.screenshot({ path: join(outDir, name + '.png') });
  return { dropAt, end: res.end, trace: res.trace };
}
const w754 = await walkRow(-754, 'tmp128-repro-z754');
const w714 = await walkRow(-714, 'tmp128-repro-z714');

writeFileSync(join(here, 'tmp-128-repro.json'), JSON.stringify({ prof, w754, w714 }, null, 1));
console.log('\ncanary frames: ' + canary + '  errors: ' + (errors.length ? '\n' + errors.join('\n') : 'none'));
await browser.close(); vite.kill(); process.exit(0);
