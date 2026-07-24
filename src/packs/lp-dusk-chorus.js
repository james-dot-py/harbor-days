// =====================================================================
//  PACK: lp-dusk-chorus — task 118, the SOUTH POND DUSK CHORUS. A pure
//  AUDIO delight: the restored-wetland-at-dusk soundscape in the middle
//  of the city. ZERO meshes, ZERO draw calls, no world rng, no storage.
//
//  Two synthesized layers, both scaled by ONE "nearness" number (a
//  smoothstep from 0 at 90 m to 1 at 28 m of the pond centre −30,952):
//    * CRICKET BED — a continuous quiet bed. Looped noise -> a tight
//      ~4.5 kHz bandpass (the thin stridulation band) -> a modulation
//      gain that carries BOTH a fast ~13.5 Hz chirp flutter and a slow
//      ~0.085 Hz shimmer (two LFOs summed into the same AudioParam, so
//      the chorus breathes) -> a master gain -> sfxBus. Built ONCE and
//      LAZILY — not one persistent node exists until the player is
//      actually near AND actx is live. The master gain is only ever
//      driven on a ~0.4 s throttle with setTargetAtTime (never per
//      frame, never allocating).
//    * SPRING PEEPERS — a sparse 1.2–3.5 s jittered timer fires a short
//      "preep": a sine blip rising into ~2.6–3.1 kHz over 0.12 s with a
//      fast decay, its own short-lived gain -> sfxBus. Event-driven
//      nodes (started + stopped), which is standard, NOT hot-path
//      allocation. Sometimes a second voice overlaps for a chorus feel.
//
//  Far away (>90 m) the update does two subtractions and returns; the
//  master is parked at 0 exactly once on the way out. prefersCalm()
//  halves both volumes and slows the peepers; prefersLowPower() drops
//  the chorus overlap to a single voice. getAudioCtx() allocates its
//  return object, so the hot path NEVER calls it — actx/master are
//  cached at build time; only the 0.4 s tick and the peep events do.
//  DEBUG: window.__hd.duskChorus() -> {near, gain, actx}.
// =====================================================================
import { onWorldReady, registerUpdate, getAudioCtx, prefersCalm, prefersLowPower } from '../framework.js';
import * as CH from '../data/chicago.js';

// nearness ramp: silent at/past FAR, full inside NEAR (smoothstepped)
const FAR = 90, NEAR = 28;
const FAR2 = FAR * FAR;

// bed levels — the master peak stays in the 0.03–0.05 "barely there" window;
// the pre-master MOD stage carries the make-up for the narrow noise band.
const BED_PEAK = 0.042;          // master gain at nearness 1 (halved when calm)
const MOD_FLOOR = 1.5, CHIRP_DEPTH = 0.9, SHIM_DEPTH = 0.45;

