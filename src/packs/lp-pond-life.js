// =====================================================================
//  PACK: lp-pond-life — task 117 SOUTH POND life. structures.js/coast.js
//  build the PLACE (boardwalk deck, honeycomb pavilion, Café Brauer, the
//  algae-green water plane, bank scatter) from data/chicago.js; THIS pack
//  owns the LIFE on it:
//    * NIGHT HERONS: chibi-chunky black-crowned night herons — the
//      endangered-rookery delight hook. TWO perched on piling stubs off
//      the pavilion bend (merged per color: grey-blue body / white belly
//      + throat + nape plume / black crown cap + dark beak / yellow legs)
//      and ONE HUNCHED in the SE shallows whose neck+head runs an idle
//      STARE -> STRIKE -> hold -> rise beat (the 115 flamingo-dipper state
//      machine), with a sparse synthesized "quawk" (actx-guarded).
//    * TURTLES: a half-log floating in the shallows W of the deck with 3
//      chunky basking turtles (merged carapaces + merged dark skin/rim)
//      on a gentle idle bob. The heron perch pilings share the log's wood
//      mesh (+0 draws).
//    * DRAGONFLIES: one THREE.Points set of teal motes darting over the
//      water (rejection-sampled inside LP_SOUTHPOND_WATER), fast tight
//      drift + re-target + shimmer. ONE draw, NOT an InstancedMesh.
//    * LILY PADS: ~78 discs near the pond edge, merged into TWO meshes
//      (two greens), LOCAL seed. +2 draws, no bucket.
//    * PADDLEBOATS: four green pedal boats + ONE white swan boat off the
//      Café Brauer terrace, each with FREEBOARD and a dark waterline band
//      (the 076 law — a flush hull reads as a lily pad side-on), on a tiny
//      shared swell bob.
//  Culling: every mesh lives under ONE group named 'zooanim' (the fogcull
//  selfManaged exemption by name, same as packs/zoo.js) hidden past
//  LP_SOUTHPOND.cull (150 m of (-30,952)) with a full early-out — zero
//  pond work when far. Determinism: ALL placements are literal constants
//  or LOCAL xorshift seeds from the data (lily.seed / dragonflies.seed);
//  the shared world rng is NEVER touched. Math.random only for runtime
//  timers/jitter. No per-frame allocation; every audio access guarded.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, registerUpdate, getAudioCtx, prefersCalm, prefersLowPower } from '../framework.js';
import { scene, toon, pip, pointsMat } from '../core.js';
import { sph, box } from './zoo.js';   // the shared 114 animal part helpers
import * as CH from '../data/chicago.js';

// pose a finished local-space part-set: rotateY about the feet origin, place
function put(g, x, y, z, ry) { if (ry) g.rotateY(ry); g.translate(x, y, z); return g; }
// LOCAL deterministic streams (never the shared world rng)
function mkrng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
// points buffer (lake-moods pointsGeo)
function pointsGeo(n) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
  return g;
}
const merge = (a) => BufferGeometryUtils.mergeBufferGeometries(a, false);

