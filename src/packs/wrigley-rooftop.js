// =====================================================================
//  PACK: wrigley-rooftop — the climbable SHEFFIELD rooftop deck (task 054).
//    The rooftop-club deck the village builds (rooftops.js buildSheffieldExtras,
//    ROOFTOPS_W.sheffield[0]) is now a DESTINATION you sit at:
//     * SIT SPOTS on each of the 4 bleacher rows — settle in at deck height,
//       facing the park (the framework camera drifts across the view).
//     * ROOFTOP FANS x2 up on the deck (y 9.6) with drink-rail lines — the
//       "best seat that's not in the stadium" (owner note 2026-07-11).
//
//  Only-my-file rules: one import line in packs/index.js, ALL setup in
//  onWorldReady, own scratch (no shared edits). Row geometry is READ from
//  ROOFTOPS_W (the shared data) so the seats land ON the planks buildBleachers
//  drew — never a forked copy. NPC groups are makeNPC-owned (framework culls
//  them); the fans ride the deck at y 9.6 like the Waveland rooftop watchers.
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, addSitSpot, makeNPC, toast, state } from '../framework.js';
import { toon } from '../core.js';
import { ROOFTOPS_W } from '../data/wrigleyville.js';

// face target: yaw that turns a figure toward (tx,tz) from (x,z)
const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
const SCOREBOARD = { x: -216, z: -533 };            // data/wrigleyville STADIUM_W.scoreboard

onWorldReady(() => {
  const b = ROOFTOPS_W.sheffield[0];                // the climbable deck (x −178..−164, z −534..−518)
  const roofY = ROOFTOPS_W.roofY;                   // 9.6
  const cz = (b.z0 + b.z1) / 2;                     // −526 — bench centre in z
  // buildBleachers('W'): rows step EAST from the front (x = b.x0), seats rise
  // 0.5 m per row. Mirror that here so a seat lands ON each plank.
  const frontX = b.x0, seat0 = roofY + 0.55;
  const faceParkW = -Math.PI / 2;                   // −x (viewers face the park)

  // --- 4 SITTABLE bleacher rows (spread along z so each is the clear nearest) ---
  let greeted = false;
  state.rooftopSits = state.rooftopSits || 0;
  const rowZ = [cz - 4.2, cz - 1.4, cz + 1.4, cz + 4.2];
  for (let i = 0; i < 4; i++) {
    const rx = frontX + 1.9 + i * 1.25;             // −176.1, −174.85, −173.6, −172.35
    const sy = seat0 + i * 0.5;                     // plank centre height
    const spot = addSitSpot({
      x: rx, z: rowZ[i], ry: faceParkW, y: sy - 0.28,   // deck-height seat: mayor root ≈ plank top
      r: 1.6, label: 'take a seat in the bleachers',
    });
    const sit = spot.onUse;                         // wrap: count the sit + first-time welcome
    spot.onUse = pl => {
      sit(pl);
      state.rooftopSits = (state.rooftopSits || 0) + 1;
      if (!greeted) { greeted = true; toast('rooftop bleachers', 'the best seat that’s not in the stadium'); }
    };
  }

  // --- ROOFTOP FANS x2 — up on the deck, drinks on the rail, watching the game ---
  const cupFor = () => {                            // a beer cup for a fan's hand
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.042, 0.14, 8), toon(0xd9b36a));
    cup.position.set(0, -0.02, 0.06); return cup;
  };
  const f1 = makeNPC({
    x: -175.5, z: cz - 3, ry: faceTo(-175.5, cz - 3, SCOREBOARD.x, SCOREBOARD.z),
    wander: 0, staticLod: true, name: 'rooftop',
    palette: { suit: 0x2f6f8a, pants: 0x2a2e36, skin: 0xe0a878, hair: 0x3a2a1c },
    lines: ["best seat that's not in the stadium, ope", "drink rail's the only rail I need",
      "we can see right over the wall from up here"],
  });
  f1.group.position.y = roofY; if (f1.twin) f1.twin.position.y = roofY;
  f1.parts.handR.add(cupFor());

  const f2 = makeNPC({
    x: -172, z: cz + 2, ry: faceTo(-172, cz + 2, SCOREBOARD.x, SCOREBOARD.z),   // mid-deck — flanks the mayor in the hero framing (echoes the Waveland trio)
    wander: 0, staticLod: true, name: 'rooftop',
    palette: { suit: 0xb5462e, pants: 0x2a3340, skin: 0xc98a5a, hair: 0x241a12 },
    lines: ["cheaper than a bleacher ticket, ope", "you can hear the crack from up here",
      "grill's goin', game's on — that's a Sunday"],
  });
  f2.group.position.y = roofY; if (f2.twin) f2.twin.position.y = roofY;
});
