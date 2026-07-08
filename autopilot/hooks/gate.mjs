// gate.mjs — Stop hook, the acceptance gate (AUTOPILOT.md §6.2, decision f).
// Runs ONLY when code changed this session (ledger recorded lastCodeEdit). Collects
// ALL failures and exits 2 with a numbered stderr list; the session then continues
// and must fix or file an issue. It can never end silently red.
//
// Escape hatches (exit 0 without running checks):
//   * lastCodeEdit == null            — no code changed.
//   * an honest failure was filed      — autopilot/result.json {status:"failed"}
//                                        with mtime >= sessionStart.
//
// Checks (all mechanical):
//   1. node tools/walkprobe.mjs exits 0.
//   2. npm run build succeeds; dist/ contains EXACTLY index.html; log its size.
//   3. Every tools/shots/run-*/report.json with mtime >= lastCodeEdit:
//      summary.errorShots===0, summary.noCanary===0, summary.maxDrawCalls<=budget.
//   4. Baseline compare (calibrated) vs tools/shots/baseline.png — or advisory
//      eyeball path when the flake is not boundable.
//   5. PNG-read completeness: every tools/shots/**/*.png with mtime>=sessionStart
//      (excluding the gate's own gate-spawn.png) must appear in the reads set.
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // autopilot/hooks
const AUTOPILOT = path.join(HERE, '..');
const ROOT = path.join(AUTOPILOT, '..');
const STATE = path.join(AUTOPILOT, 'session-state.json');
const RESULT = path.join(AUTOPILOT, 'result.json');
const TOOLS = path.join(ROOT, 'tools');
const SHOTS_DIR = path.join(TOOLS, 'shots');
const BASELINE = path.join(SHOTS_DIR, 'baseline.png');
const CALIB = path.join(TOOLS, 'flake-calibration.json');
const BUDGETS = path.join(TOOLS, 'budgets.json');

const norm = p => path.resolve(p).replace(/\\/g, '/').toLowerCase();
const failures = [];
const gateArtifacts = new Set(); // pngs the gate itself creates → excluded from check 5

function walkPngs(dir) {
  const out = [];
  let entries; try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkPngs(full));
    else if (/\.png$/i.test(e.name)) out.push(full);
  }
  return out;
}

function drawCallBudget() {
  try { return JSON.parse(readFileSync(BUDGETS, 'utf8')).drawCalls ?? 480; } catch { return 480; }
}

async function spawnVite() {
  const { spawn } = await import('child_process');
  const vite = spawn(process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: ROOT });
  const port = await new Promise((res, rej) => {
    let buf = '';
    const to = setTimeout(() => rej(new Error('vite did not report a port in 30s')), 30000);
    vite.stdout.on('data', d => {
      buf += d.toString();
      const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/);
      if (m) { clearTimeout(to); res(+m[1]); }
    });
    vite.stderr.on('data', d => { buf += d.toString(); });
    vite.on('exit', c => rej(new Error('vite exited early (' + c + ')')));
  });
  const kill = () => { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill(); };
  return { port, kill };
}

