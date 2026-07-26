// tmp (122): pure-data dry run of the props.js conservatory grows — how many of
// the capped tufts / parterre flowers / Grandmother's clump flowers actually
// place under the rejection tests. Mirrors the props.js kernels exactly.
const CH = await import('../src/data/chicago.js');
const mkrng = seed => { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; };
const mpSeg2 = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz; let t = L ? ((px - ax) * dx + (pz - az) * dz) / L : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; const cx = ax + t * dx, cz = az + t * dz; return (px - cx) ** 2 + (pz - cz) ** 2; };
const mpPoly2 = (px, pz, pts) => { let m = Infinity; for (let i = 0; i < pts.length - 1; i++) { const d = mpSeg2(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); if (d < m) m = d; } return m; };

const LPC = CH.LP_CONSERVATORY, FG = LPC.formalGarden, FLO = LPC.flora;
const gr = mkrng(FLO.tuftSeed);
const gWalks = [CH.LP_GARDEN_LOOP, CH.LP_BATES_RING, CH.LP_GARDEN_AXIS_N, CH.LP_GARDEN_AXIS_S];
const inBed = (x, z) => { for (const b of LPC.beds) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) return true; return false; };
let tp = 0;
for (let i = 0; i < FLO.tufts; i++) for (let t = 0; t < 30; t++) {
  const x = FG.x0 + gr() * (FG.x1 - FG.x0), z = FG.z0 + gr() * (FG.z1 - FG.z0);
  if (CH.conservatoryBlockedHit(x, z) || inBed(x, z)) continue;
  let bad = false; for (const w of gWalks) if (mpPoly2(x, z, w) < 1.96) { bad = true; break; }
  if (bad) continue;
  tp++; break;
}
console.log('tufts placed', tp, '/', FLO.tufts);

const GM = LPC.grandmothers, gfr = mkrng(FLO.gmSeed);
let gp = 0; const per = [];
GM.clumps.forEach(c => {
  let cnt = 0;
  for (let k = 0; k < FLO.gmPer; k++) for (let tries = 0; tries < 30; tries++) {
    const a = gfr() * Math.PI * 2, rr = Math.sqrt(gfr()) * c[2], x = c[0] + Math.cos(a) * rr, z = c[1] + Math.sin(a) * rr;
    if (!CH.lpLandHit(x, z) || CH.lpBlockedHit(x, z)) continue;
    if ((x - GM.bench.x) ** 2 + (z - GM.bench.z) ** 2 < 1.44) continue;
    if (mpPoly2(x, z, CH.LP_STOCKTON_CROSSING) < 1.69) continue;
    cnt++; gp++; break;
  }
  per.push(cnt);
});
console.log('gm placed', gp, '/', GM.clumps.length * FLO.gmPer, per);
console.log('bed flowers (no rejection)', LPC.beds.length * FLO.bedPer);
console.log('caps: tuft +' + FLO.tufts + '  stems/heads +' + (LPC.beds.length * FLO.bedPer + GM.clumps.length * FLO.gmPer));
