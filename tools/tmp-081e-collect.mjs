// tmp (081): collect the evidence set into tools/shots/081/ for the contact sheet.
import { mkdirSync, copyFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const shots = join(dirname(fileURLToPath(import.meta.url)), 'shots');
const dst = join(shots, '081');
mkdirSync(dst, { recursive: true });
const KEEP = [
  '081-int-journal-neighbors.png', '081-int-stamp.png', '081-int-m4r.png', '081-int-gull-close.png',
  '081b-touch-lois.png', '081b-page-1.png', '081b-page-2.png', '081b-page-3.png',
  '081b-lois-turnin.png', '081c-page-prop.png', '081d-gus.png',
  '081b-ceremony-burst.png', '081c-ceremony-lateral.png', '081c-ceremony-three4.png',
  '081b-regalia-close.png', '081b-certificate.png', '081b-regalia-reload.png',
];
for (const f of KEEP) copyFileSync(join(shots, f), join(dst, f));
console.log('collected', KEEP.length, 'shots into', dst);