// ---- night heron recipe: ~0.9 m chibi-chunky, feet at y 0, +z forward ----
// Hunched profile (night herons never stand tall): a fat oval body low on
// short yellow legs, a thick short neck, a big head under a BLACK crown cap,
// white belly + throat + a thin nape plume, stout dark down-tilted beak.
function heronPerched(s) {
  const grey = merge([
    sph(1, 8, 0.20, 0.19, 0.30, 0, 0.48, 0),                     // fat oval body
    sph(1, 6, 0.09, 0.07, 0.16, 0, 0.46, -0.30, 0, -0.25),       // short cocked tail
    sph(1, 6, 0.10, 0.13, 0.11, 0, 0.68, 0.10),                  // thick hunched neck
    sph(0.125, 7, 1, 0.92, 1.12, 0, 0.80, 0.145),                // big head
  ]);
  const white = merge([
    sph(1, 7, 0.155, 0.13, 0.24, 0, 0.42, 0.045),                // pale belly lens
    sph(1, 6, 0.075, 0.07, 0.075, 0, 0.755, 0.235),              // white throat
    sph(1, 5, 0.013, 0.013, 0.10, 0, 0.885, -0.05, 0, -0.30),    // the nape plume
  ]);
  const dark = merge([
    sph(0.128, 7, 1, 0.62, 1.05, 0, 0.855, 0.14),                // BLACK crown cap
    sph(1, 5, 0.032, 0.036, 0.115, 0, 0.775, 0.30, 0, 0.42),     // stout down-tilted beak
  ]);
  const leg = merge([
    box(0.045, 0.30, 0.045, 0.065, 0.15, 0),
    box(0.045, 0.30, 0.045, -0.065, 0.15, 0),
    box(0.12, 0.035, 0.14, 0.065, 0.017, 0.03),                  // flat feet on the perch
    box(0.12, 0.035, 0.14, -0.065, 0.017, 0.03),
  ]);
  for (const g of [grey, white, dark, leg]) g.scale(s, s, s);
  return { grey, white, dark, leg };
}
// the HUNCHED bird: same vocabulary, split so the neck+head can pivot. body/
// legs bake into the shared static meshes; neck (grey) carries the dark
// crown+beak as a child. Neck pivot at local (0, NECK_Y, NECK_Z).
const NECK_Y = 0.56, NECK_Z = 0.05;
function heronHunched(s) {
  const grey = merge([
    sph(1, 8, 0.215, 0.20, 0.31, 0, 0.42, 0),                    // body, sat lower (hunched)
    sph(1, 6, 0.09, 0.07, 0.16, 0, 0.41, -0.31, 0, -0.20),       // tail
  ]);
  const white = sph(1, 7, 0.16, 0.13, 0.24, 0, 0.36, 0.05);      // belly
  const leg = merge([
    box(0.045, 0.24, 0.045, 0.065, 0.12, 0),                     // shins in the shallows
    box(0.045, 0.24, 0.045, -0.065, 0.12, 0),
  ]);
  const neck = merge([                                           // neck-LOCAL (pivot at 0,0,0)
    sph(1, 6, 0.105, 0.135, 0.115, 0, 0.09, 0.03),
    sph(0.128, 7, 1, 0.92, 1.12, 0, 0.22, 0.08),
  ]);
  const neckDark = merge([
    sph(0.131, 7, 1, 0.62, 1.05, 0, 0.275, 0.075),               // crown cap on the head
    sph(1, 5, 0.032, 0.036, 0.115, 0, 0.195, 0.235, 0, 0.42),    // beak
  ]);
  const neckWhite = merge([
    sph(1, 6, 0.075, 0.07, 0.075, 0, 0.175, 0.17),               // throat
    sph(1, 5, 0.013, 0.013, 0.10, 0, 0.305, -0.115, 0, -0.30),   // nape plume
  ]);
  for (const g of [grey, white, leg]) g.scale(s, s, s);
  for (const g of [neck, neckDark, neckWhite]) g.scale(s, s, s);
  return { grey, white, leg, neck, neckDark, neckWhite };
}

// ---- ONE turtle: chunky dome carapace + darker head/flippers/rim --------
function turtleGeos(s) {
  const shell = sph(1, 8, 0.26, 0.175, 0.32, 0, 0.11, 0);        // domed carapace
  const skin = merge([
    sph(1, 8, 0.275, 0.05, 0.335, 0, 0.055, 0),                  // dark marginal rim
    sph(1, 6, 0.06, 0.05, 0.075, 0, 0.075, 0.29),                // neck
    sph(0.075, 6, 1, 0.9, 1.05, 0, 0.10, 0.36),                  // head
    sph(1, 6, 0.13, 0.045, 0.085, 0.235, 0.05, 0.14, 0.5),       // front flippers
    sph(1, 6, 0.13, 0.045, 0.085, -0.235, 0.05, 0.14, -0.5),
    sph(1, 5, 0.085, 0.04, 0.065, 0.215, 0.05, -0.20, -0.4),     // hind flippers
    sph(1, 5, 0.085, 0.04, 0.065, -0.215, 0.05, -0.20, 0.4),
  ]);
  shell.scale(s, s, s); skin.scale(s, s, s);
  return { shell, skin };
}

