// =====================================================================
//  PACK: ripples — task 127. TEN THOUSAND RIPPLES (Indira Freitas
//  Johnson): a single quiet toast the first time the player nears the
//  half-sunk heads on the Diversey lawn. The real installation carries
//  no signage — reverence means restraint: one line, once a session,
//  nothing else. Play-gated (the 087 idle law): OFF under ?play=1 so
//  waypoint shots stay deterministic; ?ripples=1 forces, ?ripples=0
//  suppresses. Zero meshes, zero rng, zero storage, zero audio.
// =====================================================================
import { onWorldReady, registerUpdate, toast } from '../framework.js';
import * as CH from '../data/chicago.js';

const q = new URLSearchParams(location.search);
const force = q.get('ripples');
const ENABLED = force === '0' ? false : (q.get('play') === '1' ? force === '1' : true);

let shown = false, acc = 0;

onWorldReady(player => {
  if (!ENABLED) return;
  const T = CH.LP_RIPPLES.toast, r2 = T.r * T.r;
  registerUpdate(dt => {
    if (shown) return;
    acc += dt; if (acc < 0.5) return; acc = 0;          // 2 Hz check, no per-frame work
    const dx = player.x - T.x, dz = player.z - T.z;
    if (dx * dx + dz * dz < r2) { shown = true; toast(T.main, T.sub); }
  });
});
