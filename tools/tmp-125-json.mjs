import { readFileSync } from 'fs';
const e = JSON.parse(readFileSync('tools/waypoints.expect.json', 'utf8'));
console.log('expect.json OK —', Object.keys(e).length, 'entries');
for (const id of ['lp-conservatory-doors', 'lp-conservatory-peek', 'lp-zoo-north-gate', 'lp-zoo-north-walk'])
  console.log(' ', id, id in e ? 'present (' + e[id].length + ' chars)' : 'MISSING');