// ---- pedal boat / swan boat: y 0 = the waterline, +z = bow --------------
// FREEBOARD law (076): the hull top rides ~0.25 above the water and a DARK
// band straddles y 0 — a flush hull reads as a lily pad side-on.
function pedalBoat() {
  return {
    green: merge([
      box(1.10, 0.44, 1.70, 0, 0.03, 0),                         // hull box (top 0.25 proud)
      sph(1, 7, 0.55, 0.22, 0.45, 0, 0.03, 0.85),                // rounded prow
    ]),
    deck: merge([                                                // PALE cockpit — a light value spot so the boat separates from the algae-green water + lily pads (090 green-on-green law; the ref boats' pale seats)
      box(0.90, 0.10, 0.36, 0, 0.27, -0.70),                     // stern deck
      box(0.44, 0.36, 0.11, 0.26, 0.42, -0.30),                  // two seat backs
      box(0.44, 0.36, 0.11, -0.26, 0.42, -0.30),
      box(0.30, 0.16, 0.50, 0, 0.30, 0.25),                      // pedal console
    ]),
    dark: merge([
      box(1.16, 0.13, 1.76, 0, -0.02, 0),                        // waterline band
      sph(1, 7, 0.58, 0.065, 0.47, 0, -0.02, 0.85),
    ]),
  };
}
function swanBoat() {
  return {
    white: merge([
      sph(1, 9, 0.60, 0.40, 0.92, 0, 0.14, 0),                   // rounded swan hull
      sph(1, 6, 0.26, 0.22, 0.30, 0, 0.34, -0.86, 0, -0.55),     // cocked tail
      sph(1, 7, 0.16, 0.28, 0.58, 0.50, 0.30, -0.06),            // folded wings
      sph(1, 7, 0.16, 0.28, 0.58, -0.50, 0.30, -0.06),
      box(0.66, 0.26, 0.70, 0, 0.40, -0.18),                     // the seat well
      sph(1, 6, 0.13, 0.26, 0.13, 0, 0.62, 0.40, 0, 0.55),       // neck lower, leaning out
      sph(1, 6, 0.115, 0.23, 0.115, 0, 0.97, 0.50, 0, -0.12),    // neck upper, near vertical
      sph(0.15, 7, 1, 0.9, 1.1, 0, 1.15, 0.55),                  // head
    ]),
    dark: merge([
      sph(1, 9, 0.64, 0.07, 0.97, 0, -0.02, 0),                  // waterline band
      sph(1, 5, 0.05, 0.045, 0.11, 0, 1.12, 0.68, 0, 0.25),      // beak
    ]),
  };
}

