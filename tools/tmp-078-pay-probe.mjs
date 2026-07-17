// tmp (078 PAYOUTS + FETCH-DOG ADAPTERS): verifies the activities1 / cornhole /
// traillife slice. Spawns its OWN vite on a strict free port (never :5173 —
// foreign/stale trap, PITFALLS), asserts the canary echoes, then:
//   A. skip-stones payout (real E hold/release chargeThrow) — a good skip pays,
//      a deliberately weak plonk pays nothing.
//   B. cornhole spectator payout — within 12 m the first bago pays +5; far away
//      pays nothing.
//   C. fetch-dog adapters (synthetic recording api): hero + park dogs grab+done,
//      canReach=false for a far point, a trail dog LUNGES + aborts.
//   D. regression: the ordinary beach-ball fetch still increments state.fetches;
//      the trail walkers keep patrolling.
// Screenshots land in tools/shots/078-pay-*.png. Usage:
//   node tools/tmp-078-pay-probe.mjs [port]
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import puppeteer from 'puppeteer';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const shotsDir = join(here, 'shots');
mkdirSync(shotsDir, { recursive: true });
const port = +(process.argv[2] || 5251);
const canary = 'pay078_' + Math.floor(Math.random() * 1e6);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const vite = spawn(process.execPath,
  [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(port), '--strictPort'],
  { cwd: root });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('vite start timeout')), 30000);
  vite.stdout.on('data', d => { if (d.toString().replace(/\x1b\[[0-9;]*m/g, '').match(/localhost:(\d+)/)) { clearTimeout(to); res(); } });
  vite.stderr.on('data', d => process.stderr.write(d));
});

const results = [];
const ok = (name, pass, extra = '') => { results.push({ name, pass }); console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}${extra ? '  — ' + extra : ''}`); };

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,720', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [], canaries = [];
const isNoise = t => t.includes('favicon') || t.includes('404 (Not Found)') || t.includes('manifest') || t.includes('sw.js') || t.includes('goatcounter') || t.includes('gc.zgo.at');
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !isNoise(t)) errors.push('[console.error] ' + t); else if (t.startsWith('[canary]')) canaries.push(t); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

async function nav(x, z, extra = '') {
  const q = new URLSearchParams('play=1&quiet=1');
  if (x != null) q.set('x', x); if (z != null) q.set('z', z);
  q.set('canary', canary);
  for (const [k, v] of new URLSearchParams(extra)) q.set(k, v);
  await page.goto(`http://localhost:${port}/?${q}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => { const t = document.getElementById('title'); if (t && !t.classList.contains('hide')) document.getElementById('start')?.click(); });
  await page.waitForFunction(() => window.__hd && window.__hd.econ, { timeout: 15000 });
  await sleep(500);
}
const dibs = () => page.evaluate(() => window.__hd.econ.save().dibs);
const shoot = name => page.screenshot({ path: join(shotsDir, name + '.png') });

// dispatch fetch() on the adapter matching `name`, wiring a recording synthetic
// api into window.__pl. Returns {who,canReach} for the chosen (bx,bz).
function driveFetch(name, bx, bz) {
  return page.evaluate((name, bx, bz) => {
    window.__pl = { grab: 0, at: 0, done: null, abort: 0, lastAt: null };
    const api = {
      grab() { window.__pl.grab++; },
      at(x, y, z) { window.__pl.at++; window.__pl.lastAt = { x, y, z }; },
      done(x, z) { window.__pl.done = { x, z }; },
      abort() { window.__pl.abort++; },
    };
    const dog = window.__hd.fetchDogs.find(d => d.name === name);
    const cr = dog ? dog.canReach(bx, bz) : null;
    window.__pl.who = dog ? dog.name : null;
    if (dog) dog.fetch(bx, bz, api);
    return { who: dog ? dog.name : null, canReach: cr };
  }, name, bx, bz);
}
const readPl = () => page.evaluate(() => ({ ...window.__pl, player: { x: window.__hd.player.x, z: window.__hd.player.z } }));
async function tp(x, z, yaw) {   // teleport the player on the lakefront (no hard-cell clamp) + face yaw
  await page.evaluate((x, z, yaw) => {
    window.__hd.player.x = x; window.__hd.player.z = z;
    if (yaw != null) window.__hd.input.cam.yaw = yaw;
  }, x, z, yaw);
}

// boot + canary + fresh save
await nav(158.5, 140, 'yaw=1.5708');
ok('canary echoed', canaries.some(c => c.includes(canary)), canaries.join('|'));
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });

