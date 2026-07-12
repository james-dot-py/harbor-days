// tmp: capture console.warn/error + pageerror on a millennium dev-spawn load
// (the onWorldReady try/catch downgrades builder throws to console.warn —
// invisible to shot.mjs's error gate; PITFALLS task 051). Usage:
//   node tools/tmp-warnprobe.mjs <port> [query]
import puppeteer from 'puppeteer';
const [port = '5210', query = 'play=1&x=55&z=800&canary=warnprobe'] = process.argv.slice(2);
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=640,360', '--mute-audio'] });
const page = await browser.newPage();
const lines = [];
page.on('console', m => { const t = m.type(); if (t === 'warn' || t === 'warning' || t === 'error' || m.text().startsWith('[canary]')) lines.push(`[${t}] ${m.text()}`); });
page.on('pageerror', e => lines.push('[pageerror] ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 6).join('\n')));
page.on('response', r => { if (r.status() >= 400) lines.push('[http ' + r.status() + '] ' + r.url()); });
await page.goto(`http://localhost:${port}/?${query}`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
await new Promise(r => setTimeout(r, 3000));
const cell = await page.evaluate(() => { try { return window.__hd?.player ? { x: window.__hd.player.x, z: window.__hd.player.z } : null; } catch { return null; } });
console.log(lines.join('\n') || '(no warnings/errors)');
console.log('player:', JSON.stringify(cell));
await browser.close();
