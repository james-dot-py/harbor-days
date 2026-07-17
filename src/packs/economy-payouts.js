// =====================================================================
//  ECONOMY PAYOUTS (task 079) — the dibs no content pack can own
//
//  Three of the game's delights don't live in a pack: they're driven by
//  main.js physics or by the framework's own bookkeeping. Rather than smear
//  wallet calls across those shared files, they're paid here, from one pack
//  that only WATCHES state:
//    * zone first-discovery — framework.js's scan fills state.zonesVisited
//    * the fireworks finale — main.js/fx.js own the rockets; state counts them
//    * the jetski           — main.js owns jsk / state.onWater
//
//  Everything here is pure state: no rng (determinism), no meshes, no draw
//  calls, no allocation on the idle path. Rates per ECONOMY.md.
// =====================================================================
import { onWorldReady, registerUpdate, wallet, state } from '../framework.js';

onWorldReady(player => {
  // ---- zone first-discovery ------------------------------------------
  // 11 zones x +3 = the wanderer's trickle: found by walking, never by
  // grinding. pay()'s key is per-zone and paidFirsts persists, so a zone
  // found last session can never pay again (repeat:0 makes it silent, not
  // a +1). We seed `paid` from the restored set so a save that predates
  // this task doesn't dump ~30 dibs of back-pay in one register burst on
  // boot — zones you'd already found stay found, quietly.
  const paid = new Set(state.zonesVisited);
  let zN = state.zonesVisited.size;

  // ---- the fireworks finale -------------------------------------------
  // One rocket is a firework. Three inside four seconds is a FINALE — the
  // moment you realise you're putting on a show. Pay the third one's bloom.
  let fN = state.fireworksLaunched || 0, burst = 0, burstT = -1e9;

  // ---- the jetski ------------------------------------------------------
  // main.js flips state.onWater when you cross into open water. The first
  // ride pays the surprise; distance pays the horizon, every 300 m out.
  let wasWater = false, rideM = 0, lastX = 0, lastZ = 0;

  registerUpdate((dt, t, pl) => {
    // zones: size is O(1), so the set is only walked on the rare frame a new
    // zone actually lands (framework's scan adds at most one per 0.5 s).
    if (state.zonesVisited.size !== zN) {
      zN = state.zonesVisited.size;
      for (const n of state.zonesVisited) {
        if (paid.has(n)) continue;
        paid.add(n);
        wallet.pay({ key: 'zone.' + n, first: 3, repeat: 0, reason: 'found ' + n, label: 'wandering' });
      }
    }

    // fireworks: rising edge of the launch count (framework owns the count,
    // including the frame-0 negative-dt guard — we only read differences).
    const n = state.fireworksLaunched || 0;
    if (n > fN) {
      fN = n;
      burst = (t - burstT < 4) ? burst + 1 : 1; burstT = t;
      if (burst >= 3) {
        burst = 0;
        wallet.pay({ key: 'fireworks', first: 6, repeat: 2, reason: 'fireworks: the finale',
          firstReason: 'a proper finale!', label: 'fireworks', cd: 8 });
      }
    }

    // jetski: rising edge = a ride; then odometer while you're out there.
    const w = !!state.onWater;
    if (w && !wasWater) {
      rideM = 0;
      wallet.pay({ key: 'jetski.ride', first: 6, repeat: 2, reason: 'jetski: out on the lake',
        firstReason: 'you found the jetski!', label: 'jetski', cd: 20 });
    }
    if (w) {
      // seed the odometer on the rising edge (wasWater is still last frame's
      // value here) so the mount never books a giant first delta.
      if (wasWater) rideM += Math.hypot(pl.x - lastX, pl.z - lastZ);
      lastX = pl.x; lastZ = pl.z;
      if (rideM >= 300) {
        rideM = 0;
        wallet.pay({ key: 'jetski.dist', first: 5, repeat: 2, reason: 'jetski: went the distance', label: 'jetski' });
      }
    }
    wasWater = w;
  });
});
