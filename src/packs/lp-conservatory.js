// =====================================================================
//  PACK: lp-conservatory — task 122, the LINCOLN PARK CONSERVATORY's
//  LIVING layer. structures.js builds the PLACE from LP_CONSERVATORY
//  (the ogee glasshouse, the glass pyramid vestibule + its static FREE
//  ADMISSION door glow, the formal garden, the Eli Bates fountain and
//  its static spray plume, Grandmother's Garden); props.js grows the
//  beds. THIS pack owns what MOVES and what the player can feel:
//    * THE GARDEN CELL — a definePlace room over the formal garden
//      (x −84..−56, z 700..738). A SUBTLE grade only: the fog pulls a
//      touch closer/softer and the ambience goes hushed + birdier
//      (ext 0.7 / bird 1.4) — a walled garden hush, not a new biome.
//      One toast on the first entry of a session.
//    * BATES MIST — soft white-teal puffs off the fountain plume top,
//      spawned into the SHARED DUST particle pool (+0 draw calls, no
//      mesh, no bucket). ~3-5 puffs every 0.25 s inside 60 m, halved
//      when prefersCalm(); they drift up-and-out and fade.
//    * THE BURBLE — a quiet looped water bed: noise -> ~900 Hz bandpass
//      -> a slow LFO'd gain -> a master gain, built ONCE and LAZILY
//      (never a node until actx is live AND the player is first inside
//      18 m), then only ever ridden on a ~0.35 s throttle with
//      setTargetAtTime. Silent (and parked exactly once) past 18 m.
//    * THE DOORS — an addInteraction at the vestibule threshold: a
//      warm-palm-air toast + a soft two-note chime. NO walkable
//      interior (the 111-plan decision: door glow only), and NO glint
//      of our own — the 091 affordance system handles that.
//  Culling: this pack adds ZERO meshes, so there is nothing to hide;
//  instead every frame's work is gated by ONE squared-distance test to
//  the fountain — past 60 m the update does two subtractions, parks the
//  audio if needed, and returns.
//  Determinism: NO shared rng — every placement is a literal constant.
//  Math.random appears only for runtime jitter/timers (the runtime-rand
//  rule). No per-frame allocation; every audio access guarded on actx.
//  DEBUG: window.__hd.conservatory() -> {d, mist, burble, actx}.
// =====================================================================
import { onWorldReady, registerUpdate, addInteraction, definePlace, toast, getAudioCtx, prefersCalm } from '../framework.js';
import { DUST } from '../fx.js';
import * as CH from '../data/chicago.js';

// ---- the two anchors this pack lives off (literals derived from data) ----
const MIST_R = 60, MIST_R2 = MIST_R * MIST_R;   // mist / update gate
const BURBLE_R = 18;                            // audible radius of the basin
const MIST_EVERY = 0.25;                        // spawn tick (s)
const BURBLE_CAP = 0.12, BURBLE_CAP_CALM = 0.055;

