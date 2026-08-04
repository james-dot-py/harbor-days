// =====================================================================
//  PACK: montrose-reserve — THE RESERVE (task 129, owner issue 041).
//  The inland unit of the Montrose Beach Dunes Natural Area — the dead lawn
//  west of the bike path, now a dune-and-swale restoration (GEOGRAPHY.md
//  §The RESERVE EXPANSION is the law). The GEOMETRY is world structure
//  (props.js / structures.js / paths.js build the rope, pannes, exclosure,
//  signs and the viewing platform from MONTROSE_RESERVE). What lives HERE
//  is the life you come for:
//    * FOUR PLOVERS — chibi-chunky piping plovers (the 072 dune proportions,
//      scale 1.6 so they read) working the two roped nest cells: wander +
//      hop-bob + a head-pivot PECK, never closer than 8 m to a monitor
//      (the 084 perch-exclusion rule, ground-bird edition). Distance-gated
//      at 140 m — nature.js's Jarvis cull does NOT cover this far north.
//    * TWO VOLUNTEER MONITORS — makeNPC wander:0, one leaning on a tripod
//      scope trained on the exclosure, one glassing the swales from the east
//      gate, with honest plover lore on the bump lines.
//    * THE SCOPE LOOK-THROUGH on the platform deck — the 126 camera-OWNERSHIP
//      recipe (lp-heron-scope's structure, verbatim where it matters):
//      takeCamera + setMayorHidden, a round eyepiece vignette, a fixed eye
//      aimed at the wire exclosure, ONE fov writer, and NEVER a second easer
//      after release (issue 039's law).
//    * a PLACARD at the cell-A sign cycling the real Monty & Rose / Imani /
//      Searocket story, a journal page, the reserve's own definePlace
//      ambience register, and a soft "peep-lo" plover whistle on a loose
//      timer while you are inside the rope.
//
//  Only-my-file rules: this module + one import line in packs/index.js. All
//  setup inside onWorldReady; session-only state; every bit of jitter is
//  Math.random (the 109 rule — the world seed is NEVER perturbed); all audio
//  is actx-guarded; no per-frame allocation (every vector/rect is hoisted).
//  DEBUG (tools / E2E): window.__hd.rscope = {active, fov(), looks, ...}.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, registerUpdate, addInteraction, definePlace, makeNPC,
         toast, journalSection, getAudioCtx, wallet, state,
         takeCamera, releaseCamera, setMayorHidden } from '../framework.js';
import { scene, camera, toon, lerp, baseFov } from '../core.js';
import { mayor } from '../character.js';   // READ-ONLY: the probe reports mayor.visible (framework does not re-export it)
import { keys, joy } from '../input.js';
import * as CH from '../data/chicago.js';

const merge = (a) => BufferGeometryUtils.mergeBufferGeometries(a, false);
const MOVE_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
function movingNow() { if (joy.len > 0.2) return true; for (const k of MOVE_KEYS) if (keys.has(k)) return true; return false; }

