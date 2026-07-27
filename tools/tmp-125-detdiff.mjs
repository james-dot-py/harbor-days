// tmp-125-detdiff — the MASKED-MINIMAP determinism method (task 112 precedent).
// The raw spawn diff vs baseline.png includes the #mini panel, which legitimately
// redraws whenever map CONTENT grows (121-125 all added Lincoln Park geometry).
// Determinism is about WORLD LAYOUT — so mask the minimap rect (1095-1280 x 0-245)
// and diff only the rendered world. A non-zero result there = moved props = a
// broken rng call order.
import fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const [pa, pb] = process.argv.slice(2);
const a = PNG.sync.read(fs.readFileSync(pa)), b = PNG.sync.read(fs.readFileSync(pb));
if (a.width !== b.width || a.height !== b.height) { console.log('SIZE MISMATCH'); process.exit(1); }
// Mask BOTH DOM overlays, not just the minimap: the block map showed 19.6k of
// the 21.4k diff pixels sitting in the bottom row — the #hint key bar, which the
// committed baseline.png was captured without. That is HUD timing, not layout.
const RECTS = [[1095, 1280, 0, 245],      // the #mini panel (content grows every LP task)
               [0, 1280, 626, 720]];      // the #hint key bar
for (const img of [a, b])
  for (const [x0, x1, y0, y1] of RECTS)
    for (let y = y0; y < y1 && y < img.height; y++)
      for (let x = x0; x < x1 && x < img.width; x++) {
        const i = (img.width * y + x) << 2;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 0; img.data[i + 3] = 255;
      }
const total = a.width * a.height;
const masked = RECTS.reduce((s, [x0, x1, y0, y1]) => s + (x1 - x0) * (y1 - y0), 0);
const n = pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0.1 });
console.log(`WORLD diff (minimap masked): ${n} px of ${total - masked} = ${(100 * n / (total - masked)).toFixed(4)}%`);
// The floor is NOT zero: waves, drifting NPCs, the sailboat and cloud drift all
// move between any two captures. Measure the floor by diffing two runs of the
// SAME build and compare against that, not against 0.
const FLOOR = 1500;   // measured: two identical current-build runs = 1035 px
console.log(n <= FLOOR ? `DETERMINISM CLEAN — world layout identical within the ${FLOOR}px animation floor`
                       : 'INVESTIGATE — props may have moved (rng call order)');
