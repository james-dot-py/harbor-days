// tmp (078): draw-call check at the kiosk approach view + spawn (must be <=480).
import puppeteer from 'puppeteer';
const port = +(process.argv[2] || 5321);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
async function perfAt(q, tag) {
  await page.goto(`http://localhost:${port}/?play=1&quiet=1&${q}&canary=perf`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__hd && window.__hd.perf, { timeout: 15000 });
  await sleep(3500);
  const p = await page.evaluate(() => window.__hd.perf());
  console.log(tag, JSON.stringify(p));
  return p.drawCalls;
}
const kiosk = await perfAt('x=100&z=-345&yaw=3.14&pitch=0.12&dist=9', 'KIOSK approach');
const close = await perfAt('x=95&z=-349&yaw=3.14&pitch=0.05&dist=5', 'KIOSK close-up');
const spawn = await perfAt('x=109.5&z=156.6', 'SPAWN');
console.log('\nkiosk<=480:', kiosk <= 480, ' close<=480:', close <= 480, ' spawn<=480:', spawn <= 480);
await browser.close(); process.exit((kiosk <= 480 && close <= 480 && spawn <= 480) ? 0 : 1);
