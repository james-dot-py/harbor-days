// =====================================================================
//  PACK: trail-discovery — TRAIL MICRO-DISCOVERY (task 121). The 2026-07-19
//  design audit's B3 fix: the long connectors between the set pieces (the
//  Belmont harbor rim, the spit spine, the golf-run corridor, the Montrose
//  bay waist, the beach back-edge) had degraded to JUST WALKING. This pack
//  puts one small noticeable thing every ~50 m, all of it deadpan and
//  static — nothing here demands anything of the player:
//    1. PLAQUES (5)   — angled cream lectern markers on two short wood posts,
//                       "read the plaque" toasts the whole gag (RAY'S BIG FISH,
//                       POINT OF INTEREST, HISTORIC AIR SPACE, THE FOG OF 1953,
//                       ABOUT THE LAKE). Solid: props.collide() at r 0.45.
//    2. GULL HUDDLES  — loafing gulls (the favors-wrigley makeGull geometry at
//         (5 clusters)  chibi scale 1.55, the repo's small-birds-don't-read law),
//                       one JUVENILE (brown mantle, smaller) and one LOOKOUT
//                       (head turned) per huddle. Never animated, no colliders.
//    3. PAINTED ROCKS — kindness-rock patches: squashed toon stones, most
//         (6 clusters)  wearing one bright color, a couple left bare grey.
//    4. MICRO-PICKS(7)— a shell or a gull feather + a halo/core glint (the 091
//                       recipe). "pocket the …" pays the trailfind register row.
//    5. SIT SPOTS (3) — for the three 121 benches; props.js builds the benches
//                       themselves from CH.BENCHES — this pack only seats them.
//
//  ALL placement data lives in data/chicago.js (CH.TRAIL_DISCOVERY, the
//  city-pack rule) — every coord probed against the live world for ribbon /
//  tree / fence / footprint clearance (tools/tmp/121-siteprobe.mjs). Ground is
//  y = 0 everywhere (all five stretches are verified flat lawn/sand).
//
//  DRAW-CALL DESIGN: statics are grouped by STRETCH KEY (rim|spit|golf|bay|
//  beach) and merged into ONE vertex-colored toon mesh per stretch, so each
//  bounding sphere stays LOCAL — frustum culling plus fogcull.js drop every
//  other stretch from every view: 1 merged static + the plaque faces + any
//  pick mesh/glint in frame. MEASURED with __hd.census (tools/tmp/121-census.mjs):
//  6-7 td-* draws worst case (the rim, whose stretch overlaps the spit's),
//  2-5 elsewhere; whole-scene worst across those views 308/~480. The mp/wv
//  draw budgets never see any of it.
//
//  DETERMINISM: zero shared-rng (rng/rand) draws, zero Math.random. Jitter
//  comes from LOCAL mulberry32 seeds carried in the data table, one per
//  cluster; per-index constants elsewhere. World layout is untouched.
//
//  STATIC PACK: no registerUpdate, no per-frame code, no allocations after
//  world-ready. Only-my-file rules honoured: this module + ONE import line in
//  packs/index.js. Storage only via the framework wallet.
// =====================================================================
import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { onWorldReady, addInteraction, addSitSpot, toast, wallet, getAudioCtx } from '../framework.js';
import { scene, toon, bmat, pointsMat } from '../core.js';
import { collide } from '../props.js';
import * as CH from '../data/chicago.js';

// ---- local deterministic rng (NEVER the shared world rng) --------------
const m32=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};

// ---- merge/paint helpers (the favors-wrigley/hats recipe: one vertexColors
// toon material = 1 draw per merged mesh) -------------------------------
let _vc = null;
const vcMat = () => _vc || (_vc = toon(0xffffff, { mat: { vertexColors: true } }));
const _col = new THREE.Color();
function paint(geo, hex) {
  geo = geo.toNonIndexed();
  _col.set(hex);
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = _col.r; a[i * 3 + 1] = _col.g; a[i * 3 + 2] = _col.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
const merged = parts => new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(parts, false), vcMat());

// place a local-frame geometry into the world: yaw ry, then translate to x,z.
const _m = new THREE.Matrix4(), _mq = new THREE.Quaternion(), _me = new THREE.Euler(),
      _mp = new THREE.Vector3(), _ms = new THREE.Vector3(1, 1, 1);
function place(geo, x, z, ry, s) {
  _me.set(0, ry, 0); _mq.setFromEuler(_me); _mp.set(x, 0, z); _ms.set(s || 1, s || 1, s || 1);
  _m.compose(_mp, _mq, _ms);
  geo.applyMatrix4(_m);
  return geo;
}