async function toRGBA(sharp, file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  // stop_hook_active is read but does not change behavior: green is the only exit
  // besides the honest-failure hatch, so we run the checks either way.

  let state;
  try { state = JSON.parse(readFileSync(STATE, 'utf8')); } catch { process.exit(0); }
  if (!state || state.lastCodeEdit == null) process.exit(0); // no code changed

  const sessionStart = Date.parse(state.sessionStart) || 0;
  const lastEdit = Date.parse(state.lastCodeEdit) || 0;
  const reads = new Set((state.reads || []).map(String));

  // honest-failure path
  if (existsSync(RESULT)) {
    try {
      const r = JSON.parse(readFileSync(RESULT, 'utf8'));
      if (r.status === 'failed' && statSync(RESULT).mtimeMs >= sessionStart) process.exit(0);
    } catch { /* fall through to checks */ }
  }

  // ---- 1. walkprobe --------------------------------------------------------
  try {
    const wp = spawnSync(process.execPath, [path.join(TOOLS, 'walkprobe.mjs')], { cwd: ROOT, encoding: 'utf8' });
    if (wp.status !== 0) failures.push('walkprobe failed (exit ' + wp.status + '):\n' + ((wp.stdout || '') + (wp.stderr || '')).trim().split('\n').slice(-12).join('\n'));
  } catch (e) { failures.push('walkprobe could not run: ' + e.message); }

  // ---- 2. build ------------------------------------------------------------
  try {
    const b = spawnSync('npm run build', { cwd: ROOT, shell: true, encoding: 'utf8' });
    if (b.status !== 0) {
      failures.push('npm run build failed (exit ' + b.status + '):\n' + ((b.stdout || '') + (b.stderr || '')).trim().split('\n').slice(-12).join('\n'));
    } else {
      const dist = path.join(ROOT, 'dist');
      const files = existsSync(dist) ? readdirSync(dist) : [];
      if (files.length !== 1 || files[0] !== 'index.html') {
        failures.push('dist/ must contain exactly index.html, found: ' + JSON.stringify(files));
      } else {
        const size = statSync(path.join(dist, 'index.html')).size;
        console.log('[gate] build ok — dist/index.html ' + size + ' bytes (' + (size / 1024).toFixed(1) + ' kB)');
      }
    }
  } catch (e) { failures.push('build could not run: ' + e.message); }

  // ---- 3. shot reports since last code edit --------------------------------
  try {
    const budget = drawCallBudget();
    let runDirs = [];
    try { runDirs = readdirSync(SHOTS_DIR, { withFileTypes: true }).filter(e => e.isDirectory() && e.name.startsWith('run-')).map(e => path.join(SHOTS_DIR, e.name)); } catch { }
    for (const d of runDirs) {
      const rep = path.join(d, 'report.json');
      if (!existsSync(rep)) continue;
      if (statSync(rep).mtimeMs < lastEdit) continue;
      let j; try { j = JSON.parse(readFileSync(rep, 'utf8')); } catch { failures.push('unreadable report: ' + rep); continue; }
      const s = j.summary || {};
      const probs = [];
      if (s.errorShots !== 0) probs.push('errorShots=' + s.errorShots);
      if (s.noCanary !== 0) probs.push('noCanary=' + s.noCanary);
      if (!(s.maxDrawCalls <= budget)) probs.push('maxDrawCalls=' + s.maxDrawCalls + ' > budget ' + budget);
      if (probs.length) failures.push('report ' + path.relative(ROOT, rep) + ': ' + probs.join(', '));
    }
  } catch (e) { failures.push('shot-report check errored: ' + e.message); }

  // ---- 4. baseline compare (calibrated) ------------------------------------
  try {
    if (!existsSync(CALIB)) {
      failures.push('flake-calibration.json missing — run tools/flake-calibrate.mjs (needed for check 4)');
    } else {
      const calib = JSON.parse(readFileSync(CALIB, 'utf8'));
      const gateSpawnPath = path.join(SHOTS_DIR, 'gate-spawn.png');
      if (calib.boundable === false) {
        // advisory: skip hard compare, require the eyeball verdict (both PNGs Read)
        const need = [gateSpawnPath, BASELINE].map(norm);
        const missing = need.filter(n => !reads.has(n));
        if (missing.length) failures.push('flake not boundable → eyeball verdict required, but these were not Read: ' + missing.join(', '));
      } else {
        const { shot } = await import('../../tools/shot.mjs');
        const puppeteer = (await import('puppeteer')).default;
        const sharp = (await import('sharp')).default;
        const { port, kill } = await spawnVite();
        let browser;
        try {
          browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
          const runId = 'gate' + Date.now();
          // canonical params come from the calibration record — single source of truth
          const r = await shot({ name: 'gate-spawn', query: (calib.query || 'play=1&quiet=1') + '&canary=' + runId, waitMs: calib.waitMs || 3500, port, browser, dir: SHOTS_DIR });
          gateArtifacts.add(norm(r.file));
          if (!r.canary.some(c => c.includes(runId))) {
            failures.push('check 4: canary not echoed on port ' + port + ' — wrong server or missing instrumentation');
          } else {
            const [a, b] = await Promise.all([toRGBA(sharp, r.file), toRGBA(sharp, BASELINE)]);
            if (a.width !== b.width || a.height !== b.height) {
              failures.push('check 4: gate-spawn ' + a.width + 'x' + a.height + ' != baseline ' + b.width + 'x' + b.height);
            } else {
              const pixelmatch = (await import('pixelmatch')).default;
              const n = pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: calib.perPixelThreshold });
              const ratio = n / (a.width * a.height);
              if (ratio > calib.gateRatio) {
                const msg = (spawnSync('git', ['log', '-1', '--format=%B'], { cwd: ROOT, encoding: 'utf8' }).stdout || '');
                const changed = (spawnSync('git', ['show', '--name-only', '--format=', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout || '').replace(/\\/g, '/');
                const regen = /\[baseline-regen\]/i.test(msg) && /tools\/shots\/baseline\.png/i.test(changed);
                if (!regen) failures.push('check 4: spawn diff ' + (ratio * 100).toFixed(3) + '% > gate ' + (calib.gateRatio * 100).toFixed(3) + '% vs baseline.png (no [baseline-regen] + baseline change in HEAD)');
                else console.log('[gate] check 4: diff over threshold but HEAD is a [baseline-regen] that touched baseline.png — allowed');
              } else {
                console.log('[gate] check 4: spawn diff ' + (ratio * 100).toFixed(3) + '% <= gate ' + (calib.gateRatio * 100).toFixed(3) + '%');
              }
            }
          }
        } finally {
          if (browser) await browser.close();
          kill();
        }
      }
    }
  } catch (e) { failures.push('check 4 (baseline compare) errored: ' + e.message.split('\n')[0]); }

  // ---- 5. PNG-read completeness --------------------------------------------
  try {
    const pngs = walkPngs(SHOTS_DIR).filter(f => {
      let m; try { m = statSync(f).mtimeMs; } catch { return false; }
      return m >= sessionStart && !gateArtifacts.has(norm(f));
    });
    const missing = pngs.filter(f => !reads.has(norm(f))).map(f => path.relative(ROOT, f));
    if (missing.length) failures.push('unread PNGs (created this session, never Read):\n  ' + missing.join('\n  '));
  } catch (e) { failures.push('PNG-read check errored: ' + e.message); }

  // ---- verdict -------------------------------------------------------------
  if (failures.length) {
    process.stderr.write('[gate] BLOCKED — the acceptance gate found ' + failures.length + ' problem(s). Fix them or file an issue in autopilot/issues/ and write autopilot/result.json {status:"failed"}:\n');
    failures.forEach((f, i) => process.stderr.write((i + 1) + '. ' + f + '\n'));
    process.exit(2);
  }
  console.log('[gate] all checks green');
  process.exit(0);
}

main().catch(e => {
  // an unexpected gate crash must still block (red can never end silently); the
  // honest-failure hatch (result.json status:"failed") remains available.
  process.stderr.write('[gate] BLOCKED — gate errored: ' + (e && e.message ? e.message : e) + '\n');
  process.exit(2);
});
