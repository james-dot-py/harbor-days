// qr.js — draw the precomputed Ko-fi QR onto a 2D canvas (task 011).
// Pulls ONLY the offline-generated module matrix (src/data/kofi-qr.js) — the
// game ships no runtime QR dependency. Used by both diegetic placements: the
// Waveland rooftop billboard (packs/kofi.js) and the L-car ad card
// (packs/wrigley-ride.js), so the exact same modules render in both.
import { KOFI_URL, QR } from './data/kofi-qr.js';

export { KOFI_URL };
export const QR_MODULES = QR.size;              // 29 (version 3)

// Draw the QR at integer pixel origin (ox,oy) with an integer module size and a
// proper light quiet zone (default 4 modules, the spec minimum). Keep ox/oy/mod
// integers so every module edge lands on a pixel boundary → crisp for jsQR.
// Returns the full drawn side length in px so callers can lay text out beside it.
export function drawQR(g, ox, oy, mod, { dark = '#111111', light = '#ffffff', quiet = 4 } = {}) {
  const n = QR.size, side = (n + quiet * 2) * mod;
  g.fillStyle = light; g.fillRect(ox, oy, side, side);          // quiet zone + field
  g.fillStyle = dark;
  for (let y = 0; y < n; y++) {
    const row = QR.rows[y];
    for (let x = 0; x < n; x++) {
      if (row[x] === '1') g.fillRect(ox + (quiet + x) * mod, oy + (quiet + y) * mod, mod, mod);
    }
  }
  return side;
}
