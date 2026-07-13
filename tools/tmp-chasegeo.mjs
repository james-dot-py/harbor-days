// tmp-chasegeo.mjs — numeric truth for the wb-chase geometry (064 debug)
import * as B from '../src/data/wrigley-bowl.js';
const at = (r, th) => [B.HP_B[0] + Math.sin(th) * r, B.HP_B[1] + Math.cos(th) * r];
const post = (() => { const th = B.BACK_B + 0.3; return at(B.rWallB(th) - 1.3, th); })();
const s0 = at(28, B.AXIS_B + 0.1), s1 = at(31, B.AXIS_B - 0.15), s2 = at(26, B.AXIS_B + 0.35);
const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]).toFixed(1);
console.log('HP', B.HP_B.map(v => v.toFixed(1)), 'AXIS', B.AXIS_B.toFixed(2), 'BACK', B.BACK_B.toFixed(2));
console.log('POST', post.map(v => v.toFixed(1)), 'rWall(BK+0.3)', B.rWallB(B.BACK_B + 0.3).toFixed(1));
console.log('s0', s0.map(v => v.toFixed(1)), 'd(post,s0)', d(post, s0));
console.log('s1', s1.map(v => v.toFixed(1)), 'd(post,s1)', d(post, s1));
console.log('s2', s2.map(v => v.toFixed(1)), 'd(post,s2)', d(post, s2));
console.log('kindAt s0', B.kindAtB(...s0), '| s1', B.kindAtB(...s1), '| s2', B.kindAtB(...s2));
