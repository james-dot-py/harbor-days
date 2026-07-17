// tmp (078): verify the economy framework (wallet / bag / favors / shop /
// persistence / flags) against window.__hd.econ. Spawns its OWN vite on a strict
// free port (never :5173 — foreign/stale trap, PITFALLS) and asserts the canary
// echoes before trusting anything. Collects every console error + pageerror.
// Usage: node tools/tmp-econ-probe.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const port = +(process.argv[2] || 5233);
const canary = 'econprobe' + Math.floor(Math.random() * 1e6);

const vite = spawn(process.execPath,
  [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'],
  { cwd: root });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite start timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});

const results = [];
const ok = (name, pass, extra = '') => { results.push({ name, pass, extra }); console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}${extra ? '  — ' + extra : ''}`); };

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,800', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
const errors = [], canaries = [];
const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)') || t.includes('manifest') || t.includes('sw.js') || t.includes('gc.zgo.at') || t.includes('goatcounter');
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !isNoise(t)) errors.push('[console.error] ' + t); else if (t.startsWith('[canary]')) canaries.push(t); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

const url = `http://localhost:${port}/?play=1&quiet=1&canary=${canary}`;
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
ok('canary echoed', canaries.some(c => c.includes(canary)), canaries.join('|'));

// (a) earnDibs
const a = await page.evaluate(() => {
  window.__hd.econ.wallet.earnDibs(3, 'skipped a beauty');
  const chip = document.getElementById('dibs');
  return { dibs: window.__hd.econ.save().dibs, on: chip.classList.contains('on'), disp: getComputedStyle(chip).display };
});
ok('(a) earnDibs → dibs===3', a.dibs === 3, 'dibs=' + a.dibs);
ok('(a) chip revealed', a.on && a.disp !== 'none', 'on=' + a.on + ' display=' + a.disp);

// (b) bag.define + add + tote shows the tile
const b = await page.evaluate(() => {
  window.__hd.econ.bag.define({ id: 'probe-ball', name: 'probe ball', icon: '🎾', kind: 'holdable', caption: 'a test toy' });
  window.__hd.econ.bag.add('probe-ball', 1);
  window.__hd.econ.bag.open();
  const grid = document.getElementById('toteGrid').innerHTML;
  return { count: window.__hd.econ.bag.count('probe-ball'), hasTile: grid.includes('probe-ball') && grid.includes('probe ball'), open: document.getElementById('tote').classList.contains('show') };
});
ok('(b) bag.count === 1', b.count === 1, 'count=' + b.count);
ok('(b) tote tile rendered', b.hasTile && b.open);
await page.evaluate(() => window.__hd.econ.bag.close());

// (c) favors round-trip + journal section
const c = await page.evaluate(() => {
  const F = window.__hd.econ.favors;
  F.register({ id: 'probe-favor', title: 'a probe errand', giver: 'the tester', reward: 7, todo: ['do step zero', 'do step one'], doneToast: { main: 'nice', sub: 'thanks' } });
  F.offer('probe-favor');
  const afterOffer = { ...window.__hd.econ.save().favors['probe-favor'] };   // snapshot (live obj gets mutated below)
  F.advance('probe-favor');
  const afterAdv = { ...window.__hd.econ.save().favors['probe-favor'] };
  // open journal fresh to render the active step line
  const j = document.getElementById('journal'); j.classList.remove('show');
  document.getElementById('btnJournal').click();
  const activeHtml = document.getElementById('journalBody').innerHTML;
  document.getElementById('btnJournal').click();   // close
  F.complete('probe-favor');
  const done = { ...window.__hd.econ.save().favors['probe-favor'] };
  j.classList.remove('show'); document.getElementById('btnJournal').click();
  const doneHtml = document.getElementById('journalBody').innerHTML;
  document.getElementById('btnJournal').click();
  return { afterOffer, afterAdv, done, hasActiveLine: activeHtml.includes('do step one'), hasDoneLine: doneHtml.includes('a probe errand') && doneHtml.includes('✓'), at: window.__hd.econ.favors.at('probe-favor') };
});
ok('(c) offer → active/step0', c.afterOffer && c.afterOffer.st === 'active' && c.afterOffer.step === 0, JSON.stringify(c.afterOffer));
ok('(c) advance → step1', c.afterAdv && c.afterAdv.step === 1, JSON.stringify(c.afterAdv));
ok('(c) journal shows active step line', c.hasActiveLine);
ok('(c) complete → done', c.done && c.done.st === 'done', JSON.stringify(c.done));
ok('(c) journal shows done ✓ line', c.hasDoneLine);
ok('(c) favors.at() reports done', c.at.st === 'done', JSON.stringify(c.at));

// (d) spendDibs beyond balance
const d = await page.evaluate(() => {
  const before = window.__hd.econ.save().dibs;
  const res = window.__hd.econ.wallet.spendDibs(9999, 'too much');
  return { res, before, after: window.__hd.econ.save().dibs };
});
ok('(d) spendDibs over balance returns false', d.res === false && d.before === d.after, 'res=' + d.res + ' bal ' + d.before + '->' + d.after);

// (f) setFlag/getFlag round-trip lands in save.flags
const f = await page.evaluate(() => {
  window.__hd.flags.set('ope.probe.flag', '42');
  return { get: window.__hd.flags.get('ope.probe.flag'), inSave: window.__hd.econ.save().flags['ope.probe.flag'] };
});
ok('(f) setFlag/getFlag round-trip', f.get === '42' && f.inSave === '42', 'get=' + f.get + ' save=' + f.inSave);

// (e) persistence across reload (same origin/port → localStorage persists)
const expected = await page.evaluate(() => window.__hd.econ.save().dibs);
await new Promise(r => setTimeout(r, 900));   // > 600 ms debounce
await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
const e = await page.evaluate(() => ({ dibs: window.__hd.econ.save().dibs, flag: window.__hd.econ.save().flags['ope.probe.flag'], favor: window.__hd.econ.save().favors['probe-favor'], bag: window.__hd.econ.save().bag['probe-ball'] }));
ok('(e) dibs survived reload', e.dibs === expected, 'expected=' + expected + ' got=' + e.dibs);
ok('(e) flag survived reload', e.flag === '42', 'flag=' + e.flag);
ok('(e) favor survived reload', e.favor && e.favor.st === 'done', JSON.stringify(e.favor));
ok('(e) bag item survived reload', e.bag === 1, 'bag=' + e.bag);

console.log('\n--- console errors / pageerrors ---');
console.log(errors.length ? errors.join('\n') : '(none)');

const fails = results.filter(r => !r.pass).length + (errors.length ? 1 : 0);
console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL PROBE CHECKS PASSED') + (errors.length ? ' (+console errors)' : ''));
await browser.close();
vite.kill();
process.exit(fails ? 1 : 0);