// =====================================================================
// A. SKIP-STONES PAYOUT
// =====================================================================
await nav(158.5, 140, 'yaw=1.5708');                     // at a Belmont-Rocks pebble pile, facing east over the lake
async function throwStone(holdMs) {                       // E down fires the interaction + starts chargeThrow; up releases
  await page.keyboard.down('e'); await sleep(holdMs); await page.keyboard.up('e');
}
const d0 = await dibs(); let dPaid = d0;
for (let a = 0; a < 4; a++) {                             // up to 4 strong throws until one pays
  await throwStone(450);
  await sleep(3500);
  dPaid = await dibs();
  if (dPaid > d0) break;
}
ok('A stones: a good skip paid dibs', dPaid > d0, `dibs ${d0} -> ${dPaid}`);
await shoot('078-pay-stones-chip');                       // chip + register pop after a paying skip
const dBeforePlonk = await dibs();
await throwStone(40);                                     // deliberately weak instant release -> plonk
await sleep(3000);
const dAfterPlonk = await dibs();
ok('A stones: a plonk paid nothing', dAfterPlonk === dBeforePlonk, `dibs ${dBeforePlonk} -> ${dAfterPlonk}`);

// =====================================================================
// B. CORNHOLE SPECTATOR PAYOUT
// =====================================================================
await nav(130, 266, 'yaw=0');                             // 6 m from the site (130,272): inside the 12 m call-it window
const dCorn0 = await dibs(); let dCorn1 = dCorn0;
for (let i = 0; i < 90; i++) {                            // poll for the first bago payout (first toss ~3 s in)
  dCorn1 = await dibs();
  if (dCorn1 > dCorn0) break;
  await sleep(200);
}
ok('B cornhole: first bago within 12 m paid +5', dCorn1 - dCorn0 === 5, `dibs ${dCorn0} -> ${dCorn1}`);
await shoot('078-pay-cornhole');                          // register pop + thrower celebration

await nav(130, 306, 'yaw=0');                             // 34 m south of the site — outside the window
const dFar0 = await dibs();
await sleep(9000);                                        // several bagos drop; player is far -> none pay
const dFar1 = await dibs();
ok('B cornhole: no payout while 34 m away', dFar1 === dFar0, `dibs ${dFar0} -> ${dFar1}`);
await shoot('078-pay-cornhole-far');

// =====================================================================
// C. FETCH-DOG ADAPTERS (synthetic recording api)
// =====================================================================
await nav(95, -338, 'yaw=1.5708');                        // dog-beach cove
await page.waitForFunction(() => window.__hd.fetchDogs && window.__hd.fetchDogs.length >= 5, { timeout: 8000 });
await sleep(700);
const names = await page.evaluate(() => window.__hd.fetchDogs.map(d => d.name));
ok('C registry: 5 adapters (hero+2 park+2 trail)', names.length === 5, names.join(','));

// (c) canReach returns false for a far point for ALL beach dogs
const farReach = await page.evaluate(() => window.__hd.fetchDogs
  .filter(d => d.name === 'hero-beach-dog' || d.name.startsWith('dogpark'))
  .map(d => ({ n: d.name, r: d.canReach(150, 90) })));
ok('C(c) canReach(150,90)===false for all beach dogs', farReach.every(x => x.r === false), JSON.stringify(farReach));

// (a) hero dog: ball ~6 m away in the cove -> grab then done, done near the player
await tp(95, -338, 1.5708);
await sleep(300);
const heroDisp = await driveFetch('hero-beach-dog', 106, -332);
await page.waitForFunction(() => window.__pl.grab > 0, { timeout: 5000 }).catch(() => {});
await page.waitForFunction(() => window.__pl.grab > 0 && !window.__pl.done, { timeout: 4000 }).catch(() => {});
await shoot('078-pay-hero-carry');                        // dog mid-carry back to the player
await page.waitForFunction(() => window.__pl.done, { timeout: 6000 }).catch(() => {});
const heroR = await readPl();
const heroDropD = heroR.done ? Math.hypot(heroR.done.x - heroR.player.x, heroR.done.z - heroR.player.z) : 999;
ok('C(a) hero: canReach true for cove ball', heroDisp.canReach === true, JSON.stringify(heroDisp));
ok('C(a) hero: grab then done fired', heroR.grab > 0 && !!heroR.done, `grab=${heroR.grab} done=${JSON.stringify(heroR.done)} at=${heroR.at}`);
ok('C(a) hero: done landed <=1.5 m from player', heroDropD <= 1.5, `drop dist=${heroDropD.toFixed(2)}`);

