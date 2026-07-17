// =====================================================================
//  PACK: sea-glass — BEACHCOMBING (task 080). Glinting sea-glass spots on
//  the two sand beaches: FOUND, never sold. Six FIXED spots (three on the
//  dog-beach cove sand near the kiosk, three on Montrose Beach's sand north
//  of the roped plover dune), four colors. Pocket one → dibs + a journal
//  page; the colors you've found PERSIST (state.seaGlass, whitelisted by the
//  framework save). Completing all four needs the trip north — the RARE
//  cobalt blue only washes up at Montrose.
//
//  Determinism: FIXED coords, ZERO world rng (rng/rand) and ZERO Math.random —
//  the glint pulse rides game time. Per spot: one flattened low-poly glass lump
//  (toon color, frustum-culled Mesh) + one additive glowTex glint sprite so it
//  catches the eye at beach-walking distance. ~12 small frustum-culled draws
//  worst case; the beaches have headroom. NO new walkable surfaces, NO walkprobe
//  changes (the beaches are already walkable — these are props ON the sand), NO
//  colliders (glass is tiny, nothing to trap on). A soft glassy tink on pocket
//  is synth-only + actx-guarded. Storage only via bag/wallet + the state
//  whitelist. UI is entirely the framework tote/journal.
//
//  Only-my-file rules honoured: this module + ONE import line in index.js.
// =====================================================================
import * as THREE from 'three';
import { onWorldReady, registerUpdate, addInteraction, toast, journalSection,
         bag, wallet, state, getAudioCtx } from '../framework.js';
import { scene, toon, glowTex } from '../core.js';
import { beachH } from '../coast.js';

// four colors — the ids in state.seaGlass PERSIST (stable strings, never coords).
const COLORS = {
  green: { hex: 0x7fbf9e, name: 'green',         flavor: 'bottle green — tumbled smooth.' },
  brown: { hex: 0x9c6f3f, name: 'brown',         flavor: 'root-beer brown, an old bottle.' },
  white: { hex: 0xdfe8e6, name: 'frosted white', flavor: 'frosted — milk-white and soft.' },
  blue:  { hex: 0x3b5fa0, name: 'cobalt blue',   flavor: 'the rare one. cobalt.' },
};
const ORDER = ['green', 'brown', 'white', 'blue'];   // fixed journal order

// SIX fixed spots — all verified beachH!==null (on sand) and NONE inside the
// roped plover dune (x 210-233, z -926..-978), in node, in
// tools/tmp-080-seaglass-verify.mjs. Dog-beach cove (near the kiosk 100,-353):
// green, brown, frosted white. Montrose Beach sand, NORTH of the dune: green,
// frosted white, and the RARE cobalt BLUE (so all four needs the trip north).
const SPOTS = [
  { x: 94,  z: -339,  color: 'green' },   // dog beach
  { x: 100, z: -337,  color: 'brown' },   // dog beach
  { x: 107, z: -339,  color: 'white' },   // dog beach
  { x: 216, z: -994, color: 'green' },   // Montrose
  { x: 222, z: -1008, color: 'white' },   // Montrose
  { x: 212, z: -1032, color: 'blue'  },   // Montrose (rare)
];

const hex6 = h => '#' + h.toString(16).padStart(6, '0');

