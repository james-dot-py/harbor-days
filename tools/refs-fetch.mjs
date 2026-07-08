// =====================================================================
//  refs-fetch.mjs — visual reference fetcher (AUTOPILOT.md §4.5).
//  Wikimedia Commons (no key) + Mapillary (token from autopilot/.env) +
//  refs/inbox owner-supplied photos -> refs/<poi>/ with a merged manifest.json.
//
//  Reference photos are VISUAL reference only for hand-modeled stylized assets
//  — never extracted geometry or textures (decision (g)). Google is refused
//  mechanically (defense in depth); no google URL is ever constructed.
//
//  Usage:
//    node tools/refs-fetch.mjs <poi> --query "<search terms>" [--n 6]     (Wikimedia Commons)
//    node tools/refs-fetch.mjs <poi> --mapillary --bbox <s,w,n,e> [--n 6] (skips if token empty)
//    node tools/refs-fetch.mjs --inbox <poi>                              (file refs/inbox/* into refs/<poi>/)
//
//  manifest.json (refs/<poi>/manifest.json) records, per image: source, file,
//  sourceUrl, imageUrl, author, license, title, fetchDate. Merged by file.
// =====================================================================
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, renameSync, statSync } from 'fs';
import { dirname, join, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dir, '..');
const REFS = join(REPO, 'refs');
const INBOX = join(REFS, 'inbox');
const ENV_FILE = join(REPO, 'autopilot', '.env');

const UA = 'HarborDays-Autopilot/1.0 (Harbor Days reference fetch; polite, non-commercial dev)';
const N_DEFAULT = 6, N_CAP = 12;

// ---------------------------- google guard ----------------------------
const GOOGLE_RE = /google\.com|googleapis\.com|gstatic\.com|ggpht|streetview|maps\.google|goo\.gl/i;
function assertNotGoogle(url) {
  if (GOOGLE_RE.test(String(url))) throw new Error('REFUSED google-domain URL (owner decision, no exceptions): ' + url);
  return url;
}

// ------------------------------- args ---------------------------------
function parseArgs(argv) {
  const a = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const k = t.slice(2);
      if (['mapillary'].includes(k)) a.flags[k] = true;
      else if (k === 'inbox') a.flags.inbox = argv[++i];
      else a.flags[k] = argv[++i];
    } else a._.push(t);
  }
  return a;
}

function loadEnv() {
  const env = {};
  if (existsSync(ENV_FILE)) for (const line of readFileSync(ENV_FILE, 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

// --------------------------- manifest I/O -----------------------------
function poiDir(poi) { const d = join(REFS, poi); mkdirSync(d, { recursive: true }); return d; }
function readManifest(dir) {
  const f = join(dir, 'manifest.json');
  if (existsSync(f)) { try { return JSON.parse(readFileSync(f, 'utf-8')); } catch { /* rebuild */ } }
  return { images: [] };
}
function writeManifest(dir, man) {
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(man, null, 2), 'utf-8');
}
function mergeEntry(man, entry) {
  const i = man.images.findIndex(e => e.file === entry.file);
  if (i >= 0) man.images[i] = entry; else man.images.push(entry);
}
function sanitize(name) {
  return name.replace(/^File:/i, '').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_').slice(0, 120);
}
function stripHtml(s) { return String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function download(url, dest) {
  assertNotGoogle(url);
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429 || res.status === 503) {
      const ra = +res.headers.get('retry-after') || 0;
      const wait = Math.max(ra * 1000, 3000 * (attempt + 1));
      console.warn(`  ${res.status} (rate-limited) — waiting ${(wait / 1000)}s then retrying`);
      await sleep(wait); continue;
    }
    if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(dest, buf);
    return buf.length;
  }
  throw new Error('rate-limited after retries: ' + url);
}

// -------------------------- Wikimedia Commons -------------------------
async function fetchWikimedia(poi, query, n) {
  const dir = poiDir(poi);
  const man = readManifest(dir);
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.search = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search',
    gsrsearch: query, gsrnamespace: '6', gsrlimit: String(Math.min(n, N_CAP)),
    prop: 'imageinfo', iiprop: 'url|extmetadata|mime|size', iiurlwidth: '1600',
  }).toString();
  assertNotGoogle(api.href);
  console.log(`  Wikimedia Commons search: "${query}" (up to ${Math.min(n, N_CAP)})`);
  const res = await fetch(api, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error('Commons API HTTP ' + res.status);
  const j = await res.json();
  const pages = Object.values(j?.query?.pages || {});
  if (!pages.length) { console.log('  no results.'); return 0; }
  let got = 0;
  for (const p of pages) {
    const ii = p.imageinfo?.[0]; if (!ii) continue;
    const mime = ii.mime || '';
    if (!/^image\/(jpeg|png|jpg)/i.test(mime)) { console.log('  skip (non-photo mime ' + mime + '):', p.title); continue; }
    const imageUrl = ii.thumburl || ii.url;
    if (!imageUrl) continue;
    const em = ii.extmetadata || {};
    const ext = extname(new URL(ii.url).pathname) || '.jpg';
    const file = sanitize(p.title.replace(/\.[^.]+$/, '')) + (/\.(jpe?g|png)$/i.test(ext) ? ext : '.jpg');
    const dest = join(dir, file);
    try {
      const bytes = await download(imageUrl, dest);
      mergeEntry(man, {
        source: 'wikimedia-commons',
        file,
        title: p.title,
        sourceUrl: ii.descriptionurl || ('https://commons.wikimedia.org/wiki/' + encodeURIComponent(p.title)),
        imageUrl,
        author: stripHtml(em.Artist?.value) || 'unknown',
        license: stripHtml(em.LicenseShortName?.value) || stripHtml(em.UsageTerms?.value) || 'see source',
        credit: stripHtml(em.Credit?.value) || '',
        description: stripHtml(em.ImageDescription?.value) || '',
        fetchDate: new Date().toISOString(),
        bytes,
      });
      got++;
      console.log(`  saved ${file} (${(bytes / 1024).toFixed(0)} kB) — ${stripHtml(em.LicenseShortName?.value) || '?'}`);
      await sleep(500);                              // polite spacing to upload.wikimedia.org
    } catch (e) { console.warn('  download failed:', p.title, '-', e.message); }
  }
  writeManifest(dir, man);
  console.log(`  Wikimedia: ${got} image(s) into ${dir}; manifest has ${man.images.length} total.`);
  return got;
}

