// tmp (080): compose the task-080 contact sheet from this session's verified
// E2E evidence shots (all Read in the main transcript).
import { contactSheet } from './contactsheet.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const S = join(dirname(fileURLToPath(import.meta.url)), 'shots');
const rows = [
  ['080-slug-window', 'sluggers to-go window'], ['080-slug-shop', 'sluggers card'],
  ['080-slug-eat', 'hot dog: take a bite'], ['080-slug-rail', 'old style at the drink rail'],
  ['080-lolla-tent', 'lolla merch tent'], ['080-lolla-shop', 'lolla card'],
  ['080-lolla-hold', 'boombox-to-go anywhere'], ['080-museum-establishing', 'museum cart by the lions'],
  ['080-museum-shop', 'museum cart card'], ['080-museum-coffee', 'museum coffee pep'],
  ['080-museum-penny-crank', 'the penny machine crank'], ['080-museum-journal', 'pennies journal 4/4'],
  ['080-glass-dogbeach', 'sea glass: dog beach'], ['080-glass-montrose-blue', 'sea glass: rare cobalt'],
  ['080-pouch-hand', 'skip pouch on the jetski'], ['080-kite-teal', 'YOUR kite flies teal'],
  ['hats-bucket-hat', 'bucket hat'], ['hats-cubs-cap', 'ballcap (blue)'],
  ['hats-pom-hat', 'winter pom hat'], ['hats-flower-crown', 'flower crown'],
  ['hats-boonie-hat', 'birder’s boonie'], ['hats-pirate-hat', 'paper pirate hat'],
  ['hats-tote', 'tote: wearing'], ['hats-reload', 'worn hat survives reload'],
  ['080-touch-shop', 'touch: kiosk card'], ['080-touch-wearing', 'touch: equip'],
];
const out = await contactSheet({
  shots: rows.map(([n, label]) => ({ path: join(S, n + '.png'), label })),
  out: join(S, '080-contact-sheet.png'), cols: 4,
});
console.log('sheet: ' + out);
