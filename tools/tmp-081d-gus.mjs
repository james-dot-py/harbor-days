// tmp (081): one shot — Gus VISIBLE beside the Park Bait door. Sight line
// offset west of him so the mayor doesn't occlude (the 081b/081c miss).
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const port = +(process.argv[2] || 5419);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'], { cwd: root });
await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('vite timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d)); });

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(`http://localhost:${port}/?play=1&quiet=1&favday=20260717&x=180.6&z=-745.8&canary=gus1`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.f081, { timeout: 15000 });
await sleep(900);
await page.evaluate(() => { const p = window.__hd.player, c = window.__hd.input.cam; c.freeT = 999; c.yaw = Math.atan2(177.6 - p.x, -741.6 - p.z); c.pitch = 0.2; c.dist = 4.6; });
await sleep(500);
await page.screenshot({ path: join(here, 'shots', '081d-gus.png') });
console.log('shot taken; pageerrors:', errors.length);
await browser.close(); vite.kill(); process.exit(0);
