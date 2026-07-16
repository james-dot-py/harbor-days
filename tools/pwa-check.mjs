// Lighthouse-style PWA installability check — no network, no new deps.
//
// Checks the three things that silently rot: (1) the manifest is valid and every
// icon it declares actually exists at the pixel size it claims, (2) the SW is a
// real fetch-handling SW, (3) `npm run build` still emits EXACTLY one file and
// that file still carries the PWA <head> tags. The icon-dimension check is the
// one that catches an icon regenerated at the wrong size — a manifest can look
// perfect and still be uninstallable.
// Usage: node tools/pwa-check.mjs   (exit 1 if any check fails)
import { readFileSync, existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const results = [];
const pass = name => results.push(['PASS', name, '']);
const fail = (name, why) => results.push(['FAIL', name, why]);
const check = (name, fn) => { try { const why = fn(); why ? fail(name, why) : pass(name); } catch (e) { fail(name, e.message); } };

// ---------------------------------------------------------------- manifest
let mf = null, mfErr = null;
try { mf = JSON.parse(readFileSync(join(pub, 'manifest.webmanifest'), 'utf8')); }
catch (e) { mfErr = e.message; }
check('manifest is valid JSON', () => mfErr && `public/manifest.webmanifest: ${mfErr}`);

const icons = mf?.icons ?? [];
const purposes = ic => String(ic.purpose ?? 'any').split(/\s+/).filter(Boolean);
const declared = ic => parseInt(String(ic.sizes ?? '').split('x')[0], 10) || 0;
const iconFile = ic => join(pub, String(ic.src ?? '').replace(/^\//, ''));

// sharp's metadata is async and the checks below are sync — read dimensions first
const dims = new Map();
for (const ic of icons) {
  if (!existsSync(iconFile(ic))) continue;
  try { const m = await sharp(iconFile(ic)).metadata(); dims.set(ic.src, m); } catch { /* reported as unreadable below */ }
}

if (mf) {
  for (const f of ['name', 'short_name', 'start_url', 'scope', 'background_color', 'theme_color'])
    check(`manifest.${f} present`, () => (mf[f] === undefined || mf[f] === '') && 'missing or empty');

  const DISPLAYS = ['standalone', 'fullscreen', 'minimal-ui'];
  check('manifest.display is installable', () =>
    !DISPLAYS.includes(mf.display) && `display=${JSON.stringify(mf.display)} is not one of ${DISPLAYS.join('/')}`);

  const any = icons.filter(ic => purposes(ic).includes('any'));
  check('icon: an "any" >= 192px', () =>
    !any.some(ic => declared(ic) >= 192) && 'no purpose=any icon declares sizes >= 192x192');
  check('icon: an "any" >= 512px', () =>
    !any.some(ic => declared(ic) >= 512) && 'no purpose=any icon declares sizes >= 512x512');
  check('icon: a "maskable"', () =>
    !icons.some(ic => purposes(ic).includes('maskable')) && 'no purpose=maskable icon declared');

  for (const ic of icons) {
    const rel = `public${String(ic.src)}`;
    check(`icon exists: ${ic.src}`, () => !existsSync(iconFile(ic)) && `${rel} not on disk`);
    if (!existsSync(iconFile(ic))) continue;
    check(`icon is ${ic.sizes}: ${ic.src}`, () => {
      const m = dims.get(ic.src);
      if (!m) return `${rel} is unreadable as an image`;
      const d = declared(ic);
      if (m.width !== d || m.height !== d)
        return `declares sizes="${ic.sizes}" but the file is ${m.width}x${m.height}`;
      return null;
    });
  }
}

// ---------------------------------------------------------------- service worker
check('sw.js exists', () => !existsSync(join(pub, 'sw.js')) && 'public/sw.js not on disk');
check('sw.js has a fetch listener', () => {
  if (!existsSync(join(pub, 'sw.js'))) return 'public/sw.js not on disk';
  const src = readFileSync(join(pub, 'sw.js'), 'utf8');
  return !/addEventListener\(\s*['"]fetch['"]/.test(src) && 'no addEventListener("fetch", ...) — Chrome will not offer install';
});

// ---------------------------------------------------------------- build
let buildErr = null;
try { execSync('npm run build', { cwd: root, stdio: 'pipe' }); }
catch (e) { buildErr = (e.stdout?.toString() || '') + (e.stderr?.toString() || '') || e.message; }
check('npm run build succeeds', () => buildErr && buildErr.trim().split('\n').slice(-3).join(' / '));

const dist = join(root, 'dist');
check('dist/ is exactly index.html (single-file contract)', () => {
  if (!existsSync(dist)) return 'dist/ does not exist';
  const files = readdirSync(dist);
  return !(files.length === 1 && files[0] === 'index.html') && `dist/ contains [${files.join(', ')}] — build must copy nothing else`;
});

// ---------------------------------------------------------------- head tags
// index.html is another agent's file; these read the BUILT output only.
const distHtml = existsSync(join(dist, 'index.html')) ? readFileSync(join(dist, 'index.html'), 'utf8') : '';
const tag = re => distHtml.match(re)?.[0] ?? null;

check('dist/index.html links the manifest', () => {
  if (!distHtml) return 'dist/index.html missing';
  const t = tag(/<link[^>]*rel=["']?manifest["']?[^>]*>/i);
  if (!t) return 'no <link rel="manifest"> in the built html';
  return !/href=["']?\/manifest\.webmanifest["']?/i.test(t) && `manifest link does not point at /manifest.webmanifest: ${t}`;
});
check('dist/index.html has an apple-touch-icon', () => {
  if (!distHtml) return 'dist/index.html missing';
  return !/rel=["']?apple-touch-icon["']?/i.test(distHtml) && 'no <link rel="apple-touch-icon"> in the built html';
});
for (const meta of ['apple-mobile-web-app-capable', 'mobile-web-app-capable', 'apple-mobile-web-app-status-bar-style', 'theme-color'])
  check(`dist/index.html has meta name="${meta}"`, () => {
    if (!distHtml) return 'dist/index.html missing';
    return !new RegExp(`name=["']?${meta.replace(/-/g, '\\-')}["']?`, 'i').test(distHtml) && `no <meta name="${meta}"> in the built html`;
  });
check('dist/index.html viewport has viewport-fit=cover', () => {
  if (!distHtml) return 'dist/index.html missing';
  const t = tag(/<meta[^>]*name=["']?viewport["']?[^>]*>/i);
  if (!t) return 'no viewport meta';
  return !/viewport-fit\s*=\s*cover/i.test(t) && `viewport meta lacks viewport-fit=cover: ${t}`;
});

// ---------------------------------------------------------------- report
for (const [verdict, name, why] of results)
  console.log(verdict === 'PASS' ? `PASS ${name}` : `FAIL ${name}: ${why}`);
const ok = results.filter(r => r[0] === 'PASS').length;
console.log(`\npwa-check: ${ok}/${results.length} passed`);
if (ok !== results.length) process.exit(1);
