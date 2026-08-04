// 129 executor C — gameplay-pack E2E: the reserve scope session + the plovers.
//   node tools/tmp-129-c-e2e.mjs [port]
// Runs three loads against the live dev server:
//   c1  ?rscope=1 hold  -> probe (active/fov/vignette/mayor) + 90-frame fov
//                          stability sample (the 126 two-easers check) + shot
//   c2  plain load      -> no residual zoom, mayor visible, session inactive
//   c3  cell-A framing  -> animated plovers, >=8 m off every monitor + shot
// Every run asserts zero console/page errors and a canary echo.
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const PORT = +(process.argv[2] || 5223);
const SHOTS = join(dirname(fileURLToPath(import.meta.url)), 'shots');
mkdirSync(SHOTS, { recursive: true });

const fails = [];
const ok = (cond, msg, extra) => { console.log((cond ? '  PASS ' : '  FAIL ') + msg + (extra === undefined ? '' : '  [' + extra + ']')); if (!cond) fails.push(msg); };

async function load(browser, query, waitMs = 4000) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errors = [], canary = [];
  const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
  page.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' && !isNoise(t)) errors.push('[console.error] ' + t);
    else if (t.startsWith('[canary]')) canary.push(t);
  });
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
  page.on('requestfailed', r => errors.push('[requestfailed] ' + r.url() + ' ' + (r.failure()?.errorText || '')));
  page.on('response', r => { if (r.status() >= 400 && !r.url().includes('favicon')) errors.push('[http ' + r.status() + '] ' + r.url()); });
  await page.goto('http://localhost:' + PORT + '/?' + query, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start').click(); });
  await new Promise(r => setTimeout(r, waitMs));
  return { page, errors, canary };
}

// framework.js samples E once per FRAME (actHeld -> rising edge), so a 0 ms
// keyboard.press() can land entirely between frames and be missed. Hold it.
async function tapE(page) {
  await page.keyboard.down('e');
  await new Promise(r => setTimeout(r, 400));
  await page.keyboard.up('e');
  await new Promise(r => setTimeout(r, 120));
}

async function meanLuma(file, left, top, width, height) {
  const { data } = await sharp(file).extract({ left, top, width, height }).raw().toBuffer({ resolveWithObject: true });
  let s = 0;
  for (let i = 0; i < data.length; i += 3) s += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  return s / (data.length / 3);
}

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });

// ------------------------------------------------------------ RUN c1 ----
console.log('\n== c1: ?rscope=1 hold ==');
{
  const { page, errors, canary } = await load(browser, 'play=1&x=56&z=-779&rscope=1&canary=c1');
  ok(canary.some(c => c.includes('c1')), 'canary echo', canary.join('|'));
  const probe = await page.evaluate(() => {
    const r = window.__hd && window.__hd.rscope;
    const cd = window.__hd.camDbg();
    // independent mayor check (no pack handle): main.js stamps the mayor group's
    // position onto the player every frame, and the mayor rig is NOT named
    // 'chibi' (that name is createChibi's, i.e. the NPCs) — so the scene-root
    // group sitting exactly on the player IS the mayor.
    const p = window.__hd.player; let best = null, bd = 1e9;
    for (const o of window.__hd.scene.children) {
      if (!o.isGroup || o.name === 'chibi' || !o.children.length) continue;
      const d = Math.hypot(o.position.x - p.x, o.position.z - p.z);
      if (d < bd) { bd = d; best = o; }
    }
    return { active: r ? r.active : null, looks: r ? r.looks : null, vign: r ? r.vignette : null,
      mayorVisible: r ? r.mayorVisible : null, nearestChibiVisible: best && bd < 0.6 ? best.visible : 'not-found', nearestChibiD: +bd.toFixed(2),
      fov: cd.fov, own: cd.own, wrapDisplay: (document.getElementById('reserveScope') || {}).style?.display,
      drawCalls: window.__hd.perf().drawCalls };
  });
  console.log('  probe', JSON.stringify(probe));
  ok(probe.active === true, 'rscope.active true');
  ok(probe.own === 'reserve-scope', 'camera owner is reserve-scope', probe.own);
  ok(probe.fov < 32, 'camera.fov < 32', probe.fov.toFixed(3));
  ok(probe.wrapDisplay === 'block', "vignette wrapper display 'block'", probe.wrapDisplay);
  ok(probe.mayorVisible === false, 'mayor hidden (mayor.visible false)');
  ok(probe.nearestChibiVisible === false, 'mayor hidden (nearest chibi in scene invisible)', 'd=' + probe.nearestChibiD);
  ok(probe.looks === 1, 'looks counter == 1', probe.looks);

  // 126 vibration check: sample the RENDERED fov once per rAF for 90 frames
  const samples = await page.evaluate(() => new Promise(res => {
    const out = []; let n = 0;
    const tick = () => { out.push(window.__hd.camDbg().fov); if (++n < 90) requestAnimationFrame(tick); else res(out); };
    requestAnimationFrame(tick);
  }));
  const mn = Math.min(...samples), mx = Math.max(...samples);
  ok(mx - mn < 0.2, 'fov stable over 90 frames (max-min < 0.2)', (mx - mn).toFixed(5) + ' min=' + mn.toFixed(3) + ' max=' + mx.toFixed(3));

  const file = join(SHOTS, '129-c-scope.png');
  await page.screenshot({ path: file });
  const centre = await meanLuma(file, 540, 260, 200, 200);
  const edgeTL = await meanLuma(file, 8, 8, 120, 120);
  const edgeBR = await meanLuma(file, 1152, 592, 120, 120);
  ok(centre > edgeTL + 20 && centre > edgeBR + 20, 'vignette HOLE is lit, edges are dark',
    'centre=' + centre.toFixed(1) + ' tl=' + edgeTL.toFixed(1) + ' br=' + edgeBR.toFixed(1));
  console.log('  SHOT ' + file + '  draws=' + probe.drawCalls);
  ok(errors.length === 0, 'zero console/page errors', errors.join(' | '));
  await page.close();
}

