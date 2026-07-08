// Flake calibration for gate.mjs check 4 (AUTOPILOT.md §6.2 item 4).
// Cosmetic animation (water shimmer, clouds, NPC pose) is not frame-exact between
// spawns, so a naive pixelmatch vs baseline is flaky. This tool measures the flake
// ceiling: it takes N repeated spawn shots with identical params and pixelmatches
// every pair at several per-pixel thresholds, then recommends a per-pixel threshold
// and a diff-ratio gate set just above the observed ceiling. It also reports each
// shot vs the current baseline.png (advisory only — baseline was taken with
// different timing).
//
// CLI: node tools/flake-calibrate.mjs [--port 5199] [--n 5] [--wait 6500]
import puppeteer from 'puppeteer';
import pixelmatch from 'pixelmatch';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { shot } from './shot.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS_DIR = join(HERE, 'shots');
const BASELINE = join(SHOTS_DIR, 'baseline.png');
const OUT_JSON = join(HERE, 'flake-calibration.json');
const THRESHOLDS = [0.1, 0.15, 0.2];
// quiet=1 suppresses the transient HUD (hint bar / zone banners) — without it
// the hint's 9 s fade boundary makes spawn shots bimodal (~2.1% apart) and the
// calibration meaningless. Gate + baseline use these SAME canonical params.
const QUERY = 'play=1&quiet=1';

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] != null ? process.argv[i + 1] : def;
}

