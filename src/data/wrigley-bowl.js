// =====================================================================
// WRIGLEY BOWL — the stadium INTERIOR pocket cell (task 055).
// Pure data + pure walk functions. NO THREE imports — tools/walkprobe.mjs
// imports this file directly, so the engine and the probe share ONE
// walkability definition (no mirror drift). Issue-017 class rules apply:
// walkableB answers definitively EVERYWHERE inside CLAMP_B — a hole is
// BLOCKED, never water (main.js isWater() is already cell-guarded).
//
// FRAME: the whole footprint is the Wrigleyville stadium poly displaced
// z −420 (a pocket set, the redline-car pattern) — exterior agreement is
// BY CONSTRUCTION: same poly, same HP→CF axis, same scoreboard bearing.
// The displacement keeps every bowl point ≥180 m from all scene-level
// pack content (NPC cull 145 m, fog bubble ~220 m) so nothing leaks in.
//
// RADIAL MODEL about home plate (θ = atan2(x−HP.x, z−HP.z)):
//   r < rWall−3          GRASS   — the owner's chase trigger ("the grass")
//   rWall−3 … rWall      TRACK   — warning track, walkable, SAFE (ships the
//                                  Gallagher teaser's 'walk the warning track')
//   rWall … rWall+0.8    WALL    — blocked (ivy in the outfield, brick down
//                                  the lines) EXCEPT three FIELD GATES
//   rWall+0.8 … rSeat0   CONCOURSE — the walkable ring (y 0), |s|≤S_CONC
//   rSeat0 … +8×1.4      SEATS   — walkable only in two climbable wedges,
//                                  surfaceY steps 0.62/row (grounded lerp
//                                  climbs; >0.5 drop falls — bleacher feel)
// s = wrap(θ − BACK) — signed angle from the behind-home direction.
// rWall(θ) comes from a 256-entry LUT: min(target curve, polyRadius−2.2),
// so the wall can NEVER poke through the enclosure (short RF happens by
// construction, matching the exterior's short-RF foul pole).
// =====================================================================
import { STADIUM_W } from './wrigleyville.js';

export const CELL_ID_B = 'wrigley-bowl';
export const BOWL_OFF = { x: 0, z: -420 };            // pocket displacement

export const POLY_B = STADIUM_W.poly.map(([x, z]) => [x, z + BOWL_OFF.z]);
export const HP_B = [STADIUM_W.homePlate[0], STADIUM_W.homePlate[1] + BOWL_OFF.z];
export const CF_B = [STADIUM_W.centerField[0], STADIUM_W.centerField[1] + BOWL_OFF.z];
export const AXIS_B = Math.atan2(CF_B[0] - HP_B[0], CF_B[1] - HP_B[1]);   // HP → CF yaw
export const BACK_B = AXIS_B - Math.PI;                                    // behind home
export const SCOREBOARD_B = { x: STADIUM_W.scoreboard.x, z: STADIUM_W.scoreboard.z + BOWL_OFF.z, topY: STADIUM_W.scoreboard.topY };