// ------------------------------------------------------------ RUN c2 ----
console.log('\n== c2: plain load at the deck (no hold) ==');
{
  const { page, errors, canary } = await load(browser, 'play=1&x=56&z=-779&canary=c2');
  ok(canary.some(c => c.includes('c2')), 'canary echo', canary.join('|'));
  const probe = await page.evaluate(() => {
    const r = window.__hd.rscope, cd = window.__hd.camDbg();
    return { active: r.active, fov: cd.fov, own: cd.own, mayorVisible: r.mayorVisible, vign: r.vignette, looks: r.looks };
  });
  console.log('  probe', JSON.stringify(probe));
  ok(probe.active === false, 'session inactive');
  ok(probe.own === null, 'main.js owns the camera', probe.own);
  ok(probe.fov > 45 && probe.fov < 55, 'fov back at baseFov (no residual zoom)', probe.fov.toFixed(3));
  ok(probe.mayorVisible === true, 'mayor visible');
  ok(probe.vign === 'none', 'vignette hidden', probe.vign);
  ok(errors.length === 0, 'zero console/page errors', errors.join(' | '));
  await page.close();
}

// ------------------------------------------------------------ RUN c3 ----
console.log('\n== c3: cell-A framing, the plovers ==');
{
  const { page, errors, canary } = await load(browser, 'play=1&x=80&z=-776&yaw=-2.88&pitch=0.08&dist=7&canary=c3');
  ok(canary.some(c => c.includes('c3')), 'canary echo', canary.join('|'));
  const a = await page.evaluate(() => ({ shown: window.__hd.rscope.birdsShown, birds: window.__hd.rscope.birds() }));
  await new Promise(r => setTimeout(r, 2500));
  const b = await page.evaluate(() => ({ birds: window.__hd.rscope.birds(),
    mon: window.__hd.scene ? null : null }));
  console.log('  t0 ' + JSON.stringify(a.birds));
  console.log('  t1 ' + JSON.stringify(b.birds));
  ok(a.shown === true, 'birds group visible inside the 140 m gate');
  const moved = a.birds.some((p, i) => Math.hypot(p.x - b.birds[i].x, p.z - b.birds[i].z) > 0.05);
  ok(moved, 'at least one plover moved between samples (animated)');
  const MONS = [[84, -778], [150, -761]];
  const CELLS = [[62, 90, -802, -780], [114, 140, -740, -716]];
  let minD = 1e9, allInCell = true;
  for (const p of b.birds) {
    for (const m of MONS) minD = Math.min(minD, Math.hypot(p.x - m[0], p.z - m[1]));
    allInCell = allInCell && CELLS.some(c => p.x >= c[0] && p.x <= c[1] && p.z >= c[2] && p.z <= c[3]);
  }
  ok(minD >= 8, 'every plover >= 8 m from every monitor', 'min=' + minD.toFixed(2));
  ok(allInCell, 'every plover inside its roped nest cell');
  const file = join(SHOTS, '129-c-plovers.png');
  await page.screenshot({ path: file });
  console.log('  SHOT ' + file);
  ok(errors.length === 0, 'zero console/page errors', errors.join(' | '));
  await page.close();
}