onWorldReady(() => {
  // per-COLOR additive glint materials — the glint carries the GLASS's color
  // (a generic cream dot vanished on the pale sand, and the frosted-white lump
  // was white-on-white by construction; the first verify shots showed NOTHING
  // readable at 8 m). 4 materials, opacity pulsed per frame below.
  const glintMats = {};
  for (const id of ORDER) {
    const c = COLORS[id];
    glintMats[id] = new THREE.SpriteMaterial({ map: glowTex,
      color: id === 'white' ? 0xcfe8ff : c.hex,        // frosted glints ice-blue, never white-on-white
      transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
  }
  // shared flat-lump geometry; per-color toon() material is cached in core.js.
  const lumpGeo = new THREE.IcosahedronGeometry(0.13, 0);

  const live = [];   // {x,z,color,lump,glint,phase,active}

  for (let i = 0; i < SPOTS.length; i++) {
    const s = SPOTS[i], col = COLORS[s.color];
    const gy = beachH(s.x, s.z);                       // on sand (verified !== null)
    const y = (gy == null ? 0 : gy) + 0.03;            // just above the sand
    // polished glass lump — flattened low-poly, toon(color)
    const lump = new THREE.Mesh(lumpGeo, toon(col.hex));
    lump.scale.set(1, 0.5, 1);
    lump.position.set(s.x, y, s.z);
    lump.rotation.y = i * 1.3;                         // fixed per-index tilt (no rng)
    scene.add(lump);
    // glint — a color-of-the-glass additive sprite just above, pulsed per spot
    const glint = new THREE.Sprite(glintMats[s.color]);
    glint.scale.set(1.15, 1.15, 1);
    glint.position.set(s.x, y + 0.34, s.z);
    scene.add(glint);
    const spot = { x: s.x, z: s.z, color: s.color, lump, glint, phase: i * 1.1, active: true };
    live.push(spot);
    // pocket interaction — NO collider (glass is tiny). r 1.7 + the framework's
    // grace margin. The handle is disabled once this spot is pocketed this session.
    const inter = addInteraction({ x: s.x, z: s.z, r: 1.7, label: 'pocket the sea glass',
      onUse: () => pocket(spot, inter) });
  }

  function pocket(spot, inter) {
    if (!spot.active) return;
    spot.active = false;
    spot.lump.visible = false; spot.glint.visible = false;   // hidden for THIS session (respawns next load)
    inter.enabled = false;
    const col = COLORS[spot.color];
    state.seaGlass = state.seaGlass || new Set();
    state.seaGlass.add(spot.color);                          // whitelisted by the framework snapshot
    bag.add('sea-glass');                                    // count = total pieces pocketed (persists)
    wallet.pay({ key: 'seaglass', first: 5, repeat: 2, reason: 'lake glass, pocketed',
      firstReason: 'sea glass!', label: 'beachcombing' });
    toast('sea glass — ' + col.name, col.flavor);
    glassTink();
  }

  // glint pulse — per-SPOT sprite scale + per-COLOR material opacity, phase-
  // offset so the beach twinkles instead of blinking in lockstep. Skipped
  // entirely when the player is >80 m from every active glint. No alloc.
  registerUpdate((dt, t, pl) => {
    let near2 = Infinity;
    for (let i = 0; i < live.length; i++) {
      const s = live[i]; if (!s.active) continue;
      const dx = pl.x - s.x, dz = pl.z - s.z, d2 = dx * dx + dz * dz;
      if (d2 < near2) near2 = d2;
    }
    if (near2 > 80 * 80) return;                            // every glint far/culled — nothing to pulse
    for (let i = 0; i < live.length; i++) {
      const s = live[i]; if (!s.active) continue;
      const p = 0.5 + 0.5 * Math.sin(t * 3.2 + s.phase);    // 0..1, per-spot phase
      const sc = 0.85 + 0.55 * p;
      s.glint.scale.set(sc, sc, 1);
      s.glint.material.opacity = 0.45 + 0.5 * p;
    }
  });

  // bag page — a found collectible; tapping it toasts colors found n/4.
  bag.define({ id: 'sea-glass', name: 'sea glass', icon: '💠', kind: 'collectible',
    caption: 'the lake polishes its own',
    onUse() {
      const n = state.seaGlass ? state.seaGlass.size : 0;
      toast('sea glass', n + ' of ' + ORDER.length + ' colors found');
    } });

  // journal page — registered EAGERLY (fixed slot), renders '' until the first
  // piece (the framework hides an empty render's header, like the dibs section).
  journalSection('seaglass', 'Sea glass 💠', () => {
    const found = state.seaGlass;
    if (!found || !found.size) return '';
    let rows = '';
    for (const id of ORDER) {
      if (!found.has(id)) continue;
      const c = COLORS[id];
      rows += `<div class="jrow"><span><span style="display:inline-block;width:11px;height:11px;`
        + `border-radius:50%;background:${hex6(c.hex)};vertical-align:-1px;margin-right:7px"></span>`
        + `${c.name}</span><b>✓</b></div>`;
    }
    const n = bag.count('sea-glass');
    return rows + `<div class="jrow"><span>Pocketed</span><b>${n} piece${n === 1 ? '' : 's'}</b></div>`;
  });

  // a soft glassy tink on pocket — two quick high sines, quiet. actx is null
  // until the player clicks start (constraint 4) — always guard.
  function glassTink() {
    const a = getAudioCtx(); if (!a || !a.actx) return;
    const { actx, sfxBus } = a, dest = sfxBus || actx.destination, now = actx.currentTime;
    [2100, 3150].forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), t0 = now + i * 0.02;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.035, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.22);
      o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + 0.26);
    });
  }
});
