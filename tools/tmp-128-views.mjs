// tmp (128): diagnostic framings of the FIXED Montrose finger dock, aimed OFF
// the mayor (a down-the-length framing puts his body over the very seam you are
// trying to judge — the recurring "diagnostic shots must aim off-subject" trap).
// Spawns its OWN strict-port vite (PITFALLS: :5173 may be a foreign app).
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const port = +(process.argv[2] || 5251);
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
page.on('console', m => { if (m.type() === 'error' && !isNoise(m.text())) errors.push('[console.error] ' + m.text()); if (m.text().startsWith('[canary] v128')) canary++; });

// name, x, z, yaw, pitch, dist
const VIEWS = [
  ['tmp128-v1-profile-n',  192,   -754, 0,     0.10, 16],   // 16 m NORTH of the row looking S: the WHOLE dock in profile, grass->tip
  ['tmp128-v2-profile-s',  192,   -754, 3.14,  0.10, 16],   // mirrored from the S (the other flank + Perch Bait behind)
  ['tmp128-v3-seam-n',     189,   -754, 0,     0.03, 6.5],  // CLOSE + LOW + level at the seam, mayor 3.5 m east of it (PITFALLS flush-edit rule)
  ['tmp128-v4-tip-obl',    199,   -754, -2.0,  0.30, 14],   // high oblique over the TIP: end of deck, rail overhang, pilings, water below
  ['tmp128-v5-root-over',  185.5, -754, 1.57,  0.50, 6],    // looking down on the root: deck-on-grass landing around the mayor
  ['tmp128-v6-owner',      187,   -754, -0.95, 0.16, 8],    // nearest recreation of the owner's fall-through photo angle
];
for (const [name, x, z, yaw, pitch, dist] of VIEWS) {
  await page.goto(`http://localhost:${port}/?play=1&canary=v128&x=${x}&z=${z}&yaw=${yaw}&pitch=${pitch}&dist=${dist}`,
    { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
  await new Promise(r => setTimeout(r, 2600));
  const p = await page.evaluate(() => ({ x: +window.__hd.player.x.toFixed(2), y: +window.__hd.player.y.toFixed(2), z: +window.__hd.player.z.toFixed(2), draws: window.__hd.perf().drawCalls }));
  await page.screenshot({ path: join(outDir, name + '.png') });
  console.log(`${name}  player=(${p.x},${p.y},${p.z})  draws=${p.draws}`);
}
console.log('canary frames: ' + canary + '  errors: ' + (errors.length ? '\n' + errors.join('\n') : 'none'));
await browser.close(); vite.kill(); process.exit(0);
