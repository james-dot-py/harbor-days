// tmp: task 122 pack smoke — own vite on STRICT port 5213 + canary c122c,
// one garden shot looking north up the axis at the Bates fountain / doors.
// Reports console errors + the pack's __hd.conservatory() probe.
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const PORT = 5213;
const outPath = join(here, 'shots', 's122-pack.png');

const vite = spawn(process.execPath,
  [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PORT), '--strictPort'],
  { cwd: root });
const port = await new Promise((res, rej) => {
  let buf = ''; const to = setTimeout(() => rej(new Error('vite no port:\n' + buf)), 30000);
  vite.stdout.on('data', d => { buf += d; const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/); if (m) { clearTimeout(to); res(m[1]); } });
  vite.stderr.on('data', d => { buf += d; });
});
const killVite = () => process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill();
console.log('vite on port ' + port);

let probe = null, ok = false;
try {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1300,760'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const canary = [], errs = [], warns = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => {
    const t = m.text();
    if (t.startsWith('[canary]')) canary.push(t);
    else if (m.type() === 'error' && !t.includes('favicon') && !t.includes('404')) errs.push(t);
    else if (m.type() === 'warning' && !t.includes('THREE.WebGLRenderer')) warns.push(t);
  });
  await page.goto(`http://localhost:${port}/?play=1&x=-70&z=733&yaw=2.95&pitch=0.10&dist=5&canary=c122c`,
    { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));
  probe = await page.evaluate(() => (window.__hd && window.__hd.conservatory) ? window.__hd.conservatory() : 'NO PROBE');
  await page.screenshot({ path: outPath });
  // second framing: same spot, aimed left of the axis so the plume top sits
  // RIGHT of the mayor's head (the first shot buries the puffs behind it)
  await page.goto(`http://localhost:${port}/?play=1&x=-70&z=733&yaw=3.35&pitch=0.02&dist=5&canary=c122c`,
    { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: join(here, 'shots', 's122-mist.png') });
  // third step: stand at the vestibule doors, prove the prompt + press E
  await page.goto(`http://localhost:${port}/?play=1&x=-70&z=711.4&yaw=0&pitch=0.06&dist=6&canary=c122c`,
    { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2500));
  const label = await page.evaluate(() => {
    const p = document.getElementById('prompt');
    return { shown: getComputedStyle(p).display, text: document.getElementById('promptlabel').textContent };
  });
  await page.keyboard.press('e');
  await new Promise(r => setTimeout(r, 700));
  const toastTxt = await page.evaluate(() => ({
    main: document.getElementById('toastMain').textContent,
    sub: document.getElementById('toastSub').textContent,
  }));
  await page.screenshot({ path: join(here, 'shots', 's122-door.png') });
  console.log('door prompt:', JSON.stringify(label));
  console.log('door toast :', JSON.stringify(toastTxt));
  await browser.close();
  console.log('canary:', canary);
  console.log('probe :', JSON.stringify(probe));
  console.log('warns :', warns.length, warns.slice(0, 6));
  console.log('ERRORS(' + errs.length + '):');
  for (const e of errs) console.log('  ' + e);
  ok = canary.length > 0 && errs.length === 0;
  console.log('shot  :', outPath);
  console.log(ok ? '122 PACK PASS' : '122 PACK FAIL');
} finally {
  killVite();
}
process.exit(ok ? 0 : 1);
