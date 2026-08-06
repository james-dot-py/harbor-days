// tmp-132-table — the whole pairwise picture in one place. Four scripted kite
// flights (two on the PRE-132 code, two on the converted code) give six pairings:
// two SAME-code (the noise floor, one per world) and four CROSS-code. If the
// cross-code deltas sit inside the same-code spread at every phase, the flight is
// the same flight and the transients are frame-timing jitter, not a regression.
//   node tools/tmp-132-table.mjs
import { execFileSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
// three flights per world so the noise floor is a SPREAD, not one sample of a
// max — and so release power (98/100%) is balanced across the two worlds.
const PRE = ['before', 'before2', 'before3'], POST = ['after', 'after2', 'after3'];
const PAIRS = [];
const combos = (L, kind) => { for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) PAIRS.push([L[i], L[j], kind]); };
combos(PRE, 'same (pre-132)');
combos(POST, 'same (132)');
for (const a of PRE) for (const b of POST) PAIRS.push([a, b, 'cross']);
const PH = ['pre-launch', 'ascend', 'aloft', 'reel ', 'release', 'post '];
const rows = [];
for (const [a, b, kind] of PAIRS) {
  let out = '';
  try { out = execFileSync(process.execPath, [join(here, 'tmp-132-cmp.mjs'), a, b], { encoding: 'utf8' }); }
  catch (e) { out = (e.stdout || '') + ''; }          // non-zero exit still prints the sweeps
  const row = { pair: `${a} vs ${b}`, kind, ph: {} };
  for (const line of out.split('\n')) {
    const m = line.match(/^(\S+)\s.*max d-pos ([\d.]+) m\s+max d-aim [\d.]+ deg \(([\d.]+) px/);
    if (m) row.ph[m[1]] = { p: +m[2], a: +m[3] };
  }
  rows.push(row);
}
const keys = Object.keys(rows[0].ph);
console.log('max camera-position delta (m) per phase\n');
console.log('pair'.padEnd(22) + 'kind'.padEnd(16) + keys.map(k => k.padStart(11)).join(''));
for (const r of rows) console.log(r.pair.padEnd(22) + r.kind.padEnd(16) + keys.map(k => (r.ph[k] ? r.ph[k].p.toFixed(4) : '-').padStart(11)).join(''));
console.log('\nmax camera-aim delta (px @fov50) per phase\n');
console.log('pair'.padEnd(22) + 'kind'.padEnd(16) + keys.map(k => k.padStart(11)).join(''));
for (const r of rows) console.log(r.pair.padEnd(22) + r.kind.padEnd(16) + keys.map(k => (r.ph[k] ? r.ph[k].a.toFixed(1) : '-').padStart(11)).join(''));

// ---------------------------- the verdict ----------------------------
// Comparing max(9 cross pairs) against max(6 same pairs) is NOT a test: draw
// more pairs from one distribution and its max wins on sample count alone. And
// the transient deltas here are visibly a property of WHICH RUN is in the pair
// (a frame-hitchy run is far from every other run, same-code or not), not of
// which side of the change it sits on.
// So: a PERMUTATION TEST on the labelling. Split the six runs into two labelled
// groups of three every possible way (C(6,3)/2 = 10 splits, one of which is the
// true before/after split), and for each split compute mean(cross) - mean(same).
// If the TRUE split's separation is unremarkable among the ten, then "which code
// the run was on" carries no more information than an arbitrary relabelling —
// i.e. the conversion did not change the flight.
const ALL = [...PRE, ...POST];
const dOf = {};                                  // dOf[phase]['a|b'] = {p, a}
for (const r of rows) { const [a, b] = r.pair.split(' vs ');
  for (const k of keys) { (dOf[k] = dOf[k] || {})[a + '|' + b] = r.ph[k]; } }
const get = (k, a, b) => dOf[k][a + '|' + b] || dOf[k][b + '|' + a];
const splits = [];                               // every way to halve 6 runs into 3+3
for (let m = 0; m < 64; m++) {
  const g = ALL.filter((_, i) => m & (1 << i));
  if (g.length !== 3 || !g.includes(ALL[0])) continue;   // fix run 0 into group A to kill mirror duplicates
  splits.push([g, ALL.filter(x => !g.includes(x))]);
}
const sep = (k, GA, GB, fld) => {                // mean(cross) - mean(same) for one split
  const pairs = (G) => { const o = []; for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) o.push(get(k, G[i], G[j])); return o; };
  const cross = []; for (const a of GA) for (const b of GB) cross.push(get(k, a, b));
  const same = [...pairs(GA), ...pairs(GB)];
  const mean = L => L.filter(Boolean).reduce((s, v) => s + v[fld], 0) / L.filter(Boolean).length;
  return mean(cross) - mean(same);
};
const TRUE = splits.findIndex(([g]) => g.length === 3 && g.every(x => PRE.includes(x)));
let bad = 0;
console.log('\npermutation test — is the TRUE before/after split special among all 10 relabellings?\n');
console.log('phase'.padEnd(12) + 'metric'.padEnd(8) + 'true split sep'.padStart(16) + 'rank of 10'.padStart(12) + '   verdict');
for (const k of keys) {
  for (const [fld, unit] of [['p', 'm'], ['a', 'px']]) {
    const seps = splits.map((s, i) => ({ i, v: sep(k, s[0], s[1], fld) }));
    if (seps.some(s => !isFinite(s.v))) continue;
    const t = seps[TRUE].v;
    const rank = seps.filter(s => s.v >= t).length;          // 1 = most separated
    const ok = rank > 1;                                     // not the single most-separated labelling
    if (!ok) bad++;
    console.log(`${k.padEnd(12)}${(fld === 'p' ? 'pos' : 'aim').padEnd(8)}${(t.toFixed(fld === 'p' ? 4 : 2) + ' ' + unit).padStart(16)}${String(rank).padStart(12)}   ${ok ? 'indistinguishable from a random relabelling' : 'MOST SEPARATED — investigate'}`);
  }
}
console.log(bad
  ? `\n${bad} PHASE/METRIC(S) rank the true split as the most separated labelling — that is a real difference, not jitter.`
  : '\nTHE CONVERSION IS INVISIBLE TO THE DATA — on every phase and both metrics, splitting the six runs by which CODE they ran is no more separating than an arbitrary relabelling. The flight is the same flight.');
process.exit(bad ? 1 : 0);
