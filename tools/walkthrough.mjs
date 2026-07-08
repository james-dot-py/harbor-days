// walkthrough.mjs — the waypoint iterator over shot.mjs (AUTOPILOT.md §4.3).
// Usage: node tools/walkthrough.mjs [--area lakefront|wrigleyville] [--ids a,b,c]
//        [--budget 480] [--wait 2600]
// 1. Regenerates waypoints.json (via gen-waypoints.mjs import — fails loudly
//    on stale expectations). 2. Spawns its OWN Vite and parses the ACTUAL port
//    (tools default to 5173, which interactive sessions own — screenshotting
//    the wrong session's game has happened). 3. Canary-checks EVERY shot.
// 4. Shots every waypoint framing, collecting errors + __hd.perf().
// 5. Writes tools/shots/run-<runId>/report.json + contact sheet.
// Exit code reflects MECHANICAL failures only (canary, load/console errors,
// draw-call budget). Aesthetic judgment is the agent's job, by READING PNGs.
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { shot } from './shot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const AREA = arg('area', null);
const IDS = arg('ids', null)?.split(',').map(s => s.trim());
const BUDGET = +arg('budget', 480);
const WAIT = +arg('wait', 2600);

// 1. regenerate waypoints (import runs the generator; stale expects exit 1)
const { genWaypoints } = await import('./gen-waypoints.mjs');
let wps = genWaypoints().waypoints;
if (AREA) wps = wps.filter(w => w.area === AREA);
if (IDS) {
  const missing = IDS.filter(id => !wps.some(w => w.id === id));
  if (missing.length) { console.error('unknown waypoint ids: ' + missing.join(', ')); process.exit(1); }
  wps = wps.filter(w => IDS.includes(w.id));
}
if (!wps.length) { console.error('no waypoints selected'); process.exit(1); }

const runId = Date.now().toString(36);
const runDir = join(here, 'shots', 'run-' + runId);
mkdirSync(runDir, { recursive: true });

// 2. own Vite; parse the ACTUAL port from stdout
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: root });
const port = await new Promise((res, rej) => {
  let buf = '';
  const to = setTimeout(() => rej(new Error('vite did not report a port in 30s:\n' + buf)), 30000);
  vite.stdout.on('data', d => {
    buf += d.toString();
    // strip ANSI color codes — vite prints them mid-URL (localhost:\x1b[1m5175)
    const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/);
    if (m) { clearTimeout(to); res(+m[1]); }
  });
  vite.stderr.on('data', d => { buf += d.toString(); });
  vite.on('exit', c => rej(new Error('vite exited early (' + c + '):\n' + buf)));
});
const killVite = () => { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill(); };
console.log('vite on port ' + port + ' · run ' + runId + ' · ' + wps.length + ' waypoints');

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
let failures = 0;
const report = { runId, port, date: new Date().toISOString(), budget: BUDGET, waypoints: [], shots: [] };

try {
  // 3. canary gate before anything else
  const probe = await shot({ name: 'canary', query: 'play=1&canary=' + runId, waitMs: 1500, port, browser, dir: runDir });
  if (!probe.canary.some(c => c.includes(runId))) {
    console.error('CANARY FAILED on port ' + port + ' — wrong server or instrumentation missing. Aborting.');
    killVite(); await browser.close(); process.exit(2);
  }
  console.log('canary ok');

  // 4. iterate
  for (const w of wps) {
    const entry = { id: w.id, area: w.area, x: w.x, z: w.z, expectation: w.expectation, framings: [] };
    for (let i = 0; i < w.framings.length; i++) {
      const f = w.framings[i];
      const q = new URLSearchParams({ play: '1', x: w.x, z: w.z, canary: runId });
      for (const k of ['yaw', 'pitch', 'dist']) if (f[k] !== undefined) q.set(k, f[k]);
      const name = w.id + '-f' + i;
      // one shot must never kill the run: retry once, then record the failure
      let r;
      for (let attempt = 0; ; attempt++) {
        try { r = await shot({ name, query: q.toString(), waitMs: WAIT, port, browser, dir: runDir, perf: true }); break; }
        catch (e) {
          if (attempt === 0) { await new Promise(s => setTimeout(s, 1500)); continue; }
          r = { file: join(runDir, name + '.png'), started: 'failed', errors: ['[shot-failed] ' + e.message.split('\n')[0]], canary: [], perf: null };
          break;
        }
      }
      const canaryOk = r.canary.some(c => c.includes(runId));
      const over = r.perf && r.perf.drawCalls > BUDGET;
      if (!canaryOk || r.errors.length || over) failures++;
      const rec = { i, ...f, shot: relative(root, r.file), errors: r.errors, canaryOk, perf: r.perf, overBudget: !!over };
      entry.framings.push(rec);
      report.shots.push({ shot: rec.shot, id: w.id, framing: i });
      const flags = [!canaryOk && 'NO-CANARY', r.errors.length && (r.errors.length + ' err'), over && ('draws ' + r.perf.drawCalls + '>' + BUDGET)].filter(Boolean);
      console.log('  ' + name + (r.perf ? ' [' + r.perf.drawCalls + ' draws, ' + r.perf.fps + ' fps]' : '') + (flags.length ? '  ⚠ ' + flags.join(' · ') : ''));
    }
    if (w.interactive) {   // optional act.mjs script reference
      const code = await new Promise(res => {
        const p = spawn(process.execPath, [join(here, 'act.mjs'), JSON.stringify(w.interactive)], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: 'inherit' });
        p.on('exit', res);
      });
      entry.interactiveExit = code;
      if (code !== 0) failures++;
    }
    report.waypoints.push(entry);
  }
} finally {
  await browser.close();
  killVite();
}

// 5. report + contact sheet
const all = report.waypoints.flatMap(w => w.framings);
report.summary = {
  shots: all.length,
  errorShots: all.filter(f => f.errors.length).length,
  noCanary: all.filter(f => !f.canaryOk).length,
  maxDrawCalls: Math.max(...all.map(f => f.perf ? f.perf.drawCalls : 0)),
  overBudget: report.waypoints.flatMap(w => w.framings.filter(f => f.overBudget).map(f => w.id + '-f' + f.i)),
  failures,
};
writeFileSync(join(runDir, 'report.json'), JSON.stringify(report, null, 1));
try {
  const { contactSheet } = await import('./contactsheet.mjs');
  const sheet = await contactSheet({ shots: report.shots.map(s => ({ path: join(root, s.shot), label: s.id + '/f' + s.framing })), out: join(runDir, 'contact-sheet.png') });
  report.contactSheet = relative(root, sheet);
  writeFileSync(join(runDir, 'report.json'), JSON.stringify(report, null, 1));
  console.log('contact sheet: ' + sheet);
} catch (e) { console.log('no contact sheet (' + e.message.split('\n')[0] + ')'); }
console.log('report: ' + join(runDir, 'report.json'));
console.log(JSON.stringify(report.summary));
process.exit(failures ? 2 : 0);