// ------------------------------- plaques -------------------------------
const P_TILT = -0.55;                       // face tilt (lectern angle)
const POST = 0x6d4526, BOARD = 0x8a6238;

// plaque woodwork in the LOCAL frame, already placed into the world.
function plaqueWood(p) {
  const out = [];
  for (const dx of [-0.28, 0.28]) {
    const g = new THREE.BoxGeometry(0.09, 0.75, 0.09); g.translate(dx, 0.375, 0);
    out.push(place(paint(g, POST), p.x, p.z, p.ry));
  }
  const b = new THREE.BoxGeometry(0.84, 0.55, 0.045);
  b.rotateX(P_TILT); b.translate(0, 0.82, 0);
  out.push(place(paint(b, BOARD), p.x, p.z, p.ry));
  return out;
}

// the readable face — its OWN small textured mesh, sitting 0.011 m PROUD of the
// backing along the TILTED face normal. Built plane -> rotateX(tilt) -> push
// along the rotated normal n=(0, sin .55, cos .55) from the backing centre.
// FrontSide (default): the solid backing covers the rear (the 032 sign law).
function plaqueFace(p) {
  const g = new THREE.PlaneGeometry(0.76, 0.47);
  g.rotateX(P_TILT);
  const d = 0.0335, s = Math.sin(-P_TILT), c = Math.cos(-P_TILT);
  g.translate(0, 0.82 + s * d, c * d);
  place(g, p.x, p.z, p.ry);
  const mesh = new THREE.Mesh(g, bmat(0xffffff, { map: plaqueTex(p) }));
  mesh.name = 'td-face';
  return mesh;
}

// shrink-to-fit font (the 028/050 headless word-sign law: NEVER trust a fixed px)
function fit(g, text, maxW, weight, px, family) {
  let s = px;
  do { g.font = `${weight} ${s}px ${family}`; if (g.measureText(text).width <= maxW) break; s -= 2; } while (s > 8);
  return s;
}
function plaqueTex(p) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 340;
  const g = cv.getContext('2d');
  g.fillStyle = '#f2e8d2'; g.fillRect(0, 0, 512, 340);
  g.strokeStyle = '#8a6238'; g.lineWidth = 3; g.strokeRect(10, 10, 492, 320);
  g.fillStyle = '#4a3226'; g.textAlign = 'center'; g.textBaseline = 'middle';
  fit(g, p.title, 440, 700, 44, '"Trebuchet MS",sans-serif');
  g.fillText(p.title, 256, 70);
  g.fillStyle = '#8a6238'; g.fillRect(120, 100, 272, 2);        // thin rule under the title
  g.fillStyle = '#4a3226';
  const ys = [150, 205, 260];
  for (let i = 0; i < p.lines.length && i < 3; i++) {
    fit(g, p.lines[i], 460, 700, 30, '"Trebuchet MS",sans-serif');
    g.fillText(p.lines[i], 256, ys[i]);
  }
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}

// -------------------------------- gulls --------------------------------
// EXACTLY the favors-wrigley makeGull() parts (~0.35 m, faces +z), returned as
// a painted geometry LIST with the per-gull transform baked in, so a whole
// huddle folds into its stretch's merged mesh.
const G_WHITE = 0xf3f2ee, G_GREY = 0xacb2bb, G_JUV = 0xb9a58e,
      G_BEAK = 0xe7a13a, G_EYE = 0x24272d, G_LEG = 0xdf8f2a;
