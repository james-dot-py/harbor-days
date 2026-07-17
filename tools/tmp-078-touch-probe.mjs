// tmp (078): split-touch probe — touchStart on the pill, sample #shop DURING the
// hold, then touchEnd and sample again, to see if the shop opens then closes.
import puppeteer from 'puppeteer';
const port = +(process.argv[2] || 5321);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=390,844', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on('pageerror', e => console.log('PAGEERR', e.message));
await page.goto(`http://localhost:${port}/?play=1&quiet=1&dibs=40&yaw=3.14&coach=0&x=100&z=-350&canary=tp`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
await sleep(1500);
const rect = await page.evaluate(() => { const b = document.getElementById('prompt').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
const shopShow = () => page.evaluate(() => document.getElementById('shop').classList.contains('show'));
console.log('pill center', rect, 'shop before', await shopShow());
await page.touchscreen.touchStart(rect.x, rect.y);
await sleep(80);
console.log('shop @80ms into hold', await shopShow());
await sleep(120);
console.log('shop @200ms into hold', await shopShow());
await page.touchscreen.touchEnd();
await sleep(60);
console.log('shop 60ms after release', await shopShow());
await sleep(400);
console.log('shop 460ms after release', await shopShow());
await browser.close(); process.exit(0);
