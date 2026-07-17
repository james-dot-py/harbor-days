// Task 085 settings-card E2E. Asserts every control changes what it claims via
// __hd.settings, plus persistence across reload, the audio-gesture chain, and
// functional look-sensitivity / invert-Y drags. Also captures card screenshots.
//   node tools/tmp-085-verify.mjs [port]
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { join } from 'path';

const PORT = +(process.argv[2] || 5191);
const BASE = `http://localhost:${PORT}/`;
const DIR = join('tools', 'shots', '085');
mkdirSync(DIR, { recursive: true });

const results = [];
const ok = (name, cond, extra = '') => { results.push((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); return cond; };
const near = (a, b, eps = 1e-4) => Math.abs(a - b) < eps;

let errors = [];
function hook(page) {
  page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !t.includes('favicon') && !t.includes('404')) errors.push('[console.error] ' + t); });
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
}
const snap = page => page.evaluate(() => window.__hd && window.__hd.settings ? window.__hd.settings() : null);
const setRange = (page, id, v) => page.evaluate((id, v) => { const e = document.getElementById(id); e.value = String(v); e.dispatchEvent(new Event('input', { bubbles: true })); }, id, v);
const setCheck = (page, id, on) => page.evaluate((id, on) => { const e = document.getElementById(id); e.checked = on; e.dispatchEvent(new Event('change', { bubbles: true })); }, id, on);
const click = (page, id) => page.evaluate(id => document.getElementById(id).click(), id);

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,800', '--mute-audio'] });

  // ---------- 1) DESKTOP: control wiring via __hd.settings ----------
  {
    const page = await browser.newPage();
    hook(page);
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });   // dsf2 so low-power DPR flip is observable
    await page.goto(BASE + '?play=1&canary=085', { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2500));

    const canary = await page.evaluate(() => performance.getEntriesByType ? true : true);
    // canary comes through console; capture via a fresh listener isn't needed — assert __hd present
    ok('desktop __hd.settings present', !!(await snap(page)));

    const base = await snap(page);
    ok('default music gain = 0.16 (today\'s exact)', near(base.musicGain, 0.16), `got ${base.musicGain}`);
    ok('default sfx gain = 0.85 (today\'s exact)', near(base.sfxGain, 0.85), `got ${base.sfxGain}`);
    ok('default dpr = 2 (min(dsf2,2))', near(base.dpr, 2), `got ${base.dpr}`);
    ok('default look = 1', near(base.look, 1));
    ok('default not muted / not calm / not lowPower / text m', !base.muted && !base.calm && !base.lowPower && base.text === 'm');

    // open the card via the gear button
    await click(page, 'btnSettings');
    const opened = await page.evaluate(() => document.getElementById('settings').classList.contains('show'));
    ok('gear opens the settings card', opened);
    await page.screenshot({ path: join(DIR, 'desktop-open.png') });

    // MUSIC slider -> gain scales
    await setRange(page, 'setMusic', 50);
    let s = await snap(page);
    ok('music 50% -> gain 0.08', near(s.musicGain, 0.08), `got ${s.musicGain}`);
    // SFX slider
    await setRange(page, 'setSfx', 20);
    s = await snap(page);
    ok('sfx 20% -> gain 0.17', near(s.sfxGain, 0.17), `got ${s.sfxGain}`);
    // MUTE -> both buses 0; mute is GAIN-ONLY and must never touch the ctx state
    const stBefore = await page.evaluate(() => window.__hd.audio().state);
    await setCheck(page, 'setMute', true);
    s = await snap(page);
    const stAfter = await page.evaluate(() => window.__hd.audio().state);
    ok('mute -> music+sfx gain 0', s.musicGain === 0 && s.sfxGain === 0, `m=${s.musicGain} s=${s.sfxGain}`);
    ok('mute is gain-only, never suspends the AudioContext', stAfter === stBefore, `before=${stBefore} after=${stAfter}`);
    await setCheck(page, 'setMute', false);
    s = await snap(page);
    ok('unmute restores scaled gains', near(s.musicGain, 0.08) && near(s.sfxGain, 0.17), `m=${s.musicGain} s=${s.sfxGain}`);

    // LOOK slider -> stored multiplier
    await setRange(page, 'setLook', 200);
    s = await snap(page);
    ok('look 200% -> multiplier 2.0', near(s.look, 2.0), `got ${s.look}`);
    // INVERT toggle
    await setCheck(page, 'setInvert', true);
    s = await snap(page);
    ok('invert toggle -> invertY true', s.invertY === true);
    // REDUCED MOTION -> game.calm
    await setCheck(page, 'setCalm', true);
    s = await snap(page);
    const calmGame = await page.evaluate(() => window.__hd.scene ? undefined : undefined); // calm is in snapshot
    ok('reduced-motion -> calm true', s.calm === true && s.reducedMotion === true);
    // TEXT size L -> uiscale + html class
    await click(page, 'setText-l');
    s = await snap(page);
    const uiL = await page.evaluate(() => ({ scale: getComputedStyle(document.documentElement).getPropertyValue('--uiscale').trim(), cls: document.documentElement.classList.contains('uiscaled') }));
    ok('text L -> uiscale 1.15 + html.uiscaled', s.text === 'l' && uiL.scale === '1.15' && uiL.cls === true, JSON.stringify(uiL));
    await click(page, 'setText-m');
    const uiM = await page.evaluate(() => ({ scale: getComputedStyle(document.documentElement).getPropertyValue('--uiscale').trim(), cls: document.documentElement.classList.contains('uiscaled') }));
    ok('text M -> uiscale 1 + html.uiscaled removed (no-op default)', uiM.scale === '1' && uiM.cls === false, JSON.stringify(uiM));
    // back to L for the reload-persistence check later
    await click(page, 'setText-l');

    // LOW-POWER -> DPR drops to 1, flag set
    await setCheck(page, 'setLow', true);
    s = await snap(page);
    ok('low-power -> dpr 1 + lowPower flag', near(s.dpr, 1) && s.lowPower === true, `dpr=${s.dpr}`);
    await setCheck(page, 'setLow', false);
    s = await snap(page);
    ok('low-power off -> dpr back to 2', near(s.dpr, 2), `dpr=${s.dpr}`);
    // re-enable low-power so persistence test has a non-default to survive
    await setCheck(page, 'setLow', true);

    // Esc-closes-a-card must NOT pop settings open in the same keypress (capture-phase guard)
    await page.evaluate(() => document.getElementById('settings').classList.remove('show'));
    // HOLD 'b' across a frame — a press+release within one frame misses the rising-edge
    // tote toggle (the tap-misses-the-latch class), so the tote would never open.
    await page.keyboard.down('b'); await new Promise(r => setTimeout(r, 160)); await page.keyboard.up('b');
    await new Promise(r => setTimeout(r, 120));
    const toteOpen = await page.evaluate(() => document.getElementById('tote').classList.contains('show'));
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 120));
    const after = await page.evaluate(() => ({ tote: document.getElementById('tote').classList.contains('show'), settings: document.getElementById('settings').classList.contains('show') }));
    ok('Esc closes the tote', toteOpen && !after.tote);
    ok('Esc-closing the tote does NOT open settings (capture-phase guard)', !after.settings, JSON.stringify(after));

    // ---------- functional: look sensitivity + invert on a real canvas drag ----------
    // close the card first so the drag lands on the world, not the backdrop
    await page.keyboard.press('Escape');
    await page.evaluate(() => document.getElementById('settings').classList.remove('show'));
    async function dragYaw(look) {
      await setRange(page, 'setLook', look);
      const y0 = await page.evaluate(() => window.__hd.input.cam.yaw);
      await page.mouse.move(640, 360); await page.mouse.down();
      await page.mouse.move(740, 360, { steps: 6 }); await page.mouse.up();
      const y1 = await page.evaluate(() => window.__hd.input.cam.yaw);
      return Math.abs(y1 - y0);
    }
    const dLow = await dragYaw(50), dHigh = await dragYaw(200);
    ok('look sensitivity scales the drag (200% ≈ 4× 50%)', dHigh > dLow * 2.5 && dHigh > 0.2, `low=${dLow.toFixed(3)} high=${dHigh.toFixed(3)}`);

    async function dragPitch(invert) {
      await setRange(page, 'setLook', 100);
      await setCheck(page, 'setInvert', invert);
      const p0 = await page.evaluate(() => window.__hd.input.cam.pitch);
      await page.mouse.move(640, 340); await page.mouse.down();
      await page.mouse.move(640, 400, { steps: 6 }); await page.mouse.up();   // drag DOWN
      const p1 = await page.evaluate(() => window.__hd.input.cam.pitch);
      return p1 - p0;
    }
    const pNorm = await dragPitch(false), pInv = await dragPitch(true);
    ok('invert-Y flips the vertical drag sign', Math.sign(pNorm) !== 0 && Math.sign(pInv) === -Math.sign(pNorm), `norm=${pNorm.toFixed(3)} inv=${pInv.toFixed(3)}`);

    // leave a known non-default state for reload: music 50, sfx 20, look 200, invert on, calm on, low-power on, text L
    await setRange(page, 'setLook', 200);
    await setCheck(page, 'setInvert', true);
    await new Promise(r => setTimeout(r, 800));   // let the debounced save flush

    // ---------- persistence across reload (same context = same localStorage) ----------
    await page.reload({ waitUntil: 'networkidle0' });
    await page.goto(BASE + '?play=1', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    const r2 = await snap(page);
    ok('persist: music 50% survives reload', near(r2.musicGain, 0.08), `got ${r2.musicGain}`);
    ok('persist: sfx 20% survives reload', near(r2.sfxGain, 0.17), `got ${r2.sfxGain}`);
    ok('persist: look 2.0 survives reload', near(r2.look, 2.0), `got ${r2.look}`);
    ok('persist: invertY survives reload', r2.invertY === true);
    ok('persist: reduced-motion survives reload', r2.calm === true && r2.reducedMotion === true);
    ok('persist: low-power (dpr 1) survives reload', near(r2.dpr, 1) && r2.lowPower === true, `dpr=${r2.dpr}`);
    ok('persist: text L survives reload', r2.text === 'l');

    await page.close();
  }

  // ---------- 2) AUDIO GESTURE CHAIN via the real start click ----------
  // Isolated context = pristine localStorage (a shared context's pagehide flush
  // re-writes any localStorage.clear, PITFALLS/082) — so defaults are truly fresh.
  {
    const ctx = browser.createBrowserContext ? await browser.createBrowserContext() : await browser.createIncognitoBrowserContext();
    const page = await ctx.newPage();
    hook(page);
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(BASE + '?canary=085', { waitUntil: 'networkidle0' });
    const preState = await page.evaluate(() => window.__hd.audio().state);
    const gPre = await snap(page);
    await page.click('#start');   // the ONE gesture that boots audio (task 014)
    await new Promise(r => setTimeout(r, 900));
    const postState = await page.evaluate(() => window.__hd.audio().state);
    const g = await snap(page);
    ok('audio suspended/none before start gesture', preState === 'suspended' || preState === 'none', `pre=${preState}`);
    ok('audio running AFTER start click (014 chain intact)', postState === 'running', `post=${postState}`);
    ok('fresh install defaults: gains 0.16/0.85 (today\'s exact)', near(g.musicGain, 0.16) && near(g.sfxGain, 0.85), `m=${g.musicGain} s=${g.sfxGain}`);
    await ctx.close();
  }

  // ---------- 2b) OS prefers-reduced-motion is honored as the DEFAULT ----------
  {
    const ctx = browser.createBrowserContext ? await browser.createBrowserContext() : await browser.createIncognitoBrowserContext();
    const page = await ctx.newPage();
    hook(page);
    await page.setViewport({ width: 1280, height: 720 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.goto(BASE + '?play=1&canary=085', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    const s = await snap(page);
    ok('OS prefers-reduced-motion -> calm true by default (no explicit choice)', s.calm === true && s.reducedMotion == null, JSON.stringify({ calm: s.calm, rm: s.reducedMotion }));
    await ctx.close();
  }

  // ---------- 3) MOBILE (390px, touch) card screenshots ----------
  for (const orient of [['portrait', 390, 844], ['landscape', 844, 390]]) {
    const [name, w, h] = orient;
    const page = await browser.newPage();
    hook(page);
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(BASE + '?play=1&canary=085&dibs=7', { waitUntil: 'networkidle0' });   // dibs=7 to reveal the chip and prove no HUD overlap with the gear
    await new Promise(r => setTimeout(r, 2000));
    await page.evaluate(() => document.getElementById('btnSettings').click());
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: join(DIR, 'mobile-' + name + '.png') });
    const opened = await page.evaluate(() => document.getElementById('settings').classList.contains('show'));
    ok('mobile ' + name + ': gear opens card', opened);
    // HUD overlap: gear vs dibs chip rects must not intersect
    const rects = await page.evaluate(() => {
      const r = id => { const e = document.getElementById(id); const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
      return { gear: r('btnSettings'), dibs: r('dibs') };
    });
    const inter = !(rects.gear.x + rects.gear.w <= rects.dibs.x || rects.dibs.x + rects.dibs.w <= rects.gear.x || rects.gear.y + rects.gear.h <= rects.dibs.y || rects.dibs.y + rects.dibs.h <= rects.gear.y);
    ok('mobile ' + name + ': gear ⧉ dibs-chip do NOT overlap', !inter, JSON.stringify(rects));
    const g = rects.gear;
    const onScreen = g.x >= 0 && g.y >= 0 && g.x + g.w <= w + 0.5 && g.y + g.h <= h + 0.5;
    ok('mobile ' + name + ': gear fully within the viewport', onScreen, `gear=${JSON.stringify(g)} vp=${w}x${h}`);
    // also shoot the card closed to see the gear in the rail
    await page.evaluate(() => document.getElementById('settings').classList.remove('show'));
    await new Promise(r => setTimeout(r, 200));
    await page.screenshot({ path: join(DIR, 'mobile-' + name + '-rail.png') });
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
