// tmp (090): lake-mood determinism + draw-call budget proof. Spawns its OWN vite
// (never attach to :5173 — a foreign/stale server there is a known trap), parses
// the ACTUAL port from vite stdout (stripping ANSI codes), canary-gates each page,
// and kills vite on exit. NO screenshots (the repo PNG gate requires every shot be
// read by the main session) — every assertion is a page.evaluate / console read.
//
// Loads the canonical spawn under four mood variants and asserts:
//   1. all four propAudit() hashes are IDENTICAL (world scatter must not move across
//      moods — the task's hard determinism gate),
//   2. zero console/page errors on every page,
//   3. perf().drawCalls <= 480 on every page,
//   4. mood090.mood echoes the requested mood ('clear' for the no-param variant,
//      since play=1 defaults the mood pack off).
// Usage: node tools/tmp-090-det.mjs [port]
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const runid = 'det090-' + Date.now().toString(36);

// FNV-1a 32-bit hash (inline) — stable across runs, order-sensitive.
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// 1. own vite; parse the ACTUAL port from stdout (strip ANSI color codes vite
//    prints mid-URL, e.g. localhost:\x1b[1m5175).
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: root });
const port = await new Promise((res, rej) => {
  let buf = '';
  const to = setTimeout(() => rej(new Error('vite did not report a port in 30s:\n' + buf)), 30000);
  vite.stdout.on('data', d => {
    buf += d.toString();
    const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/);
    if (m) { clearTimeout(to); res(+m[1]); }
  });
  vite.stderr.on('data', d => { buf += d.toString(); });
  vite.on('exit', c => rej(new Error('vite exited early (' + c + '):\n' + buf)));
});
const killVite = () => { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill(); };
console.log('tmp-090-det: vite on port ' + port + ' · run ' + runid);

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });

// error + canary collection (reused across navigations; cleared per variant)
let errors = [];
const canaries = new Set();
const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)');
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
page.on('console', m => {
  const t = m.text();
  if (m.type() === 'error' && !isNoise(t)) errors.push('[console.error] ' + t);
  const cm = t.match(/\[canary\]\s+(\S+)/);
  if (cm) canaries.add(cm[1]);
});

const variants = [
  { q: '',                  mood: 'clear'   },
  { q: 'mood=fog',          mood: 'fog'     },
  { q: 'mood=rain&rainon=1', mood: 'rain'   },
  { q: 'mood=firefly',      mood: 'firefly' },
];

const rows = [];
let fails = 0;
const fail = msg => { fails++; console.log('FAIL  ' + msg); };

for (let i = 0; i < variants.length; i++) {
  const v = variants[i];
  const canary = runid + '-' + i;
  errors = [];               // reset per-variant puppeteer-side errors
  const url = `http://localhost:${port}/?play=1&quiet=1&canary=${canary}` + (v.q ? '&' + v.q : '');
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(3500);
  const data = await page.evaluate(() => {
    const hd = window.__hd || {};
    let audit = null;
    try { audit = hd.propAudit ? JSON.stringify(hd.propAudit()) : null; } catch (e) { audit = 'ERR:' + e.message; }
    const perf = hd.perf ? hd.perf() : null;
    return {
      audit,
      drawCalls: perf ? perf.drawCalls : null,
      errsLen: hd.errs ? hd.errs.length : null,
      mood: hd.mood090 ? hd.mood090.mood : null,
    };
  });
  const hash = data.audit && !String(data.audit).startsWith('ERR:') ? fnv1a(data.audit) : 'NONE';
  const puppErrs = errors.slice();
  rows.push({ label: v.q || '(none)', mood: data.mood, hash, drawCalls: data.drawCalls, errsLen: data.errsLen });

  // per-page assertions
  if (!canaries.has(canary)) fail(`variant ${i}: canary "${canary}" not echoed — wrong/stale server?`);
  if (!data.audit || String(data.audit).startsWith('ERR:')) fail(`variant ${i}: propAudit() missing/threw (${data.audit})`);
  if (puppErrs.length) fail(`variant ${i}: ${puppErrs.length} console/page error(s): ${puppErrs.join(' | ')}`);
  if (data.errsLen !== 0) fail(`variant ${i}: __hd.errs.length=${data.errsLen} (expected 0)`);
  if (data.drawCalls == null) fail(`variant ${i}: perf().drawCalls unavailable`);
  else if (data.drawCalls > 480) fail(`variant ${i}: drawCalls=${data.drawCalls} > 480`);
  if (data.mood !== v.mood) fail(`variant ${i}: mood090.mood="${data.mood}" (expected "${v.mood}")`);
}

// determinism gate: all four propAudit hashes identical
const hashes = rows.map(r => r.hash);
const allSame = hashes.every(h => h !== 'NONE' && h === hashes[0]);
if (!allSame) fail(`propAudit hashes differ across moods (world scatter moved): ${hashes.join(', ')}`);

await browser.close();
killVite();

// table
console.log('\nvariant           | mood     | hash     | draws | errs');
console.log('------------------+----------+----------+-------+-----');
for (const r of rows) {
  console.log(
    String(r.label).padEnd(17) + ' | ' +
    String(r.mood).padEnd(8) + ' | ' +
    String(r.hash).padEnd(8) + ' | ' +
    String(r.drawCalls).padStart(5) + ' | ' +
    String(r.errsLen).padStart(4)
  );
}
console.log(allSame ? '\nDETERMINISM: all propAudit hashes identical.' : '\nDETERMINISM: HASHES DIFFER.');
console.log(fails ? `\nTMP-090-DET FAILED (${fails} check(s))` : '\nTMP-090-DET GREEN');
process.exit(fails ? 1 : 0);