// -------------------------------------------------- far-cull sanity -----
console.log('\n== c4: 140 m distance gate ==');
{
  const { page, errors, canary } = await load(browser, 'play=1&x=180&z=-400&canary=c4', 3000);
  ok(canary.some(c => c.includes('c4')), 'canary echo', canary.join('|'));
  const shown = await page.evaluate(() => window.__hd.rscope.birdsShown);
  ok(shown === false, 'birds hidden 370 m away', shown);
  ok(errors.length === 0, 'zero console/page errors', errors.join(' | '));
  await page.close();
}

// ------------------------------------------- real E presses (no hatch) --
console.log('\n== c5: press E on the deck -> enter, press E again -> exit ==');
{
  const { page, errors, canary } = await load(browser, 'play=1&x=56&z=-779&canary=c5');
  ok(canary.some(c => c.includes('c5')), 'canary echo', canary.join('|'));
  const pill = await page.evaluate(() => { const p = document.getElementById('prompt'); return { disp: p && getComputedStyle(p).display, label: (document.getElementById('promptlabel') || {}).textContent }; });
  console.log('  prompt', JSON.stringify(pill));
  await tapE(page);
  await new Promise(r => setTimeout(r, 900));
  const on = await page.evaluate(() => ({ active: window.__hd.rscope.active, fov: window.__hd.camDbg().fov, looks: window.__hd.rscope.looks, mayor: window.__hd.rscope.mayorVisible }));
  ok(on.active === true, 'E entered the scope session', JSON.stringify(on));
  ok(on.fov < 32, 'fov zoomed in after E', on.fov.toFixed(2));
  await tapE(page);
  await new Promise(r => setTimeout(r, 3000));   // main.js's single-writer ease needs a beat to converge home
  const off = await page.evaluate(() => ({ active: window.__hd.rscope.active, fov: window.__hd.camDbg().fov, own: window.__hd.camDbg().own, mayor: window.__hd.rscope.mayorVisible, vign: window.__hd.rscope.vignette }));
  console.log('  after exit', JSON.stringify(off));
  ok(off.active === false, 'second E exited the session');
  ok(off.own === null, 'camera handed back to main.js', off.own);
  ok(off.mayor === true && off.vign === 'none', 'mayor back, vignette hidden');
  ok(Math.abs(off.fov - 50) < 0.4, 'fov eased home to baseFov (no residual zoom)', off.fov.toFixed(3));
  // and it must SETTLE there — a second easer shows up as a per-frame wobble
  const post = await page.evaluate(() => new Promise(res => {
    const out = []; let n = 0;
    const tick = () => { out.push(window.__hd.camDbg().fov); if (++n < 90) requestAnimationFrame(tick); else res(out); };
    requestAnimationFrame(tick);
  }));
  const pmn = Math.min(...post), pmx = Math.max(...post);
  ok(pmx - pmn < 0.2 && Math.abs(pmx - 50) < 0.4, 'fov settled after release (no second writer)',
    'spread=' + (pmx - pmn).toFixed(5) + ' max=' + pmx.toFixed(3));
  ok(errors.length === 0, 'zero console/page errors', errors.join(' | '));
  await page.close();
}

console.log('\n== c6: the cell-A placard ==');
{
  const { page, errors, canary } = await load(browser, 'play=1&x=76&z=-778&canary=c6', 5500);
  ok(canary.some(c => c.includes('c6')), 'canary echo', canary.join('|'));
  const label = await page.evaluate(() => (document.getElementById('promptlabel') || {}).textContent);
  ok(label === 'read the placard', 'placard prompt in range', label);
  const used0 = await page.evaluate(() => window.__hd.gstate.interactionsUsed);
  await tapE(page);
  await new Promise(r => setTimeout(r, 900));
  const t1 = await page.evaluate(() => ({ facts: window.__hd.rscope.facts, used: window.__hd.gstate.interactionsUsed, toast: (document.getElementById('toastMain') || {}).textContent }));
  await tapE(page);
  await new Promise(r => setTimeout(r, 900));
  const t2 = await page.evaluate(() => window.__hd.rscope.facts);
  console.log('  interactionsUsed ' + used0 + ' -> ' + t1.used);
  console.log('  facts', JSON.stringify(t1), '->', t2);
  ok(t1.facts === 1 && t2 === 2, 'E cycles placard facts into the journal counter');
  ok(!!t1.toast, 'a fact toast fired', t1.toast);
  ok(errors.length === 0, 'zero console/page errors', errors.join(' | '));
  await page.close();
}

await browser.close();
console.log('\n' + (fails.length ? 'FAILURES (' + fails.length + '): ' + fails.join(' ; ') : 'ALL GREEN'));
process.exit(fails.length ? 1 : 0);
