// =====================================================================
//  SANCTUARY (the room) — gameplay layer of the Bill Jarvis hero rework.
//  The GEOMETRY (organic fence, interior loop path, planting, the elevated
//  deck) is world structure in structures.js buildSanctuary; THIS pack owns
//  the room FEEL + interactions:
//    * definePlace: inside the fence the world grades greener/denser (fog +
//      hemisphere light), exterior ambience ducks, birdsong doubles — the
//      framework CELL pattern (Wrigleyville adopts the same machinery).
//    * deck sit spots ("sit — watch for birds") via addSitSpot at deck height.
//  Data: SANCTUARY in data/chicago.js (place grade, deck.sits, outline).
//  No shared rng. No per-frame allocation (contains() reuses the poly).
// =====================================================================
import { onWorldReady, definePlace, addSitSpot, toast } from '../framework.js';
import { pip } from '../core.js';
import * as CH from '../data/chicago.js';

onWorldReady(() => {
  const S = CH.SANCTUARY, P = S.place;
  const poly = CH.sanctuaryOutline();          // one shared densified outline
  let visited = false;
  definePlace({
    name: 'Bill Jarvis Sanctuary',
    contains: (x, z) => pip(x, z, poly),
    fadeS: P.fadeS, grade: P.grade, amb: P.amb,
    onEnter() {
      if (!visited) { visited = true; toast('shhh — sanctuary', 'the city hushes behind you'); }
    },
  });
  for (const s of S.deck.sits)
    addSitSpot({ x: s.x, z: s.z, ry: s.ry, y: S.deck.h, r: 1.8, label: 'sit — watch for birds' });
});