// (b) park dog: wait until idle, then fetch a ball inside its clamp
await tp(91, -333, 1.5708);
await page.waitForFunction(() => { const d = window.__hd.fetchDogs.find(x => x.name === 'dogpark-dog-0'); return d && d.available(); }, { timeout: 12000 }).catch(() => {});
const parkDisp = await driveFetch('dogpark-dog-0', 93, -330);
await page.waitForFunction(() => window.__pl.grab > 0, { timeout: 6000 }).catch(() => {});
await page.waitForFunction(() => window.__pl.grab > 0 && !window.__pl.done, { timeout: 4000 }).catch(() => {});
await shoot('078-pay-park-carry');
await page.waitForFunction(() => window.__pl.done, { timeout: 6000 }).catch(() => {});
const parkR = await readPl();
ok('C(b) park: canReach true inside clamp', parkDisp.canReach === true, JSON.stringify(parkDisp));
ok('C(b) park: grab then done fired', parkR.grab > 0 && !!parkR.done, `grab=${parkR.grab} done=${JSON.stringify(parkR.done)} at=${parkR.at}`);

// (d) trail dog: LUNGE toward a ball 4 m away -> abort within ~3 s
const tPos = await page.evaluate(() => { const d = window.__hd.fetchDogs.find(x => x.name === 'trail-dog-0'); const o = {}; d.pos(o); return o; });
await tp(tPos.x - 4.2, tPos.z, 1.5708);                   // stand just west of the dog, look east at it
await sleep(400);
const tPos2 = await page.evaluate(() => { const d = window.__hd.fetchDogs.find(x => x.name === 'trail-dog-0'); const o = {}; d.pos(o); return o; });
const trailDisp = await driveFetch('trail-dog-0', tPos2.x + 4, tPos2.z);
await sleep(1000);                                        // mid-strain (offset peaks 0.6..1.8 s)
await shoot('078-pay-trail-lunge');
let abortedAt = -1;
for (let i = 0; i < 25; i++) { const pl = await readPl(); if (pl.abort > 0) { abortedAt = i; break; } await sleep(120); }
const trailR = await readPl();
ok('C(d) trail: canReach true for 4 m ball', trailDisp.canReach === true, JSON.stringify(trailDisp));
ok('C(d) trail: abort fired within ~3 s (never grabs)', trailR.abort > 0 && trailR.grab === 0 && trailR.done === null,
  `abort=${trailR.abort} grab=${trailR.grab} at ~${((abortedAt + 1) * 0.12 + 1.4).toFixed(1)}s`);

// trail walkers still patrol: the dog world pos moves over ~1.5 s (regression)
await sleep(1200);                                        // let the lunge offset fully decay
const wA = await page.evaluate(() => { const d = window.__hd.fetchDogs.find(x => x.name === 'trail-dog-0'); const o = {}; d.pos(o); return o; });
await shoot('078-pay-trail-walk');
await sleep(1600);
const wB = await page.evaluate(() => { const d = window.__hd.fetchDogs.find(x => x.name === 'trail-dog-0'); const o = {}; d.pos(o); return o; });
ok('D trail walkers keep patrolling', Math.hypot(wA.x - wB.x, wA.z - wB.z) > 0.3, `moved ${Math.hypot(wA.x - wB.x, wA.z - wB.z).toFixed(2)} m`);

// =====================================================================
// D. REGRESSION — ordinary beach-ball fetch minigame still works
// =====================================================================
await nav(104, -336, 'yaw=-1.5708');                     // at the beach ball (DOG_PROPS.ball), face west into the cove
const fetch0 = await page.evaluate(() => (window.__hd.econ.save().counters || {}).fetches || 0);
let fetch1 = fetch0;
for (let a = 0; a < 3; a++) {                             // trigger play-fetch, throw low so it lands on reachable sand
  await page.keyboard.down('e'); await sleep(300); await page.keyboard.up('e');
  for (let i = 0; i < 45; i++) {                          // wait up to ~9 s for the round trip + snapshot
    await sleep(200);
    fetch1 = await page.evaluate(() => (window.__hd.econ.save().counters || {}).fetches || 0);
    if (fetch1 > fetch0) break;
  }
  if (fetch1 > fetch0) break;
}
ok('D regression: beach-ball fetch incremented state.fetches', fetch1 > fetch0, `fetches ${fetch0} -> ${fetch1}`);

// =====================================================================
console.log('\n--- console errors / pageerrors ---');
console.log(errors.length ? errors.join('\n') : '(none)');
const fails = results.filter(r => !r.pass).length + (errors.length ? 1 : 0);
console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL PROBE CHECKS PASSED') + (errors.length ? ' (+console errors)' : ''));
await browser.close();
vite.kill();
process.exit(fails ? 1 : 0);
