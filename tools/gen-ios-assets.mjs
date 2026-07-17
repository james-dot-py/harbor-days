// iOS App Store source art for @capacitor/assets (task 083).
// Renders the SAME wordmark as the PWA icons (tools/gen-icons.mjs — the icon IS
// the title card) into the three source images @capacitor/assets expects:
//   assets/icon.png        1024x1024, OPAQUE (iOS app icons forbid alpha)
//   assets/splash.png      2732x2732, wordmark centred small (survives every
//                          device crop, portrait + landscape)
//   assets/splash-dark.png 2732x2732, dusk-peach variant for dark appearance
// `npm run cap:assets` then fans these out into ios/App/App/Assets.xcassets.
// Re-runnable + deterministic: fixed viewport, deviceScaleFactor 1, no rng.
// Usage: node tools/gen-ios-assets.mjs
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets');
mkdirSync(out, { recursive: true });

const PEACH = '#ffb98a';
const CARD_H1 = 58;
const em = px => (px / CARD_H1).toFixed(4) + 'em';
const FONT = 'ui-rounded,"SF Pro Rounded","Hiragino Maru Gothic ProN","Arial Rounded MT Bold","Trebuchet MS",sans-serif';

// The wordmark markup (copied from gen-icons.mjs — these files stand alone).
const markHtml = base => `
  <h1 style="margin:0 -.06em 0 0;display:inline-block;line-height:1;white-space:nowrap;font-weight:bold;
     font-size:${base}px;letter-spacing:.06em;color:#4a3b2f;text-shadow:0 ${em(3)} 0 #f3d9a7;">
     <span style="color:#e0766a">O</span>pe<span style="color:#4fa3c7">!</span></h1>
  <div style="display:flex;align-items:center;justify-content:center;font-size:${base}px;gap:${em(7)};margin:${em(13)} 0 0">
    <i style="width:${em(26)};height:${em(3)};border-radius:${em(2)};background:#9fd3e2;margin:0 ${em(3)}"></i>
    <b style="color:#e0766a;font-size:${em(11)};font-weight:400;line-height:1">&#10038;</b>
    <b style="color:#e0766a;font-size:${em(11)};font-weight:400;line-height:1">&#10038;</b>
    <b style="color:#e0766a;font-size:${em(11)};font-weight:400;line-height:1">&#10038;</b>
    <b style="color:#e0766a;font-size:${em(11)};font-weight:400;line-height:1">&#10038;</b>
    <i style="width:${em(26)};height:${em(3)};border-radius:${em(2)};background:#9fd3e2;margin:0 ${em(3)}"></i>
  </div>`;

// One page renders any size; frac = wordmark ink as fraction of the canvas width.
async function render(page, size, bg, frac, base) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${size}px;height:${size}px;overflow:hidden;background:${bg};font-family:${FONT};}
    #box{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
    #mark{display:inline-block;text-align:center;transform-origin:50% 50%}
  </style></head><body><div id="box"><div id="mark">${markHtml(base)}</div></div></body></html>`;
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // Measure UNSCALED ink once (getBoundingClientRect reports transformed box —
  // the gen-icons.mjs "measure once, scale many" law), then fit to `frac`.
  const ink = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    return h1.getBoundingClientRect().width - parseFloat(getComputedStyle(h1).letterSpacing);
  });
  const k = size * frac / ink;
  await page.evaluate(s => { document.querySelector('#mark').style.transform = 'scale(' + s + ')'; }, k);
  const buf = await page.screenshot({ omitBackground: false });
  console.log(`render ${size}px @ frac ${frac} -> ink ${(ink * k).toFixed(0)}px, scale ${k.toFixed(4)}`);
  return buf;
}

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();

// App icon: opaque peach field, wordmark ~64% ink (matches the PWA 'any' variant).
const iconBuf = await render(page, 1024, PEACH, 0.64, 200);
await sharp(iconBuf).flatten({ background: PEACH }).resize(1024, 1024, { kernel: 'lanczos3' })
  .png().toFile(join(out, 'icon.png'));

// Light splash: peach gradient, wordmark small (~34%) + centred so every device
// crop (portrait & landscape) keeps the whole mark in the central safe zone.
const LIGHT = 'radial-gradient(120% 120% at 50% 38%, #ffd9b0 0%, #ffb98a 48%, #e98f7d 100%)';
const splashBuf = await render(page, 2732, LIGHT, 0.34, 220);
await sharp(splashBuf).resize(2732, 2732, { kernel: 'lanczos3' }).png().toFile(join(out, 'splash.png'));

// Dark splash: dusk-peach so dark appearance looks intentional, same composition.
const DARK = 'radial-gradient(120% 120% at 50% 38%, #7a4a44 0%, #5a3238 48%, #3a2028 100%)';
const darkBuf = await render(page, 2732, DARK, 0.34, 220);
await sharp(darkBuf).resize(2732, 2732, { kernel: 'lanczos3' }).png().toFile(join(out, 'splash-dark.png'));

await page.close();
await browser.close();
for (const f of ['icon.png', 'splash.png', 'splash-dark.png']) {
  const m = await sharp(join(out, f)).metadata();
  console.log(`wrote assets/${f} — ${m.width}x${m.height}, ${m.channels}ch${m.hasAlpha ? '' : ' (no alpha)'}`);
}