async function toRGBA(sharp, file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function ratioFor(a, b, threshold) {
  if (a.width !== b.width || a.height !== b.height) return null;
  const n = pixelmatch(a.data, b.data, null, a.width, a.height, { threshold });
  return n / (a.width * a.height);
}

function stats(values) {
  if (!values.length) return { maxRatio: null, meanRatio: null };
  const max = Math.max(...values);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return { maxRatio: max, meanRatio: mean };
}

// Smallest (strictest) threshold whose intra-run max ratio has not "blown up"
// relative to the next-looser threshold. Walk loose -> strict; stop before a
// threshold that more than doubles the ratio AND adds > 1 percentage point.
function chooseThreshold(intra) {
  const desc = [...THRESHOLDS].sort((a, b) => b - a); // [0.2,0.15,0.1]
  let chosen = desc[0];
  for (let i = 1; i < desc.length; i++) {
    const t = desc[i], prev = desc[i - 1];
    const rt = intra[t].maxRatio, rp = intra[prev].maxRatio;
    if (rt == null) break;
    const blowup = rt > Math.max(rp * 2, rp + 0.01);
    if (blowup) break;
    chosen = t;
  }
  return chosen;
}

function pct(r) { return r == null ? '  n/a  ' : (r * 100).toFixed(3) + '%'; }

async function main() {
  const port = +arg('--port', process.env.PORT || 5199);
  const n = +arg('--n', 6);
  const waitMs = +arg('--wait', 3500);
  // relaunch the browser every k shots (0 = never): varied cold/warm load
  // timing is what exposed the bimodal HUD flake — sample across it on purpose
  const freshEvery = +arg('--fresh-browser-every', 2);
  const sharp = (await import('sharp')).default;

  let browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
  try {
    // 1. Canary check — make sure we are hitting the intended dev server.
    const canaryId = 'calib' + Date.now();
    const cShot = await shot({ name: 'calib-canary', query: QUERY + '&canary=' + canaryId, waitMs, port, browser, dir: SHOTS_DIR });
    const gotCanary = cShot.canary.some(c => c.includes(canaryId));
    if (!gotCanary) {
      console.error('ABORT: canary "' + canaryId + '" was not echoed by the page on port ' + port + '.');
      console.error('  canary lines seen: ' + (cShot.canary.length ? cShot.canary.join(' | ') : '(none)'));
      console.error('  This is the wrong server or the instrumentation is missing. Refusing to calibrate.');
      process.exitCode = 3;
      return;
    }
    console.log('canary OK (' + canaryId + ') on port ' + port);

    // 2. N repeated spawn shots, identical params, browser relaunched every
    //    freshEvery shots so load-time skew is represented in the sample.
    const files = [];
    for (let i = 1; i <= n; i++) {
      if (freshEvery > 0 && i > 1 && (i - 1) % freshEvery === 0) {
        await browser.close();
        browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
      }
      const r = await shot({ name: 'calib-' + i, query: QUERY, waitMs, port, browser, dir: SHOTS_DIR });
      files.push(r.file);
      if (r.errors.length) console.log('  calib-' + i + ' console/page errors: ' + r.errors.length);
    }
    console.log('captured ' + n + ' shots (query="' + QUERY + '", waitMs=' + waitMs + ', freshBrowserEvery=' + freshEvery + ')');

    // 3. Decode.
    const imgs = await Promise.all(files.map(f => toRGBA(sharp, f)));
    const base = existsSync(BASELINE) ? await toRGBA(sharp, BASELINE) : null;

    // 4. Intra-run: all n-choose-2 pairs, per threshold.
    // 5. vs baseline: each shot vs baseline, per threshold (report-only).
    const intra = {}, vsBaseline = {};
    let pairsCount = 0;
    for (const t of THRESHOLDS) {
      const pairRatios = [];
      for (let i = 0; i < imgs.length; i++)
        for (let j = i + 1; j < imgs.length; j++) {
          const r = ratioFor(imgs[i], imgs[j], t);
          if (r != null) pairRatios.push(r);
        }
      pairsCount = pairRatios.length;
      intra[t] = stats(pairRatios);

      if (base) {
        const bRatios = imgs.map(im => ratioFor(im, base, t)).filter(r => r != null);
        vsBaseline[t] = base.width !== imgs[0]?.width || base.height !== imgs[0]?.height
          ? { maxRatio: null, meanRatio: null, note: 'dimension mismatch' }
          : stats(bRatios);
      } else {
        vsBaseline[t] = { maxRatio: null, meanRatio: null, note: 'baseline.png missing' };
      }
    }

    const perPixelThreshold = chooseThreshold(intra);
    const chosenMax = intra[perPixelThreshold].maxRatio ?? 0;
    const gateRatio = Math.max(chosenMax * 2, chosenMax + 0.005);
    const boundable = gateRatio < 0.05;

    const notes = [
      `Chose per-pixel threshold ${perPixelThreshold}: strictest of ${JSON.stringify(THRESHOLDS)} whose intra-run max ratio did not blow up vs the next-looser threshold.`,
      `gateRatio = max(intraMax*2, intraMax+0.005) at chosen threshold.`,
      boundable
        ? `Flake is boundable (gateRatio ${(gateRatio * 100).toFixed(3)}% < 5%): keep gate.mjs check 4 as a hard pixelmatch gate at these values.`
        : `Flake exceeds ~5% (gateRatio ${(gateRatio * 100).toFixed(3)}%): per §6.2 item 4 demote check 4 to advisory and require an explicit eyeball verdict (Read both PNGs) instead.`,
      `vsBaseline is advisory only — baseline.png was taken with different timing/composition.`,
    ].join(' ');

    const result = {
      query: QUERY,
      waitMs,
      n,
      date: new Date().toISOString(),
      port,
      pairsCount,
      perPixelThreshold,
      intraRun: Object.fromEntries(THRESHOLDS.map(t => [t, intra[t]])),
      vsBaseline: Object.fromEntries(THRESHOLDS.map(t => [t, vsBaseline[t]])),
      gateRatio,
      boundable,
      notes,
    };
    writeFileSync(OUT_JSON, JSON.stringify(result, null, 2));

    // 6. Compact table.
    console.log('\n  thr    intra_max   intra_mean   base_max    base_mean');
    console.log('  ----   ---------   ----------   --------    ---------');
    for (const t of THRESHOLDS) {
      const mark = t === perPixelThreshold ? ' *' : '  ';
      console.log('  ' + t.toFixed(2) + mark + ' ' + pct(intra[t].maxRatio).padStart(9)
        + '   ' + pct(intra[t].meanRatio).padStart(9)
        + '   ' + pct(vsBaseline[t].maxRatio).padStart(9)
        + '   ' + pct(vsBaseline[t].meanRatio).padStart(9));
    }
    console.log('\n  * chosen perPixelThreshold = ' + perPixelThreshold);
    console.log('  gateRatio (diff-ratio gate) = ' + gateRatio.toFixed(5) + ' (' + (gateRatio * 100).toFixed(3) + '%)');
    console.log('  flake boundable (<5%): ' + boundable);
    console.log('  wrote ' + OUT_JSON);
  } finally {
    await browser.close();
  }
}

main();