onWorldReady(() => {
  const C = CH.LP_SOUTHPOND.cull;                 // {x:-30, z:952, r:150}
  const CX = C.x, CZ = C.z;
  const calm = prefersCalm, low = prefersLowPower;

  // ---- cached live nodes (null until the first NEAR frame with audio) ----
  let actx = null, master = null;
  let near = 0, gTarget = 0;                      // probe state
  let gainT = 0, peepT = 1.0 + Math.random() * 1.5;
  let dbgOnce = false;

  // ---- (1) the cricket bed — built ONCE, lazily, never before it's due ----
  function buildBed(A) {
    const ax = A.actx;
    if (!ax || !A.noiseBuf || !A.sfxBus) return;  // retry on the next tick
    const t0 = ax.currentTime;
    const src = ax.createBufferSource(); src.buffer = A.noiseBuf; src.loop = true;
    // one tight band = the thin dry cricket register (a second pass would
    // starve it; Q 7 already leaves ~640 Hz of the noise floor)
    const bp = ax.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 4500; bp.Q.value = 7;
    // the amplitude modulator: floor + fast chirp flutter + slow shimmer
    const mod = ax.createGain(); mod.gain.value = MOD_FLOOR;
    const chirp = ax.createOscillator(); chirp.type = 'sine'; chirp.frequency.value = 13.5;
    const chirpD = ax.createGain(); chirpD.gain.value = CHIRP_DEPTH;
    chirp.connect(chirpD); chirpD.connect(mod.gain);
    const shim = ax.createOscillator(); shim.type = 'sine'; shim.frequency.value = 0.085;
    const shimD = ax.createGain(); shimD.gain.value = SHIM_DEPTH;
    shim.connect(shimD); shimD.connect(mod.gain);      // both LFOs sum into the one param
    const m = ax.createGain(); m.gain.value = 0;       // silent until the throttle ramps it
    src.connect(bp); bp.connect(mod); mod.connect(m); m.connect(A.sfxBus);
    src.start(t0); chirp.start(t0); shim.start(t0);
    actx = ax; master = m;
  }

  // ---- (2) ONE spring-peeper "preep" (event-driven, guarded) ----
  // A sine blip sliding UP into ~2.6–3.1 kHz over ~0.12 s, fast decay.
  function preep(vol, delay) {
    const A = getAudioCtx(); const ax = A.actx; if (!ax || !A.sfxBus) return;
    const t0 = ax.currentTime + delay;
    const f = 2600 + Math.random() * 500;              // pitch jitter, voice to voice
    const o = ax.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f * 0.82, t0);
    o.frequency.exponentialRampToValueAtTime(f, t0 + 0.12);
    const g = ax.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.035);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.20);
    o.connect(g); g.connect(A.sfxBus);
    o.start(t0); o.stop(t0 + 0.22);
  }

  // ---- (3) per frame: nearness gate, throttled bed level, peeper timer ----
  registerUpdate((dt, t, pl) => {
    // debug probe, installed once from the update loop (main.js assigns
    // window.__hd wholesale at load, so it can't be set at world-ready)
    if (!dbgOnce) {
      dbgOnce = true;
      try {
        window.__hd = window.__hd || {};
        window.__hd.duskChorus = () => ({ near, gain: gTarget, actx: !!actx });
      } catch (e) { /* sandboxed window — the pack still runs */ }
    }

    const dx = pl.x - CX, dz = pl.z - CZ, d2 = dx * dx + dz * dz;
    if (d2 >= FAR2) {                                  // FAR: silence + zero work
      near = 0;
      if (master && gTarget !== 0) {                   // park the bed exactly once
        master.gain.setTargetAtTime(0, actx.currentTime, 0.5);
        gTarget = 0;
      }
      gainT = 0;                                       // re-arm: ramp up on re-entry
      return;
    }

    // smoothstep 0 @ FAR -> 1 @ NEAR
    let u = (FAR - Math.sqrt(d2)) / (FAR - NEAR);
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    near = u * u * (3 - 2 * u);
    const cm = calm();

    // -- bed: build on the first near tick, then ride nearness (~0.4 s) --
    gainT -= dt;
    if (gainT <= 0) {
      gainT = 0.4;
      if (!master) buildBed(getAudioCtx());             // only ever called off the hot path
      if (master && actx) {
        gTarget = near * (cm ? BED_PEAK * 0.5 : BED_PEAK);
        master.gain.setTargetAtTime(gTarget, actx.currentTime, 0.45);
      }
    }

    // -- peepers: sparse, jittered, sometimes doubled --
    peepT -= dt;
    if (peepT <= 0) {
      peepT = (1.2 + Math.random() * 2.3) * (cm ? 1.8 : 1);
      const vol = near * (cm ? 0.025 : 0.05);
      preep(vol, 0);
      // an overlapping second voice reads as a chorus (single voice on low power)
      if (!low() && Math.random() < 0.3) preep(vol * (0.55 + Math.random() * 0.35), 0.08 + Math.random() * 0.22);
    }
  });
});
