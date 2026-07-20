// tmp: task 108 verification — teach the first E/tap press (pulsing pill + caption).
// Self-contained: spawns its OWN vite (tools default to 5173 which a session may
// own — PITFALLS), canary-gates, runs every scenario, kills vite, exits.
//   node tools/tmp-108-verify.mjs
import { spawn } from 'child_process';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dir = join(here, 'shots', '108');
mkdirSync(dir, { recursive: true });

// ---- own vite; parse the ACTUAL port ----
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: root });
const port = await new Promise((res, rej) => {
  let buf = '';
  const to = setTimeout(() => rej(new Error('vite no port in 30s:\n' + buf)), 30000);
  vite.stdout.on('data', d => { buf += d.toString(); const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/); if (m) { clearTimeout(to); res(m[1]); } });
  vite.stderr.on('data', d => { buf += d.toString(); });
  vite.on('exit', c => rej(new Error('vite exited early (' + c + '):\n' + buf)));
});
const killVite = () => { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill(); };
const base = `http://localhost:${port}/`;
console.log('vite on port ' + port);

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const wait = ms => new Promise(r => setTimeout(r, ms));
const errs = [], canary = [];
function watch(page, tag) {
  page.on('pageerror', e => errs.push(`[${tag} pageerror] ` + e.message));
  page.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' && !t.includes('favicon') && !t.includes('404')) errs.push(`[${tag} console.error] ` + t);
    else if (t.startsWith('[canary]')) canary.push(t);
  });
}
async function fresh() {   // isolated storage per scenario
  const ctx = (browser.createBrowserContext || browser.createIncognitoBrowserContext).call(browser);
  return await ctx;
}
async function load(page, query) {
  await page.goto(base + '?' + query, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
}
const firste = page => page.evaluate(() => ({ ...window.__hd.firste(), pulse: !!document.getElementById('prompt')?.classList.contains('teachpulse'), caption: document.getElementById('coachPress')?.textContent }));

// ===================== A. CANARY =====================
{
  const ctx = await fresh(); const page = await ctx.newPage(); watch(page, 'canary');
  await load(page, 'play=1&canary=c108');
  await wait(1200);
  await ctx.close();
}

// ===================== B. DESKTOP — walk the spawn→box line =====================
{
  const ctx = await fresh(); const page = await ctx.newPage(); watch(page, 'desk-walk');
  await page.setViewport({ width: 1280, height: 720 });
  await load(page, 'play=1&x=109.5&z=156.6&firste=1');
  await wait(700);
  const atSpawn = await firste(page);                 // out of range: pill down, no teach
  await page.keyboard.down('w'); await wait(1400); await page.keyboard.up('w');
  await wait(350);
  const nearBox = await firste(page);                 // in range: pill up, teach + pulse
  const pos = await page.evaluate(() => ({ x: +window.__hd.player.x.toFixed(1), z: +window.__hd.player.z.toFixed(1) }));
  await page.screenshot({ path: join(dir, 'desk-teach.png') });
  console.log('B desk atSpawn=%j nearBox=%j pos=%j', atSpawn, nearBox, pos);
  await ctx.close();
}

// ===================== C. DESKTOP — spawn is CLEAR (baseline safety) =====================
{
  const ctx = await fresh(); const page = await ctx.newPage(); watch(page, 'spawn-clear');
  await page.setViewport({ width: 1280, height: 720 });
  await load(page, 'play=1&firste=1');                // default spawn, forced-on
  await wait(900);
  const s = await firste(page);                       // pill down at spawn -> no teach
  await page.screenshot({ path: join(dir, 'spawn-clear.png') });
  console.log('C spawn(should up=false,teaching=false)=%j', s);
  await ctx.close();
}

// ===================== D. DEFAULT-OFF under play=1 (no firste) near box =====================
{
  const ctx = await fresh(); const page = await ctx.newPage(); watch(page, 'default-off');
  await page.setViewport({ width: 1280, height: 720 });
  await load(page, 'play=1&x=114&z=157.5');           // in range, but NO firste -> disabled under play
  await wait(900);
  const s = await firste(page);                       // pill up, but enabled=false -> no teach
  await page.screenshot({ path: join(dir, 'default-off.png') });
  console.log('D default-off(should enabled=false,teaching=false,up=true)=%j', s);
  await ctx.close();
}

// ===================== E. TOUCH — pill + caption near box =====================
{
  const ctx = await fresh(); const page = await ctx.newPage(); watch(page, 'touch');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await load(page, 'play=1&x=114&z=157.5&firste=1&coach=0');
  await wait(1000);
  const s = await firste(page);
  const rects = await page.evaluate(() => {
    const r = el => { const b = document.getElementById(el)?.getBoundingClientRect(); return b ? { x: +b.x.toFixed(0), r: +b.right.toFixed(0), y: +b.y.toFixed(0), b: +b.bottom.toFixed(0) } : null; };
    return { prompt: r('prompt'), coach: r('coachPress'), jzone: r('jzone') };
  });
  const overlap = rects.prompt && rects.jzone && !(rects.prompt.r <= rects.jzone.x || rects.prompt.x >= rects.jzone.r);
  await page.screenshot({ path: join(dir, 'touch-teach.png') });
  console.log('E touch=%j rects=%j pill/joystick-overlap=%s', s, rects, overlap);
  await ctx.close();
}

// ===================== F. prefersCalm — static pill, NO pulse =====================
{
  const ctx = await fresh(); const page = await ctx.newPage(); watch(page, 'calm');
  await page.setViewport({ width: 1280, height: 720 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await load(page, 'play=1&x=114&z=157.5&firste=1');
  await wait(900);
  const s = await firste(page);
  const calm = await page.evaluate(() => window.__hd.settings ? window.__hd.settings().calm : null);
  await page.screenshot({ path: join(dir, 'calm-teach.png') });
  console.log('F calm=%s teach(should teaching=true,pulse=FALSE)=%j', calm, s);
  await ctx.close();
}

// ===================== G. RELOAD after E press shows NEITHER =====================
{
  const ctx = await fresh(); const page = await ctx.newPage(); watch(page, 'reload');
  await page.setViewport({ width: 1280, height: 720 });
  await load(page, 'play=1&x=114&z=157.5&firste=1');
  await wait(800);
  const before = await firste(page);                  // teach up
  await page.keyboard.down('e'); await wait(160); await page.keyboard.up('e');   // fire the box interaction
  await wait(900);                                     // let the 600ms save debounce flush
  const afterPress = await firste(page);              // flag set, teach cleared
  // reload the SAME url in the SAME context -> localStorage persists
  await load(page, 'play=1&x=114&z=157.5&firste=1');
  await wait(900);
  const afterReload = await firste(page);             // done, no teach, plain pill still up
  await page.screenshot({ path: join(dir, 'reload-clear.png') });
  console.log('G before=%j afterPress=%j afterReload=%j', before, afterPress, afterReload);
  await ctx.close();
}

await browser.close();
killVite();
console.log('CANARY ' + (canary.join(' | ') || '(none)'));
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO PAGE ERRORS');
process.exit(0);
