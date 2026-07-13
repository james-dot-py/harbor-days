// =====================================================================
//  MONTROSE BEACH — beach life. The sand at the north end is never empty:
//  beachgoers wandering The Dock and the open sand, trading "ope" bump
//  lines, plus a quiet piping-plover info sign at the dune's edge.
//
//    * 5 BEACHGOERS — makeNPC chibis in summery kit, each wandering a
//      tight radius on the DRY, walkable sand (never the roped dune, the
//      beach house, or the lake). Beach-flavored bump lines fire when the
//      player wanders close (the framework's built-in bump/wander/cull).
//    * PLOVER SIGN  — an E / hand interaction just north of the dune sign
//      that toasts an honest Great Lakes piping-plover fact.
//
//  Only-my-file rules: one import line in packs/index.js, no shared edits.
//  All setup in onWorldReady. Spawns are FAR NORTH (z≈-1450, ~1.4 km from
//  the Belmont spawn plaza — culled at spawn) so baseline scenes are
//  untouched; every spot is validated against CH.montroseBeachH /
//  CH.beachCarved before it spawns. makeNPC consumes no shared rng (all
//  jitter is Math.random), so world determinism is safe.
// =====================================================================
import { onWorldReady, makeNPC, addInteraction, toast } from '../framework.js';
import * as CH from '../data/chicago.js';

// beach-flavored "ope"/bump lines (shared pool; a random line pops on bump)
const BEACH_LINES = [
  'ope — mind the sandcastle!',
  'lovely day for the lake, eh?',
  'watch the plovers over there!',
  'grab a drink at The Dock?',
  "water's cold but worth it",
  "ope — didn't see ya!",
];

// summery palettes (suit = top, pants = trunks/suit bottom)
const BEACH_PAL = [
  { suit:0x4fc3ff, pants:0xffd23f, skin:0xe8b088, hair:0x2b2b2b },
  { suit:0xff6b6b, pants:0x1f6f6f, skin:0x8d5a3b, hair:0x1a1a1a, hairStyle:'bun' },
  { suit:0xffd93d, pants:0x2fb6a8, skin:0xf1c9a5, hair:0x5a3a1a },
  { suit:0x2fb6a8, pants:0xff7f50, skin:0x6e4632, hair:0x111111, hairStyle:'afro' },
  { suit:0xff8fbf, pants:0x27313d, skin:0xc98a5e, hair:0x3a2a1a, hairStyle:'tall' },
];

// dry, walkable sand spots — around The Dock + the open sand, all h≈0 and
// well NORTH of the roped dune (z≤-1444, dune interior starts at z=-1414).
// Validated at spawn: montroseBeachH!==null, !beachCarved, dryish (h>-0.5),
// so the y=0 rig sits flat on the sand.
const SPOTS = [
  { x:214, z:-1476 },   // just south of The Dock deck
  { x:221, z:-1479 },   // east side of The Dock
  { x:224, z:-1452 },   // open sand
  { x:218, z:-1458 },   // open sand
  { x:226, z:-1444 },   // open sand, toward the dune's north edge
];

onWorldReady((player) => {
  // ---- beachgoers wandering the walkable sand ----
  let pi = 0;
  for (const s of SPOTS){
    const h = CH.montroseBeachH(s.x, s.z);
    if (h === null || CH.beachCarved(s.x, s.z) || h <= -0.5) continue;   // skip anything off the dry, open sand
    makeNPC({ x:s.x, z:s.z, ry:Math.random() * Math.PI * 2,
      palette:BEACH_PAL[pi % BEACH_PAL.length],
      name:'', lines:BEACH_LINES, wander:2.5 });   // tight radius keeps them clear of the dune + lake
    pi++;
  }

  // ---- piping-plover info sign (E / hand) on the beach just north of the
  //      dune sign — an honest, endearing fact, not a zoo placard ----
  const sg = CH.MONTROSE_DUNE.sign;
  addInteraction({ x:sg.x + 2, z:sg.z - 2, r:2.5, label:'about the plovers',
    onUse:() => toast('PIPING PLOVER',
      "Fewer than ~80 Great Lakes pairs remain. Montrose's chicks fledge here every summer — give 'em room. 🐦") });
});