onWorldReady(() => {
  const C = CH.LP_CONSERVATORY, B = C.batesFountain, V = C.vestibule;
  const FX_X = B.x, FX_Z = B.z;                 // (-70, 726)
  const calm = prefersCalm;

  // ---- (1) THE GARDEN CELL ---------------------------------------------
  // Cheap rect containment (called ~5 Hz by the framework) over the formal
  // garden + the vestibule forecourt. The grade is deliberately near the
  // world default — a hush, not a biome (cf. ZOO.place.grade, which is a
  // full room; this one is half its strength in every axis).
  let welcomed = false;
  definePlace({
    name: 'Conservatory Gardens',
    contains: (x, z) => x >= -84 && x <= -56 && z >= 700 && z <= 738,
    fadeS: 2.0,
    grade: { fogNear: 34, fogFar: 190, ambI: 0.95 },
    amb: { ext: 0.7, bird: 1.4 },
    onEnter() {
      if (!welcomed) { welcomed = true; toast('the conservatory', 'free admission — always has been'); }
    },
  });

  // ---- (2) THE BURBLE (lazy, guarded, throttled) ------------------------
  // Cached at build of the node graph; the hot path never calls getAudioCtx()
  // (it allocates its return object) — only the 0.35 s throttle does.
  let actx = null, burbleG = null, burbleTarget = 0;
  function buildBurble(A) {
    const ax = A.actx;
    if (!ax || !A.noiseBuf || !A.sfxBus) return;        // retry on the next tick
    const t0 = ax.currentTime;
    const src = ax.createBufferSource(); src.buffer = A.noiseBuf; src.loop = true;
    const bp = ax.createBiquadFilter();                 // the wet band of falling water
    bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.75;
    const hp = ax.createBiquadFilter();                 // shave the rumble so it sits UNDER the birds
    hp.type = 'highpass'; hp.frequency.value = 420;
    const mod = ax.createGain(); mod.gain.value = 1;    // slow swell — the plume breathing
    const lfo = ax.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.17;
    const lfoD = ax.createGain(); lfoD.gain.value = 0.32;
    lfo.connect(lfoD); lfoD.connect(mod.gain);
    const m = ax.createGain(); m.gain.value = 0;        // silent until the throttle ramps it
    src.connect(bp); bp.connect(hp); hp.connect(mod); mod.connect(m); m.connect(A.sfxBus);
    src.start(t0); lfo.start(t0);
    actx = ax; burbleG = m;
  }

  // ---- a soft two-note chime (event-driven, guarded) --------------------
  function chime(f, delay, vol) {
    const A = getAudioCtx(); const ax = A.actx; if (!ax || !A.sfxBus) return;
    const t0 = ax.currentTime + delay;
    const o = ax.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const g = ax.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.75);
    o.connect(g); g.connect(A.sfxBus);
    o.start(t0); o.stop(t0 + 0.78);
  }

  // ---- (3) THE DOORS — peek inside (no walkable interior) ---------------
  // The 091 affordance system auto-glints this anchor; we add none.
  addInteraction({
    x: V.x, z: V.z + 4, r: 2.6, label: 'peek inside',
    onUse() {
      toast('warm palm air drifts out', 'ferns, orchids, a koi pool — free admission');
      const v = calm() ? 0.035 : 0.06;
      chime(659.25, 0, v);          // E5
      chime(987.77, 0.16, v * 0.8); // B5 — a soft open fifth, door-chime warm
    },
  });

  // ---- (4) per frame: ONE gate, then mist + burble ----------------------
  let mistT = 0, burbleT = 0, dbgOnce = false, lastD = 999;
  registerUpdate((dt, t, pl) => {
    if (!dbgOnce) {                                     // main.js assigns window.__hd wholesale at load
      dbgOnce = true;
      try {
        window.__hd = window.__hd || {};
        window.__hd.conservatory = () => ({ d: lastD, mist: lastD < MIST_R, burble: burbleTarget, actx: !!actx });
      } catch (e) { /* sandboxed window — the pack still runs */ }
    }

    const dx = pl.x - FX_X, dz = pl.z - FX_Z, d2 = dx * dx + dz * dz;
    if (d2 >= MIST_R2) {                                // FAR: park the bed once, zero work
      lastD = Math.sqrt(d2);
      if (burbleG && burbleTarget !== 0) { burbleG.gain.setTargetAtTime(0, actx.currentTime, 0.4); burbleTarget = 0; }
      mistT = 0; burbleT = 0;
      return;
    }
    const d = Math.sqrt(d2);
    lastD = d;
    const cm = calm();

    // -- MIST: soft white-teal puffs off the plume top (shared DUST pool) --
    mistT -= dt;
    if (mistT <= 0) {
      mistT = MIST_EVERY;
      const n = cm ? 2 : 3 + (Math.random() * 3 | 0);    // 3-5 puffs, halved when calm
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * 0.5;
        const sp = 0.16 + Math.random() * 0.22;          // slow outward drift
        DUST.spawn(
          FX_X + Math.cos(a) * r, 1.8 + Math.random() * 0.8, FX_Z + Math.sin(a) * r,
          Math.cos(a) * sp, 0.30 + Math.random() * 0.28, Math.sin(a) * sp,
          0.80, 0.95, 0.92,                              // white-teal
          1.5 + Math.random() * 0.9,                     // life
          2.6 + Math.random() * 1.2,                     // size
          0.10, 0.55);                                   // barely-falling, draggy = it hangs
      }
    }

    // -- BURBLE: build on the first in-range tick, then ride 1-(d/18) ------
    burbleT -= dt;
    if (burbleT <= 0) {
      burbleT = 0.35;
      const near = d < BURBLE_R;
      if (near && !burbleG) buildBurble(getAudioCtx());  // never on the hot path
      if (burbleG && actx) {
        const u = near ? 1 - d / BURBLE_R : 0;
        burbleTarget = u * (cm ? BURBLE_CAP_CALM : BURBLE_CAP);
        burbleG.gain.setTargetAtTime(burbleTarget, actx.currentTime, 0.35);
      }
    }
  });
});
