// =====================================================================
//  PACK: montrose-point — MONTROSE POINT & THE MAGIC HEDGE (task 071).
//  The most famous migrant trap in the Midwest, rendered Animal-Crossing
//  cozy. This pack owns the sanctuary LIFE (the geometry — gateway, hedge,
//  panel, scopes, ropes, prairie — is world structure built by paths.js /
//  props.js / structures.js from MONTROSE_POINT). What lives here:
//    * definePlace: the Point grades AMBIENCE ONLY — the open-sky register
//      (ext ducks, birdsong swells) deliberately NOT the enclosed green-room
//      grade Jarvis uses; the framework lerps the grade out over fadeS on exit.
//    * BIRDERS: a makeNPC per MONTROSE_POINT.birders entry, facing its aim,
//      outdoorsy palettes, birder-register bump lines. One raises binoculars
//      (a solid-color prop riding the GROUP at face height — task-047 law:
//      fixed-pose props ride the group, never the swinging hand), two lean on
//      spotting scopes (the scope tripods themselves are structures.js's job).
//    * THE HEDGE FLOCK: nine chibi-chunky migrants (the nature.js bird
//      machinery, reused — SPECIES palettes + makeBird geometry + synthesized
//      birdCall voices, no parallel bird system) CLUSTERED at the focal points
//      the mt-hedge waypoints frame; they perch-bob and dart short sine arcs
//      between hand-authored perches, distance-culled to zero draws away.
//
//  Only-my-file rules honoured: this module + one import line in index.js +
//  one export line added to nature.js. No shared source is edited. All setup
//  inside onWorldReady; session-only state; NO localStorage. All gameplay
//  jitter uses Math.random so the world seed is NEVER perturbed. All audio is
//  synthesized and actx-guarded (birdCall guards getAudioCtx().actx internally).
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, registerUpdate, definePlace, makeNPC, toast } from '../framework.js';
import { scene, toon } from '../core.js';
import * as CH from '../data/chicago.js';
import { SPECIES, makeBird, birdCall } from './nature.js';   // reuse the roster + chibi geometry + voices

// a small binocular prop: two short barrels + a bridge box, toon dark. Rides
// the birder's GROUP at face height (never the hand — task-047). r/length are
// group-local; the 0.74 CITIZEN group scale shrinks them to real-binoc size.
function makeBinocs() {
  const g = new THREE.Group(), m = toon(0x22262a);
  for (const dx of [-0.05, 0.05]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 8), m);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(dx, 0, 0.02); g.add(barrel);
  }
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.045, 0.05), m));   // bridge
  return g;
}

