// tmp-129-b-census.mjs — per-view draw attribution at the reserve framings.
// node tools/tmp-129-b-census.mjs <port> <viewKey>
import puppeteer from 'puppeteer';
const port = process.argv[2] || '5223';
const key = process.argv[3] || 'overlook';
const VIEWS = {
  lawnfill: 'play=1&x=164&z=-735&yaw=-2.6&pitch=0.1&dist=9',
  reserve: 'play=1&x=100&z=-769&yaw=-1.57&pitch=0.08&dist=8',
  exclosure: 'play=1&x=80&z=-776&yaw=-2.88&pitch=0.08&dist=7',
  overlook: 'play=1&x=56&z=-779&yaw=2.11&pitch=0.14&dist=8',
  gateE: 'play=1&x=160&z=-758&yaw=-2.3&pitch=0.06&dist=6',
};
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 720 });
await p.goto(`http://localhost:${port}/?${VIEWS[key]}&canary=cen129`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await new Promise(r => setTimeout(r, 4200));
const c = await p.evaluate(() => window.__hd.census(200));
console.log(key, 'census total', c.total, '· renderer', (await 0, ''));
for (const [k, v] of c.rows) console.log(String(v).padStart(4), k);
await b.close();
