// tmp-119 mobile spot-check: own vite + canary, PORTRAIT 390x844 hasTouch,
// confirm the LP camera framing (096 portraitK/chaseDistK/baseFov) + the touch
// joystick/buttons render + the touch coach marks. Samples __hd.avatarFrac().
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const runDir = join(here, 'shots', 'mobile-119');
mkdirSync(runDir, { recursive: true });

const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { cwd: root });
const port = await new Promise((res, rej) => {
  let buf = '';
  const to = setTimeout(() => rej(new Error('vite timeout:\n' + buf)), 30000);
  vite.stdout.on('data', d => { buf += d.toString(); const m = buf.replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/); if (m) { clearTimeout(to); res(+m[1]); } });
  vite.stderr.on('data', d => { buf += d.toString(); });
  vite.on('exit', c => rej(new Error('vite exited early (' + c + ')')));
});
const killVite = () => { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(vite.pid), '/t', '/f']) : vite.kill(); };
console.log('vite on port ' + port);

const SHOTS = [
  ['mobile-cafe', 'x=-22&z=912&yaw=-1.95&pitch=0.09&dist=9'],      // the café + paddleboats establishing (096 framing)
  ['mobile-zoo-gate', 'x=-5.5&z=814&yaw=-0.75&pitch=0.1&dist=6.5'],// the zoo gate
  ['mobile-coach', 'x=-25&z=974&yaw=2.78&pitch=0.06&dist=8&coach=1'], // boardwalk + FORCED touch coach marks
];

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=390,844', '--mute-audio'] });
try {
  for (const [name, q] of SHOTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const errors = [], canary = [];
    page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
    page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !t.includes('favicon') && !t.includes('404')) errors.push('[err] ' + t); else if (t.startsWith('[canary]')) canary.push(t); });
    await page.goto('http://localhost:' + port + '/?play=1&canary=m119&' + q, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
    await new Promise(r => setTimeout(r, 2600));
    const info = await page.evaluate(() => {
      const hd = window.__hd;
      const stick = document.getElementById('jzone') || document.getElementById('stick');
      const touchOn = document.body.classList.contains('touch');
      const af = hd && hd.avatarFrac ? hd.avatarFrac() : null;
      const fov = hd && hd.input && hd.input.cam ? null : null;
      return { touchOn, hasStick: !!stick, avatarFrac: af, fov: (window.__hd && window.__hd.scene) ? undefined : undefined };
    });
    await page.screenshot({ path: join(runDir, name + '.png') });
    await page.close();
    console.log('  ' + name + '  touch=' + info.touchOn + ' stick=' + info.hasStick + ' avatarFrac=' + JSON.stringify(info.avatarFrac) + (canary.some(c => c.includes('m119')) ? ' canary-ok' : ' NO-CANARY') + (errors.length ? ' ERR ' + errors.join(';') : ''));
  }
} finally {
  await browser.close();
  killVite();
}
console.log('done -> ' + runDir);