function gullGeos(x, z, ry, s, juvenile, lookout) {
  const grey = juvenile ? G_JUV : G_GREY;                       // mantle/wings/tail
  const body = new THREE.SphereGeometry(0.11, 12, 10); body.scale(0.9, 0.92, 1.55); body.translate(0, 0.13, 0);
  const mantle = new THREE.SphereGeometry(0.095, 10, 8); mantle.scale(0.92, 0.5, 1.35); mantle.translate(0, 0.2, -0.03);
  const head = new THREE.SphereGeometry(0.075, 12, 10); head.translate(0, 0.25, 0.14);
  const bk = new THREE.ConeGeometry(0.03, 0.1, 8); bk.rotateX(Math.PI / 2); bk.translate(0, 0.245, 0.24);
  const tail = new THREE.BoxGeometry(0.1, 0.03, 0.14); tail.rotateX(-0.25); tail.translate(0, 0.15, -0.16);
  const wingL = new THREE.SphereGeometry(0.06, 8, 6); wingL.scale(0.42, 0.72, 1.75); wingL.translate(0.085, 0.14, -0.03);
  const wingR = new THREE.SphereGeometry(0.06, 8, 6); wingR.scale(0.42, 0.72, 1.75); wingR.translate(-0.085, 0.14, -0.03);
  const eyeL = new THREE.SphereGeometry(0.014, 6, 5); eyeL.translate(0.05, 0.265, 0.18);
  const eyeR = new THREE.SphereGeometry(0.014, 6, 5); eyeR.translate(-0.05, 0.265, 0.18);
  const legL = new THREE.CylinderGeometry(0.012, 0.012, 0.09, 6); legL.translate(0.03, 0.045, 0.02);
  const legR = new THREE.CylinderGeometry(0.012, 0.012, 0.09, 6); legR.translate(-0.03, 0.045, 0.02);
  // the LOOKOUT turns its head (head + beak + eyes only) before assembly
  if (lookout) for (const gg of [head, bk, eyeL, eyeR]) gg.rotateY(0.85);
  const parts = [paint(body, G_WHITE), paint(mantle, grey), paint(head, G_WHITE), paint(bk, G_BEAK),
    paint(tail, grey), paint(wingL, grey), paint(wingR, grey),
    paint(eyeL, G_EYE), paint(eyeR, G_EYE), paint(legL, G_LEG), paint(legR, G_LEG)];
  for (const g of parts) place(g, x, z, ry, s);
  return parts;
}

// ---------------------------- painted rocks ----------------------------
const ROCK_BARE = [0x9b948a, 0xb0a89b];
// DEEP paint, not pastel: the toon ramp washes a light hue toward the lawn's
// own value and the stones read as macarons (the 119 value-contrast law — a
// prop must differ from its ground in VALUE, not just hue).
const ROCK_PAINT = [0xd94f46, 0x1e9c8f, 0xe0a92e, 0x4f8fd6, 0xc75fa4];

// ---------------------------- micro-picks ------------------------------
function shellGeos(x, z, ry) {
  const shell = new THREE.ConeGeometry(0.17, 0.08, 9); shell.scale(1, 1, 0.62); shell.translate(0, 0.04, 0);
  const knob = new THREE.SphereGeometry(0.05, 7, 6); knob.scale(1, 0.6, 0.7); knob.translate(0, 0.025, -0.085);
  const parts = [paint(shell, 0xf2e3c8), paint(knob, 0xdca388)];
  for (const g of parts) place(g, x, z, ry);
  return parts;
}
function featherGeos(x, z, ry) {
  const vane = new THREE.SphereGeometry(0.09, 8, 6); vane.scale(0.5, 0.14, 2.6); vane.translate(0, 0.02, 0);
  const shaft = new THREE.BoxGeometry(0.014, 0.012, 0.46); shaft.translate(0, 0.022, -0.03);
  const parts = [paint(vane, 0xe8e9ea), paint(shaft, 0xcfd2d6)];
  for (const g of parts) place(g, x, z, ry);
  return parts;
}
// the 091 halo+core glint: a warm soft HALO plus a small near-white CORE —
// additive cream alone washes out over bright toon lawn/sand.
function glintAt(x, z) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([x, 0.34, z, x, 0.32, z]), 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array([1.0, 0.78, 0.42, 1.0, 0.95, 0.85]), 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array([0.85, 0.32]), 1));
  const pts = new THREE.Points(g, pointsMat());
  pts.name = 'td-glint';
  return pts;
}

