// Headless action driver for Harbor Days (extends shot.mjs).
// Usage: node tools/act.mjs '<actionsJSON>' [baseQuery]
//   actions is a JSON array of steps:
//     ["goto",x,z]        navigate/teleport: (re)loads with ?play=1&x&z
//     ["key","e"]         tap a key (down, hold ~160ms, up) — survives a frame
//     ["keydown","e"]     press and keep held
//     ["keyup","e"]       release a held key
//     ["wait",800]        wait ms
//     ["shot","name"]     screenshot -> tools/shots/name.png
//   baseQuery (optional) extra params merged into every goto, e.g. "yaw=3.1&dist=9"
// Prints console/page errors at the end (non-zero exit if any).
import puppeteer from 'puppeteer';
import { mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// --file=<path> loads the actions array from a JSON file (long scripts with
// eval strings are painful to quote on the CLI); else argv[2] is the JSON.
const fileArg = process.argv.find(a => a.startsWith('--file='));
const actions = JSON.parse(fileArg ? readFileSync(fileArg.slice(7), 'utf8') : (process.argv[2] || '[]'));
const baseQuery = process.argv[3] || '';
const outDir = join(dirname(fileURLToPath(import.meta.url)), 'shots');
mkdirSync(outDir, { recursive: true });

// --strict-autoplay (or STRICT_AUTOPLAY=1) → Chrome gates AudioContext behind a
// real user gesture, the mobile-audio repro (task 014): a context created at page
// load comes up 'suspended' until a trusted tap/keypress resumes it.
const STRICT = process.argv.includes('--strict-autoplay') || !!process.env.STRICT_AUTOPLAY;
// --mobile (or MOBILE=1) → a 390px touch viewport so body.touch turns on and the
// on-screen HUD (joystick + hand button + tappable pill) is exercised (task 026).
// Enables the `tap`/`tapSel` ops (page.touchscreen needs hasTouch:true).
const MOBILE = process.argv.includes('--mobile') || !!process.env.MOBILE;
const launchArgs = [MOBILE ? '--window-size=390,844' : '--window-size=1280,720', '--mute-audio'];
if (STRICT) launchArgs.push('--autoplay-policy=user-gesture-required');
const browser = await puppeteer.launch({ headless: 'new', args: launchArgs });
const page = await browser.newPage();
await page.setViewport(MOBILE
  ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  : { width: 1280, height: 720 });

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

const PORT = +(process.argv[4] || process.env.PORT || 5173);   // optional 3rd CLI arg = port
const sleep = ms => new Promise(r => setTimeout(r, ms));
// HELD tap: touchStart, hold ~160ms (>=~10 frames), touchEnd. An instantaneous
// tap can start+end inside a single frame gap, so the game's rising-edge action
// latch (framework _touchAct) never sees the press — hold it across frames.
async function holdTap(x, y, ms = 160) {
  await page.touchscreen.touchStart(x, y);
  await sleep(ms);
  await page.touchscreen.touchEnd();
}
async function nav(x, z) {
  const q = new URLSearchParams('play=1');
  if (x !== undefined && x !== null) q.set('x', x);
  if (z !== undefined && z !== null) q.set('z', z);
  if (baseQuery) for (const [k, v] of new URLSearchParams(baseQuery)) q.set(k, v);
  await page.goto('http://localhost:' + PORT + '/?' + q.toString(), { waitUntil: 'networkidle0', timeout: 20000 });
  await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start').click(); });
  await sleep(600);
}

// --audio-log (or AUDIO_LOG=1) → print window.__hd.audio() ({state,resumes}) after
// each step, so the mobile-audio repro shows 'suspended' before a tap, 'running' after.
const AUDIO_LOG = process.argv.includes('--audio-log') || !!process.env.AUDIO_LOG;
async function logAudio(tag) {
  if (!AUDIO_LOG) return;
  const s = await page.evaluate(() => (window.__hd && window.__hd.audio) ? window.__hd.audio() : null);
  console.log('AUDIO ' + tag + ' ' + JSON.stringify(s));
}

let navigated = false;
for (const [op, a, b] of actions) {
  if (op === 'goto') { await nav(a, b); navigated = true; }
  else { if (!navigated) { await nav(); navigated = true; }
    if (op === 'key') { await page.keyboard.down(a); await sleep(160); await page.keyboard.up(a); }
    else if (op === 'keydown') await page.keyboard.down(a);
    else if (op === 'keyup') await page.keyboard.up(a);
    else if (op === 'wait') await sleep(a);
    else if (op === 'eval') { const r = await page.evaluate(a); console.log('EVAL ' + JSON.stringify(r)); }
    else if (op === 'tap') { await holdTap(a, b); console.log('TAP @' + a + ',' + b); }
    else if (op === 'tapSel') {   // held-tap the CENTRE of a selector's rect (skips if hidden/zero-size)
      const r = await page.evaluate(sel => {
        const el = document.querySelector(sel); if (!el) return null;
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return null;
        const b = el.getBoundingClientRect(); if (b.width === 0 && b.height === 0) return null;
        return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height };
      }, a);
      if (!r) console.log('TAPSEL ' + a + ' NOT-VISIBLE');
      else { await holdTap(r.x, r.y);
        console.log('TAPSEL ' + a + ' @' + r.x.toFixed(0) + ',' + r.y.toFixed(0) + ' (' + r.w.toFixed(0) + 'x' + r.h.toFixed(0) + ')'); }
    }
    else if (op === 'shot') { const f = join(outDir, a + '.png'); await page.screenshot({ path: f }); console.log('SHOT ' + f); }
  }
  await logAudio(op);
}

await browser.close();
if (canary.length) console.log('CANARY ' + canary.join(' | '));
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exitCode = 1; }
else console.log('NO ERRORS');
