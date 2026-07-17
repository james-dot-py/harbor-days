// =====================================================================
//  MONTROSE BEACH — beach life + the plovers. The sand at the north end is
//  never empty: beachgoers wandering The Dock and the open sand, trading
//  "ope" bump lines, plus the piping-plover nest at the dune's edge — two
//  static adults (built in props.js) and ONE animated chick that peeks out
//  from behind the little nest mound. The sign tells Chicago's real Monty &
//  Rose / Imani story.
//
//    * 5 BEACHGOERS  — makeNPC chibis in summery kit, each wandering a tight
//      radius on the DRY, walkable sand (never the roped dune, the beach
//      house, or the lake). Beach-flavored bump lines fire on approach.
//    * PLOVER CHICK  — a small, fluffy, pale toon chick at the nest spot,
//      gently bobbing/peeking on a CONTINUOUS loop (always partly visible),
//      so the trio reads as "a family with a chick." A few individual
//      frustum-culled meshes (+0 InstancedMesh buckets).
//    * MEET THE PLOVERS — an E / hand interaction at the dune sign telling
//      the Monty & Rose / Imani story warmly + honestly, plus a journal note.
//
//  Only-my-file rules: one import line in packs/index.js, no shared edits.
//  All setup in onWorldReady. Spawns are FAR NORTH (z≈-1014, ~1.4 km from
//  the Belmont spawn plaza — culled at spawn) so baseline scenes are
//  untouched. NO shared rng (rng/rand) — all jitter is Math.random / fixed
//  data / index-seeded sin phase — so world determinism is safe.
// =====================================================================
import * as THREE from 'three';
import { scene, toon } from '../core.js';
import { onWorldReady, registerUpdate, makeNPC, addInteraction, toast, journalSection } from '../framework.js';
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
// well NORTH of the roped dune (z≤-1008, dune interior starts at z=-978).
// Validated at spawn: montroseBeachH!==null, !beachCarved, dryish (h>-0.5),
// so the y=0 rig sits flat on the sand.
const SPOTS = [
  { x:214, z:-1040 },   // just south of The Dock deck
  { x:221, z:-1043 },   // east side of The Dock
  { x:224, z:-1016 },   // open sand
  { x:218, z:-1022 },   // open sand
  { x:226, z:-1008 },   // open sand, toward the dune's north edge
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

  // ---- the piping-plover CHICK at the nest ----------------------------------
  // Chibi-chunky + pale so it reads from the mt-dunes waypoint ~13 m south
  // (realistic tiny birds vanish at this scale). Body + head only, no neckband;
  // a tiny beak + eyes give it a bird read, a stub leg pair grounds it. A few
  // individual frustum-culled meshes → +0 InstancedMesh buckets. It sits at the
  // nest spot right by the small dune mound (220,-971) so the family reads.
  const chick = new THREE.Group();
  {
    const bodyC = 0xf2e8d2, headC = 0xf7efdc;   // pale sand; head a touch paler
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), toon(bodyC));
    body.scale.set(1, 0.92, 1.28); body.position.y = 0.16; chick.add(body);
    // head lives on a small pivot so it can nod/look without moving the body
    const head = new THREE.Group(); head.position.set(0, 0.27, 0.10); chick.add(head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), toon(headC));
    head.add(skull);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 6), toon(0x2a2620));
    beak.rotation.x = Math.PI / 2; beak.position.set(0, -0.01, 0.11); head.add(beak);   // points +z (forward)
    for (const sx of [-0.045, 0.045]){
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), toon(0x1a1712));
      eye.position.set(sx, 0.03, 0.085); head.add(eye);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.09, 5), toon(0xe8b56a));
      leg.position.set(sx * 0.7, 0.045, 0); chick.add(leg);   // tiny stub legs
    }
    chick.scale.setScalar(1.15);   // a touch bigger than the old static scale-1.0 chick, so it reads

    const c = CH.MONTROSE_DUNE.chick;
    const bh = CH.montroseBeachH(c.x, c.z);
    chick.position.set(c.x, (bh == null ? 0 : bh) + 0.02, c.z);
    scene.add(chick);

    // ---- peek-out loop: hoisted scratch (no per-frame allocation) ----
    const bx = chick.position.x, by = chick.position.y, bz = chick.position.z;
    registerUpdate((dt, t) => {
      // vertical: a gentle continuous bob + a slow periodic "peek" that rises
      // higher, but the max(0,…) floor means it never sinks below the nest —
      // the chick is ALWAYS at least partly visible (shot-safe, no terminal
      // state). Minimum y ≈ base − 0.02 (still on the sand), peak ≈ base +0.20.
      chick.position.y = by + 0.04 + 0.06 * Math.sin(t * 1.6)
                              + 0.10 * Math.max(0, Math.sin(t * 0.42));
      // look-around: the whole chick turns slowly toward + away from the beach
      // (base π so the beak/eyes face NORTH, toward the mt-dunes viewpoint).
      chick.rotation.y = Math.PI + 0.55 * Math.sin(t * 0.33) + 0.22 * Math.sin(t * 0.81 + 1.0);
      head.rotation.x = 0.14 * Math.sin(t * 1.1);       // little curious head nod/peck
      // a few cm of scuttle so it reads alive
      chick.position.x = bx + 0.05 * Math.sin(t * 0.6);
      chick.position.z = bz + 0.04 * Math.sin(t * 0.47 + 2.0);
    });
  }

  // ---- meet the plovers (E / hand) at the dune sign — Chicago's real Monty &
  //      Rose / Imani story, warm + honest, not a zoo placard ----
  const sg = CH.MONTROSE_DUNE.sign;
  addInteraction({ x:sg.x + 2, z:sg.z - 2, r:2.5, label:'meet the plovers',
    onUse:() => toast('MONTY & ROSE',
      "In 2019 Monty & Rose nested here — Chicago's first plovers in ~70 years. Their descendant Imani nests on; under ~80 Great Lakes pairs remain. 🐦") });

  // ---- journal note: the Monty / Rose / Imani story in the cozy card style ----
  journalSection('montrose-plovers', 'The Plovers', () => `
    <div class="jrow"><span>2019 pair</span><b>Monty &amp; Rose</b></div>
    <div class="jrow"><span>First to nest in</span><b>~70 years</b></div>
    <div class="jrow"><span>Nesting now</span><b>Imani</b></div>
    <p>Piping plovers came back to Montrose — the first pair to nest in Chicago
       in about 70 years. Monty &amp; Rose are gone, but their descendant Imani
       still nests here. Fewer than ~80 Great Lakes pairs remain — give the
       chicks room. 🐦</p>`);
});
