// tmp: build the task-035 contact sheet from an explicit shot list.
import { contactSheet } from './contactsheet.mjs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const d = join(dirname(fileURLToPath(import.meta.url)), 'shots');
const out = await contactSheet({
  shots: [
    { path: join(d, '035-title-desktop.png'), label: 'title 1280 (live world)' },
    { path: join(d, '035-title-phone.png'), label: 'title 390 (live world)' },
    { path: join(d, '035-start-desktop.png'), label: 'desktop start flow' },
    { path: join(d, '035-start-touch.png'), label: 'touch start flow' },
    { path: join(d, '035-baseline-check.png'), label: 'spawn vs baseline 0.104%' },
  ],
  out: join(d, '035-contact-sheet.png'),
  cols: 3,
});
console.log('SHEET ' + out);
