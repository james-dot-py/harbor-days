// 093: standalone geometry sanity for the resized rink + shortened BP chain.
import * as M from '../src/data/millennium.js';
let fails = 0;
const t = (l, v) => { console.log((v ? 'ok  ' : 'FAIL') + ' ' + l); if (!v) fails++; };
// rink
t('ice centre walkable ice', M.walkableM(67.75, 798.75) && M.kindAtM(67.75, 798.75) === 'ice');
t('new NE ice corner (74,776.2) ice', M.kindAtM(74, 776.2) === 'ice');
t('new SE ice (74,820.5) ice (trick spot)', M.kindAtM(74, 820.5) === 'ice');
t('apron N (66,773.5) walk -1.6', M.walkableM(66, 773.5) && M.surfaceYM(66, 773.5) === -1.6);
t('apron E (76,800) walk -1.6', M.walkableM(76, 800) && M.surfaceYM(76, 800) === -1.6);
t('apron S (70,823.5) walk', M.walkableM(70, 823.5));
t('boards gap W (60.6,790) blocked', !M.walkableM(60.6, 790));
t('boards gap E (74.9,800) blocked', !M.walkableM(74.9, 800));
t('boards gap N (66,775.1) blocked', !M.walkableM(66, 775.1));
t('boards gap S (67,822.4) blocked', !M.walkableM(67, 822.4));
t('rim buffer E (77.5,800) blocked', !M.walkableM(77.5, 800));
t('rim buffer N (66,771) blocked', !M.walkableM(66, 771));
t('Washington walk edge (66,769) y0', M.walkableM(66, 769) && M.surfaceYM(66, 769) === 0);
t('Bean plaza x0 78 (78.5,800) y0', M.walkableM(78.5, 800) && M.surfaceYM(78.5, 800) === 0);
t('old plaza strip (77,800) now blocked', !M.walkableM(77, 800));
t('ramp mid (58.5,800) ~-0.8', Math.abs(M.surfaceYM(58.5, 800) + 0.8) < 0.01);
t('landing (60.8,800) -1.6 kind null', M.surfaceYM(60.8, 800) === -1.6 && M.kindAtM(60.8, 800) === null);
// bridge
let len = 0; const P = M.BP_DECK_PTS;
for (let i = 1; i < P.length; i++) len += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
console.log('deck pts len', len.toFixed(1), 'nodes', M.BP_CROSSING_M.nodes.length);
t('crest (202.6,800.5) y~5', M.surfaceYM(202.6, 800.5) > 4.85);
t('over trench (196,801.5) y>3.9', M.surfaceYM(196, 801.5) > 3.9);
t('tail y<=0.45 at x>=243', (() => { for (const p of P) if (p[0] >= 243 && p[0] < 247) { if (M.surfaceYM(p[0], p[1]) > 0.45) return false; } return true; })());
t('lands (247,807.5) y<0.3', M.walkableM(247, 807.5) && M.surfaceYM(247, 807.5) < 0.3);
t('launch (173,834.5) y<0.4', M.walkableM(173, 834.5) && M.surfaceYM(173, 834.5) < 0.4);
let bad = 0;
for (let i = 1; i < P.length; i++) {
  const p = P[i], q = P[i - 1]; let tx = p[0] - q[0], tz = p[1] - q[1];
  const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
  for (const s of [0, 1.9, -1.9]) if (!M.walkableM(p[0] - tz * s, p[1] + tx * s)) bad++;
}
t('band lanes walkable everywhere (bad=' + bad + ')', bad === 0);
t('promenade N (205,750) y0', M.walkableM(205, 750) && M.surfaceYM(205, 750) === 0);
t('promenade N edge (205,795) y0', M.walkableM(205, 795));
console.log('   (205,800) walkable=', M.walkableM(205, 800), 'y=', M.surfaceYM(205, 800).toFixed(2));
t('promenade S (205,810) y0', M.walkableM(205, 810) && M.surfaceYM(205, 810) === 0);
// elevator adjacency scans: walkable neighbours 0.5 apart never differ > 0.8 y
function scan(x0, x1, z0, z1) {
  let v = 0;
  for (let x = x0; x <= x1; x += 0.25) for (let z = z0; z <= z1; z += 0.25) {
    if (!M.walkableM(x, z)) continue; const y = M.surfaceYM(x, z);
    for (const [dx, dz] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]])
      if (M.walkableM(x + dx, z + dz) && Math.abs(M.surfaceYM(x + dx, z + dz) - y) > 0.8) v++;
  }
  return v;
}
const v1 = scan(200, 210, 793, 810); t('no elevator adjacency, promenade overflight (' + v1 + ')', v1 === 0);
const v2 = scan(181, 190, 799, 817); t('no elevator adjacency, west rim (' + v2 + ')', v2 === 0);
const v3 = scan(56, 79, 769, 827); t('no elevator adjacency, whole rink pit (' + v3 + ')', v3 === 0);
t('rimS0 (187,814) y0', M.walkableM(187, 814) && M.surfaceYM(187, 814) === 0);
console.log(fails ? `${fails} FAILURES` : 'ALL GREEN');
process.exit(fails ? 1 : 0);
