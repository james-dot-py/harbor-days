// evoc-prep.mjs — copy a walkthrough run's shots to neutral names so the
// evocation-review subagent (AUTOPILOT.md §5.2 item 5) sees NO waypoint ids:
// contact-sheet labels like "wv-caray-statue/f0" leak the answer the review
// exists to test. Copies land in tools/tmp/evoc as shot-NN.png; then build the
// anonymized sheet with `node tools/contactsheet.mjs tools/tmp/evoc` (no
// report.json there, so labels fall back to the neutral basenames), give the
// reviewer ONLY that sheet (phase 1, no refs), and clean up afterwards with
// `node tools/tmp-clean.mjs tools/tmp/evoc/*`.
// Usage: node tools/evoc-prep.mjs <runDir>   e.g. tools/shots/run-mrcsulf4
import { readFileSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url)); // tools
const root = join(here, '..');
const runDir = process.argv[2];
if (!runDir) { console.error('usage: node tools/evoc-prep.mjs <runDir>'); process.exit(1); }

const rep = JSON.parse(readFileSync(join(root, runDir, 'report.json'), 'utf8'));
const out = join(here, 'tmp', 'evoc');
mkdirSync(out, { recursive: true });
rep.shots.forEach((s, i) => {
  const nn = String(i + 1).padStart(2, '0');
  copyFileSync(join(root, s.shot), join(out, 'shot-' + nn + '.png'));
});
console.log('copied ' + rep.shots.length + ' shots -> ' + out);
