// Contact-sheet compositor for Harbor Days walkthrough shots.
// Composites screenshots into a grid PNG (sharp): each cell = the shot scaled to
// 320x180 with a dark label bar underneath. Falls back to a self-contained HTML
// index of <img> + labels if sharp cannot load at runtime.
//
// Module use (walkthrough.mjs):
//   import { contactSheet } from './contactsheet.mjs'
//   await contactSheet({ shots: [{path, label}], out, cols })  -> returns out path
//
// CLI:
//   node tools/contactsheet.mjs <dir> [out]
//   - if <dir>/report.json exists ({shots:[{shot,id,framing}]}) it drives labels,
//     label = id + '/' + framing index; otherwise globs <dir>/*.png.
//   - default out = <dir>/contact-sheet.png
import { readFileSync, existsSync, readdirSync, writeFileSync } from 'fs';
import { basename, join, relative, dirname } from 'path';
import { pathToFileURL } from 'url';

const CELL_W = 320, CELL_H = 180, BAR_H = 22, PAD = 6, LABEL_MAX = 46;
const BG = { r: 24, g: 24, b: 28, alpha: 1 };
const CELL_BG = { r: 15, g: 15, b: 18, alpha: 1 };

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

function labelSvg(label) {
  let t = String(label);
  if (t.length > LABEL_MAX) t = t.slice(0, LABEL_MAX - 1) + '…';
  return `<svg width="${CELL_W}" height="${BAR_H}" xmlns="http://www.w3.org/2000/svg">`
    + `<rect width="${CELL_W}" height="${BAR_H}" fill="#0b0b0d"/>`
    + `<text x="7" y="${Math.round(BAR_H * 0.72)}" font-family="monospace,Consolas,sans-serif"`
    + ` font-size="13" fill="#e9e9ec">${escapeXml(t)}</text></svg>`;
}

async function buildCell(sharp, { path, label }) {
  let img;
  try {
    img = await sharp(path)
      .resize(CELL_W, CELL_H, { fit: 'contain', background: CELL_BG })
      .ensureAlpha().png().toBuffer();
  } catch {
    // missing / unreadable image -> visible placeholder rather than crashing the sheet
    img = await sharp({ create: { width: CELL_W, height: CELL_H, channels: 4, background: { r: 60, g: 24, b: 24, alpha: 1 } } })
      .composite([{ input: Buffer.from(labelSvg('missing: ' + basename(path))), left: 0, top: Math.round(CELL_H / 2) }])
      .png().toBuffer();
  }
  return await sharp({ create: { width: CELL_W, height: CELL_H + BAR_H, channels: 4, background: CELL_BG } })
    .composite([
      { input: img, left: 0, top: 0 },
      { input: Buffer.from(labelSvg(label)), left: 0, top: CELL_H },
    ]).png().toBuffer();
}

async function composite(sharp, { shots, out, cols }) {
  const rows = Math.ceil(shots.length / cols);
  const cellH = CELL_H + BAR_H;
  const gridW = cols * CELL_W + (cols + 1) * PAD;
  const gridH = rows * cellH + (rows + 1) * PAD;

  const cells = await Promise.all(shots.map(s => buildCell(sharp, s)));
  const layers = cells.map((buf, i) => ({
    input: buf,
    left: PAD + (i % cols) * (CELL_W + PAD),
    top: PAD + Math.floor(i / cols) * (cellH + PAD),
  }));

  await sharp({ create: { width: gridW, height: gridH, channels: 4, background: BG } })
    .composite(layers).png().toFile(out);
  return out;
}

function writeHtmlIndex({ shots, out, reason }) {
  const htmlPath = out.replace(/\.[^.\\/]+$/, '') + '.html';
  const dir = dirname(htmlPath);
  const cards = shots.map(s => {
    const rel = relative(dir, s.path).split('\\').join('/');
    return `  <figure><img src="${escapeXml(rel)}" loading="lazy" alt="${escapeXml(s.label)}">`
      + `<figcaption>${escapeXml(s.label)}</figcaption></figure>`;
  }).join('\n');
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Contact sheet</title>
<style>
  body{margin:0;background:#18181c;color:#e9e9ec;font:13px/1.4 monospace}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:6px;padding:6px}
  figure{margin:0;background:#0f0f12;border-radius:4px;overflow:hidden}
  img{display:block;width:100%;height:auto;background:#000}
  figcaption{background:#0b0b0d;padding:4px 7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style></head>
<body><div class="grid">
${cards}
</div></body></html>`;
  writeFileSync(htmlPath, html);
  console.log('[contactsheet] sharp unavailable (' + reason + '); wrote HTML index -> ' + htmlPath);
  return htmlPath;
}

export async function contactSheet({ shots, out, cols = 4 }) {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch (e) {
    return writeHtmlIndex({ shots, out, reason: e.message });
  }
  return await composite(sharp, { shots, out, cols });
}

// ---- CLI ----
function resolveShotPath(p, dir) {
  if (!p) return p;
  if (existsSync(p)) return p;
  const inDir = join(dir, basename(p));
  if (existsSync(inDir)) return inDir;
  return p; // let buildCell render a placeholder
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const dir = process.argv[2];
  if (!dir) { console.error('usage: node tools/contactsheet.mjs <dir> [out]'); process.exit(1); }
  const out = process.argv[3] || join(dir, 'contact-sheet.png');
  const outBase = basename(out);

  let shots = [];
  const reportPath = join(dir, 'report.json');
  if (existsSync(reportPath)) {
    let rep = {};
    try { rep = JSON.parse(readFileSync(reportPath, 'utf8')); }
    catch (e) { console.error('[contactsheet] bad report.json: ' + e.message); }
    shots = (rep.shots || [])
      .filter(s => s && s.shot)
      .map(s => ({
        path: resolveShotPath(s.shot, dir),
        label: (s.id ?? basename(s.shot, '.png')) + '/' + (s.framing ?? 0),
      }));
  }
  if (!shots.length) {
    shots = readdirSync(dir)
      .filter(f => /\.png$/i.test(f) && f !== outBase)
      .sort()
      .map(f => ({ path: join(dir, f), label: basename(f, '.png') }));
  }
  if (!shots.length) { console.error('[contactsheet] no shots found in ' + dir); process.exit(1); }

  const result = await contactSheet({ shots, out });
  console.log('CONTACTSHEET ' + result + ' (' + shots.length + ' shots)');
}
