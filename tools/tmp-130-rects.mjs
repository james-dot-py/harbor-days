// tmp (task 130): print CH.allWalkRects() so the ledger can be eyeballed
// against the deckMeshes tag ids. Deleted at close-out.
import * as CH from '../src/data/chicago.js';
const r = CH.allWalkRects();
console.log('count', r.length);
for (const x of r)
  console.log(x.id.padEnd(26), 'x', x.x1.toFixed(2), x.x2.toFixed(2), ' z', x.z1.toFixed(2), x.z2.toFixed(2), ' h', x.h);
