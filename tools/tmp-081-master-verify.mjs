// tmp (081): ORCHESTRATOR master integration verify — the whole favors layer
// working TOGETHER on one tree. Covers what the per-pack verifies can't:
//   A. integration smoke — pool of 10, in-engine rotation picks EXACTLY match
//      tools/tmp-081-days.mjs's offline replica on three sample days + the
//      real-date path returns 3-4 ids.
//   B. the journal "Around the neighborhood" surface (today's givers + the
//      tomorrow hint) once the first dib lands.
//   C. THE FULL LAKEFRONT CITY STAMP end-to-end in ONE session: seed the
//      stones signature (a previously-skipped stone), then REAL oldstyle
//      (Malört swig offer → the L to Sluggers → the L back → delivery) + REAL
//      divvyangel (offer → wheel 3 strays to docks → turn-in) → the stamp
//      toast + flag + the Mayor-for-Real journal row flips.
//   D. a real look at THE GULL (off-axis close-up — the pack shots never
//      framed the model itself).
//   E. gates: zero console errors / [framework]/[econ] warns, every canary.
// Usage: node tools/tmp-081-master-verify.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, 'shots');
mkdirSync(outDir, { recursive: true });
const port = +(process.argv[2] || 5416);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'], { cwd: root });
await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('vite timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d)); });

const results = []; const ok = (n, p, x = '') => { results.push(p); console.log(`${p ? 'ok  ' : 'FAIL'} ${n}${x ? '  — ' + x : ''}`); };
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const warns = [], errors = [], canaries = [], wantCanaries = [];
const isNoise = t => t.includes('favicon') || t.includes('404') || t.includes('manifest') || t.includes('sw.js') || t.includes('goatcounter');
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !isNoise(t)) errors.push(t); else if (t.startsWith('[canary]')) canaries.push(t); if (t.includes('[framework]') || t.includes('[econ]')) warns.push(t); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