const wrap = a => ((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

// ---------------- polyRadius: HP → footprint boundary -----------------
function polyRadius(theta) {
  const sx = Math.sin(theta), sz = Math.cos(theta);
  let best = 1e9;
  for (let i = 0; i < POLY_B.length; i++) {
    const [ax, az] = POLY_B[i], [bx, bz] = POLY_B[(i + 1) % POLY_B.length];
    const ex = bx - ax, ez = bz - az;
    const den = sx * ez - sz * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((ax - HP_B[0]) * ez - (az - HP_B[1]) * ex) / den;   // along the ray
    const u = ((ax - HP_B[0]) * sz - (az - HP_B[1]) * sx) / den;   // along the edge
    if (t > 0 && u >= 0 && u <= 1 && t < best) best = t;
  }
  return best;
}

// wall-radius TARGET by |dθ| from AXIS: ivy arc 74 to the poles (|dθ|≤0.72),
// curving down the foul lines to the 14.5 backstop behind home.
const R_TGT = [[0, 74], [0.72, 74], [1.05, 44], [1.45, 24], [1.9, 16.5], [Math.PI, 14.5]];
function rTarget(ady) {
  for (let i = 1; i < R_TGT.length; i++) if (ady <= R_TGT[i][0]) {
    const [a0, r0] = R_TGT[i - 1], [a1, r1] = R_TGT[i];
    return r0 + (r1 - r0) * (ady - a0) / (a1 - a0);
  }
  return 14.5;
}
// 256-entry LUT over θ ∈ [−π,π) — pure math at import (no rng; deterministic)
const LUT_N = 256, LUT = new Float64Array(LUT_N);
for (let i = 0; i < LUT_N; i++) {
  const th = -Math.PI + (i / LUT_N) * Math.PI * 2;
  LUT[i] = Math.min(rTarget(Math.abs(wrap(th - AXIS_B))), polyRadius(th) - 2.2);
}
export function rWallB(theta) {
  const f = (wrap(theta) + Math.PI) / (Math.PI * 2) * LUT_N;
  const i = Math.floor(f) % LUT_N, j = (i + 1) % LUT_N, t = f - Math.floor(f);
  return LUT[i] + (LUT[j] - LUT[i]) * t;
}
export { polyRadius as polyRadiusB };

// ------------------------------ bands ---------------------------------
export const TRACK_W_B = 3.0;      // warning-track width (field side of the wall)
export const WALL_T_B = 0.8;       // wall band thickness (blocked)
export const CONC_W_B = 3.8;       // concourse ring width (y 0)
export const S_CONC_B = 1.55;      // concourse angular half-extent about BACK
export const ROWS_B = { n: 8, dr: 1.4, y0: 1.15, dy: 0.62 };   // seat rows
// three FIELD GATES through the low wall (open-house day): behind home +
// both dugout corners. Half-arc = 1.7/r → ~3.4 m clear openings.
export const GATES_B = [0, -1.1, 1.1];
// two CLIMBABLE seat wedges (signed s about BACK); everything else is scenery
export const WEDGES_B = [{ s0: 0.40, s1: 0.95 }, { s0: -0.95, s1: -0.40 }];
// entry vomitory: the seat rows part behind home (|s| < VOM_S) for the tunnel
export const VOM_S_B = 0.13;

const seatTop = () => ROWS_B.y0 + (ROWS_B.n - 1) * ROWS_B.dy;

// kind: 'grass' (chase trigger) | 'track' | null. main.js only acts on 'ice'.
export function kindAtB(x, z) {
  const dx = x - HP_B[0], dz = z - HP_B[1];
  const r = Math.hypot(dx, dz), rw = rWallB(Math.atan2(dx, dz));
  if (r < rw - TRACK_W_B) return 'grass';
  if (r < rw) return 'track';
  return null;
}

function inGate(theta, r) {
  for (const gs of GATES_B)
    if (Math.abs(wrap(theta - (BACK_B + gs))) < 1.7 / Math.max(8, r)) return true;
  return false;
}
function inWedge(s) {
  for (const w of WEDGES_B) if (s >= w.s0 && s <= w.s1) return true;
  return false;
}

export function walkableB(x, z) {
  const dx = x - HP_B[0], dz = z - HP_B[1];
  const r = Math.hypot(dx, dz), th = Math.atan2(dx, dz);
  const rw = rWallB(th);
  if (r < rw) return true;                                        // field (grass + track)
  if (r < rw + WALL_T_B) return inGate(th, r);                    // wall band — gates only
  const s = wrap(th - BACK_B);
  const rC = rw + WALL_T_B, rS0 = rw + WALL_T_B + CONC_W_B;
  if (Math.abs(s) <= S_CONC_B && r <= rS0) return true;           // concourse ring
  if (inWedge(s) && r <= rS0 + ROWS_B.n * ROWS_B.dr
      && r < polyRadius(th) - 1.4) return true;                   // climbable seat wedges
  return false;
}

export function surfaceYB(x, z) {
  const dx = x - HP_B[0], dz = z - HP_B[1];
  const r = Math.hypot(dx, dz), th = Math.atan2(dx, dz);
  const rw = rWallB(th);
  if (r < rw + WALL_T_B) return 0;                                // field / gates
  const s = wrap(th - BACK_B);
  const rS0 = rw + WALL_T_B + CONC_W_B;
  if (r <= rS0) return 0;                                         // concourse
  if (inWedge(s)) {
    const k = Math.min(ROWS_B.n - 1, Math.max(0, Math.floor((r - rS0) / ROWS_B.dr)));
    return ROWS_B.y0 + k * ROWS_B.dy;
  }
  return 0;
}

// --------------------------- cell plumbing -----------------------------
export const CLAMP_B = { xMin: -293, xMax: -200, zMin: -970, zMax: -832 };
// arrive ON the warning track just inside the home-plate gate, the bowl
// opening up ahead (spawn faces AXIS_B — ivy, scoreboard, the quiet cathedral)
export const SPAWN_B = {
  x: HP_B[0] + Math.sin(BACK_B) * 12.4,
  z: HP_B[1] + Math.cos(BACK_B) * 12.4, y: 0,
};
export const MAP_B = { x0: -305, z0: -984, w: 118, h: 164, cw: 304, ch: 422 };
export const SEAT_TOP_Y_B = seatTop();
