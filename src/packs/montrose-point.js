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

// task 081 hook: favors-montrose.js reuses the gap-1 birder as "Lois" (so she
// can .say() her errand lines). Filled below where the birders are built.
// Additive only — this pack's behaviour is unchanged.
export const birderHooks = {};

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
    contains: (x, z) => x >= 186 && x <= 244 && z >= -926 && z <= -860,
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
  // Re-aim the watchers at the new PERCH ZONES (task 084 — the birds now live in
  // the hedge/trees 10-18 m off, not the 2 m gap). AIMS overrides the CH gap aim
  // per birder; the two SCOPE birders KEEP their CH aim because the tripod tube
  // is a structure yawed toward b.aim (turning the body off it would detach the
  // hand from the scope): birder[1]'s scope stays trained N through gap-1 (a
  // ground bird sits ~13 m up that ray), birder[3]'s stays SE over the open lake
  // (honest lake-watching). The free-posed watchers (birder[0], the binocs
  // birder[2]) swing to a distant perch cluster and gaze UP toward it.
  const AIMS = [
    [195.6, -890.3],       // birder0 -> the west-hedge warbler thicket (WSW along the wall)
    M.birders[1].aim,      // birder1 -> KEEP (scope trained N through gap-1)
    [236, -890],           // birder2 -> the east tree canopy (elevated, ENE)
    M.birders[3].aim,      // birder3 -> KEEP (SE over the open lake)
  ];
  const AIMUP = [0.16, 0, 0.28, 0];   // head/binoc up-tilt (rad): sell the upward gaze at the crest/canopy
  const birders = [];   // { npc, scope, binocs, bn, up } — posed every frame below
  M.birders.forEach((b, i) => {
    const aim = AIMS[i];
    const ry = Math.atan2(aim[0] - b.x, aim[1] - b.z);   // face the (re-aimed) target
    const npc = makeNPC({ x: b.x, z: b.z, ry, palette: PAL[i], name: 'birder', lines: LINES[i] });
    if (i === 0) birderHooks.lois = npc;   // task 081: the gap-1 birder is "Lois" for favors-montrose
    let bn = null;
    if (b.binocs) { bn = makeBinocs(); bn.position.set(0, 2.18, 0.44); npc.group.add(bn); }   // face height (see note)
    birders.push({ npc, scope: !!b.scope, binocs: !!b.binocs, bn, up: AIMUP[i] });
  });

  // ---- (c) THE HEDGE FLOCK — nine chibi migrants at a RESPECTFUL DISTANCE ----
  // Task 084 "BACK THE BIRDS OFF": every home perch, alternate and flight
  // endpoint clears a 9 m bubble around EVERY birder (M.birders) — the old
  // scope-tube Warbler is gone. The flock is BIASED INTO THE HEDGE THICKETS:
  // five perch on the hedge mass at its WEST end (x ~194-197, y ~1.7-2.6 on/in
  // the wall) — the stretch farthest from the two gaps, and the ONLY hedge run
  // that clears 9 m from all four birders (they line the gaps at x 206-238), so
  // the migrant wave reads as "alive over THERE in the bush". A couple perch in
  // the meadow tree canopies (y ~3.9), a sparrow works the prairie ~13 m N of
  // gap-1 (right up birder[1]'s scope ray), and the Cardinal greets from the
  // gateway beam TOP (above the letter band — task-071 law; ~17 m from the
  // nearest birder, legal + charming). A perch y is the BODY CENTER: surface +
  // ~0.37 (size-1 chibi) so feet touch.
  const FLOCK = [
    // -- gateway greeter: ON TOP of the beam (top ~2.7), above the SANCTUARY letters --
    { name: 'Cardinal',               home: [191, 3.05, -880.2],
      alts: [[191, 3.05, -883.6], [191, 1.5, -876.0]] },             // south end (still on top) + a north flank rail-post top
    // -- WEST-END HEDGE THICKET (away from the gaps; the migrant wave) --
    { name: 'Warbler',                home: [194.6, 1.75, -890.0],
      alts: [[195.1, 2.15, -890.25], [194.5, 1.65, -889.85]] },
    { name: 'Rose-breasted Grosbeak', home: [195.3, 2.45, -890.35],
      alts: [[195.9, 2.5, -890.0], [194.7, 2.0, -890.5]] },
    { name: 'Baltimore Oriole',       home: [196.0, 2.55, -889.7],
      alts: [[196.5, 2.4, -890.2], [195.4, 2.55, -889.6]] },
    { name: 'Indigo Bunting',         home: [196.7, 1.9, -890.55],
      alts: [[196.2, 2.2, -890.7], [194.8, 1.85, -890.1]] },
    { name: 'Goldfinch',              home: [194.9, 2.2, -890.7],
      alts: [[195.6, 2.35, -890.45], [194.4, 2.05, -889.9]] },
    // -- MEADOW TREE CANOPIES --
    { name: 'Scarlet Tanager',        home: [210.0, 4.0, -908.0],     // tree cluster @ (210,-908)
      alts: [[210.7, 3.8, -908.6], [209.3, 4.1, -907.4]] },
    { name: 'Goldfinch',              home: [236.0, 3.85, -890.0],    // tree cluster @ (236,-890) — birder[2]'s binocs target
      alts: [[236.5, 3.7, -889.5], [235.4, 3.95, -890.4]] },
    // -- PRAIRIE GROUND, ~13 m N of gap-1, up birder[1]'s scope ray --
    { name: 'White-throated Sparrow', home: [204.0, 0.32, -903.0],
      alts: [[203.2, 0.32, -902.4], [205.0, 0.34, -903.6]] },
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
      if (p.up) pt.head.rotation.x = -p.up;             // gaze UP toward the distant hedge crest / tree canopy
      if (p.binocs) {                                   // both arms raised to the face
        pt.armL.rotation.x = -2.3 - p.up; pt.armR.rotation.x = -2.3 - p.up;
        pt.armL.rotation.z = 0.15; pt.armR.rotation.z = -0.15;
        if (p.bn) p.bn.rotation.x = -p.up;              // binocular barrels tilt up with the gaze
      } else if (p.scope) {                             // one arm forward/down on the scope
        pt.armR.rotation.x = -0.7; pt.armR.rotation.z = -0.1; pt.armL.rotation.x = -0.2;
      }
    }

    // (c) DISTANCE CULL — the Point sits at NEGATIVE z (~-895), so the distance
    // uses pl.z PLUS 895 (the task-025 cull-sign pitfall killed a whole task once).
    const dx = pl.x - 215, dz = pl.z + 895;
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
