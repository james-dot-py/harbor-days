// tmp-125-perf — draw-call census at every 125-affected waypoint framing,
// against my OWN vite (never the foreign 5173). Budget 480.
import puppeteer from 'puppeteer';
import { shot } from './shot.mjs';

const PORT = +(process.argv[2] || 5241), BUDGET = 480;
const FRAMES = [
  ['doors-f0', -70.6, 712.6, -3.00, 0.03, 6.5, ''],
  ['doors-f1', -70.4, 710.2, -3.05, 0.02, 5, ''],
  ['doors-f2', -65.5, 711.5, -2.45, 0.04, 6, ''],
  ['peek-f0', -70.4, 710.2, -3.05, 0.02, 5, 'peek=1'],
  ['peek-f1', -68.5, 711.5, -2.90, 0.04, 6, 'peek=1'],
  ['gate-f0', -76, 736, 0.80, 0.14, 8, ''],
  ['gate-f1', -70, 737.5, 0.10, 0.14, 6.5, ''],
  ['gate-f2', -70, 748, 3.10, 0.10, 7, ''],
  ['walk-f0', -70.2, 762, 0.05, 0.16, 8, ''],
  ['walk-f1', -70.8, 778, 0.15, 0.12, 7, ''],
  ['walk-f2', -71, 787, 0.20, 0.14, 7.5, ''],
];
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
let worst = 0, worstId = '', bad = 0;
for (const [id, x, z, yaw, pitch, dist, extra] of FRAMES) {
  const q = `play=1&x=${x}&z=${z}&yaw=${yaw}&pitch=${pitch}&dist=${dist}&canary=t125perf${extra ? '&' + extra : ''}`;
  const r = await shot({ name: 'tmp125-perf-' + id, query: q, waitMs: 2600, port: PORT, browser, perf: true });
  const d = r.perf ? r.perf.drawCalls : -1;
  const ok = r.canary.some(c => c.includes('t125perf'));
  if (d > worst) { worst = d; worstId = id; }
  if (d > BUDGET || !ok || r.errors.length) bad++;
  console.log(`${id.padEnd(10)} draws ${String(d).padStart(4)}  fps ${r.perf ? r.perf.fps : '?'}  canary ${ok ? 'ok' : 'MISSING'}${r.errors.length ? '  ERRORS: ' + r.errors.join(' | ') : ''}`);
}
await browser.close();
console.log(`\nworst ${worst}/${BUDGET} at ${worstId} — ${bad === 0 ? 'ALL WITHIN BUDGET, canary clean, no errors' : bad + ' FRAMING(S) BAD'}`);
process.exit(bad === 0 ? 0 : 1);