let _cn = 0;
const load = async (extra = '', sx, sz) => {
  const canary = 'm' + (_cn++) + Math.floor(Math.random() * 1e5); wantCanaries.push(canary);
  const pos = (sx !== undefined) ? `&x=${sx}&z=${sz}` : '';
  const q = `play=1&quiet=1${pos}&canary=${canary}${extra}`;
  await page.goto(`http://localhost:${port}/?${q}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__hd && window.__hd.econ && window.__hd.f081 && window.__hd.favors081 && window.__hd.mayor4real, { timeout: 15000 });
  await sleep(700);
  return canary;
};
const tele = (x, z, y) => page.evaluate(o => { const p = window.__hd.player; p.x = o.x; p.z = o.z; if (o.y !== undefined) p.y = o.y; p.vx = p.vz = 0; }, { x, z, y });
const aimCam = (tx, tz, pitch = 0.12, dist = 4.5) => page.evaluate(o => { const p = window.__hd.player, c = window.__hd.input.cam; c.freeT = 999; c.yaw = Math.atan2(o.tx - p.x, o.tz - p.z); c.pitch = o.pitch; c.dist = o.dist; }, { tx, tz, pitch, dist });
const press = async (key, ms = 80) => { await page.evaluate(k => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), key); await sleep(ms); await page.evaluate(k => window.dispatchEvent(new KeyboardEvent('keyup', { key: k })), key); await sleep(70); };
const promptTxt = () => page.evaluate(() => { const e = document.getElementById('promptlabel'); return e ? e.textContent : ''; });
const dibs = () => page.evaluate(() => window.__hd.econ.save().dibs);
const toastNow = () => page.evaluate(() => (document.getElementById('toastMain').textContent + ' | ' + document.getElementById('toastSub').textContent));
const pollToast = async (sub, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const t = await toastNow(); if (t.toLowerCase().includes(sub.toLowerCase())) return true; await sleep(180); } return false; };
const favAt = (id) => page.evaluate(i => window.__hd.econ.favors.at(i), id);
const today = () => page.evaluate(() => window.__hd.favors081.today());
const cellVisible = (name) => page.evaluate(n => { let v = false; window.__hd.scene.traverse(o => { if (o.name === n && o.visible) v = true; }); return v; }, name);
const flag = (k) => page.evaluate(kk => window.__hd.flags.get(kk), k);
const waitFor = async (fn, ms = 15000, iv = 250) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(iv); } return false; };
const pollPrompt = async (re, ms = 6000) => waitFor(async () => re.test(await promptTxt()), ms, 200);
const draws = () => page.evaluate(() => window.__hd.perf().drawCalls);
const clearSave = () => page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });

// offline-replica expectations (node tools/tmp-081-days.mjs, pool of 10)
const EXPECT = {
  20260717: ['loveletter', 'divvyangel', 'baitphoto'],
  20260719: ['fieldnotes', 'recipeglide', 'loveletter', 'chalkbag'],
  20260720: ['chalkbag', 'drumstick', 'fieldnotes'],
};

// =============================== A. smoke ==================================
let c = await load(); await clearSave();
ok('A: canary echoed', canaries.some(x => x.includes(c)));
const pool = await page.evaluate(() => window.__hd.favors081.pool().length);
ok('A: rotation pool is the full 10', pool === 10, 'pool=' + pool);
const realToday = await today();
ok('A: real-date rotation deals 3-4', realToday.length >= 3 && realToday.length <= 4, JSON.stringify(realToday));
for (const [day, exp] of Object.entries(EXPECT)) {
  await load(`&favday=${day}`);
  const t = (await today()).slice().sort(), e = exp.slice().sort();
  ok(`A: in-engine picks match offline replica for ${day}`, JSON.stringify(t) === JSON.stringify(e), JSON.stringify(t));
}

// ===================== B. journal: around the neighborhood ==================
await load(); await clearSave();
await load('&favday=20260717');                       // spawn = AIDS Garden forecourt (OUTSIDE the zone rects)
await tele(95, 120); await sleep(300);                // walk INTO the AIDS Garden zone — a stationary spawn earns nothing BY DESIGN (a fresh boot shows a game, not an economy); real players move
ok('B: first dib landed (zone discovery)', await waitFor(async () => (await dibs()) > 0, 10000), 'dibs=' + await dibs());
await press('j'); await sleep(400);
const nb = await page.evaluate(() => {
  const secs = [...document.querySelectorAll('#journalBody .jsec')];
  const s = secs.find(el => /around the neighborhood/i.test(el.querySelector('h2')?.textContent || ''));
  if (!s) return null;
  s.scrollIntoView();
  return s.textContent;
});
ok('B: "Around the neighborhood" section renders', !!nb);
ok('B: lists Sal + Reggie + Gus (the 20260717 actives)', !!nb && /Sal/.test(nb) && /Reggie/.test(nb) && /Gus/.test(nb), JSON.stringify(nb));
ok('B: the tomorrow hint line', !!nb && /different neighbors tomorrow/i.test(nb));
await sleep(300);
await page.screenshot({ path: join(outDir, '081-int-journal-neighbors.png') });
await press('j');

// ================= C. THE FULL LAKEFRONT STAMP, end-to-end ==================
await load('&favday=20260717');
// the lakefront's SIGNATURE activity: the player skipped a stone at the Rocks.
// Set it in-session through the real payout path (state.paidFirsts.stones) — robust
// vs the 3 s counter snapshot; the SAVE round-trip itself is proven separately by
// the walkprobe save-integrity section + tools/tmp-082-save.mjs.
const dSig0 = await dibs();
await page.evaluate(() => window.__hd.econ.wallet.pay({ key: 'stones', first: 5, repeat: 0, reason: 'skipped a stone at the Rocks', label: 'stones' }));
ok('C: lakefront signature (skipped a stone) registered', (await dibs()) === dSig0 + 5);   // the first stones payout lands +5 AND sets paidFirsts.stones (the stamp's signature gate)

// --- C1. oldstyle, the real loop: swig -> the L up -> Sluggers -> the L back -> deliver
await tele(156, 90); await sleep(500);
ok('C1: Malört-guy prompt', /band-aid|one more/i.test(await promptTxt()), JSON.stringify(await promptTxt()));
await press('e');
ok('C1: the swig earns the errand (offer after onSwigDone)', await waitFor(async () => (await favAt('oldstyle')).st === 'active', 15000), JSON.stringify(await favAt('oldstyle')));
await tele(16, 100); await sleep(500);
ok('C1: Belmont board prompt (ride to Addison)', /ride the red line/i.test(await promptTxt()), JSON.stringify(await promptTxt()));
await press('e');
ok('C1: arrived in Wrigleyville', await waitFor(() => cellVisible('cell-wrigleyville'), 25000, 500));
await sleep(800);
await tele(-325.5, -481.5); await sleep(700);
ok('C1: Sluggers door prompt', await pollPrompt(/old style/i), JSON.stringify(await promptTxt()));
await press('e'); await sleep(400);
ok('C1: can in the bag, step 1', await page.evaluate(() => window.__hd.econ.bag.has('old-style')) && (await favAt('oldstyle')).step === 1);
await tele(-138.5, -447, 7.6); await sleep(700);
ok('C1: Addison board prompt (ride to Belmont)', await pollPrompt(/ride the red line/i), JSON.stringify(await promptTxt()));
await press('e');
ok('C1: back on the lakefront', await waitFor(async () => !(await cellVisible('cell-wrigleyville')), 30000, 500));
await sleep(1600);                                     // the L-arrival re-seats the player at the Belmont board — let it settle before we walk to the guy (an immediate teleport gets fought)
// reach the Malört guy: poll until HIS prompt wins (re-teleporting past the board's lingering prompt)
const atGuy = await waitFor(async () => { await tele(156, 90); await sleep(280); return /band-aid|one more/i.test(await promptTxt()); }, 8000, 300);
ok('C1: back at the Malört guy (past the board)', atGuy, JSON.stringify(await promptTxt()));
const dPre = await dibs();                             // captured AT the guy — incidental zone income during travel doesn't skew the reward check
await press('e');
ok('C1: BURNT BAND-AID delivery toast', await pollToast('a cold Old Style', 12000), await toastNow());
ok('C1: oldstyle done (+12)', (await favAt('oldstyle')).st === 'done' && (await dibs()) >= dPre + 12, `dibs ${dPre} -> ${await dibs()}`);

// --- C2. divvyangel, the real loop: offer -> wheel 3 strays home -> turn-in
await tele(30, 116); await sleep(600);
ok('C2: Reggie offer prompt', await pollPrompt(/reggie|angel|what/i), JSON.stringify(await promptTxt()));
await press('e'); await sleep(400);
ok('C2: divvyangel offered', (await favAt('divvyangel')).st === 'active');
const bikes = await page.evaluate(() => window.__hd.f081.divvyangel.bikes());
const DOCK_FOR = [[95, 145], [80, -330], [40, -40]];   // nearest dock per stray (AIDS garden / dog beach / harbor lawn)
for (let i = 0; i < 3; i++) {
  const b = bikes[i];
  const dock = DOCK_FOR.slice().sort((p, q) => Math.hypot(p[0] - b.x, p[1] - b.z) - Math.hypot(q[0] - b.x, q[1] - b.z))[0];
  await tele(b.x, b.z); await sleep(500);
  ok(`C2: stray ${i + 1} wheel prompt`, await pollPrompt(/wheel/i), JSON.stringify(await promptTxt()));
  await press('e'); await sleep(400);
  await tele(dock[0], dock[1]); await sleep(600);
  ok(`C2: stray ${i + 1} dock prompt`, await pollPrompt(/dock it/i), JSON.stringify(await promptTxt()));
  await press('e'); await sleep(500);
  const done = await page.evaluate(() => window.__hd.f081.divvyangel.docked());
  ok(`C2: stray ${i + 1} docked (count ${done})`, done === i + 1);
}
await tele(30, 116); await sleep(600);
ok('C2: Reggie turn-in prompt', await pollPrompt(/reggie|thanks|home|angel|what/i), JSON.stringify(await promptTxt()));
const dPre2 = await dibs();
await press('e');
// the turn-in banner queues BEHIND up to 3 'DIVVY DOCK N/8' discovery toasts (docking a
// stray at a real Divvy dock also discovers it — 3s each), so poll well past 9 s.
ok('C2: DIVVY ANGEL toast', await pollToast('three bikes home', 14000), await toastNow());

// --- C3. THE STAMP lands (2 favors done + the stones signature)
ok('C3: the lakefront stamp flag set', await waitFor(async () => (await flag('ope.stamp.lakefront')) === '1', 8000));
ok('C3: CITY STAMP toast', await pollToast('city stamp', 6000) || await pollToast("that's a neighborhood", 3000), await toastNow());
await sleep(300);
await page.screenshot({ path: join(outDir, '081-int-stamp.png') });
const dPost = await dibs();
ok('C3: turn-in +12 and stamp +8 both paid', dPost >= dPre2 + 20, `dibs ${dPre2} -> ${dPost} (>= +20)`);
await press('j'); await sleep(400);
const m4r = await page.evaluate(() => {
  const secs = [...document.querySelectorAll('#journalBody .jsec')];
  const s = secs.find(el => /mayor for real/i.test(el.querySelector('h2')?.textContent || ''));
  if (!s) return null;
  s.scrollIntoView();
  return s.textContent;
});
ok('C3: Mayor-for-Real row flipped to stamped', !!m4r && /the lakefront — stamped/i.test(m4r), JSON.stringify(m4r && m4r.slice(0, 200)));
await sleep(300);
await page.screenshot({ path: join(outDir, '081-int-m4r.png') });
await press('j');

// ==================== D. the gull, actually looked at =======================
await load('&favday=20260723&dibs=40', -322, -478); await clearSave();
await load('&favday=20260723&dibs=40', -322, -478);
await tele(-283.9, -448.2); await sleep(500); await press('e'); await sleep(500);   // box office
await tele(-277.14, -417.66); await sleep(500); await press('e'); await sleep(2500); // marquee gate
ok('D: entered the bowl', await cellVisible('cell-wrigley-bowl'));
const umpAt = await page.evaluate(() => window.__hd.f081.umpwhistle.at_ump);
await tele(umpAt.x, umpAt.z, 0); await sleep(900);
await press('e'); await sleep(600);
const g = await page.evaluate(() => window.__hd.f081.umpwhistle.gull());
ok('D: gull spawned', !!g, JSON.stringify(g));
if (g) {
  // stand BESIDE the gull (047 law: subject off-axis, mayor on empty ground)
  const HPB = [-252, -864];
  const ux = HPB[0] - g.pos.x, uz = HPB[1] - g.pos.z, ur = Math.hypot(ux, uz) || 1;
  const tx = -uz / ur, tz = ux / ur;                    // tangential
  await tele(g.pos.x + tx * 2.4, g.pos.z + tz * 2.4); await sleep(400);
  await aimCam(g.pos.x - tx * 1.6, g.pos.z - tz * 1.6, 0.32, 3.4);
  await sleep(500);
  await page.screenshot({ path: join(outDir, '081-int-gull-close.png') });
  const dg = await draws();
  ok('D: draws <= 480 at the gull close-up', dg <= 480, 'drawCalls=' + dg);
}

// ================================ E. gates ==================================
ok('E: every canary echoed', wantCanaries.every(w => canaries.some(x => x.includes(w))), `${canaries.length}/${wantCanaries.length}`);
ok('E: zero [framework]/[econ] warns', warns.length === 0, warns.slice(0, 6).join(' | '));
ok('E: zero console errors', errors.length === 0, errors.slice(0, 6).join(' | '));

const fails = results.filter(r => !r).length;
console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL MASTER CHECKS PASSED'));
await browser.close(); vite.kill(); process.exit(fails ? 1 : 0);
