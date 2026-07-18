// tmp (081 re-verify): re-frame the three shots 081b muffed — the page PROP
// off-axis (mayor occluded it), Gus from OUTSIDE the Park Bait shack (camera
// backed into the walls), and the ceremony crowd without the monument slab
// (lateral + three-quarter candidates). Ceremony re-runs in an INCOGNITO
// context: localStorage.clear() on a live page gets undone by the pagehide
// re-save, and an owned regalia blocks runCeremony.
// Usage: node tools/tmp-081c-reshoot.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, 'shots');
mkdirSync(outDir, { recursive: true });
const port = +(process.argv[2] || 5418);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'], { cwd: root });
await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('vite timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d)); });

const results = []; const ok = (n, p, x = '') => { results.push(p); console.log(`${p ? 'ok  ' : 'FAIL'} ${n}${x ? '  — ' + x : ''}`); };
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const errors = [], canaries = [], wantCanaries = [];
const isNoise = t => t.includes('favicon') || t.includes('404') || t.includes('manifest') || t.includes('sw.js') || t.includes('goatcounter');
const wire = pg => { pg.on('console', m => { const t = m.text(); if (m.type() === 'error' && !isNoise(t)) errors.push(t); else if (t.startsWith('[canary]')) canaries.push(t); });
  pg.on('pageerror', e => errors.push('[pageerror] ' + e.message)); };

let _cn = 0;
const mk = pg => ({
  load: async (extra = '', sx, sz) => {
    const canary = 'c' + (_cn++) + Math.floor(Math.random() * 1e5); wantCanaries.push(canary);
    const pos = (sx !== undefined) ? `&x=${sx}&z=${sz}` : '';
    await pg.goto(`http://localhost:${port}/?play=1&quiet=1${pos}&canary=${canary}${extra}`, { waitUntil: 'networkidle0', timeout: 60000 });
    await pg.waitForFunction(() => window.__hd && window.__hd.econ && window.__hd.f081 && window.__hd.mayor4real, { timeout: 15000 });
    await sleep(700);
  },
  tele: (x, z) => pg.evaluate(o => { const p = window.__hd.player; p.x = o.x; p.z = o.z; p.vx = p.vz = 0; }, { x, z }),
  aim: (tx, tz, pitch = 0.12, dist = 4.5) => pg.evaluate(o => { const p = window.__hd.player, c = window.__hd.input.cam; c.freeT = 999; c.yaw = Math.atan2(o.tx - p.x, o.tz - p.z); c.pitch = o.pitch; c.dist = o.dist; }, { tx, tz, pitch, dist }),
  press: async (key, ms = 80) => { await pg.evaluate(k => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), key); await sleep(ms); await pg.evaluate(k => window.dispatchEvent(new KeyboardEvent('keyup', { key: k })), key); await sleep(70); },
  shot: name => pg.screenshot({ path: join(outDir, name) }),
  ev: (fn, arg) => pg.evaluate(fn, arg),
});

// ---- 1. the page prop, off-axis (fresh offer so page A is visible) --------
{
  const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 }); wire(page);
  const P = mk(page);
  await P.load('&favday=20260719');
  const st = await P.ev(() => window.__hd.econ.favors.at('fieldnotes'));
  if (st.st !== 'active' || st.step !== 0) {   // 081b left it done on this profile — take a clean profile instead
    await page.close();
    const ctx = await browser.createBrowserContext();
    const p2 = await ctx.newPage(); await p2.setViewport({ width: 1280, height: 720 }); wire(p2);
    const Q = mk(p2);
    await Q.load('&favday=20260719', 204.4, -890.2);   // beside Lois
    await Q.press('e'); await sleep(600);              // offer
    const s2 = await Q.ev(() => window.__hd.econ.favors.at('fieldnotes'));
    ok('P: fieldnotes freshly offered (incognito)', s2.st === 'active' && s2.step === 0, JSON.stringify(s2));
    await Q.tele(195.15, -877.45); await sleep(600);
    await Q.aim(193.4, -878.5, 0.42, 3.0); await sleep(400);
    await Q.shot('081c-page-prop.png');
    await p2.close(); await ctx.close();
  } else {
    ok('P: fieldnotes mid-favor on main profile', true);
    await P.tele(195.15, -877.45); await sleep(600);
    await P.aim(193.4, -878.5, 0.42, 3.0); await sleep(400);
    await P.shot('081c-page-prop.png');
    await page.close();
  }
}

// ---- 2. Gus, camera OUTSIDE the shack (two candidates) --------------------
{
  const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 }); wire(page);
  const G = mk(page);
  await G.load('&favday=20260717', 181.6, -745.2);
  await sleep(400);
  await G.aim(180, -743, 0.2, 4.2); await sleep(400);     // from SE, camera backs SE toward the basin
  await G.shot('081c-gus-a.png');
  await G.tele(180.2, -746.6); await sleep(500);
  await G.aim(180, -741.2, 0.22, 4.6); await sleep(400);  // axis-aligned from due south
  await G.shot('081c-gus-b.png');
  await page.close();
}

// ---- 3. the ceremony crowd, re-framed (incognito = truly fresh save) ------
{
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage(); await page.setViewport({ width: 1280, height: 720 }); wire(page);
  const C = mk(page);
  await C.load('&dibs=40');
  ok('C: fresh profile (no regalia)', !(await C.ev(() => window.__hd.mayor4real.hasRegalia())));
  await C.ev(() => { for (const h of ['lakefront', 'wrigley', 'downtown', 'montrose']) window.__hd.mayor4real.grant(h); });
  let t0 = Date.now(); while (Date.now() - t0 < 8000 && !(await C.ev(() => window.__hd.mayor4real.armed()))) await sleep(300);
  const inter = await C.ev(() => window.__hd.mayor4real.inter);
  await C.tele(inter.x, inter.z + 1.0); await sleep(700);
  await C.press('e'); await sleep(800);
  ok('C: ceremony ran', await C.ev(() => window.__hd.mayor4real.ran()));
  t0 = Date.now(); let cr = [];
  while (Date.now() - t0 < 30000) { cr = await C.ev(() => window.__hd.mayor4real.crowd()); if (cr.length === 9 && cr.every(c => c.arrived)) break; await sleep(600); }
  ok('C: crowd arrived', cr.length === 9 && cr.every(c => c.arrived));
  // (a) lateral, down the arc from its west end — sax closes the far end
  await C.tele(103, 153.5); await sleep(400);
  await C.aim(117, 154.2, 0.24, 10); await sleep(400);
  await C.shot('081c-ceremony-lateral.png');
  // (b) three-quarter from the north-west, crowd faces (S) mostly toward camera-right
  await C.tele(110, 150.5); await sleep(400);
  await C.aim(112.5, 157.5, 0.3, 9); await sleep(400);
  await C.shot('081c-ceremony-three4.png');
  const d = await C.ev(() => window.__hd.perf().drawCalls);
  ok('C: draws <= 480 with crowd', d <= 480, 'drawCalls=' + d);
  await page.close(); await ctx.close();
}

ok('E: every canary echoed', wantCanaries.every(w => canaries.some(x => x.includes(w))), `${canaries.length}/${wantCanaries.length}`);
ok('E: zero console errors', errors.length === 0, errors.slice(0, 6).join(' | '));

const fails = results.filter(r => !r).length;
console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL RESHOOT CHECKS PASSED'));
await browser.close(); vite.kill(); process.exit(fails ? 1 : 0);