// vertex-colored merge (the character.js vcGeo/vcMat idiom): stamping a solid
// color attribute lets a whole differently-tinted plover collapse into ONE
// draw call under a single shared white toon material. 4 birds = 8 draws
// (body + head pivot), not 50-odd little meshes.
function vcGeo(geo, hex) {
  geo = geo.toNonIndexed();
  const n = geo.attributes.position.count, arr = new Float32Array(n * 3);
  const c = new THREE.Color(hex);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

onWorldReady(() => {
  const R = CH.MONTROSE_RESERVE;
  const PLAT = R.platform, SCOPE = PLAT.scope, EX = R.exclosure;

  // ---------------------------------------------------------------- (1) --
  // THE PLOVERS. Proportions from the props.js dune statics (072) — chibi-
  // chunky, scale 1.6, because a life-size plover is four pixels at 15 m.
  // Pale sand-grey back, white breast, black collar + brow band, orange bill
  // with a black tip, orange legs; the head rides its OWN pivot Group (the
  // montrose-beach.js chick idiom) so it can peck without moving the body.
  const vcMat = toon(0xffffff, { mat: { vertexColors: true } });   // one shared material for every bird part
  const SAND = 0xcfc9bd, PALE = 0xe4ded1, WHITE = 0xf7f3ea, BLACK = 0x26231e, ORANGE = 0xe8922e;

  function makePlover() {
    const grp = new THREE.Group();
    // --- body (everything that does not pivot) -> one merged mesh ---------
    const bodyG = [];
    { const g = new THREE.SphereGeometry(0.14, 8, 7); g.scale(1, 0.85, 1.4); g.translate(0, 0.16, 0); bodyG.push(vcGeo(g, SAND)); }
    { const g = new THREE.SphereGeometry(0.105, 8, 7); g.scale(1, 0.85, 1.0); g.translate(0, 0.135, 0.10); bodyG.push(vcGeo(g, WHITE)); }   // white breast
    { const g = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 10); g.translate(0, 0.225, 0.03); bodyG.push(vcGeo(g, BLACK)); }                 // black neck collar
    for (const sx of [-0.05, 0.05]) { const g = new THREE.CylinderGeometry(0.012, 0.012, 0.13, 5); g.translate(sx, 0.06, 0); bodyG.push(vcGeo(g, ORANGE)); }
    grp.add(new THREE.Mesh(merge(bodyG), vcMat));
    // --- head on its own pivot -> one merged mesh -------------------------
    const head = new THREE.Group(); head.position.set(0, 0.27, 0.13); grp.add(head);
    const headG = [];
    { const g = new THREE.SphereGeometry(0.09, 8, 7); headG.push(vcGeo(g, PALE)); }
    { const g = new THREE.BoxGeometry(0.15, 0.035, 0.07); g.translate(0, 0.052, 0.042); headG.push(vcGeo(g, BLACK)); }                      // brow band
    for (const sx of [-0.05, 0.05]) { const g = new THREE.SphereGeometry(0.018, 6, 6); g.translate(sx * 0.85, 0.022, 0.072); headG.push(vcGeo(g, BLACK)); }
    { const g = new THREE.ConeGeometry(0.021, 0.075, 6); g.rotateX(Math.PI / 2); g.translate(0, -0.012, 0.11); headG.push(vcGeo(g, ORANGE)); }  // bill, points +z
    { const g = new THREE.ConeGeometry(0.014, 0.03, 6); g.rotateX(Math.PI / 2); g.translate(0, -0.012, 0.155); headG.push(vcGeo(g, BLACK)); }   // black tip
    head.add(new THREE.Mesh(merge(headG), vcMat));
    grp.scale.setScalar(1.6);
    return { grp, head };
  }

  // one parent so the distance gate is a SINGLE .visible toggle
  const birds = new THREE.Group(); birds.visible = false; scene.add(birds);
  const MON = R.monitors;
  const MON_R2 = 8 * 8;                                  // plovers keep >=8 m from every monitor (084)
  function farFromMonitors(x, z) {
    for (let i = 0; i < MON.length; i++) {
      const dx = x - MON[i].x, dz = z - MON[i].z;
      if (dx * dx + dz * dz < MON_R2) return false;
    }
    return true;
  }
  const flock = [];
  for (const p of R.plovers) {
    const { grp, head } = makePlover();
    grp.position.set(p.x, 0.02, p.z); grp.rotation.y = p.ry; birds.add(grp);
    // the bird's own nest cell, SHRUNK 1 m so it never walks the rope line
    let c = null;
    for (const q of R.cells) if (p.x >= q.x0 && p.x <= q.x1 && p.z >= q.z0 && p.z <= q.z1) { c = q; break; }
    const rect = c ? { x0: c.x0 + 1, x1: c.x1 - 1, z0: c.z0 + 1, z1: c.z1 - 1 }
                   : { x0: p.x - 2, x1: p.x + 2, z0: p.z - 2, z1: p.z + 2 };
    // the Cell-A pair are the NEST pair ("beside the exclosure", per the data):
    // they work the scrape's own sand, not the far corner of the cell. Their
    // targets stay inside a 5 m disc on the cage — which is also what puts them
    // in the eyepiece when you look through the platform scope.
    const near = (c === R.cells[0]) ? 5 : 0;
    flock.push({ grp, head, rect, near, hx: p.x, hz: p.z, x: p.x, z: p.z, tx: p.x, tz: p.z,
      moving: false, wait: 0.6 + Math.random() * 2.2, ph: Math.random() * 6.283,
      peckT: 1.2 + Math.random() * 2.6, headX: 0.12 });
  }
  function retarget(u) {                                  // sample inside the cell, clear of both monitors
    for (let i = 0; i < 10; i++) {
      let tx, tz;
      if (u.near) {                                       // nest pair: a point on the scrape's own sand (disc on the cage)
        const a = Math.random() * 6.283, rr = u.near * Math.sqrt(Math.random());
        tx = EX.x + Math.cos(a) * rr; tz = EX.z + Math.sin(a) * rr;
      } else {
        tx = u.rect.x0 + Math.random() * (u.rect.x1 - u.rect.x0);
        tz = u.rect.z0 + Math.random() * (u.rect.z1 - u.rect.z0);
      }
      if (tx < u.rect.x0 || tx > u.rect.x1 || tz < u.rect.z0 || tz > u.rect.z1) continue;   // never over the rope
      if (farFromMonitors(tx, tz)) { u.tx = tx; u.tz = tz; u.moving = true; return; }
    }
    u.tx = u.hx; u.tz = u.hz; u.moving = true;             // every sample crowded a monitor — walk home instead
  }

  // ---------------------------------------------------------------- (2) --
  // THE VOLUNTEER MONITORS. wander:0, posed at their data aim; M1 leans on a
  // tripod scope trained on the exclosure, M2 has the binoculars up. Props
  // ride fixed geometry / the NPC GROUP (task-047 law), never a swinging hand.
  const MON_PAL = [
    { suit: 0x4f6b4a, pants: 0x8a7c55, skin: 0xc98a5e, hair: 0x2f2318, hairStyle: 'bun' },   // forest vest, khaki pants
    { suit: 0x9a8b5c, pants: 0x51565e, skin: 0xe8c6a0, hair: 0x53606e },                     // sand vest, grey pants
  ];
  const MON_LINES = [
    ['ope — Imani came back again this year', 'eyes on the exclosure, friend', 'third generation on this beach, believe it'],
    ['Searocket raised four last summer', 'Monty and Rose started all this in 2019', 'eyes on the exclosure, friend'],
  ];
  function makeTripod(x, z, bearing) {                     // merged dark + one glass disc (+2 draws)
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = bearing;
    const parts = [];
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3;
      const leg = new THREE.CylinderGeometry(0.02, 0.03, 1.2, 5);
      leg.translate(0, -0.6, 0); leg.rotateX(0.28); leg.rotateY(a); leg.translate(Math.cos(a) * 0.02, 1.15, Math.sin(a) * 0.02);
      parts.push(leg);
    }
    const headBlk = new THREE.BoxGeometry(0.12, 0.10, 0.12); headBlk.translate(0, 1.15, 0); parts.push(headBlk);
    const tube = new THREE.CylinderGeometry(0.055, 0.07, 0.62, 8);
    tube.rotateX(Math.PI / 2); tube.rotateX(0.12); tube.translate(0, 1.28, 0.14); parts.push(tube);
    const eyep = new THREE.CylinderGeometry(0.045, 0.045, 0.10, 7);
    eyep.rotateX(Math.PI / 2); eyep.rotateX(0.12); eyep.translate(0, 1.30, -0.16); parts.push(eyep);
    g.add(new THREE.Mesh(merge(parts), toon(0x2f3430)));
    const obj = new THREE.CircleGeometry(0.05, 10); obj.rotateX(Math.PI / 2); obj.rotateX(0.12 + Math.PI / 2); obj.translate(0, 1.265, 0.45);
    g.add(new THREE.Mesh(obj, toon(0x1c2a33)));
    return g;
  }
  function makeBinocs() {                                  // one merged dark prop (+1 draw), rides the GROUP at face height
    const parts = [];
    for (const dx of [-0.05, 0.05]) {
      const b = new THREE.CylinderGeometry(0.045, 0.045, 0.14, 8);
      b.rotateX(Math.PI / 2); b.translate(dx, 0, 0.02); parts.push(b);
    }
    parts.push(new THREE.BoxGeometry(0.07, 0.045, 0.05));
    return new THREE.Mesh(merge(parts), toon(0x22262a));
  }
  const monitors = [];
  MON.forEach((m, i) => {
    const bearing = Math.atan2(m.aim[0] - m.x, m.aim[1] - m.z);
    const npc = makeNPC({ x: m.x, z: m.z, ry: bearing, palette: MON_PAL[i % MON_PAL.length],
      name: 'volunteer monitor', lines: MON_LINES[i % MON_LINES.length], wander: 0 });
    let bn = null;
    if (m.binocs) { bn = makeBinocs(); bn.position.set(0, 2.18, 0.44); npc.group.add(bn); }
    if (m.scope) {                                         // the tripod stands just off the monitor's shoulder, on the same bearing
      scene.add(makeTripod(m.x + Math.cos(bearing) * 0.55, m.z - Math.sin(bearing) * 0.55, bearing));
    }
    monitors.push({ npc, scope: !!m.scope, binocs: !!m.binocs, bn });
  });

  // ---------------------------------------------------------------- (6) --
  // the plover whistle: a soft two-note "peep-lo". Quiet, actx-guarded,
  // routed through sfxBus like every other synthesized voice.
  function peepLo(vol) {
    const { actx, sfxBus } = getAudioCtx(); if (!actx) return;
    const t0 = actx.currentTime;
    note(actx, sfxBus, 1850, t0, 0.12, vol);
    note(actx, sfxBus, 1400, t0 + 0.13, 0.16, vol * 0.8);
  }
  function note(actx, dest, f, t0, dur, vol) {
    const o = actx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f, t0); o.frequency.linearRampToValueAtTime(f * 0.97, t0 + dur);
    const g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + 0.02);
  }

  // ---------------------------------------------------------------- (3) --
  // THE SCOPE LOOK-THROUGH (lp-heron-scope's structure; 126 ownership law).
  // The deck's scope PROP belongs to the world builders — we never touch a
  // mesh we did not make. Instead the eye sits just above the mounted tube
  // (deckY + 1.25), so you are looking THROUGH it, not at it.
  const EYE = new THREE.Vector3(SCOPE.x, PLAT.deckY + 1.25, SCOPE.z);
  const AIM = new THREE.Vector3(EX.x, 0.35, EX.z);

  const wrap = document.createElement('div'); wrap.id = 'reserveScope';
  Object.assign(wrap.style, { position: 'fixed', inset: '0', zIndex: '21', pointerEvents: 'none', display: 'none' });
  const vig = document.createElement('div');
  Object.assign(vig.style, { position: 'absolute', inset: '0', background: 'rgba(8,12,10,0.94)' });
  // 126: the eyepiece hole is sized off the SHORT side — min() keeps the
  // desktop numbers and stays a CIRCLE on a portrait phone.
  const mask = 'radial-gradient(circle at 50% 50%, transparent 0, transparent min(27vh,34vw), #000 min(41vh,52vw))';
  vig.style.webkitMaskImage = mask; vig.style.maskImage = mask;
  wrap.appendChild(vig);
  const ret = document.createElement('div');
  Object.assign(ret.style, { position: 'absolute', left: '50%', top: '50%', width: '64px', height: '64px', transform: 'translate(-50%,-50%)' });
  ret.innerHTML =
    '<div style="position:absolute;left:50%;top:50%;width:64px;height:1px;background:rgba(255,255,255,.35);transform:translate(-50%,-50%)"></div>' +
    '<div style="position:absolute;left:50%;top:50%;width:1px;height:64px;background:rgba(255,255,255,.35);transform:translate(-50%,-50%)"></div>' +
    '<div style="position:absolute;left:50%;top:50%;width:20px;height:20px;border:1.5px solid rgba(255,255,255,.6);border-radius:50%;transform:translate(-50%,-50%)"></div>';
  wrap.appendChild(ret);
  document.body.appendChild(wrap);

  state.reserveScoped = state.reserveScoped || 0;
  state.reserveFacts = state.reserveFacts || 0;
  const CAM_ID = 'reserve-scope';
  const sess = { active: false, ePrev: false, t: 0, wob: 0, held: false };
  // shot determinism (the 126 ?scope=1 precedent, our own flag — lp-heron-scope
  // owns ?scope=1): ?rscope=1 auto-enters and HOLDS the session. Never in play.
  const SCOPE_HOLD = (() => { try { return /[?&]rscope=1/.test(location.search); } catch (e) { return false; } })();
  const _aim = new THREE.Vector3();

  function enter() {
    if (sess.active) return;
    sess.active = true; sess.ePrev = true; sess.t = 0; sess.wob = 0;
    wrap.style.display = 'block';
    takeCamera(CAM_ID);            // 126: ONE writer — main.js stops touching transform AND fov
    setMayorHidden(CAM_ID, true);  // you are AT the eyepiece, not in the picture
    inter.enabled = false;
    state.reserveScoped++;
    peepLo(0.05);
    toast('Piping Plover', 'the rarest guys — right there');
    // the payout REUSES nature.js's 'plover' key (same first/repeat/label) so
    // the two ways of seeing one price identically and the first is once-ever.
    // cd only throttles REPEATS — the gift is never throttled.
    wallet.pay({ key: 'plover', first: 8, repeat: 2, reason: 'birdwatch: the rarest guy',
      firstReason: 'birdwatch: a piping plover!', label: 'birdwatch', cd: 20 });
    if (state.birdsSeen && !state.birdsSeen.has('Piping Plover')) state.birdsSeen.add('Piping Plover');
  }
  function exit() {
    sess.active = false; wrap.style.display = 'none'; inter.enabled = true;
    releaseCamera(CAM_ID);         // main.js resumes from the converged camera and eases the fov home — one writer either side (and the mayor comes back)
  }
  const inter = addInteraction({ x: SCOPE.x, z: SCOPE.z, r: 2.2, label: 'peek through the scope', onUse: enter });

  // ---------------------------------------------------------------- (7) --
  // THE PLACARD at the cell-A sign — E cycles the honest story.
  const FACTS = [
    ['FIRST IN 70 YEARS', 'Monty & Rose nested at Montrose in 2019 — the first piping plovers to nest in Chicago in about seventy years.'],
    ['THE FESTIVAL MOVED', 'That 2019 nest is why a beach music festival was called off this sand. Two birds, one summer, and the city blinked.'],
    ['IMANI', 'Their son Imani hatched here in 2021 and keeps coming back to nest — the story did not end with his parents.'],
    ['SEAROCKET', 'Searocket was hand-reared from a rescued egg and released here in 2023. Last summer she raised four chicks.'],
  ];
  let factI = 0;
  addInteraction({ x: R.signs.cellA.x, z: R.signs.cellA.z, r: 2.5, label: 'read the placard',
    onUse: () => { const f = FACTS[factI % FACTS.length]; factI++; state.reserveFacts = Math.min(FACTS.length, factI); toast(f[0], f[1]); } });

  // ---------------------------------------------------------------- (4) --
  let visited = false;
  journalSection('montrose-reserve', 'The Reserve', () => `
    <div class="jrow"><span>Montrose dunes — inland unit</span><b>${visited ? '✓' : '—'}</b></div>
    <div class="jrow"><span>Looks through the scope</span><b>${state.reserveScoped}×</b></div>
    <div class="jrow"><span>Roped nest cells</span><b>2</b></div>
    <div class="jrow"><span>Placards read</span><b>${state.reserveFacts}/${FACTS.length}</b></div>
    <p>The dunes grew inland. Monty &amp; Rose nested on this beach in 2019 —
       the first piping plovers in Chicago in about seventy years — then Imani,
       then Searocket, and the sand kept being given back. Volunteers walk the
       rope every morning to count what hatched. Stay on the paths. 🐦</p>`);

  // ---------------------------------------------------------------- (5) --
  // definePlace: the reserve's own OPEN-SKY register (ambience only, no grade
  // key — this is a windy dune meadow, not a green room). First-match-wins:
  // the rect is west of MONTROSE_POINT's x186-244 / z-926..-860, no overlap.
  definePlace({
    name: 'Montrose Beach Dunes Natural Area',
    contains: (x, z) => x >= 33 && x <= 171 && z >= -834 && z <= -672,
    fadeS: 2.2, amb: { ext: 0.72, bird: 1.9 },
    onEnter() { if (!visited) { visited = true; toast('the dunes grew', 'stay on the paths — plovers about'); } },
  });
  const inReserve = (x, z) => x >= 33 && x <= 171 && z >= -834 && z <= -672;

  // ------------------------------ per frame -------------------------------
  const GATE_X = 90, GATE_Z = -770, GATE_R2 = 140 * 140;
  let shown = false, holdOnce = false, idlePrev = false;
  let peepT = 6 + Math.random() * 7;
  registerUpdate((dt, t, pl) => {
    if (SCOPE_HOLD && !holdOnce) { holdOnce = true; sess.held = true; enter(); }   // shot determinism: fire and HOLD

    // --- (a) monitors: re-pose AFTER updateNPC so our pose wins -----------
    for (let i = 0; i < monitors.length; i++) {
      const p = monitors[i], pt = p.npc.parts;
      if (p.binocs) {
        pt.armL.rotation.x = -2.3; pt.armR.rotation.x = -2.3;
        pt.armL.rotation.z = 0.15; pt.armR.rotation.z = -0.15;
      } else if (p.scope) {
        pt.armR.rotation.x = -0.7; pt.armR.rotation.z = -0.1; pt.armL.rotation.x = -0.2;
        pt.head.rotation.x = 0.10;                       // stooped to the eyepiece
      }
    }

    // --- (b) the plovers: distance gate, wander, hop-bob, peck -----------
    const gdx = pl.x - GATE_X, gdz = pl.z - GATE_Z;
    if (gdx * gdx + gdz * gdz > GATE_R2) {
      if (shown) { birds.visible = false; shown = false; }
    } else {
      if (!shown) { birds.visible = true; shown = true; }
      for (let i = 0; i < flock.length; i++) {
        const u = flock[i];
        if (u.moving) {
          const dx = u.tx - u.x, dz = u.tz - u.z, d = Math.hypot(dx, dz);
          if (d < 0.03) { u.moving = false; u.wait = 1.5 + Math.random() * 2.8; }
          else { const st = Math.min(d, 0.45 * dt); u.x += dx / d * st; u.z += dz / d * st; u.grp.rotation.y = Math.atan2(dx, dz); }
        } else { u.wait -= dt; if (u.wait <= 0) retarget(u); }
        const hop = u.moving ? Math.abs(Math.sin(t * 12 + u.ph)) * 0.03 : 0;
        u.grp.position.set(u.x, 0.02 + hop, u.z);
        // peck: the head SNAPS down and eases back up between jabs (the
        // nature.js updLurePeck idiom, on our own pivot Group)
        u.peckT -= dt;
        if (u.peckT <= 0) { u.peckT = (u.moving ? 1.4 : 0.7) + Math.random() * 1.6; u.headX = 0.9; }
        else u.headX += (0.12 - u.headX) * Math.min(1, dt * 8);
        u.head.rotation.x = u.headX;
        u.head.rotation.z = Math.sin(t * 1.4 + u.ph) * 0.18;
      }
    }

    // --- (c) the whistle: loose 9-16 s timer while inside the rope -------
    if (inReserve(pl.x, pl.z)) {
      peepT -= dt;
      if (peepT <= 0) { peepT = 9 + Math.random() * 7; peepLo(0.035); }
    }

    // --- (d) the scope session -------------------------------------------
    // idleBusy is EDGE-triggered: writing it every frame would stomp the other
    // look-through beats' flag from 1.7 km away (the 126 conservatory class).
    if (sess.active !== idlePrev) { idlePrev = sess.active; state.idleBusy = sess.active; }
    if (!sess.active) return;                     // 126: released -> main.js owns the fov again and eases it home. We do NOT
                                                  // keep easing toward baseFov here: that was the second writer.
    // fov ease to the 26° eyepiece zoom, ours ALONE while takeCamera() holds,
    // so it REACHES the target instead of settling at a dt-dependent midpoint
    // and wobbling with every frame-time hitch (issue 039). Scaled off
    // baseFov() (096): 26 on desktop, proportionally wider on portrait.
    const Z = 26 * baseFov() / 50;
    if (Math.abs(camera.fov - Z) > 0.01) {
      camera.fov = lerp(camera.fov, Z, 1 - Math.exp(-9 * dt));
      if (Math.abs(camera.fov - Z) < 0.01) camera.fov = Z;
      camera.updateProjectionMatrix();
    }
    sess.t += dt; sess.wob += dt;
    const eNow = keys.has('e'), ePress = eNow && !sess.ePrev; sess.ePrev = eNow;
    if (!sess.held && (ePress || movingNow() || sess.t > 8)) { exit(); return; }   // never strand: auto-step-back after 8 s

    // a fixed mounted-scope eye on the exclosure, with a little tripod sway
    _aim.copy(AIM);
    _aim.x += Math.sin(sess.wob * 0.9) * 0.03;
    _aim.y += Math.sin(sess.wob * 1.3 + 1.1) * 0.02;
    camera.position.copy(EYE);
    camera.lookAt(_aim);
    camera.rotateY(Math.sin(sess.wob * 1.1) * 0.003);
    camera.rotateX(Math.sin(sess.wob * 0.8 + 0.7) * 0.003);
  });

  // ---- probe-first (the 091 law): tools never have to trust a screenshot --
  try {
    window.__hd = window.__hd || {};
    window.__hd.rscope = {
      get active() { return sess.active; },
      fov: () => camera.fov,
      get looks() { return state.reserveScoped; },
      get facts() { return state.reserveFacts; },
      get mayorVisible() { return mayor.visible; },
      get vignette() { return wrap.style.display; },
      get birdsShown() { return birds.visible; },
      birds: () => flock.map(u => ({ x: +u.x.toFixed(2), z: +u.z.toFixed(2), moving: u.moving })),
      enter, exit,
    };
  } catch (e) { /* probe is debug-only — never break the game over it */ }
});
