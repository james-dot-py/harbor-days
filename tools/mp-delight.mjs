// mp-delight.mjs — verify the Millennium Park DELIGHT moments (task 047).
// Spawns its OWN Vite (never the foreign :5173), takes a framed shot of each
// moment, samples draw calls (window.__hd.perf), and probes the pack's
// window.__hd.mp instrumentation (soundcheck audio plays + station chimes).
// `node tools/*` is allowlisted, so this needs no approval.
//
// Usage: node tools/mp-delight.mjs [tag]   (tag → tools/shots/mp-delight-<tag>/)
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { shot } from './shot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const tag = process.argv[2] || 'run';
const dir = join(here, 'shots', 'mp-delight-' + tag);

const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: root });
const port = await new Promise((res, rej) => {
  let buf = '';
  const to = setTimeout(() => rej(new Error('no port in 30s:\n' + buf)), 30000);
  vite.stdout.on('data', d => { buf += d.toString(); const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/); if (m) { clearTimeout(to); res(+m[1]); } });
  vite.stderr.on('data', d => { buf += d.toString(); });
  vite.on('exit', c => rej(new Error('vite exited (' + c + '):\n' + buf)));
});
const killVite = () => process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill();
console.log('vite on port ' + port);

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720'] });   // NOT muted: audio ctx runs so __hd.mp counters tick

// Each moment: a hand-picked framing (camera = stand − (sin,cos)yaw·dist).
// Final framings (principle from v1: stand BESIDE the subject, aim yaw at a
// background point, so the mayor doesn't occlude it).
const FRAMINGS = [
  // 1. Bean polisher — worker on the yellow scaffold at the SW underbelly
  { name: 'polisher', q: 'x=79&z=800&yaw=1.72&pitch=0.14&dist=6.5', wait: 4200 },
  // 2. Wedding — over-the-shoulder: photographer → couple → Bean, mayor offset E
  { name: 'wedding',  q: 'x=91&z=824&yaw=-3.05&pitch=0.12&dist=6.8', wait: 4500 },
  // 2b. Wedding in-frame gag — player standing IN the shot (bubble should pop)
  { name: 'wedding-inframe', q: 'x=88.6&z=816.6&yaw=3.14159&pitch=0.06&dist=5', wait: 2200 },
  // 3. Pritzker soundcheck — conductor on the podium, stage behind
  { name: 'soundcheck', q: 'x=152&z=763&yaw=3.14159&pitch=0.12&dist=6', wait: 6500 },
  // 4. Station rumble — grate + pigeon flock; higher camera looking down (less empty sky)
  { name: 'station',  q: 'x=74&z=713&yaw=-3.02&pitch=0.32&dist=5.5', wait: 5200 },
  // regressions: established waypoints must survive the added NPCs
  { name: 'mp-bean-f0', q: 'x=92&z=806&yaw=-2.58&pitch=0.22&dist=8', wait: 3800 },
  { name: 'mp-pritzker-f0', q: 'x=147&z=777&yaw=3.14159&pitch=0.22&dist=8', wait: 3800 },
];

for (const f of FRAMINGS) {
  const r = await shot({ name: f.name, query: 'play=1&' + f.q + '&canary=mpd', waitMs: f.wait, port, browser, dir, perf: true });
  const draws = r.perf ? r.perf.drawCalls : '?';
  console.log(`SHOT ${f.name}: draws=${draws} canary=${r.canary.join('|') || 'NONE'} errors=${r.errors.length}`);
  if (r.errors.length) console.log('  ' + r.errors.slice(0, 5).join('\n  '));
}

// AUDIO PROBE: shot() closes each page, so open a fresh live page near the
// pit, let the natural cycle run (soundcheck ~3 s, station chime ~8 s), then
// force one of each and confirm the counters advance — proves the WebAudio
// scheduling without trusting silence.
const probe = await browser.newPage();
await probe.setViewport({ width: 1280, height: 720 });
await probe.goto('http://localhost:' + port + '/?play=1&x=146.5&z=770&yaw=3.14159&dist=6', { waitUntil: 'networkidle0', timeout: 60000 });
await probe.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start').click(); });
await new Promise(r => setTimeout(r, 9500));                 // catch the natural soundcheck phrase + a station chime
const natural = await probe.evaluate(() => ({
  cell: window.__hd?.mp?.activeCell?.(),
  audio: window.__hd?.audio?.(),
  soundcheck: window.__hd?.mp?.soundcheck,
  station: window.__hd?.mp?.station,
})).catch(e => ({ err: String(e) }));
console.log('PROBE natural:', JSON.stringify(natural));
const forced = await probe.evaluate(() => {
  window.__hd.mp.soundcheck.force(); window.__hd.mp.station.forceChime();
  return { soundcheck: window.__hd.mp.soundcheck, station: window.__hd.mp.station };
}).catch(e => ({ err: String(e) }));
console.log('PROBE forced:', JSON.stringify(forced));

await browser.close();
killVite();