onWorldReady(() => {
  const SP = CH.LP_SOUTHPOND, W = CH.LP_SOUTHPOND_WATER, HC = CH.LP_HONEYCOMB;
  const WY = SP.waterY, H = SP.herons, T = SP.turtles, PB = SP.paddleboats;
  const low = prefersLowPower, calm = prefersCalm;

  // cached toon() colors (toon caches by hex; the wood 0x8a6a44 is the
  // Diversey dock / boardwalk pool color)
  const GREY = toon(H.body), WHITE = toon(H.belly), CROWN = toon(H.crown),
        LEGC = toon(H.leg), BEAKC = toon(H.beak);
  const SHELL = toon(T.shell), SHELL2 = toon(T.shell2), WOOD = toon(T.log);
  const LILY1 = toon(SP.lily.color), LILY2 = toon(SP.lily.color2);
  const GREENB = toon(PB.green), DECKC = toon(PB.deck), SWANW = toon(PB.swan), BDARK = toon(PB.dark);

  // ---- the one pond-life group (fogcull selfManaged exemption by name) --
  const grp = new THREE.Group(); grp.name = 'zooanim'; scene.add(grp);

  // pond-polygon bbox + point->edge distance (build-time only)
  let X0 = 1e9, X1 = -1e9, Z0 = 1e9, Z1 = -1e9;
  for (const [px, pz] of W) { if (px < X0) X0 = px; if (px > X1) X1 = px; if (pz < Z0) Z0 = pz; if (pz > Z1) Z1 = pz; }
  function edgeDist(x, z) {
    let best = 1e9;
    for (let i = 0, j = W.length - 1; i < W.length; j = i++) {
      const ax = W[j][0], az = W[j][1], dx = W[i][0] - ax, dz = W[i][1] - az;
      const L2 = dx * dx + dz * dz || 1;
      let u = ((x - ax) * dx + (z - az) * dz) / L2; u = u < 0 ? 0 : u > 1 ? 1 : u;
      const cx = ax + dx * u - x, cz = az + dz * u - z;
      const d = Math.sqrt(cx * cx + cz * cz);
      if (d < best) best = d;
    }
    return best;
  }

  // =================== (1) NIGHT HERONS ===============================
  // The two perched birds stand on their own piling stubs off the pavilion
  // bend (the deck's pilings are structures-side; these are the perches the
  // brief's "a piling + the deck edge" read needs) — the stubs merge into
  // the turtle-log WOOD mesh below, so they cost nothing.
  const PERCH_TOP = 0.35;                                        // stub top above y0
  const perchStubs = [];
  let hNeck = null;                                              // the pivoting neck (animated)
  {
    const greys = [], whites = [], darks = [], legs = [];
    for (const [x, z, ry] of H.perched) {
      const b = heronPerched(1.15);                              // chunk law
      greys.push(put(b.grey, x, PERCH_TOP, z, ry));
      whites.push(put(b.white, x, PERCH_TOP, z, ry));
      darks.push(put(b.dark, x, PERCH_TOP, z, ry));
      legs.push(put(b.leg, x, PERCH_TOP, z, ry));
      const p = new THREE.CylinderGeometry(0.15, 0.15, 1.30, 6); // stub: top 0.35, foot buried
      p.translate(x, PERCH_TOP - 0.65, z);
      perchStubs.push(p);
      perchStubs.push(sph(0.19, 6, 1, 0.5, 1, x, PERCH_TOP - 0.10, z));   // piling cap ring under the feet
    }
    // the HUNCHED bird in the SE shallows: feet at the water surface
    const hb = heronHunched(1.15);
    const [hx, hz, hry] = H.hunched;
    greys.push(put(hb.grey, hx, WY + 0.02, hz, hry));
    whites.push(put(hb.white, hx, WY + 0.02, hz, hry));
    legs.push(put(hb.leg, hx, WY + 0.02, hz, hry));
    grp.add(new THREE.Mesh(merge(greys), GREY));
    grp.add(new THREE.Mesh(merge(whites), WHITE));
    grp.add(new THREE.Mesh(merge(darks), CROWN));                // the two perched caps + beaks
    grp.add(new THREE.Mesh(merge(legs), LEGC));

    // the pivoting neck: stare (rx 0) -> strike (rx STRIKE) -> hold -> rise
    hNeck = new THREE.Mesh(hb.neck, GREY);
    hNeck.rotation.order = 'YXZ';
    hNeck.position.set(0, NECK_Y * 1.15, NECK_Z * 1.15);
    hNeck.add(new THREE.Mesh(hb.neckDark, BEAKC));
    hNeck.add(new THREE.Mesh(hb.neckWhite, WHITE));
    const hG = new THREE.Group();
    hG.position.set(hx, WY + 0.02, hz); hG.rotation.y = hry;    // same yaw the merged body baked
    hG.add(hNeck);
    grp.add(hG);
  }

  // =================== (2) TURTLES ON A HALF-LOG =======================
  // The log lies in the shallows W of the deck, partly submerged; the wood
  // mesh also carries the two heron perch stubs (+0 draws).
  {
    const wood = perchStubs.slice();
    const lg = new THREE.CylinderGeometry(0.30, 0.30, 3.10, 8);
    lg.rotateZ(Math.PI / 2);                                     // lay it down (axis +x)
    lg.rotateY(T.ry); lg.translate(T.x, WY + 0.10, T.z);
    wood.push(lg);
    const stub = new THREE.CylinderGeometry(0.09, 0.11, 0.85, 5);  // a snapped branch
    stub.rotateZ(0.9); stub.rotateY(T.ry + 1.2);
    stub.translate(T.x + Math.cos(T.ry) * 1.35, WY + 0.30, T.z - Math.sin(T.ry) * 1.35);
    wood.push(stub);
    grp.add(new THREE.Mesh(merge(wood), WOOD));
  }
  // the shells bob/roll as a group — its origin sits AT the log (a group at the
  // world origin would swing them metres per milliradian)
  const turtG = new THREE.Group();
  turtG.position.set(T.x, 0, T.z);
  {
    const shells = [], skins = [];
    const AX = Math.cos(T.ry), AZ = -Math.sin(T.ry);             // log axis (put() rotateY convention)
    const U = [-0.95, 0.05, 0.95], RY = [0.55, -0.35, 0.20], SC = [1.05, 1.15, 0.95];
    for (let i = 0; i < T.count; i++) {
      const u = U[i % 3], t = turtleGeos(SC[i % 3]);
      shells.push(put(t.shell, AX * u, WY + 0.36, AZ * u, T.ry + RY[i % 3]));
      skins.push(put(t.skin, AX * u, WY + 0.36, AZ * u, T.ry + RY[i % 3]));
    }
    turtG.add(new THREE.Mesh(merge(shells), SHELL));
    turtG.add(new THREE.Mesh(merge(skins), SHELL2));
    grp.add(turtG);
  }

  // =================== (3) LILY PADS (merged, LOCAL seed) ==============
  {
    const L = SP.lily, R = mkrng(L.seed), a = [], b = [];
    let placed = 0, tries = 0;
    while (placed < L.pads && tries++ < 8000) {
      const x = X0 + R() * (X1 - X0), z = Z0 + R() * (Z1 - Z0);
      const r = L.r[0] + R() * (L.r[1] - L.r[0]), rot = R() * Math.PI * 2, alt = R() < 0.42;
      if (!pip(x, z, W)) continue;                               // inside the water
      if (edgeDist(x, z) > L.edgeMax) continue;                  // pads hug the margin
      if (CH.lpBoardwalkHit(x, z)) continue;                     // never under the deck
      let clash = Math.hypot(x - T.x, z - T.z) < 2.6;            // clear of the 3.1 m turtle log
      if (!clash) for (const [bx, bz] of PB.spots) { if (Math.hypot(x - bx, z - bz) < 2.2) { clash = true; break; } }
      if (!clash) for (const [hx2, hz2] of H.perched) { if (Math.hypot(x - hx2, z - hz2) < 1.0) { clash = true; break; } }
      if (!clash && Math.hypot(x - HC.x, z - HC.z) < HC.spanW * 0.5 + 0.4) clash = true;   // clear of the pavilion springing
      if (clash) continue;
      const c = new THREE.CircleGeometry(r, 9);
      c.rotateX(-Math.PI / 2); c.rotateY(rot);
      c.translate(x, WY + 0.03, z);
      (alt ? b : a).push(c); placed++;
    }
    if (a.length) grp.add(new THREE.Mesh(merge(a), LILY1));
    if (b.length) grp.add(new THREE.Mesh(merge(b), LILY2));
  }

  // =================== (4) PADDLEBOATS + THE SWAN ======================
  // Clustered on the NW water off the Café Brauer terrace. One shared group
  // so the whole raft rides the same tiny swell (no per-boat draws).
  const boatG = new THREE.Group();
  {
    let cx = 0, cz = 0;
    for (const [x, z] of PB.spots) { cx += x; cz += z; }
    cx /= PB.spots.length; cz /= PB.spots.length;
    boatG.position.set(cx, 0, cz);
    const greens = [], decks = [], whites = [], darks = [];
    for (let i = 0; i < PB.spots.length; i++) {
      const [x, z, ry] = PB.spots[i];
      if (i === PB.spots.length - 1) {                           // the ONE white swan boat
        const s = swanBoat();
        whites.push(put(s.white, x - cx, WY, z - cz, ry));
        darks.push(put(s.dark, x - cx, WY, z - cz, ry));
      } else {
        const p = pedalBoat();
        greens.push(put(p.green, x - cx, WY, z - cz, ry));
        decks.push(put(p.deck, x - cx, WY, z - cz, ry));
        darks.push(put(p.dark, x - cx, WY, z - cz, ry));
      }
    }
    if (greens.length) boatG.add(new THREE.Mesh(merge(greens), GREENB));
    if (decks.length) boatG.add(new THREE.Mesh(merge(decks), DECKC));
    if (whites.length) boatG.add(new THREE.Mesh(merge(whites), SWANW));
    if (darks.length) boatG.add(new THREE.Mesh(merge(darks), BDARK));
    grp.add(boatG);
  }

  // =================== (5) DRAGONFLIES (ONE Points set) ================
  const D = SP.dragonflies;
  const dn = low() ? 6 : D.n;
  const dGeo = pointsGeo(dn);
  const dPos = dGeo.attributes.position, dCol = dGeo.attributes.aColor, dSiz = dGeo.attributes.aSize;
  const dax = new Float32Array(dn), day = new Float32Array(dn), daz = new Float32Array(dn);
  const dcx = new Float32Array(dn), dcy = new Float32Array(dn), dcz = new Float32Array(dn);
  const dtx = new Float32Array(dn), dty = new Float32Array(dn), dtz = new Float32Array(dn);
  const dtm = new Float32Array(dn), dph = new Float32Array(dn);
  {
    const R = mkrng(D.seed);
    for (let i = 0; i < dn; i++) {
      let x = SP.cull.x, z = SP.cull.z;                          // fallback = pond centre (inside)
      for (let k = 0; k < 60; k++) {
        const px = X0 + R() * (X1 - X0), pz = Z0 + R() * (Z1 - Z0);
        if (pip(px, pz, W)) { x = px; z = pz; break; }
      }
      dax[i] = x; daz[i] = z;
      day[i] = WY + D.yLo + R() * (D.yHi - D.yLo);               // just over the water
      dph[i] = R() * 9; dtm[i] = R() * 0.8;
      dPos.setXYZ(i, x, day[i], z);
      dCol.setXYZ(i, D.color[0], D.color[1], D.color[2]);
      dSiz.setX(i, 1.0 + R() * 0.7);                             // small, tight motes
    }
    dPos.needsUpdate = dCol.needsUpdate = dSiz.needsUpdate = true;
    grp.add(new THREE.Points(dGeo, pointsMat()));
  }

  // =================== (6) the heron "quawk" (synth, guarded) ==========
  function quawk(vol) {
    const A = getAudioCtx(); const actx = A.actx; if (!actx) return;
    const t0 = actx.currentTime;
    const o = actx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(440, t0);
    o.frequency.exponentialRampToValueAtTime(205, t0 + 0.15);    // the harsh falling "quok"
    const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 850; bp.Q.value = 1.1;
    const g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
    o.connect(bp); bp.connect(g); g.connect(A.sfxBus);
    o.start(t0); o.stop(t0 + 0.24);
  }

  // =================== (7) per frame: cull gate + idle motion ==========
  const C = SP.cull;
  let cullT = 0, near = true;
  let sPh = 0, sT = 6 + Math.random() * 6;                       // heron strike beat
  let callT = 14 + Math.random() * 16;
  const STRIKE = 1.9;   // neck-down: the beak ends ~0.3 m over the shallows, tilted forward
  registerUpdate((dt, t, pl) => {
    // throttled distance gate (~0.4 s): far -> hide + ZERO pond work
    cullT -= dt;
    if (cullT <= 0) {
      cullT = 0.4;
      const dx = pl.x - C.x, dz = pl.z - C.z;
      near = dx * dx + dz * dz <= C.r * C.r;
      if (grp.visible !== near) grp.visible = near;
    }
    if (!near) return;
    const cm = calm();

    // -- HUNCHED HERON: stare -> fast strike -> hold -> slow rise --------
    if (sPh === 0) {                                             // stare, slow head scan
      hNeck.rotation.x = 0;
      hNeck.rotation.y = Math.sin(t * 0.9) * 0.28;
      sT -= dt; if (sT <= 0) { sPh = 1; sT = 0.32; }
    } else if (sPh === 1) {                                      // strike DOWN
      sT -= dt;
      const u = 1 - Math.max(0, sT) / 0.32, e = u * u * (3 - 2 * u);
      hNeck.rotation.x = STRIKE * e;
      if (sT <= 0) {
        sPh = 2; sT = 0.55;
        if (Math.random() < 0.35) {                              // an occasional quawk on the strike
          const qx = pl.x - H.hunched[0], qz = pl.z - H.hunched[1];
          const qd = Math.sqrt(qx * qx + qz * qz);
          if (qd < 70) quawk(0.055 * Math.max(0.25, 1 - qd / 70));
        }
      }
    } else if (sPh === 2) { sT -= dt; if (sT <= 0) { sPh = 3; sT = 0.9; } }
    else {                                                       // rise back to the stare
      sT -= dt;
      const u = Math.max(0, sT) / 0.9, e = u * u * (3 - 2 * u);
      hNeck.rotation.x = STRIKE * e;
      if (sT <= 0) { sPh = 0; sT = 6 + Math.random() * 6; }
    }

    // -- TURTLES: a gentle basking bob + shift on the log ---------------
    turtG.position.y = Math.sin(t * 0.85) * (cm ? 0.006 : 0.015);
    turtG.rotation.z = Math.sin(t * 0.61) * (cm ? 0.003 : 0.008);

    // -- PADDLEBOATS: the same tiny swell across the raft ---------------
    boatG.position.y = Math.sin(t * 0.75) * (cm ? 0.008 : 0.022);
    boatG.rotation.z = Math.sin(t * 0.53 + 1.1) * (cm ? 0.002 : 0.006);

    // -- DRAGONFLIES: fast tight darting + re-target + shimmer ----------
    const fk = cm ? 0.45 : 1, ak = cm ? 0.6 : 1;
    for (let i = 0; i < dn; i++) {
      dtm[i] -= dt;
      if (dtm[i] <= 0) {                                         // re-target (runtime jitter only)
        dtm[i] = 0.45 + Math.random() * 0.9;
        dtx[i] = (Math.random() * 2 - 1) * 1.7;
        dty[i] = (Math.random() * 2 - 1) * 0.32;
        dtz[i] = (Math.random() * 2 - 1) * 1.7;
      }
      const k = Math.min(1, dt * 4.5 * fk);
      dcx[i] += (dtx[i] - dcx[i]) * k;
      dcy[i] += (dty[i] - dcy[i]) * k;
      dcz[i] += (dtz[i] - dcz[i]) * k;
      const ph = dph[i];
      dPos.setXYZ(i,
        dax[i] + dcx[i] + Math.sin(t * 7.5 * fk + ph) * 0.09 * ak,
        day[i] + dcy[i] + Math.sin(t * 11 * fk + ph * 1.7) * 0.05 * ak,
        daz[i] + dcz[i] + Math.cos(t * 8.5 * fk + ph) * 0.09 * ak);
      const bl = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 5.5 * fk + ph * 2));
      dCol.setXYZ(i, D.color[0] * bl, D.color[1] * bl, D.color[2] * bl);
    }
    dPos.needsUpdate = dCol.needsUpdate = true;

    // -- an idle far-off quawk now and then (sparse, distance-scaled) ---
    callT -= dt;
    if (callT <= 0) {
      callT = 16 + Math.random() * 18;
      const qx = pl.x - H.hunched[0], qz = pl.z - H.hunched[1];
      const qd = Math.sqrt(qx * qx + qz * qz);
      if (qd < 70) quawk(0.045 * Math.max(0.25, 1 - qd / 70));
    }
  });
});
