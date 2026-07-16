// PWA icon set for Ope! — the icon IS the title card's wordmark.
// Renders the art with puppeteer at 1024x1024, then sharp-resizes the set down.
// Re-runnable + deterministic: fixed viewport, deviceScaleFactor 1, no rng.
//
// The palette/type below is COPIED from index.html's :root / #title / .card
// block (not imported — this file must stand alone). If the title card's colours
// move, move them here too. Every card px value is expressed in em against the
// h1 font-size (the card's h1 renders at 58px, so 3px shadow == .0517em, etc.),
// which lets one transform:scale() on #mark size the whole composition.
// Usage: node tools/gen-icons.mjs
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'icons');
mkdirSync(out, { recursive: true });

const SIZE = 1024;          // master render; everything downsamples from this
const BASE = 200;           // h1 font-size before the fit scale
const CARD_H1 = 58;         // .card h1's max font-size — the em conversion basis
const em = px => (px / CARD_H1).toFixed(4) + 'em';

const BG = 'radial-gradient(120% 120% at 50% 20%, #ffd9b0 0%, #ffb98a 45%, #e98f7d 100%)';
const FONT = 'ui-rounded,"SF Pro Rounded","Hiragino Maru Gothic ProN","Arial Rounded MT Bold","Trebuchet MS",sans-serif';
const PEACH = '#ffb98a';    // --peach, the gradient's mid stop

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;width:${SIZE}px;height:${SIZE}px;overflow:hidden;
    background:${BG};font-family:${FONT};}
  #box{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
  #mark{display:inline-block;text-align:center;transform-origin:50% 50%}
  /* negative right margin cancels letter-spacing's trailing gap after "!", so
     the wordmark's ink centres true instead of sitting .03em left */
  h1{margin:0 -.06em 0 0;display:inline-block;line-height:1;white-space:nowrap;font-weight:bold;
     font-size:${BASE}px;letter-spacing:.06em;color:#4a3b2f;text-shadow:0 ${em(3)} 0 #f3d9a7;}
  h1 .o{color:#e0766a}h1 .b{color:#4fa3c7}
  /* quiet Chicago-flag nod: two sky stripes flanking four six-point stars */
  .chi{display:flex;align-items:center;justify-content:center;font-size:${BASE}px;
       gap:${em(7)};margin:${em(13)} 0 0}
  .chi i{width:${em(26)};height:${em(3)};border-radius:${em(2)};background:#9fd3e2;margin:0 ${em(3)}}
  .chi b{color:#e0766a;font-size:${em(11)};font-weight:400;line-height:1}
</style></head><body>
  <div id="box"><div id="mark">
    <h1><span class="o">O</span>pe<span class="b">!</span></h1>
    <div class="chi"><i></i><b>&#10038;</b><b>&#10038;</b><b>&#10038;</b><b>&#10038;</b><i></i></div>
  </div></div>
</body></html>`;

// any:      wordmark fills ~78% — Safari tab/bookmark + Android non-maskable.
// maskable: same bleed. Android launchers PREFER the maskable icon, so this is the
//           one most users actually see — it carries the set's presence rather than
//           hiding in the peach field. Rendered wordmark ink is ~64% of the width.
//
// NOTE the unit: these fractions fit the h1's NOMINAL advance width (its box minus
// the trailing letter-space), but glyph side bearings make the *rendered* ink 94.5%
// of that (455px of 481.5 at scale 1). So 0.677 nominal == ~64% actual ink == 655px
// of 1024. Measure ink off the PNG, not off this number.
//
// Safe zone, measured not assumed (tools/tmp-probe, scale 1): the WHOLE mark's ink
// bbox (wordmark + chi row, x 278..739, y 397..646) has its farthest corner at
// r=269.7 from the icon centre. The maskable safe circle is the inner 80% diameter
// => r=409.6 on this 1024 master, i.e. k <= 1.519. 0.677 gives k=1.440 => r=388,
// clearing the safe radius by 21px. Raising this frac past ~0.714 crops in a
// launcher's circle mask.
const VARIANTS = { any: 0.78, maskable: 0.677 };

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: SIZE, height: SIZE, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);

// Measure the UNSCALED ink exactly once, before any transform is applied.
// getBoundingClientRect() reports the *transformed* box, so measuring inside the
// loop fits each variant against the previous variant's leftover scale — that bug
// shipped the maskable at 34% of the icon instead of its intended size, because
// iteration 2 divided by an already-1.66x-inflated ink. Measure once, scale many.
// #mark is centred and transform-origin is 50% 50%, so scale() grows the mark
// about the icon centre and the bleed-to-edge background is untouched.
const ink = await page.evaluate(() => {
  const h1 = document.querySelector('h1');
  // the shrink-wrapped box carries one trailing letter-space; the ink is that
  // much narrower, and the ink is what we're fitting to the target width
  return h1.getBoundingClientRect().width - parseFloat(getComputedStyle(h1).letterSpacing);
});

const master = {};
for (const [name, frac] of Object.entries(VARIANTS)) {
  const k = SIZE * frac / ink;
  await page.evaluate(s => { document.querySelector('#mark').style.transform = 'scale(' + s + ')'; }, k);
  master[name] = await page.screenshot({ omitBackground: false });
  console.log(`render ${name}: nominal ${(frac * 100).toFixed(1)}% (${(ink * k).toFixed(0)}px of ${SIZE}), scale ${k.toFixed(4)}`);
}
await page.close();
await browser.close();

const write = async (file, buf, px, flatten) => {
  let img = sharp(buf).resize(px, px, { kernel: 'lanczos3' });
  if (flatten) img = img.flatten({ background: PEACH });   // iOS composites alpha on black
  await img.png().toFile(join(out, file));
  const m = await sharp(join(out, file)).metadata();
  console.log(`wrote public/icons/${file} — ${m.width}x${m.height}, ${m.channels}ch${m.hasAlpha ? '' : ' (no alpha)'}`);
};

await write('icon-192.png', master.any, 192);
await write('icon-512.png', master.any, 512);
await write('icon-maskable-192.png', master.maskable, 192);
await write('icon-maskable-512.png', master.maskable, 512);
await write('apple-touch-icon.png', master.any, 180, true);
