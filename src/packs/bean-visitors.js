// =====================================================================
//  PACK: bean-visitors — posing visitors at THE BEAN (task 043).
//  Five NPCs give Cloud Gate its gravity without the full crowd (the
//  CROWD gag itself belongs to 047): a selfie pair on the west face
//  (backs to the shell, phone up), a photographer lining up the whole
//  lozenge from the south-east, and a kid + parent at the north approach
//  staring up at the omphalos. Plus the journal's honest naming — the
//  in-world plate says only THE BEAN (signage stays minimal, like the
//  real thing); the journal owns "Cloud Gate".
//
//  Only-my-file rules: no shared edits beyond one import line in
//  packs/index.js. All setup in onWorldReady. makeNPC for every character
//  (auto bump lines + distance culling + staticLod twins). Positions sit
//  ON the Bean plaza walk quad, OUTSIDE the shell footprint and its two
//  lobe colliders (src/data/millennium.js CLOUD_GATE_M). NO audio.
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, registerUpdate, makeNPC, journalSection } from '../framework.js';
import { toon, bmat } from '../core.js';

function phoneProp() {                                  // wrigley-npcs precedent
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.02), toon(0x14141a));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.16), bmat(0x9fd0ff));
  scr.position.z = 0.012; phone.add(scr);
  return phone;
}
const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
const BEAN = { x: 86.8, z: 797.7 };

onWorldReady(() => {
  const rePose = [];                                    // re-applied each frame AFTER the NPC pass

  // ---- selfie pair, west face (backs to the shell — the bean IS the shot)
  const sel1 = makeNPC({ x: 78.7, z: 796.6, ry: -Math.PI / 2 - 0.15, wander: 0, staticLod: true, name: 'visitor',
    palette: { suit: 0xd83a6a, pants: 0x2a3340, skin: 0xc98a5a, hair: 0x241a12 },
    lines: ['ope — get the whole bean in!', "we're IN it — look, that's us!", "one more, the light's perfect"] });
  { const p = phoneProp(); p.position.set(0.16, 2.02, 0.55); p.rotation.x = -0.35; sel1.group.add(p); }
  sel1.setFace('happy');
  rePose.push(() => { sel1.parts.armR.rotation.x = -2.3; sel1.parts.armR.rotation.z = -0.2; sel1.parts.armL.rotation.x = -0.3; });
  const sel2 = makeNPC({ x: 79.5, z: 798.1, ry: -Math.PI / 2 + 0.12, wander: 0, staticLod: true, name: 'visitor',
    palette: { suit: 0x2f6f8f, pants: 0x394b57, skin: 0xf0c8a0, hair: 0x4a3a24 },
    lines: ['everyone calls it the Bean', "say cheddar!", "my arm's getting tired, ope"] });
  sel2.setFace('happy');
  rePose.push(() => { sel2.parts.armL.rotation.x = -0.5; sel2.parts.armL.rotation.z = 0.45; sel2.parts.armR.rotation.x = -0.9; sel2.parts.armR.rotation.z = -0.3; });

  // ---- photographer, south-east — lining up the whole lozenge
  const photog = makeNPC({ x: 95.6, z: 803.8, ry: faceTo(95.6, 803.8, BEAN.x, BEAN.z), wander: 0, staticLod: true, name: 'photographer',
    palette: { suit: 0x4e4a3c, pants: 0x2a2e36, skin: 0x8a5a3c, hair: 0x1a140e },
    lines: ["the sky's ON it tonight", 'you can fit the whole skyline in there', 'shot of the year, right here'] });
  { const p = phoneProp(); p.position.set(0, 1.78, 0.5); p.rotation.z = Math.PI / 2; p.rotation.x = -0.15; photog.group.add(p); }
  rePose.push(() => { photog.parts.armL.rotation.x = -1.9; photog.parts.armL.rotation.z = 0.14; photog.parts.armR.rotation.x = -1.9; photog.parts.armR.rotation.z = -0.14; });

  // ---- kid + parent, north approach — staring up at the belly button
  const kid = makeNPC({ x: 84.6, z: 787.0, ry: faceTo(84.6, 787.0, BEAN.x, BEAN.z), wander: 0, staticLod: true, name: 'kid', scale: 0.62,
    palette: { suit: 0xf2b23c, pants: 0x3a5a8c, skin: 0xe8b58c, hair: 0x3a2a18 },
    lines: ["it's got a belly button!!", 'I can see a hundred of me!'] });
  kid.setFace('surprised');
  rePose.push(() => { kid.parts.armL.rotation.x = -2.9; kid.parts.armL.rotation.z = 0.25; kid.parts.armR.rotation.x = -2.9; kid.parts.armR.rotation.z = -0.25; });
  const parent = makeNPC({ x: 83.3, z: 785.8, ry: faceTo(83.3, 785.8, BEAN.x, BEAN.z), wander: 0, staticLod: true, name: 'parent',
    palette: { suit: 0x6a4a7c, pants: 0x2a2e36, skin: 0xc98a5a, hair: 0x241a12 },
    lines: ['we drove in from Rockford for this', "ope — don't touch it, bud", 'shiniest thing in the whole city'] });
  rePose.push(() => { parent.parts.armR.rotation.x = -1.15; parent.parts.armR.rotation.z = -0.12; });

  registerUpdate(() => { for (const f of rePose) f(); });

  // the journal owns the honest naming (the plate in the world says only
  // THE BEAN — keep in-world signage minimal, like the real thing)
  journalSection('millennium', 'Millennium Park', () => `
    <p><b>Cloud Gate</b> — everyone calls it the Bean. The shiniest thing
    in the whole city, holding a painted little Chicago on its belly.</p>`);
});
