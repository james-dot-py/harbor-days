// tmp (task 094): measure 'CASEY AT THE BAR' at 800 52px Georgia,serif in the
// SAME headless Chromium the shots run in (050 pitfall: headless lacks Georgia
// and the serif fallback measures wider — a fit that passes on desktop can clip
// in every shot and on font-poor devices).
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
const r = await page.evaluate(() => {
  const g = document.createElement('canvas').getContext('2d');
  const m = {};
  for (const [k, f] of [['georgia52', '800 52px Georgia,serif'], ['georgia44', '800 44px Georgia,serif'], ['georgia40', '800 40px Georgia,serif']]) {
    g.font = f; m[k] = Math.round(g.measureText('CASEY AT THE BAR').width);
  }
  return m;
});
console.log(JSON.stringify(r)); // inner band width is 496 (border strokeRect 8..504)
await browser.close();
