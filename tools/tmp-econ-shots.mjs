// tmp (078): capture the economy HUD screenshots. Own vite, strict port, canary.
// Writes tools/shots/078-core-*.png. Usage: node tools/tmp-econ-shots.mjs [port]
import { spawn } from 'child_process';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const shotsDir = join(here, 'shots');
mkdirSync(shotsDir, { recursive: true });
const port = +(process.argv[2] || 5235);

const vite = spawn(process.execPath,
  [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'],
  { cwd: root });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite start timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,800', '--mute-audio'] });
const errAll = [];

// each shot gets an ISOLATED browser context so localStorage never leaks between
// shots (shared storage was accumulating bag counts + favor state across pages).
const mkCtx = () => (browser.createBrowserContext ? browser.createBrowserContext() : browser.createIncognitoBrowserContext());
async function makePage(vp) {
  const ctx = await mkCtx();
  const page = await ctx.newPage();
  await page.setViewport(vp);
  page.on('pageerror', e => errAll.push('[pageerror] ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|manifest|sw\.js|goatcounter|gc\.zgo/.test(m.text())) errAll.push('[console.error] ' + m.text()); });
  page._ctx = ctx;
  return page;
}
async function load(page, query) {
  const canary = 'shot' + Math.floor(Math.random() * 1e6);
  await page.goto(`http://localhost:${port}/?${query}&canary=${canary}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

// ---- (a) desktop chip + register pop ----
{
  const page = await makePage({ width: 1280, height: 800 });
  await load(page, 'play=1&quiet=1&dibs=12');
  await page.evaluate(() => window.__hd.econ.wallet.earnDibs(3, 'skipped a beauty'));
  await wait(350);
  await page.screenshot({ path: join(shotsDir, '078-core-a-chip.png') });
  await page.close();
}
// ---- (b) desktop tote open with a dummy item ----
{
  const page = await makePage({ width: 1280, height: 800 });
  await load(page, 'play=1&quiet=1&dibs=12');
  await page.evaluate(() => {
    const B = window.__hd.econ.bag;
    B.define({ id: 'popcorn', name: 'popcorn bag', icon: '🍿', kind: 'holdable', caption: 'crumbs fall as you walk — the birds come in close' });
    B.define({ id: 'bucket-hat', name: 'bucket hat', icon: '🧢', kind: 'cosmetic', caption: 'the mayor actually wears it' });
    B.add('popcorn', 1); B.add('bucket-hat', 1);
    B.open();
  });
  await wait(250);
  await page.screenshot({ path: join(shotsDir, '078-core-b-tote.png') });
  await page.close();
}
// ---- (c) desktop shop with 2 dummy items (one owned) ----
{
  const page = await makePage({ width: 1280, height: 800 });
  await load(page, 'play=1&quiet=1&dibs=12');
  await page.evaluate(() => {
    const B = window.__hd.econ.bag, S = window.__hd.econ.shop;
    B.define({ id: 'popcorn', name: 'popcorn bag', icon: '🍿', kind: 'holdable', caption: 'crumbs the birds love' });
    B.define({ id: 'tennis-ball', name: 'tennis ball', icon: '🎾', kind: 'holdable', caption: 'any dog will bring it back' });
    B.add('popcorn', 1);   // owned → shows the "in your tote ✓" state
    S.open({ title: 'the beach kiosk', keeper: 'sandy runs the window — cash or dibs, she says', items: [{ id: 'tennis-ball', price: 8 }, { id: 'popcorn', price: 5 }] });
  });
  await wait(250);
  await page.screenshot({ path: join(shotsDir, '078-core-c-shop.png') });
  await page.close();
}
// ---- (d-rail) mobile portrait: the tote button in the right rail (card closed) ----
{
  const page = await makePage({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await load(page, 'play=1&quiet=1&dibs=12');
  await wait(250);
  await page.screenshot({ path: join(shotsDir, '078-core-d-mobile-rail.png') });
  await page.close();
}
// ---- (d) mobile portrait: open tote card ----
{
  const page = await makePage({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await load(page, 'play=1&quiet=1&dibs=12');
  await page.evaluate(() => {
    const B = window.__hd.econ.bag;
    B.define({ id: 'popcorn', name: 'popcorn bag', icon: '🍿', kind: 'holdable', caption: 'crumbs fall as you walk — the birds come in close' });
    B.define({ id: 'bucket-hat', name: 'bucket hat', icon: '🧢', kind: 'cosmetic', caption: 'the mayor actually wears it' });
    B.add('popcorn', 1); B.add('bucket-hat', 1);
    B.open();
  });
  await wait(250);
  await page.screenshot({ path: join(shotsDir, '078-core-d-mobile-tote.png') });
  await page.close();
}
// ---- (e) mobile landscape rail sanity (no open card; show HUD layout) ----
{
  const page = await makePage({ width: 844, height: 390, isMobile: true, hasTouch: true });
  await load(page, 'play=1&quiet=1&dibs=12');
  await wait(250);
  await page.screenshot({ path: join(shotsDir, '078-core-e-landscape.png') });
  await page.close();
}
// ---- baseline sanity: canonical spawn, NO new HUD should appear ----
{
  const page = await makePage({ width: 1280, height: 800 });
  await load(page, 'play=1&quiet=1');
  await wait(3500);
  await page.screenshot({ path: join(shotsDir, '078-core-baseline-check.png') });
  await page.close();
}
// ---- onboarding regression: coach marks still appear on mobile ----
{
  const page = await makePage({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await load(page, 'play=1&coach=1');
  await wait(1200);
  const marksOn = await page.evaluate(() => ['coachWalk', 'coachLook', 'coachAct'].map(id => { const el = document.getElementById(id); return el && el.classList.contains('on'); }));
  console.log('coach marks .on (walk,look,act):', JSON.stringify(marksOn));
  await page.screenshot({ path: join(shotsDir, '078-core-coach.png') });
  await page.close();
}

console.log('\nerrors:', errAll.length ? '\n' + errAll.join('\n') : '(none)');
await browser.close();
vite.kill();
process.exit(0);
