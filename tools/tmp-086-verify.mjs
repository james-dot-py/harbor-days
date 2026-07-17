// Task 086 city-map + breadcrumb E2E. Asserts both inputs (M key, minimap tap,
// landmark tap at 390px), the chevron's bearing/fade/tick-down, cross-cell legs
// via the departure boards, persistence across a real Red Line ride, arrival
// auto-clear, card exclusivity, and draw-call neutrality (+0).
//   node tools/tmp-086-verify.mjs [port]
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { join } from 'path';

const PORT = +(process.argv[2] || 5186);
const BASE = `http://localhost:${PORT}/`;
const DIR = join('tools', 'shots', '086');
mkdirSync(DIR, { recursive: true });

const results = [];
const ok = (name, cond, extra = '') => { results.push((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); return cond; };
const near = (a, b, eps) => Math.abs(a - b) < eps;
const sleep = ms => new Promise(r => setTimeout(r, ms));

let errors = [], canaries = [];
function hook(page) {
  page.on('console', m => {
    const t = m.text();
    if (t.startsWith('[canary]')) canaries.push(t);
    if (m.type() === 'error' && !t.includes('favicon') && !t.includes('404')) errors.push('[console.error] ' + t);
  });
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
}
const ev = (page, fn, ...a) => page.evaluate(fn, ...a);
const crumb = page => ev(page, () => window.__hd.crumb.state());
const mapOpen = page => ev(page, () => window.__hd.citymap.isOpen());
const holdKey = async (page, k) => { await page.keyboard.down(k); await sleep(170); await page.keyboard.up(k); await sleep(150); };

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1300,860', '--mute-audio'] });

  // ================= 1) DESKTOP =================
  {
    const page = await browser.newPage();
    hook(page);
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(BASE + '?play=1&canary=086', { waitUntil: 'networkidle0', timeout: 60000 });
    await sleep(2600);
    ok('canary echoed', canaries.some(c => c.includes('086')), canaries.join(','));
    ok('__hd.citymap + __hd.crumb present', await ev(page, () => !!(window.__hd.citymap && window.__hd.crumb)));

    // --- M key opens the card ---
    await holdKey(page, 'm');
    ok('M opens the city map', await mapOpen(page));
    await sleep(400);
    await page.screenshot({ path: join(DIR, 'desktop-card.png') });
    const pois = await ev(page, () => window.__hd.citymap.pois());
    for (const id of ['bean', 'rink', 'wrigley', 'magic-hedge', 'harbor', 'rocks', 'lolla', 'stop-belmont', 'stop-addison', 'stop-monroe'])
      ok(`poi '${id}' on the card`, pois.includes(id));
    ok('a full city of pois (>= 26)', pois.length >= 26, 'got ' + pois.length);

    // --- landmark CLICK (real mouse) sets the heading + closes the card ---
    const rocksXY = await ev(page, () => window.__hd.citymap.poiScreen('rocks'));
    await page.mouse.click(rocksXY[0], rocksXY[1]);
    await sleep(300);
    let st = await crumb(page);
    ok('landmark click sets the breadcrumb', st.id === 'rocks', JSON.stringify(st));
    ok('card closes on selection', !(await mapOpen(page)));
    ok('chevron visible, same-cell (no train)', st.visible && !st.train);

    // --- bearing truth: rocks (150,150) due EAST of (100,150) ---
    await ev(page, () => { const p = window.__hd.player; p.x = 100; p.z = 150; p.vx = p.vz = 0; });
    await ev(page, () => { window.__hd.input.cam.yaw = 0; window.__hd.input.cam.freeT = 5; });  // face SOUTH
    await sleep(250);
    st = await crumb(page);
    ok('facing south, an east target reads phi ≈ -π/2 (left edge)', near(st.phi, -Math.PI / 2, 0.25), 'phi=' + st.phi.toFixed(3));
    ok('honest meters ≈ 50', near(st.dist, 50, 3), 'dist=' + st.dist.toFixed(1));
    const leftPos = await ev(page, () => parseFloat(document.getElementById('crumb').style.left));
    ok('chevron sits left of centre', leftPos < 640 - 300, 'left=' + leftPos);
    ok('not faded while off-target', !st.faceon);
    await page.screenshot({ path: join(DIR, 'desktop-crumb-left.png') });
    // face the target -> docks top-centre + fades
    await ev(page, () => { window.__hd.input.cam.yaw = Math.PI / 2; window.__hd.input.cam.freeT = 5; });
    await sleep(600);
    st = await crumb(page);
    const pos2 = await ev(page, () => ({ l: parseFloat(document.getElementById('crumb').style.left), t: parseFloat(document.getElementById('crumb').style.top) }));
    ok('facing the target: phi ≈ 0', near(st.phi, 0, 0.25), 'phi=' + st.phi.toFixed(3));
    ok('facing the target: chevron docks top-centre + fades', st.faceon && near(pos2.l, 640, 60) && pos2.t < 300, JSON.stringify(pos2));
    await page.screenshot({ path: join(DIR, 'desktop-crumb-faceon.png') });

    // --- distance ticks down while walking toward it ---
    const d0 = (await crumb(page)).dist;
    await page.keyboard.down('w'); await sleep(1500); await page.keyboard.up('w'); await sleep(200);
    const d1 = (await crumb(page)).dist;
    ok('distance ticks down while walking', d1 < d0 - 3, `d0=${d0.toFixed(1)} d1=${d1.toFixed(1)}`);

    // --- draw budget +0: chevron on vs cleared, same camera. The world is
    // live (birds/NPCs drift through the frustum, ±1-2 calls frame to frame),
    // so compare MEDIANS over ~1 s, not single frames.
    const median = async () => {
      const s = [];
      for (let i = 0; i < 7; i++) { s.push(await ev(page, () => window.__hd.perf().drawCalls)); await sleep(140); }
      return s.sort((a, b) => a - b)[3];
    };
    const dc1 = await median();
    await ev(page, () => window.__hd.crumb.clear());
    await sleep(250);
    const dc2 = await median();
    ok('draw calls unchanged by the chevron (+0, ±2 world noise)', Math.abs(dc1 - dc2) <= 2, `on=${dc1} off=${dc2}`);

    // --- tap-again clears (via the card) ---
    await holdKey(page, 'm');
    const hedgeXY = await ev(page, () => window.__hd.citymap.poiScreen('magic-hedge'));
    await page.mouse.click(hedgeXY[0], hedgeXY[1]);
    await sleep(250);
    ok('second landmark set', (await crumb(page)).id === 'magic-hedge');
    await holdKey(page, 'm');
    await page.mouse.click(hedgeXY[0], hedgeXY[1]);
    await sleep(250);
    st = await crumb(page);
    ok('tapping the same landmark again clears it', st.id == null && !st.visible, JSON.stringify(st));
    ok('card stays open on clear (shows the cleared state)', await mapOpen(page));

    // --- Esc closes the map and does NOT pop settings (anyCardOpen guard) ---
    await page.keyboard.press('Escape');
    await sleep(250);
    const esc = await ev(page, () => ({ map: window.__hd.citymap.isOpen(), set: document.getElementById('settings').classList.contains('show') }));
    ok('Esc closes the map without popping settings', !esc.map && !esc.set, JSON.stringify(esc));

    // --- one card at a time: J folds the map away ---
    await holdKey(page, 'm');
    await holdKey(page, 'j');
    const oneCard = await ev(page, () => ({ map: window.__hd.citymap.isOpen(), j: document.getElementById('journal').classList.contains('show') }));
    ok('journal over the map folds the map away', oneCard.j && !oneCard.map, JSON.stringify(oneCard));
    await page.keyboard.press('Escape'); await sleep(200);
    await ev(page, () => document.getElementById('journal').classList.remove('show'));

    // --- cross-cell: the bean from the lakefront points at the Belmont board ---
    await ev(page, () => window.__hd.crumb.set('bean'));
    await sleep(250);
    st = await crumb(page);
    const expDist = await ev(page, () => { const p = window.__hd.player; return Math.hypot(16 - p.x, 111 - p.z); });
    ok('cross-cell leg: train glyph on', st.train === true, JSON.stringify(st));
    ok('cross-cell leg: distance = to the Belmont board', near(st.dist, expDist, 2), `dist=${st.dist.toFixed(1)} exp=${expDist.toFixed(1)}`);
    const subTxt = await ev(page, () => document.getElementById('crumbSub').textContent);
    ok('label names the boarding stop', subTxt.includes('belmont'), subTxt);
    await page.screenshot({ path: join(DIR, 'desktop-crumb-train.png') });

    // --- ride the L for real; the heading persists and hands off ---
    await ev(page, () => { const p = window.__hd.player; p.x = 17.5; p.z = 111; p.vx = p.vz = 0; });
    await sleep(1700);                                     // settle: never trust a teleport's first prompt (082)
    let prompt = '';
    for (let i = 0; i < 20; i++) {
      prompt = await ev(page, () => document.getElementById('promptlabel').textContent || '');
      if (prompt.includes('Monroe')) break;
      await sleep(250);
    }
    ok('at the Monroe board (prompt reads it)', prompt.includes('Monroe'), prompt);
    await holdKey(page, 'e');
    await sleep(3200);
    st = await crumb(page);
    ok('chevron rests while riding', !st.visible, JSON.stringify(st));
    await sleep(9500);
    const cellNow = await ev(page, () => window.__hd.citymap.cell());
    ok('arrived downtown', cellNow === 'millennium', cellNow);
    await sleep(1200);
    st = await crumb(page);
    ok('heading persisted across the ride, now direct', st.id === 'bean' && st.visible && !st.train, JSON.stringify(st));
    await page.screenshot({ path: join(DIR, 'desktop-crumb-arrived.png') });

    // --- the map downtown: you-are-here in the inset ---
    await holdKey(page, 'm');
    ok('map opens downtown', await mapOpen(page));
    await sleep(400);
    await page.screenshot({ path: join(DIR, 'desktop-card-downtown.png') });
    await holdKey(page, 'm');

    // --- arrival auto-clear within 12 m ---
    await ev(page, () => { const p = window.__hd.player; p.x = 80; p.z = 798; p.vx = p.vz = 0; });
    await sleep(900);
    st = await crumb(page);
    ok('arrival auto-clears the compass', st.id == null && !st.visible, JSON.stringify(st));
    let toastTxt = '';                                     // toasts QUEUE ~3 s each (082) — poll, never sample once
    for (let i = 0; i < 40; i++) {
      toastTxt = await ev(page, () => document.getElementById('toastMain').textContent || '');
      if (toastTxt.includes('bean')) break;
      await sleep(300);
    }
    ok('arrival toast greets the landmark', toastTxt.includes('bean'), toastTxt);

    await page.close();
  }

  // ================= 2) MOBILE portrait 390x844 =================
  {
    const page = await browser.newPage();
    hook(page);
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(BASE + '?play=1&canary=086', { waitUntil: 'networkidle0', timeout: 60000 });
    await sleep(2600);

    // --- minimap tap opens the card ---
    const mm = await ev(page, () => { const b = document.getElementById('mmc').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
    await page.touchscreen.tap(mm.x, mm.y);
    await sleep(400);
    ok('minimap tap opens the card (390px)', await mapOpen(page));
    const cardRect = await ev(page, () => { const b = document.querySelector('.mapcard').getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
    ok('card fits the 390px viewport', cardRect.x >= 0 && cardRect.y >= 0 && cardRect.x + cardRect.w <= 390.5 && cardRect.y + cardRect.h <= 844.5, JSON.stringify(cardRect));
    await page.screenshot({ path: join(DIR, 'mobile-card.png') });

    // --- landmark tap at 390px ---
    const dogXY = await ev(page, () => window.__hd.citymap.poiScreen('dog-beach'));
    await page.touchscreen.tap(dogXY[0], dogXY[1]);
    await sleep(350);
    const st = await crumb(page);
    ok('landmark tap at 390px sets the breadcrumb', st.id === 'dog-beach', JSON.stringify(st));
    ok('chevron never a tap target (pointer-events none)', (await ev(page, () => getComputedStyle(document.getElementById('crumb')).pointerEvents)) === 'none');
    await sleep(400);
    await page.screenshot({ path: join(DIR, 'mobile-crumb.png') });

    // --- backdrop tap closes (origin-guarded) ---
    await page.touchscreen.tap(mm.x, mm.y);
    await sleep(350);
    ok('minimap tap reopens', await mapOpen(page));
    await page.touchscreen.tap(195, 30);                    // backdrop above the card
    await sleep(350);
    ok('backdrop tap closes the card', !(await mapOpen(page)));
    await page.close();
  }

  // ================= 3) MOBILE landscape 844x390 =================
  {
    const page = await browser.newPage();
    hook(page);
    await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(BASE + '?play=1&canary=086', { waitUntil: 'networkidle0', timeout: 60000 });
    await sleep(2600);
    await ev(page, () => window.__hd.citymap.open());
    await sleep(400);
    const r = await ev(page, () => { const b = document.querySelector('.mapcard').getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
    ok('landscape: card fits the viewport', r.x >= 0 && r.y >= 0 && r.x + r.w <= 844.5 && r.y + r.h <= 390.5, JSON.stringify(r));
    await page.screenshot({ path: join(DIR, 'mobile-landscape-card.png') });
    await page.close();
  }

  await browser.close();
  console.log('\n===== RESULTS =====');
  for (const r of results) console.log(r);
  console.log('\nERRORS:', errors.length ? '\n' + errors.join('\n') : 'none');
  const fails = results.filter(r => r.startsWith('FAIL')).length;
  console.log('\n' + (fails === 0 && errors.length === 0 ? 'ALL GREEN' : `${fails} FAIL(S), ${errors.length} ERROR(S)`));
  process.exitCode = (fails === 0 && errors.length === 0) ? 0 : 1;
}
main();
