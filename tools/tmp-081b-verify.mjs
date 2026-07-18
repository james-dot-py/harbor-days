// tmp (081 re-verify): the legs the master verify never covered, on the
// post-084/085/086/087 tree:
//   M. MONTROSE fieldnotes E2E (the 084-recut risk area): touch-tap offer at
//      Lois (both-inputs proof) -> 3 pages in order (shot each) -> turn-in +12.
//   G. Gus baitphoto offer at the post-084 Park Bait door (+ fishBase snapshot).
//   CE. THE CEREMONY: grant 4 stamps (flag-only debug) -> armed -> swear-in ->
//      crowd walks in + sax relocates + confetti -> REGALIA equipped (1-draw
//      proof) -> journal certificate -> RELOAD: stamps + worn regalia persist,
//      ceremony never re-arms.
// Usage: node tools/tmp-081b-verify.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, 'shots');
mkdirSync(outDir, { recursive: true });
const port = +(process.argv[2] || 5417);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const vite = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'], { cwd: root });
await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('vite timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d)); });

const results = []; const ok = (n, p, x = '') => { results.push(p); console.log(`${p ? 'ok  ' : 'FAIL'} ${n}${x ? '  — ' + x : ''}`); };
const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const warns = [], errors = [], canaries = [], wantCanaries = [];
const isNoise = t => t.includes('favicon') || t.includes('404') || t.includes('manifest') || t.includes('sw.js') || t.includes('goatcounter');
const wire = pg => { pg.on('console', m => { const t = m.text(); if (m.type() === 'error' && !isNoise(t)) errors.push(t); else if (t.startsWith('[canary]')) canaries.push(t); if (t.includes('[framework]') || t.includes('[econ]')) warns.push(t); });
  pg.on('pageerror', e => errors.push('[pageerror] ' + e.message)); };

const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 }); wire(page);