onWorldReady(() => {
  const M = CH.MONTROSE_POINT;
  let visited = false;

  // ---- (a) definePlace: AMBIENCE ONLY (open-sky register, no green-room grade)
  definePlace({
    name: 'Montrose Point Bird Sanctuary',
    contains: (x, z) => x >= 186 && x <= 244 && z >= -1362 && z <= -1296,
    fadeS: 2.2, amb: { ext: 0.72, bird: 2.4 },
    onEnter() { if (!visited) { visited = true; toast('the Magic Hedge', 'they dive in and out — like magic'); } },
  });

  // ---- (b) BIRDERS — one per MONTROSE_POINT.birders, facing its aim ----
  // outdoorsy palettes: khaki/olive vests (suit), a beanie or two (knit-colour
  // hair on the default dome), varied skin/hair. Lines from the birder register.
  const PAL = [
    { suit: 0x5f6b3e, pants: 0x8a7c55, skin: 0xcaa274, hair: 0x4a3826 },                    // olive vest, khaki pants, brown hair
    { suit: 0x9a8b5c, pants: 0x4a5238, skin: 0x8a5a3c, hair: 0x7a3320 },                    // khaki vest, olive pants, rust beanie
    { suit: 0x4f6b4a, pants: 0x51565e, skin: 0xe8c6a0, hair: 0x53606e },                    // forest vest, grey pants, grey beanie
    { suit: 0xa79463, pants: 0x5a4a34, skin: 0xd0a078, hair: 0x241a12, hairStyle: 'bun' },  // tan vest, brown pants, hair bun
  ];
  const LINES = [
    ["it's the warblers — it's always the warblers", "shh — kinglet, second gap", "that's a LIFER"],
    ["ope — scope's free, take a look", "big year — 214 and counting"],
    ["radar was UNREAL last night", "that's a LIFER", "shh — kinglet, second gap"],
    ["the Army left, the honeysuckles stayed", "big year — 214 and counting", "ope — scope's free, take a look"],
  ];
  const birders = [];   // { npc, scope, binocs } — posed every frame below
  M.birders.forEach((b, i) => {
    const ry = Math.atan2(b.aim[0] - b.x, b.aim[1] - b.z);   // face the aim target
    const npc = makeNPC({ x: b.x, z: b.z, ry, palette: PAL[i], name: 'birder', lines: LINES[i] });
    if (b.binocs) { const bn = makeBinocs(); bn.position.set(0, 2.18, 0.44); npc.group.add(bn); }   // face height (see note)
    birders.push({ npc, scope: !!b.scope, binocs: !!b.binocs });
  });

  // ---- (c) THE HEDGE FLOCK — nine chibi migrants at the framed focal points ----
  // Warbler's perch: ON birders[1]'s scope tube — pos + 0.55 * normalize(aim-pos).
  const b1 = M.birders[1];
  const ax = b1.aim[0] - b1.x, az = b1.aim[1] - b1.z, al = Math.hypot(ax, az) || 1;
  const wx = b1.x + 0.55 * ax / al, wz = b1.z + 0.55 * az / al;
  // hand-authored home perches (these compose the mt-hedge shots): gateway beam
  // greeter, panel top, the two gap window clusters (hedge face + ground), scope.
  // The two STRUCTURE birds get PINNED alternates (on the beam top / panel
  // corners / post tops) — random air-jitter around a structure floats the bird
  // in front of it, and at y 2.83 the Cardinal's body sat exactly across the
  // gateway's letter band (walkthrough caught it covering 'SANCTUARY'). A perch
  // y is the BODY CENTER: surface + ~0.37 (size-1 chibi) so feet touch.
  const FLOCK = [
    { name: 'Cardinal',               home: [191, 3.30, -1317.0],     // ON TOP of the gateway beam (top 2.95) — silhouetted greeter, letters clear
      alts: [[191, 3.30, -1318.8], [191, 1.37, -1311.9]] },           // beam's other end + the north flank post top
    { name: 'Goldfinch',              home: [200.42, 1.98, -1320.2],  // interpretive-panel TOP CORNER (title stays legible)
      alts: [[199.58, 1.98, -1320.8], [203, 0.84, -1326.2]] },        // other corner + a rope-line post top
    { name: 'Rose-breasted Grosbeak', home: [205.8, 1.6, -1328.3] },  // gap-1 hedge face (mid)
    { name: 'Baltimore Oriole',       home: [208.3, 2.1, -1328.9] },  // gap-1 hedge face (high)
    { name: 'White-throated Sparrow', home: [206.9, 0.32, -1327.8] }, // gap-1 ground
    { name: 'Indigo Bunting',         home: [221.2, 1.7, -1331.6] },  // gap-2 hedge face (mid)
    { name: 'Scarlet Tanager',        home: [223.0, 2.3, -1332.4] },  // gap-2 hedge face (high)
    { name: 'Goldfinch',              home: [222.1, 0.34, -1330.9] }, // gap-2 ground
    { name: 'Warbler',                home: [wx, 1.42, wz] },         // a bird ON the scope tube
  ];
  const flock = [];   // per-bird behaviour records (no per-frame allocation in the loop)
  for (const f of FLOCK) {
    const spec = SPECIES.find(s => s.name === f.name);
    const g = makeBird(spec); scene.add(g);   // makeBird starts g.visible=false
    const [hx, hy, hz] = f.home;
    g.position.set(hx, hy, hz);
    const spots = [{ x: hx, y: hy, z: hz }];   // home + alternates within the cluster
    if (f.alts) for (const [ax2, ay2, az2] of f.alts) spots.push({ x: ax2, y: ay2, z: az2 });   // structure birds: pinned spots only
    else {
      const nAlt = Math.random() < 0.5 ? 1 : 2;
      for (let k = 0; k < nAlt; k++) spots.push({
        x: hx + (Math.random() * 2 - 1) * 1.2,
        y: Math.max(0.3, hy + (Math.random() * 2 - 1) * 0.4),
        z: hz + (Math.random() * 2 - 1) * 1.2,
      });
    }
    flock.push({
      g, head: g.userData.head, wings: g.userData.wings, spec,
      spots, idx: 0, cx: hx, cy: hy, cz: hz,
      state: 'perch', ph: Math.random() * 6.283, tiltPh: Math.random() * 6.283, flapPh: 0,
      perchT: 6 + Math.random() * 6,
      sx: 0, sy: 0, sz: 0, tx: 0, ty: 0, tz: 0, flyT: 0, flyDur: 1, yaw: 0,
    });
  }
  let shown = false, callT = 4 + Math.random() * 5;

  // ------------------------------- per frame -------------------------------
  registerUpdate((dt, t, pl) => {
    // (b) re-pose birders (registerUpdate runs AFTER updateNPC, so our pose wins)
    for (const p of birders) {
      const pt = p.npc.parts;
      if (p.binocs) {                                   // both arms raised to the face
        pt.armL.rotation.x = -2.3; pt.armR.rotation.x = -2.3;
        pt.armL.rotation.z = 0.15; pt.armR.rotation.z = -0.15;
      } else if (p.scope) {                             // one arm forward/down on the scope
        pt.armR.rotation.x = -0.7; pt.armR.rotation.z = -0.1; pt.armL.rotation.x = -0.2;
      }
    }

    // (c) DISTANCE CULL — the Point sits at NEGATIVE z (~-1331), so the distance
    // uses pl.z PLUS 1331 (the task-025 cull-sign pitfall killed a whole task once).
    const dx = pl.x - 215, dz = pl.z + 1331;
    const d2 = dx * dx + dz * dz;
    if (d2 > 85 * 85) { if (shown) { for (const r of flock) r.g.visible = false; shown = false; } return; }
    if (!shown) { for (const r of flock) r.g.visible = true; shown = true; }

    for (const r of flock) {
      if (r.state === 'perch') {
        r.g.position.set(r.cx, r.cy + Math.abs(Math.sin(t * 2.2 + r.ph)) * 0.04, r.cz);   // perch bob
        r.head.rotation.z = Math.sin(t * 1.6 + r.tiltPh) * 0.35;                            // head tilt
        r.head.rotation.x = Math.sin(t * 3.1 + r.tiltPh) * 0.12;
        r.perchT -= dt;
        if (r.perchT <= 0) {                            // launch a short sine-arc flight
          let ni = r.idx;
          if (r.spots.length > 1) do { ni = (Math.random() * r.spots.length) | 0; } while (ni === r.idx);
          const sp = r.spots[ni];
          r.sx = r.cx; r.sy = r.cy; r.sz = r.cz; r.tx = sp.x; r.ty = sp.y; r.tz = sp.z; r.idx = ni;
          r.flyT = 0; r.flyDur = 0.9 + Math.random() * 0.4; r.flapPh = 0;
          r.yaw = Math.atan2(r.tx - r.sx, r.tz - r.sz);
          r.state = 'fly';
        }
      } else {                                          // in flight: lerp + arc + flap
        r.flyT += dt; let u = r.flyT / r.flyDur; if (u > 1) u = 1;
        r.g.position.set(
          r.sx + (r.tx - r.sx) * u,
          r.sy + (r.ty - r.sy) * u + Math.sin(u * Math.PI) * 0.5,
          r.sz + (r.tz - r.sz) * u);
        r.g.rotation.y = r.yaw;
        r.flapPh += dt * 22; const flap = Math.sin(r.flapPh) * 0.7;
        r.wings[0].rotation.x = -1.3 + flap; r.wings[1].rotation.x = -1.3 + flap;
        if (u >= 1) {                                   // land: restore wings, perch
          r.cx = r.tx; r.cy = r.ty; r.cz = r.tz;
          r.wings[0].rotation.x = r.wings[1].rotation.x = -1.3;
          r.state = 'perch'; r.perchT = 6 + Math.random() * 6;
        }
      }
    }

    // CALLS — within 60 m, one random visible bird sings every 4-9 s (birdCall
    // guards the null audio ctx until the user clicks start).
    if (d2 < 60 * 60) {
      callT -= dt;
      if (callT <= 0) {
        const r = flock[(Math.random() * flock.length) | 0];
        if (r.g.visible) birdCall(r.spec.call[0], r.spec.call[1]);
        callT = 4 + Math.random() * 5;
      }
    }
  });
});
