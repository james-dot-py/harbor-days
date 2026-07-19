// tmp (task 094): dump high canvas-texture signs that no chase-cam framing can
// read (050 law: dump the canvas and look). Pass a mode:
//   node tools/tmp-094-signdump.mjs <port> crown   -> the One-Pru PRUDENT OWL crown plane
//   node tools/tmp-094-signdump.mjs <port> atlas   -> every canvas >=900px wide (plate atlases)
import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';
const port = process.argv[2] || '5199';
const mode = process.argv[3] || 'crown';
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=640,360', '--mute-audio'] });
const page = await browser.newPage();
await page.goto(`http://localhost:${port}/?play=1&x=85&z=750&canary=dump094`, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise(r => setTimeout(r, 2500));
const data = await page.evaluate((mode) => {
  const out = [], seen = new Set();
  const scene = window.__hd && window.__hd.scene;
  if (!scene) return { err: 'no __hd.scene' };
  scene.traverse(o => {
    if (!(o.isMesh && o.material && o.material.map && o.material.map.image && o.material.map.image.toDataURL)) return;
    const img = o.material.map.image;
    const ok = mode === 'crown'
      ? (o.geometry && o.geometry.parameters && o.geometry.parameters.height === 12 && Math.abs(o.position.z - 692.2) < 1.5)
      : (img.width >= 900 && !seen.has(img));
    if (!ok) return;
    seen.add(img);
    out.push({ x: +o.position.x.toFixed(1), y: +o.position.y.toFixed(1), z: +o.position.z.toFixed(1), w: img.width, h: img.height, url: img.toDataURL() });
  });
  return { n: out.length, hits: out };
}, mode);
if (data.err || !data.n) { console.log('FAIL', JSON.stringify({ err: data.err, n: data.n })); process.exit(1); }
data.hits.forEach((h, i) => {
  writeFileSync(`tools/shots/094-signdump-${mode}-${i}.png`, Buffer.from(h.url.split(',')[1], 'base64'));
  console.log(`DUMP tools/shots/094-signdump-${mode}-${i}.png ${h.w}x${h.h} at (${h.x},${h.y},${h.z})`);
});
await browser.close();