onWorldReady(() => {
  const TD = CH.TRAIL_DISCOVERY;
  if (!TD) return;
  const byStretch = new Map();                       // stretch key -> painted geometry parts
  const push = (s, arr) => { const a = byStretch.get(s) || []; for (const g of arr) a.push(g); byStretch.set(s, a); };

  // ---- 1. plaques: woodwork merges per stretch, the face is its own mesh ----
  for (const p of TD.plaques) {
    push(p.s, plaqueWood(p));
    scene.add(plaqueFace(p));
    collide(p.x, p.z, 0.45);
    addInteraction({ x: p.x, z: p.z, r: 2.4, label: 'read the plaque',
      onUse: () => toast(p.title, p.sub) });
  }

  // ---- 2. gull huddles: loose jitter from the cluster's own seed ----
  for (const c of TD.gulls) {
    const rnd = m32(c.seed), spots = [];
    for (let i = 0; i < c.n; i++) {
      let ox = (rnd() - 0.5) * 2.6, oz = (rnd() - 0.5) * 2.6;
      // nudge apart if a bird landed inside a neighbour (min 0.55 m). Bounded
      // relaxation — never a while(true), and it draws NO extra rng.
      for (let pass = 0; pass < 6; pass++) {
        let moved = false;
        for (const sp of spots) {
          let dx = ox - sp[0], dz = oz - sp[1], d = Math.hypot(dx, dz);
          if (d >= 0.55) continue;
          if (d < 1e-4) { dx = 0.55; dz = 0; d = 0.55; }
          ox = sp[0] + dx / d * 0.55; oz = sp[1] + dz / d * 0.55; moved = true;
        }
        if (!moved) break;
      }
      spots.push([ox, oz]);
      const ry = c.ry + (rnd() - 0.5) * 1.1;
      const juvenile = i === 1, lookout = i === c.n - 1 && c.n > 1;
      push(c.s, gullGeos(c.x + ox, c.z + oz, ry, juvenile ? 1.25 : 1.55, juvenile, lookout));
    }
  }

  // ---- 3. painted kindness rocks ----
  for (const c of TD.rocks) {
    const rnd = m32(c.seed);
    for (let i = 0; i < c.n; i++) {
      const ox = (rnd() - 0.5) * 1.5, oz = (rnd() - 0.5) * 1.5;
      const rad = 0.13 + rnd() * 0.09, sz = 0.8 + rnd() * 0.25, ry = rnd() * 6.28;
      const pick = rnd();
      const bare = (i === 0 || i === 3);
      const hex = bare ? ROCK_BARE[i === 0 ? 0 : 1] : ROCK_PAINT[Math.min(ROCK_PAINT.length - 1, Math.floor(pick * ROCK_PAINT.length))];
      const g = new THREE.SphereGeometry(rad, 9, 7);
      g.scale(1, 0.78, sz);                          // DOMED, not a disc — a flatter
      g.translate(0, rad * 0.78 * 0.45, 0);          // squash + deep sink read as coins
      // ~30% sunk: two thirds of the dome stands proud of the grass. The tighter
      // 1.5 m spread keeps the taller stones reading as ONE cluster. Same six
      // rnd() draws per stone as before — constants only, rng order untouched.
      push(c.s, [place(paint(g, hex), c.x + ox, c.z + oz, ry)]);
    }
  }

  // ---- 4. one merged vertex-colored static per stretch (fogcull locality) ----
  for (const [key, parts] of byStretch) {
    if (!parts.length) continue;
    const mesh = merged(parts);
    mesh.name = 'td-' + key;                          // frustumCulled stays TRUE (fogcull relies on it)
    scene.add(mesh);
  }

  // ---- 5. micro-picks: own tiny mesh + own glint, so pocketing hides them ----
  for (let i = 0; i < TD.picks.length; i++) {
    const p = TD.picks[i], shell = p.kind === 'shell';
    const geos = shell ? shellGeos(p.x, p.z, 0.9 + i) : featherGeos(p.x, p.z, 0.7 * i);
    const mesh = merged(geos);
    mesh.name = 'td-pick-' + i;
    scene.add(mesh);
    const glint = glintAt(p.x, p.z);
    scene.add(glint);
    let taken = false;
    const h = addInteraction({ x: p.x, z: p.z, r: 2.2, label: 'pocket the ' + p.kind,
      onUse: () => {
        if (taken) return; taken = true;
        mesh.visible = false; glint.visible = false;   // hidden for THIS session (respawns next load)
        h.remove();
        wallet.pay({ key: 'trailfind', first: 3, repeat: 1,
          reason: shell ? 'beachcombed a shell' : 'found a gull feather',
          label: 'trail finds', cd: 6 });
        toast(shell ? 'a perfect little shell' : 'a gull feather',
              shell ? 'lake-tumbled. pocketed.' : 'flight-worthy. probably.');
        pocketTick();
      } });
  }

  // ---- 6. sit spots for the three 121 benches (props.js builds the benches) ----
  for (const s of TD.sits) addSitSpot({ x: s.x, z: s.z, ry: s.ry, y: 0, r: 2.0, label: s.label });
});

// a soft pocket tick — synth only, and actx is NULL until the player clicks
// start (constraint 4), so always guard (the sea-glass pattern).
function pocketTick() {
  const a = getAudioCtx(); if (!a || !a.actx) return;
  const { actx, sfxBus } = a, dest = sfxBus || actx.destination, now = actx.currentTime;
  [1650, 2400].forEach((f, i) => {
    const o = actx.createOscillator(), g = actx.createGain(), t0 = now + i * 0.025;
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.03, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.18);
    o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + 0.22);
  });
}