let _cn = 0;
const mkLoad = pg => async (extra = '', sx, sz) => {
  const canary = 'b' + (_cn++) + Math.floor(Math.random() * 1e5); wantCanaries.push(canary);
  const pos = (sx !== undefined) ? `&x=${sx}&z=${sz}` : '';
  await pg.goto(`http://localhost:${port}/?play=1&quiet=1${pos}&canary=${canary}${extra}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await pg.waitForFunction(() => window.__hd && window.__hd.econ && window.__hd.f081 && window.__hd.favors081 && window.__hd.mayor4real, { timeout: 15000 });
  await sleep(700);
  return canary;
};
const load = mkLoad(page);
const tele = (x, z, y) => page.evaluate(o => { const p = window.__hd.player; p.x = o.x; p.z = o.z; if (o.y !== undefined) p.y = o.y; p.vx = p.vz = 0; }, { x, z, y });
const aimCam = (tx, tz, pitch = 0.12, dist = 4.5) => page.evaluate(o => { const p = window.__hd.player, c = window.__hd.input.cam; c.freeT = 999; c.yaw = Math.atan2(o.tx - p.x, o.tz - p.z); c.pitch = o.pitch; c.dist = o.dist; }, { tx, tz, pitch, dist });
const press = async (key, ms = 80) => { await page.evaluate(k => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), key); await sleep(ms); await page.evaluate(k => window.dispatchEvent(new KeyboardEvent('keyup', { key: k })), key); await sleep(70); };
const promptTxt = () => page.evaluate(() => { const e = document.getElementById('promptlabel'); return e ? e.textContent : ''; });
const pollPrompt = async (re, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (re.test(await promptTxt())) return true; await sleep(200); } return false; };
const dibs = () => page.evaluate(() => window.__hd.econ.save().dibs);
const toastNow = () => page.evaluate(() => (document.getElementById('toastMain').textContent + ' | ' + document.getElementById('toastSub').textContent));
const pollToast = async (sub, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const t = await toastNow(); if (t.toLowerCase().includes(sub.toLowerCase())) return true; await sleep(180); } return false; };
const favAt = (id) => page.evaluate(i => window.__hd.econ.favors.at(i), id);
const draws = () => page.evaluate(() => window.__hd.perf().drawCalls);
const shot = (name) => page.screenshot({ path: join(outDir, name) });

// ================= M. MONTROSE fieldnotes, end to end ======================
// favday 20260719 deals fieldnotes (offline replica, proven by the master verify).
// The OFFER itself lands via a TOUCH TAP on #btnAct (both-inputs proof), on a
// separate touch-emulating page sharing the same origin/save.
{
  const tpage = await browser.newPage(); wire(tpage);
  await tpage.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true });
  const tload = mkLoad(tpage);
  const lois = { x: 206.0, z: -891.4 };  // spawn beside Lois (within the r2.4 offer ring)
  await tload('&favday=20260719&coach=0', lois.x - 1.6, lois.z + 1.2);
  await tpage.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await tload('&favday=20260719&coach=0', lois.x - 1.6, lois.z + 1.2);
  const isTouch = await tpage.evaluate(() => document.body.classList.contains('touch'));
  ok('M: touch layout active (body.touch)', isTouch);
  const tPrompt = await tpage.evaluate(() => { const e = document.getElementById('promptlabel'); return e ? e.textContent : ''; });
  ok('M: Lois offer prompt on touch', /lois/i.test(tPrompt), JSON.stringify(tPrompt));
  await tpage.screenshot({ path: join(outDir, '081b-touch-lois.png') });
  await tpage.tap('#btnAct'); await sleep(600);
  const stT = await tpage.evaluate(() => window.__hd.econ.favors.at('fieldnotes'));
  ok('M: touch tap OFFERS fieldnotes', stT.st === 'active' && stT.step === 0, JSON.stringify(stT));
  await tpage.close();
}
// same save, desktop page: the three pages in order, then the turn-in.
{
  await load('&favday=20260719');
  const f0 = await favAt('fieldnotes');
  ok('M: mid-favor state survived the reload (save)', f0.st === 'active' && f0.step === 0, JSON.stringify(f0));
  const pages = await page.evaluate(() => window.__hd.f081.fieldnotes.pagePos());
  const loisPos = await page.evaluate(() => window.__hd.f081.fieldnotes.loisPos);
  for (let i = 0; i < 3; i++) {
    const [px, pz] = pages[i];
    await tele(px - 0.4, pz + 1.1); await sleep(600);
    const stay = await page.evaluate(() => ({ x: window.__hd.player.x, z: window.__hd.player.z }));
    ok(`M: page ${i + 1} spot is standable (no displacement)`, Math.hypot(stay.x - (px - 0.4), stay.z - (pz + 1.1)) < 0.6, JSON.stringify(stay));
    ok(`M: page ${i + 1} grab prompt`, await pollPrompt(/grab the page/i), JSON.stringify(await promptTxt()));
    await aimCam(px, pz, 0.5, 3.2); await sleep(400);
    await shot(`081b-page-${i + 1}.png`);
    await press('e'); await sleep(600);
    const f = await favAt('fieldnotes');
    ok(`M: page ${i + 1} advances to step ${i + 1}`, f.st === 'active' && f.step === i + 1, JSON.stringify(f));
  }
  await tele(loisPos.x - 1.6, loisPos.z + 1.2); await sleep(600);
  ok('M: turn-in prompt', await pollPrompt(/pages, lois/i), JSON.stringify(await promptTxt()));
  await aimCam(loisPos.x, loisPos.z, 0.2, 4); await sleep(300);
  await shot('081b-lois-turnin.png');
  const dPre = await dibs();
  await press('e');
  ok('M: THE NOTES toast', await pollToast('all three pages', 12000), await toastNow());
  const fDone = await favAt('fieldnotes');
  ok('M: fieldnotes done (+12)', fDone.st === 'done' && (await dibs()) >= dPre + 12, `dibs ${dPre} -> ${await dibs()}`);
}

// ================= G. Gus baitphoto at the post-084 Park Bait ==============
{
  await load('&favday=20260717');
  const gus = await page.evaluate(() => window.__hd.f081.baitphoto.gusPos);
  await tele(gus.x - 1.2, gus.z + 1.4); await sleep(600);
  ok('G: Gus offer prompt', await pollPrompt(/biting, gus/i), JSON.stringify(await promptTxt()));
  await aimCam(gus.x, gus.z, 0.18, 4); await sleep(300);
  await shot('081b-gus.png');
  await press('e'); await sleep(600);
  const b = await favAt('baitphoto');
  ok('G: baitphoto offered', b.st === 'active' && b.step === 0, JSON.stringify(b));
  const fb = await page.evaluate(() => window.__hd.f081.baitphoto.fishBase());
  ok('G: fishBase snapshotted at offer', fb !== null, 'fishBase=' + fb);
}

// ================= CE. THE CEREMONY + THE REGALIA ==========================
{
  await load(); await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await load('&dibs=40');
  await page.evaluate(() => { for (const h of ['lakefront', 'wrigley', 'downtown', 'montrose']) window.__hd.mayor4real.grant(h); });
  const armed = async () => page.evaluate(() => window.__hd.mayor4real.armed());
  let t0 = Date.now(); while (Date.now() - t0 < 8000 && !(await armed())) await sleep(300);
  ok('CE: ceremony armed once all four stamps exist', await armed());
  const inter = await page.evaluate(() => window.__hd.mayor4real.inter);
  await tele(inter.x, inter.z + 1.0); await sleep(700);
  ok('CE: swear-in prompt', await pollPrompt(/sworn in/i), JSON.stringify(await promptTxt()));
  await press('e'); await sleep(800);
  ok('CE: MAYOR FOR REAL toast', await pollToast('sash came back', 8000), await toastNow());
  ok('CE: regalia in the bag + equipped', await page.evaluate(() => window.__hd.mayor4real.hasRegalia() && window.__hd.econ.bag.worn() === 'regalia'));
  const ri = await page.evaluate(() => window.__hd.mayor4real.regaliaInfo());
  ok('CE: regalia is ONE mesh, single material, on the mayor', !!ri && ri.isMesh && !ri.matArray && ri.onMayor, JSON.stringify(ri));
  await aimCam(110.5, 160, 0.22, 10); await sleep(400);
  await shot('081b-ceremony-burst.png');                      // confetti + toast, crowd inbound
  // crowd walk-in (1.6 m/s from up to ~30 m out)
  t0 = Date.now(); let cr = [];
  while (Date.now() - t0 < 30000) { cr = await page.evaluate(() => window.__hd.mayor4real.crowd()); if (cr.length === 9 && cr.every(c => c.arrived)) break; await sleep(600); }
  ok('CE: all 9 wellwishers arrived on the arc', cr.length === 9 && cr.every(c => c.arrived), JSON.stringify(cr.slice(0, 3)));
  const sax = await page.evaluate(() => window.__hd.mayor4real.saxNow());
  ok('CE: the sax guy relocated to the arc east end', !!sax && Math.hypot(sax.x - 119.5, sax.z - 155.5) < 0.5, JSON.stringify(sax));
  // wide: stand between arc and monument, look north at the crowd's faces
  await tele(110.5, 158.5); await sleep(400);
  await aimCam(110.5, 148, 0.2, 9); await sleep(400);
  await shot('081b-ceremony-crowd.png');
  const dCer = await draws();
  ok('CE: draws <= 480 with the full crowd', dCer <= 480, 'drawCalls=' + dCer);
  // the regalia close-up: face the camera (press s = walk toward it), then frame
  await tele(108, 150); await sleep(300);
  await aimCam(108, 160, 0.1, 3.2); await sleep(300);        // cam sits north of the mayor... aim = look toward +z? aim target z>player => cam south looking north
  await press('s', 240); await sleep(500);                   // step toward the camera -> mayor faces it
  await shot('081b-regalia-close.png');
  // the journal certificate
  await press('j'); await sleep(500);
  const m4r = await page.evaluate(() => {
    const secs = [...document.querySelectorAll('#journalBody .jsec')];
    const s = secs.find(el => /mayor for real/i.test(el.querySelector('h2')?.textContent || ''));
    if (!s) return null; s.scrollIntoView(); return s.textContent;
  });
  ok('CE: certificate + tote line in the journal', !!m4r && /MAYOR FOR REAL/.test(m4r) && /sash is in your tote/i.test(m4r), JSON.stringify(m4r && m4r.slice(0, 240)));
  await sleep(300);
  await shot('081b-certificate.png');
  await press('j');

  // ---- RELOAD: persistence + no re-arm ----
  await load('&dibs=40');
  const stamps = await page.evaluate(() => window.__hd.mayor4real.stamps());
  ok('RE: all four stamps persisted', Object.values(stamps).every(Boolean), JSON.stringify(stamps));
  ok('RE: regalia still owned after reload', await page.evaluate(() => window.__hd.mayor4real.hasRegalia()));
  const ri2 = await page.evaluate(() => window.__hd.mayor4real.regaliaInfo());
  ok('RE: worn regalia restored on boot (on the mayor)', !!ri2 && ri2.onMayor, JSON.stringify(ri2));
  ok('RE: ceremony does NOT re-arm', !(await page.evaluate(() => window.__hd.mayor4real.armed())));
  await tele(108, 150); await sleep(400);
  await aimCam(108, 160, 0.1, 3.2); await sleep(300);
  await press('s', 240); await sleep(500);
  await shot('081b-regalia-reload.png');
}

// ================================ gates ====================================
ok('E: every canary echoed', wantCanaries.every(w => canaries.some(x => x.includes(w))), `${canaries.length}/${wantCanaries.length}`);
ok('E: zero [framework]/[econ] warns', warns.length === 0, warns.slice(0, 6).join(' | '));
ok('E: zero console errors', errors.length === 0, errors.slice(0, 6).join(' | '));

const fails = results.filter(r => !r).length;
console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL 081B CHECKS PASSED'));
await browser.close(); vite.kill(); process.exit(fails ? 1 : 0);
