// tmp: task 087 verification — name-your-mayor card + idle charm.
// Usage: node tools/tmp-087-verify.mjs <port>
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const port = process.argv[2] || '5231';
const dir = join(dirname(fileURLToPath(import.meta.url)), 'shots', '087');
mkdirSync(dir, { recursive: true });
const base = `http://localhost:${port}/`;

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const errs = [];
function watch(page, tag) {
  page.on('pageerror', e => errs.push(`[${tag} pageerror] ` + e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('favicon') && !m.text().includes('404')) errs.push(`[${tag} console.error] ` + m.text()); });
}
async function load(page, query) {
  await page.goto(base + '?' + query, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

// ---------- 1. NAME CARD at 390px (mobile) + sanitize + denylist + persist ----
{
  const page = await browser.newPage();
  watch(page, 'name');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await load(page, 'play=1&name=1&coach=0&canary=n087');
  await wait(1600);
  const shown = await page.evaluate(() => document.getElementById('naming')?.classList.contains('show'));
  await page.screenshot({ path: join(dir, 'name-card-390.png') });

  // live typing keeps an INTERNAL space + apostrophe, strips digits/symbols, ≤12
  await page.focus('#nameInput');
  await page.type('#nameInput', "Sam 0'Br1en!!<x>", { delay: 12 });
  const typed = await page.evaluate(() => document.getElementById('nameInput').value);
  await page.screenshot({ path: join(dir, 'name-card-filled-390.png') });

  // denylist: a blocked word is refused (card shakes, input cleared), name NOT set
  await page.evaluate(() => { document.getElementById('nameInput').value = 'shithead'; });
  await page.evaluate(() => document.getElementById('nameOk').click());
  await wait(60);
  const afterDeny = await page.evaluate(() => ({
    val: document.getElementById('nameInput').value,
    stored: window.__hd?.flags?.get('ope.name.v1'),
    seen: window.__hd?.flags?.get('ope.named.v1'),
  }));

  // a good name submits, persists, closes the card
  await page.evaluate(() => { document.getElementById('nameInput').value = "Sam O'Brien"; });
  await page.evaluate(() => document.getElementById('nameOk').click());
  await wait(120);
  const afterOk = await page.evaluate(() => ({
    open: document.getElementById('naming').classList.contains('show'),
    stored: window.__hd?.flags?.get('ope.name.v1'),
    seen: window.__hd?.flags?.get('ope.named.v1'),
  }));
  console.log('NAME shown=%s typed=%j afterDeny=%j afterOk=%j', shown, typed, afterDeny, afterOk);
  await page.close();
}

// ---------- 2. JOURNAL signature carries the name ----
{
  const page = await browser.newPage();
  watch(page, 'journal');
  await page.setViewport({ width: 1280, height: 720 });
  await load(page, 'play=1&coach=0&canary=j087');
  await wait(1200);
  await page.evaluate(() => window.__hd.flags.set('ope.name.v1', "Sam O'Brien"));
  await page.keyboard.down('j'); await wait(160); await page.keyboard.up('j');
  await wait(300);
  const sign = await page.evaluate(() => document.querySelector('#journalBody .jsign')?.textContent || '(none)');
  await page.screenshot({ path: join(dir, 'journal-name.png') });
  console.log('JOURNAL sign=%j', sign);
  await page.close();
}

// ---------- 3. IDLE — stretch (held) ----
{
  const page = await browser.newPage();
  watch(page, 'idle-stretch');
  await page.setViewport({ width: 1280, height: 720 });
  await load(page, 'play=1&idle=yawn&coach=0&canary=is087');
  await wait(5000);
  await page.screenshot({ path: join(dir, 'idle-stretch.png') });
  const st = await page.evaluate(() => ({ y: window.__hd?.player?.y, headRotX: null }));
  console.log('IDLE-STRETCH captured', JSON.stringify(st));
  await page.close();
}

// ---------- 4. IDLE — sit + ambient critter ----
{
  const page = await browser.newPage();
  watch(page, 'idle-sit');
  await page.setViewport({ width: 1280, height: 720 });
  await load(page, 'play=1&idle=sit&coach=0&canary=isit087');
  await wait(9000);
  await page.screenshot({ path: join(dir, 'idle-sit.png') });
  // critter present + visible?
  const critter = await page.evaluate(() => {
    let found = null;
    window.__hd.scene.traverse(o => { if (o.name === 'idle-critter') found = { visible: o.visible, y: +o.position.y.toFixed(2) }; });
    return found;
  });
  console.log('IDLE-SIT critter=%j', critter);
  await page.close();
}

// ---------- 5. IDLE stays OFF under plain play=1 (tooling parity) ----
{
  const page = await browser.newPage();
  watch(page, 'idle-off');
  await page.setViewport({ width: 1280, height: 720 });
  await load(page, 'play=1&coach=0&canary=off087');
  await wait(6000);
  const critterOff = await page.evaluate(() => {
    let found = 'no-node';
    window.__hd.scene.traverse(o => { if (o.name === 'idle-critter') found = o.visible; });
    return found;
  });
  console.log('IDLE-OFF critter(should be no-node/false)=%j', critterOff);
  await page.close();
}

console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO PAGE ERRORS');
await browser.close();
