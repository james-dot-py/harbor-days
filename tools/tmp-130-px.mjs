// tmp-130-px.mjs — sample a few pixels from the winding A/B pair so the
// "how does the walk surface READ now" note is a number, not an impression.
import fs from 'fs';
import { PNG } from 'pngjs';
const at = (p, x, y) => {
  const png = PNG.sync.read(fs.readFileSync(p)), i = (png.width * y + x) * 4;
  return '#' + [0, 1, 2].map(k => png.data[i + k].toString(16).padStart(2, '0')).join('');
};
const pts = [[500, 620], [430, 690], [700, 200], [640, 55]];
for (const [n, f] of [['FIXED', 'tools/shots/tmp130-down-deck-FIXED.png'], ['PREFIX', 'tools/shots/tmp130-down-deck-PREFIX.png']])
  console.log(n.padEnd(7), pts.map(([x, y]) => `(${x},${y})=${at(f, x, y)}`).join('  '));