// ------------------------------ Mapillary -----------------------------
async function fetchMapillary(poi, bbox, n, env) {
  const token = (env.MAPILLARY_TOKEN || '').trim();
  if (!token) { console.log('  Mapillary: MAPILLARY_TOKEN empty in autopilot/.env — skipping gracefully (implemented, no token).'); return 0; }
  const dir = poiDir(poi);
  const man = readManifest(dir);
  const [s, w, nn, e] = bbox;                       // Mapillary wants w,s,e,n
  const api = new URL('https://graph.mapillary.com/images');
  api.search = new URLSearchParams({
    fields: 'id,thumb_2048_url,captured_at,geometry,compass_angle',
    bbox: `${w},${s},${e},${nn}`, limit: String(Math.min(n, N_CAP)),
  }).toString();
  assertNotGoogle(api.href);
  console.log(`  Mapillary images in bbox ${bbox.join(',')} (up to ${Math.min(n, N_CAP)})`);
  const res = await fetch(api, { headers: { Authorization: 'OAuth ' + token, 'User-Agent': UA } });
  if (!res.ok) throw new Error('Mapillary API HTTP ' + res.status);
  const j = await res.json();
  const imgs = j?.data || [];
  let got = 0;
  for (const im of imgs) {
    const imageUrl = im.thumb_2048_url; if (!imageUrl) continue;
    const file = `mapillary_${im.id}.jpg`;
    try {
      const bytes = await download(imageUrl, join(dir, file));
      mergeEntry(man, {
        source: 'mapillary', file,
        title: 'Mapillary ' + im.id,
        sourceUrl: 'https://www.mapillary.com/app/?pKey=' + im.id,
        imageUrl,
        author: 'Mapillary contributor',
        license: 'CC BY-SA 4.0 (Mapillary)',
        capturedAt: im.captured_at, geometry: im.geometry, compassAngle: im.compass_angle,
        fetchDate: new Date().toISOString(), bytes,
      });
      got++;
      console.log(`  saved ${file} (${(bytes / 1024).toFixed(0)} kB)`);
    } catch (e) { console.warn('  download failed:', im.id, '-', e.message); }
  }
  writeManifest(dir, man);
  console.log(`  Mapillary: ${got} image(s).`);
  return got;
}

// ------------------------------- inbox --------------------------------
function fileInbox(poi) {
  if (!existsSync(INBOX)) { console.log('  refs/inbox/ does not exist — nothing to file.'); return 0; }
  const dir = poiDir(poi);
  const man = readManifest(dir);
  const files = readdirSync(INBOX).filter(f => /\.(jpe?g|png|webp|gif|heic)$/i.test(f) && statSync(join(INBOX, f)).isFile());
  if (!files.length) { console.log('  refs/inbox/ has no images to file.'); return 0; }
  let got = 0;
  for (const f of files) {
    const destName = sanitize(basename(f, extname(f))) + extname(f).toLowerCase();
    const dest = join(dir, destName);
    renameSync(join(INBOX, f), dest);
    mergeEntry(man, {
      source: 'owner', file: destName, title: f,
      sourceUrl: 'refs/inbox (owner-supplied)', imageUrl: null,
      author: 'owner', license: 'owner-supplied (highest-fidelity channel)',
      fetchDate: new Date().toISOString(), bytes: statSync(dest).size,
    });
    got++;
    console.log(`  filed ${f} -> ${destName} (source: owner)`);
  }
  writeManifest(dir, man);
  console.log(`  inbox: filed ${got} image(s) into ${dir}.`);
  return got;
}

// -------------------------------- main --------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = loadEnv();

  if (args.flags.inbox) { fileInbox(args.flags.inbox); return; }

  const poi = args._[0];
  if (!poi) {
    console.error('usage:\n  node tools/refs-fetch.mjs <poi> --query "<terms>" [--n 6]\n  node tools/refs-fetch.mjs <poi> --mapillary --bbox <s,w,n,e> [--n 6]\n  node tools/refs-fetch.mjs --inbox <poi>');
    process.exit(2);
  }
  const n = Math.min(+(args.flags.n || N_DEFAULT), N_CAP);

  if (args.flags.mapillary) {
    if (!args.flags.bbox) { console.error('--mapillary requires --bbox s,w,n,e'); process.exit(2); }
    await fetchMapillary(poi, args.flags.bbox.split(',').map(Number), n, env);
    return;
  }
  if (args.flags.query) { await fetchWikimedia(poi, args.flags.query, n); return; }

  console.error('nothing to do: pass --query, --mapillary, or --inbox');
  process.exit(2);
}

main().catch(e => { console.error('refs-fetch error:', e.message); process.exit(1); });
