// tmp-129-b-draws.mjs — draw-call probe at the reserve framings (executor B).
// node tools/tmp-129-b-draws.mjs <port> [label]
import puppeteer from 'puppeteer';
const port = process.argv[2] || '5223';
const label = process.argv[3] || '';
const VIEWS = [
  ['lawnfill', 'play=1&x=164&z=-735&yaw=-2.6&pitch=0.1&dist=9'],
  ['reserve',  'play=1&x=100&z=-769&yaw=-1.57&pitch=0.08&dist=8'],
  ['exclosure','play=1&x=80&z=-776&yaw=-2.88&pitch=0.08&dist=7'],
  ['overlook', 'play=1&x=56&z=-779&yaw=2.11&pitch=0.14&dist=8'],
  ['gateE',    'play=1&x=160&z=-758&yaw=-2.3&pitch=0.06&dist=6'],
  ['spawn',    'play=1&quiet=1'],
  ['mtdunes',  'play=1&x=196&z=-1040&yaw=-1.2&pitch=0.05&dist=8'],
];
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 720 });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
for (const [name, q] of VIEWS) {
  await p.goto(`http://localhost:${port}/?${q}&canary=draws129`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await new Promise(r => setTimeout(r, 4200));
  const info = await p.evaluate(() => window.__hd ? window.__hd.perf() : null);
  console.log(label.padEnd(7), name.padEnd(10), info ? info.drawCalls : 'NO __hd');
}
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no console/page errors');
await b.close();
